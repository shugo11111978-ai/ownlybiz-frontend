(function(){
  'use strict';
  if(window.__obPlatformTracking20260711) return;
  window.__obPlatformTracking20260711 = true;

  var API_ROOT = String(window.OWNLYBIZ_API_URL || window._OB_BACKEND || 'https://ownlybiz-backend-production.up.railway.app').replace(/\/+$/,'') + '/api';
  var CONSENT_KEY = 'ob_privacy_consent_v1';
  var ATTRIBUTION_KEY = 'ob_tracking_attribution_v1';
  var ANALYTICS_CLIENT_KEY = 'ob_tracking_analytics_client_id_v1';
  var ANALYTICS_SESSION_KEY = 'ob_tracking_analytics_session_id_v1';
  var ANALYTICS_SESSION_ACTIVITY_KEY = 'ob_tracking_analytics_session_activity_v1';
  var ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  var analyticsSessionGeneration = 0;
  var CLICK_KEYS = ['gclid','gbraid','wbraid','fbclid','ttclid','li_fat_id'];
  var CAMPAIGN_ATTRIBUTION_KEYS = {utm_source:'campaign_source',utm_medium:'campaign_medium',utm_campaign:'campaign_name'};
  var LOW_RISK_EVENTS = {page_view:1,view_pricing:1,primary_cta_clicked:1,signup_started:1,plan_selected:1};
  // Keep view_pricing custom: GA4 ecommerce recommendations require a valid items array, which a general pricing-page view cannot guarantee.
  var GA4_BROWSER_EVENT_NAMES = {page_view:'page_view',view_pricing:'view_pricing',primary_cta_clicked:'select_content',signup_started:'begin_signup',plan_selected:'select_item'};
  var META_STANDARD_EVENTS = {
    AddPaymentInfo:1,AddToCart:1,AddToWishlist:1,CompleteRegistration:1,Contact:1,
    CustomizeProduct:1,Donate:1,FindLocation:1,InitiateCheckout:1,Lead:1,PageView:1,
    Purchase:1,Schedule:1,Search:1,StartTrial:1,SubmitApplication:1,Subscribe:1,ViewContent:1
  };
  var PLATFORM_EVENT_NAMES = {page_view:1,view_pricing:1,primary_cta_clicked:1,signup_started:1,plan_selected:1,lead_generated:1,signup_completed:1,email_verified:1,checkout_started:1,purchase:1,website_published:1,subscription_renewed:1,subscription_cancelled:1,refund_issued:1};
  var ALLOWED_PLATFORM_ROUTES = {'':1,'index.html':1,pricing:1,features:1,how:1,experts:1,blog:1,contact:1,signup:1};
  var PROVIDER_ORDER = ['meta','google_ads','ga4','gtm','tiktok','linkedin','custom_webhook'];
  var EVENT_FALLBACK = [
    {name:'page_view',label:'Page view',source:'browser',stage:'Visit'},
    {name:'view_pricing',label:'Pricing viewed',source:'browser',stage:'Interest'},
    {name:'primary_cta_clicked',label:'Primary CTA clicked',source:'browser',stage:'Interest'},
    {name:'signup_started',label:'Expert signup started',source:'browser',stage:'Signup'},
    {name:'plan_selected',label:'Plan selected',source:'browser',stage:'Signup'},
    {name:'lead_generated',label:'Lead generated',source:'server',stage:'Lead'},
    {name:'signup_completed',label:'Expert signup completed',source:'server',stage:'Signup'},
    {name:'email_verified',label:'Email verified',source:'server',stage:'Activation'},
    {name:'checkout_started',label:'Subscription checkout started',source:'server',stage:'Checkout'},
    {name:'purchase',label:'Ownlybiz subscription purchase',source:'server',stage:'Revenue'},
    {name:'website_published',label:'Website published',source:'server',stage:'Activation'},
    {name:'subscription_renewed',label:'Subscription renewed',source:'server',stage:'Retention'},
    {name:'subscription_cancelled',label:'Subscription cancelled',source:'server',stage:'Retention'},
    {name:'refund_issued',label:'Platform refund issued',source:'server',stage:'Revenue'}
  ];
  var EVENT_DETAIL_SCHEMA = {
    page_view:[
      {key:'page_type',label:'Page type'},
      {key:'source',label:'Source'},
      {key:'placement',label:'Placement'},
      {key:'campaign_source',label:'Campaign source'},
      {key:'campaign_medium',label:'Campaign medium'},
      {key:'campaign_name',label:'Campaign name'}
    ],
    view_pricing:[
      {key:'page_type',label:'Page type'},
      {key:'source',label:'Source'},
      {key:'placement',label:'Placement'},
      {key:'campaign_source',label:'Campaign source'},
      {key:'campaign_medium',label:'Campaign medium'},
      {key:'campaign_name',label:'Campaign name'}
    ],
    primary_cta_clicked:[
      {key:'cta_id',label:'CTA',required:true},
      {key:'destination',label:'Destination'},
      {key:'placement',label:'Placement'},
      {key:'page_type',label:'Page type'},
      {key:'source',label:'Source'},
      {key:'campaign_source',label:'Campaign source'},
      {key:'campaign_medium',label:'Campaign medium'},
      {key:'campaign_name',label:'Campaign name'}
    ],
    signup_started:[
      {key:'plan_id',label:'Plan'},
      {key:'interval',label:'Billing interval'},
      {key:'page_type',label:'Page type'},
      {key:'source',label:'Source'},
      {key:'placement',label:'Placement'},
      {key:'campaign_source',label:'Campaign source'},
      {key:'campaign_medium',label:'Campaign medium'},
      {key:'campaign_name',label:'Campaign name'}
    ],
    plan_selected:[
      {key:'plan_id',label:'Plan',required:true},
      {key:'interval',label:'Billing interval',required:true},
      {key:'selection_surface',label:'Selection surface',required:true},
      {key:'previous_plan_id',label:'Previous plan'},
      {key:'previous_interval',label:'Previous billing interval'},
      {key:'placement',label:'Placement'},
      {key:'page_type',label:'Page type'},
      {key:'source',label:'Source'},
      {key:'campaign_source',label:'Campaign source'},
      {key:'campaign_medium',label:'Campaign medium'},
      {key:'campaign_name',label:'Campaign name'}
    ],
    lead_generated:[
      {key:'source',label:'Source',required:true},
      {key:'placement',label:'Placement'},
      {key:'page_type',label:'Page type'},
      {key:'campaign_source',label:'Campaign source'},
      {key:'campaign_medium',label:'Campaign medium'},
      {key:'campaign_name',label:'Campaign name'}
    ],
    signup_completed:[
      {key:'plan_id',label:'Plan',required:true},
      {key:'source',label:'Source',required:true},
      {key:'interval',label:'Billing interval'},
      {key:'selection_surface',label:'Selection surface'},
      {key:'campaign_source',label:'Campaign source'},
      {key:'campaign_medium',label:'Campaign medium'},
      {key:'campaign_name',label:'Campaign name'}
    ],
    email_verified:[
      {key:'source',label:'Source',required:true},
      {key:'plan_id',label:'Plan'},
      {key:'interval',label:'Billing interval'},
      {key:'campaign_source',label:'Campaign source'},
      {key:'campaign_medium',label:'Campaign medium'},
      {key:'campaign_name',label:'Campaign name'}
    ],
    checkout_started:[
      {key:'plan_id',label:'Plan',required:true},
      {key:'interval',label:'Billing interval',required:true},
      {key:'value',label:'Value',required:true},
      {key:'currency',label:'Currency',required:true},
      {key:'order_id',label:'Order ID',required:true,operational:true},
      {key:'source',label:'Source',required:true},
      {key:'previous_plan_id',label:'Previous plan'},
      {key:'previous_interval',label:'Previous billing interval'},
      {key:'selection_surface',label:'Selection surface'},
      {key:'campaign_source',label:'Campaign source'},
      {key:'campaign_medium',label:'Campaign medium'},
      {key:'campaign_name',label:'Campaign name'}
    ],
    purchase:[
      {key:'plan_id',label:'Plan',required:true},
      {key:'interval',label:'Billing interval',required:true},
      {key:'value',label:'Value',required:true},
      {key:'currency',label:'Currency',required:true},
      {key:'order_id',label:'Order ID',required:true,operational:true},
      {key:'source',label:'Source',required:true},
      {key:'previous_plan_id',label:'Previous plan'},
      {key:'previous_interval',label:'Previous billing interval'},
      {key:'campaign_source',label:'Campaign source'},
      {key:'campaign_medium',label:'Campaign medium'},
      {key:'campaign_name',label:'Campaign name'}
    ],
    website_published:[
      {key:'plan_id',label:'Plan',required:true},
      {key:'source',label:'Source',required:true},
      {key:'interval',label:'Billing interval'},
      {key:'publish_destination',label:'Publish destination'}
    ],
    subscription_renewed:[
      {key:'plan_id',label:'Plan',required:true},
      {key:'interval',label:'Billing interval',required:true},
      {key:'value',label:'Value',required:true},
      {key:'currency',label:'Currency',required:true},
      {key:'order_id',label:'Order ID',required:true,operational:true},
      {key:'source',label:'Source',required:true}
    ],
    subscription_cancelled:[
      {key:'plan_id',label:'Plan',required:true},
      {key:'interval',label:'Billing interval',required:true},
      {key:'source',label:'Source',required:true},
      {key:'previous_plan_id',label:'Previous plan'},
      {key:'previous_interval',label:'Previous billing interval'}
    ],
    refund_issued:[
      {key:'plan_id',label:'Plan',required:true},
      {key:'interval',label:'Billing interval',required:true},
      {key:'value',label:'Value',required:true},
      {key:'currency',label:'Currency',required:true},
      {key:'order_id',label:'Order ID',required:true,operational:true},
      {key:'source',label:'Source',required:true}
    ]
  };
  var SAFE_PLAN_IDS = {starter:1,pro:1,scale:1};
  var SAFE_INTERVALS = {monthly:1,annual:1};
  var SAFE_SELECTION_SURFACES = {signup:1,pricing:1,billing:1};
  var SAFE_PAGE_TYPES = {home:1,'index.html':1,pricing:1,features:1,how:1,experts:1,blog:1,contact:1,signup:1,qa:1};
  var SAFE_LOW_CARDINALITY = /^[a-z0-9][a-z0-9_:-]{0,79}$/;
  var state = {
    config:null,
    configPromise:null,
    legacyGa4:'',
    ephemeralAttribution:{},
    pageEventId:uuid(),
    analyticsClientId:'',
    analyticsSessionId:'',
    receiptQueue:null,
    receiptPending:{},
    receiptRejected:{},
    lastConsentSignature:'',
    routeDedupe:{},
    lastPlanSelectionFingerprint:'',
    scripts:{},
    providerInit:{},
    adminOverview:null,
    adminEvents:[],
    adminDeliveries:[],
    adminEventFilters:{event_name:'',event_source:'',plan_id:'',interval:'',campaign_source:'',campaign_medium:'',campaign_name:''},
    adminCatalogFilters:{query:'',source:'',stage:''}
  };
  var nativeFetch = window.fetch.bind(window);

  function uuid(){
    try { if(window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID(); } catch(e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(ch){
      var n = Math.random() * 16 | 0;
      return (ch === 'x' ? n : (n & 3 | 8)).toString(16);
    });
  }
  function cleanText(value, max){
    return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0, max || 180);
  }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function bool(value, fallback){
    if(value === undefined || value === null || value === '') return fallback === true;
    if(typeof value === 'boolean') return value;
    return ['1','true','yes','on','enabled','connected','ready'].indexOf(String(value).toLowerCase()) >= 0;
  }
  function token(){
    try { return sessionStorage.getItem('ob_t') || localStorage.getItem('ob_t') || sessionStorage.getItem('ownlybiz_token') || localStorage.getItem('ownlybiz_token') || ''; } catch(e) { return ''; }
  }
  function authenticatedSessionPresent(){
    try {
      return !!(sessionStorage.getItem('ob_t') || localStorage.getItem('ob_t') ||
        sessionStorage.getItem('ownlybiz_token') || localStorage.getItem('ownlybiz_token') ||
        sessionStorage.getItem('ob_client_token') || localStorage.getItem('ob_client_token') ||
        sessionStorage.getItem('ob_client_t') || localStorage.getItem('ob_client_t'));
    } catch(e) { return false; }
  }
  function sanitizeUrl(value){
    try {
      var url = new URL(value || location.href, location.origin);
      if(url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      return url.origin + (url.pathname || '/');
    } catch(e) { return location.origin + (location.pathname || '/'); }
  }
  function sanitizePath(value){
    try { return new URL(value || location.pathname || '/', location.origin).pathname || '/'; }
    catch(e) { return location.pathname || '/'; }
  }
  function readConsent(){
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || '{}') || {}; } catch(e) { return {}; }
  }
  function currentConsentRejected(consent){
    consent = consent || readConsent();
    return !!(state.receiptRejected && state.receiptRejected[consentSignature(consent)]);
  }
  function analyticsConsent(){ var consent=readConsent(); return consent.analytics === true && !currentConsentRejected(consent); }
  function marketingConsent(){ var consent=readConsent(); return consent.marketing === true && !currentConsentRejected(consent); }
  function consentChosen(){ return !!readConsent().updated_at; }
  function policyVersion(){
    var cfg = state.config || {};
    var settings = cfg.settings || {};
    return cleanText(cfg.policy_version || settings.policy_version || 'tracking-consent-2026-07', 80);
  }
  function stableConsentId(){
    try {
      var consent = readConsent();
      var id = cleanText(consent.consent_id,120);
      if(!id){
        id = uuid();
        consent.consent_id = id;
        localStorage.setItem(CONSENT_KEY,JSON.stringify(consent));
      }
      return id;
    } catch(e) { return ''; }
  }
  function consentSnapshot(){
    var consent = readConsent();
    return {
      necessary:true,
      consent_id:stableConsentId(),
      analytics:consent.analytics === true,
      marketing:consent.marketing === true,
      updated_at:cleanText(consent.updated_at, 48),
      policy_version:cleanText(consent.policy_version || policyVersion(), 80),
      consent_receipt_id:cleanText(consent.consent_receipt_id, 120)
    };
  }
  function consentReceiptReady(){ var consent=consentSnapshot(); return !!consent.consent_receipt_id && !currentConsentRejected(consent); }
  function analyticsIdentityAllowed(){ return analyticsConsent() && (!platformConsentContext() || consentReceiptReady()); }
  function writeConsentReceipt(updatedAt, receiptId, version, expectedSignature){
    if(!receiptId) return false;
    try {
      var current = readConsent();
      if(cleanText(current.updated_at,48) !== cleanText(updatedAt,48)) return false;
      if(expectedSignature && consentSignature(consentSnapshot()) !== expectedSignature) return false;
      current.consent_receipt_id = cleanText(receiptId,120);
      current.policy_version = cleanText(version || current.policy_version || policyVersion(),80);
      localStorage.setItem(CONSENT_KEY, JSON.stringify(current));
      return true;
    } catch(e) { return false; }
  }
  function enforcePolicyVersion(){
    if(!platformConsentContext()) return false;
    var consent = readConsent();
    var expected = policyVersion();
    if(!consent.updated_at || consent.policy_version === expected) return false;
    var reset = {
      necessary:true,
      analytics:false,
      marketing:false,
      updated_at:new Date().toISOString(),
      policy_version:expected,
      consent_id:consent.consent_id || stableConsentId()
    };
    try { localStorage.setItem(CONSENT_KEY,JSON.stringify(reset)); } catch(e) {}
    state.routeDedupe = {};
    syncAnalyticsClient();
    syncAnalyticsSession();
    clearAttribution();
    updateGoogleConsent();
    revokeProviderRuntime();
    consentChanged(reset);
    setTimeout(function(){ try { if(typeof window.obOpenConsentManager === 'function') window.obOpenConsentManager(); } catch(e) {} },0);
    return true;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  if(!window.__obGoogleConsentDefault20260711){
    window.__obGoogleConsentDefault20260711 = true;
    window.gtag('consent','default',{
      analytics_storage:'denied',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied',
      functionality_storage:'denied',
      personalization_storage:'denied',
      security_storage:'granted',
      wait_for_update:500
    });
  }
  function updateGoogleConsent(){
    var receiptReady = !platformConsentContext() || consentReceiptReady();
    var analytics = analyticsConsent() && receiptReady;
    var marketing = marketingConsent() && receiptReady;
    window.gtag('consent','update',{
      analytics_storage:analytics ? 'granted' : 'denied',
      ad_storage:marketing ? 'granted' : 'denied',
      ad_user_data:marketing ? 'granted' : 'denied',
      ad_personalization:marketing ? 'granted' : 'denied',
      functionality_storage:(analytics || marketing) ? 'granted' : 'denied',
      personalization_storage:marketing ? 'granted' : 'denied',
      security_storage:'granted'
    });
  }
  updateGoogleConsent();

  function cleanClickId(value){
    value = String(value || '').trim();
    return /^[A-Za-z0-9._~-]{1,200}$/.test(value) ? value : '';
  }
  function platformHost(){
    var host = String(location.hostname || '').toLowerCase();
    return !host || host === 'ownlybiz.com' || host === 'www.ownlybiz.com' || host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.indexOf('vercel.app') >= 0;
  }
  function routeRoot(){ return String(location.pathname || '/').replace(/^\/+|\/+$/g,'').split('/').filter(Boolean)[0] || ''; }
  function routePageType(){ var root=routeRoot().toLowerCase(); return root === 'index.html' || !root ? 'home' : (safeDetailValue('page_type',root) || 'home'); }
  function expertRuntimeContext(){
    if(!platformHost()) return true;
    if(new URLSearchParams(location.search || '').has('expert')) return true;
    if(document.querySelector('#view-4.active')) return true;
    var root = routeRoot().toLowerCase();
    var reserved = window.obPlatformRouteRoots || {};
    if(root && !reserved[root]) return true;
    if((window._currentExpertSlug || window._browseExpert) && !ALLOWED_PLATFORM_ROUTES[root]) return true;
    return false;
  }
  function platformConsentContext(){ return platformHost() && !expertRuntimeContext(); }
  function activeSignupFunnel(){ return routeRoot().toLowerCase() === 'signup' || !!document.querySelector('#view-2.active'); }
  function scopeAllowed(){
    if(!platformHost() || expertRuntimeContext()) return false;
    if(authenticatedSessionPresent() && !document.querySelector('#view-2.active')) return false;
    var root = routeRoot().toLowerCase();
    if(!ALLOWED_PLATFORM_ROUTES[root]) return false;
    if(document.querySelector('#view-3.active,#view-4.active,#view-5.active,#view-6.active,#view-7.active')) return false;
    return true;
  }
  function captureLandingAttribution(){
    if(!platformHost()) return {};
    var root = routeRoot().toLowerCase();
    if(!ALLOWED_PLATFORM_ROUTES[root]) return {};
    var params;
    try { params = new URLSearchParams(location.search || ''); } catch(e) { return {}; }
    var found = {};
    CLICK_KEYS.forEach(function(key){
      var value = cleanClickId(params.get(key));
      if(value) found[key] = value;
    });
    Object.keys(CAMPAIGN_ATTRIBUTION_KEYS).forEach(function(queryKey){
      var value = safeDetailValue(CAMPAIGN_ATTRIBUTION_KEYS[queryKey],params.get(queryKey));
      if(value) found[queryKey] = value;
    });
    state.ephemeralAttribution = found;
    return found;
  }
  function readCookie(name){
    if(!marketingConsent()) return '';
    try {
      var prefix = name + '=';
      var parts = String(document.cookie || '').split(';');
      for(var i=0;i<parts.length;i++){
        var item = parts[i].trim();
        if(item.indexOf(prefix) === 0) return cleanClickId(decodeURIComponent(item.slice(prefix.length)));
      }
    } catch(e) {}
    return '';
  }
  function clearProviderCookie(name){
    try {
      document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
      if(/(^|\.)ownlybiz\.com$/i.test(location.hostname || '')) document.cookie = name + '=; Max-Age=0; Path=/; Domain=.ownlybiz.com; SameSite=Lax';
    } catch(e) {}
  }
  function readPersistedAttribution(){
    if(!marketingConsent()) return {};
    try {
      var raw = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || '{}') || {};
      var out = {};
      CLICK_KEYS.concat(['fbp','fbc']).forEach(function(key){ var value = cleanClickId(raw[key]); if(value) out[key] = value; });
      Object.keys(CAMPAIGN_ATTRIBUTION_KEYS).forEach(function(key){
        var value = safeDetailValue(CAMPAIGN_ATTRIBUTION_KEYS[key],raw[key]);
        if(value) out[key] = value;
      });
      return out;
    } catch(e) { return {}; }
  }
  function promoteAttribution(){
    if(!marketingConsent()) return {};
    var merged = Object.assign({}, readPersistedAttribution(), state.ephemeralAttribution || {});
    var fbp = readCookie('_fbp');
    var fbc = readCookie('_fbc');
    if(fbp) merged.fbp = fbp;
    if(fbc) merged.fbc = fbc;
    if(!merged.fbc && merged.fbclid) merged.fbc = cleanClickId('fb.1.' + String(Date.now()) + '.' + merged.fbclid);
    try { localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(merged)); } catch(e) {}
    return merged;
  }
  function clearAttribution(){
    state.ephemeralAttribution = {};
    try { localStorage.removeItem(ATTRIBUTION_KEY); } catch(e) {}
    clearProviderCookie('_fbp');
    clearProviderCookie('_fbc');
  }
  function clearAnalyticsIdentifiersFromDataLayer(){
    if(!Array.isArray(window.dataLayer)) return;
    window.dataLayer.forEach(function(entry){
      if(!entry) return;
      try {
        if(entry.event === 'ownlybiz_event'){
          delete entry.analytics_client_id;
          delete entry.analytics_session_id;
        }
        var command = entry[0];
        var parameters = entry[2];
        if((command === 'config' || command === 'event') && parameters && typeof parameters === 'object'){
          delete parameters.client_id;
          delete parameters.session_id;
        }
      } catch(e) {}
    });
  }
  function syncAnalyticsClient(){
    if(!analyticsIdentityAllowed()){
      state.analyticsClientId = '';
      try {
        localStorage.removeItem(ANALYTICS_CLIENT_KEY);
        localStorage.removeItem('ob_analytics_vid');
        sessionStorage.removeItem('ob_analytics_sid');
      } catch(e) {}
      return '';
    }
    try {
      var id = String(localStorage.getItem(ANALYTICS_CLIENT_KEY) || '').trim();
      if(!/^\d{1,20}\.\d{1,20}$/.test(id)) {
        id = String(Math.floor(100000000 + Math.random() * 900000000)) + '.' + String(Math.floor(Date.now() / 1000));
        localStorage.setItem(ANALYTICS_CLIENT_KEY, id);
      }
      state.analyticsClientId = id;
      return id;
    } catch(e) { return ''; }
  }
  function syncAnalyticsSession(){
    if(!analyticsIdentityAllowed()){
      var hadSessionId = !!state.analyticsSessionId;
      try { hadSessionId = hadSessionId || /^[1-9]\d{0,14}$/.test(String(sessionStorage.getItem(ANALYTICS_SESSION_KEY) || '').trim()); } catch(e) {}
      if(hadSessionId && analyticsSessionGeneration === 0) analyticsSessionGeneration = 1;
      state.analyticsSessionId = '';
      try {
        sessionStorage.removeItem(ANALYTICS_SESSION_KEY);
        sessionStorage.removeItem(ANALYTICS_SESSION_ACTIVITY_KEY);
        sessionStorage.removeItem('ob_analytics_sid');
      } catch(e) {}
      clearAnalyticsIdentifiersFromDataLayer();
      return '';
    }
    try {
      var now = Date.now();
      var id = String(sessionStorage.getItem(ANALYTICS_SESSION_KEY) || '').trim();
      var lastActivity = Number(sessionStorage.getItem(ANALYTICS_SESSION_ACTIVITY_KEY) || 0);
      var expired = !Number.isFinite(lastActivity) || lastActivity <= 0 || lastActivity > now || now - lastActivity >= ANALYTICS_SESSION_TIMEOUT_MS;
      if(!/^[1-9]\d{0,14}$/.test(id) || expired) {
        var nextSessionId = Math.floor(now / 1000) + analyticsSessionGeneration;
        analyticsSessionGeneration = (analyticsSessionGeneration + 1) % 1000;
        id = String(nextSessionId);
        sessionStorage.setItem(ANALYTICS_SESSION_KEY, id);
      }
      sessionStorage.setItem(ANALYTICS_SESSION_ACTIVITY_KEY, String(now));
      state.analyticsSessionId = id;
      return id;
    } catch(e) { return ''; }
  }
  function attribution(){ return marketingConsent() ? promoteAttribution() : {}; }
  function campaignDetails(){
    if(!analyticsConsent() && !marketingConsent()) return {};
    var raw = marketingConsent() ? Object.assign({},readPersistedAttribution(),state.ephemeralAttribution || {}) : (state.ephemeralAttribution || {});
    var details = {};
    Object.keys(CAMPAIGN_ATTRIBUTION_KEYS).forEach(function(key){
      var detailKey = CAMPAIGN_ATTRIBUTION_KEYS[key];
      var value = safeDetailValue(detailKey,raw[key]);
      if(value) details[detailKey] = value;
    });
    return details;
  }
  function campaignAttribution(){
    var details = campaignDetails();
    var attribution = {};
    if(details.campaign_source) attribution.utm_source = details.campaign_source;
    if(details.campaign_medium) attribution.utm_medium = details.campaign_medium;
    if(details.campaign_name) attribution.utm_campaign = details.campaign_name;
    return attribution;
  }

  function consentSignature(consent){
    consent = consent || consentSnapshot();
    return [consent.updated_at || '',consent.policy_version || '',consent.analytics ? '1':'0',consent.marketing ? '1':'0'].join('|');
  }
  function normalizedConsentTimestamp(value){
    var timestamp = typeof value === 'string' && !/^\d+$/.test(value.trim()) ? Date.parse(value) : Number(value);
    if(isFinite(timestamp) && timestamp > 0 && timestamp < 100000000000) timestamp *= 1000;
    return isFinite(timestamp) && timestamp > 0 ? Math.floor(timestamp) : 0;
  }
  function consentSnapshotBoolean(value){
    if(value === true || value === 1) return true;
    if(value === false || value === 0) return false;
    return null;
  }
  function consentReceiptResponseState(data,dispatched){
    var nested = data && data.data;
    var candidates = [data,data && data.receipt,nested,nested && nested.receipt];
    var flagged = candidates.some(function(item){ return !!(item && (item.stale === true || item.accepted === false)); });
    var snapshot = data && data.receipt || nested && (nested.receipt || nested) || data || {};
    if(!flagged) return {rejected:false,recovered:false,snapshot:snapshot};
    var matches = normalizedConsentTimestamp(snapshot.updated_at) === normalizedConsentTimestamp(dispatched.updated_at) &&
      cleanText(snapshot.policy_version,80) === cleanText(dispatched.policy_version,80) &&
      !!(snapshot.receipt_id || snapshot.id) &&
      consentSnapshotBoolean(snapshot.necessary) === true &&
      consentSnapshotBoolean(snapshot.analytics) === (dispatched.analytics === true) &&
      consentSnapshotBoolean(snapshot.marketing) === (dispatched.marketing === true);
    return {rejected:!matches,recovered:matches,snapshot:snapshot};
  }
  function postConsentReceipt(consent){
    consent = consent || consentSnapshot();
    if(!platformConsentContext()) return Promise.resolve(consent);
    if(!consent.updated_at) return Promise.resolve(consent);
    var signature = consentSignature(consent);
    var current = consentSnapshot();
    if(consentSignature(current) === signature && current.consent_receipt_id) return Promise.resolve(current);
    if(state.receiptRejected[signature]) return Promise.resolve(current);
    if(state.receiptPending[signature]) return state.receiptPending[signature];
    var queue = state.receiptQueue || Promise.resolve();
    var task = queue.catch(function(){ return null; }).then(function(){
      var latest = consentSnapshot();
      if(consentSignature(latest) !== signature) return latest;
      if(latest.consent_receipt_id) return latest;
      var dispatched = Object.assign({},latest);
      var dispatchedSignature = consentSignature(dispatched);
      return nativeFetch(API_ROOT + '/tracking/consent', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          consent_id:dispatched.consent_id || stableConsentId(),
          policy_version:dispatched.policy_version || policyVersion(),
          analytics:dispatched.analytics === true,
          marketing:dispatched.marketing === true,
          necessary:true,
          updated_at:dispatched.updated_at,
          path:sanitizePath(location.pathname)
        }),
        keepalive:true
      }).then(function(response){
        return response.json().catch(function(){ return {}; }).then(function(data){
          if(!response.ok) throw new Error(data.error || 'Consent receipt failed');
          var latestAfterResponse = consentSnapshot();
          if(consentSignature(latestAfterResponse) !== dispatchedSignature) return latestAfterResponse;
          var responseState = consentReceiptResponseState(data,dispatched);
          if(responseState.rejected){
            state.receiptRejected[dispatchedSignature] = true;
            updateGoogleConsent();
            syncAnalyticsClient();
            syncAnalyticsSession();
            clearAttribution();
            revokeProviderRuntime();
            return consentSnapshot();
          }
          var responseSnapshot = responseState.snapshot || {};
          var receiptId = responseSnapshot.receipt_id || responseSnapshot.id || data.consent_receipt_id || data.receipt_id || '';
          var responseVersion = cleanText(responseSnapshot.policy_version || data.consent_version || data.policy_version || dispatched.policy_version,80);
          if(responseVersion && responseVersion !== dispatched.policy_version) return latestAfterResponse;
          if(receiptId) writeConsentReceipt(dispatched.updated_at, receiptId, responseVersion, dispatchedSignature);
          return consentSnapshot();
        });
      }).catch(function(){ return consentSnapshot(); });
    });
    state.receiptPending[signature] = task;
    state.receiptQueue = task.then(function(){ return null; },function(){ return null; });
    task.then(function(){
      if(state.receiptPending[signature] === task) delete state.receiptPending[signature];
    },function(){
      if(state.receiptPending[signature] === task) delete state.receiptPending[signature];
    });
    return task;
  }
  function context(eventId){
    var consent = consentSnapshot();
    var result = {
      consent_receipt_id:consent.consent_receipt_id || '',
      consent_version:consent.policy_version || policyVersion(),
      browser_event_id:cleanClickId(eventId) || state.pageEventId,
      attribution:marketingConsent() ? attribution() : (analyticsConsent() ? campaignAttribution() : {})
    };
    var analyticsId = analyticsIdentityAllowed() ? syncAnalyticsClient() : '';
    if(analyticsId) result.analytics_client_id = analyticsId;
    var analyticsSessionId = analyticsIdentityAllowed() ? syncAnalyticsSession() : '';
    if(analyticsSessionId) result.analytics_session_id = analyticsSessionId;
    return result;
  }
  function revokeProviderRuntime(){
    try { if(window.fbq) window.fbq('consent','revoke'); } catch(e) {}
    try { if(window.ttq && window.ttq.revokeConsent) window.ttq.revokeConsent(); } catch(e) {}
    try { if(window.ttq && window.ttq.disableCookie) window.ttq.disableCookie(); } catch(e) {}
  }
  function consentChanged(consent){
    consent = consent || consentSnapshot();
    updateGoogleConsent();
    var marketingChosen = marketingConsent();
    var marketingAllowed = marketingChosen && (!platformConsentContext() || consentReceiptReady());
    syncAnalyticsClient();
    syncAnalyticsSession();
    if(marketingChosen){
      captureLandingAttribution();
      promoteAttribution();
      if(marketingAllowed){
        try { if(window.fbq) window.fbq('consent','grant'); } catch(e) {}
      } else revokeProviderRuntime();
    } else {
      clearAttribution();
      if(analyticsConsent()) captureLandingAttribution();
      revokeProviderRuntime();
    }
    if(!platformConsentContext()) return;
    var signature = consentSignature(consent);
    if(state.lastConsentSignature !== signature){
      state.lastConsentSignature = signature;
      Promise.all([postConsentReceipt(consent),loadPublicConfig()]).then(function(){
        activate();
        trackRouteEvents();
      });
    }
    activate();
  }
  window.addEventListener('ob:privacy-consent-changed',function(event){ consentChanged(event && event.detail || consentSnapshot()); });
  window.addEventListener('storage',function(event){
    if(!event || event.key !== CONSENT_KEY) return;
    if(event.storageArea && event.storageArea !== localStorage) return;
    var stored = readConsent();
    var storedSignature = consentSignature(stored);
    if(stored.consent_receipt_id && state.receiptRejected[storedSignature]) delete state.receiptRejected[storedSignature];
    consentChanged(stored);
  });

  function connectionMap(){
    var cfg = state.config || {};
    var connections = cfg.providers || cfg.connections || {};
    if(Array.isArray(connections)){
      var map = {};
      connections.forEach(function(item){ if(item && item.provider) map[item.provider] = item; });
      return map;
    }
    return connections || {};
  }
  function connection(provider){ return connectionMap()[provider] || {}; }
  function hasConnection(provider){ return Object.prototype.hasOwnProperty.call(connectionMap(), provider); }
  function connectionConfig(provider){
    var item = connection(provider);
    return item.public_config || item.config || item.settings || item || {};
  }
  function connectionEnabled(provider){
    var item = connection(provider);
    var cfg = connectionConfig(provider);
    if(item.enabled === false || cfg.enabled === false) return false;
    var status = String(item.status || '').toLowerCase();
    if(['disabled','disconnected','revoked'].indexOf(status) >= 0) return false;
    return !!Object.keys(cfg).length || status === 'connected' || status === 'ready';
  }
  function normalizeBrowserMode(value){
    value = String(value || 'managed').toLowerCase();
    return value === 'gtm' || value === 'gtm_meta' ? value : 'managed';
  }
  function browserMode(){
    var cfg = state.config || {};
    return normalizeBrowserMode(cfg.browser_mode || (cfg.settings && cfg.settings.browser_mode));
  }
  function globalEnabled(){
    var cfg = state.config || {};
    return bool(cfg.enabled !== undefined ? cfg.enabled : (cfg.settings && cfg.settings.enabled), false);
  }
  function schemaVersion(){
    var cfg = state.config || {};
    var overview = state.adminOverview || {};
    var version = cleanText(cfg.schema_version || (cfg.data_layer && cfg.data_layer.schema_version) || overview.schema_version || '2026-07-12.v1',40);
    return /^[A-Za-z0-9._-]{1,40}$/.test(version) ? version : '2026-07-12.v1';
  }
  function loadScript(id, src){
    if(document.getElementById(id)) return Promise.resolve(document.getElementById(id));
    if(state.scripts[id]) return state.scripts[id];
    state.scripts[id] = new Promise(function(resolve){
      var script = document.createElement('script');
      script.id = id;
      script.async = true;
      script.src = src;
      script.onload = function(){ resolve(script); };
      script.onerror = function(){ resolve(null); };
      document.head.appendChild(script);
    });
    return state.scripts[id];
  }
  function gaId(value){ value = cleanText(value,40).toUpperCase(); return /^G-[A-Z0-9]{4,20}$/.test(value) ? value : ''; }
  function adsId(value){ value = cleanText(value,40).toUpperCase(); return /^AW-[0-9]{4,20}$/.test(value) ? value : ''; }
  function gtmId(value){ value = cleanText(value,40).toUpperCase(); return /^GTM-[A-Z0-9]{4,20}$/.test(value) ? value : ''; }
  function validGoogleCustomVariableTag(value){ return /^[a-z][a-z0-9_]{0,63}$/.test(String(value || '')); }
  function ensureGoogleDestination(id, scope){
    id = scope === 'ga4' ? gaId(id) : adsId(id);
    if(!id) return Promise.resolve(false);
    updateGoogleConsent();
    var scriptId = 'ob-platform-google-tag';
    return loadScript(scriptId, 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id)).then(function(){
      var key = '__obPlatformGoogleDestination_' + id;
      if(!window[key]){
        window.gtag('js', new Date());
        var options = {send_page_view:false,page_path:sanitizePath(location.pathname),page_title:cleanText(document.title,160)};
        if(scope === 'ga4' && analyticsIdentityAllowed()){
          options.client_id = syncAnalyticsClient();
          options.session_id = syncAnalyticsSession();
        }
        window.gtag('config', id, options);
        window[key] = true;
      }
      return true;
    });
  }
  function ensureGtm(){
    var id = gtmId(connectionConfig('gtm').container_id);
    if(!id || !connectionEnabled('gtm')) return Promise.resolve(false);
    updateGoogleConsent();
    if(!state.providerInit.gtm){
      state.providerInit.gtm = id;
      window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
    }
    return loadScript('ob-platform-gtm', 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id)).then(function(){ return true; });
  }
  function ensureMeta(){
    var pixel = cleanText(connectionConfig('meta').pixel_id,40);
    if(!/^\d{5,30}$/.test(pixel) || !connectionEnabled('meta')) return Promise.resolve(false);
    if(!window.fbq){
      var fbq = function(){ fbq.callMethod ? fbq.callMethod.apply(fbq,arguments) : fbq.queue.push(arguments); };
      fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
      window.fbq = fbq;
    }
    if(!state.providerInit.meta){ window.fbq('init',pixel); state.providerInit.meta = pixel; }
    window.fbq('consent','grant');
    return loadScript('ob-platform-meta-pixel','https://connect.facebook.net/en_US/fbevents.js').then(function(){ return true; });
  }
  function ensureTikTok(){
    var pixel = cleanText(connectionConfig('tiktok').pixel_code,40);
    if(!/^[A-Za-z0-9]{6,40}$/.test(pixel) || !connectionEnabled('tiktok')) return Promise.resolve(false);
    if(!window.ttq){
      var ttq = window.ttq = [];
      ttq.methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];
      ttq.setAndDefer = function(target, method){ target[method] = function(){ target.push([method].concat(Array.prototype.slice.call(arguments))); }; };
      ttq.methods.forEach(function(method){ ttq.setAndDefer(ttq,method); });
    }
    if(!state.providerInit.tiktok) state.providerInit.tiktok = pixel;
    return loadScript('ob-platform-tiktok-pixel','https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + encodeURIComponent(pixel) + '&lib=ttq').then(function(){
      try { if(window.ttq.grantConsent) window.ttq.grantConsent(); } catch(e) {}
      return true;
    });
  }
  function ensureLinkedIn(){
    var partnerId = cleanText(connectionConfig('linkedin').partner_id,40);
    if(!/^\d{3,30}$/.test(partnerId) || !connectionEnabled('linkedin')) return Promise.resolve(false);
    window._linkedin_partner_id = partnerId;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    if(window._linkedin_data_partner_ids.indexOf(partnerId) < 0) window._linkedin_data_partner_ids.push(partnerId);
    if(!window.lintrk){
      window.lintrk = function(a,b){ window.lintrk.q.push([a,b]); };
      window.lintrk.q = [];
    }
    state.providerInit.linkedin = partnerId;
    return loadScript('ob-platform-linkedin-insight','https://snap.licdn.com/li.lms-analytics/insight.min.js').then(function(){ return true; });
  }
  function managedGa4Id(){
    var cfg = connectionConfig('ga4');
    if(hasConnection('ga4')) return connectionEnabled('ga4') ? gaId(cfg.measurement_id) : '';
    return gaId(state.legacyGa4);
  }
  function activate(){
    updateGoogleConsent();
    if(!state.config || !globalEnabled() || !scopeAllowed() || !consentReceiptReady() || (!analyticsConsent() && !marketingConsent())) return;
    var mode = browserMode();
    if(mode === 'gtm' || mode === 'gtm_meta'){
      ensureGtm();
      if(mode === 'gtm_meta' && marketingConsent()) ensureMeta();
      return;
    }
    if(analyticsConsent()){
      var measurement = managedGa4Id();
      if(measurement) ensureGoogleDestination(measurement,'ga4');
    }
    if(marketingConsent()){
      var conversionId = adsId(connectionConfig('google_ads').conversion_id);
      if(connectionEnabled('google_ads') && conversionId) ensureGoogleDestination(conversionId,'ads');
      ensureMeta();
      ensureTikTok();
      ensureLinkedIn();
    }
  }
  function setLegacyGa4(id){ state.legacyGa4 = gaId(id); activate(); }

  function mappings(provider){
    var item = connection(provider);
    return item.mappings || item.event_mappings || connectionConfig(provider).mappings || connectionConfig(provider).event_mappings || {};
  }
  function mappingValue(provider, eventName){
    var value = mappings(provider)[eventName];
    if(value && typeof value === 'object') return value.label || value.browser_label || value.conversion_id || value.conversion_action_id || '';
    return cleanText(value,120);
  }
  function eventDetailFields(eventName){
    return (EVENT_DETAIL_SCHEMA[String(eventName || '').toLowerCase()] || []).slice();
  }
  function safeDetailKeys(eventName){
    var fields = eventDetailFields(eventName);
    if(fields.length) return fields.map(function(field){ return field.key; });
    var all = {};
    Object.keys(EVENT_DETAIL_SCHEMA).forEach(function(name){
      EVENT_DETAIL_SCHEMA[name].forEach(function(field){ all[field.key] = true; });
    });
    return Object.keys(all);
  }
  function canonicalLowCardinality(value){
    var clean = cleanText(value,80);
    if(/^\/[A-Za-z0-9/_:-]{1,79}$/.test(clean)) clean = clean.replace(/^\/+|\/+$/g,'').replace(/\/+/g,':');
    return clean.toLowerCase();
  }
  function safeDetailValue(key,value){
    if(value === undefined || value === null || value === '') return undefined;
    if(key === 'value'){
      var amount = Number(value);
      return isFinite(amount) && amount >= 0 && amount <= 100000000 ? Math.round(amount * 100) / 100 : undefined;
    }
    var max = key === 'order_id' ? 160 : 80;
    var clean = cleanText(value,max);
    if(!clean) return undefined;
    if(key === 'plan_id' || key === 'previous_plan_id'){
      clean = clean.toLowerCase();
      return SAFE_PLAN_IDS[clean] ? clean : undefined;
    }
    if(key === 'interval' || key === 'previous_interval'){
      clean = clean.toLowerCase();
      return SAFE_INTERVALS[clean] ? clean : undefined;
    }
    if(key === 'selection_surface'){
      clean = clean.toLowerCase();
      return SAFE_SELECTION_SURFACES[clean] ? clean : undefined;
    }
    if(key === 'currency'){
      clean = clean.toUpperCase();
      return /^[A-Z]{3}$/.test(clean) ? clean : undefined;
    }
    if(key === 'page_type'){
      clean = clean.toLowerCase() === 'index.html' ? 'home' : clean.toLowerCase();
      return SAFE_PAGE_TYPES[clean] ? clean : undefined;
    }
    if(['cta_id','placement','source','destination','publish_destination','campaign_source','campaign_medium','campaign_name'].indexOf(key) >= 0){
      clean = canonicalLowCardinality(clean);
      return SAFE_LOW_CARDINALITY.test(clean) ? clean : undefined;
    }
    if(key === 'order_id') return /^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/.test(clean) ? clean : undefined;
    return /^[A-Za-z0-9 _./:-]{1,80}$/.test(clean) ? clean : undefined;
  }
  function safeProperties(eventName,properties){
    if(eventName && typeof eventName === 'object'){
      properties = eventName;
      eventName = '';
    }
    properties = properties && typeof properties === 'object' && !Array.isArray(properties) ? properties : {};
    var aliases = Object.assign({},properties,{
      plan_id:properties.plan_id !== undefined ? properties.plan_id : properties.plan,
      previous_plan_id:properties.previous_plan_id !== undefined ? properties.previous_plan_id : properties.previous_plan,
      interval:properties.interval !== undefined ? properties.interval : properties.billing_interval,
      previous_interval:properties.previous_interval !== undefined ? properties.previous_interval : properties.previous_billing_interval,
      cta_id:properties.cta_id !== undefined ? properties.cta_id : properties.cta,
      selection_surface:properties.selection_surface !== undefined ? properties.selection_surface : properties.surface,
      destination:properties.destination !== undefined ? properties.destination : properties.cta_destination,
      campaign_name:properties.campaign_name !== undefined ? properties.campaign_name : properties.campaign
    });
    var allowed = safeDetailKeys(eventName);
    var clean = {};
    allowed.forEach(function(key){
      var value = safeDetailValue(key,aliases[key]);
      if(value !== undefined) clean[key] = value;
    });
    return clean;
  }
  function requiredDetailsPresent(eventName,properties){
    if(eventName !== 'plan_selected') return true;
    var fields = eventDetailFields(eventName);
    return fields.every(function(field){ return !field.required || properties[field.key] !== undefined; });
  }
  function ecommerceDetails(eventName,details){
    details = details || {};
    if(!details.plan_id || ['plan_selected','checkout_started','purchase','subscription_renewed','refund_issued'].indexOf(eventName) < 0) return {};
    var item = {item_id:details.plan_id,item_name:details.plan_id,item_category:'ownlybiz_subscription'};
    if(details.interval) item.item_variant = details.interval;
    var ecommerce = {items:[item]};
    if(details.value !== undefined) ecommerce.value = details.value;
    if(details.currency) ecommerce.currency = details.currency;
    if(details.order_id) ecommerce.transaction_id = details.order_id;
    return ecommerce;
  }
  function mappedBrowserCommerceDetails(provider,details){
    details = details || {};
    var mapped = {};
    if(details.value !== undefined) mapped.value = details.value;
    if(details.currency) mapped.currency = details.currency;
    if(details.order_id) mapped.order_id = details.order_id;
    if(details.plan_id){
      mapped.content_name = details.plan_id;
      mapped.content_type = 'product';
      mapped.plan_id = details.plan_id;
      if(provider === 'meta') mapped.content_ids = [details.plan_id];
      if(provider === 'tiktok') mapped.contents = [{content_id:details.plan_id,content_name:details.plan_id,quantity:1}];
    }
    if(details.interval) mapped.billing_interval = details.interval;
    return mapped;
  }
  function googleAdsBrowserParams(params,details){
    var output = Object.assign({},params);
    var config = connectionConfig('google_ads');
    var planTag = cleanText(config.plan_custom_variable_tag,64);
    var intervalTag = cleanText(config.interval_custom_variable_tag,64);
    if(details.plan_id && validGoogleCustomVariableTag(planTag)) output[planTag] = details.plan_id;
    if(details.interval && validGoogleCustomVariableTag(intervalTag)) output[intervalTag] = details.interval;
    return output;
  }
  function browserEventObject(eventName, eventId, properties){
    var details = safeProperties(eventName,properties);
    var ecommerce = ecommerceDetails(eventName,details);
    var payload = {
      event:'ownlybiz_event',
      schema_version:schemaVersion(),
      event_name:eventName,
      ga4_event_name:GA4_BROWSER_EVENT_NAMES[eventName] || '',
      event_id:eventId,
      event_source:'browser',
      path:sanitizePath(location.pathname),
      consent:{analytics:analyticsConsent(),marketing:marketingConsent(),version:policyVersion()},
      details:details,
      properties:details
    };
    if(eventName === 'primary_cta_clicked' && details.cta_id){
      payload.content_type = 'primary_cta';
      payload.content_id = details.cta_id;
    }
    if(analyticsIdentityAllowed()){
      var analyticsClientId = state.analyticsClientId || syncAnalyticsClient();
      var analyticsSessionId = syncAnalyticsSession();
      if(analyticsClientId) payload.analytics_client_id = analyticsClientId;
      if(analyticsSessionId) payload.analytics_session_id = analyticsSessionId;
    }
    if(Object.keys(ecommerce).length) payload.ecommerce = ecommerce;
    Object.keys(details).forEach(function(key){ payload[key] = details[key]; });
    return payload;
  }
  function sendDirectMetaEvent(eventName, eventId, properties){
    if(!marketingConsent() || !connectionEnabled('meta')) return;
    var details = safeProperties(eventName,properties);
    var metaParams = Object.assign({event_id:eventId,page_path:sanitizePath(location.pathname),page_location:sanitizeUrl(location.href)},mappedBrowserCommerceDetails('meta',details));
    ensureMeta().then(function(){
      var mode = browserMode();
      if(!marketingConsent() || !consentReceiptReady() || !globalEnabled() || !scopeAllowed() || (mode !== 'managed' && mode !== 'gtm_meta')) return;
      try {
        var mapped = mappingValue('meta',eventName);
        if(eventName === 'page_view' && !mapped) window.fbq('track','PageView',metaParams,{eventID:eventId});
        else if(mapped && META_STANDARD_EVENTS[mapped]) window.fbq('track',mapped,metaParams,{eventID:eventId});
        else if(mapped) window.fbq('trackCustom',mapped,metaParams,{eventID:eventId});
        else window.fbq('trackCustom',eventName,metaParams,{eventID:eventId});
      } catch(e) {}
    });
  }
  function sendGtmEvent(eventName,eventId,properties){
    var mode = browserMode();
    if((mode !== 'gtm' && mode !== 'gtm_meta') || (!analyticsConsent() && !marketingConsent()) || !connectionEnabled('gtm')) return;
    ensureGtm().then(function(){
      var currentMode = browserMode();
      if((!analyticsConsent() && !marketingConsent()) || !consentReceiptReady() || !globalEnabled() || !scopeAllowed() || (currentMode !== 'gtm' && currentMode !== 'gtm_meta')) return;
      window.dataLayer.push({ecommerce:null});
      window.dataLayer.push(browserEventObject(eventName,eventId,properties));
    });
  }
  function sendManagedEvent(eventName, eventId, properties){
    var details = safeProperties(eventName,properties);
    var params = Object.assign({event_id:eventId,page_path:sanitizePath(location.pathname),page_location:sanitizeUrl(location.href)},details);
    var ga4Params = Object.assign({},params,ecommerceDetails(eventName,details));
    if(analyticsIdentityAllowed()){
      ga4Params.client_id = syncAnalyticsClient();
      ga4Params.session_id = syncAnalyticsSession();
    }
    var googleAdsParams = googleAdsBrowserParams(params,details);
    var tiktokParams = Object.assign({event_id:eventId,page_path:sanitizePath(location.pathname),page_location:sanitizeUrl(location.href)},mappedBrowserCommerceDetails('tiktok',details));
    if(analyticsConsent()){
      var measurement = managedGa4Id();
      if(measurement) ensureGoogleDestination(measurement,'ga4').then(function(){
        if(!analyticsConsent() || !consentReceiptReady() || !globalEnabled() || !scopeAllowed() || browserMode() !== 'managed') return;
        try { window.gtag('event',mappingValue('ga4',eventName) || eventName,ga4Params); } catch(e) {}
      });
    }
    if(!marketingConsent()) return;
    var conversionId = adsId(connectionConfig('google_ads').conversion_id);
    var adsLabel = mappingValue('google_ads',eventName);
    if(conversionId && adsLabel && connectionEnabled('google_ads')){
      ensureGoogleDestination(conversionId,'ads').then(function(){
        if(!marketingConsent() || !consentReceiptReady() || !globalEnabled() || !scopeAllowed() || browserMode() !== 'managed') return;
        try { window.gtag('event','conversion',Object.assign({},googleAdsParams,{send_to:conversionId + '/' + adsLabel,transaction_id:eventId})); } catch(e) {}
      });
    }
    sendDirectMetaEvent(eventName,eventId,details);
    if(connectionEnabled('tiktok')) ensureTikTok().then(function(){
      if(!marketingConsent() || !consentReceiptReady() || !globalEnabled() || !scopeAllowed() || browserMode() !== 'managed') return;
      try {
        var mapped = mappingValue('tiktok',eventName);
        if(eventName === 'page_view' && !mapped && window.ttq.page) window.ttq.page();
        else if(window.ttq.track) window.ttq.track(mapped || eventName,tiktokParams,{event_id:eventId});
      } catch(e) {}
    });
  }
  function sendBrowserEvent(eventName, eventId, properties){
    if(!globalEnabled() || !scopeAllowed()) return;
    activate();
    var mode = browserMode();
    if(mode === 'gtm' || mode === 'gtm_meta'){
      sendGtmEvent(eventName,eventId,properties);
      if(mode === 'gtm_meta') sendDirectMetaEvent(eventName,eventId,properties);
      return;
    }
    sendManagedEvent(eventName,eventId,properties);
  }
  function track(eventName, properties){
    eventName = cleanText(eventName,64).toLowerCase();
    if(!LOW_RISK_EVENTS[eventName] || !scopeAllowed() || !globalEnabled() || (!analyticsConsent() && !marketingConsent())) return Promise.resolve(null);
    var eventId = uuid();
    var cleanProps = safeProperties(eventName,Object.assign({},properties || {},campaignDetails()));
    if(!requiredDetailsPresent(eventName,cleanProps)) return Promise.resolve(null);
    var consent = consentSnapshot();
    var eventConsentSignature = consentSignature(consent);
    return postConsentReceipt(consent).then(function(){
      consent = consentSnapshot();
      if(consentSignature(consent) !== eventConsentSignature || !consentReceiptReady() || (!analyticsConsent() && !marketingConsent())) return null;
      sendBrowserEvent(eventName,eventId,cleanProps);
      var payload = {
        event_id:eventId,
        event_name:eventName,
        timestamp:new Date().toISOString(),
        path:sanitizePath(location.pathname),
        url:sanitizeUrl(location.href),
        referrer:document.referrer ? sanitizeUrl(document.referrer) : '',
        consent:{analytics:consent.analytics,marketing:consent.marketing,policy_version:consent.policy_version,consent_id:consent.consent_id || stableConsentId(),consent_receipt_id:consent.consent_receipt_id || ''},
        tracking_context:context(eventId),
        properties:cleanProps
      };
      return nativeFetch(API_ROOT + '/tracking/event',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true
      }).then(function(response){ return response.json().catch(function(){ return {}; }); }).catch(function(){ return null; });
    });
  }

  function routeEventKey(name){ return name === 'signup_started' ? 'signup_started|signup-flow' : name + '|' + sanitizePath(location.pathname); }
  function trackRouteEvents(){
    if(!state.config || !scopeAllowed() || !globalEnabled() || (!analyticsConsent() && !marketingConsent())) return;
    var root = routeRoot().toLowerCase();
    ['page_view'].concat(root === 'pricing' ? ['view_pricing'] : [], activeSignupFunnel() ? ['signup_started'] : []).forEach(function(name){
      var key = routeEventKey(name);
      if(state.routeDedupe[key]) return;
      state.routeDedupe[key] = true;
      track(name,{page_type:routePageType()});
    });
  }
  function trackSignupStarted(){
    if(!state.config || !scopeAllowed() || !globalEnabled() || (!analyticsConsent() && !marketingConsent())) return;
    var key = routeEventKey('signup_started');
    if(state.routeDedupe[key]) return;
    state.routeDedupe[key] = true;
    var selection = planSelectionSnapshot();
    track('signup_started',{page_type:'signup',plan_id:selection.plan_id,interval:selection.interval,placement:'signup'});
  }
  function installViewTrackingHook(){
    var current = window.switchView;
    if(typeof current !== 'function' || current.__obPlatformTrackingWrapped) return;
    window.switchView = function(n){
      var result = current.apply(this,arguments);
      setTimeout(function(){
        activate();
        if(Number(n) === 2) trackSignupStarted();
        else trackRouteEvents();
      },0);
      return result;
    };
    window.switchView.__obPlatformTrackingWrapped = true;
  }
  function primaryCtaKey(node){
    var id = cleanText(node.id || node.getAttribute('data-ob-primary-cta') || '',60);
    if(id) return id;
    var href = node.getAttribute('href') || '';
    if(href){ try { return cleanText(new URL(href,location.origin).pathname,60) || 'primary'; } catch(e) {} }
    return 'primary';
  }
  function primaryCtaPlacement(node){
    var explicit = node.getAttribute('data-ob-cta-placement') || '';
    if(!explicit && node.closest){
      var owner = node.closest('[data-ob-tracking-placement]');
      if(owner) explicit = owner.getAttribute('data-ob-tracking-placement') || '';
    }
    return safeDetailValue('placement',explicit || routeRoot().toLowerCase() || 'home') || '';
  }
  function primaryCtaDestination(node){
    var explicit = node.getAttribute('data-ob-cta-destination') || '';
    if(explicit) return safeDetailValue('destination',explicit) || '';
    var href = node.getAttribute('href') || '';
    if(!href) return '';
    try {
      var root = String(new URL(href,location.origin).pathname || '/').replace(/^\/+|\/+$/g,'').split('/')[0] || 'home';
      return safeDetailValue('destination',root) || '';
    } catch(e) { return ''; }
  }
  function planSelectionSnapshot(){
    var selected = window.obSignupPlanState || {};
    return {
      plan_id:safeDetailValue('plan_id',selected.selected || window._obSignupSelectedPlan || ''),
      interval:safeDetailValue('interval',selected.interval || '')
    };
  }
  function planSelectionSurface(node){
    var explicit = node && (node.getAttribute('data-ob-selection-surface') || node.getAttribute('data-ob-plan-surface'));
    return safeDetailValue('selection_surface',explicit || 'signup') || 'signup';
  }
  function emitPlanSelectionChange(before,after,surface){
    before = before || {};
    after = after || {};
    var properties = safeProperties('plan_selected',{
      plan_id:after.plan_id,
      interval:after.interval,
      selection_surface:surface,
      previous_plan_id:before.plan_id,
      previous_interval:before.interval,
      placement:surface,
      page_type:routePageType()
    });
    if(!requiredDetailsPresent('plan_selected',properties)) return Promise.resolve(null);
    if(before.plan_id === properties.plan_id && before.interval === properties.interval) return Promise.resolve(null);
    var fingerprint = [properties.plan_id,properties.interval,properties.selection_surface,properties.previous_plan_id || ''].join('|');
    if(state.lastPlanSelectionFingerprint === fingerprint) return Promise.resolve(null);
    state.lastPlanSelectionFingerprint = fingerprint;
    return track('plan_selected',properties);
  }
  function queuePlanSelectionChange(node,kind){
    var before = planSelectionSnapshot();
    var requestedPlan = kind === 'plan' ? safeDetailValue('plan_id',node.getAttribute('data-ob-signup-plan')) : before.plan_id;
    var requestedInterval = kind === 'interval' ? safeDetailValue('interval',node.getAttribute('data-ob-plan-interval')) : before.interval;
    var surface = planSelectionSurface(node);
    setTimeout(function(){
      var after = planSelectionSnapshot();
      if(!after.plan_id) after.plan_id = requestedPlan;
      if(!after.interval) after.interval = requestedInterval;
      emitPlanSelectionChange(before,after,surface);
    },0);
  }
  document.addEventListener('click',function(event){
    if(!scopeAllowed()) return;
    var plan = event.target && event.target.closest ? event.target.closest('[data-ob-signup-plan]') : null;
    if(plan){
      queuePlanSelectionChange(plan,'plan');
      return;
    }
    var interval = event.target && event.target.closest ? event.target.closest('[data-ob-plan-interval]') : null;
    if(interval){
      queuePlanSelectionChange(interval,'interval');
      return;
    }
    var cta = event.target && event.target.closest ? event.target.closest('[data-ob-primary-cta],a.btn-primary,button.btn-primary') : null;
    if(cta && !cta.closest('#privacy-consent')) track('primary_cta_clicked',{
      cta_id:primaryCtaKey(cta),
      placement:primaryCtaPlacement(cta),
      destination:primaryCtaDestination(cta),
      page_type:routePageType()
    });
  },true);
  ['pushState','replaceState'].forEach(function(method){
    var original = history[method];
    if(!original || original.__obPlatformTrackingWrapped) return;
    history[method] = function(){
      var result = original.apply(this,arguments);
      setTimeout(function(){ activate(); trackRouteEvents(); },0);
      return result;
    };
    history[method].__obPlatformTrackingWrapped = true;
  });
  window.addEventListener('popstate',function(){ setTimeout(function(){ activate(); trackRouteEvents(); },0); });

  function loadPublicConfig(){
    if(state.configPromise) return state.configPromise;
    if(!platformHost()) return Promise.resolve(null);
    state.configPromise = nativeFetch(API_ROOT + '/tracking/config',{cache:'no-store'}).then(function(response){
      return response.json().catch(function(){ return {}; }).then(function(data){
        if(!response.ok) throw new Error(data.error || 'Tracking configuration failed');
        state.config = data.tracking || data.data || data;
        if(!enforcePolicyVersion()){
          if(consentChosen()) consentChanged(consentSnapshot());
          else { activate(); trackRouteEvents(); }
        }
        return state.config;
      });
    }).catch(function(){ state.config = {enabled:false,environment:'staging',browser_mode:'managed',connections:{}}; return state.config; });
    return state.configPromise;
  }

  function targetedTrackingRequest(input, init){
    if(!platformHost() || (!analyticsConsent() && !marketingConsent()) || typeof input !== 'string' || !init || String(init.method || 'GET').toUpperCase() !== 'POST' || typeof init.body !== 'string') return null;
    var url;
    try { url = new URL(input,location.href); } catch(e) { return null; }
    var path = url.pathname;
    if(path !== '/api/auth/signup' && path !== '/api/billing/checkout' && path !== '/api/marketing/waitlist') return null;
    var body;
    try { body = JSON.parse(init.body || '{}'); } catch(e) { return null; }
    if(path === '/api/auth/signup' && String(body.role || '').toLowerCase() !== 'expert') return null;
    if(path === '/api/billing/checkout' && ['signup','plan'].indexOf(String(body.source || '').toLowerCase()) < 0) return null;
    if(path === '/api/marketing/waitlist' && !scopeAllowed()) return null;
    return {url:input,init:init,body:body};
  }
  if(window.fetch && !window.fetch.__obPlatformTrackingContext){
    window.fetch = function(input,init){
      var target = targetedTrackingRequest(input,init);
      if(!target) return nativeFetch(input,init);
      return postConsentReceipt(consentSnapshot()).then(function(){
        var ctx = context();
        if(!ctx.consent_receipt_id || (!analyticsConsent() && !marketingConsent())) return nativeFetch(input,init);
        var nextInit = Object.assign({},init,{headers:Object.assign({},init.headers || {}),body:JSON.stringify(Object.assign({},target.body,{tracking_context:ctx}))});
        return nativeFetch(input,nextInit);
      });
    };
    window.fetch.__obPlatformTrackingContext = true;
  }

  window.OBPlatformTracking = {
    context:context,
    track:track,
    sanitizeUrl:sanitizeUrl,
    sanitizePath:sanitizePath,
    scopeAllowed:scopeAllowed,
    consentChanged:consentChanged,
    updateGoogleConsent:updateGoogleConsent,
    setLegacyGa4:setLegacyGa4,
    policyVersion:policyVersion,
    schemaVersion:schemaVersion,
    loadConfig:loadPublicConfig,
    _eventDetailFields:eventDetailFields,
    _safeProperties:safeProperties,
    _browserEventObject:browserEventObject,
    _eventSafeDetails:eventSafeDetails,
    _filteredAdminEvents:filteredAdminEvents,
    _eventDetailRowsHtml:eventDetailRowsHtml,
    _detailChipsHtml:detailChipsHtml,
    _catalogDetailFields:catalogDetailFields,
    _eventCatalog:eventCatalog,
    _recentEventsTable:recentEventsTable,
    _providerDetailCapability:providerDetailCapability,
    _googleMappingChannels:googleMappingChannels,
    _mappingCell:mappingCell,
    _mappingMatrix:mappingMatrix,
    _eventProviderState:eventProviderState,
    _eventProviderTile:eventProviderTile,
    _providerCard:providerCard,
    _adminEnvironmentCopy:adminEnvironmentCopy,
    _validateConnection:validateConnection,
    _deliveryHealthTotals:deliveryHealthTotals,
    _state:state
  };

  captureLandingAttribution();
  enforcePolicyVersion();
  loadPublicConfig();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',function(){ installViewTrackingHook(); activate(); trackRouteEvents(); });
  else { installViewTrackingHook(); activate(); trackRouteEvents(); }
  [350,1200,2600].forEach(function(delay){ setTimeout(function(){ installViewTrackingHook(); activate(); trackRouteEvents(); },delay); });

  var ADMIN_PROVIDERS = {
    meta:{
      label:'Meta Ads',
      summary:'Meta Pixel for consented browser events plus Conversions API credentials for server events. The direct Meta path runs in Managed and GTM + Ownlybiz Meta modes.',
      fields:[
        {key:'pixel_id',label:'Pixel ID',placeholder:'123456789012345'},
        {key:'access_token',label:'Conversions API access token',secret:true,placeholder:'Server-side token'},
        {key:'test_event_code',label:'Test event code',secret:true,placeholder:'Optional provider test event code'}
      ],
      mappingMode:'simple'
    },
    google_ads:{
      label:'Google Ads',
      summary:'Google tag browser conversions plus Data Manager server conversions. Event destinations stay separate from optional plan/interval custom-variable tags.',
      fields:[
        {key:'conversion_id',label:'Browser conversion ID',placeholder:'AW-123456789'},
        {key:'plan_custom_variable_tag',label:'Plan custom-variable tag',placeholder:'plan_id'},
        {key:'interval_custom_variable_tag',label:'Interval custom-variable tag',placeholder:'billing_interval'},
        {key:'customer_id',label:'Google Ads customer ID',placeholder:'123-456-7890'},
        {key:'login_customer_id',label:'Manager login customer ID',placeholder:'Optional manager account'},
        {key:'quota_project_id',label:'Google Cloud quota project',placeholder:'x-goog-user-project value'},
        {key:'access_token',label:'Short-lived OAuth access token',secret:true,placeholder:'Expires quickly'},
        {key:'refresh_token',label:'OAuth refresh token',secret:true,advanced:true,placeholder:'Long-term refresh token'},
        {key:'oauth_client_id',label:'OAuth client ID',secret:true,advanced:true,placeholder:'Saved securely'},
        {key:'oauth_client_secret',label:'OAuth client secret',secret:true,advanced:true,placeholder:'Saved securely'}
      ],
      mappingMode:'google'
    },
    ga4:{
      label:'Google Analytics 4',
      summary:'GA4 browser measurement plus Measurement Protocol credentials for authoritative server events.',
      fields:[
        {key:'measurement_id',label:'Measurement ID',placeholder:'G-XXXXXXXXXX'},
        {key:'api_secret',label:'Measurement Protocol API secret',secret:true,placeholder:'Server-side API secret'}
      ]
    },
    gtm:{
      label:'Google Tag Manager',
      summary:'Advanced browser delivery. GTM-only mode loads only this container; GTM + Ownlybiz Meta also preserves Ownlybiz direct Meta Pixel delivery.',
      fields:[{key:'container_id',label:'Container ID',placeholder:'GTM-XXXXXXX'}]
    },
    tiktok:{
      label:'TikTok Ads',
      summary:'TikTok Pixel for consented browser activity plus Events API credentials for server delivery.',
      fields:[
        {key:'pixel_code',label:'Pixel code',placeholder:'TikTok pixel code'},
        {key:'access_token',label:'Events API access token',secret:true,placeholder:'Server-side token'},
        {key:'test_event_code',label:'Test event code',secret:true,placeholder:'Optional provider test event code'}
      ],
      mappingMode:'simple'
    },
    linkedin:{
      label:'LinkedIn Ads',
      summary:'The consented Insight Tag establishes browser attribution only. Canonical conversions use one authoritative server-side CAPI delivery path.',
      fields:[
        {key:'partner_id',label:'Insight Tag Partner ID',placeholder:'Public numeric partner ID'},
        {key:'conversion_account',label:'Server conversion account',placeholder:'Server-side account identifier'},
        {key:'access_token',label:'Conversions API access token',secret:true,placeholder:'Server-side token'}
      ],
      mappingMode:'linkedin'
    },
    custom_webhook:{
      label:'Custom Webhook',
      summary:'Server-only canonical event delivery for an endpoint you control. It never injects browser scripts.',
      fields:[
        {key:'endpoint_url',label:'HTTPS endpoint URL',placeholder:'https://events.example.com/ownlybiz'},
        {key:'signing_secret',label:'Signing secret',secret:true,placeholder:'HMAC signing secret'}
      ]
    }
  };

  function adminApi(path,opts){
    opts = opts || {};
    var headers = Object.assign({'Content-Type':'application/json'},opts.headers || {});
    var authToken = token();
    if(authToken) headers.Authorization = 'Bearer ' + authToken;
    return nativeFetch(API_ROOT + path,Object.assign({},opts,{headers:headers,cache:'no-store',body:opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body})).then(function(response){
      return response.json().catch(function(){ return {}; }).then(function(data){
        if(!response.ok || data.success === false) throw new Error(data.error || 'Tracking request failed');
        return data;
      });
    });
  }
  function adminOverview(){ return state.adminOverview || {}; }
  function adminConnectionMap(){
    var overview = adminOverview();
    var raw = overview.connections || overview.providers || {};
    if(Array.isArray(raw)){
      var mapped = {};
      raw.forEach(function(item){ if(item && item.provider) mapped[item.provider] = item; });
      return mapped;
    }
    return raw || {};
  }
  function adminConnection(provider){ return adminConnectionMap()[provider] || {}; }
  function adminConnectionConfig(provider){
    var item = adminConnection(provider);
    return item.config || item.settings || item.public_config || {};
  }
  function adminConnectionMappings(provider){
    var item = adminConnection(provider);
    return item.mappings || item.event_mappings || adminConnectionConfig(provider).mappings || {};
  }
  function eventCatalog(){
    var raw = adminOverview().event_catalog || EVENT_FALLBACK;
    if(Array.isArray(raw) && raw.length) return raw.map(function(item){
      if(typeof item === 'string') return {name:item,label:item.replace(/_/g,' '),source:LOW_RISK_EVENTS[item] ? 'browser' : 'server'};
      return Object.assign({},item,{name:item.name || item.event_name || item.key || ''});
    }).filter(function(item){ return item.name && PLATFORM_EVENT_NAMES[item.name]; });
    if(raw && typeof raw === 'object') return Object.keys(raw).map(function(key){
      var item = raw[key];
      return typeof item === 'object' ? Object.assign({},item,{name:item.name || item.event_name || key}) : {name:key,label:String(item || key)};
    }).filter(function(item){ return item.name && PLATFORM_EVENT_NAMES[item.name]; });
    return EVENT_FALLBACK.slice();
  }
  function catalogDetailFields(event){
    var name = event && (event.name || event.event_name) || '';
    var fallback = eventDetailFields(name);
    var allowed = {};
    fallback.forEach(function(field){ allowed[field.key] = field; });
    if(!event || !Array.isArray(event.detail_fields) || !event.detail_fields.length) return fallback;
    return event.detail_fields.map(function(field){
      if(typeof field === 'string') field = {key:field};
      var base = allowed[field && field.key];
      if(!base) return null;
      return Object.assign({},base,{
        label:cleanText(field.label || base.label,80),
        required:field.required === true,
        operational:field.reporting === 'operational' || field.filterable === false || base.operational === true
      });
    }).filter(Boolean);
  }
  function detailChipsHtml(event){
    var fields = catalogDetailFields(event).filter(function(field){ return !field.operational; });
    if(!fields.length) return '<span class="ob-tracking-muted">Event occurrence only</span>';
    return '<div class="ob-detail-chips" aria-label="What you will know">' + fields.map(function(field){
      return '<span class="ob-detail-chip" title="Canonical key: ' + esc(field.key) + '">' + esc(field.label) + (field.required ? ' <b>required</b>' : '') + '</span>';
    }).join('') + '</div>';
  }
  function settingValue(key,fallback){
    var settings = adminOverview().settings || {};
    return settings[key] !== undefined ? settings[key] : fallback;
  }
  function adminEnvironmentCopy(){
    var environment = cleanText(adminOverview().environment || settingValue('environment','staging'),40).toLowerCase() || 'staging';
    var production = ['production','production-safe','production_safe','prod','live'].indexOf(environment) >= 0;
    if(production){
      return {
        environment:environment,
        production:true,
        bannerTitle:'Production tracking uses real customer data',
        bannerBody:'This workspace can send real customer activity to live advertising and analytics destinations. Confirm consent, account IDs, credentials, event mappings, and test behavior before enabling or saving any connection.',
        testEventPlaceholder:'Optional test event code - may appear in live measurement tools'
      };
    }
    return {
      environment:environment,
      production:false,
      bannerTitle:'Staging/test credentials only',
      bannerBody:'This workspace is isolated from production. Use test pixels, properties, OAuth credentials, conversion actions, and webhook endpoints. Nothing here should point to a live advertising destination.',
      testEventPlaceholder:'Optional staging test event code'
    };
  }
  function formatTime(value){
    if(!value) return 'Never';
    var date = typeof value === 'number' ? new Date(value > 100000000000 ? value : value * 1000) : new Date(value);
    return isNaN(date.getTime()) ? cleanText(value,80) : date.toLocaleString();
  }
  function connectionStatus(provider){
    var item = adminConnection(provider);
    var status = cleanText(item.status || (item.enabled ? 'connected' : 'disconnected'),30).toLowerCase();
    return status || 'disconnected';
  }
  function statusClass(status){
    status = String(status || '').toLowerCase();
    if(['connected','ready','success','active','configured'].indexOf(status) >= 0) return 'ok';
    if(['failed','error','revoked'].indexOf(status) >= 0) return 'bad';
    return '';
  }
  function secretSaved(item,key){
    var flags = item.secret_status || item.secrets || item.secret_fields || {};
    return bool(item['has_' + key],false) || bool(item[key + '_configured'],false) || !!flags[key];
  }
  function fieldHtml(provider,field,item){
    var config = adminConnectionConfig(provider);
    var value = field.secret ? '' : cleanText(config[field.key],500);
    var saved = field.secret && secretSaved(item,field.key);
    var placeholder = field.key === 'test_event_code' ? adminEnvironmentCopy().testEventPlaceholder : field.placeholder || '';
    return '<div class="ob-provider-field' + (field.full ? ' full' : '') + '">' +
      '<label for="ob-provider-' + esc(provider) + '-' + esc(field.key) + '">' + esc(field.label) + '</label>' +
      '<input class="ob-tracking-input" id="ob-provider-' + esc(provider) + '-' + esc(field.key) + '" data-provider-field="' + esc(field.key) + '" data-secret="' + (field.secret ? '1' : '0') + '" type="' + (field.secret ? 'password' : 'text') + '" value="' + esc(value) + '" placeholder="' + esc(saved ? 'Saved securely - leave blank to keep' : placeholder) + '" autocomplete="' + (field.secret ? 'new-password' : 'off') + '">' +
      (field.secret ? '<div class="ob-secret-note">' + (saved ? 'A server-side value is saved. It is never returned to this page.' : 'Stored encrypted server-side and never echoed after save.') + '</div>' : '') +
    '</div>';
  }
  function mappingEntry(provider,eventName){
    var value = adminConnectionMappings(provider)[eventName];
    if(value && typeof value === 'object') return value;
    if(provider === 'google_ads') return /^\d+$/.test(String(value || '')) ? {conversion_action_id:String(value)} : {label:String(value || '')};
    return {conversion_action_id:String(value || ''),label:String(value || '')};
  }
  function mappingEditor(provider,mode){
    var catalog = eventCatalog();
    if(mode === 'google'){
      return '<details class="ob-provider-field full"><summary class="ob-tracking-muted" style="cursor:pointer;font-weight:850;">Event mapping: server action ID and browser label</summary>' +
        '<div class="ob-tracking-table-wrap" style="margin-top:10px;"><table class="ob-tracking-table" style="min-width:620px;"><thead><tr><th>Ownlybiz event</th><th>Server conversion_action_id</th><th>Browser label</th></tr></thead><tbody>' + catalog.map(function(event){
          var entry = mappingEntry(provider,event.name);
          return '<tr data-google-map-event="' + esc(event.name) + '"><td><strong>' + esc(event.name) + '</strong><div class="ob-tracking-muted">' + esc(event.label || '') + '</div></td>' +
            '<td><input class="ob-tracking-input" data-map-server value="' + esc(entry.conversion_action_id || '') + '" placeholder="Numeric Data Manager action ID"></td>' +
            '<td><input class="ob-tracking-input" data-map-label value="' + esc(entry.label || entry.browser_label || '') + '" placeholder="Google tag conversion label"></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="ob-secret-note">Server action IDs are numeric Data Manager destinations. Browser labels are separate and become AW-ID/LABEL in Google tag calls.</div></details>';
    }
    if(mode === 'linkedin'){
      return '<details class="ob-provider-field full"><summary class="ob-tracking-muted" style="cursor:pointer;font-weight:850;">Server-side LinkedIn conversion mapping</summary>' +
        '<div class="ob-tracking-table-wrap" style="margin-top:10px;"><table class="ob-tracking-table" style="min-width:500px;"><thead><tr><th>Ownlybiz event</th><th>Conversion rule ID</th></tr></thead><tbody>' + catalog.map(function(event){
          var entry = mappingEntry(provider,event.name);
          return '<tr data-linkedin-map-event="' + esc(event.name) + '"><td><strong>' + esc(event.name) + '</strong></td><td><input class="ob-tracking-input" data-map-server value="' + esc(entry.conversion_action_id || entry.label || '') + '" placeholder="Server CAPI conversion rule ID"></td></tr>';
        }).join('') + '</tbody></table></div><div class="ob-secret-note">This rule is used only by the server-side Conversions API delivery. The browser Insight Tag does not fire canonical conversions.</div></details>';
    }
    if(mode === 'simple'){
      var lines = Object.keys(adminConnectionMappings(provider)).map(function(key){
        var value = adminConnectionMappings(provider)[key];
        if(value && typeof value === 'object') value = value.label || value.event_name || '';
        return value ? key + '=' + value : '';
      }).filter(Boolean).join('\n');
      return '<details class="ob-provider-field full"><summary class="ob-tracking-muted" style="cursor:pointer;font-weight:850;">Optional provider event names</summary><textarea class="ob-tracking-textarea" data-simple-mappings placeholder="page_view=PageView&#10;signup_completed=CompleteRegistration">' + esc(lines) + '</textarea><div class="ob-secret-note">One mapping per line: ownlybiz_event=provider_event. Built-in provider standards are used when present; otherwise low-risk events use safe canonical/custom names.</div></details>';
    }
    return '';
  }
  function providerTestLabel(provider){
    if(provider === 'ga4') return 'Validate GA4 debug';
    if(provider === 'google_ads') return 'Validate only';
    if(provider === 'gtm') return 'Validate container';
    if(provider === 'meta' || provider === 'tiktok') return 'Send test-code event';
    if(provider === 'linkedin') return 'Validate locally - no send';
    return 'Send webhook test';
  }
  function providerTestWarning(provider){
    if(provider === 'ga4') return 'Run GA4 debug validation? This is intended as a non-reporting validation.';
    if(provider === 'google_ads') return 'Run Google Ads validateOnly? This validates the payload without reporting a conversion.';
    if(provider === 'gtm') return 'Validate the GTM container ID and local dataLayer contract? No conversion will be sent.';
    if(provider === 'meta' || provider === 'tiktok') return 'This sends a provider test-code event. It can still appear in that provider\'s measurement tools. Continue?';
    if(provider === 'linkedin') return 'Validate the LinkedIn account, token, and conversion mapping locally? No conversion will be sent.';
    return 'This sends a real signed request to the configured webhook endpoint. Continue?';
  }
  function providerTestResultMessage(provider,test,data){
    if(provider === 'linkedin' && test.local_validation_only === true){
      return 'LinkedIn configuration validated locally. No conversion was sent.';
    }
    if(test.delivered === false && test.warning) return cleanText(test.warning,180);
    return cleanText(test.message || test.warning || data.message || (ADMIN_PROVIDERS[provider].label + ' validation completed.'),180);
  }
  function providerCard(provider){
    var meta = ADMIN_PROVIDERS[provider];
    var item = adminConnection(provider);
    var status = connectionStatus(provider);
    var basic = meta.fields.filter(function(field){ return !field.advanced; }).map(function(field){ return fieldHtml(provider,field,item); }).join('');
    var advancedFields = meta.fields.filter(function(field){ return field.advanced; });
    var advanced = advancedFields.length ? '<details class="ob-provider-field full"><summary class="ob-tracking-muted" style="cursor:pointer;font-weight:850;">Advanced: long-term OAuth connection</summary><div class="ob-provider-fields" style="margin-top:10px;">' + advancedFields.map(function(field){ return fieldHtml(provider,field,item); }).join('') + '</div><div class="ob-secret-note">An access token alone expires quickly. Refresh credentials keep the server connection healthy without exposing secrets to the browser.</div></details>' : '';
    var setupNote = '';
    if(provider === 'ga4'){
      var definitionStatus = cleanText(item.custom_definitions_status || adminConnectionConfig(provider).custom_definitions_status || 'not_verified',40).toLowerCase();
      var verified = ['configured','verified','ready'].indexOf(definitionStatus) >= 0;
      setupNote = '<div class="ob-provider-capability ' + (verified ? 'ok' : '') + '"><strong>GA4 custom-definition setup: ' + (verified ? 'reported configured' : 'not verified') + '</strong><span>Ownlybiz sends the locked event parameters shown below. To use parameters such as Plan or Billing interval in standard GA4 reports, register the matching event-scoped custom definitions in GA4 Admin. Ownlybiz cannot inspect that GA4 account setting with the current connection.</span></div>';
    } else if(provider === 'gtm'){
      setupNote = '<div class="ob-provider-capability"><strong>GTM detail contract</strong><span>Browser details are pushed as flat canonical keys and retained under <code>properties</code> for compatibility. Server-authoritative events do not pass through the browser container.</span></div>';
    } else if(provider === 'linkedin'){
      setupNote = '<div class="ob-provider-capability"><strong>Server-only canonical conversions</strong><span>The consented Insight Tag loads only to establish LinkedIn browser attribution. The mapped conversion rule and canonical event are delivered once through server-side CAPI; no browser <code>lintrk track</code> conversion is fired.</span></div>';
    } else if(provider === 'custom_webhook'){
      setupNote = '<div class="ob-provider-capability"><strong>Server-only details</strong><span>The signed webhook receives the backend-approved canonical detail fields. It never injects a browser tag.</span></div>';
    } else if(provider === 'google_ads'){
      var googleConfig = adminConnectionConfig(provider);
      var planTag = cleanText(googleConfig.plan_custom_variable_tag,64);
      var intervalTag = cleanText(googleConfig.interval_custom_variable_tag,64);
      var tagCount = (validGoogleCustomVariableTag(planTag) ? 1 : 0) + (validGoogleCustomVariableTag(intervalTag) ? 1 : 0);
      setupNote = '<div class="ob-provider-capability"><strong>Google Ads custom-variable tags: ' + tagCount + '/2 configured</strong><span>Plan and interval are added to both browser and server conversion payloads under these tag names. A saved tag means Payload mapped only; Ownlybiz does not verify Google Ads account acceptance or reporting setup.</span></div>';
    } else if(provider === 'meta' || provider === 'tiktok'){
      setupNote = '<div class="ob-provider-capability"><strong>Mapped fields only</strong><span>Ownlybiz sends provider-supported standard event/custom-data fields. The catalog marks other canonical details as not supported instead of promising provider reporting.</span></div>';
    }
    return '<article class="ob-provider-card" data-provider="' + esc(provider) + '">' +
      '<div class="ob-provider-head"><div><h3>' + esc(meta.label) + '</h3><p class="ob-tracking-muted">' + esc(meta.summary) + '</p></div><span class="ob-provider-status ' + statusClass(status) + '">' + esc(status) + '</span></div>' +
      '<label class="ob-tracking-check"><input type="checkbox" data-provider-enabled ' + (bool(item.enabled,['connected','ready','active','configured'].indexOf(status) >= 0) ? 'checked' : '') + '> Enabled for this workspace connection</label>' +
      setupNote +
      '<div class="ob-provider-fields">' + basic + advanced + mappingEditor(provider,meta.mappingMode) + '</div>' +
      '<div class="ob-provider-meta"><span>Last success: ' + esc(formatTime(item.last_success_at || item.last_success)) + '</span>' +
        ((item.last_error_message || item.last_error) ? '<span class="ob-provider-error">Last error: ' + esc(cleanText(item.last_error_message || item.last_error,240)) + '</span>' : '<span>No current delivery error.</span>') + '</div>' +
      '<div class="ob-provider-actions"><button class="ob-tracking-btn primary" type="button" onclick="obSaveTrackingConnection(\'' + esc(provider) + '\')">Save connection</button>' +
        '<button class="ob-tracking-btn" type="button" onclick="obTestTrackingConnection(\'' + esc(provider) + '\')">' + esc(providerTestLabel(provider)) + '</button>' +
        '<button class="ob-tracking-btn danger" type="button" onclick="obDisconnectTrackingConnection(\'' + esc(provider) + '\')">Disconnect</button></div>' +
    '</article>';
  }
  function mappingCell(provider,eventName){
    var item = adminConnection(provider);
    if(!bool(item.enabled,connectionStatus(provider) === 'connected' || connectionStatus(provider) === 'ready')) return '<span class="ob-tracking-muted">Off</span>';
    if(provider === 'ga4'){
      var gaEntry = mappingEntry(provider,eventName);
      return '<span>' + esc(gaEntry.label || gaEntry.browser_label || eventName) + '</span>';
    }
    if(provider === 'gtm') return '<span>dataLayer</span>';
    if(provider === 'custom_webhook') return '<span>Canonical JSON</span>';
    var entry = mappingEntry(provider,eventName);
    if(provider === 'google_ads'){
      var pieces = [];
      if(entry.conversion_action_id) pieces.push('Server ' + entry.conversion_action_id);
      if(entry.label || entry.browser_label) pieces.push('Browser ' + (entry.label || entry.browser_label));
      return pieces.length ? esc(pieces.join(' / ')) : '<span class="ob-tracking-muted">Not mapped</span>';
    }
    if(provider === 'linkedin'){
      var linkedinRule = entry.conversion_action_id || entry.label || entry.browser_label || '';
      return linkedinRule ? '<span>Server rule ' + esc(linkedinRule) + '</span>' : '<span class="ob-tracking-muted">Not mapped</span>';
    }
    var value = entry.conversion_action_id || entry.label || entry.browser_label || '';
    return value ? esc(value) : '<span class="ob-tracking-muted">Canonical/custom</span>';
  }
  function providerCapability(provider,event){
    var eventName = event.name || event.event_name || '';
    var source = cleanText(event.source || (LOW_RISK_EVENTS[eventName] ? 'browser' : 'server'),20).toLowerCase();
    var connected = connectionStatus(provider);
    var on = bool(adminConnection(provider).enabled,['connected','ready','active','configured'].indexOf(connected) >= 0);
    var setup = on ? 'Connected' : 'Connection off';
    if(provider === 'gtm') return setup + (source === 'browser' ? ' · flat and nested dataLayer details' : ' · browser only; server event not sent');
    if(provider === 'linkedin') return setup + ' · canonical conversion via server-side CAPI; browser tag is attribution only';
    if(provider === 'custom_webhook') return setup + (source === 'server' ? ' · canonical safe JSON' : ' · server delivery only');
    if(provider === 'ga4') return setup + ' · event parameters; GA4 custom definitions are not auto-verified';
    if(provider === 'google_ads') return setup + ' · mapped conversion; reporting fields depend on destination support';
    if(provider === 'meta' || provider === 'tiktok') return setup + ' · supported event and custom-data fields only';
    return setup;
  }
  function googleMappingChannels(event,mapping){
    mapping = mapping || {};
    var eventName = event && (event.name || event.event_name) || '';
    var source = cleanText(event && event.source || (LOW_RISK_EVENTS[eventName] ? 'browser' : 'server'),20).toLowerCase();
    var browser = source === 'browser' && !!cleanText(mapping.label || mapping.browser_label,120);
    var server = /^\d+$/.test(cleanText(mapping.conversion_action_id,80));
    var note = browser && server ? 'browser tag and server CAPI mapped'
      : browser ? 'browser tag mapped; server CAPI action not mapped'
      : server ? 'server CAPI mapped' + (source === 'browser' ? '; browser label not mapped' : '')
      : source === 'browser' ? 'map a browser label and/or server conversion action' : 'map a numeric server conversion action';
    return {source:source,browser:browser,server:server,ready:source === 'browser' ? (browser || server) : server,note:note};
  }
  function providerDetailCapability(provider,event,field){
    if(!field || field.operational) return null;
    var eventName = event.name || event.event_name || '';
    var source = cleanText(event.source || (LOW_RISK_EVENTS[eventName] ? 'browser' : 'server'),20).toLowerCase();
    var status = connectionStatus(provider);
    var on = bool(adminConnection(provider).enabled,['connected','ready','active','configured'].indexOf(status) >= 0);
    var mapping = mappingEntry(provider,eventName);
    var hasMapping = provider === 'google_ads' ? !!(mapping.conversion_action_id || mapping.label || mapping.browser_label)
      : provider === 'linkedin' ? !!(mapping.conversion_action_id || mapping.label)
      : true;
    var serverCapability = event && event.provider_capabilities && event.provider_capabilities[provider];
    var serverFields = serverCapability && Array.isArray(serverCapability.detail_fields) ? serverCapability.detail_fields : null;
    var setupFields = serverCapability && serverCapability.requires_setup && Array.isArray(serverCapability.requires_setup.fields) ? serverCapability.requires_setup.fields : [];
    function payloadMapped(note){ return {state:'mapped',label:'Payload mapped',note:note}; }
    function supported(note){ return {state:'supported',label:'Supported',note:note}; }
    function setup(note){ return {state:'setup',label:'Setup required',note:note}; }
    function unsupported(note){ return {state:'unsupported',label:'Not supported',note:note}; }
    if(serverFields && serverFields.indexOf(field.key) < 0 && !(provider === 'google_ads' && ['plan_id','interval'].indexOf(field.key) >= 0)){
      if(setupFields.indexOf(field.key) >= 0) return setup(serverCapability.requires_setup.message || 'provider account setup required');
      return unsupported(serverCapability.limitation || 'not in this connector payload');
    }
    if(provider === 'gtm'){
      if(source !== 'browser') return unsupported('browser container only');
      return on ? supported('flat canonical key; map it in the container') : setup('enable the GTM connection');
    }
    if(provider === 'custom_webhook') return on ? supported('signed canonical detail') : setup('enable the webhook connection');
    if(provider === 'ga4') return on ? {state:'setup',label:'Collected',note:'GA4 custom definition required for standard reports'} : setup('connect GA4, then create its custom definition');
    if(provider === 'google_ads'){
      var googleChannels = googleMappingChannels(event,mapping);
      if(['value','currency'].indexOf(field.key) >= 0) return on && googleChannels.ready ? payloadMapped('standard conversion field; ' + googleChannels.note) : setup(googleChannels.note);
      if(field.key === 'plan_id' || field.key === 'interval'){
        var tagKey = field.key === 'plan_id' ? 'plan_custom_variable_tag' : 'interval_custom_variable_tag';
        var customTag = cleanText(adminConnectionConfig(provider)[tagKey],64);
        if(!validGoogleCustomVariableTag(customTag)) return setup('configure a safe Data Manager custom-variable tag');
        return on && googleChannels.ready ? payloadMapped('custom-variable tag ' + customTag + '; ' + googleChannels.note + '; Google account acceptance not verified') : setup('tag saved; ' + googleChannels.note);
      }
      return setup('destination-specific custom variable or conversion setup');
    }
    if(provider === 'linkedin'){
      if(['value','currency'].indexOf(field.key) >= 0) return on && hasMapping ? payloadMapped('server-side CAPI conversion field') : setup('map the server CAPI conversion rule');
      return unsupported('server CAPI conversion does not expose this detail');
    }
    if(provider === 'meta' || provider === 'tiktok'){
      if(['plan_id','interval','value','currency'].indexOf(field.key) >= 0) return on ? payloadMapped(field.key === 'interval' && provider === 'tiktok' ? 'payload only; reporting requires provider verification' : 'mapped standard event/custom-data field') : setup('enable the provider connection');
      return unsupported('Ownlybiz sends standard mapped fields only');
    }
    return unsupported('no documented detail mapping');
  }
  function providerDetailStatusHtml(provider,event){
    var fields = catalogDetailFields(event).filter(function(field){ return !field.operational; });
    if(!fields.length) return '';
    return '<div class="ob-provider-detail-status">' + fields.map(function(field){
      var capability = providerDetailCapability(provider,event,field);
      if(!capability) return '';
      return '<span class="' + esc(capability.state) + '"><b>' + esc(field.label) + ':</b> ' + esc(capability.label) + '<small>' + esc(capability.note || '') + '</small></span>';
    }).join('') + '</div>';
  }
  function eventSource(event){
    var eventName = event && (event.name || event.event_name) || '';
    return cleanText(event && event.source || (LOW_RISK_EVENTS[eventName] ? 'browser' : 'server'),20).toLowerCase() === 'browser' ? 'browser' : 'server';
  }
  function eventStage(event){
    return cleanText(event && event.stage || 'Other',40) || 'Other';
  }
  function eventProviderState(provider,event){
    var eventName = event && (event.name || event.event_name) || '';
    var source = eventSource(event);
    var status = connectionStatus(provider);
    var on = bool(adminConnection(provider).enabled,['connected','ready','active','configured'].indexOf(status) >= 0);
    if(!on) return {state:'off',label:'Off'};
    if(provider === 'gtm' && source !== 'browser') return {state:'unavailable',label:'Not available'};
    if(provider === 'google_ads' && !googleMappingChannels(event,mappingEntry(provider,eventName)).ready) return {state:'setup',label:'Needs mapping'};
    if(provider === 'linkedin'){
      var linkedinMapping = mappingEntry(provider,eventName);
      if(!(linkedinMapping.conversion_action_id || linkedinMapping.label || linkedinMapping.browser_label)) return {state:'setup',label:'Needs mapping'};
    }
    return {state:'active',label:'Active'};
  }
  function eventProviderTile(provider,event){
    var meta = ADMIN_PROVIDERS[provider];
    var stateCopy = eventProviderState(provider,event);
    var fields = catalogDetailFields(event).filter(function(field){ return !field.operational; });
    return '<article class="ob-event-provider-card ' + esc(stateCopy.state) + '">' +
      '<div class="ob-event-provider-head"><strong>' + esc(meta.label) + '</strong><span class="ob-event-provider-status ' + esc(stateCopy.state) + '">' + esc(stateCopy.label) + '</span></div>' +
      '<div class="ob-event-provider-mapping"><span>Destination event</span><strong>' + mappingCell(provider,event.name || event.event_name) + '</strong></div>' +
      '<p>' + esc(providerCapability(provider,event)) + '</p>' +
      (fields.length ? '<details class="ob-event-provider-coverage"><summary>Field coverage <span>' + fields.length + ' safe field' + (fields.length === 1 ? '' : 's') + '</span></summary>' + providerDetailStatusHtml(provider,event) + '</details>' : '') +
    '</article>';
  }
  function eventProviderSummary(event){
    var totals = PROVIDER_ORDER.reduce(function(result,provider){
      var providerState = eventProviderState(provider,event).state;
      if(providerState === 'active') result.active += 1;
      else if(providerState === 'setup') result.setup += 1;
      return result;
    },{active:0,setup:0});
    return totals.active + ' active' + (totals.setup ? ' \u00b7 ' + totals.setup + ' mapping' + (totals.setup === 1 ? '' : 's') + ' needed' : '');
  }
  function eventCatalogCard(event){
    var eventName = cleanText(event.name || event.event_name,64);
    var label = cleanText(event.label || event.description || eventName.replace(/_/g,' '),120);
    var source = eventSource(event);
    var stage = eventStage(event);
    var search = [eventName,label,source,stage].concat(PROVIDER_ORDER.map(function(provider){ return ADMIN_PROVIDERS[provider].label; })).join(' ').toLowerCase();
    return '<details class="ob-event-catalog-card" data-catalog-source="' + esc(source) + '" data-catalog-stage="' + esc(stage.toLowerCase()) + '" data-catalog-search="' + esc(search) + '">' +
      '<summary><span class="ob-event-catalog-summary-layout"><span class="ob-event-catalog-title"><strong>' + esc(label) + '</strong><code>' + esc(eventName) + '</code></span>' +
        '<span class="ob-event-catalog-badges"><span class="ob-event-stage">' + esc(stage) + '</span><span class="ob-event-source ' + esc(source) + '">' + esc(source) + '</span></span>' +
        '<span class="ob-event-provider-summary">' + esc(eventProviderSummary(event)) + '</span><span class="ob-event-catalog-action"><span class="closed">View mapping</span><span class="open">Hide mapping</span></span></span></summary>' +
      '<div class="ob-event-catalog-content"><div class="ob-event-catalog-insight"><div><strong>Safe reporting fields</strong><p>These are the privacy-safe details available for this event.</p></div>' + detailChipsHtml(event) + '</div>' +
        '<div class="ob-event-provider-grid">' + PROVIDER_ORDER.map(function(provider){ return eventProviderTile(provider,event); }).join('') + '</div></div>' +
    '</details>';
  }
  function mappingMatrix(){
    var events = eventCatalog();
    var filters = state.adminCatalogFilters || {query:'',source:'',stage:''};
    var stages = [];
    events.forEach(function(event){ var stage=eventStage(event); if(stages.indexOf(stage) < 0) stages.push(stage); });
    var browserCount = events.filter(function(event){ return eventSource(event) === 'browser'; }).length;
    var serverCount = events.length - browserCount;
    return '<div id="ob-tracking-event-catalog" class="ob-event-catalog">' +
      '<div class="ob-event-catalog-overview"><span><strong>' + events.length + '</strong> canonical events</span><span><strong>' + browserCount + '</strong> browser</span><span><strong>' + serverCount + '</strong> server</span></div>' +
      '<div class="ob-event-catalog-toolbar" aria-label="Event catalog filters">' +
        '<label class="ob-event-catalog-search"><span>Find an event</span><input class="ob-tracking-input" data-catalog-filter="query" type="search" value="' + esc(filters.query || '') + '" placeholder="Search by event name" oninput="obFilterTrackingCatalog(\'query\',this.value)"></label>' +
        '<label><span>Source</span><select class="ob-tracking-select" data-catalog-filter="source" onchange="obFilterTrackingCatalog(\'source\',this.value)"><option value="">All sources</option><option value="browser" ' + (filters.source === 'browser' ? 'selected' : '') + '>Browser events</option><option value="server" ' + (filters.source === 'server' ? 'selected' : '') + '>Server events</option></select></label>' +
        '<label><span>Funnel stage</span><select class="ob-tracking-select" data-catalog-filter="stage" onchange="obFilterTrackingCatalog(\'stage\',this.value)"><option value="">All stages</option>' + stages.map(function(stage){ var value=stage.toLowerCase(); return '<option value="' + esc(value) + '" ' + (filters.stage === value ? 'selected' : '') + '>' + esc(stage) + '</option>'; }).join('') + '</select></label>' +
        '<button class="ob-tracking-btn" type="button" onclick="obResetTrackingCatalogFilters()">Reset filters</button>' +
      '</div>' +
      '<div class="ob-event-catalog-results"><span id="ob-event-catalog-visible" aria-live="polite">Showing ' + events.length + ' of ' + events.length + ' events</span><span>Open an event to inspect its platform mapping and field coverage.</span></div>' +
      '<div class="ob-event-catalog-list">' + events.map(eventCatalogCard).join('') + '</div>' +
      '<div class="ob-tracking-empty ob-event-catalog-empty" hidden>No events match these filters.</div>' +
    '</div>';
  }
  function eventItemName(item){
    var name = cleanText(item && (item.event_name || item.name),64).toLowerCase();
    return PLATFORM_EVENT_NAMES[name] ? name : '';
  }
  function eventItemSource(item){
    var source = cleanText(item && (item.source || item.event_source || 'server'),20).toLowerCase();
    return source === 'browser' ? 'browser' : 'server';
  }
  function eventSafeDetails(item){
    item = item && typeof item === 'object' ? item : {};
    var name = eventItemName(item);
    if(!name) return {};
    var details = {};
    [item.payload,item.properties,item.details,item.admin_details].forEach(function(candidate){
      if(!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return;
      safeDetailKeys(name).forEach(function(key){ if(candidate[key] !== undefined) details[key] = candidate[key]; });
    });
    safeDetailKeys(name).forEach(function(key){ if(item[key] !== undefined) details[key] = item[key]; });
    return safeProperties(name,details);
  }
  function safeEventPath(item){
    var path = item && item.path;
    if(!path && item && item.payload && typeof item.payload === 'object') path = item.payload.path;
    return sanitizePath(path || '/');
  }
  function adminEventMatches(item,filters){
    filters = filters || {};
    var name = eventItemName(item);
    var eventSource = eventItemSource(item);
    var details = eventSafeDetails(item);
    if(filters.event_name && name !== filters.event_name) return false;
    if(filters.event_source && eventSource !== filters.event_source) return false;
    if(filters.plan_id && details.plan_id !== filters.plan_id) return false;
    if(filters.interval && details.interval !== filters.interval) return false;
    if(filters.campaign_source && details.campaign_source !== filters.campaign_source) return false;
    if(filters.campaign_medium && details.campaign_medium !== filters.campaign_medium) return false;
    if(filters.campaign_name && details.campaign_name !== filters.campaign_name) return false;
    return true;
  }
  function filteredAdminEvents(items,filters){
    return (Array.isArray(items) ? items : []).filter(function(item){ return adminEventMatches(item,filters || state.adminEventFilters); });
  }
  function uniqueEventValues(items,key){
    var values = {};
    (items || []).forEach(function(item){
      var value = key === 'event_name' ? eventItemName(item) : key === 'event_source' ? eventItemSource(item) : eventSafeDetails(item)[key];
      if(value !== undefined && value !== '') values[String(value)] = true;
    });
    return Object.keys(values).sort();
  }
  function eventFilterSelect(key,label,values){
    var current = state.adminEventFilters[key] || '';
    return '<label>' + esc(label) + '<select class="ob-tracking-select" onchange="obSetTrackingEventFilter(\'' + esc(key) + '\',this.value)"><option value="">All</option>' + values.map(function(value){
      return '<option value="' + esc(value) + '" ' + (current === value ? 'selected' : '') + '>' + esc(value.replace(/_/g,' ')) + '</option>';
    }).join('') + '</select></label>';
  }
  function eventFiltersHtml(){
    var items = state.adminEvents || [];
    return '<div class="ob-event-filters" aria-label="Canonical event filters">' +
      eventFilterSelect('event_name','Event',uniqueEventValues(items,'event_name')) +
      eventFilterSelect('event_source','Event source',uniqueEventValues(items,'event_source')) +
      eventFilterSelect('plan_id','Plan',uniqueEventValues(items,'plan_id')) +
      eventFilterSelect('interval','Billing interval',uniqueEventValues(items,'interval')) +
      eventFilterSelect('campaign_source','Campaign source',uniqueEventValues(items,'campaign_source')) +
      eventFilterSelect('campaign_medium','Campaign medium',uniqueEventValues(items,'campaign_medium')) +
      eventFilterSelect('campaign_name','Campaign name',uniqueEventValues(items,'campaign_name')) +
      '<button class="ob-tracking-btn" type="button" onclick="obResetTrackingEventFilters()">Clear filters</button></div>';
  }
  function eventDetailRowsHtml(item){
    var name = eventItemName(item);
    var details = eventSafeDetails(item);
    var catalogEvent = eventCatalog().filter(function(event){ return (event.name || event.event_name) === name; })[0] || {name:name};
    var fields = catalogDetailFields(catalogEvent).filter(function(field){ return details[field.key] !== undefined; });
    if(!fields.length) return '<span class="ob-tracking-muted">No report-safe details for this event.</span>';
    return '<details class="ob-event-details"><summary>' + fields.length + ' safe detail' + (fields.length === 1 ? '' : 's') + '</summary><div class="ob-event-detail-grid">' + fields.map(function(field){
      var value = details[field.key];
      var operational = field.operational ? ' <small>operational reference</small>' : '';
      return '<span><b>' + esc(field.label) + '</b><code>' + esc(value) + '</code>' + operational + '</span>';
    }).join('') + '</div></details>';
  }
  function countValues(items,key){
    var counts = {};
    items.forEach(function(item){
      var value = key === 'event_name' ? eventItemName(item) : key === 'event_source' ? eventItemSource(item) : eventSafeDetails(item)[key];
      if(value === undefined || value === '') return;
      counts[value] = (counts[value] || 0) + 1;
    });
    return Object.keys(counts).map(function(value){ return {value:value,count:counts[value]}; }).sort(function(a,b){ return b.count - a.count || a.value.localeCompare(b.value); }).slice(0,6);
  }
  function eventBreakdownsHtml(items){
    var groups = [
      {key:'event_name',label:'Events'},
      {key:'plan_id',label:'Plans'},
      {key:'interval',label:'Intervals'},
      {key:'campaign_source',label:'Campaign sources'},
      {key:'campaign_name',label:'Campaigns'}
    ].map(function(group){ return {label:group.label,items:countValues(items,group.key)}; }).filter(function(group){ return group.items.length; });
    if(!groups.length) return '';
    return '<div class="ob-event-breakdowns">' + groups.map(function(group){
      return '<div><strong>' + esc(group.label) + '</strong><span>' + group.items.map(function(item){ return '<b>' + esc(item.value.replace(/_/g,' ')) + ' <em>' + esc(item.count) + '</em></b>'; }).join('') + '</span></div>';
    }).join('') + '</div>';
  }
  function recentEventsTable(){
    var allItems = state.adminEvents || [];
    if(!allItems.length) return eventFiltersHtml() + '<div class="ob-tracking-empty">No canonical events recorded yet.</div>';
    var items = filteredAdminEvents(allItems,state.adminEventFilters);
    var header = eventFiltersHtml() + eventBreakdownsHtml(items);
    if(!items.length) return header + '<div class="ob-tracking-empty">No events match these report-safe filters.</div>';
    return header + '<div class="ob-tracking-table-wrap"><table class="ob-tracking-table"><thead><tr><th>Time</th><th>Event</th><th>Source</th><th>Safe details</th><th>Path</th><th>Event ID</th></tr></thead><tbody>' + items.map(function(item){
      var name = eventItemName(item) || 'event';
      var source = eventItemSource(item);
      return '<tr><td>' + esc(formatTime(item.created_at || item.timestamp)) + '</td><td><strong>' + esc(name) + '</strong></td><td><span class="ob-event-source ' + esc(source) + '">' + esc(source) + '</span></td><td>' + eventDetailRowsHtml(item) + '</td><td>' + esc(safeEventPath(item)) + '</td><td><code>' + esc(cleanText(item.event_id || item.id,80)) + '</code></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  window.obSetTrackingEventFilter = function(key,value){
    if(!Object.prototype.hasOwnProperty.call(state.adminEventFilters,key)) return;
    value = cleanText(value,120);
    if(key === 'event_name') value = PLATFORM_EVENT_NAMES[value] ? value : '';
    else if(key === 'event_source') value = value === 'browser' || value === 'server' ? value : '';
    else value = safeDetailValue(key,value) || '';
    state.adminEventFilters[key] = value;
    renderAdminTracking();
  };
  window.obResetTrackingEventFilters = function(){
    state.adminEventFilters = {event_name:'',event_source:'',plan_id:'',interval:'',campaign_source:'',campaign_medium:'',campaign_name:''};
    renderAdminTracking();
  };
  function applyTrackingCatalogFilters(){
    var root = document.getElementById('ob-tracking-event-catalog');
    if(!root) return;
    var filters = state.adminCatalogFilters || {query:'',source:'',stage:''};
    var query = cleanText(filters.query,80).toLowerCase();
    var visible = 0;
    var cards = root.querySelectorAll('.ob-event-catalog-card');
    cards.forEach(function(card){
      var matches = (!query || String(card.getAttribute('data-catalog-search') || '').indexOf(query) >= 0) &&
        (!filters.source || card.getAttribute('data-catalog-source') === filters.source) &&
        (!filters.stage || card.getAttribute('data-catalog-stage') === filters.stage);
      card.hidden = !matches;
      if(matches) visible += 1;
    });
    var result = document.getElementById('ob-event-catalog-visible');
    if(result) result.textContent = 'Showing ' + visible + ' of ' + cards.length + ' events';
    var empty = root.querySelector('.ob-event-catalog-empty');
    if(empty) empty.hidden = visible !== 0;
  }
  window.obFilterTrackingCatalog = function(key,value){
    if(['query','source','stage'].indexOf(key) < 0) return;
    value = cleanText(value,80).toLowerCase();
    if(key === 'source' && ['','browser','server'].indexOf(value) < 0) value = '';
    if(key === 'stage'){
      var stages = eventCatalog().map(function(event){ return eventStage(event).toLowerCase(); });
      if(value && stages.indexOf(value) < 0) value = '';
    }
    state.adminCatalogFilters[key] = value;
    applyTrackingCatalogFilters();
  };
  window.obResetTrackingCatalogFilters = function(){
    state.adminCatalogFilters = {query:'',source:'',stage:''};
    var root = document.getElementById('ob-tracking-event-catalog');
    if(root) root.querySelectorAll('[data-catalog-filter]').forEach(function(control){ control.value=''; });
    applyTrackingCatalogFilters();
  };
  function deliveriesTable(){
    var items = state.adminDeliveries || [];
    if(!items.length) return '<div class="ob-tracking-empty">No provider deliveries recorded yet.</div>';
    return '<div class="ob-tracking-table-wrap"><table class="ob-tracking-table"><thead><tr><th>Time</th><th>Provider</th><th>Event</th><th>Status</th><th>Attempts</th><th>Safe diagnostic</th><th></th></tr></thead><tbody>' + items.map(function(item){
      var status = cleanText(item.status || 'pending',30).toLowerCase();
      var failed = ['failed','dead_letter','error','retry','dead','permanent_failure'].indexOf(status) >= 0;
      return '<tr><td>' + esc(formatTime(item.updated_at || item.created_at)) + '</td><td>' + esc(item.provider || '-') + '</td><td>' + (item.event_name ? esc(item.event_name) : '<code>' + esc(cleanText(item.event_id || '-',48)) + '</code>') + '</td><td class="' + (failed ? 'ob-delivery-failed' : '') + '">' + esc(status) + '</td><td>' + esc(item.attempts || item.attempt_count || 0) + '</td><td>' + esc(cleanText(item.last_error_message || item.last_error || item.error_summary || '',180)) + '</td><td>' + (failed ? '<button class="ob-tracking-btn" type="button" onclick="obRetryTrackingDelivery(\'' + esc(item.id || item.delivery_id) + '\')">Retry</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function statsHtml(){
    var stats = adminOverview().counts || adminOverview().stats || {};
    var deliveryCounts = stats.deliveries || {};
    var totals = deliveryHealthTotals(deliveryCounts);
    var connected = PROVIDER_ORDER.filter(function(provider){ var status = connectionStatus(provider); return ['connected','ready','active','configured'].indexOf(status) >= 0; }).length;
    var cards = [
      ['Connected providers',stats.connected_providers !== undefined ? stats.connected_providers : connected,'of ' + PROVIDER_ORDER.length],
      ['Canonical events',stats.events !== undefined ? stats.events : (stats.total_events !== undefined ? stats.total_events : state.adminEvents.length),'recent log'],
      ['Successful deliveries',totals.successful || stats.successful_deliveries || stats.delivered || 0,'provider sends'],
      ['Failed deliveries',totals.failed || stats.failed_deliveries || stats.failed || 0,'retry available']
    ];
    return '<div class="ob-tracking-grid">' + cards.map(function(card){ return '<div class="ob-tracking-control"><label>' + esc(card[0]) + '</label><strong style="font-size:24px;color:#fffaf0;">' + esc(card[1]) + '</strong><span class="ob-tracking-muted">' + esc(card[2]) + '</span></div>'; }).join('') + '</div>';
  }
  function deliveryHealthTotals(counts){
    counts = counts || {};
    function sum(keys){ return keys.reduce(function(total,key){ var value=Number(counts[key] || 0); return total + (isFinite(value) && value > 0 ? value : 0); },0); }
    return {
      successful:sum(['sent','success','delivered']),
      failed:sum(['failed','error','retry','dead','permanent_failure'])
    };
  }
  function renderAdminTracking(){
    var root = document.getElementById('ob-admin-tracking-root');
    if(!root) return;
    var environmentCopy = adminEnvironmentCopy();
    var enabled = bool(settingValue('enabled',adminOverview().enabled),false);
    var mode = normalizeBrowserMode(settingValue('browser_mode',adminOverview().browser_mode || 'managed'));
    var version = cleanText(settingValue('policy_version',adminOverview().policy_version || 'tracking-consent-2026-07'),80);
    root.innerHTML =
      '<section class="ob-tracking-banner"><div><strong>' + esc(environmentCopy.bannerTitle) + '</strong><p>' + esc(environmentCopy.bannerBody) + '</p></div><span class="ob-tracking-env">' + esc(environmentCopy.environment) + '</span></section>' +
      '<section class="ob-tracking-section"><div class="ob-tracking-section-head"><div><h2>Tracking controls</h2><p class="ob-tracking-muted">One global kill switch and one consent contract across Managed, GTM-only, or GTM + Ownlybiz Meta browser delivery.</p></div><button class="ob-tracking-btn" type="button" onclick="loadAdminTracking(true)">Refresh</button></div>' +
        '<div class="ob-tracking-grid"><div class="ob-tracking-control"><label>Global service</label><label class="ob-tracking-check"><input id="ob-tracking-enabled" type="checkbox" ' + (enabled ? 'checked' : '') + '> Enabled</label><span class="ob-tracking-muted">Turning this off stops browser and server delivery.</span></div>' +
          '<div class="ob-tracking-control"><label for="ob-tracking-browser-mode">Browser delivery</label><select id="ob-tracking-browser-mode" class="ob-tracking-select"><option value="managed" ' + (mode === 'managed' ? 'selected' : '') + '>Managed by Ownlybiz</option><option value="gtm" ' + (mode === 'gtm' ? 'selected' : '') + '>Google Tag Manager only</option><option value="gtm_meta" ' + (mode === 'gtm_meta' ? 'selected' : '') + '>GTM + Ownlybiz Meta</option></select><span class="ob-tracking-muted">Hybrid mode sends canonical browser events to GTM while keeping the direct Ownlybiz Meta Pixel path. Do not add another Meta Pixel tag inside GTM.</span></div>' +
          '<div class="ob-tracking-control"><label for="ob-tracking-policy-version">Consent policy version</label><input id="ob-tracking-policy-version" class="ob-tracking-input" value="' + esc(version) + '" placeholder="tracking-consent-2026-07"><span class="ob-tracking-muted">Receipts bind every event to this version.</span></div>' +
          '<div class="ob-tracking-control"><label>Consent enforcement</label><label class="ob-tracking-check"><input type="checkbox" checked disabled> Required</label><span class="ob-tracking-muted">Fresh or denied visitors produce no third-party tag request.</span></div></div>' +
        '<div class="ob-tracking-actions" style="margin-top:14px;"><button class="ob-tracking-btn primary" type="button" onclick="obSaveTrackingSettings()">Save tracking controls</button><button class="ob-tracking-btn" type="button" onclick="obOpenConsentManager();return false;">Preview consent choices</button></div></section>' +
      '<section class="ob-tracking-section"><div class="ob-tracking-section-head"><div><h2>Service health</h2><p class="ob-tracking-muted">Safe totals only; no tokens or customer payloads are displayed.</p></div></div>' + statsHtml() + '</section>' +
      '<section class="ob-tracking-section"><div class="ob-tracking-section-head"><div><h2>Advertising and analytics platforms</h2><p class="ob-tracking-muted">Named services are first-class connections. Custom Webhook is only for a generic endpoint you control.</p></div></div><div class="ob-provider-grid">' + PROVIDER_ORDER.map(providerCard).join('') + '</div></section>' +
      '<section class="ob-tracking-section"><div class="ob-tracking-section-head"><div><h2>Event catalog</h2><p class="ob-tracking-muted">Browse the full funnel without the spreadsheet. Open one event to see its platform mapping and privacy-safe field coverage. Schema ' + esc(schemaVersion()) + ' keeps browser behavior low-risk and sensitive milestones server-authoritative.</p></div></div>' + mappingMatrix() + '</section>' +
      '<section class="ob-tracking-section"><div class="ob-tracking-section-head"><div><h2>Recent canonical events</h2><p class="ob-tracking-muted">Expandable details use the locked safe schema. Raw attribution, click IDs, user data, emails, tokens, and URL queries are never rendered here.</p></div></div>' + recentEventsTable() + '</section>' +
      '<section class="ob-tracking-section"><div class="ob-tracking-section-head"><div><h2>Provider delivery log</h2><p class="ob-tracking-muted">Retries reuse the original event ID for provider deduplication.</p></div></div>' + deliveriesTable() + '</section>';
  }
  function responsePart(data,key,fallback){
    if(data && data[key] !== undefined) return data[key];
    if(data && data.data && data.data[key] !== undefined) return data.data[key];
    return fallback;
  }
  function loadAdminTracking(force){
    var root = document.getElementById('ob-admin-tracking-root');
    if(!root) return Promise.resolve();
    if(!force && root.dataset.loaded === '1') return Promise.resolve(state.adminOverview);
    root.innerHTML = '<div class="admin-card ob-tracking-loading">Loading tracking settings, canonical events, and provider deliveries...</div>';
    return Promise.all([
      adminApi('/admin/tracking/overview').then(function(data){ return data.overview || data.tracking || data.data || data; }),
      adminApi('/admin/tracking/events?limit=25').catch(function(){ return {}; }),
      adminApi('/admin/tracking/deliveries?limit=25').catch(function(){ return {}; })
    ]).then(function(results){
      state.adminOverview = results[0] || {};
      state.adminEvents = responsePart(results[1],'events',state.adminOverview.recent_events || []);
      state.adminDeliveries = responsePart(results[2],'deliveries',state.adminOverview.recent_deliveries || []);
      root.dataset.loaded = '1';
      renderAdminTracking();
      return state.adminOverview;
    }).catch(function(error){
      root.innerHTML = '<div class="admin-card ob-tracking-error">Tracking &amp; Ads could not load: ' + esc(error.message || 'Request failed') + '<div style="margin-top:12px;"><button class="ob-tracking-btn" type="button" onclick="loadAdminTracking(true)">Try again</button></div></div>';
      throw error;
    });
  }
  function toastAdmin(message,type){
    try { if(typeof window.toast === 'function') return window.toast(message,type === 'err' ? 'err' : 'ok'); if(typeof window._showToast === 'function') return window._showToast(message,type === 'err' ? 'red' : 'green'); } catch(e) {}
  }
  function collectMappings(card,provider){
    var result = {};
    card.querySelectorAll('[data-google-map-event]').forEach(function(row){
      var eventName = row.getAttribute('data-google-map-event');
      var server = cleanText((row.querySelector('[data-map-server]') || {}).value,80);
      var label = cleanText((row.querySelector('[data-map-label]') || {}).value,120);
      if(server || label) result[eventName] = {conversion_action_id:server,label:label};
    });
    card.querySelectorAll('[data-linkedin-map-event]').forEach(function(row){
      var eventName = row.getAttribute('data-linkedin-map-event');
      var conversion = cleanText((row.querySelector('[data-map-server]') || {}).value,80);
      if(conversion) result[eventName] = conversion;
    });
    var simple = card.querySelector('[data-simple-mappings]');
    if(simple) String(simple.value || '').split(/\n/).forEach(function(line){
      var index = line.indexOf('=');
      if(index < 1) return;
      var key = cleanText(line.slice(0,index),64).toLowerCase();
      var value = cleanText(line.slice(index + 1),120);
      if(/^[a-z][a-z0-9_]{1,63}$/.test(key) && value) result[key] = value;
    });
    return result;
  }
  function validateConnection(provider,config,enabled){
    if(!enabled) return '';
    if(provider === 'ga4' && !/^G-[A-Z0-9]{4,20}$/i.test(config.measurement_id || '')) return 'Enter a valid GA4 Measurement ID.';
    if(provider === 'google_ads' && !/^(?:AW-)?\d{5,30}$/i.test(config.conversion_id || '')) return 'Enter a valid Google Ads conversion ID (AW-123456789 or its numeric ID).';
    if(provider === 'google_ads' && config.plan_custom_variable_tag && !validGoogleCustomVariableTag(config.plan_custom_variable_tag)) return 'Plan custom-variable tag must use lowercase letters, numbers, and underscores, starting with a letter.';
    if(provider === 'google_ads' && config.interval_custom_variable_tag && !validGoogleCustomVariableTag(config.interval_custom_variable_tag)) return 'Interval custom-variable tag must use lowercase letters, numbers, and underscores, starting with a letter.';
    if(provider === 'meta' && !/^\d{5,30}$/.test(config.pixel_id || '')) return 'Enter a valid numeric Meta Pixel ID.';
    if(provider === 'gtm' && !/^GTM-[A-Z0-9]{4,20}$/i.test(config.container_id || '')) return 'Enter a valid GTM container ID.';
    if(provider === 'tiktok' && !/^[A-Za-z0-9]{6,40}$/.test(config.pixel_code || '')) return 'Enter a valid TikTok pixel code.';
    if(provider === 'linkedin' && config.partner_id && !/^\d{3,30}$/.test(config.partner_id)) return 'Enter a valid public numeric LinkedIn Partner ID for Insight Tag.';
    if(provider === 'custom_webhook'){
      try { if(new URL(config.endpoint_url || '').protocol !== 'https:') return 'Custom Webhook requires an HTTPS endpoint.'; } catch(e) { return 'Enter a valid HTTPS webhook endpoint.'; }
    }
    return '';
  }
  window.obSaveTrackingSettings = function(){
    var selectedBrowserMode = (document.getElementById('ob-tracking-browser-mode') || {}).value;
    var payload = {
      enabled:!!((document.getElementById('ob-tracking-enabled') || {}).checked),
      browser_mode:normalizeBrowserMode(selectedBrowserMode),
      policy_version:cleanText((document.getElementById('ob-tracking-policy-version') || {}).value || 'tracking-consent-2026-07',80),
      consent_required:true
    };
    return adminApi('/admin/tracking/settings',{method:'PUT',body:payload}).then(function(){ toastAdmin('Tracking controls saved.'); var root=document.getElementById('ob-admin-tracking-root'); if(root)root.dataset.loaded=''; return loadAdminTracking(true); }).catch(function(error){ toastAdmin(error.message || 'Tracking controls failed to save.','err'); });
  };
  window.obSaveTrackingConnection = function(provider){
    var card = document.querySelector('.ob-provider-card[data-provider="' + provider + '"]');
    if(!card || !ADMIN_PROVIDERS[provider]) return;
    var config = {};
    card.querySelectorAll('[data-provider-field]').forEach(function(input){
      var key = input.getAttribute('data-provider-field');
      var value = String(input.value || '').trim();
      if(input.getAttribute('data-secret') === '1' && !value) return;
      config[key] = value;
    });
    var enabled = !!((card.querySelector('[data-provider-enabled]') || {}).checked);
    var error = validateConnection(provider,config,enabled);
    if(error) return toastAdmin(error,'err');
    var payload = {enabled:enabled,config:config,mappings:collectMappings(card,provider)};
    return adminApi('/admin/tracking/connections/' + encodeURIComponent(provider),{method:'PUT',body:payload}).then(function(){
      if(provider === 'ga4' && config.measurement_id){ var legacy=document.getElementById('platform_ga4_id'); if(legacy)legacy.value=config.measurement_id; }
      card.querySelectorAll('[data-secret="1"]').forEach(function(input){ input.value=''; });
      toastAdmin(ADMIN_PROVIDERS[provider].label + ' saved.');
      var root=document.getElementById('ob-admin-tracking-root'); if(root)root.dataset.loaded='';
      return loadAdminTracking(true);
    }).catch(function(requestError){ toastAdmin(requestError.message || 'Connection failed to save.','err'); });
  };
  window.obTestTrackingConnection = function(provider){
    if(!ADMIN_PROVIDERS[provider]) return;
    if(!window.confirm(providerTestWarning(provider))) return;
    return adminApi('/admin/tracking/connections/' + encodeURIComponent(provider) + '/test',{method:'POST',body:{confirm:true,confirm_live_test:true}}).then(function(data){
      var test = data.test || (data.data && data.data.test) || {};
      toastAdmin(providerTestResultMessage(provider,test,data));
      var root=document.getElementById('ob-admin-tracking-root'); if(root)root.dataset.loaded='';
      return loadAdminTracking(true);
    }).catch(function(error){ toastAdmin(error.message || 'Provider validation failed.','err'); });
  };
  window.obDisconnectTrackingConnection = function(provider){
    if(!ADMIN_PROVIDERS[provider] || !window.confirm('Disconnect ' + ADMIN_PROVIDERS[provider].label + '? New deliveries stop immediately; saved secrets are revoked or removed.')) return;
    return adminApi('/admin/tracking/connections/' + encodeURIComponent(provider) + '/disconnect',{method:'POST',body:{confirm:true}}).then(function(){
      toastAdmin(ADMIN_PROVIDERS[provider].label + ' disconnected.');
      var root=document.getElementById('ob-admin-tracking-root'); if(root)root.dataset.loaded='';
      return loadAdminTracking(true);
    }).catch(function(error){ toastAdmin(error.message || 'Disconnect failed.','err'); });
  };
  window.obRetryTrackingDelivery = function(id){
    id = cleanText(id,120);
    if(!id || !window.confirm('Retry this failed provider delivery with the original event ID?')) return;
    return adminApi('/admin/tracking/deliveries/' + encodeURIComponent(id) + '/retry',{method:'POST',body:{confirm:true}}).then(function(){ toastAdmin('Delivery queued for retry.'); return loadAdminTracking(true); }).catch(function(error){ toastAdmin(error.message || 'Retry failed.','err'); });
  };
  function openAdminTracking(el){
    document.querySelectorAll('.admin-nav-item').forEach(function(item){ item.classList.remove('active'); });
    var nav = el && el.classList && el.classList.contains('admin-nav-item') ? el : document.getElementById('ob-admin-tracking-nav');
    if(nav) nav.classList.add('active');
    document.querySelectorAll('.admin-tab').forEach(function(tab){ tab.classList.remove('active'); });
    var tab = document.getElementById('ob-admin-tracking-tab');
    if(tab) tab.classList.add('active');
    document.querySelectorAll('.admin-tab-panel').forEach(function(panel){ panel.classList.remove('active'); });
    var panel = document.getElementById('admin-panel-tracking-ads');
    if(panel) panel.classList.add('active');
    var title = document.getElementById('admin-page-title');
    if(title) title.textContent = 'Tracking & Ads';
    var helper = document.getElementById('admin-context-helper');
    if(helper) helper.textContent = 'Platform acquisition and subscription tracking for this environment. Provider changes affect only the current Ownlybiz workspace and its connected destinations.';
    return loadAdminTracking(false);
  }
  window.obOpenAdminTracking = openAdminTracking;
  window.loadAdminTracking = loadAdminTracking;
  function installAdminHooks(){
    if(window.adminNav && !window.adminNav.__obTrackingAdsWrapped){
      var oldNav = window.adminNav;
      window.adminNav = function(el,panel){ if(panel === 'tracking-ads') return openAdminTracking(el); return oldNav.apply(this,arguments); };
      window.adminNav.__obTrackingAdsWrapped = true;
    }
    if(window.adminTabSwitch && !window.adminTabSwitch.__obTrackingAdsWrapped){
      var oldTab = window.adminTabSwitch;
      window.adminTabSwitch = function(tabEl,panel){ if(panel === 'tracking-ads') return openAdminTracking(); return oldTab.apply(this,arguments); };
      window.adminTabSwitch.__obTrackingAdsWrapped = true;
    }
  }
  installAdminHooks();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',installAdminHooks);
})();
