import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildExpertShell, elementRange, htmlTokens, EXPERT_SCAFFOLD_IDS } from '../lib/build-expert-shell.mjs';

// Offline artifact contract: no network, customer data, or transaction calls.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');
const source = read('index.html');
const artifact = read('data/ownlybiz-expert.html');
const manifest = JSON.parse(read('data/ownlybiz-expert-build.json'));
assert.equal(manifest.version, 1);
assert.equal(manifest.sourceSha256, sha(source), 'Expert artifact is built from the current source');
assert.equal(manifest.htmlSha256, sha(artifact));
assert.equal(manifest.htmlBytes, Buffer.byteLength(artifact));
assert.ok(manifest.htmlBytes < 1_800_000, 'Public expert HTML stays below the conservative crawler budget');
assert.match(artifact, /<html\b[^>]*data-ob-expert-delivery="1"/);
const reconstructed = artifact.replace(/<script\b([^>]*?) src="\/(assets\/ownlybiz-public\/[a-f0-9]{64}\.js)"><\/script>/g,
  (_, attrs, resource) => {
    const contents = read(resource);
    assert.equal(path.basename(resource), `${sha(contents)}.js`, 'Every script has its original content address');
    assert.equal(read(`public/${resource}`), contents, 'Every dependency is present in the deployment export');
    return `<script${attrs}>${contents}</script>`;
  });
const scripts = html => [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map(match => [match[1], match[2]]);
assert.deepEqual(scripts(reconstructed), scripts(source), 'All executable and data scripts preserve bytes, attributes, and execution order');
const styles = html => [...html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi)].map(match => [match[1], match[2]]);
assert.deepEqual(styles(reconstructed), styles(source), 'All runtime styles remain byte identical');

function range(html, id) {
  const selected = elementRange(html, id, id.startsWith('view-') ? `</div><!-- end ${id} -->` : null);
  return html.slice(selected.start, selected.end);
}
for (const id of EXPERT_SCAFFOLD_IDS) {
  // Scaffold comments are deliberately removed, so use balanced tags here.
  const selected = elementRange(reconstructed, id);
  const scaffold = reconstructed.slice(selected.start, selected.end);
  const tokens = htmlTokens(scaffold);
  assert.equal(tokens.filter(token => token.type === 'text').map(token => token.value).join('').trim(), '', `${id} has no platform copy`);
  const markup = tokens.filter(token => token.type === 'tag').map(token => token.value).join('');
  assert.doesNotMatch(markup, /\s(?:placeholder|title|alt|aria-label|aria-description)\s*=/i, `${id} has no public marketing text in accessibility or placeholder attributes`);
  assert.match(markup, new RegExp(`data-ob-platform-scaffold="${id}"[^>]*\\bhidden`));
}

function attributes(tag) {
  const result = {};
  const pattern = /\s([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of tag.matchAll(pattern)) result[match[1].toLowerCase()] = match.slice(2).find(value => value !== undefined) ?? true;
  return result;
}
const presentationAttributes = new Set(['placeholder', 'title', 'alt', 'aria-label', 'aria-description', 'aria-hidden', 'inert', 'hidden']);
function runtimeSignature(html) {
  return htmlTokens(html).filter(token => token.type === 'tag').map(token => {
    const match = token.value.match(/^<(\/?)([a-z0-9:-]+)/i);
    if (!match) return token.value;
    const attrs = attributes(token.value);
    for (const name of Object.keys(attrs)) {
      if (presentationAttributes.has(name) || /^data-ob-(?:expert-delivery|platform-scaffold|content-pending)$/.test(name)) delete attrs[name];
    }
    return [match[1], match[2].toLowerCase(), attrs];
  });
}
assert.deepEqual(runtimeSignature(reconstructed), runtimeSignature(source), 'Every element, ID, class, handler, field value, selector attribute, link, and order is preserved');
assert.equal(range(reconstructed, 'view-5'), range(source, 'view-5'), 'Session UI is byte-for-byte intact');
for (const id of ['client-login-gate', 'booking-payment-panel', 'ep-account']) {
  assert.equal(range(reconstructed, id), range(source, id), `${id} remains byte-for-byte intact`);
}
assert.deepEqual(runtimeSignature(range(reconstructed, 'booking-overlay')), runtimeSignature(range(source, 'booking-overlay')), 'Booking overlay preserves all handlers and field values while removing the initial demo rate');
const publicText = htmlTokens(range(reconstructed, 'view-4')).filter(token => token.type === 'text').map(token => token.value).join(' ');
assert.doesNotMatch(publicText, /Wharton|Fortune 500|Certified Management Consultant|global management consultancy|8\+ years|500\+ clients|Expert Consulting|Save \$100|\$(?:3\.50|4\.50|6\.00|75\.00|120\.00|480\.00|45\.00)/i, 'No fabricated credentials, business identity, experience, savings, or prices in the expert website');
assert.doesNotMatch(range(reconstructed, 'view-4'), /placeholder="[^"]*(?:SaaS|ARR|Series A|Jane Smith|jane@company\.com)/i, 'Neutral contact and written-question hints');
for (const field of ['stype-btn-name', 'stype-btn-icon', 'book-permin-free-copy']) assert.ok(reconstructed.includes(field), `Channel/booking runtime marker preserved: ${field}`);
assert.throws(() => buildExpertShell(source.replace('id="view-3"', 'id="unexpected-view-3"')), /boundary/, 'Missing source boundaries fail the build');
assert.throws(() => buildExpertShell(source + '<div id="view-3"></div>'), /boundary/, 'Duplicate source boundaries fail the build');
console.log(JSON.stringify({ status: 'PASS', expertHtmlBytes: manifest.htmlBytes, executableScriptsPreserved: scripts(source).length, scaffoldCount: EXPERT_SCAFFOLD_IDS.length, neutralSlots: manifest.neutralSlots, domContract: 'PASS', sessionAndPaymentDomParity: 'PASS', networkRequests: 0 }));
