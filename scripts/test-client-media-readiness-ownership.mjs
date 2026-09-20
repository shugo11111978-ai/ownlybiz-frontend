import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import vm from 'node:vm';

// Exact application source with deferred native-media doubles. No network,
// browser, auth injection into a real app, or session/provider operation.
const baseline = '038d24ec05cd3e9244bb0769b2c262a7d7d3c633';
const red = process.argv.includes('--baseline');
const html = red ? execFileSync('git', ['show', baseline + ':index.html'], {cwd:new URL('..', import.meta.url), encoding:'utf8', maxBuffer:20_000_000}) : readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const a = html.indexOf('  function stopOwnedPrewarmStream(stream){'), b = html.indexOf('  function handleBillingReturnNotice(){', a);
assert(a > 0 && b > a);
const mediaSource = html.slice(a, b);
function stream(kinds = ['audio'], suppliedTracks) {
  const tracks = suppliedTracks || kinds.map(kind => ({kind, readyState:'live', enabled:true, stops:0, stop(){this.stops++;this.readyState='ended';}}));
  return {getTracks:()=>tracks, getAudioTracks:()=>tracks.filter(t=>t.kind==='audio'), getVideoTracks:()=>tracks.filter(t=>t.kind==='video')};
}
function classes(active = false) { const values = new Set(active ? ['active'] : []); return {contains:n=>values.has(n), add:n=>values.add(n), remove:n=>values.delete(n)}; }
function visibleNode(){return {isConnected:true,hidden:false,style:{display:'block',visibility:'visible',opacity:'1'},parentElement:null,getBoundingClientRect:()=>({width:390,height:400}),getClientRects:()=>[{}]};}
function harness() {
  const nodes = new Map(), timers = [], requests = [], clears = [], registrations = [], prewarms = new Map(), teardowns = [];
  let generation = 1, credential = 1, role = 'client', authority = true, rtcActive = false, originalStarts = 0;
  const view = {...visibleNode(),classList:classes(true)}, screen = {...visibleNode(),classList:classes(true),parentElement:view};
  nodes.set('view-5', view); nodes.set('screen-PRESESS', screen);
  function card(channel) {
    const id = 'ob-client-media-ready-presess', button = {disabled:false,textContent:'Enable before session',style:{}}, status = {textContent:channel==='voice'?'Enable your microphone before joining.':'Enable your camera and microphone before joining.',style:{}};
    const c = {...visibleNode(),parentElement:screen,id,channel,button,status,getAttribute(name){return name==='data-ob-media-channel'?this.channel:null;},querySelector:()=>button,remove(){this.isConnected=false;if(nodes.get(id)===this){nodes.delete(id);nodes.delete(id+'-status');}}};
    nodes.set(id,c);nodes.set(id+'-status',status);return c;
  }
  const begin = {insertAdjacentHTML(position, markup){assert.equal(position,'beforebegin');const ch=markup.match(/data-ob-media-channel="([^"]+)"/)[1];card(ch);}};
  nodes.set('presess-begin-btn',begin);
  const document = {getElementById:id=>nodes.get(id)||null};
  const context = {document,location:{pathname:'/book',search:'?expert=qa-reader'},console,
    selectedChannel:{id:'voice'},_currentExpert:{id:'expert-a'},_currentExpertId:'expert-a',
    _obClientMediaReadyStream:null,_obRtcPrewarmedStream:null,_obExpertMediaReadyStream:null,_obClientMediaReadyChannel:'',
    esc:v=>String(v),setTimeout:fn=>{timers.push(fn);},getComputedStyle:node=>node.style,
    _startSessionScreen(){originalStarts++;return 'original-start';},phoneGo(id){screen.classList.remove('active');if(id==='PRESESS')screen.classList.add('active');return 'original-phone';},
    OB_RTC:{isActive:()=>rtcActive},
    OB_CLIENT_CONTEXT:{capture:()=>authority?{identityGeneration:generation,role,token:'offline-token-'+credential}:null,isCurrent:o=>authority&&o.identityGeneration===generation&&o.role===role,register:(_name,handler)=>teardowns.push(handler)},
    navigator:{mediaDevices:{getUserMedia(constraints){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});requests.push({constraints,resolve,reject});return promise;}}},
    ExpertSfuClient:{setPrewarmedStream(which,value,channel){registrations.push({which,value,channel});prewarms.set(which,value);return true;},clearPrewarmedStream(which,expected){clears.push({which,expected});const owned=prewarms.get(which);if(owned&&(!expected||owned===expected)){prewarms.delete(which);owned.getTracks().forEach(t=>{if(t.readyState!=='ended')t.stop();});}return !!owned;}}
  };
  context.window=context;vm.createContext(context);vm.runInContext(mediaSource,context);
  function flush(){while(timers.length)timers.shift()();}
  function launch(channel='voice'){context.selectedChannel={id:channel};view.classList.add('active');screen.classList.add('active');assert.equal(context._startSessionScreen(),'original-start');assert.equal(context.phoneGo('PRESESS'),'original-phone');flush();return nodes.get('ob-client-media-ready-presess');}
  function install(value,channel='voice'){context._obClientMediaReadyStream=value;context._obRtcPrewarmedStream=value;context._obClientMediaReadyChannel=channel;prewarms.set('client',value);}
  return {context,document,nodes,view,screen,requests,clears,registrations,prewarms,launch,flush,install,
    current:()=>nodes.get('ob-client-media-ready-presess'),enable:()=>context.obEnableClientMedia('ob-client-media-ready-presess'),
    cancel(){view.classList.remove('active');},setRtc:state=>{rtcActive=state;},
    setAuthority:state=>{authority=state;},setRole:value=>{role=value;},
    logout(){const previous={role};generation++;for(const h of teardowns)h.teardown(previous);},
    rotateCredential(){credential++;},get originalStarts(){return originalStarts;}};
}

test('renderer reconciles both channel directions; same-channel callbacks are idempotent; chat removes UI only', () => {
  const h=harness(),voice=h.launch('voice'),old=stream();h.install(old);
  h.context.renderPresessionMedia();assert.equal(h.current(),voice);
  const video=h.launch('video');assert.notEqual(video,voice);assert.equal(video.channel,'video');assert.equal(video.button.disabled,false);
  h.context.renderPresessionMedia();assert.equal(h.current(),video);
  assert.equal(old.getTracks()[0].stops,0);assert.equal(h.clears.length,0);
  const nextVoice=h.launch('voice');assert.notEqual(nextVoice,video);assert.equal(nextVoice.channel,'voice');
  h.launch('chat');assert.equal(h.current(),undefined);assert.equal(old.getTracks()[0].stops,0);assert.equal(h.clears.length,0);
});
for(const channel of ['voice','video']) test(`${channel}: normal Enable publishes exact native stream and preserves success UI`, async () => {
  const h=harness(),card=h.launch(channel),old=stream();h.install(old,'voice');
  const result=h.enable(),value=stream(channel==='video'?['audio','video']:['audio']);
  assert.deepEqual(JSON.parse(JSON.stringify(h.requests[0].constraints)),{audio:true,video:channel==='video'});
  h.context.renderPresessionMedia();assert.equal(h.current(),card,'pending card is not replaced by renderer');
  h.requests[0].resolve(value);assert.equal(await result,true);
  assert.equal(h.context._obClientMediaReadyStream,value);assert.equal(h.context._obClientMediaReadyChannel,channel);assert.equal(old.getTracks()[0].stops,1);
  assert.equal(card.button.textContent,'Enabled');assert.equal(card.button.disabled,true);assert.equal(h.registrations.length,1);
  h.context.renderPresessionMedia();assert.equal(h.current(),card,'live matching ready UI is preserved');
});
test('same-channel dead/disabled/mismatched ready stream resets only presentation', () => {
  for(const kind of ['missing','ended','disabled','wrong-channel','missing-video']) {
    const h=harness(),card=h.launch('video'),value=stream(kind==='missing-video'?['audio']:['audio','video']);h.install(value,kind==='wrong-channel'?'voice':'video');
    if(kind==='missing')h.context._obClientMediaReadyStream=null;
    if(kind==='ended')value.getTracks()[1].readyState='ended';
    if(kind==='disabled')value.getTracks()[1].enabled=false;
    card.button.disabled=true;card.button.textContent='Enabled';h.context.renderPresessionMedia();
    assert.notEqual(h.current(),card,kind);assert.equal(h.current().button.disabled,false);assert.equal(h.clears.length,0);assert(value.getTracks().every(t=>t.stops===0));
  }
});
for(const order of ['old-first','new-first']) test(`same-card concurrent Enable is latest-attempt-wins: ${order}`, async () => {
  const h=harness(),card=h.launch('video'),a=h.enable(),b=h.enable(),old=stream(['audio','video']),fresh=stream(['audio','video']);
  if(order==='old-first'){h.requests[0].resolve(old);assert.equal(await a,false);assert.equal(h.context._obClientMediaReadyStream,null);h.requests[1].resolve(fresh);assert.equal(await b,true);}
  else{h.requests[1].resolve(fresh);assert.equal(await b,true);h.requests[0].resolve(old);assert.equal(await a,false);}
  assert.equal(h.context._obClientMediaReadyStream,fresh);assert.equal(h.registrations.length,1);assert.equal(card.button.textContent,'Enabled');
  assert(old.getTracks().every(t=>t.stops===1));assert(fresh.getTracks().every(t=>t.stops===0));
});
test('rejected older same-card request cannot overwrite newer success', async () => {
  const h=harness(),card=h.launch(),a=h.enable(),b=h.enable(),fresh=stream();h.requests[1].resolve(fresh);assert.equal(await b,true);
  const copy=card.status.textContent;h.requests[0].reject(new Error('old denial'));assert.equal(await a,false);assert.equal(card.status.textContent,copy);assert.equal(card.button.textContent,'Enabled');assert.equal(fresh.getTracks()[0].stops,0);
});
test('deferred old channel success after new success cannot clear new media or ready UI', async () => {
  const h=harness(),oldCard=h.launch('voice'),a=h.enable();h.cancel();const video=h.launch('video'),b=h.enable(),fresh=stream(['audio','video']),old=stream();
  h.requests[1].resolve(fresh);assert.equal(await b,true);const clearCount=h.clears.length;
  h.requests[0].resolve(old);assert.equal(await a,false);assert.equal(h.clears.length,clearCount);assert.equal(h.context._obClientMediaReadyStream,fresh);assert.equal(video.button.textContent,'Enabled');assert.notEqual(oldCard,video);assert(old.getTracks().every(t=>t.stops===1));assert(fresh.getTracks().every(t=>t.stops===0));
});
test('Cancel-only late success is discarded without shared-media replacement', async () => {
  const h=harness();h.launch();const existing=stream();h.install(existing);const p=h.enable(),value=stream();h.cancel();h.requests[0].resolve(value);assert.equal(await p,false);assert.equal(h.context._obClientMediaReadyStream,existing);assert.equal(existing.getTracks()[0].stops,0);assert.equal(value.getTracks()[0].stops,1);assert.equal(h.clears.length,0);
});
for(const path of ['same-channel','channel-and-back']) test(`new prep generation rejects old result after Cancel→${path}`, async () => {
  const h=harness();h.launch();const p=h.enable(),value=stream();h.cancel();if(path==='channel-and-back')h.launch('video');h.launch('voice');
  h.requests[0].resolve(value);assert.equal(await p,false);assert.equal(h.context._obClientMediaReadyStream,null);assert.equal(value.getTracks()[0].stops,1);assert.equal(h.current().button.disabled,false);
});
for(const change of ['logout','expert','route','document','channel','view','screen','pending','active','rtc']) test(`pending Enable rejects changed ${change} ownership`, async () => {
  const h=harness(),card=h.launch(),p=h.enable(),value=stream();
  if(change==='logout')h.logout();if(change==='expert')h.context._currentExpert={id:'expert-b'};if(change==='route')h.context.location.pathname='/about';if(change==='document')h.context.document={getElementById:h.document.getElementById};
  if(change==='channel')h.context.selectedChannel.id='video';if(change==='view')h.cancel();if(change==='screen')h.screen.classList.remove('active');if(change==='pending')h.context._obPendingSessId='pending';if(change==='active')h.context._obActiveSessId='active';if(change==='rtc')h.setRtc(true);
  const clearCount=h.clears.length;h.requests[0].resolve(value);assert.equal(await p,false);assert.equal(h.registrations.length,0);assert.equal(h.clears.length,clearCount);assert.equal(value.getTracks()[0].stops,1);assert.notEqual(card.button.textContent,'Enabled');
});
test('context unavailable or expert principal cannot start client media permission', async () => {
  for(const role of ['missing','expert']){const h=harness();h.launch();if(role==='missing')h.setAuthority(false);else h.setRole('expert');const p=h.enable();if(h.requests.length)h.requests[0].reject(new Error('Unexpected native permission acquisition'));assert.equal(await p,false);assert.equal(h.requests.length,0);}
});
test('newer shared/client stream identity is never cleared by an outstanding result', async () => {
  for(const target of ['client','shared','expert-shared']) {
    const h=harness();h.launch();const p=h.enable(),newer=stream(['audio','video']),value=stream();
    if(target==='client')h.context._obClientMediaReadyStream=newer;
    else {h.context._obRtcPrewarmedStream=newer;if(target==='expert-shared')h.context._obExpertMediaReadyStream=newer;}
    h.requests[0].resolve(value);assert.equal(await p,false);assert.equal(h.clears.length,0);assert(newer.getTracks().every(t=>t.stops===0));assert.equal(value.getTracks()[0].stops,1);
  }
});
test('a stale result aliasing a protected stream or tracks cannot stop shared media', async () => {
  for(const alias of ['whole','track']) {
    const h=harness();h.launch();const p=h.enable(),shared=stream();h.context._obClientMediaReadyStream=shared;h.context._obRtcPrewarmedStream=shared;
    const value=alias==='whole'?shared:stream([],shared.getTracks());h.cancel();h.requests[0].resolve(value);assert.equal(await p,false);assert.equal(shared.getTracks()[0].stops,0);assert.equal(h.clears.length,0);
  }
});
test('active RTC that has already consumed globals is not affected by a late native result', async () => {
  const h=harness();h.launch();const previouslyShared=stream();h.install(previouslyShared);const p=h.enable(),value=stream();h.context._obClientMediaReadyStream=null;h.context._obRtcPrewarmedStream=null;h.setRtc(true);
  h.requests[0].resolve(value);assert.equal(await p,false);assert.equal(previouslyShared.getTracks()[0].stops,0);assert.equal(value.getTracks()[0].stops,1);assert.equal(h.clears.length,0);
});
test('current rejection resets only current permission UI; retry succeeds', async () => {
  const h=harness(),card=h.launch(),p=h.enable();h.requests[0].reject(new Error('denied'));assert.equal(await p,false);assert.equal(card.button.disabled,false);assert.match(card.status.textContent,/Permission was not enabled/);assert.equal(h.clears.length,0);
  const next=h.enable(),value=stream();h.requests[1].resolve(value);assert.equal(await next,true);
});
test('same-client credential refresh preserves the current intent; stale rejection after Cancel does not decorate another card', async () => {
  const h=harness();h.launch();const p=h.enable(),value=stream();h.rotateCredential();h.requests[0].resolve(value);assert.equal(await p,true);
  h.launch('video');const old=h.enable();h.cancel();const replacement=h.launch('voice'),copy=replacement.status.textContent;h.requests[1].reject(new Error('stale denial'));assert.equal(await old,false);assert.equal(replacement.status.textContent,copy);
});
test('incomplete native media is unpublished and stopped, with old prewarm retained', async () => {
  const h=harness();h.launch('video');const old=stream();h.install(old);const p=h.enable(),incomplete=stream();h.requests[0].resolve(incomplete);assert.equal(await p,false);assert.equal(h.context._obClientMediaReadyStream,old);assert.equal(old.getTracks()[0].stops,0);assert.equal(incomplete.getTracks()[0].stops,1);assert.equal(h.clears.length,0);
});
test('missing/mismatched expert and actually hidden/disconnected PRESESS cannot acquire media', async () => {
  for(const change of [h=>{h.context._currentExpert={};h.context._currentExpertId='';},h=>{h.context._currentExpertId='expert-b';},h=>{h.view.style.display='none';},h=>{h.screen.hidden=true;},h=>{h.current().isConnected=false;},h=>{h.view.style.opacity='0';}]){
    const h=harness();h.launch();change(h);const p=h.enable();if(h.requests.length)h.requests[0].reject(new Error('Unexpected native permission acquisition'));assert.equal(await p,false);assert.equal(h.requests.length,0);
  }
});
test('hidden parent at permission completion prevents publication', async () => {
  const h=harness();h.launch();const p=h.enable(),value=stream();h.view.style.visibility='hidden';h.requests[0].resolve(value);assert.equal(await p,false);assert.equal(h.registrations.length,0);assert.equal(value.getTracks()[0].stops,1);
});
test('voice readiness rejects an unexpected live camera track', async () => {
  const h=harness();h.launch('voice');const p=h.enable(),value=stream(['audio','video']);h.requests[0].resolve(value);assert.equal(await p,false);assert.equal(h.registrations.length,0);assert(value.getTracks().every(t=>t.stops===1));
});
