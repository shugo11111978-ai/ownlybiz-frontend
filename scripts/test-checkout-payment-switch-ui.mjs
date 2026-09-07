import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

// Real browser DOM/CSS, source-extracted controllers and synthetic Stripe frames.
// No server, credentials, application API requests or payment confirmation.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');
const source = fs.readFileSync(process.env.OWNLYBIZ_CHECKOUT_SOURCE || new URL('../index.html', import.meta.url), 'utf8');
const styles = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n');
function between(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert(from >= 0 && to > from, `Missing source owner: ${start}`);
  return source.slice(from, to);
}
const switches = between('  function setNodeVisible(node, visible){', '  function injectBookingCredit(forceRefresh){');
const scheduled = between('  function setBookLaterPaymentMode(mode){', '  window.obBookLaterUseCredit = function(){');
const creditStyles = between('  function addStyle(){', '  function hideLegacyPackageSurfaces(){');
const walletMarker = source.indexOf('if(window._obClientWalletGoogleApprovalInstalled) return;');
const walletStart = source.lastIndexOf('(function(){', walletMarker);
const walletEnd = source.indexOf('\n  function completeClientProviderAuth', walletMarker);
assert(walletStart > 0 && walletEnd > walletStart);
const wallet = source.slice(walletStart, walletEnd) + '\n})();';
const note = source.match(/<div id="bov-pay-explainer"[\s\S]*?<\/div>/)[0];
const browser = await chromium.launch({ headless: true, ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}) });
const results = [];
try {
  const context = await browser.newContext({ offline: true });
  let externalRequests = 0;
  await context.route('**/*', route => { externalRequests++; return route.abort(); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function fixture(theme = 'dark', outcome = 'available') {
    await page.goto('about:blank');
    await page.setContent(`<style>${styles}</style><body class="${theme === 'dark' ? 'ob-public-site-dark' : ''}">
      <div id="booking-overlay" style="display:flex"><div><div id="bov-step2"><h2>Confirm payment method</h2>${note}
        <button data-ob-payment-mode="minute" onclick="obBookingPaymentMode('minute')">Pay by minute</button>
        <button data-ob-payment-mode="topup" onclick="obBookingPaymentMode('topup')">Prepaid credit</button>
        <section id="bov-wallet-section" style="display:none"><div id="bov-wallet-button"></div></section>
        <label>Credit or debit card</label><div id="bov-card-element"><input value="Synthetic card draft"></div>
        <div id="bov-card-error" style="display:none"></div><button id="bov-pay-btn">Continue</button>
      </div></div></div>
      <div id="bfl-overlay" style="display:none"><div id="bfl-card-section">
        <section id="bfl-wallet-section" style="display:none"><div id="bfl-wallet-button"></div></section>
      </div></div></body>`);
    await page.evaluate(({ switches, scheduled, wallet, creditStyles, outcome }) => {
      window.__OB_TEST_HOOKS__ = {};
      window.OWNLYBIZ_API_URL = 'https://synthetic.invalid';
      window._currentExpertId = 'synthetic-expert';
      window.__checkout = { frames: [], apiRequests: [], generation: 1, principal: 'client-a', outcome, cardMounts: 0 };
      const record = window.__checkout;
      window.OB_CLIENT_CONTEXT = {
        capture: (kind, fields) => ({ ...fields, principal: record.principal, token: 'synthetic', generation: record.generation }),
        isCurrent: value => !!value && value.generation === record.generation && value.principal === record.principal,
        token: () => 'synthetic', register() {},
      };
      window.fetch = async (url, options = {}) => {
        record.apiRequests.push({ url: String(url), method: options.method || 'GET' });
        if (!String(url).endsWith('/api/config') || options.method && options.method !== 'GET') throw new Error('Unexpected application API request');
        return { ok: true, json: async () => ({ client_payments: { apple_pay_enabled: outcome !== 'disabled', google_pay_enabled: outcome !== 'disabled' } }) };
      };
      const stripe = {
        confirmSetup() { throw new Error('Payment confirmation forbidden in this fixture'); },
        elements() {
          return { create(type) {
            if (type !== 'expressCheckout') throw new Error('Unexpected Stripe element');
            const element = { handlers: {}, mounts: 0, destroys: 0, unmounts: 0, node: null,
              on(name, listener) { this.handlers[name] = listener; },
              mount(selector) {
                this.mounts++;
                this.node = document.createElement('iframe');
                this.node.title = 'Synthetic eligible wallet';
                document.querySelector(selector).append(this.node);
                this.selector = selector;
                if (outcome === 'error') this.handlers.loaderror({});
                else this.handlers.ready({ availablePaymentMethods: outcome === 'unavailable' ? null : { applePay: true, googlePay: true } });
              },
              unmount() { this.unmounts++; this.node?.remove(); },
              destroy() { this.destroys++; this.node?.remove(); },
            };
            record.frames.push(element);
            return element;
          } };
        },
      };
      window._bovStripe = window._bflStripe = stripe;
      window.mountBflCardElement = () => { record.cardMounts++; window._obMountBflWallet(stripe); };
      window.obBookLaterMinutePaymentRequired = () => true;
      (0, eval)(wallet);
      (0, eval)(`(function(){
        var state={bookingPayMode:'minute',bookLaterPayMode:'minute',promoRequest:0};
        var authorizationPolicy={copy:function(){return 'Synthetic policy';}};
        function resetCreditPaymentMount(){}
        function sessionPromoStatus(){}
        function bookLaterPaymentMode(){return state.bookLaterPayMode==='prepaid'?'prepaid':'minute';}
        ${creditStyles}
        ${switches}
        ${scheduled}
        window.obCreditOpenTopup=function(context){state.context=context;};
        window.obCreditCloseModal=function(){
          if(state.context==='book_later')setBookLaterPaymentMode('minute');
          else setBookingPaymentMode('minute');
        };
        window.__checkout.setBovMode=setBookingPaymentMode;
        window.__checkout.restoreBov=restoreStandardBookingPayment;
        window.__checkout.setBflMode=setBookLaterPaymentMode;
        addStyle();
      })();`);
      window._obMountBovWallet(stripe);
      window._obMountBflWallet(stripe);
    }, { switches, scheduled, wallet, creditStyles, outcome });
    await page.waitForFunction(() => window.__checkout.outcome === 'disabled' || window.__checkout.frames.length === 2);
  }
  for (const theme of ['light', 'dark']) {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await fixture(theme);
      const expectedText = await page.locator('#bov-pay-explainer').textContent();
      await page.evaluate(() => {
        for (let i = 0; i < 4; i++) {
          obBookingPaymentMode('topup');
          if (getComputedStyle(document.getElementById('bov-wallet-section')).display !== 'none') throw new Error('Minute wallet visible during top-up');
          obBookingPaymentMode('minute');
          __checkout.setBflMode('prepaid');
          __checkout.setBflMode('minute');
        }
      });
      await page.waitForTimeout(1100);
      const result = await page.evaluate(() => {
        const note = document.getElementById('bov-pay-explainer');
        const range = document.createRange(); range.selectNodeContents(note);
        return { frameCount: __checkout.frames.length, connected: __checkout.frames.every(e => e.node.isConnected && e.mounts === 1 && !e.destroys),
          color: getComputedStyle(note).color, strongColor: getComputedStyle(note.querySelector('strong')).color,
          display: getComputedStyle(note).display, textWidth: range.getBoundingClientRect().width,
          cardDraft: document.querySelector('#bov-card-element input').value,
          walletDisplay: getComputedStyle(document.getElementById('bov-wallet-section')).display,
          requests: __checkout.apiRequests };
      });
      assert.equal(result.frameCount, 2, 'Repeated switches must reuse the one BOV and one BFL element');
      assert(result.connected, 'Original Stripe-owned frames remain attached');
      assert.equal(result.color, 'rgb(36, 26, 21)', 'Disclosure retains dark text after style serialization');
      assert.equal(result.strongColor, result.color, 'Disclosure heading remains readable');
      assert.notEqual(result.display, 'none');
      assert(result.textWidth > 0);
      assert.equal(result.cardDraft, 'Synthetic card draft');
      assert.equal(await page.locator('#bov-pay-explainer').textContent(), expectedText, 'Switching never changes authorization consent text');
      assert.equal(result.walletDisplay, 'block');
      assert.equal(result.requests.length, 1, 'Switching causes no intent, authorization, purchase or session requests');
      assert.equal(result.requests[0].method, 'GET');
      results.push({ theme, width, case: 'repeatedSwitches', ...result });
    }
  }
  for (const outcome of ['unavailable', 'error', 'disabled']) {
    await fixture('dark', outcome);
    await page.evaluate(() => {
      obBookingPaymentMode('topup'); obBookingPaymentMode('minute');
      __checkout.setBflMode('prepaid'); __checkout.setBflMode('minute');
    });
    await page.waitForTimeout(1100);
    const visibility = await page.evaluate(() => ['bov-wallet-section', 'bfl-wallet-section'].map(id => document.getElementById(id).style.display));
    assert.deepEqual(visibility, ['none', 'none'], `${outcome}: reusing a wallet must preserve eligibility/loaderror visibility`);
    results.push({ case: outcome, visibility });
  }
  await fixture();
  await page.evaluate(() => { __checkout.setBflMode('minute'); __checkout.setBflMode('prepaid'); });
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => __checkout.cardMounts), 0, 'A stale scheduled callback does not remount minute checkout after top-up is selected');
  await page.evaluate(() => {
    const old = document.getElementById('bov-wallet-button');
    old.replaceWith(old.cloneNode(false));
    __checkout.restoreBov();
  });
  await page.waitForFunction(() => __checkout.frames.length === 3);
  assert.equal(await page.evaluate(() => __checkout.frames[0].destroys), 1, 'A replaced host destroys its previous Stripe element');
  assert(await page.evaluate(() => __checkout.frames[2].node.isConnected), 'A replacement host gets a fresh attached Stripe element');
  results.push({ case: 'staleScheduledCallbackAndReplacedHost', passed: true });
  assert.deepEqual(errors, []);
  assert.equal(externalRequests, 0);
  console.log(JSON.stringify({ status: 'PASS', sourceSha256: createHash('sha256').update(source).digest('hex'), cases: results, network: 'offline, all requests blocked, synthetic config only' }));
} finally {
  await browser.close();
}
