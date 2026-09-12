const BACKEND = (process.env.OWNLYBIZ_API_URL || process.env.OWNLY_API || 'https://victorious-wisdom-production-a6b0.up.railway.app').replace(/\/+$/, '');

function cleanId(value) {
  return String(Array.isArray(value) ? value[0] : value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 220);
}

module.exports = async function handler(req, res) {
  const id = cleanId(req.query && req.query.id);
  if (!id) {
    res.status(400).json({ error: 'Missing media id' });
    return;
  }
  const upstream = await fetch(`${BACKEND}/api/media/website/${encodeURIComponent(id)}`, {
    headers: { accept: req.headers.accept || '*/*' },
  });
  const body = Buffer.from(await upstream.arrayBuffer());
  res.status(upstream.status);
  const contentType = upstream.headers.get('content-type');
  const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=31536000, immutable';
  if (contentType) res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControl);
  res.send(body);
};
