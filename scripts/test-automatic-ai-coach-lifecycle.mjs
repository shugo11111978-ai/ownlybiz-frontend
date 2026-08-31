import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';

// Full settings lifecycle regression. Production functions are extracted verbatim;
// only DOM, clock, identity, and API transport are synthetic. No network is used.
const frontend = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', frontend), 'utf8');
function section(start, end) {
  const left = html.indexOf(start), right = html.indexOf(end, left + start.length);
  assert(left >= 0 && right > left, `${start} is extractable`);
  return html.slice(left, right);
}
const source = [
  section('  function safe(v){ return String(v == null ?', '  function attr(v){ return safe(v)'),
  section('  function automaticChatConsentState(data){', '  window.obReplyAssistantAutomationGateText = replyAssistantAutomationGateText;'),
  section('  var expertAiFeatureAuthority =', '  var automaticChatCoachState ='),
  section('  var automaticChatCoachState =', '  function automaticTrainingTime(value){'),
  section('  function automaticTrainingTime(value){', '\t  function expertAiPreferenceCard(){'),
  section('\t  function expertAiPreferenceCard(){', '  window.obExpertAiSettingsTab = function(tab){'),
  section('\t  setInterval(function(){\n\t    var panel=document.getElementById(\'sblock-ai\');', '\t  setTimeout(function(){loadExpertAiFeatureAuthority(false);},250);'),
].join('\n');
const training = { success: true, available: true, admin_guidance: 'Synthetic admin instructions', expert_instructions: 'Synthetic expert instructions', revision: 4, learning: { source: 'completed automatic sessions', event_count: 0, updated_at: null, principles: [], recent_events: [] } };
const consent = { consent: { accepted: true, revision: 1, document_version: 'synthetic-v1', current_document_version: 'synthetic-v1' } };
const saved = { id: 'coach-1', mode: 'teach', revision: 1, created_at: 1788163200, updated_at: 1788163200, turns: [] };
async function flush() { for (let index = 0; index < 12; index++) await Promise.resolve(); }
function harness({ withConversation = true } = {}) {
  const nodes = new Map(), calls = [], timers = new Map();
  let root, now = 0, nextTimer = 1, replacements = 0;
  let remoteConversation = structuredClone(saved), remoteTraining = structuredClone(training), deferConversationRead = false;
  function node(id, parentNode = null) {
    const element = { id, parentNode, children: [], value: '', innerHTML: '', textContent: '', style: {}, attrs: {}, disabled: false, readOnly: false, scrollTop: 0, scrollHeight: 1000, selectionStart: 0, selectionEnd: 0,
      setAttribute(key, value) { this.attrs[key] = String(value); }, getAttribute(key) { return this.attrs[key] ?? null; }, querySelectorAll() { return []; },
      contains(candidate) { for (let current = candidate; current; current = current.parentNode) if (current === this) return true; return false; },
      focus() { root.document.activeElement = this; },
      remove() { for (const [childId, child] of nodes) if (this.contains(child)) nodes.delete(childId); if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; },
      replaceWith(replacement) { const parent = this.parentNode; this.remove(); if (replacement.parentNode) replacement.parentNode.children = replacement.parentNode.children.filter(child => child !== replacement); replacement.parentNode = parent; parent.children.push(replacement); const register = item => { nodes.set(item.id, item); item.children.forEach(register); }; register(replacement); },
    };
    if (parentNode) parentNode.children.push(element);
    nodes.set(id, element); return element;
  }
  const body = node('body'), host = node('ob-expert-ai-settings-host', body), panel = node('sblock-ai', body);
  panel.style.display = 'block';
  function mount(markup) {
    const prior = nodes.get('ob-expert-ai-pref-card');
    if (prior) { replacements++; if (prior.contains(root.document.activeElement)) root.document.activeElement = body; prior.remove(); }
    const card = node('ob-expert-ai-pref-card', host); card.attrs['data-dirty'] = '0';
    Object.defineProperty(card, 'outerHTML', { set: mount });
    let coachNode = null;
    for (const match of markup.matchAll(/\bid="([^"]+)"/g)) if (match[1] !== card.id) { const current = node(match[1], coachNode && match[1].startsWith('ob-automatic-ai-coach-') ? coachNode : card); if (match[1] === 'ob-automatic-ai-coach') coachNode = current; }
    const instructions = nodes.get('ob-automatic-ai-expert-instructions'); if (instructions) instructions.value = remoteTraining.expert_instructions;
  }
  host.insertAdjacentHTML = (_where, markup) => mount(markup);
  const identity = { token: 'synthetic', principal: 'expert:synthetic', role: 'expert', identityGeneration: 1, credentialGeneration: 1, signal: new AbortController().signal };
  function schedule(callback, delay, recurring = false) { const id = nextTimer++; timers.set(id, { callback, due: now + delay, delay, recurring }); return id; }
  root = { window: null, document: { body, activeElement: body, getElementById: id => nodes.get(id) || null }, console, Promise, Object, Array, Number, String, Date, Error, AbortController, TextEncoder, crypto: webcrypto, isNaN,
    setTimeout: (callback, delay) => schedule(callback, delay), clearTimeout: id => timers.delete(id), setInterval: (callback, delay) => schedule(callback, delay, true), clearInterval: id => timers.delete(id),
    hasExpertAuth: () => true, replyAssistantAutomationEffective: () => true,
    OB_CLIENT_CONTEXT: { capture: scope => ({ ...identity, scope }), isCurrent: owner => owner?.principal === identity.principal && owner?.token === identity.token, register() {} }, notify() {},
    api(path, options = {}) {
      let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); calls.push({ path, options, resolve, reject });
      if (path === '/ai/expert-chat/status') resolve({ enabled: true, mode: 'fully_ai' });
      else if (path === '/ai/expert-chat/consent') resolve(consent);
      else if (path === '/ai/expert-chat/training') resolve(remoteTraining);
      else if (!options.method && path === '/ai/expert-chat/coach') resolve({ success: true, conversations: [remoteConversation] });
      else if (!options.method && path === '/ai/expert-chat/coach/coach-1' && !deferConversationRead) resolve({ success: true, conversation: structuredClone(remoteConversation) });
      return promise;
    },
  };
  root.window = root; vm.createContext(root); new vm.Script(source, { filename: 'actual-automatic-coach-and-outer-settings.js' }).runInContext(root);
  root.obExpertAiFeatureAuthority('automatic', true); root.obExpertAiFeatureAuthority('human', false);
  const state = root.automaticChatCoach(root.expertAiFeatureAuthority.owner); state.loaded = true; if (withConversation) root.automaticCoachSetConversation(state, root.parseAutomaticCoachConversation(saved));
  return { root, state, nodes, calls, get replacements() { return replacements; },
    setRemoteConversation(value) { remoteConversation = value; }, setRemoteTraining(value) { remoteTraining = value; }, deferConversationRead() { deferConversationRead = true; },
    async mount() { assert.equal(await root.obExpertAiPreferenceCard(), true, 'initial fixture card renders'); },
    async advance(milliseconds) { const target = now + milliseconds; let next; while ((next = [...timers.entries()].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0])) { const [id, timer] = next; now = timer.due; if (timer.recurring) timer.due += timer.delay; else timers.delete(id); timer.callback(); await flush(); } now = target; await flush(); },
    send(text) { const input = nodes.get('ob-automatic-ai-coach-input'); input.value = text; root.obAutomaticAiCoachInput(input); root.document.activeElement = body; return root.obAutomaticAiCoachSend(); },
  };
}

test('REGRESSION: full settings refresh must not replace pending trainer controls when the clicked button did not take focus', async () => {
  const h = harness(); await h.mount(); const input = h.nodes.get('ob-automatic-ai-coach-input'), turns = h.nodes.get('ob-automatic-ai-coach-turns');
  void h.send('Please help me teach a warmer style.'); await flush(); await h.advance(7000);
  assert.equal(h.calls.filter(call => call.options.method === 'POST').length, 1, 'outer refresh must never duplicate the POST');
  assert.equal(h.state.draft, 'Please help me teach a warmer style.', 'memory draft survives');
  assert.equal(h.replacements, 0, 'unchanged 3.5-second refresh replaced the entire in-flight trainer');
  assert.equal(h.nodes.get(input.id), input); assert.equal(h.nodes.get(turns.id), turns);
});

test('REGRESSION: reading history with focus outside the card must retain the transcript node and scroll position', async () => {
  const h = harness(); await h.mount(); const turns = h.nodes.get('ob-automatic-ai-coach-turns'); turns.scrollTop = 80;
  await h.advance(3500);
  assert.equal(h.replacements, 0, 'unchanged refresh remounts an idle conversation as well');
  assert.equal(h.nodes.get(turns.id), turns); assert.equal(turns.scrollTop, 80);
});

test('REGRESSION: a lost POST response must leave a bounded recovery path instead of permanent Working', async () => {
  const h = harness(); await h.mount(); void h.send('Reply whose HTTP response is lost.'); await flush(); await h.advance(180000);
  const message = h.calls.find(call => call.path.endsWith('/messages'));
  const refreshResult = await h.root.obAutomaticAiCoachRefresh();
  assert(h.state.pending === null || message.options.signal.aborted || refreshResult !== false,
    'after 180s POST still pending, signal not aborted, Refresh refuses, and no durable conversation GET was performed');
});

test('CONTROL: existing focus-inside-card guard prevents replacement while actively editing', async () => {
  const h = harness(); await h.mount(); const input = h.nodes.get('ob-automatic-ai-coach-input'); input.focus(); input.selectionStart = 2; input.selectionEnd = 5;
  await h.advance(7000); assert.equal(h.replacements, 0); assert.equal(h.nodes.get(input.id), input); assert.equal(input.selectionStart, 2); assert.equal(input.selectionEnd, 5);
});

test('CONTROL: rerender by itself does not duplicate generation or stop a later successful POST from updating state', async () => {
  const h = harness(); await h.mount(); const sending = h.send('One synthetic message.'); await flush(); await h.advance(10500);
  const messages = h.calls.filter(call => call.path.endsWith('/messages')); assert.equal(messages.length, 1);
  messages[0].resolve({ success: true, conversation: { ...saved, revision: 2, turns: [{ id: 'turn-1', request_id: messages[0].options.body.request_id, status: 'complete', input_text: 'One synthetic message.', reply: 'One completed synthetic reply.', proposed_lessons: [], training_revision: 4, created_at: 1788163200 }] } });
  assert.equal(await sending, true); assert.equal(h.state.pending, null); assert.equal(h.state.draft, ''); assert.match(h.nodes.get('ob-automatic-ai-coach-status').textContent, /Reply ready/);
});

function completedMessage(requestId, overrides = {}) {
  return { ...saved, revision: 2, turns: [{ id: 'turn-1', request_id: requestId, status: 'complete', input_text: 'One synthetic message.', reply: 'Saved synthetic reply.', proposed_lessons: [], training_revision: 4, created_at: 1788163200, ...overrides }] };
}

test('a changed training read preserves the existing trainer subtree and scroll while updating guidance', async () => {
  const h = harness(); await h.mount(); const coach = h.nodes.get('ob-automatic-ai-coach'), input = h.nodes.get('ob-automatic-ai-coach-input'), turns = h.nodes.get('ob-automatic-ai-coach-turns');
  turns.scrollTop = 65; h.setRemoteTraining({ ...training, revision: 5, expert_instructions: 'New saved instructions from another tab.' }); await h.advance(3500);
  assert.equal(h.root.__obAutomaticAiChatTraining.revision, 5); assert.equal(h.replacements, 1); assert.equal(h.nodes.get(coach.id), coach); assert.equal(h.nodes.get(input.id), input); assert.equal(h.nodes.get(turns.id), turns); assert.equal(turns.scrollTop, 65);
});

test('a pending trainer defers changed visual data but feature revocation still aborts and removes it immediately', async () => {
  const h = harness(); await h.mount(); void h.send('One synthetic message.'); await flush(); const message = h.calls.find(call => call.path.endsWith('/messages'));
  h.setRemoteTraining({ ...training, revision: 5 }); await h.advance(3500); assert.equal(h.replacements, 0); assert.equal(h.root.__obAutomaticAiChatTraining.revision, 5);
  h.root.obExpertAiFeatureAuthority('automatic', false); await flush(); assert.equal(message.options.signal.aborted, true); assert.equal(h.root.automaticChatCoachState, null); assert.equal(h.nodes.has('ob-expert-ai-pref-card'), false); assert.equal(h.state.owner.signal.aborted, false);
});

test('lost message response recovers exact durable reply without resending; late original response is ignored', async () => {
  const h = harness(); await h.mount(); const sending = h.send('One synthetic message.'); await flush(); const message = h.calls.find(call => call.path.endsWith('/messages'));
  h.setRemoteConversation(completedMessage(message.options.body.request_id)); await h.advance(60000); await sending;
  assert.equal(message.options.signal.aborted, true); assert.equal(h.state.owner.signal.aborted, false); assert.equal(h.state.pending, null); assert.equal(h.state.retry, null); assert.equal(h.state.draft, ''); assert.match(h.state.status, /Reply ready/);
  assert.equal(h.calls.filter(call => call.path.endsWith('/messages')).length, 1); assert.equal(h.calls.filter(call => call.path === '/ai/expert-chat/coach/coach-1' && !call.options.method).length, 1);
  message.resolve({ success: true, conversation: completedMessage(message.options.body.request_id, { reply: 'Late stale original response.' }) }); await flush(); assert.equal(h.state.conversation.turns[0].reply, 'Saved synthetic reply.');
});

test('lost message not yet present retains draft and request id for an explicit idempotent retry', async () => {
  const h = harness(); await h.mount(); const first = h.send('One synthetic message.'); await flush(); const initial = h.calls.find(call => call.path.endsWith('/messages'));
  await h.advance(60000); await first; assert.equal(h.state.draft, 'One synthetic message.'); assert.equal(h.state.retry.requestId, initial.options.body.request_id); assert.match(h.state.status, /not in the saved conversation yet/);
  const retry = h.root.obAutomaticAiCoachSend(); await flush(); const requests = h.calls.filter(call => call.path.endsWith('/messages')); assert.equal(requests.length, 2); assert.equal(requests[1].options.body.request_id, initial.options.body.request_id);
  requests[1].resolve({ success: true, conversation: completedMessage(initial.options.body.request_id) }); assert.equal(await retry, true); assert.equal(h.state.retry, null);
});

test('durable pending turn recovered after timeout polls to completion and updates the status copy', async () => {
  const h = harness(); await h.mount(); const sending = h.send('One synthetic message.'); await flush(); const message = h.calls.find(call => call.path.endsWith('/messages'));
  h.setRemoteConversation(completedMessage(message.options.body.request_id, { status: 'pending', reply: '' })); await h.advance(60000); await sending; assert.equal(h.state.pending, null); assert.equal(h.state.draft, ''); assert.match(h.state.status, /still being prepared/);
  h.setRemoteConversation(completedMessage(message.options.body.request_id)); await h.advance(3000); assert.match(h.state.status, /Reply ready/); assert.equal(h.root.automaticCoachBusy(h.state), false); assert.equal(h.calls.filter(call => call.path.endsWith('/messages')).length, 1);
});

test('recovery GET is independently bounded and cannot leave the controls locked', async () => {
  const h = harness(); await h.mount(); h.deferConversationRead(); const sending = h.send('One synthetic message.'); await flush(); await h.advance(120000); await sending;
  const gets = h.calls.filter(call => call.path === '/ai/expert-chat/coach/coach-1' && !call.options.method); assert.equal(gets.length, 1); assert.equal(gets[0].options.signal.aborted, true); assert.equal(h.state.pending, null); assert.equal(h.state.loading, false); assert.equal(h.state.draft, 'One synthetic message.'); assert.equal(h.state.operations.length, 0); assert.equal(h.nodes.get('ob-automatic-ai-coach-refresh').disabled, false);
});

test('lost new-conversation response recovers history but never sends an unconfirmed message', async () => {
  const h = harness({ withConversation: false }); await h.mount(); const sending = h.send('One synthetic message.'); await flush(); await h.advance(60000); await sending;
  assert.equal(h.calls.filter(call => call.path === '/ai/expert-chat/coach' && call.options.method === 'POST').length, 1); assert.equal(h.calls.filter(call => call.path.endsWith('/messages')).length, 0); assert.equal(h.state.pending, null); assert.equal(h.state.loading, false); assert.equal(h.state.draft, 'One synthetic message.'); assert.match(h.state.status, /No message was automatically resent/); assert.equal(h.nodes.get('ob-automatic-ai-coach-refresh').disabled, false);
});

async function approvalHarness() {
  const h = harness(); await h.mount(); const proposed = completedMessage('old-request', { proposed_lessons: ['Use warmer responses.'], approved: false });
  h.setRemoteConversation(proposed); h.root.automaticCoachSetConversation(h.state, h.root.parseAutomaticCoachConversation(proposed)); h.root.obAutomaticAiCoachReview('turn-1', true);
  return { h, proposed };
}

test('lost approval acknowledgement reads training and durable proposal without repeating the mutation', async () => {
  const { h, proposed } = await approvalHarness(); h.state.draft = 'An unrelated unsent coaching message.';
  const saving = h.root.obAutomaticAiCoachApprove('turn-1'); await flush(); const approval = h.calls.find(call => call.path.endsWith('/approve'));
  h.setRemoteTraining({ ...training, revision: 5, expert_instructions: training.expert_instructions + '\n- Use warmer responses.' }); h.setRemoteConversation({ ...proposed, turns: [{ ...proposed.turns[0], approved: true }] });
  await h.advance(60000); assert.equal(await saving, true); assert.equal(approval.options.signal.aborted, true); assert.equal(h.state.owner.signal.aborted, false); assert.equal(h.state.pending, null); assert.equal(h.state.loading, false);
  assert.equal(h.root.__obAutomaticAiChatTraining.revision, 5); assert.equal(h.state.conversation.turns[0].approved, true); assert.match(h.state.approvalStatus, /Verified: these lessons are in saved/); assert.doesNotMatch(h.state.approvalStatus, /not applied|unsent text/i); assert.equal(h.state.draft, 'An unrelated unsent coaching message.'); assert.equal(h.calls.filter(call => call.path.endsWith('/approve')).length, 1);
});

test('unknown approval result remains explicitly unconfirmed and recovers controls after lost readback', async () => {
  const { h } = await approvalHarness(); h.deferConversationRead(); const saving = h.root.obAutomaticAiCoachApprove('turn-1'); await flush(); await h.advance(120000); assert.equal(await saving, false);
  assert.equal(h.state.pending, null); assert.equal(h.state.loading, false); assert.equal(h.state.conversation.turns[0].proposed_lessons[0], 'Use warmer responses.'); assert.match(h.state.approvalStatus, /still unconfirmed/); assert.doesNotMatch(h.state.approvalStatus, /were not applied|unsent text/i); assert.equal(h.calls.filter(call => call.path.endsWith('/approve')).length, 1); assert.equal(h.nodes.get('ob-automatic-ai-coach-refresh').disabled, false);
});

test('uncommitted approval readback retains the proposal and requires a new explicit review', async () => {
  const { h } = await approvalHarness(); const saving = h.root.obAutomaticAiCoachApprove('turn-1'); await flush(); await h.advance(60000); assert.equal(await saving, false);
  assert.equal(h.root.__obAutomaticAiChatTraining.revision, 4); assert.equal(h.state.approvals['turn-1'], undefined); assert.match(h.state.approvalStatus, /review it before deciding/); assert.equal(h.calls.filter(call => call.path.endsWith('/approve')).length, 1);
});

test('mixed approval snapshots cannot verify newer conversation approval against older missing instruction lines', async () => {
  const { h, proposed } = await approvalHarness(); const saving = h.root.obAutomaticAiCoachApprove('turn-1'); await flush();
  h.setRemoteConversation({ ...proposed, turns: [{ ...proposed.turns[0], approved: true }] });
  await h.advance(60000); assert.equal(await saving, false); assert.equal(h.root.__obAutomaticAiChatTraining.revision, 4); assert.equal(h.state.conversation.turns[0].approved, false); assert.equal(h.state.conversation.turns[0].proposed_lessons[0], 'Use warmer responses.'); assert.match(h.state.approvalStatus, /still unconfirmed/); assert.doesNotMatch(h.state.approvalStatus, /Verified:/); assert.equal(h.calls.filter(call => call.path.endsWith('/approve')).length, 1); assert.equal(h.state.pending, null); assert.equal(h.state.loading, false);
});

test('approval recovery requires every exact stored lesson line, not a partial prose match', async () => {
  const { h, proposed } = await approvalHarness(); const saving = h.root.obAutomaticAiCoachApprove('turn-1'); await flush();
  h.setRemoteTraining({ ...training, revision: 5, expert_instructions: 'Do not apply this lesson yet: - Use warmer responses.' }); h.setRemoteConversation({ ...proposed, turns: [{ ...proposed.turns[0], approved: true }] });
  await h.advance(60000); assert.equal(await saving, false); assert.match(h.state.approvalStatus, /still unconfirmed/); assert.doesNotMatch(h.state.approvalStatus, /Verified:/); assert.equal(h.state.conversation.turns[0].approved, false); assert.equal(h.calls.filter(call => call.path.endsWith('/approve')).length, 1);
});
