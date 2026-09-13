import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scriptMatch = html.match(/<script id="ownlybiz-content-pages-editor-20260522">([\s\S]*?)<\/script>/);
assert(scriptMatch, 'custom-page editor runtime must exist');

function page(index, sectionCount = 1) {
  return {
    id: `page-${index}`,
    template: 'guide',
    published: index % 2 === 0,
    show_in_nav: index % 2 === 1,
    title: `Page ${index}`,
    slug: `page-${index}`,
    nav_label: `Page ${index}`,
    summary: `Summary ${index}`,
    header_image_url: `https://images.example/page-${index}.jpg`,
    cta_label: 'Book now',
    cta_page: 'book',
    meta_title: `SEO title ${index}`,
    meta_description: `SEO description ${index}`,
    sections: Array.from({ length: sectionCount }, (_, sectionIndex) => ({
      id: `page-${index}-section-${sectionIndex + 1}`,
      target_page: `page-${index}`,
      type: ['story', 'feature', 'faq', 'list', 'quote', 'gallery', 'cta', 'resource'][sectionIndex % 8],
      title: `Section ${sectionIndex + 1}`,
      body: `Complete body ${sectionIndex + 1}`,
      items: [`Point ${sectionIndex + 1}a`, `Point ${sectionIndex + 1}b`],
      cta_label: `Section action ${sectionIndex + 1}`,
      cta_page: 'contact',
      image_url: `https://images.example/section-${sectionIndex + 1}.jpg`,
      image_alt: `Descriptive image ${sectionIndex + 1}`,
    })),
  };
}

function createHarness({ pages = [], plan = 'pro', capabilities, image = false } = {}) {
  const nodes = new Map([
    ['ob-content-pages-card', {}],
    ['ob-cp-editor', { innerHTML: '' }],
    ['ob-ai-page-prompt', { value: 'Create a complete preparation guide.' }],
    ['ob-ai-page-image', { checked: image }],
    ['ob-ai-page-run', { disabled: false, textContent: 'Generate page draft' }],
    ['ob-ai-page-result', { className: '', innerHTML: '', textContent: '' }],
    ['ob-ai-page-status', { className: '', textContent: '' }],
  ]);
  const listeners = new Map();
  const document = {
    readyState: 'loading',
    getElementById(id) { return nodes.get(id) || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(name, handler) { listeners.set(name, handler); },
    dispatchEvent() {},
    body: { appendChild() {} },
  };
  const sandbox = {
    console,
    document,
    location: { hostname: 'ownlybiz-staging.vercel.app' },
    CustomEvent: class CustomEvent {},
    FileReader: class FileReader {},
    Promise,
    URL,
    Date,
    Number,
    Object,
    Array,
    String,
    JSON,
    Math,
    setTimeout() { return 0; },
    clearTimeout() {},
  };
  sandbox.window = sandbox;
  vm.runInNewContext(scriptMatch[1], sandbox, { filename: 'ownlybiz-content-pages-editor.js' });
  sandbox.obAiWebsiteStatus = () => ({ eligible: true, configured: true, media_configured: true, credits: { available: 100, preview_cost: 4, image_cost: 24 } });
  sandbox.obLoadContentPagesEditor({ ai_pages: pages }, { subscription_plan: plan, slug: 'expert' }, {}, capabilities);
  return { window: sandbox, nodes };
}

function generatedResponse() {
  return {
    plan: {
      changes: {
        website_content_patch: {
          ai_pages: [{
            title: 'AI preparation guide',
            slug: 'ai-preparation-guide',
            nav_label: 'Preparation guide',
            summary: 'A practical preparation guide.',
            cta_label: 'Book a session',
            cta_page: 'book',
            meta_title: 'Prepare for your session',
            meta_description: 'Eight practical sections for preparing for an expert session.',
            sections: Array.from({ length: 8 }, (_, index) => ({
              type: ['story', 'feature', 'faq', 'list', 'quote', 'gallery', 'cta', 'resource'][index],
              title: `Generated section ${index + 1}`,
              body: `Complete generated body ${index + 1}`,
              items: [`Generated point ${index + 1}a`, `Generated point ${index + 1}b`],
              cta_label: `Generated action ${index + 1}`,
              cta_page: 'contact',
              image_url: `https://images.example/generated-${index + 1}.jpg`,
              image_alt: `Generated image description ${index + 1}`,
            })),
          }],
        },
      },
    },
  };
}

{
  const harness = createHarness({ pages: [], plan: 'scale', capabilities: { custom_pages: { plan: 'scale', limit: 20 } } });
  let requests = 0;
  harness.window.obAiWebsiteRequest = () => { requests += 1; return Promise.resolve(generatedResponse()); };
  await harness.window.obAiRunContentPagePrompt();
  const generated = harness.window.obCollectWebsiteContentPages([]);
  assert.equal(requests, 1, 'a successful copy-only custom-page generation spends exactly one provider request');
  assert.equal(generated.length, 1, 'the successful AI result inserts one reviewable draft page');
  assert.equal(generated[0].published, false, 'AI generation never publishes the page implicitly');
  assert.equal(generated[0].show_in_nav, false, 'AI generation never exposes the page in navigation implicitly');
  assert.equal(generated[0].sections.length, 8, 'all eight generated sections survive insertion and editor collection');
  assert.equal(new Set(generated[0].sections.map((section) => section.id)).size, 8, 'every generated section receives a durable unique identity');
  assert.deepEqual(generated[0].sections.map((section) => section.type), ['story', 'feature', 'faq', 'list', 'quote', 'gallery', 'cta', 'resource']);
  generated[0].sections.forEach((section, index) => {
    assert.equal(section.target_page, generated[0].slug);
    assert.equal(section.image_alt, `Generated image description ${index + 1}`);
    assert.equal(section.items.length, 2);
  });
  assert.equal(generated[0].meta_title, 'Prepare for your session');
  assert.equal(generated[0].meta_description, 'Eight practical sections for preparing for an expert session.');
  assert.match(harness.nodes.get('ob-ai-page-status').textContent, /ready in the editor/i);
}

{
  const harness = createHarness({ pages: [page(1), page(2), page(3)], plan: 'scale', capabilities: { custom_pages: { plan: 'scale', limit: 3 } } });
  let requests = 0;
  harness.window.obAiWebsiteRequest = () => { requests += 1; return Promise.resolve(generatedResponse()); };
  const result = harness.window.obAiRunContentPagePrompt();
  assert.equal(result, false, 'generation stops synchronously at the authoritative live limit');
  assert.equal(requests, 0, 'reaching the custom-page cap spends no provider request or AI credit');
  assert.match(harness.nodes.get('ob-ai-page-status').textContent, /limit reached/i);
}

{
  const harness = createHarness({ pages: Array.from({ length: 8 }, (_, index) => page(index + 1)), plan: 'pro' });
  let requests = 0;
  harness.window.obAiWebsiteRequest = () => { requests += 1; return Promise.resolve(generatedResponse()); };
  assert.equal(harness.window.obAiRunContentPagePrompt(), false, 'Pro falls back to the eight-page product cap when no live capability is present');
  assert.equal(requests, 0);
}

{
  const harness = createHarness({ pages: Array.from({ length: 20 }, (_, index) => page(index + 1)), plan: 'scale' });
  let requests = 0;
  harness.window.obAiWebsiteRequest = () => { requests += 1; return Promise.resolve(generatedResponse()); };
  assert.equal(harness.window.obAiRunContentPagePrompt(), false, 'Scale falls back to the twenty-page product cap when no live capability is present');
  assert.equal(requests, 0);
}

{
  const harness = createHarness({ pages: Array.from({ length: 7 }, (_, index) => page(index + 1)), plan: 'pro', capabilities: { custom_pages: { plan: 'pro', limit: 8 } }, image: true });
  let requests = 0;
  let resolvePreview;
  harness.window.obAiWebsiteRequest = () => {
    requests += 1;
    return new Promise((resolve) => { resolvePreview = resolve; });
  };
  const generation = harness.window.obAiRunContentPagePrompt();
  assert.equal(requests, 1, 'copy generation starts while capacity remains');
  harness.window.obAddContentPage();
  assert.equal(harness.window.obCollectWebsiteContentPages([]).length, 8, 'another valid editor action can consume the final slot');
  resolvePreview(generatedResponse());
  await generation;
  assert.equal(requests, 1, 'capacity is rechecked before a header-image provider request');
  assert.equal(harness.window.obCollectWebsiteContentPages([]).length, 8, 'capacity is rechecked again before generated-page insertion');
  assert.match(harness.nodes.get('ob-ai-page-status').textContent, /limit reached/i);
}

{
  const harness = createHarness({ pages: Array.from({ length: 7 }, (_, index) => page(index + 1)), plan: 'pro', capabilities: { custom_pages: { plan: 'pro', limit: 8 } } });
  let resolvePreview;
  const providerResponse = new Promise((resolve) => { resolvePreview = resolve; });
  harness.window.obAiWebsiteRequest = () => providerResponse;
  const generation = harness.window.obAiRunContentPagePrompt();
  providerResponse.then(() => harness.window.obAddContentPage());
  resolvePreview(generatedResponse());
  await generation;
  assert.equal(harness.window.obCollectWebsiteContentPages([]).length, 8, 'the final insertion guard prevents an over-limit AI page when the last slot is consumed after the provider response');
  assert.match(harness.nodes.get('ob-ai-page-status').textContent, /limit reached/i);
}

{
  const original = page(31, 8);
  const harness = createHarness({ pages: [original], plan: 'pro', capabilities: { custom_pages: { plan: 'pro', limit: 8 } } });
  const sourceIds = original.sections.map((section) => section.id);
  const initialMarkup = harness.nodes.get('ob-cp-editor').innerHTML;
  assert.equal((initialMarkup.match(/class="ob-cp-section-list-item"/g) || []).length, 8, 'the section manager lists every section instead of hiding sections two through eight');
  assert.match(initialMarkup, /role="list" aria-label="Page sections"/, 'the section collection has an accessible list name');
  assert.match(initialMarkup, /role="region" aria-labelledby="ob-cp-selected-section-title"/, 'the selected-section editor has an accessible region name');
  assert.match(initialMarkup, /aria-current="true"/, 'the selected section is exposed to assistive technology');
  for (const label of ['Section type', 'Section heading', 'Section body', 'Items / FAQ points', 'Section CTA text', 'Section CTA destination', 'Image URL', 'Image description']) {
    assert(initialMarkup.includes(label), `the selected-section editor exposes ${label}`);
  }

  assert.equal(harness.window.obSelectContentPageSection(sourceIds[3]), true);
  harness.window.obContentPageSectionField('type', 'quote');
  harness.window.obContentPageSectionField('title', 'A changed fourth section');
  harness.window.obContentPageSectionField('body', 'The complete edited body.');
  harness.window.obContentPageSectionField('items', 'Edited point one\nEdited point two');
  harness.window.obContentPageSectionField('cta_label', 'Read the next step');
  harness.window.obContentPageSectionField('cta_page', 'Next Useful Step');
  harness.window.obContentPageSectionField('image_url', 'https://images.example/edited-fourth.jpg');
  harness.window.obContentPageSectionField('image_alt', 'A clear description of the edited fourth-section image');
  assert.equal(harness.window.obMoveContentPageSection(-1), true, 'the selected section can move earlier');

  const addedId = harness.window.obAddContentPageSection('gallery');
  assert.match(addedId, /^section-/, 'adding a section creates a durable section identity');
  harness.window.obContentPageSectionField('title', 'A new gallery section');
  harness.window.obContentPageSectionField('body', 'New section body');
  harness.window.obContentPageSectionField('items', 'Image one\nImage two');
  harness.window.obContentPageSectionField('cta_label', 'See availability');
  harness.window.obContentPageSectionField('cta_page', 'book');
  harness.window.obContentPageSectionField('image_url', 'https://images.example/new-gallery.jpg');
  harness.window.obContentPageSectionField('image_alt', 'Two examples in the new gallery');
  assert.equal(harness.window.obMoveContentPageSection(-1), true, 'a newly added section can be reordered');

  assert.equal(harness.window.obSelectContentPageSection(sourceIds[1]), true);
  assert.equal(harness.window.obDeleteContentPageSection(), true, 'a selected section can be deleted without affecting its siblings');
  harness.window.obContentPageField('slug', 'complete-updated-guide');

  const edited = harness.window.obCollectWebsiteContentPages([])[0];
  assert.equal(edited.sections.length, 8, 'adding one section and deleting one section leaves the complete eight-section page');
  assert.equal(new Set(edited.sections.map((section) => section.id)).size, 8, 'section operations never duplicate identities');
  assert.equal(edited.sections.some((section) => section.id === sourceIds[1]), false, 'only the explicitly selected section is deleted');
  assert.deepEqual(edited.sections.map((section) => section.id), [sourceIds[0], sourceIds[3], sourceIds[2], sourceIds[4], sourceIds[5], sourceIds[6], addedId, sourceIds[7]], 'reorder, add, and delete preserve an exact deterministic section order');
  assert.equal(edited.slug, 'complete-updated-guide', 'the page slug edit reaches the canonical collected document');
  edited.sections.forEach((section) => assert.equal(section.target_page, edited.slug, 'every existing and newly added section follows a page slug change'));

  const changed = edited.sections.find((section) => section.id === sourceIds[3]);
  assert.deepEqual(
    JSON.parse(JSON.stringify({ type: changed.type, title: changed.title, body: changed.body, items: changed.items, cta_label: changed.cta_label, cta_page: changed.cta_page, image_url: changed.image_url, image_alt: changed.image_alt })),
    { type: 'quote', title: 'A changed fourth section', body: 'The complete edited body.', items: ['Edited point one', 'Edited point two'], cta_label: 'Read the next step', cta_page: 'next-useful-step', image_url: 'https://images.example/edited-fourth.jpg', image_alt: 'A clear description of the edited fourth-section image' },
    'every editable field belongs to the selected section',
  );
  const added = edited.sections.find((section) => section.id === addedId);
  assert.deepEqual(
    JSON.parse(JSON.stringify({ type: added.type, title: added.title, body: added.body, items: added.items, cta_label: added.cta_label, cta_page: added.cta_page, image_url: added.image_url, image_alt: added.image_alt })),
    { type: 'gallery', title: 'A new gallery section', body: 'New section body', items: ['Image one', 'Image two'], cta_label: 'See availability', cta_page: 'book', image_url: 'https://images.example/new-gallery.jpg', image_alt: 'Two examples in the new gallery' },
    'a newly added section persists every supported field',
  );

  harness.window.obLoadContentPagesEditor({ ai_pages: [edited] }, { subscription_plan: 'pro', slug: 'expert' }, {}, { custom_pages: { plan: 'pro', limit: 8 } });
  assert.deepEqual(harness.window.obCollectWebsiteContentPages([])[0], edited, 'edited section order, IDs, ownership, and metadata survive editor reload');
}

{
  const original = page(1, 8);
  const harness = createHarness({ pages: [original], plan: 'pro', capabilities: { custom_pages: { plan: 'pro', limit: 8 } } });
  harness.window.obDuplicateContentPage();
  const collected = harness.window.obCollectWebsiteContentPages([]);
  assert.equal(collected.length, 2);
  const [source, duplicate] = collected;
  assert.notEqual(duplicate.id, source.id, 'duplicated page gets a fresh identity');
  assert.equal(duplicate.sections.length, 8, 'all eight sections are duplicated');
  assert.equal(new Set(duplicate.sections.map((section) => section.id)).size, 8, 'every duplicated section ID is unique');
  assert.equal(duplicate.sections.some((section) => source.sections.some((item) => item.id === section.id)), false, 'no duplicated section reuses a source section ID');
  for (const field of ['template', 'published', 'show_in_nav', 'summary', 'header_image_url', 'cta_label', 'cta_page', 'meta_title', 'meta_description']) {
    assert.deepEqual(duplicate[field], source[field], `page metadata ${field} is cloned`);
  }
  duplicate.sections.forEach((section, index) => {
    for (const field of ['type', 'title', 'body', 'items', 'cta_label', 'cta_page', 'image_url', 'image_alt']) {
      assert.deepEqual(section[field], source.sections[index][field], `section ${index + 1} metadata ${field} is cloned`);
    }
    assert.equal(section.target_page, duplicate.slug);
  });

  harness.window.obLoadContentPagesEditor({ ai_pages: collected }, { subscription_plan: 'pro', slug: 'expert' }, {}, { custom_pages: { plan: 'pro', limit: 8 } });
  const roundTripped = harness.window.obCollectWebsiteContentPages([]);
  assert.equal(roundTripped[0].sections.length, 8, 'an eight-section source page survives editor load and collect');
  assert.equal(roundTripped[1].sections.length, 8, 'an eight-section duplicate survives editor load and collect');
  assert.deepEqual(roundTripped, collected, 'all supported custom-page and section metadata round-trips without loss');
}

console.log('Website custom-page capacity, AI spend guard, full section management, complete duplication, and eight-section round-trip passed.');
