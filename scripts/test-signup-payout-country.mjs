import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /id="signup-payout-country"/, 'signup has a payout-country field');
assert.match(html, /class="ob-payout-country-help"/, 'signup has payout-country help');
assert.match(html, /aria-label="Why we ask for your legal payout country"/, 'payout-country help has an accessible label');
assert.match(html, /Stripe payouts and paid subscription plans are available/, 'payout-country help explains Stripe eligibility');
assert.match(html, /id="signup-payout-country-note"/, 'existing live payout-country note remains present');
assert.match(html, /\/api\/billing\/payout-countries/, 'signup loads the server country catalog');
assert.match(html, /payout_country:payoutCountry/, 'signup sends payout country to the backend');
assert.match(html, /Starter signup is available for manual review/, 'unsupported signup explains Starter review');
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
