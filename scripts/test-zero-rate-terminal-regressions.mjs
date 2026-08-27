import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function scriptById(id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match, `${id} is installed`);
  return match[1];
}

function functionDeclaration(name) {
  const start = html.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} is present`);
  const open = html.indexOf('{', start);
  assert(open >= 0, `${name} has a body`);
  let depth = 0;
  for(let index = open; index < html.length; index += 1) {
    if(html[index] === '{') depth += 1;
    else if(html[index] === '}') {
      depth -= 1;
      if(depth === 0) return html.slice(start, index + 1);
    }
  }
  assert.fail(`${name} has a complete body`);
}

function evaluate(source, sandbox, filename) {
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  new vm.Script(source, { filename }).runInContext(sandbox);
  return sandbox;
}

const policySandbox = evaluate(
  scriptById('ownlybiz-rate-and-session-status-policy-20260827'),
  { Object, Number, String },
  'rate-and-terminal-policy.js',
);
const rates = policySandbox.OB_RATE_POLICY;
const statuses = policySandbox.OB_SESSION_STATUS_POLICY;

function expert(ratesByChannel, paymentsEnabled = false) {
  return {
    name: 'Zero Rate Expert',
    payments_enabled: paymentsEnabled,
    chat_enabled: 1,
    voice_enabled: 1,
    video_enabled: 1,
    rate_chat: ratesByChannel.chat,
    rate_voice: ratesByChannel.voice,
    rate_video: ratesByChannel.video,
  };
}

test('zero-rate/no-Stripe experts remain publishable and publicly accessible while paid channels stay blocked', () => {
  const allZero = expert({ chat: 0, voice: 0, video: 0 });
  const mixed = expert({ chat: 0, voice: 4, video: 5 });
  const allPaid = expert({ chat: 3.5, voice: 4, video: 5 });

  assert.equal(rates.channelCanStart(allZero, 'chat', 'minute'), true);
  assert.equal(rates.channelCanStart(mixed, 'chat', 'minute'), true);
  assert.equal(rates.channelCanStart(mixed, 'voice', 'minute'), false);
  assert.equal(rates.channelCanStart(mixed, 'video', 'minute'), false);
  assert.equal(rates.hasStartableMinuteChannel(allPaid), false);

  const bookingSandbox = evaluate([
    functionDeclaration('enabledFlag'),
    functionDeclaration('hasBookExpertData'),
    functionDeclaration('bookingUnavailableReason'),
  ].join('\n'), {
    Object,
    String,
    OB_RATE_POLICY: rates,
    _customDomainPending: false,
    _currentExpert: allZero,
  }, 'booking-availability.js');
  assert.equal(bookingSandbox.bookingUnavailableReason(), '',
    'an all-zero expert is not globally blocked for lacking Stripe');
  bookingSandbox._currentExpert = mixed;
  assert.equal(bookingSandbox.bookingUnavailableReason(), '',
    'one startable zero-rate channel keeps the public booking selector available');
  bookingSandbox._currentExpert = allPaid;
  assert.notEqual(bookingSandbox.bookingUnavailableReason(), '',
    'a no-Stripe expert with only paid channels remains unavailable');

  const publicGateSandbox = evaluate([
    functionDeclaration('publicExpertData'),
    functionDeclaration('publicBookingBlockReason'),
  ].join('\n'), { Object, String, OB_RATE_POLICY: rates }, 'public-booking-gate.js');
  assert.equal(publicGateSandbox.publicBookingBlockReason(allZero), '');
  assert.equal(publicGateSandbox.publicBookingBlockReason(mixed), '');
  assert.notEqual(publicGateSandbox.publicBookingBlockReason(allPaid), '');

  let currentLaunchData = null;
  const launchSandbox = evaluate([
    functionDeclaration('launchChannelEnabled'),
    functionDeclaration('launchRate'),
    functionDeclaration('launchOfferInfo'),
    functionDeclaration('derive'),
  ].join('\n'), {
    Object,
    Number,
    String,
    OB_RATE_POLICY: rates,
    state: { me: {} },
    data() { return currentLaunchData; },
    stripeInfo(value) { return value.stripeInfo || { connected: false, pending: false }; },
    websiteContent() { return {}; },
    cleanText(value) { return String(value == null ? '' : value).trim(); },
    profileSpecialties() { return ['Consulting']; },
    rateInfo(value) { return value.rates || {}; },
    num(...values) {
      for(const value of values) {
        const number = Number(value);
        if(Number.isFinite(number) && number > 0) return number;
      }
      return 0;
    },
    availabilityReady() { return true; },
    verifiedFrom() { return true; },
    domainConnectedFrom() { return false; },
  }, 'launch-readiness.js');
  const launchBase = {
    profile: { name: 'Zero Rate Expert', title: 'Advisor', bio: 'Ready to help' },
    user: { name: 'Zero Rate Expert', is_verified: 1 },
    stripeInfo: { connected: false, pending: false },
  };
  currentLaunchData = { ...launchBase, rates: allZero };
  const zeroRateRemaining = Array.from(launchSandbox.derive().remaining, (item) => item.id);
  assert.equal(zeroRateRemaining.includes('stripe'), false,
    'Stripe is not a publish requirement for an enabled zero-rate offer');
  assert.equal(zeroRateRemaining.includes('rates'), false,
    'an explicitly configured zero-rate offer satisfies launch readiness');
  currentLaunchData = { ...launchBase, rates: allPaid };
  const paidRemaining = Array.from(launchSandbox.derive().remaining, (item) => item.id);
  assert.equal(paidRemaining.includes('stripe'), true,
    'Stripe remains required when every enabled channel is paid');
  assert.equal(paidRemaining.includes('rates'), false,
    'positive configured rates still satisfy offer readiness');
});

function createClientReducerSandbox() {
  const reducerStart = html.indexOf('window.obReduceClientSessionTerminal=function(payload,source){');
  const reducerEnd = html.indexOf('\n  function showClientReceiptPending', reducerStart);
  assert(reducerStart >= 0 && reducerEnd > reducerStart, 'client terminal reducer is extractable');
  const sandbox = {
    Object,
    String,
    console,
    document: { getElementById() { return null; } },
    _obActiveSessId: 'current-session',
    terminalApplies: 0,
    settlingApplies: 0,
    remembered: 0,
    clientReceiptSessionId(value) {
      value = value || {};
      return String(value.id || value.session_id || value.sessionId
        || (value.session && (value.session.id || value.session.session_id || value.session.sessionId)) || '');
    },
    applyAuthoritativeClientTerminal(value) {
      if(this.clientReceiptSessionId(value) !== this._obActiveSessId) return null;
      this.terminalApplies += 1;
      return value;
    },
    applyClientSettlementPending(value) {
      if(this.clientReceiptSessionId(value) !== this._obActiveSessId) return null;
      this.settlingApplies += 1;
      return value;
    },
    rememberTerminalSession() { this.remembered += 1; },
    OB_SESSION_STATUS_POLICY: statuses,
    obIsTerminalSessionStatus: statuses.isTerminal,
  };
  return evaluate(
    [
      functionDeclaration('clientTerminalStatusPolicy'),
      functionDeclaration('clientReceiptSessionId'),
      functionDeclaration('clientTerminalOwnership'),
      html.slice(reducerStart, reducerEnd),
    ].join('\n'),
    sandbox,
    'client-terminal-reducer.js',
  );
}

test('mismatched terminal and settling frames are unhandled and cannot tear down the current status poll', () => {
  const sandbox = createClientReducerSandbox();
  const staleTerminal = { type: 'session_ended', session_id: 'old-session' };
  const staleSettling = { type: 'session_settling', session_id: 'old-session' };

  assert.equal(sandbox.obReduceClientSessionTerminal(staleTerminal, 'ws'), false,
    'a terminal frame rejected by session ownership remains unhandled');
  assert.equal(sandbox.obReduceClientSessionTerminal(staleSettling, 'ws'), false,
    'a settling frame rejected by session ownership remains unhandled');
  assert.equal(sandbox.terminalApplies, 0);
  assert.equal(sandbox.settlingApplies, 0);
  assert.equal(sandbox.remembered, 0,
    'a stale terminal SID is not promoted into local terminal memory');

  sandbox.pollStops = 0;
  sandbox.overlayRemovals = 0;
  sandbox._statusPollTimer = { id: 'current-poll' };
  sandbox.clearInterval = () => { sandbox.pollStops += 1; };
  sandbox.document = {
    getElementById(id) {
      if(id !== 'ob-waiting-overlay') return null;
      return { classList: { remove() { sandbox.overlayRemovals += 1; } } };
    },
  };
  sandbox.myId = () => 'client-id';
  sandbox.myRole = () => 'client';
  new vm.Script(
    functionDeclaration('stopStatusPoll') + '\n' + functionDeclaration('handleWsMsg'),
    { filename: 'client-ws-status-poll.js' },
  ).runInContext(sandbox);
  sandbox.handleWsMsg(staleTerminal);
  assert.equal(sandbox.pollStops, 0);
  assert.equal(sandbox.overlayRemovals, 0);
  sandbox._statusPollTimer = { id: 'current-poll' };
  sandbox.handleWsMsg(staleSettling);
  assert.equal(sandbox.pollStops, 0);
  assert.equal(sandbox.overlayRemovals, 0);
});

function createExpertRuntime() {
  class NeverOpenedSocket {
    static OPEN = 1;
    constructor() { this.readyState = 0; }
    send() {}
    close() { this.readyState = 3; }
  }
  const sandbox = evaluate(
    scriptById('ownlybiz-expert-live-runtime-20260817'),
    { console, Date, Math, Object, Array, String, Number, Set, Promise, setTimeout, clearTimeout, WebSocket: NeverOpenedSocket },
    'expert-live-runtime.js',
  );
  return sandbox.OBExpertLiveRuntimeFactory.create({
    WebSocket: NeverOpenedSocket,
    setTimeout,
    clearTimeout,
    getIdentity: () => ({ token: 'expert-token', accountId: 'expert-id', role: 'expert' }),
  });
}

test('expert runtime treats every dedicated backend terminal event as authoritative', () => {
  const runtime = createExpertRuntime();
  const terminalEvents = {
    session_cancelled: 'cancelled',
    session_failed: 'failed',
    session_completed: 'completed',
    session_no_show: 'no_show',
  };
  for(const [type, status] of Object.entries(terminalEvents)) {
    const sid = `terminal-${status}`;
    const decision = runtime.ingest({ type, session_id: sid });
    assert.equal(decision.handled, true, `${type} is consumed by the keyed expert runtime`);
    assert.equal(decision.sid, sid);
    assert.equal(decision.room.status, status);
    assert.equal(decision.room.terminal, true, `${type} retires the expert room`);
  }
});

test('a settling GET snapshot cannot reanimate a UI-terminal expert room', () => {
  const runtime = createExpertRuntime();
  const sid = 'settling-session';
  const decision = runtime.ingest({
    type: 'session_settling',
    session_id: sid,
    session: { id: sid, status: 'settling', billing_stopped: true },
  });
  assert.equal(decision.handled, true);
  assert.equal(decision.room.terminal, true);

  const merged = runtime.mergeSnapshot(sid, {
    id: sid,
    status: 'settling',
    billing_stopped: true,
    settlement_pending: true,
  }, []);
  assert.equal(merged.status, 'settling');
  assert.equal(merged.terminal, true,
    'settlement polling preserves the terminal UI latch until a final status arrives');
});
