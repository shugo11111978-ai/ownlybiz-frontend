import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');
const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function scriptById(id) {
  const match = source.match(new RegExp(`<script id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match, `Missing script: ${id}`);
  return match[1];
}

function sourceRange(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `Missing source range: ${startMarker}`);
  return source.slice(start, end);
}

const editorHtml = sourceRange(
  '<div class="db-tab-panel" id="db-panel-website-editor">',
  '\n    </main>',
);
const publicHtml = sourceRange(
  '<div class="view-panel" id="view-4">',
  '\n</div><!-- end view-4 -->',
) + '\n</div><!-- end view-4 -->';
const websiteRuntime = scriptById('ownlybiz-website-workspace-v2-runtime');

const templateContracts = {
  'practice-focus': {
    template_id: 'ownly-practice-focus-v1',
    renderer_family: 'practice-focus',
    mode: 'light',
    layout: 'split',
    palette_id: 'warm',
    tokens: {
      accent: '#C4622D', action: '#C8FF3D', status: '#637653',
      background: '#F7F1E8', surface: '#FFFDF8', text: '#241A15',
    },
  },
  'quiet-confidence': {
    template_id: 'ownly-quiet-confidence-v1',
    renderer_family: 'quiet-confidence',
    mode: 'light',
    layout: 'centered',
    palette_id: 'forest',
    tokens: {
      accent: '#435F35', action: '#637653', status: '#637653',
      background: '#F4F7EF', surface: '#FFFFFA', text: '#142112',
    },
  },
  'field-journal': {
    template_id: 'ownly-field-journal-v1',
    renderer_family: 'field-journal',
    mode: 'light',
    layout: 'editorial',
    palette_id: 'forest',
    tokens: {
      accent: '#A8441E', action: '#A8441E', status: '#435F35',
      background: '#F5F1E7', surface: '#FFFCF4', text: '#1D2118',
    },
  },
  'after-hours': {
    template_id: 'ownly-after-hours-v1',
    renderer_family: 'after-hours',
    mode: 'dark',
    layout: 'editorial',
    palette_id: 'midnight',
    tokens: {
      accent: '#FF6B47', action: '#C8FF3D', status: '#C8FF3D',
      background: '#0B0908', surface: '#1A1614', text: '#FAF7F2',
    },
  },
};

const initialDocument = {
  identity: {
    display_name: 'Ari Lane',
    professional_title: 'Decision coach',
    short_intro: 'Practical support for consequential choices.',
    primary_specialty: 'Leadership',
    hero_tagline: 'Make the next move with clarity.',
    about: 'A complete expert story that must survive every foundation transition.',
    credentials: [
      { id: 'credential-one', icon: '✓', text: 'ICF certified' },
      { id: 'credential-two', icon: '★', text: 'Ten years advising founders' },
    ],
  },
  homepage: { cta_label: 'Start with Ari' },
  core_pages: {
    about: { enabled: true, title: 'About Ari' },
    services: { enabled: true },
    reviews: { enabled: true },
    contact: { enabled: true },
  },
  services: {
    title: 'Ways to work together',
    subtitle: 'Choose the conversation that fits.',
    chat_description: 'Focused written coaching.',
    voice_description: 'A direct private call.',
    video_description: 'A deeper face-to-face session.',
  },
  contact: {
    email: 'ari@example.test',
    heading: 'Talk with Ari',
    description: 'Send a note and expect a personal answer.',
    location: 'Remote worldwide',
    hours: 'Monday–Thursday',
    response_time: 'Within one business day',
  },
  navigation: {
    home: 'Home', about: 'My approach', services: 'Work with me',
    reviews: 'Client stories', book: 'Book Ari', contact: 'Contact',
  },
  custom_sections: [
    { id: 'home-method', type: 'feature', heading: 'The decision method', body: 'Notice, test, decide.' },
    { id: 'home-proof', type: 'proof', heading: 'Trusted by operators', body: 'Specific, calm, useful.' },
  ],
  custom_pages: [
    {
      id: 'page-decision-guide',
      slug: 'decision-guide',
      template: 'guide',
      title: 'Decision guide',
      nav_label: 'Decision guide',
      description: 'A complete AI-authored resource.',
      published: true,
      show_in_nav: true,
      seo: { title: 'Ari decision guide', description: 'A three-part decision resource.' },
      sections: [
        { id: 'guide-hero', type: 'feature', heading: 'Choose with confidence', body: 'Start with the question.', image_url: 'https://images.example.test/decision-guide.jpg', image_alt: 'A decision map laid out beside a notebook' },
        { id: 'guide-method', type: 'content', heading: 'Use three lenses', body: 'Evidence, reversibility, energy.' },
        { id: 'guide-action', type: 'cta', heading: 'Work through it together', cta_label: 'Start with Ari', cta_target: 'book' },
      ],
    },
  ],
  design: {
    template_id: templateContracts['practice-focus'].template_id,
    renderer_family: templateContracts['practice-focus'].renderer_family,
    mode: templateContracts['practice-focus'].mode,
    layout: templateContracts['practice-focus'].layout,
    palette_id: templateContracts['practice-focus'].palette_id,
    tokens: templateContracts['practice-focus'].tokens,
  },
  media: { profile_image_url: '', logo_image_url: '', favicon_image_url: '' },
  seo: {
    title: 'Ari Lane — decision coach',
    description: 'Decision coaching for founders and leaders.',
    allow_indexing: true,
    ga4_id: 'G-TEST123',
    gtm_id: 'GTM-TEST123',
    meta_pixel_id: '123456789',
  },
  footer: { display_name: 'Ari Lane', disclaimer: 'Independent expert guidance.' },
};

function upperTokens(tokens) {
  return Object.fromEntries(Object.entries(tokens).map(([key, value]) => [key, String(value).toUpperCase()]));
}

function assertCompleteDocument(document, label) {
  assert.equal(document.identity.display_name, initialDocument.identity.display_name, `${label}: identity persists`);
  assert.equal(document.homepage.cta_label, initialDocument.homepage.cta_label, `${label}: Home persists`);
  assert.deepEqual(document.core_pages, initialDocument.core_pages, `${label}: standard page configuration persists`);
  assert.deepEqual(document.services, initialDocument.services, `${label}: Services persists`);
  assert.deepEqual(document.contact, initialDocument.contact, `${label}: Contact persists`);
  assert.deepEqual(document.navigation, initialDocument.navigation, `${label}: navigation persists`);
  assert.deepEqual(document.custom_sections, initialDocument.custom_sections, `${label}: AI homepage sections persist`);
  assert.deepEqual(document.custom_pages, initialDocument.custom_pages, `${label}: complete AI custom pages persist`);
  assert.deepEqual(document.media, initialDocument.media, `${label}: media persists`);
  assert.deepEqual(document.seo, initialDocument.seo, `${label}: search settings persist`);
  assert.deepEqual(document.footer, initialDocument.footer, `${label}: footer persists`);
}

function assertFoundationDocument(document, id, label) {
  const expected = templateContracts[id];
  assert.equal(document.design.template_id, expected.template_id, `${label}: canonical template ID`);
  assert.equal(document.design.mode, expected.mode, `${label}: mode`);
  assert.equal(document.design.layout, expected.layout, `${label}: layout`);
  assert.equal(document.design.palette_id, expected.palette_id, `${label}: palette`);
  assert.deepEqual(upperTokens(document.design.tokens), expected.tokens, `${label}: all six foundation tokens`);
  assertCompleteDocument(document, label);
}

function assertPublicFoundation(snapshot, id, label) {
  const expected = templateContracts[id];
  assert.equal(snapshot.template, id, `${label}: public template marker`);
  assert.deepEqual(
    snapshot.rendererClasses,
    [`ob-site-template-${expected.renderer_family}`],
    `${label}: exactly one renderer class`,
  );
  assert.deepEqual(snapshot.presetClasses, [`ob-site-preset-${id}`], `${label}: exactly one preset class`);
  for (const [pageId, marker] of Object.entries(snapshot.pages)) {
    assert.equal(marker, id, `${label}: ${pageId} participates in the full-site foundation`);
  }
  assert.deepEqual(
    snapshot.homeSections,
    { services: 'services', testimonials: 'proof', about: 'story' },
    `${label}: Home section roles remain complete`,
  );
  assert.deepEqual(snapshot.changedActions, [], `${label}: booking, account, and custom-page actions retain their original nodes and handlers`);
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}),
});

try {
  const context = await browser.newContext();
  await context.route('**/*', route => {
    if (route.request().isNavigationRequest() && route.request().url() === 'http://localhost/') {
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!doctype html><html><head></head><body>
          <div class="view-panel active" id="view-3">
            <h1 id="db-page-title"></h1>
            <button class="db-nav-item" data-ob-panel="website-editor" type="button">Website</button>
            <main>${editorHtml}</main>
          </div>
          ${publicHtml}
        </body></html>`,
      });
    }
    return route.abort();
  });

  const page = await context.newPage();
  await page.goto('http://localhost/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ documentSeed, contracts }) => {
    const clone = value => JSON.parse(JSON.stringify(value));
    const editorPanel = document.getElementById('db-panel-website-editor');
    editorPanel.classList.add('active');

    const appearance = document.createElement('div');
    appearance.id = 'ob-site-design-controls';
    appearance.className = 'db-card we-tab-card';
    appearance.dataset.weTab = 'design';
    appearance.innerHTML = `
      <label><input type="radio" name="we-site-mode" value="light" checked>Light</label>
      <label><input type="radio" name="we-site-mode" value="dark">Dark</label>
      <label><input type="radio" name="we-site-layout" value="split" checked>Split</label>
      <label><input type="radio" name="we-site-layout" value="centered">Centered</label>
      <label><input type="radio" name="we-site-layout" value="editorial">Editorial</label>`;
    const colors = document.createElement('div');
    colors.id = 'ob-site-color-controls';
    colors.className = 'db-card we-tab-card';
    colors.dataset.weTab = 'design';
    colors.innerHTML = `
      <input type="color" id="we-color-accent" value="#c4622d">
      <input type="color" id="we-color-action" value="#c8ff3d">
      <input type="color" id="we-color-status" value="#637653">
      <input type="color" id="we-color-bg" value="#f7f1e8">
      <input type="color" id="we-color-surface" value="#fffdf8">
      <input type="color" id="we-color-text" value="#241a15">`;
    const themeGrid = document.getElementById('we-theme-grid');
    const themeCard = themeGrid.closest('.db-card');
    themeCard.after(appearance, colors);

    const customPage = document.createElement('div');
    customPage.className = 'expert-page ob-ai-custom-page';
    customPage.id = 'ep-ai-decision-guide';
    customPage.innerHTML = '<main><h1>Decision guide</h1><button id="custom-page-action" onclick="handleExpertCTA()">Start with Ari</button></main>';
    document.getElementById('ep-account').before(customPage);

    window.__OB_TEST_HOOKS__ = {};
    window.OWNLYBIZ_IS_STAGING = true;
    window.OWNLYBIZ_API_URL = 'http://localhost';
    window._websiteData = { slug: 'ari-lane', subscription_plan: 'pro' };
    window._currentExpert = null;
    window.obSupportSessionActive = () => false;
    window.obIsMiniSuiteRoute = () => false;
    window.obPublicApplyAccepted = () => true;
    window.obPublicExpertRenderCurrent = () => true;
    window.obEnsureWebsiteDesignControls = () => {};
    window.obGetWebsiteDesignTokens = () => Object.fromEntries([
      ['accent', 'we-color-accent'], ['action', 'we-color-action'], ['status', 'we-color-status'],
      ['background', 'we-color-bg'], ['surface', 'we-color-surface'], ['text', 'we-color-text'],
    ].map(([name, id]) => [name, document.getElementById(id).value]));
    window.__editorCustomPages = [];
    window.obLoadContentPagesEditor = content => {
      window.__editorCustomPages = clone(content.ai_pages || []);
    };
    window.obCollectWebsiteContentPages = () => clone(window.__editorCustomPages);
    window._applyExpertWebsite = profile => {
      window.__legacyApplyCalls = (window.__legacyApplyCalls || 0) + 1;
      window.__lastLegacyProfile = clone(profile);
    };
    window.ownlybizLaunchStatusPatch = () => {};
    window.ownlybizLaunchStatusRefresh = () => {};
    window.obPhase1OpenGuidance = () => {};
    window.dbNav = () => {};
    window.selectTheme = () => {};
    window._showToast = (message, tone) => {
      (window.__toasts ||= []).push({ message, tone });
    };
    window.confirm = () => true;

    window.__actions = {
      expertCta: 0,
      bookLater: 0,
      confirmBooking: 0,
      login: 0,
      accountMenu: 0,
      routes: [],
      accountTabs: [],
    };
    window.handleExpertCTA = () => { window.__actions.expertCta += 1; };
    window.obGuardedBookLaterTap = () => { window.__actions.bookLater += 1; return false; };
    window.confirmBooking = () => { window.__actions.confirmBooking += 1; };
    window.showClientLoginModal = () => { window.__actions.login += 1; };
    window.toggleClientMenu = () => { window.__actions.accountMenu += 1; };
    window.switchClientTab = tab => { window.__actions.accountTabs.push(tab); };
    window.clientLogout = () => {};
    window.showExpertPage = name => {
      window.__actions.routes.push(name);
      document.querySelectorAll('#view-4 .expert-page').forEach(node => {
        node.classList.toggle('active', node.id === `ep-${name}`);
      });
    };
    window.selectStype = () => {};
    window.toast = () => {};

    const actionSelectors = {
      heroPrimary: '#hero-primary-btn',
      heroBookLater: '#hero-book-later-btn',
      bottomCta: '#bottom-cta-btn',
      bookingConfirm: '#confirm-booking-btn',
      clientLogin: '#client-nav-login-btn',
      clientAvatar: '#client-nav-avatar',
      clientAccountLink: '#client-nav-dropdown a[onclick^="showExpertPage"]',
      clientSessionsTab: '#client-sessions-tab',
      customPageAction: '#custom-page-action',
    };
    window.__originalActions = Object.fromEntries(Object.entries(actionSelectors).map(([name, selector]) => {
      const node = document.querySelector(selector);
      if (!node) throw new Error(`Missing action fixture: ${selector}`);
      return [name, { selector, node, onclick: node.getAttribute('onclick') }];
    }));

    window.__foundationSnapshot = () => {
      const view = document.getElementById('view-4');
      const changedActions = Object.entries(window.__originalActions).flatMap(([name, item]) => {
        const current = document.querySelector(item.selector);
        return current === item.node && current?.getAttribute('onclick') === item.onclick ? [] : [name];
      });
      return {
        template: view.getAttribute('data-ob-template'),
        rendererClasses: [...view.classList].filter(name => name.startsWith('ob-site-template-')).sort(),
        presetClasses: [...view.classList].filter(name => name.startsWith('ob-site-preset-')).sort(),
        pages: Object.fromEntries([
          'ep-home', 'ep-about', 'ep-services', 'ep-reviews', 'ep-book', 'ep-contact',
          'ep-ai-decision-guide', 'ep-account',
        ].map(id => [id, document.getElementById(id)?.getAttribute('data-ob-template-page') || null])),
        homeSections: {
          services: document.querySelector('#ep-home .services-preview')?.getAttribute('data-ob-template-section') || null,
          testimonials: document.querySelector('#ep-home .testimonials')?.getAttribute('data-ob-template-section') || null,
          about: document.querySelector('#ep-home .expert-about-strip')?.getAttribute('data-ob-template-section') || null,
        },
        changedActions,
      };
    };

    const identity = Object.freeze({
      token: 'website-foundation-e2e-token',
      role: 'expert',
      principal: 'expert:foundation-e2e',
      principalKey: 'expert:foundation-e2e',
    });
    window.OB_CLIENT_CONTEXT = {
      token: () => identity.token,
      capture: scope => ({ ...identity, scope, signal: new AbortController().signal }),
      isCurrent: operation => operation?.token === identity.token && operation?.principal === identity.principal,
      register: () => {},
    };

    window.__serverWebsite = {
      revision: 'revision-0',
      document: clone(documentSeed),
      publication: { published: false },
      domain: { slug: 'ari-lane', custom_domain: '', verified: false },
      capabilities: {
        editing: { status: 'available' },
        publication: { status: 'available' },
        custom_pages: { status: 'available', plan: 'pro', limit: 8 },
      },
      concurrency: { writes_enabled: true },
    };
    window.__websiteGets = 0;
    window.__websitePatches = [];
    const response = (payload, status = 200) => ({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: name => String(name).toLowerCase() === 'etag' ? `"${window.__serverWebsite.revision}"` : '' },
      json: async () => clone(payload),
    });
    window.fetch = async (url, init = {}) => {
      const parsed = new URL(String(url), location.origin);
      const method = String(init.method || 'GET').toUpperCase();
      if (parsed.pathname !== '/api/website/me') return response({ success: false, error: 'Unexpected test request' }, 404);
      if (method === 'GET') {
        window.__websiteGets += 1;
        return response({ success: true, website: clone(window.__serverWebsite) });
      }
      if (method === 'PATCH') {
        const body = JSON.parse(String(init.body || '{}'));
        window.__websitePatches.push(clone(body));
        const contract = Object.values(contracts).find(item => item.template_id === body.changes?.design?.template_id);
        if (!contract) return response({ success: false, error: 'Unknown template contract' }, 422);
        const nextNumber = window.__websitePatches.length;
        window.__serverWebsite.revision = `revision-${nextNumber}`;
        window.__serverWebsite.document = clone(body.changes);
        window.__serverWebsite.document.design.renderer_family = contract.renderer_family;
        return response({ success: true, website: clone(window.__serverWebsite) });
      }
      return response({ success: false, error: 'Unsupported test method' }, 405);
    };
  }, { documentSeed: initialDocument, contracts: templateContracts });

  await page.addScriptTag({ content: websiteRuntime });
  await page.waitForFunction(() => {
    const state = window.OBWebsiteWorkspace?.state();
    return state?.revision === 'revision-0' && state?.dirty === false && document.querySelectorAll('.ob-ww-template').length === 4;
  });

  const initialState = await page.evaluate(() => ({
    state: window.OBWebsiteWorkspace.state(),
    snapshot: window.__foundationSnapshot(),
    gets: window.__websiteGets,
  }));
  assert.equal(initialState.gets, 1, 'initial Website hydration uses one authoritative GET');
  assert.equal(initialState.state.selectedPreset, 'practice-focus');
  assertPublicFoundation(initialState.snapshot, 'practice-focus', 'initial Practice Focus hydration');

  await page.evaluate(() => document.getElementById('ob-ww-preview').click());
  await page.waitForTimeout(250);
  const previewSource = await page.locator('#ob-ww-preview-frame').getAttribute('srcdoc');
  assert(previewSource, 'scriptless preview writes a complete isolated HTML document');
  const previewPage = await context.newPage();
  await previewPage.setContent(previewSource, { waitUntil: 'domcontentloaded' });
  const customPreview = await previewPage.evaluate(() => {
    const preview = document;
    const customPage = preview.querySelector('.custom-page[data-page-template="guide"]');
    const feature = customPage?.querySelector('[data-section-type="feature"]');
    const image = feature?.querySelector('img');
    return {
      pageClass: customPage?.className || '',
      sectionClass: feature?.className || '',
      heading: feature?.querySelector('h3')?.textContent || '',
      imageAlt: image?.getAttribute('alt') || '',
      imageSrc: image?.getAttribute('src') || '',
    };
  });
  assert.match(customPreview.pageClass, /template-guide/, 'scriptless preview visibly composes the saved Guide page template');
  assert.match(customPreview.sectionClass, /section-feature/, 'scriptless preview visibly renders the saved Feature section type');
  assert.equal(customPreview.heading, 'Choose with confidence', 'scriptless preview supports the canonical heading alias');
  assert.equal(customPreview.imageAlt, 'A decision map laid out beside a notebook', 'scriptless preview uses the authored section image description');
  assert.equal(customPreview.imageSrc, 'https://images.example.test/decision-guide.jpg', 'scriptless preview renders the saved section image');
  await previewPage.close();
  await page.evaluate(() => document.getElementById('ob-ww-close-preview').click());

  const transitionOrder = ['quiet-confidence', 'field-journal', 'after-hours', 'practice-focus'];
  const verifiedStages = ['initial:practice-focus'];
  let expectedBaseRevision = 'revision-0';

  for (let index = 0; index < transitionOrder.length; index += 1) {
    const id = transitionOrder[index];
    const selection = await page.evaluate(templateId => {
      const hooks = window.__OB_TEST_HOOKS__.websiteWorkspaceV2;
      hooks.openSurface('design', { silent: true, focus: false });
      const button = document.querySelector(`.ob-ww-template[data-preset="${templateId}"] [data-template-action="use"]`);
      button.click();
      const card = button.closest('.ob-ww-template');
      return {
        state: window.OBWebsiteWorkspace.state(),
        document: hooks.collectDocument(),
        cardSelected: card.getAttribute('data-selected'),
        pressed: button.getAttribute('aria-pressed'),
      };
    }, id);
    assert.equal(selection.state.selectedPreset, id, `${id}: real gallery selection updates runtime state`);
    assert.equal(selection.state.dirty, true, `${id}: real gallery selection is an unsaved change`);
    assert.equal(selection.cardSelected, 'true', `${id}: selected card is visible state`);
    assert.equal(selection.pressed, 'true', `${id}: selected card is accessible state`);
    assertFoundationDocument(selection.document, id, `${id} collection`);
    verifiedStages.push(`collect:${id}`);

    const saved = await page.evaluate(() => window.OBWebsiteWorkspace.save());
    assert.equal(saved, true, `${id}: real save resolves successfully`);
    const saveResult = await page.evaluate(() => ({
      state: window.OBWebsiteWorkspace.state(),
      snapshot: window.__foundationSnapshot(),
      patches: JSON.parse(JSON.stringify(window.__websitePatches)),
      server: JSON.parse(JSON.stringify(window.__serverWebsite)),
    }));
    const patch = saveResult.patches.at(-1);
    assert.equal(patch.base_revision, expectedBaseRevision, `${id}: save uses the current authoritative revision`);
    assertFoundationDocument(patch.changes, id, `${id} PATCH`);
    assert.equal(saveResult.server.document.design.renderer_family, templateContracts[id].renderer_family, `${id}: save response projects renderer family`);
    assertFoundationDocument(saveResult.server.document, id, `${id} save response`);
    assert.equal(saveResult.state.revision, `revision-${index + 1}`, `${id}: save response revision is adopted`);
    assert.equal(saveResult.state.selectedPreset, id, `${id}: save response keeps selected foundation`);
    assert.equal(saveResult.state.dirty, false, `${id}: successful save clears dirty state`);
    assertPublicFoundation(saveResult.snapshot, id, `${id} save response`);
    verifiedStages.push(`save-response:${id}`);

    const reloaded = await page.evaluate(async () => {
      await window.OBWebsiteWorkspace.load(true);
      const selected = document.querySelector('.ob-ww-template[data-selected="true"]');
      return {
        state: window.OBWebsiteWorkspace.state(),
        snapshot: window.__foundationSnapshot(),
        selectedPreset: selected?.getAttribute('data-preset') || '',
        pressed: selected?.querySelector('[data-template-action="use"]')?.getAttribute('aria-pressed') || '',
        collected: window.__OB_TEST_HOOKS__.websiteWorkspaceV2.collectDocument(),
        gets: window.__websiteGets,
      };
    });
    assert.equal(reloaded.gets, index + 2, `${id}: forced reload issues one new authoritative GET`);
    assert.equal(reloaded.state.revision, `revision-${index + 1}`, `${id}: reload preserves response revision`);
    assert.equal(reloaded.state.selectedPreset, id, `${id}: reload infers the persisted foundation`);
    assert.equal(reloaded.state.dirty, false, `${id}: reload returns a clean editor`);
    assert.equal(reloaded.selectedPreset, id, `${id}: reload restores visible selected card`);
    assert.equal(reloaded.pressed, 'true', `${id}: reload restores accessible selected card`);
    assertFoundationDocument(reloaded.collected, id, `${id} reload collection`);
    assertPublicFoundation(reloaded.snapshot, id, `${id} reload`);
    verifiedStages.push(`reload:${id}`);
    expectedBaseRevision = `revision-${index + 1}`;
  }

  const actionResult = await page.evaluate(() => {
    document.getElementById('hero-primary-btn').click();
    document.getElementById('hero-book-later-btn').click();
    document.getElementById('bottom-cta-btn').click();
    document.getElementById('confirm-booking-btn').click();
    document.getElementById('client-nav-login-btn').click();
    document.getElementById('client-nav-avatar').click();
    document.querySelector('#client-nav-dropdown a[onclick^="showExpertPage"]').click();
    document.getElementById('client-sessions-tab').click();
    document.getElementById('custom-page-action').click();
    const routesBeforeService = window.__actions.routes.length;
    document.querySelector('#ep-home .service-mini').click();
    return {
      actions: JSON.parse(JSON.stringify(window.__actions)),
      routesAddedByService: window.__actions.routes.length - routesBeforeService,
      snapshot: window.__foundationSnapshot(),
      patchCount: window.__websitePatches.length,
      getCount: window.__websiteGets,
    };
  });
  assert.deepEqual(actionResult.snapshot.changedActions, [], 'all original booking/account/custom action nodes and inline handlers remain intact');
  assert.equal(actionResult.actions.expertCta, 3, 'both public CTAs and the custom-page CTA still execute');
  assert.equal(actionResult.actions.bookLater, 1, 'Book for Later still executes');
  assert.equal(actionResult.actions.confirmBooking, 1, 'Book-page confirmation still executes');
  assert.equal(actionResult.actions.login, 1, 'client login still executes');
  assert.equal(actionResult.actions.accountMenu, 1, 'client account menu still executes');
  assert.deepEqual(actionResult.actions.accountTabs, ['sessions'], 'client account tabs still execute');
  assert.deepEqual(actionResult.actions.routes, ['account', 'services'], 'account navigation and enhanced service navigation both execute');
  assert.equal(actionResult.routesAddedByService, 1, 'repeated foundation transitions bind the service action exactly once');
  assert.equal(actionResult.patchCount, 4, 'each of the four foundations completes one save contract');
  assert.equal(actionResult.getCount, 5, 'initial hydration and all four reloads complete');

  console.log(JSON.stringify({
    status: 'PASS',
    transition: 'Practice Focus → Quiet Confidence → Field Journal → After Hours → Practice Focus',
    verifiedStages,
    pages: ['Home', 'About', 'Services', 'Reviews', 'Book', 'Contact', 'AI custom page', 'Account'],
    actions: ['primary booking', 'book later', 'book confirmation', 'client login', 'account menu/tab', 'custom-page CTA'],
    network: 'deterministic authoritative Website facade; all external requests aborted',
  }));
} finally {
  await browser.close();
}
