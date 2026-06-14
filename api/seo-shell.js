const fs = require('fs');
const path = require('path');

const BACKEND = (process.env.OWNLYBIZ_API_URL || process.env.OWNLY_API || 'https://ownlybiz-backend-production.up.railway.app').replace(/\/+$/, '');
const INDEX_PATH = path.join(process.cwd(), 'index.html');
const BLOG_POSTS_PATH = path.join(process.cwd(), 'data', 'ownlybiz-blog-posts.json');
const RESERVED = new Set([
  '', 'index.html', 'admin', 'dash', 'signup', 'dashboard', 'login', 'expert',
  'session', 'group', 'connectors', 'settings', 'messages', 'analytics',
  'payments', 'packages', 'reviews', 'clients', 'sessions', 'pricing', 'how',
  'features', 'experts', 'blog', 'contact', 'terms', 'legal',
]);
const CUSTOM_DOMAIN_SLUG_FALLBACKS = {
  'lunapsychics.com': 'liranprodtest',
  'www.lunapsychics.com': 'liranprodtest',
};

let cachedIndex = null;
let cachedBlogPosts = null;

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

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return null;
  }
}

function readBlogPosts() {
  if (!cachedBlogPosts || process.env.NODE_ENV !== 'production') {
    try {
      const parsed = JSON.parse(fs.readFileSync(BLOG_POSTS_PATH, 'utf8'));
      cachedBlogPosts = Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      cachedBlogPosts = [];
    }
  }
  return cachedBlogPosts;
}

function blogSlugFromPath(pathname) {
  const parts = String(pathname || '/').replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts[0] !== 'blog' || !parts[1]) return '';
  const decoded = safeDecode(parts[1]);
  return decoded == null ? null : decoded;
}

function isBlogPath(pathname) {
  const parts = String(pathname || '/').replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  return parts[0] === 'blog';
}

function blogUrl(post) {
  return `https://ownlybiz.com/blog/${encodeURIComponent(post.slug)}`;
}

function renderBlogTags(post) {
  return (post.tags || []).slice(0, 3).map((tag) => `<span class="ob-blog-tag">${esc(tag)}</span>`).join('');
}

function renderBlogFeatures(post) {
  return (post.relatedFeatures || []).map((feature) => `<span class="ob-blog-feature-chip">${esc(feature)}</span>`).join('');
}

function renderBlogHub(posts) {
  if (!posts.length) return '<div class="ob-blog-loading">Ownlybiz guides are being prepared.</div>';
  const featured = posts[0];
  const rest = posts.slice(1);
  return [
    '<div class="ob-blog-hub-grid">',
      '<article class="ob-blog-featured">',
        `<a href="${blogUrl(featured).replace('https://ownlybiz.com', '')}"><img class="ob-blog-img" src="${esc(featured.image)}" alt="${esc(featured.imageAlt)}" loading="eager"></a>`,
        '<div class="ob-blog-featured-body">',
          `<div class="ob-blog-kicker">${esc(featured.category)} · ${esc(featured.readTime)}</div>`,
          `<h2 class="ob-blog-title"><a href="${blogUrl(featured).replace('https://ownlybiz.com', '')}">${esc(featured.title)}</a></h2>`,
          `<p class="ob-blog-excerpt">${esc(featured.summary)}</p>`,
          `<div class="ob-blog-meta"><span>${esc(featured.date)}</span><span>Ownlybiz Team</span></div>`,
          `<div class="ob-blog-tag-row" style="margin:18px 0;">${renderBlogTags(featured)}</div>`,
          `<a class="ob-blog-read" href="${blogUrl(featured).replace('https://ownlybiz.com', '')}">Read guide</a>`,
        '</div>',
      '</article>',
      '<aside class="ob-blog-side-card">',
        '<h2>Built for expert revenue, not content filler.</h2>',
        '<p>These guides explain how Ownlybiz helps independent experts publish, sell, deliver, manage, follow up, and improve while keeping AI features framed as reviewed marketing/admin support.</p>',
        '<div class="ob-blog-side-list">',
          '<span>Transparent platform fee and expert keep-rate language.</span>',
          '<span>Stripe-powered checkout with card and wallet flows where available.</span>',
          '<span>Pay-by-minute, packages, written services, Email Center, domains, analytics, and AI draft tools.</span>',
        '</div>',
        '<a class="btn btn-primary btn-sm" href="/features">Explore Ownlybiz</a>',
      '</aside>',
    '</div>',
    '<div class="ob-blog-card-grid">',
      rest.map((post) => [
        '<article class="ob-blog-card">',
          `<a href="${blogUrl(post).replace('https://ownlybiz.com', '')}"><img class="ob-blog-img" src="${esc(post.image)}" alt="${esc(post.imageAlt)}" loading="lazy"></a>`,
          '<div class="ob-blog-card-body">',
            `<div class="ob-blog-kicker">${esc(post.category)} · ${esc(post.readTime)}</div>`,
            `<h2><a href="${blogUrl(post).replace('https://ownlybiz.com', '')}">${esc(post.title)}</a></h2>`,
            `<p>${esc(post.summary)}</p>`,
            `<div class="ob-blog-tag-row">${renderBlogTags(post)}</div>`,
          '</div>',
        '</article>',
      ].join('')).join(''),
    '</div>',
  ].join('');
}

function renderBlogArticle(post, posts) {
  const related = posts.filter((item) => item.slug !== post.slug).slice(0, 3);
  return [
    '<article class="ob-blog-article">',
      `<div class="ob-blog-article-hero"><img src="${esc(post.image)}" alt="${esc(post.imageAlt)}"></div>`,
      '<div class="ob-blog-article-head">',
        '<a class="ob-blog-back" href="/blog">← Back to all guides</a>',
        `<div class="ob-blog-kicker">${esc(post.category)} · ${esc(post.readTime)}</div>`,
        `<h1>${esc(post.title)}</h1>`,
        `<p class="ob-blog-article-summary">${esc(post.summary)}</p>`,
        `<div class="ob-blog-meta"><span>${esc(post.date)}</span><span>Ownlybiz Team</span><span>${esc(post.audience || 'Independent experts')}</span></div>`,
      '</div>',
      '<div class="ob-blog-article-body">',
        '<div class="ob-blog-prose">',
          `<div class="ob-blog-takeaways"><strong>Key takeaways</strong><ul>${(post.takeaways || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div>`,
          (post.sections || []).map((section) => [
            '<section>',
              `<h2>${esc(section.heading)}</h2>`,
              (section.body || []).map((p) => `<p>${esc(p)}</p>`).join(''),
              section.bullets && section.bullets.length ? `<ul>${section.bullets.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : '',
            '</section>',
          ].join('')).join(''),
          `<div class="ob-blog-faq"><strong>FAQ</strong>${(post.faqs || []).map((faq) => `<div class="ob-blog-faq-item"><h3>${esc(faq.question)}</h3><p>${esc(faq.answer)}</p></div>`).join('')}</div>`,
          '<div class="ob-blog-legal-note"><strong>Responsible use note</strong><p>Ownlybiz provides business infrastructure for independent experts. This guide is educational and operational, not legal, tax, medical, financial, therapy, or professional advice. Experts should review claims, policies, and field-specific obligations before publishing or sending campaigns.</p></div>',
        '</div>',
        '<aside class="ob-blog-aside">',
          `<div class="ob-blog-aside-card"><h2>Ownlybiz features mentioned</h2><div class="ob-blog-feature-list">${renderBlogFeatures(post)}</div></div>`,
          `<div class="ob-blog-aside-card"><h2>Email campaign angle</h2><p><strong>Subject:</strong> ${esc(post.email && post.email.subject)}</p><p><strong>Preheader:</strong> ${esc(post.email && post.email.preheader)}</p><p><strong>CTA:</strong> ${esc(post.email && post.email.cta)}</p></div>`,
          `<div class="ob-blog-aside-card"><h2>Related guides</h2>${related.map((item) => `<p><a href="${blogUrl(item).replace('https://ownlybiz.com', '')}">${esc(item.title)}</a></p>`).join('')}</div>`,
        '</aside>',
      '</div>',
    '</article>',
  ].join('');
}

function blogJsonLd(post, posts) {
  if (!post) {
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Ownlybiz Blog',
      url: 'https://ownlybiz.com/blog',
      about: ['independent experts', 'paid sessions', 'expert business infrastructure'],
      hasPart: posts.map((item) => ({ '@type': 'Article', headline: item.title, url: blogUrl(item) })),
    };
  }
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seoDescription || post.summary,
    image: `https://ownlybiz.com${post.image}`,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'Ownlybiz' },
    publisher: { '@type': 'Organization', name: 'Ownlybiz' },
    mainEntityOfPage: blogUrl(post),
    keywords: (post.tags || []).join(', '),
  };
  const faq = post.faqs && post.faqs.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  } : null;
  return faq ? [article, faq] : article;
}

function injectJsonLd(html, data) {
  const safe = JSON.stringify(data).replace(/</g, '\\u003c');
  return html.replace(/<\/head>/i, `<script type="application/ld+json">${safe}</script>\n</head>`);
}

function injectBlogContent(html, rendered) {
  const marker = '<!--OB_BLOG_SSR-->\n        <div class="ob-blog-loading">Loading Ownlybiz guides...</div>';
  return html.includes(marker)
    ? html.replace(marker, rendered)
    : html;
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

function normalizeDomain(value, stripWww = false) {
  let domain = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.+$/, '');
  if (stripWww) domain = domain.replace(/^www\./, '');
  return domain;
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

function queryOnly(req) {
  const url = String(req.url || '');
  const index = url.indexOf('?');
  return index >= 0 ? url.slice(index) : '';
}

function isLegacyCpanelPath(req) {
  return /^\/cgi-sys(?:\/|$)/i.test(pathOnly(req));
}

function routeFromRequest(req, host) {
  const subdomainSlug = slugFromHost(host);
  if (subdomainSlug) return { kind: 'subdomain', slug: subdomainSlug };

  const platform = isPlatformHost(host);
  const first = firstPathSegment(req).toLowerCase();
  if (platform && first && !RESERVED.has(first)) return { kind: 'platform-path', slug: first };
  if (!platform) return { kind: 'custom-domain', slug: '' };
  return { kind: 'platform', slug: '' };
}

function primaryDomainFromExpert(expert) {
  const primary = expert && expert.primary_domain || {};
  const raw = primary.custom_domain || primary.domain || primary.url || (expert && expert.domain_custom) || '';
  const domain = normalizeDomain(raw, true);
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)
    ? domain
    : '';
}

function pathForPrimaryDomain(req, route) {
  let pathname = pathOnly(req) || '/';
  if (route && route.kind === 'platform-path') {
    const segments = pathname.split('/').filter(Boolean);
    segments.shift();
    pathname = '/' + segments.join('/');
  }
  return pathname === '' ? '/' : pathname;
}

function shouldRedirectToPrimary(host, route, primaryDomain) {
  if (!primaryDomain || !route) return false;
  if (route.kind === 'subdomain' || route.kind === 'platform-path') return true;
  if (route.kind === 'custom-domain') return normalizeDomain(host) !== primaryDomain;
  return false;
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
  const route = routeFromRequest(req, host);
  let slug = route.slug;

  if (!slug && route.kind === 'custom-domain') {
    const lookup = await fetchJson(`${BACKEND}/api/domains/lookup?domain=${encodeURIComponent(host)}`);
    slug = clean(lookup && lookup.slug) || CUSTOM_DOMAIN_SLUG_FALLBACKS[host] || '';
  }
  if (!slug) return null;

  const profile = await fetchJson(`${BACKEND}/api/experts/${encodeURIComponent(slug)}`);
  const expert = profile && (profile.expert || profile);
  if (!expert || !(expert.name || expert.slug)) return { slug, route: { ...route, slug } };
  return { slug, route: { ...route, slug }, expert };
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

function whiteLabelAssetUrl(value, origin) {
  const url = clean(value);
  if (!url) return '';
  if (url.startsWith(`${BACKEND}/api/media/`)) return `${origin}${url.slice(BACKEND.length)}`;
  if (url.startsWith(`${BACKEND}/api/experts/favicon`)) return `${origin}${url.slice(BACKEND.length)}`;
  return url;
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
  if (isLegacyCpanelPath(req)) {
    res.setHeader('Location', `https://${host || 'ownlybiz.com'}/`);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(308).end();
    return;
  }

  const expertResult = await resolveExpert(req, host);
  const expert = expertResult && expertResult.expert;
  const route = expertResult && expertResult.route;
  const isExpert = !!expertResult;
  const origin = `https://${host || 'ownlybiz.com'}`;
  const canonical = origin + pathOnly(req);

  if (isExpert && expert) {
    const primaryDomain = primaryDomainFromExpert(expert);
    if (shouldRedirectToPrimary(host, route, primaryDomain)) {
      const location = `https://${primaryDomain}${pathForPrimaryDomain(req, route)}${queryOnly(req)}`;
      res.setHeader('Location', location);
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      res.status(308).end();
      return;
    }
  }

  let html = readIndex();
  let statusCode = 200;
  if (isExpert) {
    html = whiteLabelExpertShell(html);
    const primaryDomain = primaryDomainFromExpert(expert);
    const hostedOwnlybizCopy = route && (route.kind === 'subdomain' || route.kind === 'platform-path');
    const expertCanonical = primaryDomain
      ? `https://${primaryDomain}${pathForPrimaryDomain(req, route)}`
      : canonical;
    const explicitNoindex = expert && expert.allow_indexing !== undefined && expert.allow_indexing !== null
      && ['0', 'false', 'no', 'off'].includes(String(expert.allow_indexing).toLowerCase());
    const robotsValue = explicitNoindex
      ? 'noindex,nofollow'
      : hostedOwnlybizCopy && !primaryDomain
        ? 'noindex,follow,max-image-preview:large'
        : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
    html = injectSeo(html, {
      title: expertTitle(expert),
      description: expertDescription(expert),
      canonical: expertCanonical,
      robots: robotsValue,
      image: whiteLabelAssetUrl(expert && (expert.og_image_url || expert.logo_url || expert.avatar_url), origin),
    });
    res.setHeader('X-Robots-Tag', robotsValue);
  } else if (isBlogPath(pathOnly(req))) {
    const posts = readBlogPosts();
    const slug = blogSlugFromPath(pathOnly(req));
    const hasSlug = slug !== '';
    const post = hasSlug && slug ? posts.find((item) => item.slug === slug) : null;
    const knownBlogRoute = !hasSlug || !!post;
    if (!knownBlogRoute) statusCode = 404;
    const rendered = post
      ? renderBlogArticle(post, posts)
      : knownBlogRoute
        ? renderBlogHub(posts)
        : '<div class="ob-blog-loading"><h2>Guide not found</h2><p>The requested Ownlybiz guide is not published. Return to the blog hub for current resources.</p><p><a class="ob-blog-read" href="/blog">Back to all guides</a></p></div>';
    const title = post
      ? `${post.title} | Ownlybiz Blog`
      : knownBlogRoute
        ? 'Ownlybiz Blog - Guides for Independent Experts'
        : 'Guide not found | Ownlybiz Blog';
    const description = post
      ? post.seoDescription || post.summary
      : knownBlogRoute
        ? 'Useful Ownlybiz guides for independent experts building paid chat, voice, video, written services, packages, payments, email campaigns, and branded websites.'
        : 'The requested Ownlybiz guide is not published.';
    const canonicalPath = post ? `/blog/${encodeURIComponent(post.slug)}` : '/blog';
    html = injectBlogContent(html, rendered);
    html = injectSeo(html, {
      title,
      description,
      canonical: `https://ownlybiz.com${canonicalPath}`,
      robots: knownBlogRoute
        ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
        : 'noindex,follow',
      image: post ? `https://ownlybiz.com${post.image}` : '',
    });
    html = injectJsonLd(html, blogJsonLd(post, posts));
    res.setHeader('X-Robots-Tag', knownBlogRoute ? 'index,follow' : 'noindex,follow');
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
  res.status(statusCode).send(html);
};
