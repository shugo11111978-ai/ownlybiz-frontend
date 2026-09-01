import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Synthetic, source-extracted regression. No browser, provider, payment, or live API.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function scriptById(id) {
  const match = html.match(new RegExp(`<script[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match, `${id} exists`);
  return match[1];
}
function section(source, start, end) {
  const left = source.indexOf(start), right = source.indexOf(end, left + start.length);
  assert(left >= 0 && right > left, `source section ${start}`);
  return source.slice(left, right);
}
const source = scriptById('ownlybiz-admin-expert-detail-correct-flow-20260526');
const listSource = section(html, '  function adminExpertsController(){', '\n  window.obSyncStripePaymentDomains');
const capacitySource = section(source, '  function liveCapacityCard(id){', '\t\t  function detailHtml(');
const decode = value => String(value).replace(/&(?:amp|lt|gt|quot|#39);/g, item => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"})[item]);
const clone = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const response = (body, status=200) => ({ok:status>=200&&status<300,status,json:async()=>clone(body)});
const flush = async () => { for(let n=0;n<4;n++) await new Promise(resolve=>setImmediate(resolve)); };

class Element {
  constructor(tag, document) {
    this.tagName=tag.toUpperCase(); this.ownerDocument=document; this.children=[]; this.parentNode=null;
    this.attributes=new Map(); this.style={}; this.dataset={}; this.listeners=new Map(); this._text=''; this._html='';
    this._value=''; this.hidden=false; this.disabled=false; this.checked=false; this.selected=false; this.innerHtmlWrites=0;
    this.classList={contains:name=>this.className.split(/\s+/).includes(name),add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(/\s+/).filter(name=>!names.includes(name)).join(' ');}};
  }
  get id(){return this.attributes.get('id')||'';} set id(value){this.setAttribute('id',value);}
  get className(){return this.attributes.get('class')||'';} set className(value){this.attributes.set('class',String(value));}
  get firstChild(){return this.children[0]||null;} get firstElementChild(){return this.firstChild;}
  get parentElement(){return this.parentNode;}
  get value(){return this._value;} set value(value){this._value=String(value??'');}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  set textContent(value){this.clear();this._text=String(value??'');}
  get innerHTML(){return this._html;}
  set innerHTML(value){this.clear();this._html=String(value);this.innerHtmlWrites++;parseMarkup(this,this._html);}
  clear(){if(this.children.some(child=>child.contains(this.ownerDocument.activeElement)))this.ownerDocument.activeElement=this.ownerDocument.body;for(const child of this.children)child.parentNode=null;this.children=[];this._text='';this._html='';}
  appendChild(child){child.parentNode=this;this.children.push(child);return child;}
  removeChild(child){this.children=this.children.filter(item=>item!==child);child.parentNode=null;return child;}
  contains(node){return this===node||this.children.some(child=>child.contains(node));}
  setAttribute(name,value){name=String(name);value=String(value);this.attributes.set(name,value);if(name==='value')this.value=decode(value);if(['hidden','disabled','checked','selected'].includes(name))this[name]=true;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;}
  getAttribute(name){return this.attributes.get(String(name))??null;}
  removeAttribute(name){this.attributes.delete(name);if(['hidden','disabled','checked','selected'].includes(name))this[name]=false;}
  addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(fn);}
  dispatchEvent(event){event.target??=this;for(const fn of this.listeners.get(event.type)||[])fn.call(this,event);}
  focus(){if(!this.disabled)this.ownerDocument.activeElement=this;}
  scrollIntoView(){}
  querySelectorAll(selector){return descendants(this).filter(node=>matches(node,selector));}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  closest(selector){for(let node=this;node;node=node.parentNode)if(matches(node,selector))return node;return null;}
}
function descendants(node){return node.children.flatMap(child=>[child,...descendants(child)]);}
function matches(node,selector){
  return selector.split(',').some(raw=>{
    const part=raw.trim(); if(part.startsWith('#'))return node.id===part.slice(1);
    if(part.startsWith('.'))return node.classList.contains(part.slice(1));
    const attr=part.match(/^\[([^=*\]]+)(?:([*]?=)["']?([^"'\]]*)["']?)?\]$/);
    if(attr){const value=node.getAttribute(attr[1]);return value!==null&&(!attr[2]||(attr[2]==='*='?value.includes(attr[3]):value===attr[3]));}
    return node.tagName.toLowerCase()===part.toLowerCase();
  });
}
function parseMarkup(parent,markup){
  const stack=[parent],voidTags=new Set(['input','br','hr','img','meta','link']);
  for(const token of markup.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g)||[]){
    if(token.startsWith('<!--'))continue;
    if(token.startsWith('</')){const name=(token.match(/^<\/\s*([^\s>]+)/)||[])[1]?.toUpperCase();for(let i=stack.length-1;i>0;i--)if(stack[i].tagName===name){stack.length=i;break;}continue;}
    if(token.startsWith('<')){
      const match=token.match(/^<\s*([\w-]+)([\s\S]*?)\/?\s*>$/);if(!match)continue;
      const element=new Element(match[1],parent.ownerDocument);
      for(const attr of match[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))element.setAttribute(attr[1],decode(attr[2]??attr[3]??attr[4]??''));
      stack.at(-1).appendChild(element);if(!voidTags.has(match[1].toLowerCase()))stack.push(element);
    }else stack.at(-1)._text+=decode(token);
  }
  for(const node of descendants(parent)){
    if(node.tagName==='TEXTAREA')node.value=node.textContent;
    if(node.tagName==='SELECT'){const option=node.children.find(child=>child.selected)||node.children[0];node.value=option?.value||'';}
  }
}
class Document {
  constructor(){this.readyState='complete';this.listeners=new Map();this.body=new Element('body',this);this.activeElement=this.body;}
  createElement(tag){return new Element(tag,this);}
  getElementById(id){return descendants(this.body).find(node=>node.id===id)||null;}
  querySelectorAll(selector){return this.body.querySelectorAll(selector);}
  querySelector(selector){return this.body.querySelector(selector);}
  addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(fn);}
}
function capacityFixture(id='expert-a',values={}){
  const human=values.human??2,ai=values.ai??3,humanCeiling=values.humanCeiling??1,aiCeiling=values.aiCeiling??1;
  const automated=values.automated??true,mode=values.mode??'enforce';
  const plan=values.plan??5,allowance=values.allowance??null,authorized=Math.max(plan,allowance??1);
  const authority=values.authority??(allowance!==null&&allowance>plan?'admin_allowance':plan>1?'verified_subscription':'starter');
  return {
    settings:{success:true,live_capacity:{phase:'atomic_admission',expert_id:id,admission_enforced:mode==='enforce',rollout_mode:mode,human_rollout_ceiling:humanCeiling,ai_rollout_ceiling:aiCeiling,stripe_order_guaranteed:true,
      human:{desired_concurrency:human,effective_concurrency:Math.min(human,authorized),plan_ceiling:plan,admin_capacity_allowance:allowance,authorized_ceiling:authorized,authorization_source:authority,revision:values.humanRevision??7},
      ai:{desired_chat_capacity:ai,effective_chat_capacity:automated?Math.min(ai,aiCeiling):0,safety_ceiling:values.safety??20,fully_automated:automated,reply_assistant_enabled:true,training_enabled:true,revision:values.aiRevision??11}}},
    rollout:{success:true,rollout:{expert_id:id,mode,scope:values.scope??'expert',scope_expert_id:id,human_ceiling:humanCeiling,ai_ceiling:aiCeiling,revision:values.rolloutRevision??13,enforcement_epoch:1,activated_at:1700000000,
      effective_mode:mode,effective_scope:'expert',effective_human_ceiling:humanCeiling,effective_ai_ceiling:aiCeiling,admission_enforced:mode==='enforce',admission_paused:mode==='paused',stripe_order_guaranteed:true,
      ceiling_editable:values.editable??true,ceiling_edit_unavailable_reason:values.reason??null,requires_idle:true,environment_limits:{human_ceiling_max:5,ai_ceiling_max:20,valid:true},
      admission_limits:{mode,shared_sessions:mode==='enforce'?null:mode==='paused'?0:1,human_chat:mode==='paused'?0:mode==='enforce'?Math.min(human,humanCeiling):1,automatic_ai_chat:mode==='enforce'&&automated?Math.min(ai,aiCeiling):0,voice_video:mode==='paused'?0:1,counts_are_free_slots:false}}},
  };
}
function createHarness({fixture=capacityFixture(),role='admin'}={}){
  const document=new Document(),panel=document.createElement('div');panel.id='admin-panel-experts';panel.className='admin-tab-panel active';document.body.appendChild(panel);
  const content=document.createElement('div');content.className='admin-content';panel.appendChild(content);
  const calls=[],notices=[],timers=new Map(),listeners=new Map();let nextTimer=0,handler=null;
  let ownerController=new AbortController(),identity={principal:'admin|one',token:'token-one',role,identityGeneration:1,credentialGeneration:1};
  const location={pathname:'/admin/experts',search:'',hash:'',href:'https://ownlybiz.test/admin/experts'};
  function historyUpdate(_state,_title,next){const url=new URL(next,location.href);Object.assign(location,{pathname:url.pathname,search:url.search,hash:url.hash,href:url.href});}
  const fixtures=new Map([['expert-a',fixture],['expert-b',capacityFixture('expert-b',{human:4,ai:5})]]);
  function defaultResponse(call){
    const path=call.url.pathname,match=path.match(/\/experts\/([^/]+)\/(.+)$/),id=match?.[1]||'expert-a',suffix=match?.[2]||'';
    const values=fixtures.get(id)||capacityFixture(id);
    if(call.method!=='GET')throw new Error(`Unexpected mutation ${call.method} ${path}`);
    if(suffix==='live-capacity')return response(values.settings);
    if(suffix==='live-capacity/rollout')return response(values.rollout);
    if(suffix==='profile')return response({user:{id,name:id==='expert-a'?'Luna synthetic':'Other synthetic',email:'synthetic@example.test',is_active:1,is_verified:1},profile:{slug:id,approval_status:'approved',subscription_plan:'pro',website_published:1},ai_chat:{enabled:1,admin_context:'Saved automatic instructions'}});
    if(suffix==='dashboard')return response({dashboard:{stats:{active_sessions:0},recent_sessions:[]}});
    if(suffix==='marketplace')return response({});
    if(suffix==='group-sessions')return response({});
    if(path.endsWith('/refund-requests'))return response({requests:[]});
    if(path.endsWith('/settings'))return response({settings:{}});
    if(path.endsWith('/experts'))return response({experts:[]});
    throw new Error(`Unapproved synthetic endpoint ${path}`);
  }
  const root={window:null,document,console,Object,Array,String,Number,Boolean,JSON,Math,Date,Promise,Error,URL,URLSearchParams,AbortController,encodeURIComponent,
    location,history:{pushState:historyUpdate,replaceState:historyUpdate},OWNLYBIZ_API_URL:'https://api.ownlybiz.test',OwnlyAPI:{},
    OB_RATE_POLICY:{first:(...values)=>values.find(value=>value!==null&&value!==undefined&&value!=='')??0},
    sessionStorage:{getItem:key=>key==='ob_t'?identity.token:null},localStorage:{getItem:()=>null},
    OB_CLIENT_CONTEXT:{capture:(scope,extra={})=>({...identity,...extra,scope,signal:ownerController.signal}),isCurrent:(captured,options)=>!!captured&&!captured.signal.aborted&&captured.principal===identity.principal&&captured.identityGeneration===identity.identityGeneration&&(!options?.exactCredential||captured.token===identity.token),register(){}},
    setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),
    addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);},
    apiBase:()=>root.OWNLYBIZ_API_URL,esc:value=>String(value??''),money:value=>`$${Number(value||0).toFixed(2)}`,renderApprovalControl:()=>'',
    toastMsg:(...args)=>notices.push(args),toastLocal:(...args)=>notices.push(args),
    fetch(url,options={}){assert.equal(new URL(url).origin,root.OWNLYBIZ_API_URL,'all requests stay inside synthetic API');const call={url:new URL(url),options,method:options.method||'GET',body:options.body?JSON.parse(options.body):null};calls.push(call);return Promise.resolve().then(()=>handler?handler(call,()=>defaultResponse(call)):defaultResponse(call));},
  };root.window=root;
  vm.createContext(root);new vm.Script(listSource,{filename:'actual-admin-list.js'}).runInContext(root);new vm.Script(source,{filename:'actual-admin-detail.js'}).runInContext(root);
  const node=name=>document.getElementById(name.startsWith('ob-')?name:`ob-admin-capacity-${name}`);
  async function open(id='expert-a'){root.obAdminOpenExpertDetail(id,id,id==='expert-a'?'Luna synthetic':'Other synthetic');await flush();}
  function edit(name,value){const field=node(name);assert(field,`${name} field rendered`);field.value=String(value);field.focus();root.obAdminCapacityChanged();}
  return {root,document,panel,content,node,calls,notices,timers,fixtures,open,edit,setHandler:next=>{handler=next;},
    changeOwner(next={}){ownerController.abort();ownerController=new AbortController();identity={...identity,principal:'admin|two',token:'token-two',identityGeneration:identity.identityGeneration+1,credentialGeneration:identity.credentialGeneration+1,...next};},
    rotate(){identity={...identity,token:'token-rotated',credentialGeneration:identity.credentialGeneration+1};},
    fireTimeouts(delay=20000){for(const [id,timer] of [...timers])if(timer.delay===delay){timers.delete(id);timer.fn();}},
    mutations:()=>calls.filter(call=>call.method!=='GET'),
  };
}

let checks=0;
async function check(name,run){await run();checks++;console.log(`ok ${checks} - ${name}`);}

await check('canonical first detail render owns one separate capacity card with authoritative values',async()=>{
  const h=createHarness();await h.open();
  assert.equal(h.document.querySelectorAll('#ob-admin-live-capacity-card').length,1,`canonical detail: ${h.content.textContent}; notices: ${JSON.stringify(h.notices)}`);
  assert.equal(h.node('human').value,'2');assert.equal(h.node('ai').value,'3');
  assert.equal(h.node('human-live').textContent,'1');assert.equal(h.node('ai-live').textContent,'1');
  assert.match(h.node('human-meta').textContent,/Saved: 2/);assert.match(h.node('ai-meta').textContent,/Saved: 3/);
  assert.equal(h.node('save').disabled,true);assert.equal(h.node('confirm-panel').hidden,true);assert.equal(h.mutations().length,0);
  assert(h.content.innerHTML.indexOf('id="ob-admin-live-capacity-card"')<h.content.innerHTML.indexOf('id="ob-admin-ai-feature-authority"'));
  assert.deepEqual(h.node('human').children.map(option=>option.value),['1','2','3','4','5']);
  assert.match(h.node('ob-admin-live-capacity-card').textContent,/not free slots/);
});

await check('unsaved preferences do not change confirmed capacity or submit requests',async()=>{
  const h=createHarness();await h.open();h.edit('human',4);h.edit('ai',6);
  assert.equal(h.node('human-live').textContent,'1');assert.equal(h.node('ai-live').textContent,'1');
  assert.match(h.node('human-meta').textContent,/Saved: 2/);assert.match(h.node('preview').textContent,/Unsaved/);
  assert.equal(h.node('save').disabled,false);assert.equal(h.node('review').disabled,true);assert.equal(h.mutations().length,0);
});

await check('admin allowance is truthful, expert-scoped, audited, confirmed, and expands only the authorized human editor',async()=>{
  const h=createHarness({fixture:capacityFixture('expert-a',{human:1,plan:1,humanCeiling:1})});await h.open();
  assert.deepEqual(h.node('human').children.map(option=>option.value),['1']);
  assert.equal(h.node('human-allowance').value,'');
  assert.match(h.node('human-meta').textContent,/Verified plan max: 1/);
  assert.match(h.node('human-meta').textContent,/Admin allowance: none/);
  assert.match(h.node('human-meta').textContent,/Authorized max: 1/);
  h.node('human-allowance').value='5';h.root.obAdminCapacityAllowanceChanged();
  assert.equal(h.node('allowance-approval').hidden,false);assert.equal(h.node('save').disabled,true);
  assert.match(h.node('allowance-summary').textContent,/Luna synthetic/);assert.match(h.node('allowance-summary').textContent,/none → 5/);
  h.node('allowance-reason').value='Approved Luna human concurrency fallback';h.root.obAdminCapacityChanged();
  assert.equal(h.node('allowance-confirm').disabled,false);h.node('allowance-confirm').checked=true;h.root.obAdminCapacityAllowanceConfirmChanged();
  assert.equal(h.node('save').disabled,false);
  h.setHandler((call,next)=>{if(call.method==='PUT'){
    h.fixtures.set('expert-a',capacityFixture('expert-a',{human:1,plan:1,allowance:5,humanRevision:8,humanCeiling:1}));return response(h.fixtures.get('expert-a').settings);
  }return next();});
  assert.equal(await h.root.obAdminCapacitySave('expert-a'),true);assert.equal(h.mutations().length,1);
  assert.deepEqual(h.mutations()[0].body,{reason:'Approved Luna human concurrency fallback',admin_human_capacity_allowance:5,expected_human_revision:7});
  assert.deepEqual(h.node('human').children.map(option=>option.value),['1','2','3','4','5']);
  assert.match(h.node('human-meta').textContent,/Verified plan max: 1/);assert.match(h.node('human-meta').textContent,/Admin allowance: 5/);assert.match(h.node('human-meta').textContent,/Authorized max: 5/);assert.match(h.node('human-meta').textContent,/Authority: admin allowance/);
  assert.doesNotMatch(JSON.stringify(h.mutations()[0].body),/stripe|payment|automatic|on.?demand|training/i);
});

await check('allowance mutations cannot save without a bounded reason and confirmation tied to the current revision and value',async()=>{
  const h=createHarness({fixture:capacityFixture('expert-a',{human:1,plan:1})});await h.open();
  h.node('human-allowance').value='5';h.root.obAdminCapacityAllowanceChanged();
  for(const reason of ['','no']){h.node('allowance-reason').value=reason;h.root.obAdminCapacityChanged();h.node('allowance-confirm').checked=true;h.root.obAdminCapacityAllowanceConfirmChanged();assert.equal(h.node('save').disabled,true);assert.equal(await h.root.obAdminCapacitySave('expert-a'),false);}
  h.node('allowance-reason').value='Approved capacity';h.root.obAdminCapacityChanged();h.node('allowance-confirm').checked=true;h.root.obAdminCapacityAllowanceConfirmChanged();assert.equal(h.node('save').disabled,false);
  h.node('human-allowance').value='4';h.root.obAdminCapacityAllowanceChanged();assert.equal(h.node('allowance-confirm').checked,false);assert.equal(h.node('save').disabled,true);assert.equal(h.mutations().length,0);
});

await check('revoking an allowance sends explicit null and safely exposes the now-authorized replacement preference',async()=>{
  const h=createHarness({fixture:capacityFixture('expert-a',{human:5,plan:1,allowance:5,humanRevision:7,humanCeiling:1})});await h.open();
  h.node('human-allowance').value='';h.root.obAdminCapacityAllowanceChanged();h.node('allowance-reason').value='Allowance no longer required';h.root.obAdminCapacityChanged();h.node('allowance-confirm').checked=true;h.root.obAdminCapacityAllowanceConfirmChanged();
  h.setHandler((call,next)=>{if(call.method==='PUT'){
    h.fixtures.set('expert-a',capacityFixture('expert-a',{human:5,plan:1,allowance:null,humanRevision:8,humanCeiling:1}));return response(h.fixtures.get('expert-a').settings);
  }return next();});
  assert.equal(await h.root.obAdminCapacitySave('expert-a'),true);
  assert.deepEqual(h.mutations()[0].body,{reason:'Allowance no longer required',admin_human_capacity_allowance:null,expected_human_revision:7});
  assert.deepEqual(h.node('human').children.map(option=>option.value),['1']);assert.equal(h.node('human').value,'1');
  assert.match(h.node('human-meta').textContent,/Saved: 5/);assert.match(h.node('human-meta').textContent,/Authorized max: 1/);
  assert.equal(h.node('save').disabled,false,'admin can explicitly replace the now-above-authority saved preference');
});

await check('human-only preference save uses its revision and no AI/assistant/payment fields',async()=>{
  const h=createHarness();await h.open();h.edit('human',4);h.setHandler((call,next)=>{
    if(call.method==='PUT'){h.fixtures.set('expert-a',capacityFixture('expert-a',{human:4,humanRevision:8}));return response(h.fixtures.get('expert-a').settings);}return next();
  });assert.equal(await h.root.obAdminCapacitySave('expert-a'),true);
  const call=h.mutations()[0];assert.equal(call.url.pathname,'/api/admin/experts/expert-a/live-capacity');
  assert.deepEqual(call.body,{reason:'admin_parallel_chat_preferences',desired_human_concurrency:4,expected_human_revision:7});
  assert.equal(h.mutations().length,1);assert.match(h.node('status').textContent,/Preferences saved/);
});

await check('AI-only save preserves flags and synchronizes shared AI entitlement revision',async()=>{
  const h=createHarness();await h.open();const assistant=h.node('ob-admin-human-reply-assistant-card');h.node('ob-admin-human-reply-enabled').checked=false;h.edit('ai',6);
  h.setHandler((call,next)=>{if(call.method==='PUT'){h.fixtures.set('expert-a',capacityFixture('expert-a',{ai:6,aiRevision:12}));return response(h.fixtures.get('expert-a').settings);}return next();});
  assert.equal(await h.root.obAdminCapacitySave('expert-a'),true);
  assert.deepEqual(h.mutations()[0].body,{reason:'admin_parallel_chat_preferences',desired_ai_chat_capacity:6,expected_ai_revision:11});
  assert.equal(h.node('ob-admin-human-reply-assistant-card'),assistant);assert.equal(assistant.getAttribute('data-ai-revision'),'12');
  assert.equal(h.node('ob-admin-human-reply-enabled').checked,false,'unsaved separate assistant choice is preserved');
});

await check('arbitrary capacity refresh cannot authorize stale assistant toggles at an external revision',async()=>{
  const h=createHarness();await h.open();const card=h.node('ob-admin-human-reply-assistant-card'),enabled=h.node('ob-admin-human-reply-enabled'),training=h.node('ob-admin-human-training-enabled');
  const external=capacityFixture('expert-a',{aiRevision:12});external.settings.live_capacity.ai.reply_assistant_enabled=false;external.settings.live_capacity.ai.training_enabled=false;h.fixtures.set('expert-a',external);
  assert.equal(await h.root.obAdminCapacityRefresh('expert-a'),true);
  assert.equal(card.getAttribute('data-ai-revision'),'11','unseen assistant changes retain the old CAS base');
  assert.equal(h.node('ob-admin-human-reply-enabled'),enabled);assert.equal(h.node('ob-admin-human-training-enabled'),training);assert.equal(enabled.checked,true);assert.equal(training.checked,true);
  h.setHandler((call,next)=>call.method==='PUT'?response({success:false,code:'live_capacity_revision_conflict',error:'Reload current authority.'},409):next());
  assert.equal(await h.root.obAdminSaveHumanReplyAssistantAccess('expert-a'),false);assert.equal(h.mutations().length,1);
  assert.equal(h.mutations()[0].body.expected_ai_revision,11);assert.equal(external.settings.live_capacity.ai.reply_assistant_enabled,false);assert.equal(external.settings.live_capacity.ai.training_enabled,false);
});

await check('human-only capacity save cannot advance separate assistant authority',async()=>{
  const h=createHarness();await h.open();h.edit('human',4);
  const external=capacityFixture('expert-a',{human:4,humanRevision:8,aiRevision:12});external.settings.live_capacity.ai.reply_assistant_enabled=false;external.settings.live_capacity.ai.training_enabled=false;
  h.setHandler((call,next)=>{if(call.method==='PUT'){h.fixtures.set('expert-a',external);return response(external.settings);}return next();});
  assert.equal(await h.root.obAdminCapacitySave('expert-a'),true);
  assert.equal(h.node('ob-admin-human-reply-assistant-card').getAttribute('data-ai-revision'),'11');assert.equal(h.node('ob-admin-human-reply-enabled').checked,true);
  assert.equal(h.mutations()[0].body.expected_ai_revision,undefined);
});

await check('late capacity acknowledgement cannot replace a newer same-owner assistant revision or draft',async()=>{
  const h=createHarness();await h.open();const wait=deferred(),card=h.node('ob-admin-human-reply-assistant-card'),enabled=h.node('ob-admin-human-reply-enabled'),training=h.node('ob-admin-human-training-enabled');
  h.edit('ai',6);h.setHandler((call,next)=>call.method==='PUT'?wait.promise:next());
  const save=h.root.obAdminCapacitySave('expert-a');await flush();
  card.setAttribute('data-ai-revision','13');enabled.checked=false;training.checked=false;
  h.fixtures.set('expert-a',capacityFixture('expert-a',{ai:6,aiRevision:13}));
  wait.resolve(response(capacityFixture('expert-a',{ai:6,aiRevision:12}).settings));assert.equal(await save,true);
  assert.equal(card.getAttribute('data-ai-revision'),'13');assert.equal(h.node('ob-admin-human-reply-enabled'),enabled);assert.equal(h.node('ob-admin-human-training-enabled'),training);assert.equal(enabled.checked,false);assert.equal(training.checked,false);
});

await check('delayed readback after own capacity save cannot rebase assistant draft onto external changes',async()=>{
  const h=createHarness();await h.open();h.edit('ai',6);const wait=deferred();let committed=false;
  h.setHandler((call,next)=>{if(call.method==='PUT'){committed=true;return response(capacityFixture('expert-a',{ai:6,aiRevision:12}).settings);}if(committed&&call.url.pathname.endsWith('/live-capacity'))return wait.promise;return next();});
  const save=h.root.obAdminCapacitySave('expert-a');await flush();
  assert.equal(h.node('ob-admin-human-reply-assistant-card').getAttribute('data-ai-revision'),'12','known own capacity write may advance its exact previous base');
  const external=capacityFixture('expert-a',{ai:6,aiRevision:13});external.settings.live_capacity.ai.reply_assistant_enabled=false;external.settings.live_capacity.ai.training_enabled=false;
  wait.resolve(response(external.settings));assert.equal(await save,true);
  assert.equal(h.node('ob-admin-human-reply-assistant-card').getAttribute('data-ai-revision'),'12');assert.equal(h.node('ob-admin-human-reply-enabled').checked,true);assert.equal(h.node('ob-admin-human-training-enabled').checked,true);
});

await check('own capacity PUT returning a later external revision cannot authorize stale assistant flags',async()=>{
  const h=createHarness();await h.open();h.edit('ai',6);
  const newer=capacityFixture('expert-a',{ai:6,aiRevision:13});newer.settings.live_capacity.ai.reply_assistant_enabled=false;newer.settings.live_capacity.ai.training_enabled=false;
  h.setHandler((call,next)=>{if(call.method==='PUT'){h.fixtures.set('expert-a',newer);return response(newer.settings);}return next();});
  assert.equal(await h.root.obAdminCapacitySave('expert-a'),true);assert.equal(h.mutations()[0].body.expected_ai_revision,11);
  assert.equal(h.node('ob-admin-human-reply-assistant-card').getAttribute('data-ai-revision'),'11','post-write read may include another writer and must not rebase unchanged flags');
  assert.equal(h.node('ob-admin-human-reply-enabled').checked,true);assert.equal(h.node('ob-admin-human-training-enabled').checked,true);
});

await check('slow combined save deduplicates clicks and retains newer focused draft without remount',async()=>{
  const h=createHarness();await h.open();const wait=deferred(),field=h.node('ai'),card=h.node('ob-admin-live-capacity-card'),writes=h.content.innerHtmlWrites;
  h.edit('human',4);h.edit('ai',6);h.setHandler((call,next)=>call.method==='PUT'?wait.promise:next());
  const saving=h.root.obAdminCapacitySave('expert-a');await flush();assert.equal(await h.root.obAdminCapacitySave('expert-a'),false);
  assert.equal(h.mutations().length,1);assert.equal(h.node('human-live').textContent,'1');h.edit('ai',7);
  h.fixtures.set('expert-a',capacityFixture('expert-a',{human:4,ai:6,humanRevision:8,aiRevision:12}));wait.resolve(response(h.fixtures.get('expert-a').settings));await saving;
  assert.equal(h.node('ai'),field);assert.equal(h.node('ob-admin-live-capacity-card'),card);assert.equal(h.content.innerHtmlWrites,writes);
  assert.equal(h.document.activeElement,field);assert.equal(field.value,'7');assert.match(h.node('ai-meta').textContent,/Saved: 6/);
  assert.deepEqual(h.mutations()[0].body,{reason:'admin_parallel_chat_preferences',desired_human_concurrency:4,expected_human_revision:7,desired_ai_chat_capacity:6,expected_ai_revision:11});
});

await check('background list loaders cannot replace the active capacity form',async()=>{
  const h=createHarness();await h.open();h.edit('human',4);const field=h.node('human'),writes=h.content.innerHtmlWrites;
  assert.equal(await h.root.obRenderAdminExpertsEnhanced(),false);assert.equal(h.node('human'),field);assert.equal(field.value,'4');assert.equal(h.content.innerHtmlWrites,writes);
});

await check('refresh preserves draft and original controls while updating confirmed values',async()=>{
  const h=createHarness();await h.open();h.edit('ai',9);const field=h.node('ai'),wait=deferred();let delayed=true;
  h.setHandler((call,next)=>call.url.pathname.endsWith('/live-capacity')&&delayed?(delayed=false,wait.promise):next());
  const refresh=h.root.obAdminCapacityRefresh('expert-a');await flush();h.edit('ai',10);wait.resolve(response(capacityFixture('expert-a',{ai:4,aiRevision:12}).settings));await refresh;
  assert.equal(h.node('ai'),field);assert.equal(field.value,'10');assert.match(h.node('ai-meta').textContent,/Saved: 4/);assert.equal(h.mutations().length,0);
});

await check('review is explicit, unchecked, named for the expert, and mutation-free',async()=>{
  const h=createHarness();await h.open();assert.equal(h.root.obAdminCapacityReview('expert-a'),true);
  assert.equal(h.node('confirm-panel').hidden,false);assert.equal(h.node('confirm').checked,false);assert.equal(h.node('apply').disabled,true);
  assert.match(h.node('confirm-summary').textContent,/Luna synthetic/);assert.match(h.node('confirm-summary').textContent,/1 → 2/);assert.match(h.node('confirm-summary').textContent,/1 → 3/);
  assert.equal(await h.root.obAdminCapacityApply('expert-a'),false);assert.equal(h.mutations().length,0);
});

await check('confirmed rollout apply is narrowly scoped and does not save preferences or enable features',async()=>{
  const h=createHarness();await h.open();h.root.obAdminCapacityReview('expert-a');h.node('confirm').checked=true;h.root.obAdminCapacityConfirmChanged();
  h.setHandler((call,next)=>{if(call.method==='PUT'){h.fixtures.set('expert-a',capacityFixture('expert-a',{humanCeiling:2,aiCeiling:3,rolloutRevision:14}));return response(h.fixtures.get('expert-a').rollout);}return next();});
  assert.equal(await h.root.obAdminCapacityApply('expert-a'),true);assert.equal(h.mutations().length,1);
  const call=h.mutations()[0];assert.equal(call.url.pathname,'/api/admin/experts/expert-a/live-capacity/rollout');
  assert.deepEqual(Object.keys(call.body).sort(),['ai_ceiling','expected_revision','human_ceiling','reason']);assert.equal(call.body.expected_revision,13);assert.equal(call.body.human_ceiling,2);assert.equal(call.body.ai_ceiling,3);
  assert.equal(h.node('human-live').textContent,'2');assert.equal(h.node('ai-live').textContent,'3');assert.equal(h.node('confirm-panel').hidden,true);
});

await check('editing or cancelling invalidates the exact reviewed rollout proposal',async()=>{
  const h=createHarness();await h.open();h.root.obAdminCapacityReview('expert-a');h.node('confirm').checked=true;h.edit('human',4);
  assert.equal(h.node('confirm-panel').hidden,true);assert.equal(h.node('confirm').checked,false);assert.equal(await h.root.obAdminCapacityApply('expert-a'),false);
  h.edit('human',2);h.root.obAdminCapacityReview('expert-a');h.root.obAdminCapacityCancelReview('expert-a');assert.equal(await h.root.obAdminCapacityApply('expert-a'),false);assert.equal(h.mutations().length,0);
});

for(const {scope,reason,mode} of [{scope:'fleet',reason:'fleet_scope'},{scope:'expert',reason:'other_expert_scope'},{scope:'expert',reason:'not_enforced',mode:'observe'},{scope:'expert',reason:'paused',mode:'paused'},{scope:'expert',reason:'emergency_pause'}]){
  await check(`${reason} cannot apply or move the current rollout`,async()=>{
    const h=createHarness({fixture:capacityFixture('expert-a',{scope,reason,mode,editable:false})});await h.open();assert.equal(h.node('review').disabled,true);assert.equal(h.root.obAdminCapacityReview('expert-a'),false);
    h.node('confirm').checked=true;assert.equal(await h.root.obAdminCapacityApply('expert-a'),false);assert.equal(h.mutations().length,0);
  });
}

await check('unavailable rollout fails closed without hiding unrelated AI settings',async()=>{
  const h=createHarness();h.setHandler((call,next)=>call.url.pathname.endsWith('/rollout')?response({error:'RAW_BACKEND_SECRET'},503):next());await h.open();
  assert.equal(h.node('human').disabled,true);assert.equal(h.node('ai').disabled,true);assert.equal(h.node('save').disabled,true);assert.equal(h.node('review').disabled,true);
  assert(h.node('ob-admin-human-reply-enabled'));assert(h.node('ob-ai-chat-enabled'));assert.doesNotMatch(h.node('status').textContent,/RAW_BACKEND_SECRET/);assert.equal(h.mutations().length,0);
});

for(const code of ['live_capacity_revision_conflict','live_capacity_expert_not_idle']){
  await check(`${code}: failed save only reads back, preserves intent, never repeats PUT`,async()=>{
    const h=createHarness();await h.open();h.edit('ai',6);h.setHandler((call,next)=>call.method==='PUT'?response({success:false,code,error:'RAW_INTERNAL_DETAIL'},409):next());
    assert.equal(await h.root.obAdminCapacitySave('expert-a'),false);assert.equal(h.mutations().length,1);assert.equal(h.node('ai').value,'6');assert.match(h.node('ai-meta').textContent,/Saved: 3/);assert.doesNotMatch(h.node('status').textContent,/RAW_INTERNAL_DETAIL/);
    assert.match(h.node('status').textContent,code.includes('idle')?/pending, active, or reserved work/:/changed elsewhere/);
    assert(h.calls.slice(h.calls.indexOf(h.mutations()[0])+1).every(call=>call.method==='GET'));
  });
}

await check('429 stops immediately, preserves draft, and requires explicit refresh',async()=>{
  const h=createHarness();await h.open();h.edit('human',4);h.setHandler((call,next)=>call.method==='PUT'?response({success:false,code:'rate_limited',error:'RAW_RATE_DETAIL'},429):next());
  const before=h.calls.length;assert.equal(await h.root.obAdminCapacitySave('expert-a'),false);assert.equal(h.calls.length,before+1);assert.equal(h.mutations().length,1);
  assert.equal(h.node('human').value,'4');assert.equal(h.node('save').disabled,true);assert.match(h.node('status').textContent,/Too many requests/);assert.doesNotMatch(h.node('status').textContent,/RAW_RATE_DETAIL/);
});

await check('lost save acknowledgement reconciles committed result with GET only',async()=>{
  const h=createHarness();await h.open();h.edit('ai',6);h.setHandler((call,next)=>{if(call.method==='PUT'){h.fixtures.set('expert-a',capacityFixture('expert-a',{ai:6,aiRevision:12}));throw new Error('lost acknowledgement');}return next();});
  assert.equal(await h.root.obAdminCapacitySave('expert-a'),false);assert.equal(h.mutations().length,1);assert.match(h.node('ai-meta').textContent,/Saved: 6/);assert.equal(h.node('ai').value,'6');
  assert.doesNotMatch(h.node('status').textContent,/not saved|no settings were changed/i);
});

await check('saved preferences survive a subsequent blocked rollout without mutation replay',async()=>{
  const h=createHarness();await h.open();h.edit('ai',6);h.setHandler((call,next)=>{if(call.method==='PUT'&&!call.url.pathname.endsWith('/rollout')){h.fixtures.set('expert-a',capacityFixture('expert-a',{ai:6,aiRevision:12}));return response(h.fixtures.get('expert-a').settings);}if(call.method==='PUT')return response({success:false,code:'live_capacity_expert_not_idle'},409);return next();});
  assert.equal(await h.root.obAdminCapacitySave('expert-a'),true);h.root.obAdminCapacityReview('expert-a');h.node('confirm').checked=true;h.root.obAdminCapacityConfirmChanged();assert.equal(await h.root.obAdminCapacityApply('expert-a'),false);
  assert.equal(h.mutations().length,2);assert.match(h.node('ai-meta').textContent,/Saved: 6/);assert.equal(h.node('ai-live').textContent,'1');assert.match(h.node('status').textContent,/pending, active, or reserved/);
});

await check('late expert A save cannot alter newly opened B fields or launch A reconciliation',async()=>{
  const h=createHarness();await h.open();const wait=deferred();h.edit('ai',6);h.setHandler((call,next)=>call.method==='PUT'?wait.promise:next());
  const save=h.root.obAdminCapacitySave('expert-a');await flush();await h.open('expert-b');const field=h.node('ai'),card=h.node('ob-admin-live-capacity-card'),count=h.calls.length;
  wait.resolve(response(capacityFixture('expert-a',{ai:6,aiRevision:12}).settings));assert.equal(await save,false);assert.equal(h.node('ai'),field);assert.equal(h.node('ob-admin-live-capacity-card'),card);assert.equal(field.value,'5');assert.equal(h.calls.length,count);
});

await check('owner and exact credential changes suppress late capacity acknowledgements',async()=>{
  for(const change of ['changeOwner','rotate']){const h=createHarness();await h.open();const wait=deferred();h.edit('ai',6);h.setHandler((call,next)=>call.method==='PUT'?wait.promise:next());const save=h.root.obAdminCapacitySave('expert-a');await flush();h[change]();const count=h.calls.length;wait.resolve(response(capacityFixture('expert-a',{ai:6,aiRevision:12}).settings));assert.equal(await save,false);assert.equal(h.calls.length,count);assert.doesNotMatch(h.node('status').textContent,/Preferences saved/);}
});

await check('Back to expert list makes an outstanding apply completion inert',async()=>{
  const h=createHarness();await h.open();const wait=deferred();h.root.obAdminCapacityReview('expert-a');h.node('confirm').checked=true;h.root.obAdminCapacityConfirmChanged();h.setHandler((call,next)=>call.method==='PUT'?wait.promise:next());
  const apply=h.root.obAdminCapacityApply('expert-a');await flush();h.root.obAdminExpertBackToList();await flush();assert(h.document.getElementById('ob-admin-experts-list'));const count=h.calls.length;
  wait.resolve(response(capacityFixture('expert-a',{humanCeiling:2,aiCeiling:3,rolloutRevision:14}).rollout));assert.equal(await apply,false);assert.equal(h.calls.length,count);assert.equal(h.node('ob-admin-live-capacity-card'),null);
});

await check('invalid or ineligible preference values cannot reach the API',async()=>{
  for(const value of ['0','-1','1.5','21','NaN']){const h=createHarness();await h.open();h.edit('ai',value);assert.equal(await h.root.obAdminCapacitySave('expert-a'),false);assert.equal(h.mutations().length,0);}
  const h=createHarness({fixture:capacityFixture('expert-a',{automated:false,ai:1})});await h.open();h.edit('ai',4);assert.equal(h.node('save').disabled,true);assert.equal(await h.root.obAdminCapacitySave('expert-a'),false);assert.equal(h.mutations().length,0);
});

await check('aborted 20-second operation releases busy state and uses readback, never replay',async()=>{
  const h=createHarness();await h.open();h.edit('human',4);h.setHandler((call,next)=>call.method==='PUT'?new Promise((_resolve,reject)=>call.options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true})):next());
  const save=h.root.obAdminCapacitySave('expert-a');await flush();h.fireTimeouts();assert.equal(await save,false);assert.equal(h.mutations().length,1);assert.equal(h.node('refresh').disabled,false);assert.equal(h.node('human').value,'4');
});

await check('malformed or cross-expert authority cannot enable either save action',async()=>{
  const corruptions=[
    fixture=>{fixture.settings.live_capacity.expert_id='expert-b';},
    fixture=>{fixture.rollout.rollout.expert_id='expert-b';},
    fixture=>{fixture.settings.live_capacity.ai.fully_automated='true';},
    fixture=>{fixture.settings.live_capacity.human.revision=0;},
    fixture=>{delete fixture.settings.live_capacity.human.admin_capacity_allowance;},
    fixture=>{fixture.settings.live_capacity.human.authorization_source='admin_allowance';},
    fixture=>{fixture.settings.live_capacity.human.authorized_ceiling=4;},
    fixture=>{fixture.rollout.rollout.environment_limits.valid='true';},
    fixture=>{delete fixture.rollout.rollout.effective_ai_ceiling;},
    fixture=>{fixture.rollout.rollout.ceiling_editable='true';},
  ];
  for(const corrupt of corruptions){const fixture=capacityFixture();corrupt(fixture);const h=createHarness({fixture});await h.open();assert.equal(h.node('save').disabled,true);assert.equal(h.node('review').disabled,true);assert.equal(h.node('human-live').textContent,'—');assert.equal(h.mutations().length,0);}
});

await check('valid but unavailable environment ceiling never opens rollout confirmation',async()=>{
  const fixture=capacityFixture();fixture.rollout.rollout.environment_limits.valid=false;
  const h=createHarness({fixture});await h.open();assert.equal(h.node('review').disabled,true);assert.equal(h.root.obAdminCapacityReview('expert-a'),false);assert.equal(h.mutations().length,0);
});

await check('a success-shaped stale preferences response cannot falsely confirm a save',async()=>{
  const h=createHarness();await h.open();h.edit('ai',6);h.setHandler((call,next)=>call.method==='PUT'?response(capacityFixture().settings):next());
  assert.equal(await h.root.obAdminCapacitySave('expert-a'),false);assert.equal(h.mutations().length,1);assert.match(h.node('ai-meta').textContent,/Saved: 3/);assert.equal(h.node('ai').value,'6');assert.doesNotMatch(h.node('status').textContent,/Preferences saved/);
});

await check('a success-shaped wrong rollout acknowledgement cannot falsely confirm applied limits',async()=>{
  const h=createHarness();await h.open();h.root.obAdminCapacityReview('expert-a');h.node('confirm').checked=true;h.root.obAdminCapacityConfirmChanged();h.setHandler((call,next)=>call.method==='PUT'?response(capacityFixture().rollout):next());
  assert.equal(await h.root.obAdminCapacityApply('expert-a'),false);assert.equal(h.mutations().length,1);assert.equal(h.node('human-live').textContent,'1');assert.equal(h.node('ai-live').textContent,'1');assert.doesNotMatch(h.node('status').textContent,/Live limits confirmed/);
});

await check('delayed initial A response cannot repaint B after navigation',async()=>{
  const h=createHarness(),wait=deferred();let held=false;h.setHandler((call,next)=>call.url.pathname==='/api/admin/experts/expert-a/live-capacity'&&!held?(held=true,wait.promise):next());
  await h.open('expert-a');await h.open('expert-b');const card=h.node('ob-admin-live-capacity-card'),field=h.node('ai'),count=h.calls.length;
  wait.resolve(response(capacityFixture().settings));await flush();assert.equal(h.node('ob-admin-live-capacity-card'),card);assert.equal(h.node('ai'),field);assert.equal(field.value,'5');assert.equal(h.calls.length,count);
});

await check('a slow initial capacity read retains the mounted detail controls',async()=>{
  const h=createHarness(),wait=deferred();h.setHandler((call,next)=>call.url.pathname.endsWith('/rollout')?wait.promise:next());await h.open();
  const card=h.node('ob-admin-live-capacity-card'),field=h.node('human'),assistant=h.node('ob-admin-human-reply-enabled');assert(card&&field&&assistant);assert.equal(field.disabled,true);const writes=h.content.innerHtmlWrites;
  wait.resolve(response(capacityFixture().rollout));await flush();assert.equal(h.node('human'),field);assert.equal(h.node('ob-admin-live-capacity-card'),card);assert.equal(h.node('ob-admin-human-reply-enabled'),assistant);assert.equal(h.content.innerHtmlWrites,writes);assert.equal(field.disabled,false);
});

await check('lost acknowledgement followed by failed readback leaves truthful unresolved state',async()=>{
  const h=createHarness();await h.open();h.edit('human',4);h.setHandler(()=>{throw new Error('synthetic offline');});
  assert.equal(await h.root.obAdminCapacitySave('expert-a'),false);assert.equal(h.mutations().length,1);assert.equal(h.node('save').disabled,true);assert.equal(h.node('review').disabled,true);assert.equal(h.node('human').value,'4');assert.match(h.node('status').textContent,/could not be loaded|could not be confirmed/);assert.doesNotMatch(h.node('status').textContent,/Preferences saved|Live limits confirmed/);
});

await check('non-admin identity never loads or mutates private capacity',async()=>{
  const h=createHarness({role:'expert'});await h.open();assert.equal(h.calls.length,0);assert.equal(h.node('ob-admin-live-capacity-card'),null);assert.equal(await h.root.obAdminCapacitySave('expert-a'),false);
});

await check('backend-provided expert names are escaped in the full detail render',async()=>{
  const h=createHarness();h.setHandler((call,next)=>call.url.pathname.endsWith('/profile')?response({user:{id:'expert-a',name:'<img src=x onerror=bad()>',is_active:1},profile:{},ai_chat:{enabled:1}}):next());await h.open();
  assert.match(h.content.innerHTML,/&lt;img src=x onerror=bad\(\)&gt;/);assert.equal(h.content.querySelectorAll('img').length,0);assert(h.node('ob-admin-live-capacity-card'));
});

await check('new capacity controls remain isolated from global rollout and unrelated mutations',async()=>{
  assert.doesNotMatch(capacitySource,/\/admin\/settings|\/ai-chat|\/stripe|\/payments|\/refund|\/sessions\/[^']|\/on-demand|\/training|\/coach/);
  assert.doesNotMatch(capacitySource,/body\.(?:reply_assistant_enabled|training_enabled|mode|scope|reset|scope_expert_id)\s*=/);
  assert.match(capacitySource,/expected_human_revision/);assert.match(capacitySource,/expected_ai_revision/);
  assert.match(capacitySource,/counts|not free slots/);assert.match(capacitySource,/aria-live="polite"/);
});

console.log(`Admin live capacity UI: ${checks} source-extracted checks passed.`);
