import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EFFECT_MODES,
  advanceEndOfTurn,
  getEffectCapability,
  normalizeEffects
} from '../js/core/effects.js';
import { canonicalQualityId, normalizeQualities } from '../js/core/quality-normalization.js';

test('E06 états — chaînes historiques deviennent des objets distincts', () => {
  const legacy = ['Hémorragique|3', 'Hémorragique', 'Sonné|1'];
  const normalized = normalizeEffects(legacy);
  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].name, 'Hémorragique');
  assert.equal(normalized[0].level, 1);
  assert.equal(normalized[0].duration, 3);
  assert.equal(normalized[1].duration, null);
  assert.notEqual(normalized[0].id, normalized[1].id);
  assert.equal(normalized[2].duration, 1);
  assert.deepEqual(normalizeEffects(legacy).map(state => state.id), normalized.map(state => state.id));
});

test('E06 états — objets modernes conservent niveaux, durée, source et paramètres', () => {
  const source = [{
    id: 'effect-1', key: 'enflamme', name: 'Enflammé', level: 2, duration: 4,
    source: { kind: 'spell', id: 'spell-7' }, parameters: { color: 'blue' }
  }, { id: 'effect-2', name: 'Enflammé', level: 1, duration: 2, source: 'torch' }];
  const normalized = normalizeEffects(source);
  assert.equal(normalized[0].key, 'enflamme');
  assert.equal(normalized[0].level, 2);
  assert.equal(normalized[0].duration, 4);
  assert.deepEqual(normalized[0].source, source[0].source);
  assert.deepEqual(normalized[0].parameters, source[0].parameters);
  assert.equal(normalized[1].name, source[1].name);
  assert.equal(normalized[1].duration, source[1].duration);
  assert.notEqual(normalized[0].id, normalized[1].id);
  normalized[0].source.kind = 'changed';
  assert.equal(source[0].source.kind, 'spell', 'normalisation profonde et sans mutation');
});

test('E06 états — fin de tour conserve la convention hémorragie/flammes/Surpris', () => {
  const participant = {
    name: 'Renaut', hp: 10,
    caracs: { E: 35 }, armor: { head: 2, body: 1, arms: 3, legs: 2 },
    states: ['Hémorragique', 'Hémorragique|3', 'Enflammé', 'Enflammé|2', 'Surpris', 'Sonné|2', 'Aveuglé|1']
  };
  const before = structuredClone(participant);
  const result = advanceEndOfTurn(participant, { d10Roll: 5 });
  assert.equal(result.hpDelta, -5, 'hémorragie -2, flammes 5-3-1+2 = 3');
  assert.equal(result.newHp, 5);
  assert.deepEqual(result.nextStates.map(state => [state.name, state.duration]), [
    ['Hémorragique', null], ['Hémorragique', 2],
    ['Enflammé', null], ['Enflammé', 1], ['Sonné', 1]
  ]);
  assert.equal(participant.states[0], before.states[0]);
  assert.match(result.logs.join('\n'), /Surpris.*dissipé/);
});

test('E06 états — échéance et source restent présentes pendant décrémentation', () => {
  const result = advanceEndOfTurn({
    hp: 8, states: [{ id: 's', name: 'Brisé', level: 2, duration: 3, expiresAt: 'round:4', source: 'critique' }]
  });
  assert.equal(result.nextStates[0].level, 2);
  assert.equal(result.nextStates[0].duration, 2);
  assert.equal(result.nextStates[0].expiresAt, 'round:4');
  assert.equal(result.nextStates[0].source, 'critique');
});

test('E06 états — niveaux et jet injecté restent dans des bornes déterministes', () => {
  const normalized = normalizeEffects([{ name: 'Enflammé', level: 0.5, duration: 2 }]);
  assert.equal(normalized[0].level, 1);
  const high = advanceEndOfTurn({ hp: 10, caracs: { E: 0 }, armor: {}, states: ['Enflammé'] }, { d10Roll: 99 });
  const nonFinite = advanceEndOfTurn({ hp: 10, caracs: { E: 0 }, armor: {}, states: ['Enflammé'] }, { d10Roll: Infinity });
  assert.equal(high.hpDelta, -11, '99 est borné à 10, puis le niveau est ajouté');
  assert.equal(nonFinite.hpDelta, -2, 'Infinity est replié au minimum 1, puis le niveau est ajouté');
});

test('E06 capacités — automatique, rappel et manuel restent distincts', () => {
  assert.equal(getEffectCapability('Hémorragique').mode, EFFECT_MODES.AUTOMATIC);
  assert.equal(getEffectCapability('Enflammé').trigger, 'endOfTurn');
  assert.equal(getEffectCapability('Sonné').mode, EFFECT_MODES.REMINDER);
  const unknown = getEffectCapability({ name: 'Effet inconnu', source: 'table' });
  assert.equal(unknown.mode, EFFECT_MODES.MANUAL);
  assert.equal(unknown.known, false);
});

test('E06 qualités — aliases canonisés et doublons supprimés avant moteur', () => {
  assert.equal(canonicalQualityId('Impact'), 'percutante');
  const normalized = normalizeQualities([
    { id: 'impact', rating: 2 }, { id: 'Percutante', rating: 5 },
    'Pointue', 'pointue', 'Qualité éditoriale', 'qualite-editoriale'
  ]);
  assert.deepEqual(normalized.map(quality => quality.id), [
    'percutante', 'pointue', 'qualite-editoriale'
  ]);
  assert.equal(normalized[0].rating, 2, 'la première occurrence porte les métadonnées');
});
