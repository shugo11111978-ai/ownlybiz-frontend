import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH||'playwright');
const url=new URL(process.env.OWNLYBIZ_CONVERSATION_QA_URL||'http://127.0.0.1:52973/?screen=A4&checks=1');
assert.equal(url.hostname,'127.0.0.1','runner accepts only isolated localhost fixture');
const browser=await chromium.launch({headless:true,...(process.env.OWNLYBIZ_CHROME_PATH?{executablePath:process.env.OWNLYBIZ_CHROME_PATH}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const blocked=[];await context.route('**/*',route=>{const target=new URL(route.request().url());if(target.origin===url.origin||['data:','blob:'].includes(target.protocol))route.continue();else{blocked.push(target.origin);route.abort();}});
 const page=await context.newPage();await page.goto(url.href);await page.waitForFunction(()=>!!window.__qaBrowserReport,{},{timeout:20000});
 const report=await page.evaluate(()=>window.__qaBrowserReport);
 const files=['index.html','assets/session-conversation.js','assets/session-conversation.css','scripts/session-conversation-browser-checks.js','scripts/serve-session-conversation-qa.mjs'];
 report.sourceHashes=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex')]));
 report.blockedExternalOrigins=[...new Set(blocked)];report.capturedAt=new Date().toISOString();
 const directory=process.env.OWNLYBIZ_CONVERSATION_QA_DIR;
 if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/browser-report.json',JSON.stringify(report,null,2)+'\n');await page.screenshot({path:directory+'/mobile-chat.png'});await page.evaluate(()=>qa.keyboard(true));await page.waitForTimeout(100);await page.screenshot({path:directory+'/mobile-chat-keyboard.png'});}
 console.log(JSON.stringify({status:report.status,checks:report.checks.length,failed:report.checks.filter(check=>!check.pass)}));assert.equal(report.status,'PASS');await context.close();
}finally{await browser.close();}
