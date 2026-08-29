import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
let parsedScripts = 0;
for (const [index, tag] of scriptTags.entries()) {
  const attrs = tag[1] || '';
  const type = (attrs.match(/\btype=["']([^"']+)["']/i) || [])[1] || '';
  if (type && !/(javascript|ecmascript|module)/i.test(type)) continue;
  try {
    new Function(tag[2] || '');
    parsedScripts += 1;
  } catch (err) {
    throw new Error(`Inline script ${index + 1} failed to parse: ${err.message}`);
  }
}

const match = html.match(/<script id="ob-ai-website-editor-20260517">([\s\S]*?)<\/script>/);
assert(match, 'AI Control Center runtime script must exist');
const runtime = match[1];

new Function(runtime);

function runtimeSection(start, end) {
  const left = runtime.indexOf(start);
  assert(left >= 0, `runtime section starts at ${start}`);
  const right = runtime.indexOf(end, left + start.length);
  assert(right >= 0, `runtime section ends at ${end}`);
  return runtime.slice(left, right);
}

for (const feature of ['help', 'human_reply_assistant', 'ai_chat', 'website_editor', 'website_copy', 'email_center', 'email_center_media', 'website_media']) {
  assert(runtime.includes(`featureRouteControls('${feature}'`), `${feature} must expose provider and model controls`);
}

assert(runtime.includes('+ Create dedicated connection…'), 'text features must offer an inline dedicated provider connection');
assert(runtime.includes('+ Create dedicated media connection…'), 'media features must offer an inline dedicated provider connection');
assert(runtime.includes('data-ai-dedicated-key'), 'dedicated connection setup must collect its key in a password field');
assert(runtime.includes('window.obAiCreateDedicatedConnection'), 'dedicated feature connections must be created through the shared provider contract');
assert(runtime.includes('Press the relevant save action to store the key securely.'), 'new dedicated keys must remain pending until the relevant explicit save');
assert(runtime.includes("autocomplete=\"new-password\" spellcheck=\"false\""), 'dedicated key fields must use secret-safe browser attributes');
assert(runtime.includes("box.children.length >= 7"), 'feature-level creation must respect the backend provider limit');
assert(runtime.includes('key ready to save'), 'unsaved dedicated keys must have a clear state label');
assert(runtime.includes("request('/api/ai/admin/models?provider_id='"), 'model selectors must load provider-backed catalogs');
assert(runtime.includes('data-ai-feature-model'), 'feature models must use select-backed persisted values');
assert(runtime.includes('data-ai-feature-temperature'), 'response-style presets must persist by feature');
assert(runtime.includes('data-ai-feature-tokens'), 'response-length presets must persist by feature');
assert(runtime.includes('ob-ai-expert-usage-body'), 'per-expert AI usage table must render');
assert(runtime.includes('Other AI credits'), 'usage view must separate AI Chat tokens from website/email credits');
assert(runtime.includes('<summary>Advanced connection details</summary>'), 'endpoint URL must remain in advanced setup');
assert(!runtime.includes("getElementById('ai-chat-source')"), 'legacy free-text AI Chat source control must not drive the redesigned runtime');
assert(!runtime.includes("getElementById('ai-chat-model')"), 'legacy free-text AI Chat model input must not drive the redesigned runtime');

assert(runtime.includes("featureCard('Dashboard Help Assistant'"), 'owner UI must name the dashboard-only Help Assistant');
assert(runtime.includes("featureCard('Human Reply Assistant'"), 'owner UI must identify the human-reviewed drafting feature');
assert(runtime.includes("featureCard('Automatic AI Chat'"), 'owner UI must name automatic paid-session chat separately');
assert(runtime.includes('id="ob-ai-save-help-assistant"'), 'Help Assistant must have its own save action');
assert(runtime.includes('id="ob-ai-save-human-reply-assistant"'), 'Human Reply Assistant must have its own save action');
assert(runtime.includes('id="ob-ai-save-automatic-chat"'), 'Automatic AI Chat must have its own save action');
assert(runtime.includes('Save Help Assistant stores only its enabled state and guidelines.'), 'Help Assistant must explain that provider and model changes use the shared save action');

const helpPayload = runtimeSection('function collectHelpAssistantPayload(){', 'function collectAutomaticAiChatPayload(){');
assert.match(helpPayload, /ai_assistant_enabled:/, 'Help Assistant payload must carry its own enabled state');
assert.match(helpPayload, /ai_system_instructions:/, 'Help Assistant payload must carry only its own guidance');
assert.doesNotMatch(helpPayload, /\beditor\s*:/, 'Help Assistant save must omit editor settings');
assert.doesNotMatch(helpPayload, /ai_chat/, 'Help Assistant save must omit Automatic AI Chat fields');
const helpPayloadResult = new Function('document', `${helpPayload}; return collectHelpAssistantPayload();`)({
  getElementById(id) {
    return id === 'ai-enabled' ? { checked: true } : { value: 'Dashboard-only guidance' };
  }
});
assert.deepEqual(helpPayloadResult, {
  ai_assistant_enabled: '1',
  ai_system_instructions: 'Dashboard-only guidance'
}, 'Help Assistant must execute as a top-level partial payload with no editor fields');

const automaticChatPayload = runtimeSection('function collectAutomaticAiChatPayload(){', 'function collectHumanReplyAssistantPayload(){');
assert.match(automaticChatPayload, /feature_scope: 'ai_chat'/, 'Automatic AI Chat payload must declare its backend scope');
assert.match(automaticChatPayload, /ai_chat_system_instructions:/, 'Automatic AI Chat payload must carry chat guidance');
assert.match(automaticChatPayload, /scopedProviderUpsert\('ai_chat',routes\.ai_chat\)/, 'Automatic AI Chat must include only its newly created dedicated provider');
assert.doesNotMatch(automaticChatPayload, /providers: collectProviders\(\)/, 'Automatic AI Chat must not replace the shared provider catalog');
assert.doesNotMatch(automaticChatPayload, /ai_assistant_enabled/, 'Automatic AI Chat save must not submit the Help Assistant enabled state');
const automaticChatPayloadResult = new Function(
  'document', 'clean', 'savedEditorConfig', 'scopedProviderUpsert',
  `${automaticChatPayload}; return collectAutomaticAiChatPayload();`
)(
  {
    getElementById(id) {
      const values = {
        'aiw-route-ai-chat': 'luna-chat',
        'aiw-ai-chat-instructions': 'Automatic-chat-only guidance'
      };
      return { value: values[id] || '' };
    },
    querySelector(selector) {
      const values = {
        '[data-ai-feature-model="ai_chat"]': 'chat-model',
        '[data-ai-feature-temperature="ai_chat"]': '0.4',
        '[data-ai-feature-tokens="ai_chat"]': '1200'
      };
      return { value: values[selector] || '' };
    }
  },
  value => String(value || '').trim(),
  () => ({
    feature_routes: { help: 'master_text', website_editor: 'editor-route' },
    feature_models: { help: 'help-model', website_editor: 'editor-model' },
    feature_tuning: { help: { temperature: '0.2', max_tokens: '900' } }
  }),
  () => null
);
assert.equal(automaticChatPayloadResult.editor.feature_scope, 'ai_chat');
assert.deepEqual(Object.keys(automaticChatPayloadResult.editor.feature_routes), ['ai_chat'], 'Automatic AI Chat must submit only its route');
assert.deepEqual(Object.keys(automaticChatPayloadResult.editor.feature_models), ['ai_chat'], 'Automatic AI Chat must submit only its model');
assert.deepEqual(Object.keys(automaticChatPayloadResult.editor.feature_tuning), ['ai_chat'], 'Automatic AI Chat must submit only its tuning');
assert.equal(automaticChatPayloadResult.editor.feature_routes.ai_chat, 'luna-chat', 'Automatic AI Chat save must carry its selected route');
assert.equal(automaticChatPayloadResult.editor.feature_models.ai_chat, 'chat-model', 'Automatic AI Chat save must carry its selected model');
assert.equal('providers' in automaticChatPayloadResult.editor, false, 'Automatic AI Chat must preserve the shared provider catalog by omitting it');
assert.equal('provider_upsert' in automaticChatPayloadResult.editor, false, 'ordinary Automatic AI Chat saves must not rewrite a provider');
assert.equal('ai_assistant_enabled' in automaticChatPayloadResult, false, 'Automatic AI Chat execution must omit Help Assistant state');

const automaticDedicatedPayloadResult = new Function(
  'document', 'clean', 'savedEditorConfig', 'scopedProviderUpsert',
  `${automaticChatPayload}; return collectAutomaticAiChatPayload();`
)(
  {
    getElementById(id) {
      const values = { 'aiw-route-ai-chat': 'dedicated-ai-chat', 'aiw-ai-chat-instructions': 'Automatic guidance' };
      return { value: values[id] || '' };
    },
    querySelector(selector) {
      const values = {
        '[data-ai-feature-model="ai_chat"]': 'dedicated-model',
        '[data-ai-feature-temperature="ai_chat"]': '0.2',
        '[data-ai-feature-tokens="ai_chat"]': '900'
      };
      return { value: values[selector] || '' };
    }
  },
  value => String(value || '').trim(),
  () => ({}),
  (feature, routeId) => feature === 'ai_chat' && routeId === 'dedicated-ai-chat'
    ? { id: 'dedicated-ai-chat', kind: 'chat', model: 'dedicated-model', api_key: 'dedicated-secret' }
    : null
);
assert.deepEqual(automaticDedicatedPayloadResult.editor.provider_upsert, {
  id: 'dedicated-ai-chat', kind: 'chat', model: 'dedicated-model', api_key: 'dedicated-secret'
}, 'Automatic AI Chat dedicated creation must send one narrow provider upsert');

const humanReplyPayload = runtimeSection('function collectHumanReplyAssistantPayload(){', 'function rememberAdminAiConfig(');
assert.match(humanReplyPayload, /feature_scope: 'human_reply_assistant'/, 'Human Reply Assistant payload must declare its backend scope');
assert.match(humanReplyPayload, /human_reply_assistant_system_instructions:/, 'Human Reply Assistant payload must carry its own guidance');
assert.match(humanReplyPayload, /scopedProviderUpsert\('human_reply_assistant',routes\.human_reply_assistant\)/, 'Human Reply Assistant must include only its newly created dedicated provider');
assert.doesNotMatch(humanReplyPayload, /providers: collectProviders\(\)/, 'Human Reply Assistant must not replace the shared provider catalog');
assert.doesNotMatch(humanReplyPayload, /ai_chat_system_instructions:/, 'Human Reply Assistant save must not overwrite Automatic AI Chat guidance');
assert.doesNotMatch(humanReplyPayload, /ai_assistant_enabled/, 'Human Reply Assistant save must not submit Dashboard Help state');
const humanReplyPayloadResult = new Function(
  'document', 'clean', 'savedEditorConfig', 'scopedProviderUpsert',
  `${humanReplyPayload}; return collectHumanReplyAssistantPayload();`
)(
  {
    getElementById(id) {
      const values = {
        'aiw-route-human-reply-assistant': 'human-drafts',
        'aiw-human-reply-instructions': 'Expert-reviewed-draft-only guidance'
      };
      return { value: values[id] || '' };
    },
    querySelector(selector) {
      const values = {
        '[data-ai-feature-model="human_reply_assistant"]': 'draft-model',
        '[data-ai-feature-temperature="human_reply_assistant"]': '0.3',
        '[data-ai-feature-tokens="human_reply_assistant"]': '800'
      };
      return { value: values[selector] || '' };
    }
  },
  value => String(value || '').trim(),
  () => ({
    feature_routes: { ai_chat: 'automatic-route', website_editor: 'editor-route' },
    feature_models: { ai_chat: 'automatic-model', website_editor: 'editor-model' },
    feature_tuning: { ai_chat: { temperature: '0.4', max_tokens: '1200' } }
  }),
  () => null
);
assert.equal(humanReplyPayloadResult.editor.feature_scope, 'human_reply_assistant');
assert.deepEqual(Object.keys(humanReplyPayloadResult.editor.feature_routes), ['human_reply_assistant'], 'Human Reply Assistant must submit only its route');
assert.deepEqual(Object.keys(humanReplyPayloadResult.editor.feature_models), ['human_reply_assistant'], 'Human Reply Assistant must submit only its model');
assert.deepEqual(Object.keys(humanReplyPayloadResult.editor.feature_tuning), ['human_reply_assistant'], 'Human Reply Assistant must submit only its tuning');
assert.equal(humanReplyPayloadResult.editor.feature_routes.human_reply_assistant, 'human-drafts', 'Human Reply Assistant save must carry its selected route');
assert.equal(humanReplyPayloadResult.editor.feature_models.human_reply_assistant, 'draft-model', 'Human Reply Assistant save must carry its selected model');
assert.equal(humanReplyPayloadResult.editor.human_reply_assistant_system_instructions, 'Expert-reviewed-draft-only guidance', 'Human Reply Assistant save must carry only its guidance');
assert.equal('providers' in humanReplyPayloadResult.editor, false, 'Human Reply Assistant must preserve the shared provider catalog by omitting it');
assert.equal('provider_upsert' in humanReplyPayloadResult.editor, false, 'ordinary Human Reply Assistant saves must not rewrite a provider');
assert.equal('ai_chat_system_instructions' in humanReplyPayloadResult.editor, false, 'Human Reply Assistant execution must omit Automatic AI Chat guidance');

const providerScopeHelpers = runtimeSection('function providerFromCard(card){', 'function providerFromUi(providerId){');
function providerCardFixture(feature, values) {
  const fields = Object.entries(values).map(([name, value]) => ({
    value,
    getAttribute(attribute) { return attribute === 'data-ai-field' ? name : ''; }
  }));
  const attributes = { 'data-ai-scoped-provider-feature': feature };
  const keyState = { textContent: 'key ready to save' };
  return {
    fields,
    attributes,
    keyState,
    querySelectorAll(selector) { return selector === '[data-ai-field]' ? fields : []; },
    querySelector(selector) {
      if (selector === '[data-ai-field="api_key"]') return fields.find(field => field.getAttribute('data-ai-field') === 'api_key') || null;
      if (selector === '[data-ai-provider-key-state]') return keyState;
      return null;
    },
    getAttribute(name) { return attributes[name] || ''; },
    removeAttribute(name) { delete attributes[name]; }
  };
}
const automaticCard = providerCardFixture('ai_chat', {
  id: 'auto-dedicated', kind: 'chat', model: 'auto-model', api_key: 'auto-secret'
});
const staleAutomaticCard = providerCardFixture('ai_chat', {
  id: 'auto-unselected', kind: 'chat', model: 'old-auto-model', api_key: 'unsaved-auto-secret'
});
const humanCard = providerCardFixture('human_reply_assistant', {
  id: 'human-dedicated', kind: 'chat', model: 'human-model', api_key: 'human-secret'
});
const providerScopeRuntime = new Function(
  'document', 'clean',
  `${providerScopeHelpers}; return { scopedProviderUpsert, clearScopedProviderUpsert };`
)(
  { querySelectorAll: () => [staleAutomaticCard, automaticCard, humanCard] },
  value => String(value || '').trim()
);
assert.equal(providerScopeRuntime.scopedProviderUpsert('ai_chat', 'auto-dedicated').id, 'auto-dedicated');
assert.equal(providerScopeRuntime.scopedProviderUpsert('ai_chat', 'human-dedicated'), null, 'Automatic AI Chat must not send the Human provider');
providerScopeRuntime.clearScopedProviderUpsert('ai_chat', 'auto-dedicated');
assert.equal(automaticCard.fields.find(field => field.getAttribute('data-ai-field') === 'api_key').value, '', 'only the saved scoped key may be cleared');
assert.equal(staleAutomaticCard.fields.find(field => field.getAttribute('data-ai-field') === 'api_key').value, 'unsaved-auto-secret', 'an unselected pending provider must survive the scoped save');
assert.equal(humanCard.fields.find(field => field.getAttribute('data-ai-field') === 'api_key').value, 'human-secret', 'a scoped save must preserve unrelated pending provider secrets');
assert.equal(humanCard.getAttribute('data-ai-scoped-provider-feature'), 'human_reply_assistant', 'a scoped save must preserve another feature pending state');

const sharedPayload = runtimeSection('function collectProviderAndOtherFeaturePayload(){', 'function collectHelpAssistantPayload(){');
assert.match(sharedPayload, /mergeSavedChatFeatureFields\(collectFeatureRoutes\(\), previousEditor\.feature_routes\)/, 'shared feature save must retain saved Human Reply Assistant and Automatic AI Chat routes');
assert.match(runtime, /\['human_reply_assistant','ai_chat'\]\.forEach/, 'shared feature save must protect both independent chat feature configurations');
assert.doesNotMatch(sharedPayload, /ai_assistant_enabled/, 'shared provider save must not overwrite Help Assistant enabled state');
assert.doesNotMatch(sharedPayload, /ai_chat_system_instructions:/, 'shared provider save must not overwrite Automatic AI Chat guidance');
assert.doesNotMatch(sharedPayload, /human_reply_assistant_system_instructions:/, 'shared provider save must not overwrite Human Reply Assistant guidance');

assert(html.includes('<h3 id="ob-ra-title">Human Reply Assistant</h3>'), 'expert settings must name the human-reviewed Reply Assistant');
assert(html.includes('Human Reply Assistant is the separate expert-reviewed drafting feature above.'), 'expert settings must explain the human-review boundary');
const humanReplyMarkup = html.slice(html.indexOf('<section id="ob-reply-knowledge-manager"'), html.indexOf('<div id="ob-expert-ai-settings-host"'));
assert.doesNotMatch(humanReplyMarkup, /ob-ra-(?:gate-auto-send|auto-send-consent|auto-send-version|auto-send-status)/, 'Human Reply Assistant must not display Automatic AI Chat consent controls');
assert(html.includes('id="ob-expert-ai-auto-send-consent"'), 'Automatic AI Chat must own the visible automatic-reply consent checkbox');
assert(html.includes("api('/ai/expert-chat/consent',{method:'PUT',body:body})"), 'Automatic AI Chat consent must use its dedicated endpoint');
assert(html.includes('Human Reply Assistant choices do not change it.'), 'Automatic AI Chat consent must explain that human drafting settings cannot change it');

assert((html.match(/ownlybiz-backend-production\.up\.railway\.app/g) || []).length > 0, 'production frontend must retain the production backend host');
assert.equal((html.match(/victorious-wisdom-production-a6b0\.up\.railway\.app/g) || []).length, 0, 'production frontend must not reference the staging backend host');

console.log(`AI Control Center frontend smoke passed: ${parsedScripts}/${scriptTags.length} executable scripts parsed, feature model selects, dedicated keys, presets, advanced endpoint, usage table, and production host boundary.`);
