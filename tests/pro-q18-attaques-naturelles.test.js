import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { planNaturalAttack } from '../js/core/creature-combat.js';
import { planCreatureMagic } from '../js/core/creature-magic.js';

// Q18 : l'attaque naturelle choisie (v5.context.naturalAttack, posée par la liste « Attaque naturelle » du panneau de Résolution)
// est appliquée par la résolution : dégâts calculés du Trait, états de la touche, rappels. Livre de base V5 pp.357 (Souffle), 362 (Langue).
const clone = value => structuredClone(value);
const base = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: id === 'beast' ? 'ennemi' : 'pj', zone: 'active', initiative: id === 'beast' ? 60 : 30, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 60, F: 50, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true } }, ...extra });
async function fixture(traits) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'],
    participants: [base('beast', { traits }), base('hero')] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'q18' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const hero = store => store.listParticipants().find(p => p.id === 'hero');
const attack = (naturalAttack, extra = {}) => ({ resolutionId: 'q18-' + naturalAttack, actorId: 'beast', targetId: 'hero', roll: 10,
  action: { type: 'attack', base: 60, attr: 'CT', damage: 0 }, defense: { base: 10, roll: 99, v5: { kind: 'ranged' } },
  v5: { kind: 'ranged', context: { naturalAttack }, ...extra } });

test('Q18 Langue qui touche : cible Enchevêtrée, quelle que soit la Taille', async () => {
  const store = await fixture(['Tongue']);
  const preview = store.previewResolution(attack('tongue', { actorSize: 2, targetSize: 4 }));
  assert.equal(preview.hit ?? preview.success, true);
  assert.ok(preview.targetConditionApplication.some(s => s.key === 'enchevetre'), 'Enchevêtré proposé même si la cible est plus grande');
  assert.ok(preview.reminders.some(r => /n'est pas plus petite|pas attirée/.test(r)), 'la Taille ne décide que de l’attirance');
});

test('Q18 Langue : cible plus petite, rappel d’attirance', async () => {
  const store = await fixture(['Tongue']);
  const preview = store.previewResolution(attack('tongue', { actorSize: 4, targetSize: 2 }));
  assert.ok(preview.targetConditionApplication.some(s => s.key === 'enchevetre'));
  assert.ok(preview.reminders.some(r => /attirée au contact/.test(r)));
});

test('Q18 Souffle de feu : dégâts BF+3 et Enflammé appliqués à la cible', async () => {
  const store = await fixture(['Breath (Fire)']);
  const preview = store.previewResolution({ ...attack('breath'), defense: undefined });
  const plain = store.previewResolution({ ...attack('none'), defense: undefined, resolutionId: 'q18-plain', action: { type: 'attack', base: 60, attr: 'CT', damage: 8 }, v5: { kind: 'ranged' } });
  assert.equal(preview.damage.finalDamage, plain.damage.finalDamage, 'mêmes dégâts qu’une arme fixe de BF 5 + 3 = 8');
  assert.ok(preview.targetConditionApplication.some(s => s.key === 'enflamme'));
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.ok(hero(store).states.some(s => s.key === 'enflamme'), 'la cible est Enflammée');
  assert.equal(hero(store).hp, 40 - preview.damage.finalDamage);
});

test('Q18 Souffle de type absent du livre de base : non résolu, jamais disponible sans effet', () => {
  for (const type of ['Corrosion', 'Warpfire', 'Slime', 'Soporific', 'Nightmares']) {
    const plan = planNaturalAttack({ traits: [`Breath (${type})`], caracs: { F: 50, E: 30 } }, 'breath');
    assert.equal(plan.available, false, type);
    assert.match(plan.unresolved.join(' '), new RegExp(type));
  }
  assert.equal(planNaturalAttack({ traits: ['Breath (Cold)'], caracs: { F: 50, E: 30 } }, 'breath').available, true);
});

test('Q18 Souffle : le préavis bloque l’application tant que le type est inconnu', async () => {
  const store = await fixture(['Breath (Slime)']);
  const preview = store.previewResolution(attack('breath'));
  assert.ok(preview.unresolved.some(text => /Slime/.test(text)));
});

test('Q18 Dressé à plusieurs compétences : un effet par compétence', () => {
  const plan = planCreatureMagic({ traits: ['Trained (Drive, Fetch)'] }, 'trained');
  assert.deepEqual(plan.effects.filter(e => e.trainedSkill).map(e => e.trainedSkill), ['Conduite', 'Rapporter']);
  assert.deepEqual(plan.effects.filter(e => e.trainedEffect).map(e => e.trainedEffect.skill), ['Conduite', 'Rapporter']);
  const one = planCreatureMagic({ traits: ['Trained (Drive, Fetch)'] }, 'trained', { skill: 'Fetch' });
  assert.deepEqual(one.effects.filter(e => e.trainedSkill).map(e => e.trainedSkill), ['Rapporter']);
});

test('Q18 interface : la liste « Attaque naturelle » du panneau pose v5.context.naturalAttack', () => {
  const source = readFileSync(new URL('../js/ui/resolution-panel.js', import.meta.url), 'utf8');
  assert.match(source, /naturalCombatTraits\(actor\)/);
  assert.match(source, /naturalAttack: select\.value \|\| undefined/);
});
