import m, { type FactoryComponent } from 'mithril';
import type { CrimeScript, Literature } from '../../models';
import { t } from '../../services';
import { readableLiteratureUsage } from '../../utils/literature-usage';

const ReferenceComponent: FactoryComponent<{ reference: Literature; script: CrimeScript }> = () => {
  let showSummary = false;

  return {
    view: ({
      attrs: {
        reference: { url, label, authors, description, usedFor },
        script,
      },
    }) => {
      return m('li', [
        url
          ? m('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, label)
          : m('span', label),
        authors && m('span', `, ${t('BY')} ${authors}`),
        description &&
          m(
            'span.ellipsis',
            {
              onclick: () => (showSummary = !showSummary),
              style: { cursor: 'pointer', color: 'blue', textDecoration: 'underline' },
            },
            showSummary ? ' ... (less)' : ' ... (more)'
          ),
        showSummary && m('p.summary', description),
        usedFor && m('p.used-for', `${t('USED_FOR')}: ${readableLiteratureUsage(usedFor, script, t)}`),
      ]);
    },
  };
};

export type ReferenceAttrs = {
  references: Literature[];
  script: CrimeScript;
};

export const ReferenceListComponent: FactoryComponent<ReferenceAttrs> = () => {
  return {
    view: ({ attrs: { references, script } }) => {
      const visibleReferences = references.filter(({ label }) => Boolean(label?.trim()));
      return m(
        'ol.reference-list',
        visibleReferences.map((reference) => m(ReferenceComponent, { reference, script }))
      );
    },
  };
};
