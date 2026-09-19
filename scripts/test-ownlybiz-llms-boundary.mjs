import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Platform response parity; expert-host isolation is intentionally corrected
// and covered by test-expert-public-contract.mjs. No real network is permitted.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const shared = require('../lib/expert-public.js');
const baseline = execFileSync('git', ['show', '756e223bfbf6f62104f70a39776bac3fd190214e:api/llms.js'], { cwd: root, encoding: 'utf8' });
const candidate = fs.readFileSync(path.join(root, 'api/llms.js'), 'utf8');
const changedPosts = [{ title: 'Changed platform guide title', slug: 'changed-platform-guide' }, { title: 'New platform guide', slug: 'new-platform-guide' }];

async function render(source, headers, blogData) {
  const result = { status: 0, headers: {}, body: '' };
  const reads = [];
  const context = {
    module: { exports: {} },
    require(name) {
      if (name === '../lib/expert-public') return { ...shared, createExpertResolver: () => ({ resolve: () => { throw new Error('Platform llms must not resolve experts'); } }) };
      if (name === 'path') return path;
      assert.equal(name, 'fs');
      return { readFileSync(filename, encoding) { reads.push(path.basename(filename)); if (blogData !== undefined) return blogData; return fs.readFileSync(filename, encoding); } };
    },
    process: { cwd: () => root, env: { NODE_ENV: 'test' } },
  };
  vm.runInNewContext(source, context, { filename: 'api/llms.js' });
  await context.module.exports({ headers, url: '/llms.txt', method: 'GET' }, { setHeader(key, value) { result.headers[key] = value; }, status(code) { result.status = code; return this; }, send(body) { result.body = body; } });
  return { result, reads };
}
for (const host of ['ownlybiz.com', 'www.ownlybiz.com', 'OWNLYBIZ.COM:443', 'preview.vercel.app', 'localhost', '127.0.0.1']) {
  for (const posts of [undefined, JSON.stringify(changedPosts), 'not valid json']) {
    const before = await render(baseline, { host }, posts);
    const after = await render(candidate, { host }, posts);
    assert.deepEqual(after, before, `Platform llms response unchanged for ${host}`);
    assert.equal(after.result.status, 200);
    assert.match(after.result.body, /Independent experts provide their own services and remain separate businesses/);
    assert.match(after.result.body, /Automatic AI Chat is a separate, controlled client-facing capability/);
    assert.doesNotMatch(after.result.body, /Luna|lunapsychics/);
  }
}
console.log('PASS llms boundary: exact production-baseline response parity for 6 platform hosts × 3 content states; expert isolation covered separately; zero network.');
