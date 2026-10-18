/**
 * Corrections de la livraison 2a (retours de vérification) : PA magiques, temps hors combat, Forme bestiale,
 * Mouvement, Chance/Destin temporaires, Protection de domaine.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';
import { applySpellEffects, expireSpellEffects, endBeastForm, parseSpellDuration, resolveMagicMissile, resolveTypedDuration } from '../js/core/v5-magic-effects.js';
import { applyBeastForm } from '../js/core/v5-magic-arbitrations.js';
import { processCombatTurnSpells } from '../js/core/v5-magic-turn.js';
import { previewLoreAttribute, applyLoreAttribute } from '../js/core/v5-magic-attributes.js';

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const armourItem = (id, layer, ap) => ({ id, baseId: id, catalogVersion: 'fixture', kind: 'armour', name: id, category: 'Armure', damage: '', reach: '', range: '', notes: '', source: '', custom: true,
  ap, layer, locations: ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'], keywords: [] });

const ROLLS = [9, 11, 33, 40, 55, 88]; // une localisation par jet (jet inversé)
const shoot = (store, roll) => store.previewResolution({ v5: { kind: 'ranged' }, actorId: 'archer', targetId: 'mage', action: { type: 'attack', base: 99, damage: 2 }, roll });
const missile = (store, roll) => resolveMagicMissile({ caster: person(store, 'archer'), target: person(store, 'mage'), spell: { damage: 4 }, roll });
/** PA lus par l’arme et par le projectile, par localisation touchée, pour un même jet. */
function protections(store) {
  const rows = {};
  for (const roll of ROLLS) rows[roll] = { weapon: shoot(store, roll).protection, missile: missile(store, roll).ap };
  return rows;
}

const VARIANTS = {
  'armor seul': { armor: { head: 1, body: 2, arms: 1, legs: 1 } },
  'armorLocations importé': { armor: { head: 0, body: 0, arms: 0, legs: 0 }, armorLocations: { head: 1, body: 2, rightArm: 1, leftArm: 1, rightLeg: 1, leftLeg: 1 } },
  'armure équipée': { equipment: [armourItem('cuir', 'leather', 1), armourItem('plate', 'rigid', 1)] }
};

for (const [name, extra] of Object.entries(VARIANTS)) {
  test(`PA magiques — ${name} : arme et projectile magique lisent la même protection, avant et après expiration`, async () => {
    const store = await combat(wizard('mage', extra), wizard('archer'));
    const before = protections(store);
    assert.equal(new Set(ROLLS.map(roll => before[roll].weapon.location)).size, 6, 'les six localisations sont couvertes');
    await store.applySpellExecution('Armure aethyrique', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
    const buffed = protections(store);
    for (const roll of ROLLS) {
      assert.equal(buffed[roll].weapon.ap, before[roll].weapon.ap + 1 /* V5 p. 242 */, `arme, jet ${roll}`);
      assert.equal(buffed[roll].missile, buffed[roll].weapon.ap, `projectile = arme, jet ${roll}`);
    }
    await store.expireSpellEffects('mage', { currentRound: 99 });
    const after = protections(store);
    for (const roll of ROLLS) {
      assert.equal(after[roll].weapon.ap, before[roll].weapon.ap, `arme après expiration, jet ${roll}`);
      assert.equal(after[roll].missile, before[roll].missile, `projectile après expiration, jet ${roll}`);
    }
  });
}

test('PA magiques — PA détruits (Arcanes) soustraits une seule fois, avec PA magiques ajoutés', async () => {
  const store = await combat(wizard('mage', { equipment: [armourItem('cuir', 'leather', 3)], extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 }, armorDamage: { body: 2 } } } }), wizard('archer'));
  await store.applySpellExecution('Armure aethyrique', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  const rows = ROLLS.map(roll => ({ weapon: shoot(store, roll).protection, missile: missile(store, roll).ap }));
  for (const { weapon, missile: ap } of rows) {
    assert.equal(weapon.ap, weapon.location === 'body' ? 3 + 1 - 2 : 3 + 1 /* V5 p. 242 */);
    assert.equal(ap, weapon.ap);
  }
});

async function outOfCombat(...people) {
  const store = await combat(...people);
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  assert.equal(store.getCombat().round, 0);
  return store;
}
const buff = (id, duration) => ({ id, spellId: id, casterId: 'mage', statModifiers: { CC: 10 }, duration });

test('Temps hors combat — le Round courant est 1 partout : 6 Rounds + 1 minute, 12 Rounds + 2 × 1 minute, 1 Round + 0,2 minute expirent', async () => {
  const store = await outOfCombat(wizard());
  await store.applySpellEffects('mage', buff('six', '6 Rounds'));
  await store.advanceTalentMinutes(1);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 0, '6 Rounds = 1 minute');
  assert.equal(person(store, 'mage').caracs.CC, 40);

  await store.applySpellEffects('mage', buff('douze', '12 Rounds'));
  await store.advanceTalentMinutes(1);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 1, '1 minute sur 2 : actif');
  await store.advanceTalentMinutes(1);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 0);

  await store.applySpellEffects('mage', buff('un', '1 Round'));
  await store.advanceTalentMinutes(0.2);
  assert.equal(person(store, 'mage').extensions.v5.spellEffects.length, 0, '1 Round = 10 s < 0,2 minute');
});

const wolf = { name: 'Loup', M: 9, hp: 12, caracs: { CC: 35, CT: 0, F: 35, E: 30, I: 40, Ag: 40, Dex: 0, Int: 14, FM: 20, Soc: 10 }, traits: ['Morsure'] };
function beastFormWithExpiredBuff() {
  let p = applySpellEffects(wizard(), { id: 'buff', spellId: 'buff', casterId: 'mage', statModifiers: { CC: 10, M: 2 }, duration: 3 }, { round: 1 }).participant;
  assert.equal(p.caracs.CC, 50); assert.equal(p.caracs.M, 6);
  p = applyBeastForm(p, wolf, { round: 1, durationMinutes: 30 }).participant;
  p = applySpellEffects(p, { id: 'marker', spellId: 'beast', casterId: 'mage', beastFormMarker: true, duration: '30 minutes' }, { round: 1 }).participant;
  return expireSpellEffects(p, { effectId: 'buff' }).participant;
}

test('Forme bestiale — retour manuel : couches recalculées sur la base d’origine, marqueur retiré', async () => {
  const sous = beastFormWithExpiredBuff();
  assert.equal(sous.caracs.F, 35, 'sous la forme : Force de la bête'); assert.equal(sous.caracs.CC, 40, 'CC du lanceur conservée (V5 p. 245), couche expirée retirée'); assert.equal(sous.caracs.M, 9);
  const store = await combat(sous);
  await store.revertBeastForm('mage');
  const back = person(store, 'mage');
  assert.equal(back.caracs.CC, 40); assert.equal(back.caracs.M, 4); assert.equal(back.movement, 4);
  assert.deepEqual((back.extensions.v5.spellEffects || []).filter(e => e.beastFormMarker), [], 'plus de marqueur orphelin');
  assert.equal(back.extensions.v5.beastForm, undefined);
});

test('Forme bestiale — même chemin au terme de la durée (Tour) : pas de marqueur ni de valeurs périmées', () => {
  const sous = beastFormWithExpiredBuff();
  const [back] = processCombatTurnSpells([sous], 999, 'mage', { actorId: 'mage', round: 999 });
  assert.equal(back.caracs.CC, 40); assert.equal(back.caracs.M, 4);
  assert.equal((back.extensions.v5.spellEffects || []).length, 0);
  assert.equal(back.extensions.v5.beastForm, undefined);
});

test('Forme bestiale — un buff encore actif au retour reste appliqué sur la base d’origine', () => {
  let p = applySpellEffects(wizard(), { id: 'long', spellId: 'long', casterId: 'mage', statModifiers: { CC: 10 }, duration: '60 minutes' }, { round: 1 }).participant;
  p = applyBeastForm(p, wolf, { round: 1, durationMinutes: 30 }).participant;
  const back = endBeastForm(p).participant;
  assert.equal(back.caracs.CC, 50);
});

const withoutMovement = () => { const p = wizard(); delete p.caracs.M; return p; };

test('Mouvement — jamais inventé : aperçu bloqué sans Mouvement connu, M non écrit par les autres sorts', async () => {
  const store = await combat(withoutMovement());
  const blocked = store.previewSpellExecution('Passage Rapide', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  assert.equal(blocked.ready, false);
  assert.match(blocked.error, /Mouvement du participant requis/);
  assert.deepEqual(blocked.missing, ['movement']);

  const other = applySpellEffects(withoutMovement(), { id: 'cc', spellId: 'cc', statModifiers: { CC: 10 }, duration: 3 }, { round: 1 }).participant;
  assert.equal(other.caracs.CC, 50);
  assert.equal(Object.hasOwn(other.caracs, 'M'), false);
  assert.equal(other.movement, undefined); assert.equal(other.M, undefined);

  const forced = applySpellEffects(withoutMovement(), { id: 'm', spellId: 'm', statModifiers: { M: 1 }, duration: 3 }, { round: 1 }).participant;
  assert.equal(Object.hasOwn(forced.caracs, 'M'), false, 'aucun 4 par défaut');

  const known = await combat(wizard());
  assert.equal(known.previewSpellExecution('Passage Rapide', { actorId: 'mage', targetIds: ['mage'], roll: 25 }).ready, true);
  const fiche = applySpellEffects({ ...withoutMovement(), movement: 5 }, { id: 'm', spellId: 'm', statModifiers: { M: 1 }, duration: 3 }, { round: 1 }).participant;
  assert.equal(fiche.caracs.M, 6, 'Mouvement de fiche pris comme base');
});

test('Durée — la surpuissance de durée s’applique aussi à Main de Gloire, à la Forme bestiale ; la durée saisie par le MJ est une durée de base', async () => {
  const input = (extra = {}) => ({ actorId: 'mage', targetIds: ['ally'], roll: 25, chosenStats: [], hogTier: 'movement', ...extra });
  const hog = async extra => {
    const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } } }), wizard('ally'));
    const preview = store.previewSpellExecution('Main de Gloire', input(extra));
    assert.equal(preview.ready, true, preview.error);
    await store.applySpellExecution('Main de Gloire', input(extra));
    return { effect: person(store, 'ally').extensions.v5.spellEffects[0], multiplier: preview.overcast.durationMultiplier };
  };
  const plain = await hog(), doubled = await hog({ overcastChoices: { duration: 2 } });
  assert.equal(plain.effect.durationRounds, 1);
  assert.ok(doubled.multiplier >= 2);
  assert.equal(doubled.effect.durationRounds, doubled.multiplier);

  const beast = async extra => {
    const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 20 } } } }));
    const options = { actorId: 'mage', targetIds: ['mage'], roll: 25, beastKey: 'wolf', attributeActive: false, ...extra };
    const preview = store.previewSpellExecution('Forme bestiale', options);
    assert.equal(preview.ready, true, preview.error);
    await store.applySpellExecution('Forme bestiale', options);
    const p = person(store, 'mage');
    return { form: p.extensions.v5.beastForm, marker: p.extensions.v5.spellEffects.find(e => e.beastFormMarker), multiplier: preview.overcast.durationMultiplier };
  };
  const bPlain = await beast(), bDoubled = await beast({ overcastChoices: { duration: 2 } });
  assert.equal(bPlain.form.durationMinutes, 30);
  assert.equal(bDoubled.form.durationMinutes, 30 * bDoubled.multiplier);
  assert.equal(bDoubled.marker.durationMinutes, bDoubled.form.durationMinutes);

  // Durée saisie par le MJ = durée de base, avant surpuissance : elle est multipliée comme une durée de contrat
  // (`effectDuration` la renvoie sous la forme « 3 minutes » avant résolution typée).
  const mj = resolveTypedDuration({ duration: '3 minutes' }, wizard(), { round: 1, overcastDurationMultiplier: 2 });
  assert.equal(mj.durationMinutes, 6);
  assert.equal(mj.durationRounds, 36);
});

test('Durée — attribut des Ombres : la durée du sort protégé suit le palier de durée, l’attribut des Bêtes garde ses BFM Rounds', () => {
  const caster = wizard();
  const apply = (lore, multiplier) => {
    const preview = previewLoreAttribute({ caster, targets: [], lore, spell: { name: 'Protection', effects:{ward:7}, duration: '2 Rounds' } });
    const receipt = applyLoreAttribute({}, preview, { caster, round: 1, targets: [], overcastDurationMultiplier: multiplier });
    return receipt.updatedParticipants.get('mage').extensions.v5.spellEffects[0];
  };
  assert.equal(apply('shadow', 1).durationRounds, 2);
  assert.equal(apply('shadow', 2).durationRounds, 4);
  assert.equal(apply('beasts', 2).durationRounds, 4, 'BFM (4) Rounds, non multipliés');
});

const caster = (extra = {}) => wizard('mage', { fortune: 2, ...extra });
const resourcesOf = (store, id) => person(store, id).extensions.v5.resources;

test('Chance temporaire — Signes d’Amul : le registre porte la composante temporaire, aucune écriture à plat, expiration et consommation cohérentes', async () => {
  const store = await combat(caster());
  await store.setFortune('mage', 2);
  await store.applySpellExecution('Le Second Signe d’Amul', { actorId: 'mage', targetIds: ['mage'], roll: 15, attributeActive: false });
  const fortune = store.getFortune('mage');
  assert.equal(fortune.permanent, 2); assert.equal(fortune.temporary, 3); assert.equal(fortune.balance, 5);
  assert.equal(resourcesOf(store, 'mage').fortune, 5, 'projection = registre');
  const mage = person(store, 'mage'), v5 = mage.extensions.v5;
  assert.equal(mage.fortune, 2, 'participant.fortune non réécrit'); assert.equal(mage.chance, undefined);
  for (const key of ['temporaryFortune', 'basePermanentFortune', 'fortune']) assert.equal(v5[key], undefined, `extensions.v5.${key} non écrit`);

  assert.equal(store.consumeTemporaryFortune('mage', 1).consumed, 1);
  assert.deepEqual([store.getFortune('mage').temporary, store.getFortune('mage').balance, resourcesOf(store, 'mage').fortune], [2, 4, 4]);

  await store.expireSpellEffects('mage', { currentRound: 10 });
  assert.deepEqual([store.getFortune('mage').temporary, store.getFortune('mage').balance, resourcesOf(store, 'mage').fortune], [0, 2, 2]);
  assert.equal(store.getFortune('mage').permanent, 2);
});

test('Chance temporaire — une action payante dépense d’abord la Chance temporaire, puis la permanente', async () => {
  const store = await combat(caster());
  await store.setFortune('mage', 2);
  await store.applySpellExecution('Le Premier Signe d’Amul', { actorId: 'mage', targetIds: ['mage'], roll: 15, attributeActive: false });
  const v5 = person(store, 'mage').extensions.v5;
  await store.updateParticipant('mage', { extensions: { ...person(store, 'mage').extensions, v5: { ...v5, burnout: { active: true, permanent: false, days: 3 } } } });
  assert.deepEqual([store.getFortune('mage').permanent, store.getFortune('mage').temporary], [2, 1]);
  const recovery = store.previewBurnoutRecovery({ actorId: 'mage' });
  assert.equal(recovery.possible, true);
  await store.applyBurnoutRecovery(recovery, { actorId: 'mage' });
  assert.deepEqual([store.getFortune('mage').permanent, store.getFortune('mage').temporary, store.getFortune('mage').balance], [2, 0, 2], 'le point temporaire est payé en premier');
  await store.undo();
  assert.deepEqual([store.getFortune('mage').permanent, store.getFortune('mage').temporary], [2, 1]);
});

test('Chance temporaire — aucune divergence registre/projection après nextTurn jusqu’à l’expiration', async () => {
  const store = await combat(caster());
  await store.setFortune('mage', 2);
  await store.applySpellExecution('Le Second Signe d’Amul', { actorId: 'mage', targetIds: ['mage'], roll: 15, attributeActive: false });
  const seen = [];
  for (let i = 0; i < 12; i++) {
    await store.nextTurn();
    assert.equal(resourcesOf(store, 'mage').fortune, store.getFortune('mage').balance, `tour ${i + 1}`);
    seen.push(store.getFortune('mage').temporary);
  }
  assert.equal(seen[0], 3); assert.equal(seen.at(-1), 0, 'expiré à la fin du Tour de l’auteur');
});

test('Destin temporaire — Troisième Signe d’Amul : composante temporaire du registre, expiration et consommation', async () => {
  const store = await combat(caster({ extensions: { v5: { hasMomentum: true, fate: 2, channelling: { type: 'winds', sl: 30 } } } }));
  await store.applySpellExecution('Le Troisième Signe d’Amul', { actorId: 'mage', targetIds: ['mage'], roll: 15, attributeActive: false });
  let fate = store.getFate('mage');
  assert.deepEqual([fate.permanent, fate.temporary, fate.balance], [2, 1, 3]);
  const v5 = person(store, 'mage').extensions.v5;
  assert.equal(v5.fate, 2, 'extensions.v5.fate reste le Destin permanent');
  for (const key of ['temporaryFate', 'basePermanentFate']) assert.equal(v5[key], undefined);
  assert.equal(person(store, 'mage').destin, undefined);
  assert.equal(store.consumeTemporaryFate('mage', 1).consumed, 1);
  fate = store.getFate('mage');
  assert.deepEqual([fate.permanent, fate.temporary, fate.balance], [2, 0, 2]);

  const reserve = person(store, 'mage').extensions;
  await store.updateParticipant('mage', { extensions: { ...reserve, v5: { ...reserve.v5, channelling: { type: 'winds', sl: 30 } } } }); // la réserve est consommée par chaque lancer
  await store.applySpellExecution('Le Troisième Signe d’Amul', { actorId: 'mage', targetIds: ['mage'], roll: 14, attributeActive: false });
  assert.equal(store.getFate('mage').temporary, 1);
  await store.expireSpellEffects('mage', { currentRound: 50 });
  assert.deepEqual([store.getFate('mage').temporary, store.getFate('mage').balance], [0, 2]);
});

test('Bouclier de Saphery — le seuil ne vit que dans la couche : rien d’orphelin à l’expiration', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } } }), wizard('ally'));
  await store.applySpellExecution('Bouclier de Saphery', { actorId: 'mage', targetIds: ['ally'], roll: 25, otherHighSpellsCount: 8 });
  assert.equal(person(store, 'ally').extensions.v5.ward, 1);
  assert.equal(person(store, 'ally').extensions.v5.sapheryWard, undefined, 'pas de copie à plat du seuil');
  await store.expireSpellEffects('ally', { currentRound: 99 });
  assert.equal(person(store, 'ally').extensions.v5.ward, undefined);
  assert.equal(person(store, 'ally').extensions.v5.sapheryWard, undefined);
});

test('Vision dans l’obscurité — durée du livre V5 (p. 243) : Bonus d’Initiative Rounds', () => {
  const contract = getSpellContract('Vision dans l’obscurité');
  assert.equal(contract.duration, '(Bonus d’Initiative) Rounds');
  assert.deepEqual(parseSpellDuration(contract.duration, { caster: { caracs: { I: 52, Int: 69, FM: 41 } } }), { kind: 'timed', unit: 'rounds', amount: 5 });
});
