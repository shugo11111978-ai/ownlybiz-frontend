import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function functionDeclaration(name) {
  const start = html.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} is present`);
  const open = html.indexOf('{', start);
  assert(open >= 0, `${name} has a body`);
  let depth = 0;
  for (let index = open; index < html.length; index += 1) {
    if (html[index] === '{') depth += 1;
    else if (html[index] === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(start, index + 1);
    }
  }
  assert.fail(`${name} has a complete body`);
}

const connectTrustStart = html.indexOf('\t  function safeStripeDashboardUrl(value){');
const connectTrustEnd = html.indexOf('\t  function setExpertStripeAction(state,data){', connectTrustStart);
assert(connectTrustStart >= 0 && connectTrustEnd > connectTrustStart,
  'expert Connect trust helpers have a bounded runtime section');
const stripeInfoSandbox = {
  Object,
  URL,
  window: null,
  location: { origin: 'https://staging.example.test' },
  __OB_TEST_HOOKS__: {},
};
stripeInfoSandbox.window = stripeInfoSandbox;
vm.createContext(stripeInfoSandbox);
new vm.Script(html.slice(connectTrustStart, connectTrustEnd), {
  filename: 'expert-connect-trust.js',
}).runInContext(stripeInfoSandbox);
new vm.Script(functionDeclaration('stripeInfo'), {
  filename: 'expert-stripe-info.js',
}).runInContext(stripeInfoSandbox);
new vm.Script(functionDeclaration('billingConnectReady'), {
  filename: 'billing-connect-trust.js',
}).runInContext(stripeInfoSandbox);

const connectTrust = stripeInfoSandbox.__OB_TEST_HOOKS__.expertConnectTrust;
assert(connectTrust, 'expert Connect trust hooks are exposed');
const canonicalV2Ready = {
  connected: true,
  charges_enabled: false,
  payouts_enabled: false,
  details_submitted: false,
  paid_sessions_ready: true,
  expert_share_transfer_ready: true,
  account_namespace: 'v2',
  recipient_transfers_status: 'active',
  connect_balance_status: 'not_included',
  connect_bank_payouts_status: 'not_included',
};
assert.equal(connectTrust.isReady(canonicalV2Ready), true,
  'Accounts v2 recipient-transfer readiness wins over unrelated legacy booleans');
assert.equal(stripeInfoSandbox.billingConnectReady(canonicalV2Ready), true,
  'billing surfaces use the same canonical v2 readiness decision');

for (const [label, value] of [
  ['legacy connected-only response', { connected: true, charges_enabled: true, payouts_enabled: true }],
  ['partial canonical response', { ...canonicalV2Ready, connect_bank_payouts_status: undefined }],
  ['disconnected canonical response', { ...canonicalV2Ready, connected: false }],
  ['contradictory paid-session response', { ...canonicalV2Ready, paid_sessions_ready: false }],
  ['contradictory transfer response', { ...canonicalV2Ready, expert_share_transfer_ready: false }],
  ['pending response', { ...canonicalV2Ready, pending: true }],
  ['restricted recipient transfers', { ...canonicalV2Ready, recipient_transfers_status: 'restricted' }],
  ['provider error response', { ...canonicalV2Ready, error: 'provider_unavailable' }],
  ['invalid namespace', { ...canonicalV2Ready, account_namespace: 'v3' }],
  ['invalid recipient-transfer state', { ...canonicalV2Ready, recipient_transfers_status: 'ready' }],
  ['invented balance state', { ...canonicalV2Ready, connect_balance_status: 'available' }],
]) {
  assert.equal(connectTrust.isReady(value), false, `${label} fails closed`);
  assert.equal(stripeInfoSandbox.billingConnectReady(value), false,
    `${label} also fails closed in billing surfaces`);
}
assert.equal(connectTrust.state({ ...canonicalV2Ready, recipient_transfers_status: 'restricted' }), 'pending',
  'restricted recipient transfers render as incomplete setup, never Ready');
assert.equal(connectTrust.state({ ...canonicalV2Ready, error: 'provider_unavailable' }), 'unknown',
  'provider failures render as unavailable, never disconnected or Ready');
assert.equal(connectTrust.safeDashboardUrl('https://dashboard.stripe.com/test/connect/accounts'),
  'https://dashboard.stripe.com/test/connect/accounts');
for (const unsafeUrl of [
  'http://dashboard.stripe.com/test/connect/accounts',
  'https://dashboard.stripe.com.evil.example/test/connect/accounts',
  'javascript:alert(1)',
  '/admin/fake-stripe-dashboard',
]) {
  assert.equal(connectTrust.safeDashboardUrl(unsafeUrl), '', `unsafe Stripe Dashboard URL is rejected: ${unsafeUrl}`);
}

assert.deepEqual(
  JSON.parse(JSON.stringify(stripeInfoSandbox.stripeInfo({
    user: { stripe_connect_pending: true },
    profile: {},
    billing: {},
    stripe: null,
  }))),
  { ready: false, connected: false, pending: true, state: 'unknown' },
  'expert Stripe status safely reads the user pending fallback without an undeclared identifier',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(stripeInfoSandbox.stripeInfo({
    user: {},
    profile: {},
    billing: { stripe_connect: {} },
    stripe: canonicalV2Ready,
  }))),
  { ready: true, connected: true, pending: false, state: 'connected' },
  'expert Stripe status exposes canonical paid-session readiness without trusting legacy booleans',
);

const revenueStart = html.indexOf('  async function renderRevenue(){');
const revenueEnd = html.indexOf('\n\n  async function renderPayouts(){', revenueStart);
assert(revenueStart >= 0 && revenueEnd > revenueStart, 'canonical admin revenue renderer is present');
const revenueSource = html.slice(revenueStart, revenueEnd);
for (const label of [
  'Gross captured · last 30 days',
  'Refunded · last 30 days',
  'Net client revenue · last 30 days',
  'Platform fees · last 30 days',
  'Recorded expert share · last 30 days',
  'Ended sessions · last 30 days',
]) {
  assert.match(revenueSource, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `${label} is explicitly period-labeled`);
}
assert.match(revenueSource, /By channel <span class="admin-card-title-sub">All time<\/span>/,
  'channel breakdown is explicitly labeled all time');
assert.match(revenueSource, /Top experts <span class="admin-card-title-sub">All time<\/span>/,
  'expert breakdown is explicitly labeled all time');
assert.match(revenueSource, /do not compare them directly with the 30-day cards/,
  'mixed backend periods are explained instead of presented as one period');

assert.doesNotMatch(html, /Revenue This Month/i,
  'expert dashboard no longer labels all-time earnings as monthly revenue');
assert.match(html, /<div class="kpi-label">All-time earnings<\/div>/);
assert.match(html, /if\(lbl\.includes\('all-time earnings'\)\)/,
  'expert earnings renderer targets the truthful all-time label');
assert.match(html, /<div class="kpi-label">Stripe bank payout status<\/div>[\s\S]*?<div class="kpi-value"[^>]*>Check Stripe<\/div>/,
  'the second expert KPI is a provider boundary instead of a duplicated earnings amount');
assert.match(html, /Balance, eligibility, timing, and history are not mirrored here/,
  'expert UI does not infer connected-account balance or bank-payout state');

const staticAdminStart = html.indexOf('<!-- ========== ADMIN OVERVIEW ========== -->');
const staticAdminEnd = html.indexOf('<!-- ========== EXPERTS PANEL ========== -->', staticAdminStart);
assert(staticAdminStart >= 0 && staticAdminEnd > staticAdminStart, 'static admin overview is bounded');
const staticAdminOverview = html.slice(staticAdminStart, staticAdminEnd);
for (const id of ['kpi-total-experts', 'kpi-gross-revenue', 'kpi-platform-revenue', 'kpi-active-sessions']) {
  assert.match(staticAdminOverview, new RegExp(`id="${id}">—<`),
    `${id} starts unknown until authoritative data loads`);
}
assert.match(staticAdminOverview, /Loading authoritative sign-up data…/,
  'recent signups start as an explicit loading state');
assert.doesNotMatch(staticAdminOverview, /\+234 this week|\+22% vs last month|7,708|Raj Kumar|Maya Levi/,
  'the initial admin dashboard has no live-looking sample growth, tier, or signup data');
assert.match(html, /Live production health and business snapshot/,
  'the production admin header identifies the environment truthfully');
assert.match(html, /Loading live production data/,
  'production loaders identify their environment truthfully');
assert.match(html, /Changes affect production/,
  'the production settings surface states the impact boundary explicitly');
assert.doesNotMatch(html, /Live staging health and business snapshot|Loading live staging data|Changes affect staging/,
  'the production admin surface contains no staging-environment claims');

const adminLoadingStart = html.indexOf('  function setContent(panel, html){');
const adminLoadingEnd = html.indexOf('\n  function errorBox(err){', adminLoadingStart);
assert(adminLoadingStart >= 0 && adminLoadingEnd > adminLoadingStart,
  'live admin content and refresh handling have a bounded runtime section');
const adminLoadingSource = html.slice(adminLoadingStart, adminLoadingEnd);
assert.match(adminLoadingSource, /node\.dataset\.obLiveRendered = '1'/,
  'a completed live render is recorded before later refreshes');
assert.match(adminLoadingSource, /if\(node\.dataset\.obLiveRendered === '1'\)[\s\S]*?node\.setAttribute\('aria-busy','true'\)[\s\S]*?return;/,
  'refreshing an already-rendered admin panel preserves its content height and scroll position');
assert.doesNotMatch(adminLoadingSource, /function loading\(panel\)\{\s*setContent\(/,
  'a refresh cannot replace established admin content with a short loading placeholder');

const adminNavScrollStart = html.indexOf('  function allowAdminScrollReset(){', adminLoadingEnd);
const adminNavScrollEnd = html.indexOf('\n  async function copyText(text){', adminNavScrollStart);
assert(adminNavScrollStart >= 0 && adminNavScrollEnd > adminNavScrollStart,
  'admin navigation scroll handling has a bounded runtime section');
const adminNavScrollSource = html.slice(adminNavScrollStart, adminNavScrollEnd);
assert.match(adminNavScrollSource, /window\.__obAdminAllowScrollResetUntil = Date\.now\(\) \+ 50;\s*resetAdminScroll\(\);/,
  'an intentional navigation resets scroll immediately before the user can scroll');
assert.doesNotMatch(adminNavScrollSource, /setTimeout\(function\(\)\{\s*resetAdminScroll\(\);\s*\},\s*260\)/,
  'no delayed navigation reset can pull the dashboard upward after the user starts scrolling');

const authStart = html.indexOf('\t  function stripeAdminAuthContext(scope){');
const authEndMarker = '  window.loadAdminPaymentSettings = loadStripeSettings;';
const authEnd = html.indexOf(authEndMarker, authStart);
assert(authStart >= 0 && authEnd > authStart, 'Stripe admin settings authority runtime is present');
const authSource = html.slice(authStart, authEnd + authEndMarker.length);
assert.match(authSource, /OB_CLIENT_CONTEXT/,
  'Stripe settings authority comes from the current authenticated client context');
assert.doesNotMatch(authSource, /JSON\.parse\(sessionStorage\.getItem\('ob_u'/,
  'Stripe settings do not trust a potentially stale stored role');
assert.match(authSource, /setStripeSettingsControlsEnabled\(false\)/,
  'Stripe controls fail closed while loading and on errors');
assert.match(authSource, /Platform Admin access is required to view or change Stripe settings/,
  'non-admin access gets an explicit terminal state instead of an endless Loading state');

const liveAdminStart = html.indexOf('  function adminAuthContext(scope){');
const liveAdminEnd = html.indexOf('\n  function base(){', liveAdminStart);
assert(liveAdminStart >= 0 && liveAdminEnd > liveAdminStart,
  'live admin renderer has a bounded authenticated-context authority helper');
const liveAdminAuthSource = html.slice(liveAdminStart, liveAdminEnd);
assert.match(liveAdminAuthSource, /OB_CLIENT_CONTEXT/);
assert.match(liveAdminAuthSource, /isCurrent\(captured,\{exactCredential:true\}\)/,
  'session-authorization admin access uses the current exact credential');
assert.doesNotMatch(liveAdminAuthSource, /sessionStorage\.getItem\('ob_u'\)/,
  'session-authorization access cannot be denied by stale stored profile data');

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.placeholder = '';
    this.disabled = false;
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.parentElement = null;
    this.previousElementSibling = null;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
  }
  addEventListener(name, handler) { this.listeners.set(name, handler); }
  setAttribute(name, value) { this.attributes.set(String(name), String(value)); }
  getAttribute(name) { return this.attributes.get(String(name)) ?? null; }
  querySelector() { return null; }
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function makeHarness({ role = 'admin', responseFactory } = {}) {
  let identity = { token: 'jwt-admin-current', role, principal: `principal-${role}`, generation: 1 };
  const controls = [
    'stripe-environment', 'stripe-secret-key', 'stripe-pub-key', 'stripe-webhook-secret',
    'stripe-connect-webhook-secret', 'ob-stripe-test', 'ob-stripe-save',
    'ob-stripe-config-toggle', 'passkey-register', 'passkey-verify',
  ].map((id) => new FakeElement(id));
  const nodes = Object.fromEntries(controls.map((node) => [node.id, node]));
  for (const id of ['stripe-status-badge', 'stripe-account-info', 'stripe-test-result']) {
    nodes[id] = new FakeElement(id);
  }
  const panelControls = controls.filter((node) => node.id !== 'ob-stripe-config-toggle');
  const document = {
    getElementById(id) { return nodes[id] || null; },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === '#ob-stripe-config-toggle') return [nodes['ob-stripe-config-toggle']];
      if (selector.startsWith('#stripe-config-panel ')) return panelControls;
      return [];
    },
  };
  const calls = [];
  const contextApi = {
    capture(scope) { return identity.token ? { ...identity, scope } : { ...identity, token: '' }; },
    isCurrent(owner, options = {}) {
      return !!owner && !!identity.token && owner.principal === identity.principal &&
        owner.generation === identity.generation && (!options.exactCredential || owner.token === identity.token);
    },
  };
  const sandbox = {
    window: null,
    document,
    OB_CLIENT_CONTEXT: contextApi,
    API: 'https://api.example.test/api',
    fetch(url, options) {
      calls.push({ url, options });
      return Promise.resolve((responseFactory || (() => response(200, {
        settings: {
          stripe_mode: 'test', stripe_active_configured: true, stripe_test_configured: true,
          stripe_test_secret_key: 'sk_test_••••', stripe_test_publishable_key: 'pk_test_example',
          stripe_test_webhook_secret: 'whsec_platform_masked',
          stripe_test_connect_webhook_secret: 'whsec_connect_masked',
        },
      })))(calls.length - 1));
    },
    refreshStripeStepUpStatus() { return Promise.resolve(null); },
    sessionStorage: { getItem() { return null; } },
    localStorage: { getItem() { return null; } },
    console,
    Promise,
    Object,
    String,
    Number,
    Array,
    Error,
    encodeURIComponent,
    setTimeout,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  new vm.Script(authSource, { filename: 'admin-stripe-settings-authority.js' }).runInContext(sandbox);
  return {
    sandbox, nodes, controls, calls,
    setIdentity(next) { identity = { ...identity, ...next }; },
  };
}

const admin = makeHarness();
const adminSettings = await admin.sandbox.loadAdminPaymentSettings();
assert.equal(admin.calls.length, 1, 'a current admin loads settings once');
assert.equal(admin.calls[0].options.headers.Authorization, 'Bearer jwt-admin-current');
assert.equal(adminSettings.stripe_mode, 'test');
assert.equal(admin.sandbox.__obStripeSettingsLoadState.state, 'ready');
assert.equal(admin.sandbox.__obStripeSettingsLoadState.trusted, true);
assert(admin.controls.every((control) => control.disabled === false),
  'controls unlock only after the authenticated admin response succeeds');
assert.doesNotMatch(admin.nodes['stripe-status-badge'].textContent + admin.nodes['stripe-status-badge'].innerHTML, /Loading/i);

const expert = makeHarness({ role: 'expert' });
const expertResult = await expert.sandbox.loadAdminPaymentSettings();
assert.equal(expertResult, null);
assert.equal(expert.calls.length, 0, 'a non-admin cannot request Stripe settings');
assert.equal(expert.sandbox.__obStripeSettingsLoadState.state, 'forbidden');
assert.equal(expert.sandbox.__obStripeSettingsLoadState.trusted, false);
assert(expert.controls.every((control) => control.disabled === true));
assert.match(expert.nodes['stripe-account-info'].textContent, /Platform Admin access is required/);

const failed = makeHarness({ responseFactory: () => response(503, { error: 'settings temporarily unavailable' }) });
assert.equal(await failed.sandbox.loadAdminPaymentSettings(), null);
assert.equal(failed.sandbox.__obStripeSettingsLoadState.state, 'error');
assert.equal(failed.sandbox.__obStripeSettingsLoadState.trusted, false);
assert(failed.controls.every((control) => control.disabled === true),
  'a settings API failure never leaves mutation controls enabled');
assert.match(failed.nodes['stripe-account-info'].textContent, /settings temporarily unavailable/);

let releaseSlowResponse;
const slowResponse = new Promise((resolve) => { releaseSlowResponse = resolve; });
const changed = makeHarness({ responseFactory: () => slowResponse });
const staleLoad = changed.sandbox.loadAdminPaymentSettings();
changed.setIdentity({ token: 'jwt-other-admin', principal: 'principal-other', generation: 2 });
releaseSlowResponse(response(200, { settings: { stripe_mode: 'live', stripe_active_configured: true } }));
assert.equal(await staleLoad, null);
assert.equal(changed.sandbox.__obStripeSettingsLoadState.trusted, false,
  'a response from a previous principal cannot unlock Stripe controls');
assert(changed.controls.every((control) => control.disabled === true));

console.log('admin payment trust runtime regression: PASS');
