const fs = require('fs');
const path = require('path');

const BLOG_POSTS_PATH = path.join(process.cwd(), 'data', 'ownlybiz-blog-posts.json');

function readBlogPosts() {
  try {
    const parsed = JSON.parse(fs.readFileSync(BLOG_POSTS_PATH, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

module.exports = async function handler(req, res) {
  const posts = readBlogPosts();
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
  res.status(200).send(lines.join('\n'));
};
