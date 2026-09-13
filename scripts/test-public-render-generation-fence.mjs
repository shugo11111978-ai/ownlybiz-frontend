import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const lifecycleStart = html.indexOf('var obPublicRenderLifecycle = { generation:0, current:null };');
const lifecycleEnd = html.indexOf('function obPublicLoaderApiBase()', lifecycleStart);
assert(lifecycleStart >= 0 && lifecycleEnd > lifecycleStart, 'canonical public render lifecycle must exist');
const lifecycleSource = html.slice(lifecycleStart, lifecycleEnd);

const experienceStart = html.indexOf('window.obStabilizePublicExpertExperience = function(data, operation){');
const experienceEnd = html.indexOf('\n\t  };', experienceStart);
assert(experienceStart >= 0 && experienceEnd > experienceStart, 'public experience stabilizer must exist');
const experienceSource = html.slice(experienceStart, experienceEnd + '\n\t  };'.length);
assert(!html.slice(html.indexOf('function sanitizePlaceholders(data)'), html.indexOf('function wrapSessionEntrypoints()')).includes('function wrapPublicRenderers'), 'public rendering must not be installed through a wrapper');
assert(lifecycleSource.includes('obSchedulePublicExpertStabilization(e, renderOperation);'), 'canonical payload application must own delayed stabilization scheduling');

const timers = [];
const events = [];
let pathname = '/alpha';
let search = '';
let principal = '';
let identityGeneration = 0;
let credentialGeneration = 0;
let gateOpen = true;
let publicViewActive = true;

const location = {
  hostname: 'ownlybiz.com',
  get pathname() { return pathname; },
  get search() { return search; },
};
const document = {
  querySelector(selector) {
    if(selector === '#view-4.active' && publicViewActive) return {};
    return null;
  },
};
const window = {
  obIsPlatformRouteRoot(value) {
    return ['admin', 'dash', 'pricing', 'about', 'contact', 'terms', 'privacy'].includes(String(value || '').toLowerCase());
  },
  OB_CLIENT_CONTEXT: {
    principal: () => principal,
    identityGeneration: () => identityGeneration,
    credentialGeneration: () => credentialGeneration,
  },
  OB_RATE_POLICY: {
    ownerRate(expert, channel) {
      events.push(`rate:${expert.marker}:${channel}`);
      return Number(expert[`rate_${channel}`] || 0);
    },
  },
  obPublicApplyAccepted(expert) {
    if(!gateOpen) return false;
    const routeSlug = pathname.split('/').filter(Boolean)[0] || '';
    return !routeSlug || this.obIsPlatformRouteRoot(routeSlug) || expert.slug === routeSlug;
  },
  obPreparePublicMarketplacePayload(expert) {
    events.push(`prepare:${expert.marker}`);
    return { marker:expert.marker };
  },
  obFinalizePublicMarketplacePayload(operation) { events.push(`finalize:${operation.marker}`); },
  _applyExpertWebsite(expert) { events.push(`base:${expert.marker}`); },
  _refreshPublicPage(expert) { events.push(`refresh:${expert.marker}`); },
  obRenderPublicReviews({ expert }) { events.push(`reviews:${expert.marker}`); },
  _markRouteReady() { events.push('ready'); },
  obStabilizePublicExpertExperience(expert, operation) {
    assert.equal(this.obPublicExpertRenderCurrent(operation), true, 'only a current operation reaches the stabilizer');
    events.push(`stabilize:${expert.marker}`);
  },
};

Object.assign(window, {
  location,
  document,
  URLSearchParams,
  setExpertOnlineStatus(value) { events.push(`online:${value}`); },
  setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; },
});
window.window = window;
vm.runInNewContext(lifecycleSource, window, { filename:'canonical-public-render-lifecycle.js' });

function flushTimers() {
  while(timers.length) timers.shift().callback();
}
function expert(slug, marker) {
  return { slug, name:`${marker} Expert`, marker, rate_chat:1, rate_voice:2, rate_video:3, reviews:[] };
}

const alphaOld = expert('alpha', 'alpha-old');
const alphaNew = expert('alpha', 'alpha-new');
assert.equal(window.obApplyPublicExpertPayload(alphaOld, 'alpha', {}), alphaOld);
assert.equal(window.obApplyPublicExpertPayload(alphaNew, 'alpha', {}), alphaNew);
events.length = 0;
flushTimers();
assert.equal(events.filter(item => item === 'stabilize:alpha-old').length, 0, 'same-slug supersession must cancel every old delayed pass');
assert.equal(events.filter(item => item === 'stabilize:alpha-new').length, 5, 'the newest render keeps every stabilization pass');

pathname = '/beta';
const beta = expert('beta', 'beta');
window.obApplyPublicExpertPayload(beta, 'beta', {});
events.length = 0;
pathname = '/gamma';
flushTimers();
assert.deepEqual(events, [], 'a route transition must cancel delayed work before the next payload arrives');

pathname = '/delta';
const delta = expert('delta', 'delta');
window.obApplyPublicExpertPayload(delta, 'delta', {});
events.length = 0;
principal = 'client-2';
identityGeneration += 1;
credentialGeneration += 1;
flushTimers();
assert.deepEqual(events, [], 'an identity transition must cancel delayed public work');

pathname = '/epsilon';
const epsilon = expert('epsilon', 'epsilon');
window.obApplyPublicExpertPayload(epsilon, 'epsilon', {});
events.length = 0;
credentialGeneration += 1;
flushTimers();
assert.deepEqual(events, [], 'a credential rotation must cancel delayed public work');

const acceptedExpert = window._currentExpert;
const acceptedSlug = window._currentExpertSlug;
const appliedMarker = window.__obPublicExpertPayloadAppliedSlug;
events.length = 0;
const rejected = expert('wrong-route', 'rejected');
assert.equal(window.obApplyPublicExpertPayload(rejected, 'wrong-route', {}), null);
assert.equal(window._currentExpert, acceptedExpert, 'route rejection must happen before current-expert mutation');
assert.equal(window._currentExpertSlug, acceptedSlug, 'route rejection must happen before current-slug mutation');
assert.equal(window.__obPublicExpertPayloadAppliedSlug, appliedMarker, 'route rejection must not mark the payload applied');
assert.deepEqual(events, [], 'route rejection must happen before rate normalization, render, marketplace, reviews, and ready state');

pathname = '/epsilon';
gateOpen = false;
events.length = 0;
assert.equal(window.obApplyPublicExpertPayload(expert('epsilon', 'gate-rejected'), 'epsilon', {}), null);
assert.deepEqual(events, [], 'publication-gate rejection must happen before every mutation');
gateOpen = true;

pathname = '/zeta';
const zeta = expert('zeta', 'zeta');
window.obApplyPublicExpertPayload(zeta, 'zeta', {});
events.length = 0;
pathname = '/pricing';
publicViewActive = false;
flushTimers();
assert.deepEqual(events, [], 'leaving the public expert surface must cancel delayed work');

const hookEffects = [];
const hookWindow = {
  obPublicExpertRenderCurrent: operation => operation === 'current',
};
vm.runInNewContext(`
  (function(){
    var CHANNELS=['chat','voice','video'];
    function enabledFlag(value){ return value === false || value === 0 || value === '0' ? 0 : 1; }
    function storeExpertPayload(data){ __effects.push('store:' + data.marker); }
    function sanitizePlaceholders(data){ __effects.push('sanitize:' + data.marker); }
    function applyAvailability(data){ __effects.push('availability:' + data.marker); }
    ${experienceSource}
  })();
`, { window:hookWindow, __effects:hookEffects }, { filename:'public-experience-stabilizer.js' });
assert.equal(hookWindow.obStabilizePublicExpertExperience({marker:'stale'}, 'stale'), false);
assert.deepEqual(hookEffects, [], 'the experience hook must reject a stale operation before mutating cache or DOM');
const hookPayload = {marker:'current', chat_enabled:null, voice_enabled:0, video_enabled:true};
assert.equal(hookWindow.obStabilizePublicExpertExperience(hookPayload, 'current'), true);
assert.deepEqual(hookEffects, ['store:current', 'sanitize:current', 'availability:current']);
assert.deepEqual(
  {chat:hookPayload.chat_enabled, voice:hookPayload.voice_enabled, video:hookPayload.video_enabled},
  {chat:1, voice:0, video:1},
  'the canonical hook preserves availability normalization'
);

console.log('canonical public render generation fence regression passed');
