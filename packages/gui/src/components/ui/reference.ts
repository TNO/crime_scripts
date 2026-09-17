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
        m('a', { href: url, target: '_blank' }, label),
        m('span', `, by ${authors}`),
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
      return m(
        'ol',
        references.map((reference) => m(ReferenceComponent, { reference }))
      );
    },
  };
};
