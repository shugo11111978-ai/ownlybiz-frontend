import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const baseline = '01b811a2e2729770a706af0d6ccfca216d801a80';
const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const previous = execFileSync('git', ['show', baseline + ':index.html'], {
  cwd: new URL('..', import.meta.url), encoding: 'utf8', maxBuffer: 20_000_000,
});
const mobileCorrection = `@media(max-width:768px){
  /* The fixed mobile menu must use the viewport, not a filtered nav ancestor. */
  #view-4[data-ob-template] .expert-site-nav{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
}
`;
assert.equal(source.split(mobileCorrection).length, 2, 'exactly one mobile-only containment correction');
assert(!previous.includes(mobileCorrection), 'the correction is not already in the baseline');
const styles = html => [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(match => match[1]);
assert.deepEqual(styles(source.replace(mobileCorrection, '')), styles(previous),
  'all other inline CSS, including desktop templates, must remain byte-identical');
assert(source.includes('max-height:calc(100dvh - 60px);overflow-y:auto;'),
  'the fixed mobile menu retains its viewport height limit and scrolling');
console.log(JSON.stringify({status:'PASS', baseline, mobileBreakpoint:768,
  otherInlineCssUnchanged:true, scrollContractPreserved:true, networkRequests:0,
  limits:'Source boundary only; normal pointer and short-viewport scrolling require browser proof.'}));
