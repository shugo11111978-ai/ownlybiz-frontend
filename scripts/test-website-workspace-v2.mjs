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
assert.match(
  styles,
  /#db-panel-website-editor \.ob-website-workspace \.ob-ww-surface > \.we-tab-card\[data-we-tab\]\{display:block!important\}/,
  'reparented Website cards do not depend on stale legacy tab state for visibility',
);
assert.match(runtime, /var destination=cardSurface\(card\)[\s\S]*?host\.appendChild\(card\)[\s\S]*?card\.classList\.add\('we-tab-visible'\)/, 'organizing cards restores the legacy visibility class after hydration');
assert.match(runtime, /all\('\.ob-ww-surface'\)[\s\S]*?panel\.hidden=!on/, 'only the active new Website surface is exposed');
assert.match(runtime, /card\.querySelector\('#we-nav-home'\)\) return 'navigation'/, 'the Menu card is routed to its visible new surface');
assert.match(runtime, /tab === 'pages' \? 'pages' : tab === 'media' \? 'media'/, 'Pages and Media cards are routed to visible new surfaces');

const presets = vm.runInNewContext(
  `(${presetCatalogSource.replace(/^var TEMPLATE_PRESETS=/, '').replace(/;$/, '')})`,
  Object.create(null),
);
assert.equal(presets.length, 4, 'four original starting points are available');
assert.equal(new Set(presets.map((item) => item.id)).size, 4, 'each starting point has a stable unique ID');
assert.equal(new Set(presets.map((item) => item.template_id)).size, 4, 'every selectable template persists its own canonical template ID');
assert.equal(new Set(presets.map((item) => item.renderer_family)).size, 4, 'every selectable template owns an independent public renderer family');
const expectedTemplateContracts = {
  'practice-focus': {
    template_id: 'ownly-practice-focus-v1',
    renderer_family: 'practice-focus',
    layout: 'split',
    mode: 'light',
    palette_id: 'warm',
  },
  'quiet-confidence': {
    template_id: 'ownly-quiet-confidence-v1',
    renderer_family: 'quiet-confidence',
    layout: 'centered',
    mode: 'light',
    palette_id: 'forest',
  },
  'field-journal': {
    template_id: 'ownly-field-journal-v1',
    renderer_family: 'field-journal',
    layout: 'editorial',
    mode: 'light',
    palette_id: 'forest',
  },
  'after-hours': {
    template_id: 'ownly-after-hours-v1',
    renderer_family: 'after-hours',
    layout: 'editorial',
    mode: 'dark',
    palette_id: 'midnight',
  },
};
assert.deepEqual(
  Object.fromEntries(presets.map((item) => [item.id, {
    template_id: item.template_id,
    renderer_family: item.renderer_family,
    layout: item.layout,
    mode: item.mode,
    palette_id: item.palette_id,
  }])),
  expectedTemplateContracts,
  'the gallery is a four-template renderer catalog rather than four cards sharing hidden foundations',
);
assert(presets.every((item) => ['warm', 'ocean', 'forest', 'midnight'].includes(item.palette_id)), 'every preset uses a backend-supported palette ID');
assert(presets.every((item) => item.tokens && Object.keys(item.tokens).sort().join(',') === 'accent,action,background,status,surface,text'), 'every template carries a complete six-token visual foundation');
assert(presets.every((item) => item.name && item.variant && item.description.length > 45), 'every template has meaningful original copy');
assert.equal(new Set(presets.map((item) => item.preview_image)).size, presets.length, 'every foundation has a distinct raster preview');
for (const preset of presets) {
  assert.match(preset.preview_image, /^\/assets\/website-templates\/[a-z0-9-]+\.jpg$/, `${preset.id} uses a bundled JPEG preview`);
  assert(preset.preview_alt && preset.preview_alt.length > 35, `${preset.id} has meaningful preview alternative text`);
  assert(Number.isInteger(preset.preview_width) && preset.preview_width > 1200, `${preset.id} declares its raster width`);
  assert(Number.isInteger(preset.preview_height) && preset.preview_height > 800, `${preset.id} declares its raster height`);
  const asset = fs.readFileSync(new URL(`..${preset.preview_image}`, import.meta.url));
  assert.equal(asset.subarray(0, 3).toString('hex'), 'ffd8ff', `${preset.id} preview has a JPEG start signature`);
  assert.equal(asset.subarray(-2).toString('hex'), 'ffd9', `${preset.id} preview has a JPEG end signature`);
  assert(asset.length > 100_000 && asset.length < 500_000, `${preset.id} preview has a sensible high-resolution payload`);
}
for (const templateId of Object.keys(expectedTemplateContracts)) {
  assert.match(styles, new RegExp(`#view-4\\.ob-site-template-${templateId.replaceAll('-', '\\-')}`), `${templateId} has dedicated public-site CSS`);
}
assert.match(styles, /ob-site-template-practice-focus \.expert-hero-inner\{[^}]*grid-template-columns:minmax/, 'Practice Focus has a complete split hero composition');
assert.match(styles, /ob-site-template-quiet-confidence \.expert-hero-inner\{[^}]*quiet-confidence-botanicals\.png/, 'Quiet Confidence has its own centered botanical composition');
assert.match(styles, /ob-site-template-field-journal \.service-mini\{[^}]*border-top:1px solid/, 'Field Journal has its own editorial service treatment');
assert.match(styles, /ob-site-template-after-hours\{--ob-site-bg:#0B0908/, 'After Hours has its own high-contrast dark renderer tokens');
assert.match(styles, /ob-site-template-after-hours \.service-mini\{[^}]*border-left:1px solid/, 'After Hours has its own editorial service treatment');
assert.match(styles, /:is\(\.about-page,\.services-full,\.book-page,\.contact-page,#ep-reviews>\.mkt-page-inner\)/, 'template styling reaches the complete public website, not only the homepage hero');
const botanicalAsset = fs.readFileSync(new URL('../assets/website-templates/quiet-confidence-botanicals.png', import.meta.url));
assert.equal(botanicalAsset.subarray(1, 4).toString(), 'PNG', 'Quiet Confidence uses a real bundled botanical raster rather than a schematic placeholder');
assert.match(styles, /\.ob-ww-template-grid\{display:grid;gap:18px;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/, 'normal desktop and tablet layouts use two readable template columns');
assert.match(styles, /@container \(min-width:1320px\)\{\.ob-ww-template-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}\}/, 'only a truly wide Website content area expands to three columns');
assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*?\.ob-ww-template-grid\{grid-template-columns:1fr\}/, 'mobile presents one large template per row');
assert.match(styles, /\.ob-ww-template-preview\{aspect-ratio:1586\/992;[\s\S]*?object-fit:cover/, 'raster previews keep their authored viewport shape');
assert.match(runtime, /<article class="ob-ww-template" role="listitem"/, 'template cards use non-interactive article containers');
assert.match(runtime, /data-template-action="preview"/, 'each template exposes a distinct Preview action');
assert.match(runtime, /data-template-action="use"[\s\S]*?aria-pressed="false">Use foundation/, 'each template exposes an explicit selectable action');
assert.match(runtime, /card\.setAttribute\('data-selected'[\s\S]*?use\.setAttribute\('aria-pressed'/, 'current foundation state is both visibly and semantically updated');
assert.match(runtime, /data-template-action'\) === 'preview'\) showTemplatePreview\(presetId\)[\s\S]*?data-template-action'\) === 'use'\) selectPreset\(presetId\)/, 'only the explicit Use action selects a foundation');
assert.match(runtime, /loading="lazy" decoding="async"/, 'template rasters use lazy decoding');
assert.match(runtime, /width="'\+Number\(item\.preview_width[\s\S]*?height="'\+Number\(item\.preview_height/, 'template images carry fixed intrinsic dimensions');
assert.doesNotMatch(runtime + styles, /ob-ww-mini-(?:photo|copy|action)/, 'schematic mini placeholders are completely removed');
assert.match(runtime, /state\.selectedPreset=preset\.id/);
assert.match(runtime, /markDirty\(\);return designForPreset/, 'template selection becomes an explicit unsaved website change');

function sourceOf(name, nextName) {
  const start = runtime.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  const end = runtime.indexOf(`function ${nextName}(`, start);
  assert(end > start, `${nextName} must follow ${name}`);
  return runtime.slice(start, end).trim();
}

const selectPresetSource = sourceOf('selectPreset', 'renderSummary');
assert.doesNotMatch(selectPresetSource, /saveWebsiteWorkspace|requestJson|fetch\s*\(/, 'using a foundation never saves it automatically');
assert.match(selectPresetSource, /radio\('we-site-mode',preset\.mode\);radio\('we-site-layout',preset\.layout\)/, 'using a foundation applies its complete mode and layout contract');
assert.match(selectPresetSource, /card\.getAttribute\('data-theme'\) === preset\.palette_id/, 'using a foundation applies its canonical palette');
assert.match(selectPresetSource, /accent:'we-color-accent',action:'we-color-action',status:'we-color-status',background:'we-color-bg',surface:'we-color-surface',text:'we-color-text'/, 'using a foundation applies all six visible design tokens');
const inferPresetSource = sourceOf('inferPreset', 'presetById');
const inferPreset = vm.runInNewContext(`(() => { ${inferPresetSource}; return inferPreset; })()`, Object.create(null));
for (const [id, contract] of Object.entries(expectedTemplateContracts)) {
  assert.equal(inferPreset(contract), id, `${id} reloads as the same selected gallery foundation`);
}
assert.equal(inferPreset({ template_id: 'ownly-practice-focus-v1', layout: 'centered', mode: 'light' }), 'quiet-confidence', 'legacy centered Practice Focus records upgrade to Quiet Confidence');
assert.equal(inferPreset({ template_id: 'ownly-field-journal-v1', layout: 'editorial', mode: 'dark' }), 'after-hours', 'legacy dark Field Journal records upgrade to After Hours');
const designForPresetSource = sourceOf('designForPreset', 'legacyDocument');
assert.match(designForPresetSource, /template_id:preset\.template_id,renderer_family:preset\.renderer_family,mode:preset\.mode,layout:preset\.layout,palette_id:preset\.palette_id/, 'foundation selection resolves one complete canonical renderer contract');
const templatePreviewSource = sourceOf('showTemplatePreview', 'showDraftPreview');
assert.match(templatePreviewSource, /frame\.srcdoc=previewDocumentHtml\(collectDocument\(\),item\.id\)/, 'card Preview renders the expert content through that foundation’s complete website renderer');
assert.match(templatePreviewSource, /image\.hidden=true[\s\S]*?image\.removeAttribute\('src'\)/, 'card Preview switches away from the gallery marketing raster');
assert.doesNotMatch(templatePreviewSource, /selectPreset|markDirty|saveWebsiteWorkspace|requestJson|fetch\s*\(/, 'previewing a foundation cannot select, dirty, save, or request data');
assert.match(templatePreviewSource, /current content in this foundation[\s\S]*?preview only[\s\S]*?no draft changes/i, 'template preview clearly explains that it is a safe full-site preview');

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
assert.match(collectDocumentSource, /design:\{template_id:selectedTemplate,renderer_family:selectedFamily,mode:selectedMode,layout:selectedLayout,palette_id:palette,tokens:tokens\}/, 'saving carries the selected canonical template and renderer contract through the website facade');
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
assert.match(runtime, /var templateBusy=state\.saving \|\| state\.loading \|\| state\.compatibility/, 'foundation changes are disabled while website state is loading, saving, or read-only');
assert.match(runtime, /\[data-template-action="use"\][\s\S]*?button\.disabled=templateBusy/, 'Use foundation controls reflect the busy/read-only state');
assert.match(runtime, /function selectPreset\(id\)\{\s*if\(state\.loading \|\| state\.saving \|\| state\.compatibility\) return false;/, 'foundation selection also fails closed against programmatic busy-state changes');
const applyPublicTemplateSource = sourceOf('applyPublicTemplate', 'commitDocumentLocally');
assert.match(applyPublicTemplateSource, /view\.classList\.add\('ob-site-template-'\+item\.renderer_family,'ob-site-preset-'\+item\.id\)/, 'the public expert website applies the selected independent renderer family');
assert.match(applyPublicTemplateSource, /enhancePublicTemplate\(profile,item\)/, 'the selected renderer enhances the complete public-site structure');
const enhancePublicTemplateSource = sourceOf('enhancePublicTemplate', 'applyPublicTemplate');
assert.match(enhancePublicTemplateSource, /services[\s\S]*?testimonials[\s\S]*?about/, 'the renderer maps services, proof, and story sections');
assert.match(enhancePublicTemplateSource, /all\('\.expert-page',view\)[\s\S]*?data-ob-template-page/, 'the renderer marks every expert public page, not only the hero');
assert.match(enhancePublicTemplateSource, /service-mini[\s\S]*?showExpertPage === 'function'[\s\S]*?showExpertPage\('services'\)/, 'homepage services remain real keyboard-accessible navigation into the website');
assert.doesNotMatch(enhancePublicTemplateSource, /innerHTML\s*=|\.remove\s*\(/, 'template enhancement preserves the existing booking and account DOM contracts');
assert.match(styles, /\.ob-ww-template-media:focus-visible\{outline-offset:-4px\}/, 'the image preview focus ring stays visible inside the clipped card');
assert.match(styles, /@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.ob-ww-template-preview[\s\S]*?\{transition:none\}[\s\S]*?\.ob-ww-template-media:hover \.ob-ww-template-preview[\s\S]*?\{transform:none/, 'template preview motion is disabled when reduced motion is requested');
assert.match(styles, /\.ob-ww-template-use:hover\{background:#6f2e17;border-color:#6f2e17;color:#fff\}/, 'the primary foundation action keeps readable white text in its light-theme hover state');
const lightThemeMatch = styles.match(/body\.ob-ui-light #view-3 #db-panel-website-editor\{([\s\S]*?)\n\}/);
assert(lightThemeMatch, 'Website workspace defines an explicit dashboard light-theme palette');
const lightThemeTokens = Object.fromEntries(
  [...lightThemeMatch[1].matchAll(/--(ob-ww-(?:text|muted|card)):(#[0-9a-f]{6})/gi)].map((match) => [match[1], match[2]]),
);
assert.deepEqual(lightThemeTokens, {
  'ob-ww-card': '#fffdf8',
  'ob-ww-text': '#241a15',
  'ob-ww-muted': '#5f554d',
});
function contrastRatio(foreground, background) {
  const channels = (hex) => [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = (hex) => {
    const [r, g, b] = channels(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [bright, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (bright + 0.05) / (dark + 0.05);
}
assert(contrastRatio(lightThemeTokens['ob-ww-text'], lightThemeTokens['ob-ww-card']) >= 4.5, 'light-theme primary text meets WCAG AA on Website cards');
assert(contrastRatio(lightThemeTokens['ob-ww-muted'], lightThemeTokens['ob-ww-card']) >= 4.5, 'light-theme secondary text meets WCAG AA on Website cards');
assert.match(styles, /body\.ob-ui-light #view-3 #db-panel-website-editor \.ob-ww-button:not\(\.primary\)[\s\S]*?color:var\(--ob-ww-text\)/, 'secondary Website actions remain readable in light mode');
assert.match(styles, /body\.ob-ui-light #view-3 #db-panel-website-editor \.ob-ww-status\{color:var\(--ob-ww-muted\)\}/, 'Website status copy remains readable in light mode');
assert.match(styles, /:is\(\.ob-ww-eyebrow,\.ob-ww-template-family\)\{color:#4f6219!important\}/, 'light-mode foreground accents use readable Ownlybiz olive instead of lime');
assert.match(
  styles,
  /\.ob-ww-surface :is\(input,textarea,select,\.settings-field-input\)::placeholder\{color:rgba\(250,247,242,\.52\)!important\}/,
  'dark-mode Website placeholders retain normal-text contrast on dark inputs',
);
assert.match(
  html,
  /data-ob-panel="website-view" onclick="_openMyWebsite\(\)"/,
  'the global View Website navigation keeps using the authoritative live-site opener',
);
assert.doesNotMatch(
  runtime,
  /root\._openMyWebsite\s*=/,
  'Website workspace never replaces the global live-site opener with unloaded local draft state',
);
assert.match(
  runtime,
  /byId\('ob-ww-preview'\)\.addEventListener\('click',openWebsitePreview\)/,
  'local draft preview remains scoped to the Website workspace Preview draft control',
);
assert.match(runtime, /iframe[^>]*sandbox=\"\"/);
assert.match(runtime, /frame\.setAttribute\('sandbox',''\)/);
assert.match(runtime, /frame\.srcdoc=previewDocumentHtml/);
assert.match(runtime, /Content-Security-Policy/);
const draftPreviewSource = sourceOf('previewDocumentHtml', 'openPreviewDialog');
assert.doesNotMatch(draftPreviewSource, /<script|javascript:/i, 'the draft preview renderer contains no script execution path');
for (const sectionClass of ['hero', 'story', 'services', 'proof', 'final', 'footer']) {
  assert.match(draftPreviewSource, new RegExp(`class="${sectionClass}"`), `draft preview renders a complete ${sectionClass} section`);
}
assert.match(draftPreviewSource, /doc\.navigation\.home[\s\S]*?doc\.navigation\.about[\s\S]*?doc\.navigation\.services[\s\S]*?doc\.navigation\.reviews[\s\S]*?doc\.navigation\.contact/, 'draft preview renders the expert navigation labels');
assert.match(draftPreviewSource, /doc\.services\.chat_description[\s\S]*?doc\.services\.voice_description[\s\S]*?doc\.services\.video_description/, 'draft preview renders all supported service content');
assert.match(draftPreviewSource, /doc\.media && doc\.media\.profile_image_url/, 'draft preview uses the expert portrait when one exists');
for (const templateId of Object.keys(expectedTemplateContracts)) {
  assert.match(draftPreviewSource, new RegExp(templateId.replaceAll('-', '\\-')), `draft preview contains a distinct ${templateId} composition branch`);
}
assert.match(draftPreviewSource, /Verified client reviews appear here after completed Ownlybiz sessions/, 'draft proof content is truthful and never invents testimonials');
const openWebsitePreviewSource = sourceOf('openWebsitePreview', 'cardSurface');
assert.match(openWebsitePreviewSource, /state\.dirty \|\| !state\.publication\.published[\s\S]*?showDraftPreview\(\)/, 'a changed template always previews the unsaved full draft, even when the current site is published');
const updateHeaderSource = sourceOf('updateHeader', 'markDirty');
assert.match(updateHeaderSource, /published && !state\.dirty \? 'View live site' : 'Preview draft'/, 'the header clearly distinguishes a saved live site from an unsaved template draft');
const organizeCardsSource = sourceOf('organizeCards', 'rememberSetting');
assert.match(organizeCardsSource, /we-theme-grid[\s\S]*?themeCard[\s\S]*?\[themeCard,designControls\][\s\S]*?hidden=true[\s\S]*?aria-hidden/, 'the gallery is authoritative, so the obsolete palette-card chooser is not exposed as a competing template system');
assert.match(organizeCardsSource, /ob-site-design-controls[\s\S]*?hidden=true[\s\S]*?aria-hidden/, 'the gallery is authoritative, so obsolete standalone mode/layout choices are not exposed');
assert.doesNotMatch(organizeCardsSource, /ob-site-color-controls[\s\S]*?hidden=true/, 'experts can still tune accessible colors after choosing a foundation');
assert.match(runtime, /exactCredential:true/, 'website requests retain exact identity fencing');
assert.match(runtime, /Account changed while the website request was in progress/);
assert.match(runtime, /OB_CLIENT_CONTEXT\.register\('website-workspace-v2'/, 'identity transitions scrub and reload website-private state');

console.log('Website workspace v2 contract and environment-safety smoke passed.');
console.log('Truthful IA, four complete renderers, authoritative gallery selection, facade CAS, full scriptless preview, Personal Assistant surfaces, plan/data preservation, and staging URL policy verified.');
