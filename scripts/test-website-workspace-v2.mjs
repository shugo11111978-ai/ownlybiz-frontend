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
const domainRuntime = section(
  /<script id="ownlybiz-expert-phase0-integrity-20260913">([\s\S]*?)<\/script>/,
  'Canonical domain settings runtime',
);
const styles = section(
  /<style id="ownlybiz-website-workspace-v2-style">([\s\S]*?)<\/style>/,
  'Website workspace v2 styles',
);
const editorStart = html.indexOf('<div class="db-tab-panel" id="db-panel-website-editor">');
const editorEnd = html.indexOf('<aside class="ob-guidance-drawer"', editorStart);
assert(editorStart >= 0 && editorEnd > editorStart, 'source-native Website editor markup must exist');
const editorMarkup = html.slice(editorStart, editorEnd);
const surfaceCatalogSource = section(/var SURFACES=\{[\s\S]*?\n  \};/, 'Website surface catalog');
const presetCatalogSource = section(/var TEMPLATE_PRESETS=\[[\s\S]*?\n  \];/, 'Website template catalog');
const mediaSlotCatalogSource = section(/var MEDIA_SLOTS=\[[\s\S]*?\n  \];/, 'Website media role catalog');
const collectDocumentSource = runtime.slice(runtime.indexOf('function collectDocument()'), runtime.indexOf('function applyAiDraft('));
const aiWebsiteRuntime = section(
  /<script id="ob-ai-website-editor-20260517">([\s\S]*?)<\/script>/,
  'AI website editor runtime',
);
const contentPagesRuntime = section(
  /<script id="ownlybiz-content-pages-editor-20260522">([\s\S]*?)<\/script>/,
  'Custom content pages runtime',
);
const publicPageNavigationRuntime = section(
  /function showExpertPage\(page\)\{[\s\S]*?\n\}\n\n\/\/ ===== CALENDAR/,
  'Canonical public expert page navigation',
);

assert.equal((html.match(/id="ownlybiz-website-workspace-v2-runtime"/g) || []).length, 1, 'one Website workspace runtime is installed');
assert.equal((editorMarkup.match(/<header class="ob-ww-header">/g) || []).length, 1, 'the Website header is source-native and unique');
assert.equal((html.match(/id="ob-guidance-drawer"/g) || []).length, 1, 'Website reuses the single Personal Assistant drawer');
assert.doesNotMatch(runtime + styles, /kajabi/i, 'Website workspace contains no competitor naming or copied template labels');
assert.doesNotMatch(runtime, /victorious-wisdom|railway\.app|https:\/\/[^'"\s]+ownlybiz\.com/i, 'Website persistence and preview runtime contains no hard-coded production endpoint');
assert.doesNotMatch(runtime, /\b(?:Blog|Funnels?|A\/B|Template marketplace)\b/i, 'unsupported suite features are not presented');
assert.match(editorMarkup, /Domain purchase and transfer are not offered here/, 'the domain boundary is honest rather than a fake feature');
assert.doesNotMatch(editorMarkup, /id="settings-live-domain">Loading/, 'the authored domain summary cannot become a permanent Loading state');
assert.match(editorMarkup, /id="domain-refresh-status"/, 'live verification has one explicit source-owned action');
assert.doesNotMatch(editorMarkup, /onclick="checkDomainStatus\(\)"/, 'live verification is not owned by a legacy inline handler');
assert.doesNotMatch(html, /function checkDomainStatus\(|root\.checkDomainStatus\s*=/, 'no legacy verification function or compatibility override remains');

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
const expectedSurfaces = Object.keys(surfaces);
const staticTabs = [...editorMarkup.matchAll(/<button\b[^>]*\brole="tab"[^>]*\bdata-ob-website-surface="([^"]+)"/g)].map((match) => match[1]);
const staticPanels = [...editorMarkup.matchAll(/<section class="ob-ww-surface"[^>]*\bdata-ob-surface="([^"]+)"[^>]*\brole="tabpanel"/g)].map((match) => match[1]);
assert.deepEqual(staticTabs, expectedSurfaces, 'the source owns exactly one accessible tab for every Website surface');
assert.deepEqual(staticPanels, expectedSurfaces, 'the source owns exactly one accessible panel for every Website surface');
for (const surface of expectedSurfaces) {
  assert.match(editorMarkup, new RegExp(`aria-controls="ob-ww-surface-${surface}"[\\s\\S]*?data-ob-website-surface="${surface}"`), `${surface} has a source-native tab target`);
  assert.match(editorMarkup, new RegExp(`id="ob-ww-surface-${surface}"[\\s\\S]*?data-ob-surface="${surface}"[\\s\\S]*?role="tabpanel"`), `${surface} has a source-native tab panel`);
}
assert.match(runtime, /ArrowLeft','ArrowRight','Home','End/, 'tabs support standard keyboard navigation');
assert.match(runtime, /obPhase1OpenGuidance/, 'Personal Assistant remains available inside Website');
assert.match(runtime, /root\.OBWebsiteWorkspace=Object\.freeze\(\{open:openWebsiteSurface,load:loadWebsiteWorkspace,save:saveWebsiteWorkspace,preview:openWebsitePreview/, 'the canonical Website API exposes exact surface, load, save, and preview actions');
assert.match(runtime, /ownlybiz:surface-changed/, 'surface changes use the single canonical navigation lifecycle event');
assert.doesNotMatch(runtime, /installNavigationWrappers|__obWebsiteWorkspaceV2Original|previousApply=root\._applyExpertWebsite/, 'Website integration uses direct lifecycle ownership rather than runtime function wrapping');
assert.match(runtime, /ownlybiz:before-dashboard-panel-change[\s\S]*?ownlybiz:dashboard-panel-changed[\s\S]*?activateWebsiteWorkspace\(\)/, 'Website entry and exit follow authoritative dashboard navigation events');
assert.match(runtime, /root\.obApplyWebsiteFoundation=function\(data,operation\)[\s\S]*?obPublicExpertRenderCurrent/, 'the canonical public renderer calls one generation-fenced Website foundation lifecycle');
assert.match(html, /function obApplyPublicExpertPayload[\s\S]*?obApplyWebsiteFoundation\(e, renderOperation\)/, 'public template application is owned directly by the canonical expert payload renderer');
assert.match(aiWebsiteRuntime, /window\.obRenderAiPublicExtras\s*=\s*renderAiPublicExtras/, 'AI-authored public sections expose one direct renderer lifecycle hook');
assert.match(aiWebsiteRuntime, /function renderAiPublicExtras\(data,operation\)[\s\S]*?!operation[\s\S]*?obPublicExpertRenderCurrent\(operation\)/, 'the direct AI public renderer requires a current public-expert render generation');
assert.doesNotMatch(aiWebsiteRuntime, /window\.(?:loadWebsiteEditor|_applyExpertWebsite|adminNav|adminTabSwitch)\s*=/, 'Website AI does not monkey-patch canonical Website, public renderer, or shared admin navigation functions');
assert.doesNotMatch(aiWebsiteRuntime, /function wireWebsiteEditor\(/, 'Website AI integration uses explicit lifecycle calls instead of a wrapper installer');
assert.doesNotMatch(aiWebsiteRuntime, /__obAi(?:Website|Assistant)Wrapped|old(?:Nav|Tab)\.apply\(this,\s*arguments\)/, 'Website AI contains no hidden shared-navigation wrapper path');
assert.match(aiWebsiteRuntime, /item\.onclick = function\(event\)\{ if\(event\) event\.preventDefault\(\);showAdminAiPanel\(item\); \}/, 'the AI admin destination owns a direct bounded click action');
assert.match(aiWebsiteRuntime, /window\.obEnsureWebsiteAi\s*=\s*ensureWebsiteAi/, 'Website AI exposes one direct editor lifecycle hook');
assert.match(runtime, /panel\.classList\.contains\('active'\)[\s\S]*?root\.obEnsureWebsiteAi\(\)/, 'the canonical Website workspace invokes the AI lifecycle after its active surface is installed');
assert.match(publicPageNavigationRuntime, /ownlybiz:expert-page-changed[\s\S]*?pageElement:requestedPage/, 'canonical public navigation publishes a page lifecycle event after activating the page');
assert.doesNotMatch(contentPagesRuntime, /wrapShowExpertPage|window\.showExpertPage\s*=/, 'custom pages never replace or wrap canonical public navigation');
assert.doesNotMatch(runtime + aiWebsiteRuntime + contentPagesRuntime, /previous(?:Db|Settings|Apply|Show|Load)|\.apply\(this,\s*arguments\)/, 'the complete Website feature uses direct lifecycle hooks rather than shared-function wrapping');
assert.match(contentPagesRuntime, /addEventListener\('ownlybiz:expert-page-changed',\s*syncPublicPageMetadata\)/, 'custom-page metadata follows the canonical public page lifecycle event');
assert.match(runtime, /all\('\.ob-ww-surface'\)[\s\S]*?panel\.hidden=!on/, 'only the active new Website surface is exposed');
assert.match(runtime, /state\.domain=Object\.assign\(\{\},envelope\.domain \|\| \{\}\)[\s\S]*?renderDomainState\(\)/, 'the authoritative Website envelope renders its domain state directly');
const openSurfaceSource = runtime.slice(runtime.indexOf('function openSurface('), runtime.indexOf('function openAnalytics('));
assert.doesNotMatch(openSurfaceSource, /renderDomainState|refreshStatus|loadDomainSettings|requestJson/, 'opening Domains only changes the visible surface and cannot replay stale state or trigger a request');
assert.match(runtime, /domainRefresh\.addEventListener\('click',root\.OBDomainSettings\.refreshStatus\)/, 'Refresh status binds directly to the canonical controller');
assert.doesNotMatch(runtime, /\/api\/domains\/me\/status/, 'the Website surface lifecycle never performs an implicit live verification request');
assert.match(domainRuntime, /root\.OBDomainSettings=Object\.freeze\(\{[\s\S]*?render:applyDomainSnapshot,[\s\S]*?replace:replaceDomainSnapshot,[\s\S]*?refreshStatus:refreshDomainStatusScoped,[\s\S]*?clear:clearDomainSnapshot/, 'one frozen controller owns domain rendering, mutation replacement, explicit verification, and identity cleanup');
const domainLoadSource = domainRuntime.slice(domainRuntime.indexOf('function loadDomainSettingsScoped()'), domainRuntime.indexOf('function refreshDomainStatusScoped()'));
assert.doesNotMatch(domainLoadSource, /\/api\/domains\/me\/status/, 'loading saved domain settings never invokes the mutating verification endpoint');
assert.equal((domainRuntime.match(/\/api\/domains\/me\/status/g) || []).length,1,'only the explicit verification action references the status endpoint');
assert.doesNotMatch(html, /setTimeout\(function\(\)\{checkDomainStatus\(\);\},1000\)/, 'connecting a domain does not silently trigger live verification');
assert.match(html, /function verifyCustomDomain\(\)[\s\S]*?OBDomainSettings\.replace\(\{slug:[\s\S]*?custom_domain:domain,connection_verified:false\}/, 'a newly connected domain invalidates older requests and enters the canonical pending-state renderer without live verification');
assert.match(html, /function disconnectCustomDomain\(\)[\s\S]*?OBDomainSettings\.replace\(\{slug:slugField&&slugField\.value\}\)/, 'disconnect invalidates older domain requests before the authoritative read-back');
assert.match(editorMarkup, /id="ob-ww-surface-navigation"[\s\S]*?id="we-nav-home"/, 'the Menu controls are authored in their canonical surface');
assert.match(editorMarkup, /id="ob-ww-surface-domains"[\s\S]*?id="sblock-website"/, 'domain controls are authored in the Website workspace');
assert.match(editorMarkup, /id="ob-ww-surface-seo"[\s\S]*?id="sblock-seo"/, 'search and analytics controls are authored in the Website workspace');
assert.doesNotMatch(editorMarkup, /\bwe-tab-card\b|\bdata-we-tab=/, 'the editor contains no legacy tab cards awaiting runtime organization');
assert.doesNotMatch(runtime, /\b(?:weTabSwitch|loadWebsiteEditor|saveWebsiteContent|obOpenWebsiteSurface|cardSurface|organizeCards|installWorkspace|syncWebsitePanelLifecycle)\b|MutationObserver|setInterval\s*\(/, 'the source-native workspace has no legacy facade, reparenting, observer, polling, or installer path');
assert.doesNotMatch(runtime, /insertAdjacentHTML|createElement\(['"]section['"]\)|appendChild\(card\)/, 'the runtime never constructs or reparents Website surfaces');
assert.doesNotMatch(runtime, /\[(?:180|500|700|1600|3200)(?:,\d+)+\]\.forEach/, 'the workspace has no delayed installation retry schedule');

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
assert.match(styles, /ob-site-template-quiet-confidence \.expert-hero-inner::before\{[\s\S]*?radial-gradient\(ellipse[\s\S]*?var\(--ob-site-accent-readable\)/, 'Quiet Confidence has its own adaptive centered botanical composition');
assert.match(styles, /ob-site-template-field-journal \.service-mini\{[^}]*border-top:1px solid/, 'Field Journal has its own editorial service treatment');
assert.match(styles, /ob-site-template-after-hours \.testimonials\{background:var\(--ob-site-surface\)!important\}/, 'After Hours applies its high-contrast renderer tokens throughout the site');
assert.match(styles, /ob-site-template-after-hours \.service-mini\{[^}]*border-left:1px solid/, 'After Hours has its own editorial service treatment');
assert.match(styles, /:is\(\.about-page,\.services-full,\.book-page,\.contact-page,#ep-reviews>\.mkt-page-inner\)/, 'template styling reaches the complete public website, not only the homepage hero');
assert.doesNotMatch(styles, /quiet-confidence-botanicals\.png/, 'Quiet Confidence decoration responds to expert colors instead of using a fixed-color raster');
assert.match(styles, /\.ob-ww-template-grid\{display:grid;gap:18px;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/, 'normal desktop and tablet layouts use two readable template columns');
assert.match(styles, /@container \(min-width:1320px\)\{\.ob-ww-template-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}\}/, 'only a truly wide Website content area expands to three columns');
assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*?\.ob-ww-template-grid\{grid-template-columns:1fr\}/, 'mobile presents one large template per row');
assert.match(styles, /\.ob-ww-template-preview\{aspect-ratio:1586\/992;[\s\S]*?object-fit:cover/, 'raster previews keep their authored viewport shape');
assert.equal((editorMarkup.match(/<article class="ob-ww-template" role="listitem"/g) || []).length, 4, 'four template cards are authored as non-interactive article containers');
for (const preset of presets) {
  assert.match(editorMarkup, new RegExp(`data-preset="${preset.id}"`), `${preset.id} has one source-native template card`);
}
assert.equal((editorMarkup.match(/data-template-action="use"/g) || []).length, 4, 'each static template exposes one explicit selectable action');
assert.match(editorMarkup, /data-template-action="preview"/, 'each template exposes a distinct Preview action');
assert.match(editorMarkup, /data-template-action="use"[\s\S]*?aria-pressed="false">Use foundation/, 'each template exposes an explicit selectable action');
assert.match(runtime, /card\.setAttribute\('data-selected'[\s\S]*?use\.setAttribute\('aria-pressed'/, 'current foundation state is both visibly and semantically updated');
assert.match(runtime, /data-template-action'\) === 'preview'\) showTemplatePreview\(presetId\)[\s\S]*?data-template-action'\) === 'use'\) selectPreset\(presetId\)/, 'only the explicit Use action selects a foundation');
assert.equal((editorMarkup.match(/loading="lazy" decoding="async"/g) || []).length, 4, 'all source-native template rasters use lazy decoding');
assert.equal((editorMarkup.match(/<img class="ob-ww-template-preview"[^>]*\bwidth="\d+" height="\d+"/g) || []).length, 4, 'all source-native template images carry fixed intrinsic dimensions');
assert.doesNotMatch(runtime + styles, /ob-ww-mini-(?:photo|copy|action)/, 'schematic mini placeholders are completely removed');
assert.match(runtime, /state\.selectedPreset=preset\.id/);
assert.match(runtime, /markDirty\(\);return designForPreset/, 'template selection becomes an explicit unsaved website change');

const mediaSlots = vm.runInNewContext(
  `(${mediaSlotCatalogSource.replace(/^var MEDIA_SLOTS=/, '').replace(/;$/, '')})`,
  Object.create(null),
);
assert.deepEqual(
  [...mediaSlots].map((item) => item.key),
  [
    'profile_image_url', 'logo_image_url', 'favicon_image_url', 'social_share_image_url',
    'about_image_url', 'services_image_url', 'reviews_image_url', 'contact_image_url',
  ],
  'the Website media library owns all eight fixed semantic image roles',
);
assert.equal(new Set(mediaSlots.map((item) => item.input)).size, 8, 'every fixed media role has its own upload input');
assert.equal(new Set(mediaSlots.map((item) => item.preview)).size, 8, 'every fixed media role has its own visible preview');
assert.equal((editorMarkup.match(/<button[^>]+data-ob-media-clear="[a-z_]+"[^>]*>Remove image<\/button>/g) || []).length, 8, 'every fixed media role has an accessible explicit Remove action');

function sourceOf(name, nextName) {
  const start = runtime.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  const end = runtime.indexOf(`function ${nextName}(`, start);
  assert(end > start, `${nextName} must follow ${name}`);
  return runtime.slice(start, end).trim();
}

const selectPresetSource = sourceOf('selectPreset', 'renderSummary');
assert.doesNotMatch(selectPresetSource, /saveWebsiteWorkspace|requestJson|fetch\s*\(/, 'using a foundation never saves it automatically');
assert.doesNotMatch(selectPresetSource, /we-site-mode|we-site-layout|we-theme-card|we-color-bg|we-color-surface|we-color-text/, 'foundation selection never coordinates obsolete or structurally unsafe controls');
assert.match(selectPresetSource, /renderDesignValidation\(\)/, 'using a foundation refreshes validation and the visible locked-role design map');
assert.match(selectPresetSource, /if\(preset\.id === state\.selectedPreset\)\{[\s\S]*?return designForPreset[\s\S]*?\}[\s\S]*?state\.selectedPreset=preset\.id/, 'reselecting the current foundation exits before any state, color, or dirty mutation');
const foundationRoleColorsSource = sourceOf('setFoundationRoleColors', 'restoreFoundationColors');
assert.match(foundationRoleColorsSource, /\['accent','action','status'\][\s\S]*?setValue\('we-color-'\+key,palette\[key\]\)/, 'foundation changes expose only the safe brand, action, and status roles');
const syncTemplateUseActionsSource = sourceOf('syncTemplateUseActions', 'updateTemplateSelection');
assert.match(syncTemplateUseActionsSource, /use\.disabled=!!unavailable \|\| selected/, 'the current foundation action is disabled as well as busy/read-only actions');
assert.match(syncTemplateUseActionsSource, /use\.textContent=selected \? 'Current foundation' : 'Use foundation'/, 'the current foundation action is unambiguous');
const inferPresetSource = sourceOf('inferPreset', 'presetById');
const inferPreset = vm.runInNewContext(`(() => { ${inferPresetSource}; return inferPreset; })()`, Object.create(null));
for (const [id, contract] of Object.entries(expectedTemplateContracts)) {
  assert.equal(inferPreset(contract), id, `${id} reloads as the same selected gallery foundation`);
}
assert.equal(inferPreset({ template_id: 'ownly-practice-focus-v1', layout: 'centered', mode: 'light' }), 'quiet-confidence', 'legacy centered Practice Focus records upgrade to Quiet Confidence');
assert.equal(inferPreset({ template_id: 'ownly-field-journal-v1', layout: 'editorial', mode: 'dark' }), 'after-hours', 'legacy dark Field Journal records upgrade to After Hours');
const designForPresetSource = sourceOf('designForPreset', 'legacyDocument');
assert.match(designForPresetSource, /template_id:preset\.template_id,renderer_family:preset\.renderer_family,mode:preset\.mode,layout:preset\.layout,palette_id:preset\.palette_id/, 'foundation selection resolves one complete canonical renderer contract');
const designTokenInputsSource = sourceOf('designTokenInputs', 'renderFoundationStyle');
assert.match(designTokenInputsSource, /presetById\(state\.selectedPreset\)[\s\S]*?preset\.tokens/, 'design tokens begin with the selected foundation’s complete contract');
assert.match(designTokenInputsSource, /accent:'we-color-accent',action:'we-color-action',status:'we-color-status'/, 'experts may tune only accent, primary action, and live status roles');
assert.doesNotMatch(designTokenInputsSource, /we-color-bg|we-color-surface|we-color-text/, 'structural background, surface, and text roles cannot drift from the renderer foundation');
const templatePreviewSource = sourceOf('showTemplatePreview', 'showDraftPreview');
assert.match(templatePreviewSource, /installPreviewDocument\(collectDocument\(\),item\.id\)/, 'card Preview installs the expert content through that foundation’s complete explorable website renderer');
assert.match(templatePreviewSource, /frame\.title=item\.name\+' full website preview'[\s\S]*?frame\.setAttribute\('sandbox','allow-same-origin'\)/, 'card Preview gives its scriptless, fragment-navigable website frame a specific accessible name');
assert.doesNotMatch(templatePreviewSource, /selectPreset|markDirty|saveWebsiteWorkspace|requestJson|fetch\s*\(/, 'previewing a foundation cannot select, dirty, save, or request data');
assert.match(templatePreviewSource, /current content in this foundation[\s\S]*?preview only[\s\S]*?no draft changes/i, 'template preview clearly explains that it is a safe full-site preview');
assert.doesNotMatch(runtime, /\.srcdoc\s*=/, 'preview never lets hash navigation resolve against the embedding dashboard URL');
assert.match(runtime, /URL\.createObjectURL\(new root\.Blob\(/, 'preview uses a real isolated document URL that remains navigable');
assert.match(runtime, /URL\.revokeObjectURL\(previousUrl\)/, 'replaced and closed previews release their prior document URL after detaching listeners');
assert.match(runtime, /frame\.src=state\.previewUrl\+'#'/, 'preview page changes stay within the generated website document');
assert.match(editorMarkup, /id="ob-ww-preview-page"/, 'the source-native preview dialog provides an explicit page explorer');
assert.equal((editorMarkup.match(/data-ob-preview-device="(?:desktop|tablet|phone)"/g) || []).length, 3, 'the source-native preview dialog provides desktop, tablet, and phone explorers');

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
assert.match(collectDocumentSource, /design:\{template_id:selectedTemplate,mode:selectedMode,layout:selectedLayout,palette_id:palette,tokens:tokens\}/, 'saving carries the selected canonical template through the website facade');
assert.match(collectDocumentSource, /controls=designTokenInputs\(\),tokens=clone\(presetTokens\)[\s\S]*?\['accent','action','status'\][\s\S]*?tokens\[key\]=validHex\(controls\[key\],presetTokens\[key\]\)/, 'saving derives tokens from locked foundation structure plus three safe expert roles');
assert.doesNotMatch(collectDocumentSource, /renderer_family\s*:/, 'renderer_family is server-projected and is never sent as an unsupported client patch field');
assert.match(collectDocumentSource, /selectedMode=preset\.mode,selectedLayout=preset\.layout,selectedTemplate=preset\.template_id,palette=preset\.palette_id/, 'the selected foundation is the sole authority for its exact backend template contract');
assert.doesNotMatch(collectDocumentSource, /we-site-mode|we-site-layout|we-theme-card/, 'hidden legacy design controls cannot race or corrupt a foundation save');
assert.match(collectDocumentSource, /custom_pages:mergeCustomPages/);
assert.match(collectDocumentSource, /MEDIA_SLOTS[\s\S]*?media\[slot\.key\]/, 'all eight fixed media roles are collected through one canonical catalog');
const previewImageSource = sourceOf('previewImage', 'safeMediaThumbnail');
assert.match(previewImageSource, /data-ob-media-cleared[\s\S]*?return ''/, 'an explicit fixed-media removal persists an empty string instead of restoring the prior URL');
const clearMediaSource = sourceOf('clearMediaSlot', 'credentialRow');
assert.match(clearMediaSource, /setImagePreview\(slot\.preview,''[\s\S]*?data-ob-media-cleared[\s\S]*?website-media-changed/, 'fixed-media removal updates the preview and canonical draft lifecycle');
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
const renderMediaLibrarySource = sourceOf('renderMediaLibrary', 'collectDocument');
assert.match(renderMediaLibrarySource, /MEDIA_SLOTS/, 'the media inventory includes every fixed semantic media role');
assert.match(renderMediaLibrarySource, /custom_sections[\s\S]*?image_url/, 'the media inventory includes images attached to homepage sections');
assert.match(renderMediaLibrarySource, /custom_pages[\s\S]*?header_image_url[\s\S]*?sections[\s\S]*?image_url/, 'the media inventory includes custom-page header and section images');
assert.match(renderMediaLibrarySource, /ob-ww-media-inventory/, 'the complete template-aware inventory renders into the Media surface');

const mergePagesSource = sourceOf('mergeCustomPages', 'collectCredentials');
const mergePages = vm.runInNewContext(`(() => { const clean=(value)=>String(value==null?'':value).replace(/[\\u0000-\\u001f\\u007f]/g,' ').replace(/\\s+/g,' ').trim(); const own=(value,key)=>!!value&&Object.prototype.hasOwnProperty.call(value,key); ${mergePagesSource}; return mergeCustomPages; })()`, Object.create(null));
const mergedPages = mergePages(
  [{ id: 'p1', title: 'Old', untouched: 'keep', sections: [{ id: 's1', image_alt: 'Keep alt', body: 'Old' }, { id: 's2', body: 'Second' }] }],
  [{ id: 'p1', title: 'New', sections: [{ id: 's1', body: 'New' }] }],
);
assert.equal(mergedPages[0].untouched, 'keep');
assert.equal(mergedPages[0].sections[0].image_alt, 'Keep alt');
assert.equal(mergedPages[0].sections.length, 1, 'an intentionally deleted section is not resurrected during collection');
const pageWithoutSectionOwnership = mergePages(
  [{ id: 'p2', untouched: 'keep', sections: [{ id: 's3', server_only: 'preserve' }] }],
  [{ id: 'p2', title: 'Metadata-only edit' }],
);
assert.equal(pageWithoutSectionOwnership[0].sections[0].server_only, 'preserve', 'sections remain untouched when an editor does not own the sections field');
const completeNewPage = {
  id: 'new-page',
  slug: 'complete-guide',
  title: 'Complete guide',
  sections: Array.from({ length: 8 }, (_, index) => ({
    id: `new-section-${index + 1}`,
    type: ['story', 'feature', 'faq', 'list', 'quote', 'gallery', 'cta', 'resource'][index],
    title: `Section ${index + 1}`,
    body: `Body ${index + 1}`,
    image_alt: `Image description ${index + 1}`,
  })),
};
const mergedNewPage = mergePages([], [completeNewPage])[0];
assert.equal(mergedNewPage.sections.length, 8, 'a new or duplicated eight-section page reaches the canonical Website save payload intact');
assert.equal(JSON.stringify(mergedNewPage), JSON.stringify(completeNewPage), 'the save boundary preserves every field on every section of a newly created page');

assert.match(runtime, /state\.legacyProfile=Object\.assign\(\{\},root\._websiteData \|\| \{\},state\.legacyProfile \|\| \{\}\)/, 'facade loading preserves rates and unrelated public-renderer profile fields');
assert.doesNotMatch(runtime, /contact_email \|\| user\.email|wc\.contact_email \|\| user\.email/, 'private account email never becomes public contact implicitly');
assert.match(runtime, /Save live changes/);
assert.match(runtime, /View live site/);
assert.match(runtime, /Save draft/);
assert.match(runtime, /Preview draft/);
assert.match(editorMarkup, /id="ob-ww-publish"[^>]*>Publish website<\/button>/, 'the source-native header exposes the publish action');
assert.match(runtime, /var readiness=readinessState\(\),busy=state\.saving \|\| state\.loading,templateBusy=busy \|\| !state\.writeAvailable/, 'foundation changes are disabled while website state is loading, saving, or read-only');
assert.match(runtime, /syncTemplateUseActions\(templateBusy\)/, 'Use foundation controls reflect selected, busy, and read-only state through one state owner');
assert.match(runtime, /function selectPreset\(id\)\{\s*if\(state\.loading \|\| state\.saving \|\| !state\.writeAvailable\) return false;/, 'foundation selection also fails closed against programmatic busy-state changes');
const applyPublicTemplateSource = sourceOf('applyPublicTemplate', 'commitDocumentLocally');
assert.match(applyPublicTemplateSource, /view\.classList\.add\('ob-site-template-'\+item\.renderer_family,'ob-site-preset-'\+item\.id\)/, 'the public expert website applies the selected independent renderer family');
assert.match(html, /href="#home" data-ob-expert-page="home"[\s\S]*?href="#contact" data-ob-expert-page="contact"/, 'the complete public navigation remains keyboard reachable');
assert.match(runtime, /ownsAction=card\.classList\.contains\('ob-public-on-demand-entry'\)[\s\S]*?data-ob-template-service-link/, 'template enhancement never steals an existing service-card action');
assert.match(runtime, /servicesEnabled=!wc\.pages \|\| wc\.pages\.services !== false/, 'homepage service-card navigation honors the expert services-page setting');
assert.match(runtime, /content\.insertBefore\(eyebrow,content\.firstChild\)[\s\S]*?content\.insertBefore\(introNode,titleNode\.nextSibling\)/, 'live hero information follows the same semantic order as the full draft preview');
assert.match(html, /--ob-site-link/);
assert.match(html, /--ob-site-focus/);
assert.match(applyPublicTemplateSource, /enhancePublicTemplate\(profile,item\)/, 'the selected renderer enhances the complete public-site structure');
const enhancePublicTemplateSource = sourceOf('enhancePublicTemplate', 'applyPublicTemplate');
assert.match(enhancePublicTemplateSource, /services[\s\S]*?testimonials[\s\S]*?about/, 'the renderer maps services, proof, and story sections');
assert.match(enhancePublicTemplateSource, /all\('\.expert-page',view\)[\s\S]*?data-ob-template-page/, 'the renderer marks every expert public page, not only the hero');
assert.match(enhancePublicTemplateSource, /service-mini[\s\S]*?showExpertPage === 'function'[\s\S]*?showExpertPage\('services'\)/, 'homepage services remain real keyboard-accessible navigation into the website');
assert.doesNotMatch(enhancePublicTemplateSource, /innerHTML\s*=|removeChild\s*\(/, 'template enhancement preserves the existing booking and account DOM contracts');
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
assert.match(editorMarkup, /<iframe[^>]*sandbox="allow-same-origin"/, 'the source-native preview permits same-document fragment exploration inside its isolated blob URL');
assert.match(runtime, /frame\.setAttribute\('sandbox','allow-same-origin'\)/, 'both preview entry points preserve fragment navigation');
assert.doesNotMatch(runtime, /allow-scripts/, 'the preview sandbox never enables script execution');
assert.doesNotMatch(runtime, /frame\.srcdoc\s*=/,'preview navigation never replaces the iframe with an app-relative srcdoc document');
assert.match(runtime, /new root\.Blob\(\[previewDocumentHtml\(doc,presetId\)\]/,'the complete scriptless website is materialized as one isolated preview document');
assert.match(runtime, /ob-ww-preview-page'\)\.addEventListener\('change',[\s\S]*?setPreviewPage\(this\.value\)/,'the preview page picker navigates the same isolated document');
assert.match(runtime, /previewWindow\.addEventListener\('hashchange',state\.previewHashHandler\)/, 'parent-owned hash observation synchronizes internal preview navigation without adding preview scripts');
assert.match(runtime, /syncPreviewPageFromFrame[\s\S]*?state\.previewPage=pageId;select\.value=pageId/, 'internal preview navigation updates both canonical state and the page selector');
assert.match(runtime, /setPreviewDevice\(button\.getAttribute\('data-ob-preview-device'\)\)/,'preview device controls update the responsive exploration stage');
assert.match(runtime, /Content-Security-Policy[\s\S]*?default-src \\'none\\'[\s\S]*?style-src \\'unsafe-inline\\'[\s\S]*?img-src https: http: data: blob:/, 'the generated document blocks all network capabilities except explicitly rendered media');
const draftPreviewSource = sourceOf('previewDocumentHtml', 'openPreviewDialog');
assert.doesNotMatch(draftPreviewSource, /<script|javascript:/i, 'the draft preview renderer contains no script execution path');
for (const sectionClass of ['hero', 'story', 'services', 'proof', 'final', 'footer']) {
  assert.match(draftPreviewSource, new RegExp(`class="${sectionClass}"`), `draft preview renders a complete ${sectionClass} section`);
}
assert.match(draftPreviewSource, /doc\.navigation\.home[\s\S]*?doc\.navigation\.about[\s\S]*?doc\.navigation\.services[\s\S]*?doc\.navigation\.reviews[\s\S]*?doc\.navigation\.contact/, 'draft preview renders the expert navigation labels');
assert.match(draftPreviewSource, /doc\.services\.chat_description[\s\S]*?doc\.services\.voice_description[\s\S]*?doc\.services\.video_description/, 'draft preview renders all supported service content');
assert.match(draftPreviewSource, /doc\.media && doc\.media\.profile_image_url/, 'draft preview uses the expert portrait when one exists');
for (const mediaRole of ['logo_image_url','social_share_image_url','about_image_url','services_image_url','reviews_image_url','contact_image_url']) {
  assert.match(draftPreviewSource, new RegExp(mediaRole), `draft preview consumes the ${mediaRole} semantic media role`);
}
assert.match(draftPreviewSource, /section\.image_url[\s\S]*?section\.image_alt/, 'draft preview renders a section image with its authored alternative text');
assert.match(draftPreviewSource, /types=\{feature:[^}]*story:[^}]*faq:[^}]*list:[^}]*quote:[^}]*gallery:[^}]*cta:[^}]*resource:/, 'draft preview recognizes every editable section type');
assert.match(draftPreviewSource, /previewCtaTarget[\s\S]*?return previewTargets\[target\] \? target : 'book'/, 'preview CTAs fall back to the real booking section when a core or custom target is unavailable');
assert.match(draftPreviewSource, /custom-section section-'\+type[\s\S]*?data-section-type="'\+type/, 'draft preview projects the selected section type into a distinct semantic renderer');
assert.match(draftPreviewSource, /templates=\{content:[^}]*article:[^}]*guide:[^}]*faq:[^}]*resource:/, 'draft preview recognizes every editable custom-page template');
assert.match(draftPreviewSource, /custom-page template-'\+template[\s\S]*?data-page-template="'\+template/, 'draft preview projects the selected page template into a distinct composition');
for (const templateId of Object.keys(expectedTemplateContracts)) {
  assert.match(draftPreviewSource, new RegExp(templateId.replaceAll('-', '\\-')), `draft preview contains a distinct ${templateId} composition branch`);
}
assert.match(draftPreviewSource, /Verified client reviews appear here after completed Ownlybiz sessions/, 'draft proof content is truthful and never invents testimonials');
const openWebsitePreviewSource = sourceOf('openWebsitePreview', 'surfaceStorageKey');
assert.match(openWebsitePreviewSource, /state\.dirty \|\| !state\.publication\.published[\s\S]*?showDraftPreview\(\)/, 'a changed template always previews the unsaved full draft, even when the current site is published');
const updateHeaderSource = sourceOf('updateHeader', 'markDirty');
assert.match(updateHeaderSource, /published && !state\.dirty \? 'View live site' : 'Preview draft'/, 'the header clearly distinguishes a saved live site from an unsaved template draft');
const bindWorkspaceSource = sourceOf('bindWorkspace', 'confirmLeaveWebsite');
assert.match(bindWorkspaceSource, /if\(state\.listenersInstalled\)\{[\s\S]*?return true; \}[\s\S]*?state\.listenersInstalled=true/, 'the source-native workspace binds its listeners exactly once');
assert.match(bindWorkspaceSource, /byId\('ob-ww-preview'\)\.addEventListener\('click',openWebsitePreview\)[\s\S]*?byId\('ob-ww-save'\)\.addEventListener\('click',saveWebsiteWorkspace\)/, 'the static header actions bind directly to the canonical preview and save lifecycles');
assert.doesNotMatch(bindWorkspaceSource, /MutationObserver|setInterval|insertAdjacentHTML|appendChild\(card\)/, 'binding does not poll, observe, construct, or reparent the Website interface');
assert.doesNotMatch(editorMarkup, /we-theme-grid|we-legacy-accent-card|id="ob-site-design-controls"/, 'obsolete theme, accent, and standalone layout systems are absent from the source-native editor');
assert.match(editorMarkup, /id="ob-site-color-controls"[\s\S]*?id="we-color-accent"[\s\S]*?id="we-color-action"[\s\S]*?id="we-color-status"/, 'experts can still tune the three accessible foundation colors');
assert.match(runtime, /data-ob-reset-foundation-colors[\s\S]*?restoreFoundationColors\(\)/, 'experts can explicitly restore foundation colors without abusing the selected-foundation action');
assert.match(aiWebsiteRuntime, /function availableAiCtaPage\([\s\S]*?return 'book'[\s\S]*?bindAiPublicActions[\s\S]*?availableAiCtaPage/, 'live custom-section CTAs fall back to the available booking page instead of routing to a missing page');
assert.match(runtime, /exactCredential:true/, 'website requests retain exact identity fencing');
assert.match(runtime, /Account changed while the website request was in progress/);
assert.match(runtime, /OB_CLIENT_CONTEXT\.register\('website-workspace-v2'/, 'identity transitions scrub and reload website-private state');
assert.match(aiWebsiteRuntime, /OB_CLIENT_CONTEXT\.capture\([\s\S]*?exactCredential:true/, 'every AI website request captures an exact account identity');
assert.match(aiWebsiteRuntime, /activeAiControllers\.forEach[\s\S]*?controller\.abort/, 'identity transitions abort in-flight AI website work');
assert.match(aiWebsiteRuntime, /register\('expert-website-ai'[\s\S]*?teardown:scrubExpertWebsiteAi[\s\S]*?credentialRotated:scrubExpertWebsiteAi/, 'AI drafts, modals, and results are scrubbed on identity changes');
assert.match(aiWebsiteRuntime, /lastPlanDraftVersion[\s\S]*?websiteDraftVersion\(\) !== lastPlanDraftVersion/, 'AI preview apply refuses to overwrite edits made after the preview');
assert.doesNotMatch(aiWebsiteRuntime, /\/api\/ai\/website-editor\/apply/, 'AI applies into the canonical unsaved Website draft instead of a second persistence endpoint');
assert.match(contentPagesRuntime, /guardDraft:true[\s\S]*?addGeneratedPage/, 'AI custom-page generation is fenced against intervening draft edits');
const mergeAiPagesSource = sourceOf('mergeAiPages', 'collectCredentials');
assert.match(mergeAiPagesSource, /result=clone\(Array\.isArray\(original\)/, 'AI page plans merge into the complete current page collection');
assert.match(mergeAiPagesSource, /published:saved\.published,show_in_nav:saved\.show_in_nav/, 'AI cannot silently publish or expose an existing page in navigation');
const applyAiDraftSource = sourceOf('applyAiDraft', 'statusNode');
assert.match(applyAiDraftSource, /expectedDraftVersion[\s\S]*?state\.editVersion/, 'the canonical draft independently validates AI preview freshness');
assert.doesNotMatch(applyAiDraftSource, /doc\.custom_pages=wc\.ai_pages\.map/, 'partial AI page output can never replace the expert’s complete page collection');
assert.match(runtime, /editVersion:state\.editVersion/, 'the Website workspace exposes a non-content freshness token to the AI editor');
assert.match(runtime, /design:\{template_id:'ownly-practice-focus-v1'[\s\S]*?tokens:clone\(TEMPLATE_PRESETS\[0\]\.tokens\)/, 'a new website starts from the complete Practice Focus foundation, including its exact colors');
assert.match(designForPresetSource, /if\(currentDesign\.template_id === preset\.template_id\)[\s\S]*?\['accent','action','status'\]/, 'safe custom roles stay with the exact selected foundation and cannot leak between foundations that share a palette family');
assert.doesNotMatch(designForPresetSource, /\['background','surface','text'\]|background.*currentDesign|surface.*currentDesign|text.*currentDesign/, 'structural colors are never inherited from an editable or different foundation');

console.log('Website workspace v2 contract and environment-safety smoke passed.');
console.log('Truthful IA, four complete renderers, locked structural design roles, eight-role media inventory, navigable isolated preview, Personal Assistant surfaces, plan/data preservation, and staging URL policy verified.');
