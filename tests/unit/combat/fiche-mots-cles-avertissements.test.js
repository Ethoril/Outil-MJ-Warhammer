import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, planProfileSync } from '../../../js/core/fiche-sync.js';
import { FICHE_KEYWORD_TYPES } from '../../../js/data/fiche-keyword-types.js';

// Mots-clés déclarés sur la fiche (`motsCles`) : un type ou une cible inconnus de l'outil (fiche plus récente) sont signalés dans
// l'aperçu de synchronisation, comme une monture inconnue ; rien n'est refusé ni réécrit.
const fixture = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const fiche = motsCles => ficheSnapshot('caelel', { ...fixture, ...(motsCles === undefined ? {} : { motsCles }) });
const avertissements = (snapshot, code) => snapshot.warnings.filter(row => row.code === code);
const profil = { id: 'pj', name: 'Caelel', kind: 'PJ', caracs: { CC: 40 }, skills: [], talents: [], equipment: [], diceLines: [], extensions: {} };

test('les types lus sont ceux de la donnée unique de l’outil', () => {
  for (const id of Object.keys(FICHE_KEYWORD_TYPES)) {
    const snapshot = fiche([{ id, cible: 'nain' }]);
    assert.deepEqual(snapshot.keywordTargets, [{ id, target: 'nain' }], id);
    assert.equal(snapshot.warnings.some(row => row.field === 'keywords'), false, id);
  }
});

test('type inconnu : ligne écartée avec avertissement visible dans l’aperçu', () => {
  const snapshot = fiche([{ id: 'colere', cible: 'nain' }, { id: 'haine', cible: 'skaven' }]);
  assert.deepEqual(snapshot.keywordTargets, [{ id: 'haine', target: 'skaven' }]);
  const [warning] = avertissements(snapshot, 'keyword-type-unknown');
  assert.equal(avertissements(snapshot, 'keyword-type-unknown').length, 1);
  assert.equal(warning.field, 'keywords');
  assert.equal(warning.severity, 'warning');
  assert.match(warning.message, /colere/);
  assert.match(warning.message, /fiche plus récente/);
  assert.equal(planProfileSync(snapshot, profil).warnings.some(row => row.code === 'keyword-type-unknown'), true);
});

test('cible inconnue : ligne gardée telle quelle, avec avertissement', () => {
  const snapshot = fiche([{ id: 'animosite', cible: 'cle-du-futur' }, { id: 'haine', cible: 'skaven' }]);
  assert.deepEqual(snapshot.keywordTargets, [{ id: 'animosite', target: 'cle-du-futur' }, { id: 'haine', target: 'skaven' }]);
  const [warning] = avertissements(snapshot, 'keyword-target-unknown');
  assert.equal(avertissements(snapshot, 'keyword-target-unknown').length, 1);
  assert.match(warning.message, /cle-du-futur/);
  assert.match(warning.message, /fiche plus récente/);
  assert.equal(planProfileSync(snapshot, profil).warnings.some(row => row.code === 'keyword-target-unknown'), true);
});

test('champ absent, liste vide ou lignes toutes connues : aucun avertissement', () => {
  for (const motsCles of [undefined, [], [{ id: 'sans-peur', cible: 'chien' }]]) {
    assert.equal(fiche(motsCles).warnings.some(row => row.field === 'keywords'), false, JSON.stringify(motsCles));
  }
});
