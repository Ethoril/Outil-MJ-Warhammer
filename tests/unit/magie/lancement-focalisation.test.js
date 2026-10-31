import test, { describe } from 'node:test';
import { declaredAnswers, declared5BAnswers, fixtureBlade } from '../../helpers/lot3-declared-answers.js';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { applySpellEffects, resolveMagicMissile, resolveSpellDamage } from '../../../js/core/v5-magic-effects.js';
import { previewMagicProtection, attackNature, magicWeaponBonus } from '../../../js/core/v5-magic-combat.js';
import { getSpellContract, getContractChoiceOptions, IMPLEMENTED_SPECIAL_HANDLERS, previewSpellExecution, getAllSpellContracts, resolveVortexTrajectory, vortexMovementFromDie, validateSpellTargets } from '../../../js/core/v5-spell-contracts.js';
import { previewLoreAttribute } from '../../../js/core/v5-magic-attributes.js';
import { validateOvercastChoices, previewCasting, OVERCAST_TIERS, OVERCAST_BENEFITS, getOvercastBenefit, isOvercastAllowed, resolveCastingSkill, requiredReserveType, applyCasting } from '../../../js/core/v5-magic-casting.js';
import { resolveSpecificOvercast, SPECIFIC_OVERCAST_KINDS } from '../../../js/core/v5-magic-overcast-options.js';
import fs, { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { magicSkillModifiers, magicAdverseModifiers, magicTalentRank } from '../../../js/core/v5-magic-talents.js';
import { REMINDER_FLAGS, MARKER_ONLY_SPECIAL_STATES, reminderFlagTexts } from '../../../js/core/v5-magic-reminder-flags.js';
import { previewChannelling, setChannellingReserve, getChannellingReserve, clearChannellingReserve, calculateMagicArmorPenalty, resolveChannellingSkill, lookupMiscast, applyChannelling, previewChannellingPause, applyChannellingPause, previewChannellingInterruption, applyChannellingInterruption } from '../../../js/core/v5-magic-channelling.js';
import { resolveMiscast, explicitMagicDie, applyMiscastToParticipant } from '../../../js/core/v5-magic-miscasts.js';
import { previewHandOfGlory } from '../../../js/core/v5-magic-arbitrations.js';
import { previewDispelCasting, previewDispelPersistent } from '../../../js/core/v5-magic-dispel.js';
import { magicCastingSpell } from '../../../js/ui/workspace-view.js';
import { sameSharedState } from '../../../js/core/sync-protocol.js';
import { createCombatEngine } from '../../../js/core/combat.js';

describe('Socle moteur — Focalisation, Lileath et drapeaux de rappel', () => {
// Attentes WoM actualisées selon pp. 134, 136–137, 146–149 le 13/10/2026.
// Socle moteur du lot 3 (S-08, S-09, S-10) et défauts de Focalisation, de Lileath et de Drain de puissance.
const talent = (id, rank = 1, specialization = undefined) => ({ id: 'talent-' + id, status: 'resolved', rank, ...(specialization ? { specialization } : {}) });
const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: ['mage', 'hmage', 'ally'].includes(id) ? 'pj' : 'ennemi', zone: 'active', hp: 30, maxHp: 30, fortune: 2,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  talents: [], states: [], equipment: [], actions:[fixtureBlade], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 10 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id,
    order: people.map(p => p.id), participants: people }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id = 'mage') => store.listParticipants().find(p => p.id === id);
/** Aperçu sur le premier destinataire admissible (ennemi, allié, lanceur). */
const previewOnAny = (store, id, actorId, input) => {
  let last;
  for (const target of ['enemy', 'ally', actorId]) {
    const cb=getSpellContract(id),fiveB=cb.isCatalogue && ['life','light','death','shadow'].includes(cb.domain);
    last = store.previewSpellExecution(id, { ...declaredAnswers([target]), ...(fiveB?declared5BAnswers([target]):{}), ...input, chosenLore:getSpellContract(id).domain==='arcane'?'fire':undefined, actorId, targetIds: [target] });
    if (last.ready !== false || !(['invalid-target-admissibility','invalid-target-count'].includes(last.status) || /admissible|alli/i.test(last.error || ''))) return last;
  }
  return last;
};

test('Focalisation de Haute Magie : une rune d’incident n’est pas payée sans incident', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { channelling: { type: 'high', sl: 0 }, cadaiRunes: { deployed: 3, max: 5 } } } }));
  const p = store.previewChannelling({ actorId: 'mage', type: 'high', roll: 95, miscastRoll: 50, cadaiAccessible: true,
    cadaiRerolls: [{ purpose: 'test', roll: 25 }, { purpose: 'miscast', roll: 60 }] });
  assert.equal(p.ready, true, p.error);
  assert.deepEqual(p.cadaiReceipts.map(r => r.purpose), ['test']);
});

test('Lileath en Focalisation (HEPG p. 83) : +1 DR par niveau au résultat du Test, réussite ou échec', async () => {
  const mage = wizard('mage', { talents: [talent('lileath-s-blessing', 2)], extensions: { v5: { channelling: { type: 'high', sl: 0 } } } });
  const store = await combat(mage);
  // Score 60, jet 75 : -1 DR ; avec Lileath 2 le Test réussit à +1 DR.
  const saved = store.previewChannelling({ actorId: 'mage', type: 'high', roll: 75 });
  assert.equal(saved.success, true);
  assert.equal(saved.sl, 1);
  assert.equal(saved.gain, 1 + saved.bfm);
  // Un Test des Vents n'en profite pas.
  const winds = store.previewChannelling({ actorId: 'mage', type: 'winds', roll: 75 });
  assert.equal(winds.success, false);
  // Réussite : le bonus s'ajoute aussi.
  const ok = store.previewChannelling({ actorId: 'mage', type: 'high', roll: 25 });
  assert.equal(ok.sl, 4 + 2);
});

test('Lileath et Protection (11 octobre) : un d10 par Protection admise, une réussite annule les dégâts', () => {
  const caster = wizard('caster', { talents: [talent('lileath-s-blessing', 1)] });
  let target = wizard('target');
  for (const [id, ward] of [['a', 7], ['b', 9]]) {
    target = applySpellEffects(target, { id, spellId: id, spellName: id, casterId: 'caster', ward, duration: '10 Rounds' }, { round: 1, caster }).participant;
  }
  const nature = attackNature({});
  const asked = previewMagicProtection(target, 5, { nature, wardRoll: 3 });
  assert.equal(asked.ready, false);
  assert.match(asked.error, /2 d10/);
  assert.equal(previewMagicProtection(target, 5, { nature, wardRoll: [3, 8] }).amount, 5, '3 < 7 et 8 < 9');
  const first = previewMagicProtection(target, 5, { nature, wardRoll: [8, 1] });
  assert.equal(first.wardSaved, true); assert.equal(first.amount, 0);
  assert.equal(previewMagicProtection(target, 5, { nature, wardRoll: [1, 9] }).wardSaved, true);
  // Sans Lileath : une seule Protection (la meilleure) et un seul d10.
  let plain = wizard('plain');
  for (const [id, ward] of [['a', 7], ['b', 9]]) {
    plain = applySpellEffects(plain, { id, spellId: id, spellName: id, casterId: 'other', ward, duration: '10 Rounds' }, { round: 1, caster: wizard('other') }).participant;
  }
  const one = previewMagicProtection(plain, 5, { nature, wardRoll: 7 });
  assert.equal(one.ready, true); assert.equal(one.wardSaved, true);
});

test('Drain de puissance (V5 p. 239) : seul le Talent employé pour lancer est désactivé', async () => {
  const mage = wizard('mage', { talents: [talent('arcane-magic', 1, 'Feu'), talent('arcane-magic', 1, 'Cieux')] });
  const store = await combat(mage);
  const fire = getSpellContract('Sang Bouillonnant');
  const heavens = getSpellContract('Arc de T’Essla');
  assert.equal(fire.domain, 'fire'); assert.equal(heavens.domain, 'heavens');
  await store.applyMiscast(store.previewMiscast({ actorId: 'mage', severity: 'MAJOR', roll: 18, secondaryRolls: { duration: 3 }, usedTalent: { id: 'talent-arcane-magic', lore: 'fire' } }), { actorId: 'mage' });
  assert.throws(() => store.previewCasting(fire, { actorId: 'mage', roll: 25 }), /Drain de puissance/);
  assert.equal(store.previewCasting(heavens, { actorId: 'mage', roll: 25 }).ready !== undefined, true, 'un sort des Cieux se lance');
  assert.equal(store.previewChannelling({ actorId: 'mage', roll: 25 }).ready, true, 'Focalisation non bloquée');
  assert.ok(store.previewCasting(getSpellContract('Alerte'), { actorId: 'mage', roll: 25 }), 'un sort mineur n’emploie pas ce Talent');
});

// ---- S-08 : projectile magique et attributs ----

const armoured = (extra = {}) => wizard('enemy', { armor: { head: 3, body: 3, arms: 3, legs: 3 }, ...extra });
const plate = { id: 'plate', kind: 'armour', keywords: [], name: 'Plates', layer: 'rigid', ap: 3, locations: ['body'] };

test('Projectile magique : « ignore BE et PA » du contrat est transmis à la résolution (Transmutation de Chamon)', () => {
  const caster = wizard('mage'), target = armoured({ caracs: { ...wizard().caracs, E: 40 } });
  const contract = getSpellContract('Transmutation de Chamon');
  const p = previewSpellExecution(caster, contract, [target], { roll: 25, sl: 6, attributeActive: false });
  assert.equal(p.ready, true, p.error);
  const missile = p.targetResults[0].missile;
  assert.equal(missile.be, 0); assert.equal(missile.ap, 0);
  assert.equal(missile.finalDamage, 5 + 9, 'BFM + 9, sans réduction');
});

test('Attribut du Métal (V5 p. 252) : les PA métalliques de la localisation touchée s’ajoutent aux dégâts et sont ignorés', () => {
  const caster = wizard('mage'), target = armoured({ equipment: [plate], armor: { head: 0, body: 3, arms: 0, legs: 0 } });
  const hit = resolveMagicMissile({ caster, target, spell: { name: 'Test', damage: 2 }, roll: 35, ignoreMetalAp: true, metalDamageBonus: true });
  assert.equal(hit.location, 'Corps');
  assert.equal(hit.metalExtraDamage, 3); assert.equal(hit.ap, 0);
  assert.equal(hit.rawDamage, 5 + 2 + 3);
  const head = resolveMagicMissile({ caster, target, spell: { name: 'Test', damage: 2 }, roll: 91, ignoreMetalAp: true, metalDamageBonus: true });
  assert.equal(head.metalExtraDamage, 0, 'pas de métal sur cette localisation');
  // Sort de dégâts non projectile : même règle
  const damage = resolveSpellDamage({ caster, target, formula: 'BFM + 4', roll: 35, ignoreMetalAp: true, metalDamageBonus: true });
  assert.equal(damage.metalExtraDamage, 3); assert.equal(damage.ap, 0);
  assert.equal(previewLoreAttribute({ lore: 'metal', caster, targets: [target] }).damageRules.metalDamageBonus, true);
});

test('Attribut des Ombres (V5 p. 254) : seuls les PA magiques comptent', () => {
  const caster = wizard('mage');
  const target = armoured({ armor: { head: 3, body: 3, arms: 3, legs: 3 }, extensions: { v5: { magicAp: { body: 1 } } } });
  const hit = resolveMagicMissile({ caster, target, spell: { name: 'Test', damage: 2 }, roll: 35, ignoreNonMagicalAp: true });
  assert.equal(hit.ap, 1, 'PA magique conservé, armure ignorée');
  assert.equal(previewLoreAttribute({ lore: 'shadow', caster, targets: [target] }).damageRules.ignoreNonMagicalAp, true);
});

test('Attribut de la Vie (V5 p. 250) : Hémorragique et Exténué retirés aux seuls vivants', () => {
  const caster = wizard('mage');
  const living = wizard('a'), undead = wizard('b', { traits: ['Mort-vivant'] }), construct = wizard('c', { traits: ['Artificiel'] });
  const preview = previewLoreAttribute({ lore: 'life', caster, targets: [living, undead, construct] });
  assert.deepEqual(preview.targetEffects.get('a').removeConditions, ['hemorragique', 'extenue']);
  assert.deepEqual(preview.targetEffects.get('b').removeConditions, []);
  assert.equal(preview.targetEffects.get('b').extraDirectWounds, 5, 'les Morts-vivants subissent BFM Blessures directes');
  assert.deepEqual(preview.targetEffects.get('c').removeConditions, []);
});

test('Attribut des sorts d’Arcane : Domaine du lanceur ; Arcanes elfiques sans choix : premier Vent listé (HEPG p. 81)', () => {
  const fire = wizard('mage', { talents: [talent('arcane-magic', 1, 'Feu')] });
  const both = wizard('mage', { talents: [talent('arcane-magic', 1, 'Feu'), talent('arcane-magic', 1, 'Cieux')] });
  const enemy = wizard('enemy');
  const bolt = getSpellContract('Carreau');
  assert.equal(bolt.domain, 'arcane');
  assert.equal(previewSpellExecution(fire, bolt, [enemy], { roll: 25, sl: 6 }).lorePreview.lore, 'fire');
  const ambiguous = previewSpellExecution(both, bolt, [enemy], { roll: 25, sl: 6 });
  assert.equal(ambiguous.ready, false); assert.deepEqual(ambiguous.missing, ['chosenLore']);
  assert.equal(previewSpellExecution(both, bolt, [enemy], { roll: 25, sl: 6, chosenLore: 'heavens' }).lorePreview.lore, 'heavens');
  assert.equal(previewSpellExecution(fire, bolt, [enemy], { roll: 25, sl: 6, chosenLore: 'heavens' }).ready, false, 'Domaine non possédé');
  const elven = getSpellContract('Enchantement Végétal (Ghyran & Chamon)');
  assert.equal(previewSpellExecution(wizard('mage'), elven, [enemy], { ...declaredAnswers(['enemy']),chosenLore:undefined, roll: 25, sl: 6 }).lorePreview.lore, 'life', 'premier Vent : Ghyran');
});

test('Vortex : une seule application des dégâts par cible et par étape', async () => {
  const store = await combat(wizard('mage'), wizard('orc'));
  const input = { actorId: 'mage', targetIds: ['orc'], roll: 25, willpowerSuccess: true, direction: 'N', distance: 12, targetsCrossed: [{ id: 'orc' }], attributeActive: false };
  const preview = store.previewSpellExecution('Tempête Magmatique', input);
  assert.equal(preview.ready, true, preview.error);
  // WoM p. 136 : projectile BFM+12, une seule frappe protégée.
  const damage = preview.targetResults[0].actions.find(a=>a.kind==='vortex-hit').detail.woundsLost;
  assert.equal(preview.targetResults[0].woundsLost, damage, 'dégâts de la section B seulement');
  await store.applySpellExecution('Tempête Magmatique', input);
  const orc = person(store, 'orc');
  assert.equal(orc.hp, 30 - damage);
  assert.ok(orc.states.some(state => /enflamme/.test(state.key || '')), 'les États du vortex restent appliqués');
});

test('weaponBonus : seule l’arme désignée, jamais le tir, sauf clause (Flèche bénie)', () => {
  const bonus = { effectId: 'e1', damage: 2, magical: true };
  const archer = wizard('mage', { extensions: { v5: { weaponBonuses: [bonus, { effectId: 'e2', damage: 1, magical: true, ranged: true, equipmentId: 'bow' }] } } });
  const sword = { type: 'attack', extensions: { fiche: { equipmentId: 'sword' } } }, bow = { type: 'attack', extensions: { fiche: { equipmentId: 'bow' } } };
  assert.equal(magicWeaponBonus(archer, sword, false), 2);
  assert.equal(magicWeaponBonus(archer, bow, true), 1, 'clause du sort : seulement le tir, pas le +2 de l’arme de contact');
  assert.equal(magicWeaponBonus(archer, bow, false), 2);
  const designated = wizard('mage', { extensions: { v5: { weaponBonuses: [{ effectId: 'e3', damage: 4, magical: true, equipmentId: 'sword' }] } } });
  assert.equal(magicWeaponBonus(designated, bow, false), 0, 'autre arme');
  assert.equal(magicWeaponBonus(designated, sword, true), 0, 'jamais au tir');
  assert.equal(getSpellContract('Flèche Bénie').effects.weaponRanged, undefined,'HEPG p. 80 : une flèche désignée, aucun bonus global aux tirs');
});

// ---- S-09 : surpuissance (V5 p. 236) ----

const overcast = (choices, spell = {}) => validateOvercastChoices(choices, { availableSL: 20, maxSpend: 20, spell: { range: '(Force Mentale) mètres', duration: '(Bonus de Force Mentale) Rounds', hasAoe: true, isMagicMissile: true, target: '1', ...spell } });

test('Surpuissance : dépenses entières aux paliers exacts 1, 2, 3, 5, 8, 13, 18', () => {
  for (const spent of [1, 2, 3, 5, 8, 13, 18]) assert.equal(overcast({ damage: spent }).valid, true, `damage ${spent}`);
  for (const spent of [4, 6, 7, 9, 10, 12, 14, 19, 2.5]) assert.equal(overcast({ damage: spent }).valid, false, `damage ${spent}`);
  assert.equal(overcast({ range: 4 }).valid, false);
  assert.equal(overcast({ aoe: 2 }).valid, false, 'la zone commence à 3 DR');
  assert.equal(overcast({ duration: 1 }).valid, false, 'la durée commence à 2 DR');
});

test('Surpuissance : portées Vous et Contact, cibles Spécial et « 1 (maximum) » non extensibles', () => {
  assert.equal(overcast({ range: 2 }, { range: 'Vous' }).valid, false);
  assert.equal(overcast({ range: 2 }, { range: 'Contact' }).valid, false);
  assert.equal(overcast({ range: 2 }, { range: 'Toucher' }).valid, false);
  assert.equal(overcast({ targets: 2 }).valid, true);
  assert.equal(overcast({ targets: 2 }, { target: 'Spécial' }).valid, false);
  assert.equal(overcast({ targets: 2 }, { target: '1 (maximum)' }).valid, false);
  assert.equal(overcast({ targets: 2 }, { range: 'Vous', target: 'Vous' }).valid, false);
});

test('Surpuissance : l’option dégâts est réservée aux projectiles magiques (moteur et contrats générés)', () => {
  assert.equal(overcast({ damage: 2 }, { isMagicMissile: false, hasDamage: true }).valid, false);
  for (const contract of getAllSpellContracts()) {
    // V5 p. 249 : la Comète est un projectile différé, sa surpuissance dégâts reste autorisée.
    const isMissile = Object.values(contract.effects?.factModes?.values || {}).some(v=>v.missile) || contract.effects?.type === 'magic-missile' || Boolean(contract.effects?.missile) || Boolean(contract.effects?.damage?.magicMissile) || Boolean(contract.effects?.roundEffect?.damage?.magicMissile || contract.effects?.roundEffect?.magicMissile) || contract.effects?.vortex?.missile!==undefined;
    assert.equal(contract.overcast.options.includes('damage'), isMissile && contract.overcast.allowed, `${contract.name} : option dégâts`);
    if (/^(vous|contact|toucher)/i.test(contract.range)) assert.equal(contract.overcast.options.includes('range'), false, `${contract.name} : portée`);
    if (/^(sp[eé]cial)/i.test(contract.target) || /\(max/i.test(contract.target)) assert.equal(contract.overcast.options.includes('targets'), false, `${contract.name} : cibles`);
  }
});

test('Surpuissance : un sort de grimoire non mémorisé ne se surpuissance pas (champ transmis jusqu’à isOvercastAllowed)', async () => {
  const store = await combat(wizard('mage'));
  const bolt = getSpellContract('Carreau');
  const spell = { ...bolt, type: 'arcane', isMagicMissile: true, hasDamage: true };
  const ok = store.previewCasting(spell, { actorId: 'mage', roll: 25, overcastChoices: { damage: 1 } });
  assert.equal(ok.overcast.valid, true, ok.overcast.errors?.join(' '));
  const grimoire = store.previewCasting(spell, { actorId: 'mage', roll: 25, overcastChoices: { damage: 1 }, unmemorized: true });
  assert.equal(grimoire.overcast.valid, false);
  assert.match(grimoire.overcast.errors.join(' '), /grimoire/);
  const exec = store.previewSpellExecution('Carreau', { actorId: 'mage', targetIds: ['mage'], roll: 25, overcastChoices: { damage: 1 }, unmemorized: true, attributeActive: false });
  assert.equal(exec.ready, false); assert.match(exec.error, /grimoire/);
});

test('reserveSl n’est pas injectable ; le chemin à DR saisis applique les garde-fous du Test d’incantation', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true } } }));
  const bolt = getSpellContract('Carreau');
  assert.equal(store.previewCasting(bolt, { actorId: 'mage', roll: 25, reserveSl: 9 }).matchingReserve, 0, 'la réserve est celle du participant');
  const burnt = wizard('mage', { extensions: { v5: { hasMomentum: true, burnout: { active: true, days: 1 } } } });
  const direct = previewSpellExecution(burnt, bolt, [wizard('enemy')], { sl: 3, attributeActive: false });
  assert.equal(direct.ready, false); assert.match(direct.error, /Épuisement magique/);
  const withRunes = previewSpellExecution(wizard('mage'), bolt, [wizard('enemy')], { sl: 3, useCadaiRune: true, attributeActive: false });
  assert.equal(withRunes.ready, false);
});

test('Options propres au sort : « pour chaque +X DR » calculées (Peur, Terreur, Protection, Dextérité, dégâts) et rappels chiffrés', async () => {
  const winds = { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 12 } } } }, high = { extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 12 } } } };
  const store = await combat(wizard('mage', winds), wizard('enemy'), wizard('hmage', high), wizard('ally'));
  const fear = store.previewSpellExecution('Effrayant', { actorId: 'mage', targetIds: ['mage'], roll: 25, overcastSpecific: { fear: 2 }, attributeActive: false });
  assert.equal(fear.ready, true, fear.error);
  assert.deepEqual(fear.targetResults[0].temporaryEffect.traits, ['Peur (3)']);
  assert.equal(fear.castingPreview.overcast.totalSpent, 6);
  const terror = store.previewSpellExecution('Terrifiant', { actorId: 'mage', targetIds: ['mage'], roll: 25, overcastSpecific: { terror: 1 }, attributeActive: false });
  assert.deepEqual(terror.targetResults[0].temporaryEffect.traits, ['Terreur (2)']);
  const pall = store.previewSpellExecution('Voile Pourpre de Shyish', { actorId: 'mage', targetIds: ['mage'], roll: 25, overcastSpecific: { fear: 1 }, attributeActive: false });
  assert.ok(pall.targetResults[0].temporaryEffect.traits.includes('Peur (2)'), 'Voile Pourpre : +1 par +2 DR');
  const bad = store.previewSpellExecution('Effrayant', { actorId: 'mage', targetIds: ['mage'], roll: 25, overcastSpecific: { fear: 1 }, overcastChoices: { special: 2 }, attributeActive: false });
  assert.equal(bad.ready, false); assert.match(bad.error, /doit égaler le coût/);
  assert.equal(store.previewSpellExecution('Effrayant', { actorId: 'mage', targetIds: ['mage'], roll: 25, overcastSpecific: { unknown: 1 }, attributeActive: false }).ready, false);
  const saphery = store.previewSpellExecution('Bouclier de Saphery', { actorId: 'hmage', targetIds: ['hmage'], roll: 25, overcastSpecific: { ward: 1 }, otherHighSpellsCount: 1, attributeActive: false });
  assert.equal(saphery.ready, true, saphery.error);
  assert.equal(saphery.targetResults[0].sapheryWard.threshold, 9 - 1 - 1, '1 autre sort de Haute Magie + 1 palier de 3 DR');
  const drop = store.previewSpellExecution('Chute', { actorId: 'mage', targetIds: ['enemy'], ...declaredAnswers(['enemy']), roll: 25, overcastSpecific: { dexterity: 2 }, resistanceRoll: 30, attributeActive: false });
  assert.equal(drop.targetResults[0].resistanceTest.modifierSl, -2);
  assert.equal(drop.targetResults[0].resistanceTest.skill, 'Dextérité');
  const quench = store.previewSpellExecution('Extinction de l’Âme', { actorId: 'hmage', targetIds: ['enemy'], roll: 25, overcastSpecific: { fury: 1 }, burnoutRoll: 50, attributeActive: false });
  assert.equal(quench.ready, true, quench.error);
  assert.equal(quench.targetResults[0].missile.spellDamage, 11);
  assert.match(quench.overcastSpecific[0].reminder, /doublées/);
  const chain = store.previewSpellExecution('Attaques en chaine', { actorId: 'mage', targetIds: ['enemy'], roll: 25, overcastSpecific: { chain: 1 }, attributeActive: false });
  assert.equal(chain.overcastSpecific[0].applied, true /* V5 p. 243 : limite de chaîne maintenant calculée */);
});

test('Options propres au sort : chaque option calculée est exécutée ; les autres restent des rappels déclarés', async () => {
  const winds = { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 20 } } } }, high = { extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 20 } } } };
  const store = await combat(wizard('mage', winds), wizard('enemy'), wizard('hmage', high), wizard('ally'));
  let calculated = 0, reminders = 0;
  for (const contract of getAllSpellContracts().filter(c => !c.isTradition && c.overcast?.specific?.length)) {
    assert.ok(contract.overcast.options.includes('special'), contract.name);
    for (const option of contract.overcast.specific) {
      assert.ok(option.cost >= 1 && option.label, `${contract.name} / ${option.id}`);
      if (!SPECIFIC_OVERCAST_KINDS.includes(option.kind)) { assert.equal(option.kind, 'reminder'); assert.ok(option.reminder || option.label); reminders++; continue; }
      const p = previewOnAny(store, contract.id, contract.domain === 'high' ? 'hmage' : 'mage', { roll: 25, overcastSpecific: { [option.id]: 1 }, burnoutRoll: 50, resistanceRoll: 30, attributeActive: false });
      assert.equal(p.ready, true, `${contract.name} / ${option.id} : ${p.error}`);
      assert.equal(p.overcastSpecific[0].applied, true); calculated++;
    }
    assert.equal(resolveSpecificOvercast(contract, { [contract.overcast.specific[0].id]: 1 }).cost, contract.overcast.specific[0].cost);
  }
  assert.deepEqual([calculated, reminders], [44, 49], `${calculated} options calculées, ${reminders} rappels (HEPG pp. 86–89 ; clauses génériques raccordées)`);
});

// ---- S-10 : réglages enregistrés jamais lus ----

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const readJs = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? (entry.name === 'data' ? [] : readJs(path.join(dir, entry.name))) : /\.js$/.test(entry.name) ? [{ file: path.join(dir, entry.name).replaceAll('\\', '/'), text: fs.readFileSync(path.join(root, dir, entry.name), 'utf8') }] : []);
const wordIn = (key, text) => new RegExp(`(?<![A-Za-z0-9_$])${key}(?![A-Za-z0-9_$])`).test(text);

// Ligne qui ne fait que tester la présence du drapeau (`if (effects.x) {`, `if (!effects.x)`) : la valeur n'y est pas utilisée.
const bareCondition = (key, line) => new RegExp(`^\\s*(?:\\}\\s*)?(?:else\\s+)?if\\s*\\(\\s*!*[\\w$.?\\[\\]']*\\b${key}\\s*\\)\\s*(?:\\{\\s*)?$`).test(line);

test('Tout drapeau de contrat écrit est lu : consommateur moteur ou rappel déclaré (liste blanche explicite)', () => {
  const sources = readJs('js');
  const readers = sources.filter(source => source.file !== 'js/core/v5-magic-reminder-flags.js');
  const unread = new Set();
  for (const contract of getAllSpellContracts()) for (const key of Object.keys(contract.effects || {})) {
    // Une simple condition `if (effects.x)` n'est pas une lecture : il faut un usage de la valeur (ou un rappel déclaré, exécuté ci-dessous).
    if (!readers.some(source => source.text.split('\n').some(line => wordIn(key, line) && !bareCondition(key, line)))) unread.add(key);
  }
  const undeclared = [...unread].filter(key => !(key in REMINDER_FLAGS));
  assert.deepEqual(undeclared, [], 'drapeaux écrits par un contrat, jamais lus et sans rappel déclaré');
  for (const key of Object.keys(REMINDER_FLAGS)) assert.ok(getAllSpellContracts().some(contract => key in (contract.effects || {}) || key in (contract.effects?.healing || {}) || key in (contract.effects?.summon || {})), `${key} : rappel sans contrat`);
});

test('Tout état spécial écrit par un sort est lu, ou déclaré marqueur de suivi sans règle moteur', () => {
  const writers = fs.readFileSync(path.join(root, 'js/core/v5-spell-contracts.js'), 'utf8');
  const keys = [...new Set([...writers.matchAll(/computedSpecialState\.([A-Za-z0-9]+)\s*=/g)].map(match => match[1]).concat(getAllSpellContracts().flatMap(c=>Object.keys(c.effects?.specialState || {}))))];
  const sources = readJs('js');
  const unread = keys.filter(key => !sources.some(source => source.text.split('\n').some(line => wordIn(key, line)
    && !(source.file === 'js/core/v5-spell-contracts.js' && /computedSpecialState\./.test(line)) && !(source.file === 'js/core/v5-magic-reminder-flags.js'))));
  assert.deepEqual(unread.filter(key => !MARKER_ONLY_SPECIAL_STATES.includes(key)), [], 'état spécial jamais lu et non déclaré');
  for (const key of MARKER_ONLY_SPECIAL_STATES) assert.ok(keys.includes(key), `${key} : marqueur déclaré mais plus écrit`);
  for (const named of ['immuneToDamageUntilHit', 'incomingRangedBonusSl', 'shooterTestToFire', 'halvedMaxHp', 'bonusActions', 'temporaryTalents']) {
    assert.equal(MARKER_ONLY_SPECIAL_STATES.includes(named), false, `${named} doit avoir un consommateur ou un rappel, pas un simple marqueur`);
  }
});

test('Drapeaux déclarés en rappel : chacun produit son rappel à l’exécution du sort', async () => {
  const winds = { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 20 } } } }, high = { extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 20 } } } };
  const store = await combat(wizard('mage', winds), wizard('enemy'), wizard('hmage', high), wizard('ally'));
  const seen = new Set();
  for (const contract of getAllSpellContracts()) {
    const flags = reminderFlagTexts(contract, wizard('mage'));
    if (!flags.length) continue;
    const high = contract.domain === 'high';
    const choice = getContractChoiceOptions(contract)[0];
    const p = previewOnAny(store, contract.id, high ? 'hmage' : 'mage', { roll: 25, resistanceRoll: 30, fellowshipRoll: 20, enduranceRoll: 20, agilityRoll: 20, burnoutRoll: 50, attributeActive: false,
      ...(contract.effects.special==='transformation-of-kadon'?{monsterKey:'troll'}:{}),willpowerSuccess: true, direction: 'N', distance: 10, mjDuration: { amount: 5, unit: 'minutes' }, ...(choice ? { mjChoice: choice } : {}) });
    assert.equal(p.ready, true, `${contract.name} : ${p.error}`);
    for (const text of flags) assert.ok(p.reminders.includes(text), `${contract.name} : rappel manquant « ${text} »`);
    flags.forEach(text => seen.add(text));
  }
  assert.ok(seen.size >= 15, `${seen.size} rappels de drapeaux exécutés`);
});

test('Transe d’Ambre : insensible aux dégâts (immunité de couche), plus de drapeau mort', async () => {
  const store = await combat(wizard('mage'), wizard('enemy'));
  await store.applySpellExecution('Transe d’Ambre', { actorId: 'mage', targetIds: ['mage'], roll: 25, attributeActive: false, domainFacts:{durationMode:'normal'},targetTests:{mage:{unwilling:false}} });
  const mage = person(store, 'mage');
  assert.equal(mage.extensions.v5.immunities.damage.length, 1);
  const protection = previewMagicProtection(mage, 8, { nature: attackNature({ ranged: false }) });
  assert.equal(protection.amount, 0); assert.equal(protection.immune, true);
  assert.match(protection.immunity, /Transe d’Ambre/);
  assert.equal(getSpellContract('Transe d’Ambre').effects.immuneToDamageUntilHit, undefined);
});

test('Attraction des Flèches — HEPG p. 86 : relance du tir raté, aucun +2 DR inventé', async () => {
  const store = await combat(wizard('hmage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 20 } } } }), wizard('enemy'), wizard('archer', { camp: 'ennemi' }));
  const bonus = () => store.previewResolution({ actorId: 'archer', targetId: 'enemy', action: { type: 'attack', attr: 'CT', base: 50, damageFormula: 'BF+4' }, roll: 25, v5: { kind: 'ranged', choice: 'keep' } }).test.details.modifiers;
  assert.equal(bonus().some(row => /fl[eè]ches/i.test(row.label)), false);
  await store.applySpellExecution('Malédiction d’Attraction des Flèches', { actorId: 'hmage', targetIds: ['enemy'], roll: 25, attributeActive: false });
  const row = bonus().find(item => /fl[eè]ches/i.test(item.label));
  assert.equal(row,undefined);assert.equal(person(store,'enemy').extensions.v5.specialStates.missileMissReroll,true);
});

test('Sang Bouillonnant et Blizzard enflammé : Test de Résistance et Test d’Athlétisme de la cible consommés', () => {
  const caster = wizard('mage'), target = wizard('enemy', { skills: [{ name: 'Résistance', total: 40 }, { name: 'Athlétisme', total: 40 }] });
  const blood = getSpellContract('Sang Bouillonnant');
  const passed = previewSpellExecution(caster, blood, [target], { roll: 25, sl: 6, resistanceRoll: 20, attributeActive: false });
  assert.equal(passed.targetResults[0].resistanceTest.modifierSl, -1, 'Difficile (−10) devient −1 DR');
  const failed = previewSpellExecution(caster, blood, [target], { roll: 25, sl: 6, resistanceRoll: 95, attributeActive: false });
  assert.equal(failed.targetResults[0].resistanceTest.resisted, false);
  const blizzard = getSpellContract('Blizzard enflammé de Ygethmor');
  // WoM p. 137 : les dégâts et Athlétisme sont périodiques, exercés au Store dans le test Lot 4.
  const stands=previewSpellExecution(caster,blizzard,[target],{roll:25,sl:12,attributeActive:false});
  assert.equal(stands.targetResults[0].woundsLost,0);
  assert.equal(stands.targetResults[0].temporaryEffect.roundEffect.test.skill,'Athlétisme');
  assert.equal(blizzard.effects.roundEffect.test.modifierSl,0);
});

test('Clés de Test des effets magiques : spécialités, Tous les Tests, adverse, Défense contre Tir', () => {
  const actor = wizard('mage', { extensions: { v5: { testModifiers: { 'Discrétion (Urbaine)': 2, 'Perception (Odorat)': 1, 'Tous les Tests (Secousse)': -1, 'Tous les Tests (Créatures végétales)': 3, 'Défense contre Tir': -2, 'Perception adverse': -2, Pistage: 1 } } } });
  const amounts = (skill, context) => magicSkillModifiers(actor, skill, context).map(row => row.amount).sort((a, b) => a - b);
  assert.deepEqual(amounts('Discrétion (Urbaine)'), [-1, 2], 'spécialité exacte + tous les Tests');
  assert.deepEqual(amounts('Discrétion'), [-1], 'sans la spécialité de la clé : seulement « Tous les Tests »');
  assert.deepEqual(amounts('Discrétion', { skillContext: 'Urbaine' }), [-1, 2], 'contexte déclaré par le MJ');
  assert.deepEqual(amounts('Pistage (Forêt)'), [-1, 1], 'clé sans spécialité : toutes les spécialités');
  assert.deepEqual(amounts('Perception', { skillContext: 'odorat' }), [-1, 1]);
  assert.deepEqual(amounts('Athlétisme'), [-1], '« Créatures végétales » : conditionnel, jamais automatique');
  assert.deepEqual(magicAdverseModifiers(actor, 'Perception').map(row => row.amount), [-2], '« … adverse » : appliqué au testeur qui s’y oppose');
  assert.deepEqual(magicAdverseModifiers(actor, 'Intuition'), []);
  assert.deepEqual(magicSkillModifiers(actor, 'Défense contre Tir').map(row => row.amount).sort((a, b) => a - b), [-2, -1]);
});

test('Bouclier de Saphery : chaque autre sort de Haute Magie du lanceur améliore la Protection de 1 (otherHighSpellsCount alimenté)', async () => {
  const hmage = wizard('hmage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } } });
  const store = await combat(hmage, wizard('ally'), wizard('enemy'));
  await store.applySpellExecution('Bouclier de Saphery', { actorId: 'hmage', targetIds: ['ally'], roll: 25, attributeActive: false });
  assert.equal(person(store, 'ally').extensions.v5.ward, 9);
  await store.applySpellExecution('Apothéose', { actorId: 'hmage', targetIds: ['hmage'], roll: 15, attributeActive: false }); // HEPG pp. 86, 89 : tout autre sort de Haute Magie
  assert.equal(person(store, 'ally').extensions.v5.ward, 8);
  await store.undo();
  assert.equal(person(store, 'ally').extensions.v5.ward, 9, 'Annulable');
});

test('IMPLEMENTED_SPECIAL_HANDLERS : chaque étiquette a une branche de code ou des champs de données calculables', () => {
  const code = readJs('js/core').filter(source => source.file !== 'js/core/v5-spell-contracts.js').map(source => source.text).join('\n')
    + fs.readFileSync(path.join(root, 'js/core/v5-spell-contracts.js'), 'utf8').replace(/export const IMPLEMENTED_SPECIAL_HANDLERS = new Set\(\[[^\]]*\]\);/, '');
  const data = ['statModifiers', 'traits', 'conditions', 'removeConditions', 'damage', 'missile', 'healing', 'ward', 'apModifiers', 'testModifiers', 'summon', 'damageReduction',
    'immunities', 'weaponDamageBonus', 'talents', 'movementMultiplier', 'strengthPerSl', 'progressiveAp', 'conditionalAp', 'reflect', 'secondaryTest', 'selfConditions',
    'engagedEnemyConditions', 'engagedEnemyDamage', 'tempFortunePoints', 'fortunePoints', 'grantedActions', 'forceFumbleOnDoubles', 'resistanceModifierSl', 'athleticsTestSl'];
  const bare = [];
  for (const contract of getAllSpellContracts()) {
    const tag = contract.effects?.special;
    // Rappels narratifs et contrats saisis par le MJ (mj-input, vortex) : classés ainsi dans la matrice, jamais « calculables ».
    if (!tag || contract.effects.type === 'narrative' || contract.treatment === 'narrative' || contract.effects.type === 'mj-input' || contract.effects.mjInput || contract.isVortex) continue;
    assert.ok(IMPLEMENTED_SPECIAL_HANDLERS.has(tag), `${contract.name} : étiquette ${tag} non déclarée`);
    if (!code.includes(`'${tag}'`) && !data.some(key => key in contract.effects)) bare.push(`${contract.name} (${tag})`);
  }
  assert.deepEqual(bare, [], 'étiquette déclarée traitée sans branche ni donnée calculable : à rétrograder en rappel');
});

test('Masque de l’Esprit : la pénalité du contrat est lue (Intuition adverse −3 DR)', () => {
  const caster = wizard('mage'), p = previewSpellExecution(caster, getSpellContract('Masque de l’Esprit (Shyish & Ulgu)'), [caster], { roll: 25, sl: 8, attributeActive: false });
  assert.equal(p.ready, true, p.error);
  assert.equal(p.targetResults[0].temporaryEffect.testModifiers['Intuition adverse'], -3);
});
});

describe('Dés explicites', () => {
/**
 * S-03 / T-04 — aucun tirage implicite : chaque dé utilisé par un aperçu magique est saisi par le MJ,
 * sinon l'aperçu reste ready:false et le champ figure dans `missing`.
 * L-01 — un sort mineur réussi sur un double ne produit pas d'incident, y compris via la logique de l'interface.
 */

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

  const complete = previewChannelling(mage, { type: 'winds', roll: 99, lossRoll: 2, miscastRoll: 48 });
  assert.equal(complete.miscast.modifiedRoll, 68);
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
    ['MINOR', 63, ['duration']], ['MINOR', 48, ['duration']], ['MINOR', 73, ['duration']], ['MINOR', 98, ['majorRoll']],
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
  for (const path of ['../../../js/ui/workspace-view.js', '../../../js/ui/resolution-panel.js', '../../../js/ui/workspace/helpers.js', '../../../js/ui/resolution-panel/critical.js', '../../../js/ui/resolution-panel/dom.js', '../../../js/ui/resolution-panel/magic.js', '../../../js/ui/resolution-panel/result.js', '../../../js/ui/v5-magic-controls.js', '../../../js/core/v5-turn.js', '../../../js/core/v5-magic-turn.js']) {
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
  const dir = new URL('../../../js/core/', import.meta.url);
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
});

describe('Finalisation — conséquences Store et combat', () => {
const talent=(id,rank=1,specialization)=>({id:'talent-'+id,status:'resolved',rank,...(specialization?{specialization}:{})});
const wizard=(id='mage',extra={})=>({id,name:id,kind:'PJ',camp:'pj',hp:30,maxHp:30,fortune:2,zone:'active',init:50,caracs:{CC:40,CT:40,F:30,E:30,Int:60,FM:50,Ag:40,I:40,Dex:40,Soc:40,M:4},skills:[{name:'Langue (Magick)',total:60},{name:'Focalisation',total:60},{name:'Focalisation (Haute Magie)',total:60},{name:'Savoir (Magie)',total:60},{name:'Prière',total:50}],talents:[],states:[],equipment:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{hasMomentum:true}},...extra});
async function combat(...people){const store=createStore();await store.ready;await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:people[0].id,order:people.map(p=>p.id),participants:people},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});return store;}
const person=(store,id)=>store.listParticipants().find(p=>p.id===id);

test('Sans ingrédients : un ancien flag conserve l’incident et ses États réels, Undo exact',async()=>{
 const store=await combat(wizard(),wizard('enemy',{camp:'ennemi'}));
 await store.applySpellExecution('Carreau',{actorId:'mage',targetIds:['enemy'],roll:77,miscastRoll:70,ingredient:true});
 assert.equal(person(store,'enemy').hp,30);assert.ok(person(store,'mage').states.some(s=>s.key==='hemorragique'));await store.undo();assert.deepEqual(person(store,'mage').states,[]);
});
test('Talents canoniques : Diction, Harmonisation et Bénédiction nécessitent une acquisition résolue',()=>{
 const base=wizard();assert.equal(magicTalentRank({...base,talents:[{name:'Diction instinctive'}]},'instinctive-diction'),0);
 const w={...base,talents:[talent('instinctive-diction'),talent('aethyric-attunement'),talent('lileath-s-blessing',2)]};
 const p=previewChannelling(w,{type:'high',roll:25});assert.equal(p.gain,11);
 const spell=getSpellContract('Carreau');const missing=previewCasting(w,spell,{roll:33,miscastRoll:50});assert.equal(missing.ready,false);
 const chosen=previewCasting(w,spell,{roll:33,miscastRoll:50,miscastRoll2:15,miscastChoice:'second',instinctiveDiction:true});assert.equal(chosen.ready,true);assert.equal(chosen.miscast,null);
 assert.equal(previewCasting(base,spell,{roll:33,miscastRoll:15,instinctiveDiction:true}).miscast.name,'Distraction');
});
test('Assistant animal inverse facultativement ; Assistant magique donne +2 DR sans Avantage supplémentaire',()=>{
 const w=wizard(),animal=wizard('animal',{talents:[talent('animal-assistant')]}),magic=wizard('familiar',{talents:[talent('magical-assistant'),talent('animal-assistant')]});
 const a=previewChannelling(w,{roll:61,assistant:animal,assistantLinked:true,choice:'reverse'});assert.equal(a.test.roll,16);assert.equal(a.success,true);
 const b=previewChannelling(w,{roll:25,assistant:magic,assistantLinked:true});assert.equal(b.gain,11);assert.equal(b.test.advantage.net,0);
});
test('HEPG p. 84 — une rune Cadai est refusée sur Carreau, hors Haute Magie, sans débit du stock',async()=>{
 const store=await combat(wizard(),wizard('enemy',{camp:'ennemi'}));await store.deployCadaiRune({actorId:'mage',roll:25,conditionsConfirmed:true});assert.equal(store.getCadaiRunes('mage').deployed,1);
 assert.throws(()=>store.previewCasting({name:'Carreau',cn:0,type:'petty'},{actorId:'mage',roll:25,useCadaiRune:true,cadaiRoll:85}),/Haute Magie/);
 const input={actorId:'mage',targetIds:['enemy'],roll:25,useCadaiRune:true,cadaiAccessible:true,cadaiPurpose:'test',cadaiRoll:85};
 assert.throws(()=>store.previewSpellExecution('Carreau',input),/Haute Magie/);
 await assert.rejects(async()=>store.applySpellExecution('Carreau',input),/Haute Magie/);
 assert.equal(store.getCadaiRunes('mage').deployed,1);assert.equal(person(store,'enemy').hp,30);
});
test('Haute Magie : épuisement obligatoire, nouveau lancer bloqué puis récupération payée',async()=>{
 const actor=wizard('mage',{caracs:{...wizard().caracs,FM:10,Int:100},extensions:{v5:{channelling:{type:'high',sl:30}}}});const store=await combat(actor,wizard('enemy',{camp:'ennemi'}));
 const input={actorId:'mage',targetIds:['enemy'],roll:25,arcaneOptions:{enhancedDamage:true},arcaneTargets:{enemy:{magicItemPresent:false}}};
 assert.equal(store.previewSpellExecution('Destruction des Arcanes',input).status,'burnout-roll-required');
 await store.applySpellExecution('Destruction des Arcanes',{...input,burnoutRoll:5});assert.equal(person(store,'mage').extensions.v5.burnout.active,true);
 assert.throws(()=>store.previewChannelling({actorId:'mage',roll:25}),/Épuisement/);
 // S-11 : sans compteur de Chance initialisé, l'épuisement ne se lève pas (aucun repli sur participant.fortune).
 assert.equal(store.previewBurnoutRecovery({actorId:'mage'}).possible,false);
 await store.setFortune('mage',1);
 await store.applyBurnoutRecovery(store.previewBurnoutRecovery({actorId:'mage'}),{actorId:'mage'});assert.equal(person(store,'mage').extensions.v5.burnout,null);assert.equal(store.getFortune('mage').balance,0);
});
test('Réaction : réserve consommée, effets bloqués, quota par Round et Undo atomique',async()=>{
 const store=await combat(wizard('mage',{extensions:{v5:{channelling:{type:'winds',sl:4}}}}),wizard('enemy',{camp:'ennemi',skills:[{name:'Langue (Magick)',total:100}]}));
 const input={actorId:'mage',targetIds:['enemy'],roll:25,dispelReaction:{dispellerId:'enemy',roll:10,distance:10,visible:true}};
 const p=store.previewSpellExecution('Carreau',input);assert.equal(p.dispelReaction.dispelled,true,p.error);
 await store.applySpellExecution('Carreau',input);assert.equal(person(store,'enemy').hp,30);assert.equal(person(store,'enemy').extensions.v5.dispelReactionRound,1);assert.equal(person(store,'mage').extensions.v5.channelling.sl,0);
 assert.equal(store.previewSpellExecution('Carreau',input).ready,false);await store.undo();assert.equal(person(store,'enemy').extensions.v5.dispelReactionRound,undefined);assert.equal(person(store,'mage').extensions.v5.channelling.sl,4);
});
test('Dissipation persistante : progression par dissipateur, retrait de toutes les couches du même lancer, restauration',async()=>{
 const store=await combat(wizard(),wizard('ally'));
 for(const id of ['mage','ally'])await store.applySpellEffects(id,{id:'buff-'+id,spellName:'Recette',spellId:'recette',casterId:'mage',cn:8,castExecutionId:'cast-1',duration:'10 Rounds',statModifiers:{Ag:20},ward:8});
 let effect=person(store,'ally').extensions.v5.spellEffects[0];let p=store.previewDispelPersistent(effect,{dispellerId:'mage',roll:25,distance:5,visible:true});assert.equal(p.earnedSl,5);assert.equal(p.dispelled,false);await store.applyDispelPersistent(p);
 effect=person(store,'ally').extensions.v5.spellEffects[0];p=store.previewDispelPersistent(effect,{dispellerId:'mage',roll:25,distance:5,visible:true});assert.equal(p.dispelled,true);await store.applyDispelPersistent(p);
 assert.equal(person(store,'ally').caracs.Ag,40);assert.equal(person(store,'mage').caracs.Ag,40);await store.undo();assert.equal(person(store,'ally').caracs.Ag,60);assert.equal(person(store,'ally').extensions.v5.spellEffects[0].progressByDispeller.mage,5);
});
test('Attribut choisi : Vie enlève les États, Cieux expire au prochain Tour',async()=>{
 const store=await combat(wizard('mage',{extensions:{v5:{channelling:{type:'high',sl:30}}}}),wizard('ally',{states:[{key:'hemorragique',name:'Hémorragique',level:2},{key:'extenue',name:'Exténué',level:1}]}));
 await store.applySpellExecution('Bouclier de Saphery',{actorId:'mage',targetIds:['ally'],roll:25,chosenLore:'life'});assert.deepEqual(person(store,'ally').states,[]);await store.undo();
 await store.applySpellExecution('Bouclier de Saphery',{actorId:'mage',targetIds:['ally'],roll:25,chosenLore:'heavens'});assert.equal(store.getFortune('mage').temporary,1);await store.nextTurn();assert.equal(store.getFortune('mage').temporary,1);await store.nextTurn();assert.equal(store.getFortune('mage').temporary,0);
});
test('Bonus de caractéristique temporaire et bonus de Test modifient effectivement la prochaine Focalisation',async()=>{
 const store=await combat(wizard());await store.applySpellEffects('mage',{spellId:'buff',duration:'10 Rounds',statModifiers:{FM:20},testModifiers:{Focalisation:2}});
 const p=store.previewChannelling({actorId:'mage',roll:25});assert.equal(p.test.score,80);assert.equal(p.sl,8);await store.expireSpellEffects('mage',{spellId:'buff'});assert.equal(store.previewChannelling({actorId:'mage',roll:25}).sl,4);
});
test('Mage de guerre : coût Élan, NI ≤ 5 et verrou jusqu’au prochain Tour',async()=>{
 const store=await combat(wizard('mage',{talents:[talent('war-wizard')]}),wizard('enemy',{camp:'ennemi'}));await store.applySpellExecution('Carreau',{actorId:'mage',targetIds:['enemy'],roll:25,warWizard:true});assert.equal(person(store,'mage').extensions.v5.hasMomentum,false);assert.throws(()=>store.previewChannelling({actorId:'mage',roll:25}),/Mage de guerre/);await store.nextTurn();await store.nextTurn();assert.equal(store.previewChannelling({actorId:'mage',roll:25}).ready,true);
});

test('Lileath : une seule couche Main de Gloire, cumul plafonné des Tests et PA, dissipation groupée',async()=>{
 const store=await combat(wizard('mage',{talents:[talent('lileath-s-blessing',1)],extensions:{v5:{channelling:{type:'high',sl:20}}}}));
 await store.applySpellExecution('Main de Gloire',{actorId:'mage',targetIds:['mage'],roll:25,tier:'overcast6',chosenStats:['CC','CT','Ag','I'],roll3d10:15,overcastChoices:{special:6},burnoutRoll:50});
 assert.equal(person(store,'mage').caracs.CC,55);assert.equal(person(store,'mage').extensions.v5.spellEffects.filter(e=>e.spellName==='Main de Gloire').length,1);
 const effect=person(store,'mage').extensions.v5.spellEffects[0];assert.equal(effect.cn,getSpellContract('Main de Gloire').cn);assert.ok(effect.castExecutionId);await store.applyDispelPersistent(store.previewDispelPersistent(effect,{dispellerId:'mage',roll:25,distance:5,visible:true}));assert.equal(person(store,'mage').caracs.CC,40);
 for(const [id,n] of [['a',2],['b',1],['c',1]])await store.applySpellEffects('mage',{id,spellId:id,casterId:'mage',duration:'10 Rounds',testModifiers:{Focalisation:n},apModifiers:{all:n}});
 assert.equal(person(store,'mage').extensions.v5.testModifiers.Focalisation,3);assert.equal(person(store,'mage').armor.head,3);
 await store.expireSpellEffects('mage',{spellId:'a'});assert.equal(person(store,'mage').armor.head,2);
});
test('Les pénalités d’incident agissent puis expirent ; un dé secondaire saisi est conservé',async()=>{
 const store=await combat(wizard());const p=store.previewMiscast({actorId:'mage',severity:'MINOR',roll:62,secondaryRolls:{duration1d10:2}});assert.equal(p.details.duration.value,2);await store.applyMiscast(p,{actorId:'mage'});
 assert.equal(store.previewChannelling({actorId:'mage',roll:25}).sl,2);await store.advanceTalentMinutes(119);assert.equal(store.previewChannelling({actorId:'mage',roll:25}).sl,2);await store.advanceTalentMinutes(1);assert.equal(store.previewChannelling({actorId:'mage',roll:25}).sl,4);await store.undo();assert.equal(store.previewChannelling({actorId:'mage',roll:25}).sl,2);
});
test('Lumière : les Blessures directes d’attribut ignorent la Protection (D-14), qui n’annule que les dégâts du projectile (D-13)',async()=>{
 const store=await combat(wizard('mage',{extensions:{v5:{channelling:{type:'high',sl:25}}}}),wizard('undead',{camp:'ennemi',traits:['Mort-vivant'],extensions:{v5:{ward:7}}}));
 const input={actorId:'mage',targetIds:['undead'],roll:25,chosenLore:'light',targetTests:{undead:{wardRoll:8}}};
 const p=store.previewSpellExecution('Extinction de l’Âme',input);assert.equal(p.ready,true,p.error);assert.equal(p.targetResults[0].loreDirectWounds,6);assert.equal(p.targetResults[0].magicProtection.wardSaved,true);assert.equal(p.targetResults[0].woundsLost,6);await store.applySpellExecution('Extinction de l’Âme',input);assert.equal(person(store,'undead').hp,24);assert.ok(person(store,'undead').states.some(s=>/aveugl/i.test(s.key||s.name)));
});
test('Défiance : chaque cible choisit ses dés ; paiement, aventure et Undo sont durables',async()=>{
 const store=await combat(wizard(),wizard('ally',{talents:[talent('magic-defiance')]}),wizard('enemy',{camp:'ennemi'}));await store.setFortune('ally',2);await store.startMagicAdventure();
 const input={actorId:'mage',targetIds:['ally'],roll:25,magicDefianceTargets:['ally']};
 await store.applySpellExecution('Carreau',input);assert.equal(person(store,'ally').hp,30);assert.equal(store.getFortune('ally').balance,1);assert.equal(store.previewSpellExecution('Carreau',input).ready,false);await store.undo();assert.equal(store.getFortune('ally').balance,2);assert.equal(store.previewSpellExecution('Carreau',input).ready,true);
 await store.applySpellExecution('Carreau',input);await store.startMagicAdventure();assert.equal(store.previewSpellExecution('Carreau',input).ready,true);
});
test('Épuisement : récupération débite le registre permanent et Undo rembourse',async()=>{
 const store=await combat(wizard('mage',{extensions:{v5:{burnout:{active:true,permanent:false,days:2}}}}));await store.setFortune('mage',2);await store.applyBurnoutRecovery(store.previewBurnoutRecovery({actorId:'mage'}),{actorId:'mage'});assert.equal(store.getFortune('mage').balance,1);await store.undo();assert.equal(store.getFortune('mage').balance,2);assert.equal(person(store,'mage').extensions.v5.burnout.active,true);await store.advanceTalentMinutes(2880);assert.equal(person(store,'mage').extensions.v5.burnout,null);
});
test('Une méditation protège réellement puis expire sans retirer une immunité encore active',async()=>{
 const store=await combat(wizard('mage',{talents:[talent('mind-over-body',2)]}));await store.applyMagicMeditation({actorId:'mage',talentId:'talent-mind-over-body',name:'L’esprit sur le corps',minutes:20,roll:45,durationRolls:[1,1]});await store.applySpellEffects('mage',{spellId:'blind',duration:'1 Round',conditions:['Aveuglé']});assert.deepEqual(person(store,'mage').states,[]);await store.advanceTalentMinutes(120);await store.applySpellEffects('mage',{spellId:'blind-2',duration:'1 Round',conditions:['Aveuglé']});assert.ok(person(store,'mage').states.some(s=>s.key==='aveugle'));
});
test('Une arme renforcée et une Protection agissent dans la résolution normale du combat',async()=>{
 const store=await combat(wizard(),wizard('enemy',{camp:'ennemi'}));const input={actorId:'mage',targetId:'enemy',action:{type:'attack',attr:'CC',base:40,damageFormula:'BF+4',qualities:[]},roll:25,defense:{base:40,roll:85,v5:{kind:'melee',choice:'keep'}},v5:{kind:'melee',choice:'keep'}};
 const before=store.previewResolution(input);await store.applySpellEffects('mage',{spellId:'weapon',duration:'2 Rounds',weaponBonus:{damage:3}});assert.equal(store.previewResolution(input).damage.finalDamage,before.damage.finalDamage+3);
 await store.applySpellEffects('enemy',{spellId:'ward',duration:'2 Rounds',ward:7});const missing=store.previewResolution(input);assert.ok(missing.unresolved.some(x=>x.includes('d10')));
 const saved=store.previewResolution({...input,v5:{kind:'melee',choice:'keep',context:{magicWardRoll:8}}});assert.equal(saved.damage.finalDamage,0);assert.equal(saved.critical,null);await store.applyResolution(saved);assert.equal(person(store,'enemy').hp,30);await store.undo();assert.equal(person(store,'enemy').hp,30);
});
test('La Fortune est Capricieuse impose une maladresse sur un double réussi et interdit Diction',async()=>{
 const actor=wizard('mage',{talents:[talent('instinctive-diction')],extensions:{v5:{specialStates:{forceFumbleOnDoubles:true,forbidCrits:true,forbidMitigation:true}}}});
 const p=previewCasting(actor,getSpellContract('Carreau'),{roll:11,miscastRoll:15,instinctiveDiction:true});assert.equal(p.spellSuccess,false);assert.equal(p.fumble,true);assert.equal(p.miscast.name,'Distraction');
});

test('Contemplation rang 3 : Fortune payée une fois, pénalité critique ignorée, expiration et Undo',async()=>{
 const store=await combat(wizard('mage',{talents:[talent('mind-over-body',3)]}));await store.setFortune('mage',2);await store.applyMagicMeditation({actorId:'mage',talentId:'talent-mind-over-body',name:'L’esprit sur le corps',minutes:20,roll:45,durationRolls:[1,1]});
 const raw={actorId:'mage',action:{type:'skill',attr:'CC',base:40},roll:25,v5:{kind:'test',context:{extendedTest:true,magicCriticalPenalty:-2}}};const before=store.previewResolution(raw).test.sl;
 await store.activateMindOverBody('mage');assert.equal(store.getFortune('mage').balance,1);assert.equal(store.previewResolution(raw).test.sl,before+2);assert.throws(()=>store.activateMindOverBody('mage'),/déjà ignorées/);await store.undo();assert.equal(store.getFortune('mage').balance,2);assert.equal(store.previewResolution(raw).test.sl,before);await store.activateMindOverBody('mage');await store.advanceTalentMinutes(120);assert.equal(person(store,'mage').extensions.v5.spellEffects.some(e=>e.ignoreCriticalPenalties),false);
});
test('Sanctuaire rang 3 : seule la pénalité Yenlui désignée est supprimée',async()=>{
 const store=await combat(wizard('mage',{talents:[talent('sanctuary-of-the-mind',3)]}));await store.applyMagicMeditation({actorId:'mage',talentId:'talent-sanctuary-of-the-mind',name:'Sanctuaire de l’esprit',minutes:20,roll:45,durationRolls:[1,1]});
 const p=store.previewCasting(getSpellContract('Carreau'),{actorId:'mage',roll:25,yenluiPenalty:-3,slModifiers:[{id:'other',amount:-1}]});assert.equal(p.test.sl,3);await store.advanceTalentMinutes(120);assert.equal(store.previewCasting(getSpellContract('Carreau'),{actorId:'mage',roll:25,yenluiPenalty:-3,slModifiers:[{id:'other',amount:-1}]}).test.sl,0);
});

test('Synchronisation : seuls les alias magiques exactement redondants sont ignorés',()=>{
 const canonical={schemaVersion:3,combat:{participants:[{id:'mage',extensions:{v5:{channelling:{type:'winds',sl:9},spellEffects:[{id:'buff'}],fortune:3}}}]}};
 const projected=structuredClone(canonical),p=projected.combat.participants[0];p.channelling={type:'winds',sl:9};p.channellingReserve={type:'winds',sl:9};p.spellEffects=[{id:'buff'}];p.fortune=3;
 assert.equal(sameSharedState(canonical,projected),true);p.extensions.spellEffects=[{id:'buff'}];p.extensions.channelling={type:'winds',sl:9};assert.equal(sameSharedState(canonical,projected),true,'D7 : miroir exact dans extensions redondant');p.extensions.spellEffects=[{id:'different'}];assert.equal(sameSharedState(canonical,projected),false,'miroir divergent = conflit réel');p.extensions.spellEffects=[{id:'buff'}];p.channelling.sl=10;assert.equal(sameSharedState(canonical,projected),false);
});

test('Forme bestiale : dégâts conservés, couches et forme retirées par dissipation groupée',async()=>{
 const store=await combat(wizard('mage',{extensions:{v5:{channelling:{type:'winds',sl:20}}}}));await store.applySpellExecution('Forme bestiale',{actorId:'mage',targetIds:['mage'],roll:25,beastKey:'wolf',attributeActive:false});assert.equal(person(store,'mage').caracs.M,9);
 await store.updateParticipant('mage',{hp:9});const effect=person(store,'mage').extensions.v5.spellEffects.find(e=>e.beastFormMarker);assert.ok(effect);assert.equal(effect.casterId,'mage');
 // A second caster dissipates while the transformed caster cannot speak.
 const dispeller=wizard('dispel');await store.addProfile(dispeller);const full=JSON.parse(store.getFullJSON());full.combat.participants.push(dispeller);full.combat.order.push(dispeller.id);await store.loadFromJSON(full);
 const p=store.previewDispelPersistent(effect,{dispellerId:'dispel',roll:10,distance:5,visible:true});assert.equal(p.dispelled,true);await store.applyDispelPersistent(p);/* LOT3_CADRAGE_MAGIE, Forme bestiale (révisé le 11 octobre) : Blessures du Loup recalculées (BF 3 + 2×BE 3 + BFM 5 = 14) ; 14 − 9 = 5 dégâts conservés, 30 − 5 = 25. */assert.equal(person(store,'mage').hp,25);assert.equal(person(store,'mage').maxHp,30);assert.equal(person(store,'mage').caracs.M,4);assert.equal(person(store,'mage').extensions.v5.beastForm,undefined);
});

test('Rune Cadai pour Corruption : nouveau dé explicite, stock perdu même sur échec et Undo',async()=>{
 const store=await combat(wizard());await store.deployCadaiRune({actorId:'mage',roll:25,conditionsConfirmed:true});await store.applySpellExecution('Apothéose',{actorId:'mage',targetIds:['mage'],roll:25,operationId:'high-1'});await store.rerollCorruptionWithCadai({actorId:'mage',castExecutionId:'high-1',accessible:true,firstRoll:85,reroll:95,slModifier:-2});assert.equal(store.getCadaiRunes('mage').deployed,0);assert.equal(person(store,'mage').extensions.v5.lastCadaiCorruption.test.success,false);assert.equal(person(store,'mage').extensions.v5.lastCadaiCorruption.firstRoll,85);await store.undo();assert.equal(store.getCadaiRunes('mage').deployed,1);
});
test('Perception magique : portée et direction enregistrées sans identifier la magie',async()=>{
 const store=await combat(wizard(),wizard('observer',{talents:[talent('magical-sense')]}));await store.applySpellExecution('Carreau',{actorId:'mage',targetIds:['observer'],roll:25,senseFacts:{observer:{distance:10,direction:'à l’est'}}});assert.ok(JSON.parse(store.getFullJSON()).log.some(entry=>/observer détecte un lancement.*à l’est.*non identifiée/.test(entry.text)));
});

test('Caractéristique actuelle : aucun double bonus sans compétence totale ou en défense',async()=>{
 const actor=wizard('mage',{skills:[{name:'Focalisation',total:60},{name:'Langue (Magick)',advances:5}]});const store=await combat(actor,wizard('enemy',{camp:'ennemi'}));await store.applySpellEffects('mage',{spellId:'buff',duration:'2 Rounds',statModifiers:{FM:20,Int:20,Ag:20}});
 assert.equal(store.previewChannelling({actorId:'mage',type:'high',roll:25}).score,70);assert.equal(store.previewChannelling({actorId:'mage',type:'high',roll:25}).gain,12);assert.equal(store.previewChannelling({actorId:'mage',roll:25}).score,80);
 assert.equal(store.previewCasting({name:'Carreau',cn:0,type:'petty'},{actorId:'mage',roll:25}).score,85);
 const p=store.previewResolution({actorId:'enemy',targetId:'mage',action:{type:'attack',attr:'CC',base:40,damageFormula:'BF+4',qualities:[]},roll:25,defense:{base:60,attr:'Ag',roll:25,label:'Ag',extensions:{v5:{scoreIsCurrent:true}},v5:{kind:'test',choice:'keep'}},v5:{kind:'melee',choice:'keep'}});assert.equal(p.opposition.defender.score,60);
});
});

describe('Compétences, réserves et pénalités d’armure', () => {
const memory = () => {
  let state;
  return {
    load: async () => state && structuredClone(state),
    saveAtomic: async ({ state: next }) => {
      state = structuredClone(next);
      return { ok: true };
    }
  };
};

function createWizardParticipant(overrides = {}) {
  return {
    id: 'wizard-1',
    name: 'Mage Synthétique',
    caracs: { Int: 54, FM: 52, E: 38 }, // BI = 5, BFM = 5, BE = 3
    skills: [
      { name: 'Focalisation', total: 60, advances: 8 },
      { name: 'Focalisation (Haute Magie)', total: 55, advances: 3 },
      { name: 'Langue (Magick)', total: 65, advances: 11 },
      { name: 'Résistance', total: 45, advances: 7 },
      { name: 'Calme', total: 60, advances: 8 }
    ],
    equipment: [],
    states: [],
    ...overrides
  };
}

// ============================================================================
// 1. COMPÉTENCES, RÉSERVES ET PÉNALITÉS D'ARMURE
// ============================================================================

test('Focalisation V5 — résolution des deux compétences distinctes (Huit Vents vs Haute Magie)', () => {
  const wizard = createWizardParticipant();

  const windsSkill = resolveChannellingSkill(wizard, { type: 'winds' });
  assert.equal(windsSkill.skillName, 'Focalisation');
  assert.equal(windsSkill.score, 60);
  assert.equal(windsSkill.bfm, 5);
  assert.equal(windsSkill.type, 'winds');

  const highSkill = resolveChannellingSkill(wizard, { type: 'high' });
  assert.equal(highSkill.skillName, 'Focalisation (Haute Magie)');
  assert.equal(highSkill.score, 55);
  assert.equal(highSkill.bfm, 5);
  assert.equal(highSkill.type, 'high');
});

test('Focalisation V5 — réserve typée unique et manipulation', () => {
  const wizard = createWizardParticipant();
  assert.deepEqual(getChannellingReserve(wizard), { type: null, sl: 0 });

  const withWinds = setChannellingReserve(wizard, { type: 'winds', sl: 7 });
  assert.deepEqual(getChannellingReserve(withWinds), { type: 'winds', sl: 7 });

  const cleared = clearChannellingReserve(withWinds);
  assert.deepEqual(getChannellingReserve(cleared), { type: null, sl: 0 });
});

test('Focalisation V5 — pénalité d’armure : max des PA portés, métal ignoré pour Chamon, cuir pour Ghur, sorts/naturel ignorés', () => {
  // Mage sans équipement (ou armure naturelle uniquement) -> 0 pénalité
  const unarmored = createWizardParticipant({
    armor: { head: 2, body: 2, arms: 0, legs: 0 } // naturel
  });
  assert.equal(calculateMagicArmorPenalty(unarmored).penalty, 0);

  // Mage avec pièces d'équipement portées :
  // Tête : 2 PA (métal, casque en fer)
  // Corps : 1 PA (cuir) + 2 PA (maille, métal) = 3 PA
  // Bras : 1 PA (cuir)
  // Jambes : 2 PA (plaques, métal)
  // + Robe scintillante (+2 PA magiques, layer 'bonus' sur le corps)
  const armored = createWizardParticipant({
    equipment: [
      { id: 'helm', kind: 'armour', name: 'Casque en fer', ap: 2, locations: ['head'], layer: 'rigid' },
      { id: 'cuirass-leather', kind: 'armour', name: 'Gilet de cuir', ap: 1, locations: ['body'], layer: 'leather' },
      { id: 'cuirass-mail', kind: 'armour', name: 'Cotte de mailles', ap: 2, locations: ['body'], layer: 'flexible' },
      { id: 'robe-spell', kind: 'armour', name: 'Robe scintillante', ap: 2, locations: ['body'], layer: 'bonus' },
      { id: 'vambraces', kind: 'armour', name: 'Brassards de cuir', ap: 1, locations: ['rightArm', 'leftArm'], layer: 'leather' },
      { id: 'greaves', kind: 'armour', name: 'Grèves de plaques', ap: 2, locations: ['rightLeg', 'leftLeg'], layer: 'rigid' }
    ]
  });

  // Vent neutre (ex: Aqshy ou aucun Vent spécifique) :
  // Corps = 1 (cuir) + 2 (maille) = 3 PA (Robe bonus ignorée). Max sur le corps = 3 PA -> pénalité −3 DR.
  const penaltyGeneral = calculateMagicArmorPenalty(armored);
  assert.equal(penaltyGeneral.penalty, -3);
  assert.equal(penaltyGeneral.maxAp, 3);
  assert.equal(penaltyGeneral.maxLocation, 'body');

  // Vent de Chamon (Métal) : le métal est ignoré !
  // Tête (métal) : 0 PA
  // Corps (maille ignorée, bonus ignoré) : 1 PA (cuir)
  // Bras (cuir) : 1 PA
  // Jambes (métal) : 0 PA
  // Max PA = 1 -> pénalité −1 DR.
  const penaltyChamon = calculateMagicArmorPenalty(armored, { wind: 'chamon' });
  assert.equal(penaltyChamon.penalty, -1);
  assert.equal(penaltyChamon.maxAp, 1);

  // Vent de Ghur (Bêtes / Cuir) : le cuir est ignoré !
  // Tête (métal) : 2 PA
  // Corps (cuir ignoré, maille comptée) : 2 PA
  // Bras (cuir ignoré) : 0 PA
  // Jambes (métal) : 2 PA
  // Max PA = 2 -> pénalité −2 DR.
  const penaltyGhur = calculateMagicArmorPenalty(armored, { wind: 'ghur' });
  assert.equal(penaltyGhur.penalty, -2);
  assert.equal(penaltyGhur.maxAp, 2);
});

// ============================================================================
// 2. GAIN, CUMUL, CRITIQUE, CHANGEMENT DE TYPE ET MALADRESSE DE FOCALISATION
// ============================================================================

test('Focalisation V5 — BFM 5 : réussite 2 DR -> 7 ; critique 5 DR -> 15 ; cumul -> 22', () => {
  const wizard = createWizardParticipant(); // BFM = 5, score = 60

  // 1. Réussite standard à 2 DR :
  // Roll 40 sur score 60 -> DR = 6 - 4 = 2.
  // Gain = DR + BFM = 2 + 5 = 7 DR.
  const p1 = previewChannelling(wizard, { roll: 40 });
  assert.equal(p1.success, true);
  assert.equal(p1.sl, 2);
  assert.equal(p1.critical, false);
  assert.equal(p1.gain, 7);
  assert.equal(p1.newReserve.sl, 7);
  assert.equal(p1.newReserve.type, 'winds');

  // Application
  const stateAfter1 = applyChannelling(wizard, p1).participant;
  assert.deepEqual(getChannellingReserve(stateAfter1), { type: 'winds', sl: 7 });

  // 2. Critique à 5 DR :
  // Roll 11 sur score 60 -> double réussi !
  // DR = Math.max(5, 6 - 1) = 5 DR. Double = critique.
  // Gain critique = DR + 2 × BFM = 5 + 2 × 5 = 15 DR ! (pas d'incident magique)
  const p2 = previewChannelling(stateAfter1, { roll: 11 });
  assert.equal(p2.success, true);
  assert.equal(p2.sl, 5);
  assert.equal(p2.critical, true);
  assert.equal(p2.gain, 15);
  assert.equal(p2.miscast, null, 'Le critique de focalisation ne produit aucun incident');
  assert.equal(p2.startingReserve, 7);
  assert.equal(p2.newReserve.sl, 22); // 7 + 15 = 22 cumulé !

  // Application
  const stateAfter2 = applyChannelling(stateAfter1, p2).participant;
  assert.deepEqual(getChannellingReserve(stateAfter2), { type: 'winds', sl: 22 });
});

test('Focalisation V5 — changement de type efface la réserve précédente avant réussite, aperçu ne l’efface pas', () => {
  const wizard = createWizardParticipant();
  // Réserve initiale de 22 DR en 'winds'
  const stateWithWinds = setChannellingReserve(wizard, { type: 'winds', sl: 22 });

  // 1. Preview de focalisation 'high' (Haute Magie) :
  // L'aperçu doit être déterministe et NE PAS muter l'état source.
  const previewHigh = previewChannelling(stateWithWinds, { type: 'high', roll: 40 }); // roll 40 sur score 55 -> 5 - 4 = 1 DR
  assert.equal(previewHigh.typeChanged, true);
  assert.equal(previewHigh.startingReserve, 0, 'La réserve précédente repart de 0 pour la nouvelle action');
  assert.equal(previewHigh.gain, 6, '1 DR + 5 BFM = 6 DR');
  assert.equal(previewHigh.newReserve.sl, 6);
  assert.equal(previewHigh.newReserve.type, 'high');

  // L'état source a toujours ses 22 DR en 'winds' intacts !
  assert.deepEqual(getChannellingReserve(stateWithWinds), { type: 'winds', sl: 22 });

  // 2. Application effective : la réserve 'winds' est effacée et remplacée par la réserve 'high' de 6 DR
  const stateAfterApply = applyChannelling(stateWithWinds, previewHigh).participant;
  assert.deepEqual(getChannellingReserve(stateAfterApply), { type: 'high', sl: 6 });
});

test('Focalisation V5 — maladresse : perte de 1d10 DR plafonnée, réserve 0 ne descend pas sous 0, incident +10/DR perdu', () => {
  const wizard = createWizardParticipant(); // score = 60

  // Cas 1 : Réserve 0, maladresse (roll 77 sur score 60 -> échec double)
  // Jet de perte de 7 DR sur le 1d10.
  // La réserve étant à 0, la perte réelle est plafonnée à 0 DR.
  // Modificateur d'incident = +10 × 0 = +0. La réserve reste 0.
  const previewZero = previewChannelling(wizard, { roll: 77, lossRoll: 7, miscastRoll: 25 });
  assert.equal(previewZero.fumble, true);
  assert.equal(previewZero.startingReserve, 0);
  assert.equal(previewZero.lossRoll, 7);
  assert.equal(previewZero.actualLoss, 0, 'Plafonné au stock réel');
  assert.equal(previewZero.newReserve.sl, 0);
  assert.ok(previewZero.miscast);
  assert.equal(previewZero.miscast.modifier, 0, 'Modificateur +0 car 0 DR perdu');
  assert.equal(previewZero.miscast.modifiedRoll, 25);

  // Cas 2 : Réserve 4 DR, perte tirée de 7 DR (perte supérieure au stock)
  // Perte réelle = 4 DR. Réserve tombe à 0 DR.
  // Modificateur d'incident = +10 × 4 = +40 !
  const wizardWith4 = setChannellingReserve(wizard, { type: 'winds', sl: 4 });
  const previewLossCap = previewChannelling(wizardWith4, { roll: 88, lossRoll: 7, miscastRoll: 32 });
  assert.equal(previewLossCap.fumble, true);
  assert.equal(previewLossCap.startingReserve, 4);
  assert.equal(previewLossCap.lossRoll, 7);
  assert.equal(previewLossCap.actualLoss, 4, 'Plafonné à 4 DR');
  assert.equal(previewLossCap.newReserve.sl, 0);
  assert.ok(previewLossCap.miscast);
  assert.equal(previewLossCap.miscast.modifier, 40, '+10 par DR réellement perdu (+40)');
  assert.equal(previewLossCap.miscast.modifiedRoll, 72); // 32 + 40 = 72

  // Cas 3 : Réserve 15 DR, perte tirée de 6 DR
  // Perte réelle = 6 DR. Nouvelle réserve = 15 - 6 = 9 DR.
  // Modificateur d'incident = +10 × 6 = +60 !
  const wizardWith15 = setChannellingReserve(wizard, { type: 'winds', sl: 15 });
  const previewPartial = previewChannelling(wizardWith15, { roll: 88, lossRoll: 6, miscastRoll: 30 });
  assert.equal(previewPartial.actualLoss, 6);
  assert.equal(previewPartial.newReserve.sl, 9);
  assert.equal(previewPartial.miscast.modifier, 60);
  assert.equal(previewPartial.miscast.modifiedRoll, 90);
});

test('Focalisation V5 — pause de focalisation : Focalisation Accessible (+2 DR) (v3 p.236), échec vide la réserve', () => {
  const wizard = createWizardParticipant(); // Focalisation score 60
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 10 });

  // Réussite au test de pause : roll 40 sur score 60 + 2 DR -> réussite
  const pauseSuccess = previewChannellingPause(withReserve, { roll: 40 });
  assert.equal(pauseSuccess.success, true);
  assert.equal(pauseSuccess.newReserve.sl, 10, 'La réserve est conservée');

  // Échec au test de pause : roll 90 sur score 60 + 2 DR -> DR = 6 - 9 + 2 = -1 -> échec !
  const pauseFailure = previewChannellingPause(withReserve, { roll: 90 });
  assert.equal(pauseFailure.success, false);
  assert.equal(pauseFailure.newReserve.sl, 0, 'La réserve est perdue');

  const afterFailure = applyChannellingPause(withReserve, pauseFailure).participant;
  assert.deepEqual(getChannellingReserve(afterFailure), { type: null, sl: 0 });
});

test('Focalisation V5 — interruption : Calme Difficile (−2 DR), échec = perte 1d10 plafonnée + incident Mineur', () => {
  const wizard = createWizardParticipant(); // Calme score 60
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 8 });

  // Réussite au test d'interruption : roll 30 sur score 60 − 2 DR -> DR = 6 - 3 - 2 = +1 -> réussite
  const intSuccess = previewChannellingInterruption(withReserve, { roll: 30 });
  assert.equal(intSuccess.success, true);
  assert.equal(intSuccess.newReserve.sl, 8);

  // Échec au test d'interruption : roll 65 sur score 60 − 2 DR -> DR = 6 - 6 - 2 = -2 -> échec !
  // lossRoll = 5 DR -> perte réelle = 5 DR. Nouvelle réserve = 8 - 5 = 3 DR.
  // Modificateur d'incident = +10 × 5 = +50.
  const intFailure = previewChannellingInterruption(withReserve, { roll: 65, lossRoll: 5, miscastRoll: 20, secondaryRolls: { duration: 3 } });
  assert.equal(intFailure.success, false);
  assert.equal(intFailure.actualLoss, 5);
  assert.equal(intFailure.newReserve.sl, 3);
  assert.ok(intFailure.miscast);
  assert.equal(intFailure.miscast.modifier, 50);
  assert.equal(intFailure.miscast.modifiedRoll, 70);

  const afterInt = applyChannellingInterruption(withReserve, intFailure).participant;
  assert.deepEqual(getChannellingReserve(afterInt), { type: 'winds', sl: 3 });
});

// ============================================================================
// 3. LANCEMENT (CASTING) : RÉSERVE, NI, CONSOMMATION ET CRITIQUES
// ============================================================================

test('Lancement V5 — réussite juste au NI avec réserve ajoutée au test', () => {
  const wizard = createWizardParticipant(); // Langue (Magick) score 65
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 5 });
  const spell = { name: 'Boule de Feu', cn: 7, wind: 'aqshy', type: 'winds' };

  // Roll 45 sur score 65 -> DR = 6 - 4 = +2 DR.
  // Total = Test DR (2) + Réserve (5) = 7 DR.
  // NI = 7 -> 7 >= 7 -> Succès juste au NI !
  // Excédent = 7 - 7 = 0.
  const preview = previewCasting(withReserve, spell, { roll: 45 });
  assert.equal(preview.testSuccess, true);
  assert.equal(preview.testSl, 2);
  assert.equal(preview.matchingReserve, 5);
  assert.equal(preview.totalCastingSl, 7);
  assert.equal(preview.spellSuccess, true);
  assert.equal(preview.surplus, 0);
  assert.equal(preview.availableOvercastSl, 0);
  assert.equal(preview.reserveConsumed, 5);

  // Vérifier que la réserve n'a pas été mutée dans le participant d'origine lors du preview
  assert.deepEqual(getChannellingReserve(withReserve), { type: 'winds', sl: 5 });

  // Application : la réserve passe à 0
  const afterApply = applyCasting(withReserve, preview).participant;
  assert.deepEqual(getChannellingReserve(afterApply), { type: null, sl: 0 });
});

test('Lancement V5 — échec du test malgré grande réserve : le test doit réussir (DR >= 0) !', () => {
  const wizard = createWizardParticipant(); // score 65
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 20 });
  const spell = { name: 'Éclair', cn: 4, wind: 'azyr', type: 'winds' };

  // Roll 75 sur score 65 -> DR = 6 - 7 = -1 DR (échec du test).
  // La règle stipule : "LE TEST DOIT RÉUSSIR (DR >= 0). La réserve ne sauve ni un échec ni une maladresse !"
  // Le total ne devient PAS -1 + 20 = 19. Le sort échoue, et la réserve est consommée !
  const preview = previewCasting(withReserve, spell, { roll: 75 });
  assert.equal(preview.testSuccess, false);
  assert.equal(preview.testSl, -1);
  assert.equal(preview.spellSuccess, false, 'Le sort échoue car le test a échoué');
  assert.equal(preview.totalCastingSl, -1, 'La réserve n’est pas ajoutée à un test raté');
  assert.equal(preview.reserveConsumed, 20);

  // Application : la réserve de 20 est perdue
  const afterApply = applyCasting(withReserve, preview).participant;
  assert.deepEqual(getChannellingReserve(afterApply), { type: null, sl: 0 });
});

test('Lancement V5 — maladresse au lancer : échec, perte de réserve et incident Mineur', () => {
  const wizard = createWizardParticipant(); // score 65
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 12 });
  const spell = { name: 'Mur de Flammes', cn: 6, wind: 'aqshy', type: 'winds' };

  // Roll 77 sur score 65 -> DR = 6 - 7 = -1 DR, double = Maladresse !
  const preview = previewCasting(withReserve, spell, { roll: 77, miscastRoll: 40, secondaryRolls: { distance: 40 } });
  assert.equal(preview.testSuccess, false);
  assert.equal(preview.fumble, true);
  assert.equal(preview.spellSuccess, false);
  assert.ok(preview.miscast, 'Incident Mineur déclenché sur maladresse de lancer');
  assert.equal(preview.miscast.table, 'MINOR');
  assert.equal(preview.miscast.initialRoll, 40);

  const afterApply = applyCasting(withReserve, preview).participant;
  assert.deepEqual(getChannellingReserve(afterApply), { type: null, sl: 0 });
});

test('Lancement V5 — double réussi : incident Mineur (sauf sorts mineurs) et choix d’effet critique', () => {
  const wizard = createWizardParticipant(); // score 65, BI = 5, BFM = 5 -> max overcast = 10
  const spell = { name: 'Lance de Feu', cn: 5, wind: 'aqshy', type: 'winds', hasDamage: true };

  // Roll 22 sur score 65 -> double réussi !
  // DR = Math.max(5, 6 - 2) = 5 DR (dramatique). Total = 5 >= 5 -> sort réussi.
  // 1. Choix 'total-power' : ajoute le chiffre des dizaines du jet (2) aux DR de surpuissance !
  const previewTotalPower = previewCasting(wizard, spell, {
    roll: 22,
    criticalChoice: 'total-power',
    miscastRoll: 15
  });
  assert.equal(previewTotalPower.critical, true);
  assert.equal(previewTotalPower.criticalChoice, 'total-power');
  assert.equal(previewTotalPower.spellSuccess, true);
  assert.equal(previewTotalPower.extraOvercastFromCritical, 2, 'Dizaines de 22 = 2');
  assert.equal(previewTotalPower.surplus, 0); // 5 - 5 = 0
  assert.equal(previewTotalPower.availableOvercastSl, 2); // 0 + 2 = 2
  assert.ok(previewTotalPower.miscast, 'Double réussi déclenche un incident Mineur');

  // 2. Choix 'unstoppable-force' : force irrésistible
  const previewForce = previewCasting(wizard, spell, {
    roll: 33, // dizaines 3, DR 5
    criticalChoice: 'unstoppable-force',
    miscastRoll: 20
  });
  assert.equal(previewForce.criticalChoice, 'unstoppable-force');
  assert.equal(previewForce.extraOvercastFromCritical, 0);
  assert.ok(previewForce.miscast);

  // 3. Exception des sorts mineurs : aucun incident ni choix critique sur double réussi
  const pettySpell = { name: 'Petite Flamme', cn: 0, type: 'petty', isPetty: true };
  const previewPetty = previewCasting(wizard, pettySpell, { roll: 22 });
  assert.equal(previewPetty.critical, true);
  assert.equal(previewPetty.miscast, null, 'Les sorts mineurs ne déclenchent aucun incident sur double réussi');
});

// ============================================================================
// 4. SURPUISSANCE (OVERCASTING) : PLAFOND BI+BFM, PALIERS ET RESTRICTIONS
// ============================================================================

test('Surpuissance V5 — répartition des coûts 1, 2, 3, 5, 8, 13, 18 et plafond BI + BFM', () => {
  const wizard = createWizardParticipant({ caracs: { Int: 50, FM: 50 } }); // BI = 5, BFM = 5 -> Max overcast spend = 10 DR
  const spell = {
    name: 'Météore',
    cn: 5,
    wind: 'azyr',
    type: 'winds',
    hasDamage: true,
    hasAoe: true,
    range: 'FM yards',
    duration: 'FM Rounds'
  };

  // Mage a une réserve de 15 DR.
  // Test avec roll 40 sur score 65 -> DR = 2.
  // Total = 2 + 15 = 17 DR. NI = 5.
  // Excédent = 17 - 5 = 12 DR disponibles.
  // Plafond maximum dépensable = BI (5) + BFM (5) = 10 DR.
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 15 });

  // Choix valide : 3 DR sur dégâts (+3 dégâts), 2 DR sur durée (durée ×2), 5 DR sur portée (portée ×3)
  // Total dépensé = 3 + 2 + 5 = 10 DR (exactement le plafond maximum !)
  const preview = previewCasting(withReserve, spell, {
    roll: 40,
    overcastChoices: {
      damage: 3,
      duration: 2,
      range: 5
    }
  });

  assert.equal(preview.spellSuccess, true);
  assert.equal(preview.totalCastingSl, 17);
  assert.equal(preview.surplus, 12);
  assert.equal(preview.availableOvercastSl, 12);
  assert.equal(preview.maxOvercastSpend, 10);
  assert.equal(preview.overcast.valid, true);
  assert.equal(preview.overcast.totalSpent, 10);
  assert.equal(preview.overcast.remainingSL, 2); // 12 - 10 = 2 DR non dépensés
  assert.equal(preview.overcast.benefits.damage.benefit, '+3 dégâts');
  assert.equal(preview.overcast.benefits.duration.benefit, 'durée ×2');
  assert.equal(preview.overcast.benefits.range.benefit, 'portée ×3');

  // Choix invalide : tentative de dépenser 13 DR alors que le plafond est 10 DR
  const previewExcess = previewCasting(withReserve, spell, {
    roll: 40,
    overcastChoices: {
      damage: 13
    }
  });
  assert.equal(previewExcess.overcast.valid, false);
  assert.match(previewExcess.overcast.errors[0], /supérieure au maximum autorisé/);
});

test('Surpuissance V5 — interdictions strictes : sorts mineurs, grimoires, Vous/Contact, Instantanée, sans zone/dégâts', () => {
  const wizard = createWizardParticipant();

  // 1. Sort mineur
  const petty = { name: 'Étincelle', cn: 0, isPetty: true, type: 'petty' };
  const checkPetty = validateOvercastChoices({ damage: 1 }, { availableSL: 5, maxSpend: 10, spell: petty });
  assert.equal(checkPetty.valid, false);
  assert.match(checkPetty.errors[0], /surpuissance est interdite/);

  // 2. Grimoire non mémorisé
  const grimoire = { name: 'Rituel Ancien', cn: 5, isGrimoire: true };
  const checkGrimoire = validateOvercastChoices({ damage: 1 }, { availableSL: 5, maxSpend: 10, spell: grimoire });
  assert.equal(checkGrimoire.valid, false);
  assert.match(checkGrimoire.errors[0], /surpuissance est interdite/);

  // 3. Portée Vous ou Contact
  const touchSpell = { name: 'Armure de Foi', cn: 3, range: 'Contact', duration: '1 Round' };
  const checkTouch = validateOvercastChoices({ range: 1 }, { availableSL: 5, maxSpend: 10, spell: touchSpell });
  assert.equal(checkTouch.valid, false);
  assert.match(checkTouch.errors[0], /portée Vous ou Contact/);

  // 4. Durée Instantanée
  const instantSpell = { name: 'Souffle de Vent', cn: 4, duration: 'Instantanée' };
  const checkInstant = validateOvercastChoices({ duration: 2 }, { availableSL: 5, maxSpend: 10, spell: instantSpell });
  assert.equal(checkInstant.valid, false);
  assert.match(checkInstant.errors[0], /durée Instantanée/);

  // 5. Sort sans zone d'effet
  const singleSpell = { name: 'Trait', cn: 3, target: '1 cible', hasAoe: false };
  const checkAoe = validateOvercastChoices({ aoe: 3 }, { availableSL: 5, maxSpend: 10, spell: singleSpell });
  assert.equal(checkAoe.valid, false);
  assert.match(checkAoe.errors[0], /sans zone d’effet/);

  // 6. Sort sans dégâts
  const utilitySpell = { name: 'Illusion', cn: 4, hasDamage: false };
  const checkDamage = validateOvercastChoices({ damage: 1 }, { availableSL: 5, maxSpend: 10, spell: utilitySpell });
  assert.equal(checkDamage.valid, false);
  assert.match(checkDamage.errors[0], /ne cause pas de dégâts/);
});

// ============================================================================
// 5. INTÉGRATION STORE ET ANNULATION (UNDO) ATOMIQUE
// ============================================================================

test('Store V5 — Focalisation, lancement et annulation (undo) restaurent exactement l’état des réserves', async () => {
  const persistence = memory();
  const store = createStore({ persistence });
  await store.ready;

  // Créer profil et rencontre
  const wizardProfile = {
    id: 'prof-wizard',
    name: 'Teclis Test',
    hp: 15,
    maxHp: 15,
    initiative: 45,
    caracs: { Int: 60, FM: 55, E: 40 },
    skills: [
      { name: 'Focalisation', total: 65, advances: 10 },
      { name: 'Langue (Magick)', total: 70, advances: 10 }
    ],
    armor: { head: 0, body: 0, arms: 0, legs: 0 }
  };
  await store.addProfile(wizardProfile);
  await store.saveEncounter({
    id: 'enc-magic',
    title: 'Combat Magique',
    entries: [{ id: 'enc:entry', profileId: 'prof-wizard', quantity: 1, zone: 'active' }]
  });
  await store.launchEncounter('enc-magic');
  const engine = createCombatEngine(store);
  await engine.start();

  const [wizard] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizard), { type: null, sl: 0 });

  // 1. Exécuter une Focalisation via Store :
  // Jet 40 sur score 65 -> DR = 6 - 4 = +2. BFM = 5. Gain = 2 + 5 = 7 DR.
  const previewChann = store.previewChannelling({ actorId: wizard.id, roll: 40 });
  assert.equal(previewChann.gain, 7);

  // L'aperçu ne doit pas avoir modifié le participant dans le store
  const [wizardBeforeApply] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardBeforeApply), { type: null, sl: 0 });

  // Application
  await store.applyChannelling(previewChann, { actorId: wizard.id });
  const [wizardAfterChann] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardAfterChann), { type: 'winds', sl: 7 });

  // 2. Annulation (undo) : la réserve revient à 0 !
  assert.ok(store.canUndo());
  await store.undo();
  const [wizardAfterUndo] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardAfterUndo), { type: null, sl: 0 });

  // 3. Rétablir (redo) : la réserve de 7 DR revient !
  assert.ok(store.canRedo());
  await store.redo();
  const [wizardAfterRedo] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardAfterRedo), { type: 'winds', sl: 7 });

  // 4. Lancement de sort via Store consommant la réserve :
  // NI = 6. Test roll 50 sur score 70 -> DR = 7 - 5 = +2.
  // Total = 2 + 7 = 9 >= 6 -> Succès. Réserve consommée (repart à 0).
  const spell = { name: 'Éclair Mystique', cn: 6, wind: 'azyr', type: 'winds' };
  const previewCast = store.previewCasting(spell, { actorId: wizard.id, roll: 50 });
  assert.equal(previewCast.spellSuccess, true);
  assert.equal(previewCast.matchingReserve, 7);
  assert.equal(previewCast.totalCastingSl, 9);

  // L'aperçu n'a pas consommé la réserve
  const [wizardBeforeCast] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardBeforeCast), { type: 'winds', sl: 7 });

  // Application
  await store.applyCasting(previewCast, { actorId: wizard.id });
  const [wizardAfterCast] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardAfterCast), { type: null, sl: 0 });

  // 5. Annulation du lancement : la réserve de 7 DR est exactement restaurée !
  await store.undo();
  const [wizardAfterUndoCast] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardAfterUndoCast), { type: 'winds', sl: 7 });
});

// ============================================================================
// 6. CAS LIMITES : INCIDENTS > 100, ATTÉNUATIONS, MISMATCH ET SÉCURITÉ
// ============================================================================

test('Incidents V5 — débordement Mineur > 100 répercuté sur la table Majeure', () => {
  // 1. Débordement modéré vers la table Majeure : initialRoll = 80, modifier = +35 -> modified = 115
  // Overflow = 15. Jet Majeur = 80 + 15 = 95 -> Sort oublié (max 95)
  const miscast1 = lookupMiscast('MINOR', 80, 35, { majorRoll: 80 });
  assert.equal(miscast1.table, 'MAJOR');
  assert.equal(miscast1.overflow, 15);
  assert.equal(miscast1.modifiedRoll, 95);
  assert.equal(miscast1.name, 'Sort oublié');

  // 2. Débordement sévère atteignant 96+ (9007199254740991) :
  // initialRoll = 90, modifier = +40 -> modified = 130 -> overflow = 30 -> majorRoll = 120 -> Contre-réaction aethyrique
  const miscast2 = lookupMiscast('MINOR', 90, 40, { majorRoll: 90 });
  assert.equal(miscast2.table, 'MAJOR');
  assert.equal(miscast2.overflow, 30);
  assert.equal(miscast2.modifiedRoll, 120);
  assert.equal(miscast2.name, 'Contre-réaction aethyrique');
});

test('Lancement V5 — règle de table sans ingrédients, talent acquis et influence corruptrice', () => {
  const wizard = createWizardParticipant();
  const spell = { name: 'Boule de Feu', cn: 5, wind: 'aqshy', type: 'winds' };

  // 1. Ingrédient sur incident Mineur : annule complètement l'incident
  const withIngredient = previewCasting(wizard, spell, {
    roll: 77, // Maladresse
    miscastRoll: 70,
    ingredient: true
  });
  assert.equal(withIngredient.fumble, true);
  assert.equal(withIngredient.miscast.table,'MINOR');
  assert.equal(withIngredient.miscast.name,'Rupture');

  // 2. Influence corruptrice seule : convertit Mineur en Majeur
  const withCorruption = previewCasting(wizard, spell, {
    roll: 77,
    miscastRoll: 25,
    corruptingInfluence: true
  });
  assert.ok(withCorruption.miscast);
  assert.equal(withCorruption.miscast.table, 'MAJOR', 'L’influence corruptrice convertit Mineur en Majeur');
  assert.equal(withCorruption.miscast.name, 'Lévitation');

  // 3. Influence corruptrice + Ingrédient : Majeur rétrogradé en Mineur
  const withBoth = previewCasting(wizard, spell, {
    roll: 77,
    miscastRoll: 25,
    corruptingInfluence: true,
    ingredient: true
  });
  assert.ok(withBoth.miscast);
  assert.equal(withBoth.miscast.table, 'MAJOR', 'L’ancien ingrédient ne protège plus');
  assert.equal(withBoth.miscast.name, 'Lévitation');

  // 4. Diction instinctive : réduit de 20 le jet Mineur
  const withDiction = previewCasting({...wizard,talents:[{id:'talent-instinctive-diction',status:'resolved',rank:1}]}, spell, {
    roll: 33,
    miscastRoll: 35,
    instinctiveDiction: true
  });
  assert.ok(withDiction.miscast);
  assert.equal(withDiction.miscast.modifiedRoll, 15);
  assert.equal(withDiction.miscast.name, 'Distraction');

  // 5. Diction instinctive ramenant le jet sous 01 : annule l'incident
  const withDictionCancel = previewCasting({...wizard,talents:[{id:'talent-instinctive-diction',status:'resolved',rank:1}]}, spell, {
    roll: 33,
    miscastRoll: 15,
    instinctiveDiction: true
  });
  assert.equal(withDictionCancel.miscast, null, 'Un jet Mineur réduit sous 01 par diction instinctive est annulé');
});

test('Lancement V5 — mismatch de réserve : réserve Haute Magie ignorée pour sort des Vents', () => {
  const wizard = createWizardParticipant();
  // Mage a 10 DR en 'high'
  const withHighReserve = setChannellingReserve(wizard, { type: 'high', sl: 10 });
  const windSpell = { name: 'Éclair', cn: 5, wind: 'azyr', type: 'winds' };

  // Roll 45 sur score 65 -> DR = 2.
  // La réserve 'high' ne correspond pas au sort 'winds', matchingReserve = 0 !
  // Total = 2 + 0 = 2 < NI 5 -> sort raté !
  const preview = previewCasting(withHighReserve, windSpell, { roll: 45 });
  assert.equal(preview.matchingReserve, 0, 'La réserve Haute Magie ne s’ajoute pas à un sort des Vents');
  assert.equal(preview.totalCastingSl, 2);
  assert.equal(preview.spellSuccess, false);
  assert.equal(preview.reserveConsumed, 10, 'Toute tentative consomme la réserve existante');

  // Application : la réserve est vidée
  const after = applyCasting(withHighReserve, preview).participant;
  assert.deepEqual(getChannellingReserve(after), { type: null, sl: 0 });
});

test('Lancement V5 — lancement direct sans focalisation préalable (réserve 0)', () => {
  const wizard = createWizardParticipant(); // réserve 0
  const spell = { name: 'Petite Brise', cn: 2, wind: 'chamon', type: 'winds' };

  // Roll 40 sur score 65 -> DR = 6 - 4 = 2.
  // Total = 2 + 0 = 2 >= 2 -> succès direct !
  const preview = previewCasting(wizard, spell, { roll: 40 });
  assert.equal(preview.matchingReserve, 0);
  assert.equal(preview.totalCastingSl, 2);
  assert.equal(preview.spellSuccess, true);
  assert.equal(preview.surplus, 0);
  assert.equal(preview.reserveConsumed, 0);

  const after = applyCasting(wizard, preview).participant;
  assert.deepEqual(getChannellingReserve(after), { type: null, sl: 0 });
});

test('Surpuissance V5 — interdiction stricte avec memorized: false', () => {
  const spell = { name: 'Rituel Interdit', cn: 4, memorized: false };
  assert.equal(isOvercastAllowed(spell), false);
  const result = validateOvercastChoices({ damage: 1 }, { availableSL: 5, maxSpend: 10, spell });
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /surpuissance est interdite/);
});

test('Intégrité — prévisualisations sans jet retournent ready: false et les applications échouent', () => {
  const wizard = createWizardParticipant();
  const spell = { name: 'Sort Test', cn: 3, wind: 'aqshy', type: 'winds' };

  const channUnready = previewChannelling(wizard);
  assert.equal(channUnready.ready, false);
  assert.throws(() => applyChannelling(wizard, channUnready), /incomplet ou non prêt/);

  const castUnready = previewCasting(wizard, spell);
  assert.equal(castUnready.ready, false);
  assert.throws(() => applyCasting(wizard, castUnready), /incomplet ou non prêt/);
});
});

describe('Branchement du lancement de sort', () => {
// H-06 (V5 pp. 122/236, D-07) et H-05 (HEPG p. 83, D-06) : raccordements du lancement de sort.
const talent = (id, rank = 1) => ({ id: 'talent-' + id, status: 'resolved', rank });
const person = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'mage' ? 'pj' : 'ennemi', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  talents: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id,
    order: people.map(p => p.id), participants: people }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const find = (store, id) => store.listParticipants().find(p => p.id === id);

test('H-06 — Puissance totale : Résistance à la Magie ne fait plus échouer la cible sous le NI, −3 DR aux effets', async () => {
  const mage = person('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 0 } } } });
  const store = await combat(mage, person('resistant', { talents: [talent('magic-resistance')] }), person('plain'));
  const input = { actorId: 'mage', targetIds: ['resistant', 'plain'], roll: 11, criticalChoice: 'total-power', miscastRoll: 70, overcastChoices: { targets: 1 }, attributeActive: false };
  const p = store.previewSpellExecution('Carreau', input);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.castingPreview.critical, true); assert.equal(p.castingPreview.totalCastingSl, 5);
  const [resistant, plain] = p.targetResults;
  assert.equal(resistant.resisted, undefined, 'la cible résistante n’est pas annulée');
  assert.equal(resistant.magicResistance, 3);
  assert.ok(resistant.actions.some(a => a.kind !== 'resisted'));
  assert.equal(plain.magicResistance, 0);
  assert.notEqual(plain.resisted, true);
  await store.applySpellExecution('Carreau', input);
  assert.ok(find(store, 'resistant').hp < 30);
});

test('H-06 — hors Puissance totale, le NI non atteint annule toujours la cible résistante', async () => {
  const mage = person('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 4 } } } });
  const store = await combat(mage, person('resistant', { talents: [talent('magic-resistance')] }));
  const p = store.previewSpellExecution('Carreau', { actorId: 'mage', targetIds: ['resistant'], roll: 49, attributeActive: false });
  assert.equal(p.ready, true, p.error);
  assert.equal(p.targetResults[0].resisted, true);
});
});

describe('Sorts et tour V5', () => {
/**
 * S-01 / T-01 — la fin de tour réelle (createCombatEngine(store).nextTurn(), chemin de main.js advanceTurn)
 * traite les effets magiques dans la même commande end-turn-v5.
 */

const memory = () => { let state; return { load: async () => state && structuredClone(state), saveAtomic: async ({ state: next }) => { state = structuredClone(next); return { ok: true }; } }; };

async function encounterStore() {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  await store.addProfile({ id: 'turn-mage', name: 'Astromancien', hp: 12, maxHp: 12, initiative: 60, caracs: { CC: 40, E: 30, FM: 50, Int: 50 }, armor: { head: 0, body: 0, arms: 0, legs: 0 } });
  await store.addProfile({ id: 'turn-foe', name: 'Adversaire', hp: 12, maxHp: 12, initiative: 30, caracs: { CC: 40, E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 } });
  await store.saveEncounter({ id: 'turn-enc', title: 'Fin de tour magique', entries: [
    { id: 'turn-enc:mage', profileId: 'turn-mage', quantity: 1, zone: 'active' },
    { id: 'turn-enc:foe', profileId: 'turn-foe', quantity: 1, zone: 'active' }
  ] });
  await store.launchEncounter('turn-enc');
  const engine = createCombatEngine(store); await engine.start();
  return { store, engine };
}

const subject = (store, id) => store.listParticipants().find(p => p.id === id);

test('S-01 — Tour suivant (moteur réel) : buff « 1 Round » et Chance des Cieux expirent, Undo restaure', async () => {
  const { store, engine } = await encounterStore();
  const mage = store.listParticipants().find(p => p.profileId === 'turn-mage');
  assert.equal(store.getCombat().currentActorId, mage.id);
  assert.equal(store.getCombat().round, 1);

  await store.applySpellEffects(mage.id, { id: 'turn-buff', spellId: 'turn-buff', spellName: 'Buff d’un Round', casterId: mage.id, statModifiers: { CC: 10 }, durationRounds: 1 });
  const heavens = previewLoreAttribute({ lore: 'heavens', caster: subject(store, mage.id) });
  await store.applyLoreAttribute(heavens, { casterId: mage.id, targetIds: [] });
  const buffed = subject(store, mage.id);
  assert.equal(buffed.caracs.CC, 50);
  assert.equal(store.getFortune(mage.id).temporary, 1);
  assert.equal(buffed.extensions.v5.spellEffects.length, 2);

  // Tour de l'adversaire, Round 1 : rien n'expire encore.
  assert.equal((await engine.nextTurn()).status, 'applied');
  assert.equal(subject(store, mage.id).extensions.v5.spellEffects.length, 2);
  assert.equal(subject(store, mage.id).caracs.CC, 50);

  // Retour au mage, Round 2 : la Chance des Cieux expire (début du Tour), le buff d'un Round dure jusqu'à la fin du Tour du mage (D-12).
  assert.equal((await engine.nextTurn()).status, 'applied');
  assert.equal(store.getCombat().round, 2);
  const midway = subject(store, mage.id);
  assert.equal(midway.extensions.v5.spellEffects.length, 1);
  assert.equal(midway.caracs.CC, 50);
  assert.equal(store.getFortune(mage.id).temporary, 0, 'Chance temporaire des Cieux retirée');

  // Fin du Tour du mage au Round 2 : le buff expire.
  assert.equal((await engine.nextTurn()).status, 'applied');
  const expired = subject(store, mage.id);
  assert.equal(expired.extensions.v5.spellEffects.length, 0);
  assert.equal(expired.caracs.CC, 40);

  // Chaque fin de Tour est une commande : un Undo restaure le Tour et les effets.
  await store.undo();
  assert.equal(subject(store, mage.id).extensions.v5.spellEffects.length, 1);
  assert.equal(subject(store, mage.id).caracs.CC, 50);
  await store.undo();
  assert.equal(store.getCombat().round, 1);
  const restored = subject(store, mage.id);
  assert.equal(restored.extensions.v5.spellEffects.length, 2);
  assert.equal(restored.caracs.CC, 50);
  assert.equal(store.getFortune(mage.id).temporary, 1);
});

test('S-01 — l’aperçu de fin de tour reste pur et n’expire pas deux fois', async () => {
  const { store, engine } = await encounterStore();
  const mage = store.listParticipants().find(p => p.profileId === 'turn-mage');
  await store.applySpellEffects(mage.id, { id: 'turn-buff', spellId: 'turn-buff', spellName: 'Buff d’un Round', casterId: mage.id, statModifiers: { CC: 10 }, durationRounds: 1 });
  await engine.nextTurn(); await engine.nextTurn();
  const before = JSON.parse(store.getFullJSON()).combat, revision = store.getLocalRevision();
  const preview = engine.previewNextTurn();
  assert.equal(preview.ready, true);
  assert.equal(preview.state.combat.participants.find(p => p.id === mage.id).caracs.CC, 40);
  assert.deepEqual(JSON.parse(store.getFullJSON()).combat, before, 'L’aperçu ne modifie pas le Store');
  assert.equal(store.getLocalRevision(), revision);
  await engine.nextTurn();
  assert.equal(subject(store, mage.id).caracs.CC, 40, 'Caractéristique restaurée une seule fois');
});

// D-12 — un effet en Rounds expire à la fin du Tour de son auteur, pas au premier changement de Tour du Round d'échéance.
async function d12Store(mageInitiative, foeInitiative) {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  const base = { hp: 12, maxHp: 12, caracs: { CC: 40, E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 } };
  await store.addProfile({ id: 'd12-mage', name: 'Mage', initiative: mageInitiative, ...base });
  await store.addProfile({ id: 'd12-foe', name: 'Adversaire', initiative: foeInitiative, ...base });
  await store.saveEncounter({ id: 'd12-enc', title: 'D-12', entries: [
    { id: 'd12-enc:mage', profileId: 'd12-mage', quantity: 1, zone: 'active' },
    { id: 'd12-enc:foe', profileId: 'd12-foe', quantity: 1, zone: 'active' }
  ] });
  await store.launchEncounter('d12-enc');
  const engine = createCombatEngine(store); await engine.start();
  const mage = store.listParticipants().find(p => p.profileId === 'd12-mage');
  const foe = store.listParticipants().find(p => p.profileId === 'd12-foe');
  return { store, engine, mage, foe };
}
const buffCount = (store, id) => subject(store, id).extensions.v5.spellEffects.length;
const buff = (mage, durationRounds) => ({ id: 'd12-buff', spellId: 'd12-buff', spellName: 'Buff', casterId: mage.id, statModifiers: { CC: 10 }, durationRounds });

test('D-12 — auteur pas en premier : l’effet survit au Tour adverse du Round d’échéance et expire à la fin du Tour du mage', async () => {
  const { store, engine, mage, foe } = await d12Store(20, 60);
  assert.equal(store.getCombat().currentActorId, foe.id);
  await engine.nextTurn();                       // R1 : le mage joue
  assert.equal(store.getCombat().currentActorId, mage.id);
  await store.applySpellEffects(mage.id, buff(mage, 1)); // échéance : R2
  await engine.nextTurn();                       // fin du Tour du mage R1 -> R2, adversaire
  assert.equal(store.getCombat().round, 2);
  assert.equal(buffCount(store, mage.id), 1, 'Le Tour adverse du R2 n’expire pas l’effet');
  await engine.nextTurn();                       // R2 : le mage joue
  assert.equal(buffCount(store, mage.id), 1, 'Début du Tour du mage : pas encore');
  await engine.nextTurn();                       // fin du Tour du mage R2
  assert.equal(buffCount(store, mage.id), 0);
  assert.equal(subject(store, mage.id).caracs.CC, 40);
  await store.undo();
  assert.equal(buffCount(store, mage.id), 1, 'Undo restaure l’effet');
});

test('D-12 — auteur en premier : expiration à la fin de son Tour au Round d’échéance', async () => {
  const { store, engine, mage } = await d12Store(60, 20);
  await store.applySpellEffects(mage.id, buff(mage, 1)); // échéance : R2
  await engine.nextTurn();                       // adversaire R1
  await engine.nextTurn();                       // mage R2
  assert.equal(store.getCombat().round, 2);
  assert.equal(buffCount(store, mage.id), 1);
  await engine.nextTurn();
  assert.equal(buffCount(store, mage.id), 0);
});

test('D-12 — effet de 2 Rounds : expire à la fin du Tour du mage au Round 3', async () => {
  const { store, engine, mage } = await d12Store(60, 20);
  await store.applySpellEffects(mage.id, buff(mage, 2)); // échéance : R3
  for (let i = 0; i < 4; i += 1) await engine.nextTurn(); // fins de Tour : mage R1, foe R1, mage R2, foe R2
  assert.equal(store.getCombat().round, 3);
  assert.equal(buffCount(store, mage.id), 1);
  await engine.nextTurn();                       // fin du Tour du mage R3
  assert.equal(buffCount(store, mage.id), 0);
});

test('D-12 — effet posé sur un autre porteur : suit le Tour de l’auteur, pas celui du porteur', async () => {
  const { store, engine, mage, foe } = await d12Store(60, 20);
  await store.applySpellEffects(foe.id, buff(mage, 1)); // auteur = mage, porteur = adversaire, échéance R2
  await engine.nextTurn(); await engine.nextTurn();     // mage R2
  assert.equal(buffCount(store, foe.id), 1);
  await engine.nextTurn();                              // fin du Tour du mage R2
  assert.equal(buffCount(store, foe.id), 0);
});

test('D-12 — auteur retiré du combat ou sans auteur : retombée sur l’échéance de Round', async () => {
  const { store, engine, mage, foe } = await d12Store(60, 20);
  await store.applySpellEffects(foe.id, { ...buff(mage, 1), id: 'orphan', casterId: 'disparu' });
  await store.applySpellEffects(foe.id, { ...buff(mage, 1), id: 'anonymous', casterId: undefined });
  await engine.nextTurn();                       // adversaire R1
  assert.equal(buffCount(store, foe.id), 2);
  await engine.nextTurn();                       // R2 commence : échéance atteinte
  assert.equal(buffCount(store, foe.id), 0);
});

test('S-03 — bouclier utilisé : disponible de nouveau au début du Tour de son porteur (end-turn-v5)', async () => {
  const { store, engine, mage, foe } = await d12Store(60, 20);
  const state = JSON.parse(store.getFullJSON());
  const target = state.combat.participants.find(p => p.id === foe.id);
  target.extensions = { ...(target.extensions || {}), shieldUnavailable: ['sh'], shieldUnavailableCause: { sh: { round: 1 } } };
  await store.loadFromJSON(JSON.stringify(state));
  assert.deepEqual(subject(store, foe.id).extensions.shieldUnavailable, ['sh']);
  await engine.nextTurn();                       // fin du Tour du mage -> début du Tour de l'adversaire
  assert.equal(store.getCombat().currentActorId, foe.id);
  assert.equal(subject(store, foe.id).extensions.shieldUnavailable, undefined);
});
});

describe('v3-C — talents, magie et créatures du livre de base', () => {
// Lot v3-C : talents, magie et créatures du livre de base V5 EN v3.

test('v3 Souffle (p.243) : le lanceur est immunisé à son propre Souffle, il ne peut pas être touché', () => {
  const contract = getSpellContract('Souffle');
  const caster = { id: 'mage', camp: 'pj' }, foe = { id: 'foe', camp: 'ennemi' };
  assert.equal(validateSpellTargets(contract, caster, [foe]).valid, true);
  const own = validateSpellTargets(contract, caster, [caster]);
  assert.equal(own.valid, false);
  assert.equal(own.status, 'invalid-target-admissibility');
});

test('v3 Souffle : le lanceur parmi les voisins de la zone est ignoré, seul il est refusé', async () => {
  const { previewSpellExecution } = await import('../../../js/core/v5-spell-contracts.js');
  const person = (id, camp) => ({ id, name: id, camp, hp: 20, maxHp: 20, zone: 'active', caracs: { FM: 50, Int: 50, E: 30, F: 30 }, skills: [{ name: 'Focalisation', total: 60 }, { name: 'Langue (Magick)', total: 60 }], states: [], equipment: [], talents: [], extensions: { v5: {} } });
  const mage = person('mage', 'pj'), foe = person('foe', 'ennemi');
  assert.equal(previewSpellExecution(mage, 'Souffle', [foe, mage], {}).status, previewSpellExecution(mage, 'Souffle', [foe], {}).status, 'même résultat avec ou sans le lanceur dans la zone');
  assert.equal(previewSpellExecution(mage, 'Souffle', [mage], {}).status, 'invalid-target-admissibility');
});

test('v3 Diction instinctive et Harmonie aethyrique (p.121, p.114) : refusées après un Test raté, appliquées après une réussite', async () => {
  const { resolveMiscast } = await import('../../../js/core/v5-magic-miscasts.js');
  const failed = resolveMiscast({ severity: 'MINOR', roll: 15, instinctiveDiction: true, attunementRank: 1, testSucceeded: false });
  assert.equal(failed.cancelled, false, 'le jet 15 n’est pas réduit de 20 après un Test raté');
  assert.equal(failed.modifier, 0);
  assert.notEqual(failed.choicesRequired, 'attunement', 'pas de second jet après un Test raté');
  const succeeded = resolveMiscast({ severity: 'MINOR', roll: 15, instinctiveDiction: true, testSucceeded: true });
  assert.equal(succeeded.cancelled, true, 'après une réussite, 15 − 20 ≤ 0 : aucun incident');
  const attuned = resolveMiscast({ severity: 'MINOR', roll: 15, attunementRank: 1, testSucceeded: true });
  assert.equal(attuned.choicesRequired, 'attunement', 'après une réussite, second jet demandé');
});

test('v3 Diction instinctive : l’incident d’une maladresse de lancement n’est pas réduit, celui d’un critique réussi l’est', async () => {
  const { previewCasting } = await import('../../../js/core/v5-magic-casting.js');
  const { previewChannelling } = await import('../../../js/core/v5-magic-channelling.js');
  const talent = id => ({ id: 'talent-' + id, status: 'resolved', rank: 1 });
  const mage = { id: 'm', name: 'm', caracs: { Int: 50, FM: 50, I: 40, Ag: 40 }, skills: [{ name: 'Langue (Magick)', total: 30 }, { name: 'Focalisation', total: 30 }],
    talents: [talent('instinctive-diction')], states: [], extensions: { v5: { channelling: { type: 'winds', sl: 2 } } } };
  const spell = getSpellContract('Carreau');
  const fumble = previewCasting(mage, spell, { roll: 99, miscastRoll: 15, instinctiveDiction: true });
  assert.equal(fumble.miscast?.cancelled ?? false, false, 'maladresse (Test raté) : jet 15 conservé');
  assert.equal(fumble.miscast?.modifier, 0);
  const critical = previewCasting({ ...mage, skills: [{ name: 'Langue (Magick)', total: 80 }] }, spell, { roll: 11, miscastRoll: 15, instinctiveDiction: true });
  assert.equal(critical.miscast, null, 'critique réussi : 15 − 20 ≤ 0, aucun incident');
  const loss = previewChannelling(mage, { type: 'winds', roll: 99, lossRoll: 1, miscastRoll: 15, instinctiveDiction: true });
  assert.equal(loss.miscast?.modifier, 10, 'Focalisation ratée : seul le +10 par DR perdu s’applique, pas −20');
});

test('v3 Pause de Focalisation (p.236) : Test de Focalisation Accessible (+2 DR), plus de Résistance', async () => {
  const { previewChannellingPause } = await import('../../../js/core/v5-magic-channelling.js');
  const mage = { id: 'm', name: 'm', caracs: { Int: 54, FM: 52, E: 38 }, equipment: [], states: [],
    skills: [{ name: 'Focalisation', total: 70 }, { name: 'Focalisation (Haute Magie)', total: 30 }, { name: 'Résistance', total: 30 }],
    extensions: { v5: { channelling: { type: 'winds', sl: 6 } } } };
  const winds = previewChannellingPause(mage, { roll: 60 });
  assert.equal(winds.score, 70, 'la Focalisation remplace la Résistance');
  assert.equal(winds.success, true);
  assert.equal(winds.test.sl, 3, 'Accessible : +2 DR sur 7 − 6 = 1');
  const high = previewChannellingPause({ ...mage, extensions: { v5: { channelling: { type: 'high', sl: 6 } } } }, { roll: 60 });
  assert.equal(high.score, 30, 'réserve de Haute Magie : Focalisation (Haute Magie)');
  assert.equal(high.success, false);
  const sea = previewChannellingPause({ ...mage, profileId: 'E0-P-909', skills: [], caracs: { F: 60, FM: 10 } }, { roll: 99 });
  assert.equal(sea.ready, true);
  assert.equal(sea.score, 70, 'élémentaire de mer : sans compétence imprimée, Force + 10 (comme la Focalisation)');
});

test('v3 Pause de Focalisation : mêmes modificateurs que la Focalisation (armure, Lileath, avantage fourni, restrictions magiques)', async () => {
  const { previewChannellingPause, previewChannelling } = await import('../../../js/core/v5-magic-channelling.js');
  const mage = { id: 'm', name: 'm', caracs: { Int: 54, FM: 52, E: 38 }, equipment: [], states: [], wornArmorLocations: { body: 3 },
    skills: [{ name: 'Focalisation', total: 70 }, { name: 'Focalisation (Haute Magie)', total: 70 }],
    extensions: { v5: { channelling: { type: 'winds', sl: 6 } } } };
  const pause = previewChannellingPause(mage, { roll: 60 });
  assert.equal(pause.armorPenalty, -3);
  assert.equal(pause.test.sl, 0, 'Accessible +2 DR, armure −3 DR sur 7 − 6 = 1');
  assert.deepEqual(pause.slModifiers.map(row => row.id), ['armor', 'pause-difficulty']);
  assert.equal(previewChannelling(mage, { roll: 60 }).armorPenalty, pause.armorPenalty, 'même pénalité que la Focalisation');
  const lileath = { ...mage, wornArmorLocations: {}, talents: [{ id: 'talent-lileath-s-blessing', status: 'resolved', rank: 2 }], extensions: { v5: { channelling: { type: 'high', sl: 6 } } } };
  const ids = preview => preview.test.details.modifiers.map(row => row.id);
  assert.ok(ids(previewChannelling(lileath, { roll: 60, type: 'high' })).includes('lileath-s-blessing'), 'contrôle : la Focalisation applique Lileath');
  assert.ok(ids(previewChannellingPause(lileath, { roll: 60 })).includes('lileath-s-blessing'), 'la pause aussi');
  const advantaged = previewChannellingPause({ ...mage, wornArmorLocations: {} }, { roll: 60, advantageSources: [{ id: 'place', label: 'Lieu saturé' }] });
  assert.ok(advantaged.test.advantage.advantage.some(row => row.id === 'place'), 'Avantage fourni pris en compte');
  const capricious = previewChannellingPause({ ...mage, wornArmorLocations: {}, extensions: { v5: { channelling: { type: 'winds', sl: 6 }, specialStates: { forceFumbleOnDoubles: true } } } }, { roll: 33 });
  assert.equal(capricious.success, false, 'restriction magique de la Fortune Capricieuse, comme à la Focalisation');
});

test('v3 attribut des Bêtes (p.245) : le lanceur gagne l’Élan, les ennemis vivants perdent le leur (alliés, morts-vivants et Peur exclus)', async () => {
  const { createStore } = await import('../../../js/core/store.js');
  const person = (id, camp, extra = {}) => ({ id, name: id, kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, hp: 20, maxHp: 20, zone: 'active', init: 40, caracs: { CC: 40, F: 30, E: 30, FM: 50, Int: 40, I: 40, Ag: 40 }, skills: [], talents: [], states: [], equipment: [], extensions: { v5: { hasMomentum: true } }, ...extra });
  const store = createStore(); await store.ready;
  const people = [person('mage', 'pj', { extensions: { v5: { hasMomentum: false } } }), person('ally', 'pj'), person('orc', 'ennemi'), person('zombie', 'ennemi', { tags: ['Mort-vivant'] }), person('bench', 'ennemi', { zone: 'bench' }), person('dead', 'ennemi', { extensions: { v5: { hasMomentum: true, dead: true } } })];
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'mage', order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  const preview = store.previewLoreAttribute({ casterId: 'mage', lore: 'beasts', spell: { cn: 6 } });
  await store.applyLoreAttribute(preview, { casterId: 'mage', cn: 6 });
  const has = id => store.listParticipants().find(p => p.id === id).extensions.v5.hasMomentum;
  assert.equal(has('mage'), true, 'le lanceur gagne l’Élan');
  assert.equal(has('orc'), false, 'l’ennemi vivant perd l’Élan');
  assert.equal(has('ally'), true, 'un allié le garde');
  assert.equal(has('bench'), true, 'un ennemi sur le banc le garde');
  assert.equal(has('dead'), true, 'un ennemi mort le garde');
  assert.equal(has('zombie'), true, 'un ennemi non vivant n’est pas touché');
  assert.ok(!(store.listParticipants().find(p => p.id === 'mage').traits || []).includes('Peur (1)'), 'plus de Peur (1)');
});

test('v3 Trait Grim (p.358) : l’attaque gratuite ne fait pas perdre l’Élan mais en exige un ; Trait non retenu refusé', async () => {
  const { createStore } = await import('../../../js/core/store.js');
  const person = (id, extra = {}) => ({ id, name: id, kind: id === 'a' ? 'PJ' : 'PNJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', hp: 40, maxHp: 40, init: 40,
    caracs: { CC: 60, CT: 40, F: 40, E: 40, Ag: 40, I: 40, Int: 40, FM: 40, Dex: 40, Soc: 40, M: 4 }, skills: [], talents: [], states: [], equipment: [], extensions: { v5: { hasMomentum: true } }, ...extra });
  const run = async (traits, momentum) => {
    const store = createStore({ storage: null }); await store.ready;
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'v3c-grim', turnIndex: 1 } },
      combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [person('a', { traits, extensions: { v5: { hasMomentum: momentum } } }), person('b')] } });
    const input = { resolutionId: 'grim-free', actorId: 'a', targetId: 'b', roll: 25, action: { type: 'attack', attr: 'CC', base: 60, damage: 5 },
      defense: { base: 35, roll: 80, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep', extraAttack: true, context: { freeAttackTalent: 'grim' } } };
    return { store, input };
  };
  const withGrim = await run(['Grim'], true);
  const ok = withGrim.store.previewResolution(withGrim.input);
  assert.equal(ok.actionCosts.ready, true);
  assert.equal(ok.actionCosts.paid.length, 0, 'aucun Élan dépensé');
  assert.equal(ok.actionCosts.waived.length, 1);
  const noMomentum = await run(['Grim'], false);
  assert.equal(noMomentum.store.previewResolution(noMomentum.input).actionCosts.ready, false, 'sans Élan, pas d’attaque gratuite');
  const notRetained = await run([], true);
  assert.throws(() => notRetained.store.previewResolution(notRetained.input), /Grim/);
});

test('v3 Trait Grim (p.358) : aucune limite par Tour, plusieurs attaques gratuites tant que la créature a de l’Élan (MJ 31/10)', async () => {
  const { createStore } = await import('../../../js/core/store.js');
  const person = (id, extra = {}) => ({ id, name: id, kind: id === 'a' ? 'PJ' : 'PNJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', hp: 400, maxHp: 400, init: 40,
    caracs: { CC: 60, CT: 40, F: 40, E: 40, Ag: 40, I: 40, Int: 40, FM: 40, Dex: 40, Soc: 40, M: 4 }, skills: [], talents: [], states: [], equipment: [], extensions: { v5: { hasMomentum: true } }, ...extra });
  const store = createStore({ storage: null }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'v3c-grim-n', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [person('a', { traits: ['Grim'] }), person('b')] } });
  const input = id => ({ resolutionId: id, actorId: 'a', targetId: 'b', roll: 25, action: { type: 'attack', attr: 'CC', base: 60, damage: 5 },
    defense: { base: 35, roll: 80, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep', extraAttack: true, context: { freeAttackTalent: 'grim' } } });
  for (const id of ['grim-1', 'grim-2', 'grim-3']) {
    const preview = store.previewResolution(input(id));
    assert.equal(preview.actionCosts.ready, true, id);
    assert.equal((await store.applyResolution(preview)).status, 'applied', id);
  }
});

test('v3 Morsure (p.356) : BF+3 sans valeur imprimée, valeur imprimée gardée (Trait avec valeur, profil V5, attaque déduite du nom)', async () => {
  const { planNaturalAttack } = await import('../../../js/core/creature-combat.js');
  const beast = (traits, extra = {}) => ({ id: 'b', name: 'Bête', caracs: { F: 50, E: 40 }, traits, extensions: { v5: {} }, ...extra });
  assert.equal(planNaturalAttack(beast(['Morsure']), 'bite').damageFormula, '8', 'BF 5 + 3');
  assert.equal(planNaturalAttack(beast(['Bite']), 'bite').damageFormula, '8');
  assert.equal(planNaturalAttack(beast(['Bite (7)']), 'bite').damageFormula, '7', 'valeur imprimée du Trait');
  assert.equal(planNaturalAttack(beast(['Bite']), 'bite', { ordinary: true }).damageFormula, '8');
  const v5Profile = beast(['Bite'], { extensions: { v5: { bestiary: { edition: 'V5' } } } });
  assert.equal(planNaturalAttack(v5Profile, 'bite').damageFormula, 'imprimé', 'profil V5 : valeur imprimée');
  assert.equal(planNaturalAttack(beast([]), 'bite', { ordinary: true }).damageFormula, 'imprimé', 'attaque déduite du nom, sans Trait : valeur imprimée');
  assert.equal(planNaturalAttack(beast(['Bite'], { caracs: {} }), 'bite').available, false, 'Force inconnue : saisie MJ');
});

test('v3 Peur : Taille agressive Peur (2), Effrayé Peur (2), indice non chiffré hors profil V5 = saisie MJ', async () => {
  const { previewGenericFearEncounter } = await import('../../../js/core/v5-talent-psychology.js');
  const { planPsychology } = await import('../../../js/core/creature-psychology.js');
  const mk = (id, camp, traits = []) => ({ id, name: id, camp, hp: 20, traits, states: [], caracs: { F: 40, E: 40, FM: 40 }, extensions: { v5: {} } });
  const size = previewGenericFearEncounter({ author: mk('big', 'ennemi'), target: mk('pj', 'pj'), sourceKind: 'v5-size', actorSize: 5, targetSize: 3, aggressive: true });
  assert.equal(size.addedStates[0].rating, 2);
  const afraid = planPsychology(mk('a', 'pj', ['Afraid (Orcs)']), 'afraid', { source: mk('o', 'ennemi', ['Fear (4)']) });
  assert.equal(afraid.states[0].rating, 2);
  const unrated = previewGenericFearEncounter({ author: mk('x', 'ennemi'), target: mk('pj', 'pj'), sourceKind: 'trait' });
  assert.equal(unrated.ready, false);
  assert.ok(unrated.needsInput.some(row => row.field === 'rating'), 'indice non chiffré : saisie MJ');
});
});
