import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = html.match(/<script id="ownlybiz-expert-phase1-ux-20260913">([\s\S]*?)<\/script>/);
assert(match, 'Personal Assistant runtime must exist');

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function element(id = '') {
  const attributes = new Map();
  const children = [];
  return {
    id,
    hidden: false,
    disabled: false,
    textContent: '',
    value: '',
    firstChild: null,
    scrollHeight: 0,
    scrollTop: 0,
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
    removeAttribute(name) { attributes.delete(name); },
    appendChild(child) { children.push(child);this.firstChild=children[0] || null;return child; },
    removeChild(child) { const index=children.indexOf(child);if(index >= 0) children.splice(index,1);this.firstChild=children[0] || null;return child; },
    contains() { return false; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    focus() {},
  };
}

function response(status, data) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve=done; });
  return { promise, resolve };
}

async function settle() {
  for(let index=0;index<8;index+=1) await new Promise((resolve) => setTimeout(resolve,0));
}

function runtime(fetchImpl) {
  const nodes = new Map();
  const node = (id) => {
    if(!nodes.has(id)) nodes.set(id,element(id));
    return nodes.get(id);
  };
  const submitButton=element('assistant-submit');
  const adapters=[];
  let current={principal:'expert-a',role:'expert',token:'token-a',identityGeneration:1,credentialGeneration:1,controller:new AbortController()};
  function snapshot(scope) {
    return Object.freeze({
      scope,
      principal:current.principal,
      role:current.role,
      token:current.token,
      identityGeneration:current.identityGeneration,
      credentialGeneration:current.credentialGeneration,
      signal:current.controller.signal,
    });
  }
  const contextAuthority={
    capture: snapshot,
    token: () => current.token,
    isCurrent(candidate, options = {}) {
      return Boolean(candidate && !candidate.signal.aborted && candidate.principal === current.principal &&
        candidate.identityGeneration === current.identityGeneration &&
        (!options.exactCredential || candidate.token === current.token && candidate.credentialGeneration === current.credentialGeneration));
    },
    register(name,adapter) { adapters.push(adapter); },
  };
  const opened=[];
  const document={
    readyState:'loading',
    visibilityState:'visible',
    activeElement:null,
    body:element('body'),
    getElementById: node,
    createElement: () => element(),
    querySelector(selector) { return selector === '#ob-guidance-ai-form button[type="submit"]' ? submitButton : null; },
    querySelectorAll() { return []; },
    addEventListener() {},
  };
  const window={
    __OB_TEST_HOOKS__:{},
    OWNLYBIZ_API_URL:'https://staging.example',
    OB_CLIENT_CONTEXT:contextAuthority,
    AbortController,
    Promise,
    crypto:{randomUUID:() => 'request-id'},
    document,
    location:{origin:'https://staging.example',pathname:'/dash/expert-a/overview',search:''},
    navigator:{},
    sessionStorage:storage(),
    localStorage:storage(),
    fetch:fetchImpl,
    open:(...args) => { opened.push(args); },
    addEventListener() {},
    setTimeout,
    clearTimeout,
  };
  const sandbox={window,document,sessionStorage:window.sessionStorage,localStorage:window.localStorage,console,AbortController,Promise,setTimeout,clearTimeout,URLSearchParams};
  vm.runInNewContext(match[1],sandbox,{filename:'personal-assistant-runtime.js'});
  return {
    hooks:window.__OB_TEST_HOOKS__.expertPhase1Ux,
    node,
    opened,
    switchIdentity(next){
      const previous=snapshot('identity-transition');
      current.controller.abort();
      adapters.forEach((adapter) => adapter.teardown && adapter.teardown(previous,{kind:'identity_changed'}));
      current={...next,role:'expert',controller:new AbortController()};
      const changed=snapshot('identity-transition');
      adapters.forEach((adapter) => adapter.changed && adapter.changed(changed,{kind:'identity_changed'}));
    },
  };
}

{
  const calls=[];
  const app=runtime(async (url,init={}) => {
    calls.push({url,method:init.method || 'GET'});
    if(url.includes('/bootstrap?')) return response(200,{schema_version:'personal-assistant.bootstrap.v1',profile:{history_enabled:true},onboarding:{status:'active'}});
    if(url.includes('/conversations/conv-existing?')) return response(200,{messages:[{role:'user',content:'Existing question'},{role:'assistant',content:'Existing answer'}]});
    if(url.endsWith('/conversations') && init.method === 'POST') return response(409,{success:false,error:'Delete a saved conversation before starting another one.',code:'personal_assistant_conversation_limit_reached'});
    if(url.includes('/conversations?limit=20')) return response(200,{conversations:Array.from({length:20},(_,index) => ({id:`conv-${index}`}))});
    if(url.includes('/conversations/conv-existing/messages')) return response(409,{success:false,error:'This conversation reached its saved-turn limit.',code:'personal_assistant_turn_limit_reached'});
    throw new Error(`Unexpected request: ${init.method || 'GET'} ${url}`);
  });

  await app.hooks.loadAssistantBootstrap(true,false);
  app.hooks.openConversation('conv-existing');
  await settle();
  const before=app.hooks.assistantState();
  assert.equal(before.conversationId,'conv-existing');
  assert.deepEqual(before.messages.map(({role,content}) => ({role,content})),[
    {role:'user',content:'Existing question'},
    {role:'assistant',content:'Existing answer'},
  ]);

  app.hooks.newConversation();
  await settle();
  const afterConversationLimit=app.hooks.assistantState();
  assert.equal(afterConversationLimit.conversationId,'conv-existing','the 100-conversation rejection preserves the current conversation');
  assert.deepEqual(afterConversationLimit.messages,before.messages,'the 100-conversation rejection preserves every visible message');
  assert.match(app.node('ob-guidance-ai-status').textContent,/100 saved conversations/i);
  assert.match(app.node('ob-guidance-ai-status').textContent,/current conversation is still here/i);
  assert.equal(app.node('ob-guidance-history').hidden,false,'the recovery path reveals deletable history');

  app.node('ob-guidance-ai-input').value='Please continue';
  app.hooks.submitAiQuestion();
  await settle();
  const afterTurnLimit=app.hooks.assistantState();
  assert.equal(afterTurnLimit.conversationId,'conv-existing');
  assert.deepEqual(afterTurnLimit.messages,before.messages,'the rejected 200th-turn request does not strand an unsaved user bubble');
  assert.equal(app.node('ob-guidance-ai-input').value,'Please continue','the rejected question returns to the composer');
  assert.match(app.node('ob-guidance-ai-status').textContent,/200 saved turns/i);
  assert(calls.some((call) => call.url.includes('/conversations?limit=20')),'conversation-cap recovery loads History');
}

{
  const firstLookup=deferred();
  let dashboardLookups=0;
  const app=runtime(async (url) => {
    if(!url.endsWith('/api/experts/me/dashboard')) throw new Error(`Unexpected request: ${url}`);
    dashboardLookups+=1;
    if(dashboardLookups === 1) return firstLookup.promise;
    if(dashboardLookups === 2) return response(200,{profile:{slug:'expert-b'}});
    return response(200,{profile:{slug:'expert-c'}});
  });

  assert.equal(app.hooks.openAssistantAction('open-website-view'),true);
  app.switchIdentity({principal:'expert-b',token:'token-b',identityGeneration:2,credentialGeneration:2});
  firstLookup.resolve(response(200,{profile:{slug:'expert-a'}}));
  await settle();
  assert.equal(app.opened.length,0,'an A-account response cannot open a website after switching to B');

  assert.equal(app.hooks.openAssistantAction('open-website-view'),true);
  await settle();
  assert.deepEqual(app.opened[0],["https://staging.example/expert-b",'_blank','noopener,noreferrer']);
  assert.equal(dashboardLookups,2);
  app.hooks.openAssistantAction('open-website-view');
  assert.equal(dashboardLookups,2,'the current exact-credential cache avoids a duplicate lookup');
  assert.equal(app.opened.length,2);

  app.switchIdentity({principal:'expert-c',token:'token-c',identityGeneration:3,credentialGeneration:3});
  app.hooks.openAssistantAction('open-website-view');
  await settle();
  assert.equal(dashboardLookups,3,'identity teardown clears the previous account slug cache');
  assert.deepEqual(app.opened[2],["https://staging.example/expert-c",'_blank','noopener,noreferrer']);
}

console.log('Personal Assistant conversation-boundary and exact-account website tests passed.');
