import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preparedActionRows, actionBarModel } from '../../../js/ui/workspace/plateau.js';

// Refonte de l'interface, lot E4a : la barre du bas porte les actions préparées de l'acteur puis « ce qu'il peut faire d'ici »,
// sans numéro ni raccourci ; la cible se choisit au cartouche des mêlées, jamais par la barre des actions préparées.
const actor = { id: 'g', name: 'Gor 1', zone: 'active', camp: 'ennemi', caracs: { F: 40, E: 40 } };
const actions = [
  { id: 'hand-weapon', type: 'attack', attr: 'CC', name: 'Hand Weapon', base: 45, damage: { base: 'BF', modifier: 4 }, qualities: [] },
  { id: 'bow', type: 'attack', attr: 'CT', name: 'Shortbow', base: 35, qualities: [] },
  { id: 'spell-1', type: 'cast', attr: 'FM', name: 'Sort' },
  { id: 'activate:overcome-fear', type: 'skill', attr: 'FM', name: 'Surmonter la Peur' }
];
const keys = actions.map((action, index) => action.id || `index-${index}`);

test('actions préparées : une entrée par arme ou test, sans magie ni Peur (elles ont leur propre entrée)', () => {
  const rows = preparedActionRows({ actor, actions, actionKeys: keys, selectedKey: 'bow' });
  assert.deepEqual(rows.map(row => row.label), ['Hand Weapon', 'Shortbow']);
  assert.ok(rows.every(row => row.group === 'actor'));
  assert.equal(rows.find(row => row.label === 'Shortbow').pressed, true);
  assert.equal(rows.find(row => row.label === 'Hand Weapon').pressed, false);
  assert.match(rows[0].consequence, /CC 45/);
});

test('actions préparées : un clic choisit l’action sans toucher à la cible', () => {
  const [first] = preparedActionRows({ actor, actions, actionKeys: keys });
  const calls = [];
  first.run({ select: patch => calls.push(patch) });
  assert.deepEqual(calls, [{ actionKey: 'hand-weapon' }]);
});

test('actions préparées : aucune action, aucune entrée', () => {
  assert.deepEqual(preparedActionRows({ actor, actions: [], actionKeys: [] }), []);
});

test('barre « d’ici » : se désengager, fuir, charger et autres actions restent proposés, sans numéro', () => {
  const foe = { id: 'e', name: 'Erich', zone: 'active', camp: 'pj' };
  // E4c : « Charger » porte sur la cible choisie par son cartouche (ici Erich).
  const rows = actionBarModel({ actor, active: [actor, foe], actions, actionKeys: keys, targetId: 'e', previewDisengage: () => ({ mode: 'test', bestOpponentId: 'e' }) });
  const labels = rows.map(row => row.label);
  for (const expected of ['Se déplacer', 'Autres actions']) assert.ok(labels.includes(expected), expected);
  assert.ok(labels.some(label => label.startsWith('Charger · ')));
  assert.ok(rows.every(row => !/^\d/.test(row.label)), 'aucun numéro devant un libellé');
  assert.ok(rows.every(row => !('shortcut' in row) && !('key' in row)), 'aucun raccourci clavier');
});

// Passe G, lot G1 (R11, R12) : « Charger » reste enfoncé tant que la charge est déclarée ; « Autres actions » ouvre le menu.
const foe = { id: 'e', name: 'Erich', zone: 'active', camp: 'pj' };
const modelOf = extra => actionBarModel({ actor, active: [actor, foe], actions, actionKeys: keys, targetId: 'e', previewDisengage: () => ({ mode: 'test', bestOpponentId: 'e' }), ...extra });

test('G1-c : « Charger » déclare la charge, puis la retire au second clic (bouton enfoncé)', () => {
  const idle = modelOf({}).find(row => row.id === 'charge-e');
  assert.equal(idle.pressed, false, 'charge non déclarée : bouton relevé');
  const calls = [];
  idle.run({ select: patch => calls.push(patch) });
  assert.equal(calls[0].charging, true);
  const declared = modelOf({ charging: true }).find(row => row.id === 'charge-e');
  assert.equal(declared.pressed, true, 'charge déclarée : bouton enfoncé');
  const undo = [];
  declared.run({ select: patch => undo.push(patch) });
  assert.deepEqual(undo, [{ charging: false }], 'second clic : la charge est retirée, sans changer ni cible ni arme');
});

test('G1-b : « Autres actions » ouvre le menu magie, prière et Test', () => {
  const other = modelOf({}).find(row => row.id === 'other');
  const calls = [];
  other.run({ openOther: () => calls.push('openOther'), focus: () => calls.push('focus') });
  assert.deepEqual(calls, ['openOther']);
});
