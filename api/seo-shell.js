const fs = require('fs');
const path = require('path');

const BACKEND = (process.env.OWNLYBIZ_API_URL || process.env.OWNLY_API || 'https://ownlybiz-backend-production.up.railway.app').replace(/\/+$/, '');
const INDEX_PATH = path.join(process.cwd(), 'index.html');
const RESERVED = new Set([
  '', 'index.html', 'admin', 'dash', 'signup', 'dashboard', 'login', 'expert',
  'session', 'group', 'connectors', 'settings', 'messages', 'analytics',
  'payments', 'packages', 'reviews', 'clients', 'sessions', 'pricing', 'how',
  'features', 'experts', 'blog', 'contact', 'terms', 'legal',
]);

let cachedIndex = null;

function readIndex() {
  if (!cachedIndex || process.env.NODE_ENV !== 'production') {
    cachedIndex = fs.readFileSync(INDEX_PATH, 'utf8');
  }
  return cachedIndex;
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clean(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function trim(value, max) {
  const text = clean(value);
  return text.length > max ? text.slice(0, max - 1).trim() : text;
}

function hostFromReq(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function isPlatformHost(host) {
  return !host
    || host === 'ownlybiz.com'
    || host === 'www.ownlybiz.com'
    || host === 'localhost'
    || host === '127.0.0.1'
    || host.endsWith('.vercel.app');
}

function slugFromHost(host) {
  const match = host.match(/^([a-z0-9-]+)\.ownlybiz\.com$/i);
  return match && match[1] !== 'www' ? match[1] : '';
}

function firstPathSegment(req) {
  const rawPath = String((req.url || '/').split('?')[0] || '/').replace(/^\/+|\/+$/g, '');
  return rawPath.split('/').filter(Boolean)[0] || '';
}

function pathOnly(req) {
  return String((req.url || '/').split('?')[0] || '/') || '/';
}

async function fetchJson(url, timeoutMs = 1800) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveExpert(req, host) {
  let slug = slugFromHost(host);
  const platform = isPlatformHost(host);
  const first = firstPathSegment(req).toLowerCase();

  if (!slug && platform && first && !RESERVED.has(first)) slug = first;
  if (!slug && !platform) {
    const lookup = await fetchJson(`${BACKEND}/api/domains/lookup?domain=${encodeURIComponent(host)}`);
    slug = clean(lookup && lookup.slug);
  }
  if (!slug) return null;

  const profile = await fetchJson(`${BACKEND}/api/experts/${encodeURIComponent(slug)}`);
  const expert = profile && (profile.expert || profile);
  if (!expert || !(expert.name || expert.slug)) return { slug };
  return { slug, expert };
}

function expertTitle(expert) {
  expert = expert || {};
  const explicit = clean(expert.meta_title);
  if (explicit && !/ownlybiz/i.test(explicit)) return trim(explicit, 70);
  const name = clean(expert.name || expert.footer_text, 'Independent Expert');
  const title = clean(expert.title, 'Private sessions');
  return trim(`${name} - ${title}`, 70);
}

function expertDescription(expert) {
  expert = expert || {};
  const fields = [
    expert.meta_description,
    expert.hero_tagline,
    expert.about_text,
    expert.bio,
    expert.tagline,
    expert.title,
  ];
  for (const field of fields) {
    const text = clean(field);
    if (text && !/ownlybiz/i.test(text)) return trim(text, 165);
  }
  return trim(`Book private chat, voice, or video sessions with ${clean(expert.name, 'this independent expert')}.`, 165);
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html)
    ? html.replace(pattern, replacement)
    : html.replace(/<\/head>/i, `${replacement}\n</head>`);
}

function setMeta(html, attr, name, content) {
  const safe = esc(content);
  const re = new RegExp(`<meta\\s+${attr}=["']${name}["'][^>]*>`, 'i');
  return replaceTag(html, re, `<meta ${attr}="${name}" content="${safe}">`);
}

function setCanonical(html, href) {
  const tag = `<link rel="canonical" href="${esc(href)}">`;
  return replaceTag(html, /<link\s+rel=["']canonical["'][^>]*>/i, tag);
}

function injectSeo(html, seo) {
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(seo.title)}</title>`);
  html = setMeta(html, 'name', 'description', seo.description);
  html = setMeta(html, 'name', 'robots', seo.robots);
  html = setMeta(html, 'property', 'og:title', seo.title);
  html = setMeta(html, 'property', 'og:description', seo.description);
  html = setMeta(html, 'property', 'og:type', 'website');
  html = setMeta(html, 'property', 'og:url', seo.canonical);
  html = setMeta(html, 'name', 'twitter:card', seo.image ? 'summary_large_image' : 'summary');
  html = setMeta(html, 'name', 'twitter:title', seo.title);
  html = setMeta(html, 'name', 'twitter:description', seo.description);
  if (seo.image) {
    html = setMeta(html, 'property', 'og:image', seo.image);
    html = setMeta(html, 'name', 'twitter:image', seo.image);
  }
  html = setCanonical(html, seo.canonical);
  return html;
}

function whiteLabelExpertShell(html) {
  return html
    .replace(/<div class="view-panel active" id="view-1">/g, '<div class="view-panel active" id="view-1" data-nosnippet>')
    .replace(/<div class="view-panel" id="view-2">/g, '<div class="view-panel" id="view-2" data-nosnippet>')
    .replace(/<div class="view-panel" id="view-3"/g, '<div class="view-panel" id="view-3" data-nosnippet')
    .replace(/<div class="view-panel" id="view-5">/g, '<div class="view-panel" id="view-5" data-nosnippet>')
    .replace(/<div class="view-panel" id="view-6">/g, '<div class="view-panel" id="view-6" data-nosnippet>')
    .replace(/<div class="view-panel" id="view-7">/g, '<div class="view-panel" id="view-7" data-nosnippet>')
    .replace(/Ownlybiz is your launchpad\./g, 'This website is your launchpad.')
    .replace(/Ownlybiz provides the tools\./g, 'This website provides the tools.')
    .replace(/Ownlybiz provides infrastructure only\./g, 'This website provides infrastructure only.')
    .replace(/Ownlybiz is a technology platform providing infrastructure for independent professionals\./g, 'This website provides technology infrastructure for independent professionals.')
    .replace(/Ownlybiz Inc\./g, 'the platform provider')
    .replace(/Ownlybiz is not a service provider, professional advisor, or employer\./g, 'The platform provider is not a service provider, professional advisor, or employer.')
    .replace(/Ownlybiz is not a service provider, employer, or franchisor\./g, 'The platform provider is not a service provider, employer, or franchisor.')
    .replace(/Ownlybiz is a technology platform only and is not a service provider\./g, 'This website uses technology infrastructure only and is not the service provider.')
    .replace(/Ownlybiz is a technology platform only\./g, 'This website uses independent technology infrastructure.')
    .replace(/Ownlybiz makes no representations regarding the quality, accuracy, or legality of any expert's services\./g, 'The platform provider makes no representations regarding the quality, accuracy, or legality of any expert services.')
    .replace(/Ownlybiz provides the platform only\./g, 'This website uses technology infrastructure only.')
    .replace(/on the Ownlybiz platform/g, 'through this website')
    .replace(/Verified sessions on the Ownlybiz platform/g, 'Verified sessions through this website')
    .replace(/professional advice from Ownlybiz/g, 'professional advice from the platform provider')
    .replace(/\s*&#183;\s*Powered by Own<span[^>]*>ly<\/span>/g, '')
    .replace(/\s*·\s*Powered by Own<span[^>]*>ly<\/span>/g, '')
    .replace(/\s*·\s*Powered by Ownlybiz/g, '')
    .replace(/\. Powered by Ownlybiz\./g, '.')
    .replace(/Powered by Ownlybiz/g, '');
}

module.exports = async function handler(req, res) {
  const host = hostFromReq(req);
  const expertResult = await resolveExpert(req, host);
  const expert = expertResult && expertResult.expert;
  const isExpert = !!expertResult;
  const origin = `https://${host || 'ownlybiz.com'}`;
  const canonical = origin + pathOnly(req);

  let html = readIndex();
  if (isExpert) {
    html = whiteLabelExpertShell(html);
    const robotsValue = expert && expert.allow_indexing !== undefined && expert.allow_indexing !== null
      && ['0', 'false', 'no', 'off'].includes(String(expert.allow_indexing).toLowerCase())
      ? 'noindex,nofollow'
      : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
    html = injectSeo(html, {
      title: expertTitle(expert),
      description: expertDescription(expert),
      canonical,
      robots: robotsValue,
      image: clean(expert && (expert.og_image_url || expert.logo_url || expert.avatar_url)),
    });
    res.setHeader('X-Robots-Tag', robotsValue);
  } else {
    html = injectSeo(html, {
      title: 'Ownlybiz - Own your expertise. Own your income.',
      description: 'Ownlybiz helps independent experts launch paid chat, voice, and video sessions on their own branded website.',
      canonical: 'https://ownlybiz.com/',
      robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
      image: '',
    });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(html);
};
