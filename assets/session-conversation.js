/* Participant-private attachments and live viewport. No billing, RTC, text outbox or AI calls. */
(function (root) {
  'use strict';
  if (root.OBSessionConversation) return;
  var doc = root.document;
  var stores = new Map(), views = [], sockets = new WeakSet(), downloads = new Map();
  var currentKey = '', settingsOwner = null, settings = null, settingsBusy = false;
  var savedPageY = null, frame = 0, fetchTick = 0, observer, historyView = null, historyReturnFocus = null;
  var SUPPORTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  var ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf';
  function text(value) { return value == null ? '' : String(value); }
  function node(id) { return doc.getElementById(id); }
  function make(tag, name, value) { var el = doc.createElement(tag); if (name) el.className = name; if (value != null) el.textContent = text(value); return el; }
  function setClass(el, name, yes) { if (el.classList.contains(name) !== !!yes) el.classList.toggle(name, !!yes); }
  function button(label, action, name) { var el = make('button', name, label); el.type = 'button'; el.addEventListener('click', action); return el; }
  function visible(el) { return !!(el && !el.hidden && root.getComputedStyle(el).display !== 'none' && el.getClientRects().length); }
  function owner() {
    try {
      if (root.obIsMiniSuiteRoute && root.obIsMiniSuiteRoute()) { var mini = root.OB_MINI_SESSION_FILES, snapshot = mini && mini.capture(); return snapshot && mini.isCurrent(snapshot) ? {role:'mini',principal:snapshot.principalKey,identityGeneration:snapshot.generation,credentialGeneration:snapshot.generation,token:snapshot.token,mini:snapshot} : null; }
      var api = root.OB_CLIENT_CONTEXT, context = api && api.capture('session-attachments');
      return context && context.token && context.principal && /^(client|expert)$/.test(context.role) && api.isCurrent(context, {exactCredential: true}) ? context : null;
    } catch (_) { return null; }
  }
  function ownerCurrent(context) { try { if (context && context.mini) return !!(root.OB_MINI_SESSION_FILES && root.OB_MINI_SESSION_FILES.isCurrent(context.mini)); return !!(context && root.OB_CLIENT_CONTEXT && root.OB_CLIENT_CONTEXT.isCurrent(context, {exactCredential: true})); } catch (_) { return false; } }
  function ownerKey(context) { return context ? [context.principal, context.identityGeneration, context.credentialGeneration].join('|') : ''; }
  function ownId(context) { try { if (context.mini) return text(root.OB_MINI_SESSION_FILES.senderId()); var part = context.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return text(JSON.parse(root.atob(part)).id); } catch (_) { return ''; } }
  function active(context) {
    if (!context) return null;
    if (context.role === 'mini') { var miniSession = root.OB_MINI_SESSION_FILES && root.OB_MINI_SESSION_FILES.session(); return miniSession && miniSession.id ? {sid:text(miniSession.id),session:miniSession} : null; }
    if (context.role === 'expert') {
      var runtime = root._obExpertRealtime;
      var sid = text(runtime && runtime.focusedRoomId), room = runtime && runtime.roomsById && runtime.roomsById[sid];
      return sid && room && room.session ? {sid: sid, session: room.session} : null;
    }
    var session = root._obClientSessionSnapshot || {}, id = text(session.id || session.session_id);
    var liveId = text(root._obActiveSessId || root._sessId);
    return id && id === liveId ? {sid: id, session: session} : null;
  }
  function base() {
    var url = text(root.OWNLYBIZ_API_URL || root._OB_BACKEND).replace(/\/+$/, '');
    if (!/^https?:\/\//.test(url)) throw new Error('Session service is unavailable. Refresh to try again.');
    return url;
  }
  function getStore(context, sid) {
    var key = ownerKey(context) + '|' + sid;
    if (!stores.has(key)) stores.set(key, {key: key, owner: context, sid: sid, loaded: false, enabled: false, can_upload: false, attachments: [], loading: false, sequence: 0, lastLoaded: 0, draft: null, error: '', usage: {}, limits: {photo_bytes: 10485760, file_bytes: 20971520, max_files: 20, max_session_bytes: 104857600}});
    return stores.get(key);
  }
  function current(store) { return !!(store && stores.get(store.key) === store && ownerCurrent(store.owner)); }
  function projected(view, store) { return current(store) && view.store === store && view.key === store.key; }
  async function request(path, context, options) {
    options = options || {};
    if (!ownerCurrent(context)) throw new Error('Sign in again to view session files.');
    var controller = new AbortController(), abort = function () { controller.abort(); };
    var timer = setTimeout(abort, 15000);
    if (context.signal) context.signal.addEventListener('abort', abort, {once: true});
    try {
      var response = await root.fetch(base() + path, {method: options.method || 'GET', signal: controller.signal, cache: 'no-store', headers: {'Authorization': 'Bearer ' + context.token, 'Content-Type': 'application/json'}, body: options.body ? JSON.stringify(options.body) : undefined});
      var data = await response.json();
      if (!ownerCurrent(context)) throw new Error('Your account changed.');
      if (!response.ok) { var error = new Error(data.error || 'Could not load session files. Try again.'); error.status = response.status; throw error; }
      return data;
    } finally { clearTimeout(timer); if (context.signal) context.signal.removeEventListener('abort', abort); }
  }
  function endpoint(store) { return '/api/sessions/' + encodeURIComponent(store.sid) + '/attachments'; }
  function bytes(value) { return value >= 1048576 ? (value / 1048576).toFixed(value % 1048576 ? 1 : 0) + ' MB' : Math.max(1, Math.ceil(value / 1024)) + ' KB'; }
  function time(value) { var n = Number(value); return Number.isFinite(n) ? n * (n < 100000000000 ? 1000 : 1) : Date.parse(value) || 0; }
  function date(value) { var ms = time(value); return ms ? new Date(ms).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''; }
  function expire(file) { return file.expired === true || (time(file.expires_at) > 0 && time(file.expires_at) <= Date.now()); }
  function fileType(file) { var supplied=text(file&&file.type).toLowerCase(); if(supplied)return supplied; var extension=text(file&&file.name).toLowerCase().split('.').pop();return {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',pdf:'application/pdf'}[extension]||''; }
  function validate(file, store) {
    if (!file || !file.size) return 'Choose a non-empty photo or PDF.';
    var mime=fileType(file);
    if (SUPPORTED.indexOf(mime) < 0) return /heic|heif/i.test(file.type + ' ' + file.name) ? 'This photo is HEIC. Choose or export a JPEG, PNG or WebP photo, then try again.' : 'Choose a JPEG, PNG or WebP photo, or a PDF document.';
    var limit = mime === 'application/pdf' ? store.limits.file_bytes : store.limits.photo_bytes;
    if (file.size > limit) return (mime === 'application/pdf' ? 'PDFs must be 20 MB or smaller.' : 'Photos must be 10 MB or smaller.');
    if (Number(store.usage.files || 0) >= Number(store.limits.max_files || 20)) return 'This session has reached its 20-file limit.';
    if (Number(store.usage.bytes || 0) + file.size > Number(store.limits.max_session_bytes || 104857600)) return 'This session has reached its 100 MB file allowance.';
    return '';
  }
  function beforeAppend(box) { return box ? {top: box.scrollTop, follow: box.scrollHeight - box.clientHeight - box.scrollTop < 72} : null; }
  function afterAppend(box, state, mine) {
    if (!box) return;
    if (!state || state.follow || mine) { box.scrollTop = box.scrollHeight; if (box._obNewButton) box._obNewButton.hidden = true; }
    else { box.scrollTop = state.top; if (box._obNewButton) box._obNewButton.hidden = false; }
  }
  function manageLog(box) {
    if (!box || box._obScrollManaged) return;
    box._obScrollManaged = true; box.classList.add('ob-conversation-log');
    var jump = button('New messages ↓', function () { box.scrollTop = box.scrollHeight; jump.hidden = true; }, 'ob-new-messages'); jump.hidden = true; box.parentNode.appendChild(jump); box._obNewButton = jump;
    ['wheel','touchmove','pointerdown'].forEach(function(type){box.addEventListener(type,function(){box._obUserScrollRevision=Number(box._obUserScrollRevision||0)+1;},{passive:true});});
    box.addEventListener('scroll', function () { if (box.scrollHeight - box.clientHeight - box.scrollTop < 72) jump.hidden = true; }, {passive: true});
  }
  function autoSize(input) {
    if (!input || input.tagName !== 'TEXTAREA') return;
    var box = input.closest('#a4-chat-ui,#a3-chat-ui,#expert-chat-area'), log = box && box.querySelector('.ob-conversation-log'), state = beforeAppend(log);
    input.style.height = '44px'; input.style.height = Math.min(124, Math.max(44, input.scrollHeight)) + 'px';
    if (state && state.follow) log.scrollTop = log.scrollHeight;
  }
  function bindComposer(input) {
    if (!input || input._obConversationBound) return;
    input._obConversationBound = true; var bar = input.parentNode; bar.classList.add('ob-conversation-composer');
    input.addEventListener('input', function () { autoSize(input); });
    input.addEventListener('focus', scheduleViewport);
    input.addEventListener('blur', scheduleViewport);
    // Existing text handlers remain authoritative. Stop IME/Shift+Enter before their legacy document listeners.
    input.addEventListener('keydown', function (event) { if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229 || event.shiftKey)) event.stopImmediatePropagation(); }, true);
    var send = bar.querySelector('.chat-send,#expert-chat-send');
    if (send) {
      send.addEventListener('pointerdown', function (event) { if (doc.activeElement === input && event.button === 0) event.preventDefault(); });
      send.addEventListener('click', function () { root.requestAnimationFrame(function () { autoSize(input); }); });
    }
    autoSize(input);
  }
  function captureFile(view, file) {
    var store = view.store;
    if (!projected(view, store) || !store.can_upload) return;
    var problem = validate(file, store);
    if (problem) { store.selectionError = problem; renderStore(store); return; }
    store.selectionError = '';
    discard(store);
    store.draft = {file: file, uploadId: root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : 'upload-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2), preview: fileType(file).indexOf('image/') === 0 ? root.URL.createObjectURL(file) : '', state: 'ready', progress: 0, error: '', xhr: null};
    renderStore(store);
  }
  function discard(store) {
    if (!store || !store.draft) return;
    var draft = store.draft; store.draft = null;
    if (draft.xhr) draft.xhr.abort();
    if (draft.preview) root.URL.revokeObjectURL(draft.preview);
    store.draft = null;
  }
  function reset() {
    closeHistory(false);
    stores.forEach(function (store) { discard(store); store.sequence++; }); stores.clear();
    downloads.forEach(function (entry) { if (entry.url) root.URL.revokeObjectURL(entry.url); if (entry.controller) entry.controller.abort(); }); downloads.clear();
    views.forEach(function (view) { view.key = ''; view.store = null; view.pick.hidden = true; view.draft.hidden = true; view.tiles.forEach(function (tile) { tile.remove(); }); view.tiles.clear(); if (view.drawer) view.drawer.hidden = true; });
    currentKey = ''; settingsOwner = null; settings = null; settingsBusy = false;
    if (node('ob-session-files-enabled')) { node('ob-session-files-enabled').checked = false; node('ob-session-files-enabled').disabled = true; }
  }
  async function load(store, force) {
    if (!current(store) || store.loading || (!force && Date.now() - store.lastLoaded < 5000)) return;
    store.loading = true; var sequence = ++store.sequence;
    try {
      var data = await request(endpoint(store), store.owner);
      if (!current(store) || sequence !== store.sequence) return;
      store.loaded = true; store.enabled = data.enabled === true; store.can_upload = data.can_upload === true; store.ai_interpretation = data.ai_interpretation === true; store.automated_replies = data.automated_replies === true;
      store.attachments = Array.isArray(data.attachments) ? data.attachments : []; store.usage = data.usage || {}; store.limits = Object.assign({}, store.limits, data.limits || {}); store.error = '';
      var draft = store.draft, found = draft && store.attachments.some(function (file) { return file.client_upload_id === draft.uploadId; });
      if (found) discard(store);
      else if (draft && draft.state === 'checking') { draft.state = 'error'; draft.error = 'Upload was not confirmed. Retry safely, or remove this file.'; }
    } catch (error) { if (current(store)) store.error = error.message || 'Could not load files. Try again.'; }
    finally { if (current(store) && sequence === store.sequence) { store.loading = false; store.lastLoaded = Date.now(); renderStore(store); } }
  }
  function upload(view) {
    var store = view.store, draft = store && store.draft;
    if (!projected(view, store) || !draft || !store.can_upload || draft.state === 'uploading' || draft.state === 'checking') return;
    var problem = validate(draft.file, store);
    if (problem) { draft.state = 'error'; draft.error = problem; renderStore(store); return; }
    draft.state = 'uploading'; draft.error = ''; draft.progress = 0;
    var xhr = new XMLHttpRequest(); draft.xhr = xhr; xhr.open('POST', base() + endpoint(store)); xhr.setRequestHeader('Authorization', 'Bearer ' + store.owner.token); xhr.timeout = 120000;
    var abortedByIdentity = function () { xhr.abort(); };
    if (store.owner.signal) store.owner.signal.addEventListener('abort', abortedByIdentity, {once: true});
    xhr.upload.onprogress = function (event) { if (current(store) && store.draft === draft && event.lengthComputable) { draft.progress = Math.min(99, Math.round(event.loaded / event.total * 100)); renderStore(store); } };
    xhr.onload = function () {
      if (!current(store) || store.draft !== draft) return;
      var data = {}; try { data = JSON.parse(xhr.responseText); } catch (_) {}
      if (xhr.status >= 200 && xhr.status < 300 && data.attachment) { store.attachments = store.attachments.filter(function (file) { return file.id !== data.attachment.id; }).concat([data.attachment]); draft.xhr = null; discard(store); renderStore(store, true); load(store, true); }
      else { draft.xhr = null; draft.state = 'error'; draft.error = data.error || 'File was not sent. Try again.'; if (xhr.status === 403 || xhr.status === 409) load(store, true); renderStore(store); }
    };
    function uncertain() { if (!current(store) || store.draft !== draft) return; draft.xhr = null; draft.state = 'checking'; draft.error = 'Checking whether the file arrived…'; renderStore(store); load(store, true); }
    xhr.onerror = uncertain; xhr.ontimeout = uncertain; xhr.onabort = uncertain;
    xhr.onloadend = function () { if (store.owner.signal) store.owner.signal.removeEventListener('abort', abortedByIdentity); };
    var form = new FormData(); form.append('file', draft.file, draft.file.name); form.append('client_upload_id', draft.uploadId); xhr.send(form); renderStore(store);
  }
  function cancel(view) {
    var store = view.store, draft = store && store.draft;
    if (!projected(view, store) || !draft) return;
    if (draft.state === 'uploading' && draft.xhr) { draft.xhr.abort(); return; }
    discard(store); renderStore(store);
  }
  async function download(store, file, imageNode, status) {
    if (!current(store) || expire(file)) return;
    var expected = endpoint(store) + '/' + encodeURIComponent(text(file.id)) + '/content';
    if (text(file.content_path) !== expected) { if (status) status.textContent = 'This file link is unavailable.'; return; }
    var key = store.key + '|' + file.id, cached = downloads.get(key);
    if (cached && cached.url) { if (imageNode) imageNode.src = cached.url; else saveBlob(cached.url, file.name); return; }
    if (cached && cached.promise) { await cached.promise; if (current(store) && cached.url) { if (imageNode) imageNode.src = cached.url; else saveBlob(cached.url, file.name); } return; }
    var controller = new AbortController(), entry = {controller: controller}; downloads.set(key, entry);
    var abort = function () { controller.abort(); }; if (store.owner.signal) store.owner.signal.addEventListener('abort', abort, {once: true});
    var timer = setTimeout(abort, 30000);
    entry.promise = (async function () {
      try {
        var response = await root.fetch(base() + expected, {headers: {'Authorization': 'Bearer ' + store.owner.token}, signal: controller.signal, cache: 'no-store'});
        if (!response.ok) throw new Error(response.status === 410 ? 'This file has expired.' : 'Could not download. Try again.');
        var blob = await response.blob(); if (!current(store)) return;
        if (expire(file)) throw new Error('This file has expired.');
        if (blob.size > 20971520 || blob.size === 0) throw new Error('This file is unavailable.');
        entry.url = root.URL.createObjectURL(blob);
        if (imageNode && imageNode.isConnected) imageNode.src = entry.url; else if (!imageNode) saveBlob(entry.url, file.name);
        if (status) status.textContent = '';
      } catch (error) { downloads.delete(key); if (current(store) && status) status.textContent = error.message || 'Could not download. Try again.'; }
      finally { clearTimeout(timer); if (store.owner.signal) store.owner.signal.removeEventListener('abort', abort); entry.promise = null; }
    })();
    await entry.promise;
  }
  function saveBlob(url, name) { var link = make('a'); link.href = url; link.download = text(name || 'session-file'); link.rel = 'noopener'; doc.body.appendChild(link); link.click(); link.remove(); }
  function tile(view, store, file) {
    var row = make('div', 'ob-file-tile ob-msg-row'); row._obFileExpired = expire(file); row.dataset.obAttachmentId = text(file.id); row.dataset.obSentAt = text(time(file.created_at)); row.dataset.mine = String(text(file.sender_id) === ownId(store.owner));
    row.classList.add(row.dataset.mine === 'true' ? 'ob-msg-mine' : 'ob-msg-theirs');
    var bubble = make('div', 'ob-msg-bubble'), control = button('', function () { download(store, file, null, status); });
    control.setAttribute('aria-label', 'Download ' + text(file.name)); control.disabled = expire(file);
    var image;
    if (text(file.mime).indexOf('image/') === 0 && !expire(file)) { image = make('img', 'ob-file-image'); image.alt = text(file.name); image.loading = 'lazy'; control.appendChild(image); }
    else control.appendChild(make('span', 'ob-file-icon', text(file.mime) === 'application/pdf' ? 'PDF' : 'PHOTO'));
    control.appendChild(make('div', 'ob-file-name', file.name)); control.appendChild(make('div', 'ob-file-meta', bytes(Number(file.size) || 0) + ' · ' + date(file.created_at)));
    bubble.appendChild(control); bubble.appendChild(make('div', 'ob-file-expiry', expire(file) ? 'File expired' : 'Available until ' + date(file.expires_at)));
    var status = make('div', 'ob-file-download-status'); status.setAttribute('role', 'status'); bubble.appendChild(status); row.appendChild(bubble);
    if (image) {
      var scrollRevision=Number(view.log._obUserScrollRevision||0);
      // Load previews only when near the visible transcript; private downloads never become public URLs.
      if (root.IntersectionObserver) { var io = new IntersectionObserver(function (entries) { if (entries.some(function (item) { return item.isIntersecting; })) { io.disconnect(); if (projected(view, store)) download(store, file, image, status); } }, {root: view.log, rootMargin: '200px'}); io.observe(row); row._obFileObserver = io; }
      else download(store, file, image, status);
      image.addEventListener('load', function () { if (Number(view.log._obUserScrollRevision||0)===scrollRevision && view.followImages && view.log.scrollHeight - view.log.clientHeight - view.log.scrollTop < 340) view.log.scrollTop = view.log.scrollHeight; });
    }
    return row;
  }
  function paintFiles(view, store, mine) {
    if (!projected(view, store)) return;
    var scroll = beforeAppend(view.log); view.followImages = !!(scroll && scroll.follow);
    var ids = new Set(store.attachments.map(function (file) { return text(file.id); }));
    view.tiles.forEach(function (el, id) { if (!ids.has(id)) { if (el._obFileObserver) el._obFileObserver.disconnect(); el.remove(); view.tiles.delete(id); } });
    var added = false;
    store.attachments.slice().sort(function (a, b) { return time(a.created_at) - time(b.created_at); }).forEach(function (file) {
      var id = text(file.id), row = view.tiles.get(id);
      if (row && row._obFileExpired !== expire(file)) { if (row._obFileObserver) row._obFileObserver.disconnect(); row.remove(); view.tiles.delete(id); row = null; var cacheKey = store.key + '|' + id, cached = downloads.get(cacheKey); if (cached) { if (cached.controller) cached.controller.abort(); if (cached.url) root.URL.revokeObjectURL(cached.url); downloads.delete(cacheKey); } }
      if (!row || !row.isConnected) { if(row&&row._obFileObserver)row._obFileObserver.disconnect(); row = tile(view, store, file); view.tiles.set(id, row); added = true; }
      if (row.parentNode !== view.log) {
        var later = Array.prototype.find.call(view.log.children, function (item) { return Number(item.dataset && item.dataset.obSentAt || 0) > time(file.created_at); });
        view.log.insertBefore(row, later || null);
      }
    });
    if (view.empty) { view.empty.hidden = store.attachments.length > 0; view.empty.textContent = store.error || (store.loaded ? 'Photos and files shared in this session appear here.' : 'Loading files…'); }
    if (added) afterAppend(view.log, scroll, mine);
  }
  function renderDraft(view, store) {
    var draft = store.draft;
    view.draft.hidden = !draft && !store.selectionError;
    view.previewRow.hidden = !draft; view.actions.hidden = !draft; view.note.hidden = !draft;
    if (!draft) { view.fileName.textContent = ''; view.preview.hidden = true; view.preview.removeAttribute('src'); view.progress.hidden = true; view.status.textContent = store.selectionError || ''; view.status.dataset.error = String(!!store.selectionError); return; }
    view.fileName.textContent = draft.file.name; view.fileMeta.textContent = bytes(draft.file.size);
    view.preview.hidden = !draft.preview; if (draft.preview && view.preview.src !== draft.preview) view.preview.src = draft.preview;
    view.progress.hidden = draft.state !== 'uploading'; view.progress.value = draft.progress;
    view.send.textContent = draft.state === 'error' ? 'Retry upload' : 'Send file'; view.send.disabled = !store.can_upload || draft.state === 'uploading' || draft.state === 'checking';
    view.remove.textContent = draft.state === 'uploading' ? 'Cancel upload' : 'Remove'; view.remove.disabled = draft.state === 'checking';
    view.status.dataset.error = String(draft.state === 'error');
    view.status.textContent = draft.state === 'uploading' ? 'Uploading ' + draft.progress + '%…' : draft.error || (!store.can_upload ? 'New uploads are unavailable for this session.' : 'Ready to send.');
  }
  function renderStore(store, mine) {
    views.forEach(function (view) {
      if (!projected(view, store)) return;
      view.pick.hidden = !!view.readonly || !store.loaded || !store.enabled; view.pick.disabled = !store.can_upload || !!(store.draft && /^(uploading|checking)$/.test(store.draft.state));
      view.pick.title = store.can_upload ? 'Add a photo or PDF' : 'New uploads are unavailable for this session';
      if (view.launch) { view.launch.hidden = !store.loaded || (!store.enabled && !store.attachments.length); view.launchButton.textContent = 'Photos & files' + (store.attachments.length ? ' (' + store.attachments.length + ')' : ''); }
      if (view.note) view.note.textContent = 'Private to this session. Files expire after 30 days. Photos: 10 MB; PDFs: 20 MB.' + (store.automated_replies ? ' Files are shared for expert viewing and are not read by automated replies. Describe relevant details in your message.' : '');
      paintFiles(view, store, mine); renderDraft(view, store); if (view.log._obNewButton) view.log._obNewButton.style.bottom = (view.composer.offsetHeight + (view.draft.hidden ? 0 : view.draft.offsetHeight) + 10) + 'px';
    });
  }
  function createView(log, composer, host, media) {
    if (!log || !composer || log._obFilesView) return log && log._obFilesView;
    manageLog(log);
    var view = {log: log, composer: composer, host: host, store: null, key: '', tiles: new Map(), media: !!media};
    var picker = make('input'); picker.type = 'file'; picker.accept = ACCEPT; picker.hidden = true; picker.tabIndex = -1;
    view.pick = button('+', function () { if (view.store && view.store.can_upload) picker.click(); }, 'ob-file-pick'); view.pick.setAttribute('aria-label', 'Add photo or PDF'); view.pick.hidden = true;
    composer.insertBefore(view.pick, composer.firstChild); composer.appendChild(picker);
    picker.addEventListener('change', function () { var file = picker.files && picker.files[0]; if (file) captureFile(view, file); picker.value = ''; });
    var draft = make('div', 'ob-file-draft ob-files-ui'); draft.hidden = true; view.draft = draft;
    var previewRow = make('div', 'ob-file-preview'); view.previewRow = previewRow; view.preview = make('img'); view.preview.alt = 'Selected photo preview'; previewRow.appendChild(view.preview);
    var copy = make('div', 'ob-file-copy'); view.fileName = make('div', 'ob-file-name'); view.fileMeta = make('div', 'ob-file-meta'); copy.appendChild(view.fileName); copy.appendChild(view.fileMeta); previewRow.appendChild(copy); draft.appendChild(previewRow);
    view.progress = make('progress', 'ob-file-progress'); view.progress.max = 100; view.progress.setAttribute('aria-label', 'File upload'); draft.appendChild(view.progress);
    var actions = make('div', 'ob-files-actions'); view.actions = actions; view.send = button('Send file', function () { upload(view); }, 'ob-file-primary'); view.remove = button('Remove', function () { cancel(view); }); actions.appendChild(view.send); actions.appendChild(view.remove); draft.appendChild(actions);
    view.status = make('div', 'ob-file-status'); view.status.setAttribute('role', 'status'); draft.appendChild(view.status);
    view.note = make('p', 'ob-file-note'); draft.appendChild(view.note); composer.parentNode.insertBefore(draft, composer);
    log._obFilesView = view; views.push(view); return view;
  }
  function mediaView(screen, expert) {
    if (!screen || screen._obMediaFilesView) return;
    var launch = make('div', 'ob-files-media-launch ob-files-ui'), drawer = make('section', 'ob-files-drawer ob-files-ui'); drawer.hidden = true; drawer.setAttribute('aria-label', 'Session photos and files');
    var launchButton = button('Photos & files', function () { drawer.hidden = !drawer.hidden; launchButton.setAttribute('aria-expanded', String(!drawer.hidden)); if (!drawer.hidden && view.store) load(view.store, true); }); launchButton.setAttribute('aria-expanded', 'false'); launch.appendChild(launchButton); launch.hidden = true;
    var header = make('div', 'ob-files-drawer-head'); header.appendChild(make('h3', '', 'Photos & files')); header.appendChild(button('Close', function () { drawer.hidden = true; launchButton.setAttribute('aria-expanded', 'false'); launchButton.focus({preventScroll: true}); })); drawer.appendChild(header);
    var log = make('div', 'ob-files-drawer-log'); log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); drawer.appendChild(log);
    var footer = make('div', 'ob-files-drawer-footer ob-files-actions'); footer.appendChild(make('span', '', 'Share a photo or PDF')); drawer.appendChild(footer);
    var target = expert ? make('div', 'ob-files-expert-media') : screen; if (expert) screen.appendChild(target); target.appendChild(launch); target.appendChild(drawer);
    var view = createView(log, footer, screen, true); view.launch = launch; view.launchButton = launchButton; view.drawer = drawer; view.expert = !!expert; view.empty = make('p', 'ob-files-empty', 'Loading files…'); log.appendChild(view.empty); screen._obMediaFilesView = view;
  }
  function project(view, store) {
    if (view.key !== (store && store.key || '')) {
      if (view.store && view.store.draft) discard(view.store);
      if (view.store) view.store.selectionError = '';
      view.tiles.forEach(function (el) { if (el._obFileObserver) el._obFileObserver.disconnect(); el.remove(); }); view.tiles.clear(); view.draft.hidden = true; view.pick.hidden = true;
      if (view.drawer) view.drawer.hidden = true; view.store = store; view.key = store && store.key || '';
    }
    if (store) renderStore(store);
  }
  function settingsCard() {
    var panel = node('db-panel-live-session'), host = panel && panel.querySelector('.db-content');
    if (!host || node('ob-session-files-settings')) return;
    var card = make('section', 'ob-files-settings'); card.id = 'ob-session-files-settings'; card.hidden = true;
    var label = make('label'), input = make('input'); input.type = 'checkbox'; input.id = 'ob-session-files-enabled'; input.disabled = true; label.appendChild(input);
    var copy = make('span'); copy.appendChild(make('strong', '', 'Photos and files in live sessions')); copy.appendChild(make('p', '', 'Let you and your clients share photos and PDFs in chat, voice and video sessions. Off by default. Turning this off stops new uploads; existing files remain available until they expire.')); label.appendChild(copy); card.appendChild(label);
    card.appendChild(make('p', '', 'Photos up to 10 MB · PDFs up to 20 MB · 20 files / 100 MB per session · Private access for 30 days.'));
    var status = make('div', 'ob-files-settings-status'); status.id = 'ob-session-files-settings-status'; status.setAttribute('role', 'status'); card.appendChild(status);
    input.addEventListener('change', function () { saveSettings(input.checked); }); host.insertBefore(card, node('ob-expert-live-session-switcher') || host.firstChild);
  }
  async function loadSettings(context) {
    if (!ownerCurrent(context) || context.role !== 'expert' || settingsBusy) return;
    settingsBusy = true; settingsOwner = context;
    try { var data = await request('/api/experts/me/session-attachments/settings', context); if (ownerCurrent(context) && settingsOwner === context) { settings = data; node('ob-session-files-enabled').checked = data.enabled === true; node('ob-session-files-settings-status').textContent = ''; } }
    catch (error) { if (ownerCurrent(context)) node('ob-session-files-settings-status').textContent = error.message; }
    finally { if (settingsOwner === context) { settingsBusy = false; node('ob-session-files-enabled').disabled = !settings; } }
  }
  async function saveSettings(enabled) {
    var context = owner(), input = node('ob-session-files-enabled'), status = node('ob-session-files-settings-status');
    if (!context || context.role !== 'expert' || !settings || settingsBusy) return;
    settingsBusy = true; settingsOwner = context; input.disabled = true; status.textContent = 'Saving…'; status.dataset.error = 'false';
    try { var data = await request('/api/experts/me/session-attachments/settings', context, {method: 'PUT', body: {enabled: enabled, expected_revision: settings.revision}}); if (ownerCurrent(context) && settingsOwner === context) { settings = data; input.checked = data.enabled === true; status.textContent = data.enabled ? 'Enabled. Photos and files can now be shared in active sessions.' : 'Disabled. Existing shared files remain available until expiry.'; stores.forEach(function (store) { if (current(store)) load(store, true); }); } }
    catch (error) { if (ownerCurrent(context) && settingsOwner === context) { input.checked = settings.enabled === true; status.textContent = error.status === 409 ? 'This setting changed elsewhere. Refresh and try again.' : error.message; status.dataset.error = 'true'; settings = null; } }
    finally { if (ownerCurrent(context) && settingsOwner === context) { settingsBusy = false; input.disabled = !settings; if (!settings) loadSettings(context); } }
  }
  function closeHistory(restoreFocus) {
    if (!historyView) return;
    var view=historyView; historyView=null;
    view.tiles.forEach(function(tile){if(tile._obFileObserver)tile._obFileObserver.disconnect();});
    views=views.filter(function(item){return item!==view;}); view.host.remove();
    if(restoreFocus!==false&&historyReturnFocus&&historyReturnFocus.isConnected)historyReturnFocus.focus({preventScroll:true});
    historyReturnFocus=null;
  }
  function openHistory(sid) {
    var context=owner();sid=text(sid);if(!context||!sid||sid.length>128)return;
    closeHistory(false);historyReturnFocus=doc.activeElement;
    var overlay=make('div','ob-files-history-modal ob-files-ui'),dialog=make('section','ob-files-history-dialog');
    dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','ob-files-history-title');
    var header=make('div','ob-files-drawer-head'),title=make('h3','','Session photos and files');title.id='ob-files-history-title';header.appendChild(title);
    var close=button('Close',function(){closeHistory(true);});header.appendChild(close);dialog.appendChild(header);
    var log=make('div','ob-files-drawer-log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');dialog.appendChild(log);
    var footer=make('div','ob-files-drawer-footer');footer.appendChild(make('p','ob-file-note','Files are available privately to session participants for 30 days.'));dialog.appendChild(footer);overlay.appendChild(dialog);doc.body.appendChild(overlay);
    var view=createView(log,footer,overlay,true);view.readonly=true;view.empty=make('p','ob-files-empty','Loading files…');log.appendChild(view.empty);historyView=view;project(view,getStore(context,sid));load(view.store,true);
    overlay.addEventListener('click',function(e){if(e.target===overlay)closeHistory(true);});
    overlay.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();closeHistory(true);}if(e.key==='Tab'){var controls=Array.from(dialog.querySelectorAll('button')).filter(function(b){return !b.disabled&&!b.hidden&&visible(b);});if(!controls.length)return;var index=controls.indexOf(doc.activeElement);if(e.shiftKey&&index<=0){e.preventDefault();controls[controls.length-1].focus();}else if(!e.shiftKey&&(index<0||index===controls.length-1)){e.preventDefault();controls[0].focus();}}});
    close.focus({preventScroll:true});
  }
  function event(data) {
    if (!data || !/^(session_attachment|session_attachment_settings)$/.test(text(data.type))) return;
    var sid = text(data.session_id || data.sessionId);
    stores.forEach(function (store) { if (store.sid === sid && current(store)) load(store, true); });
  }
  function watchSockets() {
    [root._obClientWs, root._obWs, root._expertWs].forEach(function (socket) {
      if (!socket || !socket.addEventListener || sockets.has(socket)) return;
      sockets.add(socket); socket.addEventListener('message', function (message) { try { event(JSON.parse(message.data)); } catch (_) {} });
    });
  }
  function viewForRole(view,context) {
    if(!context)return false;
    if(context.role==='mini')return !!(view.mini||(view.expert&&view.media&&view.host&&view.host.closest('#ob-mini-expert-rtc-mount')));
    if(context.role==='expert')return !!(view.expert||view.log.id==='expert-chat-messages');
    return context.role==='client'&&!view.mini&&!view.expert&&view.log.id!=='expert-chat-messages';
  }
  function sync() {
    views = views.filter(function(view){ if (view.log.isConnected) return true; view.tiles.forEach(function(tile){if(tile._obFileObserver)tile._obFileObserver.disconnect();}); return false; });
    var context = owner(), key = ownerKey(context);
    if (currentKey && currentKey !== key) reset(); currentKey = key;
    if (context && context.role === 'mini') { var miniLog = node('ob-mini-session-messages'), miniInput = node('ob-mini-session-input'); if (miniLog && miniInput && !miniLog._obFilesView) { var miniView = createView(miniLog,miniInput.parentNode,miniLog.closest('.ob-mini-suite-card'),false); miniView.mini=true; } }
    settingsCard(); var card = node('ob-session-files-settings');
    if (card) card.hidden = !(context && context.role === 'expert');
    if (card && !card.hidden && visible(node('db-panel-live-session')) && !settings && !settingsBusy) loadSettings(context);
    var focused = active(context), selected = focused && getStore(context, focused.sid);
    views.forEach(function (view) {
      if (view.readonly) return;
      var eligible = viewForRole(view,context);
      project(view, eligible ? selected : null);
    });
    if (selected && views.some(function (view) { return view.store === selected && visible(view.host); })) load(selected, false);
    watchSockets(); scheduleViewport();
  }
  function viewport() {
    frame = 0; var context = owner(), screen = doc.querySelector('#view-5 .phone-screen.active');
    var enabled = context && context.role === 'client' && active(context) && visible(node('view-5')) && screen && /^(screen-A3|screen-A4|screen-B3|screen-VID)$/.test(screen.id);
    var mobile = root.matchMedia('(max-width:768px)').matches;
    doc.querySelectorAll('.ob-conversation-screen,.ob-session-media-screen').forEach(function (el) { if (el !== screen) { setClass(el, 'ob-conversation-screen', false); setClass(el, 'ob-session-media-screen', false); } });
    if (enabled) {
      var log = screen.querySelector('.ob-conversation-log'), logState = beforeAppend(log);
      var vv = root.visualViewport, height = vv ? vv.height : root.innerHeight, top = vv ? vv.offsetTop : 0;
      doc.documentElement.style.setProperty('--ob-visual-height', Math.round(height) + 'px'); doc.documentElement.style.setProperty('--ob-visual-top', Math.round(top) + 'px');
      if (mobile && savedPageY === null) savedPageY = root.scrollY;
      setClass(doc.documentElement, 'ob-session-viewport', true); setClass(doc.body, 'ob-session-viewport', true);
      setClass(doc.body, 'ob-session-keyboard', !!(doc.activeElement && /^(TEXTAREA|INPUT)$/.test(doc.activeElement.tagName) && root.innerHeight - height > 100));
      setClass(screen, 'ob-conversation-screen', /screen-A[34]/.test(screen.id) && text((active(context) || {}).session && active(context).session.channel || 'chat') === 'chat');
      setClass(screen, 'ob-session-media-screen', /^(screen-B3|screen-VID)$/.test(screen.id));
      if (log && logState && logState.follow) log.scrollTop = log.scrollHeight;
    } else {
      setClass(doc.documentElement, 'ob-session-viewport', false); setClass(doc.body, 'ob-session-viewport', false); setClass(doc.body, 'ob-session-keyboard', false);
      doc.querySelectorAll('.ob-conversation-screen,.ob-session-media-screen').forEach(function (el) { setClass(el, 'ob-conversation-screen', false); setClass(el, 'ob-session-media-screen', false); });
      if (savedPageY !== null) { var y = savedPageY; savedPageY = null; root.scrollTo(0, y); }
    }
  }
  function scheduleViewport() { if (!frame) frame = root.requestAnimationFrame(viewport); }
  function boot() {
    ['paid-chat-input', 'free-chat-input', 'expert-chat-input'].forEach(function (id) {
      var input = node(id); bindComposer(input);
      var log = node(id.replace('-input', '-messages'));
      if (log && input) createView(log, input.parentNode, log.closest('#screen-A4,#screen-A3,#db-panel-live-session'), false);
    });
    mediaView(node('screen-B3')); mediaView(node('screen-VID')); mediaView(node('expert-rtc-area'), true);
    if (root.OB_CLIENT_CONTEXT) root.OB_CLIENT_CONTEXT.register('session-conversation-files', {teardown: reset, credentialRotated: reset});
    root.addEventListener('resize', scheduleViewport, {passive: true}); root.addEventListener('orientationchange', scheduleViewport, {passive: true});
    if (root.visualViewport) { root.visualViewport.addEventListener('resize', scheduleViewport, {passive: true}); root.visualViewport.addEventListener('scroll', scheduleViewport, {passive: true}); }
    doc.addEventListener('click',function(e){var target=e.target&&e.target.closest&&e.target.closest('[data-ob-session-files]');if(target){e.preventDefault();e.stopPropagation();openHistory(target.getAttribute('data-ob-session-files'));}},true);
    root.addEventListener('ob:session-attachment', function (message) { event(message.detail); }); root.addEventListener('focus', sync); doc.addEventListener('visibilitychange', function () { if (!doc.hidden) sync(); });
    if (root.MutationObserver) { observer = new MutationObserver(function () { scheduleViewport(); }); ['view-5', 'db-panel-live-session'].forEach(function (id) { var target = node(id); if (target) observer.observe(target, {attributes: true, attributeFilter: ['class'], subtree: true}); }); }
    sync(); fetchTick = root.setInterval(function () { if (!doc.hidden) sync(); }, 1000);
  }
  root.OBSessionConversation = {beforeAppend: beforeAppend, afterAppend: afterAppend, handleEvent: event, refresh: sync, openHistory: openHistory};
  if (root.__OB_TEST_HOOKS__) root.__OB_TEST_HOOKS__.sessionConversation = {validate: validate, viewForRole:viewForRole, beforeAppend: beforeAppend, afterAppend: afterAppend, ownerCurrent: ownerCurrent, active: active, reset: reset, stores: stores, get views(){return views;}, sync: sync, viewport: viewport, captureFile: captureFile, upload: upload, cancel: cancel, load: load, download: download};
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot, {once: true}); else boot();
})(window);
