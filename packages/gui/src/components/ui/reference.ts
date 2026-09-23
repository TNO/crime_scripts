import m, { type FactoryComponent } from 'mithril';
import type { Literature } from '../../models';
import { t } from '../../services';

const ReferenceComponent: FactoryComponent<{ reference: Literature }> = () => {
  let showSummary = false;

  return {
    view: ({
      attrs: {
        reference: { url, label, authors, description, usedFor },
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
        usedFor && m('p.used-for', `${t('USED_FOR')}: ${usedFor}`),
      ]);
    },
  };
};

export type ReferenceAttrs = {
  references: Literature[];
};

export const ReferenceListComponent: FactoryComponent<ReferenceAttrs> = () => {
  return {
    view: ({ attrs: { references } }) => {
      const visibleReferences = references.filter(({ label }) => Boolean(label?.trim()));
      return m(
        'ol.reference-list',
        visibleReferences.map((reference) => m(ReferenceComponent, { reference }))
      );
    },
  };
};
