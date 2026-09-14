import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');
const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function sourceRange(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `Missing source range: ${startMarker}`);
  return source.slice(start, end);
}

const mediaRuntime = sourceRange(
  'window.obPublicExpertBrokenMediaUrls = window.obPublicExpertBrokenMediaUrls || {};',
  '\n\nwindow._applyExpertWebsite = function _applyExpertWebsite(data) {',
);
const publicView = sourceRange(
  '<div class="view-panel" id="view-4">',
  '\n</div><!-- end view-4 -->',
);
const styles = [...source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)]
  .map(match => match[1])
  .join('\n');

const runtimeSandbox = { URL };
runtimeSandbox.window = runtimeSandbox;
vm.createContext(runtimeSandbox);
new vm.Script(mediaRuntime, { filename: 'public-media-runtime.js' }).runInContext(runtimeSandbox);

const productionPhoto = 'https://ownlybiz.com/api/media/website/expert-profile.webp';
assert.equal(
  runtimeSandbox.obPublicExpertImageUrl(productionPhoto),
  '/api/media/website/expert-profile.webp',
  'canonical Ownlybiz website media uses the active expert-site origin',
);
assert.equal(
  runtimeSandbox.obPublicExpertImageUrl('https://www.ownlybiz.com/api/media/website/expert-logo.png?version=2'),
  '/api/media/website/expert-logo.png?version=2',
  'www canonical media keeps its cache query while becoming same-origin',
);
assert.equal(
  runtimeSandbox.obPublicExpertImageUrl('https://cdn.example.test/expert-profile.webp'),
  'https://cdn.example.test/expert-profile.webp',
  'external HTTPS media remains on its authored host',
);
assert.equal(
  runtimeSandbox.obPublicExpertImageUrl('https://ownlybiz.com/about/team.webp'),
  'https://ownlybiz.com/about/team.webp',
  'ordinary Ownlybiz URLs are not rewritten as website media',
);
assert.equal(runtimeSandbox.obPublicExpertImageUrl('//example.test/image.webp'), '', 'scheme-relative host escapes are rejected');
assert.equal(runtimeSandbox.obPublicExpertImageUrl('javascript:alert(1)'), '', 'non-image script schemes are rejected');

const browser = await chromium.launch({
  headless: true,
  ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}),
});

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const requests = [];
  await context.route('**/*', route => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    requests.push(request.url());
    if (request.isNavigationRequest() && requestUrl.hostname === 'luna.example.test') {
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!doctype html><html><head><style>${styles}</style></head><body>${publicView}</body></html>`,
      });
    }
    if (requestUrl.hostname === 'luna.example.test' && requestUrl.pathname === '/api/media/website/expert-profile.webp') {
      return route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#6b46c1"/></svg>',
      });
    }
    return route.abort();
  });

  const page = await context.newPage();
  await page.goto('https://luna.example.test/', { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ content: mediaRuntime });
  await page.evaluate(url => {
    const view = document.getElementById('view-4');
    view.classList.add('active', 'ob-template-has-photo');
    const home = document.getElementById('ep-home');
    home.classList.add('active');
    window.obSetPublicExpertImage(document.getElementById('expert-photo-img'), url, '#expert-photo-emoji');
  }, productionPhoto);
  await page.waitForFunction(() => document.getElementById('expert-photo-img')?.naturalWidth > 0);

  const foundations = ['practice-focus', 'quiet-confidence', 'field-journal', 'after-hours'];
  for (const foundation of foundations) {
    const result = await page.evaluate(id => {
      const view = document.getElementById('view-4');
      [...view.classList]
        .filter(name => name.startsWith('ob-site-template-') || name.startsWith('ob-site-preset-'))
        .forEach(name => view.classList.remove(name));
      view.classList.add(`ob-site-template-${id}`, `ob-site-preset-${id}`, 'ob-template-has-photo');
      view.setAttribute('data-ob-template', id);
      const image = document.getElementById('expert-photo-img');
      const photo = document.getElementById('expert-hero-photo');
      const rect = image.getBoundingClientRect();
      return {
        src: image.getAttribute('src'),
        currentSrc: image.currentSrc,
        naturalWidth: image.naturalWidth,
        imageDisplay: getComputedStyle(image).display,
        photoDisplay: getComputedStyle(photo).display,
        width: rect.width,
        height: rect.height,
      };
    }, foundation);
    assert.equal(result.src, '/api/media/website/expert-profile.webp', `${foundation}: the DOM stores a same-origin media path`);
    assert.equal(result.currentSrc, 'https://luna.example.test/api/media/website/expert-profile.webp', `${foundation}: the browser requests the expert's active domain`);
    assert(result.naturalWidth > 0, `${foundation}: the production-shaped media response decodes`);
    assert.equal(result.imageDisplay, 'block', `${foundation}: the mobile portrait remains visible`);
    assert.notEqual(result.photoDisplay, 'none', `${foundation}: the mobile foundation keeps its portrait container`);
    assert(result.width > 0 && result.height > 0, `${foundation}: the mobile portrait occupies visible layout space`);
  }

  assert(requests.includes('https://luna.example.test/api/media/website/expert-profile.webp'), 'the image was fetched through the connected expert domain');
  assert(!requests.includes(productionPhoto), 'the browser never made the challenged cross-origin Ownlybiz media request');

  console.log(JSON.stringify({
    status: 'PASS',
    viewport: '390x844',
    foundations,
    requestedOrigin: 'https://luna.example.test',
    crossOriginOwnlybizRequest: false,
  }));
} finally {
  await browser.close();
}
