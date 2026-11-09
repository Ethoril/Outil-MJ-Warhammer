// Q6 · T7 (docs/specs/tests-secondaires-agregateur/) : Tests de sorts au fil des tours (v5-magic-turn.js) et Test de Corruption
// de l'attribut de Tzeentch (v5-magic-attributes.js) passent par le calcul commun ; CA1, CA3, CA8, CA9, CA14.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { previewV5Test, selectV5Test } from '../../../js/core/v5-roll.js';
import { spellTurnTest, roundSpellEffects, previewSpellInteraction, randomVortexStep } from '../../../js/core/v5-magic-turn.js';
import { previewLoreAttribute } from '../../../js/core/v5-magic-attributes.js';
import { getAllSpellContracts } from '../../../js/core/v5-spell-contracts.js';

const state = (key, name, level = 1) => ({ id: 'st-' + key, key, name, level });
const person = (id, states = [], extra = {}) => ({ id, name: id === 'c' ? 'Lanceur' : 'Cible', camp: id === 'c' ? 'allie' : 'ennemi', hp: 12, maxHp: 12,
  caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40 }, skills: [], talents: [], states, extensions: { v5: {} }, ...extra });
const roundLayer = (testSpec, extra = {}) => ({ id: 'e1', spellId: 'sp', spellName: 'Sort d’essai', casterId: 'c', appliedAtRound: 1, expiresAtRound: 9,
  roundEffect: { phase: 'endOfRound', test: testSpec, ...extra } });
const withLayer = (target, layer) => ({ ...target, extensions: { v5: { spellEffects: [layer] } } });
const roundRun = (targetStates, inputs, testSpec = { skill: 'Calme', stat: 'FM', modifierSl: 0 }) =>
  roundSpellEffects([person('c'), withLayer(person('t', targetStates), roundLayer(testSpec, { failConditions: ['Sonné'] }))], 'endOfRound', 2, { t: inputs });
const roundLog = out => out.logs.find(row => /Calme|Athlétisme/.test(row.text))?.text || '';

describe('Calcul commun d’un Test de sort (CA9)', () => {
  test('sans État ni effet : même résultat qu’avant le chantier', () => {
    const before = selectV5Test(previewV5Test({ score: 40, roll: 35, slModifiers: [{ id: 'spell-round', amount: -1 }] }), 'keep');
    const after = spellTurnTest(person('t'), { score: 40, roll: 35, stat: 'FM', skill: 'Calme', slModifiers: [{ id: 'spell-round', amount: -1 }] });
    assert.deepEqual(after, before);
  });
  test('Test de Round sans État : réussi comme avant', () => {
    const out = roundRun([], { 'spell:e1:roundTest': 35 });
    assert.match(roundLog(out), /Calme 1 DR, réussi/);
  });
});

describe('Test de Round d’un sort (CA1, CA8, CA14)', () => {
  test('CA27 : un Test récurrent d’Endurance utilise Résistance et ses modificateurs', () => {
    const caster=person('c');
    const target=person('t',[],{skills:[{id:'skill-52_e9_73_69_73_74_61_6e_63_65-base',name:'Résistance',total:70}],
      extensions:{v5:{spellEffects:[roundLayer({skill:'Endurance',stat:'E',modifierSl:0},{failCorruption:1}),
        {id:'buff',spellId:'buff',spellName:'Protection',casterId:'c',testModifiers:{Résistance:2}}]}}});
    const run=who=>roundSpellEffects([caster,who],'endOfRound',2,{t:{'spell:e1:roundTest':65}});
    const pending=roundSpellEffects([caster,target],'endOfRound',2,{});
    assert.match(pending.requests.find(row=>row.field==='spell:e1:roundTest').label,/Résistance/,'le champ nomme la compétence utilisée');
    const skilled=run(target);
    assert.match(skilled.logs.map(row=>row.text).join(' '),/Résistance 3 DR, réussi/,'70 au lieu de E 40, avec +2 DR de Résistance');
    assert.equal(skilled.participants.find(row=>row.id==='t').extensions.v5.corruptionPoints || 0,0);
    const untrained=structuredClone(target);untrained.skills=[];
    assert.match(run(untrained).logs.map(row=>row.text).join(' '),/0 DR, raté/,'sans compétence, E 40 et le même bonus');
    const legacy=structuredClone(target);legacy.skills=[{name:'Endurance',total:60}];
    assert.match(run(legacy).logs.map(row=>row.text).join(' '),/2 DR, réussi/,'les anciennes fiches Endurance gardent les effets Résistance');
  });
  test('CA27 : les trois contrats récurrents concernés utilisent Résistance', () => {
    for(const name of ['Transformation de Tzeentch','Consentement','Le Soleil mauvais']){
      const contract=getAllSpellContracts().find(row=>row.name===name),spec=contract.effects.roundEffect;
      assert.equal(spec.test.skill,'Endurance',name);
      const target=person('t',[],{skills:[{name:'Résistance',total:70}],extensions:{v5:{spellEffects:[
        {id:'real',spellId:contract.id,spellName:name,casterId:'c',appliedAtRound:1,expiresAtRound:9,roundEffect:spec},
        {id:'buff',spellId:'buff',spellName:'Protection',casterId:'c',testModifiers:{Résistance:2}}]}}});
      const result=roundSpellEffects([person('c'),target],spec.phase,2,{t:{'spell:real:roundTest':65,'spell:real:location':35}});
      assert.match(result.logs.map(row=>row.text).join(' '),/3 DR, réussi/,name);
    }
  });
  test('Sonné 2 : la pénalité d’État s’applique, le Test est raté et l’échec du sort joue', () => {
    const out = roundRun([state('sonne', 'Sonné', 2)], { 'spell:e1:roundTest': 35 });
    assert.match(roundLog(out), /Calme -1 DR, raté/);
    assert.equal(out.participants.find(p => p.id === 't').states.filter(s => s.key === 'sonne').reduce((n, s) => n + s.level, 0) >= 3, true);
  });
  test('le modificateur propre au sort s’ajoute aux modificateurs communs', () => {
    const out = roundRun([state('sonne', 'Sonné', 1)], { 'spell:e1:roundTest': 35 }, { skill: 'Calme', stat: 'FM', modifierSl: -1 });
    assert.match(roundLog(out), /Calme -1 DR/);
  });
  test('À Terre : question du mouvement posée, rien n’est résolu sans la réponse (CA8)', () => {
    const out = roundRun([state('aterre', 'À Terre')], { 'spell:e1:roundTest': 35 });
    const request = out.requests.find(row => row.field === 'spell:e1:roundTest:involvesMovement');
    assert.equal(request?.kind, 'boolean');
    assert.equal(roundLog(out), '');
    const answered = roundRun([state('aterre', 'À Terre')], { 'spell:e1:roundTest': 35, 'spell:e1:roundTest:involvesMovement': false });
    assert.equal(answered.requests.length, 0);
    assert.match(roundLog(answered), /réussi/);
  });
  test('Inconscient : la résistance au sort est un Test subi, faite avec les malus d’États (CA21, T11 ; avant : bloquée par CA14)', () => {
    const out = roundRun([state('inconscient', 'Inconscient')], { 'spell:e1:roundTest': 35 });
    assert.equal(out.requests.some(row => row.kind === 'manual'), false);
    assert.match(roundLog(out), /Calme 1 DR, réussi/);
  });
});

describe('Opposition et créature sans fiche (CA3)', () => {
  const movement = (casterStates, targetStates) => {
    const caster = person('c', casterStates), target = person('t', targetStates);
    caster.extensions.v5.spellEffects = [{ id: 'm1', spellId: 'mv', spellName: 'Déplacement d’objet', casterId: 'c', appliedAtRound: 1, specialState: { objectMovement: true } }];
    return { combat: { round: 2, participants: [caster, target] }, localRevision: 1 };
  };
  const run = (casterStates, targetStates) => previewSpellInteraction(movement(casterStates, targetStates), { effectId: 'm1', targetId: 't', kind: 'opposed-move', roll: 35, opponentRoll: 35 });
  test('sans État : 1 contre 1', () => assert.match(run([], []).summary, /FM 1 contre Force 1 DR/));
  test('les États pèsent des deux côtés', () => {
    assert.match(run([state('sonne', 'Sonné', 2)], []).summary, /FM -1 contre Force 1 DR/);
    assert.match(run([], [state('sonne', 'Sonné', 2)]).summary, /FM 1 contre Force -1 DR/);
  });
  test('question d’État de l’opposant : clause bloquée avec la question, réponse lue par participant (CA8)', () => {
    const pending = run([], [state('aterre', 'À Terre')]);
    assert.equal(pending.ready, false);
    assert.equal(pending.needsInput[0].field, 'involvesMovement');
    assert.equal(pending.needsInput[0].participantId, 't');
    const answered = previewSpellInteraction(movement([], [state('aterre', 'À Terre')]), { effectId: 'm1', targetId: 't', kind: 'opposed-move', roll: 35, opponentRoll: 35, testContexts: { t: { involvesMovement: true } } });
    assert.equal(answered.ready, true);
  });
  test('Ver Grouillant : la créature de sort garde son score nu, la cible passe par le calcul commun', () => {
    const caster = person('c', [state('sonne', 'Sonné', 3)]), target = person('t', [state('sonne', 'Sonné', 2)]);
    target.extensions.v5.spellEffects = [{ id: 'w1', spellId: 'worm', spellName: 'Ver Grouillant', casterId: 'c', appliedAtRound: 1, specialState: { wormGrapple: { strength: 40 } } }];
    // Ver : 35 sur 40 = +1 DR (Sonné du lanceur sans effet) ; cible : 25 sur 40 = +2 DR, −2 (Sonné 2) = 0 ; le Ver garde la cible
    // (sans le calcul commun, +2 > +1 : cible libérée).
    const out = previewSpellInteraction({ combat: { round: 2, participants: [caster, target] }, localRevision: 1 }, { effectId: 'w1', targetId: 't', kind: 'worm', roll: 35, opponentRoll: 25, controlValue: 'entangle' });
    assert.equal(out.ready, true, out.error);
    assert.equal(out.test.sl, 1);
    assert.match(out.summary, /Ver gagne/);
  });
});

describe('Calme contre la mort (Soleil Violet, vortex)', () => {
  const vortex = (targetStates, data) => {
    const caster = person('c'), target = person('t', targetStates);
    const effect = { id: 'v1', spellId: 'ash', spellName: 'Cendres et Poussière', casterId: 'c', castExecutionId: 'x', appliedAtRound: 1, expiresAtRound: 9,
      roundEffect: { vortex: { damage: 0, ignoreAp: true, sun: true } } };
    return randomVortexStep([caster, target], caster, effect, { inputs: { t: data }, initial: { direction: 'N', distance: 4, targets: ['t'] }, round: 2 });
  };
  test('sans État : 35 sur 40, la cible survit', () => {
    const out = vortex([], { SunTouched: true, Calm: 35 });
    assert.equal(out.ready, true, JSON.stringify(out.requests));
    assert.ok(out.participants.find(p => p.id === 't').hp > 0);
  });
  test('Sonné 2 : le Calme est raté, la cible meurt', () => {
    const out = vortex([state('sonne', 'Sonné', 2)], { SunTouched: true, Calm: 35 });
    assert.equal(out.participants.find(p => p.id === 't').hp, 0);
  });
  test('À Terre : question du mouvement avant le Calme (CA8)', () => {
    const out = vortex([state('aterre', 'À Terre')], { SunTouched: true, Calm: 35 });
    assert.ok(out.requests.some(row => row.field === 'Calm:involvesMovement' && row.kind === 'boolean'));
    assert.ok(out.participants.find(p => p.id === 't').hp > 0);
  });
});

describe('Attribut de Tzeentch : Test de Corruption (v5-magic-attributes.js)', () => {
  const tzeentch = (states, rolls) => previewLoreAttribute({ lore: 'tzeentch', caster: person('c'), targets: [person('t', states)], spell: { duration: '3 Rounds' },
    options: { attributeRolls: { t: rolls } } });
  test('sans État : réussi comme avant', () => assert.equal(tzeentch([], { corruptionRoll: 35 }).targetEffects.get('t').test.success, true));
  test('Sonné 2 : raté, +1 Point de Corruption', () => {
    const effect = tzeentch([state('sonne', 'Sonné', 2)], { corruptionRoll: 35 }).targetEffects.get('t');
    assert.equal(effect.test.success, false);
    assert.equal(effect.corruptionGain, 1);
  });
  test('À Terre : attribut non résolu tant que le MJ n’a pas répondu (CA8)', () => {
    const pending = tzeentch([state('aterre', 'À Terre')], { corruptionRoll: 35 });
    assert.equal(pending.ready, false);
    assert.equal(pending.conditionNeeds[0].needsInput[0].field, 'involvesMovement');
    const answered = tzeentch([state('aterre', 'À Terre')], { corruptionRoll: 35, corruptionContext: { involvesMovement: false } });
    assert.equal(answered.targetEffects.get('t').test.success, true);
  });
});
