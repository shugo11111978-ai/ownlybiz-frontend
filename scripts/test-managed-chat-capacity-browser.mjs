import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('/Users/liranbahbut/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const expertSource=html.match(/<script[^>]+id="ownlybiz-expert-live-capacity-editor-20260817"[^>]*>([\s\S]*?)<\/script>/)[1];
const adminSource=html.slice(html.indexOf('  function liveCapacityCard(id){'),html.indexOf('  async function refreshCapacity(detail,state,message){'));
function fixture(limit,mode='enforce',authority='expert_access_policy') {return {success:true,live_capacity:{expert_id:'qa-expert',admission_enforced:mode==='enforce',rollout_mode:mode,human_rollout_ceiling:5,human:{desired_concurrency:20,effective_concurrency:Math.min(20,limit),plan_ceiling:1,admin_capacity_allowance:null,authorized_ceiling:limit,authorization_source:authority,revision:7},ai:{desired_chat_capacity:2,safety_ceiling:20,fully_automated:true,revision:3}}};}
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 for(const limit of [0,1,5,20]){
  const page=await browser.newPage();await page.setContent('<div id="ob-expert-live-capacity-editor" hidden><select id="avail-live-capacity"></select><button id="ob-expert-live-capacity-save">Save chat limit</button><p id="ob-expert-live-capacity-status"></p></div>');
  await page.evaluate(data=>{window.fixture=data;window.calls=[];const identity={token:'local-fixture',role:'expert',principal:'expert|qa',signal:new AbortController().signal};window.OB_CLIENT_CONTEXT={capture:()=>identity,isCurrent:c=>c===identity,register:()=>{}};window.fetch=async(url,options)=>{window.calls.push({url,method:options.method});return{ok:true,json:async()=>window.fixture};};window.__OB_TEST_HOOKS__={};},fixture(limit));
  await page.addScriptTag({content:expertSource});await page.waitForFunction(()=>window.__OB_TEST_HOOKS__.expertLiveCapacity.state.capacity!==null);
  assert.equal(await page.locator('#avail-live-capacity option').count(),Math.max(1,limit));assert.equal(await page.locator('#avail-live-capacity').isDisabled(),limit===0);
  assert.match(await page.locator('#ob-expert-live-capacity-status').innerText(),limit===0?/disabled/:/Access allowance/);
  assert.equal(await page.evaluate(()=>window.__OB_TEST_HOOKS__.expertLiveCapacity.activeLimit(window.__OB_TEST_HOOKS__.expertLiveCapacity.state.capacity)),Math.min(limit,5));
  if(limit===0){assert.equal(await page.locator('#ob-expert-live-capacity-save').isDisabled(),true);await page.evaluate(()=>window.obExpertLiveCapacitySave());assert.equal(await page.evaluate(()=>window.calls.some(c=>c.method==='PUT')),false);}
  // A malformed legacy response must not receive policy-authority privileges.
  await page.evaluate(()=>{window.fixture.live_capacity.human.authorization_source='starter';window.fixture.live_capacity.human.authorized_ceiling=20;window.fixture.live_capacity.human.effective_concurrency=20;window.__OB_TEST_HOOKS__.expertLiveCapacity.reset();return window.obExpertLiveCapacityLoad();});
  assert.match(await page.locator('#ob-expert-live-capacity-status').innerText(),/invalid response/);await page.close();
 }
 for(const limit of [0,1,5,20]){
  const page=await browser.newPage();await page.setContent('<main></main>');await page.addScriptTag({content:'function attr(x){return String(x);} function adminExpertDetailCurrent(){return true;}\n'+adminSource});
  const result=await page.evaluate(data=>{document.querySelector('main').innerHTML=liveCapacityCard('qa-expert');const saved=data.live_capacity;const rollout={admission_limits:{human_chat:Math.min(saved.human.authorized_ceiling,5),automatic_ai_chat:2},effective_human_ceiling:5,effective_ai_ceiling:5,human_ceiling:5,ai_ceiling:5,ceiling_editable:true,environment_limits:{valid:true,human_ceiling_max:20,ai_ceiling_max:20}};const state={card:document.getElementById('ob-admin-live-capacity-card'),saved:null,rollout,busy:false,trusted:true,review:null,allowanceReview:null};const detail={id:'qa-expert',name:'QA Expert',capacity:state};if(!capacitySettingsValid(saved,'qa-expert'))return{valid:false};acceptCapacitySettings(state,saved);paintCapacity(detail,state);document.getElementById('ob-admin-capacity-ai').value='3';const draft=capacityDraft(state);return{valid:true,live:document.getElementById('ob-admin-capacity-human-live').textContent,humanDisabled:document.getElementById('ob-admin-capacity-human').disabled,legacyDisabled:document.getElementById('ob-admin-capacity-human-allowance').disabled,reviewDisabled:document.getElementById('ob-admin-capacity-review').disabled,options:document.querySelectorAll('#ob-admin-capacity-human option').length,draft};},fixture(limit));
  assert.equal(result.valid,true);assert.equal(result.options,Math.max(1,limit));assert.equal(result.humanDisabled,limit===0);assert.equal(result.legacyDisabled,true);assert.equal(result.live,String(Math.min(limit,5)));if(limit===0){assert.equal(result.reviewDisabled,true);assert.equal(result.draft.human,20);assert.equal(result.draft.valid,true);}
  await page.close();
 }
 console.log('PASS: original expert/Admin browser controls accept policy 0/1/5/20, preserve legacy validation, display effective rollout minimum, and never submit zero preference');
}finally{await browser.close();}
