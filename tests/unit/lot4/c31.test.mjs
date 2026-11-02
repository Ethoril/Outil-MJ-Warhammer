// Lot 4 · C31 (G-ARM-6) : maladresse 99/55 au pistolet à poudre, d10 de poudre = 2 → « l'arme ne tire pas ».
// Une arme qui ne tire pas ne peut infliger aucun dégât. Si la défense rate encore plus (opposition gagnée par l'attaquant
// malgré son échec), l'aperçu propose pourtant 7 dégâts à la cible.
// Phase de reproduction : échoue aujourd'hui (resolution.js : le raté d'arme n'annule ni hit ni damage quand l'opposition est gagnée).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../../../js/core/resolution.js';

const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'tireur' ? 'pj' : 'ennemi', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 55, F: 30, E: 30, I: 40, Ag: 30 }, skills: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const pistolet = { id: 'gun-1', name: 'Pistolet', kind: 'weapon', category: 'Poudre noire', damage: 7, keywords: [{ id: 'a-poudre-noire' }, { id: 'pistolet' }] };
const shoot = ({ defenseRoll, powderIncidentRoll }) => previewResolution({
  actor: fighter('tireur', { equipment: [pistolet] }), target: fighter('horse'), round: 1, baseRevision: 0, roll: 99,
  action: { type: 'attack', attr: 'CT', base: 55, damage: 7, note: pistolet.name, extensions: { fiche: { equipmentId: pistolet.id } }, qualities: ['a-poudre-noire', 'pistolet'] },
  ...(defenseRoll ? { defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 30, roll: defenseRoll, v5: { kind: 'test', choice: 'keep', context: {} } } } : {}),
  v5: { kind: 'ranged', context: { powderIncidentRoll } } });

describe('C31 raté d’arme à poudre', () => {
  test('d10 2 : l’aperçu annonce que l’arme ne tire pas', () => {
    const preview = shoot({ powderIncidentRoll: 2 });
    assert.equal(preview.combatFailure.misfire.outcome.id, 'misfire');
    assert.ok(preview.combatFailure.effects.some(effect => effect.type === 'weapon-misfire' && effect.reloadRequired === true));
  });

  test('sans défense saisie : aucun dégât proposé (contrôle)', () => {
    const preview = shoot({ powderIncidentRoll: 2 });
    assert.equal(preview.damage, null);
    assert.equal(preview.hit, false);
  });

  test('défense ratée plus gravement (100) : l’attaquant gagne l’opposition mais l’arme ne tire pas, donc aucun dégât ni touche', () => {
    const preview = shoot({ powderIncidentRoll: 2, defenseRoll: 100 });
    assert.equal(preview.combatFailure.misfire.outcome.id, 'misfire');
    assert.equal(preview.damage, null, `dégâts proposés : ${preview.damage?.finalDamage}`);
    assert.equal(preview.hit, false);
  });

  test('contrôle : sans maladresse (jet 40 réussi), l’opposition gagnée garde touche et dégâts', () => {
    // Sans maladresse de poudre (jet 40 réussi), la touche et ses dégâts restent proposés.
    const ok = previewResolution({ actor: fighter('tireur', { equipment: [pistolet] }), target: fighter('horse'), round: 1, baseRevision: 0, roll: 40,
      action: { type: 'attack', attr: 'CT', base: 55, damage: 7, note: pistolet.name, extensions: { fiche: { equipmentId: pistolet.id } }, qualities: ['a-poudre-noire', 'pistolet'] },
      defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 30, roll: 100, v5: { kind: 'test', choice: 'keep', context: {} } }, v5: { kind: 'ranged', context: {} } });
    assert.equal(ok.hit, true);
    assert.ok(ok.damage);
  });
});
