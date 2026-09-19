import { createHash } from 'node:crypto';

// Delivery transformations only. Executable scripts are handled separately by
// the caller and must retain their bytes, attributes, and parser order.
export const EXPERT_SCAFFOLD_IDS = ['view-1', 'view-2', 'view-3', 'view-6', 'view-7', 'ob-popup-overlay', 'ob-ops-launcher', 'ob-ops-panel'];
export const EXPERT_NEUTRAL_IDS = [
  'ew-hero-quote', 'ew-about-bio', 'hero-status-text', 'book-permin-status-copy',
  'bk-total', 'cal-month-label', 'bk-free-row', 'bov-channel-detail',
];
export const EXPERT_NEUTRAL_CLASSES = [
  'expert-footer-logo', 'expert-footer-copy', 'expert-hero-title',
  'service-mini-price', 'service-big-price', 'service-big-desc',
  'stype-btn-price', 'tag-free', 'ob-template-final-title',
  'booking-expert-avatar', 'services-full-sub', 'expert-stars', 'tag',
];
const digest = value => createHash('sha256').update(value).digest('hex');
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

// This is a source-preserving tokenizer, not an HTML serializer: all existing
// element tags and executable/raw-text blocks retain their exact source bytes.
export function htmlTokens(source) {
  const expression = /<!--[\s\S]*?-->|<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<![^>]*>|<\/?[A-Za-z][A-Za-z0-9:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
  const tokens = [];
  let last = 0;
  for (const match of source.matchAll(expression)) {
    if (match.index > last) tokens.push({ type: 'text', value: source.slice(last, match.index) });
    const value = match[0];
    const type = value.startsWith('<!--') ? 'comment' : /^<(script|style)\b/i.test(value) ? 'raw' : 'tag';
    tokens.push({ type, value });
    last = match.index + value.length;
  }
  if (last < source.length) tokens.push({ type: 'text', value: source.slice(last) });
  return tokens;
}

function attr(tag, name) {
  return tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(1).find(value => value !== undefined) || '';
}

function emptyScaffoldText(source) {
  return htmlTokens(source).map(token => {
    if (token.type === 'raw') return token.value;
    if (token.type === 'text') return token.value.replace(/\S[^]*?(?=\s*$)/, '');
    if (token.type === 'comment') return '';
    return token.value.replace(/\s(?:placeholder|title|alt|aria-label|aria-description)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  }).join('');
}

export function elementRange(source, id, endMarker) {
  const opening = new RegExp(`<([A-Za-z][A-Za-z0-9:-]*)\\b(?=[^>]*\\bid=["']${id}["'])(?:[^>"']|"[^"]*"|'[^']*')*>`, 'g');
  const matches = [...source.matchAll(opening)];
  if (matches.length !== 1) throw new Error(`Expert shell requires one ${id} boundary; found ${matches.length}`);
  const start = matches[0].index;
  if (endMarker) {
    const end = source.indexOf(endMarker, start);
    if (end < start || source.indexOf(endMarker, end + endMarker.length) !== -1) throw new Error(`Expert shell closing boundary invalid: ${id}`);
    return { start, end: end + endMarker.length };
  }
  const name = matches[0][1].toLowerCase();
  let depth = 0, offset = start;
  for (const token of htmlTokens(source.slice(start))) {
    if (token.type === 'tag') {
      const close = new RegExp(`^<\\/${name}\\b`, 'i').test(token.value);
      const open = new RegExp(`^<${name}\\b`, 'i').test(token.value);
      if (open && !/\/\s*>$/.test(token.value)) depth++;
      if (close) depth--;
      if (close && depth === 0) return { start, end: offset + token.value.length };
    }
    offset += token.value.length;
  }
  throw new Error(`Expert shell unmatched boundary: ${id}`);
}

function neutralizeExpertContent(source) {
  const stack = [];
  const observedIds = new Set(), observedClasses = new Set();
  const replacements = [];
  const html = htmlTokens(source).map(token => {
    const parent = stack.at(-1);
    if (token.type === 'raw' || token.type === 'comment') return token.value;
    if (token.type === 'text') return parent?.neutral ? token.value.replace(/\S[^]*?(?=\s*$)/, '') : token.value;
    const closing = token.value.match(/^<\/([a-z0-9:-]+)/i);
    if (closing) {
      const index = stack.map(entry => entry.name).lastIndexOf(closing[1].toLowerCase());
      if (index >= 0) stack.length = index;
      return token.value;
    }
    const opening = token.value.match(/^<([a-z0-9:-]+)/i);
    if (!opening) return token.value;
    const id = attr(token.value, 'id'), classes = attr(token.value, 'class').split(/\s+/);
    const neutralId = EXPERT_NEUTRAL_IDS.includes(id);
    const neutralClasses = classes.filter(value => EXPERT_NEUTRAL_CLASSES.includes(value));
    if (neutralId) observedIds.add(id);
    neutralClasses.forEach(value => observedClasses.add(value));
    const neutral = parent?.neutral || neutralId || neutralClasses.length > 0;
    let value = token.value;
    if (neutralId || neutralClasses.length) {
      const key = id || neutralClasses[0];
      value = value.replace(/>$/, ` data-ob-content-pending="${key}">`);
      replacements.push(key);
    }
    if (id === 'brief-text') value = value.replace(/\splaceholder="[^"]*"/, ' placeholder="Describe your question and what you would like help with."');
    if (id === 'ew-cf-msg') value = value.replace(/\splaceholder="[^"]*"/, ' placeholder="Tell me what you would like help with."');
    if (id === 'ew-cf-email') value = value.replace(/\splaceholder="[^"]*"/, ' placeholder="Your email address"');
    if (id === 'ew-cf-name') value = value.replace(/\splaceholder="[^"]*"/, ' placeholder="Your name"');
    value = value.replace(/\splaceholder="Jane Smith"/, ' placeholder="Your name"')
      .replace(/\splaceholder="Acme Corp"/, ' placeholder="Organization (optional)"');
    if (!VOID.has(opening[1].toLowerCase()) && !/\/\s*>$/.test(value)) stack.push({ name: opening[1].toLowerCase(), neutral });
    return value;
  }).join('');
  for (const id of EXPERT_NEUTRAL_IDS) if (!observedIds.has(id)) throw new Error(`Expert neutral content slot missing: ${id}`);
  for (const name of EXPERT_NEUTRAL_CLASSES) if (!observedClasses.has(name)) throw new Error(`Expert neutral content class missing: ${name}`);
  return { html, replacements };
}

export function buildExpertShell(source) {
  let html = source;
  const scaffolds = [];
  for (const id of EXPERT_SCAFFOLD_IDS) {
    const range = elementRange(html, id, id.startsWith('view-') ? `</div><!-- end ${id} -->` : null);
    const original = html.slice(range.start, range.end);
    let replacement = emptyScaffoldText(original);
    replacement = replacement.replace(/^(<[^>]+)>/, (_, opening) => `${opening.replace(/\saria-hidden\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')} data-ob-platform-scaffold="${id}" aria-hidden="true" inert hidden>`);
    html = html.slice(0, range.start) + replacement + html.slice(range.end);
    scaffolds.push({ id, sourceBytes: Buffer.byteLength(original), outputBytes: Buffer.byteLength(replacement), sourceSha256: digest(original) });
  }
  const viewRange = elementRange(html, 'view-4', '</div><!-- end view-4 -->');
  const neutral = neutralizeExpertContent(html.slice(viewRange.start, viewRange.end));
  html = html.slice(0, viewRange.start) + neutral.html + html.slice(viewRange.end);
  html = html.replace(/<html\b([^>]*)>/i, '<html$1 data-ob-expert-delivery="1">');
  if (!html.includes('data-ob-expert-delivery="1"')) throw new Error('Expert delivery document marker missing');
  return { html, scaffolds, neutralSlots: [...new Set(neutral.replacements)] };
}
