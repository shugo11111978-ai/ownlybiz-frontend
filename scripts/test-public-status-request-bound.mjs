import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = html.match(/<script id="ownlybiz-expert-consent-disable-guard-20260602">([\s\S]*?)<\/script>/);
assert.ok(match, 'expert consent guard must exist');

const source = match[1];
assert.doesNotMatch(source, /public-status\//, 'the consent guard must use the shared public-status authority');
assert.match(source, /if\(refreshInFlight\[slug\]\) return refreshInFlight\[slug\];/, 'consent refreshes must be single-flight per expert');

let consentNode = null;
let openCalls = 0;
let domReady;
const statusSlugs = [];
const statusResolvers = new Map();
const profileSlugs = [];
const observers = [];

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name),
  };
}

class FakeMutationObserver {
  constructor(callback) {
    this.callback = callback;
    this.disconnected = false;
    observers.push(this);
  }
  observe(target, options) {
    this.target = target;
    this.options = options;
  }
  disconnect() {
    this.disconnected = true;
  }
}

const body = { nodeName: 'BODY' };
const documentElement = { nodeName: 'HTML', classList: classList() };
const document = {
  readyState: 'loading',
  body,
  documentElement,
  addEventListener(name, callback) {
    if (name === 'DOMContentLoaded') domReady = callback;
  },
  getElementById(id) {
    return id === 'privacy-consent' ? consentNode : null;
  },
};

const window = {
  _browseExpert: '',
  obPlatformRouteRoots: {},
  obOpenConsentManager() { openCalls += 1; },
  obPublicLoaderStatus(slug) {
    statusSlugs.push(slug);
    return new Promise(resolve => { statusResolvers.set(slug, resolve); });
  },
};

async function flush() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

const pageLocation = {
  hostname: 'ownlybiz-preview.vercel.app',
  pathname: '/',
  search: '',
};

const context = {
  window,
  document,
  location: pageLocation,
  fetch: async url => {
    const slugMatch = String(url).match(/\/api\/experts\/([^?]+)\?_=/);
    assert.ok(slugMatch, `unexpected profile URL: ${url}`);
    const slug = decodeURIComponent(slugMatch[1]);
    profileSlugs.push(slug);
    return {
      async json() {
        return { expert: { slug, privacy_cookie_banner_enabled: slug === 'liran1' } };
      },
    };
  },
  MutationObserver: FakeMutationObserver,
  URLSearchParams,
  Date,
  Promise,
  encodeURIComponent,
};

vm.runInNewContext(source, context, { filename: 'expert-consent-guard.js' });
assert.equal(typeof domReady, 'function', 'guard waits for the document before observing');
for (let i = 0; i < 100; i += 1) domReady();
await flush();

assert.equal(statusSlugs.length, 0, 'platform boot outside an expert route performs no public-status check');
assert.equal(observers.length, 1, 'late consent discovery installs one temporary observer');
const discoveryObserver = observers[0];
assert.equal(discoveryObserver.target, body, 'late-node discovery observes the document body');
assert.equal(JSON.stringify(discoveryObserver.options), JSON.stringify({ childList: true, subtree: true }));

for (let i = 0; i < 2000; i += 1) discoveryObserver.callback([]);
assert.equal(statusSlugs.length, 0, 'unrelated platform DOM mutations cannot start status requests');

pageLocation.pathname = '/LIRAN1';
pageLocation.search = '?booking=booking-regression';
window._browseExpert = 'LIRAN1';
consentNode = { nodeName: 'DIV', classList: classList(['active']) };
discoveryObserver.callback([]);
await flush();
assert.equal(discoveryObserver.disconnected, true, 'discovery observer disconnects after locating consent');
assert.equal(observers.length, 2, 'consent gets one dedicated observer');
assert.deepEqual(statusSlugs, ['liran1'], 'an already-active late consent node triggers one expert check');

const consentObserver = observers[1];
assert.equal(consentObserver.target, consentNode);
assert.equal(JSON.stringify(consentObserver.options), JSON.stringify({ attributes: true, attributeFilter: ['class'] }));

for (let i = 0; i < 2000; i += 1) consentObserver.callback([]);
assert.deepEqual(statusSlugs, ['liran1'], 'active-consent mutations share the in-flight status request');

statusResolvers.get('liran1')({ public_available: true });
await flush();
assert.deepEqual(profileSlugs, ['liran1'], 'the consent setting profile is loaded once');
assert.equal(window._currentExpert.slug, 'liran1', 'case-variant routes apply the normalized expert response');

for (let i = 0; i < 2000; i += 1) consentObserver.callback([]);
await flush();
assert.deepEqual(statusSlugs, ['liran1'], 'resolved expert settings prevent repeated status checks');
assert.deepEqual(profileSlugs, ['liran1'], 'resolved expert settings prevent repeated profile checks');

for (let i = 0; i < 100; i += 1) domReady();
await flush();
assert.deepEqual(statusSlugs, ['liran1'], 'repeated page boot attempts reuse the loaded expert setting');
assert.equal(observers.length, 2, 'repeated boot attempts install no additional observers');

for (let i = 0; i < 100; i += 1) await window.obOpenConsentManager();
assert.deepEqual(statusSlugs, ['liran1'], 'repeated consent opens reuse the loaded expert setting');
assert.equal(openCalls, 100, 'the original consent manager still opens normally');

pageLocation.pathname = '/expert-b';
window._browseExpert = 'expert-b';
window._currentExpertSlug = 'expert-b';
consentNode.classList.add('active');
consentObserver.callback([]);
await flush();
assert.deepEqual(statusSlugs, ['liran1', 'expert-b'], 'a new expert slug cannot reuse the previous expert setting');
statusResolvers.get('expert-b')({ public_available: true });
await flush();
assert.deepEqual(profileSlugs, ['liran1', 'expert-b']);
assert.equal(window._currentExpert.slug, 'expert-b', 'the new expert owns the loaded consent setting');
assert.equal(documentElement.classList.contains('ob-expert-consent-disabled'), true, 'the new expert disabled consent UI');

for (let i = 0; i < 1000; i += 1) {
  consentNode.classList.add('active');
  consentObserver.callback([]);
}
await flush();
assert.deepEqual(statusSlugs, ['liran1', 'expert-b'], 'slug-scoped settings bound repeated active toggles');

pageLocation.pathname = '/expert-c';
window._browseExpert = 'expert-c';
window._currentExpertSlug = 'expert-c';
consentNode.classList.add('active');
consentObserver.callback([]);
pageLocation.pathname = '/expert-d';
window._browseExpert = 'expert-d';
window._currentExpertSlug = 'expert-d';
consentObserver.callback([]);
await flush();
assert.deepEqual(statusSlugs, ['liran1', 'expert-b', 'expert-c', 'expert-d'], 'in-flight ownership is isolated by slug');

statusResolvers.get('expert-d')({ public_available: true });
await flush();
statusResolvers.get('expert-c')({ public_available: true });
await flush();
assert.equal(window._currentExpert.slug, 'expert-d', 'a stale expert response cannot overwrite the current route');
assert.deepEqual(profileSlugs, ['liran1', 'expert-b', 'expert-d', 'expert-c']);

console.log('public-status request bound regression passed');
