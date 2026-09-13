import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function section(pattern, label) {
  const match = html.match(pattern);
  assert(match, `${label} must exist`);
  return match[0];
}

const runtime = section(
  /<script id="ownlybiz-website-workspace-v2-runtime">([\s\S]*?)<\/script>/,
  'Website workspace v2 runtime',
);
const styles = section(
  /<style id="ownlybiz-website-workspace-v2-style">([\s\S]*?)<\/style>/,
  'Website workspace v2 styles',
);
const surfaceCatalogSource = section(/var SURFACES=\{[\s\S]*?\n  \};/, 'Website surface catalog');
const presetCatalogSource = section(/var TEMPLATE_PRESETS=\[[\s\S]*?\n  \];/, 'Website template catalog');
const collectDocumentSource = runtime.slice(runtime.indexOf('function collectDocument()'), runtime.indexOf('function compatibilityPayload('));

assert.equal((html.match(/id="ownlybiz-website-workspace-v2-runtime"/g) || []).length, 1, 'one Website workspace runtime is installed');
assert.equal((html.match(/id="ob-guidance-drawer"/g) || []).length, 1, 'Website reuses the single Personal Assistant drawer');
assert.doesNotMatch(runtime + styles, /kajabi/i, 'Website workspace contains no competitor naming or copied template labels');
assert.doesNotMatch(runtime, /victorious-wisdom|railway\.app|https:\/\/[^'"\s]+ownlybiz\.com/i, 'Website persistence and preview runtime contains no hard-coded production endpoint');
assert.doesNotMatch(runtime, /\b(?:Blog|Funnels?|A\/B|Template marketplace)\b/i, 'unsupported suite features are not presented');
assert.match(runtime, /Domain purchase and transfer are not offered here/, 'the domain boundary is honest rather than a fake feature');

const surfaces = vm.runInNewContext(
  `(${surfaceCatalogSource.replace(/^var SURFACES=/, '').replace(/;$/, '')})`,
  Object.create(null),
);
assert.deepEqual(
  Object.keys(surfaces),
  ['overview', 'design', 'pages', 'navigation', 'media', 'domains', 'seo'],
  'the workspace exposes exactly the truthful Website information architecture',
);
assert.deepEqual(
  Object.values(surfaces).map((item) => item.label),
  ['Overview', 'Design & templates', 'Pages', 'Menu', 'Media', 'Domains', 'Search & analytics'],
);
for (const surface of Object.keys(surfaces)) {
  assert(runtime.includes(`data-ob-website-surface=\"'+name+'\"`) || runtime.includes(`website.'+name`), `${surface} participates in contextual surface routing`);
}
assert.match(runtime, /setAttribute\('role','tablist'\)/);
assert.match(runtime, /setAttribute\('role','tabpanel'\)/);
assert.match(runtime, /ArrowLeft','ArrowRight','Home','End/, 'tabs support standard keyboard navigation');
assert.match(runtime, /obPhase1OpenGuidance/, 'Personal Assistant remains available inside Website');
assert.match(runtime, /root\.obOpenWebsiteSurface=function/, 'assistant actions can open an exact Website surface');
assert.match(runtime, /ownlybiz:website-surface/, 'surface changes are observable by contextual guidance');

const presets = vm.runInNewContext(
  `(${presetCatalogSource.replace(/^var TEMPLATE_PRESETS=/, '').replace(/;$/, '')})`,
  Object.create(null),
);
assert.equal(presets.length, 4, 'four original starting points are available');
assert.equal(new Set(presets.map((item) => item.id)).size, 4, 'each starting point has a stable unique ID');
assert.deepEqual(new Set(presets.map((item) => item.template_id)), new Set(['ownly-practice-focus-v1', 'ownly-field-journal-v1']));
assert.deepEqual(new Set(presets.map((item) => item.renderer_family)), new Set(['practice-focus', 'field-journal']), 'two genuinely separate renderer families exist');
assert(presets.every((item) => ['warm', 'ocean', 'forest', 'midnight'].includes(item.palette_id)), 'every preset uses a backend-supported palette ID');
assert(presets.every((item) => item.name && item.variant && item.description.length > 45), 'every template has meaningful original copy');
for (const preset of presets) assert(styles.includes(`[data-preset="${preset.id}"]`) || styles.includes(`ob-site-preset-${preset.id}`), `${preset.id} has a deliberate preview or public renderer treatment`);
assert.match(styles, /ob-site-template-practice-focus/);
assert.match(styles, /ob-site-template-field-journal/);
assert.match(styles, /ob-site-preset-field-journal-dark/);
assert.match(runtime, /state\.selectedPreset=preset\.id/);
assert.match(runtime, /markDirty\(\);return designForPreset/, 'template selection becomes an explicit unsaved website change');

function sourceOf(name, nextName) {
  const start = runtime.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  const end = runtime.indexOf(`function ${nextName}(`, start);
  assert(end > start, `${nextName} must follow ${name}`);
  return runtime.slice(start, end).trim();
}

const normalizeBaseSource = sourceOf('normalizeBase', 'nonProductionEnvironment');
const nonProductionSource = sourceOf('nonProductionEnvironment', 'resolveApiBase');
const resolveApiSource = sourceOf('resolveApiBase', 'apiBase');
const resolver = vm.runInNewContext(
  `(() => { const clean=(value)=>String(value==null?'':value).replace(/[\\u0000-\\u001f\\u007f]/g,' ').replace(/\\s+/g,' ').trim(); ${normalizeBaseSource}; ${nonProductionSource}; ${resolveApiSource}; return resolveApiBase; })()`,
  { URL },
);
const actualStagingBackend = 'https://victorious-wisdom-production-a6b0.up.railway.app';
assert.equal(
  resolver(
    {
      OWNLYBIZ_IS_STAGING: true,
      OWNLYBIZ_PROD_BACKEND: actualStagingBackend,
      OWNLYBIZ_API_URL: actualStagingBackend,
      _OB_BACKEND: actualStagingBackend,
    },
    { origin: 'https://ownlybiz-staging.vercel.app', hostname: 'ownlybiz-staging.vercel.app' },
  ),
  actualStagingBackend,
  'the explicitly configured staging API remains authoritative despite the legacy PROD_BACKEND name',
);
assert.equal(
  resolver(
    { OWNLYBIZ_IS_STAGING: true, OWNLYBIZ_WEBSITE_API_URL: 'javascript:alert(1)' },
    { origin: 'https://ownlybiz-staging.vercel.app', hostname: 'ownlybiz-staging.vercel.app' },
  ),
  'https://ownlybiz-staging.vercel.app',
  'invalid protocols fail closed to the current environment',
);

const publicUrlSource = sourceOf('resolvePublicPreviewUrl', 'safeBackendPublicUrl');
const safeBackendSource = sourceOf('safeBackendPublicUrl', 'publicPreviewUrl');
const publicHelpers = vm.runInNewContext(
  `(() => { const clean=(value)=>String(value==null?'':value).replace(/[\\u0000-\\u001f\\u007f]/g,' ').replace(/\\s+/g,' ').trim(); const safeSlug=(value)=>clean(value).toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80); ${normalizeBaseSource}; ${nonProductionSource}; ${publicUrlSource}; ${safeBackendSource}; return {resolvePublicPreviewUrl,safeBackendPublicUrl}; })()`,
  { URL, encodeURIComponent },
);
const stagingLocation = { origin: 'https://ownlybiz-staging.vercel.app', hostname: 'ownlybiz-staging.vercel.app' };
assert.equal(publicHelpers.resolvePublicPreviewUrl(stagingLocation, 'Dr. Example'), 'https://ownlybiz-staging.vercel.app/dr-example');
assert.equal(publicHelpers.safeBackendPublicUrl('https://ownlybiz-staging.vercel.app/dr-example', { OWNLYBIZ_IS_STAGING: true }, stagingLocation), 'https://ownlybiz-staging.vercel.app/dr-example');
assert.equal(publicHelpers.safeBackendPublicUrl('https://expert.example.com', { OWNLYBIZ_IS_STAGING: true }, stagingLocation), '', 'staging never opens a cross-environment live/custom domain');
assert.equal(publicHelpers.safeBackendPublicUrl('https://expert.example.com', {}, { origin: 'https://ownlybiz.com', hostname: 'ownlybiz.com' }), 'https://expert.example.com', 'production may use the backend-authoritative connected live URL');
assert.match(runtime, /publication\.public_url \|\| state\.publication\.candidate_public_url/);

assert.match(runtime, /requestJson\('\/api\/website\/me'/);
assert.match(runtime, /method:'PATCH',body:Object\.assign\(\{base_revision:state\.revision,changes:doc\}/);
assert.match(runtime, /acknowledgement:'changes_go_live_immediately'/);
assert.match(runtime, /requestJson\('\/api\/website\/me\/publication',\{method:'POST'/);
assert.match(runtime, /requestJson\('\/api\/website\/me\/publication',\{method:'DELETE'/);
assert.match(runtime, /requestJson\('\/api\/auth\/me',\{timeout:16000\}/, 'legacy data has a narrow read compatibility path');
assert.doesNotMatch(runtime, /requestJson\('\/api\/auth\/me',\{method:'PUT'/, 'compatibility mode never bypasses revision or live-change acknowledgement');
assert.match(runtime, /No legacy write was attempted|no legacy write was attempted/i);
assert.match(runtime, /endpointUnavailable\(error\)/, 'fallback occurs only for explicit endpoint absence');
assert.match(runtime, /\[404,405,501\]/);
assert.match(runtime, /error && error\.code === 'website_revision_conflict'/, 'only the authoritative conflict code receives stale-revision recovery copy');
assert.match(runtime, /clean\(error && error\.message\)/, 'other readiness and acknowledgement conflicts retain backend guidance');
assert.doesNotMatch(collectDocumentSource, /schema_version\s*:/);
assert.doesNotMatch(collectDocumentSource, /template_version\s*:/);
assert.doesNotMatch(collectDocumentSource, /renderer_family\s*:/, 'server-projected design fields are not patched');
assert.match(collectDocumentSource, /custom_pages:mergeCustomPages/);
assert.match(runtime, /obCollectWebsiteContentPages/, 'existing custom-page editor and plan controls remain connected');
assert.match(runtime, /obLoadContentPagesEditor/);
assert.match(runtime, /custom_page_limit|custom_pages_limit/, 'facade capabilities continue driving the existing custom-page plan gate');
const entitlementSource = sourceOf('customPageEntitlement', 'fillEditor');
const customPageEntitlement = vm.runInNewContext(
  `(() => { const clean=(value)=>String(value==null?'':value).trim(); ${entitlementSource}; return customPageEntitlement; })()`,
  Object.create(null),
);
assert.equal(
  JSON.stringify(customPageEntitlement({ custom_pages: { status: 'available', plan: 'scale', limit: 25, used: 3 } }, '')),
  JSON.stringify({ plan: 'scale', limit: 25, status: 'available' }),
  'nested facade custom-page capability preserves the expert plan and cap',
);
assert.match(runtime, /custom_sections:clone\(existing\.custom_sections\)/, 'AI/custom sections are retained');

const mergePagesSource = sourceOf('mergeCustomPages', 'collectCredentials');
const mergePages = vm.runInNewContext(`(() => { ${mergePagesSource}; return mergeCustomPages; })()`, Object.create(null));
const mergedPages = mergePages(
  [{ id: 'p1', title: 'Old', untouched: 'keep', sections: [{ id: 's1', image_alt: 'Keep alt', body: 'Old' }, { id: 's2', body: 'Second' }] }],
  [{ id: 'p1', title: 'New', sections: [{ id: 's1', body: 'New' }] }],
);
assert.equal(mergedPages[0].untouched, 'keep');
assert.equal(mergedPages[0].sections[0].image_alt, 'Keep alt');
assert.equal(mergedPages[0].sections[1].id, 's2', 'unmodeled server page sections survive editor round-trips');

assert.match(runtime, /state\.legacyProfile=Object\.assign\(\{\},root\._websiteData \|\| \{\},state\.legacyProfile \|\| \{\}\)/, 'facade loading preserves rates and unrelated public-renderer profile fields');
assert.doesNotMatch(runtime, /contact_email \|\| user\.email|wc\.contact_email \|\| user\.email/, 'private account email never becomes public contact implicitly');
assert.match(runtime, /Save live changes/);
assert.match(runtime, /View live site/);
assert.match(runtime, /Save draft/);
assert.match(runtime, /Preview draft/);
assert.match(runtime, /Publish website/);
assert.match(runtime, /iframe[^>]*sandbox=\"\"/);
assert.match(runtime, /frame\.setAttribute\('sandbox',''\)/);
assert.match(runtime, /frame\.srcdoc=previewDocumentHtml/);
assert.match(runtime, /Content-Security-Policy/);
assert.doesNotMatch(section(/function previewDocumentHtml\([\s\S]*?\n  \}/, 'scriptless draft renderer'), /<script|javascript:/i, 'the draft preview renderer contains no script execution path');
assert.match(runtime, /exactCredential:true/, 'website requests retain exact identity fencing');
assert.match(runtime, /Account changed while the website request was in progress/);
assert.match(runtime, /OB_CLIENT_CONTEXT\.register\('website-workspace-v2'/, 'identity transitions scrub and reload website-private state');

console.log('Website workspace v2 contract and environment-safety smoke passed.');
console.log('Truthful IA, original templates, facade CAS, scriptless preview, Personal Assistant surfaces, plan/data preservation, and staging URL policy verified.');
