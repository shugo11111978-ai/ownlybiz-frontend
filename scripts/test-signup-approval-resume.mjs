import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const presentation=createRequire(import.meta.url)('../assets/subscription-offer.js');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
function source(a,b){const start=html.indexOf(a),end=html.indexOf(b,start+a.length);assert(start>=0&&end>start,a);return html.slice(start,end);}
const native=source('  function setSignupPlan(plan, interval){','  function currentExpertSlug(){')+source('  async function finishSignupLaunch(){','  function signupCheckoutPlanName(')+source('  function applyMarketingRoute(route, event){','  function applyGroupRoute(');
const approved={status:'signup_incomplete',checkout_allowed:true,review_completed:true};
const pending={status:'pending_review',checkout_allowed:false,review_completed:false};
const plans=['starter','pro','scale'].map(id=>({id,name:id,enabled:true}));
const offer={available:true,signup_available:true,offer_version:'subscription_v2',plans,payout_scope:{business_countries:['US'],currency:'usd',card_countries:['US']}};
function harness({role='expert',authenticated=true,search='?resume=1',approval=approved,billingPatch={},authPatch={}}={}){
 const nodes=Object.fromEntries(['signup-review-title','signup-review-intro','ob-signup-plan-card','ob-signup-initial-plan','ob-signup-approval','ob-launch-plan-btn','ob-launch-plan-hint','launch-plan-checkline','step-7'].map(id=>[id,{innerHTML:'',textContent:'',dataset:{},hidden:false,disabled:false}]));
 const qa={credential:authenticated?'expert-token':'',user:authenticated?{id:'owner',role}: {},identity:1,step:1,requests:[],redirects:[],checkouts:[],renders:[],response:null};
 const stored=new Map([['ob_signup_plan','starter'],['ob_signup_interval','monthly'],['ob_signup_payout_country','AU']]);
 const billing={offer_version:'subscription_v2',current_plan:{id:'scale'},subscription:{status:'signup_draft',interval:'annual'},software_trial:{already_started:false,started_at:null},payout_country_eligibility:{country:'US',status:'supported',supported:true},approval,...billingPatch};
 const auth={user:{id:'owner',role:'expert'},profile:{subscription_plan:'scale',subscription_interval:'annual',payout_country:'US'},approval,...authPatch};
 const ctx={console,AbortController,URLSearchParams,URL,setTimeout,clearTimeout,qa,planState:{selected:'starter',interval:'monthly',plans,publicOffer:offer},planDefaults:plans,location:{pathname:'/signup',search,replace:p=>qa.redirects.push({method:'replace',path:p}),assign:p=>qa.redirects.push({method:'assign',path:p})},sessionStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},document:{getElementById:id=>nodes[id]||null,querySelector:s=>s==='#view-2.active'?{}:null,querySelectorAll:()=>[]},token:()=>qa.credential,readUserSnapshot:()=>qa.user,currentBillingRole:()=>qa.user.role||'',normalizePlanId:p=>p,usesSubscriptionOffer:()=>true,selectedPlan:()=>plans.find(p=>p.id===ctx.planState.selected),selectedSignupPlanForLaunch:()=>plans.find(p=>p.id===ctx.planState.selected),plansById:ps=>Object.fromEntries(ps.map(p=>[p.id,p])),esc:s=>String(s??''),signupPayoutEligibility:()=>ctx.planState.billing?.payout_country_eligibility,publicOfferRenderer:()=>({...presentation,updateSignup:(_target,_data,kind,interval,plan)=>qa.renders.push({kind,interval,plan})}),goStep:n=>qa.step=n,switchView:()=>{},applyPlatformFallbackSeo:()=>{},obApplySignupOfferRoute:()=>{throw Error('Saved account must not apply a marketing query');},obJson:async(path,options)=>{qa.requests.push({path,method:options.method});assert.equal(options.method,'GET');if(qa.response)return qa.response(path,options);return path==='/api/auth/me'?auth:billing;},openSubscriptionCheckout:async(...args)=>qa.checkouts.push(args)};
 ctx.OB_CLIENT_CONTEXT={capture:()=>({generation:qa.identity}),isCurrent:c=>c.generation===qa.identity};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(native,ctx);
 return {ctx,qa,nodes,stored,billing,auth,async resume(){assert.equal(ctx.obResumeSignupRoute(),true);await vm.runInContext('signupResumeState && signupResumeState.promise',ctx);},async settle(){await vm.runInContext('signupResumeState && signupResumeState.promise',ctx);}};
}
{
 const h=harness({authenticated:false,search:''});assert.equal(h.ctx.obResumeSignupRoute(),false);assert.equal(h.qa.step,1);assert.equal(h.qa.requests.length,0);assert.equal(h.qa.redirects.length,0);
 const e=harness({authenticated:false});await e.resume();assert.equal(e.stored.get('ob_next'),'/signup?resume=1');assert.equal(e.qa.redirects[0].path,'/login?resume=signup');assert.equal(e.qa.requests.length,0);
}
for(const search of ['?resume=1','', '?resume=1&plan=starter&interval=monthly']){
 const h=harness({search});h.ctx.applyMarketingRoute({page:'signup'},{obExplicitNavigation:true});await h.settle();assert.equal(h.qa.step,7);assert.equal(h.stored.get('ob_signup_plan'),'scale');assert.equal(h.stored.get('ob_signup_interval'),'annual');assert.equal(h.stored.get('ob_signup_payout_country'),'US');assert.equal(h.nodes['ob-launch-plan-btn'].disabled,false);assert.match(h.nodes['signup-review-title'].textContent,/Review and start/);assert.equal(h.qa.requests.length,2);assert.equal(h.qa.checkouts.length,0);
 h.ctx.setSignupPlan('pro','monthly');h.ctx.applyMarketingRoute({page:'signup'});await h.settle();assert.equal(h.stored.get('ob_signup_plan'),'pro');assert.equal(h.stored.get('ob_signup_interval'),'monthly');assert.equal(h.qa.requests.length,2,'background route does not restore over the changed selection');
 await h.ctx.finishSignupLaunch();assert.equal(h.qa.checkouts.length,1);assert.deepEqual([...h.qa.checkouts[0]],['pro','monthly','signup']);
}
{
 const h=harness({approval:pending});await h.resume();assert.equal(h.qa.step,7);assert.match(h.nodes['signup-review-title'].textContent,/under review/);assert(h.nodes['ob-launch-plan-btn'].disabled);await assert.rejects(h.ctx.finishSignupLaunch(),/needs approval/);assert.equal(h.qa.checkouts.length,0);
 const c=harness({billingPatch:{subscription:{status:'checkout_expired',pending_plan:'pro',pending_interval:'monthly',interval:'annual'}}});await c.resume();assert.equal(c.stored.get('ob_signup_plan'),'pro');assert.equal(c.stored.get('ob_signup_interval'),'monthly');assert.equal(c.qa.checkouts.length,0);
}
for(const billingPatch of [{offer_version:'legacy',subscription:{status:'active'}},{subscription:{status:'trialing',stripe_subscription_id:'existing'}},{subscription:{status:'canceled'},software_trial:{already_started:true,started_at:1}}]){
 const h=harness({billingPatch});await h.resume();assert.equal(h.qa.redirects[0].path,'/dashboard/billing');assert.equal(h.qa.checkouts.length,0);assert.equal(h.qa.renders.length,0);
}
for(const role of ['admin','client']){
 const h=harness({role});await h.resume();assert.equal(h.qa.requests.length,0);assert.match(h.nodes['ob-signup-plan-card'].innerHTML,/Sign in with your expert account/);assert(h.nodes['ob-launch-plan-btn'].disabled);await assert.rejects(h.ctx.finishSignupLaunch(),/expert account/);
 const mismatch=harness({authPatch:{user:{id:'owner',role}}});await mismatch.resume();assert.equal(mismatch.qa.requests.length,1);assert(mismatch.nodes['ob-launch-plan-btn'].disabled);
}
for(const billingPatch of [{subscription:{status:'unknown'}},{software_trial:null},{current_plan:{id:'not-a-plan'}},{subscription:{status:'signup_draft',interval:'weekly'}},{payout_country_eligibility:null},{approval:{status:'unknown'}}]){
 const h=harness({billingPatch});await h.resume();assert(h.nodes['ob-launch-plan-btn'].disabled);assert.match(h.nodes['ob-signup-plan-card'].innerHTML,/Try again/);assert.equal(h.qa.checkouts.length,0);await assert.rejects(h.ctx.finishSignupLaunch(),/saved account setup/);
}
{
 const h=harness();h.qa.response=async()=>{throw Error('network');};await h.resume();assert(h.nodes['ob-launch-plan-btn'].disabled);assert.match(h.nodes['ob-signup-plan-card'].innerHTML,/Try again/);h.qa.response=null;h.ctx.obRetrySignupResume();await h.settle();assert.equal(h.nodes['ob-launch-plan-btn'].disabled,false);assert.equal(h.stored.get('ob_signup_interval'),'annual');
 const expired=harness();expired.qa.response=async()=>{const e=Error('expired');e.status=401;throw e;};await expired.resume();assert.equal(expired.qa.redirects[0].path,'/login?resume=signup');assert.equal(expired.stored.get('ob_next'),'/signup?resume=1');
 const unsupported=harness({billingPatch:{payout_country_eligibility:{country:'AU',status:'unsupported',supported:false}}});await unsupported.resume();assert(unsupported.nodes['ob-launch-plan-btn'].disabled);assert.equal(unsupported.qa.checkouts.length,0);
}
for(const change of ['identity','navigation','leave-return']){
 const h=harness();let resolve;h.qa.response=()=>new Promise(r=>resolve=r);h.ctx.obResumeSignupRoute();const old=vm.runInContext('signupResumeState.promise',h.ctx);assert(h.nodes['ob-launch-plan-btn'].disabled);await assert.rejects(h.ctx.finishSignupLaunch(),/saved account setup/);
 if(change==='identity'){h.qa.credential='new-token';h.qa.user={id:'other',role:'expert'};h.qa.identity++;}
 else {h.ctx.location.pathname='/pricing';h.ctx.obLeaveSignupRoute();if(change==='leave-return'){h.ctx.location.pathname='/signup';h.qa.response=null;await h.resume();}}
 const markup=h.nodes['ob-signup-plan-card'].innerHTML,selection=h.stored.get('ob_signup_plan');resolve(h.auth);await old;assert.equal(h.nodes['ob-signup-plan-card'].innerHTML,markup);assert.equal(h.stored.get('ob_signup_plan'),selection);assert.equal(h.qa.redirects.length,0);assert.equal(h.qa.checkouts.length,0);
}
// Execute the original login handler through its successful login and redirect.
{
 const stored=new Map(),deferred=[],user={id:'expert',role:'expert',name:'Expert'};
 const nodes={'mkt-login-email':{value:'expert@example.invalid'},'mkt-login-pass':{value:'password'},'mkt-login-btn':{textContent:'Sign in'},'mkt-login-error':{style:{}}};
 const ctx={console:{log(){},error(){}},URLSearchParams,location:{search:'?resume=signup'},document:{getElementById:id=>nodes[id]||null},sessionStorage:{getItem:k=>stored.get(k)||'',setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},localStorage:{setItem(){},removeItem(){}},setTimeout:fn=>deferred.push(fn),obBeginAuthAttempt:()=>({}),obAuthAttemptCurrent:()=>true,obCommitAuthAttempt:()=>({}),fetch:async path=>({ok:true,status:200,json:async()=>path.endsWith('/login')?{token:'signed-in',user}: {}})};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source('    window.handleMarketingLogin = async function() {','  </script>'),ctx);await ctx.handleMarketingLogin();deferred.forEach(fn=>fn());assert.equal(ctx.location.href,'/signup?resume=1');assert.equal(stored.has('ob_next'),false);
}
assert.match(html,/<a href="\/login\?resume=signup">Log in/);
assert.match(source('  function applyRoute(event){','  function syncNavHrefs(){'),/obLeaveSignupRoute/);
console.log(JSON.stringify({status:'PASS',externalRequests:0,checks:['new anonymous signup unchanged','approval link requires sign in and preserves fixed return path','new and older signed-in email links restore server plan, annual/monthly interval and country','reviewed/pending states and current Checkout choice','existing subscription redirects to Billing','no checkout on resume GET','wrong role and malformed/unavailable state fail closed with retry','stale principal and leave/return responses ignored','background refresh preserves changed selection','original successful login returns to signup resume']}));
