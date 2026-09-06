import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'ownlybiz-blog-content-test-'));
const updatedSlugs = new Set([
  'expert-service-pages-that-convert',
  'email-marketing-for-independent-experts',
  'repeat-client-system-packages-credit-email'
]);

try {
  // Content regeneration must reproduce committed data without touching images.
  execFileSync(process.execPath, [path.join(root, 'scripts/generate-ownlybiz-blog-content.mjs'), '--content-only'], {
    cwd: output,
    stdio: 'pipe'
  });
  const generated = JSON.parse(fs.readFileSync(path.join(output, 'data/ownlybiz-blog-posts.json'), 'utf8'));
  const committed = JSON.parse(fs.readFileSync(path.join(root, 'data/ownlybiz-blog-posts.json'), 'utf8'));
  assert.deepEqual(generated, committed, 'Blog JSON must stay in sync with the content generator');
  assert.equal(fs.existsSync(path.join(output, 'assets')), false, 'Content-only generation must not create or replace image assets');
  assert.equal(generated.length, 15);
  assert.equal(new Set(generated.map(post => post.slug)).size, generated.length, 'Every published guide needs a unique route');

  for (const post of generated) {
    const minutes = Number.parseInt(post.readTime, 10);
    assert.ok(Number.isInteger(post.wordCount) && post.wordCount > 0);
    assert.ok((minutes - 1) * 220 < post.wordCount && post.wordCount <= minutes * 220,
      `${post.slug}: reading-time estimate must describe the current article length`);
    assert.equal(post.date, '2026-06-14', 'An editorial update must not reset the original publication date');
    if (updatedSlugs.has(post.slug)) {
      assert.equal(post.dateModified, '2026-09-06');
      assert.ok(post.sections.length >= 7, `${post.slug}: keep the expanded guide structure`);
      assert.equal(post.faqs.length, 3);
      assert.ok(post.sections.some(section => /example/i.test(section.heading)), `${post.slug}: preserve the worked example`);
    } else {
      assert.equal(post.dateModified, undefined, 'Do not claim an editorial update to untouched guides');
    }
  }

  console.log('PASS: 15 guides regenerate identically; reading estimates and publication/update dates are consistent; content-only mode leaves images alone.');
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}
