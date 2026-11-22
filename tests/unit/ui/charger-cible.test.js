import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionBarModel } from '../../../js/ui/workspace/plateau.js';

// Refonte de l'interface, lot E4c (spec S5 ter, CA26-CA27) : « Charger » sur la cible choisie par son cartouche, pour tout
// ennemi non engagé avec l'acteur, quel que soit le nombre d'ennemis (en 3.56.0, quatre ennemis au plus : introuvable).
// Engagé avec un autre adversaire, la charge reste proposée avec la mention de la règle (p. 163) et un clic la force.
const person = (id, camp, extra = {}) => ({ id, name: id.toUpperCase(), zone: 'active', camp, kind: camp === 'pj' ? 'PJ' : 'PNJ', hp: 10, maxHp: 10, states: [], extensions: { v5: {} }, ...extra });
const engage = (a, b) => {
  a.extensions.v5.engagements = { ...(a.extensions.v5.engagements || {}), [b.id]: { since: 1, lastAttackRound: 1 } };
  b.extensions.v5.engagements = { ...(b.extensions.v5.engagements || {}), [a.id]: { since: 1, lastAttackRound: 1 } };
};
const actions = [{ id: 'sword', type: 'attack', attr: 'CC', name: 'Épée', base: 45, qualities: [] }];
const keys = ['sword'];
const bar = (actor, active, targetId) => actionBarModel({ actor, active, actions, actionKeys: keys, targetId, previewDisengage: () => ({ mode: 'test', bestOpponentId: null }) });
const charges = rows => rows.filter(row => row.id === 'charge' || row.id.startsWith('charge-'));

test('CA26 : Charger est proposé pour la cible choisie, même la douzième de douze ennemis libres', () => {
  const actor = person('pj1', 'pj');
  const foes = Array.from({ length: 12 }, (_, index) => person(`e${index + 1}`, 'ennemi'));
  const active = [actor, ...foes];
  for (const foe of foes) {
    const rows = charges(bar(actor, active, foe.id));
    assert.equal(rows.length, 1, `une seule entrée Charger pour ${foe.id}`);
    assert.equal(rows[0].id, `charge-${foe.id}`);
    assert.equal(rows[0].label, `Charger · ${foe.name}`);
    assert.notEqual(rows[0].disabled, true);
    assert.match(rows[0].consequence, /p\. 163/);
  }
});

test('CA26 : un clic charge la cible avec l’arme de mêlée préparée', () => {
  const actor = person('pj1', 'pj'), foe = person('e1', 'ennemi');
  const [row] = charges(bar(actor, [actor, foe], 'e1'));
  const calls = [];
  row.run({ select: patch => calls.push(patch) });
  assert.deepEqual(calls, [{ targetId: 'e1', charging: true, actionKey: 'sword' }]);
});

test('CA27 : engagé avec un autre adversaire, Charger reste proposé, interdit (p. 163), et le clic force la charge', () => {
  const actor = person('pj1', 'pj'), a = person('e1', 'ennemi'), b = person('e2', 'ennemi');
  engage(actor, a);
  const [row] = charges(bar(actor, [actor, a, b], 'e2'));
  assert.equal(row.id, 'charge-e2');
  assert.match(row.consequence, /interdit : déjà engagé \(p\. 163\)/);
  assert.match(row.consequence, /forcer/);
  assert.notEqual(row.disabled, true);
  const calls = [];
  row.run({ select: patch => calls.push(patch) });
  assert.deepEqual(calls, [{ targetId: 'e2', charging: true, actionKey: 'sword' }]);
});

test('cible déjà engagée avec l’acteur, alliée ou absente : Charger grisé, avec la raison', () => {
  const actor = person('pj1', 'pj'), foe = person('e1', 'ennemi'), ally = person('pj2', 'pj');
  engage(actor, foe);
  const engagedRow = charges(bar(actor, [actor, foe, ally], 'e1'));
  assert.equal(engagedRow.length, 1);
  assert.equal(engagedRow[0].disabled, true);
  assert.match(engagedRow[0].consequence, /déjà engagé avec E1/);
  const allyRow = charges(bar(actor, [actor, foe, ally], 'pj2'));
  assert.equal(allyRow[0].disabled, true);
  assert.match(allyRow[0].consequence, /pas un adversaire/);
  const none = charges(bar(actor, [actor, person('e3', 'ennemi')], null));
  assert.equal(none[0].disabled, true);
  assert.match(none[0].consequence, /choisir la cible/);
});

test('sans aucun ennemi : pas d’entrée Charger', () => {
  const actor = person('pj1', 'pj');
  assert.deepEqual(charges(bar(actor, [actor, person('pj2', 'pj')], 'pj2')), []);
});
