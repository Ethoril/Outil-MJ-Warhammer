import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution, normalizeResolutionInput } from '../../../js/core/resolution.js';
import { appendageCriticalLocation, normalizeHitMorphology, resolveCreatureHitLocation, deriveHitMorphology } from '../../../js/core/v5-hit-morphology.js';
import fs, { readFileSync, readFileSync as readSource } from 'node:fs';
import { buildParticipantFromBestiary } from '../../../js/core/bestiary-profiles.js';
import { createStore } from '../../../js/core/store.js';
import { hitMorphologySelection, isCriticalFateRoll } from '../../../js/ui/resolution-panel.js';
import { mountedRiderEventsFor, mountedRideAnswerFor, planMountedAttack, planMountedDodge } from '../../../js/core/v5-mounted-combat.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decorateBestiaryProfileAction, planBestiaryProfileAbilities, planBestiaryProfileAbility, bestiaryProfileStateImmunity } from '../../../js/core/creature-abilities.js';

describe('morphologie des créatures — caractérisation', () => {
const actor = { id: 'attacker', states: [] };
const target = { id: 'target', hp: 10, caracs: { E: 35 }, armor: { head: 2, body: 1, arms: 2, legs: 2 }, states: [] };

test('F2-G characterization — humanoid location and key remain the current reversed-d100 result', () => {
  const result = previewResolution({
    actor, target, action: { type: 'attack', base: 60, damage: 4, qualities: [] },
    roll: 54, baseRevision: 1
  });
  assert.deepEqual({ roll: result.location.roll, key: result.location.key, name: result.location.name, side: result.location.side }, {
    roll: 45, key: 'BODY', name: 'Corps', side: null
  });
});

test('F2-G characterization — explicitly targeted location keeps its current exact result', () => {
  const result = previewResolution({
    actor, target, action: { type: 'attack', base: 90, damage: 4, qualities: [] },
    v5: { kind: 'ranged', context: { calledShot: true, calledShotLocation: 'rightLeg' } },
    roll: 54, baseRevision: 1
  });
  assert.deepEqual({ roll: result.location.roll, key: result.location.key, name: result.location.name, side: result.location.side, calledShot: result.location.calledShot }, {
    roll: null, key: 'LEG', name: 'Jambe Droite', side: 'right', calledShot: true
  });
});
});

describe('localisations des créatures', () => {
const base = (key, name) => ({ roll: 40, key, name, side: /gauche/i.test(name) ? 'left' : /droit/i.test(name) ? 'right' : null });

test('F2-G — quadrupède : bras et jambes deviennent pattes avant et arrière', () => {
  assert.equal(resolveCreatureHitLocation({ morphology: 'quadrupède', baseLocation: base('ARM', 'Bras Gauche') }).name, 'Patte avant gauche');
  assert.equal(resolveCreatureHitLocation({ morphology: 'quadruped', baseLocation: base('LEG', 'Jambe Droite') }).name, 'Patte arrière droite');
  assert.equal(resolveCreatureHitLocation({ morphology: 'quadruped', baseLocation: base('HEAD', 'Tête') }).key, 'HEAD');
});

test('F2-G — oiseaux : bras devient aile en conservant le côté et la table ARM', () => {
  const wing = resolveCreatureHitLocation({ morphology: 'oiseau', baseLocation: base('ARM', 'Bras Droit') });
  assert.deepEqual({ key: wing.key, side: wing.side, name: wing.name }, { key: 'ARM', side: 'right', name: 'Aile droite' });
});

test('F2-G — serpent : limites inclusives 01–19 tête, 20–100 corps', () => {
  for (const roll of [1, 15, 19]) assert.equal(resolveCreatureHitLocation({ roll, morphology: 'serpent', baseLocation: base('BODY', 'Corps') }).key, 'HEAD');
  for (const roll of [20, 40, 100]) assert.equal(resolveCreatureHitLocation({ roll, morphology: 'snake', baseLocation: base('BODY', 'Corps') }).key, 'BODY');
});

test('F2-G — araignée : limites inclusives 01–09 tête, 10–79 pattes, 80–100 corps', () => {
  for (const roll of [1, 9]) assert.equal(resolveCreatureHitLocation({ roll, morphology: 'araignée', baseLocation: base('BODY', 'Corps') }).key, 'HEAD');
  for (const roll of [10, 40, 79]) assert.equal(resolveCreatureHitLocation({ roll, morphology: 'spider', baseLocation: base('BODY', 'Corps') }).key, 'LEG');
  for (const roll of [80, 100]) assert.equal(resolveCreatureHitLocation({ roll, morphology: 'spider', baseLocation: base('BODY', 'Corps') }).key, 'BODY');
});

test('F2-G — côté des pattes d’araignée conservé ou choisi par le MJ', () => {
  const selected = resolveCreatureHitLocation({ roll: 50, morphology: 'spider', spiderLegSide: 'left', baseLocation: base('BODY', 'Corps') });
  assert.deepEqual({ key: selected.key, name: selected.name, side: selected.side }, { key: 'LEG', name: 'Patte gauche', side: 'left' });
  const rolled = resolveCreatureHitLocation({ roll: 15, morphology: 'spider', spiderLegSide: 'right', baseLocation: base('ARM', 'Bras Gauche') });
  assert.deepEqual({ name: rolled.name, side: rolled.side }, { name: 'Patte gauche', side: 'left' });
});

test('F2-G — forme choisie par le MJ; valeur absente/unknown conserve le lieu humanoïde', () => {
  assert.equal(normalizeHitMorphology('serpent'), 'snake');
  assert.deepEqual(resolveCreatureHitLocation({ roll: 15, morphology: 'quadruped', baseLocation: base('ARM', 'Bras Gauche') }), {
    ...base('ARM', 'Bras Gauche'), name: 'Patte avant gauche'
  });
  const humanoid = base('ARM', 'Bras Gauche');
  assert.equal(resolveCreatureHitLocation({ roll: 15, morphology: null, baseLocation: humanoid }), humanoid);
  assert.equal(resolveCreatureHitLocation({ roll: 15, morphology: 'chimera', baseLocation: humanoid }), humanoid);
});

test('F2-G — appendice sans table dédiée utilise la table de critique du bras', () => {
  assert.deepEqual(appendageCriticalLocation(base('BODY', 'Queue'), 'Queue'), {
    ...base('BODY', 'Queue'), key: 'ARM', appendageCriticalTable: 'ARM'
  });
});
});

describe('morphologie des créatures — intégration', () => {
const library = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };

test('F2-G integration — la morphologie configurée sur un profil est transmise à la résolution', () => {
  const human = library.find(profile => profile.kind === 'profile' && profile.name === 'Human');
  const configured = { ...human, hitMorphology: 'snake' };
  const participant = buildParticipantFromBestiary(configured.id, { library: [configured] });
  assert.equal(participant.extensions.v5.hitMorphology, 'snake');
  const result = previewResolution({
    actor: { id: 'attacker', states: [] }, target: participant,
    action: { type: 'attack', base: 90, damage: 4, qualities: [] }, roll: 4, baseRevision: 1
  });
  assert.equal(result.location.roll, 40);
  assert.deepEqual({ key: result.location.key, name: result.location.name }, { key: 'BODY', name: 'Corps' });
});

test('F2-G integration — profil humanoïde réel et morphologie absente conservent le lieu existant', () => {
  const human = library.find(profile => profile.kind === 'profile' && profile.name === 'Human');
  assert.ok(human, 'profil Human réel du catalogue L06 attendu');
  const participant = buildParticipantFromBestiary(human.id, { library });
  assert.equal(participant.extensions.v5.hitMorphology, undefined);
  const arm = { roll: 30, key: 'ARM', name: 'Bras Gauche', side: 'left' };
  assert.equal(resolveCreatureHitLocation({ roll: 30, morphology: participant.extensions.v5.hitMorphology, baseLocation: arm }), arm);
});

test('F2-G integration — forme explicite du profil remplace toute déduction de nom et garde le participant intact', () => {
  const human = library.find(profile => profile.kind === 'profile' && profile.name === 'Human');
  const configured = { ...human, morphology: 'quadrupède' };
  const participant = buildParticipantFromBestiary(configured.id, { library: [configured] });
  assert.equal(participant.extensions.v5.hitMorphology, 'quadruped');
  const foreleg = resolveCreatureHitLocation({ roll: 30, morphology: participant.extensions.v5.hitMorphology, baseLocation: { roll: 30, key: 'ARM', name: 'Bras Droit', side: 'right' } });
  assert.equal(foreleg.name, 'Patte avant droite');
});

test('F2-G integration — le choix MJ prime sur la morphologie du profil', () => {
  const human = library.find(profile => profile.kind === 'profile' && profile.name === 'Human');
  const configured = { ...human, hitMorphology: 'quadruped' };
  const participant = buildParticipantFromBestiary(configured.id, { library: [configured] });
  const result = previewResolution({
    actor: { id: 'attacker', states: [] }, target: participant,
    action: { type: 'attack', base: 99, damage: 4, qualities: [] },
    v5: { kind: 'melee', context: { hitMorphology: 'snake' } }, roll: 91, baseRevision: 1
  });
  assert.deepEqual({ key: result.location.key, name: result.location.name }, { key: 'HEAD', name: 'Tête' });
});

test('F2-G integration — le choix humanoïde explicite neutralise la morphologie du profil', () => {
  const human = library.find(profile => profile.kind === 'profile' && profile.name === 'Human');
  const configured = { ...human, hitMorphology: 'snake' };
  const participant = buildParticipantFromBestiary(configured.id, { library: [configured] });
  const result = previewResolution({
    actor: { id: 'attacker', states: [] }, target: participant,
    action: { type: 'attack', base: 99, damage: 4, qualities: [] },
    v5: { kind: 'melee', context: { hitMorphology: 'humanoid' } }, roll: 4, baseRevision: 1
  });
  assert.equal(result.location.key, 'ARM');
  assert.equal(result.location.name, 'Bras Droit');
});

test('F2-G Store — pattes d’araignée acceptent les PA d’arbitrage au lieu de bloquer', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  const actor = { id: 'attacker', name: 'Attaquant', kind: 'PJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 60, F: 30, E: 30 }, skills: [], states: [], equipment: [] };
  const target = { ...buildParticipantFromBestiary(library.find(profile => profile.name === 'Human').id, { library }), id: 'spider', zone: 'active', hp: 10, maxHp: 10, extensions: { v5: { hitMorphology: 'spider' } } };
  await store.addParticipant(actor);
  await store.addParticipant(target);
  const result = store.previewResolution({
    resolutionId: 'f2-g-spider-store', actorId: actor.id, targetId: target.id,
    action: { type: 'attack', base: 99, damage: 4, qualities: [] }, roll: 4,
    v5: { kind: 'melee', context: { spiderLegSide: 'right' } }, protectionContext: { manualAp: 2 }
  });
  assert.deepEqual({ key: result.location.key, name: result.location.name, side: result.location.side }, { key: 'LEG', name: 'Patte droite', side: 'right' });
  assert.equal(result.protection.ap, 2);
  assert.equal(result.unresolved.some(reason => /localisation-requise/.test(reason)), false);
});

test('F2-G integration — app. sans table propre choisit ARM pour les critiques', () => {
  const result = previewResolution({
    actor: { id: 'attacker', states: [] }, target: { id: 'target', hp: 5, maxHp: 5, caracs: { E: 20 }, armor: { head: 0, body: 2, arms: 0, legs: 0 }, states: [] },
    action: { type: 'attack', base: 99, damage: 8, qualities: [] },
    v5: { kind: 'melee', context: { hitAppendage: 'Queue' } }, roll: 77, baseRevision: 1,
    criticalRolls: { location: 30, effect: 40 }
  });
  assert.equal(result.location.key, 'BODY');
  assert.equal(result.location.name, 'Corps');
  assert.equal(result.protection.location, 'body');
  assert.equal(result.critical.details.location.key, 'ARM');
  assert.equal(result.critical.details.location.name, 'Queue');
  assert.equal(result.critical.details.location.appendageCriticalTable, 'ARM');
});

test('F2-G integration — morphologie MJ par cible secondaire passe au Store pour Dispersion', async () => {
  const store = createStore({ persistence: memoryPersistence() }); await store.ready;
  const actor = { id: 'attacker', name: 'Attaquant', kind: 'PJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 60, CT: 60, F: 30, E: 30 }, skills: [], states: [], equipment: [] };
  const main = { ...buildParticipantFromBestiary(library.find(profile => profile.name === 'Human').id, { library }), id: 'main', zone: 'active', hp: 50, maxHp: 50 };
  const secondary = { ...main, id: 'secondary', name: 'Cible secondaire', extensions: { v5: { hitMorphology: 'quadruped' } } };
  await store.addParticipant(actor); await store.addParticipant(main); await store.addParticipant(secondary);
  const preview = store.previewResolution({
    resolutionId: 'f2-g-secondary-morphology', actorId: actor.id, targetId: main.id,
    action: { type: 'attack', attr: 'CT', base: 99, damage: 4, qualities: ['dispersion'] }, roll: 54,
    v5: { kind: 'ranged', context: { spreadRangeBand: 'short', spreadRating: 1, spreadTargetIds: ['main','secondary'], spreadLocationRollsById: { secondary: 15 }, hitMorphologiesById: { secondary: 'snake' } } },
    protectionContext: { manualAp: 0 }
  });
  const secondaryHit = preview.secondaryTargets.find(row => row.participantId === secondary.id);
  assert.equal(secondaryHit.location.key, 'HEAD');
  assert.equal(secondaryHit.location.name, 'Tête');
});

test('F2-G Store — morphologie choisie pour la victime engagée gouverne le Tourbillon', async () => {
  const store=createStore({persistence:memoryPersistence()});await store.ready;
  const actor={id:'a',profileId:'a',name:'Attaquant',kind:'PJ',camp:'pj',zone:'active',hp:40,maxHp:40,caracs:{CC:60,F:40,E:30,Ag:40,I:40},skills:[],states:[],armor:{head:0,body:0,arms:0,legs:0},talents:[{id:'talent-whirlwind-of-death',status:'resolved',rank:1}],extensions:{v5:{resourceCharacterId:'test-a',hasMomentum:false}}};
  const main={id:'b',profileId:'b',name:'Cible principale',kind:'PNJ',camp:'ennemi',zone:'active',hp:40,maxHp:40,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0},states:[],extensions:{v5:{}}};
  const spider={...main,id:'spider',profileId:'spider',name:'Araignée',extensions:{v5:{hitMorphology:'spider'}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],extensions:{v5:{combatId:'f2-g-whirlwind',turnIndex:1}},combat:{round:1,currentActorId:'a',order:['a','b','spider'],participants:[actor,main,spider]},diceLines:[],log:[]});
  await store.setFortune('a',1);
  const preview=store.previewResolution({resolutionId:'f2-g-whirlwind-secondary',actorId:'a',targetId:'b',action:{type:'attack',base:60,attr:'CC',damage:5},roll:11,defense:{base:30,roll:82,v5:{kind:'melee'}},v5:{kind:'melee',context:{specialAttack:'whirlwind-of-death',engagedIds:['b','spider'],allEngagedIncluded:true,hitMorphologiesById:{spider:'snake'}}}});
  const secondary=preview.secondaryTargets.find(row=>row.participantId==='spider');
  assert.deepEqual({key:secondary.location.key,name:secondary.location.name},{key:'HEAD',name:'Tête'});
});

test('F2-G integration — table critique utilise la localisation de la morphologie araignée', () => {
  const result = previewResolution({
    actor: { id: 'attacker', states: [] }, target: { id: 'spider', hp: 20, maxHp: 20, caracs: { E: 20 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], extensions: { v5: { hitMorphology: 'spider' } } },
    action: { type: 'attack', base: 99, damage: 4, qualities: [] }, roll: 11, baseRevision: 1,
    criticalRolls: { location: 40, effect: 40 }
  });
  assert.deepEqual({ key: result.location.key, name: result.location.name }, { key: 'LEG', name: 'Patte gauche' });
  assert.deepEqual({ key: result.critical.details.location.key, name: result.critical.details.location.name }, { key: 'LEG', name: 'Patte droite' });
});

test('F2-L UI — jet de Destin 100 est reconnu comme critique (00)', () => {
  assert.equal(isCriticalFateRoll(100), true);
  assert.equal(isCriticalFateRoll(11), true);
  assert.equal(isCriticalFateRoll(98), false);
  assert.equal(isCriticalFateRoll(0), false);
});

test('F2-G UI — la sélection par cible secondaire montre le profil mais garde la priorité du MJ', () => {
  assert.equal(hitMorphologySelection(undefined,'snake'),'snake');
  assert.equal(hitMorphologySelection('humanoid','snake'),'humanoid');
  assert.equal(hitMorphologySelection('spider','quadruped'),'spider');
});

test('F2-G UI — Tourbillon rend le contrôle par `engagedIds` et conserve sa valeur dans le contexte', () => {
  const source=readFileSync(new URL('../../../js/ui/resolution-panel.js',import.meta.url),'utf8');
  const start=source.indexOf("if(current.specialAttack==='whirlwind-of-death')");
  const end=source.indexOf('const measures=renderV5TalentMeasures',start);
  assert.ok(start>=0&&end>start);
  const block=source.slice(start,end);
  assert.match(block,/current\.engagedIds/);
  assert.match(block,/hitMorphologySelection\(current\.hitMorphologiesById\?\.\[victim\.id\],deriveHitMorphology\(victim\)\)/);
  assert.match(block,/hitMorphologiesById:/);
});
});

describe('reprise morphologie et monture — caractérisation', () => {
const l06 = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;

test('F2-G reprise — le profil réel Araignée géante fournit sa morphologie via le mot-clé', () => {
  const spider = buildParticipantFromBestiary('E0-P-076', { library: l06 });
  assert.equal(deriveHitMorphology(spider), 'spider');
  const result = previewResolution({
    actor: { id: 'attacker', states: [] }, target: spider,
    action: { type: 'attack', base: 90, damage: 4, qualities: [] }, roll: 4, baseRevision: 1
  });
  assert.equal(result.location.key, 'LEG');
});

test('F2-G reprise — les pattes d’araignée utilisent la localisation des jambes', () => {
  const location = resolveCreatureHitLocation({
    roll: 50,
    morphology: 'araignee',
    baseLocation: { roll: 50, key: 'BODY', name: 'Corps', side: null }
  });
  assert.equal(location.key, 'LEG');
  assert.equal(location.name, 'Pattes');
});

test('F2-M reprise — Esquive montée est défavorisée sauf Trick Rider', () => {
  const mounted = { extensions: { v5: { mounted: true } }, talents: [] };
  const trickRider = { ...mounted, talents: [{ id: 'talent-trick-rider', status: 'resolved' }] };
  assert.deepEqual(planMountedDodge(mounted).disadvantageSources.map(row => row.id), ['mounted:dodge']);
  assert.deepEqual(planMountedDodge(trickRider).disadvantageSources, []);
});

test('F2-M reprise — une ancienne monture sans mountId ne bloque pas l’attaque de cavalerie', () => {
  const rider = { id: 'rider', extensions: { v5: { mounted: true } } };
  const plan = planMountedAttack({ actor: rider, target: { id: 'target' }, weapon: { category: 'Cavalerie' } });
  assert.equal(plan.active, true);
  assert.deepEqual(plan.unresolved, []);
  assert.deepEqual(plan.advantageSources, []);
});

test('F2-M reprise — une défense brute d’Ag contre un cavalier reçoit le Désavantage', () => {
  const attacker = { id: 'attacker', states: [] };
  const rider = { id: 'rider', name: 'Cavalier', extensions: { v5: { mounted: true, mountId: 'horse' } }, states: [] };
  const mount = { id: 'horse', name: 'Cheval', zone: 'active', kind: 'Créature', size: 'large', states: [] };
  const preview = previewResolution({
    actor: attacker, target: rider,
    action: { type: 'attack', attr: 'CC', base: 60, damage: 5 }, roll: 41,
    defense: { attr: 'Ag', base: 55, roll: 75 },
    v5: { kind: 'melee' }, v5State: { participants: [attacker, rider, mount] }
  });
  assert.ok(preview.defenderTest.advantage.disadvantage.some(row => row.id === 'mounted:dodge'));
});

test('F2-M contre-vérification — Surpris et Sonné produisent chacun un plan de chute', () => {
  assert.deepEqual(mountedRiderEventsFor(new Set(['surpris','sonne'])), ['rider-surprised','rider-stunned']);
  const source = readSource(new URL('../../../js/core/resolution.js', import.meta.url), 'utf8');
  assert.match(source, /mountedRiderEventsFor, mountedRideAnswerFor/);
  assert.match(source, /mountedRiderEventsFor\(nextConditionKeys\)/);
  assert.match(source, /mountedRiderEventsFor\(actorConditionKeys\)/);
});

test('F2-M contre-vérification — plusieurs plans exigent un d100 par événement', () => {
  assert.deepEqual(mountedRideAnswerFor({ participantId:'rider', event:'rider-stunned', requiredPlanCount:2,
    answersById:{rider:{score:55,roll:40}} }), {});
  assert.deepEqual(mountedRideAnswerFor({ participantId:'rider', event:'rider-stunned', requiredPlanCount:2,
    answersById:{rider:{'rider-stunned':{score:55,roll:71}}} }), {score:55,roll:71});
  const source = readSource(new URL('../../../js/core/resolution.js', import.meta.url), 'utf8');
  assert.match(source, /mountedRideAnswerFor\(\{[^}]*participantId: plan\.participantId/s);
  assert.match(source, /riderAnswer\.roll \?\? \(singlePlan \? context\.mountedRideRollsById/);
});

test('F2-G contre-vérification — changer de cible efface aussi le côté de patte choisi', () => {
  const source = readSource(new URL('../../../js/ui/workspace-view.js', import.meta.url), 'utf8');
  const reset = source.slice(source.indexOf("if ('targetId' in patch)"), source.indexOf('draft.fortuneReroll=false'));
  assert.match(reset, /'spiderLegSide'/);
});

test('F2-G contre-vérification — les victimes secondaires araignées saisissent leur côté de patte', () => {
  const source = readSource(new URL('../../../js/ui/resolution-panel.js', import.meta.url), 'utf8');
  const secondary = source.slice(source.indexOf('const secondaryHitMorphology='), source.indexOf("if(type==='test'&&action?.attr==='F'", source.indexOf('const secondaryHitMorphology=')));
  assert.match(secondary, /spiderLegSidesById/);
  assert.match(secondary, /Araignée/);
});
});

describe('capacités du bestiaire', () => {
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const library = ['L11', 'L18', 'L22', 'L23', 'L24', 'L25'].flatMap(book =>
  JSON.parse(fs.readFileSync(path.join(root, 'js/data/bestiary', `${book}.json`), 'utf8')).profiles
);
const p = profileId => buildParticipantFromBestiary(profileId, { library, idFactory: () => `test-${profileId}` });

test('F2-H weapon qualities only belong to the two named stag profiles', () => {
  const taal = planBestiaryProfileAbility(p('E0-P-001'), 'taal-woods');
  const kurnous = planBestiaryProfileAbility(p('E0-P-002'), 'kurnous-woods');
  assert.deepEqual(taal.effects[0].addQualities, ['Empaleuse', 'Perforante']);
  assert.deepEqual(kurnous.effects[0].addQualities, ['Rapide', 'Empaleuse', 'Perforante']);
  assert.equal(planBestiaryProfileAbility(p('E0-P-002'), 'taal-woods').available, false);
  assert.equal(planBestiaryProfileAbility(p('E0-P-001'), 'kurnous-woods').available, false);
  const actor = p('E0-P-002');
  const decorated = decorateBestiaryProfileAction(actor, { name: 'Antlers', qualities: [] });
  assert.deepEqual(decorated.qualities, ['Rapide', 'Empaleuse', 'Perforante']);
  const resolvedAction = normalizeResolutionInput({ actor, action: actor.actions.find(action => action.name === 'Antlers'), roll: 25 }).action;
  assert.deepEqual(resolvedAction.qualities.map(row => row.id), ['rapide', 'empaleuse', 'perforante']);
  assert.deepEqual(decorateBestiaryProfileAction(p('E0-P-001'), { name: 'Bite', qualities: [] }).qualities, []);
});

test('Arachnarok web poison requires a web hit and the Entangled state', () => {
  const actor = p('E0-P-004');
  assert.deepEqual(planBestiaryProfileAbility(actor, 'arachnarok-venom-webs', { webHit: true }).effects, []);
  assert.deepEqual(planBestiaryProfileAbility(actor, 'arachnarok-venom-webs', { webHit: true }).unresolved.length, 1);
  assert.deepEqual(planBestiaryProfileAbility(actor, 'arachnarok-venom-webs', { webHit: true, entangled: true }).effects, [
    { state: 'Empoisonné', trigger: 'toile de l’Arachnarok ayant Enchevêtré la cible' }
  ]);
  assert.equal(planBestiaryProfileAbility(p('E0-P-744'), 'arachnarok-venom-webs', { webHit: true, entangled: true }).available, false);
});

test('Flying Death Skull only proposes reversion at zero Wounds; ordinary profiles are excluded', () => {
  const skull = p('E0-P-565');
  assert.deepEqual(planBestiaryProfileAbility(skull, 'flying-death-skull-zero-wounds', { wounds: 1 }).effects, []);
  assert.equal(planBestiaryProfileAbility(skull, 'flying-death-skull-zero-wounds', { wounds: 0 }).effects[0].requiresGmConfirmation, true);
  assert.equal(planBestiaryProfileAbility(p('E0-P-566'), 'flying-death-skull-zero-wounds', { wounds: 0 }).available, false);
});

test('F2-H attacks and states are tied to their exact creature profile', () => {
  const spiderProfile = p('E0-P-744');
  const spider = planBestiaryProfileAbility(spiderProfile, 'cliff-spider-lasso');
  assert.ok(spiderProfile.actions.some(action => action.extensions.v5.specialProfileAbility === 'cliff-spider-lasso'));
  assert.match(spider.reminders.join(' '), /40 m/);
  assert.ok(spiderProfile.traits.some(trait => /Venom \(Challenging\)/i.test(trait)));
  assert.deepEqual(spider.effects, []);
  assert.equal(planBestiaryProfileAbility(p('E0-P-004'), 'cliff-spider-lasso').available, false);

  const cat = planBestiaryProfileAbility(p('E0-P-792'), 'great-cat-deathblow');
  assert.deepEqual(cat.effects, [{ addTrait: 'Coup mortel', ignoresSize: true }]);
  assert.equal(planBestiaryProfileAbility(p('E0-P-807'), 'great-cat-deathblow').available, false);
  assert.equal(decorateBestiaryProfileAction(p('E0-P-792'), { name: 'Claw', qualities: [] }).extensions.v5.deathblow, true);

  const spit = planBestiaryProfileAbility(p('E0-P-807'), 'farmyard-beast-spit');
  assert.ok(p('E0-P-807').actions.some(action => action.extensions.v5.specialProfileAbility === 'farmyard-beast-spit'));
  assert.deepEqual(spit.effects, [{ attack: 'Crachat', rangeYards: 3, test: 'CT', onHitTest: 'Résistance +0', onFailure: 'Empoisonné' }]);
  assert.equal(planBestiaryProfileAbility(p('E0-P-792'), 'farmyard-beast-spit').available, false);
});

test('Gargantuan ship rules stay a reminder and the living target needs to be grappled for discharge', () => {
  const actor = p('E0-P-910');
  const plan = planBestiaryProfileAbility(actor, 'gargantuan-electric-discharge', { targetGrappled: true });
  assert.equal(plan.effects[0].damage, 10);
  assert.equal(plan.effects[0].ignoresArmour, 'métal non magique');
  assert.match(planBestiaryProfileAbilities(actor).flatMap(item => item.reminders).join(' '), /navire/);
  assert.deepEqual(planBestiaryProfileAbility(actor, 'gargantuan-electric-discharge').effects, []);
  assert.equal(planBestiaryProfileAbility(p('E0-P-916'), 'gargantuan-electric-discharge', { targetGrappled: true }).available, false);
});

test('Sea Elemental immersion, fire immunity, and casting use only its profile', () => {
  const actor = p('E0-P-909');
  assert.ok(actor.actions.some(action => action.extensions.v5.specialProfileAbility === 'sea-elemental-immersion'));
  assert.deepEqual(planBestiaryProfileAbility(actor, 'sea-elemental-immersion', { entangled: false }).effects, []);
  const immersed = planBestiaryProfileAbility(actor, 'sea-elemental-immersion', { entangled: true });
  assert.equal(immersed.effects[0].effect, 'suffocation');
  assert.equal(immersed.effects[0].grappleMustBeMaintained, false);
  assert.equal(planBestiaryProfileAbility(actor, 'sea-elemental-fire-immunity').effects[0].immuneToState, 'Enflammé');
  assert.equal(bestiaryProfileStateImmunity(actor, 'enflamme'), true);
  assert.equal(planBestiaryProfileAbility(actor, 'sea-elemental-strength-casting').effects[0].castingCharacteristic, 'F');
  assert.equal(bestiaryProfileStateImmunity(p('E0-P-910'), 'enflamme'), false);
});

test('Gargantuan and Black Leviathan resolve non-ship clauses while ship clauses remain reminders', () => {
  const gargantuan = p('E0-P-910');
  const shock = planBestiaryProfileAbility(gargantuan, 'gargantuan-electric-discharge', {
    targetGrappled: true, targetEnduranceSuccess: false, selfEnduranceSuccess: false
  });
  assert.equal(shock.effects.find(effect => effect.damage)?.damage, 10);
  assert.ok(shock.effects.some(effect => effect.state === 'sonne'));
  assert.ok(shock.effects.some(effect => effect.state === 'extenue'));
  const fatigued = planBestiaryProfileAbility(gargantuan, 'gargantuan-electric-discharge', { targetGrappled: true, fatigued: true, selfEnduranceSuccess: true });
  assert.equal(fatigued.effects.find(effect => effect.damage)?.damage, 6);
  assert.match(planBestiaryProfileAbility(gargantuan, 'gargantuan-ship-reminder').reminders[0], /non modélisée/);

  const leviathan = p('E0-P-916');
  assert.equal(planBestiaryProfileAbility(leviathan, 'black-leviathan-fire', { fireSize: 'torch' }).effects[0].mayBeScared, false);
  assert.equal(planBestiaryProfileAbility(leviathan, 'black-leviathan-fire', { fireSize: 'bonfire' }).effects[0].mayBeScared, true);
  assert.match(planBestiaryProfileAbility(leviathan, 'black-leviathan-ship-reminder').reminders[0], /non modélisée/);
  assert.equal(planBestiaryProfileAbility(gargantuan, 'black-leviathan-fire', { fireSize: 'bonfire' }).available, false);
});

test('Cliff Spider profile resolves appendage hits to legs', () => {
  const spider = p('E0-P-744');
  assert.equal(deriveHitMorphology(spider), 'spider');
  assert.deepEqual(resolveCreatureHitLocation({ roll: 40, morphology: deriveHitMorphology(spider), baseLocation: { key: 'ARM', name: 'Bras gauche' } }), {
    key: 'LEG', name: 'Patte gauche', side: 'left'
  });
});

test('F2-H resolution proposes the Farmyard Beast poison only after a failed resistance test', () => {
  const actor = { ...p('E0-P-807'), id: 'farmyard', zone: 'active', hp: 12, maxHp: 12 };
  const target = { id: 'target', name: 'Cible', kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 20, maxHp: 20, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] };
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'farmyard-beast-spit');
  const preview = previewResolution({ resolutionId: 'f2h-farmyard', baseRevision: 0, actor, target, action, roll: 10,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'ranged', context: { f2h: { farmyardResistance: 'fail' } } } });
  assert.equal(preview.hit, true);
  assert.ok(preview.targetConditionApplication.some(row => row.key === 'empoisonne' && row.source?.ability === 'farmyard-beast-spit'));
  assert.deepEqual(preview.unresolved, []);
});

test('Tiger Claws links the actual Taggees Brawling source skill and rejects a missing link', () => {
  const actor = { ...p('E0-P-872'), id: 'taggees' };
  const action = actor.actions.find(row => row.name === 'Tiger Claws');
  const normalized = normalizeResolutionInput({ actor, action, roll: 20 });
  assert.equal(normalized.action.base, 61);
  assert.equal(normalized.action.attr, 'CC');
  assert.equal(normalized.action.extensions.fiche.skillId, actor.skills.find(row => row.sourceName === 'Melee (Brawling)').id);
  assert.throws(() => normalizeResolutionInput({ actor: { ...actor, skills: actor.skills.filter(row => row.sourceName !== 'Melee (Brawling)') }, action, roll: 20 }), { code: 'SKILL_LINK_REQUIRED' });
});

test('Store application persists Farmyard Beast poison on a failed resistance test', async () => {
  const actor = { ...p('E0-P-807'), id: 'farmyard-store', camp: 'ennemi', zone: 'active', hp: 12, maxHp: 12 };
  const target = { id: 'target-store', name: 'Cible', kind: 'PNJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] };
  const persistence = { async load() { return null; }, async saveAtomic() { return { ok: true }; } };
  const store = createStore({ persistence }); await store.ready;
  await store.addParticipant(actor); await store.addParticipant(target);
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'farmyard-beast-spit');
  const preview = store.previewResolution({ resolutionId: 'f2h-farmyard-store', actorId: actor.id, targetId: target.id, action, roll: 10,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'ranged', context: { f2h: { farmyardResistance: 'fail' } } } });
  assert.equal(preview.hit, true, JSON.stringify(preview.unresolved));
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', applied.reason || JSON.stringify({ choiceRequired: preview.choiceRequired, choices: preview.choices, unresolved: preview.unresolved }));
  assert.ok(store.listParticipants().find(row => row.id === target.id).states.some(row => row.key === 'empoisonne'));
});

test('Gargantuan discharge applies wound and Endurance outcomes and spends its Momentum', async () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-store', camp: 'ennemi', zone: 'active', hp: 80, maxHp: 80, extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const target = { id: 'target-garg', name: 'Agrippé', kind: 'PNJ', camp: 'pj', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] };
  const persistence = { async load() { return null; }, async saveAtomic() { return { ok: true }; } };
  const store = createStore({ persistence }); await store.ready;
  await store.addParticipant(actor); await store.addParticipant(target);
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  const preview = store.previewResolution({ resolutionId: 'f2h-gargantuan-discharge', actorId: actor.id, targetId: target.id, action, roll: 23,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: { f2h: { targetGrappled: true, targetEnduranceSuccess: false, selfEnduranceSuccess: false } } } });
  assert.ok(preview.damage?.finalDamage > 0, JSON.stringify(preview.unresolved));
  assert.equal(preview.momentum.find(row => row.participantId === actor.id)?.after, false);
  assert.deepEqual(preview.unresolved, []);
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', JSON.stringify({ reason: applied.reason, choiceRequired: preview.choiceRequired, unresolved: preview.unresolved, critical: preview.critical, protection: preview.protection, mechanicalWarnings: preview.mechanicalWarnings }));
  const afterTarget = store.listParticipants().find(row => row.id === target.id);
  const afterActor = store.listParticipants().find(row => row.id === actor.id);
  assert.equal(afterTarget.hp, target.hp - preview.damage.finalDamage);
  assert.ok(afterTarget.states.some(row => row.key === 'sonne'));
  assert.ok(afterActor.states.some(row => row.key === 'extenue'));
  assert.equal(afterActor.extensions.v5.hasMomentum, false);
});

test('Merwyrm bite, Black Leviathan, Wulfrik and Gravelord remain profile-scoped', () => {
  assert.deepEqual(planBestiaryProfileAbility(p('E0-P-913'), 'merwyrm-fanged-maw-venom').effects, [
    { attack: 'Fanged Maw', addTrait: 'Venin (Difficile)' }
  ]);
  assert.deepEqual(decorateBestiaryProfileAction(p('E0-P-913'), { name: 'Fanged Maw', qualities: [] }).qualities[0], { id: 'venin', name: 'Venin', parameter: 'Difficile' });
  assert.equal(planBestiaryProfileAbility(p('E0-P-057'), 'merwyrm-fanged-maw-venom').available, false);
  assert.ok(planBestiaryProfileAbility(p('E0-P-916'), 'black-leviathan-ship-reminder').reminders[0].includes('non modélisée'));
  assert.deepEqual(planBestiaryProfileAbility({ name: 'Hans Grüber' }, 'gravelord-variants').effects, []);
  assert.equal(planBestiaryProfileAbility(p('E0-P-921'), 'wulfrik-head-taker', { critical: true }).effects[0].chooseCriticalTable, 'Head Critical Wounds');
  assert.equal(planBestiaryProfileAbility(p('E0-P-921'), 'wulfrik-champion-slayer', { singleCombatLeader: true }).effects[0].momentum, 1);
  assert.equal(planBestiaryProfileAbility(p('E0-P-916'), 'wulfrik-head-taker', { critical: true }).available, false);
});

test('Gargantuan discharge ignores non-magical metal armour only (L25 p.143)', () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-armour', camp: 'ennemi', zone: 'active', hp: 80, maxHp: 80, extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const discharge = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  const teeth = actor.actions.find(row => row.name === 'Razor-sharp Teeth');
  const piece = (id, category) => ({ id, name: id, kind: 'armour', category, ap: 3, layer: 'rigid', locations: ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'], keywords: [] });
  const run = (equipment, action) => previewResolution({ resolutionId: `garg-armour-${equipment[0].id}-${action.name}`, baseRevision: 0, actor,
    target: { id: 'grappled', name: 'Agrippé', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 0 }, equipment, states: [] },
    action, roll: 23, defense: { base: 20, roll: 95, v5: { kind: 'test' } },
    v5: { kind: 'melee', context: { f2h: { targetGrappled: true, targetEnduranceSuccess: true, selfEnduranceSuccess: true } } } });
  const mail = run([piece('mail', 'Mailles')], discharge);
  assert.ok(mail.protection.ignored.some(row => row.item.id === 'mail'), 'mail is ignored by the discharge');
  const magic = run([piece('magic', 'Magique et Unique')], discharge);
  assert.ok(!magic.protection.ignored.some(row => row.item.id === 'magic'), 'magical armour still protects');
  assert.equal(magic.damage.finalDamage, mail.damage.finalDamage - 3);
  const bite = run([piece('mail', 'Mailles')], teeth);
  assert.ok(!bite.protection.ignored.some(row => row.item.id === 'mail'), 'ordinary bites keep the armour');
});

test('Sea Elemental immersion and Cliff Spider lasso entangle with the creature Strength (L25 p.142, MJ 28/10)', () => {
  const target = { id: 'victim', name: 'Victime', zone: 'active', hp: 30, maxHp: 30, caracs: { E: 30 }, equipment: [], states: [] };
  const sea = { ...p('E0-P-909'), id: 'sea', zone: 'active' };
  const immersion = sea.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'sea-elemental-immersion');
  const immersed = previewResolution({ resolutionId: 'sea-strength', baseRevision: 0, actor: sea, target, action: immersion, roll: 10,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: {} } });
  assert.equal(immersed.targetConditionApplication.find(row => row.key === 'enchevetre')?.strength, 59);
  const spider = { ...p('E0-P-744'), id: 'spider', zone: 'active' };
  const lasso = spider.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'cliff-spider-lasso');
  const caught = previewResolution({ resolutionId: 'spider-strength', baseRevision: 0, actor: spider, target, action: lasso, roll: 10,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'ranged', context: { f2h: { cliffSpiderFailureSL: 2 } } } });
  const entangled = caught.targetConditionApplication.find(row => row.key === 'enchevetre');
  assert.equal(entangled?.strength, 45);
  assert.equal(entangled?.level, 7, 'one Entangled per SL of the failed Dodge (20 vs 95)');
});

test('Immersion, silk lasso and spit inflict no Wounds nor Critical, the Gargantuan bite still does', () => {
  const target = { id: 'victim', name: 'Victime', zone: 'active', hp: 30, maxHp: 30, caracs: { E: 30 }, equipment: [], states: [] };
  const run = (profileId, key, kind, f2h = {}) => {
    const actor = { ...p(profileId), id: `actor-${profileId}`, zone: 'active' };
    const action = key ? actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === key) : actor.actions.find(row => row.name === 'Razor-sharp Teeth');
    return previewResolution({ resolutionId: `nodmg-${profileId}-${key}`, baseRevision: 0, actor, target, action, roll: 10,
      defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind, context: { f2h } } });
  };
  for (const [profileId, key, kind, f2h] of [['E0-P-909', 'sea-elemental-immersion', 'melee'], ['E0-P-744', 'cliff-spider-lasso', 'ranged', { cliffSpiderFailureSL: 1 }], ['E0-P-807', 'farmyard-beast-spit', 'ranged', { farmyardResistance: 'fail' }]]) {
    const preview = run(profileId, key, kind, f2h);
    assert.equal(preview.hit, true, key);
    assert.equal(preview.damage, null, `${key} inflicts no Wounds`);
    assert.ok(!preview.critical, `${key} triggers no Critical`);
    assert.ok(preview.targetConditionApplication.length > 0, `${key} still applies its state`);
  }
  assert.ok(run('E0-P-910', null, 'melee').damage?.finalDamage > 0, 'ordinary bite keeps its damage');
});

test('Gargantuan discharge keeps its Momentum cost even when the Gargantuan would win the opposition', () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-cost', camp: 'ennemi', zone: 'active', hp: 80, maxHp: 80, extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  const preview = previewResolution({ resolutionId: 'garg-cost', baseRevision: 0, actor,
    target: { id: 'held', name: 'Agrippé', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, equipment: [], states: [] },
    action, roll: 23, defense: { base: 20, roll: 95, v5: { kind: 'melee' } },
    v5: { kind: 'melee', context: { f2h: { targetGrappled: true, targetEnduranceSuccess: true, selfEnduranceSuccess: true } } } });
  const trace = preview.momentum.find(row => row.participantId === actor.id);
  assert.equal(trace.after, false, JSON.stringify(trace.details));
  assert.ok(!trace.details.some(row => row.effect === 'gain'));
});

test('An Exhausted Gargantuan discharges for 6 Damage (L25 p.143)', () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-tired', zone: 'active', hp: 80, maxHp: 80, states: [{ id: 'tired', key: 'extenue', name: 'Exténué', level: 1 }], extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  assert.equal(normalizeResolutionInput({ actor, action, roll: 23 }).action.damage, 6);
});

test('Sea Elemental casts and channels with Strength, its BF standing for BI and BFM (MJ 28/10)', async () => {
  const { resolveCastingSkill } = await import('../../../js/core/v5-magic-casting.js');
  const { resolveChannellingSkill } = await import('../../../js/core/v5-magic-channelling.js');
  const sea = p('E0-P-909');
  const bf = Math.floor(sea.caracs.F / 10);
  const cast = resolveCastingSkill(sea);
  assert.equal(cast.carac, 'F');
  assert.equal(cast.bi, bf);
  assert.equal(cast.bfm, bf);
  const channel = resolveChannellingSkill(sea);
  assert.equal(channel.carac, 'F');
  assert.equal(channel.bfm, bf);
  const other = p('E0-P-910');
  assert.equal(resolveCastingSkill(other).bi, Math.floor((other.caracs.Int || 0) / 10));
});

test('Wulfrik Champion Slayer gains Momentum once per duel, re-armed by the GM (MJ 28/10)', async () => {
  const built = p('E0-P-921');
  const actor = { ...built, talents: [], id: 'wulfrik', camp: 'ennemi', zone: 'active', extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: false } } };
  const target = { id: 'champion', name: 'Champion', kind: 'PNJ', camp: 'pj', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] };
  const persistence = { async load() { return null; }, async saveAtomic() { return { ok: true }; } };
  const store = createStore({ persistence }); await store.ready;
  await store.addParticipant(actor); await store.addParticipant(target);
  const attack = actor.actions.find(row => row.type === 'attack');
  const gains = id => (store.previewResolution({ resolutionId: id, actorId: actor.id, targetId: target.id, action: attack, roll: 15,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: { f2h: { singleCombatLeader: true, ...(id === 'rearm' ? { championSlayerRearm: true } : {}) } } } }));
  const first = gains('first');
  assert.ok(first.momentum.find(row => row.participantId === actor.id).details.some(row => row.eventId.endsWith(':profileMomentumGain')));
  const firstApplied = await store.applyResolution(first);
  assert.equal(firstApplied.status, 'applied', JSON.stringify({ reason: firstApplied.reason, unresolved: first.unresolved, choice: first.choiceRequired, hit: first.hit }));
  assert.deepEqual(store.listParticipants().find(row => row.id === actor.id).extensions.v5.championSlayerDuels, [target.id]);
  const second = gains('second');
  assert.ok(!second.momentum.find(row => row.participantId === actor.id).details.some(row => row.eventId.endsWith(':profileMomentumGain')));
  assert.ok(second.reminders.some(text => /déjà gagné/.test(text)));
  // Réarmé, le duel n'est plus marqué « déjà gagné » ; Wulfrik tient encore l'Élan du premier gain, donc rien à regagner (F10).
  const rearmed = gains('rearm');
  assert.ok(!rearmed.reminders.some(text => /déjà gagné/.test(text)));
  assert.equal(rearmed.championSlayerDuel, null);
});

test('Great cat Deathblow triggers on every successful melee hit, whatever the Size (L23 p.87)', () => {
  const cat = { ...p('E0-P-792'), id: 'great-cat', zone: 'active' };
  const claw = cat.actions.find(row => row.type === 'attack' && row.attr === 'CC');
  const run = (actor, action, roll) => previewResolution({ resolutionId: `deathblow-${actor.id}-${roll}`, baseRevision: 0, actor, action, roll,
    target: { id: 'prey', name: 'Proie', zone: 'active', hp: 60, maxHp: 60, caracs: { E: 30 }, equipment: [], states: [] },
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: {} } });
  const hit = run(cat, claw, 10);
  assert.equal(hit.hit, true);
  assert.equal(hit.deathblow?.maxChain, Math.floor(cat.caracs.CC / 10));
  assert.ok(hit.reminders.some(text => /Frappe mortelle/.test(text)));
  assert.ok(hit.reminders.some(text => text.includes('Chaque bond vise une créature différente, jamais deux fois la même (V4 p.160, L23 p.87)')), 'le rappel garde la règle des cibles distinctes');
  assert.equal(run(cat, claw, 99).deathblow, null, 'a miss never triggers it');
  const other = { ...p('E0-P-807'), id: 'farm', zone: 'active' };
  assert.equal(run(other, other.actions.find(row => row.type === 'attack' && row.attr === 'CC'), 10).deathblow, null, 'other profiles do not have it');
});

test('Suffocation costs 1 Wound per Round, then Unconscious, then a death proposal after TB Rounds (V5 p.169, MJ 28/10)', async () => {
  const { advanceV5Effects } = await import('../../../js/core/v5-effects.js');
  const victim = { id: 'drowning', name: 'Noyé', hp: 2, maxHp: 10, caracs: { E: 30 }, states: [{ id: 'suff', key: 'suffocation', name: 'Suffocation', level: 1 }], extensions: { v5: {} } };
  const r1 = advanceV5Effects(victim, { phase: 'endOfRound', round: 1 });
  assert.equal(r1.participant.hp, 1);
  const r2 = advanceV5Effects(r1.participant, { phase: 'endOfRound', round: 2 });
  assert.equal(r2.participant.hp, 0);
  assert.ok(r2.participant.states.some(row => row.key === 'inconscient'));
  assert.equal(r2.participant.extensions.v5.suffocationDeathDueRound, 5);
  assert.ok(!r2.death);
  const r4 = advanceV5Effects(r2.participant, { phase: 'endOfRound', round: 4 });
  assert.ok(!r4.death, 'not before TB Rounds');
  const r5 = advanceV5Effects(r4.participant, { phase: 'endOfRound', round: 5 });
  assert.equal(r5.death, true, 'death is proposed, the GM confirms');
  const breathing = advanceV5Effects({ ...victim, states: [] }, { phase: 'endOfRound', round: 1 });
  assert.equal(breathing.participant.hp, 2);
});

test('Store application of the Immersion keeps Suffocation and the Strength 59 Entangled on the victim', async () => {
  const sea = { ...p('E0-P-909'), id: 'sea-store', camp: 'ennemi', zone: 'active' };
  const target = { id: 'swimmer', name: 'Nageur', kind: 'PNJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] };
  const persistence = { async load() { return null; }, async saveAtomic() { return { ok: true }; } };
  const store = createStore({ persistence }); await store.ready;
  await store.addParticipant(sea); await store.addParticipant(target);
  const action = sea.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'sea-elemental-immersion');
  const preview = store.previewResolution({ resolutionId: 'immersion-store', actorId: sea.id, targetId: target.id, action, roll: 10,
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: {} } });
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', JSON.stringify({ reason: applied.reason, unresolved: preview.unresolved }));
  const after = store.listParticipants().find(row => row.id === target.id);
  assert.equal(after.hp, 20);
  assert.ok(after.states.some(row => row.key === 'suffocation'));
  assert.equal(after.states.find(row => row.key === 'enchevetre')?.strength, 59);
});

test('Gravelord options follow Hans Grüber whatever the Unicode form of his name (L18 p.113)', () => {
  const nfd = planBestiaryProfileAbility({ name: 'Hans Gru\u0308ber' }, 'gravelord-variants');
  assert.notEqual(nfd.available, false);
  assert.match(nfd.reminders.join(' '), /Fantôme.*Banshee.*Instable.*Volonté/);
  assert.equal(planBestiaryProfileAbilities({ name: 'Hans Gru\u0308ber' }).length, 1);
  assert.equal(planBestiaryProfileAbility({ name: 'Wizard' }, 'gravelord-variants').available, false);
});

test('The discharge plan follows only the discharge action, never the Gargantuan bite', () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-bite', zone: 'active', extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const teeth = actor.actions.find(row => row.name === 'Razor-sharp Teeth');
  const preview = previewResolution({ resolutionId: 'garg-bite-plan', baseRevision: 0, actor, action: teeth, roll: 10,
    target: { id: 'held', name: 'Agrippé', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, equipment: [], states: [] },
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: { f2h: { targetGrappled: true } } } });
  assert.ok(!preview.unresolved.some(text => /Décharge/.test(text)), JSON.stringify(preview.unresolved));
  assert.ok(!preview.profileAbilityPlans.some(plan => plan.effects.some(effect => effect.damage)));
  const discharge = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  const shock = previewResolution({ resolutionId: 'garg-discharge-plan', baseRevision: 0, actor, action: discharge, roll: 10,
    target: { id: 'held', name: 'Agrippé', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, equipment: [], states: [] },
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: { f2h: { targetGrappled: true } } } });
  const prompts = shock.unresolved.filter(text => /Endurance Moyenne/.test(text));
  assert.equal(prompts.length, 1, JSON.stringify(shock.unresolved));
});

test('Sea Elemental Ablaze immunity is a central condition immunity, whatever the source', async () => {
  const { acquireV5Conditions } = await import('../../../js/core/v5-effects.js');
  const sea = p('E0-P-909');
  assert.deepEqual(sea.extensions.v5.immunities.conditions, ['enflamme']);
  const receipt = acquireV5Conditions(sea, [{ name: 'Enflammé', level: 2, source: { kind: 'spell' } }], { resolutionId: 'fireball', round: 1 });
  assert.ok(receipt.reminders.some(text => /Immunité/.test(text)), JSON.stringify(receipt).slice(0, 300));
  assert.equal(receipt.acquiredInstances, 0);
  assert.equal(p('E0-P-910').extensions.v5.immunities, undefined);
});

test('Silk lasso needs no attack roll: only the target Dodge decides (L22 p.73)', () => {
  const spider = { ...p('E0-P-744'), id: 'spider-dodge', zone: 'active' };
  const lasso = spider.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'cliff-spider-lasso');
  const target = { id: 'dodger', name: 'Esquiveur', zone: 'active', hp: 30, maxHp: 30, caracs: { E: 30 }, equipment: [], states: [] };
  const run = (roll, dodgeRoll) => previewResolution({ resolutionId: `lasso-${roll}-${dodgeRoll}`, baseRevision: 0, actor: spider, target, action: lasso, roll,
    defense: { base: 40, roll: dodgeRoll, v5: { kind: 'test' } }, v5: { kind: 'ranged', context: {} } });
  const missedShot = run(99, 41);
  assert.equal(missedShot.targetConditionApplication.find(row => row.key === 'enchevetre')?.level, 1, 'failed Dodge by 0 SL still gives one Entangled, even if the CT roll failed');
  const dodged = run(10, 20);
  assert.ok(!dodged.targetConditionApplication.some(row => row.key === 'enchevetre'));
  assert.ok(dodged.reminders.some(text => /Esquive réussie/.test(text)));
});

test('A Flying Death Skull brought to 0 Wounds proposes its reversion to an ordinary skull (L18 p.107)', () => {
  const skull = { ...p('E0-P-565'), id: 'skull', zone: 'active', hp: 3, maxHp: 3 };
  const actor = { id: 'hero', name: 'Héros', zone: 'active', caracs: { CC: 60, F: 40 }, skills: [], equipment: [], states: [] };
  const run = damage => previewResolution({ resolutionId: 'skull-' + damage, baseRevision: 0, actor, target: skull,
    action: { type: 'attack', name: 'Épée', base: 60, damage, qualities: [] }, roll: 10,
    defense: { base: 10, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: {} } });
  const killed = run(20).profileAbilityPlans.find(plan => plan.key === 'flying-death-skull-zero-wounds');
  assert.equal(killed.effects[0]?.transformation, 'crâne ordinaire');
  const scratched = run(-20).profileAbilityPlans.find(plan => plan.key === 'flying-death-skull-zero-wounds');
  assert.deepEqual(scratched.effects, []);
});

test('Cutting the silk ends only the lasso Entangled, after a confirmed slashing blow over 5 Damage (L22 p.73)', async () => {
  const { recoverV5Condition } = await import('../../../js/core/v5-effects.js');
  const { recoveryMethodsFor } = await import('../../../js/ui/v5-effect-dialog.js');
  const lasso = { id: 'silk', key: 'enchevetre', name: 'Enchevêtré', level: 3, strength: 45, source: { kind: 'bestiary-profile', ability: 'cliff-spider-lasso' } };
  const net = { id: 'net', key: 'enchevetre', name: 'Enchevêtré', level: 1, source: { kind: 'weapon' } };
  const victim = { id: 'caught', name: 'Pris', hp: 10, maxHp: 10, caracs: { E: 30, F: 30 }, states: [lasso, net], extensions: { v5: {} } };
  assert.ok(recoveryMethodsFor(lasso).some(([id]) => id === 'cut-silk'));
  assert.ok(!recoveryMethodsFor(net).some(([id]) => id === 'cut-silk'));
  const asked = recoverV5Condition(victim, 'silk', { method: 'cut-silk' });
  assert.ok(asked.needsInput.some(row => row.field === 'silkCut'));
  const cut = recoverV5Condition(victim, 'silk', { method: 'cut-silk', silkCut: true });
  assert.deepEqual(cut.participant.states.map(row => row.id), ['net']);
});

test('Gargantuan discharge needs no attack nor defence roll and deals a flat 10 without SL (L25 p.143)', () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-flat', zone: 'active', hp: 80, maxHp: 80, extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  const target = { id: 'held-flat', name: 'Agrippé', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 0 }, equipment: [], states: [] };
  for (const roll of [5, 96]) {
    const preview = previewResolution({ resolutionId: 'garg-flat-' + roll, baseRevision: 0, actor, target, action, roll,
      v5: { kind: 'melee', context: { f2h: { targetGrappled: true, targetEnduranceSuccess: true, selfEnduranceSuccess: true } } } });
    assert.equal(preview.hit, true, JSON.stringify(preview.unresolved));
    assert.equal(preview.damage?.finalDamage, 10, 'no SL, no Strength Bonus, no armour on this target');
    assert.ok(!preview.critical, 'no Critical from the roll');
    assert.ok(!preview.unresolved.some(text => /défense/i.test(text)), JSON.stringify(preview.unresolved));
  }
});

test('Gravelord options follow the imported Grüber profile E0-P-569 even under its "Wizard" name', () => {
  const gruber = p('E0-P-569');
  assert.equal(gruber.name.startsWith('Wizard') || gruber.name.startsWith('Sorcier'), true);
  assert.ok(planBestiaryProfileAbilities(gruber).some(plan => plan.key === 'gravelord-variants'));
  assert.ok(planBestiaryProfileAbilities({ name: ' Hans Grüber ' }).some(plan => plan.key === 'gravelord-variants'));
  assert.ok(!planBestiaryProfileAbilities(p('E0-P-565')).some(plan => plan.key === 'gravelord-variants'));
});

test('Sea Elemental keeps its Ablaze immunity after spell layers rewrite its immunities (M1)', async () => {
  const { acquireV5Conditions } = await import('../../../js/core/v5-effects.js');
  const sea = p('E0-P-909');
  const rewritten = { ...sea, extensions: { ...sea.extensions, v5: { ...sea.extensions.v5, immunities: { conditions: ['sonne'] } } } };
  const receipt = acquireV5Conditions(rewritten, [{ name: 'Enflammé', level: 1, source: { kind: 'spell' } }], { resolutionId: 'after-layer', round: 1 });
  assert.equal(receipt.acquiredInstances, 0);
  const other = acquireV5Conditions(p('E0-P-910'), [{ name: 'Enflammé', level: 1, source: { kind: 'spell' } }], { resolutionId: 'garg-fire', round: 1 });
  assert.equal(other.acquiredInstances, 1);
});

test('Escaping the Immersion also ends its Suffocation, and the death countdown is cleared (M2)', async () => {
  const { recoverV5Condition } = await import('../../../js/core/v5-effects.js');
  const source = { kind: 'bestiary-profile', ability: 'sea-elemental-immersion' };
  const victim = { id: 'held-water', name: 'Immergé', hp: 3, maxHp: 10, caracs: { E: 30, F: 30 }, extensions: { v5: { suffocationDeathDueRound: 9 } },
    states: [{ id: 'imm-ent', key: 'enchevetre', name: 'Enchevêtré', level: 1, strength: 59, source }, { id: 'imm-suf', key: 'suffocation', name: 'Suffocation', level: 1, source }] };
  const escaped = recoverV5Condition(victim, 'imm-ent', { method: 'opposed-strength', test: { success: true, sl: 1 } });
  assert.deepEqual(escaped.participant.states, []);
  assert.equal(escaped.participant.extensions.v5.suffocationDeathDueRound, undefined);
  const surfaced = recoverV5Condition({ ...victim, states: [victim.states[1]] }, 'imm-suf', { method: 'cause-ended', causeEnded: true });
  assert.deepEqual(surfaced.participant.states, []);
});

test('Escaping the Immersion Entangled ends its Suffocation even when a net Entangled remains', async () => {
  const { recoverV5Condition } = await import('../../../js/core/v5-effects.js');
  const source = { kind: 'bestiary-profile', ability: 'sea-elemental-immersion' };
  const victim = { id: 'held-net', name: 'Immergé', hp: 3, maxHp: 10, caracs: { E: 30, F: 30 }, extensions: { v5: {} },
    states: [{ id: 'imm-ent', key: 'enchevetre', name: 'Enchevêtré', level: 1, strength: 59, source }, { id: 'net-ent', key: 'enchevetre', name: 'Enchevêtré', level: 1, source: { kind: 'item' } }, { id: 'imm-suf', key: 'suffocation', name: 'Suffocation', level: 1, source }] };
  const escaped = recoverV5Condition(victim, 'imm-ent', { method: 'opposed-strength', test: { success: true, sl: 1 } });
  assert.deepEqual(escaped.participant.states.map(state => state.id), ['net-ent']);
});

test('Suffocation countdown starts on an already Unconscious victim and a stale countdown is cleared (M3)', async () => {
  const { advanceV5Effects } = await import('../../../js/core/v5-effects.js');
  const suffocating = { id: 'suf', key: 'suffocation', name: 'Suffocation', level: 1 };
  const out = { id: 'ko', key: 'inconscient', name: 'Inconscient', level: 1 };
  const already = advanceV5Effects({ id: 'ko-victim', name: 'KO', hp: 0, maxHp: 10, caracs: { E: 30 }, states: [suffocating, out], extensions: { v5: {} } }, { phase: 'endOfRound', round: 4 });
  assert.equal(already.participant.extensions.v5.suffocationDeathDueRound, 7);
  assert.ok(!already.death);
  const stale = advanceV5Effects({ id: 'old', name: 'Ancien', hp: 5, maxHp: 10, caracs: { E: 30 }, states: [], extensions: { v5: { suffocationDeathDueRound: 4 } } }, { phase: 'endOfRound', round: 20 });
  assert.equal(stale.participant.extensions.v5.suffocationDeathDueRound, undefined);
});

test('Sea Elemental spell formulas, overcast reminders and dispel range read its Strength (M4)', async () => {
  const { spellFormulaValue } = await import('../../../js/core/v5-magic-effects.js');
  const { specificOvercastReminder } = await import('../../../js/core/v5-magic-overcast-options.js');
  const sea = p('E0-P-909');
  const bf = Math.floor(sea.caracs.F / 10);
  assert.equal(spellFormulaValue('BFM', sea), bf);
  assert.equal(spellFormulaValue('FM', sea), sea.caracs.F);
  assert.match(specificOvercastReminder({ reminder: '{bfm}' }, sea), new RegExp(String(bf)));
  const garg = p('E0-P-910');
  assert.equal(spellFormulaValue('BFM', garg), Math.floor(Number(garg.caracs.FM) / 10));
});

test('The Merwyrm venom path never labels another participant venom weapon (F6)', () => {
  const actor = { id: 'poisoner', name: 'Empoisonneur', zone: 'active', caracs: { CC: 60, F: 40 }, skills: [], equipment: [], states: [] };
  const preview = previewResolution({ resolutionId: 'pc-venom', baseRevision: 0, actor,
    target: { id: 'victim-v', name: 'Victime', zone: 'active', hp: 30, maxHp: 30, caracs: { E: 30 }, equipment: [], states: [] },
    action: { type: 'attack', name: 'Dague', base: 60, damage: 6, qualities: [{ id: 'venin', name: 'Venin', parameter: 'Difficile' }] }, roll: 10,
    defense: { base: 10, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: {} } });
  assert.ok(!preview.targetConditionApplication.some(row => row.source?.ability === 'merwyrm-fanged-maw-venom'));
});

test('A profile special action copied onto another participant is refused (F7)', () => {
  const garg = p('E0-P-910');
  const discharge = garg.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  const intruder = { ...p('E0-P-909'), id: 'intruder' };
  assert.throws(() => normalizeResolutionInput({ actor: intruder, action: discharge, roll: 20 }), { code: 'PROFILE_ACTION_NOT_OWNED' });
  assert.doesNotThrow(() => normalizeResolutionInput({ actor: garg, action: discharge, roll: 20 }));
});

test('Head-Taker needs no hit-location roll for its Critical (F1)', () => {
  const built = p('E0-P-921');
  const actor = { ...built, talents: [], id: 'wulfrik-head', zone: 'active' };
  const attack = { ...actor.actions.find(row => row.type === 'attack' && row.attr === 'CC'), base: actor.caracs.CC };
  const preview = previewResolution({ resolutionId: 'head-taker', baseRevision: 0, actor, action: attack, roll: 11,
    target: { id: 'head-victim', name: 'Victime', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, equipment: [], states: [] },
    defense: { base: 10, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: { f2h: { wulfrikHeadCritical: true } } } });
  const critical = preview.critical?.details || preview.critical;
  assert.ok(critical, 'roll 11 is a Critical');
  assert.equal(JSON.stringify(preview.critical).includes('"needsLocation":true'), false, JSON.stringify(preview.critical).slice(0, 300));
  assert.match(JSON.stringify(preview.critical), /HEAD|Tête/);
});

test('The discharge warns when the target armour is a bare number it cannot sort (F3)', () => {
  const built = p('E0-P-910');
  const actor = { ...built, id: 'gargantuan-bare', zone: 'active', extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const action = actor.actions.find(row => row.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge');
  const preview = previewResolution({ resolutionId: 'garg-bare', baseRevision: 0, actor, action, roll: 30,
    target: { id: 'bare', name: 'PNJ', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 0 }, armor: { head: 3, body: 3, arms: 3, legs: 3 }, equipment: [], states: [] },
    v5: { kind: 'melee', context: { f2h: { targetGrappled: true, targetEnduranceSuccess: true, selfEnduranceSuccess: true } } } });
  assert.ok(preview.reminders.some(text => /sans pièces typées/.test(text)), JSON.stringify(preview.reminders));
});

test('Champion Slayer is not spent while Wulfrik already holds Momentum, and target reminders stay relevant (F10 F5)', () => {
  const built = p('E0-P-921');
  const actor = { ...built, talents: [], id: 'wulfrik-full', zone: 'active', extensions: { ...built.extensions, v5: { ...built.extensions.v5, hasMomentum: true } } };
  const attack = { ...actor.actions.find(row => row.type === 'attack' && row.attr === 'CC'), base: actor.caracs.CC };
  const full = previewResolution({ resolutionId: 'slayer-full', baseRevision: 0, actor, action: attack, roll: 15,
    target: { id: 'champ', name: 'Champion', zone: 'active', hp: 40, maxHp: 40, caracs: { E: 30 }, equipment: [], states: [] },
    defense: { base: 20, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: { f2h: { singleCombatLeader: true } } } });
  assert.equal(full.championSlayerDuel, null);
  const hero = { id: 'hero-f5', name: 'Héros', zone: 'active', caracs: { CC: 60, F: 40 }, skills: [], equipment: [], states: [] };
  const sea = { ...p('E0-P-909'), id: 'sea-f5', zone: 'active' };
  const onSea = previewResolution({ resolutionId: 'hit-sea', baseRevision: 0, actor: hero, target: sea,
    action: { type: 'attack', name: 'Épée', base: 60, damage: 6, qualities: [] }, roll: 10,
    defense: { base: 10, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: {} } });
  assert.ok(!onSea.reminders.some(text => /immergé|Suffocation/.test(text)), JSON.stringify(onSea.reminders));
});

test('All three Flying Death Skull profiles revert at 0 Wounds, applied by the Store only after GM confirmation (F4, MJ 28/10)', async () => {
  for (const id of ['E0-P-565', 'E0-P-567', 'E0-P-758']) {
    const skull = { ...p(id), id: 'skull-' + id, name: 'Crâne ' + id, kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 3, maxHp: 3 };
    const hero = { id: 'hero-' + id, name: 'Héros', kind: 'PJ', camp: 'pj', zone: 'active', caracs: { CC: 60, F: 40 }, skills: [], equipment: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 } };
    const persistence = { async load() { return null; }, async saveAtomic() { return { ok: true }; } };
    const store = createStore({ persistence }); await store.ready;
    await store.addParticipant(hero); await store.addParticipant(skull);
    const probe = d => store.previewResolution({ resolutionId: 'probe-' + id, actorId: hero.id, targetId: skull.id,
      action: { type: 'attack', name: 'Épée', base: 60, damage: d, qualities: [] }, roll: 12, defense: { base: 10, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: {} } }).damage;
    const shape = probe(10);
    const exact = 3 - shape.sl + shape.be + shape.paEffectif; // amène le crâne pile à 0, sans excédent ni second critique
    const run = (confirmed, rid) => store.previewResolution({ resolutionId: rid, actorId: hero.id, targetId: skull.id,
      action: { type: 'attack', name: 'Épée', base: 60, damage: exact, qualities: [] }, roll: 12,
      defense: { base: 10, roll: 95, v5: { kind: 'test' } }, v5: { kind: 'melee', context: { f2h: confirmed ? { skullReversionConfirmed: true } : {} } } });
    const asked = run(false, 'ask-' + id);
    assert.equal(asked.skullReversion, null, id);
    assert.ok(asked.reminders.some(text => /Crâne inerte/.test(text)), id);
    const confirmed = run(true, 'yes-' + id);
    const applied = await store.applyResolution(confirmed);
    assert.equal(applied.status, 'applied', JSON.stringify({ id, reason: applied.reason, unresolved: confirmed.unresolved, choice: confirmed.choiceRequired }));
    const after = store.listParticipants().find(row => row.id === skull.id);
    assert.equal(after.extensions.v5.inanimateAs, 'crâne ordinaire', id);
  }
});

test('Sea Elemental channelling interruption, miscast reminders and casting skill read its Strength, by profileId too (final H review)', async () => {
  const { previewChannellingInterruption, resolveChannellingSkill } = await import('../../../js/core/v5-magic-channelling.js');
  const { reminderFlagTexts } = await import('../../../js/core/v5-magic-reminder-flags.js');
  const { casterCaracs, castsWithStrength } = await import('../../../js/core/creature-abilities.js');
  const sea = p('E0-P-909');
  const bare = { id: 'bare-sea', profileId: 'E0-P-909', caracs: { ...sea.caracs }, skills: [], talents: [], extensions: { v5: {} } };
  assert.equal(castsWithStrength(bare), true, 'profileId alone is enough');
  assert.equal(castsWithStrength(p('E0-P-910')), false);
  assert.equal(casterCaracs(bare).FM, sea.caracs.F);
  assert.equal(resolveChannellingSkill(bare).carac, 'F');
  assert.equal(resolveChannellingSkill(bare).bfm, Math.floor(sea.caracs.F / 10));
  const interruption = previewChannellingInterruption(sea, { score: 50, roll: 10 });
  assert.notEqual(interruption.ready, false);
  assert.doesNotThrow(() => reminderFlagTexts({ effects: {} }, sea));
});

test('Suffocation costs nothing while a breath blessing lasts (final H review)', async () => {
  const { advanceV5Effects } = await import('../../../js/core/v5-effects.js');
  const victim = { id: 'blessed', name: 'Béni', hp: 2, maxHp: 10, caracs: { E: 30 }, states: [{ id: 'suff', key: 'suffocation', name: 'Suffocation', level: 1 }],
    extensions: { v5: { divineEffects: [{ id: 'breath', specialState: { doesNotBreathe: true } }] } } };
  const r1 = advanceV5Effects(victim, { phase: 'endOfRound', round: 1 });
  assert.equal(r1.participant.hp, 2);
  assert.ok(r1.participant.states.some(row => row.key === 'suffocation'), 'the state stays for when the blessing ends');
});
});

describe('capacités du bestiaire — caractérisation', () => {
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const profile = (book, id) => {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'js/data/bestiary', `${book}.json`), 'utf8'));
  return data.profiles.find(entry => entry.id === id);
};

test('F2-H characterization anchors the selected real profiles and their source pages', () => {
  const cases = [
    ['L11', 'E0-P-001', 'Great Stag', 10],
    ['L11', 'E0-P-002', 'The River’S Shadow', 10],
    ['L11', 'E0-P-004', 'Arachnarok Spider', 13],
    ['L18', 'E0-P-565', 'Flying Death Skulls', 117],
    ['L18', 'E0-P-567', 'Flying Death-Ier Skulls', 117],
    ['L22', 'E0-P-744', 'Cliff Spider', 73],
    ['L23', 'E0-P-792', 'Great Cats', 87],
    ['L23', 'E0-P-807', 'The Farmyard Beasts', 106],
    ['L25', 'E0-P-909', 'Sea Elemental', 142],
    ['L25', 'E0-P-910', 'Gargantuan', 143],
    ['L25', 'E0-P-913', 'Merwyrm', 145],
    ['L25', 'E0-P-916', 'Black Leviathan', 147],
    ['L25', 'E0-P-921', 'Wulfrik Sarl Champion', 155]
  ];
  for (const [book, id, name, page] of cases) {
    const item = profile(book, id);
    assert.ok(item, `${book} ${id} exists`);
    assert.equal(item.name, name);
    assert.equal(item.book, book);
    assert.equal(item.page, page);
    assert.equal(item.kind, 'profile');
  }
});

test('paired profiles remain distinguishable for profile-scoped abilities', () => {
  const taal = profile('L11', 'E0-P-001');
  const kurnous = profile('L11', 'E0-P-002');
  const webSpider = profile('L11', 'E0-P-004');
  const ordinarySpider = profile('L22', 'E0-P-744');
  const skull = profile('L18', 'E0-P-565');
  const fireSkull = profile('L18', 'E0-P-567');

  assert.deepEqual(taal.specialRules, ["Taal's Own Blades"]);
  assert.deepEqual(kurnous.specialRules, ["Kurnous' Own Blades"]);
  assert.ok(webSpider.specialRules.includes('Vicious Webs'));
  assert.equal(ordinarySpider.specialRules, undefined);
  assert.equal(skull.specialRules, undefined);
  assert.ok(fireSkull.specialRules.includes('Flaming Dangerous'));
});
});
