const DEFAULT_CHECKS = [
  { host: 'lunapsychics.com', expectedTitle: 'Luna Psychic' },
  { host: 'www.lunapsychics.com', expectedTitle: 'Luna Psychic', expectedCanonicalHost: 'lunapsychics.com' },
];

function configuredChecks() {
  const raw = process.env.PRODUCTION_EXPERT_DOMAIN_CHECKS || '';
  if (!raw.trim()) return DEFAULT_CHECKS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch (_) {
    // Fall through to the compact host:title parser below.
  }
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [host, expectedTitle, expectedCanonicalHost] = entry.split(':').map((part) => part.trim());
      return { host, expectedTitle, expectedCanonicalHost };
    })
    .filter((entry) => entry.host && entry.expectedTitle);
}

function fail(message) {
  throw new Error(message);
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Ownlybiz production expert-domain verifier' },
  });
  const text = await response.text();
  return { response, text };
}

async function fetchRedirect(url) {
  const response = await fetch(url, {
    redirect: 'manual',
    headers: { 'user-agent': 'Ownlybiz production expert-domain verifier' },
  });
  return response;
}

function extractTag(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function extractMeta(html, key, value) {
  const tags = html.match(/<meta\s+[^>]*>/gi) || [];
  const wanted = new RegExp(`${key}=["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i');
  for (const tag of tags) {
    if (!wanted.test(tag)) continue;
    const content = tag.match(/\scontent=["']([^"']*)["']/i);
    return content ? content[1].replace(/\s+/g, ' ').trim() : '';
  }
  return '';
}

function extractCanonical(html) {
  const tags = html.match(/<link\s+[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/\srel=["']canonical["']/i.test(tag)) continue;
    const href = tag.match(/\shref=["']([^"']*)["']/i);
    return href ? href[1].trim() : '';
  }
  return '';
}

function canonicalOriginFor(check, finalUrl) {
  const final = new URL(finalUrl);
  const host = check.expectedCanonicalHost || final.hostname;
  return `https://${host}`;
}

async function verifyDomain(check) {
  const url = `https://${check.host}/`;
  const { response, text } = await fetchText(url);
  if (!response.ok) fail(`${check.host}: homepage returned ${response.status}`);

  const expectedTitle = String(check.expectedTitle || '').trim();
  const title = extractTag(text, 'title');
  const description = extractMeta(text, 'name', 'description');
  const ogTitle = extractMeta(text, 'property', 'og:title');
  const canonical = extractCanonical(text);
  const expectedOrigin = canonicalOriginFor(check, response.url);

  if (!title.includes(expectedTitle)) fail(`${check.host}: title missing "${expectedTitle}"`);
  if (!description.includes(expectedTitle)) fail(`${check.host}: description missing "${expectedTitle}"`);
  if (!ogTitle.includes(expectedTitle)) fail(`${check.host}: og:title missing "${expectedTitle}"`);
  if (!canonical.startsWith(`${expectedOrigin}/`)) fail(`${check.host}: canonical is ${canonical || '(missing)'}`);
  if (/account\s+suspended|cpanel/i.test(title)) fail(`${check.host}: suspended/cPanel title detected`);
  if (/liran\s+prodtest|sqlite\s+replay\s+probe/i.test(title + ' ' + description + ' ' + ogTitle)) {
    fail(`${check.host}: stale expert identity detected in SEO tags`);
  }

  const robots = await fetchText(`${expectedOrigin}/robots.txt`);
  if (!robots.response.ok) fail(`${check.host}: robots.txt returned ${robots.response.status}`);
  if (!robots.text.includes(`Sitemap: ${expectedOrigin}/sitemap.xml`)) {
    fail(`${check.host}: robots.txt does not point at ${expectedOrigin}/sitemap.xml`);
  }
  if (!expectedOrigin.includes('ownlybiz.com') && /Sitemap:\s*https:\/\/ownlybiz\.com\//i.test(robots.text)) {
    fail(`${check.host}: robots.txt leaks Ownlybiz sitemap`);
  }

  const sitemap = await fetchText(`${expectedOrigin}/sitemap.xml`);
  if (!sitemap.response.ok) fail(`${check.host}: sitemap.xml returned ${sitemap.response.status}`);
  if (!sitemap.text.includes(`<loc>${expectedOrigin}/</loc>`)) {
    fail(`${check.host}: sitemap.xml does not include ${expectedOrigin}/`);
  }
  if (!expectedOrigin.includes('ownlybiz.com') && /<loc>https:\/\/ownlybiz\.com\//i.test(sitemap.text)) {
    fail(`${check.host}: sitemap.xml leaks Ownlybiz URLs`);
  }

  const legacyUrl = `https://${check.host}/cgi-sys/suspendedpage.cgi`;
  const legacyRedirect = await fetchRedirect(legacyUrl);
  if (![301, 302, 307, 308].includes(legacyRedirect.status)) {
    fail(`${check.host}: ${legacyUrl} did not redirect away from the old cPanel suspended path`);
  }
  const legacyLocation = legacyRedirect.headers.get('location') || '';
  if (legacyLocation !== '/' && !legacyLocation.startsWith(`${expectedOrigin}/`)) {
    fail(`${check.host}: old cPanel path redirects to ${legacyLocation || '(missing)'}`);
  }
  const legacyFollow = await fetchText(legacyUrl);
  if (!legacyFollow.response.ok || !extractTag(legacyFollow.text, 'title').includes(expectedTitle)) {
    fail(`${check.host}: old cPanel path does not resolve to the expert homepage`);
  }

  return {
    host: check.host,
    finalUrl: response.url,
    title,
    canonical,
    robotsSitemap: `${expectedOrigin}/sitemap.xml`,
  };
}

const checks = configuredChecks();
const results = [];
for (const check of checks) {
  results.push(await verifyDomain(check));
}

console.log(JSON.stringify({ ok: true, checked: results }, null, 2));
