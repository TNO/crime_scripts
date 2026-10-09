import assert from 'node:assert/strict';
import test from 'node:test';
import type { CrimeScript } from '../src/models/data-model.ts';
import { readableLiteratureUsage } from '../src/utils/literature-usage.ts';

const script: CrimeScript = {
  id: 'draft', scriptFamilyId: 'draft', label: 'Afvalstromen', description: '',
  classification: 'restricted', owner: '', updated: 0, reviewer: [], status: 1,
  literature: [], productIds: [], language: 'nl', aiGenerated: true,
  stages: [{
    id: 'draft:scene:import', label: 'Import', variants: [{
      id: 'draft:variant:route', label: 'Via overslag',
      activities: [
        { id: 'draft:activity:a-imp-01', label: 'Controle van zending' },
        { id: 'draft:activity:a-imp-02', label: 'Transport naar overslag' },
      ],
      indicators: [{ id: 'draft:indicator:i-imp-01', label: 'Afwijkende vrachtbrief' }],
      measures: [{ id: 'draft:measure:m-imp-01', label: 'Controle bij overslag', cat: '', partners: [] }],
      conditions: [], opportunities: [],
    }],
  }],
};

const translate = (key: string): string => ({
  ACTIVITIES: 'Activiteiten', ACTIVITY: 'Activiteit',
  INDICATOR: 'Indicator', INDICATORS: 'Indicatoren',
  MEASURE: 'Barrière', MEASURES: 'Barrières',
} as Record<string, string>)[key] || key;

test('summarizes generator source usage by scene instead of exposing node keys', () => {
  assert.equal(
    readableLiteratureUsage('import, a-imp-01, a-imp-02, i-imp-01, m-imp-01', script, translate),
    'Import — 2 activiteiten, 1 indicator, 1 barrière'
  );
});

test('keeps unknown keys alongside resolved scenes and uses current labels', () => {
  const updated = structuredClone(script);
  updated.stages[0].label = 'Nieuwe import';
  assert.equal(
    readableLiteratureUsage('import, a-imp-01, missing-key', updated, translate),
    'Nieuwe import — 1 activiteit; missing-key'
  );
});

test('leaves human-written source usage and unknown-only key lists unchanged', () => {
  assert.equal(readableLiteratureUsage('Overzicht van de werkwijze', script, translate), 'Overzicht van de werkwijze');
  assert.equal(readableLiteratureUsage('unknown-key, another-key', script, translate), 'unknown-key, another-key');
  assert.equal(readableLiteratureUsage('Inleiding, onderzoek', script, translate), 'Inleiding, onderzoek');
});

test('groups usage per scene even when scene labels repeat', () => {
  const updated = structuredClone(script);
  const secondScene = structuredClone(updated.stages[0]);
  secondScene.id = 'draft:scene:export';
  secondScene.variants[0].id = 'draft:variant:outbound';
  secondScene.variants[0].activities = [
    { id: 'draft:activity:a-exp-01', label: 'Exportdocument controleren' },
  ];
  secondScene.variants[0].indicators = [];
  secondScene.variants[0].measures = [];
  updated.stages.push(secondScene);
  assert.equal(
    readableLiteratureUsage('import, a-imp-01, export, a-exp-01', updated, translate),
    'Import — 1 activiteit; Import — 1 activiteit'
  );
});

test('keeps a long source usage list compact without losing unmatched keys', () => {
  const updated = structuredClone(script);
  updated.stages[0].variants[0].activities = Array.from({ length: 80 }, (_, index) => ({
    id: `draft:activity:a-imp-${index}`,
    label: `Controle ${index}`,
  }));
  const keys = updated.stages[0].variants[0].activities.map((activity) => activity.id.split(':').at(-1));
  assert.equal(
    readableLiteratureUsage(['import', ...keys, 'not-yet-imported'].join(', '), updated, translate),
    'Import — 80 activiteiten; not-yet-imported'
  );
});

test('does not attribute a colliding normalized key to another node', () => {
  assert.equal(
    readableLiteratureUsage('import, a_imp_01', script, translate),
    'Import; a_imp_01'
  );
});

test('retains punctuated and legacy node keys while resolving exact keys', () => {
  assert.equal(
    readableLiteratureUsage('import, updated.activity, activity-existing', script, translate),
    'Import; updated.activity; activity-existing'
  );
});
