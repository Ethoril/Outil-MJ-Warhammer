/**
 * Livraison 2c du lot 3 : arbitrages annoncés comme livrés mais non fonctionnels (phase 6, A-01 à A-07) et
 * Protections magiques rejouées sur les coups récurrents de Lames Azurées.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';
import { expireSpellEffects } from '../js/core/v5-magic-effects.js';
import { previewVerdantApotheosis, applyVerdantApotheosis, applyBeastForm, daemonbaneReductions, BEAST_PROFILES } from '../js/core/v5-magic-arbitrations.js';
import { magicGrantedActions } from '../js/core/v5-magic-combat.js';
import { previewV5Turn } from '../js/core/v5-turn.js';

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } }, ...extra });
/** Lanceur de Haute Magie assez puissant pour payer les options de surpuissance (BI + BFM = 16). */
const archmage = (id = 'mage', extra = {}) => wizard(id, { caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 80, FM: 80, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const stateKeys = p => (p.states || []).map(s => s.key || s.name);
const bmax = (extra = {}) => ({ hp: 10, maxHp: 30, ...extra });

// ---------------------------------------------------------------------------------------------------------------------
// A-01 Main de Gloire
// ---------------------------------------------------------------------------------------------------------------------
const hog = (extra = {}) => ({ actorId: 'mage', targetIds: ['a1', 'a2'], sl: 12, chosenStats: ['F'], roll3d10: 17, ...extra });

test('A-01 Main de Gloire — le même 3d10 s’applique à tous les alliés ciblés, Bmax inchangé malgré l’Endurance', async () => {
  const store = await combat(archmage(), wizard('a1'), wizard('a2', { caracs: { CC: 30, CT: 30, F: 40, E: 35, Int: 30, FM: 30, Ag: 30, I: 30, Dex: 30, Soc: 30, M: 5 } }));
  await store.applySpellExecution('Main de Gloire', hog({ chosenStats: ['E'], roll3d10: 21 }));
  assert.equal(person(store, 'a1').caracs.E, 51);
  assert.equal(person(store, 'a2').caracs.E, 56);
  assert.equal(person(store, 'a1').maxHp, 30);
  assert.equal(person(store, 'a2').maxHp, 30);
});

test('A-01 Main de Gloire — palier +6 : quatre caractéristiques distinctes exigées (doublons, cinq choix ou M refusés)', async () => {
  const store = await combat(archmage(), wizard('a1'), wizard('a2'));
  const tier6 = chosenStats => store.previewSpellExecution('Main de Gloire', hog({ tier: 'overcast6', chosenStats, overcastChoices: { special: 6 }, burnoutRoll: 50 }));
  assert.equal(tier6(['CC', 'CC', 'F', 'E']).ready, false, 'trois caractéristiques distinctes seulement');
  assert.equal(tier6(['CC', 'F', 'E', 'Ag', 'I']).ready, false, 'cinq caractéristiques');
  assert.equal(tier6(['CC', 'F', 'E', 'M']).ready, false, 'M n’est pas une caractéristique à 3d10');
  assert.equal(tier6(['CC', 'F', 'E', 'Ag']).ready, true);
});

test('A-01 Main de Gloire — option +3 : retire les états Brisé des alliés ; sans l’option, la dépense de 3 DR est refusée', async () => {
  const brisé = { key: 'brise', name: 'Brisé', level: 1 };
  const store = await combat(archmage(), wizard('a1', { states: [brisé] }), wizard('a2', { states: [brisé, { key: 'extenue', name: 'Exténué', level: 1 }] }));
  const unpaid = store.previewSpellExecution('Main de Gloire', hog({ overcastChoices: { special: 3 } }));
  assert.equal(unpaid.ready, false, 'une dépense de 3 DR sans l’option correspondante est payée sans effet');
  await store.applySpellExecution('Main de Gloire', hog({ hogOptions: { removeBroken: true } }));
  assert.deepEqual(stateKeys(person(store, 'a1')), []);
  assert.deepEqual(stateKeys(person(store, 'a2')), ['extenue'], 'seul Brisé est retiré');
  assert.equal(person(store, 'a1').caracs.F, 47, 'le 3d10 reste appliqué');
});

test('A-01 Main de Gloire — option +8 : retire Brisé et Extenué, soigne 1d10 saisi, Immunité (Psychologie) le temps du sort', async () => {
  const states = [{ key: 'brise', name: 'Brisé', level: 2 }, { key: 'extenue', name: 'Exténué', level: 1 }];
  const store = await combat(archmage(), wizard('a1', bmax({ states })), wizard('a2', bmax()));
  const noDie = store.previewSpellExecution('Main de Gloire', hog({ hogOptions: { purify: true } }));
  assert.equal(noDie.ready, false);
  assert.ok(noDie.missing?.includes('healRoll'), 'le 1d10 de soin est une saisie explicite');
  await store.applySpellExecution('Main de Gloire', hog({ hogOptions: { purify: true }, healRoll: 7 }));
  const a1 = person(store, 'a1');
  assert.deepEqual(stateKeys(a1), []);
  assert.equal(a1.hp, 17);
  assert.equal(person(store, 'a2').hp, 17, 'même soin pour chaque allié');
  assert.ok(a1.traits.includes('Immunité (Psychologie)'));
  await store.expireSpellEffects('a1', { currentRound: 99 });
  assert.ok(!person(store, 'a1').traits.includes('Immunité (Psychologie)'));
  assert.equal(person(store, 'a1').maxHp, 30);
});

// ---------------------------------------------------------------------------------------------------------------------
// A-02 Faux de Shyish
// ---------------------------------------------------------------------------------------------------------------------
const zombieAttack = (store, { actorId = 'zombie', targetId = 'mage' } = {}) => store.previewResolution({ actorId, targetId,
  action: { type: 'attack', attr: 'CC', base: 60, damageFormula: 'BF+4' }, roll: 25, v5: { kind: 'melee', choice: 'keep' },
  defense: { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } } });
const withUndead = () => [wizard('mage'), wizard('zombie', { camp: 'ennemi', tags: ['Mort-vivant'] }), wizard('brigand', { camp: 'ennemi' })];

test('A-02 Faux de Shyish — drapeau porté par un effet de sort qui expire ; Mort-vivant engagé sans Avantage, Élan conservé', async () => {
  const store = await combat(...withUndead());
  const before = zombieAttack(store);
  assert.equal(before.test.advantage.advantage.length, 1, 'sans Faux : Avantage d’Élan du Mort-vivant');
  await store.applySpellExecution('La Faux de Shyish', { actorId: 'mage', targetIds: ['mage'], sl: 12 });
  const mage = person(store, 'mage');
  const effect = mage.extensions.v5.spellEffects.find(e => e.spellName === 'La Faux de Shyish');
  assert.ok(effect, 'effet de sort créé');
  assert.equal(effect.expiresAtRound, 1 + 4, 'BFM Rounds');
  assert.equal(mage.extensions.v5.scytheOfShyishActive, undefined, 'plus de drapeau à plat jamais relu');
  const attack = zombieAttack(store);
  assert.equal(attack.test.advantage.advantage.length, 0, 'le Mort-vivant attaquant n’a plus d’Avantage');
  assert.equal(person(store, 'zombie').extensions.v5.hasMomentum, true, 'Élan conservé');
  const defence = store.previewResolution({ actorId: 'mage', targetId: 'zombie', action: { type: 'attack', attr: 'CC', base: 60, damageFormula: 'BF+4' }, roll: 25, v5: { kind: 'melee', choice: 'keep' },
    defense: { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } } });
  assert.equal(defence.defenderTest.advantage.advantage.length, 0, 'le Mort-vivant qui défend contre le porteur non plus');
  const living = zombieAttack(store, { actorId: 'brigand' });
  assert.equal(living.test.advantage.advantage.length, 1, 'un vivant garde son Avantage');
  const expired = await store.expireSpellEffects('mage', { currentRound: 99 });
  assert.equal(zombieAttack(store).test.advantage.advantage.length, 1, 'après expiration, l’Avantage revient');
});

test('A-02 Faux de Shyish — hallebarde Magique BF + BFM + 4 conférée, retirée à l’expiration', async () => {
  const store = await combat(...withUndead());
  assert.deepEqual(magicGrantedActions(person(store, 'mage')), []);
  await store.applySpellExecution('La Faux de Shyish', { actorId: 'mage', targetIds: ['mage'], sl: 12 });
  const [scythe] = magicGrantedActions(person(store, 'mage'));
  assert.ok(scythe, 'arme conférée');
  assert.equal(scythe.type, 'attack');
  assert.equal(scythe.damageFormula, 'BF+8', 'BF du porteur + BFM (4) + 4');
  assert.ok(scythe.qualities.some(q => (q.id || q) === 'magique'), 'qualité Magique');
  const hit = store.previewResolution({ actorId: 'mage', targetId: 'brigand', action: scythe, roll: 25, v5: { kind: 'melee', choice: 'keep' }, defense: { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } } });
  assert.equal(hit.damage.weaponDamage, 3 + 4 + 4, 'dégâts de l’arme : BF 3 + BFM 4 + 4');
  assert.ok(hit.damage.activeQualities.some(q => q.id === 'magique'), 'arme Magique');
  await store.expireSpellEffects('mage', { currentRound: 99 });
  assert.deepEqual(magicGrantedActions(person(store, 'mage')), []);
});

// ---------------------------------------------------------------------------------------------------------------------
// A-04 Apothéose Verdoyante et Apothéose
// ---------------------------------------------------------------------------------------------------------------------
const verdant = (extra = {}) => ({ actorId: 'mage', sl: 10, ...extra });
const lifeMage = (id = 'mage') => wizard(id, { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } } });
const corpse = (id, extra = {}) => wizard(id, { hp: 0, maxHp: 30, extensions: { v5: { hasMomentum: true, dead: true } }, ...extra });

test('A-04 Apothéose Verdoyante — une cible vivante est refusée et jamais blessée (25/30 ne tombe plus à 16)', async () => {
  const store = await combat(lifeMage(), wizard('ally', { hp: 25 }));
  const opts = verdant({ targetIds: ['ally'], targetTests: { ally: { deathDelaySec: 10 } } });
  const preview = store.previewSpellExecution('Apothéose Verdoyante', opts);
  assert.equal(preview.ready, false);
  assert.match(preview.error, /vivant|morte?/i);
  await assert.rejects(async () => store.applySpellExecution('Apothéose Verdoyante', opts));
  assert.equal(person(store, 'ally').hp, 25);
});

test('A-04 Apothéose Verdoyante — cible morte : délai de mort saisi exigé, moins d’une minute, puis 1 B par DR final', async () => {
  const store = await combat(lifeMage(), corpse('dead'));
  const base = verdant({ targetIds: ['dead'] });
  const missing = store.previewSpellExecution('Apothéose Verdoyante', base);
  assert.equal(missing.ready, false);
  assert.ok(missing.missing?.includes('deathDelaySec'), 'délai non saisi : bloqué, pas de 0 par défaut');
  const late = store.previewSpellExecution('Apothéose Verdoyante', { ...base, targetTests: { dead: { deathDelaySec: 60 } } });
  assert.equal(late.ready, false, 'une minute révolue : trop tard');
  await store.applySpellExecution('Apothéose Verdoyante', { ...base, targetTests: { dead: { deathDelaySec: 45 } } });
  const revived = person(store, 'dead');
  assert.equal(revived.hp, 18, '10 DR + 8 de réserve');
  assert.equal(revived.extensions.v5.dead, false);
  assert.ok(revived.extensions.v5.corruptionExposures.length > 0);
});

test('A-04 Apothéose Verdoyante — cadavre décapité refusé ; fonctions pures : vivant ou sans délai non admissibles', () => {
  const alive = { id: 'v', name: 'Vivant', hp: 25, maxHp: 30, timeSinceDeathSec: 10 };
  const unknown = { id: 'u', name: 'Sans délai', hp: 0, maxHp: 30, dead: true };
  const ok = { id: 'o', name: 'Mort', hp: 0, maxHp: 30, dead: true, timeSinceDeathSec: 20 };
  const preview = previewVerdantApotheosis({ corpses: [alive, unknown, ok], castingSl: 4, reserveSl: 6 });
  assert.deepEqual(preview.results.map(r => r.admissible), [false, false, true]);
  const applied = applyVerdantApotheosis([alive, unknown, ok], preview).updatedCorpses;
  assert.equal(applied[0].hp, 25, 'le vivant n’est pas touché');
  assert.equal(applied[1].hp, 0);
  assert.equal(applied[2].hp, 10);
});

test('A-04 Apothéose (HEPG p. 86) — confère Peur (1) au lieu de retirer Peur et Terreur ; contrat régénéré', async () => {
  const contract = getSpellContract('Apothéose');
  assert.deepEqual(contract.effects.traits, ['Peur (1)']);
  assert.equal(contract.effects.removeConditions, undefined);
  assert.ok(contract.overcast.options.includes('special'));
  const store = await combat(archmage(), wizard('ally', bmax({ states: [{ key: 'peur', name: 'Peur', level: 1 }] })));
  await store.applySpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 10 });
  const ally = person(store, 'ally');
  assert.equal(ally.hp, 18, 'BFM 8 de soin');
  assert.ok(ally.traits.includes('Peur (1)'));
  assert.ok(stateKeys(ally).includes('peur'), 'l’état Peur subi n’est plus retiré');
});

test('A-04 Apothéose — options +3 (Blessures supplémentaires), +6 (Blessure Critique, test saisi), +10 (relever un mort)', async () => {
  const store = await combat(archmage(), wizard('ally', bmax({ maxHp: 60, states: [{ key: 'bras-brise', name: 'Bras brisé', level: 1, source: { kind: 'critical' } }] })), corpse('dead'));
  const mismatch = store.previewSpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 12, overcastChoices: { special: 3 } });
  assert.equal(mismatch.ready, false, '3 DR dépensés sans option choisie');
  await store.applySpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 14, apotheoseOptions: { extraHealSteps: 2 } });
  assert.equal(person(store, 'ally').hp, 10 + 8 * 3, 'BFM × (1 + 2 paliers de +3)');
  const noTest = store.previewSpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 12, apotheoseOptions: { criticalHeal: true } });
  assert.equal(noTest.ready, false);
  assert.ok(noTest.missing?.includes('criticalHealTest'));
  await store.applySpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 12, apotheoseOptions: { criticalHeal: true }, criticalHealTest: true });
  assert.deepEqual(stateKeys(person(store, 'ally')), [], 'Blessure Critique guérie');
  const living = store.previewSpellExecution('Apothéose', { actorId: 'mage', targetIds: ['ally'], sl: 16, apotheoseOptions: { raiseDead: true }, burnoutRoll: 50 });
  assert.equal(living.ready, false, 'relever un vivant : refusé');
  await store.applySpellExecution('Apothéose', { actorId: 'mage', targetIds: ['dead'], sl: 16, apotheoseOptions: { raiseDead: true }, burnoutRoll: 50 });
  const raised = person(store, 'dead');
  assert.equal(raised.hp, 30, 'toutes ses Blessures');
  await store.expireSpellEffects('dead', { currentRound: 999, advanceMinutes: 60 });
  const gone = person(store, 'dead');
  assert.equal(gone.hp, 0, 'meurt au terme des BFM minutes');
  assert.equal(gone.extensions.v5.cannotBeRevived, true);
});

// ---------------------------------------------------------------------------------------------------------------------
// A-05 Forme bestiale / Jade
// ---------------------------------------------------------------------------------------------------------------------
test('A-05 Forme bestiale — seuls M, F, E, Ag et Dex sont remplacés (Dex « – » absente) ; traits standard sauf Bestial et Craintif, ceux du lanceur conservés ; Blessures V5', () => {
  const caster = wizard('mage', { traits: ['Chevaucheur'] });
  const { participant } = applyBeastForm(caster, BEAST_PROFILES.wolf, { round: 1, durationMinutes: 30 });
  for (const key of ['CC', 'CT', 'I', 'Int', 'FM', 'Soc']) assert.equal(participant.caracs[key], caster.caracs[key], key + ' conservée');
  assert.deepEqual(['F', 'E', 'Ag', 'M'].map(k => participant.caracs[k]), [35, 30, 30, 9]);
  assert.equal(Object.hasOwn(participant.caracs, 'Dex'), false, 'Dex « – » : absente, jamais 0');
  assert.equal(participant.movement, 9);
  assert.deepEqual(participant.traits.sort(), ['Chevaucheur', 'Vision nocturne'].sort());
  assert.equal(participant.hp, 13, 'Loup (Taille Moyenne) : BF 3 + 2 × BE 3 + BFM 4 du lanceur (FM 45)');
  assert.equal(participant.maxHp, 13);
});

test('A-05 Forme bestiale — impossible de lancer, dissiper ou se focaliser sous forme animale ; Jade identique à Forme bestiale', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await store.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], sl: 8, beastKey: 'boar' });
  assert.ok(person(store, 'mage').extensions.v5.beastForm);
  const cast = store.previewSpellExecution('Carreau', { actorId: 'mage', targetIds: ['enemy'], sl: 8, locationRoll: 50 });
  assert.equal(cast.ready, false);
  assert.match(cast.error, /forme (animale|bestiale)/i);
  const channel = store.previewChannelling({ actorId: 'mage', roll: 20, mode: 'channel', type: 'winds', lore: 'beasts' });
  assert.equal(channel.ready, false);
  assert.match(channel.error || channel.summary || '', /forme (animale|bestiale)/i);
  const dispel = store.previewDispelPersistent({ id: 'x', cn: 2, casterId: 'enemy' }, { dispellerId: 'mage', roll: 20 });
  assert.equal(dispel.allowed, false);
  assert.match(dispel.reason, /forme (animale|bestiale)/i);

  const base = getSpellContract('Forme bestiale'), jade = getSpellContract('Forme bestiale - Jade');
  for (const key of ['cn', 'range', 'target', 'duration', 'overcast', 'effects']) assert.deepEqual(jade[key], base[key], key);
  assert.deepEqual([jade.wind, jade.domain, jade.isJadeVariant], ['Ghyran', 'life', true]);
});

// ---------------------------------------------------------------------------------------------------------------------
// A-06 Transformation de Kadon
// ---------------------------------------------------------------------------------------------------------------------
const dragon = { name: 'Dragon', M: 6, hp: 60, caracs: { CC: 70, CT: 0, F: 90, E: 80, I: 40, Ag: 30, Dex: 0, Int: 20, FM: 30, Soc: 15 }, traits: ['Vol (9)', 'Taille (Énorme)', 'Bestial'] };
const kadon = (extra = {}) => ({ actorId: 'mage', targetIds: ['mage'], sl: 12, ...extra });
const kadonMage = () => wizard('mage', { caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 14 } } } });

test('A-06 Transformation de Kadon — le monstre choisi est appliqué (jamais un Loup), Int et FM conservées, BFM Rounds', async () => {
  const store = await combat(kadonMage());
  const noProfile = store.previewSpellExecution('Transformation de Kadon', kadon({ mjChoice: 'Dragon' }));
  assert.equal(noProfile.ready, false);
  assert.ok(noProfile.missing?.includes('monsterProfile'), 'pas de profil connu : le MJ le saisit');
  await store.applySpellExecution('Transformation de Kadon', kadon({ mjChoice: 'Dragon', monsterProfile: dragon }));
  const mage = person(store, 'mage');
  assert.equal(mage.caracs.F, 90);
  assert.equal(mage.caracs.CC, 70, 'toutes les autres caractéristiques sont celles du monstre');
  assert.equal(mage.caracs.Int, 52);
  assert.equal(mage.caracs.FM, 45);
  assert.equal(mage.hp, 60);
  assert.ok(mage.traits.includes('Vol (9)'), 'traits du monstre ajoutés');
  assert.equal(mage.extensions.v5.beastForm.name, 'Dragon');
  const marker = mage.extensions.v5.spellEffects.find(e => e.beastFormMarker);
  assert.equal(marker.durationRounds, 4, 'BFM Rounds, pas 40 minutes');
  assert.equal(mage.extensions.v5.beastForm.expiresAtRound, 1 + 4);
  const cast = store.previewSpellExecution('Carreau', { actorId: 'mage', targetIds: ['mage'], sl: 8, locationRoll: 50 });
  assert.equal(cast.ready, false, 'aucun sort sous cette forme');
  await store.expireSpellEffects('mage', { currentRound: 99 });
  const back = person(store, 'mage');
  assert.equal(back.caracs.F, 30);
  assert.equal(back.extensions.v5.beastForm, undefined);
});

// ---------------------------------------------------------------------------------------------------------------------
// A-07 Fléau des Démons
// ---------------------------------------------------------------------------------------------------------------------
const daemon = (id, E, extra = {}) => wizard(id, { camp: 'ennemi', hp: 20, maxHp: 20, tags: ['Démon'], caracs: { CC: 45, CT: 0, F: 45, E, Int: 30, FM: 40, Ag: 40, I: 40, Dex: 30, Soc: 15, M: 4 }, ...extra });

test('A-07 Fléau des Démons — Bmax divisées, restaurées en fin de rencontre par une action MJ annulable, rappel tant qu’elles le sont', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } } }), daemon('d1', 60), daemon('d2', 60, { hp: 6 }));
  assert.deepEqual(daemonbaneReductions(store.listParticipants()), []);
  await store.applySpellExecution('Fléau des Démons', { actorId: 'mage', targetIds: ['d1', 'd2'], sl: 12, overcastChoices: { targets: 1 } });
  assert.equal(person(store, 'd1').maxHp, 10);
  assert.equal(person(store, 'd1').hp, 10);
  const reductions = daemonbaneReductions(store.listParticipants());
  assert.deepEqual(reductions.map(r => [r.id, r.originalMaxHp, r.maxHp]), [['d1', 20, 10], ['d2', 20, 10]]);
  await store.restoreDaemonbaneMaxHp();
  assert.equal(person(store, 'd1').maxHp, 20);
  assert.equal(person(store, 'd1').hp, 10, 'les Blessures ne remontent pas');
  assert.deepEqual(daemonbaneReductions(store.listParticipants()), []);
  await store.undo();
  assert.equal(person(store, 'd1').maxHp, 10, 'restauration annulable');
});

// ---------------------------------------------------------------------------------------------------------------------
// Lames Azurées : Protections magiques de la cible rejouées sur les coups récurrents
// ---------------------------------------------------------------------------------------------------------------------
test('Lames Azurées — les Protections de la cible (d10 saisi par coup, réduction de dégâts) sont rejouées à chaque coup', async () => {
  const warded = wizard('other', { camp: 'ennemi', extensions: { v5: { hasMomentum: true, wards: [{ effectId: 'e', spellName: 'Dôme', threshold: 7, filter: null }], ward: 7 } } });
  const store = await combat(wizard('mage'), warded);
  await store.applySpellExecution('Lames Azurées', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['other'] } });
  const state = JSON.parse(store.getFullJSON());
  const first = previewV5Turn(state);
  const locations = Object.fromEntries(first.requests.filter(r => /Localisation/.test(r.label)).map((r, i) => [r.field, [22, 45, 77][i]]));
  const second = previewV5Turn(state, { inputs: { other: locations } });
  assert.equal(second.status, 'requires-input', 'les d10 de Protection sont demandés, pas devinés');
  const wardRequests = second.requests.filter(r => r.kind === 'd10');
  assert.equal(wardRequests.length, 3, 'un d10 par coup');
  const rolls = [7, 3, 9];
  const inputs = { other: { ...locations, ...Object.fromEntries(wardRequests.map((r, i) => [r.field, rolls[i]])) } };
  const done = previewV5Turn(state, { inputs });
  assert.equal(done.status, 'ready', JSON.stringify(done.requests));
  assert.equal(done.state.combat.participants.find(p => p.id === 'other').hp, 30 - (8 - 3), 'seul le coup au d10 de 3 passe, 8 − BE 3');
  const text = done.state.log.find(row => /Lames Azurées/.test(row.text)).text;
  assert.match(text, /Protection/);
});
