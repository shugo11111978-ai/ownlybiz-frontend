import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function section(start,end){const left=html.indexOf(start),right=html.indexOf(end,left+start.length);assert(left>=0&&right>left,`${start} is extractable`);return html.slice(left,right);}
const authority=section('  var expertAiFeatureAuthority =','  var automaticChatCoachState =');
const coach=section('  var automaticChatCoachState =','  function automaticTrainingTime(value){');
const training=section('  function automaticTrainingTime(value){','\t  function expertAiPreferenceCard(){');
const apiEnd=html.indexOf('  function statusLabel(user, profile){');
const api=html.slice(html.lastIndexOf('  function api(path, opts){',apiEnd),apiEnd);
const safe=section('  function safe(v){ return String(v == null ?', '  function attr(v){ return safe(v)');
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function trainingDto(instructions='Existing spiritual guidance.',revision=4){return {success:true,available:true,admin_guidance:'Admin guidance',expert_instructions:instructions,revision,learning:{source:'completed automatic sessions',event_count:0,updated_at:null,principles:[],recent_events:[]}};}
function turn(overrides={}){return {id:'turn-1',status:'complete',input_text:'Remember the birth date.',reply:'I can remember it in this conversation. For example…',proposed_lessons:['Use a birth date already given instead of asking again.'],training_revision:4,created_at:1788163200,approved:false,...overrides};}
function conversation(overrides={}){return {id:'coach-1',mode:'teach',revision:2,created_at:1788163200,updated_at:1788163200,turns:[turn()],...overrides};}
function harness({withConversation=true}={}){
  let identity={token:'synthetic-a',principal:'expert:a',role:'expert',identityGeneration:1,credentialGeneration:1,signal:new AbortController().signal};
  let lifecycle;const calls=[],notices=[],nodes={};
  function node(id){return nodes[id]??=( {id,value:'',innerHTML:'',textContent:'',disabled:false,readOnly:false,checked:false,hidden:false,style:{},attrs:{},selectionStart:0,selectionEnd:0,setAttribute(key,value){this.attrs[key]=String(value);},getAttribute(key){return this.attrs[key]??null;},querySelectorAll(){return [];},remove(){delete nodes[id];},focus(){root.document.activeElement=this;}} );}
  for(const id of ['teach-tab','simulate-tab','panel','explanation','history','turns','input','count','send','status','approval-status','new','refresh'])node('ob-automatic-ai-coach-'+id);
  node('ob-automatic-ai-expert-instructions').value='Existing spiritual guidance.';node('ob-automatic-ai-training-count');
  const root={window:null,console,Promise,Object,Array,Number,String,Date,Error,AbortController,TextEncoder,crypto:webcrypto,isNaN,setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},
    hasExpertAuth:()=>identity.role==='expert',
    OB_CLIENT_CONTEXT:{capture:scope=>({...identity,scope}),isCurrent:owner=>!!owner&&owner.token===identity.token&&owner.principal===identity.principal&&owner.identityGeneration===identity.identityGeneration,register(_id,handlers){lifecycle=handlers;}},
    document:{activeElement:null,getElementById:id=>nodes[id]||null},notify:(message,tone)=>notices.push({message,tone}),
    api(path,options={}){const pending=deferred();calls.push({path,options,...pending});return pending.promise;}
  };
  root.window=root;vm.createContext(root);new vm.Script(safe+authority+coach+training,{filename:'automatic-ai-coach-source.js'}).runInContext(root);
  root.obExpertAiFeatureAuthority('automatic',true);root.__obAutomaticAiChatTraining=root.parseAutomaticChatTraining(trainingDto());
  const state=root.automaticChatCoach(root.expertAiFeatureAuthority.owner);state.loaded=true;
  if(withConversation)root.automaticCoachSetConversation(state,root.parseAutomaticCoachConversation(conversation()));
  return {root,state,calls,notices,nodes,node,setDraft(content){node('ob-automatic-ai-coach-input').value=content;root.obAutomaticAiCoachInput(node('ob-automatic-ai-coach-input'));},switchIdentity(){lifecycle.teardown();identity={...identity,token:'synthetic-b',principal:'expert:b',identityGeneration:2};root.obExpertAiFeatureAuthority('automatic',true);},resolve(index,value){calls[index].resolve(value);},reject(index,status,code,message='Synthetic failure'){calls[index].reject(Object.assign(new Error(message),{status,code}));}};
}
async function flush(){for(let i=0;i<8;i++)await Promise.resolve();}

test('coach is mounted only inside Automatic training and never posts raw conversation to saved instructions',()=>{
  assert.match(training,/automaticCoachHtml\(\)/);
  assert.doesNotMatch(coach,/localStorage|sessionStorage|\/sessions|\/payments|\/on-demand|\/ai\/reply-assistant/);
  assert.doesNotMatch(coach,/expert_instructions\s*:/,'only server-owned exact proposal approval may change training');
  assert.match(coach,/body:\{turn_id:turnId,expected_training_revision:review\.revision\}/);
});

test('all conversation text and exact proposed lessons are escaped, never rendered as HTML',()=>{
  const h=harness();h.root.automaticCoachSetConversation(h.state,h.root.parseAutomaticCoachConversation(conversation({turns:[turn({input_text:'<img src=x onerror=alert(1)>',reply:'<script>alert(1)</script>',proposed_lessons:['<b>Do not execute</b>']})]})));
  const markup=h.root.automaticCoachTurnsHtml(h.state);
  assert.doesNotMatch(markup,/<img|<script|<b>Do not/);assert.match(markup,/&lt;img/);assert.match(markup,/&lt;script&gt;/);assert.match(markup,/&lt;b&gt;Do not/);
});

test('typing and periodic rendering preserve the same textarea, text selection and unsent draft',()=>{
  const h=harness();h.setDraft('My unsent coaching message');const input=h.node('ob-automatic-ai-coach-input');input.focus();input.selectionStart=4;input.selectionEnd=9;
  h.root.renderAutomaticCoach();h.root.renderAutomaticCoach();
  assert.equal(h.node('ob-automatic-ai-coach-input'),input);assert.equal(input.value,'My unsent coaching message');assert.equal(input.selectionStart,4);assert.equal(input.selectionEnd,9);assert.equal(h.root.document.activeElement,input);
  assert.match(h.root.automaticCoachHtml(),/My unsent coaching message/,'a replaced card is rebuilt from exact-owner memory');
  assert.match(h.root.automaticCoachHtml(),/id="ob-automatic-ai-coach-input"[^>]*font-weight:400/,'the message body does not inherit the bold field label');
});

test('send uses exact server revision; double send and new conversation cannot race pending reply',async()=>{
  const h=harness();h.setDraft('Please give warmer examples.');const pending=h.root.obAutomaticAiCoachSend();await flush();
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].path,'/ai/expert-chat/coach/coach-1/messages');assert.equal(h.calls[0].options.body.expected_revision,2);assert.match(h.calls[0].options.body.request_id,/^[0-9a-f-]{36}$/);
  assert.equal(await h.root.obAutomaticAiCoachSend(),false);assert.equal(await h.root.obAutomaticAiCoachNew(),false);assert.equal(h.calls.length,1);
  h.resolve(0,{success:true,conversation:conversation({revision:3,turns:[turn(),turn({id:'turn-2',input_text:'Please give warmer examples.',request_id:h.calls[0].options.body.request_id})]})});assert.equal(await pending,true);assert.equal(h.state.draft,'');assert.equal(h.state.conversation.revision,3);
});

test('identity switch aborts request and suppresses stale private reply',async()=>{
  const h=harness();h.setDraft('Private A example');const pending=h.root.obAutomaticAiCoachSend();await flush();const signal=h.calls[0].options.signal;
  h.switchIdentity();assert.equal(signal.aborted,true);h.resolve(0,{success:true,conversation:conversation({revision:3})});assert.equal(await pending,false);
  const current=h.root.automaticChatCoach(h.root.expertAiFeatureAuthority.owner);assert.equal(current.owner.principal,'expert:b');assert.equal(current.conversation,null);assert.equal(current.draft,'');assert.deepEqual(h.notices,[]);
});

test('transport retry reuses request id and keeps unsent text until verified success',async()=>{
  const h=harness();h.setDraft('Offer an example.');const first=h.root.obAutomaticAiCoachSend();await flush();const id=h.calls[0].options.body.request_id;
  h.reject(0,503,'temporary_unavailable');assert.equal(await first,false);assert.equal(h.state.draft,'Offer an example.');
  const retry=h.root.obAutomaticAiCoachSend();await flush();assert.equal(h.calls[1].options.body.request_id,id);
  h.resolve(1,{success:true,conversation:conversation({revision:3,turns:[turn({request_id:id})]})});assert.equal(await retry,true);assert.equal(h.state.retry,null);
});

test('409 reloads authoritative conversation without retrying or dropping unsent text',async()=>{
  const h=harness();h.setDraft('Keep this message');const pending=h.root.obAutomaticAiCoachSend();await flush();h.reject(0,409,'automatic_ai_chat_coach_revision_conflict');await flush();
  assert.equal(h.calls.length,2);assert.equal(h.calls[1].options.method,undefined);assert.equal(h.calls[1].path,'/ai/expert-chat/coach/coach-1');
  h.resolve(1,{success:true,conversation:conversation({revision:9})});assert.equal(await pending,false);assert.equal(h.state.draft,'Keep this message');assert.equal(h.state.conversation.revision,9);
});

test('saved history restores an earlier teaching conversation without creating one',async()=>{
  const h=harness({withConversation:false});h.state.loaded=false;const loading=h.root.obAutomaticAiCoachRefresh();await flush();
  assert.equal(h.calls[0].path,'/ai/expert-chat/coach');h.resolve(0,{success:true,conversations:[{...conversation(),turns:undefined}]});await flush();
  assert.equal(h.calls[1].path,'/ai/expert-chat/coach/coach-1');h.resolve(1,{success:true,conversation:conversation()});assert.equal(await loading,true);assert.equal(h.state.conversation.turns[0].input_text,'Remember the birth date.');assert(h.calls.every(call=>!call.options.method));
});

test('all 200 saved conversations remain available, including history older than the first 20',async()=>{
  const h=harness({withConversation:false});h.state.loaded=false;
  const history=Array.from({length:200},(_,index)=>({id:'coach-'+(index+1),mode:'teach',revision:2,created_at:1788163200-index,updated_at:1788163200-index}));
  const loading=h.root.obAutomaticAiCoachRefresh();await flush();h.resolve(0,{success:true,conversations:history});await flush();h.resolve(1,{success:true,conversation:conversation()});assert.equal(await loading,true);
  assert.equal(h.state.conversations.length,200);assert.match(h.node('ob-automatic-ai-coach-history').innerHTML,/value="coach-200"/);
  const older=h.root.obAutomaticAiCoachSelect('coach-200');await flush();assert.equal(h.calls[2].path,'/ai/expert-chat/coach/coach-200');h.resolve(2,{success:true,conversation:conversation({id:'coach-200'})});assert.equal(await older,true);assert.equal(h.state.conversation.id,'coach-200');assert.equal(h.state.conversations.length,200);assert(h.state.conversations.some(row=>row.id==='coach-199'));
});

test('approval requires explicit review at current training revision and never sends transcript',async()=>{
  const h=harness();assert.equal(await h.root.obAutomaticAiCoachApprove('turn-1'),false);h.root.obAutomaticAiCoachReview('turn-1',true);
  const approving=h.root.obAutomaticAiCoachApprove('turn-1');await flush();assert.equal(h.calls.length,1);assert.equal(h.calls[0].path,'/ai/expert-chat/coach/coach-1/approve');
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].options.body)),{turn_id:'turn-1',expected_training_revision:4});
  const instructions='Existing spiritual guidance.\n\nApproved lesson: Use a birth date already given instead of asking again.';
  h.resolve(0,{success:true,training:trainingDto(instructions,5),conversation:conversation({revision:3,turns:[turn({approved:true})]})});assert.equal(await approving,true);assert.equal(h.root.__obAutomaticAiChatTraining.expertInstructions,instructions);assert.match(h.state.approvalStatus,/revision 5/);
});

test('dirty editor and stale review stop lesson save without a server write',async()=>{
  const h=harness();h.root.obAutomaticAiCoachReview('turn-1',true);h.node('ob-automatic-ai-expert-instructions').value='Unsaved independent edit';assert.equal(await h.root.obAutomaticAiCoachApprove('turn-1'),false);assert.equal(h.calls.length,0);
  h.node('ob-automatic-ai-expert-instructions').value='Existing spiritual guidance.';h.root.__obAutomaticAiChatTraining.revision=5;assert.equal(await h.root.obAutomaticAiCoachApprove('turn-1'),false);assert.equal(h.calls.length,0);assert.equal(h.state.approvals['turn-1'],undefined);
});

test('live-session training busy leaves durable lesson untouched and reports apply-later',async()=>{
  const h=harness();h.root.obAutomaticAiCoachReview('turn-1',true);const saving=h.root.obAutomaticAiCoachApprove('turn-1');await flush();h.reject(0,409,'automatic_ai_chat_training_busy');assert.equal(await saving,false);
  assert.equal(h.calls.length,1);assert.equal(h.state.conversation.turns[0].proposed_lessons.length,1);assert.equal(h.root.__obAutomaticAiChatTraining.revision,4);assert.equal(h.state.approvalStatus,'Your lesson is saved here. Apply it after this expert’s live sessions end.');
});

test('approval conflict loads latest guidance and requires another explicit review, never overwrites',async()=>{
  const h=harness();h.root.obAutomaticAiCoachReview('turn-1',true);const saving=h.root.obAutomaticAiCoachApprove('turn-1');await flush();h.reject(0,409,'automatic_ai_chat_training_conflict');await flush();assert.equal(h.calls.length,2);assert.equal(h.calls[1].path,'/ai/expert-chat/training');
  h.resolve(1,trainingDto('New guidance from another tab.',8));assert.equal(await saving,false);assert.equal(h.root.__obAutomaticAiChatTraining.expertInstructions,'New guidance from another tab.');assert.equal(h.node('ob-automatic-ai-expert-instructions').value,'New guidance from another tab.');assert.equal(h.state.approvals['turn-1'],undefined);assert.equal(h.state.conversation.turns[0].approved,false);
});

test('input limit, invalid response and instruction-limit errors fail closed',async()=>{
  const h=harness();h.setDraft('x'.repeat(4001));assert.equal(await h.root.obAutomaticAiCoachSend(),false);assert.equal(h.calls.length,0);
  h.setDraft('Valid message');const sending=h.root.obAutomaticAiCoachSend();await flush();h.resolve(0,{success:true,conversation:conversation({turns:[turn({reply:'',status:'complete'})]})});assert.equal(await sending,false);assert.equal(h.state.draft,'Valid message');
  h.state.draft='';h.root.obAutomaticAiCoachReview('turn-1',true);const saving=h.root.obAutomaticAiCoachApprove('turn-1');await flush();h.reject(1,400,'automatic_ai_chat_training_limit','Keep saved instructions within 6,000 characters.');assert.equal(await saving,false);assert.equal(h.root.__obAutomaticAiChatTraining.expertInstructions,'Existing spiritual guidance.');assert.match(h.state.approvalStatus,/6,000/);
});

test('feature disable clears trainer even while Human Reply Assistant remains enabled',()=>{
  const h=harness();h.setDraft('Private draft');h.root.obExpertAiFeatureAuthority('human',true);h.root.obExpertAiFeatureAuthority('automatic',false);
  assert.equal(h.root.automaticChatCoachState,null);assert.equal(h.root.obExpertAiFeatureVisible('human'),true);assert.equal(h.root.automaticCoachHtml(),'');
});

test('missing conversation does not revoke Automatic AI Chat access',async()=>{
  const h=harness();const loading=h.root.obAutomaticAiCoachSelect('coach-1');await flush();h.reject(0,404,'automatic_ai_chat_coach_not_found','This teaching conversation is not available.');assert.equal(await loading,false);assert.equal(h.root.obExpertAiFeatureVisible('automatic'),true);assert.equal(h.root.automaticChatCoachState,h.state);
});

test('knowledge capacity is reported accurately without pretending it is a revision conflict',async()=>{
  const h=harness();h.root.obAutomaticAiCoachReview('turn-1',true);const saving=h.root.obAutomaticAiCoachApprove('turn-1');await flush();h.reject(0,409,'automatic_ai_chat_coach_knowledge_full','Your instructions are full. Review the existing knowledge before adding another lesson.');assert.equal(await saving,false);assert.equal(h.calls.length,1);assert.match(h.state.approvalStatus,/instructions are full/);
});

test('conversation capacity retains the draft; new conversation keeps it without changing saved guidance',async()=>{
  const h=harness();h.setDraft('Start this in a new conversation');const sending=h.root.obAutomaticAiCoachSend();await flush();h.reject(0,409,'automatic_ai_chat_coach_capacity','This conversation is full. Start a new conversation.');assert.equal(await sending,false);assert.equal(h.calls.length,1);assert.match(h.state.status,/conversation is full/);
  const creating=h.root.obAutomaticAiCoachNew();await flush();assert.equal(h.calls[1].path,'/ai/expert-chat/coach');h.resolve(1,{success:true,conversation:conversation({id:'coach-2',revision:1,turns:[]})});assert.equal(await creating,true);assert.equal(h.state.draft,'Start this in a new conversation');assert.equal(h.root.__obAutomaticAiChatTraining.revision,4);
});

test('unmatched reply acknowledgement never clears the pending text',async()=>{
  const h=harness();h.setDraft('Message needing exact acknowledgement');const sending=h.root.obAutomaticAiCoachSend();await flush();h.resolve(0,{success:true,conversation:conversation({revision:3,turns:[turn({request_id:'different-request'})]})});assert.equal(await sending,false);assert.equal(h.state.draft,'Message needing exact acknowledgement');
});

test('persisted failed generation is shown as failed rather than reply ready',async()=>{
  const h=harness();h.setDraft('Keep a failed generation in history');const sending=h.root.obAutomaticAiCoachSend();await flush();h.resolve(0,{success:true,conversation:conversation({revision:3,turns:[turn({request_id:h.calls[0].options.body.request_id,status:'failed',reply:'',proposed_lessons:[],error:'The trainer could not finish this reply.'})]})});assert.equal(await sending,false);assert.equal(h.state.draft,'');assert.match(h.state.status,/could not finish/);assert.doesNotMatch(h.state.status,/Reply ready/);
});

test('multibyte input honors the server byte limit before sending',async()=>{
  const h=harness();h.setDraft('😀'.repeat(2001));assert.equal(await h.root.obAutomaticAiCoachSend(),false);assert.equal(h.calls.length,0);assert.match(h.state.status,/8,000/);
});

test('Training Center clarifies real-client privacy and restores coach controls after instruction save',()=>{
  assert.match(training,/Real client transcripts are not copied into this trainer/);
  const save=section('\twindow.obAutomaticAiChatSaveTraining = function(){','\t  window.obExpertAiToggle = function(enabled){');
  assert.match(save,/center\.outerHTML=automaticTrainingHtml\(next\);[\s\S]*renderAutomaticCoach\(\)/);
});

test('same-owner stale training read cannot replace a saved revision; identity reset permits its own lower revision',async()=>{
  const h=harness();h.root.obExpertAiFeatureAuthority('human',false);
  h.root.replyAssistantAutomationEffective=()=>true;h.root.replyAssistantAutomationGateText=()=> 'Ready';
  const host=h.node('ob-expert-ai-settings-host');host.renderCount=0;host.insertAdjacentHTML=function(_position,markup){this.renderCount++;this.lastHtml=markup;};
  const consentParser=section('  function automaticChatConsentState(data){','  window.obReplyAssistantAutomationGateText = replyAssistantAutomationGateText;');
  const preference=section('\t  function expertAiPreferenceCard(){','  window.obExpertAiSettingsTab = function(tab){');
  new vm.Script(consentParser+preference).runInContext(h.root);
  const consent={consent:{accepted:true,revision:1,document_version:'synthetic-v1',current_document_version:'synthetic-v1'}};
  const olderRead=h.root.obExpertAiPreferenceCard();await flush();
  h.root.__obAutomaticAiChatTraining=h.root.parseAutomaticChatTraining(trainingDto('Newly approved guidance.',5));
  h.resolve(0,{enabled:true,mode:'fully_ai'});h.resolve(1,consent);h.resolve(2,trainingDto('Old guidance fetched before the save.',4));
  assert.equal(await olderRead,true);assert.equal(h.root.__obAutomaticAiChatTraining.revision,5);assert.equal(h.root.__obAutomaticAiChatTraining.expertInstructions,'Newly approved guidance.');assert.equal(host.renderCount,0);
  h.switchIdentity();h.root.obExpertAiFeatureAuthority('human',false);assert.equal(h.root.__obAutomaticAiChatTraining,null);
  const otherOwnerRead=h.root.obExpertAiPreferenceCard();await flush();h.resolve(3,{enabled:true,mode:'fully_ai'});h.resolve(4,consent);h.resolve(5,trainingDto('Expert B starts at its own revision.',1));
  assert.equal(await otherOwnerRead,true);assert.equal(h.root.__obAutomaticAiChatTraining.revision,1);assert.equal(h.root.__obAutomaticAiChatTraining.expertInstructions,'Expert B starts at its own revision.');assert.equal(host.renderCount,1);assert.match(host.lastHtml,/Expert B starts at its own revision/);
});

test('canonical api adds HTTP metadata without changing request construction',async()=>{
  const seen=[];const root={fetch:(path,options)=>{seen.push({path,options});return Promise.resolve({ok:false,status:409,json:()=>Promise.resolve({error:'Training changed.',code:'guidance_conflict'})});},API_ROOT:'https://synthetic.invalid/api',token:()=> 'fallback',Promise,JSON,String,Object,Error};vm.createContext(root);new vm.Script(api).runInContext(root);
  const signal=new AbortController().signal;await assert.rejects(root.api('/ai/expert-chat/coach',{method:'POST',body:{mode:'teach'},token:'owned',signal}),error=>error.status===409&&error.code==='guidance_conflict'&&error.message==='Training changed.');
  assert.equal(seen[0].path,'https://synthetic.invalid/api/ai/expert-chat/coach');assert.equal(seen[0].options.headers.Authorization,'Bearer owned');assert.equal(seen[0].options.body,'{"mode":"teach"}');assert.equal(seen[0].options.signal,signal);
});
