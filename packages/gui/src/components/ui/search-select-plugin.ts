import m from 'mithril';
import { PluginType } from 'mithril-ui-form';
import { SearchSelect, Option } from 'mithril-materialized';

export type OnCreateNewOption = <T extends string | number>(term: string) => Option<T> | Promise<Option<T>>;

export const searchSelectPlugin: PluginType<
  string[],
  // Option<string>[],
  { oncreateNewOption?: OnCreateNewOption }
> = () => {
  let key = Date.now();
  let options: Option<string>[] = [];
  let className: string | undefined;

  return {
    oninit: ({ attrs: { field } }) => {
      const { className: c } = field;
      className = c;
    },
    view: ({
      attrs: {
        iv,
        onchange,
        label,
        field: { oncreateNewOption, options: o },
      },
    }) => {
      if (o && typeof o !== 'string' && o !== options) {
        options = o;
        key = Math.round(Date.now() / 1000);
        // console.log('options changed: ' + key);
      }
      return m('.multi-select', { className, key }, [
        m(SearchSelect<string>, {
          label,
          initialValue: iv,
          options,
          onchange,
          oncreateNewOption,
        }),
      ]);
    },
  };
};
