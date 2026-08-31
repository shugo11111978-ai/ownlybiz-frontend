import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { Script } from 'node:vm';

// Local visual fixture: production functions and markup are extracted at request
// time. Only their surrounding transport and session data are synthetic.
const sourceUrl = new URL('../index.html', import.meta.url);
function buildPage() {
  const source = readFileSync(sourceUrl, 'utf8');
  function between(startText, endText) {
    const start = source.indexOf(startText);
    const end = source.indexOf(endText, start);
    assert(start >= 0 && end > start, `${startText} remains extractable`);
    return source.slice(start, end);
  }
  const functions = [
    between('  function renderClientChatReadiness(sess){', '  window._clientTimerFn ='),
    between('  function clientReceiptDuration(sess){', '\n  function handleSessionStarted(d){'),
    between('  function applyClientSessionUi(sess){', '  function syncClientSession(sid){'),
    between('  function bindClientChatControls(){', '  function stopExpertTimerKeepDisplay(){'),
  ].join('\n');
  new Script(functions, { filename: 'extracted-client-readiness.js' });
  const chat = between('          <div class="phone-screen" id="screen-A4">',
    '          <!-- ═══════════════════════════════════════\n               WALLET / ADD FUNDS');
  const receipt = between('          <div class="phone-screen" id="screen-A5">',
    '          <!-- ═══════════════════════════════════════\n               SCREEN-PRESESS:');
  const styles = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n');
  const fingerprint = createHash('sha256').update(functions + chat + receipt).digest('hex').slice(0, 16);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ownlybiz local chat readiness QA</title><style>${styles}</style><style>
  body.ownly-ready{opacity:1!important;background:#eee9e1!important;color:#241813!important;padding:24px!important;overflow:auto!important}
  .qa-shell{display:grid;grid-template-columns:minmax(270px,370px) minmax(320px,460px);gap:32px;justify-content:center;align-items:start;max-width:1000px;margin:auto}
  .qa-controls{background:white;padding:22px;border-radius:18px;border:1px solid #d9cec1;font:14px/1.5 system-ui;color:#241813}
  .qa-controls h1{font:700 22px/1.25 system-ui;margin-bottom:12px}.qa-controls p{margin:8px 0 16px}.qa-buttons{display:grid;gap:8px}
  .qa-buttons button{padding:11px;border:1px solid #d8c8b9;border-radius:10px;background:#fff9f2;color:#241813;text-align:left;font:600 14px system-ui}
  .qa-buttons button:hover{background:#f4e8d8}.qa-controls pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 ui-monospace;background:#f6f2eb;padding:10px;border-radius:8px;margin-top:12px}
  #qa-errors{color:#b91c1c;white-space:pre-wrap}.qa-preview{min-width:0}.qa-preview #view-5{display:block!important}.qa-preview .client-funnel-wrap{padding:0!important;min-height:0!important;background:none!important}
  .qa-preview .phone-shell{width:100%!important;max-width:430px!important;height:760px!important;min-height:0!important;border:8px solid #39321d!important;border-radius:34px!important;margin:0!important;box-shadow:0 18px 40px #0002!important}
  .qa-preview .phone-content{height:100%!important}.qa-preview .phone-screen{min-height:100%!important}.qa-preview .phone-screen.active{display:block!important}
  .qa-preview .chat-input{min-width:0}.qa-preview .phone-shell-wrap{width:100%!important}.qa-caption{font:12px system-ui;margin-bottom:10px;color:#55493d}
  [hidden]{display:none!important}@media(max-width:750px){body.ownly-ready{padding:12px!important}.qa-shell{grid-template-columns:1fr;gap:18px}.qa-controls{padding:16px}.qa-buttons{grid-template-columns:1fr 1fr}.qa-preview{max-width:430px;margin:auto;width:100%}}
  </style></head><body class="ownly-ready"><main class="qa-shell">
  <section class="qa-controls"><h1>Chat startup readiness</h1><p>Isolated visual fixture. Uses current production-source functions and screen markup. No live API, payment, account, or WebSocket calls are permitted.</p>
  <div class="qa-buttons">
    <button id="qa-connecting" data-scenario="connecting">1. Connecting + retained draft</button>
    <button id="qa-active" data-scenario="active">2. Authoritative start</button>
    <button id="qa-cancelled" data-scenario="cancelled">3. Never-started cancellation</button>
    <button id="qa-new-session" data-scenario="new-session">4. Old started → new fallback</button>
    <button id="qa-ended" data-scenario="ended">5. Normal completed receipt</button>
    <button id="qa-free" data-scenario="free">6. Started free-intro chat</button>
    <button id="qa-voice" data-scenario="voice">7. Voice readiness no-op</button>
    <button id="qa-video" data-scenario="video">8. Video readiness no-op</button>
  </div><p>In connecting state, End Session remains clickable while sending is disabled. Start unlocks the retained draft; the send arrow is local-only. Other-channel buttons check this change does not alter the composer; they are not media QA.</p>
  <pre id="qa-status" aria-live="polite"></pre><pre id="qa-network">Synthetic calls only: 0</pre><div id="qa-errors" role="alert"></div><p>Source fingerprint: <code>${fingerprint}</code></p></section>
  <section class="qa-preview"><div class="qa-caption">Production chat and receipt markup · synthetic client/session</div><div id="view-5" class="view-panel active"><div class="client-funnel-wrap"><div class="phone-shell-wrap"><div class="phone-shell"><div class="phone-content">${chat}${receipt}</div></div></div></div></div></section>
  </main><script>
  'use strict';
  window.fetch=function(){throw new Error('Live network is disabled in this QA fixture');};
  window.WebSocket=function(){throw new Error('WebSockets are disabled in this QA fixture');};
  window.addEventListener('error',function(event){document.getElementById('qa-errors').textContent+=event.message+'\\n';});
  var sequence=0, scenario='connecting', syntheticCalls=[];
  function int(value,fallback){var n=parseInt(value,10);return Number.isFinite(n)?n:(fallback||0);}
  function num(value,fallback){var n=parseFloat(value);return Number.isFinite(n)?n:(fallback||0);}
  function money(value){return '$'+num(value,0).toFixed(2);}
  function fmtTime(value){return Math.floor(value/60)+':'+String(value%60).padStart(2,'0');}
  function channelRate(channel,session){return num(session&&session.rate_per_min,0);}
  function channelFree(channel,session){return num(session&&session.free_minutes,0);}
  function billableMinutes(seconds,free){return Math.max(0,seconds/60-free);}
  function setText(id,value){var el=document.getElementById(id);if(el)el.textContent=String(value);}
  function stopOriginalClientTimers(){clearInterval(window._obClientElapsedInterval);window._obClientElapsedInterval=null;}
  function phoneGo(id){document.querySelectorAll('.phone-screen').forEach(function(el){el.classList.toggle('active',el.id==='screen-'+id);});}
  function switchView(){}
  function refreshClientSessionCredential(){}
  function setClientFreeUi(){}
  function ensureClientWsJoined(){}
  function myId(){return 'synthetic-client';}
  function tok(){return 'synthetic-local-credential';}
  function clientTokenCurrent(value){return value==='synthetic-local-credential';}
  function toastMsg(message){setText('qa-network','Local message: '+message);}
  function appendPanelMessage(id,message,mine){var el=document.createElement('div');el.className='chat-msg '+(mine?'client':'expert');var bubble=document.createElement('div');bubble.className='chat-bubble';bubble.textContent=message.content;el.appendChild(bubble);document.getElementById(id).appendChild(el);}
  function api(path,options){
    syntheticCalls.push({path:path,method:options&&options.method||'GET'});setText('qa-network','Synthetic calls only: '+syntheticCalls.length+'\\n'+JSON.stringify(syntheticCalls.at(-1)));
    if(/\\/end$/.test(path))return Promise.resolve({session:terminalSnapshot(!!window._obClientSessionSnapshot.started_at)});
    return Promise.resolve({saved:true});
  }
  function returnToExpertPage(){selectScenario('connecting');}
  function handleRating(){}
  window.obIsTerminalSessionStatus=function(value){return ['cancelled','failed','expired','declined','no_show','ended','completed'].includes(String(value).toLowerCase());};
  window.OB_SESSION_STATUS_POLICY={normalize:function(value){return String(value||'').toLowerCase();},isTerminal:window.obIsTerminalSessionStatus,statusFrom:function(payload){return String(payload.session&&payload.session.status||payload.status||'').toLowerCase();}};
  ${functions}
  function clearState(){
    stopOriginalClientTimers();
    ['_obClientReceiptAuthorityState','_obClientLocallyEndedSid','_obLastTerminalSessionSid','_obClientEndingSid','_obClientEndingSnapshot','_obClientStartedAt'].forEach(function(key){window[key]=null;});
    document.getElementById('ob-client-startup-draft').hidden=true;
    document.getElementById('ob-client-startup-draft-text').value='';
    document.getElementById('paid-chat-messages').replaceChildren();
    window._currentExpert={name:'Luna Psychic · local QA'};
    window._obPendingChannel='chat';
    window._obClientSessionSnapshot={};
    clearClientEndingState();
  }
  function connecting(keepDraft){
    var priorDraft=document.getElementById('paid-chat-input').value;
    clearState();
    document.getElementById('paid-chat-input').value=keepDraft&&priorDraft?priorDraft:'Hello, I would like some guidance';
    applyClientSessionUi({id:'local-chat-'+(++sequence),channel:'chat',status:'active',started_at:null,rate_per_min:0.5,free_minutes:0,expert_name:'Luna Psychic · local QA'});
  }
  function terminalSnapshot(started){
    var current=window._obClientSessionSnapshot||{};
    return Object.assign({},current,{status:started?'ended':'cancelled',started_at:started?(current.started_at||1):null,duration_secs:started?120:0,total_charged:started?1:0,card_charged:started?1:0,billing_attempted_amount:started?1:0});
  }
  function updateStatus(){
    var input=document.getElementById('paid-chat-input');var active=document.querySelector('.phone-screen.active');
    setText('qa-status',JSON.stringify({scenario:scenario,screen:active&&active.id,session_id:window._obActiveSessId,started_at:window._obClientSessionSnapshot&&window._obClientSessionSnapshot.started_at,composer_disabled:input.disabled,draft:input.value,rate_label:document.getElementById('a4-session-rate').textContent,connecting_visible:!document.getElementById('ob-client-chat-readiness').hidden},null,2));
  }
  function selectScenario(next){
    scenario=next;
    if(next==='connecting')connecting(false);
    if(next==='active'||next==='free'){
      if(!window._obActiveSessId||!document.getElementById('screen-A4').classList.contains('active'))connecting(true);
      var snapshot=Object.assign({},window._obClientSessionSnapshot,{free_minutes:next==='free'?1:0,started_at:Math.floor(Date.now()/1000)});
      applyClientSessionUi(snapshot);
    }
    if(next==='cancelled'){connecting(true);window.obApplyAuthoritativeClientTerminal({type:'session_cancelled',session:terminalSnapshot(false)});}
    if(next==='ended'){connecting(false);window._obClientSessionSnapshot.started_at=Math.floor(Date.now()/1000)-120;window.obApplyAuthoritativeClientTerminal({type:'session_ended',session:terminalSnapshot(true)});}
    if(next==='new-session'){
      connecting(true);
      applyClientSessionUi(Object.assign({},window._obClientSessionSnapshot,{started_at:Math.floor(Date.now()/1000)-30}));
      applyClientSessionUi({id:'local-new-fallback-'+(++sequence),channel:'chat',status:'active',rate_per_min:0.5,free_minutes:0,expert_name:'Luna Psychic · local QA'});
    }
    if(next==='voice'||next==='video'){
      connecting(false);stopOriginalClientTimers();
      var input=document.getElementById('paid-chat-input');input.disabled=false;input.placeholder=next+' sentinel: unchanged';
      document.getElementById('ob-client-chat-readiness').hidden=true;
      var send=document.querySelector('#screen-A4 .chat-send');send.setAttribute('aria-disabled','false');send.style.pointerEvents='';send.style.opacity='';
      setText('a4-session-rate',next+' guard: no chat changes expected');
      renderClientChatReadiness({id:window._obActiveSessId,channel:next,status:'active',started_at:null});
    }
    updateStatus();
  }
  document.querySelectorAll('[data-scenario]').forEach(function(button){button.addEventListener('click',function(){selectScenario(button.dataset.scenario);});});
  document.addEventListener('input',updateStatus);setInterval(updateStatus,500);selectScenario('connecting');
  window.__readinessQa={selectScenario:selectScenario,sourceFingerprint:'${fingerprint}',syntheticCalls:syntheticCalls};
  </script></body></html>`;
}

if (process.argv.includes('--check')) {
  const html = buildPage();
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Script(match[1]);
  console.log('Local readiness visual fixture extraction and JavaScript syntax: PASS');
} else {
  const server = createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/') {
      response.writeHead(404, { 'Content-Type': 'text/plain' });response.end('Not found');return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; form-action 'none'; base-uri 'none'",
    });
    response.end(buildPage());
  });
  server.listen(0, '127.0.0.1', () => console.log(JSON.stringify({ url: `http://127.0.0.1:${server.address().port}/`, mode: 'synthetic-local-only' })));
}
