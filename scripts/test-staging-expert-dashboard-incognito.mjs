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

  const sidebar = await page.evaluate(() => {
    const sales = document.querySelector('[data-ob-nav-group="sales"]');
    const practice = document.querySelector('[data-ob-nav-group="practice"]');
    const rates = document.querySelector('[data-ob-panel="pricing"]');
    return {
      ratesParentGroup: rates?.closest('[data-ob-nav-group]')?.getAttribute('data-ob-nav-group') || '',
      salesPanels: Array.from(sales?.querySelectorAll('[data-ob-panel]') || []).map(node => node.getAttribute('data-ob-panel')),
      practicePanels: Array.from(practice?.querySelectorAll('[data-ob-panel]') || []).map(node => node.getAttribute('data-ob-panel')),
    };
  });
  assert.equal(sidebar.ratesParentGroup, 'sales', 'Services & Rates belongs to Sales');
  assert.equal(sidebar.salesPanels[0], 'pricing', 'Services & Rates is the first Sales destination');
  assert(!sidebar.practicePanels.includes('pricing'), 'Services & Rates is not duplicated under Practice');

  const themeToggle = page.locator('#view-3 [data-ob-ui-theme-toggle]').first();
  await themeToggle.waitFor({ state: 'visible', timeout: 10_000 });
  if (await page.evaluate(() => document.body.classList.contains('ob-ui-dark'))) await themeToggle.click();
  await page.waitForFunction(() => document.body.classList.contains('ob-ui-light'));
  const lightTheme = await page.evaluate(() => {
    const nav = document.querySelector('#view-3 .db-sidebar');
    const navItem = document.querySelector('#view-3 .db-nav-item');
    const style = nav ? getComputedStyle(nav) : null;
    return {
      bodyLight: document.body.classList.contains('ob-ui-light'),
      sidebarBackground: style?.getPropertyValue('--db-sidebar-bg').trim() || '',
      sidebarText: style?.getPropertyValue('--db-sidebar-text').trim() || '',
      navColor: navItem ? getComputedStyle(navItem).color : '',
    };
  });
  assert(lightTheme.bodyLight, 'dashboard light mode is active');
  assert.match(lightTheme.sidebarBackground, /FFFDF8|F4EDE3/i, 'light mode owns the sidebar background');
  assert.equal(lightTheme.sidebarText.toUpperCase(), '#241A15', 'light mode owns readable sidebar text');
  assert(!/rgb\(250,\s*247,\s*242\)/.test(lightTheme.navColor), 'light sidebar navigation does not retain dark-theme white text');

  await page.locator('[data-ob-website-surface="pages"]').click();
  await page.waitForSelector('#ob-content-pages-card', { state: 'visible', timeout: 20_000 });
  const pageEntitlement = await page.evaluate(() => ({
    lockedDisplay: getComputedStyle(document.getElementById('ob-cp-locked')).display,
    managerDisplay: getComputedStyle(document.getElementById('ob-cp-manager')).display,
    count: document.getElementById('ob-cp-count')?.textContent?.trim() || '',
    limit: document.getElementById('ob-cp-limit')?.textContent?.trim() || '',
    addDisabled: Boolean(document.getElementById('ob-cp-add-btn')?.disabled),
  }));
  assert.equal(pageEntitlement.lockedDisplay, 'none', 'Content Pages is unlocked');
  assert.notEqual(pageEntitlement.managerDisplay, 'none', 'Content Pages manager is available');
  assert.equal(pageEntitlement.count, '7 pages', 'the staging expert retains all seven Content Pages');
  assert.equal(pageEntitlement.limit, 'Pro limit: 8', 'the staging expert has the Pro Content Pages limit');
  assert.equal(pageEntitlement.addDisabled, false, 'the remaining Pro Content Page slot can be used');

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

  const designOwnership = await page.evaluate(() => {
    const visible = node => Boolean(node && !node.hidden && node.getAttribute('aria-hidden') !== 'true' && node.getClientRects().length);
    const colorControls = document.getElementById('ob-site-color-controls');
    return {
      hiddenLegacyCards: ['we-legacy-accent-card', 'ob-site-design-controls'].every(id => !visible(document.getElementById(id))),
      hiddenLegacyThemeGrid: !visible(document.getElementById('we-theme-grid')),
      expressiveFields: ['we-color-accent', 'we-color-action', 'we-color-status'].filter(id => visible(document.getElementById(id))),
      structuralFields: ['we-color-bg', 'we-color-surface', 'we-color-text'].filter(id => visible(document.getElementById(id))),
      ownershipCopy: colorControls?.textContent || '',
      designError: document.getElementById('ob-ww-design-error')?.textContent?.trim() || '',
    };
  });
  assert(designOwnership.hiddenLegacyCards, 'legacy design cards do not conflict with foundations');
  assert(designOwnership.hiddenLegacyThemeGrid, 'legacy theme presets do not conflict with foundations');
  assert.deepEqual(designOwnership.expressiveFields.sort(), ['we-color-accent', 'we-color-action', 'we-color-status'].sort(), 'only expressive foundation colors remain editable');
  assert.deepEqual(designOwnership.structuralFields, [], 'foundation-owned background, cards, and text controls are not exposed');
  assert.match(designOwnership.ownershipCopy, /foundation owns its structure|foundation-owned roles/i, 'the UI explains foundation ownership');
  assert(!/4\.5:1|page background and cards/i.test(designOwnership.designError), 'the obsolete conflicting contrast warning is gone');

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

  const previewResults = [];
  const presetIds = await page.locator('.ob-ww-template').evaluateAll(cards => cards.map(card => card.dataset.preset));
  for (const presetId of presetIds) {
    await page.locator(`.ob-ww-template[data-preset="${presetId}"] [data-template-action="preview"]`).last().click();
    await page.waitForSelector('#ob-ww-preview-dialog[open]', { state: 'visible', timeout: 10_000 });
    await page.waitForFunction(() => {
      const frame = document.getElementById('ob-ww-preview-frame');
      return Boolean(frame?.src.startsWith('blob:') && frame.contentDocument?.readyState === 'complete' && (frame.contentDocument.body?.innerText || '').trim().length > 300);
    }, null, { timeout: 15_000 });
    const preview = await page.evaluate(async currentPreset => {
      const frame = document.getElementById('ob-ww-preview-frame');
      const select = document.getElementById('ob-ww-preview-page');
      const pages = Array.from(select.options).map(option => option.value);
      const inspected = [];
      for (const target of pages) {
        select.value = target;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 40));
        const doc = frame.contentDocument;
        const section = doc?.getElementById(target);
        inspected.push({ target, found: Boolean(section), textLength: (section?.innerText || '').trim().length });
      }
      select.value = 'about';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 40));
      const servicesLink = frame.contentDocument?.querySelector('a[href="#services"]');
      servicesLink?.click();
      await new Promise(resolve => setTimeout(resolve, 40));
      return {
        preset: currentPreset,
        source: frame.getAttribute('src') || '',
        hasSrcdoc: frame.hasAttribute('srcdoc'),
        sandbox: frame.getAttribute('sandbox') || '',
        scripts: frame.contentDocument?.querySelectorAll('script').length || 0,
        pageCount: pages.length,
        pages: inspected,
        internalLinkHash: frame.contentWindow?.location.hash || '',
        bodyTextLength: (frame.contentDocument?.body?.innerText || '').trim().length,
      };
    }, presetId);
    previewResults.push(preview);
    assert(preview.source.startsWith('blob:'), `${presetId} uses an isolated preview document`);
    assert.equal(preview.hasSrcdoc, false, `${presetId} does not use fragile srcdoc navigation`);
    assert.equal(preview.sandbox, 'allow-same-origin', `${presetId} preview permits navigation without scripts`);
    assert.equal(preview.scripts, 0, `${presetId} preview is scriptless`);
    assert(preview.pageCount >= 6, `${presetId} exposes the complete core page set`);
    assert(preview.pages.every(item => item.found && item.textLength > 0), `${presetId} every selectable page remains rendered`);
    assert.equal(preview.internalLinkHash, '#services', `${presetId} internal navigation remains usable`);
    assert(preview.bodyTextLength > 300, `${presetId} preview never turns blank or black`);
    await page.locator('#ob-ww-close-preview').click();
    await page.waitForFunction(() => document.getElementById('ob-ww-preview-frame')?.getAttribute('src') === 'about:blank');
  }

  await page.locator('[data-ob-website-surface="media"]').click();
  await page.waitForSelector('#ob-ww-media-inventory', { state: 'visible', timeout: 10_000 });
  const media = await page.evaluate(() => {
    const workspace = window.OBWebsiteWorkspace?.state?.() || {};
    const fixedInputs = ['profile', 'logo', 'favicon', 'social', 'about', 'services', 'reviews', 'contact'].filter(name => document.getElementById(`we-img-${name}`));
    const countText = document.getElementById('ob-ww-media-count')?.textContent || '';
    return {
      fixedInputs,
      uploadCards: document.querySelectorAll('.ob-ww-upload-item').length,
      inventoryItems: document.querySelectorAll('.ob-ww-media-item').length,
      countText: countText.trim(),
      workspaceReady: Boolean(workspace.revision),
    };
  });
  assert.equal(media.fixedInputs.length, 8, 'all eight fixed website media roles have real inputs');
  assert.equal(media.uploadCards, 8, 'all eight fixed media placements are visible');
  assert(media.workspaceReady, 'media inventory is backed by the authoritative website document');
  assert.equal(Number.parseInt(media.countText, 10) || 0, media.inventoryItems, 'media inventory count includes every rendered asset');

  await page.locator('[data-ob-website-surface="design"]').click();

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
      role: drawer?.getAttribute('role') || '',
      ariaModal: drawer?.getAttribute('aria-modal'),
      backdropVisible: Boolean(document.getElementById('ob-guidance-backdrop') && getComputedStyle(document.getElementById('ob-guidance-backdrop')).display !== 'none'),
      dashboardInert: Boolean(document.querySelector('#view-3 .dashboard-layout')?.inert),
      dashboardAriaHidden: document.querySelector('#view-3 .dashboard-layout')?.getAttribute('aria-hidden') || '',
      timerElapsed: performance.now() - before,
    };
  });
  assert(assistant.open, 'Personal Assistant opens inside Website');
  assert(assistant.personalized, 'Personal Assistant provides Website-aware guidance');
  assert(assistant.inputEnabled, 'Personal Assistant remains interactive');
  assert.equal(assistant.role, 'complementary', 'Personal Assistant is a supporting side rail');
  assert.equal(assistant.ariaModal, null, 'Personal Assistant is not modal');
  assert.equal(assistant.backdropVisible, false, 'Personal Assistant does not darken the dashboard');
  assert.equal(assistant.dashboardInert, false, 'dashboard remains interactive with Personal Assistant open');
  assert.equal(assistant.dashboardAriaHidden, '', 'dashboard remains available to assistive technology');
  assert(assistant.timerElapsed < 1_500, 'Personal Assistant does not trap the browser event loop');
  await page.locator('[data-ob-website-surface="pages"]').click();
  await page.waitForSelector('#ob-ww-surface-pages:not([hidden])', { state: 'visible', timeout: 10_000 });
  assert.equal(await page.locator('#ob-guidance-drawer').isVisible(), true, 'dashboard navigation works while Personal Assistant stays open');
  await page.screenshot({ path: `${screenshotDirectory}/website-personal-assistant.png`, fullPage: true });
  await page.locator('#ob-guidance-close').click();
  await page.locator('[data-ob-website-surface="design"]').click();

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
    contentPages: pageEntitlement,
    previewResults,
    media,
    lightTheme,
    assistant,
    blockedStateChangingRequests: [...new Set(blockedMutations)],
    screenshots: screenshotDirectory,
  }));

  await context.close();
} finally {
  await browser.close();
}
