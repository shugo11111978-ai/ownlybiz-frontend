import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');function source(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i);return html.slice(i,j);}
const render=source('  function newOfferManagementHtml(', '  function planCardsHtml('),change=source('  async function handlePlanSave(){','  window.obSubmitPlanChange =');
const plan={id:'starter',name:'Starter',monthly_price:39,annual_price:390,catalog_revision:4};
const billing={offer_version:'subscription_v2',plans:[plan],current_plan:plan,subscription:{stripe_subscription_id:'sub_owned',status:'active',interval:'monthly'},pending_change:{plan_id:'starter',interval:'monthly',effective_at:1795426832,status:'pending'}};
const context={planState:{},window:{},esc:s=>String(s||'').replaceAll('<','&lt;'),newOfferPaymentNote:()=>'',billingAttentionHtml:()=>'',planCardsHtml:()=>'',planPriceText:()=>'$39/mo'};vm.createContext(context);new vm.Script(render).runInContext(context);
const pending=context.newOfferManagementHtml(billing);assert.match(pending,/Plan change awaiting confirmation/);assert.match(pending,/Choose this same plan and billing interval to retry/);assert.doesNotMatch(pending,/Scheduled change:/);
const confirmed=context.newOfferManagementHtml({...billing,pending_change:null,scheduled_change:{plan_id:'starter'}});assert.doesNotMatch(confirmed,/Plan change awaiting confirmation/);assert.match(confirmed,/Scheduled change:/);
for(const hasPending of [true,false]){
 let requests=0,refreshed=0,success=0;const h={planState:{selected:'starter',current:plan,interval:'monthly',billing:{...billing,pending_change:hasPending?billing.pending_change:null}},planById:()=>plan,isNewSubscriptionOffer:()=>true,toastOk:()=>success++,confirmModal:async()=>true,planPriceText:()=>'$39/mo',newOfferPaymentNote:()=>'',obJson:async()=>{requests++;const e=new Error('Confirmation pending');e.data={code:'subscription_schedule_pending',pending:true,scheduled:false};throw e;},refreshBillingUi:()=>refreshed++};
 vm.createContext(h);new vm.Script(change).runInContext(h);if(hasPending){await assert.rejects(h.handlePlanSave(),/Confirmation pending/);assert.equal(requests,1);assert.equal(refreshed,1);assert.equal(success,0);}else{await h.handlePlanSave();assert.equal(requests,0);assert.equal(success,1);}
}
console.log('PASS: original billing renderer distinguishes pending/confirmed schedules; same-selection pending retry refreshes without claiming success');
