import m, { type FactoryComponent } from 'mithril';
import { FlatButton, TextArea } from 'mithril-materialized';
import type { PluginType } from 'mithril-ui-form';

export const SimpleListEditorPlugin: PluginType<string[], any> = () => {
  return {
    view: ({ attrs: { field, obj, onchange } }) => {
      const { id = '', label } = field;
      const items = obj[id];
      // console.log(field);
      return [m('.input-field.col.s12', [m('label', label)], m(SimpleListEditor, { items, onchange }))];
    },
  };
};

interface SimpleListEditorAttrs {
  items: string[];
  onchange?: (strings: string[]) => Promise<void>;
  disabled?: boolean;
  readonly?: boolean;
}

export const SimpleListEditor: FactoryComponent<SimpleListEditorAttrs> = () => {
  const editingItems = new Set<number>();
  let newItem = '';

  const handleDragStart = (event: DragEvent, index: number) => {
    event.dataTransfer?.setData('text/plain', index.toString());
  };

  const handleDrop = (event: DragEvent, index: number, items: string[], onchange: (items: string[]) => void) => {
    const draggedIndex = parseInt(event.dataTransfer?.getData('text') || '0', 10);
    const newItems = [...items];
    const [movedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, movedItem);
    onchange(newItems);
    event.preventDefault();
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
  };

  return {
    view: ({ attrs: { items, onchange = () => {}, disabled, readonly } }) => {
      if (!Array.isArray(items)) {
        items = [items];
      }
      return m(
        '.simple-list-editor',
        m(
          'ul',
          items.map((str, index) => {
            const isEditing = !readonly && !disabled && editingItems.has(index);

            const startEditing = () => {
              editingItems.clear();
              editingItems.add(index);
            };

            const stopEditing = () => {
              editingItems.delete(index);
              // const target = e.target as HTMLTextAreaElement;
              // const newStrings = items.slice();
              // newStrings[index] = target.value;
              // onchange(newStrings);
            };

            return m(
              'li',
              {
                key: index,
                draggable: true,
                ondragstart: (event: DragEvent) => handleDragStart(event, index),
                ondragover: handleDragOver,
                ondrop: (event: DragEvent) => handleDrop(event, index, items, onchange),
              },
              isEditing
                ? m(TextArea, {
                    disabled,
                    readonly,
                    defaultValue: str,
                    className: 'flex-input',
                    onchange: (v) => {
                      items[index] = v;
                      stopEditing();
                      onchange(items);
                    },
                    onblur: () => {
                      stopEditing();
                    },
                    onkeypress: (e: KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
                        stopEditing();
                      }
                    },
                  })
                : // ? m('textarea.materialize-textarea.flex-input', {
                  //     disabled,
                  //     readonly,
                  //     value: str,
                  //     // oninput: (e: Event) => {
                  //     //   const target = e.target as HTMLTextAreaElement;
                  //     //   console.log(target.value);
                  //     //   items[index] = target.value;
                  //     // },
                  //     onblur: stopEditing,
                  //     onkeypress: (e: KeyboardEvent) => {
                  //       if (e.key === 'Enter' || e.key === 'Escape') {
                  //         stopEditing(e);
                  //       }
                  //     },
                  //   })
                  m(
                    'p.flex-input',
                    {
                      onclick: startEditing,
                    },
                    str
                  ),
              m(FlatButton, {
                disabled,
                iconName: 'clear',
                onclick: () => {
                  const newStrings = items.filter((_, i) => i !== index);
                  onchange(newStrings);
                },
              })
            );
          })
        ),

        !readonly &&
          m(
            '.flex-container',
            m('textarea.materialize-textarea.flex-input', {
              disabled,
              value: newItem,
              oninput: (e: Event) => {
                const target = e.target as HTMLInputElement;
                newItem = target.value;
              },
            }),
            m(
              FlatButton,
              {
                disabled,
                iconName: 'add',
                onclick: () => {
                  if (newItem.trim() !== '') {
                    onchange([...items, newItem]);
                    newItem = '';
                  }
                },
              },
              'Add String'
            )
          )
      );
    },
  };
};
