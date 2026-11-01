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
