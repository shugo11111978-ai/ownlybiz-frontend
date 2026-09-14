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

const drawerMatch = source.match(/  <aside class="ob-guidance-drawer"[\s\S]*?  <\/aside>/);
assert(drawerMatch, 'Personal Assistant drawer markup must exist');
assert.match(drawerMatch[0],/role="complementary"/,'Personal Assistant is a complementary side rail');
assert.doesNotMatch(drawerMatch[0],/aria-modal="true"|tabindex="-1"/,'side rail is neither modal nor an automatic focus target');
const phase1Runtime = scriptById('ownlybiz-expert-phase1-ux-20260913');
const drawerHtml = drawerMatch[0];

const dashboardHtml = `<!doctype html><html><head></head><body>
  <div class="view-panel active" id="view-3">
    <div class="dashboard-layout">
      <button id="assistant-trigger" type="button" aria-controls="ob-guidance-drawer" aria-expanded="false" onclick="obPhase1OpenGuidance(this)">Personal Assistant</button>
      <nav class="db-nav" aria-label="Expert dashboard">
        <button class="db-nav-item" data-ob-panel="overview">Overview</button>
        <button class="db-nav-item" data-ob-panel="live-session">Live sessions</button>
        <button class="db-nav-item" data-ob-panel="bookings">Bookings</button>
        <button class="db-nav-item" data-ob-panel="pricing">Services &amp; rates</button>
        <button class="db-nav-item active" data-ob-panel="website-editor">Website</button>
        <button class="db-nav-item" data-ob-panel="payments">Payments</button>
        <button class="db-nav-item" data-ob-panel="settings">Settings</button>
      </nav>
      <main>
        <section class="db-tab-panel" id="db-panel-overview"><h1>Overview</h1></section>
        <section class="db-tab-panel" id="db-panel-live-session"><h1>Live sessions</h1></section>
        <section class="db-tab-panel" id="db-panel-bookings"><h1>Bookings</h1></section>
        <section class="db-tab-panel" id="db-panel-pricing"><h1>Services &amp; rates</h1></section>
        <section class="db-tab-panel active" id="db-panel-website-editor">
          <h1>Website</h1>
          <nav id="we-tabs" role="tablist" aria-label="Website workspace">
            <button type="button" role="tab" aria-selected="false" data-ob-website-surface="overview">Overview</button>
            <button type="button" role="tab" class="active" aria-selected="true" aria-current="page" data-ob-website-surface="design">Design &amp; templates</button>
            <button type="button" role="tab" aria-selected="false" data-ob-website-surface="pages">Pages</button>
          </nav>
        </section>
        <section class="db-tab-panel" id="db-panel-payments"><h1>Payments</h1></section>
        <section class="db-tab-panel" id="db-panel-settings">
          <nav aria-label="Settings">
            <button class="settings-nav-item active" onclick="settingsNav(this,'sblock-home')">Settings Home</button>
            <button class="settings-nav-item" onclick="settingsNav(this,'sblock-website')">Domains</button>
            <button class="settings-nav-item" onclick="settingsNav(this,'sblock-seo')">SEO</button>
            <button class="settings-nav-item" onclick="settingsNav(this,'sblock-availability')">Availability</button>
            <button class="settings-nav-item" onclick="settingsNav(this,'sblock-billing')">Billing</button>
          </nav>
          <section class="settings-block" id="sblock-home"><h2>Settings Home</h2></section>
          <section class="settings-block" id="sblock-website" hidden><h2>Domains</h2></section>
          <section class="settings-block" id="sblock-seo" hidden><h2>SEO</h2></section>
          <section class="settings-block" id="sblock-availability" hidden><h2>Availability</h2></section>
          <section class="settings-block" id="sblock-billing" hidden><h2>Billing</h2></section>
        </section>
      </main>
    </div>
    <nav class="db-bottom-nav" aria-label="Mobile dashboard"></nav>
    ${drawerHtml}
  </div>
</body></html>`;

const browser = await chromium.launch({
  headless: true,
  ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}),
});

async function createFixture(context, name, suppression = '') {
  const page = await context.newPage();
  await page.goto(`http://localhost/${name}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(suppressionMode => {
    const clone = value => JSON.parse(JSON.stringify(value));
    const NativeMutationObserver = window.MutationObserver;
    window.__observerDeliveries = 0;
    window.__observerRecords = 0;
    window.MutationObserver = class InstrumentedMutationObserver extends NativeMutationObserver {
      constructor(callback) {
        super((records, observer) => {
          window.__observerDeliveries += 1;
          window.__observerRecords += records.length;
          callback(records, observer);
        });
      }
    };

    if (suppressionMode === 'live') {
      document.body.classList.add('ob-live-session-active');
      document.getElementById('db-panel-website-editor').setAttribute('data-ob-live-active', 'true');
    }
    if (suppressionMode === 'dialog') {
      const dialog = document.createElement('div');
      dialog.id = 'blocking-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.className = 'active';
      dialog.textContent = 'Finish this confirmation first';
      document.getElementById('view-3').appendChild(dialog);
    }

    window.__OB_TEST_HOOKS__ = {};
    window.OWNLYBIZ_API_URL = 'http://localhost';
    window.obSupportSessionActive = () => false;
    window.obIsMiniSuiteRoute = () => false;
    window.ownlybizLaunchStatusSnapshot = () => ({ loaded: true, published: false });
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    window.dbNav = (node, panel) => {
      document.querySelectorAll('#view-3 .db-nav-item').forEach(item => item.classList.toggle('active', item === node));
      document.querySelectorAll('#view-3 .db-tab-panel').forEach(item => item.classList.toggle('active', item.id === `db-panel-${panel}`));
    };
    window.settingsNav = (node, blockId) => {
      document.querySelectorAll('#view-3 .settings-nav-item').forEach(item => item.classList.toggle('active', item === node));
      document.querySelectorAll('#view-3 .settings-block').forEach(item => { item.hidden = item.id !== blockId; });
    };
    window.obNavigateDashboardSetting = (blockId, settingsNode, settingNode) => {
      window.dbNav(settingsNode, 'settings');
      window.settingsNav(settingNode, blockId);
    };

    const adapters = [];
    let current = {
      principal: '', role: 'anonymous', token: '', identityGeneration: 0,
      credentialGeneration: 0, controller: new AbortController(),
    };
    const snapshot = scope => Object.freeze({
      scope,
      principal: current.principal,
      role: current.role,
      token: current.token,
      identityGeneration: current.identityGeneration,
      credentialGeneration: current.credentialGeneration,
      signal: current.controller.signal,
    });
    window.OB_CLIENT_CONTEXT = {
      capture: snapshot,
      token: () => current.token,
      isCurrent(candidate, options = {}) {
        return Boolean(candidate && !candidate.signal?.aborted &&
          candidate.principal === current.principal &&
          candidate.identityGeneration === current.identityGeneration &&
          (!options.exactCredential || candidate.token === current.token && candidate.credentialGeneration === current.credentialGeneration));
      },
      register(id, adapter) { adapters.push({ id, adapter }); },
    };

    window.__assistantServers = {};
    window.__assistantRequests = [];
    window.__assistantResponses = 0;
    window.__autoOpenKeys = () => Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index))
      .filter(key => key.startsWith('ob_personal_assistant_auto_open_v2_'))
      .sort();
    const ensureServer = (principal, firstName) => {
      if (!window.__assistantServers[principal]) {
        window.__assistantServers[principal] = {
          firstName,
          profile: {
            revision: 7,
            primary_goal: null,
            practice_focus: '',
            ideal_client: '',
            launch_horizon: null,
            guidance_style: 'concise',
            proactive_guidance: false,
            history_enabled: false,
          },
          onboarding: {
            revision: 11,
            status: 'not_started',
            required_remaining: 1,
            optional_remaining: 1,
            steps: [
              { id: 'account', required: true, state: 'ready' },
              { id: 'profile', required: true, state: 'pending' },
              { id: 'website', required: false, state: 'pending' },
            ],
          },
        };
      }
      return window.__assistantServers[principal];
    };
    const bootstrap = (principal, surface) => {
      const server = ensureServer(principal, principal);
      const goalSaved = Boolean(server.profile.primary_goal);
      return {
        schema_version: 'personal-assistant.bootstrap.v1',
        surface,
        mode: { kind: 'ai' },
        expert: { first_name: server.firstName },
        profile: clone(server.profile),
        onboarding: clone(server.onboarding),
        next_step: {
          title: goalSaved ? 'Your website goal is saved' : 'Choose your first website goal',
          reason: goalSaved ? 'I refreshed your saved profile and guided setup from Ownlybiz.' : 'Start with the outcome you want clients to reach.',
          action_id: 'open-website-design',
        },
      };
    };
    const response = (data, status = 200) => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => clone(data),
    });
    window.fetch = async (url, init = {}) => {
      const parsed = new URL(String(url), location.origin);
      const method = String(init.method || 'GET').toUpperCase();
      const authorization = String(init.headers?.Authorization || '');
      const token = authorization.replace(/^Bearer\s+/i, '');
      const principal = Object.keys(window.__assistantServers).find(key => `token:${key}` === token) || current.principal;
      const body = init.body ? JSON.parse(String(init.body)) : null;
      const record = { method, path: parsed.pathname, surface: parsed.searchParams.get('surface_id') || '', principal, body };
      window.__assistantRequests.push(record);
      await Promise.resolve();
      if (parsed.pathname === '/api/ai/expert-assistant/bootstrap' && method === 'GET') {
        window.__assistantResponses += 1;
        return response(bootstrap(principal, record.surface));
      }
      if (parsed.pathname === '/api/ai/expert-assistant/status' && method === 'GET') {
        return response({ success: true, enabled: true, configured: true });
      }
      if (parsed.pathname === '/api/ai/expert-assistant/profile' && method === 'PATCH') {
        const server = ensureServer(principal, principal);
        if (Number(body.expected_revision) !== Number(server.profile.revision)) {
          return response({ success: false, error: 'Profile revision conflict' }, 409);
        }
        server.profile = { ...server.profile, ...body, revision: server.profile.revision + 1 };
        delete server.profile.expected_revision;
        server.onboarding = { ...server.onboarding, revision: server.onboarding.revision + 1 };
        return response({ success: true, profile: clone(server.profile) });
      }
      if (parsed.pathname === '/api/ai/expert-assistant/onboarding' && method === 'PATCH') {
        const server = ensureServer(principal, principal);
        if (Number(body.expected_revision) !== Number(server.onboarding.revision)) {
          return response({ success: false, error: 'Onboarding revision conflict' }, 409);
        }
        server.onboarding = { ...server.onboarding, revision: server.onboarding.revision + 1, status: body.status };
        return response({
          success: true,
          profile: clone(server.profile),
          onboarding: clone(server.onboarding),
          next_step: bootstrap(principal, 'website.design').next_step,
        });
      }
      return response({ success: false, error: `Unexpected request: ${method} ${parsed.pathname}` }, 404);
    };

    window.__loginExpert = (principal, firstName) => {
      current.controller.abort();
      current = {
        principal,
        role: 'expert',
        token: `token:${principal}`,
        identityGeneration: current.identityGeneration + 1,
        credentialGeneration: current.credentialGeneration + 1,
        controller: new AbortController(),
      };
      ensureServer(principal, firstName);
      const registration = adapters.find(item => item.id === 'expert-phase1-guidance');
      if (!registration) throw new Error('Phase 1 identity adapter was not registered');
      return registration.adapter.changed(snapshot('first-login'));
    };
    window.__removeSuppression = () => {
      document.body.classList.remove('ob-live-session-active');
      document.querySelectorAll('[data-ob-live-active]').forEach(node => node.removeAttribute('data-ob-live-active'));
      const dialog = document.getElementById('blocking-dialog');
      if (dialog) dialog.hidden = true;
    };
  }, suppression);
  await page.addScriptTag({ content: phase1Runtime });
  await page.waitForFunction(() => window.__OB_TEST_HOOKS__.expertPhase1Ux && document.getElementById('view-3').getAttribute('data-ob-phase1-observed') === '1');
  return page;
}

try {
  const context = await browser.newContext();
  await context.route('**/*', route => {
    if (route.request().isNavigationRequest() && route.request().url().startsWith('http://localhost/')) {
      return route.fulfill({ status: 200, contentType: 'text/html', body: dashboardHtml });
    }
    return route.abort();
  });

  const primary = await createFixture(context, 'first-login');
  await primary.evaluate(() => window.__loginExpert('expert-ava', 'Ava'));
  await primary.waitForFunction(() => !document.getElementById('ob-guidance-drawer').hidden && document.getElementById('ob-guidance-title').textContent.includes('Ava'));

  const firstLogin = await primary.evaluate(() => ({
    title: document.getElementById('ob-guidance-title').textContent,
    welcome: document.getElementById('ob-guidance-ai-log').textContent,
    contextTitle: document.getElementById('ob-guidance-context-title').textContent,
    contextCopy: document.getElementById('ob-guidance-context-copy').textContent,
    starters: [...document.querySelectorAll('#ob-guidance-starters button')].map(node => node.textContent),
    goalsHidden: document.getElementById('ob-guidance-goals').hidden,
    surfaceRequests: window.__assistantRequests.filter(item => item.path.endsWith('/bootstrap')).map(item => item.surface),
    autoOpenKeys: window.__autoOpenKeys(),
  }));
  assert.equal(firstLogin.title, 'Hi Ava — I’m your personal assistant', 'first login is personally addressed');
  assert.match(firstLogin.welcome, /Hi Ava\. I’m your personal assistant\./, 'welcome message is personally addressed');
  assert.match(firstLogin.welcome, /found 1 saved setup item already ready/, 'welcome recognizes confirmed setup');
  assert.equal(firstLogin.contextTitle, 'Build your expert website', 'Website context has its own guidance title');
  assert.match(firstLogin.contextCopy, /coherent foundation.*real content.*structural design choices/i, 'Website Design guidance explains the exact foundation workflow');
  assert(firstLogin.starters.includes('Which changes affect every page?'), 'Website Design receives its exact contextual starter');
  assert.equal(firstLogin.goalsHidden, false, 'not_started onboarding presents first-goal choices');
  assert.deepEqual(firstLogin.surfaceRequests, ['website.design'], 'bootstrap receives the exact Website Design surface');
  assert.equal(firstLogin.autoOpenKeys.length, 1, 'first principal receives one principal-scoped auto-open marker');

  await primary.evaluate(async () => {
    window.obPhase1CloseGuidance();
    await window.__OB_TEST_HOOKS__.expertPhase1Ux.loadAssistantBootstrap(true, true);
  });
  assert.equal(await primary.locator('#ob-guidance-drawer').evaluate(node => node.hidden), true, 'same principal never auto-opens twice in one session');
  assert.equal(await primary.evaluate(() => window.__autoOpenKeys().length), 1, 'same-principal retry does not create another presentation marker');

  await primary.evaluate(() => window.__loginExpert('expert-ben', 'Ben'));
  await primary.waitForFunction(() => !document.getElementById('ob-guidance-drawer').hidden && document.getElementById('ob-guidance-title').textContent.includes('Ben'));
  assert.equal(await primary.evaluate(() => window.__autoOpenKeys().length), 2, 'a different exact principal owns an independent first-login auto-open');

  const bootstrapCountBeforeGoal = await primary.evaluate(() => window.__assistantRequests.filter(item => item.principal === 'expert-ben' && item.path.endsWith('/bootstrap')).length);
  await primary.locator('[data-ob-assistant-goal="publish_website"]').click();
  await primary.waitForFunction(expected => {
    const server = window.__assistantServers['expert-ben'];
    const bootstraps = window.__assistantRequests.filter(item => item.principal === 'expert-ben' && item.path.endsWith('/bootstrap')).length;
    return server.profile.primary_goal === 'publish_website' && bootstraps > expected && document.getElementById('ob-guidance-practice-title').textContent === 'Your website goal is saved';
  }, bootstrapCountBeforeGoal);
  const goalResult = await primary.evaluate(() => ({
    patch: window.__assistantRequests.find(item => item.principal === 'expert-ben' && item.path.endsWith('/profile') && item.method === 'PATCH'),
    server: JSON.parse(JSON.stringify(window.__assistantServers['expert-ben'])),
    summary: document.getElementById('ob-guidance-profile-summary').textContent,
    goalsHidden: document.getElementById('ob-guidance-goals').hidden,
    practiceCopy: document.getElementById('ob-guidance-practice-copy').textContent,
    onboardingControl: document.querySelector('[data-ob-assistant-onboarding]')?.textContent || '',
  }));
  assert.equal(goalResult.patch.body.expected_revision, 7, 'goal save uses the server profile revision');
  assert.equal(goalResult.patch.body.primary_goal, 'publish_website', 'selected goal is persisted through the profile API');
  assert.equal(goalResult.server.profile.revision, 8, 'server profile revision advances');
  assert.equal(goalResult.server.onboarding.revision, 12, 'forced bootstrap refresh adopts server-side onboarding progression');
  assert.match(goalResult.summary, /your goal is publishing your website/, 'refreshed profile is rendered personally');
  assert.equal(goalResult.goalsHidden, true, 'saved goal removes redundant first-goal choices');
  assert.match(goalResult.practiceCopy, /refreshed your saved profile and guided setup from Ownlybiz/, 'server-refreshed onboarding/profile state drives the next step');
  assert.equal(goalResult.onboardingControl, 'Start guided setup', 'not_started guided setup remains explicit after choosing a goal');

  await primary.locator('[data-ob-assistant-onboarding="active"]').click();
  await primary.waitForFunction(() => document.querySelector('[data-ob-assistant-onboarding="paused"]')?.textContent === 'Pause guided setup');
  const onboardingPatch = await primary.evaluate(() => window.__assistantRequests.find(item => item.principal === 'expert-ben' && item.path.endsWith('/onboarding') && item.method === 'PATCH'));
  assert.deepEqual(onboardingPatch.body, { expected_revision: 12, status: 'active' }, 'guided setup activation is server-backed and revision fenced');

  await primary.evaluate(() => window.obPhase1CloseGuidance());
  const observerBefore = await primary.evaluate(() => window.__observerDeliveries);
  await primary.evaluate(() => document.querySelector('[data-ob-panel="payments"]').classList.add('observer-probe'));
  await primary.waitForFunction(before => window.__observerDeliveries > before, observerBefore);
  await primary.waitForTimeout(40);
  const afterDelivery = await primary.evaluate(() => ({
    deliveries: window.__observerDeliveries,
    bootstraps: window.__assistantRequests.filter(item => item.path.endsWith('/bootstrap')).length,
  }));
  const responsiveOpen = await primary.evaluate(async () => {
    const trigger = document.getElementById('assistant-trigger');
    trigger.focus();
    trigger.click();
    const immediate = !document.getElementById('ob-guidance-drawer').hidden && trigger.getAttribute('aria-expanded') === 'true';
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      immediate,
      focused: document.activeElement?.id || '',
      dashboardInert: document.getElementById('view-3').hasAttribute('inert'),
      dashboardHidden: document.getElementById('view-3').getAttribute('aria-hidden'),
    };
  });
  assert.equal(responsiveOpen.immediate, true, 'drawer opens synchronously after a real MutationObserver delivery');
  assert.equal(responsiveOpen.focused, 'assistant-trigger', 'opening the side rail keeps focus on the dashboard trigger');
  assert.equal(responsiveOpen.dashboardInert, false, 'opening the assistant never makes the dashboard inert');
  assert.equal(responsiveOpen.dashboardHidden, null, 'opening the assistant never hides the dashboard accessibility tree');
  const parallelUse = await primary.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const openAfterOutsideEscape = !document.getElementById('ob-guidance-drawer').hidden;
    const payments = document.querySelector('[data-ob-panel="payments"]');
    window.dbNav(payments, 'payments');
    await new Promise(resolve => requestAnimationFrame(resolve));
    const dashboardNavigated = document.getElementById('db-panel-payments').classList.contains('active');
    const openAfterNavigation = !document.getElementById('ob-guidance-drawer').hidden;
    document.getElementById('ob-guidance-ai-input').focus();
    document.getElementById('ob-guidance-ai-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    return {
      openAfterOutsideEscape,
      dashboardNavigated,
      openAfterNavigation,
      closedAfterInsideEscape: document.getElementById('ob-guidance-drawer').hidden,
    };
  });
  assert.equal(parallelUse.openAfterOutsideEscape, true, 'Escape outside the assistant is scoped away from the rail');
  assert.equal(parallelUse.dashboardNavigated, true, 'the dashboard remains navigable while the assistant is open');
  assert.equal(parallelUse.openAfterNavigation, true, 'dashboard work does not dismiss the assistant rail');
  assert.equal(parallelUse.closedAfterInsideEscape, true, 'Escape from inside the assistant closes the rail');
  await primary.evaluate(() => window.obPhase1OpenGuidance(document.getElementById('assistant-trigger')));
  const bootstrapsAfterParallelUse = await primary.evaluate(() => window.__assistantRequests.filter(item => item.path.endsWith('/bootstrap')).length);
  await primary.waitForTimeout(120);
  const observerAfter = await primary.evaluate(() => ({
    deliveries: window.__observerDeliveries,
    bootstraps: window.__assistantRequests.filter(item => item.path.endsWith('/bootstrap')).length,
    open: !document.getElementById('ob-guidance-drawer').hidden,
  }));
  assert.equal(observerAfter.open, true, 'drawer stays open after observer settlement');
  assert(observerAfter.deliveries - afterDelivery.deliveries < 5, 'drawer mutations do not create a MutationObserver feedback loop');
  assert.equal(observerAfter.bootstraps, bootstrapsAfterParallelUse, 'settled parallel dashboard use does not create a bootstrap request loop');

  const live = await createFixture(context, 'live-suppression', 'live');
  await live.evaluate(() => window.__loginExpert('expert-live', 'Liv'));
  await live.waitForFunction(() => document.getElementById('ob-guidance-title').textContent.includes('Liv'));
  assert.equal(await live.locator('#ob-guidance-drawer').evaluate(node => node.hidden), true, 'active live work suppresses first-login auto-open');
  assert.equal(await live.evaluate(() => window.__autoOpenKeys().length), 0, 'live-work suppression does not consume the one-time opportunity');
  await live.evaluate(async () => {
    window.__removeSuppression();
    await window.__OB_TEST_HOOKS__.expertPhase1Ux.loadAssistantBootstrap(true, true);
  });
  assert.equal(await live.locator('#ob-guidance-drawer').evaluate(node => node.hidden), false, 'assistant may auto-open after live work ends');

  const dialog = await createFixture(context, 'dialog-suppression', 'dialog');
  await dialog.evaluate(() => window.__loginExpert('expert-dialog', 'Dia'));
  await dialog.waitForFunction(() => document.getElementById('ob-guidance-title').textContent.includes('Dia'));
  assert.equal(await dialog.locator('#ob-guidance-drawer').evaluate(node => node.hidden), true, 'another visible dialog suppresses first-login auto-open');
  assert.equal(await dialog.evaluate(() => window.__autoOpenKeys().length), 0, 'dialog suppression does not consume the one-time opportunity');
  await dialog.evaluate(async () => {
    window.__removeSuppression();
    await window.__OB_TEST_HOOKS__.expertPhase1Ux.loadAssistantBootstrap(true, true);
  });
  assert.equal(await dialog.locator('#ob-guidance-drawer').evaluate(node => node.hidden), false, 'assistant may auto-open after the other dialog closes');

  console.log(JSON.stringify({
    status: 'PASS',
    runtime: 'ownlybiz-expert-phase1-ux-20260913',
    firstLogin: ['principal-scoped one-time auto-open', 'personalized welcome', 'Website Design context'],
    persistence: ['profile revision PATCH', 'bootstrap onboarding/profile refresh', 'onboarding revision PATCH'],
    suppression: ['active live work', 'another visible dialog'],
    responsiveness: 'native MutationObserver delivered; non-modal rail stayed synchronous, dashboard-usable, Escape-scoped, and request-loop free',
    network: 'deterministic assistant facade; all external requests blocked',
  }));
} finally {
  await browser.close();
}
