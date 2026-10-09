import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { GeneratorError } from '../src/errors.ts';
import { buildWorkspace, findRestrictedResearchLeak, getWorkspaceStatus } from '../src/operations.ts';
import { initializeWorkspace, prepareWorkspace, workspaceFiles } from '../src/workspace.ts';
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
  assert.deepEqual(findRestrictedResearchLeak([material], brief, log('Jan Jansen')), {
    entryIndex: 0,
    phrase: 'jan jansen',
    field: 'query',
  });
  assert.deepEqual(findRestrictedResearchLeak([material], brief, log('CASE-7842')), {
    entryIndex: 0,
    phrase: 'case 7842',
    field: 'query',
  });
  assert.deepEqual(
    findRestrictedResearchLeak(
      [material],
      brief,
      log(undefined, 'https://example.test/search?q=unieke%20blauwe%20envelop')
    ),
    { entryIndex: 0, phrase: 'unieke blauwe envelop', field: 'url' }
  );
  assert.deepEqual(findRestrictedResearchLeak(['Li Wei heeft dossier X7.'], brief, log('Li Wei')), {
    entryIndex: 0, phrase: 'li wei', field: 'query',
  });
  assert.deepEqual(findRestrictedResearchLeak(['Li Wei heeft dossier X7.'], brief, log('X7')), {
    entryIndex: 0, phrase: 'x7', field: 'query',
  });
  assert.deepEqual(
    findRestrictedResearchLeak(['Geen aanvullende details.'], brief, log('x7q9'), ['x7q9.pdf']),
    { entryIndex: 0, phrase: 'x7q9', field: 'query' }
  );
  assert.deepEqual(
    findRestrictedResearchLeak(
      ['Geen aanvullende details.'], brief, log(undefined, 'https://example.test/?q=private-file-name'),
      ['private-file-name.pdf']
    ),
    { entryIndex: 0, phrase: 'private file name', field: 'url' }
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

test('status and build name the copied phrase and research field', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crime-script-privacy-'));
  const workspace = join(root, 'draft');
  const bundlePath = join(root, 'bundle.json');
  const materialPath = join(root, 'restricted.md');
  await writeFile(bundlePath, JSON.stringify({
    schemaVersion: 3, version: 1, lastUpdate: 1,
    crimeScripts: [], cast: [], attributes: [], locations: [],
    geoLocations: [], products: [], transports: [], partners: [],
  }));
  const longPhrase = ['abcdefghij'.repeat(4), 'klmnopqrst'.repeat(4), 'uvwxyzabcd'.repeat(4)].join(' ');
  await writeFile(materialPath, `This document describes waste crime risks for oversight. ${longPhrase}`);
  await initializeWorkspace(workspace, {
    ...brief,
    bundlePath,
    materialDirectory: materialPath,
  });
  await prepareWorkspace(workspace);
  await writeFile(join(workspace, workspaceFiles.candidate), JSON.stringify({
    schemaVersion: 1,
    script: { label: 'Review', description: 'Review', stages: [] },
    taxonomies: {
      cast: [], attributes: [], products: [], transports: [],
      locations: [], geoLocations: [], partners: [],
    },
    safetyReview: {
      containsStepByStepInstructions: false,
      containsExploitableParameters: false,
      containsEvasionTactics: false,
      notes: 'Review pending.',
    },
  }));
  await writeFile(join(workspace, workspaceFiles.researchLog), JSON.stringify(
    log('waste crime risks')
  ));

  const status = await getWorkspaceStatus(workspace);
  assert.equal(status.issues[0]?.code, 'restricted-query-leak');
  assert.equal(status.issues[0]?.path, '$.entries[0]');
  assert.match(status.issues[0]?.message || '', /matched phrase: "waste crime risks" in query/);
  await assert.rejects(
    buildWorkspace(workspace, { output: join(root, 'output.json') }),
    (error: unknown) => {
      assert.ok(error instanceof GeneratorError);
      assert.equal(error.code, 'restricted-query-leak');
      assert.match(error.message, /matched phrase: "waste crime risks" in query/);
      return true;
    }
  );
  await writeFile(join(workspace, workspaceFiles.researchLog), JSON.stringify(log(longPhrase)));
  const truncatedMessage = (await getWorkspaceStatus(workspace)).issues[0]?.message || '';
  const displayedPhrase = truncatedMessage.match(/matched phrase: "([^"]+)"/)?.[1];
  assert.ok(displayedPhrase);
  assert.ok(displayedPhrase.length <= 83);
  assert.ok(!truncatedMessage.includes(longPhrase));
});
