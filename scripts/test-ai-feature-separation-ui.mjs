import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

assert.match(
  html,
  /var DASH_PANELS = \{[^}]*'on-demand':1[^}]*\}/,
  'On-Demand is a first-class dashboard route and must not rewrite to Overview',
);

function scriptById(id){
  const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match,`${id} is installed`);
  return match[1];
}
function slice(source,start,end){
  const left=source.indexOf(start);assert(left>=0,`section starts at ${start}`);
  const right=source.indexOf(end,left+start.length);assert(right>=0,`section ends at ${end}`);
  return source.slice(left,right);
}

const admin=scriptById('ownlybiz-admin-expert-detail-correct-flow-20260526');
const detailStart='\t\t  function detailHtml(id, profileData, dashboardData, refundData, marketplaceData, liveCapacityData, groupSessionsData){';
const humanCard=slice(admin,'\t  function humanReplyAssistantAccessCard(id, liveCapacityData){',detailStart);
const aiAuthorityCards=slice(admin,'\t\t  function automaticAiChatAccessCard(id, ai){',detailStart);
const adminOpen=slice(admin,'  function openExpertDetail(id, slug, name){','  function install(){');
const humanSave=slice(admin,'\t\t  window.obAdminSaveHumanReplyAssistantAccess = function(id){','\t\t  window.obAdminSaveExpertAiChat = function(id){');
const automaticSave=slice(admin,'\t\t  window.obAdminSaveExpertAiChat = function(id){','  window.obAdminExpertApproveRefund = function(id){');
const canonicalDetail=slice(admin,detailStart,'  function openExpertDetail(id, slug, name){');

assert.match(humanCard,/id="ob-admin-human-reply-assistant-card"[^>]+data-ai-revision=/,'owner Expert Info carries the exact Human entitlement revision');
assert.match(humanCard,/Grant Human Reply Assistant[\s\S]*?Grant private knowledge training/,'Human drafting and Human-only training access are explicit');
assert.match(humanCard,/never sends client replies automatically[\s\S]*?never uses Automatic AI Chat training/,'the Human access card explains both feature boundaries');
assert.match(adminOpen,/requestOptions=\{token:owner\.token,signal:owner\.signal\}[\s\S]*?api\('\/admin\/experts\/' \+ encodeURIComponent\(id\) \+ '\/live-capacity',requestOptions\)/,'owner Expert Info loads Human entitlements through the captured admin identity');
assert.match(admin,/activeExpertDetailRequest[\s\S]*?captureAdminExpertDetailOwner[\s\S]*?isCurrent\(detail\.owner,\{exactCredential:true\}\)/,'admin expert detail is principal- and generation-bound');
assert.match(adminOpen,/if\(!adminExpertDetailCurrent\(detail,content\)\)return false;[\s\S]*?content\.innerHTML = detailHtml/,'only the latest selected expert may render into the admin detail screen');
assert.match(humanSave,/reply_assistant_enabled:[\s\S]*?training_enabled:[\s\S]*?expected_ai_revision:revision[\s\S]*?reason:'admin_human_reply_assistant_access_update'/,'Human access save sends the isolated literal-boolean CAS fields');
assert.match(humanSave,/api\('\/admin\/experts\/'\+encodeURIComponent\(id\)\+'\/live-capacity',\{method:'PUT',body:body\}\)/,'Human access writes only through live-capacity');
assert.doesNotMatch(humanSave,/\/ai-chat|admin_context|mode:/,'Human access save cannot mutate Automatic AI Chat');

assert.match(aiAuthorityCards,/id="ob-admin-ai-chat-visible-card"[\s\S]*?Automatic AI Chat[\s\S]*?Enable Automatic AI Chat for this expert[\s\S]*?Automatic AI Chat admin guidance/,'owner Expert Info has a distinct Automatic Chat access card');
assert.match(aiAuthorityCards,/id="ob-admin-ai-feature-authority"[\s\S]*?humanReplyAssistantAccessCard\(id,liveCapacityData\|\|\{\}\)[\s\S]*?automaticAiChatAccessCard\(id,ai\|\|\{\}\)/,'the two independent AI authority cards share one clearly labelled owner section');
assert.match(canonicalDetail,/kpi\('Automatic AI Chat'[\s\S]*?aiFeatureAuthorityCards\(id,ai,liveCapacityData\|\|\{\}\)[\s\S]*?stripeModeCard\(id, stripeMode\)/,'owner AI authority appears immediately after the relevant AI summary and before unrelated Stripe/service controls');
assert.doesNotMatch(canonicalDetail,/ob-ai-chat-mode|Semi AI/,'Automatic Chat has no Semi AI selector or copy');
assert.match(automaticSave,/api\('\/admin\/experts\/' \+ encodeURIComponent\(id\) \+ '\/ai-chat'/,'Automatic Chat keeps its dedicated admin endpoint');
assert.match(automaticSave,/mode: 'fully_ai'/,'Automatic Chat preserves backend compatibility by always saving fully_ai');
assert.doesNotMatch(automaticSave,/live-capacity|reply_assistant_enabled|training_enabled|expected_ai_revision/,'Automatic Chat save cannot mutate Human Reply Assistant access');
assert.doesNotMatch(html,/Semi AI/,'Semi AI is not presented as a current frontend feature');
assert.doesNotMatch(html,/id="ob-ai-chat-mode"/,'no active or fallback owner card exposes a mode selector');

const onDemand=scriptById('ownlybiz-on-demand-readings-20260607');
const autopilot=slice(onDemand,'  function obOdAutopilotErrorMessage(error, fallback){','\n\n  function publicCard(config){');
assert.match(autopilot,/api\('\/api\/on-demand\/expert\/requests\/' \+ encodeURIComponent\(id\) \+ '\/autopilot-now'/,'Run autopilot uses the dedicated request endpoint');
assert.match(autopilot,/api\('\/api\/on-demand\/expert\/requests'/,'Run autopilot refreshes authoritative requests after the command');
assert.match(autopilot,/runResult\.success===true&&runResult\.delivered===true&&Number\(runResult\.processed\)===1[\s\S]*?String\(commandRequest\.id\)===String\(id\)/,'delivery success requires the command to identify the exact processed and delivered request');
assert.ok(autopilot.indexOf('if(deliveredEvidence)')<autopilot.indexOf('if(outcome.error)'),'authoritative refreshed delivery proof is evaluated before a transport or command error');
assert.match(autopilot,/request\.status==='delivered'&&request\.ai_status==='delivered'[\s\S]*?String\(request\.answer\|\|''\)\.trim\(\)[\s\S]*?Number\(request\.delivered_at\|\|0\)>0/,'delivery proof requires both states, a nonempty answer, and a delivery timestamp');
assert.match(autopilot,/request\.ai_status==='failed'[\s\S]*?remains available for manual review/,'persisted generation or delivery failure is reported truthfully');
assert.match(autopilot,/runResult\.skipped==='already_running'[\s\S]*?Delivery has not been confirmed/,'a concurrent worker is never reported as a completed delivery');
assert.match(autopilot,/outcome\.error[\s\S]*?Latest request state was refreshed/,'structured command errors are shown only after refreshing the target row');

function autopilotHarness(postResult,requestResult,{postReject=null,requestReject=null}={}){
  const calls=[];const notices=[];
  const owner={token:'expert-token',signal:{aborted:false}};
  const state={expertOwner:owner,expertRequests:[]};
  const button={disabled:false,textContent:'Run autopilot now'};
  const root={window:null,Promise,encodeURIComponent,String,Array,document:{getElementById(){return button;}},state,
    expertOwnerCurrent(value){return value===owner&&!owner.signal.aborted;},
    obOdBeginRequestBusy(){button.disabled=true;button.textContent='Checking delivery...';return true;},
    obOdEndRequestBusy(){button.disabled=false;button.textContent='Run autopilot now';},
    obOdRestoreRequestView(){},
    api(path,options){calls.push({path,options});if(calls.length===1){if(postReject)return Promise.reject(postReject);return Promise.resolve(postResult);}if(requestReject)return Promise.reject(requestReject);return Promise.resolve(requestResult);},
    renderExpertOnDemand(){root.rendered=(root.rendered||0)+1;},toastMsg(message,tone){notices.push({message,tone});}};
  root.window=root;vm.createContext(root);new vm.Script(autopilot,{filename:'on-demand-autopilot-now.js'}).runInContext(root);
  return {root,state,calls,notices,button,run:()=>root.obOdAutopilotNow('request-1')};
}

const deliveredRow={id:'request-1',status:'delivered',ai_status:'delivered',answer:'A private written reading',delivered_at:1788048000};
const deliveredCommand={success:true,delivered:true,processed:1,request:deliveredRow};
const delivered=autopilotHarness(deliveredCommand,{success:true,requests:[deliveredRow]});
assert.deepEqual(JSON.parse(JSON.stringify(await delivered.run())),{confirmed:true,delivered:true,run:deliveredCommand,request:deliveredRow});
assert.deepEqual(delivered.calls.map(call=>call.path),['/api/on-demand/expert/requests/request-1/autopilot-now','/api/on-demand/expert/requests']);
assert.equal(delivered.notices[0].message,'Autopilot delivered this written reading.');

const failed=autopilotHarness({success:true,processed:0},{success:true,requests:[{id:'request-1',status:'in_progress',ai_status:'failed',last_email_error:'RAW_EMAIL_PROVIDER_DETAIL'}]});
const failedResult=await failed.run();assert.equal(failedResult.delivered,false);assert.equal(failedResult.reason,'autopilot_failed');
assert.equal(failed.notices[0].message,'Autopilot did not deliver this reading. The request remains available for manual review.');
assert.doesNotMatch(JSON.stringify(failed.notices),/RAW_EMAIL_PROVIDER_DETAIL/,'provider failure detail is not projected into the success/failure notice');

const running=autopilotHarness({success:true,processed:0,skipped:'already_running'},{success:true,requests:[{id:'request-1',status:'in_progress',ai_status:'generating'}]});
const runningResult=await running.run();assert.equal(runningResult.reason,'already_running');assert.match(running.notices[0].message,/not been confirmed/);

const commandError=Object.assign(new Error('Autopilot provider unavailable.'),{body:{code:'on_demand_provider_unavailable',error:'Autopilot provider unavailable.'}});
const rejected=autopilotHarness(null,{success:true,requests:[{id:'request-1',status:'in_progress',ai_status:'failed'}]},{postReject:commandError});
const rejectedResult=await rejected.run();assert.equal(rejectedResult.confirmed,true);assert.equal(rejectedResult.reason,'request_failed');assert.equal(rejected.button.disabled,false);assert.equal(rejected.button.textContent,'Run autopilot now');
assert.deepEqual(rejected.calls.map(call=>call.path),['/api/on-demand/expert/requests/request-1/autopilot-now','/api/on-demand/expert/requests'],'a failed command must still refresh the exact request row');
assert.match(rejected.notices[0].message,/Autopilot provider unavailable\. \(on_demand_provider_unavailable\)[\s\S]*Latest request state was refreshed/,'the structured backend error and refresh result must be visible');

const deliveredAfterNetworkError=autopilotHarness(null,{success:true,requests:[deliveredRow]},{postReject:commandError});
const deliveredAfterNetworkErrorResult=await deliveredAfterNetworkError.run();
assert.equal(deliveredAfterNetworkErrorResult.confirmed,true);assert.equal(deliveredAfterNetworkErrorResult.delivered,true);assert.equal(deliveredAfterNetworkErrorResult.reason,'confirmed_after_command_error');
assert.equal(deliveredAfterNetworkError.notices[0].tone,'ok');assert.match(deliveredAfterNetworkError.notices[0].message,/refreshed request confirms its answer and delivery time/,'a timed-out command cannot hide authoritative delivered state');

const incompleteCommandRow={id:'request-1',status:'delivered',ai_status:'delivered',answer:'A command answer',delivered_at:1788048000};
const incompleteProof=autopilotHarness({success:true,delivered:true,processed:1,request:incompleteCommandRow},{success:true,requests:[{id:'request-1',status:'delivered',ai_status:'delivered',answer:'',delivered_at:null}]});
const incompleteProofResult=await incompleteProof.run();assert.equal(incompleteProofResult.delivered,false);assert.equal(incompleteProofResult.reason,'delivery_not_verified');
assert.match(incompleteProof.notices[0].message,/did not provide complete delivery proof/,'a status-only delivery cannot be reported as a success');

const refreshError=Object.assign(new Error('Request refresh unavailable.'),{body:{code:'request_refresh_unavailable',message:'Request refresh unavailable.'}});
const unconfirmed=autopilotHarness({success:true,processed:1},null,{requestReject:refreshError});
const unconfirmedResult=await unconfirmed.run();assert.equal(unconfirmedResult.confirmed,false);assert.equal(unconfirmedResult.reason,'refresh_failed');
assert.match(unconfirmed.notices[0].message,/Request refresh unavailable\. \(request_refresh_unavailable\)/,'refresh failure must be surfaced and never presented as a delivery');

const renderExpertOnDemand=slice(onDemand,'  function renderExpertOnDemand(){','  window.obOdSwitchDashTab = function(tab){');
assert.match(renderExpertOnDemand,/var live = !gate && !!\(s\.expert_enabled && enabledBuckets\)/,'dashboard visibility must match the public API published predicate');
assert.doesNotMatch(renderExpertOnDemand,/var live =[^;]*s\.safety_ack/,'legacy safety acknowledgement state must not falsely label a publicly purchasable offer as hidden');
assert.doesNotMatch(onDemand,/el\.value\s*=\s*['"]Generating\.\.\.['"]/,'AI draft progress must never overwrite the expert answer textarea');
assert.match(onDemand,/expertRequestBusy:Object\.create\(null\)[\s\S]*?function obOdBeginRequestBusy\(id, operation, focusAnswer\)[\s\S]*?data-ob-od-request-action="draft"[\s\S]*?data-ob-od-request-action="deliver"[\s\S]*?data-ob-od-request-action="autopilot"/,'Draft, Deliver, and Autopilot share request-scoped busy ownership');
assert.match(onDemand,/var busy=\{requestId:requestId,operation:String\(operation\|\|''\),sequence:\+\+state\.expertRequestOperationSequence\}[\s\S]*?state\.expertRequestBusy\[requestId\]!==busy[\s\S]*?delete state\.expertRequestBusy\[requestId\]/,'each request action owns an unforgeable local busy token and can clear only itself');
for(const action of ['Accept','Draft','Deliver','Decline'])assert.match(onDemand,new RegExp(`window\\.obOd${action} = function\\(id\\)\\{[\\s\\S]*?\\.finally\\(function\\(\\)\\{obOdEndRequestBusy\\(id,busy\\)`),`${action} always settles its own request lock`);
assert.match(autopilot,/\.finally\(function\(\)\{obOdEndRequestBusy\(id,busy\)/,'Autopilot always settles its own request lock');
assert.doesNotMatch(onDemand,/state\.expertOwner!==owner/,'same-principal Refresh cannot invalidate an in-flight expert action by object identity alone');
assert.match(onDemand,/if\(operation\)\{row\.setAttribute\('data-ob-od-busy',operation\);row\.setAttribute\('aria-busy','true'\);row\.open=true;state\.expertOpenRequests\[requestId\]=true;\}[\s\S]*?editor\.readOnly=!!operation/,'a busy request is announced, kept open, and makes its answer editor read-only before a late AI draft can replace concurrent expert typing');
assert.match(onDemand,/data-ob-od-request-action="accept"[\s\S]*?data-ob-od-request-action="decline"/,'Accept and Decline share the request lock and cannot race a pending Draft, Deliver, or Autopilot operation');
assert.match(onDemand,/obOdCaptureRequestView\(requestId,focusAnswer===true\)/,'request actions capture the currently open row and focused answer');
assert.match(renderExpertOnDemand,/obOdCaptureRequestView\(\)[\s\S]*?obOdRestoreRequestView\(\)/,'On Demand rerenders restore captured open and focus state');
assert.match(renderExpertOnDemand,/Save offer settings[\s\S]*?Save form & placement[\s\S]*?Save autopilot settings/,'each settings surface owns a local save action and status');
assert.doesNotMatch(renderExpertOnDemand,/Save On Demand settings/,'the detached global save bar is removed');
assert.match(onDemand,/@media\(max-width:720px\)[\s\S]*?\.ob-od-bucket-row\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)[\s\S]*?\.ob-od-field-main\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)[\s\S]*?@media\(max-width:480px\)/,'bucket and form-builder rows reflow at tablet and phone widths');
assert.doesNotMatch(onDemand,/ob-od-bucket-row"[^>]+style="grid-template-columns/,'bucket rows do not retain a fixed inline desktop grid that defeats mobile reflow');
assert.match(renderExpertOnDemand,/role="tab" aria-selected="[\s\S]*?aria-controls="ob-od-panel-[\s\S]*?role="tabpanel" aria-labelledby="ob-od-tab-[\s\S]*? hidden/,'On Demand tabs and panels expose explicit ARIA ownership and initial hidden state');
assert.match(onDemand,/window\.obOdSwitchDashTab = function\(tab\)[\s\S]*?setAttribute\('aria-selected',active\?'true':'false'\)[\s\S]*?panel\.hidden=!active/,'On Demand tab selection keeps class, aria-selected, keyboard tab stop, and panel hidden state synchronized');
assert.match(onDemand,/window\.obOdDashTabKeydown=function\(event\)[\s\S]*?ArrowLeft[\s\S]*?ArrowRight[\s\S]*?Home[\s\S]*?End/,'On Demand tabs support standard arrow, Home, and End keyboard navigation');
assert.match(onDemand,/document\.getElementById\('ob-admin-ai-feature-authority'\) \|\| document\.getElementById\('ob-admin-ai-chat-visible-card'\)/,'On Demand is inserted after the complete AI authority section instead of inside one feature card');
assert.match(html,/var authority=document\.getElementById\('ob-admin-ai-feature-authority'\);[\s\S]*?var anchor=authority\|\|ai;[\s\S]*?anchor\.insertAdjacentElement\('afterend', od\)/,'late owner-card reconciliation keeps On Demand outside the grouped AI authority section');

console.log('AI feature separation and truthful On Demand autopilot frontend smoke: ok');
