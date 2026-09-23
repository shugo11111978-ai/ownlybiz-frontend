(function () {
  'use strict';
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.keys(value).sort().reduce(function (out, key) { out[key] = canonical(value[key]); return out; }, {});
    return value;
  }
  var preparing = new Map();
  window.obCreationAiFetch = async function (url, options) {
    options = options || {};
    var path = new URL(url, location.origin).pathname;
    var generation = /^\/api\/ai\/website-editor\/(field-preview|preview)$/.test(path) || path === '/api/experts/me/email-center/ai/generate';
    if (!generation || String(options.method || 'GET').toUpperCase() !== 'POST') return window.fetch(url, options);
    var context = window.OB_CLIENT_CONTEXT;
    var owner = context && context.capture('creation-ai-generation');
    var authorization = new Headers(options.headers).get('Authorization');
    function current() { return owner && owner.token && context.isCurrent(owner, {exactCredential:true}) && authorization === 'Bearer ' + owner.token; }
    if (!current()) throw new Error('Your account changed. Sign in again before generating.');
    var body = JSON.parse(options.body || '{}');
    var signature = JSON.stringify([owner.principal || owner.userId || owner.id || owner.token, new URL(url, location.origin).origin, path, canonical(body)]);
    if (!preparing.has(signature)) preparing.set(signature, (async function () {
      var bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature));
      var hash = Array.from(new Uint8Array(bytes)).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
      var key = 'ob_creation_ai_operation_' + hash;
      var id = sessionStorage.getItem(key);
      if (!id) { id = 'creation_' + crypto.randomUUID(); sessionStorage.setItem(key, id); }
      return {key:key,id:id};
    })());
    var operation;
    try { operation = await preparing.get(signature); } catch (e) { preparing.delete(signature); throw new Error('A retry-safe AI request could not be saved in this browser. Enable session storage before generating.'); }
    if (!current()) throw new Error('Your account changed. Sign in again before generating.');
    body.operation_id = operation.id;
    var response = await window.fetch(url, Object.assign({}, options, {body:JSON.stringify(body)}));
    // Fetch resolves when headers arrive. Keep the operation until the complete
    // response body is available; losing a 200 body must not buy another run.
    if (response.ok) {
      var result;
      try { result = await response.clone().json(); }
      catch (_) { throw new Error('The AI response was interrupted. Retry with the same inputs to check this request safely.'); }
      if (!current()) throw new Error('Your account changed. Sign in again before generating.');
      if (result && result.success === true) { sessionStorage.removeItem(operation.key); preparing.delete(signature); }
      else if (!result || result.success !== false) throw new Error('The AI response could not be confirmed. Retry with the same inputs to check this request safely.');
    }
    if (!current()) throw new Error('Your account changed. Sign in again before generating.');
    // Preserve the operation after an uncertain response. Retrying the same
    // input must not buy another provider generation, even after a page reload.
    return response;
  };
})();
