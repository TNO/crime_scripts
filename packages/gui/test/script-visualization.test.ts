import assert from 'node:assert/strict';
import test from 'node:test';
import type { Activity, Cast, CrimeScript, Scene, Track } from '../src/models/data-model.ts';
import {
  activityMatchesRole,
  applyTrackSelection,
  findMatchingTrack,
  relatedScriptsForActivity,
  selectableRelatedScripts,
  resolveActivityRoles,
  sceneOutlineDetails,
  sceneVariantSelection,
} from '../src/models/script-visualization.ts';

const activity = (cast: string[] = []): Activity => ({
  id: 'activity',
  label: 'Activity',
  cast,
  attributes: [],
  transports: [],
});

const scene = (selectedVariantId = 'email'): Scene => ({
  id: 'contact',
  label: 'Misleidend contact',
  selectedVariantId,
  variants: [
    {
      id: 'email',
      label: 'E-mailroute',
      activities: [activity(['coordinator']), activity()],
      conditions: [],
      indicators: [],
      measures: [],
      opportunities: [],
    },
    {
      id: 'sms',
      label: 'Sms-route',
      activities: [activity(['sender'])],
      conditions: [],
      indicators: [],
      measures: [],
      opportunities: [],
    },
  ],
});

test('scene outline details describe the selected modus operandi', () => {
  assert.deepEqual(sceneOutlineDetails(scene()), {
    activityCount: 2,
    selectedVariantLabel: 'E-mailroute',
    variantCount: 2,
  });
});

test('activity roles preserve assignment order and ignore missing or duplicate roles', () => {
  const cast: Cast[] = [
    { id: 'coordinator', label: 'Coordinator' },
    { id: 'sender', label: 'Sender' },
  ];

  assert.deepEqual(
    resolveActivityRoles(activity(['sender', 'missing', 'coordinator', 'sender']), cast),
    [cast[1], cast[0]]
  );
  assert.equal(activityMatchesRole(activity(['sender']), 'sender'), true);
  assert.equal(activityMatchesRole(activity(['sender']), 'coordinator'), false);
});

test('related activity scripts resolve once, exclude self-links, and respect script mode', () => {
  const current = {
    id: 'current',
    scriptFamilyId: 'current-family',
    classification: 'restricted',
  } as CrimeScript;
  const publicTarget = {
    id: 'public-target',
    label: 'Public target',
    scriptFamilyId: 'target-family',
    classification: 'public',
  } as CrimeScript;
  const restrictedTarget = {
    id: 'restricted-target',
    label: 'Restricted target',
    scriptFamilyId: 'target-family',
    classification: 'restricted',
  } as CrimeScript;
  const linked = {
    ...activity(),
    relatedScriptIds: ['current', 'public-target', 'public-target', 'missing'],
  };

  assert.deepEqual(
    relatedScriptsForActivity(linked, current, [current, publicTarget, restrictedTarget], 'public')
      .map(({ id }) => id),
    ['public-target']
  );
  assert.deepEqual(
    relatedScriptsForActivity(linked, current, [current, publicTarget, restrictedTarget], 'restricted')
      .map(({ id }) => id),
    ['restricted-target']
  );
});

test('related-script editor choices exclude the current family and follow script mode', () => {
  const current = {
    id: 'current',
    scriptFamilyId: 'current-family',
    classification: 'restricted',
  } as CrimeScript;
  const scripts = [
    current,
    { id: 'current-public', scriptFamilyId: 'current-family', classification: 'public' },
    { id: 'target-public', scriptFamilyId: 'target-family', classification: 'public' },
    { id: 'target-restricted', scriptFamilyId: 'target-family', classification: 'restricted' },
  ] as CrimeScript[];

  assert.deepEqual(
    selectableRelatedScripts(current, scripts, 'public').map(({ id }) => id),
    ['target-public']
  );
  assert.deepEqual(
    selectableRelatedScripts(current, scripts, 'restricted').map(({ id }) => id),
    ['target-restricted']
  );
});

test('track selection updates scene variants and can be matched again', () => {
  const fixedScene: Scene = {
    id: 'payment',
    label: 'Payment',
    variants: [{
      id: 'payment-main',
      label: 'Main route',
      activities: [],
      conditions: [],
      indicators: [],
      measures: [],
      opportunities: [],
    }],
  };
  const scenes = [scene(), fixedScene];
  const tracks: Track[] = [
    {
      id: 'sms-track',
      label: 'Benadering per sms',
      sceneVariants: { contact: 'sms' },
    },
  ];

  applyTrackSelection(scenes, tracks[0]);

  assert.deepEqual(sceneVariantSelection(scenes), { contact: 'sms' });
  assert.equal(sceneOutlineDetails(scenes[0]).selectedVariantLabel, 'Sms-route');
  assert.equal(findMatchingTrack(tracks, sceneVariantSelection(scenes))?.id, 'sms-track');
});

test('track matching ignores legacy entries for scenes without alternatives', () => {
  const tracks: Track[] = [
    {
      id: 'legacy-sms-track',
      label: 'Benadering per sms',
      sceneVariants: {
        contact: 'sms',
        payment: 'payment-main',
      },
    },
  ];

  assert.equal(findMatchingTrack(tracks, { contact: 'sms' })?.id, 'legacy-sms-track');
  assert.equal(findMatchingTrack(tracks, { contact: 'email' }), undefined);
});
