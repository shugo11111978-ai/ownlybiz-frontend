import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Executes only extracted public SEO/blog helpers against a tiny in-memory DOM.
// No browser, actual fetch, credentials, application boot or critical flow runs.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let acorn;
try { acorn = require(process.env.OWNLYBIZ_ACORN_PATH || 'acorn'); }
catch (_) { throw new Error('Set OWNLYBIZ_ACORN_PATH to an existing Acorn module, or provide Acorn in the test environment. This test never fetches packages.'); }
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const posts = JSON.parse(fs.readFileSync(path.join(root, 'data/ownlybiz-blog-posts.json'), 'utf8'));
assert.ok(posts.length > 0);
const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(match => match[1]);
const parsed = new Map();
function visit(node, callback, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (node.type) callback(node, parent);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, callback, node));
    else if (value && typeof value === 'object') visit(value, callback, node);
  }
}
function ast(code) {
  if (!parsed.has(code)) parsed.set(code, acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true }));
  return parsed.get(code);
}
function extract(code, name) {
  const matches = [];
  visit(ast(code), (node) => {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) matches.push(code.slice(node.start, node.end));
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && node.left.object.name === 'window' && node.left.property.name === name && ['FunctionExpression', 'ArrowFunctionExpression'].includes(node.right.type)) matches.push(code.slice(node.start, node.end) + ';');
  });
  assert.equal(matches.length, 1, `Unambiguous actual helper ${name}`);
  return matches[0];
}
const marketingSource = scripts.find(code => code.includes('window.obApplyMarketingSeo ='));
const blogSource = scripts.find(code => code.includes('function obBlogDecode('));
const platformSource = scripts.find(code => code.includes('function platformSeoDefaults('));
const rootsSource = scripts.find(code => code.includes('window.obPlatformRouteRoots ='));
assert.ok(marketingSource && blogSource && platformSource && rootsSource);
let rootsLiteral;
visit(ast(rootsSource), node => { if (node.type === 'VariableDeclarator' && node.id.name === 'roots') rootsLiteral = rootsSource.slice(node.init.start, node.init.end); });
assert.ok(rootsLiteral);
const platformRoots = vm.runInNewContext(`(${rootsLiteral})`, Object.create(null), { timeout: 1000 });
const helpers = [
  ...['obMarketingSeoPageFromPath', 'obMarketingSeoForPage', 'obApplyMarketingSeo'].map(name => extract(marketingSource, name)),
  ...['obBlogEsc', 'obBlogDate', 'obBlogDecode', 'obBlogSlugFromPath', 'obBlogUrl', 'obBlogTags', 'obBlogFeatures', 'obBlogReferences', 'obBlogLoadPosts', 'obBlogHub', 'obBlogArticle', 'obRenderBlogRoute', 'obApplyBlogSeo'].map(name => extract(blogSource, name)),
  ...['clean', 'escapeText', 'setMeta', 'setProp', 'setCanonical', 'setVerification', 'setJsonLd', 'listFromSetting', 'absoluteUrl', 'isPlatformSeoRoute', 'seoEnabled', 'platformSeoDefaults', 'buildPlatformSchema', 'applyPlatformSeo', 'isExpertRoute'].map(name => extract(platformSource, name)),
].join('\n');

function fixture(url = 'https://ownlybiz.com/') {
  const mutations = [];
  function element(tag) {
    const attrs = {};
    const classes = new Set();
    const node = {
      tag, attrs, children: [], parentNode: null, innerHTML: '', textContent: '',
      setAttribute(key, value) { attrs[key] = String(value); mutations.push(['attribute', tag, key]); },
      getAttribute: key => attrs[key] ?? null,
      appendChild(child) { this.children.push(child); child.parentNode = this; mutations.push(['append', child.tag]); return child; },
      removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; mutations.push(['remove', child.tag]); },
      remove() { this.parentNode?.removeChild(this); },
      classList: { contains: value => classes.has(value), toggle(value, enabled = !classes.has(value)) { if (enabled) classes.add(value); else classes.delete(value); return enabled; } },
      querySelector(selector) {
        const match = selector.match(/^([a-z]+)\[([a-z:]+)="([^"]+)"\]$/);
        if (match) return this.children.find(child => child.tag === match[1] && child.attrs[match[2]] === match[3]) || null;
        throw new Error(`Unimplemented DOM selector ${selector}`);
      },
    };
    Object.defineProperty(node, 'id', { get: () => attrs.id || '', set: value => { attrs.id = String(value); } });
    return node;
  }
  const head = element('head');
  const body = element('body');
  const blogPage = body.appendChild(element('div'));
  blogPage.id = 'mkt-page-blog';
  const blogRoot = blogPage.appendChild(element('div'));
  blogRoot.id = 'ob-blog-content';
  let title = 'Initial title';
  function findId(node, id) { return node.id === id ? node : node.children.map(child => findId(child, id)).find(Boolean) || null; }
  const document = {
    head, body, createElement: element,
    getElementById: id => findId(head, id) || findId(body, id),
    querySelector: selector => { assert.equal(selector, '#view-4.active'); return null; },
  };
  Object.defineProperty(document, 'title', { get: () => title, set: value => { title = value; mutations.push(['title']); } });
  const fetches = [];
  const context = vm.createContext({
    URL, URLSearchParams, document, location: new URL(url), obPlatformRouteRoots: structuredClone(platformRoots),
    obBlogPostsPromise: null, obBlogRenderSequence: 0,
    fetch: async (resource, options) => {
      assert.equal(resource, '/data/ownlybiz-blog-posts.json');
      assert.ok(!options?.method || options.method === 'GET');
      fetches.push(resource);
      return { ok: true, json: async () => structuredClone(posts) };
    },
    history: new Proxy({}, { get() { throw new Error('SEO helpers must not mutate navigation history'); } }),
  });
  context.window = context;
  vm.runInContext(helpers, context, { timeout: 1000 });
  const meta = (key, attr = 'name') => head.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content');
  const canonical = () => head.querySelector('link[rel="canonical"]')?.getAttribute('href');
  function snapshot(node) { return { tag: node.tag, attrs: node.attrs, text: node.textContent, children: node.children.map(snapshot) }; }
  return {
    context, document, blogRoot, blogPage, fetches, mutations, meta, canonical,
    route: value => { context.location = new URL(value, context.location); },
    run: code => vm.runInContext(code, context, { timeout: 1000 }),
    headSnapshot: () => JSON.stringify({ title, head: snapshot(head) }),
  };
}
const passed = [];
const failed = [];
async function test(name, fn) {
  try { await fn(); passed.push(name); }
  catch (error) { failed.push({ name, message: error.message }); }
}
const defaultRobots = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const admin = {
  platform_seo_title: 'Configured Ownlybiz title', platform_seo_description: 'Configured platform description.',
  platform_seo_robots: 'noindex,follow', platform_og_image_url: 'https://ownlybiz.com/assets/admin-share.png',
  platform_og_title: 'Configured social title', platform_og_description: 'Configured social description.',
  platform_schema_enabled: '1', platform_schema_url: 'https://ownlybiz.com/',
};

await test('Schema enablement treats explicit false/zero values as disabled', () => {
  const f = fixture();
  for (const value of [false, 0, 'off', 'false', '0']) {
    f.context.setting = value;
    assert.equal(f.run('seoEnabled(setting)'), false, `Explicit disabled setting: ${JSON.stringify(value)}`);
  }
  for (const value of [true, undefined]) {
    f.context.setting = value;
    assert.equal(f.run('seoEnabled(setting)'), true, `Enabled/default setting: ${String(value)}`);
  }
});

for (const slug of ['%E0%A4%A', '%', '%ZZ', '%2F', '%00', 'not-a-published-guide']) {
  await test(`Malformed/missing slug ${slug} is noindex`, async () => {
    const f = fixture(`https://ownlybiz.com/blog/${slug}`);
    await f.run('obRenderBlogRoute()');
    assert.match(f.blogRoot.innerHTML, /<h1>Guide not found<\/h1>/);
    assert.equal(f.meta('robots'), 'noindex,follow');
    assert.equal(f.document.title, 'Guide not found | Ownlybiz Blog');
    assert.equal(f.canonical(), 'https://ownlybiz.com/blog');
    assert.equal(f.document.getElementById('ob-blog-schema'), null);
    assert.equal(f.fetches.length, 1);
  });
}
await test('Valid article with surplus path segments is missing', async () => {
  const f = fixture(`https://ownlybiz.com/blog/${posts[0].slug}/extra`);
  await f.run('obRenderBlogRoute()');
  assert.match(f.blogRoot.innerHTML, /Guide not found/);
  assert.equal(f.meta('robots'), 'noindex,follow');
});
await test('Missing article to pricing resets noindex and social metadata', async () => {
  const f = fixture('https://ownlybiz.com/blog/%ZZ');
  await f.run('obRenderBlogRoute()');
  f.route('/pricing');
  assert.equal(f.run('obApplyMarketingSeo("pricing")'), true);
  assert.equal(f.meta('robots'), defaultRobots);
  assert.equal(f.meta('og:type', 'property'), 'website');
  assert.equal(f.meta('og:image', 'property'), '');
  assert.equal(f.meta('twitter:image'), '');
  assert.equal(f.canonical(), 'https://ownlybiz.com/pricing');
  assert.match(f.document.title, /Ownlybiz Pricing/);
});
for (const page of ['home', 'how', 'features', 'pricing', 'experts', 'contact']) {
  await test(`Article to ${page} removes article schema and image`, async () => {
    const f = fixture(`https://ownlybiz.com/blog/${posts[0].slug}`);
    await f.run('obRenderBlogRoute()');
    assert.equal(f.meta('og:type', 'property'), 'article');
    assert.equal(f.meta('og:image', 'property'), 'https://ownlybiz.com' + posts[0].image);
    const schema = JSON.parse(f.document.getElementById('ob-blog-schema').textContent);
    assert.equal((Array.isArray(schema) ? schema[0] : schema)['@type'], 'Article');
    f.route(page === 'home' ? '/' : '/' + page);
    f.run(`obApplyMarketingSeo(${JSON.stringify(page)})`);
    assert.equal(f.document.getElementById('ob-blog-schema'), null);
    assert.equal(f.meta('robots'), defaultRobots);
    assert.equal(f.meta('og:type', 'property'), 'website');
    assert.equal(f.meta('og:image', 'property'), '');
    assert.equal(f.meta('twitter:image'), '');
    assert.equal(f.canonical(), 'https://ownlybiz.com' + (page === 'home' ? '/' : '/' + page));
  });
}
await test('Admin noindex and custom image survive article to marketing', async () => {
  const f = fixture();
  f.context.admin = structuredClone(admin);
  f.run('applyPlatformSeo(admin)');
  const graph = f.document.getElementById('ob-platform-schema').textContent;
  f.route('/blog/' + posts[0].slug);
  await f.run('obRenderBlogRoute()');
  f.route('/pricing');
  f.run('obApplyMarketingSeo("pricing")');
  assert.equal(f.meta('robots'), admin.platform_seo_robots);
  assert.equal(f.meta('og:image', 'property'), admin.platform_og_image_url);
  assert.equal(f.meta('twitter:image'), admin.platform_og_image_url);
  assert.equal(f.document.getElementById('ob-blog-schema'), null);
  assert.equal(f.document.getElementById('ob-platform-schema').textContent, graph);
});
await test('Homepage preserves configured title, description and distinct social metadata', () => {
  const f = fixture();
  f.context.admin = structuredClone(admin);
  f.run('applyPlatformSeo(admin)');
  assert.equal(f.document.title, admin.platform_seo_title);
  assert.equal(f.meta('description'), admin.platform_seo_description);
  assert.equal(f.meta('og:title', 'property'), admin.platform_og_title);
  assert.equal(f.meta('og:description', 'property'), admin.platform_og_description);
  assert.equal(f.meta('twitter:title'), admin.platform_og_title);
  assert.equal(f.meta('twitter:description'), admin.platform_og_description);
  assert.equal(f.meta('robots'), admin.platform_seo_robots);
  assert.equal(f.meta('og:image', 'property'), admin.platform_og_image_url);
  assert.equal(f.canonical(), 'https://ownlybiz.com/');
});
await test('Cached admin config survives an empty config fallback and homepage return', () => {
  const f = fixture('https://ownlybiz.com/pricing');
  f.context.admin = structuredClone(admin);
  f.run('applyPlatformSeo(admin)');
  f.run('applyPlatformSeo({})');
  f.route('/');
  f.run('obApplyMarketingSeo("home")');
  assert.equal(f.document.title, admin.platform_seo_title);
  assert.equal(f.meta('description'), admin.platform_seo_description);
  assert.equal(f.meta('robots'), admin.platform_seo_robots);
  assert.equal(f.meta('og:image', 'property'), admin.platform_og_image_url);
  assert.equal(f.meta('og:title', 'property'), admin.platform_og_title);
});
await test('Config arriving on a blog route caches without overwriting article head', async () => {
  const f = fixture('https://ownlybiz.com/blog/' + posts[0].slug);
  await f.run('obRenderBlogRoute()');
  const before = f.headSnapshot();
  f.context.admin = structuredClone(admin);
  f.run('applyPlatformSeo(admin)');
  assert.equal(f.headSnapshot(), before);
  f.route('/features');
  f.run('obApplyMarketingSeo("features")');
  assert.equal(f.meta('robots'), admin.platform_seo_robots);
  assert.equal(f.meta('og:image', 'property'), admin.platform_og_image_url);
});
for (const url of ['https://lunapsychics.com/', 'https://guide.ownlybiz.com/', 'https://ownlybiz.com/?expert=guide', 'https://ownlybiz.com/pricing?expert=guide', 'https://ownlybiz.com/blog/test?expert=guide']) {
  await test(`Expert head remains untouched: ${url}`, () => {
    const f = fixture(url);
    const before = f.headSnapshot();
    f.context.admin = structuredClone(admin);
    f.run('obApplyMarketingSeo("pricing"); obApplyBlogSeo(null, [], true); applyPlatformSeo(admin)');
    assert.equal(f.headSnapshot(), before);
  });
}
await test('Older async blog render cannot overwrite the newest route', async () => {
  const f = fixture('https://ownlybiz.com/blog/' + posts[0].slug);
  let release;
  f.context.obBlogPostsPromise = new Promise(resolve => { release = resolve; });
  const first = f.run('obRenderBlogRoute()');
  f.route('/blog/not-a-published-guide');
  const second = f.run('obRenderBlogRoute()');
  release(structuredClone(posts));
  await Promise.all([first, second]);
  assert.match(f.blogRoot.innerHTML, /Guide not found/);
  assert.equal(f.meta('robots'), 'noindex,follow');
  assert.equal(f.document.getElementById('ob-blog-schema'), null);
});
console.log(JSON.stringify({ status: failed.length ? 'FAIL' : 'PASS', passed: passed.length, failed, networkRequests: 0, paidWorkflowExecution: false }));
if (failed.length) process.exitCode = 1;
