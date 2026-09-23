(function () {
  'use strict';
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function decimal(value, max, label) {
    var raw = String(value).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error(label + ': enter a non-negative number with at most two decimal places.');
    var parts = raw.split('.'), n = Number(parts[0]) * 100 + Number((parts[1] || '').padEnd(2, '0'));
    if (!Number.isSafeInteger(n) || n > max) throw new Error(label + ' exceeds the supported limit.');
    return n;
  }
  function mount(options) {
    var container = options.container, model, preview, operation, busy = false, uncertain = false;
    function current() { return container.isConnected && options.isCurrent(); }
    function node(key) { return container.querySelector('[data-catalog="' + key + '"]'); }
    function status(message, error) { if (current()) { node('status').textContent = message; node('status').setAttribute('role', error ? 'alert' : 'status'); } }
    function locked(value) {
      busy = value;
      container.querySelectorAll('input,button').forEach(function (el) { el.disabled = value || uncertain; });
      node('publish').disabled = value || !preview;
    }
    function invalidate() {
      if (busy || uncertain || !current()) return;
      preview = null; operation = null; node('publish').disabled = true; node('review').textContent = '';
    }
    function field(path, label, value) {
      return '<label>' + esc(label) + '<input type="text" inputmode="decimal" autocomplete="off" data-catalog-field="' + path + '" value="' + (value / 100).toFixed(2) + '"></label>';
    }
    function accept(data) {
      var c = data && data.catalog;
      if (!c || ['test','live'].indexOf(c.mode)<0 || data.publish_mode!==c.mode || typeof data.admission_enabled!=='boolean' || c.currency !== 'usd' || !Number.isSafeInteger(c.revision) || !c.plans || !c.payment_fee || !data.limits) throw new Error('Pricing response is incomplete. Reload before editing.');
      return data;
    }
    function render() {
      var c = model.catalog;
      container.innerHTML = '<div class="admin-card ob-commercial-card"><h3>New subscription pricing</h3>'
        + '<p>' + (c.mode==='live'?'Live':'Test') + ' · USD · revision ' + c.revision + '. Edit only the amounts you want to change. Preview shows exactly what will apply.</p>'
        + '<p>New subscription enrollment is ' + (model.admission_enabled?'enabled':'closed') + '. Publishing prices does not enroll or charge an expert.</p>'
        + '<div class="ob-commercial-plans">' + ['starter','pro','scale'].map(function (id) { return '<fieldset><legend>' + esc(id[0].toUpperCase() + id.slice(1)) + '</legend>' + field('plans.' + id + '.monthly_cents', 'Monthly subscription ($)', c.plans[id].monthly_cents) + field('plans.' + id + '.annual_cents', 'Annual subscription ($ per year)', c.plans[id].annual_cents) + '</fieldset>'; }).join('') + '</div>'
        + '<fieldset><legend>Combined payment fee · same across these plans</legend><div class="ob-commercial-plans">'
        + field('payment_fee.basis_points', 'Percentage (%)', c.payment_fee.basis_points) + field('payment_fee.fixed_cents', 'Fixed amount ($ per successful payment)', c.payment_fee.fixed_cents) + '</div>'
        + '<p>Applies to supported standard US domestic-card payments. Includes ordinary processing and Ownlybiz payment services. This does not change Stripe’s charges to Ownlybiz. Either component can be zero; provider costs still apply.</p></fieldset>'
        + '<p>New subscription offers and new payment commitments use the published values. Existing subscriptions keep their Stripe price; already accepted payments keep their saved fee. Earlier plans and the initial two-calendar-month trial stay unchanged.</p>'
        + '<label>Reason for change<input data-catalog="reason" maxlength="500" placeholder="For example: revised annual pricing"></label>'
        + '<div class="ob-commercial-actions"><button type="button" class="admin-action-btn" data-catalog="preview">Preview changes</button><button type="button" class="admin-action-btn" data-catalog="publish" disabled>Publish reviewed pricing</button><button type="button" class="admin-action-btn" data-catalog="reload">Reload saved pricing</button></div>'
        + '<p data-catalog="status" role="status" aria-live="polite"></p><div data-catalog="review"></div>'
        + '<details><summary>Pricing history</summary><button type="button" class="admin-action-btn" data-catalog="history">Load history</button><div data-catalog="history-list"></div></details></div>';
      container.querySelectorAll('input').forEach(function (el) { el.addEventListener('input', invalidate); });
      node('preview').onclick = review; node('publish').onclick = publish; node('reload').onclick = load; node('history').onclick = history;
    }
    function draft() {
      var changes = {}, c = model.catalog, limits = model.limits;
      container.querySelectorAll('[data-catalog-field]').forEach(function (el) {
        var path = el.getAttribute('data-catalog-field').split('.');
        var max = path[0] === 'plans' ? limits.subscription_max_cents : path[1] === 'basis_points' ? limits.basis_points_max : limits.fixed_cents_max;
        var value = decimal(el.value, max, el.parentNode.firstChild.textContent);
        if (path[0] === 'plans' && value < limits.subscription_min_cents) throw new Error('Subscription prices must be at least $' + (limits.subscription_min_cents / 100).toFixed(2) + '. Use an expert’s complimentary access setting to waive billing.');
        var old = path.length === 3 ? c[path[0]][path[1]][path[2]] : c[path[0]][path[1]];
        if (old === value) return;
        if (!changes[path[0]]) changes[path[0]] = {};
        if (path.length === 3) { if (!changes.plans[path[1]]) changes.plans[path[1]] = {}; changes.plans[path[1]][path[2]] = value; }
        else changes[path[0]][path[1]] = value;
      });
      return {expected_revision:c.revision, changes:changes};
    }
    function pathLabel(path) {
      if (path === 'payment_fee.basis_points') return 'Payment percentage';
      if (path === 'payment_fee.fixed_cents') return 'Fixed payment amount';
      var parts = path.split('.');
      return parts[1][0].toUpperCase() + parts[1].slice(1) + (parts[2] === 'annual_cents' ? ' annual subscription' : ' monthly subscription');
    }
    function display(path, value) { return path === 'payment_fee.basis_points' ? (value / 100).toFixed(2) + '%' : '$' + (value / 100).toFixed(2); }
    async function review() {
      if (!current() || busy || uncertain) return;
      try {
        preview = null; operation = null;
        var body = draft(), reason = node('reason').value.trim();
        if (reason.length < 3) throw new Error('Add a short reason for this change.');
        locked(true); status('Checking pricing changes…');
        var result = await options.request('/api/commercial-catalog/admin/preview', {method:'POST', body:body});
        if (!current()) return;
        if (!result.preview_hash || !result.proposed || result.proposed.mode!==model.catalog.mode || result.publish_mode!==model.catalog.mode || typeof result.admission_enabled!=='boolean' || !Array.isArray(result.changes)) throw new Error('Preview could not be verified.');
        preview = {body:body, reason:reason, hash:result.preview_hash}; operation = null;
        node('review').innerHTML = '<h4>Revision ' + esc(result.proposed.revision) + '</h4><ul>' + result.changes.map(function (change) { return '<li>' + esc(pathLabel(change.path)) + ': ' + esc(display(change.path, change.before)) + ' → <strong>' + esc(display(change.path, change.after)) + '</strong></li>'; }).join('') + '</ul>'
          + (!result.changes.length ? '<p>Publish the initial catalog with the displayed amounts.</p>' : '')
          + '<p>Applies to future offers in this ' + esc(model.catalog.mode) + ' pricing catalog. Existing subscriptions and accepted payments keep their agreed terms. No expert is enrolled or charged by publishing this catalog.</p>';
        status('Preview ready. Publish to activate these reviewed amounts.');
      } catch (e) { status(e.message, true); } finally { if (current()) locked(false); }
    }
    async function publish() {
      if (!current() || busy || !preview) return;
      if (!operation) operation = Object.assign({}, preview.body, {reason:preview.reason, preview_hash:preview.hash, operation_id:'catalog_' + crypto.randomUUID()});
      locked(true); status('Publishing pricing…');
      try {
        var result = await options.request('/api/commercial-catalog/admin/publish', {method:'PUT', body:operation});
        if (!current()) return;
        model = accept(result); preview = null; operation = null; uncertain = false; render();
        status('Pricing published. Revision ' + model.catalog.revision + ' is active for future offers.');
        if (options.onPublished) { try { options.onPublished(); } catch (_) {} }
      } catch (e) {
        if (!current()) return;
        if (!e.status || e.status >= 500 || (e.data && e.data.publication_status === 'not_confirmed')) {
          uncertain = true; status('Publication could not be confirmed. Retry this same publication to reconcile the result. ' + e.message, true);
          node('publish').textContent = 'Retry same publication';
        } else { preview = null; operation = null; status(e.message + ' Reload pricing and review again.', true); }
      } finally { if (current()) locked(false); }
    }
    async function load() {
      if (!current() || busy || uncertain) return;
      container.innerHTML = '<div class="admin-card ob-commercial-card"><h3>New subscription pricing</h3><p data-catalog="status" role="status">Loading pricing…</p></div>';
      busy = true;
      try {
        var data = await options.request('/api/commercial-catalog/admin', {method:'GET'});
        if (!current()) return;
        model = accept(data); preview = null; operation = null; render(); status('Saved pricing loaded.');
      } catch (e) {
        if (current()) {
          status(e.message, true);
          var retry = document.createElement('button'); retry.type = 'button'; retry.className = 'admin-action-btn'; retry.textContent = 'Retry loading pricing'; retry.onclick = load;
          container.firstElementChild.appendChild(retry);
        }
      } finally { busy = false; }
    }
    async function history() {
      if (!current() || busy || uncertain) return;
      try {
        var result = await options.request('/api/commercial-catalog/admin/history', {method:'GET'});
        if (!current()) return;
        node('history-list').innerHTML = (result.history || []).map(function (row) { return '<p><strong>Revision ' + esc(row.new_revision == null ? row.revision : row.new_revision) + '</strong> · ' + esc(row.actor_user_id || row.actor_id || row.published_by || '') + '<br>' + esc(row.reason || '') + '</p>'; }).join('') || '<p>No publications yet.</p>';
      } catch (e) { status(e.message, true); }
    }
    load();
  }
  window.OB_ADMIN_COMMERCIAL_CATALOG = {mount:mount};
})();
