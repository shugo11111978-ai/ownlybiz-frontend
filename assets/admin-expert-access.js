(function () {
  'use strict';
  function escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function title(value) { return String(value || '').replace(/_/g, ' '); }
  function dateInput(seconds) {
    if (!seconds) return '';
    var date = new Date(seconds * 1000);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  function expiry(value, saved) {
    // Preserve saved seconds (and an already expired grant) when this field was
    // not changed. Editing another feature must not renew or erase that grant.
    if (saved && value === dateInput(saved)) return saved;
    if (!value) return null;
    var seconds = Math.floor(new Date(value).getTime() / 1000);
    if (!Number.isSafeInteger(seconds) || seconds <= Math.floor(Date.now() / 1000)) {
      throw new Error('Choose a future expiry or leave it empty for until changed.');
    }
    return seconds;
  }
  function mount(options) {
    var container = options.container;
    if (!container) return;
    var expertId = String(options.expertId || '');
    var base = '/expert-access/admin/experts/' + encodeURIComponent(expertId);
    var model = null, preview = null, busy = false, operation = null, generation = 0, pendingBilling = null;
    function current() { return container.isConnected && options.isCurrent(); }
    function node(key) { return container.querySelector('[data-access="' + key + '"]'); }
    function status(message, error) {
      if (!current()) return;
      var target = node('status');
      if (target) { target.textContent = message; target.setAttribute('role', error ? 'alert' : 'status'); }
    }
    function accept(data) {
      if (!data || !data.state || String(data.state.expert_id) !== expertId || !data.catalog || !data.effective) {
        throw new Error('Access response did not match this expert. Reload before editing.');
      }
      return data;
    }
    function lock(value) {
      busy = value;
      container.querySelectorAll('input,select,button').forEach(function (element) { element.disabled = value; });
      if (!value && node('save')) node('save').disabled = !preview;
      if (!value && pendingBilling) {
        container.querySelectorAll('input,select,[data-access="preview"],[data-access="enable-all"],[data-access="reset-features"],[data-access="reset-quantities"]').forEach(function(element){ element.disabled = true; });
      }
      if (!value && node('billing-stop') && !pendingBilling) node('billing-stop').disabled = !node('stop-renewal').checked;
    }
    function source(item) {
      if (!item) return 'Unavailable';
      return title(item.source) + (item.expires_at ? ' · until ' + new Date(item.expires_at * 1000).toLocaleString() : '');
    }
    function render() {
      if (!current()) return;
      var state = model.state, catalog = model.catalog, effective = model.effective;
      var billing = model.billing || {};
      container.innerHTML = '<div class="admin-card" style="padding:20px;margin-top:18px">'
        + '<h3 style="margin:0 0 8px">Plan &amp; feature access</h3>'
        + '<p>Grant a complimentary access plan or change individual features. Billing stays unchanged unless you explicitly choose to stop software billing below.</p>'
        + '<p><strong>Billing:</strong> ' + escape(billing.has_subscription ? title(billing.subscription_plan) + ' · ' + title(billing.subscription_status) : 'No subscription on record')
        + '<br><strong>Effective access:</strong> ' + escape(effective.plan_id ? title(effective.plan_id) : 'No active plan') + ' · ' + escape(title(effective.plan_source)) + '</p>'
        + (effective.account_blockers.length ? '<p role="note">Account restrictions: ' + escape(effective.account_blockers.map(title).join(', ')) + '. A feature grant does not remove them.</p>' : '')
        + '<div class="ob-access-fields"><label>Access plan<select data-access="plan"><option value="">Follow subscription and existing grants</option>'
        + catalog.plans.map(function (plan) { return '<option value="' + escape(plan) + '"' + (state.access_plan && state.access_plan.plan_id === plan ? ' selected' : '') + '>Complimentary ' + escape(title(plan)) + ' access</option>'; }).join('')
        + '</select></label><label>Plan expiry (optional, your local time)<input type="datetime-local" data-access="plan-expiry" value="' + escape(dateInput(state.access_plan && state.access_plan.expires_at)) + '"></label></div>'
        + (billing.has_subscription ? '<label style="display:block;margin:14px 0"><input type="checkbox" data-access="stop-renewal"> Also stop software subscription billing</label><label data-access="billing-stop-field" hidden>Stop billing<select data-access="billing-stop" disabled><option value="period_end">At the end of the current paid or trial period</option><option value="immediately">Immediately</option></select></label><p>Complimentary access is applied now, independently of the billing change. Existing invoices and pending items remain for separate review. No refund or balance forgiveness is included.</p>' : '')
        + '<p>Default follows the plan and existing independent grants. Enable or disable overrides the default. Leave expiry empty for until changed. Providers and the expert’s service settings must still be ready.</p>'
        + '<div class="ob-access-scroll"><table class="ob-access-table"><thead><tr><th>Feature</th><th>Access</th><th>Expiry (optional)</th><th>Currently effective</th></tr></thead><tbody>'
        + Object.keys(catalog.features).map(function (id) {
          var definition = catalog.features[id], override = state.feature_overrides[id], item = effective.features[id];
          var value = override ? (override.enabled ? 'enable' : 'disable') : '';
          return '<tr><th scope="row">' + escape(definition.label) + '</th><td><select aria-label="' + escape(definition.label + ' access') + '" data-feature="' + escape(id) + '">'
            + [['', 'Default'], ['enable', 'Enable'], ['disable', 'Disable']].map(function (choice) { return '<option value="' + choice[0] + '"' + (value === choice[0] ? ' selected' : '') + '>' + choice[1] + '</option>'; }).join('')
            + '</select></td><td><input aria-label="' + escape(definition.label + ' expiry') + '" type="datetime-local" data-feature-expiry="' + escape(id) + '" value="' + escape(dateInput(override && override.expires_at)) + '"></td>'
            + '<td>' + escape(item.decision === null ? 'Existing rules' : item.enabled ? 'Enabled' : 'Disabled') + '<small>' + escape(source(item)) + '</small>' + (item.readiness==='group_delivery_readiness_pending'?'<small>New group delivery is awaiting capacity and usage controls.</small>':'') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        + '<div class="ob-access-actions"><button type="button" class="admin-action-btn" data-access="enable-all">Enable all listed features</button><button type="button" class="admin-action-btn" data-access="reset-features">Reset feature overrides</button></div>'
        + '<details><summary>Custom allowances</summary><p>Empty uses the default; zero explicitly sets zero. Changes do not refill spent usage or purchase extra capacity.</p>'
        + '<div class="ob-access-scroll"><table class="ob-access-table"><thead><tr><th>Allowance</th><th>Custom limit</th><th>Expiry (optional)</th><th>Currently effective</th></tr></thead><tbody>'
        + Object.keys(catalog.quantities).filter(function(id){return catalog.quantities[id].configurable !== false;}).map(function (id) {
          var definition = catalog.quantities[id], override = state.quantity_overrides[id], item = effective.quantities[id];
          return '<tr><th scope="row">' + escape(definition.label) + '</th><td><input aria-label="' + escape(definition.label) + '" type="number" min="0" max="' + escape(definition.max) + '" step="1" placeholder="Default" data-quantity="' + escape(id) + '" value="' + escape(override ? override.value : '') + '"></td>'
            + '<td><input aria-label="' + escape(definition.label + ' expiry') + '" type="datetime-local" data-quantity-expiry="' + escape(id) + '" value="' + escape(dateInput(override && override.expires_at)) + '"></td>'
            + '<td>' + escape(item.decision === null ? 'Existing rules' : item.value === null ? 'Not configured' : item.value) + '<small>' + escape(source(item)) + '</small></td></tr>';
        }).join('') + '</tbody></table></div><button type="button" class="admin-action-btn" data-access="reset-quantities">Reset allowance overrides</button></details>'
        + '<label style="display:block;margin-top:16px">Reason for change<input data-access="reason" maxlength="500" placeholder="For example: complimentary access for a partner" style="display:block;width:100%;margin-top:6px"></label>'
        + '<div class="ob-access-actions"><button type="button" class="admin-action-btn" data-access="preview">Preview changes</button><button type="button" class="admin-action-btn" data-access="save" disabled>Save reviewed changes</button><button type="button" class="admin-action-btn" data-access="reload">Reload saved settings</button></div>'
        + '<p data-access="status" role="status" aria-live="polite"></p><div data-access="review"></div>'
        + '<details><summary>Access history</summary><button type="button" class="admin-action-btn" data-access="history">Load history</button><div data-access="history-list"></div></details></div>';
      preview = null;
      container.querySelectorAll('input,select').forEach(function (input) {
        input.addEventListener('input', invalidate);
        input.addEventListener('change', invalidate);
      });
      if (node('stop-renewal')) node('stop-renewal').addEventListener('change', function(){
        node('billing-stop-field').hidden = !node('stop-renewal').checked;
        node('billing-stop').disabled = !node('stop-renewal').checked;
      });
      node('enable-all').onclick = function () {
        container.querySelectorAll('[data-feature]').forEach(function (input) { input.value = 'enable'; });
        container.querySelectorAll('[data-feature-expiry]').forEach(function (input) { input.value = ''; });
        invalidate(); status('All listed features selected. Preview to review before saving.');
      };
      node('reset-features').onclick = function () { reset('[data-feature],[data-feature-expiry]'); };
      node('reset-quantities').onclick = function () { reset('[data-quantity],[data-quantity-expiry]'); };
      node('reload').onclick = load;
      node('preview').onclick = review;
      node('save').onclick = save;
      node('history').onclick = history;
    }
    function invalidate() {
      if (!current() || busy || pendingBilling) return;
      generation += 1; preview = null; operation = null;
      node('save').disabled = true; node('save').textContent = 'Save reviewed changes'; node('review').textContent = '';
    }
    function reset(selector) {
      container.querySelectorAll(selector).forEach(function (input) { input.value = ''; });
      invalidate(); status('Overrides reset in this draft. Preview and save to apply.');
    }
    function draft() {
      var plan = node('plan').value;
      var result = { expected_revision: model.state.revision, redesign_cohort: model.state.redesign_cohort,
        access_plan: plan ? { plan_id: plan, expires_at: expiry(node('plan-expiry').value, model.state.access_plan && model.state.access_plan.plan_id === plan ? model.state.access_plan.expires_at : null) } : null,
        feature_overrides: {}, quantity_overrides: {} };
      container.querySelectorAll('[data-feature]').forEach(function (input) {
        var id = input.getAttribute('data-feature');
        if (input.value) result.feature_overrides[id] = { enabled: input.value === 'enable',
          expires_at: expiry(container.querySelector('[data-feature-expiry="' + id + '"]').value, model.state.feature_overrides[id] && model.state.feature_overrides[id].enabled === (input.value === 'enable') ? model.state.feature_overrides[id].expires_at : null) };
      });
      container.querySelectorAll('[data-quantity]').forEach(function (input) {
        var id = input.getAttribute('data-quantity');
        if (input.value !== '') {
          var value = Number(input.value);
          if (!Number.isSafeInteger(value) || value < 0 || value > model.catalog.quantities[id].max) throw new Error('Check the limit for ' + model.catalog.quantities[id].label + '.');
          result.quantity_overrides[id] = { value: value,
            expires_at: expiry(container.querySelector('[data-quantity-expiry="' + id + '"]').value, model.state.quantity_overrides[id] && model.state.quantity_overrides[id].value === value ? model.state.quantity_overrides[id].expires_at : null) };
        }
      });
      return result;
    }
    async function load() {
      if (!current() || busy) return;
      lock(true);
      try {
        var data = await options.request(base);
        if (!current()) return;
        model = accept(data); if (!pendingBilling) operation = null; render();
        if (pendingBilling) restoreBillingRetry();
        else status('Saved access settings loaded.');
      } catch (error) { status(error.message || 'Access settings could not be loaded.', true); }
      finally { if (current()) lock(false); }
    }
    async function review() {
      if (!current() || busy || !model) return;
      try {
        var body = draft(), reason = node('reason').value.trim();
        var stopRenewal = !!(node('stop-renewal') && node('stop-renewal').checked);
        var billingStop = stopRenewal ? node('billing-stop').value : null;
        if(stopRenewal && !body.access_plan) throw new Error('Choose a complimentary access plan before stopping subscription renewal.');
        if(stopRenewal && ['period_end','immediately'].indexOf(billingStop) < 0) throw new Error('Choose when software billing should stop.');
        if (!reason) throw new Error('Add a reason so other administrators can understand this change.');
        preview = null; lock(true);
        var data = accept(await options.request(base + '/preview', { method: 'POST', body: body }));
        if (!current()) return;
        preview = { body: body, reason: reason, generation: generation, stopRenewal: stopRenewal, billingStop: billingStop };
        var changed = [];
        if(stopRenewal) changed.push(billingStop === 'immediately' ? 'Stop software subscription billing immediately. No new prorated invoice or refund is requested.' : 'Stop automatic software renewal at the end of the current paid or trial period.');
        if (JSON.stringify(body.access_plan) !== JSON.stringify(model.state.access_plan)) changed.push('Access plan: ' + (body.access_plan ? title(body.access_plan.plan_id) + ' (complimentary access)' : 'follow subscription and existing grants'));
        Object.keys(data.catalog.features).forEach(function (id) {
          if (JSON.stringify(body.feature_overrides[id]) !== JSON.stringify(model.state.feature_overrides[id])) changed.push(data.catalog.features[id].label + ': ' + (data.effective.features[id].enabled ? 'enabled' : 'disabled') + ' (' + source(data.effective.features[id]) + ')');
        });
        Object.keys(data.catalog.quantities).forEach(function (id) {
          if (JSON.stringify(body.quantity_overrides[id]) !== JSON.stringify(model.state.quantity_overrides[id])) changed.push(data.catalog.quantities[id].label + ': ' + (data.effective.quantities[id].value == null ? 'not configured' : data.effective.quantities[id].value) + ' (' + source(data.effective.quantities[id]) + ')');
        });
        node('review').innerHTML = '<p><strong>Review changes</strong></p>' + (changed.length ? '<ul>' + changed.map(function (line) { return '<li>' + escape(line) + '</li>'; }).join('') + '</ul>' : '<p>No access changes.</p>')
          + '<p>' + (stopRenewal ? 'Complimentary access is saved independently. If Stripe cannot confirm the billing change, the free access grant remains and billing needs reconciliation. Existing balances are not forgiven or refunded. Payment fees remain unchanged.' : 'Billing and payment fees remain unchanged.') + ' Spent usage is not reset.</p>';
        if (!changed.length) preview = null;
        status(changed.length ? 'Preview ready. Save to apply these changes.' : 'Nothing to save.');
      } catch (error) { status(error.message || 'Preview failed.', true); }
      finally { if (current()) lock(false); }
    }
    function balanceReview(data) {
      var balances = data && data.existing_balances;
      if (!balances) return '';
      function money(amount, currency) {
        var code = String(currency || 'USD').toUpperCase();
        try { var format = new Intl.NumberFormat(undefined,{style:'currency',currency:code}); return format.format(Number(amount || 0) / Math.pow(10,format.resolvedOptions().maximumFractionDigits)); }
        catch (_) { return String(amount || 0) + ' minor units ' + code; }
      }
      var lines = (balances.invoices || []).map(function(item){return 'Invoice ' + item.id + ': ' + money(item.amount_remaining,item.currency) + ' remaining · ' + title(item.status) + ' · automatic collection ' + (item.auto_advance === false ? 'stopped' : 'not confirmed stopped');});
      (balances.pending_items || []).forEach(function(item){lines.push('Pending item ' + item.id + ': ' + money(item.amount,item.currency) + ' · ' + (item.scope === 'this_subscription' ? 'this subscription' : 'other or unassigned customer item'));});
      return '<p><strong>Existing balances</strong></p>' + (lines.length ? '<ul>' + lines.map(function(line){return '<li>' + escape(line) + '</li>';}).join('') + '</ul><p>Review these separately in Stripe. No balance was forgiven or refunded.</p>' : '<p>No open invoices or pending invoice items were reported.</p>');
    }
    function restoreBillingRetry() {
      preview = pendingBilling.reviewed; operation = pendingBilling.operation;
      preview.generation = generation;
      node('save').textContent = 'Retry billing change';
      node('review').innerHTML = '<p><strong>Billing change incomplete</strong></p><p>' + escape(pendingBilling.message) + '</p><p>Retry the same reviewed ' + (preview.billingStop === 'immediately' ? 'immediate stop' : 'end-of-period stop') + ' to reconcile the original subscription. Editing is paused until its outcome is confirmed.</p>' + balanceReview(pendingBilling.data);
      status(pendingBilling.message, true);
    }
    async function save() {
      if (!current() || busy || !preview || preview.generation !== generation) return;
      // Reuse the operation ID after an uncertain network result. A changed draft
      // invalidates it; the server verifies both revision and operation content.
      operation = operation || (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'access-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      var reviewed = preview;
      lock(true); status('Saving access settings…');
      try {
        var body = Object.assign({}, reviewed.body, { operation_id: operation, reason: reviewed.reason });
        if (reviewed.stopRenewal) body.billing_stop = reviewed.billingStop;
        var data = await options.request(reviewed.stopRenewal ? '/billing/admin/experts/' + encodeURIComponent(expertId) + '/make-complimentary' : base,
          { method: reviewed.stopRenewal ? 'POST' : 'PUT', body: body });
        if (!current()) return;
        model = accept(data);
        if (reviewed.stopRenewal) {
          try { var refreshed = await options.request(base); if (!current()) return; model = accept(refreshed); } catch (_) {}
        }
        pendingBilling = null; operation = null; render();
        var message = 'Access settings saved. Billing was not changed.';
        if (reviewed.stopRenewal) message = data.billing_effect === 'canceled_immediately' ? 'Complimentary access saved. Software subscription cancellation is confirmed immediately.' : data.billing_effect === 'no_subscription' ? 'Complimentary access saved. No software subscription was on record.' : 'Complimentary access saved. Software renewal stops at the end of the current paid or trial period.';
        if (reviewed.stopRenewal) { message += data.reconciliation_required ? ' Existing balances need separate review; no balance was forgiven or refunded.' : ' No refund was issued.'; node('review').innerHTML = balanceReview(data); }
        status(message);
      } catch (error) {
        if (!current()) return;
        var partial = error.data || {};
        var needsRetry = reviewed.stopRenewal && partial.billing_completed !== true && (partial.reconciliation_required || !error.status || error.status >= 500);
        if (needsRetry) {
          var applied = partial.access_effect === 'applied' || partial.access_effect === 'operation_previously_applied';
          pendingBilling = { reviewed: reviewed, operation: operation, data: partial, message: applied ? 'Complimentary access was granted; the billing change is incomplete.' : 'Access or billing confirmation is pending. Retry the same change before making another grant.' };
          try { var fresh = await options.request(base); if (!current()) return; model = accept(fresh); render(); } catch (_) {}
          restoreBillingRetry();
        } else {
          if (error.status === 409) preview = null;
          status((error.status === 409 ? 'Settings changed elsewhere. Reload and review again. ' : '') + (error.message || 'Save failed. Retry with the same reviewed changes.'), true);
        }
      } finally { if (current()) lock(false); }
    }
    async function history() {
      if (!current() || busy) return;
      lock(true);
      try {
        var data = await options.request(base + '/history');
        if (!current()) return;
        node('history-list').innerHTML = (data.history || []).length ? '<ol>' + data.history.map(function (entry) {
          var before = {}, after = {};
          try { before = JSON.parse(entry.previous_values_json || '{}'); after = JSON.parse(entry.new_values_json || '{}'); } catch (_) {}
          var changes = [];
          if (JSON.stringify(before.access_plan) !== JSON.stringify(after.access_plan)) changes.push('Access plan: ' + (before.access_plan ? title(before.access_plan.plan_id) : 'default') + ' → ' + (after.access_plan ? title(after.access_plan.plan_id) : 'default'));
          ['feature_overrides', 'quantity_overrides'].forEach(function (group) {
            var previous = before[group] || {}, next = after[group] || {};
            Object.keys(Object.assign({}, previous, next)).forEach(function (id) {
              if (JSON.stringify(previous[id]) === JSON.stringify(next[id])) return;
              function describe(item) { return !item ? 'default' : (group === 'feature_overrides' ? item.enabled ? 'enabled' : 'disabled' : item.value) + (item.expires_at ? ' until ' + new Date(item.expires_at * 1000).toLocaleString() : ' until changed'); }
              changes.push(title(id) + ': ' + describe(previous[id]) + ' → ' + describe(next[id]));
            });
          });
          return '<li>Revision ' + escape(entry.new_revision || entry.revision || '') + ' · ' + escape(entry.created_at ? new Date(entry.created_at * 1000).toLocaleString() : '')
            + ' · Admin ' + escape(entry.actor_user_id || 'unavailable') + '<br>' + escape(entry.reason || '')
            + (changes.length ? '<ul>' + changes.map(function (change) { return '<li>' + escape(change) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
        }).join('') + '</ol>' : '<p>No access changes recorded.</p>';
      } catch (error) { status(error.message || 'History could not be loaded.', true); }
      finally { if (current()) lock(false); }
    }
    container.innerHTML = '<div class="admin-card" style="padding:20px;margin-top:18px"><h3>Plan &amp; feature access</h3><p data-access="status" role="status">Loading saved access…</p><button class="admin-action-btn" data-access="reload" type="button">Retry</button></div>';
    node('reload').onclick = load;
    load();
  }
  window.OB_ADMIN_EXPERT_ACCESS = { mount: mount };
})();
