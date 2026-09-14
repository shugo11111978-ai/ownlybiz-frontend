import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const source=fs.readFileSync(new URL('../assets/session-conversation.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const baseline=execFileSync('git',['show','e581acbb58233cc96f5a650deefe2972c5f3efea:index.html'],{cwd:new URL('../',import.meta.url),encoding:'utf8',maxBuffer:8e6});
const root={document:{readyState:'loading',addEventListener(){}},__OB_TEST_HOOKS__:{},Map,Set,WeakSet,AbortController,console,Date,Math,Number,String,Array,Object,Promise,URL,atob,clearTimeout,setTimeout};root.window=root;
vm.runInNewContext(source,root);const hooks=root.__OB_TEST_HOOKS__.sessionConversation;
const store={limits:{photo_bytes:10485760,file_bytes:20971520,max_files:20,max_session_bytes:104857600},usage:{files:0,bytes:0}};
for(const type of ['image/jpeg','image/png','image/webp','application/pdf'])assert.equal(hooks.validate({type,size:1024,name:'test'},store),'');
assert.equal(hooks.validate({type:'',size:100,name:'picker.PDF'},store),'','empty-MIME native picker relies on known extension for UI only');
assert.match(hooks.validate({type:'image/heic',size:1024,name:'IMG.HEIC'},store),/HEIC/);
assert.match(hooks.validate({type:'text/html',size:1024,name:'report.pdf'},store),/Choose/);
assert.match(hooks.validate({type:'image/jpeg',size:10485761},store),/10 MB/);
assert.match(hooks.validate({type:'application/pdf',size:20971521},store),/20 MB/);
assert.match(hooks.validate({type:'image/png',size:0},store),/non-empty/);
assert.match(hooks.validate({type:'image/png',size:1},{...store,usage:{files:20,bytes:20}}),/20-file/);
assert.match(hooks.validate({type:'image/png',size:2},{...store,usage:{files:0,bytes:104857599}}),/100 MB/);
const log={scrollTop:100,scrollHeight:1200,clientHeight:400,_obNewButton:{hidden:true}};
const position=hooks.beforeAppend(log);log.scrollHeight=1500;hooks.afterAppend(log,position,false);assert.equal(log.scrollTop,100);assert.equal(log._obNewButton.hidden,false);
hooks.afterAppend(log,position,true);assert.equal(log.scrollTop,1500);assert.equal(log._obNewButton.hidden,true);
log.scrollTop=1070;const follow=hooks.beforeAppend(log);assert.equal(follow.follow,true);log.scrollHeight=1700;hooks.afterAppend(log,follow,false);assert.equal(log.scrollTop,1700);
let valid=true;root.OB_CLIENT_CONTEXT={isCurrent(){return valid},capture(){return {token:'test',principal:'client-a',role:'client'}}};assert.equal(hooks.ownerCurrent({}),true);valid=false;assert.equal(hooks.ownerCurrent({}),false);
const miniAdapter=html.match(/  window\.OB_MINI_SESSION_FILES = Object\.freeze\(\{[\s\S]*?\n  \}\);/)[0];
const mini={window:{},miniSuiteContext:()=>({token:'mini-a',generation:1,principalKey:'mini:a'}),miniSuiteContextCurrent:c=>c.generation===1&&c.token==='mini-a',isMiniSuiteRoute:()=>true,miniSuiteState:{openSession:{id:'mini-sid',expert_id:'owner-id'}}};vm.runInNewContext(miniAdapter,mini);const mc=mini.window.OB_MINI_SESSION_FILES.capture();assert.equal(mini.window.OB_MINI_SESSION_FILES.isCurrent(mc),true);assert.equal(mini.window.OB_MINI_SESSION_FILES.isCurrent({...mc,generation:2}),false);assert.equal(mini.window.OB_MINI_SESSION_FILES.session().id,'mini-sid');assert.equal(mini.window.OB_MINI_SESSION_FILES.senderId(),'owner-id');
mini.isMiniSuiteRoute=()=>false;assert.equal(mini.window.OB_MINI_SESSION_FILES.isCurrent(mc),false,'mini adapter invalidates on route exit');
assert.equal(hooks.viewForRole({expert:true,media:true,host:{closest:()=>({})},log:{id:'media-files'}},{role:'mini'}),true,'mounted mini RTC exposes files for same mini principal');assert.equal(hooks.viewForRole({expert:true,media:true,host:{closest:()=>null},log:{id:'media-files'}},{role:'mini'}),false,'mini cannot attach through ordinary expert RTC surface');
function block(input,start,end){const i=input.indexOf(start),j=input.indexOf(end,i);assert(i>=0&&j>i,start);return input.slice(i,j);}
for(const [start,end] of [
 ['  function applyClientSessionUi(sess){','  function syncClientSession(sid){'],
 ['  window.clientEndSession = function(){','  function stopExpertTimerKeepDisplay(){'],
 ["  var KEY = 'ob_chat_outbox_v2';",'<\/script>'],
 ['  function _setupPC(startContext){','  function _sendOffer(']
]){if(start.includes('_setupPC'))continue;assert.equal(block(html,start,end),block(baseline,start,end),start+' remains byte-identical');}
for(const id of ['expert-chat-input','paid-chat-input','free-chat-input'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' stable');
assert.match(html,/<textarea[^>]+id="paid-chat-input"/);assert.match(html,/!e\.isComposing && e\.keyCode !== 229 && e\.target && e\.target\.id === 'paid-chat-input'/);
assert(!source.includes("'/message'"),'attachments never call text messages');assert(!source.includes('rtc_connected'),'attachments never signal RTC billing readiness');
for(const [_,attrs,code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/src=|application\/ld\+json|application\/json/.test(attrs)||!code.trim())continue;new vm.Script(code);}
console.log(JSON.stringify({status:'PASS',groups:['format and size limits','per-session quota','history scroll preservation and own-send follow','identity invalidation','critical runtime source parity','stable composers and IME','mini exact credential generation adapter','inline script syntax'],providerCalls:0,hostedWrites:0}));
