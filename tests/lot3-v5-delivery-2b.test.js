/**
 * Livraison 2b du lot 3 : Protection typée et immunités (S-06), destinataire des états et des dégâts (S-07),
 * arbitrages D-13 (la Protection n'annule que les dégâts) et D-14 (Blessures directes d'attribut).
 */
import test from 'node:test';
import {declaredAnswers,declared5BAnswers,declaredFacts,fixtureBlade} from './helpers/lot3-declared-answers.js';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getAllSpellContracts, getContractChoiceOptions, getSpellContract, previewSpellExecution, NEGATIVE_CONDITIONS } from '../js/core/v5-spell-contracts.js';
import { parseSpellDuration } from '../js/core/v5-magic-effects.js';
import { attackNature, matchFilter, previewMagicProtection } from '../js/core/v5-magic-combat.js';

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [], actions:[fixtureBlade],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const cast = (store, name, extra = {}) => store.applySpellExecution(name, { actorId: 'mage', targetIds: ['mage'], roll: 25, ...declaredAnswers(['mage','enemy']), ...extra });
const hasState = (p, key) => (p.states || []).some(s => (s.key || s.name) === key);

/** Attaque d'arme réelle de `enemy` contre `mage` (jet 25 : touche ; jet de localisation inversé du jet). */
const MELEE_DEFENSE = { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } };
const swing = (store, { kind = 'melee', context = {}, qualities = [] } = {}) => store.previewResolution({
  actorId: 'enemy', targetId: 'mage', action: { type: 'attack', attr: kind === 'ranged' ? 'CT' : 'CC', base: 60, damageFormula: 'BF+4', qualities }, roll: 25,
  v5: { kind, choice: 'keep', context }, ...(kind === 'melee' ? { defense: MELEE_DEFENSE } : {})
});
const fighters = () => [wizard('mage'), wizard('enemy', { camp: 'ennemi', caracs: { CC: 40, CT: 40, F: 40, E: 30, Int: 30, FM: 30, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 } })];

test('Filtres : tri-état oui / non / à préciser, sans présumer une étiquette inconnue', () => {
  const dome = { any: ['magical', 'ranged'], all: ['external'] };
  assert.equal(matchFilter(dome, attackNature({ ranged: false })).match, 'no');
  assert.deepEqual(matchFilter(dome, attackNature({ ranged: true })), { match: 'unknown', unknown: ['external'] });
  assert.equal(matchFilter(dome, attackNature({ ranged: true, declared: { external: true } })).match, 'yes');
  assert.equal(matchFilter(dome, attackNature({ ranged: true, declared: { external: false } })).match, 'no');
  assert.equal(matchFilter(null, {}).match, 'yes');
});

test('Égide d’Aqshy : l’épée passe, le feu magique est bloqué, le feu non magique est sans effet', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Égide d’Aqshy');
  const v5 = person(store, 'mage').extensions.v5;
  assert.deepEqual(v5.wards.map(w => [w.threshold, w.filter]), [[7, { all: ['magical', 'fire'] }]]);
  const sword = swing(store);
  assert.ok(sword.damage.finalDamage > 0, 'une épée n’est pas bloquée par l’Égide');
  const struck = swing(store);
  await store.applyResolution(struck);
  assert.equal(person(store, 'mage').hp, 30 - struck.damage.finalDamage, 'les Blessures de l’épée sont bien retirées');
  assert.ok(!sword.unresolved.some(text => /d10|Protection/.test(text)), sword.unresolved.join(' | '));
  const torch = swing(store, { context: { attackNature: { fire: true } } });
  assert.equal(torch.damage.finalDamage, 0, 'feu non magique : immunité');
  assert.equal(torch.damage.magicProtection.immune, true);
  const magicFire = previewMagicProtection(person(store, 'mage'), 5, { nature: attackNature({ magical: true, fire: true }) });
  assert.equal(magicFire.ready, false);
  assert.match(magicFire.error, /d10/);
  assert.equal(previewMagicProtection(person(store, 'mage'), 5, { nature: attackNature({ magical: true, fire: true }), wardRoll: 7 }).amount, 0);
  assert.equal(previewMagicProtection(person(store, 'mage'), 5, { nature: attackNature({ magical: true, fire: false }) }).amount, 5, 'sort non feu : pas de Protection');
});

test('Égide d’Aqshy : les États Enflammé reçus sont ignorés', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Égide d’Aqshy');
  await store.applySpellEffects('mage', { spellId: 'brasier', duration: '2 Rounds', conditions: ['Enflammé'] });
  assert.ok(!hasState(person(store, 'mage'), 'enflamme'));
  await store.applySpellEffects('mage', { spellId: 'poison', duration: '2 Rounds', conditions: ['Sonné'] });
  assert.ok(hasState(person(store, 'mage'), 'sonne'), 'seul Enflammé est ignoré');
});

test('Dôme : seules les attaques magiques ou à distance venant de l’extérieur sont éprouvées', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Dôme');
  assert.deepEqual(person(store, 'mage').extensions.v5.wards[0].filter, { any: ['magical', 'ranged'], all: ['external'] });
  const sword = swing(store);
  assert.ok(sword.damage.finalDamage > 0);
  assert.ok(!sword.unresolved.some(text => /Protection|d10/.test(text)));
  const arrowUnknown = swing(store, { kind: 'ranged' });
  assert.ok(arrowUnknown.unresolved.some(text => /origine extérieure à la zone/.test(text)), arrowUnknown.unresolved.join(' | '));
  const inside = swing(store, { kind: 'ranged', context: { attackNature: { external: false } } });
  assert.ok(inside.damage.finalDamage > 0 && !inside.unresolved.some(text => /Protection/.test(text)));
  const outside = swing(store, { kind: 'ranged', context: { attackNature: { external: true } } });
  assert.ok(outside.unresolved.some(text => /d10/.test(text)));
  const blocked = swing(store, { kind: 'ranged', context: { attackNature: { external: true }, magicWardRoll: 6 } });
  assert.equal(blocked.damage.finalDamage, 0);
  const passed = swing(store, { kind: 'ranged', context: { attackNature: { external: true }, magicWardRoll: 5 } });
  assert.ok(passed.damage.finalDamage > 0);
});

test('Bouclier anti-flèches : détruit seulement les projectiles organiques entrant, sans jet ; l’épée passe', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Bouclier anti-flèches');
  const mage = person(store, 'mage');
  assert.deepEqual(mage.extensions.v5.wards.map(w => [w.threshold, w.filter]), [[1, { all: ['ranged', 'organicProjectile', 'external'] }]]);
  assert.equal(mage.extensions.v5.rangedOpponentPenaltySl, undefined, 'aucun malus aux tirs hors du texte');
  assert.ok(swing(store).damage.finalDamage > 0, 'épée');
  const wooden = swing(store, { kind: 'ranged', context: { attackNature: { organicProjectile: true, external: true } } });
  assert.equal(wooden.damage.finalDamage, 0);
  assert.equal(wooden.damage.magicProtection.automatic, true);
  const shot = swing(store, { kind: 'ranged', context: { attackNature: { organicProjectile: false } } });
  assert.ok(shot.damage.finalDamage > 0, 'balle ou couteau de lancer : inorganique');
  const unknown = swing(store, { kind: 'ranged' });
  assert.ok(unknown.unresolved.some(text => /projectile organique/.test(text)));
});

test('Protection générale et Bouclier de Saphery : sans filtre, ils éprouvent toutes les attaques', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Protection');
  assert.equal(person(store, 'mage').extensions.v5.wards[0].filter, null);
  assert.ok(swing(store).unresolved.some(text => /d10/.test(text)));
  assert.equal(getSpellContract('Bouclier de Saphery').effects.wardFilter, undefined);
  assert.equal(getSpellContract('Bouclier magique').effects.ward, undefined, 'Bouclier magique : +BFM en dissipation seulement');
});

test('Bouclier céruléen : +3 PA contre les armes en métal seulement, rappel de renvoi', async () => {
  const store = await combat(...fighters());
  const before = swing(store, { context: { attackNature: { metal: false } } }).damage.finalDamage;
  await cast(store, 'Bouclier céruléen');
  assert.equal(person(store, 'mage').extensions.v5.wards, undefined, 'plus de Protection 7+ générale');
  const unknown = swing(store);
  assert.ok(unknown.protection.manual.some(text => /arme en métal/.test(text)), unknown.protection.manual.join(' | '));
  const wood = swing(store, { context: { attackNature: { metal: false } } });
  assert.equal(wood.damage.finalDamage, before);
  const steel = swing(store, { context: { attackNature: { metal: true } } });
  assert.equal(steel.damage.finalDamage, Math.max(0, before - 3));
  assert.ok(steel.reminders.some(text => /6 Dégâts au bras/.test(text)));
  assert.ok(!wood.reminders.some(text => /6 Dégâts au bras/.test(text)));
});

test('Capuche Vengeresse et Chute des feuilles : réductions typées, Test de Calme demandé', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Capuche Vengeresse');
  const hood = person(store, 'mage').extensions.v5.damageReductions[0];
  assert.deepEqual([hood.amount, hood.filter, hood.calmTest], [4, { not: ['magical'] }, true]);
  const base = swing(store, { context: { reductionCalm: { success: false, sl: 0 } } }).damage.finalDamage;
  assert.ok(swing(store).unresolved.some(text => /Test de Calme/.test(text)));
  assert.equal(swing(store, { context: { reductionCalm: { success: true, sl: 2 } } }).damage.finalDamage, Math.max(0, base - 6));
  assert.equal(swing(store, { context: { reductionCalm: { success: true, sl: 2 }, attackNature: { magical: true } } }).damage.finalDamage, base, 'attaque magique : pas de réduction');

  const leaves = await combat(...fighters());
  await cast(leaves, 'Chute des feuilles');
  const layer = person(leaves, 'mage').extensions.v5.damageReductions[0];
  assert.deepEqual([layer.amount, layer.filter, layer.calmTest], [3, { any: ['blunt', 'fall', 'crush'] }, undefined]);
  const unknown = swing(leaves);
  assert.ok(unknown.unresolved.some(text => /arme contondante/.test(text)), unknown.unresolved.join(' | '));
  const blade = swing(leaves, { context: { attackNature: { blunt: false } } }).damage.finalDamage;
  assert.equal(swing(leaves, { context: { attackNature: { blunt: true } } }).damage.finalDamage, Math.max(0, blade - 3));
});

test('D-13 : une Protection réussie n’annule que les dégâts, les États du sort s’appliquent', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await store.applySpellEffects('enemy', { spellId: 'ward', duration: '3 Rounds', ward: 7 });
  const input = { actorId: 'mage', targetIds: ['enemy'], roll: 25, targetTests: { enemy: { wardRoll: 9 } }, attributeActive: false };
  const preview = store.previewSpellExecution('Grands Feux d’U’Zhul', input);
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.targetResults[0].magicProtection.wardSaved, true);
  assert.equal(preview.targetResults[0].woundsLost, 0);
  await store.applySpellExecution('Grands Feux d’U’Zhul', input);
  assert.equal(person(store, 'enemy').hp, 30);
  assert.ok(hasState(person(store, 'enemy'), 'enflamme'), 'l’état Enflammé du sort s’applique malgré la Protection');
});

test('Sort de feu contre l’Égide : le jet de Protection est demandé, le sort non feu passe', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await store.applySpellExecution('Égide d’Aqshy', { actorId: 'enemy', targetIds: ['enemy'], roll: 25 });
  const fire = store.previewSpellExecution('Grands Feux d’U’Zhul', { actorId: 'mage', targetIds: ['enemy'], roll: 25, attributeActive: false });
  assert.equal(fire.ready, false);
  assert.match(fire.error, /d10/);
  const saved = store.previewSpellExecution('Grands Feux d’U’Zhul', { actorId: 'mage', targetIds: ['enemy'], roll: 25, attributeActive: false, targetTests: { enemy: { wardRoll: 7 } } });
  assert.equal(saved.targetResults[0].woundsLost, 0);
  const cold = store.previewSpellExecution('Carreau', { actorId: 'mage', targetIds: ['enemy'], roll: 25, attributeActive: false });
  assert.equal(cold.ready, true, cold.error);
  assert.ok(cold.targetResults[0].woundsLost > 0, 'un projectile non feu n’est pas éprouvé par l’Égide');
});

test('Robe scintillante : le lanceur n’est jamais aveuglé ; l’ennemi engagé désigné l’est s’il échoue en Endurance', async () => {
  const people = [wizard('mage'), wizard('enemy', { camp: 'ennemi' }), wizard('bystander', { camp: 'ennemi' })];
  const store = await combat(...people);
  const none = store.previewSpellExecution('Robe scintillante', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  assert.equal(none.ready, true, none.error);
  assert.ok(!(none.targetResults[0].temporaryEffect.conditions || []).length);
  assert.ok(none.targetResults[0].actions.some(a => /aucun ennemi engagé/.test(a.summary)));
  const missingRoll = store.previewSpellExecution('Robe scintillante', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy'] } });
  assert.equal(missingRoll.ready, false);
  assert.match(missingRoll.error, /Endurance/);
  await cast(store, 'Robe scintillante', { secondaryTargets: { engaged: ['enemy'] }, targetTests: { enemy: { roll: 80 } } });
  assert.ok(!hasState(person(store, 'mage'), 'aveugle'));
  assert.ok(hasState(person(store, 'enemy'), 'aveugle'));
  assert.ok(!hasState(person(store, 'bystander'), 'aveugle'), 'jamais déduit : seul le désigné est touché');
  await store.undo();
  await cast(store, 'Robe scintillante', { secondaryTargets: { engaged: ['enemy'] }, targetTests: { enemy: { roll: 10 } } });
  assert.ok(!hasState(person(store, 'enemy'), 'aveugle'), 'Endurance réussie');
});

test('Pas d’Ombre et Portail d’Ombre : Surpris pour les ennemis engagés désignés, jamais pour le lanceur', async () => {
  for (const name of ['Pas d’Ombre', 'Portail d’Ombre']) {
    const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }), wizard('far', { camp: 'ennemi' }));
    await cast(store, name, { secondaryTargets: { engaged: ['enemy'] } });
    assert.ok(!hasState(person(store, 'mage'), 'surpris'), name);
    assert.ok(hasState(person(store, 'enemy'), 'surpris'), name);
    assert.ok(!hasState(person(store, 'far'), 'surpris'), name);
  }
});

test('Épée enflammée de Rhuin : le porteur ne brûle pas, la créature touchée par la lame si', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await cast(store, 'Épée Enflammée de Rhuin');
  assert.ok(!hasState(person(store, 'mage'), 'enflamme'));
  const bonus = person(store, 'mage').extensions.v5.weaponBonuses[0];
  assert.deepEqual(bonus.hitConditions, ['Enflammé']);
  const hit = store.previewResolution({ actorId: 'mage', targetId: 'enemy', action: { id:'blade', type: 'attack', attr: 'CC', base: 60, damageFormula: 'BF+4', qualities: [] }, roll: 25, v5: { kind: 'melee', choice: 'keep' }, defense: MELEE_DEFENSE });
  assert.ok(hit.targetConditionApplication.some(row => row.name === 'Enflammé' && row.source.kind === 'magic-weapon'), JSON.stringify(hit.targetConditionApplication));
  await store.applyResolution(hit);
  assert.ok(hasState(person(store, 'enemy'), 'enflamme'), 'appliqué à la créature touchée');
  assert.ok(!hasState(person(store, 'mage'), 'enflamme'));
  assert.equal(person(store, 'enemy').states.filter(row => row.key === 'enflamme').length, 1, 'une seule occurrence');
});

test('Coruscation de Finreir : aucun projectile, Vol (Agilité) et 5 PA non cumulés avec l’armure', async () => {
  const contract = getSpellContract('Coruscation de Finreir');
  assert.equal(contract.effects.missile, undefined);
  const store = await combat(wizard('mage', { armor: { head: 3, body: 7, arms: 3, legs: 3 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 25 } } } }), wizard('enemy', { camp: 'ennemi' }));
  const preview = store.previewSpellExecution('Coruscation de Finreir', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.targetResults[0].woundsLost, 0);
  await cast(store, 'Coruscation de Finreir');
  const mage = person(store, 'mage');
  assert.equal(mage.hp, 30, 'le lanceur ne perd rien');
  assert.ok(mage.traits.includes('Vol (Agilité)'));
  assert.deepEqual([mage.armor.head, mage.armor.body, mage.armor.leftArm, mage.armor.rightLeg], [5, 7, 5, 5], 'la plus haute valeur par localisation');
  const hit = swing(store);
  assert.equal(hit.protection.ap, mage.armor[hit.protection.location], 'l’arme lit la même valeur effective');
});

test('Lames Azurées : désignation sans coup au lancement (les coups viennent à chaque Tour), jamais le lanceur', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  const plain = store.previewSpellExecution('Lames Azurées', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  assert.equal(plain.ready, true, plain.error);
  assert.equal(plain.targetResults[0].woundsLost, 0);
  const designated = store.previewSpellExecution('Lames Azurées', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy'] } });
  assert.equal(designated.ready, true, designated.error);
  assert.equal(designated.secondaryResults[0].recurring, 'opponent-turn');
  const self = store.previewSpellExecution('Lames Azurées', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['mage'] } });
  assert.equal(self.ready, false, 'le lanceur ne peut pas être désigné');
  await cast(store, 'Lames Azurées', { secondaryTargets: { engaged: ['enemy'] } });
  assert.equal(person(store, 'mage').hp, 30);
  assert.equal(person(store, 'enemy').hp, 30, 'aucun coup au lancement');
  assert.deepEqual(person(store, 'mage').extensions.v5.spellEffects.find(e => e.recurringHits).recurringHits, { formula: '8', hits: 3, targetIds: ['enemy'] });
});

test('Poussée : les créatures désignées tombent et subissent 1d10 ; pas le lanceur', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await cast(store, 'Poussée', { targetIds:['enemy'], damageRoll:9, domainFacts:{collisionDeclared:true} } /* V5 p. 245 : cibles dans la zone */);
  assert.equal(person(store, 'mage').hp, 30);
  assert.ok(!hasState(person(store, 'mage'), 'a-terre'));
  assert.equal(person(store, 'enemy').hp, 30 - (9 - 3));
  assert.ok(hasState(person(store, 'enemy'), 'a-terre'));
});

test('Esprit du Foyer : le lanceur subit 6 Dégâts moins son Bonus d’Endurance (clause selfHarm)', async () => {
  const store = await combat(wizard('mage'));
  assert.ok(getSpellContract('Esprit du Foyer').effects.selfHarm.clause);
  await cast(store, 'Esprit du Foyer');
  assert.equal(person(store, 'mage').hp, 30 - 3);
});

test('Attributs facultatifs : appliqués aux ennemis par défaut, jamais aux alliés sans choix explicite', async () => {
  const people = () => [wizard('mage'), wizard('ally', { hp: 10 }), wizard('enemy', { camp: 'ennemi' })];
  let store = await combat(...people());
  await store.applySpellExecution('Cautérisation', { actorId: 'mage', targetIds: ['ally'], roll: 25, enduranceRoll:25 });
  assert.ok(!hasState(person(store, 'ally'), 'enflamme'), 'Cautérisation n’enflamme pas l’allié');
  store = await combat(...people());
  await store.applySpellExecution('Cautérisation', { actorId: 'mage', targetIds: ['ally'], roll: 25, enduranceRoll:25, attributeTargets: { ally: true } });
  assert.ok(hasState(person(store, 'ally'), 'enflamme'), 'choix explicite');
  store = await combat(...people());
  await store.applySpellExecution('Lumière guérisseuse', { actorId: 'mage', targetIds: ['ally'], roll: 25, enduranceRoll:25 });
  assert.ok(!hasState(person(store, 'ally'), 'aveugle'), 'Lumière guérisseuse n’aveugle pas l’allié soigné');
  store = await combat(...people());
  await store.applySpellExecution('Cœurs Enflammés', { actorId: 'mage', targetIds: ['ally', 'enemy'], roll: 25 });
  assert.ok(!hasState(person(store, 'ally'), 'enflamme'), 'Cœurs Enflammés n’enflamme pas les alliés');
  // V5 p. 248 : Cœurs enflammés affecte uniquement les alliés.
  assert.ok(!hasState(person(store, 'enemy'), 'enflamme'), 'ennemi hors des destinataires du sort');
  store = await combat(...people());
  const off = store.previewSpellExecution('Cœurs Enflammés', { actorId: 'mage', targetIds: ['enemy'], roll: 25, attributeActive: false });
  assert.equal(off.attributeReceipts.length, 0, 'l’option globale reste honorée');
});

test('Garde-fou : aucun sort de cible « Vous » ne blesse ni n’afflige son lanceur sans clause selfHarm', () => {
  const caster = { id: 'probe-caster', name: 'Probe Caster', camp: 'pj', kind: 'PJ', hp: 15, maxHp: 15, fortune: 2, fate: 2,
    caracs: { CC: 50, CT: 50, F: 40, E: 40, I: 50, Ag: 50, Dex: 50, Int: 60, FM: 60, Soc: 50, M: 4 }, skills: [{ name: 'Langue (Magick)', total: 90 }],
    actions:[fixtureBlade],armor: { head: 2, body: 2, arms: 2, legs: 2 }, states: [], traits: [], extensions: { v5: { channelling: { sl: 4, wind: 'Aqshy' }, spellEffects: [] } } };
  const justified = [];
  const offenders = [];
  for (const contract of getAllSpellContracts()) {
    const effects = contract.effects || {};
    const selfTarget = /^vous$/i.test((contract.target || '').trim());
    const harmsData = Boolean(effects.missile || effects.damage || effects.casterSelfDamage || effects.type === 'magic-missile' || effects.type === 'damage'
      || (effects.conditions || []).some(name => NEGATIVE_CONDITIONS.has(name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase())));
    if (selfTarget && harmsData) (effects.selfHarm ? justified : offenders).push(contract.name);
    if (effects.casterSelfDamage) assert.ok(effects.selfHarm?.clause, `${contract.name} : casterSelfDamage sans clause selfHarm`);
    if (!selfTarget) continue;
    // WoM pp. 99, 137 : zone autour du lanceur, destinataires exclusifs hors lanceur.
    if(effects.excludeCaster || effects.targetRule?.enemiesOnly){const refused=previewSpellExecution(caster,contract,[caster],{...declaredAnswers([caster.id]),...(contract.isCatalogue && ['life','light','death','shadow'].includes(contract.domain)?declared5BAnswers([caster.id]):{}),sl:100,attributeActive:false});if(effects.excludeCaster)assert.equal(refused.ready,false);else {assert.equal(refused.ready,true);assert.ok(refused.targetResults.every(r=>r.actions.some(a=>a.kind==='excluded')));}continue;}
    const choice = getContractChoiceOptions(contract);
    const preview = previewSpellExecution(caster, contract, [caster], { ...declaredAnswers([caster.id]), ...(contract.isCatalogue && ['life','light','death','shadow'].includes(contract.domain)?declared5BAnswers([caster.id]):{}), chosenLore:contract.domain==='arcane'?'fire':undefined,
      sl: Math.max(6, (contract.cn || 0) + 2), totalCastingSl: (contract.cn || 0) + 6, attributeActive: false, fellowshipRoll: 20, enduranceRoll: 20,
      locationRoll: 34, beastKey: 'wolf', chosenStats: ['CC'], roll3d10: 15, direction: 'N', willpowerSuccess: true, distanceRoll: 10,
      ...(choice.length ? { mjChoice: choice[0] } : {}),
      ...(parseSpellDuration(contract.duration, { caster, target: caster }).kind === 'unknown' ? { mjDuration: { amount: 5, unit: 'minutes' } } : {})
    });
    assert.equal(preview.ready, true, `${contract.name} : ${preview.error}`);
    const harmedAtRuntime = (preview.targetResults || []).some(row => row.woundsLost > 0
      || (row.temporaryEffect?.conditions || []).some(name => NEGATIVE_CONDITIONS.has(name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase())));
    if (preview.casterSelfDamage || harmedAtRuntime) assert.ok(effects.selfHarm, `${contract.name} blesse ou afflige son lanceur sans clause`);
  }
  assert.deepEqual(offenders, [], `contrats de cible « Vous » qui blessent ou affligent leur lanceur sans clause : ${offenders.join(', ')}`);
  assert.deepEqual(justified, [], 'aucun contrat de cible « Vous » n’a besoin de selfHarm ; seul Esprit du Foyer (cible Spécial) en porte une');
});

test('Garde-fou d’exécution : un contrat « Vous » qui porterait des dégâts ou un état négatif ne touche pas le lanceur', () => {
  const contract = { ...structuredClone(getSpellContract('Carreau')), id: 'synthetic-self-harm', target: 'Vous', range: 'Vous', effects: { type: 'damage', damage: { formula: '8', raw: 8 }, conditions: ['Aveuglé', 'Hâte'], aoe: false } };
  const caster = { id: 'c', name: 'c', camp: 'pj', hp: 20, maxHp: 20, caracs: { FM: 50, E: 30, Int: 50, I: 40 }, states: [], extensions: { v5: {} } };
  const preview = previewSpellExecution(caster, contract, [caster], { ...declaredAnswers([caster.id]), ...(contract.isCatalogue && ['life','light','death','shadow'].includes(contract.domain)?declared5BAnswers([caster.id]):{}), chosenLore:contract.domain==='arcane'?'fire':undefined, roll: 25, sl: 8, attributeActive: false, locationRoll: 34 });
  assert.equal(preview.targetResults[0]?.woundsLost ?? 0, 0);
  assert.ok(!(preview.targetResults[0]?.temporaryEffect?.conditions || []).includes('Aveuglé'));
});
