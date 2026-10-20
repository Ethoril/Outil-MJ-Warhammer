// Caractérisation (aucune correction) : invocations MAGIQUES auxiliaires, comportement de production 3.16.1.
// Chaque test épingle ce que le code fait AUJOURD'HUI ; un « DÉFAUT EXISTANT » signalé en commentaire n'est pas corrigé ici.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';
import { encounter, cast, inputFor, endTurn } from './helpers/lot3-domain-fixture.js';

const DAWN = c => ({ domainFacts: { ...inputFor(c).domainFacts, minutesToDawn: 1 } });
const json = store => JSON.parse(store.getFullJSON());
const auxOf = store => store.listParticipants().filter(p => p.extensions?.isAuxiliary);
const layersOf = (store, spellId) => store.listParticipants().flatMap(p => (p.extensions?.v5?.spellEffects || []).filter(e => e.spellId === spellId).map(e => ({ ...e, holderId: p.id })));
const jumpTo = async (store, round, currentActorId) => {
  const state = json(store); state.combat.round = round; state.combat.currentActorId = currentActorId; await store.loadFromJSON(state);
};
async function destrier(extras = {}) {
  const env = await encounter(extras), c = getSpellContract('Destrier d’Ombre');
  await cast(env.store, c, DAWN(c));
  return { ...env, c, horse: auxOf(env.store)[0] };
}

// ---------- C1 : création ----------
test('C1 Destrier d’Ombre : une seule commande atomique, ordre et acteur courant inchangés', async () => {
  const { store } = await encounter(), c = getSpellContract('Destrier d’Ombre');
  const before = json(store);
  await cast(store, c, DAWN(c));
  const after = json(store);
  assert.equal(after.localRevision, before.localRevision + 1, 'cast = une révision');
  assert.deepEqual(after.combat.order, ['mage', 'foe'], 'l’invocation n’entre pas dans combat.order à la création');
  assert.equal(after.combat.orderMode, before.combat.orderMode);
  assert.equal(after.combat.orderMode, 'automatic');
  assert.equal(after.combat.currentActorId, 'mage');
  assert.equal(after.combat.participants.length, 3);
});

test('C1 Destrier d’Ombre : champs auxiliaires dans extensions / extensions.v5, id et couche liée', async () => {
  const { store, c, horse } = await destrier();
  assert.match(horse.id, new RegExp('^aux-' + c.id + '-'));
  assert.equal(horse.isAuxiliary, undefined, 'isAuxiliary migre de la racine vers extensions');
  assert.equal(horse.casterId, undefined);
  assert.equal(horse.extensions.casterId, 'mage');
  assert.equal(horse.extensions.noMomentum, false);
  assert.equal(horse.extensions.appliedAtRound, 1);
  assert.equal(horse.camp, 'pj');
  assert.equal(horse.maxHp, 22);
  assert.equal(horse.caracs.M, 8);
  const v5 = horse.extensions.v5, [layer] = layersOf(store, c.id);
  assert.equal(v5.summonedBySpellId, c.id);
  assert.equal(v5.summonOwnerId, 'foe', 'propriétaire = cible du sort, pas le lanceur');
  assert.equal(layer.holderId, 'foe');
  assert.equal(v5.summonCastExecutionId, layer.castExecutionId, 'l’invocation et sa couche partagent l’exécution');
  assert.equal(v5.summonedUntilRound, 7);
  assert.equal(layer.expiresAtRound, 7);
});

test('C1 Épées Sanguines : une épée indestructible, hp 0 maxHp null, propriétaire = lanceur', async () => {
  const { store } = await encounter(), c = getSpellContract('Epées Sanguines');
  const rev = json(store).localRevision;
  await cast(store, c);
  assert.equal(json(store).localRevision, rev + 1);
  const [sword, ...rest] = auxOf(store);
  assert.equal(rest.length, 0);
  assert.equal(sword.name, 'Épée Sanguine 1');
  assert.match(sword.id, new RegExp('^aux-' + c.id + '-'));
  assert.equal(sword.extensions.ws, 60); assert.equal(sword.extensions.damage, 8);
  assert.equal(sword.extensions.noMomentum, true); assert.equal(sword.extensions.casterId, 'mage');
  assert.equal(sword.extensions.v5.indestructible, true);
  assert.equal(sword.extensions.v5.summonOwnerId, 'mage');
  assert.equal(sword.extensions.v5.summonAttack.fly, 20);
  assert.equal(sword.hp, 0); assert.equal(sword.maxHp, null, 'état actuel : hp 0 / maxHp null (indestructible)');
  assert.deepEqual(json(store).combat.order, ['mage', 'foe']);
  const [layer] = layersOf(store, c.id);
  assert.equal(layer.holderId, 'mage'); assert.equal(layer.expiresAtRound, 37);
  assert.equal(sword.extensions.v5.summonCastExecutionId, layer.castExecutionId);
});

test('C1 Enfants Sauvages de Zandox : deux chiens aux ids distincts dans une seule commande', async () => {
  const { store } = await encounter(), c = getSpellContract('Les Enfants Sauvages de Zandox');
  const rev = json(store).localRevision;
  await cast(store, c);
  assert.equal(json(store).localRevision, rev + 1);
  const dogs = auxOf(store);
  assert.equal(dogs.length, 2);
  assert.notEqual(dogs[0].id, dogs[1].id);
  assert.deepEqual(dogs.map(d => d.name).sort(), ['Chien Sauvage de Zandox 1', 'Chien Sauvage de Zandox 2']);
  for (const d of dogs) {
    assert.equal(d.extensions.invisible, true); assert.ok(d.extensions.traits.includes('Invisible'));
    assert.equal(d.extensions.v5.summonOwnerId, 'mage');
  }
  assert.deepEqual(json(store).combat.order, ['mage', 'foe']);
  assert.equal(layersOf(store, c.id).length, 1, 'une seule couche pour les deux chiens');
});

test('C1 Œil Invisible : capteur lié à son propriétaire, sans summonedUntilRound', async () => {
  const { store } = await encounter(), c = getSpellContract('Œil Invisible');
  await cast(store, c);
  const [eye, ...rest] = auxOf(store);
  assert.equal(rest.length, 0);
  assert.match(eye.id, /^aux-invisible-eye-\d+$/);
  assert.equal(eye.maxHp, 3); assert.equal(eye.hp, 3);
  assert.equal(eye.extensions.sensor, true);
  assert.equal(eye.extensions.v5.eyeOwner, 'mage');
  assert.equal(eye.extensions.v5.summonOwnerId, 'foe');
  assert.equal(eye.extensions.v5.summonedUntilRound, undefined);
  assert.ok(eye.extensions.v5.summonCastExecutionId);
  assert.deepEqual(json(store).combat.order, ['mage', 'foe']);
});

test('C1 le premier changement de Tour insère l’invocation dans combat.order selon l’initiative', async () => {
  const { store, engine, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine);
  const combat = json(store).combat;
  assert.deepEqual(combat.order, ['mage', horse.id, 'foe']);
  assert.equal(combat.currentActorId, horse.id, 'la monture (I 15) joue juste après le lanceur (I 60)');
  assert.equal(combat.orderMode, 'automatic');
});

// ---------- C2 : expiration, fin anticipée, Undo/Redo, rechargement ----------
test('C2 Destrier : à l’échéance de la couche (fin du Tour du lanceur) la monture et la couche disparaissent ensemble ; Undo/Redo les lient', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 25 } });
  await jumpTo(store, 7, 'mage');
  await endTurn(engine);
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
  assert.ok(!json(store).combat.order.includes(horse.id));
  await store.undo();
  assert.equal(auxOf(store).length, 1, 'Undo : monture');
  assert.equal(layersOf(store, c.id).length, 1, 'Undo : couche');
  await store.redo();
  assert.equal(auxOf(store).length, 0, 'Redo : monture retirée');
  assert.equal(layersOf(store, c.id).length, 0, 'Redo : couche retirée');
});

test('C2 Destrier : tant que la couche tient (fin du round 6, début du round 7) la monture reste', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 25 } });
  await jumpTo(store, 6, 'mage'); await endTurn(engine);
  assert.ok(auxOf(store).some(a => a.id === horse.id));
  await jumpTo(store, 7, 'mage');
  assert.equal(layersOf(store, c.id).length, 1);
  assert.ok(auxOf(store).some(a => a.id === horse.id));
});

test('C2 Enfants Sauvages : les deux chiens expirent avec leur couche au round 7', async () => {
  const { store, engine } = await encounter(), c = getSpellContract('Les Enfants Sauvages de Zandox');
  await cast(store, c);
  await jumpTo(store, 7, 'mage'); await endTurn(engine);
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
  await store.undo();
  assert.equal(auxOf(store).length, 2);
});

test('C2 Épées Sanguines : expire au round 37 (Bonus de FM minutes)', async () => {
  const { store, engine } = await encounter(), c = getSpellContract('Epées Sanguines');
  await cast(store, c);
  await jumpTo(store, 36, 'mage'); await endTurn(engine);
  assert.equal(auxOf(store).length, 1, 'toujours là au round 36');
  await jumpTo(store, 37, 'mage'); await endTurn(engine);
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
});

test('C2 fin anticipée du sort : l’invocation part avec la couche, Undo puis Redo', async () => {
  const { store, c, horse } = await destrier();
  const [layer] = layersOf(store, c.id), order = json(store).combat.order;
  await store.applySpellInteraction({ effectId: layer.id, targetId: 'foe', kind: 'end' });
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
  assert.deepEqual(json(store).combat.order, order);
  await store.undo();
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
  assert.equal(layersOf(store, c.id).length, 1);
  await store.redo();
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
});

test('C2 Undo de la création retire l’invocation et sa couche ; Redo les rend avec le même id', async () => {
  const { store, c, horse } = await destrier();
  await store.undo();
  assert.equal(auxOf(store).length, 0); assert.equal(layersOf(store, c.id).length, 0);
  await store.redo();
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
  assert.equal(layersOf(store, c.id).length, 1);
});

test('C2 rechargement getFullJSON puis loadFromJSON : invocation et couche conservées, expiration toujours effective', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 25 } });
  await endTurn(engine);
  const snapshot = json(store);
  await store.loadFromJSON(snapshot);
  const reloaded = auxOf(store);
  assert.deepEqual(reloaded.map(a => a.id), [horse.id]);
  assert.equal(reloaded[0].extensions.v5.summonCastExecutionId, layersOf(store, c.id)[0].castExecutionId);
  assert.deepEqual(json(store).combat.order, snapshot.combat.order);
  await jumpTo(store, 7, 'mage'); await endTurn(engine);
  assert.equal(auxOf(store).length, 0);
});

test('C2 second filtre (fin de processCombatTurnSpells) : une invocation sans summonCastExecutionId disparaît quand round >= summonedUntilRound', async () => {
  const { store, engine } = await encounter();
  const state = json(store);
  state.combat.participants.push({ id: 'legacy', name: 'legacy', kind: 'Créature', camp: 'pj', zone: 'active', hp: 5, maxHp: 5, initiative: 30, caracs: { M: 4 }, extensions: { isAuxiliary: true, v5: { summonedUntilRound: 2 } } });
  await store.loadFromJSON(state);
  await endTurn(engine);                                       // mage -> legacy, round 1
  assert.ok(auxOf(store).some(a => a.id === 'legacy'));
  await endTurn(engine); await endTurn(engine);                 // legacy -> foe -> round 2 : filtre
  assert.equal(store.getCombat().round, 2);
  assert.equal(auxOf(store).length, 0);
  const combat = json(store).combat;
  assert.ok(!combat.order.includes('legacy'));
  assert.equal(combat.currentActorId, 'mage');
});

test('C2 la couche expire au passage au round 8 si le lanceur n’a pas fini son Tour d’échéance : la monture part avec elle', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 25 } });
  await jumpTo(store, 7, 'foe'); await endTurn(engine);  // la monture entre dans l’ordre et joue (round 7)
  assert.ok(auxOf(store).some(a => a.id === horse.id));
  await endTurn(engine);                                  // fin du Tour de la monture : round 8
  assert.equal(store.getCombat().round, 8);
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
  assert.deepEqual(json(store).combat.order, ['mage', 'foe']);
  assert.equal(json(store).combat.currentActorId, 'mage');
});

// ---------- C3 / C9 : acteur courant ou suivant qui expire ----------
test('C3 monture prochain acteur lors de l’expiration : gardée courante (orpheline), retirée à la commande suivante, sans Tour rejoué ni sauté', async () => {
  // DÉFAUT CORRIGÉ (chantier p4d-r4) : auparavant removeExpiredSummons retirait la monture courante et reposait currentActorId sur
  // order[0] = le lanceur, qui rejouait dans le même Round pendant que foe sautait son Tour. Désormais l'invocation orpheline qui est
  // l'acteur courant (hors tête d'ordre) reste jusqu'à la commande suivante, comme sweepDivineSummons côté divin.
  const { store, engine, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine);                                  // la monture entre dans l'ordre, courante
  assert.equal(json(store).combat.currentActorId, horse.id);
  await endTurn(engine); await endTurn(engine);            // foe puis round 2, mage
  await jumpTo(store, 7, 'mage');
  const before = json(store);
  assert.deepEqual(before.combat.order, ['mage', horse.id, 'foe']);
  await endTurn(engine);                                  // ne doit pas rejeter
  const after = json(store);
  assert.equal(after.localRevision, before.localRevision + 1);
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id], 'orpheline mais acteur courant : retirée au Tour suivant');
  assert.deepEqual(after.combat.order, ['mage', horse.id, 'foe']);
  assert.equal(after.combat.round, 7);
  assert.equal(after.combat.currentActorId, horse.id, 'le successeur du lanceur est bien la monture : le lanceur ne rejoue pas');
  assert.equal(after.extensions.v5.gameClock.combat.currentActorId, horse.id);
  assert.equal(after.extensions.v5.gameClock.combat.round, 7);
  assert.equal(after.extensions.v5.turnIndex, before.extensions.v5.turnIndex + 1);
  await endTurn(engine);
  assert.equal(json(store).combat.currentActorId, 'foe', 'foe joue son Tour du round 7');
  assert.equal(auxOf(store).length, 0);
  assert.deepEqual(json(store).combat.order, ['mage', 'foe']);
  await store.undo(); await store.undo();
  assert.equal(json(store).combat.currentActorId, 'mage');
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
});

test('C3 le Tour suivant après cette expiration fonctionne (pas de rejet V5_CLOCK_POSITION_CONFLICT)', async () => {
  const { store, engine, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine); await endTurn(engine); await endTurn(engine);
  await jumpTo(store, 7, 'mage');
  await endTurn(engine);
  await endTurn(engine);
  const combat = json(store).combat;
  assert.equal(combat.currentActorId, 'foe');
  assert.equal(combat.round, 7);
  assert.ok(!combat.order.includes(horse.id));
  await endTurn(engine);
  assert.equal(json(store).combat.round, 8);
  assert.equal(json(store).combat.currentActorId, 'mage');
});

test('C3 monture première de l’ordre au Round d’échéance+1 : retirée, le premier acteur restant prend la main', async () => {
  // Le lanceur (I 1) joue en dernier ; la monture ouvrirait le round 8 mais expire à la fin du Tour du lanceur (round 7).
  const { store, engine, horse } = await destrier({ mage: { initiative: 1 }, foe: { initiative: 5 } });
  await endTurn(engine);
  assert.deepEqual(json(store).combat.order, [horse.id, 'foe', 'mage']);
  await jumpTo(store, 7, 'mage');
  await endTurn(engine);
  const combat = json(store).combat;
  assert.equal(auxOf(store).length, 0);
  assert.deepEqual(combat.order, ['foe', 'mage']);
  assert.equal(combat.round, 8);
  assert.equal(combat.currentActorId, 'foe');
});

test('C3 monture acteur courant après l’échéance (round 8) : sa fin de Tour l’expire et passe la main à foe', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine);
  await jumpTo(store, 8, horse.id);                       // couche encore présente (7), round > 7
  assert.equal(layersOf(store, c.id).length, 1);
  await endTurn(engine);
  const combat = json(store).combat;
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
  assert.deepEqual(combat.order, ['mage', 'foe']);
  assert.equal(combat.currentActorId, 'foe');
  assert.equal(combat.round, 8);
});

test('C3 monture courante au round 7 : son propre Tour ne l’expire pas (la couche expire au Tour du lanceur)', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine);
  await jumpTo(store, 7, horse.id);
  await endTurn(engine);
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
  assert.equal(layersOf(store, c.id).length, 1);
  assert.equal(json(store).combat.currentActorId, 'foe');
});

test('C9 chiens sans initiative : jamais dans combat.order ; expiration sans effet sur l’ordre ni l’acteur courant', async () => {
  // Observé : les chiens (initiative absente) ne sont pas insérés dans combat.order par le changement de Tour.
  const { store, engine } = await encounter({ foe: { initiative: 5 } }), c = getSpellContract('Les Enfants Sauvages de Zandox');
  await cast(store, c);
  await endTurn(engine);
  const dogIds = auxOf(store).map(a => a.id);
  assert.equal(dogIds.length, 2);
  for (const id of dogIds) assert.ok(!json(store).combat.order.includes(id));
  await jumpTo(store, 7, 'mage'); await endTurn(engine);
  const combat = json(store).combat;
  assert.equal(auxOf(store).length, 0);
  assert.deepEqual(combat.order, ['mage', 'foe']);
  assert.ok(combat.order.includes(combat.currentActorId));
});

test('C9 invocation retirée alors qu’elle est l’acteur courant (fin anticipée) : gardée jusqu’à la commande suivante, puis Tour de son successeur', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine);
  assert.equal(json(store).combat.currentActorId, horse.id);
  const [layer] = layersOf(store, c.id);
  await store.applySpellInteraction({ effectId: layer.id, targetId: 'foe', kind: 'end' });
  const kept = json(store).combat;
  assert.ok(kept.order.includes(horse.id), 'l’invocation orpheline reste dans l’ordre');
  assert.equal(kept.currentActorId, horse.id, 'elle reste l’acteur courant, sans Tour rendu au lanceur');
  await endTurn(engine);
  const combat = json(store).combat;
  assert.equal(auxOf(store).length, 0, 'retirée à la commande suivante');
  assert.ok(!combat.order.includes(horse.id));
  assert.equal(combat.currentActorId, 'foe', 'son successeur joue, pas le lanceur');
  await store.undo(); await store.undo();
  const undone = json(store).combat;
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
  assert.ok(undone.order.includes(horse.id));
  assert.equal(undone.currentActorId, horse.id);
});
