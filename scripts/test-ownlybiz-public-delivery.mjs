import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Offline source/fixture verification only. This never executes application
// payment, checkout, billing, refund, authorization or session functions.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = '5764d073db39aed45dc81094db740aa2ad45bb25';
const require = createRequire(import.meta.url);
let acorn;
try { acorn = require(process.env.OWNLYBIZ_ACORN_PATH || 'acorn'); }
catch (_) { throw new Error('Acorn is required: install it in your test environment or set OWNLYBIZ_ACORN_PATH to an existing acorn module. No packages are fetched by this test.'); }
const sha = text => createHash('sha256').update(text).digest('hex');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const parseScripts = html => [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map((match, index) => ({ index, attrs: match[1], code: match[2], id: match[1].match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1] || '' }));

// The builder's check mode independently rejects missing or stale artifacts.
execFileSync(process.execPath, ['build-public-shell.mjs', '--check'], { cwd: root, stdio: 'pipe' });
const source = read('index.html');
const html = read('data/ownlybiz-platform.html');
const manifest = JSON.parse(read('data/ownlybiz-platform-build.json'));
assert.equal(manifest.version, 1);
assert.equal(manifest.sourceSha256, sha(source), 'Manifest source must be current');
assert.equal(manifest.sourceBytes, Buffer.byteLength(source));
assert.equal(manifest.htmlSha256, sha(html));
assert.equal(manifest.htmlBytes, Buffer.byteLength(html));
assert.ok(manifest.htmlBytes < 1_800_000, 'Conservative public HTML size budget');
assert.equal(manifest.legalSha256, sha(read('data/ownlybiz-platform-legal.json')));

const original = parseScripts(source);
const delivered = parseScripts(html);
assert.equal(delivered.length, original.length, 'Script count and order must remain unchanged');
const externalized = new Map(manifest.scripts.map(entry => [entry.index, entry]));
assert.equal(externalized.size, manifest.scripts.length, 'Unique manifest ordinals');
const expectedResources = new Set();
for (const script of delivered) {
  const entry = externalized.get(script.index);
  if (!entry) {
    assert.deepEqual([script.attrs, script.code], [original[script.index].attrs, original[script.index].code], `Inline/existing external script ${script.index} unchanged`);
    continue;
  }
  assert.match(entry.resource, /^assets\/ownlybiz-public\/[a-f0-9]{64}\.js$/);
  assert.equal(entry.attributes, original[script.index].attrs);
  assert.equal(script.attrs, entry.attributes + ` src="/${entry.resource}"`, 'Only a blocking classic src is added');
  assert.equal(script.code, '');
  const contents = read(entry.resource);
  assert.equal(contents, original[script.index].code, `External script ${script.index} is byte-for-byte original`);
  assert.equal(entry.sha256, sha(contents));
  assert.equal(entry.resource, `assets/ownlybiz-public/${sha(contents)}.js`);
  assert.equal(entry.bytes, Buffer.byteLength(contents));
  assert.doesNotMatch(entry.attributes, /\b(?:async|defer|nomodule)\b/i);
  assert.doesNotMatch(contents, /document\.currentScript|document\.write\s*\(/);
  expectedResources.add(path.basename(entry.resource));
}
const resourceDirectory = path.join(root, 'assets/ownlybiz-public');
const unreferencedResources = fs.readdirSync(resourceDirectory).filter(name => /^[a-f0-9]{64}\.js$/.test(name) && !expectedResources.has(name));
// Prior content-addressed resources are inert. Report them without deleting or
// treating them as a delivery failure; every referenced resource is checked.

const baseline = execFileSync('git', ['show', `${base}:index.html`], { cwd: root, encoding: 'utf8', maxBuffer: 20_000_000 });
const baselineScripts = parseScripts(baseline);
assert.equal(original.length, baselineScripts.length, 'SEO patch must not insert/delete runtime scripts');
const isExecutable = script => !/\bsrc\s*=/.test(script.attrs) && (!/\btype\s*=/.test(script.attrs) || /\btype\s*=\s*["'](?:text|application)\/javascript["']/i.test(script.attrs));
const parse = code => acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true });
function visit(node, fn, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') fn(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) value.forEach(child => visit(child, fn, node));
    else if (value && typeof value === 'object') visit(value, fn, node);
  }
}
function expressionName(node) {
  if (!node) return '';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal') return String(node.value);
  if (node.type === 'MemberExpression') return expressionName(node.object) + '.' + expressionName(node.property);
  return '';
}
function functionEntries(script) {
  const entries = [];
  const seen = new Map();
  const ast = parse(script.code);
  visit(ast, (node, parent) => {
    if (!['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) return;
    const name = node.id?.name || (parent?.type === 'VariableDeclarator' ? expressionName(parent.id) : parent?.type === 'AssignmentExpression' ? expressionName(parent.left) : ['Property', 'MethodDefinition'].includes(parent?.type) ? expressionName(parent.key) : '');
    if (!name) return;
    const occurrence = seen.get(name) || 0;
    seen.set(name, occurrence + 1);
    entries.push({ key: `${script.index}:${name}:${occurrence}`, name, node, code: script.code.slice(node.start, node.end) });
  });
  return { ast, entries };
}
const currentFunctions = new Map();
const baselineFunctions = new Map();
const parsedCurrent = new Map();
const parsedBaseline = new Map();
for (const [scripts, functions, parsed] of [[original, currentFunctions, parsedCurrent], [baselineScripts, baselineFunctions, parsedBaseline]]) {
  for (const script of scripts.filter(isExecutable)) {
    const result = functionEntries(script);
    parsed.set(script.index, result);
    for (const entry of result.entries) functions.set(entry.key, entry);
  }
}
const criticalName = /payment|checkout|billing|refund|session|settle|stripe|authoriz|capture|credit/i;
const criticalKeys = new Set([...baselineFunctions, ...currentFunctions].filter(([, value]) => criticalName.test(value.name)).map(([key]) => key));
for (const key of criticalKeys) {
  assert.ok(baselineFunctions.has(key) && currentFunctions.has(key), `Critical function added/removed: ${key}`);
  assert.equal(currentFunctions.get(key).code, baselineFunctions.get(key).code, `Critical function changed: ${key}`);
}
assert.ok(criticalKeys.size > 100, 'Critical-function coverage unexpectedly small');
const criticalId = /payment|checkout|billing|refund|session|settle|stripe|authoriz|receipt|credit|group|live|sfu/i;
const additionalCriticalIds = new Set([
  'ob-expert-booking-selector-20260608-js',
  'ownlybiz-production-realtime-resume-v1',
  'ownlybiz-chat-outbox-v2',
  'ob-prod-free-minute-eligibility-ui-20260516',
  'ob-client-end-control-hardening-20260516-script',
  'ownlybiz-service-pause-ui-20260526',
  'ownlybiz-on-demand-readings-20260607',
  'ownlybiz-expert-funnel-high-risk-20260610',
]);
const criticalScripts = baselineScripts.filter(script => criticalId.test(script.id) || additionalCriticalIds.has(script.id));
for (const script of criticalScripts) {
  assert.deepEqual([original[script.index].attrs, original[script.index].code], [script.attrs, script.code], `Dedicated critical script changed: ${script.id}`);
}
assert.ok(criticalScripts.length >= 20, 'Critical-script coverage unexpectedly small');

const aiId = 'ob-ai-website-editor-20260517';
const aiCurrent = original.find(script => script.id === aiId);
const aiBase = baselineScripts.find(script => script.id === aiId);
assert.ok(aiCurrent && aiBase);
const currentAi = parsedCurrent.get(aiCurrent.index);
const baseAi = parsedBaseline.get(aiBase.index);
function stripPositions(value) {
  if (Array.isArray(value)) return value.map(stripPositions);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'start' && key !== 'end').map(([key, entry]) => [key, stripPositions(entry)]));
}
const normalizedAi = structuredClone(currentAi.ast);
visit(normalizedAi, node => {
  if (node.type === 'BlockStatement') node.body = node.body.filter(child => !(child.type === 'FunctionDeclaration' && child.id?.name === 'isPlatformMarketingAiBoundary'));
  if (node.type === 'FunctionDeclaration' && ['requestedAiPageSlug', 'renderAiPublicExtras'].includes(node.id?.name)) {
    const guard = node.body.body.shift();
    assert.equal(guard?.type, 'IfStatement');
    assert.equal(guard.test?.callee?.name, 'isPlatformMarketingAiBoundary');
    assert.equal(guard.consequent?.type, 'ReturnStatement');
  }
});
assert.deepEqual(stripPositions(normalizedAi), stripPositions(baseAi.ast), 'AI editor differs only by the explicit platform boundary and two early returns');

const helperNames = ['clean', 'esc', 'safeSlug', 'safeImage', 'requestedAiPageSlug', 'aiPageHref', 'aiPageKey', 'parseWebsiteContent', 'parsedObject', 'publicMarketplaceEnabled', 'sectionHtml', 'renderAiPublicExtras', 'isPlatformMarketingAiBoundary'];
function helperCode(parsed) {
  return helperNames.map(name => parsed.entries.find(entry => entry.name === name)?.code || '').join('\n');
}
function contextFor(url, document, mutations = []) {
  const location = new URL(url);
  const context = { URLSearchParams, location, document, history: { replaceState: (...args) => mutations.push(['history', ...args]) }, _currentExpert: { slug: 'expert-slug' }, showExpertPage: name => mutations.push(['page', name]) };
  context.window = context;
  return vm.createContext(context);
}
let platformCases = 0;
for (const host of ['ownlybiz.com', 'www.ownlybiz.com', 'localhost', '127.0.0.1', 'preview.vercel.app']) {
  for (const route of ['/', '/index.html', '/how', '/features', '/pricing', '/experts', '/blog', '/blog/expert-service-pages-that-convert', '/contact', '/legal/privacy', '/terms', '/privacy']) {
    const forbidden = new Proxy({}, { get() { throw new Error('Platform AI guard touched DOM/history'); }, set() { throw new Error('Platform AI guard mutated DOM/history'); } });
    const context = contextFor(`https://${host}${route}?utm_source=test`, forbidden);
    context.history = forbidden;
    vm.runInContext(helperCode(currentAi), context);
    assert.equal(vm.runInContext('isPlatformMarketingAiBoundary()', context), true);
    assert.equal(vm.runInContext('requestedAiPageSlug()', context), '');
    vm.runInContext('renderAiPublicExtras({website_content:{ai_pages:[{slug:"a-guide",title:"Example"}]}})', context, { timeout: 1000 });
    platformCases++;
  }
}

// Small deterministic DOM fixture; no browser, API or customer session involved.
function expertFixture() {
  function node(tag, id = '') {
    return {
      tag, id, className: '', innerHTML: '', attributes: {}, dataset: {}, children: [], parentNode: null,
      setAttribute(key, value) { this.attributes[key] = value; },
      appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
      insertBefore(child, before) { child.parentNode = this; this.children.splice(this.children.indexOf(before), 0, child); return child; },
      removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; },
      querySelectorAll() { return []; },
    };
  }
  const body = node('body');
  const parent = body.appendChild(node('div', 'view-4'));
  const home = parent.appendChild(node('div', 'ep-home'));
  const book = parent.appendChild(node('div', 'ep-book'));
  const links = parent.appendChild(node('ul', 'expert-site-links'));
  const ids = new Map([body, parent, home, book, links].map(entry => [entry.id, entry]));
  const document = { body, getElementById: id => ids.get(id) || null, querySelectorAll: () => [], createElement: tag => node(tag) };
  function snapshot(entry) { return { tag: entry.tag, id: entry.id, className: entry.className, innerHTML: entry.innerHTML, attributes: entry.attributes, dataset: entry.dataset, children: entry.children.map(snapshot) }; }
  return { document, snapshot: () => snapshot(body) };
}
const expertData = {
  slug: 'expert-slug',
  website_content: {
    ai_sections: [{ id: 'welcome', title: 'Welcome', body: 'Public expert introduction.' }],
    ai_pages: [{ slug: 'about-me', title: 'My approach', summary: 'A public expert page.', meta_title: 'My approach — Expert', meta_description: 'How this expert works.', sections: [{ title: 'What to expect', body: 'A clearly scoped conversation.', items: ['Prepare one question.'] }] }],
  },
};
let expertCases = 0;
for (const url of ['https://expert.example/about-me', 'https://guide.ownlybiz.com/about-me', 'https://ownlybiz.com/expert-slug/about-me', 'https://expert.example/missing-page', 'https://ownlybiz.com/expert-slug/missing-page', 'https://ownlybiz.com/blog/about-me?expert=expert-slug']) {
  const results = [];
  for (const parsed of [baseAi, currentAi]) {
    const fixture = expertFixture();
    const mutations = [];
    const context = contextFor(url, fixture.document, mutations);
    context.data = structuredClone(expertData);
    vm.runInContext(helperCode(parsed), context);
    const requested = vm.runInContext('requestedAiPageSlug()', context);
    vm.runInContext('renderAiPublicExtras(data)', context, { timeout: 1000 });
    results.push(JSON.parse(JSON.stringify({ requested, mutations, pending: context._pendingExpertPage, dom: fixture.snapshot() })));
  }
  assert.deepEqual(results[1], results[0], `Expert custom-page behavior preserved: ${url}`);
  assert.ok(results[1].dom.children[0].children.some(node => node.id === 'ep-ai-about-me'));
  expertCases++;
}

console.log(JSON.stringify({ status: 'PASS', baseline: base, publicHtmlBytes: manifest.htmlBytes, totalScripts: original.length, externalizedScripts: manifest.scripts.length, referencedResources: expectedResources.size, unreferencedContentAddressedResources: unreferencedResources.length, criticalFunctionsUnchanged: criticalKeys.size, criticalScriptsUnchanged: criticalScripts.length, platformNoMutationCases: platformCases, expertCustomPageParityCases: expertCases, networkRequests: 0, paidWorkflowExecution: false }));
