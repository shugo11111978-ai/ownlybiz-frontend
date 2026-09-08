import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import articleClarity from './ownlybiz-article-clarity-20260908.mjs';

const claritySlugs = new Set(['expert-business-tool-stack-vs-ownlybiz', 'independent-expert-dashboard-checklist', 'chat-voice-video-written-session-formats', 'consultation-promotions-discounts-intro-minutes-prepaid-credit', 'packages-fixed-sessions-per-minute-pricing', 'stripe-apple-pay-google-pay-expert-checkout', 'pay-by-minute-sessions-guide', 'custom-domain-expert-website', 'ownlybiz-feature-map-for-experts', 'ai-drafting-for-expert-marketing', 'ownlybiz-transparent-platform-fees-expert-keep-rate', 'turn-social-followers-into-paid-sessions', 'expert-service-pages-that-convert', 'repeat-client-system-packages-credit-email']);
const editorial = post => {
  const { image, imageAlt, media, wordCount, readTime, ...copy } = post;
  return { ...copy, sections: copy.sections.map(({ productFigures, ...section }) => section) };
};
const productTargets = [
  ['pay-by-minute-sessions-guide', 'Give clients clarity before the clock matters', 1],
  ['turn-social-followers-into-paid-sessions', 'Use Ownlybiz to reduce the handoff friction', 1],
  ['custom-domain-expert-website', 'What Ownlybiz gives the expert site', 1],
  ['chat-voice-video-written-session-formats', 'How to choose formats', 2],
  ['email-marketing-for-independent-experts', 'Turn the message into a reviewed draft', 1],
  ['ownlybiz-feature-map-for-experts', 'Manage', 1],
  ['consultation-promotions-discounts-intro-minutes-prepaid-credit', 'Make the settings match the sentence', 1],
];
const productFileTargets = new Map([
  ['pay-by-minute-sessions-guide', ['product-chat-desktop']],
  ['turn-social-followers-into-paid-sessions', ['product-chat-mobile']],
  ['custom-domain-expert-website', ['product-domain']],
  ['chat-voice-video-written-session-formats', ['product-voice', 'product-video']],
  ['email-marketing-for-independent-experts', ['product-email-compose']],
  ['ownlybiz-feature-map-for-experts', ['product-clients']],
  ['consultation-promotions-discounts-intro-minutes-prepaid-credit', ['product-promotions']],
]);
const productFiles = posts => posts.flatMap(post => post.sections.flatMap(section => (section.productFigures || []).flatMap(figure => [figure.src, figure.webp])));
const articleWords = post => [
  post.title,
  post.summary,
  ...(post.takeaways || []),
  ...post.sections.flatMap(section => [
    section.heading,
    ...(section.body || []),
    ...(section.bullets || []),
    ...(section.visualSummary ? [section.visualSummary.title, ...section.visualSummary.columns, ...section.visualSummary.rows.flat(), section.visualSummary.note] : []),
    ...(section.productFigures || []).flatMap(figure => [figure.title, figure.caption]),
  ]),
  ...(post.faqs || []).flatMap(faq => [faq.question, faq.answer]),
].join(' ').trim().split(/\s+/u).filter(Boolean).length;

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
const reviewUpdatedSlugs = new Set([
  'independent-expert-dashboard-checklist',
  'expert-business-tool-stack-vs-ownlybiz'
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
  const unaffectedOriginal = post => !newSlugs.has(post.slug) && !reviewUpdatedSlugs.has(post.slug);
  assert.deepEqual(generated.filter(unaffectedOriginal).map(editorial), baseline.filter(unaffectedOriginal).map(articleClarity).map(editorial), 'Original copy is preserved except for the explicit Sep8 clarity overlay');
  const contentBaseline = JSON.parse(execFileSync('git', ['show', 'fd6b235cdb5720d294b07a22d25288c2dbc074a5:data/ownlybiz-blog-posts.json'], { cwd: root, encoding: 'utf8' }));
  assert.deepEqual(generated.map(post => post.slug), contentBaseline.map(post => post.slug), 'Keep all 18 routes and their exact deployed order');
  const untouched = post => !reviewUpdatedSlugs.has(post.slug);
  assert.deepEqual(generated.filter(untouched).map(editorial), contentBaseline.filter(untouched).map(articleClarity).map(editorial), 'The Sep6 additions and prior editorial updates remain outside explicit Sep8 clarity edits');
  const liveBaseline = JSON.parse(execFileSync('git', ['show', 'e41ef608585d641aff3c04856f9ec0f59eca15db:data/ownlybiz-blog-posts.json'], { cwd: root, encoding: 'utf8' }));
  for (const [index, post] of generated.entries()) {
    const original = liveBaseline[index];
    assert.deepEqual(editorial(post), editorial(articleClarity(original)));
    for (const field of ['slug', 'date', 'title', 'category', 'tags', 'audience', 'email', 'references']) assert.deepEqual(post[field], original[field], `${post.slug}: preserve ${field}`);
    if (!['packages-fixed-sessions-per-minute-pricing', 'ai-drafting-for-expert-marketing'].includes(post.slug)) assert.equal(post.summary, original.summary);
    if (post.slug !== 'ownlybiz-feature-map-for-experts') assert.equal(post.seoDescription, original.seoDescription);
    assert.deepEqual(post.relatedFeatures, original.relatedFeatures.filter(feature => !/\b(?:packages|fixed sessions)\b/i.test(feature)), 'Only obsolete package/fixed feature claims are removed');
    assert.deepEqual(post.sections.map(section => section.heading), original.sections.map(section => section.heading));
    if (!claritySlugs.has(post.slug)) assert.deepEqual(editorial(post), editorial(original));
    if (post.slug !== 'ai-drafting-for-expert-marketing') assert.deepEqual(post.takeaways, original.takeaways);
    if (['expert-business-tool-stack-vs-ownlybiz', 'independent-expert-dashboard-checklist', 'consultation-promotions-discounts-intro-minutes-prepaid-credit'].includes(post.slug)) {
      assert.deepEqual(post.sections.map(({ visualSummary, productFigures, ...section }) => section), original.sections, 'Existing arithmetic and checklist text remain exact');
      assert.deepEqual(post.faqs, original.faqs);
    }
  }
  assert.equal(generated.filter(post => newSlugs.has(post.slug)).length, newSlugs.size);
  const actualTargets = generated.flatMap(post => post.sections.filter(section => Object.hasOwn(section, 'productFigures')).map(section => {
    assert.ok(Array.isArray(section.productFigures), `${post.slug}: only an optional figure array is allowed`);
    return [post.slug, section.heading, section.productFigures.length];
  }));
  const sortedTargets = targets => [...targets].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(sortedTargets(actualTargets), sortedTargets(productTargets), 'Exactly seven selected articles receive eight screenshots in their original targeted sections');
  for (const [slug, names] of productFileTargets) {
    const post = generated.find(post => post.slug === slug);
    assert.deepEqual(post.sections.flatMap(section => (section.productFigures || []).map(figure => figure.src)), names.map(name => `/assets/blog/${name}.png`), `${slug}: use only its specifically selected product views`);
  }
  const captures = generated.flatMap(post => post.sections.flatMap(section => section.productFigures || []));
  assert.equal(captures.length, 8);
  const captureExports = productFiles(generated);
  assert.equal(captureExports.length, 16);
  assert.equal(new Set(captureExports).size, 16, 'Eight distinct captures, each with a distinct PNG/WebP pair');
  for (const figure of captures) {
    assert.deepEqual(Object.keys(figure).sort(), ['kind', 'title', 'src', 'webp', 'width', 'height', 'alt', 'caption'].sort(), 'Only the explicit public figure metadata fields are added');
    assert.equal(figure.kind, 'product-screenshot');
    assert.match(figure.src, /^\/assets\/blog\/product-[a-z0-9-]+\.png$/);
    assert.doesNotMatch(figure.src, /\s|checkout|wallet|codex|gpt/i);
    assert.equal(figure.webp, figure.src.replace(/\.png$/, '.webp'));
    assert.ok(Number.isInteger(figure.width) && Number.isInteger(figure.height) && figure.width > 1 && figure.height > 1 && figure.width <= 4096 && figure.height <= 4096);
    for (const field of ['title', 'alt', 'caption']) assert.ok(typeof figure[field] === 'string' && figure[field].trim(), `Nonempty accessible ${field}`);
    assert.match(figure.caption, /fictional|synthetic|demo/i);
  }

  // Default generation copies reviewed exports into an owned fixture. It must
  // never redraw the originals with the legacy procedural image generator.
  execFileSync(process.execPath, [path.join(root, 'scripts/generate-ownlybiz-blog-content.mjs')], { cwd: output, stdio: 'pipe' });
  const uniqueImages = new Set(generated.map(post => post.image));
  assert.equal(uniqueImages.size, 18);
  for (const image of [...generated.flatMap(post => [post.image, ...post.media.sources.map(source => source.src)]), ...captureExports]) {
    assert.ok(fs.readFileSync(path.join(output, image)).equals(fs.readFileSync(path.join(root, image))), `Reused image bytes are unchanged: ${image}`);
  }

  for (const post of generated) {
    const minutes = Number.parseInt(post.readTime, 10);
    assert.ok(Number.isInteger(post.wordCount) && post.wordCount > 0);
    assert.equal(post.wordCount, articleWords(post), `${post.slug}: count visible product titles/captions, not alternative text, paths, campaign drafts or navigation`);
    assert.ok((minutes - 1) * 220 < post.wordCount && post.wordCount <= minutes * 220,
      `${post.slug}: reading-time estimate must describe the current article length`);
    assert.ok(post.image.startsWith('/assets/blog/') && fs.existsSync(path.join(root, post.image)), `${post.slug}: use an existing blog image`);
    if (newSlugs.has(post.slug)) {
      assert.equal(post.date, '2026-09-06', 'New guides use the candidate publication date, not a backdated date');
      assert.equal(post.dateModified, claritySlugs.has(post.slug) ? '2026-09-08' : undefined);
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
    if (claritySlugs.has(post.slug)) {
      assert.equal(post.dateModified, '2026-09-08');
    } else if (reviewUpdatedSlugs.has(post.slug)) {
      assert.equal(post.dateModified, '2026-09-07');
      assert.ok(post.sections.length >= 7, `${post.slug}: retain the substantive expanded guide structure`);
      assert.ok(post.faqs.length >= 3, `${post.slug}: retain substantive FAQs`);
    } else if (updatedSlugs.has(post.slug)) {
      assert.equal(post.dateModified, '2026-09-06');
      assert.ok(post.sections.length >= 7, `${post.slug}: keep the expanded guide structure`);
      assert.equal(post.faqs.length, 3);
      assert.ok(post.sections.some(section => /example/i.test(section.heading)), `${post.slug}: preserve the worked example`);
    } else {
      assert.equal(post.dateModified, undefined, 'Do not claim an editorial update to untouched guides');
    }
  }

  console.log('PASS: 18 guides, 72 hero exports and 16 product exports regenerate identically; exactly eight product figures across seven targeted articles; product title/caption word counts exclude alternative text; four articles retain all editorial copy, fourteen explicit clarity/reading-aid/feature-list updates only; original routes/dates/headings/references and cost/checklist example text preserved; image overwrite protection passes.');
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}
