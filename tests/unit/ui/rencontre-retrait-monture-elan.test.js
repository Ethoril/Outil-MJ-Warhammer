import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Lot C du 21/11/2026 : branchements de l'interface de la rencontre (vérifiés aussi dans le navigateur, sur localhost).
const view = readFileSync(new URL('../../../js/ui/workspace-view.js', import.meta.url), 'utf8');
const dialog = readFileSync(new URL('../../../js/ui/encounter-end-dialog.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../../../js/main.js', import.meta.url), 'utf8');

test('Élan visible sur la piste, sans clic : pastille posée quand le participant a l’Élan', () => {
  // Lot E4a : l'Élan du cartouche des mêlées est un glyphe « É » (texte « A l’Élan » pour les lecteurs d'écran), plus une pastille.
  assert.match(view, /if \(hasMomentum\(participant\)\) glyph\('É', 'A l’Élan', 'is-momentum'\)/);
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
