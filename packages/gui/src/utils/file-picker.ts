export const openFilePicker = (
  accept: string,
  onchange: (event: Event) => void,
  ownerDocument: Document = document
) => {
  const input = ownerDocument.createElement('input');
  const removeInput = () => input.remove();

  input.type = 'file';
  input.accept = accept;
  input.hidden = true;
  input.onchange = (event) => {
    onchange(event);
    removeInput();
  };
  input.oncancel = removeInput;
  ownerDocument.body.appendChild(input);
  input.click();
};
