import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Offline renderer comparison only; no network or expert-site interactions.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = execFileSync('git', ['show', '5764d073db39aed45dc81094db740aa2ad45bb25:api/llms.js'], { cwd: root, encoding: 'utf8' });
const candidate = fs.readFileSync(path.join(root, 'api/llms.js'), 'utf8');

async function render(source, headers) {
  const result = { status: 0, headers: {}, body: '' };
  const context = {
    module: { exports: {} },
    require: name => {
      assert.ok(['fs', 'path'].includes(name));
      return name === 'fs' ? fs : path;
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
  return result;
}

const protectedHeaders = [
  { host: 'lunapsychics.com' },
  { host: 'www.lunapsychics.com' },
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
  assert.deepEqual(await render(candidate, headers), await render(baseline, headers), `Non-platform response changed: ${JSON.stringify(headers)}`);
}

for (const host of ['ownlybiz.com', 'www.ownlybiz.com', 'OWNLYBIZ.COM:443', 'preview.vercel.app', 'localhost', '127.0.0.1']) {
  const result = await render(candidate, { host });
  assert.equal(result.status, 200);
  assert.equal(result.headers['Content-Type'], 'text/plain; charset=utf-8');
  assert.match(result.body, /Independent experts provide their own services and remain separate businesses/);
  assert.match(result.body, /Human Reply Assistant prepares suggestions/);
  assert.match(result.body, /Automatic AI Chat is a separate, controlled client-facing capability/);
  for (const route of ['/how', '/features', '/pricing', '/experts', '/contact', '/blog']) assert.ok(result.body.includes(`https://ownlybiz.com${route}`));
  assert.doesNotMatch(result.body, /Luna|lunapsychics/);
}
console.log(`PASS llms boundary: ${protectedHeaders.length} exact baseline non-platform responses preserved; 6 platform host variants validated; zero network requests.`);
