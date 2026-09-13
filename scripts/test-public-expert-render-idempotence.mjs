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

function extractAfter(anchor, startMarker, endMarker) {
  const anchorAt = source.indexOf(anchor);
  const start = source.indexOf(startMarker, anchorAt);
  const end = source.indexOf(endMarker, start);
  assert(anchorAt >= 0 && start >= anchorAt && end > start, `Missing anchored source range: ${anchor}`);
  return source.slice(start, end + (endMarker.startsWith('\n}') ? 2 : 0));
}

const viewHtml = extract('<div class="view-panel" id="view-4">', '\n</div><!-- end view-4 -->');
const refreshSource = extract('function _refreshPublicPage(e) {', '\n}\n\n// --- Hook _refreshPublicPage');
const applySource = extract('window._applyExpertWebsite = function _applyExpertWebsite(data) {', '\n}\n\n// Wire into dbNav');
const onlineSource = extractAfter('// === OWNLYBIZ OVERRIDES v12 ===', 'function _applyOnlineUI(on) {', '\n}\n\n// 15-second live poll');
const refreshWrapperStart = source.indexOf('(function(){\n  var _origRPP = window._refreshPublicPage;');
const refreshWrapperClose = source.indexOf('\n})();', refreshWrapperStart);
assert(refreshWrapperStart >= 0 && refreshWrapperClose > refreshWrapperStart, 'Missing outer public refresh wrapper');
const refreshWrapperSource = source.slice(refreshWrapperStart, refreshWrapperClose + '\n})();'.length);

const browser = await chromium.launch({
  headless: true,
  ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}),
});

try {
  const context = await browser.newContext({ offline: true });
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  await page.setContent(`<!doctype html><html><head><link id="ob-dynamic-favicon" rel="icon"></head><body>${viewHtml}</body></html>`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const view = document.getElementById('view-4');
    const packageSection = document.createElement('section');
    packageSection.className = 'packages-section';
    packageSection.textContent = 'Packages';
    view.appendChild(packageSection);
    const emailLink = document.createElement('a');
    emailLink.className = 'contact-email-display';
    view.appendChild(emailLink);
    const avatar = document.createElement('img');
    avatar.className = 'ep-avatar';
    view.appendChild(avatar);

    window.OB_RATE_POLICY = {
      ownerRate(expert, channel) {
        const value = expert[`rate_${channel}`] ?? expert[`${channel}_pm`] ?? 0;
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
      },
    };
    window.obMinuteText = (value, suffix = '') => `${Number(value)} min${suffix ? ` ${suffix}` : ''}`;
    window._fmtRate = value => `$${Number(value || 0).toFixed(2)}/min`;
    window.obPublicExpertImageUrl = value => String(value || '').trim();
    window.obSetPublicExpertImage = (img, value, _placeholder, options = {}) => {
      const src = window.obPublicExpertImageUrl(value);
      if (src) {
        img.setAttribute('src', src);
        img.style.display = 'block';
        if (options.hideParentWhenMissing && img.parentElement) img.parentElement.style.display = '';
        return true;
      }
      img.removeAttribute('src');
      img.style.display = 'none';
      if (options.hideParentWhenMissing && img.parentElement) img.parentElement.style.display = 'none';
      return false;
    };
    window.obSetExpertFavicon = value => document.getElementById('ob-dynamic-favicon').setAttribute('href', value);
    window.obResetPlatformFavicon = () => document.getElementById('ob-dynamic-favicon').removeAttribute('href');
    window.showExpertPage = name => {
      document.querySelectorAll('#view-4 .expert-page').forEach(node => node.classList.toggle('active', node.id === `ep-${name}`));
    };
    window.obPublicApplyAccepted = () => true;
    window.obSetPayPerMinuteDisclosure = (element, name) => { element.textContent = `Payment for ${name}`; };
  });
  await page.addScriptTag({ content: `${refreshSource}\n${applySource}\n${onlineSource}\n${refreshWrapperSource}` });

  const applyChain = payload => page.evaluate(expert => {
    window._applyExpertWebsite(expert);
    window._refreshPublicPage(expert);
  }, payload);
  const snapshot = () => page.locator('#view-4').evaluate(view => view.outerHTML);

  const fullA = {
    slug: 'alpha',
    name: 'Alpha Expert',
    title: 'A_SECRET_TITLE',
    bio: 'A_SECRET_BIO',
    hero_tagline: 'A_SECRET_TAGLINE',
    about_text: 'A_SECRET_ABOUT_ONE\n\nA_SECRET_ABOUT_TWO',
    footer_text: 'A_SECRET_FOOTER',
    credentials: [{ icon: 'A', text: 'A_SECRET_CREDENTIAL' }],
    rate_chat: 3.5,
    rate_voice: 4.5,
    rate_video: 6,
    free_minutes: 7,
    avg_rating: '0',
    review_count: 0,
    packages: [],
    theme_color: '#123456',
    website_content: {
      hero_cta: 'A_SECRET_CTA',
      about_title: 'A_SECRET_ABOUT_TITLE',
      footer_disclaimer: 'A_SECRET_LEGAL',
      contact_heading: 'A_SECRET_CONTACT_HEAD',
      contact_desc: 'A_SECRET_CONTACT_DESC',
      contact_location: 'A_SECRET_LOCATION',
      contact_hours: 'A_SECRET_HOURS',
      contact_response: 'A_SECRET_RESPONSE',
      contact_email: 'alpha@example.test',
      svc_title: 'A_SECRET_SERVICES',
      svc_subtitle: 'A_SECRET_SERVICES_SUB',
      svc_chat_desc: 'A_SECRET_CHAT_DESC',
      svc_voice_desc: 'A_SECRET_VOICE_DESC',
      svc_video_desc: 'A_SECRET_VIDEO_DESC',
      profile_image: 'https://images.example.test/a-secret-photo.png',
      logo_image: 'https://images.example.test/a-secret-logo.png',
      favicon_image: 'https://images.example.test/a-secret-favicon.png',
      nav_labels: { about: 'A_SECRET_NAV' },
      pages: { contact: false },
    },
  };
  const minimalB = {
    slug: 'beta',
    name: 'Beta Expert',
    title: '',
    bio: '',
    hero_tagline: '',
    about_text: '',
    footer_text: '',
    credentials: [],
    rate_chat: 1,
    rate_voice: 2,
    rate_video: 3,
    free_minutes: 0,
    avg_rating: '4.8',
    review_count: 3,
    packages: [{}],
    website_content: {},
  };

  await applyChain(fullA);
  assert.equal(await page.locator('.no-reviews-msg').count(), 1, 'zero-review state should render once');
  await applyChain(minimalB);
  const afterB = await snapshot();
  assert(!afterB.includes('A_SECRET_'), 'A-owned text must not survive an A→B render');
  assert(!afterB.includes('a-secret-'), 'A-owned image URLs must not survive an A→B render');
  assert.equal(await page.locator('.expert-about-strip').evaluate(el => el.style.display), 'none');
  assert.equal(await page.locator('#ew-about-bio').evaluate(el => el.children.length), 0);
  assert.equal(await page.locator('#ew-contact-location-row').evaluate(el => el.style.display), 'none');
  assert.equal(await page.locator('#ew-contact-email-row').evaluate(el => el.style.display), 'none');
  assert.equal(await page.locator('.contact-email-display').getAttribute('href'), null);
  assert.equal(await page.locator('#nav-logo-img').evaluate(el => el.style.display), 'none');
  assert.equal(await page.locator('#expert-photo-img').getAttribute('src'), null);
  assert.equal(await page.locator('#ob-dynamic-favicon').getAttribute('href'), null);
  assert.equal(await page.locator('#view-4').evaluate(el => el.style.getPropertyValue('--terra')), '');
  assert.equal(await page.locator('#expert-site-links a[data-ob-expert-page="contact"]').evaluate(el => el.parentElement.style.display), '');
  assert.equal(await page.locator('.packages-section').evaluate(el => el.style.display), '');
  assert.equal(await page.locator('.no-reviews-msg').count(), 0, 'review recovery must remove the empty state');
  assert.equal(await page.locator('.ew-free-desc').count(), 1, 'chat free-minutes node must remain addressable');
  assert.equal(await page.locator('.ew-free-desc').evaluate(el => el.style.display), 'none');
  assert.equal(await page.locator('#expert-site-links a[data-ob-expert-page="about"]').textContent(), 'About');
  assert.equal(await page.locator('#hero-status-text').count(), 1, 'online refresh must preserve status child DOM');
  assert.equal(await page.locator('.hero-review-count').count(), 1, 'rating refresh must preserve review-count child DOM');
  await applyChain(minimalB);
  assert.equal(await snapshot(), afterB, 'reapplying one payload must be byte-for-byte idempotent');

  await page.evaluate(() => { _applyOnlineUI(true);_applyOnlineUI(false);_applyOnlineUI(true); });
  assert.equal(await page.locator('#hero-status-text').count(), 1, 'online status transitions must preserve status text DOM');
  assert.equal(await page.locator('#hero-status-badge > div').count(), 1, 'online status transitions must preserve status dot DOM');
  await applyChain(minimalB);

  const beforeRejectedRefresh=await snapshot();
  await page.evaluate(stale => {
    window.obPublicApplyAccepted=expert => expert.slug === 'beta';
    window._refreshPublicPage(stale);
  }, fullA);
  assert.equal(await snapshot(), beforeRejectedRefresh, 'a rejected stale refresh must not repaint booking or public DOM');
  await page.evaluate(() => { window.obPublicApplyAccepted=() => true; });

  const fullC = structuredClone(fullA);
  fullC.slug = 'charlie';
  fullC.name = 'Charlie Expert';
  fullC.title = 'C_TITLE';
  fullC.bio = 'C_BIO';
  fullC.hero_tagline = 'C_TAGLINE';
  fullC.about_text = 'C_ABOUT';
  fullC.credentials = [{ icon: 'C', text: 'C_CREDENTIAL' }];
  fullC.review_count = 0;
  fullC.packages = [];
  fullC.website_content = {
    ...fullC.website_content,
    contact_location: 'C_LOCATION',
    contact_hours: 'C_HOURS',
    contact_response: 'C_RESPONSE',
    contact_email: 'charlie@example.test',
    logo_image: 'https://images.example.test/c-logo.png',
    profile_image: 'https://images.example.test/c-photo.png',
    favicon_image: 'https://images.example.test/c-favicon.png',
    footer_disclaimer: 'C_LEGAL',
    nav_labels: { about: 'C_ABOUT_NAV' },
    pages: { reviews: false },
  };
  await applyChain(fullC);
  assert.equal(await page.locator('.expert-about-strip').evaluate(el => el.style.display), '');
  assert.equal(await page.locator('#ew-contact-location-row').evaluate(el => el.style.display), '');
  assert.equal(await page.locator('#ew-contact-email-row').evaluate(el => el.style.display), '');
  assert.equal(await page.locator('.contact-email-display').getAttribute('href'), 'mailto:charlie@example.test');
  assert.equal(await page.locator('#nav-logo-img').evaluate(el => el.style.display), '');
  assert.equal(await page.locator('#expert-photo-img').getAttribute('src'), 'https://images.example.test/c-photo.png');
  assert.equal(await page.locator('#ob-dynamic-favicon').getAttribute('href'), 'https://images.example.test/c-favicon.png');
  assert.equal(await page.locator('#view-4').evaluate(el => el.style.getPropertyValue('--terra')), '#123456');
  assert.equal(await page.locator('#expert-site-links a[data-ob-expert-page="reviews"]').evaluate(el => el.parentElement.style.display), 'none');
  assert.equal(await page.locator('.packages-section').evaluate(el => el.style.display), 'none');
  assert.equal(await page.locator('.no-reviews-msg').count(), 1);
  assert.deepEqual(await page.locator('.ew-free-desc').evaluate(el => ({ display: el.style.display, text: el.textContent })), { display: '', text: 'First 7 min apply on the first eligible started session.' });

  const clearedC = { ...minimalB, slug: 'charlie', name: 'Charlie Expert' };
  await applyChain(clearedC);
  const afterClear = await snapshot();
  assert(!afterClear.includes('C_'), 'clearing the same expert must remove its former optional fields');
  assert(!afterClear.includes('c-logo') && !afterClear.includes('c-photo'), 'clearing the same expert must remove its former assets');
  assert.equal(await page.locator('#expert-site-links a[data-ob-expert-page="reviews"]').evaluate(el => el.parentElement.style.display), '');
  assert.equal(await page.locator('.ew-free-desc').evaluate(el => el.style.display), 'none');

  console.log(JSON.stringify({ status: 'PASS', transitions: ['full A → minimal B', 'minimal B → full C', 'full C → cleared C', 'B reapplied idempotently'], network: 'offline and all requests aborted' }));
} finally {
  await browser.close();
}
