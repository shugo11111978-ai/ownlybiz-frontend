import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Offline regression proof: real handlers/libraries, fixture-only file reads and
// fetch. No server, network passthrough, credentials or provider operations.
const root = fileURLToPath(new URL('..', import.meta.url));
const base = 'cd28d669eb7fa710688ef1f38a6aab19305bcb3a';
const staging = 'ownlybiz-git-staging-shugo11111978-4289s-projects.vercel.app';
const robots = 'noindex,nofollow';
const pinned = file => execFileSync('git', ['show', `${base}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const current = file => readFileSync(path.join(root, file), 'utf8');
const baselineSource = pinned('api/seo-shell.js');
const candidateSource = current('api/seo-shell.js');
const baseConfigText = pinned('vercel.json');
const configText = current('vercel.json');
const baseConfig = JSON.parse(baseConfigText);
const config = JSON.parse(configText);
let cases = 0;

const firstRule = { src: '/(.*)', has: [{ type: 'host', value: staging }], headers: { 'X-Robots-Tag': robots }, continue: true };
assert.deepEqual(config.routes[0], firstRule, 'first rule is header-only, exact host, every method, and continues routing');
assert.deepEqual({ ...config, routes: config.routes.slice(1) }, baseConfig, 'every existing route and configuration value is unchanged');
const addedLines = configText.split('\n').filter(line => line.includes(staging));
assert.equal(addedLines.length, 1);
assert.equal(configText.replace(`${addedLines[0]}\n`, ''), baseConfigText, 'removing the new route restores original configuration bytes');
for (const field of ['dest', 'status', 'methods', 'method']) assert.equal(Object.hasOwn(config.routes[0], field), false);
cases++;

// A structural routing model, not a claim to simulate the Vercel CDN. Hosted
// GET/HEAD acceptance must independently verify the real response header.
const otherHosts = ['ownlybiz.com', 'www.ownlybiz.com', 'lunapsychics.com', 'exampleexpert.ownlybiz.com', 'preview.vercel.app', 'localhost', `x${staging}`, staging.replace('staging', 'production'), `${staging}.example.com`];
for (const host of [staging, ...otherHosts]) {
  for (const method of ['GET', 'HEAD', 'POST', 'OPTIONS', 'DELETE']) {
    for (const url of ['/', '/api/seo-shell', '/api/example', '/assets/app.js', '/assets/ownlybiz-public/' + 'a'.repeat(64) + '.js', '/data/example.json', '/cgi-sys/defaultwebpage.cgi', '/robots.txt', '/sitemap.xml', '/llms.txt', '/blog/index.json', '/favicon.svg', '/.well-known/example', '/unknown']) {
      const matches = new RegExp(`^${firstRule.src}$`).test(url) && firstRule.has.every(condition => condition.type === 'host' && condition.value === host);
      assert.equal(matches, host === staging, `${method} ${host}${url}: exact-host header scope`);
      cases++;
    }
  }
}

const raw = '<!doctype html><html lang="en"><head><title>Original</title><meta name="robots" content="index,follow"></head><body><div id="raw-shell"></div><div class="mkt-page active" id="mkt-page-home"><h1>Home</h1><section class="legal-page" id="legal-page" aria-live="polite"></section></div><div class="mkt-page" id="mkt-page-pricing"><h1>Pricing</h1></div><div class="mkt-page" id="mkt-page-blog"><!--OB_BLOG_SSR-->\n        <div class="ob-blog-loading">Loading Ownlybiz guides...</div></div><div id="view-5">UNCHANGED SESSION MARKUP</div></body></html>';
const posts = [{ slug: 'guide', title: 'A useful guide', date: '2026-09-01', summary: 'Useful original information.', image: '/assets/blog/guide.png', sections: [{ heading: 'Steps', body: ['Original instructions.'] }] }];
const docs = Object.fromEntries(['terms', 'privacy', 'independent', 'platform'].map(key => [key, { title: `${key} original title`, updated: 'Original update date', body: [['p', 'Unchanged legal content.']] }]));
const expert = { slug: 'exampleexpert', name: 'Fixture Expert', title: 'Private sessions', website_published: 1, allow_indexing: 1, primary_domain: { custom_domain: 'lunapsychics.com' }, website_content: { ai_pages: [{ slug: 'guide', title: 'Published fixture guide', published: true, sections: [{ title: 'Original advice', body: 'A complete authored explanation.' }] }] } };
const libraries = new Map(['lib/expert-public.js', 'lib/expert-render.js'].map(file => {
  const source = pinned(file);
  assert.equal(current(file), source, `${file}: comparison uses unchanged real dependency`);
  return [file, source];
}));
const files = new Map([
  ['index.html', raw],
  ['data/ownlybiz-platform.html', raw.replace('raw-shell', 'platform-shell')],
  ['data/ownlybiz-expert.html', raw.replace('<html lang="en">', '<html lang="en" data-ob-expert-delivery="1">').replace('raw-shell', 'expert-shell')],
  ['data/ownlybiz-blog-posts.json', JSON.stringify(posts)],
  ['data/ownlybiz-platform-legal.json', JSON.stringify(docs)],
].map(([file, value]) => [path.join(root, file), value]));
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [Date.UTC(2026, 8, 19)])); }
  static now() { return Date.UTC(2026, 8, 19); }
}

function createHandler(source, options = {}) {
  const calls = [];
  const context = {
    module: { exports: {} }, URL, URLSearchParams, AbortController, Date: FixedDate, setTimeout, clearTimeout,
    process: { cwd: () => root, env: { NODE_ENV: 'test', OWNLYBIZ_API_URL: 'https://fixture.invalid', VERCEL_ENV: options.environment || 'production' } },
    require(name) {
      if (name === 'path') return path;
      if (name === 'fs') return { readFileSync(filename) {
        if (!files.has(filename) || options.missingExpertArtifact && filename.endsWith('ownlybiz-expert.html')) throw new Error('Missing fixture');
        return files.get(filename);
      } };
      const dependency = name.replace(/^\.\.\//, '') + '.js';
      assert.ok(libraries.has(dependency), `Only reviewed dependencies allowed: ${name}`);
      const child = { ...context, module: { exports: {} } };
      vm.runInNewContext(libraries.get(dependency), child, { filename: dependency });
      return child.module.exports;
    },
    async fetch(value, init = {}) {
      const url = new URL(value);
      assert.equal(url.origin, 'https://fixture.invalid');
      assert.equal(init.method || 'GET', 'GET');
      assert.deepEqual(Object.keys(init.headers || {}), ['accept']);
      calls.push(url.href);
      const response = (status, body) => ({ status, ok: status === 200, json: async () => body });
      if (url.pathname === '/api/config') {
        if (options.configFailure) throw new Error('Offline config unavailable');
        return response(200, { seo: { platform_schema_enabled: '1', platform_schema_name: 'Ownlybiz', platform_schema_url: 'https://ownlybiz.com/', platform_schema_type: 'SoftwareApplication' } });
      }
      if (url.pathname === '/api/domains/lookup') return response(200, { slug: 'exampleexpert' });
      assert.match(url.pathname, /^\/api\/experts\/[^/]+$/);
      const slug = decodeURIComponent(url.pathname.split('/').pop());
      if (slug === 'transientexpert') return response(503, {});
      if (slug === 'missingexpert' || slug === 'liranprodtest') return response(404, {});
      if (slug !== 'exampleexpert') return response(404, {});
      return response(200, options.noPrimary ? { ...expert, primary_domain: undefined } : options.noIndex ? { ...expert, allow_indexing: 0 } : expert);
    },
  };
  vm.runInNewContext(source, context, { filename: 'api/seo-shell.js' });
  return { handler: context.module.exports, calls };
}

async function request(source, host, url, method, options = {}) {
  const { handler, calls } = createHandler(source, options);
  const result = { headers: {}, status: 0, body: '', calls };
  const response = {
    setHeader(key, value) { result.headers[key.toLowerCase()] = value; },
    status(code) { result.status = code; return this; },
    send(body) { result.body = body; },
    end() {},
  };
  await handler({ url, method, headers: { host, ...options.headers } }, response);
  return result;
}
const metaRobots = body => [...body.matchAll(/<meta name="robots" content="([^"]*)">/g)].map(match => match[1]);
const metadata = body => {
  const match = body.match(/<script id="ob-expert-site-metadata">window\.__OB_EXPERT_SITE__=([\s\S]*?);<\/script>/);
  return match ? JSON.parse(match[1]) : null;
};
const withoutRobots = result => ({ ...result,
  headers: Object.fromEntries(Object.entries(result.headers).filter(([key]) => key !== 'x-robots-tag')),
  body: result.body.replace(/(<meta name="robots" content=")[^"]*(">)/g, '$1POLICY$2').replace(/("robots":")[^"]*(")/g, '$1POLICY$2'),
});
const routes = [
  '/', '/how', '/features', '/pricing', '/experts', '/contact', '/?utm_source=fixture',
  '/legal/terms', '/legal/privacy', '/legal/independent-professional-terms', '/legal/platform-policy', '/terms', '/privacy',
  '/blog', '/blog/guide', '/blog/missing', '/blog/guide/extra', '/features/missing', '/legal/missing',
  '/?expert=exampleexpert', '/about?expert=exampleexpert', '/book?expert=exampleexpert', '/guide?expert=exampleexpert', '/missing?expert=exampleexpert',
  '/exampleexpert', '/exampleexpert/book', '/missingexpert', '/?expert=missingexpert', '/?expert=transientexpert', '/liranprodtest',
  '/book?expert=exampleexpert&checkout_session_id=callback', '/pricing?payment_intent=pi_fixture&redirect_status=succeeded', '/?token=callback', '/?state=callback',
  '/auth/callback', '/checkout', '/billing', '/connect/return', '/session/fixture', '/group/fixture', '/dash/fixture', '/admin', '/login', '/account', '/reset-password',
  '/favicon.ico', '/cgi-sys/defaultwebpage.cgi', '/bad%2fpath', '/%E0%A4%A',
];
for (const environment of ['production', 'preview']) {
 for (const method of ['GET', 'HEAD']) {
  for (const host of [staging, ...otherHosts]) {
    for (const url of routes) {
      const original = await request(baselineSource, host, url, method, { environment });
      const updated = await request(candidateSource, host, url, method, { environment });
      const label = `${environment} ${method} ${host}${url}`;
      if (host !== staging && environment !== 'preview') assert.deepEqual(updated, original, `${label}: nonmatching response is byte-for-byte unchanged`);
      else {
        assert.equal(updated.headers['x-robots-tag'], robots, `${label}: final header cannot be overridden`);
        if (updated.body) assert.deepEqual(metaRobots(updated.body), [robots], `${label}: exactly one matching HTML robots declaration`);
        if (metadata(updated.body)) assert.equal(metadata(updated.body).robots, robots, `${label}: hydration policy agrees`);
        assert.deepEqual(withoutRobots(updated), withoutRobots(original), `${label}: status, cache, redirects, canonicals, content and requests preserved`);
      }
      cases++;
    }
  }
 }
}

for (const method of ['GET', 'HEAD']) {
  for (const options of [{ noPrimary: true }, { noIndex: true }, { missingExpertArtifact: true }, { headers: { cookie: 'fixture=1' } }, { headers: { authorization: 'Fixture offline-only' } }]) {
    const url = '/book?expert=exampleexpert';
    for (const host of [staging, ...otherHosts]) {
      const original = await request(baselineSource, host, url, method, options);
      const updated = await request(candidateSource, host, url, method, options);
      if (host !== staging) assert.deepEqual(updated, original);
      else {
        assert.equal(updated.headers['x-robots-tag'], robots);
        assert.deepEqual(metaRobots(updated.body), [robots]);
        if (metadata(updated.body)) assert.equal(metadata(updated.body).robots, robots);
        assert.deepEqual(withoutRobots(updated), withoutRobots(original));
      }
      cases++;
    }
  }
  const fallback = await request(candidateSource, staging, '/', method, { configFailure: true });
  assert.equal(fallback.status, 200);
  assert.equal(fallback.headers['x-robots-tag'], robots);
  assert.deepEqual(metaRobots(fallback.body), [robots]);
  const forwarded = await request(candidateSource, 'internal.invalid', '/', method, { headers: { 'x-forwarded-host': staging } });
  assert.equal(forwarded.headers['x-robots-tag'], robots, 'uses established trusted forwarded-host normalization');
  const productionForwarded = { headers: { 'x-forwarded-host': 'ownlybiz.com' } };
  assert.deepEqual(await request(candidateSource, 'internal.invalid', '/', method, productionForwarded), await request(baselineSource, 'internal.invalid', '/', method, productionForwarded));
  cases += 3;
}

// Hydration uses the actual client SEO consumer, not a test-defined substitute.
// The verified primary-domain query previously declared index.
const runtime = pinned('index.html');
const currentRuntime = current('index.html');
const runtimeStart = currentRuntime.indexOf('function applyExpertSeo(data){');
const runtimeEnd = currentRuntime.indexOf('window.obApplyExpertSeo = applyExpertSeo;', runtimeStart);
assert.ok(runtimeStart >= 0 && runtimeEnd > runtimeStart);
const runtimeSeo = currentRuntime.slice(runtimeStart, runtimeEnd);
const oldQuery = await request(baselineSource, staging, '/book?expert=exampleexpert', 'GET');
assert.match(metadata(oldQuery.body).robots, /^index,follow/, 'baseline reproduces the indexing gap');
const newQuery = await request(candidateSource, staging, '/book?expert=exampleexpert', 'GET');
const site = metadata(newQuery.body);
for (const pathname of ['/book', '/about', '/guide']) {
  const output = {};
  const context = { URLSearchParams, isExpertRoute: () => true, expertTitle: () => expert.name, expertDescription: () => '', window: { __OB_EXPERT_SITE__: site }, location: { pathname, search: '?expert=exampleexpert', origin: `https://${staging}` }, document: { title: '', getElementById: () => null }, setMeta: (key, value) => { output[key] = value; }, setProp() {}, setCanonical: value => { output.canonical = value; }, setJsonLd() {}, loadGa4() {} };
  vm.runInNewContext(runtimeSeo + '\napplyExpertSeo(' + JSON.stringify(expert) + ');', context);
  assert.equal(output.robots, robots, 'hydration/navigation cannot restore indexing');
  assert.equal(output.canonical, `https://lunapsychics.com${pathname}`, 'primary-domain canonical remains unchanged');
  cases++;
}
// Only the four approved robots setters may differ in the shared application.
const beforeLines = runtime.split('\n');
const afterLines = currentRuntime.split('\n');
assert.equal(afterLines.length, beforeLines.length);
const changedLines = afterLines.flatMap((line, index) => line === beforeLines[index] ? [] : [index]);
assert.equal(changedLines.length, 4, 'exactly four application lines change');
for (const index of changedLines) {
  assert.match(beforeLines[index], /(?:setMeta\('robots'|meta\('name','robots'|metaByName\('robots')/);
  assert.ok(afterLines[index].includes("window.OWNLYBIZ_IS_STAGING === true"));
  assert.ok(afterLines[index].includes(staging));
}
cases++;

function clientHelpers(source) {
  function between(start, end) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from + start.length);
    assert.ok(from >= 0 && to > from, `Unambiguous helper boundaries: ${start}`);
    assert.equal(source.indexOf(start, from + start.length), -1, `Unique helper: ${start}`);
    return source.slice(from, to);
  }
  return [
    between('window.obApplyMarketingSeo = function(page) {', '\n};') + '\n};',
    between('function obApplyBlogSeo(post, posts, missing){', '\n  async function loadBlog()'),
    between('function applyPlatformSeo(seo){', 'window.obApplyPlatformSeo = applyPlatformSeo;'),
    between('function applyExpertSeo(data){', 'window.obApplyExpertSeo = applyExpertSeo;'),
  ].join('\n');
}
const oldHelpers = clientHelpers(runtime);
const newHelpers = clientHelpers(currentRuntime);

function clientResult(helpers, host, flag, writer, variant) {
  const children = [];
  function element(tag) {
    return { tag, attrs: {}, textContent: '', setAttribute(key, value) { this.attrs[key] = String(value); }, remove() { const index = children.indexOf(this); if (index >= 0) children.splice(index, 1); } };
  }
  const document = { title: '', head: {
    appendChild(node) { children.push(node); },
    querySelector(selector) {
      const match = selector.match(/^(\w+)\[([^=]+)="([^"]*)"\]$/);
      assert.ok(match, selector);
      return children.find(node => node.tag === match[1] && node.attrs[match[2]] === match[3]) || null;
    },
  }, createElement: element, getElementById: id => children.find(node => node.id === id) || null };
  const writes = {};
  const settings = { title: 'Configured title', description: 'Original description', robots: variant === 'explicit-noindex' ? 'noindex,follow' : 'index,follow', canonical: 'https://ownlybiz.com/', schemaName: 'Ownlybiz' };
  const context = { URLSearchParams, document, location: { hostname: host, pathname: '/book', search: writer === 'expert' ? '?expert=exampleexpert' : '', origin: `https://${host}` },
    OWNLYBIZ_IS_STAGING: flag, _obPlatformSeoSettings: settings,
    __OB_EXPERT_SITE__: variant === 'no-site' ? undefined : variant === 'wrong-site' ? { ...site, slug: 'anotherexpert' } : { ...site, robots: 'index,follow' },
    obMarketingSeoPageFromPath: () => 'home', obMarketingSeoForPage: () => ({ title: 'Home', description: 'Original description', path: '/' }),
    obBlogUrl: post => '/blog/' + post.slug, platformSeoDefaults: () => settings, isPlatformSeoRoute: () => true, isExpertRoute: () => true,
    expertTitle: () => expert.name, expertDescription: () => '', buildPlatformSchema: () => ({ '@type': 'Organization', name: 'Ownlybiz' }),
    setMeta: (key, value) => { writes[key] = value; }, setProp: (key, value) => { writes[key] = value; }, setCanonical: value => { writes.canonical = value; }, setVerification() {}, setJsonLd: (key, value) => { writes[key] = value; }, loadGa4() {},
  };
  context.window = context;
  vm.runInNewContext(helpers, context);
  const calls = { marketing: "obApplyMarketingSeo('home')", blog: `obApplyBlogSeo(${variant === 'missing' ? 'null' : JSON.stringify(posts[0])},${JSON.stringify(posts)},${variant === 'missing'})`, platform: 'applyPlatformSeo({})', expert: 'applyExpertSeo(' + JSON.stringify(variant === 'explicit-noindex' ? { ...expert, allow_indexing: 0 } : expert) + ')' };
  vm.runInNewContext(calls[writer], context);
  const domRobots = document.head.querySelector('meta[name="robots"]')?.attrs.content;
  return JSON.parse(JSON.stringify({ title: document.title, writes, children, robots: domRobots || writes.robots }));
}
function withoutClientRobots(result) {
  const copy = structuredClone(result);
  delete copy.robots;
  delete copy.writes.robots;
  for (const node of copy.children) if (node.tag === 'meta' && node.attrs.name === 'robots') node.attrs.content = 'POLICY';
  return copy;
}
for (const host of [staging, ...otherHosts]) {
  for (const flag of [true, false, undefined, 'true', 1]) {
    for (const writer of ['marketing', 'blog', 'platform', 'expert']) {
      for (const variant of ['default', 'explicit-noindex', 'no-site', 'wrong-site', 'missing']) {
        const original = clientResult(oldHelpers, host, flag, writer, variant);
        const updated = clientResult(newHelpers, host, flag, writer, variant);
        const label = `${host} flag=${String(flag)} ${writer}/${variant}`;
        if (original.robots !== undefined && (host === staging || flag === true)) {
          assert.equal(updated.robots, robots, label);
          if (updated.writes.robots !== undefined) assert.equal(updated.writes.robots, robots, `${label}: platform writer before delegated marketing`);
          assert.deepEqual(withoutClientRobots(updated), withoutClientRobots(original), `${label}: only robots changes`);
        } else assert.deepEqual(updated, original, `${label}: production false/unset/nonboolean and nonmatching behavior unchanged`);
        cases++;
      }
    }
  }
}
console.log(JSON.stringify({ status: 'PASS', cases, base, sourceSha256: createHash('sha256').update(candidateSource).digest('hex'), configSha256: createHash('sha256').update(configText).digest('hex'), runtimeSha256: createHash('sha256').update(currentRuntime).digest('hex'), scope: 'offline fixtures only; CDN header behavior still requires hosted verification' }));
