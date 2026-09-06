import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Local public-page rendering fixture. This server has no network-forwarding
// implementation, credentials, authenticated fixtures, or write endpoints.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portFlag = process.argv.indexOf('--port');
const port = Number(portFlag >= 0 ? process.argv[portFlag + 1] : 8917);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid fixture port');
if (!fs.existsSync(path.join(root, 'data/ownlybiz-platform.html'))) throw new Error('Run node build-public-shell.mjs first');
const origin = `http://127.0.0.1:${port}`;
const blocked = [];
const fixturePaths = new Map([
  ['/api/config', { success: true, analytics: {}, seo: {
    platform_schema_enabled: '1',
    platform_schema_name: 'Ownlybiz',
    platform_schema_url: 'https://ownlybiz.com/',
    platform_schema_logo_url: 'https://ownlybiz.com/favicon.svg',
    platform_schema_type: 'SoftwareApplication',
    platform_schema_description: 'Business software for independent experts.',
    platform_schema_same_as: '',
    platform_schema_contact_email: '',
  }, features: {} }],
  ['/api/tracking/config', { success: true, enabled: false, consent_required: true, settings: { enabled: false }, providers: {} }],
  ['/api/security/config', { success: true, settings: {}, security: {}, email: { configured: false } }],
  ['/api/auth/google-config', { success: true, enabled: false, client_id: '' }],
  ['/api/auth/apple-config', { success: true, enabled: false, client_id: '' }],
  // Match the candidate's public pricing-card defaults, not account data.
  ['/api/experts/platform-fees', { fee_starter_pct: 12, price_starter_monthly: 0, fee_pro_pct: 8, price_pro_monthly: 49, fee_scale_pct: 5, price_scale_monthly: 99 }],
  ['/api/marketing/featured-experts', { success: true, experts: [] }],
]);

function browserGuard() {
  const productionApi = 'https://ownlybiz-backend-production.up.railway.app';
  const counts = { blocked: 0, rewrittenReads: 0 };
  Object.defineProperty(window, '__OB_PUBLIC_FIXTURE__', { value: counts });
  const fail = () => { counts.blocked++; throw new TypeError('PUBLIC_FIXTURE_READ_ONLY'); };
  function localRead(value, method) {
    if (!['GET', 'HEAD'].includes(String(method || 'GET').toUpperCase())) return fail();
    const url = new URL(String(value && value.url || value), location.href);
    if (url.origin === productionApi) {
      counts.rewrittenReads++;
      return location.origin + url.pathname + url.search;
    }
    if (url.origin !== location.origin) return fail();
    return url.href;
  }
  for (const key of ['OWNLYBIZ_API_URL', 'OWNLY_API', '_OB_BACKEND', 'API_BASE', 'OWNLYBIZ_PROD_BACKEND']) {
    Object.defineProperty(window, key, { configurable: false, get: () => location.origin, set: () => {} });
  }
  window._obApplyRuntimeBackend = () => location.origin;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, options = {}) => {
    try {
      const method = options.method || (input && input.method) || 'GET';
      return nativeFetch(localRead(input, method), { ...options, method, credentials: 'omit' });
    } catch (error) { return Promise.reject(error); }
  };
  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) { return nativeOpen.call(this, method, localRead(url, method), ...rest); };
  navigator.sendBeacon = () => { counts.blocked++; return false; };
  window.WebSocket = function () { return fail(); };
  window.EventSource = function () { return fail(); };
  if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('PUBLIC_FIXTURE_READ_ONLY'));
}
const guardMarkup = `<script id="ownlybiz-local-public-fixture">(${browserGuard.toString()})();</script>`;
const policy = "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-src 'none'; media-src 'none'; object-src 'none'; form-action 'none'; base-uri 'self'";

function handlerFor(filename) {
  const context = {
    module: { exports: {} },
    require(name) { if (name === 'fs') return fs; if (name === 'path') return path; throw new Error(`Unexpected handler dependency ${name}`); },
    process: { cwd: () => root, env: { NODE_ENV: 'test', OWNLYBIZ_API_URL: origin } },
    URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
    fetch: async (url) => {
      const pathname = new URL(url, origin).pathname;
      const payload = fixturePaths.get(pathname);
      return { ok: !!payload, status: payload ? 200 : 404, json: async () => payload || { success: false, error: 'No public fixture' } };
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, filename), 'utf8'), context, { filename });
  return context.module.exports;
}
const shell = handlerFor('api/seo-shell.js');
const blogIndex = handlerFor('api/blog-index.js');
const sitemap = handlerFor('api/sitemap.js');
const types = { '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff' };

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, origin).pathname;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Ownlybiz-Fixture', 'public-read-only');
  response.setHeader('Content-Security-Policy', policy);
  if (!['GET', 'HEAD'].includes(request.method)) {
    blocked.push({ method: request.method, pathname });
    response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ success: false, error: 'Fixture blocks every write request' }));
    return;
  }
  const send = (body, type = 'application/json') => {
    response.setHeader('Content-Type', `${type}; charset=utf-8`);
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  if (pathname === '/__fixture/status') { send(JSON.stringify({ origin, fixture: true, blocked, publicFixturePaths: [...fixturePaths.keys()] })); return; }
  if (fixturePaths.has(pathname)) { send(JSON.stringify(fixturePaths.get(pathname))); return; }
  if (pathname.startsWith('/api/') && !['/api/blog-index', '/api/seo-shell'].includes(pathname)) {
    response.statusCode = 404;
    send(JSON.stringify({ success: false, error: 'Public fixture does not implement this endpoint' }));
    return;
  }
  if (pathname.startsWith('/assets/') || pathname.startsWith('/data/') || pathname === '/favicon.svg') {
    let target;
    try { target = path.resolve(root, '.' + decodeURIComponent(pathname)); } catch (_) { response.statusCode = 400; send('Invalid path', 'text/plain'); return; }
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) { response.statusCode = 404; send('Not found', 'text/plain'); return; }
    response.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
    response.end(request.method === 'HEAD' ? undefined : fs.readFileSync(target));
    return;
  }
  try {
    const handler = ['/blog/index.json', '/api/blog-index'].includes(pathname) ? blogIndex : pathname === '/sitemap.xml' ? sitemap : shell;
    const adapter = {
      setHeader: (name, value) => { if (name.toLowerCase() !== 'cache-control') response.setHeader(name, value); },
      status: (code) => { response.statusCode = code; return adapter; },
      send: (value) => {
        const body = String(value);
        response.end(request.method === 'HEAD' ? undefined : /text\/html/.test(String(response.getHeader('Content-Type'))) ? body.replace(/<head\b[^>]*>/i, match => match + guardMarkup) : body);
      },
      json: value => send(JSON.stringify(value)),
      end: () => response.end()
    };
    await handler({ url: request.url, headers: { host: `127.0.0.1:${port}`, 'x-forwarded-proto': 'http' } }, adapter);
  } catch (error) {
    response.statusCode = 500;
    send(JSON.stringify({ error: error.message }));
  }
});
server.on('upgrade', (_request, socket) => socket.destroy());
server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({ origin, mode: 'public GET/HEAD fixtures only', externalBackendRequests: false, source: root })));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
