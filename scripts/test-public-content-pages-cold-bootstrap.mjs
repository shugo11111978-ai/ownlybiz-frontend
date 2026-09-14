import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');
const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function sourceRange(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `Missing source range beginning ${startMarker}`);
  return source.slice(start, end);
}

function scriptById(id) {
  const match = source.match(new RegExp(`<script id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match, `Missing script: ${id}`);
  return match[1];
}

const canonicalPublicRuntime = sourceRange(
  'var obPublicRenderLifecycle = { generation:0, current:null };',
  '\nfunction obPublicLoaderApiBase',
);
const showExpertPageRuntime = sourceRange(
  "var _currentEpPage = 'home';",
  '\n// ===== CALENDAR =====',
);
const highRiskPublicGate = scriptById('ownlybiz-expert-funnel-high-risk-20260610');
const aiWebsiteRuntime = scriptById('ob-ai-website-editor-20260517');

assert.match(
  highRiskPublicGate,
  /function applyAcceptedPublicPayload\(data, slug, source\)/,
  'the high-risk gate must own one canonical accepted-payload entry point',
);
assert.doesNotMatch(
  highRiskPublicGate,
  /window\._applyExpertWebsite\(cached\)/,
  'cached public profiles must not bypass the canonical lifecycle',
);
assert.match(
  aiWebsiteRuntime,
  /function renderCurrentPublicExtras\(\)[\s\S]*?return renderAiPublicExtras\(expert, operation\);/,
  'the real AI runtime must be able to replay the current public operation',
);
assert.match(
  aiWebsiteRuntime,
  /function boot\(\)[\s\S]*?renderCurrentPublicExtras\(\);/,
  'the real AI runtime must replay public content when it registers late',
);

const expert = {
  id: 'expert-liran1',
  user_id: 'user-liran1',
  slug: 'liran1',
  name: 'Liran Gut Health',
  rate_chat: 3,
  rate_voice: 4,
  rate_video: 5,
  chat_enabled: true,
  voice_enabled: true,
  video_enabled: true,
  packages: [],
  website_content: {
    ai_pages: [
      {
        slug: 'gut-health',
        template: 'article',
        title: 'Gut Health',
        nav_label: 'Gut Health',
        summary: 'A practical guide to building a calmer, more consistent gut-health routine.',
        cta_label: 'Book a conversation',
        cta_page: 'book',
        published: true,
        show_in_nav: true,
        sections: [
          {
            id: 'gut-foundations',
            type: 'story',
            title: 'Start with your foundations',
            body: 'Build a routine around food variety, sleep, movement, and signals from your body.',
            items: ['Track patterns without judgment', 'Change one habit at a time'],
          },
        ],
      },
      {
        slug: 'private-notes',
        template: 'resource',
        title: 'Private Notes',
        nav_label: 'Private Notes',
        summary: 'A published resource available by direct link for clients who already have it.',
        published: true,
        show_in_nav: false,
        sections: [
          {
            id: 'private-checklist',
            type: 'resource',
            title: 'Your preparation checklist',
            body: 'Bring recent observations and the questions you want to explore together.',
            items: ['Recent routines', 'Questions for the session'],
          },
        ],
      },
      {
        slug: 'draft-health-plan',
        template: 'guide',
        title: 'Draft Health Plan',
        nav_label: 'Draft Health Plan',
        summary: 'This page is complete but has not been published.',
        published: false,
        show_in_nav: true,
        sections: [],
      },
      {
        slug: 'new-page',
        template: 'content',
        title: 'New Page',
        nav_label: 'New Page',
        summary: 'A short subtitle for this page',
        published: true,
        show_in_nav: true,
        sections: [{ id: 'placeholder', type: 'story', body: 'Write the main page content here.' }],
      },
    ],
  },
};

const fixture = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body>
    <main class="view view-panel active" id="view-4">
      <nav aria-label="Expert website">
        <button id="expert-hamburger" type="button">Menu</button>
        <ul class="expert-site-links" id="expert-site-links">
          <li><a href="/liran1" data-ob-expert-page="home" onclick="showExpertPage('home');return false">Home</a></li>
          <li><a href="/liran1/about" data-ob-expert-page="about" onclick="showExpertPage('about');return false">About</a></li>
          <li><a href="/liran1/services" data-ob-expert-page="services" onclick="showExpertPage('services');return false">Services</a></li>
          <li><a href="/liran1/reviews" data-ob-expert-page="reviews" onclick="showExpertPage('reviews');return false">Reviews</a></li>
          <li><a href="/liran1/book" data-ob-expert-page="book" onclick="showExpertPage('book');return false">Book a Session</a></li>
          <li><a href="/liran1/contact" data-ob-expert-page="contact" onclick="showExpertPage('contact');return false">Contact</a></li>
        </ul>
      </nav>
      <section class="expert-page active" id="ep-home"><h1>Home</h1></section>
      <section class="expert-page" id="ep-about"><h1>About</h1></section>
      <section class="expert-page" id="ep-services"><h1>Services</h1></section>
      <section class="expert-page" id="ep-reviews"><h1>Reviews</h1></section>
      <section class="expert-page" id="ep-book"><h1>Book</h1></section>
      <section class="expert-page" id="ep-contact"><h1>Contact</h1></section>
    </main>
  </body>
</html>`;

const browser = await chromium.launch({
  headless: true,
  ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}),
});

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/*', route => {
    const request = route.request();
    if (request.isNavigationRequest() && request.url() === 'http://localhost/liran1/gut-health') {
      return route.fulfill({ status: 200, contentType: 'text/html', body: fixture });
    }
    return route.abort();
  });

  const pageErrors = [];
  const consoleErrors = [];
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(String(error && (error.stack || error.message) || error)));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('http://localhost/liran1/gut-health', { waitUntil: 'domcontentloaded' });
  await page.evaluate(payload => {
    window.__OB_PRELOADED_EXPERT__ = { slug: payload.slug, expert: payload, packages: payload.packages };
    window.__OB_TEST_HOOKS__ = {};
    window.obIsPlatformRouteRoot = value => ['dash', 'admin', 'terms', 'privacy', 'legal'].includes(String(value || '').toLowerCase());
    window.OB_RATE_POLICY = {
      ownerRate(data, channel) {
        return Number(data && (data[`rate_${channel}`] ?? data[`${channel}_pm`]) || 0);
      },
      hasStartableMinuteChannel(data) {
        return ['chat', 'voice', 'video'].some(channel => data && data[`${channel}_enabled`] !== false && Number(data[`rate_${channel}`] ?? data[`${channel}_pm`] ?? 0) > 0);
      },
    };
    window.setExpertOnlineStatus = () => {};
    window.loadExpertOnlineStatus = () => Promise.resolve(null);
    window._markRouteLoading = () => {};
    window._markRouteReady = () => {};
    window._refreshPublicPage = () => { window.__refreshCount = (window.__refreshCount || 0) + 1; };
    window._applyExpertWebsite = data => {
      window.__legacyApplyCount = (window.__legacyApplyCount || 0) + 1;
      window.__legacyAppliedSlug = String(data && (data.slug || data.user_slug) || '');
      return data;
    };
    window.loadExpertWebsite = slug => {
      window.__legacyLoadCount = (window.__legacyLoadCount || 0) + 1;
      window.__legacyLoadedSlug = String(slug || '');
      return Promise.resolve(null);
    };
  }, expert);

  await page.addScriptTag({ content: `var stypeSelected = false;\n${showExpertPageRuntime}\n${canonicalPublicRuntime}` });
  assert.deepEqual(
    await page.evaluate(() => ({ generation: window.obPublicRenderLifecycle.generation, current: window.obPublicRenderLifecycle.current })),
    { generation: 0, current: null },
    'the cold public page must begin without a render lifecycle operation',
  );

  await page.addScriptTag({ content: highRiskPublicGate });
  await page.waitForFunction(() => window.obPublicRenderLifecycle && window.obPublicRenderLifecycle.current && window.__obPublicExpertPayloadApplied === true);

  const beforeRenderer = await page.evaluate(() => ({
    generation: window.obPublicRenderLifecycle.generation,
    operationSlug: window.obPublicRenderLifecycle.current && window.obPublicRenderLifecycle.current.slug,
    currentSlug: window._currentExpert && window._currentExpert.slug,
    customPages: document.querySelectorAll('.ob-ai-custom-page').length,
    customNav: document.querySelectorAll('[data-ai-page-link]').length,
    legacyApplyCount: window.__legacyApplyCount || 0,
  }));
  assert(beforeRenderer.generation > 0, 'preloaded gate boot must enter the canonical lifecycle');
  assert.equal(beforeRenderer.operationSlug, 'liran1');
  assert.equal(beforeRenderer.currentSlug, 'liran1');
  assert.equal(beforeRenderer.customPages, 0, 'content pages cannot render before their real renderer registers');
  assert.equal(beforeRenderer.customNav, 0);
  assert(beforeRenderer.legacyApplyCount > 0, 'canonical apply must still run the core website renderer');

  await page.addScriptTag({ content: aiWebsiteRuntime });
  await page.waitForFunction(() => document.querySelector('#ep-ai-gut-health.active') && document.querySelector('a[data-ai-page-link="gut-health"]'));

  async function assertExactPublicPages(expectedActive, expectedPath) {
    const snapshot = await page.evaluate(() => ({
      path: location.pathname,
      customPages: Array.from(document.querySelectorAll('.ob-ai-custom-page')).map(node => node.id),
      customNav: Array.from(document.querySelectorAll('[data-ai-page-link]')).map(node => ({
        slug: node.getAttribute('data-ai-page-link'),
        href: node.getAttribute('href'),
        text: String(node.textContent || '').trim(),
      })),
      activeCustomPages: Array.from(document.querySelectorAll('.ob-ai-custom-page.active')).map(node => node.id),
      gutTitle: String(document.querySelector('#ep-ai-gut-health h1')?.textContent || '').trim(),
      gutCopy: String(document.querySelector('#ep-ai-gut-health')?.textContent || '').replace(/\s+/g, ' ').trim(),
      privateNodeCount: document.querySelectorAll('#ep-ai-private-notes').length,
      privateNavCount: document.querySelectorAll('[data-ai-page-link="private-notes"]').length,
      unpublishedNodeCount: document.querySelectorAll('#ep-ai-draft-health-plan').length,
      unpublishedNavCount: document.querySelectorAll('[data-ai-page-link="draft-health-plan"]').length,
      placeholderNodeCount: document.querySelectorAll('#ep-ai-new-page').length,
      placeholderNavCount: document.querySelectorAll('[data-ai-page-link="new-page"]').length,
    }));

    assert.equal(snapshot.path, expectedPath);
    assert.deepEqual(snapshot.customPages, ['ep-ai-gut-health', 'ep-ai-private-notes'], 'only the two safe published pages render, exactly once');
    assert.deepEqual(snapshot.customNav, [{ slug: 'gut-health', href: '/liran1/gut-health', text: 'Gut Health' }], 'only the visible published page enters navigation, exactly once');
    assert.deepEqual(snapshot.activeCustomPages, [expectedActive]);
    assert.equal(snapshot.gutTitle, 'Gut Health');
    assert.match(snapshot.gutCopy, /Start with your foundations/);
    assert.equal(snapshot.privateNodeCount, 1, 'hidden-nav published pages remain directly addressable');
    assert.equal(snapshot.privateNavCount, 0, 'hidden-nav pages must not leak into navigation');
    assert.equal(snapshot.unpublishedNodeCount, 0, 'unpublished pages must not enter public DOM');
    assert.equal(snapshot.unpublishedNavCount, 0, 'unpublished pages must not enter public navigation');
    assert.equal(snapshot.placeholderNodeCount, 0, 'unsafe placeholder copy must not enter public DOM');
    assert.equal(snapshot.placeholderNavCount, 0, 'unsafe placeholder copy must not enter public navigation');
  }

  await assertExactPublicPages('ep-ai-gut-health', '/liran1/gut-health');

  await page.evaluate(() => window.showExpertPage('home'));
  await page.locator('a[data-ai-page-link="gut-health"]').click();
  assert.equal(await page.locator('#ep-ai-gut-health').evaluate(node => node.classList.contains('active')), true, 'Gut Health navigation must open its real content node');

  const renderResults = await page.evaluate(() => {
    const operation = window.obPublicRenderLifecycle.current;
    return [
      window.obRenderAiPublicExtras(window._currentExpert, operation),
      window.obRenderAiPublicExtras(window._currentExpert, operation),
      window.obRenderAiPublicExtras(window._currentExpert, operation),
    ];
  });
  assert.deepEqual(renderResults, [true, true, true], 'replaying the current operation remains accepted and idempotent');
  await page.evaluate(() => window.loadExpertWebsite('liran1'));
  await page.waitForTimeout(550);
  await assertExactPublicPages('ep-ai-gut-health', '/liran1/gut-health');

  await page.evaluate(() => {
    history.replaceState({ obRoute: true }, '', '/liran1/private-notes');
    window._pendingExpertPage = 'ai-private-notes';
    window.obRenderAiPublicExtras(window._currentExpert, window.obPublicRenderLifecycle.current);
  });
  await assertExactPublicPages('ep-ai-private-notes', '/liran1/private-notes');

  const beforeStale = await page.evaluate(() => ({
    generation: window.obPublicRenderLifecycle.generation,
    expert: window._currentExpert,
    legacyApplyCount: window.__legacyApplyCount || 0,
  }));
  const staleResult = await page.evaluate(payload => {
    const guardedResult = window._applyExpertWebsite(payload);
    const canonicalResult = window.obApplyPublicExpertPayload(payload, payload.slug, { expert: payload });
    return {
      guardedAccepted: guardedResult !== undefined,
      canonicalAccepted: canonicalResult !== null,
      generation: window.obPublicRenderLifecycle.generation,
      currentSlug: window._currentExpert && window._currentExpert.slug,
      legacyApplyCount: window.__legacyApplyCount || 0,
    };
  }, { ...expert, slug: 'stale-expert', name: 'Stale Expert' });
  assert.deepEqual(staleResult, {
    guardedAccepted: false,
    canonicalAccepted: false,
    generation: beforeStale.generation,
    currentSlug: 'liran1',
    legacyApplyCount: beforeStale.legacyApplyCount,
  }, 'a stale expert slug is rejected by both the high-risk gate and canonical lifecycle');
  await assertExactPublicPages('ep-ai-private-notes', '/liran1/private-notes');

  assert.deepEqual(pageErrors, [], `unexpected page errors: ${pageErrors.join('\n')}`);
  assert.deepEqual(consoleErrors, [], `unexpected console errors: ${consoleErrors.join('\n')}`);

  console.log(JSON.stringify({
    status: 'PASS',
    lifecycle: 'null → accepted preloaded/cached canonical operation → late real renderer replay',
    exactPublicPages: 2,
    exactPublicNavLinks: 1,
    directDeepLinks: ['gut-health', 'private-notes'],
    rejected: ['unpublished page', 'unsafe placeholder page', 'stale expert slug'],
    network: 'offline and all non-document requests aborted',
  }));
} finally {
  await browser.close();
}
