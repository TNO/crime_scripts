import assert from 'node:assert/strict';
import test from 'node:test';
import { findRestrictedResearchLeak } from '../src/operations.ts';
import type { GeneratorBrief, ResearchLogFile } from '../src/types.ts';

const brief: GeneratorBrief = {
  schemaVersion: 1,
  bundlePath: 'bundle.json',
  scriptId: 'privacy:test',
  subject: 'Financial crime',
  purpose: 'Defensive analysis',
  geography: 'Netherlands',
  contentLanguage: 'en',
  classification: 'restricted',
  sourceSensitivity: 'restricted',
  detail: 'practical',
  scriptIcon: 'builtin:document-check',
};

const log = (query?: string, url?: string): ResearchLogFile => ({
  schemaVersion: 1,
  entries: [{
    query,
    url,
    visitedAt: '2026-01-01T00:00:00Z',
    decision: 'rejected',
    reason: 'Privacy regression fixture.',
  }],
  contradictionSearchCompleted: false,
  missingPerspectiveSearchCompleted: false,
});

test('restricted research blocks names, case IDs, encoded details, and short copied phrases', () => {
  const material =
    'Jan Jansen is gekoppeld aan dossier CASE-7842. De overdracht gebruikt een unieke blauwe envelop.';
  assert.equal(findRestrictedResearchLeak([material], brief, log('Jan Jansen')), 0);
  assert.equal(findRestrictedResearchLeak([material], brief, log('CASE-7842')), 0);
  assert.equal(
    findRestrictedResearchLeak(
      [material],
      brief,
      log(undefined, 'https://example.test/search?q=unieke%20blauwe%20envelop')
    ),
    0
  );
  assert.equal(findRestrictedResearchLeak(['Li Wei heeft dossier X7.'], brief, log('Li Wei')), 0);
  assert.equal(findRestrictedResearchLeak(['Li Wei heeft dossier X7.'], brief, log('X7')), 0);
  assert.equal(
    findRestrictedResearchLeak(['Geen aanvullende details.'], brief, log('x7q9'), ['x7q9.pdf']),
    0
  );
  assert.equal(
    findRestrictedResearchLeak(
      ['PGB-2023 komt voor in algemeen materiaal.'],
      { ...brief, subject: 'PGB-2023 subsidiefraude' },
      log('PGB-2023 subsidiefraude')
    ),
    undefined
  );
  assert.equal(
    findRestrictedResearchLeak(
      ['Artikel 3a beschrijft de algemene grondslag.'],
      brief,
      log(undefined, 'https://example.test/?u=https%3A%2F%2Fnews.test')
    ),
    undefined
  );
  assert.equal(
    findRestrictedResearchLeak(
      ['Artikel 3a beschrijft de algemene grondslag.'],
      brief,
      log('btw 21% fraude', 'https://example.test/?u=https%3A%2F%2Fnews.test')
    ),
    undefined
  );
  assert.equal(findRestrictedResearchLeak([material], brief, log('algemene financiële criminaliteit')), undefined);
});
