const fs = require('fs');
const path = require('path');
const { createExpertResolver, hostFromReq, isPlatformHost, publicOrigin, publishedPublicPages, allowIndexing } = require('../lib/expert-public');
const resolver = createExpertResolver();

const BLOG_POSTS_PATH = path.join(process.cwd(), 'data', 'ownlybiz-blog-posts.json');
function readBlogPosts() {
  try {
    // Keep literal filesystem dependencies visible to the function packager.
    const contents = fs.readFileSync(BLOG_POSTS_PATH, 'utf8');
    const parsed = JSON.parse(contents);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

module.exports = async function handler(req, res) {
  const host = hostFromReq(req);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  if (!isPlatformHost(host)) {
    const result = await resolver.resolve({ ...req, url: '/llms.txt', method: 'GET' }, host);
    if (result.state !== 'found') {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      if (result.state === 'unavailable') res.setHeader('Retry-After', '60');
      return res.status(result.state === 'unavailable' ? 503 : 404).send(result.state === 'unavailable' ? 'Website information is temporarily unavailable.\n' : 'Website not found.\n');
    }
    if (!allowIndexing(result.expert)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.status(200).send('This website does not permit indexing.\n');
    }
    const line = value => String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const expert = result.expert;
    const origin = publicOrigin(expert, host);
    const lines = [`# ${line(expert.name || expert.display_name || 'Independent expert')}`, '', line(expert.title), '', line(expert.meta_description || expert.hero_tagline || expert.bio || expert.about_text), '', '## Published website pages', ...publishedPublicPages(expert).map(page => `- ${line(page.label)}: ${origin}${page.canonicalPath}`), ''];
    return res.status(200).send(lines.join('\n'));
  }
  const posts = readBlogPosts();
  const platformLines = [
    '# Ownlybiz', '',
    'Ownlybiz is software infrastructure for independent professionals to publish branded expert websites, offer paid chat, voice, video and written services, manage clients, and use booking and email tools. Feature availability depends on account eligibility, plan, configuration and required approvals.', '',
    '## Identity and service boundaries',
    'Ownlybiz provides the platform. Independent experts provide their own services and remain separate businesses. An expert listing or hosted website does not make that expert the Ownlybiz organization.',
    'Ownlybiz does not guarantee clients, expert earnings, professional outcomes, search rankings or AI citations.', '',
    '## AI feature boundaries',
    'Marketing and website AI tools assist with drafts for expert review before publication or sending.',
    'Human Reply Assistant prepares suggestions for the expert to review and send.',
    'Automatic AI Chat is a separate, controlled client-facing capability. Availability depends on platform authorization, expert configuration and the required consent. It is not the same feature as Human Reply Assistant.', '',
    '## Canonical public resources',
    '- Homepage: https://ownlybiz.com/',
    '- How it works: https://ownlybiz.com/how',
    '- Features: https://ownlybiz.com/features',
    '- Current pricing and plan details: https://ownlybiz.com/pricing',
    '- Expert types: https://ownlybiz.com/experts',
    '- Contact: https://ownlybiz.com/contact',
    '- Terms: https://ownlybiz.com/legal/terms',
    '- Privacy: https://ownlybiz.com/legal/privacy',
    '- Guides: https://ownlybiz.com/blog',
    '- Guide JSON index: https://ownlybiz.com/blog/index.json', '',
    '## Guides',
    ...posts.map((post) => `- ${post.title}: https://ownlybiz.com/blog/${encodeURIComponent(post.slug)}`), '',
    'Guides are educational product and operational information, not regulated professional advice. Consult the current pricing, eligibility and policy pages for the applicable terms.', '',
  ];
  res.status(200).send(platformLines.join('\n'));
};
