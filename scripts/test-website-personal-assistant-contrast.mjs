import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.OWNLYBIZ_PLAYWRIGHT_PATH || 'playwright');
const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
  .map(match => match[1])
  .join('\n');

function sourceRange(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `Missing source range: ${startMarker}`);
  return source.slice(start, end + endMarker.length);
}

const assistantMarkup = sourceRange(
  '<aside class="ob-guidance-drawer" id="ob-guidance-drawer"',
  '</aside>',
);

const viewports = [
  { name: 'desktop', width: 1280, height: 1000 },
  { name: 'mobile-390', width: 390, height: 844 },
];

const foundations = {
  'practice-focus': {
    className: 'ob-site-template-practice-focus ob-site-preset-practice-focus',
    tokens: {
      accent: '#C4622D', action: '#C8FF3D', status: '#637653',
      background: '#F7F1E8', surface: '#FFFDF8', text: '#241A15',
    },
  },
  'quiet-confidence': {
    className: 'ob-site-template-quiet-confidence ob-site-preset-quiet-confidence',
    tokens: {
      accent: '#435F35', action: '#637653', status: '#637653',
      background: '#F4F7EF', surface: '#FFFFFA', text: '#142112',
    },
  },
  'field-journal': {
    className: 'ob-site-template-field-journal ob-site-preset-field-journal',
    tokens: {
      accent: '#A8441E', action: '#A8441E', status: '#435F35',
      background: '#F5F1E7', surface: '#FFFCF4', text: '#1D2118',
    },
  },
  'after-hours': {
    className: 'ob-site-template-after-hours ob-site-preset-after-hours',
    tokens: {
      accent: '#FF6B47', action: '#C8FF3D', status: '#C8FF3D',
      background: '#0B0908', surface: '#1A1614', text: '#FAF7F2',
    },
  },
};

function hexRgb(value) {
  const match = String(value || '').match(/^#([0-9a-f]{6})$/i);
  assert(match, `Expected six-digit hex color, received ${value}`);
  const number = Number.parseInt(match[1], 16);
  return { r: number >> 16, g: (number >> 8) & 255, b: number & 255 };
}

function luminance(rgb) {
  const channel = value => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (0.2126 * channel(rgb.r)) + (0.7152 * channel(rgb.g)) + (0.0722 * channel(rgb.b));
}

function contrast(a, b) {
  const first = luminance(hexRgb(a));
  const second = luminance(hexRgb(b));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function readableOn(color) {
  return contrast(color, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#0B0908';
}

function derivedFoundationTokens(tokens) {
  const accentReadable = contrast(tokens.accent, tokens.background) >= 4.5
    && contrast(tokens.accent, tokens.surface) >= 4.5
    ? tokens.accent
    : tokens.text;
  const statusReadable = contrast(tokens.status, tokens.background) >= 4.5
    && contrast(tokens.status, tokens.surface) >= 4.5
    ? tokens.status
    : tokens.text;
  const focus = contrast(tokens.accent, tokens.background) >= 3
    && contrast(tokens.accent, tokens.surface) >= 3
    ? tokens.accent
    : tokens.text;
  return {
    ...tokens,
    muted: tokens.text,
    soft: tokens.text,
    actionText: readableOn(tokens.action),
    accentText: readableOn(tokens.accent),
    accentReadable,
    statusReadable,
    focus,
  };
}

function galleryMarkup() {
  return `
    <div id="view-3" class="view-panel active">
      <section id="db-panel-website-editor" class="db-tab-panel active">
        <div class="db-content ob-website-workspace">
          <header class="ob-ww-header">
            <div><div class="ob-ww-eyebrow">Your public practice</div><h1 class="ob-ww-title">Website</h1><p class="ob-ww-subtitle">One clear workspace for the site your clients see.</p></div>
            <div class="ob-ww-header-actions"><button class="ob-ww-button">Preview draft</button><button class="ob-ww-button primary" disabled>Save draft</button></div>
          </header>
          <section class="ob-ww-surface" data-ob-surface="design">
            <section class="ob-ww-template-card-shell">
              <div class="ob-ww-template-head"><div><h3>Original Ownlybiz foundations</h3><p>Preview a foundation with your own content, then choose it for your draft.</p></div></div>
              <div class="ob-ww-template-grid" role="list">
                <article id="contrast-gallery-card" class="ob-ww-template" role="listitem" data-selected="false">
                  <button id="contrast-gallery-media" type="button" class="ob-ww-template-media" aria-label="Preview Practice Focus foundation"><span style="display:block;aspect-ratio:1586/992"></span></button>
                  <div class="ob-ww-template-copy">
                    <div class="ob-ww-template-meta"><span class="ob-ww-template-family">Practice Focus</span><span id="contrast-gallery-current" class="ob-ww-template-current">Current</span></div>
                    <strong id="contrast-gallery-title">Practice Focus</strong>
                    <span id="contrast-gallery-description" class="ob-ww-template-description">Warm · Direct, service-led split layout</span>
                  </div>
                  <div class="ob-ww-template-actions">
                    <button id="contrast-gallery-preview" type="button" class="ob-ww-template-action">Preview</button>
                    <button id="contrast-gallery-use" type="button" class="ob-ww-template-action ob-ww-template-use">Use foundation</button>
                  </div>
                </article>
              </div>
            </section>
          </section>
        </div>
      </section>
    </div>`;
}

function assistantShell() {
  return `<div id="view-3" class="view-panel active">${assistantMarkup}</div>`;
}

function lightSidebarMarkup() {
  return `<div id="view-3" class="view-panel active">
    <aside class="db-sidebar">
      <div class="db-sidebar-logo"><span id="sidebar-brand" class="mkt-logo">Ownlybiz</span></div>
      <section class="db-expert-info"><strong id="sidebar-expert" class="db-expert-name">Ari Lane</strong><span id="sidebar-role" class="db-expert-role">Decision coach</span><span id="sidebar-online" class="db-online-text">Online</span></section>
      <nav class="db-nav" aria-label="Expert dashboard">
        <section class="db-nav-group">
          <button id="sidebar-group" class="db-nav-group-toggle" type="button"><span>Sales</span><span class="db-nav-group-state">Hide</span></button>
          <div class="db-nav-group-items">
            <button id="sidebar-default" class="db-nav-item" type="button"><span class="icon" aria-hidden="true"></span><span>Payments &amp; payouts</span></button>
            <button id="sidebar-active" class="db-nav-item active" type="button"><span class="icon" aria-hidden="true"></span><span>Services &amp; Rates</span></button>
          </div>
        </section>
      </nav>
      <div class="db-nav-utility"><button id="sidebar-utility" class="db-nav-utility-item" type="button">Personal Assistant</button><span id="sidebar-note" class="db-nav-utility-note">Available here</span></div>
    </aside>
  </div>`;
}

function publicMarkup(id, foundation) {
  const token = derivedFoundationTokens(foundation.tokens);
  const textRgb = hexRgb(token.text);
  const borderOpacity = luminance(hexRgb(token.background)) < 0.42 ? 0.16 : 0.14;
  const border = `rgba(${textRgb.r},${textRgb.g},${textRgb.b},${borderOpacity})`;
  const style = [
    `--ob-site-accent:${token.accent}`,
    `--ob-site-action:${token.action}`,
    `--ob-site-status:${token.status}`,
    `--ob-site-bg:${token.background}`,
    `--ob-site-surface:${token.surface}`,
    `--ob-site-surface-strong:${token.surface}`,
    `--ob-site-text:${token.text}`,
    `--ob-site-muted:${token.muted}`,
    `--ob-site-soft:${token.soft}`,
    `--ob-site-border:${border}`,
    `--ob-site-action-text:${token.actionText}`,
    `--ob-site-accent-text:${token.accentText}`,
    `--ob-site-accent-readable:${token.accentReadable}`,
    `--ob-site-status-readable:${token.statusReadable}`,
    `--ob-site-link:${token.accentReadable}`,
    `--ob-site-focus:${token.focus}`,
    `--brown:${token.text}`,
    `--gray-500:${token.muted}`,
    `--gray-400:${token.muted}`,
    `--gray-300:${token.soft}`,
    `--cream:${token.background}`,
    `--white:${token.surface}`,
  ].join(';');
  return `
    <main id="view-4" class="view-panel active ${foundation.className}" data-ob-template="${id}" style="${style}">
      <nav class="expert-site-nav" style="background:${token.background}">
        <a class="expert-site-logo" href="#home">Ari Lane</a>
        <div class="expert-site-links"><a id="foundation-nav-link" href="#services">Services</a></div>
      </nav>
      <section id="ep-home" class="expert-page active">
        <section class="expert-hero">
          <div class="expert-hero-inner">
            <div class="expert-hero-content">
              <div id="foundation-eyebrow" class="ob-template-eyebrow">Decision coach</div>
              <h1 id="foundation-name" class="expert-hero-name">Ari Lane</h1>
              <h2 class="expert-hero-title">Clear decisions, practical momentum</h2>
              <p id="foundation-intro" class="ob-template-intro">Personal guidance for the consequential choice in front of you.</p>
              <div class="expert-hero-btns"><button id="hero-primary-btn" type="button">Start with Ari</button><button id="hero-book-later-btn" type="button">Explore services</button></div>
            </div>
          </div>
        </section>
        <section class="expert-about-strip"><p>Thoughtful guidance grounded in the next useful step.</p></section>
        <section class="services-preview">
          <div class="services-preview-inner"><h2>Ways to work together</h2><div class="services-grid-4">
            <button id="foundation-service" type="button" class="service-mini"><span class="service-mini-name">Focused session</span><span class="service-mini-price">From $3 per minute</span></button>
          </div></div>
        </section>
        <section class="testimonials"><div class="testimonials-inner"><h2>Client perspective</h2><div class="testi-grid"><article class="testi-card"><p id="foundation-proof">Specific, calm, and immediately useful.</p></article></div></div></section>
        <section class="ob-template-final-cta"><h2 class="ob-template-final-title">Ready for a clearer next step?</h2><p class="ob-template-final-copy">Choose the format that works for you.</p><button id="bottom-cta-btn" type="button">Book a session</button></section>
      </section>
      <footer class="expert-footer"><strong class="expert-footer-logo">Ari Lane</strong><span>Independent expert guidance.</span></footer>
    </main>`;
}

async function install(page, bodyClass, markup) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style></head><body class="${bodyClass}">${markup}</body></html>`, { waitUntil: 'domcontentloaded' });
}

async function measureText(page, selector, options = {}) {
  const locator = page.locator(selector);
  assert.equal(await locator.count(), 1, `Expected one text target for ${options.label || selector}`);
  const result = await locator.evaluate((element, input) => {
    function color(value) {
      const match = String(value || '').match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
      if(match) return { r:Number(match[1]),g:Number(match[2]),b:Number(match[3]),a:match[4] === undefined ? 1 : Number(match[4]) };
      const srgb=String(value || '').match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/i);
      if(srgb) return {r:Number(srgb[1])*255,g:Number(srgb[2])*255,b:Number(srgb[3])*255,a:srgb[4] === undefined ? 1 : Number(srgb[4])};
      throw new Error(`Unsupported computed color: ${value}`);
    }
    function over(top,bottom) {
      const alpha=top.a + bottom.a*(1-top.a);
      if(alpha <= 0) return {r:255,g:255,b:255,a:1};
      return {
        r:(top.r*top.a + bottom.r*bottom.a*(1-top.a))/alpha,
        g:(top.g*top.a + bottom.g*bottom.a*(1-top.a))/alpha,
        b:(top.b*top.a + bottom.b*bottom.a*(1-top.a))/alpha,
        a:alpha,
      };
    }
    function background(node, includeNode=true) {
      const chain=[];
      let current=includeNode ? node : node && node.parentElement;
      while(current){chain.push(current);current=current.parentElement;}
      let output={r:255,g:255,b:255,a:1};
      chain.reverse().forEach(item=>{const layer=color(getComputedStyle(item).backgroundColor);if(layer.a>0)output=over(layer,output);});
      return output;
    }
    function channel(value){value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;}
    function lum(value){return .2126*channel(value.r)+.7152*channel(value.g)+.0722*channel(value.b);}
    function ratio(a,b){const aa=lum(a),bb=lum(b);return (Math.max(aa,bb)+.05)/(Math.min(aa,bb)+.05);}
    function rgb(value){return `rgb(${Math.round(value.r)}, ${Math.round(value.g)}, ${Math.round(value.b)})`;}
    const style=getComputedStyle(element,input.pseudo || null);
    const localBackground=background(element,true);
    const parentBackground=background(element,false);
    const rawForeground=color(style.color);
    const internalForeground=over(rawForeground,localBackground);
    const opacity=Math.max(0,Math.min(1,Number(getComputedStyle(element).opacity || 1)));
    const visibleBackground=opacity < 1 ? over({...localBackground,a:opacity},parentBackground) : localBackground;
    const visibleForeground=opacity < 1 ? over({...internalForeground,a:opacity},parentBackground) : internalForeground;
    const fontSize=Number.parseFloat(style.fontSize || '0');
    const weight=Number.parseInt(style.fontWeight,10) || (String(style.fontWeight).toLowerCase() === 'bold' ? 700 : 400);
    const large=fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
    return {
      foreground:rgb(visibleForeground),background:rgb(visibleBackground),
      ratio:ratio(visibleForeground,visibleBackground),fontSize,fontWeight:weight,large,opacity,
    };
  }, options);
  const threshold = options.threshold || (result.large ? 3 : 4.5);
  return {
    kind: 'text', label: options.label || selector, selector,
    ratio: Number(result.ratio.toFixed(2)), rawRatio: result.ratio, threshold,
    pass: result.ratio + 1e-9 >= threshold, exempt: options.exempt || null,
    foreground: result.foreground, background: result.background,
    fontSize: result.fontSize, fontWeight: result.fontWeight, large: result.large, opacity: result.opacity,
  };
}

async function measureIndicator(page, selector, options = {}) {
  const locator = page.locator(selector);
  assert.equal(await locator.count(), 1, `Expected one indicator target for ${options.label || selector}`);
  const result = await locator.evaluate((element, input) => {
    function color(value) {
      const match=String(value || '').match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
      if(match) return {r:Number(match[1]),g:Number(match[2]),b:Number(match[3]),a:match[4]===undefined?1:Number(match[4])};
      const srgb=String(value || '').match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/i);
      if(srgb) return {r:Number(srgb[1])*255,g:Number(srgb[2])*255,b:Number(srgb[3])*255,a:srgb[4]===undefined?1:Number(srgb[4])};
      throw new Error(`Unsupported computed color: ${value}`);
    }
    function over(top,bottom){const a=top.a+bottom.a*(1-top.a);return {r:(top.r*top.a+bottom.r*bottom.a*(1-top.a))/a,g:(top.g*top.a+bottom.g*bottom.a*(1-top.a))/a,b:(top.b*top.a+bottom.b*bottom.a*(1-top.a))/a,a};}
    function background(node,includeNode){const chain=[];let current=includeNode?node:node.parentElement;while(current){chain.push(current);current=current.parentElement;}let output={r:255,g:255,b:255,a:1};chain.reverse().forEach(item=>{const layer=color(getComputedStyle(item).backgroundColor);if(layer.a>0)output=over(layer,output);});return output;}
    function channel(value){value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;}
    function lum(value){return .2126*channel(value.r)+.7152*channel(value.g)+.0722*channel(value.b);}
    function ratio(a,b){const aa=lum(a),bb=lum(b);return (Math.max(aa,bb)+.05)/(Math.min(aa,bb)+.05);}
    function rgb(value){return `rgb(${Math.round(value.r)}, ${Math.round(value.g)}, ${Math.round(value.b)})`;}
    const style=getComputedStyle(element);
    const property=input.property || 'outlineColor';
    const raw=color(style[property]);
    const offset=Number.parseFloat(style.outlineOffset || '0');
    const adjacent=property === 'outlineColor' && offset < 0 ? background(element,true) : background(element,false);
    const visible=over(raw,adjacent);
    const width=Number.parseFloat(property === 'outlineColor' ? style.outlineWidth : style.borderTopWidth) || 0;
    const lineStyle=property === 'outlineColor' ? style.outlineStyle : style.borderTopStyle;
    return {ratio:ratio(visible,adjacent),indicator:rgb(visible),adjacent:rgb(adjacent),width,lineStyle,focusVisible:element.matches(':focus-visible')};
  }, options);
  const threshold=options.threshold || 3;
  const visiblyPresent=result.width >= (options.minimumWidth || 1) && result.lineStyle !== 'none' && result.lineStyle !== 'hidden';
  const focusState=options.focus ? result.focusVisible : true;
  return {
    kind: options.focus ? 'focus' : 'indicator',label:options.label || selector,selector,
    ratio:Number(result.ratio.toFixed(2)),rawRatio:result.ratio,threshold,
    pass:visiblyPresent && focusState && result.ratio + 1e-9 >= threshold,
    indicator:result.indicator,background:result.adjacent,width:result.width,lineStyle:result.lineStyle,focusVisible:result.focusVisible,
  };
}

async function keyboardFocus(page, selector) {
  await page.mouse.move(0,0);
  await page.keyboard.press('Tab');
  await page.locator(selector).focus();
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.OWNLYBIZ_CHROME_PATH ? { executablePath: process.env.OWNLYBIZ_CHROME_PATH } : {}),
});

const measurements=[];
const blockedRequests=[];

try {
  const context=await browser.newContext({offline:true});
  await context.route('**/*',route=>{blockedRequests.push(route.request().url());return route.abort();});
  const page=await context.newPage();

  for(const viewport of viewports){
    await page.setViewportSize({width:viewport.width,height:viewport.height});

    for(const mode of ['light','dark']){
      await install(page,`ob-ui-${mode}`,galleryMarkup());
      const prefix=`website-gallery.${mode}.${viewport.name}`;
      measurements.push({...await measureText(page,'#contrast-gallery-title',{label:`${prefix}.default-title`}),surface:prefix,state:'default'});
      measurements.push({...await measureText(page,'#contrast-gallery-description',{label:`${prefix}.default-description`}),surface:prefix,state:'default'});

      await page.locator('#contrast-gallery-preview').hover();
      measurements.push({...await measureText(page,'#contrast-gallery-preview',{label:`${prefix}.hover-action-text`}),surface:prefix,state:'hover'});
      measurements.push({...await measureIndicator(page,'#contrast-gallery-preview',{label:`${prefix}.hover-action-border`,property:'borderTopColor'}),surface:prefix,state:'hover'});

      await page.locator('#contrast-gallery-card').evaluate(card=>card.setAttribute('data-selected','true'));
      measurements.push({...await measureText(page,'#contrast-gallery-current',{label:`${prefix}.selected-badge`}),surface:prefix,state:'selected'});
      measurements.push({...await measureIndicator(page,'#contrast-gallery-card',{label:`${prefix}.selected-border`,property:'borderTopColor'}),surface:prefix,state:'selected'});

      await page.locator('#contrast-gallery-use').evaluate(button=>{button.disabled=true;});
      measurements.push({...await measureText(page,'#contrast-gallery-use',{label:`${prefix}.disabled-use`,exempt:'inactive-control'}),surface:prefix,state:'disabled'});

      await keyboardFocus(page,'#contrast-gallery-preview');
      measurements.push({...await measureText(page,'#contrast-gallery-preview',{label:`${prefix}.focus-action-text`}),surface:prefix,state:'focus'});
      measurements.push({...await measureIndicator(page,'#contrast-gallery-preview',{label:`${prefix}.focus-ring`,focus:true,minimumWidth:2}),surface:prefix,state:'focus'});
    }

    if(viewport.name === 'desktop'){
      await install(page,'ob-ui-light',lightSidebarMarkup());
      const sidebarPrefix='dashboard-sidebar.light.desktop';
      for(const [label,selector] of [
        ['brand','#sidebar-brand'],
        ['expert-name','#sidebar-expert'],
        ['expert-role','#sidebar-role'],
        ['online-status','#sidebar-online'],
        ['group-label','#sidebar-group'],
        ['default-item','#sidebar-default'],
        ['active-item','#sidebar-active'],
        ['utility-action','#sidebar-utility'],
        ['utility-note','#sidebar-note'],
      ]) measurements.push({...await measureText(page,selector,{label:`${sidebarPrefix}.${label}`}),surface:sidebarPrefix});
      await page.locator('#sidebar-default').hover();
      measurements.push({...await measureText(page,'#sidebar-default',{label:`${sidebarPrefix}.hover-item`}),surface:sidebarPrefix,state:'hover'});
      await keyboardFocus(page,'#sidebar-active');
      measurements.push({...await measureIndicator(page,'#sidebar-active',{label:`${sidebarPrefix}.active-focus`,focus:true,minimumWidth:2}),surface:sidebarPrefix,state:'focus'});
    }

    await install(page,'ob-ui-dark',assistantShell());
    await page.evaluate(()=>{
      const drawer=document.getElementById('ob-guidance-drawer');drawer.hidden=false;
      document.getElementById('ob-guidance-practice').setAttribute('aria-busy','false');
      document.getElementById('ob-guidance-practice-actions').innerHTML='<button type="button">Review services and rates</button><button type="button">Set availability</button>';
      document.getElementById('ob-guidance-starters').innerHTML='<button type="button">What should I do next?</button>';
      const history=document.getElementById('ob-guidance-history');history.hidden=false;
      document.getElementById('ob-guidance-history-status').textContent='Two saved conversations';
      document.getElementById('ob-guidance-history-list').innerHTML='<div class="ob-guidance-history-row"><button type="button"><span>Launch planning</span><small>Updated today</small></button><button type="button" aria-label="Delete Launch planning">Delete</button></div>';
      document.getElementById('ob-guidance-ai-log').innerHTML='<div class="ob-guidance-ai-message user"><span class="ob-guidance-message-speaker">You</span><span class="ob-guidance-message-text">Help me publish my website.</span></div><div class="ob-guidance-ai-message assistant"><span class="ob-guidance-message-speaker">Personal Assistant</span><span class="ob-guidance-message-text">Your website is still a draft. Review it before publishing.</span><div class="ob-guidance-message-actions"><button type="button">Open Website</button></div><div class="ob-guidance-message-controls"><button type="button">Helpful</button></div></div>';
      document.getElementById('ob-guidance-ai-input').value='What should I review first?';
      document.getElementById('ob-guidance-ai-status').textContent='Personal Assistant is ready and remains read-only.';
    });
    const paPrefix=`personal-assistant.${viewport.name}`;
    for(const [label,selector] of [
      ['body-copy','#ob-guidance-context-copy'],
      ['primary-action','#ob-guidance-practice-actions button:first-child'],
      ['starter-action','#ob-guidance-starters button'],
      ['user-message','.ob-guidance-ai-message.user .ob-guidance-message-text'],
      ['user-speaker','.ob-guidance-ai-message.user .ob-guidance-message-speaker'],
      ['assistant-message','.ob-guidance-ai-message.assistant .ob-guidance-message-text'],
      ['assistant-action','.ob-guidance-message-actions button'],
      ['message-control','.ob-guidance-message-controls button'],
      ['history-status','#ob-guidance-history-status'],
      ['history-title','.ob-guidance-history-row>button:first-child span'],
      ['history-meta','.ob-guidance-history-row small'],
      ['history-delete','.ob-guidance-history-row>button:last-child'],
      ['composer-text','#ob-guidance-ai-input'],
      ['send-action','#ob-guidance-ai-form button[type="submit"]'],
      ['assistant-status','#ob-guidance-ai-status'],
    ]) measurements.push({...await measureText(page,selector,{label:`${paPrefix}.${label}`}),surface:paPrefix});
    measurements.push({...await measureText(page,'#ob-guidance-ai-input',{label:`${paPrefix}.composer-placeholder`,pseudo:'::placeholder'}),surface:paPrefix});
    await keyboardFocus(page,'#ob-guidance-ai-input');
    measurements.push({...await measureIndicator(page,'#ob-guidance-ai-input',{label:`${paPrefix}.composer-focus`,focus:true,minimumWidth:2}),surface:paPrefix});
    await keyboardFocus(page,'#ob-guidance-ai-form button[type="submit"]');
    measurements.push({...await measureIndicator(page,'#ob-guidance-ai-form button[type="submit"]',{label:`${paPrefix}.send-focus`,focus:true,minimumWidth:2}),surface:paPrefix});

    for(const [id,foundation] of Object.entries(foundations)){
      await install(page,'',publicMarkup(id,foundation));
      const prefix=`public-foundation.${id}.${viewport.name}`;
      for(const [label,selector] of [
        ['nav-link','#foundation-nav-link'],
        ['eyebrow','#foundation-eyebrow'],
        ['hero-name','#foundation-name'],
        ['intro','#foundation-intro'],
        ['action','#hero-primary-btn'],
        ['service-name','#foundation-service .service-mini-name'],
        ['service-price','#foundation-service .service-mini-price'],
        ['proof','#foundation-proof'],
        ['accent-title','.ob-template-final-title'],
        ['accent-copy','.ob-template-final-copy'],
        ['footer-name','.expert-footer-logo'],
      ]) measurements.push({...await measureText(page,selector,{label:`${prefix}.${label}`}),surface:prefix});
      await keyboardFocus(page,'#foundation-service');
      measurements.push({...await measureIndicator(page,'#foundation-service',{label:`${prefix}.service-focus`,focus:true,minimumWidth:2}),surface:prefix});
    }
  }

  const failures=measurements.filter(item=>!item.pass && !item.exempt);
  const minimums=Object.fromEntries([...new Set(measurements.map(item=>item.surface))].map(surface=>{
    const scoped=measurements.filter(item=>item.surface===surface && !item.exempt);
    const text=scoped.filter(item=>item.kind==='text').sort((a,b)=>a.rawRatio-b.rawRatio)[0] || null;
    const indicators=scoped.filter(item=>item.kind!=='text').sort((a,b)=>a.rawRatio-b.rawRatio)[0] || null;
    return [surface,{
      text:text ? {label:text.label,ratio:text.ratio,threshold:text.threshold} : null,
      indicator:indicators ? {label:indicators.label,ratio:indicators.ratio,threshold:indicators.threshold} : null,
    }];
  }));
  const report={
    status:failures.length?'FAIL':'PASS',
    sourceSha256:createHash('sha256').update(source).digest('hex'),
    browser:'isolated offline Chromium',
    viewports:viewports.map(({name,width,height})=>({name,width,height})),
    thresholds:{normalText:4.5,largeText:3,focusAndStateIndicators:3,disabledText:'measured; inactive-control exemption'},
    blockedRequestCount:blockedRequests.length,
    minimums,
    measurements:measurements.map(({rawRatio,...item})=>item),
    failures:failures.map(({rawRatio,...item})=>item),
  };
  const output=process.argv.includes('--summary')
    ? {...report,measurements:undefined}
    : report;
  console.log(JSON.stringify(output,null,2));
  assert.equal(failures.length,0,`Contrast failures: ${failures.map(item=>`${item.label} ${item.ratio}:1 < ${item.threshold}:1`).join('; ')}`);
} finally {
  await browser.close();
}
