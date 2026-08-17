import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function scriptById(id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match, `${id} is installed`);
  return match[1];
}

const runtimeSource = scriptById('ownlybiz-expert-live-runtime-20260817');
assert.equal((html.match(/id="ownlybiz-expert-live-runtime-20260817"/g) || []).length, 1,
  'the expert live runtime is installed exactly once');
assert.match(runtimeSource, /type:'session_subscribe', session_id:sid/,
  'expert chat rooms use the multiplex subscribe protocol');
assert.match(runtimeSource, /type:'session_unsubscribe', session_id:sid/,
  'expert chat rooms use the multiplex unsubscribe protocol');
assert.match(runtimeSource, /type:'session_history', session_id:room\.id, before_sequence:normalized/,
  'reconnect recovery uses the explicit room-scoped history cursor protocol');
assert.match(runtimeSource, /owned\.send\(JSON\.stringify\(\{type:'auth', token:current\.token\}\)\)/,
  'a newly opened canonical socket authenticates in one explicit owner');
assert.match(html, /if\(ws\._obMiniSuiteSignalOwner\) return ws;\s*if\(ws\._obExpertRuntimeOwner\) return ws;/,
  'generic socket wiring preserves both mini-suite and canonical expert ownership');
assert.match(html, /ws\._obExpertRuntimeOwner \|\| ws\._obMiniSuiteSignalOwner\) return;/,
  'typing polish does not install a second router on expert-owned sockets');
assert.match(html, /_role==='expert' && window\._obExpertRealtime && !\(window\.obIsMiniSuiteRoute && window\.obIsMiniSuiteRoute\(\)\)/,
  'RTC transport delegation explicitly excludes mini-suite signaling');
assert.match(html, /var expertRealtime=\(window\.obIsMiniSuiteRoute && window\.obIsMiniSuiteRoute\(\)\)\?null:window\._obExpertRealtime;/,
  'strict expert RTC routing leaves mini-suite RTC ownership untouched');
assert.match(html, /if\(Auth\.isExpert && typeof window\._obRouteWsMessage === 'function'\)\{\s*window\._obRouteWsMessage\(d, 'expert'\);\s*return;/,
  'the legacy dispatcher delegates expert events before its unfiltered switch');
assert.match(html, /if\(roleName === 'expert' && expertRealtime\)\{[\s\S]*?expertRealtime\.whenOpen/,
  'the expert ensure facade delegates to the canonical runtime');
assert.match(html, /if\(decision\.handled && sid && !decision\.focused\) return true;/,
  'off-focus expert events stop before legacy DOM handlers');
assert.match(html, /if\(decision\.historyPage\)\{\s*if\(decision\.focused\) renderFocusedExpertRoom\(sid\);\s*return true;/,
  'recovered history redraws only the explicitly focused expert room');
assert.match(html, /expertRealtime\.rtcSessionId && expertRealtime\.rtcSessionId !== sid[\s\S]*?return false;/,
  'an active media focus pins the single live panel');
assert.match(html, /if\(window\._obRefreshExpertRealtimeBadge\) window\._obRefreshExpertRealtimeBadge\(\);/,
  'later dashboard boot code restores runtime unread state instead of zeroing it');
assert.match(html, /if\(k === 'sendExpertMsg' && window\[k\] && window\[k\]\.__obOutboxGuarded\) return;/,
  'late stabilizer passes preserve the idempotent expert outbox wrapper');
assert.match(html, /function expertEndResponseOwns\(request\)\{\s*return expertEndControllerOwns\(request\)&&clientContext\.isCurrent\(request\.context\);/,
  'an authoritative End response remains owned after a same-account focus switch');
assert.match(html, /window\._obExpertRealtime\.ingest\(\{type:'session_ended',session_id:sessionId,session:session\}\);\s*if\(activeExpertSessionIdForEnd\(\)!==sessionId\)return;/,
  'a background End response updates only the keyed room');
assert.match(runtimeSource, /BACKEND_TERMINAL_SESSION_STATUSES = \['cancelled','ended','completed','failed','expired','declined','no_show'\]/,
  'the shared terminal predicate exactly matches backend session statuses');
assert.doesNotMatch(runtimeSource, /BACKEND_TERMINAL_SESSION_STATUSES[^\n]*'canceled'/,
  'Stripe-style one-l canceled is not treated as an authoritative session terminal state');
assert.match(runtimeSource, /maxOutstandingSubscriptions = Math\.max\(1, Math\.min\(8,/,
  'subscription replay has a hard eight-request in-flight ceiling');
assert.match(runtimeSource, /subscribedRoomIds\.add\(sid\)[\s\S]*?room\.subscriptionAttempts = 0/,
  'rooms become subscribed only when the backend acknowledgement arrives');
assert.match(runtimeSource, /actionType === 'join'[\s\S]*?scheduleRtcJoinRetry\(\)/,
  'correlated RTC join backpressure has its own bounded retry path');
assert.match(runtimeSource, /history_recovery_budget_exhausted/,
  'history recovery exposes deterministic budget exhaustion instead of auto-looping');
assert.doesNotMatch(runtimeSource, /resumeDeferredHistory/,
  'history recovery never automatically restarts a budget-exhausted cursor chain');
assert.match(html, /function captureExpertPrivateOperation[\s\S]*?principalGeneration:expertRealtime\.principalGeneration,credentialGeneration:expertRealtime\.credentialGeneration/,
  'private expert operations capture both principal and credential generations');
assert.match(html, /function expertPrivateOperationCurrent[\s\S]*?context\.token === expertRealtime\.identity\.token/,
  'async expert responses are fenced by their exact credential owner');
assert.match(html, /function scrubExpertPrivateUi[\s\S]*?'_sessionRequestTimer'[\s\S]*?window\._pendingSid = null;[\s\S]*?window\._obActiveSessId = null;[\s\S]*?_obClearExpertOutboxForPrincipalReset[\s\S]*?_obClearRealtimeResumeForPrincipalChange/,
  'principal reset atomically clears private overlay, focus, timer, outbox, and resume state');
assert.match(html, /expertPrivateTimers\.forEach[\s\S]*?_obShowNoActiveExpertLiveSession\(true\)/,
  'principal reset cancels delayed private UI work and forcibly scrubs the old live panel');
assert.match(html, /onCredentialRotated:function\(\)[\s\S]*?hydrateExpertChatRooms\(true\); reconcileExpertPendingRequests\(true\)/,
  'same-principal credential rotation rehydrates without discarding runtime rooms');
assert.match(html, /function expertRealtimeIdentity[\s\S]*?accountId:claims\.id \|\| claims\.user_id \|\| claims\.expert_id \|\| claims\.sub/,
  'expert principal changes follow the credential subject even while ob_u storage is stale');
assert.match(html, /function reconcilePendingList[\s\S]*?authoritativeIds[\s\S]*?expertRealtime\.clearPending\(sid\)/,
  'pending API reconciliation removes events absent from the authoritative principal-bound response');
assert.match(html, /api\('\/api\/sessions\/' \+ encodeURIComponent\(sid\) \+ '\/accept',[\s\S]*?signal:context\.signal/,
  'accept mutations are abortable and credential-owned');
assert.match(html, /status=active&limit=100&include_messages=0/,
  'room hydration requests metadata only');
assert.match(html, /function syncExpertSession\(sid\)[\s\S]*?\?include_messages=0/,
  'expert polling does not repeatedly download full chat history');
assert.match(html, /function durablePanelMessageKey[\s\S]*?client_message_id[\s\S]*?event_id/,
  'DOM message identity uses durable protocol identifiers');
assert.doesNotMatch(html.match(/function dedupePanelMessages[\s\S]*?function activeExpertSessionId/)[0], /textContent|msg\.content/,
  'DOM dedupe never collapses distinct same-text messages');
assert.match(html, /principal_key:currentPrincipal/,
  'outbox entries are bound to the account that created them');
assert.match(html, /if\(!reserve\(item\)\) return false;\s*if\(input\) input\.value = '';\s*appendLocal/,
  'outbox capacity is reserved before input clearing or optimistic rendering');
assert.doesNotMatch(scriptById('ownlybiz-chat-outbox-v2'), /slice\(-50\)/,
  'outbox storage never silently discards messages at capacity');
assert.match(scriptById('ownlybiz-production-realtime-resume-v1'), /principal_key: principal/,
  'RTC resume state is principal-bound');
assert.match(scriptById('ownlybiz-production-realtime-resume-v1'), /resumeState\.sid && !resumeMemoryOwned\(\)\) discardResumeClosure\(true\)/,
  'RTC resume clears a stale in-memory principal before inspecting stored recovery state');
assert.match(html, /tokenGeneration:0,principalKey:''/,
  'mini-suite credentials carry an explicit same-page generation');
assert.match(html, /function teardownMiniSuiteTransport[\s\S]*?ws\.onopen = ws\.onmessage = ws\.onerror = ws\.onclose = null/,
  'mini-suite token changes detach and close the old signaling owner');
assert.match(html, /function scrubMiniSuitePrincipalSurface[\s\S]*?ob-mini-suite-app[\s\S]*?scrubMiniSuitePrincipalSurface\(!!next\)/,
  'mini-suite principal changes synchronously scrub the mounted private workspace');
assert.match(html, /window\.obMiniSuiteStartMedia = function[\s\S]*?var context=miniSuiteContext\(\)[\s\S]*?mediaStartCurrent\(\)[\s\S]*?stopStaleMediaStart\(\)/,
  'mini-suite media startup is fenced across credential-generation changes');
assert.match(html, /_obSetNextStartGuard[\s\S]*?var startGuard = typeof args\[3\] === 'function'[\s\S]*?!startGuard\(\)[\s\S]*?oldStart\.apply/,
  'the freshness wrapper rechecks an optional media owner immediately before invoking RTC');
assert.match(html, /_obSetNextStartGuard\(mediaStartCurrent\)[\s\S]*?OB_RTC\.start\(sess\.id,ch,'expert'\)/,
  'mini-suite passes its exact credential-generation owner through delayed RTC wrappers');
assert.match(html, /var onMiniSuite=window\.location&&\/\^\\\/mini-suite[\s\S]*?if\(onMiniSuite\)return sessionStorage\.getItem\('ob_mini_suite_token'\)\|\|'';/,
  'RTC returns only the scoped mini credential on mini-suite routes');

const endControllerMatch = html.match(/var expertEndController=\{nextRequestId:0,current:null,bySessionId:Object\.create\(null\)\};[\s\S]*?window\.expertEndSession=requestExpertSessionEnd;/);
assert(endControllerMatch, 'the expert End controller is extractable');
let resolveBackgroundEnd;
const backgroundEndEvents = [];
let backgroundEndUiApplies = 0;
let backgroundEndRtcCleanup = 0;
const endButton = {textContent:'End Session',disabled:false,dataset:{}};
const endSandbox = {
  console,
  Object,
  Promise,
  encodeURIComponent,
  BASE:'https://staging.example',
  document:{querySelectorAll:() => [endButton]},
  clientContext:{
    capture:(scope, extras) => ({scope,sessionId:extras.sessionId,token:'expert-token',role:'expert'}),
    isCurrent:() => true,
  },
  responseJson:async (response) => response.json(),
  fetch:() => new Promise((resolve) => { resolveBackgroundEnd = resolve; }),
  _obExpertRealtime:{
    focusedRoomId:'A',
    ingest:(event) => backgroundEndEvents.push(event),
  },
  _sid:'A',_sessId:'A',_obActiveSessId:'A',_expertSessActive:true,
  OB_RTC:{isActive:() => true,cleanup:() => { backgroundEndRtcCleanup += 1; }},
  obApplyAuthoritativeExpertEnded:() => { backgroundEndUiApplies += 1; },
};
endSandbox.window = endSandbox;
vm.createContext(endSandbox);
new vm.Script(endControllerMatch[0], {filename:'expert-end-controller.js'}).runInContext(endSandbox);
const endAWhileSwitching = endSandbox.expertEndSession();
assert(resolveBackgroundEnd, 'End(A) is in flight before focus changes');
endSandbox._obExpertRealtime.focusedRoomId = 'B';
endSandbox._sid = endSandbox._sessId = endSandbox._obActiveSessId = 'B';
resolveBackgroundEnd({ok:true,status:200,json:async () => ({session:{id:'A',status:'ended',expert_earned:2}})});
assert.equal(await endAWhileSwitching, true, 'same-expert End(A) remains authoritative after switching focus to B');
assert.equal(backgroundEndEvents.length, 1, 'the End response marks A terminal in the keyed runtime');
assert.equal(backgroundEndEvents[0].session_id, 'A');
assert.equal(backgroundEndUiApplies, 0, 'End(A) cannot apply terminal UI to focused B');
assert.equal(backgroundEndRtcCleanup, 0, 'End(A) cannot clean focused B media');
assert.equal(endSandbox._obActiveSessId, 'B', 'focused B globals survive the late End(A) response');
assert.equal(endButton.disabled, false, 'the completed background End releases the persistent control');

class FakeClock {
  constructor() {
    this.now = 1_700_000_000_000;
    this.nextId = 1;
    this.tasks = new Map();
  }
  setTimeout(handler, delay = 0) {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.now + Number(delay || 0), handler, interval: 0 });
    return id;
  }
  setInterval(handler, delay = 0) {
    const id = this.nextId++;
    const interval = Math.max(1, Number(delay || 0));
    this.tasks.set(id, { at: this.now + interval, handler, interval });
    return id;
  }
  clear(id) { this.tasks.delete(id); }
  advance(ms) {
    const target = this.now + ms;
    let guard = 0;
    while(guard++ < 1000) {
      const due = [...this.tasks.entries()]
        .filter(([, task]) => task.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if(!due) break;
      const [id, task] = due;
      this.now = task.at;
      if(task.interval) task.at += task.interval;
      else this.tasks.delete(id);
      task.handler();
    }
    assert(guard < 1000, 'fake timer queue does not spin forever');
    this.now = target;
  }
}

function makeDate(clock) {
  const NativeDate = Date;
  return class ClockDate extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [clock.now])); }
    static now() { return clock.now; }
  };
}

function fakeSocketClass() {
  return class FakeWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    static instances = [];
    constructor(url) {
      this.url = url;
      this.readyState = FakeWebSocket.CONNECTING;
      this.sent = [];
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;
      FakeWebSocket.instances.push(this);
    }
    send(value) {
      assert.equal(this.readyState, FakeWebSocket.OPEN, 'only an open fake socket can send');
      this.sent.push(JSON.parse(value));
    }
    open() {
      this.readyState = FakeWebSocket.OPEN;
      if(this.onopen) this.onopen({ target:this });
    }
    receive(payload) {
      if(this.onmessage) this.onmessage({ data:JSON.stringify(payload), target:this });
    }
    serverClose() {
      this.readyState = FakeWebSocket.CLOSED;
      if(this.onclose) this.onclose({ target:this });
    }
    close() {
      this.readyState = FakeWebSocket.CLOSED;
      if(this.onclose) this.onclose({ target:this });
    }
  };
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.dataset = {};
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.rows = [];
  }
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values); },
  };
}

function evaluateRuntime(clock, FakeWebSocket) {
  const sandbox = {
    console,
    Date: makeDate(clock),
    setTimeout: clock.setTimeout.bind(clock),
    clearTimeout: clock.clear.bind(clock),
    WebSocket: FakeWebSocket,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  new vm.Script(runtimeSource, { filename:'expert-live-runtime-inline.js' }).runInContext(sandbox);
  return sandbox.OBExpertLiveRuntimeFactory;
}

function sent(ws, type) { return ws.sent.filter((item) => item.type === type); }
function messageId(message) { return message.client_message_id || message.id || message.message_id || message.messageId || ''; }
function hostArray(value) { return Array.from(value || []); }
function historyRange(first, last, prefix = 'history') {
  return Array.from({length:last - first + 1}, (_, offset) => {
    const sequence = first + offset;
    return {id:`${prefix}-${sequence}`,room_sequence:sequence,sender_id:'client-gap',content:`message ${sequence}`};
  });
}

const clock = new FakeClock();
const FakeWebSocket = fakeSocketClass();
const factory = evaluateRuntime(clock, FakeWebSocket);
const identity = { token:'expert-token-a', accountId:'expert-a', role:'expert' };
const elements = {
  panel:new FakeElement('expert-chat-messages'),
  typing:new FakeElement('expert-typing-indicator'),
  request:new FakeElement('session-request-sheet'),
  notif:new FakeElement('notif-count'),
  messages:new FakeElement('dbt-msg-badge'),
};
const document = { getElementById(id) { return Object.values(elements).find((el) => el.id === id) || null; } };
const globals = { _sid:'', _sessId:'', _obActiveSessId:'', _expertWs:null };
const rtc = { offers:[], ice:[], cleanupCalls:0 };
let runtime;

function renderFocused(sid) {
  const room = runtime.roomsById[sid];
  elements.panel.dataset.sessionId = sid;
  elements.panel.rows = room ? hostArray(room.messages).map(messageId) : [];
  elements.typing.textContent = room && room.typing ? 'typing...' : '';
}
function focus(sid) {
  runtime.focusRoom(sid);
  globals._sid = globals._sessId = globals._obActiveSessId = sid;
  renderFocused(sid);
}
function updateBadges() {
  elements.notif.textContent = String(runtime.aggregateUnread() + runtime.pendingIds().length);
  elements.messages.textContent = String(runtime.aggregateUnread());
}
function handleRuntimeMessage(event, decision) {
  const data = JSON.parse(event.data);
  if(decision.rtc) {
    if(decision.deliverRtc && data.type === 'rtc_offer') rtc.offers.push(data.sdp);
    if(decision.deliverRtc && data.type === 'rtc_ice') rtc.ice.push(data.candidate);
    return;
  }
  if(decision.pending) {
    if(decision.showPending && !decision.duplicate) elements.request.dataset.sessionId = decision.sid;
    return;
  }
  if(decision.duplicate || decision.transport || decision.missingSession || !decision.handled || !decision.focused) return;
  if(data.type === 'session_ended' && runtime.rtcSessionId === decision.sid) rtc.cleanupCalls += 1;
  renderFocused(decision.sid);
}

runtime = factory.create({
  WebSocket:FakeWebSocket,
  wsUrl:'wss://staging.example/ws',
  setTimeout:clock.setTimeout.bind(clock),
  clearTimeout:clock.clear.bind(clock),
  reconnectDelayMs:1800,
  random:() => 0,
  getIdentity:() => identity,
  isOwnMessage:(message) => String(message.sender_id || '') === identity.accountId,
  onSocketChange:(next, previous) => {
    if(next) globals._expertWs = next;
    else if(globals._expertWs === previous) globals._expertWs = null;
  },
  onMessage:handleRuntimeMessage,
  onStateChange:(owner, reason, room) => {
    updateBadges();
    if(reason === 'typing_expired' && room && room.id === owner.focusedRoomId) elements.typing.textContent = '';
  },
});

focus('A');
runtime.subscribeRoom('B');
runtime.subscribeRoom('A');
assert.equal(FakeWebSocket.instances.length, 1, 'two desired chat rooms share one expert socket');
const firstSocket = FakeWebSocket.instances[0];
firstSocket.open();
assert.equal(globals._expertWs, firstSocket, 'the canonical socket owns the legacy expert facade');
assert.equal(sent(firstSocket, 'auth').length, 1, 'the first connection authenticates exactly once');
assert.deepEqual(sent(firstSocket, 'session_subscribe').map((item) => item.session_id), ['A', 'B'],
  'the first connection subscribes every desired room once');
assert.equal(sent(firstSocket, 'join').length, 0, 'chat multiplexing does not use the legacy single-room join');

firstSocket.receive({ type:'authed', capabilities:{session_multiplex:true} });
assert.equal(runtime.capabilities.session_multiplex, true, 'auth capabilities advertise multiplex support');

firstSocket.serverClose();
clock.advance(1799);
assert.equal(FakeWebSocket.instances.length, 1, 'reconnect waits for its bounded delay');
clock.advance(1);
assert.equal(FakeWebSocket.instances.length, 2, 'one replacement socket is created after disconnect');
const socket = FakeWebSocket.instances[1];
firstSocket.receive({ type:'message', session_id:'B', id:'late-old', sender_id:'client-b', content:'late' });
assert.equal(runtime.roomsById.B.messages.length, 0, 'late events from the replaced socket are ignored');
socket.open();
assert.equal(sent(socket, 'auth').length, 1, 'reconnect authenticates once');
assert.deepEqual(sent(socket, 'session_subscribe').map((item) => item.session_id), ['A', 'B'],
  'reconnect replays the complete desired room set');

socket.receive({
  type:'session_subscribed', session_id:'A', sessionId:'A', subscribed:true,
  session:{id:'A',status:'active',channel:'chat',client_name:'Client A'},
  history:[{id:'a-history',sender_id:'client-a',content:'A history'}],
  history_page:{has_more:true,next_cursor:'cursor-A'},
});
socket.receive({
  type:'session_subscribed', sessionId:'B', subscribed:true,
  session:{id:'B',status:'active',channel:'chat',client_name:'Client B'},
  history:[{id:'b-history',sender_id:'client-b',content:'B history'}],
});
assert.deepEqual(elements.panel.rows, ['a-history'], 'background joined history cannot replace the focused panel');
assert.equal(runtime.roomsById.B.messages[0].session_id, 'B', 'history without a message SID is stamped into its subscribed room');
assert.equal(runtime.roomsById.A.historyPage.next_cursor, 'cursor-A', 'bounded history pagination metadata is retained per room');

socket.receive({
  type:'session_subscribed', session_id:'B', subscribed:true, already_subscribed:true,
  session:{id:'B',status:'active',channel:'chat',client_name:'Client B'},
  history:[
    {id:'b-history',sender_id:'client-b',content:'B history'},
    {id:'b-recovered',room_sequence:6,sender_id:'client-b',content:'Recovered while disconnected'},
  ],
  history_page:{has_more:false,next_cursor:null},
});
assert.equal(runtime.roomsById.B.unread, 1, 'a later subscription snapshot counts only newly recovered background history as unread');
assert.deepEqual(elements.panel.rows, ['a-history'], 'recovered background history remains store-only');

socket.receive({type:'message',session_id:'B',id:'b1',event_id:'message-B-7',room_sequence:7,sender_id:'client-b',content:'background B'});
socket.receive({type:'message',session_id:'B',id:'b1',event_id:'message-B-7',room_sequence:7,sender_id:'client-b',content:'background B'});
assert.deepEqual(hostArray(runtime.roomsById.B.messages).map(messageId), ['b-history','b-recovered','b1'], 'background messages are stored and deduplicated per room');
assert.equal(runtime.roomsById.B.unread, 2, 'one live background message increments unread once after recovered history');
assert.equal(runtime.roomsById.B.lastRoomSequence, 7, 'the latest room sequence is retained for ordering/recovery');
assert.deepEqual(elements.panel.rows, ['a-history'], 'a background message never mutates the focused DOM');
assert.equal(globals._sid, 'A', 'a background message never changes the focus facade');

socket.receive({type:'message',session_id:'A',id:'a1',sender_id:'client-a',content:'focused A'});
socket.receive({type:'message',id:'a-legacy',sender_id:'client-a',content:'legacy focused message'});
assert.deepEqual(elements.panel.rows, ['a-history','a1','a-legacy'], 'focused and SID-less legacy messages render only in the focused room');
assert.equal(runtime.roomsById.A.unread, 0, 'focused messages never increase unread');
runtime.ingest({type:'message',session_id:'A',id:'client-local-1',client_message_id:'client-local-1',sender_id:'expert-a',content:'local send'});
const optimisticMessage = runtime.roomsById.A.messages.find((message) => message.client_message_id === 'client-local-1');
socket.receive({type:'message_ack',session_id:'A',sessionId:'A',id:'server-message-1',message_id:'server-message-1',messageId:'server-message-1',client_message_id:'client-local-1',created:true,duplicate:false,sent_at:1700000001,room_sequence:8,event_id:'ack-A-8'});
assert.equal(runtime.roomsById.A.messages.filter((message) => message.client_message_id === 'client-local-1').length, 1,
  'message_ack reconciles a local idempotent send without duplicating it');
assert.equal(runtime.roomsById.A.lastMessageAck.id, 'server-message-1', 'the canonical message acknowledgement is retained per room');
assert.equal(runtime.roomsById.A.lastRoomSequence, 8, 'message acknowledgements advance room sequence metadata');
assert.equal(runtime.roomsById.A.messages.find((message) => message.client_message_id === 'client-local-1'), optimisticMessage,
  'canonical REST/WS acknowledgement enriches the optimistic object in place');
assert.equal(optimisticMessage.id, 'server-message-1', 'canonical server identity replaces the optimistic placeholder identity');
runtime.ingest({type:'message_ack',session_id:'A',client_message_id:'client-local-1',delivery_status:'sent'});
runtime.ingest({type:'message_ack',session_id:'A',client_message_id:'client-local-1',delivery_status:'failed',delivery_error:'session_not_active'});
assert.equal(optimisticMessage.delivery_status, 'failed', 'a later failed acknowledgement is not suppressed by generic event dedupe');
assert.equal(optimisticMessage.delivery_error, 'session_not_active', 'the exact failed acknowledgement remains in the room store for redraw');
socket.receive({type:'message',session_id:'A',id:'server-message-1',client_message_id:'client-local-1',room_sequence:8,sender_id:'expert-a',content:'local send',sent_at:1700000001});
assert.equal(runtime.roomsById.A.messages.filter((message) => message.client_message_id === 'client-local-1').length, 1,
  'a same-ID live echo cannot duplicate the canonicalized optimistic object');

socket.receive({type:'message',sessionId:'B',id:'b2',sender_id:'client-b',content:'camel SID'});
socket.receive({type:'message',session:{id:'B'},id:'b3',sender_id:'client-b',content:'nested SID'});
assert.equal(runtime.roomsById.B.unread, 4, 'camel and nested SID variants route to the same background room');

focus('B');
assert.equal(runtime.focusedRoomId, 'B');
assert.equal(runtime.roomsById.B.unread, 0, 'opening a room marks only that room read');
assert.deepEqual(elements.panel.rows, ['b-history','b-recovered','b1','b2','b3'], 'switching focus renders the retained room buffer');
assert.equal(globals._obActiveSessId, 'B', 'legacy globals remain a facade for focus');
runtime.mergeSnapshot('A', {id:'A',status:'active',channel:'chat',client_name:'Slow A'}, [{id:'a-late',sender_id:'client-a',content:'late A history'}]);
assert.equal(runtime.focusedRoomId, 'B', 'a late detail/history response cannot reclaim focus');
assert.deepEqual(elements.panel.rows, ['b-history','b-recovered','b1','b2','b3'], 'a late background snapshot cannot replace the focused DOM');

socket.receive({type:'session_accepted',session_id:'C',session:{id:'C',status:'active',channel:'chat'}});
assert.equal(runtime.focusedRoomId, 'B', 'a background accepted session does not steal focus');
assert(runtime.desiredRoomIds.has('C'), 'an accepted background chat becomes a desired subscription');
assert.equal(sent(socket, 'session_subscribe').filter((item) => item.session_id === 'C').length, 1,
  'the accepted background chat is subscribed once');
assert.equal(runtime.subscribedRoomIds.has('C'), false, 'a sent subscription is not treated as joined before its ACK');
socket.receive({type:'session_subscribed',session_id:'C',subscribed:true,session:{id:'C',status:'active',channel:'chat'},history:[]});
assert.equal(runtime.subscribedRoomIds.has('C'), true, 'the subscription ACK makes the room live');
socket.receive({type:'error',code:'session_message_id_conflict',status:409,session_id:'C',sessionId:'C',client_message_id:'conflict-id',message:'conflict'});
assert.equal(runtime.roomsById.C.lastError.code, 'session_message_id_conflict', 'the stable cross-transport message conflict code is retained');
assert.equal(runtime.roomsById.C.lastError.client_message_id, 'conflict-id', 'message conflict correlation stays room-keyed');
assert(runtime.subscribedRoomIds.has('C'), 'a message-id conflict does not discard the room subscription');

const cleanupBeforeBackgroundEnd = rtc.cleanupCalls;
socket.receive({type:'session_ended',session_id:'A',event_id:'end-A',session:{id:'A',status:'ended'}});
socket.receive({type:'session_ended',session_id:'A',event_id:'end-A',session:{id:'A',status:'ended'}});
assert.equal(runtime.roomsById.A.terminal, true, 'an off-focus End marks only that room terminal');
assert.equal(runtime.focusedRoomId, 'B', 'an off-focus End preserves focus');
assert.equal(globals._sid, 'B', 'an off-focus End preserves legacy focus globals');
assert.equal(rtc.cleanupCalls, cleanupBeforeBackgroundEnd, 'an off-focus End never cleans the focused RTC owner');
assert.equal(sent(socket, 'session_unsubscribe').filter((item) => item.session_id === 'A').length, 1,
  'a repeated terminal event unsubscribes the ended room once');

socket.receive({type:'typing',session_id:'C',sender_id:'client-c',is_typing:true});
assert.equal(elements.typing.textContent, '', 'background typing does not render in the focused room');
focus('C');
assert.equal(elements.typing.textContent, 'typing...', 'switching focus renders current keyed typing state');
clock.advance(1800);
assert.equal(runtime.roomsById.C.typing, null, 'typing state expires on its room timer');
assert.equal(elements.typing.textContent, '', 'focused typing UI clears on expiry');

socket.receive({type:'session_request',session:{id:'P1',channel:'chat'},client:{name:'One'}});
socket.receive({type:'session_request',session:{id:'P2',channel:'chat'},client:{name:'Two'}});
socket.receive({type:'session_request',session:{id:'P1',channel:'chat'},client:{name:'One'}});
assert.deepEqual(hostArray(runtime.pendingIds()), ['P1','P2'], 'simultaneous requests are queued and deduplicated by SID');
assert.equal(elements.request.dataset.sessionId, 'P1', 'the first keyed request is shown without replacing the active focused session');
assert.equal(runtime.focusedRoomId, 'C', 'showing a pending request leaves the live-panel focus unchanged');
runtime.clearPending('P1');
assert.deepEqual(hostArray(runtime.pendingIds()), ['P2'], 'clearing one request preserves the other keyed request');
assert.equal(elements.notif.textContent, '1', 'the aggregate badge retains the remaining pending request');

runtime.setRtcSession('R');
assert.equal(runtime.rtcSessionId, 'R', 'RTC has one explicit session focus');
assert.equal(sent(socket, 'join').at(-1).session_id, 'R', 'the media focus alone uses the legacy RTC room join');
assert.equal(runtime.rtcJoinedSessionId, '', 'sending join does not optimistically claim RTC membership');
socket.receive({type:'error',code:'realtime_backpressure',retryable:true,action_type:'join',session_id:'R'});
assert.equal(runtime.rtcJoinPendingSessionId, '', 'a correlated retryable join error releases only RTC join ownership');
clock.advance(499);
assert.equal(sent(socket, 'join').filter((item) => item.session_id === 'R').length, 1, 'RTC retry observes bounded backoff');
clock.advance(1);
assert.equal(sent(socket, 'join').filter((item) => item.session_id === 'R').length, 2, 'RTC retry is issued without replaying chat subscriptions');
socket.receive({type:'joined',session_id:'R',session:{id:'R',status:'active',channel:'video'},history:[]});
assert.equal(runtime.rtcJoinedSessionId, 'R', 'only a joined ACK establishes RTC room ownership');
socket.receive({type:'rtc_offer',sdp:'missing-room'});
socket.receive({type:'rtc_offer',session_id:'B',sdp:'wrong-room'});
socket.receive({type:'rtc_offer',session_id:'R',sdp:'right-room'});
socket.receive({type:'rtc_ice',session_id:'R',candidate:{candidate:'ice-R'}});
assert.deepEqual(rtc.offers, ['right-room'], 'only an explicitly identified matching RTC room reaches media handlers');
assert.equal(rtc.ice.length, 1, 'matching RTC ICE reaches media handlers');
runtime.setRtcSession('');
socket.receive({type:'rtc_offer',session_id:'R',sdp:'no-focus'});
assert.deepEqual(rtc.offers, ['right-room'], 'RTC signals are ignored rather than buffered when no RTC focus exists');

runtime.setRtcSession('R');
socket.receive({type:'joined',session_id:'R',session:{id:'R',status:'active',channel:'video'},history:[]});
const terminalCleanupBaseline = rtc.cleanupCalls;
for(const terminalStatus of ['cancelled','ended','completed','failed','expired','declined','no_show']) {
  const terminalSid = `TERMINAL-${terminalStatus}`;
  runtime.subscribeRoom(terminalSid);
  socket.receive({type:'session_subscribed',session_id:terminalSid,subscribed:false,terminal:true,session:{id:terminalSid,status:terminalStatus,channel:'chat'},history:[]});
  assert.equal(runtime.roomsById[terminalSid].terminal, true, `${terminalStatus} is terminal in the room store`);
  assert.equal(runtime.desiredRoomIds.has(terminalSid), false, `${terminalStatus} removes only its desired room`);
  assert.equal(runtime.focusedRoomId, 'C', `${terminalStatus} cannot steal or clear another focused chat`);
  assert.equal(runtime.rtcSessionId, 'R', `${terminalStatus} cannot clear another RTC focus`);
}
assert.equal(rtc.cleanupCalls, terminalCleanupBaseline, 'all off-focus terminal statuses preserve focused media and timers');
runtime.subscribeRoom('NOT-TERMINAL-CANCELED');
socket.receive({type:'session_subscribed',session_id:'NOT-TERMINAL-CANCELED',subscribed:true,session:{id:'NOT-TERMINAL-CANCELED',status:'canceled',channel:'chat'},history:[]});
assert.equal(runtime.roomsById['NOT-TERMINAL-CANCELED'].terminal, false, 'one-l canceled is not silently promoted into backend terminal state');
runtime.unsubscribeRoom('NOT-TERMINAL-CANCELED');
const principalGenerationBeforeRotation = runtime.principalGeneration;
const credentialGenerationBeforeRotation = runtime.credentialGeneration;
const roomIdsBeforeRotation = Object.keys(runtime.roomsById).sort();
identity.token = 'expert-token-a-rotated';
runtime.checkIdentity();
assert.equal(socket.readyState, FakeWebSocket.CLOSED, 'same-principal token rotation closes the credential-owned transport');
assert.equal(runtime.principalGeneration, principalGenerationBeforeRotation, 'token rotation does not change principal generation');
assert.equal(runtime.credentialGeneration, credentialGenerationBeforeRotation + 1, 'token rotation advances credential generation');
assert.deepEqual(Object.keys(runtime.roomsById).sort(), roomIdsBeforeRotation, 'token rotation preserves keyed room state');
assert.deepEqual(hostArray(runtime.pendingIds()), ['P2'], 'token rotation preserves pending requests for the same expert');
assert.equal(runtime.focusedRoomId, 'C', 'token rotation preserves focused chat');
assert.equal(runtime.rtcSessionId, 'R', 'token rotation preserves media focus');
assert.equal(FakeWebSocket.instances.length, 3, 'same-principal rotation creates exactly one replacement transport');
const rotatedSocket = FakeWebSocket.instances[2];
rotatedSocket.open();
assert.deepEqual(sent(rotatedSocket, 'auth').map((item) => item.token), ['expert-token-a-rotated'],
  'replacement transport authenticates only with the rotated token');
assert(sent(rotatedSocket, 'join').find((item) => item.session_id === 'R'), 'RTC join is replayed for the preserved media focus');
assert(rotatedSocket.sent.findIndex((item) => item.type === 'join') < rotatedSocket.sent.findIndex((item) => item.type === 'session_subscribe'),
  'one RTC join is prioritized before paced chat replay');
socket.receive({type:'message',session_id:'C',id:'stale-credential',sender_id:'client-c',content:'stale credential'});
assert.equal(runtime.roomsById.C.messages.some((message) => message.id === 'stale-credential'), false,
  'responses from the pre-rotation credential are fenced');

identity.token = 'expert-token-b';
identity.accountId = 'expert-b';
runtime.checkIdentity();
assert.equal(rotatedSocket.readyState, FakeWebSocket.CLOSED, 'principal change closes the canonical socket');
assert.equal(globals._expertWs, null, 'identity reset releases the legacy socket facade');
assert.deepEqual(Object.keys(runtime.roomsById), [], 'identity reset clears every private room');
assert.deepEqual(hostArray(runtime.pendingIds()), [], 'identity reset clears pending requests');
assert.equal(runtime.focusedRoomId, '', 'identity reset clears UI focus');
assert.equal(runtime.rtcSessionId, '', 'identity reset clears RTC focus');
rotatedSocket.receive({type:'message',session_id:'B',id:'post-reset-old',sender_id:'client-b',content:'stale'});
assert.deepEqual(Object.keys(runtime.roomsById), [], 'a closed old socket cannot repopulate the next account');

runtime.connect();
assert.equal(FakeWebSocket.instances.length, 4, 'the next expert account gets one fresh socket');
FakeWebSocket.instances[3].open();
assert.deepEqual(sent(FakeWebSocket.instances[3], 'auth').map((item) => item.token), ['expert-token-b'],
  'the new socket authenticates only with the new account token');

const socketsBeforeClient = FakeWebSocket.instances.length;
const clientIdentity = {token:'client-token',accountId:'client-a',role:'client'};
const clientRuntime = factory.create({
  WebSocket:FakeWebSocket,
  wsUrl:'wss://staging.example/ws',
  setTimeout:clock.setTimeout.bind(clock),
  clearTimeout:clock.clear.bind(clock),
  getIdentity:() => clientIdentity,
});
clientRuntime.subscribeRoom('client-session');
clientRuntime.connect();
assert.equal(FakeWebSocket.instances.length, socketsBeforeClient, 'the expert runtime creates no socket for a client identity');

const paceClock = new FakeClock();
const PaceWebSocket = fakeSocketClass();
const paceFactory = evaluateRuntime(paceClock, PaceWebSocket);
const paceRuntime = paceFactory.create({
  WebSocket:PaceWebSocket,
  wsUrl:'wss://staging.example/ws',
  setTimeout:paceClock.setTimeout.bind(paceClock),
  clearTimeout:paceClock.clear.bind(paceClock),
  getIdentity:() => ({token:'pace-token',accountId:'pace-expert',role:'expert'}),
  random:() => 0,
  maxSubscriptionAttempts:3,
});
for(let number = 1; number <= 40; number += 1) paceRuntime.subscribeRoom(`ROOM-${number}`);
paceRuntime.setRtcSession('RTC-PRIORITY');
const paceSocket = PaceWebSocket.instances[0];
paceSocket.open();
assert.equal(sent(paceSocket, 'session_subscribe').length, 8, 'more than 32 desired rooms still emits only eight unacknowledged subscribes');
assert.equal(paceRuntime.inFlightSubscriptionIds.size, 8);
assert.equal(paceRuntime.subscribedRoomIds.size, 0, 'no replayed room is subscribed before ACK');
assert.equal(paceSocket.sent[0].type, 'auth');
assert.equal(paceSocket.sent[1].type, 'join', 'RTC focus is sent before the paced chat queue');
assert.equal(paceSocket.sent[1].session_id, 'RTC-PRIORITY');
paceSocket.receive({type:'error',code:'realtime_rate_limited',retryable:true,action_type:'session_subscribe',session_id:'ROOM-1'});
assert.equal(paceRuntime.desiredRoomIds.has('ROOM-1'), true, 'correlated rate limiting keeps the room desired for retry');
assert.equal(paceRuntime.inFlightSubscriptionIds.size, 8, 'another queued room fills the released slot without exceeding eight');
paceClock.advance(500);
assert.equal(sent(paceSocket, 'session_subscribe').filter((item) => item.session_id === 'ROOM-1').length, 1,
  'a due retry waits when all eight slots are occupied');
paceSocket.receive({type:'session_subscribed',session_id:'ROOM-2',subscribed:true,session:{id:'ROOM-2',status:'active',channel:'chat'},history:[]});
assert.equal(sent(paceSocket, 'session_subscribe').filter((item) => item.session_id === 'ROOM-1').length, 2,
  'an ACK releases one slot to the bounded retry queue');
paceSocket.receive({type:'error',code:'session_subscription_limit',retryable:false,action_type:'session_subscribe',session_id:'ROOM-3'});
assert.equal(paceRuntime.desiredRoomIds.has('ROOM-3'), false, 'subscription limit is permanent until caller explicitly requests again');
assert.equal(paceRuntime.roomsById['ROOM-3'].subscriptionError.code, 'session_subscription_limit');
const paceAcked = new Set(['ROOM-2']);
let paceGuard = 0;
while(paceGuard++ < 100){
  assert(paceRuntime.inFlightSubscriptionIds.size <= 8, 'ACK pumping never exceeds eight in flight');
  const nextSid = hostArray(paceRuntime.inFlightSubscriptionIds).find((sid) => sid !== 'ROOM-3' && !paceAcked.has(sid));
  if(!nextSid) break;
  paceAcked.add(nextSid);
  paceSocket.receive({type:'session_subscribed',session_id:nextSid,subscribed:true,session:{id:nextSid,status:'active',channel:'chat'},history:[]});
}
assert(paceGuard < 100, 'paced queue drains without a restart loop');
assert.equal(paceRuntime.inFlightSubscriptionIds.size, 0, 'every desired room eventually gets one terminal subscription response');
assert.equal(paceRuntime.subscribedRoomIds.size, 39, 'all rooms except the permanent-limit rejection are subscribed');
paceSocket.receive({type:'joined',session_id:'RTC-PRIORITY',session:{id:'RTC-PRIORITY',status:'active',channel:'video'},history:[]});
assert.equal(paceRuntime.rtcJoinedSessionId, 'RTC-PRIORITY', 'RTC membership is ACK-owned independently of chat replay');

const retryClock = new FakeClock();
const RetryWebSocket = fakeSocketClass();
const retryRuntime = evaluateRuntime(retryClock, RetryWebSocket).create({
  WebSocket:RetryWebSocket,wsUrl:'wss://staging.example/ws',setTimeout:retryClock.setTimeout.bind(retryClock),clearTimeout:retryClock.clear.bind(retryClock),
  getIdentity:() => ({token:'retry-token',accountId:'retry-expert',role:'expert'}),random:() => 0,maxSubscriptionAttempts:2,
});
retryRuntime.subscribeRoom('RETRY-CHAT');
retryRuntime.setRtcSession('RETRY-RTC');
const retrySocket = RetryWebSocket.instances[0];
retrySocket.open();
retrySocket.receive({type:'error',code:'realtime_backpressure',retryable:true,action_type:'session_subscribe',session_id:'RETRY-CHAT'});
retrySocket.receive({type:'error',code:'realtime_rate_limited',retryable:true,action_type:'join',session_id:'RETRY-RTC'});
retryClock.advance(500);
assert.equal(sent(retrySocket,'session_subscribe').filter((item) => item.session_id === 'RETRY-CHAT').length, 2);
assert.equal(sent(retrySocket,'join').filter((item) => item.session_id === 'RETRY-RTC').length, 2);
retrySocket.receive({type:'error',code:'realtime_backpressure',retryable:true,action_type:'session_subscribe',session_id:'RETRY-CHAT'});
retrySocket.receive({type:'error',code:'realtime_rate_limited',retryable:true,action_type:'join',session_id:'RETRY-RTC'});
retryClock.advance(60000);
assert.equal(sent(retrySocket,'session_subscribe').filter((item) => item.session_id === 'RETRY-CHAT').length, 2,
  'subscription backpressure retries stop at the configured bound');
assert.equal(retryRuntime.desiredRoomIds.has('RETRY-CHAT'), false, 'retry exhaustion leaves the failed chat non-desired and inspectable');
assert.equal(retryRuntime.roomsById['RETRY-CHAT'].subscriptionError.retry_exhausted, true);
assert.equal(sent(retrySocket,'join').filter((item) => item.session_id === 'RETRY-RTC').length, 2,
  'RTC join retries also stop at the configured bound');
assert.equal(retryRuntime.rtcJoinPendingSessionId, '', 'RTC exhaustion cannot remain optimistically pending');

const recoveryClock = new FakeClock();
const RecoveryWebSocket = fakeSocketClass();
const recoveryFactory = evaluateRuntime(recoveryClock, RecoveryWebSocket);
const recoveryIdentity = {token:'expert-recovery-token',accountId:'expert-recovery',role:'expert'};
const recoveryRuntime = recoveryFactory.create({
  WebSocket:RecoveryWebSocket,
  wsUrl:'wss://staging.example/ws',
  setTimeout:recoveryClock.setTimeout.bind(recoveryClock),
  clearTimeout:recoveryClock.clear.bind(recoveryClock),
  reconnectDelayMs:1800,
  getIdentity:() => recoveryIdentity,
  isOwnMessage:() => false,
});
recoveryRuntime.focusRoom('FOCUS');
recoveryRuntime.subscribeRoom('GAP');
const recoveryInitialSocket = RecoveryWebSocket.instances[0];
recoveryInitialSocket.open();
recoveryInitialSocket.receive({
  type:'session_subscribed',session_id:'GAP',subscribed:true,
  session:{id:'GAP',status:'active',channel:'chat'},
  history:historyRange(101,200,'initial'),
  history_page:{has_more:true,next_cursor:'101'},
});
assert.equal(sent(recoveryInitialSocket, 'session_history').length, 0,
  'an initial bounded room snapshot retains its cursor without automatically loading all older history');
assert.equal(recoveryRuntime.roomsById.GAP.historyPage.next_cursor, '101');

recoveryInitialSocket.serverClose();
recoveryClock.advance(1800);
const recoverySocket = RecoveryWebSocket.instances[1];
recoverySocket.open();
recoverySocket.receive({type:'message',session_id:'GAP',id:'live-before-ack-450',room_sequence:450,sender_id:'client-gap',content:'live before subscription ack'});
recoverySocket.receive({
  type:'session_subscribed',session_id:'GAP',subscribed:true,already_subscribed:false,
  session:{id:'GAP',status:'active',channel:'chat'},
  history:historyRange(401,500,'newest'),
  history_page:{has_more:true,next_cursor:'401'},
});
assert.deepEqual(sent(recoverySocket, 'session_history').map((request) => [request.session_id,request.before_sequence]), [['GAP','401']],
  'a disjoint reconnect page starts exactly one explicit cursor request for its own room');

recoverySocket.receive({
  type:'session_history_page',session_id:'OTHER',sessionId:'OTHER',before_sequence:'401',
  history:[{id:'wrong-room',room_sequence:999,sender_id:'client-other',content:'wrong room'}],
  history_page:{has_more:false,next_cursor:null},
});
assert.equal(recoveryRuntime.roomsById.GAP.messages.some((message) => message.id === 'wrong-room'), false,
  'a history page for another SID can never enter the recovering room');
assert.equal(recoveryRuntime.roomsById.OTHER.messages.length, 0,
  'an unsolicited room history page is not merged without that room owning the cursor request');

recoverySocket.receive({type:'message',session_id:'GAP',id:'live-race-350',room_sequence:350,sender_id:'client-gap',content:'live during recovery'});
recoverySocket.receive({type:'message',session_id:'GAP',id:'live-after-newest',room_sequence:501,sender_id:'client-gap',content:'new live message'});
assert.equal(sent(recoverySocket, 'session_history').length, 1,
  'live arrivals do not create parallel history requests while one cursor is in flight');
recoverySocket.receive({
  type:'session_history_page',session_id:'GAP',sessionId:'GAP',before_sequence:'401',
  history:historyRange(301,400,'page-one'),
  history_page:{has_more:true,next_cursor:'301'},
});
assert.deepEqual(sent(recoverySocket, 'session_history').map((request) => request.before_sequence), ['401','301'],
  'history recovery serializes the next request after the prior page arrives');
recoverySocket.receive({
  type:'session_history_page',session_id:'GAP',sessionId:'GAP',before_sequence:'301',
  history:historyRange(201,300,'page-two'),
  history_page:{has_more:true,next_cursor:'201'},
});
assert.deepEqual(sent(recoverySocket, 'session_history').map((request) => request.before_sequence), ['401','301','201'],
  'a gap larger than 100 messages keeps paging with strictly decreasing cursors');
recoverySocket.receive({
  type:'session_history_page',session_id:'GAP',sessionId:'GAP',before_sequence:'201',
  history:historyRange(101,200,'overlap'),
  history_page:{has_more:true,next_cursor:'101'},
});
assert.equal(sent(recoverySocket, 'session_history').length, 3,
  'recovery stops when a page overlaps the pre-reconnect anchor instead of following older history');
const recoveredSequences = hostArray(recoveryRuntime.roomsById.GAP.messages).map((message) => Number(message.room_sequence));
assert.deepEqual(recoveredSequences, Array.from({length:401}, (_, index) => index + 101),
  'older pages merge chronologically around live arrivals without gaps or duplicates');
assert.equal(recoveryRuntime.roomsById.GAP.messages.find((message) => Number(message.room_sequence) === 350).id, 'live-race-350',
  'a live arrival wins the canonical sequence race against a later history copy');
assert.equal(recoveryRuntime.roomsById.GAP.messages.find((message) => Number(message.room_sequence) === 450).id, 'live-before-ack-450',
  'a live arrival before the reconnect ack cannot masquerade as the pre-reconnect overlap anchor');
assert.equal(recoveryRuntime.roomsById.GAP.unread, 301,
  'only the 301 unique messages missed or received after reconnect become unread');
assert.equal(recoveryRuntime.roomsById.GAP.historyRecovery.completedReason, 'overlap');

recoveryRuntime.subscribeRoom('NONPROGRESS');
recoverySocket.receive({
  type:'session_subscribed',session_id:'NONPROGRESS',subscribed:true,
  session:{id:'NONPROGRESS',status:'active',channel:'chat'},history:historyRange(1,100,'np-initial'),
  history_page:{has_more:false,next_cursor:null},
});
recoverySocket.receive({
  type:'session_subscribed',session_id:'NONPROGRESS',subscribed:true,already_subscribed:true,
  session:{id:'NONPROGRESS',status:'active',channel:'chat'},history:historyRange(201,300,'np-newest'),
  history_page:{has_more:true,next_cursor:'201'},
});
recoverySocket.receive({
  type:'session_history_page',session_id:'NONPROGRESS',before_sequence:'201',history:historyRange(101,200,'np-page'),
  history_page:{has_more:true,next_cursor:'201'},
});
assert.equal(sent(recoverySocket, 'session_history').filter((request) => request.session_id === 'NONPROGRESS').length, 1,
  'a non-decreasing cursor is detected without issuing a looping request');
assert.equal(recoveryRuntime.roomsById.NONPROGRESS.historyRecovery.completedReason, 'non_progress');

recoveryRuntime.subscribeRoom('EMPTY-ANCHOR');
recoverySocket.receive({
  type:'session_subscribed',session_id:'EMPTY-ANCHOR',subscribed:true,
  session:{id:'EMPTY-ANCHOR',status:'active',channel:'chat'},history:[],history_page:{has_more:false,next_cursor:null},
});
assert.equal(recoveryRuntime.roomsById['EMPTY-ANCHOR'].subscriptionSnapshotLoaded, true, 'an empty first snapshot is still a loaded reconnect anchor');
recoverySocket.serverClose();
recoveryClock.advance(1800);
const emptyReconnectSocket = RecoveryWebSocket.instances[2];
emptyReconnectSocket.open();
emptyReconnectSocket.receive({
  type:'session_subscribed',session_id:'EMPTY-ANCHOR',subscribed:true,
  session:{id:'EMPTY-ANCHOR',status:'active',channel:'chat'},history:historyRange(101,200,'empty-newest'),
  history_page:{has_more:true,next_cursor:'101'},
});
assert.deepEqual(sent(emptyReconnectSocket, 'session_history').filter((item) => item.session_id === 'EMPTY-ANCHOR').map((item) => item.before_sequence), ['101'],
  'a previously loaded empty room recovers a disjoint reconnect page');
emptyReconnectSocket.receive({
  type:'session_history_page',session_id:'EMPTY-ANCHOR',before_sequence:'101',history:[],
  history_page:{has_more:false,next_cursor:null},
});
assert.equal(recoveryRuntime.roomsById['EMPTY-ANCHOR'].historyRecovery.completedReason, 'complete');

function createBudgetRecovery(overrides = {}) {
  const budgetClock = new FakeClock();
  const BudgetWebSocket = fakeSocketClass();
  const budgetFactory = evaluateRuntime(budgetClock, BudgetWebSocket);
  const budgetRuntime = budgetFactory.create({
    WebSocket:BudgetWebSocket,
    wsUrl:'wss://staging.example/ws',
    setTimeout:budgetClock.setTimeout.bind(budgetClock),
    clearTimeout:budgetClock.clear.bind(budgetClock),
    reconnectDelayMs:100,
    getIdentity:() => ({token:'budget-token',accountId:'budget-expert',role:'expert'}),
    ...overrides,
  });
  budgetRuntime.subscribeRoom('BUDGET');
  const initial = BudgetWebSocket.instances[0];
  initial.open();
  initial.receive({type:'session_subscribed',session_id:'BUDGET',subscribed:true,session:{id:'BUDGET',status:'active',channel:'chat'},history:historyRange(1,100,'budget-anchor'),history_page:{has_more:false,next_cursor:null}});
  initial.serverClose();
  budgetClock.advance(100);
  const reconnect = BudgetWebSocket.instances[1];
  reconnect.open();
  reconnect.receive({type:'session_subscribed',session_id:'BUDGET',subscribed:true,session:{id:'BUDGET',status:'active',channel:'chat'},history:historyRange(401,500,'budget-newest'),history_page:{has_more:true,next_cursor:'401'}});
  return {budgetClock,BudgetWebSocket,budgetRuntime,reconnect};
}

const pageBudget = createBudgetRecovery({historyRecoveryMaxPages:2,historyRecoveryMaxMessages:1000,historyRecoveryMaxMs:10000});
pageBudget.reconnect.receive({type:'session_history_page',session_id:'BUDGET',before_sequence:'401',history:historyRange(301,400,'budget-page-one'),history_page:{has_more:true,next_cursor:'301'}});
pageBudget.reconnect.receive({type:'session_history_page',session_id:'BUDGET',before_sequence:'301',history:historyRange(201,300,'budget-page-two'),history_page:{has_more:true,next_cursor:'201'}});
const exhaustedRecovery = pageBudget.budgetRuntime.roomsById.BUDGET.historyRecovery;
assert.equal(exhaustedRecovery.active, false);
assert.equal(exhaustedRecovery.truncated, true, 'page budget leaves an explicit truncated state');
assert.equal(exhaustedRecovery.budget_exhausted, true, 'page budget has a deterministic terminal marker');
assert.equal(exhaustedRecovery.deferredCursor, '201', 'budget exhaustion retains the exact unapplied continuation cursor');
assert.equal(exhaustedRecovery.completedReason, 'budget_pages');
const requestsAtExhaustion = sent(pageBudget.reconnect, 'session_history').length;
pageBudget.budgetClock.advance(120000);
assert.equal(sent(pageBudget.reconnect, 'session_history').length, requestsAtExhaustion,
  'budget exhaustion never auto-restarts on a timer');
pageBudget.reconnect.receive({type:'session_subscribed',session_id:'BUDGET',subscribed:true,already_subscribed:true,session:{id:'BUDGET',status:'active',channel:'chat'},history:historyRange(601,700,'budget-repeat'),history_page:{has_more:true,next_cursor:'601'}});
assert.equal(sent(pageBudget.reconnect, 'session_history').length, requestsAtExhaustion,
  'repeated snapshots in the same reconnect generation cannot restart an exhausted recovery');

const messageBudget = createBudgetRecovery({historyRecoveryMaxPages:8,historyRecoveryMaxMessages:50,historyRecoveryMaxMs:10000});
messageBudget.reconnect.receive({type:'session_history_page',session_id:'BUDGET',before_sequence:'401',history:historyRange(301,400,'message-budget'),history_page:{has_more:true,next_cursor:'301'}});
assert.equal(messageBudget.budgetRuntime.roomsById.BUDGET.historyRecovery.completedReason, 'budget_messages', 'message budget is reported distinctly');

const timeBudget = createBudgetRecovery({historyRecoveryMaxPages:8,historyRecoveryMaxMessages:1000,historyRecoveryMaxMs:250});
timeBudget.budgetClock.advance(250);
timeBudget.reconnect.receive({type:'session_history_page',session_id:'BUDGET',before_sequence:'401',history:historyRange(301,400,'time-budget'),history_page:{has_more:true,next_cursor:'301'}});
assert.equal(timeBudget.budgetRuntime.roomsById.BUDGET.historyRecovery.completedReason, 'budget_time', 'wall-clock recovery budget is reported distinctly');

const rtcAssignment = html.match(/window\._handleRTCMessage=function\(d\)\{[\s\S]*?\n\};\n<\/script>/);
assert(rtcAssignment, 'the production RTC router is extractable');
const strictRtcCalls = [];
const rtcSandbox = {
  console,
  document,
  window:null,
  OB_RTC:{
    getSid:() => '',
    handleOffer:(sdp) => strictRtcCalls.push(sdp),
    handleAnswer() {}, handleIce() {}, handleReady() {},
  },
  _obExpertRealtime:{
    rtcSessionId:'',
    checkIdentity() {},
    isExpertIdentity:() => true,
  },
};
rtcSandbox.window = rtcSandbox;
vm.createContext(rtcSandbox);
new vm.Script(rtcAssignment[0].replace(/\n<\/script>$/, ''), {filename:'strict-rtc-router.js'}).runInContext(rtcSandbox);
rtcSandbox._handleRTCMessage({type:'rtc_offer',session_id:'R',sdp:'ignored-without-focus'});
rtcSandbox._obExpertRealtime.rtcSessionId = 'R';
rtcSandbox._handleRTCMessage({type:'rtc_offer',session_id:'B',sdp:'ignored-other-room'});
rtcSandbox._handleRTCMessage({type:'rtc_offer',session_id:'R',sdp:'accepted'});
assert.deepEqual(strictRtcCalls, ['accepted'], 'the production RTC router enforces explicit expert RTC focus');
rtcSandbox._obExpertRealtime.isExpertIdentity = () => false;
rtcSandbox._handleRTCMessage({type:'rtc_offer',session_id:'client-room',sdp:'client-prestart'});
assert.deepEqual(strictRtcCalls, ['accepted','client-prestart'], 'client pre-start RTC buffering behavior remains unchanged');

const panelFunctions = html.match(/function dedupePanelMessages\(panelId\)\{[\s\S]*?window\.appendPanelMessage = appendPanelMessage;/);
assert(panelFunctions, 'durable panel dedupe functions are extractable');
const domClock = new FakeClock();
const messageBox = {id:'expert-chat-messages',dataset:{obSessionId:'S'},children:[],_obSeen:{},scrollTop:0,scrollHeight:0};
Object.defineProperty(messageBox, 'innerHTML', {
  get() { return ''; },
  set() { messageBox.children.splice(0, messageBox.children.length); },
});
function fakeDeliveryBadge() {
  const attributes = new Map();
  return {
    style:{cssText:''},textContent:'',parentNode:null,
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || ''; },
  };
}
function appendFakeRow(key = '') {
  const attributes = new Map();
  const children = [];
  if(key) attributes.set('data-ob-msg-key', key);
  const row = {
    style:{opacity:''},title:'',children,
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || ''; },
    querySelector(selector) { return selector === '[data-ob-message-failed]' ? children.find((child) => child.getAttribute('data-ob-message-failed')) || null : null; },
    appendChild(child) { child.parentNode = row; children.push(child); return child; },
    removeChild(child) { const index = children.indexOf(child); if(index >= 0) children.splice(index, 1); child.parentNode = null; },
    remove() { const index = messageBox.children.indexOf(row); if(index >= 0) messageBox.children.splice(index, 1); },
  };
  messageBox.children.push(row);
  return row;
}
const panelSandbox = {
  console,
  URLSearchParams,
  location:{search:''},
  document:{
    getElementById:(id) => id === 'expert-chat-messages' ? messageBox : null,
    createElement:() => fakeDeliveryBadge(),
  },
  setTimeout:domClock.setTimeout.bind(domClock),
  clearTimeout:domClock.clear.bind(domClock),
  esc:(value) => String(value),
  _obExpertRealtime:{focusedRoomId:'S'},
  _obAppendMsg:() => appendFakeRow(),
};
panelSandbox.window = panelSandbox;
vm.createContext(panelSandbox);
new vm.Script(panelFunctions[0], {filename:'durable-panel-dedupe.js'}).runInContext(panelSandbox);
panelSandbox.appendPanelMessage('expert-chat-messages',{id:'same-text-1',session_id:'S',sender_id:'client',content:'same words'},false);
panelSandbox.appendPanelMessage('expert-chat-messages',{id:'same-text-2',session_id:'S',sender_id:'client',content:'same words'},false);
panelSandbox.appendPanelMessage('expert-chat-messages',{id:'same-text-1',session_id:'S',sender_id:'client',content:'same words'},false);
domClock.advance(30);
assert.deepEqual(messageBox.children.map((row) => row.getAttribute('data-ob-msg-key')), ['same-text-1','same-text-2'],
  'same text with different durable IDs is preserved while an exact ID duplicate is removed');
appendFakeRow('same-text-2');
panelSandbox.scheduleDedupe('expert-chat-messages');
domClock.advance(30);
assert.deepEqual(messageBox.children.map((row) => row.getAttribute('data-ob-msg-key')), ['same-text-1','same-text-2'],
  'late duplicate DOM nodes are removed only by durable identity');

const renderFocusedFunction = html.match(/function renderFocusedExpertRoom\(sid\)\{[\s\S]*?\n  \}\n\t  function syncExpertSession/);
assert(renderFocusedFunction, 'focused expert room renderer is extractable');
new vm.Script(renderFocusedFunction[0].replace(/\n\t  function syncExpertSession$/, ''), {filename:'focused-room-render.js'}).runInContext(panelSandbox);
const failedRuntimeMessage = {...optimisticMessage,session_id:'S'};
assert.equal(failedRuntimeMessage.delivery_status, 'failed', 'focused redraw consumes the object updated by real runtime ACK routing');
panelSandbox.expertRealtime = panelSandbox._obExpertRealtime = {focusedRoomId:'S',roomsById:{S:{messages:[failedRuntimeMessage],typing:null}}};
panelSandbox.myId = () => 'expert';
panelSandbox.renderFocusedExpertRoom('S');
assert.equal(messageBox.children.length, 1, 'focused room renders the failed runtime message once');
assert.equal(messageBox.children[0].getAttribute('data-ob-delivery-status'), 'failed', 'failed delivery state is rendered from runtime state');
assert.equal(messageBox.children[0].querySelector('[data-ob-message-failed]').textContent, 'Not sent', 'failed runtime message has a visible persistent badge');
panelSandbox.renderFocusedExpertRoom('S');
assert.equal(messageBox.children.length, 1, 'focus redraw rebuilds the room without duplicating it');
assert.equal(messageBox.children[0].getAttribute('data-ob-delivery-status'), 'failed', 'focus redraw preserves failed delivery status');
assert.match(messageBox.children[0].title, /session_not_active/, 'focus redraw preserves the failure reason');

const resumeSource = scriptById('ownlybiz-production-realtime-resume-v1');
function evaluateResume(savedPrincipal, currentAccount, currentToken = 'rotated-token', currentRole = 'expert') {
  const resumeClock = new FakeClock();
  const resumeStorage = createStorage({
    ob_t:currentToken,
    ob_u:JSON.stringify({id:currentAccount,role:currentRole}),
    ob_realtime_resume_state_v2:JSON.stringify({sid:'MEDIA',channel:'video',role:currentRole,principal_key:savedPrincipal,active:true,saved_at:Math.floor(resumeClock.now)}),
  });
  const rtcFocusCalls = [];
  const clientOpenCalls = [];
  const eventHandlers = {};
  const resumeSandbox = {
    console,
    Date:makeDate(resumeClock),
    JSON,
    Promise,
    sessionStorage:resumeStorage,
    localStorage:createStorage(),
    navigator:{},
    location:{pathname:'/dash/expert/live-session',search:''},
    document:{
      hidden:false,
      body:{appendChild() {}},
      querySelector:() => null,
      getElementById:() => null,
      addEventListener(name, handler) { eventHandlers[`document:${name}`] = handler; },
      createElement:() => ({className:'',innerHTML:'',querySelector:() => null}),
    },
    setTimeout:resumeClock.setTimeout.bind(resumeClock),
    clearTimeout:resumeClock.clear.bind(resumeClock),
    setInterval:resumeClock.setInterval.bind(resumeClock),
    clearInterval:resumeClock.clear.bind(resumeClock),
    addEventListener(name, handler) { eventHandlers[`window:${name}`] = handler; },
    _obExpertRealtime:{principalKey:`expert|${currentAccount}`,rtcSessionId:'',setRtcSession(sid) { this.rtcSessionId = sid; rtcFocusCalls.push(sid); }},
    OB_RTC:{getSid:() => '',getChannel:() => '',isActive:() => false},
    openClientChat:(sid) => clientOpenCalls.push(sid),
  };
  resumeSandbox.window = resumeSandbox;
  vm.createContext(resumeSandbox);
  new vm.Script(resumeSource, {filename:'principal-bound-resume.js'}).runInContext(resumeSandbox);
  return {resumeSandbox,resumeStorage,resumeClock,rtcFocusCalls,clientOpenCalls,eventHandlers};
}
const ownedResume = evaluateResume('expert|expert-resume','expert-resume','same-principal-rotated-token');
assert.deepEqual(ownedResume.rtcFocusCalls, ['MEDIA'], 'same-principal token rotation can restore its saved media focus');
const foreignResume = evaluateResume('expert|old-expert','new-expert','new-account-token');
assert.deepEqual(foreignResume.rtcFocusCalls, [], 'saved RTC focus is never restored into another expert principal');
assert.equal(foreignResume.resumeStorage.getItem('ob_realtime_resume_state_v2'), null, 'foreign RTC resume state is scrubbed on read');
const clientResume = evaluateResume('client|client-one','client-one','client-one-token','client');
assert.equal(clientResume.resumeSandbox._obRtcLastSid, 'MEDIA', 'owned client media is initially loaded into the in-memory resume closure');
clientResume.resumeStorage.setItem('ob_u', JSON.stringify({id:'client-two',role:'client'}));
clientResume.resumeStorage.setItem('ob_t', 'client-two-token');
clientResume.resumeSandbox.obProductionForceRealtimeResume();
assert.equal(clientResume.resumeStorage.getItem('ob_realtime_resume_state_v2'), null, 'foreign client storage is removed after an in-page principal switch');
assert.equal(clientResume.resumeSandbox._obRtcLastSid, '', 'foreign client in-memory RTC sid is cleared before restore returns');
assert.equal(clientResume.resumeSandbox._obRtcLastChannel, '', 'foreign client in-memory RTC channel is cleared with its sid');
assert.deepEqual(clientResume.clientOpenCalls, [], 'a principal switch cannot reopen the prior client session');
clientResume.eventHandlers['window:pagehide']();
assert.equal(clientResume.resumeStorage.getItem('ob_realtime_resume_state_v2'), null, 'pagehide cannot rebind the stale client sid to the new principal');
const endedClientResume = evaluateResume('client|ended-client-one','ended-client-one','ended-client-one-token','client');
endedClientResume.resumeStorage.setItem('ob_u', JSON.stringify({id:'ended-client-two',role:'client'}));
endedClientResume.resumeStorage.setItem('ob_t', 'ended-client-two-token');
endedClientResume.resumeSandbox._obSessionHasEnded = true;
endedClientResume.eventHandlers['window:pagehide']();
assert.equal(endedClientResume.resumeStorage.getItem('ob_realtime_resume_state_v2'), null, 'pagehide-first principal fencing removes foreign resume storage even while the old receipt is terminal');
assert.equal(endedClientResume.resumeSandbox._obRtcLastSid, '', 'ended-session early returns cannot retain the prior client RTC closure');
assert.deepEqual(endedClientResume.clientOpenCalls, [], 'pagehide-first fencing never reopens an ended foreign client session');

const miniCredentialBlock = html.match(/var miniSuiteState = \{[\s\S]*?\n  function miniSuiteRoot\(\)/);
assert(miniCredentialBlock, 'mini-suite credential runtime is extractable');
let resolveMiniFetch;
let miniMediaReleases = 0;
let miniRtcCleanupCalls = 0;
let miniRtcSid = '';
let miniRtcStartCalls = 0;
const miniRtcStartResolvers = [];
const miniNotifications = [];
const miniApp = {innerHTML:'<div>Initial mini shell</div>'};
const miniMediaWs = {readyState:1,onopen:null,onmessage:null,onerror:null,onclose:null,close() { this.readyState = 3; }};
const miniStorage = createStorage();
const miniSandbox = {
  console,
  JSON,
  Promise,
  URLSearchParams,
  atob,
  API_ROOT:'https://staging.example/api',
  location:{pathname:'/mini-suite/expert/one',search:'',hash:''},
  history:{replaceState() {}},
  sessionStorage:miniStorage,
  document:{getElementById:(id) => id === 'ob-mini-suite-app' ? miniApp : null},
  fetch:() => new Promise((resolve) => { resolveMiniFetch = resolve; }),
  mountMiniRtcSurface:() => true,
  waitForMiniSuiteMediaSocket:() => {
    miniMediaWs.readyState = 1;
    miniSandbox.miniSuiteState.ws = miniMediaWs;
    return Promise.resolve(miniMediaWs);
  },
  miniSuiteJoinOpenSession() {},
  notify(message, type) { miniNotifications.push({message,type}); },
  OB_RTC:{
    start(sid) {
      miniRtcStartCalls += 1;
      miniRtcSid = String(sid);
      return new Promise((resolve) => {
        miniRtcStartResolvers.push((value) => { miniRtcSid = String(sid); resolve(value); });
      });
    },
    cleanup() { miniRtcCleanupCalls += 1; miniRtcSid = ''; },
    getSid:() => miniRtcSid,
    getRole:() => 'expert',
  },
  releaseMiniRtcSurface(stopMedia) {
    miniMediaReleases += 1;
    const state = miniSandbox.miniSuiteState;
    if(!state) return;
    const sessionId = String(state.mediaSessionId || '');
    state.mediaStartGeneration = Number(state.mediaStartGeneration || 0) + 1;
    if(stopMedia && sessionId && miniRtcSid === sessionId) miniSandbox.OB_RTC.cleanup();
    if(sessionId && String(miniSandbox._obActiveSessId || '') === sessionId) miniSandbox._obActiveSessId = null;
    if(sessionId && String(miniSandbox._sid || '') === sessionId) miniSandbox._sid = null;
    state.mediaSessionId = '';
    state.mediaChannel = '';
    state.mediaStarting = false;
  },
};
miniSandbox.window = miniSandbox;
vm.createContext(miniSandbox);
new vm.Script(miniCredentialBlock[0].replace(/\n  function miniSuiteRoot\(\)$/, ''), {filename:'mini-credential-runtime.js'}).runInContext(miniSandbox);
function miniJwt(subject, nonce) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({alg:'none'})}.${encode({marketplace_expert_id:subject,nonce})}.signature`;
}
const miniTokenOne = miniJwt('mini-one',1);
const miniTokenRotated = miniJwt('mini-one',2);
const miniTokenOther = miniJwt('mini-two',1);
const miniTokenThird = miniJwt('mini-three',1);
const miniTokenThirdRotated = miniJwt('mini-three',2);
const miniTokenFourth = miniJwt('mini-four',1);
miniStorage.setItem('ob_mini_suite_token', miniTokenOne);
miniSandbox.setMiniSuiteToken(miniTokenOne);
miniSandbox.miniSuiteState.data = {private:'kept for same principal'};
miniSandbox.miniSuiteState.openSession = {id:'MINI-LIVE'};
miniSandbox.miniSuiteState.messages = [{id:'mini-message'}];
miniApp.innerHTML = '<div>PRIVATE MINI ONE</div>';
const oldMiniSocket = {readyState:1,onopen() {},onmessage() {},onerror() {},onclose() {},closeCalls:0,close() { this.closeCalls += 1; this.readyState = 3; }};
miniSandbox.miniSuiteState.ws = oldMiniSocket;
miniSandbox._expertWs = oldMiniSocket;
const miniGenerationBeforeRotation = miniSandbox.miniSuiteState.tokenGeneration;
miniStorage.setItem('ob_mini_suite_token', miniTokenRotated);
miniSandbox.setMiniSuiteToken(miniTokenRotated);
assert.equal(oldMiniSocket.closeCalls, 1, 'same-principal mini token rotation closes the prior signaling socket');
assert.equal(oldMiniSocket.onmessage, null, 'old mini socket handlers are detached before close');
assert.equal(miniSandbox._expertWs, null, 'mini socket rotation releases the shared signaling facade');
assert.equal(miniSandbox.miniSuiteState.tokenGeneration, miniGenerationBeforeRotation + 1);
assert.equal(miniSandbox.miniSuiteState.openSession.id, 'MINI-LIVE', 'same mini principal retains its live workspace state');
assert.match(miniApp.innerHTML, /PRIVATE MINI ONE/, 'same mini principal rotation retains the mounted workspace');
assert(miniMediaReleases >= 1, 'credential rotation releases principal-bound media ownership');

const staleMiniRequest = miniSandbox.miniApi('/sessions?limit=40');
miniStorage.setItem('ob_mini_suite_token', miniTokenOther);
miniSandbox.setMiniSuiteToken(miniTokenOther);
assert.doesNotMatch(miniApp.innerHTML, /PRIVATE MINI ONE/, 'new mini principal synchronously scrubs the prior mounted workspace');
assert.match(miniApp.innerHTML, /Loading suite/, 'new mini principal receives only a neutral loading shell');
resolveMiniFetch({ok:true,status:200,json:async () => ({sessions:[{id:'FOREIGN'}]})});
await assert.rejects(staleMiniRequest, (error) => error && error.code === 'mini_suite_context_stale',
  'an old mini credential response cannot populate the next principal');
assert.equal(miniSandbox.miniSuiteState.data, null, 'new mini principal atomically clears private suite data');
assert.equal(miniSandbox.miniSuiteState.openSession, null, 'new mini principal clears open session state');
assert.deepEqual(hostArray(miniSandbox.miniSuiteState.messages), [], 'new mini principal clears message state');

const miniStartMediaBlock = html.match(/window\.obMiniSuiteStartMedia = function\(\)\{[\s\S]*?\n  \};\n  window\.obMiniSuiteSaveProfile/);
assert(miniStartMediaBlock, 'mini-suite media starter is extractable');
new vm.Script(miniStartMediaBlock[0].replace(/\n  window\.obMiniSuiteSaveProfile$/, ''), {filename:'mini-media-start.js'}).runInContext(miniSandbox);
miniSandbox.miniSuiteState.openSession = {id:'MINI-MEDIA',channel:'video'};
const staleMiniMediaStart = miniSandbox.obMiniSuiteStartMedia();
for(let turn = 0; turn < 8 && !miniRtcStartResolvers.length; turn += 1) await Promise.resolve();
assert(miniRtcStartResolvers.length, 'mini media start is pending across an asynchronous RTC permission boundary');
const resolveFirstMiniRtcStart = miniRtcStartResolvers.shift();
const cleanupBeforeMiniSwitch = miniRtcCleanupCalls;
miniApp.innerHTML = '<div>PRIVATE MINI TWO MEDIA</div>';
miniStorage.setItem('ob_mini_suite_token', miniTokenThird);
miniSandbox.setMiniSuiteToken(miniTokenThird);
assert(miniRtcCleanupCalls > cleanupBeforeMiniSwitch, 'mini principal switch tears down the pending RTC owner immediately');
resolveFirstMiniRtcStart(true);
assert.equal(await staleMiniMediaStart, false, 'stale mini RTC start cannot succeed after a token-generation change');
assert.equal(miniRtcSid, '', 'a stale async mini RTC resolution is cleaned instead of reopening foreign media');
assert.equal(miniSandbox.miniSuiteState.mediaSessionId, '', 'stale mini media cannot reclaim the next principal state');
assert.equal(miniSandbox._obActiveSessId, null, 'stale mini media cannot restore old active-session globals');
assert.doesNotMatch(miniApp.innerHTML, /PRIVATE MINI TWO MEDIA/, 'media-owner principal switch also scrubs its mounted private DOM');
assert.equal(miniNotifications.length, 0, 'stale media completion does not leak a notification into the next principal');

miniSandbox.miniSuiteState.openSession = {id:'MINI-SAME-SID',channel:'voice'};
const oldSameSidStart = miniSandbox.obMiniSuiteStartMedia();
for(let turn = 0; turn < 8 && !miniRtcStartResolvers.length; turn += 1) await Promise.resolve();
const resolveOldSameSidStart = miniRtcStartResolvers.shift();
assert(resolveOldSameSidStart, 'old same-SID media generation reaches its async boundary');
miniStorage.setItem('ob_mini_suite_token', miniTokenThirdRotated);
miniSandbox.setMiniSuiteToken(miniTokenThirdRotated);
const successorSameSidStart = miniSandbox.obMiniSuiteStartMedia();
for(let turn = 0; turn < 8 && !miniRtcStartResolvers.length; turn += 1) await Promise.resolve();
const resolveSuccessorSameSidStart = miniRtcStartResolvers.shift();
assert(resolveSuccessorSameSidStart, 'rotated credential can start a successor generation for the same session');
resolveSuccessorSameSidStart(true);
assert.equal(await successorSameSidStart, true, 'current same-SID successor owns the media session');
const cleanupBeforeOldSameSidResolution = miniRtcCleanupCalls;
resolveOldSameSidStart(true);
assert.equal(await oldSameSidStart, false, 'older same-SID media generation remains stale after its late resolution');
assert.equal(miniRtcCleanupCalls, cleanupBeforeOldSameSidResolution, 'stale old completion cannot clean a newer same-SID media owner');
assert.equal(miniSandbox.miniSuiteState.mediaSessionId, 'MINI-SAME-SID', 'same-SID successor remains mounted after the old generation settles');
assert.equal(miniRtcSid, 'MINI-SAME-SID', 'same-SID successor RTC remains active after the old generation settles');

miniSandbox.releaseMiniRtcSurface(true);
let resolveMiniFreshCheck;
miniSandbox.obEnsureFreshRuntime = () => new Promise((resolve) => { resolveMiniFreshCheck = resolve; });
const rtcFreshnessBlock = html.match(/function wrapRtcFreshness\(\)\{[\s\S]*?\n  \}\n  wrapRtcFreshness\(\);/);
assert(rtcFreshnessBlock, 'RTC freshness wrapper is extractable');
new vm.Script(rtcFreshnessBlock[0], {filename:'rtc-freshness-guard.js'}).runInContext(miniSandbox);
miniSandbox.miniSuiteState.openSession = {id:'MINI-DELAYED-INVOKE',channel:'video'};
const startsBeforeFreshnessDelay = miniRtcStartCalls;
const delayedFreshnessStart = miniSandbox.obMiniSuiteStartMedia();
for(let turn = 0; turn < 8 && !resolveMiniFreshCheck; turn += 1) await Promise.resolve();
assert(resolveMiniFreshCheck, 'freshness fetch delays the underlying RTC invocation');
assert.equal(miniRtcStartCalls, startsBeforeFreshnessDelay, 'underlying RTC has not started while freshness is pending');
miniStorage.setItem('ob_mini_suite_token', miniTokenFourth);
miniSandbox.setMiniSuiteToken(miniTokenFourth);
resolveMiniFreshCheck(true);
assert.equal(await delayedFreshnessStart, false, 'freshness continuation refuses a stale mini credential generation');
assert.equal(miniRtcStartCalls, startsBeforeFreshnessDelay, 'stale delayed continuation never invokes underlying RTC media');
assert.equal(miniRtcSid, '', 'pre-invocation token switch leaves no foreign RTC media active');
assert.equal(miniSandbox.miniSuiteState.mediaSessionId, '', 'pre-invocation token switch cannot reclaim mini media state');

const outboxSource = scriptById('ownlybiz-chat-outbox-v2');
const outboxClock = new FakeClock();
const outboxStorage = createStorage({
  ob_t:'expert-outbox-token',
  ob_u:JSON.stringify({id:'expert-outbox',role:'expert'}),
});
const outboxInput = new FakeElement('expert-chat-input');
const outboxFetches = [];
let outboxMode = 'transient';
const outboxEvents = {};
const outboxIngests = [];
let outboxOptimisticRenders = 0;
const outboxRuntime = {focusedRoomId:'B',ingest(event) { outboxIngests.push({...event}); }};
const outboxSandbox = {
  console,
  Date:makeDate(outboxClock),
  Math,
  JSON,
  Promise,
  encodeURIComponent,
  atob,
  sessionStorage:outboxStorage,
  localStorage:createStorage(),
  navigator:{onLine:true},
  document:{getElementById:(id) => id === 'expert-chat-input' ? outboxInput : null},
  fetch:async (url, init) => {
    outboxFetches.push({url:String(url),body:JSON.parse(init.body)});
    if(outboxMode === 'transient') return {ok:false,status:503,json:async () => ({error:'temporary'})};
    if(typeof outboxMode === 'number') return {ok:false,status:outboxMode,json:async () => ({error:outboxMode === 409 ? 'session_message_id_conflict' : 'session_not_active'})};
    const body = JSON.parse(init.body);
    return {ok:true,status:200,json:async () => ({message:{id:`server-${body.client_message_id}`,client_message_id:body.client_message_id,room_sequence:17,sent_at:1700000017}})};
  },
  setTimeout:outboxClock.setTimeout.bind(outboxClock),
  clearTimeout:outboxClock.clear.bind(outboxClock),
  setInterval:outboxClock.setInterval.bind(outboxClock),
  clearInterval:outboxClock.clear.bind(outboxClock),
  _obExpertRealtime:outboxRuntime,
  appendPanelMessage() { outboxOptimisticRenders += 1; },
  sendExpertMsg() {},
  addEventListener(name, handler) { outboxEvents[name] = handler; },
};
outboxSandbox.window = outboxSandbox;
vm.createContext(outboxSandbox);
new vm.Script(outboxSource, {filename:'chat-outbox.js'}).runInContext(outboxSandbox);
outboxClock.advance(200);
outboxInput.value = 'send to B';
outboxSandbox.sendExpertMsg();
outboxRuntime.focusedRoomId = 'A';
for(let turn = 0; turn < 12; turn += 1) await Promise.resolve();
assert.match(outboxFetches[0].url, /\/api\/sessions\/B\/message$/,
  'an expert send captures its focused SID before an immediate focus switch');
const firstClientMessageId = outboxFetches[0].body.client_message_id;
assert(firstClientMessageId, 'the outbox gives the send a stable client_message_id');
assert.equal(JSON.parse(outboxStorage.getItem('ob_chat_outbox_v2')).length, 1, 'a transient failure queues the captured room send');
outboxMode = 'success';
outboxEvents.online();
outboxClock.advance(500);
for(let turn = 0; turn < 12; turn += 1) await Promise.resolve();
assert.match(outboxFetches[1].url, /\/api\/sessions\/B\/message$/,
  'outbox retry remains bound to B after focus moved to A');
assert.equal(outboxFetches[1].body.client_message_id, firstClientMessageId,
  'outbox retry preserves the original idempotency key');
assert.equal(JSON.parse(outboxStorage.getItem('ob_chat_outbox_v2')).length, 0, 'canonical success removes exactly the durable queued item');
assert(outboxIngests.some((event) => event.type === 'message_ack' && event.client_message_id === firstClientMessageId && event.id === `server-${firstClientMessageId}`),
  'REST success feeds canonical identity and sequence back into the optimistic room object');

for(const rejectionStatus of [403,409,410]) {
  outboxMode = rejectionStatus;
  outboxRuntime.focusedRoomId = 'REJECT';
  outboxInput.value = `reject ${rejectionStatus}`;
  outboxSandbox.sendExpertMsg();
  for(let turn = 0; turn < 12; turn += 1) await Promise.resolve();
  assert.equal(JSON.parse(outboxStorage.getItem('ob_chat_outbox_v2')).length, 0, `nonretryable ${rejectionStatus} does not remain queued`);
  const failed = outboxIngests.findLast((event) => event.delivery_status === 'failed');
  assert(failed && failed.client_message_id === outboxFetches.at(-1).body.client_message_id,
    `nonretryable ${rejectionStatus} marks the exact optimistic ID failed`);
}
assert.match(outboxSource, /_obApplyPanelMessageDelivery\(row, status, deliveryError\)/,
  'outbox delivery updates delegate to the shared persistent row renderer');
assert.match(html, /function applyPanelMessageDelivery[\s\S]*?data-ob-delivery-status[\s\S]*?Not sent/,
  'failed optimistic rows receive a visible, durable-ID-scoped delivery marker');

const currentOutboxPrincipal = 'expert|expert-outbox';
outboxStorage.setItem('ob_chat_outbox_v2', JSON.stringify(Array.from({length:50}, (_, index) => ({
  id:`capacity-${index}`,sid:'CAPACITY',content:`queued ${index}`,panelId:'expert-chat-messages',role:'expert',principal_key:currentOutboxPrincipal,queuedAt:index,
}))));
const rendersBeforeCapacity = outboxOptimisticRenders;
const fetchesBeforeCapacity = outboxFetches.length;
outboxInput.value = 'must remain in input';
assert.equal(outboxSandbox.sendExpertMsg(), false, 'full principal queue rejects before optimistic send');
assert.equal(outboxInput.value, 'must remain in input', 'backpressure preserves unsent input text');
assert.equal(outboxOptimisticRenders, rendersBeforeCapacity, 'backpressure performs no optimistic render');
assert.equal(outboxFetches.length, fetchesBeforeCapacity, 'backpressure performs no network send');
assert.equal(JSON.parse(outboxStorage.getItem('ob_chat_outbox_v2')).length, 50, 'capacity backpressure never slices an older queued message');

const foreignItem = {id:'foreign-message',sid:'FOREIGN',content:'private other account',panelId:'expert-chat-messages',role:'expert',principal_key:'expert|other-account',queuedAt:1};
outboxStorage.setItem('ob_chat_outbox_v2', JSON.stringify([foreignItem]));
outboxMode = 'success';
outboxEvents.online();
outboxClock.advance(500);
for(let turn = 0; turn < 12; turn += 1) await Promise.resolve();
assert.equal(outboxFetches.length, fetchesBeforeCapacity, 'an outbox item from another principal is never flushed with the current token');
assert.equal(JSON.parse(outboxStorage.getItem('ob_chat_outbox_v2'))[0].id, 'foreign-message', 'foreign principal data is not rewritten as current-account data');
const staleUserItem = {id:'stale-user-message',sid:'STALE',content:'old account',panelId:'expert-chat-messages',role:'expert',principal_key:currentOutboxPrincipal,queuedAt:2};
outboxStorage.setItem('ob_chat_outbox_v2', JSON.stringify([staleUserItem]));
outboxStorage.setItem('ob_t', `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({id:'next-expert',role:'expert'})).toString('base64url')}.signature`);
outboxEvents.online();
outboxClock.advance(500);
for(let turn = 0; turn < 12; turn += 1) await Promise.resolve();
assert.equal(outboxFetches.length, fetchesBeforeCapacity,
  'a new token subject cannot flush the old principal even before stale ob_u storage is replaced');
outboxSandbox._obClearExpertOutboxForPrincipalReset();
assert.deepEqual(JSON.parse(outboxStorage.getItem('ob_chat_outbox_v2')), [], 'principal reset atomically scrubs expert outbox state');

console.log('expert multi-chat runtime frontend smoke: ok');
