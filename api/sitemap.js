const PLATFORM_HOSTS = new Set([
  'ownlybiz.com',
  'www.ownlybiz.com',
  'localhost',
  '127.0.0.1',
]);

const PLATFORM_URLS = [
  ['https://ownlybiz.com/', '2026-04-26', 'weekly', '1.0'],
  ['https://ownlybiz.com/legal/terms', '2026-04-26', 'monthly', '0.4'],
  ['https://ownlybiz.com/legal/privacy', '2026-04-26', 'monthly', '0.4'],
  ['https://ownlybiz.com/legal/independent-professional-terms', '2026-04-26', 'monthly', '0.4'],
  ['https://ownlybiz.com/legal/platform-policy', '2026-04-26', 'monthly', '0.4'],
];

function hostFromReq(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function isPlatformHost(host) {
  return !host || PLATFORM_HOSTS.has(host) || host.endsWith('.vercel.app');
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderUrl(loc, lastmod, changefreq, priority) {
  return [
    '  <url>',
    `    <loc>${esc(loc)}</loc>`,
    `    <lastmod>${esc(lastmod)}</lastmod>`,
    `    <changefreq>${esc(changefreq)}</changefreq>`,
    `    <priority>${esc(priority)}</priority>`,
    '  </url>',
  ].join('\n');
}

function renderSitemap(urls) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => renderUrl(...url)),
    '</urlset>',
    '',
  ].join('\n');
}

module.exports = async function handler(req, res) {
  const host = hostFromReq(req);
  const urls = isPlatformHost(host)
    ? PLATFORM_URLS
    : [[`https://${host}/`, new Date().toISOString().slice(0, 10), 'weekly', '1.0']];

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(renderSitemap(urls));
};
