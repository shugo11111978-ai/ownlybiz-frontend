import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sfuClientSource = readFileSync(new URL('../assets/sfu-client.js', import.meta.url), 'utf8');
const authorizationPolicyMatch = html.match(/<script id="ownlybiz-session-authorization-policy-20260816">([\s\S]*?)<\/script>/);
assert(authorizationPolicyMatch, 'one first-class session-authorization policy owner is installed');
const authorizationPolicyEnd = authorizationPolicyMatch[1].indexOf('\n(function(){\n  if(window.__obCreditWalletV1) return;');
assert(authorizationPolicyEnd > 0, 'session-authorization policy has one bounded source owner');
const authorizationPolicySource = authorizationPolicyMatch[1].slice(0, authorizationPolicyEnd);
const controllerMatch = html.match(/<script id="ownlybiz-pay-per-minute-authorization-20260814-js">([\s\S]*?)<\/script>/);
assert(controllerMatch, 'pay-per-minute authorization controller is installed');
const controllerSource = controllerMatch[1];
const adminAuthorizationStart = html.indexOf('var sessionAuthorizationPolicy = window.OB_SESSION_AUTHORIZATION_POLICY;');
const adminAuthorizationEnd = html.indexOf('\n  function platformPaymentServiceConfigHtml(){', adminAuthorizationStart);
assert(adminAuthorizationStart >= 0 && adminAuthorizationEnd > adminAuthorizationStart,
  'live Platform Payments authorization-setting owner is installed');
const adminAuthorizationSource = html.slice(adminAuthorizationStart, adminAuthorizationEnd);
const authContextStart = html.indexOf('window.obAuthPrincipalFingerprint =');
const authContextEnd = html.indexOf('window.obPublicLoaderCanFetchProfile =', authContextStart);
assert(authContextStart >= 0 && authContextEnd > authContextStart, 'central client identity context is installed');
const authContextSource = html.slice(authContextStart, authContextEnd);
const publicExpertCacheStart = html.indexOf('(function(){\n  if(window.__obPublicExpertFetchCoalescer');
const publicExpertCacheEndMarker = '\n})();';
const publicExpertCacheEnd = html.indexOf(publicExpertCacheEndMarker, publicExpertCacheStart);
assert(publicExpertCacheStart >= 0 && publicExpertCacheEnd > publicExpertCacheStart,
  'principal-scoped public-expert fetch cache is installed');
const publicExpertCacheSource = html.slice(
  publicExpertCacheStart,
  publicExpertCacheEnd + publicExpertCacheEndMarker.length,
);
const publicExpertLoaderEnd = html.indexOf('\n// --- Start live poll on expert public pages ---', publicExpertCacheEnd);
const publicExpertLoaderStart = html.lastIndexOf('window.loadExpertWebsite = function(slug)', publicExpertLoaderEnd);
assert(publicExpertLoaderStart >= 0 && publicExpertLoaderEnd > publicExpertLoaderStart,
  'principal-scoped public-expert loader is installed');
const publicExpertHelpersStart = html.indexOf('function obPublicPreloadedExpert(slug)', publicExpertCacheEnd);
assert(publicExpertHelpersStart >= 0 && publicExpertHelpersStart < publicExpertLoaderStart,
  'public-expert loader helpers are installed');
const publicExpertHelpersSource = html.slice(publicExpertHelpersStart, publicExpertLoaderStart);
const publicExpertLoaderSource = html.slice(publicExpertLoaderStart, publicExpertLoaderEnd);
const storedPublicExpertCacheStart = html.indexOf('function publicExpertPayloadOwner()');
const storedPublicExpertCacheEnd = html.indexOf('function wrapPublicRenderers()', storedPublicExpertCacheStart);
assert(storedPublicExpertCacheStart >= 0 && storedPublicExpertCacheEnd > storedPublicExpertCacheStart,
  'principal-owned stored public-expert cache is installed');
const storedPublicExpertCacheSource = html.slice(storedPublicExpertCacheStart, storedPublicExpertCacheEnd);
assert(html.includes('if(publicExpertPayloadOwner() !== renderOwner) return;'),
  'delayed public-expert render callbacks are fenced to their originating principal');
const stagingAuthKeyStart = html.indexOf('function authKey(input, init)');
const stagingAuthKeyEnd = html.indexOf('function readUrl(input)', stagingAuthKeyStart);
assert(stagingAuthKeyStart >= 0 && stagingAuthKeyEnd > stagingAuthKeyStart,
  'staging hot-GET cache reads authorization from Request and init headers');
const stagingAuthKeySource = html.slice(stagingAuthKeyStart, stagingAuthKeyEnd);
const publicGateCacheStart = html.indexOf('var publicGate = { pending:{}, allowed:{}, blocked:{}, inFlight:{}, payload:{} };');
const publicGateCacheEnd = html.indexOf('\n  function apiBase(){', publicGateCacheStart);
assert(publicGateCacheStart >= 0 && publicGateCacheEnd > publicGateCacheStart,
  'expert-funnel public-gate payload cache has a principal owner');
const publicGateCacheSource = html.slice(publicGateCacheStart, publicGateCacheEnd);
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
const genericWireWsStart = html.indexOf('function wireWs(ws, roleName){');
const genericWireWsEnd = html.indexOf('\n  window._obRouteWsMessage = routeWsMessage;', genericWireWsStart);
assert(genericWireWsStart >= 0 && genericWireWsEnd > genericWireWsStart, 'generic WebSocket wiring owner is installed');
const genericWireWsSource = html.slice(genericWireWsStart, genericWireWsEnd);
const legacySessionEndedStart = html.indexOf("case 'session_ended': {");
const legacySessionEndedEnd = html.indexOf("case 'message':", legacySessionEndedStart);
assert(legacySessionEndedStart >= 0 && legacySessionEndedEnd > legacySessionEndedStart,
  'legacy session-ended route is present');
const legacySessionEndedSource = html.slice(legacySessionEndedStart, legacySessionEndedEnd);
const canonicalClientReceiptStart = html.lastIndexOf('function applyClientReceipt(sess, options){');
const canonicalClientReceiptEnd = html.indexOf('\n  function showClientReceiptPending(sess){', canonicalClientReceiptStart);
assert(canonicalClientReceiptStart >= 0 && canonicalClientReceiptEnd > canonicalClientReceiptStart,
  'canonical client receipt renderer is installed');
const canonicalClientReceiptSource = html.slice(canonicalClientReceiptStart, canonicalClientReceiptEnd);
const clientRtcStartOwnerStart = html.indexOf('function settleClientScheduledPreflight(sessionId,transferred){');
const clientRtcStartOwnerEnd = html.indexOf('\n  function applyClientSessionUi(sess){', clientRtcStartOwnerStart);
assert(clientRtcStartOwnerStart >= 0 && clientRtcStartOwnerEnd > clientRtcStartOwnerStart,
  'client RTC media-start owner is installed');
const clientRtcStartOwnerSource = html.slice(clientRtcStartOwnerStart, clientRtcStartOwnerEnd);
const mediaPrewarmOwnerStart = html.indexOf('function stopOwnedPrewarmStream(stream){');
const mediaPrewarmOwnerEnd = html.indexOf('\n  function renderPresessionMedia(){', mediaPrewarmOwnerStart);
assert(mediaPrewarmOwnerStart >= 0 && mediaPrewarmOwnerEnd > mediaPrewarmOwnerStart,
  'role-scoped media prewarm owner is installed');
const mediaPrewarmOwnerSource = html.slice(mediaPrewarmOwnerStart, mediaPrewarmOwnerEnd);
const marketplaceMatch = html.match(/<script id="ob-marketplace-mode-20260618">([\s\S]*?)<\/script>/);
assert(marketplaceMatch, 'marketplace and mini-suite owner is installed');
const marketplaceSource = marketplaceMatch[1];
const miniSuiteRuntimeStart = marketplaceSource.indexOf('var miniSuiteState =');
const miniSuiteRuntimeEnd = marketplaceSource.indexOf('\n  window.obMiniSuiteSaveProfile', miniSuiteRuntimeStart);
assert(miniSuiteRuntimeStart >= 0 && miniSuiteRuntimeEnd > miniSuiteRuntimeStart, 'mini-suite runtime owner is present');
const miniSuiteRuntimeSource = marketplaceSource.slice(miniSuiteRuntimeStart, miniSuiteRuntimeEnd);
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
const clientBookingHelpersStart = html.indexOf('function clientBookingLifecycleView(booking)');
const clientBookingHelpersEnd = html.indexOf('\nfunction loadClientBookings()', clientBookingHelpersStart);
assert(clientBookingHelpersStart >= 0 && clientBookingHelpersEnd > clientBookingHelpersStart,
  'client booking lifecycle and route helpers are installed');
const clientBookingHelpersSource = html.slice(clientBookingHelpersStart, clientBookingHelpersEnd);

assert.match(authorizationPolicySource, /clientPayments = config && config\.client_payments/,
  'public display policy reads the canonical nested client-payments config');
assert.match(authorizationPolicySource, /policyLoaded = false;[\s\S]*policyRevision = 0;/,
  'central policy owns explicit loaded and revision state');
assert.match(authorizationPolicySource, /session_authorization_policy_revision/,
  'central policy adopts the server opaque authorization-policy revision');
assert.match(authorizationPolicySource, /adoptPaymentsConfig:adoptPaymentsConfig/,
  'fresh payments config has one canonical policy adoption path');
assert.match(html, /data-ob-session-authorization-copy="disclosure"/,
  'immediate payment disclosure is owned by the dynamic authorization policy');
assert.match(html, /Any unused amount is released after the session/,
  'payment page explains release of the unused authorization');
assert.match(html, /your bank may show it as pending briefly/,
  'payment page calmly explains that the released authorization can remain visible temporarily');
assert.match(authorizationPolicySource, /is a temporary authorization, not an extra session charge/,
  'payment page does not describe the hold as a charge or card test');
assert.match(html, />Verify payment &amp; Continue|>Verify payment & Continue/,
  'primary action uses calm payment-confirmation language');
assert.doesNotMatch(html, />Authorize \$5 & Continue/,
  'primary action does not lead with the hold amount');

assert.match(controllerSource, /fetch\(BASE \+ '\/api\/payments\/authorize'/,
  'live flow creates a backend-owned authorization');
assert.match(html, /hdrs\['Idempotency-Key'\] = bflBookingRequestId\(/,
  'Book Later sends its stable request identity only through the idempotency header');
assert.doesNotMatch(html, /bookingPayload\.booking_request_id\s*=/,
  'Book Later does not expose its retry identity in the public request payload');
assert.match(html, /if\(operation\.marketplaceExpertId\)bookingPayload\.marketplace_expert_id=operation\.marketplaceExpertId/,
  'Book Later sends the captured marketplace expert directly in the booking payload');
assert.doesNotMatch(html, /bflBookingIntentFingerprint|var hashes=\[2166136261/,
  'Book Later does not persist a weak fingerprint derived from client identity or notes');
assert.doesNotMatch(bflOwnerSource, /Math\.random\(\)/,
  'Book Later request IDs never fall back to collision-prone non-cryptographic randomness');
assert.match(html, /bflClearBookingRequestIntent\(\);[\s\S]*?if \(d && d\.success\)|if \(d && d\.success\) \{[\s\S]*?bflClearBookingRequestIntent\(\)/,
  'Book Later clears the persisted request identity after confirmed success');
assert.match(html, /d\.code==='booking_request_conflict'\)bflClearBookingRequestIntent\(\)/,
  'a server-confirmed changed request clears the stale retry key for the next deliberate attempt');
assert.match(controllerSource, /var body = \{expert_id:opts\.expertId, channel:opts\.channel, authorization_request_id:flowRequestId\}/,
  'authorization request includes expert, channel, and one client UUID');
assert.match(controllerSource, /body\.authorization_policy_revision=disclosedPolicy\.revision/,
  'authorization request echoes only the exact revision of the policy disclosed before consent');
assert.match(controllerSource, /body\.marketplace_expert_id = opts\.marketplaceExpertId/,
  'marketplace authorization includes the same selected mini expert');
assert.match(controllerSource, /'live:' \+ opts\.expertId \+ ':' \+ \(opts\.marketplaceExpertId \|\| 'owner'\) \+ ':' \+ opts\.channel/,
  'authorization reuse is scoped to the selected marketplace expert');
assert.doesNotMatch(controllerSource, /authorization_request_id:state\.requestId, amount:/,
  'frontend cannot choose or tamper with the server-controlled amount');
assert.doesNotMatch(controllerSource, /body\.(?:amount|amount_cents|amount_authorized|amount_authorized_cents)\s*=/,
  'authorization request remains amount-free after the setting becomes configurable');
assert.match(controllerSource, /exactResponseCents=authorizationPolicy\.validCents\(data\.amount_authorized_cents\)/,
  'authorization success requires the exact top-level integer-cent transaction snapshot');
assert.match(controllerSource, /exactResponseCurrency=typeof data\.currency==='string'/,
  'authorization success requires the exact top-level transaction currency');
assert.doesNotMatch(controllerSource, /responseAuthorization=authorizationPolicy\.snapshotFromRecord\(data,null,null\)/,
  'authorization success cannot silently accept a legacy dollar or fallback policy snapshot');
assert.match(controllerSource, /amount_authorized_cents:state\.amountCents/,
  'session handoff exposes the integer-cent transaction snapshot');
assert.match(controllerSource, /amount_authorized:state\.amountCents \/ 100/,
  'legacy dollar display is derived from the integer-cent snapshot');
assert.match(controllerSource, /currency:state\.currency/,
  'authorization snapshot preserves its server currency');
assert.match(controllerSource, /validatedPolicy=await ensureDisclosedPolicy\(opts\.expertId,disclosedPolicy,null,true\)/,
  'central authorization owner fails closed unless fresh policy matches disclosed consent');
assert.match(controllerSource, /ensureDisclosedPolicy\(expertId,disclosedPolicy,config,true\)/,
  'immediate payment compares its fresh payments-config policy with the clicked disclosure');
assert.match(controllerSource, /ensureDisclosedPolicy\(expertId,disclosedPolicy,null,true\)/,
  'Book Later uses the shared revision-bound consent gate with a fresh payments config');
assert.match(controllerSource, /disclosedPolicy=authorizationPolicy\.disclosedSnapshot\(document\.getElementById\('bov-pay-explainer'\)\);\s*syncPaymentCopy\(\)/,
  'immediate card consent captures the rendered policy before click-time rerender work');
assert.match(controllerSource, /async function authorizeScheduledBooking\(useReplacement\)\{[\s\S]*?disclosedPolicy=authorizationPolicy\.disclosedSnapshot\(document\.getElementById\('ob-booking-auth-policy-disclosure'\)\);[\s\S]*?var data=await loadBookingAuthorizationData/,
  'Book Later captures its rendered policy before any click continuation awaits');
assert.match(html, /express\.on\('click',[\s\S]*?disclosedAuthorizationPolicy[\s\S]*?express\.on\('confirm'/,
  'Express Checkout snapshots disclosure on wallet click rather than after wallet confirmation');
assert.match(walletCoreSource, /mode:'setup',[\s\S]*?setupFutureUsage:'off_session'/,
  'deferred Express Checkout declares the same off-session setup contract as the server SetupIntent');
assert.doesNotMatch(walletCoreSource, /paymentMethodTypes\s*:/,
  'deferred Express Checkout leaves payment-method selection to the server automatic SetupIntent contract');
assert.match(walletCoreSource, /walletStage\(operation,mountContext,'stripe_confirm_started'\)[\s\S]*?stripe\.confirmSetup/,
  'wallet diagnostics prove the flow reaches Stripe confirmation before invoking confirmSetup');
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

assert.match(authorizationPolicySource, /kind === 'scheduled-save'/,
  'scheduled booking does not place a long-lived hold at booking time');
assert.match(html, /id="ob-session-authorization-config-card"/,
  'Platform Payments renders the authorization setting in its live content owner');
assert.match(html, /id="ob-session-authorization-amount"[^>]*type="number"[^>]*inputmode="decimal"[^>]*step="0\.01"/,
  'admin amount input supports accessible exact-cent entry');
assert.match(html, /id="ob-session-authorization-status" role="status" aria-live="polite" aria-atomic="true"/,
  'admin setting exposes loading, validation, and save feedback to assistive technology');
assert.match(html, /api\('\/admin\/settings\/session-authorization'\)/,
  'admin setting loads through its dedicated endpoint');
assert.match(html, /api\('\/admin\/settings\/session-authorization',\{method:'PUT',body:body\}\)/,
  'admin setting saves through its dedicated endpoint without touching wallet or Stripe secrets');
assert.match(html, /body=\{session_authorization_amount_cents:parsed\.cents,expected_updated_at:sessionAuthorizationAdminState\.updatedAt\}/,
  'admin always sends integer cents plus the explicit hydrated revision');
assert.match(html, /id="ob-session-authorization-save" type="submit" disabled/,
  'admin Save starts disabled until dedicated hydration succeeds');
assert.doesNotMatch(html, /id="(?:bov-step-pay-badge|presess-payment)"[^>]*data-ob-session-authorization-copy/,
  'approved transaction nodes are never registered for current-policy rerender');
assert.doesNotMatch(html, /temporary \$5(?:\.00)? authorization|\$5(?:\.00)? authorization approved|The \$5(?:\.00)? is a temporary authorization/,
  'authorization-facing copy has no stale hardcoded five-dollar amount');
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
assert.doesNotMatch(html, /function renderBookingOverlayMedia\(/,
  'scheduled media readiness has no DOM-text inference or competing MutationObserver owner');
assert.match(controllerSource, /function bookingMediaChannel\(data\)/,
  'the scheduled-booking controller derives Voice or Video from authoritative booking data');
assert.match(controllerSource, /function enableScheduledBookingMedia\(\)/,
  'one scheduled-booking media owner acquires devices before entering an active media session');
assert.match(controllerSource, /mediaReadyForBooking\(data\)[\s\S]*completeScheduledBookingJoin/,
  'an active scheduled media session cannot auto-join until its owned preflight is ready');
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
assert.match(controllerSource, /function bookingLifecycleState\(data\)/,
  'one scheduled-booking lifecycle classifier owns active, settling, waiting, and terminal states');
assert.match(controllerSource, /lifecycle\.kind==='active'[\s\S]*window\.joinActiveBookingSession\(/,
  'an authoritative active join response resumes the scheduled live session without waiting for WebSocket delivery');
assert.match(controllerSource, /if\(applyBookingLifecycle\(data,\{focus:true\}\)\)return;/,
  'a fresh non-waiting booking lifecycle cannot fall through into payment authorization');
assert.match(controllerSource, /if\(!response\.ok\)[\s\S]*Could not end this session/,
  'expert End treats non-2xx responses as failures before applying terminal UI state');
assert.match(controllerSource, /data\.settlement_pending===true[\s\S]*obApplyExpertSettlementPending/,
  'expert End treats an accepted settlement as billing-stopped finalization instead of a failure');
assert.match(html, /function applyAuthoritativeClientTerminal\(payload\)[\s\S]*candidate\.status[\s\S]*applyClientSettlementPending/,
  'client terminal delivery recognizes the server settling state before rendering a final receipt');
assert.match(html, /function applyClientSettlementPending\(payload,\s*ownership\)[\s\S]*pauseClientTimers\(sess\)[\s\S]*showClientReceiptPending\(sess\)/,
  'client settlement-pending UI freezes the timer and renders a truthful finalizing receipt');
assert.match(html, /action === 'stop_one'[\s\S]*\/admin\/observability\/sessions\/' \+ encodeURIComponent\(sessionId\) \+ '\/stop'[\s\S]*required_confirm/,
  'Ops exposes a target-bound emergency recovery flow for one exact session');
assert.match(html, /SETTLE_AND_STOP_ACTIVE_SESSIONS[\s\S]*settles accrued usage, retries stuck finalizations/,
  'bulk emergency stop uses the backend settlement confirmation contract and truthful billing copy');
assert.match(html, /Server audit recorded:[\s\S]*audit_event_id/,
  'Ops surfaces the durable server audit result for confirmed emergency actions');
assert.doesNotMatch(html, /STOP_ACTIVE_SESSIONS_WITHOUT_BILLING|ends active sessions without billing unpaid time/,
  'the former misleading emergency-stop contract and copy are removed');
assert.equal((html.match(/window\.expertEndSession\s*=/g) || []).length, 1,
  'one expert End request owner remains');
assert.equal((html.match(/function expertEndSession\s*\(/g) || []).length, 0,
  'the superseded local-only expert End implementation is deleted');
assert.doesNotMatch(html, /_origEndSession|expertEndSession\(\);if\(window\.OB_RTC\)/,
  'expert End has no wrapper or pre-success RTC teardown path');
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
assert.match(controllerSource, /methods\/status'[\s\S]*\{cache:'no-store',headers:\{Authorization:'Bearer '\+tok\},signal:controller\.signal\}/,
  'authenticated saved-payment readiness bypasses the HTTP cache');
assert.match(controllerSource, /var SAVED_PAYMENT_READINESS_TIMEOUT_MS=8000/,
  'saved-payment readiness has one bounded request lifetime');
assert.match(controllerSource, /function abortSavedPaymentReadiness\(\)[\s\S]*controller\.abort\(\)/,
  'the saved-payment owner aborts stale readiness requests');
assert.match(controllerSource, /enhanceBookingJoinOverlay\(\{force:true,focus:true\}\)/,
  'scheduled booking payment readiness is re-rendered after an auth identity change');
assert.match(controllerSource, /\/join',\{cache:'no-store',headers:\{Authorization:'Bearer '\+context\.token\}\}/,
  'authenticated scheduled-booking readiness bypasses the HTTP cache');
assert.match(controllerSource, /rtc\.resetClientContext\(\)/,
  'client auth teardown delegates pending RTC startup and local media cleanup to one RTC owner');
assert.match(controllerSource, /'_clientTimerInterval','_obClientElapsedInterval','_bookingPollTimer'/,
  'client auth teardown stops elapsed and scheduled-session timers');
assert.match(rtcModuleSource, /authIdentity:_captureRtcIdentity\(role,'rtc-start'/,
  'peer RTC startup captures the matching central client or expert identity that requested media');
assert.match(rtcModuleSource, /acquiredStream=await navigator\.mediaDevices\.getUserMedia[\s\S]*_stopMediaStream\(acquiredStream\);return false/,
  'a media stream arriving after RTC invalidation is immediately stopped');
assert.match(rtcModuleSource, /_takeScheduledPreflightStream\(role,channel,sessionId\)[\s\S]*if\(!acquiredStream\)acquiredStream=await navigator\.mediaDevices\.getUserMedia/,
  'peer RTC consumes the exact scheduled preflight stream before requesting devices again');
assert.match(controllerSource, /rtc\.setScheduledPreflightStream\(media\.stream,sessionId,channel,'client'\)/,
  'scheduled Voice/Video hands the exact stream and session identity to the authoritative RTC owner');
assert.match(rtcModuleSource, /setScheduledPreflightStream:setScheduledPreflightStream,settleScheduledPreflight:settleScheduledPreflight/,
  'the RTC owner exposes explicit scheduled-stream transfer and settlement operations');
assert.match(rtcModuleSource, /var clientPrewarm=window\._obClientMediaReadyStream;[\s\S]*_stopMediaStream\(clientPrewarm\)/,
  'peer-only identity teardown also stops an unscheduled client prewarm');
assert.match(clientRtcStartOwnerSource, /if\(clientRtcMediaStart\.key===startKey\)return clientRtcMediaStart\.promise/,
  'repeated polling shares one in-flight RTC start for the exact client session and channel');
assert.match(clientRtcStartOwnerSource, /OB_CLIENT_CONTEXT\.register\('client-rtc-media-start',\{teardown:invalidateClientRtcMediaStarts\}\)/,
  'client identity teardown invalidates pending and queued RTC media starts');
assert.match(sfuClientSource, /["']sfu-rtc-start["']/,
  'the installed SFU start captures its matching client or expert identity before asynchronous configuration or preparation');
assert.match(sfuClientSource, /["']sfu-rtc-prepare["']/,
  'the installed SFU pre-join preparation captures its matching client or expert identity before asynchronous configuration');
assert.match(sfuClientSource, /__OB_TEST_SFU_START_CALL__/,
  'the installed SFU start captures one local session owner before asynchronous startup');
assert.match(sfuClientSource, /adoptLocalStream\([^)]*\)[\s\S]*source:"prewarmed"/,
  'the real installed SFU session owns a consumed prewarm before preparation can fail');
assert.match(sfuClientSource, /getUserMedia\([^)]*this\.channel\)\)[\s\S]*adoptLocalStream\(/,
  'the real installed SFU session owns a prompted stream at the permission continuation boundary');
assert.match(sfuClientSource, /catch\([^)]*\)\{try\{await [^}]+\}catch\{\}throw [^}]+\}/,
  'a preparation failure settles exact media ownership before SFU fallback or privacy cleanup');
assert.match(sfuClientSource, /releaseLocalStreamForFallback[\s\S]*setScheduledPreflightStream\(/,
  'only a current owned SFU session explicitly transfers a reusable stream into peer fallback');
assert.match(sfuClientSource, /__OB_TEST_SFU_START_CALL__[\s\S]*releaseLocalStreamForFallback[\s\S]*\?!1:/,
  'an identity-invalidated or superseded SFU start cannot close the current session or enter peer fallback');
assert.match(sfuClientSource, /resetClientContext:[^,]+[\s\S]*getRole\(\)\{return [^?]+\?[^.]+\.role/,
  'the installed SFU owner exposes client-only reset and its real active role');
assert.match(sfuClientSource, /resetExpertContext:[^,]+/,
  'the installed SFU owner exposes a nondeliberate expert identity reset');
assert.match(sfuClientSource, /clearPrewarmedStream:[^,]+/,
  'the installed SFU owner exposes role-scoped prewarm cleanup');
assert.doesNotMatch(sfuClientSource, /_obRtcPrewarmedStream&&[^;]{0,100}\.push\(window\._obRtcPrewarmedStream\)/,
  'the installed SFU consumer never treats the untyped shared prewarm reference as cross-role media');
assert.match(mediaPrewarmOwnerSource, /captureMediaPrewarmOwner\('client'/,
  'pre-session client device permission is bound to its authenticated identity before awaiting media');
assert.match(mediaPrewarmOwnerSource, /OB_CLIENT_CONTEXT\.register\('media-prewarm'/,
  'client and expert prewarm streams have a central identity teardown owner');
assert.match(mediaPrewarmOwnerSource, /OB_RTC\.resetExpertContext\(\)/,
  'expert, admin, and support identity teardown reaches the active expert RTC owner');
assert.match(rtcModuleSource, /sessionStorage\.getItem\('ob_mini_suite_token'\)/,
  'peer RTC can authenticate a dedicated fallback socket with the mini-suite credential');
assert.match(miniSuiteRuntimeSource, /waitForMiniSuiteMediaSocket\(\)[\s\S]*window\.OB_RTC\.start\(sess\.id,ch,'expert'\)/,
  'mini-suite media waits for its authenticated suite socket before starting RTC');
assert.match(miniSuiteRuntimeSource, /miniSuiteState\.wsAuthenticated=true;window\._expertWs=ws/,
  'an authenticated initial or reconnected mini-suite socket becomes the expert signaling owner');
assert.match(miniSuiteRuntimeSource, /data\.type && data\.type\.indexOf\('rtc_'\) === 0[\s\S]*window\._handleRTCMessage\(data\);[\s\S]*return;/,
  'the mini-suite socket directly owns incoming RTC signaling');
assert.match(html, /if\(ws\._obMiniSuiteSignalOwner\) return ws;/,
  'the generic socket router cannot compete with the mini-suite RTC message owner');

const liveRequestHandlerStart = html.indexOf("fetch(BASE+'/api/sessions/request'");
const liveRequestHandlerEnd = html.indexOf('window.obCancelWait=function()', liveRequestHandlerStart);
assert(liveRequestHandlerStart >= 0 && liveRequestHandlerEnd > liveRequestHandlerStart,
  'live session response handler is present');
const liveRequestHandler = html.slice(liveRequestHandlerStart, liveRequestHandlerEnd);
const liveSuccessGate = liveRequestHandler.indexOf('obClientSessionRequestContinuationAllowed(creditMode,continuationRequestId,t,authorizationRequired)');
assert(liveSuccessGate >= 0 && liveSuccessGate < liveRequestHandler.indexOf('if(!d._httpOk)') && liveSuccessGate < liveRequestHandler.indexOf('_sessId=d.session.id'),
  'late live-session success and API error responses are rejected before any session or UI mutation');
assert(liveRequestHandler.includes('discardDetachedClientSession(d,t);return;'),
  'a late successful session response is declined with the originating credential instead of becoming an orphan session');
const liveCatchStart = liveRequestHandler.lastIndexOf('.catch(function()');
assert(liveCatchStart >= 0 && liveRequestHandler.indexOf('obClientSessionRequestContinuationAllowed(creditMode,continuationRequestId,t,authorizationRequired)', liveCatchStart) < liveRequestHandler.indexOf("obCancelWait();alert('Network error", liveCatchStart),
  'late live-session network errors are rejected before clearing the current account UI');
assert.match(controllerSource, /clientContext\.isTokenCurrent\(requestToken\)/,
  'live continuation is bound to the stable authenticated principal that sent the request');
assert.match(html, /var pollToken=tok\(\)[\s\S]*clientTokenCurrent\(pollToken\)/,
  'pending live-session polling cannot continue across a true identity change');
assert.match(html, /_obStagingV2ClientToken&&!clientTokenCurrent\(ws\._obStagingV2ClientToken\)/,
  'queued client WebSocket events are bound to the stable client identity');
assert.match(legacySessionEndedSource, /window\.obApplyAuthoritativeClientEnded\(d\)/,
  'the legacy peer-ended route delegates receipt rendering to the canonical client owner');
assert.doesNotMatch(legacySessionEndedSource, /receipt-(?:total|duration|rate)/,
  'the legacy peer-ended route cannot directly overwrite canonical receipt values');
assert.match(canonicalClientReceiptSource, /Math\.floor\(dur\/60\)/,
  'the canonical receipt reports completed whole minutes consistently');
assert.match(canonicalClientReceiptSource, /setText\('receipt-rate', money\(rate\) \+ '\/min'\)/,
  'the canonical receipt formats the per-minute rate as currency');
assert.match(canonicalClientReceiptSource, /window\.obApplyAuthoritativeClientEnded=applyAuthoritativeClientTerminal/,
  'all remote session-ended transports can call the canonical client receipt owner');

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

assert.equal((html.match(/id="ob-client-voice-live-cost"/g) || []).length, 1,
  'Voice owns one live-cost output');
assert.equal((html.match(/id="ob-client-video-live-cost"/g) || []).length, 1,
  'Video owns one live-cost output');
assert.doesNotMatch(html, /id="b3-voice-cost"|getElementById\('video-cost'\)|setText\('video-cost'/,
  'superseded blank and ghost media-cost selectors are deleted');
for (const rtcId of [
  'expert-rtc-area', 'expert-rtc-channel', 'rtc-status', 'expert-rtc-video-box',
  'expert-rtc-remote-video', 'expert-rtc-local-video',
]) {
  assert.equal((html.match(new RegExp(`id="${rtcId}"`, 'g')) || []).length, 1,
    `${rtcId} has one canonical DOM owner`);
}
assert.equal((html.match(/id="ob-mini-expert-rtc-mount"/g) || []).length, 1,
  'the mini suite mounts the canonical expert RTC surface instead of cloning its IDs');

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
  removeAttribute(name) { delete this.attributes[name]; }
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

function createHarness({
  search = '', session = {}, fetchImpl, beforeControllerSources = [],
  policyConfig = { client_payments: {
    session_authorization_amount_cents: 500,
    session_authorization_currency: 'usd',
    session_authorization_policy_revision: 'policy-default-500-v1',
  } },
} = {}) {
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
    location: { search, pathname: '/', hostname: 'staging.example', origin: 'https://staging.example', href: `https://staging.example/${search}` },
    sessionStorage: storage(session),
    localStorage: storage(),
    URLSearchParams,
    URL,
    Headers,
    Request,
    Response,
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
  new vm.Script(authorizationPolicySource, { filename: 'session-authorization-policy.js' }).runInContext(sandbox);
  if (policyConfig !== null) sandbox.OB_SESSION_AUTHORIZATION_POLICY.adoptConfig(policyConfig);
  new vm.Script(authContextSource, { filename: 'client-identity-context.js' }).runInContext(sandbox);
  beforeControllerSources.forEach((source, index) => {
    new vm.Script(source, { filename: `before-payment-controller-${index}.js` }).runInContext(sandbox);
  });
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

function attachPersistentExpertEndButton(harness, label = 'End Session') {
  const button = new FakeElement('button');
  button.textContent = label;
  button.setAttribute('onclick', 'expertEndSession()');
  harness.body.appendChild(button);
  const priorQuerySelectorAll = harness.document.querySelectorAll.bind(harness.document);
  harness.document.querySelectorAll = (selector) => (
    selector === '[onclick*="expertEndSession"]' ? [button] : priorQuerySelectorAll(selector)
  );
  return button;
}

// Executable XSS regression: an expert name remains a text node, never markup.
const disclosureAssignment = html.match(/window\.obSetPayPerMinuteDisclosure = function\(element, expertName\)\{[\s\S]*?\n  \};/);
assert(disclosureAssignment, 'safe disclosure renderer is defined');
const disclosureDocument = {
  readyState: 'complete',
  createElement: (tag) => new FakeElement(tag),
  createTextNode: (text) => new FakeText(text),
  querySelectorAll: () => [],
  addEventListener() {},
};
const disclosureSandbox = { document: disclosureDocument, Intl };
disclosureSandbox.window = disclosureSandbox;
vm.createContext(disclosureSandbox);
new vm.Script(authorizationPolicySource, { filename: 'session-authorization-policy-unit.js' }).runInContext(disclosureSandbox);
const policy = disclosureSandbox.OB_SESSION_AUTHORIZATION_POLICY;
assert.deepEqual(JSON.parse(JSON.stringify(policy.state())), {
  loaded: false, revision: 0, serverRevision: null, cents: null, currency: 'usd', source: '',
}, 'authorization policy exposes an unloaded, revisioned state instead of a visible numeric fallback');
assert.equal(policy.configuredCents(), null, 'the default cannot masquerade as authoritative policy before config loads');
assert.equal(policy.formatCents(), '', 'unloaded policy cannot format a numeric fallback');
assert.doesNotMatch(policy.copy('disclosure-body'), /\$5(?:\.00)?/,
  'unloaded payment disclosure remains amount-neutral');
assert.deepEqual(
  JSON.parse(JSON.stringify(policy.parseDollars('12.34'))),
  { ok: true, cents: 1234, dollars: '12.34' },
  'admin dollar entry converts exactly to integer cents',
);
for (const invalid of ['', '0.49', '500.01', '7.001', '-2', '$7.25', '1e2']) {
  assert.equal(policy.parseDollars(invalid).ok, false, `admin amount rejects invalid value ${JSON.stringify(invalid)}`);
}
assert.equal(policy.adoptConfig({ session_authorization_amount_cents: 999 }), false,
  'a flat public-config lookalike cannot become a second frontend authority');
assert.equal(policy.adoptConfig({ client_payments: {
  session_authorization_amount_cents: 725,
  session_authorization_currency: 'usd',
} }), false, 'legacy public config without an opaque revision remains fail-closed');
assert.equal(policy.adoptConfig({ client_payments: {
  session_authorization_amount_cents: 725,
  session_authorization_currency: 'usd',
  session_authorization_policy_revision: ' policy-with-mutated-whitespace ',
} }), false, 'frontend never trims or changes an opaque server revision');
assert.equal(policy.adoptConfig({ client_payments: {
  session_authorization_amount_cents: 725,
  session_authorization_currency: 'usd',
  session_authorization_policy_revision: 'policy-public-725-v1',
} }), true, 'canonical nested public config updates the preflight display amount');
assert.equal(policy.configuredCents(), 725);
assert.equal(policy.formatCents(), '$7.25');
assert.deepEqual(JSON.parse(JSON.stringify(policy.state())), {
  loaded: true, revision: 1, serverRevision: 'policy-public-725-v1', cents: 725, currency: 'usd', source: 'public',
}, 'successful public hydration records the authoritative source and advances the local revision');
const exactTransaction = policy.snapshotFromRecord({ amount_authorized_cents: 880, currency: 'usd' }, null, null);
policy.adoptPaymentsConfig({
  session_authorization_amount_cents: 1000,
  session_authorization_currency: 'usd',
  session_authorization_policy_revision: 'policy-payments-1000-v2',
});
assert.equal(exactTransaction.cents, 880, 'an existing transaction snapshot does not change with the admin setting');
assert.equal(policy.formatCents(exactTransaction.cents, exactTransaction.currency), '$8.80');
new vm.Script(disclosureAssignment[0]).runInContext(disclosureSandbox);
const disclosureTarget = new FakeElement('div');
const maliciousName = '<img src=x onerror="globalThis.pwned=true">';
disclosureSandbox.window.obSetPayPerMinuteDisclosure(disclosureTarget, maliciousName);
assert.equal(disclosureTarget.children.length, 2, 'disclosure contains one strong element and one text node');
assert.equal(disclosureTarget.children[1].nodeType, 3, 'untrusted expert name is rendered as text');
assert(disclosureTarget.textContent.includes(maliciousName), 'untrusted characters remain literal text');
assert(disclosureTarget.textContent.includes('$10.00'), 'safe disclosure renderer uses the current central policy amount');
assert.equal(disclosureSandbox.pwned, undefined, 'untrusted disclosure text cannot execute');

// Executable Admin -> Platform Payments load, validation, and exact-cent save.
const adminBody = new FakeElement('body');
const adminDocument = {
  readyState: 'complete',
  createElement: (tag) => new FakeElement(tag),
  createTextNode: (text) => new FakeText(text),
  getElementById(id) { return adminBody.id === id ? adminBody : adminBody.querySelector(`#${id}`); },
  querySelectorAll: () => [],
  addEventListener() {},
};
for (const [id, tag] of [
  ['ob-session-authorization-config-card', 'section'],
  ['ob-session-authorization-amount', 'input'],
  ['ob-session-authorization-save', 'button'],
  ['ob-session-authorization-reload', 'button'],
  ['ob-session-authorization-status', 'div'],
]) {
  const element = new FakeElement(tag); element.id = id; adminBody.appendChild(element);
}
const adminRequests = [];
const adminSandbox = { document: adminDocument, Intl, __OB_TEST_HOOKS__: true };
adminSandbox.window = adminSandbox;
adminSandbox.__adminApi = async (path, options = {}) => {
  adminRequests.push({ path, options });
  if ((options.method || 'GET') === 'GET') return {
    success: true,
    session_authorization_amount_cents: 725,
    session_authorization_currency: 'usd',
    updated_at: null,
  };
  return {
    success: true,
    session_authorization_amount_cents: options.body.session_authorization_amount_cents,
    session_authorization_currency: 'usd',
    updated_at: 'setting-v2',
  };
};
vm.createContext(adminSandbox);
new vm.Script(authorizationPolicySource, { filename: 'admin-session-authorization-policy.js' }).runInContext(adminSandbox);
new vm.Script(`(function(){
  function esc(value){return String(value == null ? '' : value);}
  function role(){return 'admin';}
  var readCache={};
  function api(path,options){return window.__adminApi(path,options||{});}
  ${adminAuthorizationSource}
})();`, { filename: 'admin-session-authorization-setting.js' }).runInContext(adminSandbox);
const adminHooks = adminSandbox.obSessionAuthorizationAdminTestHooks;
assert(adminHooks, 'admin setting exposes explicit test hooks only in the executable harness');
await adminHooks.hydrate();
const adminAmountInput = adminDocument.getElementById('ob-session-authorization-amount');
assert.equal(adminAmountInput.value, '7.25', 'dedicated GET renders the integer-cent value as dollars');
assert.equal(adminDocument.getElementById('ob-session-authorization-save').disabled, false,
  'successful dedicated hydration enables Save');
assert.equal(adminSandbox.OB_SESSION_AUTHORIZATION_POLICY.configuredCents(), 725,
  'admin GET updates the same central frontend owner used by public copy');
adminAmountInput.value = '12.34';
assert.equal(await adminHooks.save({ preventDefault() {} }), true, 'valid exact-cent admin save succeeds');
assert.deepEqual(JSON.parse(JSON.stringify(adminRequests[1])), {
  path: '/admin/settings/session-authorization',
  options: {
    method: 'PUT',
    body: { session_authorization_amount_cents: 1234, expected_updated_at: null },
  },
}, 'first admin save sends explicit null as the no-row revision');
assert.equal(adminSandbox.OB_SESSION_AUTHORIZATION_POLICY.configuredCents(), 1234,
  'confirmed save updates the single frontend policy owner');
assert(adminDocument.getElementById('ob-session-authorization-status').textContent.includes('Saved $12.34'),
  'successful save produces an accessible confirmation with the exact amount');
const requestCountBeforeInvalidSave = adminRequests.length;
adminAmountInput.value = '12.345';
assert.equal(await adminHooks.save({ preventDefault() {} }), false, 'fractional sub-cent admin input is rejected');
assert.equal(adminRequests.length, requestCountBeforeInvalidSave, 'invalid admin input never reaches the backend');
assert.equal(adminAmountInput.getAttribute('aria-invalid'), 'true', 'invalid admin input is exposed accessibly');
adminSandbox.__adminApi = async (path, options = {}) => {
  adminRequests.push({ path, options });
  throw new Error('hydration offline');
};
assert.equal(await adminHooks.hydrate(), null, 'failed dedicated hydration is reported without a fallback value');
assert.equal(adminHooks.state.hydrated, false, 'failed hydration clears the admin save authority');
assert.equal(adminDocument.getElementById('ob-session-authorization-save').disabled, true,
  'failed hydration leaves Save disabled');
adminAmountInput.value = '20.00';
const requestsBeforeBlockedSave = adminRequests.length;
assert.equal(await adminHooks.save({ preventDefault() {} }), false,
  'admin cannot save after hydration fails');
assert.equal(adminRequests.length, requestsBeforeBlockedSave,
  'hydration failure cannot fall through to a PUT');

const authTokenFor = (id, extra = {}) => `e30.${Buffer.from(JSON.stringify({ id, role: 'client', ...extra })).toString('base64url')}.signature`;
const clientAToken = authTokenFor('client-a');
const clientARotatedToken = authTokenFor('client-a', { nonce: 'rotated' });
const clientAKey = `principal:${JSON.stringify(['client-a', 'client', ''])}`;
const clientBToken = authTokenFor('client-b');
const clientBRotatedToken = authTokenFor('client-b', { nonce: 'rotated' });
const clientBKey = `principal:${JSON.stringify(['client-b', 'client', ''])}`;
const expertToken = `e30.${Buffer.from(JSON.stringify({ id: 'expert-a', role: 'expert' })).toString('base64url')}.signature`;
const expertBToken = `e30.${Buffer.from(JSON.stringify({ id: 'expert-b', role: 'expert' })).toString('base64url')}.signature`;
const adminToken = `e30.${Buffer.from(JSON.stringify({ id: 'admin-a', role: 'admin' })).toString('base64url')}.signature`;
const supportToken = `e30.${Buffer.from(JSON.stringify({ id: 'support-a', role: 'support' })).toString('base64url')}.signature`;
const miniSuiteTokenValue = 'mini-suite-session-token';

// Starting media while the suite socket is CONNECTING waits for its authenticated
// socket. Reconnect publishes the replacement socket before future RTC signaling.
const miniSocketHarness = createHarness({ session: { ob_mini_suite_token: miniSuiteTokenValue } });
const miniSocketInstances = [];
class MiniSuiteSocket {
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; miniSocketInstances.push(this); }
  send(payload) { this.sent.push(JSON.parse(payload)); }
  open() { this.readyState = 1; if (this.onopen) this.onopen(); }
  receive(payload) { if (this.onmessage) this.onmessage({ data: JSON.stringify(payload) }); }
  close() { this.readyState = 3; if (this.onclose) this.onclose(); }
}
miniSocketHarness.sandbox.WebSocket = MiniSuiteSocket;
miniSocketHarness.sandbox.API_ROOT = 'https://staging.example/api';
miniSocketHarness.sandbox.esc = (value) => String(value ?? '');
miniSocketHarness.sandbox.attr = (value) => String(value ?? '');
miniSocketHarness.sandbox.money = (value) => `$${Number(value || 0).toFixed(2)}`;
const miniNotifications = [];
miniSocketHarness.sandbox.notify = (...args) => miniNotifications.push(args);
const miniIncomingRtc = [];
miniSocketHarness.sandbox._handleRTCMessage = (message) => miniIncomingRtc.push(message);
const miniRtcStarts = [];
miniSocketHarness.sandbox.OB_RTC = {
  start(sessionId, channel, role) {
    miniRtcStarts.push({ sessionId, channel, role, socket: miniSocketHarness.sandbox._expertWs });
    return Promise.resolve(true);
  },
  cleanup() {}, getSid: () => 'mini-voice-session', getRole: () => 'expert',
};
const miniArea = new FakeElement('div'); miniArea.id = 'expert-rtc-area'; miniArea.style.display = 'none';
for (const id of ['expert-rtc-channel', 'expert-rtc-video-box', 'expert-rtc-voice-viz', 'rtc-cam-btn']) {
  const element = new FakeElement(id === 'rtc-cam-btn' ? 'button' : 'div'); element.id = id; miniArea.appendChild(element);
}
const miniMount = new FakeElement('div'); miniMount.id = 'ob-mini-expert-rtc-mount';
miniSocketHarness.body.append(miniArea, miniMount);
vm.runInContext(miniSuiteRuntimeSource, miniSocketHarness.sandbox, { filename: 'mini-suite-media-runtime.js' });
vm.runInContext(genericWireWsSource, miniSocketHarness.sandbox, { filename: 'generic-websocket-wiring.js' });
miniSocketHarness.sandbox.miniSuiteState.openSession = { id: 'mini-voice-session', channel: 'voice', status: 'active' };
const delayedMiniStart = miniSocketHarness.sandbox.obMiniSuiteStartMedia();
assert.equal(miniSocketInstances.length, 1, 'mini media creates its suite socket while disconnected');
assert.equal(miniSocketInstances[0].readyState, 0, 'the initial suite socket is still CONNECTING');
const initialMiniMessageOwner = miniSocketInstances[0].onmessage;
miniSocketHarness.sandbox.wireWs(miniSocketInstances[0], 'expert');
assert.equal(miniSocketInstances[0].onmessage, initialMiniMessageOwner,
  'generic WebSocket reinstall leaves the initial mini-suite message owner untouched');
assert.equal(miniRtcStarts.length, 0, 'RTC cannot start before the suite socket opens and authenticates');
miniSocketInstances[0].open();
assert.equal(miniSocketInstances[0].sent[0].type, 'auth', 'suite socket authenticates before it is published to RTC');
assert.equal(miniSocketInstances[0].sent[0].token, miniSuiteTokenValue, 'suite socket uses the mini credential');
assert.equal(miniRtcStarts.length, 0, 'an open but unacknowledged suite socket still cannot start RTC');
miniSocketInstances[0].receive({ type: 'rtc_offer', session_id: 'untrusted-before-auth', sdp: 'ignored' });
assert.deepEqual(miniIncomingRtc, [], 'the suite socket rejects RTC signaling before authentication');
miniSocketInstances[0].receive({ type: 'authenticated' });
await settleAsync();
const initialRtcOffer = { type: 'rtc_offer', session_id: 'mini-voice-session', sdp: 'initial-offer' };
miniSocketInstances[0].receive(initialRtcOffer);
assert.equal(miniIncomingRtc.length, 1, 'authenticated initial suite socket routes one RTC message exactly once');
assert.equal(JSON.stringify(miniIncomingRtc[0]), JSON.stringify(initialRtcOffer));
assert.equal(await delayedMiniStart, true, 'media starts after suite authentication succeeds');
assert.deepEqual(miniRtcStarts[0], {
  sessionId: 'mini-voice-session', channel: 'voice', role: 'expert', socket: miniSocketInstances[0],
}, 'peer/SFU RTC receives the exact authenticated mini-suite socket');
miniSocketInstances[0].close();
assert.equal(miniSocketHarness.sandbox._expertWs, null, 'a closed suite socket cannot remain the signaling owner');
miniSocketHarness.runTimers();
assert.equal(miniSocketInstances.length, 2, 'mini-suite signaling reconnects after the owned socket closes');
const reconnectedMiniMessageOwner = miniSocketInstances[1].onmessage;
miniSocketHarness.sandbox.wireWs(miniSocketInstances[1], 'expert');
assert.equal(miniSocketInstances[1].onmessage, reconnectedMiniMessageOwner,
  'generic WebSocket reinstall leaves the reconnected mini-suite message owner untouched');
miniSocketInstances[1].open();
assert.equal(miniSocketInstances[1].sent[0].token, miniSuiteTokenValue, 'reconnected suite socket authenticates with the same mini credential');
miniSocketInstances[1].receive({ type: 'authed' });
await settleAsync();
const reconnectedRtcIce = { type: 'rtc_ice', session_id: 'mini-voice-session', candidate: { candidate: 'reconnected-ice' } };
miniSocketInstances[1].receive(reconnectedRtcIce);
assert.equal(miniIncomingRtc.length, 2, 'authenticated reconnect routes the next RTC message exactly once through the new owner');
assert.equal(JSON.stringify(miniIncomingRtc[1]), JSON.stringify(reconnectedRtcIce));
assert.equal(miniSocketHarness.sandbox._expertWs, miniSocketInstances[1], 'authenticated reconnect replaces the closed RTC signaling socket');
assert.equal(miniRtcStarts.length, 1, 'socket reconnect does not duplicate media startup');
assert.deepEqual(miniNotifications, [], 'healthy delayed-open and reconnect paths show no media error');

// If peer RTC must create a dedicated fallback socket during a reconnect gap,
// its own auth owner uses the mini-suite token rather than an unrelated account.
const miniPeerHarness = createHarness({ session: { ob_t: clientAToken, ob_mini_suite_token: miniSuiteTokenValue } });
miniPeerHarness.sandbox.location.pathname = '/mini-suite/expert/mini-a';
miniPeerHarness.sandbox.OWNLY_CONFIG = { rtc: {} };
const miniPeerTrack = { kind: 'audio', readyState: 'live', enabled: true, stop() { this.readyState = 'ended'; } };
miniPeerHarness.sandbox.navigator = { mediaDevices: { getUserMedia: async () => ({
  getTracks: () => [miniPeerTrack], getAudioTracks: () => [miniPeerTrack], getVideoTracks: () => [],
}) } };
miniPeerHarness.sandbox.RTCPeerConnection = class {
  constructor() { this.connectionState = 'new'; this.iceConnectionState = 'new'; this.signalingState = 'stable'; this.remoteDescription = null; }
  addTrack() {}
  close() { this.connectionState = 'closed'; }
  async createOffer() { return { type: 'offer', sdp: 'mini-peer-offer' }; }
  async createAnswer() { return { type: 'answer', sdp: 'mini-peer-answer' }; }
  async setLocalDescription(description) { this.localDescription = description; this.signalingState = description.type === 'offer' ? 'have-local-offer' : 'stable'; }
  async setRemoteDescription(description) { this.remoteDescription = description; }
  async addIceCandidate() {}
};
const miniPeerSockets = [];
class MiniPeerSocket {
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; miniPeerSockets.push(this); }
  send(payload) { this.sent.push(JSON.parse(payload)); }
  open() { this.readyState = 1; if (this.onopen) this.onopen(); }
}
miniPeerHarness.sandbox.WebSocket = MiniPeerSocket;
new vm.Script(rtcModuleSource, { filename: 'mini-suite-peer-fallback.js' }).runInContext(miniPeerHarness.sandbox);
assert.equal(await miniPeerHarness.sandbox.OB_RTC.start('mini-peer-session', 'voice', 'expert'), true,
  'mini-suite peer fallback can initialize while its dedicated signaling socket connects');
assert.equal(miniPeerSockets.length, 1, 'peer fallback creates one dedicated signaling socket');
miniPeerSockets[0].open();
assert.deepEqual(miniPeerSockets[0].sent[0], { type: 'auth', token: miniSuiteTokenValue },
  'dedicated peer fallback authenticates with the mini-suite credential');
miniPeerHarness.sandbox.OB_RTC.cleanup();

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
bflOwnerHarness.sandbox.crypto.getRandomValues = (() => {
  let generation = 0;
  return (array) => {
    generation += 1;
    for (let index = 0; index < array.length; index += 1) array[index] = (generation * 31 + index * 17) & 255;
    return array;
  };
})();
new vm.Script('var _bflSelectedDate="2026-09-10",_bflSelectedTime="14:30",_bflChannel="chat",_bflCardElement=null,_bflBookingRequestIntent=null,_bflBookingRequestSensitiveKey=null,_BFL_BOOKING_REQUEST_STORAGE_KEY="ob_bfl_booking_request_v1";\n' + bflOwnerSource,
  { filename: 'book-later-owner.js' }).runInContext(bflOwnerHarness.sandbox);
const bflOperation = bflOwnerHarness.sandbox.OB_CLIENT_CONTEXT.capture('book-later-submit', {
  expertId: 'expert-bfl-a', expertSlug: 'expert-bfl-a', date: '2026-09-10', time: '14:30',
  channel: 'chat', paymentMode: 'minute', promoCode: 'PROMO-A',
});
assert.equal(bflOwnerHarness.sandbox.obBflTestHooks.operationCurrent(bflOperation), true, 'captured BFL target begins current');
const bflBookingIntent = {
  expertId: 'expert-bfl-a', expertSlug: 'expert-bfl-a', date: '2026-09-10', time: '14:30',
  marketplaceExpertId: '', channel: 'chat', paymentMode: 'minute', promoCode: 'PROMO-A', clientName: 'Client A',
  clientEmail: 'client-a@example.test', notes: 'Same booking intent', cardNumber: '4242424242424242',
};
const firstBookingRequestId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor(bflBookingIntent);
const retryBookingRequestId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor({ ...bflBookingIntent });
assert.equal(retryBookingRequestId, firstBookingRequestId,
  'an exact Book Later retry after response loss reuses the original request identity');
assert.match(firstBookingRequestId, /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/,
  'the opaque Book Later request identity satisfies the backend idempotency contract');
assert.equal(bflOwnerHarness.body.textContent.includes(firstBookingRequestId), false,
  'the Book Later request identity is never rendered into public DOM');
bflOwnerHarness.sandbox.obBflTestHooks.resetRequestIntent();
const reloadBookingRequestId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor({ ...bflBookingIntent });
assert.equal(reloadBookingRequestId, firstBookingRequestId,
  'a same-tab reload recovers the request identity for the same non-sensitive booking target');
const changedSensitiveRequestId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor({
  ...bflBookingIntent, notes: 'Changed during the current page lifetime',
});
assert.notEqual(changedSensitiveRequestId, firstBookingRequestId,
  'a sensitive intent edit in the current page rotates to a new request identity without persisting that edit');
const changedBookingRequestId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor({
  ...bflBookingIntent, time: '15:00',
});
assert.notEqual(changedBookingRequestId, changedSensitiveRequestId,
  'a materially changed Book Later intent rotates to a new request identity');
const marketplaceBookingRequestId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor({
  ...bflBookingIntent, time: '15:00', marketplaceExpertId: 'mini-expert-a',
});
assert.notEqual(marketplaceBookingRequestId, changedBookingRequestId,
  'choosing a marketplace expert rotates the owner-level booking request identity');
const otherMarketplaceBookingRequestId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor({
  ...bflBookingIntent, time: '15:00', marketplaceExpertId: 'mini-expert-b',
});
assert.notEqual(otherMarketplaceBookingRequestId, marketplaceBookingRequestId,
  'two marketplace experts can never collide into one frontend retry identity');
const restoredChangedBookingRequestId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor({
  ...bflBookingIntent, time: '15:00',
});
assert.notEqual(restoredChangedBookingRequestId, otherMarketplaceBookingRequestId,
  'returning from a marketplace expert to the owner also rotates the retry identity');
const storedBookingIntent = bflOwnerHarness.sandbox.sessionStorage.getItem('ob_bfl_booking_request_v1');
assert(storedBookingIntent, 'the retry identity survives response loss in same-tab session storage');
for (const sensitiveValue of [
  bflBookingIntent.clientEmail, bflBookingIntent.clientName, bflBookingIntent.notes,
  bflBookingIntent.promoCode, bflBookingIntent.cardNumber, clientAToken, clientAKey,
]) {
  assert.equal(storedBookingIntent.includes(sensitiveValue), false,
    'persisted Book Later retry state contains no client identity, notes, or credential data');
}
const parsedStoredBookingIntent = JSON.parse(storedBookingIntent);
assert.deepEqual(Object.keys(parsedStoredBookingIntent).sort(), ['intentKey', 'requestId'],
  'persisted Book Later retry state contains only a non-sensitive target key and opaque request ID');
bflOwnerHarness.sandbox.obBflTestHooks.resetRequestIntent();
const reloadWithChangedNotesId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor({
  ...bflBookingIntent, time: '15:00', notes: 'Changed after reload',
});
assert.equal(reloadWithChangedNotesId, restoredChangedBookingRequestId,
  'after reload the client honestly reuses the pending key because sensitive fields were never persisted');
bflOwnerHarness.sandbox.obBflTestHooks.clearRequestIntent();
const deliberateChangedNotesRetryId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor({
  ...bflBookingIntent, time: '15:00', notes: 'Changed after reload',
});
assert.notEqual(deliberateChangedNotesRetryId, reloadWithChangedNotesId,
  'after the backend reports an intent conflict, the next deliberate attempt receives a fresh key');
bflOwnerHarness.sandbox.obBflTestHooks.clearRequestIntent();
assert.equal(bflOwnerHarness.sandbox.sessionStorage.getItem('ob_bfl_booking_request_v1'), null,
  'confirmed success can clear the persisted Book Later retry state');
const originalSessionGet = bflOwnerHarness.sandbox.sessionStorage.getItem;
const originalSessionSet = bflOwnerHarness.sandbox.sessionStorage.setItem;
bflOwnerHarness.sandbox.sessionStorage.getItem = () => { throw new Error('storage unavailable'); };
bflOwnerHarness.sandbox.sessionStorage.setItem = () => { throw new Error('storage unavailable'); };
const memoryOnlyRequestId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor({
  ...bflBookingIntent, time: '15:30',
});
const memoryOnlyRetryId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor({
  ...bflBookingIntent, time: '15:30',
});
assert.equal(memoryOnlyRetryId, memoryOnlyRequestId,
  'when session storage is unavailable, exact retries safely reuse the in-memory request identity');
bflOwnerHarness.sandbox.sessionStorage.getItem = originalSessionGet;
bflOwnerHarness.sandbox.sessionStorage.setItem = originalSessionSet;
const credentialStableRequestId = bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor(bflBookingIntent);
await changeAuth(bflOwnerHarness, clientARotatedToken);
assert.equal(bflOwnerHarness.sandbox.obBflTestHooks.operationCurrent(bflOperation), true, 'same-principal credential rotation preserves the immutable BFL operation');
assert.equal(bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor(bflBookingIntent), credentialStableRequestId,
  'same-principal credential rotation preserves the pending Book Later retry key');
await changeAuth(bflOwnerHarness, clientBToken);
assert.equal(bflOwnerHarness.sandbox.sessionStorage.getItem('ob_bfl_booking_request_v1'), null,
  'a real account switch removes the prior account pending retry state');
assert.notEqual(bflOwnerHarness.sandbox.obBflTestHooks.requestIdFor(bflBookingIntent), credentialStableRequestId,
  'a different account receives a different Book Later request identity');
await changeAuth(bflOwnerHarness, clientAToken);
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
const idlePolicyHarness = createHarness();
idlePolicyHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.adoptConfig({ client_payments: {
  session_authorization_amount_cents: 725,
  session_authorization_currency: 'usd',
  session_authorization_policy_revision: 'policy-public-725-late',
} });
assert.equal(idlePolicyHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.state().loaded, true,
  'late public config becomes authoritative preflight policy');
assert.equal(idlePolicyHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.amountCents, null,
  'an idle controller never mistakes current policy for a transaction snapshot');

for (const [name, configResponse] of [
  ['failed', { ok: false, json: async () => ({ error: 'config unavailable' }) }],
  ['incomplete', { ok: true, json: async () => ({
    publishable_key: 'pk_test_missing_policy',
    session_authorization_amount_cents: 500,
    session_authorization_currency: 'usd',
  }) }],
]) {
  const policyRequests = [];
  const failClosedHarness = createHarness({
    session: { ob_t: clientAToken },
    policyConfig: null,
    fetchImpl: async (url) => {
      policyRequests.push(String(url));
      if (String(url).includes('/api/payments/config')) return configResponse;
      if (String(url).endsWith('/api/payments/authorize')) {
        return { ok: true, json: async () => ({
          payment_intent_id: 'pi_must_not_exist', authorization_request_id: 'request_must_not_exist',
          status: 'requires_capture', amount_authorized_cents: 500, currency: 'usd',
        }) };
      }
      throw new Error(`unexpected ${name} policy request: ${url}`);
    },
  });
  await assert.rejects(
    failClosedHarness.sandbox.obAuthorizeSessionHold({ expertId: 'expert-policy-gate', channel: 'chat', token: clientAToken }),
    /authorization amount is unavailable|config unavailable/i,
    `${name} policy cannot fall back to the built-in default`,
  );
  assert.equal(policyRequests.some((url) => url.endsWith('/api/payments/authorize')), false,
    `${name} policy blocks the authorization request`);
  assert.deepEqual(JSON.parse(JSON.stringify(failClosedHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.state())), {
    loaded: false, revision: 0, serverRevision: null, cents: null, currency: 'usd', source: '',
  }, `${name} policy leaves no stale numeric authority`);
  assert.doesNotMatch(failClosedHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.copy('disclosure-body'), /\$5(?:\.00)?/,
    `${name} policy leaves disclosure amount-neutral`);
}

const staleFreshHarness = createHarness({ session: { ob_t: clientAToken } });
await assert.rejects(
  staleFreshHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.ensureCurrentPolicy(
    'expert-stale-policy', { publishable_key: 'pk_test_stale_without_amount' }, true,
  ),
  /authorization amount is unavailable/i,
  'a stale public amount cannot validate an incomplete fresh payments config',
);
const staleFetchRequests = [];
const staleFetchHarness = createHarness({
  session: { ob_t: clientAToken },
  fetchImpl: async (url) => {
    staleFetchRequests.push(String(url));
    if (String(url).includes('/api/payments/config')) return { ok: false, json: async () => ({ error: 'fresh policy offline' }) };
    if (String(url).endsWith('/api/payments/authorize')) return { ok: true, json: async () => ({ payment_intent_id: 'pi_stale_policy_must_not_authorize' }) };
    throw new Error(`unexpected stale policy request: ${url}`);
  },
});
await assert.rejects(
  staleFetchHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.ensureCurrentPolicy('expert-stale-policy', null, true),
  /fresh policy offline/i,
  'a failed fresh payments-config request cannot silently accept a previously loaded public amount',
);
assert.equal(staleFetchRequests.some((url) => url.endsWith('/api/payments/authorize')), false,
  'a failed fresh policy gate cannot reach authorization');
assert.deepEqual(JSON.parse(JSON.stringify(staleFetchHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.state())), {
  loaded: true, revision: 1, serverRevision: 'policy-default-500-v1', cents: 500, currency: 'usd', source: 'public',
}, 'the prior public amount remains display-only when a fresh action gate fails');

function attachPolicyDisclosure(harness, id) {
  const disclosure = new FakeElement('div');
  disclosure.id = id;
  disclosure.setAttribute('data-ob-session-authorization-copy', 'disclosure');
  harness.body.appendChild(disclosure);
  harness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.render(disclosure);
  return disclosure;
}

// A click consented to the exact revision rendered in its disclosure. If the
// fresh preflight has already changed $5 -> $7.50, the first click only updates
// that disclosure; a second explicit click is required to create the hold.
const preClickRequests = [];
let preClickAuthorizeCalls = 0;
let preClickStripeConfirms = 0;
const preClickHarness = createHarness({
  session: { ob_t: clientAToken },
  fetchImpl: async (url, init = {}) => {
    const request = { url: String(url), body: init.body ? JSON.parse(init.body) : null };
    preClickRequests.push(request);
    if (request.url.includes('/api/payments/config')) return { ok: true, status: 200, json: async () => ({
      publishable_key: 'pk_test_preclick',
      session_authorization_amount_cents: 750,
      session_authorization_currency: 'usd',
      session_authorization_policy_revision: 'policy-preclick-750-v2',
    }) };
    if (request.url.endsWith('/api/payments/authorize')) {
      preClickAuthorizeCalls += 1;
      return { ok: true, status: 200, json: async () => ({
        payment_intent_id: 'pi_preclick_second_click', authorization_request_id: request.body.authorization_request_id,
        status: 'requires_capture', amount_authorized_cents: 750, currency: 'usd',
      }) };
    }
    throw new Error(`unexpected pre-click request: ${url}`);
  },
});
const preClickDisclosure = attachPolicyDisclosure(preClickHarness, 'preclick-policy-disclosure');
const firstPreClickPolicy = preClickHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.disclosedSnapshot(preClickDisclosure);
assert.equal(preClickDisclosure.textContent.includes('$5.00'), true, 'the first click starts from the amount actually disclosed');
await assert.rejects(
  preClickHarness.sandbox.obAuthorizeSessionHold({
    expertId: 'expert-preclick-policy', channel: 'chat', token: clientAToken,
    stripe: { confirmCardPayment: async () => { preClickStripeConfirms += 1; } },
    disclosedPolicy: firstPreClickPolicy,
  }),
  /changed[\s\S]*review[\s\S]*click again/i,
  'a fresh pre-click policy change stops and requires new consent',
);
assert.equal(preClickAuthorizeCalls, 0, 'the first click cannot POST after its disclosed policy changes');
assert.equal(preClickStripeConfirms, 0, 'the first click cannot reach Stripe confirmation');
assert.equal(preClickDisclosure.textContent.includes('$7.50'), true, 'the stopped click rerenders the fresh amount');
const secondPreClickPolicy = preClickHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.disclosedSnapshot(preClickDisclosure);
const preClickApproved = await preClickHarness.sandbox.obAuthorizeSessionHold({
  expertId: 'expert-preclick-policy', channel: 'chat', token: clientAToken,
  stripe: { confirmCardPayment: async () => { preClickStripeConfirms += 1; } },
  disclosedPolicy: secondPreClickPolicy,
});
assert.equal(preClickApproved.amount_authorized_cents, 750, 'the second click may approve the newly disclosed amount');
assert.equal(preClickAuthorizeCalls, 1, 'only the second explicit click creates a hold');
const preClickAuthorizeBody = preClickRequests.find((request) => request.url.endsWith('/api/payments/authorize')).body;
assert.equal(preClickAuthorizeBody.authorization_policy_revision, 'policy-preclick-750-v2',
  'the POST echoes the exact disclosed opaque revision');
for (const amountKey of ['amount', 'amount_cents', 'amount_authorized', 'amount_authorized_cents', 'session_authorization_amount_cents']) {
  assert.equal(Object.hasOwn(preClickAuthorizeBody, amountKey), false, `authorization request never sends ${amountKey}`);
}

// If the policy changes after the fresh GET but before POST, backend 409 creates
// no hold. The client refreshes $50 copy and requires a second click.
let postRaceConfigCalls = 0;
let postRaceAuthorizeCalls = 0;
let postRaceStripeConfirms = 0;
let postRaceCancelCalls = 0;
const postRaceBodies = [];
const postRaceHarness = createHarness({
  session: { ob_t: clientAToken },
  policyConfig: { client_payments: {
    session_authorization_amount_cents: 750,
    session_authorization_currency: 'usd',
    session_authorization_policy_revision: 'policy-post-race-750-v1',
  } },
  fetchImpl: async (url, init = {}) => {
    const requestUrl = String(url);
    if (requestUrl.includes('/api/payments/config')) {
      postRaceConfigCalls += 1;
      const changed = postRaceConfigCalls >= 2;
      return { ok: true, status: 200, json: async () => ({
        publishable_key: 'pk_test_post_race',
        session_authorization_amount_cents: changed ? 5000 : 750,
        session_authorization_currency: 'usd',
        session_authorization_policy_revision: changed ? 'policy-post-race-5000-v2' : 'policy-post-race-750-v1',
      }) };
    }
    if (requestUrl.endsWith('/api/payments/authorize')) {
      const body = JSON.parse(init.body); postRaceBodies.push(body); postRaceAuthorizeCalls += 1;
      if (postRaceAuthorizeCalls === 1) return { ok: false, status: 409, json: async () => ({
        code: 'session_authorization_policy_refresh_required', error: 'Authorization policy changed',
      }) };
      return { ok: true, status: 200, json: async () => ({
        payment_intent_id: 'pi_post_race_second_click', authorization_request_id: body.authorization_request_id,
        status: 'requires_capture', amount_authorized_cents: 5000, currency: 'usd',
      }) };
    }
    if (requestUrl.includes('/api/payments/authorize/cancel')) {
      postRaceCancelCalls += 1;
      return { ok: true, status: 200, json: async () => ({ canceled: true, already_final: false, pending: false }) };
    }
    throw new Error(`unexpected post-race request: ${url}`);
  },
});
const postRaceDisclosure = attachPolicyDisclosure(postRaceHarness, 'post-race-policy-disclosure');
await assert.rejects(
  postRaceHarness.sandbox.obAuthorizeSessionHold({
    expertId: 'expert-post-race', channel: 'chat', token: clientAToken,
    stripe: { confirmCardPayment: async () => { postRaceStripeConfirms += 1; } },
    disclosedPolicy: postRaceHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.disclosedSnapshot(postRaceDisclosure),
  }),
  /changed[\s\S]*review[\s\S]*click again/i,
  'backend stale-policy 409 refreshes the disclosure and stops',
);
assert.equal(postRaceAuthorizeCalls, 1, 'the stale first click sends one revision-guarded POST');
assert.equal(postRaceCancelCalls, 0, 'backend 409 creates no hold that needs release');
assert.equal(postRaceStripeConfirms, 0, 'stale-policy 409 never reaches Stripe confirmation');
assert.equal(postRaceHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.state.paymentIntentId, '',
  'stale-policy 409 leaves no local hold ownership');
assert.equal(postRaceDisclosure.textContent.includes('$50.00'), true, '409 refresh rerenders the new $50 amount');
assert.equal(postRaceBodies[0].authorization_policy_revision, 'policy-post-race-750-v1');
const postRaceApproved = await postRaceHarness.sandbox.obAuthorizeSessionHold({
  expertId: 'expert-post-race', channel: 'chat', token: clientAToken,
  stripe: { confirmCardPayment: async () => { postRaceStripeConfirms += 1; } },
  disclosedPolicy: postRaceHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.disclosedSnapshot(postRaceDisclosure),
});
assert.equal(postRaceApproved.amount_authorized_cents, 5000, 'second click approves the newly disclosed $50 snapshot');
assert.equal(postRaceAuthorizeCalls, 2, 'a second explicit click is required after 409');
assert.equal(postRaceBodies[1].authorization_policy_revision, 'policy-post-race-5000-v2');

// Defensive invariant: even a malformed success cannot be Stripe-confirmed if
// its durable snapshot differs from consent. Release it, refresh, and stop.
let mismatchConfigCalls = 0;
let mismatchAuthorizeCalls = 0;
let mismatchStripeConfirms = 0;
let mismatchHoldOpen = false;
let mismatchCancelCalls = 0;
const mismatchBodies = [];
const mismatchHarness = createHarness({
  session: { ob_t: clientAToken },
  policyConfig: { client_payments: {
    session_authorization_amount_cents: 750,
    session_authorization_currency: 'usd',
    session_authorization_policy_revision: 'policy-mismatch-750-v1',
  } },
  fetchImpl: async (url, init = {}) => {
    const requestUrl = String(url);
    if (requestUrl.includes('/api/payments/config')) {
      mismatchConfigCalls += 1;
      const changed = mismatchConfigCalls >= 2;
      return { ok: true, status: 200, json: async () => ({
        publishable_key: 'pk_test_snapshot_mismatch',
        session_authorization_amount_cents: changed ? 5000 : 750,
        session_authorization_currency: 'usd',
        session_authorization_policy_revision: changed ? 'policy-mismatch-5000-v2' : 'policy-mismatch-750-v1',
      }) };
    }
    if (requestUrl.endsWith('/api/payments/authorize')) {
      const body = JSON.parse(init.body); mismatchBodies.push(body); mismatchAuthorizeCalls += 1; mismatchHoldOpen = true;
      return { ok: true, status: 200, json: async () => ({
        payment_intent_id: `pi_snapshot_mismatch_${mismatchAuthorizeCalls}`,
        authorization_request_id: body.authorization_request_id,
        client_secret: 'pi_snapshot_mismatch_secret',
        status: mismatchAuthorizeCalls === 1 ? 'requires_action' : 'requires_capture',
        amount_authorized_cents: 5000,
        currency: 'usd',
      }) };
    }
    if (requestUrl.includes('/api/payments/authorize/cancel')) {
      mismatchCancelCalls += 1; mismatchHoldOpen = false;
      return { ok: true, status: 200, json: async () => ({ canceled: true, already_final: false, pending: false }) };
    }
    throw new Error(`unexpected snapshot-mismatch request: ${url}`);
  },
});
const mismatchDisclosure = attachPolicyDisclosure(mismatchHarness, 'mismatch-policy-disclosure');
await assert.rejects(
  mismatchHarness.sandbox.obAuthorizeSessionHold({
    expertId: 'expert-snapshot-mismatch', channel: 'chat', token: clientAToken,
    stripe: { confirmCardPayment: async () => { mismatchStripeConfirms += 1; return { paymentIntent: { status: 'requires_capture' } }; } },
    disclosedPolicy: mismatchHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.disclosedSnapshot(mismatchDisclosure),
  }),
  /changed[\s\S]*review[\s\S]*click again/i,
  'mismatched success snapshot is released and requires renewed consent',
);
assert.equal(mismatchStripeConfirms, 0, 'snapshot mismatch is detected before Stripe confirmation');
assert.equal(mismatchCancelCalls, 1, 'the inconsistent unbound hold is explicitly released');
assert.equal(mismatchHoldOpen, false, 'no inconsistent hold leaks after the stopped click');
assert.equal(mismatchDisclosure.textContent.includes('$50.00'), true, 'defensive mismatch refreshes the disclosed amount');
const mismatchApproved = await mismatchHarness.sandbox.obAuthorizeSessionHold({
  expertId: 'expert-snapshot-mismatch', channel: 'chat', token: clientAToken,
  stripe: { confirmCardPayment: async () => { mismatchStripeConfirms += 1; } },
  disclosedPolicy: mismatchHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.disclosedSnapshot(mismatchDisclosure),
});
assert.equal(mismatchApproved.amount_authorized_cents, 5000, 'second click can approve the matching refreshed snapshot');
assert.equal(mismatchBodies[0].authorization_policy_revision, 'policy-mismatch-750-v1');
assert.equal(mismatchBodies[1].authorization_policy_revision, 'policy-mismatch-5000-v2');

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
hooks.state.phase = 'ready'; hooks.state.abandoned = false; hooks.state.amountCents = 500; hooks.state.currency = 'usd'; hooks.state.hasAmountSnapshot = true;
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

let pendingReleaseCalls = 0;
let prematureAuthorizeCalls = 0;
const pendingReleaseHarness = createHarness({
  session: { ob_t: clientAToken },
  fetchImpl: async (url) => {
    const requestUrl = String(url);
    if (requestUrl.endsWith('/api/config')) {
      return { ok: true, status: 200, json: async () => ({ client_payments: { apple_pay_enabled: true, google_pay_enabled: false } }) };
    }
    if (requestUrl.includes('/api/payments/config')) {
      return { ok: true, status: 200, json: async () => ({
        publishable_key: 'pk_test_pending_release',
        session_authorization_amount_cents: 500,
        session_authorization_currency: 'usd',
        session_authorization_policy_revision: 'policy-default-500-v1',
      }) };
    }
    if (requestUrl.endsWith('/api/payments/authorize/cancel')) {
      pendingReleaseCalls += 1;
      return pendingReleaseCalls === 1
        ? { ok: true, status: 200, json: async () => ({ canceled: false, already_final: false, pending: true }) }
        : { ok: true, status: 200, json: async () => ({ canceled: false, already_final: true, pending: false }) };
    }
    if (requestUrl.endsWith('/api/payments/authorize')) {
      prematureAuthorizeCalls += 1;
      throw new Error('a new authorization must not start while release is pending');
    }
    if (requestUrl.endsWith('/api/payments/methods/setup')) {
      return { ok: true, status: 200, json: async () => ({ client_secret: 'seti_pending_release_secret', mode: 'test' }) };
    }
    if (requestUrl.endsWith('/api/payments/methods/default')) {
      return { ok: true, status: 200, json: async () => ({ saved: true }) };
    }
    if (requestUrl.includes('/api/payments/methods/status')) {
      return { ok: true, status: 200, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) };
    }
    throw new Error(`unexpected pending-release request: ${requestUrl}`);
  },
});
const pendingReleaseHooks = pendingReleaseHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
Object.assign(pendingReleaseHooks.state, {
  phase: 'ready',
  paymentIntentId: 'pi_pending_release',
  requestId: 'authorization-pending-release',
  context: 'live:expert-pending-release:owner:chat',
  expertId: 'expert-pending-release',
  channel: 'chat',
  accountKey: clientAKey,
  amountCents: 500,
  currency: 'usd',
  hasAmountSnapshot: true,
});
const pendingRelease = await pendingReleaseHarness.sandbox.obCancelSessionAuthorization('client_cancelled');
assert.equal(pendingRelease.confirmed, false,
  'HTTP 200 with pending=true is not treated as terminal release confirmation');
assert.equal(pendingReleaseHooks.state.phase, 'cancel_retry',
  'a durable pending release remains recoverable in the browser');
await assert.rejects(
  pendingReleaseHarness.sandbox.obAuthorizeSessionHold({
    expertId: 'expert-pending-release',
    channel: 'chat',
    token: clientAToken,
    disclosedPolicy: pendingReleaseHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.consentSnapshot(),
  }),
  (error) => error
    && error.code === 'session_authorization_release_pending'
    && /Release the previous temporary authorization/i.test(error.message),
  'a retry cannot collide with a still-open authorization'
);
assert.equal(prematureAuthorizeCalls, 0,
  'no new authorization request reaches the server while release is pending');

pendingReleaseHarness.sandbox._currentExpertId = 'expert-pending-release';
for (const [tag, elementId] of [['section', 'bov-wallet-section'], ['div', 'bov-wallet-button'], ['div', 'bov-card-error'], ['button', 'bov-pay-btn']]) {
  const element = new FakeElement(tag); element.id = elementId; pendingReleaseHarness.body.appendChild(element);
}
attachPolicyDisclosure(pendingReleaseHarness, 'bov-pay-explainer');
const pendingReleaseExpress = [];
const pendingReleaseStripe = {
  elements() {
    return {
      async submit() { return {}; },
      create() {
        const express = { handlers: {}, on(name, handler) { this.handlers[name] = handler; }, mount() {}, unmount() {}, destroy() {} };
        pendingReleaseExpress.push(express); return express;
      },
    };
  },
  async confirmSetup() { return { setupIntent: { payment_method: 'pm_pending_release' } }; },
};
new vm.Script(walletCoreSource, { filename: 'wallet-pending-release.js' }).runInContext(pendingReleaseHarness.sandbox);
pendingReleaseHarness.sandbox._obMountBovWallet(pendingReleaseStripe);
await settleAsync(24);
assert.equal(pendingReleaseExpress.length, 1, 'pending-release regression mounts one Apple Pay owner');
const pendingReleaseWalletFailures = [];
pendingReleaseExpress[0].handlers.click({ expressPaymentType: 'apple_pay', resolve() {}, reject() {} });
pendingReleaseExpress[0].handlers.confirm({
  expressPaymentType: 'apple_pay',
  paymentFailed(payload) { pendingReleaseWalletFailures.push(payload); },
});
await settleAsync(60);
assert.equal(prematureAuthorizeCalls, 0,
  'Apple Pay cannot create a second hold while the first release remains pending');
assert.equal(pendingReleaseWalletFailures.length, 1,
  'Apple Pay reports exactly one actionable pending-release failure');
const pendingReleaseWalletError = pendingReleaseHarness.document.getElementById('bov-card-error');
assert.equal(pendingReleaseWalletError.dataset.obWalletErrorKind, 'authorization_pending');
assert.equal(pendingReleaseWalletError.dataset.obWalletErrorCode, 'session_authorization_release_pending');
assert.match(pendingReleaseWalletError.textContent, /still being released/i,
  'Apple Pay no longer mislabels a cancellation race as wallet setup failure');
const completedRelease = await pendingReleaseHarness.sandbox.obRetrySessionAuthorizationCancellation();
assert.equal(completedRelease.confirmed, true,
  'already_final=true is accepted as terminal release proof on retry');
assert.equal(pendingReleaseHooks.state.phase, 'idle');
assert.equal(pendingReleaseCalls, 2);

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
assert.doesNotMatch(hooks.expertBillingLabel({ payment_mode: 'prepaid' }, 0), /authorization approved/,
  'expert prepaid label never claims a card authorization');
assert.equal(hooks.expertBillingLabel({ payment_authorization_id: id }, 0), 'Authorization approved',
  'expert billing stays amount-neutral when a legacy session has no durable amount snapshot');
assert.equal(hooks.expertBillingLabel({ payment_authorization_id: id, amount_authorized_cents: 725, currency: 'usd' }, 0), '$7.25 authorization approved',
  'expert billing reads the durable server amount without relying on a legacy payment_method field');

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

// A readiness response that never settles is aborted by its owner. The live payment
// flow then uses the already-entered card instead of leaving the Pay button disabled.
let stalledReadinessSignal;
const stalledReadinessHarness = createHarness({
  session: { ob_t: clientAToken },
  fetchImpl: (url, init = {}) => {
    if (!String(url).includes('/api/payments/methods/status')) throw new Error(`unexpected stalled readiness request: ${url}`);
    stalledReadinessSignal = init.signal;
    return new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const error = new Error('saved payment readiness timed out');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    });
  },
});
const stalledReadinessHooks = stalledReadinessHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
const stalledReadiness = stalledReadinessHooks.refreshSavedPaymentStatus(true, 'expert-stalled-readiness');
await settleAsync();
assert(stalledReadinessSignal && !stalledReadinessSignal.aborted,
  'the current readiness request owns a live abort signal before its deadline');
stalledReadinessHarness.runTimers();
assert.equal(await stalledReadiness, false,
  'a timed-out readiness request safely falls back to entering a payment method');
assert.equal(stalledReadinessSignal.aborted, true, 'the deadline aborts the stalled network owner');
assert.equal(stalledReadinessHooks.savedPayment.loading, null, 'the timed-out request releases the in-flight lock');
assert.equal(stalledReadinessHooks.savedPayment.controller, null, 'the timed-out request releases its abort controller');
assert.equal(stalledReadinessHooks.savedPayment.loaded, true, 'the optional readiness check settles to a usable fallback state');
assert.equal(stalledReadinessHooks.savedPayment.available, false, 'timeout never invents a saved payment method');
assert.equal(stalledReadinessHooks.savedPayment.useSaved, false, 'timeout keeps the entered-card flow active');

// Executable account-isolation regression: A has a saved card, logs out, then B signs up.
const identityRequests = [];
const identityHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: async (url, init = {}) => {
  const request = { url: String(url), authorization: init.headers?.Authorization || '' };
  identityRequests.push(request);
  if (request.url.includes('/api/payments/authorize/cancel')) return { ok: true, json: async () => ({ canceled: true, already_final: false, pending: false }) };
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
identityHooks.state.amountCents = 500;
identityHooks.state.currency = 'usd';
identityHooks.state.hasAmountSnapshot = true;
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

// Personalized public-expert responses are cached per stable principal. A cross-tab
// A -> B switch and logout invalidate both authenticated cache representations, while
// a same-principal credential rotation may retain the already isolated response.
const publicCacheNativeRequests = [];
const publicCacheHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: async (url, init = {}) => {
  const requestUrl = String(url);
  if(!requestUrl.includes('/api/experts/public-cache-expert')) {
    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  const authorization = String(init.headers?.Authorization || '');
  publicCacheNativeRequests.push({ url: requestUrl, authorization });
  const personalizedFor = authorization === `Bearer ${clientAToken}` ? 'client-a'
    : authorization === `Bearer ${clientBToken}` || authorization === `Bearer ${clientBRotatedToken}` ? 'client-b'
      : 'public';
  return new Response(JSON.stringify({ expert: {
    id: 'expert-public-cache', name: 'Public Cache Expert', slug: 'public-cache-expert', personalized_for: personalizedFor,
    chat_free_min_available: personalizedFor === 'client-a' ? 11 : personalizedFor === 'client-b' ? 22 : 15,
  } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
} });
publicCacheHarness.sandbox.obPublicSlugBackoff = { blocked: () => null, mark: () => {}, clear: () => {} };
new vm.Script(publicExpertCacheSource, { filename: 'public-expert-principal-cache.js' }).runInContext(publicCacheHarness.sandbox);
const publicExpertEndpoint = 'https://staging.example/api/experts/public-cache-expert';
const publicCacheA = await publicCacheHarness.sandbox.fetch(publicExpertEndpoint, {
  headers: { Authorization: `Bearer ${clientAToken}` },
}).then((response) => response.json());
assert.equal(publicCacheA.expert.personalized_for, 'client-a');
await changeAuth(publicCacheHarness, clientBToken);
const publicCacheB = await publicCacheHarness.sandbox.fetch(publicExpertEndpoint, {
  headers: { Authorization: `Bearer ${clientBToken}` },
}).then((response) => response.json());
assert.equal(publicCacheB.expert.personalized_for, 'client-b', 'client B cannot receive client A cached personalization');
assert.equal(publicCacheNativeRequests.length, 2, 'A -> B identity change requires a new upstream public-expert request');
const publicCacheBeforeRotation = publicCacheHarness.sandbox.OB_CLIENT_CONTEXT.capture('public-cache-before-rotation');
await changeAuth(publicCacheHarness, clientBRotatedToken);
const publicCacheAfterRotation = publicCacheHarness.sandbox.OB_CLIENT_CONTEXT.capture('public-cache-after-rotation');
assert.equal(publicCacheAfterRotation.principal, publicCacheBeforeRotation.principal,
  'credential rotation retains the same public-expert principal key');
assert.equal(publicCacheAfterRotation.identityGeneration, publicCacheBeforeRotation.identityGeneration,
  'credential rotation retains the public-expert identity generation');
const publicCacheBRotated = await publicCacheHarness.sandbox.fetch(publicExpertEndpoint, {
  headers: { Authorization: `Bearer ${clientBRotatedToken}` },
}).then((response) => response.json());
assert.equal(publicCacheBRotated.expert.personalized_for, 'client-b');
assert.equal(publicCacheNativeRequests.length, 2,
  `same-principal credential rotation preserves the isolated cache entry: ${JSON.stringify(publicCacheNativeRequests)}`);
await changeAuth(publicCacheHarness, null);
const publicCacheAnonymous = await publicCacheHarness.sandbox.fetch(publicExpertEndpoint).then((response) => response.json());
assert.equal(publicCacheAnonymous.expert.personalized_for, 'public');
assert.equal(publicCacheNativeRequests.length, 3, 'logout cannot reuse the authenticated principal response');

// Request init headers replace Request headers. An explicit empty replacement must
// not inherit the original Request bearer or join its personalized cache entry.
const publicOverrideNativeRequests = [];
const publicOverrideHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: async (input, init = {}) => {
  const requestUrl = typeof input === 'string' ? input : String(input?.url || '');
  const effectiveHeaders = init.headers !== undefined ? init.headers : input?.headers;
  const authorization = new Headers(effectiveHeaders || {}).get('Authorization') || '';
  publicOverrideNativeRequests.push({ url: requestUrl, authorization });
  const personalizedFor = authorization === `Bearer ${clientAToken}` ? 'client-a' : 'public';
  return new Response(JSON.stringify({ expert: {
    id: 'expert-public-cache', name: 'Public Cache Expert', slug: 'public-cache-expert', personalized_for: personalizedFor,
    chat_free_min_available: personalizedFor === 'client-a' ? 11 : 15,
  } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
} });
publicOverrideHarness.sandbox.obPublicSlugBackoff = { blocked: () => null, mark: () => {}, clear: () => {} };
new vm.Script(publicExpertCacheSource, { filename: 'public-expert-request-header-override.js' })
  .runInContext(publicOverrideHarness.sandbox);
await publicOverrideHarness.sandbox.fetch(publicExpertEndpoint, {
  headers: { Authorization: `Bearer ${clientAToken}` },
});
const requestWithClientAHeader = new Request(publicExpertEndpoint, {
  headers: { Authorization: `Bearer ${clientAToken}` },
});
const explicitlyAnonymousResponse = await publicOverrideHarness.sandbox.fetch(requestWithClientAHeader, { headers: {} })
  .then((response) => response.json());
assert.equal(explicitlyAnonymousResponse.expert.personalized_for, 'public',
  'explicit init headers replace Request authorization instead of inheriting client A');
assert.deepEqual(publicOverrideNativeRequests.map((request) => request.authorization), [`Bearer ${clientAToken}`, ''],
  'the explicit anonymous override cannot join client A cached personalization');

// The delayed sessionStorage fallback is principal-owned too. Identity changes clear
// it, and even a manually reintroduced stale record cannot be applied under client B.
const storedPayloadHarness = createHarness({ session: { ob_t: clientAToken } });
storedPayloadHarness.sandbox.obPublicSlugBackoff = { blocked: () => null, mark: () => {}, clear: () => {} };
new vm.Script(publicExpertCacheSource, { filename: 'stored-public-expert-cache-identity.js' }).runInContext(storedPayloadHarness.sandbox);
storedPayloadHarness.sandbox.isPublicExpertRoute = () => true;
storedPayloadHarness.sandbox.currentPublicSlug = () => 'public-cache-expert';
storedPayloadHarness.sandbox.sanitizePlaceholders = () => {};
storedPayloadHarness.sandbox.applyAvailability = () => {};
const storedPayloadApplications = [];
storedPayloadHarness.sandbox._applyExpertWebsite = (expert) => { storedPayloadApplications.push(expert.personalized_for); };
new vm.Script(storedPublicExpertCacheSource, { filename: 'stored-public-expert-principal-owner.js' }).runInContext(storedPayloadHarness.sandbox);
storedPayloadHarness.sandbox.storeExpertPayload({
  id: 'expert-public-cache', name: 'Public Cache Expert', slug: 'public-cache-expert',
  personalized_for: 'client-a', chat_free_min_available: 11,
});
const storedClientARecord = storedPayloadHarness.sandbox.sessionStorage.getItem('ob_last_expert_payload');
assert(storedClientARecord, 'client A stored fallback is written with explicit ownership');
await changeAuth(storedPayloadHarness, clientBToken);
assert.equal(storedPayloadHarness.sandbox.sessionStorage.getItem('ob_last_expert_payload'), null,
  'A -> B identity change clears the stored public-expert fallback');
storedPayloadHarness.sandbox.sessionStorage.setItem('ob_last_expert_payload', storedClientARecord);
storedPayloadHarness.sandbox.applyCachedExpert();
assert.deepEqual(storedPayloadApplications, [], 'client B rejects a stale client A stored fallback');

// The later expert-funnel gate has its own payload cache. It must retain data
// across a credential refresh for the same client, but never across A -> B or logout.
const publicGatePayloadHarness = createHarness({ session: { ob_t: clientAToken } });
new vm.Script(publicGateCacheSource, { filename: 'public-gate-principal-payload.js' })
  .runInContext(publicGatePayloadHarness.sandbox);
const gateClientAExpert = {
  id: 'expert-public-cache', name: 'Public Cache Expert', slug: 'public-cache-expert',
  personalized_for: 'client-a', chat_free_min_available: 11,
};
publicGatePayloadHarness.sandbox.setPublicGatePayload('public-cache-expert', gateClientAExpert);
assert.equal(publicGatePayloadHarness.sandbox.getPublicGatePayload('public-cache-expert').personalized_for, 'client-a');
await changeAuth(publicGatePayloadHarness, clientARotatedToken);
assert.equal(publicGatePayloadHarness.sandbox.getPublicGatePayload('public-cache-expert').personalized_for, 'client-a',
  'same-principal credential rotation preserves the public-gate payload');
await changeAuth(publicGatePayloadHarness, clientBToken);
assert.equal(publicGatePayloadHarness.sandbox.getPublicGatePayload('public-cache-expert'), null,
  'client B cannot receive client A public-gate personalization');
publicGatePayloadHarness.sandbox.setPublicGatePayload('public-cache-expert', {
  ...gateClientAExpert, personalized_for: 'client-b', chat_free_min_available: 22,
});
await changeAuth(publicGatePayloadHarness, null);
assert.equal(publicGatePayloadHarness.sandbox.getPublicGatePayload('public-cache-expert'), null,
  'logout cannot receive the authenticated public-gate payload');

const stagingAuthKeySandbox = { Headers, Request };
vm.createContext(stagingAuthKeySandbox);
new vm.Script(stagingAuthKeySource, { filename: 'staging-request-auth-key.js' }).runInContext(stagingAuthKeySandbox);
const stagedRequest = new Request(publicExpertEndpoint, { headers: { Authorization: 'Bearer request-object-token' } });
assert.equal(stagingAuthKeySandbox.authKey(stagedRequest), 'Bearer request-object-token',
  'staging cache isolates Request-object authorization instead of treating it as public');
assert.equal(stagingAuthKeySandbox.authKey(stagedRequest, { headers: {} }), '',
  'staging cache treats explicit init headers as a replacement for Request headers');
assert.equal(stagingAuthKeySandbox.authKey(stagedRequest, { headers: null }), null,
  'invalid explicit init headers bypass the staging cache and reach native fetch validation');
assert.match(html, /var key = cacheKey\(url, input, init\);\s*if\(key === null\) return sourceFetch\(input, init\);/,
  'the staging hot-GET owner cannot satisfy an invalid headers override from cache');

// A response already in flight when the account changes is ignored before it can be
// inserted or applied. The lifecycle owner immediately starts a current-principal reload.
const pendingPublicExpertResponses = new Map();
const publicLoaderNativeRequests = [];
const publicLoaderHarness = createHarness({ session: { ob_t: clientAToken }, fetchImpl: (url, init = {}) => {
  const requestUrl = String(url);
  if(!requestUrl.includes('/api/experts/public-cache-expert')) {
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }
  const authorization = String(init.headers?.Authorization || '');
  publicLoaderNativeRequests.push({ url: requestUrl, authorization });
  return new Promise((resolve) => { pendingPublicExpertResponses.set(authorization, resolve); });
} });
publicLoaderHarness.sandbox.obPublicSlugBackoff = { blocked: () => null, mark: () => {}, clear: () => {} };
publicLoaderHarness.sandbox.__obPublicExpertLoadState = { inFlight: {}, recent: {} };
new vm.Script(publicExpertCacheSource, { filename: 'public-expert-principal-cache-loader-harness.js' }).runInContext(publicLoaderHarness.sandbox);
new vm.Script(publicExpertHelpersSource, { filename: 'public-expert-loader-helpers.js' }).runInContext(publicLoaderHarness.sandbox);
publicLoaderHarness.sandbox._browseExpert = 'public-cache-expert';
publicLoaderHarness.sandbox._markRouteLoading = () => {};
publicLoaderHarness.sandbox._markRouteReady = () => {};
const appliedPublicExpertPrincipals = [];
publicLoaderHarness.sandbox.obApplyPublicExpertPayload = (expert, slug) => {
  appliedPublicExpertPrincipals.push(expert.personalized_for || 'public');
  publicLoaderHarness.sandbox._currentExpert = expert;
  publicLoaderHarness.sandbox._currentExpertSlug = slug;
  return expert;
};
new vm.Script(publicExpertLoaderSource, { filename: 'public-expert-principal-loader.js' }).runInContext(publicLoaderHarness.sandbox);
const staleClientALoad = publicLoaderHarness.sandbox.loadExpertWebsite('public-cache-expert');
await settleAsync();
assert(pendingPublicExpertResponses.has(`Bearer ${clientAToken}`), 'client A public-expert request is in flight');
await changeAuth(publicLoaderHarness, clientBToken);
assert(pendingPublicExpertResponses.has(`Bearer ${clientBToken}`), 'identity change starts a fresh client B request');
pendingPublicExpertResponses.get(`Bearer ${clientAToken}`)(new Response(JSON.stringify({ expert: {
  id: 'expert-public-cache', name: 'Public Cache Expert', slug: 'public-cache-expert',
  personalized_for: 'client-a', chat_free_min_available: 11,
} }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
await staleClientALoad;
assert.deepEqual(appliedPublicExpertPrincipals, [], 'stale in-flight client A payload is ignored after the switch');
pendingPublicExpertResponses.get(`Bearer ${clientBToken}`)(new Response(JSON.stringify({ expert: {
  id: 'expert-public-cache', name: 'Public Cache Expert', slug: 'public-cache-expert',
  personalized_for: 'client-b', chat_free_min_available: 22,
} }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
await settleAsync(32);
assert.deepEqual(appliedPublicExpertPrincipals, ['client-b'], 'only the current client B personalization is applied');
await changeAuth(publicLoaderHarness, clientBRotatedToken);
await publicLoaderHarness.sandbox.loadExpertWebsite('public-cache-expert');
assert.equal(publicLoaderNativeRequests.length, 2, 'loader cache survives a same-principal credential rotation');
await changeAuth(publicLoaderHarness, null);
assert.equal(publicLoaderHarness.sandbox._currentExpert.chat_free_min_available, 0,
  'logout neutralizes the prior client personalized availability before the anonymous reload');
assert(pendingPublicExpertResponses.has(''), 'logout starts an anonymous public-expert reload');
pendingPublicExpertResponses.get('')(new Response(JSON.stringify({ expert: {
  id: 'expert-public-cache', name: 'Public Cache Expert', slug: 'public-cache-expert',
  personalized_for: 'public', chat_free_min_available: 15,
} }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
await settleAsync(32);
assert.deepEqual(appliedPublicExpertPrincipals, ['client-b', 'public'], 'anonymous public state replaces client B personalization after logout');

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
rotationHooks.state.amountCents = 500;
rotationHooks.state.currency = 'usd';
rotationHooks.state.hasAmountSnapshot = true;
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
const rotatingAuthorizationHarness = createHarness({
  session: { ob_t: clientAToken },
  policyConfig: { client_payments: {
    session_authorization_amount_cents: 725,
    session_authorization_currency: 'usd',
    session_authorization_policy_revision: 'policy-rotation-725-v1',
  } },
  fetchImpl: (url, init = {}) => {
  const request = { url: String(url), authorization: init.headers?.Authorization || '', body: init.body ? JSON.parse(init.body) : null };
  rotatingAuthorizationRequests.push(request);
  if (request.url.includes('/api/payments/config')) {
    return Promise.resolve({ ok: true, status: 200, json: async () => ({
      publishable_key: 'pk_test_rotation', session_authorization_amount_cents: 725,
      session_authorization_currency: 'usd', session_authorization_policy_revision: 'policy-rotation-725-v1',
    }) });
  }
  if (request.url.endsWith('/api/payments/authorize')) {
    return new Promise((resolve) => { resolveRotatingAuthorization = resolve; });
  }
  if (request.url.includes('/api/payments/methods/status')) {
    return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) });
  }
  if (request.url.includes('/api/payments/authorize/cancel')) {
    return Promise.resolve({ ok: true, json: async () => ({ canceled: true, already_final: false, pending: false }) });
  }
  throw new Error(`unexpected rotating-authorization request: ${request.url}`);
} });
const rotatingAuthorizationHooks = rotatingAuthorizationHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
const rotatingAuthorizationPromise = rotatingAuthorizationHarness.sandbox.obAuthorizeSessionHold({
  expertId: 'expert-rotation-in-flight', channel: 'chat', token: clientAToken,
  disclosedPolicy: rotatingAuthorizationHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.consentSnapshot(),
});
await settleAsync();
assert(resolveRotatingAuthorization, 'authorization request is pending before the credential rotates');
await changeAuth(rotatingAuthorizationHarness, clientARotatedToken);
resolveRotatingAuthorization({ ok: true, json: async () => ({
  payment_intent_id: 'pi_rotation_in_flight', authorization_request_id: 'request_rotation_in_flight',
  status: 'requires_capture', amount_authorized_cents: 725, amount_authorized: 7.25, currency: 'usd',
}) });
const rotatingAuthorization = await rotatingAuthorizationPromise;
assert.equal(rotatingAuthorization.payment_intent_id, 'pi_rotation_in_flight',
  'same-principal rotation accepts the already-approved in-flight authorization');
assert.equal(rotatingAuthorizationHooks.state.phase, 'ready',
  'same-principal rotation leaves the approved hold ready for the session request');
assert.equal(rotatingAuthorization.amount_authorized_cents, 725,
  'authorization result exposes the exact server-returned integer cents');
assert.equal(rotatingAuthorization.amount_authorized, 7.25,
  'dollar display is derived from the transaction cents snapshot');
assert.equal(rotatingAuthorization.currency, 'usd');
assert.equal(rotatingAuthorizationHooks.state.amountCents, 725,
  'live controller retains the server transaction amount instead of current config');
assert.equal(rotatingAuthorizationRequests.filter((request) => request.url.endsWith('/api/payments/authorize')).length, 1,
  'same-principal rotation does not create a duplicate authorization');
assert.equal(rotatingAuthorizationRequests.some((request) => request.url.includes('/api/payments/authorize/cancel')), false,
  'same-principal rotation does not release the approved in-flight hold');
assert.equal(rotatingAuthorizationRequests.find((request) => request.url.endsWith('/api/payments/authorize')).authorization, `Bearer ${clientAToken}`,
  'the in-flight authorization uses its immutable originating credential throughout');
assert.equal(Object.hasOwn(rotatingAuthorizationRequests.find((request) => request.url.endsWith('/api/payments/authorize')).body, 'amount'), false,
  'the real authorization request body contains no client-selected dollar amount');
assert.equal(Object.hasOwn(rotatingAuthorizationRequests.find((request) => request.url.endsWith('/api/payments/authorize')).body, 'amount_cents'), false,
  'the real authorization request body contains no client-selected cents amount');
const immutableApprovedButton = new FakeElement('button'); immutableApprovedButton.id = 'bov-pay-btn';
const immutableApprovedBadge = new FakeElement('div'); immutableApprovedBadge.id = 'bov-step-pay-badge';
immutableApprovedButton.setAttribute('data-ob-session-authorization-copy', 'disclosure');
immutableApprovedBadge.setAttribute('data-ob-session-authorization-copy', 'disclosure');
rotatingAuthorizationHarness.body.append(immutableApprovedButton, immutableApprovedBadge);
rotatingAuthorizationHooks.completeMainAuthorizationUi();
assert.equal(immutableApprovedBadge.textContent, '✓ $7.25 authorization approved',
  'approved UI renders the immutable transaction snapshot');
assert.equal(immutableApprovedBadge.getAttribute('data-ob-session-authorization-copy'), null,
  'approved UI is not registered for current-policy rendering');
assert.equal(immutableApprovedButton.getAttribute('data-ob-session-authorization-copy'), null,
  'approved action copy is detached from current-policy rendering');
rotatingAuthorizationHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.setConfigured(1000, 'usd');
assert.equal(rotatingAuthorizationHooks.state.amountCents, 725,
  'changing configured policy cannot mutate an already-approved hold');
assert.equal(immutableApprovedBadge.textContent, '✓ $7.25 authorization approved',
  'post-authorization policy changes cannot rewrite an approved transaction node');
assert.equal(rotatingAuthorizationHarness.sandbox.obCreditPreSessionPaymentLabel(0), '$7.25 temporary authorization approved',
  'post-authorization pre-session copy remains bound to the same immutable snapshot');
assert.equal(rotatingAuthorizationHarness.sandbox.obGetSessionAuthorizationForRequest('expert-rotation-in-flight', 'chat').amount_authorized_cents, 725,
  'session handoff continues to use the immutable transaction snapshot after a policy change');

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
const walletElementsOptions = [];
const walletConfirmSetupCalls = [];
const walletStripe = {
  elements(options) {
    walletElementsOptions.push(options);
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
assert.equal(walletElementsOptions.length, 2, 'BOV and BFL each create one deferred Elements owner');
for (const options of walletElementsOptions) {
  assert.equal(options.mode, 'setup', 'wallet Elements uses setup mode');
  assert.equal(options.currency, 'usd', 'wallet Elements uses the SetupIntent currency contract');
  assert.equal(Object.hasOwn(options, 'paymentMethodTypes'), false,
    'wallet Elements leaves dynamic payment-method selection to the server SetupIntent');
  assert.equal(options.setupFutureUsage, 'off_session', 'wallet Elements matches the server off-session SetupIntent usage');
}
const currentWalletClicks = walletExpressElements.map((express) => ({ express, resolved: 0, rejected: 0 }));
const currentWalletTypes = ['apple_pay', 'google_pay'];
for (const [index, click] of currentWalletClicks.entries()) {
  click.express.handlers.click({
    expressPaymentType: currentWalletTypes[index],
    resolve() { click.resolved += 1; },
    reject() { click.rejected += 1; },
  });
  assert.equal(click.resolved, 1, 'a current Express Checkout click is resolved synchronously so the wallet sheet can open');
  assert.equal(click.rejected, 0, 'a current Express Checkout click is not rejected');
}
walletExpressElements[0].handlers.confirm({ expressPaymentType: 'apple_pay', paymentFailed() {} });
walletExpressElements[1].handlers.confirm({ expressPaymentType: 'google_pay', paymentFailed() {} });
for (let turn = 0; turn < 30 && walletASetupResolvers.length < 2; turn += 1) await Promise.resolve();
assert.equal(walletASetupResolvers.length, 2, 'both client A wallet confirms are paused at their captured SetupIntent request');
await changeAuth(walletHarness, null);
await changeAuth(walletHarness, clientBToken);
for (const click of currentWalletClicks) {
  click.express.handlers.click({
    resolve() { click.resolved += 1; },
    reject() { click.rejected += 1; },
  });
  assert.equal(click.resolved, 1, 'a stale Express Checkout click cannot reopen the wallet sheet after account change');
  assert.equal(click.rejected, 1, 'a stale Express Checkout click is rejected when Stripe exposes the rejection callback');
}
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
for (const [index, express] of clientBWallets.entries()) {
  express.handlers.click({
    expressPaymentType: currentWalletTypes[index],
    resolve() {},
    reject() { throw new Error('a current client B wallet click must not be rejected'); },
  });
  express.handlers.confirm({ expressPaymentType: currentWalletTypes[index], paymentFailed() {} });
}
await settleAsync(50);
const rotatedSetupRequests = walletRequests.filter((request) => (
  request.url.endsWith('/api/payments/methods/setup')
  && request.authorization === `Bearer ${clientBRotatedToken}`
));
assert.equal(rotatedSetupRequests.length, 2,
  'current Apple Pay and Google Pay confirms each create exactly one SetupIntent');
assert.equal(walletConfirmSetupCalls.length, 2,
  'current Apple Pay and Google Pay confirms each reach Stripe confirmSetup exactly once');
const rotatedDefaultRequests = walletRequests.filter((request) => request.url.endsWith('/api/payments/methods/default'));
assert.equal(rotatedDefaultRequests.length, 2, 'the current BOV and BFL wallet confirms each save their returned payment method');
assert(rotatedDefaultRequests.every((request) => request.authorization === `Bearer ${clientBRotatedToken}`),
  'new wallet confirms capture and use the rotated credential for every API call');
assert.equal(walletHoldCalls.length, 1, 'only the current BOV wallet creates a live authorization hold');
assert.equal(walletHoldCalls[0].token, clientBRotatedToken, 'the BOV hold uses the exact credential captured for the current wallet operation');
assert.equal(walletUiCompletions, 1, 'only the current BOV wallet advances the payment UI');
assert.equal(walletHarness.sandbox._bflWalletPaymentSavedToken, clientBRotatedToken, 'BFL saved-wallet readiness is bound to the current credential');
const successfulConfirmStages = walletHarness.sandbox.obWalletTestHooks.walletStageTraces
  .filter((trace) => trace.stage === 'stripe_confirm_started' || trace.stage === 'completed');
for (const paymentType of currentWalletTypes) {
  assert(successfulConfirmStages.some((trace) => trace.stage === 'stripe_confirm_started' && trace.paymentType === paymentType),
    `${paymentType}: shared wallet path records that Stripe confirmation was reached`);
  assert(successfulConfirmStages.some((trace) => trace.stage === 'completed' && trace.paymentType === paymentType),
    `${paymentType}: shared wallet path records successful completion`);
}
const issuerDescriptor = walletHarness.sandbox.obWalletTestHooks.walletErrorDescriptor(
  { type: 'card_error', code: 'card_declined', decline_code: 'do_not_honor' }, 'stripe_confirm');
assert.deepEqual(JSON.parse(JSON.stringify(issuerDescriptor)), {
  kind: 'issuer_decline', code: 'do_not_honor', paymentReason: 'fail',
  message: 'Your bank did not approve this wallet payment method. Try another payment method or contact your bank.',
}, 'only a real Stripe decline is presented as an issuer decline');
const integrationDescriptor = walletHarness.sandbox.obWalletTestHooks.walletErrorDescriptor(
  { type: 'invalid_request_error', code: 'parameter_invalid_empty' }, 'stripe_confirm');
assert.deepEqual(JSON.parse(JSON.stringify(integrationDescriptor)), {
  kind: 'integration_error', code: 'parameter_invalid_empty', paymentReason: 'invalid_payment_data',
  message: 'Wallet setup could not be completed. Please refresh and try again.',
}, 'a local deferred-Elements contract failure is not mislabeled as a bank decline');
const pendingAuthorizationDescriptor = walletHarness.sandbox.obWalletTestHooks.walletErrorDescriptor(
  { code: 'session_authorization_open_exists' }, 'success_continuation');
assert.deepEqual(JSON.parse(JSON.stringify(pendingAuthorizationDescriptor)), {
  kind: 'authorization_pending', code: 'session_authorization_open_exists', paymentReason: 'invalid_payment_data',
  message: 'A previous temporary authorization is still being released. Confirm its release before trying again.',
}, 'a later authorization collision is not mislabeled as a wallet setup failure');
const networkDescriptor = walletHarness.sandbox.obWalletTestHooks.walletErrorDescriptor(
  { type: 'api_connection_error', message: 'network unavailable' }, 'stripe_confirm');
assert.deepEqual(JSON.parse(JSON.stringify(networkDescriptor)), {
  kind: 'network_error', code: 'api_connection_error', paymentReason: 'invalid_payment_data',
  message: 'We could not reach the secure payment service. Check your connection and try again.',
}, 'network failures remain distinct from issuer and integration failures');
for (const code of ['card_declined', 'do_not_honor', 'insufficient_funds', 'lost_card', 'stolen_card']) {
  assert.equal(walletHarness.sandbox.obWalletTestHooks.walletErrorDescriptor({ code }, 'success_continuation').kind, 'issuer_decline',
    `${code}: a finite flattened issuer code remains an issuer decline`);
}
for (const code of ['expired_card', 'incorrect_cvc', 'authentication_required']) {
  assert.equal(walletHarness.sandbox.obWalletTestHooks.walletErrorDescriptor({ code }, 'success_continuation').kind, 'payment_method_error',
    `${code}: card validation and authentication errors are not mislabeled as issuer declines`);
}
assert.notEqual(
  walletHarness.sandbox.obWalletTestHooks.walletErrorDescriptor({ code: 'processing_error' }, 'success_continuation').kind,
  'issuer_decline',
  'processing_error is never inferred to be an issuer decline',
);
await changeAuth(walletHarness, clientAToken);
assert(clientBWallets.every((express) => express.unmounts === 1 && express.destroys === 1),
  'a later true identity change destroys client B wallet elements');
assert.equal(Object.keys(walletHarness.sandbox.obWalletTestHooks.walletMounts).length, 0, 'wallet owner registry is empty after identity teardown');

// A real decline from the post-wallet temporary authorization keeps Stripe's
// structured fields through the authorization owner and reaches ECE as an issuer decline.
const walletHoldDeclineRequests = [];
const walletHoldDeclineHarness = createHarness({
  session: { ob_t: clientAToken },
  fetchImpl: async (url, init = {}) => {
    const request = { url: String(url), body: init.body ? JSON.parse(init.body) : null };
    walletHoldDeclineRequests.push(request);
    if (request.url.endsWith('/api/config')) return { ok: true, status: 200, json: async () => ({ client_payments: { apple_pay_enabled: true, google_pay_enabled: true } }) };
    if (request.url.includes('/api/payments/config')) return { ok: true, status: 200, json: async () => ({
      publishable_key: 'pk_test_wallet_hold_decline', session_authorization_amount_cents: 500,
      session_authorization_currency: 'usd', session_authorization_policy_revision: 'policy-default-500-v1',
    }) };
    if (request.url.endsWith('/api/payments/methods/setup')) return { ok: true, status: 200, json: async () => ({ client_secret: 'seti_wallet_hold_decline_secret', mode: 'test' }) };
    if (request.url.endsWith('/api/payments/authorize')) return { ok: true, status: 200, json: async () => ({
      payment_intent_id: 'pi_wallet_hold_decline', authorization_request_id: request.body.authorization_request_id,
      client_secret: 'pi_wallet_hold_decline_secret', status: 'requires_action',
      amount_authorized_cents: 500, currency: 'usd',
    }) };
    if (request.url.endsWith('/api/payments/authorize/cancel')) return { ok: true, status: 200, json: async () => ({ canceled: true, already_final: false, pending: false }) };
    if (request.url.includes('/api/payments/methods/status')) return { ok: true, status: 200, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) };
    return { ok: true, status: 200, json: async () => ({}) };
  },
});
walletHoldDeclineHarness.sandbox._currentExpertId = 'expert-wallet-hold-decline';
for (const [tag, id] of [['section', 'bov-wallet-section'], ['div', 'bov-wallet-button'], ['div', 'bov-card-error'], ['button', 'bov-pay-btn']]) {
  const element = new FakeElement(tag); element.id = id; walletHoldDeclineHarness.body.appendChild(element);
}
attachPolicyDisclosure(walletHoldDeclineHarness, 'bov-pay-explainer');
const walletHoldDeclineExpress = [];
const walletHoldDeclineStripe = {
  elements(options) {
    assert.equal(Object.hasOwn(options, 'paymentMethodTypes'), false);
    assert.equal(options.setupFutureUsage, 'off_session');
    return {
      async submit() { return {}; },
      create() {
        const express = { handlers: {}, on(name, handler) { this.handlers[name] = handler; }, mount() {}, unmount() {}, destroy() {} };
        walletHoldDeclineExpress.push(express); return express;
      },
    };
  },
  async confirmSetup() { return { setupIntent: { payment_method: 'pm_wallet_hold_decline' } }; },
  async confirmCardPayment() {
    return { error: {
      type: 'card_error', code: 'card_declined', decline_code: 'insufficient_funds',
      message: 'The issuer declined the temporary authorization.',
    } };
  },
};
new vm.Script(walletCoreSource, { filename: 'wallet-hold-decline.js' }).runInContext(walletHoldDeclineHarness.sandbox);
walletHoldDeclineHarness.sandbox._obSaveDefaultPaymentMethod = async () => {};
const realWalletHold = walletHoldDeclineHarness.sandbox.obAuthorizeSessionHold;
let wrappedWalletHoldError = null;
walletHoldDeclineHarness.sandbox.obAuthorizeSessionHold = async (options) => {
  try { return await realWalletHold(options); }
  catch (error) { wrappedWalletHoldError = error; throw error; }
};
walletHoldDeclineHarness.sandbox._obMountBovWallet(walletHoldDeclineStripe);
await settleAsync(24);
assert.equal(walletHoldDeclineExpress.length, 1, 'decline regression mounts one BOV Express Checkout owner');
const walletHoldPaymentFailures = [];
walletHoldDeclineExpress[0].handlers.click({ expressPaymentType: 'apple_pay', resolve() {}, reject() {} });
walletHoldDeclineExpress[0].handlers.confirm({
  expressPaymentType: 'apple_pay',
  paymentFailed(payload) { walletHoldPaymentFailures.push(payload); },
});
await settleAsync(80);
assert(wrappedWalletHoldError, 'the authorization wrapper returns the Stripe decline to the wallet owner');
assert.equal(wrappedWalletHoldError.type, 'card_error', 'authorization wrapper preserves Stripe error type');
assert.equal(wrappedWalletHoldError.code, 'card_declined', 'authorization wrapper preserves Stripe error code');
assert.equal(wrappedWalletHoldError.decline_code, 'insufficient_funds', 'authorization wrapper preserves Stripe decline_code separately');
assert.equal(walletHoldPaymentFailures.length, 1, 'the failed temporary authorization reports one ECE failure');
assert.equal(walletHoldPaymentFailures[0].reason, 'fail', 'a real issuer decline uses the ECE issuer-failure reason');
const walletHoldErrorElement = walletHoldDeclineHarness.document.getElementById('bov-card-error');
assert.equal(walletHoldErrorElement.dataset.obWalletErrorKind, 'issuer_decline', 'the wallet UI identifies the hold failure as an issuer decline');
assert.equal(walletHoldErrorElement.dataset.obWalletErrorCode, 'insufficient_funds', 'the wallet UI retains the safe Stripe decline code');
assert.equal(walletHoldDeclineRequests.filter((request) => request.url.endsWith('/api/payments/authorize/cancel')).length, 1,
  'the declined temporary authorization is explicitly released once');

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
  stageExpress[0].handlers.confirm({ expressPaymentType: 'apple_pay', paymentFailed() { throw new Error(`${pauseStage}: current same-principal flow must not fail silently`); } });
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

// Peer fallback consumes the same Voice/Video stream granted by the scheduled
// preflight. It cannot prompt for devices a second time or leak the first stream.
async function assertPeerScheduledPreflightHandoff(channel) {
  const harness = createHarness({ session: { ob_t: clientAToken } });
  harness.sandbox.OWNLY_CONFIG = { rtc: {} };
  let getUserMediaCalls = 0;
  harness.sandbox.navigator = { mediaDevices: { getUserMedia: async () => { getUserMediaCalls += 1; throw new Error('unexpected second media request'); } } };
  harness.sandbox.RTCPeerConnection = class {
    constructor() { this.connectionState = 'new'; this.iceConnectionState = 'new'; this.signalingState = 'stable'; this.remoteDescription = null; }
    addTrack() {}
    close() { this.connectionState = 'closed'; }
    async createOffer() { return { type: 'offer', sdp: `offer-${channel}` }; }
    async createAnswer() { return { type: 'answer', sdp: `answer-${channel}` }; }
    async setLocalDescription(description) { this.localDescription = description; this.signalingState = description.type === 'offer' ? 'have-local-offer' : 'stable'; }
    async setRemoteDescription(description) { this.remoteDescription = description; }
    async addIceCandidate() {}
  };
  const stopped = [];
  const audioTrack = { kind: 'audio', readyState: 'live', enabled: true, stop() { this.readyState = 'ended'; stopped.push('audio'); } };
  const videoTrack = { kind: 'video', readyState: 'live', enabled: true, stop() { this.readyState = 'ended'; stopped.push('video'); } };
  const tracks = channel === 'video' ? [audioTrack, videoTrack] : [audioTrack];
  const stream = {
    getTracks: () => tracks,
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => channel === 'video' ? [videoTrack] : [],
  };
  harness.sandbox._obClientMediaReadyStream = stream;
  harness.sandbox._obClientMediaReadyChannel = channel;
  harness.sandbox._obRtcPrewarmedStream = stream;
  harness.sandbox._obClientWs = { readyState: 1, send() {}, close() {} };
  new vm.Script(rtcModuleSource, { filename: `ownlybiz-rtc-scheduled-${channel}.js` }).runInContext(harness.sandbox);
  assert.equal(harness.sandbox.OB_RTC.setScheduledPreflightStream(stream, `scheduled-${channel}`, channel, 'client'), true,
    `${channel} preflight registers with the exact RTC session owner`);
  assert.equal(await harness.sandbox.OB_RTC.start(`scheduled-${channel}`, channel, 'client'), true,
    `${channel} peer fallback starts with its scheduled preflight stream`);
  assert.equal(getUserMediaCalls, 0, `${channel} peer fallback does not request devices twice`);
  assert.equal(harness.sandbox._obClientMediaReadyStream, null, `${channel} transfers preflight stream ownership into RTC`);
  assert.equal(harness.sandbox._obRtcPrewarmedStream, null, `${channel} clears the transferred global prewarm reference`);
  assert.deepEqual(stopped, [], `${channel} stream remains live during RTC startup`);
  harness.sandbox.OB_RTC.cleanup();
  assert.deepEqual(stopped, channel === 'video' ? ['audio', 'video'] : ['audio'], `${channel} RTC cleanup stops the transferred stream exactly once`);
  harness.sandbox.OB_RTC.cleanup();
  assert.deepEqual(stopped, channel === 'video' ? ['audio', 'video'] : ['audio'], `${channel} repeated cleanup cannot stop transferred tracks twice`);
}
await assertPeerScheduledPreflightHandoff('voice');
await assertPeerScheduledPreflightHandoff('video');

// Execute the installed SFU patch with a deliberately slow preparation. A poll
// refresh starts the same client media again before preparation fails. The client
// owner must share one start while base RTC retains the exact fallback stream.
async function assertDuplicateStartDuringSfuFailureUsesScheduledHandoff(channel) {
  const sfuConfig = {
    rtc: { one_to_one: { sfu_enabled: true, mode: 'sfu', sfu_url: 'https://media.example', fallback_enabled: true } },
  };
  const harness = createHarness({
    session: { ob_t: clientAToken },
    fetchImpl: async (url) => {
      assert(String(url).endsWith('/api/config'), `${channel} SFU patch only reads media configuration`);
      return { ok: true, json: async () => sfuConfig };
    },
  });
  harness.sandbox.OWNLY_CONFIG = { rtc: {} };
  harness.sandbox.performance = { now: () => 100 };
  harness.sandbox.TextEncoder = TextEncoder;
  harness.sandbox.TextDecoder = TextDecoder;
  let mediaRequests = 0;
  const audioTrack = {
    id: `sfu-fallback-${channel}-audio`, kind: 'audio', readyState: 'live', enabled: true, stopCalls: 0,
    stop() { this.stopCalls += 1; this.readyState = 'ended'; },
  };
  const videoTrack = {
    id: `sfu-fallback-${channel}-video`, kind: 'video', readyState: 'live', enabled: true, stopCalls: 0,
    stop() { this.stopCalls += 1; this.readyState = 'ended'; },
  };
  const tracks = channel === 'video' ? [audioTrack, videoTrack] : [audioTrack];
  const stream = {
    getTracks: () => tracks,
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => channel === 'video' ? [videoTrack] : [],
  };
  harness.sandbox.navigator = {
    userAgent: 'Mozilla/5.0 Chrome/140.0.0.0',
    mediaDevices: { getUserMedia: async () => { mediaRequests += 1; return stream; } },
  };
  const addedStreams = [];
  harness.sandbox.RTCPeerConnection = class {
    constructor() { this.connectionState = 'new'; this.iceConnectionState = 'new'; this.signalingState = 'stable'; this.remoteDescription = null; }
    addTrack(track, ownedStream) { addedStreams.push({ track, stream: ownedStream }); }
    close() { this.connectionState = 'closed'; }
    async createOffer() { return { type: 'offer', sdp: `sfu-fallback-offer-${channel}` }; }
    async createAnswer() { return { type: 'answer', sdp: `sfu-fallback-answer-${channel}` }; }
    async setLocalDescription(description) { this.localDescription = description; this.signalingState = description.type === 'offer' ? 'have-local-offer' : 'stable'; }
    async setRemoteDescription(description) { this.remoteDescription = description; }
    async addIceCandidate() {}
  };
  const sfuSockets = [];
  class DelayedSfuPrepareSocket {
    constructor(url) {
      this.url = String(url); this.readyState = 0;
      assert(this.url.endsWith('/sfu'), `${channel} delayed failure targets the SFU preparation socket`);
      sfuSockets.push(this);
    }
    send() {}
    fail() { if (this.onerror) this.onerror(new Error('forced delayed SFU preparation failure')); }
    close() { this.readyState = 3; if (this.onclose) this.onclose(); }
  }
  DelayedSfuPrepareSocket.OPEN = 1;
  DelayedSfuPrepareSocket.CONNECTING = 0;
  DelayedSfuPrepareSocket.CLOSED = 3;
  harness.sandbox.WebSocket = DelayedSfuPrepareSocket;
  harness.sandbox._obClientWs = { readyState: 1, send() {}, close() {} };

  const scheduledStream = await harness.sandbox.navigator.mediaDevices.getUserMedia(
    channel === 'video' ? { audio: true, video: true } : { audio: true, video: false },
  );
  new vm.Script(rtcModuleSource, { filename: `ownlybiz-rtc-sfu-fallback-${channel}.js` }).runInContext(harness.sandbox);
  const sessionId = `scheduled-sfu-fallback-${channel}`;
  assert.equal(harness.sandbox.OB_RTC.setScheduledPreflightStream(scheduledStream, sessionId, channel, 'client'), true);
  new vm.Script(sfuClientSource, { filename: `assets/sfu-client-${channel}.js` }).runInContext(harness.sandbox);
  assert.equal(harness.sandbox.OB_RTC.__obSfuPatched, true, `${channel} regression executes the installed SFU patch`);
  assert.equal(harness.sandbox.ExpertSfuClient.setPrewarmedStream('client', scheduledStream, channel), true);
  harness.sandbox._obRtcPrewarmedStream = scheduledStream;
  new vm.Script(clientRtcStartOwnerSource, { filename: `client-rtc-start-owner-${channel}.js` }).runInContext(harness.sandbox);
  const installedRtcStart = harness.sandbox.OB_RTC.start;
  let underlyingRtcStarts = 0;
  harness.sandbox.OB_RTC.start = function(...args) {
    underlyingRtcStarts += 1;
    return installedRtcStart.apply(this, args);
  };

  const firstClientStart = harness.sandbox.startClientRtcMedia(sessionId, channel);
  await settleAsync();
  assert.equal(sfuSockets.length, 1, `${channel} first start remains pending in SFU preparation`);
  assert.equal(harness.sandbox._obClientMediaReadyStream, null, `${channel} SFU attempt consumes its public prewarm reference`);
  const duplicateClientStart = harness.sandbox.startClientRtcMedia(sessionId, channel);
  assert.equal(duplicateClientStart, firstClientStart, `${channel} duplicate poll receives the exact in-flight start promise`);
  assert.equal(underlyingRtcStarts, 1, `${channel} duplicate poll cannot start a second RTC transport`);
  assert.equal(mediaRequests, 1, `${channel} duplicate poll cannot request device permission again`);
  assert(tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${channel} duplicate poll keeps every preflight track live during slow SFU preparation`);

  sfuSockets[0].fail();
  await settleAsync();
  assert.equal(sfuSockets.length, 2, `${channel} performs its one bounded safe SFU connection retry`);
  assert.equal(underlyingRtcStarts, 1, `${channel} SFU retry remains inside the original RTC start`);
  assert.equal(mediaRequests, 1, `${channel} SFU retry reuses the exact preflight media`);
  sfuSockets[1].fail();
  assert.equal(await firstClientStart, true, `${channel} delayed SFU preparation failure reaches peer fallback`);
  assert.equal(await duplicateClientStart, true, `${channel} duplicate poll shares the successful peer fallback result`);
  assert.equal(sfuSockets.length, 2, `${channel} exhausts the initial SFU attempt and its one safe retry`);
  assert.equal(mediaRequests, 1, `${channel} has one total device permission request including preflight`);
  assert.equal(addedStreams.length, tracks.length, `${channel} peer fallback installs every required preflight track`);
  assert(addedStreams.every((entry) => entry.stream === scheduledStream),
    `${channel} peer fallback reuses the exact scheduled stream consumed by the SFU attempt`);
  assert(tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${channel} has no stopped or orphaned track while peer fallback is active`);
  harness.sandbox.OB_RTC.cleanup();
  assert(tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${channel} final RTC cleanup stops every transferred track exactly once`);
  harness.sandbox.OB_RTC.cleanup();
  assert(tracks.every((track) => track.stopCalls === 1), `${channel} repeated fallback cleanup is idempotent`);
}
await assertDuplicateStartDuringSfuFailureUsesScheduledHandoff('voice');
await assertDuplicateStartDuringSfuFailureUsesScheduledHandoff('video');

// Identity teardown reaches the installed SFU transport owner, not only the
// inherited peer object. No deliberate End signal is emitted during privacy
// teardown, and the same local tracks cannot be stopped twice.
async function assertInstalledSfuActiveIdentityTeardown(channel) {
  const sfuConfig = {
    rtc: { one_to_one: { sfu_enabled: true, mode: 'sfu', sfu_url: 'https://media.example', fallback_enabled: true } },
  };
  const harness = createHarness({
    session: { ob_t: clientAToken },
    fetchImpl: async () => ({ ok: true, json: async () => sfuConfig }),
  });
  harness.sandbox.OWNLY_CONFIG = { rtc: {} };
  harness.sandbox.performance = { now: () => 200 };
  harness.sandbox.TextEncoder = TextEncoder;
  harness.sandbox.TextDecoder = TextDecoder;
  let mediaRequests = 0;
  const audioTrack = {
    id: `sfu-reset-${channel}-audio`, kind: 'audio', readyState: 'live', enabled: true, stopCalls: 0,
    stop() { this.stopCalls += 1; this.readyState = 'ended'; },
  };
  const videoTrack = {
    id: `sfu-reset-${channel}-video`, kind: 'video', readyState: 'live', enabled: true, stopCalls: 0,
    stop() { this.stopCalls += 1; this.readyState = 'ended'; },
  };
  const tracks = channel === 'video' ? [audioTrack, videoTrack] : [audioTrack];
  const stream = {
    getTracks: () => tracks,
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => channel === 'video' ? [videoTrack] : [],
  };
  harness.sandbox.navigator = {
    userAgent: 'Mozilla/5.0 Chrome/140.0.0.0',
    mediaDevices: { getUserMedia: async () => { mediaRequests += 1; return stream; } },
  };
  let peerStarts = 0;
  harness.sandbox.RTCPeerConnection = class { constructor() { peerStarts += 1; } };
  const sfuSockets = [];
  class PendingActiveSfuSocket {
    constructor(url) { this.url = String(url); this.readyState = 0; this.sent = []; sfuSockets.push(this); }
    send(payload) { this.sent.push(JSON.parse(payload)); }
    close() {
      this.readyState = 3;
      if (this.onerror) this.onerror(new Error('identity teardown closed pending SFU signal'));
      if (this.onclose) this.onclose();
    }
  }
  PendingActiveSfuSocket.OPEN = 1;
  PendingActiveSfuSocket.CONNECTING = 0;
  PendingActiveSfuSocket.CLOSED = 3;
  harness.sandbox.WebSocket = PendingActiveSfuSocket;
  const sharedSignals = [];
  harness.sandbox._obClientWs = { readyState: 1, send(payload) { sharedSignals.push(JSON.parse(payload)); }, close() {} };

  const scheduledStream = await harness.sandbox.navigator.mediaDevices.getUserMedia(
    channel === 'video' ? { audio: true, video: true } : { audio: true, video: false },
  );
  new vm.Script(rtcModuleSource, { filename: `rtc-installed-sfu-reset-${channel}.js` }).runInContext(harness.sandbox);
  const sessionId = `installed-sfu-reset-${channel}`;
  assert.equal(harness.sandbox.OB_RTC.setScheduledPreflightStream(scheduledStream, sessionId, channel, 'client'), true);
  new vm.Script(sfuClientSource, { filename: `installed-sfu-reset-${channel}.js` }).runInContext(harness.sandbox);
  harness.sandbox.ExpertSfuClient.setPrewarmedStream('client', scheduledStream, channel);
  harness.sandbox._obRtcPrewarmedStream = scheduledStream;
  new vm.Script(clientRtcStartOwnerSource, { filename: `client-start-reset-${channel}.js` }).runInContext(harness.sandbox);

  const pendingStart = harness.sandbox.startClientRtcMedia(sessionId, channel);
  await settleAsync();
  assert.equal(harness.sandbox.OB_RTC.testAdoptOneToOneLocalStream(scheduledStream), true,
    `${channel} installed SFU session owns the exact local stream before identity teardown`);
  assert.equal(harness.sandbox.OB_RTC.getRole(), 'client', `${channel} installed SFU wrapper reports its real client owner`);
  assert.equal(harness.sandbox.OB_RTC.isActive(), true, `${channel} installed SFU session is active before teardown`);

  await changeAuth(harness, null);
  assert.equal(await pendingStart, false, `${channel} invalidated SFU start cannot fall through to peer RTC`);
  assert.equal(harness.sandbox.OB_RTC.isActive(), false, `${channel} SFU transport is inactive after logout`);
  assert.equal(peerStarts, 0, `${channel} logout cannot start stale peer fallback`);
  assert.equal(mediaRequests, 1, `${channel} logout cannot prompt for devices after preflight`);
  assert(tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${channel} logout stops each SFU-owned local track exactly once`);
  assert.equal(sharedSignals.some((message) => message.type === 'rtc_end'), false,
    `${channel} privacy teardown never emits a deliberate rtc_end signal`);
}
await assertInstalledSfuActiveIdentityTeardown('voice');
await assertInstalledSfuActiveIdentityTeardown('video');

// A logout/account switch while SFU configuration is still pending invalidates
// both the current start and a different-session continuation queued behind it.
async function assertInstalledSfuPendingIdentityInvalidation() {
  let resolveConfig;
  const configResponse = new Promise((resolve) => { resolveConfig = resolve; });
  const harness = createHarness({
    session: { ob_t: clientAToken },
    fetchImpl: () => configResponse,
  });
  harness.sandbox.OWNLY_CONFIG = { rtc: {} };
  harness.sandbox.performance = { now: () => 300 };
  harness.sandbox.TextEncoder = TextEncoder;
  harness.sandbox.TextDecoder = TextDecoder;
  const track = {
    id: 'sfu-config-pending-audio', kind: 'audio', readyState: 'live', enabled: true, stopCalls: 0,
    stop() { this.stopCalls += 1; this.readyState = 'ended'; },
  };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track], getVideoTracks: () => [] };
  let mediaRequests = 0;
  harness.sandbox.navigator = {
    userAgent: 'Mozilla/5.0 Chrome/140.0.0.0',
    mediaDevices: { getUserMedia: async () => { mediaRequests += 1; return stream; } },
  };
  let socketsCreated = 0;
  class ForbiddenStaleSfuSocket { constructor() { socketsCreated += 1; } }
  ForbiddenStaleSfuSocket.OPEN = 1;
  harness.sandbox.WebSocket = ForbiddenStaleSfuSocket;
  harness.sandbox.RTCPeerConnection = class { constructor() { throw new Error('stale peer fallback must not start'); } };
  const sharedSignals = [];
  harness.sandbox._obClientWs = { readyState: 1, send(payload) { sharedSignals.push(JSON.parse(payload)); }, close() {} };

  const scheduledStream = await harness.sandbox.navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  new vm.Script(rtcModuleSource, { filename: 'rtc-installed-sfu-config-pending.js' }).runInContext(harness.sandbox);
  assert.equal(harness.sandbox.OB_RTC.setScheduledPreflightStream(scheduledStream, 'pending-config-a', 'voice', 'client'), true);
  new vm.Script(sfuClientSource, { filename: 'installed-sfu-config-pending.js' }).runInContext(harness.sandbox);
  harness.sandbox.ExpertSfuClient.setPrewarmedStream('client', scheduledStream, 'voice');
  harness.sandbox._obRtcPrewarmedStream = scheduledStream;
  new vm.Script(clientRtcStartOwnerSource, { filename: 'client-start-config-pending.js' }).runInContext(harness.sandbox);
  const installedStart = harness.sandbox.OB_RTC.start;
  let underlyingStarts = 0;
  harness.sandbox.OB_RTC.start = function(...args) { underlyingStarts += 1; return installedStart.apply(this, args); };

  const pendingStart = harness.sandbox.startClientRtcMedia('pending-config-a', 'voice');
  const queuedStart = harness.sandbox.startClientRtcMedia('queued-session-a', 'video');
  assert.equal(underlyingStarts, 1, 'a different-session continuation queues behind the pending SFU start');
  await changeAuth(harness, null);
  await changeAuth(harness, clientBToken);
  resolveConfig({
    ok: true,
    json: async () => ({ rtc: { one_to_one: { sfu_enabled: true, sfu_url: 'https://media.example', fallback_enabled: true } } }),
  });
  assert.equal(await pendingStart, false, 'client A config-pending SFU start is invalidated after account change');
  assert.equal(await queuedStart, false, 'client A queued session cannot start under client B');
  assert.equal(underlyingStarts, 1, 'identity teardown prevents every stale queued underlying RTC start');
  assert.equal(socketsCreated, 0, 'identity-invalidated config continuation cannot create an SFU socket');
  assert.equal(mediaRequests, 1, 'identity-invalidated config continuation cannot request media again');
  assert.equal(track.stopCalls, 1, 'identity teardown stops the unclaimed scheduled track exactly once');
  assert.equal(harness.sandbox.OB_RTC.isActive(), false, 'no SFU or peer transport remains after pending invalidation');
  assert.equal(sharedSignals.some((message) => message.type === 'rtc_end'), false,
    'pending identity teardown never emits rtc_end');
}
await assertInstalledSfuPendingIdentityInvalidation();

// A superseded SFU start owns only the session it created. Its eventual success
// or failure cannot close a live replacement session created by the next account.
async function assertStaleInstalledSfuCompletionPreservesReplacement(channel, staleOutcome) {
  const testName = `${channel}-${staleOutcome}`;
  const sfuConfig = {
    rtc: { one_to_one: { sfu_enabled: true, mode: 'sfu', sfu_url: 'https://media.example', fallback_enabled: true } },
  };
  const harness = createHarness({
    session: { ob_t: clientAToken },
    fetchImpl: async (url) => {
      assert(String(url).endsWith('/api/config'), `${testName} only reads installed SFU configuration`);
      return { ok: true, json: async () => sfuConfig };
    },
  });
  harness.sandbox.OWNLY_CONFIG = { rtc: {} };
  harness.sandbox.performance = { now: () => 400 };
  harness.sandbox.TextEncoder = TextEncoder;
  harness.sandbox.TextDecoder = TextDecoder;

  function trackedStream(owner) {
    const audioTrack = {
      id: `${testName}-${owner}-audio`, kind: 'audio', readyState: 'live', enabled: true, stopCalls: 0,
      stop() { this.stopCalls += 1; this.readyState = 'ended'; },
    };
    const videoTrack = {
      id: `${testName}-${owner}-video`, kind: 'video', readyState: 'live', enabled: true, stopCalls: 0,
      stop() { this.stopCalls += 1; this.readyState = 'ended'; },
    };
    const tracks = channel === 'video' ? [audioTrack, videoTrack] : [audioTrack];
    return {
      tracks,
      stream: {
        getTracks: () => tracks,
        getAudioTracks: () => [audioTrack],
        getVideoTracks: () => channel === 'video' ? [videoTrack] : [],
      },
    };
  }

  const clientA = trackedStream('client-a');
  const clientB = trackedStream('client-b');
  const preflightStreams = [clientA.stream, clientB.stream];
  let mediaRequests = 0;
  harness.sandbox.navigator = {
    userAgent: 'Mozilla/5.0 Chrome/140.0.0.0',
    mediaDevices: {
      getUserMedia: async () => {
        const stream = preflightStreams[mediaRequests];
        mediaRequests += 1;
        assert(stream, `${testName} cannot request media outside the two owned preflights`);
        return stream;
      },
    },
  };
  let sfuSockets = 0;
  class ForbiddenSfuSocket { constructor() { sfuSockets += 1; } }
  ForbiddenSfuSocket.OPEN = 1;
  harness.sandbox.WebSocket = ForbiddenSfuSocket;
  let peerStarts = 0;
  harness.sandbox.RTCPeerConnection = class { constructor() { peerStarts += 1; } };
  const sharedSignals = [];
  harness.sandbox._obClientWs = {
    readyState: 1,
    send(payload) { sharedSignals.push(JSON.parse(payload)); },
    close() {},
  };

  new vm.Script(rtcModuleSource, { filename: `rtc-owned-sfu-${testName}.js` }).runInContext(harness.sandbox);
  new vm.Script(sfuClientSource, { filename: `installed-owned-sfu-${testName}.js` }).runInContext(harness.sandbox);
  new vm.Script(clientRtcStartOwnerSource, { filename: `client-owned-sfu-${testName}.js` }).runInContext(harness.sandbox);
  const deferredStarts = [];
  harness.sandbox.__OB_TEST_SFU_START_CALL__ = (session, requestedChannel) => {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    deferredStarts.push({ session, channel: requestedChannel, promise, resolve, reject });
    return promise;
  };

  async function beginOwnedStart(sessionId, ownedStream) {
    const preflight = await harness.sandbox.navigator.mediaDevices.getUserMedia(
      channel === 'video' ? { audio: true, video: true } : { audio: true, video: false },
    );
    assert.equal(preflight, ownedStream, `${testName} receives the expected account-owned preflight stream`);
    assert.equal(harness.sandbox.OB_RTC.setScheduledPreflightStream(preflight, sessionId, channel, 'client'), true);
    assert.equal(harness.sandbox.ExpertSfuClient.setPrewarmedStream('client', preflight, channel), true);
    harness.sandbox._obRtcPrewarmedStream = preflight;
    return { start: harness.sandbox.startClientRtcMedia(sessionId, channel) };
  }

  const clientASessionId = `owned-sfu-a-${testName}`;
  const { start: clientAStart } = await beginOwnedStart(clientASessionId, clientA.stream);
  await settleAsync();
  assert.equal(deferredStarts.length, 1, `${testName} leaves client A's real installed SFU session pending`);
  assert.equal(deferredStarts[0].session.roomId, clientASessionId, `${testName} pending start is owned by client A's session`);
  assert.equal(harness.sandbox.OB_RTC.testAdoptOneToOneLocalStream(clientA.stream), true);
  assert.equal(harness.sandbox.OB_RTC.isActive(), true, `${testName} client A SFU session is active while startup is pending`);

  await changeAuth(harness, null);
  assert(clientA.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} client A teardown stops its tracks exactly once`);
  await changeAuth(harness, clientBToken);

  const clientBSessionId = `owned-sfu-b-${testName}`;
  const { start: clientBStart } = await beginOwnedStart(clientBSessionId, clientB.stream);
  await settleAsync();
  assert.equal(deferredStarts.length, 2, `${testName} starts one replacement SFU session for client B`);
  assert.equal(deferredStarts[1].session.roomId, clientBSessionId, `${testName} replacement session is owned by client B`);
  assert.equal(harness.sandbox.OB_RTC.testAdoptOneToOneLocalStream(clientB.stream), true);
  assert.equal(harness.sandbox.OB_RTC.getSid(), clientBSessionId, `${testName} client B owns the active SFU session`);
  assert(clientB.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} client B tracks are live before client A settles`);

  if (staleOutcome === 'failure') deferredStarts[0].reject(new Error('stale client A start failed'));
  else deferredStarts[0].resolve({ joined: true });
  assert.equal(await clientAStart, false, `${testName} stale client A completion is rejected by its identity owner`);
  assert.equal(harness.sandbox.OB_RTC.isActive(), true, `${testName} stale client A completion cannot deactivate client B`);
  assert.equal(harness.sandbox.OB_RTC.getSid(), clientBSessionId, `${testName} stale client A completion cannot replace client B`);
  assert(clientB.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} stale client A completion cannot stop client B tracks`);
  assert.equal(peerStarts, 0, `${testName} stale client A completion cannot start peer fallback`);
  assert.equal(sfuSockets, 0, `${testName} controlled installed starts do not open an unrelated signal socket`);

  await changeAuth(harness, null);
  assert.equal(harness.sandbox.OB_RTC.isActive(), false, `${testName} final client B reset closes the replacement SFU session`);
  assert(clientB.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} final client B reset stops every replacement track exactly once`);
  deferredStarts[1].resolve({ joined: true });
  assert.equal(await clientBStart, false, `${testName} client B's pending completion stays invalid after final reset`);
  assert(clientB.tracks.every((track) => track.stopCalls === 1),
    `${testName} late client B completion cannot stop its tracks twice`);
  assert.equal(mediaRequests, 2, `${testName} performs exactly one preflight per authenticated account`);
  assert.equal(sharedSignals.some((message) => message.type === 'rtc_end'), false,
    `${testName} identity resets never emit a deliberate rtc_end signal`);
}
for (const channel of ['voice', 'video']) {
  await assertStaleInstalledSfuCompletionPreservesReplacement(channel, 'failure');
  await assertStaleInstalledSfuCompletionPreservesReplacement(channel, 'success');
}

function trackedPrewarmStream(label, channel = 'video') {
  const audioTrack = {
    id: `${label}-audio`, kind: 'audio', readyState: 'live', enabled: true, stopCalls: 0,
    stop() { this.stopCalls += 1; this.readyState = 'ended'; },
  };
  const videoTrack = {
    id: `${label}-video`, kind: 'video', readyState: 'live', enabled: true, stopCalls: 0,
    stop() { this.stopCalls += 1; this.readyState = 'ended'; },
  };
  const tracks = channel === 'video' ? [audioTrack, videoTrack] : [audioTrack];
  return {
    tracks,
    stream: {
      getTracks: () => tracks,
      getAudioTracks: () => [audioTrack],
      getVideoTracks: () => channel === 'video' ? [videoTrack] : [],
    },
  };
}

function attachClientPrewarmCard(harness, id, channel) {
  const card = new FakeElement('div');
  card.id = id;
  card.setAttribute('data-ob-media-channel', channel);
  const status = new FakeElement('div');
  status.id = `${id}-status`;
  const button = new FakeElement('button');
  button.textContent = 'Enable before session';
  card.appendChild(status);
  card.appendChild(button);
  harness.body.appendChild(card);
  return { card, status, button };
}

function attachExpertPrewarmCard(harness) {
  const card = new FakeElement('div');
  card.id = 'ob-expert-media-ready-card';
  const status = new FakeElement('div');
  status.id = 'ob-expert-media-ready-status';
  const button = new FakeElement('button');
  button.textContent = 'Enable mic and cam';
  card.appendChild(status);
  card.appendChild(button);
  harness.body.appendChild(card);
  return { card, status, button };
}

function installRolePrewarmOwner(harness, getUserMedia) {
  harness.sandbox.OWNLY_CONFIG = { rtc: {} };
  harness.sandbox.performance = { now: () => 500 };
  harness.sandbox.TextEncoder = TextEncoder;
  harness.sandbox.TextDecoder = TextDecoder;
  harness.sandbox.navigator = {
    userAgent: 'Mozilla/5.0 Chrome/140.0.0.0',
    mediaDevices: { getUserMedia },
  };
  if(!harness.sandbox.WebSocket){
    class UnusedPrewarmSocket {}
    UnusedPrewarmSocket.OPEN = 1;
    harness.sandbox.WebSocket = UnusedPrewarmSocket;
  }
  new vm.Script(rtcModuleSource, { filename: 'rtc-role-prewarm-owner.js' }).runInContext(harness.sandbox);
  new vm.Script(sfuClientSource, { filename: 'installed-sfu-role-prewarm-owner.js' }).runInContext(harness.sandbox);
  new vm.Script(mediaPrewarmOwnerSource, { filename: 'role-prewarm-owner.js' }).runInContext(harness.sandbox);
}

// A client stream enabled before any scheduled-session owner exists is still
// account-owned. Logout clears the installed SFU registry and exact globals,
// while a separate expert prewarm remains live and registered.
async function assertInstalledClientPrewarmLogoutIsolation(channel) {
  const testName = `client-prewarm-logout-${channel}`;
  const clientA = trackedPrewarmStream(`${testName}-a`, channel);
  const clientB = trackedPrewarmStream(`${testName}-b`, channel);
  const expert = trackedPrewarmStream(`${testName}-expert`, 'video');
  const mediaQueue = [clientA.stream, clientB.stream];
  let mediaRequests = 0;
  const harness = createHarness({ session: { ob_t: clientAToken } });
  attachClientPrewarmCard(harness, testName, channel);
  installRolePrewarmOwner(harness, async () => {
    const stream = mediaQueue[mediaRequests];
    mediaRequests += 1;
    assert(stream, `${testName} cannot request an unowned third stream`);
    return stream;
  });
  assert.equal(harness.sandbox.ExpertSfuClient.setPrewarmedStream('expert', expert.stream, 'video'), true);

  assert.equal(await harness.sandbox.obEnableClientMedia(testName), true,
    `${testName} client A enables its pre-session device stream`);
  assert.equal(harness.sandbox._obClientMediaReadyStream, clientA.stream, `${testName} publishes client A's exact stream`);
  assert.equal(harness.sandbox._obClientMediaReadyChannel, channel, `${testName} publishes the exact channel`);
  assert.equal(harness.sandbox._obRtcPrewarmedStream, clientA.stream, `${testName} publishes the shared reference to client A only`);

  await changeAuth(harness, null);
  assert(clientA.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} logout stops each client A prewarm track exactly once`);
  assert.equal(harness.sandbox._obClientMediaReadyStream, null, `${testName} logout clears the client prewarm global`);
  assert.equal(harness.sandbox._obClientMediaReadyChannel, '', `${testName} logout clears the client channel global`);
  assert.equal(harness.sandbox._obRtcPrewarmedStream, null, `${testName} logout clears the exact shared client reference`);
  assert.equal(harness.sandbox.ExpertSfuClient.clearPrewarmedStream('client', clientA.stream), false,
    `${testName} client A's SFU registry entry cannot be reused after logout`);
  assert.equal(harness.sandbox._obExpertMediaReadyStream, expert.stream,
    `${testName} client logout does not clear the expert prewarm global`);
  assert(expert.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} client logout leaves expert tracks live`);

  await changeAuth(harness, clientBToken);
  assert.equal(await harness.sandbox.obEnableClientMedia(testName), true,
    `${testName} client B obtains a new pre-session stream`);
  assert.equal(harness.sandbox._obClientMediaReadyStream, clientB.stream,
    `${testName} client B owns its exact replacement stream`);
  assert(clientB.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} client B replacement tracks remain live`);
  assert.equal(mediaRequests, 2, `${testName} makes one device request per account`);

  await changeAuth(harness, null);
  assert(clientB.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} client B logout stops its own tracks exactly once`);
  assert.equal(harness.sandbox.ExpertSfuClient.clearPrewarmedStream('client', clientB.stream), false,
    `${testName} client B registry entry is gone after its logout`);
  assert.equal(harness.sandbox._obExpertMediaReadyStream, expert.stream,
    `${testName} repeated client teardown still preserves expert prewarm`);
  assert.equal(harness.sandbox.ExpertSfuClient.clearPrewarmedStream('expert', expert.stream), true,
    `${testName} preserved expert registry remains independently owned`);
  assert(expert.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} explicit expert cleanup stops its tracks exactly once`);
}
await assertInstalledClientPrewarmLogoutIsolation('voice');
await assertInstalledClientPrewarmLogoutIsolation('video');

// If client A changes identity while the browser permission prompt is open,
// the late result is stopped without touching client B's newer prewarm.
async function assertPendingClientPrewarmCannotPublishIntoReplacement(channel) {
  const testName = `client-prewarm-pending-${channel}`;
  const clientA = trackedPrewarmStream(`${testName}-a`, channel);
  const clientB = trackedPrewarmStream(`${testName}-b`, channel);
  const expert = trackedPrewarmStream(`${testName}-expert`, 'video');
  let resolveClientA;
  const pendingClientA = new Promise((resolve) => { resolveClientA = resolve; });
  let mediaRequests = 0;
  const harness = createHarness({ session: { ob_t: clientAToken } });
  attachClientPrewarmCard(harness, testName, channel);
  installRolePrewarmOwner(harness, () => {
    mediaRequests += 1;
    return mediaRequests === 1 ? pendingClientA : Promise.resolve(clientB.stream);
  });
  assert.equal(harness.sandbox.ExpertSfuClient.setPrewarmedStream('expert', expert.stream, 'video'), true);

  const staleClientAEnable = harness.sandbox.obEnableClientMedia(testName);
  await settleAsync();
  assert.equal(mediaRequests, 1, `${testName} client A permission remains pending`);
  await changeAuth(harness, null);
  await changeAuth(harness, clientBToken);
  assert.equal(await harness.sandbox.obEnableClientMedia(testName), true,
    `${testName} client B can enable a replacement while client A remains pending`);
  assert.equal(harness.sandbox._obClientMediaReadyStream, clientB.stream,
    `${testName} client B publishes its own exact stream`);

  resolveClientA(clientA.stream);
  assert.equal(await staleClientAEnable, false, `${testName} client A's late permission continuation is invalidated`);
  assert(clientA.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} late client A tracks are stopped exactly once`);
  assert(clientB.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} client A's late continuation cannot stop client B tracks`);
  assert.equal(harness.sandbox._obClientMediaReadyStream, clientB.stream,
    `${testName} client A's late continuation cannot replace client B's global`);
  assert.equal(harness.sandbox._obRtcPrewarmedStream, clientB.stream,
    `${testName} client A's late continuation cannot replace the shared reference`);
  assert.equal(harness.sandbox.ExpertSfuClient.clearPrewarmedStream('client', clientA.stream), false,
    `${testName} client A's late stream never enters the SFU registry`);
  assert.equal(harness.sandbox._obExpertMediaReadyStream, expert.stream,
    `${testName} client identity changes do not alter expert prewarm`);
  assert.equal(mediaRequests, 2, `${testName} performs exactly one permission request per client`);

  await changeAuth(harness, null);
  assert(clientB.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} final client B logout stops its tracks exactly once`);
  assert.equal(harness.sandbox.ExpertSfuClient.clearPrewarmedStream('client', clientB.stream), false,
    `${testName} final client B logout clears its SFU registry entry`);
  assert.equal(harness.sandbox.ExpertSfuClient.clearPrewarmedStream('expert', expert.stream), true,
    `${testName} expert prewarm remains independently registered through client switches`);
}
await assertPendingClientPrewarmCannotPublishIntoReplacement('voice');
await assertPendingClientPrewarmCannotPublishIntoReplacement('video');

// The same central identity lifecycle applies to the expert dashboard prewarm.
// It clears an already-owned stream and rejects a post-logout permission result.
async function assertExpertPrewarmIdentityOwnership() {
  const existing = trackedPrewarmStream('expert-prewarm-existing', 'video');
  let existingRequests = 0;
  const existingHarness = createHarness({ session: { ob_t: expertToken } });
  const existingControls = attachExpertPrewarmCard(existingHarness);
  installRolePrewarmOwner(existingHarness, async () => { existingRequests += 1; return existing.stream; });
  assert.equal(await existingHarness.sandbox.obEnableExpertMedia(), true, 'expert can enable an owned dashboard prewarm');
  await changeAuth(existingHarness, null);
  assert(existing.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    'expert logout stops each existing dashboard prewarm track exactly once');
  assert.equal(existingHarness.sandbox._obExpertMediaReadyStream, null, 'expert logout clears the expert prewarm global');
  assert.equal(existingHarness.sandbox._obRtcPrewarmedStream, null, 'expert logout clears the exact shared expert reference');
  assert.equal(existingHarness.sandbox.ExpertSfuClient.clearPrewarmedStream('expert', existing.stream), false,
    'expert logout removes the installed SFU registry entry');
  assert.equal(existingControls.button.disabled, false, 'expert logout releases the media-enable control for the next identity');
  assert.equal(existingRequests, 1, 'existing expert prewarm requests devices once');

  const expertA = trackedPrewarmStream('expert-prewarm-pending-a', 'video');
  const expertB = trackedPrewarmStream('expert-prewarm-pending-b', 'video');
  let resolveExpertA;
  const pendingExpertA = new Promise((resolve) => { resolveExpertA = resolve; });
  let pendingRequests = 0;
  const pendingHarness = createHarness({ session: { ob_t: expertToken } });
  const pendingControls = attachExpertPrewarmCard(pendingHarness);
  installRolePrewarmOwner(pendingHarness, () => {
    pendingRequests += 1;
    return pendingRequests === 1 ? pendingExpertA : Promise.resolve(expertB.stream);
  });
  const staleExpertAEnable = pendingHarness.sandbox.obEnableExpertMedia();
  await settleAsync();
  await changeAuth(pendingHarness, expertBToken);
  assert.equal(pendingControls.button.disabled, false, 'expert A teardown releases the pending permission control');
  assert.equal(await pendingHarness.sandbox.obEnableExpertMedia(), true,
    'expert B can enable its own stream while expert A permission remains pending');
  resolveExpertA(expertA.stream);
  assert.equal(await staleExpertAEnable, false, 'expert A late permission result is invalid after account change');
  assert(expertA.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    'expert A late tracks are stopped exactly once');
  assert(expertB.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    'expert A late result cannot stop expert B tracks');
  assert.equal(pendingHarness.sandbox._obExpertMediaReadyStream, expertB.stream,
    'expert A late result cannot replace expert B prewarm');
  await changeAuth(pendingHarness, null);
  assert(expertB.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    'expert B logout stops its prewarm exactly once');
  assert.equal(pendingRequests, 2, 'pending expert ownership makes one device request per identity');
}
await assertExpertPrewarmIdentityOwnership();

function installControlledExpertSfuHarness(harness, getUserMedia) {
  let socketsCreated = 0;
  class ControlledExpertSfuSocket { constructor() { socketsCreated += 1; } }
  ControlledExpertSfuSocket.OPEN = 1;
  harness.sandbox.WebSocket = ControlledExpertSfuSocket;
  let peerStarts = 0;
  harness.sandbox.RTCPeerConnection = class { constructor() { peerStarts += 1; } };
  installRolePrewarmOwner(harness, getUserMedia);
  const deferredStarts = [];
  harness.sandbox.__OB_TEST_SFU_START_CALL__ = (session, channel) => {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    deferredStarts.push({ session, channel, promise, resolve, reject });
    return promise;
  };
  return {
    deferredStarts,
    socketsCreated: () => socketsCreated,
    peerStarts: () => peerStarts,
  };
}

function setExpertSfuPrewarm(harness, ownedStream, channel) {
  assert.equal(harness.sandbox.ExpertSfuClient.setPrewarmedStream('expert', ownedStream, channel), true);
  harness.sandbox._obRtcPrewarmedStream = ownedStream;
}

// Active installed SFU media belongs to the authenticated expert. Logout closes
// it without a deliberate End signal and without touching a client-owned prewarm.
async function assertInstalledSfuActiveExpertIdentityTeardown(channel) {
  const testName = `active-expert-reset-${channel}`;
  const sfuConfig = {
    rtc: { one_to_one: { sfu_enabled: true, mode: 'sfu', sfu_url: 'https://media.example', fallback_enabled: true } },
  };
  const expert = trackedPrewarmStream(`${testName}-expert`, channel);
  const client = trackedPrewarmStream(`${testName}-client`, channel);
  let mediaRequests = 0;
  const sharedSignals = [];
  const harness = createHarness({
    session: { ob_t: expertToken },
    fetchImpl: async () => ({ ok: true, json: async () => sfuConfig }),
  });
  harness.sandbox._expertWs = { readyState: 1, send(payload) { sharedSignals.push(JSON.parse(payload)); }, close() {} };
  const control = installControlledExpertSfuHarness(harness, async () => { mediaRequests += 1; return expert.stream; });
  setExpertSfuPrewarm(harness, expert.stream, channel);

  const sessionId = `active-expert-session-${channel}`;
  const pendingStart = harness.sandbox.OB_RTC.start(sessionId, channel, 'expert');
  await settleAsync();
  assert.equal(control.deferredStarts.length, 1, `${testName} creates one real installed SFU session`);
  assert.equal(harness.sandbox.OB_RTC.testAdoptOneToOneLocalStream(expert.stream), true,
    `${testName} installed expert SFU owns its exact local stream`);
  assert.equal(harness.sandbox.OB_RTC.isActive(), true, `${testName} expert SFU is active before logout`);
  assert.equal(harness.sandbox.OB_RTC.getRole(), 'expert', `${testName} active role is expert`);

  assert.equal(harness.sandbox.ExpertSfuClient.setPrewarmedStream('client', client.stream, channel), true);
  harness.sandbox._obRtcPrewarmedStream = client.stream;
  await changeAuth(harness, null);
  assert.equal(harness.sandbox.OB_RTC.isActive(), false, `${testName} logout closes active expert SFU`);
  assert(expert.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} logout stops every expert SFU track exactly once`);
  assert.equal(harness.sandbox._obExpertMediaReadyStream, null, `${testName} logout clears expert prewarm globals`);
  assert.equal(harness.sandbox._obClientMediaReadyStream, client.stream,
    `${testName} expert logout preserves client-owned prewarm globals`);
  assert.equal(harness.sandbox._obRtcPrewarmedStream, client.stream,
    `${testName} expert logout preserves the exact shared client reference`);
  assert(client.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} expert logout leaves client tracks live`);

  control.deferredStarts[0].resolve({ joined: true });
  assert.equal(await pendingStart, false, `${testName} logged-out expert start cannot complete`);
  assert.equal(control.socketsCreated(), 0, `${testName} controlled expert start opens no stale SFU socket`);
  assert.equal(control.peerStarts(), 0, `${testName} expert logout cannot enter peer fallback`);
  assert.equal(mediaRequests, 0, `${testName} expert logout cannot request media beyond its prewarm`);
  assert.equal(sharedSignals.some((message) => message.type === 'rtc_end'), false,
    `${testName} privacy teardown emits no deliberate rtc_end`);
  assert.equal(harness.sandbox.ExpertSfuClient.clearPrewarmedStream('client', client.stream), true,
    `${testName} preserved client registry remains independently owned`);
  assert(client.tracks.every((track) => track.stopCalls === 1), `${testName} explicit client cleanup stops its tracks once`);
}
await assertInstalledSfuActiveExpertIdentityTeardown('voice');
await assertInstalledSfuActiveExpertIdentityTeardown('video');

// Expert A can be invalidated while SFU config is pending. Only expert B may
// create a session after config resolves; A cannot open signaling, prompt media,
// or fall through to peer RTC.
async function assertInstalledSfuConfigPendingExpertReplacement(channel) {
  const testName = `config-pending-expert-${channel}`;
  let resolveConfig;
  const configResponse = new Promise((resolve) => { resolveConfig = resolve; });
  const expertA = trackedPrewarmStream(`${testName}-a`, channel);
  const expertB = trackedPrewarmStream(`${testName}-b`, channel);
  let mediaRequests = 0;
  const sharedSignals = [];
  const harness = createHarness({ session: { ob_t: expertToken }, fetchImpl: () => configResponse });
  harness.sandbox._expertWs = { readyState: 1, send(payload) { sharedSignals.push(JSON.parse(payload)); }, close() {} };
  const control = installControlledExpertSfuHarness(harness, async () => { mediaRequests += 1; return expertB.stream; });
  setExpertSfuPrewarm(harness, expertA.stream, channel);

  const expertAStart = harness.sandbox.OB_RTC.start(`config-expert-a-${channel}`, channel, 'expert');
  await settleAsync();
  assert.equal(control.deferredStarts.length, 0, `${testName} expert A remains before session construction`);
  await changeAuth(harness, null);
  assert(expertA.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} config-pending expert A prewarm stops exactly once`);
  await changeAuth(harness, expertBToken);
  setExpertSfuPrewarm(harness, expertB.stream, channel);
  const expertBStart = harness.sandbox.OB_RTC.start(`config-expert-b-${channel}`, channel, 'expert');

  resolveConfig({
    ok: true,
    json: async () => ({ rtc: { one_to_one: { sfu_enabled: true, mode: 'sfu', sfu_url: 'https://media.example', fallback_enabled: true } } }),
  });
  await settleAsync();
  assert.equal(await expertAStart, false, `${testName} expert A config continuation is identity-invalidated`);
  assert.equal(control.deferredStarts.length, 1, `${testName} only expert B constructs an installed SFU session`);
  assert.equal(control.deferredStarts[0].session.roomId, `config-expert-b-${channel}`,
    `${testName} constructed SFU session belongs to expert B`);
  assert.equal(harness.sandbox.OB_RTC.testAdoptOneToOneLocalStream(expertB.stream), true);
  assert.equal(harness.sandbox.OB_RTC.getSid(), `config-expert-b-${channel}`,
    `${testName} expert B owns the active replacement`);
  assert(expertB.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} expert B tracks remain live`);
  assert.equal(control.socketsCreated(), 0, `${testName} expert A opens no stale SFU socket`);
  assert.equal(control.peerStarts(), 0, `${testName} expert A opens no peer fallback`);
  assert.equal(mediaRequests, 0, `${testName} expert A cannot prompt for stale media`);

  control.deferredStarts[0].resolve({ joined: true });
  assert.equal(await expertBStart, true, `${testName} expert B may finish its current start`);
  await changeAuth(harness, null);
  assert(expertB.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} final expert B logout stops its tracks exactly once`);
  assert.equal(sharedSignals.some((message) => message.type === 'rtc_end'), false,
    `${testName} config-pending identity teardown emits no rtc_end`);
}
await assertInstalledSfuConfigPendingExpertReplacement('voice');
await assertInstalledSfuConfigPendingExpertReplacement('video');

// Pre-join preparation is account-owned too. If expert A logs out while the
// SFU configuration is pending, that continuation cannot construct a prepared
// signaling session or leave A's prewarm available to the next account.
async function assertInstalledSfuPrepareConfigInvalidation(channel) {
  const testName = `prepare-config-pending-expert-${channel}`;
  let resolveConfig;
  const configResponse = new Promise((resolve) => { resolveConfig = resolve; });
  const expertA = trackedPrewarmStream(`${testName}-a`, channel);
  let mediaRequests = 0;
  const sharedSignals = [];
  const harness = createHarness({ session: { ob_t: expertToken }, fetchImpl: () => configResponse });
  harness.sandbox._expertWs = { readyState: 1, send(payload) { sharedSignals.push(JSON.parse(payload)); }, close() {} };
  const control = installControlledExpertSfuHarness(harness, async () => {
    mediaRequests += 1;
    return expertA.stream;
  });
  setExpertSfuPrewarm(harness, expertA.stream, channel);

  const pendingPrepare = harness.sandbox.ExpertSfuClient.prepareCall(
    `prepare-expert-a-${channel}`,
    channel,
    'expert',
  );
  await settleAsync();
  assert.equal(control.socketsCreated(), 0, `${testName} waits for configuration before constructing signaling`);
  await changeAuth(harness, null);
  assert(expertA.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} logout stops the prepared account's prewarm exactly once`);

  resolveConfig({
    ok: true,
    json: async () => ({ rtc: { one_to_one: { sfu_enabled: true, mode: 'sfu', sfu_url: 'https://media.example', fallback_enabled: true } } }),
  });
  assert.equal(await pendingPrepare, false, `${testName} stale preparation resolves as invalid`);
  assert.equal(control.socketsCreated(), 0, `${testName} stale preparation cannot create an SFU signaling socket`);
  assert.equal(control.peerStarts(), 0, `${testName} stale preparation cannot create peer RTC`);
  assert.equal(mediaRequests, 0, `${testName} preparation never prompts for account media`);
  assert.equal(harness.sandbox._obExpertMediaReadyStream, null,
    `${testName} stale preparation cannot republish the old expert prewarm`);
  assert.equal(harness.sandbox.ExpertSfuClient.clearPrewarmedStream('expert', expertA.stream), false,
    `${testName} stale preparation leaves no reusable expert registry entry`);
  assert.equal(sharedSignals.some((message) => message.type === 'rtc_end'), false,
    `${testName} preparation privacy teardown emits no deliberate rtc_end`);
}
await assertInstalledSfuPrepareConfigInvalidation('voice');
await assertInstalledSfuPrepareConfigInvalidation('video');

// A prepared session has the same identity and exact-owner rules as an active
// call. A late completion from expert A cannot delete or close expert B's
// replacement, even when the account switch reuses the same session key.
async function assertStaleInstalledSfuExpertPreparationPreservesReplacement(channel, staleOutcome) {
  const testName = `prepare-pending-expert-${channel}-${staleOutcome}`;
  const sfuConfig = {
    rtc: { one_to_one: { sfu_enabled: true, mode: 'sfu', sfu_url: 'https://media.example', fallback_enabled: true } },
  };
  const expertA = trackedPrewarmStream(`${testName}-a`, channel);
  const expertB = trackedPrewarmStream(`${testName}-b`, channel);
  let mediaRequests = 0;
  const sharedSignals = [];
  const harness = createHarness({
    session: { ob_t: expertToken },
    fetchImpl: async () => ({ ok: true, json: async () => sfuConfig }),
  });
  harness.sandbox._expertWs = { readyState: 1, send(payload) { sharedSignals.push(JSON.parse(payload)); }, close() {} };
  const control = installControlledExpertSfuHarness(harness, async () => {
    mediaRequests += 1;
    return expertB.stream;
  });
  const deferredPrepares = [];
  harness.sandbox.__OB_TEST_SFU_PREPARE_CALL__ = (session, requestedChannel) => {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    deferredPrepares.push({ session, channel: requestedChannel, promise, resolve, reject });
    return promise;
  };
  const sessionId = `shared-prepare-expert-${channel}`;
  setExpertSfuPrewarm(harness, expertA.stream, channel);

  const expertAPrepare = harness.sandbox.ExpertSfuClient.prepareCall(sessionId, channel, 'expert');
  await settleAsync();
  assert.equal(deferredPrepares.length, 1, `${testName} expert A owns one real prepared SFU session`);
  const expertASession = deferredPrepares[0].session;
  assert.equal(expertASession.closed, false, `${testName} expert A prepared owner starts open`);

  await changeAuth(harness, null);
  assert.equal(expertASession.closed, true, `${testName} expert A identity reset closes its prepared session`);
  assert(expertA.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} expert A identity reset stops its prewarm exactly once`);
  await changeAuth(harness, expertBToken);
  setExpertSfuPrewarm(harness, expertB.stream, channel);

  const expertBPrepare = harness.sandbox.ExpertSfuClient.prepareCall(sessionId, channel, 'expert');
  await settleAsync();
  assert.equal(deferredPrepares.length, 2, `${testName} expert B creates one replacement prepared session`);
  const expertBSession = deferredPrepares[1].session;
  assert.notEqual(expertBSession, expertASession, `${testName} replacement uses a distinct account-owned session`);
  assert.equal(expertBSession.closed, false, `${testName} expert B replacement is live before A settles`);

  if(staleOutcome === 'failure') deferredPrepares[0].reject(new Error('stale expert A prepare failure'));
  else deferredPrepares[0].resolve({ prepared: true });
  assert.equal(await expertAPrepare, false, `${testName} stale expert A preparation is invalid`);
  assert.equal(expertBSession.closed, false, `${testName} stale expert A cannot close expert B's prepared owner`);
  assert(expertB.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} stale expert A cannot stop expert B tracks`);
  assert.equal(harness.sandbox._obExpertMediaReadyStream, expertB.stream,
    `${testName} stale expert A cannot clear expert B's prewarm`);

  deferredPrepares[1].resolve({ prepared: true });
  assert.equal(await expertBPrepare, true, `${testName} expert B preparation may complete under its current identity`);
  assert.equal(expertBSession.closed, false, `${testName} completed expert B preparation remains reusable`);
  assert.equal(control.socketsCreated(), 0, `${testName} controlled preparations open no unrelated signaling socket`);
  assert.equal(control.peerStarts(), 0, `${testName} preparation ownership never enters peer fallback`);
  assert.equal(mediaRequests, 0, `${testName} preparation ownership never prompts for media`);

  await changeAuth(harness, null);
  assert.equal(expertBSession.closed, true, `${testName} final expert B reset closes its prepared session`);
  assert(expertB.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} final expert B reset stops its prewarm exactly once`);
  assert.equal(harness.sandbox.ExpertSfuClient.clearPrewarmedStream('expert', expertB.stream), false,
    `${testName} final reset leaves no reusable expert B registry entry`);
  assert.equal(sharedSignals.some((message) => message.type === 'rtc_end'), false,
    `${testName} prepared-session privacy resets emit no deliberate rtc_end`);
}
for (const channel of ['voice', 'video']) {
  await assertStaleInstalledSfuExpertPreparationPreservesReplacement(channel, 'failure');
  await assertStaleInstalledSfuExpertPreparationPreservesReplacement(channel, 'success');
}

// A stale expert startCall completion owns only expert A's closed session. A
// rejection or resolution after expert B becomes live cannot mutate B or fall back.
async function assertStaleInstalledSfuExpertCompletionPreservesReplacement(channel, staleOutcome) {
  const testName = `start-pending-expert-${channel}-${staleOutcome}`;
  const sfuConfig = {
    rtc: { one_to_one: { sfu_enabled: true, mode: 'sfu', sfu_url: 'https://media.example', fallback_enabled: true } },
  };
  const expertA = trackedPrewarmStream(`${testName}-a`, channel);
  const expertB = trackedPrewarmStream(`${testName}-b`, channel);
  let mediaRequests = 0;
  const sharedSignals = [];
  const harness = createHarness({
    session: { ob_t: expertToken },
    fetchImpl: async () => ({ ok: true, json: async () => sfuConfig }),
  });
  harness.sandbox._expertWs = { readyState: 1, send(payload) { sharedSignals.push(JSON.parse(payload)); }, close() {} };
  const control = installControlledExpertSfuHarness(harness, async () => { mediaRequests += 1; return expertB.stream; });
  setExpertSfuPrewarm(harness, expertA.stream, channel);

  const expertAStart = harness.sandbox.OB_RTC.start(`start-expert-a-${testName}`, channel, 'expert');
  await settleAsync();
  assert.equal(control.deferredStarts.length, 1, `${testName} expert A startCall is pending`);
  assert.equal(harness.sandbox.OB_RTC.testAdoptOneToOneLocalStream(expertA.stream), true);
  await changeAuth(harness, null);
  assert(expertA.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} expert A reset stops its tracks exactly once`);
  await changeAuth(harness, expertBToken);
  setExpertSfuPrewarm(harness, expertB.stream, channel);

  const expertBStart = harness.sandbox.OB_RTC.start(`start-expert-b-${testName}`, channel, 'expert');
  await settleAsync();
  assert.equal(control.deferredStarts.length, 2, `${testName} expert B creates one replacement startCall`);
  assert.equal(harness.sandbox.OB_RTC.testAdoptOneToOneLocalStream(expertB.stream), true);
  assert.equal(harness.sandbox.OB_RTC.getSid(), `start-expert-b-${testName}`,
    `${testName} expert B owns the replacement session`);

  if(staleOutcome === 'failure') control.deferredStarts[0].reject(new Error('stale expert A SFU failure'));
  else control.deferredStarts[0].resolve({ joined: true });
  assert.equal(await expertAStart, false, `${testName} stale expert A completion is invalid`);
  assert.equal(harness.sandbox.OB_RTC.isActive(), true, `${testName} expert B remains active after stale A`);
  assert.equal(harness.sandbox.OB_RTC.getSid(), `start-expert-b-${testName}`,
    `${testName} stale expert A cannot replace expert B`);
  assert(expertB.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} stale expert A cannot stop expert B tracks`);
  assert.equal(control.socketsCreated(), 0, `${testName} stale expert A opens no SFU socket`);
  assert.equal(control.peerStarts(), 0, `${testName} stale expert A cannot enter peer fallback`);
  assert.equal(mediaRequests, 0, `${testName} stale expert A cannot request new media`);

  await changeAuth(harness, null);
  assert(expertB.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} final expert B reset stops its tracks exactly once`);
  control.deferredStarts[1].resolve({ joined: true });
  assert.equal(await expertBStart, false, `${testName} expert B late completion stays invalid after final logout`);
  assert(expertB.tracks.every((track) => track.stopCalls === 1),
    `${testName} expert B tracks cannot stop twice`);
  assert.equal(sharedSignals.some((message) => message.type === 'rtc_end'), false,
    `${testName} expert privacy resets emit no rtc_end`);
}
for (const channel of ['voice', 'video']) {
  await assertStaleInstalledSfuExpertCompletionPreservesReplacement(channel, 'failure');
  await assertStaleInstalledSfuExpertCompletionPreservesReplacement(channel, 'success');
}

function installRealPendingSfuHarness(harness, getUserMedia) {
  const sockets = [];
  let peerStarts = 0;
  class PendingSfuSocket {
    static OPEN = 1;
    static CLOSED = 3;
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.sent = [];
      this.closeCalls = 0;
      sockets.push(this);
      Promise.resolve().then(() => {
        if(this.readyState !== 0) return;
        this.readyState = PendingSfuSocket.OPEN;
        if(this.onopen) this.onopen();
      });
    }
    send(payload) {
      const message = JSON.parse(payload);
      this.sent.push(message);
      if(message.action === 'auth') Promise.resolve().then(() => this.respond(message));
    }
    respond(request, extra = {}) {
      if(this.onmessage) this.onmessage({ data: JSON.stringify({ id: request.id, ok: true, ...extra }) });
    }
    close() {
      this.closeCalls += 1;
      this.readyState = PendingSfuSocket.CLOSED;
    }
  }
  harness.sandbox.WebSocket = PendingSfuSocket;
  harness.sandbox.RTCPeerConnection = class { constructor() { peerStarts += 1; } };
  installRolePrewarmOwner(harness, getUserMedia);
  return {
    sockets,
    peerStarts: () => peerStarts,
    actions: () => sockets.flatMap((socket) => socket.sent.map((message) => message.action).filter(Boolean)),
    joinRequest: (socket) => socket.sent.find((message) => message.action === 'join'),
  };
}

function setRoleSfuPrewarm(harness, role, ownedStream, channel) {
  assert.equal(harness.sandbox.ExpertSfuClient.setPrewarmedStream(role, ownedStream, channel), true);
  harness.sandbox._obRtcPrewarmedStream = ownedStream;
}

function attachRtcLocalVideo(harness, role) {
  const video = new FakeElement('video');
  video.id = role === 'expert' ? 'expert-rtc-local-video' : 'rtc-local-video';
  harness.body.appendChild(video);
  return video;
}

function realSfuRoleFixture(role) {
  return role === 'expert'
    ? { tokenA: expertToken, tokenB: expertBToken, socketKey: '_expertWs' }
    : { tokenA: clientAToken, tokenB: clientBToken, socketKey: '_obClientWs' };
}

function staleJoinResponse() {
  return {
    producers: [],
    participants: [],
    participant: { id: 'stale-participant' },
    room: { id: 'stale-room' },
    routerRtpCapabilities: { codecs: [], headerExtensions: [] },
  };
}

// This runs the actual bundled tr.startCall path: no startCall hook and no
// testAdopt helper. The consumed prewarm is owned before join/prepare settles,
// so account teardown stops it and a stale socket response cannot affect B.
async function assertRealSfuConsumedPrewarmIdentityHandoff(role, channel) {
  const testName = `real-sfu-prewarm-${role}-${channel}`;
  const fixture = realSfuRoleFixture(role);
  const expertA = trackedPrewarmStream(`${testName}-a`, channel);
  const expertB = trackedPrewarmStream(`${testName}-b`, channel);
  let mediaRequests = 0;
  const sharedSignals = [];
  const harness = createHarness({
    session: { ob_t: fixture.tokenA },
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ rtc: { one_to_one: { sfu_enabled: true, mode: 'sfu', sfu_url: 'https://media.example', fallback_enabled: true } } }),
    }),
  });
  const localVideo = attachRtcLocalVideo(harness, role);
  const control = installRealPendingSfuHarness(harness, async () => {
    mediaRequests += 1;
    throw new Error(`${testName} must consume its owned prewarm`);
  });
  harness.sandbox[fixture.socketKey] = {
    readyState: 1,
    send(payload) { sharedSignals.push(JSON.parse(payload)); },
    close() {},
  };
  const sessionId = `real-sfu-shared-${role}-${channel}`;
  setRoleSfuPrewarm(harness, role, expertA.stream, channel);

  const startA = harness.sandbox.OB_RTC.start(sessionId, channel, role);
  await settleAsync(32);
  assert.equal(control.sockets.length, 1, `${testName} expert A opens one real SFU signaling socket`);
  assert(control.joinRequest(control.sockets[0]), `${testName} expert A is pending in real SFU join preparation`);
  assert(expertA.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} expert A prewarm stays live while its exact session owns it`);
  assert.equal(harness.sandbox[role === 'expert' ? '_obExpertMediaReadyStream' : '_obClientMediaReadyStream'], null,
    `${testName} consumed prewarm no longer has a global fallback owner`);
  assert.equal(harness.sandbox._obRtcPrewarmedStream, null,
    `${testName} consumed prewarm clears the untyped shared reference`);

  await changeAuth(harness, fixture.tokenB);
  assert(expertA.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} identity change stops every expert A track exactly once`);
  assert.equal(control.sockets[0].closeCalls, 1, `${testName} identity change closes expert A signaling once`);
  setRoleSfuPrewarm(harness, role, expertB.stream, channel);
  const startB = harness.sandbox.OB_RTC.start(sessionId, channel, role);
  await settleAsync(32);
  assert.equal(await startA, false, `${testName} expert A real start resolves invalid after teardown`);
  assert.equal(control.sockets.length, 2, `${testName} expert B opens one replacement real SFU socket`);
  assert(control.joinRequest(control.sockets[1]), `${testName} expert B remains pending in its own real join`);
  assert.equal(harness.sandbox.OB_RTC.getSid(), sessionId, `${testName} expert B owns the replacement session`);

  control.sockets[0].respond(control.joinRequest(control.sockets[0]), staleJoinResponse());
  await settleAsync();
  assert.equal(harness.sandbox.OB_RTC.isActive(), true, `${testName} stale expert A socket success cannot close expert B`);
  assert(expertB.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} stale expert A socket success cannot stop expert B tracks`);
  assert.equal(localVideo.srcObject ?? null, null, `${testName} no closed or pending session attaches local media`);
  assert.equal(control.actions().some((action) => action === 'createTransport' || action === 'produce'), false,
    `${testName} no stale session creates a transport or produces media`);
  assert.equal(control.peerStarts(), 0, `${testName} identity teardown cannot enter peer fallback`);
  assert.equal(mediaRequests, 0, `${testName} real prewarm handoff performs no second permission request`);

  await changeAuth(harness, null);
  assert.equal(await startB, false, `${testName} expert B pending start also resolves invalid after final logout`);
  assert(expertB.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} final reset stops every expert B track exactly once through its real session owner`);
  assert.equal(control.sockets[1].closeCalls, 1, `${testName} final reset closes expert B signaling once`);
  assert.equal(sharedSignals.some((message) => message.type === 'rtc_end'), false,
    `${testName} privacy teardown emits no deliberate rtc_end`);
}

// The no-prewarm branch also runs real tr.startCall. If permission resolves
// after A was closed, adoption stops that late stream; it cannot attach,
// produce, fall back, or mutate B's already-owned replacement stream.
async function assertRealSfuPendingPermissionIdentityHandoff(role, channel) {
  const testName = `real-sfu-permission-${role}-${channel}`;
  const fixture = realSfuRoleFixture(role);
  const expertA = trackedPrewarmStream(`${testName}-a`, channel);
  const expertB = trackedPrewarmStream(`${testName}-b`, channel);
  let resolveExpertA;
  const pendingExpertA = new Promise((resolve) => { resolveExpertA = resolve; });
  let mediaRequests = 0;
  const sharedSignals = [];
  const harness = createHarness({
    session: { ob_t: fixture.tokenA },
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ rtc: { one_to_one: { sfu_enabled: true, mode: 'sfu', sfu_url: 'https://media.example', fallback_enabled: true } } }),
    }),
  });
  const localVideo = attachRtcLocalVideo(harness, role);
  const control = installRealPendingSfuHarness(harness, () => {
    mediaRequests += 1;
    return mediaRequests === 1 ? pendingExpertA : Promise.resolve(expertB.stream);
  });
  harness.sandbox[fixture.socketKey] = {
    readyState: 1,
    send(payload) { sharedSignals.push(JSON.parse(payload)); },
    close() {},
  };
  const sessionId = `real-sfu-permission-shared-${role}-${channel}`;

  const startA = harness.sandbox.OB_RTC.start(sessionId, channel, role);
  await settleAsync(32);
  assert.equal(mediaRequests, 1, `${testName} expert A has exactly one pending permission request`);
  assert.equal(control.sockets.length, 1, `${testName} expert A opens one real SFU socket while permission is pending`);
  assert(control.joinRequest(control.sockets[0]), `${testName} expert A real preparation is pending`);

  await changeAuth(harness, fixture.tokenB);
  const startB = harness.sandbox.OB_RTC.start(sessionId, channel, role);
  await settleAsync(32);
  assert.equal(mediaRequests, 2, `${testName} expert B obtains only its own replacement stream`);
  assert.equal(control.sockets.length, 2, `${testName} expert B opens one replacement SFU socket`);
  assert(expertB.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} expert B replacement stream is live under its exact pending session`);

  resolveExpertA(expertA.stream);
  assert.equal(await startA, false, `${testName} late expert A permission continuation is invalid`);
  control.sockets[0].respond(control.joinRequest(control.sockets[0]), staleJoinResponse());
  await settleAsync();
  assert(expertA.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} late expert A permission tracks stop exactly once`);
  assert.equal(harness.sandbox.OB_RTC.isActive(), true, `${testName} expert B survives expert A's late resolve and stale socket response`);
  assert(expertB.tracks.every((track) => track.stopCalls === 0 && track.readyState === 'live'),
    `${testName} expert A's late continuation cannot stop expert B tracks`);
  assert.equal(localVideo.srcObject ?? null, null, `${testName} late permission cannot attach on a closed session`);
  assert.equal(control.actions().some((action) => action === 'createTransport' || action === 'produce'), false,
    `${testName} late permission cannot create a transport or produce media`);
  assert.equal(control.peerStarts(), 0, `${testName} invalid expert A cannot enter peer fallback`);

  await changeAuth(harness, null);
  assert.equal(await startB, false, `${testName} final expert B pending start resolves invalid`);
  assert(expertB.tracks.every((track) => track.stopCalls === 1 && track.readyState === 'ended'),
    `${testName} expert B's real session owner stops its tracks exactly once`);
  assert.equal(control.sockets[1].closeCalls, 1, `${testName} final reset closes expert B signaling once`);
  assert.equal(sharedSignals.some((message) => message.type === 'rtc_end'), false,
    `${testName} permission privacy teardown emits no deliberate rtc_end`);
}

for (const role of ['client', 'expert']) {
  for (const channel of ['voice', 'video']) {
    await assertRealSfuConsumedPrewarmIdentityHandoff(role, channel);
    await assertRealSfuPendingPermissionIdentityHandoff(role, channel);
  }
}

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

// Peer-only expert startup is also identity-owned and cannot finish after logout.
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
new vm.Script(mediaPrewarmOwnerSource, { filename: 'expert-peer-identity-owner.js' }).runInContext(expertMediaHarness.sandbox);
const expertMediaStart = expertMediaHarness.sandbox.OB_RTC.start('session-expert-voice', 'voice', 'expert');
for (let turn = 0; turn < 10 && !resolveExpertMedia; turn += 1) await Promise.resolve();
assert(resolveExpertMedia, 'expert getUserMedia is pending before the payment auth reset');
await changeAuth(expertMediaHarness, null);
resolveExpertMedia({ getTracks: () => [pendingExpertTrack], getAudioTracks: () => [pendingExpertTrack], getVideoTracks: () => [] });
assert.equal(await expertMediaStart, false, 'expert RTC startup is invalid after expert logout');
assert.equal(expertPeerConnections, 0, 'logged-out expert RTC cannot install a peer connection');
assert.equal(pendingExpertTrack.stopped, 1, 'late expert microphone is stopped exactly once');
assert.equal(expertMediaHarness.sandbox.OB_RTC.getRole(), null, 'expert identity reset clears peer RTC ownership');

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
liveRaceHooks.state.amountCents = 500;
liveRaceHooks.state.currency = 'usd';
liveRaceHooks.state.hasAmountSnapshot = true;
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
liveRaceHooks.state.amountCents = 500;
liveRaceHooks.state.currency = 'usd';
liveRaceHooks.state.hasAmountSnapshot = true;
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

// My Bookings derives its label and link from the authoritative linked session,
// never from the legacy booking.status === "started" shortcut.
const clientBookingSandbox = {
  __OB_TEST_HOOKS__: true,
  window: {},
  location: { origin: 'https://ownlybiz.example', hostname: 'ownlybiz.example' },
  encodeURIComponent,
};
clientBookingSandbox.window = clientBookingSandbox;
vm.createContext(clientBookingSandbox);
new vm.Script(clientBookingHelpersSource, { filename: 'client-booking-lifecycle.js' }).runInContext(clientBookingSandbox);
const clientBookingHooks = clientBookingSandbox.obClientBookingTestHooks;
assert.equal(clientBookingHooks.lifecycle({ status: 'started', session_id: 'session-ready', session_status: 'active', session_started_at: null }).label, 'Ready to join',
  'an active scheduled session that is waiting for the client is ready to join');
assert.equal(clientBookingHooks.lifecycle({ status: 'started', session_id: 'session-live', session_status: 'active', session_started_at: 1_786_729_600 }).label, 'In session',
  'an active scheduled session with billing started is shown in session');
assert.equal(clientBookingHooks.lifecycle({ status: 'started', session_status: 'active', session_started_at: null }).label, 'Session starting',
  'an active status without a linked session id is not presented as fully ready');
assert.equal(clientBookingHooks.lifecycle({ status: 'started', session_status: 'settling' }).label, 'Finalizing',
  'a settling scheduled session is never shown as completed early');
assert.equal(clientBookingHooks.lifecycle({ status: 'started', session_status: 'ended' }).label, 'Completed',
  'only an ended linked session is completed');
assert.equal(clientBookingHooks.lifecycle({ status: 'started', session_status: 'cancelled' }).label, 'Cancelled',
  'a cancelled linked session remains cancelled');
assert.equal(clientBookingHooks.lifecycle({ status: 'started', session_status: 'failed' }).label, 'Failed',
  'a failed linked session remains failed');
assert.notEqual(clientBookingHooks.lifecycle({ status: 'started' }).label, 'Completed',
  'legacy started without linked-session truth can never become Completed');

clientBookingSandbox._obIsPublicExpertHost = () => false;
assert.equal(
  clientBookingHooks.joinUrl({ id: 'booking 1', expert_slug: 'luna-psychic' }),
  'https://ownlybiz.example/luna-psychic?booking=booking%201',
  'platform and Vercel booking links retain the expert slug route',
);
clientBookingSandbox._obIsPublicExpertHost = () => true;
assert.equal(
  clientBookingHooks.joinUrl({ id: 'booking 1', expert_slug: 'luna-psychic' }),
  'https://ownlybiz.example/?booking=booking%201',
  'expert subdomains and custom domains keep the booking link at their root',
);
delete clientBookingSandbox._obIsPublicExpertHost;
clientBookingSandbox.location.origin = 'https://ownlybiz-git-staging.example.vercel.app';
clientBookingSandbox.location.hostname = 'ownlybiz-git-staging.example.vercel.app';
assert.equal(
  clientBookingHooks.joinUrl({ id: 'booking-vercel', expert_slug: 'luna-psychic' }),
  'https://ownlybiz-git-staging.example.vercel.app/luna-psychic?booking=booking-vercel',
  'Vercel staging hosts retain the expert slug even before the expert-host resolver initializes',
);
clientBookingSandbox.location.origin = 'https://lunapsychics.example';
clientBookingSandbox.location.hostname = 'lunapsychics.example';
assert.equal(
  clientBookingHooks.joinUrl({ id: 'booking-custom', expert_slug: 'luna-psychic' }),
  'https://lunapsychics.example/?booking=booking-custom',
  'custom domains stay at the root even before the expert-host resolver initializes',
);

const scheduledData = (owner, ready = true) => ({
  owner,
  status: 'waiting',
  authorization_required: true,
  authorization_ready: ready,
  authorization_available: true,
  authorization_expires_at: Math.floor((Date.now() + 5 * 60_000) / 1000),
  amount_authorized_cents: ready ? 725 : null,
  currency: ready ? 'usd' : null,
  booking: { id: 'booking-account-isolation', expert_id: 'expert-scheduled', channel: 'chat', payment_mode: 'minute', booking_type: 'permin' },
});

// Reloading after the one-shot booking_session_started event uses the authenticated
// join response as the source of truth, but Voice and Video cannot enter until the
// exact scheduled media preflight succeeds. The granted stream is then prewarmed
// for the same role/channel and the exact linked session resumes automatically.
async function assertScheduledMediaPreflight(channel) {
  const bookingId = `booking-active-${channel}`;
  const sessionId = `scheduled-session-${channel}`;
  const harness = createHarness({
    search: `?booking=${bookingId}`,
    session: { ob_t: clientAToken },
    fetchImpl: (url) => {
      if (String(url).includes(`/api/bookings/${bookingId}/join`)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'active',
            booking: { id: bookingId, expert_id: 'expert-active', channel, status: 'started' },
            session: { id: sessionId, status: 'active', started_at: null, channel },
          }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'unexpected request' }) });
    },
  });
  const overlay = new FakeElement('div'); overlay.id = 'booking-join-overlay';
  const panel = new FakeElement('div'); panel.appendChild(new FakeElement('div')); overlay.appendChild(panel); harness.body.appendChild(overlay);
  const constraintsSeen = [];
  const stoppedTracks = [];
  const audioTrack = { kind: 'audio', readyState: 'live', enabled: true, stop() { stoppedTracks.push('audio'); } };
  const videoTrack = { kind: 'video', readyState: 'live', enabled: true, stop() { stoppedTracks.push('video'); } };
  const tracks = channel === 'video' ? [audioTrack, videoTrack] : [audioTrack];
  const stream = {
    getTracks: () => tracks,
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => channel === 'video' ? [videoTrack] : [],
  };
  harness.sandbox.navigator = { mediaDevices: { getUserMedia: async (constraints) => { constraintsSeen.push(constraints); return stream; } } };
  const prewarmed = [];
  harness.sandbox.ExpertSfuClient = { setPrewarmedStream: (...args) => prewarmed.push(args) };
  const rtcHandoffs = [];
  harness.sandbox.OB_RTC = {
    setScheduledPreflightStream(...args) { rtcHandoffs.push(args); return true; },
  };
  const joins = [];
  harness.sandbox.joinActiveBookingSession = (...args) => joins.push(args);
  const hooks = harness.sandbox.obPayPerMinuteAuthorizationTestHooks;

  await hooks.enhanceBookingJoinOverlay({ force: true });
  assert.deepEqual(joins, [], `${channel} does not auto-join before device preflight`);
  assert.equal(harness.document.getElementById('ob-booking-auth-heading').textContent,
    `Your ${channel} session is ready`, `${channel} active recovery renders the owned preflight gate`);
  const button = harness.document.getElementById('ob-booking-media-enable');
  assert(button, `${channel} preflight exposes one explicit device action`);
  await button.click();
  await settleAsync();

  assert.equal(JSON.stringify(constraintsSeen), JSON.stringify([
    channel === 'video' ? { audio: true, video: true } : { audio: true, video: false },
  ]), `${channel} requests only its required devices once`);
  assert.equal(prewarmed.length, 1, `${channel} grants one prewarmed stream`);
  assert.deepEqual(prewarmed[0].slice(0, 1), ['client']);
  assert.equal(prewarmed[0][1], stream);
  assert.equal(prewarmed[0][2], channel);
  assert.deepEqual(rtcHandoffs, [[stream, sessionId, channel, 'client']],
    `${channel} transfers the granted stream to the exact RTC session before joining`);
  assert.deepEqual(joins, [[sessionId, 'expert-active', channel]],
    `${channel} enters the exact linked session after successful preflight`);
  assert.deepEqual(stoppedTracks, [], `${channel} keeps the prewarmed stream alive for RTC handoff`);
  assert.equal(harness.document.getElementById('ob-booking-auth-heading'), null,
    `${channel} removes the scheduled overlay UI only after the gate succeeds`);
}
await assertScheduledMediaPreflight('voice');
await assertScheduledMediaPreflight('video');

// A scheduled media grant belongs to the stable client + booking + channel,
// not to a transient controller snapshot or same-principal JWT. Force reloads
// and credential rotation must preserve the exact live stream; true teardown
// must clear its SFU owner and stop every track exactly once.
async function assertScheduledMediaSurvivesOwnedRefresh(channel) {
  const bookingId = `booking-owned-refresh-${channel}`;
  const stoppedTracks = [];
  const audioTrack = {
    kind: 'audio', readyState: 'live',
    stop() { if(this.readyState !== 'ended') { this.readyState = 'ended'; stoppedTracks.push('audio'); } },
  };
  const videoTrack = {
    kind: 'video', readyState: 'live',
    stop() { if(this.readyState !== 'ended') { this.readyState = 'ended'; stoppedTracks.push('video'); } },
  };
  const tracks = channel === 'video' ? [audioTrack, videoTrack] : [audioTrack];
  const stream = {
    getTracks: () => tracks,
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => channel === 'video' ? [videoTrack] : [],
  };
  const requests = [];
  let authorizationReady = false;
  const harness = createHarness({
    search: `?booking=${bookingId}`,
    session: { ob_t: clientAToken },
    fetchImpl: (url, init = {}) => {
      requests.push({ url: String(url), authorization: init.headers?.Authorization || '' });
      if(String(url).includes(`/api/bookings/${bookingId}/join`)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'waiting', authorization_required: true, authorization_ready: authorizationReady, authorization_available: true,
            authorization_expires_at: Math.floor((Date.now() + 5 * 60_000) / 1000),
            amount_authorized_cents: authorizationReady ? 500 : null, currency: authorizationReady ? 'usd' : null,
            booking: { id: bookingId, expert_id: 'expert-owned-refresh', channel, status: 'confirmed', payment_mode: 'minute' },
          }),
        });
      }
      if(String(url).includes('/api/payments/config')) {
        return Promise.resolve({ ok: true, json: async () => ({
          publishable_key: 'pk_test_owned_refresh', session_authorization_amount_cents: 500, session_authorization_currency: 'usd',
          session_authorization_policy_revision: 'policy-default-500-v1',
        }) });
      }
      if(String(url).includes('/api/payments/methods/status')) {
        return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: true, mode: 'test' }) });
      }
      if(String(url).endsWith('/api/payments/authorize')) {
        return Promise.resolve({ ok: true, json: async () => ({
          payment_intent_id: `pi-owned-refresh-${channel}`,
          authorization_request_id: `request-owned-refresh-${channel}`,
          status: 'requires_capture', amount_authorized_cents: 500, amount_authorized: 5, currency: 'usd',
        }) });
      }
      if(String(url).includes(`/api/bookings/${bookingId}/authorize`)) {
        authorizationReady = true;
        return Promise.resolve({ ok: true, json: async () => ({ success: true, authorization_ready: true }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'unexpected request' }) });
    },
  });
  const overlay = new FakeElement('div'); overlay.id = 'booking-join-overlay';
  const panel = new FakeElement('div'); panel.appendChild(new FakeElement('div')); overlay.appendChild(panel); harness.body.appendChild(overlay);
  let getUserMediaCalls = 0;
  harness.sandbox.navigator = {
    mediaDevices: { getUserMedia: async () => { getUserMediaCalls += 1; return stream; } },
  };
  let registeredPrewarm = null;
  const prewarmRegistrations = [];
  const prewarmClears = [];
  harness.sandbox.ExpertSfuClient = {
    setPrewarmedStream(role, ownedStream, ownedChannel, owner) {
      registeredPrewarm = { role, stream: ownedStream, channel: ownedChannel, owner };
      prewarmRegistrations.push(registeredPrewarm);
      return true;
    },
    clearPrewarmedStream(role, expectedStream) {
      prewarmClears.push({ role, stream: expectedStream });
      if(!registeredPrewarm || registeredPrewarm.role !== role || registeredPrewarm.stream !== expectedStream) return false;
      registeredPrewarm = null;
      expectedStream.getTracks().forEach((track) => track.stop());
      return true;
    },
  };
  const hooks = harness.sandbox.obPayPerMinuteAuthorizationTestHooks;

  await hooks.enhanceBookingJoinOverlay({ force: true });
  await harness.document.getElementById('ob-booking-media-enable').click();
  await settleAsync();
  const originalContext = hooks.bookingController.context;
  assert.equal(hooks.bookingController.media.stream, stream, `${channel} owns its ready scheduled stream before refresh`);
  assert.equal(harness.document.getElementById('ob-booking-media-enable'), null, `${channel} removes its enable action after the exact grant`);

  await hooks.enhanceBookingJoinOverlay({ force: true });
  assert.equal(hooks.bookingController.context, originalContext, `${channel} reuses the exact controller context for a same-credential force reload`);
  assert.equal(hooks.bookingController.media.stream, stream, `${channel} force reload preserves the exact scheduled stream`);
  assert.equal(harness.document.getElementById('ob-booking-media-enable'), null, `${channel} force reload cannot resurrect the enable action`);
  assert.deepEqual(stoppedTracks, [], `${channel} force reload cannot stop scheduled tracks`);

  await hooks.authorizeScheduledBooking(false);
  assert.equal(authorizationReady, true, `${channel} scheduled authorization binds successfully`);
  assert.equal(hooks.bookingController.media.stream, stream, `${channel} authorize, bind, and reload preserve the exact scheduled stream`);
  assert.equal(harness.document.getElementById('ob-booking-media-enable'), null, `${channel} authorization cannot resurrect the enable action`);
  assert.match(harness.document.getElementById('ob-booking-media-status').textContent, /ready\./,
    `${channel} remains visibly media-ready after authorization`);
  assert.deepEqual(stoppedTracks, [], `${channel} authorization cannot stop scheduled tracks`);

  await changeAuth(harness, clientARotatedToken);
  assert.equal(hooks.bookingController.context.token, clientARotatedToken, `${channel} controller adopts the rotated credential`);
  assert.equal(hooks.bookingController.media.stream, stream, `${channel} same-principal rotation preserves the exact scheduled stream`);
  assert.equal(harness.document.getElementById('ob-booking-media-enable'), null, `${channel} rotation keeps the ready state rendered`);
  assert.equal(getUserMediaCalls, 1, `${channel} refresh and rotation never request devices twice`);
  assert.deepEqual(stoppedTracks, [], `${channel} same-principal rotation cannot stop scheduled tracks`);
  assert.equal(registeredPrewarm?.stream, stream, `${channel} SFU prewarm is rebound to the live stream`);
  assert(prewarmRegistrations.length >= 2, `${channel} rotation republishes the stream under current ownership`);

  await changeAuth(harness, null);
  assert.equal(hooks.bookingController.media.stream, null, `${channel} logout clears scheduled media ownership`);
  assert.deepEqual(stoppedTracks, channel === 'video' ? ['audio', 'video'] : ['audio'], `${channel} logout stops each scheduled track exactly once`);
  assert.equal(prewarmClears.length, 1, `${channel} logout clears the exact SFU prewarm owner once`);
  assert.equal(registeredPrewarm, null, `${channel} logout leaves no SFU prewarm owner`);
  assert.equal(requests.filter((request) => request.url.includes('/join')).length >= 3, true,
    `${channel} initial, forced, and rotated readiness loads all execute`);
}
await assertScheduledMediaSurvivesOwnedRefresh('voice');
await assertScheduledMediaSurvivesOwnedRefresh('video');

async function assertScheduledPendingGrantRejectsRotation(channel) {
  const bookingId = `booking-pending-rotation-${channel}`;
  let resolveMedia;
  const lateStops = [];
  const audioTrack = { kind: 'audio', readyState: 'live', stop() { if(this.readyState !== 'ended') { this.readyState = 'ended'; lateStops.push('audio'); } } };
  const videoTrack = { kind: 'video', readyState: 'live', stop() { if(this.readyState !== 'ended') { this.readyState = 'ended'; lateStops.push('video'); } } };
  const tracks = channel === 'video' ? [audioTrack, videoTrack] : [audioTrack];
  const lateStream = {
    getTracks: () => tracks,
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => channel === 'video' ? [videoTrack] : [],
  };
  const harness = createHarness({
    search: `?booking=${bookingId}`,
    session: { ob_t: clientAToken },
    fetchImpl: (url) => {
      if(String(url).includes(`/api/bookings/${bookingId}/join`)) {
        return Promise.resolve({ ok: true, json: async () => ({
          status: 'waiting', authorization_required: true, authorization_ready: false, authorization_available: true,
          booking: { id: bookingId, expert_id: 'expert-pending-rotation', channel, status: 'confirmed', payment_mode: 'minute' },
        }) });
      }
      if(String(url).includes('/api/payments/methods/status')) {
        return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: true, mode: 'test' }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'unexpected request' }) });
    },
  });
  const overlay = new FakeElement('div'); overlay.id = 'booking-join-overlay';
  const panel = new FakeElement('div'); panel.appendChild(new FakeElement('div')); overlay.appendChild(panel); harness.body.appendChild(overlay);
  harness.sandbox.navigator = { mediaDevices: { getUserMedia: () => new Promise((resolve) => { resolveMedia = resolve; }) } };
  let registered = 0;
  harness.sandbox.ExpertSfuClient = {
    setPrewarmedStream() { registered += 1; return true; },
    clearPrewarmedStream() { return false; },
  };
  const hooks = harness.sandbox.obPayPerMinuteAuthorizationTestHooks;
  await hooks.enhanceBookingJoinOverlay({ force: true });
  const pendingGrant = harness.document.getElementById('ob-booking-media-enable').click();
  await settleAsync();
  assert(resolveMedia, `${channel} permission request is pending before rotation`);
  assert.equal(hooks.bookingController.media.phase, 'requesting', `${channel} controller records its pending grant`);

  await changeAuth(harness, clientARotatedToken);
  resolveMedia(lateStream);
  await pendingGrant;
  await settleAsync();
  assert.equal(hooks.bookingController.context.token, clientARotatedToken, `${channel} pending-grant controller adopts the rotated credential`);
  assert.equal(hooks.bookingController.media.stream, null, `${channel} late pre-rotation grant cannot install after rotation`);
  assert.equal(registered, 0, `${channel} late pre-rotation grant cannot register with SFU`);
  assert.deepEqual(lateStops, channel === 'video' ? ['audio', 'video'] : ['audio'], `${channel} late pre-rotation tracks stop exactly once`);
  assert(harness.document.getElementById('ob-booking-media-enable'), `${channel} current credential receives a fresh explicit media action`);
}
await assertScheduledPendingGrantRejectsRotation('voice');
await assertScheduledPendingGrantRejectsRotation('video');

// Every accepted join snapshot reconciles the immutable booking/channel before
// lifecycle rendering. A late permission grant from an older channel cannot
// publish media after the server advances the booking into a different channel.
async function assertScheduledPendingGrantRejectsChannelChange() {
  const bookingId = 'booking-pending-channel-change';
  let channel = 'video';
  let status = 'waiting';
  let resolveMedia;
  let registered = 0;
  const tracks = ['audio', 'video'].map((kind) => ({
    kind, readyState: 'live', stopCalls: 0,
    stop() { this.stopCalls += 1; this.readyState = 'ended'; },
  }));
  const lateVideoStream = {
    getTracks: () => tracks,
    getAudioTracks: () => [tracks[0]],
    getVideoTracks: () => [tracks[1]],
  };
  const harness = createHarness({
    search: `?booking=${bookingId}`,
    session: { ob_t: clientAToken },
    fetchImpl: (url) => {
      if(String(url).includes(`/api/bookings/${bookingId}/join`)) {
        return Promise.resolve({ ok: true, json: async () => ({
          status,
          authorization_required: true,
          authorization_available: true,
          authorization_ready: false,
          booking: {
            id: bookingId,
            expert_id: 'expert-channel-change',
            channel,
            status: status === 'active' ? 'started' : 'confirmed',
            payment_mode: 'minute',
          },
        }) });
      }
      if(String(url).includes('/api/payments/methods/status')) {
        return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: true, mode: 'test' }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'unexpected request' }) });
    },
  });
  const overlay = new FakeElement('div'); overlay.id = 'booking-join-overlay';
  const panel = new FakeElement('div'); panel.appendChild(new FakeElement('div')); overlay.appendChild(panel); harness.body.appendChild(overlay);
  harness.sandbox.navigator = { mediaDevices: { getUserMedia: () => new Promise((resolve) => { resolveMedia = resolve; }) } };
  harness.sandbox.ExpertSfuClient = {
    setPrewarmedStream() { registered += 1; return true; },
    clearPrewarmedStream() { return false; },
  };
  const hooks = harness.sandbox.obPayPerMinuteAuthorizationTestHooks;
  await hooks.enhanceBookingJoinOverlay({ force: true });
  const pendingGrant = harness.document.getElementById('ob-booking-media-enable').click();
  await settleAsync();
  assert(resolveMedia, 'Video permission remains pending before the authoritative channel transition');

  channel = 'voice';
  status = 'active';
  await hooks.enhanceBookingJoinOverlay({ force: true });
  assert.equal(hooks.bookingController.media.channel, 'voice', 'accepted starting lifecycle reconciles the current Voice channel');
  resolveMedia(lateVideoStream);
  await pendingGrant;
  await settleAsync();

  assert.equal(hooks.bookingController.media.stream, null, 'late Video grant cannot install after the booking becomes Voice');
  assert.equal(registered, 0, 'late mismatched Video grant is never registered with SFU');
  assert.deepEqual(tracks.map((track) => track.stopCalls), [1, 1], 'late mismatched media tracks stop exactly once');
}
await assertScheduledPendingGrantRejectsChannelChange();

// The real page registers media-prewarm before RTC and scheduled-booking
// teardown. All adapters may observe the same old stream, but only one owns the
// SFU release and an already-ended MediaStreamTrack is never stopped twice.
async function assertScheduledFullAdapterTeardownStopsOnce() {
  const bookingId = 'booking-full-adapter-teardown';
  const tracks = ['audio', 'video'].map((kind) => ({
    kind, readyState: 'live', stopCalls: 0,
    stop() { this.stopCalls += 1; this.readyState = 'ended'; },
  }));
  const stream = {
    getTracks: () => tracks,
    getAudioTracks: () => [tracks[0]],
    getVideoTracks: () => [tracks[1]],
  };
  const harness = createHarness({
    search: `?booking=${bookingId}`,
    session: { ob_t: clientAToken },
    beforeControllerSources: [mediaPrewarmOwnerSource],
    fetchImpl: (url) => {
      if(String(url).includes(`/api/bookings/${bookingId}/join`)) {
        return Promise.resolve({ ok: true, json: async () => ({
          status: 'waiting', authorization_required: true, authorization_available: true, authorization_ready: false,
          booking: { id: bookingId, expert_id: 'expert-full-adapter', channel: 'video', status: 'confirmed', payment_mode: 'minute' },
        }) });
      }
      if(String(url).includes('/api/payments/methods/status')) {
        return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: true, mode: 'test' }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'unexpected request' }) });
    },
  });
  const overlay = new FakeElement('div'); overlay.id = 'booking-join-overlay';
  const panel = new FakeElement('div'); panel.appendChild(new FakeElement('div')); overlay.appendChild(panel); harness.body.appendChild(overlay);
  harness.sandbox.navigator = { mediaDevices: { getUserMedia: async () => stream } };
  let ownedStream = null;
  let ownershipReleases = 0;
  let clearAttempts = 0;
  harness.sandbox.ExpertSfuClient = {
    setPrewarmedStream(role, candidate) { if(role === 'client') ownedStream = candidate; return true; },
    clearPrewarmedStream(role, expected) {
      clearAttempts += 1;
      if(role !== 'client' || !ownedStream || (expected && expected !== ownedStream)) return false;
      const released = ownedStream; ownedStream = null; ownershipReleases += 1;
      if(harness.sandbox._obClientMediaReadyStream === released) {
        harness.sandbox._obClientMediaReadyStream = null;
        harness.sandbox._obClientMediaReadyChannel = '';
      }
      if(harness.sandbox._obRtcPrewarmedStream === released) harness.sandbox._obRtcPrewarmedStream = null;
      released.getTracks().forEach((track) => track.stop());
      return true;
    },
  };
  harness.sandbox.OB_RTC = {
    getRole: () => 'client',
    resetClientContext: () => harness.sandbox.ExpertSfuClient.clearPrewarmedStream('client', stream),
  };
  const hooks = harness.sandbox.obPayPerMinuteAuthorizationTestHooks;
  await hooks.enhanceBookingJoinOverlay({ force: true });
  await harness.document.getElementById('ob-booking-media-enable').click();
  await settleAsync();
  assert.equal(ownedStream, stream, 'scheduled Video stream is SFU-owned before full identity teardown');

  await changeAuth(harness, null);
  assert(clearAttempts >= 2, 'full page adapter order observes the old stream from more than one teardown owner');
  assert.equal(ownershipReleases, 1, 'only one adapter removes the exact SFU owner');
  assert.deepEqual(tracks.map((track) => track.stopCalls), [1, 1], 'full adapter teardown invokes stop exactly once per track');
  assert.equal(hooks.bookingController.media.stream, null, 'scheduled controller discards the released stream reference');
}
await assertScheduledFullAdapterTeardownStopsOnce();

async function assertScheduledLifecycleHeading(status, expectedHeading, sessionStatus = status) {
  const bookingId = `booking-${status}`;
  const harness = createHarness({
    search: `?booking=${bookingId}`,
    session: { ob_t: clientAToken },
    fetchImpl: (url) => {
      if (String(url).includes(`/api/bookings/${bookingId}/join`)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status,
            booking: { id: bookingId, expert_id: 'expert-scheduled', channel: 'chat', status: status === 'ended' ? 'started' : status },
            session: { id: `session-${status}`, status: sessionStatus },
          }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'unexpected request' }) });
    },
  });
  const overlay = new FakeElement('div'); overlay.id = 'booking-join-overlay';
  const panel = new FakeElement('div'); panel.appendChild(new FakeElement('div')); overlay.appendChild(panel); harness.body.appendChild(overlay);
  await harness.sandbox.obPayPerMinuteAuthorizationTestHooks.enhanceBookingJoinOverlay({ force: true });
  assert.equal(harness.document.getElementById('ob-booking-auth-heading').textContent, expectedHeading);
  assert.equal(harness.document.getElementById('ob-booking-auth-submit'), null,
    `${status} lifecycle truth cannot render a payment action`);
}
await assertScheduledLifecycleHeading('settling', 'Finalizing your session');
await assertScheduledLifecycleHeading('ended', 'Session completed');
await assertScheduledLifecycleHeading('cancelled', 'Booking cancelled');
await assertScheduledLifecycleHeading('failed', 'Session could not be completed');

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
    if (request.url.includes('/api/payments/authorize/cancel')) return Promise.resolve({ ok: true, json: async () => ({ canceled: true, already_final: false, pending: false }) });
    return Promise.resolve({ ok: false, json: async () => ({ error: 'unexpected request' }) });
  },
});
const scheduledJoinOverlay = new FakeElement('div'); scheduledJoinOverlay.id = 'booking-join-overlay';
const scheduledJoinPanel = new FakeElement('div'); scheduledJoinPanel.appendChild(new FakeElement('div')); scheduledJoinOverlay.appendChild(scheduledJoinPanel); scheduledJoinHarness.body.appendChild(scheduledJoinOverlay);
const scheduledJoinHooks = scheduledJoinHarness.sandbox.obPayPerMinuteAuthorizationTestHooks;
let staleScheduledActiveJoins = 0;
scheduledJoinHarness.sandbox.joinActiveBookingSession = () => { staleScheduledActiveJoins += 1; };
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
assert.equal(scheduledJoinHarness.document.getElementById('ob-booking-auth-heading').textContent, '✓ $7.25 temporary authorization approved',
  'signup/login immediately re-renders client B scheduled payment readiness');

resolveScheduledAJoin({
  ok: true,
  json: async () => ({
    owner: 'client-a',
    status: 'active',
    booking: { id: 'booking-account-isolation', expert_id: 'expert-a', channel: 'chat', status: 'started' },
    session: { id: 'client-a-active-session', status: 'active' },
  }),
});
await lateScheduledAJoin;
assert.equal(scheduledJoinHooks.bookingController.context.accountKey, clientBKey, 'late client-A join response cannot reclaim the scheduled controller');
assert.equal(scheduledJoinHooks.bookingController.data.owner, 'client-b', 'late client-A join data cannot replace client B data');
assert.equal(scheduledJoinHarness.document.getElementById('ob-booking-auth-heading').textContent, '✓ $7.25 temporary authorization approved',
  'late client-A join response cannot replace client B scheduled UI');
assert.equal(staleScheduledActiveJoins, 0,
  'a late active-session response for client A cannot route client B into A\'s session');
const scheduledJoinAuth = scheduledJoinRequests.filter((request) => request.url.includes('/join')).map((request) => request.authorization);
assert.deepEqual(scheduledJoinAuth, [`Bearer ${clientAToken}`, `Bearer ${clientBToken}`],
  'scheduled booking readiness is fetched once with each account\'s captured credential');
assert(scheduledJoinRequests.filter((request) => request.url.includes('/join')).every((request) => request.cache === 'no-store'),
  'scheduled booking readiness bypasses HTTP cache for both accounts');

// Expert End owns the server response before it mutates the live panel. A backend
// failure leaves the active session intact; only a successful authoritative response
// is allowed to apply terminal state.
const failedExpertEndToasts = [];
let failedExpertEndApplied = 0;
const failedExpertEndHarness = createHarness({
  session: { ob_t: expertToken },
  fetchImpl: (url) => {
    if (String(url).includes('/api/sessions/expert-session-failure/end')) {
      return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'Authoritative session billing inputs are incomplete.' }) });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'unexpected request' }) });
  },
});
const failedExpertEndButton = attachPersistentExpertEndButton(failedExpertEndHarness, '\u2715 End Session');
failedExpertEndHarness.sandbox._sessId = 'expert-session-failure';
failedExpertEndHarness.sandbox._sid = 'expert-session-failure';
failedExpertEndHarness.sandbox._obActiveSessId = 'expert-session-failure';
failedExpertEndHarness.sandbox.toast = (message, kind) => failedExpertEndToasts.push({ message, kind });
failedExpertEndHarness.sandbox.obApplyAuthoritativeExpertEnded = () => { failedExpertEndApplied += 1; };
assert.equal(await failedExpertEndHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.endExpertSession(), false,
  'a non-2xx expert End response reports failure');
assert.equal(failedExpertEndApplied, 0, 'a failed expert End never applies terminal UI state');
assert.equal(failedExpertEndHarness.sandbox._obActiveSessId, 'expert-session-failure',
  'a failed expert End retains the active session owner');
assert.equal(failedExpertEndHarness.sandbox._sid, 'expert-session-failure',
  'a failed expert End retains the expert session id');
assert.equal(failedExpertEndToasts.at(-1)?.kind, 'err', 'a failed expert End surfaces a visible error');
assert.equal(failedExpertEndButton.disabled, false, 'a failed expert End re-enables its persistent control');
assert.equal(failedExpertEndButton.textContent, '\u2715 End Session', 'a failed expert End restores its persistent control label');
assert.equal(failedExpertEndButton.dataset.obEndLabel, undefined, 'a failed expert End releases its control ownership marker');

const pendingExpertEndPayloads = [];
let pendingExpertEndAppliedAsFinal = 0;
const pendingExpertEndHarness = createHarness({
  session: { ob_t: expertToken },
  fetchImpl: (url, init = {}) => {
    assert(String(url).includes('/api/sessions/expert-session-settling/end'));
    assert.equal(init.headers.Authorization, `Bearer ${expertToken}`);
    return Promise.resolve({
      ok: true,
      status: 202,
      json: async () => ({
        accepted: true,
        ended: false,
        settlement_pending: true,
        billing_stopped: true,
        code: 'session_settlement_pending',
        session: { id: 'expert-session-settling', status: 'settling', settlement_duration_secs: 58 },
      }),
    });
  },
});
const pendingExpertEndButton = attachPersistentExpertEndButton(pendingExpertEndHarness);
pendingExpertEndHarness.sandbox._sessId = 'expert-session-settling';
pendingExpertEndHarness.sandbox._sid = 'expert-session-settling';
pendingExpertEndHarness.sandbox._obActiveSessId = 'expert-session-settling';
pendingExpertEndHarness.sandbox.obApplyAuthoritativeExpertEnded = () => { pendingExpertEndAppliedAsFinal += 1; };
pendingExpertEndHarness.sandbox.obApplyExpertSettlementPending = (payload) => {
  pendingExpertEndPayloads.push(payload);
  pendingExpertEndHarness.sandbox._sessId = null;
  pendingExpertEndHarness.sandbox._sid = null;
  pendingExpertEndHarness.sandbox._obActiveSessId = null;
};
assert.equal(await pendingExpertEndHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.endExpertSession(), true,
  'a 202 expert End response is accepted because billing has already stopped');
assert.equal(pendingExpertEndPayloads.length, 1, 'expert settlement-pending UI is applied exactly once');
assert.equal(pendingExpertEndPayloads[0].session.id, 'expert-session-settling');
assert.equal(pendingExpertEndPayloads[0].session.status, 'settling');
assert.equal(pendingExpertEndAppliedAsFinal, 0, 'pending settlement is not misrepresented as a final payout');
assert.equal(pendingExpertEndButton.disabled, false, 'accepted settlement releases the persistent End control');
assert.equal(pendingExpertEndButton.textContent, 'End Session', 'accepted settlement restores the persistent control label');

const successfulExpertEndPayloads = [];
const successfulExpertEndRequests = [];
const successfulExpertEndHarness = createHarness({
  session: { ob_t: expertToken },
  fetchImpl: (url, init = {}) => {
    const requestUrl = String(url);
    const sessionId = requestUrl.includes('/expert-session-success-next/end')
      ? 'expert-session-success-next'
      : 'expert-session-success';
    assert(requestUrl.includes(`/api/sessions/${sessionId}/end`));
    assert.equal(init.headers.Authorization, `Bearer ${expertToken}`, 'expert End uses its captured account credential');
    successfulExpertEndRequests.push(sessionId);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ expert_earned: sessionId.endsWith('-next') ? 3.25 : 2.5, session: { id: sessionId, status: 'ended' } }),
    });
  },
});
const successfulExpertEndButton = attachPersistentExpertEndButton(successfulExpertEndHarness);
successfulExpertEndHarness.sandbox._sessId = 'expert-session-success';
successfulExpertEndHarness.sandbox._sid = 'expert-session-success';
successfulExpertEndHarness.sandbox._obActiveSessId = 'expert-session-success';
successfulExpertEndHarness.sandbox.obApplyAuthoritativeExpertEnded = (payload) => {
  successfulExpertEndPayloads.push(payload);
  successfulExpertEndHarness.sandbox._sessId = null;
  successfulExpertEndHarness.sandbox._sid = null;
  successfulExpertEndHarness.sandbox._obActiveSessId = null;
};
assert.equal(await successfulExpertEndHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.endExpertSession(), true,
  'a successful expert End applies authoritative terminal state');
assert.equal(successfulExpertEndPayloads[0].session.id, 'expert-session-success');
assert.equal(successfulExpertEndPayloads[0].session.expert_earned, 2.5, 'top-level settlement totals reach the terminal UI owner');
assert.equal(successfulExpertEndHarness.sandbox._obActiveSessId, null, 'success clears the active live-session UI owner');
assert.equal(successfulExpertEndButton.disabled, false, 'success re-enables the persistent End control after terminal state clears the active session id');
assert.equal(successfulExpertEndButton.textContent, 'End Session', 'success restores the persistent End control label');
assert.equal(successfulExpertEndButton.dataset.obEndLabel, undefined, 'success releases its control ownership marker');

successfulExpertEndHarness.sandbox._sessId = 'expert-session-success-next';
successfulExpertEndHarness.sandbox._sid = 'expert-session-success-next';
successfulExpertEndHarness.sandbox._obActiveSessId = 'expert-session-success-next';
assert.equal(await successfulExpertEndHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.endExpertSession(), true,
  'the next expert session can be ended without reloading the persistent dashboard');
assert.deepEqual(successfulExpertEndRequests, ['expert-session-success', 'expert-session-success-next'],
  'each session receives its own authoritative End request');
assert.equal(successfulExpertEndPayloads[1].session.id, 'expert-session-success-next');
assert.equal(successfulExpertEndButton.disabled, false, 'the next session also releases the persistent End control');
assert.equal(successfulExpertEndButton.textContent, 'End Session', 'the next session restores the original persistent control label');

let resolveStaleExpertEnd;
let staleExpertEndApplied = 0;
const staleExpertEndHarness = createHarness({
  session: { ob_t: expertToken },
  fetchImpl: (url, init = {}) => {
    if (String(url).includes('/api/sessions/expert-a-session/end')) {
      assert.equal(init.headers.Authorization, `Bearer ${expertToken}`);
      return new Promise((resolve) => { resolveStaleExpertEnd = resolve; });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'unexpected request' }) });
  },
});
const staleExpertEndButton = attachPersistentExpertEndButton(staleExpertEndHarness);
staleExpertEndHarness.sandbox._sessId = 'expert-a-session';
staleExpertEndHarness.sandbox._sid = 'expert-a-session';
staleExpertEndHarness.sandbox._obActiveSessId = 'expert-a-session';
staleExpertEndHarness.sandbox.obApplyAuthoritativeExpertEnded = () => { staleExpertEndApplied += 1; };
const staleExpertEnd = staleExpertEndHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.endExpertSession();
assert(resolveStaleExpertEnd, 'expert A End request is pending before the account changes');
await changeAuth(staleExpertEndHarness, expertBToken);
staleExpertEndHarness.sandbox._sessId = 'expert-b-session';
staleExpertEndHarness.sandbox._sid = 'expert-b-session';
staleExpertEndHarness.sandbox._obActiveSessId = 'expert-b-session';
resolveStaleExpertEnd({
  ok: true,
  status: 200,
  json: async () => ({ session: { id: 'expert-a-session', status: 'ended', expert_earned: 1 } }),
});
assert.equal(await staleExpertEnd, false, 'a late expert-A success is discarded after expert B becomes current');
assert.equal(staleExpertEndApplied, 0, 'a late expert-A success cannot clear expert B live-session UI');
assert.equal(staleExpertEndHarness.sandbox._obActiveSessId, 'expert-b-session',
  'expert B keeps its active session after the stale expert-A response');
assert.equal(staleExpertEndButton.disabled, false,
  'a stale expert-A request releases its controls when no newer End request owns them');
assert.equal(staleExpertEndButton.textContent, 'End Session',
  'a stale expert-A request restores the persistent control for expert B');

let resolveOverlappedExpertAEnd;
let resolveOverlappedExpertBEnd;
const overlappedExpertEndHarness = createHarness({
  session: { ob_t: expertToken },
  fetchImpl: (url) => {
    if (String(url).includes('/api/sessions/expert-a-overlap/end')) {
      return new Promise((resolve) => { resolveOverlappedExpertAEnd = resolve; });
    }
    if (String(url).includes('/api/sessions/expert-b-overlap/end')) {
      return new Promise((resolve) => { resolveOverlappedExpertBEnd = resolve; });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'unexpected request' }) });
  },
});
const overlappedExpertEndButton = attachPersistentExpertEndButton(overlappedExpertEndHarness);
overlappedExpertEndHarness.sandbox._sessId = 'expert-a-overlap';
overlappedExpertEndHarness.sandbox._sid = 'expert-a-overlap';
overlappedExpertEndHarness.sandbox._obActiveSessId = 'expert-a-overlap';
overlappedExpertEndHarness.sandbox.obApplyAuthoritativeExpertEnded = (payload) => {
  if (payload.session_id !== 'expert-b-overlap') return;
  overlappedExpertEndHarness.sandbox._sessId = null;
  overlappedExpertEndHarness.sandbox._sid = null;
  overlappedExpertEndHarness.sandbox._obActiveSessId = null;
};
const overlappedExpertAEnd = overlappedExpertEndHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.endExpertSession();
assert(resolveOverlappedExpertAEnd, 'expert A overlapping End request is pending');
await changeAuth(overlappedExpertEndHarness, expertBToken);
overlappedExpertEndHarness.sandbox._sessId = 'expert-b-overlap';
overlappedExpertEndHarness.sandbox._sid = 'expert-b-overlap';
overlappedExpertEndHarness.sandbox._obActiveSessId = 'expert-b-overlap';
const overlappedExpertBEnd = overlappedExpertEndHarness.sandbox.obPayPerMinuteAuthorizationTestHooks.endExpertSession();
assert(resolveOverlappedExpertBEnd, 'expert B owns a newer End request before expert A resolves');
resolveOverlappedExpertAEnd({
  ok: true,
  status: 200,
  json: async () => ({ session: { id: 'expert-a-overlap', status: 'ended' } }),
});
assert.equal(await overlappedExpertAEnd, false, 'the overlapped expert-A response remains stale');
assert.equal(overlappedExpertEndButton.disabled, true,
  'a stale request cannot re-enable controls owned by the newer expert-B request');
assert.equal(overlappedExpertEndButton.textContent, 'Ending...',
  'the newer expert-B request keeps its visible busy state');
resolveOverlappedExpertBEnd({
  ok: true,
  status: 200,
  json: async () => ({ session: { id: 'expert-b-overlap', status: 'ended' } }),
});
assert.equal(await overlappedExpertBEnd, true, 'the newer expert-B End request completes normally');
assert.equal(overlappedExpertEndButton.disabled, false, 'the newer request releases its own controls');
assert.equal(overlappedExpertEndButton.textContent, 'End Session', 'the newer request restores the original control label');

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
    if (request.url.includes('/api/payments/config')) {
      return Promise.resolve({ ok: true, json: async () => ({
        publishable_key: 'pk_test_account_isolation', session_authorization_amount_cents: 500, session_authorization_currency: 'usd',
        session_authorization_policy_revision: 'policy-default-500-v1',
      }) });
    }
    if (request.url.includes('/api/payments/authorize/cancel')) return Promise.resolve({ ok: true, json: async () => ({ canceled: true, already_final: false, pending: false }) });
    if (request.url.endsWith('/api/payments/authorize')) {
      return Promise.resolve({ ok: true, json: async () => ({
        payment_intent_id: 'pi-client-a', authorization_request_id: 'authorization-client-a', status: 'requires_capture',
        amount_authorized_cents: 500, amount_authorized: 5, currency: 'usd',
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
await scheduledBindHooks.enhanceBookingJoinOverlay({ force: true });
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
  status: 'waiting',
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
    if (request.url.includes('/api/payments/config')) {
      return Promise.resolve({ ok: true, json: async () => ({
        publishable_key: 'pk_test_rotation_bind', session_authorization_amount_cents: 500, session_authorization_currency: 'usd',
        session_authorization_policy_revision: 'policy-default-500-v1',
      }) });
    }
    if (request.url.includes('/api/payments/methods/status')) {
      return Promise.resolve({ ok: true, json: async () => ({ has_saved_payment_method: false, mode: 'test' }) });
    }
    if (request.url.includes('/api/payments/authorize/cancel')) {
      return Promise.resolve({ ok: true, json: async () => ({ canceled: true, already_final: false, pending: false }) });
    }
    if (request.url.endsWith('/api/payments/authorize')) {
      if (request.body?.booking_id === 'booking-rotation-bind') {
        return Promise.resolve({ ok: true, json: async () => ({
          payment_intent_id: 'pi-scheduled-rotation',
          authorization_request_id: 'authorization-scheduled-rotation',
          status: 'requires_capture',
          amount_authorized_cents: 500,
          amount_authorized: 5,
          currency: 'usd',
        }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({
        payment_intent_id: 'pi-immediate-after-bind',
        authorization_request_id: 'authorization-immediate-after-bind',
        status: 'requires_capture',
        amount_authorized_cents: 500,
        amount_authorized: 5,
        currency: 'usd',
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
await rotatedScheduledHooks.enhanceBookingJoinOverlay({ force: true });
const rotatedScheduledAction = rotatedScheduledHooks.authorizeScheduledBooking(false);
for (let turn = 0; turn < 30 && !resolveRotatedScheduledBind; turn += 1) await Promise.resolve();
assert(resolveRotatedScheduledBind, 'scheduled bind is pending before the same-principal credential rotates');
const originatingScheduledContext = rotatedScheduledHooks.bookingController.context;
assert.equal(rotatedScheduledHooks.state.phase, 'ready', 'the scheduled hold is locally ready while server binding is pending');
assert.equal(rotatedScheduledHooks.state.paymentIntentId, 'pi-scheduled-rotation', 'the pending bind owns the scheduled PaymentIntent');
const rotatedScheduledHoldPost = rotatedScheduledRequests.find((request) => request.url.endsWith('/api/payments/authorize') && request.body?.booking_id === 'booking-rotation-bind');
assert.equal(rotatedScheduledHoldPost.body.authorization_policy_revision, 'policy-default-500-v1',
  'Book Later echoes the exact revision displayed before its click');
for (const amountKey of ['amount', 'amount_cents', 'amount_authorized', 'amount_authorized_cents', 'session_authorization_amount_cents']) {
  assert.equal(Object.hasOwn(rotatedScheduledHoldPost.body, amountKey), false, `Book Later never sends ${amountKey}`);
}
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
  disclosedPolicy: rotatedScheduledHarness.sandbox.OB_SESSION_AUTHORIZATION_POLICY.consentSnapshot(),
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
  status: 'waiting',
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
resolveDuplicateMountConfig({ ok: true, json: async () => ({
  publishable_key: 'pk_test_duplicate_mount',
  session_authorization_amount_cents: 500,
  session_authorization_currency: 'usd',
  session_authorization_policy_revision: 'policy-default-500-v1',
}) });
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
    status: 'waiting',
    authorization_required: true,
    authorization_ready: true,
    authorization_available: true,
    authorization_expires_at: Math.floor((Date.now() + 5 * 60_000) / 1000),
    amount_authorized_cents: 725,
    currency: 'usd',
    booking: { id: 'booking-already-ready', expert_id: 'expert-scheduled', channel: 'chat', payment_mode: 'minute', booking_type: 'permin' },
  },
  expectedHeading: '✓ $7.25 temporary authorization approved',
  message: 'a stale payment button cannot create a second hold after the fresh join response is already ready',
});

await assertAuthoritativeScheduledStateSkipsHold({
  bookingId: 'booking-authorization-not-required',
  data: {
    status: 'waiting',
    authorization_required: false,
    authorization_ready: false,
    authorization_available: true,
    booking: { id: 'booking-authorization-not-required', expert_id: 'expert-scheduled', channel: 'chat', payment_mode: 'minute', booking_type: 'permin' },
  },
  expectedHeading: 'No payment authorization required',
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
assert.equal((html.match(/window\.expertEndSession\s*=/g) || []).length, 1,
  'one centralized expert End controller owns every persistent End control');

let scriptCount = 0;
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  scriptCount += 1;
  if (match[1].trim()) new vm.Script(match[1], { filename: `index.html#script-${scriptCount}` });
}
assert(scriptCount > 0, 'all inline scripts were syntax parsed');

console.log('pay-per-minute authorization frontend smoke: ok');
