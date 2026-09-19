import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import vm from 'node:vm';

// --baseline is an intentional red run against the committed pre-fix source.
const baseline = '01b811a2e2729770a706af0d6ccfca216d801a80';
const html = process.argv.includes('--baseline')
  ? execFileSync('git', ['show', baseline + ':index.html'], { cwd: new URL('..', import.meta.url), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  : readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const channels = ['chat', 'voice', 'video'];
const safetyStart = html.indexOf('/* PRODUCTION SAFETY PATCH 2026-04-26:');

function range(startText, endText, from = 0) {
  const start = html.indexOf(startText, from), end = html.indexOf(endText, start);
  assert(start >= 0 && end > start, `source range exists: ${startText}`);
  return html.slice(start, end);
}
function declaration(name, from = 0) {
  const start = html.indexOf(`function ${name}(`, from);
  assert(start >= 0, `function exists: ${name}`);
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  assert.fail(`complete function exists: ${name}`);
}
const policy = html.match(/<script id="ownlybiz-rate-and-session-status-policy-20260827">([\s\S]*?)<\/script>/)?.[1];
assert(policy, 'actual shared rate policy exists');
const base = range("var _bflChannel = 'chat';", '\nfunction bflSetText');
const refresh = range('function bflEffectiveMinuteRate(){', '\nfunction bflUpdateSummary()');
const selection = range('window.selectBflChannel = function(el) {', '\nwindow.selectBflSlot');
const availability = [
  'enabledFlag', 'channelEnabled', 'firstEnabledChannel', 'hasOwn', 'hasAvailabilityFields',
  'channelFromText', 'setUnavailableBadge', 'setAttrIfChanged', 'setDatasetIfChanged', 'applyChannelAvailabilityUi',
].map(name => declaration(name, safetyStart)).join('\n');
const legacyWrapper = range('  function enableBookLaterChannels(){', '  var _origLoadBookingSlots=');
const availabilityWrapper = range('    var currentSelectBfl = window.selectBflChannel;', '    window.handleExpertCTA = function(){', safetyStart);
const productionWrapper = range('    var later = window.openBookLaterModal;', '    window.handleExpertCTA = function(){');
const customStart = html.indexOf('<script id="ownlybiz-production-public-entrypoint-hotfix">');
const customEntrypoint = declaration('firstEnabledChannel', customStart) + '\n' + declaration('openBookLaterSafely', customStart);

function element(channel) {
  const classes = new Set();
  return {
    style: {}, dataset: channel ? { ch: channel } : {}, children: [], attributes: {}, textContent: channel || '',
    classList: { add: (...values) => values.forEach(value => classes.add(value)), remove: (...values) => values.forEach(value => classes.delete(value)), contains: value => classes.has(value), toggle(value, on) { if (on) classes.add(value); else classes.delete(value); } },
    getAttribute(name) { return name === 'data-ch' ? this.dataset.ch : this.attributes[name]; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    querySelector(selector) { return selector === '.ob-not-offered-badge' ? this.children.find(child => child.className === 'ob-not-offered-badge') || null : null; },
    appendChild(child) { child.parent = this; this.children.push(child); },
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); },
  };
}
function fixture(overrides = {}) {
  return { id: 'expert-alpha', slug: 'alpha', payments_enabled: true, chat_enabled: 1, voice_enabled: 1, video_enabled: 1, rate_chat: 1, rate_voice: 2, rate_video: 3, ...overrides };
}
function harness({ repeats = 1, expert = fixture() } = {}) {
  let now = 0, order = 0;
  const timers = [], notices = [], nodes = new Map(), buttons = channels.map(element);
  for (const id of ['bfl-overlay', 'bfl-date', 'bfl-slots-grid', 'bfl-no-slots', 'bfl-next-1']) nodes.set(id, element());
  nodes.get('bfl-overlay').style.display = 'none';
  const document = {
    body: element(), getElementById: id => nodes.get(id) || null, createElement: () => element(),
    querySelectorAll(selector) {
      if (selector === '.bfl-type-btn') return buttons;
      if (selector === '.bfl-type-btn[data-ch="voice"],.bfl-type-btn[data-ch="video"]') return buttons.slice(1);
      if (selector.startsWith('#stype-grid')) return [];
      throw Error(`unhandled selector ${selector}`);
    },
    querySelector(selector) {
      if (selector === '.bfl-type-btn.active') return buttons.find(button => button.classList.contains('active')) || null;
      const channel = selector.match(/^\.bfl-type-btn\[data-ch="(chat|voice|video)"\]$/)?.[1];
      if (channel) return buttons.find(button => button.dataset.ch === channel) || null;
      throw Error(`unhandled selector ${selector}`);
    },
  };
  const context = {
    document, CHANNELS: channels, _currentExpert: expert, Object, String, Number, Date, Array,
    privatePricingContext: () => false, shouldDeferPrivateAvailability: () => false,
    bflGoStep(step) { context.step = step; }, bflApplyAuthState() {}, getClientToken: () => '',
    localStorage: { getItem: () => null }, sessionStorage: { getItem: () => null },
    resolveExpertSlug: () => context._currentExpert?.slug || '', hostSlug: () => context._currentExpert?.slug || '',
    toastMsg: message => notices.push(message), alert: message => notices.push(message),
    fetch() { assert.fail('no network/provider/booking operations belong in channel initialization'); },
    setTimeout(callback, delay = 0) { const timer = { callback, at: now + delay, order: order++ }; timers.push(timer); return timer.order; },
  };
  context.window = context;
  vm.createContext(context);
  const run = source => new vm.Script(source).runInContext(context);
  run(policy + '\n' + base + '\n' + refresh + '\n' + selection + '\n' + availability);
  run('(function(){' + legacyWrapper + '})();');
  for (let i = 0; i < repeats; i++) {
    run('(function(){' + availabilityWrapper + '})();');
    run('(function(){' + productionWrapper + '})();');
  }
  run('(function(){' + customEntrypoint + ';window.testCustomOpen=openBookLaterSafely;})();');
  function tick(target) {
    assert(target >= now);
    for (;;) {
      timers.sort((a, b) => a.at - b.at || a.order - b.order);
      if (!timers.length || timers[0].at > target) break;
      const next = timers.shift(); now = next.at; next.callback();
    }
    now = target;
  }
  return {
    context, notices, timers, tick, buttons,
    open: (channel, custom = false) => custom ? context.testCustomOpen(channel) : context.openBookLaterModal(channel),
    close: () => context.closeBookLaterModal(),
    select: channel => context.selectBflChannel(buttons.find(button => button.dataset.ch === channel)),
    refresh: () => context.applyChannelAvailabilityUi(),
    get selected() { return context._bflChannel; }, get visible() { return nodes.get('bfl-overlay').style.display !== 'none'; },
    assertSelection(channel) { assert.equal(context._bflChannel, channel); assert.deepEqual(buttons.filter(button => button.classList.contains('active')).map(button => button.dataset.ch), [channel]); },
  };
}

for (const custom of [false, true]) for (const channel of ['voice', 'video']) for (const at of [0, 1, 39, 79, 80, 259, 260, 699]) {
  test(`${custom ? 'custom-host' : 'canonical'} keeps ${channel} chosen at ${at}ms through all old timer boundaries`, () => {
    const h = harness(); h.open('chat', custom);
    if (at) h.tick(at);
    h.select(channel); h.assertSelection(channel);
    h.tick(1000); h.assertSelection(channel);
    assert.equal(h.timers.length, 0);
  });
}

test('requested enabled channel is initialized synchronously, without deferred opening work', () => {
  const h = harness(); h.open('video', true); h.assertSelection('video');
  assert.equal(h.visible, true); assert.equal(h.timers.length, 0);
});
test('close immediately after custom-host open cannot be reversed by the old 40ms fallback', () => {
  const h = harness(); h.open('voice', true); h.close(); h.tick(1000);
  assert.equal(h.visible, false); h.assertSelection('voice');
});
test('repeated close/reopen and wrapper reinstallation never replay an older requested channel', () => {
  const h = harness({ repeats: 4 });
  for (let i = 0; i < 8; i++) { h.open('chat', true); h.close(); h.open('voice', true); h.select('video'); h.assertSelection('video'); }
  h.tick(1000); h.assertSelection('video'); assert.equal(h.visible, true);
});
test('expert change before old timers cannot mutate the closed modal or new expert selection', () => {
  const h = harness(); h.open('video', true); h.close();
  h.context._currentExpert = fixture({ id: 'expert-beta', slug: 'beta', video_enabled: 0 });
  h.tick(1000); assert.equal(h.visible, false); h.assertSelection('video');
  h.open('voice', true); h.assertSelection('voice'); h.tick(2000); h.assertSelection('voice');
});
test('switching experts while open cannot replay a stale first expert choice', () => {
  const h = harness(); h.open('chat', true);
  h.context._currentExpert = fixture({ id: 'expert-beta', slug: 'beta' });
  h.refresh(); h.select('video'); h.tick(1000); h.assertSelection('video');
});
test('custom-host reopen with all channels disabled stays closed', () => {
  const h = harness(); h.open('chat', true); h.close();
  Object.assign(h.context._currentExpert, { chat_enabled: 0, voice_enabled: 0, video_enabled: 0 });
  h.open('video', true); h.tick(1000); assert.equal(h.visible, false);
  assert(h.notices.some(message => message.includes('not accepting bookings')));
});
test('unavailable requested channel falls back to an enabled channel and remains unselectable', () => {
  const h = harness({ expert: fixture({ chat_enabled: 0, video_enabled: 0 }) });
  h.open('video', true); h.assertSelection('voice'); h.select('video'); h.tick(1000); h.assertSelection('voice');
});
test('availability refresh preserves an enabled choice and only falls back when that choice becomes disabled', () => {
  const h = harness(); h.open('chat'); h.select('video');
  h.refresh(); h.assertSelection('video');
  h.context._currentExpert.video_enabled = 0; h.refresh(); h.assertSelection('chat');
  h.tick(1000); h.assertSelection('chat');
});
test('existing payment readiness and zero-rate channel policy remain authoritative', () => {
  const h = harness({ expert: fixture({ payments_enabled: false, rate_chat: 0 }) });
  h.open('chat', true); h.assertSelection('chat');
  assert.equal(h.buttons.find(button => button.dataset.ch === 'video').dataset.channelDisabled, '1');
  h.select('video'); h.assertSelection('chat');
  h.context._currentExpert.rate_video = 0; h.refresh(); h.select('video'); h.tick(1000); h.assertSelection('video');
});
