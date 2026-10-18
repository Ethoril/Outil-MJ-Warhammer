/**
 * S-03 / T-04 — aucun tirage implicite : chaque dé utilisé par un aperçu magique est saisi par le MJ,
 * sinon l'aperçu reste ready:false et le champ figure dans `missing`.
 * L-01 — un sort mineur réussi sur un double ne produit pas d'incident, y compris via la logique de l'interface.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { previewChannelling, setChannellingReserve } from '../js/core/v5-magic-channelling.js';
import { previewCasting } from '../js/core/v5-magic-casting.js';
import { resolveMiscast, explicitMagicDie, applyMiscastToParticipant } from '../js/core/v5-magic-miscasts.js';
import { previewHandOfGlory } from '../js/core/v5-magic-arbitrations.js';
import { previewDispelCasting, previewDispelPersistent } from '../js/core/v5-magic-dispel.js';
import { getSpellContract, previewSpellExecution, resolveVortexTrajectory, vortexMovementFromDie } from '../js/core/v5-spell-contracts.js';
import { magicCastingSpell } from '../js/ui/workspace-view.js';

const wizard = (overrides = {}) => ({
  id: 'dice-mage', name: 'Mage des dés', hp: 12, maxHp: 12,
  caracs: { Int: 54, FM: 52, E: 38, Soc: 40, CC: 40, CT: 40, F: 40, I: 40, Ag: 40 },
  skills: [{ name: 'Focalisation', total: 60 }, { name: 'Langue (Magick)', total: 65 }, { name: 'Calme', total: 60 }],
  equipment: [], states: [], ...overrides
});
const foe = { id: 'dice-foe', name: 'Orque', hp: 15, maxHp: 15, caracs: { E: 30 }, armor: { head: 0, body: 1, arms: 0, legs: 0 } };

test('Dés explicites — bornes entières : NaN, négatifs, fractions et hors bornes refusés', () => {
  assert.equal(explicitMagicDie(7, 'd10'), 7);
  assert.equal(explicitMagicDie('00', 'd100'), 100);
  for (const bad of [undefined, null, '', NaN, -3, 0, 2.5, 11, 'abc']) assert.equal(explicitMagicDie(bad, 'd10'), null, String(bad));
  assert.equal(explicitMagicDie(1, '2d10'), null);
  assert.equal(explicitMagicDie(2, '3d10'), null);
  assert.equal(explicitMagicDie(101, 'd100'), null);
});

test('Focalisation — maladresse sans dés : perte et incident à saisir, jamais repris du Test', () => {
  const mage = setChannellingReserve(wizard(), { type: 'winds', sl: 6 });
  const preview = previewChannelling(mage, { type: 'winds', roll: 99 });
  assert.equal(preview.fumble, true);
  assert.equal(preview.ready, false);
  assert.deepEqual(preview.missing, ['lossRoll', 'miscastRoll']);
  assert.equal(preview.miscast, null);

  for (const lossRoll of [-3, 2.5, NaN, 0, 11]) {
    const invalid = previewChannelling(mage, { type: 'winds', roll: 99, lossRoll, miscastRoll: 48 });
    assert.equal(invalid.ready, false, `lossRoll ${lossRoll}`);
    assert.ok(invalid.missing.includes('lossRoll'));
    assert.ok(invalid.newReserve.sl <= 6, 'Une perte invalide n’augmente jamais la réserve');
  }

  const empty = previewChannelling(wizard(), { type: 'winds', roll: 99 });
  assert.deepEqual(empty.missing, ['miscastRoll'], 'Sans réserve, seule la table d’incident demande un dé');

  const complete = previewChannelling(mage, { type: 'winds', roll: 99, lossRoll: 2, miscastRoll: 28 });
  assert.equal(complete.miscast.modifiedRoll, 48);
  assert.equal(complete.ready, true);
});

test('Focalisation — interruption échouée sans dés bloquée, même sans requireExplicitDice', () => {
  const mage = setChannellingReserve(wizard(), { type: 'winds', sl: 4 });
  const preview = previewChannelling(mage, { mode: 'interruption', roll: 95 });
  assert.equal(preview.interrupted, true);
  assert.equal(preview.ready, false);
  assert.deepEqual(preview.missing, ['lossRoll', 'miscastRoll']);
});

test('Incantation — double ou maladresse sans jet d’incident : ready:false', () => {
  const spell = { name: 'Dard', cn: 2, wind: 'fire', type: 'lore' };
  const critical = previewCasting(wizard(), spell, { roll: 22 });
  assert.equal(critical.critical, true);
  assert.equal(critical.ready, false);
  assert.deepEqual(critical.missing, ['miscastRoll']);
  const fumble = previewCasting(wizard(), spell, { roll: 88 });
  assert.equal(fumble.fumble, true);
  assert.deepEqual(fumble.missing, ['miscastRoll']);
  assert.deepEqual(previewCasting(wizard(), spell, {}).missing, ['roll']);
});

test('Incidents — chaque dé secondaire utilisé par le résultat est exigé', () => {
  const cases = [
    ['MINOR', 3, ['duration']], ['MINOR', 28, ['strength']], ['MINOR', 38, ['distance']], ['MINOR', 53, ['distance']],
    ['MINOR', 63, ['duration']], ['MINOR', 68, ['duration']], ['MINOR', 73, ['duration']], ['MINOR', 98, ['majorRoll']],
    ['MAJOR', 3, ['duration']], ['MAJOR', 8, ['duration']], ['MAJOR', 13, ['distance', 'damage']], ['MAJOR', 18, ['duration']],
    ['MAJOR', 23, ['distance', 'duration']], ['MAJOR', 28, ['damage']], ['MAJOR', 33, ['distance']], ['MAJOR', 38, ['duration']],
    ['MAJOR', 43, ['duration', 'location']], ['MAJOR', 48, ['duration']], ['MAJOR', 53, ['duration']], ['MAJOR', 63, ['duration']],
    ['MAJOR', 99, ['damage']]
  ];
  for (const [severity, roll, missing] of cases) {
    const miscast = resolveMiscast({ severity, roll, bfm: 5 });
    assert.equal(miscast.ready, false, `${severity} ${roll}`);
    assert.deepEqual(miscast.missingSecondaryDice, missing, `${severity} ${roll}`);
  }
  assert.deepEqual(resolveMiscast({ severity: 'MINOR', roll: 88, isHighMagic: true }).missingSecondaryDice, ['duration'], 'Jours d’épuisement');
  assert.deepEqual(resolveMiscast({}).missingSecondaryDice, ['roll']);
  assert.deepEqual(resolveMiscast({ severity: 'MAJOR', roll: 53, secondaryRolls: { duration: 1 } }).missingSecondaryDice, ['duration'], '2d10 : 1 hors bornes');
  assert.equal(resolveMiscast({ severity: 'MAJOR', roll: 99, secondaryRolls: { noOtherTargets: true } }).ready, true, 'Tête explosée : aucun dé de dégâts');

  const supplied = resolveMiscast({ severity: 'MAJOR', roll: 43, secondaryRolls: { duration: 4, location: 'Jambe gauche' } });
  assert.equal(supplied.ready, true);
  assert.equal(supplied.details.location, 'Jambe gauche');
  const cascade = resolveMiscast({ severity: 'MINOR', roll: 98, majorRoll: 61 });
  assert.equal(cascade.table, 'MAJOR');
  assert.equal(cascade.finalRoll, 61, 'Le jet Majeur n’est jamais le jet Mineur repris');
});

test('Sorts — Main de Gloire, chemin « DR seul », Forme bestiale et Vortex exigent leurs dés et choix', () => {
  const ally = { ...wizard(), id: 'dice-ally', name: 'Allié' };
  const hog = previewSpellExecution(wizard(), getSpellContract('Main de Gloire'), [ally], { sl: 6 });
  assert.equal(hog.ready, false);
  assert.deepEqual(hog.missing, ['chosenStats', 'roll3d10']);
  const hogReady = previewSpellExecution(wizard(), getSpellContract('Main de Gloire'), [ally], { sl: 6, chosenStats: ['F'], roll3d10: 17 });
  assert.equal(hogReady.ready, true);
  assert.deepEqual(previewHandOfGlory({ caster: wizard(), targets: [ally], chosenStats: ['CC'], tier: 'base' }).missing, ['roll3d10']);
  assert.throws(() => previewHandOfGlory({ caster: wizard(), chosenStats: ['CC'], tier: 'base', roll3d10: 12.5 }), /3d10/);

  const bolt = previewSpellExecution(wizard(), getSpellContract('Carreau'), [foe], { sl: 6 });
  assert.equal(bolt.ready, false);
  assert.deepEqual(bolt.missing, ['locationRoll']);
  const boltReady = previewSpellExecution(wizard(), getSpellContract('Carreau'), [foe], { sl: 6, locationRoll: 50 });
  assert.equal(boltReady.ready, true);
  assert.equal(boltReady.targetResults[0].missile.roll, 5, 'Jet de localisation 50 lu directement (inverse de 05)');

  const criticalDr = previewSpellExecution(wizard(), getSpellContract('Carreau'), [foe], { sl: 6, critical: true, locationRoll: 50 });
  assert.deepEqual(criticalDr.missing, ['miscastRoll']);

  const beast = previewSpellExecution(wizard(), getSpellContract('Forme bestiale'), [], { sl: 8 });
  assert.equal(beast.ready, false);
  assert.deepEqual(beast.missing, ['beastKey']);

  const vortexContract = getSpellContract('Tempête Magmatique');
  assert.deepEqual(resolveVortexTrajectory({ contract: vortexContract, caster: wizard(), options: { roll: 37 } }).missing, ['vortexWillpower', 'distanceRoll'], 'Aucun repli sur le jet d’incantation ni sur BFM × 2');
  // Winds of Magic p. 20 : Test de FM réussi -> direction choisie ; raté -> d10 de direction (1 à 10).
  assert.deepEqual(resolveVortexTrajectory({ contract: vortexContract, caster: wizard(), options: { willpowerSuccess: true, distanceRoll: 12 } }).missing, ['direction']);
  assert.deepEqual(resolveVortexTrajectory({ contract: vortexContract, caster: wizard(), options: { willpowerSuccess: false, distanceRoll: 12 } }).missing, ['directionRoll']);
  assert.deepEqual(resolveVortexTrajectory({ contract: vortexContract, caster: wizard(), options: { willpowerSuccess: false, directionRoll: 11, distanceRoll: 12 } }).missing, ['directionRoll'], 'd10 borné à 10');
  const chosen = resolveVortexTrajectory({ contract: vortexContract, caster: wizard(), direction: 'SW', options: { willpowerSuccess: true, distanceRoll: 12 } });
  assert.equal(chosen.trajectory.direction, 'SW');
  assert.equal(chosen.trajectory.distance, 12);
  const random = resolveVortexTrajectory({ contract: vortexContract, caster: wizard(), direction: 'N', options: { willpowerSuccess: false, directionRoll: 10, distanceRoll: 9 } });
  assert.equal(random.trajectory.direction, 'NW', 'Échec : la direction choisie est ignorée, d10 = 10 -> Nord-Ouest');
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(vortexMovementFromDie), ['disappears', 'N', 'NE', 'E', 'stays', 'SE', 'S', 'SW', 'W', 'NW']);
  const gone = resolveVortexTrajectory({ contract: vortexContract, caster: wizard(), options: { willpowerSuccess: false, directionRoll: 1 }, targetsCrossed: [foe] });
  assert.equal(gone.ready, true);
  assert.equal(gone.trajectory.outcome, 'disappears');
  assert.equal(gone.crossedReceipts.length, 0);
  const vortex = previewSpellExecution(wizard(), vortexContract, [foe], { sl: 15, locationRoll: 50 });
  assert.equal(vortex.ready, false);
  assert.deepEqual(vortex.missing, ['vortexWillpower', 'distanceRoll']);
});

test('Dissipation — aperçu sans jet : ready:false et jet listé', () => {
  const effect = { id: 'persist', name: 'Effet', cn: 5, casterId: 'other' };
  const persistent = previewDispelPersistent(wizard(), effect, { distance: 2, visible: true });
  assert.equal(persistent.ready, false);
  assert.deepEqual(persistent.missing, ['roll']);
  const cast = previewCasting(wizard({ id: 'caster' }), { name: 'Dard', cn: 2, wind: 'fire', type: 'lore' }, { roll: 15 });
  const casting = previewDispelCasting(wizard(), { ...cast, actorId: 'caster' }, { distance: 2, visible: true });
  if (casting.allowed) assert.deepEqual(casting.missing, ['roll']);
  assert.equal(casting.ready === true && casting.allowed !== false, false);
});

test('Statique — aucun Math.random dans l’interface magique ni dans le tour V5', () => {
  for (const path of ['../js/ui/workspace-view.js', '../js/ui/resolution-panel.js', '../js/ui/v5-magic-controls.js', '../js/core/v5-turn.js', '../js/core/v5-magic-turn.js']) {
    assert.doesNotMatch(readFileSync(new URL(path, import.meta.url), 'utf8'), /Math.random/, path);
  }
});

test('D-08 — Contre-réaction : jamais appliquée au lanceur, tête explosée s’il n’y a aucune autre cible', () => {
  const noTarget = resolveMiscast({ severity: 'MAJOR', roll: 99, bfm: 5, secondaryRolls: { noOtherTargets: true } });
  assert.equal(noTarget.ready, true);
  assert.equal(noTarget.details.headExploded, true);
  assert.equal(applyMiscastToParticipant(wizard(), noTarget).participant.dead, true);
  const others = resolveMiscast({ severity: 'MAJOR', roll: 99, bfm: 5, secondaryRolls: { damage: 7 } });
  assert.equal(others.details.woundsLost, 7);
  const applied = applyMiscastToParticipant(wizard(), others);
  assert.equal(applied.participant.hp, 12, 'Le lanceur ne perd rien');
  assert.ok(!(applied.participant.states || []).some(state => /terre/i.test(state.name || state.key || '')), 'Le lanceur n’est pas À Terre');
  assert.ok(applied.reminders.some(text => /autre créature/.test(text) && /7 Blessures/.test(text)), 'Reçu MJ pour les autres cibles');
  assert.equal(resolveMiscast({ severity: 'MAJOR', roll: 99, bfm: 5 }).ready, false, 'Sans case ni dé de dégâts : dé demandé');
});

test('Statique — aucun Math.random dans les modules magiques', () => {
  const dir = new URL('../js/core/', import.meta.url);
  const files = readdirSync(dir).filter(name => /^v5-magic-.*\.js$/.test(name) || name === 'v5-spell-contracts.js');
  assert.ok(files.length > 10);
  for (const name of files) assert.doesNotMatch(readFileSync(new URL(name, dir), 'utf8'), /Math\.random/, name);
});

test('L-01 — sort mineur réussi sur un double (22, score 60) via la logique de l’interface : prêt, sans incident', () => {
  const contract = getSpellContract('Fléchette');
  const spell = magicCastingSpell(contract, { spellId: contract.id });
  assert.equal(spell.type, 'petty');
  assert.equal(spell.isPetty, true);
  assert.equal(magicCastingSpell(getSpellContract('Carreau')).type, 'lore');
  const actor = wizard();
  const castPreview = previewCasting(actor, spell, { roll: 22, score: 60, requireExplicitDice: true });
  assert.equal(castPreview.critical, true);
  assert.equal(castPreview.miscast, null);
  assert.equal(castPreview.ready, true);
  const preview = previewSpellExecution(actor, contract, [foe], { roll: 22, score: 60, requireExplicitDice: true, castingPreview: castPreview, castResult: castPreview, castRoll: 22 });
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.miscast ?? null, null);
  assert.equal(preview.castingPreview.miscast ?? null, null);
});
