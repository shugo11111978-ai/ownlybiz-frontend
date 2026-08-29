import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

function scriptById(id){
  const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match,`${id} is installed`);return match[1];
}
function section(source,start,end){
  const left=source.indexOf(start);assert(left>=0,`section starts at ${start}`);
  const right=source.indexOf(end,left+start.length);assert(right>=0,`section ends at ${end}`);
  return source.slice(left,right);
}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function flush(){for(let i=0;i<6;i+=1)await Promise.resolve();}

const featureAuthority=section(html,'  var expertAiFeatureAuthority =','  function automaticTrainingTime(value){');
const automaticConsentParser=section(html,'  function automaticChatConsentState(data){','  window.obReplyAssistantAutomationGateText = replyAssistantAutomationGateText;');
const automaticTraining=section(html,'  function automaticTrainingTime(value){','\t  function expertAiPreferenceCard(){');
const automaticPreference=section(html,'  function expertAiPreferenceCard(){','  window.obExpertAiSettingsTab = function(tab){');
const automaticConsentMutation=section(html,'  window.obExpertAiConsentToggle = function(accepted){','  window.obExpertAiAutoAcceptToggle = function(enabled){');

function makeAiHarness(){
  let identity={token:'token-a',principal:'expert:a',role:'expert',identityGeneration:1,credentialGeneration:1,signal:{aborted:false}};
  let lifecycle=null;
  const pending=new Map();const calls=[];const notices=[];
  const nodes={
    'ob-settings-ai-nav':{hidden:false,style:{display:''}},
    'ob-expert-ai-feature-tabs':{innerHTML:''},
    'ob-expert-ai-automatic-tab':{hidden:true},
    'ob-expert-ai-human-tab':{hidden:true},
    'ob-expert-ai-unavailable':{style:{display:'none'}}
  };
  const host={lastHtml:'',renderCount:0,insertAdjacentHTML(_where,value){this.lastHtml=String(value);this.renderCount+=1;}};
  nodes['ob-expert-ai-settings-host']=host;
  const context={
    capture(scope){return {...identity,scope};},
    isCurrent(owner,options){return !!owner&&owner.principal===identity.principal&&owner.identityGeneration===identity.identityGeneration&&(!(options&&options.exactCredential)||(owner.token===identity.token&&owner.credentialGeneration===identity.credentialGeneration));},
    register(_name,handlers){lifecycle=handlers;}
  };
  const key=(token,path,method='GET')=>`${token}:${method}:${path}`;
  const root={window:null,Promise,Object,Array,Number,String,Date,Error,console,isNaN,setTimeout(){return 1;},setInterval(){return 1;},
    OB_CLIENT_CONTEXT:context,hasExpertAuth:()=>identity.role==='expert',safe:value=>String(value??''),attr:value=>String(value??''),
    document:{activeElement:null,getElementById(id){return nodes[id]||null;}},
    replyAssistantAutomationEffective:()=>false,replyAssistantAutomationGateText:()=> 'Waiting for governed checks.',
    notify(message,tone){notices.push({message,tone});},expertAiChatPanel(){return Promise.resolve(true);},
    api(path,options={}){
      const method=options.method||'GET';calls.push({path,options});
      if(path==='/ai/features')return Promise.resolve({success:true,features:{automatic_ai_chat:{visible:true},human_reply_assistant:{visible:false}}});
      const request=deferred();pending.set(key(options.token,path,method),request);return request.promise;
    }
  };
  root.window=root;vm.createContext(root);
  new vm.Script(`${automaticConsentParser}\n${featureAuthority}\n${automaticTraining}\n${automaticPreference}\n${automaticConsentMutation}`,{filename:'expert-ai-principal-race.js'}).runInContext(root);
  return {
    root,host,calls,notices,
    switchToB(){if(lifecycle&&lifecycle.teardown)lifecycle.teardown({...identity});identity={token:'token-b',principal:'expert:b',role:'expert',identityGeneration:2,credentialGeneration:1,signal:{aborted:false}};},
    resolve(token,path,value,method='GET'){const request=pending.get(key(token,path,method));assert(request,`pending ${token} ${method} ${path}`);request.resolve(value);},
    training(label,revision){return {success:true,available:true,admin_guidance:`${label} admin`,expert_instructions:`${label} instructions`,revision,learning:{source:'completed automatic sessions',event_count:0,updated_at:null,principles:[],recent_events:[]}};},
    consent(label,revision){return {consent:{accepted:true,revision,document_version:`${label}-v1`,current_document_version:`${label}-v1`}};},
    status(label){return {enabled:true,mode:'fully_ai',auto_accept_chat_requests:false,auto_accept_chat_available:true,auto_accept_chat_effective:false,reply_assistant_auto_send_effective:false,reply_assistant_automation_gate_version:'reply-assistant-automation-v1',reply_assistant_automation_gate_reason:'reply_assistant_auto_accept_required',reply_assistant_automation_lane:'human',purpose_profile:label};}
  };
}

const preferenceRace=makeAiHarness();
await preferenceRace.root.obExpertAiLoadFeatureAuthority(true);
const preferenceA=preferenceRace.root.obExpertAiPreferenceCard();await flush();
preferenceRace.switchToB();
await preferenceRace.root.obExpertAiLoadFeatureAuthority(true);
const preferenceB=preferenceRace.root.obExpertAiPreferenceCard();await flush();
preferenceRace.resolve('token-b','/ai/expert-chat/status',preferenceRace.status('B'));
preferenceRace.resolve('token-b','/ai/expert-chat/consent',preferenceRace.consent('B',21));
preferenceRace.resolve('token-b','/ai/expert-chat/training',preferenceRace.training('B',31));
assert.equal(await preferenceB,true);
assert.equal(preferenceRace.root.__obAutomaticAiChatTraining.expertInstructions,'B instructions');
assert.match(preferenceRace.host.lastHtml,/B instructions/);
const renderCountAfterB=preferenceRace.host.renderCount;
preferenceRace.resolve('token-a','/ai/expert-chat/status',preferenceRace.status('A'));
preferenceRace.resolve('token-a','/ai/expert-chat/consent',preferenceRace.consent('A',2));
preferenceRace.resolve('token-a','/ai/expert-chat/training',preferenceRace.training('A',3));
assert.equal(await preferenceA,false,'a delayed expert-A preference read is discarded after switching to B');
assert.equal(preferenceRace.root.__obAutomaticAiChatTraining.expertInstructions,'B instructions','expert A training never enters expert B state');
assert.equal(preferenceRace.host.renderCount,renderCountAfterB,'expert A cannot repaint expert B settings');
assert(preferenceRace.calls.filter(call=>call.path!=='/ai/features').every(call=>call.options.token&&call.options.signal),'every Automatic Chat private read carries the captured token and lifecycle signal');

const mutationRace=makeAiHarness();
await mutationRace.root.obExpertAiLoadFeatureAuthority(true);
mutationRace.root.__obAutomaticAiChatConsent={accepted:false,revision:7,documentVersion:null,currentDocumentVersion:'A-v1'};
const mutationA=mutationRace.root.obExpertAiConsentToggle(true);await flush();
mutationRace.switchToB();
await mutationRace.root.obExpertAiLoadFeatureAuthority(true);
mutationRace.root.__obAutomaticAiChatConsent={accepted:false,revision:41,documentVersion:null,currentDocumentVersion:'B-v1'};
mutationRace.resolve('token-a','/ai/expert-chat/consent',{consent:{accepted:true,revision:8,document_version:'A-v1',current_document_version:'A-v1'}},'PUT');
assert.equal(await mutationA,false,'a delayed expert-A mutation confirmation is discarded after switching to B');
assert.equal(mutationRace.root.__obAutomaticAiChatConsent.revision,41,'expert A confirmation cannot replace expert B consent revision');
assert.deepEqual(mutationRace.notices,[],'stale expert A confirmation produces no expert B toast');

const adminScript=scriptById('ownlybiz-admin-expert-detail-correct-flow-20260526');
const adminOwnership=section(adminScript,'\t  function captureAdminExpertDetailOwner(id,requestId){','  function when(v){');
const adminOpen=section(adminScript,'  function openExpertDetail(id, slug, name){','  function install(){');
const adminContent={innerHTML:'',scrollIntoView(){}};const adminPending=[];
const adminIdentity={token:'admin-token',principal:'admin:one',role:'admin',identityGeneration:1,credentialGeneration:1,signal:{aborted:false}};
const adminRoot={window:null,Promise,String,Number,encodeURIComponent,console,
  OB_CLIENT_CONTEXT:{capture(_scope,extras){return {...adminIdentity,...extras};},isCurrent(owner,options){return owner&&owner.principal===adminIdentity.principal&&(!(options&&options.exactCredential)||owner.token===adminIdentity.token);}},
  notify(){},panelContent:()=>adminContent,detailHtml:id=>`detail:${id}`,esc:value=>String(value??''),
  api(path,options){const request=deferred();adminPending.push({path,options,request});return request.promise;}
};
adminRoot.window=adminRoot;vm.createContext(adminRoot);
new vm.Script(`var activeExpertDetail=null;var activeExpertDetailRequest=0;${adminOwnership}\n${adminOpen}\nwindow.__openExpertDetail=openExpertDetail;`,{filename:'admin-expert-detail-race.js'}).runInContext(adminRoot);
adminRoot.__openExpertDetail('expert-a','a','Expert A');
adminRoot.__openExpertDetail('expert-b','b','Expert B');
for(const call of adminPending.filter(call=>call.path.includes('expert-b')))call.request.resolve({});
for(const call of adminPending.filter(call=>call.path.includes('refund-requests')&&call.path.includes('expert-b')))call.request.resolve({requests:[]});
await flush();assert.equal(adminContent.innerHTML,'detail:expert-b');
for(const call of adminPending.filter(call=>call.path.includes('expert-a')))call.request.resolve({});
for(const call of adminPending.filter(call=>call.path.includes('refund-requests')&&call.path.includes('expert-a')))call.request.resolve({requests:[]});
await flush();assert.equal(adminContent.innerHTML,'detail:expert-b','late expert A admin data cannot repaint selected expert B');
assert(adminPending.every(call=>call.options.token==='admin-token'&&call.options.signal===adminIdentity.signal),'admin detail reads share one exact captured admin owner');

const onDemand=scriptById('ownlybiz-on-demand-readings-20260607');
const busyRuntime=section(onDemand,'\t  function obOdRequestBusy(id){','\t  function obOdLocalSaveHtml(label){');
const draftRuntime=section(onDemand,'\t  window.obOdDraft = function(id){','\t  window.obOdDeliver = function(id){');
function makeDraftHarness(){
  let identity={token:'expert-token',principal:'expert:one'};let currentRequest=deferred();
  const textarea={value:''};const owner={...identity,expertId:'expert-1',expertSlug:'luna',signal:{aborted:false},identityGeneration:1,credentialGeneration:1};
  const refreshed={...owner};
  const state={expertOwner:owner,expertRequestBusy:Object.create(null),expertRequestOperationSequence:0,expertOpenRequests:Object.create(null),expertRequestFocus:null};
  const root={window:null,Promise,String,encodeURIComponent,Array,state,document:{getElementById(id){return id==='ob-od-answer-request-1'?textarea:null;}},
    expertOwnerCurrent(value){return !!value&&value.token===identity.token&&value.principal===identity.principal;},
	    obOdRequestElement(){return null;},obOdCaptureRequestView(){},obOdRestoreRequestView(){root.restores=(root.restores||0)+1;},toastMsg(){},
    api(){return currentRequest.promise;},loadExpertOnDemand(){state.expertOwner=refreshed;root.loads=(root.loads||0)+1;return Promise.resolve(true);}
  };
  root.window=root;vm.createContext(root);new vm.Script(`${busyRuntime}\n${draftRuntime}`,{filename:'on-demand-refresh-race.js'}).runInContext(root);
  return {root,state,textarea,owner,refreshed,resolve:value=>currentRequest.resolve(value),switchIdentity(){identity={token:'other-token',principal:'expert:two'};},replaceRequest(){currentRequest=deferred();return currentRequest;}};
}
const draftRace=makeDraftHarness();
const delayedDraft=draftRace.root.obOdDraft('request-1');
assert.equal(draftRace.state.expertRequestBusy['request-1'].operation,'draft');
draftRace.state.expertOwner=draftRace.refreshed;
draftRace.resolve({draft:'Personalized draft'});
await delayedDraft;
assert.equal(draftRace.textarea.value,'Personalized draft','same-principal Refresh does not discard the delayed AI draft');
assert.equal(draftRace.root.loads,1);assert.equal(draftRace.state.expertRequestBusy['request-1'],undefined,'the settled draft always clears its own lock after Refresh');

const staleDraftRace=makeDraftHarness();
const staleDraft=staleDraftRace.root.obOdDraft('request-1');
const replacement={requestId:'request-1',operation:'deliver',sequence:99};
staleDraftRace.switchIdentity();staleDraftRace.state.expertRequestBusy['request-1']=replacement;
staleDraftRace.resolve({draft:'Expert A private output'});
await staleDraft;
assert.equal(staleDraftRace.textarea.value,'','a delayed old-principal draft cannot enter the new screen');
assert.equal(staleDraftRace.state.expertRequestBusy['request-1'],replacement,'old operation cleanup cannot clear a newer operation lock');

console.log('AI/admin/On-Demand delayed render ownership regression: ok');
