import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Lot C du 21/11/2026 : branchements de l'interface de la rencontre (vérifiés aussi dans le navigateur, sur localhost).
const view = readFileSync(new URL('../../../js/ui/workspace-view.js', import.meta.url), 'utf8');
const dialog = readFileSync(new URL('../../../js/ui/encounter-end-dialog.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../../../js/main.js', import.meta.url), 'utf8');

test('Élan visible sur la piste, sans clic : pastille posée quand le participant a l’Élan', () => {
  assert.match(view, /if \(hasMomentum\(participant\)\) \{ const momentum = node\('span', 'workspace-track-momentum', 'Élan'\)/);
});

test('retrait en cours de rencontre : bouton du panneau, confirmation de l’outil, jamais de boîte native', () => {
  assert.match(view, /callbacks\.removeParticipant\(participant\.id, \{ confirm: true \}\)/);
  assert.match(main, /confirm \? confirmParticipantRemoval\(Store, id\) : removeParticipantWithChoice\(Store, id\)/);
  assert.match(dialog, /export async function confirmParticipantRemoval/);
  assert.match(dialog, /Retirer aussi sa monture/);
  assert.doesNotMatch(dialog, /window\.confirm|\bconfirm\(['"`]|\balert\(/);
});

test('sans monture : case de l’onglet Profils transmise à l’ajout, bascule du panneau branchée sur setMountAbsent', () => {
  assert.match(view, /addProfileToCombat\?\.\(target\.dataset\.profileId, \{ withoutMount: withoutMountChoices\.has/);
  assert.match(view, /addProfileToActiveCombat\?\.\(target\.dataset\.profileId, \{ withoutMount: withoutMountChoices\.has/);
  assert.match(view, /Store\.setMountAbsent\(participant\.id, !absent\)/);
  assert.match(main, /Store\.addProfilesToCombat\(\[id\], \{ withoutMount \}\)/);
});

// Refonte E3 (21/11/2026) : structure du DOM seulement. Le retrait et « sans monture » passent par le menu ⋯ de la fiche compacte ;
// le reste de la fiche est dans le panneau « Fiche complète » (parcours : tests/refonte-ecran-browser.mjs).
test('menu ⋯ de la fiche : retrait, sans monture, renommer, camp, fiche complète, sorts et prières', () => {
  for (const label of ['Retirer du combat…', 'Sans monture pour cette rencontre', 'Renommer', 'Changer de camp', 'Fiche complète', 'Sorts et prières']) {
    assert.ok(view.includes(`'${label}'`), `entrée du menu : ${label}`);
  }
  assert.match(view, /workspace-sheet-menu-item/);
  assert.match(view, /role: 'menuitem'/);
  assert.match(view, /dataset\.sheetMenuButton/);
});

test('fiche complète : panneau superposé accessible, qui reprend ce que la fiche compacte ne montre plus', () => {
  assert.match(view, /panel\.setAttribute\('role', 'dialog'\)/);
  assert.match(view, /panel\.setAttribute\('aria-modal', 'true'\)/);
  for (const key of ['body', 'states', 'reminders', 'traits', 'equipment', 'criticals', 'magic', 'fiche']) assert.ok(view.includes(`section('${key}'`), `section ${key}`);
  assert.match(view, /renderFicheDetails\(participant, \{ embedded: true \}\)/);
  // La fiche compacte n'embarque plus la consultation ni les blocs de créature.
  const compact = view.slice(view.indexOf('function renderSheet('), view.indexOf('function calculationError('));
  assert.doesNotMatch(compact, /renderFicheDetails\(/);
  assert.doesNotMatch(compact, /createMagicListPicker\(/);
});
