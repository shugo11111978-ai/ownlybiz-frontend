import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// All upstream responses are fixtures: zero external network or mutations.
const require = createRequire(import.meta.url);
const shared = require('../lib/expert-public.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = (url = '/', host = 'alpha.example') => ({ url, method: 'GET', headers: { host } });
const response = (value, status = 200) => ({ status, ok: status >= 200 && status < 300, json: async () => value });
const expert = {
  id: 'owner-a', user_id: 'owner-a', slug: 'alpha', name: 'Alpha Practice', title: 'Private support', website_published: 1, allow_indexing: 1,
  email: 'LOGIN_SENTINEL', privacy_contact_email: 'privacy@alpha.example', account_email: 'PRIVATE_SENTINEL', stripe_account_id: 'STRIPE_SENTINEL',
  primary_domain: { custom_domain: 'alpha.example', verified: true }, payments_enabled: true, chat_enabled: true, chat_pm: 3, rate_chat: 3, free_minutes: 2,
  website_content: {
    template_id: 'ownly-practice-focus-v1', contact_email: 'hello@alpha.example', pages: { about: true, services: true, reviews: false, contact: true },
    nav_labels: { book: 'Talk with Alpha' }, design_tokens: { accent: '#224466', secret: 'DESIGN_SECRET' }, internal_notes: 'EDITOR_SENTINEL',
    ai_sections: [{ id: 'home-story', type: 'story', target_page: 'home', body: 'Welcome', login_email: 'SECTION_SENTINEL' }, { target_page: 'draft-page', body: 'DRAFT_SECTION_SENTINEL' }],
    ai_pages: [
      { slug: 'guide', title: 'A guide', published: true, show_in_nav: true, meta_title: 'Guide | Alpha', sections: [{ id: 'section-1', type: 'faq', title: 'Questions', items: ['First', 'Second'], image_alt: 'Meaningful image' }] },
      { slug: 'quiet-guide', title: 'Direct-link guide', published: true, show_in_nav: false, sections: [] },
      { slug: 'blog', title: 'Practice journal', published: true, show_in_nav: true, sections: [] },
      { slug: 'draft-page', title: 'DRAFT_SENTINEL', published: false, sections: [] },
      { slug: 'new-page', title: 'New Page', published: true, summary: 'A short subtitle for this page', sections: [] },
    ],
  },
  marketplace_public: { enabled: true, settings: { public_label: 'Our team', intro_text: 'Meet the team', updated_by: 'INTERNAL_ACTOR' }, experts: [{ id: 'mini-a', display_name: 'Ari', status: 'active', chat_enabled: true, chat_pm: 4, suite_email: 'MINI_LOGIN_SENTINEL' }, { id: 'mini-b', display_name: 'Bea', status: 'active' }, { id: 'mini-hidden', status: 'inactive' }] },
};
const profile = { expert, reviews: [{ id: 'r1', comment: 'Useful', rating: 5, source: 'manual', is_verified_session: false, client_email: 'REVIEW_EMAIL_SENTINEL' }], packages: [{ id: 'p1', name: 'Session', price: 30 }], availability: [{ id: 'a1', expert_id: 'owner-a', day_of_week: 1, start_time: '10:00', end_time: '12:00' }], clients: [{ email: 'CLIENT_SENTINEL' }], sessions: [{ payment_id: 'PAYMENT_SENTINEL' }] };
for (const host of ['ownlybiz.com', 'www.ownlybiz.com', 'localhost', '127.0.0.1', '192.168.1.2', 'preview.vercel.app']) assert.equal(shared.isPlatformHost(host), true, host);
assert.equal(shared.isPlatformHost('ownlybiz.com.evil.example'), false);
assert.equal(shared.hostFromReq({ headers: { 'x-forwarded-host': 'ALPHA.EXAMPLE:443, proxy', host: 'ownlybiz.com' } }), 'alpha.example');
for (const url of ['/login?expert=alpha', '/mini-suite/abc', '/help', '/session/session-a', '/reset-password?token=x', '/group/abc', '/legal/privacy', '/account']) assert.equal(shared.isUtilityRequest(req(url)), true, url);
for (const url of ['/book?session_id=abc', '/nonsense?foo=bar']) assert.equal(shared.isUtilityRequest(req(url)), false, url);
assert.equal(shared.routeFromRequest(req('/mini-suite/abc?expert=alpha', 'ownlybiz.com')).kind, 'platform');
assert.equal(shared.routeFromRequest(req('/alpha/book', 'ownlybiz.com')).slug, 'alpha');
assert.equal(shared.routeFromRequest(req('/book', 'alpha.ownlybiz.com')).kind, 'subdomain');
assert.equal(shared.routeFromRequest(req('/?expert=alpha', 'ownlybiz.com')).kind, 'query');
const reservedTenant={...expert,slug:'stripe',primary_domain:{custom_domain:'stripe-practice.example'}};
assert.equal(shared.publishedExpert(reservedTenant),true,'reserved platform paths do not invalidate an existing published tenant');
const reservedCalls=[];
const reservedResolver=shared.createExpertResolver({fetchImpl:async url=>{
  reservedCalls.push(url);
  return response(url.includes('/domains/lookup') ? {slug:'stripe'} : {expert:reservedTenant});
}});
for(const request of [req('/','stripe.ownlybiz.com'),req('/','stripe-practice.example'),req('/?expert=stripe','ownlybiz.com')]) {
  const resolved=await reservedResolver.resolve(request);
  assert.equal(resolved.state,'found',request.headers.host+request.url);
  assert.equal(resolved.slug,'stripe');
  assert.equal(shared.publicPageForRequest(request,resolved.route,resolved.expert).page,'home');
}
const reservedCallsBefore=reservedCalls.length;
for(const url of ['/stripe','/stripe?expert=stripe','/stripe?expert=alpha']) assert.equal((await reservedResolver.resolve(req(url,'ownlybiz.com'))).state,'platform','reserved utility path cannot be hijacked: '+url);
assert.equal(reservedCalls.length,reservedCallsBefore,'reserved platform utilities do not call tenant profile APIs');

const safe = shared.publicProfileProjection(profile);
assert.doesNotMatch(JSON.stringify(safe), /SENTINEL|DESIGN_SECRET|INTERNAL_ACTOR/);
assert.equal(safe.expert.id, 'owner-a');
assert.equal(safe.expert.website_content.contact_email, 'hello@alpha.example');
assert.equal(safe.expert.website_content.design_tokens.accent, '#224466', 'design tokens are presentation, not credentials');
assert.deepEqual(safe.expert.website_content.ai_pages[0].sections[0].items, ['First', 'Second']);
assert.equal(safe.expert.website_content.ai_pages[0].sections[0].image_alt, 'Meaningful image');
assert.equal(safe.expert.privacy_contact_email, 'privacy@alpha.example');
assert.equal(safe.expert.chat_pm, 3);
assert.equal(safe.expert.marketplace_public.experts[0].chat_pm, 4);
assert.equal(safe.reviews[0].is_verified_session, false);
assert.equal(safe.packages[0].price, 30);
assert.equal(safe.availability[0].day_of_week, 1);
const pauseStatus={paused:true,allowed:false,blocked:true,message:'Operator maintenance notice',client_message:'Sessions resume shortly. Please check back.'};
const pausedProfile=shared.publicProfileProjection({...profile,service_pause:pauseStatus,expert:{...expert,service_pause:pauseStatus}});
assert.deepEqual(pausedProfile.service_pause,pauseStatus,'public pause contract retains permission and client-specific notice');
assert.deepEqual(pausedProfile.expert.service_pause,pauseStatus,'embedded pause contract matches public profile');
assert.equal(expert.website_content.ai_pages.length, 5, 'projection does not mutate source');
const paths = shared.publishedPublicPages(safe.expert).map(page => page.canonicalPath);
assert.deepEqual(paths, ['/', '/about', '/services', '/book', '/contact', '/guide', '/quiet-guide', '/blog', '/experts', '/experts/mini-a', '/experts/mini-b']);
for (const route of ['/quiet-guide', '/experts/mini-a']) assert.equal(shared.publishedPublicPages(safe.expert).find(page => page.canonicalPath === route).showInNav, false);
for (const [host, prefix] of [['alpha.example', ''], ['alpha.ownlybiz.com', ''], ['ownlybiz.com', '/alpha']]) {
  for (const route of paths) {
    const request = req(`${prefix}${route}?utm_source=qa`, host);
    assert.equal(shared.publicPageForRequest(request, shared.routeFromRequest(request), safe.expert).kind, 'public', request.url);
  }
  for (const missing of ['/draft-page', '/new-page', '/reviews', '/unknown', '/guide/extra', '/experts/mini-hidden', '/%E0%A4%A', '/guide%2Fextra']) {
    const request = req(`${prefix}${missing}`, host);
    assert.equal(shared.publicPageForRequest(request, shared.routeFromRequest(request), safe.expert).kind, 'not_found', request.url);
  }
}
assert.equal(shared.publicPageForRequest(req('/book?session_id=abc'), { kind: 'custom-domain', slug: 'alpha' }, expert).page, 'book');
assert.equal(shared.publicPageForRequest(req('/nonsense?foo=bar'), { kind: 'custom-domain', slug: 'alpha' }, expert).kind, 'not_found');
assert.equal(shared.publicOrigin(expert, 'alias.example'), 'https://alpha.example');
assert.equal(shared.publicOrigin({ slug: 'alpha' }, 'ownlybiz.com'), 'https://ownlybiz.com/alpha');

const singleMarket = {...expert,marketplace_public:{...expert.marketplace_public,experts:[expert.marketplace_public.experts[0]]}};
assert.equal(shared.publicExpertProjection(singleMarket).marketplace_public.enabled,true,'preserve API eligibility payload');
assert.equal(shared.publishedPublicPages(singleMarket).some(page=>page.canonicalPath.startsWith('/experts')),false,'one active member does not activate marketplace site mode');
const eligibilityPages = [
  {slug:'new-page',title:'New Page',published:true,summary:'An authored introduction about a specific professional service, with practical advice and a useful next step.'},
  {slug:'ordinary-name',title:'Ordinary title',published:true,sections:[{body:'Write the main page content here.'}]},
  {slug:'untouched',title:'Untouched',published:true,sections:[{body:'A short introduction that tells visitors what this page covers.'}]},
  {slug:'new-page-copy',title:'New Page',published:true},
  {slug:'a'.repeat(64),title:'A complete long-slug page',published:true,sections:[{body:'A real authored explanation.'}]},
  {slug:'a'.repeat(65),title:'Invalid long slug',published:true},
];
const eligible = shared.publicExpertProjection({...expert,website_content:{ai_pages:eligibilityPages}}).website_content.ai_pages;
assert.deepEqual(eligible.map(page=>page.slug),['new-page','a'.repeat(64)],'eligibility matches runtime; meaningful generic title survives and placeholder bodies do not');
assert.equal(shared.publicPageForRequest(req('/'+'a'.repeat(64)),{kind:'custom-domain',slug:'alpha'},{...expert,website_content:{ai_pages:eligibilityPages}}).page,'ai-'+'a'.repeat(64));
const runtimeSource = fs.readFileSync(path.join(root,'index.html'),'utf8');
const runtimeEligibility = {};
const aiRenderer = runtimeSource.slice(runtimeSource.indexOf('  function safeSlug(value){',runtimeSource.indexOf('id="ob-ai-website-editor-20260517"')));
const runtimeSlug = aiRenderer.slice(0,aiRenderer.indexOf('  function safeImage'));
const runtimePageFilters = aiRenderer.slice(aiRenderer.indexOf('function aiPageText(page)'),aiRenderer.indexOf('var rawPages ='));
assert.ok(runtimeSlug.includes('slice(0,64)'),'runtime slug capacity matches the backend 64-character contract');
assert.ok(runtimePageFilters.includes('function isSafePublicAiPage(page)'),'actual public-renderer eligibility functions found');
vm.runInNewContext(`function clean(value){return String(value == null ? '' : value).replace(/\\s+/g,' ').trim();}\n${runtimeSlug}\n${runtimePageFilters}\nthis.check=isSafePublicAiPage;`,runtimeEligibility);
for(const page of eligibilityPages.filter(page=>page.slug.length<=64)) {
  const retained = shared.publicWebsiteContent({ai_pages:[page]}).ai_pages.length === 1;
  assert.equal(retained,runtimeEligibility.check(page),`actual runtime filter parity: ${page.slug}`);
}
const consumedContentKeys = [...new Set([...runtimeSource.matchAll(/\bwc\.([a-zA-Z0-9_]+)/g)].map(match=>match[1]))];
const allContent = Object.fromEntries(consumedContentKeys.map(key=>[key,key === 'ai_pages' || key === 'ai_sections' ? [] : 'public-value']));
const contentProjection = shared.publicWebsiteContent(allContent);
for(const key of consumedContentKeys) assert.ok(Object.hasOwn(contentProjection,key),`runtime website field preserved: ${key}`);
const allSections = ['feature','story','faq','list','quote','gallery','cta','resource'].map((type,index)=>({id:'section-'+index,target_page:'guide',type,title:type+' heading',heading:'Legacy heading alias',body:'Complete authored section.',items:['One','Two'],cta_label:'Continue',cta_page:'quiet-guide',image_url:'https://images.example/section.png',image_alt:'Public image'}));
const rich = shared.publicExpertProjection({...expert,ga4_id:'G-TEST123',gtm_id:'GTM-TEST123',meta_pixel_id:'123456',website_content:{...expert.website_content,ai_sections:allSections.map(section=>({...section,target_page:'home'})),ai_pages:[{slug:'guide',title:'Guide',published:true,template:'article',sections:allSections}]}});
assert.deepEqual(rich.website_content.ai_pages[0].sections,allSections,'all rich section fields and order retained');
assert.equal(rich.website_content.ai_sections.length,8,'home sections retained');
assert.deepEqual([rich.ga4_id,rich.gtm_id,rich.meta_pixel_id],['G-TEST123','GTM-TEST123','123456']);
const writtenOffer={available:true,expert:{id:'owner-a',name:'Alpha Practice'},settings:{email_ready:true,email_from_address:'SENDER_SENTINEL',email_provider:'PROVIDER_SENTINEL',email_tested_at:1,updated_by:'ACTOR_SENTINEL',created_at:2,updated_at:3,public_label:'Written support',intake_instructions:'Reading guidance',form_fields:[{id:'question',type:'textarea',required:true}],placement:{home:true},ai_autopilot_enabled:true,auto_accept_paid:true},buckets:[{id:'offer-a',currency:'USD',price:35,price_cents:3500,turnaround_hours:24}],unavailable_reason:''};
const writtenProjection=shared.publicExpertProjection({...expert,on_demand_public:writtenOffer}).on_demand_public;
assert.doesNotMatch(JSON.stringify(writtenProjection),/SENTINEL|email_tested_at|updated_by|created_at|updated_at/);
for(const key of ['email_ready','public_label','intake_instructions','form_fields','placement','ai_autopilot_enabled','auto_accept_paid']) assert.deepEqual(writtenProjection.settings[key],writtenOffer.settings[key],`written-reading setting preserved: ${key}`);
assert.deepEqual(writtenProjection.buckets,writtenOffer.buckets);
assert.equal(writtenOffer.settings.email_from_address,'SENDER_SENTINEL','source sender settings untouched');

let time = 1000;
let mode = 'ok';
const calls = [];
const resolver = shared.createExpertResolver({ backend: 'https://backend.invalid', now: () => time, ttlMs: 30, staleMs: 120, fetchImpl: async (url, options) => {
  calls.push({ url, options });
  assert.deepEqual(options.headers, { accept: 'application/json' }, 'no credentials forwarded');
  if (mode === 'outage') return response({}, 503);
  if (mode === 'missing') return response({}, 404);
  if (url.includes('/domains/lookup')) return response({ slug: mode === 'reassigned' ? 'beta' : 'alpha' });
  if (mode === 'reassigned') return response({}, 503);
  if (mode === 'malformed') return response([]);
  if (mode === 'mismatch') return response({ expert: { ...expert, slug: 'someone-else' } });
  return response({ ...profile, expert: { ...expert, website_published: mode === 'unpublished' ? 0 : 1 } });
} });
let result = await resolver.resolve(req('/guide'));
assert.equal(result.state, 'found'); assert.equal(result.route.slug, 'alpha'); assert.equal(calls.length, 2);
assert.equal((await resolver.resolve(req('/about'))).state, 'found'); assert.equal(calls.length, 2, 'host pages share cached profile');
time += 31; mode = 'outage';
result = await resolver.resolve(req('/'));
assert.equal(result.state, 'found'); assert.equal(result.stale, true);
assert.equal((await resolver.resolve(req('/', 'other.example'))).state, 'unavailable', 'cache cannot cross hosts');
time += 121;
assert.equal((await resolver.resolve(req('/'))).state, 'unavailable', 'stale data expires');
mode = 'ok'; await resolver.resolve(req('/'));
time += 31; mode = 'missing'; assert.equal((await resolver.resolve(req('/'))).state, 'not_found');
time += 31; mode = 'outage'; assert.equal((await resolver.resolve(req('/'))).state, 'unavailable', '404 erases stale success');
mode = 'ok'; await resolver.resolve(req('/'));
time += 31; mode = 'unpublished'; assert.equal((await resolver.resolve(req('/'))).state, 'not_found');
time += 31; mode = 'outage'; assert.equal((await resolver.resolve(req('/'))).state, 'unavailable', 'unpublication erases stale success');
mode = 'ok'; await resolver.resolve(req('/'));
time += 31; mode = 'reassigned'; assert.equal((await resolver.resolve(req('/'))).state, 'unavailable', 'domain reassignment cannot revive former owner');
for (const bad of ['malformed', 'mismatch']) { mode = bad; assert.equal((await resolver.resolve(req('/', `${bad}.example`))).state, 'unavailable'); }
const beforeUtility = calls.length;
for (const url of ['/login', '/mini-suite/abc', '/session/abc', '/account', '/privacy']) assert.equal((await resolver.resolve(req(url))).state, 'platform');
assert.equal(calls.length, beforeUtility, 'utilities never depend on profile resolution');
let boundedCalls = 0;
const bounded = shared.createExpertResolver({ maxEntries: 1, fetchImpl: async url => { boundedCalls += 1; return response(url.includes('lookup') ? { slug: 'alpha' } : profile); } });
await bounded.resolve(req('/', 'one.example')); await bounded.resolve(req('/', 'two.example')); await bounded.resolve(req('/', 'one.example'));
assert.equal(boundedCalls, 6, 'configured capacity evicts oldest entry');
let inflightCalls = 0;
const concurrent = shared.createExpertResolver({ fetchImpl: async url => { inflightCalls += 1; await Promise.resolve(); return response(url.includes('lookup') ? { slug: 'alpha' } : profile); } });
await Promise.all([concurrent.resolve(req('/')), concurrent.resolve(req('/about'))]);
assert.equal(inflightCalls, 2, 'concurrent host requests share lookup');
const timeout = shared.createExpertResolver({ timeoutMs: 2, fetchImpl: async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('fixture timeout')))) });
assert.equal((await timeout.resolve(req('/'))).state, 'unavailable');

async function endpoint(file, host, settings = {}) {
  const upstreamCalls = [];
  const context = { module: { exports: {} }, require(name) {
    if (name === 'fs') return fs; if (name === 'path') return path;
    assert.equal(name, '../lib/expert-public');
    return { ...shared, createExpertResolver: () => shared.createExpertResolver({ fetchImpl: async url => {
      upstreamCalls.push(url); if (settings.status) return response({}, settings.status);
      return response(url.includes('/domains/lookup') ? { slug: 'alpha' } : { ...profile, expert: { ...expert, ...settings.expert } });
    } }) };
  }, process: { cwd: () => root, env: { NODE_ENV: 'test' } }, URL, URLSearchParams, Date };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'api', file), 'utf8'), context, { filename: file });
  const result = { status: 0, headers: {}, body: '', upstreamCalls };
  await context.module.exports(req('/', host), { setHeader(key, value) { result.headers[key] = value; }, status(code) { result.status = code; return this; }, send(body) { result.body = body; } });
  return result;
}
for (const host of ['alpha.example', 'www.alpha.example', 'alpha.ownlybiz.com']) {
  const llms = await endpoint('llms.js', host);
  assert.equal(llms.status, 200); assert.match(llms.body, /^# Alpha Practice/m);
  assert.doesNotMatch(llms.body, /Ownlybiz|SaaS|software infrastructure|SENTINEL|new-page/);
  assert.ok(llms.body.includes('https://alpha.example/quiet-guide'));
  const sitemap = await endpoint('sitemap.js', host); assert.equal(sitemap.status, 200);
  for (const route of paths) assert.ok(sitemap.body.includes(`<loc>https://alpha.example${route}</loc>`), route);
  assert.doesNotMatch(sitemap.body, /<lastmod>|draft-page|new-page|mini-hidden|<loc>.*\/reviews<\/loc>/);
  const robots = await endpoint('robots.js', host); assert.equal(robots.status, 200); assert.match(robots.body, /Sitemap: https:\/\/alpha.example\/sitemap.xml/);
}
for (const file of ['llms.js', 'sitemap.js', 'robots.js']) {
  const platform = await endpoint(file, 'ownlybiz.com'); assert.equal(platform.status, 200); assert.equal(platform.upstreamCalls.length, 0);
  for (const status of [404, 503]) {
    const failure = await endpoint(file, 'unknown.example', { status });
    assert.equal(failure.status, status); assert.equal(failure.headers['Cache-Control'], 'no-store'); assert.doesNotMatch(failure.body, /Ownlybiz|Alpha Practice|Liran/);
    if (status === 503) assert.equal(failure.headers['Retry-After'], '60');
  }
  const noindex = await endpoint(file, 'alpha.example', { expert: { allow_indexing: 0 } });
  assert.equal(noindex.status, 200); assert.match(noindex.headers['X-Robots-Tag'], /noindex/); assert.doesNotMatch(noindex.body, /<loc>|# Alpha|Sitemap:/);
}
console.log('PASS expert public contract: host/routes, published pages, private/draft projection, bounded tri-state cache, timeout/404/unpublish/reassignment, llms/sitemap/robots; zero external network or mutations.');
