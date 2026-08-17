import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function scriptById(id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match, `${id} is installed`);
  return match[1];
}

function section(start, end) {
  const left = html.indexOf(start);
  assert(left >= 0, `section starts at ${start}`);
  const right = html.indexOf(end, left + start.length);
  assert(right >= 0, `section ends at ${end}`);
  return html.slice(left, right);
}

const workspaceSource = scriptById('ownlybiz-expert-live-workspace-20260817');
const workspaceMarkup = section('<section id="ob-expert-live-session-switcher"', '<!-- Main session layout: chat + client info -->');
const livePanelMarkup = section('<!-- ========== LIVE SESSION PANEL (Expert side) ========== -->', '<!-- ========== OVERVIEW PANEL ========== -->');

for(const id of ['expert-chat-input','expert-chat-messages','expert-rtc-area','expert-sess-timer','live-session-notes','ob-expert-live-session-switcher']) {
  assert.equal((html.match(new RegExp(`id=["']${id}["']`, 'g')) || []).length, 1, `${id} remains unique`);
}
assert(html.indexOf('class="ls-stats-row"') < html.indexOf('id="ob-expert-live-session-switcher"'), 'workspace follows the existing stats row');
assert(html.indexOf('id="ob-expert-live-session-switcher"') < html.indexOf('class="ls-main-grid"'), 'workspace precedes the nth-child-sensitive main grid');
assert(html.indexOf('id="ob-expert-live-pending-announcer"') < html.indexOf('id="db-panel-live-session"'), 'pending announcements live outside hidden dashboard tab panels');
assert.match(workspaceMarkup, /role="tablist"[^>]+aria-orientation="horizontal"/, 'session rail exposes horizontal tab semantics');
assert.match(livePanelMarkup, /id="expert-chat-messages"[^>]+role="log"[^>]+aria-live="polite"/, 'focused transcript is an accessible live log');
assert.match(livePanelMarkup, /id="expert-chat-send"[^>]+aria-label="Send message to the focused client"/, 'send control has a stable accessible name');
assert.match(livePanelMarkup, /id="live-session-notes"[^>]+maxlength="8000"[^>]+aria-labelledby="live-session-notes-label"/, 'private notes match the backend bound and visible label');
assert.doesNotMatch(livePanelMarkup, /attach|upload/i, 'Phase 4 remains text-only without an unsafe attachment action');
assert.match(html, /expertEndSession\(window\._obExpertRealtime&&window\._obExpertRealtime\.rtcSessionId\)/, 'media End targets the explicit RTC owner');
assert.match(html, /@media\(max-width:768px\)[\s\S]*?#expert-chat-input\{font-size:16px!important;min-height:44px;\}/, 'mobile composer avoids zoom and preserves a touch target');
assert.match(html, /#db-panel-live-session button:not\(\[hidden\]\)\{min-height:44px;\}/, 'visible mobile live controls have 44px touch height');
assert.match(html, /\.ob-expert-live-session-list\{[^}]*overflow-x:auto[^}]*padding:8px 8px 10px/, 'session rail scrolls independently without clipping its focus ring');
assert.match(html, /#expert-chat-input\{min-width:0;\}/, 'composer can shrink beside the send button at 320px');
assert.match(html, /ob-request-stable-overlay\{[\s\S]*?background:transparent!important;[\s\S]*?pointer-events:none!important;[\s\S]*?ob-expert-pending-explicit-modal/, 'unsolicited mobile requests stay nonblocking until explicit Review');
assert.match(html, /rawSnapshot!==null&&rawSnapshot!==undefined&&rawSnapshot!==''/, 'null fee snapshots are treated as missing rather than zero');
assert.match(html, /isBoundSession\?'starter':''/, 'legacy bound sessions use the backend starter fallback, not the account current plan');
assert.match(html, /pending-decline:' \+ String\(sid \|\| ''\)/, 'pending decline ownership is keyed by exact session');
assert.match(html, /if\(sid&&visibleRequestSid&&String\(visibleRequestSid\)!==String\(sid\)\)return;/, 'background pending completion cannot close a different visible request');
assert.match(html, /_obClearRealtimeResumeForSession\(String\(failedSid\),runtimeContext\.principalKey\)/, 'permission fallback clears resume state under the exact principal owner');
assert.match(html, /mediaLifecycleType&&mediaLifecycleOwned/, 'off-focus media lifecycle bypasses the generic chat DOM short circuit');
assert.match(html, /currentActivePanel=document\.querySelector\('\.db-tab-panel\.active'\)/, 'active dashboard tab takes precedence over a stale deep-link URL');

class FakeClassList {
  constructor(owner) { this.owner = owner; this.values = new Set(); }
  add(...values) { values.forEach((value) => this.values.add(String(value))); this.sync(); }
  remove(...values) { values.forEach((value) => this.values.delete(String(value))); this.sync(); }
  contains(value) { return this.values.has(String(value)); }
  toggle(value, force) {
    const next = force === undefined ? !this.contains(value) : !!force;
    if(next) this.add(value); else this.remove(value);
    return next;
  }
  set(value) { this.values = new Set(String(value || '').split(/\s+/).filter(Boolean)); this.sync(); }
  sync() { this.owner._className = [...this.values].join(' '); }
}

function styleObject() {
  return {
    setProperty(name, value) { this[name] = String(value); },
    removeProperty(name) { delete this[name]; },
  };
}

function dataKey(name) {
  return name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function simpleMatch(node, selector) {
  selector = selector.trim();
  if(!selector || !(node instanceof FakeElement)) return false;
  const attrs = [...selector.matchAll(/\[([^\]=]+)(?:=["']?([^\]"']+)["']?)?\]/g)];
  selector = selector.replace(/\[[^\]]+\]/g, '');
  const id = (selector.match(/#([\w-]+)/) || [])[1];
  if(id && node.id !== id) return false;
  const classes = [...selector.matchAll(/\.([\w-]+)/g)].map((match) => match[1]);
  if(classes.some((name) => !node.classList.contains(name))) return false;
  const tag = selector.replace(/#[\w-]+/g, '').replace(/\.[\w-]+/g, '').trim();
  if(tag && tag !== '*' && node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
  return attrs.every((match) => {
    const actual = node.getAttribute(match[1]);
    return match[2] === undefined ? actual !== null : actual === match[2];
  });
}

function selectorMatch(node, selector, boundary) {
  const parts = selector.trim().split(/\s+/);
  let cursor = node;
  if(!simpleMatch(cursor, parts.pop())) return false;
  while(parts.length) {
    const expected = parts.pop();
    cursor = cursor.parentNode;
    while(cursor && cursor !== boundary && !simpleMatch(cursor, expected)) cursor = cursor.parentNode;
    if(!cursor || cursor === boundary) return false;
  }
  return true;
}

class FakeElement {
  constructor(tagName = 'div', ownerDocument = null) {
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.children = [];
    this.dataset = {};
    this.style = styleObject();
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new FakeClassList(this);
    this._className = '';
    this._text = '';
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.tabIndex = -1;
    this.type = '';
    this.id = '';
  }
  get className() { return this._className; }
  set className(value) { this.classList.set(value); }
  get firstChild() { return this.children[0] || null; }
  get textContent() { return this._text + this.children.map((child) => child.textContent).join(''); }
  set textContent(value) { this._text = value == null ? '' : String(value); this.children = []; }
  get innerHTML() { return this.textContent; }
  set innerHTML(value) { this._text = value == null ? '' : String(value); this.children = []; }
  appendChild(child) { if(child.parentNode) child.parentNode.removeChild(child); child.parentNode = this; this.children.push(child); return child; }
  insertBefore(child, before) { if(!before) return this.appendChild(child); const index = this.children.indexOf(before); if(index < 0) return this.appendChild(child); if(child.parentNode) child.parentNode.removeChild(child); child.parentNode = this; this.children.splice(index, 0, child); return child; }
  removeChild(child) { const index = this.children.indexOf(child); if(index >= 0) this.children.splice(index, 1); child.parentNode = null; return child; }
  remove() { if(this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(name, value) { name = String(name); value = String(value); this.attributes.set(name, value); if(name === 'id') this.id = value; if(name === 'class') this.className = value; if(name === 'tabindex') this.tabIndex = Number(value); if(name.startsWith('data-')) this.dataset[dataKey(name)] = value; }
  getAttribute(name) { if(name === 'id') return this.id || null; if(name === 'class') return this.className || null; if(name === 'tabindex') return String(this.tabIndex); if(this.attributes.has(name)) return this.attributes.get(name); if(name.startsWith('data-')) return this.dataset[dataKey(name)] ?? null; return null; }
  removeAttribute(name) { this.attributes.delete(name); if(name.startsWith('data-')) delete this.dataset[dataKey(name)]; }
  addEventListener(type, listener) { if(!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(listener); }
  dispatchEvent(event) { event.target ||= this; for(const listener of this.listeners.get(event.type) || []) listener.call(this, event); return !event.defaultPrevented; }
  focus() { if(this.ownerDocument) this.ownerDocument.activeElement = this; }
  querySelectorAll(selector) { return queryAll(this, selector, false); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  scrollIntoView() { this.scrolledIntoView = true; }
}

function descendants(root) {
  const out = [];
  for(const child of root.children || []) { out.push(child, ...descendants(child)); }
  return out;
}

function queryAll(root, selector, includeRoot = false) {
  const nodes = includeRoot ? [root, ...descendants(root)] : descendants(root);
  const selectors = selector.split(',').map((value) => value.trim()).filter(Boolean);
  return nodes.filter((node) => selectors.some((candidate) => selectorMatch(node, candidate, root.parentNode)));
}

class FakeDocument {
  constructor() {
    this.documentElement = new FakeElement('html', this);
    this.body = new FakeElement('body', this);
    this.documentElement.appendChild(this.body);
    this.activeElement = this.body;
    this.readyState = 'complete';
    this.hidden = false;
    this.listeners = new Map();
  }
  createElement(tagName) { return new FakeElement(tagName, this); }
  getElementById(id) { return queryAll(this.documentElement, `#${id}`, true)[0] || null; }
  querySelectorAll(selector) { return queryAll(this.documentElement, selector, true); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, listener) { if(!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(listener); }
  dispatchEvent(event) { for(const listener of this.listeners.get(event.type) || []) listener.call(this, event); }
}

function add(document, parent, tag, id = '', className = '') {
  const node = document.createElement(tag);
  if(id) node.id = id;
  if(className) node.className = className;
  parent.appendChild(node);
  return node;
}

function buildWorkspaceDom() {
  const document = new FakeDocument();
  const view = add(document, document.body, 'div', 'view-3');
  const livePanel = add(document, view, 'div', 'db-panel-live-session', 'db-tab-panel active');
  const overview = add(document, view, 'div', 'db-panel-overview', 'db-tab-panel');
  const settings = add(document, view, 'div', 'db-panel-settings', 'db-tab-panel');
  const announcer = add(document, view, 'div', 'ob-expert-live-pending-announcer');
  const workspace = add(document, livePanel, 'section', 'ob-expert-live-session-switcher');
  const title = add(document, workspace, 'h3', 'ob-expert-live-workspace-title'); title.tabIndex = -1;
  add(document, workspace, 'span', 'ob-expert-live-workspace-count');
  add(document, workspace, 'span', 'ob-expert-live-workspace-transport');
  const media = add(document, workspace, 'div', 'ob-expert-live-media-focus'); media.hidden = true;
  add(document, media, 'span', 'ob-expert-live-media-status');
  const mediaReturn = add(document, media, 'button', 'ob-expert-live-media-return'); mediaReturn.hidden = true;
  const pendingGroup = add(document, workspace, 'div', 'ob-expert-live-pending-group'); pendingGroup.hidden = true;
  add(document, pendingGroup, 'div', 'ob-expert-live-pending-list');
  add(document, workspace, 'div', 'ob-expert-live-session-list');
  add(document, workspace, 'div', 'ob-expert-live-workspace-empty');
  const pane = add(document, livePanel, 'div', 'ob-expert-live-focus-pane');
  add(document, pane, 'div', 'expert-chat-messages');
  add(document, pane, 'input', 'expert-chat-input');
  add(document, pane, 'textarea', 'live-session-notes');
  add(document, pane, 'div', 'live-session-notes-status');
  for(const id of ['live-sess-subtitle','live-client-name','live-client-name-side','live-client-avatar','live-client-avatar-side','live-client-status','live-client-sess-label','live-client-location','live-client-company','live-client-sessions','live-sess-rate','live-sess-cut','expert-session-earnings','expert-net-earnings','live-billing-status','live-earn-rate','live-free-period']) add(document, pane, 'div', id);
  const rtc = add(document, livePanel, 'div', 'expert-rtc-area');
  add(document, rtc, 'div', 'expert-rtc-channel');
  add(document, rtc, 'div', 'rtc-status');
  const overlay = add(document, view, 'div', 'session-request-overlay');
  const sheet = add(document, overlay, 'div', 'session-request-sheet'); sheet.setAttribute('aria-modal', 'false');
  add(document, sheet, 'div', 'req-client-name');
  add(document, sheet, 'button', 'req-accept-btn');
  add(document, sheet, 'button', 'req-decline-btn');
  return {document, livePanel, overview, settings, announcer, workspace, pane, overlay, sheet};
}

function room(id, name, channel = 'chat', extras = {}) {
  return Object.assign({id, session:{id,client_name:name,channel,status:'active'},status:'active',messages:[],unread:0,typing:null,terminal:false,subscriptionError:null,historyRecovery:null}, extras);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return {promise, resolve, reject};
}

function event(type, key = '', target = null) {
  return {type,key,target,shiftKey:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
}

function createWorkspaceHarness({mobile = false, rooms = null, pending = null, fetchImpl = null} = {}) {
  const dom = buildWorkspaceDom();
  const timers = [];
  const opened = [];
  const declined = [];
  const toasts = [];
  const owner = {
    roomsById: rooms || {A:room('A','Alice'),B:room('B','Bob'),C:room('C','Casey')},
    pendingRequestsById: pending || {},
    focusedRoomId:'A', rtcSessionId:'', principalKey:'expert|one', principalGeneration:1,
    identity:{token:'token-one'}, socket:{readyState:1},
    isExpertIdentity:() => true,
    pendingIds(){ return Object.keys(this.pendingRequestsById); },
    aggregateUnread(){ return Object.values(this.roomsById).reduce((sum, value) => sum + Number(value.unread || 0), 0); },
    mergeSnapshot(sid, session){ if(!this.roomsById[sid]) this.roomsById[sid]=room(sid,'Client'); this.roomsById[sid].session=Object.assign({},this.roomsById[sid].session||{},session||{}); },
  };
  const root = {
    console, Object, Array, Number, String, Boolean, Math, JSON, Date, Promise, URLSearchParams, encodeURIComponent,
    document:dom.document, location:{pathname:'/dash/expert/live-session',search:'?session=A'},
    _obExpertRealtime:owner, __OB_TEST_HOOKS__:{},
    setTimeout(handler, delay){ const item={handler,delay:Number(delay||0),cleared:false}; timers.push(item); return item; },
    clearTimeout(item){ if(item)item.cleared=true; },
    addEventListener(){},
    matchMedia:() => ({matches:mobile}),
    fetch:fetchImpl || (() => Promise.reject(new Error('unexpected fetch'))),
    confirm:() => true,
    toast:(message,tone) => toasts.push({message,tone}),
    showSessionRequest(options){
      const sid=String(options.sessionId||'');
      dom.overlay.dataset.sessionId=sid;dom.sheet.dataset.sessionId=sid;
      dom.overlay.classList.add('show');dom.overlay.style.display='flex';dom.sheet.style.display='block';
      dom.document.getElementById('req-client-name').textContent=options.clientName||'Client';
    },
    declineSessionRequest:(sid) => { declined.push(String(sid)); return Promise.resolve(true); },
  };
  root.window = root;
  root.openExpertLivePanel = (sid) => {
    root.obExpertWorkspaceBeforeFocus(sid);
    owner.focusedRoomId=String(sid);
    if(owner.roomsById[sid])owner.roomsById[sid].unread=0;
    opened.push(String(sid));
    root.obRenderExpertLiveWorkspace('focus');
    return true;
  };
  vm.createContext(root);
  new vm.Script(workspaceSource, {filename:'expert-live-workspace.js'}).runInContext(root);
  function runTimers() { while(timers.length){ const item=timers.shift(); if(!item.cleared)item.handler(); } }
  return {root, owner, dom, opened, declined, toasts, runTimers, hooks:root.__OB_TEST_HOOKS__.expertLiveWorkspace};
}

const rooms = {
  A:room('A','Alice','chat'),
  B:room('B','Bob','chat',{unread:3,typing:{expiresAt:Date.now()+5000},messages:[{id:'b1',content:'same text'},{id:'b2',content:'same text',delivery_status:'failed'}]}),
  C:room('C','Casey','chat',{subscriptionError:{code:'session_subscription_limit'},session:{id:'C',client_name:'Casey',channel:'chat',status:'active',internal_secret:'DO_NOT_RENDER'}}),
};
rooms.A.session.expert_notes='Canonical A note';
const h = createWorkspaceHarness({rooms});
const {root, owner, dom, hooks} = h;
hooks.render('fixture');
let tabs = dom.document.querySelectorAll('#ob-expert-live-session-list [role="tab"]');
assert.equal(tabs.length, 3, 'N keyed rooms render as three accessible tabs');
assert.match(tabs.find((tab)=>tab.dataset.obWorkspaceSession==='B').getAttribute('aria-label'), /3 unread/);
assert.match(dom.document.getElementById('ob-expert-live-session-list').textContent, /Client is typing/);
assert.match(dom.document.getElementById('ob-expert-live-session-list').textContent, /1 not sent/);
assert.match(dom.document.getElementById('ob-expert-live-session-list').textContent, /Realtime unavailable/);
assert.doesNotMatch(dom.document.getElementById('ob-expert-live-session-list').textContent, /DO_NOT_RENDER|Canonical A note/, 'rail renders allowlisted display fields only');

const input = dom.document.getElementById('expert-chat-input');
const transcript = dom.document.getElementById('expert-chat-messages');
input.value='private A draft'; input.dispatchEvent(event('input','',input)); input.focus();
const transcriptSentinel=dom.document.createElement('div'); transcriptSentinel.textContent='A transcript sentinel'; transcript.appendChild(transcriptSentinel);
owner.roomsById.B.unread=4; hooks.render('message',owner.roomsById.B,{session_id:'B'});
assert.equal(input.value,'private A draft','off-focus message leaves focused composer unchanged');
assert.equal(dom.document.activeElement,input,'off-focus room updates do not steal composer focus');
assert.match(transcript.textContent,/A transcript sentinel/,'off-focus room updates do not rebuild focused transcript');

root.openExpertLivePanel('B');
assert.equal(owner.rtcSessionId,'','chat focus does not infer media ownership');
assert.equal(input.value,'','B starts with its own empty draft');
input.value='B reply'; input.dispatchEvent(event('input','',input));
root.openExpertLivePanel('A');
assert.equal(input.value,'private A draft','A draft restores after round-trip focus');
root.openExpertLivePanel('B');
assert.equal(input.value,'B reply','B draft remains keyed to B');

tabs = dom.document.querySelectorAll('#ob-expert-live-session-list [role="tab"]');
const tabA=tabs.find((tab)=>tab.dataset.obWorkspaceSession==='A');
const tabB=tabs.find((tab)=>tab.dataset.obWorkspaceSession==='B');
tabA.focus(); const right=event('keydown','ArrowRight',tabA); dom.document.dispatchEvent(right);
assert.equal(dom.document.activeElement,tabB,'ArrowRight advances the horizontal roving tab stop');
const down=event('keydown','ArrowDown',tabB); dom.document.dispatchEvent(down);
assert.equal(down.defaultPrevented,false,'ArrowDown remains available for page scrolling in a horizontal tablist');
const enter=event('keydown','Enter',tabA); dom.document.dispatchEvent(enter);
assert.equal(owner.focusedRoomId,'A','Enter activates the roving session tab');

const aiContext=root.obExpertWorkspaceCaptureOperation('A');
input.value='newer A typing';input.dispatchEvent(event('input','',input));
assert.equal(root.obExpertWorkspaceSetComposerDraft('A','stale suggestion',aiContext),false,'AI cannot overwrite a newer same-room draft revision');
assert.equal(input.value,'newer A typing');
const crossFocusContext=root.obExpertWorkspaceCaptureOperation('A');
root.openExpertLivePanel('B');
assert.equal(root.obExpertWorkspaceSetComposerDraft('A','safe background suggestion',crossFocusContext),true,'unchanged A can receive a keyed background suggestion');
assert.equal(input.value,'B reply','background AI result never writes into focused B');
root.openExpertLivePanel('A');
assert.equal(input.value,'safe background suggestion','keyed suggestion projects only when A is focused again');

owner.rtcSessionId='A';owner.focusedRoomId='B';owner.roomsById.A.session.channel='voice';root.obRenderExpertLiveWorkspace('rtc_focus');
assert.equal(owner.focusedRoomId,'B','RTC A coexists with focused chat B');
assert.match(dom.document.getElementById('ob-expert-live-media-status').textContent,/Voice with Alice/);
assert.match(dom.document.getElementById('expert-rtc-area').getAttribute('aria-label'),/Alice/,'media dock is named for its owner rather than focused chat');
root.obExpertWorkspaceSetMediaStatus('A','Trying to reconnect…','attention');
assert.match(dom.document.getElementById('ob-expert-live-media-status').textContent,/Trying to reconnect/,'media-owner recovery status renders while B remains focused');
assert.equal(owner.focusedRoomId,'B');

const pending = {
  P1:{session:{id:'P1',client_name:'Later Client',channel:'video',created_at:100,request_expires_at:220}},
  P2:{session:{id:'P2',client_name:'First Client',channel:'voice',created_at:90,request_expires_at:150}},
  P3:{session:{id:'P3',client_name:'Third Client',channel:'chat',created_at:95,request_expires_at:180,private_blob:'DO_NOT_RENDER'}},
};
owner.pendingRequestsById=pending;
input.focus();root.obRenderExpertLiveWorkspace('pending_added',null,{session_id:'P2',session:pending.P2.session});
const pendingText=dom.document.getElementById('ob-expert-live-pending-list').textContent;
assert(pendingText.indexOf('First Client') < pendingText.indexOf('Third Client') && pendingText.indexOf('Third Client') < pendingText.indexOf('Later Client'),'pending cards sort by authoritative expiry');
assert.doesNotMatch(pendingText,/DO_NOT_RENDER/,'pending rendering excludes internal DTO fields');
assert.equal(dom.document.activeElement,input,'unsolicited pending request preserves composer focus');
assert.equal(dom.announcer.textContent,'New voice request from First Client. Review it in Incoming requests.','new pending request announces once without focus theft');
root.obRenderExpertLiveWorkspace('pending_updated',null,{session_id:'P2',session:pending.P2.session});
assert.equal(dom.announcer.textContent,'New voice request from First Client. Review it in Incoming requests.','reconciliation updates do not repeat the announcement');
root.obExpertWorkspacePendingDialogClosed();
assert.equal(dom.document.activeElement,input,'unsolicited close or expiry leaves the active composer caret untouched');
let p1Review=dom.document.querySelector('[data-ob-pending-session="P1"][data-ob-pending-action="review"]');
root.__OB_TEST_HOOKS__.expertLiveWorkspace.reviewPending('P1',p1Review);h.runTimers();
assert.equal(dom.sheet.dataset.sessionId,'P1');
assert.equal(dom.document.activeElement,dom.document.getElementById('req-accept-btn'),'explicit Review owns initial dialog focus');
root.obExpertWorkspacePendingDialogClosed();
assert.equal(dom.document.activeElement,p1Review,'explicit Review close returns focus to its source control');
let p2Decline=dom.document.querySelector('[data-ob-pending-session="P2"][data-ob-pending-action="decline"]');
p2Decline.dispatchEvent(event('click','',p2Decline));
assert.deepEqual(h.declined,['P2'],'direct card decline passes exact P2');
assert.equal(dom.sheet.dataset.sessionId,'P1','declining P2 never retargets the visible P1 review');
root.obExpertWorkspaceSetPendingBusy('P2',false,true);
assert.match(dom.document.getElementById('ob-expert-live-pending-list').textContent,/Action failed\. This request is still pending/,'failed decline remains visible and retryable');

const mobile = createWorkspaceHarness({mobile:true,pending:{M:{session:{id:'M',client_name:'Mobile Client',channel:'video',request_expires_at:9999999999}}}});
const mobileInput=mobile.dom.document.getElementById('expert-chat-input');mobileInput.focus();
mobile.root.obRenderExpertLiveWorkspace('pending_added',null,{session_id:'M',session:mobile.owner.pendingRequestsById.M.session});
assert.equal(mobile.dom.document.activeElement,mobileInput,'unsolicited 375px request remains nonmodal and non-stealing');
assert.equal(mobile.dom.sheet.getAttribute('aria-modal'),'false');
assert.equal(mobile.dom.overlay.classList.contains('ob-expert-pending-explicit-modal'),false);
const mobileReview=mobile.dom.document.querySelector('[data-ob-pending-session="M"][data-ob-pending-action="review"]');
mobile.hooks.reviewPending('M',mobileReview);mobile.runTimers();
assert.equal(mobile.dom.sheet.getAttribute('aria-modal'),'true','explicit mobile Review opens true modal semantics');
assert.equal(mobile.dom.overlay.classList.contains('ob-expert-pending-explicit-modal'),true);
assert.equal(mobile.dom.document.activeElement,mobile.dom.document.getElementById('req-accept-btn'),'explicit mobile Review moves focus to a safe action');

const noteRequests=[];
const notesHarness=createWorkspaceHarness({rooms:{A:room('A','Alice','chat',{session:{id:'A',client_name:'Alice',channel:'chat',status:'active',expert_notes:'Saved base'}})},fetchImpl:(url,options)=>{const wait=deferred();noteRequests.push({url,options,wait});return wait.promise;}});
const notes=notesHarness.dom.document.getElementById('live-session-notes');
assert.equal(notes.value,'Saved base','focused detail hydrates canonical private notes');
notes.value='v1';notes.dispatchEvent(event('input','',notes));
const saveV1=notesHarness.hooks.saveNotes();await Promise.resolve();await Promise.resolve();
assert.equal(noteRequests.length,1,'first notes save starts immediately');
notes.value='v2';notes.dispatchEvent(event('input','',notes));
const saveV2=notesHarness.hooks.saveNotes();await Promise.resolve();await Promise.resolve();
assert.equal(noteRequests.length,1,'second same-room save queues behind the first');
assert.equal(JSON.parse(noteRequests[0].options.body).notes,'v1');
noteRequests[0].wait.resolve({ok:true,json:async()=>({success:true,session_id:'A',expert_notes:'v1'})});
await saveV1;await Promise.resolve();await Promise.resolve();
assert.equal(noteRequests.length,2,'queued latest draft starts only after v1 settles');
assert.equal(JSON.parse(noteRequests[1].options.body).notes,'v2');
assert.equal(notes.value,'v2','older save response cannot overwrite newer typing');
noteRequests[1].wait.resolve({ok:true,json:async()=>({success:true,session_id:'A',expert_notes:'v2'})});
assert.equal(await saveV2,true);
assert.equal(notes.value,'v2');
assert.equal(notesHarness.dom.document.getElementById('live-session-notes-status').textContent,'Saved');

dom.announcer.textContent='New video request from Alice';
dom.document.getElementById('ob-expert-live-media-status').textContent='Video with Alice';
const rtcArea=dom.document.getElementById('expert-rtc-area');rtcArea.style.display='block';rtcArea.classList.add('ob-expert-rtc-docked');rtcArea.setAttribute('aria-label','Active video session with Alice');
input.value='Alice private draft';dom.document.getElementById('live-session-notes').value='Alice private note';
owner.roomsById={};owner.pendingRequestsById={};owner.focusedRoomId='';owner.rtcSessionId='';owner.principalKey='expert|two';owner.principalGeneration=2;
root.obRenderExpertLiveWorkspace('principal_changed');
assert.equal(input.value,'');assert.equal(dom.document.getElementById('live-session-notes').value,'');
assert.equal(dom.announcer.textContent,'','principal reset scrubs the global pending announcer');
assert.equal(dom.document.getElementById('ob-expert-live-media-status').textContent,'');
assert.equal(rtcArea.style.display,'none');
assert.equal(rtcArea.getAttribute('aria-label'),'Active voice or video session');
assert.equal(rtcArea.classList.contains('ob-expert-rtc-docked'),false,'principal reset removes the prior media dock surface');

const miniDom=buildWorkspaceDom();
const miniRoot={window:null,document:miniDom.document,console,Object,Array,Number,String,Boolean,Math,JSON,Date,Promise,URLSearchParams,encodeURIComponent,__OB_TEST_HOOKS__:{},_obExpertRealtime:{isExpertIdentity:()=>true,roomsById:{},pendingRequestsById:{},principalKey:'expert|mini'},obIsMiniSuiteRoute:()=>true,setTimeout,clearTimeout,addEventListener(){},location:{pathname:'/mini-suite',search:''}};miniRoot.window=miniRoot;
vm.createContext(miniRoot);new vm.Script(workspaceSource).runInContext(miniRoot);
assert.equal(miniDom.workspace.hidden,true,'mini suite does not mount or reparent the expert workspace');

function functionBlock(name, endMarker) { return section(`  function ${name}(`, endMarker).trim(); }

// Execute the actual media lifecycle router with A as RTC owner and B as focused chat.
const mediaRouterSource = `${functionBlock('showSessionConnectionStatus', '\n\n  var expertPrivateOperations')}` + '\n' + section('  function routeWsMessage(', '\n  window._obRouteWsMessage = routeWsMessage;').trim();
const routeElements=Object.fromEntries(['rtc-status','b3-rtc-status','a4-session-rate','live-billing-status','live-client-status','live-sess-subtitle'].map((id)=>[id,{textContent:'',style:{}}]));
const routeMedia=[];const clearedIssues=[];
const routeRuntime={rtcSessionId:'A',ingest:(message)=>({sid:message.session_id,handled:true,focused:message.session_id==='B',room:{id:message.session_id,terminal:false},duplicate:false,transport:false,missingSession:false})};
const routeSandbox={window:null,document:{getElementById:(id)=>routeElements[id]||null},console,Object,Array,Number,String,Date,JSON,expertRealtime:routeRuntime,_obExpertRealtime:routeRuntime,_obActiveSessId:'B',_sid:'B',_sessId:'B',setText:(id,value)=>{if(routeElements[id])routeElements[id].textContent=value;},role:()=> 'expert',recentlyTerminalSession:()=>false,endedPayload:()=>false,rememberTerminalSession(){},clearRtcRecoveryStatus(){},obExpertWorkspaceSetMediaStatus:(sid,label,tone)=>routeMedia.push({sid,label,tone}),_obShowSessionConnectionIssue(){},_obClearSessionConnectionIssue:(sid)=>clearedIssues.push(sid)};routeSandbox.window=routeSandbox;
vm.createContext(routeSandbox);new vm.Script(mediaRouterSource,{filename:'media-router.js'}).runInContext(routeSandbox);
routeSandbox.routeWsMessage({type:'session_connection_recovering',session_id:'A',channel:'video'},'expert');
assert.equal(routeMedia.at(-1).sid,'A');assert.match(routeMedia.at(-1).label,/trying to reconnect/i);assert.equal(routeElements['live-billing-status'].textContent,'','A recovery does not overwrite focused B billing');
routeSandbox.routeWsMessage({type:'participant_rejoined',session_id:'A',channel:'video'},'expert');
assert.deepEqual(routeMedia.at(-1),{sid:'A',label:'Connected',tone:'live'});assert.equal(clearedIssues.at(-1),'A');
routeSandbox.routeWsMessage({type:'participant_reconnecting',session_id:'A',channel:'video'},'expert');const aStatus=routeElements['rtc-status'].textContent;
routeSandbox.routeWsMessage({type:'participant_rejoined',session_id:'B',channel:'chat'},'expert');
assert.equal(routeElements['rtc-status'].textContent,aStatus,'focused chat B rejoin cannot overwrite recovering RTC A');
assert.notEqual(routeElements['live-billing-status'].textContent,'','B lifecycle may update B billing surface');
assert.equal(clearedIssues.filter((sid)=>sid==='B').length,0,'chat B cannot clear RTC A connection issue');

// Execute focused terminal routing while a stale live-session URL remains behind Settings.
const endedSource = section('  function nextExpertRoomAfterEnd(', '\n  window.obApplyAuthoritativeExpertEnded = function').trim();
const terminalDom=buildWorkspaceDom();terminalDom.livePanel.classList.remove('active');terminalDom.settings.classList.add('active');
const terminalRuntime={roomsById:{A:room('A','Alice','chat',{terminal:true,status:'ended'}),B:room('B','Bob')},focusedRoomId:'A',rtcSessionId:'',focusRoom(sid){this.focusedRoomId=sid;},ingest(){throw new Error('already terminal');}};
let terminalOpened=0;let terminalNoticed=0;
const endedSandbox={window:null,document:terminalDom.document,console,Object,Array,Number,String,Date,location:{pathname:'/dash/expert/live-session',search:'?session=A'},expertRealtime:terminalRuntime,activeExpertSessionId:()=> 'A',stopExpertTimerKeepDisplay(){},clearInterval(){},setText(){},money:(value)=>`$${Number(value||0).toFixed(2)}`,toastMsg(){},showExpertEndedNotice(){terminalNoticed+=1;},openExpertLivePanel(){terminalOpened+=1;},obRenderExpertLiveWorkspace(){},_expertSessActive:true};endedSandbox.window=endedSandbox;
vm.createContext(endedSandbox);new vm.Script(endedSource,{filename:'terminal-route.js'}).runInContext(endedSandbox);
endedSandbox.applyExpertEnded({id:'A',status:'ended'},'client');
assert.equal(terminalOpened,0,'background terminal cannot reopen B from a stale live-session URL');
assert.equal(terminalNoticed,0,'background terminal cannot schedule Sessions navigation');
assert.equal(terminalRuntime.focusedRoomId,'','ended A focus clears without selecting B while Settings is active');
assert.equal(terminalDom.document.querySelector('.db-tab-panel.active'),terminalDom.settings);

const lateMediaDom=buildWorkspaceDom();
const lateMediaRuntime={roomsById:{A:{id:'A',session:null,status:'',messages:[],terminal:false},B:room('B','Bob','chat',{terminal:true,status:'ended'})},focusedRoomId:'B',rtcSessionId:'A',focusRoom(sid){this.focusedRoomId=sid;},ingest(){throw new Error('already terminal');}};
let lateMediaOpened='';let lateMediaNoticed=0;let lateMediaCleanup=0;
const lateMediaSandbox={window:null,document:lateMediaDom.document,console,Object,Array,Number,String,Date,location:{pathname:'/dash/expert/live-session',search:'?session=B'},expertRealtime:lateMediaRuntime,activeExpertSessionId:()=> 'B',stopExpertTimerKeepDisplay(){},clearInterval(){},setText(){},money:(value)=>`$${Number(value||0).toFixed(2)}`,toastMsg(){},showExpertEndedNotice(){lateMediaNoticed+=1;},openExpertLivePanel(sid){lateMediaOpened=String(sid);lateMediaRuntime.focusedRoomId=String(sid);return true;},obRenderExpertLiveWorkspace(){},obRenderExpertBillingTruth(){},OB_RTC:{isActive:()=>true,getSid:()=> 'A',cleanup(){lateMediaCleanup+=1;}},_expertSessActive:true};lateMediaSandbox.window=lateMediaSandbox;
vm.createContext(lateMediaSandbox);new vm.Script(endedSource,{filename:'terminal-media-owner.js'}).runInContext(lateMediaSandbox);
lateMediaSandbox.applyExpertEnded({id:'B',status:'ended'},'client');
assert.equal(lateMediaOpened,'A','metadata-late RTC A is the deterministic next focus when chat B ends');
assert.equal(lateMediaRuntime.focusedRoomId,'A');
assert.equal(lateMediaRuntime.rtcSessionId,'A');
assert.equal(lateMediaCleanup,0,'ending focused chat B never cleans active RTC A');
assert.equal(lateMediaNoticed,0,'active metadata-late RTC A prevents Sessions navigation');

// Execute the permission fallback reconciliation after local cleanup has already cleared rtcSessionId.
const fallbackSource = functionBlock('_fallbackEndSession', '\n  function _endForConnectionIssue');
const fallbackWait=deferred();const fallbackEvents=[];const resumeClears=[];
const fallbackRuntime={principalKey:'expert|one',principalGeneration:7,rtcSessionId:'A',checkIdentity(){},ingest:(value)=>fallbackEvents.push(value)};
const fallbackSandbox={window:null,console,Object,Promise,String,encodeURIComponent,_role:'expert',_authToken:()=> 'token',_apiBase:()=> 'https://api.example',fetch:()=>fallbackWait.promise,_obExpertRealtime:fallbackRuntime,_obClearRealtimeResumeForSession:(sid,principal)=>resumeClears.push({sid,principal})};fallbackSandbox.window=fallbackSandbox;
vm.createContext(fallbackSandbox);new vm.Script(fallbackSource).runInContext(fallbackSandbox);
const fallbackResult=fallbackSandbox._fallbackEndSession('A','media_permission_failed');fallbackRuntime.rtcSessionId='';
fallbackWait.resolve({ok:true,json:async()=>({session:{id:'A',status:'ended'}})});
assert.equal(await fallbackResult,true);assert.equal(fallbackEvents.length,1);assert.equal(fallbackEvents[0].session_id,'A');assert.deepEqual(resumeClears,[{sid:'A',principal:'expert|one'}],'authoritative fallback clears exact A resume state after cleanup');

// Execute SID-specific resume clearing and prove a newer B media owner is successor-safe.
const clearResumeSource = functionBlock('clearResumeStateForSession', '\n  function resumeMemoryOwned');
const resumeStorage=new Map([['ob_realtime_resume_state_v2',JSON.stringify({sid:'A',principal_key:'expert|one'})]]);let wakeReleases=0;
const resumeSandbox={window:null,console,Object,String,JSON,STORE_KEY:'ob_realtime_resume_state_v2',resumeState:{sid:'A',channel:'video',role:'expert',principalKey:'expert|one',active:true,lastResumeAt:1,hardAttempts:1},sessionStorage:{getItem:(key)=>resumeStorage.get(key)||null,removeItem:(key)=>resumeStorage.delete(key)},_obRtcLastSid:'A',_obRtcLastChannel:'video',_obRtcLastRole:'expert',_obExpertRealtime:{rtcSessionId:'B'},OB_RTC:{getSid:()=> 'B'},hideReconnectPrompt(){},releaseWakeLock(){wakeReleases+=1;}};resumeSandbox.window=resumeSandbox;
vm.createContext(resumeSandbox);new vm.Script(clearResumeSource).runInContext(resumeSandbox);
assert.equal(resumeSandbox.clearResumeStateForSession('A','expert|one'),true);
assert.equal(resumeSandbox.resumeState.sid,'');assert.equal(resumeStorage.has('ob_realtime_resume_state_v2'),false);assert.equal(resumeSandbox._obExpertRealtime.rtcSessionId,'B');assert.equal(wakeReleases,0,'clearing ended A cannot release newer B media ownership');

// Execute fee snapshot fallback semantics against backend-aligned fixtures.
const feeSource = functionBlock('feePctFromSession', 'function applySessionCut(sess)');
const feeSandbox={console,Object,Number,planState:{billing:{plans:[]},current:{id:'pro'},plans:[]},readBillingSnapshot:()=>({plans:[],current_plan:{id:'pro'}}),normalizePlanId:(value)=>String(value||'starter'),currentPlanIdFromUser:()=> 'pro',plansById:()=>({starter:{platform_fee_pct:12},pro:{platform_fee_pct:8},scale:{platform_fee_pct:5}}),planDefaults:[]};
vm.createContext(feeSandbox);new vm.Script(feeSource).runInContext(feeSandbox);
assert.equal(feeSandbox.feePctFromSession({id:'legacy',platform_fee_pct:null,expert_plan:'starter'}),12);
assert.equal(feeSandbox.feePctFromSession({id:'legacy',platform_fee_pct:null,expert_plan:'pro'}),8);
assert.equal(feeSandbox.feePctFromSession({id:'legacy',platform_fee_pct:null,expert_plan:null}),12,'missing bound-session plan defaults to starter even for a Pro account');
assert.equal(feeSandbox.feePctFromSession({id:'zero',platform_fee_pct:0,expert_plan:'starter'}),0,'explicit zero snapshot remains valid');
assert.equal(feeSandbox.feePctFromSession({id:'snapshot',platform_fee_pct:5,expert_plan:'starter'}),5,'immutable snapshot wins over plan changes');

// Execute two pending declines out of order; each card retains independent ownership.
const declineSource = section('  var prevDeclineSessionRequestV22 = window.declineSessionRequest;', '\n\n  function copyAdminAuthForNewTab').trim();
const declineWait={D1:deferred(),D2:deferred()};const busy=[];const hidden=[];const operationKeys=[];
const declineSandbox={window:null,console,Object,Promise,String,encodeURIComponent,declineSessionRequest:null,_pendingSid:'A',requestSidFromDom:()=> 'A',_obIncomingSessId:'A',document:{getElementById:()=>null},captureExpertPrivateOperation:(scope,sid,key)=>{operationKeys.push(key);return {sid,key};},expertPrivateOperationCurrent:()=>true,releaseExpertPrivateOperation(){},api:(url)=>declineWait[url.includes('D1')?'D1':'D2'].promise,hideRequestOverlay:(sid)=>hidden.push(sid),obExpertWorkspaceSetPendingBusy:(sid,isBusy,error)=>busy.push({sid,isBusy,error}),toastMsg(){}};declineSandbox.window=declineSandbox;
vm.createContext(declineSandbox);new vm.Script(declineSource).runInContext(declineSandbox);
const decline1=declineSandbox.declineSessionRequest('D1');const decline2=declineSandbox.declineSessionRequest('D2');
declineWait.D2.resolve({});declineWait.D1.reject(new Error('temporary failure'));
assert.equal(await decline2,true);assert.equal(await decline1,false);
assert.deepEqual(operationKeys,['pending-decline:D1','pending-decline:D2']);assert.deepEqual(hidden,['D2']);
assert(busy.some((item)=>item.sid==='D1'&&!item.isBusy&&item.error),'failed D1 is independently restored with a visible retry error');
assert(busy.some((item)=>item.sid==='D2'&&!item.isBusy&&!item.error),'successful D2 independently clears busy state');

console.log('expert live multi-session workspace frontend smoke: ok');
