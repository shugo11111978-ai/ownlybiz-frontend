import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Offline HTTP-handler tests only: no browser, payment/session workflow, real
// backend request, deployment or provider mutation is exercised by this suite.
const root = path.resolve(new URL('..', import.meta.url).pathname);
const raw = '<!doctype html><html lang="en"><head><title>Original</title></head><body><div id="raw-shell"></div><div class="mkt-page active" id="mkt-page-home"><h1>Home</h1><section class="legal-page" id="legal-page" aria-live="polite"></section></div><div class="mkt-page" id="mkt-page-pricing"><h1>Pricing</h1></div><div class="mkt-page" id="mkt-page-blog"><!--OB_BLOG_SSR-->\n        <div class="ob-blog-loading">Loading Ownlybiz guides...</div></div><div id="view-5">UNCHANGED SESSION MARKUP</div></body></html>';
const compact = raw.replace('id="raw-shell"', 'id="compact-shell"');
const publicSeo = { platform_schema_enabled: '1', platform_schema_name: 'Ownlybiz', platform_schema_url: 'https://ownlybiz.com/', platform_schema_logo_url: 'https://ownlybiz.com/favicon.svg', platform_schema_type: 'SoftwareApplication', platform_schema_description: 'Configured platform description', platform_schema_same_as: '', platform_schema_contact_email: '' };
const posts = [
  { slug: 'guide', title: 'A useful guide', date: '2026-06-14', dateModified: '2026-09-06', summary: 'Guide summary', image: '/assets/blog/guide.png', tags: ['Email'], sections: [{ heading: 'Steps', body: ['Original instruction.'] }], relatedFeatures: ['Email Center'] },
  { slug: 'unrelated', title: 'Unrelated guide', date: 'not-a-date', tags: ['Pricing'] },
  { slug: 'related', title: 'Related guide', date: '2026-02-31', tags: ['email'] },
];
const docs = Object.fromEntries(['terms', 'privacy', 'independent', 'platform'].map((key) => [key, { kicker: 'Original kicker', title: `${key} original title`, updated: 'Original update date', body: [['h2', 'Original section'], ['p', 'Unchanged legal content <&>.'], ['links', [['Official reference', 'https://example.com/reference'], ['Unsafe', 'javascript:alert(1)']]]] }]));

function createHandler(file, options = {}) {
  const calls = [];
  const files = new Map([
    [path.join(root, 'index.html'), raw],
    [path.join(root, 'data', 'ownlybiz-blog-posts.json'), JSON.stringify(posts)],
    [path.join(root, 'data', 'ownlybiz-platform-legal.json'), JSON.stringify(docs)],
  ]);
  if (!options.missingCompact) files.set(path.join(root, 'data', 'ownlybiz-platform.html'), compact);
  if (options.missingLegal) files.delete(path.join(root, 'data', 'ownlybiz-platform-legal.json'));
  const context = {
    module: { exports: {} },
    require(name) {
      if (name === 'path') return path;
      assert.equal(name, 'fs');
      return { readFileSync(filename) { if (options.actualFiles) return readFileSync(filename, 'utf8'); if (!files.has(filename)) throw new Error('Missing fixture'); return files.get(filename); } };
    },
    process: { cwd: () => root, env: { NODE_ENV: 'test' } },
    URL, URLSearchParams, AbortController, clearTimeout,
    setTimeout: (callback, ms) => setTimeout(callback, options.fastTimers ? Math.min(ms, 2) : ms),
    Date: options.clock ? class extends Date { static now() { return options.clock.now; } } : Date,
    fetch: async (url, init) => {
      calls.push(url);
      if (String(url).endsWith('/api/config')) {
        if (options.configError) throw new Error('Offline config failure');
        if (options.configTimeout) return new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
        return { ok: true, json: async () => ({ private_unrelated: 'MUST_NOT_LEAK', seo: options.configAbsent ? null : { ...publicSeo, ...options.seo, private_unrelated: 'MUST_NOT_LEAK' } }) };
      }
      if (options.expert && String(url).includes('/api/domains/lookup')) return { ok: true, json: async () => ({ slug: options.expert.slug }) };
      return { ok: !!options.expert, json: async () => options.expert };
    },
  };
  vm.runInNewContext(readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  return { handler: context.module.exports, calls };
}

async function request(url, options = {}, file = 'api/seo-shell.js') {
  const { handler, calls } = options.instance || createHandler(file, options);
  const result = { headers: {}, code: 0, body: '', calls };
  const res = {
    setHeader(key, value) { result.headers[key] = value; },
    status(code) { result.code = code; return this; },
    send(body) { result.body = body; },
    end() {},
  };
  await handler({ url, method: options.method || 'GET', headers: { host: options.host || 'ownlybiz.com' } }, res);
  return result;
}

for (const host of ['ownlybiz.com', 'preview.vercel.app', 'localhost']) {
  const page = await request('/pricing/?utm_source=test', { host });
  assert.equal(page.code, 200);
  assert.match(page.body, /id="compact-shell"/);
  assert.match(page.body, /<div class="mkt-page active" id="mkt-page-pricing">/);
  assert.match(page.body, /rel="canonical" href="https:\/\/ownlybiz.com\/pricing"/);
  assert.match(page.body, /id="ob-platform-schema"/);
  assert.match(page.body, /https:\/\/ownlybiz.com\/#organization/);
  assert.equal(page.calls.length, 1, 'only optional public config is requested');
  assert.match(page.calls[0], /\/api\/config$/);
  assert.match(page.body, /Configured platform description/);
  assert.doesNotMatch(page.body, /MUST_NOT_LEAK/);
}

for (const url of ['/', '/how', '/features/', '/pricing', '/experts', '/contact', '/blog', '/blog/guide', '/legal/terms', '/legal/privacy', '/legal/independent-professional-terms', '/legal/platform-policy', '/terms', '/privacy']) {
  const requested = `${url}?utm_source=test%20source&gclid=abc`;
  const redirect = await request(requested, { host: 'www.ownlybiz.com' });
  assert.equal(redirect.code, 308);
  assert.equal(redirect.headers.Location, `https://ownlybiz.com${requested}`);
  assert.equal(redirect.body, '');
  assert.equal(redirect.calls.length, 0, 'www redirects do not fetch schema config');
}
assert.equal((await request('/pricing', { host: 'www.ownlybiz.com', method: 'HEAD' })).code, 308);
const postRequest = await request('/pricing', { host: 'www.ownlybiz.com', method: 'POST' });
assert.equal(postRequest.code, 200, 'new canonical redirect only applies to GET/HEAD');
assert.match(postRequest.body, /id="raw-shell"/);
assert.equal(postRequest.calls.length, 0, 'non-GET/HEAD requests keep original delivery without SEO config lookup');

for (const url of ['/signup', '/login', '/checkout', '/billing', '/session/test', '/dash/test', '/admin', '/reset-password', '/pricing?session_id=callback', '/?expert=missingexpert', '/?token=callback', '/?checkout_session_id=callback', '/?unknown=1']) {
 for (const host of ['ownlybiz.com', 'www.ownlybiz.com']) {
  const page = await request(url, { host });
  assert.equal(page.code, 200, `${url} keeps original status`);
  assert.match(page.body, /id="raw-shell"/, `${url} keeps original shell`);
  assert.match(page.body, /UNCHANGED SESSION MARKUP/);
  assert.doesNotMatch(page.body, /id="ob-platform-schema"/);
  assert.ok(page.calls.every((url) => !url.endsWith('/api/config')), 'protected routes do not fetch SEO config');
 }
}
for (const url of ['/pricing?UTM_SOURCE=case', '/pricing?state=auth', '/pricing?payment_intent=pi_example', '/pricing?redirect_status=succeeded', '/pricing?expert=exampleexpert', '/blog/missing', '/potential-expert-slug']) {
  const page = await request(url, { host: 'www.ownlybiz.com' });
  assert.notEqual(page.code, 308, url);
  assert.ok(page.calls.every((url) => !url.endsWith('/api/config')));
}
const missingExpert = await request('/potential-expert-slug');
assert.equal(missingExpert.code, 200, 'failed expert lookup is not converted into an SEO 404');
assert.match(missingExpert.body, /id="raw-shell"/);

const expert = { slug: 'exampleexpert', name: 'Independent Expert', title: 'Consultant' };
for (const [url, host] of [['/exampleexpert/book', 'ownlybiz.com'], ['/book', 'exampleexpert.ownlybiz.com'], ['/book', 'example-expert.com'], ['/?expert=exampleexpert', 'ownlybiz.com']]) {
  const page = await request(url, { host, expert });
  assert.equal(page.code, 200);
  assert.match(page.body, /id="raw-shell"/);
  assert.doesNotMatch(page.body, /id="ob-platform-schema"/);
  assert.match(page.body, /UNCHANGED SESSION MARKUP/);
}
const pricedContentPage = await request('/exampleexpert', {
  expert: {
    ...expert,
    website_content: {
      ai_pages: [{ slug: 'one-dollar-reading', title: '$1 Reading', nav_label: '$1 Reading', published: true, show_in_nav: true }],
    },
  },
});
assert.match(pricedContentPage.body, /"nav_label":"\$1 Reading"/, 'expert-authored dollar copy survives public preload injection exactly');
assert.match(pricedContentPage.body, /"title":"\$1 Reading"/, 'public preload preserves replacement-pattern text in every field');
const redirected = await request('/exampleexpert/book', { expert: { ...expert, primary_domain: { custom_domain: 'example-expert.com' } } });
assert.equal(redirected.code, 308);
assert.equal(redirected.headers.Location, 'https://example-expert.com/book');

for (const [url, canonical] of [['/legal/terms', '/legal/terms'], ['/privacy', '/legal/privacy'], ['/legal/privacy/', '/legal/privacy'], ['/legal/independent-professional-terms', '/legal/independent-professional-terms'], ['/legal/platform-policy', '/legal/platform-policy']]) {
  const page = await request(url);
  assert.equal(page.code, 200);
  assert.ok(page.body.includes(`rel="canonical" href="https://ownlybiz.com${canonical}"`));
  assert.match(page.body, /Unchanged legal content &lt;&amp;&gt;\./);
  assert.match(page.body, /class="legal-page active"/);
  assert.match(page.body, /class="ob-legal-route"/);
  assert.doesNotMatch(page.body, /javascript:alert/);
}
const fallback = await request('/legal/privacy', { missingCompact: true, missingLegal: true });
assert.match(fallback.body, /id="raw-shell"/);
assert.match(fallback.body, /<title>Privacy Policy - Ownlybiz<\/title>/);

const article = await request('/blog/guide');
assert.equal(article.code, 200);
assert.match(article.body, /<h1>A useful guide<\/h1>/);
assert.match(article.body, /"mainEntityOfPage":"https:\/\/ownlybiz.com\/blog\/guide"/);
assert.match(article.body, /"datePublished":"2026-06-14"/);
assert.match(article.body, /"dateModified":"2026-09-06"/);
assert.match(article.body, /property="og:type" content="article"/);
assert.match(article.body, /class="ob-blog-feature-chip" href="\/features"/);
assert.doesNotMatch(article.body, /Email campaign angle/);
assert.ok(article.body.indexOf('Related guide') < article.body.indexOf('Unrelated guide'));
for (const url of ['/blog/missing', '/blog/guide/extra', '/blog/%E0%A4%A', '/features/missing', '/legal/missing']) {
  const page = await request(url);
  assert.equal(page.code, 404, url);
  assert.equal(page.headers['X-Robots-Tag'], 'noindex,follow');
  assert.doesNotMatch(page.body, /"@type":"(?:Article|CollectionPage|Organization)"/);
}

const sitemap = await request('/sitemap.xml', {}, 'api/sitemap.js');
for (const pathname of ['/', '/how', '/features', '/pricing', '/experts', '/contact', '/blog', '/legal/terms', '/legal/privacy', '/legal/independent-professional-terms', '/legal/platform-policy']) {
  assert.ok(sitemap.body.includes(`<loc>https://ownlybiz.com${pathname}</loc>`));
}
assert.match(sitemap.body, /<lastmod>2026-09-06<\/lastmod>/);
assert.doesNotMatch(sitemap.body, /not-a-date|2026-02-31|<lastmod>2026-04-26/);
assert.equal((sitemap.body.match(/<lastmod>/g) || []).length, 1, 'no invented request-day or stale platform dates');
const expertSitemap = await request('/sitemap.xml', { host: 'example-expert.com' }, 'api/sitemap.js');
assert.match(expertSitemap.body, /<loc>https:\/\/example-expert.com\/<\/loc>/);
assert.doesNotMatch(expertSitemap.body, /<loc>https:\/\/ownlybiz.com/);

for (const platform_schema_enabled of ['0', 'false', false, 0, 'off', '']) {
  const response = await request('/', { seo: { platform_schema_enabled } });
  assert.equal(response.code, 200);
  assert.doesNotMatch(response.body, /id="ob-platform-schema"/);
}
for (const options of [{ configError: true }, { configAbsent: true }, { configTimeout: true, fastTimers: true }]) {
  const instance = createHandler('api/seo-shell.js', options);
  const first = await request('/', { instance });
  const second = await request('/pricing', { instance });
  assert.equal(first.code, 200);
  assert.equal(second.code, 200);
  assert.doesNotMatch(first.body, /id="ob-platform-schema"/);
  assert.doesNotMatch(second.body, /id="ob-platform-schema"/);
  assert.equal(instance.calls.length, 1, 'failed optional config requests are cached');
}
const clock = { now: 1_000_000 };
const cached = createHandler('api/seo-shell.js', { clock });
await Promise.all([request('/', { instance: cached }), request('/pricing', { instance: cached })]);
assert.equal(cached.calls.length, 1, 'concurrent requests share one config lookup');
clock.now += 299_999;
await request('/', { instance: cached });
assert.equal(cached.calls.length, 1);
clock.now += 2;
await request('/', { instance: cached });
assert.equal(cached.calls.length, 2, 'config is refreshed after five minutes');
const social = await request('/', { seo: { platform_schema_same_as: 'https://example.com/one\nhttps://example.com/two,javascript:alert(1)' } });
assert.match(social.body, /"sameAs":\["https:\/\/example.com\/one","https:\/\/example.com\/two"\]/);
assert.doesNotMatch(social.body, /javascript:alert/);

if (existsSync(path.join(root, 'data', 'ownlybiz-platform.html'))) {
  for (const [url, page] of [['/', 'home'], ['/how', 'how'], ['/features', 'features'], ['/pricing', 'pricing'], ['/experts', 'experts'], ['/contact', 'contact'], ['/blog', 'blog']]) {
    const response = await request(url, { actualFiles: true });
    assert.equal(response.code, 200, url);
    assert.match(response.body, new RegExp(`<div class="mkt-page active" id="mkt-page-${page}"[^>]*>`), `${url} selects its actual SSR page`);
    assert.equal((response.body.match(/<div class="mkt-page active" id="mkt-page-/g) || []).length, 1, `${url} has exactly one active marketing page`);
    assert.ok(Buffer.byteLength(response.body) < 2_000_000, `${url} generated response is below the HTML crawl ceiling`);
    assert.equal(response.calls.length, 1);
    assert.match(response.calls[0], /\/api\/config$/);
  }
  const privacy = await request('/legal/privacy', { actualFiles: true });
  assert.match(privacy.body, /<section class="legal-page active"[^>]*>/);
  assert.match(privacy.body, /<h1>Privacy Policy<\/h1>/);
  const legalDocs = JSON.parse(readFileSync(path.join(root, 'data', 'ownlybiz-platform-legal.json'), 'utf8'));
  const escapedParagraph = legalDocs.privacy.body.find((row) => row[0] === 'p')[1].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  assert.ok(privacy.body.includes(`<p>${escapedParagraph}</p>`), 'generated legal paragraph is served unchanged');
  const published = JSON.parse(readFileSync(path.join(root, 'data', 'ownlybiz-blog-posts.json'), 'utf8'));
  for (const post of published) {
    const redirect = await request(`/blog/${post.slug}?utm_medium=organic`, { actualFiles: true, host: 'www.ownlybiz.com' });
    assert.equal(redirect.code, 308);
    assert.equal(redirect.headers.Location, `https://ownlybiz.com/blog/${post.slug}?utm_medium=organic`);
    assert.equal(redirect.calls.length, 0);
    const response = await request(`/blog/${post.slug}`, { actualFiles: true });
    assert.equal(response.code, 200);
    assert.equal((response.body.match(/id="ob-blog-schema"/g) || []).length, 1);
    assert.match(response.body, /<div class="mkt-page active" id="mkt-page-blog"[^>]*>/);
    assert.ok(Buffer.byteLength(response.body) < 2_000_000);
  }
  console.log('PASS generated artifacts: 7 active marketing pages, unchanged legal SSR, all published article responses below 2 MB');
}
console.log('PASS platform SEO API: metadata, SSR, compact gating, sitemap dates, safe 404s and expert/utility isolation (offline only)');
