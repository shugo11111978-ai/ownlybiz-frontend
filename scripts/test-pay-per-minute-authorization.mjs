import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const controllerMatch = html.match(/<script id="ownlybiz-pay-per-minute-authorization-20260814-js">([\s\S]*?)<\/script>/);
assert(controllerMatch, 'pay-per-minute authorization controller is installed');
const controllerSource = controllerMatch[1];

assert.match(html, /A temporary \$5 authorization may appear to confirm your payment method/,
  'immediate payment page discloses the temporary authorization');
assert.match(html, /Any unused amount is released after the session/,
  'payment page explains release of the unused authorization');
assert.match(html, /your bank may show it as pending briefly/,
  'payment page calmly explains that the released authorization can remain visible temporarily');
assert.match(html, /The \$5 is a temporary authorization, not an extra session charge/,
  'payment page does not describe the hold as a charge or card test');
assert.match(html, />Verify payment &amp; Continue|>Verify payment & Continue/,
  'primary action uses calm payment-confirmation language');
assert.doesNotMatch(html, />Authorize \$5 & Continue/,
  'primary action does not lead with the hold amount');

assert.match(controllerSource, /fetch\(BASE \+ '\/api\/payments\/authorize'/,
  'live flow creates a backend-owned authorization');
assert.match(controllerSource, /var body = \{expert_id:opts\.expertId, channel:opts\.channel, authorization_request_id:state\.requestId\}/,
  'authorization request includes expert, channel, and one client UUID');
assert.match(controllerSource, /body\.marketplace_expert_id = opts\.marketplaceExpertId/,
  'marketplace authorization includes the same selected mini expert');
assert.match(controllerSource, /'live:' \+ opts\.expertId \+ ':' \+ \(opts\.marketplaceExpertId \|\| 'owner'\) \+ ':' \+ opts\.channel/,
  'authorization reuse is scoped to the selected marketplace expert');
assert.doesNotMatch(controllerSource, /authorization_request_id:state\.requestId, amount:/,
  'frontend cannot choose or tamper with the server-controlled amount');
assert.match(controllerSource, /status !== 'requires_capture'/,
  'frontend waits for a real manual-capture authorization');
assert.match(controllerSource, /stripe\.confirmCardPayment\(state\.clientSecret\)/,
  'required issuer authentication is completed in the browser');
assert.match(controllerSource, /if\(state\.inFlight && state\.context === nextContext\) return state\.inFlight/,
  'double clicks share one in-flight authorization');
assert.match(controllerSource, /state\.requestId = state\.requestId \|\| uuid\(\)/,
  'retry retains an idempotent authorization request id');
assert.match(controllerSource, /\/api\/payments\/authorize\/cancel/,
  'unused authorization can be cancelled when the client abandons');
assert.match(controllerSource, /event\.target===bookingOverlay/,
  'clicking the payment-overlay backdrop cancels an unused hold');
assert.match(controllerSource, /event\.key!=='Escape'/,
  'Escape follows the same safe payment-overlay cancellation path');
assert.match(controllerSource, /cancelPendingMainLaunch\(\); state\.abandoned=true/,
  'closing the flow cancels delayed session launch');
assert.match(controllerSource, /state\.phase='cancel_retry'/,
  'an unconfirmed release retains a recoverable state');
assert.match(controllerSource, /if\(state\.phase === 'bound'\) throw new Error\('A payment authorization is already linked/,
  'a restored bound authorization cannot be reused or released as a new hold');
assert.match(controllerSource, /obMarkSessionAuthorizationBound = function\(sessionId\)/,
  'a consumed authorization records the server session it is bound to');
assert.match(controllerSource, /state\.cancellationSessionId=String\(sessionId\|\|''\)/,
  'pending-session cancellation survives a same-tab reload');
assert.match(controllerSource, /String\(saved\.phase\|\|''\)==='binding'&&!state\.cancellationSessionId[\s\S]*state\.phase='ready'/,
  'reload before a live-request response retries the deterministic session request');
assert.match(controllerSource, /code==='expert_busy'[\s\S]*code==='expert_request_pending'/,
  'server-released busy and pending responses are never retried as ready holds');
assert.match(controllerSource, /code==='client_live_session_exists'/,
  'a same-client live-session conflict clears the hold already released by the backend');
assert.match(controllerSource, /Retry release/,
  'an unconfirmed release provides a calm retry action');

assert.match(html, /sessionRequestPayload\.authorization_payment_intent_id = sessionAuthorization\.authorization_payment_intent_id/,
  'session request includes the verified PaymentIntent');
assert.match(html, /sessionRequestPayload\.authorization_request_id = sessionAuthorization\.authorization_request_id/,
  'session request includes the matching idempotency id');
assert.match(html, /obGetSessionAuthorizationForRequest\(expertId, channel\)/,
  'frontend blocks a card-backed live request without a current authorization');
assert.match(controllerSource, /code\.indexOf\('session_authorization_'\)===0/,
  'permanent backend authorization errors trigger safe release handling');
assert.match(html, /if\(creditMode !== 'prepaid'\)/,
  'prepaid credit stays outside card authorization');
assert.doesNotMatch(html, /\/billing-pause|\/billing-resume/,
  'opening a prepaid top-up cannot create free unbilled session time');
assert.match(html, /Billing continues while the session is active/,
  'live top-up copy is truthful that billing does not pause');
assert.doesNotMatch(controllerSource, /window\.fetch\s*=|fetch\s*=\s*function/,
  'controller does not monkey-patch global fetch');
assert.match(controllerSource, /\/api\/sessions\/'\+encodeURIComponent\(sid\)\+'\/decline/,
  'waiting Cancel releases the pending session and its hold server-side');

assert.match(html, /Save your payment method now; the \$5 authorization happens only when it is time to join/,
  'scheduled booking does not place a long-lived hold at booking time');
assert.match(controllerSource, /bookingButton\('ob-booking-auth-submit','Confirm payment & get ready','btn-primary',function\(\)\{authorizeScheduledBooking\(false\);\}\)/,
  'scheduled join action is wired with a real event listener');
assert.match(controllerSource, /if\(opts\.bookingId\) body\.booking_id = opts\.bookingId/,
  'scheduled authorization is scoped to its booking');
for (const field of ['authorization_required', 'authorization_ready', 'authorization_available', 'authorization_available_at', 'authorization_expires_at']) {
  assert(controllerSource.includes(field), `scheduled join honors backend ${field}`);
}
assert.match(controllerSource, /booking_authorization_not_open/,
  'scheduled join handles a not-yet-open authorization window');
assert.match(controllerSource, /booking_authorization_window_closed/,
  'scheduled join handles a closed authorization window');
assert.match(controllerSource, /\/api\/bookings\/'\+encodeURIComponent\(bookingController\.id\)\+'\/authorize/,
  'scheduled authorization is bound before expert start');
assert.match(controllerSource, /var bound=await responseJson\(bindResponse\)[\s\S]*resetState\(\);bookingController\.error=''/,
  'a server-bound scheduled authorization detaches local live-controller state');
assert.match(controllerSource, /session_authorization_required'\?'Waiting for the client to approve/,
  'expert start explains the client authorization gate');
assert.match(controllerSource, /Sign in to confirm payment/,
  'cross-device booking link renders a sign-in state');
assert.match(controllerSource, /Use a different card/,
  'saved-card flow offers a different-card fallback');
assert.match(controllerSource, /\/api\/payments\/methods\/status/,
  'repeat live flow checks server-owned saved-payment readiness');
assert.match(controllerSource, /has_saved_payment_method===true/,
  'saved card is used only after an explicit authenticated server response');
assert.match(controllerSource, /\/api\/payments\/methods\/status'\+\(expertId\?'\?expert_id='\+encodeURIComponent\(expertId\):''\)/,
  'saved-payment readiness is scoped to the current expert and Stripe mode context');
assert.match(controllerSource, /refreshSavedPaymentStatus\(false,expertId\)/,
  'main authorization checks saved-payment readiness for its selected expert');
assert.match(controllerSource, /if\(!expertId\)\{savedPayment\.available=false/,
  'saved-payment readiness is never queried without expert scope');

assert.match(controllerSource, /Session ended - payment failed/,
  'client receipt exposes failed settlement');
assert.match(controllerSource, /Payment failed - card not charged/,
  'receipt does not misrepresent a failed charge as completed payment');
assert.match(controllerSource, /billing_outstanding_amount/,
  'partial-payment receipt uses the actual outstanding balance');
assert.match(controllerSource, /billing_attempted_amount/,
  'failed-payment receipt uses the backend attempted amount');
assert.match(controllerSource, /resetReceiptPaymentDecoration\(screen\)/,
  'receipt state is reset before every success, partial, or failure decoration');
assert.match(controllerSource, /pill\.textContent=kind==='partial'\?'Balance due':'Payment failed'/,
  'expert client activity does not show a failed payment as green Completed');
assert.match(controllerSource, /paid\.toFixed\(2\)\+' paid · '[\s\S]*due\.toFixed\(2\)\+' due'/,
  'partial-payment activity shows both the captured amount and remaining balance');
assert.doesNotMatch(html, /Card authorized|Card on file - authorized|only be charged after the session/,
  'legacy SetupIntent-only authorization claims are removed');

assert.match(html, /type="button" class="ob-booking-selected-close" aria-label="Close payment and session setup"/,
  'payment close control has button semantics and an accessible name');
assert.match(html, /width:44px;height:44px;min-width:44px;min-height:44px/,
  'payment close control meets a mobile touch target');
assert.match(html, /#bov-connect-steps\{flex-wrap:wrap\}/,
  'connection-status chips wrap on narrow layouts');
assert.match(html, /#booking-join-overlay\{overflow-y:auto/,
  'scheduled-session overlay can scroll on short mobile screens');
assert.match(html, /id="bov-connect-title"[^>]*tabindex="-1"|tabindex="-1"[^>]*id="bov-connect-title"/,
  'connecting transition has a programmatic focus target');

assert.doesNotMatch(html, /payExplainer\.innerHTML\s*=|bpe\.innerHTML\s*=/,
  'expert names are not interpolated into disclosure HTML');
assert.match(html, /obSetPayPerMinuteDisclosure\(payExplainer, name\)/,
  'marketplace expert disclosure uses the safe text renderer');

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const next = force === undefined ? !this.values.has(value) : !!force;
    if (next) this.values.add(value); else this.values.delete(value);
    return next;
  }
}

class FakeStyle {
  setProperty(name, value) { this[name] = value; }
}

class FakeText {
  constructor(text) { this.nodeType = 3; this.textContent = String(text); this.parentNode = null; }
}

class FakeElement {
  constructor(tagName = 'div') {
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = new FakeStyle();
    this.dataset = {};
    this.attributes = {};
    this.classList = new FakeClassList();
    this.listeners = {};
    this.hidden = false;
    this.disabled = false;
    this._text = '';
    this.focusCount = 0;
  }
  set id(value) { this.attributes.id = String(value); }
  get id() { return this.attributes.id || ''; }
  set className(value) {
    this.attributes.class = String(value);
    this.classList = new FakeClassList();
    String(value).split(/\s+/).filter(Boolean).forEach((part) => this.classList.add(part));
  }
  get className() { return this.attributes.class || ''; }
  set textContent(value) { this._text = String(value ?? ''); this.children = []; }
  get textContent() { return this.children.length ? this.children.map((child) => child.textContent).join('') : this._text; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  append(...children) { children.forEach((child) => this.appendChild(typeof child === 'string' ? new FakeText(child) : child)); }
  replaceChildren(...children) { this.children.forEach((child) => { child.parentNode = null; }); this.children = []; this._text = ''; this.append(...children); }
  insertBefore(child, before) {
    child.parentNode = this;
    const index = before ? this.children.indexOf(before) : -1;
    if (index >= 0) this.children.splice(index, 0, child); else this.children.push(child);
    return child;
  }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this); this.parentNode = null; }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'id') this.id = value; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  click() { if (this.listeners.click) return this.listeners.click({ target: this }); }
  focus() { this.focusCount += 1; }
  get firstElementChild() { return this.children.find((child) => child.nodeType === 1) || null; }
  get lastElementChild() { return [...this.children].reverse().find((child) => child.nodeType === 1) || null; }
  _matches(selector) {
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }
  querySelector(selector) {
    for (const child of this.children) {
      if (child.nodeType !== 1) continue;
      if (child._matches(selector)) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
  closest(selector) {
    let current = this;
    while (current) { if (current._matches && current._matches(selector)) return current; current = current.parentNode; }
    return null;
  }
}

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

function createHarness({ search = '', session = {}, fetchImpl } = {}) {
  const body = new FakeElement('body');
  const documentElement = new FakeElement('html');
  documentElement.appendChild(body);
  const eventHandlers = {};
  const document = {
    body,
    documentElement,
    readyState: 'complete',
    createElement: (tag) => new FakeElement(tag),
    createTextNode: (text) => new FakeText(text),
    getElementById(id) { return body.id === id ? body : body.querySelector(`#${id}`); },
    querySelector(selector) { return body.querySelector(selector); },
    querySelectorAll() { return []; },
    addEventListener(name, handler) { eventHandlers[`document:${name}`] = handler; },
  };
  let nextTimer = 1;
  const timers = new Map();
  const intervals = new Map();
  const sandbox = {
    __OB_TEST_HOOKS__: true,
    document,
    location: { search, pathname: '/', hostname: 'staging.example', href: `https://staging.example/${search}` },
    sessionStorage: storage(session),
    localStorage: storage(),
    URLSearchParams,
    URL,
    Uint8Array,
    crypto: { getRandomValues(array) { for (let i = 0; i < array.length; i += 1) array[i] = (i * 29 + 7) & 255; return array; } },
    fetch: fetchImpl || (async () => { throw new Error('offline'); }),
    setTimeout(handler) { const id = nextTimer++; timers.set(id, handler); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(handler) { const id = nextTimer++; intervals.set(id, handler); return id; },
    clearInterval(id) { intervals.delete(id); },
    getComputedStyle: () => ({ display: 'block' }),
    alert() {},
    console,
  };
  sandbox.window = sandbox;
  sandbox.window.location = sandbox.location;
  sandbox.window.crypto = sandbox.crypto;
  sandbox.window.addEventListener = (name, handler) => { eventHandlers[`window:${name}`] = handler; };
  vm.createContext(sandbox);
  new vm.Script(controllerSource, { filename: 'pay-per-minute-controller.js' }).runInContext(sandbox);
  return {
    sandbox,
    document,
    body,
    timers,
    runTimers() {
      let guard = 0;
      while (timers.size && guard++ < 50) {
        const pending = [...timers.entries()];
        timers.clear();
        for (const [, handler] of pending) handler();
      }
    },
  };
}

// Executable XSS regression: an expert name remains a text node, never markup.
const disclosureAssignment = html.match(/window\.obSetPayPerMinuteDisclosure = function\(element, expertName\)\{[\s\S]*?\n  \};/);
assert(disclosureAssignment, 'safe disclosure renderer is defined');
const disclosureDocument = { createElement: (tag) => new FakeElement(tag), createTextNode: (text) => new FakeText(text) };
const disclosureSandbox = { window: {}, document: disclosureDocument };
vm.createContext(disclosureSandbox);
new vm.Script(disclosureAssignment[0]).runInContext(disclosureSandbox);
const disclosureTarget = new FakeElement('div');
const maliciousName = '<img src=x onerror="globalThis.pwned=true">';
disclosureSandbox.window.obSetPayPerMinuteDisclosure(disclosureTarget, maliciousName);
assert.equal(disclosureTarget.children.length, 2, 'disclosure contains one strong element and one text node');
assert.equal(disclosureTarget.children[1].nodeType, 3, 'untrusted expert name is rendered as text');
assert(disclosureTarget.textContent.includes(maliciousName), 'untrusted characters remain literal text');
assert.equal(disclosureSandbox.pwned, undefined, 'untrusted disclosure text cannot execute');

const baseHarness = createHarness();
const hooks = baseHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
assert(hooks, 'controller exposes test hooks only when explicitly enabled');

// RFC 4122 fallback UUID, including version and variant bits.
const id = hooks.uuid();
assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  'UUID fallback is RFC 4122 version 4');

// Backend schedule window is fail-closed, and an expired cached authorization is not trusted.
const now = Date.now();
const unavailableData = {
  authorization_required: true,
  authorization_ready: false,
  authorization_available: false,
  authorization_available_at: Math.floor((now + 60_000) / 1000),
  authorization_expires_at: null,
  booking: { payment_mode: 'minute', booking_type: 'permin' },
};
const unavailableView = hooks.bookingAuthorizationView(unavailableData, now);
assert.equal(unavailableView.available, false);
assert(unavailableView.availableAt > now, 'authorization opening time is interpreted as epoch seconds');
const expiredData = {
  authorization_required: true,
  authorization_ready: true,
  authorization_available: true,
  authorization_expires_at: Math.floor((now - 1_000) / 1000),
  booking: { payment_mode: 'minute', booking_type: 'permin' },
};
const expiredView = hooks.bookingAuthorizationView(expiredData, now);
assert.equal(expiredView.expired, true);
assert.equal(expiredView.ready, false, 'expired authorization is refreshed instead of cached as ready');

// Cross-device booking without a token renders a real sign-in action.
const loginHarness = createHarness({ search: '?booking=booking-1' });
const loginOverlay = new FakeElement('div'); loginOverlay.id = 'booking-join-overlay';
const loginPanel = new FakeElement('div'); loginPanel.appendChild(new FakeElement('div')); loginOverlay.appendChild(loginPanel); loginHarness.body.appendChild(loginOverlay);
loginHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.renderBookingCard(null, {});
assert.equal(loginHarness.document.getElementById('ob-booking-auth-heading').textContent, 'Sign in to confirm payment');
assert(loginHarness.document.getElementById('ob-booking-auth-signin').listeners.click, 'sign-in CTA has an event listener');

// Unavailable and expired scheduled states render without an early authorization bypass.
const scheduleHarness = createHarness({ search: '?booking=booking-2', session: { ob_t: 'client-token' } });
const scheduleOverlay = new FakeElement('div'); scheduleOverlay.id = 'booking-join-overlay';
const schedulePanel = new FakeElement('div'); schedulePanel.appendChild(new FakeElement('div')); scheduleOverlay.appendChild(schedulePanel); scheduleHarness.body.appendChild(scheduleOverlay);
const scheduleHooks = scheduleHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
scheduleHooks.bookingController.view = scheduleHooks.bookingAuthorizationView(unavailableData, now);
scheduleHooks.renderBookingCard(unavailableData, {});
assert.equal(scheduleHarness.document.getElementById('ob-booking-auth-heading').textContent, 'Payment confirmation opens closer to your session');
assert.equal(scheduleHarness.document.getElementById('ob-booking-auth-submit'), null, 'authorization CTA is absent before the window opens');
scheduleHooks.bookingController.view = scheduleHooks.bookingAuthorizationView(expiredData, now);
scheduleHooks.renderBookingCard(expiredData, {});
assert(scheduleHarness.document.getElementById('ob-booking-auth-submit'), 'expired hold requires a new confirmation');
assert(scheduleHarness.document.getElementById('ob-booking-session-authorization').textContent.includes('previous temporary authorization expired'));

// Receipt UI resets all failure-only state before a later successful session.
const receiptScreen = new FakeElement('section'); receiptScreen.id = 'screen-A5';
const receiptTitle = new FakeElement('div'); receiptTitle.className = 'receipt-title'; receiptTitle.textContent = 'Session Complete!';
const receiptSub = new FakeElement('div'); receiptSub.className = 'receipt-sub'; receiptSub.textContent = 'How was your experience?';
const receiptIcon = new FakeElement('div'); receiptIcon.className = 'receipt-icon'; receiptIcon.textContent = '⭐';
const receiptCard = new FakeElement('div'); receiptCard.className = 'receipt-card';
const totalRow = new FakeElement('div'); totalRow.className = 'receipt-row';
const totalLabel = new FakeElement('span'); totalLabel.textContent = 'Total session cost';
const totalValue = new FakeElement('span'); totalValue.id = 'receipt-total'; totalValue.textContent = '$1.25';
totalRow.append(totalLabel, totalValue); receiptCard.appendChild(totalRow);
const statusRow = new FakeElement('div'); statusRow.id = 'receipt-payment-status-row'; statusRow.append(new FakeElement('span'), new FakeElement('span'));
const paidRow = new FakeElement('div'); paidRow.id = 'receipt-amount-paid-row'; paidRow.append(new FakeElement('span'), new FakeElement('span'));
receiptCard.insertBefore(statusRow, totalRow); receiptCard.insertBefore(paidRow, totalRow);
receiptScreen.append(receiptIcon, receiptTitle, receiptSub, receiptCard); baseHarness.body.appendChild(receiptScreen);
hooks.resetReceiptPaymentDecoration(receiptScreen); // cache clean defaults
receiptScreen.classList.add('ob-payment-failed'); receiptTitle.textContent = 'Session ended - payment failed'; receiptSub.textContent = 'Failure'; receiptIcon.textContent = '×'; totalLabel.textContent = 'Amount due';
statusRow.hidden = false; statusRow.style.display = 'grid'; statusRow.children[1].textContent = 'Payment failed';
paidRow.hidden = false; paidRow.style.display = 'grid'; paidRow.children[1].textContent = '$1.00';
hooks.resetReceiptPaymentDecoration(receiptScreen);
assert.equal(receiptTitle.textContent, 'Session Complete!');
assert.equal(receiptSub.textContent, 'How was your experience?');
assert.equal(receiptIcon.textContent, '⭐');
assert.equal(totalLabel.textContent, 'Total session cost');
assert.equal(statusRow.hidden, true);
assert.equal(paidRow.hidden, true);

// Closing between approval and the delayed launch cannot open pre-session UI.
for (const elementId of ['bov-pay-btn', 'bov-step-pay-badge', 'bov-step-conn-badge', 'bov-connect-title', 'bov-connect-sub']) {
  const element = new FakeElement('div'); element.id = elementId; baseHarness.body.appendChild(element);
}
let launchCount = 0;
baseHarness.sandbox._bovGoStep = () => {};
baseHarness.sandbox._launchSession = () => { launchCount += 1; };
hooks.state.phase = 'ready'; hooks.state.abandoned = false;
hooks.completeMainAuthorizationUi();
hooks.state.abandoned = true;
hooks.cancelPendingMainLaunch();
baseHarness.runTimers();
assert.equal(launchCount, 0, 'cancelled authorization never reaches pre-session launch');

// Failed release stays recoverable and persisted; bound reloads are never treated as releasable holds.
hooks.state.phase = 'ready'; hooks.state.paymentIntentId = 'pi_test'; hooks.state.requestId = id; hooks.state.context = 'live:expert:chat';
const cancelResult = await baseHarness.sandbox.obCancelSessionAuthorization('test_network_failure');
assert.equal(cancelResult.confirmed, false);
assert.equal(hooks.state.phase, 'cancel_retry');
assert(baseHarness.sandbox.sessionStorage.getItem('ob_live_authorization'), 'unconfirmed release state is preserved');
const savedAt = Date.now();
const boundHarness = createHarness({ session: { ob_live_authorization: JSON.stringify({
  context: 'live:expert:chat', requestId: id, paymentIntentId: 'pi_bound', amount: 5,
  expertId: 'expert', channel: 'chat', bookingId: '', phase: 'bound',
  recoveryAction: 'session', cancellationSessionId: 'sess_bound', savedAt,
}) } });
assert.equal(boundHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.phase, 'bound',
  'same-tab reload preserves a bound session without offering an unsafe release');
assert.equal(boundHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.recoveryAction, 'session',
  'bound reload preserves session cancellation recovery instead of attempting to release a consumed hold');
assert.equal(boundHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.cancellationSessionId, 'sess_bound',
  'bound reload preserves the server session id needed for cancellation');
const bindingHarness = createHarness({ session: { ob_live_authorization: JSON.stringify({
  context: 'live:expert:owner:chat', requestId: id, paymentIntentId: 'pi_binding', amount: 5,
  expertId: 'expert', channel: 'chat', bookingId: '', phase: 'binding',
  recoveryAction: 'authorization', cancellationSessionId: '', savedAt,
}) } });
assert.equal(bindingHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.phase, 'ready',
  'reload before session response retries the same deterministic request instead of trapping the hold');
assert.equal(bindingHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.requestId, id,
  'binding recovery retains the idempotent authorization/session request id');
const scheduledBoundHarness = createHarness({ session: { ob_live_authorization: JSON.stringify({
  context: 'booking:booking-bound', requestId: id, paymentIntentId: 'pi_booking_bound', amount: 5,
  expertId: 'expert', channel: 'chat', bookingId: 'booking-bound', phase: 'bound',
  recoveryAction: 'authorization', cancellationSessionId: '', savedAt,
}) } });
assert.equal(scheduledBoundHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.phase, 'idle',
  'a durable scheduled bind does not block a later immediate live authorization');
assert.equal(scheduledBoundHarness.sandbox.sessionStorage.getItem('ob_live_authorization'), null,
  'scheduled bound controller state is detached after server confirmation');
const readyHarness = createHarness({ session: { ob_live_authorization: JSON.stringify({
  context: 'live:expert:chat', requestId: id, paymentIntentId: 'pi_ready', amount: 5,
  expertId: 'expert', channel: 'chat', bookingId: '', phase: 'ready', savedAt,
}) } });
assert.equal(readyHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.phase, 'cancel_retry',
  'same-tab reload preserves an unbound hold for confirmed release');

assert.equal(hooks.expertBillingLabel({ payment_mode: 'prepaid' }, 0), 'Prepaid credit selected');
assert.equal(hooks.expertBillingLabel({ credit_mode: 'prepaid' }, 1), 'Client is in free intro time · prepaid credit selected');
assert.doesNotMatch(hooks.expertBillingLabel({ payment_mode: 'prepaid' }, 0), /\$5 authorization/,
  'expert prepaid label never claims a card authorization');
assert.equal(hooks.expertBillingLabel({ payment_authorization_id: id }, 0), '$5 authorization approved',
  'expert billing reads the server authorization record without relying on a legacy payment_method field');

// Saved-card readiness cache and Stripe mode are scoped to the selected expert.
const statusRequests = [];
const statusHarness = createHarness({ fetchImpl: async (url) => {
  statusRequests.push(String(url));
  return { ok: true, json: async () => ({ has_saved_payment_method: true, mode: statusRequests.length === 1 ? 'test' : 'live' }) };
} });
statusHarness.sandbox.sessionStorage.setItem('ob_t', 'client-token');
const statusHooks = statusHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
await statusHooks.refreshSavedPaymentStatus(true, 'expert-test');
assert(statusRequests[0].endsWith('/api/payments/methods/status?expert_id=expert-test'));
assert.equal(statusHooks.savedPayment.mode, 'test');
await statusHooks.refreshSavedPaymentStatus(false, 'expert-live');
assert(statusRequests[1].endsWith('/api/payments/methods/status?expert_id=expert-live'), 'expert change bypasses the prior readiness cache');
assert.equal(statusHooks.savedPayment.mode, 'live', 'mode follows the scoped backend response');

let scriptCount = 0;
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  scriptCount += 1;
  if (match[1].trim()) new vm.Script(match[1], { filename: `index.html#script-${scriptCount}` });
}
assert(scriptCount > 0, 'all inline scripts were syntax parsed');

console.log('pay-per-minute authorization frontend smoke: ok');
