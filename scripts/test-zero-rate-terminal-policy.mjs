import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const builtHtml = readFileSync(new URL('../.vercel/output/static/index.html', import.meta.url), 'utf8');
assert.equal(builtHtml, html, 'the built static HTML is byte-identical to the source HTML');
const policyMatch = html.match(/<script id="ownlybiz-rate-and-session-status-policy-20260827">([\s\S]*?)<\/script>/);
assert(policyMatch, 'shared rate and terminal-status policy is installed');

const sandbox = { window: null, Object, Number, String };
sandbox.window = sandbox;
vm.createContext(sandbox);
new vm.Script(policyMatch[1], { filename: 'rate-and-session-status-policy.js' }).runInContext(sandbox);

const rates = sandbox.OB_RATE_POLICY;
const statuses = sandbox.OB_SESSION_STATUS_POLICY;
assert(rates, 'rate policy is exported');
assert(statuses, 'session status policy is exported');

const channels = ['chat', 'voice', 'video'];
const ownerPositiveValues = { chat: 1.25, voice: 2.5, video: 3.75 };
const miniPositiveValues = { chat: 4.25, voice: 5.5, video: 6.75 };
for (const channel of channels) {
  const ownerZero = { [`rate_${channel}`]: 0, [`${channel}_pm`]: 99 };
  const ownerPositive = { [`rate_${channel}`]: ownerPositiveValues[channel] };
  const miniZero = { [`${channel}_pm`]: 0 };
  const miniPositive = { [`${channel}_pm`]: miniPositiveValues[channel] };

  assert.equal(rates.ownerRate(ownerZero, channel), 0,
    `owner ${channel} keeps explicit zero ahead of stale positive aliases`);
  assert.equal(rates.ownerRate(ownerPositive, channel), ownerPositiveValues[channel],
    `owner ${channel} keeps its positive rate`);
  assert.equal(rates.marketplaceRate(ownerZero, miniZero, channel), 0,
    `mini ${channel} zero inherits the owner's true zero effective rate`);
  assert.equal(rates.marketplaceRate(ownerPositive, miniZero, channel), ownerPositiveValues[channel],
    `mini ${channel} zero follows the backend inheritance contract`);
  assert.equal(rates.marketplaceRate(ownerZero, miniPositive, channel), miniPositiveValues[channel],
    `mini ${channel} positive override is preserved over owner zero`);
  assert.equal(rates.marketplaceRate(ownerPositive, miniPositive, channel), miniPositiveValues[channel],
    `mini ${channel} positive override is preserved over owner positive`);
  assert.equal(rates.sessionRate({ rate_per_min: 0 }, ownerPositive, channel), 0,
    `authoritative ${channel} session zero is never replaced with profile pricing`);
}

assert.equal(rates.requiresAuthorization('minute', 0), false,
  'zero-rate pay-per-minute sessions do not require Stripe authorization');
assert.equal(rates.requiresAuthorization('minute', '0.00'), false,
  'string zero also bypasses Stripe authorization');
assert.equal(rates.requiresAuthorization('minute', 0.01), true,
  'positive pay-per-minute sessions still require authorization');
assert.equal(rates.requiresAuthorization('prepaid', 20), false,
  'prepaid behavior remains outside per-minute authorization');

const liveHelpersStart = html.indexOf('function obLiveBookingRate(');
const liveHelpersEnd = html.indexOf('\nfunction openBookingOverlay(', liveHelpersStart);
assert(liveHelpersStart >= 0 && liveHelpersEnd > liveHelpersStart,
  'the authoritative Live Now rate/payment helpers are present');
const liveSteps = [];
const liveLaunches = [];
const liveSandbox = {
  window: null, document: { getElementById: () => null }, Promise, String,
  selectedChannel: { id: 'chat' },
  _bovGoStep(step) { liveSteps.push(step); },
};
liveSandbox.window = liveSandbox;
liveSandbox.OB_RATE_POLICY = rates;
liveSandbox.obCreditCurrentSessionRequestMode = () => 'minute';
liveSandbox._launchSession = (ready) => { liveLaunches.push(ready); };
vm.createContext(liveSandbox);
new vm.Script(html.slice(liveHelpersStart, liveHelpersEnd), { filename: 'live-zero-rate-helpers.js' })
  .runInContext(liveSandbox);
for (const channel of channels) {
  liveSteps.length = 0;
  liveLaunches.length = 0;
  liveSandbox.selectedChannel = { id: channel };
  liveSandbox._currentExpert = { [`rate_${channel}`]: 0, [`${channel}_pm`]: 99 };
  assert.equal(liveSandbox.obLiveMinuteAuthorizationRequired(channel), false,
    `Live Now ${channel} zero does not require authorization`);
  assert.equal(liveSandbox.obContinueLiveBookingAfterLogin(), false,
    `Live Now ${channel} zero bypasses the payment step`);
  await Promise.resolve();
  assert.deepEqual(liveSteps, [3], `Live Now ${channel} zero advances directly to connection`);
  assert.deepEqual(liveLaunches, [true], `Live Now ${channel} zero launches without Stripe`);

  liveSteps.length = 0;
  liveLaunches.length = 0;
  liveSandbox._currentExpert = { [`rate_${channel}`]: ownerPositiveValues[channel] };
  assert.equal(liveSandbox.obLiveMinuteAuthorizationRequired(channel), true,
    `Live Now ${channel} positive rate still requires authorization`);
  assert.equal(liveSandbox.obContinueLiveBookingAfterLogin(), true,
    `Live Now ${channel} positive rate keeps the payment step`);
  await Promise.resolve();
  assert.deepEqual(liveSteps, [2]);
  assert.deepEqual(liveLaunches, []);
}
liveSandbox.obCreditCurrentSessionRequestMode = () => 'prepaid';
liveSandbox._currentExpert = { rate_chat: 0 };
liveSandbox.selectedChannel = { id: 'chat' };
liveSteps.length = 0;
assert.equal(liveSandbox.obContinueLiveBookingAfterLogin(), true,
  'prepaid Live Now behavior remains on its existing payment/credit step');
assert.deepEqual(liveSteps, [2]);

const bflHelpersStart = html.indexOf('function bflEffectiveMinuteRate(){');
const bflHelpersEnd = html.indexOf('\n\nfunction bflUpdateSummary()', bflHelpersStart);
assert(bflHelpersStart >= 0 && bflHelpersEnd > bflHelpersStart,
  'the authoritative Book Later payment helpers are present');
const bflSandbox = { window: null, _bflChannel: 'chat' };
bflSandbox.window = bflSandbox;
bflSandbox.OB_RATE_POLICY = rates;
bflSandbox._bflPaymentMode = 'minute';
vm.createContext(bflSandbox);
new vm.Script(html.slice(bflHelpersStart, bflHelpersEnd), { filename: 'book-later-zero-rate-helpers.js' })
  .runInContext(bflSandbox);
for (const channel of channels) {
  bflSandbox._bflChannel = channel;
  bflSandbox._currentExpert = { [`rate_${channel}`]: 0, [`${channel}_pm`]: 99 };
  assert.equal(bflSandbox.obBookLaterEffectiveMinuteRate(), 0,
    `Book Later ${channel} keeps an explicit zero rate`);
  assert.equal(bflSandbox.obBookLaterMinutePaymentRequired(), false,
    `Book Later ${channel} zero bypasses Stripe`);
  bflSandbox._currentExpert = { [`rate_${channel}`]: ownerPositiveValues[channel] };
  assert.equal(bflSandbox.obBookLaterMinutePaymentRequired(), true,
    `Book Later ${channel} positive rate still requires payment setup`);
}

const bflMountStart = html.indexOf('function mountBflCardElement()');
const bflMountEnd = html.indexOf('\n\nwindow.submitBookForLater', bflMountStart);
assert(bflMountStart >= 0 && bflMountEnd > bflMountStart,
  'the Book Later Stripe mount owner is present');
let bflContextCaptures = 0;
let bflFetches = 0;
let bflStripeLoads = 0;
const bflCardSection = { style: { display: '' } };
const bflMountSandbox = {
  window: null,
  _bflChannel: 'chat', _bflCardElement: null, _bflCardOwnerContext: null,
  document: { getElementById(id) {
    if (id === 'bfl-card-element') return {};
    if (id === 'bfl-card-section') return bflCardSection;
    return null;
  } },
  fetch() { bflFetches += 1; throw new Error('zero-rate Book Later reached payment config'); },
  encodeURIComponent,
};
bflMountSandbox.window = bflMountSandbox;
bflMountSandbox.OB_RATE_POLICY = rates;
bflMountSandbox._bflPaymentMode = 'minute';
bflMountSandbox._currentExpert = { rate_chat: 0 };
bflMountSandbox.OB_CLIENT_CONTEXT = {
  capture() { bflContextCaptures += 1; throw new Error('zero-rate Book Later captured card ownership'); },
};
bflMountSandbox.obEnsureStripe = () => { bflStripeLoads += 1; throw new Error('zero-rate Book Later loaded Stripe'); };
vm.createContext(bflMountSandbox);
new vm.Script(
  html.slice(bflHelpersStart, bflHelpersEnd) + '\n' + html.slice(bflMountStart, bflMountEnd),
  { filename: 'book-later-zero-rate-mount.js' },
).runInContext(bflMountSandbox);
assert.equal(bflMountSandbox.mountBflCardElement(), null,
  'Book Later zero exits before creating any payment owner');
assert.equal(bflCardSection.style.display, 'none');
assert.equal(bflContextCaptures, 0);
assert.equal(bflFetches, 0);
assert.equal(bflStripeLoads, 0);

const terminal = ['cancelled', 'ended', 'completed', 'failed', 'expired', 'declined', 'no_show'];
assert.deepEqual(Array.from(statuses.terminalStatuses), terminal,
  'the exact backend terminal vocabulary is shared');
assert.equal(statuses.isTerminal('canceled'), false,
  'one-l canceled is not silently promoted into the backend contract');

const nonWsSurfaces = ['poll', 'get', 'reload', 'end-response', 'end-reconcile', 'scheduled-join'];
for (const source of nonWsSurfaces) {
  for (const status of terminal) {
    const resolved = statuses.statusFrom({ session: { id: `${source}-${status}`, status } }, source);
    assert.equal(resolved, status, `${source} resolves ${status}`);
    assert.equal(statuses.isTerminal(resolved), true, `${source} closes ${status}`);
  }
}

const eventType = {
  cancelled: 'session_cancelled', ended: 'session_ended', completed: 'session_completed',
  failed: 'session_failed', expired: 'session_expired', declined: 'session_declined', no_show: 'session_no_show',
};
for (const status of terminal) {
  assert.equal(statuses.statusFrom({ type: 'session_snapshot', session: { status } }, 'ws'), status,
    `WebSocket snapshots resolve ${status}`);
  assert.equal(statuses.statusFrom({ type: eventType[status] }, 'ws'), status,
    `WebSocket terminal events resolve ${status}`);
  assert.equal(statuses.statusFrom({ type: eventType[status], status: 'active' }, 'ws'), status,
    `WebSocket ${status} event type remains authoritative over unrelated top-level status`);
}
assert.equal(statuses.statusFrom({ type: 'message', status: 'failed' }, 'ws'), '',
  'a failed chat message cannot be mistaken for a failed session');

const reducerPolicyStart = html.indexOf('  function clientTerminalStatusPolicy(){');
const reducerPolicyEnd = html.indexOf('\n  function normalizeClientReceiptSession', reducerPolicyStart);
const reducerSessionIdStart = html.indexOf('  function clientReceiptSessionId(value){', reducerPolicyEnd);
const reducerSessionIdEnd = html.indexOf('\n  function clientReceiptAuthorityScore', reducerSessionIdStart);
const reducerOwnershipStart = html.indexOf('  function clientTerminalOwnership(payload,source){', reducerSessionIdEnd);
const reducerOwnershipEnd = html.indexOf('\n  function applyAuthoritativeClientTerminal', reducerOwnershipStart);
const reducerStart = html.indexOf('  window.obReduceClientSessionTerminal=function(payload,source){');
const reducerEnd = html.indexOf('\n  function showClientReceiptPending', reducerStart);
assert(reducerPolicyStart >= 0 && reducerPolicyEnd > reducerPolicyStart
  && reducerSessionIdStart >= 0 && reducerSessionIdEnd > reducerSessionIdStart
  && reducerOwnershipStart >= 0 && reducerOwnershipEnd > reducerOwnershipStart
  && reducerStart >= 0 && reducerEnd > reducerStart,
  'the shared terminal reducer is independently testable');
const appliedTerminals = [];
const reducerSandbox = {
  window: null, Object, String,
  applyClientSettlementPending() { throw new Error('terminal state was misrouted as settling'); },
  applyAuthoritativeClientTerminal(payload) { appliedTerminals.push(payload); return payload; },
  clientReceiptSessionId(payload) { return String(payload?.id || payload?.session_id || payload?.session?.id || ''); },
  rememberTerminalSession() {},
};
reducerSandbox.window = reducerSandbox;
reducerSandbox.OB_SESSION_STATUS_POLICY = statuses;
reducerSandbox.obIsTerminalSessionStatus = statuses.isTerminal;
vm.createContext(reducerSandbox);
new vm.Script(
  html.slice(reducerPolicyStart, reducerPolicyEnd) + '\n'
    + html.slice(reducerSessionIdStart, reducerSessionIdEnd) + '\n'
    + html.slice(reducerOwnershipStart, reducerOwnershipEnd) + '\n'
    + html.slice(reducerStart, reducerEnd),
  { filename: 'shared-client-terminal-reducer.js' },
).runInContext(reducerSandbox);
for (const source of nonWsSurfaces) {
  for (const status of terminal) {
    appliedTerminals.length = 0;
    const sid = `${source}-${status}`;
    reducerSandbox._obActiveSessId = sid;
    assert.equal(reducerSandbox.obReduceClientSessionTerminal({ session: { id: sid, status } }, source), true,
      `${source} routes ${status} through the shared reducer`);
    assert.equal(appliedTerminals.length, 1);
    assert.equal(appliedTerminals[0].session.status, status);
  }
}
for (const status of terminal) {
  appliedTerminals.length = 0;
  const sid = `ws-${status}`;
  reducerSandbox._obActiveSessId = sid;
  assert.equal(reducerSandbox.obReduceClientSessionTerminal({ type: eventType[status], session_id: sid }, 'ws'), true,
    `WebSocket ${status} event routes through the shared reducer`);
  assert.equal(appliedTerminals.length, 1);
  assert.equal(appliedTerminals[0].status, status);
}
assert.equal(reducerSandbox.obReduceClientSessionTerminal({ session: { id: 'wrong-spelling', status: 'canceled' } }, 'get'), false,
  'the reducer does not accept the non-contract one-l spelling');
assert.equal(reducerSandbox.obReduceClientSessionTerminal({ type: 'message', status: 'failed' }, 'ws'), false,
  'the reducer does not close a session for a failed chat message');

assert.doesNotMatch(html, /installPricingRateRepair|repairPricingRates/,
  'high-risk pricing repair wrappers are removed');
assert.match(html, /window\.OB_RATE_POLICY\.marketplaceRate\(owner\|\|\{\},mini\|\|\{\},ch\)/,
  'marketplace display and selection use the authoritative effective-rate policy');
for (const channel of channels) {
  assert.match(html, new RegExp(`id="rate-${channel}"[^>]*min="0"`),
    `the owner ${channel} editor accepts an explicit zero rate`);
}
assert.match(html, /function liveRateNumber\(channel\)[\s\S]{0,500}OB_RATE_POLICY\.explicit/,
  'public booking copy accepts zero instead of retaining stale positive text');
assert.match(html, /chat_enabled: getEnabled\('chat'\)[\s\S]{0,180}voice_enabled: getEnabled\('voice'\)[\s\S]{0,180}video_enabled: getEnabled\('video'\)/,
  'saving a zero owner rate does not silently disable that channel');
assert.match(html, /if\(!bflMinutePaymentRequired\(\)\)[\s\S]{0,180}cardSection\.style\.display='none';[\s\S]{0,100}return null;/,
  'zero-rate Book Later never mounts Stripe');
assert.match(html, /bookingController\.view&&bookingController\.view\.required===false\)return null;/,
  'scheduled booking authorization UI obeys backend authorization_required:false');
assert.match(html, /if\(authorizationRequired\)\{[\s\S]*?obGetSessionAuthorizationForRequest\(expertId, channel\)/,
  'only paid minute requests obtain an authorization');
assert.match(html, /var sessionRequestPayload = \{expert_id:expertId,channel:channel,message:'',credit_mode:creditMode,payment_mode:creditMode\};[\s\S]*?var authorizationRequired=/,
  'zero-rate requests retain the normal session request payload without authorization fields');

const requestStart = html.indexOf('var _origBegin=window._beginSession;');
const requestEnd = html.indexOf('window.obCancelWait=function()', requestStart);
assert(requestStart >= 0 && requestEnd > requestStart, 'live request owner is present');
const requestSource = html.slice(requestStart, requestEnd);
assert.doesNotMatch(requestSource, /_httpStatus\s*===\s*409\s*\|\||\/active\|pending\|already\|existing\//,
  '409 responses are not collapsed into a broad already-active message');
for (const code of [
  'client_live_session_exists', 'expert_request_pending', 'expert_capacity_full', 'expert_busy',
  'session_authorization_required', 'prepaid_credit_required', 'session_request_id_conflict',
]) {
  assert.match(html, new RegExp(`${code}:`), `${code} has a specific client message`);
}

const requiredReducerSources = [
  ["'poll'", 'status poll'], ["'apply-ui'", 'GET/UI projection'], ["'get'", 'GET/reload'],
  ["'end-response'", 'End response'], ["'end-reconcile'", 'End reconciliation'],
  ["'ws'", 'WebSocket'], ["'scheduled-join'", 'scheduled join'],
];
for (const [marker, label] of requiredReducerSources) {
  assert.match(html, new RegExp(`obReduceClientSessionTerminal\\([^\\n]*${marker}`),
    `${label} delegates to the shared client terminal reducer`);
}
assert.match(html, /function finishClientTerminalUi\(sess\)[\s\S]*?_obActiveSessId = null;[\s\S]*?_obPendingSessId = null;/,
  'terminal reduction clears active and pending ownership');
assert.match(html, /function closeClientTerminalRuntime\(\)[\s\S]*?OB_RTC[\s\S]*?obResetClientSessionTransport/,
  'terminal reduction stops media and transport');

console.log('zero-rate and shared terminal-policy tests passed');
