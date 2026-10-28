// Contre-vérification T2 (Claude) : Taille sans pièce touchée, Mortier de main du
// catalogue, qualités conditionnelles V5 du Couteau Bollock, refus de mort limité à un épisode.
import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../js/core/resolution.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { conditionalV5KnifeQualities } from '../js/core/v5-weapon-qualities.js';
import { decideCriticalDeath, updateCriticalDeathCountdown } from '../js/core/v5-critical-aftermath.js';

const mk = (id, camp, extra = {}) => ({ id, name: id, camp, kind: 'PNJ', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 70, CT: 60, F: 40, E: 30, Ag: 40 }, skills: [], states: [], equipment: [], armor: {},
  extensions: { v5: { hasMomentum: false } }, ...extra });

function hackPreview(target, id) {
  const actor = mk('actor', 'allies');
  return previewResolution({ resolutionId: `hack-${id}`, actor, target, baseRevision: 0, round: 1, roll: 54,
    action: { id: 'x', type: 'attack', attr: 'CC', base: 70, damage: 'BF+4', qualities: [{ id: 'taille', parameter: '' }] },
    defense: { type: 'skill', label: 'CC', attr: 'CC', base: 30, roll: 90, qualities: [], v5: { kind: 'melee', context: {} } },
    v5: { kind: 'melee', context: {} }, attackContext: { ranged: false }, v5State: { participants: [actor, target] } });
}

test('Claude T2 — Taille ne bloque pas une touche sans pièce d’armure ni bouclier à la localisation', () => {
  const unarmoured = hackPreview(mk('t', 'foes'), 'none');
  assert.ok(!unarmoured.unresolved.some(line => /Taille/.test(line)), JSON.stringify(unarmoured.unresolved));
  const otherLocation = hackPreview(mk('t', 'foes', { equipment: [{ id: 'H', kind: 'armour', name: 'Calotte',
    category: 'Cuir Souple', ap: 1, locations: ['head'], layer: 'soft', keywords: [] }] }), 'other');
  assert.ok(!otherLocation.unresolved.some(line => /Taille/.test(line)), JSON.stringify(otherLocation.unresolved));
});

test('Claude T2 — Taille exige toujours la pièce frappée quand une pièce couvre la localisation', () => {
  const mail = { id: 'M', kind: 'armour', name: 'Cotte', category: 'Mailles', ap: 2,
    locations: ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'], layer: 'chain', keywords: [] };
  const armoured = hackPreview(mk('t', 'foes', { equipment: [mail] }), 'mail');
  assert.ok(armoured.unresolved.some(line => /Taille : pièce ou bouclier touché requis/.test(line)));
});

test('Claude T2 — le Mortier de main du catalogue explose sur maladresse au rechargement (L13 p.103)', () => {
  const catalogue = getReferenceCatalogue();
  const item = { ...structuredClone(catalogue.items.find(row => row.name === 'Mortier de main (2M)' && row.kind === 'weapon')), id: 'w1', extensions: {} };
  const actor = mk('actor', 'allies', { kind: 'PJ', equipment: [item] });
  const preview = previewResolution({ resolutionId: 'mortar', actor, baseRevision: 0, round: 1, roll: 66,
    action: { id: 'x', type: 'skill', attr: 'CT', base: 20, label: 'Recharge', extensions: { fiche: { equipmentId: 'w1' } } },
    v5: { kind: 'test', context: { reloading: true, fumbleRoll: 3, weaponDamageMaximum: 12 } }, v5State: { participants: [actor] } });
  assert.ok(preview.unresolved.some(line => /bras directeur touché/.test(line)), JSON.stringify(preview.unresolved));
  const resolved = previewResolution({ resolutionId: 'mortar-with-arm', actor, baseRevision: 0, round: 1, roll: 66,
    action: { id: 'x', type: 'skill', attr: 'CT', base: 20, label: 'Recharge', extensions: { fiche: { equipmentId: 'w1' } } },
    v5: { kind: 'test', context: { reloading: true, fumbleRoll: 3, weaponDamageMaximum: 12, weaponExplosionArmSide: 'right' } },
    v5State: { participants: [actor] } });
  assert.ok(resolved.combatFailure?.effects?.some(effect => effect.type === 'weapon-explosion' && effect.damage === 12 && effect.armSide === 'right'),
    JSON.stringify(resolved.combatFailure?.effects));
});

test('Claude T2 — le Couteau Bollock gagne Pointue V5 (pas Précise V4) contre une cible À Terre', () => {
  const ids = rows => rows.map(row => typeof row === 'string' ? row : row.id).sort();
  const base = [{ id: 'perforante' }, { id: 'empaleuse' }, { id: 'pointue' }];
  assert.deepEqual(ids(conditionalV5KnifeQualities({ qualities: base, targetProne: true }).qualities), ['empaleuse', 'perforante', 'pointue']);
  assert.deepEqual(ids(conditionalV5KnifeQualities({ qualities: base }).qualities), ['perforante']);
});

test('Claude T2 — un refus de mort ne vaut que pour un épisode : un nouvel Inconscient rouvre le décompte', () => {
  let p = { id: 'p', name: 'p', kind: 'PJ', hp: 0, caracs: { E: 20 }, states: [{ id: 'u', key: 'inconscient', name: 'Inconscient', level: 1 }],
    extensions: { v5: { criticalWounds: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] } } };
  p = updateCriticalDeathCountdown(p, { round: 1, toughnessBonus: 2 }).participant;
  p = updateCriticalDeathCountdown(p, { round: 3, toughnessBonus: 2 }).participant;
  const declined = decideCriticalDeath(p, { decision: 'decline', round: 3 });
  assert.equal(declined.participant.extensions.v5.dead, undefined);
  p = declined.participant;
  assert.equal(updateCriticalDeathCountdown(p, { round: 4, toughnessBonus: 2 }).status, 'declined', 'même épisode : refus maintenu');
  p = { ...p, extensions: { v5: { ...p.extensions.v5, criticalWounds: [{ id: 'a' }, { id: 'b' }] } } };
  p = updateCriticalDeathCountdown(p, { round: 5, toughnessBonus: 2 }).participant;
  p = { ...p, extensions: { v5: { ...p.extensions.v5, criticalWounds: [{ id: 'a' }, { id: 'b' }, { id: 'n1' }] } } };
  const second = updateCriticalDeathCountdown(p, { round: 20, toughnessBonus: 2 });
  assert.equal(second.status, 'countdown');
  assert.equal(second.participant.extensions.v5.dead, undefined);
});
