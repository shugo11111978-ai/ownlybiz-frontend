import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const presentation=createRequire(import.meta.url)('../assets/subscription-offer.js');

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /id="signup-payout-country"/, 'signup has a payout-country field');
assert.match(html, /class="tos-details ob-payout-country-details"/, 'signup uses the existing expandable-details pattern');
assert.match(html, /id="signup-payout-country-summary"/, 'expandable country guidance retains the existing visible text');
assert.match(html, /class="ob-payout-country-toggle"/, 'expandable country guidance has a bold text affordance');
assert.match(html, />Learn more</, 'collapsed country guidance identifies the expandable action');
assert.match(html, />Show less</, 'expanded country guidance identifies the collapse action');
assert.doesNotMatch(html, /\.ob-payout-country-details summary::after/, 'country guidance does not add a second arrow');
assert.match(html, /aria-describedby="signup-payout-country-summary"/, 'country selector describes its live guidance accessibly');
assert.match(html, /for="signup-payout-country">Business country/, 'signup uses a plain business-country label');
assert.match(html, /obSignupBusinessCountries/, 'the new offer reads its business-country scope from the API');
assert.match(html, /Use the country where your Stripe connected account will be legally based, which is separate from where your clients live/, 'expanded guidance distinguishes business country from client location');
assert.match(html, /check Stripe Connect onboarding and paid-plan availability[\s\S]*does not confirm current balance or bank-payout eligibility/,
  'expanded country guidance limits Ownlybiz eligibility claims and keeps bank-payout authority in Stripe');
assert.doesNotMatch(html, /class="ob-payout-country-help"/, 'question-mark tooltip is removed');
assert.match(html, /noteSummaryText\.textContent = 'Supported for Ownlybiz paid plans and Stripe Connect onboarding\. Bank-payout status is verified in Stripe\.'/,
  'supported country guidance does not claim provider balance or bank-payout readiness');
assert.match(html, /noteSummaryText\.textContent = 'Ownlybiz paid plans and Stripe Connect onboarding are not available for this country yet\.'/,
  'step-one unsupported guidance does not imply a platform-controlled payout decision');
assert.match(html, /\/api\/billing\/payout-countries/, 'signup loads the server country catalog');
assert.match(html, /payout_country:payoutCountry/, 'signup sends payout country to the backend');
assert.match(html, /Choose Starter to submit your account for manual review/, 'the later plan step explains Starter review');
assert.match(html, />Stripe account country<\/label>/,
  'Connect onboarding asks for the connected-account country without implying a platform payout account');
assert.doesNotMatch(html, /Stripe payout account is legally based/,
  'signup and Connect onboarding avoid the obsolete payout-account description');
assert.match(html, /paidBlocked = \(v2 \|\| p\.id !== 'starter'\)/, 'legacy paid plans and every new subscription tier are country-gated');
assert.match(html, /btn\.disabled = paidBlocked/, 'unsupported paid checkout button is disabled');
assert.match(
  html,
  /function requestHeaders\(json, requestOptions\)[\s\S]*?Object\.prototype\.hasOwnProperty\.call\(requestOptions,'token'\)/,
  'billing requests resolve token overrides from their explicit request-options argument',
);
assert.match(
  html,
  /requestHeaders\(body !== undefined, opts\)/,
  'the billing JSON client passes its local request options into header construction',
);
assert.doesNotMatch(
  html,
  /function headers\(json\)[\s\S]{0,300}?hasOwnProperty\.call\(opts,'token'\)/,
  'billing header construction cannot capture an out-of-scope opts binding',
);
assert.match(html, /\['Payout country', payoutCountry\]/, 'Admin Expert Info shows payout country');
assert.match(html, /\['Paid plan eligibility', payoutStatus\]/, 'Admin Expert Info shows country eligibility');

// Execute the original catalog loader and change handler: the initial empty
// selection was the post-load path that replaced the compact helper.
const start=html.indexOf('  window._obSignupPayoutCountries = [];');
const end=html.indexOf("  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.obLoadSignupPayoutCountries);",start);
assert(start>=0&&end>start);
const elements={
  'signup-payout-country':{value:'',disabled:true,innerHTML:''},
  'signup-payout-country-note':{style:{}},
  'signup-payout-country-summary-text':{textContent:''}
};
let mode='subscription_v2';
const context={window:null,OB_SUBSCRIPTION_OFFER:presentation,__OB_PUBLIC_OFFER__:{payout_scope:{business_countries:['US']}},document:{getElementById:id=>elements[id]},sessionStorage:{getItem:()=>'',setItem:()=>{}},obSubscriptionOfferMode:()=>mode,obLoadPublicOffer:async()=>{},fetch:async()=>({ok:true,json:async()=>({countries:[{code:'US',label:'United States',supported:true},{code:'CA',label:'Canada',supported:true}]})})};context.window=context;vm.createContext(context);
vm.runInContext(html.slice(start,end),context);
await context.obLoadSignupPayoutCountries();
assert.equal(elements['signup-payout-country'].disabled,false);
assert.equal(elements['signup-payout-country-summary-text'].textContent,'Select the country where your business is legally based.','catalog completion preserves neutral business guidance');
assert.equal(context._obSignupPayoutCountries.length,1,'v2 catalog remains US-only');
elements['signup-payout-country'].value='US';context.obUpdateSignupPayoutCountry();
assert.equal(elements['signup-payout-country-summary-text'].textContent,'Payments are available for this business location.','eligible selection confirms the business location');
context.__OB_PUBLIC_OFFER__.payout_scope.business_countries=['US','CA'];await context.obLoadSignupPayoutCountries();assert.equal(context._obSignupPayoutCountries.length,2,'future API-authorized scope expands without a frontend country change');
context.__OB_PUBLIC_OFFER__.payout_scope={};await context.obLoadSignupPayoutCountries();assert.equal(elements['signup-payout-country'].disabled,true,'missing country policy fails closed');
mode='legacy';elements['signup-payout-country'].value='';await context.obLoadSignupPayoutCountries();
assert.equal(elements['signup-payout-country-summary-text'].textContent,'Select the country where your business is legally based.','legacy empty selection keeps plain business-country guidance');
elements['signup-payout-country'].value='CA';context.obUpdateSignupPayoutCountry();
assert.match(elements['signup-payout-country-summary-text'].textContent,/Supported for Ownlybiz paid plans/,'legacy country eligibility remains intact');

const scripts = html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi);
let scriptCount = 0;
for (const match of scripts) {
  scriptCount += 1;
  if (match[1].trim()) new vm.Script(match[1], { filename: `index.html#script-${scriptCount}` });
}
assert(scriptCount > 0, 'inline scripts were parsed');

console.log('signup payout country frontend smoke: ok');
