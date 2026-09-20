import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import test from 'node:test';
import vm from 'node:vm';

// Exact-source, offline rendering regression. --baseline deliberately runs the
// old non-idempotent formatter; no browser, provider, authentication or session I/O.
const baseline = '038d24ec05cd3e9244bb0769b2c262a7d7d3c633';
const oldHtml = execFileSync('git', ['show', baseline + ':index.html'], {
  cwd: new URL('..', import.meta.url), encoding: 'utf8', maxBuffer: 20_000_000,
});
const red = process.argv.includes('--baseline');
const html = red ? oldHtml : readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');
function range(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  assert(a >= 0 && b > a, `source boundaries: ${start}`);
  return text.slice(a, b);
}
function script(text, id) {
  const matches = [...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(match => match[1].includes(`id="${id}"`));
  assert.equal(matches.length, 1);
  return matches[0][0];
}
const polish = range(html, '  function polishPreSession(){', '  function ensureConnectionNote(');
const oldPolish = range(oldHtml, '  function polishPreSession(){', '  function ensureConnectionNote(');
const removed = "    var title = document.getElementById('presess-title');\n"
  + "    if(title && /Expert/i.test(title.textContent || '') && window._currentExpert && window._currentExpert.name){\n"
  + "      title.textContent = title.textContent.replace('Expert', window._currentExpert.name);\n"
  + "    }\n";
const launch = range(html, 'function _launchSession(isPaid) {', '// Called when user taps');
const names = range(html, 'function obClientSessionCleanText(v){', 'function obClientSessionRate(');
const miniSync = range(html, '  function syncPublicNames(){', '  function marketplaceChannelLabel(');

function element(text = '') {
  let value = text, markup = '';
  return { dataset: {}, style: {}, textWrites: 0, htmlWrites: 0,
    get textContent() { return value; }, set textContent(next) { value = String(next); this.textWrites++; },
    get innerHTML() { return markup; }, set innerHTML(next) { markup = String(next); this.htmlWrites++; },
  };
}
function harness({ name = 'Offline Session Expert', snapshot = {}, mini = null } = {}) {
  const nodes = new Map(['presess-title', 'presess-expert-name', 'presess-free-note', 'presess-paid-note', 'presess-free-mins', 'expert-chat-input', 'booking-overlay']
    .map(id => [id, element(id === 'presess-title' ? 'Chat with Expert' : id === 'presess-free-mins' ? '5' : '')]));
  nodes.get('expert-chat-input').placeholder = 'Type your message...';
  const events = [];
  const context = { document: { getElementById: id => nodes.get(id) || null, querySelectorAll: () => [], body: { style: {} } },
    _currentExpert: { name, display_name: name, title: 'Reader', is_online: 1 }, _obClientSessionSnapshot: snapshot,
    _selectedMarketplaceExpert: mini, selectedChannel: { id: 'chat', name: 'Chat', icon: 'C', price: '$0.00/min' },
    freeMinutes: { chat: 0, voice: 0, video: 0 }, obMinuteText: value => String(value),
    _startSessionScreen: () => events.push({ step: 'setup' }),
    switchView: view => events.push({ step: 'view', view, title: nodes.get('presess-title').textContent }),
    phoneGo: screen => events.push({ step: 'screen', screen, title: nodes.get('presess-title').textContent }),
    selectedMini: () => mini, syncMarketplaceOverlayLabels: () => {},
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(names + '\n' + launch + '\n' + polish + '\n' + miniSync, context);
  function launchChannel(channel) {
    context.selectedChannel = { id: channel.toLowerCase(), name: channel, icon: channel[0], price: '$0.00/min' };
    context._launchSession(true);
    const expected = channel + ' with ' + context.obClientSessionExpertName(snapshot);
    assert.equal(nodes.get('presess-title').textContent, expected);
    for (const event of events.slice(-2)) assert.equal(event.title, expected, 'canonical title precedes visible view/screen selection');
    assert.deepEqual(events.slice(-2).map(event => event.step), ['view', 'screen']);
    return expected;
  }
  function repeat(expected, count = 100) {
    const title = nodes.get('presess-title'), writes = title.textWrites;
    for (let i = 0; i < count; i++) context.polishPreSession();
    assert.equal(title.textContent, expected, 'polish never substitutes within an authored name');
    assert.equal(title.textWrites, writes, 'polish does not create title mutations, even for unchanged text');
  }
  return { context, nodes, events, launchChannel, repeat };
}

test('exact title-only deletion preserves every other byte in the polish script and original title authorities', () => {
  assert.equal(sha(oldPolish), 'aa72ec72b0f5072310883d50d959433247f36bd1a856d14e0a420339a420ac1a');
  assert.equal(oldPolish.split(removed).length, 2);
  assert.equal(polish, oldPolish.replace(removed, ''));
  const id = 'ownlybiz-v3-stage-polish-20260505';
  assert.equal(sha(script(oldHtml, id)), 'aa5fe95fd175ceda66227b40c311ef2c949cea7ef081183956c29f3dd2c165e1');
  assert.equal(script(html, id), script(oldHtml, id).replace(removed, ''));
  assert.equal(launch, range(oldHtml, 'function _launchSession(isPaid) {', '// Called when user taps'));
  assert.equal(names, range(oldHtml, 'function obClientSessionCleanText(v){', 'function obClientSessionRate('));
  assert.equal(miniSync, range(oldHtml, '  function syncPublicNames(){', '  function marketplaceChannelLabel('));
  assert.equal((html.match(/phoneGo\(['"]PRESESS['"]\)/g) || []).length, 1, 'normal PRESESS selection remains owned by launch');
  assert.match(html, /<div class="phone-screen" id="screen-PRESESS">/, 'bootstrap placeholder is not the active screen');
});

for (const name of ['Offline Session Expert', 'Expert', 'expert', 'Expert Expert', 'Expert $&', "Expert $'", 'Expert $`', 'Expert $$', 'ד״ר מרים Expert 🌙', '李明', 'Ada Reader']) {
  test(`literal name remains stable across chat/voice/video: ${name}`, () => {
    const h = harness({ name });
    for (const channel of ['Chat', 'Voice', 'Video']) h.repeat(h.launchChannel(channel));
  });
}

test('session snapshot name stays authoritative over the current public owner', () => {
  const h = harness({ name: 'Public Owner', snapshot: { expert_name: "Snapshot Expert $& $'" } });
  assert.equal(h.launchChannel('Voice'), "Voice with Snapshot Expert $& $'");
  h.repeat("Voice with Snapshot Expert $& $'");
});
test('marketplace snapshot and an actual mini named Expert are never replaced with the owner', () => {
  for (const snapshot of [{ marketplace_expert_id: 'mini-a', marketplace_expert_name: 'Expert' }, {}]) {
    const h = harness({ name: 'Marketplace Owner', snapshot, mini: { id: 'mini-a', display_name: 'Expert' } });
    assert.equal(h.launchChannel('Video'), 'Video with Expert');
    h.repeat('Video with Expert');
    h.context.syncPublicNames();
    h.repeat('Video with Expert');
  }
});
test('hidden bootstrap placeholder passes through polish until launch populates it', () => {
  const h = harness();
  h.repeat('Chat with Expert');
  assert.equal(h.launchChannel('Chat'), 'Chat with Offline Session Expert');
  h.repeat('Chat with Offline Session Expert');
});
test('intro/paid polish and chat placeholder behavior remain idempotent and unchanged', () => {
  const h = harness({ name: 'Ada Reader' });
  h.context.polishPreSession();
  const free = h.nodes.get('presess-free-note'), paid = h.nodes.get('presess-paid-note'), input = h.nodes.get('expert-chat-input');
  assert.equal(free.dataset.obPolished, '1'); assert.equal(paid.dataset.obPolished, '1');
  assert.match(free.innerHTML, /<strong id="presess-free-mins">5<\/strong>/);
  assert.equal(paid.innerHTML, '<strong>Billing starts when the session begins.</strong> You can end any time and only pay for time used.');
  assert.equal(input.placeholder, 'Message the client...');
  for (let i = 0; i < 50; i++) h.context.polishPreSession();
  assert.equal(free.htmlWrites, 1); assert.equal(paid.htmlWrites, 1);
  input.placeholder = 'Session ended'; h.context.polishPreSession(); assert.equal(input.placeholder, 'Message the client...');
  input.placeholder = 'Custom message prompt'; h.context.polishPreSession(); assert.equal(input.placeholder, 'Custom message prompt');
});
