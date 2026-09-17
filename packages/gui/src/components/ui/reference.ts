import m, { type FactoryComponent } from 'mithril';
import type { Literature } from '../../models';

const ReferenceComponent: FactoryComponent<{ reference: Literature }> = () => {
  let showSummary = false;

  return {
    view: ({
      attrs: {
        reference: { url, label, authors, description },
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
