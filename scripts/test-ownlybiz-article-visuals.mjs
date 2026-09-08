import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Read-only source/asset checks. No application boot, browser, network or build.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = 'e41ef608585d641aff3c04856f9ec0f59eca15db';
const require = createRequire(import.meta.url);
const acorn = require(process.env.OWNLYBIZ_ACORN_PATH || '/Users/liranbahbut/.npm/_npx/67eb4586ca667318/node_modules/acorn/dist/acorn.js');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const original = relative => git(['show', `${baseline}:${relative}`]).toString('utf8');
const html = read('index.html');
const oldHtml = original('index.html');
const api = read('api/seo-shell.js');
const oldApi = original('api/seo-shell.js');
const posts = JSON.parse(read('data/ownlybiz-blog-posts.json'));
const oldPosts = JSON.parse(original('data/ownlybiz-blog-posts.json'));
const heroPilotSlugs = new Set(['expert-business-tool-stack-vs-ownlybiz', 'pay-by-minute-sessions-guide', 'turn-social-followers-into-paid-sessions']);
// Retain the exact original pilot exports alongside the three selected v2
// replacements. These are approved assets even though current posts use v2.
const retainedPilotExports = new Set([
  'assets/blog/expert-business-tool-stack-vs-ownlybiz-hero.jpg',
  'assets/blog/expert-business-tool-stack-vs-ownlybiz-hero-640.webp',
  'assets/blog/expert-business-tool-stack-vs-ownlybiz-hero-960.webp',
  'assets/blog/expert-business-tool-stack-vs-ownlybiz-hero-1600.webp',
  'assets/blog/pay-by-minute-sessions-guide-hero.jpg',
  'assets/blog/pay-by-minute-sessions-guide-hero-640.webp',
  'assets/blog/pay-by-minute-sessions-guide-hero-960.webp',
  'assets/blog/pay-by-minute-sessions-guide-hero-1600.webp',
  'assets/blog/turn-social-followers-into-paid-sessions-hero.jpg',
  'assets/blog/turn-social-followers-into-paid-sessions-hero-640.webp',
  'assets/blog/turn-social-followers-into-paid-sessions-hero-960.webp',
  'assets/blog/turn-social-followers-into-paid-sessions-hero-1600.webp',
]);
const clientAllowed = ['obBlogImage', 'obBlogContents', 'obBlogVisualSummary', 'obBlogProductFigure', 'obBlogHub', 'obBlogArticle'];
const serverAllowed = clientAllowed.map(name => name.replace('obBlog', 'renderBlog'));
const parsed = new Map();
let passed = 0;
const failures = [];
function check(name, fn) {
  try { fn(); passed++; }
  catch (error) { failures.push(`${name}: ${error.message}`); }
}
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
function ast(source) {
  if (!parsed.has(source)) parsed.set(source, acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true }));
  return parsed.get(source);
}
function declarations(source, names) {
  const matches = [];
  walk(ast(source), node => {
    if (node.type === 'FunctionDeclaration' && names.includes(node.id?.name)) matches.push(node);
  });
  return matches;
}
function extract(source, name) {
  const matches = declarations(source, [name]);
  assert.equal(matches.length, 1, `Exactly one actual ${name} declaration`);
  return source.slice(matches[0].start, matches[0].end);
}
function stripFunctions(source, names) {
  const matches = declarations(source, names);
  for (const name of names) assert.ok(matches.filter(node => node.id.name === name).length <= 1, `Duplicate allowed declaration: ${name}`);
  const ranges = matches.map(node => {
    const start = source.lastIndexOf('\n', node.start - 1) + 1;
    assert.match(source.slice(start, node.start), /^[\t ]*$/, `Allowed ${node.id.name} must start on its own line`);
    let end = node.end;
    // Remove only each declaration's own indentation and blank line separators.
    while (source[end] === '\r' || source[end] === '\n') end++;
    return { start, end };
  }).sort((a, b) => b.start - a.start);
  let result = source;
  for (const range of ranges) result = result.slice(0, range.start) + result.slice(range.end);
  return result;
}
function exactBytes(actual, expected, label) {
  if (actual === expected) return;
  let index = 0;
  while (actual[index] === expected[index] && index < Math.min(actual.length, expected.length)) index++;
  assert.fail(`${label} differs at character ${index}; expected ${JSON.stringify(expected.slice(Math.max(0, index - 45), index + 100))}, got ${JSON.stringify(actual.slice(Math.max(0, index - 45), index + 100))}`);
}
const scriptPattern = /(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)/gi;
const scripts = source => [...source.matchAll(scriptPattern)];
const oldScripts = scripts(oldHtml);
const newScripts = scripts(html);
const clientSource = newScripts.find(match => match[2].includes('function obBlogArticle('))?.[2];
const oldClientSource = oldScripts.find(match => match[2].includes('function obBlogArticle('))?.[2];
assert.ok(clientSource && oldClientSource, 'Find actual client blog script');
check('Every original inline/external script and all unrelated HTML are byte-identical', () => {
  assert.equal(newScripts.length, oldScripts.length, 'No scripts added or removed');
  newScripts.forEach((script, index) => {
    const previous = oldScripts[index];
    exactBytes(script[1], previous[1], `Script ${index} opening tag/attributes`);
    exactBytes(script[3], previous[3], `Script ${index} closing tag`);
    if (script[2] === clientSource) exactBytes(stripFunctions(script[2], clientAllowed), stripFunctions(previous[2], clientAllowed), `Script ${index} outside six allowed renderers`);
    else exactBytes(script[2], previous[2], `Protected script ${index}`);
  });
  function stripVerifiedRegions(source) {
    const withoutScripts = source.replace(scriptPattern, '<!-- independently verified script -->');
    let blogStyles = 0;
    const stripped = withoutScripts.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (full, opening, css, closing) => {
      if (!css.includes('.ob-blog-shell{')) return full;
      blogStyles++;
      assert.equal(opening, '<style>', 'Existing blog style tag remains unmodified');
      assert.equal(closing, '</style>');
      return '<!-- allowed existing blog CSS -->';
    });
    assert.equal(blogStyles, 1, 'Exactly one existing blog CSS block');
    return stripped;
  }
  exactBytes(stripVerifiedRegions(html), stripVerifiedRegions(oldHtml), 'All HTML and non-blog CSS outside independently verified scripts');
});
check('SSR source outside six allowed blog renderers is byte-identical', () => {
  exactBytes(stripFunctions(api, serverAllowed), stripFunctions(oldApi, serverAllowed), 'Protected SSR code');
});
check('All other tracked API, assets, config and source files preserve baseline bytes', () => {
  // The root-owned QA evidence document is intentionally refreshed; no other
  // documentation or protected runtime file is exempted by that allowance.
  const allowed = new Set(['index.html', 'api/seo-shell.js', 'data/ownlybiz-blog-posts.json', 'design-qa.md', 'scripts/generate-ownlybiz-blog-content.mjs', 'scripts/test-ownlybiz-blog-content.mjs', 'scripts/test-ownlybiz-blog-references.mjs', 'scripts/test-ownlybiz-client-seo.mjs']);
  // Historical tracked .vercel state is intentionally not copied into a clean
  // release. Its newly built routes, functions and dependencies are checked by
  // the independent clean-artifact verifier, not against stale Git output.
  const generated = relative => relative.startsWith('.vercel/') || relative.startsWith('assets/ownlybiz-public/') || /^data\/ownlybiz-(?:platform(?:-build|-legal)?\.json|platform\.html|static-export\.json)$/.test(relative) || relative.startsWith('public/');
  const newBlogExport = relative => posts.some(post => [post.image, ...post.media.sources.map(source => source.src), ...post.sections.flatMap(section => Array.isArray(section.productFigures) ? section.productFigures.flatMap(figure => [figure?.src, figure?.webp]) : [])].includes(`/${relative}`));
  for (const relative of git(['diff', '--name-only', '-z', baseline]).toString('utf8').split('\0').filter(Boolean)) {
    if (allowed.has(relative) || generated(relative) || newBlogExport(relative) || retainedPilotExports.has(relative) || relative.startsWith('scripts/')) continue;
    assert.fail(`Additional tracked change outside article sources/exports: ${relative}`);
  }
  const entries = git(['ls-tree', '-r', '-z', baseline]).toString('utf8').split('\0').filter(Boolean);
  for (const entry of entries) {
    const [, mode, type, oid, relative] = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(entry);
    if (allowed.has(relative) || generated(relative)) continue;
    assert.equal(type, 'blob', `Unexpected tracked type: ${relative}`);
    const target = path.join(root, relative);
    assert.ok(fs.existsSync(target), `Protected file removed: ${relative}`);
    const stat = fs.lstatSync(target);
    assert.equal(stat.isSymbolicLink(), mode === '120000', `Protected file type changed: ${relative}`);
    const bytes = mode === '120000' ? Buffer.from(fs.readlinkSync(target)) : fs.readFileSync(target);
    const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    assert.equal(hash, oid, `Protected baseline bytes changed: ${relative}`);
  }
});

function makeClient(source, modern = true) {
  const names = ['obBlogEsc', 'obBlogDate', 'obBlogUrl', 'obBlogTags', 'obBlogFeatures', 'obBlogReferences', ...(modern ? clientAllowed : ['obBlogHub', 'obBlogArticle'])];
  const context = vm.createContext({ URL });
  vm.runInContext(names.map(name => extract(source, name)).join('\n'), context, { timeout: 1000 });
  return context;
}
function makeServer(source, modern = true) {
  const names = ['esc', 'blogUrl', 'renderBlogTags', 'renderBlogFeatures', 'renderBlogReferences', ...(modern ? serverAllowed : ['renderBlogHub', 'renderBlogArticle'])];
  const context = vm.createContext({ URL });
  vm.runInContext(names.map(name => extract(source, name)).join('\n'), context, { timeout: 1000 });
  return context;
}
const client = makeClient(clientSource);
const server = makeServer(api);
const legacyClient = makeClient(oldClientSource, false);
const legacyServer = makeServer(oldApi, false);
const escaped = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const comparable = markup => markup.replace(/(<div class="ob-blog-meta"><span>)[^<]*(<\/span>)/g, '$1DATE$2').replace(' onclick="showMktPage(&quot;features&quot;);return false;"', '');
const tags = (markup, tag) => [...markup.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map(match => match[0]);
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/\s([a-z-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}
function webpSize(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (type === 'VP8X') return [bytes.readUIntLE(body + 4, 3) + 1, bytes.readUIntLE(body + 7, 3) + 1];
    if (type === 'VP8 ') { assert.equal(bytes.toString('hex', body + 3, body + 6), '9d012a'); return [bytes.readUInt16LE(body + 6) & 0x3fff, bytes.readUInt16LE(body + 8) & 0x3fff]; }
    if (type === 'VP8L') { assert.equal(bytes[body], 0x2f); const bits = bytes.readUInt32LE(body + 1); return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]; }
    offset = body + length + (length % 2);
  }
  assert.fail('Missing WebP image dimensions');
}
function jpegSize(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  for (let offset = 2; offset < bytes.length;) {
    assert.equal(bytes[offset++], 0xff, 'JPEG marker');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
    offset += length;
  }
  assert.fail('Missing JPEG image dimensions');
}
function pngSize(bytes) {
  assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}
check('All 18 article routes and unique source images exist', () => {
  assert.equal(posts.length, 18);
  assert.deepEqual(posts.map(post => post.slug), oldPosts.map(post => post.slug));
  assert.equal(new Set(posts.map(post => post.image)).size, 18);
  assert.equal(new Set(posts.map(post => post.imageAlt)).size, 18);
  const hashes = posts.map(post => createHash('sha256').update(fs.readFileSync(path.join(root, post.image))).digest('hex'));
  assert.equal(new Set(hashes).size, 18, 'Distinct filenames must not hide reused image bytes');
});
for (const post of posts) {
  check(`${post.slug}: all exports, dimensions, caption and srcset`, () => {
    const heroBase = `/assets/blog/${post.slug}-hero${heroPilotSlugs.has(post.slug) ? '-v2' : ''}`;
    assert.equal(post.image, `${heroBase}.jpg`);
    assert.deepEqual([post.media.width, post.media.height], [1600, 900]);
    assert.deepEqual(post.media.sources.map(source => source.width), [640, 960, 1600]);
    assert.ok(post.imageAlt.length > 25 && post.media.caption.trim().length > 10);
    assert.doesNotMatch(post.image, /codex|gpt/i);
    const jpeg = fs.readFileSync(path.join(root, post.image));
    assert.deepEqual(jpegSize(jpeg), [1600, 900]);
    for (const source of post.media.sources) {
      assert.equal(source.src, `${heroBase}-${source.width}.webp`);
      const bytes = fs.readFileSync(path.join(root, source.src));
      assert.ok(bytes.length > 1000 && bytes.length < 350000, `${source.src}: sensible reviewed export size`);
      assert.deepEqual(webpSize(bytes), [source.width, source.width * 9 / 16]);
    }
    for (const featured of [false, true]) for (const card of [false, true]) {
      const image = client.obBlogImage(post, featured, card);
      assert.equal(image, server.renderBlogImage(post, featured, card), 'Exact client/SSR image parity');
      const attrs = attributes(image);
      assert.equal(attrs.src, post.image);
      assert.equal(attrs.alt, escaped(post.imageAlt));
      assert.equal(attrs.srcset, post.media.sources.map(source => `${source.src} ${source.width}w`).join(', '));
      assert.equal(attrs.width, '1600'); assert.equal(attrs.height, '900');
      assert.equal(attrs.loading, featured ? 'eager' : 'lazy');
      assert.equal(attrs.decoding, 'async');
      assert.equal(attrs.fetchpriority, featured ? 'high' : undefined);
      assert.ok(attrs.sizes.includes('max-width') && attrs.sizes.includes(card ? (featured ? '720px' : '380px') : '600px'));
    }
  });
  check(`${post.slug}: article parity, reachable anchors and reading aids`, () => {
    const rendered = client.obBlogArticle(post, posts);
    assert.equal(comparable(rendered), comparable(server.renderBlogArticle(post, posts)), 'Only pre-existing localized date display differs');
    assert.equal(client.obBlogContents(post), server.renderBlogContents(post));
    const ids = [...rendered.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'No duplicate article IDs');
    assert.deepEqual(ids, [...post.sections.map((_, index) => `guide-section-${index + 1}`), 'guide-faq']);
    for (const anchor of rendered.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(anchor[1]), `Missing target ${anchor[1]}`);
    assert.equal(tags(rendered, 'nav').length, 2, 'Mobile disclosure and desktop contents');
    assert.ok(rendered.includes('<summary>Jump to a section</summary>'));
    assert.ok(rendered.includes(`<figcaption>${escaped(post.media.caption)}</figcaption>`));
    const productFigures = post.sections.flatMap(section => Array.isArray(section.productFigures) ? section.productFigures.slice(0, 2).filter(figure => client.obBlogProductFigure(figure)) : []);
    const articleImages = tags(rendered, 'img').map(attributes);
    assert.equal(articleImages.length, 1 + productFigures.length, 'One hero plus only the authored, valid, bounded product figures');
    assert.equal(articleImages.filter(image => image.loading === 'eager' && image.fetchpriority === 'high').length, 1, 'Exactly one prioritized hero');
    assert.equal(articleImages.filter(image => image.loading === 'lazy' && !image.fetchpriority).length, productFigures.length, 'Every product screenshot remains deferred');
    for (const figure of productFigures) assert.ok(rendered.includes(client.obBlogProductFigure(figure)), 'Product screenshot actually included in the intended section');
    for (const section of post.sections) if (section.visualSummary) {
      const summary = section.visualSummary;
      assert.ok(summary.columns.length >= 2 && summary.rows.length > 0);
      assert.ok(summary.rows.every(row => Array.isArray(row) && row.length === summary.columns.length));
      const table = client.obBlogVisualSummary(summary);
      assert.equal(table, server.renderBlogVisualSummary(summary));
      assert.ok(table.includes(`<caption>${escaped(summary.title)}</caption>`));
      assert.equal((table.match(/scope="col"/g) || []).length, summary.columns.length);
      assert.equal((table.match(/scope="row"/g) || []).length, summary.rows.length);
      assert.ok(rendered.includes(table), 'Reading aid actually included in article');
    }
  });
  check(`${post.slug}: original article fallback remains byte-identical`, () => {
    const originalPost = oldPosts.find(item => item.slug === post.slug);
    assert.equal(client.obBlogArticle(originalPost, oldPosts), legacyClient.obBlogArticle(originalPost, oldPosts));
    assert.equal(server.renderBlogArticle(originalPost, oldPosts), legacyServer.renderBlogArticle(originalPost, oldPosts));
    const fallback = client.obBlogImage(originalPost, false, true);
    assert.equal(fallback, server.renderBlogImage(originalPost, false, true));
    const attrs = attributes(fallback);
    assert.equal(attrs.srcset, undefined); assert.equal(attrs.width, '1200'); assert.equal(attrs.height, '630');
  });
}
check('Hub parity and a single prioritized image across all 18 cards', () => {
  const rendered = client.obBlogHub(posts);
  assert.equal(comparable(rendered), comparable(server.renderBlogHub(posts)));
  const images = tags(rendered, 'img').map(attributes);
  assert.equal(images.length, 18);
  assert.equal(images.filter(image => image.loading === 'eager' && image.fetchpriority === 'high').length, 1);
  assert.equal(images.filter(image => image.loading === 'lazy' && !image.fetchpriority).length, 17);
});
check('Untrusted strings cannot add markup or image attributes', () => {
  const payload = '\"><script>alert(1)</script><img src=x onerror=alert(2)>&';
  const post = structuredClone(posts[0]);
  post.image = `/assets/blog/${payload}.jpg`; post.imageAlt = payload;
  post.media.caption = payload; post.sections = [{ heading: payload, body: [payload], bullets: [payload] }];
  const sources = [
    { src: '/assets/blog/valid-640.webp', width: 640 },
    { src: `\" onerror=\"alert(1)`, width: 960 },
    { src: 'https://external.invalid/asset.webp', width: 960 },
    { src: '/assets/blog/../asset.webp', width: 960 },
    { src: '/assets/blog/a.webp, /external.webp', width: 960 },
    { src: '/assets/blog/a.webp', width: '960' },
    { src: '/assets/blog/a.webp', width: 123 },
    { src: '/assets/blog/a.svg', width: 1600 },
  ];
  post.media.sources = sources;
  const image = client.obBlogImage(post, true);
  assert.equal(image, server.renderBlogImage(post, true));
  assert.equal(attributes(image).srcset, '/assets/blog/valid-640.webp 640w');
  assert.equal(tags(image, 'img').length, 1);
  assert.ok(!Object.hasOwn(attributes(image), 'onerror'));
  const summary = { title: payload, columns: [payload, payload], rows: [[payload, payload]], note: payload };
  post.sections[0].visualSummary = summary;
  const markup = client.obBlogArticle(post, [post]);
  assert.equal(comparable(markup), comparable(server.renderBlogArticle(post, [post])));
  assert.equal(tags(markup, 'img').length, 1);
  assert.equal(tags(markup, 'script').length, 0);
  assert.ok(markup.includes(`<figcaption>${escaped(payload)}</figcaption>`));
  assert.ok(markup.includes(`<caption>${escaped(payload)}</caption>`));
  assert.equal(client.obBlogVisualSummary(summary), server.renderBlogVisualSummary(summary));
});
check('Missing optional metadata and summaries fall back without invalid markup', () => {
  for (const sources of [undefined, null, 'not-an-array', []]) {
    const post = structuredClone(posts[0]); post.media.sources = sources;
    assert.equal(client.obBlogImage(post), server.renderBlogImage(post));
    assert.equal(attributes(client.obBlogImage(post)).srcset, undefined);
  }
  for (const summary of [undefined, null, {}, { columns: [], rows: null }, { columns: 'invalid', rows: [] }]) {
    assert.equal(client.obBlogVisualSummary(summary), '');
    assert.equal(server.renderBlogVisualSummary(summary), '');
  }
});

const sampleProductFigure = {
  kind: 'product-screenshot',
  title: 'Ownlybiz client chat — fictional demo',
  src: '/assets/blog/product-client-chat.png',
  webp: '/assets/blog/product-client-chat.webp',
  width: 390,
  height: 844,
  alt: 'Ownlybiz client chat with fictional participants Alex and Sam.',
  caption: 'Current interface with fictional demo data; no real customer, connected call, or payment.',
};
check('Authored optional product figures have valid local files, dimensions and accessible demo captions', () => {
  const expectedTargets = [
    ['pay-by-minute-sessions-guide', 'Give clients clarity before the clock matters', 1],
    ['turn-social-followers-into-paid-sessions', 'Use Ownlybiz to reduce the handoff friction', 1],
    ['custom-domain-expert-website', 'What Ownlybiz gives the expert site', 1],
    ['chat-voice-video-written-session-formats', 'How to choose formats', 2],
    ['email-marketing-for-independent-experts', 'Turn the message into a reviewed draft', 1],
    ['ownlybiz-feature-map-for-experts', 'Manage', 1],
    ['consultation-promotions-discounts-intro-minutes-prepaid-credit', 'Make the settings match the sentence', 1],
  ];
  const actualTargets = posts.flatMap(post => post.sections.filter(section => Object.hasOwn(section, 'productFigures')).map(section => [post.slug, section.heading, section.productFigures?.length]));
  const sortedTargets = targets => [...targets].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(sortedTargets(actualTargets), sortedTargets(expectedTargets), 'Exactly seven selected articles and eight targeted screenshots; no unrequested gallery');
  const captures = posts.flatMap(post => post.sections.flatMap(section => section.productFigures || []));
  assert.equal(captures.length, 8);
  const expectedFileTargets = new Map([
    ['pay-by-minute-sessions-guide', ['product-chat-desktop']],
    ['turn-social-followers-into-paid-sessions', ['product-chat-mobile']],
    ['custom-domain-expert-website', ['product-domain']],
    ['chat-voice-video-written-session-formats', ['product-voice', 'product-video']],
    ['email-marketing-for-independent-experts', ['product-email-compose']],
    ['ownlybiz-feature-map-for-experts', ['product-clients']],
    ['consultation-promotions-discounts-intro-minutes-prepaid-credit', ['product-promotions']],
  ]);
  for (const [slug, names] of expectedFileTargets) {
    const post = posts.find(post => post.slug === slug);
    assert.deepEqual(post.sections.flatMap(section => (section.productFigures || []).map(figure => figure.src)), names.map(name => `/assets/blog/${name}.png`), `${slug}: the intended view cannot be swapped with an unrelated capture`);
  }
  const captureExports = captures.flatMap(figure => [figure.src, figure.webp]);
  assert.equal(captureExports.length, 16); assert.equal(new Set(captureExports).size, 16, 'Eight distinct PNG/WebP pairs');
  const publicProductFiles = fs.readdirSync(path.join(root, 'assets/blog')).filter(name => name.startsWith('product-')).map(name => `/assets/blog/${name}`).sort();
  assert.deepEqual(publicProductFiles, [...captureExports].sort(), 'Only the sixteen selected product raster assets are public; no fixtures, logs, metadata or unused screenshots');
  const pngHashes = captures.map(figure => createHash('sha256').update(fs.readFileSync(path.join(root, figure.src))).digest('hex'));
  assert.equal(new Set(pngHashes).size, 8, 'Distinct captures cannot be disguised copies of one screenshot');
  for (const post of posts) for (const section of post.sections) {
    if (section.productFigures === undefined) continue;
    assert.ok(Array.isArray(section.productFigures), `${post.slug}: productFigures must be an array`);
    assert.ok(section.productFigures.length <= 2, `${post.slug}: at most two targeted screenshots per section`);
    for (const figure of section.productFigures) {
      assert.deepEqual(Object.keys(figure).sort(), ['kind', 'title', 'src', 'webp', 'width', 'height', 'alt', 'caption'].sort(), 'Only explicit public figure metadata is allowed');
      assert.match(figure.src, /^\/assets\/blog\/product-[a-z0-9-]+\.png$/, 'Every published screenshot includes its original-aspect PNG fallback');
      assert.equal(figure.webp, figure.src.replace(/\.png$/, '.webp'), 'Every published screenshot has its same-capture WebP');
      assert.ok(figure.width > 1 && figure.height > 1, 'Authored screenshots must reserve useful native dimensions, not placeholder pixels');
      const rendered = client.obBlogProductFigure(figure);
      assert.ok(rendered, `${post.slug}: authored figure must not silently disappear`);
      assert.equal(rendered, server.renderBlogProductFigure(figure));
      assert.match(figure.caption, /fictional|synthetic|demo/i, 'Do not present synthetic fixture state as a live customer record');
      assert.ok(figure.alt.trim().length > 20 && figure.caption.trim().length > 30);
      assert.doesNotMatch(figure.src, /codex|gpt|checkout|wallet/i, 'Incomplete provider checkout is outside the approved screenshot set');
      for (const source of [figure.src, figure.webp].filter(Boolean)) {
        assert.match(source, /^\/assets\/blog\/product-[a-z0-9-]+\.(?:png|webp)$/);
        assert.doesNotMatch(source, /\s/);
        const bytes = fs.readFileSync(path.join(root, source));
        assert.ok(bytes.length > 1000 && bytes.length < 2500000, `${source}: bounded screenshot export size`);
        assert.deepEqual(source.endsWith('.webp') ? webpSize(bytes) : pngSize(bytes), [figure.width, figure.height], 'Actual raster dimensions match layout reservation');
      }
      if (figure.webp) assert.equal(figure.webp, figure.src.replace(/\.(?:png|webp)$/, '.webp'), 'Optional WebP must depict the same capture');
    }
  }
});
check('Product figure parity preserves native portrait, landscape and square geometry', () => {
  for (const [width, height] of [[390, 844], [1440, 1000], [1024, 1024], [1, 1], [4096, 4096]]) {
    const figure = { ...sampleProductFigure, width, height };
    const rendered = client.obBlogProductFigure(figure);
    assert.equal(rendered, server.renderBlogProductFigure(figure));
    assert.equal(tags(rendered, 'figure').length, 1); assert.equal(tags(rendered, 'picture').length, 1);
    const images = tags(rendered, 'img'); assert.equal(images.length, 1);
    assert.deepEqual(attributes(images[0]), { src: figure.src, alt: figure.alt, width: String(width), height: String(height), loading: 'lazy', decoding: 'async' });
    assert.equal(rendered.includes('ob-blog-product-portrait'), height > width);
    assert.equal(tags(rendered, 'source').length, 1);
    assert.deepEqual(attributes(tags(rendered, 'source')[0]), { type: 'image/webp', srcset: figure.webp });
  }
});
check('Missing or malformed product metadata never renders a partial figure', () => {
  const invalid = [undefined, null, false, 1, 'figure', [], {}, { ...sampleProductFigure, kind: 'other' }];
  for (const key of ['title', 'alt', 'caption']) for (const value of [undefined, null, false, 1, {}, [], '', ' \t\n']) invalid.push({ ...sampleProductFigure, [key]: value });
  for (const key of ['width', 'height']) for (const value of [undefined, null, '390', 0, -1, 3.5, NaN, Infinity, 4097]) invalid.push({ ...sampleProductFigure, [key]: value });
  for (const figure of invalid) {
    assert.equal(client.obBlogProductFigure(figure), '');
    assert.equal(server.renderBlogProductFigure(figure), '');
  }
});
check('Product image paths reject external, traversing, encoded and control-character payloads', () => {
  const invalidPaths = [undefined, null, 12, {}, [], '', 'https://outside.invalid/product-demo.png', '//outside.invalid/product-demo.png', 'data:image/png;base64,abc', 'javascript:alert(1)', '/assets/blog/../product-demo.png', '/assets/blog/product-../demo.png', '/assets/blog/product-%2e%2e.png', '/assets/blog/product-demo.svg', '/assets/blog/product-demo.jpg', '/assets/blog/product-demo.png?x=1', '/assets/blog/product-demo.png#x', '/assets/blog/product-demo.png 640w', '/assets/blog/product-demo.png, /other.png', '/assets/blog/product-demo.png\" onerror=\"alert(1)', '/assets/blog/product-demo.png\n', '/assets/blog/product-demo.png\r', '/assets/blog/product-demo.png\r\n', '/assets/blog/product-demo.png\t', '/assets/blog/product-demo.png\u2028', '/assets/blog/product-demo.png\u2029', '/assets/blog/product-demo\u0000.png'];
  for (const src of invalidPaths) {
    const figure = { ...sampleProductFigure, src };
    assert.equal(client.obBlogProductFigure(figure), '', `Client must reject ${JSON.stringify(src)}`);
    assert.equal(server.renderBlogProductFigure(figure), '', `SSR must reject ${JSON.stringify(src)}`);
  }
});
check('Product captions, alternative text and full-size link labels escape untrusted strings', () => {
  const payload = '\"><img src=x onerror=alert(1)><script>alert(2)</script>&';
  const figure = { ...sampleProductFigure, title: payload, alt: payload, caption: payload };
  const rendered = client.obBlogProductFigure(figure);
  assert.equal(rendered, server.renderBlogProductFigure(figure));
  assert.equal(tags(rendered, 'img').length, 1); assert.equal(tags(rendered, 'script').length, 0);
  assert.ok(!Object.hasOwn(attributes(tags(rendered, 'img')[0]), 'onerror'));
  assert.equal(attributes(tags(rendered, 'img')[0]).alt, escaped(payload));
  assert.ok(rendered.includes(`<figcaption><strong>${escaped(payload)}</strong> ${escaped(payload)} `));
  const links = tags(rendered, 'a'); assert.equal(links.length, 1);
  assert.deepEqual(attributes(links[0]), { href: figure.src, target: '_blank', rel: 'noopener noreferrer', 'aria-label': escaped(`Open full-size ${payload} (new tab)`) });
});
check('Optional product WebP only enhances its exact same-capture fallback', () => {
  for (const webp of [undefined, null, {}, 7, '', '/assets/blog/product-different.webp', '/assets/blog/product-client-chat.png', 'https://outside.invalid/product-client-chat.webp', '/assets/blog/product-client-chat.webp\n', '/assets/blog/product-client-chat.webp 2x', '/assets/blog/product-client-chat.webp\" onerror=\"alert(1)']) {
    const figure = { ...sampleProductFigure, webp };
    const rendered = client.obBlogProductFigure(figure);
    assert.equal(rendered, server.renderBlogProductFigure(figure));
    assert.equal(tags(rendered, 'source').length, 0, 'Invalid enhancement is omitted, not substituted');
    assert.equal(attributes(tags(rendered, 'img')[0]).src, sampleProductFigure.src, 'Safe fallback survives');
  }
  const webpFallback = { ...sampleProductFigure, src: sampleProductFigure.webp, webp: undefined };
  assert.equal(client.obBlogProductFigure(webpFallback), server.renderBlogProductFigure(webpFallback));
  assert.equal(attributes(tags(client.obBlogProductFigure(webpFallback), 'img')[0]).src, webpFallback.src);
});
check('Article product integration is optional, section-local, capped at two and always lazy', () => {
  const post = structuredClone(posts[0]);
  post.sections = [{ heading: 'A targeted view', body: ['The following is a fictional product demonstration.'] }];
  const withoutFigures = client.obBlogArticle(post, [post]);
  for (const productFigures of [undefined, null, false, {}, 'not-an-array', []]) {
    post.sections[0].productFigures = productFigures;
    assert.equal(client.obBlogArticle(post, [post]), withoutFigures);
    assert.equal(comparable(client.obBlogArticle(post, [post])), comparable(server.renderBlogArticle(post, [post])));
  }
  const second = { ...sampleProductFigure, src: '/assets/blog/product-expert-chat.png', webp: undefined, width: 1440, height: 1000 };
  const third = { ...sampleProductFigure, src: '/assets/blog/product-not-included.png', webp: undefined };
  post.sections[0].productFigures = [sampleProductFigure, second, third];
  const rendered = client.obBlogArticle(post, [post]);
  assert.equal(comparable(rendered), comparable(server.renderBlogArticle(post, [post])));
  const images = tags(rendered, 'img').map(attributes);
  assert.equal(images.length, 3); assert.equal(images[0].fetchpriority, 'high');
  assert.deepEqual(images.slice(1).map(image => image.src), [sampleProductFigure.src, second.src]);
  assert.ok(images.slice(1).every(image => image.loading === 'lazy' && !image.fetchpriority));
  assert.ok(!rendered.includes(third.src));
  const section = rendered.match(/<section id="guide-section-1" tabindex="-1">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(section?.includes(client.obBlogProductFigure(sampleProductFigure)), 'Image remains inside its intended section');
  assert.ok(section?.includes(client.obBlogProductFigure(second)));
  assert.equal(client.obBlogContents(post), server.renderBlogContents(post));
  assert.equal(tags(rendered, 'script').length, 0, 'No gallery, lightbox or new application runtime');
});

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  console.error(`${failures.length} failed; ${passed} passed. No test writes or external actions performed.`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${passed} checks; all 18 articles, 72 exact-dimension hero exports, eight product figures/16 native-dimension exports across seven targeted articles, SSR/client rendering, escaping, anchor targets and original fallback verified. ${oldScripts.length} original script blocks plus protected HTML/API/config/assets preserve baseline bytes outside explicitly allowed blog renderers/CSS. Generated build artifacts deliberately excluded; run the public build's own --check separately.`);
}
