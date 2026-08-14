import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const controllerMatch = html.match(/<script id="ownlybiz-pay-per-minute-authorization-20260814-js">([\s\S]*?)<\/script>/);
assert(controllerMatch, 'pay-per-minute authorization controller is installed');
const controllerSource = controllerMatch[1];
const authContextStart = html.indexOf('window.obAuthPrincipalFingerprint =');
const authContextEnd = html.indexOf('window.obPublicLoaderCanFetchProfile =', authContextStart);
assert(authContextStart >= 0 && authContextEnd > authContextStart, 'central client identity context is installed');
const authContextSource = html.slice(authContextStart, authContextEnd);
const clientAuthUiStart = html.indexOf('var _clientUser = null;');
const clientAuthUiEnd = html.indexOf('\nfunction toggleClientMenu()', clientAuthUiStart);
assert(clientAuthUiStart >= 0 && clientAuthUiEnd > clientAuthUiStart, 'client profile identity owner is installed');
const clientAuthUiSource = html.slice(clientAuthUiStart, clientAuthUiEnd);
const stagePolishMatch = html.match(/<script id="ownlybiz-v3-stage-polish-20260505">([\s\S]*?)<\/script>/);
assert(stagePolishMatch, 'public-site visual polish routine is installed');
const stagePolishSource = stagePolishMatch[1];
const rtcModuleStart = html.indexOf('window.OB_RTC = (function(){');
const rtcModuleEnd = html.indexOf('\n\nwindow._handleRTCMessage=', rtcModuleStart);
assert(rtcModuleStart >= 0 && rtcModuleEnd > rtcModuleStart, 'WebRTC module is installed');
const rtcModuleSource = html.slice(rtcModuleStart, rtcModuleEnd);
const walletMarker = html.indexOf('if(window._obClientWalletGoogleApprovalInstalled) return;');
const walletModuleStart = html.lastIndexOf('(function(){', walletMarker);
const walletCoreEnd = html.indexOf('\n  function completeClientProviderAuth', walletMarker);
assert(walletModuleStart >= 0 && walletCoreEnd > walletModuleStart, 'client wallet owner is installed');
const walletCoreSource = html.slice(walletModuleStart, walletCoreEnd) + '\n})();';
const creditMarker = html.indexOf('if(window.__obCreditWalletV1) return;');
const creditModuleStart = html.lastIndexOf('(function(){', creditMarker);
const creditModuleEnd = html.indexOf('\n})();\n</script>', creditMarker);
assert(creditModuleStart >= 0 && creditModuleEnd > creditModuleStart, 'prepaid-credit client owner is installed');
const creditModuleSource = html.slice(creditModuleStart, creditModuleEnd + 6);
const onDemandMatch = html.match(/<script id="ownlybiz-on-demand-readings-20260607">([\s\S]*?)<\/script>/);
assert(onDemandMatch, 'On-Demand lifecycle owner is installed');
const onDemandSource = onDemandMatch[1];
const bflOwnerStart = html.indexOf('function bflCurrentExpertId(){');
const bflOwnerEnd = html.indexOf('\n\nfunction mountBflCardElement()', bflOwnerStart);
assert(bflOwnerStart >= 0 && bflOwnerEnd > bflOwnerStart, 'book-later immutable target owner is installed');
const bflOwnerSource = html.slice(bflOwnerStart, bflOwnerEnd);

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
assert.match(controllerSource, /var body = \{expert_id:opts\.expertId, channel:opts\.channel, authorization_request_id:flowRequestId\}/,
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
assert.match(controllerSource, /if\(state\.inFlight && state\.context === nextContext && state\.accountKey===flowAccountKey\) return state\.inFlight/,
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
assert.match(controllerSource, /obMarkSessionAuthorizationBound = function\(sessionId,authorizationRequestId\)/,
  'a consumed authorization records the server session it is bound to');
assert.match(controllerSource, /authorizationRequestId&&String\(authorizationRequestId\)!==state\.requestId/,
  'a late response from the previous account cannot mutate a new authorization request');
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
assert.match(controllerSource, /\/api\/bookings\/'\+encodeURIComponent\(context\.bookingId\)\+'\/authorize/,
  'scheduled authorization is bound before expert start');
assert.match(controllerSource, /var bound=await responseJson\(bindResponse\);if\(!bindResponse\.ok\)[\s\S]*detachServerBoundBookingAuthorization\(context,auth\);\s*if\(!bookingControllerOwns\(context\)\|\|bookingController\.actionSeq!==actionSeq\)return/,
  'a server-bound scheduled authorization detaches matching local state before the exact UI-controller gate');
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
assert.match(controllerSource, /savedPayment\.accountKey!==accountKey/,
  'saved-payment readiness is bound to the current authenticated account');
assert.match(controllerSource, /saved\.accountKey\|\|String\(saved\.accountKey\)!==ownerKey/,
  'persisted authorization state is rejected unless its auth identity matches');
assert.match(html, /clientContext\.register\('payment-authorization'/,
  'payment authorization is owned by the central client identity lifecycle');
assert.doesNotMatch(html, /addEventListener\(['"]ob:auth-session-(?:will-change|changed)/,
  'account isolation has no duplicate legacy auth-event listeners');
for (const scope of [
  'marketing-login','expert-signup-v2','bov-login','bov-signup','client-inline-login','expert-signup',
  'bfl-signup','bfl-login','client-modal-login','client-modal-signup','google-client-sso','apple-client-sso',
  'on-demand-public-','on-demand-private-login','profile-email-change',
]) {
  assert(html.includes(scope), `central auth-entry coordination covers ${scope}`);
}
assert.equal((html.match(/window\.openClientChat\s*=\s*function/g) || []).length, 1,
  'one modern client-chat authority remains after legacy poller removal');
assert.doesNotMatch(html, /syncClientSessionFromBackend|_origOpenClientChatCritical|criticalOpenClientChat/,
  'superseded client-chat synchronization wrappers are deleted');
assert.equal((controllerSource.match(/\/api\/bookings\/'\+encodeURIComponent\(context\.bookingId\)\+'\/join'/g) || []).length, 1,
  'one scheduled-booking controller owns authenticated join readiness');
assert.match(html, /obInstallAuthProfileUpdate\(\{email:email\},data,attempt\)/,
  'email-change credential refreshes are routed through the central identity owner');
assert.doesNotMatch(html, /function (?:updateStoredUserEmail|syncStoredUserEmail)\(email, data\)\{[\s\S]{0,800}store\.setItem\('ob_t', data\.token\)/,
  'email-change helpers cannot write refreshed credentials around the central identity owner');
assert.match(authContextSource, /sessionStorage\.getItem\('ob_support_session'\)==='1'\)return/,
  'cross-tab client auth reconciliation is disabled inside an active support session');
assert.doesNotMatch(html, /var oldOpenBooking = window\.openBookingOverlay|var oldBovSignup = window\.bovSignup|var oldBovAuthorize = window\.bovAuthorize/,
  'prepaid credit does not install no-op compatibility wrappers around booking authorities');
assert.match(html, /state\.bookingCreditRequest\+=1;state\.bookLaterCreditRequest\+=1/,
  'prepaid-credit teardown invalidates both account-scoped balance requests');
assert.match(html, /window\._obSelectedPaymentMode='minute';window\._obActiveSessionCreditMode='minute';window\._obSessionPromoCode=''/,
  'prepaid-credit teardown restores neutral client payment and promo modes');
assert.match(controllerSource, /\/api\/payments\/methods\/status'\+\(expertId\?'\?expert_id='\+encodeURIComponent\(expertId\):''\)/,
  'saved-payment readiness is scoped to the current expert and Stripe mode context');
assert.match(controllerSource, /refreshSavedPaymentStatus\(false,expertId\)/,
  'main authorization checks saved-payment readiness for its selected expert');
assert.match(controllerSource, /if\(!expertId\)\{savedPayment\.available=false/,
  'saved-payment readiness is never queried without expert scope');
assert.match(controllerSource, /methods\/status'[\s\S]*\{cache:'no-store',headers:\{Authorization:'Bearer '\+tok\}\}/,
  'authenticated saved-payment readiness bypasses the HTTP cache');
assert.match(controllerSource, /enhanceBookingJoinOverlay\(\{force:true,focus:true\}\)/,
  'scheduled booking payment readiness is re-rendered after an auth identity change');
assert.match(controllerSource, /\/join',\{cache:'no-store',headers:\{Authorization:'Bearer '\+context\.token\}\}/,
  'authenticated scheduled-booking readiness bypasses the HTTP cache');
assert.match(controllerSource, /rtc\.resetClientContext\(\)/,
  'client auth teardown delegates pending RTC startup and local media cleanup to one RTC owner');
assert.match(controllerSource, /'_clientTimerInterval','_obClientElapsedInterval','_bookingPollTimer'/,
  'client auth teardown stops elapsed and scheduled-session timers');
assert.match(rtcModuleSource, /clientIdentity:role==='client'.*OB_CLIENT_CONTEXT\.capture\('rtc-start'/,
  'RTC startup captures the central client identity that requested media');
assert.match(rtcModuleSource, /acquiredStream=await navigator\.mediaDevices\.getUserMedia[\s\S]*_stopMediaStream\(acquiredStream\);return false/,
  'a media stream arriving after RTC invalidation is immediately stopped');

const liveRequestHandlerStart = html.indexOf("fetch(BASE+'/api/sessions/request'");
const liveRequestHandlerEnd = html.indexOf('window.obCancelWait=function()', liveRequestHandlerStart);
assert(liveRequestHandlerStart >= 0 && liveRequestHandlerEnd > liveRequestHandlerStart,
  'live session response handler is present');
const liveRequestHandler = html.slice(liveRequestHandlerStart, liveRequestHandlerEnd);
const liveSuccessGate = liveRequestHandler.indexOf('obClientSessionRequestContinuationAllowed(creditMode,continuationRequestId,t)');
assert(liveSuccessGate >= 0 && liveSuccessGate < liveRequestHandler.indexOf('if(!d._httpOk)') && liveSuccessGate < liveRequestHandler.indexOf('_sessId=d.session.id'),
  'late live-session success and API error responses are rejected before any session or UI mutation');
assert(liveRequestHandler.includes('discardDetachedClientSession(d,t);return;'),
  'a late successful session response is declined with the originating credential instead of becoming an orphan session');
const liveCatchStart = liveRequestHandler.lastIndexOf('.catch(function()');
assert(liveCatchStart >= 0 && liveRequestHandler.indexOf('obClientSessionRequestContinuationAllowed(creditMode,continuationRequestId,t)', liveCatchStart) < liveRequestHandler.indexOf("obCancelWait();alert('Network error", liveCatchStart),
  'late live-session network errors are rejected before clearing the current account UI');
assert.match(controllerSource, /clientContext\.isTokenCurrent\(requestToken\)/,
  'live continuation is bound to the stable authenticated principal that sent the request');
assert.match(html, /var pollToken=tok\(\)[\s\S]*clientTokenCurrent\(pollToken\)/,
  'pending live-session polling cannot continue across a true identity change');
assert.match(html, /_obStagingV2ClientToken&&!clientTokenCurrent\(ws\._obStagingV2ClientToken\)/,
  'queued client WebSocket events are bound to the stable client identity');

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
  get nodeValue() { return this.textContent; }
  set nodeValue(value) { this.textContent = String(value ?? ''); }
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
  get childNodes() { return this.children; }
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
    atob,
    Uint8Array,
    crypto: { getRandomValues(array) { for (let i = 0; i < array.length; i += 1) array[i] = (i * 29 + 7) & 255; return array; } },
    fetch: fetchImpl || (async () => { throw new Error('offline'); }),
    setTimeout(handler) { const id = nextTimer++; timers.set(id, handler); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(handler) { const id = nextTimer++; intervals.set(id, handler); return id; },
    clearInterval(id) { intervals.delete(id); },
    getComputedStyle: () => ({ display: 'block' }),
    alert() {},
    AbortController,
    CustomEvent: class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    console,
  };
  sandbox.window = sandbox;
  sandbox.window.location = sandbox.location;
  sandbox.window.crypto = sandbox.crypto;
  sandbox.window.addEventListener = (name, handler) => { eventHandlers[`window:${name}`] = handler; };
  sandbox.window.dispatchEvent = (event) => { const handler = eventHandlers[`window:${event.type}`]; if (handler) handler(event); return true; };
  sandbox.obResolveAuthToken = () => sandbox.sessionStorage.getItem('ob_t') || sandbox.localStorage.getItem('ob_t') || sandbox.localStorage.getItem('ob_client_token') || '';
  vm.createContext(sandbox);
  new vm.Script(authContextSource, { filename: 'client-identity-context.js' }).runInContext(sandbox);
  new vm.Script(controllerSource, { filename: 'pay-per-minute-controller.js' }).runInContext(sandbox);
  return {
    sandbox,
    document,
    body,
    timers,
    intervals,
    runTimers() {
      let guard = 0;
      while (timers.size && guard++ < 50) {
        const pending = [...timers.entries()];
        timers.clear();
        for (const [, handler] of pending) handler();
      }
    },
    dispatchStorage(key, newValue) {
      const handler = eventHandlers['window:storage'];
      if (handler) handler({ key, newValue });
    },
  };
}

async function settleAsync(turns = 16) { for (let turn = 0; turn < turns; turn += 1) await Promise.resolve(); }
async function changeAuth(harness, nextToken) {
  if (nextToken) harness.sandbox.obSyncAuthTokenKeys(nextToken);
  else harness.sandbox.obClearAuthSession();
  await settleAsync();
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

const authTokenFor = (id, extra = {}) => `e30.${Buffer.from(JSON.stringify({ id, role: 'client', ...extra })).toString('base64url')}.signature`;
const clientAToken = authTokenFor('client-a');
const clientARotatedToken = authTokenFor('client-a', { nonce: 'rotated' });
const clientAKey = `principal:${JSON.stringify(['client-a', 'client', ''])}`;
const clientBToken = authTokenFor('client-b');
const clientBRotatedToken = authTokenFor('client-b', { nonce: 'rotated' });
const clientBKey = `principal:${JSON.stringify(['client-b', 'client', ''])}`;
const expertToken = `e30.${Buffer.from(JSON.stringify({ id: 'expert-a', role: 'expert' })).toString('base64url')}.signature`;
const adminToken = `e30.${Buffer.from(JSON.stringify({ id: 'admin-a', role: 'admin' })).toString('base64url')}.signature`;
const supportToken = `e30.${Buffer.from(JSON.stringify({ id: 'support-a', role: 'support' })).toString('base64url')}.signature`;

// Every login/signup entry point shares one monotonic attempt owner. A faster later
// response wins even when it came from a different surface, and logout invalidates all.
const authAttemptHarness = createHarness();
const slowMainLogin = authAttemptHarness.sandbox.obBeginAuthAttempt('client-modal-login');
const fastBflSignup = authAttemptHarness.sandbox.obBeginAuthAttempt('bfl-signup');
assert.equal(slowMainLogin.signal.aborted, true, 'starting BFL signup aborts an older main-login attempt');
const fastBflContext = authAttemptHarness.sandbox.obCommitAuthAttempt(
  fastBflSignup, clientBToken, { id: 'client-b', role: 'client', email: 'b@example.test' },
);
assert(fastBflContext, 'the latest cross-surface signup response may install its account');
assert.equal(authAttemptHarness.sandbox.obCommitAuthAttempt(
  slowMainLogin, clientAToken, { id: 'client-a', role: 'client', email: 'a@example.test' },
), null, 'a slower main-login response cannot reinstall client A after client B');
assert.equal(authAttemptHarness.sandbox.OB_CLIENT_CONTEXT.token(), clientBToken,
  'the faster BFL signup remains the authoritative identity');

const slowBovSignup = authAttemptHarness.sandbox.obBeginAuthAttempt('bov-signup');
const fastOnDemandLogin = authAttemptHarness.sandbox.obBeginAuthAttempt('on-demand-public-login');
const fastOnDemandContext = authAttemptHarness.sandbox.obCommitAuthAttempt(
  fastOnDemandLogin, clientAToken, { id: 'client-a', role: 'client' },
);
assert(fastOnDemandContext, 'a later On Demand login can intentionally replace the prior account');
assert.equal(authAttemptHarness.sandbox.obCommitAuthAttempt(
  slowBovSignup, clientBToken, { id: 'client-b', role: 'client' },
), null, 'a slower BOV signup cannot overwrite a newer On Demand login');
const invalidatedByLogout = authAttemptHarness.sandbox.obBeginAuthAttempt('client-modal-signup');
authAttemptHarness.sandbox.obClearAuthSession();
assert.equal(authAttemptHarness.sandbox.obCommitAuthAttempt(
  invalidatedByLogout, clientBToken, { id: 'client-b', role: 'client' },
), null, 'logout invalidates a pending signup response before it can reinstall an account');
assert.equal(authAttemptHarness.sandbox.OB_CLIENT_CONTEXT.token(), '', 'logout remains authoritative over late auth responses');

// A support/admin impersonation tab owns its session in sessionStorage. Client auth
// changes from another tab must not replace that token, role, or private dashboard state.
const supportHarness = createHarness({ session: { ob_t: supportToken, ob_support_session: '1' } });
supportHarness.document.readyState = 'loading';
new vm.Script(onDemandSource, { filename: 'on-demand-support-lifecycle.js' }).runInContext(supportHarness.sandbox);
const supportModal = new FakeElement('div'); supportModal.id = 'ob-od-public-modal'; supportModal.classList.add('show');
const supportBody = new FakeElement('div'); supportBody.id = 'ob-od-public-body'; supportBody.textContent = 'Support-owned dashboard content';
supportModal.appendChild(supportBody); supportHarness.body.appendChild(supportModal);
supportHarness.sandbox.localStorage.setItem('ob_od_pending_checkout', JSON.stringify({ request_id: 'support-visible-state' }));
supportHarness.sandbox.localStorage.setItem('ob_t', clientAToken);
supportHarness.dispatchStorage('ob_t', clientAToken);
await settleAsync();
assert.equal(supportHarness.sandbox.OB_CLIENT_CONTEXT.token(), supportToken, 'client storage event cannot replace the support token');
assert.equal(supportHarness.sandbox.OB_CLIENT_CONTEXT.capture('support-check').role, 'support', 'client storage event cannot replace the support role');
assert.equal(supportBody.textContent, 'Support-owned dashboard content', 'support On-Demand DOM is untouched by client cross-tab auth');
assert(supportHarness.sandbox.localStorage.getItem('ob_od_pending_checkout'), 'support-owned state is not cleared by an ignored client auth event');

// The On-Demand owner erases only client-private reading and checkout state on a
// true account transition. It never delegates that private teardown to support/expert UI.
const onDemandClientHarness = createHarness({ session: { ob_t: clientAToken } });
onDemandClientHarness.document.readyState = 'loading';
new vm.Script(onDemandSource, { filename: 'on-demand-client-lifecycle.js' }).runInContext(onDemandClientHarness.sandbox);
const clientReadingModal = new FakeElement('div'); clientReadingModal.id = 'ob-od-public-modal'; clientReadingModal.classList.add('show');
const clientReadingBody = new FakeElement('div'); clientReadingBody.id = 'ob-od-public-body'; clientReadingBody.textContent = 'Client A private reading and payment status';
clientReadingModal.appendChild(clientReadingBody); onDemandClientHarness.body.appendChild(clientReadingModal);
onDemandClientHarness.sandbox.localStorage.setItem('ob_od_pending_checkout', JSON.stringify({ request_id: 'client-a-request' }));
onDemandClientHarness.sandbox.__obOnDemandReturnParams = { checkout_session_id: 'checkout-client-a' };
await changeAuth(onDemandClientHarness, clientBToken);
assert.equal(clientReadingBody.textContent, '', 'A-to-B transition clears client A private reading/status DOM');
assert.equal(clientReadingModal.classList.contains('show'), false, 'A-to-B transition hides the client-private On-Demand modal');
assert.equal(onDemandClientHarness.sandbox.localStorage.getItem('ob_od_pending_checkout'), null, 'A-to-B transition removes client A pending checkout state');
assert.equal(onDemandClientHarness.sandbox.__obOnDemandReturnParams, null, 'A-to-B transition removes client A checkout return intent');

const onDemandExpertHarness = createHarness({ session: { ob_t: expertToken } });
onDemandExpertHarness.document.readyState = 'loading';
new vm.Script(onDemandSource, { filename: 'on-demand-expert-lifecycle.js' }).runInContext(onDemandExpertHarness.sandbox);
const expertPrivateBody = new FakeElement('div'); expertPrivateBody.id = 'ob-od-public-body'; expertPrivateBody.textContent = 'Expert dashboard request';
onDemandExpertHarness.body.appendChild(expertPrivateBody);
onDemandExpertHarness.sandbox.localStorage.setItem('ob_od_pending_checkout', 'expert-unrelated-state');
await changeAuth(onDemandExpertHarness, adminToken);
assert.equal(expertPrivateBody.textContent, 'Expert dashboard request', 'expert/admin transition does not run client-private DOM teardown');
assert.equal(onDemandExpertHarness.sandbox.localStorage.getItem('ob_od_pending_checkout'), 'expert-unrelated-state', 'expert/admin transition does not clear client checkout storage through the client owner');

// A BFL operation is immutable across account/expert/date/channel/mode/promo inputs.
// Same-principal JWT rotation keeps it valid, but any booking target change invalidates it.
const bflOwnerHarness = createHarness({ session: { ob_t: clientAToken } });
bflOwnerHarness.sandbox._currentExpert = { id: 'expert-bfl-a', user_id: 'expert-bfl-a', slug: 'expert-bfl-a' };
bflOwnerHarness.sandbox._currentExpertId = 'expert-bfl-a';
bflOwnerHarness.sandbox._bflPaymentMode = 'minute';
bflOwnerHarness.sandbox._obSessionPromoCode = 'PROMO-A';
new vm.Script('var _bflSelectedDate="2026-09-10",_bflSelectedTime="14:30",_bflChannel="chat",_bflCardElement=null;\n' + bflOwnerSource,
  { filename: 'book-later-owner.js' }).runInContext(bflOwnerHarness.sandbox);
const bflOperation = bflOwnerHarness.sandbox.OB_CLIENT_CONTEXT.capture('book-later-submit', {
  expertId: 'expert-bfl-a', expertSlug: 'expert-bfl-a', date: '2026-09-10', time: '14:30',
  channel: 'chat', paymentMode: 'minute', promoCode: 'PROMO-A',
});
assert.equal(bflOwnerHarness.sandbox.obBflTestHooks.operationCurrent(bflOperation), true, 'captured BFL target begins current');
await changeAuth(bflOwnerHarness, clientARotatedToken);
assert.equal(bflOwnerHarness.sandbox.obBflTestHooks.operationCurrent(bflOperation), true, 'same-principal credential rotation preserves the immutable BFL operation');
vm.runInContext('_bflChannel="video"', bflOwnerHarness.sandbox);
assert.equal(bflOwnerHarness.sandbox.obBflTestHooks.operationCurrent(bflOperation), false, 'channel switch invalidates the prior BFL operation');
vm.runInContext('_bflChannel="chat";_bflSelectedDate="2026-09-11"', bflOwnerHarness.sandbox);
assert.equal(bflOwnerHarness.sandbox.obBflTestHooks.operationCurrent(bflOperation), false, 'date switch invalidates the prior BFL operation');
vm.runInContext('_bflSelectedDate="2026-09-10"', bflOwnerHarness.sandbox);
bflOwnerHarness.sandbox._bflPaymentMode = 'prepaid';
assert.equal(bflOwnerHarness.sandbox.obBflTestHooks.operationCurrent(bflOperation), false, 'payment-mode switch invalidates the prior BFL operation');
bflOwnerHarness.sandbox._bflPaymentMode = 'minute';
bflOwnerHarness.sandbox._obSessionPromoCode = 'PROMO-B';
assert.equal(bflOwnerHarness.sandbox.obBflTestHooks.operationCurrent(bflOperation), false, 'promo switch invalidates the prior BFL operation');
bflOwnerHarness.sandbox._obSessionPromoCode = 'PROMO-A';
bflOwnerHarness.sandbox._currentExpert = { id: 'expert-bfl-b', user_id: 'expert-bfl-b', slug: 'expert-bfl-b' };
bflOwnerHarness.sandbox._currentExpertId = 'expert-bfl-b';
assert.equal(bflOwnerHarness.sandbox.obBflTestHooks.operationCurrent(bflOperation), false, 'expert navigation invalidates the prior BFL operation');

// A refreshed JWT returned by profile/email settings is installed atomically through the
// central context, so every payment, transport, RTC, and private-data owner sees one credential.
const profileRefreshHarness = createHarness({ session: {
  ob_t: clientAToken,
  ob_u: JSON.stringify({ id: 'client-a', role: 'client', name: 'Client A', email: 'old@example.test' }),
} });
const profileRefreshBefore = profileRefreshHarness.sandbox.OB_CLIENT_CONTEXT.capture('profile-refresh-before');
const profileRefreshAttempt = profileRefreshHarness.sandbox.obBeginAuthAttempt('profile-email-change');
profileRefreshHarness.sandbox.obInstallAuthProfileUpdate(
  { email: 'new@example.test' },
  { token: clientARotatedToken, user: { id: 'client-a', role: 'client', name: 'Client A' } },
  profileRefreshAttempt,
);
await settleAsync();
const profileRefreshAfter = profileRefreshHarness.sandbox.OB_CLIENT_CONTEXT.capture('profile-refresh-after');
assert.equal(profileRefreshAfter.token, clientARotatedToken, 'profile email refresh updates the central credential in the initiating tab');
assert.equal(profileRefreshAfter.identityGeneration, profileRefreshBefore.identityGeneration, 'profile email refresh remains a same-principal credential rotation');
assert.equal(profileRefreshAfter.credentialGeneration, profileRefreshBefore.credentialGeneration + 1, 'profile email refresh advances the shared credential generation once');
assert.equal(profileRefreshHarness.sandbox.sessionStorage.getItem('ob_t'), clientARotatedToken, 'profile email refresh persists the same credential exposed by the central context');
assert.equal(JSON.parse(profileRefreshHarness.sandbox.sessionStorage.getItem('ob_u')).email, 'new@example.test', 'profile and credential are persisted atomically');

// Prepaid-credit teardown invalidates late A renderers and removes A balances/modes before B.
const creditResetHarness = createHarness({ session: { ob_t: clientAToken } });
creditResetHarness.document.readyState = 'loading';
new vm.Script(creditModuleSource, { filename: 'prepaid-credit-owner.js' }).runInContext(creditResetHarness.sandbox);
const creditResetHooks = creditResetHarness.sandbox.obCreditClientContextTestHooks;
assert(creditResetHooks, 'prepaid-credit owner exposes teardown hooks only in the test harness');
creditResetHooks.state.bookingCreditRequest = 4;
creditResetHooks.state.bookLaterCreditRequest = 9;
creditResetHooks.state.bookingPayMode = 'topup';
creditResetHooks.state.bookLaterPayMode = 'prepaid';
creditResetHarness.sandbox._obSelectedPaymentMode = 'prepaid';
creditResetHarness.sandbox._obActiveSessionCreditMode = 'prepaid';
creditResetHarness.sandbox._obSessionPromoCode = 'CLIENT_A_ONLY';
creditResetHarness.sandbox._bflPaymentMode = 'prepaid';
const bookingCreditChoice = new FakeElement('div'); bookingCreditChoice.id = 'ob-credit-booking-choice'; bookingCreditChoice.dataset.obCreditRequest = '4'; bookingCreditChoice.textContent = 'Client A balance $75.00';
const bookLaterCreditChoice = new FakeElement('div'); bookLaterCreditChoice.id = 'ob-credit-bfl-choice'; bookLaterCreditChoice.dataset.obCreditRequest = '9'; bookLaterCreditChoice.textContent = 'Client A balance $75.00';
const clientCreditBar = new FakeElement('div'); clientCreditBar.id = 'ob-credit-session-bar-screen-A4'; clientCreditBar.textContent = 'Client A credit $75.00';
const creditModal = new FakeElement('div'); creditModal.id = 'ob-credit-modal'; creditModal.style.display = 'flex';
const creditModalBalance = new FakeElement('div'); creditModalBalance.id = 'ob-credit-modal-balance'; creditModalBalance.textContent = 'Current balance: $75.00';
const creditModalSummary = new FakeElement('div'); creditModalSummary.id = 'ob-credit-modal-summary'; creditModalSummary.textContent = 'Client A total'; creditModalSummary.style.display = 'block';
creditResetHarness.body.append(bookingCreditChoice, bookLaterCreditChoice, clientCreditBar, creditModal, creditModalBalance, creditModalSummary);
const baseCreditQuery = creditResetHarness.document.querySelectorAll;
creditResetHarness.document.querySelectorAll = (selector) => selector === '[id^="ob-credit-session-bar-"]' ? [clientCreditBar] : baseCreditQuery(selector);
creditResetHooks.reset();
assert.equal(creditResetHooks.state.bookingCreditRequest, 5, 'teardown invalidates a late booking-balance renderer');
assert.equal(creditResetHooks.state.bookLaterCreditRequest, 10, 'teardown invalidates a late book-later balance renderer');
assert.equal(bookingCreditChoice.dataset.obCreditRequest, 'cancelled', 'detached booking renderer cannot pass its old request gate');
assert.equal(bookLaterCreditChoice.dataset.obCreditRequest, 'cancelled', 'detached book-later renderer cannot pass its old request gate');
assert.equal(bookingCreditChoice.parentNode, null, 'teardown removes client A booking balance from the DOM');
assert.equal(bookLaterCreditChoice.parentNode, null, 'teardown removes client A book-later balance from the DOM');
assert.equal(clientCreditBar.parentNode, null, 'teardown removes client A active-session credit balance');
assert.equal(creditResetHarness.sandbox._obSelectedPaymentMode, 'minute', 'teardown restores neutral pay-by-minute mode');
assert.equal(creditResetHarness.sandbox._obActiveSessionCreditMode, 'minute', 'teardown clears client A active prepaid mode');
assert.equal(creditResetHarness.sandbox._obSessionPromoCode, '', 'teardown clears client A promo selection');
assert.equal(creditModal.style.display, 'none', 'teardown hides client A prepaid checkout');
assert.equal(creditModalBalance.textContent, 'Loading balance...', 'teardown scrubs client A modal balance copy');
assert.equal(creditModalSummary.textContent, '', 'teardown scrubs client A modal summary');

// Credit summary reads are deduplicated by stable principal and, when a JWT rotates
// during the await, refresh once with the current credential before rendering.
let resolveOldSummary;
const summaryRequests = [];
const summaryRotationHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: (url, init = {}) => {
  const request = { url: String(url), authorization: init.headers?.Authorization || '' };
  summaryRequests.push(request);
  if(request.url.includes('/api/credits/experts/expert-credit-rotation/client')) {
    if(request.authorization === `Bearer ${clientAToken}`) return new Promise((resolve) => { resolveOldSummary = resolve; });
    return Promise.resolve({ ok: true, json: async () => ({ balance: 37, settings: { is_enabled: true, amounts: [20, 40] } }) });
  }
  if(request.url.includes('/api/payments/methods/status')) return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) });
  return Promise.resolve({ ok: true, json: async () => ({}) });
} });
summaryRotationHarness.document.readyState = 'loading';
new vm.Script(creditModuleSource, { filename: 'credit-summary-rotation.js' }).runInContext(summaryRotationHarness.sandbox);
summaryRotationHarness.sandbox._currentExpertId = 'expert-credit-rotation';
const rotatingSummary = summaryRotationHarness.sandbox.obCreditClientContextTestHooks.loadClientCreditSummary();
await settleAsync();
assert(resolveOldSummary, 'client A credit summary is paused before credential rotation');
await changeAuth(summaryRotationHarness, clientARotatedToken);
resolveOldSummary({ ok: true, json: async () => ({ balance: 12, settings: { is_enabled: true, amounts: [10] } }) });
const currentSummary = await rotatingSummary;
assert.equal(currentSummary.balance, 37, 'same-principal rotation renders the summary fetched with the current credential, not a stale response');
assert.equal(summaryRotationHarness.sandbox.obCreditClientContextTestHooks.state.summary.balance, 37, 'current credit balance is retained in the shared owner');
const creditSummaryRequests = summaryRequests.filter((request) => request.url.includes('/api/credits/experts/expert-credit-rotation/client'));
assert.deepEqual(creditSummaryRequests.map((request) => request.authorization), [`Bearer ${clientAToken}`, `Bearer ${clientARotatedToken}`],
  'summary retry advances from the originating credential to the current same-principal credential exactly once');

// Opening a top-up stays attached to the stable principal while its balance awaits a
// rotated credential. The modal resolves with authoritative data and never invents $0.
let resolveTopupSummary;
const topupRequests = [];
const topupRotationHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: (url, init = {}) => {
  const request = { url: String(url), authorization: init.headers?.Authorization || '' }; topupRequests.push(request);
  if(request.url.includes('/api/credits/experts/expert-topup-rotation/client')) {
    if(request.authorization === `Bearer ${clientAToken}`) return new Promise((resolve) => { resolveTopupSummary = resolve; });
    return Promise.resolve({ ok: true, json: async () => ({ balance: 48, settings: { is_enabled: true, amounts: [25, 50] } }) });
  }
  if(request.url.includes('/api/payments/methods/status')) return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) });
  return Promise.resolve({ ok: true, json: async () => ({}) });
} });
topupRotationHarness.document.readyState = 'loading';
topupRotationHarness.document.head = new FakeElement('head');
new vm.Script(creditModuleSource, { filename: 'credit-topup-rotation.js' }).runInContext(topupRotationHarness.sandbox);
topupRotationHarness.sandbox._currentExpertId = 'expert-topup-rotation';
const topupModal = new FakeElement('div'); topupModal.id = 'ob-credit-modal';
for (const id of ['ob-credit-modal-balance','ob-credit-modal-amounts','ob-credit-session-pause-note','ob-credit-modal-summary','ob-credit-payment-element','ob-credit-modal-error','ob-credit-modal-primary']) {
  const element = new FakeElement(id === 'ob-credit-modal-primary' ? 'button' : 'div'); element.id = id; topupModal.appendChild(element);
}
topupRotationHarness.body.appendChild(topupModal);
const openingTopup = topupRotationHarness.sandbox.obCreditOpenTopup('manual', 25);
await settleAsync();
assert(resolveTopupSummary, 'top-up waits on client A balance before rotation');
await changeAuth(topupRotationHarness, clientARotatedToken);
resolveTopupSummary({ ok: true, json: async () => ({ balance: 4, settings: { is_enabled: true, amounts: [10] } }) });
await openingTopup;
const topupBalance = topupRotationHarness.document.getElementById('ob-credit-modal-balance');
assert(topupBalance.textContent.includes('$48.00'), 'top-up modal resolves with the current-credential balance');
assert.equal(topupBalance.textContent.includes('$0.00'), false, 'top-up rotation never renders a false zero balance');
assert.equal(topupRotationHarness.sandbox.obCreditClientContextTestHooks.state.amount, 25, 'top-up keeps its immutable selected amount across rotation');
assert.equal(topupRotationHarness.sandbox.obCreditClientContextTestHooks.state.paymentMounting, true, 'top-up proceeds to checkout preparation instead of remaining unresolved');

// A true principal change rejects an outstanding summary instead of retrying it with B.
let resolveAccountASummary;
const accountChangeSummaryRequests = [];
const accountChangeSummaryHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: (url, init = {}) => {
  const request = { url: String(url), authorization: init.headers?.Authorization || '' }; accountChangeSummaryRequests.push(request);
  if(request.url.includes('/api/credits/experts/expert-account-change/client')) return new Promise((resolve) => { resolveAccountASummary = resolve; });
  if(request.url.includes('/api/payments/methods/status')) return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) });
  return Promise.resolve({ ok: true, json: async () => ({}) });
} });
accountChangeSummaryHarness.document.readyState = 'loading';
new vm.Script(creditModuleSource, { filename: 'credit-summary-account-change.js' }).runInContext(accountChangeSummaryHarness.sandbox);
accountChangeSummaryHarness.sandbox._currentExpertId = 'expert-account-change';
const accountASummary = accountChangeSummaryHarness.sandbox.obCreditClientContextTestHooks.loadClientCreditSummary();
await settleAsync();
await changeAuth(accountChangeSummaryHarness, clientBToken);
resolveAccountASummary({ ok: true, json: async () => ({ balance: 99, settings: { is_enabled: true } }) });
assert.equal(await accountASummary, null, 'client A summary is rejected after A-to-B identity change');
assert.equal(accountChangeSummaryHarness.sandbox.obCreditClientContextTestHooks.state.summary, null, 'client A balance cannot enter client B state');
assert.equal(accountChangeSummaryRequests.filter((request) => request.url.includes('/api/credits/experts/expert-account-change/client')).length, 1,
  'A-to-B transition never retries client A summary with client B credentials');

// Promo previews own an immutable amount, purchase context, cache key, and request
// sequence. A stale response cannot apply a discount or remount a newer checkout.
let resolveOldAmountPromo;
let resolveOldContextPromo;
let resolveOldSequencePromo;
let promoPreviewCall = 0;
const promoHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: (url, init = {}) => {
  if(String(url).includes('/api/credits/promotions/preview')) {
    promoPreviewCall += 1;
    const body = JSON.parse(init.body || '{}');
    if(promoPreviewCall === 1) return new Promise((resolve) => { resolveOldAmountPromo = resolve; });
    if(promoPreviewCall === 3) return new Promise((resolve) => { resolveOldContextPromo = resolve; });
    if(promoPreviewCall === 4) return new Promise((resolve) => { resolveOldSequencePromo = resolve; });
    return Promise.resolve({ ok: true, json: async () => ({ promo: { code: promoPreviewCall === 5 ? 'LATEST' : 'SAVE', percent_off: 20, discount_amount: body.amount * 0.2 } }) });
  }
  return Promise.resolve({ ok: true, json: async () => ({}) });
} });
promoHarness.document.readyState = 'loading';
promoHarness.document.head = new FakeElement('head');
new vm.Script(creditModuleSource, { filename: 'credit-promo-owner.js' }).runInContext(promoHarness.sandbox);
promoHarness.sandbox._currentExpertId = 'expert-promo-owner';
const promoHooks = promoHarness.sandbox.obCreditClientContextTestHooks;
promoHooks.state.context = 'manual'; promoHooks.state.amount = 20;
const promoInput = new FakeElement('input'); promoInput.id = 'ob-credit-modal-promo'; promoInput.value = 'SAVE'; promoHarness.body.appendChild(promoInput);
const staleAmountPreview = promoHarness.sandbox.obCreditApplyPromo();
await settleAsync();
promoHarness.sandbox.obCreditSelectAmount(50);
const mountAfterAmountChange = promoHooks.state.mountSeq;
resolveOldAmountPromo({ ok: true, json: async () => ({ promo: { code: 'OLD20', percent_off: 20, discount_amount: 4 } }) });
await staleAmountPreview;
assert.equal(promoHooks.state.promo, null, 'old-amount promo response cannot mutate the new amount');
assert.equal(promoHooks.state.mountSeq, mountAfterAmountChange, 'old-amount promo response cannot remount the new checkout');
await promoHarness.sandbox.obCreditApplyPromo();
assert.equal(promoHooks.state.promo.code, 'SAVE', 'current-amount promo response applies normally');
promoHarness.sandbox.obCreditSelectAmount(30); promoHooks.state.context = 'manual';
const staleContextPreview = promoHarness.sandbox.obCreditApplyPromo();
await settleAsync();
promoHooks.state.context = 'session';
const mountAfterContextChange = promoHooks.state.mountSeq;
resolveOldContextPromo({ ok: true, json: async () => ({ promo: { code: 'OLD-CONTEXT', percent_off: 30, discount_amount: 9 } }) });
await staleContextPreview;
assert.equal(promoHooks.state.promo, null, 'old purchase-context promo response cannot mutate the active checkout');
assert.equal(promoHooks.state.mountSeq, mountAfterContextChange, 'old purchase-context promo response cannot remount the active checkout');
promoHooks.state.context = 'manual'; promoInput.value = 'FIRST';
const staleSequencePreview = promoHarness.sandbox.obCreditApplyPromo();
await settleAsync();
promoInput.value = 'LATEST';
await promoHarness.sandbox.obCreditApplyPromo();
const mountAfterLatestPreview = promoHooks.state.mountSeq;
assert.equal(promoHooks.state.promo.code, 'LATEST', 'latest same-target promo request owns the checkout');
resolveOldSequencePromo({ ok: true, json: async () => ({ promo: { code: 'FIRST', percent_off: 5, discount_amount: 1.5 } }) });
await staleSequencePreview;
assert.equal(promoHooks.state.promo.code, 'LATEST', 'older request sequence cannot replace the latest promo');
assert.equal(promoHooks.state.mountSeq, mountAfterLatestPreview, 'older request sequence cannot remount the latest checkout');

const baseHarness = createHarness({ session: { ob_t: clientAToken } });
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
const boundHarness = createHarness({ session: { ob_t: clientAToken, ob_live_authorization: JSON.stringify({
  context: 'live:expert:chat', requestId: id, paymentIntentId: 'pi_bound', amount: 5,
  expertId: 'expert', channel: 'chat', bookingId: '', phase: 'bound',
  recoveryAction: 'session', cancellationSessionId: 'sess_bound', accountKey: clientAKey, savedAt,
}) } });
assert.equal(boundHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.phase, 'bound',
  'same-tab reload preserves a bound session without offering an unsafe release');
assert.equal(boundHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.recoveryAction, 'session',
  'bound reload preserves session cancellation recovery instead of attempting to release a consumed hold');
assert.equal(boundHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.cancellationSessionId, 'sess_bound',
  'bound reload preserves the server session id needed for cancellation');
const bindingHarness = createHarness({ session: { ob_t: clientAToken, ob_live_authorization: JSON.stringify({
  context: 'live:expert:owner:chat', requestId: id, paymentIntentId: 'pi_binding', amount: 5,
  expertId: 'expert', channel: 'chat', bookingId: '', phase: 'binding',
  recoveryAction: 'authorization', cancellationSessionId: '', accountKey: clientAKey, savedAt,
}) } });
assert.equal(bindingHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.phase, 'ready',
  'reload before session response retries the same deterministic request instead of trapping the hold');
assert.equal(bindingHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.requestId, id,
  'binding recovery retains the idempotent authorization/session request id');
const scheduledBoundHarness = createHarness({ session: { ob_t: clientAToken, ob_live_authorization: JSON.stringify({
  context: 'booking:booking-bound', requestId: id, paymentIntentId: 'pi_booking_bound', amount: 5,
  expertId: 'expert', channel: 'chat', bookingId: 'booking-bound', phase: 'bound',
  recoveryAction: 'authorization', cancellationSessionId: '', accountKey: clientAKey, savedAt,
}) } });
assert.equal(scheduledBoundHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.phase, 'idle',
  'a durable scheduled bind does not block a later immediate live authorization');
assert.equal(scheduledBoundHarness.sandbox.sessionStorage.getItem('ob_live_authorization'), null,
  'scheduled bound controller state is detached after server confirmation');
const readyHarness = createHarness({ session: { ob_t: clientAToken, ob_live_authorization: JSON.stringify({
  context: 'live:expert:chat', requestId: id, paymentIntentId: 'pi_ready', amount: 5,
  expertId: 'expert', channel: 'chat', bookingId: '', phase: 'ready', accountKey: clientAKey, savedAt,
}) } });
assert.equal(readyHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.phase, 'cancel_retry',
  'same-tab reload preserves an unbound hold for confirmed release');
const mismatchedOwnerHarness = createHarness({ session: { ob_t: clientBToken, ob_live_authorization: JSON.stringify({
  context: 'live:expert:chat', requestId: id, paymentIntentId: 'pi_wrong_owner', amount: 5,
  expertId: 'expert', channel: 'chat', bookingId: '', phase: 'ready', accountKey: clientAKey, savedAt,
}) } });
assert.equal(mismatchedOwnerHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.phase, 'idle',
  'persisted authorization from client A is discarded when client B is authenticated');
assert.equal(mismatchedOwnerHarness.sandbox.sessionStorage.getItem('ob_live_authorization'), null,
  'cross-account persisted authorization cannot survive restore');

assert.equal(hooks.expertBillingLabel({ payment_mode: 'prepaid' }, 0), 'Prepaid credit selected');
assert.equal(hooks.expertBillingLabel({ credit_mode: 'prepaid' }, 1), 'Client is in free intro time · prepaid credit selected');
assert.doesNotMatch(hooks.expertBillingLabel({ payment_mode: 'prepaid' }, 0), /\$5 authorization/,
  'expert prepaid label never claims a card authorization');
assert.equal(hooks.expertBillingLabel({ payment_authorization_id: id }, 0), '$5 authorization approved',
  'expert billing reads the server authorization record without relying on a legacy payment_method field');

// Saved-card readiness cache and Stripe mode are scoped to the selected expert.
const statusRequests = [];
const statusHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: async (url, init = {}) => {
  statusRequests.push({ url: String(url), cache: init.cache });
  return { ok: true, json: async () => ({ has_saved_payment_method: true, mode: statusRequests.length === 1 ? 'test' : 'live' }) };
} });
const statusHooks = statusHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
await statusHooks.refreshSavedPaymentStatus(true, 'expert-test');
assert(statusRequests[0].url.endsWith('/api/payments/methods/status?expert_id=expert-test'));
assert.equal(statusRequests[0].cache, 'no-store', 'saved-payment status is always fetched fresh for the authenticated account');
assert.equal(statusHooks.savedPayment.mode, 'test');
await statusHooks.refreshSavedPaymentStatus(false, 'expert-live');
assert(statusRequests[1].url.endsWith('/api/payments/methods/status?expert_id=expert-live'), 'expert change bypasses the prior readiness cache');
assert.equal(statusHooks.savedPayment.mode, 'live', 'mode follows the scoped backend response');

// Executable account-isolation regression: A has a saved card, logs out, then B signs up.
const identityRequests = [];
const identityHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: async (url, init = {}) => {
  const request = { url: String(url), authorization: init.headers?.Authorization || '' };
  identityRequests.push(request);
  if (request.url.includes('/api/payments/authorize/cancel')) return { ok: true, json: async () => ({ released: true }) };
  const isClientA = request.authorization === `Bearer ${clientAToken}`;
  return { ok: true, json: async () => ({ has_saved_payment_method: isClientA, mode: 'test' }) };
} });
identityHarness.sandbox._currentExpertId = 'expert-account-isolation';
const identityHooks = identityHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
assert.equal(identityHooks.accountKeyForToken(clientAToken), clientAKey);
assert.equal(identityHooks.accountKeyForToken(clientBToken), clientBKey);
await identityHooks.refreshSavedPaymentStatus(true, 'expert-account-isolation');
assert.equal(identityHooks.savedPayment.available, true, 'client A receives its saved-payment readiness');
assert.equal(identityHooks.savedPayment.useSaved, true, 'client A may use its own saved card');

identityHooks.state.phase = 'ready';
identityHooks.state.context = 'live:expert-account-isolation:owner:chat';
identityHooks.state.paymentIntentId = 'pi_client_a';
identityHooks.state.requestId = id;
identityHooks.state.accountKey = clientAKey;
identityHarness.sandbox.sessionStorage.setItem('ob_live_authorization', JSON.stringify({ accountKey: clientAKey }));
let clearedCardElements = 0;
identityHarness.sandbox._bovPaymentMethodId = 'pm_client_a';
identityHarness.sandbox._bovCardElement = { clear() { clearedCardElements += 1; } };
let closedClientSockets = 0;
const clientSocketA = { readyState: 1, onopen() {}, onmessage() {}, onerror() {}, onclose() {}, close() { closedClientSockets += 1; } };
const genericSocketA = { readyState: 1, onopen() {}, onmessage() {}, onerror() {}, onclose() {}, close() { closedClientSockets += 1; } };
identityHarness.sandbox._obClientWs = clientSocketA;
identityHarness.sandbox._obWs = genericSocketA;
identityHarness.sandbox._obClientSessionPoller = 901;
identityHarness.sandbox._obClientLiveSessionToken = clientAToken;
identityHarness.sandbox._bflClientToken = clientAToken;
identityHarness.sandbox._obActiveSessId = 'session-client-a';
identityHarness.sandbox._obPendingSessId = 'pending-client-a';
identityHarness.sandbox._pendingSid = 'pending-client-a';
identityHarness.sandbox._sessId = 'session-client-a';
identityHarness.sandbox._sid = 'session-client-a';
identityHarness.sandbox._obClientSessionSnapshot = { id: 'session-client-a' };
const identityPayButton = new FakeElement('button'); identityPayButton.id = 'bov-pay-btn'; identityPayButton.disabled = true; identityPayButton.textContent = 'Verifying saved payment...';
const identityPayError = new FakeElement('div'); identityPayError.id = 'bov-card-error'; identityPayError.textContent = 'Client A payment error'; identityPayError.style.display = 'block';
identityHarness.body.append(identityPayButton, identityPayError);
const identityMessages = new FakeElement('div'); identityMessages.id = 'paid-chat-messages'; identityMessages.appendChild(new FakeElement('div')); identityMessages.children[0].textContent = 'Client A private message';
const identityTyping = new FakeElement('div'); identityTyping.id = 'ob-client-typing'; identityTyping.textContent = 'Client A is typing...';
const identityInput = new FakeElement('input'); identityInput.id = 'paid-chat-input'; identityInput.value = 'Client A unsent private text';
const identityPrivateFields = {};
for (const fieldId of ['bov-pass','clm-login-email','clm-login-pass','clm-signup-name','clm-signup-email','clm-signup-pass']) {
  const field = new FakeElement('input'); field.id = fieldId; field.value = `client-a-${fieldId}`; identityPrivateFields[fieldId] = field; identityHarness.body.appendChild(field);
}
const identityClmError = new FakeElement('div'); identityClmError.id = 'clm-error'; identityClmError.textContent = 'Client A login failed'; identityClmError.style.display = 'block';
const identityClmStatus = new FakeElement('div'); identityClmStatus.id = 'clm-status'; identityClmStatus.textContent = 'Client A private status'; identityClmStatus.style.display = 'block';
const identityBflLogged = new FakeElement('div'); identityBflLogged.id = 'bfl-logged-in'; identityBflLogged.textContent = 'Logged in as Client A'; identityBflLogged.style.display = 'block';
const identityBflLoggedName = new FakeElement('span'); identityBflLoggedName.id = 'bfl-logged-name'; identityBflLoggedName.textContent = 'Client A';
const identityBflTabs = new FakeElement('div'); identityBflTabs.id = 'bfl-auth-tabs'; identityBflTabs.style.display = 'none';
const identityBflSignup = new FakeElement('div'); identityBflSignup.id = 'bfl-signup-fields'; identityBflSignup.style.display = 'none';
const identityBflLogin = new FakeElement('div'); identityBflLogin.id = 'bfl-login-fields'; identityBflLogin.style.display = 'block';
const identityBflSignupTab = new FakeElement('button'); identityBflSignupTab.id = 'bfl-tab-signup';
const identityBflLoginTab = new FakeElement('button'); identityBflLoginTab.id = 'bfl-tab-login'; identityBflLoginTab.classList.add('active');
identityHarness.body.append(identityClmError, identityClmStatus, identityBflLogged, identityBflLoggedName, identityBflTabs, identityBflSignup, identityBflLogin, identityBflSignupTab, identityBflLoginTab);
const identityReceipt = new FakeElement('section'); identityReceipt.id = 'screen-A5'; identityReceipt.classList.add('active', 'ob-payment-failed');
const identityReceiptTitle = new FakeElement('div'); identityReceiptTitle.className = 'receipt-title'; identityReceiptTitle.textContent = 'Client A payment failed';
const identityReceiptSub = new FakeElement('div'); identityReceiptSub.className = 'receipt-sub'; identityReceiptSub.textContent = 'Client A private billing detail';
const identityReceiptIcon = new FakeElement('div'); identityReceiptIcon.className = 'receipt-icon'; identityReceiptIcon.textContent = '×';
const identityReceiptTotal = new FakeElement('span'); identityReceiptTotal.id = 'receipt-total'; identityReceiptTotal.textContent = '$91.00';
identityReceipt.append(identityReceiptTitle, identityReceiptSub, identityReceiptIcon, identityReceiptTotal);
const identityLiveScreen = new FakeElement('section'); identityLiveScreen.id = 'screen-A4'; identityLiveScreen.classList.add('active');
const identitySafeScreen = new FakeElement('section'); identitySafeScreen.id = 'screen-B1';
identityHarness.body.append(identityMessages, identityTyping, identityInput, identityReceipt, identityLiveScreen, identitySafeScreen);
await changeAuth(identityHarness, null);
assert.equal(identityHarness.sandbox._bovPaymentMethodId, '', 'logout clears client A payment-method reference');
assert.equal(clearedCardElements, 1, 'logout clears any typed Stripe card details before client B signs up');
assert.equal(closedClientSockets, 2, 'logout closes client A live-session WebSocket transports');
assert.equal(identityHarness.sandbox._obClientWs, null, 'logout removes client A WebSocket reference');
assert.equal(identityHarness.sandbox._obWs, null, 'logout removes client A generic client-session socket reference');
assert.equal(identityHarness.sandbox._obClientSessionPoller, null, 'logout stops client A live-session poller');
for (const key of ['_obClientLiveSessionToken', '_bflClientToken', '_obActiveSessId', '_obPendingSessId', '_pendingSid', '_sessId', '_sid', '_obClientSessionSnapshot']) {
  assert.equal(identityHarness.sandbox[key], null, `logout clears account-scoped client runtime ${key}`);
}
assert.equal(identityPayButton.disabled, false, 'auth change restores the main payment CTA from client A loading state');
assert.equal(identityPayButton.textContent, 'Verify payment & Continue →', 'auth change restores neutral payment CTA copy');
assert.equal(identityPayError.textContent, '', 'auth change removes client A payment error copy');
assert.equal(identityPayError.style.display, 'none', 'auth change hides client A payment error state');
assert.equal(identityMessages.children.length, 0, 'logout removes client A private chat history from the DOM');
assert.equal(identityTyping.textContent, '', 'logout removes client A typing state from the DOM');
assert.equal(identityInput.value, '', 'logout removes client A unsent chat text from the DOM');
for (const [fieldId, field] of Object.entries(identityPrivateFields)) assert.equal(field.value, '', `logout scrubs client A credential field ${fieldId}`);
assert.equal(identityClmError.textContent, '', 'logout scrubs client A login error');
assert.equal(identityClmStatus.textContent, '', 'logout scrubs client A login status');
assert.equal(identityBflLogged.textContent, '', 'logout removes client A BFL identity');
assert.equal(identityBflLogged.style.display, 'none', 'logout hides client A BFL identity panel');
assert.equal(identityBflLoggedName.textContent, '', 'logout removes client A BFL display name');
assert.equal(identityBflTabs.style.display, 'flex', 'logout restores neutral BFL auth tabs');
assert.equal(identityBflSignup.style.display, 'block', 'logout restores neutral BFL signup fields');
assert.equal(identityBflLogin.style.display, 'none', 'logout hides prior BFL login fields');
assert.equal(identityBflSignupTab.classList.contains('active'), true, 'logout restores the neutral signup tab');
assert.equal(identityBflLoginTab.classList.contains('active'), false, 'logout removes the prior login-tab selection');
assert.equal(identityReceiptTotal.textContent, '—', 'logout neutralizes client A receipt amounts');
assert.equal(identityReceipt.classList.contains('active'), false, 'logout hides client A receipt screen');
assert.equal(identityLiveScreen.classList.contains('active'), false, 'logout hides client A live-session screen');
assert.equal(identitySafeScreen.classList.contains('active'), true, 'logout returns the client UI to a safe public screen');
assert.equal(identityHooks.savedPayment.available, false, 'logout clears client A saved-payment UI state immediately');
assert.equal(identityHooks.state.paymentIntentId, '', 'logout clears client A authorization controller state');
assert.equal(identityHarness.sandbox.sessionStorage.getItem('ob_live_authorization'), null, 'logout clears persisted authorization state');

await changeAuth(identityHarness, clientBToken);
const readinessRequests = identityRequests.filter((request) => request.url.includes('/api/payments/methods/status'));
assert.equal(readinessRequests.length, 2, 'client B signup forces a fresh saved-payment readiness request');
assert.equal(readinessRequests[0].authorization, `Bearer ${clientAToken}`);
assert.equal(readinessRequests[1].authorization, `Bearer ${clientBToken}`, 'fresh readiness request uses client B authentication');
assert.equal(identityHooks.savedPayment.accountKey, clientBKey, 'saved-payment cache now belongs to client B');
assert.equal(identityHooks.savedPayment.available, false, 'client B cannot inherit client A saved card');
assert.equal(identityHooks.savedPayment.useSaved, false, 'client B is shown a new payment method form');
const detachedRelease = identityRequests.find((request) => request.url.includes('/api/payments/authorize/cancel'));
assert.equal(detachedRelease?.authorization, `Bearer ${clientAToken}`, 'client A hold release never uses client B credentials');
const detachedSessionEnd = identityRequests.find((request) => request.url.includes('/api/sessions/session-client-a/end'));
assert.equal(detachedSessionEnd?.authorization, `Bearer ${clientAToken}`, 'client A active session is ended with A credentials before client B is installed');

// The public visual-polish pass must preserve composite client identity controls.
// Reproduce the real A -> logout -> B lifecycle with the actual profile renderer,
// polish routine, and payment owner sharing one central client context.
const navIdentityRequests = [];
const navIdentityUsers = {
  [`Bearer ${clientAToken}`]: { id: 'client-a', role: 'client', name: 'Book for Later', email: 'alice@example.test' },
  [`Bearer ${clientBToken}`]: { id: 'client-b', role: 'client', name: 'Bianca Fresh', email: 'bianca@example.test' },
};
const navIdentityHarness = createHarness({
  session: { ob_t: clientAToken, ob_u: JSON.stringify(navIdentityUsers[`Bearer ${clientAToken}`]) },
  fetchImpl: async (url, init = {}) => {
    const request = { url: String(url), authorization: init.headers?.Authorization || '' };
    navIdentityRequests.push(request);
    if (request.url.includes('/api/auth/me')) return { ok: true, status: 200, json: async () => ({ user: navIdentityUsers[request.authorization] }) };
    if (request.url.includes('/api/payments/methods/status')) {
      return { ok: true, status: 200, json: async () => ({ has_saved_payment_method: request.authorization === `Bearer ${clientAToken}`, mode: 'test' }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  },
});
navIdentityHarness.sandbox._currentExpertId = 'expert-nav-isolation';
new vm.Script(clientAuthUiSource, { filename: 'client-profile-identity-ui.js' }).runInContext(navIdentityHarness.sandbox);

const navView = new FakeElement('section'); navView.id = 'view-4';
const navLogin = new FakeElement('button'); navLogin.id = 'client-nav-login-btn';
const navUser = new FakeElement('div'); navUser.id = 'client-nav-user';
const navAvatar = new FakeElement('button'); navAvatar.id = 'client-nav-avatar';
const navInitial = new FakeElement('div'); navInitial.id = 'client-nav-initial'; navInitial.textContent = '?';
const navName = new FakeElement('span'); navName.id = 'client-nav-name';
const navChevron = new FakeElement('svg');
const navMenuHandler = () => 'menu'; navAvatar.addEventListener('click', navMenuHandler);
navAvatar.append(new FakeText('\n  '), navInitial, new FakeText('\n  '), navName, new FakeText('\n  '), navChevron, new FakeText('\n'));
navUser.appendChild(navAvatar); navView.append(navLogin, navUser);
const navEmail = new FakeElement('div'); navEmail.id = 'client-account-email'; navView.appendChild(navEmail);
const polishedAction = new FakeElement('button'); polishedAction.className = 'btn';
const polishedActionIcon = new FakeElement('svg');
const polishedActionHandler = () => 'action'; polishedAction.addEventListener('click', polishedActionHandler);
polishedAction.append(polishedActionIcon, new FakeText(' ✨ Start now'));
navView.appendChild(polishedAction); navIdentityHarness.body.appendChild(navView);
navIdentityHarness.document.querySelectorAll = (selector) => String(selector).includes('#view-4 button') ? [navAvatar, polishedAction] : [];

navIdentityHarness.sandbox.checkClientAuth();
await settleAsync();
assert.equal(navName.textContent, 'Book for Later', 'client A profile initially renders a booking-copy name collision in the structured nav component');
assert.equal(navInitial.textContent, 'B', 'client A initial initially renders');
await navIdentityHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.refreshSavedPaymentStatus(true, 'expert-nav-isolation');
assert.equal(navIdentityHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.savedPayment.available, true, 'client A begins with its own saved payment method');

new vm.Script(stagePolishSource, { filename: 'public-stage-polish.js' }).runInContext(navIdentityHarness.sandbox);
assert.equal(navIdentityHarness.document.getElementById('client-nav-name'), navName, 'visual polish preserves the client name node');
assert.equal(navIdentityHarness.document.getElementById('client-nav-initial'), navInitial, 'visual polish preserves the client initial node');
assert.equal(navAvatar.listeners.click, navMenuHandler, 'visual polish preserves the composite avatar event handler');
assert.equal(polishedAction.children.includes(polishedActionIcon), true, 'visual polish preserves legitimate composite button icons');
assert.equal(polishedAction.textContent.includes('✨'), false, 'visual polish still removes decorative emoji from eligible text nodes');
assert.equal(polishedAction.listeners.click, polishedActionHandler, 'visual polish preserves legitimate button behavior');

navIdentityHarness.sandbox.clientLogout();
await settleAsync();
assert.equal(navName.textContent, 'Account', 'logout neutralizes client A name without replacing the nav component');
assert.equal(navInitial.textContent, '?', 'logout neutralizes client A initial');
assert.equal(navEmail.textContent, '', 'logout removes client A email');
await changeAuth(navIdentityHarness, clientBToken);
await settleAsync(32);
assert.equal(navIdentityHarness.document.getElementById('client-nav-name'), navName, 'client B still owns the original structured name node');
assert.equal(navIdentityHarness.document.getElementById('client-nav-initial'), navInitial, 'client B still owns the original structured initial node');
assert.equal(navName.textContent, 'Bianca Fresh', 'client B name replaces client A');
assert.equal(navInitial.textContent, 'B', 'client B initial replaces client A');
assert.equal(navEmail.textContent, 'bianca@example.test', 'client B email comes from the current exact-credential profile response');
assert.equal(navAvatar.textContent.includes('Book for Later'), false, 'client A booking-copy name collision is absent after client B signs in');
const navIdentityHooks = navIdentityHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
assert.equal(navIdentityHooks.savedPayment.accountKey, clientBKey, 'fresh payment ownership remains scoped to client B');
assert.equal(navIdentityHooks.savedPayment.available, false, 'client B does not inherit client A saved card');
assert.equal(navIdentityHooks.savedPayment.useSaved, false, 'client B remains on the fresh payment-method flow');
const navBReadiness = navIdentityRequests.find((request) => request.url.includes('/api/payments/methods/status') && request.authorization === `Bearer ${clientBToken}`);
assert(navBReadiness, 'client B payment readiness is fetched with client B authentication');

// The single cross-tab storage reconciler treats the central context as authority and clears stale profile data atomically.
const crossTabHarness = createHarness({ session: { ob_t: clientAToken, ob_u: JSON.stringify({ id: 'client-a', role: 'client', email: 'a@example.test' }) } });
let crossTabSocketCloses = 0;
crossTabHarness.sandbox._obClientWs = { readyState: 1, close() { crossTabSocketCloses += 1; } };
crossTabHarness.dispatchStorage('ob_t', clientBToken);
await settleAsync();
assert.equal(crossTabHarness.sandbox.OB_CLIENT_CONTEXT.token(), clientBToken, 'cross-tab identity switch installs client B in the central context');
assert.equal(crossTabHarness.sandbox.sessionStorage.getItem('ob_u'), null, 'cross-tab identity switch cannot retain client A profile data beside client B token');
assert.equal(crossTabSocketCloses, 1, 'cross-tab identity switch tears down client A transport exactly once');
crossTabHarness.sandbox._obClientWs = { readyState: 1, close() { crossTabSocketCloses += 1; } };
crossTabHarness.dispatchStorage('ob_t', null);
await settleAsync();
crossTabHarness.dispatchStorage('ob_t', null);
await settleAsync();
assert.equal(crossTabSocketCloses, 2, 'repeated logged-out storage events are idempotent');
assert.equal(crossTabHarness.sandbox.OB_CLIENT_CONTEXT.token(), '', 'cross-tab logout leaves the central context empty');

// A credential refresh for the same principal updates transports/readiness without ending the paid session or releasing its hold.
const rotationRequests = [];
const rotationHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: async (url, init = {}) => {
  rotationRequests.push({ url: String(url), authorization: init.headers?.Authorization || '' });
  return { ok: true, json: async () => ({ has_saved_payment_method: true, mode: 'test' }) };
} });
rotationHarness.sandbox._currentExpertId = 'expert-rotation';
const rotationHooks = rotationHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
rotationHooks.state.phase = 'ready';
rotationHooks.state.context = 'live:expert-rotation:owner:chat';
rotationHooks.state.paymentIntentId = 'pi_same_principal';
rotationHooks.state.requestId = 'request_same_principal';
rotationHooks.state.accountKey = clientAKey;
rotationHarness.sandbox._obActiveSessId = 'session-same-principal';
rotationHarness.sandbox._sessId = 'session-same-principal';
rotationHarness.sandbox._obClientLiveSessionToken = clientAToken;
let rotationSocketCloses = 0;
const rotationFrames = [];
rotationHarness.sandbox._obClientWs = {
  readyState: 1,
  send(value) { rotationFrames.push(JSON.parse(value)); },
  close() { rotationSocketCloses += 1; },
};
const rotationBefore = rotationHarness.sandbox.OB_CLIENT_CONTEXT.capture('rotation-before');
await changeAuth(rotationHarness, clientARotatedToken);
const rotationAfter = rotationHarness.sandbox.OB_CLIENT_CONTEXT.capture('rotation-after');
assert.equal(rotationAfter.identityGeneration, rotationBefore.identityGeneration, 'same-principal rotation preserves the identity epoch');
assert.equal(rotationAfter.credentialGeneration, rotationBefore.credentialGeneration + 1, 'same-principal rotation advances only the credential generation');
assert.equal(rotationSocketCloses, 0, 'same-principal rotation keeps the active client socket open');
assert.equal(rotationHarness.sandbox._obActiveSessId, 'session-same-principal', 'same-principal rotation keeps the live session installed');
assert.equal(rotationHooks.state.paymentIntentId, 'pi_same_principal', 'same-principal rotation keeps the live authorization hold');
assert(rotationFrames.some((frame) => frame.type === 'auth' && frame.token === clientARotatedToken), 'open client transport is reauthenticated with the rotated credential');
assert.equal(rotationHarness.sandbox._obClientLiveSessionToken, clientARotatedToken, 'transient live-session credential adopts the rotated token');
assert.equal(rotationHarness.sandbox.OB_CLIENT_CONTEXT.isTokenCurrent(clientAToken), true, 'stable-principal continuations remain valid across credential refresh');
assert.equal(rotationHarness.sandbox.OB_CLIENT_CONTEXT.isTokenCurrent(clientAToken, { exactCredential: true }), false, 'payment mutations captured with the old exact credential are invalidated');
assert(rotationRequests.some((request) => request.url.includes('/api/payments/methods/status') && request.authorization === `Bearer ${clientARotatedToken}`),
  'saved-payment readiness is freshly fetched with the rotated credential');
assert.equal(rotationRequests.some((request) => request.url.includes('/authorize/cancel') || request.url.includes('/sessions/session-same-principal/end')), false,
  'same-principal rotation neither releases the hold nor ends the paid session');

// A credential refresh while the $5 authorization request is in flight keeps that operation
// attached to the same stable principal and never abandons or duplicates the approved hold.
let resolveRotatingAuthorization;
const rotatingAuthorizationRequests = [];
const rotatingAuthorizationHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: (url, init = {}) => {
  const request = { url: String(url), authorization: init.headers?.Authorization || '', body: init.body ? JSON.parse(init.body) : null };
  rotatingAuthorizationRequests.push(request);
  if (request.url.endsWith('/api/payments/authorize')) {
    return new Promise((resolve) => { resolveRotatingAuthorization = resolve; });
  }
  if (request.url.includes('/api/payments/methods/status')) {
    return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) });
  }
  if (request.url.includes('/api/payments/authorize/cancel')) {
    return Promise.resolve({ ok: true, json: async () => ({ released: true }) });
  }
  throw new Error(`unexpected rotating-authorization request: ${request.url}`);
} });
const rotatingAuthorizationHooks = rotatingAuthorizationHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
const rotatingAuthorizationPromise = rotatingAuthorizationHarness.sandbox.obAuthorizeSessionHold({
  expertId: 'expert-rotation-in-flight', channel: 'chat', token: clientAToken,
});
await settleAsync();
assert(resolveRotatingAuthorization, 'authorization request is pending before the credential rotates');
await changeAuth(rotatingAuthorizationHarness, clientARotatedToken);
resolveRotatingAuthorization({ ok: true, json: async () => ({
  payment_intent_id: 'pi_rotation_in_flight', authorization_request_id: 'request_rotation_in_flight',
  status: 'requires_capture', amount_authorized: 5,
}) });
const rotatingAuthorization = await rotatingAuthorizationPromise;
assert.equal(rotatingAuthorization.payment_intent_id, 'pi_rotation_in_flight',
  'same-principal rotation accepts the already-approved in-flight authorization');
assert.equal(rotatingAuthorizationHooks.state.phase, 'ready',
  'same-principal rotation leaves the approved hold ready for the session request');
assert.equal(rotatingAuthorizationRequests.filter((request) => request.url.endsWith('/api/payments/authorize')).length, 1,
  'same-principal rotation does not create a duplicate authorization');
assert.equal(rotatingAuthorizationRequests.some((request) => request.url.includes('/api/payments/authorize/cancel')), false,
  'same-principal rotation does not release the approved in-flight hold');
assert.equal(rotatingAuthorizationRequests.find((request) => request.url.endsWith('/api/payments/authorize')).authorization, `Bearer ${clientAToken}`,
  'the in-flight authorization uses its immutable originating credential throughout');

// BOV/BFL Express Checkout mounts and confirm operations are owned by one immutable client context.
const walletRequests = [];
const walletASetupResolvers = [];
const walletHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: (url, init = {}) => {
  const request = { url: String(url), authorization: init.headers?.Authorization || '', body: init.body ? JSON.parse(init.body) : null };
  walletRequests.push(request);
  if (request.url.endsWith('/api/config')) return Promise.resolve({ ok: true, json: async () => ({ client_payments: { apple_pay_enabled: true, google_pay_enabled: true } }) });
  if (request.url.includes('/api/payments/methods/status')) return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) });
  if (request.url.endsWith('/api/payments/methods/setup') && request.authorization === `Bearer ${clientAToken}`) {
    return new Promise((resolve) => { walletASetupResolvers.push(resolve); });
  }
  if (request.url.endsWith('/api/payments/methods/setup')) {
    return Promise.resolve({ ok: true, json: async () => ({ client_secret: 'seti_rotated_secret', mode: 'test' }) });
  }
  if (request.url.endsWith('/api/payments/methods/default')) return Promise.resolve({ ok: true, json: async () => ({ saved: true }) });
  return Promise.resolve({ ok: true, json: async () => ({}) });
} });
walletHarness.sandbox._currentExpertId = 'expert-wallet';
for (const [sectionId, buttonId] of [['bov-wallet-section', 'bov-wallet-button'], ['bfl-wallet-section', 'bfl-wallet-button']]) {
  const section = new FakeElement('section'); section.id = sectionId;
  const mount = new FakeElement('div'); mount.id = buttonId;
  walletHarness.body.append(section, mount);
}
for (const id of ['bov-card-error', 'bfl-card-error', 'bfl-card-saved']) { const element = new FakeElement('div'); element.id = id; walletHarness.body.appendChild(element); }
const walletPayButton = new FakeElement('button'); walletPayButton.id = 'bov-pay-btn'; walletHarness.body.appendChild(walletPayButton);
const walletExpressElements = [];
const walletConfirmSetupCalls = [];
const walletStripe = {
  elements() {
    const elements = {
      async submit() { return {}; },
      create(type) {
        assert.equal(type, 'expressCheckout');
        const express = {
          handlers: {}, mounts: 0, unmounts: 0, destroys: 0,
          on(name, handler) { this.handlers[name] = handler; },
          mount(selector) { this.selector = selector; this.mounts += 1; },
          unmount() { this.unmounts += 1; },
          destroy() { this.destroys += 1; },
        };
        walletExpressElements.push(express);
        return express;
      },
    };
    return elements;
  },
  async confirmSetup(options) {
    walletConfirmSetupCalls.push(options);
    return { setupIntent: { payment_method: `pm_wallet_${walletConfirmSetupCalls.length}` } };
  },
};
new vm.Script(walletCoreSource, { filename: 'ownlybiz-wallet-owner.js' }).runInContext(walletHarness.sandbox);
const walletHoldCalls = [];
let walletUiCompletions = 0;
walletHarness.sandbox.obAuthorizeSessionHold = async (options) => { walletHoldCalls.push(options); return { authorized: true }; };
walletHarness.sandbox.obCompleteSessionAuthorizationUi = () => { walletUiCompletions += 1; };
walletHarness.sandbox._obMountBovWallet(walletStripe);
walletHarness.sandbox._obMountBflWallet(walletStripe);
await settleAsync(24);
assert.equal(walletExpressElements.length, 2, 'BOV and BFL each mount one account-owned Express Checkout element');
walletExpressElements[0].handlers.confirm({ paymentFailed() {} });
walletExpressElements[1].handlers.confirm({ paymentFailed() {} });
for (let turn = 0; turn < 30 && walletASetupResolvers.length < 2; turn += 1) await Promise.resolve();
assert.equal(walletASetupResolvers.length, 2, 'both client A wallet confirms are paused at their captured SetupIntent request');
await changeAuth(walletHarness, null);
await changeAuth(walletHarness, clientBToken);
for (const resolve of walletASetupResolvers) resolve({ ok: true, json: async () => ({ client_secret: 'seti_client_a_secret', mode: 'test' }) });
await settleAsync(40);
assert.equal(walletConfirmSetupCalls.length, 0, 'late client A SetupIntent responses cannot confirm through client B wallet state');
assert.equal(walletRequests.filter((request) => request.url.endsWith('/api/payments/methods/default')).length, 0,
  'late client A wallet responses cannot save a payment method for client B');
assert.equal(walletHoldCalls.length, 0, 'late client A BOV wallet response cannot create a client B authorization hold');
assert.equal(walletHarness.sandbox._bflWalletPaymentSaved, false, 'late client A BFL wallet response cannot mark client B payment as saved');
assert(walletExpressElements.slice(0, 2).every((express) => express.unmounts === 1 && express.destroys === 1),
  'true identity change unmounts and destroys both client A wallet elements');

walletHarness.sandbox._obMountBovWallet(walletStripe);
walletHarness.sandbox._obMountBflWallet(walletStripe);
await settleAsync(24);
const clientBWallets = walletExpressElements.slice(2, 4);
assert.equal(clientBWallets.length, 2, 'client B receives fresh BOV and BFL wallet elements');
await changeAuth(walletHarness, clientBRotatedToken);
assert(clientBWallets.every((express) => express.unmounts === 0 && express.destroys === 0),
  'same-principal credential rotation preserves mounted wallet elements');
clientBWallets[0].handlers.confirm({ paymentFailed() {} });
clientBWallets[1].handlers.confirm({ paymentFailed() {} });
await settleAsync(50);
const rotatedDefaultRequests = walletRequests.filter((request) => request.url.endsWith('/api/payments/methods/default'));
assert.equal(rotatedDefaultRequests.length, 2, 'the current BOV and BFL wallet confirms each save their returned payment method');
assert(rotatedDefaultRequests.every((request) => request.authorization === `Bearer ${clientBRotatedToken}`),
  'new wallet confirms capture and use the rotated credential for every API call');
assert.equal(walletHoldCalls.length, 1, 'only the current BOV wallet creates a live authorization hold');
assert.equal(walletHoldCalls[0].token, clientBRotatedToken, 'the BOV hold uses the exact credential captured for the current wallet operation');
assert.equal(walletUiCompletions, 1, 'only the current BOV wallet advances the payment UI');
assert.equal(walletHarness.sandbox._bflWalletPaymentSavedToken, clientBRotatedToken, 'BFL saved-wallet readiness is bound to the current credential');
await changeAuth(walletHarness, clientAToken);
assert(clientBWallets.every((express) => express.unmounts === 1 && express.destroys === 1),
  'a later true identity change destroys client B wallet elements');
assert.equal(Object.keys(walletHarness.sandbox.obWalletTestHooks.walletMounts).length, 0, 'wallet owner registry is empty after identity teardown');

// Credential rotation at every wallet await boundary keeps the one stable-principal
// operation alive with its immutable originating credential and never duplicates a hold.
for (const pauseStage of ['submit','setup','confirm','save']) {
  let releaseStage;
  let stageReached = false;
  const stageRequests = [];
  const stageHolds = [];
  const stageSaves = [];
  const stageExpress = [];
  const stageHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: (url, init = {}) => {
    const request = { url: String(url), authorization: init.headers?.Authorization || '' }; stageRequests.push(request);
    if(request.url.endsWith('/api/config')) return Promise.resolve({ ok: true, json: async () => ({ client_payments: { apple_pay_enabled: true, google_pay_enabled: true } }) });
    if(request.url.includes('/api/payments/methods/status')) return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) });
    if(request.url.endsWith('/api/payments/methods/setup')) {
      if(pauseStage === 'setup') return new Promise((resolve) => { stageReached = true; releaseStage = () => resolve({ ok: true, json: async () => ({ client_secret: `seti_${pauseStage}`, mode: 'test' }) }); });
      return Promise.resolve({ ok: true, json: async () => ({ client_secret: `seti_${pauseStage}`, mode: 'test' }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  } });
  stageHarness.sandbox._currentExpertId = `expert-wallet-${pauseStage}`;
  const section = new FakeElement('section'); section.id = 'bov-wallet-section';
  const mount = new FakeElement('div'); mount.id = 'bov-wallet-button';
  const error = new FakeElement('div'); error.id = 'bov-card-error';
  const pay = new FakeElement('button'); pay.id = 'bov-pay-btn';
  stageHarness.body.append(section, mount, error, pay);
  const stageStripe = {
    elements() {
      return {
        submit() {
          if(pauseStage === 'submit') return new Promise((resolve) => { stageReached = true; releaseStage = () => resolve({}); });
          return Promise.resolve({});
        },
        create() {
          const express = { handlers: {}, on(name, handler) { this.handlers[name] = handler; }, mount() {}, unmount() {}, destroy() {} };
          stageExpress.push(express); return express;
        },
      };
    },
    confirmSetup() {
      if(pauseStage === 'confirm') return new Promise((resolve) => { stageReached = true; releaseStage = () => resolve({ setupIntent: { payment_method: `pm_${pauseStage}` } }); });
      return Promise.resolve({ setupIntent: { payment_method: `pm_${pauseStage}` } });
    },
  };
  new vm.Script(walletCoreSource, { filename: `wallet-rotation-${pauseStage}.js` }).runInContext(stageHarness.sandbox);
  stageHarness.sandbox._obSaveDefaultPaymentMethod = (pm, operationToken, extras) => {
    stageSaves.push({ pm, operationToken, extras });
    if(pauseStage === 'save') return new Promise((resolve) => { stageReached = true; releaseStage = resolve; });
    return Promise.resolve();
  };
  stageHarness.sandbox.obAuthorizeSessionHold = async (options) => { stageHolds.push(options); return { authorized: true }; };
  stageHarness.sandbox.obCompleteSessionAuthorizationUi = () => {};
  stageHarness.sandbox._obMountBovWallet(stageStripe);
  await settleAsync(24);
  assert.equal(stageExpress.length, 1, `${pauseStage}: one BOV wallet is mounted`);
  stageExpress[0].handlers.confirm({ paymentFailed() { throw new Error(`${pauseStage}: current same-principal flow must not fail silently`); } });
  for (let turn = 0; turn < 60 && !stageReached; turn += 1) await Promise.resolve();
  assert(stageReached && releaseStage, `${pauseStage}: wallet reaches the selected await boundary`);
  await changeAuth(stageHarness, clientARotatedToken);
  releaseStage();
  await settleAsync(60);
  assert.equal(stageSaves.length, 1, `${pauseStage}: payment method is saved exactly once across rotation`);
  assert.equal(stageSaves[0].operationToken, clientAToken, `${pauseStage}: the operation consistently uses its originating credential`);
  assert.equal(stageHolds.length, 1, `${pauseStage}: exactly one authorization hold is created`);
  assert.equal(stageHolds[0].token, clientAToken, `${pauseStage}: the one hold uses the immutable operation credential`);
  const setupRequests = stageRequests.filter((request) => request.url.endsWith('/api/payments/methods/setup'));
  assert.equal(setupRequests.length, 1, `${pauseStage}: SetupIntent is requested exactly once`);
  assert.equal(setupRequests[0].authorization, `Bearer ${clientAToken}`, `${pauseStage}: SetupIntent uses the immutable operation credential`);
}

// Client voice/video logout is local-first: invalidate startup, stop media and timers, never signal rtc_end.
for (const channel of ['voice', 'video']) {
  const mediaHarness = createHarness({ session: { ob_t: clientAToken } });
  const mediaHooks = mediaHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
  const rtcCalls = [];
  let rtcEndCalls = 0;
  mediaHarness.sandbox.OB_RTC = {
    getRole: () => 'client',
    getChannel: () => channel,
    resetClientContext() {
      rtcCalls.push('reset');
      for (const id of ['rtc-remote-audio', 'rtc-remote-video', 'rtc-local-video']) {
        const media = mediaHarness.document.getElementById(id);
        if (media?.srcObject?.getTracks) media.srcObject.getTracks().forEach((track) => track.stop());
        if (media) media.srcObject = null;
      }
    },
    end() { rtcEndCalls += 1; },
  };
  mediaHarness.sandbox._obRtcLastRole = 'client';
  mediaHarness.sandbox._obRtcLastChannel = channel;
  mediaHarness.sandbox._obRtcLastSid = `session-${channel}-client-a`;
  mediaHarness.sandbox._obRtcStartedAt = Date.now();
  for (const timerKey of ['freeTimerInterval', 'paidTimerInterval', 'voiceTimerB', 'videoTimer', '_clientTimerInterval', '_obClientElapsedInterval', '_bookingPollTimer']) {
    mediaHarness.sandbox[timerKey] = 700;
  }
  const mediaIds = channel === 'voice' ? ['rtc-remote-audio'] : ['rtc-remote-audio', 'rtc-remote-video', 'rtc-local-video'];
  const mediaTracks = [];
  for (const mediaId of mediaIds) {
    const track = { stopped: 0, stop() { this.stopped += 1; } };
    mediaTracks.push(track);
    const media = new FakeElement(mediaId === 'rtc-remote-audio' ? 'audio' : 'video'); media.id = mediaId;
    media.srcObject = { getTracks: () => [track] };
    media.pauseCount = 0; media.loadCount = 0;
    media.pause = () => { media.pauseCount += 1; };
    media.load = () => { media.loadCount += 1; };
    mediaHarness.body.appendChild(media);
  }
  await changeAuth(mediaHarness, null);
  assert.deepEqual(rtcCalls, ['reset'], `${channel} logout uses the single RTC client reset owner`);
  assert.equal(rtcEndCalls, 0, `${channel} auth teardown never sends a media-level rtc_end signal`);
  assert(mediaTracks.every((track) => track.stopped === 1), `${channel} logout stops every attached client media track`);
  for (const mediaId of mediaIds) {
    assert.equal(mediaHarness.document.getElementById(mediaId).srcObject, null, `${channel} logout detaches ${mediaId}`);
  }
  for (const timerKey of ['freeTimerInterval', 'paidTimerInterval', 'voiceTimerB', 'videoTimer', '_clientTimerInterval', '_obClientElapsedInterval', '_bookingPollTimer']) {
    assert.equal(mediaHarness.sandbox[timerKey], null, `${channel} logout clears client timer ${timerKey}`);
  }
  assert.equal(mediaHarness.sandbox._obRtcLastRole, null, `${channel} logout clears client RTC ownership metadata`);
  assert.equal(mediaHarness.sandbox._obRtcLastSid, null, `${channel} logout clears client RTC session metadata`);
}

// Client runtime teardown is deliberately scoped away from expert/admin identities.
let expertSocketCloses = 0;
let expertRtcInvalidations = 0;
let expertRtcCleanups = 0;
let expertRtcEnds = 0;
const expertRuntimeHarness = createHarness({ session: { ob_t: expertToken } });
const expertRuntimeHooks = expertRuntimeHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
const expertSocket = { readyState: 1, close() { expertSocketCloses += 1; } };
const expertMediaTrack = { stopped: 0, stop() { this.stopped += 1; } };
const expertMedia = new FakeElement('video'); expertMedia.id = 'rtc-local-video'; expertMedia.srcObject = { getTracks: () => [expertMediaTrack] };
const expertPrivateField = new FakeElement('textarea'); expertPrivateField.id = 'sfield-bio'; expertPrivateField.value = 'Expert A unsaved profile guidance';
const expertClientModalField = new FakeElement('input'); expertClientModalField.id = 'clm-login-pass'; expertClientModalField.value = 'expert-visible-test-value';
expertRuntimeHarness.body.append(expertMedia, expertPrivateField, expertClientModalField);
expertRuntimeHarness.sandbox.OB_RTC = {
  getRole: () => 'expert', invalidateClientLifecycle() { expertRtcInvalidations += 1; },
  cleanup() { expertRtcCleanups += 1; }, end() { expertRtcEnds += 1; },
};
expertRuntimeHarness.sandbox._obClientWs = expertSocket;
expertRuntimeHarness.sandbox._obClientLiveSessionToken = expertToken;
expertRuntimeHarness.sandbox._sid = 'expert-session';
expertRuntimeHarness.sandbox._obActiveSessId = 'expert-session';
expertRuntimeHarness.sandbox._expertSessInterval = 801;
expertRuntimeHarness.sandbox._clientTimerInterval = 802;
assert.equal(expertRuntimeHooks.shouldClearClientSessionRuntime(expertToken), false,
  'expert identity is outside client-session teardown');
await changeAuth(expertRuntimeHarness, null);
assert.equal(expertSocketCloses, 0, 'client payment auth reset does not close expert WebSocket state');
assert.equal(expertRuntimeHarness.sandbox._obClientWs, expertSocket, 'expert socket reference is preserved');
assert.equal(expertRuntimeHarness.sandbox._sid, 'expert-session', 'expert active-session global is preserved');
assert.equal(expertRuntimeHarness.sandbox._obClientLiveSessionToken, expertToken, 'expert transient token is preserved');
assert.deepEqual([expertRtcInvalidations, expertRtcCleanups, expertRtcEnds], [0, 0, 0], 'expert RTC is never touched by client teardown');
assert.equal(expertMediaTrack.stopped, 0, 'expert media tracks remain live');
assert.notEqual(expertMedia.srcObject, null, 'expert media attachment is preserved');
assert.equal(expertRuntimeHarness.sandbox._expertSessInterval, 801, 'expert elapsed timer is preserved');
assert.equal(expertRuntimeHarness.sandbox._clientTimerInterval, 802, 'no shared timer global is cleared for an expert identity');
assert.equal(expertPrivateField.value, 'Expert A unsaved profile guidance', 'client teardown never scrubs expert settings DOM');
assert.equal(expertClientModalField.value, 'expert-visible-test-value', 'client-private DOM scrub is not invoked for an expert identity');
assert.equal(expertSocketCloses, 0, 'post-logout payment refresh still does not close expert WebSocket state');
assert.equal(expertRuntimeHarness.sandbox._sid, 'expert-session', 'post-logout payment refresh preserves expert active-session state');

const adminRuntimeHarness = createHarness({ session: { ob_t: adminToken } });
const adminRuntimeHooks = adminRuntimeHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
let adminRtcCleanups = 0;
adminRuntimeHarness.sandbox.OB_RTC = { getRole: () => 'admin', cleanup() { adminRtcCleanups += 1; } };
adminRuntimeHarness.sandbox._expertSessInterval = 901;
adminRuntimeHarness.sandbox._sid = 'admin-observed-session';
await changeAuth(adminRuntimeHarness, null);
assert.equal(adminRtcCleanups, 0, 'admin RTC/runtime is outside client auth teardown');
assert.equal(adminRuntimeHarness.sandbox._expertSessInterval, 901, 'admin-visible expert timer is preserved');
assert.equal(adminRuntimeHarness.sandbox._sid, 'admin-observed-session', 'admin session context is preserved');

// A client stream resolving after logout is stopped before it can install a peer connection or media.
let resolveLateClientMedia;
let lateClientPeerConnections = 0;
const lateMediaHarness = createHarness({ session: { ob_t: clientAToken } });
lateMediaHarness.sandbox.OWNLY_CONFIG = { rtc: {} };
lateMediaHarness.sandbox.navigator = {
  mediaDevices: { getUserMedia: () => new Promise((resolve) => { resolveLateClientMedia = resolve; }) },
};
lateMediaHarness.sandbox.RTCPeerConnection = function() { lateClientPeerConnections += 1; };
new vm.Script(rtcModuleSource, { filename: 'ownlybiz-rtc-module.js' }).runInContext(lateMediaHarness.sandbox);
const lateMediaHooks = lateMediaHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
const lateMediaStart = lateMediaHarness.sandbox.OB_RTC.start('session-client-a-video', 'video', 'client');
for (let turn = 0; turn < 10 && !resolveLateClientMedia; turn += 1) await Promise.resolve();
assert(resolveLateClientMedia, 'client A getUserMedia is pending before logout');
await changeAuth(lateMediaHarness, null);
await changeAuth(lateMediaHarness, clientBToken);
const lateClientTracks = [
  { kind: 'audio', stopped: 0, stop() { this.stopped += 1; } },
  { kind: 'video', stopped: 0, stop() { this.stopped += 1; } },
];
resolveLateClientMedia({
  getTracks: () => lateClientTracks,
  getAudioTracks: () => [lateClientTracks[0]],
  getVideoTracks: () => [lateClientTracks[1]],
});
assert.equal(await lateMediaStart, false, 'client A RTC startup aborts after the identity epoch changes');
assert(lateClientTracks.every((track) => track.stopped === 1), 'late client A audio/video tracks are stopped immediately');
assert.equal(lateClientPeerConnections, 0, 'late client A media never creates a peer connection in client B state');
assert.equal(lateMediaHarness.sandbox.OB_RTC.isActive(), false, 'late client A RTC cannot become active after client B signs in');

// Signaling that arrives before A starts media is discarded on logout and cannot be consumed by B.
const prestartHarness = createHarness({ session: { ob_t: clientAToken } });
prestartHarness.sandbox.OWNLY_CONFIG = { rtc: {} };
const prestartRemoteDescriptions = [];
const prestartIceCandidates = [];
const prestartTrack = { kind: 'audio', readyState: 'live', enabled: true, stop() { this.readyState = 'ended'; } };
prestartHarness.sandbox.navigator = { mediaDevices: { getUserMedia: async () => ({
  getTracks: () => [prestartTrack], getAudioTracks: () => [prestartTrack], getVideoTracks: () => [],
}) } };
prestartHarness.sandbox.RTCPeerConnection = class {
  constructor() { this.connectionState = 'new'; this.iceConnectionState = 'new'; this.signalingState = 'stable'; this.remoteDescription = null; }
  addTrack() {}
  close() { this.connectionState = 'closed'; }
  async createOffer() { return { type: 'offer', sdp: 'offer-client-b' }; }
  async createAnswer() { return { type: 'answer', sdp: 'answer-client-b' }; }
  async setLocalDescription(description) { this.localDescription = description; this.signalingState = description.type === 'offer' ? 'have-local-offer' : 'stable'; }
  async setRemoteDescription(description) { this.remoteDescription = description; prestartRemoteDescriptions.push(description); }
  async addIceCandidate(candidate) { prestartIceCandidates.push(candidate); }
};
new vm.Script(rtcModuleSource, { filename: 'ownlybiz-rtc-prestart-buffer.js' }).runInContext(prestartHarness.sandbox);
await prestartHarness.sandbox.OB_RTC.handleOffer('offer-buffered-for-client-a');
await prestartHarness.sandbox.OB_RTC.handleIce({ candidate: 'ice-buffered-for-client-a' });
await changeAuth(prestartHarness, null);
await changeAuth(prestartHarness, clientBToken);
prestartHarness.sandbox._obClientWs = { readyState: 1, send() {}, close() {} };
assert.equal(await prestartHarness.sandbox.OB_RTC.start('session-client-b-after-buffer', 'voice', 'client'), true,
  'client B can start RTC after client A prestart state is reset');
assert.equal(prestartRemoteDescriptions.some((description) => description.sdp === 'offer-buffered-for-client-a'), false,
  'client B never applies client A buffered offer');
assert.equal(prestartIceCandidates.some((candidate) => candidate.candidate === 'ice-buffered-for-client-a'), false,
  'client B never applies client A buffered ICE');
prestartHarness.sandbox.OB_RTC.cleanup();

// Expert RTC intentionally ignores the client-token privacy epoch and completes normally.
let resolveExpertMedia;
let expertPeerConnections = 0;
const expertMediaHarness = createHarness({ session: { ob_t: expertToken } });
expertMediaHarness.sandbox.OWNLY_CONFIG = { rtc: {} };
const pendingExpertTrack = { kind: 'audio', stopped: 0, readyState: 'live', enabled: true, stop() { this.stopped += 1; this.readyState = 'ended'; } };
expertMediaHarness.sandbox.navigator = {
  mediaDevices: { getUserMedia: () => new Promise((resolve) => { resolveExpertMedia = resolve; }) },
};
expertMediaHarness.sandbox.RTCPeerConnection = class {
  constructor() { expertPeerConnections += 1; this.connectionState = 'new'; this.iceConnectionState = 'new'; this.signalingState = 'stable'; this.remoteDescription = null; }
  addTrack() {}
  close() { this.connectionState = 'closed'; }
};
expertMediaHarness.sandbox._expertWs = { readyState: 1, send() {} };
new vm.Script(rtcModuleSource, { filename: 'ownlybiz-rtc-expert-module.js' }).runInContext(expertMediaHarness.sandbox);
const expertMediaStart = expertMediaHarness.sandbox.OB_RTC.start('session-expert-voice', 'voice', 'expert');
for (let turn = 0; turn < 10 && !resolveExpertMedia; turn += 1) await Promise.resolve();
assert(resolveExpertMedia, 'expert getUserMedia is pending before the payment auth reset');
await changeAuth(expertMediaHarness, null);
resolveExpertMedia({ getTracks: () => [pendingExpertTrack], getAudioTracks: () => [pendingExpertTrack], getVideoTracks: () => [] });
assert.equal(await expertMediaStart, true, 'expert RTC startup is preserved across client-payment auth reset logic');
assert.equal(expertPeerConnections, 1, 'expert RTC still installs its peer connection');
assert.equal(pendingExpertTrack.stopped, 0, 'expert microphone remains live');
assert.equal(expertMediaHarness.sandbox.OB_RTC.getRole(), 'expert', 'expert RTC ownership remains explicit');
expertMediaHarness.sandbox.OB_RTC.cleanup();

// A delayed A offer continuation cannot answer through B's replacement peer connection.
let resolveClientARemoteDescription;
const rtcPeerConnections = [];
let rtcMediaOwner = 'a';
const rtcOfferHarness = createHarness({ session: { ob_t: clientAToken } });
rtcOfferHarness.sandbox.OWNLY_CONFIG = { rtc: {} };
const streamForOwner = (owner) => {
  const track = { kind: 'audio', owner, readyState: 'live', enabled: true, stop() { this.readyState = 'ended'; } };
  return { getTracks: () => [track], getAudioTracks: () => [track], getVideoTracks: () => [] };
};
rtcOfferHarness.sandbox.navigator = { mediaDevices: { getUserMedia: async () => streamForOwner(rtcMediaOwner) } };
rtcOfferHarness.sandbox.RTCPeerConnection = class {
  constructor() {
    this.owner = rtcMediaOwner; this.connectionState = 'new'; this.iceConnectionState = 'new'; this.signalingState = 'stable';
    this.remoteDescription = null; this.localDescription = null; this.createAnswerCalls = 0; this.localAnswerCalls = 0;
    rtcPeerConnections.push(this);
  }
  addTrack() {}
  close() { this.connectionState = 'closed'; }
  async createOffer() { return { type: 'offer', sdp: `local-${this.owner}` }; }
  async createAnswer() { this.createAnswerCalls += 1; return { type: 'answer', sdp: `answer-${this.owner}` }; }
  setLocalDescription(description) {
    this.localDescription = description;
    if (description.type === 'rollback') this.signalingState = 'stable';
    else if (description.type === 'offer') this.signalingState = 'have-local-offer';
    else if (description.type === 'answer') { this.signalingState = 'stable'; this.localAnswerCalls += 1; }
    return Promise.resolve();
  }
  setRemoteDescription(description) {
    if (this.owner === 'a' && description.type === 'offer') {
      return new Promise((resolve) => { resolveClientARemoteDescription = () => { this.remoteDescription = description; this.signalingState = 'have-remote-offer'; resolve(); }; });
    }
    this.remoteDescription = description;
    this.signalingState = description.type === 'offer' ? 'have-remote-offer' : 'stable';
    return Promise.resolve();
  }
  addIceCandidate() { return Promise.resolve(); }
};
const rtcSocketA = { readyState: 1, sent: [], send(value) { this.sent.push(value); }, close() { this.readyState = 3; } };
rtcOfferHarness.sandbox._obClientWs = rtcSocketA;
new vm.Script(rtcModuleSource, { filename: 'ownlybiz-rtc-offer-race.js' }).runInContext(rtcOfferHarness.sandbox);
await rtcOfferHarness.sandbox.OB_RTC.start('session-a-offer', 'voice', 'client');
for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
const lateOfferContinuation = rtcOfferHarness.sandbox.OB_RTC.handleOffer('remote-offer-a');
for (let turn = 0; turn < 20 && !resolveClientARemoteDescription; turn += 1) await Promise.resolve();
assert(resolveClientARemoteDescription, 'client A remote-description application is pending before logout');
await changeAuth(rtcOfferHarness, null);
await changeAuth(rtcOfferHarness, clientBToken);
rtcMediaOwner = 'b';
const rtcSocketB = { readyState: 1, sent: [], send(value) { this.sent.push(value); }, close() { this.readyState = 3; } };
rtcOfferHarness.sandbox._obClientWs = rtcSocketB;
await rtcOfferHarness.sandbox.OB_RTC.start('session-b-offer', 'voice', 'client');
for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
resolveClientARemoteDescription();
await lateOfferContinuation;
const clientAPc = rtcPeerConnections.find((peer) => peer.owner === 'a');
const clientBPc = rtcPeerConnections.find((peer) => peer.owner === 'b');
assert(clientAPc && clientBPc, 'A and B own separate peer-connection instances');
assert.equal(clientAPc.createAnswerCalls, 0, 'stale A offer continuation exits before creating an answer');
assert.equal(clientBPc.createAnswerCalls, 0, 'stale A offer continuation never invokes B peer connection');
assert.equal(clientBPc.localAnswerCalls, 0, 'stale A offer continuation cannot install an answer in B state');
assert.equal(rtcSocketB.sent.some((value) => String(value).includes('rtc_answer')), false, 'stale A offer never sends an answer on B transport');
rtcOfferHarness.sandbox.OB_RTC.cleanup();

// A quality-sampling promise belongs to the exact RTC epoch, PC, sid, and client.
// If A's getStats resolves after B starts, it cannot update quality or signal on B's socket.
let resolveClientAStats;
let statsOwner = 'a';
const qualityPeers = [];
const qualityHarness = createHarness({ session: { ob_t: clientAToken } });
qualityHarness.sandbox.OWNLY_CONFIG = { rtc: {} };
const qualityTrack = (owner) => ({ kind: 'audio', owner, readyState: 'live', enabled: true, stop() { this.readyState = 'ended'; } });
qualityHarness.sandbox.navigator = { mediaDevices: { getUserMedia: async () => {
  const track = qualityTrack(statsOwner);
  return { getTracks: () => [track], getAudioTracks: () => [track], getVideoTracks: () => [] };
} } };
qualityHarness.sandbox.RTCPeerConnection = class {
  constructor() { this.owner = statsOwner; this.connectionState = 'new'; this.iceConnectionState = 'new'; this.signalingState = 'stable'; this.remoteDescription = null; qualityPeers.push(this); }
  addTrack() {}
  close() { this.connectionState = 'closed'; }
  async createOffer() { return { type: 'offer', sdp: `quality-offer-${this.owner}` }; }
  async setLocalDescription(description) { this.localDescription = description; this.signalingState = description.type === 'offer' ? 'have-local-offer' : 'stable'; }
  getStats() {
    if(this.owner === 'a') return new Promise((resolve) => { resolveClientAStats = resolve; });
    return Promise.resolve([]);
  }
};
const qualitySocketA = { readyState: 1, sent: [], send(value) { this.sent.push(value); }, close() { this.readyState = 3; } };
qualityHarness.sandbox._obClientWs = qualitySocketA;
new vm.Script(rtcModuleSource, { filename: 'ownlybiz-rtc-quality-race.js' }).runInContext(qualityHarness.sandbox);
await qualityHarness.sandbox.OB_RTC.start('session-a-quality', 'voice', 'client');
qualityHarness.sandbox.OB_RTC.testStartQualityMonitor();
const qualityTickA = [...qualityHarness.intervals.values()].at(-1);
assert.equal(typeof qualityTickA, 'function', 'client A quality monitor owns an executable interval callback');
qualityTickA();
await settleAsync();
assert(resolveClientAStats, 'client A getStats is pending before the identity changes');
await changeAuth(qualityHarness, null);
await changeAuth(qualityHarness, clientBToken);
statsOwner = 'b';
const qualitySocketB = { readyState: 1, sent: [], send(value) { this.sent.push(value); }, close() { this.readyState = 3; } };
qualityHarness.sandbox._obClientWs = qualitySocketB;
await qualityHarness.sandbox.OB_RTC.start('session-b-quality', 'voice', 'client');
resolveClientAStats([{
  id: 'remote-a', type: 'remote-inbound-rtp', roundTripTime: 2.5, timestamp: 1000,
}]);
await settleAsync(20);
assert.equal(qualityHarness.sandbox.OB_RTC.getQuality().level, 'unknown', 'late client A stats cannot mutate client B quality state');
assert.equal(qualitySocketB.sent.some((value) => String(value).includes('rtc_quality')), false, 'late client A stats cannot send quality signaling on client B transport');
assert.equal(qualitySocketA.sent.some((value) => String(value).includes('rtc_quality')), false, 'invalidated client A stats cannot send after teardown');
qualityHarness.sandbox.OB_RTC.cleanup();

// A late client-A readiness response must not overwrite client B after the identity swap.
let resolveClientAReadiness;
const raceHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: (url, init = {}) => {
  const authorization = init.headers?.Authorization || '';
  if (String(url).includes('/api/payments/methods/status') && authorization === `Bearer ${clientAToken}`) {
    return new Promise((resolve) => { resolveClientAReadiness = resolve; });
  }
  return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) });
} });
raceHarness.sandbox._currentExpertId = 'expert-race';
const raceHooks = raceHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
const lateClientARequest = raceHooks.refreshSavedPaymentStatus(true, 'expert-race');
await changeAuth(raceHarness, null);
await changeAuth(raceHarness, clientBToken);
resolveClientAReadiness({ ok: true, json: async () => ({ has_saved_payment_method: true, mode: 'test' }) });
await lateClientARequest;
assert.equal(raceHooks.savedPayment.accountKey, clientBKey, 'late client-A response cannot change the active cache owner');
assert.equal(raceHooks.savedPayment.available, false, 'late client-A response cannot expose its saved card to client B');
assert.equal(raceHooks.savedPayment.useSaved, false, 'late client-A response cannot switch client B to saved-payment mode');

// Late direct-session responses are account-bound before success, API-error, or network-error UI work.
const liveRaceHarness = createHarness({ session: { ob_t: clientAToken } });
const liveRaceHooks = liveRaceHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
const liveRequestId = 'request-client-a';
liveRaceHooks.state.phase = 'binding';
liveRaceHooks.state.requestId = liveRequestId;
liveRaceHooks.state.accountKey = clientAKey;
assert.equal(liveRaceHarness.sandbox.obClientSessionRequestContinuationAllowed('minute', liveRequestId, clientAToken), true,
  'the originating client can continue its card-backed live request');
assert.equal(liveRaceHarness.sandbox.obClientSessionRequestContinuationAllowed('prepaid', '', clientAToken), true,
  'the originating client can continue its prepaid live request');

await changeAuth(liveRaceHarness, null);
await changeAuth(liveRaceHarness, clientBToken);
// Even if B happened to create the same deterministic request id, A's captured token is rejected.
liveRaceHooks.state.phase = 'binding';
liveRaceHooks.state.requestId = liveRequestId;
liveRaceHooks.state.accountKey = clientBKey;
let lateSessionInstalls = 0;
let lateSessionErrors = 0;
const applyLateSessionResponse = (mode, kind) => {
  if (!liveRaceHarness.sandbox.obClientSessionRequestContinuationAllowed(mode, mode === 'prepaid' ? '' : liveRequestId, clientAToken)) return;
  if (kind === 'success') lateSessionInstalls += 1;
  else lateSessionErrors += 1;
};
applyLateSessionResponse('minute', 'success');
applyLateSessionResponse('minute', 'api-error');
applyLateSessionResponse('minute', 'network-error');
applyLateSessionResponse('prepaid', 'success');
applyLateSessionResponse('prepaid', 'network-error');
assert.equal(lateSessionInstalls, 0, 'late client-A success cannot install either card-backed or prepaid session state in client B UI');
assert.equal(lateSessionErrors, 0, 'late client-A API/network errors cannot clear or alert client B UI');
assert.equal(liveRaceHarness.sandbox.obClientSessionRequestContinuationAllowed('prepaid', '', clientBToken), true,
  'prepaid remains available to the current authenticated client');

const scheduledData = (owner, ready = true) => ({
  owner,
  authorization_required: true,
  authorization_ready: ready,
  authorization_available: true,
  authorization_expires_at: Math.floor((Date.now() + 5 * 60_000) / 1000),
  booking: { id: 'booking-account-isolation', expert_id: 'expert-scheduled', channel: 'chat', payment_mode: 'minute', booking_type: 'permin' },
});

// A late scheduled-join response cannot repopulate B's controller, and logout/login re-renders the correct card.
let resolveScheduledAJoin;
const scheduledJoinRequests = [];
const scheduledJoinHarness = createHarness({
  search: '?booking=booking-account-isolation',
  session: { ob_t: clientAToken },
  fetchImpl: (url, init = {}) => {
    const request = { url: String(url), authorization: init.headers?.Authorization || '', cache: init.cache };
    scheduledJoinRequests.push(request);
    if (request.url.includes('/api/bookings/booking-account-isolation/join') && request.authorization === `Bearer ${clientAToken}`) {
      return new Promise((resolve) => { resolveScheduledAJoin = resolve; });
    }
    if (request.url.includes('/api/bookings/booking-account-isolation/join') && request.authorization === `Bearer ${clientBToken}`) {
      return Promise.resolve({ ok: true, json: async () => scheduledData('client-b', true) });
    }
    if (request.url.includes('/api/payments/authorize/cancel')) return Promise.resolve({ ok: true, json: async () => ({ released: true }) });
    return Promise.resolve({ ok: false, json: async () => ({ error: 'unexpected request' }) });
  },
});
const scheduledJoinOverlay = new FakeElement('div'); scheduledJoinOverlay.id = 'booking-join-overlay';
const scheduledJoinPanel = new FakeElement('div'); scheduledJoinPanel.appendChild(new FakeElement('div')); scheduledJoinOverlay.appendChild(scheduledJoinPanel); scheduledJoinHarness.body.appendChild(scheduledJoinOverlay);
const scheduledJoinHooks = scheduledJoinHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
const lateScheduledAJoin = scheduledJoinHooks.enhanceBookingJoinOverlay({ force: true });
assert(resolveScheduledAJoin, 'client A scheduled readiness request is in flight');
let scheduledCardClears = 0;
let scheduledCardUnmounts = 0;
let scheduledCardDestroys = 0;
scheduledJoinHooks.bookingController.card = {
  clear() { scheduledCardClears += 1; },
  unmount() { scheduledCardUnmounts += 1; },
  destroy() { scheduledCardDestroys += 1; },
};
const scheduledLogout = changeAuth(scheduledJoinHarness, null);
assert.deepEqual([scheduledCardClears, scheduledCardUnmounts, scheduledCardDestroys], [1, 1, 1],
  'auth change clears, unmounts, and destroys the previous account scheduled CardElement');
await scheduledLogout;
assert.equal(scheduledJoinHarness.document.getElementById('ob-booking-auth-heading').textContent, 'Sign in to confirm payment',
  'logout re-renders the scheduled booking sign-in state after clearing the account controller');

await changeAuth(scheduledJoinHarness, clientBToken);
assert.equal(scheduledJoinHooks.bookingController.context.accountKey, clientBKey, 'scheduled controller is rebound to client B');
assert.equal(scheduledJoinHooks.bookingController.data.owner, 'client-b', 'client B receives a fresh scheduled readiness response');
assert.equal(scheduledJoinHarness.document.getElementById('ob-booking-auth-heading').textContent, '✓ $5 temporary authorization approved',
  'signup/login immediately re-renders client B scheduled payment readiness');

resolveScheduledAJoin({ ok: true, json: async () => scheduledData('client-a', false) });
await lateScheduledAJoin;
assert.equal(scheduledJoinHooks.bookingController.context.accountKey, clientBKey, 'late client-A join response cannot reclaim the scheduled controller');
assert.equal(scheduledJoinHooks.bookingController.data.owner, 'client-b', 'late client-A join data cannot replace client B data');
assert.equal(scheduledJoinHarness.document.getElementById('ob-booking-auth-heading').textContent, '✓ $5 temporary authorization approved',
  'late client-A join response cannot replace client B scheduled UI');
const scheduledJoinAuth = scheduledJoinRequests.filter((request) => request.url.includes('/join')).map((request) => request.authorization);
assert.deepEqual(scheduledJoinAuth, [`Bearer ${clientAToken}`, `Bearer ${clientBToken}`],
  'scheduled booking readiness is fetched once with each account\'s captured credential');
assert(scheduledJoinRequests.filter((request) => request.url.includes('/join')).every((request) => request.cache === 'no-store'),
  'scheduled booking readiness bypasses HTTP cache for both accounts');

// Changing accounts while A's scheduled authorization bind is pending cannot mutate B after the bind resolves.
let resolveScheduledBind;
const scheduledBindRequests = [];
const scheduledBindHarness = createHarness({
  search: '?booking=booking-account-isolation',
  session: { ob_t: clientAToken },
  fetchImpl: (url, init = {}) => {
    const request = { url: String(url), authorization: init.headers?.Authorization || '' };
    scheduledBindRequests.push(request);
    if (request.url.includes('/api/bookings/booking-account-isolation/join')) {
      const owner = request.authorization === `Bearer ${clientAToken}` ? 'client-a' : 'client-b';
      return Promise.resolve({ ok: true, json: async () => scheduledData(owner, owner === 'client-b') });
    }
    if (request.url.includes('/api/payments/authorize/cancel')) return Promise.resolve({ ok: true, json: async () => ({ released: true }) });
    if (request.url.endsWith('/api/payments/authorize')) {
      return Promise.resolve({ ok: true, json: async () => ({
        payment_intent_id: 'pi-client-a', authorization_request_id: 'authorization-client-a', status: 'requires_capture', amount_authorized: 5,
      }) });
    }
    if (request.url.includes('/api/bookings/booking-account-isolation/authorize')) {
      return new Promise((resolve) => { resolveScheduledBind = resolve; });
    }
    return Promise.resolve({ ok: false, json: async () => ({ error: 'unexpected request' }) });
  },
});
const scheduledBindOverlay = new FakeElement('div'); scheduledBindOverlay.id = 'booking-join-overlay';
const scheduledBindPanel = new FakeElement('div'); scheduledBindPanel.appendChild(new FakeElement('div')); scheduledBindOverlay.appendChild(scheduledBindPanel); scheduledBindHarness.body.appendChild(scheduledBindOverlay);
const scheduledBindHooks = scheduledBindHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
const scheduledBindAction = scheduledBindHooks.authorizeScheduledBooking(false);
for (let turn = 0; turn < 30 && !resolveScheduledBind; turn += 1) await Promise.resolve();
assert(resolveScheduledBind, 'client A scheduled bind is in flight before the identity changes');
const bindRequest = scheduledBindRequests.find((request) => request.url.includes('/bookings/booking-account-isolation/authorize'));
assert.equal(bindRequest.authorization, `Bearer ${clientAToken}`, 'scheduled bind uses the credential captured for client A');

await changeAuth(scheduledBindHarness, null);
await changeAuth(scheduledBindHarness, clientBToken);
assert.equal(scheduledBindHooks.bookingController.data.owner, 'client-b', 'client B scheduled state loads while A bind remains pending');
resolveScheduledBind({ ok: true, json: async () => ({ success: true, authorization_ready: true }) });
await scheduledBindAction;
assert.equal(scheduledBindHooks.bookingController.context.accountKey, clientBKey, 'late client-A bind success cannot reclaim client B controller');
assert.equal(scheduledBindHooks.bookingController.data.owner, 'client-b', 'late client-A bind success cannot overwrite client B booking data');
assert.equal(scheduledBindHooks.bookingController.error, '', 'late client-A bind continuation cannot surface an error in client B UI');
assert.equal(scheduledBindHooks.bookingController.busy, false, 'client B scheduled controller is not left busy by client A action');
assert.equal(scheduledBindHooks.state.paymentIntentId, '', 'client A authorization state is not restored after the account switch');
assert.equal(scheduledBindHarness.sandbox.sessionStorage.getItem('ob_live_authorization'), null,
  'client A scheduled authorization persistence stays cleared after the account switch');

// A server-bound scheduled hold is detached even when a same-principal credential
// rotation replaces the UI controller while the bind request is pending.
let resolveRotatedScheduledBind;
const rotatedScheduledRequests = [];
const rotatedScheduledData = {
  owner: 'client-a',
  authorization_required: true,
  authorization_ready: false,
  authorization_available: true,
  authorization_expires_at: Math.floor((Date.now() + 5 * 60_000) / 1000),
  booking: { id: 'booking-rotation-bind', expert_id: 'expert-scheduled', channel: 'chat', payment_mode: 'minute', booking_type: 'permin' },
};
const rotatedScheduledHarness = createHarness({
  search: '?booking=booking-rotation-bind',
  session: { ob_t: clientAToken },
  fetchImpl: (url, init = {}) => {
    const request = {
      url: String(url),
      authorization: init.headers?.Authorization || '',
      body: init.body ? JSON.parse(init.body) : null,
    };
    rotatedScheduledRequests.push(request);
    if (request.url.includes('/api/bookings/booking-rotation-bind/join')) {
      return Promise.resolve({ ok: true, json: async () => rotatedScheduledData });
    }
    if (request.url.includes('/api/payments/methods/status')) {
      return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) });
    }
    if (request.url.includes('/api/payments/authorize/cancel')) {
      return Promise.resolve({ ok: true, json: async () => ({ released: true }) });
    }
    if (request.url.endsWith('/api/payments/authorize')) {
      if (request.body?.booking_id === 'booking-rotation-bind') {
        return Promise.resolve({ ok: true, json: async () => ({
          payment_intent_id: 'pi-scheduled-rotation',
          authorization_request_id: 'authorization-scheduled-rotation',
          status: 'requires_capture',
          amount_authorized: 5,
        }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({
        payment_intent_id: 'pi-immediate-after-bind',
        authorization_request_id: 'authorization-immediate-after-bind',
        status: 'requires_capture',
        amount_authorized: 5,
      }) });
    }
    if (request.url.includes('/api/bookings/booking-rotation-bind/authorize')) {
      return new Promise((resolve) => { resolveRotatedScheduledBind = resolve; });
    }
    throw new Error(`unexpected rotated scheduled-bind request: ${request.url}`);
  },
});
const rotatedScheduledOverlay = new FakeElement('div'); rotatedScheduledOverlay.id = 'booking-join-overlay';
const rotatedScheduledPanel = new FakeElement('div'); rotatedScheduledPanel.appendChild(new FakeElement('div')); rotatedScheduledOverlay.appendChild(rotatedScheduledPanel); rotatedScheduledHarness.body.appendChild(rotatedScheduledOverlay);
const rotatedScheduledHooks = rotatedScheduledHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
const rotatedScheduledAction = rotatedScheduledHooks.authorizeScheduledBooking(false);
for (let turn = 0; turn < 30 && !resolveRotatedScheduledBind; turn += 1) await Promise.resolve();
assert(resolveRotatedScheduledBind, 'scheduled bind is pending before the same-principal credential rotates');
const originatingScheduledContext = rotatedScheduledHooks.bookingController.context;
assert.equal(rotatedScheduledHooks.state.phase, 'ready', 'the scheduled hold is locally ready while server binding is pending');
assert.equal(rotatedScheduledHooks.state.paymentIntentId, 'pi-scheduled-rotation', 'the pending bind owns the scheduled PaymentIntent');
assert(rotatedScheduledHarness.sandbox.sessionStorage.getItem('ob_live_authorization')?.includes('pi-scheduled-rotation'),
  'the pending scheduled hold is persisted before server binding succeeds');

await changeAuth(rotatedScheduledHarness, clientARotatedToken);
assert.notEqual(rotatedScheduledHooks.bookingController.context, originatingScheduledContext,
  'same-principal credential rotation replaces the exact scheduled UI controller');
resolveRotatedScheduledBind({ ok: true, json: async () => ({ success: true, authorization_ready: true }) });
await rotatedScheduledAction;
assert.equal(rotatedScheduledHooks.state.phase, 'idle', 'server-bound scheduled hold is detached after the rotated continuation succeeds');
assert.equal(rotatedScheduledHooks.state.paymentIntentId, '', 'server-bound scheduled PaymentIntent is cleared locally');
assert.equal(rotatedScheduledHooks.state.requestId, '', 'server-bound scheduled request ownership is cleared locally');
assert.equal(rotatedScheduledHarness.sandbox.sessionStorage.getItem('ob_live_authorization'), null,
  'server-bound scheduled persistence is removed despite the replaced UI controller');
assert.equal(rotatedScheduledRequests.some((request) => request.url.includes('/api/payments/authorize/cancel')), false,
  'a successfully server-bound scheduled hold is not cancelled during credential rotation');

const immediateAfterBind = await rotatedScheduledHarness.sandbox.obAuthorizeSessionHold({
  expertId: 'expert-immediate-after-bind', channel: 'chat', token: clientARotatedToken,
});
assert.equal(immediateAfterBind.payment_intent_id, 'pi-immediate-after-bind',
  'the rotated principal can immediately create an unrelated live-session hold');
assert.equal(rotatedScheduledHooks.state.context, 'live:expert-immediate-after-bind:owner:chat',
  'the unrelated immediate flow owns its independent payment context');
assert.equal(rotatedScheduledHooks.detachServerBoundBookingAuthorization(originatingScheduledContext, {
  authorization_payment_intent_id: 'pi-scheduled-rotation',
  authorization_request_id: 'authorization-scheduled-rotation',
}), false, 'a stale scheduled continuation cannot detach an unrelated immediate hold');
assert.equal(rotatedScheduledHooks.state.paymentIntentId, 'pi-immediate-after-bind',
  'exact booking/request/PaymentIntent ownership preserves the unrelated immediate hold');
assert.equal(rotatedScheduledRequests.some((request) => request.url.includes('/api/payments/authorize/cancel')), false,
  'the scheduled bind race never cancels the unrelated immediate flow');

// Rapid duplicate "use another card" actions share one mount and one CardElement owner.
let resolveDuplicateMountConfig;
let duplicateMountConfigRequests = 0;
let duplicateCardCreates = 0;
let duplicateCardMounts = 0;
let duplicateCardChanges = 0;
const duplicateMountData = {
  authorization_required: true,
  authorization_ready: false,
  authorization_available: true,
  booking: { id: 'booking-duplicate-mount', expert_id: 'expert-scheduled', channel: 'chat', payment_mode: 'minute', booking_type: 'permin' },
};
const duplicateMountHarness = createHarness({
  search: '?booking=booking-duplicate-mount',
  session: { ob_t: clientAToken },
  fetchImpl: (url) => {
    const requestUrl = String(url);
    if (requestUrl.includes('/api/bookings/booking-duplicate-mount/join')) {
      return Promise.resolve({ ok: true, json: async () => duplicateMountData });
    }
    if (requestUrl.includes('/api/payments/config')) {
      duplicateMountConfigRequests += 1;
      return new Promise((resolve) => { resolveDuplicateMountConfig = resolve; });
    }
    return Promise.resolve({ ok: false, json: async () => ({ error: 'unexpected request' }) });
  },
});
const duplicateMountOverlay = new FakeElement('div'); duplicateMountOverlay.id = 'booking-join-overlay';
const duplicateMountPanel = new FakeElement('div'); duplicateMountPanel.appendChild(new FakeElement('div')); duplicateMountOverlay.appendChild(duplicateMountPanel); duplicateMountHarness.body.appendChild(duplicateMountOverlay);
const duplicateMountHooks = duplicateMountHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
await duplicateMountHooks.enhanceBookingJoinOverlay({ force: true });
const duplicateMountedCard = {
  mount() { duplicateCardMounts += 1; },
  on(name, handler) { if (name === 'change') this.changeHandler = handler; },
  focus() {}, clear() {}, unmount() {}, destroy() {},
};
duplicateMountHarness.sandbox.Stripe = () => ({
  elements: () => ({ create() { duplicateCardCreates += 1; return duplicateMountedCard; } }),
});
const firstDuplicateMount = duplicateMountHooks.mountBookingReplacementCard();
const secondDuplicateMount = duplicateMountHooks.mountBookingReplacementCard();
assert.equal(duplicateMountConfigRequests, 1, 'duplicate replacement-card actions share one in-flight config request');
assert(resolveDuplicateMountConfig, 'the shared Stripe config request is pending before either mount completes');
resolveDuplicateMountConfig({ ok: true, json: async () => ({ publishable_key: 'pk_test_duplicate_mount' }) });
await Promise.all([firstDuplicateMount, secondDuplicateMount]);
assert.equal(duplicateCardCreates, 1, 'duplicate replacement-card actions create exactly one CardElement');
assert.equal(duplicateCardMounts, 1, 'the one replacement CardElement is mounted exactly once');
assert.equal(duplicateMountHooks.bookingController.card, duplicateMountedCard, 'the mounted CardElement remains the controller owner');
assert.equal(duplicateMountHooks.bookingController.cardMountPromise, null, 'the mount lock is released after the shared mount completes');
duplicateMountedCard.changeHandler({ complete: true }); duplicateCardChanges += 1;
assert.equal(duplicateMountHooks.bookingController.cardComplete, true, 'the single mounted CardElement owns completion state');
assert.equal(duplicateCardChanges, 1);

async function assertAuthoritativeScheduledStateSkipsHold({ bookingId, data, expectedHeading, message }) {
  let holdRequests = 0;
  const harness = createHarness({
    search: `?booking=${bookingId}`,
    session: { ob_t: clientAToken },
    fetchImpl: (url) => {
      const requestUrl = String(url);
      if (requestUrl.includes(`/api/bookings/${bookingId}/join`)) return Promise.resolve({ ok: true, json: async () => data });
      if (requestUrl.endsWith('/api/payments/authorize')) {
        holdRequests += 1;
        return Promise.resolve({ ok: true, json: async () => ({ payment_intent_id: 'pi_duplicate_hold' }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'unexpected request' }) });
    },
  });
  const overlay = new FakeElement('div'); overlay.id = 'booking-join-overlay';
  const panel = new FakeElement('div'); panel.appendChild(new FakeElement('div')); overlay.appendChild(panel); harness.body.appendChild(overlay);
  const stateHooks = harness.sandbox.obPayPerMinuteAuthorizationTestHooks;
  await stateHooks.authorizeScheduledBooking(false);
  assert.equal(holdRequests, 0, message);
  assert.equal(harness.document.getElementById('ob-booking-auth-heading').textContent, expectedHeading,
    'the authoritative refreshed state replaces the stale payment action');
  assert.equal(stateHooks.bookingController.busy, false, 'an authoritative no-action refresh does not enter payment busy state');
}

await assertAuthoritativeScheduledStateSkipsHold({
  bookingId: 'booking-already-ready',
  data: {
    authorization_required: true,
    authorization_ready: true,
    authorization_available: true,
    authorization_expires_at: Math.floor((Date.now() + 5 * 60_000) / 1000),
    booking: { id: 'booking-already-ready', expert_id: 'expert-scheduled', channel: 'chat', payment_mode: 'minute', booking_type: 'permin' },
  },
  expectedHeading: '✓ $5 temporary authorization approved',
  message: 'a stale payment button cannot create a second hold after the fresh join response is already ready',
});

await assertAuthoritativeScheduledStateSkipsHold({
  bookingId: 'booking-authorization-not-required',
  data: {
    authorization_required: false,
    authorization_ready: false,
    authorization_available: true,
    booking: { id: 'booking-authorization-not-required', expert_id: 'expert-scheduled', channel: 'chat', payment_mode: 'minute', booking_type: 'permin' },
  },
  expectedHeading: 'Payment is already covered',
  message: 'a fresh required=false response cannot create a hold from a stale payment button',
});

assert.match(
  html,
  /var requestId=\+\+_bflSlotsRequest;[\s\S]*?requestId===_bflSlotsRequest[\s\S]*?bflCurrentExpertSlug\(\)===slug[\s\S]*?_bflSelectedDate===requestedDate/,
  'the BFL slot loader owns its expert, date, and request generation before rendering a response',
);
assert.match(
  html,
  /function syncClientSession\(sid\)\{[\s\S]*?var requestSid=String\(sid\);[\s\S]*?String\(window\._obActiveSessId\|\|window\._sessId\|\|'\'\)===requestSid[\s\S]*?responseSid&&responseSid!==requestSid/,
  'live-session refreshes cannot apply a response belonging to a superseded session id',
);
assert.match(
  html,
  /window\.startBookingSession=function\(bookingId\)\{[\s\S]*?clientContext\.capture\('expert-booking-start',[\s\S]*?actionSeq===expertBookingStartSeq&&clientContext\.isCurrent\(context\)[\s\S]*?if\(!data\|\|!owns\(\)\)return;/,
  'expert booking start ignores late success and error continuations after identity or booking target changes',
);

let scriptCount = 0;
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  scriptCount += 1;
  if (match[1].trim()) new vm.Script(match[1], { filename: `index.html#script-${scriptCount}` });
}
assert(scriptCount > 0, 'all inline scripts were syntax parsed');

console.log('pay-per-minute authorization frontend smoke: ok');
