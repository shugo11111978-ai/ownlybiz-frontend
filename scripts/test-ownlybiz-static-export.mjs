import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Offline packaging checks. No application handlers or paid workflows execute.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = '5764d073db39aed45dc81094db740aa2ad45bb25';
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const manifest = readJson('data/ownlybiz-static-export.json');
const buildManifest = readJson('data/ownlybiz-platform-build.json');
const files = Object.keys(manifest.files).sort();
assert.equal(readJson('vercel.json').outputDirectory, 'public');
assert.equal(manifest.outputDirectory, 'public');
assert.equal(manifest.version, 1);
const baselineStatic = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline, '.vercel/output/static'], { cwd: root, encoding: 'utf8' }).trim().split('\n').map(relative => relative.replace(/^\.vercel\/output\/static\//, ''));
for (const relative of baselineStatic) assert.ok(files.includes(relative), `Baseline public entry preserved: ${relative}`);
for (const relative of ['assets/platform-tracking.js', 'assets/admin-tracking.css', ...buildManifest.scripts.map(entry => entry.resource)]) assert.ok(files.includes(relative), `Current application asset preserved: ${relative}`);
for (const relative of files) {
  assert.match(relative, /^(?:assets\/|\.well-known\/|data\/ownlybiz-blog-posts\.json$|index\.html$|favicon\.svg$|robots\.txt$|sitemap\.xml$|_redirects$)/, `Only allowlisted public entries: ${relative}`);
  assert.ok(fs.readFileSync(path.join(root, 'public', relative)).equals(fs.readFileSync(path.join(root, relative))), `Exact source bytes exported: ${relative}`);
}
execFileSync(process.execPath, ['build-public-shell.mjs', '--check'], { cwd: root, stdio: 'pipe' });

// Isolated negative/idempotency tests operate only inside this owned temp dir.
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ownlybiz-static-export-test-'));
try {
  for (const relative of ['build-public-shell.mjs', 'index.html', 'favicon.svg', 'robots.txt', 'sitemap.xml', '_redirects', 'data/ownlybiz-blog-posts.json', 'assets', '.well-known']) {
    const target = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(path.join(root, relative), target, { recursive: true });
  }
  const build = (check = false) => spawnSync(process.execPath, ['build-public-shell.mjs', ...(check ? ['--check'] : [])], { cwd: fixture, encoding: 'utf8' });
  const succeeds = result => assert.equal(result.status, 0, result.stderr || result.stdout);
  succeeds(build());
  succeeds(build(true));
  succeeds(build());
  const extra = path.join(fixture, 'public', 'unexpected-source.js');
  fs.writeFileSync(extra, 'fixture-only unexpected source');
  assert.notEqual(build(true).status, 0, 'Check rejects unexpected files');
  assert.notEqual(build().status, 0, 'Build refuses to overwrite unknown public files');
  assert.equal(fs.readFileSync(extra, 'utf8'), 'fixture-only unexpected source');
  fs.unlinkSync(extra);
  const staleSource = path.join(fixture, 'assets', 'fixture-old-asset.txt');
  fs.writeFileSync(staleSource, 'fixture-only generated asset');
  succeeds(build());
  fs.unlinkSync(staleSource);
  succeeds(build());
  assert.equal(fs.existsSync(path.join(fixture, 'public', 'assets', 'fixture-old-asset.txt')), false, 'Only manifest-owned obsolete files are pruned');
  succeeds(build(true));
  const script = buildManifest.scripts[0].resource;
  fs.writeFileSync(path.join(fixture, 'public', script), 'fixture-only modified code');
  assert.notEqual(build(true).status, 0, 'Check rejects stale script content');
  assert.notEqual(build().status, 0, 'Build preserves unexpected user edits');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

let functions = null;
if (process.argv.includes('--vercel')) {
  const builds = readJson('.vercel/output/builds.json');
  const previous = JSON.parse(execFileSync('git', ['show', `${baseline}:.vercel/output/builds.json`], { cwd: root, encoding: 'utf8' }));
  const nodeBuilds = document => document.builds.filter(build => build.use === '@vercel/node').map(build => build.src).sort();
  assert.deepEqual(nodeBuilds(builds), nodeBuilds(previous), 'All baseline Node function entry points remain unchanged');
  const nodeConfigs = document => document.builds.filter(build => build.use === '@vercel/node').map(build => ({ src: build.src, use: build.use, config: build.config })).sort((a, b) => a.src.localeCompare(b.src));
  assert.deepEqual(nodeConfigs(builds), nodeConfigs(previous), 'All baseline Node builder configurations remain unchanged');
  functions = nodeBuilds(builds).length;
  assert.equal(functions, 7);
  const staticBuild = builds.builds.find(build => build.use === '@vercel/static-build');
  assert.equal(staticBuild.config.outputDirectory, 'public');
  const builtRoutes = readJson('.vercel/output/config.json').routes;
  const oldRoutes = JSON.parse(execFileSync('git', ['show', `${baseline}:.vercel/output/config.json`], { cwd: root, encoding: 'utf8' })).routes;
  assert.deepEqual(builtRoutes.filter(route => !String(route.src || '').includes('assets/ownlybiz-public/')), oldRoutes, 'Baseline routes unchanged apart from the new immutable asset cache header');
  function walk(directory, prefix = '') {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name), prefix + entry.name + '/') : [prefix + entry.name]);
  }
  const builtStatic = path.join(root, '.vercel/output/static');
  assert.deepEqual(walk(builtStatic).sort(), files, 'Vercel static output contains exactly the clean public export');
  for (const relative of files) assert.ok(fs.readFileSync(path.join(builtStatic, relative)).equals(fs.readFileSync(path.join(root, 'public', relative))), `Vercel static bytes preserved: ${relative}`);
  const functionsDirectory = path.join(root, '.vercel/output/functions');
  for (const relative of ['index.html', 'data/ownlybiz-platform.html', 'data/ownlybiz-platform-legal.json', 'data/ownlybiz-blog-posts.json']) {
    assert.ok(fs.readFileSync(path.join(functionsDirectory, 'api/seo-shell.func', relative)).equals(fs.readFileSync(path.join(root, relative))), `SEO function private dependency preserved: ${relative}`);
  }
  for (const relative of ['api/llms.func/api/llms.js', 'api/sitemap.func/api/sitemap.js', 'api/seo-shell.func/api/seo-shell.js']) {
    assert.ok(fs.readFileSync(path.join(functionsDirectory, relative)).equals(fs.readFileSync(path.join(root, relative.split('.func/')[1]))), `Function source preserved: ${relative}`);
  }
}
console.log(JSON.stringify({ status: 'PASS', baselinePublicEntriesPreserved: baselineStatic.length, publicExportFiles: files.length, externalScriptsPreserved: buildManifest.scripts.length, negativeAndRebuildCases: 5, vercelFunctionsPreserved: functions, networkRequests: 0, paidWorkflowExecution: false }));
