import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Only extracted pure article-rendering helpers execute. No application boot,
// browser, network, provider, payment/session flow, build or source write runs.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const acorn = require(process.env.OWNLYBIZ_ACORN_PATH || 'acorn');
const baseline = '36c2f6ea2c5bf00b8c3f6e3d8509c531dcfc4d62';
const current = filename => fs.readFileSync(path.join(root, filename), 'utf8');
const previous = filename => execFileSync('git', ['show', `${baseline}:${filename}`], { cwd: root, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 });

function helpers(source, names) {
  const declarations = new Map();
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FunctionDeclaration' && names.includes(node.id?.name)) {
      assert.ok(!declarations.has(node.id.name), `Unique helper: ${node.id.name}`);
      declarations.set(node.id.name, source.slice(node.start, node.end));
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(acorn.parse(source, { ecmaVersion: 'latest' }));
  for (const name of names) assert.ok(declarations.has(name), `Helper exists: ${name}`);
  const context = { URL, Set, Date, encodeURIComponent, fetch() { throw new Error('Network is forbidden'); } };
  vm.runInNewContext([...declarations.values()].join('\n'), context);
  return context;
}

function server(source, withReferences) {
  return helpers(source, ['esc', 'blogUrl', 'renderBlogTags', 'renderBlogFeatures', 'renderBlogArticle', ...(withReferences ? ['renderBlogReferences', 'renderBlogImage', 'renderBlogContents', 'renderBlogVisualSummary', 'renderBlogProductFigure'] : [])]);
}
function client(html, withReferences) {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(match => match[1]);
  const source = scripts.filter(code => code.includes('function obBlogEsc('));
  assert.equal(source.length, 1);
  return helpers(source[0], ['obBlogEsc', 'obBlogDate', 'obBlogUrl', 'obBlogTags', 'obBlogFeatures', 'obBlogArticle', ...(withReferences ? ['obBlogReferences', 'obBlogImage', 'obBlogContents', 'obBlogVisualSummary', 'obBlogProductFigure'] : [])]);
}

const ssr = server(current('api/seo-shell.js'), true);
const spa = client(current('index.html'), true);
const oldSsr = server(previous('api/seo-shell.js'), false);
const oldSpa = client(previous('index.html'), false);
const post = { slug: 'fixture', title: 'Fixture guide', image: '/assets/blog/fixture.png', imageAlt: 'Fixture', summary: 'Summary', date: '2026-09-06', category: 'Growth', readTime: '1 min read', sections: [], tags: [], faqs: [] };

const valid = [
  { title: 'Official <guide> & "reference"', url: 'https://example.com/guide?q=one&other=two', note: 'Review <claims> & "limits".' },
  { title: 'No note', url: 'https://example.com/second#section' },
  { title: 'Trimmed title  ', url: 'HTTPS://EXAMPLE.COM/third', note: '  A short note.  ' },
];
const unsafeUrls = ['http://example.com', 'javascript:alert(1)', 'data:text/html,unsafe', '//example.com', '/relative', 'ftp://example.com/file', 'https://user:password@example.com', 'https://user@example.com', 'https://', 'not-a-url', 'https://example.com/white space', 'https://example.com/\npath', 'https://example.com/\tpath', 'https://example.com/\u0000path', 'https://example.com/\u007fpath'];
const invalidEntries = [null, false, 1, 'plain string', {}, { title: '', url: 'https://example.com' }, { title: '  ', url: 'https://example.com' }, { title: 1, url: 'https://example.com' }, { title: 'Invalid URL type', url: {} }];
let cases = 0;
for (const references of [undefined, null, false, 'not-array', {}, [], valid, valid.concat(invalidEntries), ...unsafeUrls.map(url => [{ title: 'Unsafe', url }]), ...invalidEntries.map(item => [item])]) {
  const fixture = { ...post, references };
  const expected = ssr.renderBlogReferences(fixture);
  assert.equal(spa.obBlogReferences(fixture), expected, 'SSR/client reference output must be identical');
  const rendered = [ssr.renderBlogArticle(fixture, [fixture]), spa.obBlogArticle(fixture, [fixture])];
  for (const html of rendered) {
    assert.ok(html.includes(expected));
    if (expected) {
      assert.ok(html.indexOf('ob-blog-references') > html.indexOf('ob-blog-faq'));
      assert.ok(html.indexOf('ob-blog-references') < html.indexOf('ob-blog-legal-note'));
      assert.equal((html.match(/class="ob-blog-references"/g) || []).length, 1);
    } else {
      assert.doesNotMatch(html, /class="ob-blog-references"/);
    }
  }
  if (references !== valid && references !== undefined && Array.isArray(references) && references.length === 1 && (unsafeUrls.includes(references[0]?.url) || invalidEntries.includes(references[0]))) assert.equal(expected, '');
  cases++;
}
const safe = ssr.renderBlogReferences({ references: valid });
assert.match(safe, /Official &lt;guide&gt; &amp; &quot;reference&quot;/);
assert.match(safe, /Review &lt;claims&gt; &amp; &quot;limits&quot;\./);
assert.match(safe, /href="https:\/\/example\.com\/guide\?q=one&amp;other=two"/);
assert.match(safe, /target="_blank" rel="noopener noreferrer"/);
assert.doesNotMatch(safe, /<claims>|<guide>/);
assert.equal(ssr.renderBlogReferences({ references: [{ title: 'Quoted URL', url: 'https://example.com/?q="onclick="alert(1)' }] }).includes('href="https://example.com/?q=%22onclick=%22alert(1)"'), true, 'URL normalization cannot break the quoted attribute');
const posts = JSON.parse(previous('data/ownlybiz-blog-posts.json'));
for (const item of posts) {
  assert.equal(ssr.renderBlogArticle(item, posts), oldSsr.renderBlogArticle(item, posts), `Existing SSR article unchanged: ${item.slug}`);
  assert.equal(spa.obBlogArticle(item, posts), oldSpa.obBlogArticle(item, posts), `Existing client article unchanged: ${item.slug}`);
}
console.log(`PASS blog references: ${cases} SSR/client parity cases; unsafe schemes/credentials/control characters rejected; labels/notes/URLs escaped; ${posts.length} baseline articles unchanged per renderer; zero network/build/paid-flow execution.`);
