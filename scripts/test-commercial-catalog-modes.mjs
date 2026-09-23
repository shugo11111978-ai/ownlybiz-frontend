import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('/Users/liranbahbut/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const asset=fs.readFileSync(new URL('../assets/admin-commercial-catalog.js',import.meta.url),'utf8');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const checks=[];
try{
 const context=await browser.newContext();await context.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body><section id="catalog"></section></body>'}));const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function mount(mode,mismatch=false){await page.goto('https://fixture.invalid/admin');await page.addScriptTag({content:asset});await page.evaluate(({mode,mismatch})=>{
  const catalog={mode,currency:'usd',revision:0,plans:Object.fromEntries(['starter','pro','scale'].map(id=>[id,{monthly_cents:3900,annual_cents:39000}])),payment_fee:{basis_points:450,fixed_cents:30}};
  const model={catalog,publish_mode:mode,admission_enabled:false,limits:{subscription_max_cents:10000000,subscription_min_cents:100,basis_points_max:10000,fixed_cents_max:100000}};
  const qa=window.__qa={requests:[]};
  window.OB_ADMIN_COMMERCIAL_CATALOG.mount({container:document.getElementById('catalog'),isCurrent:()=>true,request:async(path,options)=>{qa.requests.push({path,options});if(path.endsWith('/preview'))return{preview_hash:'owned-local-preview',proposed:{...catalog,mode:mismatch?(mode==='live'?'test':'live'):mode,revision:1},changes:[],publish_mode:mode,admission_enabled:false};if(path.endsWith('/publish'))return{...model,catalog:{...catalog,revision:1}};return model;}});
 },{mode,mismatch});await page.locator('[data-catalog=reason]').waitFor();}
 for(const mode of ['test','live']){
  await mount(mode);assert.match(await page.locator('#catalog').innerText(),new RegExp((mode==='live'?'Live':'Test')+' · USD'));assert.match(await page.locator('#catalog').innerText(),/enrollment is closed/);
  await page.locator('[data-catalog=reason]').fill('Prepare catalog before enrollment');await page.locator('[data-catalog=preview]').click();await page.getByText('Preview ready. Publish to activate these reviewed amounts.',{exact:true}).waitFor();assert.equal(await page.locator('[data-catalog=publish]').isEnabled(),true);await page.locator('[data-catalog=publish]').click();await page.getByText('Pricing published. Revision 1 is active for future offers.',{exact:true}).waitFor();const requests=await page.evaluate(()=>__qa.requests);assert.equal(requests.filter(x=>x.path.endsWith('/publish')).length,1);assert.equal(requests.at(-1).options.body.expected_revision,0);checks.push(mode+': closed enrollment permits reviewed native catalog preparation; one exact publication');
  await mount(mode,true);await page.locator('[data-catalog=reason]').fill('Prepare catalog');await page.locator('[data-catalog=preview]').click();await page.getByText('Preview could not be verified.',{exact:true}).waitFor();assert.equal(await page.locator('[data-catalog=publish]').isEnabled(),false);checks.push(mode+': mismatched preview mode cannot publish');
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',checks,browserErrors:errors}));
}finally{await browser.close();}
