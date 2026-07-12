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
  const posts = readBlogPosts().map((post) => ({
    title: post.title,
    slug: post.slug,
    url: `https://ownlybiz.com/blog/${encodeURIComponent(post.slug)}`,
    category: post.category,
    date: post.date,
    readTime: post.readTime,
    summary: post.summary,
    tags: post.tags || [],
    features: post.relatedFeatures || [],
    image: `https://ownlybiz.com${post.image}`,
  }));

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).json({
    name: 'Ownlybiz Blog',
    description: 'Practical guides for independent experts using Ownlybiz business infrastructure.',
    url: 'https://ownlybiz.com/blog',
    posts,
  });
};
