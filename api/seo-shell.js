const fs = require('fs');
const path = require('path');

const BACKEND = (process.env.OWNLYBIZ_API_URL || process.env.OWNLY_API || 'https://victorious-wisdom-production-a6b0.up.railway.app').replace(/\/+$/, '');
const INDEX_PATH = path.join(process.cwd(), 'index.html');
const BLOG_POSTS_PATH = path.join(process.cwd(), 'data', 'ownlybiz-blog-posts.json');
const RESERVED = new Set([
  '', 'index.html', 'admin', 'api', 'app', 'auth', 'billing', 'checkout',
  'connect', 'dash', 'signup', 'dashboard', 'login', 'logout', 'expert',
  'session', 'group', 'connectors', 'settings', 'messages', 'analytics',
  'payment', 'payments', 'packages', 'reviews', 'clients', 'sessions',
  'pricing', 'how', 'features', 'experts', 'blog', 'contact', 'support',
  'terms', 'legal', 'privacy', 'reset', 'reset-password', 'stripe', 'verify',
  'verify-email', 'wallet',
]);
const CUSTOM_DOMAIN_SLUG_FALLBACKS = {
  'lunapsychics.com': 'liranprodtest',
  'www.lunapsychics.com': 'liranprodtest',
};
const PUBLIC_FIRST_PAINT_SLUGS = publicSlugSet(process.env.OB_PUBLIC_EXPERT_FIRST_PAINT_SLUGS);
const PUBLIC_LITE_EXPERT_SLUGS = publicSlugSet(process.env.OB_PUBLIC_EXPERT_LITE_SLUGS);

let cachedIndex = null;
let cachedBlogPosts = null;
const publicExpertProfileCache = new Map();

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

function platformMarketingSeo(pathname) {
  const first = String(pathname || '/').replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)[0] || '';
  const pages = {
    '': {
      title: 'Ownlybiz - Own your expertise. Own your income.',
      description: 'Ownlybiz helps independent experts launch paid chat, voice, and video sessions on their own branded website.',
      canonicalPath: '/',
    },
    how: {
      title: 'How Ownlybiz Works - Expert Business Infrastructure',
      description: 'See how Ownlybiz helps independent experts publish a branded site, take bookings, run paid sessions, and manage clients.',
      canonicalPath: '/how',
    },
    features: {
      title: 'Ownlybiz Features - Websites, Payments, Sessions, and Email',
      description: 'Explore Ownlybiz features for expert websites, Stripe-powered payments, live sessions, written services, bookings, analytics, and Email Center workflows.',
      canonicalPath: '/features',
    },
    pricing: {
      title: 'Ownlybiz Pricing - Clear Platform Fees for Experts',
      description: 'Compare Ownlybiz plans and platform fees for independent experts running paid chat, voice, video, written services, and packages.',
      canonicalPath: '/pricing',
    },
    experts: {
      title: 'Expert Types on Ownlybiz - Consulting, Coaching, Wellness, Tarot, and More',
      description: 'Explore the types of independent experts who can build a paid practice on Ownlybiz, from consultants and coaches to wellness, tarot, tutoring, and creative professionals.',
      canonicalPath: '/experts',
    },
    contact: {
      title: 'Contact Ownlybiz',
      description: 'Contact Ownlybiz about expert business infrastructure, paid-session workflows, platform setup, or support.',
      canonicalPath: '/contact',
    },
  };
  return pages[first] || pages[''];
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

function isLocalNetworkHost(host) {
  return /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|0\.0\.0\.0|\[?::1\]?)$/.test(host);
}

function isPlatformHost(host) {
  return !host
    || host === 'ownlybiz.com'
    || host === 'www.ownlybiz.com'
    || host === 'localhost'
    || host === '127.0.0.1'
    || isLocalNetworkHost(host)
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

function cleanExpertSlug(value) {
  const slug = clean(value).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) return '';
  return RESERVED.has(slug) ? '' : slug;
}

function publicSlugSet(raw) {
  return new Set(
    String(raw || '')
      .split(',')
      .map((value) => clean(value) === '*' ? '*' : cleanExpertSlug(value))
      .filter(Boolean)
  );
}

function publicSlugSetHas(set, slug) {
  const cleanSlug = cleanExpertSlug(slug);
  return !!cleanSlug && (set.has(cleanSlug) || set.has('*'));
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

function queryExpertSlug(req) {
  try {
    return cleanExpertSlug(new URLSearchParams(queryOnly(req)).get('expert'));
  } catch (_) {
    return '';
  }
}

function queryFlag(req, name) {
  try {
    const value = new URLSearchParams(queryOnly(req)).get(name);
    return value === '1' || String(value || '').toLowerCase() === 'true';
  } catch (_) {
    return false;
  }
}

function isLegacyCpanelPath(req) {
  return /^\/cgi-sys(?:\/|$)/i.test(pathOnly(req));
}

function routeFromRequest(req, host) {
  const subdomainSlug = slugFromHost(host);
  if (subdomainSlug) return { kind: 'subdomain', slug: subdomainSlug };

  const platform = isPlatformHost(host);
  if (platform) {
    const querySlug = queryExpertSlug(req);
    if (querySlug) return { kind: 'query', slug: querySlug };
  }
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

async function fetchCachedPublicExpert(url, timeoutMs = 1800, ttlMs = 30000) {
  const now = Date.now();
  const cached = publicExpertProfileCache.get(url);
  if (cached && cached.expiresAt > now) return cached.value;
  const value = await fetchJson(url, timeoutMs);
  if (value) {
    publicExpertProfileCache.set(url, {
      value,
      expiresAt: now + ttlMs,
      staleUntil: now + Math.max(ttlMs * 4, 120000),
    });
    return value;
  }
  if (cached && cached.staleUntil > now) return cached.value;
  return null;
}

async function fetchCachedPublicOnDemand(slug) {
  const cleanSlug = clean(slug);
  if (!cleanSlug || !publicPreloadOnDemandEnabled(cleanSlug)) return null;
  const url = `${BACKEND}/api/on-demand/public/${encodeURIComponent(cleanSlug)}`;
  const value = await fetchCachedPublicExpert(url, 1400, 60000);
  return value && value.success !== false && value.available ? value : null;
}

async function resolveExpert(req, host) {
  const route = routeFromRequest(req, host);
  let slug = route.slug;

  if (!slug && route.kind === 'custom-domain') {
    const lookup = await fetchJson(`${BACKEND}/api/domains/lookup?domain=${encodeURIComponent(host)}`);
    slug = clean(lookup && lookup.slug) || CUSTOM_DOMAIN_SLUG_FALLBACKS[host] || '';
  }
  if (!slug) return null;

  const profileUrl = `${BACKEND}/api/experts/${encodeURIComponent(slug)}`;
  const profileTtl = publicFirstPaintEnabled(slug) ? 300000 : 30000;
  const profile = await fetchCachedPublicExpert(profileUrl, 1800, profileTtl);
  const expert = profile && (profile.expert || profile);
  if (!expert || !(expert.name || expert.slug)) return { slug, route: { ...route, slug } };
  return { slug, route: { ...route, slug }, expert, profile };
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

function setFavicon(html, href) {
  const safe = esc(href);
  const tags = [
    `<link rel="icon" href="${safe}">`,
    `<link rel="apple-touch-icon" href="${safe}">`,
  ].join('\n');
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${tags}\n</head>`) : `${tags}\n${html}`;
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

function safeScriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const PUBLIC_EXPERT_PRELOAD_FIELDS = [
  'id', 'user_id', 'slug', 'name', 'display_name', 'title', 'bio', 'about_text',
  'hero_tagline', 'footer_text', 'credentials', 'theme_color', 'theme_preset',
  'website_content', 'website_published', 'website_published_at', 'avatar_url',
  'logo_url', 'og_image_url', 'location', 'language', 'timezone', 'tags',
  'social_links', 'rate_chat', 'rate_voice', 'rate_video', 'chat_pm', 'voice_pm',
  'video_pm', 'free_minutes', 'chat_free_min', 'voice_free_min', 'video_free_min',
  'chat_free_min_available', 'voice_free_min_available',
  'video_free_min_available', 'free_minutes_available', 'avg_rating',
  'review_count', 'session_count', 'is_online', 'accept_offline',
  'payments_enabled', 'chat_enabled', 'voice_enabled', 'video_enabled',
  'service_pause', 'credit_amounts', 'credit_enabled', 'credit_no_expiration',
  'packages', 'meta_title', 'meta_description', 'allow_indexing',
  'primary_domain', 'ga4_id', 'gtm_id', 'meta_pixel_id', 'privacy_notice',
  'privacy_cookie_banner_enabled', 'privacy_contact_email',
];

function publicExpertPreloadData(expert, profile) {
  const preloaded = {};
  for (const field of PUBLIC_EXPERT_PRELOAD_FIELDS) {
    if (expert[field] !== undefined) preloaded[field] = expert[field];
  }
  if (Array.isArray(profile.packages) && !Array.isArray(preloaded.packages)) {
    preloaded.packages = profile.packages;
  }
  return preloaded;
}

function injectPublicExpertPreload(html, expertResult, host, onDemandResult) {
  const expert = expertResult && expertResult.expert;
  if (!expert || !(expert.name || expert.slug)) return html;

  const profile = (expertResult && expertResult.profile) || {};
  const preloadedExpert = publicExpertPreloadData(expert, profile);

  const payload = {
    version: 1,
    slug: clean(expert.slug || expertResult.slug),
    host: normalizeDomain(host, true),
    routeKind: expertResult && expertResult.route && expertResult.route.kind || '',
    expert: preloadedExpert,
  };
  const firstPaint = publicFirstPaintEnabled(payload.slug)
    ? `window.__OB_PUBLIC_FIRST_PAINT__={slug:${safeScriptJson(payload.slug)}};`
    : '';
  const onDemand = onDemandResult
    ? `window.__OB_PRELOADED_ON_DEMAND__=${safeScriptJson(onDemandResult)};`
    : '';
  const script = `<script id="ob-public-expert-preload">${firstPaint}window.__OB_PRELOADED_EXPERT__=${safeScriptJson(payload)};${onDemand}</script>`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>\n${script}`);
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${script}\n</head>`) : `${script}\n${html}`;
}

function addHtmlClass(html, className) {
  return html.replace(/<html\b([^>]*)>/i, (match, attrs) => {
    const classMatch = attrs.match(/\sclass=(["'])(.*?)\1/i);
    if (classMatch) {
      const current = classMatch[2].split(/\s+/).filter(Boolean);
      if (!current.includes(className)) current.push(className);
      return match.replace(classMatch[0], ` class="${esc(current.join(' '))}"`);
    }
    return `<html${attrs} class="${esc(className)}">`;
  });
}

function publicFirstPaintPage(req, route) {
  const parts = pathOnly(req).replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (route && route.kind === 'platform-path') parts.shift();
  return (parts[0] || 'home').toLowerCase();
}

function money(value, fallback) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return fallback || '';
  return `$${amount.toFixed(2).replace(/\.00$/, '')}/min`;
}

function initials(name) {
  const parts = clean(name, 'Expert').split(/\s+/).filter(Boolean);
  return esc((parts[0] && parts[0][0] || 'E') + (parts[1] && parts[1][0] || ''));
}

function safeHex(value, fallback) {
  const color = clean(value);
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

const PUBLIC_LITE_PALETTES = {
  warm: { accent: '#C4622D', action: '#FF6B47', status: '#637653', background: '#F7F1E8', surface: '#FFFDF8', text: '#241A15' },
  ocean: { accent: '#2B6CB0', action: '#4FD1C5', status: '#2563EB', background: '#F3F8FB', surface: '#FFFFFF', text: '#102033' },
  forest: { accent: '#2D5016', action: '#A3BE8C', status: '#2D8A4E', background: '#F4F7EF', surface: '#FFFFFA', text: '#142112' },
  midnight: { accent: '#6C5CE7', action: '#A29BFE', status: '#C8FF3D', background: '#0B0908', surface: '#1A1614', text: '#FAF7F2' },
  sunset: { accent: '#D35400', action: '#FF8A4C', status: '#84CC16', background: '#FFF4EA', surface: '#FFFFFF', text: '#27160E' },
  rose: { accent: '#BE185D', action: '#F472B6', status: '#22C55E', background: '#FFF1F5', surface: '#FFFFFF', text: '#2A101A' },
  slate: { accent: '#475569', action: '#64748B', status: '#22C55E', background: '#F8FAFC', surface: '#FFFFFF', text: '#111827' },
  charcoal: { accent: '#374151', action: '#94A3B8', status: '#86EFAC', background: '#111827', surface: '#1F2937', text: '#F9FAFB' },
};

function publicLitePalette(name) {
  return { ...(PUBLIC_LITE_PALETTES[clean(name).toLowerCase()] || PUBLIC_LITE_PALETTES.warm) };
}

function publicLiteRgb(hex) {
  const color = safeHex(hex, '');
  if (!color || color.length < 7) return null;
  return {
    r: parseInt(color.slice(1, 3), 16),
    g: parseInt(color.slice(3, 5), 16),
    b: parseInt(color.slice(5, 7), 16),
  };
}

function publicLiteAlpha(hex, alpha, fallback) {
  const rgb = publicLiteRgb(hex);
  return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})` : fallback;
}

function publicLiteColorChannel(value) {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function publicLiteLuminance(hex) {
  const rgb = publicLiteRgb(hex);
  if (!rgb) return null;
  return 0.2126 * publicLiteColorChannel(rgb.r)
    + 0.7152 * publicLiteColorChannel(rgb.g)
    + 0.0722 * publicLiteColorChannel(rgb.b);
}

function publicLiteContrast(foreground, background) {
  const fg = publicLiteLuminance(foreground);
  const bg = publicLiteLuminance(background);
  if (fg === null || bg === null) return 0;
  const high = Math.max(fg, bg);
  const low = Math.min(fg, bg);
  return (high + 0.05) / (low + 0.05);
}

function publicLiteReadableOn(hex) {
  const luminance = publicLiteLuminance(hex);
  return luminance !== null && luminance >= 0.58 ? '#0B0908' : '#FFFDF8';
}

function publicLiteReadableText(tokens, dark) {
  const requested = safeHex(tokens.text, '');
  const fallback = dark ? '#F8F3EA' : '#241A15';
  if (requested && publicLiteContrast(requested, tokens.background) >= 4.5 && publicLiteContrast(requested, tokens.surface) >= 4.5) {
    return requested;
  }
  return fallback;
}

function publicLiteDesign(expert, wc) {
  const base = publicLitePalette(expert && expert.theme_preset);
  const saved = wc && wc.design_tokens || {};
  const tokens = {
    accent: safeHex(saved.accent || (expert && expert.theme_color), base.accent),
    action: safeHex(saved.action, base.action),
    status: safeHex(saved.status, base.status),
    background: safeHex(saved.background, base.background),
    surface: safeHex(saved.surface, base.surface),
    text: safeHex(saved.text, base.text),
  };
  const requestedMode = clean(wc && wc.site_mode, '').toLowerCase();
  const bgLuminance = publicLiteLuminance(tokens.background);
  const dark = requestedMode === 'dark' || (requestedMode !== 'light' && bgLuminance !== null && bgLuminance < 0.42);
  tokens.text = publicLiteReadableText(tokens, dark);
  return {
    mode: dark ? 'dark' : 'light',
    bg: tokens.background,
    surface: tokens.surface,
    text: tokens.text,
    accent: tokens.accent,
    action: tokens.action,
    status: tokens.status,
    muted: publicLiteAlpha(tokens.text, dark ? 0.78 : 0.74, dark ? 'rgba(248,243,234,.78)' : 'rgba(36,26,21,.74)'),
    soft: publicLiteAlpha(tokens.text, dark ? 0.05 : 0.035, dark ? 'rgba(255,255,255,.05)' : 'rgba(36,26,21,.035)'),
    border: publicLiteAlpha(tokens.text, dark ? 0.16 : 0.14, dark ? 'rgba(248,243,234,.16)' : 'rgba(36,26,21,.14)'),
    actionSoft: publicLiteAlpha(tokens.action, dark ? 0.20 : 0.14, 'rgba(233,121,74,.18)'),
    actionBorder: publicLiteAlpha(tokens.action, dark ? 0.72 : 0.46, 'rgba(233,121,74,.72)'),
    actionText: publicLiteReadableOn(tokens.action),
    statusSoft: publicLiteAlpha(tokens.status, dark ? 0.16 : 0.12, 'rgba(34,197,94,.12)'),
    statusBorder: publicLiteAlpha(tokens.status, dark ? 0.38 : 0.28, 'rgba(34,197,94,.35)'),
    shadow: dark ? '0 24px 90px rgba(0,0,0,.22)' : '0 18px 55px rgba(20,17,15,.10)',
  };
}

function publicLiteEnabled(slug) {
  return publicSlugSetHas(PUBLIC_LITE_EXPERT_SLUGS, slug);
}

function publicFirstPaintEnabled(slug) {
  return publicSlugSetHas(PUBLIC_FIRST_PAINT_SLUGS, slug);
}

function publicPreloadOnDemandEnabled(slug) {
  return publicFirstPaintEnabled(slug) || publicLiteEnabled(slug);
}

function publicLiteRequestOrigin(req, host) {
  const proto = clean(req.headers['x-forwarded-proto'], host && /^(localhost|127\.0\.0\.1)(?::|$)/.test(host) ? 'http' : 'https')
    .split(',')[0]
    .trim()
    .toLowerCase();
  return `${proto || 'https'}://${host || 'ownlybiz.com'}`;
}

function publicLitePath(route, page) {
  const cleanPage = clean(page || 'home').toLowerCase();
  const suffix = cleanPage === 'home' ? '' : `/${encodeURIComponent(cleanPage)}`;
  if (route && route.kind === 'platform-path') return `/${encodeURIComponent(route.slug || '')}${suffix}`.replace(/\/+$/, '') || '/';
  return suffix || '/';
}

function publicLitePage(req, route) {
  const page = publicFirstPaintPage(req, route);
  return ['home', 'about', 'services', 'reviews', 'book', 'contact'].includes(page) ? page : 'home';
}

function publicLiteBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') return !!fallback;
  if (value === false || value === 0) return false;
  return !['0', 'false', 'off', 'no', 'disabled'].includes(String(value).trim().toLowerCase());
}

function publicLiteMoneyCents(cents, currency = 'USD') {
  const amount = Number(cents);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: clean(currency, 'USD').toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch (_) {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

function publicLiteFirstName(name) {
  return clean(name, 'Expert').split(/\s+/)[0] || 'Expert';
}

function publicLiteRate(expert, channel, fallback) {
  const keys = [`rate_${channel}`, `${channel}_pm`, `${channel}_rate`];
  if (channel === 'chat') keys.push('rate', 'rate_per_min');
  for (const key of keys) {
    const amount = Number(expert && expert[key]);
    if (Number.isFinite(amount) && amount > 0) return `$${amount.toFixed(2)}/min`;
  }
  return fallback;
}

function publicLiteFree(expert, channel) {
  const keys = channel === 'chat'
    ? ['chat_free_min_available', 'chat_free_min', 'free_minutes_available', 'free_minutes']
    : [`${channel}_free_min_available`, `${channel}_free_min`];
  for (const key of keys) {
    const value = Number(expert && expert[key]);
    if (Number.isFinite(value) && value > 0) return `${Math.round(value)} min free`;
  }
  return '';
}

function publicLiteTextBlock(value, fallback = '') {
  const text = clean(value, fallback);
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((part) => clean(part))
    .filter(Boolean)
    .slice(0, 8);
}

function publicLiteOnDemand(onDemandResult) {
  if (!onDemandResult || !onDemandResult.available || !Array.isArray(onDemandResult.buckets) || !onDemandResult.buckets.length) return null;
  const settings = onDemandResult.settings || {};
  const buckets = onDemandResult.buckets.map((bucket) => ({
    id: clean(bucket.id || bucket.bucket_id || bucket.name),
    label: clean(bucket.label || bucket.name || bucket.title, 'Written answer'),
    price: publicLiteMoneyCents(bucket.price_cents, bucket.currency || 'USD'),
    price_cents: Number(bucket.price_cents || 0),
    currency: clean(bucket.currency, 'USD'),
  })).filter((bucket) => bucket.id || bucket.label);
  if (!buckets.length) return null;
  return {
    label: clean(settings.public_label, 'Written Reading'),
    intro: clean(settings.intro_text, 'Send one private question and receive a written answer.'),
    delivery: clean(settings.delivery_policy, 'Your private reading is delivered securely after login.'),
    placement: settings.placement || {},
    buckets,
  };
}

function publicLiteServiceCard(item) {
  const disabled = item.disabled ? ' is-disabled' : '';
  const attrDisabled = item.disabled ? ' aria-disabled="true" disabled' : '';
  const action = item.disabled ? '' : ` onclick="${esc(item.action)}"`;
  if (item.kind === 'chat') {
    if (item.disabled) {
      return `<button type="button" class="ob-lite-card ob-lite-card-chat${disabled}"${attrDisabled}>
        <span class="ob-lite-card-title">${esc(item.title)}</span>
        <span class="ob-lite-card-copy">${esc(item.copy || 'Unavailable now')}</span>
      </button>`;
    }
    return `<button type="button" class="ob-lite-card ob-lite-card-chat${disabled}"${attrDisabled}${action}>
      <span class="ob-lite-card-title">${esc(item.title)}</span>
      <span class="ob-lite-card-copy">${esc(item.copy)}</span>
      <span class="ob-lite-card-price">${esc(item.price || '')}</span>
      ${item.free ? `<span class="ob-lite-free">${esc(item.free)}</span>` : ''}
      <span class="ob-lite-start">Start</span>
    </button>`;
  }
  if (item.kind === 'live') {
    if (item.disabled) {
      return `<button type="button" class="ob-lite-card ob-lite-card-live${disabled}"${attrDisabled}>
        <span class="ob-lite-card-title">${esc(item.title)}</span>
        <span class="ob-lite-card-copy">${esc(item.copy || 'Unavailable now')}</span>
      </button>`;
    }
    return `<button type="button" class="ob-lite-card ob-lite-card-live${disabled}"${attrDisabled}${action}>
      <span class="ob-lite-card-title">${esc(item.title)}</span>
      <span class="ob-lite-card-price">${esc(item.price || '')}</span>
      ${item.free ? `<span class="ob-lite-free">${esc(item.free)}</span>` : ''}
      <span class="ob-lite-start">Start</span>
    </button>`;
  }
  if (item.kind === 'written') {
    return `<button type="button" class="ob-lite-card ob-lite-card-written${disabled}"${attrDisabled}${action}>
      <span class="ob-lite-badge">WR</span>
      <span class="ob-lite-card-title">${esc(item.title)}</span>
      <span class="ob-lite-card-copy">${esc(item.copy)}</span>
      <span class="ob-lite-card-price">${esc(item.price || '')}</span>
    </button>`;
  }
  if (item.kind === 'schedule') {
    return `<button type="button" class="ob-lite-card ob-lite-card-schedule${disabled}"${attrDisabled}${action}>
      <span class="ob-lite-badge ob-lite-badge-cal">CAL</span>
      <span class="ob-lite-card-title">${esc(item.title)}</span>
      <span class="ob-lite-card-copy">${esc(item.copy)}</span>
      <span class="ob-lite-card-price">${esc(item.status || '')}</span>
    </button>`;
  }
  return `<button type="button" class="ob-lite-service${disabled}"${attrDisabled}${action}>
    <span class="ob-lite-service-icon">${esc(item.icon)}</span>
    <span><strong>${esc(item.title)}</strong><small>${esc(item.copy)}</small></span>
    <em>${esc(item.price || item.status || '')}</em>
  </button>`;
}

function renderPublicLitePage(expertResult, req, host, onDemandResult) {
  const expert = expertResult && expertResult.expert;
  if (!expert || !(expert.name || expert.slug)) return '';
  const route = expertResult.route || {};
  const origin = publicLiteRequestOrigin(req, host);
  const page = publicLitePage(req, route);
  const slug = clean(expert.slug || expertResult.slug);
  const wc = websiteContent(expert);
  const design = publicLiteDesign(expert, wc);
  const name = clean(expert.name || expert.display_name, 'Independent Expert');
  const firstName = publicLiteFirstName(name);
  const title = clean(expert.title || expert.category || expert.specialty || expert.tagline || expert.subtitle, 'Expert');
  const tagline = clean(wc.hero_tagline || expert.hero_tagline || expert.tagline || expert.about_text || expert.bio, `Private sessions with ${name}.`);
  const logo = whiteLabelAssetUrl(wc.logo_image || expert.logo_url || wc.profile_image || expert.avatar_url || '', origin);
  const profileImage = whiteLabelAssetUrl(
    expert.photo_url || expert.profile_photo || expert.avatar_url || expert.image_url || expert.photo || expert.photoUrl || wc.profile_image || expert.logo_url || wc.logo_image || '',
    origin
  );
  const favicon = expertFaviconUrl(expert, req, host, origin);
  const online = Number(expert.is_online) === 1 || expert.is_online === true;
  const paid = publicLiteBoolean(expert.payments_enabled, false);
  const rawOnDemand = publicLiteOnDemand(onDemandResult);
  const onDemand = rawOnDemand && (
    page === 'services' ? rawOnDemand.placement.services !== false
      : page === 'book' ? rawOnDemand.placement.book === true
        : rawOnDemand.placement.home !== false
  ) ? rawOnDemand : null;
  const chatEnabled = paid && online && publicLiteBoolean(expert.chat_enabled, true);
  const voiceEnabled = paid && online && publicLiteBoolean(expert.voice_enabled, true);
  const videoEnabled = paid && online && publicLiteBoolean(expert.video_enabled, true);
  const scheduleEnabled = paid && (online || publicLiteBoolean(expert.accept_offline, true));
  const rating = Number(expert.avg_rating) > 0
    ? `${Number(expert.avg_rating).toFixed(1)} star${Number(expert.review_count) ? ` · ${Number(expert.review_count)} ratings` : ''}`
    : 'New expert';
  const avatar = profileImage
    ? `<img src="${esc(profileImage)}" alt="" width="96" height="96" decoding="async" loading="${page === 'book' || page === 'home' ? 'eager' : 'lazy'}">`
    : `<span>${initials(name)}</span>`;
  const navItems = ['home', 'about', 'services', 'reviews', 'book', 'contact'];
  const nav = navItems.map((item) => {
    const label = item === 'home' ? 'Home' : item === 'book' ? clean((wc.nav_labels || {}).book, 'Book a Session') : clean((wc.nav_labels || {})[item], item[0].toUpperCase() + item.slice(1));
    const active = item === page ? ' aria-current="page"' : '';
    return `<a${active} href="${esc(publicLitePath(route, item))}">${esc(label)}</a>`;
  }).join('');
  const fullHref = `${pathOnly(req)}${queryOnly(req) ? `${queryOnly(req)}&full=1` : '?full=1'}`;
  const liveCards = paid ? [
    {
      kind: 'chat',
      title: `Chat with ${firstName} now`,
      copy: chatEnabled ? 'Private live text session' : (paid ? 'Unavailable now' : 'Setup pending'),
      price: publicLiteRate(expert, 'chat', '$3.50/min'),
      free: publicLiteFree(expert, 'chat'),
      action: "obLiteOpenLive('chat')",
      disabled: !chatEnabled,
    },
    {
      kind: 'live',
      title: 'Call',
      price: publicLiteRate(expert, 'voice', '$4.50/min'),
      free: publicLiteFree(expert, 'voice'),
      action: "obLiteOpenLive('voice')",
      disabled: !voiceEnabled,
    },
    {
      kind: 'live',
      title: 'Video',
      price: publicLiteRate(expert, 'video', '$6.00/min'),
      free: publicLiteFree(expert, 'video'),
      action: "obLiteOpenLive('video')",
      disabled: !videoEnabled,
    },
  ] : [];
  if (onDemand) {
    liveCards.push({
      kind: 'written',
      title: onDemand.label,
      copy: 'Send one private question. Delivered securely after login.',
      price: onDemand.buckets[0] && onDemand.buckets[0].price ? `from ${onDemand.buckets[0].price}` : 'Written answer',
      action: 'obLiteOpenWritten()',
    });
  }
  const scheduleCard = scheduleEnabled ? {
      kind: 'schedule',
      title: 'Book a live session',
      copy: 'Choose a time that works for you.',
      status: 'Schedule',
      action: 'obLiteOpenSchedule()',
    } : null;
  const bookItems = scheduleCard ? liveCards.concat(scheduleCard) : liveCards.slice();
  const unavailableReason = !paid
    ? 'This expert is not accepting paid sessions yet. Please check back later.'
    : (!bookItems.length ? 'This expert is not accepting sessions right now. Please check back later.' : '');
  const bookCards = bookItems.length
    ? bookItems.map(publicLiteServiceCard).join('')
    : `<div class="ob-lite-unavailable"><strong>Sessions are not available yet</strong><span>${esc(unavailableReason)}</span></div>`;
  const serviceCards = liveCards.map(publicLiteServiceCard).join('');
  const aboutParagraphs = publicLiteTextBlock(expert.about_text || expert.bio || wc.about_body, tagline)
    .map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
  const pageTitle = {
    home: name,
    about: clean(wc.about_title, `About ${name}`),
    services: clean(wc.svc_title, 'Services & Rates'),
    reviews: 'Reviews',
    book: 'How would you like to connect?',
    contact: clean(wc.contact_heading, `Contact ${name}`),
  }[page];
  const pageBodies = {
    home: `<section class="ob-lite-hero">
      <div class="ob-lite-photo">${avatar}</div>
      <div>
        <p class="ob-lite-kicker">${online ? 'Available now' : 'Offline right now'}</p>
        <h1>${esc(name)}</h1>
        <p>${esc(tagline)}</p>
        <div class="ob-lite-actions"><a class="ob-lite-primary" href="${esc(publicLitePath(route, 'book'))}">Book a Session</a><a class="ob-lite-secondary" href="${esc(publicLitePath(route, 'services'))}">View Services</a></div>
      </div>
    </section>
    <section class="ob-lite-section"><h2>${esc(clean(wc.svc_title, 'Choose your session'))}</h2><div class="ob-lite-services">${serviceCards}</div></section>`,
    about: `<section class="ob-lite-section ob-lite-split"><div><h1>${esc(pageTitle)}</h1>${aboutParagraphs}</div><div class="ob-lite-photo large">${avatar}</div></section>`,
    services: `<section class="ob-lite-section"><h1>${esc(pageTitle)}</h1><p>${esc(clean(wc.svc_subtitle, 'Choose the format that fits your question.'))}</p><div class="ob-lite-services stacked">${serviceCards}</div></section>`,
    reviews: `<section class="ob-lite-section"><h1>Reviews</h1><div class="ob-lite-review"><div class="ob-lite-stars">★★★★★</div><strong>${esc(rating)}</strong><p>${esc(Number(expert.review_count) > 0 ? 'Client feedback from completed sessions.' : `${name} is ready for first reviews on this site.`)}</p></div></section>`,
    book: `<section class="ob-lite-book-head">
      <div class="ob-lite-profile"><div class="ob-lite-photo small">${avatar}</div><div><h2>${esc(name)}</h2><p>${esc(title)}</p><div class="ob-lite-stars">★★★★★ <span>${esc(rating)}</span></div></div></div>
      <h1>How would you like to connect?</h1>
      <p>Start now, send a private written question, or reserve time for later.</p>
    </section><section class="ob-lite-book-grid">${bookCards}</section>`,
    contact: `<section class="ob-lite-section"><h1>${esc(pageTitle)}</h1><div class="ob-lite-contact">
      <p>${esc(clean(wc.contact_desc, 'For fastest support, book a session through this site.'))}</p>
      <div><strong>Email</strong><span>${esc(clean(wc.contact_email || expert.privacy_contact_email, 'Use the booking form'))}</span></div>
      <div><strong>Location</strong><span>${esc(clean(wc.contact_location || expert.location, 'Remote sessions'))}</span></div>
      <div><strong>Hours</strong><span>${esc(clean(wc.contact_hours, 'Flexible availability'))}</span></div>
    </div></section>`,
  };
  const config = {
    slug,
    name,
    firstName,
    title,
    backend: BACKEND,
    fullHref,
    live: {
      chat: { label: `Chat with ${firstName}`, enabled: chatEnabled, price: publicLiteRate(expert, 'chat', '$3.50/min'), free: publicLiteFree(expert, 'chat') },
      voice: { label: 'Call', enabled: voiceEnabled, price: publicLiteRate(expert, 'voice', '$4.50/min'), free: publicLiteFree(expert, 'voice') },
      video: { label: 'Video', enabled: videoEnabled, price: publicLiteRate(expert, 'video', '$6.00/min'), free: publicLiteFree(expert, 'video') },
    },
    onDemand,
  };
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(expertTitle(expert))}</title>
  <meta name="description" content="${esc(expertDescription(expert))}">
  <meta name="robots" content="noindex,follow,max-image-preview:large">
  <link rel="canonical" href="${esc(origin + pathOnly(req))}">
  <link rel="icon" href="${esc(favicon)}">
  <link rel="apple-touch-icon" href="${esc(favicon)}">
  ${profileImage && (page === 'book' || page === 'home') ? `<link rel="preload" as="image" href="${esc(profileImage)}">` : ''}
  <style>
    :root{color-scheme:${design.mode};--bg:${design.bg};--surface:${design.surface};--text:${design.text};--muted:${design.muted};--border:${design.border};--soft:${design.soft};--accent:${design.accent};--action:${design.action};--action-soft:${design.actionSoft};--action-border:${design.actionBorder};--action-text:${design.actionText};--status:${design.status};--status-soft:${design.statusSoft};--status-border:${design.statusBorder};--shadow:${design.shadow};font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:inherit}a{color:inherit;text-decoration:none}button,input,textarea,select{font:inherit}
    .ob-lite-nav{height:60px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:0 clamp(16px,4vw,40px);border-bottom:1px solid var(--border);background:var(--bg);position:sticky;top:0;z-index:20}
    .ob-lite-brand{display:flex;align-items:center;gap:10px;min-width:0;font-weight:650;flex:1 1 auto}.ob-lite-brand img{width:32px;height:32px;border-radius:8px;object-fit:cover}.ob-lite-brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ob-lite-links{display:none;position:absolute;top:60px;right:16px;width:min(320px,calc(100vw - 32px));z-index:50;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px;box-shadow:0 24px 80px rgba(0,0,0,.28);grid-template-columns:1fr}.ob-lite-links a{white-space:nowrap;padding:11px 12px;border-radius:8px;color:var(--muted);font-size:14px;font-weight:520}.ob-lite-links a[aria-current="page"]{color:var(--action)}.ob-lite-menu-open .ob-lite-links{display:grid}
    .ob-lite-nav-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}.ob-lite-status{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--status-border);background:var(--status-soft);border-radius:999px;padding:8px 13px;color:var(--status);font-size:12px;font-weight:650;line-height:1}.ob-lite-status:before{content:"";width:9px;height:9px;border-radius:50%;background:var(--status)}.ob-lite-status.is-offline{border-color:var(--border);background:var(--soft);color:var(--muted)}.ob-lite-status.is-offline:before{background:var(--muted)}.ob-lite-login{height:38px;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:8px;padding:0 16px;font-weight:650}.ob-lite-menu-btn{width:42px;height:38px;border:0;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px}.ob-lite-menu-btn span{width:26px;height:3px;border-radius:2px;background:currentColor;display:block}
    main{width:min(720px,100%);margin:0 auto;padding:clamp(28px,5vw,44px) 16px 72px}.ob-lite-hero{display:grid;grid-template-columns:minmax(180px,280px) minmax(0,1fr);gap:clamp(20px,5vw,54px);align-items:center;min-height:calc(100svh - 124px)}
    h1{font-size:clamp(34px,7vw,64px);line-height:1.02;letter-spacing:0;margin:0 0 14px;font-weight:560}h2{font-size:clamp(24px,4vw,34px);line-height:1.08;letter-spacing:0;margin:0 0 12px}p{color:var(--muted);line-height:1.6;margin:0 0 16px}.ob-lite-kicker{color:var(--status);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
    .ob-lite-photo{aspect-ratio:1;border-radius:22px;overflow:hidden;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:42px;font-weight:650;color:var(--text);box-shadow:var(--shadow)}.ob-lite-photo img{width:100%;height:100%;object-fit:cover}.ob-lite-photo.small{width:76px;height:76px;border-radius:14px;font-size:22px}.ob-lite-photo.large{width:min(320px,100%);margin:auto}
    .ob-lite-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}.ob-lite-primary,.ob-lite-secondary,.ob-lite-modal button,.ob-lite-service{border-radius:8px}.ob-lite-primary,.ob-lite-secondary{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;font-weight:650}.ob-lite-primary{background:var(--action);color:var(--action-text)}.ob-lite-secondary{border:1px solid var(--border);background:var(--surface);color:var(--text)}
    .ob-lite-section{padding:22px 0}.ob-lite-split{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(180px,.9fr);gap:36px;align-items:start}.ob-lite-services{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}.ob-lite-services.stacked{grid-template-columns:1fr}
    .ob-lite-service{width:100%;min-height:92px;border:1px solid var(--border);background:var(--surface);color:var(--text);display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;text-align:left;padding:14px 16px;cursor:pointer}.ob-lite-service:not(.is-disabled):hover{border-color:var(--action);transform:translateY(-1px)}.ob-lite-service.is-disabled{opacity:.54;cursor:default}.ob-lite-service-icon{width:44px;height:44px;border-radius:999px;background:var(--soft);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:650;color:var(--accent)}.ob-lite-service strong{display:block;font-size:16px;font-weight:600}.ob-lite-service small{display:block;color:var(--muted);line-height:1.45;margin-top:4px}.ob-lite-service em{font-style:normal;color:var(--action);font-size:13px;font-weight:600;white-space:nowrap}
    .ob-lite-profile{display:grid;grid-template-columns:76px minmax(0,1fr);gap:14px;align-items:center;margin-bottom:22px}.ob-lite-profile h2{margin:0 0 4px;font-weight:650}.ob-lite-profile p{font-size:13px;margin:0 0 6px}.ob-lite-stars{color:#f59e0b;font-weight:650;font-size:13px}.ob-lite-stars span{color:var(--text);margin-left:5px;font-weight:600}.ob-lite-book-head{max-width:760px}.ob-lite-book-head>h1{font-size:clamp(32px,6vw,42px);font-weight:360;line-height:1.12;margin-bottom:8px}.ob-lite-book-grid{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:14px;box-shadow:var(--shadow);display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:760px}
    .ob-lite-card{border:1px solid var(--border);background:var(--soft);color:var(--text);border-radius:12px;text-align:left;cursor:pointer;padding:15px 22px;min-height:78px}.ob-lite-card.is-disabled{cursor:default}.ob-lite-card:not(.is-disabled):hover{border-color:var(--action-border)}.ob-lite-card-title{display:block;font-size:16px;line-height:1.15;font-weight:600}.ob-lite-card-copy{display:block;color:var(--muted);font-size:14px;line-height:1.35;font-weight:500}.ob-lite-card-price{display:block;color:var(--action);font-size:15px;font-weight:600;white-space:nowrap}.ob-lite-free{display:inline-flex;align-items:center;justify-content:center;width:max-content;border-radius:999px;background:var(--action-soft);color:var(--action);font-size:13px;font-weight:600;padding:4px 10px;white-space:nowrap}.ob-lite-start{display:inline-flex;align-items:center;justify-content:center;background:var(--action);color:var(--action-text);border-radius:999px;font-size:15px;font-weight:650;min-width:116px;height:36px;white-space:nowrap}.ob-lite-card-chat{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"title price" "copy free" "copy start";gap:5px 16px;align-items:center;min-height:102px}.ob-lite-card-chat.is-disabled{grid-template-columns:1fr;grid-template-areas:"title" "copy";min-height:78px}.ob-lite-card-chat .ob-lite-card-title{grid-area:title}.ob-lite-card-chat .ob-lite-card-copy{grid-area:copy}.ob-lite-card-chat .ob-lite-card-price{grid-area:price;color:var(--text);font-size:16px}.ob-lite-card-chat .ob-lite-free{grid-area:free;justify-self:end}.ob-lite-card-chat .ob-lite-start{grid-area:start;justify-self:end}.ob-lite-card-live{display:grid;grid-template-columns:minmax(0,1fr) 58px;grid-template-areas:"title start" "price start" "free free";gap:8px 8px;align-items:center;min-height:92px}.ob-lite-card-live.is-disabled{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;min-height:76px}.ob-lite-card-live.is-disabled .ob-lite-card-title{color:var(--muted)}.ob-lite-card-live .ob-lite-card-title{grid-area:title;font-size:18px}.ob-lite-card-live .ob-lite-card-price{grid-area:price;color:var(--text);font-size:14px}.ob-lite-card-live .ob-lite-free{grid-area:free}.ob-lite-card-live .ob-lite-start{grid-area:start;min-width:58px;height:32px;font-size:13px}.ob-lite-card-written,.ob-lite-card-schedule{grid-column:1/-1;display:grid;grid-template-columns:44px minmax(0,1fr) auto;grid-template-areas:"badge title price" "badge copy price";gap:4px 12px;align-items:center;min-height:84px}.ob-lite-badge{grid-area:badge;width:42px;height:42px;border-radius:999px;border:1px solid var(--action-border);display:flex;align-items:center;justify-content:center;color:var(--action);font-size:12px;font-weight:600;background:var(--action-soft)}.ob-lite-badge-cal{border-color:var(--status-border);background:var(--status-soft);color:var(--status)}.ob-lite-card-written .ob-lite-card-title,.ob-lite-card-schedule .ob-lite-card-title{grid-area:title}.ob-lite-card-written .ob-lite-card-copy,.ob-lite-card-schedule .ob-lite-card-copy{grid-area:copy}.ob-lite-card-written .ob-lite-card-price,.ob-lite-card-schedule .ob-lite-card-price{grid-area:price;justify-self:end}.ob-lite-card-schedule .ob-lite-card-price{color:var(--status)}
    .ob-lite-unavailable{grid-column:1/-1;border:1px solid var(--border);background:var(--soft);border-radius:12px;padding:28px;text-align:center}.ob-lite-unavailable strong{display:block;font-size:26px;line-height:1.15;font-weight:600}.ob-lite-unavailable span{display:block;color:var(--muted);font-size:15px;line-height:1.55;margin-top:8px}
    .ob-lite-review,.ob-lite-contact{border:1px solid var(--border);background:var(--surface);border-radius:12px;padding:20px}.ob-lite-contact{display:grid;gap:12px}.ob-lite-contact div{border-top:1px solid var(--border);padding-top:12px}.ob-lite-contact strong{display:block}.ob-lite-contact span{display:block;color:var(--muted);margin-top:3px}
    .ob-lite-modal{position:fixed;inset:0;background:rgba(0,0,0,.62);display:none;align-items:center;justify-content:center;padding:16px;z-index:40}.ob-lite-modal.is-open{display:flex}.ob-lite-sheet{width:min(620px,100%);max-height:90svh;overflow:auto;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:14px;padding:22px;box-shadow:var(--shadow)}.ob-lite-sheet-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.ob-lite-close{border:1px solid var(--border);background:var(--bg);color:var(--text);width:40px;height:40px;font-weight:650}.ob-lite-field{display:grid;gap:6px;margin-top:12px}.ob-lite-field span{font-size:13px;font-weight:600}.ob-lite-field input,.ob-lite-field textarea,.ob-lite-field select{width:100%;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);padding:11px 12px;min-height:42px}.ob-lite-field textarea{min-height:92px;resize:vertical}.ob-lite-buckets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0}.ob-lite-bucket{border:1px solid var(--border);background:var(--bg);color:var(--text);padding:12px;border-radius:8px;text-align:left}.ob-lite-bucket.is-active{border-color:var(--action);box-shadow:inset 0 0 0 1px var(--action)}.ob-lite-submit{border:0;background:var(--action);color:var(--action-text);padding:12px 16px;font-weight:650;margin-top:16px}.ob-lite-note{font-size:13px;color:var(--muted);line-height:1.55;margin-top:10px}
    .ob-lite-footer{border-top:1px solid var(--action-soft);background:var(--bg);color:var(--muted);padding:36px 28px;font-size:15px;line-height:1.65}.ob-lite-footer-inner{width:min(720px,100%);margin:0 auto}
    @media(max-width:720px){.ob-lite-nav{padding:0 14px}.ob-lite-brand span{max-width:145px;font-size:15px}.ob-lite-links{left:10px;right:10px;width:auto}.ob-lite-status{padding:8px 12px}.ob-lite-login{padding:0 14px}.ob-lite-hero,.ob-lite-split{grid-template-columns:1fr;min-height:0}.ob-lite-photo{width:min(260px,100%);margin:0 auto}.ob-lite-services,.ob-lite-buckets{grid-template-columns:1fr}.ob-lite-service{grid-template-columns:38px minmax(0,1fr);min-height:86px}.ob-lite-service em{grid-column:2}.ob-lite-book-grid{border-radius:16px;grid-template-columns:1fr 1fr;padding:14px}.ob-lite-profile{grid-template-columns:62px minmax(0,1fr);gap:14px}.ob-lite-photo.small{width:62px;height:62px}.ob-lite-card{padding:14px 16px}.ob-lite-book-head>h1{font-size:34px}.ob-lite-start{height:34px}.ob-lite-card-live{padding:14px 12px}.ob-lite-card-live .ob-lite-start{min-width:58px;height:32px}}
    @media(max-width:420px){main{padding-left:14px;padding-right:14px}.ob-lite-card-chat{grid-template-columns:minmax(0,1fr) auto;gap:4px 12px}.ob-lite-card-live{grid-template-columns:minmax(0,1fr) 58px;gap:8px 8px}.ob-lite-card-price{font-size:14px}.ob-lite-card-copy{font-size:13px}.ob-lite-login{height:36px}.ob-lite-status{height:36px}.ob-lite-menu-btn{width:36px}}
  </style>
</head>
<body>
  <nav class="ob-lite-nav">
    <a class="ob-lite-brand" href="${esc(publicLitePath(route, 'home'))}">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<span>${esc(name)}</span></a>
    <div class="ob-lite-links">${nav}</div>
    <div class="ob-lite-nav-actions"><div class="ob-lite-status${online ? '' : ' is-offline'}">${esc(online ? 'LIVE' : 'OFFLINE')}</div><button class="ob-lite-login" type="button" onclick="location.href='/login'">Log In</button><button class="ob-lite-menu-btn" type="button" aria-label="Menu" onclick="obLiteToggleMenu()"><span></span><span></span><span></span></button></div>
  </nav>
  <main>${pageBodies[page]}</main>
  <footer class="ob-lite-footer"><div class="ob-lite-footer-inner">⚖️ ${esc(clean(wc.footer_disclaimer, 'Services are provided by the independent expert.'))}<br><br>© 2026 ${esc(name)} Readings.</div></footer>
  <div class="ob-lite-modal" id="ob-lite-modal" aria-hidden="true"><div class="ob-lite-sheet" role="dialog" aria-modal="true" aria-labelledby="ob-lite-modal-title"><div class="ob-lite-sheet-head"><div><h2 id="ob-lite-modal-title"></h2><p id="ob-lite-modal-copy"></p></div><button class="ob-lite-close" type="button" onclick="obLiteClose()">x</button></div><div id="ob-lite-modal-body"></div></div></div>
  <script>window.__OB_PUBLIC_LITE__=${safeScriptJson(config)};</script>
  <script>
  (function(){
    var cfg = window.__OB_PUBLIC_LITE__ || {};
    var modal = document.getElementById('ob-lite-modal');
    var title = document.getElementById('ob-lite-modal-title');
    var copy = document.getElementById('ob-lite-modal-copy');
    var body = document.getElementById('ob-lite-modal-body');
    function escHtml(v){return String(v == null ? '' : v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
    function open(t,c,h){title.textContent=t;copy.textContent=c || '';body.innerHTML=h || '';modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');}
    window.obLiteClose=function(){modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');};
    window.obLiteToggleMenu=function(){document.body.classList.toggle('ob-lite-menu-open');};
    document.querySelectorAll('.ob-lite-links a').forEach(function(link){link.addEventListener('click',function(){document.body.classList.remove('ob-lite-menu-open');});});
    modal.addEventListener('click',function(ev){if(ev.target===modal) window.obLiteClose();});
    window.addEventListener('keydown',function(ev){if(ev.key==='Escape') window.obLiteClose();});
    window.obLiteOpenLive=function(channel){
      var item = (cfg.live && cfg.live[channel]) || {};
      if(!item.enabled){open(item.label || 'Session', 'This option is unavailable right now.', '<p class="ob-lite-note">Choose another available option or check back later.</p>');return;}
      var detail = [item.price, item.free].filter(Boolean).join(' · ');
      open(item.label || 'Live session', detail, '<button class="ob-lite-submit" type="button" onclick="location.href='+JSON.stringify(cfg.fullHref)+'">Continue Securely</button><p class="ob-lite-note">Your account and payment step opens only after you continue.</p>');
    };
    window.obLiteOpenSchedule=function(){
      open('Book a live session', 'Choose a time in the secure booking flow.', '<button class="ob-lite-submit" type="button" onclick="location.href='+JSON.stringify(cfg.fullHref)+'">Continue Securely</button>');
    };
    window.obLiteSelectBucket=function(btn){document.querySelectorAll('.ob-lite-bucket').forEach(function(el){el.classList.remove('is-active');});btn.classList.add('is-active');};
    window.obLiteOpenWritten=function(){
      var od = cfg.onDemand || {};
      var buckets = (od.buckets || []).map(function(b,i){return '<button class="ob-lite-bucket '+(i?'':'is-active')+'" type="button" data-bucket="'+escHtml(b.id)+'" onclick="obLiteSelectBucket(this)"><strong>'+escHtml(b.label)+'</strong><span style="display:block;color:var(--muted);margin-top:4px">'+escHtml(b.price)+'</span></button>';}).join('');
      open(od.label || 'Written Reading', od.delivery || '', '<div class="ob-lite-buckets">'+buckets+'</div><label class="ob-lite-field"><span>Your question</span><textarea placeholder="What do you want answered?"></textarea></label><label class="ob-lite-field"><span>Context</span><textarea placeholder="Share the details '+escHtml(cfg.firstName || 'the expert')+' should know."></textarea></label><label class="ob-lite-field"><span>Email</span><input type="email" autocomplete="email" placeholder="you@example.com"></label><button class="ob-lite-submit" type="button" onclick="obLiteWrittenReady()">Continue to Payment</button><p class="ob-lite-note">Payment opens after the client account step.</p>');
    };
    window.obLiteWrittenReady=function(){open('Continue to payment', 'The written request is ready for the secure checkout step.', '<button class="ob-lite-submit" type="button" onclick="location.href='+JSON.stringify(cfg.fullHref)+'">Continue Securely</button>');};
  })();
  </script>
</body>
</html>`;
}

function publicFirstPaintShell(expertResult, req, onDemandResult) {
  const expert = expertResult && expertResult.expert;
  const slug = clean(expert && (expert.slug || expertResult.slug));
  if (!publicFirstPaintEnabled(slug) || !expert || !(expert.name || expert.slug)) return '';

  const wc = websiteContent(expert);
  const tokens = wc.design_tokens || {};
  const page = publicFirstPaintPage(req, expertResult.route);
  const isBook = page === 'book';
  const name = clean(expert.name, 'Expert');
  const title = clean(expert.title || expert.category || expert.specialty || expert.tagline || expert.subtitle, 'Expert');
  const logo = whiteLabelAssetUrl(wc.logo_image || expert.logo_url || wc.profile_image || expert.avatar_url || '', 'https://ownlybiz.com');
  const profileImage = whiteLabelAssetUrl(
    expert.photo_url || expert.profile_photo || expert.avatar_url || expert.image_url || expert.photo || expert.photoUrl || wc.profile_image || expert.logo_url || wc.logo_image || '',
    'https://ownlybiz.com'
  );
  const bg = safeHex(tokens.background, wc.site_mode === 'dark' ? '#101112' : '#f7f1e8');
  const surface = safeHex(tokens.surface, wc.site_mode === 'dark' ? '#1c1a18' : '#fffdf8');
  const text = safeHex(tokens.text, wc.site_mode === 'dark' ? '#f8f3ea' : '#241a15');
  const accent = safeHex(tokens.accent || expert.theme_color, '#b38b59');
  const action = safeHex(tokens.action, accent);
  const status = safeHex(tokens.status, '#b7f36b');
  const muted = wc.site_mode === 'dark' ? 'rgba(248,243,234,.72)' : '#6b5b4f';
  const border = wc.site_mode === 'dark' ? 'rgba(248,243,234,.14)' : 'rgba(36,26,21,.12)';
  const online = Number(expert.is_online) === 1 || expert.is_online === true;
  const paid = ![false, 0, '0', 'false', 'off', 'no'].includes(expert.payments_enabled);
  const statusText = online ? 'LIVE' : 'OFFLINE';
  const statusColor = online ? status : '#9ca3af';
  const disabledCopy = !paid
    ? 'This expert is not accepting paid sessions yet.'
    : online
      ? 'The live page is almost ready.'
      : `${name} is offline right now.`;
  const chatLabel = paid && online && ![false, 0, '0'].includes(expert.chat_enabled) ? 'Start soon' : 'Unavailable now';
  const voiceLabel = paid && online && ![false, 0, '0'].includes(expert.voice_enabled) ? 'Available soon' : 'Unavailable now';
  const videoLabel = paid && online && ![false, 0, '0'].includes(expert.video_enabled) ? 'Available soon' : 'Unavailable now';
  const rating = Number(expert.avg_rating) > 0
    ? `${Number(expert.avg_rating).toFixed(1)} star${Number(expert.review_count) ? ` &middot; ${Number(expert.review_count)} ratings` : ''}`
    : 'New expert';
  const image = profileImage
    ? `<img src="${esc(profileImage)}" alt="" loading="eager" decoding="async">`
    : `<span>${initials(name)}</span>`;
  const unavailableCard = `
        <div class="ob-pfp-unavailable">
          <strong>Sessions are not available yet</strong>
          <span>This expert is not accepting paid sessions yet. Please check back later.</span>
        </div>`;
  const onDemand = onDemandResult && onDemandResult.available && Array.isArray(onDemandResult.buckets)
    ? {
      label: clean(onDemandResult.settings && onDemandResult.settings.public_label, 'Written Reading'),
      price: onDemandResult.buckets.length ? money(onDemandResult.buckets[0].price_cents, '') : '',
    }
    : null;
  const hero = isBook
    ? `
      <section class="ob-pfp-profile">
        <div class="ob-pfp-avatar">${image}</div>
        <div>
          <h2>${esc(name)}</h2>
          <p>${esc(title)}</p>
          <div class="ob-pfp-rating">★★★★★ <span>${rating}</span></div>
        </div>
      </section>
      <section class="ob-pfp-book">
        <h1>How would you like to connect?</h1>
        <p>Start now, send a private written question, or reserve time for later.</p>
        ${!paid ? unavailableCard : `<div class="ob-pfp-card">
          <div class="ob-pfp-row ob-pfp-chat">
            <div><strong>Chat with ${esc(name)} now</strong><span>Private live text session</span></div>
            <div class="ob-pfp-price">${esc(money(expert.rate_chat || expert.chat_pm, '$3.50/min'))}</div>
            <button type="button" disabled>${esc(chatLabel)}</button>
          </div>
          <div class="ob-pfp-grid">
            <div><strong>Call</strong><span>${esc(voiceLabel)}</span></div>
            <div><strong>Video</strong><span>${esc(videoLabel)}</span></div>
          </div>
          ${onDemand ? `<div class="ob-pfp-row">
            <div class="ob-pfp-cal">WR</div>
            <div><strong>${esc(onDemand.label)}</strong><span>Private written answer${onDemand.price ? ` from ${esc(onDemand.price)}` : ''}</span></div>
            <em>Ask</em>
          </div>` : ''}
          <div class="ob-pfp-row">
            <div class="ob-pfp-cal">CAL</div>
            <div><strong>Book a live session</strong><span>${esc(disabledCopy)}</span></div>
            <em>Schedule</em>
          </div>
        </div>`}
      </section>`
    : `
      <section class="ob-pfp-hero">
        <div class="ob-pfp-avatar large">${image}</div>
        <h1>${esc(name)}</h1>
        <p>${esc(wc.hero_tagline || expert.hero_tagline || title)}</p>
      </section>`;
  return `
<style id="ob-public-first-paint-style">
html.ob-public-first-paint body,
html.ob-public-first-paint.ob-route-loading body{opacity:1!important;background:${bg}!important}
html.ob-public-first-paint.ob-public-shell-guard.ob-public-loading:before{display:none!important}
html.ob-public-first-paint.ob-public-shell-guard.ob-public-loading #views-container,
html.ob-public-first-paint.ob-public-loading #view-4{visibility:visible!important}
#ob-public-first-paint-shell{position:fixed;inset:0;z-index:2147483645;min-height:100vh;overflow:auto;background:${bg};color:${text};font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#ob-public-first-paint-shell *{box-sizing:border-box}
#ob-public-first-paint-shell .ob-pfp-nav{height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 40px;border-bottom:1px solid ${border};background:${bg}}
#ob-public-first-paint-shell .ob-pfp-brand{display:flex;align-items:center;gap:10px;min-width:0;font-weight:900}
#ob-public-first-paint-shell .ob-pfp-brand img{width:32px;height:32px;border-radius:8px;object-fit:cover}
#ob-public-first-paint-shell .ob-pfp-brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ob-public-first-paint-shell .ob-pfp-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
#ob-public-first-paint-shell .ob-pfp-pill{border:1px solid ${border};border-radius:999px;padding:6px 10px;color:${statusColor};font-size:12px;font-weight:900}
#ob-public-first-paint-shell .ob-pfp-login{border:1px solid ${border};border-radius:8px;background:${surface};color:${text};font-size:12px;font-weight:700;min-width:auto;padding:7px 14px;line-height:1;opacity:1}
#ob-public-first-paint-shell .ob-pfp-menu{width:36px;height:32px;display:flex;flex-direction:column;justify-content:center;gap:5px;padding:7px;background:transparent;border:0}
#ob-public-first-paint-shell .ob-pfp-menu span{display:block;width:22px;height:2px;border-radius:2px;background:${text}}
#ob-public-first-paint-shell main{max-width:720px;margin:0 auto;padding:clamp(24px,4vw,42px) 16px 64px}
#ob-public-first-paint-shell .ob-pfp-profile{display:grid;grid-template-columns:76px minmax(0,1fr);gap:14px;align-items:center;margin:0 0 20px;color:${text}}
#ob-public-first-paint-shell .ob-pfp-avatar{width:76px;height:76px;border-radius:14px;overflow:hidden;background:${surface};border:1px solid ${accent};display:flex;align-items:center;justify-content:center;color:${text};font-weight:900;font-size:22px;flex:0 0 auto}
#ob-public-first-paint-shell .ob-pfp-avatar.large{width:132px;height:132px;margin:0 auto 18px;border-radius:22px;font-size:34px}
#ob-public-first-paint-shell .ob-pfp-avatar img{width:100%;height:100%;object-fit:cover}
#ob-public-first-paint-shell h1{font-size:clamp(28px,5vw,34px);line-height:1.08;margin:0 0 6px;letter-spacing:0;font-weight:500}
#ob-public-first-paint-shell h2{font-size:clamp(22px,4vw,30px);line-height:1.08;margin:0;letter-spacing:0;font-weight:950}
#ob-public-first-paint-shell p{margin:0;color:${muted};line-height:1.42}
#ob-public-first-paint-shell .ob-pfp-profile p{font-size:13px;line-height:1.35;margin-top:4px;font-weight:650}
#ob-public-first-paint-shell .ob-pfp-book>p{max-width:560px;margin:0 0 14px}
#ob-public-first-paint-shell .ob-pfp-rating{margin-top:8px;color:${accent};font-size:13px;line-height:1.25;font-weight:850}
#ob-public-first-paint-shell .ob-pfp-rating span{color:${text};margin-left:6px}
#ob-public-first-paint-shell .ob-pfp-card{margin-top:18px;background:${surface};border:1px solid ${border};border-radius:18px;padding:14px;box-shadow:0 24px 80px rgba(0,0,0,.22)}
#ob-public-first-paint-shell .ob-pfp-unavailable{margin:8px auto 0;background:${surface};border:1px solid ${border};border-radius:8px;padding:28px;text-align:center;max-width:560px;box-shadow:0 24px 80px rgba(0,0,0,.18)}
#ob-public-first-paint-shell .ob-pfp-unavailable strong{font-size:28px;line-height:1.12;font-weight:500}
#ob-public-first-paint-shell .ob-pfp-unavailable span{display:block;color:${muted};font-size:16px;line-height:1.65;margin:10px auto 0;max-width:560px}
#ob-public-first-paint-shell .ob-pfp-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:12px;border:1px solid ${border};border-radius:12px;padding:14px 16px;margin-bottom:10px;background:rgba(255,255,255,.03)}
#ob-public-first-paint-shell .ob-pfp-row:last-child{margin-bottom:0;grid-template-columns:auto minmax(0,1fr) auto}
#ob-public-first-paint-shell strong{display:block;color:${text};font-size:16px}
#ob-public-first-paint-shell .ob-pfp-row span,#ob-public-first-paint-shell .ob-pfp-grid span{display:block;color:${muted};font-size:13px;margin-top:4px}
#ob-public-first-paint-shell .ob-pfp-price{font-weight:900;color:${text};white-space:nowrap}
#ob-public-first-paint-shell button{border:0;border-radius:999px;background:${action};color:${bg};font-weight:900;min-width:130px;padding:11px 18px;opacity:.82}
#ob-public-first-paint-shell .ob-pfp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
#ob-public-first-paint-shell .ob-pfp-grid>div{border:1px solid ${border};border-radius:12px;padding:13px 16px;background:rgba(255,255,255,.025)}
#ob-public-first-paint-shell .ob-pfp-cal{width:38px;height:38px;border-radius:999px;background:${accent};color:${bg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900}
#ob-public-first-paint-shell em{font-style:normal;color:${status};font-size:13px;font-weight:900}
#ob-public-first-paint-shell .ob-pfp-hero{text-align:center;padding-top:30px}
#ob-public-first-paint-shell.is-hiding{opacity:0;transition:opacity .16s ease}
@media(max-width:620px){#ob-public-first-paint-shell .ob-pfp-nav{height:60px;padding:0 16px}#ob-public-first-paint-shell .ob-pfp-brand{max-width:130px;font-size:14px}#ob-public-first-paint-shell main{padding:24px 14px 52px}#ob-public-first-paint-shell .ob-pfp-profile{grid-template-columns:62px minmax(0,1fr);gap:12px;margin-bottom:18px}#ob-public-first-paint-shell .ob-pfp-avatar{width:62px;height:62px;border-radius:12px;font-size:22px}#ob-public-first-paint-shell .ob-pfp-profile p{font-size:12px}#ob-public-first-paint-shell .ob-pfp-rating{font-size:12px}#ob-public-first-paint-shell .ob-pfp-row{grid-template-columns:minmax(0,1fr);align-items:start}#ob-public-first-paint-shell .ob-pfp-card button{width:100%}}
</style>
<div id="ob-public-first-paint-shell" data-slug="${esc(slug)}" aria-live="polite">
  <nav class="ob-pfp-nav"><div class="ob-pfp-brand">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<span>${esc(name)}</span></div><div class="ob-pfp-actions"><div class="ob-pfp-pill">${statusText}</div><button type="button" class="ob-pfp-login">Log In</button><div class="ob-pfp-menu" aria-hidden="true"><span></span><span></span><span></span></div></div></nav>
  <main>${hero}</main>
</div>`;
}

function injectPublicFirstPaintShell(html, expertResult, req, onDemandResult) {
  const shell = publicFirstPaintShell(expertResult, req, onDemandResult);
  if (!shell) return html;
  html = addHtmlClass(html, 'ob-public-first-paint');
  if (/<body([^>]*)>/i.test(html)) return html.replace(/<body([^>]*)>/i, `<body$1>\n${shell}`);
  return shell + html;
}

function websiteContent(expert) {
  const raw = expert && expert.website_content;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function expertFaviconUrl(expert, req, host, origin) {
  const wc = websiteContent(expert);
  const direct = wc.favicon_image || wc.logo_image || expert.logo_url || wc.profile_image || expert.avatar_url || '';
  const whitelabeled = whiteLabelAssetUrl(direct, origin);
  if (whitelabeled) return whitelabeled;
  const cleanPath = pathOnly(req).replace(/^\/+|\/+$/g, '');
  const slug = cleanExpertSlug(expert.slug || '');
  const qs = new URLSearchParams({
    host: normalizeDomain(host, true),
    path: cleanPath,
  });
  if (slug) qs.set('slug', slug);
  return `${origin}/api/experts/favicon?${qs.toString()}`;
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
  const isExpert = !!expert;
  const origin = `https://${host || 'ownlybiz.com'}`;
  const canonical = origin + pathOnly(req);
  const iconRequestPath = pathOnly(req).toLowerCase();

  if (iconRequestPath === '/favicon.ico' || iconRequestPath === '/favicon.png' || iconRequestPath === '/apple-touch-icon.png') {
    res.setHeader('Location', expert ? expertFaviconUrl(expert, req, host, origin) : '/favicon.svg');
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    res.status(302).end();
    return;
  }

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

  if (isExpert && expert && publicLiteEnabled(expert.slug || expertResult.slug) && !queryFlag(req, 'full')) {
    const preloadOnDemand = await fetchCachedPublicOnDemand(expert.slug || expertResult.slug);
    const html = renderPublicLitePage(expertResult, req, host, preloadOnDemand);
    if (html) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex,follow');
      res.setHeader('X-Ownlybiz-Public-Lite', clean(expert.slug || expertResult.slug));
      res.status(200).send(html);
      return;
    }
  }

  let html = readIndex();
  let statusCode = 200;
  if (isExpert) {
    const preloadOnDemand = publicFirstPaintEnabled(clean(expert && (expert.slug || expertResult.slug)))
      && publicFirstPaintPage(req, route) === 'book'
      ? await fetchCachedPublicOnDemand(expert.slug || expertResult.slug)
      : null;
    html = whiteLabelExpertShell(html);
    html = injectPublicExpertPreload(html, expertResult, host, preloadOnDemand);
    html = injectPublicFirstPaintShell(html, expertResult, req, preloadOnDemand);
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
    html = setFavicon(html, expertFaviconUrl(expert, req, host, origin));
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
    const seo = platformMarketingSeo(pathOnly(req));
    html = injectSeo(html, {
      title: seo.title,
      description: seo.description,
      canonical: `https://ownlybiz.com${seo.canonicalPath}`,
      robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
      image: '',
    });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(statusCode).send(html);
};
