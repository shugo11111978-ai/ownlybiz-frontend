import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('/Users/liranbahbut/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const slice=(a,b)=>{const start=html.indexOf(a);assert(start>=0,a);const end=html.indexOf(b,start+a.length);assert(end>start,b);return html.slice(start,end);};
const markup=slice('<div class="view-panel" id="view-2">','<!-- ===== VIEW 3:');
const native=[slice('var currentStep=1;','function startRocket()'),slice('  window.realExpertSignup = async function() {','  // ── Claim subdomain'),slice('  function setSignupPlan(plan, interval){','  function updateSignupCta(){'),slice('  function updateSignupCta(){','  function currentExpertSlug(){'),slice('  async function finishSignupLaunch(){','  function signupCheckoutPlanName('),slice('  function subscriptionEndDate(data){','  function newOfferManagementHtml'),slice('  window.obStopSoftwareRenewal = async function(){','  async function handlePlanSave()')].join('\n');
assert.doesNotMatch(html,/window\.goStep\s*=|_ob_origGoStep|wrapGoStep|_goStepHooked/,'one original native signup navigator owns transitions');
assert(markup.indexOf('id="signup-pass"')<markup.indexOf('id="ob-signup-initial-plan"'),'account fields precede offer summary');
let approval={status:'pending_review',required:true,checkout_allowed:false,review_before_checkout:true,review_completed:false};
const writes=[];let cancelConfirmed=true,holdMe=false,releaseMe;
const user={id:'owned-local-expert',name:'Local Expert',role:'expert',slug:'automatic-local-slug'};
const offer={available:true,signup_available:true,signup_requires_approval:true,offer_version:'subscription_v2',catalog_revision:4,currency:'usd',payout_scope:{business_countries:['US'],currency:'usd',card_countries:['US']},payment_fee_policy:{currency:'usd',quoted_scope:'standard_us_domestic_card',processing_included:true,basis_points:450,fixed_cents:30},plans:[['starter',39,390],['pro',99,990],['scale',159,1590]].map(([id,monthly_price,annual_price])=>({id,name:id,monthly_price,annual_price,offer_version:'subscription_v2',currency:'usd',features:[],trial_quantities:{one_to_one_call_minutes:120,group_participant_minutes:0,creation_ai_credits:0}}))};
const server=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;const payload=body?JSON.parse(body):{};if(req.method==='POST')writes.push({path:req.url,body:payload});let result={};
 if(req.url==='/api/auth/signup')result={token:'local-fixture-token',user,approval,payout_country_eligibility:{country:'US',status:'supported'}};
 if(req.url==='/api/auth/me'){if(holdMe)await new Promise(r=>releaseMe=r);result={user,approval};}
 if(req.url==='/api/billing/me')result={offer_version:'subscription_v2',subscription:{status:'signup_draft'},software_trial:{already_started:false,started_at:null},approval};
 if(req.url==='/api/billing/cancel')result={success:true,...(cancelConfirmed?{cancel_at_period_end:true}:{})};
 res.writeHead(200,{'content-type':req.url==='/'?'text/html':'application/json'});res.end(req.url==='/'?'<!doctype html><html><body></body></html>':JSON.stringify(result));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin);await page.setContent('<style>.signup-step{display:none}.signup-step.active{display:block}</style>'+markup);
 await page.addScriptTag({content:fs.readFileSync(new URL('../assets/subscription-offer.js',import.meta.url),'utf8')});
 await page.evaluate(({offer,origin})=>{
  window.OWNLYBIZ_API_URL=origin;window.__OB_PUBLIC_OFFER__=offer;window.planState={selected:'pro',interval:'annual',plans:offer.plans,publicOffer:offer,billing:{}};window.obSignupPlanState=planState;
  window.qa={credential:'',user:null,attempt:0,checkouts:[],confirmations:[],messages:[],refreshes:0};
  window.token=()=>qa.credential;window.readUserSnapshot=()=>qa.user||{};window.currentBillingRole=()=>qa.user?.role||'';
  window.normalizePlanId=p=>['starter','pro','scale'].includes(p)?p:'starter';window.selectedPlan=()=>offer.plans.find(p=>p.id===planState.selected);window.selectedSignupPlanForLaunch=selectedPlan;
  window.obSignupBusinessCountries=()=>OB_SUBSCRIPTION_OFFER.businessCountries(offer);window.publicOfferRenderer=()=>OB_SUBSCRIPTION_OFFER;window.usesSubscriptionOffer=()=>true;window.signupPayoutEligibility=()=>window._obSignupPayoutEligibility||{country:'US',status:'supported'};
  window.esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.obErr=(el,msg)=>{el.textContent=msg;el.style.display='block';};
  window.obBeginAuthAttempt=()=>({id:++qa.attempt});window.obAuthAttemptCurrent=a=>a.id===qa.attempt;
  window.obCommitAuthAttempt=(a,t,u)=>{if(!obAuthAttemptCurrent(a))return null;qa.credential=t;qa.user=u;return{token:t};};
  window.obSignupOfferPayload=async()=>({offer_version:'subscription_v2',catalog_revision:4,subscription_plan:planState.selected,subscription_interval:planState.interval});
  window.obJson=async(path,options={})=>{const r=await fetch(origin+path,{method:options.method||'GET',headers:{'content-type':'application/json'},body:options.body?JSON.stringify(options.body):undefined});return r.json();};
  window.openSubscriptionCheckout=async(plan,interval,source)=>qa.checkouts.push({plan,interval,source});
  window.confirmModal=async options=>{qa.confirmations.push(options);return true;};window.isNewSubscriptionOffer=()=>true;window.toastOk=m=>qa.messages.push({ok:true,message:m});window.toastErr=m=>qa.messages.push({ok:false,message:m});window.refreshBillingUi=()=>qa.refreshes++;
 },{offer,origin});
 await page.addScriptTag({content:native});await page.evaluate(()=>{document.getElementById('view-2').classList.add('active');renderSignupPlans();document.getElementById('signup-payout-country').disabled=false;document.getElementById('signup-payout-country').innerHTML='<option value="US">United States</option>';});
 assert.equal(await page.locator('label[for="signup-email"]').count(),1);assert.equal(await page.locator('#signup-pass').getAttribute('autocomplete'),'new-password');
 await page.locator('#ob-signup-initial-plan [data-ob-signup-plan="scale"]').click();
 assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('data-ob-signup-plan')),'scale');
 await page.locator('#ob-signup-initial-plan .ob-signup-intervals').getByRole('button',{name:'Monthly',exact:true}).click();
 await page.locator('#signup-fname').fill('Local');await page.locator('#signup-lname').fill('Expert');await page.locator('#signup-email').fill('local@example.invalid');await page.locator('#signup-pass').fill('local-test-password');await page.locator('#tos-check').check();
 await page.locator('#signup-pass').press('Enter');await page.waitForFunction(()=>document.getElementById('step-7').classList.contains('active'));
 assert.equal(writes.filter(w=>w.path==='/api/auth/signup').length,1);assert.equal(await page.locator('#step-4').isVisible(),false);assert.match(await page.locator('#progress-label').innerText(),/Step 2 of 2/);assert.match(await page.locator('#step-7').innerText(),/trial has not started/);assert(await page.locator('#ob-launch-plan-btn').isDisabled());
 assert(!writes.some(w=>w.path==='/api/auth/me'),'no hidden domain/profile save');assert.equal(await page.evaluate(()=>qa.checkouts.length),0);
 const blocked=await page.evaluate(async()=>{try{await finishSignupLaunch();return '';}catch(e){return e.message;}});assert.match(blocked,/needs approval/);assert.equal(await page.evaluate(()=>qa.checkouts.length),0);
 approval={status:'signup_incomplete',required:false,checkout_allowed:true,review_before_checkout:true,review_completed:true};await page.locator('#ob-signup-approval').getByRole('button',{name:'Check approval'}).click();await page.waitForFunction(()=>!document.getElementById('ob-launch-plan-btn').disabled);
 await page.evaluate(()=>finishSignupLaunch());assert.deepEqual(await page.evaluate(()=>qa.checkouts),[{plan:'scale',interval:'monthly',source:'signup'}]);
 // A late approval response for an old principal must not modify the new principal.
 holdMe=true;const pending=page.evaluate(()=>obRefreshSignupApproval());while(!releaseMe)await new Promise(r=>setTimeout(r,5));await page.evaluate(()=>{qa.credential='different-account-token';qa.user={id:'different-user',role:'expert'};});releaseMe();await pending;holdMe=false;assert.equal(await page.evaluate(()=>currentSignupApproval()),null);
 // Original cancellation controller confirms the actual trial date and period-end result.
 await page.evaluate(()=>{planState.billing={offer_version:'subscription_v2',subscription:{stripe_subscription_id:'local-sub',status:'trialing'},software_trial:{ends_at:1795425681}};});await page.evaluate(()=>obStopSoftwareRenewal());
 const confirmed=await page.evaluate(()=>qa);assert.equal(confirmed.confirmations.at(-1).confirmText,'Cancel subscription');assert.match(confirmed.confirmations.at(-1).body,/November 23, 2026/);assert.match(confirmed.confirmations.at(-1).body,/prevents the first/);assert.match(confirmed.confirmations.at(-1).detail,/does not refund/);assert.equal(confirmed.refreshes,1);
 cancelConfirmed=false;await page.evaluate(()=>obStopSoftwareRenewal());assert.equal(await page.evaluate(()=>qa.messages.at(-1).ok),false);assert.match(await page.evaluate(()=>qa.messages.at(-1).message),/has not been confirmed/);assert.equal(errors.length,0);
 console.log(JSON.stringify({status:'PASS',checks:['native Enter submits account once','two steps; no domain/profile write','compact selection preserves disclosure and keyboard focus','pending approval prevents Checkout/trial','explicit approval refresh resumes selected plan without requiring final service approval','stale principal response ignored','trial cancellation shows actual date and no refund','unconfirmed cancellation cannot claim success'],pageErrors:errors,scope:'isolated local HTTP/browser fixture; no external API/provider/account changes'}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
