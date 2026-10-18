import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { getAllDivineContracts } from '../js/core/v5-divine-store.js';
import {
  advanceGameClock, createGameClock, deriveTurnPhasePlan, readCombatPosition,
  reconcileGameClockPosition, validateGameClock
} from '../js/core/v5-game-time.js';
import { migrateSnapshot } from '../js/core/migrations.js';
import { sanitizeMagicEnvelope } from '../js/core/sanitize.js';

const BATTLE = 'divine:blessing:myrmidia:battle';
const contracts = getAllDivineContracts();
const actor = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: id === 'priest' ? 60 : 30,
  hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [
    { id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' },
    { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }
  ],
  prayers: contracts.filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 }, channelling: { type: 'winds', sl: 17 } } },
  ...extra
});

function memoryPersistence({ failSaves = false } = {}) {
  let saved = null;
  let refuse = false;
  return {
    async load() { return saved && structuredClone(saved); },
    setRefuse(value) { refuse = value; },
    async saveAtomic({ state }) {
      if (failSaves || refuse) return { ok: false, error: 'refus de test' };
      saved = structuredClone(state);
      return { ok: true };
    }
  };
}

async function fixture({ scene = false, persistence = memoryPersistence() } = {}) {
  const priest = actor('priest'), ally = actor('ally');
  const combat = { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [priest, ally] };
  const snapshot = {
    schemaVersion: 3, reserve: [], combat, log: [], diceLines: [],
    extensions: { v5: { turnIndex: 1 } }
  };
  if (scene) {
    snapshot.activeScene = {
      id: 'scene-e5', encounterId: 'encounter-e5', title: 'Scène E5', status: 'active',
      round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [priest, ally],
      extensions: { v5: { turnIndex: 1 } }
    };
    snapshot.suspendedScenes = [];
    snapshot.encounters = [{ id: 'encounter-e5', status: 'active' }];
  }
  const store = createStore({ persistence });
  await store.ready;
  await store.loadFromJSON(snapshot);
  const prayerInput = {
    actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true,
    choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: { ally: { withinRange: true, ally: true } } },
    expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest', moment: 'afterEffects' }
  };
  const preview = store.previewDivineExecution(BATTLE, prayerInput);
  assert.equal(preview.ready, true, preview.error);
  await store.applyDivineExecution(BATTLE, { preview });
  // The fixture keeps an otherwise source-valid layer while pinning its phase deadline
  // to Round 1 so the forbidden synthetic phase is observable in this one-command test.
  const target = store.listParticipants().find(row => row.id === 'ally');
  const v5 = target.extensions.v5;
  await store.updateParticipant('ally', {
    extensions: { ...target.extensions, v5: {
      ...v5,
      divineEffects: v5.divineEffects.map(layer => ({ ...layer, expiry: {
        phase: 'endOfTurn', round: 1, actorId: 'priest', moment: 'afterEffects'
      } }))
    } }
  });
  return store;
}

const activeDivineLayers = store => {
  const state = JSON.parse(store.getFullJSON());
  const participants = [
    ...(state.combat?.participants || []),
    ...(state.activeScene?.participants || []),
    ...(state.suspendedScenes || []).flatMap(scene => scene.participants || [])
  ];
  return participants.flatMap(row => row.extensions?.v5?.divineEffects || []);
};

test('E5 indépendant — changer manuellement Round/acteur ne simule pas la fin du Tour précédent', async () => {
  const store = await fixture();
  assert.equal(activeDivineLayers(store).length, 1);
  await store.setRoundTurn(2, 'ally');
  assert.equal(activeDivineLayers(store).length, 1,
    'setRoundTurn est une mutation de position; il ne doit pas fabriquer endOfTurn Round 1');
});

test('E5 indépendant — retirer l’acteur courant ne simule pas une phase de fin de Tour', async () => {
  const store = await fixture();
  await store.removeParticipant('priest');
  assert.equal(activeDivineLayers(store).length, 1,
    'le retrait de combat ne doit pas appeler expireDivineEffects sur un endOfTurn inféré');
});

test('E5 indépendant — suspendre une scène ne fabrique pas de phase temporelle', async () => {
  const store = await fixture({ scene: true });
  await store.suspendActiveScene();
  assert.equal(activeDivineLayers(store).length, 1,
    'la suspension déplace la scène; elle n’est ni un Tour ni une expiration');
  assert.equal(store.listSuspendedScenes().length, 1);
});

test('E5 indépendant — suspendre/reprendre réconcilie la projection sans créer un Tour ni du temps', async () => {
  const store = await fixture({ scene: true });
  const before = JSON.parse(store.getFullJSON()).extensions.v5.gameClock;
  await store.suspendActiveScene();
  const suspended = JSON.parse(store.getFullJSON());
  assert.equal(suspended.extensions.v5.gameClock.campaignSeconds, before.campaignSeconds);
  assert.equal(suspended.extensions.v5.gameClock.revision, before.revision);
  assert.equal(store.listSuspendedScenes()[0].participants.find(row => row.id === 'ally').extensions.v5.divineEffects.length,
    1, 'suspendre conserve la couche en attente de la reprise');

  const scene = store.listSuspendedScenes()[0];
  await store.resumeScene(scene.id);
  const resumed = JSON.parse(store.getFullJSON());
  const projectedPosition = readCombatPosition(resumed);
  assert.deepEqual(resumed.extensions.v5.gameClock.combat, projectedPosition,
    'la position canonique est réconciliée après reprise sans exiger une transition temporelle');
  assert.equal(resumed.extensions.v5.gameClock.campaignSeconds, before.campaignSeconds,
    'une reprise ne fabrique pas de temps de campagne');
  assert.equal(resumed.extensions.v5.gameClock.revision, before.revision,
    'une reprise ne fabrique pas de révision d’horloge');
  assert.equal(store.getActiveScene().participants.find(row => row.id === 'ally').extensions.v5.divineEffects.length, 1);
  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'ally', 'une vraie commande suivante fonctionne après la reprise');
  assert.equal(store.getActiveScene().participants.find(row => row.id === 'ally').extensions.v5.divineEffects.length, 0,
    'la vraie transition expire la couche seulement à son échéance validée');
});

test('E5 indépendant — modifier la piste d’ordre sans transition conserve les échéances', async () => {
  const store = await fixture();
  const beforeClock = JSON.parse(store.getFullJSON()).extensions.v5.gameClock;
  await store.moveInOrder('ally', 'priest');
  await store.setOrderMode('manual');
  assert.equal(activeDivineLayers(store).length, 1,
    'l’ordre de la piste ne produit pas de phases end/start de Tour');
  assert.deepEqual(JSON.parse(store.getFullJSON()).extensions.v5.gameClock, beforeClock,
    'le réordonnancement ne révisionne pas ni n’avance l’horloge');
});

test('E5 indépendant — une vraie transition legacy nextTurn traverse les phases et expire au moment dû', async () => {
  const store = await fixture();
  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'ally');
  assert.equal(activeDivineLayers(store).length, 0,
    'la même échéance endOfTurn est traitée par la vraie commande nextTurn');
});

test('E5 indépendant — le chemin end-turn-v5 compare la coordonnée explicite expiry.turn', async () => {
  const store = await fixture();
  const target = store.listParticipants().find(row => row.id === 'ally');
  const v5 = target.extensions.v5;
  await store.updateParticipant('ally', {
    extensions: { ...target.extensions, v5: {
      ...v5,
      divineEffects: v5.divineEffects.map(layer => ({ ...layer, expiry: {
        phase: 'endOfTurn', round: 1, actorId: 'priest', turn: 1, moment: 'afterEffects'
      } }))
    } }
  });
  const preview = createCombatEngine(store).previewNextTurn();
  assert.equal(preview.ready, true, preview.error);
  const projectedLayers = preview.state.combat.participants.flatMap(row => row.extensions?.v5?.divineEffects || []);
  assert.equal(projectedLayers.length, 0,
    'le vrai plan V5 doit transmettre `turn` depuis turnIndex aux expirations divines');
});

test('E5 indépendant — le chemin Store legacy conserve ses effets et ne demande ni dé ni mécanique V5', async () => {
  const store = await fixture();
  await store.setRoundTurn(1, 'ally');
  await store.updateParticipant('priest', { states: [{ name: 'Enflammé', level: 1 }], hp: 20 });
  const before = JSON.parse(store.getFullJSON());
  const result = await store.nextTurn();
  assert.notEqual(result?.ok, false, 'la transition legacy reste utilisable sans fournir un d10 V5');
  const after = JSON.parse(store.getFullJSON());
  assert.equal(after.combat.round, 2, 'la transition réellement passée ouvre le Round suivant');
  assert.equal(after.combat.currentActorId, 'priest');
  assert.deepEqual(after.combat.participants.find(row => row.id === 'priest').states,
    before.combat.participants.find(row => row.id === 'priest').states,
    'le legacy ne déclenche pas le dommage de Feu ni les acquisitions de previewV5Turn');
  assert.equal(after.combat.participants.find(row => row.id === 'priest').hp, 20);
  assert.deepEqual(after.diceLines, before.diceLines,
    'l’horloge commune n’injecte pas les demandes de dés du moteur V5 dans Store.nextTurn');
});

test('E5 indépendant — les sorts sans auteur expirent au premier Round d’arrivée et Undo restaure une seule transition', async () => {
  const mage = actor('mage', { talents: [{ id: 'talent-mind-over-body', status: 'resolved', rank: 3 }] });
  const enemy = actor('enemy');
  const store = createStore();
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: {
    round: 1, currentActorId: 'mage', order: ['mage', 'enemy'], participants: [mage, enemy]
  }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  await store.setFortune('mage', 2);
  await store.applyMagicMeditation({ actorId: 'mage', talentId: 'talent-mind-over-body',
    name: 'L’esprit sur le corps', minutes: 20, roll: 50, durationRolls: [1, 1] });
  await store.activateMindOverBody('mage');
  const effectBefore = store.listParticipants().find(row => row.id === 'mage').extensions.v5.spellEffects
    .find(row => row.magicTalentId === 'talent-mind-over-body');
  assert.equal(effectBefore.casterId, undefined, 'la fixture utilise bien le chemin historique sans auteur');
  await store.advanceTalentMinutes(119 + 5 / 6);
  const beforeTurn = JSON.parse(store.getFullJSON());
  assert.ok(beforeTurn.combat.participants.find(row => row.id === 'mage').extensions.v5.spellEffects
    .some(row => row.magicTalentId === 'talent-mind-over-body'));

  await store.nextTurn();
  const expired = JSON.parse(store.getFullJSON());
  assert.equal(expired.combat.round, 2, 'le Tour passe réellement au premier Round d’arrivée');
  assert.equal(expired.extensions.v5.gameClock.revision, beforeTurn.extensions.v5.gameClock.revision + 1);
  assert.equal(expired.extensions.v5.gameClock.campaignSeconds, beforeTurn.extensions.v5.gameClock.campaignSeconds + 10);
  assert.equal(expired.combat.participants.find(row => row.id === 'mage').extensions.v5.spellEffects
    .some(row => row.magicTalentId === 'talent-mind-over-body'), false,
  'l’effet sans auteur suit l’échéance du premier Round d’arrivée, pas un Tour supplémentaire');
  assert.equal(store.getFortune('mage').balance, 1);

  await store.undo();
  const restored = JSON.parse(store.getFullJSON());
  assert.ok(restored.combat.participants.find(row => row.id === 'mage').extensions.v5.spellEffects
    .some(row => row.magicTalentId === 'talent-mind-over-body' && row.ignoreCriticalPenalties));
  assert.deepEqual(restored.extensions.v5.gameClock, beforeTurn.extensions.v5.gameClock,
    'Undo annule ensemble l’expiration et le reçu/position d’horloge de cette transition');
  assert.equal(store.getFortune('mage').balance, 1, 'annuler la transition ne rembourse pas la Chance dépensée antérieurement');
});

test('E5 indépendant — un auteur divin absent ne reçoit pas le repli D-12 réservé aux sorts', async () => {
  const store = await fixture();
  const target = store.listParticipants().find(row => row.id === 'ally');
  const v5 = target.extensions.v5;
  await store.updateParticipant('ally', {
    extensions: { ...target.extensions, v5: {
      ...v5,
      divineEffects: v5.divineEffects.map(layer => ({ ...layer, expiry: {
        phase: 'endOfTurn', round: 1, actorId: 'removed-author', moment: 'afterEffects'
      } }))
    } }
  });
  await store.nextTurn();
  assert.equal(activeDivineLayers(store).length, 1,
    'un Tour réel d’un autre personnage ne satisfait pas silencieusement l’échéance d’auteur d’une prière');
});

test('E5 indépendant — un CAS n’accepte que le plan canonique exact, sans phases injectées', () => {
  const initial = createGameClock({ combat: { round: 1, currentActorId: 'a' }, extensions: { v5: { turnIndex: 3 } } });
  const from = initial.combat;
  const to = { ...from, currentActorId: 'b', turnIndex: 4 };
  const phases = deriveTurnPhasePlan({ from, to });
  const event = { id: 'clock-v1:0:independent-turn', baseRevision: 0, kind: 'combat-transition', sceneId: null, from, to, phases };
  const accepted = advanceGameClock(initial, event);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.clock.campaignSeconds, 0, 'un changement de Tour dans le même Round n’ajoute aucune seconde');

  const forged = [
    { ...event, phases: [...phases].reverse() },
    { ...event, phases: [...phases, { index: phases.length, phase: 'attackAttempt' }] },
    { ...event, id: 'independent:turn:1' },
    { ...event, id: 'clock-v1:1:wrong-base-encoded' },
    { ...event, sceneId: 'different-scene' },
    { ...event, from: { ...from, currentActorId: 'intruder' } },
    { ...event, to: { ...to, round: 3 } }
  ];
  for (const attempt of forged) {
    const result = advanceGameClock(initial, attempt);
    assert.equal(result.ok, false, 'ID non versionné, base intégrée divergente, phase absente ou transition forgée rejetés');
    assert.deepEqual(result.clock, initial, 'un rejet ne modifie pas la clock de départ');
  }
  assert.throws(() => validateGameClock({ ...accepted.clock, lastEvent: null }), /reçu de clock requis/i,
    'une clock de révision non initiale ne peut pas supprimer son reçu de dernière transition');
  assert.equal(advanceGameClock(accepted.clock, { ...event, to: { ...to, currentActorId: 'c' } }).status, 'conflict',
    'réutiliser l’ID avec un payload différent n’avance jamais une seconde fois');
});

test('E5 indépendant — seul un Round réellement franchi ajoute une fois dix secondes, et un ancien retry reste stale', () => {
  const initial = createGameClock({ combat: { round: 4, currentActorId: 'b' }, extensions: { v5: { turnIndex: 10 } } });
  const from = initial.combat;
  const to = { ...from, round: 5, turnIndex: 11, currentActorId: 'a' };
  const event = { id: 'clock-v1:0:independent-round', baseRevision: 0, kind: 'combat-transition', sceneId: null, from, to,
    phases: deriveTurnPhasePlan({ from, to }) };
  const advanced = advanceGameClock(initial, event);
  assert.equal(advanced.elapsedSeconds, 10);
  assert.equal(advanced.clock.campaignSeconds, 10,
    'un Round complet ajoute dix secondes, pas une durée par combattant');
  const later = advanceGameClock(advanced.clock, {
    id: 'clock-v1:1:independent-campaign', baseRevision: 1, kind: 'campaign-time-advance', seconds: 60, reason: 'Avance confirmée par le MJ'
  });
  assert.equal(later.clock.campaignSeconds, 70);
  assert.equal(advanceGameClock(later.clock, event).status, 'stale',
    'un replay d’une commande antérieure après une révision nouvelle est périmé');
});

test('E5 indépendant — migration initialise une horloge zéro sans réécrire les couches héritées ni extensions inconnues', () => {
  const legacyLayer = { id: 'legacy-effect', remainingMinutes: 12, expiresAtRound: 9,
    extensionField: { preserve: true } };
  const source = {
    schemaVersion: 3, reserve: [], combat: { round: 3, currentActorId: 'actor', order: ['actor'], participants: [{
      id: 'actor', name: 'A', zone: 'active', states: [],
      extensions: { v5: { spellEffects: [structuredClone(legacyLayer)], unknownFeature: { keep: 'yes' } } }
    }] },
    extensions: { v5: { turnIndex: 7, unknownClockNeighbour: { keep: 'yes' } } }
  };
  const before = structuredClone(source);
  const migrated = migrateSnapshot(source).data;
  assert.deepEqual(source, before, 'migration ne mutile pas le snapshot reçu');
  assert.equal(migrated.extensions.v5.gameClock.campaignSeconds, 0,
    'l’absence historique de clock n’importe aucun temps réel écoulé');
  assert.deepEqual(migrated.extensions.v5.gameClock.combat,
    { sceneId: null, round: 3, turnIndex: 7, currentActorId: 'actor' });
  const participant = migrated.combat.participants[0];
  assert.deepEqual(participant.extensions.v5.spellEffects[0], legacyLayer,
    'les anciennes représentations de durée restent intactes pendant cette initialisation');
  assert.deepEqual(participant.extensions.v5.unknownFeature, { keep: 'yes' });
  assert.deepEqual(migrated.extensions.v5.unknownClockNeighbour, { keep: 'yes' });
  assert.equal(sanitizeMagicEnvelope({ reserve: [], combat: { participants: [] } }).extensions, undefined,
    'la sanitation générique ne crée pas de clock sur une enveloppe protocole vide');
  assert.throws(() => validateGameClock({ ...migrated.extensions.v5.gameClock, campaignSeconds: -1 }), /clock/i);
});

test('E5 indépendant — réconcilier une scène reprise ou un index manuel ne crée ni phase ni durée', () => {
  const original = createGameClock({ combat: { round: 1, currentActorId: 'a' }, extensions: { v5: { turnIndex: 2 } } });
  const resumed = reconcileGameClockPosition(original, { sceneId: 'resumed-scene', round: 0, turnIndex: 2, currentActorId: null });
  assert.equal(resumed.changed, true);
  assert.equal(resumed.clock.campaignSeconds, 0);
  assert.equal(resumed.clock.revision, 0);
  assert.equal(resumed.clock.lastEvent, null);
  assert.deepEqual(resumed.clock.combat, { sceneId: 'resumed-scene', round: 0, turnIndex: 2, currentActorId: null });
  const editedIndex = reconcileGameClockPosition(resumed.clock,
    { ...resumed.clock.combat, turnIndex: 15, currentActorId: 'a' });
  assert.equal(editedIndex.clock.campaignSeconds, 0);
  assert.equal(editedIndex.clock.revision, 0);
  assert.deepEqual(readCombatPosition({ activeScene: { id: 'held', status: 'suspended', extensions: { v5: { turnIndex: 42 } } },
    combat: { round: 0, currentActorId: null }, extensions: { v5: { turnIndex: 4 } } }),
  { sceneId: null, round: 0, turnIndex: 4, currentActorId: null }, 'une scène suspendue ne devient pas la position active');
});

test('E5 indépendant — prévisualiser une transition est pure et ne consomme ni clock ni couche', async () => {
  const store = await fixture();
  const before = JSON.parse(store.getFullJSON());
  const preview = createCombatEngine(store).previewNextTurn();
  assert.equal(preview.ready, true, preview.error);
  const after = JSON.parse(store.getFullJSON());
  assert.deepEqual(after.extensions?.v5?.gameClock, before.extensions?.v5?.gameClock);
  assert.deepEqual(after.combat, before.combat);
  assert.deepEqual(after.combat.participants.find(row => row.id === 'ally').extensions?.v5?.divineEffects,
    before.combat.participants.find(row => row.id === 'ally').extensions?.v5?.divineEffects);
});

test('E5 indépendant — suspendre puis reprendre une scène ne fabrique aucune durée ou révision', async () => {
  const store = await fixture({ scene: true });
  const before = JSON.parse(store.getFullJSON()).extensions.v5.gameClock;
  const sceneId = store.getActiveScene().id;
  await store.suspendActiveScene();
  const suspended = JSON.parse(store.getFullJSON()).extensions.v5.gameClock;
  assert.equal(suspended.campaignSeconds, before.campaignSeconds);
  assert.equal(suspended.revision, before.revision);
  assert.equal(suspended.lastEvent, before.lastEvent);
  assert.equal(suspended.combat.sceneId, null, 'le cache clock suit la projection active sans sauter le temps');
  await store.resumeScene(sceneId);
  const resumed = JSON.parse(store.getFullJSON()).extensions.v5.gameClock;
  assert.equal(resumed.campaignSeconds, before.campaignSeconds);
  assert.equal(resumed.revision, before.revision);
  assert.equal(resumed.lastEvent, before.lastEvent);
  assert.equal(resumed.combat.sceneId, sceneId);
});

test('E5 indépendant — nextTurn committe position, horloge et phases comme une commande réversible atomiquement', async () => {
  const store = await fixture();
  const before = JSON.parse(store.getFullJSON());
  const beforeClock = before.extensions?.v5?.gameClock;
  assert.ok(beforeClock, 'la migration réelle du snapshot Store initialise une clock versionnée');
  await store.nextTurn();
  const after = JSON.parse(store.getFullJSON());
  const afterClock = after.extensions?.v5?.gameClock;
  assert.equal(afterClock.revision, beforeClock.revision + 1);
  assert.equal(afterClock.campaignSeconds, beforeClock.campaignSeconds,
    'changer de Tour dans le même Round ne fait pas passer dix secondes');
  assert.deepEqual(afterClock.combat, {
    sceneId: null, round: after.combat.round,
    turnIndex: after.extensions?.v5?.turnIndex,
    currentActorId: after.combat.currentActorId
  }, 'le snapshot clock suit la position canonique du Store');
  assert.equal(after.combat.currentActorId, 'ally');

  await store.undo();
  const undone = JSON.parse(store.getFullJSON());
  assert.deepEqual(undone.extensions?.v5?.gameClock, beforeClock,
    'Undo restitue la clock avec la position et les couches antérieures');
  assert.deepEqual(undone.combat, before.combat);
  await store.redo();
  const redone = JSON.parse(store.getFullJSON());
  assert.deepEqual(redone.extensions?.v5?.gameClock, afterClock,
    'Redo réapplique le reçu persistant sans lire l’horloge système');
  assert.deepEqual(redone.combat, after.combat);
});

test('E5 indépendant — un refus IDB ne publie pas une clock avancée sans la transition de combat', async () => {
  const persistence = memoryPersistence();
  const store = await fixture({ persistence });
  const before = JSON.parse(store.getFullJSON());
  const canUndoBefore = store.canUndo();
  persistence.setRefuse(true);
  const result = await store.nextTurn();
  assert.equal(result?.ok, false, 'la persistance atomique peut refuser la transition');
  const after = JSON.parse(store.getFullJSON());
  assert.deepEqual(after.extensions?.v5?.gameClock, before.extensions?.v5?.gameClock);
  assert.deepEqual(after.combat, before.combat);
  assert.equal(store.canUndo(), canUndoBefore, 'un commit refusé ne modifie pas l’historique Undo');
});
