/** Destruction des Arcanes : choix explicites, sans tirage ni écriture de fiche. */
import { calculateArmor, normalizeArmorLocations } from './equipment.js';
import { calculateEffectiveMagicAP } from './v5-magic-effects.js';
import { previewChannelling } from './v5-magic-channelling.js';
import { previewV5Test, selectV5Test } from './v5-roll.js';

export const ARCANE_ARMOR_LOCATIONS = Object.freeze([
  ['head', 'Tête'], ['body', 'Corps'], ['leftArm', 'Bras gauche'],
  ['rightArm', 'Bras droit'], ['leftLeg', 'Jambe gauche'], ['rightLeg', 'Jambe droite']
]);
const invalid = (error, status = 'arcane-data-required') => ({ ready: false, valid: false, status, error });

export function normalizeArcaneOptions(options = {}) {
  if (options.overcast8 || options.destroyArmorPiece || options.destroyMagicItem) {
    return invalid('Utilisez les options payées de Destruction des Arcanes ; les anciens raccourcis sont refusés.', 'invalid-arcane-options');
  }
  const declared = options.arcaneOptions || {};
  const armorPoints = declared.armorPoints ?? 0;
  const enhancedDamage = declared.enhancedDamage ?? false;
  const chooseMagicItem = declared.chooseMagicItem ?? false;
  if (!Number.isSafeInteger(armorPoints) || armorPoints < 0 || typeof enhancedDamage !== 'boolean' || typeof chooseMagicItem !== 'boolean') {
    return invalid('Options de Destruction des Arcanes invalides.', 'invalid-arcane-options');
  }
  return { ready: true, armorPoints, enhancedDamage, chooseMagicItem,
    cost: armorPoints + (enhancedDamage ? 8 : 0) + (chooseMagicItem ? 3 : 0) };
}

export function getArcaneWornArmor(target) {
  const worn = (target.equipment || []).filter(item => item.kind === 'armour' && item.layer !== 'bonus');
  const base = worn.length ? calculateArmor(worn)
    : target.extensions?.v5?.baseArmor || target.baseArmor || target.armorLocations || target.armor || {};
  const damage = target.extensions?.v5?.armorDamage || {};
  return Object.fromEntries(Object.entries(normalizeArmorLocations(base)).map(([loc, ap]) => [loc, Math.max(0, ap - (damage[loc] || 0))]));
}

function secondaryTest(score, roll, modifier = 0) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 100) return null;
  return selectV5Test(previewV5Test({ score, roll, kind: 'test',
    slModifiers: modifier ? [{ id: 'arcane-dexterity', amount: modifier }] : [] }), 'keep');
}

export function previewArcaneUnforgiving(actor, target, declared, facts) {
  if (!facts || typeof facts.magicItemPresent !== 'boolean') {
    return invalid(`Précisez si ${target.name || target.id} porte un objet magique.`);
  }
  const armorBefore = getArcaneWornArmor(target);
  const armorAfter = structuredClone(armorBefore);
  const locations = facts.armorDamageLocations ?? [];
  if (!Array.isArray(locations) || locations.length !== declared.armorPoints) {
    return invalid(`Renseignez les ${declared.armorPoints} localisations tirées au sort pour les PA détruits de ${target.name || target.id}.`);
  }
  const damageByLocation = {};
  for (const loc of locations) {
    if (!Object.hasOwn(armorAfter, loc) || armorAfter[loc] < 1) {
      return invalid(`Aucun PA porté disponible à la localisation ${loc} pour ${target.name || target.id}.`, 'invalid-arcane-armor');
    }
    armorAfter[loc]--;
    damageByLocation[loc] = (damageByLocation[loc] || 0) + 1;
  }
  let focalisationTest = null, dexterityTest = null, destroyedMagicItem = null;
  if (facts.magicItemPresent) {
    if (!Number.isInteger(facts.focalisationRoll) || facts.focalisationRoll < 1 || facts.focalisationRoll > 100) return invalid('Saisissez le Test de Focalisation (Haute Magie) pour détruire l’objet magique.');
    let channel;
    try { channel = previewChannelling(actor, { type: 'high', roll: facts.focalisationRoll, choice: facts.focalisationChoice,
      slModifiers: facts.focalisationModifiers || [], advantageSources: facts.focalisationAdvantages || [], disadvantageSources: facts.focalisationDisadvantages || [],
      miscastRoll: facts.miscastRoll, majorRoll: facts.majorRoll, secondaryRolls: facts.secondaryRolls, lossRoll: facts.lossRoll,
      miscastRoll2: facts.miscastRoll2, miscastChoice: facts.miscastChoice }); }
    catch (error) { return invalid(error.message); }
    if (!channel.test) return invalid(channel.error || 'Focalisation (Haute Magie) indisponible.');
    focalisationTest = { ...channel.test, sl: channel.sl, skill: 'Focalisation (Haute Magie)' };
    if (focalisationTest.success) {
      if (declared.chooseMagicItem) {
        if (!Number.isFinite(actor.caracs?.Dex)) return invalid('La Dextérité du lanceur est nécessaire au choix de l’objet.');
        dexterityTest = secondaryTest(actor.caracs.Dex, facts.dexterityRoll, 2);
        if (!dexterityTest) return invalid('Saisissez le Test de Dextérité (+2 DR) pour choisir l’objet magique.');
      }
      const chosen = declared.chooseMagicItem && dexterityTest.success;
      const name = chosen ? facts.chosenMagicItem : facts.randomMagicItem;
      if (typeof name !== 'string' || !name.trim()) {
        return invalid(chosen ? 'Indiquez l’objet magique choisi.' : 'Indiquez l’objet magique tiré au sort par le MJ.');
      }
      destroyedMagicItem = { name: name.trim(), selection: chosen ? 'chosen' : 'random' };
    }
  }
  const totalWornAp = Object.values(armorBefore).reduce((sum, ap) => sum + ap, 0);
  const rawDamage = declared.enhancedDamage ? totalWornAp : Math.floor(totalWornAp / 2);
  const targetBe = Math.floor((Number(target.caracs?.E) || 0) / 10);
  const finalDamage = Math.max(0, rawDamage - targetBe);
  return { ready: true, totalWornAp, rawDamage, targetBe, finalDamage, location: 'Corps',
    destroyedAp: locations.length, armorDamageLocations: [...locations], damageByLocation,
    armorBefore, armorAfter, focalisationTest, dexterityTest, destroyedMagicItem,
    magicItemDestroyed: Boolean(destroyedMagicItem), overcast8: declared.enhancedDamage,
    overcastCost: declared.cost, requiresInventoryConfirmation: locations.length > 0 || Boolean(destroyedMagicItem) };
}

/** Dégradation physique dans l’outil : persiste après dissipation, reste annulable. */
export function applyArcaneArmorDamage(target, receipt) {
  const next = structuredClone(target);
  if (!receipt.destroyedAp) return next;
  next.extensions = next.extensions || {};
  next.extensions.v5 = next.extensions.v5 || {};
  const v5 = next.extensions.v5;
  if (!v5.baseArmor) {
    const worn = (next.equipment || []).filter(item => item.kind === 'armour' && item.layer !== 'bonus');
    v5.baseArmor = normalizeArmorLocations(worn.length ? calculateArmor(worn)
      : next.baseArmor || next.armorLocations || next.armor || {});
  }
  next.baseArmor = structuredClone(v5.baseArmor);
  v5.armorDamage = { ...(v5.armorDamage || {}) };
  for (const [loc, amount] of Object.entries(receipt.damageByLocation)) {
    v5.armorDamage[loc] = (v5.armorDamage[loc] || 0) + amount;
  }
  next.armor = calculateEffectiveMagicAP(v5.baseArmor, v5.spellEffects || [], v5.armorDamage);
  return next;
}
