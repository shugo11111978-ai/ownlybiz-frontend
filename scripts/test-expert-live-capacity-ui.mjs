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

function section(start, end) {
  const left = html.indexOf(start);
  assert(left >= 0, `section starts at ${start}`);
  const right = html.indexOf(end, left + start.length);
  assert(right >= 0, `section ends at ${end}`);
  return html.slice(left, right);
}

const source = scriptById('ownlybiz-expert-live-capacity-editor-20260817');
const markup = section('<div class="settings-field-row ob-expert-live-capacity-editor"', '<div class="settings-field-row">\n                  <div><div class="settings-field-label">Auto-accept bookings');
const availabilitySource = section('  function collectAvailabilityPayload(){', '  function sectionFromSaveButton(target){');

assert.match(markup, /id="ob-expert-live-capacity-editor" hidden/, 'private editor starts hidden');
assert.match(markup, /<label[^>]+for="avail-live-capacity"[^>]*>Parallel chat sessions<\/label>/, 'capacity select has a visible label');
assert.match(markup, /id="avail-live-capacity"[^>]+aria-describedby="ob-expert-live-capacity-status"[^>]+disabled/, 'authoritative select starts disabled and is described');
assert.match(markup, /id="ob-expert-live-capacity-status"[^>]+role="status"[^>]+aria-live="polite"/, 'status changes are announced without a modal');
assert.match(markup, /id="ob-expert-live-capacity-save"[^>]+type="button"[^>]+obExpertLiveCapacitySave\(\)/, 'capacity uses an isolated save action');
assert.doesNotMatch(markup, /<option[^>]*>\s*[123]\s*<\/option>/, 'no decorative hard-coded capacity choices remain');
assert.doesNotMatch(availabilitySource, /live-capacity|avail-live-capacity|desired_human_concurrency|expected_revision/, 'availability payload and save semantics remain separate');
assert.match(html, /saveSettingsBlock\('availability'\)[^>]*>Save Availability<\/button>/, 'existing availability save control remains intact');
assert.match(source, /ENDPOINT='\/api\/experts\/me\/live-capacity'/, 'editor uses only the private self-service endpoint');
assert.match(source, /desired_human_concurrency:desired,expected_revision:expectedRevision/, 'PUT uses the exact loaded human revision');
assert.doesNotMatch(source, /desired_ai_chat_capacity|reply_assistant_enabled|training_enabled|expected_ai_revision/, 'expert bridge never reads or writes AI entitlement fields');
assert.match(source, /cache:'no-store'/, 'private reads bypass browser caches');
assert.match(source, /if\(options\.reconcile\)/, 'failed writes have an explicit reconciliation path');
assert.match(source, /state\.dirty\?whole\(Number\(live\.select\.value\),1,20\)/, 'refreshes preserve a newer in-focus draft');
assert.match(html, /@media\(max-width:768px\)[\s\S]*?#avail-live-capacity\{font-size:16px;flex:0 0 118px;\}/, 'mobile select avoids zoom and keeps a touch-sized control');

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName || 'div').toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = {};
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this._text = '';
    this.id = '';
  }
  get firstChild() { return this.children[0] || null; }
  get textContent() { return this._text + this.children.map((child) => child.textContent).join(''); }
  set textContent(value) { this._text = value == null ? '' : String(value); this.children = []; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) { const index = this.children.indexOf(child); if(index >= 0) this.children.splice(index, 1); child.parentNode = null; return child; }
  setAttribute(name, value) { this.attributes.set(String(name), String(value)); if(name === 'id') this.id = String(value); if(String(name).startsWith('data-')) this.dataset[String(name).slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value); }
  getAttribute(name) { if(name === 'id') return this.id || null; return this.attributes.has(String(name)) ? this.attributes.get(String(name)) : null; }
  addEventListener(type, listener) { if(!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(listener); }
  dispatchEvent(event) { event.target ||= this; for(const listener of this.listeners.get(event.type) || []) listener.call(this, event); }
  focus() { this.ownerDocument.activeElement = this; }
}

class FakeDocument {
  constructor() {
    this.nodes = new Map();
    this.listeners = new Map();
    this.readyState = 'loading';
    this.activeElement = null;
  }
  createElement(tagName) { return new FakeElement(tagName, this); }
  getElementById(id) { return this.nodes.get(String(id)) || null; }
  addEventListener(type, listener) { if(!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(listener); }
  dispatchEvent(event) { for(const listener of this.listeners.get(event.type) || []) listener.call(this, event); }
  add(tagName, id) { const node = this.createElement(tagName); node.id = id; this.nodes.set(id, node); return node; }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return {promise, resolve, reject};
}

function response(body, status = 200) {
  return {ok:status >= 200 && status < 300, status, json:async() => body};
}

function privateCapacity({desired = 3, effective = desired, plan = 5, revision = 7, rollout = 5, mode = 'enforce', enforced = mode === 'enforce', secret = 'AI_PRIVATE_SENTINEL'} = {}) {
  return {
    success:true,
    live_capacity:{
      phase:'atomic_admission', admission_enforced:enforced, rollout_mode:mode,
      human_rollout_ceiling:rollout, expert_id:'private-expert-id',
      human:{desired_concurrency:desired,effective_concurrency:effective,plan_ceiling:plan,revision},
      ai:{desired_chat_capacity:99,reply_assistant_enabled:true,internal_secret:secret},
    },
  };
}

function createContext(initial = {}) {
  let current = {
    token:initial.token || 'token-a', principal:initial.principal || 'expert|a', role:initial.role || 'expert',
    identityGeneration:1, credentialGeneration:1, signal:{aborted:false},
  };
  let adapter = null;
  function snapshot(scope) { return Object.freeze({...current, scope:String(scope || '')}); }
  const client = {
    capture:snapshot,
    isCurrent(context) { return !!(context && !context.signal.aborted && context.principal === current.principal && context.identityGeneration === current.identityGeneration); },
    register(name, next) { assert.equal(name, 'expert-live-capacity-editor'); adapter = next; return () => { adapter = null; }; },
  };
  return {
    client,
    change(next) {
      const previous = snapshot('previous');
      current.signal.aborted = true;
      if(adapter && adapter.teardown) adapter.teardown(previous, {kind:'identity_changed'});
      current = {
        token:next.token || 'token-next', principal:next.principal || 'expert|next', role:next.role || 'expert',
        identityGeneration:current.identityGeneration + 1, credentialGeneration:current.credentialGeneration + 1, signal:{aborted:false},
      };
      if(adapter && adapter.changed) adapter.changed(snapshot('changed'), {kind:'identity_changed'});
    },
    rotate(token = 'token-rotated') {
      current = {...current, token, credentialGeneration:current.credentialGeneration + 1};
      if(adapter && adapter.credentialRotated) adapter.credentialRotated(snapshot('rotated'), {kind:'credential_rotated'});
    },
    current:() => current,
  };
}

function createHarness({role = 'expert', support = false, mini = false, fetchImpl = null} = {}) {
  const document = new FakeDocument();
  const editor = document.add('div', 'ob-expert-live-capacity-editor'); editor.hidden = true;
  const select = document.add('select', 'avail-live-capacity'); select.disabled = true;
  const loadingOption = document.createElement('option'); loadingOption.value = ''; loadingOption.textContent = 'Loading…'; select.appendChild(loadingOption);
  const button = document.add('button', 'ob-expert-live-capacity-save'); button.disabled = true;
  const status = document.add('div', 'ob-expert-live-capacity-status');
  const identity = createContext({role});
  const calls = [];
  const root = {
    window:null, document, console, Object, Array, Number, String, Boolean, Math, JSON, Date, Promise,
    location:{pathname:mini ? '/mini-suite' : '/dash/expert/settings/availability'},
    OWNLYBIZ_API_URL:'https://api.example.test/', __OB_TEST_HOOKS__:{}, OB_CLIENT_CONTEXT:identity.client,
    obSupportSessionActive:() => support, obIsMiniSuiteRoute:() => mini, addEventListener(){},
    fetch(url, options) { calls.push({url,options}); return fetchImpl ? fetchImpl(url, options, calls.length - 1) : Promise.reject(new Error('unexpected fetch')); },
  };
  root.window = root;
  vm.createContext(root);
  new vm.Script(source, {filename:'expert-live-capacity-editor.js'}).runInContext(root);
  async function start() {
    document.readyState = 'complete';
    document.dispatchEvent({type:'DOMContentLoaded'});
    if(root.__OB_TEST_HOOKS__.expertLiveCapacity.state.loadPromise) await root.__OB_TEST_HOOKS__.expertLiveCapacity.state.loadPromise;
  }
  return {root,document,editor,select,button,status,identity,calls,start,hooks:root.__OB_TEST_HOOKS__.expertLiveCapacity};
}

const primaryResponses = [response(privateCapacity())];
const primary = createHarness({fetchImpl:() => Promise.resolve(primaryResponses.shift())});
await primary.start();
assert.equal(primary.calls.length, 1);
assert.equal(primary.calls[0].url, 'https://api.example.test/api/experts/me/live-capacity');
assert.equal(primary.calls[0].options.method, 'GET');
assert.equal(primary.calls[0].options.cache, 'no-store');
assert.equal(primary.calls[0].options.headers.Authorization, 'Bearer token-a');
assert.equal(primary.editor.hidden, false);
assert.deepEqual(primary.select.children.map((option) => option.value), ['1','2','3','4','5'], 'options are derived from the authoritative plan ceiling');
assert.equal(primary.select.value, '3');
assert.equal(primary.select.disabled, false);
assert.equal(primary.button.disabled, true);
assert.match(primary.status.textContent, /Saved preference: 3/);
assert.match(primary.status.textContent, /plan allows 5/);
assert.match(primary.status.textContent, /makes 3 effective/);
assert.match(primary.status.textContent, /rollout ceiling is 5/);
assert.match(primary.status.textContent, /up to 3 parallel human chats/);
assert.doesNotMatch(primary.status.textContent, /AI_PRIVATE_SENTINEL|99|private-expert-id/, 'only allowlisted human settings reach the editor');

primary.select.value = '4';
primary.select.dispatchEvent({type:'input'});
assert.equal(primary.hooks.state.dirty, true);
assert.equal(primary.button.disabled, false);
primaryResponses.push(response(privateCapacity({desired:4,effective:4,revision:8})));
assert.equal(await primary.hooks.save(), true);
assert.equal(primary.calls[1].options.method, 'PUT');
assert.deepEqual(JSON.parse(primary.calls[1].options.body), {
  desired_human_concurrency:4,
  expected_revision:7,
  reason:'expert_live_capacity_editor',
});
assert.equal(primary.hooks.state.capacity.revision, 8);
assert.equal(primary.hooks.state.dirty, false);
assert.equal(primary.button.disabled, true);
assert.match(primary.status.textContent, /^Saved\./);

const clamp = {desired:5,effective:5,planCeiling:5,revision:2,rolloutCeiling:2,rolloutMode:'enforce',admissionEnforced:true};
assert.equal(primary.hooks.activeLimit(clamp), 2, 'rollout ceiling clamps the effective human preference');
assert.match(primary.hooks.summary(clamp), /up to 2 parallel human chats/);
const observe = {...clamp,rolloutMode:'observe',admissionEnforced:false};
assert.equal(primary.hooks.activeLimit(observe), 1, 'observe mode keeps legacy single-session admission');
assert.match(primary.hooks.summary(observe), /remains single-session/);
const paused = {...clamp,rolloutMode:'paused',admissionEnforced:false};
assert.equal(primary.hooks.activeLimit(paused), 0);
assert.match(primary.hooks.summary(paused), /temporarily paused/);

const refreshWait = deferred();
const focusResponses = [response(privateCapacity({desired:2,effective:2,revision:4})), refreshWait.promise];
const focusSafe = createHarness({fetchImpl:() => Promise.resolve(focusResponses.shift()).then((value) => value)});
await focusSafe.start();
focusSafe.select.value = '4'; focusSafe.select.dispatchEvent({type:'input'}); focusSafe.select.focus();
const refresh = focusSafe.hooks.load({force:true});
assert.equal(focusSafe.select.disabled, false, 'background refresh does not lock an existing draft field');
focusSafe.select.value = '5'; focusSafe.select.dispatchEvent({type:'input'});
refreshWait.resolve(response(privateCapacity({desired:3,effective:3,revision:8})));
assert.equal(await refresh, true);
assert.equal(focusSafe.select.value, '5', 'newer typing wins over a stale refresh projection');
assert.equal(focusSafe.hooks.state.dirty, true);
assert.equal(focusSafe.document.activeElement, focusSafe.select, 'refresh preserves field focus');
assert.match(focusSafe.status.textContent, /Selected 5 parallel chats; this choice is not saved yet/);

const conflictResponses = [
  response(privateCapacity({desired:2,effective:2,revision:8})),
  response({success:false,error:'DO_NOT_RENDER_CONFLICT_DETAIL',code:'live_capacity_revision_conflict'},409),
  response(privateCapacity({desired:2,effective:2,revision:9})),
  response(privateCapacity({desired:4,effective:4,revision:10})),
];
const conflict = createHarness({fetchImpl:() => Promise.resolve(conflictResponses.shift())});
await conflict.start();
conflict.select.value = '4'; conflict.select.dispatchEvent({type:'change'});
assert.equal(await conflict.hooks.save(), false, 'conflict requires explicit review rather than an automatic PUT retry');
assert.deepEqual(conflict.calls.map((call) => call.options.method), ['GET','PUT','GET']);
assert.equal(conflict.select.value, '4', 'valid pending intent survives conflict reconciliation');
assert.equal(conflict.hooks.state.capacity.revision, 9);
assert.equal(conflict.hooks.state.dirty, true);
assert.match(conflict.status.textContent, /changed elsewhere/);
assert.doesNotMatch(conflict.status.textContent, /DO_NOT_RENDER/);
assert.equal(await conflict.hooks.save(), true);
assert.equal(JSON.parse(conflict.calls[3].options.body).expected_revision, 9, 'resubmission uses the freshly reconciled revision');

const uncertainSteps = [
  () => Promise.resolve(response(privateCapacity({desired:2,effective:2,revision:4}))),
  () => Promise.reject(new Error('SOCKET_SECRET_SHOULD_NEVER_RENDER')),
  () => Promise.resolve(response(privateCapacity({desired:3,effective:3,revision:5}))),
];
const uncertain = createHarness({fetchImpl:() => uncertainSteps.shift()()});
await uncertain.start();
uncertain.select.value = '3'; uncertain.select.dispatchEvent({type:'input'});
assert.equal(await uncertain.hooks.save(), false, 'an uncertain PUT response is never blindly retried');
assert.deepEqual(uncertain.calls.map((call) => call.options.method), ['GET','PUT','GET']);
assert.equal(uncertain.hooks.state.capacity.revision, 5);
assert.equal(uncertain.hooks.state.dirty, false);
assert.match(uncertain.status.textContent, /Saved setting confirmed after checking the server/);
assert.doesNotMatch(uncertain.status.textContent, /SOCKET_SECRET/);

const downgradeResponses = [response(privateCapacity({desired:5,effective:1,plan:1,revision:12,rollout:1}))];
const downgrade = createHarness({fetchImpl:() => Promise.resolve(downgradeResponses.shift())});
await downgrade.start();
assert.deepEqual(downgrade.select.children.map((option) => option.value), ['1']);
assert.equal(downgrade.select.value, '1');
assert.equal(downgrade.hooks.state.dirty, false, 'a plan downgrade does not silently replace the stored preference');
assert.equal(downgrade.button.disabled, false, 'an explicit save can replace an above-plan preference even when only one legal option exists');
assert.match(downgrade.status.textContent, /Saved preference: 5/);
assert.match(downgrade.status.textContent, /plan allows 1/);
assert.match(downgrade.status.textContent, /only if you want to replace/);
downgrade.select.dispatchEvent({type:'input'});
assert.equal(downgrade.hooks.state.dirty, true, 'an explicit interaction can replace an above-plan saved preference');

const raceA = deferred();
const race = createHarness({fetchImpl:(url, options) => options.headers.Authorization === 'Bearer token-a'
  ? raceA.promise
  : Promise.resolve(response(privateCapacity({desired:1,effective:1,plan:1,revision:3,rollout:1,secret:'B_SECRET'})))});
const firstLoad = race.hooks.load({force:true});
race.identity.change({token:'token-b',principal:'expert|b',role:'expert'});
await race.hooks.state.loadPromise;
raceA.resolve(response(privateCapacity({desired:20,effective:20,plan:20,revision:99,rollout:20,secret:'A_SECRET'})));
assert.equal(await firstLoad, false, 'prior-principal response is discarded');
assert.equal(race.select.value, '1');
assert.match(race.status.textContent, /Saved preference: 1/);
assert.doesNotMatch(race.status.textContent, /20|A_SECRET|B_SECRET/, 'prior-principal and AI-private values never project');

const unsafe = createHarness({fetchImpl:() => Promise.resolve(response({success:false,error:'RAW_DATABASE_SECRET_SHOULD_NEVER_RENDER',code:'unexpected_internal_code'},500))});
await unsafe.start();
assert.match(unsafe.status.textContent, /could not be loaded/i);
assert.doesNotMatch(unsafe.status.textContent, /RAW_DATABASE|unexpected_internal/);
assert(unsafe.status.textContent.length <= 360, 'visible errors are bounded');
assert.equal(unsafe.button.textContent, 'Reload setting');
assert.equal(unsafe.button.disabled, false);

for(const fixture of [
  createHarness({role:'client',fetchImpl:() => { throw new Error('public fetch'); }}),
  createHarness({support:true,fetchImpl:() => { throw new Error('support write surface'); }}),
  createHarness({mini:true,fetchImpl:() => { throw new Error('mini fetch'); }}),
]) {
  await fixture.start();
  assert.equal(fixture.calls.length, 0, 'non-expert, support, and mini surfaces never request private capacity');
  assert.equal(fixture.editor.hidden, true);
  assert.equal(fixture.status.textContent, '');
}

console.log('expert live-capacity editor frontend smoke: ok');
