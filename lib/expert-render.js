'use strict';

// This is a public, scriptless first paint. The existing application owns all
// authentication, booking, payment and session interactions after hydration.
const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const text = value => String(value == null ? '' : value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const json = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, ch => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
function object(value) { try { return typeof value === 'string' ? JSON.parse(value) || {} : value || {}; } catch (_) { return {}; } }
function safeUrl(value) {
  const url = String(value || '').trim();
  if (/^\/(?!\/)/.test(url)) return url;
  try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : ''; } catch (_) { return ''; }
}
function paragraphs(value) {
  return String(value || '').split(/\n\s*\n/).map(text).filter(Boolean).map(value => `<p>${escape(value)}</p>`).join('');
}
function image(value, alt = '') {
  const url = safeUrl(value);
  return url ? `<img src="${escape(url)}" alt="${escape(alt)}" loading="eager" decoding="async">` : '';
}
function pageKey(page) { return page.page || page.slug || 'home'; }
function pagePath(page) { return page.path || page.canonicalPath || '/'; }
function pageCopy(expert, page) {
  const wc = object(expert.website_content);
  const key = pageKey(page);
  const custom = key.startsWith('ai-') ? page.content : null;
  const name = text(expert.name || expert.display_name || 'Independent Expert');
  const label = {home:name, about:wc.about_title || `About ${name}`, services:wc.svc_title || 'Services & Rates', reviews:'Client reviews', book:'Book a session', contact:wc.contact_heading || 'Contact'}[key];
  const heading = text(custom && (custom.title || custom.nav_label) || label || page.label || page.title || name);
  const marketPage = key === 'experts' || key === 'expert-profile';
  const title = text(custom && custom.meta_title || (marketPage ? page.title : key === 'home' ? expert.meta_title || `${name}${expert.title ? ' - ' + expert.title : ''}` : `${heading} | ${name}`)).slice(0, 100);
  const description = text(custom && (custom.meta_description || custom.subtitle || custom.intro || custom.summary) || (marketPage && page.description) || ({about:expert.about_text, services:wc.svc_subtitle, contact:wc.contact_desc}[key]) || expert.meta_description || expert.hero_tagline || expert.bio || expert.title).slice(0, 165);
  return {wc, key, custom, name, heading, title, description};
}
function cta(value, pages) {
  if (!text(value.cta_label)) return '';
  const target = text(value.cta_page || 'book').replace(/^ai-/, '');
  const descriptor = pages.find(page => pageKey(page).replace(/^ai-/, '') === target) || pages.find(page => pageKey(page) === 'book') || pages.find(page => pageKey(page) === 'home');
  return descriptor ? `<p><a href="${escape(pagePath(descriptor))}">${escape(text(value.cta_label))}</a></p>` : '';
}
function contentSections(page, pages) {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  return sections.map(section => {
    if (!section || section.enabled === false || section.published === false) return '';
    const body = paragraphs(section.body || section.text || section.content || section.description);
    const items = Array.isArray(section.items) ? section.items.map(item => typeof item === 'object' ? text(item.title || item.question) + (item.body || item.answer ? ': ' + text(item.body || item.answer) : '') : text(item)).filter(Boolean) : [];
    return `<section>${section.title || section.heading ? `<h2>${escape(text(section.title || section.heading))}</h2>` : ''}${image(section.image_url, text(section.image_alt))}${body}${items.length ? '<ul>' + items.map(item => `<li>${escape(item)}</li>`).join('') + '</ul>' : ''}${cta(section,pages)}</section>`;
  }).join('');
}
function expertSeo(expert, page, canonical, siteOrigin) {
  const copy = pageCopy(expert, page);
  const wc = copy.wc;
  const portrait = safeUrl(wc.profile_image || expert.avatar_url || wc.logo_image || expert.logo_url);
  const type = wc.entity_type === 'Organization' ? 'Organization' : 'Person';
  const home = (siteOrigin || new URL(canonical).origin).replace(/\/+$/, '') + '/';
  const identity = {'@type':type, '@id':home + '#expert', name:copy.name, url:home};
  if (portrait) identity.image = new URL(portrait, canonical).href;
  if (text(expert.title) && type === 'Person') identity.jobTitle = text(expert.title);
  const sameAs = Object.values(object(expert.social_links)).filter(value => typeof value === 'string').map(safeUrl).filter(url => /^https?:/.test(url));
  if (sameAs.length) identity.sameAs = sameAs;
  return {title:copy.title, description:copy.description, image:safeUrl(expert.og_image_url || portrait), schema:{'@context':'https://schema.org', '@graph':[identity, {'@type':'WebPage','@id':canonical+'#page',url:canonical,name:copy.title,description:copy.description,about:{'@id':identity['@id']},isPartOf:{'@id':home+'#website'}}, {'@type':'WebSite','@id':home+'#website',url:home,name:copy.name,publisher:{'@id':identity['@id']}}]}};
}
function renderExpertFirstPaint(result, page, pages) {
  const expert = result.expert;
  const {wc, key, custom, name, heading, description} = pageCopy(expert, page);
  const book = pages.find(item => pageKey(item) === 'book');
  const bookHref = book ? pagePath(book) : '';
  let body = '';
  if (custom) body = image(custom.header_image_url, custom.header_image_alt || heading) + paragraphs(custom.subtitle || custom.intro || custom.summary) + contentSections(custom,pages) + cta(custom,pages);
  else if (key === 'home') body = image(wc.profile_image || expert.avatar_url, name) + paragraphs(expert.hero_tagline || expert.bio || expert.title) + contentSections({sections:(Array.isArray(wc.ai_sections) ? wc.ai_sections : []).filter(section => !section.target_page || section.target_page === 'home')},pages);
  else if (key === 'about') {
    body = paragraphs(expert.about_text || expert.bio);
    const credentials = object(expert.credentials);
    if (Array.isArray(credentials)) body += '<ul>' + credentials.map(item => text(typeof item === 'object' ? item.text : item)).filter(Boolean).map(item => `<li>${escape(item)}</li>`).join('') + '</ul>';
  } else if (key === 'services' || key === 'book') {
    body = paragraphs(wc.svc_subtitle);
    for (const channel of ['chat','voice','video']) {
      if ([false,0,'0','false'].includes(expert[channel+'_enabled'])) continue;
      const rate = Number(expert[channel+'_pm'] ?? expert['rate_'+channel]);
      body += `<section><h2>${{chat:'Chat',voice:'Voice call',video:'Video session'}[channel]}</h2>${paragraphs(wc['svc_'+channel+'_desc'])}${Number.isFinite(rate) && rate >= 0 ? `<p>${rate === 0 ? 'Free' : '$'+rate.toFixed(2)+' per minute'}</p>` : ''}</section>`;
    }
    if (key === 'book') body += '<p role="status">Loading availability and booking options…</p><noscript><p>Enable JavaScript to sign in, check live availability, and book a session.</p></noscript>';
  } else if (key === 'contact') {
    body = paragraphs(wc.contact_desc);
    for (const value of [wc.contact_location, wc.contact_hours, wc.contact_response]) if (text(value)) body += paragraphs(value);
    const email = String(wc.contact_email || '').trim();
    if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) body += `<p><a href="mailto:${escape(email)}">${escape(email)}</a></p>`;
    body += '<noscript><p>Enable JavaScript to use the contact form.</p></noscript>';
  } else if (key === 'reviews') {
    const reviews = Array.isArray(result.profile && result.profile.reviews) ? result.profile.reviews : [];
    body = reviews.map(review => `<section><blockquote>${escape(text(review.comment))}</blockquote><p>${escape(text(review.reviewer_name || review.client_name))}${review.is_verified_session === true || review.is_verified_session === 1 ? ' · Verified session' : review.source === 'manual' ? ' · Shared by the expert' : ''}</p></section>`).join('') || '<p>No public reviews yet.</p>';
  } else if(key === 'experts') {
    const market = object(expert.marketplace_public);
    body = paragraphs(market.settings && market.settings.intro_text) + pages.filter(item => pageKey(item) === 'expert-profile').map(item => `<section><h2><a href="${escape(pagePath(item))}">${escape(item.label)}</a></h2>${paragraphs(item.description)}</section>`).join('');
  } else if(key === 'expert-profile') {
    const member = page.content || {};
    body = image(member.avatar_url, member.display_name || member.name) + paragraphs(member.title) + paragraphs(member.bio);
  } else body = paragraphs(description);
  const accent = /^#[0-9a-f]{6}$/i.test(expert.theme_color || '') ? expert.theme_color : '#6b4d8a';
  return `<style id="ob-expert-first-paint-css">html.ob-public-first-paint #view-4{display:none!important}#ob-public-first-paint-shell{position:relative;z-index:5;min-height:100vh;background:#faf8f5;color:#252126;font:16px/1.65 system-ui,sans-serif}#ob-public-first-paint-shell nav{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:22px max(20px,calc((100vw - 1000px)/2));border-bottom:1px solid #ded8e3}#ob-public-first-paint-shell a{color:${accent};text-underline-offset:4px}#ob-public-first-paint-shell main{max-width:860px;padding:44px 22px 72px;margin:auto}#ob-public-first-paint-shell h1{font-size:clamp(30px,5vw,48px);line-height:1.2}#ob-public-first-paint-shell h2{font-size:24px;line-height:1.3}#ob-public-first-paint-shell section{margin:26px 0}#ob-public-first-paint-shell img{display:block;max-width:100%;max-height:440px;object-fit:cover;border-radius:18px;margin:20px 0}#ob-public-first-paint-shell .ob-ssr-book{display:inline-block;padding:12px 24px;border-radius:8px;color:white;background:${accent};text-decoration:none}#ob-public-first-paint-shell footer{padding:20px;text-align:center}#ob-public-first-paint-shell.is-hiding{opacity:0;transition:opacity .16s}</style><div id="ob-public-first-paint-shell" data-slug="${escape(result.slug)}" data-page="${escape(key)}"><nav aria-label="Website"><strong>${escape(name)}</strong>${pages.filter(item => item.showInNav !== false).map(item => `<a href="${escape(pagePath(item))}"${pageKey(item) === key ? ' aria-current="page"' : ''}>${escape(item.label || item.nav_label || ({home:'Home',about:'About',services:'Services',reviews:'Reviews',book:'Book a session',contact:'Contact'}[pageKey(item)]) || item.title || pageKey(item))}</a>`).join('')}</nav><main><h1>${escape(heading)}</h1>${body}${bookHref && key !== 'book' ? `<p><a class="ob-ssr-book" href="${escape(bookHref)}">${escape(text(wc.hero_cta) || 'Book a session')}</a></p>` : ''}</main><footer>© ${new Date().getFullYear()} ${escape(text(expert.footer_text) || name)}</footer></div>`;
}
function expertErrorHtml(status) {
  const unavailable = status === 503;
  const title = unavailable ? 'Temporarily unavailable' : 'Page not found';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>${title}</title></head><body><main><h1>${title}</h1><p>${unavailable ? 'Please try again shortly.' : 'This page is not available.'}</p><a href="/">Return to the website</a></main></body></html>`;
}
module.exports = {expertSeo, renderExpertFirstPaint, expertErrorHtml, safeJson:json};
