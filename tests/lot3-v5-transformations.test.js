/**
 * Forme bestiale (Bêtes du Reikland, Livre de base pp. 325-327) et Transformation de Kadon (monstres pp. 328-335),
 * puis retours de vérification de la livraison 2c (relèvement, Main de Gloire, Faux de Shyish).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';
import { BEAST_PROFILES, KADON_PROFILES, applyBeastForm, creatureWounds, transformationOvercastCost, optionalTransformationTraits, previewVerdantApotheosis } from '../js/core/v5-magic-arbitrations.js';
import { beastFormActions, magicGrantedActions } from '../js/core/v5-magic-combat.js';
import { isTargetUndead } from '../js/core/v5-magic-attributes.js';
import { locationProtection } from '../js/core/equipment.js';

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ id: 'skill-bagarre', name: 'Corps à corps (Bagarre)', carac: 'cc', total: 45, status: 'resolved' }, { id: 'skill-dex', name: 'Art', carac: 'dex', total: 42, status: 'resolved' },
    { id: 'skill-ag', name: 'Esquive', carac: 'ag', total: 47, status: 'resolved' }, { name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }],
  talents: [{ id: 'talent-strike-mighty-blow', name: 'Coup puissant', rank: 1, status: 'resolved' }], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 20 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const ARMOUR = { id: 'jack', kind: 'armour', name: 'Veste de cuir', layer: 'flexible', locations: ['body'], ap: 1, keywords: [] };

// ---------------------------------------------------------------------------------------------------------------------
// Données : transcription du livre et formule des Blessures
// ---------------------------------------------------------------------------------------------------------------------
test('Bêtes du Reikland — valeurs clés des six animaux (pp. 325-327), « – » représenté par null', () => {
  const key = name => { const p = BEAST_PROFILES[name]; return [p.M, p.caracs.F, p.caracs.E, p.caracs.Ag, p.caracs.Dex, p.size, p.armor?.ap ?? 0, p.page]; };
  assert.deepEqual(Object.keys(BEAST_PROFILES), ['boar', 'dog', 'giant-rat', 'giant-spider', 'horse', 'wolf']);
  assert.deepEqual(key('boar'), [7, 35, 40, 35, null, 'average', 1, 325]);
  assert.deepEqual(key('dog'), [6, 20, 20, 30, null, 'small', 0, 325]);
  assert.deepEqual(key('giant-rat'), [6, 20, 20, 35, 10, 'small', 0, 326]);
  assert.deepEqual(key('giant-spider'), [6, 15, 25, 35, 30, 'small', 1, 326]);
  assert.deepEqual(key('horse'), [8, 45, 35, 30, null, 'large', 0, 327]);
  assert.deepEqual(key('wolf'), [9, 35, 30, 30, null, 'average', 0, 327]);
  assert.equal(BEAST_PROFILES.boar.caracs.CT, null);
  assert.equal(BEAST_PROFILES.horse.attacks[0].qualities[0], 'assommante');
  assert.equal(BEAST_PROFILES.boar.attacks[1].free, 'charge');
  assert.equal(BEAST_PROFILES['giant-spider'].traits.includes('Toile 40'), true);
});

test('Formule de Blessures V5 (p. 361) : retrouve les Blessures du livre pour chaque bête et chaque monstre', () => {
  for (const [key, profile] of [...Object.entries(BEAST_PROFILES), ...Object.entries(KADON_PROFILES)]) {
    const caracs = { ...profile.caracs, FM: profile.caracs.FM ?? profile.caracs.E };
    assert.equal(creatureWounds({ caracs, size: profile.size }).wounds, profile.wounds, `${key} : Blessures du livre`);
  }
  const caracs = { F: 35, E: 30, FM: 45 };
  assert.equal(creatureWounds({ caracs, size: 'average' }).wounds, 13);
  assert.equal(creatureWounds({ caracs, size: 'large' }).wounds, 26);
  assert.equal(creatureWounds({ caracs, size: 'enormous' }).wounds, 52);
  assert.equal(creatureWounds({ caracs, size: 'small' }).wounds, 6, 'Petite : 2 × BE');
  assert.equal(creatureWounds({ caracs, size: 'average', hardy: 1 }).wounds, 16, 'Dur à cuire ajoute le BE une fois de plus');
  assert.throws(() => creatureWounds({ caracs: { F: 35, E: 30 }, size: 'average' }), /Force Mentale/);
});

// ---------------------------------------------------------------------------------------------------------------------
// Forme bestiale
// ---------------------------------------------------------------------------------------------------------------------
test('Forme bestiale — chaque animal remplace M, F, E, Ag et Dex ; Dex « – » devient absente ; Blessures par la formule V5 avec la FM du lanceur', () => {
  const caster = wizard();
  for (const [key, profile] of Object.entries(BEAST_PROFILES)) {
    const { participant } = applyBeastForm(caster, profile, { round: 1, durationMinutes: 30 });
    assert.deepEqual(['M', 'F', 'E', 'Ag'].map(k => participant.caracs[k]), [profile.M, profile.caracs.F, profile.caracs.E, profile.caracs.Ag], key);
    assert.equal(Object.hasOwn(participant.caracs, 'Dex'), profile.caracs.Dex !== null, `${key} : Dex`);
    if (profile.caracs.Dex !== null) assert.equal(participant.caracs.Dex, profile.caracs.Dex);
    for (const k of ['CC', 'CT', 'I', 'Int', 'FM', 'Soc']) assert.equal(participant.caracs[k], caster.caracs[k], `${key} : ${k} du lanceur`);
    // BFM 4 du lanceur (FM 45) à la place de celui de l'animal
    const expected = creatureWounds({ caracs: { F: profile.caracs.F, E: profile.caracs.E, FM: 45 }, size: profile.size }).wounds;
    assert.equal(participant.hp, expected, `${key} : Blessures`);
    assert.equal(participant.maxHp, expected);
    assert.deepEqual(participant.extensions.v5.beastForm.absentCaracs, profile.caracs.Dex === null ? ['Dex'] : []);
  }
});

test('Forme bestiale — Dur à cuire du lanceur entre dans la formule, ses talents et compétences restent', () => {
  const hardy = wizard('mage', { talents: [{ id: 'talent-hardy', name: 'Dur à cuire', rank: 1, status: 'resolved' }] });
  const { participant } = applyBeastForm(hardy, BEAST_PROFILES.wolf, { round: 1, durationMinutes: 30 });
  assert.equal(participant.hp, 3 + 3 * 3 + 4, 'BF 3 + (2 + 1) × BE 3 + BFM 4');
  assert.deepEqual(participant.talents.map(t => t.name), ['Coup puissant', 'Dur à cuire'].filter(n => hardy.talents.some(t => t.name === n)));
  assert.equal(participant.skills.find(s => s.name === 'Esquive').total, 47 - 40 + 30, 'compétence sur Ag recalculée sur l’Ag du loup');
  assert.equal(participant.skills.find(s => s.name === 'Art').total, null, 'compétence sur Dex : inutilisable sans Dex');
  assert.equal(participant.skills.find(s => s.name === 'Corps à corps (Bagarre)').total, 45);
});

test('Forme bestiale — trait optionnel à +2 DR : payé exactement, refusé hors liste, jamais Taille (Énorme) ni Nuée', async () => {
  assert.equal(transformationOvercastCost({ kind: 'beast', traits: 2 }), 4);
  assert.ok(!optionalTransformationTraits(BEAST_PROFILES['giant-rat']).includes('Nuée'));
  assert.ok(!optionalTransformationTraits(BEAST_PROFILES['giant-spider']).includes('Nuée'));
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 30 } } } }));
  const base = { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 12, beastKey: 'wolf', attributeActive: false };
  const free = store.previewSpellExecution('Forme bestiale', { ...base, beastTraits: ['Frénésie'] });
  assert.equal(free.ready, true, free.error);
  assert.equal(free.castingPreview.overcast.totalSpent, 2, 'dépense spéciale déduite : 2 DR par trait');
  assert.equal(store.previewSpellExecution('Forme bestiale', { ...base, beastTraits: ['Frénésie'], overcastChoices: { special: 4 } }).ready, false, 'dépense différente du coût');
  assert.equal(store.previewSpellExecution('Forme bestiale', { ...base, overcastChoices: { special: 2 } }).ready, false, '2 DR sans trait choisi');
  assert.equal(store.previewSpellExecution('Forme bestiale', { ...base, beastTraits: ['Nuée'] }).ready, false);
  assert.equal(store.previewSpellExecution('Forme bestiale', { ...base, beastTraits: ['Venin (Moyen)'] }).ready, false, 'trait d’un autre animal');
  await store.applySpellExecution('Forme bestiale', { ...base, beastTraits: ['Taille (Grande)'] });
  const mage = person(store, 'mage');
  assert.ok(mage.traits.includes('Taille (Grande)'));
  assert.equal(mage.hp, 26, 'Taille Grande : (BF 3 + 2 × BE 3 + BFM 4) × 2');
  assert.deepEqual(mage.extensions.v5.beastForm.optionalTraits, ['Taille (Grande)']);
});

test('Forme bestiale — équipement lâché : ni PA d’armure ni armes, peau de l’animal seule, tout revient au retour', async () => {
  const caster = wizard('mage', { equipment: [ARMOUR], armor: { head: 0, body: 1, arms: 0, legs: 0 }, armorLocations: { head: 0, body: 1, rightArm: 0, leftArm: 0, rightLeg: 0, leftLeg: 0 },
    actions: [{ id: 'sword', note: 'Épée', type: 'attack', attr: 'CC', base: 45, damageFormula: 'BF+4', extensions: { fiche: { equipmentId: 'sword' } } }] });
  const store = await combat(caster, wizard('enemy', { camp: 'ennemi' }));
  assert.equal(locationProtection(person(store, 'mage'), { location: { key: 'BODY' } }).ap, 1);
  await store.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'boar', attributeActive: false });
  let mage = person(store, 'mage');
  assert.deepEqual(mage.equipment, []);
  assert.equal(locationProtection(mage, { location: { key: 'BODY' } }).ap, 1, 'Peau +1 PA du Sanglier, pas la veste');
  assert.equal(locationProtection(mage, { location: { key: 'HEAD' } }).ap, 1, 'la peau protège toutes les localisations');
  assert.equal(mage.extensions.v5.beastForm.equipmentDropped, true);
  const wolf = await combat(caster);
  await wolf.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'wolf', attributeActive: false });
  assert.equal(locationProtection(person(wolf, 'mage'), { location: { key: 'BODY' } }).ap, 0, 'Loup : aucune armure standard, la veste est lâchée');
  await store.revertBeastForm('mage');
  mage = person(store, 'mage');
  assert.deepEqual(mage.equipment.map(item => item.id), ['jack']);
  assert.equal(locationProtection(mage, { location: { key: 'BODY' } }).ap, 1);
  assert.equal(mage.skills.find(s => s.name === 'Art').total, 42, 'compétences retrouvées');
  assert.equal(mage.caracs.Dex, 40);
});

test('Forme bestiale — attaques de l’animal : Bagarre du lanceur, dégâts BF de la Force remplacée + bonus, clauses', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await store.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'wolf', attributeActive: false });
  const actions = beastFormActions(person(store, 'mage'));
  assert.deepEqual(actions.map(a => a.note), ['Griffes (Loup)', 'Morsure (Loup) — attaque gratuite en perdant l’Élan']);
  assert.deepEqual(actions.map(a => [a.type, a.attr, a.base, a.damageFormula]), [['attack', 'CC', 45, 'BF+3'], ['attack', 'CC', 45, 'BF+3']]);
  const attack = (action, extra = {}) => store.previewResolution({ actorId: 'mage', targetId: 'enemy', action, roll: 25, defense: { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep', ...extra } });
  const claws = attack(actions[0]);
  assert.deepEqual(claws.unresolved || [], [], JSON.stringify(claws.unresolved));
  assert.deepEqual([claws.damage.strengthBonus, claws.damage.weaponDamage], [3, 6], 'BF 3 de la F du loup + 3 de la ligne « 35/+6 »');
  const bitten = attack(actions[1]);
  assert.deepEqual(bitten.unresolved || [], [], 'le lanceur a l’Élan');
  const withoutMomentum = await combat(wizard('mage', { extensions: { v5: { hasMomentum: false, channelling: { type: 'winds', sl: 20 } } } }), wizard('enemy', { camp: 'ennemi' }));
  await withoutMomentum.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'wolf', attributeActive: false });
  const bite = withoutMomentum.previewResolution({ actorId: 'mage', targetId: 'enemy', action: beastFormActions(person(withoutMomentum, 'mage'))[1], roll: 25, defense: { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep' } });
  assert.ok((bite.unresolved || []).some(text => /Élan/.test(text)), 'attaque gratuite sans Élan refusée');
});

test('Forme bestiale — Dex absente : tout Test de Dextérité est refusé ; Cornes du Sanglier seulement en chargeant', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await store.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'boar', attributeActive: false });
  const dexTest = store.previewResolution({ actorId: 'mage', action: { type: 'skill', attr: 'Dex', base: 40 }, roll: 25, v5: { kind: 'test' } });
  assert.ok((dexTest.unresolved || []).some(text => /Dex absente/.test(text)), JSON.stringify(dexTest.unresolved));
  const agTest = store.previewResolution({ actorId: 'mage', action: { type: 'skill', attr: 'Ag', base: 40 }, roll: 25, v5: { kind: 'test' } });
  assert.deepEqual(agTest.unresolved || [], []);
  const horns = beastFormActions(person(store, 'mage')).find(a => a.id === 'beast-form:horns');
  assert.match(horns.note, /seulement en chargeant/);
  const input = extra => ({ actorId: 'mage', targetId: 'enemy', action: horns, roll: 25, defense: { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep', ...extra } });
  assert.ok((store.previewResolution(input()).unresolved || []).some(text => /charger/.test(text)));
  assert.deepEqual(store.previewResolution(input({ charging: true })).unresolved || [], []);
});

test('Forme bestiale — sous forme animale l’équipement n’offre plus d’action d’arme (liste d’actions du lanceur filtrée)', async () => {
  const sword = { id: 'sword', note: 'Épée', type: 'attack', attr: 'CC', base: 45, damageFormula: 'BF+4', extensions: { fiche: { equipmentId: 'sword' } } };
  const store = await combat(wizard('mage', { actions: [sword] }));
  await store.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'wolf', attributeActive: false });
  const mage = person(store, 'mage');
  assert.ok(mage.actions.some(a => a.id === 'sword'), 'l’action reste dans la fiche (rendue au retour)');
  assert.equal(mage.extensions.v5.beastForm.equipmentDropped, true);
});

// ---------------------------------------------------------------------------------------------------------------------
// Transformation de Kadon
// ---------------------------------------------------------------------------------------------------------------------
const kadonMage = (extra = {}) => wizard('mage', { caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 30 } } }, ...extra });
const kadon = (extra = {}) => ({ actorId: 'mage', targetIds: ['mage'], sl: 20, ...extra });

test('Kadon — contrat : NI 14, Vous ou Contact, Vous ou 1, (Bonus de Force Mentale) Rounds ; options de surpuissance duration et special', () => {
  const contract = getSpellContract('Transformation de Kadon');
  assert.deepEqual([contract.cn, contract.range, contract.target, contract.duration], [14, 'Vous ou Contact', 'Vous ou 1 (maximum)', 'Bonus de Force Mentale Rounds']);
  assert.deepEqual(contract.overcast.options, ['duration', 'special']);
  assert.equal(contract.effects.mjInput, undefined, 'le monstre se choisit dans le sélecteur dédié');
  assert.deepEqual(Object.keys(KADON_PROFILES), ['bog-octopus', 'demigryph', 'dragon', 'fenbeast', 'giant', 'griffon', 'manticore', 'pegasus', 'troll']);
  assert.ok(Object.values(KADON_PROFILES).every(p => ['large', 'enormous'].includes(p.size)), 'Taille Grande ou Énorme seulement');
});

test('Kadon — monstre du livre : caractéristiques, Compétences et Talents remplacés, Blessures du monstre, Int et FM conservées, retour complet', async () => {
  const store = await combat(kadonMage({ equipment: [ARMOUR], armorLocations: { head: 0, body: 1, rightArm: 0, leftArm: 0, rightLeg: 0, leftLeg: 0 } }));
  assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon()).ready, false, 'monstre à choisir');
  await store.applySpellExecution('Transformation de Kadon', kadon({ monsterKey: 'griffon' }));
  const mage = person(store, 'mage');
  const griffon = KADON_PROFILES.griffon;
  assert.deepEqual(['CC', 'F', 'E', 'I', 'Ag'].map(k => mage.caracs[k]), [50, 50, 50, 45, 60]);
  assert.equal(Object.hasOwn(mage.caracs, 'Dex'), false);
  assert.equal(Object.hasOwn(mage.caracs, 'CT'), false, 'CT « – » du griffon');
  assert.equal(mage.caracs.Int, 52); assert.equal(mage.caracs.FM, 45);
  assert.equal(mage.caracs.M, 6);
  assert.equal(mage.hp, 80, 'Blessures du monstre (p. 332)');
  assert.deepEqual(mage.talents, [], 'Talents du lanceur remplacés');
  assert.deepEqual(mage.skills.map(s => [s.name, s.total]), [['Athlétisme', 65], ['Corps à corps (Bagarre)', 60], ['Perception', 60]]);
  assert.ok(mage.traits.includes('Vol (80)') && mage.traits.includes('Taille (Énorme)'));
  assert.equal(locationProtection(mage, { location: { key: 'BODY' } }).ap, 1, 'Peau +1 PA, pas la veste');
  assert.equal(mage.extensions.v5.beastForm.expiresAtRound, 1 + 4, 'BFM Rounds');
  const attacks = beastFormActions(mage);
  assert.deepEqual(attacks.map(a => [a.note.split(' —')[0], a.base, a.damageFormula]), [['Serres (Griffon)', 60, 'BF+9'], ['Morsure (Griffon)', 60, 'BF+3']], 'ligne du monstre ; +14 − BF 5, +8 − BF 5');
  assert.deepEqual(attacks[0].qualities, [{ id: 'rapide' }]);
  assert.ok(griffon.skills.length > 0);
  await store.expireSpellEffects('mage', { currentRound: 99 });
  const back = person(store, 'mage');
  assert.equal(back.caracs.F, 30); assert.equal(back.caracs.Dex, 40); assert.equal(back.hp, 30);
  assert.deepEqual(back.talents.map(t => t.name), ['Coup puissant']);
  assert.equal(back.skills.length, 5);
  assert.deepEqual(back.equipment.map(item => item.id), ['jack']);
});

test('Kadon — trait optionnel à +4 DR, autre cible au Contact à +4 DR (le lanceur ne se transforme pas)', async () => {
  const store = await combat(kadonMage(), wizard('ally'));
  const withTrait = store.previewSpellExecution('Transformation de Kadon', kadon({ monsterKey: 'troll', beastTraits: ['Vision nocturne'] }));
  assert.equal(withTrait.ready, true, withTrait.error);
  assert.equal(withTrait.castingPreview.overcast.totalSpent, 4);
  assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon({ monsterKey: 'troll', beastTraits: ['Vision nocturne'], overcastChoices: { special: 2 } })).ready, false);
  assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon({ monsterKey: 'troll', beastTraits: ['Dressé'] })).ready, false, 'trait hors liste');
  const other = kadon({ monsterKey: 'troll', targetIds: ['ally'],targetTests:{ally:{unwilling:false}} });
  assert.equal(store.previewSpellExecution('Transformation de Kadon', other).ready, false, 'autre cible sans l’option');
  assert.equal(store.previewSpellExecution('Transformation de Kadon', { ...kadon({ monsterKey: 'troll' }), kadonOtherTarget: true }).ready, false, 'option sans autre cible');
  const paid = store.previewSpellExecution('Transformation de Kadon', { ...other, kadonOtherTarget: true });
  assert.equal(paid.ready, true, paid.error);
  assert.equal(paid.castingPreview.overcast.totalSpent, 4);
  await store.applySpellExecution('Transformation de Kadon', { ...other, kadonOtherTarget: true });
  assert.equal(person(store, 'ally').caracs.F, 55, 'l’allié devient troll');
  assert.equal(person(store, 'ally').hp, 30);
  assert.equal(person(store, 'mage').extensions.v5.beastForm, undefined, 'le lanceur reste lui-même');
});

test('Kadon — profil saisi : null, vide ou valeur négative refusés (jamais convertis en 0) ; durée affichée en Rounds', async () => {
  const store = await combat(kadonMage());
  const profile = { name: 'Chimère',size:'large', M: 6, hp: 40, caracs: { CC: 50, CT: 0, F: 60, E: 60, I: 40, Ag: 40, Dex: 0, Soc: 10 }, traits: ['Vol (60)'] };
  const ok = store.previewSpellExecution('Transformation de Kadon', kadon({ monsterProfile: profile }));
  assert.equal(ok.ready, true, ok.error);
  assert.match(ok.targetResults[0].beastForm.summary, /pendant 4 Rounds/, 'durée en Rounds, pas en minutes');
  for (const bad of [null, '', undefined, -5]) {
    assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon({ monsterProfile: { ...profile, caracs: { ...profile.caracs, F: bad } } })).ready, false, `F = ${bad}`);
  }
  assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon({ monsterProfile: { ...profile, M: null } })).ready, false);
  assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon({ monsterProfile: { ...profile, hp: -1 } })).ready, false);
});

// ---------------------------------------------------------------------------------------------------------------------
// Retours de vérification de la livraison 2c
// ---------------------------------------------------------------------------------------------------------------------
const lifeMage = (extra = {}) => wizard('mage', { caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 80, FM: 80, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 40 } } }, ...extra });

test('Apothéose Verdoyante — cannotBeRevived refusé ; zone mêlant morts et vivants : vivants ignorés avec un message, morts relevés', async () => {
  const verdant = previewVerdantApotheosis({ corpses: [{ id: 'x', hp: 0, maxHp: 20, timeSinceDeathSec: 10, extensions: { v5: { cannotBeRevived: true } } }], castingSl: 6 });
  assert.equal(verdant.results[0].admissible, false);
  assert.match(verdant.results[0].reason, /plus être ramené/);
  const dead = (id, extra = {}) => wizard(id, { hp: 0, maxHp: 30, extensions: { v5: { dead: true } }, ...extra });
  const store = await combat(lifeMage(), wizard('alive', { hp: 25 }), dead('dead'), dead('twice', { extensions: { v5: { dead: true, cannotBeRevived: true } } }));
  const options = { actorId: 'mage', targetIds: ['alive', 'dead', 'twice'], sl: 16, targetTests: { dead: { deathDelaySec: 30 }, twice: { deathDelaySec: 30 }, alive: {} } };
  const preview = store.previewSpellExecution('Apothéose Verdoyante', options);
  assert.equal(preview.ready, true, preview.error);
  const lines = preview.targetResults.map(r => [r.targetId, r.verdantApotheosis?.admissible]);
  assert.deepEqual(lines, [['alive', false], ['dead', true], ['twice', false]]);
  assert.ok(preview.targetResults[0].actions.some(a => /ignoré/.test(a.summary)));
  await store.applySpellExecution('Apothéose Verdoyante', options);
  assert.equal(person(store, 'alive').hp, 25, 'le vivant n’est jamais touché');
  assert.ok(person(store, 'dead').hp > 0);
  assert.equal(person(store, 'twice').hp, 0);
  const none = store.previewSpellExecution('Apothéose Verdoyante', { ...options, targetIds: ['alive', 'twice'] });
  assert.equal(none.ready, false, 'aucune cible admissible : refus');
});

test('Apothéose +10 DR — mort constatée déclarée par cible, Inconscient retiré au relèvement, cannotBeRevived refusé', async () => {
  const downed = (id, extra = {}) => wizard(id, { hp: 0, maxHp: 30, states: [{ key: 'inconscient', name: 'Inconscient', level: 1 }], ...extra });
  const store = await combat(lifeMage(), downed('down'), downed('gone', { extensions: { v5: { dead: true, cannotBeRevived: true } } }));
  const options = id => ({ actorId: 'mage', targetIds: [id], sl: 16, apotheoseOptions: { raiseDead: true }, burnoutRoll: 50 });
  assert.equal(store.previewSpellExecution('Apothéose', options('down')).ready, false, 'pas de mort constatée : refusé');
  assert.equal(store.previewSpellExecution('Apothéose', { ...options('gone'), deadTargetIds: ['gone'] }).ready, false, 'cannotBeRevived refusé');
  const declared = { ...options('down'), deadTargetIds: ['down'] };
  assert.equal(store.previewSpellExecution('Apothéose', declared).ready, true);
  await store.applySpellExecution('Apothéose', declared);
  const raised = person(store, 'down');
  assert.equal(raised.hp, 30);
  assert.deepEqual((raised.states || []).map(s => s.key), [], 'Inconscient retiré comme pour Verdant');
});

test('Main de Gloire — la dépense spéciale égale exactement le coût des options choisies', async () => {
  const store = await combat(lifeMage(), wizard('a1'));
  const hog = (extra = {}) => ({ actorId: 'mage', targetIds: ['a1'], sl: 14, roll3d10: 17, burnoutRoll: 50, ...extra });
  const four = ['CC', 'CT', 'F', 'E'];
  assert.equal(store.previewSpellExecution('Main de Gloire', hog({ tier: 'overcast6', chosenStats: four, overcastChoices: { special: 6 } })).ready, true);
  const eight = store.previewSpellExecution('Main de Gloire', hog({ tier: 'overcast6', chosenStats: four, overcastChoices: { special: 8 } }));
  assert.equal(eight.ready, false, '8 DR payés pour l’effet +6 : refusé');
  assert.match(eight.error, /exactement/);
  assert.equal(store.previewSpellExecution('Main de Gloire', hog({ chosenStats: ['F'], overcastChoices: { special: 6 } })).ready, false, '6 DR sans les quatre caractéristiques');
  assert.equal(store.previewSpellExecution('Main de Gloire', hog({ tier: 'overcast6', chosenStats: four, hogOptions: { removeBroken: true }, overcastChoices: { special: 6 } })).ready, false, '+6 et +3 = 9 DR');
  assert.equal(store.previewSpellExecution('Main de Gloire', hog({ tier: 'overcast6', chosenStats: four, hogOptions: { removeBroken: true }, overcastChoices: { special: 9 } })).ready, true);
});

test('Faux de Shyish — la hallebarde conférée a les qualités du livre et une allonge Longue ; Mort-vivant seulement par trait ou étiquette', async () => {
  const store = await combat(wizard('mage'));
  await store.applySpellExecution('La Faux de Shyish', { actorId: 'mage', targetIds: ['mage'], roll: 25, attributeActive: false });
  const [halberd] = magicGrantedActions(person(store, 'mage'));
  assert.deepEqual(halberd.qualities.map(q => q.id).sort(), ['defensive', 'empaleuse', 'magique', 'taille']);
  assert.equal(halberd.reach, 'Longue');
  assert.equal(halberd.extensions.v5.weaponReach, 'Longue');
  assert.equal(isTargetUndead({ name: 'Chasseur de vampires' }), false);
  assert.equal(isTargetUndead({ name: 'Zombie' }), false, 'le nom ne suffit pas');
  assert.equal(isTargetUndead({ name: 'Garde', tags: ['Mort-vivant'] }), true);
  assert.equal(isTargetUndead({ name: 'Garde', traits: ['Mort-vivant'] }), true);
  assert.equal(isTargetUndead({ isUndead: true }), true);
});
