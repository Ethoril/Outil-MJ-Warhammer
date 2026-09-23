import test from 'node:test';
import assert from 'node:assert/strict';
import { Participant, DiceLine } from '../js/core/models.js';
import { sanitizeParticipant, parseState } from '../js/core/sanitize.js';
import { computeEndOfTurn } from '../js/core/combat.js';
import { computeDamage } from '../js/core/damage.js';
import { activeEngines } from '../js/core/roll-qualities.js';

test('E06 intégration — Participant et sanitation exposent des états structurés', () => {
  const source = { kind: 'sort', id: 's1' };
  const participant = new Participant({
    id: 'p1', name: 'Cible', hp: 8,
    states: [{ id: 'state-source', name: 'Brisé', level: 2, duration: 3, source }]
  });
  assert.deepEqual(participant.states[0].source, source);
  assert.equal(parseState(participant.states[0]).turns, 3);

  const sanitized = sanitizeParticipant({ id: 'p2', name: 'Legacy', states: ['Sonné|2', { id: 'unknown', name: 'Maison', duration: 4, source }] });
  assert.equal(sanitized.states.length, 2);
  assert.equal(sanitized.states[0].duration, 2);
  assert.equal(sanitized.states[1].source.id, 's1');
});

test('E06 intégration — combat conserve niveaux, durées et sources en fin de tour', () => {
  const participant = new Participant({
    name: 'Renaut', hp: 10, caracs: { E: 35 },
    armor: { head: 2, body: 1, arms: 3, legs: 2 },
    states: [
      { id: 'h1', name: 'Hémorragique', level: 2, duration: 3, source: 'critique' },
      { id: 's1', name: 'Sonné', level: 2, duration: 2, source: { kind: 'talent' } }
    ]
  });
  const result = computeEndOfTurn(participant, 5);
  assert.equal(result.hpDelta, -2);
  assert.deepEqual(result.nextStates.map(state => ({ id: state.id, level: state.level, duration: state.duration, source: state.source })), [
    { id: 'h1', level: 2, duration: 2, source: 'critique' },
    { id: 's1', level: 2, duration: 1, source: { kind: 'talent' } }
  ]);
  assert.equal(participant.states[0].duration, 3, 'le calcul est pur');
});

test('E06 intégration — alias Impact/Percutante n’appliquent qu’un moteur', () => {
  const qualities = [{ id: 'impact', rating: 2 }, { id: 'percutante', rating: 5 }];
  assert.equal(activeEngines(qualities).filter(engine => engine.engine === 'add-units-die').length, 1);
  const damage = computeDamage({ weaponDamage: 4, sl: 2, roll: 35, qualities });
  assert.equal(damage.bonusPercutante, 5);
  assert.deepEqual(damage.activeQualities.map(quality => quality.id), ['percutante']);
  const line = new DiceLine({ qualities });
  assert.deepEqual(line.qualities.map(quality => quality.id), ['percutante']);
});
