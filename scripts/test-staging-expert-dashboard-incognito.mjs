import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');

const stagingUrl = new URL(process.env.OWNLYBIZ_STAGING_URL || '');
const email = String(process.env.OWNLYBIZ_EXPERT_EMAIL || 'liran1s@gmail.com').trim();
const password = String(process.env.OWNLYBIZ_EXPERT_PASSWORD || '');
const expectedSlug = String(process.env.OWNLYBIZ_EXPERT_SLUG || 'liran1').trim();
const screenshotDirectory = resolve(process.env.OWNLYBIZ_QA_SCREENSHOT_DIR || '/private/tmp/ownlybiz-staging-expert-qa');

assert.equal(stagingUrl.protocol, 'https:', 'staging QA requires HTTPS');
assert.match(stagingUrl.hostname, /\.vercel\.app$/i, 'staging QA refuses non-Vercel and production hosts');
assert(!/^ownlybiz\.com$/i.test(stagingUrl.hostname), 'staging QA refuses the production hostname');
assert(email, 'OWNLYBIZ_EXPERT_EMAIL is required');
assert(password, 'OWNLYBIZ_EXPERT_PASSWORD is required');
assert(expectedSlug, 'OWNLYBIZ_EXPERT_SLUG is required');

mkdirSync(screenshotDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}),
});

const blockedMutations = [];
const severeConsole = [];

try {
  // browser.newContext() is Playwright's isolated/incognito boundary: it starts
  // without the cookies, local storage, session storage, or cache of admin QA.
  const context = await browser.newContext({
    viewport: { width: 1512, height: 940 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  page.on('console', message => {
    if (message.type() === 'error') severeConsole.push(message.text());
  });
  page.on('pageerror', error => severeConsole.push(error.message));

  await page.route('**/*', async route => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const target = new URL(request.url());
    const isLogin = method === 'POST' && target.pathname === '/api/auth/login';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !isLogin) {
      blockedMutations.push(`${method} ${target.pathname}`);
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });

  await page.goto(new URL('/login', stagingUrl).href, { waitUntil: 'domcontentloaded' });
  await page.locator('#mkt-login-email').fill(email);
  await page.locator('#mkt-login-pass').fill(password);
  await page.locator('#mkt-login-btn').click();
  await page.waitForFunction(slug => {
    const dashboard = document.querySelector('#view-3.active');
    return dashboard && location.pathname.startsWith(`/dash/${slug}`);
  }, expectedSlug, { timeout: 30_000 });

  const identity = await page.evaluate(() => {
    let user = {};
    try {
      user = JSON.parse(sessionStorage.getItem('ob_u') || localStorage.getItem('ob_u') || '{}') || {};
    } catch {}
    const context = window.OB_CLIENT_CONTEXT && window.OB_CLIENT_CONTEXT.capture
      ? window.OB_CLIENT_CONTEXT.capture('staging-incognito-qa')
      : {};
    return {
      role: String(user.role || context.role || '').toLowerCase(),
      email: String(user.email || '').toLowerCase(),
      principal: String(context.principal || ''),
      hasCredential: Boolean(context.token),
    };
  });
  assert.equal(identity.role, 'expert', 'isolated session is authenticated as an expert');
  assert.equal(identity.email, email.toLowerCase(), 'isolated session belongs to the requested staging expert');
  assert(identity.principal, 'expert session has a principal identity');
  assert(identity.hasCredential, 'expert session has an authenticated credential');

  await page.goto(new URL(`/dash/${encodeURIComponent(expectedSlug)}/website-editor`, stagingUrl).href, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('#db-panel-website-editor.active', { state: 'visible', timeout: 30_000 });
  await page.waitForSelector('[data-ob-website-surface="design"]', { state: 'visible', timeout: 30_000 });
  await page.locator('[data-ob-website-surface="design"]').click();
  await page.waitForSelector('.ob-ww-template-grid', { state: 'visible', timeout: 20_000 });
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('.ob-ww-template-preview'));
    return images.length === 4 && images.every(image => image.complete && image.naturalWidth >= 1000);
  }, null, { timeout: 20_000 });

  const desktop = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.ob-ww-template'));
    const selected = cards.find(card => card.dataset.selected === 'true');
    const personalAssistant = document.getElementById('ob-ww-assistant');
    const nav = document.querySelector('[aria-label="Website workspace"]');
    return {
      cardCount: cards.length,
      selectedPreset: selected ? selected.dataset.preset : '',
      imageWidths: cards.map(card => card.querySelector('img')?.naturalWidth || 0),
      assistantVisible: Boolean(personalAssistant && personalAssistant.getBoundingClientRect().width),
      surfaceCount: nav ? nav.querySelectorAll('[data-ob-website-surface]').length : 0,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  assert.equal(desktop.cardCount, 4, 'all four complete website foundations are present');
  assert(desktop.selectedPreset, 'one saved website foundation is current');
  assert(desktop.imageWidths.every(width => width >= 1000), 'every foundation uses a real high-resolution website preview');
  assert(desktop.assistantVisible, 'Personal Assistant is present in Website');
  assert(desktop.surfaceCount >= 7, 'the complete Website workspace navigation is present');
  assert(desktop.documentOverflow <= 1, 'desktop Website workspace has no horizontal document overflow');

  await page.screenshot({ path: `${screenshotDirectory}/website-design-desktop.png`, fullPage: true });

  const alternate = await page.locator('.ob-ww-template').evaluateAll((cards, selectedPreset) => {
    const card = cards.find(candidate => candidate.dataset.preset !== selectedPreset);
    return card ? card.dataset.preset : '';
  }, desktop.selectedPreset);
  assert(alternate, 'an alternate foundation is available for draft-only selection QA');
  await page.locator(`.ob-ww-template[data-preset="${alternate}"] [data-template-action="use"]`).click();
  await page.waitForFunction(preset => {
    const status = document.getElementById('ob-website-workspace-status');
    const selected = document.querySelector(`.ob-ww-template[data-preset="${preset}"]`);
    return selected?.dataset.selected === 'true' && /unsaved changes/i.test(status?.textContent || '');
  }, alternate);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#db-panel-website-editor.active', { state: 'visible', timeout: 30_000 });
  await page.locator('[data-ob-website-surface="design"]').click();
  await page.waitForFunction(savedPreset => {
    const selected = document.querySelector('.ob-ww-template[data-selected="true"]');
    const status = document.getElementById('ob-website-workspace-status');
    return selected?.dataset.preset === savedPreset && !/unsaved changes/i.test(status?.textContent || '');
  }, desktop.selectedPreset, { timeout: 20_000 });

  await page.locator('#ob-ww-assistant').click();
  await page.waitForSelector('#ob-guidance-drawer', { state: 'visible', timeout: 10_000 });
  const assistant = await page.evaluate(async () => {
    const drawer = document.getElementById('ob-guidance-drawer');
    const title = document.getElementById('ob-guidance-context-title');
    const input = document.getElementById('ob-guidance-ai-input');
    const before = performance.now();
    await new Promise(resolve => setTimeout(resolve, 75));
    return {
      open: Boolean(drawer && !drawer.hidden && drawer.getBoundingClientRect().width),
      personalized: /website|design|template/i.test(`${title?.textContent || ''} ${drawer?.textContent || ''}`),
      inputEnabled: Boolean(input && !input.disabled),
      timerElapsed: performance.now() - before,
    };
  });
  assert(assistant.open, 'Personal Assistant opens inside Website');
  assert(assistant.personalized, 'Personal Assistant provides Website-aware guidance');
  assert(assistant.inputEnabled, 'Personal Assistant remains interactive');
  assert(assistant.timerElapsed < 1_500, 'Personal Assistant does not trap the browser event loop');
  await page.screenshot({ path: `${screenshotDirectory}/website-personal-assistant.png`, fullPage: true });
  await page.locator('#ob-guidance-close').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const mobile = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    visibleColumns: getComputedStyle(document.querySelector('.ob-ww-template-grid')).gridTemplateColumns.split(' ').length,
  }));
  assert(mobile.documentWidth <= mobile.viewportWidth + 1, 'mobile Website workspace has no horizontal document overflow');
  assert.equal(mobile.visibleColumns, 1, 'mobile foundation gallery uses one readable column');
  await page.screenshot({ path: `${screenshotDirectory}/website-design-mobile.png`, fullPage: true });

  const unexpectedConsole = severeConsole.filter(message => !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/i.test(message));
  assert.deepEqual(unexpectedConsole, [], `no severe browser errors: ${unexpectedConsole.join(' | ')}`);

  console.log(JSON.stringify({
    status: 'PASS',
    isolation: 'fresh-browser-context',
    authenticatedRole: identity.role,
    stagingHost: stagingUrl.hostname,
    selectedPreset: desktop.selectedPreset,
    testedDraftPreset: alternate,
    galleryCards: desktop.cardCount,
    workspaceSurfaces: desktop.surfaceCount,
    blockedStateChangingRequests: [...new Set(blockedMutations)],
    screenshots: screenshotDirectory,
  }));

  await context.close();
} finally {
  await browser.close();
}
