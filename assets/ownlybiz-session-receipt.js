(function (window, document) {
  'use strict';
  var owner = null;
  var sessionId = '';
  var model = null;
  var dialog = null;
  var printFrame = null;
  var previousFocus = null;
  var printing = false;
  var renderAfterPrint = false;

  function escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function current() {
    var authority = window._obClientReceiptAuthorityState;
    try {
      return !!(owner && model && authority && !authority.settlementPending
        && String(authority.sid) === sessionId && window.OB_CLIENT_CONTEXT
        && window.OB_CLIENT_CONTEXT.isCurrent(owner, { exactCredential: true }));
    } catch (_) { return false; }
  }
  function close() {
    if (dialog) { if (dialog.open && dialog.close) dialog.close(); dialog.remove(); }
    if (printFrame) printFrame.remove();
    dialog = null;
    printFrame = null;
    printing = false;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    previousFocus = null;
  }
  function clear() {
    close(); owner = null; sessionId = ''; model = null; renderAfterPrint = false;
    var screen = document.getElementById('screen-A5');
    if (screen) screen.classList.remove('ob-receipt-enhanced');
    var overview = document.getElementById('ob-session-receipt-overview');
    if (overview) overview.remove();
    var button = document.getElementById('ob-client-view-receipt');
    if (button) button.disabled = true;
  }
  function rowsMarkup(rows) {
    return (rows || []).filter(function (row) { return row && row.value != null && row.value !== ''; })
      .map(function (row) { return '<div class="ob-receipt-line"><dt>' + escape(row.label) + '</dt><dd>' + escape(row.value) + '</dd></div>'; }).join('');
  }
  function details(receipt) {
    return [
      { label: 'Session', value: [receipt.channelLabel, receipt.expertName].filter(Boolean).join(' with ') },
      { label: 'Date', value: receipt.dateLabel },
      { label: 'Duration', value: receipt.durationLabel },
      { label: 'Rate', value: receipt.rateLabel },
      { label: 'Payment choice', value: receipt.paymentModeLabel }
    ];
  }
  function receiptBody(receipt, full) {
    var total = receipt.total || { label: 'Payment', value: 'Not available' };
    return '<div class="ob-receipt-heading"><span class="ob-receipt-status">' + escape(receipt.statusLabel) + '</span>'
      + (full ? '<span class="ob-receipt-reference">' + escape(receipt.reference) + '</span>' : '') + '</div>'
      + '<p class="ob-receipt-amount-label">' + escape(total.label) + '</p><p class="ob-receipt-amount">' + escape(total.value) + '</p>'
      + (receipt.explanation ? '<p class="ob-receipt-explanation">' + escape(receipt.explanation) + '</p>' : '')
      + '<dl class="ob-receipt-lines">' + rowsMarkup(details(receipt)) + rowsMarkup(receipt.rows) + '</dl>'
      + (receipt.notes || []).map(function (note) { return '<p class="ob-receipt-footnote">' + escape(note) + '</p>'; }).join('')
      + (!full && receipt.reference ? '<p class="ob-receipt-footnote">Reference ' + escape(receipt.reference) + '</p>' : '');
  }
  var paperCss = 'body{margin:0;background:#fff;color:#241a15;font:15px/1.5 Arial,sans-serif}.ob-receipt-paper{max-width:640px;margin:0 auto;padding:36px;box-sizing:border-box}h1{font-size:26px;line-height:1.2;margin:8px 0 28px}.ob-receipt-brand{font-size:13px;font-weight:700;color:#6b5b50}.ob-receipt-heading{display:flex;justify-content:space-between;gap:14px;align-items:center}.ob-receipt-status{font-size:13px;font-weight:700}.ob-receipt-reference{font-size:11px;color:#6b5b50;overflow-wrap:anywhere}.ob-receipt-amount-label{margin:20px 0 2px;color:#6b5b50;font-size:13px}.ob-receipt-amount{font-size:36px;font-weight:700;line-height:1.2;margin:0 0 12px}.ob-receipt-explanation{font-size:14px;margin:0 0 24px}.ob-receipt-lines{border-top:1px solid #ded8d1;padding-top:12px;margin-top:24px}.ob-receipt-line{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:12px;margin:10px 0;break-inside:avoid}.ob-receipt-line dt{color:#6b5b50}.ob-receipt-line dd{margin:0;text-align:right;overflow-wrap:anywhere}.ob-receipt-footnote{font-size:12px;color:#6b5b50;overflow-wrap:anywhere}.ob-receipt-footer{border-top:1px solid #ded8d1;margin-top:28px;padding-top:14px;font-size:12px;color:#6b5b50}@page{size:auto;margin:16mm}@media print{.ob-receipt-paper{padding:0;max-width:none}body{color:#000}}';
  function printableDocument(receipt) {
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">'
      + '<title>' + escape(receipt.reference || 'Session receipt') + '</title><style>' + paperCss + '</style></head><body>'
      + '<main class="ob-receipt-paper"><div class="ob-receipt-brand">Ownlybiz · Session record</div><h1>' + escape(receipt.title || 'Session receipt') + '</h1>'
      + receiptBody(receipt, true) + '<footer class="ob-receipt-footer">Keep this record for your reference. Payment details reflect this session’s recorded status.</footer></main></body></html>';
  }
  function printReceipt() {
    if (!current() || !printFrame || !printFrame.dataset.ready) return false;
    printing = true;
    printFrame.contentWindow.focus();
    try { printFrame.contentWindow.print(); }
    catch (_) { printing = false; return false; }
    return true;
  }
  function show() {
    if (!current()) { clear(); return false; }
    close();
    previousFocus = document.activeElement;
    dialog = document.createElement('dialog');
    dialog.className = 'ob-session-receipt-dialog';
    dialog.setAttribute('aria-labelledby', 'ob-session-receipt-title');
    dialog.innerHTML = '<div class="ob-receipt-toolbar"><button type="button" data-receipt-close aria-label="Close receipt">Close</button><button type="button" data-receipt-print disabled>Print / Save PDF</button></div>'
      + '<div class="ob-receipt-paper"><div class="ob-receipt-brand">Ownlybiz · Session record</div><h1 id="ob-session-receipt-title">' + escape(model.title || 'Session receipt') + '</h1>'
      + receiptBody(model, true) + '</div>';
    document.body.appendChild(dialog);
    dialog.querySelector('[data-receipt-close]').addEventListener('click', close);
    dialog.querySelector('[data-receipt-print]').addEventListener('click', printReceipt);
    dialog.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
    printFrame = document.createElement('iframe');
    printFrame.title = 'Printable session receipt';
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.setAttribute('sandbox', 'allow-same-origin allow-modals');
    printFrame.style.cssText = 'position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0;';
    var expectedFrame = printFrame;
    printFrame.addEventListener('load', function () {
      if (expectedFrame !== printFrame || !current() || !dialog) return;
      printFrame.dataset.ready = '1';
      dialog.querySelector('[data-receipt-print]').disabled = false;
      printFrame.contentWindow.addEventListener('afterprint', function () {
        printing = false;
        if (expectedFrame !== printFrame || !current() || !dialog) return;
        if (renderAfterPrint) {
          renderAfterPrint = false;
          render(window._obClientReceiptAuthorityState.snapshot);
          show();
        } else dialog.querySelector('[data-receipt-print]').focus();
      });
    });
    printFrame.srcdoc = printableDocument(model);
    document.body.appendChild(printFrame);
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    dialog.querySelector('[data-receipt-close]').focus();
    return true;
  }
  function render(session) {
    var authority = window._obClientReceiptAuthorityState;
    var presentation = window.OB_SESSION_RECEIPT_PRESENTATION;
    var context;
    try { context = window.OB_CLIENT_CONTEXT && window.OB_CLIENT_CONTEXT.capture('session-receipt-presentation'); } catch (_) {}
    var id = String(session && (session.id || session.session_id) || '');
    if (!presentation || !authority || authority.settlementPending || !id || String(authority.sid) !== id
      || !context || context.role !== 'client' || !context.token || !context.principal
      || !window.OB_CLIENT_CONTEXT.isCurrent(context, { exactCredential: true })) { clear(); return; }
    if (sessionId && sessionId !== id) clear();
    if (dialog && printing && current()) { renderAfterPrint = true; return; }
    close();
    owner = context;
    sessionId = id;
    var expertName = typeof window.obClientSessionExpertName === 'function' ? window.obClientSessionExpertName(session) : session.expert_name;
    model = presentation.build(authority.snapshot, { expertName: expertName });
    var screen = document.getElementById('screen-A5');
    var summary = document.getElementById('ob-client-review-summary');
    if (!screen || !summary) return;
    var overview = document.getElementById('ob-session-receipt-overview');
    if (!overview) {
      overview = document.createElement('section');
      overview.id = 'ob-session-receipt-overview';
      overview.setAttribute('aria-label', 'Session payment details');
      summary.insertBefore(overview, summary.querySelector('.receipt-card'));
    }
    overview.innerHTML = receiptBody(model, false);
    screen.classList.add('ob-receipt-enhanced');
    var button = document.getElementById('ob-client-view-receipt');
    if (button) button.disabled = false;
  }
  window.obRenderClientReceiptPresentation = render;
  window.obClearClientReceiptPresentation = clear;
  window.obViewClientReceipt = show;
  if (window.OB_CLIENT_CONTEXT) window.OB_CLIENT_CONTEXT.register('session-receipt-presentation', {
    teardown: clear, changed: clear,
    credentialRotated: function (identity) {
      var authority = window._obClientReceiptAuthorityState;
      if (owner && identity && owner.principal === identity.principal
        && owner.identityGeneration === identity.identityGeneration && authority && !authority.settlementPending) {
        render(authority.snapshot);
      } else clear();
    }
  });
  function ready() {
    var authority = window._obClientReceiptAuthorityState;
    if (authority && !authority.settlementPending) render(authority.snapshot);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
})(window, document);
