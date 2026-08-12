import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert(html.includes("d.purpose_profile === 'luna_spiritual_guide'"));
assert(html.includes('Luna Spiritual Guide Profile'));
assert(html.includes('shared enhanced expert brain'));
assert(html.includes("messages from this live session only"));
assert(html.includes("other experts use their own purpose and guidance"));
assert(!html.includes('var brainBlock = d.brain_enhanced'));

console.log('Expert AI brain dashboard smoke passed: Luna purpose badge is account-scoped and current-session privacy is explicit.');
