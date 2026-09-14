import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const controller = fs.readFileSync(new URL('../assets/ownlybiz-session-receipt.js', import.meta.url), 'utf8');
const presentation = fs.readFileSync(new URL('../assets/session-receipt-presentation.js', import.meta.url), 'utf8');
const documentMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const styles = [...documentMarkup.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n')
  + fs.readFileSync(new URL('../assets/session-receipt.css', import.meta.url), 'utf8');
const output = process.env.OWNLYBIZ_RECEIPT_QA_DIR;
if (output) fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}) });
const results = [];
const waived = {
  id: '22222222-1111-4444-8888-111111111111', status: 'ended', payment_status: 'paid', payout_status: 'below_minimum_waived',
  duration_secs: 176, ended_at: 1788798000, rate_per_min: 0.1, channel: 'chat', expert_name: 'Sample Reader',
  total_charged: 0, card_charged: 0, credit_applied: 0, billing_attempted_amount: 0.29,
  billing_outstanding_amount: 0, credit_mode: 'minute', authorized_amount: 5,
};
try {
  const context = await browser.newContext({ offline: true });
  let requests = 0;
  await context.route('**/*', route => { requests++; return route.abort(); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function fixture(session = waived, theme = 'dark') {
    await page.goto('about:blank');
    await page.setContent(`<style>${styles}</style><body class="${theme === 'dark' ? 'ob-public-site-dark' : ''}">
      <main id="view-5" class="active" style="max-width:430px;margin:auto;padding:18px;box-sizing:border-box">
      <div id="screen-A5" class="active"><div class="receipt-screen" style="height:auto;overflow:visible">
      <div id="ob-client-review-summary"><h1 class="receipt-title">Session complete</h1><p class="receipt-sub">Your session summary</p>
      <div class="receipt-card"><div class="receipt-row"><span>Total</span><span id="receipt-total">Legacy authoritative total</span></div></div>
      <div class="receipt-actions"><button id="ob-client-review-continue" onclick="window.__reviewContinued=true">Continue</button>
      <button id="ob-client-view-receipt" disabled onclick="obViewClientReceipt()">View receipt</button></div></div>
      <section id="ob-client-review-panel" hidden>Optional review</section></div></div></main></body>`);
    await page.evaluate(() => {
      window.__identity = { principal: 'client-a', role: 'client', token: 'token-a', identityGeneration: 1, credentialGeneration: 1 };
      window.__adapters = [];
      window.OB_CLIENT_CONTEXT = {
        capture: () => ({ ...window.__identity }),
        isCurrent: value => value && value.principal === window.__identity.principal
          && value.identityGeneration === window.__identity.identityGeneration && value.token === window.__identity.token,
        register: (_name, adapter) => window.__adapters.push(adapter),
      };
    });
    await page.addScriptTag({ content: presentation });
    await page.addScriptTag({ content: controller });
    await page.evaluate(session => {
      window._obClientReceiptAuthorityState = { sid: session.id, snapshot: session, settlementPending: false };
      window.obRenderClientReceiptPresentation(session);
    }, session);
  }
  async function show() {
    await page.locator('#ob-client-view-receipt').click();
    await page.waitForFunction(() => !!document.querySelector('iframe[title="Printable session receipt"]')?.dataset.ready);
  }
  for (const theme of ['light', 'dark']) {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await fixture(waived, theme);
      const overview = page.locator('#ob-session-receipt-overview');
      assert.match(await overview.innerText(), /Nothing charged[\s\S]*\$0\.00/);
      assert.match(await overview.innerText(), /2 min 56 sec/);
      assert.match(await overview.innerText(), /\$0\.29 session amount was waived/);
      assert.doesNotMatch(await overview.innerText(), /session:|Cash value of credit|\$5\.00/);
      assert.equal(await page.locator('.receipt-card').isVisible(), false);
      await show();
      const geometry = await page.locator('.ob-session-receipt-dialog').evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight, overflow: element.scrollWidth > element.clientWidth + 1, color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor };
      });
      assert(geometry.left >= 0 && geometry.right <= geometry.width + 1 && !geometry.overflow);
      assert(geometry.left >= 12 && geometry.width - geometry.right >= 12, 'Dialog keeps at least 12px of horizontal breathing room');
      assert(Math.abs(geometry.left - (geometry.width - geometry.right)) <= 1, 'Dialog is horizontally centered despite the global margin reset');
      assert(geometry.top >= 16 && geometry.height - geometry.bottom >= 16, 'Dialog keeps vertical viewport breathing room');
      assert(Math.abs(geometry.top - (geometry.height - geometry.bottom)) <= 1, 'Dialog is vertically centered in the available viewport');
      assert.equal(geometry.color, 'rgb(36, 26, 21)');
      assert.equal(geometry.background, 'rgb(255, 255, 255)');
      if (output) await page.screenshot({ path: path.join(output, `receipt-${theme}-${width}.png`), fullPage: true });
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.ob-session-receipt-dialog').count(), 0);
      assert.equal(await page.locator('#ob-client-view-receipt').evaluate(el => document.activeElement === el), true);
      assert.equal(await page.evaluate(() => !!window.__reviewContinued), false);
      results.push(`${theme}/${width}: waiver, exact duration, readable receipt, close/focus, no review advance`);
    }
  }
  await fixture({ ...waived, expert_name: '<img src=x onerror="window.__xss=1">' });
  await show();
  assert.equal(await page.evaluate(() => !!window.__xss), false);
  assert.equal(await page.locator('.ob-session-receipt-dialog img').count(), 0);
  const printHtml = await page.locator('iframe[title="Printable session receipt"]').getAttribute('srcdoc');
  assert.doesNotMatch(printHtml, /<script|<button|phone-frame|Continue|type="password"/);
  assert.match(printHtml, /&lt;img/);
  results.push('receipt and print document escape hostile display text; no session controls or scripts');
  await fixture();
  await show();
  await page.evaluate(() => {
    const frame = document.querySelector('iframe[title="Printable session receipt"]');
    window.__originalPrintFrame = frame;
    window.__printCalls = 0;
    frame.contentWindow.print = () => window.__printCalls++;
  });
  await page.locator('[data-receipt-print]').click();
  await page.evaluate(() => {
    const authority = window._obClientReceiptAuthorityState;
    authority.snapshot = { ...authority.snapshot, payout_status: 'paid', total_charged: 0.75, card_charged: 0.75, billing_attempted_amount: 0.75 };
    window.obRenderClientReceiptPresentation(authority.snapshot);
  });
  assert.equal(await page.evaluate(() => window.__originalPrintFrame.isConnected), true, 'keep print snapshot until native dialog finishes');
  assert.match(await page.locator('#ob-session-receipt-overview').innerText(), /Nothing charged/);
  await page.evaluate(() => window.__originalPrintFrame.contentWindow.dispatchEvent(new Event('afterprint')));
  await page.waitForFunction(() => !!document.querySelector('iframe[title="Printable session receipt"]')?.dataset.ready);
  assert.match(await page.locator('#ob-session-receipt-overview').innerText(), /Total paid[\s\S]*\$0\.75/);
  await page.evaluate(() => {
    const frame = document.querySelector('iframe[title="Printable session receipt"]');
    frame.contentWindow.print = () => window.__printCalls++;
  });
  await page.locator('[data-receipt-print]').click();
  await page.evaluate(() => document.querySelector('iframe[title="Printable session receipt"]').contentWindow.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.locator('[data-receipt-print]').evaluate(el => document.activeElement === el), true);
  assert.equal(await page.evaluate(() => window.__printCalls), 2);
  results.push('print cancellation/completion restores focus; deferred authoritative payment update renders; repeat print supported');
  await page.evaluate(() => {
    window.__identity = { ...window.__identity, token: 'token-a-rotated', credentialGeneration: 2 };
    window.__adapters.forEach(adapter => adapter.credentialRotated?.(window.__identity));
  });
  assert.equal(await page.locator('#ob-client-view-receipt').isEnabled(), true);
  await page.evaluate(() => {
    window.__identity = { ...window.__identity, principal: 'client-b', token: 'token-b', identityGeneration: 2 };
    window.__adapters.forEach(adapter => adapter.changed?.(window.__identity));
  });
  assert.equal(await page.locator('#ob-session-receipt-overview').count(), 0);
  assert.equal(await page.locator('.ob-session-receipt-dialog').count(), 0);
  assert.equal(await page.locator('iframe[title="Printable session receipt"]').count(), 0);
  assert.equal(await page.locator('#ob-client-view-receipt').isEnabled(), false);
  results.push('same-client credential rotation preserves availability; account change removes private receipt and print document');
  await fixture();
  await page.evaluate(() => { window._obClientReceiptAuthorityState.settlementPending = true; window.obClearClientReceiptPresentation(); });
  assert.equal(await page.locator('.receipt-card').isVisible(), true);
  assert.equal(await page.locator('#ob-client-view-receipt').isEnabled(), false);
  results.push('settlement pending restores legacy finalizing state and disables printable record');
  if (output) {
    await fixture(); await show();
    const printable = await page.locator('iframe[title="Printable session receipt"]').getAttribute('srcdoc');
    fs.writeFileSync(path.join(output, 'sample-session-receipt.html'), printable);
    const pdfPage = await context.newPage();
    await pdfPage.setContent(printable);
    await pdfPage.pdf({ path: path.join(output, 'sample-session-receipt.pdf'), format: 'A4', printBackground: true, displayHeaderFooter: false });
    await pdfPage.close();
  }
  assert.deepEqual(errors, []);
  assert.equal(requests, 0);
  const report = { status: 'PASS', cases: results, pageErrors: errors, networkRequests: requests, boundary: 'Offline real Chromium DOM and mocked print invocation; native iPhone Safari print sheet and wallet payment confirmations not exercised.' };
  if (output) fs.writeFileSync(path.join(output, 'receipt-browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
