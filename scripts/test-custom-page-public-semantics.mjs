import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');
const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function blockById(tag, id) {
  const match = source.match(new RegExp(`<${tag} id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/${tag}>`));
  assert(match, `Missing ${tag}#${id}`);
  return match[1];
}

function sourceRange(value, startMarker, endMarker) {
  const start = value.indexOf(startMarker);
  const end = value.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `Missing source range beginning ${startMarker}`);
  return value.slice(start, end);
}

const aiRuntime = blockById('script', 'ob-ai-website-editor-20260517');
const textHelpers = sourceRange(aiRuntime, '  function esc(value){', '  function baseUrl(){');
const publicRuntime = sourceRange(aiRuntime, '  function safeSlug(value){', '  window.obEnsureWebsiteAi = ensureWebsiteAi;');
const executablePublicRuntime = `'use strict';\n${textHelpers}\n${publicRuntime}\nwindow.obRenderAiPublicExtras = renderAiPublicExtras;`;
const publicCss = blockById('style', 'ownlybiz-content-pages-editor-20260522-css');

const sectionTypes = ['feature', 'story', 'faq', 'list', 'quote', 'gallery', 'cta', 'resource'];
const pageTemplates = {
  'content-hub': 'content',
  'founder-notes': 'article',
  'decision-guide': 'guide',
  'common-questions': 'faq',
  'resource-library': 'resource',
};

function section(type, index, destination) {
  return {
    id: `${type}-section`,
    type,
    title: `${type[0].toUpperCase()}${type.slice(1)} heading`,
    body: `${type} body line one.\n${type} body line two.`,
    items: [`${type} item one`, `${type} item two`],
    cta_label: `${type} action`,
    cta_page: destination,
    image_url: `https://images.example.test/${index}-${type}.jpg`,
    image_alt: `${type} image — meaningful & specific`,
  };
}

const pages = [
  {
    slug: 'content-hub', template: 'content', title: 'Content hub', nav_label: 'Content',
    summary: 'A flexible expert page with two complete sections.', header_image_url: 'https://images.example.test/content-header.jpg',
    cta_label: 'Content page action', cta_page: 'book', published: true, show_in_nav: true,
    sections: [section('feature', 1, 'about'), section('story', 2, 'services')],
  },
  {
    slug: 'founder-notes', template: 'article', title: 'Founder notes', nav_label: 'Notes',
    summary: 'A focused long-form article for thoughtful readers.', header_image_url: 'https://images.example.test/article-header.jpg',
    cta_label: 'Article page action', cta_page: 'reviews', published: true, show_in_nav: true,
    sections: [section('quote', 3, 'reviews')],
  },
  {
    slug: 'decision-guide', template: 'guide', title: 'Decision guide', nav_label: 'Guide',
    summary: 'A practical sequence visitors can follow.', header_image_url: 'https://images.example.test/guide-header.jpg',
    cta_label: 'Guide page action', cta_page: 'contact', published: true, show_in_nav: true,
    sections: [section('list', 4, 'contact'), section('cta', 5, 'book')],
  },
  {
    slug: 'common-questions', template: 'faq', title: 'Common questions', nav_label: 'FAQ',
    summary: 'Clear answers before a client books.', header_image_url: 'https://images.example.test/faq-header.jpg',
    cta_label: 'FAQ page action', cta_page: 'contact', published: true, show_in_nav: true,
    sections: [section('faq', 6, 'contact')],
  },
  {
    slug: 'resource-library', template: 'resource', title: 'Resource library', nav_label: 'Resources',
    summary: 'Useful materials and visual examples.', header_image_url: 'https://images.example.test/resource-header.jpg',
    cta_label: 'Resource page action', cta_page: 'content-hub', published: true, show_in_nav: true,
    sections: [section('resource', 7, 'content-hub'), section('gallery', 8, 'home')],
  },
];

const expert = {
  slug: 'ari-lane',
  website_content: {
    ai_sections: [{
      id: 'legacy-home-heading', type: 'feature', heading: 'Legacy home heading',
      body: 'Legacy homepage copy stays visible.', items: ['Legacy point'],
      image_url: 'https://images.example.test/legacy-home.jpg', image_alt: 'Legacy homepage visual',
    }],
    ai_pages: pages,
  },
};

const browser = await chromium.launch({
  headless: true,
  ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}),
});

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/*', async route => {
    const request = route.request();
    if (request.isNavigationRequest() && request.url().startsWith('http://localhost/expert-semantic?expert=')) {
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
          <main id="view-4" style="--ob-site-bg:#f7f1e8;--ob-site-surface:#fffdf8;--ob-site-text:#241a15;--ob-site-accent:#a8441e;--ob-site-status:#435f35">
            <section class="expert-page" id="ep-home"><h1>Home</h1></section>
            <ul id="expert-site-links"><li id="standard-book-link"><a href="#book">Book</a></li></ul>
            <section class="expert-page" id="ep-about"><h1>About</h1></section>
            <section class="expert-page" id="ep-services"><h1>Services</h1></section>
            <section class="expert-page" id="ep-reviews"><h1>Reviews</h1></section>
            <section class="expert-page" id="ep-book"><button id="existing-book-action" type="button">Existing booking action</button></section>
            <section class="expert-page" id="ep-contact"><h1>Contact</h1></section>
            <section class="expert-page" id="ep-account"><button id="existing-account-action" type="button">Existing account action</button></section>
          </main>
        </body></html>`,
      });
    }
    return route.abort();
  });

  const page = await context.newPage();
  await page.goto('http://localhost/expert-semantic?expert=ari');
  await page.addStyleTag({ content: publicCss });
  await page.evaluate(data => {
    window._currentExpert = data;
    window.__pageCalls = [];
    window.__existingCalls = [];
    window.__acceptedOperation = { generation: 7 };
    window.obPublicExpertRenderCurrent = operation => operation === window.__acceptedOperation;
    window.obPublicApplyAccepted = () => true;
    window.showExpertPage = target => window.__pageCalls.push(target);
    document.getElementById('existing-book-action').addEventListener('click', () => window.__existingCalls.push('book'));
    document.getElementById('existing-account-action').addEventListener('click', () => window.__existingCalls.push('account'));
    window.__bookNode = document.getElementById('existing-book-action');
    window.__accountNode = document.getElementById('existing-account-action');
  }, expert);
  await page.addScriptTag({ content: executablePublicRuntime });

  assert.equal(await page.evaluate(data => window.obRenderAiPublicExtras(data, { generation: 6 }), expert), false, 'stale operations cannot mutate public output');
  assert.equal(await page.locator('.ob-ai-custom-page').count(), 0, 'the operation fence blocks stale page insertion');
  assert.equal(await page.evaluate(data => window.obRenderAiPublicExtras(data, window.__acceptedOperation), expert), true, 'the canonical public renderer accepts the current operation');

  assert.equal(await page.locator('.ob-ai-custom-page').count(), 5, 'all five published template pages render');
  assert.equal(await page.locator('#expert-site-links [data-ai-page-link]').count(), 5, 'all five saved navigation entries render once');
  assert.equal(await page.locator('[data-ob-ai-public-extra="home-sections"] h2').textContent(), 'Legacy home heading', 'legacy heading remains a supported public title alias');
  assert.equal(await page.locator('[data-ob-ai-public-extra="home-sections"] img').getAttribute('alt'), 'Legacy homepage visual', 'homepage section alt text is honored');

  for (const [slug, template] of Object.entries(pageTemplates)) {
    const customPage = page.locator(`#ep-ai-${slug}`);
    assert.equal(await customPage.getAttribute('data-ob-ai-page-template'), template, `${template}: saved template reaches the public marker`);
    assert(await customPage.evaluate((node, value) => node.classList.contains(`ob-ai-page-template-${value}`), template), `${template}: saved template reaches a distinct public class`);
    const labelledBy = await customPage.getAttribute('aria-labelledby');
    assert(labelledBy, `${template}: page region has an accessible heading reference`);
    assert.equal(await customPage.locator(`#${labelledBy}`).count(), 1, `${template}: accessible page heading reference resolves`);
    assert.equal(await customPage.locator('.ob-cp-page-kicker').textContent(), {
      content: 'Expert page', article: 'Article', guide: 'Practical guide', faq: 'Questions and answers', resource: 'Resource library',
    }[template], `${template}: template choice is visible to visitors`);
    assert.equal(await customPage.locator('[data-ob-ai-page-body]').evaluate(node => node.tagName), template === 'article' ? 'ARTICLE' : 'DIV', `${template}: page uses the intended body landmark`);
    assert.equal(await customPage.locator('.ob-cp-hero-image img').getAttribute('alt'), pages.find(item => item.slug === slug).title, `${template}: header media has a useful title fallback`);
  }

  for (const type of sectionTypes) {
    const sectionNode = page.locator(`.ob-ai-custom-page [data-ai-section-type="${type}"]`);
    assert.equal(await sectionNode.count(), 1, `${type}: exactly one typed fixture section renders`);
    assert(await sectionNode.evaluate((node, value) => node.classList.contains(`ob-ai-section-${value}`), type), `${type}: saved type controls a distinct public class`);
    const labelledBy = await sectionNode.getAttribute('aria-labelledby');
    assert(labelledBy, `${type}: section has an accessible heading reference`);
    assert.equal(await sectionNode.locator(`#${labelledBy}`).count(), 1, `${type}: section heading reference resolves`);
    assert.equal(await sectionNode.locator('img').getAttribute('alt'), `${type} image — meaningful & specific`, `${type}: exact saved image description reaches the public image`);
    assert.equal(await sectionNode.locator('img').getAttribute('loading'), 'lazy', `${type}: section media is lazy-loaded`);
    assert.equal(await sectionNode.locator('img').getAttribute('decoding'), 'async', `${type}: section media is decoded asynchronously`);
    assert((await sectionNode.textContent()).includes(`${type} action`), `${type}: saved CTA remains visible`);
    assert((await sectionNode.textContent()).includes(`${type} item one`), `${type}: saved items remain visible`);
  }

  assert.equal(await page.locator('.ob-ai-section-feature .ob-ai-feature-list').count(), 2, 'feature sections use a feature-list structure on home and custom pages');
  assert.equal(await page.locator('.ob-ai-section-story .ob-ai-story-list').count(), 1, 'story items use the narrative-list structure');
  assert.equal(await page.locator('.ob-ai-section-faq details').count(), 2, 'FAQ items use disclosure semantics');
  assert.equal(await page.locator('.ob-ai-section-faq details[open]').count(), 1, 'the first FAQ answer is initially discoverable');
  assert.equal(await page.locator('.ob-ai-section-list > .ob-ai-section-layout ol').count(), 1, 'list sections use an ordered list');
  assert.equal(await page.locator('.ob-ai-section-quote blockquote').count(), 1, 'quote copy uses a blockquote');
  assert.equal(await page.locator('.ob-ai-section-quote figcaption span').count(), 2, 'quote attribution items use a figure caption');
  assert.equal(await page.locator('.ob-ai-section-gallery .ob-ai-section-media figcaption').count(), 1, 'gallery body becomes its media caption');
  assert.equal(await page.locator('.ob-ai-section-cta .ob-ai-section-actions').count(), 1, 'CTA sections expose an explicit action area');
  assert.equal(await page.locator('.ob-ai-section-resource .ob-ai-resource-list').count(), 1, 'resource items use their resource-list structure');

  const expectedDestinations = ['about', 'services', 'contact', 'contact', 'reviews', 'home', 'book', 'ai-content-hub'];
  await page.evaluate(() => { window.__pageCalls = []; });
  for (const type of sectionTypes) await page.locator(`.ob-ai-custom-page [data-ai-section-type="${type}"] [data-ob-ai-cta-page]`).click();
  assert.deepEqual(await page.evaluate(() => window.__pageCalls), expectedDestinations, 'each section CTA preserves its saved standard or custom-page destination');

  assert.equal(await page.evaluate(data => window.obRenderAiPublicExtras(data, window.__acceptedOperation), expert), true, 'a current refresh rerenders cleanly');
  assert.equal(await page.locator('.ob-ai-custom-page').count(), 5, 'rerender replaces pages instead of duplicating them');
  assert.equal(await page.locator('#expert-site-links [data-ai-page-link]').count(), 5, 'rerender replaces navigation instead of duplicating it');
  await page.evaluate(() => { window.__pageCalls = []; });
  await page.locator('.ob-ai-custom-page [data-ai-section-type="cta"] [data-ob-ai-cta-page]').click();
  assert.deepEqual(await page.evaluate(() => window.__pageCalls), ['book'], 'rerender binds one CTA handler without feedback or duplicate delivery');

  assert.equal(await page.evaluate(() => document.getElementById('existing-book-action') === window.__bookNode), true, 'existing booking action node is preserved');
  assert.equal(await page.evaluate(() => document.getElementById('existing-account-action') === window.__accountNode), true, 'existing account action node is preserved');
  await page.locator('#existing-book-action').click();
  await page.locator('#existing-account-action').click();
  assert.deepEqual(await page.evaluate(() => window.__existingCalls), ['book', 'account'], 'existing booking and account behavior remains live');

  const desktopLayout = await page.locator('#ep-ai-resource-library .ob-cp-page-body').evaluate(node => getComputedStyle(node).gridTemplateColumns);
  assert.equal(desktopLayout.trim().split(/\s+/).length, 2, 'resource template uses its two-column desktop layout');
  assert.equal(await page.locator('#ep-ai-article-never-created').count(), 0, 'renderer never fabricates unsaved pages');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayouts = await page.evaluate(() => ({
    guide: getComputedStyle(document.querySelector('#ep-ai-decision-guide .ob-cp-page-body')).gridTemplateColumns,
    resource: getComputedStyle(document.querySelector('#ep-ai-resource-library .ob-cp-page-body')).gridTemplateColumns,
    media: getComputedStyle(document.querySelector('.ob-ai-custom-page .ob-ai-public-section.has-media .ob-ai-section-layout')).gridTemplateColumns,
    scrollWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  assert.equal(mobileLayouts.guide.trim().split(/\s+/).length, 1, 'guide template collapses to one mobile column');
  assert.equal(mobileLayouts.resource.trim().split(/\s+/).length, 1, 'resource template collapses to one mobile column');
  assert.equal(mobileLayouts.media.trim().split(/\s+/).length, 1, 'section media collapses below copy on mobile');
  assert(mobileLayouts.scrollWidth <= mobileLayouts.viewport, 'typed pages do not create horizontal mobile overflow');

  console.log('custom-page public semantics: all five templates, eight section types, media accessibility, actions, and responsive layout passed');
} finally {
  await browser.close();
}
