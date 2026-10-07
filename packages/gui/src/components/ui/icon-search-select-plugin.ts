import m from 'mithril';
import { type InputOption, SearchSelect } from 'mithril-materialized';
import type { PluginType } from 'mithril-ui-form';
import { MAX_COMPOSED_ICONS, type IconValue } from '../../models';
import { t } from '../../services';

export const iconSearchSelectPlugin: PluginType<IconValue[]> = () => {
  return {
    view: ({ attrs: { iv, onchange, label, field: { className, options } } }) => {
      const selected = Array.isArray(iv) ? iv : [];

      return m('.icon-search-picker', { className }, [
        m(SearchSelect<IconValue>, {
          className: '',
          label,
          searchPlaceholder: t('SEARCH_ICONS'),
          checkedId: selected,
          maxSelectedOptions: MAX_COMPOSED_ICONS,
          sortSelected: 'none',
          i18n: {
            noOptionsFound: t('NO_ICONS_FOUND'),
            maxSelectionsReached: t('MAX_ICONS_SELECTED'),
          },
          options: (options as InputOption<IconValue>[]).map((option) => ({
            ...option,
            label: t('ICON_LABELS', option.label),
          })),
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
