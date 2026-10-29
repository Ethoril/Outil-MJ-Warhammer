import test from 'node:test';
import {declaredAnswers,declared5BAnswers,fixtureBlade} from './helpers/lot3-declared-answers.js';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { applySpellEffects } from '../js/core/v5-magic-effects.js';
import { previewMagicProtection, attackNature } from '../js/core/v5-magic-combat.js';
import { getSpellContract, getContractChoiceOptions, IMPLEMENTED_SPECIAL_HANDLERS } from '../js/core/v5-spell-contracts.js';

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
import { resolveMagicMissile, resolveSpellDamage } from '../js/core/v5-magic-effects.js';
import { previewLoreAttribute } from '../js/core/v5-magic-attributes.js';
import { previewSpellExecution } from '../js/core/v5-spell-contracts.js';
import { magicWeaponBonus } from '../js/core/v5-magic-combat.js';

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
import { validateOvercastChoices } from '../js/core/v5-magic-casting.js';
import { getAllSpellContracts } from '../js/core/v5-spell-contracts.js';
import { resolveSpecificOvercast, SPECIFIC_OVERCAST_KINDS } from '../js/core/v5-magic-overcast-options.js';

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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { magicSkillModifiers, magicAdverseModifiers } from '../js/core/v5-magic-talents.js';
import { REMINDER_FLAGS, MARKER_ONLY_SPECIAL_STATES, reminderFlagTexts } from '../js/core/v5-magic-reminder-flags.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
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
