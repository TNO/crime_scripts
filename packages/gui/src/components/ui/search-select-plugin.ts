import m from 'mithril';
import { PluginType } from 'mithril-ui-form';
import { InputOption, SearchSelect } from 'mithril-materialized';

export type OnCreateNewOption = <T extends string | number>(term: string) => InputOption<T> | Promise<InputOption<T>>;

export const searchSelectPlugin: PluginType<
  string[],
  // Option<string>[],
  { oncreateNewOption?: OnCreateNewOption }
> = () => {
  let key = Date.now();
  let options: InputOption<string>[] = [];
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
        options = o as InputOption<string>[];
        key = Math.round(Date.now() / 1000);
        // console.log('options changed: ' + key);
      }
      return m('.multi-select', { className, key }, [
        m(SearchSelect<string>, {
          label,
          checkedId: iv,
          options,
          onchange,
          oncreateNewOption,
        }),
      ]);
    },
  };
};
