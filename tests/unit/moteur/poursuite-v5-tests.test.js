// Poursuite V5 (docs/specs/poursuite-v5, lot L2) : Test de poursuite et Test d'Obstacle par le calcul commun des Tests secondaires.
// CA6 (États, talents, séquelles, Obstiné), CA7 (Inconscient, Surpris, Brisé), CA10 (aperçu, Réussite éclatante), CA11 (un talent, une fois).
import test from 'node:test';
import assert from 'node:assert/strict';
import additional from '../../../js/data/v5-additional-talent-contracts.json' with { type: 'json' };
import { previewPursuitTest, previewObstacleTest, drawObstacle, freeObstacle } from '../../../js/core/v5-pursuit.js';

const STUNNED = { key: 'sonne', name: 'Sonné', level: 1 };
const UNCONSCIOUS = { key: 'inconscient', name: 'Inconscient', level: 1 };
const SURPRISED = { key: 'surpris', name: 'Surpris', level: 1 };
const PRONE = { key: 'aterre', name: 'À terre', level: 1 };
const BLIND = { key: 'aveugle', name: 'Aveuglé', level: 1 };
const BROKEN = { key: 'brise', name: 'Brisé', level: 1 };

const skill = (name, carac, total = 50) => ({ id: name, name, carac, status: 'resolved', total });
const person = (id, { states = [], talents = [], skills = [] } = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 12, maxHp: 12, size: 'average', species: 'Human',
  caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 },
  skills: [skill('Athlétisme', 'Ag'), ...skills], talents, states, equipment: [], traits: [], armor: {}, extensions: { v5: {} } });
const talent = (id, extra = {}) => ({ id, status: 'resolved', rank: 1, ...extra });
const contractAmount = (talentId, clauseId) => additional.contracts.find(row => row.talentId === talentId)
  .clauses.find(row => row.id === clauseId).effects.find(row => row.op === 'modifySL').amount;
const sl = out => out.test.sl;
const talentRows = out => out.modifiers.filter(row => String(row.id).startsWith('talent:'));
const prey = (actor, extra = {}) => previewPursuitTest(actor, { skill: 'Athlétisme', roll: 25, role: 'prey', ...extra });
const chase = (actor, extra = {}) => previewPursuitTest(actor, { skill: 'Athlétisme', roll: 25, role: 'pursuer', ...extra });
const deepFreeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(deepFreeze); } return value; };

// --- Test de poursuite : calcul de base ---------------------------------------------------------------------------------

test('poursuite : score de la compétence choisie, jet saisi, aperçu et détail', () => {
  const out = prey(person('q'));
  assert.equal(out.ready, true);
  assert.equal(out.score, 50);
  assert.equal(out.test.roll, 25);
  assert.equal(sl(out), 3);
  assert.equal(out.test.success, true);
  const conduite = previewPursuitTest(person('c', { skills: [skill('Conduite d’attelage', 'Ag', 60)] }), { skill: 'Conduite', roll: 25, role: 'pursuer' });
  assert.equal(conduite.score, 60, 'Conduite se raccorde à « Conduite d’attelage »');
  assert.equal(sl(conduite), 4);
});

test('poursuite : seules Athlétisme, Conduite, Chevaucher et Natation sont admises, le jet doit être un d100', () => {
  assert.equal(prey(person('q'), { skill: 'Charme' }).ready, false);
  assert.equal(prey(person('q'), { roll: 0 }).ready, false);
  assert.equal(prey(person('q'), { roll: 101 }).ready, false);
  assert.equal(prey(person('q'), { roll: 12.5 }).ready, false);
  assert.equal(prey(person('q'), { roll: undefined }).needsInput[0].field, 'roll');
  assert.equal(prey(person('q'), { role: 'autre' }).ready, false, 'rôle : proie ou poursuivant');
});

test('poursuite : compétence de base absente de la fiche, la Caractéristique seule fait le score ; avancée absente, refusée (D23)', () => {
  const out = previewPursuitTest(person('q'), { skill: 'Chevaucher', roll: 25, role: 'prey' });
  assert.equal(out.ready, true);
  assert.equal(out.score, 40, 'Chevaucher : Agilité 40');
  const swim = previewPursuitTest(person('q'), { skill: 'Natation', roll: 25, role: 'prey' });
  assert.equal(swim.ready, false, 'Natation est une compétence avancée');
  assert.match(swim.error, /avancée.*autre compétence/);
  assert.equal(previewPursuitTest(person('q', { skills: [skill('Natation', 'F', 55)] }), { skill: 'Natation', roll: 25, role: 'prey' }).score, 55);
});

test('Obstacle : même règle des compétences absentes ; raccord exact des noms, meilleure spécialité (D23)', () => {
  const crowd = drawObstacle(5), passer = drawObstacle(4), alley = drawObstacle(7);
  const drinker = person('q', { skills: [skill('Résistance à l’alcool', 'E', 70)] });
  const tough = previewObstacleTest(drinker, { obstacle: crowd, skill: 'Résistance', roll: 25, role: 'prey' });
  assert.equal(tough.ready, true);
  assert.equal(tough.score, 40, '« Résistance » n’attrape pas « Résistance à l’alcool » : Endurance 40');
  const fencer = person('q', { skills: [skill('Corps à corps (Base)', 'CC', 45), skill('Corps à corps (Escrime)', 'CC', 60)] });
  assert.equal(previewObstacleTest(fencer, { obstacle: passer, skill: 'Corps à corps', roll: 25, role: 'prey' }).score, 60, 'meilleure spécialité');
  const sneak = person('q', { skills: [skill('Discrétion (Urbaine)', 'Ag', 55)] });
  assert.equal(previewObstacleTest(sneak, { obstacle: alley, skill: 'Discrétion', roll: 25, role: 'prey' }).score, 55);
  assert.equal(previewObstacleTest(person('q'), { obstacle: alley, skill: 'Discrétion', roll: 25, role: 'prey' }).score, 40, 'Discrétion de base : Agilité');
  const tracking = previewObstacleTest(person('q'), { obstacle: alley, skill: 'Pistage', roll: 25, role: 'prey' });
  assert.equal(tracking.ready, false, 'Pistage est avancée');
  assert.match(tracking.error, /avancée.*autre compétence/);
});

// --- CA6 / CA7 : États, restrictions ------------------------------------------------------------------------------------

test('poursuite : Sonné compté pour la proie comme pour le poursuivant', () => {
  assert.equal(sl(prey(person('q', { states: [STUNNED] }))), sl(prey(person('q'))) - 1);
  assert.equal(sl(chase(person('p', { states: [STUNNED] }))), sl(chase(person('p'))) - 1);
});

test('poursuite : Inconscient et Surpris bloqués avec leur motif (CA7)', () => {
  for (const [state, motif] of [[UNCONSCIOUS, /Inconscient/], [SURPRISED, /Surpris/]]) {
    const out = chase(person('p', { states: [state] }));
    assert.equal(out.ready, false);
    assert.equal(out.blocked, true);
    assert.match(out.restrictions.join(' '), motif);
  }
});

test('poursuite : À terre compté sans question, la vue reste une question au MJ', () => {
  const prone = prey(person('q', { states: [PRONE] }));
  assert.equal(prone.ready, true, 'la poursuite implique un mouvement');
  assert.equal(prone.test.roll, 52, 'Désavantage d’À terre : 25 inversé en 52');
  const blind = chase(person('p', { states: [BLIND] }));
  assert.equal(blind.ready, false);
  assert.deepEqual(blind.needsInput.map(row => row.field), ['reliesOnSight']);
  assert.equal(chase(person('p', { states: [BLIND] }), { context: { reliesOnSight: false } }).ready, true);
});

test('poursuite : la proie Brisée fuit sans pénalité, le poursuivant Brisé subit le malus sans question (CA7)', () => {
  assert.equal(sl(prey(person('q', { states: [BROKEN] }))), sl(prey(person('q'))));
  const pursuer = chase(person('p', { states: [BROKEN] }));
  assert.equal(pursuer.ready, true, 'aucune question de fuite pour le poursuivant');
  assert.equal(sl(pursuer), sl(chase(person('p'))) - 1);
  const answered = chase(person('p', { states: [BROKEN] }), { context: { runningOrHiding: true } });
  assert.equal(sl(answered), sl(chase(person('p'))) - 1, 'une réponse « fuit » ne retire pas le malus du poursuivant');
});

// --- CA11 : un talent, une seule fois -----------------------------------------------------------------------------------

test('poursuite : Fuite ! compté une seule fois, pour la proie (DR avec = DR sans + montant du contrat)', () => {
  const amount = contractAmount('talent-flee', 'modifySL-actor');
  const out = prey(person('q', { talents: [talent('talent-flee')] }));
  assert.equal(sl(out), sl(prey(person('q'))) + amount);
  assert.equal(talentRows(out).length, 1, 'une seule ligne de talent');
  assert.equal(out.modifiers.filter(row => /Fuite/.test(row.label)).length, 1, 'aucun modificateur manuel en plus du contrat');
  assert.equal(sl(chase(person('p', { talents: [talent('talent-flee')] }))), sl(chase(person('p'))), 'rien pour un poursuivant');
});

test('poursuite : Impitoyable compté une seule fois, pour le poursuivant (DR avec = DR sans + montant du contrat)', () => {
  const amount = contractAmount('talent-relentless', 'modifySL-actor');
  const out = chase(person('p', { talents: [talent('talent-relentless')] }));
  assert.equal(sl(out), sl(chase(person('p'))) + amount);
  assert.equal(talentRows(out).length, 1);
  assert.equal(out.modifiers.filter(row => /Impitoyable|Acharné/.test(row.label)).length, 1);
  assert.equal(sl(prey(person('q', { talents: [talent('talent-relentless')] }))), sl(prey(person('q'))), 'rien pour la proie');
});

test('poursuite : Grandes enjambées joue par la poursuite et le terrain choisi', () => {
  const amount = contractAmount('talent-striding-gait', 'modifySL-actor');
  const walker = person('q', { talents: [talent('talent-striding-gait', { specialization: 'Forêt' })] });
  const witness = sl(prey(person('q')));
  assert.equal(sl(prey(walker, { context: { terrain: 'Forêt' } })), witness + amount);
  assert.equal(sl(prey(walker, { context: { terrain: 'Ville' } })), witness, 'autre terrain');
  assert.equal(talentRows(prey(walker, { context: { terrain: 'Forêt' } })).length, 1);
  // Hors poursuite, le même terrain ne donne pas le bonus de poursuite (preuve que `pursuit` est transmis).
  const outside = previewPursuitTest(walker, { skill: 'Athlétisme', roll: 25, role: 'prey', context: { terrain: 'Forêt', pursuit: false } });
  assert.equal(sl(outside), sl(prey(walker, { context: { terrain: 'Forêt' } })), '`pursuit` est imposé par la poursuite');
});

test('Bon marcheur : sans terrain, le Test pose la question au MJ et la réponse joue ; sans le talent, aucune question (CA11)', () => {
  const amount = contractAmount('talent-striding-gait', 'modifySL-actor');
  const walker = person('q', { talents: [talent('talent-striding-gait', { specialization: 'Forêt' })] });
  const asked = prey(walker);
  assert.equal(asked.ready, false, 'le +2 DR ne se perd plus en silence');
  const question = asked.needsInput.find(row => row.field === 'terrain');
  assert.ok(question);
  assert.deepEqual(question.options.map(row => row.value), ['Forêt', 'none']);
  assert.equal(sl(prey(walker, { context: { terrain: 'Forêt' } })), sl(prey(person('q'))) + amount);
  assert.equal(sl(prey(walker, { context: { terrain: 'none' } })), sl(prey(person('q'))));
  assert.equal(prey(walker, { context: { terrain: 'Forêt' } }).choices[0].value, 'Forêt', 'la réponse reste corrigeable');
  assert.equal(prey(person('q')).ready, true);
  assert.deepEqual(prey(person('q')).choices, []);
  assert.ok(previewObstacleTest(walker, { obstacle: drawObstacle(1), skill: 'Athlétisme', roll: 25, role: 'prey' }).needsInput.some(row => row.field === 'terrain'), 'Test d’Obstacle aussi');
});

// --- Test d'Obstacle ----------------------------------------------------------------------------------------------------

const obstacle = drawObstacle(1);
const crossing = (actor, extra = {}) => previewObstacleTest(actor, { obstacle, skill: 'Athlétisme', roll: 25, role: 'prey', ...extra });

test('Obstacle : compétence parmi celles de l’obstacle, aperçu score, jet, modificateurs, réussites', () => {
  const out = crossing(person('q', { skills: [skill('Esquive', 'Ag', 45)] }));
  assert.equal(out.ready, true);
  assert.equal(out.score, 50);
  assert.equal(out.test.roll, 25);
  assert.equal(out.test.success, true);
  assert.equal(out.astonishing, false);
  assert.deepEqual(out.beneficiaryOptions, []);
  assert.equal(crossing(person('q', { skills: [skill('Esquive', 'Ag', 45)] }), { skill: 'Esquive' }).score, 45);
  assert.equal(crossing(person('q', { skills: [skill('Charme', 'Soc', 60)] }), { skill: 'Charme' }).ready, false, 'Charme n’est pas admise ici');
  assert.equal(crossing(person('q'), { roll: 90 }).test.success, false);
});

test('Obstacle : obstacle libre, la compétence saisie se raccorde au nom de la fiche', () => {
  const free = freeObstacle({ label: 'Mur de planches', skills: ['Escalade'] });
  const climber = person('q', { skills: [skill('Escalade', 'F', 55)] });
  const out = previewObstacleTest(climber, { obstacle: free, skill: 'Escalade', roll: 25, role: 'prey' });
  assert.equal(out.ready, true);
  assert.equal(out.score, 55);
});

test('Obstacle : États, talents et questions passent par le calcul commun', () => {
  assert.equal(sl(crossing(person('q', { states: [STUNNED] }))), sl(crossing(person('q'))) - 1);
  const flee = crossing(person('q', { talents: [talent('talent-flee')] }));
  assert.equal(sl(flee), sl(crossing(person('q'))) + contractAmount('talent-flee', 'modifySL-actor'));
  assert.equal(talentRows(flee).length, 1);
  const blocked = crossing(person('q', { states: [UNCONSCIOUS] }));
  assert.equal(blocked.ready, false);
  assert.match(blocked.restrictions.join(' '), /Inconscient/);
  // Un Obstacle n'est pas toujours un déplacement : À terre pose sa question au MJ, comme aux autres Tests.
  const prone = crossing(person('q', { states: [PRONE] }));
  assert.equal(prone.ready, false);
  assert.deepEqual(prone.needsInput.map(row => row.field), ['involvesMovement']);
  assert.equal(crossing(person('q', { states: [PRONE] }), { context: { involvesMovement: true } }).ready, true);
});

test('Obstacle : Obstiné annule le malus d’État, le malus reste visible, barré', () => {
  const stubborn = person('q', { states: [STUNNED], talents: [talent('talent-strong-minded')] });
  const out = crossing(stubborn, { context: { preRollTalent: 'strong-minded' } });
  assert.equal(out.ready, true);
  assert.equal(sl(out), sl(crossing(person('q'))), 'malus ramené à 0');
  assert.ok(out.rows.some(row => row.dropped && row.rule === 'Obstiné'));
});

test('Obstacle : Réussite éclatante à +5 DR, bénéficiaire à choisir parmi les alliés de la poursuite (D11)', () => {
  const allies = [person('q'), person('ami'), person('autre')];
  const out = crossing(allies[0], { roll: 5, allies });
  assert.equal(sl(out), 5);
  assert.equal(out.astonishing, true);
  assert.equal(out.test.resultTier.label, 'Réussite éclatante');
  assert.deepEqual(out.beneficiaryOptions, [{ id: 'ami', name: 'ami' }, { id: 'autre', name: 'autre' }], 'l’intéressé n’y figure pas');
  assert.equal(sl(crossing(allies[0], { roll: 15, allies })), 4);
  assert.equal(crossing(allies[0], { roll: 15, allies }).astonishing, false);
});

// --- Pureté -------------------------------------------------------------------------------------------------------------

test('aperçus purs : entrées gelées acceptées, deux appels donnent le même résultat', () => {
  const actor = deepFreeze(person('q', { states: [STUNNED], talents: [talent('talent-flee')] }));
  const input = deepFreeze({ skill: 'Athlétisme', roll: 25, role: 'prey', context: { reliesOnSight: false } });
  assert.deepEqual(previewPursuitTest(actor, input), previewPursuitTest(actor, input));
  const crossInput = deepFreeze({ obstacle, skill: 'Athlétisme', roll: 25, role: 'prey', context: {}, allies: [actor] });
  assert.deepEqual(previewObstacleTest(actor, crossInput), previewObstacleTest(actor, crossInput));
});
