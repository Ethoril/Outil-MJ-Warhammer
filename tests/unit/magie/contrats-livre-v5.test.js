import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getSpellContract, getAllSpellContracts, validateSpellFingerprint, previewSpellExecution, applySpellExecution } from '../../../js/core/v5-spell-contracts.js';
import { createStore } from '../../../js/core/store.js';

describe('contrats du livre de base V5', () => {
/**
 * Suite de tests Phase 3.3 — Sorts du Livre V5 (116 contrats contrôlés)
 * Conforme au Cahier des charges Lot 3 et au Cadrage Magie V5.
 */

// ============================================================================
// 1. VÉRIFICATION DES 116 CONTRATS V5
// ============================================================================

test('Contrats V5 — Présence et validité des 116 contrats du livre de base', () => {
  const all = getAllSpellContracts();
  assert.ok(all.length >= 117, 'Total d’au moins 117 contrats enregistrés');

  const bookV5 = all.filter(c => c.isBookV5);
  assert.equal(bookV5.length, 116, 'Exactement 116 contrats V5 du livre de base');

  // Vérifier la conformité de chaque contrat V5
  const validDomains = new Set(['fire', 'heavens', 'metal', 'beasts', 'life', 'light', 'death', 'shadow', 'arcane', 'petty']);
  const validTreatments = new Set(['engine', 'mjInput', 'narrative']);

  for (const c of bookV5) {
    assert.ok(c.id && c.id.startsWith('spell-audit-'), `ID valide pour ${c.name}`);
    assert.ok(c.name && typeof c.name === 'string', `Nom français valide pour ${c.id}`);
    assert.ok(c.canonicalName && typeof c.canonicalName === 'string', `Nom canonique anglais pour ${c.name}`);
    assert.ok(Number.isFinite(c.page) && c.page >= 235, `Page valide pour ${c.name} (p. ${c.page})`);
    assert.ok(validDomains.has(c.domain), `Domaine valide pour ${c.name} (${c.domain})`);
    assert.ok(Number.isFinite(c.cn) && c.cn >= 0, `NI (CN) valide pour ${c.name} (${c.cn})`);
    assert.ok(c.range, `Portée définie pour ${c.name}`);
    assert.ok(c.target, `Cible définie pour ${c.name}`);
    assert.ok(c.duration, `Durée définie pour ${c.name}`);
    assert.ok(c.sourceFingerprint && c.sourceFingerprint.startsWith('sha256:'), `Empreinte sha256 pour ${c.name}`);
    assert.ok(validTreatments.has(c.treatment), `Traitement valide pour ${c.name} (${c.treatment})`);
    assert.ok(c.overcast && typeof c.overcast.allowed === 'boolean', `Overcast valide pour ${c.name}`);
    assert.ok(c.effects && typeof c.effects === 'object', `Effets structurés pour ${c.name}`);
  }
});

test('Contrats V5 — Recherche flexible par ID, nom français et nom canonique', () => {
  const byId = getSpellContract('spell-audit-c9c7acb2c5f08853373c');
  assert.ok(byId, 'Trouvé par ID');
  assert.equal(byId.name, 'Purification');

  const byName = getSpellContract('Purification');
  assert.ok(byName, 'Trouvé par nom français exact');
  assert.equal(byName.id, byId.id);

  const byFoldedName = getSpellContract('purification');
  assert.ok(byFoldedName, 'Trouvé par nom en minuscules');

  const byCanon = getSpellContract('Purge');
  assert.ok(byCanon, 'Trouvé par nom canonique V5 anglais');
  assert.equal(byCanon.id, byId.id);

  const byCanonFolded = getSpellContract('purge');
  assert.ok(byCanonFolded, 'Trouvé par nom canonique minuscules');
});

// ============================================================================
// 2. PARTAGE DES 5 DOUBLONS ET DE LA VARIANTE JADE
// ============================================================================

test('Contrats V5 — Partage des 5 paires de doublons identifiées dans l’audit', () => {
  // 1. Incarnation <-> Forme Sauvage de Wyssan
  const wyssan1 = getSpellContract('Incarnation de Wyssan');
  const wyssan2 = getSpellContract('Forme Sauvage de Wyssan');
  assert.ok(wyssan1 && wyssan2);
  assert.equal(wyssan1.sharedWith, wyssan2.id);
  assert.equal(wyssan2.sharedWith, wyssan1.id);
  assert.equal(wyssan1.canonicalName, "Wyssan’s Wildform");
  assert.equal(wyssan2.canonicalName, "Wyssan’s Wildform");
  assert.equal(wyssan1.cn, 8);
  assert.equal(wyssan2.cn, 8);
  assert.deepEqual(wyssan1.effects.statModifiers, wyssan2.effects.statModifiers);

  // 2. Vol du Destin <-> Nuée Funeste
  const flock1 = getSpellContract('Vol du Destin');
  const flock2 = getSpellContract('Nuée Funeste');
  assert.ok(flock1 && flock2);
  assert.equal(flock1.sharedWith, flock2.id);
  assert.equal(flock2.sharedWith, flock1.id);
  assert.equal(flock1.canonicalName, 'Flock of Doom');
  assert.equal(flock2.canonicalName, 'Flock of Doom');
  assert.equal(flock1.cn, 8);
  assert.equal(flock2.cn, 8);

  // 3. Don de Vie <-> Floraison de vie
  const life1 = getSpellContract('Don de Vie');
  const life2 = getSpellContract('Floraison de vie');
  assert.ok(life1 && life2);
  assert.equal(life1.sharedWith, life2.id);
  assert.equal(life2.sharedWith, life1.id);
  assert.equal(life1.canonicalName, 'Lifebloom');
  assert.equal(life2.canonicalName, 'Lifebloom');
  assert.equal(life1.cn, 8);
  assert.equal(life2.cn, 8);

  // 4. Pensée rapide <-> Vitesse de pensée
  const thought1 = getSpellContract('Pensée rapide');
  const thought2 = getSpellContract('Vitesse de pensée');
  assert.ok(thought1 && thought2);
  assert.equal(thought1.sharedWith, thought2.id);
  assert.equal(thought2.sharedWith, thought1.id);
  assert.equal(thought1.canonicalName, 'Speed of Thought');
  assert.equal(thought2.canonicalName, 'Speed of Thought');
  assert.equal(thought1.cn, 8);
  assert.equal(thought2.cn, 8);
  assert.deepEqual(thought1.effects.statModifiers, thought2.effects.statModifiers);

  // 5. Portail d’Ombre <-> Pas d’Ombre
  const shadow1 = getSpellContract('Portail d’Ombre');
  const shadow2 = getSpellContract('Pas d’Ombre');
  assert.ok(shadow1 && shadow2);
  assert.equal(shadow1.sharedWith, shadow2.id);
  assert.equal(shadow2.sharedWith, shadow1.id);
  assert.equal(shadow1.canonicalName, 'Shadowstep');
  assert.equal(shadow2.canonicalName, 'Shadowstep');
  assert.equal(shadow1.cn, 8);
  assert.equal(shadow2.cn, 8);
});

test('Contrats V5 — Forme bestiale — Jade partage le profil V5 avec Domaine de la Vie', () => {
  const beastOriginal = getSpellContract('Forme bestiale');
  const beastJade = getSpellContract('Forme bestiale - Jade');

  assert.ok(beastOriginal, 'Forme bestiale trouvée');
  assert.ok(beastJade, 'Forme bestiale - Jade trouvée');

  assert.equal(beastOriginal.domain, 'beasts');
  assert.equal(beastOriginal.wind, 'Ghur');
  assert.equal(beastOriginal.isBookV5, true);

  assert.equal(beastJade.domain, 'life');
  assert.equal(beastJade.wind, 'Ghyran');
  assert.equal(beastJade.isJadeVariant, true);

  assert.equal(beastJade.cn, beastOriginal.cn);
  assert.equal(beastJade.sharedWith, beastOriginal.id);
  assert.equal(beastOriginal.sharedWith, beastJade.id);
});

// ============================================================================
// 3. VÉRIFICATION DE LA NON-CONFUSION ET DES TITRES ACTUELS
// ============================================================================

test('Contrats V5 — Séparation stricte : Robe scintillante vs Écaille d’acier', () => {
  const robe = getSpellContract('Robe scintillante');
  assert.ok(robe, 'Robe scintillante présente dans les 116 V5');
  assert.equal(robe.canonicalName, 'Glittering Robe');
  assert.equal(robe.page, 253);
  assert.equal(robe.sharedWith, null, 'Robe scintillante non fusionnée avec Écaille d’acier');

  const ecaille = getSpellContract('Écaille d’acier');
  assert.ok(ecaille, 'Écaille d’acier présente comme profil distinct');
  assert.notEqual(ecaille.id, robe.id, 'Profils et IDs distincts');
  assert.equal(ecaille.sharedWith, null, 'Non fusionné sans confirmation');
});

test('Contrats V5 — Non-confusion de T’Essla’s Arc et Silence Ulgu', () => {
  const tessla = getSpellContract('Arc de T’Essla');
  assert.ok(tessla, 'Arc de T’Essla présent');
  assert.notEqual(tessla.canonicalName, 'Coruscating Arc', 'Pas confondu avec Coruscating Arc');
  assert.equal(tessla.cn, 7, 'NI 7 (et non NI 12)');

  const silence = getSpellContract('Silence');
  assert.ok(silence, 'Silence présent');
  assert.equal(silence.domain, 'shadow', 'Silence Ulgu (Hush) et non Silence Arcane');
  assert.equal(silence.cn, 3, 'NI 3 (et non NI 4)');
});

test('Contrats V5 — Respect des titres actuels sans anciens alias supprimés', () => {
  // Couronne de Flamme (actuel) vs Couronne de Flammes (supprimé)
  assert.ok(getSpellContract('Couronne de Flamme'));
  assert.equal(getSpellContract('Couronne de Flammes'), null);

  // Or des fous (actuel) vs L’Or des fous (supprimé)
  assert.ok(getSpellContract('Or des fous'));
  assert.equal(getSpellContract("L'Or des fous"), null);
  assert.equal(getSpellContract("L’Or des fous"), null);

  // Fléau des Démons (actuel) vs Fauche-démon (supprimé)
  assert.ok(getSpellContract('Fléau des Démons'));
  assert.equal(getSpellContract('Fauche-démon'), null);
});

// ============================================================================
// 4. VÉRIFICATION DU CONTRÔLE D'EMPREINTE (FINGERPRINT)
// ============================================================================

test('Contrats V5 — Blocage de l’automatisation en cas de modification d’empreinte', () => {
  const contract = getSpellContract('Carreau');
  assert.ok(contract);

  // Source identique
  const matchingSource = {
    sourceFingerprint: contract.sourceFingerprint,
    desc: 'Description originale'
  };
  const validCheck = validateSpellFingerprint(contract, matchingSource);
  assert.equal(validCheck.valid, true);

  // Source modifiée
  const alteredSource = {
    sourceFingerprint: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
    desc: 'Description altérée'
  };
  const invalidCheck = validateSpellFingerprint(contract, alteredSource);
  assert.equal(invalidCheck.valid, false);
  assert.equal(invalidCheck.reason, 'fingerprint_mismatch');

  // Preview avec source modifiée : automatisation désactivée
  const actor = { id: 'wizard', name: 'Sorcier', caracs: { FM: 50 } };
  const target = { id: 'goblin', name: 'Gobelin', hp: 10, caracs: { E: 30 } };

  const previewBlocked = previewSpellExecution(actor, contract, [target], {
    sourceSpell: alteredSource
  });
  assert.equal(previewBlocked.ready, false);
  assert.equal(previewBlocked.valid, false);
  assert.match(previewBlocked.error, /Empreinte source modifiée/i);
});

// ============================================================================
// 5. EXÉCUTION DE SORTS REPRÉSENTATIFS DE CHAQUE DOMAINE ET TYPE
// ============================================================================

test('Contrats V5 — Projectile Magique (Carreau / Bolt) avec BFM et réduction BE/PA', () => {
  const contract = getSpellContract('Carreau');
  assert.ok(contract);

  // Lanceur BFM 4 (FM 45), Int 75 -> roll 35 donne +4 DR >= NI 4
  const caster = { id: 'mage', name: 'Mage', caracs: { FM: 45, Int: 75 } };
  // Cible E 30 (BE 3), PA Corps 2
  const target = {
    id: 'orc',
    name: 'Orque',
    hp: 15,
    caracs: { E: 30 },
    armor: { body: 2 }
  };

  // Jet inversé touchant le corps (roll 35 -> inversé 53 -> Body)
  const preview = previewSpellExecution(caster, contract, [target], {
    roll: 35
  });

  assert.equal(preview.ready, true);
  assert.equal(preview.targetResults.length, 1);
  const res = preview.targetResults[0];

  // Dégâts bruts = BFM 4 + Carreau 4 = 8
  // Absorption = BE 3 + PA 2 = 5
  // Dégâts nets = 8 - 5 = 3
  assert.equal(res.missile.bfm, 4);
  assert.equal(res.missile.spellDamage, 4);
  assert.equal(res.missile.rawDamage, 8);
  assert.equal(res.missile.absorption, 5);
  assert.equal(res.missile.finalDamage, 3);
  assert.equal(res.finalHp, 12);
});

test('Contrats V5 — Surpuissance : bonus de dégâts appliqué et interdiction sorts mineurs', () => {
  const bolt = getSpellContract('Carreau');
  const caster = { id: 'mage', name: 'Mage', caracs: { FM: 40, Int: 75 } };
  const target = { id: 'orc', name: 'Orque', hp: 15, caracs: { E: 30 } };

  // Surpuissance 2 DR en dégâts (+2 dégâts) avec roll 11 (7 - 1 = +6 DR, excédent 6 - 4 = 2 DR)
  const previewOvercast = previewSpellExecution(caster, bolt, [target], {
    roll: 11, miscastRoll: 11,
    burnoutRoll:50, overcastChoices: { damage: 2 }
  });
  assert.equal(previewOvercast.ready, true);
  assert.equal(previewOvercast.overcast.damageBonus, 2);
  assert.equal(previewOvercast.targetResults[0].missile.rawDamage, 4 + 4 + 2); // BFM 4 + spell 4 + overcast 2 = 10

  // Surpuissance interdite sur sort mineur
  const dart = getSpellContract('Fléchette');
  assert.equal(dart.overcast.allowed, false);

  const previewPetty = previewSpellExecution(caster, dart, [target], {
    burnoutRoll:50, overcastChoices: { damage: 1 }
  });
  assert.equal(previewPetty.ready, false);
  assert.match(previewPetty.error, /Surpuissance interdite/i);
});

test('Contrats V5 — Modification de Caractéristiques : Wyssan (+1 M, +30 F, +30 E)', () => {
  const wyssan = getSpellContract('Forme Sauvage de Wyssan');
  const caster = {
    id: 'shaman',
    name: 'Chaman',
    hp: 12,
    M: 4,
    caracs: { F: 35, E: 35, M: 4, FM: 45 }
  };

  const preview = previewSpellExecution(caster, wyssan, [caster]);
  assert.equal(preview.ready, true);
  const sim = preview.targetResults[0].appliedSim;
  assert.equal(sim.effectiveCaracs.F, 65);
  assert.equal(sim.effectiveCaracs.E, 65);
  assert.equal(sim.effectiveCaracs.M, 5);
});

test('Contrats V5 — Soin Magique et retrait Hémorragique (Cautérisation / Cauterise)', () => {
  const cauterise = getSpellContract('Cautérisation');
  const caster = { id: 'pyro', name: 'Pyromancien', caracs: { FM: 40 } };
  const injured = {
    id: 'soldier',
    name: 'Soldat',
    hp: 5,
    maxHp: 12,
    caracs: { E: 40 },
    states: [{ id: 'bleeding-1', name: 'Hémorragique', count: 1 }]
  };

  // V5 p. 248 : Résistance explicite de la cible, sauf pratiquant de la magie du Feu.
  const preview = previewSpellExecution(caster, cauterise, [injured], { enduranceRoll: 20 });
  assert.equal(preview.ready, true);
  const res = preview.targetResults[0];
  assert.equal(res.healing.healedAmount, 1);
  assert.equal(res.finalHp, 6);
  assert.ok(res.actions.some(a => a.kind === 'healing'));
});

test('Contrats V5 — Protection Ward 7+ (Égide d’Aqshy) et immunité au feu', () => {
  const aegis = getSpellContract('Égide d’Aqshy');
  const caster = { id: 'pyro', name: 'Pyromancien', caracs: { FM: 40 } };

  const preview = previewSpellExecution(caster, aegis, [caster]);
  assert.equal(preview.ready, true);
  const sim = preview.targetResults[0].appliedSim;
  assert.equal(sim.effectiveWard, 7);
});

test('Contrats V5 — Attribut de Domaine V5 automatique lors de l’exécution', () => {
  const purge = getSpellContract('Purification'); // Domaine Aqshy (Feu)
  const caster = { id: 'pyro', name: 'Pyromancien', caracs: { FM: 40 } };
  const target = { id: 'heretic', name: 'Hérétique', camp: 'ennemi', hp: 12, caracs: { E: 30 } };

  const preview = previewSpellExecution(caster, purge, [target]);
  assert.equal(preview.ready, true);
  assert.ok(preview.attributeReceipts.length > 0);
  assert.equal(preview.attributeReceipts[0].lore, 'fire');
  assert.match(preview.attributeReceipts[0].effect, /Enflammé/i);
});

// ============================================================================
// 6. INTÉGRATION STORE ET RÉVERSIBILITÉ EXACTE (UNDO)
// ============================================================================

test('Store V5 — Intégration complète et réversibilité exacte (undo) d’un contrat de sort', async () => {
  const store = createStore();
  await store.ready;

  const wizard = {
    id: 'wizard-1',
    name: 'Archimage',
    hp: 14,
    maxHp: 14,
    caracs: { FM: 50, E: 30, Int: 75 }
  };
  const orc = {
    id: 'orc-1',
    name: 'Guerrier Orque',
    hp: 15,
    maxHp: 15,
    caracs: { E: 30 },
    armor: { body: 1 }
  };

  await store.executeCommand('init-combat', draft => {
    draft.combat = {
      round: 1,
      currentActorId: wizard.id,
      order: [wizard.id, orc.id],
      participants: [wizard, orc]
    };
    return draft;
  });

  // 1. Prévisualisation Carreau sans mutation
  const prev = store.previewSpellExecution('Carreau', {
    actorId: wizard.id,
    targetId: orc.id,
    roll: 35
  });
  assert.equal(prev.ready, true);
  assert.equal(store.getCombat().participants.get(orc.id).hp, 15, 'Prévisualisation sans mutation de PV');

  // 2. Application Carreau
  await store.applySpellExecution('Carreau', {
    actorId: wizard.id,
    targetId: orc.id,
    preview: prev
  });

  const orcAfter = store.getCombat().participants.get(orc.id);
  assert.equal(orcAfter.hp, 10, 'L’orque a subi 5 Blessures nettes (5 BFM+4 sort - 4 absorption)');
  assert.ok(store.getLog().some(l => l.kind === 'magic' && l.text.includes('Carreau')), 'Log magique enregistré');

  // 3. Annulation exacte (undo)
  assert.ok(store.canUndo(), 'Peut annuler');
  await store.undo();

  const orcRestored = store.getCombat().participants.get(orc.id);
  assert.equal(orcRestored.hp, 15, 'Les PV de l’orque sont parfaitement restaurés');
});

test('Store V5 — Application et annulation (undo) d’effets temporaires de caractéristiques', async () => {
  const store = createStore();
  await store.ready;

  const shaman = {
    id: 'shaman-1',
    name: 'Chaman',
    hp: 12,
    maxHp: 12,
    M: 4,
    caracs: { F: 30, E: 35, M: 4, FM: 45 }
  };

  await store.executeCommand('init-combat', draft => {
    draft.combat = {
      round: 1,
      currentActorId: shaman.id,
      order: [shaman.id],
      participants: [shaman]
    };
    return draft;
  });

  // Appliquer Forme Sauvage de Wyssan (+1 M, +30 F, +30 E, NI 8)
  await store.applySpellExecution('Forme Sauvage de Wyssan', {
    actorId: shaman.id,
    targetId: shaman.id,
    sl: 8
  });

  const shamanTransformed = store.getCombat().participants.get(shaman.id);
  assert.equal(shamanTransformed.caracs.F, 60);
  assert.equal(shamanTransformed.caracs.E, 65);
  assert.equal(shamanTransformed.caracs.M, 5);
  assert.ok(shamanTransformed.extensions.v5.spellEffects.length > 0);

  // Annuler (undo)
  await store.undo();

  const shamanReverted = store.getCombat().participants.get(shaman.id);
  assert.equal(shamanReverted.caracs.F, 30);
  assert.equal(shamanReverted.caracs.E, 35);
  assert.equal(shamanReverted.caracs.M, 4);
  assert.equal(shamanReverted.extensions?.v5?.spellEffects?.length ?? 0, 0);
});

// ============================================================================
// 8. Non-régression Revue Codex (P1 #2, #3, #4, #5)
// ============================================================================

function createTestMage(overrides = {}) {
  return {
    id: 'mage-test',
    name: 'Mage Impérial',
    hp: 14,
    maxHp: 14,
    M: 4,
    caracs: { CC: 30, CT: 30, F: 30, E: 35, I: 40, Ag: 35, Dex: 40, Int: 50, FM: 50, Soc: 30, M: 4 },
    skills: [
      { name: 'Langue (Magick)', value: 60 },
      { name: 'Focalisation', value: 60 }
    ],
    armor: { head: 0, body: 0, arms: 0, legs: 0 },
    states: [],
    traits: [],
    extensions: {
      v5: {
        magic: {
          reserve: { type: 'winds', sl: 0 }
        }
      }
    },
    ...overrides
  };
}

function createTestTarget(overrides = {}) {
  return {
    id: 'target-test',
    name: 'Cible Test',
    hp: 15,
    maxHp: 15,
    M: 4,
    caracs: { CC: 35, CT: 30, F: 35, E: 30, I: 30, Ag: 30, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
    armor: { head: 1, body: 1, arms: 1, legs: 1 },
    states: [],
    traits: [],
    ...overrides
  };
}

test('Phase 3.3 — Revue Codex P1 #2 : Preuve d’incantation, consommation de réserve, anti-doublon et révision', async () => {
  const store = createStore();
  const caster = createTestMage({
    id: 'a',
    caracs: { CC: 30, CT: 30, F: 30, E: 35, I: 40, Ag: 35, Dex: 40, Int: 50, FM: 50, Soc: 30, M: 4 },
    extensions: {
      v5: {
        magic: {
          reserve: { type: 'winds', sl: 8 }
        }
      }
    }
  });
  const target = createTestTarget({ id: 't', hp: 30, maxHp: 30, caracs: { CC: 30, CT: 30, F: 30, E: 30, I: 30, Ag: 30, Dex: 30, Int: 30, FM: 30, Soc: 30 } });

  await store.executeCommand('init-codex-p2', draft => {
    draft.combat = {
      round: 1,
      currentActorId: 'a',
      order: ['a', 't'],
      participants: [caster, target]
    };
    return draft;
  });

  // 1. Appel sans jet ni preuve d'incantation doit être refusé
  await assert.rejects(
    async () => {
      await store.applySpellExecution('Carreau', { actorId: 'a', targetIds: ['t'] });
    },
    /Incantation non résolue/
  );
  assert.equal(store.getCombat().participants.get('t').hp, 30);
  assert.equal(store.getCombat().participants.get('a').extensions.v5.magic.reserve.sl, 8);

  // 2. Appel avec jet réussi : consomme la réserve (8 -> 0) et inflige les dégâts une seule fois
  const preview = store.previewSpellExecution('Carreau', {
    actorId: 'a',
    targetIds: ['t'],
    roll: 35 // Réussi (skill 60 -> +3 DR + 8 réserve = 11 >= NI 4)
  });
  assert.equal(preview.ready, true);

  await store.applySpellExecution('Carreau', {
    actorId: 'a',
    targetIds: ['t'],
    executionId: 'exec-bolt-1',
    castingPreview: preview.castingPreview
  });

  const targetAfter1 = store.getCombat().participants.get('t');
  const casterAfter1 = store.getCombat().participants.get('a');
  assert.equal(targetAfter1.hp, 25); // 30 - (BFM 5 + Dégâts 4 - BE 3 - PA 1) = 25
  assert.equal(casterAfter1.extensions.v5.magic.reserve.sl, 0); // Réserve consommée !

  // 3. Second appel identique (double clic) refusé !
  await assert.rejects(
    async () => {
      await store.applySpellExecution('Carreau', {
        actorId: 'a',
        targetIds: ['t'],
        executionId: 'exec-bolt-1',
        castingPreview: preview.castingPreview
      });
    },
    /déjà appliquée/
  );
  assert.equal(store.getCombat().participants.get('t').hp, 25);

  // 4. Appel avec baseRevision périmée refusé !
  await assert.rejects(
    async () => {
      await store.applySpellExecution('Carreau', {
        actorId: 'a',
        targetIds: ['t'],
        roll: 25,
        baseRevision: 0
      });
    },
    /État modifié depuis l’aperçu/
  );
});

test('Phase 3.3 — Revue Codex P1 #2 : Validation automatique d’empreinte depuis les sorts de l’acteur', () => {
  const contract = getSpellContract('Carreau');
  const casterWithModifiedSpell = createTestMage({
    spells: [
      {
        name: 'Carreau',
        description: 'Texte modifié manuellement par le MJ qui invalide le contrat automatique.'
      }
    ]
  });

  // Sans passer sourceSpell explicitement, previewSpellExecution détecte le sort modifié sur l'acteur
  const preview = previewSpellExecution(casterWithModifiedSpell, contract, [createTestTarget()], { sl: 4 });
  assert.equal(preview.ready, false);
  assert.equal(preview.status, 'fingerprint-mismatch');
  assert.equal(preview.automationBlocked, true);
});

test('Phase 3.3 — Revue Codex P1 #3 : Paramètres V5 retenus (Robe scintillante NI 6 / BFM Rounds, Forme bestiale Endurance minutes)', () => {
  const robe = getSpellContract('Robe scintillante');
  assert.ok(robe);
  assert.equal(robe.cn, 6, 'Robe scintillante doit avoir NI 6 en V5');
  assert.equal(robe.duration, '(Bonus de Force Mentale) Rounds', 'Robe scintillante doit durer BFM Rounds en V5');

  const beast = getSpellContract('Forme bestiale');
  assert.ok(beast);
  assert.equal(beast.duration, 'Endurance minutes', 'Forme bestiale doit durer Endurance minutes en V5');

  const jade = getSpellContract('Forme bestiale — Jade');
  assert.ok(jade);
  assert.equal(jade.duration, 'Endurance minutes', 'Forme bestiale — Jade doit durer Endurance minutes en V5');
});

test('Phase 3.3 — Revue Codex P1 #4 : Arbitrages raccordés aux contrats (Jade, Main de Gloire, Voix de Fer, Apothéose 18 DR, Fléau, Saphery, Faux)', async () => {
  // 0 faux narratifs parmi les 277 contrats
  const allContracts = getAllSpellContracts();
  const falseNarratives = allContracts.filter(c => (c.treatment === 'engine' || c.treatment === 'mjInput') && c.effects?.type === 'narrative');
  assert.equal(falseNarratives.length, 0, 'Aucun contrat engine/mjInput ne doit avoir effects.type=narrative');

  const store = createStore();
  const caster = createTestMage({
    id: 'caster-1',
    caracs: { CC: 35, CT: 30, F: 30, E: 40, I: 40, Ag: 35, Dex: 40, Int: 50, FM: 50, Soc: 35, M: 4 },
    extensions: {
      v5: {
        magic: {
          reserve: { type: 'winds', sl: 8 }
        }
      }
    }
  });
  const corpse = createTestTarget({
    id: 'corpse-1',
    name: 'Guerrier tombé',
    hp: 0,
    maxHp: 20,
    dead: true,
    roundsSinceDeath: 2,
    decapitated: false
  });
  const ally = createTestTarget({
    id: 'ally-1',
    name: 'Allié',
    hp: 15,
    maxHp: 15,
    M: 4,
    caracs: { CC: 35, CT: 35, F: 35, E: 35, I: 35, Ag: 35, Dex: 35, Int: 35, FM: 35, Soc: 35, M: 4 },
    states: [{ id: 'fear', name: 'Peur', level: 1 }]
  });
  const daemon = createTestTarget({
    id: 'daemon-1',
    name: 'Sanguinaire',
    hp: 20,
    maxHp: 20,
    traits: ['Démoniaque'],
    caracs: { CC: 45, CT: 0, F: 45, E: 45, I: 40, Ag: 40, Dex: 30, Int: 30, FM: 40, Soc: 15 }
  });

  await store.executeCommand('init-arbitrations', draft => {
    draft.combat = {
      round: 1,
      currentActorId: caster.id,
      order: [caster.id, corpse.id, ally.id, daemon.id],
      participants: [caster, corpse, ally, daemon]
    };
    return draft;
  });

  // 1. Apothéose Verdoyante avec 18 DR finaux (10 DR test + 8 réserve) sur cible à 0 B -> revient à 18 B
  await store.applySpellExecution('Apothéose Verdoyante', {
    actorId: caster.id,
    targetIds: [corpse.id],
    targetTests: { [corpse.id]: { deathDelaySec: 30 } }, // délai de mort saisi par le MJ (A-04)
    sl: 10 // + 8 en réserve = 18 DR finaux !
  });
  const revived = store.getCombat().participants.get(corpse.id);
  assert.equal(revived.hp, 18, 'Apothéose Verdoyante avec 18 DR finaux doit relever le mort à 18 B');
  assert.equal(revived.extensions.v5.dead, false);
  assert.ok(revived.extensions.v5.corruptionExposures.length > 0, 'Doit enregistrer l’exposition à la Corruption modérée');

  // 2. Forme bestiale — Jade transforme réellement le lanceur et dure Endurance (40) minutes
  await store.applySpellExecution('Forme bestiale — Jade', {
    actorId: caster.id,
    targetIds: [caster.id],
    sl: 6,
    beastKey: 'boar'
  });
  const jadeCaster = store.getCombat().participants.get(caster.id);
  assert.ok(jadeCaster.extensions.v5.beastForm, 'Forme bestiale — Jade doit transformer le lanceur');
  assert.equal(jadeCaster.extensions.v5.beastForm.isJade, true);
  assert.equal(jadeCaster.extensions.v5.beastForm.durationMinutes, 40);
  assert.equal(jadeCaster.caracs.F, 35); // Sanglier

  // Avancer de 40 minutes hors combat ramène le lanceur à sa forme humaine
  await store.advanceTalentMinutes(40);
  const revertedCaster = store.getCombat().participants.get(caster.id);
  assert.equal(revertedCaster.extensions.v5.beastForm, undefined, 'Forme bestiale — Jade doit expirer après Endurance minutes');
  assert.equal(revertedCaster.caracs.F, 30);

  // 3. Main de Gloire à +6 DR sur l'allié (NI 4 + 6 DR surpuissance = 10 DR)
  await store.applySpellExecution('Main de Gloire', {
    actorId: caster.id,
    targetIds: [ally.id],
    sl: 10,
    overcastSleep: 6, burnoutRoll:50,
    chosenStats: ['CC', 'F', 'E', 'Ag'],
    roll3d10: 18
  });
  const gloriousAlly = store.getCombat().participants.get(ally.id);
  assert.equal(gloriousAlly.caracs.CC, 53); // 35 + 18
  assert.equal(gloriousAlly.caracs.E, 53);  // 35 + 18
  assert.equal(gloriousAlly.caracs.M, 6);   // 4 + 2
  assert.equal(gloriousAlly.maxHp, 15, 'Bmax doit rester inchangé malgré le bonus d’Endurance');

  // 4. HEPG p. 82 : Voix de Fer cible Vous ; ne supprime pas Peur
  await store.applySpellExecution('Voix de Fer', {
    actorId: caster.id,
    targetIds: [caster.id],
    sl: 5
  });
  const ironVoiceAlly = store.getCombat().participants.get(caster.id);
  assert.equal(ironVoiceAlly.extensions.v5.testModifiers.Commandement,1,'HEPG p. 82 : +1 DR, sans Peur ni Sociabilité +10');
  assert.ok(ironVoiceAlly.extensions.v5.spellEffects.some(e => e.spellName.includes('Voix de Fer')));

  // 5. Fléau des Démons (NI 10, Endurance démon 45 <= Int lanceur 50 -> Banni)
  await store.applySpellExecution('Fléau des Démons', {
    actorId: caster.id,
    targetIds: [daemon.id],
    sl: 10
  });
  const banishedDaemon = store.getCombat().participants.get(daemon.id);
  assert.equal(banishedDaemon.hp, 0);
  assert.equal(banishedDaemon.extensions.v5.banished, true);
});

test('Phase 3.3 — Revue Codex P1 #5 : Expiration typée de Pensée rapide au Round 1000 et via store.nextTurn()', async () => {
  const store = createStore();
  const mage = createTestMage({
    id: 'mage-pensee',
    zone: 'active',
    caracs: { CC: 30, CT: 30, F: 30, E: 35, I: 40, Ag: 35, Dex: 40, Int: 60, FM: 50, Soc: 30, M: 4 }
  });

  await store.executeCommand('init-pensee', draft => {
    draft.combat = {
      round: 1,
      currentActorId: mage.id,
      order: [mage.id],
      participants: [mage]
    };
    return draft;
  });

  // Appliquer Pensée rapide via son contrat réel (NI 8, durée '(Bonus de Force Mentale) Rounds', BFM = 5)
  await store.applySpellExecution('Pensée rapide', {
    actorId: mage.id,
    targetIds: [mage.id],
    sl: 8
  });

  const boosted = store.getCombat().participants.get(mage.id);
  assert.equal(boosted.caracs.Int, 80, 'Pensée rapide doit porter Int de 60 à 80');
  const eff = boosted.extensions.v5.spellEffects[0];
  assert.equal(eff.durationType, 'rounds');
  assert.equal(eff.durationRounds, 5);
  assert.equal(eff.expiresAtRound, 6);

  // Vérifier la reproduction exacte de Codex : demander l'expiration au Round 1000
  await store.expireSpellEffects(mage.id, { currentRound: 1000 });
  const afterExpire1000 = store.getCombat().participants.get(mage.id);
  assert.equal(afterExpire1000.extensions.v5.spellEffects.length, 0, 'L’effet doit être retiré au Round 1000');
  assert.equal(afterExpire1000.caracs.Int, 60, 'L’Intelligence doit revenir à 60');

  // Vérifier aussi l'expiration automatique via store.nextTurn() au fil des Rounds
  await store.applySpellExecution('Pensée rapide', {
    actorId: mage.id,
    targetIds: [mage.id],
    sl: 8,
    executionId: 'cast-pensee-2'
  });
  assert.equal(store.getCombat().participants.get(mage.id).caracs.Int, 80);

  // Avancer de 5 tours/rounds via nextTurn() (Round 1 -> 2 -> 3 -> 4 -> 5 -> 6)
  for (let i = 0; i < 5; i++) {
    await store.nextTurn();
  }
  assert.equal(store.getCombat().round, 6);
  assert.equal(store.getCombat().participants.get(mage.id).extensions.v5.spellEffects.length, 1, 'D-12 : Pensée rapide dure jusqu’à la fin du Tour du mage au Round 6');
  await store.nextTurn();
  const afterNextTurns = store.getCombat().participants.get(mage.id);
  assert.equal(store.getCombat().round, 7);
  assert.equal(afterNextTurns.extensions.v5.spellEffects.length, 0, 'store.nextTurn() doit expirer Pensée rapide à la fin du Tour du mage au Round 6');
  assert.equal(afterNextTurns.caracs.Int, 60, 'Int doit être revenue à 60 après expiration par nextTurn()');
});

// ============================================================================
// 9. Contrôle Codex LOT3_CONTROLE_CORRECTIONS_GEMINI (P1 #1, #2, #3)
// ============================================================================

test('Contrôle Codex P1 #1 : Un lancement échoué / maladresse dans applySpellExecution ne produit aucun effet sur la cible, consomme la réserve et applique le miscast', async () => {
  const store = createStore();
  await store.executeCommand('init-failed-cast', draft => {
    draft.combat = {
      round: 1,
      currentActorId: 'mage',
      order: ['mage', 'orc'],
      participants: [
        {
          id: 'mage',
          name: 'Mage',
          hp: 12,
          maxHp: 12,
          caracs: { Int: 45, FM: 50, E: 30 },
          skills: [{ name: 'Langue (Magick)', total: 55 }],
          extensions: { v5: { magic: { reserve: { type: 'winds', sl: 4 } } } }
        },
        {
          id: 'orc',
          name: 'Orque',
          hp: 15,
          maxHp: 15,
          caracs: { E: 30 },
          armor: { body: 1 }
        }
      ]
    };
    return draft;
  });

  // Reproduction exacte Codex #1 : roll 88 (maladresse sur 55), corruptingInfluence + miscastRoll 12 (Poupée de chiffon MAJOR 11-15 : 1d10 B réduits par BE + À Terre)
  const res = await store.applySpellExecution('Carreau', {
    actorId: 'mage',
    targetIds: ['orc'],
    roll: 88,
    corruptingInfluence: true,
    miscastRoll: 12,
    secondaryRolls: { woundsRoll: 7, distanceRoll: 4 }
  });

  const orcAfter = store.getCombat().participants.get('orc');
  const mageAfter = store.getCombat().participants.get('mage');

  assert.equal(res.spellSuccess, false, 'Le sort a échoué');
  assert.equal(orcAfter.hp, 15, 'L’orque cible ne doit subir aucun dégât sur un lancement échoué');
  assert.equal(mageAfter.extensions.v5.magic.reserve.sl, 0, 'La réserve du lanceur doit être consommée');
  assert.ok(mageAfter.extensions.v5.lastMiscast, 'Le miscast doit être appliqué au lanceur');
  assert.equal(mageAfter.hp, 8, 'Le lanceur subit Poupée de chiffon : max(1, 7 - BE 3) = 4 Blessures (12 -> 8)');
  assert.ok(mageAfter.states.some(s => s.key === 'a-terre' || s.name === 'À Terre'), 'Le lanceur reçoit l’état À Terre');

  // Undo restaure intégralement le lanceur et sa réserve
  await store.undo();
  const mageRestored = store.getCombat().participants.get('mage');
  assert.equal(mageRestored.hp, 12);
  assert.equal(mageRestored.extensions.v5.magic.reserve.sl, 4);
  assert.equal(mageRestored.states.length, 0);

  // Cas 2 : sl: 0 sur Carreau (NI 4) sans réserve -> échec d'incantation (0 < 4), cible indemne
  const resLowSl = await store.applySpellExecution('Carreau', {
    actorId: 'mage',
    targetIds: ['orc'],
    sl: -1
  });
  assert.equal(resLowSl.spellSuccess, false);
  assert.equal(store.getCombat().participants.get('orc').hp, 15, 'sl: 0 < NI 4 ne doit pas infliger de dégâts');
  await store.undo();

  // Cas 3 (Reproduction exacte LOT3_CONTROLE_CORRECTIONS_GEMINI #1) :
  // Langue (Magick) 60, réserve 15, Carreau NI4, jet 99, cible à 30 B.
  // Passer castResult de previewCasting à applySpellExecution ne doit PAS infliger de dégâts (cible reste à 30 B).
  await store.executeCommand('setup-repro-1', draft => {
    const m = draft.combat.participants.find(p => p.id === 'mage');
    m.skills = [{ name: 'Langue (Magick)', total: 60 }];
    m.extensions.v5.magic.reserve = { type: 'winds', sl: 15 };
    const o = draft.combat.participants.find(p => p.id === 'orc');
    o.hp = 30;
    o.maxHp = 30;
    return draft;
  });

  const carreauContract = getSpellContract('Carreau');
  const castResult99 = store.previewCasting(carreauContract, {
    actorId: 'mage',
    roll: 99,
    miscastRoll: 15
  });
  assert.equal(castResult99.spellSuccess, false);

  const repro1Res = await store.applySpellExecution(carreauContract, {
    actorId: 'mage',
    targetIds: ['orc'],
    roll: 99,
    miscastRoll: 15,
    castResult: castResult99
  });
  assert.equal(repro1Res.spellSuccess, false);
  assert.equal(store.getCombat().participants.get('orc').hp, 30, 'Cible reste à 30 B malgré réserve 15 sur jet 99');
  assert.equal(store.getCombat().participants.get('mage').extensions.v5.magic.reserve.sl, 0, 'Réserve consommée');
  await store.undo();

  // Cas 4 (Reproduction exacte LOT3_CONTROLE_CORRECTIONS_GEMINI #2) :
  // Jet 22 réussi, choix Puissance totale, jet d’incident Mineur 15 (Distraction -> Surpris).
  // Après applySpellExecution avec castResult, la cible subit les dégâts ET le lanceur reçoit l'état Surpris.
  const castResult22 = store.previewCasting(carreauContract, {
    actorId: 'mage',
    roll: 22,
    criticalChoice: 'total-power',
    miscastRoll: 15
  });
  assert.equal(castResult22.spellSuccess, true);
  assert.equal(castResult22.miscast?.name, 'Distraction');
  assert.deepEqual(castResult22.miscast?.conditionsGained, ['Surpris']);

  const repro2Res = await store.applySpellExecution(carreauContract, {
    actorId: 'mage',
    targetIds: ['orc'],
    roll: 22,
    criticalChoice: 'total-power',
    miscastRoll: 15,
    castResult: castResult22
  });
  assert.equal(repro2Res.spellSuccess, true);
  const orcAfter22 = store.getCombat().participants.get('orc');
  const mageAfter22 = store.getCombat().participants.get('mage');
  assert.ok(orcAfter22.hp < 30, 'La cible subit les dégâts du sort');
  assert.ok(mageAfter22.states.some(s => s.key === 'surpris' || s.name === 'Surpris'), 'Le lanceur reçoit l’état Surpris de l’incident Distraction');
  assert.equal(mageAfter22.extensions.v5.magic.reserve.sl, 0, 'Réserve consommée');

  await store.undo();
  assert.equal(store.getCombat().participants.get('orc').hp, 30);
  assert.equal(store.getCombat().participants.get('mage').states.length, 0);
  assert.equal(store.getCombat().participants.get('mage').extensions.v5.magic.reserve.sl, 15);
});

test('Contrôle Codex P1 #1 : Validation de castingPreview forgé, overcastChoices excessifs et choix critiques d’incantation', async () => {
  const store = createStore();
  await store.executeCommand('init-cast-validation', draft => {
    draft.combat = {
      round: 1,
      currentActorId: 'mage',
      order: ['mage', 'orc'],
      participants: [
        {
          id: 'mage',
          name: 'Mage',
          hp: 12,
          maxHp: 12,
          caracs: { Int: 50, FM: 50, E: 30 },
          skills: [{ name: 'Langue (Magick)', total: 70 }],
          extensions: { v5: { magic: { reserve: { type: 'winds', sl: 0 } } } }
        },
        {
          id: 'orc',
          name: 'Orque',
          hp: 15,
          maxHp: 15,
          caracs: { E: 30 },
          armor: { body: 1 }
        }
      ]
    };
    return draft;
  });

  // 1. castingPreview forgé pour un autre sort -> rejeté
  await assert.rejects(
    async () => {
      await store.applySpellExecution('Carreau', {
        actorId: 'mage',
        targetIds: ['orc'],
        castingPreview: {
          actionType: 'casting',
          actorId: 'mage',
          spell: { id: 'autre-sort', name: 'Autre Sort', cn: 0 },
          testSuccess: true,
          spellSuccess: true,
          testSl: 10,
          totalCastingSl: 10
        }
      });
    },
    /correspond pas au sort/
  );

  // 2. overcastChoices dépassant le surplus réel (roll 25 sur 70 -> +5 DR, NI 4 -> surplus 1 DR, mais dépense 8 DR demandée) -> rejeté
  await assert.rejects(
    async () => {
      await store.applySpellExecution('Carreau', {
        actorId: 'mage',
        targetIds: ['orc'],
        roll: 25,
        burnoutRoll:50, overcastChoices: { damage: 8 }
      });
    },
    /surpuissance|excédent|insuffisant/i
  );

  // 3. criticalChoice sur un jet non critique (roll 25) -> rejeté
  await assert.rejects(
    async () => {
      await store.applySpellExecution('Carreau', {
        actorId: 'mage',
        targetIds: ['orc'],
        roll: 25,
        criticalChoice: 'total-power'
      });
    },
    /pas un critique/i
  );

  // 4. critical-wound sur un sort sans dégâts (Alerte) -> rejeté même sur un double réussi (roll 22)
  await assert.rejects(
    async () => {
      await store.applySpellExecution('Alerte', {
        actorId: 'mage',
        targetIds: ['mage'],
        roll: 22,
        criticalChoice: 'critical-wound'
      });
    },
    /ne cause pas de dégâts/i
  );

  // 5. critical-wound et unstoppable-force sur un double réussi (roll 22 sur Carreau)
  const critPreview = store.previewSpellExecution('Carreau', {
    actorId: 'mage',
    targetIds: ['orc'],
    roll: 22,
    criticalChoice: 'critical-wound',
    miscastRoll: 15
  });
  assert.equal(critPreview.valid, true);
  assert.equal(critPreview.criticalChoice, 'critical-wound');
  assert.equal(critPreview.targetResults[0].criticalWoundTriggered, true);

  const unstoppablePreview = store.previewSpellExecution('Carreau', {
    actorId: 'mage',
    targetIds: ['orc'],
    roll: 22,
    criticalChoice: 'unstoppable-force',
    miscastRoll: 15
  });
  assert.equal(unstoppablePreview.valid, true);
  assert.equal(unstoppablePreview.unstoppableForce, true);
});

// ============================================================================
// 9. SECOND CONTRÔLE CODEX — P2 (PRÉSERVATION D'INCIDENT) & COMPLÉMENT P1 (CIBLES)
// ============================================================================

test('Second Contrôle Codex P2 : Un incident résolu transmis via castingPreview est préservé sans écrasement silencieux et un incident invalide est rejeté', async () => {
  const store = createStore();
  await store.executeCommand('init-second-p2', draft => {
    draft.combat = {
      round: 1,
      currentActorId: 'mage',
      order: ['mage', 'orc'],
      participants: [
        {
          id: 'mage',
          name: 'Mage',
          hp: 12,
          maxHp: 12,
          caracs: { Int: 50, FM: 50, E: 30 },
          skills: [{ name: 'Langue (Magick)', total: 70 }],
          states: [],
          extensions: { v5: { magic: { reserve: { type: 'winds', sl: 0 } } } }
        },
        {
          id: 'orc',
          name: 'Orque',
          hp: 15,
          maxHp: 15,
          caracs: { E: 30 },
          armor: { body: 1 },
          states: []
        }
      ]
    };
    return draft;
  });

  const bolt = getSpellContract('Carreau');
  const castPreview = store.previewCasting(
    { ...bolt, wind: 'fire', type: 'lore' },
    { actorId: 'mage', roll: 22, miscastRoll: 15 }
  );
  assert.equal(castPreview.miscast?.name, 'Distraction');
  assert.equal(castPreview.miscast?.initialRoll, 15);

  // Sans repasser miscastRoll dans options, previewSpellExecution et applySpellExecution doivent conserver Distraction (jet 15)
  const execPrev = store.previewSpellExecution('Carreau', {
    actorId: 'mage',
    targetIds: ['orc'],
    castingPreview: castPreview
  });
  assert.equal(execPrev.valid, true);
  assert.equal(execPrev.miscast?.name, 'Distraction');
  assert.equal(execPrev.miscast?.initialRoll, 15);

  await store.applySpellExecution('Carreau', {
    actorId: 'mage',
    targetIds: ['orc'],
    castingPreview: castPreview
  });

  const mageAfter = store.getCombat().participants.get('mage');
  assert.equal(mageAfter.extensions.v5.lastMiscast?.name, 'Distraction');
  assert.equal(mageAfter.extensions.v5.lastMiscast?.initialRoll, 15);
  assert.ok(
    mageAfter.states.some(s => s.key === 'surpris' || s.name === 'Surpris'),
    'Distraction doit appliquer l’état Surpris au lanceur'
  );

  // Un objet miscast incomplet ou incohérent dans castingPreview doit être rejeté explicitement
  const brokenCastPreview = {
    ...structuredClone(castPreview),
    miscast: { severity: 'MINOR' } // sans name ni initialRoll/finalRoll
  };
  const invalidPrev = store.previewSpellExecution('Carreau', {
    actorId: 'mage',
    targetIds: ['orc'],
    castingPreview: brokenCastPreview
  });
  assert.equal(invalidPrev.valid, false);
  assert.equal(invalidPrev.status, 'invalid-miscast');

  await assert.rejects(
    async () => {
      await store.applySpellExecution('Carreau', {
        actorId: 'mage',
        targetIds: ['orc'],
        castingPreview: brokenCastPreview
      });
    },
    /Incident magique transmis (invalide|incomplet)/i
  );
});

test('Second Contrôle Codex Complément P1 : Validation du nombre de cibles (base + surpuissance) et de l’admissibilité selon le contrat', async () => {
  const store = createStore();
  await store.executeCommand('init-complement-p1', draft => {
    draft.combat = {
      round: 1,
      currentActorId: 'mage',
      order: ['mage', 'ally', 'enemy', 'enemy2', 'daemon'],
      participants: [
        {
          id: 'mage',
          name: 'Mage',
          camp: 'pj',
          kind: 'PJ',
          hp: 12,
          maxHp: 12,
          caracs: { Int: 50, FM: 50, E: 30 },
          skills: [{ name: 'Langue (Magick)', total: 80 }]
        },
        {
          id: 'ally',
          name: 'Allié',
          camp: 'pj',
          kind: 'PJ',
          hp: 12,
          maxHp: 12,
          caracs: { CC: 35, CT: 30, F: 35, E: 30, I: 30, Ag: 30 }
        },
        {
          id: 'enemy',
          name: 'Ennemi 1',
          camp: 'ennemi',
          kind: 'PNJ',
          hp: 12,
          maxHp: 12,
          caracs: { E: 30 }
        },
        {
          id: 'enemy2',
          name: 'Ennemi 2',
          camp: 'ennemi',
          kind: 'PNJ',
          hp: 12,
          maxHp: 12,
          caracs: { E: 30 }
        },
        {
          id: 'daemon',
          name: 'Démon Mineur',
          camp: 'ennemi',
          kind: 'Créature',
          hp: 14,
          maxHp: 14,
          caracs: { E: 40 },
          traits: ['Démoniaque']
        }
      ]
    };
    return draft;
  });

  // 1. Carreau (target: "1") avec 2 cibles sans surpuissance "targets" -> rejeté
  const multiWithoutOvercast = store.previewSpellExecution('Carreau', {
    actorId: 'mage',
    targetIds: ['ally', 'enemy'],
    roll: 25
  });
  assert.equal(multiWithoutOvercast.valid, false);
  assert.equal(multiWithoutOvercast.status, 'invalid-target-count');

  await assert.rejects(
    async () => {
      await store.applySpellExecution('Carreau', {
        actorId: 'mage',
        targetIds: ['ally', 'enemy'],
        roll: 25
      });
    },
    /2 cible\(s\) sélectionnée\(s\) pour un maximum autorisé de 1/i
  );
  assert.equal(store.getCombat().participants.get('ally').hp, 12);
  assert.equal(store.getCombat().participants.get('enemy').hp, 12);

  // 2. Carreau avec surpuissance targets: 1 (coût 1 DR) et 2 cibles -> autorisé
  const multiWithOvercast = store.previewSpellExecution('Carreau', {
    actorId: 'mage',
    targetIds: ['enemy', 'enemy2'],
    roll: 15, // +7 DR vs NI 4 -> excédent 3 DR
    burnoutRoll:50, overcastChoices: { targets: 1 }
  });
  assert.equal(multiWithOvercast.valid, true);
  assert.equal(multiWithOvercast.ready, true);
  assert.equal(multiWithOvercast.targetResults.length, 2);

  // 3. Sort de Zone (Purification, ZdE, NI 10) avec allié + ennemi -> autorisé
  const aoeMixed = store.previewSpellExecution('Purification', {
    actorId: 'mage',
    targetIds: ['ally', 'enemy'],
    sl: 12
  });
  assert.equal(aoeMixed.valid, true);
  assert.equal(aoeMixed.ready, true);
  assert.equal(aoeMixed.targetResults.length, 2);

  // 4. Sort personnel (Bouclier magique, target: "Vous") sur autrui -> rejeté
  const selfOnOther = store.previewSpellExecution('Bouclier magique', {
    actorId: 'mage',
    targetIds: ['ally'],
    roll: 25
  });
  assert.equal(selfOnOther.valid, false);
  assert.equal(selfOnOther.status, 'invalid-target-admissibility');

  // 5. Sort réservé aux alliés (Main de Gloire) sur un ennemi -> rejeté
  const allySpellOnEnemy = store.previewSpellExecution('Main de Gloire', {
    actorId: 'mage',
    targetIds: ['enemy'],
    roll: 15
  });
  assert.equal(allySpellOnEnemy.valid, false);
  assert.equal(allySpellOnEnemy.status, 'invalid-target-admissibility');

  // 6. Régiment Monstrueux de Merciw (alliés hors lanceur) sur le lanceur -> rejeté ; sur un allié -> accepté
  const merciwOnSelf = store.previewSpellExecution('Régiment Monstrueux de Merciw', {
    actorId: 'mage',
    targetIds: ['mage'],
    roll: 15
  });
  assert.equal(merciwOnSelf.valid, false);
  assert.equal(merciwOnSelf.status, 'invalid-target-admissibility');

  const merciwOnAlly = store.previewSpellExecution('Régiment Monstrueux de Merciw', {
    actorId: 'mage',
    targetIds: ['ally'],
    roll: 15
  });
  assert.equal(merciwOnAlly.valid, true);
  assert.equal(merciwOnAlly.ready, true);

  // 7. Fléau des Démons sur non-démon -> rejeté ; sur démon -> accepté
  const daemonbaneOnOrc = store.previewSpellExecution('Fléau des Démons', {
    actorId: 'mage',
    targetIds: ['enemy'],
    roll: 15
  });
  assert.equal(daemonbaneOnOrc.valid, false);
  assert.equal(daemonbaneOnOrc.status, 'invalid-target-admissibility');

  const daemonbaneOnDaemon = store.previewSpellExecution('Fléau des Démons', {
    actorId: 'mage',
    targetIds: ['daemon'],
    roll: 15
  });
  assert.equal(daemonbaneOnDaemon.valid, true);
  assert.equal(daemonbaneOnDaemon.ready, true);
});
});
