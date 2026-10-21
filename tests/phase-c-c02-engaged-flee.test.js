import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import {
  previewV5BrokenEscape,
  previewV5FleeTalentDisengageMove,
  resolveV5PursuitStep
} from '../js/core/v5-broken-escape.js';

function memoryPersistence() {
  let saved = null;
  return {
    async load() {
      return saved ? structuredClone(saved) : null;
    },
    async saveAtomic({ state }) {
      saved = structuredClone(state);
      return { ok: true };
    }
  };
}

function makeActor(id, { camp = 'pj', states = [], talents = [], hasMomentum = false, M = 4, athletics = 55 } = {}) {
  return {
    id,
    name: id,
    kind: camp === 'pj' ? 'PJ' : 'PNJ',
    camp,
    zone: 'active',
    initiative: id === 'runner' ? 50 : 30,
    hp: 15,
    maxHp: 15,
    caracs: { CC: 40, CT: 35, F: 35, E: 35, I: 40, Ag: 40, Dex: 35, Int: 35, FM: 40, Soc: 35, M },
    armor: { head: 0, body: 0, arms: 0, legs: 0 },
    states: structuredClone(states),
    traits: [],
    equipment: [],
    talents: structuredClone(talents),
    prayers: [],
    skills: [
      { id: 'skill-41_74_68_6c_e9_74_69_73_6d_65-base', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: athletics }
    ],
    actions: [{ id: 'sword', type: 'attack', base: 40, damage: 4, note: 'Épée' }],
    extensions: { v5: { hasMomentum } }
  };
}

const brokenLevel = actor =>
  (actor?.states || [])
    .filter(s => ['brise', 'broken'].includes(String(s.key || s.name || '').toLowerCase()))
    .reduce((sum, s) => sum + Number(s.level ?? 1), 0);

test('C02 — Fuite engagée (C0-L06-014) : confirmée avec ennemis engagés donne Élan aux ennemis et +1 Brisé par ennemi engagé, même encerclé', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    combat: {
      round: 1,
      currentActorId: 'runner',
      order: ['runner', 'foe1', 'foe2'],
      participants: [
        makeActor('runner', {
          camp: 'pj',
          hasMomentum: true,
          states: [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }]
        }),
        makeActor('foe1', { camp: 'ennemi', hasMomentum: false }),
        makeActor('foe2', { camp: 'ennemi', hasMomentum: false })
      ]
    },
    diceLines: [],
    log: [],
    extensions: { v5: { turnIndex: 1, combatId: 'c02-engaged-flee' } }
  });

  // Sans confirmation explicite des attaques gratuites / fuite engagée : bloqué
  const blocked = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'flee',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: ['foe1', 'foe2'],
      moveMode: 'run',
      visibleToAnyEnemyAfter: true
    }
  });
  assert.equal(blocked.ready, false);

  // Avec confirmation explicite MJ (foe1 dépense son Élan pour l'attaque gratuite, foe2 conserve son Élan, fuyard encerclé)
  const preview = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'flee',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: ['foe1', 'foe2'],
      engagedEscapeConfirmed: true,
      freeAttacksResolved: true,
      freeAttackSpentMomentumIds: ['foe1'],
      surrounded: true,
      moveMode: 'run',
      visibleToAnyEnemyAfter: true
    }
  });
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.engagedEscapeEffects.addedBrokenCount, 2);
  assert.deepEqual(preview.engagedEscapeEffects.momentumGainedEnemyIds, ['foe1', 'foe2']);
  assert.deepEqual(preview.engagedEscapeEffects.momentumRetainedEnemyIds, ['foe2']);

  const applied = await store.applyBrokenEscape(preview);
  assert.equal(applied.status, 'applied');

  const participants = store.listParticipants();
  const runner = participants.find(p => p.id === 'runner');
  const foe1 = participants.find(p => p.id === 'foe1');
  const foe2 = participants.find(p => p.id === 'foe2');
  assert.equal(brokenLevel(runner), 3, '1 Brisé initial + 2 Brisé pour les 2 ennemis engagés');
  assert.equal(Boolean(runner.extensions?.v5?.hasMomentum), false, 'Acquisition de Brisé retire Élan');
  assert.equal(Boolean(foe1.extensions?.v5?.hasMomentum), false, 'foe1 a dépensé son Élan en attaque gratuite');
  assert.equal(Boolean(foe2.extensions?.v5?.hasMomentum), true, 'foe2 conserve l’Élan gagné lors de la fuite');
});

test('C02 — Talent Fuite ! (C0-L06-025) : exempte le fuyard des États Brisé supplémentaires lors d’une fuite engagée', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    combat: {
      round: 1,
      currentActorId: 'runner',
      order: ['runner', 'foe1'],
      participants: [
        makeActor('runner', {
          camp: 'pj',
          states: [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }],
          talents: [{ id: 'talent-flee', name: 'Fuite !', status: 'resolved', rank: 1 }]
        }),
        makeActor('foe1', { camp: 'ennemi', hasMomentum: false })
      ]
    },
    diceLines: [],
    log: [],
    extensions: { v5: { turnIndex: 1, combatId: 'c02-flee-talent' } }
  });

  const preview = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'flee',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: ['foe1'],
      engagedEscapeConfirmed: true,
      freeAttacksResolved: true,
      moveMode: 'run',
      visibleToAnyEnemyAfter: false
    }
  });
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.engagedEscapeEffects.brokenExempt, true);
  assert.equal(preview.engagedEscapeEffects.addedBrokenCount, 0);

  const applied = await store.applyBrokenEscape(preview);
  assert.equal(applied.status, 'applied');
  const runner = store.listParticipants().find(p => p.id === 'runner');
  assert.equal(brokenLevel(runner), 1, 'Fuite ! empêche l’ajout de Brisé lors de la fuite engagée');
});

test('C02 — Talent Fuite ! (C0-L06-024) : Mouvement supplémentaire en courant après Désengagement confirmé', () => {
  const actorWithFlee = makeActor('runner', {
    M: 4,
    talents: [{ id: 'talent-flee', name: 'Fuite !', status: 'resolved', rank: 1 }]
  });
  const actorWithoutFlee = makeActor('walker', { M: 4 });

  const denied = previewV5FleeTalentDisengageMove({
    actor: actorWithoutFlee,
    disengagedConfirmed: true
  });
  assert.equal(denied.ready, false);

  const missingDisengage = previewV5FleeTalentDisengageMove({
    actor: actorWithFlee,
    disengagedConfirmed: false
  });
  assert.equal(missingDisengage.ready, false);

  const allowed = previewV5FleeTalentDisengageMove({
    actor: actorWithFlee,
    disengagedConfirmed: true
  });
  assert.equal(allowed.ready, true);
  assert.equal(allowed.extraMoveDistance, 16, 'Course = 4 × M (16 yards)');
  assert.equal(allowed.moveMode, 'run');
});

test('C02 — Poursuite V5 (C0-L06-074, C0-L06-023, C0-L06-044) : échelle 1-10, bonus Fuite ! proie et Acharné poursuivant', () => {
  const quarry = makeActor('quarry', {
    athletics: 50,
    talents: [{ id: 'talent-flee', name: 'Fuite !', status: 'resolved', rank: 1 }]
  });
  const pursuer = makeActor('pursuer', {
    athletics: 50,
    talents: [{ id: 'talent-relentless', name: 'Impitoyable', status: 'resolved', rank: 1 }]
  });

  // Proie réussit avec 21 (DR +3 + 1 Fuite ! = +4), poursuivant rate avec 72 (DR -2 + 1 Impitoyable = -1) -> écart +5
  const escaped = resolveV5PursuitStep({
    quarry,
    pursuer,
    initialDistance: 7,
    quarryRoll: 21,
    pursuerRoll: 72
  });
  assert.equal(escaped.ready, true);
  assert.equal(escaped.quarrySlBonus, 1);
  assert.equal(escaped.pursuerSlBonus, 1);
  assert.equal(escaped.nextDistance, 12);
  assert.equal(escaped.outcome, 'escaped', 'Distance > 10 met fin à la poursuite par évasion');

  // Proie rattrapée si distance tombe à 0 ou moins
  const caught = resolveV5PursuitStep({
    quarry: makeActor('slow-quarry', { athletics: 40 }),
    pursuer,
    initialDistance: 2,
    quarryRoll: 85,
    pursuerRoll: 15
  });
  assert.equal(caught.ready, true);
  assert.equal(caught.nextDistance, 0);
  assert.equal(caught.outcome, 'caught');
});
