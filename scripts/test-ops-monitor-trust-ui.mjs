import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
function scriptById(id){
  const escaped=id.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
  const match=html.match(new RegExp("<script[^>]+id=[\"']"+escaped+"[\"'][^>]*>([\\s\\S]*?)<\\/script>"));
  assert(match,id+' is installed');
  return match[1];
}
function section(source,start,end){
  const left=source.indexOf(start);assert(left>=0,'section starts at '+start);
  const right=source.indexOf(end,left+start.length);assert(right>=0,'section ends at '+end);
  return source.slice(left,right);
}
function storage(){
  const values=new Map();
  return {
    getItem:key=>values.has(String(key))?values.get(String(key)):null,
    setItem:(key,value)=>values.set(String(key),String(value)),
    removeItem:key=>values.delete(String(key)),
  };
}
function classList(){
  const values=new Set();
  return {
    add:(...names)=>names.forEach(name=>values.add(name)),
    remove:(...names)=>names.forEach(name=>values.delete(name)),
    toggle:(name,force)=>{if(force===undefined)force=!values.has(name);if(force)values.add(name);else values.delete(name);return force;},
    contains:name=>values.has(name),
  };
}
function node(id='',options={}){
  const attributes=new Map();
  let innerHTML='';
  const element={
    id,classList:classList(),outerHTML:'',textContent:'',hidden:false,scrollTop:0,scrollHeight:1000,clientHeight:500,offsetParent:{},inert:false,
    addEventListener(){},insertAdjacentHTML(_where,value){this.innerHTML+=value;},querySelector(){return null;},querySelectorAll(){return [];},
    setAttribute:(key,value)=>attributes.set(key,String(value)),getAttribute:key=>attributes.get(key)||null,
    hasAttribute:key=>attributes.has(key),removeAttribute:key=>attributes.delete(key),
    contains(){return false;},focus(){this.focused=true;},
  };
  Object.defineProperty(element,'innerHTML',{
    enumerable:true,
    get(){return innerHTML;},
    set(value){innerHTML=String(value);if(options.resetScrollOnInnerHTML)element.scrollTop=0;},
  });
  return element;
}

const opsSource=scriptById('ownlybiz-ops-monitor-trust-20260901');
const nodes={
  'ob-ops-panel':node('ob-ops-panel'),
  'ob-ops-body':node('ob-ops-body',{resetScrollOnInnerHTML:true}),
  'ob-ops-launcher':node('ob-ops-launcher'),
  'ob-ops-launcher-count':node('ob-ops-launcher-count'),
  'ob-ops-updated':node('ob-ops-updated'),
  'ob-ops-close':node('ob-ops-close'),
  'ob-admin-ops-nav':node('ob-admin-ops-nav'),
  'ob-admin-ops-badge':node('ob-admin-ops-badge'),
};
const localStorage=storage(),sessionStorage=storage(),bodyNode=node('body');
localStorage.setItem('ob_t','admin-token');
localStorage.setItem('ob_u',JSON.stringify({id:'admin-1',role:'admin'}));
const backgroundNode=node('background'),preInertNode=node('pre-inert');
preInertNode.setAttribute('inert','');preInertNode.inert=true;
bodyNode.children=[backgroundNode,nodes['ob-ops-panel'],preInertNode];
const document={
  body:bodyNode,activeElement:bodyNode,hidden:false,
  getElementById:id=>nodes[id]||null,
  addEventListener(){},contains(){return true;},
};
let contextGeneration=1,identityController=new AbortController(),registeredContextAdapter=null;
const exactCredentialChecks=[];
const OB_CLIENT_CONTEXT={
  capture(scope){return Object.freeze({scope,token:'admin-token',principal:'admin:admin-1',role:'admin',identityGeneration:contextGeneration,credentialGeneration:contextGeneration,signal:identityController.signal});},
  isCurrent(context,options){exactCredentialChecks.push(options&&options.exactCredential===true);return !!context&&!context.signal.aborted&&context.identityGeneration===contextGeneration&&context.credentialGeneration===contextGeneration&&context.token==='admin-token';},
  register(name,adapter){assert.equal(name,'ops-monitor-trust-ui');registeredContextAdapter=adapter;return ()=>{};},
};
const sandbox={
  console,window:null,document,localStorage,sessionStorage,location:{hostname:'ownlybiz-git-staging.example.test',href:'https://ownlybiz-git-staging.example.test/admin'},
  fetch:async()=>{throw new Error('unexpected fetch');},
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:callback=>callback(),
  AbortController,OB_CLIENT_CONTEXT,
  CustomEvent:class CustomEvent{constructor(type,options){this.type=type;this.detail=options&&options.detail;}},
  __OB_TEST_HOOKS__:{},
};
sandbox.window=sandbox;
sandbox.addEventListener=()=>{};
sandbox.dispatchEvent=()=>true;
vm.createContext(sandbox);
new vm.Script(opsSource,{filename:'ops-monitor-trust.js'}).runInContext(sandbox);
const hooks=sandbox.__OB_TEST_HOOKS__.opsMonitor;
assert(hooks,'Ops Monitor trust hooks are exposed');

const critical={key:'db-down',severity:'critical',title:'Database unavailable',detail:'primary timed out',at:'2026-09-01T00:00:00Z'};
localStorage.setItem('ob_ops_dismissed_alerts_v1',JSON.stringify({'db-down':Date.now()}));
assert.equal(hooks.visibleAlerts([critical]).length,1,'legacy permanent dismissals are ignored');
const acknowledgement={
  fingerprint:hooks.alertFingerprint(critical),
  severity:'critical',
  acknowledged_at:Date.now(),
  expires_at:Date.now()+15*60*1000,
};
localStorage.setItem('ob_ops_acknowledged_alerts_v2',JSON.stringify({'db-down':acknowledgement}));
assert.equal(hooks.visibleAlerts([critical]).length,0,'matching alert evidence can be acknowledged temporarily');
assert.equal(hooks.rawOpsState({status:'critical',alerts:[critical],summary:{active_alerts:1,critical_alerts:1,warning_alerts:0}}),'critical','raw critical health stays critical after acknowledgement when alert evidence and counts are coherent');
assert.equal(hooks.visibleAlerts([{...critical,detail:'replica also timed out'}]).length,1,'new evidence invalidates an acknowledgement');
localStorage.setItem('ob_ops_acknowledged_alerts_v2',JSON.stringify({'db-down':{...acknowledgement,expires_at:Date.now()-1}}));
assert.equal(hooks.visibleAlerts([critical]).length,1,'expired acknowledgements reopen alerts');
assert.equal(hooks.rawOpsState({alerts:[],summary:{critical_alerts:0,warning_alerts:0}}),'unknown','missing backend status never becomes green');
assert.equal(hooks.rawOpsState({status:'ok',alerts:[{severity:'mystery'}]}),'unknown','an inconsistent active alert cannot be painted green');
assert.equal(hooks.rawOpsState({status:'ok',summary:{critical_alerts:0,warning_alerts:0}}),'unknown','OK with an unknown total never becomes green');
assert.equal(hooks.rawOpsState({status:'ok',alerts:[],summary:{active_alerts:0,critical_alerts:0,warning_alerts:0}}),'ok','OK requires a valid empty alert array and exact coherent zero counts');
assert.equal(hooks.rawOpsState({status:'ok',alerts:null,summary:{active_alerts:0,critical_alerts:0,warning_alerts:0}}),'unknown','a null alerts contract is UNKNOWN even when the summary claims zero');
assert.equal(hooks.rawOpsState({status:'ok',alerts:{length:0},summary:{active_alerts:0,critical_alerts:0,warning_alerts:0}}),'unknown','an array-like injected alerts object is UNKNOWN');
assert.equal(hooks.rawOpsState({status:'ok',alerts:[],summary:{active_alerts:1,critical_alerts:0,warning_alerts:0}}),'unknown','a summary total that disagrees with alert evidence is UNKNOWN');
assert.equal(hooks.rawOpsState({status:'ok',alerts:[],summary:{active_alerts:'0',critical_alerts:0,warning_alerts:0}}),'unknown','numeric-looking strings are not accepted as authoritative alert counts');
assert.equal(hooks.rawOpsState({status:'critical',alerts:[critical],summary:{active_alerts:1,critical_alerts:0,warning_alerts:1}}),'unknown','even a critical backend label fails closed when severity counts contradict the alert array');

const verifiedIdentity={
  environment:'production',
  provider_environment_name:'production',
  node_environment:'production',
  runtime_classification:'staging',
  classification_basis:'is_staging_flag',
  environment_id:'9d2e708e-24af-4fea-a5a3-796d4cd9956f',
  service_id:'69c78756-c810-4e87-b482-3fee37eb6657',
  service_name:'ownlybiz-backend',deployment_id:'deploy-1',replica_id:'replica-1',git_commit_sha:null,process_started_at:new Date(Date.now()-900000).toISOString(),uptime_sec:900,node_version:'v24.1.0',
};
assert.equal(hooks.opsIdentityVerification({runtime_identity:verifiedIdentity}).verified,true,'the exact API base plus Railway service and environment IDs verify staging even when its display name is production');
assert.equal(hooks.opsIdentityVerification({runtime_identity:{...verifiedIdentity,service_id:'wrong-service'}}).environment,'unknown','an identity mismatch is never labeled production or staging');
hooks.render({status:'ok',alerts:[],summary:{active_alerts:0,critical_alerts:0,warning_alerts:0},runtime_identity:{...verifiedIdentity,service_id:'wrong-service'}},{state:'available',data:{}});
assert(nodes['ob-ops-launcher'].classList.contains('unknown'),'a healthy-looking response from the wrong runtime identity is presented as UNKNOWN');
assert.match(nodes['ob-ops-updated'].textContent,/target: UNKNOWN \/ UNVERIFIED/);
assert(nodes['ob-admin-ops-nav'].classList.contains('ob-ops-nav-unknown'),'an UNKNOWN sidebar badge uses its non-green state');

assert.equal(hooks.fmt(undefined),'Unknown');
assert.equal(hooks.fmt(null),'Unknown');
assert.equal(hooks.fmt(0),'0','a real zero is preserved');
assert.match(hooks.renderAssets(undefined),/unavailable/i);
assert.match(hooks.renderAssets({available:true,missing_count:0,checked:0,scanned_experts:2,total_experts:5,coverage_pct:40,coverage_complete:false,expert_coverage_complete:false,field_coverage:{complete:true}}),/0 broken upload references found in this partial scan[\s\S]*cannot claim the asset set is clear/i,'zero findings from an incomplete scan are not a clear state');
assert.match(hooks.renderAssets({available:true,missing_count:0,checked:0,scanned_experts:5,total_experts:5,coverage_pct:100,coverage_complete:true,expert_coverage_complete:true,field_coverage:{complete:true}}),/No broken upload references detected in the completed scan/,'zero findings are clear only with explicit complete expert and field coverage');
assert.match(hooks.renderAssets({missing_count:2}),/example details are unavailable/i);
const redactedAssetHtml=hooks.renderAssets({available:true,missing_count:1,checked:1,scanned_experts:1,total_experts:1,coverage_pct:100,coverage_complete:true,expert_coverage_complete:true,field_coverage:{complete:true,schema:'known_website_image_fields_v2',fields_examined:12,nested_item_limit_per_expert:200},examples:[{field:'website.hero_image',reference_type:'website_media',name:'private.jpg',owner_id:'private-user',url:'https://private.example'}]});
assert.match(redactedAssetHtml,/<th>Field<\/th><th>Reference type<\/th>[\s\S]*website\.hero_image[\s\S]*website_media/,'asset examples render the backend redacted field/reference contract');
assert.doesNotMatch(redactedAssetHtml,/private\.jpg|private-user|private\.example|Owner|URL/,'the asset table cannot imply unavailable private identity columns');
assert.match(hooks.renderRoutes(undefined),/unavailable/i);
assert.match(hooks.renderRoutes([]),/No route samples/);
assert.match(hooks.renderProblems(undefined),/unavailable/i);

const emptyTrends=hooks.normalizeTrends({state:'available',data:{}});
assert.deepEqual(Array.from(emptyTrends.hourly),[],'missing history does not synthesize an hourly sample');
assert.deepEqual(Array.from(emptyTrends.daily),[],'missing history does not synthesize a daily sample');
assert.match(hooks.lineChart('Revenue',[],'revenue','#fff','history'),/No historical samples available/);
assert.doesNotMatch(hooks.lineChart('Revenue',[],'revenue','#fff','history'),/<svg/);
const scalarChart=hooks.lineChart('Revenue',[{revenue:5}],'revenue','#fff','live');
assert.match(scalarChart,/1 current sample; no trend[\s\S]*current sample — no history/,'one live sample is presented as a scalar, not invented history');
assert.doesNotMatch(scalarChart,/<svg/,'one sample never draws a fake trend line');
const populatedChart=hooks.lineChart('Revenue',[{revenue:0},{revenue:5}],'revenue','#fff','last 24h');
assert.match(populatedChart,/role="img"/,'a populated trend exposes a non-visual chart role');
assert.match(populatedChart,/aria-label="Revenue\. last 24h\. 2 sample\(s\)\. Latest 5/,'trend accessibility text identifies the metric, window, sample count, and latest value');

const authorities=hooks.renderOperationalAuthorities({
  background_tasks:{available:true,status:'ready',health:'critical',health_code:'dead_jobs',driver:'redis',required:true,queue_depth:0,processing_depth:1,dead_depth:149,workers:2,ready_workers:1,dropped:0,last_error_code:null},
  live_capacity:{available:true,status:'ok',mode:'enforce',effective_mode:'enforce',scope:'fleet',effective_scope:'fleet',revision:7,admission_enforced:true,admission_paused:false,stripe_order_guaranteed:true,updated_at:1788220800,updated_by:'admin:test',reason:'staging verification',reason_present:true},
  payment_runtime:{available:true,status:'ok',active_stripe_mode:'live',active_configuration_ready:true,platform_webhook_configuration_ready:true,connect_webhook_configuration_ready:true,webhook_configuration_ready:true,configured_mode:'live',last_error_code:null},
  runtime_identity:verifiedIdentity,
});
assert.match(authorities,/149/,'dead background jobs remain visible');
assert.match(authorities,/Background tasks[\s\S]*?CRITICAL[\s\S]*?Transport ready · health critical/,'queue transport readiness cannot overwrite critical queue health');
assert.match(authorities,/Update provenance[\s\S]*reason recorded \(redacted\)/,'capacity-change provenance keeps presence and time without private actor or reason text');
assert.match(authorities,/2026-09-01/,'epoch-second capacity timestamps render human-readably instead of as raw integers');
assert.doesNotMatch(authorities,/admin:test|staging verification/,'private live-capacity actor and reason text are not rendered');
assert.match(authorities,/GUARANTEED/,'Stripe-order guarantee is rendered');
assert.match(authorities,/Stripe runtime[\s\S]*?LIVE/,'active Stripe mode is rendered');
assert.match(authorities,/Active configuration ready[\s\S]*?yes[\s\S]*?Configured mode[\s\S]*?LIVE/,'the exact active Stripe configuration readiness and coherent configured mode are visible');
assert.match(authorities,/platform \/ Connect signing[\s\S]*READY \/ READY/,'platform and Connect signing authorities render separately');
assert.match(authorities,/Runtime classification[\s\S]*?staging/,'the backend-normalized runtime classification is rendered');
assert.match(authorities,/Raw provider environment[\s\S]*?production/,'the raw Railway display environment is rendered separately without being trusted as the staging verifier');
assert.match(hooks.renderOperationalAuthorities({}),/Unknown/,'absent authority fields render Unknown');
assert.match(hooks.renderOperationalAuthorities({runtime_identity:{environment:'production',provider_environment_name:'production'}}),/Runtime classification[\s\S]*?Unknown[\s\S]*?Raw provider environment[\s\S]*?production/,'a provider display name never synthesizes a normalized runtime classification');
const classifiedAuthorities=hooks.renderOperationalAuthorities({runtime_identity:verifiedIdentity});
assert.match(classifiedAuthorities,/Runtime classification[\s\S]*?staging[\s\S]*?Raw provider environment[\s\S]*?production/,'normalized runtime classification is distinct from the misleading raw provider environment name');

const provenanceHtml=hooks.renderProvenance({
  http:{available:true,provenance:{status:'collected',source:'backend_http_metrics',scope:'backend_replica',collected_at:'2026-09-01T08:00:00.000Z',window:'trailing_15m_rates_and_latency_plus_process_lifetime_totals',sample_count:18,coverage:{scope:'current_backend_process',rate_window_sec:900,observed_window_sec:61,window_coverage_complete:false,latency_sample_count:18,latency_sample_limit:400,latency_samples_truncated:false,route_detail_limit:80,route_details_truncated:true,problem_samples_truncated:false},stale:false,cached:false,age_basis:'collected_at',cache_semantics:'uncached_process_snapshot',freshness_semantics:'collected_on_overview_request'}},
  assets:{available:true,checked:4,coverage_pct:50,coverage_complete:false,provenance:{status:'collected',source:'expert_asset_reference_scan',scope:'platform',collected_at:'2026-09-01T08:00:00.000Z',window:'bounded_current_reference_scan',sample_count:4,coverage:{pct:50,complete:false,truncated:true},cache_semantics:'single_flight_uncached_database_and_storage_reads'}},
});
assert.match(provenanceHtml,/HTTP[\s\S]*PARTIAL[\s\S]*backend_http_metrics[\s\S]*backend_replica[\s\S]*18[\s\S]*observed 61s \/ 900s[\s\S]*WARMING \/ PARTIAL window[\s\S]*routes PARTIAL/,'per-section HTTP source, bounded observation coverage, and truncated evidence render without overclaiming completeness');
assert.match(provenanceHtml,/not stale when collected \/ uncached[\s\S]*collected_on_overview_request/,'per-section stale, cache, and freshness semantics remain explicit');
assert.match(provenanceHtml,/Asset reference scan[\s\S]*PARTIAL[\s\S]*50%[\s\S]*single_flight_uncached_database_and_storage_reads/,'partial scan provenance is explicit');
assert.doesNotMatch(provenanceHtml,/\[object Object\]/,'structured coverage provenance is rendered intentionally');
assert.match(provenanceHtml,/System[\s\S]*UNAVAILABLE[\s\S]*Unknown/,'missing provenance and section evidence remain unavailable/Unknown');

localStorage.setItem('ob_ops_acknowledged_alerts_v2',JSON.stringify({'db-down':acknowledgement}));
hooks.render({
  generated_at:null,status:'critical',alerts:[critical],
  summary:{active_alerts:1,critical_alerts:1,warning_alerts:0,active_sessions:0,api_p95_ms:0},
  database:{available:false,primary:{ok:false}},
  http:{available:false,hottest_routes:[],recent_problem_requests:[]},
  business:{available:false,sessions:{active_sessions:0},users:{clients_total:0}},
  realtime:{available:false,status:'critical'},
  assets:{available:false,missing_count:0},
  background_tasks:{available:false,status:'unavailable'},
  live_capacity:{available:false,status:'unavailable'},
  runtime_identity:verifiedIdentity,
},{state:'unavailable',data:null,error:'history offline'});
assert(nodes['ob-ops-launcher'].classList.contains('unknown'),'a malformed critical-looking payload is UNKNOWN rather than inheriting raw severity as trusted health');
assert.match(nodes['ob-ops-updated'].textContent,/raw backend status: CRITICAL/);
assert.match(nodes['ob-ops-body'].innerHTML,/System status[\s\S]*?UNKNOWN/);
assert.match(nodes['ob-ops-body'].innerHTML,/Database<\/td><td><span class="ob-pill unknown">UNKNOWN/,'database available=false is not rendered as a critical probe');
assert.match(nodes['ob-ops-body'].innerHTML,/Recent problem-request data is unavailable/,'HTTP available=false is not rendered as a clear list');
assert.match(nodes['ob-ops-body'].innerHTML,/Broken assets[\s\S]*?Unknown[\s\S]*?Asset scan unavailable/,'asset-scan summary is gated on section availability');
assert.match(nodes['ob-ops-body'].innerHTML,/Heap used[\s\S]*?Unknown[\s\S]*?System metrics unavailable/,'memory is Unknown when system telemetry is unavailable');
assert.match(nodes['ob-ops-body'].innerHTML,/Event loop p95[\s\S]*?Unknown[\s\S]*?System metrics unavailable/,'event-loop latency is Unknown when system telemetry is unavailable');
assert.match(nodes['ob-ops-body'].innerHTML,/Asset storage[\s\S]*?UNKNOWN[\s\S]*?Asset storage telemetry unavailable/,'asset storage is Unknown when storage telemetry is unavailable');
assert.match(nodes['ob-ops-body'].innerHTML,/All 1 active alert\(s\) are acknowledged[\s\S]*?Raw system severity remains authoritative/);

const realtimeRuntime={
  readiness_entries:0,quality_entries:0,disconnect_timers:0,background_disconnect_timers:0,media_start_timers:0,chat_start_readiness_timers:0,ai_start_claim_retry_timers:0,reconciliation_pending_departures:0,
  reconciliation_interval_ms:5000,reconciliation_warmup_ms:1000,participant_disconnect_grace_ms:30000,media_reconnect_grace_ms:30000,background_disconnect_grace_ms:30000,client_background_disconnect_grace_ms:30000,
};
const realtimePresenceAt=new Date().toISOString();
const realtimeAlertWindowEndedMs=Date.now(),realtimeAlertWindowStartedMs=(Math.floor(realtimeAlertWindowEndedMs/1000)-899)*1000;
const realtimeAlertWindow={window_sec:900,observed_window_sec:900,window_coverage_complete:true,window_started_at:new Date(realtimeAlertWindowStartedMs).toISOString(),observed_started_at:new Date(realtimeAlertWindowStartedMs).toISOString(),window_ended_at:new Date(realtimeAlertWindowEndedMs).toISOString(),handler_error_count:0,participant_disconnect_timeout_count:0,rtc_quality_poor_count:0,rtc_quality_weak_count:0};
const backendRealtime={
  available:true,status:'ok',hosted:true,scope:'presence_cluster',presence_required:true,connected_users:0,
  websocket:{driver:'memory',connected_users:0,active_rooms:0,total_sockets:0,runtime:realtimeRuntime,
    cluster:{instances:1,cluster_connected_users:0,cluster_active_rooms:0,cluster_total_sockets:0,local_connected_users:0,local_active_rooms:0,local_total_sockets:0,readiness_generation:1,connection_generation:1,published_generation:1,aggregated_generation:1,enabled:true,status:'ready',client_ready:true,fresh_presence_cycle:true,exact_room_membership_complete:true,last_published_at:realtimePresenceAt,last_aggregated_at:realtimePresenceAt,published_age_ms:0,presence_age_ms:0,presence_max_age_ms:90000,generations_coherent:true,last_error_present:false,last_error_code:null},
    metrics:{handler_error_total:0,rtc_relay_total:0,session_resume_total:0,rtc_quality_total:0,rtc_quality_good_total:0,participant_disconnect_timeout_total:0,media_reconnect_grace_total:0,participant_rejoined_total:0,rtc_quality_poor_total:0,rtc_quality_weak_total:0},alert_window:realtimeAlertWindow},
};
const healthyBackground={available:true,status:'ready',health:'ok',health_code:null,driver:'redis',required:true,depths_available:true,producer_ready:true,inspector_ready:true,queue_depth:0,processing_depth:0,dead_depth:0,queued:0,active:0,dropped:0,concurrency:2,max_queue:100,job_timeout_ms:10000,processed:0,failed:0,requeued:0,redis_queue_depth:0,redis_processing_depth:0,redis_dead_depth:0,workers:1,ready_workers:1,last_error:null,last_error_present:false,last_error_code:null};
const healthyBusiness={available:true,status:'ok',sessions:{pending_sessions:0,active_sessions:0,settling_sessions:0,stuck_settling_sessions:0,oldest_settling_started_at:null,active_chat_sessions:0,active_voice_sessions:0,active_video_sessions:0,active_media_waiting_to_start:0,oldest_waiting_media_created_at:null,sessions_15m:0,ended_24h:0,payment_failures_24h:0,stale_active_sessions:0,oldest_waiting_media_age_sec:0,oldest_settling_age_sec:0,settlement_stuck_after_sec:120},channels:{chat:{pending:0,active:0,waiting_to_start:0,ended_24h:0,paid_24h:0,revenue_24h:0},voice:{pending:0,active:0,waiting_to_start:0,ended_24h:0,paid_24h:0,revenue_24h:0},video:{pending:0,active:0,waiting_to_start:0,ended_24h:0,paid_24h:0,revenue_24h:0}},bookings:{pending_bookings:0,confirmed_bookings:0,bookings_24h:0,booking_failures_24h:0},payments:{ended_sessions_24h:0,paid_sessions_24h:0,partially_paid_sessions_24h:0,charge_failed_sessions_24h:0,zero_charge_sessions_24h:0,gross_charged_24h:0,card_charged_24h:0,refunded_card_24h:0,net_card_charged_24h:0,credit_applied_24h:0,promo_discount_24h:0,billing_outstanding_24h:0},users:{experts_total:0,experts_active:0,clients_total:0}};
const httpWindowEndedMs=Date.now(),httpWindowStartedMs=(Math.floor(httpWindowEndedMs/1000)-899)*1000;
const healthyHttp={available:true,status:'ok',uptime_sec:900,measurement_available:false,active_requests:1,total_requests:0,total_errors:0,total_client_errors:0,total_rate_limited:0,rate_window_sec:900,observed_window_sec:900,window_coverage_complete:true,rate_window_started_at:new Date(httpWindowStartedMs).toISOString(),observed_started_at:new Date(httpWindowStartedMs).toISOString(),rate_window_ended_at:new Date(httpWindowEndedMs).toISOString(),rate_window_request_count:0,rate_window_error_count:0,rate_window_client_error_count:0,rate_window_rate_limited_count:0,rate_window_status_counts:{'2xx':0,'3xx':0,'4xx':0,'5xx':0,other:0},error_rate_pct:null,client_error_rate_pct:null,rate_limited_rate_pct:null,avg_ms:null,p95_ms:null,max_ms:null,latency_sample_count:0,latency_sample_limit:400,latency_samples_truncated:false,latency_sampling:'latest_requests_within_rate_window',last_request_at:null,status_counts:{'2xx':0,'3xx':0,'4xx':0,'5xx':0,other:0},recent_problem_window_sec:900,problem_window_count:0,problem_sample_limit:80,returned_problem_limit:25,returned_problem_count:0,problem_samples_truncated:false,recent_problem_requests:[],hottest_routes_window_sec:900,route_detail_limit:80,returned_route_limit:25,tracked_route_count:0,returned_route_count:0,route_details_truncated:false,hottest_routes:[]};
const healthySystem={available:true,status:'ok',node_version:'v24.1.0',pid:1234,uptime_sec:900,env:'production',memory:{rss_mb:128,heap_used_mb:32,heap_total_mb:512,heap_limit_mb:512,heap_allocated_mb:64,heap_used_pct:6.25,heap_limit_used_pct:6.25,heap_allocated_used_pct:50,heap_metric_basis:'v8.used_heap_size / v8.heap_size_limit',external_mb:4},cpu:{cores:4,load_1m:0,load_5m:0,load_15m:0},event_loop:{mean_ms:1,p95_ms:2,max_ms:3}};
const healthyMediaSfu={available:true,status:'disabled',last_error_code:null,configuration_valid:true,configuration_invalid_keys:[],one_to_one_mode:'peer',one_to_one_fallback_enabled:true,group_sfu_enabled:false,url_configured:false,url:null,assumptions:{video_mbps_per_consumer:1,audio_mbps_per_consumer:0.08,egress_usd_per_gb:0.05},error:null,health_identity:null,health_status:null,worker_count:null,candidate_policy:null,deployment_mode:null,udp_ready:null,public_candidate_configured:null,public_candidate_port_valid:null,counters:null,timings:null,latest_client_timing:null,readiness:null,measurement_available:false,estimate_available:false,rooms:null,peers:null,transports:null,producers:null,consumers:null,audio_producers:null,video_producers:null,audio_consumers:null,video_consumers:null,session_rooms:null,group_rooms:null,estimated:{outbound_mbps:null,egress_gb_per_hour:null,egress_usd_per_hour:null}};
const healthySecurity={available:true,status:'ok',last_error_code:null,level:'heavy',turnstile_enabled:true,turnstile_configured:true,turnstile_actions:['expert_signup','client_signup','login','password_reset','email_verification','session_request','book_later'],require_turnstile_when_unconfigured:true,email_verification_mode:'progressive',email_delivery_configured:true,email_provider:'resend',cloudflare_configured:true,readiness:{rate_limits:'active',signup_abuse:'covered',client_abuse:'covered',verification_resend:'covered',booking_abuse:'turnstile_when_configured',live_session_abuse:'turnstile_when_configured',login_abuse:'turnstile_when_configured'}};
const replyNow=Math.floor(Date.now()/1000);
const healthyReplyAssistant={available:true,status:'ok',reason_codes:[],authority:{available:true,ready:true,secret_configuration_ready:true,provider_route_ready:true,provider_generation:1,provider_snapshot_ready:true},started:true,running:false,processed:0,retried:0,compensated:0,cancelled:0,failed:0,guarded:0,reconciled:0,by_state:{queued:0,retry:0,claimed:0,completed:0,superseded:0,cancelled:0,compensated:0,dead:0},pending_jobs:0,dead_jobs:0,oldest_due_at:null,oldest_due_age_sec:0,oldest_claimed_at:null,oldest_claimed_age_sec:0,last_run_at:replyNow,last_run_age_sec:0,started_at:replyNow-60,worker_age_sec:60,current_run_started_at:null,current_run_age_sec:null,last_error_code:null};
const healthyThresholds={http_p95_warning_ms:900,http_p95_critical_ms:2500,settlement_stuck_warning_sec:120,error_rate_warning_pct:2,error_rate_critical_pct:8,rate_limit_warning_pct:0.5,rate_limit_critical_pct:2,rate_limit_recent_critical_count:5,heap_limit_warning_pct:75,heap_limit_critical_pct:85,rss_warning_mb:0,rss_critical_mb:0,event_loop_p95_warning_ms:250,event_loop_p95_critical_ms:600,pending_sessions_warning_count:25,media_wait_warning_sec:120,rtc_weak_quality_warning_count:5,broken_asset_scan_limit:500,broken_asset_warning_count:1,broken_asset_critical_count:10,reply_assistant_backlog_warning_sec:15,reply_assistant_backlog_critical_sec:45,reply_assistant_claim_warning_sec:105,reply_assistant_claim_critical_sec:210,reply_assistant_worker_stale_sec:15,configuration_valid:true,invalid_keys:[]};
const healthySummary={snapshot_source:'backend_private_observability',primary_window:'live_trailing_15m_and_trailing_24h',runtime_environment:'production',runtime_classification:'staging',runtime_deployment_id:'deploy-1',active_alerts:0,critical_alerts:0,warning_alerts:0,api_window_sec:900,api_observed_window_sec:900,api_window_coverage_complete:true,api_window_request_count:0,api_p95_ms:null,api_error_rate_pct:null,api_429_count:0,active_sessions:0,settling_sessions:0,stuck_settling_sessions:0,pending_sessions:0,payment_operations_status:'ok',payment_operations_coverage_complete:true,payment_authorization_manual_review_jobs:0,payment_outstanding_sessions:0,payment_outstanding_amount:0,pending_refund_requests:0,failed_refund_requests:0,connected_users:0,broken_assets:0,asset_scan_coverage_pct:100,asset_scan_coverage_complete:true,asset_storage_status:'ok',asset_storage_durable:true,media_sfu_status:'disabled',one_to_one_media_mode:'peer',media_sfu_rooms:null,media_sfu_peers:null,media_sfu_estimated_usd_per_hour:null,security_level:'heavy',email_delivery_configured:true,turnstile_configured:true,reply_assistant_status:'ok',reply_assistant_pending_jobs:0,reply_assistant_dead_jobs:0,background_task_status:'ready',background_task_health:'ok',background_task_health_code:null,background_task_driver:'redis',background_task_required:true,background_task_queue_depth:0,background_task_processing_depth:0,background_task_dead_jobs:0,background_task_dropped:0,live_capacity_status:'ok',live_capacity_mode:'enforce',live_capacity_effective_mode:'enforce',live_capacity_revision:1,live_capacity_admission_enforced:true,live_capacity_admission_paused:false,live_capacity_stripe_order_guaranteed:true,stripe_mode:'test',stripe_webhook_configuration_ready:true};
healthySummary.stripe_platform_webhook_configuration_ready=true;
healthySummary.stripe_connect_webhook_configuration_ready=true;
const overviewProvenanceSpecs={
  http:['backend_http_metrics','current_process','backend_replica','trailing_15m_rates_and_latency_plus_process_lifetime_totals','uncached_process_snapshot','collected_on_overview_request'],system:['node_runtime_metrics','current_process','backend_replica','instantaneous_and_process_lifetime','uncached_process_snapshot','collected_on_overview_request'],runtime_identity:['backend_runtime_identity','current_process_and_provider_metadata','backend_replica','process_lifetime','uncached_process_snapshot','collected_on_overview_request'],business:['business_database_aggregates','runtime_authoritative_database','platform','live_trailing_15m_and_trailing_24h','uncached_database_read','database_state_at_collection'],payment_operations:['payment_operations_database_aggregates_and_verified_webhook_receipt_ledger','runtime_authoritative_database','platform','current_backlogs_trailing_24h_and_durable_verified_webhook_receipt_state','uncached_repeatable_read_database_snapshot_and_uncached_ledger_read','database_and_verified_webhook_ledger_state_at_collection'],database:['database_read_probes','configured_database_connections','backend_replica','point_in_time','uncached_probe','probe_result_at_collection'],cache:['process_cache_stats','current_process','backend_replica','current_entries','cache_self_report','collected_on_overview_request'],database_storage:['database_runtime_configuration','backend_database_runtime','backend_replica','current_configuration','in_process_configuration','runtime_state_at_collection'],asset_storage:['asset_storage_probe','configured_upload_storage','backend_replica','point_in_time','uncached_filesystem_probe','probe_result_at_collection'],assets:['expert_asset_reference_scan','runtime_authoritative_database_and_storage','platform','bounded_current_reference_scan','single_flight_uncached_database_and_storage_reads','references_and_storage_state_at_collection'],realtime:['websocket_and_presence_stats','realtime_runtime_and_presence_cluster','backend_replica_and_cluster','current_presence_cycle_trailing_15m_alerts_and_process_lifetime_counters','uncached_runtime_snapshot','requires_fresh_completed_presence_cycle_when_hosted'],media_sfu:['strict_sfu_settings_and_media_health','platform_settings_and_media_service','media_service','current_configuration_and_process_lifetime_counters','strict_settings_read_and_uncached_health_probe','health_probe_at_collection'],security:['security_policy_readiness','platform_security_configuration','platform','current_configuration','configuration_reader_semantics','configuration_state_at_collection'],reply_assistant:['reply_assistant_worker_stats','reply_assistant_job_authority','platform','current_worker_and_job_state','uncached_worker_and_database_read','worker_state_at_collection'],background_tasks:['background_task_queue_stats','configured_task_queue','platform','current_depths_and_process_lifetime_counters','uncached_queue_snapshot','queue_state_at_collection'],live_capacity:['private_live_capacity_control','private_rollout_control','platform','current_control_revision','uncached_authoritative_database_read','control_state_at_collection'],payment_runtime:['stripe_runtime_configuration','authoritative_stripe_config','backend_runtime','current_configuration','configuration_reader_semantics','configuration_state_at_collection'],
};
function withOverviewProvenance(overview){
  for(const key of ['http','system','runtime_identity','business','payment_operations','database','cache','assets','realtime','media_sfu','security','reply_assistant','background_tasks','live_capacity','payment_runtime'])overview[key]={...overview[key]};
  overview.storage={...overview.storage,database:{...overview.storage.database},assets:{...overview.storage.assets}};
  const sections={http:overview.http,system:overview.system,runtime_identity:overview.runtime_identity,business:overview.business,payment_operations:overview.payment_operations,database:overview.database,cache:overview.cache,database_storage:overview.storage.database,asset_storage:overview.storage.assets,assets:overview.assets,realtime:overview.realtime,media_sfu:overview.media_sfu,security:overview.security,reply_assistant:overview.reply_assistant,background_tasks:overview.background_tasks,live_capacity:overview.live_capacity,payment_runtime:overview.payment_runtime};
  const collectedAt=overview.generated_at;
  const map={};
  for(const [key,spec] of Object.entries(overviewProvenanceSpecs)){
    const section=sections[key],available=key==='runtime_identity'||section.available===true;
    let sample=null,coverage=null;
    if(key==='runtime_identity'){sample=1;coverage='current_replica';}
    else if(key==='http'){sample=available?section.rate_window_request_count:null;coverage={scope:'current_backend_process',rate_window_sec:section.rate_window_sec??null,observed_window_sec:section.observed_window_sec??null,window_coverage_complete:section.window_coverage_complete??null,latency_sample_count:section.latency_sample_count??null,latency_sample_limit:section.latency_sample_limit??null,latency_samples_truncated:section.latency_samples_truncated??null,route_detail_limit:section.route_detail_limit??null,route_details_truncated:section.route_details_truncated??null,problem_samples_truncated:section.problem_samples_truncated??null};}
    else if(key==='business'){sample=available?section.users.experts_total:null;coverage=available?'authoritative_platform_database':null;}
    else if(key==='payment_operations'){sample=available?section.authorizations.total:null;coverage=available?{complete:section.coverage.complete,database_complete:section.coverage.database_complete,webhook_ledger_complete:section.coverage.webhook_ledger_complete,end_to_end_delivery_complete:section.coverage.end_to_end_delivery_complete,incomplete_sources:section.coverage.incomplete_sources.slice()}:null;}
    else if(key==='assets'){sample=available?section.scanned_experts:null;coverage=available&&section.coverage_pct!==null?{pct:section.coverage_pct,complete:section.coverage_complete,truncated:section.coverage_truncated}:null;}
    else if(key==='realtime'){sample=available&&section.connected_users!==null?section.connected_users:null;coverage=available?section.scope:null;}
    else if(key==='media_sfu'){sample=available&&section.measurement_available?section.counters.client_timing_reports_total:null;coverage=available&&section.measurement_available?'media_service_snapshot':null;}
    else if(key==='background_tasks'){sample=available?section.queue_depth:null;coverage=available&&section.depths_available?'authoritative_queue_depths':null;}
    const provenance={status:available?'collected':'unavailable',source:spec[0],authority:spec[1],scope:spec[2],window:spec[3],cache_semantics:spec[4],freshness_semantics:spec[5],collected_at:collectedAt,sample_count:sample,coverage,stale:available?false:null,age_basis:'collected_at',duration_ms:0};
    map[key]=provenance;section.provenance={...provenance};
  }
  overview.provenance=map;
  return overview;
}
const healthyOverviewGeneratedAt=new Date().toISOString();
const paymentDatabaseNow=Math.floor(Date.parse(healthyOverviewGeneratedAt)/1000);
const paymentAuthorizationStatuses=['creating','created','ready','consumed','canceling','captured','released','canceled','expired','failed'];
const paymentRecoveryStates=['queued','scanning','reconciling','awaiting_terminal','manual_review','complete'];
const paymentSettlementPhases=['unclaimed','claimed','authorization','stripe_capture','stripe_charge','stripe_transfer','stripe_release','credit_debit','promotion','finalizing'];
const paymentErrorBuckets=['session_payment_incomplete','session_payment_failed','session_authorization_empty','session_authorization_not_capturable','session_card_charge_below_minimum','session_charge_failed','reply_assistant_billing_correction_required','amount_too_small','authentication_required','card_declined','insufficient_funds','expired_card','incorrect_cvc','processing_error','api_connection_error','rate_limit','other'];
const healthyPaymentOperations={
  available:true,status:'ok',last_error_code:null,reason_codes:[],
  window:{timezone:'UTC',database_snapshot_at:paymentDatabaseNow,recent_window_sec:86400,recent_window_started_at:paymentDatabaseNow-86400,settlement_stuck_after_sec:120,recovery_backlog_warning_after_sec:300,refund_pending_warning_after_sec:86400,recent_settlement_error_basis:'settlement_ended_at',recent_authorization_failure_basis:'authorization_updated_at',recent_refund_failure_basis:'refund_request_updated_at',webhook_ledger_basis:'durable_verified_events_received_by_this_endpoint'},
  coverage:{complete:true,scope:'authoritative_database_and_verified_webhook_receipt_processing',database_complete:true,webhook_ledger_complete:true,end_to_end_delivery_complete:false,visibility_gaps:['stripe_delivery_attempts_not_received_by_endpoint','webhook_signature_verification_failures'],sources:{authorizations:'complete',authorization_recovery:'complete',settlements:'complete',refund_requests:'complete',stripe_webhook_verified_receipt_processing:'complete',stripe_webhook_delivery_attempts:'not_covered',stripe_webhook_signature_failures:'not_covered'},incomplete_sources:[]},
  authorizations:{total:0,by_status:Object.fromEntries(paymentAuthorizationStatuses.map(key=>[key,0])),open_count:0,open_expired_count:0,open_amount_cents:0,recent_failed_24h:0,oldest_open_updated_at:null,oldest_open_age_sec:0},
  authorization_recovery:{total:0,by_state:Object.fromEntries(paymentRecoveryStates.map(key=>[key,0])),pending_count:0,due_count:0,stale_claim_count:0,active_error_count:0,oldest_pending_updated_at:null,oldest_pending_age_sec:0},
  settlements:{active_count:0,by_phase:Object.fromEntries(paymentSettlementPhases.map(key=>[key,0])),stuck_count:0,expired_owner_count:0,current_error_count:0,recent_ended_error_count_24h:0,errors_by_code:Object.fromEntries(paymentErrorBuckets.map(key=>[key,{current:0,recent_ended_24h:0}])),oldest_settling_reference_at:null,oldest_settling_age_sec:0,oldest_mutation_reference_at:null,oldest_mutation_age_sec:0,outstanding_session_count:0,outstanding_amount:0,oldest_outstanding_reference_at:null,oldest_outstanding_age_sec:0},
  refund_requests:{total:0,by_status:{pending:0,approved:0,declined:0,failed:0},stale_pending_count:0,recent_failed_24h:0,pending_amount_requested:0,failed_unresolved_amount:0,oldest_pending_created_at:null,oldest_pending_age_sec:0,oldest_failed_updated_at:null,oldest_failed_age_sec:0},
  webhook:{supported:true,available:true,status:'ok',reason_codes:[],ledger_complete:true,coverage_scope:'verified_events_received_by_this_endpoint',end_to_end_delivery_complete:false,stripe_delivery_attempt_visibility:'not_covered',signature_failure_visibility:'not_covered',total_events:0,processed_events:0,failed_events:0,processing_events:0,stale_processing_events:0,unresolved_events:0,oldest_unresolved_at:null,oldest_unresolved_age_sec:null,last_received_at:null,last_processed_at:null,last_failed_at:null,last_error_code:null,recent_financial_events_24h:{payment_intent_failed:0,refund_failed:0,payout_failed:0,dispute_created:0,invoice_payment_failed:0}},
};
const healthyOverview=withOverviewProvenance({
  generated_at:healthyOverviewGeneratedAt,status:'ok',alerts:[],runtime_identity:verifiedIdentity,
  alert_events:[],alert_event_history:{scope:'backend_replica',storage:'process_memory',retention_limit:120,returned_limit:30,retained_event_count:0,returned_event_count:0,dropped_event_count:0,retention_complete_for_observed_samples:true,sampling_trigger:'overview_request',sampling_continuous:false,sampling_gap_possible:true,sample_count:1,first_sampled_at:healthyOverviewGeneratedAt,last_sampled_at:healthyOverviewGeneratedAt,process_started_at:verifiedIdentity.process_started_at,deployment_id:verifiedIdentity.deployment_id,replica_id:verifiedIdentity.replica_id},provenance:{},thresholds:healthyThresholds,
  summary:healthySummary,
  database:{available:true,status:'ok',last_error_code:null,primary:{label:'postgres_primary',ok:true,status:'ok',duration_ms:1,value:true,error:null,last_error_code:null},sqlite:{label:'sqlite_fallback',ok:true,status:'ok',duration_ms:1,value:true,error:null,last_error_code:null},postgres_shadow:{enabled:true,status:'ready',ready:true,last_error_present:false,last_error_code:null,last_bootstrap_at:null,last_sync_at:null,tracked_table_count:0}},http:healthyHttp,cache:{available:true,status:'ok',last_error_code:null,size:0,revision:0},
  business:healthyBusiness,payment_operations:healthyPaymentOperations,realtime:backendRealtime,
  system:healthySystem,
  assets:{available:true,status:'ok',last_error_code:null,missing_count:0,checked:0,total_experts:0,scanned_experts:0,scan_limit:500,coverage_pct:100,expert_coverage_pct:100,coverage_complete:true,coverage_truncated:false,expert_coverage_complete:true,field_coverage:{schema:'known_website_image_fields_v2',fields_examined:0,experts_with_website_content:0,ai_sections_scanned:0,ai_pages_scanned:0,ai_page_sections_scanned:0,nested_item_limit_per_expert:200,complete:true,truncated:false},examples:[]},
  storage:{database:{available:true,status:'ok',last_error_code:null,driver:'postgres-primary-hybrid',fallback_driver:'sqlite-better-sqlite3',postgres_primary_mode:true,sqlite_authority_guard:true},assets:{available:true,status:'ok',last_error_code:null,driver:'local-filesystem',exists:true,writable:true,durable:true,upload_dir:'/safe/uploads'}},background_tasks:healthyBackground,live_capacity:{available:true,status:'ok',authority:'private_rollout_control',mode:'enforce',scope:'fleet',human_ceiling:5,ai_ceiling:50,revision:1,enforcement_epoch:1,activated_at:Math.floor(Date.now()/1000)-60,effective_mode:'enforce',effective_scope:'fleet',effective_human_ceiling:5,effective_ai_ceiling:50,admission_enforced:true,admission_paused:false,stripe_order_guaranteed:true,updated_at:Math.floor(Date.now()/1000),reason:null,reason_present:false,last_error_code:null},
  media_sfu:healthyMediaSfu,security:healthySecurity,reply_assistant:healthyReplyAssistant,payment_runtime:{available:true,status:'ok',active_stripe_mode:'test',active_configuration_ready:true,webhook_configuration_ready:true,configured_mode:'test',last_error_code:null},
});
healthyOverview.payment_runtime.platform_webhook_configuration_ready=true;
healthyOverview.payment_runtime.connect_webhook_configuration_ready=true;
assert.equal(hooks.validOpsOverview(healthyOverview),true,'the current backend overview contract is accepted');
const paymentOperationsHtml=hooks.renderPaymentOperations(healthyOverview);
assert.match(paymentOperationsHtml,/Payment operations[\s\S]*Authoritative payment database aggregates: COMPLETE[\s\S]*End-to-end Stripe delivery: NOT COVERED/,'payment operations renders authoritative database scope without implying end-to-end Stripe delivery coverage');
assert.match(paymentOperationsHtml,/Stripe delivery attempts \/ signature failures<\/td><td>NOT COVERED \/ NOT COVERED/,'unreceived Stripe attempts and signature failures stay explicitly outside the verified receipt ledger');
assert.match(paymentOperationsHtml,/Stripe Connect bank payout failed[\s\S]*connected-account bank payout; not a platform payout queue/,'payout failure evidence is explicitly a Stripe Connect bank payout, not a platform payout queue');
assert.equal(hooks.validOpsOverview({...healthyOverview,payment_operations:{...healthyOverview.payment_operations,settlements:{...healthyOverview.payment_operations.settlements,by_phase:{...healthyOverview.payment_operations.settlements.by_phase,claimed:'0'}}}}),false,'numeric-looking payment settlement phase counts are rejected');
const missingClaimedPhase={...healthyOverview.payment_operations.settlements.by_phase};delete missingClaimedPhase.claimed;
assert.equal(hooks.validOpsOverview({...healthyOverview,payment_operations:{...healthyOverview.payment_operations,settlements:{...healthyOverview.payment_operations.settlements,by_phase:missingClaimedPhase}}}),false,'the real claimed settlement phase is required by the strict payment contract');
assert.equal(hooks.validOpsOverview({...healthyOverview,payment_operations:{...healthyOverview.payment_operations,webhook:{...healthyOverview.payment_operations.webhook,recent_financial_events_24h:{...healthyOverview.payment_operations.webhook.recent_financial_events_24h,payout_failed:'0'}}}}),false,'numeric-looking verified Stripe financial-event counts are rejected');
assert.equal(hooks.validOpsOverview({...healthyOverview,summary:{...healthyOverview.summary,payment_outstanding_amount:99}}),false,'payment summary amounts must equal the authoritative payment-operations aggregate');
const missingWebhookConfigurationAlert={key:'stripe_webhook_configuration_unavailable',severity:'critical',title:'Stripe webhook signing is not configured',detail:'No valid signing secret is configured.',at:healthyOverview.generated_at};
const missingWebhookConfigurationOverview=withOverviewProvenance({...healthyOverview,status:'critical',alerts:[missingWebhookConfigurationAlert],summary:{...healthyOverview.summary,active_alerts:1,critical_alerts:1,stripe_platform_webhook_configuration_ready:false,stripe_connect_webhook_configuration_ready:true,stripe_webhook_configuration_ready:false},payment_runtime:{...healthyOverview.payment_runtime,status:'critical',platform_webhook_configuration_ready:false,connect_webhook_configuration_ready:true,webhook_configuration_ready:false,last_error_code:'stripe_webhook_configuration_unavailable'}});
assert.equal(hooks.validOpsOverview(missingWebhookConfigurationOverview),true,'a missing Stripe webhook signing secret is accepted only as coherent critical evidence, never green');
assert.match(hooks.renderPaymentOperations(missingWebhookConfigurationOverview),/Platform webhook signing[\s\S]*MISSING \/ CRITICAL[\s\S]*Payment, refund, dispute, and subscription webhook authenticity cannot be established/,'missing platform webhook signing configuration is visibly critical in Payment operations');
const missingConnectWebhookConfigurationAlert={key:'stripe_connect_webhook_configuration_unavailable',severity:'critical',title:'Stripe Connect webhook signing is not configured',detail:'No valid Connect signing secret is configured.',at:healthyOverview.generated_at};
const missingConnectWebhookConfigurationOverview=withOverviewProvenance({...healthyOverview,status:'critical',alerts:[missingConnectWebhookConfigurationAlert],summary:{...healthyOverview.summary,active_alerts:1,critical_alerts:1,stripe_platform_webhook_configuration_ready:true,stripe_connect_webhook_configuration_ready:false,stripe_webhook_configuration_ready:false},payment_runtime:{...healthyOverview.payment_runtime,status:'critical',platform_webhook_configuration_ready:true,connect_webhook_configuration_ready:false,webhook_configuration_ready:false,last_error_code:'stripe_connect_webhook_configuration_unavailable'}});
assert.equal(hooks.validOpsOverview(missingConnectWebhookConfigurationOverview),true,'a missing Stripe Connect webhook signing secret is coherent only as critical evidence, never green');
assert.match(hooks.renderPaymentOperations(missingConnectWebhookConfigurationOverview),/Stripe Connect webhook signing[\s\S]*MISSING \/ CRITICAL[\s\S]*Expert bank-payout and connected-account event authenticity cannot be established; this is not a platform payout queue/,'missing Connect signing coverage is critical and cannot be confused with a platform payout queue');
const verifiedPayoutFailureAlert={key:'payment_operations_verified_financial_failures',severity:'warning',title:'Stripe reported recent financial exceptions',detail:'One verified connected-account payout failure was received.',at:healthyOverview.generated_at};
const payoutFailureWebhook={...healthyPaymentOperations.webhook,status:'warning',reason_codes:['verified_connect_payout_failed_events'],total_events:1,processed_events:1,last_received_at:paymentDatabaseNow,last_processed_at:paymentDatabaseNow,recent_financial_events_24h:{...healthyPaymentOperations.webhook.recent_financial_events_24h,payout_failed:1}};
const payoutFailurePaymentOperations={...healthyPaymentOperations,status:'warning',reason_codes:['verified_webhook_receipt_processing_in_progress'],webhook:payoutFailureWebhook};
const payoutFailureOverview=withOverviewProvenance({...healthyOverview,status:'warning',alerts:[verifiedPayoutFailureAlert],summary:{...healthyOverview.summary,active_alerts:1,warning_alerts:1,payment_operations_status:'warning'},payment_operations:payoutFailurePaymentOperations});
assert.equal(hooks.validOpsOverview(payoutFailureOverview),true,'verified Stripe Connect payout-failure receipts are accepted as coherent warning evidence with endpoint-scoped coverage');
assert.match(hooks.renderPaymentOperations(payoutFailureOverview),/End-to-end Stripe delivery: NOT COVERED[\s\S]*Connect bank payout failed 1/,'verified financial failures remain visible without widening receipt-ledger coverage');
const currentEvent={key:'broken_upload_assets',severity:'info',event:'resolved',source:'assets',previous_severity:'warning',title:'Asset alert resolved',detail:'Aggregate asset evidence returned to normal.',at:healthyOverview.generated_at};
const currentEventHistory={generated_at:healthyOverview.generated_at,scope:'backend_replica',storage:'process_memory',retention_limit:120,returned_limit:120,retained_event_count:1,returned_event_count:1,dropped_event_count:0,retention_complete_for_observed_samples:true,sampling_trigger:'overview_request',sampling_continuous:false,sampling_gap_possible:true,sample_count:1,first_sampled_at:healthyOverview.generated_at,last_sampled_at:healthyOverview.generated_at,process_started_at:verifiedIdentity.process_started_at,deployment_id:verifiedIdentity.deployment_id,replica_id:verifiedIdentity.replica_id,events:[currentEvent]};
assert.equal(hooks.validOpsEventHistoryEnvelope(currentEventHistory,verifiedIdentity),true,'the exact fresh replica-local process-memory event-history envelope is accepted');
assert.equal(hooks.validOpsEventHistoryEnvelope({...currentEventHistory,retained_event_count:0,returned_event_count:0,events:[],sample_count:0,first_sampled_at:null,last_sampled_at:null},verifiedIdentity),true,'event history before the first overview sample uses exact zero/null sampling semantics');
const staleEventGeneratedAt=new Date(Date.now()-31000).toISOString();
assert.equal(hooks.validOpsEventHistoryEnvelope({...currentEventHistory,generated_at:staleEventGeneratedAt,first_sampled_at:staleEventGeneratedAt,last_sampled_at:staleEventGeneratedAt,events:[{...currentEvent,at:staleEventGeneratedAt}]},verifiedIdentity),false,'an old cached event-history HTTP 200 cannot be reported as current');
assert.equal(hooks.validOpsEventHistoryEnvelope({...currentEventHistory,returned_event_count:0},verifiedIdentity),false,'event-history metadata cannot disagree with the returned event list');
assert.equal(hooks.validOpsEventHistoryEnvelope({...currentEventHistory,sampling_continuous:true},verifiedIdentity),false,'request-sampled alert history cannot be mislabeled as continuous monitoring');
assert.equal(hooks.validOpsOverview({...healthyOverview,alert_event_history:{...healthyOverview.alert_event_history,returned_event_count:1}}),false,'overview event-history counts must exactly match the embedded event list');
assert.equal(hooks.validOpsOverview({...healthyOverview,status:'warning'}),false,'a warning label without warning alert evidence cannot become a trusted current snapshot');
const statusMismatchAlert={key:'cache_observability_unavailable',severity:'warning',title:'Cache warning',detail:'warning-only evidence',at:new Date().toISOString()};
assert.equal(hooks.validOpsOverview({...healthyOverview,status:'critical',alerts:[statusMismatchAlert],summary:{...healthyOverview.summary,active_alerts:1,warning_alerts:1}}),false,'a critical label with warning-only alert evidence is rejected');
assert.equal(hooks.validOpsOverview({...healthyOverview,realtime:{...healthyOverview.realtime,websocket:{...healthyOverview.realtime.websocket,available:true,status:'ok'}}}),true,'extra legacy websocket labels do not replace or invalidate the actual backend driver/local/cluster/metrics contract');
assert.equal(hooks.validOpsOverview({...healthyOverview,realtime:{...healthyOverview.realtime,websocket:{...healthyOverview.realtime.websocket,connected_users:1,active_rooms:1,total_sockets:1}}}),true,'request-time local socket counters may legitimately differ from the last published cluster-local snapshot during socket churn');
assert.equal(hooks.validOpsOverview({...healthyOverview,realtime:{...healthyOverview.realtime,websocket:{...healthyOverview.realtime.websocket,runtime:{...realtimeRuntime,disconnect_timers:'0'}}}}),false,'numeric-looking realtime runtime counters cannot enter a trusted overview');
assert.equal(hooks.validOpsOverview({...healthyOverview,realtime:{...healthyOverview.realtime,websocket:{...healthyOverview.realtime.websocket,alert_window:{...healthyOverview.realtime.websocket.alert_window,window_coverage_complete:false}}}}),false,'realtime window completeness must exactly match observed coverage');
assert.equal(hooks.validOpsOverview({...healthyOverview,generated_at:new Date(Date.now()-31000).toISOString()}),false,'an ancient HTTP 200 envelope cannot refresh or authorize health');
assert.equal(hooks.validOpsOverview({runtime_identity:verifiedIdentity}),false,'an identity-only object is not a valid overview contract');
assert.equal(hooks.validOpsOverview({generated_at:healthyOverview.generated_at,status:'ok',alerts:[],summary:healthyOverview.summary,runtime_identity:verifiedIdentity}),false,'a skeletal identity-bearing object without overview sections is not a valid contract');
assert.equal(hooks.validOpsOverview({...healthyOverview,summary:{...healthyOverview.summary,active_alerts:'0'}}),false,'numeric-looking alert counts cannot validate an overview');
assert.equal(hooks.validOpsOverview({...healthyOverview,database:{available:true,status:'critical',primary:{ok:false}}}),false,'a globally OK envelope cannot hide a critical section and still authorize green health');
assert.equal(hooks.validOpsOverview({...healthyOverview,database:{...healthyOverview.database,primary:{...healthyOverview.database.primary,duration_ms:'1'}}}),false,'numeric-looking database probe measurements cannot enter a trusted overview');
assert.equal(hooks.validOpsOverview({...healthyOverview,http:{...healthyOverview.http,p95_ms:'0'}}),false,'numeric-looking signal strings are not accepted as authoritative telemetry');
assert.equal(hooks.validOpsOverview({...healthyOverview,http:{...healthyOverview.http,total_requests:'0'}}),false,'numeric-looking HTTP request totals cannot enter a trusted overview');
assert.equal(hooks.validOpsOverview({...healthyOverview,http:{...healthyOverview.http,window_coverage_complete:false}}),false,'HTTP window completeness must exactly match observed coverage');
assert.equal(hooks.validOpsOverview({...healthyOverview,http:{...healthyOverview.http,returned_route_count:'0'}}),false,'numeric-looking bounded HTTP evidence counts are rejected');
assert.equal(hooks.validOpsOverview({...healthyOverview,system:{...healthySystem,event_loop:{...healthySystem.event_loop,p95_ms:'2'}}}),false,'numeric-looking system latency cannot enter a trusted overview');
assert.equal(hooks.validOpsOverview({...healthyOverview,business:{...healthyBusiness,channels:{...healthyBusiness.channels,chat:{...healthyBusiness.channels.chat,revenue_24h:'0'}}}}),false,'numeric-looking business money aggregates cannot enter a trusted overview');
const overviewGeneratedSec=Math.floor(Date.parse(healthyOverview.generated_at)/1000);
const coherentSettlingOverview=withOverviewProvenance({...healthyOverview,summary:{...healthyOverview.summary,settling_sessions:1},business:{...healthyBusiness,sessions:{...healthyBusiness.sessions,settling_sessions:1,oldest_settling_started_at:overviewGeneratedSec-5,oldest_settling_age_sec:5}}});
assert.equal(hooks.validOpsOverview(coherentSettlingOverview),true,'backend epoch-second business timestamps and their derived ages are accepted when coherent with the envelope');
const futureSettlingOverview=withOverviewProvenance({...healthyOverview,summary:{...healthyOverview.summary,settling_sessions:1},business:{...healthyBusiness,sessions:{...healthyBusiness.sessions,settling_sessions:1,oldest_settling_started_at:overviewGeneratedSec+3600,oldest_settling_age_sec:0}}});
assert.equal(hooks.validOpsOverview(futureSettlingOverview),false,'a future business source timestamp cannot become trusted even when its count and age look coherent');
assert.equal(hooks.validOpsOverview({...healthyOverview,reply_assistant:{...healthyOverview.reply_assistant,started_at:overviewGeneratedSec+3600,worker_age_sec:0}}),false,'future reply-worker timestamps are rejected');
assert.equal(hooks.validOpsOverview({...healthyOverview,live_capacity:{...healthyOverview.live_capacity,updated_at:overviewGeneratedSec+3600}}),false,'future live-capacity update provenance is rejected');
assert.equal(hooks.validOpsOverview({...healthyOverview,database:{...healthyOverview.database,postgres_shadow:{...healthyOverview.database.postgres_shadow,last_sync_at:overviewGeneratedSec+3600}}}),false,'future database-shadow timestamps are rejected');
assert.equal(hooks.validOpsOverview({...healthyOverview,provenance:{}}),false,'a trusted envelope requires every exact section provenance record, including payment operations');
assert.equal(hooks.validOpsOverview({...healthyOverview,provenance:{...healthyOverview.provenance,http:{...healthyOverview.provenance.http,sample_count:999}}}),false,'provenance sample counts must match the section evidence');
assert.equal(hooks.validOpsOverview({...healthyOverview,thresholds:{}}),false,'a trusted envelope requires every public alert threshold');
assert.equal(hooks.validOpsOverview({...healthyOverview,thresholds:{...healthyOverview.thresholds,http_p95_warning_ms:'900'}}),false,'numeric-looking threshold strings are rejected');
assert.equal(hooks.validOpsOverview({...healthyOverview,summary:{...healthyOverview.summary,pending_sessions:99}}),false,'displayed pending-session summary values must equal their authoritative section');
assert.equal(hooks.validOpsOverview({...healthyOverview,summary:{...healthyOverview.summary,api_error_rate_pct:99}}),false,'displayed API error-rate summary values must equal their authoritative section');
assert.equal(hooks.validOpsOverview({...healthyOverview,summary:{...healthyOverview.summary,broken_assets:99}}),false,'displayed broken-asset summary values must equal their authoritative section');
assert.equal(hooks.validOpsOverview({...healthyOverview,media_sfu:{available:true,status:'disabled'}}),false,'a skeletal media section cannot enter a trusted report envelope');
assert.equal(hooks.validOpsOverview({...healthyOverview,security:{available:true,status:'ok'}}),false,'a skeletal security section cannot enter a trusted report envelope');
assert.equal(hooks.validOpsOverview({...healthyOverview,reply_assistant:{available:true,status:'ok'}}),false,'a skeletal reply-assistant section cannot enter a trusted report envelope');
assert.equal(hooks.validOpsOverview({...healthyOverview,live_capacity:{available:true,status:'ok'}}),false,'a skeletal live-capacity authority cannot enter a trusted report envelope');
assert.equal(hooks.validOpsOverview({...healthyOverview,assets:{...healthyOverview.assets,coverage_complete:false}}),false,'global OK cannot contradict incomplete asset coverage');
assert.equal(hooks.validOpsOverview({...healthyOverview,storage:{...healthyOverview.storage,assets:{...healthyOverview.storage.assets,writable:false}}}),false,'global OK cannot contradict an unwritable asset store');
assert.equal(hooks.validOpsOverview({...healthyOverview,realtime:{...healthyOverview.realtime,status:'ok',websocket:{...healthyOverview.realtime.websocket,cluster:{...healthyOverview.realtime.websocket.cluster,status:'connecting',client_ready:false}}}}),false,'global OK cannot hide a connecting realtime cluster');
assert.equal(hooks.validOpsOverview({...healthyOverview,background_tasks:{...healthyBackground,health:'degraded'}}),false,'global OK cannot hide degraded background-task health');
assert.equal(hooks.validOpsOverview({...healthyOverview,payment_runtime:{...healthyOverview.payment_runtime,active_configuration_ready:false}}),false,'a healthy-looking payment section requires the active Stripe configuration to be ready');
assert.equal(hooks.validOpsOverview({...healthyOverview,payment_runtime:{...healthyOverview.payment_runtime,configured_mode:'live'}}),false,'configured Stripe mode must exactly match the authoritative active mode');
const measuredHttp={...healthyHttp,measurement_available:true,total_requests:4,status_counts:{'2xx':4,'3xx':0,'4xx':0,'5xx':0,other:0},rate_window_request_count:4,rate_window_status_counts:{'2xx':4,'3xx':0,'4xx':0,'5xx':0,other:0},error_rate_pct:0,client_error_rate_pct:0,rate_limited_rate_pct:0,avg_ms:10,p95_ms:10,max_ms:10,latency_sample_count:4,latency_samples_truncated:false,last_request_at:healthyHttp.rate_window_ended_at,tracked_route_count:1,returned_route_count:1,hottest_routes:[{route:'GET /api/admin/observability/overview',count:4,errors:0,avg_ms:10,p95_ms:10,max_ms:10,last_status_code:200,last_duration_ms:10,last_request_at:healthyHttp.rate_window_ended_at,status_counts:{'2xx':4,'3xx':0,'4xx':0,'5xx':0,other:0},latency_sample_count:4,latency_sample_limit:120,latency_samples_truncated:false}]};
const measuredHttpOverview=withOverviewProvenance({...healthyOverview,http:measuredHttp,summary:{...healthyOverview.summary,api_window_request_count:4,api_p95_ms:10,api_error_rate_pct:0}});
assert.equal(hooks.validOpsOverview(measuredHttpOverview),true,'a sampled trailing-window HTTP contract with bounded route evidence remains trusted');
const unalertedHighLatency=withOverviewProvenance({...measuredHttpOverview,http:{...measuredHttp,avg_ms:1000,p95_ms:1000,max_ms:1000,hottest_routes:[{...measuredHttp.hottest_routes[0],avg_ms:1000,p95_ms:1000,max_ms:1000,last_duration_ms:1000}]},summary:{...measuredHttpOverview.summary,api_p95_ms:1000}});
assert.equal(hooks.validOpsOverview(unalertedHighLatency),false,'global OK cannot hide HTTP evidence above the warning threshold when its alert is omitted');
assert.equal(hooks.validOpsOverview(withOverviewProvenance({...measuredHttpOverview,http:{...measuredHttp,latency_samples_truncated:true}})),false,'HTTP latency truncation metadata must match the sample count');
assert.equal(hooks.validOpsOverview(withOverviewProvenance({...measuredHttpOverview,http:{...measuredHttp,hottest_routes:[{...measuredHttp.hottest_routes[0],latency_sample_count:'4'}]}})),false,'route latency sample counts reject numeric-looking strings');
assert.equal(hooks.validOpsOverview({...healthyOverview,http:{...healthyOverview.http,p95_ms:0}}),false,'an empty API window cannot fabricate a zero-latency measurement');
const latencySampleAlert={key:'http_latency_sample_partial',severity:'warning',title:'HTTP latency evidence is sampled',detail:'The p95 uses the latest bounded samples.',at:new Date().toISOString(),meta:{window_sec:900,observed_window_sec:900,window_coverage_complete:true,window_request_count:4,latency_sample_count:2,latency_sample_limit:400,latency_samples_truncated:true,latency_sampling:'latest_requests_within_rate_window'}};
const sampledHttp={...measuredHttp,latency_sample_count:2,latency_samples_truncated:true};
const sampledHttpOverview=withOverviewProvenance({...measuredHttpOverview,status:'warning',alerts:[latencySampleAlert],http:sampledHttp,summary:{...measuredHttpOverview.summary,active_alerts:1,warning_alerts:1}});
assert.equal(hooks.validOpsOverview(sampledHttpOverview),true,'bounded latest-request p95 sampling is accepted only as explicit non-green partial evidence');
const httpWarmAlert={key:'http_alert_window_warming',severity:'warning',title:'HTTP alert window is still warming',detail:'Only 61 of 900 seconds have been observed.',at:new Date().toISOString()};
const httpWarm={...healthyHttp,uptime_sec:60,observed_window_sec:61,window_coverage_complete:false,observed_started_at:new Date(Date.parse(healthyHttp.rate_window_ended_at)-60000).toISOString()};
const httpWarmOverview=withOverviewProvenance({...healthyOverview,status:'warning',alerts:[httpWarmAlert],http:httpWarm,summary:{...healthyOverview.summary,active_alerts:1,warning_alerts:1,api_observed_window_sec:61,api_window_coverage_complete:false}});
assert.equal(hooks.validOpsOverview(httpWarmOverview),true,'a backend-compatible warming HTTP window is warning evidence, not stale or falsely clear');
const realtimeWarmAlert={key:'realtime_alert_window_warming',severity:'warning',title:'Realtime alert window is still warming',detail:'Only 61 of 900 seconds have been observed.',at:new Date().toISOString()};
const realtimeWarmWindow={...healthyOverview.realtime.websocket.alert_window,observed_window_sec:61,window_coverage_complete:false,observed_started_at:new Date(Date.parse(healthyOverview.realtime.websocket.alert_window.window_ended_at)-60000).toISOString()};
const realtimeWarmOverview=withOverviewProvenance({...healthyOverview,status:'warning',alerts:[realtimeWarmAlert],summary:{...healthyOverview.summary,active_alerts:1,warning_alerts:1},realtime:{...healthyOverview.realtime,websocket:{...healthyOverview.realtime.websocket,alert_window:realtimeWarmWindow}}});
assert.equal(hooks.validOpsOverview(realtimeWarmOverview),true,'a backend-compatible warming realtime window is warning evidence with explicit partial observation coverage');
const unalertedRealtimeError=withOverviewProvenance({...healthyOverview,realtime:{...healthyOverview.realtime,websocket:{...healthyOverview.realtime.websocket,metrics:{...healthyOverview.realtime.websocket.metrics,handler_error_total:1},alert_window:{...healthyOverview.realtime.websocket.alert_window,handler_error_count:1}}}});
assert.equal(hooks.validOpsOverview(unalertedRealtimeError),false,'global OK cannot hide recent realtime handler-error evidence when its alert is omitted');
const cacheUnavailableAlert={key:'cache_observability_unavailable',severity:'warning',title:'Cache unavailable',detail:'cache probe unavailable',at:new Date().toISOString()};
const cacheUnavailableOverview=withOverviewProvenance({...healthyOverview,status:'warning',alerts:[cacheUnavailableAlert],summary:{...healthyOverview.summary,active_alerts:1,warning_alerts:1},cache:{available:false,status:'unavailable'}});
assert.equal(hooks.validOpsOverview(cacheUnavailableOverview),true,'a coherent partial snapshot remains usable as warning/unknown evidence without inventing missing cache metrics');
const backgroundDegradedAlert={key:'background_task_queue_unhealthy',severity:'warning',title:'Background queue degraded',detail:'queue evidence degraded',at:new Date().toISOString()};
assert.equal(hooks.validOpsOverview({...healthyOverview,status:'warning',alerts:[backgroundDegradedAlert],summary:{...healthyOverview.summary,active_alerts:1,warning_alerts:1,background_task_health:'degraded',background_task_health_code:'background_task_dropped_work',background_task_dropped:1},background_tasks:{...healthyOverview.background_tasks,health:'degraded',health_code:'background_task_dropped_work',dropped:1}}),true,'backend health=degraded is accepted only in a coherent non-green overview');
const thresholdConfigurationAlert={key:'observability_threshold_configuration_invalid',severity:'warning',title:'Observability threshold configuration invalid',detail:'one threshold uses a safe fallback',at:new Date().toISOString()};
const invalidThresholdOverview=withOverviewProvenance({...healthyOverview,status:'warning',alerts:[thresholdConfigurationAlert],summary:{...healthyOverview.summary,active_alerts:1,warning_alerts:1},thresholds:{...healthyThresholds,configuration_valid:false,invalid_keys:['OBS_HTTP_P95_WARN_MS']}});
assert.equal(hooks.validOpsOverview(invalidThresholdOverview),true,'the backend fallback threshold values remain visible only with exact invalid-configuration warning evidence');
const invalidMediaThresholds={...healthyThresholds,configuration_valid:false,invalid_keys:['MEDIA_EST_VIDEO_MBPS']};
const invalidMediaSection={...healthyMediaSfu,status:'warning',configuration_valid:false,configuration_invalid_keys:['MEDIA_EST_VIDEO_MBPS'],last_error_code:'media_sfu_observability_configuration_invalid',error:'Media SFU observability configuration is invalid.'};
const invalidMediaThresholdOverview=withOverviewProvenance({...healthyOverview,status:'warning',alerts:[thresholdConfigurationAlert],summary:{...healthyOverview.summary,active_alerts:1,warning_alerts:1,media_sfu_status:'warning'},thresholds:invalidMediaThresholds,media_sfu:invalidMediaSection});
assert.equal(hooks.validOpsOverview(invalidMediaThresholdOverview),true,'the exact backend media-configuration warning shape remains compatible and cannot be mistaken for green');
const replyAuthorityAlert={key:'reply_assistant_authority_unavailable',severity:'critical',title:'Reply authority unavailable',detail:'provider authority is not ready',at:new Date().toISOString()};
const replyAuthorityFailure={...healthyReplyAssistant,status:'critical',reason_codes:['authority_unavailable'],authority:{...healthyReplyAssistant.authority,ready:false},last_error_code:'reply_assistant_authority_unavailable'};
const replyAuthorityOverview=withOverviewProvenance({...healthyOverview,status:'critical',alerts:[replyAuthorityAlert],summary:{...healthyOverview.summary,active_alerts:1,critical_alerts:1,reply_assistant_status:'critical'},reply_assistant:replyAuthorityFailure});
assert.equal(hooks.validOpsOverview(replyAuthorityOverview),true,'an authority-derived reply-assistant error code is accepted without falsely requiring a worker runtime error');
const partialBusinessAlert={key:'business_observability_unavailable',severity:'warning',title:'Business signals unavailable',detail:'business probe unavailable',at:new Date().toISOString()};
assert.equal(hooks.validOpsOverview(withOverviewProvenance({...healthyOverview,status:'warning',alerts:[partialBusinessAlert],summary:{...healthyOverview.summary,active_alerts:1,warning_alerts:1,active_sessions:null,settling_sessions:null,stuck_settling_sessions:null,pending_sessions:null},business:{available:false,status:'unavailable',sessions:{active_sessions:null,settling_sessions:null,stuck_settling_sessions:null,pending_sessions:null}}})),true,'coherent unavailable business evidence keeps its intentional null summary instead of invalidating the whole warning snapshot');
const partialAssetAlert={key:'asset_scan_partial_coverage',severity:'warning',title:'Asset scan partial',detail:'nested field budget exhausted',at:new Date().toISOString()};
assert.equal(hooks.validOpsOverview(withOverviewProvenance({...healthyOverview,status:'warning',alerts:[partialAssetAlert],summary:{...healthyOverview.summary,active_alerts:1,warning_alerts:1,asset_scan_coverage_pct:null,asset_scan_coverage_complete:false},assets:{...healthyOverview.assets,status:'warning',coverage_pct:null,coverage_complete:false,coverage_truncated:true,field_coverage:{...healthyOverview.assets.field_coverage,complete:false,truncated:true}}})),true,'available partial asset coverage accepts the backend null coverage percentage while remaining non-green');
function validTrends(now=Date.now()){
  const generatedAt=new Date(now),currentHour=Math.floor(generatedAt.getTime()/3600000)*3600000,currentDay=Date.UTC(generatedAt.getUTCFullYear(),generatedAt.getUTCMonth(),generatedAt.getUTCDate());
  const hourly=Array.from({length:24},(_,index)=>{const ms=currentHour-(23-index)*3600000;return {bucket:new Date(ms).toISOString(),bucket_epoch:Math.floor(ms/1000),requested:index,active:0,ended:index,payment_failures:0};});
  const daily=Array.from({length:14},(_,index)=>{const day=new Date(currentDay-(13-index)*86400000).toISOString().slice(0,10);return {day,requested:index,ended:index,payment_failures:0,revenue:index,card_charged:index,gross_captured:index,refunded:0,credit_applied:0,billing_outstanding:0};});
  const users={daily:daily.map((row,index)=>({day:row.day,total:index,experts:index,clients:0}))};
  const channel=()=>({pending:0,active:0,waiting_to_start:0,ended_24h:0,paid_24h:0,revenue_24h:0});
  return {generated_at:generatedAt.toISOString(),semantics:{timezone:'UTC',session_bucket_basis:'session_created_at',hourly_values:'current_state_of_sessions_requested_in_bucket',daily_money_basis:'current_financial_state_of_sessions_requested_on_day',historical_buckets_mutable:true,user_bucket_basis:'user_created_at'},sessions:{hourly,daily,channels:{chat:channel(),voice:channel(),video:channel()}},users,live:[{at:generatedAt.toISOString(),api_p95_ms:null,api_window_sec:900,api_observed_window_sec:900,api_window_coverage_complete:true,api_window_request_count:0,realtime_available:true,realtime_status:'ok',realtime_last_error_code:null,connected_users:0,pending_sessions:0,sessions_now:0,active_voice_sessions:0,active_video_sessions:0,active_chat_sessions:0,active_media_waiting_to_start:0,stale_active_sessions:0,settling_sessions:0,stuck_settling_sessions:0,oldest_settling_age_sec:0}]};
}
const currentTrends=validTrends();
assert.equal(hooks.validOpsTrends(currentTrends),true,'the exact current backend trend contract is accepted');
assert.equal(hooks.validOpsTrends({...currentTrends,semantics:{...currentTrends.semantics,daily_money_basis:'accounting_day'}}),false,'trend bucket semantics are exact and cannot silently imply event-time accounting history');
assert.equal(hooks.validOpsTrends({...currentTrends,semantics:{...currentTrends.semantics,historical_buckets_mutable:'true'}}),false,'a string cannot weaken the mutable-cohort trend disclosure');
assert.equal(hooks.validOpsTrends({...currentTrends,sessions:{...currentTrends.sessions,hourly:currentTrends.sessions.hourly.map((row,index)=>index===0?{...row,requested:'0'}:row)}}),false,'numeric-looking trend strings are rejected');
assert.equal(hooks.validOpsTrends({...currentTrends,sessions:{...currentTrends.sessions,hourly:currentTrends.sessions.hourly.slice().reverse()}}),false,'unordered trend buckets are rejected');
assert.equal(hooks.validOpsTrends({...currentTrends,generated_at:new Date(Date.now()-31000).toISOString()}),false,'stale trend envelopes are rejected');
assert.equal(hooks.validOpsTrends({...currentTrends,live:[{...currentTrends.live[0],at:new Date(Date.parse(currentTrends.generated_at)+1000).toISOString()}]}),false,'the backend single-anchor trend snapshot requires live.at to equal generated_at exactly');
assert.equal(hooks.validOpsTrends({...currentTrends,live:[{...currentTrends.live[0],sessions_now:1}]}),false,'live session totals cannot contradict the exact canonical channel rows');
assert.equal(hooks.validOpsTrends({...currentTrends,live:[{...currentTrends.live[0],api_window_request_count:1,api_p95_ms:4,pending_sessions:'0'}]}),false,'sampled API trend rows still require strict numeric live counters without string coercion');
assert.equal(hooks.validOpsTrends({...currentTrends,live:[{...currentTrends.live[0],api_window_request_count:1,api_p95_ms:null}]}),false,'a sampled API window requires a finite p95 value');
assert.equal(hooks.validOpsTrends({...currentTrends,live:[{...currentTrends.live[0],api_window_request_count:0,api_p95_ms:0}]}),false,'an empty API window uses null rather than a fabricated zero-latency measurement');
assert.equal(hooks.validOpsTrends({...currentTrends,live:[{...currentTrends.live[0],realtime_available:false,realtime_status:'unavailable',realtime_last_error_code:'ECONNRESET',connected_users:null}]}),true,'authoritative realtime unavailability retains the remaining live trend evidence and an exact safe error code');
assert.equal(hooks.validOpsTrends({...currentTrends,live:[{...currentTrends.live[0],realtime_status:'critical',realtime_last_error_code:'realtime_presence_not_ready',connected_users:0}]}),false,'critical realtime cannot retain a numeric connected-user claim');
assert.match(opsSource,/Current net revenue by request day \(UTC cohort\)[\s\S]*mutable as sessions settle\/refund/,'daily money is labeled as a mutable request-day cohort rather than immutable accounting-day revenue');
assert.match(opsSource,/Current payment failures by request day \(UTC cohort\)[\s\S]*mutable current outcomes/,'payment failures disclose their request-day cohort basis');
assert.match(opsSource,/Current API pulse[\s\S]*one current monitor sample · not a time series/,'the one-row API pulse is not labeled as historical live samples');
assert.doesNotMatch(opsSource,/Revenue by day|Payment failures by day|API p95 live samples/,'misleading event-day and time-series trend labels are removed');
hooks.render(httpWarmOverview,currentTrends,{received_at:Date.now(),identity_verification:{verified:true}});
assert.match(nodes['ob-ops-body'].innerHTML,/API p95 · recent window[\s\S]*observed 61s of 15m[\s\S]*warming window; zero\/rates cover only observed time/,'HTTP warm-up renders the exact observed coverage rather than a false full-window all-clear');
hooks.render(realtimeWarmOverview,currentTrends,{received_at:Date.now(),identity_verification:{verified:true}});
assert.match(nodes['ob-ops-body'].innerHTML,/RTC quality · recent window[\s\S]*observed 61s of 15m[\s\S]*partial post-start window; zero does not prove a full 15-minute clear period/,'realtime cards disclose restart-limited observation coverage');
hooks.render(sampledHttpOverview,currentTrends,{received_at:Date.now(),identity_verification:{verified:true}});
assert.match(nodes['ob-ops-body'].innerHTML,/API p95 · recent window[\s\S]*latest 2 \/ 4 request latency samples · PARTIAL sample/,'the p95 card discloses bounded latest-request sampling when it is truncated');
assert.match(nodes['ob-ops-body'].innerHTML,/HTTP latency evidence is sampled/,'the evidence-completeness warning remains visible to the owner');
const sampledPulseTrends={...currentTrends,live:[{...currentTrends.live[0],api_window_request_count:4,api_p95_ms:10}]};
hooks.render(sampledHttpOverview,sampledPulseTrends,{received_at:Date.now(),identity_verification:{verified:true}});
assert.match(nodes['ob-ops-body'].innerHTML,/Live risk pulse[\s\S]*Current API p95 10ms \(observed 900s of 15m; latest 2 \/ 4 request latency samples · PARTIAL sample\)/,'trend insight qualifies its current p95 with exact observed and bounded-sample coverage');
const response=(status,payload)=>({status,ok:status>=200&&status<300,json:async()=>payload});
let fetchPlan=[response(200,healthyOverview),response(200,currentTrends)];
const overviewFetches=[];
sandbox.fetch=async(url,init)=>{overviewFetches.push({url,init});const next=fetchPlan.shift();if(next instanceof Error)throw next;if(!next)throw new Error('unexpected fetch');return next;};
const healthyRefresh=await hooks.refresh('manual');
assert.equal(healthyRefresh.ok,true,'a current-principal overview refresh returns an explicit success outcome');
assert.equal(healthyRefresh.identity_verification.verified,true);
assert(nodes['ob-ops-launcher'].classList.contains('unknown')===false,'an exact verified zero-alert snapshot can render OK');
assert.equal(nodes['ob-admin-ops-badge'].textContent,'OK');
assert.match(nodes['ob-ops-body'].innerHTML,/Asset storage[\s\S]*READY[\s\S]*Exists yes · writable yes · durable yes/,'asset storage existence, writability, and durability render independently');

const priorOpsBodyContains=nodes['ob-ops-body'].contains;
const priorOpsBodyQuerySelectorAll=nodes['ob-ops-body'].querySelectorAll;
const priorOpsBodyGetBoundingClientRect=nodes['ob-ops-body'].getBoundingClientRect;
const priorOpsBodyScrollHeight=nodes['ob-ops-body'].scrollHeight;
const priorGetElementById=document.getElementById;
const priorActiveElement=document.activeElement;
const pollFocusBefore=node('ob-ops-poll-focus');
const pollFocusAfter=node('ob-ops-poll-focus');
pollFocusBefore.textContent='Refresh';
pollFocusAfter.textContent='Refresh';
let currentPollFocusTarget=pollFocusAfter;
pollFocusAfter.focus=function(options){
  this.focused=true;
  this.focusOptions=options||null;
  if(!(options&&options.preventScroll===true))nodes['ob-ops-body'].scrollTop=0;
};
nodes['ob-ops-body'].contains=candidate=>candidate===pollFocusBefore;
const pollAnchorBefore={id:'ops-session-lifecycle-anchor',tagName:'H3',textContent:'Session lifecycle and realtime health',getAttribute:()=>null,getBoundingClientRect:()=>({top:120,bottom:140})};
const pollAnchorAfter={id:'ops-session-lifecycle-anchor',tagName:'H3',textContent:'Session lifecycle and realtime health',getAttribute:()=>null,getBoundingClientRect:()=>({top:260,bottom:280})};
let pollAnchorQueryCount=0;
nodes['ob-ops-body'].getBoundingClientRect=()=>({top:0,bottom:500});
nodes['ob-ops-body'].querySelectorAll=selector=>selector==='[data-ob-scroll-key],h3,[data-ob-focus-key^="table:"]'?[pollAnchorQueryCount++===0?pollAnchorBefore:pollAnchorAfter]:priorOpsBodyQuerySelectorAll(selector);
nodes['ob-ops-body'].scrollHeight=1400;
document.getElementById=id=>id==='ob-ops-poll-focus'?currentPollFocusTarget:priorGetElementById(id);
document.activeElement=pollFocusBefore;
sandbox.__obOpsActionCenterHtml='<section id="ob-ops-action-center"><button id="ob-ops-poll-focus" type="button">Refresh</button></section>';
nodes['ob-ops-panel'].classList.add('show');
nodes['ob-ops-body'].scrollTop=420;
const pollOverview=withOverviewProvenance({...healthyOverview,generated_at:new Date().toISOString()});
fetchPlan=[response(200,pollOverview),response(200,validTrends())];
const scrolledPollRefresh=await hooks.refresh('poll');
assert.equal(scrolledPollRefresh.ok,true,'a visible-panel poll refresh succeeds');
assert.equal(pollFocusAfter.focused,true,'polling restores keyboard focus to the recreated action-center control');
assert.equal(pollFocusAfter.focusOptions?.preventScroll,true,'polling restores focus without asking the browser to scroll the recreated control into view');
assert.equal(nodes['ob-ops-body'].scrollTop,560,'polling compensates for changed content above the visible heading while restoring focus to a recreated action-center control');
assert.match(nodes['ob-ops-body'].innerHTML,/id="ob-ops-action-center"[\s\S]*id="ob-ops-poll-focus"/,'the cached action center survives the telemetry rerender');

const fallbackPollFocus=node('ob-ops-poll-focus');
let fallbackFocusAttempts=0;
fallbackPollFocus.focus=function(options){
  fallbackFocusAttempts+=1;
  if(options&&options.preventScroll===true)throw new Error('focus options unsupported');
  this.focused=true;
  nodes['ob-ops-body'].scrollTop=0;
};
currentPollFocusTarget=fallbackPollFocus;
document.activeElement=pollFocusBefore;
nodes['ob-ops-body'].scrollTop=430;
fetchPlan=[response(200,withOverviewProvenance({...healthyOverview,generated_at:new Date().toISOString()})),response(200,validTrends())];
const fallbackFocusRefresh=await hooks.refresh('poll');
assert.equal(fallbackFocusRefresh.ok,true,'the poll still succeeds when the browser rejects focus options');
assert.equal(fallbackFocusAttempts,2,'focus restoration falls back exactly once for browsers without focus options');
assert.equal(fallbackPollFocus.focused,true,'fallback focus still preserves keyboard context');
assert.equal(nodes['ob-ops-body'].scrollTop,430,'the final scroll restoration wins even when fallback focus scrolls the recreated control into view');
nodes['ob-ops-body'].contains=priorOpsBodyContains;
nodes['ob-ops-body'].querySelectorAll=priorOpsBodyQuerySelectorAll;
nodes['ob-ops-body'].getBoundingClientRect=priorOpsBodyGetBoundingClientRect;
nodes['ob-ops-body'].scrollHeight=priorOpsBodyScrollHeight;
document.getElementById=priorGetElementById;
document.activeElement=priorActiveElement;
nodes['ob-ops-panel'].classList.remove('show');
sandbox.__obOpsActionCenterHtml='';

const realtimeCriticalAlert={key:'realtime_unhealthy',severity:'critical',title:'Realtime not ready',detail:'presence cycle incomplete',at:new Date().toISOString()};
const criticalRealtime={...healthyOverview.realtime,status:'critical',connected_users:null,websocket:{...healthyOverview.realtime.websocket,cluster:{...healthyOverview.realtime.websocket.cluster,status:'connecting',client_ready:false}}};
const criticalRealtimeOverview=withOverviewProvenance({...healthyOverview,generated_at:new Date().toISOString(),status:'critical',alerts:[realtimeCriticalAlert],summary:{...healthyOverview.summary,active_alerts:1,critical_alerts:1,connected_users:null},realtime:criticalRealtime});
assert.equal(hooks.validOpsOverview(criticalRealtimeOverview),true,'a coherent backend critical realtime snapshot remains visible evidence instead of being rejected');
hooks.render(criticalRealtimeOverview,{state:'available',data:validTrends()},{received_at:Date.now(),identity_verification:{verified:true}});
assert.match(nodes['ob-ops-body'].innerHTML,/Realtime users[\s\S]*?Unknown[\s\S]*?UNKNOWN · realtime status critical[\s\S]*Realtime rooms[\s\S]*?Unknown/,'critical realtime presence counts are explicitly untrusted rather than displayed as authoritative zeros');

const malformedTrendPayload={...validTrends(),sessions:{...validTrends().sessions,hourly:validTrends().sessions.hourly.map((row,index)=>index===0?{...row,requested:'0'}:row)}};
fetchPlan=[response(200,{...healthyOverview,generated_at:new Date().toISOString()}),response(200,malformedTrendPayload)];
const malformedTrendRefresh=await hooks.refresh('manual');
assert.equal(malformedTrendRefresh.ok,true,'malformed optional trend telemetry does not erase a current valid overview');
assert.equal(sandbox.obGetOpsSnapshot().trends.state,'unavailable','a malformed trend contract is retained only as unavailable');
assert.match(nodes['ob-ops-body'].innerHTML,/Trend telemetry is unavailable[\s\S]*invalid, stale, incomplete, or unordered/,'malformed trends are visibly unavailable rather than rendered through numeric coercion');

const overviewThatExpiresDuringTrends={...healthyOverview,generated_at:new Date().toISOString()};
fetchPlan=[response(200,overviewThatExpiresDuringTrends),{status:200,ok:true,json:async()=>{overviewThatExpiresDuringTrends.generated_at=new Date(Date.now()-31001).toISOString();return validTrends();}}];
const expiredDuringTrendRefresh=await hooks.refresh('manual');
assert.equal(expiredDuringTrendRefresh.ok,false,'an overview that expires while trends are awaited cannot render, publish, or return success');
assert.equal(sandbox.obGetOpsSnapshot().freshness,'stale');
assert.match(expiredDuringTrendRefresh.error,/expired or became invalid/);

fetchPlan=[response(200,{...healthyOverview,generated_at:new Date().toISOString()}),response(200,validTrends())];
assert.equal((await hooks.refresh('manual')).ok,true,'a fresh overview recovers after the expiry regression');
const lastVerifiedReceivedAt=sandbox.obGetOpsSnapshot().received_at;
assert.equal(sandbox.obGetOpsSnapshot().overview_schema_valid,true);
assert(overviewFetches.slice(0,2).every(call=>call.init&&call.init.cache==='no-store'&&/[?&]_=[0-9]+/.test(call.url)),'overview and trends bypass browser caches and carry a cache-buster');

fetchPlan=[response(200,{runtime_identity:verifiedIdentity})];
const malformedOverviewRefresh=await hooks.refresh('manual');
assert.equal(malformedOverviewRefresh.ok,false,'an identity-only HTTP 200 overview fails the frontend contract');
assert.equal(malformedOverviewRefresh.stale,true);
assert.equal(sandbox.obGetOpsSnapshot().received_at,lastVerifiedReceivedAt,'a malformed identity-bearing overview cannot refresh verified freshness');
assert.equal(sandbox.obGetOpsSnapshot().freshness,'stale');

fetchPlan=[new Error('overview offline')];
const failedRefresh=await hooks.refresh('manual');
assert.equal(failedRefresh.ok,false,'a failed overview refresh returns a failure outcome');
assert.equal(failedRefresh.stale,true);
assert(nodes['ob-ops-launcher'].classList.contains('unknown'),'refresh failure downgrades the launcher to UNKNOWN');
assert.equal(nodes['ob-ops-launcher-count'].textContent,'(STALE)','refresh failure labels the launcher stale instead of leaving a prior green count');
assert.equal(nodes['ob-admin-ops-badge'].textContent,'STALE','refresh failure explicitly labels the sidebar badge stale');
assert(nodes['ob-admin-ops-nav'].classList.contains('ob-ops-nav-unknown'),'the stale sidebar badge uses a gray non-green treatment');
assert.match(nodes['ob-ops-updated'].textContent,/UNKNOWN \/ STALE[\s\S]*Last verified .*\(\d+s ago\)/,'panel metadata retains the last verified timestamp and age');
assert.match(nodes['ob-ops-body'].innerHTML,/UNKNOWN \/ STALE telemetry[\s\S]*retained historical evidence, not current health/,'the panel visibly marks retained values stale');
assert.equal(sandbox.obGetOpsSnapshot().received_at,lastVerifiedReceivedAt,'a failed refresh does not re-date the retained snapshot');
assert.equal(sandbox.obGetOpsSnapshot().freshness,'stale');
assert(exactCredentialChecks.length>0&&exactCredentialChecks.every(Boolean),'all principal-current checks require the exact credential');
sandbox.obRestoreOpsAlerts();
assert.equal(sandbox.obGetOpsSnapshot().freshness,'stale','local acknowledgement rendering cannot turn a stale snapshot green');
assert.equal(nodes['ob-ops-launcher-count'].textContent,'(STALE)');
assert.match(nodes['ob-ops-updated'].textContent,/UNKNOWN \/ STALE/);

hooks.render(healthyOverview,{state:'available',data:{}},{received_at:Date.now()-31001,identity_verification:{verified:true}});
assert.equal(hooks.staleVerifiedSnapshotIfExpired(),true,'the local watchdog revokes green state when polling cannot replace a 30-second-old verified snapshot');
assert.equal(sandbox.obGetOpsSnapshot().freshness,'stale');
assert.equal(nodes['ob-admin-ops-badge'].textContent,'STALE');
hooks.render({...healthyOverview,generated_at:new Date().toISOString()},{state:'available',data:{}},{received_at:Date.now(),identity_verification:{verified:true}});
const generatedTwentySecondsAgo=new Date(Date.now()-20000).toISOString(),receiptNow=Date.now();
assert.equal(hooks.opsOverviewFreshnessAnchor({generated_at:generatedTwentySecondsAgo},receiptNow),Date.parse(generatedTwentySecondsAgo),'snapshot freshness is anchored to the earlier server generation time, never the later browser receipt');

sandbox.__obOpsRefreshInFlight=Promise.resolve({ok:true});
sandbox.obOpenOpsDashboard();
assert.equal(backgroundNode.inert,true,'opening the modal inerts owned background siblings');
assert.equal(backgroundNode.getAttribute('data-ob-ops-inert-owned'),'1');
assert.equal(preInertNode.inert,true,'pre-existing inert state is preserved while open');
sandbox.obCloseOpsDashboard();
sandbox.__obOpsRefreshInFlight=null;
assert.equal(backgroundNode.inert,false,'closing restores the owned background sibling');
assert.equal(backgroundNode.hasAttribute('inert'),false);
assert.equal(preInertNode.inert,true,'closing does not clear pre-existing inert state');
assert.equal(preInertNode.hasAttribute('inert'),true);

assert(registeredContextAdapter&&typeof registeredContextAdapter.teardown==='function'&&typeof registeredContextAdapter.changed==='function','Ops state registers auth teardown and changed handlers');
let resolvePreviousPrincipalOverview,previousPrincipalSignal;
sandbox.fetch=async(_url,init)=>{previousPrincipalSignal=init.signal;return new Promise(resolve=>{resolvePreviousPrincipalOverview=resolve;});};
const previousPrincipalRefresh=hooks.refresh('manual');
assert(previousPrincipalSignal,'the overview request is abortable');
sandbox.__obOpsActionFeedback={text:'account-scoped action'};
sandbox.__obOpsActionCenterHtml='<section>account-scoped action</section>';
sandbox.__obOpsOwnerGuideHtml='<section>account-scoped owner guide</section>';
sandbox.__obOwnerGuideItems=[{secret:true}];sandbox.__obProblemHandoffs=[{secret:true}];
sandbox.__obOpsRefreshTimer=99;
localStorage.setItem('ob_ops_acknowledged_alerts_v2',JSON.stringify({'private-alert':acknowledgement}));
identityController.abort();contextGeneration+=1;identityController=new AbortController();
registeredContextAdapter.teardown();
assert.equal(previousPrincipalSignal.aborted,true,'auth teardown aborts an in-flight previous-principal request');
resolvePreviousPrincipalOverview(response(200,healthyOverview));
const ignoredPreviousPrincipal=await previousPrincipalRefresh;
assert.equal(ignoredPreviousPrincipal.ignored,true,'a previous-principal response is ignored even if fetch resolves after abort');
assert.equal(sandbox.obGetOpsSnapshot(),null,'auth teardown scrubs the previous snapshot');
assert.equal(sandbox.__obOpsActionFeedback,null);
assert.equal(sandbox.__obOpsActionCenterHtml,'');
assert.equal(sandbox.__obOpsOwnerGuideHtml,'');
assert.deepEqual(Array.from(sandbox.__obOwnerGuideItems),[]);
assert.deepEqual(Array.from(sandbox.__obProblemHandoffs),[]);
assert.equal(localStorage.getItem('ob_ops_acknowledged_alerts_v2'),'{}','auth teardown scrubs alert acknowledgements');
assert.equal(localStorage.getItem('ob_ops_dismissed_alerts_v1'),null,'auth teardown also removes the legacy dismissal cache');
assert.equal(sandbox.__obOpsRefreshTimer,null,'auth teardown stops polling');
assert.equal(nodes['ob-ops-panel'].getAttribute('aria-hidden'),'true','auth teardown closes the Ops modal');
assert.equal(bodyNode.classList.contains('ob-ops-modal-open'),false,'auth teardown restores body modal state');
assert.equal(backgroundNode.inert,false,'auth teardown restores owned inert background state');
assert.equal(nodes['ob-ops-launcher'].classList.contains('show'),false,'auth teardown hides and resets the launcher');
assert.equal(nodes['ob-admin-ops-nav'].hidden,true,'auth teardown hides and resets the sidebar item');
assert.match(nodes['ob-ops-body'].innerHTML,/Loading live telemetry/,'auth teardown removes account-scoped Ops HTML');

let unexpectedTargetFetches=0;
sandbox.OWNLY_API='https://untrusted-api.example.test';
sandbox.fetch=async()=>{unexpectedTargetFetches+=1;throw new Error('must not fetch');};
const wrongBaseRefresh=await hooks.refresh('manual');
assert.equal(wrongBaseRefresh.ok,false);
assert.equal(wrongBaseRefresh.identity_verification.verified,false);
assert.equal(unexpectedTargetFetches,0,'an admin bearer token is never sent when the configured Ops API base is not the exact expected staging base');
delete sandbox.OWNLY_API;
sandbox.__obOpsActionFeedback={text:'new transition cache'};
registeredContextAdapter.changed({role:'admin'});
assert.equal(sandbox.obGetOpsSnapshot(),null,'the auth changed handler also scrubs prior Ops telemetry before a new admin refresh');
assert.equal(sandbox.__obOpsActionFeedback,null,'the auth changed handler scrubs prior action feedback');

const actionSource=scriptById('ob-admin-live-ops-20260516-script');
const busyCacheButton={disabled:false,ariaBusy:'false',setAttribute(key,value){if(key==='aria-busy')this.ariaBusy=String(value);}};
const busyCacheCenter={};
Object.defineProperty(busyCacheCenter,'outerHTML',{get(){return '<section id="ob-ops-action-center"><button'+(busyCacheButton.disabled?' disabled':'')+' aria-busy="'+busyCacheButton.ariaBusy+'">Copy report</button></section>';}});
const busyCacheSandbox={window:null,Array,document:{querySelectorAll:()=>[busyCacheButton],getElementById:()=>busyCacheCenter}};busyCacheSandbox.window=busyCacheSandbox;
vm.createContext(busyCacheSandbox);new vm.Script(section(actionSource,'\t  function setOpsActionButtonsBusy(busy){','  function opsIdentityVerification(){')+'\nthis.testSetOpsActionButtonsBusy=setOpsActionButtonsBusy;').runInContext(busyCacheSandbox);
busyCacheSandbox.testSetOpsActionButtonsBusy(true);
assert.match(busyCacheSandbox.__obOpsActionCenterHtml,/disabled[\s\S]*aria-busy="true"/,'the cached action center records the in-flight state');
busyCacheSandbox.testSetOpsActionButtonsBusy(false);
assert.doesNotMatch(busyCacheSandbox.__obOpsActionCenterHtml,/disabled|aria-busy="true"/,'the cached action-center HTML is re-enabled before the next telemetry render');
const copyTextSource=section(actionSource,'  async function copyText(text){','  function actionResult(text,state,meta){');
let fallbackAreaRemoved=false;
const fallbackCopySandbox={window:null,navigator:{},Error,document:{body:{appendChild(){}},createElement:()=>({value:'',select(){},remove(){fallbackAreaRemoved=true;}}),execCommand:()=>false}};fallbackCopySandbox.window=fallbackCopySandbox;
vm.createContext(fallbackCopySandbox);new vm.Script(copyTextSource+'\nthis.testCopyText=copyText;').runInContext(fallbackCopySandbox);
await assert.rejects(()=>fallbackCopySandbox.testCopyText('report'),/did not confirm the clipboard write/,'a false legacy clipboard result cannot produce success');
assert.equal(fallbackAreaRemoved,true,'the legacy clipboard textarea is removed after a false result');
fallbackAreaRemoved=false;fallbackCopySandbox.document.execCommand=()=>{throw new Error('legacy clipboard denied');};
await assert.rejects(()=>fallbackCopySandbox.testCopyText('report'),/legacy clipboard denied/);
assert.equal(fallbackAreaRemoved,true,'the legacy clipboard textarea is removed even when copy throws');
new vm.Script(actionSource,{filename:'ob-admin-live-ops.js'});
const actionIdentitySource=section(actionSource,"  var EXPECTED_OPS_API_BASE='https://victorious-wisdom-production-a6b0.up.railway.app';",'  function opsContractError(message,envelope){');
const actionNow=Date.now();
const verifiedActionSnapshot=()=>({data:{generated_at:new Date(actionNow).toISOString(),runtime_identity:verifiedIdentity,payment_runtime:{available:true,status:'ok',active_stripe_mode:'test',active_configuration_ready:true,platform_webhook_configuration_ready:true,connect_webhook_configuration_ready:true,webhook_configuration_ready:true,configured_mode:'test'}},overview_schema_valid:true,received_at:actionNow,last_verified_at:actionNow,freshness_anchor_at:actionNow,identity_verification:{verified:true},freshness:'current',stale:false});
let actionSnapshot=verifiedActionSnapshot(),actionIdentityFeedback=null,actionBase='https://victorious-wisdom-production-a6b0.up.railway.app';
const actionIdentityDocument={hidden:false};
const actionIdentitySandbox={Object,String,Array,Number,Date,AbortController,document:actionIdentityDocument,window:null,base:()=>actionBase,role:()=> 'admin',token:()=> 'admin-token',actionResult:(...args)=>{actionIdentityFeedback=args;}};
actionIdentitySandbox.window=actionIdentitySandbox;
actionIdentitySandbox.obGetOpsSnapshot=()=>actionSnapshot;
vm.createContext(actionIdentitySandbox);
new vm.Script(actionIdentitySource+'\nthis.opsEnvironment=opsEnvironment;this.requireVerifiedMutationTarget=requireVerifiedMutationTarget;').runInContext(actionIdentitySandbox);
assert.equal(actionIdentitySandbox.opsEnvironment(),'staging','action controls label staging only after the exact runtime identity matches');
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),true);
actionSnapshot={...verifiedActionSnapshot(),data:{...verifiedActionSnapshot().data,runtime_identity:{...verifiedIdentity,runtime_classification:'production'}}};
assert.equal(actionIdentitySandbox.opsEnvironment(),'unknown','exact provider IDs do not override a contradictory normalized runtime classification');
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'a non-staging normalized runtime cannot authorize mutation');
actionSnapshot={...verifiedActionSnapshot(),data:{...verifiedActionSnapshot().data,payment_runtime:{available:true,status:'ok',active_stripe_mode:'live',active_configuration_ready:true,configured_mode:'live'}}};
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'authoritative Stripe LIVE mode blocks every mutation even on the exact staging deployment');
assert.match(actionIdentityFeedback[0],/UNSAFE PAYMENT MODE[\s\S]*Stripe TEST mode/);
actionSnapshot={...verifiedActionSnapshot(),data:{...verifiedActionSnapshot().data,payment_runtime:{available:false,status:'unavailable',active_stripe_mode:null,active_configuration_ready:false,configured_mode:null}}};
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'unavailable payment authority fails closed even when a test-looking mode is present');
actionSnapshot={...verifiedActionSnapshot(),data:{...verifiedActionSnapshot().data,payment_runtime:{available:true,status:'warning',active_stripe_mode:'unknown',active_configuration_ready:false,configured_mode:null}}};
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'an unknown Stripe mode fails closed');
actionSnapshot={...verifiedActionSnapshot(),data:{...verifiedActionSnapshot().data,payment_runtime:{available:true,status:'ok',active_stripe_mode:'test',active_configuration_ready:false,configured_mode:'test'}}};
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'a test-looking Stripe mode cannot authorize mutation without active configuration readiness');
actionSnapshot={...verifiedActionSnapshot(),data:{...verifiedActionSnapshot().data,payment_runtime:{...verifiedActionSnapshot().data.payment_runtime,connect_webhook_configuration_ready:false,webhook_configuration_ready:false,status:'critical',last_error_code:'stripe_connect_webhook_configuration_unavailable'}}};
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'a test-mode runtime cannot authorize mutation without distinct Stripe Connect webhook signing readiness');
assert.equal(actionIdentityFeedback[2].connect_webhook_configuration_ready,false,'blocked mutation diagnostics preserve the separate Connect-signing readiness fact');
actionSnapshot={...verifiedActionSnapshot(),data:{...verifiedActionSnapshot().data,generated_at:new Date(actionNow-30001).toISOString()}};
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'fresh browser receipt times cannot authorize an old server-generated overview');
actionSnapshot={...verifiedActionSnapshot(),data:{runtime_identity:{...verifiedIdentity,environment:'staging',environment_id:'wrong-environment'}},identity_verification:{verified:false}};
assert.equal(actionIdentitySandbox.opsEnvironment(),'unknown','a friendly staging display name cannot override a wrong Railway environment ID');
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'mutations are blocked for an unverified runtime identity');
assert.match(actionIdentityFeedback[0],/Mutation blocked[\s\S]*UNKNOWN \/ UNVERIFIED/);
actionBase='https://untrusted-api.example.test';actionSnapshot=verifiedActionSnapshot();
assert.equal(actionIdentitySandbox.opsEnvironment(),'unknown','a runtime identity cannot verify an unexpected API base');
actionBase='https://victorious-wisdom-production-a6b0.up.railway.app';
actionSnapshot={...verifiedActionSnapshot(),received_at:actionNow-30001,last_verified_at:actionNow-30001};
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'freshness strings cannot authorize a snapshot older than the documented 30-second wall-clock TTL');
assert.match(actionIdentityFeedback[0],/no older than 30 seconds[\s\S]*Refresh Ops Monitor/);
actionSnapshot={...verifiedActionSnapshot(),last_verified_at:actionNow-1};
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'a received snapshot without matching successful-verification provenance is rejected');
actionSnapshot={...verifiedActionSnapshot()};delete actionSnapshot.overview_schema_valid;
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'identity and timestamps cannot authorize a snapshot without explicit overview-schema validity');
actionSnapshot=verifiedActionSnapshot();actionIdentityDocument.hidden=true;
assert.equal(actionIdentitySandbox.requireVerifiedMutationTarget(),false,'mutations fail closed while visibility suspension has stopped polling');
actionIdentityDocument.hidden=false;
const actionRequestSource=section(actionSource,"  var EXPECTED_OPS_API_BASE='https://victorious-wisdom-production-a6b0.up.railway.app';",'  function refreshAfterAction(){');
let actionCredentialGeneration=1,actionIdentityController=new AbortController(),resolveStaleAction,actionRequestSignal;
const actionExactCredentialChecks=[];
const actionRequestSandbox={Object,String,Array,AbortController,Error,Number,Date,JSON,Promise,document:{hidden:false},window:null,base:()=> 'https://victorious-wisdom-production-a6b0.up.railway.app',role:()=> 'admin',token:()=> 'admin-token',actionResult:()=>{},fetch:async(_url,init)=>{actionRequestSignal=init.signal;return new Promise(resolve=>{resolveStaleAction=resolve;});}};
actionRequestSandbox.window=actionRequestSandbox;
actionRequestSandbox.obGetOpsSnapshot=verifiedActionSnapshot;
actionRequestSandbox.OB_CLIENT_CONTEXT={
  capture:scope=>Object.freeze({scope,token:'admin-token',principal:'admin:1',role:'admin',identityGeneration:actionCredentialGeneration,credentialGeneration:actionCredentialGeneration,signal:actionIdentityController.signal}),
  isCurrent:(context,options)=>{actionExactCredentialChecks.push(options&&options.exactCredential===true);return !context.signal.aborted&&context.credentialGeneration===actionCredentialGeneration;},
};
vm.createContext(actionRequestSandbox);
new vm.Script(actionRequestSource+'\nthis.testOpsApi=opsApi;').runInContext(actionRequestSandbox);
const staleActionPromise=actionRequestSandbox.testOpsApi('/admin/observability/cache/clear',{dry_run:true});
assert(actionRequestSignal,'mutating Ops requests are abortable');
actionIdentityController.abort();actionCredentialGeneration+=1;actionIdentityController=new AbortController();
assert.equal(actionRequestSignal.aborted,true,'an identity transition aborts a pending mutating Ops request');
resolveStaleAction(response(200,{success:true,dry_run:true,required_confirm:'SERVER_TOKEN'}));
let staleActionError=null;try{await staleActionPromise;}catch(error){staleActionError=error;}
assert.equal(staleActionError&&staleActionError.code,'ops_principal_changed','a response for an old action principal is ignored');
assert(actionExactCredentialChecks.length>0&&actionExactCredentialChecks.every(Boolean),'action request checks use exactCredential=true');
let fireActionTimeout=null,clearedActionTimeout=null;
const timeoutRequestSandbox={Object,String,Array,AbortController,Error,Number,Date,JSON,Promise,document:{hidden:false,querySelectorAll:()=>[]},window:null,base:()=> 'https://victorious-wisdom-production-a6b0.up.railway.app',role:()=> 'admin',token:()=> 'admin-token',actionResult:()=>{},setTimeout:callback=>{fireActionTimeout=callback;return 77;},clearTimeout:id=>{clearedActionTimeout=id;},fetch:async(_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>{const error=new Error('aborted');error.name='AbortError';reject(error);},{once:true}))};
timeoutRequestSandbox.window=timeoutRequestSandbox;
vm.createContext(timeoutRequestSandbox);
new vm.Script(actionRequestSource+'\nthis.testOpsApi=opsApi;this.testActionControllers=opsActionControllers;').runInContext(timeoutRequestSandbox);
const timedActionPromise=timeoutRequestSandbox.testOpsApi('/admin/observability/cache/clear',{dry_run:true});
await Promise.resolve();
assert.equal(typeof fireActionTimeout,'function','every Ops action request installs a bounded timeout');
fireActionTimeout();
let timedActionError=null;try{await timedActionPromise;}catch(error){timedActionError=error;}
assert.equal(timedActionError&&timedActionError.code,'ops_action_timeout');
assert.match(timedActionError.message,/timed out after 15 seconds[\s\S]*no successful completion/,'timeouts are distinct from ordinary failures and never imply completion');
assert.equal(clearedActionTimeout,77,'the action timeout timer is always cleaned up');
assert.equal(timeoutRequestSandbox.testActionControllers.length,0,'a timed-out action releases its AbortController');
const helperSource=section(actionSource,'  function opsContractError(message,envelope){','  function refreshAfterAction(){');
let appliedFeedback=null;
const actionSandbox={Error,Object,Array,String,Number,Date,JSON,Promise,EXPECTED_OPS_API_BASE:'https://victorious-wisdom-production-a6b0.up.railway.app',EXPECTED_OPS_SERVICE_ID:verifiedIdentity.service_id,EXPECTED_OPS_ENVIRONMENT_ID:verifiedIdentity.environment_id,fetch:async()=>{},base:()=>'',token:()=>'',actionResult:(...args)=>{appliedFeedback=args;},obValidOpsEventHistoryEnvelope:()=>true,obValidOpsOverviewEventHistory:()=>true};
vm.createContext(actionSandbox);
new vm.Script(helperSource+'\nthis.requirePreview=requirePreview;this.requireCandidateFingerprint=requireCandidateFingerprint;this.isCandidateFingerprintMismatch=isCandidateFingerprintMismatch;this.requiredCount=requiredCount;this.classifyOpsResponse=classifyOpsResponse;this.applyOpsOutcome=applyOpsOutcome;this.safeOpsTimestamp=safeOpsTimestamp;this.safeNormalizedOpsReportSections=safeNormalizedOpsReportSections;this.safeOpsReportSections=safeOpsReportSections;').runInContext(actionSandbox);
const normalizedTimestamp='2026-09-01T08:09:10.000Z',normalizedTimestampMs=Date.parse(normalizedTimestamp);
assert.equal(actionSandbox.safeOpsTimestamp(normalizedTimestampMs),normalizedTimestamp,'millisecond epoch timestamps normalize to explicit UTC ISO');
assert.equal(actionSandbox.safeOpsTimestamp(normalizedTimestampMs/1000),normalizedTimestamp,'second epoch timestamps normalize to explicit UTC ISO');
assert.equal(actionSandbox.safeOpsTimestamp('2026-09-01T11:09:10+03:00'),normalizedTimestamp,'offset timestamps normalize to explicit UTC ISO');
assert.equal(actionSandbox.safeOpsTimestamp('not-a-timestamp'),null,'invalid timestamps fail closed instead of leaking ambiguous values');
assert.equal(actionSandbox.safeOpsTimestamp(0),null,'zero is not treated as verified timestamp evidence');
assert.equal(actionSandbox.requirePreview({status:200,body:{success:true,dry_run:true,required_confirm:'SERVER_TOKEN'}},'SERVER_TOKEN','Cache').requiredConfirm,'SERVER_TOKEN');
assert.equal(actionSandbox.requirePreview({status:200,body:{success:true,result:{dry_run:true,required_confirm:'SERVER_TOKEN'}}},'SERVER_TOKEN','Cache').requiredConfirm,'SERVER_TOKEN');
assert.throws(()=>actionSandbox.requirePreview({status:200,body:{success:true,dry_run:true,result:{dry_run:false},required_confirm:'SERVER_TOKEN'}},'SERVER_TOKEN','Cache'),/coherent dry_run=true/,'nested dry_run=false overrides a contradictory top-level preview claim');
assert.throws(()=>actionSandbox.requirePreview({status:200,body:{success:true,dry_run:false,result:{dry_run:true},required_confirm:'SERVER_TOKEN'}},'SERVER_TOKEN','Cache'),/coherent dry_run=true/,'top-level dry_run=false cannot be rescued by a nested preview claim');
assert.throws(()=>actionSandbox.requirePreview({status:200,body:{success:true,dry_run:true}},null,'Cache'),/server-owned required_confirm/);
assert.throws(()=>actionSandbox.requirePreview({status:200,body:{success:true,dry_run:true}},' SERVER_TOKEN ','Cache'),/valid exact server-owned required_confirm/);
assert.equal(actionSandbox.requireCandidateFingerprint('a'.repeat(64),'Cache',{}),'a'.repeat(64));
assert.throws(()=>actionSandbox.requireCandidateFingerprint('A'.repeat(64),'Cache',{}),/valid exact candidate_fingerprint/,'opaque fingerprints are rejected rather than normalized');
assert.throws(()=>actionSandbox.requireCandidateFingerprint('a'.repeat(63),'Cache',{}),/valid exact candidate_fingerprint/);
assert.equal(actionSandbox.isCandidateFingerprintMismatch({status:409,code:'pending_session_candidates_changed'}),true);
assert.equal(actionSandbox.isCandidateFingerprintMismatch({status:400,code:'pending_session_candidate_fingerprint_required'}),false);
assert.equal(actionSandbox.requiredCount(2,'Pending',{}),2,'a real safe-integer preview count is accepted');
assert.throws(()=>actionSandbox.requiredCount('2','Pending',{}),/safe-integer candidate count/,'numeric strings cannot authorize a mutation');
assert.throws(()=>actionSandbox.requiredCount(true,'Pending',{}),/safe-integer candidate count/,'booleans cannot authorize a mutation');
assert.throws(()=>actionSandbox.requiredCount(1.5,'Pending',{}),/safe-integer candidate count/,'fractional counts cannot authorize a mutation');
assert.throws(()=>actionSandbox.requiredCount(Number.MAX_SAFE_INTEGER+1,'Pending',{}),/safe-integer candidate count/,'unsafe integers cannot authorize a mutation');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true}}).kind,'completed_contract_unverified');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true}}).state,'warning','HTTP 200 without audit_recorded=true is not green');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,audit_recorded:true}}).kind,'completed_contract_unverified','HTTP 200 with a started audit but no explicit completion audit remains a warning');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,action_executed:false,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-1',audit_event_id:'audit-1',result:{dry_run:false,processed:1}}}).state,'warning','a contradictory action_executed=false response is never green');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-1',audit_event_id:'audit-1'}}).state,'warning','a completed response requires a result object');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-1',audit_event_id:'audit-1',result:{dry_run:true,checked:1}}}).state,'warning','a dry-run result cannot be classified as completed');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-1',audit_event_id:'audit-1',result:{dry_run:false}}}).state,'warning','a protocol-only result object is not complete enough to be green');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,error:'settlement failed',action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-1',audit_event_id:'audit-1',result:{dry_run:false,processed:1}}}).state,'warning','top-level failure evidence cannot be painted green');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,settlement_pending:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-1',audit_event_id:'audit-1',result:{dry_run:false,processed:1}}}).state,'warning','pending financial work cannot be painted green');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-1',audit_event_id:'audit-1',result:{dry_run:false,success:false,processed:1}}}).state,'warning','nested success=false cannot be painted green');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-1',audit_event_id:'audit-1',result:{dry_run:false,processed:1,failed:1}}}).state,'warning','a positive nested failure count cannot be painted green');
const completedEnvelope=result=>({status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-strict',audit_event_id:'audit-strict',result}});
for(const [field,value] of [['failure',0],['success','true'],['pending','false'],['error',false],['failures',{}],['failed','0']]){
  assert.equal(actionSandbox.classifyOpsResponse(completedEnvelope({dry_run:false,processed:1,[field]:value})).state,'warning','wrong-typed '+field+' evidence cannot be painted green');
}
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,dry_run:false,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-cache',audit_event_id:'audit-cache',result:{cleared:1}}}).kind,'completed','cache clear accepts the exact backend top-level dry_run=false completion contract');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,dry_run:false,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-cache',audit_event_id:'audit-cache',result:{dry_run:true,cleared:1}}}).state,'warning','a contradictory nested dry-run claim cannot be painted green');
assert.equal(actionSandbox.classifyOpsResponse(completedEnvelope({dry_run:false,already_terminal:2})).kind,'completed','bulk stop-all accepts a positive safe-integer already_terminal audited no-op');
assert.equal(actionSandbox.classifyOpsResponse(completedEnvelope({dry_run:false,already_terminal:'2'})).state,'warning','numeric-looking already_terminal strings are rejected');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-1',audit_event_id:'different-audit',result:{dry_run:false,processed:1}}}).state,'warning','contradictory audit identities cannot be classified as completed');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-1',audit_event_id:'audit-1',result:{dry_run:false,processed:1}}}).kind,'completed','a complete current backend success contract remains green');
assert.equal(actionSandbox.classifyOpsResponse({status:200,body:{success:false,error:'failed'}}).kind,'failed');
assert.equal(actionSandbox.classifyOpsResponse({status:202,body:{success:false,accepted:true}}).kind,'pending');
assert.equal(actionSandbox.classifyOpsResponse({status:207,body:{success:false,partial_success:true}}).kind,'partial');
assert.equal(actionSandbox.classifyOpsResponse({status:207,body:{success:false,partial_success:false}}).kind,'failed','HTTP 207 requires partial_success=true');
assert.equal(actionSandbox.classifyOpsResponse({status:207,body:{success:false}}).state,'error','ambiguous HTTP 207 is an error');
assert.equal(actionSandbox.classifyOpsResponse({status:202,body:{accepted:true}}).kind,'contract_error');
actionSandbox.applyOpsOutcome('Emergency stop',{status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-apply',audit_event_id:'audit-apply',billing_stopped:true,settlement_pending:false,result:{dry_run:false,stopped:1}}});
assert.match(appliedFeedback[0],/Full server response:[\s\S]*"audit_recorded": true[\s\S]*"audit_completion_recorded": true[\s\S]*"billing_stopped": true[\s\S]*"settlement_pending": false[\s\S]*"result"/,'action feedback preserves top-level audit-start, audit-completion, billing, settlement, and result fields');

const reportSections=actionSandbox.safeNormalizedOpsReportSections({
  runtime_identity:{...verifiedIdentity,provider_environment_name:'production',node_environment:'production',classification_basis:'is_staging_flag',git_commit_sha:'abcdef1234567890',process_started_at:'2026-09-01T07:00:00Z',secret:'LEAK-ME'},
  provenance:{media_sfu:{status:'collected',source:'strict_sfu_settings_and_media_health',scope:'media_service',coverage:{pct:100,complete:true,truncated:false},stale:false,cached:false,age_basis:'collected_at',raw_health:'LEAK-ME'}},
  media_sfu:{available:true,status:'ok',candidate_policy:'udp-preferred',deployment_mode:'direct-ice',udp_ready:true,measurement_available:true,rooms:1,counters:{rooms_created_total:8},timings:{join:{p95_ms:24}},latest_client_timing:{marks_count:3,total_ms:180},health:{authorization:'Bearer LEAK-ME'},raw_health:{secret:'LEAK-ME'},url:'https://user:password@example.test'},
  security:{available:true,status:'ok',level:'medium',turnstile_enabled:true,readiness:{rate_limits:'active'},api_key:'LEAK-ME',profiles:{token:'LEAK-ME'}},
  reply_assistant:{available:true,status:'ok',pending_jobs:0,dead_jobs:0,authority:{ready:true,secret_configuration_ready:true},credential:'LEAK-ME'},
  system:{available:true,status:'ok',pid:42,memory:{rss_mb:128},cpu:{cores:2},event_loop:{p95_ms:3},environment_secret:'LEAK-ME'},
});
const serializedReportSections=JSON.stringify(reportSections);
assert.equal(reportSections.media_sfu.candidate_policy,'udp-preferred','the exact bounded media candidate policy survives report projection');
assert.equal(reportSections.media_sfu.deployment_mode,'direct-ice','the exact bounded media deployment mode survives report projection');
assert.equal(reportSections.media_sfu.timings.join.p95_ms,24);
assert.equal(reportSections.media_sfu.latest_client_timing.total_ms,180);
assert.equal(reportSections.security.readiness.rate_limits,'active','the exact bounded security readiness state survives projection');
assert.equal(reportSections.reply_assistant.pending_jobs,0,'known zero reply-assistant backlog is preserved');
assert.equal(reportSections.system.event_loop.p95_ms,3);
assert.equal(reportSections.runtime_identity.runtime_classification,'staging');
assert.equal(reportSections.runtime_identity.deployment_id,'deploy-1');
assert.equal(reportSections.runtime_identity.replica_id,'replica-1');
assert.equal(reportSections.runtime_identity.git_commit_sha,'abcdef1234567890');
assert.equal(reportSections.provenance.media_sfu.coverage.complete,true);
assert.equal(reportSections.provenance.media_sfu.stale,false);
assert.equal(reportSections.provenance.media_sfu.cached,false);
assert.equal(reportSections.provenance.media_sfu.source,'strict_sfu_settings_and_media_health');
assert.equal(reportSections.provenance.media_sfu.scope,'media_service');
assert.equal(reportSections.provenance.media_sfu.age_basis,'collected_at','bounded backend provenance semantics survive the report projection');
assert.doesNotMatch(serializedReportSections,/LEAK-ME|raw_health|"health"|"url"|api_key|credential|profiles/,'developer-report projectors omit secrets, raw upstream health, URLs, and unknown nested fields');

const fullSafeReport=actionSandbox.safeOpsReportSections({
  generated_at:'2026-09-01T08:00:00Z',
  summary:{snapshot_source:'backend_private_observability',primary_window:'live_trailing_15m_and_trailing_24h',runtime_environment:'production',runtime_classification:'staging',runtime_deployment_id:'deploy-1',active_alerts:1,critical_alerts:0,warning_alerts:1,api_window_sec:900,api_observed_window_sec:900,api_window_coverage_complete:true,api_window_request_count:4,api_p95_ms:240,api_error_rate_pct:25,api_429_count:0,payment_operations_status:'warning',payment_operations_coverage_complete:true,payment_authorization_manual_review_jobs:0,payment_outstanding_sessions:0,payment_outstanding_amount:0,pending_refund_requests:0,failed_refund_requests:0,stripe_webhook_configuration_ready:true,security_level:'heavy',background_task_status:'ready',background_task_health:'degraded',background_task_health_code:'background_task_dropped_work',stripe_mode:'test',secret:'LEAK-ME'},
  alerts:[{key:'broken_upload_assets',severity:'warning',event:'reconfirmed',source:'assets',previous_severity:'warning',evidence_status:'unknown',title:'sk_live_51PRIVATEVALUE portrait-private.pdf alice+quoted@example.test',detail:'Bearer ghp_supersecret /private/app/.env',at:'2026-09-01T08:00:00Z',meta:{missing_count:1,window_coverage_complete:true,owner:'"Álice" <alice@example.test>',name:'portrait-private.pdf',slug:'alice',asset_id:'asset-uuid-secret',token:'whsec_LEAK-ME',provider:'sk_live_51PRIVATEVALUE'},action_guide:{impact:'Image unavailable sk_live_51PRIVATEVALUE',cause:'token=ghp_supersecret',owner_action:'Inspect /Users/admin/private/.env',future_secret:'whsec_LEAK-ME'}}],
  alert_events:[{key:'broken_upload_assets',severity:'info',event:'resolved',source:'assets',previous_severity:'warning',title:'Asset event',detail:'/tmp/private.png',at:'2026-09-01T08:00:00Z',meta:{missing_count:0,owner:'alice',slug:'alice',token:'LEAK-ME'}}],
  alert_event_history:{scope:'backend_replica',storage:'process_memory',retention_limit:120,returned_limit:30,retained_event_count:1,returned_event_count:1,dropped_event_count:0,retention_complete_for_observed_samples:true,sampling_trigger:'overview_request',sampling_continuous:false,sampling_gap_possible:true,sample_count:1,first_sampled_at:'2026-09-01T08:00:00Z',last_sampled_at:'2026-09-01T08:00:00Z',process_started_at:'2026-09-01T07:00:00Z',deployment_id:'deploy-1',replica_id:'replica-1'},
  http:{available:true,status:'ok',uptime_sec:900,measurement_available:true,active_requests:1,total_requests:4,total_errors:1,total_client_errors:0,total_rate_limited:0,rate_window_sec:900,observed_window_sec:900,window_coverage_complete:true,rate_window_started_at:'2026-09-01T07:45:01.000Z',observed_started_at:'2026-09-01T07:45:01.000Z',rate_window_ended_at:'2026-09-01T08:00:00.500Z',rate_window_request_count:4,rate_window_error_count:1,rate_window_client_error_count:0,rate_window_rate_limited_count:0,rate_window_status_counts:{'2xx':3,'3xx':0,'4xx':0,'5xx':1,other:0},error_rate_pct:25,client_error_rate_pct:0,rate_limited_rate_pct:0,avg_ms:120,p95_ms:240,max_ms:250,latency_sample_count:4,latency_sample_limit:400,latency_samples_truncated:false,latency_sampling:'latest_requests_within_rate_window',last_request_at:'2026-09-01T08:00:00Z',status_counts:{'2xx':3,'3xx':0,'4xx':0,'5xx':1,other:0},recent_problem_window_sec:900,problem_window_count:1,problem_sample_limit:80,returned_problem_limit:25,returned_problem_count:2,problem_samples_truncated:false,hottest_routes_window_sec:900,route_detail_limit:80,returned_route_limit:25,tracked_route_count:2,returned_route_count:2,route_details_truncated:false,hottest_routes:[{route:'GET /api/admin/observability/overview',count:4,errors:1,avg_ms:120,p95_ms:240,max_ms:250,last_status_code:200,last_duration_ms:120,last_request_at:'2026-09-01T08:00:00Z',latency_sample_count:4,latency_sample_limit:120,latency_samples_truncated:false,status_counts:{'2xx':3,'3xx':0,'4xx':0,'5xx':1,other:0},token:'ghp_supersecret'},{route:'GET /api/private?token=LEAK-ME',count:1,p95_ms:5}],recent_problem_requests:[{route:'POST /api/sessions/:id/stop',status_code:500,duration_ms:240,at:'2026-09-01T08:00:00Z'},{route:'GET /api/private#secret',status_code:500,duration_ms:1,at:'2026-09-01T08:00:00Z'}],secret:'LEAK-ME'},
  business:{available:true,status:'ok',sessions:{active_sessions:3,pending_sessions:1,ended_24h:7,session_id:'asset-uuid-secret'},channels:{chat:{pending:1,active:2,waiting_to_start:0,ended_24h:3,paid_24h:2,revenue_24h:12}},bookings:{bookings_24h:4},users:{clients_total:4,email:'alice@example.test'},payments:{ended_sessions_24h:7,paid_sessions_24h:5,gross_charged_24h:42,net_card_charged_24h:35,credential:'LEAK-ME'},secret:'LEAK-ME'},
  payment_operations:{...payoutFailurePaymentOperations,webhook:{...payoutFailureWebhook,provider_secret:'whsec_LEAK-ME',recent_financial_events_24h:{...payoutFailureWebhook.recent_financial_events_24h,connected_account:'acct_secret'}},private_session_ids:['secret-session'],secret:'LEAK-ME'},
  database:{available:true,status:'ok',primary:{label:'postgres_primary',ok:true,status:'ok',duration_ms:3,value:true,error:null,last_error_code:null},sqlite:{label:'sqlite_fallback',ok:true,status:'ok',duration_ms:1,value:true,error:null,last_error_code:null},postgres_shadow:{enabled:true,status:'ready',ready:true,last_error_present:false,last_error_code:null,last_bootstrap_at:1756710000,last_sync_at:1756710100,tracked_table_count:12}},
  realtime:{available:true,status:'ok',scope:'presence_cluster',connected_users:2,websocket:{driver:'memory',total_sockets:3,connected_users:1,active_rooms:1,cluster:{cluster_total_sockets:3,cluster_connected_users:2,status:'ready',token:'LEAK-ME'},runtime:{disconnect_timers:1,internal_path:'/var/run/socket'},metrics:{handler_error_total:2,media_reconnect_grace_total:3,participant_rejoined_total:4,secret:'LEAK-ME'},alert_window:{window_sec:900,observed_window_sec:900,window_coverage_complete:true,window_started_at:'2026-09-01T07:45:01.000Z',observed_started_at:'2026-09-01T07:45:01.000Z',window_ended_at:'2026-09-01T08:00:00.500Z',handler_error_count:1,participant_disconnect_timeout_count:0,rtc_quality_poor_count:0,rtc_quality_weak_count:0}},secret:'LEAK-ME'},
  assets:{available:true,status:'warning',checked:9,missing_count:1,coverage_pct:90,field_coverage:{schema:'known_website_image_fields_v2',fields_examined:18,ai_pages_scanned:2,complete:true,truncated:false},examples:[{owner:'alice',name:'portrait.jpg',slug:'alice',id:'asset-uuid-secret',path:'/private/uploads/portrait.jpg',url:'https://example.test/private'}],secret:'LEAK-ME'},
  cache:{available:true,status:'ok',size:8,revision:12,hits:10,keys:['secret-cache-key'],secret:'LEAK-ME'},
  storage:{database:{available:true,status:'ok',driver:'postgres-primary-hybrid',fallback_driver:'sqlite-better-sqlite3',postgres_primary_mode:true,sqlite_authority_guard:true,connection_string:'postgres://secret'},assets:{available:true,status:'ok',driver:'local-filesystem',exists:true,writable:true,durable:true,path:'/private/uploads',owner:'alice',secret:'LEAK-ME'},secret:'LEAK-ME'},
  background_tasks:{available:true,depths_available:true,driver:'redis',status:'ready',health:'degraded',health_code:'background_task_dropped_work',required:true,queue_depth:2,processing_depth:1,dead_depth:0,dropped:1,workers:2,ready_workers:2,producer_ready:true,inspector_ready:true,last_error_code:null,jobs:[{id:'secret-job'}],secret:'LEAK-ME'},
  live_capacity:{available:true,status:'ok',authority:'private_rollout_control',mode:'enforce',scope:'fleet',human_ceiling:5,ai_ceiling:50,revision:3,enforcement_epoch:1,activated_at:1756710000,effective_mode:'enforce',effective_scope:'fleet',effective_human_ceiling:5,effective_ai_ceiling:50,admission_enforced:true,admission_paused:false,stripe_order_guaranteed:true,reason_present:true,updated_at:1756710200,updated_by:'admin-secret',reason:'"Álice" <alice@example.test> changed /private/.env',secret:'LEAK-ME'},
  payment_runtime:{available:true,status:'ok',active_stripe_mode:'test',active_configuration_ready:true,webhook_configuration_ready:true,configured_mode:'test',stripe_key:'LEAK-ME'},
  thresholds:{http_p95_warning_ms:900,http_p95_critical_ms:2500,broken_asset_warning_count:1,broken_asset_critical_count:10},
  runtime_identity:{...verifiedIdentity,classification_basis:'is_staging_flag',git_commit_sha:'abcdef1234567890',process_started_at:'2026-09-01T07:00:00Z',secret:'LEAK-ME'},provenance:{http:{status:'collected',source:'backend_http_metrics',authority:'current_process',scope:'backend_replica',window:'trailing_15m_rates_and_latency_plus_process_lifetime_totals',cache_semantics:'uncached_process_snapshot',freshness_semantics:'collected_on_overview_request',coverage:{scope:'current_backend_process',rate_window_sec:900,observed_window_sec:900,window_coverage_complete:true,latency_sample_count:4,latency_sample_limit:400,latency_samples_truncated:false,route_detail_limit:80,route_details_truncated:false,problem_samples_truncated:false},secret:'LEAK-ME'}},
  media_sfu:{available:true,status:'ok',rooms:2,health:{token:'LEAK-ME'}},security:{available:true,status:'ok',level:'heavy',email_verification_mode:'progressive',email_provider:'resend',turnstile_actions:['login','session_request'],readiness:{rate_limits:'active'},api_key:'LEAK-ME'},reply_assistant:{available:true,status:'warning',pending_jobs:0,reason_codes:['due_backlog_warning'],credential:'LEAK-ME'},system:{available:true,status:'ok',env:'production',node_version:'v24.1.0',memory:{rss_mb:128,heap_metric_basis:'v8.used_heap_size / v8.heap_size_limit',path:'/private/memory'},secret:'LEAK-ME'},
},{state:'available',data:{generated_at:'2026-09-01T08:00:00Z',semantics:{timezone:'UTC',session_bucket_basis:'session_created_at',hourly_values:'current_state_of_sessions_requested_in_bucket',daily_money_basis:'current_financial_state_of_sessions_requested_on_day',historical_buckets_mutable:true,user_bucket_basis:'user_created_at'},sessions:{hourly:[{bucket:'2026-09-01T08:00:00.000Z',bucket_epoch:1788249600,requested:3,secret:'LEAK-ME'}],daily:[{day:'2026-09-01',revenue:42,secret:'LEAK-ME'}]},users:{daily:[{day:'2026-09-01',total:5,email:'alice@example.test'}]},live:[{at:'2026-09-01T08:00:00Z',api_p95_ms:240,api_window_sec:900,api_observed_window_sec:900,api_window_coverage_complete:true,api_window_request_count:4,realtime_available:false,realtime_status:'unavailable',realtime_last_error_code:'ECONNRESET',connected_users:null,secret:'LEAK-ME'}],secret:'LEAK-ME'}},{generated_at:'2026-09-01T08:00:00Z',scope:'backend_replica',storage:'process_memory',retention_limit:120,returned_limit:120,retained_event_count:1,returned_event_count:1,dropped_event_count:0,retention_complete_for_observed_samples:true,sampling_trigger:'overview_request',sampling_continuous:false,sampling_gap_possible:true,sample_count:1,first_sampled_at:'2026-09-01T08:00:00Z',last_sampled_at:'2026-09-01T08:00:00Z',process_started_at:'2026-09-01T07:00:00Z',deployment_id:'deploy-1',replica_id:'replica-1',events:[{key:'broken_upload_assets',severity:'info',event:'resolved',source:'assets',previous_severity:'warning',title:'Asset event',detail:'/tmp/private.png',at:'2026-09-01T08:00:00Z',meta:{missing_count:0,owner:'alice',slug:'alice',token:'LEAK-ME'}}],secret:'LEAK-ME'});
const serializedFullSafeReport=JSON.stringify(fullSafeReport);
assert.equal(fullSafeReport.summary.api_p95_ms,240,'useful summary diagnostics survive the report projection');
assert.equal(fullSafeReport.summary.api_observed_window_sec,900);
assert.equal(fullSafeReport.summary.api_window_coverage_complete,true,'summary preserves whether the API alert window has complete 15-minute coverage');
assert.equal(fullSafeReport.http.observed_started_at,'2026-09-01T07:45:01.000Z');
assert.equal(fullSafeReport.http.latency_samples_truncated,false);
assert.equal(fullSafeReport.http.returned_route_limit,25);
assert.equal(fullSafeReport.http.returned_problem_count,2,'bounded HTTP evidence counts survive projection');
assert.equal(fullSafeReport.http.hottest_routes[0].route,'GET /api/admin/observability/overview','safe method/path route evidence survives without query strings');
assert.equal(fullSafeReport.http.hottest_routes[0].status_counts['5xx'],1);
assert.equal(fullSafeReport.http.hottest_routes[0].latency_samples_truncated,false);
assert.equal(fullSafeReport.http.hottest_routes[1].route,null,'query-bearing routes are rejected rather than copied');
assert.equal(fullSafeReport.http.recent_problem_requests[0].route,'POST /api/sessions/:id/stop');
assert.equal(fullSafeReport.http.recent_problem_requests[1].route,null,'fragment-bearing routes are rejected rather than copied');
assert.equal(fullSafeReport.assets.missing_count,1,'safe asset aggregates survive without asset identities');
assert.equal(fullSafeReport.assets.field_coverage.fields_examined,18);
assert.equal(fullSafeReport.business.payments.net_card_charged_24h,35,'exact payment aggregates survive the copied business report');
assert.equal(fullSafeReport.payment_operations.webhook.recent_financial_events_24h.payout_failed,1,'verified Stripe Connect bank-payout failure counts survive the aggregate-only payment report');
assert.equal(fullSafeReport.payment_operations.coverage.end_to_end_delivery_complete,false,'the copied payment report preserves the explicit end-to-end delivery coverage gap');
assert.equal(fullSafeReport.payment_operations.settlements.by_phase.claimed,0,'the copied payment report preserves the real claimed settlement phase');
assert.equal(fullSafeReport.summary.stripe_webhook_configuration_ready,true,'webhook signing readiness survives the bounded summary projection');
assert.equal(fullSafeReport.database.primary.ok,true,'database authority probes are included in the copied report');
assert.equal(fullSafeReport.cache.revision,12);
assert.equal(fullSafeReport.storage.database.driver,'postgres-primary-hybrid');
assert.equal(fullSafeReport.background_tasks.health_code,'background_task_dropped_work');
assert.equal(fullSafeReport.background_tasks.queue_depth,2);
assert.equal(fullSafeReport.live_capacity.reason_present,true,'the report retains only the boolean fact that a rollout reason exists');
assert.equal(fullSafeReport.live_capacity.updated_at,new Date(1756710200*1000).toISOString(),'epoch-second capacity updates render as unambiguous ISO timestamps');
assert.equal(fullSafeReport.payment_runtime.active_configuration_ready,true);
assert.equal(fullSafeReport.payment_runtime.configured_mode,'test','the report preserves active Stripe configuration readiness and coherent configured mode');
const webhookReadinessProjection=actionSandbox.safeOpsReportSections({
  summary:{stripe_platform_webhook_configuration_ready:true,stripe_connect_webhook_configuration_ready:false,stripe_webhook_configuration_ready:false},
  payment_runtime:{available:true,status:'critical',active_stripe_mode:'test',active_configuration_ready:true,platform_webhook_configuration_ready:true,connect_webhook_configuration_ready:false,webhook_configuration_ready:false,configured_mode:'test',last_error_code:'stripe_connect_webhook_configuration_unavailable',signing_secret:'LEAK-ME'},
},{state:'unavailable'},{unavailable:true});
assert.equal(webhookReadinessProjection.summary.stripe_platform_webhook_configuration_ready,true,'developer report projects platform signing readiness');
assert.equal(webhookReadinessProjection.summary.stripe_connect_webhook_configuration_ready,false,'developer report projects distinct Connect signing readiness');
assert.equal(webhookReadinessProjection.summary.stripe_webhook_configuration_ready,false,'developer report projects combined signing readiness');
assert.equal(webhookReadinessProjection.payment_runtime.platform_webhook_configuration_ready,true);
assert.equal(webhookReadinessProjection.payment_runtime.connect_webhook_configuration_ready,false);
assert.equal(webhookReadinessProjection.payment_runtime.webhook_configuration_ready,false);
assert.doesNotMatch(JSON.stringify(webhookReadinessProjection),/LEAK-ME/,'Stripe signing secrets never enter the developer report');
assert.equal(fullSafeReport.trends.daily[0].day,'2026-09-01');
assert.equal(fullSafeReport.trends.live[0].realtime_status,'unavailable');
assert.equal(fullSafeReport.trends.live[0].connected_users,null);
assert.equal(fullSafeReport.trends.live[0].api_observed_window_sec,900);
assert.equal(fullSafeReport.trends.live[0].api_window_coverage_complete,true);
assert.equal(fullSafeReport.trends.semantics.daily_money_basis,'current_financial_state_of_sessions_requested_on_day','copied reports retain the exact mutable request-day cohort semantics');
assert.equal(fullSafeReport.alerts[0].event,'reconfirmed');
assert.equal(fullSafeReport.alerts[0].source,'assets');
assert.equal(fullSafeReport.alerts[0].previous_severity,'warning');
assert.equal(fullSafeReport.alerts[0].evidence_status,'unknown','bounded alert lifecycle evidence survives projection');
assert.equal(fullSafeReport.realtime.websocket.alert_window.window_coverage_complete,true);
assert.equal(fullSafeReport.overview_event_history.returned_event_count,1);
assert.equal(fullSafeReport.overview_event_history.events.length,1);
assert.match(fullSafeReport.overview_event_history.history_scope,/Replica-local volatile process-memory history sampled only on overview requests; not continuous and not durable incident history/);
assert.equal(fullSafeReport.overview_event_history.sampling_trigger,'overview_request');
assert.equal(fullSafeReport.overview_event_history.sampling_continuous,false);
assert.equal(fullSafeReport.overview_event_history.sampling_gap_possible,true);
assert.equal(fullSafeReport.overview_event_history.retention_complete_for_observed_samples,true);
assert.equal(fullSafeReport.events.events[0].severity,'info');
assert.equal(fullSafeReport.events.events[0].event,'resolved','all exact backend alert lifecycle states survive projection');
assert.equal(fullSafeReport.events.events[0].source,'assets');
assert.equal(fullSafeReport.events.returned_event_count,fullSafeReport.events.events.length,'event-history metadata remains coherent after privacy projection');
assert.equal(fullSafeReport.thresholds.http_p95_critical_ms,2500);
assert.equal(fullSafeReport.provenance.http.window,'trailing_15m_rates_and_latency_plus_process_lifetime_totals');
assert.equal(fullSafeReport.provenance.http.coverage.scope,'current_backend_process');
assert.equal(fullSafeReport.provenance.http.coverage.observed_window_sec,900);
assert.equal(fullSafeReport.provenance.http.coverage.route_details_truncated,false);
const localRealtimeReport=actionSandbox.safeOpsReportSections({realtime:{available:true,status:'ok',scope:'local_process',websocket:{driver:'memory',cluster:null}}},{},{});
assert.equal(localRealtimeReport.realtime.websocket.cluster,null,'local-process realtime reports preserve cluster=null as not applicable');
const sampledLatencyReport=actionSandbox.safeOpsReportSections({alerts:[latencySampleAlert]},{},{});
assert.equal(sampledLatencyReport.alerts[0].key,'http_latency_sample_partial');
assert.equal(sampledLatencyReport.alerts[0].meta.latency_sample_count,2);
assert.equal(sampledLatencyReport.alerts[0].meta.latency_samples_truncated,true);
assert.equal(sampledLatencyReport.alerts[0].meta.latency_sampling,'latest_requests_within_rate_window','bounded sampling semantics survive the privacy-safe developer report');
const oneHundredTwentyEvents=Array.from({length:120},()=>({key:'broken_upload_assets',severity:'info',event:'resolved',source:'assets',previous_severity:'warning',title:'Asset event',detail:'Resolved aggregate evidence.',at:'2026-09-01T08:00:00Z',meta:{missing_count:0}}));
const maxEventReport=actionSandbox.safeOpsReportSections({runtime_identity:{...verifiedIdentity,process_started_at:'2026-09-01T07:00:00Z'}},{},{generated_at:'2026-09-01T08:00:00Z',scope:'backend_replica',storage:'process_memory',retention_limit:120,returned_limit:120,retained_event_count:120,returned_event_count:120,dropped_event_count:0,retention_complete_for_observed_samples:true,sampling_trigger:'overview_request',sampling_continuous:false,sampling_gap_possible:true,sample_count:1,first_sampled_at:'2026-09-01T08:00:00Z',last_sampled_at:'2026-09-01T08:00:00Z',process_started_at:'2026-09-01T07:00:00Z',deployment_id:'deploy-1',replica_id:'replica-1',events:oneHundredTwentyEvents});
assert.equal(maxEventReport.events.events.length,120,'the privacy-safe event report preserves every validated endpoint event up to its 120-item contract limit');
assert.equal(maxEventReport.events.returned_event_count,maxEventReport.events.events.length,'the projected 120-item event list remains coherent with its envelope count');
assert.doesNotMatch(serializedFullSafeReport,/LEAK-ME|ghp_|whsec_|sk_live_51PRIVATEVALUE|alice@example|Álice|portrait-private\.(?:jpg|pdf)|\.env|asset-uuid-secret|secret-cache-key|admin-secret|postgres:\/\/|\/private|\/Users|\/var|\/tmp|"owner"|"slug"|"path"|"url"|"examples"|connection_string|stripe_key|future_secret/,'every report section and alert meta excludes secrets, quoted/unicode identities, filenames, asset IDs, and internal paths');

const staleBranch=section(actionSource,"      if(action === 'cleanup_stale'){","      if(action === 'cleanup_pending'){");
assert(staleBranch.indexOf('{dry_run:true}')<staleBranch.indexOf('window.prompt'),'stale settlement always previews before prompting');
assert.match(staleBranch,/staleResult\.required_confirm/);
assert.match(staleBranch,/staleResult\.candidate_fingerprint/);
assert.match(staleBranch,/\{dry_run:false,confirm:stalePreview\.requiredConfirm,candidate_fingerprint:fingerprint\}/);
assert.doesNotMatch(staleBranch,/candidate_fingerprint[^;]*toLowerCase/,'the authoritative candidate fingerprint is not rewritten');
assert.doesNotMatch(staleBranch,/max_age_seconds|limit/,'stale client cannot control the backend candidate scope');
assert.match(staleBranch,/DANGEROUS SETTLEMENT ACTION[\s\S]*capture card payment or debit prepaid credit/);
assert(staleBranch.indexOf('staleCount===0')<staleBranch.indexOf('window.prompt'),'a zero-candidate stale preview cannot prompt or mutate');
const pendingBranch=section(actionSource,"      if(action === 'cleanup_pending'){","      if(action === 'stop_one'){");
const cacheBranch=section(actionSource,"      if(action === 'clear_cache'){","      if(action === 'cleanup_stale'){");
const targetedBranch=section(actionSource,"      if(action === 'stop_one'){","\t      if(action === 'stop_all'){");
const bulkBranch=section(actionSource,"      if(action === 'stop_all'){","    } catch(err) {");
assert(pendingBranch.indexOf('count===0')<pendingBranch.indexOf('window.confirm'),'a zero-candidate pending preview cannot prompt or mutate');
assert(cacheBranch.indexOf('cacheCount===0')<cacheBranch.indexOf('window.confirm'),'an empty cache preview cannot prompt or mutate');
assert(bulkBranch.indexOf('active===0')<bulkBranch.indexOf('window.prompt'),'a zero-target bulk-stop preview cannot prompt or mutate');
assert.match(cacheBranch,/cachePreview\.body\.candidate_fingerprint[\s\S]*candidate_fingerprint:cacheFingerprint/,'cache clear binds mutation to the exact top-level preview fingerprint');
assert.match(pendingBranch,/pendingPreview\.result\.candidate_fingerprint[\s\S]*candidate_fingerprint:pendingFingerprint/,'pending cleanup binds mutation to the exact preview candidate set');
assert.match(targetedBranch,/oneResult\.candidate_fingerprint[\s\S]*candidate_fingerprint:oneFingerprint/,'targeted stop binds mutation to the exact previewed session state');
assert.match(bulkBranch,/stopResult\.candidate_fingerprint/,'bulk-stop reads the backend-owned fingerprint from the preview');
assert.match(bulkBranch,/requireCandidateFingerprint\(stopResult\.candidate_fingerprint/,'bulk-stop rejects a missing or malformed candidate fingerprint before confirmation');
assert.match(bulkBranch,/\{dry_run:false, confirm:stopConfirm, candidate_fingerprint:stopFingerprint\}/,'bulk-stop echoes the exact preview fingerprint on confirmation');
assert.doesNotMatch(bulkBranch,/stopFingerprint[^;]*toLowerCase|stopFingerprint[^;]*trim\(/,'the opaque backend fingerprint is never rewritten');
assert.doesNotMatch(actionSource,/SETTLE_AND_STOP_SESSION_|SETTLE_AND_STOP_ACTIVE_SESSIONS|CLEANUP_OLD_PENDING_SESSIONS|CLEAR_CACHE/,'no client confirmation fallback remains');
assert.match(actionSource,/var envelope=\{status:Number\(response\.status\|\|0\),body:payload\}/,'Ops actions retain HTTP status and response body');
assert.match(actionSource,/window\.__obOpsActionFeedback=feedback/,'action feedback persists outside replaceable DOM');
assert.match(actionSource,/title:'Ownlybiz '\+environment\+' ops report'/,'report environment is dynamic');
assert.match(actionSource,/generated_at:safeOpsTimestamp\(overview\.generated_at\)/,'copying a report validates the server timestamp and does not re-date stale telemetry as current');
assert.match(actionSource,/snapshot_state:stale\?'stale':'current'/);
assert.match(actionSource,/snapshot_received_at:safeOpsTimestamp\(snapshot\.received_at\)/,'report receipt times are normalized to explicit ISO timestamps');
assert.match(actionSource,/snapshot_last_verified_at:safeOpsTimestamp\(snapshot\.last_verified_at\)/,'last-verified evidence is not exposed as an ambiguous epoch integer');
assert.match(actionSource,/stale_since:safeOpsTimestamp\(snapshot\.stale_since\)/);
assert.match(actionSource,/identity_verification:safeVerification/,'reports carry the backend identity verification state through the same privacy-safe identity projection');
assert.match(actionSource,/runtime_identity:safeReportSections\.runtime_identity/,'reports carry runtime identity through a named-field privacy projection');
assert.match(actionSource,/media_sfu:safeReportSections\.media_sfu/,'reports carry only the projected normalized SFU section');
assert.match(actionSource,/security:safeReportSections\.security/,'reports carry only the projected normalized security section');
assert.match(actionSource,/reply_assistant:safeReportSections\.reply_assistant/,'reports carry only the projected normalized reply-assistant section');
assert.match(actionSource,/system:safeReportSections\.system/,'reports carry only the projected normalized system section');
assert.doesNotMatch(actionSource,/summary:overview\.summary|alerts:overview\.alerts|http:overview\.http|business:overview\.business|payment_operations:overview\.payment_operations|realtime:overview\.realtime|assets:overview\.assets|cache:overview\.cache|storage:overview\.storage|background_tasks:overview\.background_tasks|live_capacity:overview\.live_capacity|payment_runtime:overview\.payment_runtime|media_sfu:overview\.media_sfu|security:overview\.security|reply_assistant:overview\.reply_assistant|system:overview\.system|trends:trends|events:events/,'no raw overview, trend, or event section bypasses the clipboard projectors');
assert.match(actionSource,/EXPECTED_OPS_SERVICE_ID='69c78756-c810-4e87-b482-3fee37eb6657'/);
assert.match(actionSource,/EXPECTED_OPS_ENVIRONMENT_ID='9d2e708e-24af-4fea-a5a3-796d4cd9956f'/);
assert.doesNotMatch(section(actionSource,'  function opsEnvironment(){','  function captureOpsActionContext(){'),/OWNLYBIZ_IS_STAGING|hostname|\.environment\b/,'the staging label does not trust frontend flags, hostnames, or Railway display names');
assert.match(actionSource,/client\.isCurrent\(context\.captured,\{exactCredential:true\}\)===true/,'Ops action responses are bound to an exact credential');
assert.match(actionSource,/signal:controller\.signal/,'Ops action requests are abortable');
assert.match(actionSource,/\['clear_cache','cleanup_stale','cleanup_pending','stop_one','stop_all'\][\s\S]*requireVerifiedMutationTarget/,'every mutating Ops control is identity gated');
assert.match(actionSource,/OPS_MUTATION_OVERVIEW_TTL_MS=30000/,'mutation identity evidence has a documented two-refresh wall-clock TTL');
assert.match(actionSource,/freshnessAnchorAt===lastVerifiedAt[\s\S]*freshnessAnchorAt===expectedFreshnessAnchor[\s\S]*wallClockAge>=0[\s\S]*wallClockAge<=OPS_MUTATION_OVERVIEW_TTL_MS[\s\S]*document[^;]*hidden/,'mutation gating uses the earliest server-generation/receipt freshness anchor, exact successful provenance, recent wall-clock age, and active visibility');
assert.match(actionSource,/runtimeSafe[\s\S]*runtime_classification[\s\S]*paymentSafe[\s\S]*active_stripe_mode[\s\S]*==='test'/,'mutations require backend-normalized staging identity and authoritative Stripe test mode');
assert.match(actionSource,/__obOpsActionBusy[\s\S]*ops_action_in_flight[\s\S]*setOpsActionButtonsBusy\(true\)[\s\S]*finally[\s\S]*setOpsActionButtonsBusy\(false\)/,'owner controls reject overlaps and keep controls disabled through completion');
assert.match(actionSource,/isCandidateFingerprintMismatch\(err\)[\s\S]*obRefreshOpsDashboard\('candidate-mismatch'\)[\s\S]*return await runOpsControl\(action,OPS_INTERNAL_REPREVIEW_TOKEN\)/,'stale candidate fingerprints keep the original busy owner while awaiting one internal refresh, new preview, and reconfirmation');
assert.doesNotMatch(actionSource,/candidateRepreviewed|obOpsRunControl=function\(action,options\)/,'no public option can bypass the candidate re-preview guard');
assert.match(actionSource,/preview-only count is '\+active[\s\S]*binds confirmation to the exact candidate set returned by this preview[\s\S]*operation remains point-in-time and does not pause new admissions[\s\S]*explicitly authorize all sessions in that confirmed preview/,'stop-all confirmation explains fingerprint binding, point-in-time scope, and unpaused admissions');
assert.match(actionSource,/stopResult\.warning/,'the stop-all UI surfaces the backend point-in-time/admissions warning');
assert.match(bulkBranch,/new or changed candidates require a fresh preview[\s\S]*admitted afterward may require another sweep/,'stop-all never silently expands confirmation to changed or newly admitted candidates');

const runControlSource=section(actionSource,'\t  var OPS_INTERNAL_REPREVIEW_TOKEN=','  var previousOwnerActionGuideRun');
let releaseBusyPreview,busyApiCalls=0;
const busyStates=[],busyFeedback=[];
const busyControl={window:null,Error,Object,Array,String,Number,JSON,Promise,
  captureOpsActionContext:()=>({credential:'admin-token'}),isCurrentOpsActionContext:()=>true,requireVerifiedMutationTarget:()=>true,
  opsApi:async()=>{busyApiCalls+=1;return new Promise(resolve=>{releaseBusyPreview=resolve;});},
  requirePreview:envelope=>({body:envelope.body,result:{},requiredConfirm:envelope.body.required_confirm}),requireCandidateFingerprint:value=>value,requiredCount:value=>value,isCandidateFingerprintMismatch:()=>false,
  actionResult:(...args)=>busyFeedback.push(args),applyOpsOutcome(){},refreshAfterAction(){},setOpsActionButtonsBusy:value=>busyStates.push(value),formatOpsEmergencyFailure:error=>String(error&&error.message||error),setTimeout(){},
};
busyControl.window=busyControl;
vm.createContext(busyControl);new vm.Script(runControlSource).runInContext(busyControl);
const firstBusyAction=busyControl.obOpsRunControl('clear_cache');
await Promise.resolve();
const overlappingAction=await busyControl.obOpsRunControl('clear_cache');
assert.equal(overlappingAction.code,'ops_action_in_flight','a second owner action is rejected while preview or mutation work is in flight');
assert.equal(busyApiCalls,1,'overlapping clicks cannot send a second action request');
assert.match(busyFeedback.at(-1)[0],/already in progress/);
releaseBusyPreview({status:200,body:{success:true,dry_run:true,required_confirm:'CACHE_TOKEN',would_clear:0,candidate_fingerprint:'a'.repeat(64)}});
await firstBusyAction;
assert.deepEqual(busyStates,[true,false],'action buttons stay busy until the owning action settles');

const timeoutBusyStates=[],timeoutBusyFeedback=[];
const timeoutBusyControl={window:null,Error,Object,Array,String,Number,JSON,Promise,
  captureOpsActionContext:()=>({credential:'admin-token'}),isCurrentOpsActionContext:()=>true,requireVerifiedMutationTarget:()=>true,
  opsApi:async()=>{const error=new Error('Ops action request timed out after 15 seconds; no successful completion was recorded.');error.code='ops_action_timeout';throw error;},
  isCandidateFingerprintMismatch:()=>false,actionResult:(...args)=>timeoutBusyFeedback.push(args),refreshAfterAction(){},setOpsActionButtonsBusy:value=>timeoutBusyStates.push(value),formatOpsEmergencyFailure:error=>String(error&&error.message||error),setTimeout(){},
};
timeoutBusyControl.window=timeoutBusyControl;
vm.createContext(timeoutBusyControl);new vm.Script(runControlSource).runInContext(timeoutBusyControl);
await timeoutBusyControl.obOpsRunControl('clear_cache');
assert.deepEqual(timeoutBusyStates,[true,false],'a timed-out request releases the single owner busy state in finally');
assert.match(timeoutBusyFeedback.at(-1)[0],/timed out after 15 seconds[\s\S]*no successful completion/);

const exactStopFingerprint='a'.repeat(64),stopCalls=[],stopPrompts=[],stopFeedback=[];
const stopControlSandbox={window:null,Error,Object,Array,String,Number,JSON,Promise,
  captureOpsActionContext:()=>({credential:'admin-token'}),isCurrentOpsActionContext:()=>true,requireVerifiedMutationTarget:()=>true,
  opsApi:async(path,body)=>{stopCalls.push({path,body});return body.dry_run?{status:200,body:{success:true,result:{dry_run:true,required_confirm:'STOP_ALL',checked:2,candidate_fingerprint:exactStopFingerprint,warning:'Point-in-time; admissions remain open.'}}}:{status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-stop-all',audit_event_id:'audit-stop-all',result:{dry_run:false,stopped:2}}};},
  requirePreview:(envelope,requiredConfirm)=>({body:envelope.body,result:envelope.body.result,requiredConfirm}),requireCandidateFingerprint:value=>value,isCandidateFingerprintMismatch:()=>false,requiredCount:value=>Number(value),
  opsContractError:message=>Object.assign(new Error(message),{code:'ops_contract_invalid'}),actionResult:(...args)=>stopFeedback.push(args),applyOpsOutcome:(...args)=>stopFeedback.push(args),refreshAfterAction(){},
  opsGet:async()=>({}),opsEnvironment:()=> 'staging',opsIdentityVerification:()=>({verified:true}),copyText:async()=>{},location:{origin:'https://staging.example',pathname:'/admin',href:'https://staging.example/admin'},formatOpsEmergencyFailure:error=>String(error.message),setTimeout(){},setOpsActionButtonsBusy(){},
};
stopControlSandbox.window=stopControlSandbox;stopControlSandbox.prompt=message=>{stopPrompts.push(message);return 'STOP_ALL';};
vm.createContext(stopControlSandbox);new vm.Script(runControlSource).runInContext(stopControlSandbox);
await stopControlSandbox.obOpsRunControl('stop_all');
assert.equal(stopCalls.length,2,'stop-all performs one dry-run followed by one confirmed request');
assert.equal(stopCalls[0].body.dry_run,true);
assert.equal(Object.keys(stopCalls[0].body).length,1);
assert.equal(stopCalls[1].body.candidate_fingerprint,exactStopFingerprint,'the exact opaque preview fingerprint is sent unchanged');
assert.equal(stopCalls[1].body.confirm,'STOP_ALL');
assert.match(stopPrompts[0],/Fingerprint aaaaaaaaaaaa…[\s\S]*point-in-time[\s\S]*does not pause new admissions/,'the executable confirmation surfaces the fingerprint and point-in-time admission scope');

async function runFingerprintControl(action,previewEnvelope,{prompts=[]}={}){
  const calls=[],feedback=[],promptQueue=Array.from(prompts);
  const control={window:null,Error,Object,Array,String,Number,JSON,Promise,
    captureOpsActionContext:()=>({credential:'admin-token'}),isCurrentOpsActionContext:()=>true,requireVerifiedMutationTarget:()=>true,
    opsApi:async(path,body)=>{calls.push({path,body});return body.dry_run?previewEnvelope:{status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-control',audit_event_id:'audit-control',result:{dry_run:false,processed:1}}};},
    requirePreview:(envelope,requiredConfirm)=>({body:envelope.body,result:envelope.body.result||{},requiredConfirm}),
    requireCandidateFingerprint:(value,label)=>{if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))throw Object.assign(new Error(label+' invalid candidate_fingerprint'),{code:'ops_contract_invalid'});return value;},
    isCandidateFingerprintMismatch:()=>false,requiredCount:value=>Number(value),opsContractError:message=>Object.assign(new Error(message),{code:'ops_contract_invalid'}),
    actionResult:(...args)=>feedback.push(args),applyOpsOutcome:(...args)=>feedback.push(args),refreshAfterAction(){},opsGet:async()=>({}),opsEnvironment:()=> 'staging',opsIdentityVerification:()=>({verified:true}),copyText:async()=>{},location:{origin:'https://staging.example'},formatOpsEmergencyFailure:error=>String(error.message),setTimeout(){},setOpsActionButtonsBusy(){},
  };
  control.window=control;control.confirm=()=>true;control.prompt=()=>promptQueue.shift()||'';
  vm.createContext(control);new vm.Script(runControlSource).runInContext(control);
  await control.obOpsRunControl(action);
  return {calls,feedback};
}
const pendingFingerprint='b'.repeat(64);
const pendingControl=await runFingerprintControl('cleanup_pending',{status:200,body:{success:true,result:{dry_run:true,required_confirm:'PENDING_TOKEN',checked:2,candidate_fingerprint:pendingFingerprint}}});
assert.equal(pendingControl.calls.length,2,'pending cleanup previews and then mutates after explicit confirmation');
assert.equal(pendingControl.calls[1].body.candidate_fingerprint,pendingFingerprint,'pending cleanup submits the exact opaque preview fingerprint');
const cacheFingerprint='c'.repeat(64);
const cacheControl=await runFingerprintControl('clear_cache',{status:200,body:{success:true,dry_run:true,required_confirm:'CACHE_TOKEN',would_clear:3,candidate_fingerprint:cacheFingerprint}});
assert.equal(cacheControl.calls.length,2,'cache clear previews and then mutates after explicit confirmation');
assert.equal(cacheControl.calls[1].body.candidate_fingerprint,cacheFingerprint,'cache clear submits the exact top-level preview fingerprint');
const targetedFingerprint='d'.repeat(64),targetSession='session-target-1';
const targetedControl=await runFingerprintControl('stop_one',{status:200,body:{success:true,result:{dry_run:true,required_confirm:'STOP_TARGET',candidate_fingerprint:targetedFingerprint,session:{id:targetSession}}}},{prompts:[targetSession,'STOP_TARGET']});
assert.equal(targetedControl.calls.length,2,'targeted stop previews the exact requested session before mutation');
assert.equal(targetedControl.calls[1].body.candidate_fingerprint,targetedFingerprint,'targeted stop submits the exact opaque preview fingerprint');
const malformedPending=await runFingerprintControl('cleanup_pending',{status:200,body:{success:true,result:{dry_run:true,required_confirm:'PENDING_TOKEN',checked:2,candidate_fingerprint:'not-a-fingerprint'}}});
assert.equal(malformedPending.calls.length,1,'a malformed pending-cleanup fingerprint cannot reach mutation');
assert.match(malformedPending.feedback.at(-1)[0],/no successful completion[\s\S]*invalid candidate_fingerprint/);

const mismatchCalls=[],mismatchFingerprints=['e'.repeat(64),'f'.repeat(64)],mismatchFeedback=[];
const mismatchControl={window:null,Error,Object,Array,String,Number,JSON,Promise,
  captureOpsActionContext:()=>({credential:'admin-token'}),isCurrentOpsActionContext:()=>true,requireVerifiedMutationTarget:()=>true,
  opsApi:async(path,body)=>{mismatchCalls.push({path,body});if(body.dry_run){const fingerprint=mismatchFingerprints.shift();return {status:200,body:{success:true,result:{dry_run:true,required_confirm:'PENDING_TOKEN',checked:1,candidate_fingerprint:fingerprint}}};}if(mismatchCalls.length===2)throw Object.assign(new Error('changed'),{status:409,code:'pending_session_candidates_changed'});return {status:200,body:{success:true,action_executed:true,audit_recorded:true,audit_completion_recorded:true,action_id:'audit-mismatch',audit_event_id:'audit-mismatch',result:{dry_run:false,processed:1}}};},
  requirePreview:(envelope,requiredConfirm)=>({body:envelope.body,result:envelope.body.result,requiredConfirm}),requireCandidateFingerprint:value=>value,isCandidateFingerprintMismatch:error=>error&&error.status===409&&/candidates_changed/.test(error.code),requiredCount:value=>Number(value),
  opsContractError:message=>new Error(message),actionResult:(...args)=>mismatchFeedback.push(args),applyOpsOutcome:(...args)=>mismatchFeedback.push(args),refreshAfterAction(){},obRefreshOpsDashboard:async()=>({ok:true}),opsGet:async()=>({}),opsEnvironment:()=> 'staging',opsIdentityVerification:()=>({verified:true}),copyText:async()=>{},location:{origin:'https://staging.example'},formatOpsEmergencyFailure:error=>String(error.message),setTimeout(){},setOpsActionButtonsBusy(){},
};
mismatchControl.window=mismatchControl;mismatchControl.confirm=()=>true;mismatchControl.prompt=()=>'';
vm.createContext(mismatchControl);new vm.Script(runControlSource).runInContext(mismatchControl);
await mismatchControl.obOpsRunControl('cleanup_pending');
assert.equal(mismatchCalls.length,4,'a 409 candidate mismatch forces exactly one fresh preview and reconfirmation before retrying mutation');
assert.equal(mismatchCalls[1].body.candidate_fingerprint,'e'.repeat(64));
assert.equal(mismatchCalls[3].body.candidate_fingerprint,'f'.repeat(64),'the retry uses only the replacement preview fingerprint');
assert.match(mismatchFeedback[0][0],/candidate fingerprint[\s\S]*changed[\s\S]*new preview/i);

let raceCallCount=0,releaseInternalPreview=null;
const raceBusyStates=[],raceFeedback=[];
const raceControl={window:null,Error,Object,Array,String,Number,JSON,Promise,
  captureOpsActionContext:()=>({credential:'admin-token'}),isCurrentOpsActionContext:()=>true,requireVerifiedMutationTarget:()=>true,
  opsApi:async(_path,body)=>{raceCallCount+=1;if(raceCallCount===1)return {status:200,body:{success:true,result:{dry_run:true,required_confirm:'PENDING_TOKEN',checked:1,candidate_fingerprint:'1'.repeat(64)}}};if(raceCallCount===2)throw Object.assign(new Error('changed'),{status:409,code:'pending_session_candidates_changed'});if(body.dry_run)return new Promise(resolve=>{releaseInternalPreview=resolve;});throw new Error('unexpected mutation');},
  requirePreview:(envelope,requiredConfirm)=>({body:envelope.body,result:envelope.body.result,requiredConfirm}),requireCandidateFingerprint:value=>value,requiredCount:value=>Number(value),isCandidateFingerprintMismatch:error=>error&&error.status===409,
  actionResult:(...args)=>raceFeedback.push(args),applyOpsOutcome(){},refreshAfterAction(){},obRefreshOpsDashboard:async()=>({ok:true}),setOpsActionButtonsBusy:value=>raceBusyStates.push(value),formatOpsEmergencyFailure:error=>String(error&&error.message||error),setTimeout(){},
};
raceControl.window=raceControl;raceControl.confirm=()=>true;
vm.createContext(raceControl);new vm.Script(runControlSource).runInContext(raceControl);
const raceOwnerPromise=raceControl.obOpsRunControl('cleanup_pending');
for(let i=0;i<32&&!releaseInternalPreview;i+=1)await Promise.resolve();
assert.equal(typeof releaseInternalPreview,'function','the internal retry reached a fresh awaited preview; calls='+raceCallCount+' feedback='+JSON.stringify(raceFeedback));
const overlapDuringInternalRetry=await raceControl.obOpsRunControl('cleanup_pending');
assert.equal(overlapDuringInternalRetry.code,'ops_action_in_flight','public actions remain blocked throughout the awaited internal re-preview');
releaseInternalPreview({status:200,body:{success:true,result:{dry_run:true,required_confirm:'PENDING_TOKEN',checked:0,candidate_fingerprint:'2'.repeat(64)}}});
await raceOwnerPromise;
assert.deepEqual(raceBusyStates,[true,false],'the original action remains the sole busy owner until its internal retry settles');
assert.equal(raceCallCount,3,'the overlapping public call cannot race a fourth request');

const developerSource=scriptById('ob-prod-admin-monitor-fixes-script');
const ownerSource=scriptById('ob-owner-action-guides-script');
const sfuSource=scriptById('ownlybiz-one-to-one-sfu-admin-20260527');
const actionCenterRenderSource=section(actionSource,'  function renderOpsActionCenter(){','  var previousOpenOps = window.obOpenOpsDashboard;');
assert.match(opsSource,/focus\(\{preventScroll:true\}\)/,'poll rerenders restore focus without browser-driven scroll');
assert.match(opsSource,/try\{body\.scrollTop=restoredScroll;\}/,'saved modal scroll is reapplied after focus as a browser compatibility fallback');
assert.match(opsSource,/currentAnchorOffset-scrollAnchorDescriptor\.offset/,'poll rerenders compensate for changing content height above the owner\'s visible reading anchor');
assert.match(opsSource,/data-ob-focus-key="table:/,'focusable telemetry regions have stable semantic keys');
assert.doesNotMatch(actionCenterRenderSource,/old\.outerHTML\s*=/,'delayed action-center refreshes update live state without replacing the focused section');
assert.match(actionCenterRenderSource,/data-ob-focus-key="action:stop-one"/,'action-center controls expose stable semantic focus keys');
assert.match(actionCenterRenderSource,/data-ob-scroll-key="action-center"/,'the action center exposes a stable visual scroll anchor');
assert.match(ownerSource,/data-ob-focus-key="owner-guide:/,'owner guidance uses alert/action focus keys instead of visible index alone');
assert.match(developerSource,/prior&&prior\.outerHTML!==html/,'unchanged developer handoff content keeps its DOM identity');
assert.match(sfuSource,/existing\.outerHTML!==html/,'unchanged SFU evidence keeps its DOM identity');
const ownerLifecycleLocalStorage=storage(),ownerLifecycleSessionStorage=storage(),ownerSnapshotListeners=[];
let ownerLifecycleAdapter=null,ownerOpenCalls=0,ownerCopyControl=null;
const ownerLifecycleSandbox={window:null,String,Number,Object,Array,JSON,Promise,Date,
  localStorage:ownerLifecycleLocalStorage,sessionStorage:ownerLifecycleSessionStorage,
  navigator:{clipboard:{writeText:async()=>{throw new Error('owner-guide copy must use the verified central report controller');}}},
  document:{getElementById:()=>null,addEventListener(){}},
  setTimeout:callback=>{callback();return 1;},
  addEventListener:(type,handler)=>{if(type==='ob:ops-snapshot')ownerSnapshotListeners.push(handler);},
  obOpenOpsDashboard:()=>{ownerOpenCalls+=1;},
  obOpsRunControl:async action=>{ownerCopyControl=action;return {ok:true};},
  OB_CLIENT_CONTEXT:{register:(name,adapter)=>{assert.equal(name,'ops-owner-action-guides');ownerLifecycleAdapter=adapter;return ()=>{};}},
  __OB_TEST_HOOKS__:{},
};
ownerLifecycleSandbox.window=ownerLifecycleSandbox;
vm.createContext(ownerLifecycleSandbox);new vm.Script(ownerSource,{filename:'ops-owner-action-guides.js'}).runInContext(ownerLifecycleSandbox);
assert.equal(ownerSnapshotListeners.length,0,'the owner guide does not wire private admin telemetry before authentication');
ownerLifecycleLocalStorage.setItem('ob_u',JSON.stringify({id:'admin-late',role:'admin'}));
ownerLifecycleSandbox.obOpenOpsDashboard();
assert.equal(ownerOpenCalls,1,'the late-auth owner-guide wrapper preserves the canonical Ops open action');
assert.equal(ownerSnapshotListeners.length,1,'opening Ops Monitor after late authentication wires owner guidance immediately');
ownerLifecycleAdapter.changed({id:'admin-late',role:'admin'});
ownerLifecycleAdapter.credentialRotated({id:'admin-late',role:'admin'});
assert.equal(ownerSnapshotListeners.length,1,'auth lifecycle retries cannot duplicate the owner-guide snapshot listener');
ownerLifecycleSandbox.__obOwnerGuideItems=[{alert:{key:'background_task_dead_jobs'},guide:{safe_actions:[{id:'copy_report',label:'Copy developer report',kind:'client'}]}}];
await ownerLifecycleSandbox.obOwnerActionGuideRun(0,'copy_report');
assert.equal(ownerCopyControl,'copy_report','owner guidance delegates developer-report copying to the verified central controller with truthful feedback');
const alertClipboardSandbox={window:null,String,Number,Object,Array,JSON,__OB_TEST_HOOKS__:{}};alertClipboardSandbox.window=alertClipboardSandbox;
vm.createContext(alertClipboardSandbox);new vm.Script(section(ownerSource,'  function fallbackGuide(alert){','  var OWNER_ACTION_CONTROLS')).runInContext(alertClipboardSandbox);
const maliciousAlertCopy=alertClipboardSandbox.__OB_TEST_HOOKS__.opsAlertClipboard.reportText({key:'broken_upload_assets',severity:'warning',title:'sk_live_51PRIVATEVALUE portrait-private.jpg alice@example.test',detail:'Bearer verysecrettokenvalue /private/uploads/portrait.jpg',at:'2026-09-01T08:00:00Z',meta:{missing_count:1,owner:'alice@example.test',name:'portrait.jpg',slug:'alice',id:'asset-secret-id',path:'/Users/admin/portrait.jpg',token:'LEAK-ME',provider:'sk_live_51PRIVATEVALUE'}},{impact:'Clients see a gap sk_live_51PRIVATEVALUE',cause:'token=LEAK-ME',owner_action:'Inspect /var/private/file',auto_recovery:'No',escalation:'password=LEAK-ME'});
assert.match(maliciousAlertCopy,/missing_count[^\n]*1/,'safe alert aggregate evidence is retained');
assert.doesNotMatch(maliciousAlertCopy,/verysecrettokenvalue|LEAK-ME|sk_live_51PRIVATEVALUE|alice@example|portrait(?:-private)?\.jpg|asset-secret-id|\/private|\/Users|\/var|"owner"|"name"|"slug"|"id"|"path"|"token"|"provider"/,'known alert copy derives prose from its allowlisted key and retains only safe aggregates');
const unknownAlertCopy=alertClipboardSandbox.__OB_TEST_HOOKS__.opsAlertClipboard.reportText({key:'asset_secret-id',severity:'warning',title:'sk_live_51PRIVATEVALUE portrait-private.jpg alice@example.test',detail:'Bearer verysecrettokenvalue',meta:{missing_count:1}},{impact:'sk_live_51PRIVATEVALUE'});
const samplingAlertProjection=alertClipboardSandbox.__OB_TEST_HOOKS__.opsAlertClipboard.projectedAlertHandoff(latencySampleAlert);
assert.equal(samplingAlertProjection.title,'HTTP latency evidence is sampled');
assert.equal(samplingAlertProjection.meta.latency_sample_count,2);
assert.equal(samplingAlertProjection.meta.latency_sampling,'latest_requests_within_rate_window');
assert.match(samplingAlertProjection.impact,/evidence-completeness warning, not proof that the API is unhealthy/,'owner guidance treats bounded p95 sampling as evidence completeness rather than an incident claim');
const replyAuthorityProjection=alertClipboardSandbox.__OB_TEST_HOOKS__.opsAlertClipboard.projectedAlertHandoff({key:'reply_assistant_authority_unavailable',severity:'critical',detail:'AI paused; payment and non-AI APIs remain available'});
assert.match(replyAuthorityProjection.impact,/AI replies and AI auto-accept are paused/i);
assert.match(replyAuthorityProjection.owner_action,/Do not investigate Stripe/i);
assert.doesNotMatch(replyAuthorityProjection.cause,/payment|billing|Stripe/i,'AI authority fallback guidance cannot become a payment incident because the detail says payments remain available');
const partialAssetProjection=alertClipboardSandbox.__OB_TEST_HOOKS__.opsAlertClipboard.projectedAlertHandoff({key:'asset_scan_partial_coverage',severity:'warning',detail:'zero missing count is not an all-clear'});
assert.match(partialAssetProjection.impact,/does not itself prove an asset is missing/i);
assert.match(partialAssetProjection.owner_action,/Do not ask experts to re-upload/i);
assert.match(partialAssetProjection.auto_recovery,/complete expert, reference, and known-field coverage/i);
const backgroundJobsProjection=alertClipboardSandbox.__OB_TEST_HOOKS__.opsAlertClipboard.projectedAlertHandoff({key:'background_task_dead_jobs',severity:'critical',detail:'payment receipt jobs exhausted retries'});
assert.match(backgroundJobsProjection.impact,/dead-job queue/i);
assert.match(backgroundJobsProjection.owner_action,/Do not flush, delete, or replay/i);
assert.match(backgroundJobsProjection.escalation,/immediately when dead jobs exist/i);
const warmingProjection=alertClipboardSandbox.__OB_TEST_HOOKS__.opsAlertClipboard.projectedAlertHandoff({key:'http_alert_window_warming',severity:'warning',detail:'500 Stripe payment failure reported while the window warms'});
assert.match(warmingProjection.impact,/not proof of a service incident/i);
assert.match(warmingProjection.owner_action,/Wait for the 15-minute window to fill/i);
assert.doesNotMatch(warmingProjection.cause,/Stripe|payment|500/i,'warming-window guidance is driven by the trusted alert key, not misleading free-form incident words');
assert.match(unknownAlertCopy,/Unrecognized alert; free-form prose omitted/);
assert.doesNotMatch(unknownAlertCopy,/sk_live_51PRIVATEVALUE|portrait-private\.jpg|alice@example|asset_secret-id|missing_count/,'unknown alert keys omit free-form prose and aggregate data');
let copiedProblemHandoff='',problemCopyFeedback=[];
const problemClipboardSandbox={window:null,String,Object,Array,navigator:{clipboard:{writeText:async()=>{}}},__OB_TEST_HOOKS__:{},obOpsCopyText:async value=>{copiedProblemHandoff=String(value);},obOpsSetActionFeedback:(...args)=>problemCopyFeedback.push(args)};problemClipboardSandbox.window=problemClipboardSandbox;
vm.createContext(problemClipboardSandbox);new vm.Script(section(developerSource,'  function classifyProblem(raw){','\t  function renderDeveloperHandoff(data,snapshot){')).runInContext(problemClipboardSandbox);
const classifyProblem=problemClipboardSandbox.__OB_TEST_HOOKS__.opsProblemClipboard.classifyProblem;
const replyAssistantProblem=classifyProblem({key:'reply_assistant_authority_unavailable',severity:'critical',detail:'Stripe payments remain healthy'});
assert.equal(replyAssistantProblem.area,'AI Reply Assistant');
assert.match(replyAssistantProblem.action,/Keep human handling active/);
assert.match(replyAssistantProblem.action,/without changing Stripe or copying credentials from another environment/);
assert.doesNotMatch(replyAssistantProblem.action,/production credentials/,'shared developer guidance must not hard-code a deployment environment');
assert.doesNotMatch(replyAssistantProblem.cause,/Stripe|payment/i,'Reply Assistant classification cannot be redirected to payments by free-form detail');
const backgroundTaskProblem=classifyProblem({key:'background_task_dead_jobs',severity:'critical',detail:'payment receipt jobs exhausted retries'});
assert.equal(backgroundTaskProblem.area,'Background jobs');
assert.match(backgroundTaskProblem.action,/do not delete or replay jobs/i);
for(const key of ['http_alert_window_warming','realtime_alert_window_warming','http_latency_sample_partial','asset_scan_partial_coverage']){
  const coverageProblem=classifyProblem({key,severity:'warning',detail:'Stripe payment 500 and missing image words must not override monitoring coverage'});
  assert.equal(coverageProblem.area,'Monitoring coverage',key+' is classified as evidence coverage rather than an underlying service incident');
  assert.match(coverageProblem.cause,/not direct proof/);
}
for(const [area,title] of [['AI Reply Assistant','AI Reply Assistant problem'],['Background jobs','Background-job problem'],['Monitoring coverage','Monitoring evidence is incomplete']]){
  const projected=problemClipboardSandbox.__OB_TEST_HOOKS__.opsProblemClipboard.projectedProblemHandoff({area,severity:'critical',title:'sk_live_LEAK',evidence:'alice@example.test'});
  assert.equal(projected.title,title,area+' uses an allowlisted developer-handoff title');
  assert.doesNotMatch(JSON.stringify(projected),/sk_live_LEAK|alice@example/);
}
const maliciousProblemCopy=problemClipboardSandbox.__OB_TEST_HOOKS__.opsProblemClipboard.projectedProblemHandoff({area:'Uploads / Images',title:'Broken uploaded asset',severity:'warning',cause:'Bearer verysecrettokenvalue',evidence:'route=/private/uploads/portrait.jpg | owner=alice | slug=alice | id=asset-secret-id',action:'Inspect token=LEAK-ME'});
assert.match(maliciousProblemCopy.evidence,/Only aggregate asset evidence/);
assert.doesNotMatch(JSON.stringify(maliciousProblemCopy),/verysecrettokenvalue|LEAK-ME|portrait\.jpg|asset-secret-id|\/private|owner=|slug=/,'developer handoff clipboard projection derives all prose from its allowlisted area');
problemClipboardSandbox.__obProblemHandoffs=[{area:'Uploads / Images',severity:'warning',title:'sk_live_51PRIVATEVALUE',evidence:'Bearer LEAK-ME'}];
await problemClipboardSandbox.obCopyProblemHandoff(0);
assert.match(copiedProblemHandoff,/Area: Uploads \/ Images[\s\S]*Only aggregate asset evidence/,'Copy handoff writes only the privacy-safe projection');
assert.deepEqual(problemCopyFeedback.at(-1),['Copied a privacy-safe developer handoff to clipboard.','success'],'Copy handoff reports success only after the verified clipboard helper resolves');
problemClipboardSandbox.obOpsCopyText=async()=>{throw new Error('clipboard denied');};
await problemClipboardSandbox.obCopyProblemHandoff(0);
assert.match(problemCopyFeedback.at(-1)[0],/failed; no clipboard success was recorded: clipboard denied/,'Copy handoff surfaces clipboard failure instead of silently claiming success');
assert.equal(problemCopyFeedback.at(-1)[1],'error');
const unknownProblemCopy=problemClipboardSandbox.__OB_TEST_HOOKS__.opsProblemClipboard.projectedProblemHandoff({area:'sk_live_51PRIVATEVALUE portrait-private.jpg',title:'alice@example.test',cause:'Bearer verysecrettokenvalue',evidence:'/private/portrait.jpg',action:'token=LEAK-ME'});
assert.equal(unknownProblemCopy.area,'Application');
assert.match(unknownProblemCopy.evidence,/Unknown free-form evidence is omitted/);
assert.doesNotMatch(JSON.stringify(unknownProblemCopy),/sk_live_51PRIVATEVALUE|portrait-private\.jpg|alice@example|verysecrettokenvalue|LEAK-ME|\/private/,'unknown problem categories omit every injected free-form field');
new vm.Script(sfuSource,{filename:'ownlybiz-one-to-one-sfu-admin.js'});
assert.doesNotMatch(developerSource,/apiGet\('\/admin\/observability\/overview/);
assert.doesNotMatch(ownerSource,/\/admin\/observability\/overview/);
assert.doesNotMatch(sfuSource,/adminApi\('\/admin\/observability\/overview/);
assert.doesNotMatch(sfuSource,/setInterval\(injectSfuOpsPanel/);
assert.match(developerSource,/ob:ops-snapshot/);
assert.match(ownerSource,/ob:ops-snapshot/);
assert.match(sfuSource,/ob:ops-snapshot/);
assert.match(sfuSource,/m\.available!==true/,'only an explicitly available normalized SFU section is rendered as telemetry');
assert.doesNotMatch(section(sfuSource,'\t  function mediaScalar(value){','\t  function injectSfuOpsPanel(snapshot){'),/\.health\b|raw_health|client_timings/,'the SFU renderer never reads raw upstream health or the legacy raw client-timing body');
const sfuRenderSource=section(sfuSource,'\t  function fmt(n){','\t  function injectSfuOpsPanel(snapshot){');
const sfuSandbox={window:null,Number,String,Object,Array,JSON,esc:value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))};
sfuSandbox.window=sfuSandbox;sfuSandbox.__OB_TEST_HOOKS__={};sfuSandbox.obOpsTableRegion=(_label,table)=>table;
vm.createContext(sfuSandbox);
new vm.Script(sfuRenderSource+'\nthis.testNormalizedMediaSfu=normalizedMediaSfu;this.testMediaOpsHtml=mediaOpsHtml;').runInContext(sfuSandbox);
const normalizedSfuFixture={
  available:true,status:'ok',last_error_code:null,one_to_one_mode:'sfu',one_to_one_fallback_enabled:true,group_sfu_enabled:true,url_configured:true,
  health_identity:'ownlybiz-media-server',health_status:'ok',worker_count:2,candidate_policy:'udp-preferred',deployment_mode:'direct-ice',udp_ready:true,public_candidate_configured:false,public_candidate_port_valid:null,
  measurement_available:true,estimate_available:true,rooms:2,peers:4,transports:8,producers:4,consumers:6,audio_producers:2,video_producers:2,audio_consumers:4,video_consumers:2,session_rooms:1,group_rooms:1,
  estimated:{outbound_mbps:2.32,egress_gb_per_hour:1.02,egress_usd_per_hour:.05},assumptions:{video_mbps_per_consumer:1,audio_mbps_per_consumer:.08,egress_usd_per_gb:.05},
  counters:{rooms_created_total:12,group_rooms_created_total:4,session_rooms_created_total:8,peers_joined_total:28,transports_created_total:40,producers_created_total:18,consumers_created_total:25,keyframes_requested_total:3,client_timing_reports_total:9},
  timings:{join:{count:9,ok:9,error:0,avg_ms:17,p50_ms:14,p95_ms:28,max_ms:31},produce:{count:8,ok:8,error:0,p95_ms:22},consume:{count:7,ok:7,error:0,p95_ms:35}},
  latest_client_timing:{total_ms:190,media_ms:25,join_ms:30,transport_ms:55,produce_ms:20,consume_ms:40,stable_ms:20,prewarmed:true,prepared:true,marks_count:4},
  health:{media:{candidate_policy:'tcp-only'},counters:{secret:'LEAK-ME'},client_timings:{latest:{total_ms:99999}}},raw_health:{authorization:'Bearer LEAK-ME'},secret:'LEAK-ME',url:'https://secret.example.test',
};
const normalizedSfu=sfuSandbox.testNormalizedMediaSfu(normalizedSfuFixture);
assert.equal(normalizedSfu.candidate_policy,'udp-preferred');
assert.equal(normalizedSfu.deployment_mode,'direct-ice');
assert.equal(normalizedSfu.timings.join.p95_ms,28);
assert.equal(normalizedSfu.latest_client_timing.marks_count,4);
assert.doesNotMatch(JSON.stringify(normalizedSfu),/LEAK-ME|raw_health|"health"|"url"/,'the SFU view model is a safe named-field projection');
const sfuHtml=sfuSandbox.testMediaOpsHtml(normalizedSfuFixture);
assert.match(sfuHtml,/ICE candidate policy[\s\S]*udp-preferred[\s\S]*Deployment direct-ice[\s\S]*UDP ready/);
assert.match(sfuHtml,/Public candidate configured \/ port valid[\s\S]*no \/ Unknown/);
assert.match(sfuHtml,/Latest safe client aggregate[\s\S]*190 ms[\s\S]*Reports 9 · marks 4/);
assert.match(sfuHtml,/Server action p95[\s\S]*join 28ms[\s\S]*Rooms created total[\s\S]*12 total/);
assert.doesNotMatch(sfuHtml,/LEAK-ME|tcp-only|99999|secret\.example/,'raw upstream values cannot reach rendered SFU HTML');
const unmeasuredSfuHtml=sfuSandbox.testMediaOpsHtml({...normalizedSfuFixture,measurement_available:false,estimate_available:false,rooms:0,peers:0,consumers:0,estimated:{outbound_mbps:0,egress_gb_per_hour:0,egress_usd_per_hour:0}});
assert.match(unmeasuredSfuHtml,/Rooms \/ peers[\s\S]*Unknown \/ Unknown/,'unavailable SFU measurement is Unknown even when numeric-looking zero fields are present');
assert.match(unmeasuredSfuHtml,/Media egress cost[\s\S]*Unknown[\s\S]*Estimate unavailable/,'unavailable estimates never render as free/zero usage');
assert.match(ownerSource,/OWNER_ACTION_CONTROLS=Object\.freeze/);
assert.match(developerSource,/Active-alert handoff data is unavailable/,'the developer handoff does not infer clear from a missing alerts array');
assert.doesNotMatch(ownerSource,/await api\(action\.path/,'owner guide cannot dispatch an arbitrary server path');
assert.equal((html.match(/\/admin\/observability\/overview/g)||[]).length,1,'only the core monitor fetches the overview');

assert.match(opsSource,/reason==='poll'&&document\.hidden/,'polling pauses only when the document is actually hidden');
assert.doesNotMatch(opsSource,/reason==='poll'&&\(!panelIsOpen\(\)/,'closing the panel does not freeze launcher/sidebar telemetry');
assert.match(opsSource,/OPS_REFRESH_TIMEOUT_MS = 10000[\s\S]*controller\.abort\(\)[\s\S]*ops_refresh_timeout/,'a hung overview request is aborted and downgraded instead of leaving green state indefinitely');
assert.match(opsSource,/fetch\(base\(\) \+ '\/api\/admin\/observability\/overview\?_=' \+ Date\.now\(\), \{ method:'GET',cache:'no-store'/,'overview reads explicitly bypass browser caches');
assert.match(opsSource,/function staleVerifiedSnapshotIfExpired\(\)[\s\S]*exceeded the 30-second freshness window/,'the client has a local stale-state watchdog');
assert.match(opsSource,/function boot\(\)[\s\S]*startPolling\(\)/,'admin telemetry polling starts independently of opening the modal');
assert.doesNotMatch(section(opsSource,'\t  function closeOps(options){','\t  function scrubOpsState(){'),/stopPolling/,'closing the modal keeps launcher and sidebar telemetry current');
assert.doesNotMatch(opsSource,/focusInsideOpsBody/,'keyboard focus inside the modal does not suppress polling');
assert.match(opsSource,/isCurrent\(context\.captured,\{exactCredential:true\}\)===true/,'overview and trend responses are exact-credential bound');
assert.match(opsSource,/freshness:'stale',stale:true/,'overview failure explicitly makes the retained snapshot stale');
assert.match(opsSource,/return \{ok:false,stale:true/,'overview failure returns a failure result');
assert.match(opsSource,/EXPECTED_OPS_API_BASE = 'https:\/\/victorious-wisdom-production-a6b0\.up\.railway\.app'/);
assert.match(opsSource,/EXPECTED_OPS_SERVICE_ID = '69c78756-c810-4e87-b482-3fee37eb6657'/);
assert.match(opsSource,/EXPECTED_OPS_ENVIRONMENT_ID = '9d2e708e-24af-4fea-a5a3-796d4cd9956f'/);
assert.match(opsSource,/PARTIAL \/ UNKNOWN scan[\s\S]*zero does not prove clear/,'the asset summary card cannot present a partial zero-result scan as clear');
assert.match(opsSource,/event\.key==='Escape'/);
assert.match(opsSource,/event\.key!=='Tab'/);
assert.match(opsSource,/document\.body\.classList\.add\('ob-ops-modal-open'\)/);
assert.match(opsSource,/returnFocus=document\.activeElement/);
assert.match(opsSource,/data-ob-ops-inert-owned/);
assert.match(html,/\.ob-ops-table-wrap\{[^}]*overflow-x:auto/);
assert.match(html,/@media\(max-width:480px\)\{#ob-ops-panel\{inset:4px/);
assert.match(html,/\.ob-ops-grid,\.ob-ops-cause-grid\{grid-template-columns:minmax\(0,1fr\)\}/,'cause cards collapse to one bounded column on narrow phones');
assert.match(html,/\.ob-ops-action-card button\{[^}]*min-height:44px/,'owner-action controls meet the minimum touch-target height');
assert.match(html,/role="dialog" aria-modal="true" aria-labelledby="ob-ops-title" aria-hidden="true" tabindex="-1"/);
assert.match(html,/<button id="ob-ops-launcher" class="unknown"/,'the launcher starts unknown before a verified snapshot exists');
assert.match(html,/Stripe Connect destination charges route each expert share to the connected account/,
  'admin payout copy identifies destination charges and Stripe as the bank-payout authority');
assert.match(html,/not a platform payout queue, amount currently owed, or provider-confirmed bank payout/,
  'admin internal accrual data cannot be presented as current payout truth');
assert.match(html,/historical_expert_accruals/,
  'admin payout rendering consumes explicitly classified historical accruals');
assert.doesNotMatch(section(html,'  async function loadAdminPayouts() {','  \/\* ── Admin fee config'),/processPayout|>Approve<|>Reject</,
  'the legacy admin payout loader has no local approve or reject action');

console.log('Ops Monitor trust UI checks passed.');
