// Original editorial art plus a three-cover local pilot. The session cover
// places actual source-UI captures with fictional demo data on original art.
const descriptions = {
  'ownlybiz-transparent-platform-fees-expert-keep-rate': 'Blank invoice and separate paper slips arranged with a pen on a warm wooden desk.',
  'expert-business-tool-stack-vs-ownlybiz': 'Original three-dimensional illustration of website, calendar, video, chat, email and payment symbols arranged as a software tool stack.',
  'pay-by-minute-sessions-guide': 'Actual Ownlybiz mobile and desktop chat interfaces with fictional demo messages, timer and rate on a dark lime-accented background.',
  'packages-fixed-sessions-per-minute-pricing': 'Stopwatch beside a single appointment card and grouped planning cards.',
  'stripe-apple-pay-google-pay-expert-checkout': 'Phone, unbranded payment card and paper service summary on a desk.',
  'custom-domain-expert-website': 'Independent professional studio entrance with a blank nameplate.',
  'turn-social-followers-into-paid-sessions': 'Fictional independent consultant speaking and gesturing toward a laptop during an illustrated remote consultation.',
  'free-intro-minutes-without-undervaluing-work': 'Two fictional professionals greeting across a desk with an hourglass and closed notebook.',
  'chat-voice-video-written-session-formats': 'Keyboard, headset, webcam and written-response notebook arranged on a desk.',
  'expert-service-pages-that-convert': 'Printed service-page draft being reviewed at a professional workbench.',
  'email-marketing-for-independent-experts': 'Newsletter draft, envelope and a small selection of blank recipient cards.',
  'ai-drafting-for-expert-marketing': 'Hand reviewing a draft with a pencil beside alternative paper drafts.',
  'independent-expert-dashboard-checklist': 'Launch-planning worksheet beside a closed laptop, phone and pencil.',
  'repeat-client-system-packages-credit-email': 'Successive portfolio drafts with review notes arranged on a worktable.',
  'ownlybiz-feature-map-for-experts': 'Independent professional workspace arranged for preparation, consultation and follow-up.',
  'linkedin-content-plan-independent-experts': 'Four-week editorial planning board with two blank post notes in each week.',
  'human-expertise-value-ai-answers': 'Two fictional professionals examining a detail together beside reference papers.',
  'consultation-promotions-discounts-intro-minutes-prepaid-credit': 'Blank price tag, small hourglass and unbranded stored-value card arranged separately.'
};

const pilotCaptions = {
  'expert-business-tool-stack-vs-ownlybiz': 'Original editorial illustration of a software tool stack, not a product screen or cost comparison result.',
  'pay-by-minute-sessions-guide': 'Actual Ownlybiz interfaces with fictional demo messages, timer and rate on an original illustrated background. No live session or charge.',
  'turn-social-followers-into-paid-sessions': 'Original illustration of a fictional consultant. Not a customer photograph or endorsement.'
};

export default function articleMedia(post) {
  if (!descriptions[post.slug]) throw new Error(`Missing original article image: ${post.slug}`);
  const base = `/assets/blog/${post.slug}-hero${pilotCaptions[post.slug] ? '-v2' : ''}`;
  return {
    ...post,
    image: `${base}.jpg`,
    imageAlt: descriptions[post.slug],
    media: {
      width: 1600,
      height: 900,
      sources: [640, 960, 1600].map(width => ({ src: `${base}-${width}.webp`, width })),
      caption: pilotCaptions[post.slug] || 'Original editorial illustration.'
    }
  };
}
