import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH||'playwright');
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').split('<script id="ownlybiz-on-demand-readings-20260607">')[1];
function section(a,b){const i=source.indexOf(a),j=source.indexOf(b,i);assert(i>=0&&j>i,a);return source.slice(i,j);}
const code=[section('  function esc(v){','  function publicDeliveryPolicyText('),section('  function api(path, opts){','  function authApi('),section('  function onDemandOwnerCurrent(','  function ensureClientAuth('),section('  function renderClientStatus(','  function consumeReadyReadingIntent('),section('  function confirmCheckoutFromQuery(attempt, explicitOwner){','  function markPublicOnDemandReady(')].join('\n');
const browser=await chromium.launch({headless:true,...(process.env.OWNLYBIZ_CHROME_PATH?{executablePath:process.env.OWNLYBIZ_CHROME_PATH}:{})});
const checks=[];
try{
 const context=await browser.newContext();await context.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="modal"><div id="ob-od-public-body"></div></div></body></html>'}));const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function fixture(outcomes,authenticated=true){
  await page.goto('https://fixture.invalid/liran1?on_demand=success&request_id=request&checkout_session_id=checkout&keep=yes#details');
  await page.evaluate(({code,outcomes,authenticated})=>{
   const qa=window.__qa={outcomes,calls:0,waits:[],waiting:[],principal:authenticated?'client-a':'',generation:1,login:null};
   window.OB_CLIENT_CONTEXT={capture:()=>({token:qa.principal,generation:qa.generation}),isCurrent:c=>c.generation===qa.generation&&c.token===qa.principal};
   window.fetch=async()=>{const index=qa.calls++;if(index===0)await new Promise(r=>qa.release=r);const out=outcomes[Math.min(index,outcomes.length-1)];if(out.network)throw new TypeError('Network');return{ok:out.status===200,status:out.status,json:async()=>out.body||{success:true,request:{id:'request',payment_status:'paid',status:'awaiting_expert_review',price_cents:3900}}};};
   (0,eval)(`(function(){
    var state={checkoutConfirmation:null,publicConfig:{expert:{name:'QA Expert'}}};
    function base(){return 'https://fixture.invalid';}
    function token(){return __qa.principal;}
    function ensurePublicModal(){return document.getElementById('modal');}
    function openRequestFromQuery(id,options){__qa.login={id,options};}
    function waitMs(ms){__qa.waits.push(ms);__qa.waiting.push({text:document.getElementById('ob-od-public-body').textContent,checkout:new URLSearchParams(location.search).get('checkout_session_id')});return Promise.resolve();}
    ${code}
    __qa.confirm=confirmCheckoutFromQuery;
   })();`);
   qa.first=qa.confirm(0);qa.second=qa.confirm(0);
  },{code,outcomes,authenticated});
  if(authenticated)assert.deepEqual(await page.evaluate(()=>[__qa.calls,__qa.first===__qa.second]),[1,true]);
 }
 const reject={status:409,body:{code:'payment_fee_scope_not_supported',error:'Use a US-issued card. Not captured. <unsafe>'}};
 await fixture([reject]);await page.evaluate(async()=>{__qa.release();await __qa.first;});
 assert.equal(await page.locator('#ob-od-public-body h2').innerText(),'Payment not completed');assert.match(await page.locator('[role=alert]').innerText(),/Not captured. <unsafe>/);assert.equal(await page.locator('.ob-od-spin,unsafe').count(),0);
 assert.deepEqual(await page.evaluate(()=>[__qa.calls,__qa.waits.length,location.search,location.hash]),[1,0,'?keep=yes','#details']);checks.push('terminal rejection: shared request, no retries/spinner/success claim, escaped persistent message, safe query removal');
 for(const first of [{status:409,body:{code:'checkout_not_paid',error:'Not paid yet'}},{status:409,body:{code:'payment_confirmation_pending',error:'Processing'}},{status:503},{status:408},{status:429},{network:true},{status:200,body:{request:{status:'pending_payment',payment_status:'processing'}}}]){
  await fixture([first,{status:200}]);await page.evaluate(async()=>{__qa.release();await __qa.first;});
  assert.equal(await page.locator('#ob-od-public-body h2').innerText(),'Payment received');assert.match(await page.locator('#ob-od-public-body').innerText(),/You are all set/);
  const state=await page.evaluate(()=>({calls:__qa.calls,waits:__qa.waits,waiting:__qa.waiting}));assert.equal(state.calls,2);assert.deepEqual(state.waits,[900]);assert.equal(state.waiting[0].checkout,'checkout');assert.doesNotMatch(state.waiting[0].text,/Payment received|Amount paid|You are all set/);
 }
 checks.push('native checkout_not_paid, explicit pending, transient network/HTTP and200pending retry before canonical paid success');
 for(const request of [{status:'payment_failed',payment_status:'failed'},{status:'awaiting_expert_review',payment_status:'unpaid'},null]){
  await fixture([{status:200,body:{request}}]);await page.evaluate(async()=>{__qa.release();await __qa.first;});assert.equal(await page.locator('#ob-od-public-body h2').innerText(),'Payment not completed');assert.deepEqual(await page.evaluate(()=>[__qa.calls,__qa.waits.length]),[1,0]);
 }
 checks.push('failed/unpaid/malformed200 never claim payment received');
 await fixture([{status:200,body:{request:{id:'request',status:'refunded',payment_status:'refunded',price_cents:3900}}}]);await page.evaluate(async()=>{__qa.release();await __qa.first;});assert.equal(await page.locator('#ob-od-public-body h2').innerText(),'Payment refunded');assert.match(await page.locator('#ob-od-public-body').innerText(),/Your payment was refunded/);assert.equal(await page.locator('.ob-od-spin').count(),0);checks.push('canonically refunded callback shows refunded instead of paid');
 await fixture([{status:503,body:{error:'Still pending'}}]);await page.evaluate(async()=>{__qa.release();await __qa.first;});assert.equal(await page.locator('#ob-od-public-body h2').innerText(),'Payment confirmation pending');assert.deepEqual(await page.evaluate(()=>[__qa.calls,__qa.waits.length,new URLSearchParams(location.search).get('checkout_session_id')]),[8,7,'checkout']);assert.equal(await page.locator('.ob-od-spin').count(),0);checks.push('bounded retry exhaustion preserves recovery URL without endless spinner');
 for(const change of ['principal','context','navigation']){
  await fixture([{status:200}]);await page.evaluate(async change=>{document.getElementById('ob-od-public-body').textContent='New owner screen';if(change==='principal')__qa.principal='client-b';else if(change==='context')__qa.generation++;else history.pushState({},'','/elsewhere');__qa.release();await __qa.first;},change);assert.equal(await page.locator('#ob-od-public-body').innerText(),'New owner screen');
 }
 checks.push('stale principal/context/navigation cannot repaint');
 await fixture([],false);assert.equal(await page.evaluate(()=>__qa.calls),0);assert.equal(await page.evaluate(()=>__qa.login.options.title),'Sign in to confirm payment');checks.push('unauthenticated callback makes no received-payment claim');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',checks,browserErrors:errors}));
}finally{await browser.close();}
