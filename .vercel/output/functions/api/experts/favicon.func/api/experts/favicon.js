const BACKEND = (process.env.OWNLYBIZ_API_URL || process.env.OWNLY_API || 'https://victorious-wisdom-production-a6b0.up.railway.app').replace(/\/+$/, '');

module.exports = async function handler(req, res) {
  const query = new URLSearchParams();
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, String(item || '')));
    else if (value !== undefined) query.set(key, String(value || ''));
  });
  const upstream = await fetch(`${BACKEND}/api/experts/favicon?${query.toString()}`, {
    headers: { accept: req.headers.accept || '*/*' },
  });
  const body = Buffer.from(await upstream.arrayBuffer());
  res.status(upstream.status);
  const contentType = upstream.headers.get('content-type');
  const cacheControl = upstream.headers.get('cache-control') || 'public, s-maxage=300, stale-while-revalidate=3600';
  if (contentType) res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControl);
  res.send(body);
};
