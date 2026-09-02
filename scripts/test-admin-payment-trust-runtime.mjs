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

const stripeInfoSandbox = { Object };
vm.createContext(stripeInfoSandbox);
new vm.Script(functionDeclaration('stripeInfo'), {
  filename: 'expert-stripe-info.js',
}).runInContext(stripeInfoSandbox);
assert.deepEqual(
  JSON.parse(JSON.stringify(stripeInfoSandbox.stripeInfo({
    user: { stripe_connect_pending: true },
    profile: {},
    billing: {},
    stripe: null,
  }))),
  { connected: false, pending: true },
  'expert Stripe status safely reads the user pending fallback without an undeclared identifier',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(stripeInfoSandbox.stripeInfo({
    user: {},
    profile: { stripe_connect_pending: true },
    billing: { stripe_connect: { connected: false } },
    stripe: { connected: true },
  }))),
  { connected: true, pending: true },
  'expert Stripe status combines the direct connection truth with the profile pending fallback',
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
assert.match(html, /fmt\$\(dash\.recorded_expert_share\|\|0\)/,
  'recorded expert share uses its dedicated backend field instead of duplicating total earnings');

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
