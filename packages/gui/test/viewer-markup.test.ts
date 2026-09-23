import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateLabeledItemsMarkup,
  highlightMarkupText,
  measuresToMarkdown,
  measuresToMarkup,
} from '../src/utils/viewer-markup.ts';

test('viewer item markup renders descriptions inline instead of hiding them in tooltips', () => {
  const markup = generateLabeledItemsMarkup([
    {
      id: 'step',
      label: 'Controleer de rekeningopening',
      description: 'Leg de aanvrager, het tijdstip en de gebruikte documenten vast.',
    },
  ]);

  assert.match(markup, /class="script-detail-list"/);
  assert.match(markup, /<strong[^>]*>Controleer de rekeningopening<\/strong>/);
  assert.match(markup, /class="script-detail-description"/);
  assert.match(markup, /Leg de aanvrager, het tijdstip en de gebruikte documenten vast\./);
  assert.doesNotMatch(markup, /tooltip/);
});

test('viewer item markup renders explicit step and substep relationships', () => {
  const markup = generateLabeledItemsMarkup([
    { id: 'step-a', label: 'Step A' },
    { id: 'step-b', label: 'Step B' },
    { id: 'sub-a', label: 'Substep A', parentId: 'step-a' },
  ]);

  assert.match(
    markup,
    /Step A.*class="script-detail-list nested".*Substep A.*Step B/s
  );
});

test('barrier markup lists every barrier once before its applicable partners', () => {
  const partners = new Map([
    ['municipality', { id: 'municipality', label: 'Gemeente' }],
    ['police', { id: 'police', label: 'Politie' }],
  ]);
  const measures = [
    {
      id: 'barrier',
      label: 'Verscherp de identiteitscontrole',
      description: 'Controleer de identiteit voordat toegang wordt verleend.',
      cat: 'preventive',
      partners: ['police', 'municipality', 'police'],
    },
  ];

  const markup = measuresToMarkup(
    measures,
    partners,
    (id) => id === 'preventive'
      ? { id, label: 'Preventief', group: 'barrier' }
      : undefined,
    {
      category: 'Categorie',
      partners: 'Partners',
      settingsRoute: 'instellingen',
    }
  );

  assert.equal(markup.match(/Verscherp de identiteitscontrole/g)?.length, 1);
  assert.match(markup, /class="barrier-list"/);
  assert.match(markup, /Controleer de identiteit voordat toegang wordt verleend\./);
  assert.ok(markup.indexOf('Verscherp de identiteitscontrole') < markup.indexOf('Gemeente'));
  assert.equal(markup.match(/Gemeente/g)?.length, 1);
  assert.equal(markup.match(/Politie/g)?.length, 1);

  const markdown = measuresToMarkdown(
    measures,
    partners,
    (id) => id === 'preventive'
      ? { id, label: 'Preventief', group: 'barrier' }
      : undefined,
    {
      category: 'Categorie',
      partners: 'Partners',
      settingsRoute: '/instellingen',
    }
  );
  assert.equal(markdown.match(/Verscherp de identiteitscontrole/g)?.length, 1);
  assert.ok(markdown.indexOf('Verscherp de identiteitscontrole') < markdown.indexOf('Gemeente'));
});

test('search highlighting does not corrupt generated element attributes', () => {
  const markup = '<ol class="barrier-list"><li>Barrier tegen misbruik</li></ol>';
  const highlighted = highlightMarkupText(markup, /(barrier)/gi);

  assert.match(highlighted, /class="barrier-list"/);
  assert.match(highlighted, /<mark style="background:yellow;">Barrier<\/mark> tegen misbruik/);
});
