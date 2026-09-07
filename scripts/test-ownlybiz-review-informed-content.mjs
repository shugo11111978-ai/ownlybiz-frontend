import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Local data/source inspection only: no application imports, server startup,
// credentials, HTTP requests, payment simulation, or production interaction.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineCommit = 'fd6b235cdb5720d294b07a22d25288c2dbc074a5';
const dataPath = 'data/ownlybiz-blog-posts.json';
const updatedSlugs = [
  'expert-business-tool-stack-vs-ownlybiz',
  'independent-expert-dashboard-checklist',
];
const updatedSet = new Set(updatedSlugs);
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const previous = relative => git(['show', `${baselineCommit}:${relative}`]);
const currentText = fs.readFileSync(path.join(root, dataPath), 'utf8');
const baselineText = previous(dataPath).toString('utf8');
const current = JSON.parse(currentText);
const baseline = JSON.parse(baselineText);

// Preserve the actual JSON bytes inside each record, including field order and
// whitespace. A semantic-only comparison could miss an unrelated rewrite.
function rawRecords(text) {
  const records = [];
  let quoted = false;
  let escaped = false;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      assert.ok(depth >= 0, 'Raw record extraction requires balanced objects');
      if (depth === 0) records.push(text.slice(start, i + 1));
    }
  }
  assert.equal(depth, 0);
  assert.equal(quoted, false);
  const parsed = JSON.parse(text);
  assert.ok(Array.isArray(parsed));
  assert.deepEqual(records.map(record => JSON.parse(record)), parsed);
  return records;
}

const parserFixture = [{ text: 'A } and \\" { inside text', nested: [{ valid: true }] }, { text: 'Second' }];
assert.deepEqual(rawRecords(JSON.stringify(parserFixture, null, 2)).map(JSON.parse), parserFixture);

assert.equal(current.length, 18);
assert.equal(new Set(current.map(post => post.slug)).size, 18);
assert.deepEqual(current.map(post => post.slug), baseline.map(post => post.slug), 'No route addition, removal or reordering');
const currentRaw = rawRecords(currentText);
const baselineRaw = rawRecords(baselineText);
const changed = current.filter((post, index) => currentRaw[index] !== baselineRaw[index]).map(post => post.slug);
assert.deepEqual(changed, updatedSlugs, 'Exactly the two authorized records change, in their existing order');

for (const [index, post] of current.entries()) {
  const original = baseline[index];
  if (!updatedSet.has(post.slug)) {
    assert.equal(currentRaw[index], baselineRaw[index], `${post.slug}: untouched record must be byte-identical`);
    continue;
  }
  for (const field of ['slug', 'date', 'image', 'imageAlt']) {
    assert.equal(post[field], original[field], `${post.slug}: preserve deployed ${field}`);
  }
  assert.equal(post.date, '2026-06-14');
  assert.equal(post.dateModified, '2026-09-07');
  assert.ok(post.wordCount >= 650 && post.wordCount > original.wordCount + 100, `${post.slug}: substantive original expansion`);
  assert.ok(post.sections.length >= 7);
  assert.ok(post.faqs.length >= 3);
  assert.notDeepEqual(post.sections, original.sections, `${post.slug}: update the article, not only metadata`);
  assert.notDeepEqual(post.faqs, original.faqs, `${post.slug}: supply relevant revised FAQs`);
  assert.ok(post.faqs.every(faq => faq.question.trim() && faq.answer.trim()));
}

function strings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}
const revised = current.filter(post => updatedSet.has(post.slug));
for (const post of revised) {
  const publicStrings = strings(post);
  const text = publicStrings.join('\n');
  assert.doesNotMatch(text, /\b(?:Paperbell|Simply[.\s-]*Coach|CoachAccountable|Delenta|Practice[\s-]*Better|Consolto|AtomChat|Kajabi|Podia|Stan)\b/i, `${post.slug}: brand-only content, no named competitors`);
  assert.doesNotMatch(text, /\b(?:Capterra|Trustpilot|Software\s*Advice|GetApp|G2)\b|\breviewers?\s+(?:say|said|complain|reported?|allege)/i, `${post.slug}: no review-site or reviewer attribution`);
  for (const sentence of publicStrings.flatMap(value => value.split(/(?<=[.!?;])\s+|\b(?:but|however)\b/i))) {
    if (/\b(?:no|not|never|without|avoid|cannot|can't|doesn't)\b/i.test(sentence)) continue;
    assert.doesNotMatch(sentence, /\bguarantee(?:d|s)?\b.{0,100}\b(?:clients|income|sales|savings|traffic|rankings|citations|results|success|revenue)\b|\b(?:clients|income|sales|savings|traffic|rankings|citations|results|success|revenue)\b.{0,40}\bguaranteed\b/i, `${post.slug}: no unqualified performance guarantee`);
  }
}

const checklist = current.find(post => post.slug === 'independent-expert-dashboard-checklist');
const checklistItems = strings(checklist.sections).filter(text => /^\s*\d{1,2}\.\s+/.test(text));
assert.deepEqual(checklistItems.map(text => Number(text.match(/^\s*(\d{1,2})\./)[1])), Array.from({ length: 12 }, (_, index) => index + 1), 'Client checklist must contain precisely one ordered item numbered 1. through 12.');
assert.ok(checklistItems.every(text => text.trim().length >= 45), 'Checklist items must provide useful guidance, not just numbered labels');

// Parse the published worked examples, then independently recompute them. These
// checks fail if an amount in the article drifts; constants alone would not.
// All monetary arithmetic below uses integer cents.
const costGuide = current.find(post => post.slug === 'expert-business-tool-stack-vs-ownlybiz');
const costText = strings(costGuide.sections).join('\n');
assert.match(costText, /\bhypothetical\b|\billustrative\b/i, 'Invented cost examples must be labeled');
function section(heading) {
  const found = costGuide.sections.filter(item => item.heading === heading);
  assert.equal(found.length, 1, `Keep one unambiguous worked-example section: ${heading}`);
  return found[0];
}
function captures(text, regex, label) {
  const match = text.match(regex);
  assert.ok(match, label);
  return match.slice(1);
}
const cents = value => Math.round(Number(value.replaceAll(',', '')) * 100);
const separateTools = strings(section('A worked example: separate tools')).join('\n');
const subscription = captures(separateTools, /\$(\d+)\s*\+\s*\$(\d+)\s*\+\s*\$(\d+)\s*=\s*\$(\d+)/, 'Keep the labeled subscription calculation').map(cents);
assert.deepEqual(subscription, [2500, 2000, 1500, 6000]);
assert.equal(subscription.slice(0, 3).reduce((sum, amount) => sum + amount, 0), subscription[3]);
const [countText, amountText, revenueText] = captures(separateTools, /(\d+) client payments of \$(\d+): \$([\d,]+) in total/, 'State payment count, ticket and revenue assumptions');
const paymentCount = Number(countText);
const ticket = cents(amountText);
const revenue = cents(revenueText);
assert.deepEqual([paymentCount, ticket, revenue], [20, 5000, 100000]);
assert.equal(paymentCount * ticket, revenue);
const [percentText, fixedText] = captures(separateTools, /processing rate of (\d+(?:\.\d+)?)% plus \$(\d+(?:\.\d+)?) per payment/, 'Label the illustrative percentage and per-payment charge');
const percent = Number(percentText);
const perPayment = cents(fixedText);
assert.deepEqual([percent, perPayment], [3, 30]);
const [formulaRevenue, formulaPercent, formulaCount, formulaFixed, formulaResult] = captures(separateTools, /\(\$([\d,]+) × (\d+)%\) \+ \((\d+) × \$(\d+\.\d+)\) = \$(\d+)/, 'Preserve the explicit processing equation');
assert.deepEqual([cents(formulaRevenue), Number(formulaPercent), Number(formulaCount), cents(formulaFixed)], [revenue, percent, paymentCount, perPayment]);
const processing = revenue * percent / 100 + paymentCount * perPayment;
assert.equal(processing, 3600);
assert.equal(cents(formulaResult), processing);
const cash = captures(separateTools, /cash subtotal is \$(\d+) \+ \$(\d+) = \$(\d+)/, 'Keep cash subtotal separate and explicit').map(cents);
assert.deepEqual(cash, [subscription[3], processing, 9600]);
assert.equal(cash[0] + cash[1], cash[2]);
assert.match(separateTools, /Hypothetical example only/i);
assert.match(separateTools, /invented processing rate/i);
assert.match(separateTools, /not a Stripe quote/i);
assert.match(separateTools, /before any other applicable costs/i);

const plans = section('Published Ownlybiz plan inputs');
const expectedPlans = [['Starter', 0, 12], ['Pro', 4900, 8], ['Scale', 9900, 5]];
assert.deepEqual(plans.bullets.map(bullet => {
  const [name, monthly, percentage] = captures(bullet, /^(Starter|Pro|Scale): \$(\d+) monthly subscription plus an? (\d+)% platform fee\.$/, 'Show the dated monthly plan inputs');
  return [name, cents(monthly), Number(percentage)];
}), expectedPlans);
assert.match(strings(plans).join('\n'), /7 September 2026/);
assert.match(strings(plans).join('\n'), /requires Starter approval/);
assert.match(strings(plans).join('\n'), /monthly billing only/);
const planExample = section('A worked example: subscription plus platform fee');
assert.equal(planExample.bullets.length, 3);
const expectedSubtotals = [12000, 12900, 14900];
for (const [index, bullet] of planExample.bullets.entries()) {
  const [name, monthly, feeBasis, percentage, total] = captures(bullet, /^(Starter|Pro|Scale): \$(\d+) \+ \(\$([\d,]+) × (\d+)%\) = \$(\d+) before other costs\.$/, 'Keep plan subtotal calculations explicit');
  assert.deepEqual([name, cents(monthly), Number(percentage)], expectedPlans[index]);
  assert.equal(cents(feeBasis), revenue, 'Use the same $1,000 eligible-revenue basis');
  assert.equal(cents(monthly) + cents(feeBasis) * Number(percentage) / 100, cents(total));
  assert.equal(cents(total), expectedSubtotals[index]);
}
const planCaveats = strings(planExample).join('\n');
assert.match(planCaveats, /exclude actual processing, other retained services/i);
assert.match(planCaveats, /Do not compare these incomplete subtotals directly/i);
assert.match(planCaveats, /same required capabilities/i);
assert.match(planCaveats, /None of these numbers is take-home income/i);
const timeExample = strings(section('Keep time estimates separate from cash costs')).join('\n');
const [hoursText, hourlyText, opportunityText] = captures(timeExample, /(four|\d+) administration hours valued at \$(\d+) per hour gives \$(\d+) of estimated opportunity value/, 'Keep opportunity value separate from cash');
const hours = hoursText === 'four' ? 4 : Number(hoursText);
assert.deepEqual([hours, cents(hourlyText), cents(opportunityText)], [4, 2500, 10000]);
assert.equal(hours * cents(hourlyText), cents(opportunityText));
assert.match(timeExample, /not a \$100 software bill/i);
assert.match(timeExample, /not money you will necessarily save/i);
assert.match(timeExample, /does not automatically become paid client work/i);
assert.match(costText, /email-provider subscription/i);
assert.match(costText, /eligible account, your configured provider and a verified sender\/domain/i);
assert.match(costText, /Unknown, not \$0/);

// Exact tracked inventory AND on-disk bytes for critical sources and assets.
// Build outputs are intentionally not part of this source-only preservation
// assertion; their separate build gate must validate the current generated data.
const protectedPaths = [
  'api', 'assets', '.well-known', 'index.html',
  'data/ownlybiz-legacy-llms-guides.json',
  'build-public-shell.mjs', 'vercel.json', 'robots.txt', 'sitemap.xml',
  '_redirects', 'favicon.svg',
];
const expectedPaths = git(['ls-tree', '-rz', '--name-only', baselineCommit, '--', ...protectedPaths]).toString('utf8').split('\0').filter(Boolean).sort();
function regularFiles(relative) {
  const filename = path.join(root, relative);
  const stat = fs.lstatSync(filename);
  assert.equal(stat.isSymbolicLink(), false, `No substituted symlink: ${relative}`);
  if (stat.isDirectory()) return fs.readdirSync(filename).sort().flatMap(name => regularFiles(path.posix.join(relative, name)));
  assert.ok(stat.isFile(), `Protected entry must remain regular: ${relative}`);
  return [relative];
}
const generatedPrefix = 'assets/ownlybiz-public/';
const allProtectedFiles = protectedPaths.flatMap(regularFiles).sort();
const actualPaths = allProtectedFiles.filter(relative => !relative.startsWith(generatedPrefix));
assert.deepEqual(actualPaths, expectedPaths, 'No added or removed API, asset, payment-verification or protected source files');
for (const relative of expectedPaths) {
  assert.ok(fs.readFileSync(path.join(root, relative)).equals(previous(relative)), `Exact deployed source bytes preserved: ${relative}`);
}

// The shell builder creates ignored content-addressed assets from index.html.
// They are not tracked source additions: independently derive their complete
// expected inventory and exact bytes from the immutable baseline index instead
// of either rejecting a normal build or exempting generated code from checks.
const sha = value => createHash('sha256').update(value).digest('hex');
const baselineIndex = previous('index.html').toString('utf8');
const generatedResources = new Map();
const expectedManifestScripts = [];
for (const [index, match] of [...baselineIndex.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].entries()) {
  const [, attributes, code] = match;
  const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1] || '';
  if (/\b(?:src\s*=|async\b|defer\b|nomodule\b)/i.test(attributes)
      || (type && !/^(?:text|application)\/javascript$/i.test(type))
      || /\bid=["']ownlybiz-review-manager-20260529["']/.test(attributes)
      || Buffer.byteLength(code) < 4096 || /document\.currentScript|document\.write\s*\(/.test(code)) continue;
  const sha256 = sha(code);
  const resource = `${generatedPrefix}${sha256}.js`;
  generatedResources.set(resource, code);
  expectedManifestScripts.push({ index, resource, bytes: Buffer.byteLength(code), sha256, attributes });
}
assert.equal(expectedManifestScripts.length, 85, 'Preserve baseline extraction coverage');
assert.equal(generatedResources.size, 85);
const generatedPaths = allProtectedFiles.filter(relative => relative.startsWith(generatedPrefix));
assert.deepEqual(generatedPaths, [...generatedResources.keys()].sort(), 'Generated-script inventory must match baseline source exactly; build the public shell before this gate');
const manifestPath = path.join(root, 'data/ownlybiz-platform-build.json');
assert.ok(fs.lstatSync(manifestPath).isFile() && !fs.lstatSync(manifestPath).isSymbolicLink());
const buildManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(buildManifest.sourceSha256, sha(baselineIndex));
assert.deepEqual(buildManifest.scripts, expectedManifestScripts);
for (const [relative, code] of generatedResources) {
  assert.equal(fs.readFileSync(path.join(root, relative), 'utf8'), code, `Generated script preserves baseline code: ${relative}`);
  const exported = path.join(root, 'public', relative);
  assert.ok(fs.lstatSync(exported).isFile() && !fs.lstatSync(exported).isSymbolicLink());
  assert.equal(fs.readFileSync(exported, 'utf8'), code, `Public export preserves baseline script: ${relative}`);
}

console.log(`PASS review-informed content: exactly 2 changed records, 16 raw records preserved, 18 routes/order retained, historical dates/images preserved, 12 numbered checklist items, original expanded FAQs; published examples independently recompute to $60 subscriptions, $36 processing, $96 cash, $120/$129/$149 incomplete plan subtotals and separate $100 opportunity value; ${expectedPaths.length} protected source/asset files and ${generatedResources.size} generated/exported scripts unchanged; offline only, no paid-flow or application execution.`);
