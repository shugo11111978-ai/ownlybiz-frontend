import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');
const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `missing source range: ${startMarker}`);
  return source.slice(start, end);
}

const metadataLifecycle = extract('  function syncPublicPageMetadata(event){', '  function boot(){');
const canonicalApply = extract('function obApplyPublicExpertPayload(e, slug, source) {', 'function obPublicLoaderApiBase()');
const cachedRepaint = extract('  function repaintCurrentExpert(slug){', '  function loadExpertOnce(slug){');
const seoRuntime = extract('/* SEO + analytics production patch 2026-04-26 */', '/* Admin SEO configuration patch 2026-04-26 */');

assert.match(metadataLifecycle, /window\.obSyncPublicPageMetadata=syncPublicPageMetadata/, 'page metadata owns an exported canonical lifecycle');
assert.match(canonicalApply, /obSyncPublicPageMetadata\(\)/, 'initial expert rendering finishes through canonical page metadata');
assert.match(cachedRepaint, /obSyncPublicPageMetadata\(\)/, 'cached expert repaint finishes through canonical page metadata');
assert.doesNotMatch(seoRuntime, /window\.(?:_applyExpertWebsite|switchView|adminTabSwitch)\s*=/, 'SEO and analytics do not wrap shared rendering or navigation functions');

const browser = await chromium.launch({
  headless: true,
  ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}),
});

try {
  const context = await browser.newContext();
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  await page.setContent(`<!doctype html><html><head><title>Initial</title><meta name="description" content="Initial"></head><body>
    <main id="view-4">
      <section id="ep-home" class="expert-page"></section>
      <section id="ep-ai-complete-guide" class="expert-page active" data-meta-title="Complete guide" data-meta-description="Custom guide description"></section>
    </main>
  </body></html>`);
  await page.evaluate(() => {
    window._currentExpert = { slug: 'expert-a', name: 'Expert A' };
    window._currentExpertSlug = 'expert-a';
    window._browseExpert = 'expert-a';
    window._pendingExpertPage = 'ai-complete-guide';
    window.__metadataCalls = [];
    window.obApplyExpertSeoAndAnalytics = (expert, options) => {
      document.title = `${expert.name} | Ownlybiz`;
      document.querySelector('meta[name="description"]').setAttribute('content', 'Base expert description');
      window.__metadataCalls.push({ type: 'base', track: options?.track });
      return true;
    };
    window.obTrackPageview = data => window.__metadataCalls.push({ type: 'track', pageType: data.page_type });
  });
  await page.addScriptTag({ content: metadataLifecycle });

  await page.evaluate(() => window.obSyncPublicPageMetadata());
  assert.deepEqual(await page.evaluate(() => ({ title: document.title, description: document.querySelector('meta[name="description"]').content })), {
    title: 'Complete guide',
    description: 'Custom guide description',
  }, 'cached custom-page routing applies custom metadata after the base expert SEO pass');

  await page.evaluate(() => {
    document.getElementById('ep-ai-complete-guide').classList.remove('active');
    document.getElementById('ep-home').classList.add('active');
    window._pendingExpertPage = 'home';
    window.obSyncPublicPageMetadata({ detail: { page: 'home', pageElement: document.getElementById('ep-home') } });
  });
  assert.deepEqual(await page.evaluate(() => ({ title: document.title, description: document.querySelector('meta[name="description"]').content })), {
    title: 'Expert A | Ownlybiz',
    description: 'Base expert description',
  }, 'standard-page navigation restores the expert-wide metadata');

  await page.evaluate(() => {
    document.getElementById('ep-home').classList.remove('active');
    document.getElementById('ep-ai-complete-guide').classList.add('active');
    window._pendingExpertPage = 'ai-complete-guide';
    window.obSyncPublicPageMetadata({ detail: { page: 'ai-complete-guide', pageElement: document.getElementById('ep-ai-complete-guide') } });
  });
  assert.equal(await page.title(), 'Complete guide', 'custom metadata is restored on a standard-to-custom revisit');
  assert.deepEqual(await page.evaluate(() => window.__metadataCalls.filter(call => call.type === 'track').map(call => call.pageType)), [
    'expert-custom-page',
    'expert',
    'expert-custom-page',
  ], 'each page transition reports its truthful route type');

  console.log(JSON.stringify({ status: 'PASS', transitions: ['custom → standard → custom'], network: 'offline and all requests aborted' }));
} finally {
  await browser.close();
}
