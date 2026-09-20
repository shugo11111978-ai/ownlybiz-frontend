import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const acorn=require(process.env.OWNLYBIZ_ACORN_PATH || 'acorn');
const baseline='756e223bfbf6f62104f70a39776bac3fd190214e';
const current=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const previous=execFileSync('git',['show',baseline+':index.html'],{encoding:'utf8',maxBuffer:20_000_000});
const scripts=html=>[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map((m,i)=>({attrs:m[1],code:m[2],index:i,id:m[1].match(/\bid=["']([^"']+)/)?.[1]||''}));
const oldScripts=scripts(previous),newScripts=scripts(current);
assert.equal(newScripts.length,oldScripts.length);
function walk(node,fn,parent){if(!node||typeof node!=='object')return;fn(node,parent);for(const [key,value] of Object.entries(node)){if(key==='start'||key==='end')continue;if(Array.isArray(value))value.forEach(child=>walk(child,fn,node));else if(value&&typeof value==='object')walk(value,fn,node);}}
function name(node){if(!node)return '';if(node.type==='Identifier')return node.name;if(node.type==='Literal')return String(node.value);if(node.type==='MemberExpression')return name(node.object)+'.'+name(node.property);return '';}
function criticalFunctions(list){const result=new Map();for(const script of list){if(/\bsrc\s*=/.test(script.attrs)||(/\btype\s*=/.test(script.attrs)&&!/type=["'](?:text|application)\/javascript/i.test(script.attrs)))continue;const seen=new Map();const ast=acorn.parse(script.code,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true});walk(ast,(node,parent)=>{if(!/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type))return;let label=name(node.id);if(!label&&parent?.type==='VariableDeclarator')label=name(parent.id);if(!label&&parent?.type==='AssignmentExpression')label=name(parent.left);if(!label&&parent?.type==='Property')label=name(parent.key);const count=seen.get(label)||0;seen.set(label,count+1);if(/payment|checkout|billing|refund|session|settle|stripe|authoriz|capture|credit|receipt|booking|client.*login|client.*token/i.test(label))result.set(`${script.index}:${label}:${count}`,script.code.slice(node.start,node.end));});}return result;}
const before=criticalFunctions(oldScripts),after=criticalFunctions(newScripts);
assert(before.size>100);
// This public-route ownership helper is new, not a changed financial/session
// implementation. Its extracted-source regression suite exercises its boundary.
// Keep every original critical key/body and every dedicated block pinned below.
const guardId='ownlybiz-public-domain-shell-guard-20260614';
const guard=newScripts.find(script=>script.id===guardId);
assert(guard);
const allowedAdditions=[guard.index+':captureClientSurface:0',guard.index+':window._launchSession:0'];
const addedCriticalFunctions=[...after.keys()].filter(key=>!before.has(key));
assert.deepEqual(addedCriticalFunctions,allowedAdditions,'Only the reviewed public-route ownership helper and launch wrapper may be added');
assert.deepEqual([...after.keys()].filter(key=>!allowedAdditions.includes(key)),[...before.keys()]);
// Two exact, separately reviewed media-UI changes: channel reconciliation and
// prep-generation invalidation. No wildcard or session/payment implementation waiver.
const approvedMediaChanges=new Map([
  ['45:renderPresessionMedia:0',['29e6a3cc23fa2acba78e76898102d6e3ce3f4df6277a40bc8ed77476702cda13','15839d3f7200d9d7e8bda608a6c15c7c970ac2b264ffc97bc6195a3fa023f058']],
  ['45:window._startSessionScreen:0',['f468021d28c5cca1de6fc1590c8bd735bfe8794480c7320eae2a45a1fc22b177','d55e26b15a28aed093310d241ea484682d1cff29d0fdc25ef50114b487db52e5']],
]);
// Remove only the redundant substring title writer. Canonical launch and
// marketplace writers stay byte-identical; no session identity is reselected.
const approvedHeaderChanges=new Map([
  ['53:polishPreSession:0',['9c3f9b08447311e8fff544f1bda6dabb08b450295ca708fb5a2bb29e620af665','1142ae2426d9df8fa660b4237b725784cd4949d25234787500671e8b2a621314']],
]);
// Display-only canonical video-rate projection; unchanged rate/billing/RTC policy.
const approvedRateChanges=new Map([
  ['33:applyClientSessionUi:0',['f2007e259466246f1875be5b235e482aedcf48b92b4f2e22b569a0f0cf4bae62','8fcaa53823131122636f384e6586b6f6054e88b2278218c7ccec2a6b7fa34ce2']],
]);
const reviewedRateInsertion="    // Display only explicit pricing from this client's canonical session, not\n    // the expert/default fallback used by provisional session UI.\n    var displayClientId = ch === 'video' ? String(myId() || '') : '';\n    var explicitSessionRate = ch === 'video' ? window.OB_RATE_POLICY.first(sess.rate_per_min, sess.ratePerMin, sess['rate_' + ch], sess[ch + '_pm']) : null;\n    setText('vid-rate-display', ch === 'video' && sessId && displayClientId\n      && String(sess.client_id || '') === displayClientId && sess.expert_id && explicitSessionRate !== null\n      ? money(rate) + '/min' : '—');\n";
const sha=value=>createHash('sha256').update(value).digest('hex');
for(const [key,code] of before){
  if(approvedMediaChanges.has(key))assert.deepEqual([sha(code),sha(after.get(key))],approvedMediaChanges.get(key),'Reviewed media function changed: '+key);
  else if(approvedHeaderChanges.has(key))assert.deepEqual([sha(code),sha(after.get(key))],approvedHeaderChanges.get(key),'Reviewed title function changed: '+key);
  else if(approvedRateChanges.has(key))assert.deepEqual([sha(code),sha(after.get(key))],approvedRateChanges.get(key),'Reviewed display function changed: '+key);
  else assert.equal(after.get(key),code,'Critical function changed: '+key);
}
// obEnableClientMedia is NOT matched by the legacy critical-name pattern.
// Pin its complete approved region, all new ownership helpers, and the entire
// surrounding document against the exact pre-media-fix head independently.
const mediaBaseline='038d24ec05cd3e9244bb0769b2c262a7d7d3c633';
const mediaBefore=execFileSync('git',['show',mediaBaseline+':index.html'],{encoding:'utf8',maxBuffer:20_000_000});
function mediaRegion(html){const start=html.indexOf('  function mediaChannel(){'),end=html.indexOf('  function handleBillingReturnNotice(){',start);assert(start>0&&end>start);return html.slice(start,end);}
const oldMedia=mediaRegion(mediaBefore),newMedia=mediaRegion(current);
assert.equal(sha(oldMedia),'80122ff12164604c430f8e1739132a08868d0a412b8e37f5eaf0f6be9773a504');
assert.equal(sha(newMedia),'844038d0682f26ec550d538d343c37b3706f5db21edf0378155b2902ff0a09bb','Exact reviewed media ownership region changed');
const removedTitleBlock="    var title = document.getElementById('presess-title');\n"
  +"    if(title && /Expert/i.test(title.textContent || '') && window._currentExpert && window._currentExpert.name){\n"
  +"      title.textContent = title.textContent.replace('Expert', window._currentExpert.name);\n"
  +"    }\n";
assert.equal(mediaBefore.split(removedTitleBlock).length,2,'Exactly one approved original title block');
assert.equal(current.includes(removedTitleBlock),false,'Redundant title substitution must be removed');
assert.equal(after.get('53:polishPreSession:0'),before.get('53:polishPreSession:0').replace(removedTitleBlock,''),'Only the exact four-line title deletion is approved');
assert.equal(current.split(reviewedRateInsertion).length,2,'Exactly one reviewed rate projection');
assert.equal(after.get('33:applyClientSessionUi:0').replace(reviewedRateInsertion,''),before.get('33:applyClientSessionUi:0'),'Only the exact display insertion is approved');
const withoutRate=current.replace(reviewedRateInsertion,'').replace('id="vid-rate-display">—</div>','id="vid-rate-display">$5.00/min</div>');
assert.equal(withoutRate.replace(newMedia,'__REVIEWED_MEDIA_REGION__'),mediaBefore.replace(oldMedia,'__REVIEWED_MEDIA_REGION__').replace(removedTitleBlock,''),'Unreviewed document change outside media region, title deletion and exact rate display');
const criticalId=/payment|checkout|billing|refund|session|settle|stripe|authoriz|receipt|credit|group|sfu/i;
let dedicatedScripts=0;
for(const script of oldScripts){if(criticalId.test(script.id)||['ownlybiz-on-demand-readings-20260607','ob-expert-booking-selector-20260608-js','ownlybiz-service-pause-ui-20260526'].includes(script.id)){assert.deepEqual(newScripts[script.index],script,'Critical script changed: '+script.id);dedicatedScripts++;}}
console.log(JSON.stringify({status:'PASS',baseline,criticalFunctions:before.size,unchangedCriticalFunctions:before.size-approvedMediaChanges.size-approvedHeaderChanges.size-approvedRateChanges.size,approvedRateChanges:[...approvedRateChanges.keys()],approvedMediaChanges:[...approvedMediaChanges.keys()],approvedHeaderChanges:[...approvedHeaderChanges.keys()],mediaBaseline,approvedMediaRegionSha256:sha(newMedia),dedicatedScripts,addedCriticalFunctions:addedCriticalFunctions.map(key=>({key,scriptId:guardId,regression:'scripts/test-client-session-route-priority.mjs'})),inlineScriptSyntax:'PASS',networkRequests:0}));
