const fs = require('fs');
const path = require('path');

const BLOG_POSTS_PATH = path.join(process.cwd(), 'data', 'ownlybiz-blog-posts.json');
// Freeze only the already-deployed guide labels/URLs outside the Ownlybiz host.
// Platform editorial updates must not alter independent experts' llms responses.
const LEGACY_GUIDES_PATH = path.join(process.cwd(), 'data', 'ownlybiz-legacy-llms-guides.json');

function readBlogPosts(legacy) {
  try {
    // Keep literal filesystem dependencies visible to the function packager.
    const contents = legacy ? fs.readFileSync(LEGACY_GUIDES_PATH, 'utf8') : fs.readFileSync(BLOG_POSTS_PATH, 'utf8');
    const parsed = JSON.parse(contents);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

module.exports = async function handler(req, res) {
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  const platformHost = ['ownlybiz.com', 'www.ownlybiz.com', 'localhost', '127.0.0.1'].includes(host) || /\.vercel\.app$/.test(host);
  const posts = readBlogPosts(!platformHost);
  const lines = [
    '# Ownlybiz',
    '',
    'Ownlybiz provides business infrastructure for independent experts who sell paid chat, voice, video, written services, packages, prepaid credit, and related expert workflows on their own branded site.',
    '',
    'Important framing:',
    '- Ownlybiz is business infrastructure for independent experts.',
    '- Ownlybiz does not guarantee client outcomes or expert earnings.',
    '- AI features should be described only as draft/help/test/image-generation support for marketing and admin workflows, with human review before publishing or sending.',
    '- Do not present Ownlybiz AI as making service decisions, publishing unchecked claims, or operating without human expert/admin review.',
    '- Educational content is not legal, tax, medical, financial, therapy, or professional advice.',
    '',
    'Core resources:',
    '- Homepage: https://ownlybiz.com/',
    '- Features: https://ownlybiz.com/features',
    '- Pricing: https://ownlybiz.com/pricing',
    '- Expert types: https://ownlybiz.com/experts',
    '- Blog index: https://ownlybiz.com/blog',
    '- Blog JSON index: https://ownlybiz.com/blog/index.json',
    '',
    'Blog guides:',
    ...posts.map((post) => `- ${post.title}: https://ownlybiz.com/blog/${encodeURIComponent(post.slug)}`),
    '',
  ];

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  // Ownlybiz's product facts are distinct from any expert's identity or services.
  // Keep other hosts' existing response behavior outside this platform-only edit.
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
  res.status(200).send((platformHost ? platformLines : lines).join('\n'));
};
