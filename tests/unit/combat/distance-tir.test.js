// Refonte de l'interface, lot E4b (CA13 à CA15) : la ligne « Distance » donne, pour six cas de tir, le même v5Context et
// le même aperçu de résolution que les cases de la 3.56.0 (« La cible est engagée avec le tireur », « Bande de portée
// choisie par le MJ », « Tir à bout portant », engagés du plateau, d100 du combattant touché).
import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../../../js/core/resolution.js';
import { computeV5WeaponRangeBands } from '../../../js/core/v5-talent-combat.js';
import { deriveEngagementContext, withEngagement } from '../../../js/core/engagements.js';
import { DISTANCE_CHOICES, distanceChoices, distanceToContext, deviationRollNeeded } from '../../../js/ui/combat-distance.js';

const person = (id, extra = {}) => ({ id, name: id, kind: id === 'a' ? 'PNJ' : 'PJ', camp: id === 'a' ? 'ennemi' : 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 50, CT: 60, F: 40, E: 30, Ag: 40, I: 40, FM: 40, Soc: 40, Int: 40 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const shooter = person('a'), target = person('b'), third = person('c');
// Fusion faite par la vue avant le moteur (workspace-view v5Input) : une valeur du plateau ne remplit qu'un champ vide.
function withPlateau(context, plateau) {
  const out = { ...context };
  for (const [key, value] of Object.entries(plateau)) if (out[key] === undefined && (value === true || (Array.isArray(value) && value.length))) out[key] = value;
  return out;
}
const meleeDefense = { type: 'defense', label: 'Corps à corps', attr: 'CC', base: 40, roll: 70, v5: { kind: 'melee' } };
const shot = ({ context, roll = 30, choice = 'keep', qualities = [], defense, participants = [shooter, target, third] }) => previewResolution({
  actor: participants.find(row => row.id === 'a'), target: participants.find(row => row.id === 'b'), roll, baseRevision: 0,
  action: { type: 'attack', attr: 'CT', base: 60, damage: 4, qualities }, ...(defense ? { defense } : {}), attackContext: { ranged: true },
  v5: { kind: 'ranged', choice, context }, v5State: { participants } });
// Ce que le MJ lit dans l'aperçu : modificateurs, Avantage/Désavantage, mode d'opposition, touche, cible retenue, saisies manquantes.
const seen = preview => ({ modifiers: preview.test?.details?.modifiers?.map(row => [row.id, row.amount]), advantage: preview.test?.advantage?.net,
  disadvantages: preview.test?.advantage?.disadvantage?.map(row => row.id), mode: preview.opposition?.mode ?? null, hit: preview.hit,
  targetId: preview.targetId, engaged: preview.engagedShot?.selectedTargetId ?? null, unresolved: preview.unresolved });

test('la ligne Distance propose les six choix, dans l’ordre', () => {
  assert.deepEqual(DISTANCE_CHOICES.map(([key]) => key), ['contact', 'point-blank', 'short', 'medium', 'long', 'extreme']);
  assert.deepEqual(distanceChoices({}).options.map(row => row.key), ['contact', 'point-blank', 'short', 'medium', 'long', 'extreme']);
  assert.equal(distanceChoices({}).selected, null, 'rien de déduit : distance à choisir');
});

test('cas 1 · Au contact : même contexte et même aperçu que « La cible est engagée avec le tireur » (mêlée opposée, Pistolet)', () => {
  const plateau = { targetEngaged: false, engagedWithShooter: true, engagedTargetIds: [], shooterEngagedElsewhere: false };
  const choices = distanceChoices({ plateau });
  assert.equal(choices.selected, 'contact', 'prérempli par le plateau');
  assert.equal(choices.source, 'plateau');
  assert.match(choices.explanation, /Corps à corps opposé, sans modificateur de portée/);
  // 3.56.0, plateau : rien dans le brouillon, la vue ajoute la déduction. 3.56.0 sans plateau : case cochée par le MJ.
  const before = withPlateau({}, plateau), manual = withPlateau({ engagedWithShooter: true }, {});
  const after = withPlateau(distanceToContext('contact', { context: {}, plateau }), plateau);
  assert.deepEqual(after, before);
  assert.deepEqual(after, manual);
  const pistol = [{ id: 'pistolet' }];
  assert.deepEqual(seen(shot({ context: after, qualities: pistol, defense: meleeDefense })), seen(shot({ context: before, qualities: pistol, defense: meleeDefense })));
  const preview = shot({ context: after, qualities: pistol, defense: meleeDefense });
  assert.equal(preview.opposition?.mode, 'opposed', 'Corps à corps opposé');
  assert.equal(preview.test.details.modifiers.some(row => /^range:/.test(row.id)), false, 'sans modificateur de portée');
  assert.ok(shot({ context: after, defense: meleeDefense }).unresolved.some(row => /Pistolet/.test(row)), 'restriction au pistolet conservée');
});

test('cas 2 · Bout portant : même contexte que la bande « Bout portant » de la 3.56.0, +2 DR', () => {
  const base = { weaponRangeYards: 20 };
  const before = { ...base, shotRange: 'point-blank' };
  const after = distanceToContext('point-blank', { context: base });
  assert.deepEqual(after, before);
  assert.deepEqual(seen(shot({ context: after })), seen(shot({ context: before })));
  assert.equal(Object.fromEntries(seen(shot({ context: after })).modifiers)['range:point-blank'], 2);
  // La case « Tir à bout portant » (doublon) disparaît : un ancien brouillon qui la portait la perd sans changer l'aperçu.
  const legacy = distanceToContext('point-blank', { context: { ...base, pointBlank: true } });
  assert.equal('pointBlank' in legacy, false);
  assert.deepEqual(seen(shot({ context: legacy })), seen(shot({ context: { ...base, pointBlank: true, shotRange: 'point-blank' } })));
});

test('cas 3 · Arme sans bout portant : « Bout portant » grisé avec la raison du moteur', () => {
  const rangeBands = computeV5WeaponRangeBands(8);
  assert.equal(rangeBands.pointBlankYards, null, 'portée courte de 4 m : pas de bout portant');
  const option = distanceChoices({ rangeBands }).options.find(row => row.key === 'point-blank');
  assert.equal(option.disabled, true);
  const engine = shot({ context: { shotRange: 'point-blank', weaponRangeYards: 8 } }).unresolved.find(row => /bout portant/.test(row));
  assert.ok(engine, 'le moteur refuse la bande');
  assert.ok(engine.startsWith(option.reason.replace(/\.$/, '')), `même raison que le moteur (${option.reason} / ${engine})`);
  assert.equal(distanceChoices({ rangeBands }).options.filter(row => row.disabled).length, 1, 'les autres choix restent ouverts');
  assert.equal(distanceChoices({ rangeBands }).options.find(row => row.key === 'short').limit, '≤ 4 m', 'bornes en mètres (yards = mètres)');
});

test('cas 4 · Courte, préremplie par la carte : même contexte et même aperçu que la bande choisie', () => {
  const choices = distanceChoices({ mapBand: 'short', mapMeters: 9 });
  assert.equal(choices.selected, 'short');
  assert.equal(choices.source, 'carte');
  assert.match(choices.explanation, /carte \(9 m\)/);
  const before = { shotRange: 'short' }, after = distanceToContext('short', { context: {} });
  assert.deepEqual(after, before);
  assert.deepEqual(seen(shot({ context: after })), seen(shot({ context: before })));
  // Un choix du MJ l'emporte sur la carte.
  assert.equal(distanceChoices({ mapBand: 'short', context: { shotRange: 'long' } }).selected, 'long');
  // Passer d'« Au contact » à une bande efface le contact ; contre le plateau, le MJ l'emporte (false écrit).
  assert.deepEqual(distanceToContext('medium', { context: { engagedWithShooter: true } }), { shotRange: 'medium' });
  assert.deepEqual(distanceToContext('medium', { context: {}, plateau: { engagedWithShooter: true } }), { shotRange: 'medium', engagedWithShooter: false });
});

test('cas 5 · Cible engagée avec un tiers, tir qui touche malgré le Désavantage : aucun d100 demandé', () => {
  const plateau = { targetEngaged: true, engagedWithShooter: false, engagedTargetIds: ['b', 'c'], shooterEngagedElsewhere: false };
  const choices = distanceChoices({ plateau, context: { shotRange: 'short' }, names: ids => ids.join(', ') });
  assert.match(choices.explanation, /engagée avec c : Désavantage au tir/);
  const before = withPlateau({ shotRange: 'short' }, plateau);
  const after = withPlateau(distanceToContext('short', { context: {}, plateau }), plateau);
  assert.deepEqual(after, before);
  const preview = shot({ context: after, roll: 24, choice: 'reverse' }); // 24 ou 42 : touché dans les deux cas
  assert.deepEqual(seen(preview), seen(shot({ context: before, roll: 24, choice: 'reverse' })));
  assert.ok(preview.test.advantage.disadvantage.some(row => row.id === 'target-engaged'), 'Désavantage du tir dans la mêlée');
  assert.equal(preview.hit, true);
  assert.equal(deviationRollNeeded(preview), false, 'pas de d100 de déviation');
});

test('cas 6 · Cible engagée avec un tiers, tir dévié par le Désavantage : d100 demandé dans le pied, puis combattant touché', () => {
  const plateau = { targetEngaged: true, engagedWithShooter: false, engagedTargetIds: ['b', 'c'], shooterEngagedElsewhere: false };
  const before = withPlateau({ shotRange: 'short' }, plateau);
  const after = withPlateau(distanceToContext('short', { context: {}, plateau }), plateau);
  const waiting = shot({ context: after, roll: 18, choice: 'reverse' });
  assert.deepEqual(seen(waiting), seen(shot({ context: before, roll: 18, choice: 'reverse' })));
  assert.equal(deviationRollNeeded(waiting), true, 'le d100 sert : il est demandé');
  const rolled = shot({ context: { ...after, engagedTargetRoll: 80 }, roll: 18, choice: 'reverse' });
  assert.deepEqual(seen(rolled), seen(shot({ context: { ...before, engagedTargetRoll: 80 }, roll: 18, choice: 'reverse' })));
  assert.equal(rolled.engagedShot.selectedTargetId, 'c', 'le combattant tiré au sort est touché');
  assert.equal(deviationRollNeeded(rolled), false);
  assert.equal(deviationRollNeeded(null), false);
});

test('le plateau des mêlées alimente la ligne : engagé avec le tireur → Au contact ; engagé avec un tiers → Désavantage annoncé', () => {
  const participants = [shooter, target, third];
  const contact = deriveEngagementContext({ combat: withEngagement({ participants }, 'a', 'b', 1), participants, actorId: 'a', targetId: 'b', kind: 'ranged' });
  assert.equal(distanceChoices({ plateau: contact }).selected, 'contact');
  const melee = deriveEngagementContext({ combat: withEngagement({ participants }, 'b', 'c', 1), participants, actorId: 'a', targetId: 'b', kind: 'ranged' });
  assert.deepEqual(melee.engagedTargetIds, ['b', 'c']);
  const line = distanceChoices({ plateau: melee, context: { shotRange: 'medium' } });
  assert.equal(line.selected, 'medium');
  assert.match(line.explanation, /Désavantage au tir/);
  assert.doesNotMatch(distanceChoices({ plateau: melee, context: { shotRange: 'medium', engagementForced: 'recit' } }).explanation, /Désavantage/, 'laissé au récit : rien à annoncer');
});
