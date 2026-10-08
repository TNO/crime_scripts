import assert from 'node:assert/strict';
import test from 'node:test';
import type { Cast, CrimeScript } from '../src/models/data-model.ts';
import {
  compareLearningAnswer,
  generateLearningExercise,
  isLearningExerciseAvailable,
  learningScripts,
} from '../src/models/learning-mode.ts';

const script = (
  id: string,
  classification: CrimeScript['classification'],
  language: CrimeScript['language'],
  labels: string[]
): CrimeScript => ({
  id,
  label: id,
  classification,
  language,
  scriptFamilyId: id,
  owner: 'test',
  updated: 1,
  reviewer: [],
  status: 1,
  literature: [],
  productIds: [],
  aiGenerated: false,
  stages: labels.map((label, index) => ({
    id: `${id}-scene-${index}`,
    label,
    variants: [{
      id: `${id}-variant-${index}`,
      label: `${label} route`,
      activities: [{
        id: `${id}-activity-${index}`,
        label: `${label} activity`,
        cast: ['role-a'],
      }],
      conditions: [],
      indicators: [{
        id: `${id}-indicator-${index}`,
        label: `${label} indicator`,
      }],
      measures: [{
        id: `${id}-measure-${index}`,
        label: `${label} barrier`,
        cat: 'test',
        partners: [],
      }],
      opportunities: [],
    }],
  })),
});

const cast: Cast[] = [
  { id: 'role-a', label: 'Role A' },
  { id: 'role-b', label: 'Role B' },
  { id: 'role-blocked', label: 'Blocked role' },
];

test('learning exercises are deterministic and leave their source scripts unchanged', () => {
  const source = script('source', 'public', 'nl', ['Prepare', 'Execute', 'Conceal']);
  const alternative = script('alternative', 'public', 'nl', ['Approach']);
  const before = structuredClone([source, alternative]);

  const first = generateLearningExercise(source, [source, alternative], cast, 42);
  const second = generateLearningExercise(source, [source, alternative], cast, 42);

  assert.deepEqual(first, second);
  assert.deepEqual([source, alternative], before);
});

test('exercise candidates come from every supported field but only compatible scripts', () => {
  const source = script('source', 'public', 'nl', ['Prepare', 'Execute']);
  const compatible = script('compatible', 'public', 'nl', ['Approach']);
  compatible.stages[0].variants[0].activities[0].cast = ['role-b'];
  const restricted = script('restricted', 'restricted', 'nl', ['Restricted']);
  restricted.stages[0].variants[0].activities[0].cast = ['role-blocked'];
  const english = script('english', 'public', 'en', ['English']);
  english.stages[0].variants[0].activities[0].cast = ['role-blocked'];

  const exercise = generateLearningExercise(
    source,
    [source, compatible, restricted, english],
    cast,
    7
  );

  assert.deepEqual(
    exercise.questions.map(({ kind }) => kind),
    [
      'scene-selection',
      'scene-order',
      'activity-selection',
      'role-selection',
      'indicator-selection',
      'measure-selection',
    ]
  );
  assert.ok(exercise.questions.some(({ candidates }) =>
    candidates.some(({ id }) => id === 'compatible-scene-0')
  ));
  assert.ok(exercise.questions.some(({ candidates }) =>
    candidates.some(({ id }) => id === 'compatible-activity-0')
  ));
  assert.ok(exercise.questions.some(({ candidates }) =>
    candidates.some(({ id }) => id === 'role-b')
  ));
  assert.equal(exercise.questions.some(({ candidates }) =>
    candidates.some(({ id }) => id.includes('restricted') || id.includes('english') || id === 'role-blocked')
  ), false);
});

test('learning starts when a compatible script has an activity without a label', () => {
  const source = script('source', 'public', 'nl', ['Prepare']);
  const compatible = script('compatible', 'public', 'nl', ['Approach']);
  Reflect.deleteProperty(compatible.stages[0].variants[0].activities[0], 'label');
  Reflect.deleteProperty(source.stages[0].variants[0].indicators[0], 'label');
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (message: string) => { warnings.push(message); };
  let exercise;
  try {
    exercise = generateLearningExercise(source, [source, compatible], cast, 7);
  } finally {
    console.warn = originalWarn;
  }
  const activityQuestion = exercise.questions.find(({ kind }) => kind === 'activity-selection');
  const indicatorQuestion = exercise.questions.find(({ kind }) => kind === 'indicator-selection');

  assert.ok(activityQuestion);
  assert.ok(activityQuestion.candidates.some(({ id, label }) =>
    id === 'compatible-activity-0' && label === id
  ));
  assert.ok(indicatorQuestion?.candidates.some(({ id, label }) =>
    id === 'source-indicator-0' && label === id
  ));
  assert.deepEqual(warnings, [
    'Learning exercise item "compatible-activity-0" has no label; displaying its ID.',
    'Learning exercise item "source-indicator-0" has no label; displaying its ID.',
  ]);
});

test('answer comparison reports reference overlap and ordering without judging alternatives', () => {
  const selection = compareLearningAnswer({
    id: 'selection',
    kind: 'role-selection',
    context: 'Activity',
    candidates: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ],
    referenceIds: ['a', 'b'],
  }, ['a', 'c']);
  const ordering = compareLearningAnswer({
    id: 'ordering',
    kind: 'scene-order',
    context: 'Script',
    candidates: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ],
    referenceIds: ['a', 'b', 'c'],
  }, ['b', 'a', 'c']);

  assert.deepEqual({ selection, ordering }, {
    selection: {
      matchesReference: false,
      matchedIds: ['a'],
      missingIds: ['b'],
      additionalIds: ['c'],
    },
    ordering: {
      matchesReference: false,
      matchedIds: ['b', 'a', 'c'],
      missingIds: [],
      additionalIds: [],
      matchingOrderPairs: 2,
      referenceOrderPairs: 3,
    },
  });
});

test('reviewed-only learning excludes drafts and scripts still marked unreviewed', () => {
  const draft = script('draft', 'public', 'nl', ['Draft']);
  const reviewed = { ...script('reviewed', 'public', 'nl', ['Reviewed']), status: 4 };
  const pending = {
    ...script('pending', 'public', 'nl', ['Pending']),
    status: 4,
    unreviewed: true,
  };

  assert.deepEqual(learningScripts([draft, reviewed, pending], true).map(({ id }) => id), ['reviewed']);
});

test('role exercises use the first role-bearing activity anywhere in the script', () => {
  const source = script('source', 'public', 'nl', ['Without role', 'With role']);
  source.stages[0].variants[0].activities[0].cast = [];
  source.stages[1].variants[0].activities[0].cast = ['role-a'];

  const roleQuestion = generateLearningExercise(source, [source], cast, 3).questions
    .find(({ kind }) => kind === 'role-selection');

  assert.deepEqual(roleQuestion?.referenceIds, ['role-a']);
});

test('an exercise becomes unavailable when its exact classified source is hidden', () => {
  const restricted = script('restricted', 'restricted', 'nl', ['Restricted']);
  const publicCounterpart = {
    ...script('public', 'public', 'nl', ['Public']),
    scriptFamilyId: restricted.scriptFamilyId,
  };
  const exercise = generateLearningExercise(restricted, [restricted], cast, 9);

  assert.deepEqual({
    restricted: isLearningExerciseAvailable(exercise, [restricted]),
    public: isLearningExerciseAvailable(exercise, [publicCounterpart]),
  }, {
    restricted: true,
    public: false,
  });
});
