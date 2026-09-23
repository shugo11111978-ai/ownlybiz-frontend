import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=path.resolve(new URL('..',import.meta.url).pathname);
const {chromium}=require('/Users/liranbahbut/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const presentation=require('../assets/subscription-offer.js');
const runtimeMode=process.env.OB_QA_RUNTIME_MODE==='live'?'live':'test';
const stageApi=runtimeMode==='live'?'https://ownlybiz-backend-production.up.railway.app':'https://victorious-wisdom-production-a6b0.up.railway.app';
let origin='',offer={stripe_mode:runtimeMode,available:true,signup_available:true,offer_version:'subscription_v2',catalog_revision:4,currency:'usd',payout_scope:{business_countries:['US'],currency:'usd',card_countries:['US']},payment_fee_policy:{version:'ownly-payments-catalog-v1-r4',catalog_revision:4,currency:'usd',quoted_scope:'standard_us_domestic_card',processing_included:true,basis_points:450,fixed_cents:30},plans:[['starter',39,390],['pro',99,990],['scale',159,1590]].map(([id,monthly_price,annual_price])=>({id,name:id[0].toUpperCase()+id.slice(1),description:'Software tools for your practice.',monthly_price,annual_price,currency:'usd',offer_version:'subscription_v2',catalog_revision:4,features:['Expert website','Bookings','Human chat, voice and video'],quantities:{creation_ai_credits:id==='pro'?100:id==='scale'?300:0},trial_quantities:{one_to_one_call_minutes:120,group_participant_minutes:id==='scale'?510:0,creation_ai_credits:id==='pro'?100:id==='scale'?300:0}})),comparison_rows:[{label:'Creation credits per allowance period',values:{starter:0,pro:100,scale:300}}]};
let publicOfferFail=false,signupBodies=[];
const writeRequests=[],externalRequests=[],pageErrors=[];
function payload(url){const pathname=new URL(url,origin||'http://localhost').pathname;
 if(pathname==='/api/billing/public-offer')return publicOfferFail?null:offer;
 if(pathname==='/api/billing/plans')return {plans:[['starter',0,0],['pro',49,470],['scale',99,948]].map(([id,monthly_price,annual_price])=>({id,name:id,monthly_price,annual_price,platform_fee_pct:{starter:12,pro:8,scale:5}[id],expert_keep_pct:{starter:88,pro:92,scale:95}[id]})),starter_requires_approval:true};
 if(pathname==='/api/experts/platform-fees')return {fee_starter_pct:12,fee_pro_pct:8,fee_scale_pct:5,price_starter_monthly:0,price_pro_monthly:49,price_scale_monthly:99};
 if(pathname==='/api/billing/payout-countries')return {countries:[{code:'US',label:'United States',supported:true},{code:'GB',label:'United Kingdom',supported:true}]};
 if(pathname==='/api/config')return {success:true,features:{},analytics:{},seo:{}};
 if(pathname==='/api/tracking/config')return {enabled:false,providers:{},settings:{enabled:false},consent_required:true};
 if(pathname==='/api/security/config')return {security:{},settings:{},email:{configured:false}};
 if(['/api/auth/google-config','/api/auth/apple-config'].includes(pathname))return {enabled:false,client_id:''};
 if(pathname==='/api/marketing/featured-experts')return {experts:[]};
 return null;
}
function transformed(value){return String(value).replaceAll('https://ownlybiz-backend-production.up.railway.app',origin).replaceAll('wss://ownlybiz-backend-production.up.railway.app',origin.replace('http:','ws:')).replaceAll('window.OWNLYBIZ_IS_STAGING=false;',runtimeMode==='test'?'window.OWNLYBIZ_IS_STAGING=true;':'window.OWNLYBIZ_IS_STAGING=false;');}
const context={module:{exports:{}},process:{cwd:()=>root,env:{NODE_ENV:'test',VERCEL_ENV:runtimeMode==='test'?'preview':'production',OWNLYBIZ_API_URL:stageApi}},URL,URLSearchParams,AbortController,setTimeout,clearTimeout,Date,console,fetch:async(url)=>{const d=payload(url);return {ok:!!d,status:d?200:503,json:async()=>d};},require(name){if(name==='fs')return {...fs,readFileSync(filename,encoding){const data=fs.readFileSync(filename,encoding);return encoding==='utf8'?transformed(data):data;}};if(name==='path')return path;if(name.startsWith('../'))return require(path.join(root,'api',name));return require(name);}};
vm.runInNewContext(fs.readFileSync(path.join(root,'api/seo-shell.js'),'utf8'),context,{filename:'api/seo-shell.js'});
const handler=context.module.exports;
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,origin).pathname;res.setHeader('Cache-Control','no-store');
 const json=(v,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(v));};
 if(req.method!=='GET'&&req.method!=='HEAD'){
   let raw='';for await(const chunk of req)raw+=chunk;writeRequests.push({path:pathname,body:raw});
   if(pathname==='/api/auth/signup'){signupBodies.push(JSON.parse(raw));return json({error:'Test stops before account creation.'},400);}
   return json({error:'Fixture does not mutate accounts'},405);
 }
 if(pathname.startsWith('/api/'))return json(payload(req.url)||{error:'Unavailable fixture'},payload(req.url)?200:404);
 if(pathname.startsWith('/assets/')||pathname==='/favicon.svg'){
   const filename=path.resolve(root,'.'+decodeURIComponent(pathname));if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename))return json({},404);
   const type=pathname.endsWith('.js')?'application/javascript':pathname.endsWith('.css')?'text/css':pathname.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
   res.writeHead(200,{'content-type':type});res.end(pathname.endsWith('.js')?transformed(fs.readFileSync(filename,'utf8')):fs.readFileSync(filename));return;
 }
 const adapter={setHeader:(k,v)=>res.setHeader(k,v),status(code){res.statusCode=code;return this;},send(body){res.end(transformed(body));},end(){res.end();}};
 try{await handler({url:req.url,method:req.method,headers:{host:runtimeMode==='test'?'staging-fixture.vercel.app':'ownlybiz.com'}},adapter);}catch(e){json({error:e.message},500);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
const out=process.env.OB_QA_OUTPUT||'/tmp/ownlybiz-staging-marketing-qa';fs.mkdirSync(out,{recursive:true});
let browser;
try{
 // Actual server handler, actual source slots, scriptless stale/production boundaries.
 let response=await fetch(origin+'/pricing');let html=await response.text();assert.equal(response.status,200);if(runtimeMode==='test')assert.match(response.headers.get('x-robots-tag'),/noindex/);else assert.doesNotMatch(response.headers.get('x-robots-tag')||'',/noindex/);assert.match(html,/data-catalog-revision="4"/);assert.match(html,/\$39<sub>\/month/);
 response=await fetch(origin+'/legal/independent-professional-terms');html=await response.text();assert.match(html,/Software subscriptions and payment services/);assert.match(html,/4\.5% \+ \$0\.30/);
 publicOfferFail=true;response=await fetch(origin+'/pricing');html=await response.text();assert.match(html,/Current plans are loading/);assert.doesNotMatch(html.slice(html.indexOf('<!--OB_PRICING_OFFER_START-->'),html.indexOf('<!--OB_PRICING_OFFER_END-->')),/12%|Free forever|href="\/signup/);publicOfferFail=false;
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const ctx=await browser.newContext({viewport:{width:1440,height:1100}});
 await ctx.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){externalRequests.push(route.request().url().split('?')[0]);return route.abort();}return route.continue();});
 await ctx.routeWebSocket('**/*',socket=>socket.close());
 const page=await ctx.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#ob-marketing-home-offer .ob-public-offer').waitFor();
 assert.doesNotMatch(await page.locator('#mkt-page-home').innerText(),/12%|8%|5% platform fee|88-95%|no credit card required|free forever/i);
 assert.equal(await page.locator('#ob-v3-dynamic-home').count(),0);
 await page.goto(origin+'/pricing',{waitUntil:'domcontentloaded'});
 await page.locator('#mkt-page-pricing .ob-public-offer').waitFor();
 await page.waitForFunction(()=>typeof window.obSetPublicOfferInterval==='function');
 assert.match(await page.locator('#mkt-page-pricing').innerText(),/\$39\/month/);
 await page.locator('#mkt-page-pricing').getByRole('button',{name:'Annual · pay for 10 months'}).click();
 assert.match(await page.locator('#mkt-page-pricing').innerText(),/\$1,590\/year/);
 await page.screenshot({path:path.join(out,'pricing-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(out,'pricing-mobile.png'),fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');
 await page.goto(origin+'/signup?plan=pro&interval=annual',{waitUntil:'domcontentloaded'});
 await page.locator('#ob-signup-initial-plan [data-ob-signup-plan="pro"]').waitFor({state:'attached'});
 assert.match(await page.locator('#ob-signup-initial-plan').innerText(),/\$990\/year/);
 assert.equal(await page.locator('#ob-signup-initial-plan [data-ob-signup-plan="pro"]').getAttribute('aria-pressed'),'true');
 let body=await page.evaluate(()=>window.obSignupOfferPayload());assert.equal(body.subscription_plan,'pro');assert.equal(body.subscription_interval,'annual');assert.equal(body.catalog_revision,4);
 offer={...offer,catalog_revision:5,plans:offer.plans.map(p=>({...p,catalog_revision:5,monthly_price:p.id==='starter'?39.99:p.monthly_price}))};
 let changed=await page.evaluate(async()=>{try{await window.obSignupOfferPayload();return '';}catch(e){return e.message;}});assert.match(changed,/pricing changed/i);assert.match(await page.locator('#ob-signup-initial-plan').innerText(),/\$390\/year/);

 await page.locator('#ob-signup-initial-plan [data-ob-signup-plan="starter"]').click();
 assert.equal(await page.locator('#ob-signup-initial-plan [data-ob-signup-plan]').count(),3);
 assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-ob-signup-plan')),'starter');
 await page.locator('#ob-signup-initial-plan').getByRole('button',{name:'Monthly',exact:true}).click();
 assert.match(await page.locator('#ob-signup-initial-plan').innerText(),/\$39\.99\/month/);
 body=await page.evaluate(()=>window.obSignupOfferPayload());assert.equal(body.subscription_plan,'starter');assert.equal(body.catalog_revision,5);
 await page.locator('#signup-fname').fill('Test');await page.locator('#signup-lname').fill('Expert');await page.locator('#signup-email').fill('test@example.invalid');await page.locator('#signup-pass').fill('test-password-123');await page.locator('#signup-payout-country').selectOption('US');await page.locator('#tos-check').check();
 await page.evaluate(()=>window.realExpertSignup());assert.equal(signupBodies.length,1);assert.equal(signupBodies[0].offer_version,'subscription_v2');assert.equal(signupBodies[0].catalog_revision,5);assert.equal(signupBodies[0].subscription_plan,'starter');assert.equal(signupBodies[0].subscription_interval,'monthly');
 assert.equal(await page.locator('#signup-payout-country option[value="GB"]').count(),0);
 assert.equal(await page.locator('.ob-v3-signup-stage').count(),0);
 await page.screenshot({path:path.join(out,'signup-mobile.png'),fullPage:true});
 await page.evaluate(()=>window.obShowSignupCheckoutReturn('starter'));
 assert.equal(await page.locator('#ob-signup-plan-card [data-ob-signup-plan="starter"]').getAttribute('aria-pressed'),'true');
 publicOfferFail=true;const failed=await page.evaluate(async()=>{try{await window.obSignupOfferPayload();return '';}catch(e){return e.message;}});assert(failed);assert.equal(signupBodies.length,1);publicOfferFail=false;
 // Explicit API authority, independent of the browser's TEST/staging flag.
 const published=offer;
 offer={...published,signup_available:false};await page.goto(origin+'/pricing',{waitUntil:'domcontentloaded'});await page.locator('#mkt-page-pricing .ob-offer-unavailable').waitFor();assert.doesNotMatch(await page.locator('#mkt-page-pricing').innerText(),/39.99|Current plans are loading/);assert.equal(await page.locator('#mkt-page-pricing a[href^="/signup"]').count(),0);assert.match(await page.locator('#mkt-page-pricing').innerText(),/Plans are being updated/);
 offer={available:false,signup_available:false,offer_version:'legacy',reason:'admission_closed'};
 response=await fetch(origin+'/pricing');html=await response.text();const legacySlot=html.slice(html.indexOf('<!--OB_PRICING_OFFER_START-->'),html.indexOf('<!--OB_PRICING_OFFER_END-->'));assert.match(legacySlot,/Plans are being updated/);assert.doesNotMatch(legacySlot,/12%|Current plans are loading|\$/);
 response=await fetch(origin+'/legal/independent-professional-terms');html=await response.text();const legal=html.match(/<section class="legal-page active"[\s\S]*?<\/section>/)?.[0]||'';assert.doesNotMatch(legal,/Software subscriptions and payment services/);
 await page.goto(origin+'/pricing',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.obSubscriptionOfferMode?.()==='legacy');assert.match(await page.locator('#mkt-page-pricing').innerText(),/Plans are being updated/);assert.equal(await page.locator('#mkt-page-pricing a[href="\/login"]').count(),1);assert.equal(await page.locator('#ob-v3-dynamic-home').count(),0);
 await page.goto(origin+'/signup',{waitUntil:'domcontentloaded'});await page.locator('#signup-payout-country option[value="GB"]').waitFor({state:'attached'});await page.waitForFunction(()=>window.obLoadPublicOffer&&window.obSignupOfferPayload);assert.equal(await page.locator('#ob-signup-initial-plan').isVisible(),true);assert.match(await page.locator('#ob-signup-initial-plan').innerText(),/Plans are being updated/);assert.equal(await page.locator('#signup-step1-btn').isDisabled(),true);
 await page.locator('#signup-fname').fill('Preserved');await page.locator('#signup-email').fill('preserved+qa@example.invalid');await page.locator('#signup-pass').fill('Unchanged.Password!');
 const closedSignup=await page.evaluate(async()=>{try{await window.obSignupOfferPayload();return '';}catch(e){return e.message;}});assert.match(closedSignup,/temporarily unavailable/);await page.evaluate(()=>window.realExpertSignup());assert.equal(signupBodies.length,1);
 assert.equal(await page.locator('#signup-fname').inputValue(),'Preserved');assert.equal(await page.locator('#signup-email').inputValue(),'preserved+qa@example.invalid');assert.equal(await page.locator('#signup-pass').inputValue(),'Unchanged.Password!');
 offer=published;await page.evaluate(()=>window.obLoadPublicOffer());assert.equal(await page.locator('#signup-step1-btn').isEnabled(),true);assert.equal(await page.locator('#signup-step1-btn').innerText(),'Create account');assert.equal(await page.locator('#ob-signup-initial-plan [data-ob-signup-plan]').count(),3);assert.equal(await page.locator('#signup-email').inputValue(),'preserved+qa@example.invalid');assert.equal(await page.locator('#signup-pass').inputValue(),'Unchanged.Password!');
 publicOfferFail=true;const legacyFailure=await page.evaluate(async()=>{try{await window.obSignupOfferPayload();return '';}catch(e){return e.message;}});assert(legacyFailure);assert.equal(await page.evaluate(()=>window.obSubscriptionOfferMode()),'unknown');assert.match(await page.locator('#mkt-page-pricing').innerText(),/Plans are temporarily unavailable/);assert.equal(signupBodies.length,1);
 publicOfferFail=false;offer={available:false,signup_available:false,offer_version:'subscription_v2',reason:'catalog_unavailable'};await page.goto(origin+'/signup',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.obSubscriptionOfferMode?.()==='subscription_v2');assert.match(await page.locator('#ob-signup-initial-plan').innerText(),/Plans are being updated/);const unavailable=await page.evaluate(async()=>{try{await window.obSignupOfferPayload();return '';}catch(e){return e.message;}});assert(unavailable);assert.equal(signupBodies.length,1);offer=published;
 await ctx.close();
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({status:'PASS',checks:['server first paint','server fee terms','failed catalog no stale offer','desktop/mobile monthly/annual','no overflow','plan/interval CTA preselection','stale revision requires review','actual signup body server contract','no account created'],pageErrors,externalRequestsBlocked:externalRequests.length,writeRequests:writeRequests.map(x=>x.path)},null,2));
 console.log(JSON.stringify({status:'PASS',runtimeMode,out,pageErrors,externalRequestsBlocked:externalRequests.length}));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
