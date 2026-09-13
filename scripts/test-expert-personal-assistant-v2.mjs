import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function section(pattern, label) {
  const match = html.match(pattern);
  assert(match, `${label} must exist`);
  return match[0];
}

const phase1 = section(
  /<script id="ownlybiz-expert-phase1-ux-20260913">([\s\S]*?)<\/script>/,
  'Phase 1 Personal Assistant runtime',
);
const launch = section(
  /<script id="ownlybiz-launch-center-v1">([\s\S]*?)<\/script>/,
  'Launch Status runtime',
);
const drawer = section(
  /<aside class="ob-guidance-drawer"[\s\S]*?<\/aside>/,
  'Personal Assistant drawer',
);
const assistantActions = section(
  /var ASSISTANT_ACTIONS=\{[\s\S]*?\n  \};/,
  'closed Personal Assistant action catalog',
);
const fallbackRequest = section(
  /function fallbackAssistantQuestion\([\s\S]*?\n  \}/,
  'compatibility request',
);

assert.equal((html.match(/id="ob-guidance-drawer"/g) || []).length, 1, 'one existing drawer remains the only dashboard assistant');
assert.doesNotMatch(html, /\bco[- ]?founder\b/i, 'the product never exposes the disallowed persona name');
assert.match(drawer, /Personal Assistant/);
assert.match(drawer, /I’m your personal assistant/);
assert.match(drawer, /I know Ownlybiz, recognize your saved setup/);
assert.match(drawer, /never changes your practice/);
assert.match(drawer, /memory is updated only when you confirm/);
assert.match(drawer, /role="log"[^>]*aria-label="Conversation with your Personal Assistant"/);
assert.match(drawer, /data-ob-assistant-conversation="new"/);
assert.match(drawer, /data-ob-assistant-conversation="history"/);
assert.match(drawer, /data-ob-assistant-profile-action="edit"/);
assert.match(drawer, /data-ob-assistant-profile-action="confirm-forget"/);
assert.match(drawer, /data-ob-assistant-onboarding|id="ob-guidance-onboarding-controls"/);
assert.match(drawer, /data-ob-assistant-goal="take_bookings"/);
assert.match(drawer, /id="ob-guidance-missing-context"/);
assert.match(drawer, /Add only the missing details/);
assert.match(drawer, /Shift|rows="2"|<textarea id="ob-guidance-ai-input"/, 'the composer supports a multiline accessible input');

for (const surface of [
  'website.overview',
  'website.design',
  'website.pages',
  'website.navigation',
  'website.domains',
  'website.seo',
  'website.media',
]) {
  assert(phase1.includes(surface) || phase1.includes(surface.replace('website.', '')), `surface catalog covers ${surface}`);
}
assert.match(phase1, /function surfaceId\(panel\)/);
assert.match(phase1, /var currentSurface=surfaceId\(\)/, 'every turn captures the live surface immediately before its request');
assert.match(phase1, /bootstrap\?surface_id='\+encodeURIComponent\(currentSurface\)/);
assert.match(fallbackRequest, /message:question/);
assert.match(fallbackRequest, /conversation_id:conversationId \|\| null/);
assert.match(fallbackRequest, /request_id:currentRequestId/);
assert.match(fallbackRequest, /surface_id:currentSurface/);
assert.match(fallbackRequest, /catalog_version:ASSISTANT_CATALOG_VERSION/);
assert.match(phase1, /conversations\/'\+encodeURIComponent\(id\)\+'\/messages/, 'history-backed turn endpoint is present');
assert.match(phase1, /\/api\/ai\/expert-assistant\/conversations\?limit=20/);
assert.match(phase1, /\/api\/ai\/expert-assistant\/messages\/'\+encodeURIComponent\(messageId\)\+'\/feedback/);

assert.doesNotMatch(assistantActions, /\b(?:href|url|selector|onclick)\s*:/i, 'the client catalog cannot contain arbitrary navigation material');
const backendActionIds = [
  'open-overview', 'open-live-session', 'open-bookings', 'open-sessions', 'open-pricing',
  'open-written-answers', 'open-group-sessions', 'open-messages', 'open-client-inquiries',
  'open-clients', 'open-reviews', 'open-payments', 'open-payouts', 'open-plan-settings',
  'open-prepaid-credit', 'open-promotions', 'open-website-editor', 'open-website-design',
  'open-website-pages', 'open-website-navigation', 'open-website-media', 'open-website-publish',
  'open-website-view', 'open-domain-settings', 'open-seo-settings', 'open-email-center',
  'open-email-contacts', 'open-email-templates', 'open-email-campaigns', 'open-email-journeys',
  'open-email-reports', 'open-analytics', 'open-marketplace', 'open-settings',
  'open-profile-settings', 'open-availability', 'open-website-settings', 'open-billing-settings',
  'open-email-settings', 'open-ai-settings', 'open-privacy-settings', 'open-security-settings',
];
const clientActionIds = [...assistantActions.matchAll(/^\s*'([^']+)'\s*:/gm)].map((match) => match[1]);
assert.deepEqual(clientActionIds.sort(), backendActionIds.sort(), 'the closed client allowlist exactly covers the backend actionIds contract');
const evaluatedActionCatalog = vm.runInNewContext(
  `(${assistantActions.replace(/^var ASSISTANT_ACTIONS=/, '').replace(/;$/, '')})`,
  Object.create(null),
);
for (const id of backendActionIds) {
  const action = evaluatedActionCatalog[id];
  assert(action, `${id} is recognized`);
  assert.equal(Boolean(action.panel) !== Boolean(action.setting), true, `${id} owns exactly one internal destination type`);
  assert.deepEqual(
    Object.keys(action).filter((key) => !['label', 'panel', 'setting', 'focus', 'websiteSurface', 'emailTab'].includes(key)),
    [],
    `${id} contains only closed client-owned navigation metadata`,
  );
}
assert.equal(evaluatedActionCatalog['open-model-invented-url'], undefined, 'an unknown model-invented action has no destination');
assert.match(phase1, /if\(!known\) return null/);
assert.match(phase1, /id=LEGACY_ASSISTANT_ACTION_ALIASES\[id\] \|\| id/, 'old action aliases normalize into the closed current catalog');
assert.match(phase1, /if\(known\.panel[\s\S]*?!findDashboardNav\(known\.panel\)\) return null/);
assert.match(phase1, /if\(known\.setting && !findSettingsNav\(known\.setting\)\) return null/);
assert.match(phase1, /data-ob-assistant-action/);
assert.doesNotMatch(phase1, /raw\.(?:href|url)|action\.(?:href|url)|location\.href\s*=\s*(?:raw|action)/, 'server-returned locations are never followed');
assert.match(phase1, /That destination is not available for this account\. No action was taken\./, 'unknown or unavailable IDs fail closed');

assert.match(phase1, /\/api\/ai\/expert-assistant\/profile'\s*,\s*\{method:'PATCH'/);
assert.match(phase1, /expected_revision:profileRevision/);
assert.match(phase1, /primary_goal:null,practice_focus:null,ideal_client:null,launch_horizon:null/);
assert.match(phase1, /\/api\/ai\/expert-assistant\/onboarding'\s*,\s*\{method:'PATCH'/);
assert.match(phase1, /\['active','paused','dismissed'\]\.includes\(status\)/);
assert.doesNotMatch(phase1, /completed_step_id|mark_complete|website_published\s*:/, 'the Personal Assistant cannot forge setup completion or publish');

assert.match(phase1, /status === 'not_started'/, 'server onboarding state controls the first-run invitation');
assert.match(phase1, /liveWorkActive\(\) \|\| otherDialogOpen\(\)/, 'live work and other dialogs suppress automatic opening');
assert.match(phase1, /ob_personal_assistant_auto_open_v2_/, 'automatic opening is presentation-scoped and one-time per session/principal');
assert.match(phase1, /setBackgroundInert\(true\)/);
assert.match(phase1, /setBackgroundInert\(false\)/);
assert.match(phase1, /Personal Assistant said:/, 'messages receive explicit accessible speaker labels');
assert.match(phase1, /assistantRequestController\.abort\(\)/, 'new conversations and identity teardown cancel in-flight assistant work');
assert.match(phase1, /exactCredential:true/, 'current credential fencing remains exact');
assert.match(phase1, /credentialRotated:scrubGuidance/);

assert.match(launch, /window\.ownlybizLaunchStatusSnapshot/);
assert.match(launch, /next_step:next \? \{title:next\.title,reason:next\.copy,action_id:assistantActionForLaunch\(next\.action\)\}/);
assert.doesNotMatch(section(/function assistantActionForLaunch\([\s\S]*?\n  \}/, 'Launch navigation projection'), /publish:|email:/, 'Launch projection exposes navigation only, never publish or resend mutations');
assert.match(phase1, /readLaunchSnapshot\(\)/, 'the assistant can truthfully degrade to existing Launch Status state');

assert.doesNotMatch(phase1, /https?:\/\//, 'the Personal Assistant runtime has no hard-coded backend or production URL');
assert.doesNotMatch(phase1, /setInterval\s*\(/, 'the Personal Assistant adds no recurring installer or polling loop');
assert.match(phase1, /Guide mode is active\. I can still explain Ownlybiz/);
assert.match(phase1, /Dashboard guide response shown\. AI help is temporarily unavailable/);
assert.match(phase1, /support is contacted only when you submit the form|submitSupport/, 'support remains an explicit separate submission');

console.log('Expert Personal Assistant v2 contract and safety smoke passed.');
console.log('Persona, first-login state, surfaces, closed navigation, memory consent, history fallback, accessibility, and identity fencing verified.');
