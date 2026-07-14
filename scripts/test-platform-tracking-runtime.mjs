import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/platform-tracking.js', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const CONSENT_KEY = 'ob_privacy_consent_v1';
const ATTRIBUTION_KEY = 'ob_tracking_attribution_v1';
const ANALYTICS_CLIENT_KEY = 'ob_tracking_analytics_client_id_v1';
const ANALYTICS_SESSION_KEY = 'ob_tracking_analytics_session_id_v1';
const ANALYTICS_SESSION_ACTIVITY_KEY = 'ob_tracking_analytics_session_activity_v1';

assert(source.includes("'https://ownlybiz-backend-production.up.railway.app'"), 'tracking runtime fallback must target the production backend');
assert(indexSource.includes('window.OWNLYBIZ_IS_STAGING=false;'), 'production shell must keep the staging flag disabled');

assert(!/real test conversion/i.test(source), 'LinkedIn UI must never imply that local validation sends a real conversion');
assert(source.includes('LinkedIn configuration validated locally. No conversion was sent.'), 'LinkedIn result copy must state local-only validation');
assert(!source.includes("window.lintrk('track'"), 'LinkedIn canonical conversions must never fire from the managed browser runtime');
assert(source.includes('server-side CAPI'), 'LinkedIn Admin copy must identify the authoritative server conversion path');
assert(source.includes('Provider changes affect only the current Ownlybiz workspace'), 'Tracking Admin helper copy must stay environment-scoped');
assert(!source.includes('Enabled for this staging connection'), 'provider enable labels must not hardcode staging');
assert(source.includes('Enabled for this workspace connection'), 'provider enable labels must be environment-safe');
assert(source.includes("bannerTitle:'Staging/test credentials only'"), 'source must retain the staging isolated-test warning path');
assert(source.includes("bannerTitle:'Production tracking uses real customer data'"), 'source must include the production real-data warning path');
assert(source.includes("testEventPlaceholder:'Optional staging test event code'"), 'source must retain the staging provider test-code placeholder');
assert(source.includes("testEventPlaceholder:'Optional test event code - may appear in live measurement tools'"), 'source must include the production-safe test-code warning');
assert(!indexSource.includes('Loading the staging Tracking &amp; Ads service'), 'Tracking Admin loading placeholder must not hardcode staging');
assert(indexSource.includes('Loading the Tracking &amp; Ads service'), 'Tracking Admin loading placeholder must remain environment-neutral');
assert(source.includes('<option value="gtm_meta"'), 'Tracking Admin must expose the explicit GTM + Ownlybiz Meta mode');
assert(source.includes('Do not add another Meta Pixel tag inside GTM.'), 'hybrid Admin copy must warn against duplicate Meta tags');
assert(indexSource.includes('if(appConsentSuppressedContext() && !manual)'), 'automatic consent suppression must not block an explicit Cookie Preferences request');
assert(indexSource.includes('window.obOpenConsentManager = function(){ return openConsent({manual:true}); };'), 'Cookie Preferences buttons must open the consent manager explicitly');
assert(indexSource.includes('(appConsentSuppressedContext() && !window._obConsentManualOpen)'), 'the consent guard must keep an explicitly opened manager visible on legal and Admin pages');

const monotonicFunctionMatch = indexSource.match(/(function nextConsentUpdatedAt\(previousUpdatedAt, nowMs\)\{[\s\S]*?\n  \})\n  function setConsent/);
assert(monotonicFunctionMatch, 'index consent timestamp helper must remain testable');
const nextConsentUpdatedAt = vm.runInNewContext(`(${monotonicFunctionMatch[1]})`);
const timestampBaseline = '2026-07-11T14:00:00.000Z';
const timestampBaselineMs = Date.parse(timestampBaseline);
assert.equal(nextConsentUpdatedAt(timestampBaseline, timestampBaselineMs), '2026-07-11T14:00:00.001Z', 'same-millisecond consent toggles advance by 1ms');
assert.equal(nextConsentUpdatedAt(timestampBaseline, timestampBaselineMs - 5000), '2026-07-11T14:00:00.001Z', 'clock rollback cannot make consent updated_at stale');
assert.equal(nextConsentUpdatedAt(timestampBaseline, timestampBaselineMs + 250), '2026-07-11T14:00:00.250Z', 'later wall clock time is preserved');
assert(indexSource.includes('delete consentValue.updated_at;'), 'caller input cannot override the generated monotonic updated_at');

class Store {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
  clear() { this.values.clear(); }
}

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get() { return ''; } },
    async json() { return body; }
  };
}

function providers() {
  return {
    ga4: { enabled: true, status: 'connected', config: { measurement_id: 'G-TEST12345' }, mappings: { page_view: 'page_view', plan_selected: 'select_item' } },
    google_ads: { enabled: true, status: 'connected', config: { conversion_id: 'AW-123456789', plan_custom_variable_tag: 'selected_plan', interval_custom_variable_tag: 'billing_interval' }, mappings: { page_view: { label: 'PAGEVIEW' }, plan_selected: { label: 'PLANSELECT' } } },
    meta: { enabled: true, status: 'connected', config: { pixel_id: '123456789012345' }, mappings: {
      page_view: 'PageView', view_pricing: 'ViewContent', primary_cta_clicked: 'PrimaryCTAClicked',
      signup_started: 'SignupStarted', plan_selected: 'PlanSelected', lead_generated: 'Lead',
      signup_completed: 'CompleteRegistration', email_verified: 'EmailVerified',
      checkout_started: 'InitiateCheckout', purchase: 'Purchase', subscription_renewed: 'SubscriptionRenewed',
      subscription_cancelled: 'SubscriptionCancelled', refund_issued: 'Refund', website_published: 'WebsitePublished'
    } },
    gtm: { enabled: true, status: 'connected', config: { container_id: 'GTM-TEST123' } },
    tiktok: { enabled: true, status: 'connected', config: { pixel_code: 'TIKTOK123' }, mappings: { page_view: 'PageView', plan_selected: 'ViewContent' } },
    linkedin: { enabled: true, status: 'connected', config: { partner_id: '123456' }, mappings: { page_view: '987654' } },
    custom_webhook: { enabled: true, status: 'connected', config: {} }
  };
}

function createHarness({ path = '/pricing', search = '?gclid=GCLID_123&fbclid=FBCLID_456&utm_source=google&utm_medium=cpc&utm_campaign=summer_launch&reset_token=never-store-me', consent = null, mode = 'managed', authToken = '', activeView = 1, configPolicy = 'tracking-consent-2026-07', consentDelays = [], consentResults = [] } = {}) {
  const origin = 'https://ownlybiz.com';
  const requests = [];
  const scriptRequests = [];
  const elementsById = new Map();
  const localStorage = new Store(consent ? { [CONSENT_KEY]: JSON.stringify(consent) } : {});
  const sessionStorage = new Store();
  if(authToken) sessionStorage.setItem('ob_t', authToken);
  const documentListeners = {};
  const windowListeners = {};
  let cookieValue = '_fbp=fb.1.1700000000.123456789';
  let currentActiveView = Number(activeView) || 1;
  let consentOpenCount = 0;
  let consentRequestCount = 0;
  let consentRequestsInFlight = 0;
  let maxConsentRequestsInFlight = 0;

  const config = {
    success: true,
      tracking: {
        environment: 'production',
        enabled: true,
        browser_mode: mode,
        schema_version: '2026-07-12.v1',
      policy_version: configPolicy,
      providers: providers()
    }
  };

  async function fetchMock(url, init = {}) {
    const record = { url: String(url), init: { ...init } };
    requests.push(record);
    const pathname = new URL(String(url), origin).pathname;
    if(pathname === '/api/tracking/config') return response(config);
    if(pathname === '/api/tracking/consent') {
      const body = JSON.parse(init.body || '{}');
      const sequence = ++consentRequestCount;
      consentRequestsInFlight += 1;
      maxConsentRequestsInFlight = Math.max(maxConsentRequestsInFlight, consentRequestsInFlight);
      const delay = Number(consentDelays[sequence - 1] || 0);
      if(delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      consentRequestsInFlight -= 1;
      const configuredResult = consentResults[sequence - 1];
      return response(configuredResult || { success: true, receipt: { receipt_id: `receipt-${sequence}-${body.consent_id}` }, policy_version: body.policy_version });
    }
    if(pathname === '/api/tracking/event') return response({ success: true, accepted: true });
    return response({ success: true, url: 'https://checkout.test/session' });
  }

  const location = {
    hostname: 'ownlybiz.com',
    origin,
    pathname: path,
    search,
    hash: '#sentinel-fragment',
    href: origin + path + search + '#sentinel-fragment'
  };
  const document = {
    readyState: 'complete',
    title: 'Ownlybiz',
    referrer: 'https://search.example/results?verify_token=secret#private',
    head: {
      appendChild(node) {
        if(node.id) elementsById.set(node.id, node);
        if(node.src) scriptRequests.push(node.src);
        setTimeout(() => node.onload && node.onload(), 0);
        return node;
      }
    },
    createElement(tag) { return { tagName: String(tag).toUpperCase(), id: '', src: '', async: false, setAttribute(name, value) { this[name] = value; } }; },
    getElementById(id) { return elementsById.get(id) || null; },
    querySelector(selector) {
      return String(selector || '').includes(`#view-${currentActiveView}.active`) ? { id: `view-${currentActiveView}` } : null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { (documentListeners[type] ||= []).push(fn); },
    dispatchEvent(event) { (documentListeners[event.type] || []).forEach(fn => fn(event)); }
  };
  Object.defineProperty(document, 'cookie', {
    get() { return cookieValue; },
    set(value) {
      const name = String(value).split('=')[0];
      if(/Max-Age=0/i.test(value)) cookieValue = cookieValue.split(';').filter(part => part.trim().split('=')[0] !== name).join(';');
      else cookieValue = value;
    }
  });

  const history = {
    pushState() {},
    replaceState() {}
  };
  const window = {
    window: null,
    document,
    location,
    history,
    localStorage,
    sessionStorage,
    fetch: fetchMock,
    crypto: { randomUUID },
    dataLayer: [],
    setTimeout,
    clearTimeout,
    URL,
    URLSearchParams,
    console,
    addEventListener(type, fn) { (windowListeners[type] ||= []).push(fn); },
    dispatchEvent(event) { (windowListeners[event.type] || []).forEach(fn => fn(event)); },
    CustomEvent: class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    OWNLYBIZ_IS_STAGING: false,
    OWNLYBIZ_API_URL: 'https://ownlybiz-backend-production.up.railway.app',
    obPlatformRouteRoots: { 'index.html': 1, pricing: 1, signup: 1, admin: 1, dash: 1, blog: 1, experts: 1, contact: 1, features: 1, how: 1 },
    switchView(n) { currentActiveView = Number(n) || currentActiveView; },
    obOpenConsentManager() { consentOpenCount += 1; }
  };
  window.window = window;
  const context = vm.createContext({
    window,
    document,
    location,
    history,
    localStorage,
    sessionStorage,
    fetch: fetchMock,
    crypto: window.crypto,
    CustomEvent: window.CustomEvent,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Promise,
    Error,
    encodeURIComponent,
    decodeURIComponent
  });
  vm.runInContext(source, context, { filename: 'platform-tracking.js' });

  return {
    window, document, localStorage, sessionStorage, requests, scriptRequests, config, location,
    get consentOpenCount() { return consentOpenCount; },
    get maxConsentRequestsInFlight() { return maxConsentRequestsInFlight; }
  };
}

const wait = (ms = 35) => new Promise(resolve => setTimeout(resolve, ms));
const requestBodies = (harness, suffix) => harness.requests.filter(item => new URL(item.url).pathname.endsWith(suffix)).map(item => JSON.parse(item.init.body || '{}'));
const dataLayerAnalyticsIdentifiers = harness => harness.window.dataLayer.reduce((values, entry) => {
  if(!entry) return values;
  if(entry.event === 'ownlybiz_event') values.push(entry.analytics_client_id, entry.analytics_session_id);
  const command = entry[0];
  const parameters = entry[2];
  if((command === 'config' || command === 'event') && parameters && typeof parameters === 'object') values.push(parameters.client_id, parameters.session_id);
  return values;
}, []).filter(Boolean).map(String);

async function freshConsentTest() {
  const h = createHarness();
  await wait();
  assert.deepEqual(h.scriptRequests, [], 'fresh consent must load no provider script');
  assert.equal(h.localStorage.getItem(ATTRIBUTION_KEY), null, 'fresh click IDs stay memory-only');
  assert.equal(h.localStorage.getItem(ANALYTICS_CLIENT_KEY), null, 'fresh consent creates no analytics client id');
  assert.equal(h.sessionStorage.getItem(ANALYTICS_SESSION_KEY), null, 'fresh consent creates no analytics session id');
  assert.equal(h.sessionStorage.getItem(ANALYTICS_SESSION_ACTIVITY_KEY), null, 'fresh consent creates no analytics session activity marker');
  assert.equal(requestBodies(h, '/api/tracking/event').length, 0, 'fresh consent emits no canonical browser event');
  assert.equal(Object.keys(h.window.OBPlatformTracking.context().attribution).length, 0, 'fresh context exposes no attribution');
  const totals = h.window.OBPlatformTracking._deliveryHealthTotals({ sent: 4, success: 2, delivered: 1, failed: 3, error: 2, retry: 5, dead: 7, permanent_failure: 11 });
  assert.equal(totals.successful, 7, 'health success sums sent, success, and delivered');
  assert.equal(totals.failed, 28, 'health failures sum every retry/failure terminal bucket');
}

async function analyticsConsentTest() {
  const h = createHarness({ consent: { necessary: true, analytics: true, marketing: false, updated_at: '2026-07-11T10:00:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-analytics' } });
  await wait(70);
  assert(h.scriptRequests.some(url => url.includes('googletagmanager.com/gtag/js?id=G-TEST12345')), 'analytics consent loads GA4');
  assert(!h.scriptRequests.some(url => /facebook|tiktok|linkedin/.test(url)), 'analytics-only consent loads no ad provider');
  const clientId = h.localStorage.getItem(ANALYTICS_CLIENT_KEY);
  const sessionId = h.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  assert.match(clientId, /^\d{1,20}\.\d{1,20}$/, 'analytics client id uses GA numeric format');
  assert.match(sessionId, /^[1-9]\d{0,14}$/, 'analytics session id uses the bounded positive numeric format accepted by the backend');
  assert(Math.abs(Number(sessionId) - Math.floor(Date.now() / 1000)) <= 1, 'new analytics session id uses epoch seconds');
  assert.match(h.sessionStorage.getItem(ANALYTICS_SESSION_ACTIVITY_KEY), /^\d{13}$/, 'analytics session activity uses a separate millisecond timestamp');
  assert.equal(h.localStorage.getItem(ATTRIBUTION_KEY), null, 'analytics-only campaign context remains ephemeral and does not persist marketing attribution');
  const events = requestBodies(h, '/api/tracking/event');
  assert(events.length >= 2, 'pricing route emits page_view and view_pricing after receipt');
  for(const event of events) {
    assert(!JSON.stringify(event).includes('reset_token'), 'sent event contains no sentinel query token');
    assert(!event.url.includes('?') && !event.url.includes('#'), 'event URL is sanitized');
    assert(!event.referrer.includes('?') && !event.referrer.includes('#'), 'referrer is sanitized');
    assert(event.tracking_context.consent_receipt_id, 'event is bound to canonical consent receipt');
    assert.equal(event.tracking_context.analytics_client_id, clientId);
    assert.equal(event.tracking_context.analytics_session_id, sessionId);
    assert.deepEqual(event.tracking_context.attribution, { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'summer_launch' });
    ['gclid','gbraid','wbraid','fbclid','fbp','fbc','ttclid','li_fat_id'].forEach(key => {
      assert(!Object.prototype.hasOwnProperty.call(event.tracking_context.attribution,key), `analytics-only event context excludes ${key}`);
    });
    assert.equal(event.properties.campaign_source, 'google', 'analytics-only consent includes safe campaign source in canonical details');
    assert.equal(event.properties.campaign_medium, 'cpc');
    assert.equal(event.properties.campaign_name, 'summer_launch');
    assert(!('gclid' in event.properties) && !('fbclid' in event.properties), 'click IDs never enter canonical event properties');
  }
  await h.window.fetch('https://ownlybiz-backend-production.up.railway.app/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'expert', email: 'expert@example.test' }) });
  const signup = requestBodies(h, '/api/auth/signup').at(-1);
  assert(signup.tracking_context.consent_receipt_id, 'expert signup receives verified tracking context');
  assert.equal(signup.tracking_context.analytics_client_id, clientId);
  assert.equal(signup.tracking_context.analytics_session_id, sessionId);
  assert.deepEqual(signup.tracking_context.attribution, { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'summer_launch' }, 'analytics-only expert signup carries validated UTM context into authoritative funnel events');
  ['gclid','gbraid','wbraid','fbclid','fbp','fbc','ttclid','li_fat_id'].forEach(key => {
    assert(!Object.prototype.hasOwnProperty.call(signup.tracking_context.attribution,key), `analytics-only expert signup excludes ${key}`);
  });

  h.window.switchView(2);
  await wait();
  assert(requestBodies(h, '/api/tracking/event').some(item => item.event_name === 'signup_started'), 'SPA signup entry emits signup_started once');
  assert(dataLayerAnalyticsIdentifiers(h).includes(clientId), 'managed Google configuration contains the consented client ID before withdrawal');
  assert(dataLayerAnalyticsIdentifiers(h).includes(sessionId), 'managed Google events contain the consented session ID before withdrawal');

  const revoked = { necessary: true, analytics: false, marketing: false, updated_at: '2026-07-11T10:05:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-analytics' };
  h.localStorage.setItem(CONSENT_KEY, JSON.stringify(revoked));
  h.window.OBPlatformTracking.consentChanged(revoked);
  await wait();
  assert.equal(h.localStorage.getItem(ANALYTICS_CLIENT_KEY), null, 'analytics revoke clears analytics client id');
  assert.equal(h.sessionStorage.getItem(ANALYTICS_SESSION_KEY), null, 'analytics revoke clears analytics session id');
  assert.equal(h.sessionStorage.getItem(ANALYTICS_SESSION_ACTIVITY_KEY), null, 'analytics revoke clears analytics session activity');
  assert.equal(h.window.OBPlatformTracking._state.analyticsClientId, '', 'analytics revoke clears the exposed client state');
  assert.equal(h.window.OBPlatformTracking._state.analyticsSessionId, '', 'analytics revoke clears the exposed session state');
  assert(!Object.prototype.hasOwnProperty.call(h.window.OBPlatformTracking._state, 'lastAnalyticsSessionId'), 'exposed state retains no withdrawn session identifier');
  assert(!dataLayerAnalyticsIdentifiers(h).includes(clientId), 'analytics revoke removes the withdrawn client ID from dataLayer history');
  assert(!dataLayerAnalyticsIdentifiers(h).includes(sessionId), 'analytics revoke removes the withdrawn session ID from dataLayer history');
  assert.equal(h.localStorage.getItem(ATTRIBUTION_KEY), null, 'revoke clears attribution');
  const before = requestBodies(h, '/api/tracking/event').length;
  await h.window.OBPlatformTracking.track('page_view');
  await wait();
  assert.equal(requestBodies(h, '/api/tracking/event').length, before, 'revoke blocks future canonical browser events');
}

async function analyticsSessionInactivityTest() {
  const h = createHarness({ path: '/features', consent: { necessary: true, analytics: true, marketing: false, updated_at: '2026-07-11T10:10:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-analytics-inactivity' } });
  await wait(70);
  const initialSessionId = h.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  const initialClientId = h.localStorage.getItem(ANALYTICS_CLIENT_KEY);
  h.sessionStorage.setItem(ANALYTICS_SESSION_ACTIVITY_KEY, String(Date.now() - (30 * 60 * 1000) - 1));
  await h.window.OBPlatformTracking.track('page_view');
  await wait(40);
  const rotatedSessionId = h.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  assert.match(rotatedSessionId, /^[1-9]\d{0,14}$/, 'post-timeout analytics session remains backend-compatible');
  assert.notEqual(rotatedSessionId, initialSessionId, 'analytics session rotates after 30 minutes of inactivity');
  assert.equal(h.localStorage.getItem(ANALYTICS_CLIENT_KEY), initialClientId, 'inactivity rotates the session without rotating the visitor client ID');
  const latestEvent = requestBodies(h, '/api/tracking/event').at(-1);
  assert.equal(latestEvent.tracking_context.analytics_session_id, rotatedSessionId, 'canonical event receives the rotated session ID');
  const gaEvent = h.window.dataLayer.filter(item => item && item[0] === 'event').at(-1);
  assert.equal(gaEvent[2].session_id, rotatedSessionId, 'managed GA4 event receives the same rotated session ID');
}

async function managedRegrantIdentityTest() {
  const initialConsent = { necessary: true, analytics: true, marketing: false, updated_at: '2026-07-11T10:20:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-managed-regrant' };
  const h = createHarness({ path: '/features', consent: initialConsent, consentDelays: [0, 0, 120] });
  await wait(80);
  const originalClientId = h.localStorage.getItem(ANALYTICS_CLIENT_KEY);
  const originalSessionId = h.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  assert(originalClientId && originalSessionId, 'initial verified analytics consent creates managed Google identity');

  const revoked = { necessary: true, analytics: false, marketing: false, updated_at: '2026-07-11T10:21:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-managed-regrant' };
  h.localStorage.setItem(CONSENT_KEY, JSON.stringify(revoked));
  h.window.OBPlatformTracking.consentChanged(revoked);
  await wait(50);
  assert.equal(h.localStorage.getItem(ANALYTICS_CLIENT_KEY), null, 'managed withdrawal clears the old client before regrant');
  assert.equal(h.sessionStorage.getItem(ANALYTICS_SESSION_KEY), null, 'managed withdrawal clears the old session before regrant');
  assert.deepEqual(dataLayerAnalyticsIdentifiers(h), [], 'managed withdrawal leaves no Google identity in dataLayer history');

  const eventRequestsBeforeRegrant = requestBodies(h, '/api/tracking/event').length;
  const googleEventsBeforeRegrant = h.window.dataLayer.filter(entry => entry && entry[0] === 'event').length;
  const regranted = { necessary: true, analytics: true, marketing: false, updated_at: '2026-07-11T10:22:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-managed-regrant' };
  h.localStorage.setItem(CONSENT_KEY, JSON.stringify(regranted));
  h.window.OBPlatformTracking.consentChanged(regranted);
  const pendingTrack = h.window.OBPlatformTracking.track('page_view', { page_type: 'features' });
  await wait(30);
  assert(!JSON.parse(h.localStorage.getItem(CONSENT_KEY)).consent_receipt_id, 'renewed consent remains unverified while its receipt request is pending');
  assert.equal(h.localStorage.getItem(ANALYTICS_CLIENT_KEY), null, 'pending renewed consent creates no analytics client ID');
  assert.equal(h.sessionStorage.getItem(ANALYTICS_SESSION_KEY), null, 'pending renewed consent creates no analytics session ID');
  assert.equal(h.window.OBPlatformTracking._state.analyticsClientId, '', 'pending renewed consent exposes no client state');
  assert.equal(h.window.OBPlatformTracking._state.analyticsSessionId, '', 'pending renewed consent exposes no session state');
  assert.deepEqual(dataLayerAnalyticsIdentifiers(h), [], 'pending renewed consent exposes no identity through dataLayer');
  assert.equal(requestBodies(h, '/api/tracking/event').length, eventRequestsBeforeRegrant, 'pending renewed consent emits no canonical event');
  assert.equal(h.window.dataLayer.filter(entry => entry && entry[0] === 'event').length, googleEventsBeforeRegrant, 'pending renewed consent emits no managed Google event');

  await pendingTrack;
  await wait(35);
  const renewedClientId = h.localStorage.getItem(ANALYTICS_CLIENT_KEY);
  const renewedSessionId = h.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  assert(renewedClientId && renewedClientId !== originalClientId, 'verified regrant rotates the managed Google client ID');
  assert(renewedSessionId && renewedSessionId !== originalSessionId, 'verified regrant rotates the managed Google session ID');
  const gaEvent = h.window.dataLayer.filter(entry => entry && entry[0] === 'event' && entry[1] === 'page_view').at(-1);
  assert(gaEvent, 'verified regrant emits the pending managed GA4 event');
  const gaParams = gaEvent[2];
  assert.equal(gaParams.client_id, renewedClientId, 'managed GA4 event overrides any pre-withdrawal Google client with the renewed client ID');
  assert.equal(gaParams.session_id, renewedSessionId, 'managed GA4 event uses the renewed session ID');
  const canonical = requestBodies(h, '/api/tracking/event').find(event => event.event_id === gaParams.event_id);
  assert(canonical, 'managed GA4 and canonical collector preserve the same event ID after regrant');
  assert.equal(canonical.tracking_context.analytics_client_id, renewedClientId, 'managed GA4 and collector share the renewed client ID');
  assert.equal(canonical.tracking_context.analytics_session_id, renewedSessionId, 'managed GA4 and collector share the renewed session ID');
}

async function stalePolicyTest() {
  const h = createHarness({ consent: { necessary: true, analytics: true, marketing: true, updated_at: '2026-06-01T09:00:00.000Z', policy_version: 'tracking-consent-2026-06', consent_id: 'consent-policy-stable', consent_receipt_id: 'obsolete-receipt' } });
  await wait(90);
  const stored = JSON.parse(h.localStorage.getItem(CONSENT_KEY));
  assert.equal(stored.analytics, false, 'policy mismatch revokes analytics until renewed');
  assert.equal(stored.marketing, false, 'policy mismatch revokes marketing until renewed');
  assert.equal(stored.policy_version, 'tracking-consent-2026-07');
  assert.equal(stored.consent_id, 'consent-policy-stable', 'policy mismatch preserves stable necessary consent ID');
  assert.notEqual(stored.consent_receipt_id, 'obsolete-receipt', 'policy mismatch discards the obsolete receipt');
  assert.equal(h.localStorage.getItem(ANALYTICS_CLIENT_KEY), null, 'policy mismatch clears the analytics client id');
  assert.equal(h.sessionStorage.getItem(ANALYTICS_SESSION_KEY), null, 'policy mismatch clears the analytics session id');
  assert.equal(h.sessionStorage.getItem(ANALYTICS_SESSION_ACTIVITY_KEY), null, 'policy mismatch clears analytics session activity');
  assert(h.consentOpenCount >= 1, 'policy mismatch reopens the consent manager');
  assert.deepEqual(h.scriptRequests, [], 'policy transition loads no provider script');
  assert.equal(requestBodies(h, '/api/tracking/event').length, 0, 'policy transition emits no funnel event');
  const receipts = requestBodies(h, '/api/tracking/consent');
  assert(receipts.length >= 1 && receipts.at(-1).policy_version === 'tracking-consent-2026-07');
  assert.equal(receipts.at(-1).analytics, false);
  assert.equal(receipts.at(-1).marketing, false);
}

async function consentReceiptRaceTest() {
  const h = createHarness({
    path: '/',
    consentDelays: [80, 0],
    consent: { necessary: true, analytics: true, marketing: true, updated_at: '2026-07-11T14:00:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-race-stable' }
  });
  for(let attempt = 0; attempt < 20 && requestBodies(h, '/api/tracking/consent').length === 0; attempt += 1) await wait(5);
  assert.equal(requestBodies(h, '/api/tracking/consent').length, 1, 'grant receipt request begins before simulated revoke');
  const revoked = { necessary: true, analytics: false, marketing: false, updated_at: '2026-07-11T14:00:01.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-race-stable' };
  h.localStorage.setItem(CONSENT_KEY, JSON.stringify(revoked));
  h.window.OBPlatformTracking.consentChanged(revoked);
  await wait(150);
  const writes = requestBodies(h, '/api/tracking/consent');
  assert.equal(writes.length, 2, 'grant and revoke each produce one serialized receipt write');
  assert.equal(writes[0].analytics, true);
  assert.equal(writes[0].marketing, true);
  assert.equal(writes[1].analytics, false);
  assert.equal(writes[1].marketing, false);
  assert.equal(writes[1].updated_at, revoked.updated_at, 'queued revoke writes the current consent signature');
  assert.equal(h.maxConsentRequestsInFlight, 1, 'consent receipt POSTs never overlap');
  const stored = JSON.parse(h.localStorage.getItem(CONSENT_KEY));
  assert.equal(stored.analytics, false);
  assert.equal(stored.marketing, false);
  assert.equal(stored.consent_receipt_id, 'receipt-2-consent-race-stable', 'stale grant response cannot overwrite the newer revoke receipt');

  const grantHarness = createHarness({
    path: '/',
    consentDelays: [80, 0],
    consent: { necessary: true, analytics: false, marketing: false, updated_at: '2026-07-11T14:10:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-race-grant' }
  });
  for(let attempt = 0; attempt < 20 && requestBodies(grantHarness, '/api/tracking/consent').length === 0; attempt += 1) await wait(5);
  const granted = { necessary: true, analytics: true, marketing: false, updated_at: '2026-07-11T14:10:01.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-race-grant' };
  grantHarness.localStorage.setItem(CONSENT_KEY, JSON.stringify(granted));
  grantHarness.window.OBPlatformTracking.consentChanged(granted);
  await wait(150);
  const grantWrites = requestBodies(grantHarness, '/api/tracking/consent');
  assert.equal(grantWrites.length, 2, 'denial and later grant each produce one serialized receipt write');
  assert.equal(grantWrites[0].analytics, false);
  assert.equal(grantWrites[1].analytics, true);
  assert.equal(grantHarness.maxConsentRequestsInFlight, 1, 'grant receipt cannot overtake the earlier denial write');
  const grantStored = JSON.parse(grantHarness.localStorage.getItem(CONSENT_KEY));
  assert.equal(grantStored.analytics, true);
  assert.equal(grantStored.consent_receipt_id, 'receipt-2-consent-race-grant', 'stale denial response cannot overwrite the newer grant receipt');
}

async function staleReceiptAndCrossTabStorageTests() {
  const lostResponseConsent = { necessary: true, analytics: true, marketing: false, updated_at: '2026-07-11T14:59:59.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-lost-response' };
  const lostResponseHarness = createHarness({
    path: '/',
    consent: lostResponseConsent,
    consentResults: [{ success: true, receipt: { receipt_id: 'recovered-identical-receipt', stale: true, accepted: false, updated_at: Date.parse(lostResponseConsent.updated_at), policy_version: lostResponseConsent.policy_version, necessary: true, analytics: true, marketing: false, revoked: false } }]
  });
  await wait(90);
  const recovered = JSON.parse(lostResponseHarness.localStorage.getItem(CONSENT_KEY));
  assert.equal(recovered.consent_receipt_id, 'recovered-identical-receipt', 'identical stale retry recovers the current receipt after a lost response');
  assert.equal(requestBodies(lostResponseHarness, '/api/tracking/consent').length, 1, 'identical lost-response recovery does not retry');
  assert(lostResponseHarness.scriptRequests.some(url => url.includes('googletagmanager.com/gtag/js?id=G-TEST12345')), 'identical recovered receipt can activate the consented provider');

  const staleConsent = { necessary: true, analytics: true, marketing: false, updated_at: '2026-07-11T15:00:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-stale-response' };
  const staleHarness = createHarness({
    path: '/',
    consent: staleConsent,
    consentResults: [{ success: true, receipt: { receipt_id: 'newer-server-receipt', stale: true, accepted: false, updated_at: Date.parse(staleConsent.updated_at) + 1, policy_version: staleConsent.policy_version, necessary: true, analytics: false, marketing: false, revoked: false } }]
  });
  await wait(90);
  let stored = JSON.parse(staleHarness.localStorage.getItem(CONSENT_KEY));
  assert(!stored.consent_receipt_id, 'newer server consent receipt is never attached to an older local grant');
  assert.equal(requestBodies(staleHarness, '/api/tracking/consent').length, 1, 'rejected consent signature is not retried in a loop');
  assert.equal(requestBodies(staleHarness, '/api/tracking/event').length, 0, 'stale consent response cannot emit a canonical event');
  assert.deepEqual(staleHarness.scriptRequests, [], 'stale consent response cannot activate provider tags');

  const nestedDataHarness = createHarness({
    path: '/',
    consent: { ...staleConsent, consent_id: 'consent-stale-data', updated_at: '2026-07-11T15:00:01.000Z' },
    consentResults: [{ success: true, data: { receipt_id: 'nested-must-not-store', stale: true, accepted: false, updated_at: Date.parse('2026-07-11T15:00:01.000Z'), policy_version: staleConsent.policy_version, necessary: true, analytics: false, marketing: false } }]
  });
  await wait(70);
  assert(!JSON.parse(nestedDataHarness.localStorage.getItem(CONSENT_KEY)).consent_receipt_id, 'equal-timestamp receipt with different choices is rejected');
  assert.equal(requestBodies(nestedDataHarness, '/api/tracking/consent').length, 1, 'different-choice stale data response is not retried');

  const winningNewerState = { necessary: true, analytics: false, marketing: false, updated_at: '2026-07-11T15:00:00.001Z', policy_version: staleConsent.policy_version, consent_id: staleConsent.consent_id, consent_receipt_id: 'newer-server-receipt' };
  staleHarness.localStorage.setItem(CONSENT_KEY, JSON.stringify(winningNewerState));
  staleHarness.window.dispatchEvent({ type: 'storage', key: CONSENT_KEY, storageArea: staleHarness.localStorage, newValue: JSON.stringify(winningNewerState) });
  await wait(45);
  assert.equal(JSON.parse(staleHarness.localStorage.getItem(CONSENT_KEY)).consent_receipt_id, 'newer-server-receipt', 'storage event adopts the actual newer cross-tab state');
  assert.equal(requestBodies(staleHarness, '/api/tracking/consent').length, 1, 'winning newer storage state does not echo another consent write');

  const initial = { necessary: true, analytics: false, marketing: false, updated_at: '2026-07-11T15:10:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-cross-tab', consent_receipt_id: 'initial-denial-receipt' };
  const h = createHarness({ path: '/', consent: initial, consentDelays: [0, 0, 80] });
  await wait(45);
  const granted = { necessary: true, analytics: true, marketing: true, updated_at: '2026-07-11T15:10:00.001Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-cross-tab' };
  h.localStorage.setItem(CONSENT_KEY, JSON.stringify(granted));
  h.window.dispatchEvent({ type: 'storage', key: CONSENT_KEY, storageArea: h.localStorage, newValue: JSON.stringify(granted) });
  await wait(80);
  assert(h.scriptRequests.some(url => url.includes('connect.facebook.net')), 'other-tab grant activates marketing providers after its receipt is accepted');
  assert(h.localStorage.getItem(ANALYTICS_CLIENT_KEY), 'other-tab analytics grant creates the analytics client ID');
  assert(h.sessionStorage.getItem(ANALYTICS_SESSION_KEY), 'other-tab analytics grant creates the analytics session ID');
  const firstAnalyticsClientId = h.localStorage.getItem(ANALYTICS_CLIENT_KEY);
  const firstAnalyticsSessionId = h.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  assert(h.localStorage.getItem(ATTRIBUTION_KEY), 'other-tab marketing grant promotes safe click attribution');
  assert.equal(requestBodies(h, '/api/tracking/consent').length, 1, 'other-tab grant produces one receipt write in this document');

  const revoked = { necessary: true, analytics: false, marketing: false, updated_at: '2026-07-11T15:10:00.002Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-cross-tab' };
  h.localStorage.setItem(CONSENT_KEY, JSON.stringify(revoked));
  h.window.dispatchEvent({ type: 'storage', key: CONSENT_KEY, storageArea: h.localStorage, newValue: JSON.stringify(revoked) });
  assert.equal(h.localStorage.getItem(ANALYTICS_CLIENT_KEY), null, 'other-tab revoke immediately clears analytics ID');
  assert.equal(h.sessionStorage.getItem(ANALYTICS_SESSION_KEY), null, 'other-tab revoke immediately clears analytics session ID');
  assert.equal(h.localStorage.getItem(ATTRIBUTION_KEY), null, 'other-tab revoke immediately clears marketing attribution');
  assert(h.window.fbq.queue.some(args => Array.from(args)[0] === 'consent' && Array.from(args)[1] === 'revoke'), 'other-tab revoke immediately revokes Meta runtime consent');
  assert(h.window.ttq.some(args => Array.isArray(args) && args[0] === 'revokeConsent'), 'other-tab revoke immediately revokes TikTok runtime consent');
  const googleUpdates = h.window.dataLayer.filter(args => args && args[0] === 'consent' && args[1] === 'update');
  assert.equal(googleUpdates.at(-1)[2].analytics_storage, 'denied', 'other-tab revoke immediately denies Google analytics storage');
  assert.equal(googleUpdates.at(-1)[2].ad_storage, 'denied', 'other-tab revoke immediately denies Google ad storage');
  const eventsBefore = requestBodies(h, '/api/tracking/event').length;
  await h.window.OBPlatformTracking.track('page_view');
  await wait(80);
  assert.equal(requestBodies(h, '/api/tracking/consent').length, 2, 'other-tab grant and revoke each write once without a storage loop');
  assert.equal(requestBodies(h, '/api/tracking/event').length, eventsBefore, 'other-tab revoke blocks later canonical browser events');
  stored = JSON.parse(h.localStorage.getItem(CONSENT_KEY));
  assert.equal(stored.consent_receipt_id, 'receipt-2-consent-cross-tab', 'other-tab revoke keeps the newest accepted receipt');

  const grantsBeforeReceipt = h.window.fbq.queue.filter(args => Array.from(args)[0] === 'consent' && Array.from(args)[1] === 'grant').length;
  const regranted = { necessary: true, analytics: true, marketing: true, updated_at: '2026-07-11T15:10:00.003Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-cross-tab' };
  h.localStorage.setItem(CONSENT_KEY, JSON.stringify(regranted));
  h.window.dispatchEvent({ type: 'storage', key: CONSENT_KEY, storageArea: h.localStorage, newValue: JSON.stringify(regranted) });
  const grantsWhileReceiptPending = h.window.fbq.queue.filter(args => Array.from(args)[0] === 'consent' && Array.from(args)[1] === 'grant').length;
  assert.equal(grantsWhileReceiptPending, grantsBeforeReceipt, 'existing Meta runtime is not granted before the new first-party receipt is ready');
  await wait(110);
  const grantsAfterReceipt = h.window.fbq.queue.filter(args => Array.from(args)[0] === 'consent' && Array.from(args)[1] === 'grant').length;
  assert(grantsAfterReceipt > grantsBeforeReceipt, 'Meta runtime grant occurs after the regrant receipt is accepted');
  assert.notEqual(h.localStorage.getItem(ANALYTICS_CLIENT_KEY), firstAnalyticsClientId, 'analytics regrant rotates the cleared client ID');
  assert.notEqual(h.sessionStorage.getItem(ANALYTICS_SESSION_KEY), firstAnalyticsSessionId, 'analytics regrant rotates the cleared session ID');
  assert.equal(requestBodies(h, '/api/tracking/consent').length, 3, 'cross-tab regrant adds exactly one serialized receipt write');
  assert.equal(JSON.parse(h.localStorage.getItem(CONSENT_KEY)).consent_receipt_id, 'receipt-3-consent-cross-tab');
}

async function marketingConsentTest() {
  const h = createHarness({ consent: { necessary: true, analytics: false, marketing: true, updated_at: '2026-07-11T11:00:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-marketing' } });
  await wait(80);
  assert(h.scriptRequests.some(url => url.includes('gtag/js?id=AW-123456789')), 'marketing consent loads Google Ads destination');
  assert(h.scriptRequests.some(url => url.includes('connect.facebook.net')), 'marketing consent loads Meta');
  assert(h.scriptRequests.some(url => url.includes('analytics.tiktok.com')), 'marketing consent loads TikTok');
  assert(h.scriptRequests.some(url => url.includes('snap.licdn.com')), 'marketing consent loads LinkedIn');
  assert(h.window.lintrk && Array.isArray(h.window.lintrk.q), 'LinkedIn base Insight Tag runtime initializes for consented attribution');
  assert.equal(h.window.lintrk.q.length, 0, 'LinkedIn base tag fires no browser canonical conversion');
  assert(!h.scriptRequests.some(url => url.includes('gtag/js?id=G-TEST12345')), 'marketing-only consent does not load GA4');
  assert.equal(h.localStorage.getItem(ANALYTICS_CLIENT_KEY), null);
  assert.equal(h.sessionStorage.getItem(ANALYTICS_SESSION_KEY), null);
  const saved = JSON.parse(h.localStorage.getItem(ATTRIBUTION_KEY));
  assert.equal(saved.gclid, 'GCLID_123');
  assert.equal(saved.fbclid, 'FBCLID_456');
  assert(saved.fbp, 'provider first-party ID captured only after marketing consent');
  const event = requestBodies(h, '/api/tracking/event')[0];
  assert.equal(event.tracking_context.attribution.gclid, 'GCLID_123');
  assert(!JSON.stringify(event).includes('never-store-me'));
  await h.window.OBPlatformTracking.track('page_view', { page_type: 'pricing' });
  await wait(25);
  assert.equal(h.window.lintrk.q.length, 0, 'explicit canonical browser events remain server-only for LinkedIn conversion delivery');
}

async function privateRouteAndGtmTests() {
  const privateHarness = createHarness({ path: '/admin/dashboard', search: '?gclid=PRIVATE_ID', consent: { necessary: true, analytics: true, marketing: true, updated_at: '2026-07-11T12:00:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-private' } });
  await wait(60);
  assert.deepEqual(privateHarness.scriptRequests, [], 'admin route loads zero platform provider scripts');
  assert.equal(requestBodies(privateHarness, '/api/tracking/event').length, 0, 'admin route emits zero platform events');
  const hybridPrivateHarness = createHarness({ path: '/admin/dashboard', mode: 'gtm_meta', search: '?gclid=PRIVATE_HYBRID_ID', consent: { necessary: true, analytics: true, marketing: true, updated_at: '2026-07-11T12:00:01.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-private-hybrid' } });
  await wait(60);
  assert.deepEqual(hybridPrivateHarness.scriptRequests, [], 'hybrid mode preserves the admin-route provider exclusion');
  assert.equal(requestBodies(hybridPrivateHarness, '/api/tracking/event').length, 0, 'hybrid mode preserves the admin-route event exclusion');

  const authHarness = createHarness({ path: '/', search: '?gclid=AUTH_PRIVATE', authToken: 'authenticated-expert-token', consent: { necessary: true, analytics: true, marketing: true, updated_at: '2026-07-11T12:15:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-auth-private' } });
  await wait(80);
  assert.deepEqual(authHarness.scriptRequests, [], 'authenticated root bootstrap loads zero provider scripts before private routing settles');
  assert.equal(requestBodies(authHarness, '/api/tracking/event').length, 0, 'authenticated root bootstrap emits zero acquisition events');
  await authHarness.window.fetch('https://ownlybiz-backend-production.up.railway.app/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'plan', plan_id: 'pro' }) });
  const checkout = requestBodies(authHarness, '/api/billing/checkout').at(-1);
  assert(checkout.tracking_context && checkout.tracking_context.consent_receipt_id, 'authenticated plan checkout still receives consented tracking context');

  const signupHarness = createHarness({ path: '/', activeView: 2, authToken: 'newly-created-expert-token', consent: { necessary: true, analytics: true, marketing: false, updated_at: '2026-07-11T12:20:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-auth-signup' } });
  await wait(80);
  assert(signupHarness.scriptRequests.some(url => url.includes('googletagmanager.com/gtag/js?id=G-TEST12345')), 'active authenticated signup funnel retains consented analytics');
  assert(requestBodies(signupHarness, '/api/tracking/event').some(item => item.event_name === 'signup_started'), 'active authenticated signup funnel retains signup_started');

  const expertConsent = { necessary: true, analytics: true, marketing: true, updated_at: '2026-06-01T09:00:00.000Z', policy_version: 'tracking-consent-2026-06', consent_id: 'expert-site-consent', consent_receipt_id: 'expert-site-receipt' };
  const expertHarness = createHarness({ path: '/independent-reader', consent: expertConsent });
  await wait(70);
  assert.deepEqual(expertHarness.scriptRequests, [], 'expert slug route loads zero platform provider scripts');
  assert.equal(requestBodies(expertHarness, '/api/tracking/event').length, 0, 'expert slug route emits zero platform events');
  assert.equal(requestBodies(expertHarness, '/api/tracking/consent').length, 0, 'expert consent is not posted into platform acquisition receipts');
  assert.equal(JSON.parse(expertHarness.localStorage.getItem(CONSENT_KEY)).policy_version, 'tracking-consent-2026-06', 'platform policy enforcement does not rewrite expert-site consent');

  const gtmHarness = createHarness({ path: '/features', mode: 'gtm', consent: { necessary: true, analytics: true, marketing: false, updated_at: '2026-07-11T13:00:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-gtm' } });
  await wait(70);
  assert(gtmHarness.scriptRequests.some(url => url.includes('/gtm.js?id=GTM-TEST123')), 'GTM mode loads configured container');
  assert(!gtmHarness.scriptRequests.some(url => /gtag\/js|facebook|tiktok|linkedin/.test(url)), 'GTM mode loads no managed provider script');
  const contract = gtmHarness.window.dataLayer.find(item => item && item.event === 'ownlybiz_event');
  assert(contract && contract.event_id && contract.event_name === 'page_view', 'GTM receives standardized Ownlybiz event');
  assert(!('consent_id' in contract.consent), 'stable necessary consent ID is not exposed to GTM');
  assert.equal(contract.analytics_client_id, gtmHarness.localStorage.getItem(ANALYTICS_CLIENT_KEY), 'analytics-consented GTM contract exposes the shared client ID');
  assert.equal(contract.analytics_session_id, gtmHarness.sessionStorage.getItem(ANALYTICS_SESSION_KEY), 'analytics-consented GTM contract exposes the shared session ID');

  const exclusiveMarketing = createHarness({ path: '/features', mode: 'gtm', consent: { necessary: true, analytics: false, marketing: true, updated_at: '2026-07-11T13:01:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-gtm-marketing' } });
  await wait(70);
  assert(exclusiveMarketing.scriptRequests.some(url => url.includes('/gtm.js?id=GTM-TEST123')), 'exclusive GTM mode loads its container with marketing consent');
  assert(!exclusiveMarketing.scriptRequests.some(url => /facebook|gtag\/js|tiktok|linkedin/.test(url)), 'exclusive GTM mode never loads the direct Meta or other managed runtimes');
  const exclusiveMarketingContract = exclusiveMarketing.window.dataLayer.find(item => item && item.event === 'ownlybiz_event');
  assert(exclusiveMarketingContract && !('analytics_client_id' in exclusiveMarketingContract) && !('analytics_session_id' in exclusiveMarketingContract), 'marketing-only GTM contract exposes no analytics identity');

  const hybridAnalytics = createHarness({ path: '/features', mode: 'gtm_meta', consent: { necessary: true, analytics: true, marketing: false, updated_at: '2026-07-11T13:02:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-hybrid-analytics' } });
  await wait(70);
  assert(hybridAnalytics.scriptRequests.some(url => url.includes('/gtm.js?id=GTM-TEST123')), 'hybrid mode loads GTM with analytics consent');
  assert(!hybridAnalytics.scriptRequests.some(url => /facebook|gtag\/js|tiktok|linkedin/.test(url)), 'analytics-only hybrid mode does not load direct Meta or other managed runtimes');
  const hybridAnalyticsContract = hybridAnalytics.window.dataLayer.find(item => item && item.event === 'ownlybiz_event');
  assert.equal(hybridAnalyticsContract.analytics_client_id, hybridAnalytics.localStorage.getItem(ANALYTICS_CLIENT_KEY));
  assert.equal(hybridAnalyticsContract.analytics_session_id, hybridAnalytics.sessionStorage.getItem(ANALYTICS_SESSION_KEY));

  const hybridMarketing = createHarness({ path: '/features', mode: 'gtm_meta', consent: { necessary: true, analytics: false, marketing: true, updated_at: '2026-07-11T13:03:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-hybrid-marketing' } });
  await wait(80);
  assert(hybridMarketing.scriptRequests.some(url => url.includes('/gtm.js?id=GTM-TEST123')), 'marketing-only hybrid mode loads GTM');
  assert(hybridMarketing.scriptRequests.some(url => url.includes('connect.facebook.net')), 'marketing-only hybrid mode preserves direct Meta');
  assert(!hybridMarketing.scriptRequests.some(url => /gtag\/js|tiktok|linkedin/.test(url)), 'hybrid mode does not load the other managed provider runtimes');
  const hybridMarketingContract = hybridMarketing.window.dataLayer.find(item => item && item.event === 'ownlybiz_event' && item.event_name === 'page_view');
  assert(hybridMarketingContract && !('analytics_client_id' in hybridMarketingContract) && !('analytics_session_id' in hybridMarketingContract), 'marketing-only hybrid contract exposes no analytics identity');
  const hybridMetaCall = hybridMarketing.window.fbq.queue.find(args => {
    const values = Array.from(args || []);
    return values[0] === 'track' && values[1] === 'PageView';
  });
  assert(hybridMetaCall, 'hybrid mode sends the canonical page view through the direct Meta Pixel');
  assert.equal(Array.from(hybridMetaCall)[3].eventID, hybridMarketingContract.event_id, 'hybrid GTM and direct Meta reuse the exact canonical event ID');

  const hybridWithdrawal = createHarness({ path: '/features', mode: 'gtm_meta', consent: { necessary: true, analytics: true, marketing: true, updated_at: '2026-07-11T13:04:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-hybrid-withdrawal' } });
  await wait(80);
  const originalHybridClientId = hybridWithdrawal.localStorage.getItem(ANALYTICS_CLIENT_KEY);
  const originalHybridSessionId = hybridWithdrawal.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  assert(dataLayerAnalyticsIdentifiers(hybridWithdrawal).includes(originalHybridClientId) && dataLayerAnalyticsIdentifiers(hybridWithdrawal).includes(originalHybridSessionId), 'hybrid GTM contract contains consented analytics identity before withdrawal');
  const marketingOnlyConsent = { necessary: true, analytics: false, marketing: true, updated_at: '2026-07-11T13:05:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-hybrid-withdrawal' };
  hybridWithdrawal.localStorage.setItem(CONSENT_KEY, JSON.stringify(marketingOnlyConsent));
  hybridWithdrawal.window.OBPlatformTracking.consentChanged(marketingOnlyConsent);
  await wait(100);
  assert.equal(hybridWithdrawal.localStorage.getItem(ANALYTICS_CLIENT_KEY), null, 'hybrid analytics withdrawal clears the shared client ID while marketing remains granted');
  assert.equal(hybridWithdrawal.sessionStorage.getItem(ANALYTICS_SESSION_KEY), null, 'hybrid analytics withdrawal clears the shared session ID while marketing remains granted');
  assert.equal(hybridWithdrawal.sessionStorage.getItem(ANALYTICS_SESSION_ACTIVITY_KEY), null, 'hybrid analytics withdrawal clears the session activity marker');
  assert.equal(hybridWithdrawal.window.OBPlatformTracking._state.analyticsClientId, '', 'hybrid analytics withdrawal clears exposed client state');
  assert.equal(hybridWithdrawal.window.OBPlatformTracking._state.analyticsSessionId, '', 'hybrid analytics withdrawal clears exposed session state');
  assert(!Object.prototype.hasOwnProperty.call(hybridWithdrawal.window.OBPlatformTracking._state, 'lastAnalyticsSessionId'), 'hybrid exposed state retains no withdrawn session ID');
  assert(!dataLayerAnalyticsIdentifiers(hybridWithdrawal).includes(originalHybridClientId), 'hybrid withdrawal scrubs the old client ID from GTM dataLayer history');
  assert(!dataLayerAnalyticsIdentifiers(hybridWithdrawal).includes(originalHybridSessionId), 'hybrid withdrawal scrubs the old session ID from GTM dataLayer history');
  await hybridWithdrawal.window.OBPlatformTracking.track('page_view');
  await wait(50);
  const marketingOnlyHybridContract = hybridWithdrawal.window.dataLayer.filter(item => item && item.event === 'ownlybiz_event' && item.event_name === 'page_view').at(-1);
  assert(marketingOnlyHybridContract && !('analytics_client_id' in marketingOnlyHybridContract) && !('analytics_session_id' in marketingOnlyHybridContract), 'post-withdrawal hybrid GTM events expose no analytics identity');
  const marketingOnlyHybridMetaCall = hybridWithdrawal.window.fbq.queue.filter(args => {
    const values = Array.from(args || []);
    return values[0] === 'track' && values[1] === 'PageView';
  }).at(-1);
  assert.equal(Array.from(marketingOnlyHybridMetaCall)[3].eventID, marketingOnlyHybridContract.event_id, 'post-withdrawal hybrid events preserve GTM and direct Meta event-ID parity');

  const regrantedHybridConsent = { necessary: true, analytics: true, marketing: true, updated_at: '2026-07-11T13:06:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-hybrid-withdrawal' };
  hybridWithdrawal.localStorage.setItem(CONSENT_KEY, JSON.stringify(regrantedHybridConsent));
  hybridWithdrawal.window.OBPlatformTracking.consentChanged(regrantedHybridConsent);
  await wait(110);
  assert.notEqual(hybridWithdrawal.localStorage.getItem(ANALYTICS_CLIENT_KEY), originalHybridClientId, 'hybrid analytics regrant rotates the cleared client ID');
  assert.notEqual(hybridWithdrawal.sessionStorage.getItem(ANALYTICS_SESSION_KEY), originalHybridSessionId, 'hybrid analytics regrant rotates the cleared session ID');
}

async function metaPixelEventContractTests() {
  const h = createHarness({ path: '/features', mode: 'gtm_meta', consent: { necessary: true, analytics: false, marketing: true, updated_at: '2026-07-11T13:30:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-meta-event-contract' } });
  await wait(80);
  await h.window.OBPlatformTracking.track('view_pricing', { page_type: 'pricing' });
  await h.window.OBPlatformTracking.track('primary_cta_clicked', { cta_id: 'start-now', destination: 'signup', placement: 'hero', page_type: 'features' });
  await h.window.OBPlatformTracking.track('signup_started', { plan_id: 'pro', interval: 'monthly', placement: 'hero', page_type: 'signup' });
  await h.window.OBPlatformTracking.track('plan_selected', { plan_id: 'pro', interval: 'monthly', selection_surface: 'signup', placement: 'signup', page_type: 'signup' });
  await wait(50);

  const expected = {
    page_view: { command: 'track', providerName: 'PageView' },
    view_pricing: { command: 'track', providerName: 'ViewContent' },
    primary_cta_clicked: { command: 'trackCustom', providerName: 'PrimaryCTAClicked' },
    signup_started: { command: 'trackCustom', providerName: 'SignupStarted' },
    plan_selected: { command: 'trackCustom', providerName: 'PlanSelected' }
  };
  const contracts = h.window.dataLayer.filter(item => item && item.event === 'ownlybiz_event');
  const canonicalEvents = requestBodies(h, '/api/tracking/event');
  for(const contract of contracts) {
    const contractIndex = h.window.dataLayer.indexOf(contract);
    assert(contractIndex > 0 && h.window.dataLayer[contractIndex - 1] && h.window.dataLayer[contractIndex - 1].ecommerce === null, `${contract.event_name} clears stale GTM ecommerce state before dispatch`);
  }
  for(const [eventName, meta] of Object.entries(expected)) {
    const contract = contracts.find(item => item.event_name === eventName);
    assert(contract, `GTM receives ${eventName} for Meta event-ID parity`);
    if(eventName === 'primary_cta_clicked') {
      assert.equal(contract.content_type, 'primary_cta', 'GTM CTA event includes GA4 recommended content type');
      assert.equal(contract.content_id, 'start-now', 'GTM CTA event includes GA4 recommended content ID');
    }
    const canonical = canonicalEvents.find(item => item.event_id === contract.event_id);
    assert(canonical && canonical.event_name === eventName, `${eventName} keeps one canonical collector event`);
    const pixelCall = h.window.fbq.queue.find(args => {
      const values = Array.from(args || []);
      return values[0] === meta.command && values[1] === meta.providerName && values[3] && values[3].eventID === contract.event_id;
    });
    assert(pixelCall, `${eventName} uses Meta ${meta.command} as ${meta.providerName} with the canonical event ID`);
  }

  delete h.window.OBPlatformTracking._state.config.providers.meta.mappings.primary_cta_clicked;
  const fallbackBefore = canonicalEvents.length;
  await h.window.OBPlatformTracking.track('primary_cta_clicked', { cta_id: 'fallback-cta', destination: 'signup', placement: 'footer', page_type: 'features' });
  await wait(40);
  const fallbackCanonical = requestBodies(h, '/api/tracking/event').slice(fallbackBefore).find(item => item.event_name === 'primary_cta_clicked');
  assert(fallbackCanonical, 'unmapped Meta fallback keeps the canonical collector event');
  const fallbackPixelCall = h.window.fbq.queue.find(args => {
    const values = Array.from(args || []);
    return values[0] === 'trackCustom' && values[1] === 'primary_cta_clicked' && values[3] && values[3].eventID === fallbackCanonical.event_id;
  });
  assert(fallbackPixelCall, 'unmapped Meta canonical event falls back to trackCustom with the same event ID');
}

async function ga4EventNameContractTests() {
  const consent = { necessary: true, analytics: true, marketing: false, updated_at: '2026-07-11T15:00:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-ga4-event-names' };
  const h = createHarness({ path: '/features', mode: 'gtm', consent });
  await wait(80);
  const unsafe = { email: 'person@example.test', source: 'person@example.test', ga4_event_name: 'purchase' };
  await h.window.OBPlatformTracking.track('view_pricing', { ...unsafe, page_type: 'pricing' });
  await h.window.OBPlatformTracking.track('primary_cta_clicked', { ...unsafe, cta_id: 'start-now', destination: '/signup', placement: 'hero', page_type: 'features' });
  await h.window.OBPlatformTracking.track('signup_started', { ...unsafe, plan_id: 'pro', interval: 'monthly', placement: 'hero', page_type: 'signup' });
  await h.window.OBPlatformTracking.track('plan_selected', { ...unsafe, plan_id: 'pro', interval: 'monthly', selection_surface: 'signup', placement: 'signup', page_type: 'signup' });
  await wait(50);

  const expected = {
    page_view: 'page_view',
    view_pricing: 'view_pricing',
    primary_cta_clicked: 'select_content',
    signup_started: 'begin_signup',
    plan_selected: 'select_item'
  };
  const contracts = h.window.dataLayer.filter(item => item && item.event === 'ownlybiz_event');
  const canonicalEvents = requestBodies(h, '/api/tracking/event');
  const sessionId = h.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  for(const [eventName, ga4EventName] of Object.entries(expected)) {
    const contract = contracts.find(item => item.event_name === eventName);
    assert(contract, `GTM receives ${eventName}`);
    assert.equal(contract.ga4_event_name, ga4EventName, `${eventName} receives its fixed GA4 event alias`);
    assert.equal(contract.event_name, eventName, `${eventName} keeps its canonical event name`);
    assert.equal(contract.analytics_session_id, sessionId, `${eventName} keeps the shared analytics session`);
    const canonical = canonicalEvents.find(item => item.event_id === contract.event_id);
    assert(canonical, `${eventName} keeps one shared canonical event ID`);
    assert.equal(canonical.event_name, eventName, `${eventName} remains unchanged in the canonical collector`);
    assert.equal(canonical.tracking_context.analytics_session_id, sessionId, `${eventName} uses the same server-bound session`);
    assert(!Object.prototype.hasOwnProperty.call(canonical, 'ga4_event_name'), 'GA4 alias does not replace or alter the canonical collector contract');
    assert(!Object.prototype.hasOwnProperty.call(contract.details, 'ga4_event_name'), 'GA4 alias cannot be overridden through event properties');
  }
  const serializedContracts = JSON.stringify(contracts);
  assert(!/person@example\.test|GCLID_123|FBCLID_456|reset_token|verify_token|"purchase"/.test(serializedContracts), 'GA4 alias contract contains no PII, click IDs, query secrets, or caller-provided override');
  assert.equal(contracts.find(item => item.event_name === 'view_pricing').ga4_event_name, 'view_pricing', 'pricing views stay custom because this event does not guarantee a valid GA4 ecommerce items array');
}

function trackingClickTarget(kind, value) {
  const attrs = kind === 'plan'
    ? { 'data-ob-signup-plan': value, 'data-ob-selection-surface': 'signup' }
    : { 'data-ob-plan-interval': value, 'data-ob-selection-surface': 'signup' };
  return {
    getAttribute(name) { return attrs[name] || ''; },
    closest(selector) {
      if(kind === 'plan' && selector === '[data-ob-signup-plan]') return this;
      if(kind === 'interval' && selector === '[data-ob-plan-interval]') return this;
      return null;
    }
  };
}

async function dimensionContractTests() {
  const consent = { necessary: true, analytics: true, marketing: true, updated_at: '2026-07-11T16:00:00.000Z', policy_version: 'tracking-consent-2026-07', consent_id: 'consent-details' };
  const h = createHarness({ path: '/signup', consent });
  h.window.obSignupPlanState = { selected: 'starter', interval: 'monthly' };
  await wait(80);

  const beforeMissing = requestBodies(h, '/api/tracking/event').length;
  await h.window.OBPlatformTracking.track('plan_selected', { plan_id: 'pro', selection_surface: 'signup' });
  assert.equal(requestBodies(h, '/api/tracking/event').length, beforeMissing, 'plan_selected rejects missing required interval');

  const planTarget = trackingClickTarget('plan', 'pro');
  h.document.dispatchEvent({ type: 'click', target: planTarget });
  h.window.obSignupPlanState.selected = 'pro';
  await wait(40);
  let planEvents = requestBodies(h, '/api/tracking/event').filter(event => event.event_name === 'plan_selected');
  assert.equal(planEvents.length, 1, 'actual plan change emits once');
  assert.deepEqual(planEvents[0].properties, {
    plan_id: 'pro', interval: 'monthly', selection_surface: 'signup', previous_plan_id: 'starter', previous_interval: 'monthly',
    placement: 'signup', page_type: 'signup', campaign_source: 'google', campaign_medium: 'cpc', campaign_name: 'summer_launch'
  });
  const metaCall = h.window.fbq.queue.find(args => {
    const values = Array.from(args || []);
    return values[0] === 'trackCustom' && values[1] === 'PlanSelected';
  });
  assert(metaCall, 'Meta receives mapped plan event');
  const metaParams = Array.from(metaCall)[2];
  assert.equal(metaParams.content_name, 'pro');
  assert.equal(JSON.stringify(metaParams.content_ids), JSON.stringify(['pro']));
  assert.equal(metaParams.content_type, 'product');
  assert.equal(metaParams.plan_id, 'pro');
  assert.equal(metaParams.billing_interval, 'monthly');
  ['interval','previous_plan_id','previous_interval','selection_surface','campaign_source','campaign_medium','campaign_name'].forEach(key => {
    assert(!Object.prototype.hasOwnProperty.call(metaParams,key), `Meta browser payload excludes unsupported ${key}`);
  });
  const tiktokCall = h.window.ttq.find(args => Array.isArray(args) && args[0] === 'track' && args[1] === 'ViewContent');
  assert(tiktokCall, 'TikTok receives mapped plan event');
  const tiktokParams = tiktokCall[2];
  assert.equal(tiktokParams.content_name, 'pro');
  assert.equal(tiktokParams.content_type, 'product');
  assert.equal(tiktokParams.plan_id, 'pro');
  assert.equal(tiktokParams.billing_interval, 'monthly');
  assert.equal(JSON.stringify(tiktokParams.contents), JSON.stringify([{ content_id: 'pro', content_name: 'pro', quantity: 1 }]));
  ['interval','previous_plan_id','previous_interval','selection_surface','campaign_source','campaign_medium','campaign_name'].forEach(key => {
    assert(!Object.prototype.hasOwnProperty.call(tiktokParams,key), `TikTok browser payload excludes unsupported ${key}`);
  });

  const intervalTarget = trackingClickTarget('interval', 'annual');
  h.document.dispatchEvent({ type: 'click', target: intervalTarget });
  h.window.obSignupPlanState.interval = 'annual';
  await wait(40);
  planEvents = requestBodies(h, '/api/tracking/event').filter(event => event.event_name === 'plan_selected');
  assert.equal(planEvents.length, 2, 'interval-only change emits plan_selected');
  assert.equal(planEvents[1].properties.previous_plan_id, 'pro');
  assert.equal(planEvents[1].properties.previous_interval, 'monthly');
  assert.equal(planEvents[1].properties.interval, 'annual');

  h.document.dispatchEvent({ type: 'click', target: intervalTarget });
  await wait(40);
  assert.equal(requestBodies(h, '/api/tracking/event').filter(event => event.event_name === 'plan_selected').length, 2, 'same-state click is deduplicated');

  const gaCall = h.window.dataLayer.find(entry => Array.from(entry || [])[0] === 'event' && Array.from(entry)[1] === 'select_item');
  assert(gaCall, 'managed GA4 receives mapped plan event');
  const gaParams = Array.from(gaCall)[2];
  assert.equal(gaParams.plan_id, 'pro');
  assert.equal(gaParams.interval, 'monthly');
  assert.equal(JSON.stringify(gaParams.items), JSON.stringify([{ item_id: 'pro', item_name: 'pro', item_category: 'ownlybiz_subscription', item_variant: 'monthly' }]));
  assert(!JSON.stringify(gaParams).includes('reset_token'), 'managed provider params contain no URL query secrets');
  const adsCall = h.window.dataLayer.find(entry => {
    const values = Array.from(entry || []);
    return values[0] === 'event' && values[1] === 'conversion' && values[2] && String(values[2].send_to || '').endsWith('/PLANSELECT');
  });
  assert(adsCall, 'Google Ads receives mapped plan conversion');
  const adsParams = Array.from(adsCall)[2];
  assert.equal(adsParams.selected_plan, 'pro', 'Google Ads browser payload includes plan under configured custom-variable tag');
  assert.equal(adsParams.billing_interval, 'monthly', 'Google Ads browser payload includes interval under configured custom-variable tag');
  assert.equal(adsParams.transaction_id, planEvents[0].event_id, 'Google Ads browser and server copies share the canonical dedup event ID');

  const sanitized = h.window.OBPlatformTracking._safeProperties('plan_selected', {
    plan_id: 'pro', interval: 'annual', selection_surface: 'signup', campaign_source: 'person@example.com', email: 'person@example.com'
  });
  assert(!('campaign_source' in sanitized) && !('email' in sanitized), 'email-like and unknown fields are rejected');

  const gtm = createHarness({ path: '/signup', mode: 'gtm', consent });
  await wait(80);
  await gtm.window.OBPlatformTracking.track('plan_selected', { plan_id: 'scale', interval: 'annual', selection_surface: 'signup', previous_plan_id: 'pro', previous_interval: 'monthly' });
  await wait(30);
  const contract = gtm.window.dataLayer.find(item => item && item.event === 'ownlybiz_event' && item.event_name === 'plan_selected');
  assert(contract, 'GTM receives plan_selected contract');
  assert.equal(contract.schema_version, gtm.config.tracking.schema_version, 'GTM schema version matches backend config');
  assert.equal(contract.plan_id, 'scale');
  assert.equal(contract.details.interval, 'annual');
  assert.equal(contract.properties.plan_id, 'scale', 'legacy nested properties remain');
  assert.equal(JSON.stringify(contract.ecommerce.items), JSON.stringify([{ item_id: 'scale', item_name: 'scale', item_category: 'ownlybiz_subscription', item_variant: 'annual' }]));
  assert(!('tracking_context' in contract), 'GTM receives no consent receipt or click-ID context');
  assert.equal(contract.analytics_client_id, gtm.localStorage.getItem(ANALYTICS_CLIENT_KEY), 'GTM receives the consented shared analytics client ID');
  assert.equal(contract.analytics_session_id, gtm.sessionStorage.getItem(ANALYTICS_SESSION_KEY), 'GTM receives the consented shared analytics session ID');
  assert(!/GCLID|FBCLID|reset_token|verify_token/.test(JSON.stringify(contract)), 'GTM contract has no click IDs or query secrets');

  const canonical = requestBodies(gtm, '/api/tracking/event').find(event => event.event_name === 'plan_selected');
  assert.equal(JSON.stringify(contract.details), JSON.stringify(canonical.properties), 'GTM and canonical collector use identical safe details');
  assert.equal(contract.analytics_client_id, canonical.tracking_context.analytics_client_id, 'GTM and canonical collector share one analytics client ID');
  assert.equal(contract.analytics_session_id, canonical.tracking_context.analytics_session_id, 'GTM and canonical collector share one analytics session ID');

  const indexHarness = createHarness({ path: '/index.html', consent: { ...consent, consent_id: 'index-consent' } });
  await wait(80);
  const indexPage = requestBodies(indexHarness, '/api/tracking/event').find(event => event.event_name === 'page_view');
  assert.equal(indexPage.properties.page_type, 'home', 'index.html normalizes to home page_type');
}

function adminDimensionRenderingTests() {
  const h = createHarness({ consent: null });
  const api = h.window.OBPlatformTracking;
  api._state.adminOverview = {
    schema_version: '2026-07-12.v1',
    event_catalog: [{
      event_name: 'plan_selected', name: 'plan_selected', label: 'Plan selected', source: 'browser', schema_version: '2026-07-12.v1',
      detail_fields: [
        { key: 'plan_id', label: 'Backend plan label', required: true },
        { key: 'interval', label: 'Backend interval label', required: true },
        { key: 'selection_surface', label: 'Backend surface label', required: true },
        { key: 'order_id', label: 'Must be ignored for this event', required: false }
      ],
      provider_capabilities: {
        ga4: { detail_fields: ['plan_id','interval','selection_surface'], requires_setup: { fields: ['plan_id','interval'], message: 'Create GA4 definitions.' } },
        google_ads: { detail_fields: [], requires_setup: { fields: ['plan_id','interval'], message: 'Configure custom variables.' } },
        linkedin: { detail_fields: [], unsupported_detail_fields: ['plan_id','interval'], limitation: 'No arbitrary dimensions.' }
      }
    }],
    connections: {
      ga4: { enabled: true, status: 'connected' },
      google_ads: { enabled: true, status: 'connected', config: { conversion_id: 'AW-123456789' }, mappings: { plan_selected: { label: 'PLANSELECT' } } },
      linkedin: { enabled: true, status: 'connected' }
    }
  };
  const catalogEvent = api._eventCatalog()[0];
  const fields = api._catalogDetailFields(catalogEvent);
  assert.equal(JSON.stringify(Array.from(fields, field => field.label)), JSON.stringify(['Backend plan label','Backend interval label','Backend surface label']), 'Admin preserves safe backend catalog metadata and drops schema drift');
  const chips = api._detailChipsHtml(catalogEvent);
  assert(chips.includes('Backend plan label') && chips.includes('required'), 'Admin renders friendly required detail chips');
  assert.equal(api._providerDetailCapability('linkedin', catalogEvent, fields[0]).label, 'Not supported');
  assert.equal(api._providerDetailCapability('ga4', catalogEvent, fields[0]).label, 'Collected');
  assert.equal(api._providerDetailCapability('google_ads', catalogEvent, fields[0]).label, 'Setup required', 'Google plan dimension remains setup-required without a custom tag');
  api._state.adminOverview.connections.google_ads.config.plan_custom_variable_tag = 'selected_plan';
  api._state.adminOverview.connections.google_ads.config.interval_custom_variable_tag = 'billing_interval';
  const googlePlanCapability = api._providerDetailCapability('google_ads', catalogEvent, fields[0]);
  assert.equal(googlePlanCapability.label, 'Payload mapped', 'configured Google plan tag becomes payload-mapped');
  assert(googlePlanCapability.note.includes('not verified'), 'payload-mapped status does not claim Google account verification');
  assert(googlePlanCapability.note.includes('browser tag mapped') && googlePlanCapability.note.includes('server CAPI action not mapped'), 'label-only browser event reports browser-only mapping truth');
  const serverPurchaseEvent = { name: 'purchase', event_name: 'purchase', source: 'server' };
  api._state.adminOverview.connections.google_ads.mappings.purchase = { label: 'PURCHASE_BROWSER_ONLY' };
  const labelOnlyServer = api._providerDetailCapability('google_ads', serverPurchaseEvent, fields[0]);
  assert.equal(labelOnlyServer.label, 'Setup required', 'label-only mapping cannot mark a server-authoritative event payload-mapped');
  assert(labelOnlyServer.note.includes('numeric server conversion action'), 'server event explains the required conversion_action_id');
  api._state.adminOverview.connections.google_ads.mappings.plan_selected = { conversion_action_id: '123456' };
  const actionOnlyBrowser = api._providerDetailCapability('google_ads', catalogEvent, fields[0]);
  assert.equal(actionOnlyBrowser.label, 'Payload mapped', 'action-only browser-source event can map its server CAPI copy');
  assert(actionOnlyBrowser.note.includes('server CAPI mapped') && actionOnlyBrowser.note.includes('browser label not mapped'), 'action-only browser event identifies the mapped server channel and missing browser channel');
  api._state.adminOverview.connections.google_ads.mappings.purchase = { conversion_action_id: '654321' };
  const actionOnlyServer = api._providerDetailCapability('google_ads', serverPurchaseEvent, fields[0]);
  assert.equal(actionOnlyServer.label, 'Payload mapped', 'numeric action maps a server-authoritative event');
  assert(actionOnlyServer.note.includes('server CAPI mapped'), 'server action status names the server channel');
  const googleCard = api._providerCard('google_ads');
  assert(googleCard.includes('plan_custom_variable_tag') && googleCard.includes('interval_custom_variable_tag') && googleCard.includes('2/2 configured'), 'Google Admin card renders both custom-variable inputs and setup count');
  assert.equal(api._validateConnection('google_ads', { conversion_id: 'AW-123456789', plan_custom_variable_tag: 'Plan-ID' }, true), 'Plan custom-variable tag must use lowercase letters, numbers, and underscores, starting with a letter.');
  assert.equal(api._validateConnection('google_ads', { conversion_id: 'AW-123456789', plan_custom_variable_tag: 'selected_plan', interval_custom_variable_tag: 'billing_interval' }, true), '', 'safe Google custom-variable tags validate');
  assert(api._mappingCell('linkedin','plan_selected').includes('Not mapped'), 'LinkedIn Admin shows Not mapped when no server conversion rule exists');
  api._state.adminOverview.connections.linkedin.mappings = { plan_selected: '987654' };
  const linkedInMapped = api._mappingCell('linkedin','plan_selected');
  assert(linkedInMapped.includes('Server rule 987654') && !linkedInMapped.includes('Canonical/custom'), 'LinkedIn Admin shows the mapped server conversion rule explicitly');

  api._state.adminEvents = [
    { event_name: 'plan_selected', source: 'browser', event_id: 'event-safe-12345', path: '/signup?secret=never', consent: { analytics: true, marketing: false }, details: { plan_id: 'pro', interval: 'annual', selection_surface: 'signup', campaign_source: 'google', campaign_medium: 'cpc', campaign_name: 'summer_launch' }, attribution: { gclid: 'PRIVATE-GCLID' }, user_data: { email: 'secret@example.com' } },
    { event_name: 'plan_selected', source: 'browser', event_id: 'event-safe-67890', path: '/signup', details: { plan_id: 'scale', interval: 'monthly', selection_surface: 'signup', campaign_source: 'newsletter' } }
  ];
  const analyticsOnlyAdminDetails = api._eventSafeDetails(api._state.adminEvents[0]);
  assert.equal(analyticsOnlyAdminDetails.campaign_source, 'google', 'Admin safe-details path preserves analytics-only campaign source');
  assert(!('gclid' in analyticsOnlyAdminDetails), 'Admin safe-details path never exposes click IDs');
  assert.equal(api._filteredAdminEvents(api._state.adminEvents, { plan_id: 'pro', campaign_source: 'google' }).length, 1, 'Admin filters by plan and campaign source');
  const recent = api._recentEventsTable();
  assert(recent.includes('Campaign source') && recent.includes('summer_launch'), 'Admin renders expandable safe campaign details and breakdowns');
  assert(!/PRIVATE-GCLID|secret@example\.com|\?secret=/.test(recent), 'Admin never renders raw attribution, user data, or URL queries');
}

function adminEnvironmentCopyTests() {
  const h = createHarness({ consent: null });
  const api = h.window.OBPlatformTracking;

  api._state.adminOverview = { environment: 'staging', connections: { meta: { enabled: false, status: 'disconnected' } } };
  const stagingCopy = api._adminEnvironmentCopy();
  assert.equal(stagingCopy.environment, 'staging');
  assert.equal(stagingCopy.production, false, 'staging overview keeps the isolated test-data path');
  assert.equal(stagingCopy.bannerTitle, 'Staging/test credentials only');
  assert(stagingCopy.bannerBody.includes('isolated from production') && stagingCopy.bannerBody.includes('test pixels'), 'staging banner keeps the isolated test warning');
  const stagingMetaCard = api._providerCard('meta');
  assert(stagingMetaCard.includes('Enabled for this workspace connection'), 'staging provider label is environment-safe');
  assert(stagingMetaCard.includes('Optional staging test event code'), 'staging provider card uses a staging test-code placeholder');

  api._state.adminOverview = { environment: 'production', connections: { meta: { enabled: false, status: 'disconnected' } } };
  const productionCopy = api._adminEnvironmentCopy();
  assert.equal(productionCopy.environment, 'production');
  assert.equal(productionCopy.production, true, 'production overview selects the real-data warning path');
  assert.equal(productionCopy.bannerTitle, 'Production tracking uses real customer data');
  assert(productionCopy.bannerBody.includes('real customer activity') && productionCopy.bannerBody.includes('live advertising and analytics destinations'), 'production banner clearly warns about real live data');
  const productionMetaCard = api._providerCard('meta');
  assert(productionMetaCard.includes('Enabled for this workspace connection'), 'production provider label is environment-safe');
  assert(productionMetaCard.includes('Optional test event code - may appear in live measurement tools'), 'production provider card warns that test-code events can reach live tools');
  assert(!productionMetaCard.includes('Optional staging test event code'), 'production provider card never shows a staging-only placeholder');

  api._state.adminOverview = { environment: 'production-safe', connections: { tiktok: { enabled: false, status: 'disconnected' } } };
  const productionSafeCopy = api._adminEnvironmentCopy();
  assert.equal(productionSafeCopy.production, true, 'production-safe overview uses the production real-data warning path');
  assert.equal(productionSafeCopy.bannerTitle, productionCopy.bannerTitle);
  assert(api._providerCard('tiktok').includes('may appear in live measurement tools'), 'production-safe test-code placeholder remains production-safe');
}

await freshConsentTest();
await analyticsConsentTest();
await analyticsSessionInactivityTest();
await managedRegrantIdentityTest();
await marketingConsentTest();
await stalePolicyTest();
await consentReceiptRaceTest();
await staleReceiptAndCrossTabStorageTests();
await privateRouteAndGtmTests();
await metaPixelEventContractTests();
await ga4EventNameContractTests();
await dimensionContractTests();
adminDimensionRenderingTests();
adminEnvironmentCopyTests();
console.log('platform tracking runtime mock tests passed');
