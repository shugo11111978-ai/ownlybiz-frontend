import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');
const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `Missing source range: ${startMarker}`);
  return source.slice(start, end + (endMarker.startsWith('\n}') ? 2 : 0));
}

function scriptById(id) {
  const match = source.match(new RegExp(`<script id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert(match, `Missing script: ${id}`);
  return match[1];
}

const viewHtml = extract('<div class="view-panel" id="view-4">', '\n</div><!-- end view-4 -->');
const canonicalApply = extract('var obPublicRenderLifecycle = { generation:0, current:null };', '\n}\nfunction obPublicLoaderApiBase');
const bookingSelector = scriptById('ob-expert-booking-selector-20260608-js');
const publicGate = scriptById('ownlybiz-expert-funnel-high-risk-20260610');
const marketplace = scriptById('ob-marketplace-mode-20260618');

const browser = await chromium.launch({
  headless: true,
  ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}),
});

try {
  const context = await browser.newContext();
  await context.route('**/*', route => {
    if (route.request().isNavigationRequest() && route.request().url() === 'http://localhost/') {
      return route.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><html><head></head><body>${viewHtml}</body></html>` });
    }
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto('http://localhost/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.getElementById('view-4').classList.add('active');
    window.__OB_TEST_HOOKS__ = {};
    window.obIsPlatformRouteRoot = value => ['dash', 'admin', 'terms', 'privacy'].includes(String(value || '').toLowerCase());
    window.OB_RATE_POLICY = {
      ownerRate(expert, channel) {
        return Number(expert[`rate_${channel}`] ?? expert[`${channel}_pm`] ?? 0) || 0;
      },
      marketplaceRate(owner, mini, channel) {
        return Number(mini?.[`${channel}_pm`] ?? mini?.[`rate_${channel}`] ?? owner?.[`rate_${channel}`] ?? 0) || 0;
      },
      explicit(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
      },
      channelCanStart(expert, channel) {
        return Number(expert?.[`rate_${channel}`] ?? expert?.[`${channel}_pm`] ?? 0) > 0;
      },
      hasStartableMinuteChannel(expert) {
        return ['chat', 'voice', 'video'].some(channel => {
          const enabled = expert?.[`${channel}_enabled`];
          return enabled !== false && enabled !== 0 && enabled !== '0' && Number(expert?.[`rate_${channel}`] ?? expert?.[`${channel}_pm`] ?? 0) > 0;
        });
      },
      paymentAccountReady() { return true; },
    };
    window.obMinuteText = (value, suffix = '') => `${Number(value)} min${suffix ? ` ${suffix}` : ''}`;
    window.setExpertOnlineStatus = () => {};
    window._markRouteReady = () => {};
    window._refreshPublicPage = () => {};
    window.showExpertPage = pageName => {
      document.querySelectorAll('#view-4 .expert-page').forEach(panel => panel.classList.toggle('active', panel.id === `ep-${pageName}`));
      window._currentEpPage = pageName;
    };
    window._applyExpertWebsite = data => {
      const expert = data?.expert || data || {};
      const content = typeof expert.website_content === 'string' ? JSON.parse(expert.website_content || '{}') : (expert.website_content || {});
      const labels = content.nav_labels || {};
      const pages = content.pages || {};
      document.querySelectorAll('#expert-site-links [data-ai-page-link]').forEach(link => link.closest('li')?.remove());
      document.querySelectorAll('#expert-site-links a[data-ob-expert-page]').forEach(link => {
        const key = link.getAttribute('data-ob-expert-page');
        link.textContent = labels[key] || ({ home: 'Home', about: 'About', services: 'Services', reviews: 'Reviews', book: 'Book a Session', contact: 'Contact' }[key] || key);
        if (link.parentElement) link.parentElement.style.display = pages[key] === false ? 'none' : '';
      });
      for (const custom of content.ai_pages || []) {
        if (!custom?.slug || custom.show_in_nav === false || custom.published === false) continue;
        const li = document.createElement('li');
        li.innerHTML = `<a data-ai-page-link="1" data-ob-expert-page="ai-${custom.slug}" href="#">${custom.nav_label || custom.title || custom.slug}</a>`;
        document.getElementById('expert-site-links').appendChild(li);
      }
      const serviceTitle = document.querySelector('#ep-services h1');
      if (serviceTitle) serviceTitle.textContent = content.svc_title || 'Services & Rates';
      const serviceSub = document.querySelector('#ep-services .services-full-sub');
      if (serviceSub) serviceSub.textContent = content.svc_subtitle || '';
      const aboutTitle = document.getElementById('ew-about-title');
      if (aboutTitle) aboutTitle.textContent = content.about_title || `About ${expert.name || 'this Expert'}`;
      const aboutSubtitle = document.getElementById('ew-about-subtitle');
      if (aboutSubtitle) aboutSubtitle.textContent = content.about_subtitle || '';
      const contactTitle = document.querySelector('#ep-contact h1');
      if (contactTitle) contactTitle.textContent = content.contact_heading || 'Get In Touch';
      document.querySelectorAll('#ep-services .service-big-card .btn').forEach((button, index) => {
        button.textContent = ['Start Chat', 'Call Now', 'Start Video', 'Book a Session'][index] || 'Start';
      });
    };
    window.openBookingOverlay = () => { window.__overlayOpenCount = (window.__overlayOpenCount || 0) + 1; };
    window.startLiveNow = window.openBookingOverlay;
    window.openBookLaterModal = () => { window.__bookLaterOpenCount = (window.__bookLaterOpenCount || 0) + 1; };
    window.selectStype = () => {};
  });
  await page.addScriptTag({ content: `${canonicalApply}\n${bookingSelector}\n${publicGate}\n${marketplace}` });
  await page.evaluate(() => { window.obPublicApplyAccepted = () => true; });

  const marketplaceA = {
    slug: 'alpha', name: 'Alpha Practice', rate_chat: 3, rate_voice: 4, rate_video: 5,
    chat_enabled: true, voice_enabled: true, video_enabled: true,
    website_content: {
      nav_labels: { services: 'Ways to connect' },
      svc_title: 'Alpha offerings',
      svc_subtitle: 'Private support from Alpha.',
      about_title: 'About Alpha Practice',
      ai_pages: [{ slug: 'alpha-guide', title: 'Alpha guide', nav_label: 'Alpha guide', published: true, show_in_nav: true }],
    },
    marketplace_public: {
      enabled: true,
      settings: { public_label: 'Meet the team', intro_text: 'Choose the right guide.' },
      experts: [
        { id: 'a1', display_name: 'A One', status: 'active', is_online: true, chat_enabled: true, voice_enabled: true, video_enabled: true, chat_pm: 3 },
        { id: 'a2', display_name: 'A Two', status: 'active', is_online: true, chat_enabled: true, voice_enabled: true, video_enabled: true, chat_pm: 4 },
      ],
    },
  };
  const plainB = {
    slug: 'beta', name: 'Beta Expert', rate_chat: 2, rate_voice: 3, rate_video: 4,
    chat_enabled: true, voice_enabled: true, video_enabled: true,
    website_content: {
      nav_labels: { services: 'Beta services', book: 'Talk to Beta' },
      ai_pages: [{ slug: 'beta-method', title: 'Beta method', nav_label: 'Beta method', published: true, show_in_nav: true }],
    },
  };

  await page.evaluate(payload => {
    window._browseExpert = payload.slug;
    window.obBeginPublicMarketplaceLoad(payload.slug);
    window.obApplyPublicExpertPayload(payload, payload.slug, {});
  }, marketplaceA);
  assert.equal(await page.locator('#view-4').evaluate(node => node.classList.contains('ob-mp-site-mode')), true);
  assert.equal(await page.locator('#ob-marketplace-home').count(), 1);
  assert.match(await page.locator('#expert-site-links').innerHTML(), /obMarketplaceNav/);
  assert.equal(await page.locator('#ep-services .service-big-card .btn').first().textContent(), 'View experts');

  await page.evaluate(payload => {
    window._browseExpert = payload.slug;
    window.obBeginPublicMarketplaceLoad(payload.slug);
    window.obApplyPublicExpertPayload(payload, payload.slug, {});
  }, plainB);
  const plainNav = await page.locator('#expert-site-links').innerHTML();
  assert(!plainNav.includes('obMarketplaceNav'), 'plain owner must not retain marketplace navigation handlers');
  assert.match(plainNav, /Beta services/);
  assert.match(plainNav, /Talk to Beta/);
  assert.match(plainNav, /Beta method/);
  assert(!plainNav.includes('Alpha guide'));
  assert.equal(await page.locator('#view-4').evaluate(node => node.classList.contains('ob-mp-site-mode')), false);
  assert.equal(await page.locator('#ob-marketplace-home').count(), 0);
  assert.equal(await page.locator('#ob-marketplace-picker').count(), 0);
  assert.equal(await page.locator('#ep-services .service-big-card .btn').first().textContent(), 'Start Chat');
  assert.deepEqual(await page.evaluate(() => ({ selected: window._selectedMarketplaceExpertId, selectedExpert: window._selectedMarketplaceExpert })), { selected: '', selectedExpert: null });

  await page.evaluate(payload => {
    window._browseExpert = payload.slug;
    window.obBeginPublicMarketplaceLoad(payload.slug);
    window.obApplyPublicExpertPayload(payload, payload.slug, {});
    window.obMarketplaceStartMini('a1', 'chat');
  }, marketplaceA);
  await page.evaluate(payload => {
    window._browseExpert = payload.slug;
    window.obBeginPublicMarketplaceLoad(payload.slug);
    window.obApplyPublicExpertPayload(payload, payload.slug, {});
  }, plainB);
  await page.waitForTimeout(90);
  assert.equal(await page.evaluate(() => window.__overlayOpenCount || 0), 0, 'an A action timer must not open over B');

  const disabledA = structuredClone(marketplaceA);
  disabledA.marketplace_public = { enabled: false, settings: { public_label: 'Disabled' }, experts: marketplaceA.marketplace_public.experts };
  await page.evaluate(payload => {
    window._browseExpert = payload.slug;
    window.obBeginPublicMarketplaceLoad(payload.slug);
    window.obApplyPublicExpertPayload(payload, payload.slug, {});
  }, marketplaceA);
  await page.evaluate(payload => window.obApplyPublicExpertPayload(payload, payload.slug, {}), disabledA);
  assert.equal(await page.locator('#ob-marketplace-home').count(), 0, 'same-owner enabled→disabled must remove marketplace home');
  assert(!await page.locator('#expert-site-links').innerHTML().then(html => html.includes('obMarketplaceNav')));
  assert.equal(await page.locator('#ep-services h1').textContent(), 'Alpha offerings');
  assert.equal(await page.locator('#ep-services .services-full-sub').textContent(), 'Private support from Alpha.');
  assert.equal(await page.locator('#ew-about-title').textContent(), 'About Alpha Practice');

  const blocked = { ...plainB, slug: 'blocked', name: 'Blocked Expert', service_pause: { blocked: true, message: 'Paused for testing.' } };
  await page.evaluate(payload => {
    window._browseExpert = payload.slug;
    window.obBeginPublicMarketplaceLoad(payload.slug);
    window.obApplyPublicExpertPayload(payload, payload.slug, {});
  }, blocked);
  assert.equal(await page.locator('#ob-book-unavailable-card').count(), 1);
  await page.evaluate(payload => {
    window._browseExpert = payload.slug;
    window.obBeginPublicMarketplaceLoad(payload.slug);
    window.obApplyPublicExpertPayload(payload, payload.slug, {});
  }, plainB);
  assert.equal(await page.locator('#booking-main-layout #stype-grid').count(), 1, 'blocked→eligible must restore the canonical booking layout');
  assert.equal(await page.locator('#booking-main-layout').getAttribute('data-ob-booking-blocked'), null);

  await page.evaluate(() => {
    window.__realUnavailableRenderer = window.obRenderPublicBookUnavailable;
    window.obRenderPublicBookUnavailable = () => false;
    document.getElementById('ew-hero-cta').textContent = 'Start Session Now';
    window.__heroCtaBeforeBlock = document.getElementById('hero-primary-btn').innerHTML;
  });
  await page.evaluate(payload => window._applyExpertWebsite(payload), blocked);
  assert.equal(await page.locator('#hero-primary-btn #ew-hero-cta').count(), 0, 'fallback setup must exercise nested CTA replacement');
  await page.evaluate(payload => window._applyExpertWebsite(payload), plainB);
  assert.equal(await page.locator('#hero-primary-btn').innerHTML(), await page.evaluate(() => window.__heroCtaBeforeBlock), 'fallback clear must restore nested CTA DOM exactly');
  assert.equal(await page.locator('#expert-site-links a[data-ob-expert-page="book"]').evaluate(link => link.style.display), '');

  console.log(JSON.stringify({
    status: 'PASS',
    transitions: ['marketplace A → plain B', 'marketplace action A → B before timer', 'same-owner enabled → disabled', 'booking blocked → eligible', 'fallback nested CTA restore'],
    network: 'offline and all requests aborted',
  }));
} finally {
  await browser.close();
}
