import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import contentWave20260906 from './ownlybiz-content-wave-20260906.mjs';
import promotionGuide20260906 from './ownlybiz-promotion-guide-20260906.mjs';
import reviewInformedUpdates20260907 from './ownlybiz-review-informed-updates-20260907.mjs';

const root = process.cwd();
const dataDir = path.join(root, 'data');
const assetDir = path.join(root, 'assets', 'blog');
const contentOnly = process.argv.includes('--content-only');
fs.mkdirSync(dataDir, { recursive: true });
if (!contentOnly) fs.mkdirSync(assetDir, { recursive: true });

const posts = [
  {
    slug: 'ownlybiz-transparent-platform-fees-expert-keep-rate',
    title: 'Ownlybiz and Transparent Platform Fees: How Independent Experts Keep More of Each Session',
    category: 'Platform Fees',
    date: '2026-06-14',
    image: '/assets/blog/ownlybiz-transparent-platform-fees-expert-keep-rate.png',
    imageAlt: 'Ownlybiz-style dashboard illustration showing a session payment flowing to an expert with a small transparent platform fee.',
    summary: 'Ownlybiz is built around a simple idea: experts should understand what the platform takes, what payment processors may charge, and what they keep before they start selling sessions.',
    seoDescription: 'Learn how Ownlybiz frames platform fees, expert keep rate, Stripe-powered payments, and direct client relationships for independent experts.',
    tags: ['platform fees', 'expert keep rate', 'pricing', 'payments'],
    audience: 'Independent consultants, coaches, advisors, creators, wellness professionals, and specialty experts comparing paid-session tools.',
    email: {
      subject: 'Keep more of every expert session',
      preheader: 'A plain-English guide to Ownlybiz platform fees and expert keep rate.',
      segment: 'Expert leads comparing platforms',
      cta: 'Compare expert earnings'
    },
    takeaways: [
      'Use “expert keep rate” and “transparent platform fee” instead of vague payout promises.',
      'Separate Ownlybiz platform fees from Stripe or card-network processing fees.',
      'Compare total tools and workflow, not only headline percentages.'
    ],
    sections: [
      {
        heading: 'The practical question is not just “what does it cost?”',
        body: [
          'Independent experts usually compare tools by asking how much money they keep after a client pays. That is the right starting point, but it is not the whole decision. A paid-session business also needs checkout, scheduling, client records, live-session tools, receipts, service pages, and follow-up communication.',
          'Ownlybiz should be evaluated as business infrastructure for independent experts, not as a staffing agency, employer, or lead marketplace. The platform provides the rails for experts to present their services, accept payments, run sessions, and manage client workflows under their own brand.'
        ]
      },
      {
        heading: 'What “transparent platform fee” should mean',
        body: [
          'A transparent platform fee means the expert can understand the platform’s share before building their pricing strategy. It should be easy to explain: the client pays for a session or package, payment processing is handled securely, and Ownlybiz applies the configured platform fee for the expert plan and service type.',
          'Payment processor fees, chargebacks, refunds, taxes, and plan-specific settings can affect net results. A useful platform does not hide those realities. It helps the expert price with eyes open.'
        ],
        bullets: [
          'Show the client-facing price clearly.',
          'Keep payment processing separate from platform positioning.',
          'Let the expert design rates, packages, and free intro minutes with margin in mind.',
          'Avoid income guarantees or invented benchmarks.'
        ]
      },
      {
        heading: 'Why expert keep rate matters',
        body: [
          'For an expert, a few percentage points can matter because sessions are high-attention work. A coach, advisor, tutor, reader, strategist, or consultant is not selling a generic download; they are selling focused time and judgment.',
          'When the platform fee is low and clear, the expert has more room to create client-friendly offers: a short intro session, a package for repeat clients, a paid written review, or a higher-touch video consultation. That flexibility is often more valuable than a single “one size fits all” checkout page.'
        ]
      },
      {
        heading: 'How to compare Ownlybiz with other tool stacks',
        body: [
          'The cleanest comparison is not “Ownlybiz versus one calendar app.” It is Ownlybiz versus the collection of tools an expert might otherwise stitch together: website builder, scheduling, video link, payment page, client spreadsheet, email tool, package checkout, receipts, and manual follow-up.',
          'A stitched stack can work, but it adds operational drag. Ownlybiz is meant to reduce that drag by giving experts one branded place to sell and deliver paid sessions.'
        ],
        bullets: [
          'Can clients pay by minute, package, fixed session, or prepaid credit?',
          'Can the expert run chat, voice, and video without sending clients through multiple tools?',
          'Can the expert follow up with email campaigns and client lists?',
          'Can the expert use a custom domain and branded service pages?',
          'Can the expert see sessions, clients, payments, and launch readiness in one dashboard?'
        ]
      },
      {
        heading: 'Bottom line',
        body: [
          'Ownlybiz is strongest for experts who want a branded paid-session business with clear economics and fewer disconnected tools. The platform fee should be described plainly, the expert should still price responsibly, and every article or campaign should avoid promising specific earnings.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Does Ownlybiz guarantee an expert will earn more?',
        answer: 'No. Ownlybiz provides infrastructure for selling and managing expert services. Earnings depend on the expert’s offer, audience, pricing, availability, demand, and client experience.'
      },
      {
        question: 'Are processor fees the same as platform fees?',
        answer: 'No. Stripe, card networks, wallets, refunds, disputes, taxes, or other processor-related costs may be separate from the Ownlybiz platform fee.'
      },
      {
        question: 'What should experts compare before choosing a platform?',
        answer: 'Compare total workflow: branded site, checkout, payment options, session tools, packages, client management, email follow-up, analytics, and support for your service format.'
      }
    ],
    relatedFeatures: ['Transparent platform fee model', 'Stripe Connect payouts', 'Expert dashboard', 'Packages', 'Pay-by-minute sessions']
  },
  {
    slug: 'expert-business-tool-stack-vs-ownlybiz',
    title: 'One Expert Business Tool Stack vs. Many Separate Apps',
    category: 'Operations',
    date: '2026-06-14',
    image: '/assets/blog/expert-business-tool-stack-vs-ownlybiz.png',
    imageAlt: 'Branded illustration of separate business apps merging into one Ownlybiz expert command center.',
    summary: 'Many experts start with a patchwork of tools. Ownlybiz brings the main paid-session workflow into one branded operating layer.',
    seoDescription: 'Compare a multi-app expert business stack with Ownlybiz features for payments, sessions, client management, email, and branded pages.',
    tags: ['operations', 'tool stack', 'expert dashboard', 'workflow'],
    audience: 'Experts using calendars, payment links, video tools, spreadsheets, and email apps separately.',
    email: {
      subject: 'Still running your expert business from five apps?',
      preheader: 'Here is what changes when your sessions, payments, clients, and pages live together.',
      segment: 'Leads with existing tools',
      cta: 'See the Ownlybiz workflow'
    },
    takeaways: [
      'A multi-app stack can create hidden admin work.',
      'Ownlybiz centralizes the paid-session workflow while keeping the expert’s brand front and center.',
      'The value is operational clarity, not magic automation.'
    ],
    sections: [
      {
        heading: 'The hidden cost of “just use separate tools”',
        body: [
          'A calendar, a payment link, a video link, a contact form, and a spreadsheet can get an expert started. The problem appears after the first few clients: rescheduling, receipts, client notes, payment status, follow-up, service pages, and repeat offers start living in different places.',
          'That fragmentation costs attention. Experts make money from focused service delivery, so every avoidable admin task steals time from the work clients actually value.'
        ]
      },
      {
        heading: 'What Ownlybiz puts in one place',
        body: [
          'Ownlybiz is designed around the actual workflow of an independent expert: present a credible website, let clients choose a service, take secure payment, run the session, keep useful records, and follow up later.'
        ],
        bullets: [
          'Branded expert website and service pages.',
          'Pay-by-minute, fixed session, package, written/async, and prepaid-credit options.',
          'Chat, voice, and video session surfaces.',
          'Client list, contact messages, reviews, and session history.',
          'Email Center tools for opt-in audience communication.',
          'Analytics and launch-status guidance inside the dashboard.'
        ]
      },
      {
        heading: 'The expert still owns the business decisions',
        body: [
          'Infrastructure does not replace judgment. Experts still decide what they offer, what they charge, when they are available, how they communicate boundaries, and what professional rules apply to their field.',
          'Ownlybiz works best when it reduces admin friction while leaving the expert in control of their brand and service model.'
        ]
      },
      {
        heading: 'When a unified stack matters most',
        body: [
          'A unified stack becomes especially useful when an expert offers more than one service format. For example, a business strategist may sell a 15-minute pay-by-minute call, a 45-minute fixed session, a written review, and a monthly package. Each option needs different client expectations and payment handling.',
          'A platform built for those formats helps the expert explain choices clearly instead of pushing every client through the same generic checkout.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Should every expert replace all existing tools at once?',
        answer: 'Not necessarily. Experts should compare workflow, cost, and client experience. Ownlybiz is most useful when paid sessions, payments, client follow-up, and branded pages need to work together.'
      },
      {
        question: 'Does Ownlybiz manage the expert’s business for them?',
        answer: 'No. Ownlybiz provides tools and infrastructure. Experts remain responsible for their offers, client relationships, professional obligations, and business decisions.'
      }
    ],
    relatedFeatures: ['Expert website', 'Client dashboard', 'Payments', 'Email Center', 'Analytics']
  },
  {
    slug: 'pay-by-minute-sessions-guide',
    title: 'Pay-By-Minute Sessions: A Practical Guide for Independent Experts',
    category: 'Pricing',
    date: '2026-06-14',
    image: '/assets/blog/pay-by-minute-sessions-guide.png',
    imageAlt: 'Ownlybiz-style timer and payment meter illustration for pay-by-minute expert sessions.',
    summary: 'Pay-by-minute sessions are useful when clients need immediate help, variable time, or a lightweight way to start working with an expert.',
    seoDescription: 'A practical guide to pay-by-minute expert sessions, rates, free intro minutes, billing clarity, and client expectations.',
    tags: ['pay by minute', 'pricing', 'sessions', 'free minutes'],
    audience: 'Experts considering live chat, voice, or video sessions billed by time.',
    email: {
      subject: 'Should you offer pay-by-minute sessions?',
      preheader: 'Use this framework before setting your first per-minute rate.',
      segment: 'New expert onboarding',
      cta: 'Set up session pricing'
    },
    takeaways: [
      'Pay-by-minute works best when the client problem is urgent or hard to scope in advance.',
      'Clear rates, free intro minutes, and visible session status reduce confusion.',
      'Experts should set boundaries before the session starts.'
    ],
    sections: [
      {
        heading: 'What pay-by-minute is good for',
        body: [
          'Some expert work does not fit neatly into a fixed appointment. A client may need a fast review, a quick decision check, a short reading, a bug triage, a strategy reaction, or a focused conversation before committing to a larger package.',
          'Pay-by-minute lets the client start smaller while still compensating the expert for real attention.'
        ]
      },
      {
        heading: 'Set a rate that matches the format',
        body: [
          'A chat session, voice call, and video session can require different energy levels. Video may involve more context, presence, and preparation. Chat may allow more concise back-and-forth. Voice often sits between the two.',
          'Ownlybiz lets experts set channel-specific rates, so the price can reflect the way the service is delivered.'
        ],
        bullets: [
          'Use a simple rate for the first version.',
          'Explain what clients can expect in the first few minutes.',
          'Consider free intro minutes when clients need reassurance before billing starts.',
          'Review your actual client questions before raising or lowering rates.'
        ]
      },
      {
        heading: 'Use free intro minutes carefully',
        body: [
          'Free intro minutes can reduce hesitation, but they should not turn into free consulting. The safest framing is operational: confirm fit, clarify the client’s question, and make sure both sides are ready to continue.',
          'The expert should avoid using free time to deliver the full value of the session before paid time begins.'
        ]
      },
      {
        heading: 'Give clients clarity before the clock matters',
        body: [
          'Clients should know the rate, the channel, the expected session style, and any limitations before they start. Clear expectations reduce refund pressure and improve trust.'
        ],
        bullets: [
          'Show the rate and channel before checkout.',
          'Use service descriptions that say what is included and excluded.',
          'Keep cancellation/refund language easy to find.',
          'Avoid promising outcomes inside the rate description.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Is pay-by-minute right for every expert?',
        answer: 'No. It is best for focused, real-time help where the time needed can vary. Some services work better as fixed sessions, packages, or written reviews.'
      },
      {
        question: 'Can experts combine pay-by-minute with packages?',
        answer: 'Yes. Pay-by-minute can be an entry point, while packages can serve clients who want repeated or structured support.'
      }
    ],
    relatedFeatures: ['Pay-by-minute rates', 'Free intro minutes', 'Chat sessions', 'Voice sessions', 'Video sessions']
  },
  {
    slug: 'packages-fixed-sessions-per-minute-pricing',
    title: 'Packages, Fixed Sessions, and Per-Minute Pricing: How to Choose the Right Offer',
    category: 'Monetization',
    date: '2026-06-14',
    image: '/assets/blog/packages-fixed-sessions-per-minute-pricing.png',
    imageAlt: 'Three Ownlybiz pricing cards showing per-minute, fixed session, and package offers.',
    summary: 'Experts do not need one pricing model for every client. Ownlybiz supports multiple offer types so the service can match the client need.',
    seoDescription: 'Compare packages, fixed sessions, written services, and per-minute pricing for independent experts using Ownlybiz.',
    tags: ['packages', 'fixed sessions', 'pricing', 'monetization'],
    audience: 'Experts designing their first paid service menu.',
    email: {
      subject: 'Per-minute, package, or fixed session?',
      preheader: 'A simple way to choose the right offer type for each client need.',
      segment: 'Experts setting up services',
      cta: 'Design your first offer'
    },
    takeaways: [
      'Use per-minute for variable live help.',
      'Use fixed sessions for a defined appointment or deliverable.',
      'Use packages for repeat support or structured client journeys.'
    ],
    sections: [
      {
        heading: 'Start with the client’s decision',
        body: [
          'Pricing should make the buying decision easier. If the client knows exactly what they need, a fixed session may feel clean. If they need open-ended help, per-minute can feel fair. If they need repeated support, a package can create structure.'
        ]
      },
      {
        heading: 'When per-minute works',
        body: [
          'Per-minute pricing is useful for real-time questions, triage, quick guidance, and sessions where the exact length is uncertain. It lets clients start without overbuying.'
        ],
        bullets: [
          'Quick strategy calls.',
          'Live chat guidance.',
          'Short readings or reviews.',
          'Technical triage.',
          'Follow-up conversations.'
        ]
      },
      {
        heading: 'When fixed sessions work',
        body: [
          'Fixed sessions work when the expert can define a clear scope: a 30-minute consultation, a 60-minute planning call, a single written review, or a focused service with a known outcome boundary.',
          'The key is not to overpromise. The fixed session should define the process and deliverables, not guarantee a result.'
        ]
      },
      {
        heading: 'When packages work',
        body: [
          'Packages are strongest for repeat clients. A client who wants ongoing guidance may prefer buying a bundle rather than checking out every time. Packages can also help experts plan workload and reduce one-off admin.'
        ],
        bullets: [
          'Multi-session coaching programs.',
          'Monthly advisor access.',
          'A bundle of written reviews.',
          'VIP or high-touch client support.',
          'Starter packages for new clients.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Should experts show every pricing option at once?',
        answer: 'Usually no. Too many choices can slow clients down. Start with the few formats that match the clearest client needs.'
      },
      {
        question: 'Can packages create legal or refund complexity?',
        answer: 'They can if expectations are unclear. Experts should define what is included, when sessions expire if applicable, and how refunds or unused services are handled.'
      }
    ],
    relatedFeatures: ['Session packages', 'Fixed sessions', 'Pay-by-minute', 'Written services', 'Promotion codes']
  },
  {
    slug: 'stripe-apple-pay-google-pay-expert-checkout',
    title: 'Stripe, Apple Pay, Google Pay, and Expert Checkout: What Clients Need Before They Pay',
    category: 'Payments',
    date: '2026-06-14',
    image: '/assets/blog/stripe-apple-pay-google-pay-expert-checkout.png',
    imageAlt: 'Secure checkout illustration with card, Apple Pay, Google Pay, and Stripe-powered payment rails.',
    summary: 'A good expert checkout should feel clear, secure, and fast. Ownlybiz uses Stripe-powered flows and supports wallet options when available on the client’s device.',
    seoDescription: 'Understand expert checkout with Stripe, Apple Pay, Google Pay, card payments, authorizations, receipts, and payment clarity.',
    tags: ['Stripe', 'Apple Pay', 'Google Pay', 'checkout', 'payments'],
    audience: 'Experts who want clients to pay confidently before a live session or package.',
    email: {
      subject: 'Make expert checkout feel safer for clients',
      preheader: 'A plain-English payment guide for paid sessions and packages.',
      segment: 'Payment setup leads',
      cta: 'Review payment setup'
    },
    takeaways: [
      'Checkout clarity helps clients decide faster.',
      'Wallet availability depends on device, browser, region, and Stripe eligibility.',
      'Experts should explain payment timing without turning it into legal or financial advice.'
    ],
    sections: [
      {
        heading: 'Clients want payment clarity before trust',
        body: [
          'Before a client pays an expert online, they want to know what they are buying, who they are paying, when they may be charged, and what happens after payment. A beautiful page is helpful, but clarity is what makes checkout feel safe.'
        ]
      },
      {
        heading: 'Why Stripe-powered checkout matters',
        body: [
          'Ownlybiz uses Stripe-powered payment infrastructure so experts can accept payments through secure, familiar checkout patterns. Depending on eligibility and device support, clients may see card checkout, Apple Pay, Google Pay, or other wallet-style options supported by the payment flow.',
          'Availability can vary. Experts should not promise that every wallet appears for every client.'
        ]
      },
      {
        heading: 'Checkout formats Ownlybiz can support',
        body: [
          'Different services need different payment experiences. A pay-by-minute session is not the same as a package, and a written review is not the same as a live video consultation.'
        ],
        bullets: [
          'Pay-by-minute sessions for live time-based work.',
          'Fixed-price sessions for defined appointments.',
          'Packages for repeat services.',
          'Written or async services for non-live deliverables.',
          'Prepaid client credit for clients who want to add balance in advance.'
        ]
      },
      {
        heading: 'Reduce confusion with plain checkout copy',
        body: [
          'Experts should avoid dense policy language on the checkout button itself. Put the essentials near the decision: what the client gets, the price or rate, the session channel, and whether payment is authorized, charged now, or applied after a session depending on the flow.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Does Ownlybiz control Apple Pay or Google Pay availability?',
        answer: 'Wallet availability depends on Stripe support, the client’s browser/device, region, and payment configuration. Ownlybiz can support wallet flows where available, but experts should avoid promising universal availability.'
      },
      {
        question: 'Should experts discuss taxes in checkout copy?',
        answer: 'Experts should keep checkout copy clear and consult qualified tax or legal professionals for obligations specific to their business and location.'
      }
    ],
    relatedFeatures: ['Stripe payments', 'Apple Pay', 'Google Pay', 'Receipts', 'Prepaid credit']
  },
  {
    slug: 'custom-domain-expert-website',
    title: 'Why Your Expert Business Needs Its Own Website and Domain',
    category: 'Brand',
    date: '2026-06-14',
    image: '/assets/blog/custom-domain-expert-website.png',
    imageAlt: 'Ownlybiz branded website and custom domain cards connected to an expert profile.',
    summary: 'A branded site and custom domain help clients understand who they are hiring, what you offer, and how to book you without hunting across disconnected links.',
    seoDescription: 'Learn why independent experts benefit from branded websites, custom domains, service pages, booking flows, and clear client expectations.',
    tags: ['custom domain', 'expert website', 'brand', 'service pages'],
    audience: 'Experts who currently rely on social bios, link pages, or generic booking links.',
    email: {
      subject: 'Your expert business deserves more than a link page',
      preheader: 'How a branded site and domain help clients decide faster.',
      segment: 'Brand-conscious leads',
      cta: 'Build your expert site'
    },
    takeaways: [
      'A custom domain can make an expert business easier to remember and trust.',
      'Service pages should explain fit, format, limits, and next steps.',
      'A branded site supports future SEO, email campaigns, and repeat-client workflows.'
    ],
    sections: [
      {
        heading: 'A link page is not the same as a business home',
        body: [
          'Social profiles are useful for discovery, but they are not built to explain a professional service. A client who is about to pay for expert time needs more than a link button. They need context: who you help, what you offer, how sessions work, and what happens after they book.'
        ]
      },
      {
        heading: 'What Ownlybiz gives the expert site',
        body: [
          'Ownlybiz expert sites can combine service descriptions, booking, contact, reviews, session options, and payment flows in one branded place. Experts can use an Ownlybiz subdomain or connect a custom domain when available and configured.'
        ],
        bullets: [
          'Public expert profile and service pages.',
          'Booking and session entry points.',
          'Chat, voice, video, and written service options.',
          'Custom domain support.',
          'SEO settings and metadata controls.',
          'Client-facing trust signals such as reviews and clear service descriptions.'
        ]
      },
      {
        heading: 'The best expert websites answer five questions',
        body: [
          'A strong expert website does not need to be long. It needs to answer the questions that block a client from booking.'
        ],
        bullets: [
          'Who is this expert for?',
          'What can I book?',
          'How does the session work?',
          'What does it cost?',
          'What should I expect and what is not included?'
        ]
      }
    ],
    faqs: [
      {
        question: 'Does a custom domain guarantee SEO traffic?',
        answer: 'No. A custom domain helps brand clarity and long-term discoverability, but SEO depends on useful content, technical setup, links, search demand, and time.'
      },
      {
        question: 'Can experts use Ownlybiz without a custom domain?',
        answer: 'Yes. Experts can start with an Ownlybiz-hosted presence and add a custom domain later if it fits their brand strategy.'
      }
    ],
    relatedFeatures: ['Custom domain', 'Expert website builder', 'SEO settings', 'Booking pages', 'Reviews']
  },
  {
    slug: 'turn-social-followers-into-paid-sessions',
    title: 'How to Turn Social Followers and DMs Into Paid Expert Sessions',
    category: 'Growth',
    date: '2026-06-14',
    image: '/assets/blog/turn-social-followers-into-paid-sessions.png',
    imageAlt: 'Social messages flowing into an Ownlybiz booking and paid session workflow.',
    summary: 'The goal is not to move every conversation off social immediately. The goal is to give serious clients a clear path from interest to paid time.',
    seoDescription: 'A practical workflow for turning social followers, DMs, and content attention into paid expert sessions using Ownlybiz.',
    tags: ['social media', 'growth', 'booking', 'paid sessions'],
    audience: 'Experts with an audience who need a cleaner way to convert interest into paid help.',
    email: {
      subject: 'Turn DMs into paid expert sessions',
      preheader: 'A practical workflow for moving serious clients from social to booking.',
      segment: 'Audience-led experts',
      cta: 'Set up your booking path'
    },
    takeaways: [
      'Social should create attention; your expert site should convert serious intent.',
      'Use one clear link and one clear first offer.',
      'Move custom advice into paid time instead of long unpaid DM threads.'
    ],
    sections: [
      {
        heading: 'The problem with endless free DMs',
        body: [
          'Many experts are generous in private messages. That generosity can build trust, but it can also turn into unpaid consulting. The fix is not to become cold. The fix is to create a clear, respectful path for people who need real help.'
        ]
      },
      {
        heading: 'Create a simple DM-to-session script',
        body: [
          'The best script is short and honest. Answer lightly, confirm that the question deserves focused attention, and point to a paid session option.'
        ],
        bullets: [
          '“That is a good question and it depends on context.”',
          '“I can help you work through it in a short chat or voice session.”',
          '“Here is the booking link with the options and rates.”',
          '“If it is not a fit, no pressure.”'
        ]
      },
      {
        heading: 'Use Ownlybiz to reduce the handoff friction',
        body: [
          'A client who clicks from a DM should not land on a confusing general homepage. They should see the expert’s branded page, relevant services, clear session formats, and payment options.'
        ],
        bullets: [
          'Use a custom domain or memorable Ownlybiz link.',
          'Create a starter offer for first-time clients.',
          'Use free intro minutes only for fit and setup, not full delivery.',
          'Follow up with opt-in email content after sessions when appropriate.'
        ]
      },
      {
        heading: 'Protect the relationship',
        body: [
          'Moving to paid sessions should not feel like a hard sell. The tone matters: you are respecting both the client’s question and your own time.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Should every DM get a booking link?',
        answer: 'No. Some questions can be answered publicly or ignored. Use a booking link when the person needs personalized, context-specific help.'
      },
      {
        question: 'Can email marketing help after social conversion?',
        answer: 'Yes, if the client has opted in. Email can share educational follow-up, package offers, and reminders without relying only on social algorithms.'
      }
    ],
    relatedFeatures: ['Expert website link', 'Booking', 'Email Center', 'Free intro minutes', 'Packages']
  },
  {
    slug: 'free-intro-minutes-without-undervaluing-work',
    title: 'Free Intro Minutes Without Undervaluing Your Expert Work',
    category: 'Conversion',
    date: '2026-06-14',
    image: '/assets/blog/free-intro-minutes-without-undervaluing-work.png',
    imageAlt: 'Ownlybiz session timer illustration showing a short free intro period before paid time begins.',
    summary: 'Free intro minutes can lower client hesitation, but they work best when they are used for fit, context, and setup rather than unpaid delivery.',
    seoDescription: 'How independent experts can use free intro minutes responsibly in paid chat, voice, and video sessions.',
    tags: ['free minutes', 'conversion', 'pricing', 'client trust'],
    audience: 'Experts deciding whether to offer free intro time on live sessions.',
    email: {
      subject: 'Use free intro minutes without giving away the whole session',
      preheader: 'A safer way to reduce hesitation before paid expert time starts.',
      segment: 'Experts tuning conversion',
      cta: 'Review free-minute settings'
    },
    takeaways: [
      'Free intro minutes should clarify fit, not replace paid service.',
      'Set a short limit and explain what happens when paid time starts.',
      'Use the intro to confirm the client’s goal and boundaries.'
    ],
    sections: [
      {
        heading: 'Free does not have to mean unlimited',
        body: [
          'The purpose of free intro minutes is to reduce uncertainty. They give the client a moment to connect, confirm the topic, and decide whether to continue. They are not meant to deliver the full service before billing begins.'
        ]
      },
      {
        heading: 'A good free-intro structure',
        body: [
          'Experts can treat the intro like a doorway into the paid session.'
        ],
        bullets: [
          'Confirm the client’s question.',
          'Say whether the session format is appropriate.',
          'Explain what can be handled in the available time.',
          'Move into paid time before delivering detailed guidance.'
        ]
      },
      {
        heading: 'What to avoid',
        body: [
          'Avoid promising that the free intro will solve the issue. Avoid using it to make professional conclusions in sensitive fields. Avoid making the client feel tricked when paid time begins.'
        ]
      },
      {
        heading: 'How Ownlybiz helps',
        body: [
          'Ownlybiz supports free-minute settings so experts can create a cleaner client experience around live sessions. The expert still needs to explain expectations clearly and choose a free-minute length that fits their service.'
        ]
      }
    ],
    faqs: [
      {
        question: 'How many free minutes should an expert offer?',
        answer: 'There is no universal number. Start short, use the time for fit and setup, and adjust based on the type of service and client behavior.'
      },
      {
        question: 'Can free intro minutes reduce refund requests?',
        answer: 'They may reduce confusion when used clearly, but they do not guarantee satisfaction. Clear service descriptions and boundaries still matter.'
      }
    ],
    relatedFeatures: ['Free intro minutes', 'Pay-by-minute sessions', 'Session timer', 'Rate settings']
  },
  {
    slug: 'chat-voice-video-written-session-formats',
    title: 'Chat, Voice, Video, or Written Advice: Matching the Format to the Client Need',
    category: 'Service Design',
    date: '2026-06-14',
    image: '/assets/blog/chat-voice-video-written-session-formats.png',
    imageAlt: 'Four Ownlybiz session cards for chat, voice, video, and written expert services.',
    summary: 'A better expert business does not force every client into the same format. Ownlybiz supports multiple service styles so experts can match the work to the situation.',
    seoDescription: 'Compare chat, voice, video, and written expert services and learn how to choose the right format for each client need.',
    tags: ['chat', 'voice', 'video', 'written services', 'service design'],
    audience: 'Experts deciding which session channels to offer.',
    email: {
      subject: 'Which session format should you offer?',
      preheader: 'Chat, voice, video, and written services each solve a different client problem.',
      segment: 'Experts building service menus',
      cta: 'Choose session channels'
    },
    takeaways: [
      'Chat works for concise back-and-forth and lower-pressure questions.',
      'Voice and video work for nuance, trust, and complex context.',
      'Written services work when clients want a thoughtful response without a live call.'
    ],
    sections: [
      {
        heading: 'The format changes the service',
        body: [
          'The same expert can feel different across chat, voice, video, and written work. A client who wants a quick check may prefer chat. A client who needs context and tone may prefer voice. A client who wants presence may choose video. A client who wants a considered answer may prefer written work.'
        ]
      },
      {
        heading: 'How to choose formats',
        body: [
          'Start from the client’s need rather than your favorite tool.'
        ],
        bullets: [
          'Use chat for quick, focused, text-friendly help.',
          'Use voice when tone and pace matter.',
          'Use video when trust, complexity, or demonstration matter.',
          'Use written services when the client can wait for a structured answer.'
        ]
      },
      {
        heading: 'Pricing should reflect effort',
        body: [
          'Video may require more energy than chat. Written work may require more preparation than a quick call. Ownlybiz lets experts configure different rates and service formats, which makes it easier to price according to effort.'
        ]
      },
      {
        heading: 'Set expectations in each service description',
        body: [
          'A format label is not enough. Explain what clients should prepare, what the expert will cover, and what is outside scope. This is especially important for regulated or sensitive fields.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Should experts offer all formats immediately?',
        answer: 'Not always. Start with the formats you can deliver well and expand once you understand client demand.'
      },
      {
        question: 'Is written advice safer than live advice?',
        answer: 'Not automatically. Written services still need clear scope, professional boundaries, and human review by the expert.'
      }
    ],
    relatedFeatures: ['Chat sessions', 'Voice sessions', 'Video sessions', 'Written services', 'Service pages']
  },
  {
    slug: 'expert-service-pages-that-convert',
    title: 'How to Write Expert Service Pages That Convert and Set Clear Expectations',
    category: 'Conversion',
    date: '2026-06-14',
    dateModified: '2026-09-06',
    image: '/assets/blog/expert-service-pages-that-convert.png',
    imageAlt: 'Ownlybiz service page mockup with clear offer, scope, rate, and booking call-to-action.',
    summary: 'A useful service page answers a client’s practical questions before they book. Use this worked example and publishing checklist to explain the service, preparation, price format, boundaries, and next step.',
    seoDescription: 'Write a clear expert service page with a worked consultation example, preparation checklist, honest boundaries, and checks against your live booking options.',
    tags: ['service pages', 'conversion', 'copywriting', 'expectations'],
    audience: 'Experts writing public service descriptions for their Ownlybiz site.',
    email: {
      subject: 'Your service page should sell and set boundaries',
      preheader: 'Use this structure before publishing your next expert offer.',
      segment: 'Website setup leads',
      cta: 'Improve your service page'
    },
    takeaways: [
      'Good service copy qualifies clients as much as it persuades them.',
      'Every service page should explain format, fit, limits, and next steps.',
      'Avoid outcome guarantees and unsupported claims.'
    ],
    sections: [
      {
        heading: 'Answer the questions that come before booking',
        body: [
          'A visitor should be able to explain your offer to someone else after reading the page. They need to know who the service is for, what they can bring, how you will work together, what they are paying for, and what happens next. A headline such as “Transform your business” leaves all five questions unanswered.',
          'Start with one specific client situation. “Review the first screen of your portfolio before you send it to prospects” is easier to evaluate than “Unlock your potential.” It describes a task without guaranteeing sales, employment, or any other result you cannot control. Clear copy helps visitors choose; it does not guarantee a particular conversion rate.'
        ]
      },
      {
        heading: 'Worked example: a portfolio review page',
        body: [
          'The following is an illustrative offer for a designer who reviews freelance portfolios. It is not an Ownlybiz preset, a customer case study, or a claim about results. Adapt the scope and format to work you can actually deliver.',
          'Headline: “Get a second pair of eyes on your freelance portfolio.” Introduction: “Bring one portfolio page and the type of project you want it to attract. We will review whether the first screen explains your work, whether the examples support your positioning, and whether a prospective client can find a clear next step.”'
        ],
        bullets: [
          'Best fit: an independent designer with an existing portfolio page and one target type of client.',
          'Prepare: have the page URL ready and write down the one question you most want to resolve. Do not send passwords or private client material.',
          'During the session: work through the headline, project examples, and contact path together. Identify up to three changes to prioritize.',
          'Not included: a full website redesign, implementation, unlimited revisions, or a promise of new clients.',
          'Format and price: name the live channel you have enabled and direct visitors to its current rate before they start. Explain whether time is metered.',
          'Next step: “View the review options” linking to the public booking page. Use “Start now” only when that option is actually available.'
        ]
      },
      {
        heading: 'Make the deliverable observable',
        body: [
          'Replace “You will feel confident” with something the client can recognize: “We will compare two options and list the tradeoffs,” or “We will identify three places where the page is difficult to understand.” The first phrase predicts a feeling; the alternatives describe work you intend to do.',
          'Separate what happens during a live session from anything you will deliver afterward. If a written summary or an extra review is included, say what it covers and when you will provide it. If it is not included, do not imply that a live conversation automatically comes with a report. For a written offer, specify the question or material you accept, the response format, and the turnaround you can maintain.'
        ]
      },
      {
        heading: 'Keep the page consistent with enabled booking options',
        body: [
          'Ownlybiz separates website content from settings such as live channel rates, availability, and service configuration. Editing a sentence on a public page does not itself change those settings. Review both places when you update an offer. A visitor should not read one price or free-intro allowance on the homepage and encounter another on the booking page.',
          'Use only formats that are enabled for your expert site. A live conversation, a scheduled appointment, a written response, and a prepaid balance are different things. Do not advertise a package purchase or a fixed-price checkout just because the word “package” appears in an old template. Confirm the corresponding public option exists first; otherwise explain the sequence of separate visits instead.'
        ]
      },
      {
        heading: 'Use headings and FAQs that help a reader decide',
        body: [
          'A readable structure is more useful than repeating the same keyword. Use headings such as “Who this review is for,” “What to prepare,” and “What is included.” Put the direct answer at the start of each section, then add the detail needed to make it credible.',
          'Choose FAQs from actual questions about your service, not a generic list added to fill space. For the portfolio example, useful questions include “Do I need a finished portfolio?” and “Will you make the edits for me?” Answer plainly: a draft page may be enough to review, while implementation is outside this example’s scope. Describe your own offer accurately if its boundaries differ.'
        ]
      },
      {
        heading: 'Review the public page as a new visitor',
        body: [
          'Save the content using the website editor controls available to you, then inspect the public page in a separate signed-out window. Read it on a narrow screen as well as a desktop. This catches assumptions that are invisible when you already know how your service works.',
          'You can check the copy, links, and visible booking choices without completing a purchase. Confirm that the main action points to your own intended page, the service is available in the promised format, and the visible rate matches the wording. If something differs, resolve the mismatch before promoting the link.'
        ],
        bullets: [
          'Can a new reader identify the intended client and the task in the first paragraph?',
          'Are preparation, scope, timing, and any follow-up explained?',
          'Does every action label describe the page or option it opens?',
          'Are names, testimonials, and qualifications accurate and used with permission?',
          'Does the mobile page retain the same essential information?'
        ]
      },
      {
        heading: 'Improve the page using real questions',
        body: [
          'Keep a short list of questions prospects ask before booking. If several ask whether you review an entire site or only one page, revise that sentence near the top. If they ask when a written response arrives, move the turnaround next to the action. These are specific changes you can evaluate.',
          'Change one unclear part at a time and record what changed. A few bookings or a quiet week do not prove that a headline caused the result. Look for fewer repeated questions and a better match between what clients expected and what you delivered, alongside any traffic or booking data available to you.'
        ]
      }
    ],
    faqs: [
      {
        question: 'How long should an expert service page be?',
        answer: 'Long enough to explain fit, format, preparation, scope, and the next step without repetition. Start with a short overview, then use sections for details a client needs before booking. Length alone is not a quality target.'
      },
      {
        question: 'Should I put the same price in every paragraph?',
        answer: 'No. Keep pricing easy to find and consistent with the current booking options. Repeating rates in many blocks creates more places to miss when a rate changes. Copy changes do not update the configured rate.'
      },
      {
        question: 'Can I use an AI draft for my service page?',
        answer: 'You can use a draft as a starting point where drafting tools are available. Review the actual service, rates, availability, credentials, and claims yourself. Remove invented testimonials, unsupported results, and formats you have not enabled.'
      }
    ],
    relatedFeatures: ['Website editor', 'Service pages', 'Booking CTAs', 'SEO settings', 'Packages']
  },
  {
    slug: 'client-trust-receipts-reviews-availability-rules',
    title: 'Client Trust for Expert Businesses: Receipts, Reviews, Availability, and Clear Rules',
    category: 'Trust',
    date: '2026-06-14',
    image: '/assets/blog/client-trust-receipts-reviews-availability-rules.png',
    imageAlt: 'Trust-focused Ownlybiz illustration with receipt, review stars, availability calendar, and session rules.',
    summary: 'Clients are more likely to book when they can see how the service works, what they are paying for, and how the expert handles expectations.',
    seoDescription: 'How independent experts can build client trust with clear availability, receipts, reviews, session rules, and service descriptions.',
    tags: ['client trust', 'reviews', 'availability', 'receipts'],
    audience: 'Experts improving credibility before asking clients to pay online.',
    email: {
      subject: 'Trust signals that help clients book',
      preheader: 'Receipts, reviews, availability, and clear rules matter more than hype.',
      segment: 'Experts improving conversion',
      cta: 'Strengthen trust signals'
    },
    takeaways: [
      'Trust comes from clarity, not hype.',
      'Availability, reviews, receipts, and service boundaries reduce uncertainty.',
      'Experts should keep public claims accurate and field-appropriate.'
    ],
    sections: [
      {
        heading: 'Trust is built before the payment screen',
        body: [
          'A client does not only evaluate the price. They evaluate whether the expert seems real, whether the offer is clear, and whether the process feels safe. Small details can carry a lot of weight.'
        ]
      },
      {
        heading: 'Four trust signals experts can control',
        body: [
          'Ownlybiz gives experts several places to make the client experience clearer.'
        ],
        bullets: [
          'Availability: show realistic booking or live-session readiness.',
          'Receipts and payment clarity: help clients understand what they paid for.',
          'Reviews: display feedback without exaggerating claims.',
          'Service rules: explain scope, limits, and next steps.'
        ]
      },
      {
        heading: 'Avoid trust-damaging shortcuts',
        body: [
          'Fake urgency, unsupported income claims, and vague guarantees can create legal and reputational risk. The safer path is to explain your process and let clients decide whether it fits.'
        ]
      },
      {
        heading: 'Use the dashboard to keep promises aligned',
        body: [
          'An expert’s dashboard should match the public promise. If the site says live calls are available, availability and notifications should be configured. If the expert offers packages, package details should be clear. If the expert asks clients to opt into emails, campaigns should respect that opt-in.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Are reviews always safe to use in marketing?',
        answer: 'Reviews should be truthful, not misleading, and appropriate for the expert’s field. Some professions have special rules around testimonials.'
      },
      {
        question: 'What is the easiest trust improvement?',
        answer: 'Clarify what happens after the client pays: session format, timing, preparation, and what the expert can or cannot cover.'
      }
    ],
    relatedFeatures: ['Reviews', 'Availability', 'Receipts', 'Client records', 'Service descriptions']
  },
  {
    slug: 'email-marketing-for-independent-experts',
    title: 'Email Marketing for Independent Experts: What to Send After a Session',
    category: 'Email Marketing',
    date: '2026-06-14',
    dateModified: '2026-09-06',
    image: '/assets/blog/email-marketing-for-independent-experts.png',
    imageAlt: 'Ownlybiz Email Center illustration with campaign cards, opt-in audience segments, and preview panel.',
    summary: 'Plan one useful message for a specific opted-in audience, then review its content, sender, links, and recipients. This guide includes an example campaign and the preparation steps in Expert Email Center.',
    seoDescription: 'Plan an expert email campaign with a worked message, own-provider setup, consented lists, previews, audience review, scheduling, and delivery checks.',
    tags: ['email marketing', 'Email Center', 'campaigns', 'client retention'],
    audience: 'Experts who want repeat clients and useful follow-up campaigns.',
    email: {
      subject: 'What should you email clients after a session?',
      preheader: 'Useful campaign ideas for independent experts with opt-in audiences.',
      segment: 'Experts with client lists',
      cta: 'Plan your next campaign'
    },
    takeaways: [
      'A completed session is not the same as an invitation to send marketing.',
      'Use your own verified sending domain and test the provider before campaign delivery.',
      'Review the message and exact eligible audience before sending or scheduling.'
    ],
    sections: [
      {
        heading: 'Choose one reason to send the message',
        body: [
          'A useful campaign answers a question the recipient already has. A portfolio reviewer might explain how to choose project examples. A language tutor might share a preparation exercise. An advisor might announce new appointment hours. Choose one topic and one next step so the email is easy to understand without opening several links.',
          'Keep a private service follow-up separate from a bulk marketing campaign. A client-specific recap may contain information that belongs only with that client. A newsletter should contain general guidance suitable for everyone on its selected list. Do not paste session messages, personal details, or a private question into a campaign simply because the client recently booked.'
        ]
      },
      {
        heading: 'Check the audience before writing',
        body: [
          'Expert Email Center includes contact lists and an “All opted-in contacts” audience. A named list can make a message more relevant, but membership alone does not mean every address is eligible to receive it. Review consent and suppression status as well as the list name.',
          'For example, a list named “Portfolio tips” could contain people who specifically asked for those updates. It should not silently become every past client or every address in an imported spreadsheet. If you do not have a suitable audience, keep the campaign as a draft while you establish how people can ask to receive it.'
        ],
        bullets: [
          'Educational tip: send to people who requested updates on that subject.',
          'Availability update: explain the relevant channel or booking hours accurately.',
          'New service introduction: describe what changed and who the new format suits.',
          'Repeat-visit invitation: make the next step optional and specific; avoid guilt or invented urgency.'
        ]
      },
      {
        heading: 'Prepare your sender in Expert Email Center',
        body: [
          'Expert-to-client campaigns use the expert’s own email provider and verified sending domain. Ownlybiz platform account email is a separate service. In Email Center Settings, configure the supported provider you use, a recognizable From name, and a From address on your verified domain. An Ownlybiz address or subdomain is not a substitute for that sender.',
          'Complete the provider setup and its test before relying on delivery. The Email Center distinguishes “Provider off,” “Test send required,” and “Provider ready.” Campaign access also depends on your account’s entitlement. If the dashboard shows a plan restriction or a provider problem, resolve that first; writing a draft does not make the account ready to send.'
        ]
      },
      {
        heading: 'Worked example: one portfolio tip',
        body: [
          'This sample is an editorial example, not a sent campaign or evidence of business results. It assumes the expert offers portfolio reviews and the recipients opted into portfolio tips. Replace the service and destination with your own.',
          'Subject: “Does your first portfolio screen explain your work?” Preheader: “A quick check before you share your page.”',
          'Body: “Open your portfolio and look only at the first screen. Can a new visitor tell what kind of work you do, who you do it for, and where to see an example? If one answer is missing, draft a clearer sentence before adding another project. You can try this on your own. If you would like a second pair of eyes, my review page explains the format, preparation, and current booking options.”',
          'Action: “See portfolio review options.” Link it to the relevant public service or booking page, not an internal dashboard. Keep the sender identity and unsubscribe information intact. The email gives readers something usable even if they decide not to book.'
        ]
      },
      {
        heading: 'Turn the message into a reviewed draft',
        body: [
          'Create a campaign in Expert Email Center and choose the intended list. Enter the subject, preheader, body, and action destination. AI drafting and campaign-image tools can help where available, but generated material remains a draft. Check every service claim and link against your actual public site.',
          'Save the campaign and refresh its preview after edits. Once your provider is ready, use the campaign’s test option to inspect a real delivered version at the test recipient. Read the subject and preheader together, check the message on a small screen, and open the main link. A preview of an older draft is not a review of the latest copy.'
        ],
        bullets: [
          'Remove invented qualifications, client quotes, results, discounts, or availability.',
          'Keep sensitive session material out of bulk copy and AI prompts.',
          'Check image meaning and alternative text; the message should still make sense without the image.',
          'Confirm the link opens the intended public page and its current offer.'
        ]
      },
      {
        heading: 'Use final audience review before delivery',
        body: [
          'Review/send resolves the campaign audience and shows the audience label, eligible sends, skipped entries, and send cap. Compare those values with what you intended. “All opted-in contacts” is a broader choice than a specific list, so an unexpectedly large count is a reason to return to the draft and check the selection.',
          'For scheduled delivery, review the day offset, send time, and time zone together. A zero-day offset means today in the selected zone, and the scheduled time must still be in the future. Complete the content and audience confirmations only when you are ready to queue or schedule the reviewed message.',
          'Email Center offers “Stop queued” for remaining queued sends. It cannot recall messages already sent. Treat scheduling as a delivery commitment, not as another way to save a draft.'
        ]
      },
      {
        heading: 'Evaluate the next campaign without inventing a success story',
        body: [
          'After delivery, review the campaign’s sent, queued, and failed counts before interpreting engagement. Email Center also exposes open and click signals where collected. A click is not proof that a client booked, and a small campaign is not a reliable test of every possible headline.',
          'Keep a simple record: audience, purpose, message version, delivery date, reported results, and one change to try next. If recipients ask the same question, improve the service page or explain that point in a future tip. Do not increase frequency merely because one person booked after an email; use the response in context.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Does saving a campaign send it?',
        answer: 'No. Saving creates or updates the draft. Campaign delivery uses separate review and final confirmation steps. Scheduled campaigns are different: they have been approved for delivery at the selected future time.'
      },
      {
        question: 'Can I send a campaign to all past clients?',
        answer: 'Do not assume a previous booking grants marketing permission. Use the appropriate opted-in audience, respect unsubscribed or suppressed contacts, and check the eligible recipients in final audience review.'
      },
      {
        question: 'Why can the list count differ from eligible sends?',
        answer: 'A list can include contacts that are not eligible for a particular send, and a campaign can have a send cap. Review the eligible and skipped counts rather than treating the total list size as a delivery promise.'
      }
    ],
    relatedFeatures: ['Email Center', 'Audience segments', 'Campaign drafts', 'AI draft suggestions', 'Image generation']
  },
  {
    slug: 'ai-drafting-for-expert-marketing',
    title: 'AI Drafting for Expert Marketing: Helpful Suggestions, Human Review',
    category: 'AI Drafting',
    date: '2026-06-14',
    image: '/assets/blog/ai-drafting-for-expert-marketing.png',
    imageAlt: 'Ownlybiz marketing workspace illustration showing AI draft text and campaign image generation with human review.',
    summary: 'Ownlybiz AI features should be understood as drafting and content-preparation tools for marketing/admin workflows, with expert or admin review before anything is published or sent.',
    seoDescription: 'How experts can use AI-assisted drafting for marketing emails, campaign images, previews, and content ideas while keeping human review.',
    tags: ['AI drafting', 'marketing', 'Email Center', 'human review'],
    audience: 'Experts and admins using AI draft tools for marketing content.',
    email: {
      subject: 'Use AI drafts without losing human review',
      preheader: 'Safe ways to use AI for marketing copy, previews, and campaign images.',
      segment: 'Email Center users',
      cta: 'Draft a campaign'
    },
    takeaways: [
      'AI should be framed as draft assistance for marketing/admin content.',
      'Keep AI language limited to drafting, testing, images, and preparation support.',
      'Human review, consent boundaries, and claim control matter.'
    ],
    sections: [
      {
        heading: 'Use the right frame',
        body: [
          'AI can be useful for blank-page problems: drafting a marketing email, suggesting a subject line, creating a campaign image, refreshing a preview, or turning a rough idea into a first version. That stays separate from the paid professional service the expert personally delivers.',
          'Ownlybiz content should describe AI as support for expert/admin marketing workflows, with the human expert or admin responsible for decisions, claims, and client-facing work.'
        ]
      },
      {
        heading: 'Where AI drafting fits',
        body: [
          'AI drafting is most useful before the expert or admin makes a decision.'
        ],
        bullets: [
          'Suggesting email copy for an opt-in audience.',
          'Generating campaign image ideas or assets.',
          'Refreshing draft text while preserving the human’s intent.',
          'Creating a starting point for a marketing journey.',
          'Testing preview content before a campaign is reviewed.'
        ]
      },
      {
        heading: 'Human review is the control layer',
        body: [
          'Every AI draft should be reviewed for accuracy, tone, claims, legal sensitivity, and audience fit. This is especially important for experts in finance, wellness, legal, medical, therapy, psychic, coaching, or other sensitive fields.'
        ]
      },
      {
        heading: 'Safer language to use',
        body: [
          'Use phrases like “AI-assisted draft,” “suggested campaign copy,” “image generation for marketing assets,” and “review before sending.” Avoid language that suggests the tool makes client-facing decisions, delivers professional guidance, or operates without human review.'
        ]
      }
    ],
    faqs: [
      {
        question: 'What is the safe way to describe Ownlybiz AI tools?',
        answer: 'Describe them as drafting, image, preview, testing, and preparation support for marketing/admin workflows that require human review before publishing or sending.'
      },
      {
        question: 'Can AI drafts include legal or medical claims?',
        answer: 'Drafts should be reviewed carefully and edited to avoid unsupported or regulated claims. Experts should follow rules that apply to their field.'
      }
    ],
    relatedFeatures: ['AI draft suggestions', 'Email Center', 'Campaign images', 'Preview refresh', 'Human approval']
  },
  {
    slug: 'independent-expert-dashboard-checklist',
    title: 'The Independent Expert Dashboard Checklist: What to Set Up Before Going Live',
    category: 'Launch',
    date: '2026-06-14',
    image: '/assets/blog/independent-expert-dashboard-checklist.png',
    imageAlt: 'Ownlybiz expert dashboard checklist with launch status, payments, services, availability, and website setup.',
    summary: 'A good launch is not only a beautiful page. Experts should check payments, services, availability, profile copy, client expectations, and follow-up workflows.',
    seoDescription: 'A launch checklist for independent experts setting up Ownlybiz payments, services, rates, availability, website, client tools, and email follow-up.',
    tags: ['dashboard', 'launch checklist', 'payments', 'availability'],
    audience: 'New Ownlybiz experts preparing to publish their site or share their booking link.',
    email: {
      subject: 'Your expert launch checklist',
      preheader: 'Payments, services, availability, site copy, and follow-up before you go live.',
      segment: 'New expert onboarding',
      cta: 'Complete launch setup'
    },
    takeaways: [
      'Launch readiness is a workflow, not a single button.',
      'Experts should test the client path before sharing the link widely.',
      'Clear services and payment setup reduce launch-day problems.'
    ],
    sections: [
      {
        heading: 'Before you share the link',
        body: [
          'The best time to fix confusion is before the first client sees the page. Experts should walk through their public site like a client: read the profile, choose a service, review the checkout, and understand what happens next.'
        ]
      },
      {
        heading: 'Dashboard setup checklist',
        body: [
          'Use this as a practical pre-launch review.'
        ],
        bullets: [
          'Profile: name, title, photo, bio, and service promise are accurate.',
          'Website: home, services, about, reviews, contact, and booking pages make sense.',
          'Payments: Stripe connection and payout status are understood.',
          'Rates: chat, voice, video, fixed sessions, packages, or written services are configured.',
          'Availability: hours and booking expectations are realistic.',
          'Client path: contact forms, booking, payment, and session entry are understandable.',
          'Follow-up: email preferences and campaign ideas are ready for opted-in audiences.'
        ]
      },
      {
        heading: 'Test like a client',
        body: [
          'Experts should not only inspect settings. They should open the public page, read the service descriptions, and ask whether a new client could decide without sending a clarifying message.'
        ]
      },
      {
        heading: 'Do not launch with vague promises',
        body: [
          'A vague site may feel flexible, but it creates risk. Be specific about process, format, and fit. Avoid guarantees, sensitive claims, and unclear refund expectations.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Can experts update settings after launch?',
        answer: 'Yes. Launch is not final. Experts should adjust services, rates, content, and availability as they learn what clients actually need.'
      },
      {
        question: 'What is the most important launch step?',
        answer: 'Payment and service clarity. Clients should understand what they are buying and how the session or deliverable works.'
      }
    ],
    relatedFeatures: ['Launch Status', 'Website editor', 'Stripe status', 'Rates', 'Availability', 'Client path']
  },
  {
    slug: 'repeat-client-system-packages-credit-email',
    title: 'Building a Repeat-Client System With Packages, Credits, and Follow-Up Emails',
    category: 'Retention',
    date: '2026-06-14',
    dateModified: '2026-09-06',
    image: '/assets/blog/repeat-client-system-packages-credit-email.png',
    imageAlt: 'Ownlybiz repeat-client loop with package card, prepaid credit, email follow-up, and session history.',
    summary: 'Give clients a reason to return when there is more useful work to do. Map a series of visits, distinguish a package from prepaid credit, and plan follow-up around the options your Ownlybiz site actually offers.',
    seoDescription: 'Build a repeat-client plan with a worked visit sequence, package-versus-credit distinctions, permission-based follow-up, and a clear retention calculation.',
    tags: ['retention', 'packages', 'prepaid credit', 'email follow-up'],
    audience: 'Experts who want client relationships beyond one-off sessions.',
    email: {
      subject: 'Turn one session into a clearer next step',
      preheader: 'Packages, prepaid credit, and follow-up emails can support repeat clients.',
      segment: 'Experts with completed sessions',
      cta: 'Create a repeat-client offer'
    },
    takeaways: [
      'A repeat visit should have its own useful purpose; one completed session can be enough.',
      'A planned series, a package purchase, and prepaid credit are different offers.',
      'Use enabled booking options and opted-in audiences, then measure repeat visits over a defined period.'
    ],
    sections: [
      {
        heading: 'Retention starts during the first session',
        body: [
          'At the end of a useful session, the client should know what you covered, what they can do independently, and whether another visit would serve a specific purpose. If the task is complete, say so. A repeat-client plan should make future help understandable rather than make the client feel that every answer requires another purchase.',
          'Ask yourself what would be different at the next visit. A language learner may return after practicing an exercise. A portfolio client may return after revising a page. A technical consultant may need a fresh set of observations before continuing. Those changes create a reason to meet again; a generic “book another call” message does not explain one.'
        ]
      },
      {
        heading: 'Worked example: three visits with distinct purposes',
        body: [
          'Consider an illustrative portfolio-review plan for a freelance designer. This is an example of organizing work, not an existing Ownlybiz package or a report of a customer’s results. The client wants feedback while improving one portfolio page.',
          'The plan gives each visit a decision to make and something the client can do between visits. The expert can describe the sequence without promising new clients or assuming that every person needs all three sessions.'
        ],
        bullets: [
          'Visit one: review the page’s intended audience and identify up to three changes. The client leaves with a prioritized edit list.',
          'Between visits: the client makes the edits. Implementation is not included unless separately agreed.',
          'Visit two: review the revised page and compare it with the original questions. Decide whether the message and examples are now clearer.',
          'Visit three, only if useful: review a new project example or an unresolved part of the page. If the work is complete after visit two, no extra visit is needed.'
        ]
      },
      {
        heading: 'Do not confuse a service plan with a package checkout',
        body: [
          'A service plan describes the work. A purchasable package promises a specific bundle under stated terms. They are not interchangeable. Before advertising a package, confirm that your expert site has the required purchase and redemption options enabled. Older labels or examples in a template are not proof that a bundle can be bought.',
          'If your public site currently offers individual live sessions, describe the visits as separate bookings. Explain the expected scope and current rate for each one. Do not imply that writing “three-session package” in a page creates a bundle, reserves three appointments, or changes how payment works.',
          'Where a package option is available, define its units: how many sessions or deliverables, what channel, and what is included. Explain scheduling and any follow-up separately. Keep the public description consistent with the actual offer instead of inventing expiry or refund terms in a marketing paragraph.'
        ]
      },
      {
        heading: 'Explain prepaid credit as a balance, not a promise of visits',
        body: [
          'Ownlybiz’s prepaid credit is associated with the client and the particular expert. It is a balance used for eligible live sessions when the client chooses prepaid credit; it is not a general balance for every expert or a guarantee that appointments are reserved. The current public credit interface describes the balance as having no expiration.',
          'Use simple arithmetic when explaining the difference between value and time. For illustration only, a $20 balance at a $2-per-minute rate represents 10 paid minutes, before any separately applicable free introduction or promotion. Those are example numbers, not a rate recommendation or an Ownlybiz-wide price. A different channel rate changes the time that the same balance can cover.',
          'Ask clients to check the balance and selected payment option shown for their session. Do not describe prepaid credit as a fixed number of visits unless that is what the actual offer supports. If a client asks about unused credit or a refund, refer them to the applicable account information and policy rather than improvising a promise.'
        ]
      },
      {
        heading: 'Follow up with one relevant next step',
        body: [
          'Keep private service communication separate from marketing. An agreed recap of one client’s work belongs with that client. A campaign to an opted-in list should use general guidance that is appropriate for all its recipients, such as how to prepare a revised portfolio page for review.',
          'For the example plan, a useful general email might say: “Before a second portfolio review, compare your updated first screen with the questions you started with. Note what changed and what still feels unclear. If you want another review, the booking page shows the current options.” This gives readers an action they can take without buying.'
        ],
        bullets: [
          'At the end of a visit: agree on any preparation and whether a next session is useful.',
          'For an opted-in educational list: send a relevant exercise or explanation, with one optional public link.',
          'When availability changes: state the new hours or format accurately.',
          'If someone has stopped receiving marketing: respect that choice rather than moving them to a different list.'
        ]
      },
      {
        heading: 'Use Email Center controls deliberately',
        body: [
          'On an eligible account, Expert Email Center supports campaign drafts, selected lists, previews, tests, audience review, and scheduled sends. Delivery requires the expert’s configured provider and verified sender. Saving a useful follow-up draft is different from approving it to send.',
          'Choose a list whose members requested the subject matter. Review the eligible audience and skipped contacts before scheduling. If you configure a marketing cycle, inspect its trigger, steps, timing, and content; do not assume that every completed session should automatically produce a sales email. A short, reviewed campaign can be enough while you learn what readers find useful.'
        ]
      },
      {
        heading: 'Measure repeat visits using a defined group and window',
        body: [
          'Define the group before calculating a repeat rate. For example, count clients who completed their first session in a particular month, then count how many of those same clients completed another within 30 days of their first visit. Give every client the full observation period before comparing months.',
          'In a hypothetical group of 20 first-time clients, if six return within that window, the repeat rate is 6 divided by 20, or 30%. This is an arithmetic example, not an Ownlybiz benchmark or a claim about typical results. Twenty sessions from six people are not twenty repeat clients.',
          'Use the client and session history available to you to check the counts. Do not assume there is a ready-made report for this exact cohort definition. Also note format, availability, and client goals: a one-off service can be successful even when a satisfied client never needs it again.'
        ]
      },
      {
        heading: 'Review the plan when the work changes',
        body: [
          'Look for specific friction: clients cannot tell what to prepare, they mistake credit for a package, or they expect an unavailable channel. Improve the relevant description and public link, then verify that the next visit is still useful and deliverable.',
          'A repeat-client system is ready when the offer, booking choices, balance explanation, and follow-up agree with one another. Its purpose is to make the next appropriate visit easier to understand. It does not guarantee repeat bookings, revenue, or a particular client outcome.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Is prepaid credit the same as a session package?',
        answer: 'No. Credit is a value balance for eligible sessions with the relevant expert; a package describes a particular bundle of sessions or deliverables. Check the public options before advertising either, and do not promise that credit reserves appointment times.'
      },
      {
        question: 'Does every service need a repeat-visit offer?',
        answer: 'No. Some questions are resolved in one session. Offer another visit when there is a clear next task, fresh material to review, or an ongoing need the client wants help with.'
      },
      {
        question: 'Does a campaign click prove that an email caused a repeat booking?',
        answer: 'No. A click shows engagement with a link, not necessarily a completed session or a cause of the booking. Compare delivery and engagement information with actual session records, and keep small samples in perspective.'
      }
    ],
    relatedFeatures: ['Packages', 'Prepaid credit', 'Email Center', 'Client list', 'Session history']
  },
  {
    slug: 'promotion-codes-for-expert-services',
    title: 'Promotion Codes for Expert Services: Discounts Without Training Clients to Wait',
    category: 'Promotions',
    date: '2026-06-14',
    image: '/assets/blog/promotion-codes-for-expert-services.png',
    imageAlt: 'Ownlybiz promotion code panel with percentage discount, service type, and checkout preview.',
    summary: 'Promotion codes can help with launches, loyal clients, and seasonal campaigns, but they should have a purpose and a clear limit.',
    seoDescription: 'How independent experts can use promotion codes for prepaid credit, sessions, and campaigns without weakening their pricing.',
    tags: ['promotion codes', 'discounts', 'prepaid credit', 'campaigns'],
    audience: 'Experts considering discounts or special offers for paid services.',
    email: {
      subject: 'Use promotion codes without weakening your pricing',
      preheader: 'When discounts help, when they hurt, and how to frame them.',
      segment: 'Experts planning campaigns',
      cta: 'Plan a promotion'
    },
    takeaways: [
      'Discounts need a reason: launch, loyalty, reactivation, or package introduction.',
      'Limit discounts by time, audience, or service type.',
      'Avoid training clients that your normal rate is not real.'
    ],
    sections: [
      {
        heading: 'Discounts are tools, not strategy',
        body: [
          'A promotion code can help a new client try a service, reward a repeat client, or introduce a package. It should not become the only reason people book.'
        ]
      },
      {
        heading: 'Use promotion codes with a clear purpose',
        body: [
          'Experts should decide what behavior the promotion supports.'
        ],
        bullets: [
          'First booking after joining an email list.',
          'Returning client package upgrade.',
          'Seasonal availability campaign.',
          'Prepaid credit top-up incentive.',
          'Reactivation for clients who have not booked recently.'
        ]
      },
      {
        heading: 'Protect your positioning',
        body: [
          'The safest discount language emphasizes a specific moment or campaign. Avoid implying that the expert’s normal rate is inflated or that clients should wait for coupons.'
        ]
      },
      {
        heading: 'How Ownlybiz fits',
        body: [
          'Ownlybiz supports promotion-code workflows for eligible plans and payment contexts, including prepaid credit and pay-by-minute sessions where configured. Experts should still review pricing, margins, and rules before sending a campaign.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Should every expert use promotion codes?',
        answer: 'No. Promotion codes are optional. Some expert brands are better served by clear pricing and packages without discounts.'
      },
      {
        question: 'Can promotion codes apply to every payment type?',
        answer: 'That depends on configuration, plan eligibility, and the payment context. Experts should test the checkout path before advertising a code.'
      }
    ],
    relatedFeatures: ['Promotion codes', 'Prepaid credit', 'Email Center', 'Pay-by-minute sessions', 'Packages']
  },
  {
    slug: 'written-async-services-for-experts',
    title: 'Written and Async Expert Services: When Clients Do Not Need a Live Call',
    category: 'Async Services',
    date: '2026-06-14',
    image: '/assets/blog/written-async-services-for-experts.png',
    imageAlt: 'Ownlybiz written service workflow with client question, expert response, and delivery status.',
    summary: 'Not every client problem needs chat, voice, or video. Written services can give experts time to review, think, and respond with structure.',
    seoDescription: 'A guide to written and async expert services, including scope, pricing, delivery expectations, and client communication.',
    tags: ['written services', 'async', 'service design', 'delivery'],
    audience: 'Experts who can deliver value through written reviews, readings, audits, or summaries.',
    email: {
      subject: 'Not every expert service needs a live call',
      preheader: 'Written and async services can be clearer for some client needs.',
      segment: 'Experts adding service formats',
      cta: 'Add a written service'
    },
    takeaways: [
      'Written services work well when review time matters.',
      'Scope and delivery timing must be explicit.',
      'Sensitive fields still require careful human judgment and boundaries.'
    ],
    sections: [
      {
        heading: 'Async can be better than live',
        body: [
          'Live sessions are powerful, but they are not always the right format. A client may want a written review, a document critique, a strategic note, a reading, a technical assessment, or a summary they can revisit later.'
        ]
      },
      {
        heading: 'What makes a strong written service',
        body: [
          'Written services need boundaries because clients cannot ask unlimited follow-up questions in real time unless the offer includes that.'
        ],
        bullets: [
          'Define what the client submits.',
          'Define what the expert returns.',
          'State turnaround expectations.',
          'Limit revisions or follow-up questions if needed.',
          'Avoid guarantees about outcomes.'
        ]
      },
      {
        heading: 'Pricing written work',
        body: [
          'Written work may look smaller than a live call, but it can require more thinking time. Price based on scope, expertise, and delivery effort, not only word count.'
        ]
      },
      {
        heading: 'How Ownlybiz can support the model',
        body: [
          'Ownlybiz supports service formats beyond live sessions, including written/async offers where configured. That lets experts create a service menu that fits how they actually deliver value.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Are written services easier to scale?',
        answer: 'Sometimes, but only if scope is controlled. Open-ended written services can become time-heavy without clear limits.'
      },
      {
        question: 'Should AI write the expert’s response?',
        answer: 'No article here recommends AI as a client-advice provider. Expert service responses should remain human-led and reviewed by the expert.'
      }
    ],
    relatedFeatures: ['Written services', 'Service pages', 'Client records', 'Packages', 'Receipts']
  },
  {
    slug: 'analytics-for-independent-experts',
    title: 'Analytics for Independent Experts: What to Watch After You Launch',
    category: 'Analytics',
    date: '2026-06-14',
    image: '/assets/blog/analytics-for-independent-experts.png',
    imageAlt: 'Ownlybiz analytics dashboard illustration with sessions, revenue, clients, and channel mix.',
    summary: 'Useful analytics do not need to be complicated. Experts should watch the few signals that help them improve pricing, service clarity, and follow-up.',
    seoDescription: 'Learn which analytics independent experts should monitor after launch, including sessions, clients, channels, packages, and follow-up opportunities.',
    tags: ['analytics', 'dashboard', 'growth', 'optimization'],
    audience: 'Experts who have launched and want to improve their service business responsibly.',
    email: {
      subject: 'What should experts track after launch?',
      preheader: 'Focus on analytics that improve decisions, not vanity metrics.',
      segment: 'Active experts',
      cta: 'Review dashboard analytics'
    },
    takeaways: [
      'Track decisions, not vanity metrics.',
      'Use analytics to improve service clarity, pricing, and follow-up.',
      'Avoid treating small samples as proof of guaranteed outcomes.'
    ],
    sections: [
      {
        heading: 'Analytics should answer business questions',
        body: [
          'Experts do not need to stare at charts all day. They need to know whether clients understand the offer, which services get booked, where clients drop off, and which follow-up actions are worth testing.'
        ]
      },
      {
        heading: 'Signals worth watching',
        body: [
          'A few practical signals can guide better decisions.'
        ],
        bullets: [
          'Which services get clicks or bookings.',
          'Whether clients prefer chat, voice, video, packages, or written services.',
          'How often first-time clients return.',
          'Which email campaigns drive useful engagement.',
          'Whether rates or service descriptions create confusion.'
        ]
      },
      {
        heading: 'Use data without overclaiming',
        body: [
          'Small numbers can be misleading. If three clients prefer one format, that is a clue, not a universal truth. Experts should use analytics as feedback, then test carefully.'
        ]
      },
      {
        heading: 'Ownlybiz dashboard context',
        body: [
          'Ownlybiz brings session, client, revenue, package, and communication signals into the expert workflow so decisions are easier to make from one place.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Which metric matters most?',
        answer: 'It depends on the stage. Before launch, setup completion matters. After launch, bookings, repeat clients, service mix, and client clarity are often more useful than raw traffic.'
      },
      {
        question: 'Should experts change pricing after one slow week?',
        answer: 'Usually no. Review service clarity, audience fit, and sample size before making major pricing changes.'
      }
    ],
    relatedFeatures: ['Analytics dashboard', 'Client list', 'Session history', 'Email Center', 'Packages']
  },
  {
    slug: 'ownlybiz-feature-map-for-experts',
    title: 'Ownlybiz Feature Map: What Independent Experts Can Actually Use',
    category: 'Features',
    date: '2026-06-14',
    image: '/assets/blog/ownlybiz-feature-map-for-experts.png',
    imageAlt: 'Map-style illustration of Ownlybiz features including website, payments, sessions, packages, email, analytics, and domains.',
    summary: 'Ownlybiz is easiest to understand as a connected feature map: publish, sell, deliver, manage, follow up, and improve.',
    seoDescription: 'A feature map of Ownlybiz for independent experts, covering website, domains, payments, live sessions, packages, Email Center, analytics, and AI-assisted drafts.',
    tags: ['features', 'expert dashboard', 'website', 'payments', 'Email Center'],
    audience: 'Potential experts evaluating whether Ownlybiz matches their workflow.',
    email: {
      subject: 'What can experts actually do with Ownlybiz?',
      preheader: 'A connected map of the platform: publish, sell, deliver, manage, follow up, improve.',
      segment: 'Product-aware leads',
      cta: 'Explore Ownlybiz features'
    },
    takeaways: [
      'Ownlybiz covers the core paid-session workflow from website to follow-up.',
      'The platform is not one feature; it is a connected operating layer.',
      'Experts should adopt features in the order their business needs them.'
    ],
    sections: [
      {
        heading: 'Publish',
        body: [
          'Experts can create a branded public site with profile details, service pages, booking paths, contact options, reviews, SEO settings, and domain configuration. The goal is to make the expert’s offer easier to understand and share.'
        ]
      },
      {
        heading: 'Sell',
        body: [
          'Ownlybiz supports multiple ways to sell expertise so the expert is not forced into one checkout model.'
        ],
        bullets: [
          'Pay-by-minute chat, voice, and video sessions.',
          'Fixed sessions and written services.',
          'Session packages.',
          'Prepaid client credit.',
          'Promotion codes where eligible.',
          'Stripe-powered card and wallet checkout when available.'
        ]
      },
      {
        heading: 'Deliver',
        body: [
          'The platform includes session surfaces for chat, voice, and video, plus session state, timers, readiness handling, and client communication tools. Experts can focus on the service instead of manually stitching links together.'
        ]
      },
      {
        heading: 'Manage',
        body: [
          'The expert dashboard brings together clients, bookings, sessions, messages, reviews, rates, packages, availability, payouts, website settings, and analytics.'
        ]
      },
      {
        heading: 'Follow up and improve',
        body: [
          'The Email Center helps prepare and review opt-in campaigns. AI-assisted drafting can suggest marketing copy or campaign images for human review. Analytics and client history help experts decide what to improve next.'
        ]
      }
    ],
    faqs: [
      {
        question: 'Does every expert need every Ownlybiz feature?',
        answer: 'No. Experts can start with the core workflow they need, then add packages, email campaigns, domains, prepaid credit, or promotions as the business matures.'
      },
      {
        question: 'Is Ownlybiz a replacement for professional judgment?',
        answer: 'No. Ownlybiz provides business infrastructure. Experts remain responsible for their services, claims, compliance needs, and client relationships.'
      }
    ],
    relatedFeatures: ['Expert website', 'Custom domain', 'Stripe payments', 'Sessions', 'Packages', 'Email Center', 'Analytics']
  }
];

const selectedSlugs = new Set([
  'ownlybiz-transparent-platform-fees-expert-keep-rate',
  'expert-business-tool-stack-vs-ownlybiz',
  'pay-by-minute-sessions-guide',
  'packages-fixed-sessions-per-minute-pricing',
  'stripe-apple-pay-google-pay-expert-checkout',
  'custom-domain-expert-website',
  'turn-social-followers-into-paid-sessions',
  'free-intro-minutes-without-undervaluing-work',
  'chat-voice-video-written-session-formats',
  'expert-service-pages-that-convert',
  'email-marketing-for-independent-experts',
  'ai-drafting-for-expert-marketing',
  'independent-expert-dashboard-checklist',
  'repeat-client-system-packages-credit-email',
  'ownlybiz-feature-map-for-experts',
  'linkedin-content-plan-independent-experts',
  'human-expertise-value-ai-answers',
  'consultation-promotions-discounts-intro-minutes-prepaid-credit',
]);

const selectedPosts = [...posts, ...contentWave20260906, promotionGuide20260906]
  .filter((post) => selectedSlugs.has(post.slug))
  .map((post) => ({ ...post, ...reviewInformedUpdates20260907[post.slug] }))
  .map(normalizePost);

function normalizePost(post) {
  const normalized = {
    ...post,
    faqs: Array.isArray(post.faqs) ? [...post.faqs] : []
  };
  if (normalized.faqs.length < 3) {
    normalized.faqs.push({
      question: `What should experts review before using this ${post.category.toLowerCase()} workflow?`,
      answer: 'Experts should review their service promises, pricing, client permissions, refund or cancellation expectations, and any field-specific rules before publishing pages, sending campaigns, or accepting paid work.'
    });
  }
  // Estimate from the article itself, excluding campaign drafts and navigation.
  // The same rule applies to every guide so copy edits cannot leave stale labels.
  const articleText = [
    normalized.title,
    normalized.summary,
    ...(normalized.takeaways || []),
    ...(normalized.sections || []).flatMap((section) => [
      section.heading,
      ...(section.body || []),
      ...(section.bullets || [])
    ]),
    ...(normalized.faqs || []).flatMap((faq) => [faq.question, faq.answer])
  ].join(' ');
  normalized.wordCount = articleText.trim().split(/\s+/u).filter(Boolean).length;
  normalized.readTime = `${Math.max(1, Math.ceil(normalized.wordCount / 220))} min read`;
  // Keep the deployed serialization order while deriving, not hardcoding, time.
  const { readTime, ...fields } = normalized;
  return Object.fromEntries(Object.entries(fields).flatMap(([key, value]) => key === 'image'
    ? [['readTime', readTime], [key, value]] : [[key, value]]));
}

function writeJson() {
  fs.writeFileSync(
    path.join(dataDir, 'ownlybiz-blog-posts.json'),
    `${JSON.stringify(selectedPosts, null, 2)}\n`
  );
}

function makePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixels(x, y);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const chunks = [];
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const name = Buffer.from(type);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
    chunks.push(len, name, data, crc);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  chunk('IHDR', header);
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]);
}

let crcTable;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function drawImage(post, index) {
  const width = 1200;
  const height = 630;
  const seed = hash(post.slug);
  const shapes = buildShapes(seed, index);
  const png = makePng(width, height, (x, y) => {
    const nx = x / width;
    const ny = y / height;
    let r = lerp(11, 29, nx * 0.35 + ny * 0.25);
    let g = lerp(9, 24, nx * 0.25 + ny * 0.35);
    let b = lerp(8, 21, nx * 0.4 + ny * 0.25);
    const glow1 = radial(nx, ny, 0.18 + (seed % 7) * 0.035, 0.22, 0.45);
    const glow2 = radial(nx, ny, 0.78, 0.72 - (seed % 5) * 0.04, 0.55);
    r += glow1 * 70 + glow2 * 25;
    g += glow1 * 92 + glow2 * 18;
    b += glow1 * 12 + glow2 * 28;
    for (const s of shapes) {
      const inside = softRect(x, y, s.x, s.y, s.w, s.h, s.radius);
      if (inside > 0) {
        r = mix(r, s.r, inside * s.a);
        g = mix(g, s.g, inside * s.a);
        b = mix(b, s.b, inside * s.a);
      }
    }
    const grid = ((x % 84 < 1 || y % 84 < 1) ? 1 : 0) * 7;
    r += grid; g += grid; b += grid;
    return [clamp(r), clamp(g), clamp(b), 255];
  });
  fs.writeFileSync(path.join(root, post.image.replace(/^\//, '')), png);
}

function buildShapes(seed, index) {
  const shapes = [
    { x: 86, y: 72, w: 1028, h: 486, radius: 38, r: 255, g: 250, b: 240, a: 0.055 },
    { x: 126, y: 116, w: 382, h: 82, radius: 28, r: 200, g: 255, b: 61, a: 0.18 },
    { x: 134, y: 426, w: 934, h: 42, radius: 18, r: 255, g: 107, b: 71, a: 0.32 },
  ];
  const motifs = [
    [[610, 134, 230, 118], [870, 134, 164, 118], [610, 286, 424, 86]],
    [[590, 116, 140, 340], [760, 156, 140, 300], [930, 204, 140, 252]],
    [[612, 132, 374, 72], [612, 238, 260, 72], [612, 344, 332, 72]],
    [[594, 118, 190, 260], [820, 118, 190, 260], [706, 408, 296, 54]],
    [[614, 130, 432, 88], [614, 252, 432, 88], [614, 374, 432, 88]],
  ];
  const selected = motifs[index % motifs.length];
  selected.forEach((m, i) => {
    shapes.push({
      x: m[0],
      y: m[1],
      w: m[2],
      h: m[3],
      radius: 24,
      r: i % 2 ? 255 : 200,
      g: i % 2 ? 107 : 255,
      b: i % 2 ? 71 : 61,
      a: i % 2 ? 0.2 : 0.16,
    });
  });
  for (let i = 0; i < 8; i += 1) {
    const n = hash(`${seed}:${i}`);
    shapes.push({
      x: 110 + (n % 870),
      y: 82 + ((n >> 4) % 410),
      w: 34 + ((n >> 8) % 90),
      h: 8 + ((n >> 12) % 18),
      radius: 99,
      r: i % 3 === 0 ? 255 : 200,
      g: i % 3 === 0 ? 250 : 255,
      b: i % 3 === 0 ? 240 : 61,
      a: 0.08,
    });
  }
  return shapes;
}

function hash(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function radial(x, y, cx, cy, radius) {
  const d = Math.hypot(x - cx, y - cy);
  return Math.max(0, 1 - d / radius) ** 2;
}

function softRect(x, y, rx, ry, rw, rh, radius) {
  const cx = Math.max(rx + radius, Math.min(x, rx + rw - radius));
  const cy = Math.max(ry + radius, Math.min(y, ry + rh - radius));
  const d = Math.hypot(x - cx, y - cy);
  if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return 1;
  return Math.max(0, 1 - (d - radius) / 18);
}

function lerp(a, b, t) { return a + (b - a) * t; }
function mix(a, b, t) { return a * (1 - t) + b * t; }
function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

writeJson();
const renderedImages = new Set();
if (!contentOnly) selectedPosts.forEach((post, index) => {
  // A later guide may reuse a deployed illustration. Preserve the original
  // guide's seed and index instead of overwriting that shared image again.
  if (renderedImages.has(post.image)) return;
  drawImage(post, index);
  renderedImages.add(post.image);
});
console.log(contentOnly
  ? `Generated ${selectedPosts.length} blog posts; existing header images left unchanged.`
  : `Generated ${selectedPosts.length} blog posts and ${renderedImages.size} unique header images.`);
