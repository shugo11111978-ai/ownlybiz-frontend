// Narrow marketing-copy qualifications and accessible reading aids only.
// No paid-flow configuration or availability is changed by this module.
const availability = 'This is a service-design comparison, not confirmation that every format is purchasable on every Ownlybiz account. Use only the options currently enabled for your account. Legacy package, fixed-session or written-service templates are not proof of availability; separately enabled On Demand written services have their own requirements.';
const tables = {
  'expert-business-tool-stack-vs-ownlybiz': {
    section: 'Copy this cost worksheet for each option',
    title: 'Cost worksheet at a glance',
    columns: ['Record separately', 'What to verify'],
    rows: [
      ['Subscriptions', 'Required plan, upgrades and billing interval'],
      ['Platform charges', 'Fee percentage and eligible revenue basis'],
      ['Processing', 'Actual account, currency and payment-method terms'],
      ['Retained services', 'Email provider, domain and other tools still needed'],
      ['Unknowns', 'Record Unknown, not zero; include source and date'],
      ['Administration time', 'Keep estimated time separate from cash costs']
    ],
    note: 'Use the same service and billing period for both setups. This is a planning aid, not a fee quote or savings forecast.'
  },
  'independent-expert-dashboard-checklist': {
    section: 'How to use the worksheet',
    title: 'One evidence record for each check',
    columns: ['Field', 'What to write'],
    rows: [
      ['Result', 'Yes, No or Unsure for this specific question'],
      ['Evidence', 'The page, setting or approved example inspected'],
      ['Limitation', 'What remains unverified'],
      ['Next action', 'The question or authorized check needed next']
    ],
    note: 'A public setting is not proof that a transaction or message completed. Start read-only; do not create a charge to fill in the worksheet.'
  },
  'chat-voice-video-written-session-formats': {
    section: 'How to choose formats',
    title: 'Match the format to the client’s need',
    columns: ['Format', 'A useful fit'],
    rows: [
      ['Chat', 'Concise, text-friendly back-and-forth'],
      ['Voice', 'Questions where tone and conversation matter'],
      ['Video', 'Demonstration or shared visual context'],
      ['Written', 'A structured response the client can wait for']
    ],
    note: 'These are service-design considerations. Confirm which formats are enabled on the specific account before advertising them.'
  },
  'consultation-promotions-discounts-intro-minutes-prepaid-credit': {
    section: 'Choose one of three different mechanisms',
    title: 'Three offers, three different meanings',
    columns: ['Mechanism', 'What it changes'],
    rows: [
      ['Discount', 'The eligible price, under the configured conditions'],
      ['Intro minutes', 'Limited introductory time to assess fit'],
      ['Prepaid credit', 'Funded value for eligible future use']
    ],
    note: 'Credit is not automatically a discount, reserved appointment, fixed number of minutes or unlimited service. Check plan eligibility and applicable terms.'
  }
};

export default function articleClarity(source) {
  const post = structuredClone(source);
  let changed = false;
  if (post.relatedFeatures.some(feature => /\b(?:packages|fixed sessions)\b/i.test(feature))) {
    post.relatedFeatures = post.relatedFeatures.filter(feature => !/\b(?:packages|fixed sessions)\b/i.test(feature));
    changed = true;
  }
  if (post.slug === 'ownlybiz-transparent-platform-fees-expert-keep-rate') {
    const fees = post.sections.find(section => section.heading === 'What “transparent platform fee” should mean');
    fees.body[0] = 'A transparent platform fee means the expert can understand the platform’s share before building their pricing strategy. The client pays for an enabled service, payment processing is handled through the configured payment flow, and Ownlybiz applies the applicable platform fee for the expert plan and service type.';
    changed = true;
  }
  if (['packages-fixed-sessions-per-minute-pricing', 'stripe-apple-pay-google-pay-expert-checkout', 'chat-voice-video-written-session-formats'].includes(post.slug)) {
    post.sections[0].body.push(availability);
    changed = true;
  }
  if (post.slug === 'pay-by-minute-sessions-guide') {
    post.faqs.find(faq => faq.question === 'Can experts combine pay-by-minute with packages?').answer = 'As a service-design approach, per-minute help can complement structured repeat support. On Ownlybiz, advertise a package only if that purchase option is currently enabled for your account; an old template does not prove availability.';
    changed = true;
  }
  if (post.slug === 'packages-fixed-sessions-per-minute-pricing') {
    post.summary = 'Compare per-minute, fixed-scope and bundled service designs by client need. These are planning models; confirm the options currently enabled on your Ownlybiz account before advertising them.';
  }
  if (post.slug === 'stripe-apple-pay-google-pay-expert-checkout') {
    const checkout = post.sections.find(section => section.heading === 'Checkout formats Ownlybiz can support');
    checkout.body = ['Pay-by-minute sessions, prepaid credit and separately enabled written services have different payment requirements. Use only options currently enabled for the account; legacy fixed-session and package templates do not establish purchasable availability.'];
    checkout.bullets = ['Pay-by-minute sessions for live time-based work.', 'Separately enabled On Demand written services, subject to configuration.', 'Prepaid client credit for eligible future use under the applicable terms.'];
  }
  if (post.slug === 'custom-domain-expert-website') {
    post.faqs.find(faq => faq.question === 'Can experts use Ownlybiz without a custom domain?').answer = 'Yes. Experts can start with an Ownlybiz-hosted presence. Adding a custom domain later depends on plan eligibility and completed configuration; domain registration and renewal may carry separate costs.';
    post.sections.find(section => section.heading === 'What Ownlybiz gives the expert site').bullets[2] = 'Chat, voice, video and separately enabled written-service options, subject to account availability.';
    changed = true;
  }
  if (post.slug === 'ownlybiz-feature-map-for-experts') {
    post.seoDescription = 'A feature map of Ownlybiz for independent experts, covering websites, domains, payments, live sessions, client administration, Email Center and marketing drafts, subject to eligibility and setup.';
    const sell = post.sections.find(section => section.heading === 'Sell');
    sell.body = ['Start with the service options currently enabled on your Ownlybiz account. Legacy fixed-session or package templates do not establish that those purchase options are available. Written On Demand services have separate enablement requirements.'];
    sell.bullets = ['Pay-by-minute chat, voice and video sessions.', 'Separately enabled On Demand written services, where configured.', 'Prepaid client credit, subject to applicable setup and terms.', 'Promotion codes where eligible.', 'Stripe-powered card and wallet checkout when available.'];
    post.sections.find(section => section.heading === 'Manage').body = ['The expert dashboard brings together client, booking, session and message information with controls for rates, availability, payouts, website settings and analytics. Confirm eligibility and current availability for each workflow before promising it to clients.'];
    post.faqs[0].answer = 'No. Start with the core workflow you need, then evaluate additional email, domain, credit or promotion tools as the business matures. Eligibility, provider setup and enabled account options determine availability.';
    changed = true;
  }
  if (post.slug === 'ai-drafting-for-expert-marketing') {
    post.summary = 'Ownlybiz AI marketing tools help with drafting and content preparation, with expert or admin review before publishing or sending. This guide covers marketing assistance, not every separately enabled AI service.';
    post.takeaways[0] = 'AI features for marketing provide draft assistance for marketing/admin content.';
    post.takeaways[1] = 'This guide covers marketing drafting, testing, images and preparation support, not every AI feature on the platform.';
    post.sections[0].body[1] = 'This guide describes AI support for expert/admin marketing workflows. The human expert or admin remains responsible for reviewing these drafts, claims and publishing decisions; other separately enabled AI services are outside this guide’s scope.';
    post.faqs[0].question = 'How should Ownlybiz AI marketing tools be described?';
    post.faqs[0].answer = 'Describe these marketing tools as drafting, image, preview, testing and preparation support, with human review before publishing or sending. This description is not a statement about all separately enabled AI services.';
    changed = true;
  }
  const table = tables[post.slug];
  if (table) {
    const section = post.sections.find(section => section.heading === table.section);
    if (!section) throw new Error(`Missing visual-summary section: ${post.slug}`);
    const { section: _, ...summary } = table;
    section.visualSummary = summary;
    changed = true;
  }
  if (changed) post.dateModified = '2026-09-08';
  return post;
}
