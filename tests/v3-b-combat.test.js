import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { previewResolution } from '../js/core/resolution.js';
import { withMomentum, hasMomentum, loseMomentumUnderFear } from '../js/core/v5-combat-rules.js';
import { previewMomentumEvents, previewMomentumCost } from '../js/core/v5-momentum.js';
import { computeV5WeaponRangeBands } from '../js/core/v5-talent-combat.js';
import { previewSkittishReaction, previewGenericFearEncounter } from '../js/core/v5-talent-psychology.js';
import { planPsychology } from '../js/core/creature-psychology.js';
import { planCreatureSize } from '../js/core/creature-size.js';
import { senseTestRules, planSense } from '../js/core/creature-senses.js';
import { naturalWeaponDefaults } from '../js/core/v5-weapon-qualities.js';

// Lot v3-B : règles de combat du livre de base V5 v3 (27/10/2026).
const subject = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, I: 40, FM: 40, Soc: 40, Int: 40 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const q = (id, parameter) => ({ id, ...(parameter === undefined ? {} : { parameter }) });
const ranged = ({ actor = subject('a'), target = subject('b'), context = {}, qualities = [], defense, action = {}, ...extra } = {}) => previewResolution({
  actor, target, roll: 35, baseRevision: 0, action: { type: 'attack', attr: 'CT', base: 50, damage: 3, qualities, ...action },
  ...(defense ? { defense } : {}), attackContext: { ranged: true }, v5: { kind: 'ranged', context }, ...extra });
const meleeDefense = { type: 'defense', label: 'Corps à corps', attr: 'CC', base: 50, roll: 40, v5: { kind: 'melee' } };
const dodgeDefense = { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: 30 };
const mods = preview => Object.fromEntries(preview.test.details.modifiers.map(row => [row.id, row.amount]));
const refusal = /Confirmer la règle autorisant cette défense/;

test('v3-B surpris-tir — cible Surprise : +2 DR au tir (p.166)', () => {
  const p = ranged({ target: subject('b', { states: [{ key: 'surpris', level: 1 }] }) });
  assert.equal(mods(p)['target:surprised-ranged'], 2);
});

test('v3-B tir-engage — un tir contre un adversaire engagé avec le tireur se résout comme une mêlée (p.165)', () => {
  const engaged = ranged({ defense: meleeDefense, context: { targetEngaged: true, engagedWithShooter: true } });
  assert.equal(engaged.test.advantage.disadvantage.some(row => row.id === 'target-engaged'), false, 'ne compte pas comme un tir dans la mêlée');
  assert.equal(engaged.unresolved.some(row => refusal.test(row)), false, 'Corps à corps opposé sans confirmation MJ');
  assert.equal(engaged.opposition?.mode, 'opposed');
  const alone = ranged({ defense: meleeDefense, context: { engagedWithShooter: true } });
  assert.equal(alone.unresolved.some(row => refusal.test(row)), false);
  // Tir dans une mêlée dont le tireur ne fait pas partie : Désavantage, défense de mêlée toujours refusée.
  const intoMelee = ranged({ defense: meleeDefense, context: { targetEngaged: true } });
  assert.equal(intoMelee.test.advantage.disadvantage.some(row => row.id === 'target-engaged'), true);
  assert.equal(intoMelee.unresolved.some(row => refusal.test(row)), true);
  // Pistolet : règle conservée.
  const pistol = ranged({ defense: meleeDefense, qualities: [q('pistolet')], context: { targetEngaged: true } });
  assert.equal(pistol.test.advantage.disadvantage.some(row => row.id === 'target-engaged'), false);
  assert.equal(pistol.unresolved.some(row => refusal.test(row)), false);
});

test('v3-B esquive-tir — Esquive contre un tir : Bonus d’Initiative mètres ou bouclier de 2 PA (p.165)', () => {
  const p = ranged({ defense: dodgeDefense });
  const line = p.unresolved.find(row => refusal.test(row));
  assert.ok(line, 'la confirmation MJ reste demandée');
  assert.match(line, /Bonus d’Initiative/);
  assert.match(line, /4 m/, 'Initiative 40 : Bonus d’Initiative 4');
  assert.match(line, /bouclier de 2 PA/);
  assert.equal(ranged({ defense: dodgeDefense, context: { rangedOppositionAllowed: true } }).unresolved.some(row => refusal.test(row)), false);
});

test('v3-B bout-portant — pas de bout portant si la portée courte vaut 4 m ou moins (p.302)', () => {
  assert.equal(computeV5WeaponRangeBands(20).pointBlankYards, 4);
  assert.equal(computeV5WeaponRangeBands(10).pointBlankYards, 4, 'courte 5 m : bout portant conservé');
  assert.equal(computeV5WeaponRangeBands(8).pointBlankYards, null, 'courte exactement 4 m');
  assert.equal(computeV5WeaponRangeBands(6).pointBlankYards, null);
  assert.equal(computeV5WeaponRangeBands('BF × 2', { caracs: { F: 30 } }).pointBlankYards, null, 'arme de jet BF × 2, BF 3 : portée 6');
  assert.equal(computeV5WeaponRangeBands('BF × 2', { caracs: { F: 50 } }).pointBlankYards, 4, 'BF 5 × 2 = 10 : courte 5 m');
  const none = ranged({ context: { shotRange: 'point-blank', weaponRangeYards: 8 } });
  assert.equal(mods(none)['range:point-blank'], undefined, 'pas de +2 DR');
  assert.ok(none.unresolved.some(row => /bout portant/i.test(row)));
  const some = ranged({ context: { shotRange: 'point-blank', weaponRangeYards: 20 } });
  assert.equal(mods(some)['range:point-blank'], 2);
  assert.deepEqual(some.unresolved, []);
});

const repeaterWeapon = (shots = 3) => ({ id: 'rep', kind: 'weapon', name: 'Arquebuse à répétition', category: 'Poudre noire', damage: '+4', range: '50',
  keywords: [{ id: 'a-repetition', parameter: '3' }], extensions: { v5: { reloadState: { revision: 1, repeaterRating: 3, shotsRemaining: shots,
    reloadSuccesses: 3, accumulatedSuccesses: 0, reloading: false, requiresReload: false } } } });
const repeaterShot = (context, shots) => ranged({ actor: subject('a', { equipment: [repeaterWeapon(shots)] }), qualities: [q('a-repetition', '3')],
  action: { extensions: { fiche: { equipmentId: 'rep' } } }, context });

test('v3-B repetition — tir double : deux tirs sur la même cible à −1 DR en une Action (p.305)', () => {
  const plain = repeaterShot({}, 3);
  const doubled = repeaterShot({ repeaterDoubleShot: true }, 3);
  assert.equal(mods(plain)['quality:repeater-double'], undefined);
  assert.equal(mods(doubled)['quality:repeater-double'], -1);
  assert.equal(doubled.test.sl, plain.test.sl - 1);
  assert.equal(doubled.weaponReload.after.shotsRemaining, 2, 'chaque tir du couple consomme une munition');
  // Le premier tir réserve les deux munitions ; le second (gratuit) en demande une seule.
  assert.ok(repeaterShot({ repeaterDoubleShot: true }, 1).unresolved.some(row => /deux tirs/i.test(row)));
  const second = repeaterShot({ repeaterDoubleShot: true, repeaterSecondShot: true }, 1);
  assert.equal(second.unresolved.some(row => /deux tirs/i.test(row)), false);
  assert.equal(mods(second)['quality:repeater-double'], -1);
  assert.equal(second.weaponReload.after.shotsRemaining, 0);
  // Arme sans À répétition : refusé.
  const bare = ranged({ context: { repeaterDoubleShot: true } });
  assert.ok(bare.unresolved.some(row => /À répétition/.test(row)));
});

test('v3-B repetition — le second tir est une attaque gratuite sans Élan, une fois par Tour (store)', async () => {
  let saved = null;
  const persistence = { load: async () => structuredClone(saved), saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence, storage: null }); await store.ready;
  const shooter = subject('a', { equipment: [repeaterWeapon(3)], extensions: { v5: { hasMomentum: false } } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'v3b', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [shooter, subject('b')] } });
  const base = id => ({ resolutionId: id, actorId: 'a', targetId: 'b', roll: 25, action: { type: 'attack', attr: 'CT', base: 60, damage: 4,
    extensions: { fiche: { equipmentId: 'rep' } } }, attackContext: { ranged: true } });
  const first = store.previewResolution({ ...base('rep-1'), v5: { kind: 'ranged', context: { repeaterDoubleShot: true } } });
  assert.equal(first.ready, true, JSON.stringify(first.unresolved));
  assert.equal((await store.applyResolution(first)).status, 'applied');
  const second = store.previewResolution({ ...base('rep-2'), v5: { kind: 'ranged', extraAttack: true,
    context: { repeaterDoubleShot: true, repeaterSecondShot: true, freeAttackTalent: 'repeater-double' } } });
  assert.equal(second.actionCosts.ready, true, JSON.stringify(second.actionCosts));
  assert.equal(second.actionCosts.paid.length, 0, 'aucun Élan dépensé pour le second tir');
  assert.equal((await store.applyResolution(second)).status, 'applied');
  const third = store.previewResolution({ ...base('rep-3'), v5: { kind: 'ranged', extraAttack: true,
    context: { repeaterDoubleShot: true, repeaterSecondShot: true, freeAttackTalent: 'repeater-double' } } });
  assert.equal(third.actionCosts.ready, false, 'un seul second tir par Tour');
});

test('v3-B peur-elan — sous la Peur, l’Élan est perdu et ne se regagne pas (p.183)', async () => {
  const fear = previewGenericFearEncounter({ author: subject('m'), target: subject('b'), rating: 2 }).addedStates[0];
  const afraid = subject('b', { states: [fear], extensions: { v5: { hasMomentum: true } } });
  assert.equal(hasMomentum(withMomentum(afraid, true)), false, 'pas de regain');
  assert.equal(hasMomentum(loseMomentumUnderFear(afraid)), false, 'l’Élan possédé est perdu');
  assert.equal(hasMomentum(loseMomentumUnderFear(subject('b', { extensions: { v5: { hasMomentum: true } } }))), true, 'sans Peur, rien ne change');
  // Événement pur : acquérir la Peur retire l’Élan.
  assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: 'e', type: 'fearAcquired' }] }).after, false);
  assert.equal(previewMomentumEvents({ hasMomentum: false, frightened: true, events: [{ id: 'e', type: 'opposedMeleeWon' }] }).after, false);
  assert.equal(previewMomentumEvents({ hasMomentum: false, events: [{ id: 'e', type: 'opposedMeleeWon' }] }).after, true);
  // Store : la Peur d’une créature retire l’Élan déjà possédé.
  let saved = null;
  const persistence = { load: async () => structuredClone(saved), saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence, storage: null }); await store.ready;
  const monster = subject('m', { camp: 'ennemi', traits: ['Fear (1)'], extensions: { v5: {} } });
  const hero = subject('h', { camp: 'pj', extensions: { v5: { hasMomentum: true } } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'v3b-fear', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'h', order: ['h', 'm'], participants: [hero, monster] } });
  const done = await store.applyCreaturePsychology('m', 'fear', { targetId: 'h' });
  assert.equal(done.ok, true, done.message);
  const after = store.listParticipants().find(row => row.id === 'h');
  assert.ok(after.states.some(row => row.key === 'fear-of-talent'));
  assert.equal(after.extensions.v5.hasMomentum, false);
});

test('v3-B psycho-debut — rappel : Tests de psychologie au début du Tour, avant Mouvement et Action (p.183)', () => {
  const p = previewResolution({ actor: subject('a', { skills: [] }), roll: 30, action: { type: 'skill', attr: 'FM', base: 40, label: 'Calme' },
    v5: { kind: 'test', context: { psychologyKind: 'fear' } } });
  assert.ok((p.reminders || []).some(row => /début du Tour/i.test(row) && /Mouvement/.test(row)), JSON.stringify(p.reminders));
  const plain = previewResolution({ actor: subject('a'), roll: 30, action: { type: 'skill', attr: 'FM', base: 40, label: 'Calme' }, v5: { kind: 'test', context: {} } });
  assert.equal((plain.reminders || []).some(row => /début du Tour/i.test(row)), false);
});

const riposter = () => subject('b', { talents: [{ id: 'talent-riposte', status: 'resolved', rank: 1 }] });
test('v3-B riposte — une seule fois par Round (p.124)', async () => {
  let saved = null;
  const persistence = { load: async () => structuredClone(saved), saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence, storage: null }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'v3b-riposte', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [subject('a'), riposter()] } });
  const raw = id => ({ resolutionId: id, actorId: 'a', targetId: 'b', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 41,
    defense: { base: 60, roll: 24, damage: 5, v5: { kind: 'melee' } }, v5: { kind: 'melee' } });
  const first = store.previewResolution(raw('rip-1'));
  assert.equal(first.hit, false);
  assert.ok(first.defenderDamage, 'première Riposte du Round');
  assert.equal((await store.applyResolution(first)).status, 'applied');
  const second = store.previewResolution(raw('rip-2'));
  assert.equal(second.defenderDamage, null, 'pas de seconde Riposte au même Round');
  assert.ok((second.reminders || []).some(row => /Riposte/.test(row) && /Round/.test(row)));
  await store.nextTurn?.();
});

test('v3-B ambidextre — l’attaque de seconde arme ne coûte pas d’Élan mais en exige un (p.119)', async () => {
  const weapon = (id, name) => ({ id, baseId: 'custom-model', catalogVersion: 'fixture-v1', kind: 'weapon', name, category: 'Base', damage: 'BF+4', reach: 'Moyenne',
    range: '', ap: null, locations: [], layer: 'none', keywords: [], notes: '', source: 'Campagne', custom: true, grip: 'one-hand' });
  const run = async momentum => {
    let saved = null;
    const persistence = { load: async () => structuredClone(saved), saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
    const store = createStore({ persistence, storage: null }); await store.ready;
    const actor = subject('a', { equipment: [weapon('sword', 'Épée'), weapon('axe', 'Hache')], talents: [{ id: 'talent-dual-wielder', name: 'Maniement de deux armes', status: 'resolved', rank: 1 }],
      extensions: { v5: { hasMomentum: false } } });
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'v3b-dual', turnIndex: 1 } },
      combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [actor, subject('b')] } });
    const hit = (id, extra = {}) => ({ resolutionId: id, actorId: 'a', targetId: 'b', roll: 25, defense: { base: 35, roll: 80, v5: { kind: 'melee', choice: 'keep' } },
      v5: { kind: 'melee', choice: 'keep', ...extra } });
    const primary = store.previewResolution({ ...hit('dual-primary'), action: { type: 'attack', attr: 'CC', base: 60, damage: 5, extensions: { fiche: { equipmentId: 'sword' } } } });
    assert.equal((await store.applyResolution(primary)).status, 'applied');
    await store.updateParticipant('a', { extensions: { v5: { hasMomentum: momentum } } });
    return store.previewResolution({ ...hit('dual-second', { extraAttack: true, context: { freeAttackTalent: 'dual-wielder', dualWielding: true, secondWeaponAttack: true, weaponId: 'axe', primaryResolutionId: 'dual-primary' } }),
      action: { type: 'attack', attr: 'CC', base: 60, damage: 5, extensions: { fiche: { equipmentId: 'axe' } } } });
  };
  const withMomentumPreview = await run(true);
  assert.equal(withMomentumPreview.actionCosts.ready, true);
  assert.equal(withMomentumPreview.actionCosts.paid.length, 0, 'aucun Élan dépensé');
  const without = await run(false);
  assert.equal(without.actionCosts.ready, false, 'sans Élan, pas d’attaque de seconde arme');
  // Fonction pure.
  assert.equal(previewMomentumCost({ hasMomentum: false, paidExtraAttackUsedThisTurn: false, extraAttack: true, waived: true, requiresMomentum: true }).allowed, false);
  assert.equal(previewMomentumCost({ hasMomentum: true, paidExtraAttackUsedThisTurn: false, extraAttack: true, waived: true, requiresMomentum: true }).nextMomentum, true);
});

test('v3-B esquive-melee — l’Esquive en mêlée : ±5 DR sur maladresse et critique, ni Élan ni victoire de mêlée (p.164)', () => {
  const run = (roll, defenseRoll) => previewResolution({ actor: subject('a'), target: subject('b', { extensions: { v5: { hasMomentum: true } } }),
    action: { type: 'attack', attr: 'CC', base: 60, damage: 4 }, roll, defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: defenseRoll }, v5: { kind: 'melee', choice: 'keep' } });
  const fumble = run(25, 77);
  assert.equal(fumble.defenderTest.sl, -5);
  assert.equal(fumble.defenderTest.fumble, true);
  const critical = run(25, 22);
  assert.equal(critical.defenderTest.sl, 5);
  assert.equal(critical.defenderTest.critical, true);
  const dodgeWins = run(99, 95);
  assert.equal(dodgeWins.opposition.winner, 'attacker', 'maladresse de l’attaquant à −3 DR contre −5 DR : l’attaquant gagne');
  const won = run(70, 22);
  assert.equal(won.hit, false);
  const dodgerMomentum = won.momentum.find(row => row.participantId === 'b');
  assert.equal(dodgerMomentum?.after ?? true, true, 'gagner par Esquive ne donne pas d’Élan et n’en retire pas');
  assert.equal(dodgerMomentum?.details?.some(row => row.effect === 'gain') ?? false, false);
});

test('v3-B maladresse-oppose — la maladresse de mêlée ne change pas les DR : le Test opposé se résout normalement (p.130)', () => {
  const p = previewResolution({ actor: subject('a'), target: subject('b'), action: { type: 'attack', attr: 'CC', base: 60, damage: 4 }, roll: 99,
    defense: { type: 'defense', label: 'Corps à corps', attr: 'CC', base: 30, roll: 95, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep' } });
  assert.equal(p.test.fumble, true);
  assert.equal(p.test.sl, -3, 'pas de plancher −5 pour un Test de mêlée');
  assert.equal(p.hit, true, 'maladresse mais adversaire plus bas : l’attaquant remporte l’opposition');
});

test('v3-B souille — Désavantage aux Tests d’Endurance contre les Plaies purulentes (p.185)', () => {
  const soiled = subject('a', { states: [{ key: 'souille', level: 1 }] });
  const endurance = context => previewResolution({ actor: soiled, roll: 30, action: { type: 'skill', attr: 'E', base: 40, label: 'Endurance' }, v5: { kind: 'test', context } });
  const festering = endurance({ festeringWounds: true });
  assert.equal(festering.test.advantage.disadvantage.some(row => row.id === 'besmirched'), true);
  const other = endurance({ usesFellowship: false });
  assert.equal(other.test.advantage.disadvantage.some(row => row.id === 'besmirched'), false);
  const clean = previewResolution({ actor: subject('a'), roll: 30, action: { type: 'skill', attr: 'E', base: 40, label: 'Endurance' }, v5: { kind: 'test', context: { festeringWounds: true } } });
  assert.equal(clean.test.advantage.disadvantage.length, 0, 'sans Souillé, rien');
});

test('v3-B perturbant — seuls les ennemis vivants subissent −2 DR (p.358)', () => {
  const owner = subject('m', { camp: 'ennemi', traits: ['Distracting'] });
  const hero = subject('h', { camp: 'pj' });
  const ally = subject('x', { camp: 'ennemi' });
  const rules = actor => senseTestRules({ actor, opponent: owner, participants: [owner, hero, ally], context: { distractingInRange: true } }).modifiers;
  assert.equal(rules(hero).some(row => row.id === 'sense:distracting' && row.amount === -2), true);
  assert.equal(rules(ally).length, 0, 'un allié du Perturbant n’est pas touché');
  assert.match(planSense(owner, 'distracting').reminders.join(' '), /ennemis vivants/);
});

test('v3-B allonge — armes naturelles : Personnelle jusqu’à Grande, Courte pour Énorme, Moyenne pour Monstrueuse (p.318)', () => {
  const reach = size => planCreatureSize(subject('m', { traits: [`Size (${size})`] })).naturalReach.key;
  assert.deepEqual(['Small', 'Average', 'Large', 'Enormous', 'Monstrous'].map(reach), ['personal', 'personal', 'personal', 'short', 'average']);
  assert.equal(naturalWeaponDefaults({ size: 'enormous' }).reach, 'short');
  assert.equal(naturalWeaponDefaults({ size: 'monstrous' }).reach, 'average');
  assert.equal(naturalWeaponDefaults({ size: 'monstrous', reach: 'Longue' }).reach, 'Longue', 'allonge imprimée respectée');
  assert.equal(naturalWeaponDefaults({}).reach, 'personal');
});

test('v3-B taille — Grande +BF, Énorme +2×BF, Monstrueuse +3×BF ; pas de double comptage avec un profil imprimé (p.360)', () => {
  const bonus = (size, printedProfile) => planCreatureSize(subject('m', { traits: [`Size (${size})`], caracs: { F: 50, E: 30, Ag: 30, I: 30 } }), { printedProfile }).damage.bonus;
  assert.deepEqual(['Large', 'Enormous', 'Monstrous'].map(size => bonus(size, false)), [5, 10, 15]);
  assert.deepEqual(['Large', 'Enormous', 'Monstrous'].map(size => bonus(size, true)), [0, 0, 0], 'profil imprimé : aucun ajout');
});

test('v3-B ombrageux — +1 Brisé au lieu de 3 (p.361)', () => {
  const horse = subject('m', { traits: ['Skittish'] });
  assert.deepEqual(planPsychology(horse, 'skittish').effects[0].conditions, [{ name: 'Brisé', level: 1 }]);
  const brisé = previewSkittishReaction({ subject: horse, trigger: 'noise', round: 1 }).participant.states.filter(row => row.key === 'brise').reduce((sum, row) => sum + row.level, 0);
  assert.equal(brisé, 1);
});
