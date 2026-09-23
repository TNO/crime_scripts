import assert from 'node:assert/strict';
import test from 'node:test';
import type { CrimeScript, DataModel } from '../src/models/data-model.ts';
import { buildCrimeScriptReport } from '../src/utils/report-model.ts';

const crimeScript: CrimeScript = {
  id: 'script',
  label: 'Arbeidsuitbuiting',
  description: 'Een compact rapport over het criminele proces.',
  classification: 'restricted',
  scriptFamilyId: 'family',
  owner: '',
  updated: Date.parse('2026-09-20T12:00:00Z'),
  reviewer: [],
  status: 1,
  literature: [
    {
      id: 'source',
      label: 'Bronrapport',
      authors: 'Onderzoeksteam',
      url: 'https://example.test/report',
      description: 'Onderbouwt het proces.',
      usedFor: 'Scène 1',
    },
  ],
  stages: [
    {
      id: 'scene',
      label: 'Werving',
      description: 'Benadering van potentiële slachtoffers.',
      variants: [
        {
          id: 'act',
          label: 'Hoofdroute',
          description: 'De meest voorkomende werkwijze.',
          locationIds: ['location'],
          activities: [
            {
              id: 'step',
              label: 'Selecteer het slachtoffer',
              description: 'Zoek naar afhankelijkheid.',
              cast: ['recruiter'],
              type: 1,
            },
            {
              id: 'substep',
              parentId: 'step',
              label: 'Leg contact',
              description: 'Gebruik een geloofwaardig aanbod.',
            },
          ],
          conditions: [{ id: 'condition', label: 'Beperkte alternatieven', type: 'Facilitator' as const }],
          indicators: [{ id: 'indicator', label: 'Inhouding van documenten', description: 'Documenten blijven bij de werkgever.' }],
          opportunities: [],
          measures: [
            {
              id: 'barrier',
              label: 'Controleer arbeidsbemiddelaars',
              description: 'Controleer inschrijving en feitelijke activiteiten.',
              cat: '1_2',
              partners: ['municipality', 'police', 'police'],
            },
          ],
        },
      ],
    },
  ],
  productIds: ['labour'],
  geoLocationIds: ['nl'],
  language: 'nl',
  aiGenerated: true,
  unreviewed: true,
};

const model: DataModel = {
  schemaVersion: 3,
  version: 5,
  lastUpdate: crimeScript.updated,
  crimeScripts: [crimeScript],
  cast: [{ id: 'recruiter', label: 'Ronselaar' }],
  attributes: [],
  locations: [{ id: 'location', label: 'Online platform' }],
  geoLocations: [{ id: 'nl', label: 'Nederland' }],
  products: [{ id: 'labour', label: 'Arbeid' }],
  transports: [],
  partners: [
    { id: 'municipality', label: 'Gemeente' },
    { id: 'police', label: 'Politie' },
  ],
};

test('report model preserves scene hierarchy and groups each barrier before unique partners', () => {
  const report = buildCrimeScriptReport(
    crimeScript,
    model,
    (categoryId) => categoryId === '1_2'
      ? { id: categoryId, label: 'Toegang controleren', group: 'Vergroot de inspanning' }
      : undefined,
    new Date('2026-09-23T20:00:00Z')
  );

  assert.deepEqual(report.scenes[0], {
    id: 'scene',
    number: 1,
    label: 'Werving',
    description: 'Benadering van potentiële slachtoffers.',
    variants: [
      {
        id: 'act',
        label: 'Hoofdroute',
        description: 'De meest voorkomende werkwijze.',
        locations: ['Online platform'],
        steps: [
          {
            id: 'step',
            number: '1',
            label: 'Selecteer het slachtoffer',
            description: 'Zoek naar afhankelijkheid.',
            cast: ['Ronselaar'],
            attributes: [],
            transports: [],
            children: [
              {
                id: 'substep',
                number: '1.1',
                label: 'Leg contact',
                description: 'Gebruik een geloofwaardig aanbod.',
                cast: [],
                attributes: [],
                transports: [],
                children: [],
              },
            ],
          },
        ],
        conditions: [{ label: 'Beperkte alternatieven', description: undefined, type: 'Facilitator' }],
        indicators: [{ label: 'Inhouding van documenten', description: 'Documenten blijven bij de werkgever.' }],
        barriers: [
          {
            id: 'barrier',
            label: 'Controleer arbeidsbemiddelaars',
            description: 'Controleer inschrijving en feitelijke activiteiten.',
            categoryId: '1_2',
            category: 'Toegang controleren',
            categoryGroup: 'Vergroot de inspanning',
            partners: ['Gemeente', 'Politie'],
          },
        ],
      },
    ],
  });
});

test('report model resolves cover metadata and references deterministically', () => {
  const report = buildCrimeScriptReport(
    crimeScript,
    model,
    () => undefined,
    new Date('2026-09-23T20:00:00Z')
  );

  assert.deepEqual(
    {
      title: report.title,
      classification: report.classification,
      language: report.language,
      products: report.products,
      geographicScope: report.geographicScope,
      generated: report.aiGenerated,
      unreviewed: report.unreviewed,
      exportedAt: report.exportedAt,
      reference: report.references[0],
    },
    {
      title: 'Arbeidsuitbuiting',
      classification: 'restricted',
      language: 'nl',
      products: ['Arbeid'],
      geographicScope: ['Nederland'],
      generated: true,
      unreviewed: true,
      exportedAt: '2026-09-23T20:00:00.000Z',
      reference: {
        label: 'Bronrapport',
        authors: 'Onderzoeksteam',
        url: 'https://example.test/report',
        description: 'Onderbouwt het proces.',
        usedFor: 'Scène 1',
      },
    }
  );
});
