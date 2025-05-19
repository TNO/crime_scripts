import m from 'mithril';
import { PluginType } from 'mithril-ui-form';
import { SearchSelect, Option } from 'mithril-materialized';

export type OnCreateNewOption = <T extends string | number>(term: string) => Option<T> | Promise<Option<T>>;

export const searchSelectPlugin: PluginType<
  string[],
  // Option<string>[],
  { oncreateNewOption?: OnCreateNewOption }
> = () => {
  let options: Option<string>[] = [];
  let className: string | undefined;

  return {
    oninit: ({ attrs: { field } }) => {
      const { options: o, className: c } = field;
      className = c;
      if (o && typeof o !== 'string') {
        options = o;
      }
    },
    view: ({
      attrs: {
        iv,
        onchange,
        label,
        field: { oncreateNewOption },
      },
    }) => {
      return m(
        '.multi-select',
        { className },
        m(SearchSelect<string>, {
          label,
          initialValue: iv,
          options,
          onchange,
          oncreateNewOption,
        })
      );
    },
  };
};
