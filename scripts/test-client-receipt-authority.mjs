import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const legacySocketStart = html.indexOf('  function legacyWsContextCurrent(context) {');
const legacySocketEnd = html.indexOf('\n  function showClientReceiptRecoveryState', legacySocketStart);
assert(legacySocketStart >= 0 && legacySocketEnd > legacySocketStart,
  'legacy WebSocket identity owner is present');
const legacySocketSource = html.slice(legacySocketStart, legacySocketEnd);
const legacyMessageStart = html.indexOf('  function _wsMsg(d, socketContext) {');
const legacyMessageEnd = html.indexOf('\n\n  /* ── Chat helpers', legacyMessageStart);
assert(legacyMessageStart >= 0 && legacyMessageEnd > legacyMessageStart,
  'identity-bound legacy WebSocket message route is present');
const legacyMessageSource = html.slice(legacyMessageStart, legacyMessageEnd);
assert.match(legacySocketSource, /capture\('legacy-ownly-ws'\)/,
  'the legacy socket captures the identity that opened it');
assert.match(legacySocketSource, /_wsMsg\(JSON\.parse\(e\.data\), socketContext\)/,
  'queued legacy messages carry their captured identity into the route');
assert.match(legacyMessageSource, /if\(!legacyWsContextCurrent\(socketContext\)\) return;/,
  'the legacy message route rejects an obsolete identity before dispatch');

const legacyStart = html.indexOf("case 'session_ended': {");
const legacyEnd = html.indexOf("case 'message':", legacyStart);
assert(legacyStart >= 0 && legacyEnd > legacyStart, 'legacy session-ended route is present');
const legacySource = html.slice(legacyStart, legacyEnd);
assert.match(legacySource, /if\(!Auth\.isExpert\)[\s\S]*window\.obApplyAuthoritativeClientEnded\(d\)/,
  'peer-ended client sessions delegate before legacy expert cleanup');
assert.match(legacySource, /else showClientReceiptRecoveryState\(d\)/,
  'an unavailable canonical owner opens a visible fail-safe recovery surface');
assert.doesNotMatch(legacySource, /receipt-(?:total|duration|rate)/,
  'the legacy route cannot calculate or overwrite receipt values directly');
assert.equal((html.match(/function applyClientReceipt\(/g) || []).length, 1,
  'one canonical function owns client receipt rendering');

const socketInstances = [];
let registeredSocketAdapter = null;
let currentIdentity = {
  token: 'client-a-token', principal: 'client-a', role: 'client',
  identityGeneration: 1, credentialGeneration: 1,
};
class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    this.closeCount = 0;
    socketInstances.push(this);
  }
  send(value) { this.sent.push(String(value)); }
  close() { this.closeCount += 1; this.readyState = 3; }
}
const socketSandbox = {
  window: null,
  console,
  JSON,
  WebSocket: FakeWebSocket,
  WSS: 'wss://staging.example/ws',
  setInterval: () => 1,
  clearInterval() {},
  setTimeout: () => 1,
  clearTimeout() {},
};
socketSandbox.window = socketSandbox;
socketSandbox.Auth = {
  get tok() { return currentIdentity.token; },
  get user() { return { role: currentIdentity.role }; },
  get isExpert() { return currentIdentity.role === 'expert'; },
};
socketSandbox.OB_CLIENT_CONTEXT = {
  capture(scope) { return Object.freeze({ scope, ...currentIdentity, signal: { aborted: false } }); },
  isCurrent(context, options = {}) {
    return !!context && context.principal === currentIdentity.principal
      && context.identityGeneration === currentIdentity.identityGeneration
      && (!options.exactCredential || (
        context.token === currentIdentity.token
        && context.credentialGeneration === currentIdentity.credentialGeneration
      ));
  },
  register(name, adapter) {
    assert.equal(name, 'legacy-ownly-ws');
    registeredSocketAdapter = adapter;
  },
};
let crossAccountReceiptCalls = 0;
socketSandbox.obApplyAuthoritativeClientEnded = () => { crossAccountReceiptCalls += 1; };

vm.createContext(socketSandbox);
new vm.Script(
  legacySocketSource.replace('  const WS = {', '  const WS = window.__obTestLegacyWs = {')
    + legacyMessageSource + '\nwindow.__obTestLegacyWsMessage = _wsMsg;',
  { filename: 'legacy-websocket-identity.js' },
).runInContext(socketSandbox);

assert(registeredSocketAdapter, 'legacy socket registers for identity teardown');
socketSandbox.__obTestLegacyWs.connect();
assert.equal(socketInstances.length, 1);
const clientASocket = socketInstances[0];
clientASocket.readyState = 1;
clientASocket.onopen();
const queuedClientAHandler = clientASocket.onmessage;

registeredSocketAdapter.teardown();
currentIdentity = {
  token: 'client-b-token', principal: 'client-b', role: 'client',
  identityGeneration: 2, credentialGeneration: 2,
};
registeredSocketAdapter.changed(socketSandbox.OB_CLIENT_CONTEXT.capture('identity-transition'));
assert.equal(socketInstances.length, 2, 'Client B receives a new identity-owned socket');
const clientBSocket = socketInstances[1];
clientBSocket.readyState = 1;
clientBSocket.onopen();

queuedClientAHandler({ data: JSON.stringify({
  type: 'session_ended', session_id: 'client-a-session',
  session: { id: 'client-a-session', status: 'ended' },
}) });
assert.equal(crossAccountReceiptCalls, 0,
  'a queued Client A terminal event cannot render or tear down Client B');
assert.equal(socketSandbox.__obTestLegacyWs.ws, clientBSocket,
  'Client B keeps its current socket after the obsolete event');
assert.equal(clientBSocket.closeCount, 0);

clientBSocket.onmessage({ data: JSON.stringify({
  type: 'session_ended', session_id: 'client-b-session',
  session: { id: 'client-b-session', status: 'ended' },
}) });
assert.equal(crossAccountReceiptCalls, 1,
  'the current identity still receives its own terminal event');

const queuedOldCredentialHandler = clientBSocket.onmessage;
currentIdentity = {
  token: 'client-b-rotated-token', principal: 'client-b', role: 'client',
  identityGeneration: 2, credentialGeneration: 3,
};
registeredSocketAdapter.credentialRotated(
  socketSandbox.OB_CLIENT_CONTEXT.capture('identity-transition'),
);
assert.equal(socketInstances.length, 3,
  'credential rotation replaces the legacy socket instead of reusing old authorization');
const rotatedClientBSocket = socketInstances[2];
rotatedClientBSocket.readyState = 1;
rotatedClientBSocket.onopen();
queuedOldCredentialHandler({ data: JSON.stringify({
  type: 'session_ended', session_id: 'client-b-old-credential-session',
  session: { id: 'client-b-old-credential-session', status: 'ended' },
}) });
assert.equal(crossAccountReceiptCalls, 1,
  'a queued event from the prior credential cannot cross a token rotation');
assert.equal(socketSandbox.__obTestLegacyWs.ws, rotatedClientBSocket);
assert.equal(rotatedClientBSocket.closeCount, 0);

const runtimeStart = html.indexOf('  function clientReceiptDuration(sess){');
const runtimeEnd = html.indexOf('\n  function handleSessionStarted(d){', runtimeStart);
assert(runtimeStart >= 0 && runtimeEnd > runtimeStart,
  'authoritative client receipt runtime is present');
const runtimeSource = html.slice(runtimeStart, runtimeEnd);

const elements = new Map([
  ['receipt-total', { textContent: '' }],
  ['receipt-duration', { textContent: '' }],
  ['receipt-rate', { textContent: '' }],
  ['receipt-session-type', { textContent: '' }],
]);
let destination = '';
let rtcCleanups = 0;
let transportResets = 0;
let authorizationReleases = 0;
let promoClears = 0;
const removedStorageKeys = [];
const sandbox = {
  window: null,
  document: {
    getElementById: (id) => elements.get(id) || null,
    querySelectorAll: () => [],
  },
  console,
  Date,
  Object,
  Array,
  Number,
  String,
  isFinite,
  parseFloat,
  clearInterval() {},
  localStorage: { removeItem(key) { removedStorageKeys.push(String(key)); } },
  int: (value, fallback) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback,
  num: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback,
  channelRate: (_channel, session) => Number(session?.rate_per_min || 0),
  channelFree: (_channel, session) => Number(session?.free_minutes || 0),
  billableMinutes: (duration, free) => Math.max(0, Number(duration) / 60 - Number(free)),
  money: (value) => `$${Number(value).toFixed(2)}`,
  setText(id, value) {
    const element = elements.get(id);
    if (element) element.textContent = String(value);
  },
  pauseClientTimers() {},
  phoneGo(step) { destination = String(step); },
};
sandbox.window = sandbox;
sandbox._obActiveSessId = 'voice-peer-ended';
sandbox._sessId = 'voice-peer-ended';
sandbox._sid = 'voice-peer-ended';
sandbox.obIsTerminalSessionStatus = (status) => String(status).toLowerCase() === 'ended';
sandbox.obClientSessionExpertName = () => 'Liran';
sandbox.obCreditEnhanceReceipt = () => {};
sandbox.obCreditClearSessionPromo = () => { promoClears += 1; };
sandbox.obReleaseLocalSessionAuthorization = () => { authorizationReleases += 1; };
sandbox.obResetClientSessionTransport = () => { transportResets += 1; };
sandbox.OB_RTC = { cleanup() { rtcCleanups += 1; } };

vm.createContext(sandbox);
new vm.Script(runtimeSource, { filename: 'authoritative-client-receipt.js' })
  .runInContext(sandbox);

const receiptSession = sandbox.obApplyAuthoritativeClientEnded({
  type: 'session_ended',
  session_id: 'voice-peer-ended',
  session: {
    id: 'voice-peer-ended',
    status: 'ended',
    channel: 'voice',
    duration_secs: 63,
    rate_per_min: 1,
    free_minutes: 0,
    total_charged: 1.05,
    card_charged: 1.05,
    payment_status: 'paid',
    ended_at: 100,
    settlement_ended_at: 100,
  },
});

assert.equal(receiptSession.id, 'voice-peer-ended');
assert.equal(elements.get('receipt-session-type').textContent, 'Voice with Liran');
assert.equal(elements.get('receipt-duration').textContent, '1 min');
assert.equal(elements.get('receipt-rate').textContent, '$1.00/min');
assert.equal(elements.get('receipt-total').textContent, '$1.05');
assert.equal(destination, 'A5', 'the authoritative owner opens the receipt surface');
assert.equal(rtcCleanups, 1, 'terminal media is cleaned once');
assert.equal(transportResets, 1, 'terminal client transports are cleaned once');
assert.equal(authorizationReleases, 1, 'the local authorization is released once');
assert.equal(promoClears, 1, 'session-scoped promotion state is cleared once');
assert.deepEqual(removedStorageKeys, ['ob_hpm']);
assert.equal(sandbox._obActiveSessId, null);
assert.equal(sandbox._sessId, null);
assert.equal(sandbox._sid, null, 'all legacy and canonical session-id aliases are cleared');

const firstReceipt = Object.fromEntries(
  [...elements].map(([id, element]) => [id, element.textContent]),
);
sandbox.obApplyAuthoritativeClientEnded({
  type: 'session_ended',
  session_id: 'voice-peer-ended',
  session: {
    id: 'voice-peer-ended',
    status: 'ended',
    channel: 'voice',
    duration_secs: 120,
    rate_per_min: 9,
  },
});
assert.deepEqual(Object.fromEntries([...elements].map(([id, element]) => [id, element.textContent])),
  firstReceipt, 'a lower-fidelity duplicate cannot overwrite a completed receipt');
assert.equal(rtcCleanups, 1);
assert.equal(transportResets, 1);

destination = 'returned';
sandbox.obApplyAuthoritativeClientEnded({
  type: 'session_ended',
  session_id: 'voice-peer-ended',
  session: {
    id: 'voice-peer-ended', status: 'ended', channel: 'voice', duration_secs: 64,
    rate_per_min: 1, free_minutes: 0, total_charged: 1.06, card_charged: 1.06,
    payment_status: 'paid',
    ended_at: 101, settlement_ended_at: 101,
  },
});
assert.equal(elements.get('receipt-total').textContent, '$1.06',
  'a newer authoritative settlement can improve the same receipt');
assert.equal(destination, 'returned', 'a same-session receipt update does not reopen a dismissed screen');
assert.equal(rtcCleanups, 1, 'a same-session receipt update does not repeat terminal cleanup');
assert.equal(transportResets, 1);
const authoritativeReceipt = Object.fromEntries(
  [...elements].map(([id, element]) => [id, element.textContent]),
);

sandbox.obApplyAuthoritativeClientEnded({
  type: 'session_ended',
  session_id: 'voice-peer-ended',
  session: {
    id: 'voice-peer-ended', status: 'ended', channel: 'voice', duration_secs: 120,
    rate_per_min: 9, free_minutes: 0, total_charged: 9.99, card_charged: 9.99,
    payment_status: 'paid', payout_status: 'destination_charge',
    ended_at: 100, settlement_ended_at: 100,
  },
});
assert.deepEqual(Object.fromEntries([...elements].map(([id, element]) => [id, element.textContent])),
  authoritativeReceipt, 'an older but richer duplicate cannot overwrite newer financial values');
assert.equal(rtcCleanups, 1);

sandbox.obApplyAuthoritativeClientEnded({
  type: 'session_ended',
  session_id: 'stale-other-session',
  session: { id: 'stale-other-session', status: 'ended', duration_secs: 600, rate_per_min: 20 },
});
assert.deepEqual(Object.fromEntries([...elements].map(([id, element]) => [id, element.textContent])),
  authoritativeReceipt, 'a stale terminal event cannot replace the last receipt when no session is active');
assert.equal(rtcCleanups, 1);

sandbox._obPendingSessId = 'pending-video-session';
sandbox.obApplyAuthoritativeClientEnded({
  type: 'session_ended',
  session_id: 'pending-video-session',
  session: {
    id: 'pending-video-session', status: 'ended', channel: 'video', duration_secs: 64,
    rate_per_min: 1, free_minutes: 0, total_charged: 1.07, card_charged: 1.07,
    payment_status: 'paid', payout_status: 'destination_charge',
    ended_at: 150, settlement_ended_at: 150,
  },
});
assert.equal(elements.get('receipt-session-type').textContent, 'Video with Liran');
assert.equal(elements.get('receipt-duration').textContent, '1 min');
assert.equal(elements.get('receipt-rate').textContent, '$1.00/min');
assert.equal(elements.get('receipt-total').textContent, '$1.07');
assert.equal(rtcCleanups, 2,
  'a terminal event for a newly pending session is authoritative before active UI opens');
assert.equal(transportResets, 2);
assert.equal(sandbox._obPendingSessId, null);

sandbox._obActiveSessId = 'next-video-session';
sandbox._sessId = 'next-video-session';
sandbox._sid = 'next-video-session';
sandbox._obClientSessionSnapshot = { id: 'next-video-session', channel: 'video' };
sandbox.obApplyAuthoritativeClientEnded({
  type: 'session_ended',
  session_id: 'next-video-session',
  session: {
    id: 'next-video-session', status: 'ended', channel: 'video', duration_secs: 65,
    rate_per_min: 1, free_minutes: 0, total_charged: 1.08, card_charged: 1.08,
    payment_status: 'paid', payout_status: 'destination_charge',
    ended_at: 200, settlement_ended_at: 200,
  },
});
assert.equal(elements.get('receipt-session-type').textContent, 'Video with Liran');
assert.equal(elements.get('receipt-duration').textContent, '1 min');
assert.equal(elements.get('receipt-rate').textContent, '$1.00/min');
assert.equal(elements.get('receipt-total').textContent, '$1.08');
assert.equal(rtcCleanups, 3, 'a new active session owns a new terminal cleanup');
assert.equal(transportResets, 3);

console.log('client receipt authority smoke: ok');
