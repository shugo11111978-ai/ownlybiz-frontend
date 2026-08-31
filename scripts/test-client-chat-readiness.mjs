import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function between(startText, endText) {
  const start = html.indexOf(startText);
  const end = html.indexOf(endText, start);
  assert(start >= 0 && end > start, `${startText} remains extractable`);
  return html.slice(start, end);
}
const timerSource = between('  function renderClientChatReadiness(sess){', '  window._clientTimerFn =');
const receiptSource = between('  function clientReceiptDuration(sess){', '\n  function handleSessionStarted(d){');
const sendSource = between('  function bindClientChatControls(){', '  window.clientEndSession = function(){');
const outboxClientSource = between('  function wrapClient(){', '  function wrapExpert(){');
const identityCleanupSource = between('  function clearClientSessionDom(){', '  function clearAccountScopedClientSessionRuntime(');
const applyUiSource = between('  function applyClientSessionUi(sess){', '  function syncClientSession(sid){');

function createRuntime() {
  const elements = new Map();
  function node(id) {
    if(!elements.has(id)) elements.set(id, {
      textContent: '', value: '', disabled: false, hidden: true, placeholder: '',
      style: {}, attributes: {},
      classList: { add() {}, remove() {}, contains() { return false; } },
      setAttribute(key, value) { this.attributes[key] = String(value); },
      addEventListener() {}, replaceChildren() {}, remove() {},
    });
    return elements.get(id);
  }
  const screen = node('screen-A5');
  screen.querySelector = (selector) => node(selector);
  const calls = { api: [], localMessages: [], screens: [], outbox: [], timerStops: 0 };
  const runtime = {
    window: null, console, Object, Number, String, Array, Date, parseFloat, isFinite,
    document: {
      documentElement: { classList: { remove() {} } },
      getElementById: (id) => node(id),
      querySelector: (selector) => selector === '#screen-A4 .chat-send' ? node('send') : null,
      querySelectorAll: () => [],
    },
    localStorage: { removeItem() {} },
    clearInterval() {}, setInterval() { return 1; },
    _obActiveSessId: 'current-chat', _sessId: 'current-chat', _sid: 'current-chat',
    _obPendingChannel: 'chat',
    _obClientSessionSnapshot: { id: 'current-chat', channel: 'chat', status: 'active', started_at: null },
    obIsTerminalSessionStatus: (value) => ['cancelled','failed','expired','declined','no_show','ended','completed'].includes(String(value).toLowerCase()),
    int(value, fallback = 0) { const parsed = parseInt(value, 10); return Number.isFinite(parsed) ? parsed : fallback; },
    num(value, fallback = 0) { const parsed = parseFloat(value); return Number.isFinite(parsed) ? parsed : fallback; },
    channelRate: (_channel, session) => Number(session?.rate_per_min || 0),
    channelFree: (_channel, session) => Number(session?.free_minutes || 0),
    billableMinutes: (duration, free) => Math.max(0, Number(duration) / 60 - Number(free)),
    money: (value) => `$${Number(value).toFixed(2)}`,
    fmtTime: (elapsed) => `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`,
    setText(id, value) { node(id).textContent = String(value); },
    stopOriginalClientTimers() { calls.timerStops += 1; },
    phoneGo(id) { calls.screens.push(id); },
    myId() { return 'client'; },
    appendPanelMessage(...args) { calls.localMessages.push(args); },
    api(...args) { calls.api.push(args); return Promise.resolve({}); },
    toastMsg() {}, activeSid() { return runtime._obActiveSessId; },
    refreshClientSessionCredential() {}, setClientFreeUi() {}, ensureClientWsJoined() {},
    sendWithRetry(...args) { calls.outbox.push(args); return true; },
  };
  runtime.window = runtime;
  vm.createContext(runtime);
  new vm.Script(timerSource + receiptSource + sendSource + outboxClientSource + identityCleanupSource + applyUiSource,
    { filename: 'client-chat-readiness.js' }).runInContext(runtime);
  return { runtime, node, calls };
}

test('accepted chat remains connecting without authoritative started_at, with draft intact', () => {
  const { runtime, node, calls } = createRuntime();
  node('paid-chat-input').value = 'Hello, I need some guidance';
  runtime.pauseClientTimers({ id: 'current-chat', channel: 'chat', status: 'active', started_at: null, rate_per_min: 0.5 });
  assert.equal(node('paid-chat-input').disabled, true);
  assert.equal(node('paid-chat-input').value, 'Hello, I need some guidance');
  assert.equal(node('send').attributes['aria-disabled'], 'true');
  assert.equal(node('send').style.pointerEvents, 'none');
  assert.equal(node('ob-client-chat-readiness').hidden, false);
  assert.equal(node('paid-timer').textContent, '0:00');
  assert.equal(node('a4-session-rate').textContent, 'Connecting · no session charge yet');
  assert.equal(calls.api.length, 0, 'readiness projection neither starts nor cancels a session');
});

test('missing, zero, or invalid started_at never unlocks chat', () => {
  for(const startedAt of [undefined, null, 0, '', 'bad']) {
    const { runtime, node } = createRuntime();
    runtime.renderClientChatReadiness({ id: 'current-chat', channel: 'chat', status: 'active', started_at: startedAt });
    assert.equal(node('paid-chat-input').disabled, true, String(startedAt));
  }
});

test('authoritative session start unlocks chat and keeps its draft', () => {
  const { runtime, node } = createRuntime();
  node('paid-chat-input').value = 'Hello';
  const started = Math.floor(Date.now() / 1000);
  runtime.startClientTimer(started, { id: 'current-chat', channel: 'chat', status: 'active', started_at: null, rate_per_min: 0.5 });
  assert.equal(runtime._obClientSessionSnapshot.started_at, started);
  assert.equal(node('paid-chat-input').disabled, false);
  assert.equal(node('paid-chat-input').value, 'Hello');
  assert.equal(node('send').attributes['aria-disabled'], 'false');
  assert.equal(node('send').style.pointerEvents, '');
  assert.equal(node('ob-client-chat-readiness').hidden, true);
  assert.equal(node('a4-session-rate').textContent, 'Billing · $0.50/min');
});

test('both canonical and outbox send entry points reject a disabled composer without losing text', () => {
  const { runtime, node, calls } = createRuntime();
  node('paid-chat-input').value = 'Hello';
  runtime.renderClientChatReadiness({ channel: 'chat', status: 'active', started_at: null });
  runtime.bindClientChatControls();
  assert.equal(runtime.sendPaidMsg(), false);
  runtime.wrapClient();
  assert.equal(runtime.sendPaidMsg(), false);
  assert.equal(node('paid-chat-input').value, 'Hello');
  assert.equal(calls.api.length, 0);
  assert.equal(calls.localMessages.length, 0);
  assert.equal(calls.outbox.length, 0);
});

test('started zero-rate and free-intro chats remain usable', () => {
  const { runtime, node, calls } = createRuntime();
  runtime.updateClientTimerDisplays(5, { id: 'current-chat', channel: 'chat', status: 'active', started_at: 1, rate_per_min: 0, free_minutes: 0 });
  assert.equal(node('paid-chat-input').disabled, false);
  node('paid-chat-input').value = 'Hello';
  runtime.bindClientChatControls();
  runtime.sendPaidMsg();
  assert.equal(calls.api.length, 1);
  assert.match(calls.api[0][0], /\/current-chat\/message$/);
  assert.equal(calls.localMessages.length, 1);
  runtime.updateClientTimerDisplays(5, { id: 'current-chat', channel: 'chat', status: 'active', started_at: 1, rate_per_min: 0.5, free_minutes: 1 });
  assert.equal(node('a4-session-rate').textContent, 'Free intro · $0.50/min after');
});

test('voice and video readiness projection leaves their composer and controls untouched', () => {
  for(const channel of ['voice', 'video']) {
    const { runtime, node } = createRuntime();
    node('paid-chat-input').placeholder = 'original';
    runtime.renderClientChatReadiness({ channel, status: 'active', started_at: null });
    assert.equal(node('paid-chat-input').disabled, false);
    assert.equal(node('paid-chat-input').placeholder, 'original');
    assert.deepEqual(node('send').attributes, {});
  }
});

test('settling and terminal chats never re-enable the composer while the timer is stopped', () => {
  for(const status of ['settling','ended','cancelled']) {
    const { runtime, node } = createRuntime();
    runtime.pauseClientTimers({ channel: 'chat', status, started_at: 1 });
    assert.equal(node('paid-chat-input').disabled, true);
    assert.equal(node('ob-client-chat-readiness').hidden, true);
  }
});

test('confirmed never-started cancellation shows neutral no-charge closure and the unsent draft', () => {
  const { runtime, node, calls } = createRuntime();
  node('paid-chat-input').value = 'Hello';
  runtime.obApplyAuthoritativeClientTerminal({
    type: 'session_cancelled', session_id: 'current-chat',
    session: { id: 'current-chat', channel: 'chat', status: 'cancelled', started_at: null,
      duration_secs: 0, total_charged: 0, card_charged: 0, billing_attempted_amount: 0 },
  });
  assert.equal(node('.receipt-title').textContent, 'Chat did not start');
  assert.match(node('.receipt-sub').textContent, /No session time was charged/);
  assert.equal(node('receipt-duration').textContent, 'Not started');
  assert.equal(node('receipt-total').textContent, '$0.00');
  assert.equal(node('.rating-stars').style.display, 'none');
  assert.equal(node('paid-chat-input').value, 'Hello');
  assert.equal(node('paid-chat-input').disabled, true);
  assert.equal(node('ob-client-startup-draft-text').value, 'Hello');
  assert.equal(node('ob-client-startup-draft').hidden, false);
  assert.deepEqual(calls.screens, ['A5']);
  assert.equal(runtime._obActiveSessId, null, 'normal terminal cleanup remains authoritative');
  assert.equal(calls.api.length, 0, 'the receipt performs no payment or session mutation');
});

test('no-charge startup copy requires explicit authoritative evidence and never overrides paid receipts', () => {
  const { runtime } = createRuntime();
  const cancelled = { channel: 'chat', status: 'cancelled', started_at: null,
    duration_secs: 0, total_charged: 0, card_charged: 0 };
  assert.equal(runtime.clientChatCancelledBeforeStart(cancelled), true);
  const missingStart = { ...cancelled };
  delete missingStart.started_at;
  for(const session of [missingStart, { ...cancelled, total_charged: undefined },
    { ...cancelled, total_charged: null }, { ...cancelled, card_charged: null },
    { ...cancelled, duration_secs: null },
    { ...cancelled, started_at: 1 }, { ...cancelled, duration_secs: 1 },
    { ...cancelled, card_charged: 0.5 }, { ...cancelled, total_charged: 0.5 },
    { ...cancelled, credit_applied: 1 }, { ...cancelled, billing_attempted_amount: 1 },
    { ...cancelled, status: 'ended' }, { ...cancelled, channel: 'voice' }]) {
    assert.equal(runtime.clientChatCancelledBeforeStart(session), false, JSON.stringify(session));
  }
});

test('ordinary ended-session receipt retains existing values and clears prior startup draft display', () => {
  const { runtime, node } = createRuntime();
  node('paid-chat-input').value = 'Unused draft';
  node('ob-client-startup-draft').hidden = false;
  node('ob-client-startup-draft-text').value = 'Earlier draft';
  runtime.obApplyAuthoritativeClientTerminal({
    type: 'session_ended', session_id: 'current-chat',
    session: { id: 'current-chat', channel: 'chat', status: 'ended', started_at: 1,
      duration_secs: 120, total_charged: 1, card_charged: 1, rate_per_min: 0.5 },
  });
  assert.equal(node('.receipt-title').textContent, 'Session Complete!');
  assert.equal(node('receipt-total').textContent, '$1.00');
  assert.equal(node('receipt-duration').textContent, '2 min');
  assert.equal(node('.rating-stars').style.display, '');
  assert.equal(node('paid-chat-input').value, '');
  assert.equal(node('paid-chat-input').disabled, true);
  assert.equal(node('ob-client-startup-draft').hidden, true);
  assert.equal(node('ob-client-startup-draft-text').value, '');
});

test('identity teardown clears the retained draft and connecting surface', () => {
  const { runtime, node } = createRuntime();
  node('paid-chat-input').value = 'Private client draft';
  node('ob-client-startup-draft-text').value = 'Private client draft';
  node('ob-client-startup-draft').hidden = false;
  node('ob-client-chat-readiness').hidden = false;
  runtime.clearClientSessionDom();
  assert.equal(node('paid-chat-input').value, '');
  assert.equal(node('ob-client-startup-draft-text').value, '');
  assert.equal(node('ob-client-startup-draft').hidden, true);
  assert.equal(node('ob-client-chat-readiness').hidden, true);
});

test('new-session fallback cannot inherit started_at from a prior session', () => {
  const { runtime, node } = createRuntime();
  const prior = { id: 'old-started-chat', channel: 'chat', status: 'active', started_at: 100,
    rate_per_min: 5, free_minutes: 7, expert_name: 'Prior expert' };
  runtime._obClientSessionSnapshot = prior;
  runtime._obClientStartedAt = 100;
  runtime._obActiveSessId = 'new-chat';
  runtime._sessId = 'new-chat';
  node('paid-chat-input').value = 'Hello';
  runtime.applyClientSessionUi({ id: 'new-chat', channel: 'chat' });
  assert.equal(runtime._obClientSessionSnapshot.id, 'new-chat');
  assert.equal(runtime._obClientSessionSnapshot.started_at, undefined);
  assert.equal(runtime._obClientSessionSnapshot.expert_name, undefined);
  assert.equal(prior.id, 'old-started-chat', 'the previous snapshot is not mutated');
  assert.equal(runtime._obClientStartedAt, null);
  assert.equal(node('paid-chat-input').disabled, true);
  assert.equal(node('paid-chat-input').value, 'Hello');
  assert.equal(node('a4-session-rate').textContent, 'Connecting · no session charge yet');
});

test('composer readiness belongs to the exact current session ID', () => {
  const { runtime, node } = createRuntime();
  for(const id of ['', 'old-chat', undefined]) {
    runtime.renderClientChatReadiness({ id, channel: 'chat', status: 'active', started_at: 1 });
    assert.equal(node('paid-chat-input').disabled, true, String(id));
  }
  runtime.renderClientChatReadiness({ id: 'current-chat', channel: 'chat', status: 'active', started_at: 1 });
  assert.equal(node('paid-chat-input').disabled, false);
});

const outboxSource = html.match(/<script id="ownlybiz-chat-outbox-v2">([\s\S]*?)<\/script>/)?.[1];
assert(outboxSource, 'the existing outbox is available for integration regressions');
function createOutbox(response) {
  const stored = new Map([
    ['ob_t', 'test-client-token'],
    ['ob_u', JSON.stringify({ id: 'client', role: 'client' })],
  ]);
  const storage = {
    getItem: (key) => stored.get(key) || null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: (key) => stored.delete(key),
  };
  const requests = [];
  const notices = [];
  const deliveries = [];
  let reply = response;
  const row = { getAttribute: (key) => key === 'data-ob-msg-key' ? requests[0]?.body.client_message_id : null };
  const sandbox = {
    window: null, console, Date, Math, JSON, Promise, encodeURIComponent, atob,
    sessionStorage: storage, localStorage: storage, navigator: { onLine: true },
    document: { getElementById: (id) => id === 'paid-chat-messages' ? { children: [row] } : null },
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      requests.push({ url: String(url), body });
      if(reply === 'success') return { ok: true, status: 200,
        json: async () => ({ message: { id: 'canonical', client_message_id: body.client_message_id } }) };
      return { ok: false, status: reply.status, json: async () => reply.body };
    },
    setTimeout() {}, setInterval() {}, addEventListener() {},
    toast: (text, type) => notices.push({ text, type }),
    _obApplyPanelMessageDelivery: (_row, status) => deliveries.push(status),
    __OB_TEST_HOOKS__: {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  new vm.Script(outboxSource, { filename: 'readiness-outbox.js' }).runInContext(sandbox);
  return { hooks: sandbox.__OB_TEST_HOOKS__.chatOutbox, requests, notices, deliveries,
    setReply(value) { reply = value; } };
}
async function settlePromises() {
  for(let turn = 0; turn < 16; turn += 1) await Promise.resolve();
}

test('explicit retryable prestart 409 stays queued through send and flush, then retries with the same ID', async () => {
  const outbox = createOutbox({ status: 409,
    body: { error: 'Chat is connecting', code: 'session_message_session_not_started', retryable: true } });
  const input = { value: 'Hello' };
  outbox.hooks.sendWithRetry('paid-chat-messages', 'current-chat', 'Hello', input);
  await settlePromises();
  assert.equal(outbox.hooks.read().length, 1, 'initial prestart rejection retains the durable item');
  assert.equal(outbox.hooks.read()[0].content, 'Hello');
  assert.deepEqual(outbox.deliveries, []);
  await outbox.hooks.flush();
  assert.equal(outbox.hooks.read().length, 1, 'a prestart flush does not delete the queued item');
  outbox.setReply('success');
  await outbox.hooks.flush();
  assert.equal(outbox.hooks.read().length, 0);
  assert.deepEqual(outbox.deliveries, ['sent']);
  assert.equal(new Set(outbox.requests.map((request) => request.body.client_message_id)).size, 1);
  assert(outbox.requests.every((request) => request.url.endsWith('/current-chat/message')));
});

test('other 409 responses remain fatal, including missing or nonboolean retryability', async () => {
  for(const body of [
    { code: 'session_message_session_not_started' },
    { code: 'session_message_session_not_started', retryable: false },
    { code: 'session_message_session_not_started', retryable: 'true' },
    { code: 'session_message_id_conflict', retryable: true },
    { retryable: true },
  ]) {
    const outbox = createOutbox({ status: 409, body: { error: 'Not sent', ...body } });
    outbox.hooks.sendWithRetry('paid-chat-messages', 'current-chat', 'Hello', { value: 'Hello' });
    await settlePromises();
    assert.equal(outbox.hooks.read().length, 0, JSON.stringify(body));
    assert.deepEqual(outbox.deliveries, ['failed'], JSON.stringify(body));
    await outbox.hooks.flush();
    assert.equal(outbox.requests.length, 1, 'fatal conflicts do not automatically retry');
  }
});

test('queued prestart message is retired if the server later confirms a fatal conflict', async () => {
  const outbox = createOutbox({ status: 409,
    body: { code: 'session_message_session_not_started', retryable: true } });
  outbox.hooks.sendWithRetry('paid-chat-messages', 'current-chat', 'Hello', { value: 'Hello' });
  await settlePromises();
  outbox.setReply({ status: 409, body: { code: 'session_message_id_conflict', retryable: true } });
  await outbox.hooks.flush();
  assert.equal(outbox.hooks.read().length, 0);
  assert.deepEqual(outbox.deliveries, ['failed']);
});
