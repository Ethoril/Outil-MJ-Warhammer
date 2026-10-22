// Attentes WoM actualisées selon pp. 89, 134, 137, 146–149 le 13/10/2026.
/**
 * Suite de tests Phase 3.4 — Suppléments, 30 sorts elfiques, vortex & saisies MJ
 * Conforme au Cahier des charges Lot 3 et au Cadrage Magie V5.
 */

import { test } from 'node:test';
import {declaredAnswers,declaredFacts,declaredTarget,declared5BAnswers,declared5BFacts,declared5BTarget,fixtureBlade} from './helpers/lot3-declared-answers.js';
import assert from 'node:assert/strict';
import {
  getSpellContract,
  getAllSpellContracts,
  getContractChoiceOptions,
  validateSpellTargets,
  resolveVortexTrajectory,
  resolveAuxiliarySummons,
  buildFicheFollowUpReceipt,
  validateElvenArcaneRequirements,
  previewSpellExecution,
  applySpellExecution
} from '../js/core/v5-spell-contracts.js';
import { parseSpellDuration } from '../js/core/v5-magic-effects.js';
import { acquireV5Conditions } from '../js/core/v5-effects.js';
import { createStore } from '../js/core/store.js';

// ============================================================================
// 1. COUVERTURE INTÉGRALE DES 277 IDENTITÉS DE L'AUDIT (doublons D-21 retirés selon le cadrage du 11 octobre)
// ============================================================================

test('Phase 3.4 — Les 277 contrats de sorts sont présents et structurés', () => {
  const all = getAllSpellContracts().filter(c => !c.isTradition);
  assert.equal(all.length, 277, 'Exactement 277 contrats de sorts');

  const bookV5 = all.filter(c => c.isBookV5);
  const elf = all.filter(c => c.isElf);
  const wom = all.filter(c => c.isWom);
  const jade = all.filter(c => c.isJadeVariant);
  const catalogue = all.filter(c => c.isCatalogue);
  const fiche = all.filter(c => c.ficheFollowUp);

  assert.equal(bookV5.length, 116, '116 sorts V5 du livre de base (catalogue relu)');
  assert.equal(elf.length, 30, '30 sorts du supplément Haut Elfe');
  assert.equal(wom.length, 18, '18 sorts de Winds of Magic');
  assert.equal(jade.length, 1, '1 variante Jade de Forme bestiale');
  assert.equal(catalogue.length, 112, '112 sorts du catalogue général');
  assert.equal(fiche.length, 31, 'Exactement 31 sorts signalés suivi fiche');

  // Tous les contrats doivent avoir une empreinte sha256 valide
  for (const c of all) {
    assert.ok(c.sourceFingerprint && c.sourceFingerprint.startsWith('sha256:'), `Empreinte sha256 présente pour ${c.name}`);
    assert.ok(Number.isFinite(c.cn) && c.cn >= 0, `NI (CN) valide pour ${c.name}`);
    assert.ok(c.range, `Portée définie pour ${c.name}`);
    assert.ok(c.target, `Cible définie pour ${c.name}`);
    assert.ok(c.duration, `Durée définie pour ${c.name}`);
  }
});

// ============================================================================
// 2. LES 30 SORTS ELFIQUES (16 HAUTE MAGIE, 8 ARCANES, 6 PETITE MAGIE)
// ============================================================================

test('Magie Elfique — Haute Magie (16 sorts) : surpuissance, burnout et sorts clés', () => {
  const highSpells = getAllSpellContracts().filter(c => c.domain === 'high' && !c.isTradition);
  assert.equal(highSpells.length, 16, 'Exactement 16 sorts de Haute Magie');

  const actor = {
    id: 'mage-elfe',
    name: 'Teclis',
    caracs: { Int: 65, FM: 55, CC: 40, CT: 40, F: 35, E: 40, I: 50, Ag: 50, Soc: 60 },
    skills: [{ name: 'Langue (Magick)', total: 85 }],
    hp: 14,
    maxHp: 14,
    extensions: { v5: { cadaiRunes: 3, magic: { reserve: { type: 'high', sl: 10 } } } }
  };
  const target = {
    id: 'cible-1',
    name: 'Guerrier du Chaos',
    caracs: { E: 45, F: 45 },
    hp: 16,
    maxHp: 16,
    traits: ['Mort-vivant','Instable']
  };

  // 1. Extinction de l'Âme (Soul Quench) : projectile +9 de base (Supplément p. 89), et à +7 SL surpuissance devient +11
  const soulQuench = getSpellContract('Extinction de l\'Âme');
  assert.ok(soulQuench);
  assert.equal(soulQuench.cn, 7);

  // Lancer normal (sans surpuissance de 7) : projectile de base 9 + BFM(5) = 14
  const prevSoulNormal = previewSpellExecution(actor, soulQuench, [target], { roll: 35, sl: 2 });
  assert.equal(prevSoulNormal.targetResults[0].missile.spellDamage, 9, 'Dégâts de base 9 (supplément p. 89)');

  // Surpuissance à +7 SL : dégâts de base passent à 11
  const prevSoulOvercast = previewSpellExecution(actor, soulQuench, [target], {
    roll: 35,
    sl: 9,
    burnoutRoll:50, overcastSpecific: { fury: 1 }
  });
  assert.equal(prevSoulOvercast.targetResults[0].missile.spellDamage, 11, 'Variante à +7 SL devient +11 dégâts');

  // 2. Bannissement Majeur : dégâts doublés sur cible Instable
  const banish = getSpellContract('Bannissement Majeur');
  assert.ok(banish);
  const prevBanish = previewSpellExecution(actor, banish, [target], { roll: 20, sl: 3 });
  assert.equal(prevBanish.targetResults[0].damage,undefined,'HEPG p. 88 : projectile périodique, pas de dégâts au lancer');assert.equal(prevBanish.targetResults[0].temporaryEffect.roundEffect.sizeDamage.normal,8); // Dégâts Instable avant absorption : recette Store Haute Magie dédiée

  // 3. La Fortune est Capricieuse : fumbles obligatoires sur doubles
  const fortune = getSpellContract('La Fortune est Capricieuse');
  assert.ok(fortune);
  const prevFortune = previewSpellExecution(actor, fortune, [target]);
  assert.ok(prevFortune.targetResults[0].fortuneIsFickle.forceFumbleOnDoubles);
  assert.ok(prevFortune.targetResults[0].fortuneIsFickle.forbidCrits);

  // 4. Risque d'épuisement magique si surpuissance > BFM (5)
  // Dépense de 8 DR en surpuissance : 8 - 5 = 3% de risque de Burnout
  const prevBurnout = previewSpellExecution(actor, soulQuench, [target], {
    roll: 35,
    sl: 10,
    burnoutRoll:50, overcastChoices: { damage: 8 },
    burnoutRoll: 2 // <= 3% -> déclenché !
  });
  assert.ok(prevBurnout.burnout);
  assert.equal(prevBurnout.burnout.riskPercent, 3);
  assert.equal(prevBurnout.burnout.active, true);
  assert.equal(prevBurnout.burnout.days, 2);
});

test('Magie Elfique — Magie Elfique Arcanique (8 sorts) : validation des deux Vents', () => {
  const arcaneElf = getAllSpellContracts().filter(c => c.domain === 'elven-arcane');
  assert.equal(arcaneElf.length, 8, 'Exactement 8 sorts d’Arcane Elfique');

  const EXPECTED_WINDS = {
    'Enchantement Végétal (Ghyran & Chamon)': ['Ghyran', 'Chamon'],
    'Bannissement Mineur (Hysh & Shyish)': ['Hysh', 'Shyish'],
    'Alarme Magique (Azyr & Ulgu)': ['Azyr', 'Ulgu'],
    'Masque de l\'Esprit (Shyish & Ulgu)': ['Shyish', 'Ulgu'],
    'Purification du Corps (Ghyran & Hysh)': ['Ghyran', 'Hysh'],
    'Parler avec un Animal (Azyr & Ghur)': ['Azyr', 'Ghur'],
    'Voix de Fer (Aqshy & Chamon)': ['Aqshy', 'Chamon'],
    'Zone de Confort (Aqshy & Ghur)': ['Aqshy', 'Ghur']
  };

  for (const spell of arcaneElf) {
    const expected = EXPECTED_WINDS[spell.name];
    assert.ok(expected, `Sort attendu : ${spell.name}`);
    assert.deepEqual(spell.wind, expected, `Deux vents requis conformes pour ${spell.name}`);

    const reqCheck = validateElvenArcaneRequirements(spell, { lores: ['Ghyran', 'Chamon'] });
    assert.ok(reqCheck.valid);
  }
});

test('Magie Elfique — Petite Magie Elfique (6 sorts) : NI 0 et surpuissance interdite', () => {
  const pettyElf = getAllSpellContracts().filter(c => c.domain === 'elven-petty');
  assert.equal(pettyElf.length, 6, 'Exactement 6 sorts mineurs elfiques');

  for (const spell of pettyElf) {
    assert.equal(spell.cn, 0, `NI 0 pour ${spell.name}`);
    assert.equal(spell.overcast.allowed, false, `Surpuissance interdite pour ${spell.name}`);
  }

  // Flèche Bénie : enchantement d'arme temporaire +1 Dégâts, magique
  const fleche = getSpellContract('Flèche Bénie');
  assert.ok(fleche);
  assert.equal(fleche.effects.receiptFormulas.bonusDegats,'1','HEPG p. 80 : une seule munition désignée, reçu de fiche');
  assert.equal(fleche.effects.weaponDamageBonus,undefined);

  // Calme : retire Psychologie et Frénésie
  const calme = getSpellContract('Calme');
  assert.ok(calme);
  assert.equal(calme.effects.removePsychology, true);
  assert.equal(calme.effects.removeFrenzy, true);

  // Enlever la Saleté : retire Souillé
  const salete = getSpellContract('Enlever la Saleté');
  assert.ok(salete);
  assert.deepEqual(salete.effects.removeConditions, ['Souillé']);
});

// ============================================================================
// 3. LES 18 SORTS WINDS OF MAGIC
// ============================================================================

test('Winds of Magic (18 sorts) — Validations des particularités de règles', () => {
  const womSpells = getAllSpellContracts().filter(c => c.isWom);
  assert.equal(womSpells.length, 18, 'Exactement 18 sorts Winds of Magic');

  // 1. Sang Bouillonnant (Aqshy) : dégâts fixes 10 + DR, pas de second BFM
  const sang = getSpellContract('Sang Bouillonnant');
  assert.ok(sang);
  assert.equal(sang.cn, 5);
  assert.equal(sang.effects.roundEffect.damage.formula, '10 + DR');
  assert.equal(sang.effects.roundEffect.damage.ignoreAp, true);
  assert.equal(sang.effects.secondaryTest.modifierSl, -1);

  // 2. Blizzard enflammé de Ygethmor (Aqshy) : dégâts fixes 8 + DR, pas de second BFM, Athlétisme +0
  const blizzard = getSpellContract('Blizzard enflammé de Ygethmor');
  assert.ok(blizzard);
  assert.equal(blizzard.cn, 12);
  assert.equal(blizzard.effects.roundEffect.damage.formula, '8 + DR');
  assert.equal(blizzard.effects.roundEffect.phase, 'endOfRound');
  assert.equal(blizzard.effects.roundEffect.test.modifierSl, 0);

  // 3. Éveil du Bois (Ghur) : Esquive +2 SL, Enchevêtré Force 30
  const bois = getSpellContract('Éveil du Bois');
  assert.ok(bois);
  assert.equal(bois.effects.secondaryTest.modifierSl, 2);
  assert.equal(bois.effects.entangledStrength, 30);

  // 4. Malédiction d’Anraheir (Ghur) : -1 M, -10 CC/CT/Ag
  const anraheir = getSpellContract('Malédiction d’Anraheir');
  assert.ok(anraheir);
  assert.deepEqual(anraheir.effects.statModifiers, { M: -2, CC: -20, CT: -20, Ag: -20 });

  // 5. Lunes du Chasseur (Ghur) : +1 M, +10 F, +10 E
  const lunes = getSpellContract('Lunes du Chasseur');
  assert.ok(lunes);
  assert.deepEqual(lunes.effects.statModifiers, { M: 1, F: 10, E: 10 });

  // 6. Le Bœuf Reste Debout (Ghur) : retire SL+1 Brisé, immunité Peur/Terreur
  const boeuf = getSpellContract('Le Bœuf Reste Debout');
  assert.ok(boeuf);
  assert.equal(boeuf.effects.removeBrokenAmount, 'DR + 1');
  assert.equal(boeuf.effects.fearTerrorImmunity, true);

  // 7. Ver Grouillant (Ghur) : Enchevêtré Force 50, corrode 1 PA cuir
  const ver = getSpellContract('Ver Grouillant');
  assert.ok(ver);
  assert.equal(ver.effects.entangledStrength, 50);
  assert.equal(ver.effects.specialState.wormGrapple.strength, 50);

  // 8. Transmogrification Exaltée de Colchis (Ghyran) : retire Enflammé, immunité feu
  const colchis = getSpellContract('Transmogrification Exaltée de Colchis');
  assert.ok(colchis);
  assert.deepEqual(colchis.effects.removeConditions, ['Enflammé']);
  assert.equal(colchis.effects.immunities.damage[0].filter.any[0], 'fire');

  // 9. L’Étreinte d’Iyrtu (Shyish) : Force +10 par SL
  const iyrtu = getSpellContract('L’Étreinte d’Iyrtu');
  assert.ok(iyrtu);
  assert.equal(iyrtu.effects.strengthPerSl, 10);
});

// ============================================================================
// 4. PROCÉDURE DE VORTEX AVEC SAISIE MJ (DIRECTION, DISTANCE, CIBLES TRAVERSÉES)
// ============================================================================

test('Tempête — HEPG p. 89 : saute étapes 1–2, direction d10, distance 2d10, aucune frappe des traversés',()=>{
 const c=getSpellContract('Tempête'),caster={id:'mage',caracs:{FM:50}};
 assert.equal(resolveVortexTrajectory({contract:c,caster,options:{directionRoll:2}}).ready,false);
 const p=resolveVortexTrajectory({contract:c,caster,targetsCrossed:[{id:'foe'}],options:{directionRoll:2,distanceRoll:12}});
 assert.equal(p.ready,true);assert.equal(p.direction,'N');assert.equal(p.distance,12);assert.deepEqual(p.crossedReceipts,[]);
 assert.equal(resolveVortexTrajectory({contract:c,caster,options:{directionRoll:1,distanceRoll:12}}).disappears,true);
});
// ============================================================================
// 5. INVOCATIONS AUXILIAIRES (CHIENS DE ZANDOX, ÉPÉES SANGUINES, ŒIL INVISIBLE)
// ============================================================================

test('Invocations Auxiliaires — Création des participants conformes sans mutation de fiches', () => {
  const caster = {
    id: 'necromancien-1',
    name: 'Mage Shyish',
    caracs: { FM: 45, CC: 35 }
  };

  // 1. Les Enfants Sauvages de Zandox (2 chiens CC 50, Arme +8, sans Élan, invisible)
  const zandoxSpell = getSpellContract('Les Enfants Sauvages de Zandox');
  assert.ok(zandoxSpell);
  const zandoxRes = resolveAuxiliarySummons({ contract: zandoxSpell, caster });
  assert.equal(zandoxRes.auxiliaries.length, 2, 'Deux chiens invoqués');

  const chien1 = zandoxRes.auxiliaries[0];
  assert.equal(chien1.ws, 50, 'CC 50 pour le chien de Zandox');
  assert.equal(chien1.damage, 8, 'Arme (Morsure) +8');
  assert.equal(chien1.noMomentum, true, 'Ne génère pas d’Élan');
  assert.equal(chien1.invisible, true, 'Invisible');
  assert.equal(chien1.isAuxiliary, true);

  // 2. Épées Sanguines (CC du lanceur, Arme +4, sans Élan)
  const epeesspell = getSpellContract('Epées Sanguines');
  assert.ok(epeesspell);
  const epeesRes = resolveAuxiliarySummons({ contract: epeesspell, caster });
  assert.equal(epeesRes.auxiliaries.length, 1);
  const epee = epeesRes.auxiliaries[0];
  assert.equal(epee.ws, 60, 'WoM p. 137 : CC60 indépendante du lanceur');
  assert.equal(epee.damage, 8, 'WoM p. 137 : Dégâts 8');
  assert.equal(epee.noMomentum, true);
});

// ============================================================================
// 6. SUIVI FICHE (31 SORTS) — REÇU EXPLICITE SANS MUTATION CLANDESTINE
// ============================================================================

test('Suivi Fiche — Les 31 sorts produisent un reçu structuré sans écrire dans les fiches', () => {
  const ficheSpells = getAllSpellContracts().filter(c => c.ficheFollowUp && !c.isTradition);
  assert.equal(ficheSpells.length, 31, 'Exactement 31 sorts signalés suivi fiche');

  const actor = { id: 'lanceur-1', name: 'Pratiquant' };
  const target = { id: 'cible-1', name: 'Victime' };

  for (const spell of ficheSpells) {
    const receipt = buildFicheFollowUpReceipt({ contract: spell, actor, targets: [target] });
    assert.ok(receipt, `Reçu généré pour ${spell.name}`);
    assert.equal(receipt.requiresSheetFollowUp, true);
    assert.equal(receipt.sheetSafe, true, 'Garanti sans mutation clandestine des fiches');
    assert.ok(receipt.consequences.length > 0, `Conséquences listées pour ${spell.name}`);
  }
});

// ============================================================================
// 7. INTÉGRATION STORE ET RÉVERSIBILITÉ EXACTE (UNDO)
// ============================================================================

test('Store V5 — Invocations et Vortex intégrés au combat et annulables (undo)', async () => {
  const store = createStore();
  await store.ready;

  const caster = {
    id: 'caster-test',
    name: 'Mage du Feu',
    caracs: { FM: 50, CC: 40, Int: 95 },
    hp: 15,
    maxHp: 15
  };
  const crossedTarget = {
    id: 'crossed-1',
    name: 'Guerrier Orque',
    caracs:{E:30,M:4},armor:{head:0,body:0,arms:0,legs:0},
    hp: 20,
    maxHp: 20
  };

  await store.executeCommand('init-combat', draft => {
    draft.combat = {
      round: 1,
      currentActorId: caster.id,
      order: [caster.id, crossedTarget.id],
      participants: [caster, crossedTarget]
    };
    return draft;
  });

  // 1. Lancement de Tempête Magmatique (Vortex, NI 13)
  const magmaSpell = getSpellContract('Tempête Magmatique');
  assert.ok(magmaSpell);

  await store.applySpellExecution(magmaSpell, {
    actorId: caster.id,
    options: {
      direction: 'NE', willpowerSuccess: true,
      distance: 10,
      targetsCrossed: [crossedTarget],
      sl: 13,
      locationRoll: 34
    }
  });

  const orqueAfter = store.getCombat().participants.get('crossed-1');
  assert.ok(orqueAfter.hp < 20, 'L’orque traversé a subi les dégâts du vortex');

  // 2. Lancement des Chiens de Zandox (Invocation, NI 8)
  const zandoxSpell = getSpellContract('Les Enfants Sauvages de Zandox');
  await store.applySpellExecution(zandoxSpell, {
    actorId: caster.id,
    roll: 15
  });

  const participantsAfterSummon = store.getCombat().participants;
  assert.equal(participantsAfterSummon.size, 4, '2 chiens ajoutés aux participants du combat (total 4)');
  assert.ok(Array.from(participantsAfterSummon.values()).some(p => p.name.includes('Zandox')));

  // 3. Annulation (undo) : retire les chiens et rétablit l'état
  await store.undo(); // Annule l'invocation de Zandox
  const participantsAfterUndoSummon = store.getCombat().participants;
  assert.equal(participantsAfterUndoSummon.size, 2, 'Chiens retirés après undo');

  await store.undo(); // Annule le vortex
  const orqueRestored = store.getCombat().participants.get('crossed-1');
  assert.equal(orqueRestored.hp, 20, 'PV de l’orque restaurés à 20 après undo');
});

// ============================================================================
// 8. Contrôle Codex LOT3_CONTROLE_CORRECTIONS_GEMINI (P1 #2 et P1 #3)
// ============================================================================

test('Contrôle Codex P1 #2 : Zéro placeholder générique parmi les 277 contrats et exécution fidèle des sorts signalés (Forge de Tarnus, Bosquet d’ombres, etc.)', async () => {
  const all = getAllSpellContracts().filter(c => !c.isTradition);
  assert.equal(all.length, 277);

  for (const c of all) {
    assert.notEqual(c.effects?.type, 'engine-effect', `Aucun contrat ne doit utiliser engine-effect (${c.name})`);
    assert.notEqual(c.effects?.type, 'mj-assisted', `Aucun contrat ne doit utiliser mj-assisted (${c.name})`);
    if (c.effects?.type === 'stat-modifiers') {
      assert.ok(Object.keys(c.effects.statModifiers || {}).length > 0, `stat-modifiers ne doit pas être vide (${c.name})`);
    }
    if (c.effects?.type === 'test-modifiers') {
      assert.ok(Object.keys(c.effects.testModifiers || {}).length > 0, `test-modifiers ne doit pas être vide (${c.name})`);
    }
    if (c.treatment !== 'narrative') {
      assert.notEqual(c.effects?.type, 'narrative', `Un contrat ${c.treatment} ne doit pas avoir effects.type='narrative' (${c.name})`);
    }
  }

  const store = createStore();
  await store.executeCommand('init-p1-2', draft => {
    draft.combat = {
      round: 1,
      currentActorId: 'mage',
      order: ['mage', 'orc'],
      participants: [
        {
          id: 'mage',
          name: 'Mage',
          hp: 10,
          maxHp: 12,
          caracs: { CC: 35, CT: 30, F: 30, E: 35, I: 40, Ag: 35, Dex: 40, Int: 50, FM: 50, Soc: 35 },
          skills: [{ name: 'Langue (Magick)', total: 80 }],
          armor: { head: 0, body: 1, arms: 0, legs: 0 },
          states: []
        },
        {
          id: 'orc',
          name: 'Orque',
          hp: 15,
          maxHp: 15,
          caracs: { CC: 40, CT: 30, F: 40, E: 40, I: 30, Ag: 30, Dex: 25, Int: 25, FM: 30, Soc: 20 },
          armor: { head: 1, body: 2, arms: 1, legs: 1 },
          states: []
        }
      ]
    };
    return draft;
  });

  // 1. Reproduction exacte Codex #3 : Forge de Tarnus -> +1 DR Métier (Forgeron) et Fabrication d'Objets Magiques, Int inchangée !
  await store.applySpellExecution('Forge de Tarnus', {
    actorId: 'mage',
    targetIds: ['mage'],
    sl: 8, domainFacts:{sourceFire:true} // WoM p.136 : forge éteinte déclarée.
  });
  const mageAfterForge = store.getCombat().participants.get('mage');
  assert.equal(mageAfterForge.caracs.Int, 50, 'Forge de Tarnus ne doit PAS modifier la caractéristique Int');
  assert.equal(mageAfterForge.extensions.v5.testModifiers['Métier (Forgeron)'], 1);
  assert.equal(mageAfterForge.extensions.v5.testModifiers['Fabrication d’Objets Magiques'] || 0, 0); // WoM p.136 : seul Métier(Forgeron), même pour fabriquer magique.

  // Expiration de Forge de Tarnus (durée BFM heures = 5 heures = 300 minutes = 1800 rounds) retire proprement les modificateurs de test
  await store.expireSpellEffects('mage', { currentRound: 2000 });
  const mageAfterExpireForge = store.getCombat().participants.get('mage');
  assert.equal(mageAfterExpireForge.extensions.v5.testModifiers['Métier (Forgeron)'], undefined);

  // WoM p.112 : le malus de Bosquet concerne les attaquants, jamais le mage destinataire.
  await store.applySpellExecution('Bosquet d’ombres', {
    actorId: 'mage',
    targetIds: ['mage'],
    sl: 8,domainFacts:{light:true}
  });
  const mageAfterBosquet = store.getCombat().participants.get('mage');
  assert.equal(mageAfterBosquet.extensions.v5.testModifiers?.['Attaque contre cible révélée'] || 0, 0);
  assert.equal(mageAfterBosquet.extensions.v5.specialStates.quantifiedReminder.attaqueContreReveleDR,-1);

  // 3. Peau du Chasseur (NI 6) -> +20 E + Vision dans le noir + Peur (1) + Sens aiguisé (Odorat)
  await store.applySpellExecution('Peau du Chasseur', {
    actorId: 'mage',
    targetIds: ['mage'],
    sl: 6
  });
  const mageAfterHunter = store.getCombat().participants.get('mage');
  assert.equal(mageAfterHunter.caracs.E, 55, 'Peau du Chasseur ajoute +20 Endurance temporaire (35 -> 55)');
  assert.ok(mageAfterHunter.traits.includes('Vision dans le noir'));
  assert.ok(mageAfterHunter.traits.includes('Peur (1)'));
  assert.ok(mageAfterHunter.extensions.v5.spellEffects.some(effect => effect.talents?.includes('Sens aiguisé (Odorat)')), 'talent noté sur la couche (rappel, aucun état temporaryTalents)');

  // 4. Capuche Vengeresse -> réduction de dégâts = Bonus de Volonté (+ DR du Test de Calme), attaques non magiques seulement, + trait Déviation
  await store.applySpellExecution('Capuche Vengeresse', {
    actorId: 'mage',
    targetIds: ['mage'],
    sl: 9
  });
  const mageAfterHood = store.getCombat().participants.get('mage');
  assert.equal(mageAfterHood.extensions.v5.damageReduction, 5);
  assert.deepEqual(mageAfterHood.extensions.v5.damageReductions.map(r => [r.amount, r.filter, r.calmTest]), [[5, { not: ['magical'] }, true]]);
  assert.ok(mageAfterHood.traits.includes('Déviation si dégâts réduits à 0'));

  // 5. Cape chatoyante (NI 9) -> malus -3 DR en Discrétion + Attaques ordinaires limitées aux DR
  await store.applySpellExecution('Cape chatoyante', {
    actorId: 'mage',
    targetIds: ['mage'],
    sl: 10
  });
  const mageAfterCloak = store.getCombat().participants.get('mage');
  // WoM p.65 : se cacher est impossible, sans malus arbitraire de−3.
  assert.equal(mageAfterCloak.extensions.v5.specialStates.cannotHide,true);
  assert.equal(mageAfterCloak.extensions.v5.damageCapToSlOnly,true);

  // 6. Pas léger (NI 0) -> Pistage adverse -3 DR
  await store.applySpellExecution('Pas léger', {
    actorId: 'mage',
    targetIds: ['mage'],
    sl: 4
  });
  const mageAfterLightStep = store.getCombat().participants.get('mage');
  assert.equal(mageAfterLightStep.extensions.v5.specialStates.organicGroundUnharmed, true /* V5 p. 240 : pénalité du poursuivant, pas du lanceur */);

  // 7. Drain (NI 0) -> contact ignore PA, BE oui, soin 1
  await store.applySpellExecution('Drain', {
    actorId: 'mage',
    targetIds: ['mage'],
    sl: 2, locationRoll: 34
  });
  const mageAfterDrain = store.getCombat().participants.get('mage');
  assert.ok(mageAfterDrain.hp > 0);

  // 8. Miasme mystifiant (NI 4) -> inflige Aveuglé, Assourdi et Exténué à la cible
  await store.applySpellExecution('Miasme mystifiant', {
    actorId: 'mage',
    targetIds: ['orc'],
    sl: 8
  });
  const orcAfterMiasma = store.getCombat().participants.get('orc');
  assert.ok(orcAfterMiasma.states.some(s => s.key === 'aveugle' || s.name === 'Aveuglé'), 'Miasme mystifiant inflige Aveuglé');
  assert.ok(orcAfterMiasma.states.some(s => s.key === 'assourdi' || s.name === 'Assourdi'), 'Miasme mystifiant inflige Assourdi');
  assert.ok(orcAfterMiasma.states.some(s => s.key === 'extenue' || s.name === 'Exténué'), 'Miasme mystifiant inflige Exténué');

  // 9. Voile Pourpre de Shyish (NI 8) -> +1 PA sur toutes les zones + Peur (1)
  await store.applySpellExecution('Voile Pourpre de Shyish', {
    actorId: 'mage',
    targetIds: ['mage'],
    sl: 12
  });
  const mageAfterPall = store.getCombat().participants.get('mage');
  // V5 p. 247 : +BFM PA, mage FM 50, armure initiale 1.
  assert.equal(mageAfterPall.armor.body, 6, 'Voile Pourpre de Shyish ajoute BFM PA temporaire');
  assert.ok(mageAfterPall.traits.includes('Peur (1)'));

  // 10. Saisie MJ assistée raccordée : Goût de Feu avec choix d'option MJ
  await store.applySpellExecution('Goût de Feu', {
    actorId: 'mage',
    targetIds: ['mage'],
    sl: 6,
    domainFacts:{catalogueMode:'oil'} // WoM p.137 : une pinte, reçu d'inventaire.
  });
  const mageAfterTaste = store.getCombat().participants.get('mage');
  assert.equal(mageAfterTaste.extensions.v5.testModifiers?.Endurance || 0,0); // Aucun bonus général de digestion.
});

test('Contrôle Codex P1 #3 : Les incidents de focalisation, d’interruption et de lancement appliquent leurs effets calculables dans le Store et sont annulables par undo()', async () => {
  const store = createStore();
  await store.executeCommand('init-p1-3', draft => {
    draft.combat = {
      round: 1,
      currentActorId: 'mage',
      order: ['mage'],
      participants: [
        {
          id: 'mage',
          name: 'Mage',
          hp: 12,
          maxHp: 12,
          caracs: { Int: 45, FM: 50, E: 30 },
          skills: [
            { name: 'Focalisation', total: 55 },
            { name: 'Calme', total: 45 },
            { name: 'Langue (Magick)', total: 55 }
          ],
          states: [],
          extensions: { v5: { magic: { reserve: { type: 'winds', sl: 5 } } } }
        }
      ]
    };
    return draft;
  });

  // 1. Reproduction exacte Codex #3 : Maladresse de focalisation (roll 99, lossRoll 4 -> +40, miscastRoll 65 + 40 = 105 -> Chaos en cascade +5 sur majorRoll 8 = 13 -> Poupée de chiffon, woundsRoll 8, BE 3 -> 5 Blessures + À Terre)
  const chPrev = store.previewChannelling({
    actorId: 'mage',
    type: 'winds',
    wind: 'fire',
    roll: 99,
    lossRoll: 4,
    miscastRoll: 65,
    majorRoll: 8,
    secondaryRolls: { woundsRoll: 8, distanceRoll: 3 }
  });
  assert.equal(chPrev.fumble, true);
  assert.equal(chPrev.miscast.name, 'Poupée de chiffon');

  await store.applyChannelling(chPrev, {
    actorId: 'mage',
    secondaryRolls: { woundsRoll: 8, distanceRoll: 3 }
  });

  const mageAfterChFumble = store.getCombat().participants.get('mage');
  assert.equal(mageAfterChFumble.extensions.v5.magic.reserve.sl, 1, 'Réserve réduite de 5 à 1');
  assert.equal(mageAfterChFumble.hp, 7, '12 PV - max(1, 8 - BE 3) = 7 PV');
  assert.ok(mageAfterChFumble.states.some(s => s.key === 'a-terre' || s.name === 'À Terre'), 'État À Terre appliqué');
  assert.ok(mageAfterChFumble.extensions.v5.lastMiscast, 'lastMiscast enregistré');
  assert.equal(mageAfterChFumble.extensions.v5.lastMiscast.secondaryRolls.woundsRoll, 8, 'Dés secondaires conservés');

  // Undo restaure PV, états et réserve !
  await store.undo();
  const mageAfterUndo1 = store.getCombat().participants.get('mage');
  assert.equal(mageAfterUndo1.hp, 12);
  assert.equal(mageAfterUndo1.states.length, 0);
  assert.equal(mageAfterUndo1.extensions.v5.magic.reserve.sl, 5);

  // 2. Interruption de focalisation échouée (mode: 'interruption', roll 90 sur Calme Difficile, lossRoll 3 -> +30, miscastRoll 18 + 30 = 48 -> Rupture : 1 Hémorragique)
  const intPrev = store.previewChannelling({
    actorId: 'mage',
    mode: 'interruption',
    roll: 90,
    lossRoll: 3,
    miscastRoll: 18
  });
  assert.equal(intPrev.interrupted, true);
  assert.equal(intPrev.miscast.name, 'Rupture');

  await store.applyChannelling(intPrev, { actorId: 'mage' });
  const mageAfterInt = store.getCombat().participants.get('mage');
  assert.equal(mageAfterInt.extensions.v5.magic.reserve.sl, 2);
  assert.ok(mageAfterInt.states.some(s => s.key === 'hemorragique' || s.name === 'Hémorragique'), 'Rupture applique Hémorragique');

  await store.undo();
  assert.equal(store.getCombat().participants.get('mage').states.length, 0);

  // 3. applyCasting direct avec incident Mineur (double réussi 22 -> miscastRoll 72 : Régurgitation -> Souillé et 1 Sonné pendant 1d10 Rounds)
  const castPrev = store.previewCasting(
    { id: 'bolt', name: 'Carreau', cn: 4, wind: 'fire', type: 'lore' },
    {
      actorId: 'mage',
      roll: 22,
      miscastRoll: 72,
      secondaryRolls: { duration: 4 }
    }
  );
  assert.equal(castPrev.critical, true);
  assert.equal(castPrev.miscast.name, 'Régurgitation');

  await store.applyCasting(castPrev, { actorId: 'mage', secondaryRolls: { duration: 4 } });
  const mageAfterCast = store.getCombat().participants.get('mage');
  assert.equal(mageAfterCast.extensions.v5.magic.reserve.sl, 0, 'Réserve consommée');
  assert.ok(mageAfterCast.states.some(s => s.key === 'sonne' || s.name === 'Sonné'), 'Régurgitation applique Sonné');
  assert.ok(mageAfterCast.extensions.v5.lastMiscast, 'lastMiscast enregistré');
  assert.equal(mageAfterCast.extensions.v5.lastMiscast.secondaryRolls.duration, 4, 'Dés secondaires conservés');

  await store.undo();
  const mageAfterUndoCast = store.getCombat().participants.get('mage');
  assert.equal(mageAfterUndoCast.states.length, 0);
  assert.equal(mageAfterUndoCast.extensions.v5.magic.reserve.sl, 5);
});

// ============================================================================
// 9. SECOND CONTRÔLE CODEX — P1 #1 (EXÉCUTION RÉELLE AVEC attributeActive: false)
//    ET P1 #2 (CHOIX EXPLICITES MJ ET PARAMÈTRES D'INCANTATION)
// ============================================================================

test('Second Contrôle Codex P1 #1 : Les 277 contrats (dont les 76 effects.type="special") produisent une exécution réelle avec attributeActive: false', () => {
  const all = getAllSpellContracts().filter(c => !c.isTradition);
  assert.equal(all.length, 277);

  const specialContracts = all.filter(c => c.effects?.type === 'special');
  assert.ok(specialContracts.length >= 70, `Au moins 70 contrats special (${specialContracts.length})`);

  const probeCaster = {
    id: 'probe-caster',
    name: 'Probe Caster',
    camp: 'pj',
    kind: 'PJ',
    hp: 15,
    maxHp: 15,
    fortune: 2,
    fate: 2,
    caracs: { CC: 50, CT: 50, F: 40, E: 40, I: 50, Ag: 50, Dex: 50, Int: 60, FM: 60, Soc: 50, M: 4 },
    skills: [{ name: 'Langue (Magick)', total: 90 }],
    actions:[fixtureBlade], armor: { head: 2, body: 2, arms: 2, legs: 2 },
    states: ['Frénésie', 'Peur', 'Sonné', 'Aveuglé', 'Assourdi', 'Brisé'],
    traits: [],
    extensions: { v5: { channelling: { sl: 4, wind: 'Aqshy' }, spellEffects: [] } }
  };
  const probeAlly = {
    ...structuredClone(probeCaster),
    id: 'probe-ally',
    name: 'Probe Ally'
  };
  const probeEnemy = {
    ...structuredClone(probeCaster),
    id: 'probe-enemy',
    name: 'Probe Enemy',
    camp: 'ennemi',
    kind: 'PNJ'
  };
  const probeDaemon = {
    ...structuredClone(probeEnemy),
    id: 'probe-daemon',
    name: 'Probe Daemon',
    traits: ['Démoniaque'],
    caracs: { ...probeEnemy.caracs, E: 40 }
  };
  const probeCorpse = {
    ...structuredClone(probeAlly),
    id: 'probe-corpse',
    name: 'Probe Corpse',
    hp: 0,
    dead: true,
    roundsDead: 2
  };

  for (const c of all) {
    const isSelf = /^vous$/i.test((c.target || '').trim()) || c.effects?.special === 'transformation-of-kadon';
    const isAllyOnly =
      Boolean(c.effects?.alliesOnly) ||
      ['hand-of-glory', 'shield-of-saphery', 'acceptance-of-fate', 'time-amok', 'merciw-monstrous-regiment', 'twist-of-fate', 'hunters-moons', 'timewarp', 'monstrous-regiment', 'ox-stands'].includes(c.effects?.special) ||
      ['Main de Gloire', 'Bouclier de Saphery', 'Ironie du Destin', 'Lunes du Chasseur', 'Dérèglement temporel', 'Régiment Monstrueux de Merciw', 'Le Bœuf Reste Debout'].includes(c.name);
    let targets = [probeEnemy];
    if (c.effects?.excludeCaster || c.effects?.special === 'merciw-monstrous-regiment') targets = [probeAlly];
    else if (isSelf) targets = [probeCaster];
    else if (isAllyOnly) targets = [probeAlly];
    else if (c.effects?.special === 'daemonbane' || c.effects?.targetRule?.requiredAnyTrait) targets = [probeDaemon];
    else if(c.effects?.targetRule?.requiredTrait==='bestial')targets=[{...probeEnemy,traits:['Bestial']}];
    else if (c.effects?.special === 'verdant-apotheosis' || c.effects.restoreCorpse) targets = [probeCorpse];

    const choiceOpts = getContractChoiceOptions(c);
    const prev = previewSpellExecution(probeCaster, c, targets, {
      ...declaredAnswers(targets.map(t=>t.id)), chosenLore:c.domain==='arcane'?'fire':undefined, sl: Math.max(6, (c.cn || 0) + 2),
      totalCastingSl: (c.cn || 0) + 6,
      attributeActive: false,
      fellowshipRoll: 20,
      enduranceRoll: 20,
      locationRoll: 34, targetTests: Object.fromEntries(targets.map(t=>[t.id,{...declaredTarget,...(c.isCatalogue && ['life','light','death','shadow'].includes(c.domain)?declared5BTarget:{}),deathDelaySec:30,encumbranceStep:0,unburdenedM:4,unburdenedAg:50}])), monsterProfile: { name: 'Sonde',size:'large', M: 6, hp: 20, caracs: { CC: 50, CT: 0, F: 60, E: 60, I: 40, Ag: 40, Dex: 0, Soc: 10 }, traits: [] }, beastKey: 'wolf', chosenStats: ['CC'], roll3d10: 15, direction: 'N', directionRoll:4, willpowerSuccess: true, distanceRoll: 10,
      ...(c.effects?.special === 'arcane-unforgiving' ? { arcaneTargets: { [targets[0].id]: { magicItemPresent: false } } } : {}),
      ...(choiceOpts.length > 0 ? { mjChoice: choiceOpts[0] } : {}),
      // V5 pp. 245–255 : faits explicites pour les nouveaux contrats de Domaines.
      // V5 p. 255 : l’aube et l’exposition au soleil sont des faits explicitement saisis.
      domainFacts: {...declaredFacts,...(c.isCatalogue && ['life','light','death','shadow'].includes(c.domain)?declared5BFacts:{}),objectId:'blade',objectMetal:true,objectMagical:false,objectWorn:true,patchEarth:true,directEarth:true,familiar:true,encumbranceMode:'heavier',location:'HEAD',naturalArmorAp:0,minutesToDawn:1,sunlight:false},
      // S-04 : une durée non lisible (Spécial, dés, unités multiples…) est une donnée MJ, saisie ici
      ...(parseSpellDuration(c.duration, { caster: probeCaster, target: targets[0] }).kind === 'unknown' ? { mjDuration: { amount: 5, unit: 'minutes' } } : {})
    });

    assert.equal(prev.valid, true, `Contrat ${c.name} (${c.id}) doit être valid : ${prev.error}`);
    assert.equal(prev.ready, true, `Contrat ${c.name} (${c.id}) doit être ready`);

    if (c.treatment !== 'narrative') {
      const mainActions = (prev.targetResults || []).flatMap(tr =>
        (tr.actions || []).filter(a => a.kind !== 'lore-attribute')
      );
      const hasAuxOrVortex = (prev.auxiliaries && prev.auxiliaries.length > 0) || Boolean(prev.vortex);
      assert.ok(
        mainActions.length > 0 || hasAuxOrVortex,
        `Contrat non-narratif ${c.name} (${c.id}, special=${c.effects?.special}) doit produire au moins 1 action principale avec attributeActive: false`
      );
    }
  }
});

test('Second Contrôle Codex P1 #1 : Exécution concrète dans le Store de Drain de Magie, Le Second Signe d’Amul et Calme', async () => {
  const store = createStore();
  await store.executeCommand('init-second-p1-1', draft => {
    draft.combat = {
      round: 1,
      currentActorId: 'mage',
      order: ['mage', 'enemy-mage', 'frenzied-ally'],
      participants: [
        {
          id: 'mage',
          name: 'Archimage',
          camp: 'pj',
          kind: 'PJ',
          hp: 14,
          maxHp: 14,
          fortune: 2,
          caracs: { Int: 60, FM: 60, E: 35, Soc: 50, I: 40 }, // S-04 : « (Bonus d’Initiative) Rounds » lit I du lanceur, plus de repli silencieux
          skills: [{ name: 'Langue (Magick)', total: 90 }],
          states: []
        },
        {
          id: 'enemy-mage',
          name: 'Sorcier Ennemi',
          camp: 'ennemi',
          kind: 'PNJ',
          hp: 12,
          maxHp: 12,
          caracs: { Int: 50, FM: 50, E: 30 },
          channelling: { type: 'winds', sl: 6 },
          extensions: {
            v5: {
              channelling: { type: 'winds', sl: 6 },
              magic: { reserve: { type: 'winds', sl: 6 } },
              spellEffects: [
                { id: 'eff-1', spellId: 'shield-1', spellName: 'Bouclier', cn: 4, durationRounds: 5, appliedAtRound: 1 }
              ]
            }
          }
        },
        {
          id: 'frenzied-ally',
          name: 'Tueur Frénétique',
          camp: 'pj',
          kind: 'PJ',
          hp: 14,
          maxHp: 14,
          caracs: { Soc: 40, FM: 45, E: 40 },
          states: [
            { id: 'st-frenzy', key: 'frenzy', name: 'Frénésie', level: 1 },
            { id: 'st-peur', key: 'peur', name: 'Peur', level: 1 },
            { id: 'st-brise', key: 'brise', name: 'Brisé', level: 1 }
          ],
          traits: ['Peur (2)']
        }
      ]
    };
    return draft;
  });

  // 1. Drain de Magie (row 80) : vide la réserve de focalisation (6 -> 0) et dissipe les effets magiques actifs (cn <= SL+6)
  await store.applySpellExecution('Drain de Magie', {
    actorId: 'mage',
    targetIds: ['enemy-mage'],
    roll: 15,
    attributeActive: false
  });
  const enemyAfterDrain = store.getCombat().participants.get('enemy-mage');
  assert.equal(enemyAfterDrain.channelling?.sl ?? 0, 0, 'Drain de Magie doit vider la réserve channelling');
  assert.equal(enemyAfterDrain.extensions.v5.channelling?.sl ?? 0, 0, 'Drain de Magie doit vider extensions.v5.channelling');
  assert.equal(enemyAfterDrain.extensions.v5.spellEffects.length, 0, 'Drain de Magie doit dissiper les effets actifs dans la zone');

  // Undo restaure la réserve et les effets actifs
  await store.undo();
  const enemyRestored = store.getCombat().participants.get('enemy-mage');
  assert.equal(enemyRestored.extensions.v5.channelling.sl, 6);
  assert.equal(enemyRestored.extensions.v5.spellEffects.length, 1);

  // 2. Le Second Signe d’Amul (row 29) : octroie 3 points de Chance temporaires, consommables et expirables
  await store.setFortune('mage', 2); // compteur de Chance initialisé : le registre porte le solde permanent
  await store.applySpellExecution('Le Second Signe d’Amul', {
    actorId: 'mage',
    targetIds: ['mage'],
    roll: 15,
    attributeActive: false
  });
  assert.equal(store.getFortune('mage').temporary, 3, '3 points de Chance temporaires octroyés');
  assert.equal(store.getFortune('mage').balance, 5, 'Solde total de Chance passe de 2 à 5');

  // Consommer 1 point de Chance temporaire
  const consumeRes = store.consumeTemporaryFortune('mage', 1);
  assert.equal(consumeRes.consumed, 1);
  assert.equal(store.getFortune('mage').temporary, 2, 'Il reste 2 points de Chance temporaires');
  assert.equal(store.getFortune('mage').balance, 4, 'Solde total de Chance passe à 4');

  // Expirer l'effet au round suivant : les 2 points temporaires non consommés disparaissent, les 2 points de base restent
  await store.expireSpellEffects('mage', { currentRound: 10 });
  assert.equal(store.getFortune('mage').temporary, 0, 'Les points de Chance temporaires non consommés ont expiré');
  assert.equal(store.getFortune('mage').balance, 2, 'La Chance de base (2) est préservée');

  // 3. Calme (row 177) : test de Sociabilité (échoue sur 95, réussit sur 15) et retire Frénésie/Psychologie sans effacer les traits innés
  await store.applySpellExecution('Calme', {
    actorId: 'mage',
    targetIds: ['frenzied-ally'],
    roll: 15,
    fellowshipRoll: 95, // Échec du test de Sociabilité (50)
    attributeActive: false
  });
  const allyFailedCalm = store.getCombat().participants.get('frenzied-ally');
  assert.ok(allyFailedCalm.states.some(s => s.name === 'Frénésie' || s.key === 'frenzy'), 'Si le test de Sociabilité échoue, la Frénésie persiste');

  await store.applySpellExecution('Calme', {
    actorId: 'mage',
    targetIds: ['frenzied-ally'],
    roll: 15,
    fellowshipRoll: 15, // Réussite du test de Sociabilité (15 <= 50)
    attributeActive: false
  });
  const allyCalmed = store.getCombat().participants.get('frenzied-ally');
  assert.ok(!allyCalmed.states.some(s => s.name === 'Frénésie' || s.key === 'frenzy'), 'Frénésie retirée des états');
  assert.ok(!allyCalmed.states.some(s => s.name === 'Peur' || s.key === 'peur'), 'Peur retirée des états');
  assert.ok(allyCalmed.states.some(s => s.name === 'Brisé' || s.key === 'brise'),'HEPG p. 80 : Calme conserve Brisé');
  assert.ok(allyCalmed.traits.includes('Peur (2)'), 'Le trait inné Peur (2) de la créature est préservé');
});

test('Second Contrôle Codex P1 #2 : Choix d’effet obligatoire (mj-choice-required) pour Goût de Feu et sélection libre des 4 caractéristiques de Main de Gloire', async () => {
  const store = createStore();
  await store.executeCommand('init-second-p1-2', draft => {
    draft.combat = {
      round: 1,
      currentActorId: 'mage',
      order: ['mage', 'ally'],
      participants: [
        {
          id: 'mage',
          name: 'Mage',
          camp: 'pj',
          kind: 'PJ',
          hp: 12,
          maxHp: 12,
          caracs: { CC: 30, CT: 30, F: 30, E: 30, I: 40, Ag: 35, Int: 60, FM: 60 },
          skills: [{ name: 'Langue (Magick)', total: 90 }]
        },
        {
          id: 'ally',
          name: 'Compagnon',
          camp: 'pj',
          kind: 'PJ',
          hp: 12,
          maxHp: 12,
          caracs: { CC: 35, CT: 35, F: 35, E: 35, I: 40, Ag: 40, M: 4 }
        }
      ]
    };
    return draft;
  });

  // WoM p.137, lot5A : choix explicite, séquelles alimentaires hors combat, unités du livre.
  const tasteNoChoice=store.previewSpellExecution('Goût de Feu',{actorId:'mage',targetIds:['mage'],roll:15});
  assert.equal(tasteNoChoice.ready,false);assert.equal(tasteNoChoice.status,'mj-fact-required');
  await assert.rejects(async()=>store.applySpellExecution('Goût de Feu',{actorId:'mage',targetIds:['mage'],roll:15}),/Goût de Feu/);
  const spiced=store.previewSpellExecution('Goût de Feu',{actorId:'mage',targetIds:['mage'],roll:15,domainFacts:{catalogueMode:'normal'}});
  assert.equal(spiced.ready,true,spiced.error);await store.applySpellExecution('Goût de Feu',{actorId:'mage',targetIds:['mage'],roll:15,domainFacts:{catalogueMode:'normal'}});
  assert.equal(store.getCombat().participants.get('mage').extensions.v5.testModifiers?.Endurance || 0,0);
  const oil=store.previewSpellExecution('Goût de Feu',{actorId:'mage',targetIds:['mage'],roll:25,domainFacts:{catalogueMode:'oil'}});
  assert.equal(oil.ready,true,oil.error);assert.ok(oil.targetResults.some(r=>r.actions.some(a=>a.summary.includes('pinte'))));

  // 4. Main de Gloire à +6 DR (NI 4 + 6 DR surpuissance = 10 DR via roll 11 -> 8 DR + réserve de Haute Magie 2 = 10 DR)
  await store.executeCommand('give-high-reserve', draft => {
    const mage = [...draft.combat.participants].find(p => p.id === 'mage');
    mage.extensions = { ...mage.extensions, v5: { ...mage.extensions?.v5, channelling: { type: 'high', sl: 2 } } };
    return draft;
  });
  await store.applySpellExecution('Main de Gloire', {
    actorId: 'mage',
    targetIds: ['ally'],
    roll: 11, miscastRoll: 11,
    chosenStats: ['CC', 'F', 'I', 'Ag'],
    roll3d10: 15
  });
  const allyGlorified = store.getCombat().participants.get('ally');
  assert.equal(allyGlorified.caracs.CC, 50, 'CC augmentée de +15 (35 -> 50)');
  assert.equal(allyGlorified.caracs.F, 50, 'F augmentée de +15 (35 -> 50)');
  assert.equal(allyGlorified.caracs.I, 55, 'I augmentée de +15 (40 -> 55)');
  assert.equal(allyGlorified.caracs.Ag, 55, 'Ag augmentée de +15 (40 -> 55)');
  assert.equal(allyGlorified.caracs.CT, 35, 'CT non choisie reste à 35');
  assert.equal(allyGlorified.caracs.E, 35, 'E non choisie reste à 35');
  assert.equal(allyGlorified.caracs.M, 6, 'Mouvement augmenté de +2 (4 -> 6)');
});

// ============================================================================
// TROISIÈME CONTRÔLE CODEX — TESTS DE NON-RÉGRESSION COMPLETS (P1 #1 à #4 & P2)
// ============================================================================

test('Troisième Contrôle Codex P1 #1 : Règles exactes de Le Bœuf Reste Debout, Destruction des Arcanes, Amul 1/2, Bouclier magique, Clarté d’Esprit et Transe d’Ambre', async () => {
  const store = createStore();
  await store.ready;
  const mage = {
    id: 'mage',
    profileId: 'mage-profile',
    name: 'Mage',
    kind: 'PJ',
    camp: 'pj',
    zone: 'active',
    hp: 20,
    maxHp: 20,
    caracs: { CC: 30, CT: 30, F: 30, E: 30, Int: 60, FM: 50, I: 40, Ag: 40, Soc: 35 },
    skills: [{ name: 'Langue (Magick)', total: 90 }],
    states: []
  };
  const allyRaw = { ...structuredClone(mage), id: 'ally', profileId: 'ally-profile', name: 'Allié' };
  const brokenAlly = acquireV5Conditions(
    allyRaw,
    [{ name: 'Brisé', level: 3 }, { name: 'À Terre', level: 1 }, { name: 'Sonné', level: 1 }],
    { round: 1, participantId: 'ally', targetId: 'ally', authorId: 'mage' }
  ).participant;
  const armoredEnemy = {
    ...structuredClone(mage),
    id: 'enemy',
    profileId: 'enemy-profile',
    name: 'Chevalier Ennemi',
    kind: 'PNJ',
    camp: 'ennemi',
    hp: 20,
    maxHp: 20,
    caracs: { ...mage.caracs, E: 30 }, // BE = 3
    armor: { head: 3, body: 3, arms: 3, legs: 3 } // 6 zones × 3 PA = 18 PA totaux
  };

  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    combat: {
      round: 1,
      currentActorId: 'mage',
      order: ['mage', 'ally', 'enemy'],
      participants: [mage, brokenAlly, armoredEnemy]
    },
    diceLines: [],
    log: []
  });

  // 1. Le Bœuf Reste Debout : retire DR+1 Brisé et donne immunité temporaire Peur/Terreur, SANS retirer À Terre ni Sonné
  await store.applySpellExecution('Le Bœuf Reste Debout', {
    actorId: 'mage',
    targetIds: ['ally'],
    roll: 12,
    attributeActive: false
  });
  const oxAfter = store.listParticipants().find(p => p.id === 'ally');
  assert.equal(oxAfter.states.some(s => s.name === 'Brisé' || s.key === 'broken'), false, 'Brisé doit être retiré');
  assert.equal(oxAfter.states.some(s => s.name === 'À Terre' || s.key === 'a-terre'), true, 'À Terre ne doit PAS être retiré par Le Bœuf Reste Debout');
  assert.equal(oxAfter.states.some(s => s.name === 'Sonné' || s.key === 'sonne'), true, 'Sonné ne doit PAS être retiré par Le Bœuf Reste Debout');
  assert.ok(oxAfter.traits.includes('Immunité à la Peur et à la Terreur'), 'Immunité temporaire Peur/Terreur active');
  assert.equal(oxAfter.extensions?.v5?.specialStates?.fearTerrorImmunity, true);

  // 2. Destruction des Arcanes : 18 PA portés -> floor(18/2) = 9 Dégâts bruts − BE 3 = 6 Blessures au Corps (PA ignorés) sans destruction de PA non payée
  const arcaneContract = getSpellContract('Destruction des Arcanes');
  assert.equal(arcaneContract.effects.dispelReserve, undefined, 'Destruction des Arcanes ne doit pas être codé comme dissipation de réserve');
  assert.equal(arcaneContract.effects.damageFromTotalWornAp, true);
  await store.applySpellExecution('Destruction des Arcanes', {
    actorId: 'mage',
    targetIds: ['enemy'],
    sl: 10,
    arcaneTargets: { enemy: { magicItemPresent: false } },
    attributeActive: false
  });
  const enemyAfterArcane = store.listParticipants().find(p => p.id === 'enemy');
  assert.equal(enemyAfterArcane.hp, 14, '18 PA / 2 = 9 Dégâts − BE 3 = 6 Blessures (20 -> 14 PV)');
  assert.equal(enemyAfterArcane.armor.body, 3, 'Aucun PA détruit sans surpuissance dépensée');

  // 3. Le Premier Signe d'Amul : 1 Point de Chance temporaire +1 par 2 DR de surpuissance, durée BI Rounds
  const amul1Prev = previewSpellExecution(mage, 'Le Premier Signe d’Amul', [mage], {
    sl: 8, // NI 4 -> 4 DR de surpuissance -> 1 + floor(4/2) = 3 points de Chance temporaires
    burnoutRoll:50, overcastChoices: { special: 4 },
    attributeActive: false
  });
  assert.equal(amul1Prev.targetResults[0].temporaryEffect.tempFortunePoints, 3);
  assert.equal(amul1Prev.targetResults[0].appliedSim.participant.extensions.v5.spellEffects[0].durationRounds, 4, 'Durée BI Rounds (I=40 -> 4 Rounds)');

  // 4. Bouclier magique : +BFM DR aux tests de Dissipation
  const mShieldPrev = previewSpellExecution(mage, 'Bouclier magique', [mage], {
    sl: 6,
    attributeActive: false
  });
  assert.equal(mShieldPrev.targetResults[0].temporaryEffect.magicShieldBonusSl, 5);
  assert.equal(mShieldPrev.targetResults[0].temporaryEffect.magicShieldBonusSl, 5);

  // 5. Clarté d'Esprit : ignore pénalités psychologiques/fatigue/tête sans retirer Brisé ou Sonné
  const clarityPrev = previewSpellExecution(mage, 'Clarté d’esprit', [brokenAlly], {
    sl: 6,
    attributeActive: false
  });
  assert.equal(clarityPrev.targetResults[0].temporaryEffect.removeConditions, undefined);
  assert.equal(clarityPrev.targetResults[0].temporaryEffect.specialState.ignoreMentalPenalties, true);

  // 6. Transe d'Ambre : transe insensible aux dégâts jusqu'à être frappé, sans infliger Sonné
  // WoM p. 146 : consentement explicite et M0, immunité jusqu’au premier coup.
  const trancePrev = previewSpellExecution(mage, 'Transe d’Ambre', [mage], {
    domainFacts:{durationMode:'normal'},targetTests:{[mage.id]:{unwilling:false}},sl: 6,
    attributeActive: false
  });
  assert.equal(trancePrev.targetResults[0].temporaryEffect.conditions, undefined);
  assert.equal(trancePrev.targetResults[0].temporaryEffect.specialState.amberTrance, true);
  assert.match(trancePrev.targetResults[0].temporaryEffect.immunities.damage[0].label, /Transe d’Ambre/);
});

test('Troisième Contrôle Codex P1 #2, P1 #3, P1 #4 & P2 : Main de Gloire (+6 DR requis), Chance temporaire unifiée, Tests secondaires obligatoires/non-universels et Camp vs Type', async () => {
  const mage = {
    id: 'mage',
    profileId: 'mage-profile',
    name: 'Mage',
    kind: 'PJ',
    camp: 'pj',
    zone: 'active',
    hp: 20,
    maxHp: 20,
    caracs: { CC: 30, CT: 30, F: 30, E: 30, Int: 60, FM: 50, I: 40, Ag: 40, Soc: 35 },
    skills: [{ name: 'Langue (Magick)', total: 90 }],
    states: []
  };
  const ally = { ...structuredClone(mage), id: 'ally', profileId: 'ally-profile', name: 'Allié' };
  const enemy = { ...structuredClone(ally), id: 'enemy', profileId: 'enemy-profile', name: 'Ennemi', kind: 'PNJ', camp: 'ennemi' };

  // P2 : validateSpellTargets respecte camp ('ennemi') même si type:'PNJ' est ajouté sans supprimer camp
  const typedEnemyValidation = validateSpellTargets(
    getSpellContract('Main de Gloire'),
    { ...mage, type: 'PJ' },
    [{ ...enemy, type: 'PNJ' }]
  );
  assert.equal(typedEnemyValidation.valid, false, 'Un ennemi avec camp="ennemi" et type="PNJ" doit être rejeté par un sort réservé aux alliés');
  assert.equal(typedEnemyValidation.status, 'invalid-target-admissibility');

  // Un PNJ allié (camp: 'pj', kind: 'PNJ', type: 'PNJ') doit être accepté comme allié !
  const alliedNpcValidation = validateSpellTargets(
    getSpellContract('Main de Gloire'),
    { ...mage, type: 'PJ' },
    [{ ...ally, kind: 'PNJ', type: 'PNJ', camp: 'pj' }]
  );
  assert.equal(alliedNpcValidation.valid, true, 'Un PNJ allié (camp="pj") doit être accepté par un sort réservé aux alliés');

  // P1 #2 : Main de Gloire lancée au seuil (roll 54 -> +4 DR = NI 4, 0 DR de surpuissance) ne peut PAS octroyer l’option à +6 DR (4 caractéristiques)
  const gloryFreeTierAttempt = previewSpellExecution(mage, 'Main de Gloire', [ally], {
    roll: 54,
    chosenStats: ['CC', 'F', 'I', 'Ag'],
    roll3d10: 15,
    attributeActive: false
  });
  assert.equal(gloryFreeTierAttempt.ready, false, 'Main de Gloire à 0 DR de surpuissance doit refuser le palier +6 DR (4 caractéristiques)');
  assert.equal(gloryFreeTierAttempt.valid, false);

  // En revanche, au seuil (roll 54 -> +4 DR = NI 4), Main de Gloire de base (1 caractéristique) réussit !
  const gloryBaseSingleStat = previewSpellExecution(mage, 'Main de Gloire', [ally], {
    roll: 54,
    chosenStats: ['CC'],
    roll3d10: 15,
    attributeActive: false
  });
  assert.equal(gloryBaseSingleStat.ready, true, 'Main de Gloire de base (1 caractéristique) doit réussir sans surpuissance');
  assert.deepEqual(gloryBaseSingleStat.targetResults[0].handOfGlory.statModifiers, { CC: 15 });

  // P1 #4 : Un sort sans test secondaire déclaré (ex: Carreau) ne doit JAMAIS être annulé par resistanceRoll
  const boltWithResistanceRoll = previewSpellExecution(mage, 'Carreau', [enemy], {
    roll: 12,
    resistanceRoll: 10,
    attributeActive: false
  });
  assert.equal(boltWithResistanceRoll.targetResults[0].resistanceTest, undefined);
  assert.equal(boltWithResistanceRoll.targetResults[0].woundsLost, 6, 'Carreau doit infliger ses 6 Blessures même si resistanceRoll est fourni');

  // P1 #4 : Calme et Purification du Corps exigent leur test secondaire avant application
  const frenzied = acquireV5Conditions(ally, [{ name: 'Frénésie', level: 1 }], { round: 1, participantId: 'ally', targetId: 'ally', authorId: 'mage' }).participant;
  const calmWithoutRoll = previewSpellExecution(mage, 'Calme', [frenzied], {
    roll: 12,
    attributeActive: false
  });
  assert.equal(calmWithoutRoll.ready, false, 'Calme sans jet de Sociabilité doit être en attente (ready: false)');
  assert.equal(calmWithoutRoll.secondaryTestRequired, true);
  assert.equal(calmWithoutRoll.targetResults[0].actions.length, 0);

  const purifyWithoutRoll = previewSpellExecution(mage, 'Purification du Corps (Ghyran & Hysh)', [ally], {
    domainFacts:{affliction:'poison',afflictionName:'Poison déclaré'},roll: 12,
    attributeActive: false
  });
  assert.equal(purifyWithoutRoll.ready, false, 'Purification du Corps sans jet d’Endurance doit être en attente (ready: false)');
  assert.match(purifyWithoutRoll.error,/Résistance|enduranceRoll/,'HEPG p. 82 : Test de Résistance du lanceur requis');

  // P1 #3 : Les Points de Chance temporaires rejoignent store.getFortune(), permettent de relancer un test raté, et expirent proprement
  const store = createStore();
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    combat: {
      round: 1,
      currentActorId: 'mage',
      order: ['mage', 'ally', 'enemy'],
      participants: [
        {
          ...structuredClone(mage),
          actions: [{ name: 'Coup de bâton', type: 'attack', attr: 'CC', base: 50, damage: 'BF+2' }]
        },
        ally,
        enemy
      ]
    },
    diceLines: [],
    log: []
  });
  await store.setFortune('mage', 0);
  assert.equal(store.getFortune('mage').balance, 0);

  await store.applySpellExecution('Le Second Signe d’Amul', {
    actorId: 'mage',
    targetIds: ['mage'],
    roll: 12,
    attributeActive: false
  });
  assert.equal(store.getFortune('mage').balance, 3, 'store.getFortune doit refléter les 3 Points de Chance temporaires');

  // Utiliser 1 Point de Chance temporaire pour relancer un Test raté (88 -> 24 sur score 50)
  const mageParticipant = store.listParticipants().find(p => p.id === 'mage');
  const actionPreview = store.previewResolution({
    actor: mageParticipant,
    action: { name: 'Concentration', type: 'test', attr: 'FM', base: 50 },
    targetId: 'enemy',
    roll: '88',
    v5: {
      kind: 'test',
      fortuneReroll: true,
      fortuneRerollRoll: 24
    }
  });
  assert.equal(actionPreview.success, true, 'La relance de Chance transforme le 88 (échec) en 24 (réussite)');
  assert.equal(actionPreview.fortuneReroll.used, true);
  assert.ok(actionPreview.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1));

  await store.applyResolution(actionPreview);
  assert.equal(store.getFortune('mage').balance, 2, '1 Point de Chance temporaire a été débité (3 -> 2)');
  assert.equal(store.getFortune('mage').temporary, 2);

  // Expiration au Round 10 : les 2 points temporaires restants expirent, le solde revient à 0
  await store.expireSpellEffects('mage', { currentRound: 10 });
  assert.equal(store.getFortune('mage').balance, 0, 'Après expiration, le solde de Chance revient à sa valeur permanente (0)');
});




