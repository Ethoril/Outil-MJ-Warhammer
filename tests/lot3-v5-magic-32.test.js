import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import {
  calculateEffectiveStats,
  calculateEffectiveMagicAP,
  calculateEffectiveWard,
  applySpellEffects,
  expireSpellEffects,
  resolveMagicMissile,
  resolveSpellDamage,
  resolveTouchOpposition,
  resolveSpellHealing
} from '../js/core/v5-magic-effects.js';
import {
  LORE_ATTRIBUTES,
  normalizeLoreId,
  isTargetWearingMetalArmor,
  isTargetUndead,
  isTargetDaemon,
  hasArcaneMagicLore,
  previewLoreAttribute,
  applyLoreAttribute
} from '../js/core/v5-magic-attributes.js';
import {
  BEAST_PROFILES,
  previewBeastForm,
  applyBeastForm,
  revertBeastForm,
  previewVerdantApotheosis,
  applyVerdantApotheosis,
  previewDaemonbane,
  applyDaemonbane,
  previewHandOfGlory,
  applyHandOfGlory,
  calculateSapheryWard,
  testSapheryWard,
  applyScytheOfShyishRules
} from '../js/core/v5-magic-arbitrations.js';

function createParticipant(id, name, overrides = {}) {
  return {
    id,
    name,
    caracs: { CC: 40, CT: 30, F: 35, E: 42, I: 35, Ag: 32, Dex: 30, Int: 54, FM: 52, Soc: 30, M: 4 },
    hp: 14,
    maxHp: 14,
    armor: { head: 1, body: 2, arms: 1, legs: 1 },
    states: [],
    traits: [],
    talents: [],
    equipment: [],
    fortune: 2,
    ...overrides
  };
}

// ============================================================================
// 1. MOTEUR DES EFFETS MAGIQUES COMMUNS (v5-magic-effects.js)
// ============================================================================

test('Effets V5 — Règle de non-cumul : meilleur bonus et pire malus par caractéristique', () => {
  const baseStats = { CC: 40, F: 30, E: 35 };

  const effects = [
    { statModifiers: { F: 10, CC: -10 } },
    { statModifiers: { F: 20, CC: -20 } }, // F: max(10, 20) = +20 ; CC: min(-10, -20) = -20
    { statModifiers: { F: -5, E: 15 } }    // F: min(-5) = -5 ; net F = +20 - 5 = +15 ; E: +15
  ];

  const effective = calculateEffectiveStats(baseStats, effects);

  assert.equal(effective.F, 45, 'F = 30 + 20 (meilleur bonus) - 5 (pire malus) = 45');
  assert.equal(effective.CC, 20, 'CC = 40 + 0 (pas de bonus) - 20 (pire malus) = 20');
  assert.equal(effective.E, 50, 'E = 35 + 15 = 50');
});

test('Effets V5 — Non-cumul : exception explicite stackable (Bénédiction de Lileath)', () => {
  const baseStats = { FM: 50 };

  const effects = [
    { statModifiers: { FM: 10 } },
    { statModifiers: { FM: 20 } }, // meilleur bonus normal = +20
    { statModifiers: { FM: 10 }, stackable: true, spellId: 'benediction-de-lileath' } // s'additionne
  ];

  const effective = calculateEffectiveStats(baseStats, effects);
  assert.equal(effective.FM, 80, 'FM = 50 + 20 (meilleur non-cumulable) + 10 (stackable) = 80');
});

test('Effets V5 — Application et Expiration sans restaurer un vieux snapshot ni guérir les PV', () => {
  const wizard = createParticipant('wiz-1', 'Elfe', { hp: 14, maxHp: 14 });

  // 1. Appliquer un sort conférant +20 F et +2 PA magiques
  const applied = applySpellEffects(wizard, {
    spellId: 'wyssan-might',
    spellName: 'Force Sauvage de Wyssan',
    duration: 3,
    statModifiers: { F: 20 },
    apModifiers: { all: 2 },
    ward: 7
  }, { round: 1 });

  assert.equal(applied.participant.caracs.F, 55, 'F passe de 35 à 55');
  assert.equal(applied.participant.armor.body, 4, 'PA corps passe de 2 à 4');
  assert.equal(applied.participant.extensions.v5.ward, 7, 'Protection 7+ active');

  // 2. Le personnage subit 8 points de dégâts pendant que le sort est actif
  applied.participant.hp = 6;

  // 3. Expiration du sort au round 4
  const expired = expireSpellEffects(applied.participant, { spellId: 'wyssan-might', currentRound: 4 });

  assert.equal(expired.participant.caracs.F, 35, 'F restaurée à 35');
  assert.equal(expired.participant.armor.body, 2, 'PA corps restaurés à 2');
  assert.equal(expired.participant.extensions.v5.ward, undefined, 'Protection retirée');
  assert.equal(expired.participant.hp, 6, 'PV restent à 6 : l’expiration ne restaure PAS les PV perdus !');
});

test('Effets V5 — Projectiles magiques : BFM + dégâts du sort, DR de lancer NON ajoutés, localisation inversée', () => {
  const caster = createParticipant('caster-1', 'Sorcier Flamboyant', {
    caracs: { FM: 55, Int: 50, E: 40 } // BFM = 5
  });

  const target = createParticipant('target-1', 'Guerrier Orque', {
    caracs: { E: 45 }, // BE = 4
    armor: { head: 2, body: 3, arms: 1, legs: 1 },
    hp: 18
  });

  // Sort : Flèche Écarlate (damage: 4)
  // Jet d'incantation = 32 -> Inversion = 23 -> Bras gauche (loc: ARM, ap: 1)
  // DR de lancer = 4 DR (ne doivent PAS s'ajouter aux dégâts !)
  const missile = resolveMagicMissile({
    caster,
    target,
    spell: { name: 'Flèche Écarlate', damage: 4 },
    roll: 32,
    castingSl: 4,
    overcastDamage: 0
  });

  assert.equal(missile.bfm, 5);
  assert.equal(missile.spellDamage, 4);
  assert.equal(missile.rawDamage, 9, 'Dégâts bruts = BFM (5) + Sort (4) = 9 (les 4 DR de lancer ne sont pas ajoutés)');
  assert.equal(missile.reversedRoll, 23);
  assert.equal(missile.locationKey, 'ARM');
  assert.equal(missile.be, 4);
  assert.equal(missile.ap, 1);
  assert.equal(missile.absorption, 5, 'Absorption = BE (4) + PA bras (1) = 5');
  assert.equal(missile.finalDamage, 4, 'Dégâts finaux = 9 - 5 = 4');
  assert.equal(missile.targetNewHp, 14, 'PV cible passent de 18 à 14');
});

test('Effets V5 — Formules explicites (8 + DR) : respectent leur propre formule sans second ajout de BFM', () => {
  const caster = createParticipant('caster-1', 'Sorcier', { caracs: { FM: 52 } }); // BFM = 5
  const target = createParticipant('target-1', 'Cible', { caracs: { E: 30 }, armor: { body: 1 }, hp: 12 }); // BE = 3, PA = 1 -> absorption = 4

  const res = resolveSpellDamage({
    caster,
    target,
    formula: '8 + DR',
    sl: 3,
    roll: 55 // loc: BODY
  });

  assert.equal(res.rawDamage, 11, 'Formule 8 + DR avec DR=3 donne 11, sans ajouter BFM 5');
  assert.equal(res.absorption, 4, 'Absorption BE (3) + PA (1) = 4');
  assert.equal(res.finalDamage, 7, 'Dégâts nets = 11 - 4 = 7');
});

test('Effets V5 — Sorts de contact : jet d’opposition de contact sans dégâts d’arme', () => {
  const caster = createParticipant('caster-1', 'Sorcier');
  const target = createParticipant('target-1', 'Ennemi');

  // Contact réussi : Lanceur fait 25 sous 50 (2 DR), Défenseur fait 42 sous 40 (-1 DR)
  const opposition = resolveTouchOpposition({
    caster,
    target,
    casterSkillScore: 50,
    casterRoll: 25,
    defenderSkillScore: 40,
    defenderRoll: 42
  });

  assert.equal(opposition.hit, true, 'Le contact réussit');
  assert.equal(opposition.reversedRoll, 52, 'Jet inversé 25 -> 52');
  assert.equal(opposition.locationKey, 'BODY');
});

test('Effets V5 — Soins magiques : dans la limite de Bmax et réduction d’états Hémorragique', () => {
  const target = createParticipant('target-1', 'Blessé', {
    hp: 5,
    maxHp: 12,
    states: [{ key: 'hemorragique', name: 'Hémorragique', level: 3 }]
  });

  const res = resolveSpellHealing({ target, amount: 5 });

  assert.equal(res.participant.hp, 10, 'PV passent de 5 à 10 (limite 12)');
  assert.equal(res.participant.states.find(s => s.key === 'hemorragique')?.level ?? 0, 0, 'Les 5 B soignées retirent les 3 Hémorragique');
});

// ============================================================================
// 2. LES 8 ATTRIBUTS DE DOMAINE V5 + HAUTE MAGIE (v5-magic-attributes.js)
// ============================================================================

test('Attributs V5 — Bêtes (Ghur) : Peur (1) pendant BFM Rounds', () => {
  const caster = createParticipant('caster-1', 'Chaman', { caracs: { FM: 58 } }); // BFM = 5
  const preview = previewLoreAttribute({ lore: 'beasts', caster });

  assert.equal(preview.casterEffects.trait, 'Peur (1)');
  assert.equal(preview.casterEffects.durationRounds, 5);
});

test('Attributs V5 — Mort (Shyish) : 1 état Exténué sur cible vivante (max 1)', () => {
  const caster = createParticipant('caster-1', 'Nécromancien');
  const livingTarget = createParticipant('target-1', 'Humain');
  const undeadTarget = createParticipant('target-2', 'Squelette', { isUndead: true });

  const preview = previewLoreAttribute({
    lore: 'death',
    caster,
    targets: [livingTarget, undeadTarget]
  });

  assert.ok(preview.targetEffects.has('target-1'), 'Cible vivante affectée');
  assert.equal(preview.targetEffects.get('target-1').addCondition.name, 'Exténué');
  assert.ok(!preview.targetEffects.has('target-2'), 'Mort-vivant non affecté par l’état Exténué de Mort');
});

test('Attributs V5 — Feu (Aqshy) : 1 état Enflammé sauf si Arcane Magic (Fire)', () => {
  const caster = createParticipant('caster-1', 'Pyromancien');
  const normalTarget = createParticipant('target-1', 'Guerrier');
  const fireWizard = createParticipant('target-2', 'Mage de Feu', {
    talents: [{ id:'talent-arcane-magic',status:'resolved',rank:1,specialization:'Aqshy' }]
  });

  const preview = previewLoreAttribute({
    lore: 'fire',
    caster,
    targets: [normalTarget, fireWizard]
  });

  assert.ok(preview.targetEffects.has('target-1'), 'Cible normale enflammée');
  assert.ok(!preview.targetEffects.has('target-2'), 'Mage de Feu immunisé à l’attribut de Feu');
});

test('Attributs V5 — Cieux (Azyr) : ignore PA de métal et +1 Point de Chance jusqu’au prochain Tour', () => {
  const caster = createParticipant('caster-1', 'Astramancien', { fortune: 2 });
  const preview = previewLoreAttribute({ lore: 'heavens', caster });

  assert.equal(preview.damageRules.ignoreMetalAp, true, 'Ignore PA métal');
  assert.equal(preview.casterEffects.gainFortune, 1, '+1 Fortune temporaire');
  assert.equal(preview.casterEffects.expiry, 'startOfNextTurn');
});

test('Attributs V5 — Vie (Ghyran) : retire Hémorragique/Exténué et BFM Blessures directes vs Morts-vivants', () => {
  const caster = createParticipant('caster-1', 'Druide Jade', { caracs: { FM: 54 } }); // BFM = 5
  const ally = createParticipant('ally-1', 'Allié', {
    states: [{ key: 'hemorragique', name: 'Hémorragique', level: 2 }, { key: 'extenue', name: 'Exténué', level: 1 }]
  });
  const zombie = createParticipant('zombie-1', 'Zombie', { isUndead: true });

  const preview = previewLoreAttribute({
    lore: 'life',
    caster,
    targets: [ally, zombie]
  });

  assert.deepEqual(preview.targetEffects.get('ally-1').removeConditions, ['hemorragique', 'extenue']);
  assert.equal(preview.damageRules.extraDirectWoundsPerTarget.get('zombie-1'), 5, 'Mort-vivant subit BFM (5) Blessures directes');
});

test('Attributs V5 — Lumière (Hysh) : Aveuglé (sauf Arcane Light) et BI Blessures directes vs Démons/Morts-vivants', () => {
  const caster = createParticipant('caster-1', 'Hiérophante', { caracs: { Int: 62 } }); // BI = 6
  const daemon = createParticipant('daemon-1', 'Démon Mineur', { isDaemon: true });

  const preview = previewLoreAttribute({
    lore: 'light',
    caster,
    targets: [daemon]
  });

  assert.equal(preview.targetEffects.get('daemon-1').addCondition.name, 'Aveuglé');
  assert.equal(preview.damageRules.extraDirectWoundsPerTarget.get('daemon-1'), 6, 'Démon subit BI (6) Blessures directes');
});

test('Attributs V5 — Métal (Chamon) : ignore les PA de métal et les ajoute aux dégâts (p. 252), plus de +BE', () => {
  const caster = createParticipant('caster-1', 'Alchimiste');
  const knight = createParticipant('knight-1', 'Chevalier en plates', {
    caracs: { E: 45 }, // BE = 4
    equipment: [{ kind: 'armour', name: 'Armure de plates', layer: 'rigid', ap: 3, locations: ['body'] }]
  });

  const preview = previewLoreAttribute({
    lore: 'metal',
    caster,
    targets: [knight]
  });

  assert.equal(preview.damageRules.ignoreMetalAp, true);
  assert.equal(preview.damageRules.metalDamageBonus, true, 'les PA métalliques de la localisation touchée s’ajoutent');
  assert.equal(preview.damageRules.extraDamagePerTarget.has('knight-1'), false, 'aucun bonus de BE');
});

test('Attributs V5 — Ombres (Ulgu) : sort de protection confère +2 DR en Discrétion', () => {
  const caster = createParticipant('caster-1', 'Illusionniste');
  const preview = previewLoreAttribute({
    lore: 'shadow',
    caster,
    spell: { name: 'Manteau d’Ombre', isProtection: true, duration: 'FM Rounds' }
  });

  assert.equal(preview.casterEffects.testModifiers[0].sl, 2);
  assert.equal(preview.casterEffects.testModifiers[0].skill, 'Discrétion');
});

test('Attributs V5 — Haute Magie (Qhaysh) : choix d’un attribut parmi les 8 Domaines', () => {
  const caster = createParticipant('teclis', 'Haut Mage');
  const knight = createParticipant('knight-1', 'Chevalier', {
    caracs: { E: 40 },
    hasMetalArmor: true
  });

  const preview = previewLoreAttribute({
    lore: 'high',
    chosenLore: 'metal',
    caster,
    targets: [knight]
  });

  assert.equal(preview.lore, 'metal', 'Attribut Métal sélectionné via Haute Magie');
  assert.equal(preview.damageRules.ignoreMetalAp, true);
  assert.equal(preview.damageRules.metalDamageBonus, true);
});

// ============================================================================
// 3. ARBITRAGES DE SORTS ET CAS PARTICULIERS (v5-magic-arbitrations.js)
// ============================================================================

test('Arbitrages V5 — Forme bestiale (et Jade) : remplacement profil, conservation des dégâts et critiques au retour', () => {
  const caster = createParticipant('druid-1', 'Druide', {
    caracs: { CC: 30, F: 30, E: 40, FM: 36, M: 4 }, // E = 40 -> durée 40 min
    hp: 12,
    maxHp: 12
  });

  const boar = BEAST_PROFILES.boar; // Sanglier (p. 325) : M 7, F 35, E 40, Taille Moyenne ; Blessures 3 + 2 × 4 + BFM 3 = 14

  // 1. Transformation en Sanglier (Forme bestiale Jade)
  const transformed = applyBeastForm(caster, boar, { isJade: true });
  assert.equal(transformed.participant.caracs.F, 35);
  assert.equal(transformed.participant.hp, 14);
  assert.equal(transformed.preview.wind, 'Ghyran');
  assert.equal(transformed.preview.lore, 'life');
  assert.equal(transformed.preview.durationMinutes, 40);

  // 2. Le Sanglier subit 6 Blessures et 1 Blessure Critique (ex: Griffe arrachée)
  transformed.participant.hp = 8;
  transformed.participant.extensions.v5.beastForm.criticalWoundsSuffered.push({ name: 'Griffe arrachée', severity: 2 });

  // 3. Retour à la forme normale
  const reverted = revertBeastForm(transformed.participant);

  assert.equal(reverted.participant.caracs.F, 30, 'Force normale restaurée');
  assert.equal(reverted.participant.hp, 6, 'PV normaux = 12 - 6 dégâts subis sous forme de sanglier = 6');
  assert.equal(reverted.woundsCarriedOver, 6);
  assert.equal(reverted.participant.criticals.length, 1, 'Le critique subi sous forme de sanglier est reporté');
  assert.equal(reverted.participant.criticals[0].name, 'Griffe arrachée');
});

test('Arbitrages V5 — Apothéose Verdoyante : 1 B par DR final (test + réserve avant surpuissance), plafonné à Bmax, exclusions', () => {
  const corpses = [
    createParticipant('c1', 'Soldat Fauché', { maxHp: 12, hp: 0, timeSinceDeathSec: 30, decapitated: false }),
    createParticipant('c2', 'Héros Tué', { maxHp: 20, hp: 0, timeSinceDeathSec: 45, decapitated: false }),
    createParticipant('c3', 'Décapité', { maxHp: 14, hp: 0, timeSinceDeathSec: 10, decapitated: true }),
    createParticipant('c4', 'Mort Ancien', { maxHp: 12, hp: 0, timeSinceDeathSec: 120, decapitated: false })
  ];

  // Incantation : Test réussi à 3 DR + 15 DR de réserve = 18 DR finaux (avant 5 DR dépensés en surpuissance)
  const preview = previewVerdantApotheosis({
    corpses,
    castingSl: 3,
    reserveSl: 15,
    overcastSpent: 5
  });

  assert.equal(preview.finalSl, 18, 'DR final = 3 + 15 = 18 (surpuissance non retranchée)');
  assert.equal(preview.admissibleCount, 2);
  assert.equal(preview.rejectedCount, 2);

  const applied = applyVerdantApotheosis(corpses, preview);
  const updated = applied.updatedCorpses;

  // C1 : Bmax 12 < 18 -> revient avec 12 B
  const c1 = updated.find(c => c.id === 'c1');
  assert.equal(c1.hp, 12, 'Plafonné à Bmax 12');
  assert.equal(c1.isDead, false);
  assert.equal(c1.extensions.v5.needsCorruptionTest, true);

  // C2 : Bmax 20 > 18 -> revient avec 18 B
  const c2 = updated.find(c => c.id === 'c2');
  assert.equal(c2.hp, 18, 'Revient avec 18 Blessures');
  assert.equal(c2.isDead, false);

  // C3 décapité -> reste mort
  const c3 = updated.find(c => c.id === 'c3');
  assert.equal(c3.hp, 0);

  // C4 mort depuis > 1 min -> reste mort
  const c4 = updated.find(c => c.id === 'c4');
  assert.equal(c4.hp, 0);
});

test('Arbitrages V5 — Fléau des Démons : E <= Int, Int < E < 2*Int, et E >= 2*Int', () => {
  const caster = createParticipant('wiz', 'Mage', { caracs: { Int: 40 } });

  // Cas 1 : E = 35 <= 40 -> Bannissement
  const demonWeak = createParticipant('d1', 'Démon Faible', { caracs: { E: 35 }, maxHp: 16 });
  const p1 = previewDaemonbane({ caster, target: demonWeak });
  assert.equal(p1.effect, 'banished');
  const a1 = applyDaemonbane(demonWeak, p1);
  assert.equal(a1.target.banished, true);
  assert.equal(a1.target.hp, 0);

  // Cas 1 bis : E = 40 (E exactement égal à Int) -> Bannissement
  const demonEqual = createParticipant('de', 'Démon Égal', { caracs: { E: 40 }, maxHp: 16 });
  const pe = previewDaemonbane({ caster, target: demonEqual });
  assert.equal(pe.effect, 'banished', 'E = Int entraîne le bannissement');

  // Cas 2 : 40 < E (60) < 80 (2*Int) -> Bmax divisées par deux
  const demonMid = createParticipant('d2', 'Démon Majeur Moyen', { caracs: { E: 60 }, maxHp: 20, hp: 20 });
  const p2 = previewDaemonbane({ caster, target: demonMid });
  assert.equal(p2.effect, 'halved-max-hp');
  assert.equal(p2.newMaxHp, 10);
  const a2 = applyDaemonbane(demonMid, p2);
  assert.equal(a2.target.maxHp, 10);
  assert.equal(a2.target.hp, 10);

  // Cas 3 : E = 80 (E exactement égal à 2*Int) -> Aucun effet principal
  const demonExactDouble = createParticipant('d3', 'Grand Démon Seuil', { caracs: { E: 80 }, maxHp: 30 });
  const p3 = previewDaemonbane({ caster, target: demonExactDouble });
  assert.equal(p3.effect, 'no-effect');

  // Cas 3 bis : E = 90 (> 2*Int) -> Aucun effet principal
  const demonHigh = createParticipant('d4', 'Grand Démon', { caracs: { E: 90 }, maxHp: 30 });
  const p4 = previewDaemonbane({ caster, target: demonHigh });
  assert.equal(p4.effect, 'no-effect');
});

test('Arbitrages V5 — Main de Gloire (+6 DR) : 4 caractéristiques, 3d10 partagé, M +2, Bmax inchangé', () => {
  const ally1 = createParticipant('a1', 'Allié 1', { caracs: { CC: 40, CT: 30, F: 35, E: 30, M: 4 }, maxHp: 12 });
  const ally2 = createParticipant('a2', 'Allié 2', { caracs: { CC: 35, CT: 40, F: 40, E: 35, M: 4 }, maxHp: 14 });

  // 4 caractéristiques choisies : CC, F, E, Ag
  // Jet 3d10 partagé = 18
  const preview = previewHandOfGlory({
    targets: [ally1, ally2],
    chosenStats: ['CC', 'F', 'E', 'Ag'],
    roll3d10: 18
  });

  assert.equal(preview.roll3d10, 18);
  assert.equal(preview.statModifiers.CC, 18);
  assert.equal(preview.statModifiers.F, 18);
  assert.equal(preview.statModifiers.E, 18);
  assert.equal(preview.statModifiers.M, 2);

  const applied = applyHandOfGlory([ally1, ally2], preview);
  const res1 = applied.updatedTargets[0];
  const res2 = applied.updatedTargets[1];

  assert.equal(res1.caracs.CC, 58);
  assert.equal(res1.caracs.E, 48);
  assert.equal(res1.caracs.M, 6);
  assert.equal(res1.maxHp, 12, 'Bmax reste STRICTEMENT inchangé à 12 malgré Endurance +18');

  assert.equal(res2.caracs.CC, 53);
  assert.equal(res2.caracs.E, 53);
  assert.equal(res2.caracs.M, 6);
  assert.equal(res2.maxHp, 14, 'Bmax reste STRICTEMENT inchangé à 14');
});

test('Arbitrages V5 — Bouclier de Saphery : pas de plancher, seuil <= 1 réussit automatiquement', () => {
  // 0 autre sort : Protection 9+
  const w0 = calculateSapheryWard(0);
  assert.equal(w0.threshold, 9);
  assert.equal(w0.automaticSuccess, false);
  assert.equal(testSapheryWard(8, w0).protected, false);
  assert.equal(testSapheryWard(9, w0).protected, true);

  // 7 autres sorts : Protection 2+
  const w7 = calculateSapheryWard(7);
  assert.equal(w7.threshold, 2);
  assert.equal(w7.automaticSuccess, false);

  // 8 autres sorts : seuil 1+ -> réussite automatique
  const w8 = calculateSapheryWard(8);
  assert.equal(w8.threshold, 1);
  assert.equal(w8.automaticSuccess, true);
  assert.equal(testSapheryWard(1, w8).protected, true, 'Réussite automatique sur n’importe quel jet');

  // 9 autres sorts : seuil 0 -> réussite automatique
  const w9 = calculateSapheryWard(9);
  assert.equal(w9.threshold, 0);
  assert.equal(w9.automaticSuccess, true);
});

test('Arbitrages V5 — Faux de Shyish : Morts-vivants engagés privés d’Avantage V5, Élan conservé', () => {
  const undeadEngaged = applyScytheOfShyishRules({
    isUndead: true,
    isEngagedWithWielder: true,
    advantageSources: [{ id: 'adv-1' }, { id: 'adv-2' }],
    hasMomentum: true
  });

  assert.equal(undeadEngaged.advantageSuppressed, true);
  assert.deepEqual(undeadEngaged.allowedAdvantages, [], 'Avantage neutralisé contre le porteur');
  assert.equal(undeadEngaged.momentumPreserved, true, 'L’Élan reste intact !');

  const livingEngaged = applyScytheOfShyishRules({
    isUndead: false,
    isEngagedWithWielder: true,
    advantageSources: [{ id: 'adv-1' }],
    hasMomentum: true
  });

  assert.equal(livingEngaged.advantageSuppressed, false, 'Cible vivante conserve ses Avantages');
});

// ============================================================================
// 4. TRANSACTIONNALITÉ DU STORE ET HISTORIQUE (store.undo / store.redo)
// ============================================================================

test('Store V5 — Application et annulation exacte (undo) des effets magiques', async () => {
  let savedState = null;
  const store = createStore({
    persistence: {
      load: async () => savedState && structuredClone(savedState),
      saveAtomic: async ({ state }) => {
        savedState = structuredClone(state);
        return { ok: true };
      }
    }
  });
  await store.ready;

  // Créer un combat avec 2 participants
  const wizard = createParticipant('wiz-1', 'Archimage');
  const target = createParticipant('tgt-1', 'Cible', { maxHp: 12, hp: 12 });

  await store.executeCommand('init-combat', draft => {
    draft.combat = {
      round: 1,
      currentActorId: 'wiz-1',
      order: ['wiz-1', 'tgt-1'],
      participants: [wizard, target]
    };
    return draft;
  });

  // 1. Appliquer un sort via store.applySpellEffects
  await store.applySpellEffects('tgt-1', {
    spellId: 'spell-buff',
    spellName: 'Bénédiction Magique',
    statModifiers: { F: 20 },
    apModifiers: { body: 2 }
  });

  const modified = store.getCombat().participants.get('tgt-1');
  assert.equal(modified.caracs.F, 55, 'F = 35 + 20 = 55');
  assert.equal(modified.armor.body, 4, 'PA body = 2 + 2 = 4');

  // 2. Annulation exacte via store.undo()
  await store.undo();

  const restored = store.getCombat().participants.get('tgt-1');
  assert.equal(restored.caracs.F, 35, 'F restaurée à 35 après undo');
  assert.equal(restored.armor.body, 2, 'PA body restaurés à 2 après undo');
});
