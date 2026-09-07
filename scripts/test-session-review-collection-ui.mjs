import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = html.match(/<script id="ownlybiz-review-manager-20260529">([\s\S]*?)<\/script>/)?.[1];
assert(source, 'existing inline review manager is retained for both legacy loaders');
new vm.Script(source);
assert.doesNotMatch(html, /onclick="handleRating\(event\)"/, 'stars do not implicitly submit');
assert.doesNotMatch(html, /const _origHandleRating/, 'the cleared-session-id review submission is removed');
assert.match(html, /settlementPending: false,[\s\S]{0,160}obClientReviewReceiptReady\(rendered\)/);
assert.match(html, /settlementPending: true,[\s\S]{0,160}obClientReviewReset\(\)/);
assert.match(html, /reviewSafe\(r\.comment\|\|r\.text\|\|''\)/, 'admin legacy rendering escapes new review text');
assert.match(html, /#ob-client-review-comment,#ob-client-review-comment:focus\{background:var\(--surface,var\(--white,#fff\)\)!important;color:var\(--text,var\(--brown,#241a15\)\)!important/, 'textarea foreground and background override global important rules as one theme-aware pair');
assert.doesNotMatch(html, /\.ob-review-badge\.hidden\{/, 'review status does not reuse the display:none utility class');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const response = data => ({ ok: true, json: async () => ({ success: true, ...data }) });
const session = (extra = {}) => ({ id: 'session-1', status: 'ended', channel: 'chat', started_at: 100, duration_secs: 60, expert_id: 'expert-1', expert_slug: 'luna', ...extra });
function harness(role = 'client') {
  const elements = new Map();
  const timers = [], documentEvents = new Map(), selectorNodes = new Map();
  function node(id) {
    if (!elements.has(id)) elements.set(id, {
      id, innerHTML: '', textContent: '', hidden: false, disabled: false, focused: false,
      classList: { contains: name => name === 'active', add() {}, remove() {} },
      addEventListener() {}, contains() { return true; }, querySelector() { return null; }, querySelectorAll() { return []; }, appendChild() {}, focus() { this.focused = true; },
    });
    return elements.get(id);
  }
  ['screen-A5', 'view-5', 'ob-client-review-summary', 'ob-client-review-panel', 'ob-client-review-continue',
    'ob-client-review-title', 'ob-client-review-count', 'ob-client-review-status', 'ob-review-manager',
    'db-panel-reviews', 'ew-reviews-container'].forEach(node);
  let identity = { role, token: `${role}-1`, principal: `${role}-one`, identityGeneration: 1, credentialGeneration: 1, signal: new AbortController().signal };
  const adapters = [];
  const calls = [];
  let responder = async () => response({ eligible: true, collection_enabled: true, review: null });
  const location = { origin: 'https://ownlybiz.com', hostname: 'ownlybiz.com', href: '', pathname: '/luna/book' };
  const window = {
    __OB_TEST_HOOKS__: {}, _currentExpert: { id: 'expert-1', slug: 'luna' },
    OB_CLIENT_CONTEXT: {
      capture: () => ({ ...identity }),
      isCurrent: owner => owner && owner.token === identity.token && owner.principal === identity.principal && owner.identityGeneration === identity.identityGeneration && owner.credentialGeneration === identity.credentialGeneration,
      register: (_name, adapter) => adapters.push(adapter),
    },
    toast() {}, location,
  };
  const context = {
    window, location, document: {
      getElementById: id => elements.get(id) || null,
      querySelector: () => null, querySelectorAll: selector => selectorNodes.get(selector) || [],
      addEventListener(name, callback) { if (!documentEvents.has(name)) documentEvents.set(name, []); documentEvents.get(name).push(callback); },
      createElement: name => node(`created-${name}`),
    },
    fetch: async (url, options = {}) => { calls.push({ url, ...options, body: options.body ? JSON.parse(options.body) : null }); return responder(url, options); },
    AbortController, URL, console, setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; }, clearTimeout() {},
    prompt: () => 'A public reply', confirm: () => true,
  };
  vm.createContext(context);
  new vm.Script(source).runInContext(context);
  const hooks = window.__OB_TEST_HOOKS__.sessionReviews;
  return {
    window, hooks, calls, elements, node, location, context, timers, documentEvents, selectorNodes,
    respond(fn) { responder = fn; },
    ready(value = session()) { window._obClientReceiptAuthorityState = { sid: value.id, snapshot: value, settlementPending: false }; hooks.ready(value); },
    changeIdentity(notify = true) {
      identity = { ...identity, token: `${role}-2`, principal: `${role}-two`, identityGeneration: 2, signal: new AbortController().signal };
      if (notify) adapters.forEach(adapter => adapter.changed?.(identity));
    },
  };
}

let count = 0;
async function test(name, run) { await run(); count += 1; console.log(`PASS ${name}`); }

for (const channel of ['chat', 'voice', 'video']) {
  await test(`${channel}: summary first, explicit optional form, one submission, expert return`, async () => {
    const h = harness(); h.ready(session({ channel }));
    assert.equal(h.calls.length, 0, 'receipt readiness makes no requests');
    assert.equal(h.hooks.state().stage, 'summary');
    await h.hooks.continue();
    assert.equal(h.calls.length, 1);
    assert.match(h.calls[0].url, /\/sessions\/session-1\/review$/);
    assert.equal(h.calls[0].method, 'GET');
    assert.equal(h.hooks.state().stage, 'form');
    assert.match(h.node('ob-client-review-panel').innerHTML, /name="ob-review-rating"/);
    assert.match(h.node('ob-client-review-panel').innerHTML, /By submitting, you agree/);
    assert.match(h.node('ob-client-review-panel').innerHTML, /public reply beneath the approved review/);
    h.window.obClientReviewRating(4);
    h.window.obClientReviewComment('Helpful and clear.');
    h.respond(async () => response({ review: { id: 'review-1' }, created: true }));
    await h.hooks.submit();
    assert.deepEqual(h.calls[1].body, { rating: 4, comment: 'Helpful and clear.' });
    assert.equal(h.location.href, 'https://ownlybiz.com/luna');
    assert.equal(h.hooks.state().comment, '');
  });
}

await test('pending, cancelled, unstarted and unsupported receipts never request a review', async () => {
  for (const value of [session({ status: 'settling' }), session({ status: 'cancelled' }), session({ started_at: null, duration_secs: 0 }), session({ channel: 'written' })]) {
    const h = harness(); h.ready(value); await h.hooks.continue(); assert.equal(h.calls.length, 0);
  }
  const h = harness('expert'); h.ready(); await h.hooks.continue(); assert.equal(h.calls.length, 0, 'experts cannot submit as clients');
});

await test('collection disabled and ineligible clients return without a submission', async () => {
  for (const extra of [{ collection_enabled: false }, { eligible: false }]) {
    const h = harness(); h.ready();
    h.respond(async () => response({ eligible: true, collection_enabled: true, review: null, ...extra }));
    await h.hooks.continue(); assert.equal(h.calls.length, 1); assert.equal(h.location.href, 'https://ownlybiz.com/luna');
  }
});

await test('one eligibility request at a time; skip rejects its late response', async () => {
  const h = harness(), pending = deferred(); h.ready(); h.respond(() => pending.promise);
  const first = h.hooks.continue(); await h.hooks.continue(); assert.equal(h.calls.length, 1);
  h.hooks.skip(); pending.resolve(response({ eligible: true, collection_enabled: true, review: null })); await first;
  assert.notEqual(h.hooks.state().stage, 'form'); assert.equal(h.location.href, 'https://ownlybiz.com/luna');
});

await test('failed eligibility provides a safe exit and makes no write', async () => {
  const h = harness(); h.ready(); h.respond(async () => { throw new Error('offline'); });
  await h.hooks.continue(); assert.equal(h.hooks.state().stage, 'unavailable');
  assert.match(h.node('ob-client-review-panel').innerHTML, /Return to expert website/);
  h.hooks.skip(); assert.equal(h.calls.length, 1); assert.equal(h.location.href, 'https://ownlybiz.com/luna');
});

await test('rating is explicit, optional comment is escaped, failure retains draft, retry is single-flight', async () => {
  const h = harness(); h.ready(); await h.hooks.continue();
  await h.hooks.submit(); assert.equal(h.calls.length, 1, 'missing rating cannot submit');
  h.window.obClientReviewRating(3); h.window.obClientReviewComment('</textarea><script>alert(1)</script>');
  const pending = deferred(); h.respond(() => pending.promise);
  const first = h.hooks.submit(); await h.hooks.submit(); assert.equal(h.calls.length, 2);
  assert.equal(h.hooks.skip(), false, 'cannot skip while submission is in flight');
  pending.reject(new Error('lost response')); await first;
  assert.equal(h.hooks.state().rating, 3); assert.equal(h.hooks.state().comment, '</textarea><script>alert(1)</script>');
  assert.match(h.node('ob-client-review-panel').innerHTML, /&lt;\/textarea&gt;&lt;script&gt;/);
  assert.doesNotMatch(h.node('ob-client-review-panel').innerHTML, /<script>alert/);
  h.respond(async () => response({ review: { id: 'already-saved' }, created: false }));
  await h.hooks.submit(); assert.deepEqual(h.calls[2].body, h.calls[1].body); assert.equal(h.location.href, 'https://ownlybiz.com/luna');
});

await test('existing review cannot be submitted again', async () => {
  const h = harness(); h.ready(); h.respond(async () => response({ eligible: false, collection_enabled: true, review: { id: 'r1', status: 'pending' } }));
  await h.hooks.continue(); await h.hooks.submit(); assert.equal(h.hooks.state().stage, 'existing'); assert.equal(h.calls.length, 1);
});

await test('identity and session changes discard delayed eligibility and submission responses', async () => {
  for (const submitting of [false, true]) {
    const h = harness(); h.ready();
    if (submitting) { await h.hooks.continue(); h.window.obClientReviewRating(5); h.window.obClientReviewComment('Private draft'); }
    const pending = deferred(); h.respond(() => pending.promise);
    const task = submitting ? h.hooks.submit() : h.hooks.continue();
    h.changeIdentity(); pending.resolve(response({ eligible: true, collection_enabled: true, review: submitting ? { id: 'r1' } : null, created: true })); await task;
    assert.equal(h.location.href, ''); assert.equal(h.hooks.state().comment, ''); assert.equal(h.hooks.state().stage, 'summary');
  }
  const h = harness(); h.ready(); const pending = deferred(); h.respond(() => pending.promise);
  const task = h.hooks.continue(); h.ready(session({ id: 'session-2', expert_slug: 'other' }));
  pending.resolve(response({ eligible: true, collection_enabled: true, review: null })); await task;
  assert.equal(h.hooks.state().sid, 'session-2'); assert.equal(h.hooks.state().stage, 'summary');
});

await test('same-session receipt refresh preserves the form; pending settlement invalidates it', async () => {
  const h = harness(); h.ready(); await h.hooks.continue(); h.window.obClientReviewRating(4); h.window.obClientReviewComment('Keep me');
  h.ready(session({ total_charged: 12 })); assert.equal(h.hooks.state().stage, 'form'); assert.equal(h.hooks.state().comment, 'Keep me');
  h.hooks.reset(); assert.equal(h.hooks.state().comment, ''); assert.equal(h.node('ob-client-review-summary').hidden, false);
});

await test('return navigation uses the captured expert and same-origin custom domain', async () => {
  const h = harness(); h.window._obReturnExpertUrl = 'javascript:alert(1)'; h.ready();
  h.window._currentExpert = { id: 'other', slug: 'other' }; h.hooks.skip(); assert.equal(h.location.href, 'https://ownlybiz.com/luna');
  h.location.origin = 'https://lunapsychics.online'; h.location.hostname = 'lunapsychics.online';
  assert.equal(h.hooks.returnUrl(session()), 'https://lunapsychics.online/');
  h.location.origin = 'https://ownlybiz.com'; h.location.hostname = 'ownlybiz.com';
  assert.equal(h.hooks.returnUrl(session({ expert_slug: 'https://evil.test' })), 'https://ownlybiz.com/');
});

await test('public review projection requires publication, rejects deleted data and retains rating-only reviews', () => {
  const h = harness();
  const published = { id: 'r1', status: 'published', is_visible: 1, rating: 5, comment: '', client_name: 'Client', expert_reply: '<img src=x onerror=alert(1)>' };
  for (const change of [{ status: 'pending' }, { status: 'hidden' }, { is_visible: 0 }, { deleted_at: 123 }, { status: '' }]) assert.equal(h.hooks.approved({ ...published, ...change }), false);
  assert.equal(h.hooks.approved({ ...published, status: null }), true, 'historical null status remains supported');
  h.window.obRenderPublicReviews({ expert: {}, reviews: [published, { ...published, id: 'hidden', status: 'pending', comment: 'HIDDEN TEXT' }] });
  const result = h.node('ew-reviews-container').innerHTML;
  assert.match(result, /1 visible review/); assert.match(result, /&lt;img src=x onerror=alert\(1\)&gt;/); assert.doesNotMatch(result, /HIDDEN TEXT|<img src=x/);
});

await test('an older public expert fetch cannot overwrite newly supplied expert reviews', async () => {
  const h = harness(), old = deferred(); h.respond(() => old.promise);
  h.window.loadExpertWebsite('old-expert');
  for (let n = 0; n < 4; n++) await Promise.resolve();
  h.window._applyExpertWebsite({ slug: 'new-expert', reviews: [{ id: 'new', status: 'published', is_visible: 1, rating: 5, comment: 'CURRENT REVIEW' }] });
  old.resolve(response({ expert: {}, reviews: [{ id: 'old', status: 'published', is_visible: 1, rating: 1, comment: 'STALE REVIEW' }] }));
  for (let n = 0; n < 10; n++) await Promise.resolve();
  assert.match(h.node('ew-reviews-container').innerHTML, /CURRENT REVIEW/);
  assert.doesNotMatch(h.node('ew-reviews-container').innerHTML, /STALE REVIEW/);
});

const publicPayload = { expert: { id: 'expert-1', slug: 'luna', name: 'Luna' }, reviews: [{ id: 'r-public', status: 'published', is_visible: 1, rating: 5, comment: 'PUBLIC REVIEW', expert_reply: 'PUBLIC REPLY' }] };
await test('fast public payload survives both startup callbacks and removes legacy duplicate cards', async () => {
  const h = harness();
  let removed = false;
  h.selectorNodes.set('#ep-reviews .ob-reviews', [{ parentNode: { removeChild() { removed = true; } } }]);
  h.window.obRenderPublicReviews(publicPayload);
  for (const timer of h.timers.filter(timer => timer.delay === 100)) timer.callback();
  for (const callback of h.documentEvents.get('DOMContentLoaded') || []) callback();
  assert.match(h.node('ew-reviews-container').innerHTML, /PUBLIC REVIEW[\s\S]*PUBLIC REPLY/);
  assert.equal(removed, true, 'the old appended reviews list cannot compete with the canonical container');
});

await test('deferred lexical loader renders full reviews after replacing early wrappers and rejects older fetches', async () => {
  const h = harness(), pending = deferred(); h.respond(() => pending.promise);
  h.window.loadExpertWebsite('old-expert');
  for (let n = 0; n < 4; n++) await Promise.resolve();
  const loader = html.match(/  async function loadExpertWebsite\(slug\) \{[\s\S]*?\n  \}\n\n  \/\* ═/)?.[0].replace(/\n\n  \/\* ═$/, '');
  assert(loader, 'extract the actual lexical public loader');
  let applied = false;
  h.window._applyExpertWebsite = () => { applied = true; };
  Object.assign(h.context, { api: async () => publicPayload, $$: () => [], $: h.node, freeMinutes: {}, fmt$: () => '$0' });
  new vm.Script(`${loader}\nwindow.__deferredReviewLoader=loadExpertWebsite;`).runInContext(h.context);
  await h.window.__deferredReviewLoader('luna');
  assert.equal(applied, true);
  assert.match(h.node('ew-reviews-container').innerHTML, /PUBLIC REVIEW[\s\S]*PUBLIC REPLY/);
  pending.resolve(response({ expert: { slug: 'old-expert' }, reviews: [{ status: 'published', is_visible: 1, rating: 1, comment: 'STALE REVIEW' }] }));
  for (let n = 0; n < 10; n++) await Promise.resolve();
  assert.match(h.node('ew-reviews-container').innerHTML, /PUBLIC REVIEW[\s\S]*PUBLIC REPLY/);
  assert.doesNotMatch(h.node('ew-reviews-container').innerHTML, /STALE REVIEW/);
});

await test('canonical public payload applier forwards source reviews after deferred website rendering', async () => {
  const h = harness();
  const start = html.indexOf('function obApplyPublicExpertPayload(e, slug, source) {');
  const end = html.indexOf('function obPublicLoaderApiBase()', start);
  assert(start > 0 && end > start);
  h.window._applyExpertWebsite = () => {};
  h.window._refreshPublicPage = () => {};
  h.window.OB_RATE_POLICY = { ownerRate: () => 0 };
  new vm.Script(html.slice(start, end)).runInContext(h.context);
  h.context.obApplyPublicExpertPayload({ ...publicPayload.expert }, 'luna', publicPayload);
  assert.match(h.node('ew-reviews-container').innerHTML, /PUBLIC REVIEW[\s\S]*PUBLIC REPLY/);
});

const managerPayload = { collection_enabled: false, reviews: [{ id: 'r1', status: 'pending', is_visible: 0, rating: 4, comment: '<svg/onload=alert(1)>', client_name: '<Client>', source: 'verified_session' }], stats: { pending: 1 } };
await test('expert settings default off; pending approval and public reply are explicit', async () => {
  const h = harness('expert'); h.respond(async () => response(managerPayload)); await h.hooks.loadManager();
  const result = h.node('ob-review-manager').innerHTML;
  assert.equal(h.hooks.managerState().collectionEnabled, false);
  assert.match(result, /Awaiting approval/); assert.match(result, /Approve for website/); assert.match(result, /Keep unpublished/);
  assert.match(result, /class="ob-review-badge unpublished">Awaiting approval/);
  assert.doesNotMatch(result, /class="ob-review-badge hidden"/, 'pending status stays visible despite global .hidden rule');
  assert.match(result, /Write public reply/); assert.match(result, /&lt;svg\/onload=alert\(1\)&gt;/);
  h.respond(async (_url, opts) => response(opts.method === 'PUT' ? { collection_enabled: true } : { ...managerPayload, collection_enabled: true }));
  await h.window.obReviewSaveCollection(true);
  assert.deepEqual(h.calls.find(c => c.method === 'PUT').body, { collection_enabled: true }); assert.equal(h.hooks.managerState().collectionEnabled, true);
});

await test('expert approve/hide/reply preserve API scope and prevent duplicate writes', async () => {
  const h = harness('expert'); h.respond(async () => response(managerPayload)); await h.hooks.loadManager();
  const pending = deferred(); h.respond((_url, opts) => opts.method === 'PATCH' ? pending.promise : Promise.resolve(response(managerPayload)));
  const task = h.window.obReviewToggle('r1', false); await h.window.obReviewToggle('r1', false);
  assert.equal(h.calls.filter(c => c.method === 'PATCH').length, 1); assert.deepEqual(h.calls.at(-1).body, { is_visible: 1 });
  pending.resolve(response({})); await task;
  h.respond(async () => response(managerPayload)); await h.window.obReviewToggle('r1', true); assert.deepEqual(h.calls.findLast(c => c.method === 'PATCH').body, { is_visible: 0 });
  await h.window.obReviewReply('r1'); assert.deepEqual(h.calls.findLast(c => c.method === 'PATCH').body, { expert_reply: 'A public reply' });
});

await test('stale expert loads and writes cannot populate a different account', async () => {
  const h = harness('expert'), pending = deferred(); h.respond(() => pending.promise);
  const task = h.hooks.loadManager(); h.changeIdentity(); pending.resolve(response(managerPayload)); await task;
  assert.equal(h.hooks.managerState().reviews.length, 0); assert.doesNotMatch(h.node('ob-review-manager').innerHTML, /Client|svg/);
});

console.log(`PASS ${count} review collection UI cases; offline VM only, no application/provider/network execution.`);
