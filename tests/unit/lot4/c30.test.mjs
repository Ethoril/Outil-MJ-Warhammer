// Lot 4 · C30 (G-ARM-7) : Entaille 1 (Cimeterre), attaquant avec Élan, « Dépenser 1 Élan » sur une touche sans critique.
// Phase de reproduction : échoue aujourd'hui (js/core/resolution.js:971 teste slash.bleedingConditions<2, qui vaut 0 sans critique,
// et rapporte donc à tort « un Élan disponible est requis » alors que l'attaquant en a un).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../../../js/core/resolution.js';

const q = (id, parameter) => ({ id, ...(parameter ? { parameter } : {}) });
const fighter = (id, { momentum = true } = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'armurier' ? 'pj' : 'ennemi', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CC: 60, F: 30, E: 30, I: 40, Ag: 30 }, skills: [], states: [], equipment: [], extensions: { v5: { hasMomentum: momentum } } });
const cimeterre = (roll, { spend, momentum = true, critical = false } = {}) => previewResolution({
  actor: fighter('armurier', { momentum }), target: fighter('troll', { momentum: false }), round: 1, baseRevision: 0, roll,
  action: { type: 'attack', attr: 'CC', base: 55, damage: 4, qualities: [q('entaille', '1')] }, attackContext: { ranged: false },
  defense: { type: 'skill', label: 'Corps à corps', attr: 'CC', base: 30, roll: 61, v5: { kind: 'melee', context: {} } },
  ...(critical ? { criticalRolls: { location: 45, effect: 80 } } : {}),
  v5: { kind: 'melee', context: { entailleMomentumSpend: spend } } });
const blockedForMomentum = preview => preview.unresolved.filter(row => /Entaille/.test(row));

describe('C30 Entaille : Élan', () => {
  test('touche 35/55 contre 61/30 sans critique, Élan disponible, « Dépenser 1 Élan » : ne prétend pas qu’aucun Élan n’est disponible', () => {
    const preview = cimeterre(35, { spend: 1 });
    assert.equal(preview.hit, true);
    assert.equal(preview.critical ? true : false, false, 'précondition : pas de critique');
    assert.deepEqual(blockedForMomentum(preview).filter(row => /Élan disponible est requis/.test(row)), []);
  });

  test('sans critique, l’Élan n’est pas annoncé comme dépensé par Entaille (rien à aggraver)', () => {
    const preview = cimeterre(35, { spend: 1 });
    const actor = preview.momentum.find(row => row.participantId === 'armurier');
    assert.equal(actor.after, true, `Élan annoncé ${actor.before} → ${actor.after}`);
  });

  test('contrôle : sans Élan, avec critique, dépenser 1 Élan reste refusé', () => {
    const preview = cimeterre(11, { spend: 1, momentum: false, critical: true });
    assert.ok(blockedForMomentum(preview).some(row => /Élan disponible est requis/.test(row)));
  });

  test('contrôle : avec Élan et critique, dépenser 1 Élan donne 2 Hémorragiques sans blocage', () => {
    const preview = cimeterre(11, { spend: 1, critical: true });
    assert.deepEqual(blockedForMomentum(preview), []);
    assert.equal(preview.slash.bleedingConditions, 2);
  });

  test('contrôle : sans dépense, la touche sans critique n’est pas bloquée', () => {
    assert.deepEqual(blockedForMomentum(cimeterre(35, { spend: 0 })), []);
  });
});
