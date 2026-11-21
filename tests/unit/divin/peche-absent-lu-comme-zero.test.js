// Bug du 20/11/2026 : en combat, le miracle d'un PJ était refusé (« Le score de Péché doit être enregistré dans la fiche »)
// alors que le MJ n'avait rien à renseigner. Sur une fiche Firestore, `peche` est une chaîne de chiffres facultative :
// absent tant que le joueur n'y a rien saisi (migrerFicheV5 ne l'invente pas). Une absence se lit comme 0 au point de lecture.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, applyFicheSync } from '../../../js/core/fiche-sync.js';
import { resolveDivineTalentRestriction } from '../../../js/core/v5-divine-access.js';
import { BATTLE, person, input, fixture, snap } from '../../helpers/divin-b5-fixture.mjs';

const fiche = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const sinOf = raw => {
  const snapshot = ficheSnapshot('caelel', raw);
  const profile = { id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, caracs: { F: 30 }, diceLines: [] };
  return applyFicheSync({ reserve: [profile] }, [{ charId: 'caelel', profileId: 'pj', snapshot }]).reserve[0].extensions?.v5?.divine?.sin;
};

test('Fiche au format réel : `peche` en chaîne est lue ("0" et "2"), la chaîne vide vaut 0', () => {
  assert.equal(sinOf({ ...fiche, peche: '2' }), 2);
  assert.equal(sinOf({ ...fiche, peche: '0' }), 0);
  assert.equal(sinOf({ ...fiche, peche: '' }), 0);
});

test('Prière d’un PJ en combat dont la fiche n’a pas de `peche` : aperçu prêt, Péché lu comme 0, pas de Courroux', async () => {
  assert.equal('peche' in fiche, false, 'la fiche de référence n’a pas de champ peche');
  const { store } = await fixture(1);
  const saved = snap(store); delete saved.combat.participants[0].extensions.v5.divine.sin; await store.loadFromJSON(saved);
  const result = store.previewDivineExecution(BATTLE, input(50));
  assert.equal(result.ready, true, result.error);
  assert.equal(result.preview.wrath.sinAtTest, 0);
  assert.equal(result.preview.wrath.triggered, false);
});

test('Cultes à seuil de Péché (Stromfels) : l’absence vaut 0 et ne bloque pas', () => {
  const priest = person('priest', 0); delete priest.extensions.v5.divine.sin;
  const access = resolveDivineTalentRestriction(priest, { cult: 'Stromfels', talentId: 'talent-bless' });
  assert.equal(access.allowed, true, access.reason);
});
