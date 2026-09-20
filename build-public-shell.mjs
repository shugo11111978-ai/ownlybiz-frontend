import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { buildExpertShell } from './lib/build-expert-shell.mjs';

// Delivery-only build: never minify, reorder, defer, or remove application code.
// seo-shell.js selects this artifact only for public Ownlybiz marketing routes.
// Expert public routes receive a separate artifact with content-free platform
// scaffolds. Account/payment/session utility routes keep the original index.
const root = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const check = process.argv.includes('--check');
const digest = text => createHash('sha256').update(text).digest('hex');
const files = new Map();
const scripts = [];
let ordinal = 0;
let html = source.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (tag, attrs, code) => {
  const index = ordinal++;
  const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1] || '';
  // Legacy review loaders read this script node's textContent explicitly.
  const textInspected = /\bid=["']ownlybiz-review-manager-20260529["']/.test(attrs);
  // Keep parser-sensitive/self-inspecting blocks inline; retain every attribute.
  if (/\b(?:src\s*=|async\b|defer\b|nomodule\b)/i.test(attrs) || (type && !/^(?:text|application)\/javascript$/i.test(type)) ||
      textInspected || Buffer.byteLength(code) < 4096 || /document\.currentScript|document\.write\s*\(/.test(code)) return tag;
  const sha256 = digest(code);
  const resource = `assets/ownlybiz-public/${sha256}.js`;
  files.set(resource, code);
  scripts.push({ index, resource, bytes: Buffer.byteLength(code), sha256, attributes: attrs });
  return `<script${attrs} src="/${resource}"></script>`;
});
const expertBuild = buildExpertShell(html);
// Expert pages execute every extracted classic script in parser order. Advertise
// those immutable resources at the start of the head so the browser can fetch
// them while it continues receiving the document; the script nodes themselves
// remain byte-for-byte unchanged and execute only at their original positions.
const expertPreloadHrefs = scripts.map(entry => `/${entry.resource}`);
const expertPreloadMarkup = expertPreloadHrefs.map(href => `<link rel="preload" as="script" href="${href}">`).join('\n');
const expertHead = expertBuild.html.match(/<head\b[^>]*>/i);
if (!expertHead) throw new Error('Expert shell head boundary missing');
const expertHtml = expertBuild.html.slice(0, expertHead.index + expertHead[0].length) +
  `\n${expertPreloadMarkup}` + expertBuild.html.slice(expertHead.index + expertHead[0].length);
const deliveredExpertPreloadHrefs = [...expertHtml.matchAll(/<link rel="preload" as="script" href="(\/assets\/ownlybiz-public\/[a-f0-9]{64}\.js)">/g)].map(match => match[1]);
if (JSON.stringify(deliveredExpertPreloadHrefs) !== JSON.stringify(expertPreloadHrefs)) throw new Error('Expert script preload URL/order gate failed');
const expertHeadPrefix = `${expertHead[0]}\n${expertPreloadMarkup}`;
if (expertHtml.slice(expertHead.index, expertHead.index + expertHeadPrefix.length) !== expertHeadPrefix) throw new Error('Expert script preloads must immediately follow the head opening tag');
files.set('data/ownlybiz-expert.html', expertHtml);
files.set('data/ownlybiz-expert-build.json', JSON.stringify({
  version: 1,
  sourceSha256: digest(source),
  sourceBytes: Buffer.byteLength(source),
  htmlSha256: digest(expertHtml),
  htmlBytes: Buffer.byteLength(expertHtml),
  scripts,
  scaffolds: expertBuild.scaffolds,
  neutralSlots: expertBuild.neutralSlots,
}, null, 2) + '\n');

// Build-only extraction of existing approved legal copy. No evaluation in the
// HTTP handler, no new legal wording, and no dependency on a running backend.
const legalLiteral = source.match(/\bvar legalDocs = (\{[\s\S]*?\n  \});\s*\n\s*function legalDocForKey/);
if (!legalLiteral) throw new Error('Approved legalDocs literal not found');
const legalDocs = vm.runInNewContext(`(${legalLiteral[1]})`, Object.create(null), { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });
if (Object.keys(legalDocs).sort().join(',') !== 'independent,platform,privacy,terms') throw new Error('Unexpected legal document keys');
files.set('data/ownlybiz-platform-legal.json', JSON.stringify(legalDocs, null, 2) + '\n');

// The Contact page currently exists only as a static JS string. Reuse that
// exact markup for first paint, preserving form IDs and existing submit logic.
const contactFunction = source.match(/function ensureMarketingContact\(\)\{([\s\S]*?)\n  \}/)?.[1];
const contactLiteral = contactFunction?.match(/page\.innerHTML=('(?:\\.|[^'\\])*');/);
if (!contactLiteral) throw new Error('Marketing Contact literal not found');
const contactHtml = vm.runInNewContext(contactLiteral[1], Object.create(null), { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });
const contact = `<div class="mkt-page" id="mkt-page-contact" role="main">${contactHtml}</div>\n`;
const loginMarker = '  <!-- ========== LOGIN PAGE ========== -->';
if (!html.includes(loginMarker)) throw new Error('Contact insertion boundary missing');
html = html.replace(loginMarker, contact + loginMarker);
const navMarker = '<ul class="mkt-links" id="mkt-links">';
if (!html.includes(navMarker)) throw new Error('Marketing nav insertion boundary missing');
html = html.replace(navMarker, navMarker + '\n<li><a class="mkt-nav-link" href="/contact" onclick="showMktPage(\'contact\')">Contact</a></li>');

// Reconstruct extracted scripts to independently prove byte-for-byte code and
// execution-order preservation. Nothing may accidentally disappear in a build.
const rebuilt = html.replace(/<script\b([^>]*?) src="\/(assets\/ownlybiz-public\/[a-f0-9]{64}\.js)"><\/script>/g,
  (_, attrs, resource) => `<script${attrs}>${files.get(resource)}</script>`);
const originalScripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map(m => [m[1], m[2]]);
const rebuiltScripts = [...rebuilt.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map(m => [m[1], m[2]]);
if (JSON.stringify(originalScripts) !== JSON.stringify(rebuiltScripts)) throw new Error('Script preservation gate failed');
const expertRebuilt = expertHtml.replace(/<script\b([^>]*?) src="\/(assets\/ownlybiz-public\/[a-f0-9]{64}\.js)"><\/script>/g,
  (_, attrs, resource) => `<script${attrs}>${files.get(resource)}</script>`);
const expertScripts = [...expertRebuilt.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map(m => [m[1], m[2]]);
if (JSON.stringify(originalScripts) !== JSON.stringify(expertScripts)) throw new Error('Expert script preservation gate failed');
if (Buffer.byteLength(html) >= 1_800_000) throw new Error('Public HTML exceeds conservative crawler budget');
files.set('data/ownlybiz-platform.html', html);
const manifest = { version: 1, sourceSha256: digest(source), sourceBytes: Buffer.byteLength(source), htmlSha256: digest(html), htmlBytes: Buffer.byteLength(html), scripts, legalSha256: digest(files.get('data/ownlybiz-platform-legal.json')) };
files.set('data/ownlybiz-platform-build.json', JSON.stringify(manifest, null, 2) + '\n');

// Vercel's static-build copies its entire outputDirectory. Keep server sources,
// scripts and build-only data outside a deliberately allowlisted public export.
// The original index remains byte-identical here for existing utility routes.
const exportDirectory = path.join(root, 'public');
const exportManifestPath = path.join(root, 'data/ownlybiz-static-export.json');
const publicFiles = new Map();
function listFiles(directory, prefix = '') {
  if (!fs.existsSync(directory)) return [];
  if (!fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink()) throw new Error(`Expected real directory: ${directory}`);
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed in public export: ${relative}`);
    if (entry.isDirectory()) return listFiles(path.join(directory, entry.name), relative + '/');
    if (!entry.isFile()) throw new Error(`Unexpected public file type: ${relative}`);
    return [relative];
  });
}
for (const relative of ['index.html', 'favicon.svg', 'robots.txt', 'sitemap.xml', '_redirects', 'data/ownlybiz-blog-posts.json']) {
  const target = path.join(root, relative);
  if (!fs.lstatSync(target).isFile()) throw new Error(`Expected regular public source: ${relative}`);
  publicFiles.set(relative, fs.readFileSync(target));
}
for (const directory of ['assets', '.well-known']) {
  for (const relative of listFiles(path.join(root, directory))) {
    // Only this build's referenced content-addressed scripts belong in a clean
    // export; obsolete development artifacts must not affect release output.
    if (directory === 'assets' && relative.startsWith('ownlybiz-public/')) continue;
    publicFiles.set(directory + '/' + relative, fs.readFileSync(path.join(root, directory, relative)));
  }
}
for (const [relative, contents] of files) {
  if (relative.startsWith('assets/ownlybiz-public/')) publicFiles.set(relative, Buffer.from(contents));
}
for (const entry of scripts) {
  if (!publicFiles.has(entry.resource) || digest(publicFiles.get(entry.resource)) !== entry.sha256) throw new Error(`Missing/stale exported script reference: ${entry.resource}`);
}
const exportManifest = { version: 1, outputDirectory: 'public', files: Object.fromEntries([...publicFiles].sort(([a], [b]) => a.localeCompare(b)).map(([relative, contents]) => [relative, digest(contents)])) };
const existingExportFiles = listFiles(exportDirectory);
if (check) {
  if (JSON.stringify(existingExportFiles.sort()) !== JSON.stringify([...publicFiles.keys()].sort())) throw new Error('Public export contains missing or unexpected files');
  for (const [relative, contents] of publicFiles) {
    if (!fs.readFileSync(path.join(exportDirectory, relative)).equals(contents)) throw new Error(`Missing/stale exported file: ${relative}`);
  }
} else if (existingExportFiles.length) {
  // Fail closed on an unowned directory or user edits. Prune only exact files
  // from the prior build manifest after verifying their original hashes; never
  // recursively delete a directory or follow a symlink.
  if (!fs.existsSync(exportManifestPath)) throw new Error('Refusing to overwrite public export without its build manifest');
  const previous = JSON.parse(fs.readFileSync(exportManifestPath, 'utf8'));
  if (previous.version !== 1 || previous.outputDirectory !== 'public' || !previous.files || typeof previous.files !== 'object') throw new Error('Invalid previous public export manifest');
  for (const relative of existingExportFiles) {
    if (previous.files[relative] !== digest(fs.readFileSync(path.join(exportDirectory, relative)))) throw new Error(`Refusing to overwrite unrecognized/modified public file: ${relative}`);
  }
  for (const relative of existingExportFiles) {
    if (!publicFiles.has(relative)) fs.unlinkSync(path.join(exportDirectory, relative));
  }
}
if (!check) {
  for (const [relative, contents] of publicFiles) {
    const target = path.join(exportDirectory, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
}
files.set('data/ownlybiz-static-export.json', JSON.stringify(exportManifest, null, 2) + '\n');
for (const [relative, contents] of files) {
  const target = path.join(root, relative);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== contents) throw new Error(`Missing/stale public artifact: ${relative}`);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
}
console.log(JSON.stringify({ status: check ? 'VERIFIED' : 'BUILT', sourceBytes: manifest.sourceBytes, publicHtmlBytes: manifest.htmlBytes, expertHtmlBytes: Buffer.byteLength(expertHtml), externalScripts: scripts.length, expertScriptPreloads: deliveredExpertPreloadHrefs.length, publicExportFiles: publicFiles.size, scriptPreservation: 'PASS', expertScriptPreservation: 'PASS', expertScriptPreloadOrder: 'PASS', legalCopyPreservation: 'PASS', publicExportPreservation: 'PASS' }));
