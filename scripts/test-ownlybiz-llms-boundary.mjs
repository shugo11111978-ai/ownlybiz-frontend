import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Offline renderer comparison only; no network or expert-site interactions.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineCommit = '36c2f6ea2c5bf00b8c3f6e3d8509c531dcfc4d62';
const baseline = execFileSync('git', ['show', `${baselineCommit}:api/llms.js`], { cwd: root, encoding: 'utf8' });
const baselineData = execFileSync('git', ['show', `${baselineCommit}:data/ownlybiz-blog-posts.json`], { cwd: root, encoding: 'utf8' });
const candidate = fs.readFileSync(path.join(root, 'api/llms.js'), 'utf8');
const frozen = JSON.parse(fs.readFileSync(path.join(root, 'data/ownlybiz-legacy-llms-guides.json'), 'utf8'));
assert.deepEqual(frozen, JSON.parse(baselineData).map(({ title, slug }) => ({ title, slug })), 'Only exact deployed title/slug pairs belong in the frozen non-platform inventory');
const changedPosts = [
  { ...JSON.parse(baselineData)[0], title: 'Changed platform guide title', slug: 'changed-platform-guide' },
  { title: 'New platform guide', slug: 'new-platform-guide' },
];

async function render(source, headers, blogData) {
  const result = { status: 0, headers: {}, body: '' };
  const reads = [];
  const context = {
    module: { exports: {} },
    require: name => {
      assert.ok(['fs', 'path'].includes(name));
      return name === 'fs' ? {
        readFileSync(filename, encoding) {
          reads.push(path.basename(filename));
          if (path.basename(filename) === 'ownlybiz-blog-posts.json' && blogData !== undefined) return blogData;
          assert.ok(['ownlybiz-blog-posts.json', 'ownlybiz-legacy-llms-guides.json'].includes(path.basename(filename)), 'Only public guide data may be read');
          return fs.readFileSync(filename, encoding);
        },
      } : path;
    },
    process: { cwd: () => root, env: { NODE_ENV: 'test' } },
    fetch() { throw new Error('Network is forbidden'); },
  };
  vm.runInNewContext(source, context, { filename: 'api/llms.js' });
  await context.module.exports({ headers }, {
    setHeader(key, value) { result.headers[key] = value; },
    status(code) { result.status = code; return this; },
    send(body) { result.body = body; },
  });
  return { result, reads };
}

const protectedHeaders = [
  { host: 'lunapsychics.com' },
  { host: 'www.lunapsychics.com' },
  { host: 'lunapsychics.online' },
  { host: 'www.lunapsychics.online' },
  { host: 'LUNAPSYCHICS.COM:443' },
  { host: 'exampleexpert.ownlybiz.com' },
  { host: 'expert.example.com' },
  { host: 'expert.example.com:443' },
  { host: 'expert.example.com', 'x-forwarded-host': 'expert.example.com, proxy.example' },
  { host: 'ownlybiz.com', 'x-forwarded-host': 'exampleexpert.ownlybiz.com' },
  { host: '192.168.1.5' },
  { host: '' },
  {},
];
for (const headers of protectedHeaders) {
  const expected = (await render(baseline, headers, baselineData)).result;
  for (const data of [undefined, JSON.stringify(changedPosts), 'not valid json']) {
    const actual = await render(candidate, headers, data);
    assert.deepEqual(actual.result, expected, `Non-platform response changed: ${JSON.stringify(headers)}`);
    assert.deepEqual(actual.reads, ['ownlybiz-legacy-llms-guides.json'], 'Non-platform responses must not consume current platform content');
  }
}

for (const host of ['ownlybiz.com', 'www.ownlybiz.com', 'OWNLYBIZ.COM:443', 'preview.vercel.app', 'localhost', '127.0.0.1']) {
  const { result, reads } = await render(candidate, { host });
  assert.deepEqual(reads, ['ownlybiz-blog-posts.json']);
  assert.equal(result.status, 200);
  assert.equal(result.headers['Content-Type'], 'text/plain; charset=utf-8');
  assert.match(result.body, /Independent experts provide their own services and remain separate businesses/);
  assert.match(result.body, /Human Reply Assistant prepares suggestions/);
  assert.match(result.body, /Automatic AI Chat is a separate, controlled client-facing capability/);
  for (const route of ['/how', '/features', '/pricing', '/experts', '/contact', '/blog']) assert.ok(result.body.includes(`https://ownlybiz.com${route}`));
  assert.doesNotMatch(result.body, /Luna|lunapsychics/);
  const changed = (await render(candidate, { host }, JSON.stringify(changedPosts))).result;
  for (const post of changedPosts) assert.ok(changed.body.includes(`- ${post.title}: https://ownlybiz.com/blog/${post.slug}`));
  assert.ok(!changed.body.includes(JSON.parse(baselineData)[0].title), 'Platform responses follow edited content rather than the frozen list');
}
console.log(`PASS llms boundary: ${protectedHeaders.length * 3} exact deployed non-platform responses preserved against baseline data; 6 platform hosts follow current/changed/new posts; frozen inventory verified; zero network requests.`);
