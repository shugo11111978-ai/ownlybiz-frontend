(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OB_SESSION_RECEIPT_PRESENTATION = factory();
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // Presentation only. All amounts come from settlement; never derive a bill
  // from the displayed rate, duration, authorization, or prepaid face value.
  function first(source, keys, fallback) {
    for (var i = 0; i < keys.length; i += 1) {
      if (source[keys[i]] !== undefined && source[keys[i]] !== null && source[keys[i]] !== '') return source[keys[i]];
    }
    return fallback;
  }
  function amount(source, keys) {
    var value = Number(first(source, keys, 0));
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }
  function money(value, currency) {
    var number = Number(value);
    if (!Number.isFinite(number)) number = 0;
    var code = String(currency || 'USD').toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) code = 'USD';
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(number); }
    catch (_) { return code + ' ' + number.toFixed(2); }
  }
  function formatDuration(value) {
    if (value === null || value === undefined || value === '') return '';
    var seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 0) return '';
    seconds = Math.floor(seconds);
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var remainder = seconds % 60;
    return (hours ? hours + ' hr ' : '') + (minutes || hours ? minutes + ' min ' : '') + remainder + ' sec';
  }
  function reference(value) {
    var id = String(value || '');
    var uuid = id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuid) id = uuid[0];
    else if (!/^[a-z0-9_-]+$/i.test(id)) return '';
    return id ? 'OB-' + id.replace(/[^a-z0-9]/gi, '').slice(0, 12).toUpperCase() : '';
  }
  function dateLabel(value, options) {
    if (value === null || value === undefined || value === '') return '';
    var numeric = Number(value);
    var date = new Date(Number.isFinite(numeric) ? numeric * (numeric < 1e12 ? 1000 : 1) : value);
    if (!Number.isFinite(date.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(options.locale || 'en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
        timeZone: options.timeZone || 'UTC', timeZoneName: 'short'
      }).format(date);
    } catch (_) { return date.toISOString(); }
  }
  function build(session, options) {
    session = session || {};
    options = options || {};
    var currency = first(session, ['currency'], options.currency || 'USD');
    var paidKeys = ['total_charged', 'totalCharged', 'billing_paid_amount', 'charged'];
    var paidValue = first(session, paidKeys, null);
    var paidKnown = paidValue !== null && Number.isFinite(Number(paidValue));
    var paid = amount(session, paidKeys);
    var card = amount(session, ['card_charged', 'cardCharged']);
    var credit = amount(session, ['credit_applied', 'creditApplied']);
    var creditCash = amount(session, ['credit_cash_applied', 'creditCashApplied']);
    var creditSavings = amount(session, ['credit_promo_discount', 'creditPromoDiscount']);
    var promotion = amount(session, ['promo_discount', 'promoDiscount']);
    var attempted = amount(session, ['billing_attempted_amount', 'billingAttemptedAmount']);
    var due = amount(session, ['billing_outstanding_amount', 'billingOutstandingAmount']);
    var refunded = amount(session, ['refunded_card_amount', 'refundedCardAmount']);
    var status = String(first(session, ['payment_status', 'paymentStatus'], '')).toLowerCase();
    var payout = String(first(session, ['payout_status', 'payoutStatus'], '')).toLowerCase();
    var finalPaid = ['paid', 'succeeded'].indexOf(status) !== -1;
    var waived = payout === 'below_minimum_waived' && finalPaid && paidKnown && paid === 0 && card === 0 && credit === 0 && due === 0;
    var noCharge = finalPaid && paidKnown && paid === 0 && card === 0 && credit === 0 && due === 0;
    var incomplete = !finalPaid || due > 0;
    var label = finalPaid ? 'Paid' : 'Payment pending';
    var tone = finalPaid ? 'success' : 'neutral';
    var explanation = '';
    var rows = [];
    var notes = [];
    if (noCharge) {
      label = 'No charge';
      explanation = waived
        ? 'The ' + (attempted > 0 ? money(attempted, currency) + ' ' : '') + 'session amount was waived because it was below the minimum card charge. Nothing was charged and nothing is due.'
        : 'Nothing was charged for this session and nothing is due.';
    } else if (due > 0 || status === 'partially_paid') {
      label = paid > 0 ? 'Partially paid' : 'Payment incomplete';
      tone = 'warning';
      explanation = 'The amount paid and the outstanding balance are shown separately. The outstanding balance has not been collected.';
    } else if (['charge_failed', 'failed', 'unpaid'].indexOf(status) !== -1) {
      label = 'Payment incomplete';
      tone = 'warning';
      explanation = 'Payment was not completed. Only the amount shown as paid has been collected.';
    } else if (!finalPaid) {
      explanation = 'Payment is still being finalized. This is the currently recorded payment information.';
    } else if (!paidKnown) {
      explanation = 'The payment total is unavailable in this record.';
    }
    if (waived && attempted > 0) rows.push({ label: 'Session amount waived', value: money(attempted, currency) });
    if (card > 0) rows.push({ label: 'Paid by card', value: money(card, currency) });
    if (credit > 0) rows.push({ label: 'Prepaid credit used', value: money(credit, currency) });
    if (creditSavings > 0) {
      rows.push({ label: 'Prepaid savings', value: money(creditSavings, currency) });
      rows.push({ label: 'Cash value of prepaid credit used', value: money(creditCash, currency) });
      notes.push('Total paid reflects the cash value of prepaid credit used, plus any card payment.');
    }
    if (promotion > 0) rows.push({ label: 'Promotion savings', value: money(promotion, currency) });
    if (due > 0) rows.push({ label: 'Outstanding balance', value: money(due, currency) });
    if (refunded > 0) {
      rows.push({ label: 'Refunded to card', value: money(refunded, currency) });
      notes.push('Total paid shows the original payment. The card refund is listed separately.');
    }
    if (noCharge && amount(session, ['authorized_amount', 'authorizedAmount']) > 0) {
      notes.push('A temporary card authorization is not a charge. Your bank controls when a released hold disappears.');
    }
    var channel = String(first(session, ['channel'], '')).toLowerCase();
    var rate = first(session, ['rate_per_min', 'ratePerMin'], null);
    var mode = String(first(session, ['credit_mode', 'creditMode', 'payment_mode'], '')).toLowerCase();
    var freeMinutes = amount(session, ['free_minutes', 'freeMinutes']);
    if (freeMinutes > 0) rows.unshift({ label: 'Free time included', value: formatDuration(freeMinutes * 60) });
    return {
      reference: reference(first(session, ['session_id', 'id', 'sessionId'], '')),
      title: incomplete ? 'Session payment update' : 'Session receipt',
      statusLabel: label,
      statusTone: tone,
      explanation: explanation,
      expertName: String(options.expertName || first(session, ['expert_name', 'expertName'], 'Expert')),
      channelLabel: ({ chat: 'Chat', voice: 'Voice call', video: 'Video call' })[channel] || 'Session',
      durationLabel: formatDuration(first(session, ['duration_secs', 'durationSecs', 'settlement_duration_secs'], null)),
      dateLabel: dateLabel(first(session, ['ended_at', 'endedAt', 'created_at', 'date'], null), options),
      rateLabel: rate !== null && Number.isFinite(Number(rate)) && Number(rate) >= 0 ? money(rate, currency) + '/min' : '',
      paymentModeLabel: mode === 'prepaid' ? 'Prepaid credit' : mode === 'minute' ? 'Pay by minute' : '',
      rows: rows,
      total: { label: noCharge ? 'Nothing charged' : 'Total paid', value: paidKnown ? money(paid, currency) : 'Not available' },
      notes: notes
    };
  }
  return { build: build, money: money, formatDuration: formatDuration, reference: reference };
}));
