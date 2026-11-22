/** Ouvre le tiroir et son bloc historique avant les gestes des parcours existants. */
// U6 : le bloc Circonstances est cherché dans toute la page (refonte E4b : panneau « autres… » de la résolution).
const wholePage = scope => typeof scope.page === 'function' ? scope.page() : scope;
export async function openU1Settings(scope) {
  scope = wholePage(scope);
  const drawer = scope.locator('.workspace-resolution-drawer');
  if (await drawer.isHidden()) await scope.locator('[data-circumstances-toggle]').click();
  // Refonte E4b : le panneau « autres… » replie les réglages détaillés sous ses cases pertinentes.
  const more = scope.locator('.workspace-circumstances-more');
  if (await more.count() && await more.isVisible() && !await more.evaluate(element => element.open)) await more.locator(':scope > summary').click();
  const details = scope.locator('.workspace-resolution-settings');
  if (await details.isVisible() && !await details.evaluate(element => element.open)) {
    await details.locator(':scope > summary').click();
  }
}

/** Revient au panneau principal, notamment derrière le voile sur téléphone. */
export async function closeU1Drawer(scope) {
  scope = wholePage(scope);
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

/**
 * Refonte E4b : prière et corruption s'ouvrent dans la case centrale (menu « Sort, prière, Corruption… » de la résolution),
 * à la place des mêlées et de la résolution. Renvoie l'hôte `[data-center-panel]` ouvert.
 */
export async function openCenterPanel(scope, name) {
  scope = wholePage(scope);
  const host = scope.locator(`[data-center-panel="${name}"]`);
  if (await host.count()) return host;
  // Un autre panneau central masque la résolution : le refermer d'abord.
  const other = scope.locator('[data-center-panel] [data-focus-key="center-panel-close"]');
  if (await other.count()) await other.first().click();
  const toggle = scope.locator('[data-magic-menu]');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await scope.locator('#workspace-magic-menu').getByRole('button', { name: name === 'prayer' ? 'Prière' : 'Corruption', exact: true }).click();
  await host.waitFor();
  return host;
}
/** Referme le panneau central (prière, corruption) et rend la résolution. */
export async function closeCenterPanel(scope) {
  scope = wholePage(scope);
  const close = scope.locator('[data-center-panel] [data-focus-key="center-panel-close"]');
  if (await close.count()) await close.first().click();
}
