import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

function scriptById(id){
  const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match,`${id} is installed`);return match[1];
}
function section(start,end){const left=html.indexOf(start);assert(left>=0,`section starts at ${start}`);const right=html.indexOf(end,left+start.length);assert(right>=0,`section ends at ${end}`);return html.slice(left,right);}

const source=scriptById('ownlybiz-expert-reply-knowledge-20260817');
const markup=section('<section id="ob-reply-knowledge-manager"','<div id="ob-expert-ai-settings-host"');
const legacyGate=section('  var REPLY_ASSISTANT_AUTOMATION_GATE_COPY','  function expertAiChatPanel(){');
const legacyPanel=section('  function expertAiChatPanel(){','  function expertAiSettingsTab(){');
const legacyAi=section('  function expertAiPreferenceCard(){','  window.obExpertAiSettingsTab = function(tab){');
const style=section('<style id="ownlybiz-expert-reply-knowledge-20260817-style">','<script id="ownlybiz-expert-reply-knowledge-20260817">');

assert.match(markup,/id="ob-reply-knowledge-manager"[^>]+hidden/,'private manager starts hidden');
assert.match(markup,/Governed · Fail-closed/,'the manager identifies the governed fail-closed release state');
assert.match(markup,/Automated sending is fail-closed[\s\S]*?every governed gate passes[\s\S]*?human expert reviews and sends/,'the manager explains active automation and its human fallback truthfully');
for(const id of ['ob-ra-gate-entitlement','ob-ra-gate-expert','ob-ra-gate-training','ob-ra-gate-training-consent','ob-ra-gate-auto-send'])assert.match(markup,new RegExp(`id="${id}"`),`${id} is a separate visible state`);
assert.match(markup,/id="ob-ra-training-consent"[^>]+disabled[\s\S]*?document <b id="ob-ra-training-version"/,'training consent is explicit and version-labelled');
assert.match(markup,/id="ob-ra-auto-send-consent"[^>]+disabled[\s\S]*?Allow governed auto-send when every gate passes[\s\S]*?id="ob-ra-auto-send-version"[\s\S]*?Consent is necessary but not sufficient[\s\S]*?Any failed gate returns replies to human review/,'auto-send consent is separate and explicitly fail-closed');
assert.match(markup,/Revoking consent stops creation and retrieval immediately/,'revocation effect is explained');
assert.match(markup,/id="ob-ra-manual-content"[^>]+maxlength="6000"/,'manual input matches the 6,000-code-point server bound');
assert.match(markup,/role="alertdialog"[^>]+aria-modal="true"/,'delete-all uses an accessible confirmation dialog');
assert.match(markup,/id="ob-ra-expert-guidance"[^>]+maxlength="8000"/,'existing expert-written guidance remains available');
assert.match(markup,/stays separate from training consent and reviewed knowledge/,'expert-written guidance is not presented as learned knowledge');
assert.doesNotMatch(legacyAi,/learned_guidance|Learned notes|clear_learned_guidance|obExpertAiClearLearnedGuidance/,'opaque legacy learning is not rendered or mutated');
const automationReasons=['reply_assistant_provider_authority_unavailable','reply_assistant_capacity_rollout_not_enforced','reply_assistant_expert_inactive','reply_assistant_entitlement_required','reply_assistant_training_entitlement_required','reply_assistant_disabled','reply_assistant_training_consent_required','reply_assistant_auto_send_consent_required','reply_assistant_approved_source_required','reply_assistant_admin_ai_disabled','reply_assistant_expert_ai_disabled','reply_assistant_fully_ai_mode_required','reply_assistant_auto_accept_required','reply_assistant_ai_capacity_unavailable'];
for(const reason of automationReasons)assert.match(legacyGate,new RegExp(reason),`${reason} has bounded expert-facing copy`);
assert.match(legacyGate,/reply_assistant_auto_send_effective === true[\s\S]*?reply-assistant-automation-v1[\s\S]*?automation_gate_reason === null[\s\S]*?automation_lane === 'ai'/,'compact AI status requires the complete effective gate envelope');
assert.match(legacyPanel,/autoReplyEffective = replyAssistantAutomationEffective\(d\)[\s\S]*?governed auto-replies active[\s\S]*?human review[\s\S]*?waiting:/,'compact AI status renders active and fail-closed waiting states from backend authority');
assert.match(legacyAi,/autoReplyEffective = replyAssistantAutomationEffective\(d\)[\s\S]*?governed auto-replies active[\s\S]*?human review · waiting:/,'Fully AI preferences reflect the governed gate instead of a hardcoded release phase');
assert.match(legacyPanel+legacyAi,/autoAvailable = d\.auto_accept_chat_available === true[\s\S]*?autoDisabled = autoAvailable \? '' : 'disabled'/,'auto-accept controls use the server-owned non-circular availability field');
assert.match(legacyAi,/autoEffective[\s\S]*?new chat requests start automatically and governed replies may send[\s\S]*?Requested · waiting:/,'chat auto-accept distinguishes effective, requested, and waiting states');
assert.doesNotMatch(markup+legacyPanel+legacyAi,/Phase 5|inactive in Phase 5|never sends messages automatically/,'the current UI contains no stale Phase 5 automation claims');
assert.doesNotMatch(source,/\.innerHTML\s*=|insertAdjacentHTML|outerHTML/,'private sources are never projected through HTML parsing');
assert.match(source,/content\.textContent=source\.content/,'allowlisted source content is rendered as text');
assert.match(source,/API='\/api\/ai\/reply-assistant'/,'private routes share one governed API base');
assert.match(source,/expected_revision:state\.controls\.revision/,'controls use exact revision CAS');
assert.match(source,/confirmation:'DELETE_REPLY_ASSISTANT_SOURCE'/,'single-source deletion uses the frozen confirmation');
assert.match(source,/confirmation:'DELETE_ALL_REPLY_ASSISTANT_KNOWLEDGE'/,'delete-all uses the frozen confirmation');
assert.match(source,/normalizeExport\(data\)/,'downloads serialize only the normalized export');
assert.match(source,/automated_send_authorized[\s\S]*automated_send_gate_snapshot[\s\S]*automated_send_training_gate[\s\S]*automated_send_consent_gate[\s\S]*automated_send_source_gate/,'export allowlist accepts the governed gate snapshot and legacy audit reasons without adding payload fields');
assert.match(source,/source_limit_reached[\s\S]*?maximum 200 knowledge sources/,'the bounded source ceiling error is allowlisted without projecting backend details');
assert.match(source,/mutation_rate_limited[\s\S]*?Too many Reply Assistant changes were made recently/,'429 mutation throttles use a bounded safe message');
assert.match(source,/data\.sources\.length>400/,'manager source reads enforce the final 400-row boundary before mapping');
assert.match(source,/value\.sources\.length>200[\s\S]*?value\.audit\.length>500/,'each export part enforces both final boundaries before mapping');
assert.match(source,/snapshot_token=[\s\S]*?sources_done=1[\s\S]*?audit_done=1/,'multipart continuation chains the returned token and independent done sentinels');
assert.match(source,/if\(state\.loading&&!options\.force\)return state\.loadPromise/,'duplicate manager loads coalesce before allocating an aborting operation');
assert.doesNotMatch(source,/FileReader|FormData|input[^\n]+type=['"]file|dataTransfer\.files/,'Phase 4 remains text-only with no file ingestion');
assert.match(style,/\.ob-ra-button\{min-height:44px/,'buttons meet the touch-target floor');
assert.match(style,/@media\(max-width:768px\)[\s\S]*?font-size:16px/,'mobile form controls avoid viewport zoom');
assert.match(style,/:focus-visible/,'keyboard focus remains visible');

const legacyGateSandbox={window:null,Object,String};legacyGateSandbox.window=legacyGateSandbox;
vm.createContext(legacyGateSandbox);
new vm.Script(`${legacyGate}\nwindow.__gateEffective=replyAssistantAutomationEffective;`,{filename:'expert-ai-governed-status.js'}).runInContext(legacyGateSandbox);
const readyStatus={reply_assistant_auto_send_effective:true,reply_assistant_automation_gate_version:'reply-assistant-automation-v1',reply_assistant_automation_gate_reason:null,reply_assistant_automation_lane:'ai'};
assert.equal(legacyGateSandbox.__gateEffective(readyStatus),true,'the exact all-ready expert status activates governed replies');
assert.equal(legacyGateSandbox.__gateEffective({...readyStatus,reply_assistant_automation_lane:'human'}),false,'a contradictory lane fails closed');
assert.equal(legacyGateSandbox.__gateEffective({...readyStatus,reply_assistant_automation_gate_version:'future-version'}),false,'an unknown gate contract fails closed');
assert.equal(legacyGateSandbox.obReplyAssistantAutomationGateText('RAW_PROVIDER_DETAIL'),'Governed auto-replies are waiting for all safety checks.','raw or unknown status reasons never reach the compact UI');

class FakeElement{
  constructor(tagName,ownerDocument){this.tagName=String(tagName||'div').toUpperCase();this.ownerDocument=ownerDocument;this.children=[];this.parentNode=null;this.attributes=new Map();this.listeners=new Map();this.style={};this.dataset={};this.hidden=false;this.disabled=false;this.checked=false;this.value='';this._text='';this.id='';this.className='';this.clicked=false;}
  get firstChild(){return this.children[0]||null;} get firstElementChild(){return this.firstChild;}
  get textContent(){return this._text+this.children.map((child)=>child.textContent).join('');}
  set textContent(value){this._text=value==null?'':String(value);this.children=[];}
  set innerHTML(_value){throw new Error('private runtime attempted HTML parsing');}
  appendChild(child){child.parentNode=this;this.children.push(child);return child;}
  removeChild(child){const index=this.children.indexOf(child);if(index>=0)this.children.splice(index,1);child.parentNode=null;return child;}
  remove(){if(this.parentNode)this.parentNode.removeChild(this);}
  setAttribute(name,value){name=String(name);value=String(value);this.attributes.set(name,value);if(name==='id')this.id=value;if(name==='class')this.className=value;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;}
  getAttribute(name){name=String(name);if(name==='id')return this.id||null;if(name==='class')return this.className||null;return this.attributes.has(name)?this.attributes.get(name):null;}
  removeAttribute(name){name=String(name);this.attributes.delete(name);if(name.startsWith('data-'))delete this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())];}
  addEventListener(type,listener){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(listener);}
  dispatchEvent(event){event.target||=this;for(const listener of this.listeners.get(event.type)||[])listener.call(this,event);return true;}
  focus(){this.ownerDocument.activeElement=this;}
  blur(){if(this.ownerDocument.activeElement===this)this.ownerDocument.activeElement=null;}
  click(){this.clicked=true;if(this.tagName==='A')this.ownerDocument.downloadClicks.push({download:this.download,href:this.href});this.dispatchEvent({type:'click',preventDefault(){}});}
  contains(target){for(let node=target;node;node=node.parentNode)if(node===this)return true;return false;}
  matches(selector){
    if(selector==='button'||selector==='textarea'||selector==='article'||selector==='a')return this.tagName===selector.toUpperCase();
    if(selector.startsWith('.'))return String(this.className).split(/\s+/).includes(selector.slice(1));
    const attrs=[...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)];
    return attrs.length>0&&attrs.every(([,name,value])=>value===undefined?this.getAttribute(name)!==null:this.getAttribute(name)===value);
  }
  querySelectorAll(selector){const found=[];const visit=(node)=>{for(const child of node.children){if(child.matches(selector))found.push(child);visit(child);}};visit(this);return found;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
class FakeDocument{
  constructor(){this.nodes=new Map();this.listeners=new Map();this.readyState='loading';this.activeElement=null;this.hidden=false;this.downloadClicks=[];this.body=new FakeElement('body',this);}
  createElement(tagName){return new FakeElement(tagName,this);}
  getElementById(id){return this.nodes.get(String(id))||null;}
  addEventListener(type,listener){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(listener);}
  dispatchEvent(event){for(const listener of this.listeners.get(event.type)||[])listener.call(this,event);}
  add(tagName,id,parent){const node=this.createElement(tagName);node.id=id;this.nodes.set(id,node);(parent||this.body).appendChild(node);return node;}
}
class FakeMutationObserver{static instances=[];constructor(callback){this.callback=callback;FakeMutationObserver.instances.push(this);}observe(target,options){this.target=target;this.options=options;}trigger(){this.callback([],this);}}
class FakeBlob{constructor(parts,options){this.parts=parts;this.type=options&&options.type;FakeBlob.instances.push(this);}static instances=[];}

function deferred(){let resolve,reject;const promise=new Promise((res,rej)=>{resolve=res;reject=rej;});return {promise,resolve,reject};}
function response(body,status=200){return {ok:status>=200&&status<300,status,json:async()=>body};}
function controls(overrides={}){return {success:true,controls:{reply_assistant_enabled:false,training_consent:false,training_consent_version:null,current_training_consent_version:'training-v1',training_consented_at:null,training_revoked_at:null,auto_send_consent:false,auto_send_consent_version:null,current_auto_send_consent_version:'auto-v1',auto_send_consented_at:null,auto_send_revoked_at:null,retention_days:30,revision:1,...overrides.controls},entitlements:{reply_assistant_enabled:true,training_enabled:true,revision:1,...overrides.entitlements},effective:{draft_available:false,training_available:false,auto_send_available:false,automation_gate_version:'reply-assistant-automation-v1',automation_gate_reason:'reply_assistant_disabled',automation_lane:'human',...overrides.effective}};}
function opaqueToken(label='snapshot'){return `${String(label).replace(/[^A-Za-z0-9_-]/g,'_').padEnd(20,'x')}.${'a'.repeat(64)}`;}
function exportEnvelope({exportedAt=1700000500,token=opaqueToken(),sources=[],audit=[],sourceMore=false,sourceAt=null,sourceId=null,auditMore=false,auditAt=null,auditId=null,reason}={}){
  const rows=reason&&audit.length===0?[{id:'audit-gate',actor_role:'system',target_type:'controls',target_id:null,action:'automated_send_authorized',reason_code:reason,previous_revision:null,new_revision:1,previous_status:null,new_status:null,consent_document_version:null,source_kind:null,content_changed:false,created_at:1700000400}]:audit;
  return {success:true,export:{schema_version:'reply-assistant-v1',exported_at:exportedAt,controls:controls().controls,sources,audit:rows,page:{snapshot_token:token,complete:!sourceMore&&!auditMore,sources:{has_more:sourceMore,next_after_created_at:sourceMore?sourceAt:null,next_after_id:sourceMore?sourceId:null,limit:200},audit:{has_more:auditMore,next_before_created_at:auditMore?auditAt:null,next_before_id:auditMore?auditId:null,limit:500}}}};
}
function sourceRow(id,status='pending_review',overrides={}){const kind=overrides.kind||'manual';return {id,kind,session_id:kind==='session_summary'?(overrides.session_id||'session-safe'):null,content:overrides.content??`${status} safe content`,status,quarantine_code:status==='quarantined'?(overrides.quarantine_code||'detector_uncertain'):null,revision:overrides.revision||1,approved_at:status==='approved'?1700000100:null,expires_at:status==='approved'||status==='expired'?1800000000:null,deleted_at:status==='deleted'?1700000200:null,created_at:1700000000,updated_at:1700000050,...overrides};}
function initialSources(){return [
  sourceRow('pending-one','pending_review',{content:'Literal <b>guidance</b>'}),sourceRow('approved-one','approved'),sourceRow('rejected-one','rejected'),
  sourceRow('quarantine-one','quarantined',{content:'RAW_QUARANTINE_CONTENT',quarantine_code:'prompt_injection_detected'}),sourceRow('expired-one','expired',{content:'RAW_EXPIRED_CONTENT'}),sourceRow('deleted-one','deleted',{content:'RAW_DELETED_CONTENT'}),
];}

function createIdentity(role='expert'){
  let current={token:'token-a',principal:'expert|a',role,identityGeneration:1,credentialGeneration:1,signal:new AbortController().signal};let adapter=null,lastPromise=Promise.resolve();
  const snapshot=(scope)=>Object.freeze({...current,scope:String(scope||'')});
  const client={capture:snapshot,isCurrent(context,options={}){return !!(context&&!context.signal.aborted&&context.principal===current.principal&&context.identityGeneration===current.identityGeneration&&(!options.exactCredential||(context.token===current.token&&context.credentialGeneration===current.credentialGeneration)));},register(name,next){assert.equal(name,'expert-reply-assistant-knowledge');adapter=next;return()=>{adapter=null;};}};
  return {client,current:()=>current,last:()=>lastPromise,rotate(token='token-b'){current={...current,token,credentialGeneration:current.credentialGeneration+1};lastPromise=Promise.resolve(adapter&&adapter.credentialRotated&&adapter.credentialRotated(snapshot('rotated'),{kind:'credential_rotated'}));return lastPromise;},change({token='token-next',principal='expert|next',role:nextRole='expert'}={}){const previous=snapshot('previous');if(adapter&&adapter.teardown)adapter.teardown(previous,{kind:'identity_changed'});current={token,principal,role:nextRole,identityGeneration:current.identityGeneration+1,credentialGeneration:current.credentialGeneration+1,signal:new AbortController().signal};lastPromise=Promise.resolve(adapter&&adapter.changed&&adapter.changed(snapshot('changed'),{kind:'identity_changed'}));return lastPromise;}};
}

function createHarness({role='expert',support=false,mini=false,fetchImpl=null,visible=true}={}){
  FakeMutationObserver.instances=[];FakeBlob.instances=[];
  const document=new FakeDocument();const panel=document.add('div','sblock-ai');panel.style.display=visible?'':'none';const manager=document.add('section','ob-reply-knowledge-manager',panel);manager.hidden=true;
  const ids=['ob-ra-manager-status','ob-ra-entitlement-status','ob-ra-expert-status','ob-ra-training-entitlement-status','ob-ra-training-consent-status','ob-ra-auto-send-status','ob-ra-training-version','ob-ra-auto-send-version','ob-ra-guidance-count','ob-ra-guidance-status','ob-ra-manual-count','ob-ra-manual-status','ob-ra-summary-status','ob-ra-sources-status'];
  for(const id of ids)document.add('div',id,manager);
  const sourcesTitle=document.add('h4','ob-ra-sources-title',manager);sourcesTitle.setAttribute('tabindex','-1');
  for(const id of ['ob-ra-gate-entitlement','ob-ra-gate-expert','ob-ra-gate-training','ob-ra-gate-training-consent','ob-ra-gate-auto-send'])document.add('div',id,manager);
  for(const id of ['ob-ra-enabled','ob-ra-training-consent','ob-ra-auto-send-consent']){const input=document.add('input',id,manager);input.disabled=true;}
  const retention=document.add('input','ob-ra-retention-days',manager);retention.disabled=true;
  const guidance=document.add('textarea','ob-ra-expert-guidance',manager);guidance.disabled=true;
  const manual=document.add('textarea','ob-ra-manual-content',manager);manual.disabled=true;
  const summary=document.add('input','ob-ra-summary-session',manager);summary.disabled=true;
  for(const id of ['ob-ra-reload','ob-ra-save-controls','ob-ra-guidance-save','ob-ra-manual-submit','ob-ra-summary-submit','ob-ra-export','ob-ra-delete-all']){const button=document.add('button',id,manager);button.disabled=true;}
  const sourceList=document.add('div','ob-ra-source-list',manager);
  const backdrop=document.add('div','ob-ra-delete-all-dialog',manager);backdrop.hidden=true;const dialog=document.createElement('div');dialog.className='ob-ra-dialog';backdrop.appendChild(dialog);const cancel=document.add('button','ob-ra-delete-all-cancel',dialog);const confirmButton=document.add('button','ob-ra-delete-all-confirm',dialog);
  const composer=document.add('textarea','expert-chat-input');
  const identity=createIdentity(role);const calls=[];const downloads=[];let handler=fetchImpl;let uuid=0;
  const defaultHandler=(url,options)=>{const method=options.method||'GET';if(url.endsWith('/api/ai/reply-assistant/controls')&&method==='GET')return response(controls());if(url.endsWith('/api/ai/reply-assistant/sources')&&method==='GET')return response({success:true,sources:initialSources()});if(url.endsWith('/api/ai/expert-chat/status')&&method==='GET')return response({success:true,admin_enabled:true,expert_guidance:'Calm expert guidance',learned_guidance:'LEGACY_LEARNED_SENTINEL',last_error:'RAW_PROVIDER_STATUS_SENTINEL'});throw new Error(`unexpected ${method} ${url}`);};
  const root={window:null,document,console,Object,Array,Number,String,Boolean,Math,JSON,Date,Promise,AbortController,TextEncoder,Blob:FakeBlob,MutationObserver:FakeMutationObserver,setTimeout,clearTimeout,location:{pathname:mini?'/mini-suite':'/dash/expert/settings'},OWNLYBIZ_API_URL:'https://api.example.test/',__OB_TEST_HOOKS__:{},OB_CLIENT_CONTEXT:identity.client,crypto:{randomUUID:()=>`00000000-0000-4000-8000-${String(++uuid).padStart(12,'0')}`},URL:{createObjectURL(blob){downloads.push(blob);return `blob:test-${downloads.length}`;},revokeObjectURL(){}},obSupportSessionActive:()=>support,obIsMiniSuiteRoute:()=>mini,settingsNav(){},addEventListener(){},confirm:()=>true,toast(){},fetch(url,options={}){calls.push({url,options});try{return Promise.resolve((handler||defaultHandler)(url,options,calls.length-1));}catch(error){return Promise.reject(error);}}};
  root.window=root;vm.createContext(root);new vm.Script(source,{filename:'expert-reply-assistant-knowledge.js'}).runInContext(root);
  const hooks=root.__OB_TEST_HOOKS__.expertReplyKnowledge;
  function start({wait=true}={}){document.readyState='complete';document.dispatchEvent({type:'DOMContentLoaded'});const pending=hooks.state.loadPromise;return wait?(pending||Promise.resolve(false)):pending;}
  return {root,document,panel,manager,retention,guidance,manual,summary,sourceList,backdrop,cancel,confirmButton,composer,identity,calls,downloads,downloadClicks:document.downloadClicks,hooks,start,setHandler(next){handler=next;}};
}

const primary=createHarness();await primary.start();
assert.equal(primary.calls.length,3,'initial expert load uses only controls, sources, and existing guidance reads');
assert.deepEqual(primary.calls.map((call)=>new URL(call.url).pathname),['/api/ai/reply-assistant/controls','/api/ai/reply-assistant/sources','/api/ai/expert-chat/status']);
for(const call of primary.calls){assert.equal(call.options.headers.Authorization,'Bearer token-a');assert.equal(call.options.cache,'no-store');}
assert.equal(primary.manager.hidden,false);assert.equal(primary.manager.getAttribute('aria-busy'),'false');assert.equal(primary.hooks.state.loaded,true);assert.equal(primary.hooks.state.loading,false);
assert.equal(primary.document.getElementById('ob-ra-enabled').checked,false);assert.equal(primary.document.getElementById('ob-ra-training-consent').checked,false);assert.equal(primary.document.getElementById('ob-ra-auto-send-consent').checked,false);
assert.equal(primary.document.getElementById('ob-ra-training-version').textContent,'training-v1');assert.equal(primary.document.getElementById('ob-ra-auto-send-version').textContent,'auto-v1');
assert.match(primary.document.getElementById('ob-ra-auto-send-status').textContent,/waiting: Enable Reply Assistant/);
for(const reason of automationReasons){const message=primary.hooks.automationGateText(reason);assert(message&&message!==reason,`${reason} maps to bounded copy`);assert(!message.includes('reply_assistant_'),`${reason} is never exposed verbatim`);}
assert.equal(primary.hooks.automationGateText('RAW_UNKNOWN_SERVER_REASON'),'Governed auto-replies are waiting for all safety checks.','unknown backend reasons use bounded generic copy');
const allReady=primary.hooks.parseControls(controls({controls:{reply_assistant_enabled:true,training_consent:true,training_consent_version:'training-v1',training_consented_at:1700001000,auto_send_consent:true,auto_send_consent_version:'auto-v1',auto_send_consented_at:1700001001},effective:{draft_available:true,training_available:true,auto_send_available:true,automation_gate_reason:null,automation_lane:'ai'}}));
assert.equal(allReady.effective.autoSendAvailable,true);assert.equal(allReady.effective.automationLane,'ai');
primary.hooks.renderControls(allReady);assert.match(primary.document.getElementById('ob-ra-auto-send-status').textContent,/^Active · auto-v1$/,'all-ready envelope renders active auto-send');
assert.throws(()=>primary.hooks.parseControls(controls({effective:{auto_send_available:true,automation_gate_reason:'reply_assistant_disabled',automation_lane:'human'}})),(error)=>error&&error.code==='reply_assistant_invalid_response','inconsistent effective envelope fails closed');
assert.throws(()=>primary.hooks.parseControls(controls({effective:{automation_gate_reason:'RAW_UNKNOWN_SERVER_REASON'}})),(error)=>error&&error.code==='reply_assistant_invalid_response','unknown gate reasons cannot reach private UI');
primary.hooks.renderControls(primary.hooks.parseControls(controls()));
for(const label of ['Pending review','Approved for drafts','Rejected','Quarantined','Expired','Deleted'])assert.match(primary.sourceList.textContent,new RegExp(label));
assert.match(primary.sourceList.textContent,/Literal <b>guidance<\/b>/,'markup-like source text remains literal text');
assert.doesNotMatch(primary.sourceList.textContent,/RAW_QUARANTINE_CONTENT|RAW_EXPIRED_CONTENT|RAW_DELETED_CONTENT/,'inactive unsafe or deleted content never reaches the DOM');
assert.equal(primary.sourceList.querySelector('[data-ob-ra-source="quarantine-one"][data-ob-ra-action="approve"]'),null);assert.equal(primary.sourceList.querySelector('[data-ob-ra-source="expired-one"][data-ob-ra-action="edit"]'),null);assert.equal(primary.sourceList.querySelector('[data-ob-ra-source="deleted-one"][data-ob-ra-action="delete"]'),null,'inactive sources disappear from active-use controls immediately');
assert.equal(primary.guidance.value,'Calm expert guidance','expert-written guidance is loaded through the exact private credential');
assert.doesNotMatch(primary.manager.textContent,/LEGACY_LEARNED_SENTINEL|RAW_PROVIDER_STATUS_SENTINEL/,'legacy learned content and provider status details are never projected');

const loadParts={controls:deferred(),sources:deferred(),guidance:deferred()};
const coalesced=createHarness({fetchImpl:(url)=>url.endsWith('/controls')?loadParts.controls.promise:url.endsWith('/sources')?loadParts.sources.promise:loadParts.guidance.promise});
const coalescedPending=coalesced.start({wait:false});
assert.equal(coalesced.calls.length,3);
coalesced.root.settingsNav(null,'sblock-ai');
assert.equal(FakeMutationObserver.instances.length,1);FakeMutationObserver.instances[0].trigger();
assert.equal(coalesced.calls.length,3,'settings navigation plus panel observation coalesce onto the active load without aborting it');
loadParts.controls.resolve(response(controls()));loadParts.sources.resolve(response({success:true,sources:[]}));loadParts.guidance.resolve(response({success:true,admin_enabled:true,expert_guidance:''}));
assert.equal(await coalescedPending,true);assert.equal(coalesced.hooks.state.loaded,true);assert.equal(coalesced.hooks.state.loading,false);assert.equal(coalesced.manager.getAttribute('aria-busy'),'false');

assert.equal(primary.hooks.parseSources({sources:Array.from({length:400},(_,index)=>sourceRow(`manager-${index}`))}).length,400,'the manager accepts the exact 400-row retained-plus-terminal boundary');
const preMapManager=Array.from({length:401},(_,index)=>sourceRow(`bulk-${index}`));let managerMapped=false;preMapManager.map=()=>{managerMapped=true;throw new Error('manager mapped boundary+1');};
assert.throws(()=>primary.hooks.parseSources({sources:preMapManager}),(error)=>error&&error.code==='reply_assistant_invalid_response');assert.equal(managerMapped,false,'the manager rejects 401 rows before invoking map');
const oversized=createHarness({fetchImpl:(url)=>url.endsWith('/controls')?response(controls()):url.endsWith('/sources')?response({success:true,sources:Array.from({length:401},(_,index)=>sourceRow(`bulk-${index}`))}):response({success:true,admin_enabled:true,expert_guidance:''})});
assert.equal(await oversized.start(),false,'a response above the final 400-source manager ceiling is rejected before projection');assert.equal(oversized.hooks.state.sources.length,0);assert.equal(oversized.sourceList.querySelectorAll('[data-ob-ra-source-card]').length,0,'an oversized private response cannot allocate source cards');assert.match(oversized.document.getElementById('ob-ra-manager-status').textContent,/could not be loaded/i);

const enabled=primary.document.getElementById('ob-ra-enabled'),training=primary.document.getElementById('ob-ra-training-consent'),autoSend=primary.document.getElementById('ob-ra-auto-send-consent');
enabled.checked=true;enabled.dispatchEvent({type:'change'});training.checked=true;training.dispatchEvent({type:'change'});autoSend.checked=true;autoSend.dispatchEvent({type:'change'});primary.retention.value='45';primary.retention.dispatchEvent({type:'change'});
primary.setHandler((url,options)=>{assert(url.endsWith('/api/ai/reply-assistant/controls'));assert.equal(options.method,'PUT');return response(controls({controls:{reply_assistant_enabled:true,training_consent:true,training_consent_version:'training-v1',training_consented_at:1700001000,auto_send_consent:true,auto_send_consent_version:'auto-v1',auto_send_consented_at:1700001001,retention_days:45,revision:2},effective:{draft_available:true,training_available:true,auto_send_available:false}}));});
assert.equal(await primary.hooks.saveControls(),true);
assert.deepEqual(JSON.parse(primary.calls.at(-1).options.body),{expected_revision:1,reply_assistant_enabled:true,training_consent:true,training_consent_version:'training-v1',auto_send_consent:true,auto_send_consent_version:'auto-v1',retention_days:45},'controls PUT includes only explicit changes, exact CAS, and exact current consent versions');
assert.equal(primary.hooks.state.controls.revision,2);assert.equal(primary.hooks.state.effective.trainingAvailable,true);

const guidanceWait=deferred();primary.guidance.value='Submitted guidance';primary.guidance.dispatchEvent({type:'input'});primary.setHandler((url,options)=>{assert(url.endsWith('/api/ai/expert-chat/status'));assert.equal(options.method,'PUT');assert.deepEqual(JSON.parse(options.body),{expert_guidance:'Submitted guidance'});return guidanceWait.promise;});
const guidanceSave=primary.hooks.saveGuidance();primary.guidance.value='Newer guidance stays local';primary.guidance.dispatchEvent({type:'input'});guidanceWait.resolve(response({success:true,admin_enabled:true,expert_guidance:'Submitted guidance'}));
assert.equal(await guidanceSave,true);assert.equal(primary.guidance.value,'Newer guidance stays local');assert.equal(primary.hooks.state.guidanceDirty,true,'late guidance success cannot overwrite or mark newer typing clean');

const manualWait=deferred();primary.manual.value='Submitted manual knowledge';primary.manual.dispatchEvent({type:'input'});primary.setHandler((url,options)=>{assert(url.endsWith('/api/ai/reply-assistant/sources/manual'));assert.equal(options.method,'POST');return manualWait.promise;});
const manualSave=primary.hooks.createManual();const manualBody=JSON.parse(primary.calls.at(-1).options.body);assert.match(manualBody.request_id,/^[A-Za-z0-9][A-Za-z0-9._~-]{15,127}$/);assert.equal(manualBody.expected_controls_revision,2);assert.equal(manualBody.content,'Submitted manual knowledge');
primary.manual.value='Newer manual draft';primary.manual.dispatchEvent({type:'input'});manualWait.resolve(response({success:true,duplicate:false,source:sourceRow('manual-created','pending_review',{content:'Submitted manual knowledge'})},201));
assert.equal(await manualSave,true);assert.equal(primary.manual.value,'Newer manual draft','manual success preserves newer text');assert(primary.hooks.state.sources.some((item)=>item.id==='manual-created'));

const summaryWait=deferred();primary.summary.value='completed_session_1';primary.summary.dispatchEvent({type:'input'});primary.setHandler((url,options)=>{assert(url.endsWith('/api/ai/reply-assistant/sources/session-summary'));assert.equal(options.method,'POST');return summaryWait.promise;});
const summarySave=primary.hooks.createSummary();const summaryBody=JSON.parse(primary.calls.at(-1).options.body);assert.match(summaryBody.request_id,/^[A-Za-z0-9][A-Za-z0-9._~-]{15,127}$/);assert.equal(summaryBody.session_id,'completed_session_1');assert.equal(summaryBody.expected_controls_revision,2);
primary.summary.value='completed_session_2';primary.summary.dispatchEvent({type:'input'});summaryWait.resolve(response({success:true,duplicate:false,source:sourceRow('summary-created','pending_review',{kind:'session_summary',session_id:'completed_session_1',content:'Privacy-screened summary'})},201));
assert.equal(await summarySave,true);assert.equal(primary.summary.value,'completed_session_2','session-summary success preserves a newer session ID');

const editButton=primary.sourceList.querySelector('[data-ob-ra-source="pending-one"][data-ob-ra-action="edit"]');assert(editButton);editButton.click();
let editArea=primary.sourceList.querySelector('textarea');assert(editArea);editArea.value='Submitted source edit';editArea.dispatchEvent({type:'input'});
const editWait=deferred();primary.setHandler((url,options)=>{assert(url.endsWith('/api/ai/reply-assistant/sources/pending-one'));assert.equal(options.method,'PUT');return editWait.promise;});
const editSave=primary.hooks.saveSourceEdit('pending-one');assert.deepEqual(JSON.parse(primary.calls.at(-1).options.body),{content:'Submitted source edit',expected_revision:1});
editArea=primary.sourceList.querySelector('textarea');assert(editArea);editArea.value='Newer source edit';editArea.dispatchEvent({type:'input'});editArea.focus();editWait.resolve(response({success:true,source:sourceRow('pending-one','pending_review',{content:'Submitted source edit',revision:2})}));
assert.equal(await editSave,true);assert.equal(primary.hooks.state.editing.draft,'Newer source edit');assert.equal(primary.hooks.state.editing.baseRevision,2,'newer source editing is rebased onto the returned exact revision');assert.equal(primary.document.activeElement,primary.sourceList.querySelector('textarea'),'late source-edit success preserves focus with the newer local edit');

const lifecycle=createHarness();await lifecycle.start();let lifecycleStep='review';
lifecycle.setHandler((url,options)=>{
  if(lifecycleStep==='review'){assert(url.endsWith('/api/ai/reply-assistant/sources/pending-one/review'));assert.equal(options.method,'POST');lifecycleStep='refresh';return response({success:false,error:'RAW_STALE_REVIEW_DETAIL',code:'revision_conflict'},409);}
  if(lifecycleStep==='refresh'){assert(url.endsWith('/api/ai/reply-assistant/sources'));assert.equal(options.method,'GET');lifecycleStep='done';return response({success:true,sources:[sourceRow('pending-one','pending_review',{revision:4,content:'Current pending revision'})]});}
  throw new Error('unexpected lifecycle request');
});
const beforeReview=lifecycle.calls.length;assert.equal(await lifecycle.hooks.reviewSource('pending-one','approve'),false);assert.deepEqual(JSON.parse(lifecycle.calls[beforeReview].options.body),{decision:'approve',expected_revision:1});assert.equal(lifecycle.calls.slice(beforeReview).filter((call)=>call.url.endsWith('/review')).length,1,'stale review is never automatically retried');assert.equal(lifecycle.hooks.state.sources[0].status,'pending_review');assert.equal(lifecycle.hooks.state.sources[0].revision,4);assert.doesNotMatch(lifecycle.document.getElementById('ob-ra-sources-status').textContent,/RAW_STALE_REVIEW_DETAIL/);

lifecycle.setHandler((url,options)=>{assert(url.endsWith('/api/ai/reply-assistant/sources/pending-one'));assert.equal(options.method,'DELETE');return response({success:true,source:sourceRow('pending-one','deleted',{content:'',revision:5,deleted_at:1700000300})});});
assert.equal(await lifecycle.hooks.deleteSource('pending-one'),true);assert.deepEqual(JSON.parse(lifecycle.calls.at(-1).options.body),{confirmation:'DELETE_REPLY_ASSISTANT_SOURCE',expected_revision:4});assert.doesNotMatch(lifecycle.sourceList.textContent,/Current pending revision/);

const exportAudit={id:'audit-0001',actor_role:'expert',target_type:'source',target_id:'approved-export',action:'source_created',reason_code:'source_pending_review',previous_revision:null,new_revision:1,previous_status:null,new_status:'pending_review',consent_document_version:null,source_kind:'manual',content_changed:true,created_at:1700000400,request_identity_hash:'AUDIT_HASH_SENTINEL',nested:{provider:'AUDIT_PROVIDER_SENTINEL'}};
const exportPayload=exportEnvelope({token:opaqueToken('single-page'),sources:[sourceRow('approved-export','approved',{content:'Allowed retained content',raw_detector_reason:'SOURCE_DETECTOR_SENTINEL'}),sourceRow('expired-export','expired',{content:'EXPIRED_CONTENT_SENTINEL',provider_response:'SOURCE_PROVIDER_SENTINEL'}),sourceRow('deleted-export','deleted',{content:'DELETED_CONTENT_SENTINEL'})],audit:[exportAudit]});
exportPayload.export.controls={...exportPayload.export.controls,request_identity_hash:'CONTROL_HASH_SENTINEL',payment_secret:'CONTROL_PAYMENT_SENTINEL'};exportPayload.export.internal={claim_hash:'TOP_LEVEL_SENTINEL'};
lifecycle.setHandler((url,options)=>{assert(url.endsWith('/api/ai/reply-assistant/export'));assert.equal(options.method,'GET');return response(exportPayload);});
assert.equal(await lifecycle.hooks.exportKnowledge(),true);assert.equal(lifecycle.downloads.length,1);const exportedText=lifecycle.downloads[0].parts.join('');const exported=JSON.parse(exportedText);
assert.equal(exported.sources.length,2);assert.equal(exported.sources.find((item)=>item.id==='expired-export').content,'');assert(!exported.sources.some((item)=>item.id==='deleted-export'));assert.equal(exported.sources.find((item)=>item.id==='approved-export').content,'Allowed retained content');
for(const sentinel of ['CONTROL_HASH_SENTINEL','CONTROL_PAYMENT_SENTINEL','SOURCE_DETECTOR_SENTINEL','SOURCE_PROVIDER_SENTINEL','EXPIRED_CONTENT_SENTINEL','DELETED_CONTENT_SENTINEL','AUDIT_HASH_SENTINEL','AUDIT_PROVIDER_SENTINEL','TOP_LEVEL_SENTINEL'])assert.doesNotMatch(exportedText,new RegExp(sentinel),'recursive export privacy sentinels are not serialized');
assert.deepEqual(Object.keys(exported.audit[0]),['id','actor_role','target_type','target_id','action','reason_code','previous_revision','new_revision','previous_status','new_status','consent_document_version','source_kind','content_changed','created_at']);
assert.match(lifecycle.downloadClicks[0].download,/export-1700000500-run-1-part-0001\.json$/,'single-page exports still use the numbered multipart filename contract');

for(const reason of ['automated_send_gate_snapshot','automated_send_training_gate','automated_send_consent_gate','automated_send_source_gate'])assert(primary.hooks.normalizeExport(exportEnvelope({reason})),`audit reason ${reason} remains exportable`);
const tooManyExportSources=Array.from({length:201},(_,index)=>sourceRow(`export-source-${index}`));let exportSourcesMapped=false;tooManyExportSources.forEach=()=>{exportSourcesMapped=true;throw new Error('mapped 201 sources');};assert.equal(primary.hooks.normalizeExport(exportEnvelope({sources:tooManyExportSources})),null);assert.equal(exportSourcesMapped,false,'201 export sources are rejected before mapping');
const tooManyExportAudits=Array.from({length:501},(_,index)=>({...exportAudit,id:`audit-${index}`}));let exportAuditsMapped=false;tooManyExportAudits.map=()=>{exportAuditsMapped=true;throw new Error('mapped 501 audits');};assert.equal(primary.hooks.normalizeExport(exportEnvelope({audit:tooManyExportAudits})),null);assert.equal(exportAuditsMapped,false,'501 export audits are rejected before mapping');
const exactExportBoundary=primary.hooks.normalizeExport(exportEnvelope({sources:Array.from({length:200},(_,index)=>sourceRow(`exact-source-${index}`)),audit:Array.from({length:500},(_,index)=>({...exportAudit,id:`exact-audit-${index}`}))}));assert.equal(exactExportBoundary.sources.length,200);assert.equal(exactExportBoundary.audit.length,500,'the exact 200/500 export boundary remains accepted');

const multipart=createHarness();await multipart.start();let multipartStep=0;const multipartTokens=[opaqueToken('page-one'),opaqueToken('page-two'),opaqueToken('page-three')];
multipart.setHandler((url,options)=>{
  assert.equal(options.method,'GET');const parsed=new URL(url);assert.equal(parsed.pathname,'/api/ai/reply-assistant/export');multipartStep+=1;
  if(multipartStep===1){assert.equal(parsed.search,'');return response(exportEnvelope({token:multipartTokens[0],sources:[sourceRow('part-one-source','approved')],audit:[exportAudit],sourceMore:true,sourceAt:1700000000,sourceId:'source-cursor-one',auditMore:true,auditAt:1700000400,auditId:'audit-cursor-one'}));}
  if(multipartStep===2){assert.equal(multipart.downloads.length,1,'part one is downloaded before requesting part two');assert.deepEqual(Object.fromEntries(parsed.searchParams),{snapshot_token:multipartTokens[0],source_after_created_at:'1700000000',source_after_id:'source-cursor-one',audit_before_created_at:'1700000400',audit_before_id:'audit-cursor-one'});return response(exportEnvelope({token:multipartTokens[1],sources:[sourceRow('part-two-source','approved')],audit:[{...exportAudit,id:'audit-0002'}],sourceMore:false,auditMore:true,auditAt:1700000300,auditId:'audit-cursor-two'}));}
  if(multipartStep===3){assert.equal(multipart.downloads.length,2,'part two is downloaded before requesting part three');assert.deepEqual(Object.fromEntries(parsed.searchParams),{snapshot_token:multipartTokens[1],sources_done:'1',audit_before_created_at:'1700000300',audit_before_id:'audit-cursor-two'});return response(exportEnvelope({token:multipartTokens[2],sources:[],audit:[{...exportAudit,id:'audit-0003'}]}));}
  throw new Error('multipart requested an extra page');
});
assert.equal(await multipart.hooks.exportKnowledge(),true);assert.equal(multipartStep,3);assert.equal(multipart.downloads.length,3);assert.deepEqual(multipart.downloadClicks.map((item)=>item.download),['ownlybiz-reply-assistant-export-1700000500-run-1-part-0001.json','ownlybiz-reply-assistant-export-1700000500-run-1-part-0002.json','ownlybiz-reply-assistant-export-1700000500-run-1-part-0003.json']);
assert.deepEqual(multipart.downloads.map((blob)=>JSON.parse(blob.parts.join('')).sources.map((item)=>item.id)),[['part-one-source'],['part-two-source'],[]],'each numbered Blob contains only its current page and no accumulated source array');

const restarted=createHarness();await restarted.start();let restartStep=0;const staleToken=opaqueToken('stale-page');
restarted.setHandler((url)=>{const parsed=new URL(url);restartStep+=1;if(restartStep===1){assert.equal(parsed.search,'');return response(exportEnvelope({exportedAt:1700000600,token:staleToken,sources:[sourceRow('stale-source','approved')],sourceMore:true,sourceAt:1700000000,sourceId:'stale-cursor'}));}if(restartStep===2){assert.equal(parsed.searchParams.get('snapshot_token'),staleToken);return response({success:false,code:'reply_assistant_revision_conflict',error:'RAW_CONFLICT_DETAIL'},409);}if(restartStep===3){assert.equal(parsed.search,'','a 409 discards every prior token and cursor before restarting');return response(exportEnvelope({exportedAt:1700000700,token:opaqueToken('fresh-page'),sources:[sourceRow('fresh-source','approved')]}));}throw new Error('restart requested an extra page');});
assert.equal(await restarted.hooks.exportKnowledge(),true);assert.equal(restartStep,3);assert.deepEqual(restarted.downloadClicks.map((item)=>item.download),['ownlybiz-reply-assistant-export-1700000600-run-1-part-0001.json','ownlybiz-reply-assistant-export-1700000700-run-2-part-0001.json']);assert.match(restarted.document.getElementById('ob-ra-sources-status').textContent,/export time 1700000700/);assert.doesNotMatch(restarted.document.getElementById('ob-ra-sources-status').textContent,/RAW_CONFLICT_DETAIL/);

const deleteButton=lifecycle.document.getElementById('ob-ra-delete-all');deleteButton.focus();assert.equal(lifecycle.hooks.openDeleteAll(),false);assert.equal(lifecycle.backdrop.hidden,false);assert.equal(lifecycle.document.activeElement,lifecycle.cancel);
lifecycle.setHandler((url,options)=>{assert(url.endsWith('/api/ai/reply-assistant/knowledge'));assert.equal(options.method,'DELETE');return response({...controls({controls:{revision:6}}),deleted:true});});
assert.equal(await lifecycle.hooks.deleteAll(),true);assert.deepEqual(JSON.parse(lifecycle.calls.at(-1).options.body),{confirmation:'DELETE_ALL_REPLY_ASSISTANT_KNOWLEDGE',expected_controls_revision:1});assert.equal(lifecycle.backdrop.hidden,true);assert.equal(lifecycle.document.activeElement,lifecycle.document.getElementById('ob-ra-sources-title'),'delete-all moves focus to the review heading when its trigger becomes disabled');assert.equal(lifecycle.hooks.state.sources.length,0);

const retry=createHarness();await retry.start();retry.hooks.renderControls(retry.hooks.parseControls(controls({controls:{reply_assistant_enabled:true,training_consent:true,training_consent_version:'training-v1'},effective:{draft_available:true,training_available:true}})));retry.hooks.state.loaded=true;
retry.manual.value='Idempotent manual draft';retry.manual.dispatchEvent({type:'input'});let retryAttempt=0;retry.setHandler((url)=>{assert(url.endsWith('/sources/manual'));retryAttempt+=1;return retryAttempt===1?Promise.reject(new Error('RAW_NETWORK_SECRET')):response({success:true,duplicate:true,source:sourceRow('retry-source','pending_review',{content:'Idempotent manual draft'})});});
assert.equal(await retry.hooks.createManual(),false);const firstRequestId=JSON.parse(retry.calls.at(-1).options.body).request_id;assert.equal(await retry.hooks.createManual(),true);const secondRequestId=JSON.parse(retry.calls.at(-1).options.body).request_id;assert.equal(secondRequestId,firstRequestId,'an uncertain manual create reuses the exact request identity and never auto-retries');assert.doesNotMatch(retry.document.getElementById('ob-ra-manual-status').textContent,/RAW_NETWORK_SECRET/);

const limited=createHarness();await limited.start();limited.hooks.renderControls(limited.hooks.parseControls(controls({controls:{reply_assistant_enabled:true,training_consent:true,training_consent_version:'training-v1'},effective:{draft_available:true,training_available:true}})));limited.hooks.state.loaded=true;limited.manual.value='One source beyond the ceiling';limited.manual.dispatchEvent({type:'input'});
limited.setHandler((url)=>{assert(url.endsWith('/sources/manual'));return response({success:false,code:'reply_assistant_source_limit_reached',error:'RAW_SOURCE_LIMIT_DATABASE_DETAIL'},409);});assert.equal(await limited.hooks.createManual(),false);assert.match(limited.document.getElementById('ob-ra-manual-status').textContent,/maximum 200 knowledge sources/);assert.doesNotMatch(limited.document.getElementById('ob-ra-manual-status').textContent,/RAW_SOURCE_LIMIT_DATABASE_DETAIL/,'source ceiling errors remain bounded and discard server detail');

const rateLimited=createHarness();await rateLimited.start();rateLimited.hooks.renderControls(rateLimited.hooks.parseControls(controls({controls:{reply_assistant_enabled:true,training_consent:true,training_consent_version:'training-v1'},effective:{draft_available:true,training_available:true}})));rateLimited.hooks.state.loaded=true;rateLimited.manual.value='A bounded mutation attempt';rateLimited.manual.dispatchEvent({type:'input'});
rateLimited.setHandler((url)=>{assert(url.endsWith('/sources/manual'));return response({success:false,code:'reply_assistant_mutation_rate_limited',error:'RAW_RATE_WINDOW_AND_DATABASE_DETAIL'},429);});assert.equal(await rateLimited.hooks.createManual(),false);assert.match(rateLimited.document.getElementById('ob-ra-manual-status').textContent,/Too many Reply Assistant changes were made recently/);assert.doesNotMatch(rateLimited.document.getElementById('ob-ra-manual-status').textContent,/RAW_RATE_WINDOW|DATABASE_DETAIL/,'429 responses never project backend detail');

const versioned=createHarness();await versioned.start();const versionReply=versioned.document.getElementById('ob-ra-enabled'),versionTraining=versioned.document.getElementById('ob-ra-training-consent');versionReply.checked=true;versionReply.dispatchEvent({type:'change'});versionTraining.checked=true;versionTraining.dispatchEvent({type:'change'});
versioned.setHandler((url,options)=>{if(url.endsWith('/controls'))return response(controls({controls:{current_training_consent_version:'training-v2'}}));if(url.endsWith('/sources'))return response({success:true,sources:[]});if(url.endsWith('/status'))return response({success:true,admin_enabled:true,expert_guidance:''});throw new Error(`unexpected ${options.method} ${url}`);});
assert.equal(await versioned.hooks.load({force:true}),true);assert.equal(versionTraining.checked,false,'a newly current consent document is never accepted from a stale checked draft');assert.equal(versioned.hooks.state.controlTouched.training,undefined);assert.match(versioned.document.getElementById('ob-ra-manager-status').textContent,/version changed/i);

const guidanceOld=deferred();const rotated=createHarness();await rotated.start();
rotated.manual.value='Manual draft survives token refresh';rotated.manual.dispatchEvent({type:'input'});rotated.summary.value='session_survives_refresh';rotated.summary.dispatchEvent({type:'input'});rotated.guidance.value='Guidance draft survives token refresh';rotated.guidance.dispatchEvent({type:'input'});
const rotatedEdit=rotated.sourceList.querySelector('[data-ob-ra-source="pending-one"][data-ob-ra-action="edit"]');rotatedEdit.click();let rotatedEditArea=rotated.sourceList.querySelector('textarea');rotatedEditArea.value='Source edit survives token refresh';rotatedEditArea.dispatchEvent({type:'input'});
rotated.setHandler((url,options)=>{
  const token=options.headers.Authorization;
  if(token==='Bearer token-a'&&url.endsWith('/status')&&options.method==='PUT')return guidanceOld.promise;
  assert.equal(token,'Bearer token-refresh');
  if(url.endsWith('/controls'))return response(controls());if(url.endsWith('/sources'))return response({success:true,sources:[sourceRow('pending-one','pending_review',{revision:8,content:'Server revision after refresh'})]});if(url.endsWith('/status'))return response({success:true,admin_enabled:true,expert_guidance:'Server guidance after refresh'});throw new Error(`unexpected rotation request ${url}`);
});
const oldGuidanceSave=rotated.hooks.saveGuidance();await rotated.identity.rotate('token-refresh');
assert.equal(rotated.manual.value,'Manual draft survives token refresh');assert.equal(rotated.summary.value,'session_survives_refresh');assert.equal(rotated.guidance.value,'Guidance draft survives token refresh');assert.equal(rotated.hooks.state.guidanceDirty,true);
assert.equal(rotated.hooks.state.editing.draft,'Source edit survives token refresh');assert.equal(rotated.hooks.state.editing.baseRevision,8);assert.equal(rotated.hooks.state.ownedPrincipal,'expert|a');
guidanceOld.resolve(response({success:true,admin_enabled:true,expert_guidance:'OLD_TOKEN_COMPLETION_SECRET'}));assert.equal(await oldGuidanceSave,false);assert.equal(rotated.guidance.value,'Guidance draft survives token refresh','old-token completion is discarded after same-principal rotation');assert.doesNotMatch(rotated.manager.textContent,/OLD_TOKEN_COMPLETION_SECRET/);

const forcedFailure=createHarness();await forcedFailure.start();forcedFailure.manual.value='Allowed manual local draft';forcedFailure.manual.dispatchEvent({type:'input'});forcedFailure.summary.value='allowed_summary_local';forcedFailure.summary.dispatchEvent({type:'input'});forcedFailure.guidance.value='Allowed unsaved guidance draft';forcedFailure.guidance.dispatchEvent({type:'input'});const forcedEdit=forcedFailure.sourceList.querySelector('[data-ob-ra-source="pending-one"][data-ob-ra-action="edit"]');forcedEdit.click();const forcedEditArea=forcedFailure.sourceList.querySelector('textarea');forcedEditArea.value='SERVER_DERIVED_SOURCE_EDIT_MUST_SCRUB';forcedEditArea.dispatchEvent({type:'input'});
forcedFailure.setHandler((url)=>url.endsWith('/controls')?response({success:false,code:'reply_assistant_authority_unavailable',error:'RAW_AUTHORITY_DATABASE_DETAIL'},503):url.endsWith('/sources')?response({success:true,sources:[sourceRow('late-private-source','approved',{content:'LATE_PRIVATE_SOURCE'})]}):response({success:true,admin_enabled:true,expert_guidance:'LATE_PRIVATE_GUIDANCE'}));
assert.equal(await forcedFailure.hooks.load({force:true}),false);assert.equal(forcedFailure.hooks.state.loaded,false);assert.equal(forcedFailure.hooks.state.sources.length,0);assert.equal(forcedFailure.hooks.state.editing,null,'server-linked source edits are not an allowed local draft after authority failure');assert.equal(forcedFailure.hooks.state.guidance,'');assert.equal(forcedFailure.hooks.state.guidanceDirty,true);assert.equal(forcedFailure.manual.value,'Allowed manual local draft');assert.equal(forcedFailure.summary.value,'allowed_summary_local');assert.equal(forcedFailure.guidance.value,'Allowed unsaved guidance draft');assert.doesNotMatch(forcedFailure.manager.textContent,/Literal <b>|Calm expert guidance|SERVER_DERIVED|LATE_PRIVATE|RAW_AUTHORITY|DATABASE_DETAIL/,'forced authority failure scrubs old and late server material while retaining only allowed local drafts');

const guidanceAuthorityFailure=createHarness();await guidanceAuthorityFailure.start();guidanceAuthorityFailure.manual.value='Guidance-failure local manual';guidanceAuthorityFailure.manual.dispatchEvent({type:'input'});guidanceAuthorityFailure.setHandler((url)=>url.endsWith('/controls')?response(controls()):url.endsWith('/sources')?response({success:true,sources:[sourceRow('guidance-load-source','approved',{content:'GUIDANCE_LOAD_LATE_SOURCE'})]}):response({success:false,code:'unexpected_auth_code',error:'RAW_GUIDANCE_AUTH_DETAIL'},401));assert.equal(await guidanceAuthorityFailure.hooks.load({force:true}),false);assert.equal(guidanceAuthorityFailure.hooks.state.sources.length,0,'a private guidance 401 fails the whole authority snapshot and scrubs concurrently returned sources');assert.equal(guidanceAuthorityFailure.guidance.value,'');assert.equal(guidanceAuthorityFailure.manual.value,'Guidance-failure local manual');assert.doesNotMatch(guidanceAuthorityFailure.manager.textContent,/Calm expert guidance|GUIDANCE_LOAD_LATE_SOURCE|RAW_GUIDANCE_AUTH/);

const credentialFailure=createHarness();await credentialFailure.start();credentialFailure.manual.value='Credential local manual';credentialFailure.manual.dispatchEvent({type:'input'});credentialFailure.summary.value='credential_local_summary';credentialFailure.summary.dispatchEvent({type:'input'});credentialFailure.guidance.value='Credential local guidance';credentialFailure.guidance.dispatchEvent({type:'input'});
credentialFailure.setHandler((url,options)=>{assert.equal(options.headers.Authorization,'Bearer token-denied');if(url.endsWith('/controls'))return response({success:false,code:'unexpected_permission_change',error:'RAW_ROTATED_AUTH_DETAIL'},403);if(url.endsWith('/sources'))return response({success:true,sources:[sourceRow('rotated-private','approved',{content:'ROTATED_PRIVATE_SOURCE'})]});return response({success:true,admin_enabled:true,expert_guidance:'ROTATED_PRIVATE_GUIDANCE'});});
assert.equal(await credentialFailure.identity.rotate('token-denied'),false);assert.equal(credentialFailure.hooks.state.sources.length,0);assert.equal(credentialFailure.hooks.state.guidance,'');assert.equal(credentialFailure.manual.value,'Credential local manual');assert.equal(credentialFailure.summary.value,'credential_local_summary');assert.equal(credentialFailure.guidance.value,'Credential local guidance');assert.doesNotMatch(credentialFailure.manager.textContent,/Literal <b>|Calm expert guidance|ROTATED_PRIVATE|RAW_ROTATED/,'credential authority failure scrubs rendered private authority data and late completions');assert.match(credentialFailure.document.getElementById('ob-ra-manager-status').textContent,/permission changed|sign in again/i);

rotated.setHandler((url,options)=>{assert.equal(options.headers.Authorization,'Bearer token-other');if(url.endsWith('/controls'))return response(controls());if(url.endsWith('/sources'))return response({success:true,sources:[sourceRow('other-source','pending_review',{content:'Other expert safe source'})]});if(url.endsWith('/status'))return response({success:true,admin_enabled:true,expert_guidance:'Other expert guidance'});throw new Error(`unexpected identity request ${url}`);});
const identityReload=rotated.identity.change({token:'token-other',principal:'expert|other',role:'expert'});
assert.equal(rotated.manual.value,'');assert.equal(rotated.summary.value,'');assert.equal(rotated.guidance.value,'');assert.doesNotMatch(rotated.sourceList.textContent,/survives token refresh|Server revision after refresh/,'principal change scrubs all prior private text synchronously');
await identityReload;assert.equal(rotated.guidance.value,'Other expert guidance');assert.match(rotated.sourceList.textContent,/Other expert safe source/);assert.doesNotMatch(rotated.manager.textContent,/survives token refresh/);
const callsBeforeClient=rotated.calls.length;await rotated.identity.change({token:'token-client',principal:'client|one',role:'client'});assert.equal(rotated.calls.length,callsBeforeClient);assert.equal(rotated.manager.hidden,true);assert.equal(rotated.sourceList.textContent,'');assert.equal(rotated.document.getElementById('ob-ra-manager-status').textContent,'');

const unsafe=createHarness({fetchImpl:(url)=>url.endsWith('/controls')?response({success:false,error:'RAW_DATABASE_PROVIDER_DETECTOR_SECRET',code:'unexpected_internal_code'},500):url.endsWith('/sources')?response({success:true,sources:[]}):response({success:true,admin_enabled:true,expert_guidance:''})});await unsafe.start();
const unsafeStatus=unsafe.document.getElementById('ob-ra-manager-status').textContent;assert.match(unsafeStatus,/could not be loaded/i);assert.doesNotMatch(unsafeStatus,/RAW_DATABASE|PROVIDER|DETECTOR|unexpected_internal/);assert(unsafeStatus.length<=480,'safe private errors remain bounded');
const hiddenParts={controls:deferred(),sources:deferred(),guidance:deferred()};const hiddenRace=createHarness({fetchImpl:(url)=>url.endsWith('/controls')?hiddenParts.controls.promise:url.endsWith('/sources')?hiddenParts.sources.promise:hiddenParts.guidance.promise});const hiddenPending=hiddenRace.start({wait:false});hiddenRace.panel.style.display='none';FakeMutationObserver.instances[0].trigger();
assert.equal(hiddenRace.manager.hidden,true);assert.equal(hiddenRace.manual.value,'');assert.equal(hiddenRace.sourceList.textContent,'');assert.equal(hiddenRace.document.getElementById('ob-ra-manager-status').textContent,'');
hiddenParts.controls.resolve(response(controls()));hiddenParts.sources.resolve(response({success:true,sources:[sourceRow('hidden-secret','approved',{content:'HIDDEN_LATE_PRIVATE_CONTENT'})]}));hiddenParts.guidance.resolve(response({success:true,admin_enabled:true,expert_guidance:'HIDDEN_LATE_GUIDANCE'}));assert.equal(await hiddenPending,false);assert.equal(hiddenRace.manager.hidden,true);assert.doesNotMatch(hiddenRace.manager.textContent,/HIDDEN_LATE_PRIVATE_CONTENT|HIDDEN_LATE_GUIDANCE/,'hidden-panel callbacks cannot repopulate private or accessible text');
for(const fixture of [createHarness({role:'client'}),createHarness({support:true}),createHarness({mini:true})]){await fixture.start();assert.equal(fixture.calls.length,0,'client, support, and mini surfaces never request private Reply Assistant routes');assert.equal(fixture.manager.hidden,true);assert.equal(fixture.sourceList.textContent,'');}

function installWorkspace(fixture){
  const workspace={principal:'expert|a',focus:'roomA',revision:{roomA:0,roomB:0},drafts:{roomA:'',roomB:''},sendCount:0};fixture.root._obExpertRealtime={focusedRoomId:'roomA'};
  fixture.root.obExpertWorkspaceCaptureOperation=(sid)=>({sid,composerRevision:workspace.revision[sid]||0,principal:workspace.principal});
  fixture.root.obExpertWorkspacePrincipalOperationCurrent=(operation)=>operation.principal===workspace.principal;
  fixture.root.obExpertWorkspaceOperationCurrent=(operation)=>operation.principal===workspace.principal;
  fixture.root.obExpertWorkspaceSetComposerDraft=(sid,value,operation)=>{if(operation.principal!==workspace.principal||operation.composerRevision!==(workspace.revision[sid]||0))return false;workspace.drafts[sid]=value;workspace.revision[sid]=(workspace.revision[sid]||0)+1;if(workspace.focus===sid)fixture.composer.value=value;return true;};
  fixture.root.sendMessage=()=>{workspace.sendCount+=1;};fixture.root.expertSendMessage=()=>{workspace.sendCount+=1;};return workspace;
}
async function waitForCalls(fixture,count){for(let i=0;i<20&&fixture.calls.length<count;i++)await Promise.resolve();assert(fixture.calls.length>=count,`expected ${count} requests`);}

const suggestion=createHarness();await suggestion.start();const suggestionWorkspace=installWorkspace(suggestion);let suggestionWait=deferred();suggestion.setHandler((url)=>url.endsWith('/controls')?response(controls({controls:{reply_assistant_enabled:true},effective:{draft_available:true}})):suggestionWait.promise);
let suggestStart=suggestion.calls.length;const newerSuggestion=suggestion.hooks.suggestReply();await waitForCalls(suggestion,suggestStart+2);suggestionWorkspace.drafts.roomA='Expert typed newer text';suggestionWorkspace.revision.roomA+=1;suggestion.composer.value='Expert typed newer text';suggestionWait.resolve(response({success:true,suggestion:'Late model draft'}));
assert.equal(await newerSuggestion,false);assert.equal(suggestion.composer.value,'Expert typed newer text');assert.equal(suggestionWorkspace.sendCount,0,'a suggestion never invokes a send function');

suggestionWait=deferred();suggestStart=suggestion.calls.length;suggestionWorkspace.focus='roomA';suggestion.root._obExpertRealtime.focusedRoomId='roomA';const backgroundSuggestion=suggestion.hooks.suggestReply();await waitForCalls(suggestion,suggestStart+2);suggestionWorkspace.focus='roomB';suggestion.root._obExpertRealtime.focusedRoomId='roomB';suggestion.composer.value='Room B draft';suggestionWait.resolve(response({success:true,suggestion:'Room A background draft'}));
assert.equal(await backgroundSuggestion,true);assert.equal(suggestionWorkspace.drafts.roomA,'Room A background draft','background result is keyed to its exact session');assert.equal(suggestion.composer.value,'Room B draft','background room A result is not projected into focused room B');assert.equal(suggestionWorkspace.sendCount,0);

const revoke=createHarness();await revoke.start();const revokeWorkspace=installWorkspace(revoke);const accepted=controls({controls:{reply_assistant_enabled:true,training_consent:true,training_consent_version:'training-v1'},effective:{draft_available:true,training_available:true}});revoke.hooks.renderControls(revoke.hooks.parseControls(accepted));revoke.hooks.state.loaded=true;let modelWait=deferred();
revoke.setHandler((url,options)=>{if(url.endsWith('/controls')&&options.method==='GET')return response(accepted);if(url.endsWith('/suggest'))return modelWait.promise;if(url.endsWith('/controls')&&options.method==='PUT')return response(controls({controls:{reply_assistant_enabled:true,training_consent:false,training_consent_version:null,training_revoked_at:1700000600,revision:2},effective:{draft_available:true,training_available:false}}));throw new Error(`unexpected revoke request ${url}`);});
const revokeStart=revoke.calls.length;const inFlightSuggestion=revoke.hooks.suggestReply();await waitForCalls(revoke,revokeStart+2);const revokeTraining=revoke.document.getElementById('ob-ra-training-consent');revokeTraining.checked=false;revokeTraining.dispatchEvent({type:'change'});assert.equal(await revoke.hooks.saveControls(),true);modelWait.resolve(response({success:true,suggestion:'CONSENT_REVOKED_LATE_DRAFT'}));assert.equal(await inFlightSuggestion,false);assert.notEqual(revokeWorkspace.drafts.roomA,'CONSENT_REVOKED_LATE_DRAFT');assert.equal(revokeWorkspace.sendCount,0,'consent revocation discards an in-flight provider result and sends nothing');

const principalSuggestion=createHarness();await principalSuggestion.start();const principalWorkspace=installWorkspace(principalSuggestion);const principalModel=deferred();principalSuggestion.setHandler((url,options)=>{if(options.headers.Authorization==='Bearer token-a'){if(url.endsWith('/controls'))return response(controls({controls:{reply_assistant_enabled:true},effective:{draft_available:true}}));if(url.endsWith('/suggest'))return principalModel.promise;}if(options.headers.Authorization==='Bearer token-other'){if(url.endsWith('/controls'))return response(controls());if(url.endsWith('/sources'))return response({success:true,sources:[]});if(url.endsWith('/status'))return response({success:true,admin_enabled:true,expert_guidance:'Other principal guidance'});}throw new Error(`unexpected principal suggestion request ${url}`);});
const principalStart=principalSuggestion.calls.length;const priorPrincipalDraft=principalSuggestion.hooks.suggestReply();await waitForCalls(principalSuggestion,principalStart+2);principalWorkspace.principal='expert|other';await principalSuggestion.identity.change({token:'token-other',principal:'expert|other',role:'expert'});principalModel.resolve(response({success:true,suggestion:'PRIOR_PRINCIPAL_LATE_DRAFT'}));assert.equal(await priorPrincipalDraft,false);assert.notEqual(principalWorkspace.drafts.roomA,'PRIOR_PRINCIPAL_LATE_DRAFT');assert.equal(principalWorkspace.sendCount,0,'a prior-principal model response cannot project or send');

console.log('expert Reply Assistant knowledge frontend smoke: ok');
