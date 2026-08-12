import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(here, '..', 'index.html'), 'utf8');

function block(tag, id) {
  const pattern = new RegExp(`<${tag}[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const match = html.match(pattern);
  assert.ok(match, `${id} must exist`);
  return match[1];
}

const css = block('style', 'ownlybiz-admin-mobile-responsive-20260812-css');
const js = block('script', 'ownlybiz-admin-mobile-responsive-20260812-js');

assert.match(css, /@media \(max-width:900px\)/, 'mobile/tablet breakpoint must exist');
assert.match(css, /#view-6 \.admin-sidebar\s*\{[\s\S]*?position:fixed!important/, 'Admin navigation must become an off-canvas drawer');
assert.match(css, /transform:translate3d\(-105%,0,0\)/, 'drawer must start outside the viewport');
assert.match(css, /#view-6 \.admin-topbar\s*\{[\s\S]*?display:grid!important/, 'mobile Admin header must use a constrained grid');
assert.match(css, /#view-6 \.admin-tabs\s*\{[\s\S]*?overflow-x:auto/, 'Admin tabs must scroll within their own row');
assert.match(css, /#view-6 \.admin-kpi-row\s*\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/, 'KPI cards must fit the phone viewport');
assert.match(css, /#view-6 \.admin-content>\[style\*="grid-template-columns"\]/, 'legacy inline desktop grids must collapse safely');
assert.match(css, /#view-6 \.admin-table-wrap,[\s\S]*?overflow:auto/, 'wide operational tables must have contained horizontal scrolling');
assert.match(css, /min-height:44px/, 'primary mobile controls must meet the tap-target floor');
assert.match(css, /@media \(prefers-reduced-motion:reduce\)/, 'drawer motion must honor reduced-motion preferences');

assert.match(js, /var BREAKPOINT=900/, 'script and CSS breakpoint must stay aligned');
assert.match(js, /aria-controls/, 'menu control must identify the Admin navigation');
assert.match(js, /aria-expanded/, 'menu control must expose its open state');
assert.match(js, /closest\('#ob-admin-mobile-menu'\)/, 'drawer controls must survive dynamic Admin header refreshes');
assert.match(js, /event\.key==='Escape'/, 'Escape must close the mobile navigation');
assert.match(js, /event\.target\.closest\('\.admin-nav-item'\)/, 'choosing a navigation item must close the drawer');
assert.match(js, /closest\('#view-6 \.admin-nav-item'\)[\s\S]*?\},true\);/, 'dynamic Admin navigation handlers must close the drawer from the capture phase');
assert.match(js, /window\.addEventListener\('resize'/, 'leaving the mobile breakpoint must reset the drawer');
assert.match(js, /scrollIntoView\(\{behavior:'smooth',block:'nearest',inline:'center'\}\)/, 'the selected Admin tab must remain visible');

assert.doesNotThrow(() => new Function(js), 'mobile Admin script must parse');
assert.equal((html.match(/id="ownlybiz-admin-mobile-responsive-20260812-css"/g) || []).length, 1, 'responsive CSS must be installed once');
assert.equal((html.match(/id="ownlybiz-admin-mobile-responsive-20260812-js"/g) || []).length, 1, 'responsive script must be installed once');

console.log('Admin mobile responsive checks passed.');
