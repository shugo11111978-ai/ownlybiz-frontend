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
assert.match(paymentsRendererSource,
  /if\(typeof window\.obAdminLoadRefundQueue === 'function'\) return window\.obAdminLoadRefundQueue\(\);/,
  'the Platform Payments renderer awaits its final refund-queue refresh');

const queueStart = html.indexOf('  function refundStatusBadge(s){', apiEnd);
const queueEnd = html.indexOf('\n\n  window.obCreditRefundClient', queueStart);
assert(queueStart >= 0 && queueEnd > queueStart, 'admin refund queue runtime is present');
const queueSource = html.slice(queueStart, queueEnd);

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
sandbox.window.adminNav = function adminNav() {};

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

sandbox.window.adminNav(null, 'platform-payments');
const navigationRefresh = sandbox.window.obAdminRefundQueueNavigationRefresh;
assert.equal(typeof navigationRefresh?.then, 'function',
  'Platform Payments navigation exposes its scheduled queue refresh');
const navigationTimer = scheduledTimeouts.find((entry) => entry.delay === 600);
assert(navigationTimer, 'Platform Payments navigation schedules the owned queue refresh');
navigationTimer.callback();
assert.equal(requests.length, 6);
requests[5].resolve({ requests: [{
  id: 'voice-request-current', status: 'approved', request_type: 'session',
  session_id: 'voice-session-current', client_name: 'Voice client', expert_name: 'Expert',
  amount_requested: 1.05, expert_reason: 'Voice refund', admin_note: 'Approved',
}] });
const navigationResult = await navigationRefresh;
assert.equal(navigationResult.applied, true,
  'the observable navigation refresh settles only after its queue render applies');

console.log('admin refund queue runtime regression: PASS');
