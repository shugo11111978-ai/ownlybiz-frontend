import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

function scriptById(id){
  const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match,`${id} is installed`);
  return match[1];
}
function section(source,start,end){
  const left=source.indexOf(start);assert(left>=0,`section starts at ${start}`);
  const right=source.indexOf(end,left+start.length);assert(right>=0,`section ends at ${end}`);
  return source.slice(left,right);
}
function deferred(){
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function response(body,{ok=true,status=200}={}){
  return {ok,status,json(){return Promise.resolve(body);}};
}

const canonicalDetail=scriptById('ownlybiz-admin-expert-detail-correct-flow-20260526');
const onDemand=scriptById('ownlybiz-on-demand-readings-20260607');
const controlsHotfix=scriptById('ownlybiz-admin-expert-controls-hotfix-20260607');
const marketplace=scriptById('ob-marketplace-mode-20260618');
const queryBootstrap=scriptById('ownlybiz-admin-expert-query-open-js');
const listRuntime=section(html,'  function adminExpertsController(){','\n  window.obSyncStripePaymentDomains');
const routeAdminWrapper=section(html,"    if(typeof window.adminNav === 'function' && !window.adminNav._obUrlRoutingWrapped){","    if(typeof window.adminTabSwitch === 'function' && !window.adminTabSwitch._obUrlRoutingWrapped){");
const legacyListBridge=section(html,'  async function loadAdminExperts() {','\n\n  async function loadAdminRevenue()');
const detailRender=section(canonicalDetail,'\t\t  function detailHtml(id, profileData, dashboardData, refundData, marketplaceData, liveCapacityData, groupSessionsData){','  function openExpertDetail(id, slug, name){');
const detailOpen=section(canonicalDetail,'  function openExpertDetail(id, slug, name){','  function install(){');
const detailBack=section(canonicalDetail,'  window.obAdminExpertBackToList = function(){','  window.obAdminExpertAction = function(id, action){');
const humanSave=section(canonicalDetail,'\t\t  window.obAdminSaveHumanReplyAssistantAccess = function(id){','\t\t  window.obAdminSaveExpertAiChat = function(id){');
const automaticSave=section(canonicalDetail,'\t\t  window.obAdminSaveExpertAiChat = function(id){','  window.obAdminExpertApproveRefund = function(id){');

assert.match(legacyListBridge,/typeof window\.obRenderAdminExpertsEnhanced === 'function'[\s\S]*?return window\.obRenderAdminExpertsEnhanced\(\)/,'every legacy Experts-list closure delegates to the canonical renderer');
assert.match(routeAdminWrapper,/if\(!applyingRoute\) writeUrl\(adminUrl\(panel\), false\);[\s\S]*?oldAdminNav\.apply/,'an explicit sidebar navigation clears a stale expert query before the Experts renderer runs');
assert.match(listRuntime,/mode:initialExpertId \? 'detail' : 'idle'/,'a refreshed detail URL reserves detail ownership before older list loaders can paint');
assert.match(listRuntime,/routedExpertId[\s\S]*?obAdminOpenExpertDetail\(routedExpertId\)[\s\S]*?__ownlybizAdminExpertQueryOpened/,'admin route boot opens and owns the queried expert instead of forcing the list');
assert.match(listRuntime,/controller\.mode === 'detail' && options\.forceList !== true[\s\S]*?return Promise\.resolve\(false\)/,'background list loaders cannot replace an open expert detail');
assert.match(listRuntime,/controller\.current\(ticket\)[\s\S]*?id="ob-admin-experts-list"[\s\S]*?id="ob-admin-experts-table"/,'the list uses one generation-bound canonical render');
assert.match(detailOpen,/obAdminExpertsBeginDetail[\s\S]*?navigationTicket:navigationTicket[\s\S]*?adminExpertDetailCurrent\(detail,content\)/,'detail rendering is bound to the selected expert navigation generation');
assert.match(detailOpen,/\/live-capacity'[\s\S]*?\/group-sessions'/,'Human Assistant and form-selector authority are loaded in the immutable first detail render');
assert.match(detailBack,/activeExpertDetail = null[\s\S]*?_adminViewingExpertId=null[\s\S]*?obRenderAdminExpertsEnhanced\(\{forceList:true\}\)/,'Back invalidates detail ownership and explicitly restores the canonical list');

assert.match(detailRender,/id="ob-admin-expert-detail"[^>]+data-expert-id=/,'detail has one canonical identity root');
assert.match(detailRender,/aiFeatureAuthorityCards\(id,ai,liveCapacityData\|\|\{\}\)/,'detail renders both independent AI authority cards from their authoritative payloads');
assert.match(canonicalDetail,/id="ob-admin-human-reply-assistant-card"[\s\S]*?Grant Human Reply Assistant/,'Human Reply Assistant enablement is visible in Expert Info');
assert.match(canonicalDetail,/id="ob-admin-ai-chat-visible-card"[\s\S]*?Enable Automatic AI Chat for this expert/,'Automatic AI Chat remains a separate control');
assert.match(humanSave,/reply_assistant_enabled:[\s\S]*?training_enabled:[\s\S]*?\/live-capacity'/,'Human Reply Assistant writes only its dedicated authority fields');
assert.doesNotMatch(humanSave,/\/ai-chat|admin_context|mode:/,'Human Reply Assistant cannot mutate Automatic AI Chat');
assert.match(automaticSave,/\/ai-chat'[\s\S]*?admin_context:/,'Automatic AI Chat retains its dedicated endpoint and guidance');
assert.doesNotMatch(automaticSave,/live-capacity|reply_assistant_enabled|training_enabled/,'Automatic AI Chat cannot mutate Human Reply Assistant');

assert.match(canonicalDetail,/id="ob-group-tier"[\s\S]*?id="ob-group-admin-note"[^>]+resize:vertical/,'group selector and editable note are part of the first stable detail DOM');
assert.match(canonicalDetail,/id="ob-ai-chat-context"[^>]+resize:vertical/,'Automatic AI Chat guidance remains user-resizable');
assert.doesNotMatch(canonicalDetail,/\[250,\s*900,\s*1800,\s*3600,\s*7000\][\s\S]*?setTimeout\(install/,'canonical detail no longer re-installs itself over focused form controls');
assert.match(onDemand,/function installAdmin\(\)\{[\s\S]*?__obAdminExpertDetailCanonicalReady[\s\S]*?canonical-detail-owned/,'On Demand does not wrap the canonical detail opener');
assert.match(onDemand,/adminCardRequest&&state\.adminCardRequest\.key===requestKey[\s\S]*?document\.getElementById\('ob-admin-on-demand-card'\)\)return Promise\.resolve\(true\)/,'On Demand deduplicates its one late authority card load and leaves an existing form mounted');
assert.match(controlsHotfix,/function boot\(\)\{[\s\S]*?if\(window\.__obAdminExpertDetailCanonicalReady\)return;[\s\S]*?installObserver\(\)/,'legacy controls observer is disabled under canonical detail ownership');
assert.match(controlsHotfix,/function ensureMarketplaceCard\(id\)\{\s*if\(window\.__obAdminExpertDetailCanonicalReady\) return Promise\.resolve\(null\);/,'legacy marketplace reads stop at the canonical ownership boundary');
assert.match(controlsHotfix,/\/marketplace'\)\.then\(function\(data\)\{\s*if\(window\.__obAdminExpertDetailCanonicalReady\) return data;/,'an in-flight legacy marketplace read cannot render after canonical ownership transfers');
assert.match(controlsHotfix,/function ensureGroupCard\(id\)\{\s*if\(window\.__obAdminExpertDetailCanonicalReady\) return Promise\.resolve\(null\);/,'legacy group-session reads stop at the canonical ownership boundary');
assert.match(controlsHotfix,/\/group-sessions'\)\.then\(function\(data\)\{\s*if\(window\.__obAdminExpertDetailCanonicalReady\) return data;/,'an in-flight legacy group-session read cannot render after canonical ownership transfers');
assert.match(controlsHotfix,/function ensure\(id\)\{\s*if\(window\.__obAdminExpertDetailCanonicalReady\) return;/,'legacy profile reads stop at the canonical ownership boundary');
assert.match(controlsHotfix,/\/profile'\)\.then\(function\(data\)\{\s*if\(window\.__obAdminExpertDetailCanonicalReady\) return null;/,'an in-flight legacy profile read cannot render after canonical ownership transfers');
assert.match(controlsHotfix,/function schedule\(id\)\{\s*if\(window\.__obAdminExpertDetailCanonicalReady\) return;/,'legacy delayed reinjection cannot start after canonical ownership');
assert.match(controlsHotfix,/new MutationObserver\(function\(\)\{\s*if\(window\.__obAdminExpertDetailCanonicalReady\) return;/,'an observer installed before canonical boot becomes inert after ownership transfers');
assert.match(marketplace,/function wrapAdminOpen\(\)\{[\s\S]*?if\(window\.__obAdminExpertDetailCanonicalReady\) return;/,'Marketplace does not schedule reinjection around the canonical detail opener');

let legacyObserverCallback=null;
let legacyFetchCount=0;
const legacyContent={
  textContent:'',
  querySelector(){return null;},
  querySelectorAll(){return [];},
  insertAdjacentHTML(){throw new Error('canonical ownership must block legacy rendering');}
};
const legacyPanel={querySelector(selector){return selector==='.admin-content'?legacyContent:null;}};
const legacyRoot={
  window:null,Promise,Object,Array,String,Number,Error,encodeURIComponent,console,
  location:{pathname:'/admin/experts'},
  sessionStorage:{getItem(){return 'admin-token';}},localStorage:{getItem(){return ''; }},
  document:{
    readyState:'complete',
    getElementById(id){return id==='admin-panel-experts'?legacyPanel:null;},
    addEventListener(){}
  },
  MutationObserver:class {constructor(callback){legacyObserverCallback=callback;}observe(){}},
  setTimeout(callback){callback();return 1;},clearTimeout(){},
  fetch(){legacyFetchCount+=1;return Promise.reject(new Error('legacy request escaped canonical ownership'));},
  __obAdminExpertDetailCanonicalReady:false
};
legacyRoot.window=legacyRoot;
vm.createContext(legacyRoot);
new vm.Script(controlsHotfix,{filename:'legacy-admin-controls-ownership.js'}).runInContext(legacyRoot);
assert.equal(typeof legacyObserverCallback,'function','legacy observer can represent an older boot that started before canonical ownership');
legacyRoot.__obAdminExpertDetailCanonicalReady=true;
legacyObserverCallback();
assert.equal(legacyFetchCount,0,'an already-installed legacy observer becomes inert when canonical detail takes ownership');

let inflightDomReady=null;
let inflightLegacyInsertions=0;
const inflightLegacyRequests=[];
const inflightLegacyTimers=[];
const inflightDetailNode={getAttribute(){return "obAdminSaveExpertAiChat('expert-legacy')";}};
const inflightLegacyContent={
  textContent:'Total sessions',
  querySelector(selector){return String(selector).includes('[onclick*=')?inflightDetailNode:null;},
  querySelectorAll(){return [];},
  insertAdjacentHTML(){inflightLegacyInsertions+=1;}
};
const inflightLegacyPanel={querySelector(selector){return selector==='.admin-content'?inflightLegacyContent:null;}};
const inflightLegacyRoot={
  window:null,Promise,Object,Array,String,Number,Error,encodeURIComponent,console,
  location:{pathname:'/admin/experts'},
  sessionStorage:{getItem(){return 'admin-token';}},localStorage:{getItem(){return ''; }},
  document:{
    readyState:'loading',
    getElementById(id){return id==='admin-panel-experts'?inflightLegacyPanel:null;},
    addEventListener(name,callback){if(name==='DOMContentLoaded')inflightDomReady=callback;}
  },
  MutationObserver:class {constructor(){}observe(){}},
  setTimeout(callback,ms){inflightLegacyTimers.push({callback,ms});return inflightLegacyTimers.length;},clearTimeout(){},
  fetch(url){const request=deferred();inflightLegacyRequests.push({url:String(url),request});return request.promise;},
  __obAdminExpertDetailCanonicalReady:false
};
inflightLegacyRoot.window=inflightLegacyRoot;
vm.createContext(inflightLegacyRoot);
new vm.Script(controlsHotfix,{filename:'legacy-admin-controls-inflight-ownership.js'}).runInContext(inflightLegacyRoot);
assert.equal(typeof inflightDomReady,'function');
inflightDomReady();
inflightLegacyTimers.find(timer=>timer.ms===150).callback();
assert.equal(inflightLegacyRequests.length,1,'legacy profile request begins before canonical ownership');
assert.match(inflightLegacyRequests[0].url,/\/profile$/);
inflightLegacyRoot.__obAdminExpertDetailCanonicalReady=true;
inflightLegacyRequests[0].request.resolve(response({ai_chat:{enabled:true}}));
await new Promise(resolve=>setImmediate(resolve));
assert.equal(inflightLegacyInsertions,0,'an in-flight profile response cannot replace the canonical detail');
assert.equal(inflightLegacyRequests.length,1,'a stale profile response cannot fan out into legacy child reads');

inflightLegacyRoot.__obAdminExpertDetailCanonicalReady=false;
inflightLegacyTimers.find(timer=>timer.ms===650).callback();
assert.equal(inflightLegacyRequests.length,2,'a second legacy profile request can model child reads already in flight');
inflightLegacyRequests[1].request.resolve(response({ai_chat:{enabled:true}}));
await new Promise(resolve=>setImmediate(resolve));
assert.equal(inflightLegacyRequests.length,4,'legacy profile started group and marketplace reads before ownership transferred');
assert.equal(inflightLegacyInsertions,1,'legacy AI controls rendered only while legacy code still owned the detail');
inflightLegacyRoot.__obAdminExpertDetailCanonicalReady=true;
inflightLegacyRequests[2].request.resolve(response({entitlement:{enabled:true}}));
inflightLegacyRequests[3].request.resolve(response({enabled:true}));
await new Promise(resolve=>setImmediate(resolve));
assert.equal(inflightLegacyInsertions,1,'in-flight group and marketplace responses become inert after canonical ownership transfers');

function makeContent(name){
  return {
    name,
    innerHTML:'',
    classList:{contains(value){return value==='admin-content';}},
    parentNode:null
  };
}
const firstContent=makeContent('first');
const duplicateContent=makeContent('duplicate');
const panel={
  children:[firstContent,duplicateContent],
  appendChild(node){node.parentNode=this;this.children.push(node);return node;},
  removeChild(node){this.children=this.children.filter(item=>item!==node);node.parentNode=null;return node;}
};
firstContent.parentNode=panel;duplicateContent.parentNode=panel;
const requests=[];const historyCalls=[];
const root={
  window:null,Promise,Object,Array,String,Number,Error,URL,URLSearchParams,AbortController,encodeURIComponent,console,
  location:{pathname:'/admin/experts',search:'',hash:'',href:'https://ownlybiz.test/admin/experts'},
  history:{pushState(...args){historyCalls.push(['push',...args]);},replaceState(...args){historyCalls.push(['replace',...args]);}},
  sessionStorage:{getItem(){return 'admin-token';}},localStorage:{getItem(){return ''; }},
  document:{
    getElementById(id){return id==='admin-panel-experts'?panel:null;},
    createElement(){return makeContent('created');},
    querySelectorAll(){return [];}
  },
  apiBase(){return 'https://api.ownlybiz.test';},
  esc(value){return String(value??'');},money(value){return `$${Number(value||0).toFixed(2)}`;},
  renderApprovalControl(enabled){return `<div data-approval="${enabled}"></div>`;},
  toastLocal(){},
  fetch(url,options){const request=deferred();requests.push({url:String(url),options,request});return request.promise;}
};
root.window=root;
vm.createContext(root);
new vm.Script(listRuntime,{filename:'admin-expert-list-controller.js'}).runInContext(root);

const delayedList=root.obRenderAdminExpertsEnhanced();
assert.equal(panel.children.length,1,'duplicate direct .admin-content nodes are removed');
assert.match(firstContent.innerHTML,/data-admin-experts-state="loading"/);
const expertATicket=root.obAdminExpertsBeginDetail('expert-a');
firstContent.innerHTML='<div id="ob-admin-expert-detail" data-expert-id="expert-a">Expert A</div>';
requests[0].request.resolve(response({settings:{ctrl_starter_manual_approval:true}}));
requests[1].request.resolve(response({experts:[{id:'expert-a',name:'Expert A',is_active:1,approval_status:'approved'}]}));
assert.equal(await delayedList,false,'late list data is discarded after detail takes ownership');
assert.match(firstContent.innerHTML,/data-expert-id="expert-a"/,'late list data cannot repaint the selected detail');

const expertBTicket=root.obAdminExpertsBeginDetail('expert-b');
assert.equal(root.obAdminExpertsCurrent(expertATicket),false,'expert A ticket expires immediately when B is selected');
assert.equal(root.obAdminExpertsCurrent(expertBTicket),true,'expert B owns the current detail generation');

const backToList=root.obRenderAdminExpertsEnhanced({forceList:true});
requests[2].request.resolve(response({settings:{ctrl_starter_manual_approval:true}}));
requests[3].request.resolve(response({experts:[{id:'expert-b',name:'Expert B',email:'b@example.test',is_active:1,approval_status:'approved'}]}));
assert.equal(await backToList,true);
assert.match(firstContent.innerHTML,/id="ob-admin-experts-list"[^>]+data-admin-experts-state="ready"/);
assert.equal((firstContent.innerHTML.match(/id="ob-admin-experts-table"/g)||[]).length,1,'refresh produces exactly one canonical Experts table');
assert.equal(root.__obAdminExpertsController.mode,'list');

const routeSeen=[];
const routeRoot={window:null,applyingRoute:false};
routeRoot.window=routeRoot;
routeRoot.adminUrl=panel=>`/admin/${panel}`;
routeRoot.writeUrl=function(path){routeSeen.push(['write',path]);};
routeRoot.adminNav=function(){routeSeen.push(['render',...arguments]);};
vm.createContext(routeRoot);
new vm.Script(routeAdminWrapper,{filename:'admin-route-wrapper.js'}).runInContext(routeRoot);
routeRoot.adminNav('nav','experts');
assert.deepEqual(routeSeen.map(entry=>entry[0]),['write','render'],'an explicit Experts click clears the detail URL before rendering the list');
routeSeen.length=0;
routeRoot.applyingRoute=true;
routeRoot.adminNav('nav','experts');
assert.deepEqual(routeSeen.map(entry=>entry[0]),['render'],'route boot preserves its query until the detail renderer claims it');

const deepContent=makeContent('deep');
const deepPanel={
  children:[deepContent],
  classList:{add(){},remove(){}},
  appendChild(node){node.parentNode=this;this.children.push(node);return node;},
  removeChild(node){this.children=this.children.filter(item=>item!==node);node.parentNode=null;return node;}
};
deepContent.parentNode=deepPanel;
const deepHistory=[];
const deepLocation={pathname:'/admin/experts',search:'?expertId=expert-deep&action=approve',hash:'',href:'https://ownlybiz.test/admin/experts?expertId=expert-deep&action=approve'};
function applyDeepUrl(next){
  const parsed=new URL(String(next||''),deepLocation.href);
  deepLocation.pathname=parsed.pathname;deepLocation.search=parsed.search;deepLocation.hash=parsed.hash;deepLocation.href=parsed.href;
}
const deepRoot={
  window:null,Promise,Object,Array,String,Number,Error,URL,URLSearchParams,AbortController,encodeURIComponent,console,
  location:deepLocation,
  history:{pushState(...args){deepHistory.push(['push',...args]);applyDeepUrl(args[2]);},replaceState(...args){deepHistory.push(['replace',...args]);applyDeepUrl(args[2]);}},
  sessionStorage:{getItem(){return 'admin-token';}},localStorage:{getItem(){return ''; }},
  document:{
    readyState:'complete',
    getElementById(id){return id==='admin-panel-experts'?deepPanel:null;},
    createElement(){return makeContent('created');},
    querySelectorAll(){return [];},
    addEventListener(){}
  },
  apiBase(){return 'https://api.ownlybiz.test';},
  esc(value){return String(value??'');},money(value){return `$${Number(value||0).toFixed(2)}`;},
  renderApprovalControl(enabled){return `<div data-approval="${enabled}"></div>`;},
  toastLocal(){},fetch(){throw new Error('deep-link route must not start the list loader');},setTimeout(fn){fn();return 1;},
  __obAdminExpertDetailCanonicalReady:true
};
deepRoot.window=deepRoot;
vm.createContext(deepRoot);
new vm.Script(listRuntime,{filename:'admin-expert-deep-link-controller.js'}).runInContext(deepRoot);
const deepOpens=[];
deepRoot.obAdminOpenExpertDetail=function(id){
  deepOpens.push(String(id));
  deepRoot.obAdminExpertsBeginDetail(id);
};
deepRoot.adminNav(null,'experts');
assert.deepEqual(deepOpens,['expert-deep'],'route boot opens the exact deep-linked expert once');
assert.equal(deepRoot.__obAdminExpertsController.mode,'detail');
assert.equal(deepRoot.__obAdminExpertsController.expertId,'expert-deep');
assert.equal(deepRoot.__ownlybizAdminExpertQueryOpened,'expert-deep:','the later query bootstrap sees the normalized marker and cannot open the detail twice');
assert.equal(deepHistory.length,1,'route ownership performs only the canonical detail URL normalization');
assert.equal(deepHistory[0][0],'replace');
assert.match(String(deepHistory[0][3]||''),/^\/admin\/experts\?expertId=expert-deep$/,'detail normalization preserves the expert identity while consuming the one-shot action');
new vm.Script(queryBootstrap,{filename:'admin-expert-query-bootstrap.js'}).runInContext(deepRoot);
assert.deepEqual(deepOpens,['expert-deep'],'the compatibility query bootstrap cannot issue a second detail request after route ownership');

console.log('Admin Expert Management list/detail/form stability regression: ok');
