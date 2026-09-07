import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

// Existing local browser only. No server, application scripts or network calls.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');
const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n');
const start = source.indexOf('  function publicReviewCard(r){');
const end = source.indexOf('  function normalizePublicPayload(data){', start);
assert(start > 0 && end > start);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const card = vm.runInNewContext(`(function(){${source.slice(start, end)};return publicReviewCard;})()`, { esc, stars: () => '★★★★★' });
const cases = [
  ['quotedText', 'Hosted staging QA <img src=x onerror="window.__reviewQaXss=true"> — private draft.'],
  ['longWord', 'x'.repeat(2000)],
  ['longURL', 'https://example.com/' + 'a'.repeat(1980)],
];
const browser = await chromium.launch({ headless: true, ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}) });
const results = [];
try {
  const context = await browser.newContext({ offline: true });
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  const measure = () => page.locator('.ob-public-review-card p').evaluate(p => {
    const range = document.createRange(); range.selectNodeContents(p);
    return { clientWidth: p.clientWidth, scrollWidth: p.scrollWidth, rightOverflow: Math.max(0, range.getBoundingClientRect().right - p.closest('.ob-public-review-card').getBoundingClientRect().right) };
  });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, comment] of cases) {
      const review = card({ rating: 5, comment, client_name: 'Review QA client', expert_reply: 'A public reply.' });
      await page.setContent(`<style>${styles}</style><main id="view-4" class="view active"><div id="ep-reviews" class="expert-page active"><div class="mkt-page-inner" style="max-width:800px;margin:0 auto;padding:60px 24px;text-align:center"><div id="ew-reviews-container"><div class="ob-public-review-grid">${review}</div></div></div></div></main>`, { waitUntil: 'domcontentloaded' });
      const geometry = await measure();
      assert(geometry.clientWidth > 0 && geometry.scrollWidth <= geometry.clientWidth + 1 && geometry.rightOverflow <= 1, `${name} at ${width}px overflows: ${JSON.stringify(geometry)}`);
      results.push({ width, name, chars: comment.length, ...geometry });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('.ob-public-review-card p').evaluate(p => { p.textContent = 'x'.repeat(2000); });
  await page.addStyleTag({ content: '.ob-public-review-card p{overflow-wrap:normal!important;word-break:normal!important}' });
  const negative = await measure();
  assert(negative.scrollWidth > negative.clientWidth + 1, 'Negative control must reproduce overflow without the wrapping rule');
  console.log(JSON.stringify({ status: 'PASS', sourceSha256: createHash('sha256').update(source).digest('hex'), cases: results, negativeControlDetected: true, network: 'offline and all requests aborted' }));
} finally {
  await browser.close();
}
