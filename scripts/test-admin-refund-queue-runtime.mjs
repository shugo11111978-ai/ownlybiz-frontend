import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const apiStart = html.indexOf('  function api(path, opts){', html.indexOf("var API_ROOT = (window.OWNLYBIZ_API_URL"));
const apiEnd = html.indexOf('\n  function statusLabel', apiStart);
assert(apiStart >= 0 && apiEnd > apiStart, 'admin refund API helper is present');
const apiSource = html.slice(apiStart, apiEnd);
assert.match(apiSource, /if\(opts\.cache\) requestOptions\.cache = opts\.cache;/,
  'admin refund API helper forwards an explicit fetch cache policy');
const paymentsRendererStart = html.indexOf('  async function renderPlatformPayments(){');
const paymentsRendererEnd = html.indexOf('\n\n  function renderConnectors(){', paymentsRendererStart);
assert(paymentsRendererStart >= 0 && paymentsRendererEnd > paymentsRendererStart,
  'live Platform Payments renderer is present');
const paymentsRendererSource = html.slice(paymentsRendererStart, paymentsRendererEnd);
assert.match(paymentsRendererSource, /var generation = \+\+platformPaymentsRenderGeneration;/,
  'each Platform Payments renderer owns a monotonic generation');
assert.match(paymentsRendererSource, /\? await window\.obAdminLoadRefundQueue\(\)/,
  'the Platform Payments renderer awaits its final refund-queue refresh');
assert.match(html, /window\.loadAdminPlatformPayments = renderPlatformPayments;/,
  'the awaitable generation-owned renderer remains exposed through the live loader');

const paymentsRendererStateStart = html.indexOf('  var platformPaymentsRenderGeneration = 0;');
assert(paymentsRendererStateStart >= 0 && paymentsRendererStateStart < paymentsRendererStart,
  'Platform Payments render ownership state is present');
const paymentsRendererRuntimeSource = html.slice(paymentsRendererStateStart, paymentsRendererEnd);

const feeRequests = [];
const rendererQueueRefreshes = [];
let rendererContent = '';
function rendererDeferred(target) {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  target.push({ promise, resolve, reject });
  return promise;
}
const rendererSandbox = {
  window: null,
  api(path) {
    assert.equal(path, '/admin/fees');
    return rendererDeferred(feeRequests);
  },
  loading() { rendererContent = 'loading'; },
  setContent(_panel, value) { rendererContent = String(value); },
  note(value) { return `note:${value}`; },
  card(label, value) { return `card:${label}:${value}`; },
  num(value) { return Number(value || 0); },
  platformPaymentServiceConfigHtml() { return 'payment-config'; },
  hydratePlatformPaymentServiceSettings() {},
  errorBox(error) { return `error:${error?.message || error}`; },
  setTimeout() { return 1; },
  Promise,
  Object,
  String,
  Number,
};
rendererSandbox.window = rendererSandbox;
rendererSandbox.window.obAdminLoadRefundQueue = () => rendererDeferred(rendererQueueRefreshes);
vm.createContext(rendererSandbox);
new vm.Script(`${paymentsRendererRuntimeSource}\nwindow.__testRenderPlatformPayments = renderPlatformPayments;`, {
  filename: 'admin-platform-payments-renderer.js',
}).runInContext(rendererSandbox);

const olderRenderer = rendererSandbox.window.__testRenderPlatformPayments();
const newerRenderer = rendererSandbox.window.__testRenderPlatformPayments();
assert.equal(feeRequests.length, 2);
feeRequests[1].resolve({ fees: { fee_starter_pct: 22, fee_pro_pct: 18, fee_scale_pct: 9 } });
await new Promise((resolve) => setImmediate(resolve));
assert.equal(rendererQueueRefreshes.length, 1,
  'only the current fees renderer reaches its final queue refresh');
rendererQueueRefreshes[0].resolve({ generation: 7, applied: true, stale: false });
const newerRendererResult = await newerRenderer;
assert.equal(newerRendererResult.applied, true);
assert.equal(newerRendererResult.stale, false);
assert.match(rendererContent, /Starter fee:22%/);

feeRequests[0].resolve({ fees: { fee_starter_pct: 11, fee_pro_pct: 10, fee_scale_pct: 8 } });
const olderRendererResult = await olderRenderer;
assert.equal(olderRendererResult.applied, false);
assert.equal(olderRendererResult.stale, true);
assert.match(rendererContent, /Starter fee:22%/,
  'a slower older fees response cannot replace the newer Platform Payments content');
assert.equal(rendererQueueRefreshes.length, 1,
  'a stale fees renderer cannot start another queue refresh');

const queueStart = html.indexOf('  function refundStatusBadge(s){', apiEnd);
const queueEnd = html.indexOf('\n\n  window.obCreditRefundClient', queueStart);
assert(queueStart >= 0 && queueEnd > queueStart, 'admin refund queue runtime is present');
const queueSource = html.slice(queueStart, queueEnd);
assert.doesNotMatch(queueSource, /setTimeout\(function\(\)\{ resolve\(window\.obAdminLoadRefundQueue\(\)\); \}, 600\)/,
  'refund navigation no longer guesses renderer completion with a timer');

const requests = [];
let queueHost = null;
let queueMount = null;
let renderedHtml = '';
let retryInterval = null;
let platformContentHtml = '';
const scheduledTimeouts = [];

function deferredRequest(path, options) {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  const request = { path, options, promise, resolve, reject };
  requests.push(request);
  return promise;
}

function attributeValue(source, name) {
  const match = String(source || '').match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : null;
}

function installQueue(htmlSource) {
  renderedHtml = String(htmlSource);
  const attributes = new Map();
  for (const name of ['data-ob-refund-queue-state', 'data-ob-refund-queue-generation']) {
    const value = attributeValue(renderedHtml, name);
    if (value !== null) attributes.set(name, value);
  }
  queueHost = {
    get outerHTML() { return renderedHtml; },
    set outerHTML(value) { installQueue(value); },
    getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
    setAttribute(name, value) { attributes.set(String(name), String(value)); },
  };
  return queueHost;
}

const content = {
  get innerHTML() { return platformContentHtml; },
  set innerHTML(value) { platformContentHtml = String(value); },
};
const panel = {
  classList: { contains(name) { return name === 'active'; } },
  querySelector(selector) {
    if (selector === '.admin-content') return content;
    if (selector === '[data-ob-refund-queue-mount]') return queueMount;
    return null;
  },
  appendChild(node) { queueMount = node; return node; },
  contains(node) { return node === queueHost || node === queueMount; },
};
const document = {
  getElementById(id) {
    if (id === 'admin-panel-platform-payments') return panel;
    if (id === 'ob-admin-refund-queue') return queueHost;
    return null;
  },
  createElement() {
    const attributes = new Map();
    return {
      className: '',
      style: {},
      setAttribute(name, value) { attributes.set(String(name), String(value)); },
      getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
      querySelector(selector) {
        return selector === '#ob-admin-refund-queue' ? queueHost : null;
      },
      insertAdjacentHTML(_position, htmlSource) { installQueue(htmlSource); },
      contains(node) { return node === queueHost; },
    };
  },
};

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

const sandbox = {
  window: null,
  document,
  api: deferredRequest,
  safe: escapeHtml,
  attr(value) { return escapeHtml(value).replace(/"/g, '&quot;'); },
  usd(value) { return `$${Number(value || 0).toFixed(2)}`; },
  notify() {},
  prompt() { return ''; },
  setTimeout(callback, delay) {
    scheduledTimeouts.push({ callback, delay });
    return scheduledTimeouts.length;
  },
  setInterval(callback) { retryInterval = callback; return 1; },
  console,
  Promise,
  Object,
  String,
  Number,
  Array,
  RegExp,
  Error,
  encodeURIComponent,
};
sandbox.window = sandbox;
let resolveNavigationRender;
const exactNavigationRender = new Promise((resolve) => { resolveNavigationRender = resolve; });
sandbox.window.adminNav = function adminNav() { return exactNavigationRender; };

vm.createContext(sandbox);
new vm.Script(queueSource, { filename: 'admin-refund-queue-runtime.js' }).runInContext(sandbox);

const chatLoad = sandbox.window.obAdminLoadRefundQueue();
const voiceLoad = sandbox.window.obAdminLoadRefundQueue();
assert.equal(typeof chatLoad?.then, 'function', 'queue loads expose an awaitable result');
assert.equal(requests.length, 2);
for (const request of requests) {
  assert.equal(request.path, '/admin/refund-requests?limit=100');
  assert.equal(request.options.cache, 'no-store', 'every queue read bypasses the browser cache');
}

requests[1].resolve({ requests: [{
  id: 'voice-request-current', status: 'pending', request_type: 'session',
  session_id: 'voice-session-current', client_name: 'Voice client', expert_name: 'Expert',
  amount_requested: 1.05, expert_reason: 'Voice refund',
}] });
const voiceResult = await voiceLoad;
assert.equal(voiceResult.applied, true);
assert.equal(voiceResult.generation, 2);
assert.equal(queueHost.getAttribute('data-ob-refund-queue-generation'), '2');
assert.match(renderedHtml, /data-refund-request-id="voice-request-current"/);
assert.match(renderedHtml, /data-refund-request-status="pending"/);
assert.match(renderedHtml, /data-refund-request-type="session"/);
assert.match(renderedHtml, /data-refund-session-id="voice-session-current"/);
assert.match(renderedHtml, /data-refund-action="approve"/);
assert(queueMount && queueMount !== content,
  'the refund queue renders into a stable mount outside replaceable payment content');

content.innerHTML = '<div>late Platform Payments render</div>';
assert.match(platformContentHtml, /late Platform Payments render/);
assert.match(renderedHtml, /data-refund-request-id="voice-request-current"/,
  'a later Platform Payments content replacement cannot erase the queue');
assert.equal(document.getElementById('ob-admin-refund-queue'), queueHost);

const currentVoiceHtml = renderedHtml;
requests[0].resolve({ requests: [{
  id: 'chat-request-stale', status: 'pending', request_type: 'session',
  session_id: 'chat-session-stale', client_name: 'Chat client', expert_name: 'Expert',
  amount_requested: 1.05, expert_reason: 'Chat refund',
}] });
const staleChatResult = await chatLoad;
assert.equal(staleChatResult.applied, false);
assert.equal(staleChatResult.stale, true);
assert.equal(renderedHtml, currentVoiceHtml,
  'a slower prior-channel response cannot replace the current voice queue');
assert.doesNotMatch(renderedHtml, /chat-request-stale/);

const approvedLoad = sandbox.window.obAdminLoadRefundQueue();
requests[2].resolve({ requests: [{
  id: 'voice-request-current', status: 'approved', request_type: 'session',
  session_id: 'voice-session-current', client_name: 'Voice client', expert_name: 'Expert',
  amount_requested: 1.05, expert_reason: 'Voice refund', admin_note: 'Approved',
}] });
const approvedResult = await approvedLoad;
assert.equal(approvedResult.applied, true);
assert.match(renderedHtml, /data-refund-request-id="voice-request-current"/);
assert.match(renderedHtml, /data-refund-request-status="approved"/);
assert.doesNotMatch(renderedHtml, /data-refund-action="approve"/,
  'an approved request no longer exposes the pending approval action');

const failedLoad = sandbox.window.obAdminLoadRefundQueue();
requests[3].reject(new Error('temporary queue failure'));
const failedResult = await failedLoad;
assert.equal(failedResult.applied, false);
assert.equal(failedResult.error, 'temporary queue failure');
assert.equal(queueHost.getAttribute('data-ob-refund-queue-state'), 'error');
assert.equal(typeof retryInterval, 'function');

retryInterval();
assert.equal(requests.length, 5, 'an active error queue schedules a recoverable fresh load');
assert.equal(requests[4].options.cache, 'no-store');
retryInterval();
assert.equal(requests.length, 5,
  'the recovery interval cannot supersede its own slower in-flight retry');
requests[4].resolve({ requests: [{
  id: 'voice-request-current', status: 'approved', request_type: 'session',
  session_id: 'voice-session-current', client_name: 'Voice client', expert_name: 'Expert',
  amount_requested: 1.05, expert_reason: 'Voice refund', admin_note: 'Approved',
}] });
await new Promise((resolve) => setImmediate(resolve));
assert.match(renderedHtml, /data-ob-refund-queue-state="ready"/);
assert.match(renderedHtml, /data-refund-request-status="approved"/);

const requestsBeforeNavigation = requests.length;
const returnedNavigationRefresh = sandbox.window.adminNav(null, 'platform-payments');
const navigationRefresh = sandbox.window.obAdminRefundQueueNavigationRefresh;
assert.equal(typeof navigationRefresh?.then, 'function',
  'Platform Payments navigation exposes its causal queue refresh');
assert.equal(returnedNavigationRefresh, navigationRefresh);
assert.equal(requests.length, requestsBeforeNavigation,
  'the queue cannot refresh before the exact navigation renderer settles');
resolveNavigationRender({
  panel: 'platform-payments', generation: 4, applied: true, stale: false, superseded: false,
});
await new Promise((resolve) => setImmediate(resolve));
assert.equal(requests.length, requestsBeforeNavigation + 1);
requests[requestsBeforeNavigation].resolve({ requests: [{
  id: 'voice-request-current', status: 'approved', request_type: 'session',
  session_id: 'voice-session-current', client_name: 'Voice client', expert_name: 'Expert',
  amount_requested: 1.05, expert_reason: 'Voice refund', admin_note: 'Approved',
}] });
const navigationResult = await navigationRefresh;
assert.equal(navigationResult.applied, true,
  'the observable navigation refresh settles only after its causal queue render applies');
assert.equal(navigationResult.navigation.generation, 4);
assert.equal(navigationResult.queue.applied, true);

const requestsBeforeDecision = requests.length;
const decisionPromise = sandbox.window.obAdminApproveRefund('voice-request-current');
assert.equal(typeof decisionPromise?.then, 'function');
assert.equal(
  sandbox.window.obAdminGetRefundDecisionRefreshPromise('voice-request-current', 'approve'),
  decisionPromise,
  'the exact request/action decision refresh remains awaitable after the click handler returns',
);
assert.equal(requests.length, requestsBeforeDecision + 1);
assert.equal(requests[requestsBeforeDecision].path,
  '/admin/refund-requests/voice-request-current/approve');
assert.equal(requests[requestsBeforeDecision].options.method, 'POST');
requests[requestsBeforeDecision].resolve({
  success: true,
  request: { id: 'voice-request-current', status: 'approved' },
});
await new Promise((resolve) => setImmediate(resolve));
assert.equal(requests.length, requestsBeforeDecision + 2,
  'a successful decision performs one queue refresh after the POST');
assert.equal(requests[requestsBeforeDecision + 1].path, '/admin/refund-requests?limit=100');
let decisionSettled = false;
decisionPromise.then(() => { decisionSettled = true; });
await Promise.resolve();
assert.equal(decisionSettled, false,
  'the decision promise cannot settle before its exact queue refresh');
requests[requestsBeforeDecision + 1].resolve({ requests: [{
  id: 'voice-request-current', status: 'approved', request_type: 'session',
  session_id: 'voice-session-current', client_name: 'Voice client', expert_name: 'Expert',
  amount_requested: 1.05, expert_reason: 'Voice refund', admin_note: 'Approved',
}] });
const decisionResult = await decisionPromise;
assert.equal(decisionResult.success, true);
assert.equal(decisionResult.queue.applied, true);
assert.equal(decisionResult.request_state.id, 'voice-request-current');
assert.equal(decisionResult.request_state.status, 'approved');
assert.equal(decisionResult.request_state.request_type, 'session');
assert.equal(decisionResult.request_state.session_id, 'voice-session-current');
assert.equal(requests.filter((request) => (
  request.path === '/admin/refund-requests/voice-request-current/approve'
)).length, 1, 'the queue refresh never retries the decision POST');

const requestsBeforeFailedDecision = requests.length;
const failedDecisionPromise = sandbox.window.obAdminApproveRefund('failed-request');
assert.equal(requests.length, requestsBeforeFailedDecision + 1);
requests[requestsBeforeFailedDecision].reject(new Error('approval failed'));
const failedDecisionResult = await failedDecisionPromise;
assert.equal(failedDecisionResult.success, false);
assert.equal(failedDecisionResult.error, 'approval failed');
assert.equal(requests.length, requestsBeforeFailedDecision + 1,
  'a failed decision does not retry its POST or launch a misleading refresh');

console.log('admin refund queue runtime regression: PASS');
