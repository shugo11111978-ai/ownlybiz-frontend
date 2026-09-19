const { createExpertResolver, hostFromReq, isPlatformHost, publicOrigin, allowIndexing } = require('../lib/expert-public');
const resolver = createExpertResolver();

module.exports = async function handler(req, res) {
  const host = hostFromReq(req);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  let origin = 'https://ownlybiz.com';
  if (!isPlatformHost(host)) {
    const result = await resolver.resolve({ ...req, url: '/robots.txt', method: 'GET' }, host);
    if (result.state !== 'found') {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      if (result.state === 'unavailable') res.setHeader('Retry-After', '60');
      return res.status(result.state === 'unavailable' ? 503 : 404).send('User-agent: *\nDisallow: /\n');
    }
    origin = publicOrigin(result.expert, host);
    if (!allowIndexing(result.expert)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.status(200).send('User-agent: *\nDisallow: /\n');
    }
  }
  res.status(200).send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /dash/',
    'Disallow: /session',
    ...(!isPlatformHost(host) ? ['Disallow: /account', 'Disallow: /checkout', 'Disallow: /login', 'Disallow: /reset-password', 'Disallow: /mini-suite'] : []),
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n'));
};
