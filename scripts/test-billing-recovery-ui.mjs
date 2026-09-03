import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

for (const status of [
  'payment_action_required', 'past_due', 'unpaid', 'incomplete',
  'incomplete_expired', 'checkout_payment_failed', 'checkout_expired',
  'checkout_payment_pending', 'change_payment_pending',
]) {
  assert.match(html, new RegExp(`\\b${status}\\b`), `${status} has explicit billing UX`);
}
assert.match(html, /Open Stripe billing/);
assert.match(html, /paid-plan access is paused/);
assert.match(html, /restore or confirm plan access only after Stripe reports a successful payment|confirm access automatically after Stripe reports a successful payment/);
assert.doesNotMatch(
  html,
  /if\s*\(svcPage\s*&&\s*d\.packages\?\.length\)/,
  'retired packages must never render before a cleanup loop hides them'
);
assert.match(html, /Legacy fixed-price packages are retired/);

console.log('Billing recovery UI checks passed.');
