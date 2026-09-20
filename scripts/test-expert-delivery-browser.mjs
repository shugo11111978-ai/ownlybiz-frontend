import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Complete browser runtime, but every request is fulfilled by this process.
// No production server, payment provider, email sender, or real account exists.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const dependencyRoot = '/Users/liranbahbut/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let playwright;
try { playwright = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright'); }
catch { playwright = require(path.join(dependencyRoot, 'playwright')); }
const baseline = process.argv.includes('--baseline');
const baselineRef = process.env.OWNLYBIZ_BASELINE_REF || '756e223b';
const quick = process.argv.includes('--quick');
const routeOnly = process.argv.find(arg => arg.startsWith('--route='))?.slice(8);
const tenantOnly = process.argv.find(arg => arg.startsWith('--tenant='))?.slice(9);
const caseOnly = process.argv.find(arg => arg.startsWith('--case='))?.slice(7);
const viewportOnly = process.argv.find(arg => arg.startsWith('--viewport='))?.slice(11);
const longCustomSlug = 'route-' + 'x'.repeat(58);
const sourceHashes = Object.fromEntries(['index.html', 'api/seo-shell.js', 'lib/expert-public.js', 'lib/expert-render.js', 'data/ownlybiz-expert.html', 'scripts/test-expert-delivery-browser.mjs'].filter(file => fs.existsSync(path.join(root, file))).map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const output = process.env.OWNLYBIZ_QA_OUTPUT || path.join(root, 'ops/qa', `expert-delivery-browser-${baseline ? 'baseline' : 'candidate'}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(output, { recursive: true });
const baselineFiles = new Map();
function readSource(relative) {
  if (!baseline) return fs.readFileSync(path.join(root, relative), 'utf8');
  if (!baselineFiles.has(relative)) baselineFiles.set(relative, execFileSync('git', ['show', `${baselineRef}:${relative}`], { cwd: root, encoding: 'utf8', maxBuffer: 20_000_000 }));
  return baselineFiles.get(relative);
}
const profiles = [
  { slug: 'fixture-luna', host: 'luna-fixture.test', name: 'Luna Fixture', title: 'Tarot reader', color: '#644381' },
  { slug: 'fixture-coach', host: 'fixture-coach.ownlybiz.com', name: 'Ari Fixture', title: 'Decision coach', color: '#245d50' },
  { slug: 'fixture-team', host: 'team-fixture.test', name: 'Orion Fixture', title: 'Independent specialists', color: '#315e85', marketplace: true },
  { slug: 'fixture-platform', host: 'ownlybiz.com', basePath: '/fixture-platform', name: 'Quinn Fixture', title: 'Career guide', color: '#775124' },
  { slug: 'stripe', host: 'stripe.ownlybiz.com', name: 'Reserved Slug Fixture', title: 'Personal guide', color: '#775124', focusedOnly: true },
  { slug: 'fixture-query', host: 'ownlybiz.com', basePath: '/fixture-query', name: 'Query Fixture', title: 'Personal guide', color: '#775124', focusedOnly: true, queryMode: true },
].map((item, index) => ({
  ...item,
  expert: {
    id: `00000000-0000-4000-8000-00000000000${index + 1}`, user_id: `00000000-0000-4000-8000-00000000000${index + 1}`,
    slug: item.slug, name: item.name, display_name: item.name, title: item.title,
    bio: `${item.name} offers thoughtful individual sessions.`, about_text: `${item.name} listens carefully and helps you explore your next step.`,
    hero_tagline: `A clear next step with ${item.name}.`, footer_text: item.name,
    website_published: true, is_active: true, approval_status: 'approved', allow_indexing: true,
    rate_chat: 2.15 + index, rate_voice: 3.25 + index, rate_video: 4.45 + index, chat_pm: 2.15 + index, voice_pm: 3.25 + index, video_pm: 4.45 + index,
    free_minutes: 0, chat_free_min: 0, voice_free_min: 0, video_free_min: 0,
    chat_enabled: true, voice_enabled: true, video_enabled: true, is_online: true,
    payments_enabled: true, accept_offline: true, credit_enabled: true, credit_amounts: [10, 25, 50],
    theme_color: item.color, theme_preset: 'warm', timezone: 'UTC', language: 'en',
    privacy_cookie_banner_enabled: false, privacy_contact_email: `privacy-${item.slug}@example.test`,
    email: `PRIVATE-LOGIN-${item.slug}@example.test`, account_email: `PRIVATE-ACCOUNT-${item.slug}@example.test`,
    avg_rating: 4.8, review_count: 1, session_count: 5,
    website_content: {
      pages: { home: true, about: true, services: true, reviews: true, book: true, contact: true },
      hero_cta: 'Book a session', about_title: `About ${item.name}`, about_subtitle: item.title,
      svc_title: `Sessions with ${item.name}`, svc_subtitle: 'Choose a private conversation.',
      svc_chat_desc: 'A focused written conversation.', svc_voice_desc: 'A private audio conversation.', svc_video_desc: 'A private video conversation.',
      contact_heading: `Contact ${item.name}`, contact_desc: 'Send a question about your session.',
      contact_email: `public-${item.slug}@example.test`, contact_location: 'Online', contact_hours: 'By appointment',
      contact_response: 'Within two working days', nav_labels: { home: 'Home', about: 'About', services: 'Services', reviews: 'Reviews', book: 'Book a Session', contact: 'Contact' },
      ai_pages: [
        { slug: 'my-method', title: `${item.name} method`, nav_label: 'My method', summary: 'A considered approach to individual sessions.', published: true, show_in_nav: true, sections: [{ title: 'Listen and reflect', body: 'Bring one question and explore practical next steps.' }] },
        { slug: 'private-guide', title: `${item.name} guide`, summary: 'A published page shared by direct link.', published: true, show_in_nav: false, sections: [{ title: 'Preparation', body: 'Take time to prepare your question.' }] },
        { slug: longCustomSlug, title: `${item.name} detailed guide`, summary: 'A published page with a sixty-four-character route.', published: true, show_in_nav: false, sections: [{ title: 'Detailed preparation', body: 'Prepare your question before choosing the appropriate private session.' }] },
        { slug: 'new-page', title: 'New Page', nav_label: 'Preparation guide', summary: 'A meaningful published preparation guide retaining its original draft title.', published: true, show_in_nav: false, sections: [{ title: 'Prepare for your session', body: `Make the most of your time with ${item.name}: write down the question you want to explore and the context you would like to share.` }] },
        { slug: 'draft-canary', title: 'DRAFT-CONTENT-CANARY', published: false, sections: [{ title: 'PRIVATE-DRAFT-CANARY', body: 'Never publish this draft.' }] },
      ],
    },
    ...(item.marketplace ? { marketplace_public: { enabled: true, settings: { enabled: true, public_label: 'Our experts', intro_text: 'Choose an independent specialist.', allow_chat: true, allow_voice: true, allow_video: true }, experts: ['one', 'two'].map((key, memberIndex) => ({ id: `mini-fixture-${key}`, owner_expert_id: '00000000-0000-4000-8000-000000000003', name: memberIndex ? 'Alex Fixture' : 'Robin Fixture', display_name: memberIndex ? 'Alex Fixture' : 'Robin Fixture', title: 'Reader', bio: 'An individual specialist.', status: 'active', suite_enabled: true, is_online: true, chat_enabled: true, voice_enabled: true, video_enabled: true, chat_pm: 2.15, voice_pm: 3.25, video_pm: 4.45 })) } } : {}),
  },
}));
const client = { id: '00000000-0000-4000-8000-000000000099', name: 'Fixture Client', email: 'fixture-client@example.test', role: 'client' };
const token = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: client.id, role: 'client', exp: 4102444800 })).toString('base64url')}.fixture`;
const defaultConfig = { success: true, platform_name: 'Ownlybiz', client_payments: { apple_pay_enabled: false, google_pay_enabled: false }, session_authorization: { amount_cents: 500, currency: 'usd' }, seo: {}, social_auth: {}, plans: { starter: { expertCut: 88 } } };
const records = { upstream: [], requests: [], blockedExternal: [], simulatedWrites: [], forbiddenWrites: [], sockets: 0, cases: [], failures: [] };
function currentProfile(url, pageHost = '') {
  const parts = url.pathname.split('/').filter(Boolean);
  const explicit = profiles.find(item => parts.includes(item.slug) || url.searchParams.get('expert') === item.slug);
  return explicit || profiles.find(item => url.searchParams.get('domain') === item.host) || profiles.find(item => item.host === pageHost) || profiles[0];
}
function profilePayload(item) {
  const expert = structuredClone(item.expert);
  // Browser response models the existing public API; server input retains
  // privacy canaries to exercise the new server projection independently.
  return { success: true, expert, reviews: [{ id: 'review-fixture', rating: 5, comment: `A helpful session with ${item.name}.`, reviewer_name: 'Fixture Reviewer', is_visible: true, is_verified_session: true, source: 'session' }], packages: [], availability: [0, 1, 2, 3, 4, 5, 6].map(day => ({ day_of_week: day, start_time: '09:00', end_time: '18:00', is_active: true, timezone: 'UTC' })) };
}
function fixtureApi(url, method = 'GET', pageHost = '', body = '') {
  const item = currentProfile(url, pageHost), pathname = url.pathname;
  if (method === 'OPTIONS') return { status: 204, data: null };
  if (method !== 'GET' && method !== 'HEAD') {
    if (/\/api\/auth\/(?:login|signup|forgot-password)$/.test(pathname)) {
      records.simulatedWrites.push({ method, pathname, kind: 'fixture-auth' });
      return { status: 200, data: { success: true, token, user: client } };
    }
    if (/\/api\/(?:analytics|tracking|events|activity|telemetry)(?:\/|$)/.test(pathname)) {
      records.simulatedWrites.push({ method, pathname, kind: 'fixture-telemetry' });
      return { status: 200, data: { success: true } };
    }
    records.forbiddenWrites.push({ method, pathname });
    return { status: 409, data: { error: 'Transaction writes are disabled by the offline fixture.' } };
  }
  if (pathname === '/api/config') return { data: defaultConfig };
  if (pathname === '/api/domains/lookup') return { data: { success: true, slug: item.slug, domain: item.host, expert_id: item.expert.id } };
  if (pathname.includes('/api/experts/public-status/')) return { data: { success: true, slug: item.slug, public_available: true, is_active: true, website_published: true, approval_status: 'approved' } };
  if (profiles.some(profile => pathname === '/api/experts/' + profile.slug)) return { data: profilePayload(item) };
  if (/\/api\/experts\/[^/]+\/(?:online-status|availability|reviews)$/.test(pathname)) return { data: { success: true, is_online: true, availability: profilePayload(item).availability, reviews: profilePayload(item).reviews } };
  if (pathname === '/api/auth/me') return { data: { success: true, user: client } };
  if (pathname === '/api/payments/config') return { data: { publishable_key: 'pk_test_OFFLINE_FIXTURE', currency: 'usd', mode: 'test' } };
  if (pathname === '/api/payments/methods/status') return { data: { has_saved_payment_method: false, mode: 'test' } };
  if (pathname.includes('/api/on-demand/public/')) return { data: { success: true, available: false, settings: {}, buckets: [] } };
  if (pathname.includes('/api/credits/')) return { data: { success: true, balance: 0, balance_cents: 0, transactions: [], amounts: [10, 25, 50], promotions: [], summary: { available_cents: 0 } } };
  if (pathname.includes('/api/bookings/slots/')) return { data: { success: true, slots: ['10:00', '11:00', '12:00'], timezone: 'UTC', available: true } };
  if (pathname.startsWith('/api/bookings')) return { data: { success: true, bookings: [] } };
  if (pathname.startsWith('/api/sessions')) return { data: { success: true, sessions: [], session: null, messages: [] } };
  if (pathname.includes('/api/admin/settings/popup-settings')) return { data: { popup_enabled: false } };
  if (pathname.includes('/api/admin/settings')) return { data: {} };
  if (pathname.includes('/api/auth/providers')) return { data: { providers: [], apple_enabled: false, google_enabled: false } };
  if (pathname.includes('/api/experts/platform-fees')) return { data: { plans: {}, platform_fee_pct: 12 } };
  return { data: { success: true, available: false, enabled: false, items: [], data: [], experts: [], rooms: [], requests: [], readings: [], messages: [], packages: [], reviews: [], bookings: [], sessions: [] } };
}
function serverHandler() {
  const context = vm.createContext({ console, URL, URLSearchParams, AbortController, setTimeout, clearTimeout, Buffer, Date, process: { cwd: () => root, env: { NODE_ENV: 'test', OWNLYBIZ_API_URL: 'https://offline-backend.test', OB_PUBLIC_EXPERT_FIRST_PAINT_SLUGS: '*', OB_PUBLIC_EXPERT_IDENTITY_SLUGS: '*' } } });
  context.fetch = async (address, init = {}) => {
    const url = new URL(address);
    records.upstream.push({ path: url.pathname, method: init.method || 'GET' });
    assert.ok(!init.method || init.method === 'GET', 'Server rendering is read-only');
    const result = fixtureApi(url), status = result.status || 200;
    return { ok: status >= 200 && status < 300, status, json: async () => structuredClone(result.data), text: async () => JSON.stringify(result.data), headers: new Map() };
  };
  const modules = new Map();
  function load(relative) {
    if (!path.extname(relative)) relative += '.js';
    if (modules.has(relative)) return modules.get(relative).exports;
    const module = { exports: {} }; modules.set(relative, module);
    const localRequire = name => {
      if (name === 'path') return path;
      if (name === 'fs') return { ...fs, readFileSync(filename, encoding) {
        const relativeFile = path.relative(root, filename);
        if (baseline && relativeFile === 'index.html') return readSource(relativeFile);
        return fs.readFileSync(filename, encoding);
      } };
      if (name.startsWith('.')) return load(path.normalize(path.join(path.dirname(relative), name)));
      throw new Error(`Nonlocal handler dependency forbidden: ${name}`);
    };
    const code = readSource(relative);
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename: relative })(localRequire, module, module.exports);
    return module.exports;
  }
  const handler = load('api/seo-shell.js');
  return async url => {
    const result = { status: 200, body: '', headers: {} };
    const res = { status(code) { result.status = code; return this; }, setHeader(name, value) { result.headers[name] = String(value); }, send(body) { result.body = String(body); }, end(body = '') { result.body = String(body); } };
    await handler({ url: url.pathname + url.search, method: 'GET', headers: { host: url.host } }, res);
    return result;
  };
}
const render = serverHandler();
const stripeStub = `window.Stripe=function(){return {elements:function(){return {create:function(type){var handlers={},node;return {on:function(name,fn){handlers[name]=fn;},mount:function(target){var parent=typeof target==='string'?document.querySelector(target):target;node=document.createElement('div');node.setAttribute('data-offline-stripe',type);node.textContent='Offline payment field';parent&&parent.appendChild(node);if(handlers.ready)handlers.ready({availablePaymentMethods:null});},unmount:function(){node&&node.remove();},destroy:function(){node&&node.remove();},focus:function(){},update:function(){}};}};},confirmCardPayment:function(){throw new Error('Payment confirmation forbidden by offline fixture');},confirmCardSetup:function(){throw new Error('Payment confirmation forbidden by offline fixture');},confirmSetup:function(){throw new Error('Payment confirmation forbidden by offline fixture');}};};`;
const installedChrome = process.env.OWNLYBIZ_CHROME_PATH || (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '');
const browser = await playwright.chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND', '--proxy-server=http://127.0.0.1:9'], ...(installedChrome ? { executablePath: installedChrome } : {}) });
async function contextFor(viewport, options = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', ignoreHTTPSErrors: true, ...options });
  await context.routeWebSocket('**/*', socket => { records.sockets++; socket.close(); });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const pageHost = (() => { try { return new URL(request.frame().url()).host; } catch { return ''; } })();
    records.requests.push({ host: url.host, path: url.pathname, method, kind: request.resourceType() });
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,HEAD,POST,OPTIONS', 'cache-control': 'no-store' };
    if (url.pathname.startsWith('/api/')) {
      if (/\/api\/(?:media\/|experts\/favicon)/.test(url.pathname)) return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#644381"/></svg>', headers: cors });
      const result = fixtureApi(url, method, pageHost, request.postData() || '');
      return route.fulfill({ status: result.status || 200, contentType: 'application/json', body: result.data === null ? '' : JSON.stringify(result.data), headers: cors });
    }
    if (request.isNavigationRequest() && (profiles.some(item => item.host === url.host) || url.host === 'ownlybiz.com')) {
      const result = await render(url);
      return route.fulfill({ status: result.status, contentType: 'text/html', body: result.body, headers: { ...cors, ...result.headers } });
    }
    if (url.host === 'js.stripe.com') return route.fulfill({ status: 200, contentType: 'text/javascript', body: stripeStub, headers: cors });
    const file = path.resolve(root, '.' + url.pathname);
    if ((url.pathname.startsWith('/assets/') || url.pathname === '/favicon.svg') && file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      const contentType = /\.js$/.test(file) ? 'text/javascript' : /\.css$/.test(file) ? 'text/css' : /\.svg$/.test(file) ? 'image/svg+xml' : /\.webp$/.test(file) ? 'image/webp' : 'application/octet-stream';
      return route.fulfill({ status: 200, contentType, body: fs.readFileSync(file), headers: cors });
    }
    records.blockedExternal.push({ host: url.host, path: url.pathname, kind: request.resourceType() });
    if (request.resourceType() === 'stylesheet') return route.fulfill({ status: 200, contentType: 'text/css', body: '', headers: cors });
    if (request.resourceType() === 'script') return route.fulfill({ status: 200, contentType: 'text/javascript', body: '', headers: cors });
    return route.abort('blockedbyclient');
  });
  return context;
}
let diagnosticPage = null;
let diagnosticErrors = [];
async function runCase(name, test) {
  if (caseOnly && !name.endsWith('/' + caseOnly)) return;
  const started = Date.now();
  try { const details = await test(); records.cases.push({ name, status: 'PASS', durationMs: Date.now() - started, ...details }); }
  catch (error) {
    let diagnostic = null;
    if (diagnosticPage && !diagnosticPage.isClosed()) {
      const file = `FAIL-${name.replace(/[^a-z0-9-]/gi, '-')}`;
      await diagnosticPage.screenshot({ path: path.join(output, file + '.png'), fullPage: true }).catch(() => {});
      diagnostic = await diagnosticPage.evaluate(() => ({ url: location.href, title: document.title, text: document.body.innerText, activePages: [...document.querySelectorAll('.view-panel.active,.expert-page.active')].map(node => node.id), customPageIds: [...document.querySelectorAll('[id^="ep-ai-"]')].map(node => node.id), currentExpert: window._currentExpert?.slug, aiPageCount: window._currentExpert?.website_content?.ai_pages?.length, lifecycleOwner: window.obPublicRenderLifecycle?.current?.slug, applyDecision: window.__obPublicApplyGateDecision && { accepted: window.__obPublicApplyGateDecision.accepted, slug: window.__obPublicApplyGateDecision.data?.slug }, pendingPage: window._pendingExpertPage, currentEpPage: window._currentEpPage, routeGuard: window._obInitialExpertRouteGuardPage, firstPaint: document.documentElement.classList.contains('ob-public-first-paint'), booking: document.getElementById('stype-grid')?.outerHTML, account: { style: document.getElementById('ep-account')?.getAttribute('style'), hidden: document.getElementById('ep-account')?.hidden, clientToken: !!window.getClientToken?.(), dropdown: document.getElementById('client-nav-dropdown')?.outerHTML, trace: window.__fixtureAccountTrace } })).catch(() => null);
      if (diagnostic) diagnostic.pageErrors = diagnosticErrors.slice();
    }
    records.failures.push({ name, error: error.message, stack: error.stack, diagnostic }); records.cases.push({ name, status: 'FAIL', durationMs: Date.now() - started, error: error.message });
  }
  console.log(`${records.cases.at(-1).status} ${name}`);
  fs.writeFileSync(path.join(output, 'progress.json'), JSON.stringify({ sourceHashes, completedAt: new Date().toISOString(), cases: records.cases, failures: records.failures }, null, 2));
}
const forbiddenCopy = /PRIVATE-(?:LOGIN|ACCOUNT)|DRAFT-CONTENT-CANARY|PRIVATE-DRAFT-CANARY|Wharton|Fortune 500|global management consultancy|Ready to build something great|Ownlybiz Ops Monitor|Join the Waitlist/;
async function ready(page, item, expectedPage) {
  await page.waitForFunction(({ slug, expectedPage }) => {
    const expert = window._currentExpert;
    const panel = document.querySelector('#view-4.active');
    const active = document.querySelector('#view-4 .expert-page.active');
    return expert && expert.slug === slug && panel && !document.documentElement.classList.contains('ob-public-first-paint') && (!expectedPage || active && active.id === `ep-${expectedPage}`);
  }, { slug: item.slug, expectedPage }, { timeout: 18000 });
  await page.waitForTimeout(450);
}
async function metadata(page) {
  return page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
    ogDescription: document.querySelector('meta[property="og:description"]')?.content,
    ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    schema: JSON.parse(document.getElementById('ob-expert-schema')?.textContent || 'null'),
  }));
}
function pageUrl(item, pathname) { return `https://${item.host}${item.queryMode ? '' : item.basePath || ''}${pathname}${item.queryMode ? '?expert=' + item.slug : ''}`; }
function canonicalUrl(item, pathname) { return `https://${item.host}${item.basePath || ''}${pathname}`; }
try {
  const tenants = tenantOnly ? profiles.filter(item => item.slug === tenantOnly) : quick ? profiles.slice(0, 1) : profiles.filter(item => !item.focusedOnly);
  const allViewports = [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }];
  const viewports = viewportOnly ? allViewports.filter(viewport => viewport.name === viewportOnly) : quick ? allViewports.slice(0, 1) : allViewports;
  for (const viewport of viewports) {
    for (const item of tenants) {
      const context = await contextFor({ width: viewport.width, height: viewport.height });
      const page = await context.newPage();
      diagnosticPage = page;
      page.setDefaultTimeout(9000);
      const errors = [];
      const coldMetadata = new Map();
      diagnosticErrors = errors;
      page.on('pageerror', error => errors.push(error.message));
      if (caseOnly === 'dashboard-startup') await runCase(`${item.slug}/${viewport.name}/dashboard-startup`, async () => {
        const expertUser = { id: item.expert.id, name: item.name, slug: item.slug, role: 'expert', email: 'expert@example.test' };
        const expertToken = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: expertUser.id, role: 'expert', exp: 4102444800 })).toString('base64url')}.fixture`;
        await page.addInitScript(({ expertUser, expertToken }) => {
          sessionStorage.setItem('ob_u', JSON.stringify(expertUser));
          sessionStorage.setItem('ob_t', expertToken);
        }, { expertUser, expertToken });
        let release;
        let gate;
        await context.route('**/api/auth/me', async route => route.fulfill({ json: { success: true, user: expertUser }, headers: { 'access-control-allow-origin': '*' } }));
        await context.route('**/api/experts/me/dashboard', async route => {
          await gate;
          await route.fulfill({ json: { success: true, profile: item.expert, stats: {}, monthly_revenue: [], recent_sessions: [] }, headers: { 'access-control-allow-origin': '*' } });
        });
        for (const panel of ['overview', 'live-session']) {
          gate = new Promise(resolve => { release = resolve; });
          try {
            await page.goto(`https://ownlybiz.com/dash/${item.slug}/${panel}`, { waitUntil: 'domcontentloaded' });
            await page.locator(`#db-panel-${panel}.active`).waitFor({ state: 'attached' });
            // Legacy timer/other-page ready calls must not expose empty data.
            await page.evaluate(() => window._markRouteReady());
            assert.equal(await page.evaluate(() => document.documentElement.classList.contains('ob-dashboard-loading')), true);
            assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).opacity), '0');
          } finally { release(); }
          await page.waitForFunction(() => !document.documentElement.classList.contains('ob-dashboard-loading') && getComputedStyle(document.body).opacity === '1');
          assert.equal(await page.locator(`#db-panel-${panel}`).isVisible(), true, 'Intended dashboard panel is visible after data projection');
          assert.equal(await page.evaluate(() => window.obDashboardFirstPaintReady()), true);
          await page.screenshot({ path: path.join(output, `${item.slug}-${viewport.name}-dashboard-${panel}.png`) });
        }
        assert.deepEqual(errors, [], 'No uncaught dashboard startup exceptions');
        return { delayedDataProtected: true, panels: ['overview', 'live-session'], actualProductionWrites: 0 };
      });
      if (caseOnly === 'visual-startup') await runCase(`${item.slug}/${viewport.name}/visual-startup`, async () => {
        // Pause a real parser-ordered body script to observe first paint before
        // the authored application is ready, without replacing any runtime code.
        const response = await render(new URL(pageUrl(item, '/')));
        const body = response.body.slice(response.body.indexOf('<body'));
        const heldScript = body.match(/<script[^>]+src="(\/assets\/ownlybiz-public\/[^\"]+)"/)?.[1];
        assert.ok(heldScript, 'A body application script is available for delayed-load testing');
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        const hold = async route => { await gate; await route.fallback(); };
        await context.route('**' + heldScript, hold);
        const navigation = page.goto(pageUrl(item, '/'), { waitUntil: 'domcontentloaded', timeout: 30000 });
        try {
          await page.locator('#ob-public-first-paint-shell').waitFor({ state: 'attached' });
          assert.equal(await page.locator('#ob-public-first-paint-shell h1').isVisible(), false, 'No generic fallback portrait/layout during JS startup');
          assert.equal(await page.locator('.ob-first-paint-loading').count(), 0, 'No loading notification is rendered');
          await page.screenshot({ path: path.join(output, `${item.slug}-${viewport.name}-startup.png`) });
          // Observe the real bounded failure fallback; do not replace app state
          // or application timers to make the handoff pass.
          await page.locator('#ob-public-first-paint-shell h1').waitFor({ state: 'visible', timeout: 10000 });
          assert.equal(await page.locator('.ob-first-paint-loading').isVisible(), false, 'Failed startup never leaves a permanent loading screen');
        } finally { release(); }
        await navigation;
        await context.unroute('**' + heldScript, hold);
        await ready(page, item, 'home');
        assert.equal(await page.locator('#ob-public-first-paint-shell').count(), 0, 'Authored page replaces server fallback atomically');

        await page.addInitScript(() => {
          window.__startupFrames = [];
          function sample() {
            const heading = document.querySelector('#ob-public-first-paint-shell h1');
            const visible = !!(heading && heading.getClientRects().length && getComputedStyle(heading).visibility !== 'hidden' && Number(getComputedStyle(document.body).opacity) > 0);
            window.__startupFrames.push({ fallbackVisible: visible, hydrating: document.documentElement.classList.contains('ob-public-hydrating') });
            if (window.__startupFrames.length < 600) requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await ready(page, item, 'home');
        assert.equal(await page.evaluate(() => window.__startupFrames.some(frame => frame.fallbackVisible)), false, 'Refresh never paints the generic fallback');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
          page.evaluate(() => window.obClientReviewSkip()),
        ]);
        await ready(page, item, 'home');
        assert.equal(await page.evaluate(() => window.__startupFrames.some(frame => frame.fallbackVisible)), false, 'Skip-review return never paints the generic fallback');
        await page.screenshot({ path: path.join(output, `${item.slug}-${viewport.name}-returned-home.png`), fullPage: true });

        const scriptless = await contextFor({ width: viewport.width, height: viewport.height }, { javaScriptEnabled: false });
        try {
          const noScriptPage = await scriptless.newPage();
          await noScriptPage.goto(pageUrl(item, '/'), { waitUntil: 'domcontentloaded' });
          assert.equal(await noScriptPage.locator('#ob-public-first-paint-shell h1').isVisible(), true, 'Scriptless visitors retain real expert content');
          assert.equal(await noScriptPage.locator('body').evaluate(node => getComputedStyle(node).opacity), '1');
          assert.equal(await noScriptPage.locator('.ob-first-paint-loading').isVisible(), false);
        } finally { await scriptless.close(); }
        assert.deepEqual(errors, [], 'No uncaught startup exceptions');
        return { delayedStartup: true, failureFallback: true, refresh: true, skipReviewReturn: true, scriptlessContent: true, realSessionsCreated: 0 };
      });
      const routes = quick ? ['/', '/about', '/book', '/my-method'] : ['/', '/about', '/services', '/reviews', '/book', '/contact', '/my-method', '/private-guide', '/' + longCustomSlug, '/new-page'];
      if (item.marketplace) routes.push('/experts', '/experts/mini-fixture-one');
      for (const pathname of routeOnly ? routeOnly.split(',').map(route => route === 'long64' ? '/' + longCustomSlug : route) : routes) {
        const expectedPage = pathname === '/' || pathname.startsWith('/experts') ? 'home' : ['my-method', 'private-guide', longCustomSlug, 'new-page'].includes(pathname.slice(1)) ? 'ai-' + pathname.slice(1) : pathname.slice(1);
        await runCase(`${item.slug}/${viewport.name}${pathname}`, async () => {
          const beforeErrors = errors.length;
          const response = await page.goto(pageUrl(item, pathname), { waitUntil: 'domcontentloaded', timeout: 30000 });
          assert.equal(response.status(), 200);
          const initial = await response.text();
          if (!baseline) {
            assert.match(initial, /data-ob-expert-delivery="1"/);
            assert.doesNotMatch(initial, /PRIVATE-(?:LOGIN|ACCOUNT)|DRAFT-CONTENT-CANARY|PRIVATE-DRAFT-CANARY/);
          }
          await ready(page, item, expectedPage);
          const visible = await page.locator('body').innerText();
          assert.doesNotMatch(visible, forbiddenCopy);
          const expectedVisibleName = pathname === '/experts/mini-fixture-one' ? 'Robin Fixture' : item.name;
          assert.ok(visible.toLowerCase().includes(expectedVisibleName.toLowerCase()), 'Expert identity is visible');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'No document horizontal overflow');
          assert.equal(await page.locator('#view-5').isVisible(), false, 'Session UI stays hidden during public browsing');
          assert.equal(await page.locator('#ob-popup-overlay').isVisible(), false, 'Platform waitlist stays hidden');
          assert.equal(await page.locator('#ob-ops-panel').isVisible(), false, 'Platform monitor stays hidden');
          assert.deepEqual(errors.slice(beforeErrors), [], 'No uncaught browser runtime exceptions');
          const meta = await metadata(page);
          coldMetadata.set(pathname, meta);
          if (!baseline) {
            assert.equal(meta.canonical, canonicalUrl(item, pathname));
            assert.equal(meta.ogUrl, meta.canonical);
            assert.equal(meta.ogTitle, meta.title);
            const graph = meta.schema?.['@graph'];
            assert.ok(Array.isArray(graph));
            assert.equal(graph.find(node => node['@type'] === 'WebPage')?.url, meta.canonical);
            assert.ok(graph.some(node => ['Person', 'Organization'].includes(node['@type']) && node.name === item.name));
            assert.equal(graph.some(node => node['@type'] === 'SoftwareApplication'), false);
            const initialTitle = initial.match(/<title>([^<]*)<\/title>/i)?.[1];
            assert.equal(meta.title, initialTitle, 'Hydration retains server page title');
          }
          const screenshot = `${item.slug}-${viewport.name}-${pathname.replace(/\//g, '') || 'home'}.png`;
          await page.screenshot({ path: path.join(output, screenshot), fullPage: true });
          return { title: await page.title(), screenshot, page: expectedPage, metadata: meta };
        });
      }
      if (item.marketplace && !routeOnly) await runCase(`${item.slug}/${viewport.name}/marketplace-profile-navigation`, async () => {
        await page.goto(pageUrl(item, '/'), { waitUntil: 'domcontentloaded' });
        await ready(page, item, 'home');
        await page.locator('#ob-marketplace-home button[aria-label="Open Robin Fixture"]').click();
        await page.locator('#ob-marketplace-home .ob-mp-profile').waitFor({ state: 'visible' });
        assert.equal(new URL(page.url()).pathname, '/experts/mini-fixture-one');
        assert.equal(await page.title(), 'Robin Fixture | Orion Fixture');
        assert.equal((await metadata(page)).canonical, `https://${item.host}/experts/mini-fixture-one`);
        for (const channel of ['chat', 'voice', 'video']) {
          await page.locator('#ob-marketplace-home [onclick*="obMarketplaceStartMini"]').filter({ hasText: new RegExp(channel === 'voice' ? 'Voice call' : channel, 'i') }).first().click();
          await page.locator('#booking-overlay').waitFor({ state: 'visible' });
          assert.ok((await page.locator('#bov-channel-name').innerText()).includes('Robin Fixture'));
          await page.locator('#booking-overlay button[onclick*="closeBookingOverlay"]').first().click();
          await page.locator('#booking-overlay').waitFor({ state: 'hidden' });
        }
        await page.locator('#ob-marketplace-home [onclick="obMarketplaceBackToGrid()"]:visible').first().click();
        await page.locator('#ob-marketplace-home button[aria-label="Open Alex Fixture"]').waitFor({ state: 'visible' });
        assert.equal(await page.title(), 'Orion Fixture - Independent specialists');
        assert.equal((await metadata(page)).canonical, `https://${item.host}/`);
        return { members: 2, profileNavigation: true, memberBookingChannels: 3, paymentConfirmed: false };
      });
      if (!item.marketplace && !routeOnly) {
        if (!baseline) await runCase(`${item.slug}/${viewport.name}/navigation-metadata`, async () => {
          await page.goto(pageUrl(item, '/'), { waitUntil: 'domcontentloaded' });
          await ready(page, item, 'home');
          assert.deepEqual(await metadata(page), coldMetadata.get('/'), 'Home cold/navigation metadata parity');
          if (viewport.name === 'mobile') await page.locator('#expert-hamburger').click();
          await page.locator('#expert-site-links a[data-ai-page-link="my-method"]').click();
          await ready(page, item, 'ai-my-method');
          assert.equal(new URL(page.url()).pathname, (item.basePath || '') + '/my-method');
          assert.deepEqual(await metadata(page), coldMetadata.get('/my-method'), 'Custom cold/navigation metadata parity');
          if (viewport.name === 'mobile') await page.locator('#expert-hamburger').click();
          await page.locator('#expert-site-links a[data-ob-expert-page="about"]').click();
          await ready(page, item, 'about');
          assert.equal(new URL(page.url()).pathname, (item.basePath || '') + '/about');
          assert.deepEqual(await metadata(page), coldMetadata.get('/about'), 'About cold/navigation metadata parity');
          await page.goBack();
          await ready(page, item, 'ai-my-method');
          assert.equal(new URL(page.url()).pathname, (item.basePath || '') + '/my-method');
          assert.deepEqual(await metadata(page), coldMetadata.get('/my-method'), 'Back restores custom metadata');
          return { historyBack: true, titlesCanonicalSchema: true };
        });
        await runCase(`${item.slug}/${viewport.name}/navigation-and-auth`, async () => {
          await page.goto(pageUrl(item, '/'), { waitUntil: 'domcontentloaded' });
          await ready(page, item, 'home');
          if (viewport.name === 'mobile') await page.locator('#expert-hamburger').click();
          await page.locator('#expert-site-links a[data-ob-expert-page="about"]').click();
          await page.waitForFunction(() => document.querySelector('#ep-about.active'));
          if (viewport.name === 'mobile') assert.equal(await page.locator('#expert-site-links').evaluate(node => node.classList.contains('mobile-open')), false, 'Mobile menu closes after navigation');
          await page.locator('#client-nav-login-btn').click();
          await page.locator('#client-login-modal').waitFor({ state: 'visible' });
          await page.locator('#clm-tab-signup').click();
          await page.locator('#clm-signup-fields').waitFor({ state: 'visible' });
          await page.locator('#clm-tab-login').click();
          await page.locator('#clm-login-email').fill(client.email);
          await page.locator('#clm-login-pass').fill('FixtureOnlyPassword123!');
          await page.locator('#clm-login-fields button[onclick="clientLoginFromModal()"]:visible').click();
          await page.locator('#client-login-modal').waitFor({ state: 'hidden' });
          await page.locator('#client-nav-avatar').click();
          await page.locator('#client-nav-dropdown').waitFor({ state: 'visible' });
          await page.evaluate(() => {
            window.__fixtureAccountTrace = [];
            const original = window.showExpertPage;
            window.showExpertPage = function (...args) {
              const trace = { args, before: document.querySelector('.expert-page.active')?.id, time: performance.now(), url: location.href, stack: new Error().stack };
              window.__fixtureAccountTrace.push(trace);
              try { return original.apply(this, args); }
              finally { trace.after = document.querySelector('.expert-page.active')?.id; }
            };
            document.addEventListener('click', event => {
              if (event.target.closest('#client-nav-dropdown')) window.__fixtureAccountTrace.push({ click: event.target.outerHTML, defaultPrevented: event.defaultPrevented, time: performance.now() });
            }, true);
          });
          await page.locator('#client-nav-dropdown').getByText('My Bookings', { exact: true }).click();
          await page.locator('#ep-account').waitFor({ state: 'visible' });
          await page.waitForTimeout(4000);
          assert.equal(await page.locator('#ep-account').isVisible(), true, 'Account survives background route reconciliation');
          if (await page.locator('#client-nav-dropdown').isVisible()) await page.locator('#client-nav-avatar').click();
          for (const tab of ['sessions', 'readings', 'credit', 'bookings']) {
            await page.locator(`#client-${tab}-tab`).click();
            await page.locator(`#client-${tab}-list`).waitFor({ state: 'visible' });
          }
          await page.screenshot({ path: path.join(output, `${item.slug}-${viewport.name}-account.png`), fullPage: true });
          return { fixtureAuth: true, accountTabs: 4 };
        });
        await runCase(`${item.slug}/${viewport.name}/booking-channels`, async () => {
          // Clear fixture auth to exercise account entry, without confirming a payment.
          await context.clearCookies();
          if (page.url() !== 'about:blank') await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
          await page.goto(pageUrl(item, '/book'), { waitUntil: 'domcontentloaded' });
          await ready(page, item, 'book');
          const channels = [];
          for (const channel of ['chat', 'voice', 'video']) {
            const selector = page.locator(`#stype-grid [data-ob-channel="${channel}"] .ob-live-start`).first();
            if (await selector.count()) await selector.click();
            else await page.locator('#stype-grid .stype-btn').filter({ hasText: new RegExp(channel, 'i') }).first().click();
            if (!await page.locator('#booking-overlay').isVisible() && await page.locator('#confirm-booking-btn').isVisible()) await page.locator('#confirm-booking-btn').click();
            await page.locator('#booking-overlay').waitFor({ state: 'visible' });
            assert.match(await page.locator('#bov-channel-name').innerText(), new RegExp(channel, 'i'));
            assert.ok((await page.locator('#bov-channel-name').innerText()).includes(item.name));
            const rate = Number(item.expert[`rate_${channel}`]).toFixed(2);
            assert.ok((await page.locator('#bov-channel-detail').innerText()).includes(rate), 'Real fixture rate replaces demo values');
            channels.push(channel);
            await page.locator('#booking-overlay button[onclick*="closeBookingOverlay"]').first().click();
            await page.locator('#booking-overlay').waitFor({ state: 'hidden' });
          }
          const later = page.locator('#ob-book-later-selector-row');
          await later.click();
          await page.locator('#bfl-overlay').waitFor({ state: 'visible' });
          // Existing availability initialization reselects its default through
          // 700ms. Verify the initialized user flow separately from that known
          // fast-interaction timing probe; never modify billing/session code.
          await page.waitForTimeout(800);
          const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          await page.locator('#bfl-date').fill(date);
          await page.locator('#bfl-date').dispatchEvent('change');
          await page.locator('#bfl-slots-grid .bfl-slot-btn').first().click();
          await page.locator('#bfl-next-1').click();
          await page.locator('#bfl-step-2').waitFor({ state: 'visible' });
          await page.locator('#bfl-step-2 [data-ch="video"]').click();
          await page.locator('#bfl-notes').fill('Offline fixture note: prepare one question.');
          await page.locator('#bfl-step-2 button[onclick="bflGoStep(3)"]').click();
          await page.locator('#bfl-step-3').waitFor({ state: 'visible' });
          assert.match(await page.locator('#bfl-sum-type').innerText(), /video/i);
          await page.locator('#bfl-tab-login').click();
          await page.locator('#bfl-login-fields').waitFor({ state: 'visible' });
          await page.locator('#bfl-tab-signup').click();
          await page.locator('#bfl-signup-fields').waitFor({ state: 'visible' });
          await page.screenshot({ path: path.join(output, `${item.slug}-${viewport.name}-scheduled-booking.png`), fullPage: true });
          return { channels, scheduledDateSlotChannelAndAuthEntry: true, paymentConfirmed: false, realSessionCreated: false };
        });
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  const changedSources = Object.entries(sourceHashes).filter(([file, digest]) => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') !== digest).map(([file]) => file);
  if (changedSources.length) records.failures.push({ name: 'immutable-build-snapshot', error: 'Source files changed during browser verification.', changedSources });
  const report = { mode: baseline ? 'baseline' : 'candidate', baselineRef: baseline ? baselineRef : undefined, createdAt: new Date().toISOString(), output, sourceHashes, networkPolicy: 'Every application HTTP request intercepted; every WebSocket closed; no passthrough; browser uses nonresolving DNS and a disabled loopback proxy.', ...records };
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: records.failures.length || records.forbiddenWrites.length ? 'FAIL' : 'PASS', output, cases: records.cases.length, failures: records.failures.length, forbiddenWrites: records.forbiddenWrites.length, simulatedWrites: records.simulatedWrites.length, applicationNetworkPassthrough: 0 }));
  if (records.failures.length || records.forbiddenWrites.length) process.exitCode = 1;
}
