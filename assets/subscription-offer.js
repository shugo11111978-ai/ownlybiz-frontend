/* Shared subscription presentation. Pure functions are also used for server first paint. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {root.OB_SUBSCRIPTION_OFFER=api;root.obSubscriptionOfferMode=function(){return api.mode(root.__OB_PUBLIC_OFFER__);};}
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var IDS=['starter','pro','scale'];
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function money(cents){return '$'+(cents/100).toLocaleString('en-US',{minimumFractionDigits:cents%100?2:0,maximumFractionDigits:2});}
  function valid(data){
    if(!data||data.available!==true||data.offer_version!=='subscription_v2'||!Number.isSafeInteger(data.catalog_revision)||data.catalog_revision<1||!Array.isArray(data.plans)||data.plans.length!==3)return false;
    var fee=data.payment_fee_policy;
    if(!fee||fee.currency!=='usd'||fee.processing_included!==true||fee.quoted_scope!=='standard_us_domestic_card'||!Number.isSafeInteger(fee.basis_points)||fee.basis_points<0||fee.basis_points>10000||!Number.isSafeInteger(fee.fixed_cents)||fee.fixed_cents<0||fee.fixed_cents>100000)return false;
    return IDS.every(function(id){var items=data.plans.filter(function(p){return p.id===id;});return items.length===1&&items[0].offer_version==='subscription_v2'&&items[0].currency==='usd'&&['monthly_price','annual_price'].every(function(k){var n=items[0][k];return typeof n==='number'&&Number.isFinite(n)&&n>=1&&n<=100000&&Math.abs(n*100-Math.round(n*100))<0.00001;});});
  }
  function mode(data){
    if(valid(data))return 'subscription_v2';
    if(data&&data.available===false&&data.signup_available===false&&typeof data.reason==='string'&&['legacy','subscription_v2'].indexOf(data.offer_version)>=0)return data.offer_version;
    return 'unknown';
  }
  function feeText(data){var f=data.payment_fee_policy;return (f.basis_points/100)+'% + '+money(f.fixed_cents)+' per successful payment';}
  function paymentNote(data){return valid(data)?feeText(data)+' for standard US domestic-card payments in USD. This single combined fee includes ordinary processing and Ownlybiz payment services. Payment fees apply during the software trial.':'Current payment fees could not be confirmed. Please reload before choosing a plan.';}
  function amount(plan,interval){return Math.round(plan[interval==='annual'?'annual_price':'monthly_price']*100);}
  function annualSaving(data){return data.plans.every(function(p){return amount(p,'annual')===10*amount(p,'monthly');});}
  function features(plan){
    return (Array.isArray(plan.features)?plan.features:[]).filter(function(f){return typeof f==='string';}).map(function(f){var limit=plan.quantities&&plan.quantities.chat_concurrency;return f==='Human chat'&&Number.isSafeInteger(limit)&&limit>=0?chatLimit(limit):f;});
  }
  function chatLimit(value){return value===0?'Human chat not included':'Up to '+value+' simultaneous human chat'+(value===1?'':'s');}
  function chatNote(){return '<p class="ob-offer-chat-note">Choose your chat limit in session settings; it starts at one. Voice and video remain one at a time.</p>';}
  function card(plan,data,interval,signup,selected){
    var suffix=interval==='annual'?'/year':'/month';
    var price=money(amount(plan,interval));
    var items=features(plan).map(function(f){return '<li>'+esc(f)+'</li>';}).join('');
    var href='/signup?plan='+encodeURIComponent(plan.id)+'&interval='+interval;
    if(signup)return '<button type="button" class="ob-plan-choice '+(plan.id===selected?'active':'')+'" data-ob-signup-plan="'+plan.id+'" onclick="obSetSignupPlan(\''+plan.id+'\')" aria-pressed="'+(plan.id===selected)+'"><span class="ob-plan-choice-top"><span class="ob-plan-name">'+esc(plan.name)+'</span><span class="ob-plan-price">'+price+suffix+'</span></span><span class="ob-plan-desc">'+esc(plan.description||'')+'</span></button>';
    return '<article class="pricing-card'+(plan.id==='pro'?' popular':'')+'"><div class="pricing-tier">'+esc(plan.name)+'</div><div class="pricing-price">'+price+'<sub>'+suffix+'</sub></div><p class="ob-offer-billing">'+(interval==='annual'?'Billed once yearly after your trial.':'Billed monthly after your trial.')+'</p><p>'+esc(plan.description||'')+'</p><ul class="pricing-features">'+items+'</ul>'+(data.signup_available===true?'<a class="btn '+(plan.id==='pro'?'btn-primary':'btn-secondary')+'" href="'+href+'">Try '+esc(plan.name)+' for two months</a>':'<button class="btn btn-secondary" disabled>Signup temporarily unavailable</button>')+'</article>';
  }
  function intervals(data,interval,signup){return '<div class="ob-plan-interval-group" role="group" aria-label="Subscription billing interval">'+['monthly','annual'].map(function(i){var text=i==='monthly'?'Monthly':(annualSaving(data)?'Annual · pay for 10 months':'Annual');return '<button type="button" class="ob-plan-interval-btn '+(i===interval?'active':'')+'" aria-pressed="'+(i===interval)+'" onclick="'+(signup?'obSetSignupPlan((window.obSignupPlanState&&window.obSignupPlanState.selected)||\'starter\',\''+i+'\')':'obSetPublicOfferInterval(\''+i+'\')')+'">'+text+'</button>';}).join('')+'</div>';}
  function signupSummary(data,interval,chosen,review){
    var suffix=interval==='annual'?'/year':'/month';
    var trial=chosen.trial_quantities;
    var billing='<div class="ob-signup-intervals" role="group" aria-label="Billing frequency">'+['monthly','annual'].map(function(i){return '<button type="button" aria-pressed="'+(i===interval)+'" onclick="obSetSignupPlan(\''+chosen.id+'\',\''+i+'\')">'+(i==='annual'?'Yearly'+(annualSaving(data)?' · save 2 months':''):'Monthly')+'</button>';}).join('')+'</div>';
    var choices=data.plans.map(function(plan){return '<button type="button" class="ob-signup-choice" data-ob-signup-plan="'+plan.id+'" aria-pressed="'+(plan.id===chosen.id)+'" onclick="obSetSignupPlan(\''+plan.id+'\')"><span>'+esc(plan.name)+'</span><span>'+money(amount(plan,interval))+suffix+'</span></button>';}).join('');
    var allowance=trial?'<p class="ob-signup-allowance">Across your two-month trial: '+esc(trial.one_to_one_call_minutes)+' 1:1 audio/video minutes'+(trial.group_participant_minutes?', '+esc(trial.group_participant_minutes)+' group participant-minutes':'')+(trial.creation_ai_credits?' and '+esc(trial.creation_ai_credits)+' creation AI credits':'')+'.</p>':'';
    var items=features(chosen).map(function(f){return '<li>'+esc(f)+'</li>';}).join('');
    return '<div class="ob-signup-selection">'
      +'<div class="ob-signup-summary"><div><span class="ob-signup-summary-label">Your plan</span><strong>'+esc(chosen.name)+'</strong></div><div class="ob-signup-summary-price"><strong>'+money(amount(chosen,interval))+'<span>'+suffix+'</span></strong><span>after your two-month trial</span></div></div>'
      +'<details class="ob-signup-change"><summary>Change plan or billing</summary>'+billing+'<div class="ob-signup-choices" role="group" aria-label="Choose your plan">'+choices+'</div></details>'
      +(review?'<dl class="ob-signup-total"><dt>Subscription due today</dt><dd>$0</dd></dl>':'')
      +'<p class="ob-signup-trial-note">Two months free. Card required to start your trial. Renews automatically; cancel before your trial ends to avoid the first subscription charge.</p>'
      +(data.signup_requires_approval===true?'<p class="ob-signup-approval-note">We review new expert accounts before checkout. Your trial starts after approval, when you finish checkout.</p>':'')
      +'<details class="ob-signup-included"><summary>What’s included and trial limits</summary>'+(items?'<ul>'+items+'</ul>':'')+allowance+'<p><a href="/pricing" target="_blank" rel="noopener">Compare all plan features and limits</a></p></details>'
      +'<p class="ob-signup-payment-note">Client payments: <strong>'+esc(feeText(data))+'</strong>, including ordinary processing and Ownlybiz payment services. Applies during the trial. US-issued cards in USD.</p>'
      +'<p class="ob-signup-country-eligibility-note"></p></div>';
  }
  function loading(){return '<div class="ob-offer-unavailable" role="status"><h2>Current plans are loading</h2><p>Prices and payment fees must be confirmed before checkout. Please reload if this message remains.</p></div>';}
  function comparison(data){
    var rows=(data.comparison_rows||[]).slice();
    if(data.plans.every(function(p){return p.trial_quantities;}))['one_to_one_call_minutes','group_participant_minutes','creation_ai_credits'].forEach(function(id){rows.push({label:{one_to_one_call_minutes:'1:1 audio/video minutes · entire initial trial',group_participant_minutes:'Group participant-minutes · entire initial trial',creation_ai_credits:'Creation credits · entire initial trial'}[id],values:Object.fromEntries(data.plans.map(function(p){return [p.id,p.trial_quantities[id]];}))});});
    if(!Array.isArray(rows)||!rows.length)return '';
    return '<div class="ob-offer-table-wrap"><table class="ob-offer-table"><caption>Compare what is included</caption><thead><tr><th scope="col">Feature or allowance</th>'+data.plans.map(function(p){return '<th scope="col">'+esc(p.name)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(row){if(!row||!row.label||!row.values)return '';return '<tr><th scope="row">'+esc(row.id==='chat_concurrency'?'Simultaneous human chats':row.label)+'</th>'+data.plans.map(function(p){var value=row.values[p.id];return '<td>'+esc(value==null?'—':row.id==='chat_concurrency'&&Number.isSafeInteger(value)&&value>=0?chatLimit(value):value)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
  }
  function faq(data){
    var qs=[
      ['How does the two-month trial work?','Each plan starts with two calendar months without a software subscription charge. A payment method is required. Stripe Checkout shows the exact first-charge date and recurring amount before confirmation. Stop renewal before that date to avoid the first software bill. The initial trial is available once; changing plans does not restart it.'],
      ['What do I pay when a client pays me?',paymentNote(data)+' For a $100 supported payment, the combined fee is '+money(Math.min(10000,Math.floor((10000*data.payment_fee_policy.basis_points+5000)/10000)+data.payment_fee_policy.fixed_cents))+'. Spending prepaid credit does not charge the payment fee a second time. International cards, other currencies and unsupported methods are not part of this offer.'],
      ['What is included in annual billing?','The annual amount covers twelve months and is billed once yearly after the initial trial. '+(annualSaving(data)?'Current annual prices equal ten monthly payments. ':'')+'This annual price is separate from the initial trial.'],
      ['Are video, group sessions and AI unlimited?','No. Each plan has finite allowances. When group sessions are enabled, they are host-led broadcasts; attendee cameras are not an all-camera meeting. One hosted group event can run at a time. Your dashboard shows available usage and the current period. Live audio/video uses the call allowance; groups use participant-minutes, including the host. Free and discounted sessions also use the applicable allowance. New sessions require enough remaining allowance; there is no automatic overage charge.'],
      ['How do creation AI credits work?','Eligible plans include creation credits for website and email work. The initial two-calendar-month trial has one total credit bucket. After the trial, included credits refresh by calendar-month allowance periods, including on annual subscriptions. Changing plans does not refill spent usage. Purchased credits are separate; generation can consume more than one credit depending on the action.'],
      ['Who can sign up for this offer?','This offer currently supports US-based expert businesses and eligible USD payments. Stripe Connect identity and business verification, account approval and service setup still apply. Your software subscription and Stripe payout setup are separate steps.'],
      ['What happens to an existing account?','Existing subscriptions and accepted payments keep their agreed terms. The prices here apply to new subscriptions or an explicitly confirmed plan change; they do not silently reprice an existing contract.'],
      ['Do I need another email service or a domain?','Your Ownlybiz site address is included. Eligible plans can connect a domain you own, with DNS and SSL verification. Email Center uses your connected email provider and its limits, costs and recipient consent requirements.']
    ];
    return '<section class="ob-offer-faq"><h2>Questions about plans and payments</h2>'+qs.map(function(pair){return '<details><summary>'+esc(pair[0])+'</summary><p>'+esc(pair[1])+'</p></details>';}).join('')+'</section>';
  }
  function render(data,kind,interval,selected){
    if(!valid(data))return loading();
    interval=interval==='annual'?'annual':'monthly';
    var chosen=data.plans.find(function(p){return p.id===selected;})||data.plans[0];
    if(kind==='signup'||kind==='review')return signupSummary(data,interval,chosen,kind==='review');
    var heading=kind==='home'?'<h2>Build your practice. Choose your plan.</h2>':'<h1>Tools for your practice. Room to grow.</h1>';
    return '<div class="ob-public-offer" data-catalog-revision="'+data.catalog_revision+'"><header class="ob-offer-heading"><p class="section-tag">Ownlybiz plans</p>'+heading+'<p>Start with two calendar months without a software charge. A card is required; payment fees still apply.</p>'+intervals(data,interval,false)+'</header><div class="pricing-grid">'+data.plans.map(function(p){return card(p,data,interval,false);}).join('')+'</div>'+chatNote()+'<aside class="ob-offer-payment"><strong>One payment rate across all plans</strong><p>'+esc(paymentNote(data))+'</p><p>For US-based expert businesses. USD and supported US-issued cards only. Your subscription and payment fees are separate. <a href="/legal/independent-professional-terms">Read the payment and subscription terms</a>.</p></aside>'+(kind==='home'?'<p class="ob-offer-more"><a href="/pricing">Compare allowances and read plan details →</a></p>':comparison(data)+faq(data))+'</div>';
  }
  function usage(value){
    if(value&&value.managed===false)return '';
    if(!value||value.managed!==true)return '<section class="ob-media-usage" role="status"><h3>Live usage</h3><p>Current usage is unavailable. Refresh billing before starting a new session.</p></section>';
    var rows=['one_to_one','group'].map(function(key){
      var item=value[key];
      if(!item||!['included_minutes','used_minutes','reserved_minutes','remaining_minutes'].every(function(k){return typeof item[k]==='number'&&Number.isFinite(item[k])&&item[k]>=0;}))return '<p>Current usage could not be confirmed.</p>';
      var label=key==='one_to_one'?'1:1 audio/video call minutes':'Group participant-minutes';
      return '<h4>'+label+'</h4><dl><dt>Included</dt><dd>'+esc(item.included_minutes)+'</dd><dt>Used</dt><dd>'+esc(item.used_minutes)+'</dd><dt>Reserved</dt><dd>'+esc(item.reserved_minutes)+'</dd><dt>Available</dt><dd>'+esc(item.remaining_minutes)+'</dd></dl>';
    }).join('');
    var period=value.period||{},ends=Number.isSafeInteger(period.ends_at)&&period.ends_at>0?new Date(period.ends_at*1000).toISOString().slice(0,10)+' UTC':'not yet confirmed';
    return '<section class="ob-media-usage"><h3>Live usage · '+(period.kind==='trial'?'initial trial total':'current monthly allowance')+'</h3>'+rows+'<p>Current period ends '+esc(ends)+'. 1:1 audio and video share the call allowance. Group usage counts each connected participant, including the host. Free and discounted sessions count too.</p><p>Creating a group reserves capacity × duration, including the host. Unused reserved time is released when the session finishes. No automatic overage charges.</p></section>';
  }
  function terms(data){return [['h2','Software subscriptions and payment services'],['p','New subscriptions under this offer have an initial two-calendar-month software trial with a payment method required. Checkout confirms the exact first-charge date and recurring amount. Stop renewal before the first-charge date to avoid the first software bill. Annual billing covers twelve months. The trial is available once and plan changes do not restart it.'],['p',paymentNote(data)+' The offer supports US-based expert businesses, USD and eligible US-issued cards. It does not promise an international or alternative-payment rate. Accepted payment commitments retain their saved fee terms.'],['p','Paid, free, promotional and discounted sessions consume the applicable usage allowance. The dashboard shows limits and remaining usage. Unused included allowances do not accumulate. There is no automatic overage billing. Existing paid obligations and separately agreed complimentary access remain subject to their own terms.']];}
  return {mode:mode,valid:valid,money:money,feeText:feeText,paymentNote:paymentNote,render:render,terms:terms,amount:amount,annualSaving:annualSaving,usage:usage};
});
