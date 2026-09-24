import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const baseline = process.argv.includes('--baseline');
const html = baseline
  ? execFileSync('git', ['show', '34904d74f359859aff93a2d145bf52f30c4f979c:index.html'], {cwd: new URL('..', import.meta.url), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024})
  : fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf(baseline ? '    window.handleMarketingLogin = async function() {' : '    window.obLoginReturnPath = function(value, role) {');
const end = html.indexOf('  </script>', start);
assert(start >= 0 && end > start);
const nativeLogin = html.slice(start, end);

function harness({role = 'expert', next = '/admin/experts', search = '', dashboardStatus = 200} = {}) {
  const stored = new Map(next ? [['ob_next', next]] : []);
  const qa = {redirects: [], dashboardLoads: [], views: [], requests: [], toasts: [], current: true};
  const timers = [];
  const user = {id: 'signed-in-owner', role, name: 'Expert'};
  const nodes = {
    'mkt-login-email': {value: 'expert@example.invalid'},
    'mkt-login-pass': {value: 'test-password'},
    'mkt-login-btn': {textContent: 'Sign In', disabled: false},
    'mkt-login-error': {textContent: '', style: {}}
  };
  const location = {
    origin: 'https://ownlybiz.com', pathname: '/login', search,
    assign(path) { qa.redirects.push(path); }
  };
  Object.defineProperty(location, 'href', {
    set(path) { qa.redirects.push(path); },
    get() { return location.origin + location.pathname + location.search; }
  });
  const history = {replaceState(_state, _title, path) {
    const url = new URL(path, location.origin);
    location.pathname = url.pathname;
    location.search = url.search;
    qa.redirects.push(path);
  }};
  const ctx = {
    console: {log() {}, error() {}}, URL, URLSearchParams, location, history,
    document: {getElementById: id => nodes[id] || null},
    sessionStorage: {
      getItem: key => stored.get(key) || null,
      setItem: (key, value) => stored.set(key, String(value)),
      removeItem: key => stored.delete(key)
    },
    localStorage: {setItem() {}, removeItem() {}},
    setTimeout(fn, delay) { timers.push({fn, delay}); },
    obBeginAuthAttempt: () => ({}),
    obAuthAttemptCurrent: () => qa.current,
    obCommitAuthAttempt: (_attempt, token, account) => {
      stored.set('ob_t', token);
      stored.set('ob_u', JSON.stringify(account));
      return {token};
    },
    switchView: view => qa.views.push(view),
    loadDashboard: slug => qa.dashboardLoads.push(slug),
    obShowSignupCheckoutReturn() {},
    toast: message => qa.toasts.push(message),
    OwnlyAPI: {_setReady() {}},
    fetch: async (url, options = {}) => {
      qa.requests.push({url, method: options.method || 'GET'});
      if(url.endsWith('/auth/login')) return {ok: true, status: 200, json: async () => ({token: 'new-token', user})};
      if(url.endsWith('/billing/me')) return {ok: true, status: 200, json: async () => ({current_plan: {id: 'pro'}})};
      assert(url.endsWith('/experts/me/dashboard'), `Unexpected request: ${url}`);
      return {ok: dashboardStatus === 200, status: dashboardStatus, json: async () => dashboardStatus === 200
        ? {profile: {slug: 'own-expert'}} : {code: 'signup_incomplete', error: 'Complete your checkout'}};
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(nativeLogin, ctx);
  return {ctx, qa, stored, nodes, async login({invalidateBeforeNavigation = false} = {}) {
    await ctx.handleMarketingLogin();
    if(invalidateBeforeNavigation) qa.current = false;
    while(timers.length) {
      timers.shift().fn();
      await new Promise(resolve => setImmediate(resolve));
    }
    await new Promise(resolve => setImmediate(resolve));
  }};
}

if(baseline) {
  const h = harness({next: '/admin/experts'});
  await h.login();
  assert.deepEqual(h.qa.redirects, ['/admin/experts']);
  assert.equal(h.qa.dashboardLoads.length, 0);
  console.log(JSON.stringify({status: 'REGRESSION_REPRODUCED', sourceCommit: '34904d74f359859aff93a2d145bf52f30c4f979c', externalRequests: 0, result: 'Successful expert login follows stale Admin return instead of opening expert dashboard'}));
  process.exit(0);
}

// The reported case: a protected Admin visit leaves ob_next in an anonymous
// tab; a successful expert sign-in must open that expert's dashboard once.
for(const next of ['/admin/experts', '/admin/platform-payments', '/%61dmin/experts', '/dash/../admin/experts']) {
  const h = harness({next});
  await h.login();
  assert.deepEqual(h.qa.redirects, ['/dash/own-expert']);
  assert.deepEqual(h.qa.dashboardLoads, ['own-expert']);
  assert.equal(h.stored.has('ob_next'), false);
  assert.equal(h.stored.get('ob_t'), 'new-token');
  assert.equal(h.qa.toasts.filter(text => text.startsWith('Welcome back')).length, 1);
  assert.equal(h.nodes['mkt-login-btn'].disabled, false);
}

for(const [role, next] of [
  ['admin', '/admin/experts?expert=selected'],
  ['admin', '/dash/own-expert/settings/billing'],
  ['expert', '/dash/own-expert/sessions?status=scheduled#upcoming'],
  ['expert', '/dash/other-expert/overview'], // Existing dashboard owner verification remains authoritative.
  ['expert', '/dashboard/billing?billing=success&session_id=checkout-session'],
  ['expert', '/signup?resume=1&billing=cancelled&checkout_plan=pro'],
  ['client', '/group/room-123?join=1'],
  ['client', '/own-expert/book?booking=booking-123']
]) {
  const h = harness({role, next});
  await h.login();
  assert.deepEqual(h.qa.redirects, [next], `${role} return to ${next}`);
  assert.equal(h.stored.has('ob_next'), false);
  assert.equal(h.qa.dashboardLoads.length, 0);
}

for(const next of ['/admin/experts', '/dash/own-expert', '/dashboard/billing', '/signup?resume=1']) {
  const h = harness({role: 'client', next});
  await h.login();
  assert.equal(h.qa.redirects.length, 0);
  assert.deepEqual(h.qa.views, [4]);
  assert.equal(h.stored.has('ob_next'), false);
}

for(const next of [
  'https://elsewhere.invalid/admin', 'https://ownlybiz.com/admin', '//elsewhere.invalid/path',
  '/\\elsewhere.invalid/path', '/\n/admin', '/%5celsewhere.invalid', '/%0aadmin',
  '/%2felsewhere.invalid', '/%2561dmin/experts', '/%zz',
  '/login', '/login?resume=signup', '/%6cogin', '/logout', '/auth/login', '/api/auth/login'
]) {
  const h = harness({next});
  await h.login();
  assert.deepEqual(h.qa.redirects, ['/dash/own-expert'], `Rejected destination: ${JSON.stringify(next)}`);
  assert.deepEqual(h.qa.dashboardLoads, ['own-expert']);
  assert.equal(h.stored.has('ob_next'), false);
}

{
  const h = harness({next: '', search: '?resume=signup'});
  await h.login();
  assert.deepEqual(h.qa.redirects, ['/signup?resume=1']);
  assert.equal(h.stored.has('ob_next'), false);
  assert.equal(h.qa.dashboardLoads.length, 0);
}
{
  const h = harness({next: '/admin/experts', dashboardStatus: 403});
  await h.login();
  assert.deepEqual(h.qa.redirects, ['/signup?resume=1']);
  assert.equal(h.stored.has('ob_next'), false);
}
{
  const h = harness({role: 'admin', next: '/signup?resume=1', search: '?resume=signup'});
  await h.login();
  assert.equal(h.stored.has('ob_t'), false);
  assert.equal(h.stored.get('ob_next'), '/signup?resume=1');
  assert.equal(h.qa.redirects.length, 0);
  assert.match(h.nodes['mkt-login-error'].textContent, /expert account/);
}
{
  const h = harness({next: '/admin/experts'});
  await h.login({invalidateBeforeNavigation: true});
  assert.equal(h.qa.redirects.length, 0, 'a superseded login cannot navigate');
  assert.equal(h.stored.get('ob_next'), '/admin/experts', 'a superseded login cannot consume another login return');
}

console.log(JSON.stringify({status: 'PASS', externalRequests: 0, checks: [
  'stale Admin return is consumed and expert opens own dashboard after successful login',
  'compatible Admin/expert returns and signup/billing query parameters preserved',
  'client group and booking return preserved; protected returns rejected',
  'external, malformed, encoded and authentication-loop destinations rejected',
  'incomplete expert still resumes checkout; wrong-role and superseded attempts stay guarded'
]}));
