import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function source(start, end, offset = 0) {
  const a = html.indexOf(start, offset), b = html.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `native source boundaries: ${start}`);
  return html.slice(a, b);
}
const policySource = html.match(/<script id="ownlybiz-rate-and-session-status-policy-20260827">([\s\S]*?)<\/script>/)?.[1];
assert(policySource, 'native rate policy exists');
const channels = ['chat', 'voice', 'video'];
const nodes = {}, requests = [];
for (const channel of channels) {
  nodes[`rate-${channel}`] = {
    value: '0.50', validityMessage: '', attributes: {}, reported: false, focused: false,
    setCustomValidity(message) { this.validityMessage = message; },
    setAttribute(name, value) { this.attributes[name] = value; },
    checkValidity() { return this.validityMessage === ''; },
    reportValidity() { this.reported = true; return this.checkValidity(); },
    focus() { this.focused = true; }
  };
  const slider = { value: '' };
  nodes[`rp-${channel}`] = { textContent: '', slider, closest: () => ({ querySelector: () => slider }) };
  nodes[`${channel}-enabled`] = { checked: true };
}
const context = vm.createContext({
  window: null, document: { getElementById: id => nodes[id] || null }, CHANNELS: channels,
  API: 'https://offline.invalid/api', token: () => 'synthetic-test-token',
  toastMsg() {}, applyAvailability() {},
  fetch: async (url, options) => {
    requests.push({ url, method: options.method, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({}) };
  }
});
context.window = context;
vm.runInContext(policySource, context);
vm.runInContext(source('function obValidPaymentPolicy(policy){', 'function obExpertMoney(value){'), context);
vm.runInContext(source('function updateRatePreview(ch) {', 'function syncRateSlider'), context);
const saveStart = html.indexOf('  function saveRates(){');
assert(saveStart >= 0);
const helperStart = html.lastIndexOf('  function api(path, opts){', saveStart);
assert(helperStart >= 0);
vm.runInContext(source('  function api(path, opts){', '  function setControlValue(', helperStart), context);
vm.runInContext(source('  function saveRates(){', 'window.obSaveRatesAndAvailability = saveRates;', saveStart), context);
vm.runInContext(source('  function launchChannelEnabled(rates,channel){', '  function derive(){'), context);

const policy = { version: 'ownly-payments-catalog-v1-r4', catalog_revision: 4, currency: 'usd', quoted_scope: 'standard_us_domestic_card', processing_included: true, rounding: 'nearest_cent_half_up', basis_points: 450, fixed_cents: 30 };
context.obSignupPlanState = { billing: { offer_version: 'subscription_v2', payment_fee_policy: policy } };
const ratePolicy = context.OB_RATE_POLICY;
assert.equal(ratePolicy.minimumBaseRate, 0.5);
assert.equal(ratePolicy.channelCanStart({ rate_chat: 0, payments_enabled: true }, 'chat', 'minute'), false);
assert.equal(ratePolicy.channelCanStart({ rate_chat: 0.49, payments_enabled: true }, 'chat', 'minute'), false);
assert.equal(ratePolicy.channelCanStart({ rate_chat: 0.5, payments_enabled: true }, 'chat', 'minute'), true);
assert.equal(ratePolicy.channelCanStart({ rate_chat: 0.5, payments_enabled: false }, 'chat', 'minute'), false);
assert.equal(ratePolicy.channelCanStart({ rate_chat: 0.5, payments_enabled: false }, 'chat', 'prepaid'), true);
function resetInputs() {
  for (const channel of channels) {
    const input = nodes[`rate-${channel}`];
    input.value = '0.50'; input.reported = false; input.focused = false;
  }
}
for (const channel of channels) {
  for (const value of ['', '0', '0.49', '-1', 'not-a-rate']) {
    resetInputs();
    const input = nodes[`rate-${channel}`]; input.value = value;
    assert.equal(ratePolicy.validBaseRate(value), false, `${channel}: ${JSON.stringify(value)} rejected`);
    context.updateRatePreview(channel);
    assert.equal(input.attributes['aria-invalid'], 'true');
    assert.match(nodes[`rp-${channel}`].textContent, /Choose \$0\.50\/min or more/);
    assert.equal(context.validateExpertRateInputs(), false);
    assert(input.reported && input.focused, 'invalid input receives native validity feedback');
    requests.length = 0;
    assert.equal(await context.saveRates(), false);
    assert.equal(requests.length, 0, 'invalid save must not reach the HTTP boundary');
  }
  for (const value of ['0.50', '0.75']) {
    resetInputs(); nodes[`rate-${channel}`].value = value;
    assert.equal(ratePolicy.validBaseRate(value), true);
    assert.equal(context.validateExpertRateInputs(), true);
    assert.equal(nodes[`rate-${channel}`].attributes['aria-invalid'], 'false');
    requests.length = 0;
    assert.equal(await context.saveRates(), true);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://offline.invalid/api/experts/rates');
    assert.equal(requests[0].method, 'POST');
    assert.equal(requests[0].body[`${channel}_pm`], Number(value), 'accepted price is not clamped');
  }
  assert.equal(ratePolicy.sessionRate({ rate_per_min: 0 }, { [`rate_${channel}`]: 5 }, channel), 0,
    'historic zero session remains authoritative despite the new editor minimum');
}
assert.equal(ratePolicy.requiresAuthorization('minute', 0), false);

resetInputs();
context.updateRatePreview('chat');
const preview = () => nodes['rp-chat'].textContent;
assert.match(preview(), /60 paid minutes: \$30\.00.*\$28\.35.*4\.5% \+ \$0\.30/);
assert.match(preview(), /subscription is billed separately/);
assert.match(preview(), /one standard US card payment in USD, before discounts/);
assert.equal(Number(nodes['rp-chat'].slider.value), 0.5);
context.obSignupPlanState.billing.payment_fee_policy = { ...policy, basis_points: 625, fixed_cents: 45 };
context.updateRatePreview('chat');
assert.match(preview(), /\$30\.00.*\$27\.67.*6\.25% \+ \$0\.45/, 'preview uses current catalog values and half-up rounding');
context.obSignupPlanState.billing.payment_fee_policy = { ...policy, basis_points: 0, fixed_cents: 30 };
context.updateRatePreview('chat');
assert.match(preview(), /\$30\.00.*\$29\.70/, 'one fixed fee per payment, not per minute');
context.obSignupPlanState.billing.payment_fee_policy = { ...policy, catalog_revision: 5 };
context.updateRatePreview('chat');
assert.match(preview(), /payment rate will be confirmed/, 'untrusted policy is not quoted');
for (const [fee, payout] of [[12, '26.40'], [8, '27.60'], [5, '28.50']]) {
  context.obSignupPlanState.billing = { current_plan: { platform_fee_pct: fee } };
  context.updateRatePreview('chat');
  assert(preview().includes(`$${payout}`));
  assert(preview().includes(`existing ${fee}% platform fee`));
  assert.match(preview(), /subscription is billed separately/);
}
context.obSignupPlanState.billing = {};
context.updateRatePreview('chat');
assert.match(preview(), /payment rate is loading/);

for (const channel of channels) {
  for (const value of ['', 0, 0.49, -1]) {
    const rates = { chat_pm: 0.5, voice_pm: 0.75, video_pm: 0.5, [`${channel}_pm`]: value };
    assert.equal(context.launchOfferInfo(rates).configured, false, 'enabled channel below minimum blocks launch');
    rates[`${channel}_enabled`] = 0;
    assert.equal(context.launchOfferInfo(rates).configured, true, 'disabled channel is ignored by launch');
  }
}
assert.equal(context.launchOfferInfo({ chat_pm: 0.5, voice_pm: 0.75, video_pm: 0.5 }).configured, true);
assert.equal(context.launchOfferInfo({ chat_enabled: 0, voice_enabled: 0, video_enabled: 0 }).configured, false);
console.log('PASS: native per-minute minimum, invalid-save HTTP guard, accepted rates, dynamic one-payment estimate, legacy fees, historic zero sessions, and launch availability.');
