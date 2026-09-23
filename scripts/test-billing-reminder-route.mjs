import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
function source(a,b){const start=html.indexOf(a),end=html.indexOf(b,start);assert(start>=0&&end>start);return html.slice(start,end);}
const apply=source('  async function applyBillingAliasRoute(', '  function applyMarketingRoute(');
const parse=source('  function parseRouteFromPath(', '  function pushAndApply(');
function harness(owner={role:'expert',token:'owned-token'}){
 let current=true,route=true,pending,pathname='/dashboard/billing';const saved=new Map(),calls=[],errors=[],nav=[];
 const context={capture:()=>owner,isCurrent:()=>current};
 const h={URL,AbortController,location:{origin:'https://staging.vercel.app'},routeApplicationGeneration:7,parseRoute:()=>({type:route?'billing-alias':'marketing'}),window:{OB_CLIENT_CONTEXT:context,OWNLYBIZ_API_URL:'https://staging-api.test',toast:m=>errors.push(m),_markRouteReady(){}},sessionStorage:{setItem:(k,v)=>saved.set(k,v)},history:{replaceState:(_a,_b,p)=>{pathname=p;}},setTimeout:()=>1,clearTimeout(){},cleanSlug:v=>typeof v==='string'&&!v.includes('/')?v:'',enc:encodeURIComponent,applyRoute:()=>nav.push('canonical'),applyMarketingRoute:r=>nav.push(r.page),applyAdminRoute:r=>nav.push(r.panel),fetch:(url,options)=>{calls.push({url,options});return new Promise(resolve=>{pending=resolve;});}};
 vm.createContext(h);new vm.Script(apply).runInContext(h);
 return {run:()=>h.applyBillingAliasRoute(7),reply:(body,status=200)=>pending({ok:status<400,json:async()=>body}),saved,calls,errors,nav,path:()=>pathname,switchAccount:()=>{current=false;},leave:()=>{route=false;}};
}
{
 const h=harness();const p=h.run();assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,'https://staging-api.test/api/auth/me');h.reply({user:{role:'expert',slug:'owned-expert'}});await p;assert.equal(h.path(),'/dash/owned-expert/settings/billing');assert.deepEqual(h.nav,['canonical']);
}
{
 const h=harness(null);await h.run();assert.equal(h.saved.get('ob_next'),'/dashboard/billing');assert.equal(h.path(),'/login');assert.deepEqual(h.nav,['login']);assert.equal(h.calls.length,0);
}
for(const change of ['switchAccount','leave']){
 const h=harness();const p=h.run();h[change]();h.reply({user:{role:'expert',slug:'old-expert'}});await p;assert.equal(h.path(),'/dashboard/billing');assert.equal(h.nav.length,0,'late prior navigation/identity cannot select a dashboard');
}
for(const body of [{user:{role:'client',slug:'someone'}},{user:{role:'expert',slug:'../someone'}},{user:{role:'expert'}}]){
 const h=harness();const p=h.run();h.reply(body);await p;assert.equal(h.path(),'/login');assert.equal(h.saved.get('ob_next'),'/dashboard/billing');assert.equal(h.nav.includes('canonical'),false);
}
{
 const h=harness({role:'admin',token:'owned-admin'});await h.run();assert.deepEqual(h.nav,['fee-config']);assert.equal(h.calls.length,0);
}
{
 const h={URL,location:{origin:'https://staging.vercel.app'},safeDecodePathPart:decodeURIComponent,clean:v=>String(v||'').trim(),platformHost:()=>true};vm.createContext(h);new vm.Script(parse).runInContext(h);assert.equal(h.parseRouteFromPath('/dashboard/billing').type,'billing-alias');assert.equal(h.parseRouteFromPath('/dashboard/billing?source=email').type,'billing-alias');
}
// Exercise the original Checkout request with no cached slug, as on a resumed draft.
const checkout=source('  async function openSubscriptionCheckout(', '  window.obOpenSubscriptionCheckout =');
for(const offerVersion of ['subscription_v2','legacy']){
 const requests=[],redirects=[];const plan={id:'starter',name:'Starter',offer_version:offerVersion,catalog_revision:4};
 const h={stagingOffer:()=>offerVersion==='subscription_v2',planState:{publicOffer:{plans:[plan]},interval:'monthly'},plansById:plans=>Object.fromEntries(plans.map(p=>[p.id,p])),planById:()=>plan,showStripeRedirectNotice(){},hideStripeRedirectNotice(){},dashboardReturnPath:()=>'/dash',activeDashboardPanel:()=>'',obJson:async(url,options)=>{requests.push({url,...options});return {url:'https://checkout.stripe.com/owned-test'};},redirectToStripe:url=>redirects.push(url)};
 vm.createContext(h);new vm.Script(checkout).runInContext(h);await h.openSubscriptionCheckout('starter','monthly','signup');
 assert.equal(requests.length,1);assert.equal(requests[0].url,'/api/billing/checkout');
 assert.equal(requests[0].body.return_path,offerVersion==='subscription_v2'?'/dashboard/billing':'/dash');
 assert.equal(requests[0].body.cancel_return_path,'/signup');
 assert.equal(requests[0].body.catalog_revision,offerVersion==='subscription_v2'?4:undefined);
 assert.equal(redirects.length,1);
}
// A successful provider return must not race an explicit billing settings route.
const returnNotice=source('  function handleBillingReturnNotice(){', '  function dashboardRouteActive(){');
for(const explicitSetting of ['billing','']){
 const timers=[],panels=[];let refreshed=0;
 const h={URLSearchParams,location:{search:'?billing=success',pathname:'/dash/owned/settings/billing'},window:{obDashboardRouteSetting:()=>explicitSetting},toastOk(){},toastErr(){},setTimeout:(fn,delay)=>timers.push({fn,delay}),dbNav:(_node,panel)=>panels.push(panel),document:{querySelector:()=>({})},refreshBillingUi:()=>refreshed++};
 vm.createContext(h);new vm.Script(returnNotice).runInContext(h);h.handleBillingReturnNotice();timers.find(t=>t.delay===250).fn();
 assert.deepEqual(panels,explicitSetting?[]:['payments']);assert.equal(refreshed,1);
}
assert.match(html,/firstPath==='dash'\|\|path==='dashboard\/billing'/,'alias uses private dashboard first-paint guard');
assert.match(html,/!openingSetting && !\(root\.obDashboardRouteSetting && root\.obDashboardRouteSetting\(\)\)/,'initial settings synchronization preserves explicit routed settings');
console.log('Billing reminder route and native signup Checkout return: signed-in resolution, sign-in return, stale identity/navigation, invalid account, and private first paint PASS');
