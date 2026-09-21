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

function styleById(id) {
  const match = source.match(new RegExp(`<style id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/style>`));
  assert(match, `Missing style: ${id}`);
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
const domainRuntime = scriptById('ownlybiz-expert-phase0-integrity-20260913');
const websiteRuntime = scriptById('ownlybiz-website-workspace-v2-runtime');
const websiteStyles = styleById('ownlybiz-website-workspace-v2-style');

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
    { id: 'home-method', type: 'feature', heading: 'The decision method', body: 'Notice, test, decide.', image_url: 'https://images.example.test/home-method.jpg', image_alt: 'A decision framework on a desk' },
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
    tokens: {
      ...templateContracts['practice-focus'].tokens,
      background: '#FFFFFF',
      surface: '#000000',
      text: '#FFFFFF',
    },
  },
  media: {
    profile_image_url: 'https://images.example.test/profile.jpg',
    logo_image_url: 'https://images.example.test/logo.png',
    favicon_image_url: 'https://images.example.test/favicon.png',
    social_share_image_url: 'https://images.example.test/social-share.jpg',
    about_image_url: 'https://images.example.test/about.jpg',
    services_image_url: 'https://images.example.test/services.jpg',
    reviews_image_url: 'https://images.example.test/reviews.jpg',
    contact_image_url: 'https://images.example.test/contact.jpg',
  },
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
  const outboundRequests = [];
  await context.route('**/*', route => {
    if (route.request().isNavigationRequest() && route.request().url() === 'http://localhost/') {
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!doctype html><html><head><style>${websiteStyles}</style></head><body>
          <div class="view-panel active" id="view-3">
            <h1 id="db-page-title"></h1>
            <button class="db-nav-item" data-ob-panel="website-editor" type="button">Website</button>
            <main>${editorHtml}</main>
          </div>
          ${publicHtml}
        </body></html>`,
      });
    }
    outboundRequests.push({ url: route.request().url(), type: route.request().resourceType() });
    return route.abort();
  });

  const page = await context.newPage();
  await page.goto('http://localhost/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ documentSeed, contracts }) => {
    const clone = value => JSON.parse(JSON.stringify(value));
    const editorPanel = document.getElementById('db-panel-website-editor');
    editorPanel.classList.add('active');

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
      domain: { slug: 'ari-lane', custom_domain: 'ari.example.test', connection_verified: false },
      capabilities: {
        editing: { status: 'available' },
        publication: { status: 'available' },
        custom_pages: { status: 'available', plan: 'pro', limit: 8 },
      },
      concurrency: { writes_enabled: true },
    };
    window.__websiteGets = 0;
    window.__domainStatusGets = 0;
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
      if (parsed.pathname === '/api/domains/me/status' && method === 'GET') {
        window.__domainStatusGets += 1;
        return response({ domain: 'ari.example.test', verified: true, ssl_ready: true, message: 'Domain verified and active.' });
      }
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

  await page.addScriptTag({ content: domainRuntime });
  await page.addScriptTag({ content: websiteRuntime });
  await page.waitForFunction(() => {
    const state = window.OBWebsiteWorkspace?.state();
    return state?.revision === 'revision-0' && state?.dirty === false && document.querySelectorAll('.ob-ww-template').length === 4;
  });

  const initialState = await page.evaluate(() => ({
    state: window.OBWebsiteWorkspace.state(),
    snapshot: window.__foundationSnapshot(),
    gets: window.__websiteGets,
    domainStatusGets: window.__domainStatusGets,
    domain: {
      address: document.getElementById('settings-live-domain')?.textContent,
      status: document.getElementById('domain-live-status')?.textContent,
      badges: [...document.querySelectorAll('#domain-live-badges .ob-ww-domain-badge')].map(node => node.textContent),
      customInput: document.getElementById('custom-domain-input')?.value,
    },
    currentFoundation: {
      disabled: document.querySelector('.ob-ww-template[data-preset="practice-focus"] [data-template-action="use"]')?.disabled,
      text: document.querySelector('.ob-ww-template[data-preset="practice-focus"] [data-template-action="use"]')?.textContent,
      label: document.querySelector('.ob-ww-template[data-preset="practice-focus"] [data-template-action="use"]')?.getAttribute('aria-label'),
    },
    designOwnership: {
      legacyThemeCount: document.querySelectorAll('#we-theme-grid,.we-legacy-accent-card,#ob-site-design-controls').length,
      unsafeStructuralInputCount: document.querySelectorAll('[name="we-site-mode"],[name="we-site-layout"],#we-color-bg,#we-color-surface,#we-color-text').length,
      colorRoleCount: document.querySelectorAll('#ob-site-color-controls input[type="color"]').length,
      colorControlsVisible: getComputedStyle(document.getElementById('ob-site-color-controls')).display,
    },
  }));
  assert.equal(initialState.gets, 1, 'initial Website hydration uses one authoritative GET');
  assert.equal(initialState.domainStatusGets, 0, 'initial Website hydration never runs live domain verification');
  assert.deepEqual(initialState.domain, {
    address: 'ari.example.test',
    status: 'Domain added · Verification pending',
    badges: ['Pending'],
    customInput: 'ari.example.test',
  }, 'the saved custom domain renders directly from the Website envelope without claiming verification');
  assert.equal(initialState.state.selectedPreset, 'practice-focus');
  assertPublicFoundation(initialState.snapshot, 'practice-focus', 'initial Practice Focus hydration');
  assert.deepEqual(
    initialState.currentFoundation,
    { disabled: true, text: 'Current foundation', label: 'Practice Focus is the current foundation' },
    'the selected foundation is clearly labelled and cannot be re-applied',
  );
  assert.deepEqual(
    initialState.designOwnership,
    {
      legacyThemeCount: 0,
      unsafeStructuralInputCount: 0,
      colorRoleCount: 3,
      colorControlsVisible: 'block',
    },
    'obsolete structural controls are absent while the three supported role-color controls remain visible',
  );

  const domainOpen = await page.evaluate(() => {
    window.__OB_TEST_HOOKS__.websiteWorkspaceV2.openSurface('domains', { silent: true, focus: false });
    return {
      statusGets: window.__domainStatusGets,
      address: document.getElementById('settings-live-domain')?.textContent,
      status: document.getElementById('domain-live-status')?.textContent,
    };
  });
  assert.deepEqual(domainOpen, {
    statusGets: 0,
    address: 'ari.example.test',
    status: 'Domain added · Verification pending',
  }, 'opening Domains only renders saved state and has no verification side effect');

  const explicitDomainRefresh = await page.evaluate(async () => {
    const first = window.OBDomainSettings.refreshStatus();
    const second = window.OBDomainSettings.refreshStatus();
    const results = await Promise.all([first, second]);
    window.__OB_TEST_HOOKS__.websiteWorkspaceV2.openSurface('overview', { silent: true, focus: false });
    window.__OB_TEST_HOOKS__.websiteWorkspaceV2.openSurface('domains', { silent: true, focus: false });
    return {
      results,
      statusGets: window.__domainStatusGets,
      address: document.getElementById('settings-live-domain')?.textContent,
      status: document.getElementById('domain-live-status')?.textContent,
      detail: document.getElementById('domain-status-card')?.textContent,
    };
  });
  assert.deepEqual(explicitDomainRefresh, {
    results: [true, true],
    statusGets: 1,
    address: 'ari.example.test',
    status: 'Connected · Verified · SSL active',
    detail: 'Domain verified and active.',
  }, 'explicit verification is environment-scoped, deduplicated, and remains truthful after leaving and returning');

  const sameFoundationNoop = await page.evaluate(() => {
    const hooks = window.__OB_TEST_HOOKS__.websiteWorkspaceV2;
    const colors = ['accent', 'action', 'status'].map(key => document.getElementById(`we-color-${key}`));
    const originals = colors.map(input => input.value);
    ['#7A2F18', '#225C39', '#435F35'].forEach((value, index) => { colors[index].value = value; });
    const before = window.OBWebsiteWorkspace.state();
    const result = hooks.selectPreset('practice-focus');
    const after = window.OBWebsiteWorkspace.state();
    const values = colors.map(input => input.value.toUpperCase());
    originals.forEach((value, index) => { colors[index].value = value; });
    const button = document.querySelector('.ob-ww-template[data-preset="practice-focus"] [data-template-action="use"]');
    return {
      before,
      after,
      values,
      resultTokens: result.design?.tokens || result.tokens,
      disabled: button.disabled,
      text: button.textContent,
    };
  });
  assert.deepEqual(sameFoundationNoop.values, ['#7A2F18', '#225C39', '#435F35'], 'reselecting the current foundation never resets custom role colors');
  assert.deepEqual(
    sameFoundationNoop.resultTokens && {
      accent: sameFoundationNoop.resultTokens.accent.toUpperCase(),
      action: sameFoundationNoop.resultTokens.action.toUpperCase(),
      status: sameFoundationNoop.resultTokens.status.toUpperCase(),
    },
    { accent: '#7A2F18', action: '#225C39', status: '#435F35' },
    'the current-foundation no-op returns the preserved custom role colors',
  );
  assert.equal(sameFoundationNoop.after.dirty, sameFoundationNoop.before.dirty, 'reselecting the current foundation does not mark the draft dirty');
  assert.equal(sameFoundationNoop.after.editVersion, sameFoundationNoop.before.editVersion, 'reselecting the current foundation does not create an edit revision');
  assert.equal(sameFoundationNoop.disabled, true, 'the current foundation stays disabled after the guarded no-op');
  assert.equal(sameFoundationNoop.text, 'Current foundation', 'the current foundation label stays truthful after the guarded no-op');

  const designAndMedia = await page.evaluate(() => {
    const hooks = window.__OB_TEST_HOOKS__.websiteWorkspaceV2;
    const initial = hooks.collectDocument();
    document.getElementById('we-color-accent').value = '#7A2F18';
    document.getElementById('we-color-action').value = '#225C39';
    document.getElementById('we-color-status').value = '#435F35';
    const customized = hooks.collectDocument();
    document.getElementById('we-color-accent').value = '#C4622D';
    document.getElementById('we-color-action').value = '#C8FF3D';
    document.getElementById('we-color-status').value = '#637653';
    return {
      initial,
      customized,
      inventoryCount: document.querySelectorAll('#ob-ww-media-inventory .ob-ww-media-item').length,
      inventoryText: document.getElementById('ob-ww-media-inventory')?.textContent || '',
      countText: document.getElementById('ob-ww-media-count')?.textContent || '',
    };
  });
  assertFoundationDocument(designAndMedia.initial, 'practice-focus', 'initial normalized foundation');
  assert.deepEqual(
    upperTokens(designAndMedia.customized.design.tokens),
    {
      ...templateContracts['practice-focus'].tokens,
      accent: '#7A2F18', action: '#225C39', status: '#435F35',
    },
    'only accent, action, and status can vary while background, surface, and text remain foundation-owned',
  );
  assert.equal(designAndMedia.inventoryCount, 10, 'Media inventories eight fixed roles plus homepage and Content Page section media');
  assert.equal(designAndMedia.countText, '10 assets in use', 'Media reports the complete number of assets in use');
  for (const label of ['Profile photo', 'Social share image', 'About page image', 'Services page image', 'Reviews page image', 'Contact page image', 'The decision method', 'Choose with confidence']) {
    assert.match(designAndMedia.inventoryText, new RegExp(label, 'i'), `Media inventory names ${label}`);
  }

  const fallbackTargets = await page.evaluate(() => {
    const hooks = window.__OB_TEST_HOOKS__.websiteWorkspaceV2;
    const documentValue = hooks.collectDocument();
    documentValue.core_pages.contact.enabled = false;
    documentValue.custom_sections.push(
      { id: 'fallback-disabled-core', type: 'cta', heading: 'Disabled core target', cta_label: 'Core fallback', cta_page: 'contact' },
      { id: 'fallback-missing-custom', type: 'cta', heading: 'Missing custom target', cta_label: 'Custom fallback', cta_page: 'missing-resource' },
    );
    const preview = new DOMParser().parseFromString(hooks.previewDocumentHtml(documentValue, 'practice-focus'), 'text/html');
    return Object.fromEntries(
      [...preview.querySelectorAll('a')]
        .filter(anchor => /fallback/i.test(anchor.textContent || ''))
        .map(anchor => [anchor.textContent.trim(), anchor.getAttribute('href')]),
    );
  });
  assert.deepEqual(
    fallbackTargets,
    { 'Core fallback': '#book', 'Custom fallback': '#book' },
    'preview CTAs fall back to booking when a disabled core page or missing custom page is targeted',
  );

  outboundRequests.length = 0;
  await page.evaluate(() => document.getElementById('ob-ww-preview').click());
  await page.waitForFunction(() => {
    const frame = document.getElementById('ob-ww-preview-frame');
    const picker = document.getElementById('ob-ww-preview-page');
    return frame?.getAttribute('src')?.startsWith('blob:') && picker?.options.length >= 7;
  });
  const previewFrameElement = await page.locator('#ob-ww-preview-frame').elementHandle();
  const previewFrame = await previewFrameElement.contentFrame();
  await previewFrame.waitForLoadState('domcontentloaded');
  const previewSecurity = await page.locator('#ob-ww-preview-frame').evaluate(frame => ({
    sandbox: frame.getAttribute('sandbox'),
    srcdoc: frame.hasAttribute('srcdoc'),
  }));
  assert.equal(previewSecurity.sandbox, 'allow-same-origin', 'preview enables fragment navigation without enabling scripts');
  assert.equal(previewSecurity.srcdoc, false, 'preview never falls back to dashboard-relative srcdoc navigation');
  assert.equal(await previewFrame.locator('script').count(), 0, 'the generated website contains no executable script');
  assert.match(
    await previewFrame.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'),
    /default-src 'none'; style-src 'unsafe-inline'; img-src https: http: data: blob:/,
    'the generated website permits only inline styling and explicit media requests',
  );
  const initialPreviewUrl = previewFrame.url();
  assert.match(initialPreviewUrl, /^blob:[^#]+#home$/, 'scriptless preview loads as a real isolated website document');
  const customPreview = await previewFrame.evaluate(() => {
    const customPage = document.querySelector('.custom-page[data-page-template="guide"]');
    const feature = customPage?.querySelector('[data-section-type="feature"]');
    const image = feature?.querySelector('img');
    return {
      bodyText: document.body.textContent.trim(),
      pageClass: customPage?.className || '',
      sectionClass: feature?.className || '',
      heading: feature?.querySelector('h3')?.textContent || '',
      imageAlt: image?.getAttribute('alt') || '',
      imageSrc: image?.getAttribute('src') || '',
    };
  });
  assert(customPreview.bodyText.length > 300, 'the initial preview is visibly populated rather than black or blank');
  assert.match(customPreview.pageClass, /template-guide/, 'scriptless preview visibly composes the saved Guide page template');
  assert.match(customPreview.sectionClass, /section-feature/, 'scriptless preview visibly renders the saved Feature section type');
  assert.equal(customPreview.heading, 'Choose with confidence', 'scriptless preview supports the canonical heading alias');
  assert.equal(customPreview.imageAlt, 'A decision map laid out beside a notebook', 'scriptless preview uses the authored section image description');
  assert.equal(customPreview.imageSrc, 'https://images.example.test/decision-guide.jpg', 'scriptless preview renders the saved section image');

  const pageChoices = await page.locator('#ob-ww-preview-page option').evaluateAll(options => options.map(option => ({ value: option.value, label: option.textContent })));
  assert.deepEqual(
    pageChoices.map(choice => choice.value),
    ['home', 'about', 'services', 'reviews', 'book', 'contact', 'custom-decision-guide'],
    'the page explorer exposes every enabled standard page and the complete custom page',
  );
  await page.selectOption('#ob-ww-preview-page', 'about');
  await page.waitForFunction(() => document.getElementById('ob-ww-preview-frame')?.getAttribute('src')?.endsWith('#about'));
  assert.match(previewFrame.url(), /^blob:[^#]+#about$/, 'page-picker navigation remains inside the same isolated website document');
  assert.match(await previewFrame.locator('#about').innerText(), /About Ari[\s\S]*complete expert story/i, 'another standard preview page remains rendered and readable');

  await previewFrame.locator('a[href="#services"]').first().click();
  await previewFrame.waitForFunction(() => location.hash === '#services');
  await page.waitForFunction(() => document.getElementById('ob-ww-preview-page')?.value === 'services');
  assert.match(previewFrame.url(), /^blob:[^#]+#services$/, 'internal preview navigation remains on the blob document instead of routing the dashboard');
  assert.equal(await page.locator('#ob-ww-preview-page').inputValue(), 'services', 'internal preview navigation keeps the page explorer synchronized');
  assert((await previewFrame.locator('body').innerText()).length > 300, 'internal navigation never produces a black or blank iframe');

  await page.selectOption('#ob-ww-preview-page', 'custom-decision-guide');
  await page.waitForFunction(() => document.getElementById('ob-ww-preview-frame')?.getAttribute('src')?.endsWith('#custom-decision-guide'));
  assert.match(await previewFrame.locator('#custom-decision-guide').innerText(), /Decision guide[\s\S]*Choose with confidence/i, 'the explicit page explorer reaches custom Content Pages');
  assert.equal(
    outboundRequests.filter(request => request.type !== 'image' || new URL(request.url).hostname !== 'images.example.test').length,
    0,
    'preview exploration leaks no document, script, font, fetch, or unexpected third-party request',
  );

  for (const device of ['tablet', 'phone', 'desktop']) {
    await page.locator(`[data-ob-preview-device="${device}"]`).click();
    assert.equal(await page.locator('#ob-ww-preview-stage').getAttribute('data-device'), device, `${device} preview mode updates the responsive stage`);
    assert.equal(await page.locator(`[data-ob-preview-device="${device}"]`).getAttribute('aria-pressed'), 'true', `${device} preview mode exposes its selected state`);
  }
  await page.evaluate(() => document.getElementById('ob-ww-close-preview').click());
  assert.equal(await page.locator('#ob-ww-preview-frame').getAttribute('src'), 'about:blank', 'closing preview releases the isolated document from the iframe');

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

  const deletionDraft = await page.evaluate(() => {
    const hooks = window.__OB_TEST_HOOKS__.websiteWorkspaceV2;
    const pages = JSON.parse(JSON.stringify(window.__editorCustomPages));
    const guide = pages.find(pageValue => pageValue.id === 'page-decision-guide');
    guide.sections = guide.sections.filter(section => section.id !== 'guide-method');
    guide.sections.find(section => section.id === 'guide-hero').body = 'Start with the clearest question.';
    window.__editorCustomPages = pages;
    const cleared = hooks.clearMediaSlot('contact_image_url');
    const collected = hooks.collectDocument();
    const clearButton = document.querySelector('[data-ob-media-clear="contact_image_url"]');
    return {
      cleared,
      dirty: window.OBWebsiteWorkspace.state().dirty,
      media: collected.media.contact_image_url,
      sectionIds: collected.custom_pages[0].sections.map(section => section.id),
      hero: collected.custom_pages[0].sections.find(section => section.id === 'guide-hero'),
      clearDisabled: clearButton.disabled,
    };
  });
  assert.equal(deletionDraft.cleared, true, 'an assigned fixed media placement can be cleared');
  assert.equal(deletionDraft.dirty, true, 'clearing fixed media marks the website draft dirty');
  assert.equal(deletionDraft.media, '', 'collection intentionally preserves a cleared fixed media placement as an empty string');
  assert.deepEqual(deletionDraft.sectionIds, ['guide-hero', 'guide-action'], 'a deliberately removed Content Page section stays absent during collection');
  assert.equal(deletionDraft.hero.body, 'Start with the clearest question.', 'retained Content Page section edits are collected');
  assert.equal(deletionDraft.hero.image_alt, 'A decision map laid out beside a notebook', 'unknown fields on retained Content Page sections survive collection');
  assert.equal(deletionDraft.clearDisabled, true, 'a cleared media placement cannot be redundantly cleared');

  const deletionSaved = await page.evaluate(() => window.OBWebsiteWorkspace.save());
  assert.equal(deletionSaved, true, 'the media clear and Content Page deletion save through the canonical Website PATCH');
  const deletionPatch = await page.evaluate(() => JSON.parse(JSON.stringify(window.__websitePatches.at(-1))));
  assert.equal(deletionPatch.base_revision, 'revision-4', 'the persistence regression save uses the latest authoritative revision');
  assert.equal(deletionPatch.changes.media.contact_image_url, '', 'the intentional media clear is present in the authoritative PATCH');
  assert.deepEqual(deletionPatch.changes.custom_pages[0].sections.map(section => section.id), ['guide-hero', 'guide-action'], 'the authoritative PATCH does not resurrect a removed Content Page section');
  assert.equal(deletionPatch.changes.custom_pages[0].sections[0].image_alt, 'A decision map laid out beside a notebook', 'the authoritative PATCH preserves retained-section fields it did not edit');

  const deletionReload = await page.evaluate(async () => {
    await window.OBWebsiteWorkspace.load(true);
    const hooks = window.__OB_TEST_HOOKS__.websiteWorkspaceV2;
    const collected = hooks.collectDocument();
    return {
      state: window.OBWebsiteWorkspace.state(),
      media: collected.media.contact_image_url,
      sectionIds: collected.custom_pages[0].sections.map(section => section.id),
      hero: collected.custom_pages[0].sections.find(section => section.id === 'guide-hero'),
      inventoryCount: document.querySelectorAll('#ob-ww-media-inventory .ob-ww-media-item').length,
      clearDisabled: document.querySelector('[data-ob-media-clear="contact_image_url"]')?.disabled,
    };
  });
  assert.equal(deletionReload.state.revision, 'revision-5', 'the persistence regression reload adopts the fifth revision');
  assert.equal(deletionReload.state.dirty, false, 'the persistence regression reload is clean');
  assert.equal(deletionReload.media, '', 'an intentionally cleared fixed media placement remains empty after reload');
  assert.deepEqual(deletionReload.sectionIds, ['guide-hero', 'guide-action'], 'the removed Content Page section remains absent after reload');
  assert.equal(deletionReload.hero.image_alt, 'A decision map laid out beside a notebook', 'retained-section unknown fields remain after reload');
  assert.equal(deletionReload.inventoryCount, 9, 'the media inventory reflects the cleared fixed placement without dropping richer template assets');
  assert.equal(deletionReload.clearDisabled, true, 'the clear action remains disabled for an empty placement after reload');

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
  assert.equal(actionResult.patchCount, 5, 'the four foundation saves and persistence regression save complete');
  assert.equal(actionResult.getCount, 6, 'initial hydration, four foundation reloads, and the persistence regression reload complete');

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
