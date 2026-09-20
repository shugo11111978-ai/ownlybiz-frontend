import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import vm from 'node:vm';

// Exact source, inert DOM/API doubles only. The baseline must fail the missing
// video projection cases; no billing, RTC, auth or backend implementation is changed.
const baseline = '2b375cceb629afea9c917aa61ffbd771eb387e73';
const html = process.argv.includes('--baseline')
  ? execFileSync('git', ['show', baseline + ':index.html'], {cwd:new URL('..', import.meta.url), encoding:'utf8', maxBuffer:20_000_000})
  : readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function between(a, b) {
  const start=html.indexOf(a), end=html.indexOf(b,start);
  assert(start>=0 && end>start, a+' remains uniquely extractable');
  assert.equal(html.indexOf(a,start+1),-1);
  return html.slice(start,end);
}
const policy=html.match(/<script id="ownlybiz-rate-and-session-status-policy-20260827">([\s\S]*?)<\/script>/)?.[1];
assert(policy);
const rateSource=between('  function channelRate(ch, sess){','\n  function channelFree(ch, sess){');
const freeUiSource=between('  function setClientFreeUi(ch, rate, free){','\n  function settleClientScheduledPreflight(');
const applySource=between('  function applyClientSessionUi(sess){','\n  function syncClientSession(sid){');
const syncSource=between('  function syncClientSession(sid){','\n  function startClientPoller(sid){');
const cleanupSource=between('  function clearClientSessionDom(){','\n  function clearAccountScopedClientSessionRuntime(');
function runtime() {
  const nodes=new Map(), requests=[], calls={ratePolicy:[],rtc:[],screens:[],mode:[],timer:[]};
  const node=id=>{
    if(!nodes.has(id)) nodes.set(id,{textContent:'',value:'',style:{},hidden:false,disabled:false,
      classList:{add(){},remove(){},contains(){return false;}},replaceChildren(){},remove(){},
      querySelector:selector=>node(id+':'+selector)});
    return nodes.get(id);
  };
  node('vid-rate-display').textContent=html.match(/id="vid-rate-display">([^<]*)<\/div>/)[1];
  let client='client-a', token='credential-a';
  const w={console,Object,Number,String,Array,Math,JSON,
    document:{getElementById:node,querySelectorAll:()=>[],documentElement:{classList:{remove(){}}}},
    _currentExpert:{id:'owner',rate_video:19,rate_voice:7,rate_chat:3},_obActiveSessId:'sid-a',_sessId:'sid-a',
    myId:()=>client,tok:()=>token,clientTokenCurrent:t=>t===token,
    clientRecentlyEndedLocal:()=>false,obReduceClientSessionTerminal:()=>false,
    clientReceiptSessionId:s=>String(s?.id||s?.session_id||s?.sessionId||''),
    normalizeClientReceiptSession:s=>s,clearClientEndingState(){},refreshClientSessionCredential(){},
    channelFree:(_ch,s)=>Number(s?.free_minutes||0),obMinuteText:n=>String(n),
    money:n=>'$'+Number(n).toFixed(2),setText:(id,value)=>{node(id).textContent=String(value);},show:(id,yes)=>{node(id).style.display=yes?'':'none';},
    obCreditRememberSessionMode:s=>calls.mode.push({...s}),updateClientTimerDisplays:()=>{},
    switchView:n=>calls.screens.push(n),phoneGo:n=>calls.screens.push(n),
    ensureClientWsJoined:(id,callback)=>{calls.rtc.push(id);if(callback)callback();},startClientRtcMedia:(...args)=>calls.rtc.push(args),
    bindClientChatControls(){},startClientTimer:(...args)=>calls.timer.push(args),pauseClientTimers:(...args)=>calls.timer.push(args),
    appendPanelMessage(){},api:(...args)=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});requests.push({args,resolve,reject});return promise;},
  };
  w.window=w;vm.createContext(w);
  vm.runInContext(policy+rateSource+freeUiSource+applySource+syncSource+cleanupSource,w);
  return {w,node,requests,calls,identity(next){client=next;token='credential-'+next;}};
}
const session=(extra={})=>({id:'sid-a',client_id:'client-a',expert_id:'expert-a',channel:'video',status:'active',started_at:1,rate_per_min:0,free_minutes:0,...extra});

test('static video rate is neutral before a canonical session',()=>{
  assert.equal(runtime().node('vid-rate-display').textContent,'—');
});
for(const rate of [0,'0',0.5,'7.25']) test('explicit canonical rate '+JSON.stringify(rate)+' preserves zero and paid rates',()=>{
  const h=runtime(),s=session({rate_per_min:rate});h.w.applyClientSessionUi(s);
  assert.equal(h.node('vid-rate-display').textContent,'$'+Number(rate).toFixed(2)+'/min');
  assert.equal(h.w._obClientSessionSnapshot.rate_per_min,Number(rate));
  assert.equal(h.node('presess-rate').textContent,h.node('vid-rate-display').textContent);
  assert.deepEqual(s,session({rate_per_min:rate}),'input is not changed');
  assert.equal(h.requests.length,0);
});
test('canonical compatibility field precedence matches the unchanged rate policy',()=>{
  for(const fields of [
    {rate_per_min:null,ratePerMin:2.5}, {rate_per_min:undefined,rate_video:1.25},
    {rate_per_min:'bad',ratePerMin:false,rate_video:null,video_pm:0},
    {rate_per_min:0,ratePerMin:9,rate_video:8,video_pm:7},
  ]) {const h=runtime(),s=session(fields);h.w.applyClientSessionUi(s);assert.equal(h.node('vid-rate-display').textContent,'$'+h.w.OB_RATE_POLICY.sessionRate(s,h.w._currentExpert,'video').toFixed(2)+'/min');}
});
test('missing or invalid session pricing remains neutral, without changing fallback policy',()=>{
  for(const rate of [undefined,null,'',false,true,-1,'bad',Infinity,NaN]) {
    const h=runtime();h.node('vid-rate-display').textContent='$88.00/min';h.w.applyClientSessionUi(session({rate_per_min:rate}));
    assert.equal(h.node('vid-rate-display').textContent,'—',String(rate));
    assert.equal(h.w._obClientSessionSnapshot.rate_per_min,19,'existing fallback remains untouched');
  }
});
test('provisional, missing-identity and foreign-client snapshots never publish a rate',()=>{
  for(const extra of [{id:''},{client_id:''},{expert_id:''},{client_id:'client-b'}]) {
    const h=runtime();h.node('vid-rate-display').textContent='$88.00/min';h.w.applyClientSessionUi(session(extra));assert.equal(h.node('vid-rate-display').textContent,'—');
  }
  const h=runtime();h.w.applyClientSessionUi({id:'sid-a',channel:'video',rate_per_min:7,free_minutes:0});assert.equal(h.node('vid-rate-display').textContent,'—');
  h.identity('');h.w.applyClientSessionUi(session({client_id:''}));assert.equal(h.node('vid-rate-display').textContent,'—');
});
test('marketplace session uses its canonical price even when public owner differs',()=>{
  const h=runtime();h.w.applyClientSessionUi(session({expert_id:'owner',marketplace_expert_id:'mini-a',rate_per_min:0}));assert.equal(h.node('vid-rate-display').textContent,'$0.00/min');
});
test('voice/chat projection clears a previous video label',()=>{
  for(const channel of ['voice','chat']) {const h=runtime();h.w.applyClientSessionUi(session({rate_per_min:3}));h.w.applyClientSessionUi(session({channel,rate_per_min:7}));assert.equal(h.node('vid-rate-display').textContent,'—');}
});
test('fresh reload stays neutral until the matching authenticated GET returns zero rate',async()=>{
  const h=runtime(),pending=h.w.syncClientSession('sid-a');assert.equal(h.node('vid-rate-display').textContent,'—');assert.equal(h.requests.length,1);assert.deepEqual(h.requests[0].args,['/api/sessions/sid-a']);
  h.requests[0].resolve({session:session(),messages:[]});await pending;assert.equal(h.node('vid-rate-display').textContent,'$0.00/min');
});
test('same-session refresh can replace a paid display with an explicit zero',async()=>{
  const h=runtime();h.w.applyClientSessionUi(session({rate_per_min:4}));const pending=h.w.syncClientSession('sid-a');h.requests[0].resolve({session:session(),messages:[]});await pending;assert.equal(h.node('vid-rate-display').textContent,'$0.00/min');
});
test('stale credential and stale session GET responses cannot restore an old price',async()=>{
  for(const change of ['identity','session']) {
    const h=runtime(),pending=h.w.syncClientSession('sid-a');
    if(change==='identity'){h.identity('client-b');h.w.clearClientSessionDom();}else h.w._obActiveSessId='sid-b';
    h.requests[0].resolve({session:session({rate_per_min:9}),messages:[]});await pending;assert.equal(h.node('vid-rate-display').textContent,'—');
  }
});
test('existing account teardown clears an already rendered price',()=>{
  const h=runtime();h.w.applyClientSessionUi(session({rate_per_min:5}));assert.equal(h.node('vid-rate-display').textContent,'$5.00/min');h.w.clearClientSessionDom();assert.equal(h.node('vid-rate-display').textContent,'—');
});
test('existing terminal/ending guards still run before the display-only projection',()=>{
  for(const mode of ['recent','terminal','ending']) {
    const h=runtime();h.node('vid-rate-display').textContent='retained receipt';
    if(mode==='recent')h.w.clientRecentlyEndedLocal=()=>true;
    if(mode==='terminal')h.w.obReduceClientSessionTerminal=()=>true;
    if(mode==='ending')h.w._obClientEndingSid='sid-a';
    h.w.applyClientSessionUi(session());assert.equal(h.node('vid-rate-display').textContent,'retained receipt');assert.equal(h.calls.rtc.length,0);
  }
});
