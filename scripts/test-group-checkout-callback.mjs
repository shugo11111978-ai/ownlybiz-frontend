import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');
const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const feature = source.slice(source.indexOf('<script id="ownlybiz-group-session-feature-20260528">'));
function section(from, to) {
  const a = feature.indexOf(from), b = feature.indexOf(to, a);
  assert(a >= 0 && b > a, from);
  return feature.slice(a, b);
}
const code = [section('  function api(path, opts){', '  function esc(value){'),
  section('  function renderPublicLoading(){', '  window.obGroupJoinPublicRoom ='),
  section('  function capturePublicContext(){', '  window.obGroupBootPublicRoute = bootPublicRoute;')].join('\n');
const browser = await chromium.launch({headless:true,...(process.env.OWNLYBIZ_CHROME_PATH ? {executablePath:process.env.OWNLYBIZ_CHROME_PATH} : {})});
const results = [];
try {
  const context = await browser.newContext();
  await context.route('**/*', r => r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  async function fixture(outcomes) {
    await page.goto('https://fixture.invalid/group/room?group_ticket=success&registration_id=registration&checkout_session_id=checkout&keep=yes#details');
    await page.evaluate(({code,outcomes}) => {
      window.__qa = {outcomes, calls:0, reads:0, waits:[], toasts:[], principal:'client-a', generation:1, confirmed:false};
      const qa=window.__qa;
      window.OB_CLIENT_CONTEXT={capture:()=>({generation:qa.generation}),isCurrent:c=>c.generation===qa.generation};
      window.fetch=async (url) => {
        if(url.includes('/confirm-checkout')) {
          const index=qa.calls++;
          if(index===0) await new Promise(resolve=>{qa.release=resolve;});
          const reply=qa.outcomes[Math.min(index,qa.outcomes.length-1)];
          if(reply.network) throw new TypeError('Network error');
          if(reply.status===200) qa.confirmed=true;
          return {ok:reply.status===200,status:reply.status,json:async()=>reply.body||{success:true}};
        }
        qa.reads++;
        return {ok:true,status:200,json:async()=>({room:{id:'room',title:'Group',status:'scheduled',ticket_price:100,capacity_limit:2,viewer_registration:qa.confirmed?{status:'confirmed'}:{status:'failed'}}})};
      };
      (0,eval)(`(function(){
        var state={},publicLoadSequence=0,checkoutConfirmation=null,checkoutNotice=null;
        function apiBase(){return 'https://fixture.invalid';}
        function headers(){return {};}
        function token(){return __qa.principal;}
        function ownerPrincipal(){return __qa.principal;}
        function query(k){return new URLSearchParams(location.search).get(k);}
        function wait(ms){__qa.waits.push(ms);return Promise.resolve();}
        function toast(message){__qa.toasts.push(message);}
        function ensureStyles(){}
        function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
        function attr(v){return esc(v);}
        function money(v){return '$'+v;}
        function ts(v){return v;}
        function participantList(){return '';}
        function maybeRedirectToGroupUrl(){return false;}
        ${code}
        window.__qa.boot=bootPublicRoute;
      })();`);
      qa.boot(); qa.boot();
    }, {code,outcomes});
    assert.equal(await page.evaluate(()=>__qa.calls),1,'concurrent native boots share one confirmation');
  }
  const unsupported={status:409,body:{code:'payment_fee_scope_not_supported',error:'Use a US-issued card. No payment captured. <unsafe>'}};
  await fixture([unsupported]);
  await page.evaluate(()=>__qa.release());
  await page.locator('#ob-group-payment-status').waitFor();
  assert.match(await page.locator('#ob-group-payment-status').innerText(),/No payment captured\. <unsafe>/);
  assert.equal(await page.locator('#ob-group-payment-status unsafe').count(),0);
  assert.equal(await page.locator('#ob-group-join-room-btn').count(),0);
  assert.deepEqual(await page.evaluate(()=>({calls:__qa.calls,reads:__qa.reads,waits:__qa.waits,toasts:__qa.toasts,query:location.search,hash:location.hash})),{calls:1,reads:1,waits:[],toasts:[],query:'?keep=yes',hash:'#details'});
  results.push('terminal scope rejection: one request, no retries/admission, persistent escaped message, unrelated URL preserved');
  for(const status of [400,401,403,404,409]) {
    await fixture([{status,body:{error:'Terminal request'}}]);
    await page.evaluate(()=>__qa.release());
    await page.locator('#ob-group-payment-status').waitFor();
    assert.deepEqual(await page.evaluate(()=>[__qa.calls,__qa.waits.length]),[1,0]);
  }
  results.push('other terminal 4xx errors are not retried');
  for(const first of [{status:409,body:{code:'payment_confirmation_pending',error:'Processing'}},{status:503,body:{error:'Retry later'}},{status:408},{status:429},{network:true}]) {
    await fixture([first,{status:200}]);
    await page.evaluate(()=>__qa.release());
    await page.locator('#ob-group-join-room-btn').waitFor();
    assert.deepEqual(await page.evaluate(()=>({calls:__qa.calls,waits:__qa.waits,toasts:__qa.toasts})),{calls:2,waits:[900],toasts:['Ticket confirmed.']});
    assert.equal(await page.locator('#ob-group-payment-status').count(),0);
  }
  results.push('explicit pending, server, timeout, rate-limit and network errors retry then confirm');
  await fixture([{status:503,body:{error:'Still processing'}}]);
  await page.evaluate(()=>__qa.release());
  await page.locator('#ob-group-payment-status').waitFor();
  assert.deepEqual(await page.evaluate(()=>[__qa.calls,__qa.waits.length,new URLSearchParams(location.search).get('checkout_session_id')]),[8,7,'checkout']);
  results.push('transient retry remains bounded and retains recovery URL');
  for(const change of ['principal','navigation','context']) {
    await fixture([{status:200}]);
    await page.evaluate(change=>{if(change==='principal')__qa.principal='client-b';else if(change==='navigation')history.pushState({},'','/elsewhere');else __qa.generation++;__qa.release();},change);
    await page.waitForTimeout(25);
    assert.deepEqual(await page.evaluate(()=>[__qa.calls,__qa.reads,__qa.toasts.length]),[1,0,0]);
    assert.equal(await page.locator('#ob-group-public-status').count(),0);
  }
  results.push('stale account, navigation and context results cannot read/render/clear the route');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',checks:results,browserErrors:errors}));
} finally {await browser.close();}
