import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function obExpertPromoPercent(sess){');
const end=html.indexOf('function obExpertMoney(value){',start);
assert(start>=0&&end>start);
const window={OB_CLIENT_CONTEXT:{token:()=> 'expert-token'},_obExpertRealtime:{focusedRoomId:'session-one'}};
const context=vm.createContext({window});vm.runInContext(html.slice(start,end),context);
const policy={version:'ownly-payments-2026-09-v2',currency:'usd',quoted_scope:'standard_us_domestic_card',processing_included:true,rounding:'nearest_cent_half_up',basis_points:450,fixed_cents:30};
const session={id:'session-one',payment_fee_policy:policy};
function estimate(overrides={}){return context.obExpertSessionEstimate({elapsedSecs:600,rate:10,freeMins:0,cut:0.88,promoPercent:0,session,...overrides});}
assert.equal(estimate().payout,95.2);
assert.equal(estimate({session:{...session,session_promo_percent_off:50}}).payout,47.45);
assert.equal(estimate({elapsedSecs:0}).payout,0);
assert.equal(estimate({rate:0.01,elapsedSecs:60}).payout,0);
assert.equal(estimate().effectivePayoutRate.toFixed(2),'9.55','v2 rate estimate cannot retain a legacy percentage');
assert.equal(estimate({session:{id:'legacy'}}).payout,88);
assert.equal(estimate({session:{...session,credit_mode:'prepaid'}}).payout,88,'redemption preserves its purchase allocation, without a new fixed fee');
assert.equal(estimate({session:{...session,payment_mode:'credit'}}).payout,88);
assert.equal(estimate({session:{...session,payment_fee_policy:{...policy,currency:'eur'}}}).payout,88);
window._obExpertPaymentPolicySnapshot={sessionId:session.id,token:'expert-token',session};
assert.equal(estimate({session:undefined}).payout,95.2);
window._obExpertRealtime.focusedRoomId='session-two';
assert.equal(estimate({session:undefined}).payout,88,'focus change cannot borrow another room fee policy');
window._obExpertRealtime.focusedRoomId='session-one';window._obExpertPaymentPolicySnapshot.token='other-expert';
assert.equal(estimate({session:undefined}).payout,88,'account change cannot borrow prior fee policy');
for(const [basis_points,fixed_cents,expected] of [[625,45,93.3],[325,0,96.75],[0,75,99.25],[0,0,100]]){
 const custom={...policy,version:'ownly-payments-catalog-v1-r3',catalog_revision:3,basis_points,fixed_cents};
 assert.equal(estimate({session:{...session,payment_fee_policy:custom}}).payout,expected);
 assert.equal(estimate({session:{...session,payment_fee_policy:{...custom,catalog_revision:4}}}).payout,88);
}
console.log('Payment estimates: fixed fee once, discounts, zero, prepaid, legacy and session/account ownership passed.');
