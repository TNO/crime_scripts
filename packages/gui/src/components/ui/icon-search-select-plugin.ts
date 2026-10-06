import m from 'mithril';
import { type InputOption, Select, TextInput } from 'mithril-materialized';
import type { PluginType } from 'mithril-ui-form';
import type { IconValue } from '../../models';
import { t } from '../../services';

export const iconSearchSelectPlugin: PluginType<IconValue[]> = () => {
  let query = '';
  const IconSelect = Select<IconValue>();

  return {
    view: ({ attrs: { iv, onchange, label, field: { className, options } } }) => {
      const term = query.trim().toLocaleLowerCase();
      const available = options as InputOption<IconValue>[];
      const selected = Array.isArray(iv) ? iv : [];
      const filtered = available.filter((option) =>
        selected.includes(option.id) ||
        !term ||
        `${option.label} ${option.group || ''}`.toLocaleLowerCase().includes(term)
      );

      return m('.icon-search-picker', { className }, [
        m(TextInput, {
          label: t('SEARCH_ICONS'),
          value: query,
          canClear: true,
          oninput: (value) => { query = value; },
        }),
        m(IconSelect, {
          label,
          checkedId: selected,
          multiple: true,
          options: filtered,
          onchange: onchange && ((values: IconValue[]) => {
            onchange(values);
            m.redraw();
          }),
        }),
        m('a', { href: new URL('icons/NOTICE.md', document.baseURI).href, target: '_blank', rel: 'noopener noreferrer' }, t('ICON_CREDITS')),
      ]);
    },
  };
};
