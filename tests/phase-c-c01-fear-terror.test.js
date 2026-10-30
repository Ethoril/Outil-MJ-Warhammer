import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { withMomentum } from '../js/core/v5-combat-rules.js';
import {
  previewGenericFearEncounter,
  previewGenericTerrorEncounter,
  resolveGenericTerrorTest,
  resolveGenericFearTest
} from '../js/core/v5-talent-psychology.js';

const owned = (id, rank = 1, specialization) => ({
  id: 'talent-' + id,
  status: 'resolved',
  rank,
  ...(specialization ? { specialization } : {})
});
const skill = (name) => getReferenceCatalogue().skills.find((s) => s.nom === name).id;

const subject = (id, talents = [], extra = {}) => ({
  id,
  name: id,
  kind: 'PJ',
  camp: id === 'a' ? 'pj' : 'ennemi',
  hp: 40,
  maxHp: 40,
  zone: 'active',
  caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, FM: 40, Soc: 60, Int: 60 },
  talents,
  states: [],
  traits: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: false } },
  ...extra
});

async function setup(talents = [], defenderTalents = [], extra = {}) {
  let saved = null;
  const persistence = {
    load: async () => structuredClone(saved),
    saveAtomic: async ({ state }) => {
      saved = structuredClone(state);
      return { ok: true };
    }
  };
  const store = createStore({ persistence });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    extensions: { v5: { combatId: 'c01-encounter', turnIndex: 1 } },
    combat: {
      round: 1,
      currentActorId: 'a',
      order: ['a', 'b'],
      participants: [subject('a', talents, extra.actor), subject('b', defenderTalents, extra.target)]
    },
    diceLines: [],
    log: []
  });
  return { store, persistence };
}

test('C01 — Peur générique (Q01) : seuil atteindre (DR >= indice), allié connu exempt, perte de gain d’Élan et Avantage adverse', async () => {
  const author = subject('b', [], { camp: 'ennemi' });
  const victim = subject('a', [], { camp: 'pj' });

  // Allié connu exempt (C0-L06-002)
  const allyAttempt = previewGenericFearEncounter({
    author: { ...author, camp: 'pj' },
    target: victim,
    rating: 2,
    knownAlly: true,
    encounterId: 'c01-encounter'
  });
  assert.equal(allyAttempt.ready, true);
  assert.equal(allyAttempt.exempt, true);
  assert.equal(allyAttempt.addedStates.length, 0);

  // Source hostile de Peur (2) (C0-L06-002, C0-L06-032)
  const posed = previewGenericFearEncounter({
    author,
    target: victim,
    rating: 2,
    sourceLabel: 'Trait Peur (2)',
    encounterId: 'c01-encounter'
  });
  assert.equal(posed.ready, true);
  assert.equal(posed.addedStates.length, 1);
  const activeVictim = { ...victim, states: [...posed.addedStates] };

  // Conséquence Peur (C0-L06-003) : pas de gain d’Élan
  assert.equal(withMomentum(activeVictim, true).extensions.v5.hasMomentum, false);

  // Test étendu de Calme : +1 DR (total 1 < 2) ne surmonte pas encore Peur (2), mais cumule 1 DR
  const step1 = resolveGenericFearTest({
    actor: activeVictim,
    fearEffectId: posed.addedStates[0].id,
    test: { success: true, sl: 1 },
    round: 1
  });
  assert.equal(step1.ready, true);
  assert.equal(step1.overcome, false);
  assert.equal(step1.participant.states[0].successes, 1);

  // Même Round : une seule tentative par Round (C0-L06-002)
  const sameRound = resolveGenericFearTest({
    actor: step1.participant,
    fearEffectId: posed.addedStates[0].id,
    test: { success: true, sl: 1 },
    round: 1
  });
  assert.equal(sameRound.ready, false);
  assert.match(sameRound.error, /Round/i);

  // Round 2 : +1 DR supplémentaire atteint l’indice 2 (total 2 >= 2, Q01 « atteindre » sans devoir dépasser)
  const step2 = resolveGenericFearTest({
    actor: step1.participant,
    fearEffectId: posed.addedStates[0].id,
    test: { success: true, sl: 1 },
    round: 2
  });
  assert.equal(step2.ready, true);
  assert.equal(step2.overcome, true);
  assert.equal(step2.participant.states[0].key, 'fear-overcome');
  assert.equal(withMomentum(step2.participant, true).extensions.v5.hasMomentum, true);
});

test('C01 — Peureux / Afraid (C0-L06-029, C0-L23-005) fonctionne comme Peur (0) surmontée dès 0 DR réussi', () => {
  const source = subject('b', [], { camp: 'ennemi' });
  const victim = subject('a', [], { camp: 'pj', traits: ['Peureux (Feu)'] });

  const posed = previewGenericFearEncounter({
    author: source,
    target: victim,
    rating: 0,
    sourceKind: 'afraid',
    sourceLabel: 'Peureux (Feu)',
    encounterId: 'c01-encounter'
  });
  assert.equal(posed.ready, true);
  assert.equal(posed.addedStates[0].rating, 0);
  const activeVictim = { ...victim, states: [...posed.addedStates] };
  assert.equal(withMomentum(activeVictim, true).extensions.v5.hasMomentum, false);

  const resolved = resolveGenericFearTest({
    actor: activeVictim,
    fearEffectId: posed.addedStates[0].id,
    test: { success: true, sl: 0 },
    round: 1
  });
  assert.equal(resolved.ready, true);
  assert.equal(resolved.overcome, true);
});

test('C01 — Terreur générique (Q02, C0-L06-004, C0-L06-005, C0-L06-039) : indice + DR négatifs après le premier en Brisé, puis Peur de même indice', () => {
  const monster = subject('b', [], { camp: 'ennemi' });
  const victim = subject('a', [], { camp: 'pj' });

  const posed = previewGenericTerrorEncounter({
    author: monster,
    target: victim,
    rating: 3,
    sourceLabel: 'Trait Terreur (3)',
    encounterId: 'c01-encounter'
  });
  assert.equal(posed.ready, true);
  assert.equal(posed.addedStates[0].key, 'terror-of-talent');
  assert.equal(posed.addedStates[0].rating, 3);

  const activeVictim = { ...victim, states: [...posed.addedStates] };

  // Échec avec -4 DR : 3 (indice) + max(0, 4 - 1) = 6 États Brisé (Q02), plus suivi en Peur (3) (C0-L06-005)
  const failed = resolveGenericTerrorTest({
    actor: activeVictim,
    terrorEffectId: posed.addedStates[0].id,
    test: { success: false, sl: -4 },
    encounterId: 'c01-encounter'
  });
  assert.equal(failed.ready, true);
  assert.equal(failed.brokenAdded, 6);
  const brokenLevel = failed.participant.states
    .filter((s) => s.key === 'brise')
    .reduce((sum, s) => sum + (s.level || 1), 0);
  assert.equal(brokenLevel, 6);
  const followUpFear = failed.participant.states.find((s) => s.key === 'fear-of-talent');
  assert.ok(followUpFear, 'la source de Terreur cause ensuite Peur de même indice');
  assert.equal(followUpFear.rating, 3);

  // Réussite initiale contre Terreur : immunité à toute Terreur de la rencontre + suivi en Peur (3)
  const passed = resolveGenericTerrorTest({
    actor: activeVictim,
    terrorEffectId: posed.addedStates[0].id,
    test: { success: true, sl: 0 },
    encounterId: 'c01-encounter'
  });
  assert.equal(passed.ready, true);
  assert.equal(passed.brokenAdded, 0);
  assert.ok(passed.participant.states.some((s) => s.key === 'terror-immunity'));
  assert.ok(passed.participant.states.some((s) => s.key === 'fear-of-talent' && s.rating === 3));

  // Nouvelle source de Terreur (4) dans la même rencontre : dégradée directement en Peur (4) grâce à l’immunité de rencontre
  const secondTerror = previewGenericTerrorEncounter({
    author: subject('c', [], { camp: 'ennemi' }),
    target: passed.participant,
    rating: 4,
    sourceLabel: 'Faille du Chaos (Terreur 4)',
    encounterId: 'c01-encounter'
  });
  assert.equal(secondTerror.ready, true);
  assert.equal(secondTerror.downgradedToFear, true);
  assert.equal(secondTerror.addedStates[0].key, 'fear-of-talent');
  assert.equal(secondTerror.addedStates[0].rating, 4);
});

test('C01 — Q03, Q04, Q08, Q13, Q19 : Effrayant distinct (par Tour), Petit préservé, Taille V5 sans Terreur automatique, et indices non chiffrés bloqués sans saisie MJ', async () => {
  const author = subject('b', [], { camp: 'ennemi' });
  const victim = subject('a', [], { camp: 'pj' });

  // Source non chiffrée (Cry of War C0-L09-008, Masque mortuaire C0-L06-051, Givre d'Ulric C0-L06-055, Arche noire C0-L09-001) : refuse sans indice MJ (Q13, Q19)
  const missingFearRating = previewGenericFearEncounter({
    author,
    target: victim,
    rating: undefined,
    sourceId: 'C0-L06-051',
    sourceLabel: 'Masque mortuaire',
    encounterId: 'c01-encounter'
  });
  assert.equal(missingFearRating.ready, false);
  assert.ok(missingFearRating.needsInput.some((n) => n.field === 'rating'));

  const missingTerrorRating = previewGenericTerrorEncounter({
    author,
    target: victim,
    rating: null,
    sourceId: 'C0-L09-008',
    sourceLabel: 'Cry of War',
    encounterId: 'c01-encounter'
  });
  assert.equal(missingTerrorRating.ready, false);
  assert.ok(missingTerrorRating.needsInput.some((n) => n.field === 'rating'));

  // Taille V5 générique sans homebrew Petit (C0-L06-036, Q04, Q08) : 2 écarts de taille causent Peur (2) (V5 v3), pas Terreur
  const sizeFearV5 = previewGenericFearEncounter({
    author,
    target: victim,
    sourceKind: 'v5-size',
    actorSize: 5,
    targetSize: 3,
    aggressive: true,
    encounterId: 'c01-encounter'
  });
  assert.equal(sizeFearV5.ready, true);
  assert.equal(sizeFearV5.addedStates[0].key, 'fear-of-talent');
  assert.equal(sizeFearV5.addedStates[0].rating, 2, 'V5 v3 p.360 : Peur (2)');

  // Masque mortuaire (C0-L06-051) avec indice MJ saisi : affecte même un mort-vivant grâce à ignoreUndeadImmunity
  const undeadTarget = subject('u', [], { camp: 'ennemi', traits: ['Mort-vivant', 'Immunité à la Psychologie'] });
  const normalFearOnUndead = previewGenericFearEncounter({
    author: victim,
    target: undeadTarget,
    rating: 2,
    encounterId: 'c01-encounter'
  });
  assert.equal(normalFearOnUndead.exempt, true);

  const deathsHeadFear = previewGenericFearEncounter({
    author: victim,
    target: undeadTarget,
    rating: 2,
    sourceId: 'C0-L06-051',
    ignoreUndeadImmunity: true,
    encounterId: 'c01-encounter'
  });
  assert.equal(deathsHeadFear.ready, true);
  assert.equal(deathsHeadFear.exempt, false);
  assert.equal(deathsHeadFear.addedStates.length, 1);
});
