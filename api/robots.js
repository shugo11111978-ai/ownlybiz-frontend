const PLATFORM_HOSTS = new Set([
  'ownlybiz.com',
  'www.ownlybiz.com',
  'localhost',
  '127.0.0.1',
]);

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

function originForHost(host) {
  return `https://${host || 'ownlybiz.com'}`;
}

module.exports = async function handler(req, res) {
  const host = hostFromReq(req);
  const origin = isPlatformHost(host) ? 'https://ownlybiz.com' : originForHost(host);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /dash/',
    'Disallow: /session',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n'));
};
