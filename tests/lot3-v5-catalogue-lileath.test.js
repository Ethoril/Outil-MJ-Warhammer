/**
 * Catalogue public : D-21 annulée (Silence (Arcane) et Arc coruscant ne sont pas ajoutés : doublons de
 * Silence d'Ulgu et d'Arc de T'Essla), correction du texte de la Bénédiction de Lileath et remplacement des caches périmés.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getAllSpellContracts, getSpellContract } from '../js/core/v5-spell-contracts.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';

test('D-21 annulée — ni Silence (Arcane) ni Arc coruscant : Silence garde la version d’Ulgu, l’Arc de T’Essla la sienne', () => {
  const spells = getReferenceCatalogue().magic.spells;
  assert.equal(spells.length, 277);
  assert.equal(getAllSpellContracts().filter(c => !c.isTradition).length, 277);
  for (const name of ['Silence (Arcane)', 'Arc coruscant', 'Coruscating Arc']) {
    assert.equal(spells.some(s => s.nom === name), false, name);
    // Phase D (Q15) : « Silence (Arcane) » de Winds of Magic est un contrat de tradition distinct (aucune identité du catalogue public).
    if (name === 'Silence (Arcane)') { assert.equal(getSpellContract(name).isTradition, true); assert.notEqual(getSpellContract(name).id, getSpellContract('Silence').id); } else assert.equal(getSpellContract(name), null, name);
  }
  assert.equal(spells.find(s => s.nom === 'Silence').type, "Uglu - Gris - Domaine de l'Ombre");
  assert.equal(spells.find(s => s.nom === 'Arc de T’Essla').cn, 7);
  // WoM p.111 : Hush Ulgu, modes déclaratifs, aucun handler Arcane.
  assert.deepEqual(getSpellContract('Silence').effects.facts.find(f=>f.key==='mode').options.map(o=>o[0]),['normal','in','all']);
});

test('Cache de références sans révision locale ou avec l’ancien texte de Lileath : rejeté même plus récent', async () => {
  const snapshot = (await import('../js/data/reference-snapshot.json', { with: { type: 'json' } })).default;
  const original = globalThis.localStorage;
  const stale = structuredClone(snapshot);
  stale.fetchedAt = '2099-10-11T00:00:00.000Z'; delete stale.localRevision;
  stale.talents.entries.find(t => t.id === 'talent-lileath-s-blessing').description = '=+1 DR par acquisition aux Tests réussis de Focalisation (Qhaysh).';
  globalThis.localStorage = { getItem: () => JSON.stringify({ data: stale, updatedAt: stale.fetchedAt }) };
  try {
    const refs = await import('../js/core/reference-catalog.js?lileath-stale-cache');
    assert.equal(refs.getReferenceStatus().source, 'instantané local (dépôt)');
    assert.match(refs.getReferenceCatalogue().talents.find(t => t.id === 'talent-lileath-s-blessing').description, /à tout Test de Focalisation/);
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});

test('Lileath — le catalogue public dit « tout Test de Focalisation (Qhaysh) », et l’épingle du moteur suit', async () => {
  const entry = getReferenceCatalogue().talents.find(t => t.id === 'talent-lileath-s-blessing');
  assert.match(entry.description, /à tout Test de Focalisation \(Qhaysh\), réussi ou non/);
  assert.doesNotMatch(entry.description, /Tests réussis/);
  const pins = (await import('../js/data/v5-magic-talent-sources.json', { with: { type: 'json' } })).default;
  assert.equal(pins.sourceDescriptions['talent-lileath-s-blessing'], entry.description, 'épingle identique : le talent reste actif');
});
