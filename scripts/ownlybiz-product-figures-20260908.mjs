// Current-source interface fixtures with fictional data, not authenticated live
// account captures. Only the approved seven articles receive these eight figures.
// Dimensions are verified against native captures and deterministic exports.
export const productFigureAssets = {
  'chat-desktop': {
    kind: 'product-screenshot',
    src: '/assets/blog/product-chat-desktop.png',
    webp: '/assets/blog/product-chat-desktop.webp',
    width: 753,
    height: 467,
    title: 'Expert chat workspace',
    alt: 'Current Ownlybiz expert chat workspace with a fictional client conversation and sample session controls.',
    caption: 'Actual Ownlybiz expert chat interface with a fictional demo conversation. No live session or charge.'
  },
  'chat-mobile': {
    kind: 'product-screenshot',
    src: '/assets/blog/product-chat-mobile.png',
    webp: '/assets/blog/product-chat-mobile.webp',
    width: 375,
    height: 768,
    title: 'Client chat on mobile',
    alt: 'Current Ownlybiz mobile client chat view with a fictional conversation and sample session information.',
    caption: 'Actual Ownlybiz client chat interface with fictional demo data and sample pricing. This is the client view, not a social-media inbox. No live session or charge.'
  },
  voice: {
    kind: 'product-screenshot',
    src: '/assets/blog/product-voice.png',
    webp: '/assets/blog/product-voice.webp',
    width: 375,
    height: 768,
    title: 'Client voice-session interface',
    alt: 'Ownlybiz client voice interface showing Alex Morgan as a fictional participant, sample timer and amount, mute and end-call controls.',
    caption: 'Actual Ownlybiz voice interface, scrolled to show the call controls. Fictional demo participant, timer and amount; no connected call or charge.'
  },
  video: {
    kind: 'product-screenshot',
    src: '/assets/blog/product-video.png',
    webp: '/assets/blog/product-video.webp',
    width: 375,
    height: 768,
    title: 'Client video-session interface',
    alt: 'Current Ownlybiz client video-session interface with fictional participant portraits and sample session controls.',
    caption: 'Actual Ownlybiz video interface with original, fictional participant portraits and sample pricing. The portraits are static demo images; no connected call or charge.'
  },
  clients: {
    kind: 'product-screenshot',
    src: '/assets/blog/product-clients.png',
    webp: '/assets/blog/product-clients.webp',
    width: 1175,
    height: 510,
    title: 'Expert client management',
    alt: 'Current Ownlybiz expert Clients view with fictional names, reserved example email addresses and synthetic activity and credit values.',
    caption: 'Actual Ownlybiz Clients interface with fictional demo records and sample activity. No real customer data is shown.'
  },
  domain: {
    kind: 'product-screenshot',
    src: '/assets/blog/product-domain.png',
    webp: '/assets/blog/product-domain.webp',
    width: 673,
    height: 456,
    title: 'Domain and website settings',
    alt: 'Current Ownlybiz expert Domain & Website settings with a reserved example domain in the unsubmitted Connect Domain field.',
    caption: 'Actual Ownlybiz domain settings with a reserved fictional example domain. The form is unsubmitted; no domain was connected or activated.'
  },
  promotions: {
    kind: 'product-screenshot',
    src: '/assets/blog/product-promotions.png',
    webp: '/assets/blog/product-promotions.webp',
    width: 1111,
    height: 440,
    title: 'Expert promotion-code settings',
    alt: 'Current Ownlybiz expert Promotion Codes controls with an unsubmitted form and a paused fictional demo code.',
    caption: 'Actual Ownlybiz promotion settings with a paused fictional demo code. No promotion was created or activated; the sample discount is not a public offer.'
  },
  'email-compose': {
    kind: 'product-screenshot',
    src: '/assets/blog/product-email-compose.png',
    webp: '/assets/blog/product-email-compose.webp',
    width: 604,
    height: 533,
    title: 'AI-assisted email drafting controls',
    alt: 'Ownlybiz Email Center AI prompt, call-to-action fields, optional image request, and Generate email, Generate image only and Refresh preview controls.',
    caption: 'A focused crop of the actual Ownlybiz Email Center with a fictional example prompt. The email provider was off; no AI generation, preview request or email send occurred.'
  }
};

export const productFigurePlacements = {
  'pay-by-minute-sessions-guide': {
    section: 'Give clients clarity before the clock matters',
    figures: ['chat-desktop']
  },
  'turn-social-followers-into-paid-sessions': {
    section: 'Use Ownlybiz to reduce the handoff friction',
    figures: ['chat-mobile']
  },
  'custom-domain-expert-website': {
    section: 'What Ownlybiz gives the expert site',
    figures: ['domain']
  },
  'chat-voice-video-written-session-formats': {
    section: 'How to choose formats',
    figures: ['voice', 'video']
  },
  'email-marketing-for-independent-experts': {
    section: 'Turn the message into a reviewed draft',
    figures: ['email-compose']
  },
  'ownlybiz-feature-map-for-experts': {
    section: 'Manage',
    figures: ['clients']
  },
  'consultation-promotions-discounts-intro-minutes-prepaid-credit': {
    section: 'Make the settings match the sentence',
    figures: ['promotions']
  }
};

export default function productFigures(source) {
  const placement = productFigurePlacements[source.slug];
  if (!placement) return source;
  const post = structuredClone(source);
  const sections = post.sections.filter(section => section.heading === placement.section);
  if (sections.length !== 1) {
    throw new Error(`Expected one product-figure section: ${post.slug} / ${placement.section}`);
  }
  sections[0].productFigures = placement.figures.map(view => {
    const figure = productFigureAssets[view];
    if (!figure) throw new Error(`Missing product-figure metadata: ${view}`);
    return { ...figure };
  });
  return post;
}
