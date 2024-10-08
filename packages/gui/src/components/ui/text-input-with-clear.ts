import m, { FactoryComponent } from 'mithril';
import { uniqueId } from 'mithril-materialized';
import { debounce } from '../../utils';

export const TextInputWithClear: FactoryComponent<{
  label: string;
  id?: string;
  initialValue?: string;
  placeholder?: string;
  className?: string;
  iconName?: string;
  style?: string;
  onchange?: (v?: string) => void;
  oninput?: (v?: string) => void;
}> = () => {
  let inputId: string;
  let input: HTMLInputElement;
  let clearButton: HTMLButtonElement;
  let labelElement: HTMLLabelElement;
  let debouncedOnInput: Function | undefined;

  return {
    oninit: ({ attrs: { oninput, id } }) => {
      inputId = id || uniqueId();
      debouncedOnInput = oninput && debounce(oninput, 500);
    },
    view: ({
      attrs: { label, initialValue, placeholder, iconName, className = 'col s12', style, onchange, oninput },
    }) => {
      return m('.text-input-with-clear.input-field', { className, style }, [
        iconName && m('.material-icons prefix', iconName),
        m('input', {
          id: inputId,
          type: 'text',
          placeholder,
          oncreate: ({ dom }) => {
            input = dom as HTMLInputElement;
            if (initialValue) {
              input.value = initialValue;
            }
          },
          oninput: () => {
            clearButton.style.opacity = typeof input.value !== 'undefined' ? '1' : '0';
            input.value ? labelElement.classList.add('active') : labelElement.classList.remove('active');
            debouncedOnInput && debouncedOnInput(input.value);
          },
          onchange: () => {
            onchange && onchange(input.value);
          },
        }),
        m(
          'label',
          {
            for: inputId,
            className: initialValue || placeholder ? 'active' : undefined,
            oncreate: ({ dom }) => (labelElement = dom as HTMLLabelElement),
          },
          label
        ),
        m(
          'a.waves-effect.waves-light.btn-flat',
          {
            style: 'opacity: 0; float: right; position: relative; top: -45px; transition: opacity 0.2s linear;',
            onclick: () => {
              input.value = '';
              !placeholder && labelElement.classList.remove('active');
              clearButton.style.opacity = '0';
              onchange && onchange('');
              oninput && oninput('');
            },
            oncreate: ({ dom }) => {
              clearButton = dom as HTMLButtonElement;
              if (initialValue) {
                clearButton.style.opacity = '1';
              }
            },
          },
          m('i.material-icons', 'clear')
        ),
      ]);
    },
  };
};
