/**
 * Pure V5 weapon-quality calculations for F2-D.
 *
 * This module deliberately does not register source coverage or mutate combat
 * state. The resolution/store/UI integration must consume these proposals
 * before the corresponding qualities may be reported as mechanically covered.
 */

const has = (qualities, id) => (Array.isArray(qualities) ? qualities : []).some(row =>
  (typeof row === 'string' ? row : row?.id) === id);
const quality = (qualities, id) => (Array.isArray(qualities) ? qualities : []).find(row =>
  (typeof row === 'string' ? row : row?.id) === id);
const positiveInt = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const number = value => Number(value);
const unique = values => [...new Set(values)];
const result = fields => ({ ready: true, unresolved: [], ...fields });
const blocked = (...unresolved) => ({ ready: false, unresolved });

function ratingOf(q, explicit) {
  const raw = explicit ?? (typeof q === 'object' ? q.parameter ?? q.rating : null);
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** Blast targets are supplied by the GM; this function never measures a radius. */
export function previewV5Blast({ qualities = [], targetIds, weaponDamage, unitsDie, conditions = [], damaging = has(qualities, 'devastatrice') } = {}) {
  if (!has(qualities, 'explosion')) return result({ targets: [], warning: null });
  const q = quality(qualities, 'explosion'), diameter = ratingOf(q);
  if (diameter === null || diameter < 1) return blocked('Explosion : diamètre positif requis.');
  if (!Array.isArray(targetIds)) return blocked('Explosion : cibles désignées par le MJ requises.');
  if (targetIds.some(id => typeof id !== 'string' || !id.trim())) return blocked('Explosion : identifiant de cible invalide.');
  if (!Number.isFinite(Number(weaponDamage))) return blocked('Explosion : dégâts d’arme requis.');
  if (damaging && !Number.isInteger(Number(unitsDie))) return blocked('Explosion : dé d’unités requis pour Dévastatrice.');
  const damage = Number(weaponDamage) + (damaging ? Number(unitsDie) : 0);
  return result({ diameter, targets: unique(targetIds).map(participantId => ({
    participantId, damage, slDamage: 0, opposed: false, conditions: structuredClone(conditions)
  })) });
}

/** Fast adds two to Combat Initiative only for this weapon's attack. */
export function previewV5Fast({ qualities = [], isAttack = false, dualWielding = false, secondWeaponAttack = false } = {}) {
  return result({ initiativeBonus: has(qualities, 'rapide') && isAttack && !dualWielding && !secondWeaponAttack ? 2 : 0 });
}

/** Hack damages only the named hit item, before ordinary damage is applied. */
export function previewV5Hack({ qualities = [], hit = false, struckItemId, currentAp } = {}) {
  if (!has(qualities, 'taille') || !hit) return result({ damage: null });
  if (typeof struckItemId !== 'string' || !struckItemId) return blocked('Taille : pièce ou bouclier touché requis.');
  if (!Number.isSafeInteger(Number(currentAp)) || Number(currentAp) < 0) return blocked('Taille : PA courants de la pièce touchée requis.');
  return result({ damage: { itemId: struckItemId, before: Number(currentAp), after: Math.max(0, Number(currentAp) - 1), amount: 1 } });
}

/** A ranged Impale critical locks one wound until the matching projectile is removed. */
export function previewV5ImpaleProjectile({ qualities = [], ranged = false, critical = false, ammunitionId, ammunitionType, weaponId, weaponCategory, weaponName, participantId } = {}) {
  if (!has(qualities, 'empaleuse') || !ranged || !critical) return result({ lodgedProjectile: null, healingBlocked: 0 });
  if (typeof participantId !== 'string' || !participantId) return blocked('Empaleuse : cible identifiée requise.');
  let sourceId = ammunitionId;
  let ammo = fold(ammunitionType);
  let genericProjectile = false;
  if (!sourceId || !ammo) {
    const weapon = fold(`${weaponCategory || ''} ${weaponName || ''}`);
    const generic = /arbal[eè]te|crossbow/u.test(weapon) ? 'carreau'
      : /(?:^|\s)arc(?:\s|$)|bow/u.test(weapon) ? 'fleche'
      : /baliste|ballista/u.test(weapon) ? 'carreau'
      : /poudre noire|black ?powder|ingenierie|engineering|canon|cannon|mitrailleuse|clattergun/u.test(weapon) ? 'balle'
      : /lancer|thrown|javelot|javelin|flechette|dart/u.test(weapon) ? 'arme-lancee' : '';
    if (!generic || typeof weaponId !== 'string' || !weaponId)
      return blocked('Empaleuse : munition suivie ou profil d’arme permettant de déduire le projectile requis.');
    ammo = generic;
    sourceId = `generic:${weaponId}:${generic}`;
    genericProjectile = true;
  }
  const bullet = /\b(?:bullet|bullets|balle|balles)\b/u.test(ammo);
  return result({ lodgedProjectile: { participantId, ammunitionId: sourceId, ammunitionType: ammo, ...(genericProjectile ? { weaponId, genericProjectile: true } : {}), removal: bullet ? 'surgery' : 'heal-test', healTestModifier: 0 }, healingBlocked: 1 });
}

/** Each lodged projectile blocks recovery of one Wound until its own extraction. */
export function previewV5WoundRecovery({ lodgedProjectiles = [], requestedWounds } = {}) {
  if (!Array.isArray(lodgedProjectiles) || !Number.isSafeInteger(Number(requestedWounds)) || Number(requestedWounds) < 0)
    return blocked('Empaleuse : blessures à récupérer et projectiles fichés requis.');
  const blockedWounds = lodgedProjectiles.filter(row => row?.removed !== true).length;
  return result({ requestedWounds: Number(requestedWounds), blockedWounds,
    recoverableWounds: Math.max(0, Number(requestedWounds) - blockedWounds) });
}

/** Remove one lodged projectile only after its source-prescribed extraction is confirmed. */
export function previewV5ProjectileExtraction({ projectile, method, success, surgeryConfirmed = false, testSl } = {}) {
  if (!projectile || projectile.removed === true) return blocked('Empaleuse : projectile fiché actif requis.');
  if (projectile.removal === 'surgery') {
    if (method !== 'surgery' || surgeryConfirmed !== true) return blocked('Balle fichée : confirmation MJ de la chirurgie requise.');
    return result({ removed: true, projectileId: projectile.id, method: 'surgery' });
  }
  if (method !== 'heal-test' || typeof success !== 'boolean' || !Number.isSafeInteger(Number(testSl)))
    return blocked('Empaleuse : résultat et DR du Test de Guérison requis.');
  if (!success) return blocked('Échec du Test de Guérison : le projectile reste fiché.');
  return result({ removed: true, projectileId: projectile.id, method: 'heal-test', test: { success, sl: Number(testSl), modifier: 0 } });
}

/** The core inventory rules identify shot types by weapon group, not by free-text weapon names. */
export function canUseV5PowderAmmunition({ weaponGroup, ammunitionType, isBlunderbuss = false } = {}) {
  const group = fold(weaponGroup), ammo = fold(ammunitionType);
  if (!['poudre noire', 'ingenierie', 'engineering', 'blackpowder'].includes(group) || !ammo)
    return blocked('Munitions : groupe d’arme et type de munition requis.');
  const smallOrImprovised = ['grenaille', 'projectile improvise', 'small shot', 'improvised shot'].includes(ammo);
  const bullet = ['balle', 'balles', 'bullet', 'bullets'].includes(ammo);
  if (group === 'poudre noire' && isBlunderbuss) return result({ allowed: smallOrImprovised });
  if (bullet) return result({ allowed: true });
  return result({ allowed: false });
}

const STATE_KEYS = new Map([
  ['empetre', 'enchevetre'], ['enchevetre', 'enchevetre'], ['a terre', 'a-terre'], ['aterre', 'a-terre'],
  ['enflamme', 'enflamme'], ['assourdi', 'assourdi'], ['sonne', 'sonne'], ['hemorragique', 'hemorragique']
]);
const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLowerCase().trim();

/** Parse the catalogued V5 Inflict parameter; do not infer a state from an item name. */
export function parseV5Inflict(value, actorStrength) {
  const text = String(value ?? '').trim();
  const parts = text.split(/\s*[,;]\s*/u);
  if (parts.length > 1) {
    const parsed = parts.map(part => parseV5Inflict(part, actorStrength));
    const failed = parsed.find(row => !row.ready);
    if (failed) return failed;
    const conditions = parsed.flatMap(row => row.conditions || (row.condition ? [row.condition] : []));
    return result({ condition: conditions[0] || null, conditions });
  }
  const match = text.match(/^([^()]+?)(?:\s*\(([^()]*)\)|\s+(\d{1,3}|votre force|your strength))?$/iu);
  if (!match) return blocked('Inflige : paramètre d’état invalide.');
  const rawState = fold(match[1]);
  const key = STATE_KEYS.get(rawState);
  if (!key) return blocked(`Inflige : état non reconnu (${text}).`);
  const qualifier = (match[2] || match[3] || '').trim();
  let strength = null;
  if (qualifier) {
    const folded = fold(qualifier);
    if (/^(?:votre force|your strength)$/u.test(folded)) {
      if (!positiveInt(actorStrength) || Number(actorStrength) > 100) return blocked('Inflige : Force du porteur requise.');
      strength = Number(actorStrength);
    } else {
      const parsed = qualifier.match(/^(?:force\s*)?(\d{1,3})$/iu);
      if (!parsed || Number(parsed[1]) > 100) return blocked('Inflige : score de Force invalide.');
      strength = Number(parsed[1]);
    }
  }
  const condition = { key, name: match[1].trim(), level: 1, ...(strength === null ? {} : { strength }) };
  return result({ condition });
}

export function previewV5Inflict({ qualities = [], hit = false, actorStrength, entangling = false, itemId } = {}) {
  if (!has(qualities, 'inflige') || !hit) return result({ condition: null, weaponLocked: false });
  const q = quality(qualities, 'inflige');
  const parsed = parseV5Inflict(typeof q === 'object' ? q.parameter ?? q.rating : null, actorStrength);
  if (!parsed.ready) return parsed;
  const conditions = parsed.conditions || [parsed.condition].filter(Boolean);
  if (conditions.some(condition => condition.key === 'enchevetre' && !positiveInt(condition.strength))) return blocked('Inflige (Empêtré) : Force de l’état requise.');
  const locksWeapon = conditions.some(condition => condition.key === 'enchevetre') && entangling;
  return result({ condition: conditions[0] || null, ...(conditions.length > 1 ? { conditions } : {}), weaponLocked: Boolean(locksWeapon), lockedItemId: locksWeapon ? itemId || null : null,
    release: locksWeapon ? { voluntary: true, weaponId: itemId || null } : null });
}

/** V5 Parry has two separate clauses: off-hand defense and the second attack. */
export function previewV5Parry({ qualities = [], defending = false, offHand = false, dualWielding = false, isSecondAttack = false, firstAttackHit = false } = {}) {
  const active = has(qualities, 'parade');
  return result({ defensePenalty: active && defending && offHand ? 0 : null,
    secondAttackUnopposed: active && dualWielding && isSecondAttack && firstAttackHit });
}

export function previewV5PistolContact({ qualities = [], attack = false, engaged = false, ranged = true } = {}) {
  const active = has(qualities, 'pistolet') && attack && engaged && ranged;
  return result({ allowed: active, rangeModifier: active ? 0 : null, oppositionKind: active ? 'melee' : null });
}

/** The critical may be replaced by a trap; dropping, catching, and breaking are explicit choices. */
export function previewV5TrapBlade({ qualities = [], defensiveCritical = false, opponentWeaponType, defenderSize, opponentSize,
  chooseTrap = false, hasDisarmTalent = false, spendMomentum = false, catchInFreeHand = false,
  chooseBreak = false, strengthTestSuccess = false, meleeSl = 0, unbreakable = false } = {}) {
  if (!has(qualities, 'piege-lame') || !defensiveCritical || opponentWeaponType !== 'blade') return result({ available: false });
  if (!Number.isFinite(Number(defenderSize)) || !Number.isFinite(Number(opponentSize))) return blocked('Piège-lame : Tailles comparables requises.');
  const available = Number(defenderSize) >= Number(opponentSize);
  if (!available || !chooseTrap) return result({ available, trapped: false, criticalReplaced: false });
  const canCatch = hasDisarmTalent && spendMomentum && catchInFreeHand;
  const canBreak = chooseBreak && strengthTestSuccess && !unbreakable;
  return result({ available: true, trapped: true, criticalReplaced: true, opponentDropsWeapon: true,
    catch: canCatch ? { inFreeHand: true, momentumSpent: true } : null,
    break: canBreak ? { test: 'strength', difficultySl: -3, addedMeleeSl: Number(meleeSl) || 0, weaponBroken: true } : null,
    breakBlockedByUnbreakable: chooseBreak && unbreakable });
}

export function previewV5Wrap({ qualities = [], opposingMelee = false } = {}) {
  return result({ defenderSlPenalty: has(qualities, 'a-enroulement') && opposingMelee ? -1 : 0 });
}

export function previewV5Slash({ qualities = [], criticalDamage = false, spendAdvantage = 0 } = {}) {
  if (!has(qualities, 'entaille') || !criticalDamage) return result({ bleedingConditions: 0 });
  if (!Number.isSafeInteger(Number(spendAdvantage)) || Number(spendAdvantage) < 0) return blocked('Entaille : dépense d’Élan invalide.');
  // V5 p.58: a critical hit gives one Bleeding; each spent Momentum gives
  // exactly one more. Do not apply the V4 X-Advantage multiplier here.
  return result({ bleedingConditions: 1 + Number(spendAdvantage), momentumSpent: Number(spendAdvantage), unusedMomentum: 0 });
}

/** Spread uses an explicit GM target list; distances and visibility stay with the GM. */
export function previewV5Spread({ qualities = [], rangeBand, targetIds, weaponDamage, rating: explicitRating } = {}) {
  if (!has(qualities, 'dispersion')) return result({ targets: [] });
  const q = quality(qualities, 'dispersion'), rating = ratingOf(q, explicitRating);
  if (rating === null || rating < 1) return blocked('Dispersion : indice positif requis.');
  if (!['point-blank', 'short', 'medium', 'long', 'extreme'].includes(rangeBand)) return blocked('Dispersion : bande de portée MJ requise.');
  if (!Array.isArray(targetIds) || targetIds.length < 1 || targetIds.some(id => typeof id !== 'string' || !id.trim()))
    return blocked('Dispersion : cibles désignées par le MJ requises.');
  if (!Number.isFinite(Number(weaponDamage))) return blocked('Dispersion : dégâts d’arme requis.');
  const targets = unique(targetIds);
  if (rangeBand === 'point-blank' && targets.length !== 1) return blocked('Dispersion à bout portant : une seule cible.');
  if (rangeBand !== 'point-blank' && targets.length > rating + 1) return blocked('Dispersion : nombre de cibles supérieur à l’indice.');
  const delta = rangeBand === 'point-blank' ? rating : rangeBand === 'extreme' ? -rating : 0;
  return result({ rating, rangeBand, targets: targets.map(participantId => ({ participantId, damage: Math.max(0, Number(weaponDamage) + delta) })),
    requiresGMTargetValidation: rangeBand !== 'point-blank' });
}

/** Apply conditional Knife qualities to a copy; Penetrating remains permanent. */
export function conditionalV5KnifeQualities({ qualities = [], targetSurprised = false, targetProne = false } = {}) {
  const base = unique(qualities.map(row => typeof row === 'string' ? row : row?.id).filter(Boolean));
  const conditional = targetSurprised || targetProne;
  const out = base.filter(id => !['empaleuse', 'pointue'].includes(id) || conditional);
  return result({ qualities: out });
}

/** Épée de sport is the named catalogue exception that carries Inoffensive. */
export function applyV5SportSwordQuality({ weaponName, qualities = [] } = {}) {
  const normalized = fold(weaponName);
  const out = unique(qualities.map(row => typeof row === 'string' ? row : row?.id).filter(Boolean));
  if (normalized !== 'epee de sport') return result({ qualities: out });
  if (!out.includes('inoffensive')) out.push('inoffensive');
  return result({ qualities: out });
}

/** Only one explicitly chosen V5 shield contributes; PA remain a separate hit-protection input. */
export function previewV5Shield({ shield, selected = false, available = false, defenseSkill, ranged = false, shieldAttached = false,
  attackWithShield = false } = {}) {
  if (!shield || shield.kind !== 'shield' || !has(shield.keywords, 'bouclier')) return result({ confirmed: false, defenseBonus: 0, armorPoints: 0 });
  const ap = number(shield.ap);
  if (!Number.isSafeInteger(ap) || ap < 0) return blocked('Bouclier : PA entiers requis.');
  if (attackWithShield) {
    if (!selected || !available) return result({ confirmed: false, defenseBonus: 0, armorPoints: 0, unresolved: ['Bouclier : sélection et disponibilité requises pour attaquer avec.'] });
    return result({ confirmed: true, defenseBonus: 0, armorPoints: 0, reach: 'personal', improvisedWeapon: true,
    protectionSuspended: true, resumesAt: 'start-next-turn' });
  }
  if (!selected || !available || !['dodge', 'melee'].includes(defenseSkill))
    return result({ confirmed: false, defenseBonus: 0, armorPoints: 0, rangedDodgeAllowed: false });
  if (ranged && (defenseSkill !== 'dodge' || ap < 2)) return result({ confirmed: false, defenseBonus: 0, armorPoints: 0, rangedDodgeAllowed: false });
  const locations = shieldAttached ? ['head', 'body', 'offArm'] : ['head', 'body', 'arms', 'legs'];
  return result({ confirmed: true, defenseBonus: 1, doesNotStackWith: 'defensive', armorPoints: ap,
    rangedDodgeAllowed: ap >= 2, locations });
}

export function validateV5ShieldHands({ shield, weaponHands, weaponEncumbrance, polearm = false, attached = false,
  offHandWeaponEncumbrance } = {}) {
  if (!shield || shield.kind !== 'shield') return result({ allowed: true, reason: null });
  if (!integerForHands(weaponHands) || !Number.isSafeInteger(Number(weaponEncumbrance)))
    return blocked('Bouclier : mains et Encombrement de l’arme requis.');
  const buckler = Number(shield.ap) === 1;
  if (attached && polearm && Number(weaponHands) === 2) return result({ allowed: true, reason: 'shield-attached-polearm' });
  if (Number(weaponHands) === 2) return result({ allowed: false, reason: 'hands-conflict' });
  if (buckler && attached && Number.isSafeInteger(Number(offHandWeaponEncumbrance)) && Number(offHandWeaponEncumbrance) === 0)
    return result({ allowed: true, reason: 'buckler-free-hand' });
  const allowed = Number(weaponHands) <= 1;
  return result({ allowed, reason: allowed ? null : 'hands-conflict' });
}

function integerForHands(value) { return Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 2; }

/** Mail and plate penalties apply once per worn category, irrespective of piece count. */
export function calculateV5ArmorPenalty({ worn = [] } = {}) {
  const active=worn.filter(row=>row?.worn!==false);
  // The catalogue explicitly marks the pieces that impose the stealth penalty.
  // Do not infer it from material/category: some Ithilmar, Dragon, and Gromril
  // entries carry no such note.
  const foldText=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/gu,'').toLowerCase();
  // One penalty per marked category (mail, plate): wearing both costs -2.
  const marked=active.map(row=>foldText(row?.notes)).filter(text=>/(?:-1\s*dr\s+en\s+discretion|-1\s*sl\s+to\s+stealth)/u.test(text));
  const stealthCategories=new Set(marked.map(text=>/mailles|chain/u.test(text)?'mail':/plates|plate/u.test(text)?'plate':text));
  const closedHelm=active.some(row=>row?.category==='closed-helm'||row?.locations?.includes('head')&&row?.keywords?.some(word=>(typeof word==='string'?word:word?.id)==='impenetrable'));
  const perception = closedHelm ? 2 : 0;
  return result({ stealthDr: stealthCategories.size ? -stealthCategories.size : 0, perceptionDr: perception ? -perception : 0 });
}

// Page 318 : allonge des armes naturelles selon la Taille (aide affichée, la distance n'est jamais suivie).
const NATURAL_REACH = Object.freeze({
  small: { key: 'personal', label: 'Personnelle' }, average: { key: 'personal', label: 'Personnelle' }, large: { key: 'personal', label: 'Personnelle' },
  enormous: { key: 'short', label: 'Courte' }, monstrous: { key: 'average', label: 'Moyenne' }
});
export const naturalReachOf = sizeKey => NATURAL_REACH[sizeKey] ?? NATURAL_REACH.average;
export function naturalWeaponDefaults({ reach, qualities, natural = true, size } = {}) {
  if (!natural) return result({ reach: reach ?? null, qualities: qualities ?? [] });
  // V5 v3 p.318 : Personnelle de Petite à Grande, Courte pour Énorme, Moyenne pour Monstrueuse.
  return result({ reach: reach || naturalReachOf(size).key, qualities: Array.isArray(qualities) ? qualities : [],
    defaultsApplied: reach == null && qualities == null });
}

/** Entanglement strength is a published weapon fact, never inferred from its name. */
export function entanglementStrength({ kind, actorStrength, explicitStrength, springLoaded = false } = {}) {
  if (explicitStrength !== undefined && explicitStrength !== null) {
    if (!positiveInt(explicitStrength) || Number(explicitStrength) > 100) return blocked('Entrave : Force explicite invalide.');
    return result({ strength: Number(explicitStrength) });
  }
  if (kind === 'cloak') return result({ strength: 25 });
  if (kind === 'weighted-net') return result({ strength: 55 });
  if (!['mancatcher', 'garrote', 'druchii-net', 'wielder'].includes(kind)) return blocked('Entrave : type d’arme reconnu requis.');
  if (!positiveInt(actorStrength) || Number(actorStrength) > 100) return blocked('Entrave : Force du porteur requise.');
  return result({ strength: Number(actorStrength) });
}

/** Escape by winning an opposed Strength Test. SL do not accumulate across attempts (L06 p.186; MJ ruling over L11 p.29). */
export function advanceV5NetEscape({ testSl, opponentSl, entangled = 1, opponentBonus = 0 } = {}) {
  if (!Number.isSafeInteger(Number(testSl)) || !Number.isSafeInteger(Number(opponentSl))
      || !Number.isSafeInteger(Number(opponentBonus))) return blocked('Filet : DR des deux Tests opposés requis.');
  if (!Number.isSafeInteger(Number(entangled)) || Number(entangled) < 1) return blocked('Filet : état Empêtré requis.');
  const actorSl = Number(testSl), sourceSl = Number(opponentSl) + Number(opponentBonus), netSl=actorSl-sourceSl;
  const won = netSl >= 0;
  const removed = won ? Math.min(Number(entangled), 1 + Math.max(0, netSl - 1)) : 0;
  const remainingEntangled = Number(entangled) - removed;
  return result({ won, freed: won, actorSl, opponentSl: sourceSl, netSl,
    removedEntangled: removed, remainingEntangled, addEntangledOnFailure: false });
}

/** Hooked nets deal damage when the victim struggles; the source does not specify its amount. */
export function previewV5HookedNet({ hookedNet = false, struggle = false, damageAmount, armourIgnored = true } = {}) {
  if (!hookedNet || !struggle) return result({ damage: 0, armourIgnored: false });
  if (!Number.isSafeInteger(Number(damageAmount)) || Number(damageAmount) < 0)
    return blocked('Filet à crochets : montant de dégâts à fixer par le MJ (source sans valeur).');
  return result({ damage: Number(damageAmount), armourIgnored: armourIgnored === true });
}
