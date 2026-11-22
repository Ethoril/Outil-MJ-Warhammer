// Passe G, G3-b complété (22/11) : « tout précoché à oui » vaut pour les conditions (portée, regarde, voit, consent…),
// pas pour ce qui décrit la cible : Allié, Mort-vivant, Serviteur de la Ruine et À 0 Blessure se déduisent de sa fiche.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmFactsByDefault } from '../../../js/ui/v5-divine-form-model.js';

const fields = ids => ids.map(field => ({ field }));
const pretre = { id: 'p', kind: 'PJ', camp: 'pj', hp: 12 };
const allie = { id: 'a', kind: 'PNJ', camp: 'allie', hp: 8 };
const orque = { id: 'o', kind: 'PNJ', camp: 'ennemi', hp: 0, species: 'Orque' };
const squelette = { id: 's', kind: 'PNJ', camp: 'ennemi', hp: 5, traits: ['Mort-vivant'] };
const humain = { id: 'h', kind: 'PNJ', camp: 'ennemi', hp: 5, species: 'Humain' };
const faits = ['withinRange', 'lookingAtPriest', 'ally', 'undead', 'ruinServant', 'zeroWounds'];

test('conditions précochées à oui, nature de la cible déduite de sa fiche', () => {
  const form = { facts: {} };
  const targets = [allie, orque, squelette, humain];
  confirmFactsByDefault(form, Object.fromEntries(targets.map(t => [t.id, fields(faits)])), { actor: pretre, targets });
  assert.deepEqual(form.facts.a, { withinRange: 'true', lookingAtPriest: 'true', ally: 'true', undead: 'false', ruinServant: 'false', zeroWounds: 'false' });
  assert.deepEqual(form.facts.o, { withinRange: 'true', lookingAtPriest: 'true', ally: 'false', undead: 'false', ruinServant: 'true', zeroWounds: 'true' });
  assert.equal(form.facts.s.undead, 'true');
  assert.equal(form.facts.s.ally, 'false');
  assert.equal(form.facts.h.ruinServant, 'false');
  assert.equal(form.facts.h.undead, 'false');
});

test('une réponse du MJ n’est jamais écrasée par la déduction', () => {
  const form = { facts: { h: { ruinServant: 'true', ally: 'true' } } };
  confirmFactsByDefault(form, { h: fields(faits) }, { actor: pretre, targets: [humain] });
  assert.equal(form.facts.h.ruinServant, 'true');
  assert.equal(form.facts.h.ally, 'true');
});
