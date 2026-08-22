import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const loaderMatch = html.match(/<script id="ownlybiz-stripe-lazy-loader-20260822">([\s\S]*?)<\/script>/);

assert(loaderMatch, 'the Stripe lazy loader must have one explicit owner');
assert.doesNotMatch(
  html,
  /<script\b[^>]*\bsrc=["']https:\/\/js\.stripe\.com\/v3\/?["'][^>]*>/i,
  'no route may eagerly fetch Stripe.js while parsing the application shell',
);
assert.doesNotMatch(
  html,
  /(?:=|\|\|)\s*Stripe\s*\(/,
  'payment call sites must use the loader-owned window.Stripe instance',
);
assert.match(
  html,
  /async function mountCreditPayment[\s\S]*?typeof window\.Stripe !== 'function'\) await window\.obEnsureStripe\(\);[\s\S]*?state\.stripe = window\.Stripe/,
  'credit checkout loads Stripe only after its payment intent exists',
);
assert.match(
  html,
  /async function installCard\(publishableKey\)[\s\S]*?typeof window\.Stripe !== 'function'\) await window\.obEnsureStripe\(\);[\s\S]*?bflCardOwnerCurrent\(owner\)[\s\S]*?window\.Stripe\(publishableKey\)/,
  'Book Later loads Stripe only for an owned card-payment form',
);
assert.match(
  html,
  /if\(status !== 'requires_capture'\)\{[\s\S]*?if\(!stripe && data\.publishable_key\)\{[\s\S]*?await window\.obEnsureStripe\(\)/,
  'live authorization loads Stripe only when browser confirmation is actually required',
);
assert.match(
  html,
  /async function mountBookingReplacementCard\(\)[\s\S]*?if\(typeof window\.Stripe !== 'function'\)await window\.obEnsureStripe\(\);[\s\S]*?bookingControllerOwns\(context\)/,
  'scheduled replacement-card UI lazily loads Stripe and rechecks ownership',
);
assert.match(
  html,
  /async function obMountLegacyBookingCard\(owner,publishableKey\)[\s\S]*?await window\.obEnsureStripe\(\);[\s\S]*?if\(!obLegacyBookingCardOwnerCurrent\(owner\)\)return null;[\s\S]*?var stripe=window\.Stripe/,
  'the legacy booking card revalidates its exact owner after deferred Stripe.js loading',
);

function createLoaderHarness() {
  const nodes = new Map();
  const appended = [];
  const head = {
    appendChild(node) {
      node.parentNode = head;
      appended.push(node);
      if (node.id) nodes.set(node.id, node);
      return node;
    },
    removeChild(node) {
      const index = appended.indexOf(node);
      if (index >= 0) appended.splice(index, 1);
      if (node.id && nodes.get(node.id) === node) nodes.delete(node.id);
      node.parentNode = null;
      return node;
    },
  };
  const document = {
    head,
    getElementById(id) { return nodes.get(id) || null; },
    createElement(tagName) {
      assert.equal(tagName, 'script', 'the loader may only create a script element');
      const listeners = new Map();
      return {
        id: '', src: '', async: false, parentNode: null,
        addEventListener(name, listener) { listeners.set(name, listener); },
        dispatch(name) { const listener = listeners.get(name); if (listener) listener(); },
      };
    },
  };
  const window = {};
  const context = { window, document, Promise, Error };
  vm.runInNewContext(loaderMatch[1], context, { filename: 'stripe-lazy-loader.js' });
  return { window, appended };
}

const zeroRate = createLoaderHarness();
assert.equal(typeof zeroRate.window.obEnsureStripe, 'function', 'the payment loader is available to payment UI owners');
assert.equal(zeroRate.appended.length, 0,
  'loading chat, voice, video, login, dashboard, or another non-payment route creates no Stripe request');

const first = zeroRate.window.obEnsureStripe();
const second = zeroRate.window.obEnsureStripe();
assert.equal(first, second, 'concurrent payment UI callers share one Stripe.js load');
assert.equal(zeroRate.appended.length, 1, 'the first genuine payment UI creates one Stripe.js script');
assert.equal(zeroRate.appended[0].src, 'https://js.stripe.com/v3/');
assert.equal(zeroRate.appended[0].async, true);
const stripeFactory = function Stripe() {};
zeroRate.window.Stripe = stripeFactory;
zeroRate.appended[0].dispatch('load');
assert.equal(await first, stripeFactory, 'payment UI resolves to the loaded Stripe factory');
assert.equal(await zeroRate.window.obEnsureStripe(), stripeFactory,
  'later payment UI reuses the loaded Stripe factory without another request');
assert.equal(zeroRate.appended.length, 1);

const retry = createLoaderHarness();
const failed = retry.window.obEnsureStripe();
assert.equal(retry.appended.length, 1);
const failedScript = retry.appended[0];
failedScript.dispatch('error');
await assert.rejects(failed, /Secure payment form failed to load/);
assert.equal(retry.appended.length, 0, 'a failed Stripe.js element is removed so a deliberate retry can recover');
const retried = retry.window.obEnsureStripe();
assert.equal(retry.appended.length, 1, 'a later payment action gets one clean retry');
retry.window.Stripe = stripeFactory;
retry.appended[0].dispatch('load');
assert.equal(await retried, stripeFactory);

const bookingBoundaryMatch = html.match(
  /\/\/ ===== LEGACY BOOKING CARD OWNERSHIP BOUNDARY =====([\s\S]*?)\/\/ ===== END LEGACY BOOKING CARD OWNERSHIP BOUNDARY =====/,
);
assert(bookingBoundaryMatch, 'the legacy booking-card ownership boundary must be independently testable');

function deferred() {
  let resolve;
  const promise = new Promise((fulfil) => { resolve = fulfil; });
  return { promise, resolve };
}

function createBookingBoundaryHarness() {
  const overlay = { style:{display:'flex'} };
  const mount = { innerHTML:'stale', _stripeCard:false };
  const nodes = new Map([['booking-overlay', overlay], ['bov-card-element', mount]]);
  const identity = {
    token:'client-token-a', principal:'client-a', role:'client', identityGeneration:1, credentialGeneration:1,
  };
  const contextApi = {
    capture(scope, extras) {
      return Object.freeze({ scope, signal:{aborted:false}, ...identity, ...extras });
    },
    isCurrent(owner, options = {}) {
      return !!owner && !owner.signal.aborted && owner.principal === identity.principal &&
        owner.identityGeneration === identity.identityGeneration &&
        (!options.exactCredential || (owner.token === identity.token && owner.credentialGeneration === identity.credentialGeneration));
    },
  };
  const loader = deferred();
  const metrics = { loaderCalls:0, stripeCalls:0, elementCalls:0, cardCreates:0, mounts:0, unmounts:0, wallets:0 };
  const window = {
    OB_CLIENT_CONTEXT:contextApi,
    _currentExpert:{user_id:'expert-a'},
    selectedChannel:{id:'video'},
    obEnsureStripe() { metrics.loaderCalls += 1; return loader.promise; },
    _obMountBovWallet() { metrics.wallets += 1; },
  };
  const document = { getElementById(id) { return nodes.get(id) || null; } };
  const sandbox = { window, document, Number, String, Object, Promise };
  vm.runInNewContext(bookingBoundaryMatch[1], sandbox, { filename:'legacy-booking-card-boundary.js' });
  return { sandbox, window, identity, overlay, mount, loader, metrics };
}

const ownership = createBookingBoundaryHarness();
const owner = ownership.sandbox.obCaptureLegacyBookingCardOwner('expert-a', 'video');
assert.equal(ownership.sandbox.obLegacyBookingCardOwnerCurrent(owner), true,
  'the matching client, credential, expert, channel, generation, and visible overlay own the card');
ownership.identity.credentialGeneration += 1;
ownership.identity.token = 'client-token-a-rotated';
assert.equal(ownership.sandbox.obLegacyBookingCardOwnerCurrent(owner), false, 'credential rotation invalidates exact card ownership');
ownership.identity.credentialGeneration -= 1;
ownership.identity.token = 'client-token-a';
ownership.window._currentExpert = {user_id:'expert-b'};
assert.equal(ownership.sandbox.obLegacyBookingCardOwnerCurrent(owner), false, 'expert switching invalidates card ownership');
ownership.window._currentExpert = {user_id:'expert-a'};
ownership.window.selectedChannel = {id:'voice'};
assert.equal(ownership.sandbox.obLegacyBookingCardOwnerCurrent(owner), false, 'channel switching invalidates card ownership');
ownership.window.selectedChannel = {id:'video'};
ownership.overlay.style.display = 'none';
assert.equal(ownership.sandbox.obLegacyBookingCardOwnerCurrent(owner), false, 'closing the overlay invalidates card ownership');
ownership.overlay.style.display = 'flex';
ownership.sandbox.obCaptureLegacyBookingCardOwner('expert-a', 'video');
assert.equal(ownership.sandbox.obLegacyBookingCardOwnerCurrent(owner), false, 'reopening the overlay invalidates an earlier generation');

const switched = createBookingBoundaryHarness();
const switchedOwner = switched.sandbox.obCaptureLegacyBookingCardOwner('expert-a', 'video');
const pendingMount = switched.sandbox.obMountLegacyBookingCard(switchedOwner, 'pk_test_owned');
assert.equal(switched.metrics.loaderCalls, 1, 'an owned payment form begins one deferred Stripe.js load');
switched.identity.principal = 'client-b';
switched.identity.token = 'client-token-b';
switched.identity.identityGeneration += 1;
switched.identity.credentialGeneration += 1;
switched.window._currentExpert = {user_id:'expert-b'};
switched.window.Stripe = function Stripe() {
  switched.metrics.stripeCalls += 1;
  return {
    elements() {
      switched.metrics.elementCalls += 1;
      return { create() {
        switched.metrics.cardCreates += 1;
        return {
          mount() { switched.metrics.mounts += 1; },
          unmount() { switched.metrics.unmounts += 1; },
        };
      } };
    },
  };
};
switched.loader.resolve(switched.window.Stripe);
assert.equal(await pendingMount, null, 'a switched account/expert cannot finish the deferred card mount');
assert.deepEqual(
  switched.metrics,
  { loaderCalls:1, stripeCalls:0, elementCalls:0, cardCreates:0, mounts:0, unmounts:0, wallets:0 },
  'ownership is revalidated before creating, mounting, or publishing payment UI after the await',
);
assert.equal(switched.window._bovStripe, undefined);
assert.equal(switched.window._bovCardElement, undefined);
assert.equal(switched.mount.innerHTML, 'stale', 'a stale owner cannot mutate the active card mount');

console.log('Stripe lazy browser-boundary regression passed');
