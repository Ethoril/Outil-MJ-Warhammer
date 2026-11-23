// Passe G, lot G4 (R16) : modèle des cibles d'un sort de zone. Sans carte : « Point d'impact (case) », rayon en mètres
// (contrat du sort, surpuissance « Zone » comprise), liste des combattants actifs à cocher, rien de précoché. Carte connectée :
// « Choisir sur la carte » ; la réponse `map.impact` précoche exactement les actifs de `refs` (contrat de liaison §10.1).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { getSpellContract } from '../../../js/core/v5-spell-contracts.js';
import { spellHasZone, zoneRadius, zoneTargetModel, castTargetIds, impactAnswerPatch, IMPACT_LABEL_MAX } from '../../../js/ui/resolution-panel/magic.js';

const BOLT = 'spell-audit-f44d90e9c50d6dafb769';        // Carreau : 1 cible
const FLAME = 'spell-audit-e807e7e99dda4a8b6d7b';       // ZdE Bonus de Force Mentale mètres
const PURIFY = 'spell-audit-c9c7acb2c5f08853373c';      // ZdE (Bonus de Force Mentale) mètres
const MAGMA = 'spell-audit-7b8004bc0fcc0f3e14fd';       // ZdE 2 × Bonus de Force Mentale mètres
const BLIZZARD = 'spell-audit-046e0c1303796961165d';    // ZdE Force Mentale mètres
const WALL = 'spell-audit-3c1d691fa904d17f859e';        // ZdE (Spécial)
const ARROWS = 'spell-audit-b34cc617578ad5355ca6';      // ZdE Bonus de CT mètres
const FOG = 'spell-tradition-voile-de-brouillard';      // ZdE Bonus de Force Mentale miles
const AURA = 'spell-audit-aa9e579ab8d66509dc68';        // Vous, effets « aoe »

const mage = { id: 'mage', name: 'Mage', zone: 'active', camp: 'ennemi', caracs: { FM: 47, CT: 35, I: 30, Int: 40, Soc: 25 } };
const people = [mage, { id: 'a', name: 'Alda', zone: 'active' }, { id: 'b', name: 'Bruno', zone: 'active' },
  { id: 'banc', name: 'Remplaçant', zone: 'bench' }, { id: 'c', name: 'Cora', zone: 'active' }];

describe('G4-a — seul un sort de zone propose le point d’impact', () => {
  test('Carreau (1 cible) : pas de zone, ni point d’impact ni carte', () => {
    const contract = getSpellContract(BOLT);
    assert.equal(spellHasZone(contract), false);
    const model = zoneTargetModel({ contract, actor: mage, participants: people, draft: {}, mapConnected: true });
    assert.equal(model.available, false);
    assert.equal(model.canQueryMap, false);
  });
  test('ZdE dans la cible, ou effets « aoe » : zone', () => {
    for (const id of [FLAME, PURIFY, MAGMA, BLIZZARD, WALL, AURA]) assert.equal(spellHasZone(getSpellContract(id)), true, id);
    assert.equal(spellHasZone(null), false);
  });
});

describe('G4-b — rayon en mètres (contrat du sort, surpuissance « Zone »)', () => {
  test('lecture du contrat : BFM, 2 × BFM, FM, Bonus de CT', () => {
    assert.equal(zoneRadius(getSpellContract(FLAME), mage).meters, 4);
    assert.equal(zoneRadius(getSpellContract(PURIFY), mage).meters, 4);
    assert.equal(zoneRadius(getSpellContract(MAGMA), mage).meters, 8);
    assert.equal(zoneRadius(getSpellContract(BLIZZARD), mage).meters, 47);
    assert.equal(zoneRadius(getSpellContract(ARROWS), mage).meters, 3);
  });
  test('surpuissance « Zone » : même palier que le moteur (3 DR → ×2, 18 DR → ×3)', () => {
    assert.deepEqual(zoneRadius(getSpellContract(FLAME), mage, 3), { meters: 8, base: 4, multiplier: 2 });
    assert.equal(zoneRadius(getSpellContract(FLAME), mage, 2).meters, 4);
    assert.equal(zoneRadius(getSpellContract(FLAME), mage, 18).meters, 12);
  });
  test('zone non chiffrée en mètres (Spécial, miles, aura « Vous ») : rayon inconnu, à saisir', () => {
    for (const id of [WALL, FOG, AURA]) assert.equal(zoneRadius(getSpellContract(id), mage).meters, null, id);
  });
  test('sans carte : point d’impact, liste des seuls actifs, rien de précoché', () => {
    const contract = getSpellContract(FLAME);
    const model = zoneTargetModel({ contract, actor: mage, participants: people, draft: { magicImpactMode: true }, mapConnected: false });
    assert.equal(model.available, true);
    assert.equal(model.mode, 'impact');
    assert.equal(model.canQueryMap, false);
    assert.equal(model.radius.meters, 4);
    assert.deepEqual(model.candidates.map(row => [row.id, row.checked]), [['mage', false], ['a', false], ['b', false], ['c', false]]);
  });
  test('rayon saisi par le MJ : il l’emporte sur le contrat', () => {
    const model = zoneTargetModel({ contract: getSpellContract(WALL), actor: mage, participants: people, draft: { magicImpactMode: true, magicImpactRadius: 6 }, mapConnected: false });
    assert.equal(model.radius.meters, 6);
  });
  test('cibles appliquées : en point d’impact, les seuls cochés, même aucun ; sinon le défaut d’aujourd’hui', () => {
    assert.deepEqual(castTargetIds({ magicImpactMode: true, magicTargetIds: ['b'] }, ['mage']), ['b']);
    assert.deepEqual(castTargetIds({ magicImpactMode: true, magicTargetIds: [] }, ['mage']), []);
    assert.deepEqual(castTargetIds({ magicImpactMode: true }, ['mage']), []);
    assert.deepEqual(castTargetIds({ magicTargetIds: [] }, ['mage']), ['mage'], 'mode combattant : inchangé');
    assert.deepEqual(castTargetIds({ magicTargetIds: ['a'] }, ['mage']), ['a']);
  });
  test('une case cochée reste cochée, une décochée reste décochée', () => {
    const model = zoneTargetModel({ contract: getSpellContract(FLAME), actor: mage, participants: people, draft: { magicImpactMode: true, magicTargetIds: ['b', 'banc'] }, mapConnected: false });
    assert.deepEqual(model.candidates.filter(row => row.checked).map(row => row.id), ['b'], 'un non-actif n’est jamais proposé');
  });
});

describe('G4-c — carte connectée : la réponse précoche exactement les actifs de refs', () => {
  test('« Choisir sur la carte » proposé en point d’impact, carte connectée', () => {
    const model = zoneTargetModel({ contract: getSpellContract(FLAME), actor: mage, participants: people, draft: { magicImpactMode: true }, mapConnected: true });
    assert.equal(model.canQueryMap, true);
    assert.equal(model.waiting, false);
  });
  test('réponse : cochés = ids rendus par la liaison, point d’impact noté ; tout reste décochable', () => {
    const draft = { magicImpactMode: true, magicTargetIds: ['mage'], magicImpact: { status: 'waiting', queryId: 'iq-1' } };
    const patch = impactAnswerPatch(draft, { ok: true, queryId: 'iq-1', levelId: 'L1', cell: { x: 3, y: 5 }, refs: ['p:a', 'p:c', 'p:inconnu'], ids: ['a', 'c'] });
    assert.deepEqual(patch, { magicTargetIds: ['a', 'c'], magicImpact: { status: 'placed', queryId: 'iq-1', levelId: 'L1', cell: { x: 3, y: 5 }, count: 2 } });
    const model = zoneTargetModel({ contract: getSpellContract(FLAME), actor: mage, participants: people, draft: { ...draft, ...patch }, mapConnected: true });
    assert.deepEqual(model.candidates.filter(row => row.checked).map(row => row.id), ['a', 'c']);
  });
  test('refs: [] : liste vide, aucun coché', () => {
    const draft = { magicImpactMode: true, magicImpact: { status: 'waiting', queryId: 'iq-2' } };
    assert.deepEqual(impactAnswerPatch(draft, { ok: true, queryId: 'iq-2', levelId: 'L1', cell: { x: 0, y: 0 }, refs: [], ids: [] }).magicTargetIds, []);
  });
});

describe('G4-d — annulation, réponse périmée : retour au manuel, sans erreur', () => {
  test('cancelled, déconnexion ou retrait : plus d’attente, cochés gardés', () => {
    const draft = { magicImpactMode: true, magicTargetIds: ['b'], magicImpact: { status: 'waiting', queryId: 'iq-3' } };
    for (const reason of ['cancelled', 'disconnected', 'superseded', 'withdrawn'])
      assert.deepEqual(impactAnswerPatch(draft, { ok: false, queryId: 'iq-3', reason }), { magicImpact: null }, reason);
  });
  test('réponse à une autre demande que celle du brouillon : rien', () => {
    const draft = { magicImpactMode: true, magicImpact: { status: 'waiting', queryId: 'iq-4' } };
    assert.equal(impactAnswerPatch(draft, { ok: true, queryId: 'iq-3', ids: ['a'] }), null);
    assert.equal(impactAnswerPatch({ magicImpactMode: true }, { ok: true, queryId: 'iq-3', ids: ['a'] }), null);
  });
  test('attente affichée seulement si la liaison attend encore cette demande', () => {
    const draft = { magicImpactMode: true, magicImpact: { status: 'waiting', queryId: 'iq-5' } };
    const common = { contract: getSpellContract(FLAME), actor: mage, participants: people, draft, mapConnected: true };
    assert.equal(zoneTargetModel({ ...common, pendingQueryId: 'iq-5' }).waiting, true);
    assert.equal(zoneTargetModel({ ...common, pendingQueryId: null }).waiting, false);
    assert.equal(zoneTargetModel({ ...common, pendingQueryId: 'iq-5', mapConnected: false }).waiting, false);
  });
  test('libellé de la demande : 40 caractères au plus', () => assert.equal(IMPACT_LABEL_MAX, 40));
});
