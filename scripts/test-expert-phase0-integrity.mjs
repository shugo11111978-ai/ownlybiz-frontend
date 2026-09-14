import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

function scriptById(id){
  const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const matches=[...html.matchAll(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`,'g'))];
  assert.equal(matches.length,1,`${id} is installed exactly once`);
  return {source:matches[0][1],index:matches[0].index,end:matches[0].index+matches[0][0].length};
}

const shim=scriptById('ownlybiz-expert-phase0-integrity-20260913');
assert(shim.index>html.indexOf('ownlybiz-expert-live-workspace-20260817'),'Phase 0 integrity is appended after legacy dashboard overrides');
const laterInlineScripts=[...html.slice(shim.end).matchAll(/<script(?![^>]+src=)[^>]*id=["']([^"']+)["'][^>]*>/gi)].map((match)=>match[1]);
assert.deepEqual(laterInlineScripts,['ownlybiz-website-workspace-v2-runtime'],'only the reviewed Website workspace may extend the Phase 0 wrappers');
const websiteWorkspace=scriptById('ownlybiz-website-workspace-v2-runtime');
assert.doesNotMatch(websiteWorkspace.source,/previousDb|previousSettings|\.apply\(this,arguments\)/,'Website owns no dashboard or settings wrapper chain');
assert.match(websiteWorkspace.source,/function activateWebsiteWorkspace\(\)/,'Website has an explicit activation lifecycle');
assert.match(websiteWorkspace.source,/function deactivateWebsiteWorkspace\(\)/,'Website has an explicit deactivation lifecycle');
assert.match(websiteWorkspace.source,/root\.addEventListener\('ownlybiz:before-dashboard-panel-change'/,'Website owns the canonical cancellable leave boundary');
assert.match(websiteWorkspace.source,/root\.addEventListener\('ownlybiz:dashboard-panel-changed'/,'Website follows the canonical dashboard navigation event');
assert.doesNotMatch(websiteWorkspace.source,/MutationObserver/,'Website lifecycle never polls or observes dashboard markup');
assert.match(html,/window\.OWNLYBIZ_IS_STAGING=true/,'the staging identity fence remains present');
assert.match(shim.source,/root\.OWNLYBIZ_API_URL \|\| root\._OB_BACKEND \|\| root\.OWNLY_API \|\| ''/,'new requests honor the existing runtime API fence without a production fallback');
assert.match(shim.source,/current_password:currentPassword,new_password:newPassword/,'password request uses the backend contract');
assert.doesNotMatch(shim.source,/old_password:/,'password request never uses the obsolete key');
assert.match(shim.source,/Unique clients · unavailable/,'unsupported unique-client analytics are explicit');
assert.match(shim.source,/Not available from current analytics data\./,'unsupported completion and returning-client analytics fail closed');
assert.match(shim.source,/Top Clients by Ended Sessions · All time/,'top-client counts are not mislabeled as revenue');
assert.doesNotMatch(shim.source,/COPY_REPLACEMENTS|replaceRetiredCopy|createTreeWalker/,'Phase 0 never rewrites document-wide text or user content');
assert.doesNotMatch(shim.source,/document\.documentElement/,'Phase 0 does not attach a document-wide mutation observer');
assert.match(shim.source,/observer\.observe\(panel,\{subtree:true,childList:true,characterData:true\}\)/,'analytics maintenance is scoped to its owned panel');
assert.match(html,/>Services & Rates</,'known dashboard chrome uses the retired-package replacement copy');
assert.equal((html.match(/\bid=["']slug-input["']/g)||[]).length,1,'the signup slug field keeps its unique legacy id');
assert.equal((html.match(/\bid=["']settings-slug-input["']/g)||[]).length,1,'dashboard settings owns a distinct slug id');
assert.match(shim.source,/\['language','expertise tags','linkedin','twitter \/ x','website \/ blog','youtube'\]/,'unsupported Profile controls are removed as one bounded set');
assert.match(shim.source,/\['minimum notice','max advance booking','buffer between sessions'\]/,'unsupported Availability controls are removed');
assert.match(shim.source,/\['og \/ social image','canonical url','linkedin insight tag','custom head scripts'\]/,'unsupported SEO controls are removed');

class FakeClassList{
  constructor(values=[]){ this.values=new Set(values); }
  contains(value){ return this.values.has(value); }
  add(value){ this.values.add(value); }
  remove(value){ this.values.delete(value); }
}

class FakeElement{
  constructor({id='',tagName='div',text='',classes=[]}={}){
    this.id=id;
    this.tagName=tagName.toUpperCase();
    this.textContent=text;
    this.value='';
    this.style={};
    this.disabled=false;
    this.nodeType=1;
    this.parentElement=null;
    this.firstChild=null;
    this.classList=new FakeClassList(classes);
    this.attributes=new Map();
    this.listeners=new Map();
    this.removed=false;
    this._queries=new Map();
  }
  setQuery(selector,value){ this._queries.set(selector,value); return this; }
  querySelector(selector){ const value=this._queries.get(selector); return Array.isArray(value)?value[0]||null:value||null; }
  querySelectorAll(selector){ const value=this._queries.get(selector); return Array.isArray(value)?value:value?[value]:[]; }
  setAttribute(name,value){ this.attributes.set(String(name),String(value)); if(name==='id')this.id=String(value); }
  getAttribute(name){ if(name==='id')return this.id||null; return this.attributes.get(String(name))??null; }
  hasAttribute(name){ return this.attributes.has(String(name)); }
  removeAttribute(name){ this.attributes.delete(String(name)); }
  addEventListener(name,handler){ this.listeners.set(name,handler); }
  remove(){ this.removed=true; }
  removeChild(){ this.firstChild=null; }
  closest(){ return null; }
  contains(node){ return node===this; }
  click(){ const handler=this.listeners.get('click'); if(handler)handler({target:this}); }
}

function response(status,body){
  return {ok:status>=200&&status<300,status,json:async()=>body};
}

function makeHarness(){
  const oldPass=new FakeElement({id:'sfield-old-pass',tagName:'input'});
  const newPass=new FakeElement({id:'sfield-new-pass',tagName:'input'});
  const confirmPass=new FakeElement({id:'sfield-confirm-pass',tagName:'input'});
  const passwordStatus=new FakeElement({id:'save-status-password',tagName:'span'});
  const passwordButton=new FakeElement({tagName:'button',text:'Update Password'});
  const securityDescription=new FakeElement({text:'Keep your account safe with a strong password and two-factor authentication.'});
  const fakeSecurityState=new FakeElement({classes:['ssm-coming-soon']});
  const security=new FakeElement({id:'sblock-security'});
  security
    .setQuery('.settings-block-desc',securityDescription)
    .setQuery('.ssm-coming-soon',fakeSecurityState)
    .setQuery('input[type="password"]',[oldPass,newPass,confirmPass])
    .setQuery('button',[passwordButton]);

  const sessionsNav=new FakeElement({text:'Sessions',classes:['db-nav-item']});
  sessionsNav.setAttribute('onclick',"dbNav(this,'sessions')");
  const paymentsNav=new FakeElement({text:'Payments',classes:['db-nav-item']});
  paymentsNav.setAttribute('onclick',"dbNav(this,'payments')");
  const pricingNav=new FakeElement({text:'Pricing & Packages',classes:['db-nav-item']});
  pricingNav.setAttribute('onclick',"dbNav(this,'pricing')");
  const analyticsNav=new FakeElement({text:'Analytics',classes:['db-nav-item']});
  analyticsNav.setAttribute('onclick',"dbNav(this,'analytics')");
  const nav=[sessionsNav,paymentsNav,pricingNav,analyticsNav];
  const analyticsPanel=new FakeElement({id:'db-panel-analytics',classes:['db-tab-panel']});
  const pageTitle=new FakeElement({id:'db-page-title'});
  const slugField=new FakeElement({id:'settings-slug-input',tagName:'input'});
  const slugButton=new FakeElement({id:'settings-slug-save',tagName:'button',text:'Save'});
  const slugStatus=new FakeElement({id:'slug-status',tagName:'span'});
  const liveDomain=new FakeElement({id:'settings-live-domain'});
  const liveDomainStatus=new FakeElement({id:'domain-live-status'});
  const body=new FakeElement({tagName:'body'});
  const documentElement=new FakeElement({tagName:'html'});
  const nodes={
    'sblock-security':security,
    'sfield-old-pass':oldPass,
    'sfield-new-pass':newPass,
    'sfield-confirm-pass':confirmPass,
    'save-status-password':passwordStatus,
    'db-panel-analytics':analyticsPanel,
    'db-page-title':pageTitle,
    'settings-slug-input':slugField,
    'settings-slug-save':slugButton,
    'slug-status':slugStatus,
    'settings-live-domain':liveDomain,
    'domain-live-status':liveDomainStatus,
  };
  const document={
    body,documentElement,readyState:'complete',
    getElementById(id){ return nodes[id]||null; },
    querySelectorAll(selector){
      if(selector==='.db-nav-item')return nav.filter((node)=>!node.removed);
      if(selector==='.db-tab-panel')return [analyticsPanel];
      if(selector==='.settings-nav-item'||selector==='.admin-card-title')return [];
      return [];
    },
    addEventListener(){},
  };
  const stores={getItem(key){ return key==='ob_t'?'token-current':null; }};
  const calls=[];
  const navCalls=[];
  const baseSaveCalls=[];
  const replacements=[];
  const pushes=[];
  const timers=[];
  const observations=[];
  let credentialCurrent=true;
  let fetchImpl=()=>Promise.reject(new Error('unexpected fetch'));
  const root={
    window:null,document,console,Object,Array,Number,String,Boolean,Math,JSON,Promise,isFinite,
    location:{pathname:'/dash/test-expert/packages',search:'?source=test',hash:'#rates'},
    history:{
      state:null,
      replaceState(state,title,url){ replacements.push(url); root.location.pathname='/dash/test-expert/pricing'; },
      pushState(state,title,url){ pushes.push(url); root.location.pathname=url; },
    },
    sessionStorage:stores,localStorage:stores,
    OWNLYBIZ_API_URL:'https://staging-api.example.test/',
    __OB_TEST_HOOKS__:{},
    OB_CLIENT_CONTEXT:{
      token:()=> 'token-current',
      capture:()=>({token:'token-current',principal:'expert-a',credentialGeneration:1}),
      isCurrent:()=>credentialCurrent,
    },
    OwnlyAPI:{},
    dbNav(element,panel){ navCalls.push({element,panel}); },
    settingsNav(){},
    saveSettingsBlock(section){ baseSaveCalls.push(section); return 'base-'+section; },
    addEventListener(){},
    setTimeout(handler,delay){ timers.push({handler,delay}); return timers.length; },
    MutationObserver:class{ constructor(handler){ this.handler=handler; } observe(target,options){ observations.push({target,options,handler:this.handler}); } },
    fetch(url,options){ calls.push({url,options}); return fetchImpl(url,options); },
    setFetch(next){ fetchImpl=next; },
    setCredentialCurrent(next){ credentialCurrent=next; },
  };
  root.window=root;
  return {root,calls,navCalls,baseSaveCalls,replacements,pushes,timers,observations,nodes,securityDescription,fakeSecurityState,passwordButton,paymentsNav,sessionsNav,pricingNav,analyticsNav,analyticsPanel};
}

const harness=makeHarness();
vm.createContext(harness.root);
new vm.Script(shim.source,{filename:'expert-phase0-integrity.js'}).runInContext(harness.root);
const hooks=harness.root.__OB_TEST_HOOKS__.expertPhase0Integrity;
assert(hooks,'focused test hooks are exposed');

assert.deepEqual(harness.replacements,['/dash/test-expert/pricing?source=test#rates'],'legacy Packages deep links are redirected in place');
assert.equal(harness.fakeSecurityState.removed,true,'fake 2FA, device, and account-deletion state is removed');
assert.equal(harness.securityDescription.textContent,'Update your password to keep your account secure.');
assert.equal(harness.nodes['sfield-old-pass'].getAttribute('autocomplete'),'current-password');
assert.equal(harness.nodes['sfield-new-pass'].getAttribute('autocomplete'),'new-password');
assert.equal(harness.nodes['sfield-confirm-pass'].getAttribute('autocomplete'),'new-password');
assert.equal(harness.paymentsNav.getAttribute('role'),'button');
assert.equal(harness.paymentsNav.getAttribute('tabindex'),'0');
assert.equal(harness.paymentsNav.getAttribute('aria-controls'),'db-panel-payments');
assert.equal(harness.observations.length,1,'one observer is installed');
assert.equal(harness.observations[0].target,harness.analyticsPanel,'the observer is limited to the analytics panel');

harness.root.dbNav(harness.sessionsNav,'payments');
assert.equal(harness.navCalls.at(-1).element,harness.paymentsNav,'a positional payment CTA resolves the canonical Payments nav item');
assert.equal(harness.navCalls.at(-1).panel,'payments');
harness.root.dbNav(harness.sessionsNav,'packages');
assert.equal(harness.navCalls.at(-1).element,harness.pricingNav,'a stale Packages target resolves Services & Rates');
assert.equal(harness.navCalls.at(-1).panel,'pricing');

const view=hooks.analyticsView({
  daily:[{revenue:10.25,sessions:1},{revenue:20.25,sessions:2}],
  by_channel:[{channel:'chat',count:2,avg_min:15},{channel:'video',count:1,avg_min:30}],
  top_clients:[{name:'Client One',sessions:2}],
});
assert.equal(view.revenue,'$30.50');
assert.equal(view.sessions,'3');
assert.equal(view.uniqueClients,'—','top-client list length is never presented as a unique-client metric');
assert.equal(view.averageMinutes,'20m');

assert.equal(hooks.validatePasswordInputs('','long-enough','long-enough'),'Enter your current password.');
assert.equal(hooks.validatePasswordInputs('old','short','short'),'New password must be at least 8 characters.');
assert.equal(hooks.validatePasswordInputs('old-password','new-password','different'),'New password and confirmation do not match.');

harness.nodes['sfield-old-pass'].value='old-password';
harness.nodes['sfield-new-pass'].value='new-password';
harness.nodes['sfield-confirm-pass'].value='mismatch';
assert.equal(await harness.root.saveSettingsBlock('security'),false);
assert.equal(harness.calls.length,0,'invalid password input cannot issue a request');
assert.doesNotMatch(harness.nodes['save-status-password'].textContent,/updated/i,'validation cannot report success');

harness.nodes['sfield-confirm-pass'].value='new-password';
harness.root.setFetch(()=>Promise.resolve(response(400,{error:'Current password is incorrect.'})));
assert.equal(await harness.root.saveSettingsBlock('security'),false);
assert.equal(harness.calls.length,1);
assert.equal(harness.nodes['sfield-old-pass'].value,'old-password','failed updates preserve the fields');
assert.doesNotMatch(harness.nodes['save-status-password'].textContent,/updated/i,'HTTP failure cannot report success');

harness.root.setCredentialCurrent(false);
harness.root.setFetch(()=>Promise.resolve(response(200,{success:true})));
assert.equal(await harness.root.saveSettingsBlock('security'),false);
assert.equal(harness.calls.length,2);
assert.equal(harness.nodes['sfield-old-pass'].value,'old-password','an identity change cannot clear password fields');
assert.doesNotMatch(harness.nodes['save-status-password'].textContent,/updated/i,'an identity change cannot report success');

harness.root.setCredentialCurrent(true);
harness.root.setFetch(()=>Promise.resolve(response(200,{success:true})));
assert.equal(await harness.root.saveSettingsBlock('security'),true);
assert.equal(harness.calls.length,3);
const passwordCall=harness.calls.at(-1);
assert.equal(passwordCall.url,'https://staging-api.example.test/api/auth/change-password');
assert.equal(passwordCall.options.method,'POST');
assert.equal(passwordCall.options.headers.Authorization,'Bearer token-current');
assert.deepEqual(JSON.parse(passwordCall.options.body),{current_password:'old-password',new_password:'new-password'});
assert.equal(harness.nodes['sfield-old-pass'].value,'');
assert.equal(harness.nodes['sfield-new-pass'].value,'');
assert.equal(harness.nodes['sfield-confirm-pass'].value,'');
assert.equal(harness.nodes['save-status-password'].textContent,'Password updated.');

const domainLoadStart=harness.calls.length;
harness.root.setFetch((url,options)=>{
  assert.equal(url,'https://staging-api.example.test/api/domains/me');
  assert.equal(options.headers.Authorization,'Bearer token-current');
  return Promise.resolve(response(200,{subdomain:'current-expert',subdomain_url:'current-expert.ownlybiz.com'}));
});
assert.equal(await harness.root.loadDomainSettings(),true);
assert.equal(harness.calls.length,domainLoadStart+1);
assert.equal(harness.nodes['settings-slug-input'].value,'current-expert');
assert.equal(harness.nodes['settings-slug-input'].getAttribute('data-ob-confirmed-slug'),'current-expert');
assert.match(harness.nodes['slug-status'].textContent,/Current URL confirmed/);

harness.nodes['settings-slug-input'].value='new-expert-slug';
const domainSaveStart=harness.calls.length;
harness.root.setFetch((url,options)=>{
  if(options.method==='PUT') return Promise.resolve(response(200,{success:true,slug:'new-expert-slug'}));
  return Promise.resolve(response(200,{subdomain:'new-expert-slug',subdomain_url:'new-expert-slug.ownlybiz.com'}));
});
assert.equal(await harness.root.saveSlug(),true);
const successfulDomainCalls=harness.calls.slice(domainSaveStart);
assert.equal(successfulDomainCalls.length,2,'a subdomain save is followed by an authoritative read-back');
assert.equal(successfulDomainCalls[0].url,'https://staging-api.example.test/api/domains/me/slug');
assert.equal(successfulDomainCalls[0].options.method,'PUT');
assert.deepEqual(JSON.parse(successfulDomainCalls[0].options.body),{slug:'new-expert-slug'});
assert.equal(successfulDomainCalls[1].url,'https://staging-api.example.test/api/domains/me');
assert.equal(successfulDomainCalls[1].options.method,undefined);
assert.equal(harness.root._currentExpert.slug,'new-expert-slug');
assert.match(harness.nodes['slug-status'].textContent,/Saved and confirmed/);

harness.nodes['settings-slug-input'].value='unconfirmed-slug';
const mismatchStart=harness.calls.length;
harness.root.setFetch((url,options)=>Promise.resolve(response(200,options.method==='PUT'
  ? {success:true,slug:'unconfirmed-slug'}
  : {subdomain:'still-old-slug'})));
assert.equal(await harness.root.saveSlug(),false,'a successful write response alone is insufficient');
assert.equal(harness.calls.length,mismatchStart+2,'a mismatched save still performs the required read-back');
assert.doesNotMatch(harness.nodes['slug-status'].textContent,/Saved and confirmed/,'a mismatched server read-back cannot report success');
assert.equal(harness.root._currentExpert.slug,'new-expert-slug','unconfirmed state is not copied into the current expert');

const phase0Owner=harness.root.saveSettingsBlock;
let lateSaveCalls=0;
harness.root.saveSettingsBlock=function(section){ lateSaveCalls+=1; return 'late-'+section; };
assert(harness.timers.length>0,'ownership retention schedules bounded delayed checks');
harness.timers[0].handler();
assert.equal(harness.root.saveSettingsBlock,phase0Owner,'a delayed handler reinstall cannot displace security ownership');
assert.equal(await harness.root.saveSettingsBlock('profile'),'late-profile','the delayed non-security handler remains reachable once');
assert.equal(lateSaveCalls,1);
assert.equal(await harness.root.saveSettingsBlock('security'),false,'security remains owned by the verified password flow');
assert.equal(lateSaveCalls,1,'security never falls through to a delayed legacy handler');

const capturedOwner=harness.root.saveSettingsBlock;
harness.root.saveSettingsBlock=function(section){ return capturedOwner(section); };
hooks.retainSaveSettingsOwnership();
assert.equal(await harness.root.saveSettingsBlock('profile'),'base-profile','a late wrapper that captured Phase 0 falls back once without recursion');
assert.equal(harness.baseSaveCalls.at(-1),'profile');

const adminRequestStart=harness.calls.length;
const adminNavStart=harness.navCalls.length;
harness.root._adminViewingExpertId='target-expert-id';
harness.root.location.pathname='/dash/target-expert/pricing';
harness.analyticsPanel.classList.add('active');
assert.equal(await harness.root.loadAnalytics(),false);
assert.equal(harness.calls.length,adminRequestStart,'admin-view analytics never requests the signed-in expert endpoint');
assert.equal(hooks.analyticsState.status,'admin-unavailable');
assert.equal(harness.analyticsPanel.classList.contains('active'),false,'a direct admin-view analytics load also gates legacy active-panel loaders');
harness.root.dbNav(harness.analyticsNav,'analytics');
assert.equal(harness.navCalls.length,adminNavStart,'admin analytics bypasses every legacy navigation loader');
assert.equal(harness.analyticsPanel.classList.contains('active'),false,'admin unavailable mode keeps legacy active-panel loaders gated off');
assert.equal(harness.analyticsPanel.style.display,'block');
assert.equal(harness.analyticsPanel.getAttribute('data-ob-phase0-admin-unavailable'),'1');
assert.match(hooks.analyticsState.error,/no authoritative admin-target analytics endpoint/);
assert.equal(harness.calls.length,adminRequestStart);
assert.equal(await harness.root.loadDomainSettings(),false,'admin-view domain settings fail closed');
assert.equal(await harness.root.saveSlug(),false,'admin-view subdomain saves fail closed');
assert.equal(harness.calls.length,adminRequestStart,'admin-view domain controls cannot act on the signed-in expert');
delete harness.root._adminViewingExpertId;

const callsBeforeRetiredActions=harness.calls.length;
assert.equal(await harness.root.saveExpertPackages(),false);
assert.equal(await harness.root.OwnlyAPI.delPackage('legacy-package'),false);
assert.equal(harness.calls.length,callsBeforeRetiredActions,'retired package actions cannot issue network requests');

console.log('Expert Phase 0 integrity smoke passed.');
console.log('Analytics truth, scoped copy, domain round-trip, password ownership, navigation, package retirement, and staging boundary verified.');
