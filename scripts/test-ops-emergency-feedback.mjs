import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
function scriptById(id){
  const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match,`${id} is installed`);return match[1];
}
function section(source,start,end){
  const left=source.indexOf(start);assert(left>=0,`section starts at ${start}`);
  const right=source.indexOf(end,left+start.length);assert(right>=0,`section ends at ${end}`);
  return source.slice(left,right);
}

const source=scriptById('ob-admin-live-ops-20260516-script');
assert.match(source,/error\.status=Number\(res\.status\|\|0\)/,'admin API errors retain the HTTP status');
assert.match(source,/error\.body=data&&typeof data==='object'\?data:\{\}/,'admin API errors retain the structured response body');
assert.match(source,/if\(action==='stop_one'\|\|action==='stop_all'\)[\s\S]*?formatOpsEmergencyFailure\(err,action,emergencyStage\)/,'emergency-action failures use structured incident feedback with confirmed-versus-preview state');

const apiSource=section(source,'  function api(path, opts){','  function panelNode(panel){');
const apiSandbox={
  Object,String,Number,Date,Promise,Error,JSON,
  readCache:{},token:()=> 'admin-token',base:()=> 'https://api.example.test',
  fetch:async()=>({
    ok:false,status:503,
    json:async()=>({
      success:false,error:'Session delivery stopped, but financial settlement is still pending.',code:'amount_too_small',
      billing_stopped:true,settlement_pending:true,audit_recorded:true,audit_event_id:'audit-structured-1',
      result:{session:{id:'session-1',status:'settling',billing_stopped_at:1700000100,billing_duration_secs:58}},
    }),
  }),
};
vm.createContext(apiSandbox);
new vm.Script(`${apiSource}\nthis.testApi=api;`,{filename:'ops-api.js'}).runInContext(apiSandbox);
let structuredError=null;
try{await apiSandbox.testApi('/admin/observability/sessions/session-1/stop',{method:'POST',body:{confirm:'CONFIRM'}});}catch(error){structuredError=error;}
assert(structuredError,'non-2xx API response rejects');
assert.equal(structuredError.status,503);assert.equal(structuredError.code,'amount_too_small');
assert.equal(structuredError.body.billing_stopped,true);assert.equal(structuredError.body.result.session.billing_duration_secs,58);

const formatterSource=section(source,'  function formatOpsEmergencyFailure(error,action,stage){','  if(window.__OB_TEST_HOOKS__)');
const formatSandbox={Object,String,Number,Date,Math,Array,isNaN};
vm.createContext(formatSandbox);
new vm.Script(`${formatterSource}\nthis.formatOpsEmergencyFailure=formatOpsEmergencyFailure;`,{filename:'ops-emergency-format.js'}).runInContext(formatSandbox);
const targeted=formatSandbox.formatOpsEmergencyFailure(structuredError,'stop_one','confirmed');
assert.match(targeted,/^Targeted emergency stop did not fully complete\./);
assert.match(targeted,/HTTP status: 503/);
assert.match(targeted,/Billing stopped: YES/);
assert.match(targeted,/Frozen billing time: \d{4}-\d{2}-\d{2}T/);
assert.match(targeted,/Frozen billed duration: 58 sec \(0:58\)/);
assert.match(targeted,/Settlement pending: YES/);
assert.match(targeted,/Audit ID: audit-structured-1/);
assert.match(targeted,/Session: session-1[\s\S]*Session status: settling/);

const bulk=formatSandbox.formatOpsEmergencyFailure({status:207,message:'partial',body:{
  success:false,error:'Some sessions could not be finalized.',audit_recorded:false,
  result:{failures:[{id:'session-2',billing_stopped:false,settlement_pending:false}]},
}},'stop_all','confirmed');
assert.match(bulk,/^Emergency stop all did not fully complete\./);
assert.match(bulk,/Billing stopped: NO/);assert.match(bulk,/Settlement pending: NO/);
assert.match(bulk,/Audit ID: NOT RECORDED/);assert.match(bulk,/Session: session-2/);assert.match(bulk,/Failed sessions: 1/);
const preview=formatSandbox.formatOpsEmergencyFailure({status:503,message:'preview offline',body:{}},'stop_all','preview');
assert.match(preview,/preview could not be loaded; no confirmation was sent/,'a preview failure never claims an emergency mutation ran');

console.log('Ops emergency structured feedback smoke: ok');
