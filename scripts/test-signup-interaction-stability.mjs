import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),presentation=require('../assets/subscription-offer.js');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
function source(start,end){const a=html.indexOf(start),b=html.indexOf(end,a+start.length);assert(a>=0&&b>a,`${start} boundary`);return html.slice(a,b);}
const offer={available:true,signup_available:true,offer_version:'subscription_v2',catalog_revision:4,payout_scope:{business_countries:['US']},payment_fee_policy:{currency:'usd',quoted_scope:'standard_us_domestic_card',processing_included:true,basis_points:450,fixed_cents:30},plans:[['starter',39,390],['pro',99,990],['scale',159,1590]].map(([id,monthly_price,annual_price],i)=>({id,name:['Starter','Pro','Scale'][i],monthly_price,annual_price,currency:'usd',offer_version:'subscription_v2',features:['Human chat','Human voice','Human video'],quantities:{chat_concurrency:[1,5,20][i]},trial_quantities:{one_to_one_call_minutes:120,group_participant_minutes:i===2?510:0,creation_ai_credits:[0,100,300][i]}}))};
// A deliberately small DOM double executes the original controller and renderer.
// It records node replacement and focus/scroll effects without browser/network access.
let writes=0;
class Node{
 constructor(attrs={}){this.attrs={...attrs};this.children={};this.hidden=false;this._html='';this._text='';}
 get innerHTML(){return this._html;}set innerHTML(value){writes++;this._html=value;}
 get textContent(){return this._text;}set textContent(value){writes++;this._text=value;}
 getAttribute(key){return this.attrs[key]??null;}setAttribute(key,value){writes++;this.attrs[key]=value;}
 querySelector(selector){return this.children[selector]||null;}
}
class Mount extends Node{
 constructor(){super();this.replacements=0;}
 get innerHTML(){return this._html;}
 set innerHTML(value){super.innerHTML=value;this.replacements++;this.children={};
  const kind=value.match(/data-ob-signup-kind="([^"]+)"/);if(!kind)return;
  this.children[`[data-ob-signup-kind="${kind[1]}"]`]=new Node();
  for(const part of value.matchAll(/data-ob-signup-part="([^"]+)"/g))this.children[`[data-ob-signup-part="${part[1]}"]`]=new Node();
  for(const button of value.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)){
   const attrs=Object.fromEntries([...button[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
   const node=new Node(attrs),key=attrs['data-ob-signup-plan']?'data-ob-signup-plan':'data-ob-signup-interval';
   if(!attrs[key])continue;assert.equal(attrs.type,'button','plan/interval never implicitly submit the account form');
   if(key==='data-ob-signup-plan')for(const name of ['name','price']){const child=new Node();child.textContent=button[2].match(new RegExp(`<span data-ob-signup-${name}>([^<]*)<`))[1];node.children[`[data-ob-signup-${name}]`]=child;}
   else node.textContent=button[2];this.children[`[${key}="${attrs[key]}"]`]=node;
  }
  for(const key of ['included','limits','payment-note'])this.children[`.ob-signup-${key}`]={open:false};
 }
}
const nodes={'step-7':new Node(),'ob-signup-initial-plan':new Mount(),'ob-signup-plan-card':new Mount(),'ob-marketing-home-offer':new Node(),'mkt-page-pricing':new Node()};
const fields={email:'qa.first+signup@example.co.uk',first:'QA.Test',last:"O'Example",password:'punc.Tu+ation!'};
const originalFields={...fields},stored=new Map(),navigation=[];
const state={publicOffer:offer,selected:'starter',interval:'monthly'};
const context={console,planState:state,publicOffer:offer,publicOfferInterval:'monthly',publicOfferRenderer:()=>presentation,usesSubscriptionOffer:()=>true,normalizePlanId:p=>p,token:()=>'',updateSignupCta(){},sessionStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},document:{getElementById:id=>nodes[id]||null,activeElement:null,querySelector:selector=>selector==='#view-2.active'?nodes['step-7']:null},history:{replaceState:(...args)=>navigation.push(args),pushState:(...args)=>navigation.push(args)},scrollTo:()=>navigation.push('scroll'),applyPlatformFallbackSeo(){}};context.window=context;context.obSignupPlanState=state;vm.createContext(context);
vm.runInContext(source('  function setSignupPlan(plan, interval){','  var signupApproval=null,')+source('  function renderSignupPlans(){','  window.renderSignupPlans=renderSignupPlans;')+source('  function renderPublicOffer(){','  window.obSetPublicOfferInterval=')+source('  function applyMarketingRoute(route){','  function applyGroupRoute('),context);
context.renderSignupPlans();const mount=nodes['ob-signup-initial-plan'];
assert.equal(Object.keys(mount.children).filter(k=>k.startsWith('[data-ob-signup-plan=')).length,3);
assert.equal(Object.keys(mount.children).filter(k=>k.startsWith('[data-ob-signup-interval=')).length,2);
assert.doesNotMatch(mount.innerHTML,/ob-signup-change/,'choices are not collapsed');
const controls=Object.fromEntries(Object.entries(mount.children).filter(([key])=>key.startsWith('[data-ob-signup-plan=')||key.startsWith('[data-ob-signup-interval=')));
const scale=controls['[data-ob-signup-plan="scale"]'],annual=controls['[data-ob-signup-interval="annual"]'];
mount.children['.ob-signup-limits'].open=true;context.document.activeElement=scale;context.scrollY=413;
vm.runInContext(scale.getAttribute('onclick'),context);
assert.equal(state.selected,'scale');assert.equal(context.document.activeElement,scale);assert.equal(context.scrollY,413);
context.document.activeElement=annual;vm.runInContext(annual.getAttribute('onclick'),context);
assert.equal(state.selected,'scale','frequency retains the current selection');assert.equal(state.interval,'annual');assert.equal(context.document.activeElement,annual);
assert.match(mount.children['[data-ob-signup-part="allowances"]'].innerHTML,/510 shared minutes/);
assert.match(mount.children['[data-ob-signup-part="payments"]'].innerHTML,/4\.5% \+ \$0\.30 per successful client payment/);
assert.match(mount.children['[data-ob-signup-part="payments"]'].innerHTML,/Connecting Stripe itself does not trigger this fee/);
assert.doesNotMatch(mount.children['[data-ob-signup-part="included"]'].innerHTML,/Human/);
assert.equal(mount.children['.ob-signup-limits'].open,true);
for(const [key,node]of Object.entries(controls))assert.equal(mount.children[key],node,'control identity remains mounted');
assert.equal(mount.replacements,1);assert.equal(nodes['ob-signup-plan-card'].replacements,1);assert.deepEqual(fields,originalFields);assert.deepEqual(navigation,[]);
// Same response is a true no-op. A new catalog updates names, prices and fees.
let before=writes;context.renderSignupPlans();assert.equal(writes,before);
const changed=structuredClone(offer);changed.catalog_revision=5;changed.plans[2].name='Scale Plus';changed.plans[2].annual_price=1600;changed.payment_fee_policy.basis_points=475;state.publicOffer=changed;
context.renderSignupPlans();assert.equal(scale.querySelector('[data-ob-signup-name]').textContent,'Scale Plus');assert.equal(scale.querySelector('[data-ob-signup-price]').textContent,'$1,600/year');assert.equal(annual.textContent,'Yearly');assert.match(mount.children['[data-ob-signup-part="payments"]'].innerHTML,/4\.75%/);assert.equal(mount.replacements,1);
// Background public catalog redraws do not replace identical markup elsewhere.
context.renderPublicOffer();before=writes;context.renderPublicOffer();assert.equal(writes,before);
// Execute the native offer request and both original renderers across a closed
// response and reopening. Account fields live outside these component mounts.
let nextOffer={available:false,signup_available:false,offer_version:'legacy',reason:'admission_closed'};
context.publicOfferRequest=null;context.obJson=async()=>nextOffer;
vm.runInContext(source('  async function loadPublicOffer(){','  async function loadPlans(){'),context);
await assert.rejects(context.obSignupOfferPayload(),/temporarily unavailable/);
assert.match(nodes['mkt-page-pricing'].innerHTML,/Plans are being updated/);assert.doesNotMatch(nodes['mkt-page-pricing'].innerHTML,/\$|Current plans are loading/);
assert.match(mount.innerHTML,/Plans are being updated/);assert.deepEqual(fields,originalFields);
nextOffer={...offer,signup_available:false};await context.obLoadPublicOffer();assert.match(mount.innerHTML,/Plans are being updated/);assert.doesNotMatch(mount.innerHTML,/\$/);
nextOffer=offer;await context.obLoadPublicOffer();assert.equal(Object.keys(mount.children).filter(k=>k.startsWith('[data-ob-signup-plan=')).length,3);assert.deepEqual(fields,originalFields);
context.publicOffer=null;context.renderPublicOffer();assert.match(nodes['mkt-page-pricing'].innerHTML,/Current plans are loading/);assert.doesNotMatch(nodes['mkt-page-pricing'].innerHTML,/\$/);
let viewChanges=0;context.switchView=()=>viewChanges++;context.applyMarketingRoute({page:'signup'});assert.equal(viewChanges,0,'reapplying active signup does not scroll/reset it');context.document.querySelector=()=>null;context.applyMarketingRoute({page:'signup'});assert.equal(viewChanges,1,'first navigation still opens signup');
// Execute the original submission serializer, stopping at a fake 400 response.
// This proves punctuation survives the real handler; it does not claim Safari UI reproduction.
const inputs={'signup-fname':{value:fields.first},'signup-lname':{value:fields.last},'signup-email':{value:fields.email},'signup-pass':{value:fields.password},'signup-payout-country':{value:'US'},'tos-check':{checked:true},'signup-step1-error':{style:{}},'signup-step1-btn':{textContent:'Create account',disabled:false}};
const sent=[];const submit={console:{log(){},error(){}},document:{getElementById:id=>inputs[id]||null},obErr(){},obBeginAuthAttempt:()=>({signal:null}),obAuthAttemptCurrent:()=>true,obSignupOfferPayload:async()=>({offer_version:'subscription_v2',catalog_revision:5,subscription_plan:'scale',subscription_interval:'annual'}),obSignupBusinessCountries:()=>['US'],OWNLYBIZ_API_URL:'https://fixture.invalid',fetch:async(url,options)=>{sent.push({url,body:JSON.parse(options.body)});return{status:400,ok:false,json:async()=>({error:'Fixture response; no account created'})};}};submit.window=submit;vm.createContext(submit);vm.runInContext(source('  window.realExpertSignup = async function() {','  // ── Claim subdomain'),submit);await submit.realExpertSignup();assert.equal(sent.length,1);assert.equal(sent[0].body.email,fields.email);assert.equal(sent[0].body.password,fields.password);assert.equal(sent[0].body.name,`${fields.first} ${fields.last}`);assert.equal(inputs['signup-step1-btn'].disabled,false);
const emailTag=html.match(/<input\b[^>]*id="signup-email"[^>]*>/)[0];assert.match(emailTag,/type="email"/);assert.match(emailTag,/inputmode="email"/);assert.match(emailTag,/autocapitalize="none"/);assert.doesNotMatch(emailTag,/on(?:input|keydown|keypress|keyup)=/);
// Actual expiry handler: a late Admin response cannot alter a public form.
const expiry=source('    window.obHandleAdminSessionExpired =','    (function normalizeStoredAuthTokens()');
for(const path of ['/signup','/login','/pricing','/admin/experts']){
 const effects=[],saved=new Map(),auth={location:{pathname:path},history:{replaceState:(_a,_b,p)=>effects.push(p)},obClearAuthSession:()=>effects.push('clear'),switchView:()=>effects.push('view'),showMktPage:()=>effects.push('login')};
 const env={window:auth,sessionStorage:{setItem:(k,v)=>saved.set(k,v)},setTimeout(){},document:{getElementById:()=>null}};vm.runInNewContext(expiry,env);auth.obHandleAdminSessionExpired();
 if(path.startsWith('/admin/')){assert.deepEqual(effects,['clear','view','login','/login']);assert.equal(saved.get('ob_next'),path);auth.obHandleAdminSessionExpired();assert.equal(effects.length,4);}
 else{assert.deepEqual(effects,[]);assert.equal(auth.__obAdminSessionExpiredHandled,undefined);}
}
// Original authenticated init scope, not a test-only approximation of its conditions.
const init=source('    if(Auth.ok){\n      if(Auth.isExpert','    var _qe=');
for(const path of ['/signup','/login','/pricing','/dashboard/billing','/dash/owned','/admin/experts'])for(const role of ['expert','admin']){
 const loads=[];vm.runInNewContext(init,{Auth:{ok:true,isExpert:role==='expert',isAdmin:role==='admin'},window:{_isSubdomain:false,location:{pathname:path}},loadExpertDashboard:()=>loads.push('expert'),loadAdminDashboard:()=>loads.push('admin')});
 assert.deepEqual(loads,path.startsWith('/dash/')&&role==='expert'?['expert']:path.startsWith('/admin/')&&role==='admin'?['admin']:[]);
}
console.log(JSON.stringify({status:'PASS',browser:false,externalRequests:0,checks:['actual native selection handlers preserve mounted controls, focus, scroll and field values','all three plans and both intervals remain visible non-submit buttons','identical render is no-op; revised catalog updates names/prices/fees','background catalog no-op and active signup route avoids reset','punctuation survives native signup request serialization','public-route late Admin 401 is ignored; real Admin expiry still works','private init only loads on its own routes']}));
