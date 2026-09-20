import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import vm from 'node:vm';

// --baseline intentionally reproduces the takeover on the exact pre-fix candidate.
// This is a deterministic source-level regression suite, not a hosted lifecycle test.
const baseline = '4fc8fd3b31c6a08eb5500a6dbd84483d966cdcea';
const red = process.argv.includes('--baseline');
const prepRed = process.argv.includes('--presession-baseline');
const html = red || prepRed
  ? execFileSync('git', ['show', (prepRed ? 'c21ada063a6534d46aaeee907706cfd776f181be' : baseline) + ':index.html'], { cwd: new URL('..', import.meta.url), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  : readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
function script(id) {
  const matches = scripts.filter(match => match[1].includes(`id="${id}"`));
  assert.equal(matches.length, 1, `one exact script: ${id}`);
  return matches[0][2];
}
function range(start, end, from = 0) {
  const a = html.indexOf(start, from), b = html.indexOf(end, a);
  assert(a >= 0 && b > a, `exact source range: ${start}`);
  return html.slice(a, b);
}
const guard = script('ownlybiz-public-domain-shell-guard-20260614');
const auth = range('    window.obAuthPrincipalFingerprint =', '    window.obBeginAuthAttempt =');
const firstPaint = scripts.find(match => match[2].includes('window.__obReleasePublicFirstPaintShell = function'))?.[2];
assert(firstPaint);
const expertRoute = range('  function applyExpertRoute(', '  function dashRouteStillCurrent(');
const requestedPage = range('\t  function showRequestedPage(){', '\t  function scheduleRequestedPage(){');
const initRouting = range('    var _qe=new URLSearchParams(window.location.search)', "    if(path === 'admin'){");
const legacyRouting = range('\t\t  document.addEventListener(\'DOMContentLoaded\', function() {', '\n\n\nfunction loadAdminPaymentSettings()');
const routeApply = range('  function applyRoute(', '  function syncNavHrefs(){');
const routePush = range('  function pushAndApply(', '  function installWrappers(){');
const stabilization = range('\t  window.obStabilizePublicExpertExperience = function(', '\n  function wrapSessionEntrypoints(){');
const pageVisibility = range('  // Page visibility — hide/show nav links and page panels', '  // Contact page content');
const launch = range('function _launchSession(isPaid)', '// ===== SESSION SCREEN SETUP =====');
const phone = range('function phoneGo(screenId)', '\nfunction startFreeTimer()');
const requestBegin = range('  var _origBegin=window._beginSession;', '  window.obCancelWait=function(){');
const authorizationBegin = range('  var priorBegin = window._beginSession;', "  document.addEventListener('click',function(event){", html.indexOf('  var priorBegin = window._beginSession;'));
const rememberResume = range('  window.obRememberSessionResume=function(sid,roleName){', '  window._obClearRealtimeResumeForSession =');

function node(id, initial = []) {
  const classes = new Set(initial);
  return { id, dataset: {}, style: { setProperty() {} }, hidden: false, children: [],
    classList: { add: (...v) => v.forEach(x => classes.add(x)), remove: (...v) => v.forEach(x => classes.delete(x)), contains: x => classes.has(x) },
    querySelector() { return null; },
  };
}
function jwt(id = 'client-a', role = 'client', generation = 1) {
  return 'qa.' + Buffer.from(JSON.stringify({ id, role, tenant_id: 'tenant-a', generation })).toString('base64url') + '.offline';
}
function harness({ host = 'query', delivery = true, credential = jwt() } = {}) {
  let now = 0, order = 0, expired = false, publicRenders = 0, requested = 'book', loads = 0, pageChanges = 0, launchHook = null, permitRequest = false;
  const requests = [];
  const timers = [], events = new Map(), winEvents = new Map(), nodes = new Map();
  const view4 = node('view-4', ['view-panel', 'active']), view5 = node('view-5', ['view-panel']);
  for (const n of [view4, view5, node('ep-book', ['expert-page', 'active']), node('ep-home', ['expert-page']), node('screen-PRESESS', ['phone-screen']), node('screen-A3', ['phone-screen']), node('screen-A4', ['phone-screen']), node('screen-B3', ['phone-screen']), node('screen-VID', ['phone-screen']), node('screen-A5', ['phone-screen']), node('ob-waiting-overlay'), node('ob-wait-title'), node('ob-wait-sub')]) nodes.set(n.id, n);
  for (const page of ['about', 'services', 'reviews', 'contact']) nodes.set('ep-' + page, node('ep-' + page, ['expert-page']));
  const shell = node('ob-public-first-paint-shell'); shell.dataset = { slug: 'qa-reader', page: 'book' };
  shell.parentNode = { removeChild() { nodes.delete(shell.id); } }; nodes.set(shell.id, shell);
  const location = {
    hostname: host === 'query' ? 'ownlybiz-git-staging-shugo11111978-4289s-projects.vercel.app' : host === 'custom' ? 'qa-reader.example.invalid' : 'qa-reader.ownlybiz.com',
    pathname: '/book', search: host === 'query' ? '?expert=qa-reader' : '',
  };
  const document = {
    readyState: 'loading', body: node('body'), documentElement: node('html'),
    getElementById: id => nodes.get(id) || null,
    querySelector(selector) {
      if (selector === '#view-4.active') return view4.classList.contains('active') ? view4 : null;
      if (selector === '#view-5.active') return view5.classList.contains('active') ? view5 : null;
      if (selector === '#view-5 .phone-screen.active') return [...nodes.values()].find(n => n.classList.contains('phone-screen') && n.classList.contains('active')) || null;
      if (selector === '#view-4 .expert-page.active') return [...nodes.values()].find(n => n.classList.contains('expert-page') && n.classList.contains('active')) || null;
      if (selector === '#view-4 #ep-book') return nodes.get('ep-book');
      throw Error('unhandled selector: ' + selector);
    },
    querySelectorAll(selector) {
      if (selector === '.view-panel.active') return [view4, view5].filter(n => n.classList.contains('active'));
      if (selector === '.phone-screen') return [...nodes.values()].filter(n => n.classList.contains('phone-screen'));
      if (selector.startsWith('#expert-site-links a[data-ob-expert-page=')) return [];
      throw Error('unhandled selector: ' + selector);
    },
    addEventListener(name, fn) { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); },
  };
  const expert = { user_id: 'expert-a', slug: 'qa-reader', name: 'QA Reader' };
  const storage = new Map();
  const context = {
    location, document, URLSearchParams, AbortController, atob, console,
    sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    obResolveAuthToken: () => credential, obIsExpiredAuthToken: () => expired,
    _currentExpert: expert, _currentExpertId: 'expert-a', _currentExpertSlug: 'qa-reader', _browseExpert: 'qa-reader',
    __OB_EXPERT_DELIVERY__: delivery, __OB_PRELOADED_EXPERT__: { slug: 'qa-reader', expert },
    __OB_PUBLIC_FIRST_PAINT__: { slug: 'qa-reader' }, __OB_EXPERT_SITE__: { pages: [{ path: '/book', page: 'book' }] },
    obPlatformRouteRoots: { book: 1, home: 1, dash: 1, admin: 1 },
    switchView(n) { [view4, view5].forEach(v => v.classList.remove('active')); nodes.get('view-' + n)?.classList.add('active'); },
    _applyExpertWebsite(data) { publicRenders++; if (data.website_content) context.applyPageVisibility(data.website_content); },
    showMktPage() {}, loadExpertWebsite() { loads++; }, loadMarketing() {},
    safeShowExpertPage(page) { requested = page; }, loadExpertOnce() { loads++; },
    setPendingPage: () => requested,
    showExpertPage(page) { requested = page; pageChanges++; },
    _ewShow(element, visible) { element.style.display = visible ? '' : 'none'; },
    history: { pushState(_s, _t, url) { const next = new URL(url, 'https://' + location.hostname); location.pathname = next.pathname; location.search = next.search; } },
    routeForHref: () => ({ type: 'expert', slug: 'qa-reader', page: 'home' }),
    parseRoute: () => ({ type: 'expert', slug: 'qa-reader', page: requested }),
    track() {}, syncNavHrefs() {}, routeApplicationGeneration: 0, applyingRoute: false,
    obPublicExpertRenderCurrent: () => true, CHANNELS: ['chat', 'voice', 'video'], enabledFlag: v => v,
    storeExpertPayload() {}, sanitizePlaceholders() {}, applyAvailability() {},
    _startSessionScreen() { if (launchHook) launchHook(context); }, freeMinutes: { chat: 0, voice: 0, video: 0 }, obMinuteText: () => '0',
    updateFlowIndicator() {}, startFreeTimer() {}, startPaidTimer() {}, startVoiceTimerB() {}, startVideoTimer() {},
    myRole: () => context.OB_CLIENT_CONTEXT.capture().role, tok: () => context.OB_CLIENT_CONTEXT.token(),
    BASE: 'https://offline.example.invalid', currentChannel: () => context._obPendingChannel, paymentMode: () => 'minute',
    OB_RATE_POLICY: { requiresAuthorization: () => false, ownerRate: () => 0 },
    resumeState: {}, currentPrincipalKey: () => 'offline-client-a', saveResumeState() {}, requestWakeLock() {},
    fetch(url, options) { assert(permitRequest, 'unexpected API request in offline fixture'); requests.push({ url, options }); return new Promise(() => {}); },
    setTimeout(fn, delay = 0) { timers.push({ fn, at: now + delay, order: order++ }); return order; },
    addEventListener(name, fn) { if (!winEvents.has(name)) winEvents.set(name, []); winEvents.get(name).push(fn); },
  };
  context.window = context; vm.createContext(context);
  const run = source => new vm.Script(source).runInContext(context);
  run(auth); run(firstPaint); run(phone + launch + requestBegin + authorizationBegin + rememberResume);
  const beginBeforeGuard = context._beginSession;
  run(guard); run(expertRoute + requestedPage + routeApply + routePush + stabilization + '\nfunction applyPageVisibility(wc){' + pageVisibility + '}');
  function tick(target) {
    for (;;) {
      timers.sort((a, b) => a.at - b.at || a.order - b.order);
      if (!timers.length || timers[0].at > target) break;
      const timer = timers.shift(); now = timer.at; timer.fn();
    }
    now = target;
  }
  function screen(id) { [...nodes.values()].filter(n => n.classList.contains('phone-screen')).forEach(n => n.classList.remove('active')); nodes.get(id)?.classList.add('active'); }
  function open(channel = 'chat', overrides = {}) {
    context._obClientSessionSnapshot = { id: 'session-a', client_id: 'client-a', expert_id: 'expert-a', channel, status: 'active', ...overrides };
    context._obActiveSessId = context._obClientSessionSnapshot.id;
    context._sessId = context._obActiveSessId;
    context.switchView(5);
    screen({ chat: 'screen-A4', voice: 'screen-B3', video: 'screen-VID' }[channel] || 'screen-A4');
  }
  function publicRefresh() { context._applyExpertWebsite(context._currentExpert); tick(now); }
  function assertLive() {
    assert.equal(view5.classList.contains('active'), true, 'owned lifecycle remains selected');
    assert.equal(view4.classList.contains('active'), false, 'public view must not steal the lifecycle surface');
  }
  function assertPublic() { assert.equal(view4.classList.contains('active'), true); assert.equal(view5.classList.contains('active'), false); }
  return { context, document, nodes, open, screen, run, tick, publicRefresh, assertLive, assertPublic, requests, beginBeforeGuard,
    launch(channel = 'chat', paid = true) { context.selectedChannel = { id: channel, name: channel, icon: channel, price: '$0.00/min' }; context._obPendingChannel = channel; context.currentBookChannel = channel; return context._launchSession(paid); },
    setLaunchHook: fn => { launchHook = fn; }, allowRequest: () => { permitRequest = true; },
    publicPage(page) { [...nodes.values()].filter(n => n.classList.contains('expert-page')).forEach(n => n.classList.remove('active')); nodes.get('ep-' + page).classList.add('active'); context.location.pathname = '/' + page; },
    boot() { for (const fn of events.get('DOMContentLoaded') || []) fn(); document.readyState = 'complete'; },
    setExpired: value => { expired = value; }, get now() { return now; }, get publicRenders() { return publicRenders; }, get loads() { return loads; }, get pageChanges() { return pageChanges; },
  };
}

if (!prepRed) for (const host of ['query', 'custom', 'subdomain']) for (const channel of ['chat', 'voice', 'video']) for (const order of ['restore-first', 'public-first']) {
  test(`${host} ${channel}: ${order} survives all boot/profile timer boundaries`, () => {
    const h = harness({ host });
    if (order === 'public-first') { h.boot(); h.tick(1000); h.publicRefresh(); }
    h.open(channel); h.assertLive();
    if (order === 'restore-first') h.boot();
    for (const at of [1200, 3200, 5200, 7600, 9000, 12000]) { h.tick(at); h.publicRefresh(); h.assertLive(); }
    assert(h.publicRenders > 0, 'profile data rendering is not disabled');
    assert.equal(h.document.documentElement.classList.contains('ob-route-loading'), false);
    assert.equal(h.document.documentElement.classList.contains('ob-public-loading'), false);
    assert.equal(h.document.body.classList.contains('ownly-ready'), true);
    if (!red) assert.equal(h.nodes.has('ob-public-first-paint-shell'), false, 'SSR cover released for active lifecycle');
  });
}

if (!red && !prepRed) {
  test('exact hidden-page profile refresh cannot passively redirect an owned lifecycle; public fallback remains', () => {
    for (const page of ['about', 'services', 'reviews', 'contact']) for (const channel of ['chat', 'voice', 'video']) {
      const h = harness(); h.publicPage(page); h.open(channel);
      h.context._currentExpert.website_content = { pages: { [page]: false } };
      h.publicRefresh(); h.assertLive();
      assert.equal(h.nodes.get('ep-' + page).style.display, 'none', 'public content visibility still updates');
      assert.equal(h.pageChanges, 0, 'passive home redirect is withheld while the session surface owns its route');
      assert.equal(h.context.location.pathname, '/' + page);
      h.tick(9000); h.assertLive();
      h.context.switchView(4); h.publicRefresh(); h.assertPublic();
      assert.equal(h.pageChanges, 1, 'normal public-only hidden-page fallback is unchanged');
    }
  });
  test('passive canonical route/host retry/init writers yield without new loads or page changes', () => {
    const h = harness(); h.open(); const loads = h.loads;
    h.context.applyExpertRoute({ slug: 'qa-reader', page: 'home' });
    h.context.applyRoute(); h.context.showRequestedPage(); h.run(initRouting);
    assert.equal(h.loads, loads + 1, 'initialization may refresh public data without switching away'); h.assertLive();
    h.context.obStabilizePublicExpertExperience({}, {}); h.assertLive();
    h.run(legacyRouting); h.boot(); h.tick(9000); h.assertLive();
  });
  test('explicit link/popstate/direct navigation is permitted; unchanged later session reentry is not blocked', () => {
    for (const kind of ['link', 'popstate', 'direct', 'marketing-toolbar']) {
      const h = harness(); h.open();
      if (kind === 'link') h.context.pushAndApply('/home?expert=qa-reader');
      else if (kind === 'popstate') h.context.applyRoute({ type: 'popstate' });
      else if (kind === 'marketing-toolbar') h.context.switchView(1);
      else h.context.switchView(4);
      h.assertPublic(); assert.equal(h.context.obClientSurfaceOwnsRoute(), false);
      h.publicRefresh(); h.assertPublic();
      h.open(); h.assertLive(); h.publicRefresh(); h.assertLive();
    }
  });
  test('route changes invalidate protection; no lifecycle is restored by a public callback', () => {
    const h = harness(); h.open(); h.context.location.pathname = '/about';
    assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic();
  });
  test('same-principal credential rotation retains owner; account switch/logout clears it', () => {
    const h = harness(); h.open();
    h.context.OB_CLIENT_CONTEXT.install(jwt('client-a', 'client', 2)); h.publicRefresh(); h.assertLive();
    h.context.OB_CLIENT_CONTEXT.install(jwt('client-b')); assert.equal(h.context.obClientSurfaceOwnsRoute(), false);
    h.publicRefresh(); h.assertPublic();
    h.context.OB_CLIENT_CONTEXT.install(jwt()); h.open(); h.context.OB_CLIENT_CONTEXT.clear();
    assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic();
  });
  for (const [name, overrides, credential] of [
    ['foreign client', { client_id: 'client-b' }], ['foreign expert', { expert_id: 'expert-b' }],
    ['missing client id', { client_id: undefined }], ['synthetic fallback snapshot', { client_id: undefined, expert_id: undefined, status: undefined }],
    ['terminal snapshot without captured lifecycle', { status: 'ended' }], ['unknown status', { status: 'unknown' }],
    ['anonymous', {}, ''], ['expert identity', {}, jwt('client-a', 'expert')], ['opaque credential', {}, 'not-a-client-jwt'],
  ]) test(`${name} cannot acquire public-route priority`, () => {
    const h = harness({ credential: credential === undefined ? jwt() : credential }); h.open('chat', overrides);
    assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic();
  });
  test('stale globals, mismatched sid, expiry and changed expert cannot retain priority', () => {
    for (const invalidate of [
      h => { h.context._obActiveSessId = 'other-session'; h.context._sessId = 'other-session'; },
      h => { h.context._obClientSessionSnapshot = { id: 'session-a' }; },
      h => { h.setExpired(true); },
      h => { h.context._currentExpert = { user_id: 'expert-b', slug: 'other-reader' }; },
    ]) { const h = harness(); h.open(); invalidate(h); assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic(); }
    const h = harness(); h.context._obActiveSessId = 'stale'; h.context._sessId = 'stale';
    h.context.switchView(5); assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic();
  });
  test('owned ending and settling/terminal receipts remain selected after active IDs clear', () => {
    for (const channel of ['chat', 'voice', 'video']) for (const status of ['settling', 'ended', 'cancelled', 'failed']) {
      const h = harness(); h.open(channel); h.context._obClientEndingSid = 'session-a'; h.context._obSessionEnding = true;
      h.publicRefresh(); h.assertLive();
      h.context._obActiveSessId = null; h.context._sessId = null; h.context._obSessionHasEnded = true;
      h.context._obClientReceiptAuthorityState = { sid: 'session-a', snapshot: { ...h.context._obClientSessionSnapshot, status } };
      h.screen('screen-A5'); h.context.switchView(5); h.publicRefresh(); h.tick(9000); h.assertLive();
      h.context.switchView(4); h.publicRefresh(); h.assertPublic();
    }
  });
  test('foreign/mismatched/unowned receipt or ending state cannot retain priority', () => {
    for (const change of [
      receipt => { receipt.sid = 'different'; }, receipt => { receipt.snapshot.id = 'different'; },
      receipt => { receipt.snapshot.client_id = 'client-b'; }, receipt => { receipt.snapshot.expert_id = 'expert-b'; },
      receipt => { receipt.snapshot.status = 'active'; },
    ]) {
      const h = harness(); h.open(); const receipt = { sid: 'session-a', snapshot: { ...h.context._obClientSessionSnapshot, status: 'ended' } };
      change(receipt); h.context._obClientReceiptAuthorityState = receipt; h.context._obActiveSessId = null; h.context._sessId = null;
      h.screen('screen-A5'); assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic();
    }
    const h = harness(); h.open(); h.context._obClientEndingSid = 'other-session'; h.publicRefresh(); h.assertPublic();
  });
  test('anonymous/public-only boot and explicitly selected public pages retain baseline behavior', () => {
    for (const host of ['query', 'custom', 'subdomain']) {
      const h = harness({ host, credential: '' }); h.boot(); h.tick(9000); h.publicRefresh(); h.assertPublic();
      assert.equal(h.context.obClientSurfaceOwnsRoute(), false);
    }
  });
  test('plain application and expert delivery both release route-loading classes during owned lifecycle', () => {
    for (const delivery of [false, true]) {
      const h = harness({ delivery }); h.open();
      h.document.documentElement.classList.add('ob-route-loading', 'ob-public-loading');
      h.context._markRouteLoading('public'); h.context._markRouteReady('public'); h.publicRefresh(); h.assertLive();
      assert.equal(h.document.documentElement.classList.contains('ob-route-loading'), false);
      assert.equal(h.document.documentElement.classList.contains('ob-public-loading'), false);
      assert.equal(h.document.body.classList.contains('ownly-ready'), true);
    }
  });
}

if (!red) for (const host of ['query', 'custom', 'subdomain']) for (const channel of ['chat', 'voice', 'video']) for (const order of ['launch-first', 'public-first']) {
  test(`${host} ${channel}: exact normal launch ${order} owns PRESESS before a session id exists`, () => {
    const h = harness({ host });
    if (order === 'public-first') { h.boot(); h.tick(1000); h.publicRefresh(); }
    h.launch(channel); h.assertLive();
    assert.equal(h.nodes.get('screen-PRESESS').classList.contains('active'), true);
    assert.equal(h.context._obActiveSessId, undefined);
    assert.equal(h.context._obClientSessionSnapshot, undefined);
    if (order === 'launch-first') h.boot();
    for (const at of [1200, 3200, 5200, 7600, 9000, 12000]) { h.tick(at); h.publicRefresh(); h.assertLive(); }
    assert.equal(h.context.obClientSurfaceOwnsRoute(), true);
    assert.equal(h.document.documentElement.classList.contains('ob-route-loading'), false);
    assert.equal(h.document.documentElement.classList.contains('ob-public-loading'), false);
    assert.equal(h.nodes.has('ob-public-first-paint-shell'), false);
    assert.equal(h.requests.length, 0);
  });
}

if (!red && !prepRed) {
  test('normal launch keeps original return value and does not claim an unselected PRESESS surface', () => {
    const h = harness(); assert.equal(h.launch(), undefined);
    h.context.switchView(4); h.screen('screen-A4'); h.context.phoneGo = () => {};
    h.launch(); assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic();
    const generic = harness(); generic.screen('screen-PRESESS'); generic.context._pendingSessionScreen = 'A4';
    generic.context.switchView(5); assert.equal(generic.context.obClientSurfaceOwnsRoute(), false);
    generic.publicRefresh(); generic.assertPublic();
  });
  test('repeated switch5 retains prep and exact Begin delegates unchanged through its normal request gate', () => {
    for (const channel of ['chat', 'voice', 'video']) {
      const h = harness(); h.launch(channel); h.context.switchView(5); h.publicRefresh(); h.assertLive();
      assert.equal(h.context._beginSession, h.beginBeforeGuard, 'public guard must not replace Begin');
      h.allowRequest(); h.context._userClickedBegin = true; h.context._beginSession();
      assert.equal(h.requests.length, 1); assert.equal(h.requests[0].url, 'https://offline.example.invalid/api/sessions/request');
      assert.deepEqual(JSON.parse(h.requests[0].options.body), { expert_id: 'expert-a', channel, message: '', credit_mode: 'minute', payment_mode: 'minute' });
      assert.equal(h.nodes.get('ob-waiting-overlay').classList.contains('show'), true);
      assert.equal(h.context._userClickedBegin, false);
      h.tick(12000); h.publicRefresh(); h.assertLive();
      assert.equal(h.context.obClientSurfaceOwnsRoute(), true, 'request-in-flight has no sid yet');
    }
  });
  test('normal Begin authorization rejection is not bypassed by prep protection', () => {
    const h = harness(); h.launch(); const notices = [];
    h.context.OB_RATE_POLICY.requiresAuthorization = () => true;
    h.context.isReadyFor = () => false; h.context.currentExpertId = () => 'expert-a';
    h.context.configuredAuthorizationPhrase = () => 'test-only amount'; h.context.toast = text => notices.push(text);
    h.context._userClickedBegin = true; h.context._beginSession();
    assert.equal(h.requests.length, 0); assert.equal(h.context._userClickedBegin, false); assert.equal(notices.length, 1);
    h.publicRefresh(); h.assertLive();
  });
  test('canonical pending response and active switch5 upgrade prep, retaining owned receipt later', () => {
    for (const channel of ['chat', 'voice', 'video']) for (const promotion of ['passive-response', 'active-switch']) {
      const h = harness(); h.launch(channel);
      const snapshot = { id: 'session-a', client_id: 'client-a', expert_id: 'expert-a', channel, status: promotion === 'active-switch' ? 'active' : 'pending' };
      h.context._sessId = 'session-a'; h.context._obPendingSessId = 'session-a'; h.context._obClientSessionSnapshot = snapshot;
      if (promotion === 'active-switch') { h.context._obActiveSessId = 'session-a'; h.context.switchView(5); }
      h.publicRefresh(); h.assertLive();
      snapshot.status = 'active'; h.context._obActiveSessId = 'session-a'; h.context.switchView(5);
      h.screen({ chat: 'screen-A4', voice: 'screen-B3', video: 'screen-VID' }[channel]);
      h.publicRefresh(); h.tick(12000); h.assertLive();
      h.context._obActiveSessId = null; h.context._sessId = null; h.context._obPendingSessId = null;
      h.context._obSessionHasEnded = true; h.context._obClientReceiptAuthorityState = { sid: 'session-a', snapshot: { ...snapshot, status: 'ended' } };
      h.screen('screen-A5'); h.context.switchView(5); h.publicRefresh(); h.assertLive();
    }
  });
  test('fully validated new prep can replace an old receipt owner without reusing its session authority', () => {
    const h = harness(); h.open(); const snapshot = h.context._obClientSessionSnapshot;
    h.context._obActiveSessId = null; h.context._sessId = null; h.context._obSessionHasEnded = true;
    h.context._obClientReceiptAuthorityState = { sid: 'session-a', snapshot: { ...snapshot, status: 'ended' } };
    h.screen('screen-A5'); h.context.switchView(5); assert.equal(h.context.obClientSurfaceOwnsRoute(), true);
    h.launch('video'); h.publicRefresh(); h.assertLive();
    assert.equal(h.context.obClientSurfaceOwnsRoute(), true);
    h.screen('screen-A5'); assert.equal(h.context.obClientSurfaceOwnsRoute(), false, 'new prep does not inherit old receipt');
  });
  test('old owned terminal receipt permits only selected new pending prep until normal accepted-session reset', () => {
    for (const channel of ['chat', 'voice', 'video']) {
      const h = harness(); h.open(channel); const old = h.context._obClientSessionSnapshot;
      h.context._obActiveSessId = null; h.context._sessId = null; h.context._obSessionHasEnded = true;
      h.context._obClientReceiptAuthorityState = { sid: 'session-a', snapshot: { ...old, status: 'ended' } };
      h.screen('screen-A5'); h.context.switchView(5); h.launch(channel);
      h.context._sessId = 'session-b'; h.context._obPendingSessId = 'session-b';
      h.context._obClientSessionSnapshot = { ...old, id: 'session-b', status: 'pending' };
      h.context.switchView(5); h.publicRefresh(); h.tick(12000); h.assertLive();
      assert.equal(h.context._obSessionHasEnded, true, 'UI guard must not reset lifecycle flags');
      h.screen('screen-A4'); assert.equal(h.context.obClientSurfaceOwnsRoute(), false, 'no canonical promotion while old ended flag remains');
      h.screen('screen-PRESESS'); h.launch(channel);
      h.context.obRememberSessionResume('session-b', 'client');
      assert.equal(h.context._obSessionHasEnded, false, 'existing exact resume helper owns reset');
      h.context._obClientSessionSnapshot.status = 'active'; h.context._obActiveSessId = 'session-b';
      h.context.switchView(5); h.screen({ chat: 'screen-A4', voice: 'screen-B3', video: 'screen-VID' }[channel]);
      h.publicRefresh(); h.assertLive();
    }
  });
  test('old receipt exception rejects foreign, same-session, mismatched and nonterminal receipt authority', () => {
    for (const mutate of [
      r => { r.sid = 'session-b'; r.snapshot.id = 'session-b'; }, r => { r.snapshot.id = 'wrong'; },
      r => { r.snapshot.client_id = 'client-b'; }, r => { r.snapshot.expert_id = 'expert-b'; },
      r => { r.snapshot.status = 'active'; }, r => { r.snapshot.status = 'settling'; },
      r => { r.sid = ''; }, r => { r.snapshot = {}; },
    ]) {
      const h = harness(); h.launch(); h.context._obSessionHasEnded = true;
      h.context._sessId = 'session-b'; h.context._obPendingSessId = 'session-b';
      h.context._obClientSessionSnapshot = { id: 'session-b', client_id: 'client-a', expert_id: 'expert-a', channel: 'chat', status: 'pending' };
      const receipt = { sid: 'session-a', snapshot: { id: 'session-a', client_id: 'client-a', expert_id: 'expert-a', channel: 'chat', status: 'ended' } };
      mutate(receipt); h.context._obClientReceiptAuthorityState = receipt;
      assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic();
    }
  });
  test('prep fails closed when principal, route, expert or selected/Begin channel changes during normal launch', () => {
    for (const change of [
      c => c.OB_CLIENT_CONTEXT.install(jwt('client-b')), c => c.OB_CLIENT_CONTEXT.clear(),
      c => { c.location.pathname = '/about'; },
      c => { c._currentExpert = { user_id: 'expert-b', slug: 'other' }; c._currentExpertId = 'expert-b'; },
      c => { c.selectedChannel = { id: 'voice', name: 'Voice', price: '$0.00/min' }; c._obPendingChannel = 'voice'; },
      c => { c._obPendingChannel = 'voice'; }, c => { c._currentExpertId = 'expert-b'; },
    ]) {
      const h = harness(); h.setLaunchHook(change); h.launch();
      assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic();
    }
  });
  test('anonymous, expert, opaque, expired and unsupported-channel launch cannot acquire prep priority', () => {
    for (const credential of ['', jwt('client-a', 'expert'), 'opaque']) {
      const h = harness({ credential }); h.launch(); assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic();
    }
    for (const [prepare, channel] of [[h => h.setExpired(true), 'chat'], [h => { h.context._currentExpert = {}; }, 'chat'], [h => {}, 'unsupported']]) {
      const h = harness(); prepare(h); h.launch(channel); assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic();
    }
  });
  test('stale, foreign, mismatched or terminal pending/active ids cannot be rescued by prep', () => {
    for (const stage of ['before-launch', 'after-launch']) for (const change of [
      c => { c._sessId = 'stale'; },
      c => { c._obClientSessionSnapshot.client_id = 'client-b'; },
      c => { c._obClientSessionSnapshot.expert_id = 'expert-b'; },
      c => { c._obClientSessionSnapshot.channel = 'voice'; },
      c => { c._obClientSessionSnapshot.status = 'ended'; },
      c => { c._obClientSessionSnapshot = { id: 'session-a' }; },
      c => { c._obActiveSessId = 'other'; },
      c => { c._pendingSid = 'other'; },
      c => { c._obSessionHasEnded = true; }, c => { c._obClientEndingSid = 'session-a'; },
    ]) {
      const h = harness(); if (stage === 'after-launch') h.launch();
      h.context._sessId = 'session-a'; h.context._obPendingSessId = 'session-a';
      h.context._obClientSessionSnapshot = { id: 'session-a', client_id: 'client-a', expert_id: 'expert-a', channel: 'chat', status: 'pending' };
      change(h.context); if (stage === 'before-launch') h.launch();
      assert.equal(h.context.obClientSurfaceOwnsRoute(), false); h.publicRefresh(); h.assertPublic();
    }
  });
  test('prep releases on cancel, explicit navigation, logout, route/expert/channel changes or leaving PRESESS', () => {
    for (const leave of [
      h => h.context.switchView(4), h => h.context.switchView(1),
      h => h.context.pushAndApply('/home?expert=qa-reader'), h => h.context.applyRoute({ type: 'popstate' }),
      h => h.context.OB_CLIENT_CONTEXT.clear(), h => h.context.OB_CLIENT_CONTEXT.install(jwt('client-b')),
      h => { h.context.location.pathname = '/about'; }, h => { h.context._currentExpert = { id: 'expert-b' }; },
      h => { h.context.selectedChannel.id = 'voice'; }, h => { h.context._obPendingChannel = 'voice'; },
      h => h.screen('screen-A4'), h => h.setExpired(true),
    ]) {
      const h = harness(); h.launch(); leave(h); assert.equal(h.context.obClientSurfaceOwnsRoute(), false);
      h.publicRefresh(); h.assertPublic();
    }
    const h = harness(); h.launch(); h.context.OB_CLIENT_CONTEXT.install(jwt('client-a', 'client', 2)); h.publicRefresh(); h.assertLive();
    h.context.selectedChannel.id = 'voice'; assert.equal(h.context.obClientSurfaceOwnsRoute(), false);
    h.context.selectedChannel.id = 'chat'; assert.equal(h.context.obClientSurfaceOwnsRoute(), false, 'invalidated prep does not resurrect');
  });
}
