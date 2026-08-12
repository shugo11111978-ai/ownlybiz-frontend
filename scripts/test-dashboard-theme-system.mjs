import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const failures = [];

function check(name, condition) {
  if (!condition) failures.push(name);
}

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function contrastCheck(name, foreground, background, minimum = 4.5) {
  const ratio = contrast(foreground, background);
  check(`${name} (${ratio.toFixed(2)}:1, expected >= ${minimum}:1)`, ratio >= minimum);
}

const marker = 'ownlybiz-dashboard-theme-system-20260812-css';
const markerIndex = html.indexOf(marker);
const styleEnd = html.indexOf('</style>', markerIndex);
const systemCss = html.slice(markerIndex, styleEnd);

check('theme system marker exists exactly once', markerIndex >= 0 && html.indexOf(marker, markerIndex + 1) === -1);
check('theme system loads after legacy Admin live styles', markerIndex > html.indexOf('ob-admin-live-ops-20260516-style'));
check('theme system loads after Expert accessibility styles', markerIndex > html.indexOf('ownlybiz-v3-accessibility-stability'));
check('theme system loads after AI feature styles', markerIndex > html.indexOf('ob-ai-website-editor-20260517-css'));
check('theme system loads after Ops Monitor styles', markerIndex > html.indexOf('#ob-ops-panel{display:none'));

[
  '--surface-page', '--surface-raised', '--surface-subtle', '--text-primary', '--text-secondary', '--text-muted',
  '--border-default', '--status-success-text', '--status-success-surface', '--status-warning-text',
  '--status-warning-surface', '--status-danger-text', '--status-danger-surface', '--control-disabled-text',
  '--control-disabled-surface', '--control-disabled-border'
].forEach((token) => check(`semantic token ${token}`, systemCss.includes(token)));

[
  '.ob-admin-live-card', '.ob-admin-live-table', '.ob-admin-live-empty', '.ob-support-message',
  '.payout-queue-row', '.ob-ai-feature-card', '.ob-ai-control-help', '.ob-ai-savebar',
  '.search-input', '.filter-select', '.ob-admin-fee-save-bar', '#admin-panel-promotions',
  '.db-nav-section', '.db-stripe-badge-label', '.stat-sum-label', '.chat-msg.client .chat-bubble',
  '.client-status-badge.status-active', '.btn.btn-primary', '#ob-ops-panel'
].forEach((selector) => check(`shared repair covers ${selector}`, systemCss.includes(selector)));

contrastCheck('Admin dark primary', 'faf7f2', '1a1614');
contrastCheck('Admin dark secondary', 'ded7cd', '1a1614');
contrastCheck('Admin dark muted', 'b9b0a4', '1a1614');
contrastCheck('Admin light primary', '241a15', 'ffffff');
contrastCheck('Admin light secondary', '4d4037', 'ffffff');
contrastCheck('Admin light muted', '6f6259', 'ffffff');
contrastCheck('Admin dark primary action', '11150d', 'c8ff3d');
contrastCheck('Admin light primary action', 'fffaf2', '9b3d1c');
contrastCheck('Expert dark shared labels', 'b9b0a4', '21140f');
contrastCheck('Gold avatar label', '241a15', 'c49a3c');
contrastCheck('Sage avatar label', '241a15', '7a8c6e');
contrastCheck('Purple avatar label', '241a15', '9b7bc4');
contrastCheck('Terracotta avatar label', 'fffaf2', '8a3a1d');
contrastCheck('Blue avatar label', 'fffaf2', '3f6388');
contrastCheck('Dark success state', '9cf2bd', '163b2a');
contrastCheck('Dark warning state', 'ffdc73', '3b2d0d');
contrastCheck('Dark danger state', 'ffb4b4', '451b1b');
contrastCheck('Light success state', '225c39', 'e8f7ee');
contrastCheck('Light warning state', '7a4600', 'fff3cd');
contrastCheck('Light danger state', '8e2525', 'fdecec');
contrastCheck('Dark disabled state', 'a79e93', '26211e');
contrastCheck('Light disabled state', '6f6259', 'eee4da');

check('staging backend constant remains present', html.includes('https://victorious-wisdom-production-a6b0.up.railway.app'));
check('production backend is not introduced into staging', !html.includes('https://ownlybiz-backend-production.up.railway.app'));

if (failures.length) {
  console.error(`Dashboard theme-system smoke failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Dashboard theme-system smoke passed.');
console.log('Semantic roles, cascade order, staging boundary, and 22 contrast pairs verified.');
