/** Ouvre le tiroir et son bloc historique avant les gestes des parcours existants. */
export async function openU1Settings(scope) {
  const drawer = scope.locator('.workspace-resolution-drawer');
  if (await drawer.isHidden()) await scope.locator('[data-circumstances-toggle]').click();
  const details = scope.locator('.workspace-resolution-settings');
  if (await details.isVisible() && !await details.evaluate(element => element.open)) {
    await details.locator(':scope > summary').click();
  }
}

/** Revient au panneau principal, notamment derrière le voile sur téléphone. */
export async function closeU1Drawer(scope) {
  const drawer = scope.locator('.workspace-resolution-drawer');
  if (await drawer.isVisible()) await drawer.getByRole('button', { name: 'Fermer', exact: true }).click();
}
export async function clickU1Magic(scope, type) {
  const toggle = scope.locator('[data-magic-menu]');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  const labels = { cast: 'Incantation V5', channelling: 'Focalisation V5', dispel: 'Dissipation persistante V5' };
  await scope.locator('#workspace-magic-menu').getByRole('button', { name: labels[type], exact: true }).click();
}

export async function openU1Types(scope) {
  const toggle = scope.locator('[data-test-menu]');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
}
export async function openU1TurnActions(scope) {
  const details = scope.locator('.workspace-combat-actions');
  if (await details.count() && !(await details.evaluate(element => element.open))) await details.locator(':scope > summary').click();
}
