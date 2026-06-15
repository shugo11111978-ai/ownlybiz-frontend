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
const PUBLIC_FIRST_PAINT_SLUGS = new Set(['lunapsychics2']);

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

function cleanExpertSlug(value) {
  const slug = clean(value).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) return '';
  return RESERVED.has(slug) ? '' : slug;
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

async function resolveExpert(req, host) {
  const route = routeFromRequest(req, host);
  let slug = route.slug;

  if (!slug && route.kind === 'custom-domain') {
    const lookup = await fetchJson(`${BACKEND}/api/domains/lookup?domain=${encodeURIComponent(host)}`);
    slug = clean(lookup && lookup.slug) || CUSTOM_DOMAIN_SLUG_FALLBACKS[host] || '';
  }
  if (!slug) return null;

  const profileUrl = `${BACKEND}/api/experts/${encodeURIComponent(slug)}`;
  const profileTtl = PUBLIC_FIRST_PAINT_SLUGS.has(slug) ? 300000 : 30000;
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

function injectPublicExpertPreload(html, expertResult, host) {
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
  const firstPaint = PUBLIC_FIRST_PAINT_SLUGS.has(payload.slug)
    ? `window.__OB_PUBLIC_FIRST_PAINT__={slug:${safeScriptJson(payload.slug)}};`
    : '';
  const script = `<script id="ob-public-expert-preload">${firstPaint}window.__OB_PRELOADED_EXPERT__=${safeScriptJson(payload)};</script>`;
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

function publicFirstPaintShell(expertResult, req) {
  const expert = expertResult && expertResult.expert;
  const slug = clean(expert && (expert.slug || expertResult.slug));
  if (!PUBLIC_FIRST_PAINT_SLUGS.has(slug) || !expert || !(expert.name || expert.slug)) return '';

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
#ob-public-first-paint-shell{position:relative;z-index:2147483645;min-height:100vh;background:${bg};color:${text};font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
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

function injectPublicFirstPaintShell(html, expertResult, req) {
  const shell = publicFirstPaintShell(expertResult, req);
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
  const isExpert = !!expertResult;
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

  let html = readIndex();
  let statusCode = 200;
  if (isExpert) {
    html = whiteLabelExpertShell(html);
    html = injectPublicExpertPreload(html, expertResult, host);
    html = injectPublicFirstPaintShell(html, expertResult, req);
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
