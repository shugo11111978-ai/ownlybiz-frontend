import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { Script } from 'node:vm';

// Current production-source UI, with an isolated HTTP mock and synthetic data.
// Persistence is only in this local process, so a browser refresh tests history.
const sourceUrl=new URL('../index.html',import.meta.url);
function buildPage(){
  const source=readFileSync(sourceUrl,'utf8');
  function between(start,end){const left=source.indexOf(start),right=source.indexOf(end,left+start.length);assert(left>=0&&right>left,`${start} remains extractable`);return source.slice(left,right);}
  const apiEnd=source.indexOf('  function statusLabel(user, profile){');
  const functions=[
    between('  function addStyle(){\n    if(document.getElementById(\'ob-credit-style-v1\')) return;','  function hideLegacyPackageSurfaces(){'),
    source.slice(source.lastIndexOf('  function api(path, opts){',apiEnd),apiEnd),
    between('  function safe(v){ return String(v == null ?','  function attr(v){ return safe(v)'),
    between('  function automaticChatConsentState(data){','  window.obReplyAssistantAutomationGateText = replyAssistantAutomationGateText;'),
    between('  var expertAiFeatureAuthority =','  window.obExpertAiSettingsTab = function(tab){'),
    between('\twindow.obAutomaticAiChatTrainingDirty = function(field){','\t  window.obExpertAiToggle = function(enabled){'),
  ].join('\n');
  new Script(functions,{filename:'extracted-automatic-ai-coach.js'});
  const styles=[...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match=>match[1]).join('\n');
  const fingerprint=createHash('sha256').update(functions).digest('hex').slice(0,16);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ownlybiz local Automatic AI trainer QA</title><style>${styles}</style><style>
  body.ownly-ready{opacity:1!important;background:#f4eee4!important;color:#291d18!important;padding:20px!important;overflow:auto!important;font:14px/1.5 system-ui!important}
  .qa-shell{max-width:1000px;margin:auto;min-width:0}.qa-controls{background:white;border:1px solid #dccfc0;border-radius:14px;padding:18px;margin-bottom:20px;font:13px/1.6 system-ui;color:#291d18}.qa-controls h1{font:700 23px/1.3 system-ui;margin:0 0 8px}.qa-controls p{margin:6px 0}.qa-buttons{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.qa-buttons button,.qa-buttons select{padding:9px;border-radius:9px;border:1px solid #d6c6b6;background:#fff9ef;color:#291d18;font:600 12px system-ui}.qa-controls pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.5 ui-monospace}.qa-controls #qa-errors{color:#b91c1c}
  #view-3{display:block!important;height:auto!important;margin:0!important;overflow:visible!important}#view-3 .dashboard-layout{display:block!important;height:auto!important}#view-3 .db-main,#view-3 .db-content{width:100%!important;margin:0!important;padding:0!important;overflow:visible!important}#ob-expert-ai-settings-host{min-width:0}#ob-expert-ai-settings-host .db-card{width:100%;box-sizing:border-box}
  body.ob-ui-dark{background:#17120f!important}body.ob-ui-dark .qa-controls{background:#211c18;color:#faf0e5;border-color:#625347}body.ob-ui-dark .qa-buttons button{background:#34271f;color:#faf0e5}
  [hidden]{display:none!important}@media(max-width:600px){body.ownly-ready{padding:10px!important}.qa-controls{padding:13px}.qa-controls h1{font-size:19px}#ob-automatic-ai-coach{padding:12px!important}}
  </style></head><body class="ownly-ready"><main class="qa-shell"><section class="qa-controls"><h1>Automatic AI Chat · local trainer QA</h1><p>Production UI functions extracted from the current source. All replies, accounts, history and approvals below are synthetic. No production API, provider, payment, or WebSocket connection is permitted.</p><div class="qa-buttons"><button id="qa-delay" onclick="control('delay')">Delay next reply (8s)</button><button id="qa-conflict" onclick="control('conflict')">Conflict next message</button><button id="qa-busy" onclick="control('busy')">Block lesson: live session</button><button id="qa-unblock" onclick="control('unblock')">Allow lesson saves</button><button id="qa-training-conflict" onclick="control('training-conflict')">Change server guidance</button><button id="qa-switch-owner" onclick="switchOwner()">Switch synthetic expert</button><button id="qa-feature-off" onclick="control('disable')">Disable Automatic Chat</button><button id="qa-feature-on" onclick="control('enable')">Enable Automatic Chat</button><button id="qa-theme" onclick="document.body.classList.toggle('qa-dark')">Light / dark theme</button><button id="qa-reset" onclick="control('reset')">Reset synthetic fixture</button></div><pre id="qa-status" role="status"></pre><pre id="qa-errors" role="alert"></pre><p>Source fingerprint <code>${fingerprint}</code>. Browser refresh keeps synthetic saved conversations; unsent text is not persisted.</p></section><div id="sblock-ai"><div id="ob-expert-ai-settings-host"></div></div></main><script>
  'use strict';
  var API_ROOT='/mock-api';var identity={token:'synthetic-local-a',principal:'expert:a',role:'expert',identityGeneration:1,credentialGeneration:1,signal:new AbortController().signal};var lifecycle=null;
  function token(){return identity.token;}function hasExpertAuth(){return true;}function notify(message){document.getElementById('qa-status').textContent=message;}function attr(value){return safe(value);}function replyAssistantAutomationEffective(){return true;}function replyAssistantAutomationGateText(){return 'All synthetic checks passed.';}
  window.WebSocket=function(){throw new Error('WebSockets are disabled in this local fixture');};
  window.OB_CLIENT_CONTEXT={capture:function(scope){return Object.assign({},identity,{scope:scope});},isCurrent:function(owner){return !!owner&&owner.token===identity.token&&owner.principal===identity.principal&&owner.identityGeneration===identity.identityGeneration;},register:function(_name,handlers){lifecycle=handlers;}};
  window.addEventListener('error',function(event){document.getElementById('qa-errors').textContent+=event.message+'\\n';});window.addEventListener('unhandledrejection',function(event){document.getElementById('qa-errors').textContent+=String(event.reason)+'\\n';});
  ${functions}
  addStyle();
  var fixtureHost=document.getElementById('sblock-ai');var dashboard=document.createElement('div');dashboard.id='view-3';dashboard.className='view-panel active';dashboard.innerHTML='<div class="dashboard-layout"><main class="db-main"><div class="db-content"></div></main></div>';fixtureHost.replaceWith(dashboard);dashboard.querySelector('.db-content').appendChild(fixtureHost);fixtureHost.className='settings-block';document.body.classList.add('ob-ui-light');
  document.getElementById('qa-theme').onclick=function(){var dark=document.body.classList.toggle('ob-ui-dark');document.body.classList.toggle('ob-ui-light',!dark);};
  document.getElementById('qa-theme').insertAdjacentHTML('afterend','<button id="qa-narrow" type="button">Narrow 390px</button><button id="qa-wide" type="button">Wide</button>');
  document.getElementById('qa-narrow').onclick=function(){dashboard.style.width='390px';dashboard.style.maxWidth='100%';notify('Trainer container constrained to 390px. The outer QA controls remain wide.');};
  document.getElementById('qa-wide').onclick=function(){dashboard.style.width='100%';dashboard.style.maxWidth='100%';notify('Trainer container restored to wide layout.');};
  document.getElementById('qa-delay').insertAdjacentHTML('afterend','<button id="qa-delay-long" type="button" onclick="control(&quot;delay-long&quot;)">Delay next reply (30s)</button><button id="qa-drop-reply" type="button" onclick="control(&quot;drop-reply&quot;)">Lose next reply response</button><button id="qa-drop-create" type="button" onclick="control(&quot;drop-create&quot;)">Lose next new-conversation response</button><button id="qa-fail-reply" type="button" onclick="control(&quot;fail-reply&quot;)">Fail next reply</button><button id="qa-body-focus" type="button">Move focus outside trainer</button>');
  document.getElementById('qa-status').insertAdjacentHTML('afterend','<pre id="qa-lifecycle" role="status"></pre>');
  document.getElementById('qa-body-focus').insertAdjacentHTML('afterend','<button id="qa-focus-message" type="button">Focus message field (QA only)</button>');
  document.getElementById('qa-body-focus').onclick=function(){document.body.tabIndex=-1;document.body.focus();notify('Focus is outside the trainer. Its controls and transcript should still remain mounted.');};
  var lifecycleInput=null,lifecycleChanges=0,lifecycleTick=0;
  function showLifecycle(){var input=document.getElementById('ob-automatic-ai-coach-input');if(input&&lifecycleInput&&input!==lifecycleInput)lifecycleChanges++;if(input)lifecycleInput=input;lifecycleTick++;var active=document.activeElement,style=input&&getComputedStyle(input),rect=input&&input.getBoundingClientRect();document.getElementById('qa-lifecycle').textContent='Lifecycle check '+lifecycleTick+' · composer replacements '+lifecycleChanges+' · activeElement '+(active?(active.tagName+'#'+(active.id||'(no id)')):'none')+' · pending '+!!(automaticChatCoachState&&automaticChatCoachState.pending)+' · loading '+!!(automaticChatCoachState&&automaticChatCoachState.loading)+'\\nComposer present '+!!input+(input?' · readOnly '+input.readOnly+' · disabled '+input.disabled+' · tabIndex '+input.tabIndex+' · hidden '+input.hidden+' · display '+style.display+' · visibility '+style.visibility+' · pointerEvents '+style.pointerEvents+' · size '+Math.round(rect.width)+'×'+Math.round(rect.height):'');}
  document.getElementById('qa-focus-message').onclick=function(){var input=document.getElementById('ob-automatic-ai-coach-input');if(input){input.focus();notify('QA only: focused the real message field. Nothing was filled or submitted.');}else notify('The trainer message field is not mounted.');showLifecycle();};
  document.addEventListener('focusin',showLifecycle);document.addEventListener('focusout',function(){setTimeout(showLifecycle,0);});setInterval(showLifecycle,1000);
  window.obExpertAiToggle=function(){notify('Live automation toggles are outside this isolated trainer fixture.');};window.obExpertAiConsentToggle=window.obExpertAiToggle;window.obExpertAiAutoAcceptToggle=window.obExpertAiToggle;
  async function control(action){var response=await fetch('/qa/control',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+identity.token},body:JSON.stringify({action:action})});var result=await response.json();notify(result.message);if(['reset','disable','enable'].includes(action)){clearAutomaticChatCoach();await loadExpertAiFeatureAuthority(true);await expertAiPreferenceCard();}}
  async function switchOwner(){if(lifecycle)lifecycle.teardown();identity={token:identity.token==='synthetic-local-a'?'synthetic-local-b':'synthetic-local-a',principal:identity.principal==='expert:a'?'expert:b':'expert:a',role:'expert',identityGeneration:identity.identityGeneration+1,credentialGeneration:1,signal:new AbortController().signal};notify('Current synthetic owner: '+identity.principal);await loadExpertAiFeatureAuthority(true);await expertAiPreferenceCard();}
  loadExpertAiFeatureAuthority(true).then(expertAiPreferenceCard);setInterval(function(){expertAiPreferenceCard();},3500);
  window.__automaticCoachQa={sourceFingerprint:'${fingerprint}',switchOwner:switchOwner,control:control};
  </script></body></html>`;
}

const stores=new Map();
function seed(){return {enabled:true,delay:0,dropReply:false,dropCreate:false,failReply:false,conflict:false,busy:false,training:{success:true,available:true,revision:4,admin_guidance:'Offer warm, intuitive spiritual guidance without certainty or professional claims.',expert_instructions:'Keep context within this conversation. Do not ask again for information already provided.',learning:{source:'completed automatic sessions',event_count:1,updated_at:1788163200,principles:[{id:'context_continuity',guidance:'Respond to the latest message while retaining earlier details.'}],recent_events:[]}},conversations:new Map([['qa-teach-1',{id:'qa-teach-1',mode:'teach',revision:2,created_at:1788163200,updated_at:1788163200,turns:[{id:'qa-turn-1',status:'complete',input_text:'I want warmer and more spiritual responses, and it must remember a birth date.',reply:'Let’s make the voice warmer while retaining the details already shared. For example: “I hear that this connection matters to you. Since you mentioned 30 January, we can use Aquarius as a reflective lens while we explore what you need.” Would you prefer brief replies or fuller reflections?',proposed_lessons:['When a birth date has already been shared in the current conversation, use it instead of asking again.','Use warm, personally responsive spiritual language without presenting intuition as certainty.'],training_revision:4,created_at:1788163200,approved:false}]}]])};}
function storeFor(request){const token=String(request.headers.authorization||'');if(!['Bearer synthetic-local-a','Bearer synthetic-local-b'].includes(token))return null;if(!stores.has(token))stores.set(token,seed());return stores.get(token);}
const clone=value=>JSON.parse(JSON.stringify(value));
function send(response,status,data){response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end(JSON.stringify(data));}
async function body(request){let raw='';for await(const chunk of request){raw+=chunk;if(raw.length>100000)throw new Error('oversized');}return raw?JSON.parse(raw):{};}
function dto(store,conversation){const data=clone(conversation);data.turns.forEach(turn=>{turn.approved=turn.proposed_lessons.length>0&&turn.proposed_lessons.every(rule=>store.training.expert_instructions.includes(rule));});return data;}
async function route(request,response){
  if(request.method==='GET'&&request.url==='/'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; font-src 'none'; form-action 'none'; base-uri 'none'"});response.end(buildPage());return;}
  const store=storeFor(request);if(!store){send(response,401,{error:'Synthetic local credential required.'});return;}
  const input=await body(request),path=request.url;
  if(path==='/qa/control'&&request.method==='POST'){
    if(input.action==='reset')stores.set(String(request.headers.authorization),seed());
    if(input.action==='delay')store.delay=8000;if(input.action==='conflict')store.conflict=true;if(input.action==='busy')store.busy=true;if(input.action==='unblock')store.busy=false;if(input.action==='disable')store.enabled=false;if(input.action==='enable')store.enabled=true;
    if(input.action==='delay-long')store.delay=30000;if(input.action==='drop-reply')store.dropReply=true;if(input.action==='drop-create')store.dropCreate=true;if(input.action==='fail-reply')store.failReply=true;
    if(input.action==='training-conflict'){store.training.revision++;store.training.expert_instructions+='\nA newer synthetic guidance update must be preserved.';}
    send(response,200,{message:'Synthetic control applied: '+input.action});return;
  }
  if(path==='/mock-api/ai/features'){send(response,200,{success:true,features:{automatic_ai_chat:{visible:store.enabled},human_reply_assistant:{visible:false}}});return;}
  if(!store.enabled){send(response,404,{error:'Automatic AI Chat is not enabled for this expert.',code:'automatic_ai_chat_unavailable'});return;}
  if(path==='/mock-api/ai/expert-chat/status'){send(response,200,{enabled:true,mode:'fully_ai',auto_accept_chat_available:true,auto_accept_chat_requests:true,auto_accept_chat_effective:true,purpose_profile:'luna_spiritual_guide',context_message_limit:100});return;}
  if(path==='/mock-api/ai/expert-chat/consent'){send(response,200,{consent:{accepted:true,revision:1,document_version:'synthetic-v1',current_document_version:'synthetic-v1'}});return;}
  if(path==='/mock-api/ai/expert-chat/training'){
    if(request.method==='PUT'){if(input.expected_revision!==store.training.revision){send(response,409,{error:'Training changed.',code:'automatic_ai_chat_training_conflict'});return;}store.training.expert_instructions=String(input.expert_instructions||'');store.training.revision++;}
    send(response,200,store.training);return;
  }
  const base='/mock-api/ai/expert-chat/coach';
  if(path===base&&request.method==='GET'){send(response,200,{success:true,conversations:[...store.conversations.values()].reverse().slice(0,200).map(({turns,...row})=>row)});return;}
  if(path===base&&request.method==='POST'){const now=Math.floor(Date.now()/1000),conversation={id:randomUUID(),mode:input.mode,revision:1,created_at:now,updated_at:now,turns:[]};store.conversations.set(conversation.id,conversation);if(store.dropCreate){store.dropCreate=false;return;}send(response,200,{success:true,conversation:dto(store,conversation)});return;}
  const match=path.match(/^\/mock-api\/ai\/expert-chat\/coach\/([A-Za-z0-9_-]+)(?:\/(messages|approve))?$/),conversation=match&&store.conversations.get(match[1]);
  if(!conversation){send(response,404,{error:'Synthetic conversation was not found.',code:'automatic_ai_chat_coach_not_found'});return;}
  if(!match[2]&&request.method==='GET'){send(response,200,{success:true,conversation:dto(store,conversation)});return;}
  if(match[2]==='messages'&&request.method==='POST'){
    if(conversation.turns.some(turn=>turn.request_id===input.request_id)){send(response,200,{success:true,conversation:dto(store,conversation)});return;}
    if(store.conflict){store.conflict=false;conversation.revision++;send(response,409,{error:'Conversation changed. Refresh and retry.',code:'automatic_ai_chat_coach_revision_conflict'});return;}
    if(input.expected_revision!==conversation.revision){send(response,409,{error:'Conversation changed. Refresh and retry.',code:'automatic_ai_chat_coach_revision_conflict'});return;}
    const turn={id:randomUUID(),request_id:input.request_id,status:'pending',input_text:String(input.content||''),reply:'',proposed_lessons:[],training_revision:store.training.revision,created_at:Math.floor(Date.now()/1000)};conversation.turns.push(turn);conversation.revision++;
    const delay=store.delay,dropReply=store.dropReply,failReply=store.failReply;store.delay=0;store.dropReply=false;store.failReply=false;await new Promise(resolve=>setTimeout(resolve,delay||450));
    if(failReply){turn.status='failed';turn.error='Synthetic generation failed. The conversation is preserved.';conversation.revision++;send(response,503,{error:turn.error,code:'automatic_ai_chat_coach_generation_failed'});return;}
    turn.status='complete';turn.reply=conversation.mode==='teach'?'I understand the coaching: “'+turn.input_text+'”. Here is a possible style: “I’m here with you. Let’s build on what you’ve already shared, gently and one step at a time.” Would you like this response to be shorter or more reflective?':'In this fictional conversation, I’m keeping what you shared in view. '+(conversation.turns.length>1?'You previously said: “'+conversation.turns[0].input_text+'”. ':'')+'What feels most important for us to explore next?';
    if(conversation.mode==='teach')turn.proposed_lessons=['Acknowledge the client’s latest concern naturally and retain relevant details shared earlier in the current conversation.'];conversation.revision++;conversation.updated_at=Math.floor(Date.now()/1000);if(dropReply)return;send(response,200,{success:true,conversation:dto(store,conversation)});return;
  }
  if(match[2]==='approve'&&request.method==='POST'){
    if(store.busy){send(response,409,{error:'Your lesson is saved here. Apply it after this expert’s live sessions end.',code:'automatic_ai_chat_training_busy'});return;}
    if(input.expected_training_revision!==store.training.revision){send(response,409,{error:'Training changed in another update.',code:'automatic_ai_chat_training_conflict'});return;}
    const turn=conversation.turns.find(turn=>turn.id===input.turn_id);if(!turn||turn.status!=='complete'||!turn.proposed_lessons.length){send(response,400,{error:'No reusable lesson proposal exists.'});return;}
    const fresh=turn.proposed_lessons.filter(rule=>!store.training.expert_instructions.includes(rule)),next=store.training.expert_instructions+(fresh.length?'\n\nApproved coaching lessons:\n'+fresh.map(rule=>'- '+rule).join('\n'):'');
    if(Array.from(next).length>6000){send(response,400,{error:'Keep saved instructions within 6,000 characters.',code:'automatic_ai_chat_training_limit'});return;}if(fresh.length){store.training.expert_instructions=next;store.training.revision++;}
    send(response,200,{success:true,training:store.training,conversation:dto(store,conversation)});return;
  }
  send(response,404,{error:'Not found.'});
}

if(process.argv.includes('--check')){
  const html=buildPage();for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new Script(match[1]);console.log('Automatic AI coach visual fixture source extraction and script syntax: PASS');
}else{
  const server=createServer((request,response)=>{route(request,response).catch(()=>send(response,500,{error:'Synthetic fixture request failed.'}));});
  server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+server.address().port+'/',mode:'synthetic-local-only',persistence:'local-server-memory'})));
}
