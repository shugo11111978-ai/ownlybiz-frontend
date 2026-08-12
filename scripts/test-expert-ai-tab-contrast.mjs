import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert(html.includes('class="ob-expert-ai-tab'));
assert(html.includes('aria-pressed="'));
assert(html.includes('#view-3 .ob-expert-ai-tab.is-active{background:#9b3d1c!important;border-color:#9b3d1c!important;color:#fffaf2!important}'));
assert(html.includes('body.ob-ui-dark #view-3 .ob-expert-ai-tab.is-active{background:#c8ff3d!important;border-color:#c8ff3d!important;color:#11150d!important}'));
assert(!html.includes("(active ? 'var(--brown)' : '#fff')"));

console.log('Expert AI tab contrast smoke passed for light and dark dashboard themes.');
