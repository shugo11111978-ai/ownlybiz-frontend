import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'ownlybiz-blog-content-test-'));
const newSlugs = new Set([
  'linkedin-content-plan-independent-experts',
  'human-expertise-value-ai-answers',
  'consultation-promotions-discounts-intro-minutes-prepaid-credit'
]);
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
  assert.equal(generated.length, 18);
  assert.equal(new Set(generated.map(post => post.slug)).size, generated.length, 'Every published guide needs a unique route');
  const baseline = JSON.parse(execFileSync('git', ['show', '36c2f6ea2c5bf00b8c3f6e3d8509c531dcfc4d62:data/ownlybiz-blog-posts.json'], { cwd: root, encoding: 'utf8' }));
  assert.deepEqual(generated.filter(post => !newSlugs.has(post.slug)), baseline, 'All 15 deployed guides and their order must remain unchanged');
  assert.equal(JSON.stringify(generated.filter(post => !newSlugs.has(post.slug))), JSON.stringify(baseline), 'Preserve deployed guide field serialization as well as content');
  assert.equal(generated.filter(post => newSlugs.has(post.slug)).length, newSlugs.size);

  // Default generation runs only in an owned fixture. New articles reuse images;
  // they must not overwrite those illustrations with different slug/index seeds.
  execFileSync(process.execPath, [path.join(root, 'scripts/generate-ownlybiz-blog-content.mjs')], { cwd: output, stdio: 'pipe' });
  const uniqueImages = new Set(generated.map(post => post.image));
  assert.equal(uniqueImages.size, 15);
  for (const image of uniqueImages) {
    assert.ok(fs.readFileSync(path.join(output, image)).equals(fs.readFileSync(path.join(root, image))), `Reused image bytes are unchanged: ${image}`);
  }

  for (const post of generated) {
    const minutes = Number.parseInt(post.readTime, 10);
    assert.ok(Number.isInteger(post.wordCount) && post.wordCount > 0);
    assert.ok((minutes - 1) * 220 < post.wordCount && post.wordCount <= minutes * 220,
      `${post.slug}: reading-time estimate must describe the current article length`);
    assert.ok(post.image.startsWith('/assets/blog/') && fs.existsSync(path.join(root, post.image)), `${post.slug}: use an existing blog image`);
    if (newSlugs.has(post.slug)) {
      assert.equal(post.date, '2026-09-06', 'New guides use the candidate publication date, not a backdated date');
      assert.equal(post.dateModified, undefined);
      assert.ok(post.wordCount >= 850, `${post.slug}: retain the substantive original guide`);
      assert.ok(post.sections.length >= 7);
      assert.equal(post.faqs.length, 3);
      assert.equal(post.takeaways.length, 3);
      assert.ok(post.sections.some(section => /hypothetical/i.test(section.body.join(' '))), `${post.slug}: label invented examples`);
      assert.ok(post.references.length >= 2);
      for (const reference of post.references) {
        const url = new URL(reference.url);
        assert.equal(url.protocol, 'https:');
        assert.ok(url.hostname && !url.username && !url.password && reference.title.trim());
      }
      continue;
    }
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

  console.log('PASS: 18 guides regenerate identically; 15 deployed guides are unchanged; 3 original additions have labeled examples and references; dates and reading estimates are consistent; content-only mode and default-mode shared-image preservation pass.');
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}
