import assert from 'node:assert/strict';
import test from 'node:test';
import type { Activity, Cast, Scene, Track } from '../src/models/data-model.ts';
import {
  activityMatchesRole,
  applyTrackSelection,
  findMatchingTrack,
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
