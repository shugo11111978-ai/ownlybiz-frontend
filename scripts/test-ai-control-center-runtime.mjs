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

for (const feature of ['help', 'ai_chat', 'website_editor', 'website_copy', 'email_center', 'email_center_media', 'website_media']) {
  assert(runtime.includes(`featureRouteControls('${feature}'`), `${feature} must expose provider and model controls`);
}

assert(runtime.includes('+ Create dedicated connection…'), 'text features must offer an inline dedicated provider connection');
assert(runtime.includes('+ Create dedicated media connection…'), 'media features must offer an inline dedicated provider connection');
assert(runtime.includes('data-ai-dedicated-key'), 'dedicated connection setup must collect its key in a password field');
assert(runtime.includes('window.obAiCreateDedicatedConnection'), 'dedicated feature connections must be created through the shared provider contract');
assert(runtime.includes('Press Save AI settings to store the key securely.'), 'new dedicated keys must remain pending until the explicit settings save');
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

assert((html.match(/victorious-wisdom-production-a6b0\.up\.railway\.app/g) || []).length > 0, 'staging frontend must retain the staging backend host');
assert.equal((html.match(/ownlybiz-backend-production\.up\.railway\.app/g) || []).length, 0, 'staging frontend must not reference the production backend host');

console.log(`AI Control Center frontend smoke passed: ${parsedScripts}/${scriptTags.length} executable scripts parsed, feature model selects, dedicated keys, presets, advanced endpoint, usage table, and staging host boundary.`);
