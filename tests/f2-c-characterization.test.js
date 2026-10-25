import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution, applyResolution } from '../js/core/resolution.js';
import { conjuredWeaponSkillScore } from '../js/core/equipment.js';
import { suggestSkill } from '../js/core/fiche-sync.js';

const target = { id: 'target', hp: 20, caracs: { E: 30 }, states: [] };
const ficheWeapon = {
  id: 'sword-instance', kind: 'weapon', name: 'Épée de fiche', category: 'Arme de base',
  damage: '4', range: '', keywords: [{ id: 'desequilibree', parameter: '' }]
};

test('F2-C caractérisation — la compétence proposée reste confirmable sur une arme de fiche', () => {
  const skills = [
    { id: 'melee-basic', name: 'Corps à corps (Base)', total: 61, advances: 1, basic: true },
    { id: 'melee-fencing', name: 'Corps à corps (Escrime)', total: 72, advances: 1, basic: false }
  ];
  const weaponAction = { id: 'attack-sword', type: 'attack', note: 'Épée de fiche', base: 61, damage: 4,
    qualities: ['Déséquilibrée'], extensions: { fiche: {
      charId: 'hero', equipmentId: ficheWeapon.id, skillId: 'melee-basic', skillName: 'Corps à corps (Base)'
    } } };
  const actor = { id: 'hero', states: [], skills, equipment: [ficheWeapon] };
  const sourceSnapshot = structuredClone({ actor, target, weaponAction });

  assert.equal(suggestSkill(weaponAction, skills), 'Corps à corps (Base)');
  const preview = previewResolution({ actor, target, action: weaponAction, roll: 40, baseRevision: 0,
    defense: { type: 'defense', label: 'Esquive', base: 45, roll: 50, v5: { kind: 'test' } } });
  assert.equal(preview.score.base, 61, 'le choix confirmé et son seuil fourni alimentent le test');
  assert.equal(preview.score.target, 61);
  assert.deepEqual(preview.input.action.extensions.fiche, weaponAction.extensions.fiche);
  assert.deepEqual(preview.input.action.qualities.map(q => q.id), ['desequilibree']);
  assert.deepEqual({ actor, target, weaponAction }, sourceSnapshot, 'aperçu sans mutation de la fiche, de l’action ou de la cible');

  const applied = applyResolution(preview, { revision: 0, participants: [structuredClone(target)] });
  assert.equal(applied.status, 'applied');
  assert.deepEqual({ actor, target, weaponAction }, sourceSnapshot, 'application sans mutation des entrées source');
});

test('F2-C caractérisation — une arme conjurée conserve son calcul de compétence et ses qualités propres', () => {
  const actor = {
    id: 'mage', caracs: { CC: 38 }, states: [],
    skills: [{ id: 'fencing', name: 'Corps à corps (Escrime)', total: 67 }]
  };
  const profile = { id: 'foil', name: 'Fleuret aethyrique', damage: 3, hands: 1, reach: 'average', qualities: ['rapide', 'empaleuse'] };
  const conjuredScore = conjuredWeaponSkillScore(actor, profile.id);
  assert.equal(conjuredScore, 67);

  const action = { id: 'conjured-foil', type: 'attack', attr: 'CC', note: profile.name, base: conjuredScore,
    damage: profile.damage, qualities: [...profile.qualities, 'magique'], extensions: { v5: {
      weaponHands: profile.hands, weaponReach: profile.reach, magical: true, materialized: true
    } } };
  const snapshot = structuredClone({ actor, target, action, profile });
  const preview = previewResolution({ actor, target, action, roll: 35, baseRevision: 0 });
  assert.equal(preview.score.base, 67);
  assert.equal(preview.score.target, 67);
  assert.deepEqual(preview.input.action.qualities.map(q => q.id), ['rapide', 'empaleuse', 'magique']);
  assert.deepEqual({ actor, target, action, profile }, snapshot, 'le profil conjuré et ses qualités ne sont pas modifiés');
});
