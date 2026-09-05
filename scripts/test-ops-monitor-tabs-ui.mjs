import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
function scriptById(id){
  const escaped=id.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
  const match=html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match,`${id} is installed`);
  return match[1];
}
function sourceSection(source,start,end){
  const left=source.indexOf(start),right=source.indexOf(end,left+start.length);
  assert(left>=0&&right>left,`source section ${start}`);
  return source.slice(left,right);
}
function storage(){
  const values=new Map();
  return {getItem:key=>values.get(String(key))??null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key))};
}
function classList(){
  const values=new Set();
  return {add:(...names)=>names.forEach(name=>values.add(name)),remove:(...names)=>names.forEach(name=>values.delete(name)),toggle:(name,force)=>{if(force===undefined)force=!values.has(name);force?values.add(name):values.delete(name);return force;},contains:name=>values.has(name)};
}
function fakeNode(id){
  const attributes=new Map(),listeners=new Map();
  let markup='';
  const item={id,hidden:false,textContent:'',scrollTop:0,scrollHeight:1800,clientHeight:600,offsetParent:{},classList:classList(),listeners,
    addEventListener:(type,handler)=>listeners.set(type,handler),setAttribute:(key,value)=>attributes.set(key,String(value)),getAttribute:key=>attributes.get(key)??null,
    hasAttribute:key=>attributes.has(key),removeAttribute:key=>attributes.delete(key),contains:()=>false,querySelector:()=>null,querySelectorAll:()=>[],focus(){this.focused=true;},closest(){return this;}};
  Object.defineProperty(item,'innerHTML',{get:()=>markup,set:value=>{markup=String(value);item.innerHTMLWrites=(item.innerHTMLWrites||0)+1;}});
  return item;
}

const opsSource=scriptById('ownlybiz-ops-monitor-trust-20260901');
const tabIds=['overview','action','sessions','payments','infrastructure','evidence','actions'];
const staticTabs=html.match(/<button class="ob-ops-tab"[\s\S]*?<\/button>/g)||[];
assert.equal(staticTabs.length,7,'the persistent shell has exactly seven tabs');
for(const id of tabIds){
  assert.match(html,new RegExp(`id="ob-ops-tab-${id}"[^>]+role="tab"[^>]+aria-controls="ob-ops-panel-${id}"`));
  assert.match(html,new RegExp(`id="ob-ops-panel-${id}"[^>]+role="tabpanel"[^>]+aria-labelledby="ob-ops-tab-${id}"`));
}
assert.match(html,/class="ob-ops-tabs"[^>]+role="tablist"[^>]+aria-label="Ops Monitor sections"/);
assert.match(html,/@media\(max-width:900px\)[\s\S]*\.ob-ops-tabs/,'tabs retain responsive horizontal access');

for(const removed of ['renderDeveloperHandoff','renderOwnerActionGuide','renderOpsActionCenter','injectSfuOpsPanel','previousOpenOps','previousRefreshOps'])assert.doesNotMatch(opsSource,new RegExp(removed),`${removed} is not an independent renderer or wrapper`);
assert.doesNotMatch(opsSource,/\bbody\.(?:innerHTML|insertAdjacentHTML)\b/,'the Ops scroll container is never replaced');
assert.match(opsSource,/data-ob-disclosure-key="alert:[^\n]+data-ob-focus-key="alert:/,'alert disclosures have stable keys for poll-time open and focus restoration');
assert.match(opsSource,/data-ob-focus-key="alerts:restore-acknowledgements"/,'the empty-alert restore control has a stable focus key');
assert.match(opsSource,/data-ob-focus-key="action:restore-acknowledgements"/,'the Action needed restore control has a stable focus key');
assert.match(opsSource,/querySelectorAll\('details\[data-ob-disclosure-key\]\[open\]'\)/,'poll rendering captures expanded disclosures before panel updates');
assert.match(opsSource,/openDisclosures\.push\(\{tab_id:tabId,key:key\}\)/,'poll rendering remembers the panel as well as the disclosure key');
assert.match(opsSource,/opsTabPanel\(record\.tab_id\)[\s\S]*target\.open=true/,'poll rendering restores expanded disclosures in their original panels');
assert.match(opsSource,/\[data-ob-alert-key\] summary,\[data-ob-focus-key\^="alert:"\][\s\S]*opsTabButton\(activeOpsTab\)\|\|active/,'when a rerender removes the focused acknowledgement control, focus moves to another alert or the active tab/panel instead of document body');
assert.match(opsSource,/<th>Event<\/th><th>Priority<\/th>[\s\S]*alertClassification\(event\)/,'event history renders authoritative priority instead of legacy raw severity');
assert.match(opsSource,/textarea:not\(\[disabled\]\),summary,\[tabindex\]/,'the modal focus trap includes native disclosure summaries');
const safeActionsSource=sourceSection(opsSource,'  function renderSafeActionsTab(){','  function opsTabButton(id)');
assert.match(safeActionsSource,/Refresh live telemetry[\s\S]*Copy developer report/);
assert.doesNotMatch(safeActionsSource,/Clear server cache|Clean stale|Clean old pending|Stop one session|Emergency stop|method\s*:\s*['"](?:POST|DELETE|PATCH)['"]/i,'the rendered Safe actions tab is read-only');
assert.match(opsSource,/EXPECTED_OPS_API_BASE = 'https:\/\/ownlybiz-backend-production\.up\.railway\.app'/);
assert.match(opsSource,/EXPECTED_OPS_SERVICE_ID = 'd2da7d7a-3d63-4b1d-b47e-9c0366f8a50c'/);
assert.match(opsSource,/runtime_classification\|\|''\)==='production'/);

const nodes={};
for(const id of ['ob-ops-panel','ob-ops-body','ob-ops-launcher','ob-ops-launcher-count','ob-ops-updated','ob-ops-tabs','ob-ops-freshness-banner','ob-ops-close','ob-admin-ops-nav','ob-admin-ops-badge'])nodes[id]=fakeNode(id);
for(const id of tabIds){
  nodes[`ob-ops-tab-${id}`]=fakeNode(`ob-ops-tab-${id}`);
  nodes[`ob-ops-tab-${id}`].setAttribute('data-ob-ops-tab',id);
  nodes[`ob-ops-panel-${id}`]=fakeNode(`ob-ops-panel-${id}`);
}
const actionCount=fakeNode('action-count'),paymentCount=fakeNode('payment-count');
nodes['ob-ops-tabs'].contains=node=>tabIds.some(id=>nodes[`ob-ops-tab-${id}`]===node);
nodes['ob-ops-tabs'].querySelector=selector=>selector.includes('action')?actionCount:selector.includes('payments')?paymentCount:null;
const bodyMarkupWrites=()=>nodes['ob-ops-body'].innerHTMLWrites||0;
const localStorage=storage(),sessionStorage=storage(),bodyNode=fakeNode('body');
bodyNode.children=[];
const document={body:bodyNode,activeElement:bodyNode,hidden:false,getElementById:id=>nodes[id]||null,addEventListener(){},contains:()=>true};
const sandbox={console,window:null,document,localStorage,sessionStorage,location:{hostname:'ownlybiz.com',href:'https://ownlybiz.com/admin'},fetch:async()=>{throw new Error('unexpected fetch');},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:callback=>callback(),AbortController,CSS:{escape:value=>String(value)},CustomEvent:class CustomEvent{constructor(type,options){this.type=type;this.detail=options?.detail;}},__OB_TEST_HOOKS__:{}};
sandbox.window=sandbox;sandbox.addEventListener=()=>{};sandbox.dispatchEvent=()=>true;
vm.createContext(sandbox);
new vm.Script(opsSource,{filename:'ops-monitor-tabs.js'}).runInContext(sandbox);
const hooks=sandbox.__OB_TEST_HOOKS__.opsMonitor;
assert(hooks,'focused Ops hooks are exposed');

const review={key:'broken_upload_assets',severity:'warning',title:'Review broken assets',detail:'One isolated reference',classification:{priority:'review',urgency:'review_soon',kind:'work_item',domain:'content',customer_impact:'none',money_risk:'none',requires_action:true,affects_status:false,rationale_code:'isolated_broken_asset'}};
const information={key:'http_alert_window_warming',severity:'warning',title:'Window warming',detail:'Evidence is partial',classification:{priority:'information',urgency:'monitor_only',kind:'coverage',domain:'platform',customer_impact:'none',money_risk:'none',requires_action:false,affects_status:false,rationale_code:'http_window_warming'}};
const classified={status:'ok',alerts:[review,information],summary:{active_alerts:0,critical_alerts:0,warning_alerts:0,total_alerts:2,review_alerts:1,information_alerts:1,actionable_count:1,attention:{critical_count:0,warning_count:0,review_count:1,information_count:1,actionable_count:1,status_affecting_count:0}}};
assert.equal(hooks.rawOpsState(classified),'ok','review and information alerts cannot create a warning or critical health state');
assert.deepEqual({...hooks.rawAlertCounts(classified)},{known:true,valid:true,coherent:true,total:2,critical:0,warning:0,review:1,information:1,actionable:1,status_affecting:0});
assert.match(opsSource,/reviewCount\?'\('\+reviewCount\+' REVIEW\)'/,'the closed launcher exposes owner-review work without changing service health');
assert.match(html,/hasReview\?'REVIEW '\+counts\.review/,'the sidebar exposes owner-review work without labeling it warning or critical');
assert.equal(hooks.rawOpsState({...classified,status:'critical'}),'unknown','a classified payload cannot revive legacy critical semantics from the backend status label');
assert.match(hooks.renderOverviewTab(classified,{state:'ok',counts:hooks.rawAlertCounts(classified),trustedCurrent:true,acknowledgedCount:0}),/Stable — owner review available[\s\S]*non-urgent owner-review item/);
const infoOnly={status:'ok',alerts:[information],summary:{active_alerts:0,critical_alerts:0,warning_alerts:0,total_alerts:1,review_alerts:0,information_alerts:1,actionable_count:0,attention:{critical_count:0,warning_count:0,review_count:0,information_count:1,actionable_count:0,status_affecting_count:0}}};
assert.match(hooks.renderOverviewTab(infoOnly,{state:'ok',counts:hooks.rawAlertCounts(infoOnly),trustedCurrent:true,acknowledgedCount:0}),/Healthy with notices/);
const legacyWarning={key:'legacy-payment',severity:'warning',title:'Legacy warning'};
assert.equal(hooks.rawOpsState({status:'warning',alerts:[legacyWarning],summary:{active_alerts:1,critical_alerts:0,warning_alerts:1}}),'warning','old payloads retain a conservative legacy fallback');
assert.equal(hooks.rawOpsState({status:'ok',alerts:[{...information,classification:{priority:'information'}}],summary:classified.summary}),'unknown','a supplied malformed classification fails closed');

const initialBodyWrites=bodyMarkupWrites();
nodes['ob-ops-body'].scrollTop=320;
hooks.updatePanels(classified,{state:'unavailable',data:null,error:'not loaded'},{state:'ok',rawState:'ok',counts:hooks.rawAlertCounts(classified),trustedCurrent:true,schemaValid:true,verification:{verified:true},acknowledgedCount:0});
assert.equal(bodyMarkupWrites(),initialBodyWrites,'poll rendering never replaces the scroll container');
assert.equal(nodes['ob-ops-body'].scrollTop,320,'poll rendering preserves current tab scroll');
const rendered=tabIds.map(id=>nodes[`ob-ops-panel-${id}`].innerHTML).join('');
const telemetry=[...rendered.matchAll(/data-ob-telemetry-section="([^"]+)"/g)].map(match=>match[1]);
assert(telemetry.length>=12,'all grouped telemetry areas render through the centralized panel update');
assert.equal(new Set(telemetry).size,telemetry.length,'each telemetry section renders exactly once');

hooks.selectOpsTab('payments');
nodes['ob-ops-body'].scrollTop=145;
hooks.selectOpsTab('sessions');
hooks.selectOpsTab('payments');
assert.equal(nodes['ob-ops-body'].scrollTop,145,'each tab restores its own scroll position');
hooks.updatePanels(classified,{state:'unavailable',data:null},{state:'ok',rawState:'ok',counts:hooks.rawAlertCounts(classified),trustedCurrent:true,schemaValid:true,verification:{verified:true},acknowledgedCount:0});
assert.equal(nodes['ob-ops-tab-payments'].getAttribute('aria-selected'),'true','polls preserve the active tab');

const removedAcknowledgement=fakeNode('removed-acknowledgement'),nextAlertSummary=fakeNode('next-alert-summary');
removedAcknowledgement.setAttribute('data-ob-focus-key','alert:removed:ack');
document.activeElement=removedAcknowledgement;
nodes['ob-ops-body'].contains=candidate=>candidate===removedAcknowledgement;
nodes['ob-ops-panel-payments'].querySelector=selector=>selector.includes('[data-ob-alert-key]')?nextAlertSummary:null;
hooks.updatePanels(classified,{state:'unavailable',data:null},{state:'ok',rawState:'ok',counts:hooks.rawAlertCounts(classified),trustedCurrent:true,schemaValid:true,verification:{verified:true},acknowledgedCount:1});
assert(nextAlertSummary.focused,'a removed acknowledgement control hands focus to the next rendered alert summary');
nextAlertSummary.focused=false;
nodes['ob-ops-panel-payments'].querySelector=()=>null;
nodes['ob-ops-tab-payments'].focused=false;
hooks.updatePanels(classified,{state:'unavailable',data:null},{state:'ok',rawState:'ok',counts:hooks.rawAlertCounts(classified),trustedCurrent:true,schemaValid:true,verification:{verified:true},acknowledgedCount:0});
assert(nodes['ob-ops-tab-payments'].focused,'when no alert remains, focus falls back to the active tab rather than document body');
document.activeElement=bodyNode;
nodes['ob-ops-body'].contains=()=>false;
hooks.render(classified,null,{publish:false,received_at:Date.now(),identity_verification:{verified:false,reason:'test fixture'}});
sandbox.obAcknowledgeOpsAlert(review.key);
hooks.selectOpsTab('action');
assert.match(nodes['ob-ops-panel-action'].innerHTML,/data-ob-focus-key="action:restore-acknowledgements"/,'acknowledging an alert renders the stable restore control');
const restoreAcknowledgements=fakeNode('restore-acknowledgements'),restoredAlertSummary=fakeNode('restored-alert-summary');
restoreAcknowledgements.setAttribute('data-ob-focus-key','action:restore-acknowledgements');
document.activeElement=restoreAcknowledgements;
nodes['ob-ops-body'].contains=candidate=>candidate===restoreAcknowledgements;
nodes['ob-ops-panel-action'].querySelector=selector=>selector.includes('[data-ob-alert-key]')?restoredAlertSummary:null;
sandbox.obRestoreOpsAlerts();
assert(restoredAlertSummary.focused,'restoring acknowledgements moves focus from the removed restore control to the restored alert summary');
nodes['ob-ops-panel-action'].querySelector=()=>null;
document.activeElement=bodyNode;
nodes['ob-ops-body'].contains=()=>false;

const keydown=nodes['ob-ops-tabs'].listeners.get('keydown');
let prevented=false;
keydown({target:nodes['ob-ops-tab-payments'],key:'End',preventDefault(){prevented=true;}});
assert(prevented&&nodes['ob-ops-tab-actions'].focused,'End selects and focuses the last tab');
nodes['ob-ops-tab-actions'].focused=false;
keydown({target:nodes['ob-ops-tab-actions'],key:'Home',preventDefault(){}});
assert(nodes['ob-ops-tab-overview'].focused,'Home selects and focuses the first tab');
keydown({target:nodes['ob-ops-tab-overview'],key:'ArrowRight',preventDefault(){}});
assert.equal(nodes['ob-ops-tab-action'].getAttribute('aria-selected'),'true','ArrowRight advances tabs');

console.log('Ops Monitor tabs UI tests passed');
