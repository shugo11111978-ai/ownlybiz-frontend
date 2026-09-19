'use strict';

// Shared public delivery boundary. Never send browser credentials upstream or
// fall back from one host/slug to another expert when resolution fails.
const RESERVED = new Set(['', 'index.html', 'admin', 'api', 'app', 'auth', 'billing', 'checkout', 'connect', 'dash', 'signup', 'dashboard', 'login', 'logout', 'expert', 'session', 'mini-suite', 'group', 'connectors', 'settings', 'messages', 'analytics', 'payment', 'payments', 'packages', 'reviews', 'clients', 'sessions', 'pricing', 'how', 'features', 'experts', 'blog', 'contact', 'support', 'help', 'terms', 'legal', 'privacy', 'reset', 'reset-password', 'stripe', 'verify', 'verify-email', 'wallet', 'assets', 'data', '.well-known', 'robots.txt', 'sitemap.xml', 'llms.txt', 'favicon.ico', 'favicon.svg', 'favicon.png', 'apple-touch-icon.png']);
const UTILITY = new Set(['admin', 'api', 'app', 'auth', 'billing', 'checkout', 'connect', 'dash', 'signup', 'dashboard', 'login', 'logout', 'expert', 'session', 'mini-suite', 'group', 'connectors', 'settings', 'messages', 'analytics', 'payment', 'payments', 'packages', 'clients', 'sessions', 'support', 'help', 'reset', 'reset-password', 'stripe', 'verify', 'verify-email', 'wallet', 'account', 'assets', 'data', '.well-known', 'legal', 'terms', 'privacy']);
const CORE = ['home', 'about', 'services', 'reviews', 'book', 'contact'];
const LABELS = { home: 'Home', about: 'About', services: 'Services', reviews: 'Reviews', book: 'Book a Session', contact: 'Contact' };
const text = value => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
function parseObject(value) { if (object(value)) return value; try { const parsed = JSON.parse(value); return object(parsed) ? parsed : {}; } catch (_) { return {}; } }
function flag(value, fallback = false) { return value == null || value === '' ? fallback : !['0', 'false', 'off', 'no', 'disabled'].includes(text(value).toLowerCase()); }
function normalizeDomain(value) {
  const host = text(value).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/\.+$/, '');
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host) ? host : '';
}
function hostFromReq(req = {}) { const headers = req.headers || {}; return text(String(headers['x-forwarded-host'] || headers.host || '').split(',')[0]).toLowerCase().replace(/:\d+$/, '').replace(/\.+$/, ''); }
function isPlatformHost(host) {
  return !host || ['ownlybiz.com', 'www.ownlybiz.com', 'localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(host) || /\.vercel\.app$/.test(host) || /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(host);
}
// Reserved platform paths are a routing rule, not a tenant identity rule.
// Existing published tenants may legitimately use such slugs on dedicated
// hosts or an explicit expert query; routeFromRequest protects platform paths.
function cleanSlug(value) { const slug = text(value).toLowerCase(); return /^[a-z0-9][a-z0-9-]{1,62}$/.test(slug) ? slug : ''; }
function pathParts(req) {
  try {
    const raw = String(req.url || '/').split('?')[0];
    return raw.split('/').filter(Boolean).map(part => { const decoded = decodeURIComponent(part); if (/[\/\\\u0000]/.test(decoded)) throw new Error('Invalid path segment'); return decoded; });
  } catch (_) { return null; }
}
function params(req) { return new URLSearchParams(String(req.url || '').split('?').slice(1).join('?')); }
function routeFromRequest(req, host = hostFromReq(req)) {
  const parts = pathParts(req);
  const sub = host.match(/^([a-z0-9-]+)\.ownlybiz\.com$/);
  if (sub && sub[1] !== 'www') return { kind: 'subdomain', slug: cleanSlug(sub[1]) };
  if (!isPlatformHost(host)) return { kind: 'custom-domain', slug: '' };
  // Protected platform paths take precedence over query-selected experts.
  if (parts && UTILITY.has((parts[0] || '').toLowerCase())) return { kind: 'platform', slug: '' };
  const querySlug = cleanSlug(params(req).get('expert'));
  if (querySlug) return { kind: 'query', slug: querySlug };
  const first = parts && (parts[0] || '').toLowerCase();
  if (first && !RESERVED.has(first)) return { kind: 'platform-path', slug: cleanSlug(first) };
  return { kind: 'platform', slug: '' };
}
function expertParts(req, route) { const parts = pathParts(req); return parts && route && route.kind === 'platform-path' ? parts.slice(1) : parts; }
function isUtilityRequest(req, host = hostFromReq(req), route = routeFromRequest(req, host)) {
  if (req.method && !['GET', 'HEAD'].includes(String(req.method).toUpperCase())) return true;
  const parts = expertParts(req, route);
  if (parts && UTILITY.has((parts[0] || '').toLowerCase())) return true;
  return false;
}
function publishedExpert(expert) {
  return object(expert) && !!cleanSlug(expert.slug) && flag(expert.website_published) &&
    flag(expert.is_active, true) && !['suspended', 'disabled', 'deleted', 'rejected', 'pending'].includes(text(expert.status).toLowerCase()) &&
    (!expert.approval_status || text(expert.approval_status).toLowerCase() === 'approved');
}

// Explicit schemas retain the existing public rendering/booking contract while
// leaving login credentials, account emails, editor history and draft pages out.
function pick(source, fields) { const result = {}; if (!object(source)) return result; for (const key of fields) if (source[key] !== undefined) result[key] = source[key]; return result; }
const SECTION_FIELDS = ['id', 'target_page', 'type', 'title', 'heading', 'body', 'items', 'cta_label', 'cta_page', 'image_url', 'image_alt'];
const PAGE_FIELDS = ['id', 'slug', 'title', 'nav_label', 'summary', 'header_image_url', 'cta_label', 'cta_page', 'template', 'presentation', 'published', 'show_in_nav', 'meta_title', 'meta_description'];
const WEBSITE_FIELDS = ['schema_version', 'document_schema_version', 'version', 'template_id', 'site_template', 'template_version', 'renderer_family', 'name', 'profile_name', 'logo_text', 'title', 'bio', 'short_intro', 'specialty', 'primary_specialty', 'hero_tagline', 'hero_cta', 'final_cta_title', 'final_cta_description', 'entity_type', 'footer_disclaimer', 'site_mode', 'site_layout', 'design_tokens', 'pages', 'contact_email', 'contact_heading', 'contact_desc', 'contact_location', 'contact_hours', 'contact_response', 'nav_labels', 'about_title', 'about_subtitle', 'svc_title', 'svc_subtitle', 'svc_chat_desc', 'svc_voice_desc', 'svc_video_desc', 'profile_image', 'logo_image', 'favicon_image', 'social_share_image', 'about_image', 'services_image', 'reviews_image', 'contact_image', 'hero_image', 'hero_image_url', 'font_family', 'button_style', 'meta_title', 'meta_description', 'allow_indexing', 'ga4_id', 'gtm_id', 'meta_pixel_id'];
const EXPERT_FIELDS = ['id', 'user_id', 'slug', 'name', 'display_name', 'business_name', 'title', 'bio', 'about_text', 'hero_tagline', 'footer_text', 'credentials', 'theme_color', 'theme_preset', 'website_published', 'website_published_at', 'avatar_url', 'logo_url', 'og_image_url', 'location', 'language', 'timezone', 'tags', 'social_links', 'rate_chat', 'rate_voice', 'rate_video', 'chat_pm', 'voice_pm', 'video_pm', 'free_minutes', 'chat_free_min', 'voice_free_min', 'video_free_min', 'chat_free_min_available', 'voice_free_min_available', 'video_free_min_available', 'free_minutes_available', 'avg_rating', 'review_count', 'session_count', 'is_online', 'accept_offline', 'payments_enabled', 'chat_enabled', 'voice_enabled', 'video_enabled', 'credit_amounts', 'credit_enabled', 'credit_no_expiration', 'meta_title', 'meta_description', 'allow_indexing', 'ga4_id', 'gtm_id', 'meta_pixel_id', 'privacy_notice', 'privacy_cookie_banner_enabled', 'privacy_contact_email'];
const MINI_FIELDS = ['id', 'owner_expert_id', 'display_name', 'name', 'title', 'bio', 'avatar_url', 'photo_url', 'profile_photo', 'image_url', 'photo', 'photoUrl', 'picture_url', 'image', 'specialty', 'suite_enabled', 'status', 'is_online', 'sort_order', 'chat_enabled', 'voice_enabled', 'video_enabled', 'book_later_enabled', 'on_demand_enabled', 'packages_enabled', 'ai_enabled', 'chat_pm', 'voice_pm', 'video_pm', 'chat_free_min', 'voice_free_min', 'video_free_min', 'timezone', 'availability', 'rating', 'avg_rating', 'average_rating', 'rating_count', 'ratings_count', 'review_count', 'session_count', 'readings_count', 'reading_count', 'sessions_count', 'completed_sessions', 'on_demand_price', 'private_question_price', 'request_price', 'written_price'];
const MARKET_SETTINGS = ['expert_id', 'enabled', 'public_label', 'intro_text', 'allow_chat', 'allow_voice', 'allow_video', 'allow_book_later', 'allow_on_demand', 'allow_packages', 'allow_ai', 'allow_independent_availability', 'free_minutes_policy'];
const PACKAGE_FIELDS = ['id', 'name', 'description', 'price', 'duration_min', 'channel', 'currency', 'is_active', 'sort_order'];
const REVIEW_FIELDS = ['id', 'rating', 'comment', 'is_visible', 'status', 'reviewer_name', 'reviewer_title', 'client_name', 'client_avatar', 'source', 'is_verified_session', 'expert_reply', 'expert_reply_at', 'created_at'];
const AVAILABILITY_FIELDS = ['id', 'expert_id', 'day_of_week', 'start_time', 'end_time', 'is_active', 'timezone'];
const PAUSE_FIELDS = ['blocked', 'allowed', 'reason', 'message', 'client_message', 'code', 'paused', 'is_paused', 'paused_until', 'resumes_at'];
const PRIVATE_KEYS = new Set(['__proto__', 'constructor', 'prototype', 'token', 'access_token', 'refresh_token', 'auth_token', 'api_key', 'login_email', 'account_email', 'suite_email', 'client_email', 'private_email', 'email_from', 'email_from_address', 'email_provider', 'stripe_account_id', 'tax_id', 'session_id', 'customer_id', 'email']);
function sanitizeData(value, depth = 0) {
  if (depth > 20) return null;
  if (value == null || ['boolean', 'number', 'string'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(item => sanitizeData(item, depth + 1));
  if (!object(value)) return undefined;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (PRIVATE_KEYS.has(key.toLowerCase()) || /password|secret|(?:^|_)(?:internal|draft|history|revision)(?:_|$)/i.test(key)) continue;
    result[key] = sanitizeData(item, depth + 1);
  }
  return result;
}
function customPageIsPublished(page) {
  if (!object(page) || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(text(page.slug)) || !flag(page.published, true)) return false;
  // Match the existing public AI renderer's eligibility rules. A page called
  // "New Page" can still be meaningful authored content; title alone is not a
  // publication decision. The runtime and backend both support 64-char slugs.
  const chunks = [page.slug, page.title, page.nav_label, page.summary, page.cta_label];
  for (const section of Array.isArray(page.sections) ? page.sections : []) {
    chunks.push(section && (section.title || section.heading), section && section.body);
    for (const item of Array.isArray(section && section.items) ? section.items : []) chunks.push(item);
  }
  const copy = chunks.map(text).filter(Boolean).join(' ');
  if (/\b(fuck|shit|bitch|cunt|dick|pussy|ass|asshole)\b/i.test(copy)) return false;
  if (/write the (?:main page|full article) (?:content )?here|a short introduction that tells visitors|step 1: describe the first useful action|resource or note 1|use each line below for one question/i.test(copy)) return false;
  const normalized = copy.toLowerCase().replace(/\bnew page\b/g, '').replace(/\bpage\b/g, '').replace(/\bcopy\b/g, '').replace(/\ba short subtitle for this page\b/g, '').replace(/\s+/g, ' ').trim();
  return !(/^new-page(?:-\d+)?(?:-copy)*$/i.test(page.slug) && normalized.length < 36);
}
function publicWebsiteContent(value) {
  const source = parseObject(value);
  const result = pick(source, WEBSITE_FIELDS);
  result.ai_pages = (Array.isArray(source.ai_pages) ? source.ai_pages : []).filter(customPageIsPublished).map(page => ({ ...pick(page, PAGE_FIELDS), sections: (Array.isArray(page.sections) ? page.sections : []).map(section => pick(section, SECTION_FIELDS)) }));
  const published = new Set(CORE.concat(result.ai_pages.map(page => page.slug)));
  result.ai_sections = (Array.isArray(source.ai_sections) ? source.ai_sections : []).filter(section => !section.target_page || published.has(section.target_page)).map(section => pick(section, SECTION_FIELDS));
  return sanitizeData(result);
}
function publicMarketplace(value) {
  const source = parseObject(value);
  return sanitizeData({ enabled: flag(source.enabled), settings: pick(source.settings, MARKET_SETTINGS), experts: (Array.isArray(source.experts) ? source.experts : []).filter(mini => !mini.status || mini.status === 'active').map(mini => pick(mini, MINI_FIELDS)) });
}
function publicOnDemand(value) {
  const source = parseObject(value);
  // All nested fields originate from the existing public on-demand contract;
  // discard transport/account credentials defensively without changing offers.
  const result = pick(source, ['available', 'expert', 'settings', 'buckets', 'unavailable_reason']);
  if (object(result.settings)) {
    result.settings = { ...result.settings };
    for (const key of ['email_from_address', 'email_provider', 'email_tested_at', 'updated_by', 'created_at', 'updated_at']) delete result.settings[key];
  }
  return sanitizeData(result);
}
function publicExpertProjection(expert) {
  const result = pick(expert, EXPERT_FIELDS);
  if (expert && expert.website_content !== undefined) result.website_content = publicWebsiteContent(expert.website_content);
  if (expert && expert.primary_domain) result.primary_domain = pick(expert.primary_domain, ['custom_domain', 'domain', 'url', 'verified', 'active']);
  if (expert && expert.service_pause) result.service_pause = pick(expert.service_pause, PAUSE_FIELDS);
  if (expert && expert.marketplace_public) result.marketplace_public = publicMarketplace(expert.marketplace_public);
  if (expert && expert.on_demand_public) result.on_demand_public = publicOnDemand(expert.on_demand_public);
  if (Array.isArray(expert && expert.packages)) result.packages = expert.packages.map(item => pick(item, PACKAGE_FIELDS));
  return sanitizeData(result);
}
function publicProfileProjection(profile) {
  const expert = profile && (profile.expert || profile);
  const result = { expert: publicExpertProjection(expert) };
  if (Array.isArray(profile && profile.reviews)) result.reviews = profile.reviews.filter(review => flag(review.is_visible, true) && (!review.status || review.status === 'published')).map(review => pick(review, REVIEW_FIELDS));
  if (Array.isArray(profile && profile.packages)) result.packages = profile.packages.map(item => pick(item, PACKAGE_FIELDS));
  if (Array.isArray(profile && profile.availability)) result.availability = profile.availability.map(item => pick(item, AVAILABILITY_FIELDS));
  if (profile && profile.credit) result.credit = pick(profile.credit, ['enabled', 'amounts', 'no_expiration']);
  if (profile && profile.service_pause) result.service_pause = pick(profile.service_pause, PAUSE_FIELDS);
  if (profile && profile.marketplace) result.marketplace = publicMarketplace(profile.marketplace);
  return sanitizeData(result);
}
function primaryDomainFromExpert(expert) {
  const primary = expert && expert.primary_domain || {};
  if (!flag(primary.active, true)) return '';
  return normalizeDomain(primary.custom_domain || primary.domain || primary.url || '').replace(/^www\./, '');
}
function publicOrigin(expert, host) { const primary = primaryDomainFromExpert(expert); if (primary) return `https://${primary}`; if (!isPlatformHost(host) && normalizeDomain(host)) return `https://${normalizeDomain(host)}`; return `https://ownlybiz.com/${cleanSlug(expert && expert.slug)}`; }
function allowIndexing(expert) { return flag(expert && expert.allow_indexing, true); }
function publishedPublicPages(expert) {
  const content = publicWebsiteContent(expert && expert.website_content);
  const name = text(expert && (expert.name || expert.display_name)) || 'Independent expert';
  const defaultDescription = text(expert && (expert.meta_description || expert.hero_tagline || expert.bio || expert.about_text || expert.title));
  const pages = CORE.filter(page => !['about', 'services', 'reviews', 'contact'].includes(page) || flag(content.pages && content.pages[page], true)).map(page => ({ kind: 'public', page, canonicalPath: page === 'home' ? '/' : `/${page}`, showInNav: true, label: text(content.nav_labels && content.nav_labels[page]) || LABELS[page], title: page === 'home' ? text(expert && expert.meta_title) || name : `${LABELS[page]} | ${name}`, description: defaultDescription, content: page === 'home' ? content : undefined }));
  const paths = new Set(pages.map(page => page.canonicalPath));
  for (const custom of content.ai_pages) {
    const route = `/${custom.slug}`;
    if (paths.has(route) || UTILITY.has(custom.slug) || CORE.includes(custom.slug) || /^(?:index\.html|robots\.txt|sitemap\.xml|llms\.txt|favicon\.|apple-touch-icon\.)/.test(custom.slug)) continue;
    pages.push({ kind: 'public', page: `ai-${custom.slug}`, canonicalPath: route, showInNav: flag(custom.show_in_nav, true), label: text(custom.nav_label || custom.title || custom.slug), title: text(custom.meta_title) || `${text(custom.title || custom.slug)} | ${name}`, description: text(custom.meta_description || custom.summary) || defaultDescription, content: custom });
    paths.add(route);
  }
  const market = publicMarketplace(expert && expert.marketplace_public);
  if (market.enabled && market.experts.length > 1) {
    pages.push({ kind: 'public', page: 'experts', canonicalPath: '/experts', showInNav: true, label: text(market.settings.public_label) || 'Experts', title: `Experts | ${name}`, description: text(market.settings.intro_text) || defaultDescription });
    for (const mini of market.experts) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(text(mini.id))) continue;
      pages.push({ kind: 'public', page: 'expert-profile', canonicalPath: `/experts/${encodeURIComponent(mini.id)}`, showInNav: false, label: text(mini.display_name || mini.name), title: `${text(mini.display_name || mini.name)} | ${name}`, description: text(mini.bio || mini.title) || defaultDescription, content: mini });
    }
  }
  return pages;
}
function publicPageForRequest(req, route, expert) {
  if (isUtilityRequest(req, hostFromReq(req), route)) return { kind: 'utility' };
  const parts = expertParts(req, route);
  if (!parts) return { kind: 'not_found' };
  const canonicalPath = !parts.length || parts.length === 1 && ['home', 'index.html'].includes(parts[0]) ? '/' : `/${parts.join('/')}`;
  const descriptor = publishedPublicPages(expert).find(page => page.canonicalPath === canonicalPath);
  return descriptor || { kind: 'not_found', canonicalPath };
}

function createExpertResolver(options = {}) {
  const backend = String(options.backend || process.env.OWNLYBIZ_API_URL || process.env.OWNLY_API || 'https://ownlybiz-backend-production.up.railway.app').replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl || ((...args) => fetch(...args));
  const now = options.now || Date.now;
  const ttlMs = options.ttlMs ?? 30000;
  const staleMs = options.staleMs ?? 120000;
  const maxEntries = Math.max(1, options.maxEntries ?? 200);
  const timeoutMs = options.timeoutMs ?? 1800;
  const cache = new Map();
  const pending = new Map();
  async function read(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { signal: controller.signal, redirect: 'error', headers: { accept: 'application/json' } });
      if (response.status === 404 || response.status === 410) return { state: 'not_found' };
      if (!response.ok) return { state: 'unavailable' };
      const value = await response.json();
      return object(value) ? { state: 'found', value } : { state: 'unavailable' };
    } catch (_) { return { state: 'unavailable' }; }
    finally { clearTimeout(timer); }
  }
  function remember(key, result) {
    cache.delete(key);
    cache.set(key, { result, expiresAt: now() + (result.state === 'found' ? ttlMs : Math.min(ttlMs, 10000)), staleUntil: now() + ttlMs + staleMs });
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
  }
  async function resolve(req, host = hostFromReq(req)) {
    const route = routeFromRequest(req, host);
    if (route.kind === 'platform' || isUtilityRequest(req, host, route)) return { state: 'platform', route, slug: '' };
    if (route.kind === 'custom-domain' ? !normalizeDomain(host) : !route.slug) return { state: 'not_found', route, slug: '' };
    const key = `${host}|${route.kind === 'custom-domain' ? 'domain' : route.slug}`;
    const old = cache.get(key);
    const withRoute = result => ({ ...result, route: { ...route, slug: result.slug || route.slug } });
    if (old && old.expiresAt > now()) return withRoute(old.result);
    if (pending.has(key)) return withRoute(await pending.get(key));
    // Bound in-flight work as well as stored profiles under untrusted host input.
    if (pending.size >= maxEntries) return { state: 'unavailable', route, slug: route.slug };
    const work = (async () => {
      let slug = route.slug;
      let result;
      if (route.kind === 'custom-domain') {
        const lookup = await read(`${backend}/api/domains/lookup?domain=${encodeURIComponent(host)}`);
        if (lookup.state !== 'found') result = { state: lookup.state, slug: '' };
        else if (!flag(lookup.value.active, true) || !flag(lookup.value.is_active, true) || !flag(lookup.value.website_published, true)) result = { state: 'not_found', slug: '' };
        else {
          slug = cleanSlug(lookup.value.slug);
          if (!slug) result = { state: 'unavailable', slug: '' };
        }
      }
      if (!result) {
        const response = await read(`${backend}/api/experts/${encodeURIComponent(slug)}`);
        if (response.state !== 'found') result = { state: response.state, slug };
        else {
          const rawExpert = response.value.expert || response.value;
          if (cleanSlug(rawExpert.slug) !== slug) result = { state: 'unavailable', slug };
          else if (!publishedExpert(rawExpert)) result = { state: 'not_found', slug };
          else {
            const profile = publicProfileProjection(response.value);
            result = { state: 'found', slug, expert: profile.expert, profile, stale: false };
          }
        }
      }
      if (result.state === 'unavailable') {
        // A successful domain reassignment must never revive the former owner.
        if (old && old.result.state === 'found' && old.staleUntil > now() && (!slug || old.result.slug === slug)) return { ...old.result, stale: true };
        return result;
      }
      remember(key, result); // explicit missing/unpublished replaces stale data
      return result;
    })();
    pending.set(key, work);
    try { return withRoute(await work); } finally { pending.delete(key); }
  }
  return { resolve };
}

module.exports = { RESERVED, UTILITY, hostFromReq, isPlatformHost, routeFromRequest, isUtilityRequest, publishedExpert, publicPageForRequest, publishedPublicPages, publicExpertProjection, publicProfileProjection, publicWebsiteContent, publicOrigin, primaryDomainFromExpert, allowIndexing, createExpertResolver };
