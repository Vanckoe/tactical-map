export function isWorkspaceShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return false;
  if (!(event.target instanceof HTMLElement)) return false;
  return !event.target.isContentEditable && !event.target.closest(
    'input, textarea, select, [contenteditable], [role="textbox"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"], [role="slider"], [role="spinbutton"]',
  );
}
