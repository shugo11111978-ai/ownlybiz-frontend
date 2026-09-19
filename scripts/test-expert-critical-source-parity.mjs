import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
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
assert(before.size>100);assert.deepEqual([...after.keys()],[...before.keys()]);
for(const [key,code] of before)assert.equal(after.get(key),code,'Critical function changed: '+key);
const criticalId=/payment|checkout|billing|refund|session|settle|stripe|authoriz|receipt|credit|group|sfu/i;
let dedicatedScripts=0;
for(const script of oldScripts){if(criticalId.test(script.id)||['ownlybiz-on-demand-readings-20260607','ob-expert-booking-selector-20260608-js','ownlybiz-service-pause-ui-20260526'].includes(script.id)){assert.deepEqual(newScripts[script.index],script,'Critical script changed: '+script.id);dedicatedScripts++;}}
console.log(JSON.stringify({status:'PASS',baseline,criticalFunctions:before.size,dedicatedScripts,inlineScriptSyntax:'PASS',networkRequests:0}));
