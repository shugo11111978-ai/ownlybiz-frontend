import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /id="signup-payout-country"/, 'signup has a payout-country field');
assert.match(html, /class="tos-details ob-payout-country-details"/, 'signup uses the existing expandable-details pattern');
assert.match(html, /id="signup-payout-country-summary"/, 'expandable country guidance retains the existing visible text');
assert.match(html, /aria-describedby="signup-payout-country-summary"/, 'country selector describes its live guidance accessibly');
assert.match(html, /Stripe payouts and paid subscription plans are available/, 'expanded country guidance explains Stripe eligibility');
assert.doesNotMatch(html, /class="ob-payout-country-help"/, 'question-mark tooltip is removed');
assert.match(html, /noteSummary\.textContent = 'Paid plans and Stripe payouts are not available for this country yet\.'/,
  'step-one unsupported guidance does not mention manual approval');
assert.match(html, /\/api\/billing\/payout-countries/, 'signup loads the server country catalog');
assert.match(html, /payout_country:payoutCountry/, 'signup sends payout country to the backend');
assert.match(html, /Choose Starter to submit your account for manual review/, 'the later plan step explains Starter review');
assert.match(html, /paidBlocked = p\.id !== 'starter'/, 'only paid signup plans are country-gated');
assert.match(html, /btn\.disabled = paidBlocked/, 'unsupported paid checkout button is disabled');
assert.match(html, /\['Payout country', payoutCountry\]/, 'Admin Expert Info shows payout country');
assert.match(html, /\['Paid plan eligibility', payoutStatus\]/, 'Admin Expert Info shows country eligibility');

const scripts = html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi);
let scriptCount = 0;
for (const match of scripts) {
  scriptCount += 1;
  if (match[1].trim()) new vm.Script(match[1], { filename: `index.html#script-${scriptCount}` });
}
assert(scriptCount > 0, 'inline scripts were parsed');

console.log('signup payout country frontend smoke: ok');
