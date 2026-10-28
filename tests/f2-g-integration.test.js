import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { resolveCreatureHitLocation } from '../js/core/v5-hit-morphology.js';
import { previewResolution } from '../js/core/resolution.js';
import { createStore } from '../js/core/store.js';
import { hitMorphologySelection, isCriticalFateRoll } from '../js/ui/resolution-panel.js';

const library = JSON.parse(readFileSync(new URL('../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;
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
  const source=readFileSync(new URL('../js/ui/resolution-panel.js',import.meta.url),'utf8');
  const start=source.indexOf("if(current.specialAttack==='whirlwind-of-death')");
  const end=source.indexOf('const measures=renderV5TalentMeasures',start);
  assert.ok(start>=0&&end>start);
  const block=source.slice(start,end);
  assert.match(block,/current\.engagedIds/);
  assert.match(block,/hitMorphologySelection\(current\.hitMorphologiesById\?\.\[victim\.id\],deriveHitMorphology\(victim\)\)/);
  assert.match(block,/hitMorphologiesById:/);
});
