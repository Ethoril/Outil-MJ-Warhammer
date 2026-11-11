export async function chooseConfirmation(group, value) {
  const choice = group.getByRole('button', { name: value === 'true' ? 'Oui' : 'Non', exact: true });
  if (await choice.getAttribute('aria-pressed') !== 'true') await choice.click();
}
export async function chooseBoolean(field, value) {
  const visible = field.filter({ visible: true });
  if (await visible.getAttribute('role') === 'group') {
    if (value === '') {
      const selected = visible.getByRole('button', { pressed: true });
      if (await selected.count()) await selected.click();
      return;
    }
    return chooseConfirmation(visible, value);
  }
  return visible.selectOption(value);
}
export async function confirmationValue(field) {
  const visible = field.filter({ visible: true });
  if (await visible.getAttribute('role') !== 'group') return visible.inputValue();
  if (await visible.getByRole('button', { name: 'Oui', exact: true }).getAttribute('aria-pressed') === 'true') return 'true';
  if (await visible.getByRole('button', { name: 'Non', exact: true }).getAttribute('aria-pressed') === 'true') return 'false';
  return '';
}
