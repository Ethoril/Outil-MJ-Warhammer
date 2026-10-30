import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import snapshot from '../../../js/data/reference-snapshot.json' with {type:'json'};
import { buildMagicReferences, parseReferenceCSV, getReferenceCatalogue, referenceContentPayload, sha256, refreshReferences, getReferenceSnapshot } from '../../../js/core/reference-catalog.js';
import { getAllSpellContracts, getSpellContract, previewSpellExecution } from '../../../js/core/v5-spell-contracts.js';
import { createHash } from 'node:crypto';
import { normalizeCatalogueParameter as norm } from '../../helpers/catalogue-v5-comparison.js';
import fs, { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createStore } from '../../../js/core/store.js';
import { availableV5TalentActions, sourceActive } from '../../../js/core/v5-talent-actions.js';
import coverage from '../../../js/data/v5-magic-talent-coverage.json' with { type: 'json' };
import baseCoverage from '../../../js/data/v5-talent-coverage.json' with { type: 'json' };
import { acquireV5Conditions } from '../../../js/core/v5-effects.js';
import { sanitizeParticipant, sanitizeMagicEnvelope, sanitizeProfile } from '../../../js/core/sanitize.js';
import { actor, setup, person } from '../../helpers/relecture2-fixture.js';
import { MARKER_ONLY_SPECIAL_STATES } from '../../../js/core/v5-magic-reminder-flags.js';
import { applyBeastForm, BEAST_PROFILES, revertBeastForm, previewHandOfGlory, previewVerdantApotheosis, previewDaemonbane, applyDaemonbane } from '../../../js/core/v5-magic-arbitrations.js';
import { applyFicheSync, ficheSnapshot } from '../../../js/core/fiche-sync.js';
import { prepareMagicOptions } from '../../../js/core/v5-magic-talents.js';
import { resolveChannellingSkill, calculateMagicArmorPenalty, previewChannellingPause } from '../../../js/core/v5-magic-channelling.js';
import { isTargetDaemon, previewLoreAttribute } from '../../../js/core/v5-magic-attributes.js';
import { previewBurnout } from '../../../js/core/v5-magic-high.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { roundSpellEffects, previewSpellInteraction } from '../../../js/core/v5-magic-turn.js';
import { fixture, execute, subject, level, endTurn } from '../../helpers/lot3-catalogue-fixture.js';
import { input as input5b } from '../../helpers/lot5b-catalogue-fixture.js';
import { measurePeriodicSpellOutcome } from '../../../tools/spell-coverage-probe.mjs';
import { normalizeArmorLocations } from '../../../js/core/equipment.js';

describe('sorts retirés du catalogue', () => {
const removed=['Couronne de Flammes','L’Or des fous','Fauche-démon'];
test('Sorts retirés — catalogue embarqué limité aux 277 entrées actives',()=>{
 assert.equal(snapshot.magic.spells.length,277);
 assert.equal(snapshot.magic.spells.some(s=>s.retired||removed.includes(s.nom)),false);
 for(const name of ['Couronne de Flamme','Or des fous','Fléau des Démons'])assert.ok(snapshot.magic.spells.some(s=>s.nom===name));
});
test('Sorts retirés — une actualisation respecte les suppressions et conserve les alias des sorts actifs',async()=>{
 const entries=await Promise.all(['Magie','Miracles'].map(async name=>{
  const csv=await readFile(new URL('../../../js/data/reference-source-csv/'+name+'.csv',import.meta.url),'utf8');
  return [name,parseReferenceCSV(csv)];
 }));
 const tables=Object.fromEntries(entries);
 const previous=structuredClone(snapshot.magic);
 previous.spells.find(s=>s.nom==='Couronne de Flamme').aliases=['Alias actif de recette'];
 previous.spells.push(...removed.map(nom=>({nom,type:'Recette',cn:1,desc:'Sort absent de la source',retired:true})));
 const next=buildMagicReferences(tables,previous);
 assert.equal(next.spells.length,277);
 assert.equal(next.spells.some(s=>removed.includes(s.nom)||s.retired),false);
 assert.ok(next.spells.find(s=>s.nom==='Couronne de Flamme').aliases.includes('Alias actif de recette'));
 assert.equal(previous.spells.length,280);
});
test('Sorts retirés — un ancien cache plus récent ne réintroduit pas les entrées supprimées',async()=>{
 const original=globalThis.localStorage,data=structuredClone(snapshot);
 data.fetchedAt='2099-10-09T00:00:00.000Z';data.contentVersion='references:obsolete-fixture';
 data.magic.spells.push(...removed.map(nom=>({nom,type:'Recette',cn:1,desc:'Ancien cache',retired:true})));
 globalThis.localStorage={getItem:()=>JSON.stringify({data,updatedAt:data.fetchedAt})};
 try{
  const refs=await import('../../../js/core/reference-catalog.js?lot3-removed-cache');
  assert.equal(refs.getReferenceStatus().source,'instantané local (dépôt)');
  assert.equal(refs.getReferenceCatalogue().magic.spells.length,277);
  assert.equal(refs.getReferenceCatalogue().magic.spells.some(s=>removed.includes(s.nom)),false);
 }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});
});

describe('catalogue — Lileath et cache de références', () => {
/**
 * Catalogue public : D-21 annulée (Silence (Arcane) et Arc coruscant ne sont pas ajoutés : doublons de
 * Silence d'Ulgu et d'Arc de T'Essla), correction du texte de la Bénédiction de Lileath et remplacement des caches périmés.
 */

test('D-21 annulée — ni Silence (Arcane) ni Arc coruscant : Silence garde la version d’Ulgu, l’Arc de T’Essla la sienne', () => {
  const spells = getReferenceCatalogue().magic.spells;
  assert.equal(spells.length, 277);
  assert.equal(getAllSpellContracts().filter(c => !c.isTradition).length, 277);
  for (const name of ['Silence (Arcane)', 'Arc coruscant', 'Coruscating Arc']) {
    assert.equal(spells.some(s => s.nom === name), false, name);
    // Phase D (Q15) : « Silence (Arcane) » de Winds of Magic est un contrat de tradition distinct (aucune identité du catalogue public).
    if (name === 'Silence (Arcane)') { assert.equal(getSpellContract(name).isTradition, true); assert.notEqual(getSpellContract(name).id, getSpellContract('Silence').id); } else assert.equal(getSpellContract(name), null, name);
  }
  assert.equal(spells.find(s => s.nom === 'Silence').type, "Uglu - Gris - Domaine de l'Ombre");
  assert.equal(spells.find(s => s.nom === 'Arc de T’Essla').cn, 7);
  // WoM p.111 : Hush Ulgu, modes déclaratifs, aucun handler Arcane.
  assert.deepEqual(getSpellContract('Silence').effects.facts.find(f=>f.key==='mode').options.map(o=>o[0]),['normal','in','all']);
});

test('Cache de références sans révision locale ou avec l’ancien texte de Lileath : rejeté même plus récent', async () => {
  const snapshot = (await import('../../../js/data/reference-snapshot.json', { with: { type: 'json' } })).default;
  const original = globalThis.localStorage;
  const stale = structuredClone(snapshot);
  stale.fetchedAt = '2099-10-11T00:00:00.000Z'; delete stale.localRevision;
  stale.talents.entries.find(t => t.id === 'talent-lileath-s-blessing').description = '=+1 DR par acquisition aux Tests réussis de Focalisation (Qhaysh).';
  globalThis.localStorage = { getItem: () => JSON.stringify({ data: stale, updatedAt: stale.fetchedAt }) };
  try {
    const refs = await import('../../../js/core/reference-catalog.js?lileath-stale-cache');
    assert.equal(refs.getReferenceStatus().source, 'instantané local (dépôt)');
    assert.match(refs.getReferenceCatalogue().talents.find(t => t.id === 'talent-lileath-s-blessing').description, /à tout Test de Focalisation/);
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});

test('Lileath — le catalogue public dit « tout Test de Focalisation (Qhaysh) », et l’épingle du moteur suit', async () => {
  const entry = getReferenceCatalogue().talents.find(t => t.id === 'talent-lileath-s-blessing');
  assert.match(entry.description, /à tout Test de Focalisation \(Qhaysh\), réussi ou non/);
  assert.doesNotMatch(entry.description, /Tests réussis/);
  const pins = (await import('../../../js/data/v5-magic-talent-sources.json', { with: { type: 'json' } })).default;
  assert.equal(pins.sourceDescriptions['talent-lileath-s-blessing'], entry.description, 'épingle identique : le talent reste actif');
});
});

describe('catalogue V5 — parité des 277 identités', () => {
const read=p=>readFile(new URL('../../../'+p,import.meta.url),'utf8');
test('Catalogue V5 — 277 identités : NI, portée, cible et durée correspondent aux contrats exécutés',()=>{
 assert.equal(snapshot.magic.spells.length,277);
 for(const s of snapshot.magic.spells){const c=getSpellContract(s.nom);assert.ok(c,s.nom);assert.equal(s.cn,c.cn,s.nom+' NI');for(const [field,key] of [['portee','range'],['cible','target'],['duree','duration']])assert.equal(norm(s[field]),norm(c[key]),s.nom+' '+field);}
});
test('Catalogue V5 — les tolérances ne masquent ni Bonus/caractéristique, ni unités, ni maximum',()=>{
 assert.equal(norm('(Moitié de Force Mentale) mètres'),norm('½ FM mètres'));
 assert.equal(norm('Zone d’effet (Bonus de Volonté mètres)'),norm('ZdE Bonus de Force Mentale mètres'));
 for(const [a,b] of [['Force Mentale mètres','Bonus de Force Mentale mètres'],['Bonus d’Initiative minutes','Initiative minutes'],['Force Mentale mètres','Force Mentale yards'],['1','1 maximum'],['2 × Bonus de Force Mentale mètres','Bonus de Force Mentale mètres']])assert.notEqual(norm(a),norm(b));
});
test('Catalogue V5 — CSV, empreinte et versions fonctionnelles concordent',async()=>{
 const csv=await read('js/data/reference-source-csv/Magie.csv'),miracles=await read('js/data/reference-source-csv/Miracles.csv');
 const rebuilt=buildMagicReferences({Magie:parseReferenceCSV(csv),Miracles:parseReferenceCSV(miracles)},snapshot.magic);
 assert.deepEqual(rebuilt.spells,snapshot.magic.spells);assert.deepEqual(rebuilt.miracles,snapshot.magic.miracles);
 assert.equal(snapshot.magic.catalogVersion,'sha256:'+await sha256(rebuilt));
 assert.equal(snapshot.contentVersion,'references:'+await sha256(referenceContentPayload(snapshot)));
 assert.equal(snapshot.magic.sourceNormalization.publicCsvSha256,createHash('sha256').update(csv).digest('hex'));
});
test('Catalogue V5 — refresh de toutes les feuilles du miroir garde la même version',async()=>{
 const before=getReferenceSnapshot().contentVersion;
 const fetchImpl=async url=>({ok:true,text:()=>read('js/data/reference-source-csv/'+new URL(url).searchParams.get('sheet')+'.csv')});
 const result=await refreshReferences({fetchImpl,storage:null});assert.equal(result.ok,true,result.status.error);assert.equal(getReferenceSnapshot().contentVersion,before);
});
test('Catalogue V5 — ancien cache, même daté de 2099, remplacé par la nouvelle révision locale',async()=>{
 const stale=structuredClone(snapshot);stale.localRevision='2026-10-11';stale.fetchedAt='2099-10-13';stale.magic.spells.find(s=>s.nom==='Cautérisation').cn=4;
 const previous=globalThis.localStorage;globalThis.localStorage={getItem:()=>JSON.stringify({data:stale,updatedAt:stale.fetchedAt})};
 try{const refs=await import('../../../js/core/reference-catalog.js?catalogue-v5-stale');assert.equal(refs.getReferenceSnapshot().localRevision,snapshot.localRevision);assert.equal(refs.getReferenceCatalogue().magic.spells.find(s=>s.nom==='Cautérisation').cn,2);}finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});
test('Catalogue V5 — sources V5 pp.248–254 et HEPG p.86 : descriptions des corrections majeures',()=>{
 const text=n=>snapshot.magic.spells.find(s=>s.nom===n).desc;
 assert.doesNotMatch(text('Cautérisation'),/1d10|Inconscient/);assert.match(text('Cautérisation'),/Résistance/);
 assert.match(text('Lumière aveuglante'),/3 Aveuglé/);assert.match(text('Robe scintillante'),/\+2 PA/);assert.doesNotMatch(text('Robe scintillante'),/9\+/);
 assert.match(text('Transmutation de Chamon'),/\+9.*BE.*PA/);assert.match(text('Creuset de Chamon'),/\+6.*PA.*BE/);
 assert.match(text('Coruscation de Finreir'),/arrondi supérieur/);assert.match(text('Miasme mystifiant'),/Perception/);assert.doesNotMatch(text('Miasme mystifiant'),/Initiative|dissip/);
 assert.match(text('Cœurs Enflammés'),/Frénésie/);assert.doesNotMatch(text('Cœurs Enflammés'),/Entraîné|Sans Peur|Cœur Vaillant/);
});
test('Catalogue V5 — preuves finales, 12 anomalies résolues et trois clauses de talents clôturées avec limites explicites',async()=>{
 const t=JSON.parse(await read('docs/lot3/LOT3_SUIVI_EXHAUSTIF_MAGIE.json'));assert.equal(t.newAnomalies.length,12);for(const i of t.newAnomalies)assert.ok(i.resolution?.proof,i.id);
 assert.equal(t.talentClauses.find(c=>c.talentId==='talent-lileath-s-blessing'&&c.clauseId==='magic:0').status,'conforme');
 assert.equal(t.talentClauses.filter(c=>c.status==='non vérifié').length,0);const closed=t.talentClauses.filter(c=>c.closure);assert.equal(closed.length,3);for(const c of closed){assert.equal(c.auditBeforeClosure.status,'non vérifié');assert.ok(c.closure.executed&&c.closure.tested);assert.ok(c.notVerified.length>40,c.name);}assert.equal(closed.filter(c=>c.status==='donnée MJ nécessaire').length,2);assert.equal(closed.filter(c=>c.status==='conforme').length,1);
 for(const lot of [1,2,3,4]){const e=JSON.parse(await read('docs/lot3/LOT3_PREUVES_CONTRATS_LOT'+lot+'.json'));for(const row of e.rows||e.scenarios||[])assert.ok(['conforme','donnée MJ nécessaire','rappel'].includes(row.status),row.id);}
});
});

describe('clôture — preuves des clauses de talents', () => {
const talent=(id,specialization)=>({id:'talent-'+id,status:'resolved',rank:3,...(specialization?{specialization}:{})});
const actor=(id='mage',extra={})=>({id,name:id,kind:'PJ',camp:id==='mage'?'pj':'ennemi',zone:'active',hp:30,maxHp:30,
 caracs:{CC:40,CT:40,F:30,E:30,Int:60,FM:20,Ag:40,I:40,Dex:40,Soc:40,M:4},
 skills:[{name:'Langue (Magick)',total:60},{name:'Focalisation',total:60},{name:'Focalisation (Haute Magie)',total:60},{name:'Prière',total:50}],talents:[],states:[],equipment:[],
 armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{hasMomentum:true}},...extra});
async function setup(...people){const store=createStore();await store.ready;await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'mage',order:people.map(p=>p.id),participants:people},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});return store;}
const person=(s,id='mage')=>s.listParticipants().find(p=>p.id===id);
const input=(context={},skill='Métier (Forgeron)',roll=25)=>({actorId:'mage',action:{type:'skill',attr:'Int',label:skill,base:40},roll,v5:{kind:'test',choice:'keep',context}});
async function meditate(s){await s.applyMagicMeditation({actorId:'mage',talentId:'talent-mind-over-body',name:'L’esprit sur le corps',minutes:20,roll:45,durationRolls:[1,1]});}

test('talent-suffuse-with/magic:2 — WoM p.186 : Aqshy donne accès à Frénésie via le Store, avec Focalisation et Undo',async()=>{
 const s=await setup(actor('mage',{talents:[talent('suffuse-with','Aqshy')]}),actor('enemy'));
 const a=availableV5TalentActions(person(s)).find(a=>a.id==='activate:frenzy');assert.ok(a,'Action Aqshy absente');
 const p=s.previewResolution({actorId:'mage',action:a,roll:45,v5:{kind:'test',choice:'keep',context:{talentAction:'frenzy',magicSuffusedWind:'Aqshy'}}});
 const fm=s.previewResolution({actorId:'mage',action:a,roll:45,v5:{kind:'test',choice:'keep',context:{talentAction:'frenzy',magicSuffusedWind:null}}});assert.equal(fm.test.score,20);assert.equal(fm.success,false);
 assert.equal(p.test.score,60);assert.equal(p.success,true);assert.deepEqual(p.unresolved,[]);
 assert.equal((await s.applyResolution(p)).status,'applied');
 assert.ok(person(s).states.some(e=>e.key==='frenzy'&&sourceActive(e)));
 const saved=s.getFullJSON(),loaded=createStore();await loaded.ready;await loaded.loadFromJSON(saved);
 assert.ok(person(loaded).states.some(e=>e.key==='frenzy'&&sourceActive(e)));
 const endAction=availableV5TalentActions(person(s)).find(a=>a.id==='activate:end-frenzy');const end=s.previewResolution({actorId:'mage',action:endAction,v5:{kind:'test',context:{talentAction:'end-frenzy',nearbyEnemiesDefeated:true}}});assert.deepEqual(end.unresolved,[]);assert.equal((await s.applyResolution(end)).status,'applied');assert.equal(person(s).states.some(e=>e.key==='frenzy'),false);assert.ok(person(s).states.some(e=>e.key==='extenue'));await s.undo();assert.ok(person(s).states.some(e=>e.key==='frenzy'));
 await s.undo();assert.equal(person(s).states.some(e=>e.key==='frenzy'),false);
});
test('Clôture — WoM p.186 : substitutions de chaque Vent, sans substitution FM ordinaire Aqshy',async()=>{
 const cases={Azyr:['Perception'],Chamon:['Évaluation'],Ghur:['Emprise sur les animaux','Savoir (Bêtes)'],Ghyran:['Savoir (Plantes)','Savoir (Animaux)','Savoir (Herbes)','Soin aux animaux'],Hysh:['Recherche'],Shyish:['Intimidation'],Ulgu:['Discrétion']};
 for(const [wind,skills] of Object.entries(cases)){const s=await setup(actor('mage',{talents:[talent('suffuse-with',wind)]}));for(const skill of skills)assert.equal(s.previewResolution(input({magicSuffusedWind:wind},skill)).test.score,60,wind+'/'+skill);}
 const s=await setup(actor('mage',{talents:[talent('suffuse-with','Aqshy')]}));
 assert.equal(s.previewResolution(input({magicSuffusedWind:'Aqshy'},'Force Mentale')).test.score,40);
 const plain=await setup(actor());assert.equal(availableV5TalentActions(person(plain)).some(a=>a.id==='activate:frenzy'),false);
 const other=await setup(actor('mage',{talents:[talent('suffuse-with','Azyr')]}));assert.equal(availableV5TalentActions(person(other)).some(a=>a.id==='activate:frenzy'),false);
});
test('Clôture — HEPG p.101 : Chance, rechargement, Tests étendus seuls, autres pénalités et blessures conservées',async()=>{
 const s=await setup(actor('mage',{talents:[talent('mind-over-body')],extensions:{v5:{hasMomentum:true,criticalWounds:[{id:'wound',penalty:-2}]}}}));
 await s.setFortune('mage',2);await meditate(s);await s.activateMindOverBody('mage');assert.equal(s.getFortune('mage').balance,1);
 const saved=s.getFullJSON(),loaded=createStore();await loaded.ready;await loaded.loadFromJSON(saved);
 assert.equal(loaded.getFortune('mage').balance,1);assert.deepEqual(person(loaded).extensions.v5.criticalWounds,[{id:'wound',penalty:-2}]);
 const ctx={magicCriticalPenalty:-2};const base=loaded.previewResolution(input()).test.sl;
 assert.equal(loaded.previewResolution(input({...ctx,extendedTest:true})).test.sl,base);
 const other=input({...ctx,extendedTest:true});other.v5.slModifiers=[{id:'other',amount:-1}];assert.equal(loaded.previewResolution(other).test.sl,base-1);
 assert.equal(loaded.previewResolution(input(ctx)).test.sl,base-2,'Un Test ordinaire conserve la pénalité');
 await assert.rejects(async()=>loaded.activateMindOverBody('mage'),/déjà/);assert.equal(loaded.getFortune('mage').balance,1);
 await s.undo();assert.equal(s.getFortune('mage').balance,2);
});
test('Clôture — HEPG p.101 : expiration au Round d’arrivée puis Undo atomique, Chance dépensée non remboursée',async()=>{
 const s=await setup(actor('mage',{talents:[talent('mind-over-body')]}),actor('enemy'));await s.setFortune('mage',2);await meditate(s);await s.activateMindOverBody('mage');
 await s.advanceTalentMinutes(119+5/6);
 assert.equal(s.previewResolution(input({extendedTest:true,magicCriticalPenalty:-2})).test.sl,s.previewResolution(input()).test.sl);
 const beforeTurn=JSON.parse(s.getFullJSON());await s.nextTurn();const afterTurn=JSON.parse(s.getFullJSON());
 assert.equal(afterTurn.combat.round,beforeTurn.combat.round+1);
 assert.equal(afterTurn.extensions.v5.gameClock.revision,beforeTurn.extensions.v5.gameClock.revision+1);
 assert.equal(afterTurn.extensions.v5.gameClock.campaignSeconds,beforeTurn.extensions.v5.gameClock.campaignSeconds+10);
 assert.equal(person(s).extensions.v5.spellEffects.some(e=>e.magicTalentId==='talent-mind-over-body'),false);
 assert.equal(s.getFortune('mage').balance,1);
 assert.equal(s.previewResolution(input({extendedTest:true,magicCriticalPenalty:-2})).test.sl,s.previewResolution(input()).test.sl-2);
 await s.undo();assert.ok(person(s).extensions.v5.spellEffects.some(e=>e.magicTalentId==='talent-mind-over-body'&&e.ignoreCriticalPenalties));
 assert.deepEqual(JSON.parse(s.getFullJSON()).extensions.v5.gameClock,beforeTurn.extensions.v5.gameClock,'Undo restaure ensemble la clock et la couche de la transition annulée');
 assert.equal(s.getFortune('mage').balance,1,'Undo de la transition ne rembourse pas la Chance dépensée antérieurement');
});
test('talent-magic-resistance/magic:2 — V5 p.122, D-07 : Puissance totale ignore le NI, retire 3 DR aux effets puis Store/reload/Undo',async()=>{
 const s=await setup(actor('mage',{caracs:{...actor().caracs,FM:50}}),actor('target',{talents:[talent('magic-resistance')]}));
 const options={actorId:'mage',targetIds:['target'],roll:11,criticalChoice:'total-power',attributeActive:false,miscastRoll:15};
 const p=s.previewSpellExecution('Carreau',options);assert.equal(p.ready,true);assert.equal(p.castingPreview.totalCastingSl,5);assert.equal(p.targetResults[0].resisted,undefined);assert.equal(p.targetResults[0].magicResistance,3);assert.equal(p.targetResults[0].woundsLost,6);
 await s.applySpellExecution('Carreau',options);assert.equal(person(s,'target').hp,24);
 const loaded=createStore();await loaded.ready;await loaded.loadFromJSON(s.getFullJSON());assert.equal(person(loaded,'target').hp,24);
 await s.undo();assert.equal(person(s,'target').hp,30);
});
test('D-07 — effets en DR réduits de 3 sous Puissance totale : soin et bonus de Chant vivifiant',async()=>{
 const s=await setup(actor('mage'),actor('target',{hp:10,talents:[talent('magic-resistance')]}));
 const options={actorId:'mage',targetIds:['target'],roll:11,criticalChoice:'total-power',attributeActive:false,miscastRoll:15,targetTests:{target:{plantCreature:true,dormant:false}}};
 const p=s.previewSpellExecution('Chant vivifiant',options);assert.equal(p.ready,true);assert.equal(p.castingPreview.totalCastingSl,5);assert.equal(p.targetResults[0].woundsHealed,2);
 await s.applySpellExecution('Chant vivifiant',options);assert.equal(person(s,'target').hp,12);assert.equal(person(s,'target').extensions.v5.testModifiers['Tous les Tests'],2);
 await s.undo();assert.equal(person(s,'target').hp,10);
 const plain=await setup(actor('mage'),actor('target',{hp:10}));const normal=plain.previewSpellExecution('Chant vivifiant',options);assert.equal(normal.targetResults[0].woundsHealed,5);
});
test('Section 0 — actualisation depuis les CSV publics épinglés : version exacte, Lileath actif, autres signes = conservés',async()=>{
 const {refreshReferences,getReferenceSnapshot}=await import('../../../js/core/reference-catalog.js');
 const snapshot=JSON.parse(fs.readFileSync(new URL('../../../js/data/reference-snapshot.json',import.meta.url),'utf8'));
 const result=await refreshReferences({forceRefresh:true,storage:null,fetchImpl:async url=>({ok:true,text:async()=>fs.readFileSync(new URL('../../../js/data/reference-source-csv/'+new URL(url).searchParams.get('sheet')+'.csv',import.meta.url),'utf8')})});
 assert.equal(result.ok,true);assert.equal(getReferenceSnapshot().contentVersion,snapshot.contentVersion);
 const lileath=getReferenceSnapshot().talents.entries.find(t=>t.id==='talent-lileath-s-blessing');assert.ok(lileath.description.startsWith('+1'));
 const s=await setup(actor('mage',{talents:[talent('lileath-s-blessing')]}));assert.equal(s.previewChannelling({actorId:'mage',type:'high',roll:75}).test.sl,2);
 for(const id of ['suave','luck','strike-mighty-blow','nimble-fingered'])assert.ok(getReferenceSnapshot().talents.entries.find(t=>t.id==='talent-'+id).description.startsWith('+'),id);// le « = » de saisie Sheets est retiré par talent-source.js (import du 23/10/2026)
 assert.doesNotMatch(getReferenceSnapshot().talents.entries.find(t=>t.id==='talent-small').description,/Frappes Mortelles/);
});
test('Section 0 — Petit : toucher une cible survivante ne déclenche aucune Frappe Mortelle',async()=>{
 const s=await setup(actor('mage'),actor('target',{hp:100,maxHp:100,talents:[talent('small')]}));
 const p=s.previewResolution({resolutionId:'closure-small',actorId:'mage',targetId:'target',action:{type:'attack',attr:'CC',base:60,damage:5},roll:25,defense:{base:20,roll:91,v5:{kind:'melee',choice:'keep'}},v5:{kind:'melee',choice:'keep',actorSize:4,targetSize:2}});
 assert.deepEqual(p.unresolved,[]);assert.equal(p.hit,true);assert.equal(p.critical,null);assert.equal(p.defenderCritical,null);
 await s.applyResolution(p);assert.ok(person(s,'target').hp>0);assert.equal(person(s,'target').states.some(e=>/mort|dead/i.test(e.key||e.name)),false);
});
test('Clôture — couverture : le générateur reproduit les données validées et deux générations identiques',()=>{
 const root=path.resolve(import.meta.dirname,'../../..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'lot3-cloture-coverage-'));
 try{for(const f of ['tools/build-v5-talent-coverage.mjs','js/data/reference-snapshot.json','docs/lot2/LOT2_INVENTAIRE_TALENTS.json','docs/lot2/LOT2_TRI_TALENTS.json','js/data/v5-magic-talent-coverage.json',...['v5-talent-contracts','v5-test-talent-contracts','v5-quality-talent-contracts','v5-additional-talent-contracts'].map(n=>'js/data/'+n+'.json')]){fs.mkdirSync(path.dirname(path.join(tmp,f)),{recursive:true});fs.copyFileSync(path.join(root,f),path.join(tmp,f));}
 execFileSync(process.execPath,['tools/build-v5-talent-coverage.mjs'],{cwd:tmp});const first=fs.readFileSync(path.join(tmp,'js/data/v5-talent-coverage.json'));assert.deepEqual(first,fs.readFileSync(path.join(root,'js/data/v5-talent-coverage.json')));
 execFileSync(process.execPath,['tools/build-v5-talent-coverage.mjs'],{cwd:tmp});assert.deepEqual(fs.readFileSync(path.join(tmp,'js/data/v5-talent-coverage.json')),first);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
});

describe('couverture des clauses de talents de magie', () => {
const talent = (id, rank = 1, specialization) => ({ id: 'talent-' + id, status: 'resolved', rank, ...(specialization ? { specialization } : {}) });
const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 },
    { name: 'Savoir (Magie)', total: 60 }, { name: 'Prière', total: 50 }], talents: [], states: [], equipment: [],
  extensions: { v5: { hasMomentum: true } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id,
    order: people.map(p => p.id), participants: people }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id = 'mage') => store.listParticipants().find(p => p.id === id);
const clauses = new Map();
function probe(id, clause, source, run) {
  const key = `talent-${id}/${clause}`; clauses.set(key, run);
  test(`H-07 — ${key} — ${source}`, run);
}
const resolution = (store, skill, base, context = {}, roll = 25) => store.previewResolution({ actorId: 'mage',
  action: { type: 'skill', attr: 'Int', label: skill, base }, roll, v5: { kind: 'test', choice: 'keep', context } });
const meditation = (store, id, durationRolls = [1, 1]) => store.applyMagicMeditation({ actorId: 'mage', talentId: 'talent-' + id,
  name: id, minutes: 20, roll: 45, durationRolls });

probe('animal-assistant', 'magic:0', 'Archives of the Empire 3 p. 81, adaptation Avantage V5', async () => {
  const store = await combat(wizard(), wizard('familiar', { talents: [talent('animal-assistant')] }));
  assert.equal(store.previewChannelling({ actorId: 'mage', roll: 61, assistantId: 'familiar', assistantLinked: true, choice: 'reverse' }).test.roll, 16);
  assert.equal(store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 61, assistantId: 'familiar', assistantLinked: true, choice: 'reverse' }).test.roll, 16);
  for (const skill of ['Survie en extérieur', 'Perception']) {
    const p = resolution(store, skill, 40, { magicAssistantId: 'familiar', magicAssistantLinked: true, magicalNature: true }, 61);
    assert.equal(p.test.advantage.net, 1);
  }
});
probe('magical-assistant', 'magic:0', 'Winds of Magic p. 186, adaptation +2 DR', async () => {
  const store = await combat(wizard(), wizard('familiar', { talents: [talent('magical-assistant'), talent('animal-assistant')] }));
  const context = { magicAssistantId: 'familiar', magicAssistantLinked: true, magicalNature: true };
  for (const skill of ['Focalisation', 'Langue (Magick)', 'Savoir (Magie)', 'Recherche']) {
    const p = resolution(store, skill, 60, context);
    assert.equal(p.test.sl, 6); assert.equal(p.test.advantage.net, 0);
  }
});
probe('lileath-s-blessing', 'magic:0', 'HEPG p. 83', async () => {
  const store = await combat(wizard('mage', { talents: [talent('lileath-s-blessing', 2)] }));
  assert.equal(store.previewChannelling({ actorId: 'mage', type: 'high', roll: 25 }).gain, 11);
  assert.equal(store.previewChannelling({ actorId: 'mage', type: 'winds', roll: 25 }).gain, 9);
  assert.equal(store.previewChannelling({ actorId: 'mage', type: 'high', roll: 85 }).gain, 0);
});
probe('magic-defiance', 'magic:0', 'Dwarf Player’s Guide p. 80', async () => {
  const store = await combat(wizard(), wizard('target', { talents: [talent('magic-defiance')], skills: [{ name: 'Calme', total: 50 }] }));
  const input = { actorId: 'mage', targetIds: ['target'], sl: 6, resistanceRoll: 81, attributeActive: false };
  const kept = store.previewSpellExecution('Twitch', { ...input, targetTests: { target: { objectHeld:true, roll: 81, choice: 'keep' } } });
  const reversed = store.previewSpellExecution('Twitch', { ...input, targetTests: { target: { objectHeld:true, roll: 81, choice: 'reverse' } } });
  assert.equal(kept.targetResults[0].resistanceTest.resisted, false);
  assert.equal(reversed.targetResults[0].resistanceTest.resisted, true);
});
probe('magic-defiance', 'magic:1', 'Dwarf Player’s Guide p. 80', async () => {
  const store = await combat(wizard(), wizard('target', { talents: [talent('magic-defiance')] }));
  await store.setFortune('target', 2); await store.startMagicAdventure();
  const input = { actorId: 'mage', targetIds: ['target'], roll: 25, magicDefianceTargets: ['target'] };
  await store.applySpellExecution('Carreau', input); assert.equal(person(store, 'target').hp, 30); assert.equal(store.getFortune('target').balance, 1);
  assert.equal(store.previewSpellExecution('Carreau', input).ready, false);
  await store.undo(); assert.equal(store.getFortune('target').balance, 2); assert.equal(store.previewSpellExecution('Carreau', input).ready, true);
});
probe('instinctive-diction', 'magic:0', 'V5 p. 121', async () => {
  const store = await combat(wizard('mage', { talents: [talent('instinctive-diction')] }));
  const input = { actorId: 'mage', roll: 33, miscastRoll: 15, instinctiveDiction: true };
  assert.equal(store.previewCasting(getSpellContract('Carreau'), input).miscast, null);
  await store.updateParticipant('mage', { extensions: { v5: { specialStates: { forbidMitigation: true } } } });
  assert.equal(store.previewCasting(getSpellContract('Carreau'), input).miscast.name, 'Distraction');
});
probe('aethyric-attunement', 'magic:0', 'V5 p. 114', async () => {
  for (const rank of [1, 2]) {
    const store = await combat(wizard('mage', { talents: [talent('aethyric-attunement', rank)] }));
    const input = { participant: person(store), severity: rank === 1 ? 'MINOR' : 'MAJOR', roll: 50, miscastRoll2: 85 };
    assert.equal(store.previewMiscast(input).ready, false);
    assert.equal(store.previewMiscast({ ...input, miscastChoice: 'first' }).initialRoll, 50);
  }
});
probe('high-magic', 'magic:0', 'HEPG pp. 83/84, plafond V5 p. 236', async () => {
  const store = await combat(wizard('mage', { talents: [talent('high-magic', 1)], extensions: { v5: { channelling: { type: 'high', sl: 20 } } } }));
  const p = store.previewCasting(getSpellContract('Main de Gloire'), { actorId: 'mage', roll: 25 });
  assert.equal(p.availableOvercastSl, p.totalCastingSl - getSpellContract('Main de Gloire').cn + 1);
  assert.equal(p.maxOvercastSpend, 11);
});
probe('suffuse-with', 'magic:0', 'Winds of Magic p. 186', async () => {
  const store = await combat(wizard(), wizard('target'), wizard('aura', { talents: [talent('suffuse-with', 1, 'Aqshy')] }), wizard('aura2', { talents: [talent('suffuse-with', 1, 'Aqshy')] }));
  const fire = getSpellContract('Cautérisation');
  const base = store.previewCasting(fire, { actorId: 'mage', roll: 25 });
  const p = store.previewCasting(fire, { actorId: 'mage', roll: 25, participants: store.listParticipants(), suffusedBy: [{ id: 'aura', distance: 8 }, { id: 'aura2', distance: 8 }] });
  assert.equal(p.totalCastingSl, base.totalCastingSl + 1);
});
probe('suffuse-with', 'magic:1', 'Winds of Magic p. 186', async () => {
  const cases = { Aqshy: ['Force Mentale'], Azyr: ['Perception'], Chamon: ['Évaluation'], Ghur: ['Emprise sur les animaux', 'Savoir (Bêtes)'],
    Ghyran: ['Savoir (Plantes)', 'Savoir (Animaux)', 'Savoir (Herbes)', 'Soin aux animaux'], Hysh: ['Recherche'], Shyish: ['Intimidation'], Ulgu: ['Discrétion'] };
  for (const [wind, skills] of Object.entries(cases)) {
    const store = await combat(wizard('mage', { talents: [talent('suffuse-with', 1, wind)] }));
    for (const skill of skills) assert.equal(resolution(store, skill, 20, { magicSuffusedWind: wind,...(wind==='Aqshy'?{talentAction:'frenzy'}:{}) }).test.score, 60);
  }
});
for (const id of ['mind-over-body', 'sanctuary-of-the-mind', 'eye-of-the-storm']) {
  probe(id, 'magic:0', `HEPG p. ${{ 'mind-over-body': 101, 'sanctuary-of-the-mind': 109, 'eye-of-the-storm': 105 }[id]}`, async () => {
    const store = await combat(wizard('mage', { talents: [talent(id)] }));
    await assert.rejects(async () => meditation(store, id, [1]), /d10/);
    await meditation(store, id);
    assert.ok(person(store).extensions.v5.spellEffects.some(e => e.magicTalentId === 'talent-' + id));
    if (id === 'eye-of-the-storm') assert.equal(store.previewChannelling({ actorId: 'mage', mode: 'interruption', distraction: true }).ready, true);
    await store.advanceTalentMinutes(120);
    assert.equal(person(store).extensions.v5.spellEffects.some(e => e.magicTalentId === 'talent-' + id), false);
  });
}
probe('mind-over-body', 'magic:1', 'HEPG p. 101', async () => {
  const store = await combat(wizard('mage', { talents: [talent('mind-over-body', 2)] })); await meditation(store, 'mind-over-body');
  const actor = person(store);
  assert.deepEqual(acquireV5Conditions(actor, ['Sonné'], { painRelated: true }).participant.states, []);
  await store.applySpellEffects('mage', { spellId: 'blind', duration: '1 Round', conditions: ['Aveuglé'] });
  assert.deepEqual(person(store).states, []);
});
probe('mind-over-body', 'magic:2', 'HEPG p. 101, adaptation Chance du catalogue', async () => {
  const store = await combat(wizard('mage', { talents: [talent('mind-over-body', 3)] })); await store.setFortune('mage', 2); await meditation(store, 'mind-over-body');
  const before = resolution(store, 'Métier (Forgeron)', 40, { extendedTest: true, magicCriticalPenalty: -2 }).test.sl;
  await store.activateMindOverBody('mage'); assert.equal(store.getFortune('mage').balance, 1);
  assert.equal(resolution(store, 'Métier (Forgeron)', 40, { extendedTest: true, magicCriticalPenalty: -2 }).test.sl, before + 2);
  await store.undo(); assert.equal(store.getFortune('mage').balance, 2);
});
probe('war-wizard', 'magic:0', 'V5 p. 128', async () => {
  const store = await combat(wizard('mage', { talents: [talent('war-wizard')] }), wizard('target'));
  await store.applySpellExecution('Carreau', { actorId: 'mage', targetIds: ['target'], roll: 25, warWizard: true });
  assert.equal(person(store).extensions.v5.hasMomentum, false);
  assert.throws(() => store.previewChannelling({ actorId: 'mage', roll: 25 }), /Mage de guerre/);
  await store.nextTurn(); await store.nextTurn(); assert.equal(store.previewChannelling({ actorId: 'mage', roll: 25 }).ready, true);
});
probe('arcane-magic', 'magic:0', 'V5 pp. 248/251', async () => {
  for (const [lore, spec, spellName, key] of [['fire', 'Feu', 'Extinction de l’Âme', 'enflamme'], ['light', 'Lumière', 'Extinction de l’Âme', 'aveugle']]) {
    const store = await combat(wizard('mage', { extensions: { v5: { channelling: { type: 'high', sl: 25 } } } }), wizard('target', { camp: 'ennemi', talents: [talent('arcane-magic', 1, spec)] }), wizard('free', { camp: 'ennemi', talents: [{ name: `Magie des Arcanes (${spec})` }] }));
    await store.applySpellExecution(spellName, { actorId: 'mage', targetIds: ['target', 'free'], roll: 25, chosenLore: lore });
    assert.equal(person(store, 'target').states.some(s => s.key === key), false);
    assert.equal(person(store, 'free').states.some(s => s.key === key), true);
  }
});
probe('cadai-meditation', 'magic:0', 'HEPG p. 101, adaptation +2 DR', async () => {
  const store = await combat(wizard('mage', { talents: [talent('cadai-meditation')] }));
  await assert.rejects(async () => store.applyMagicMeditation({ actorId: 'mage', talentId: 'talent-cadai-meditation', minutes: 59, roll: 25 }), /heure/);
  await store.applyMagicMeditation({ actorId: 'mage', talentId: 'talent-cadai-meditation', minutes: 60, roll: 25 });
  assert.equal(person(store).extensions.v5.yenlui, 'Lumineux');
});
probe('eye-of-the-storm', 'magic:1', 'HEPG p. 105', async () => {
  const store = await combat(wizard('mage', { talents: [talent('eye-of-the-storm', 2)], states: [{ name: 'Exténué', level: 2 }] }));
  await meditation(store, 'eye-of-the-storm');
  assert.equal(store.previewChannelling({ actorId: 'mage', roll: 25 }).test.sl, 4);
  assert.equal(store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25 }).test.sl, 4);
});
probe('magical-sense', 'magic:0', 'V5 p. 122', async () => {
  const store = await combat(wizard(), wizard('observer', { talents: [talent('magical-sense')], skills: [{ name: 'Perception', total: 40 }] }));
  await store.applySpellExecution('Carreau', { actorId: 'mage', targetIds: ['observer'], roll: 25, senseFacts: { observer: { distance: 40, direction: 'à l’est' } } });
  assert.ok(JSON.parse(store.getFullJSON()).log.some(e => /observer détecte.*à l’est.*non identifiée/.test(e.text)));
});
probe('magical-sense', 'magic:1', 'V5 p. 122', async () => {
  const store = await combat(wizard('mage', { talents: [talent('magical-sense')] }));
  assert.equal(resolution(store, 'Perception', 40, { magicalNature: true, seesWinds: true }, 61).test.advantage.net, 1);
  assert.equal(resolution(store, 'Perception', 40, { magicalNature: true, seesWinds: false }, 61).test.advantage.net, 0);
});
probe('magic-resistance', 'magic:0', 'V5 p. 122, hors Puissance totale', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 2 } } } }), wizard('target', { talents: [talent('magic-resistance')] }), wizard('normal'));
  const input = { actorId: 'mage', targetIds: ['target', 'normal'], roll: 25, overcastChoices: { targets: 1 }, attributeActive: false };
  const p = store.previewSpellExecution('Carreau', input);
  assert.equal(p.targetResults.find(r => r.targetId === 'target').resisted, true);
  assert.equal(p.targetResults.find(r => r.targetId === 'normal').woundsLost > 0, true);
});
probe('sanctuary-of-the-mind', 'magic:1', 'HEPG p. 109', async () => {
  const store = await combat(wizard('mage', { talents: [talent('sanctuary-of-the-mind', 2)] })); await meditation(store, 'sanctuary-of-the-mind');
  await store.applyMiscast(store.previewMiscast({ severity: 'MINOR', roll: 85 }), { actorId: 'mage' });
  assert.equal(person(store).extensions.v5.corruptionPoints, 0);
  assert.equal(resolution(store, 'Recherche', 40).test.sl, 3);
});
probe('sanctuary-of-the-mind', 'magic:2', 'HEPG p. 109', async () => {
  const store = await combat(wizard('mage', { talents: [talent('sanctuary-of-the-mind', 3)] })); await meditation(store, 'sanctuary-of-the-mind');
  const p = store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25, yenluiPenalty: -3, slModifiers: [{ id: 'other', amount: -1 }] });
  assert.equal(p.test.sl, 3); await store.advanceTalentMinutes(120);
  assert.equal(store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25, yenluiPenalty: -3, slModifiers: [{ id: 'other', amount: -1 }] }).test.sl, 0);
});

test('H-07 : toute clause moteur a une sonde exécutée et une référence dans la couverture', () => {
  for (const item of coverage.items) for (const clause of item.clauses.filter(c => ['automatic', 'assisted'].includes(c.mode))) {
    const key = `${item.talentId}/${clause.id}`;
    if(clauses.has(key))assert.equal(clause.executionProbe, 'tests/unit/magie/catalogue-et-couverture.test.js#'+key);
    else {const [file,anchor]=clause.executionProbe.split('#');assert.ok(file.startsWith('tests/unit/magie/')||file.startsWith('tests/unit/divin/'));assert.ok(readFileSync(new URL('../../../'+file,import.meta.url),'utf8').includes(anchor),'Sonde absente : '+key);}
  }
});
test('H-08 — V5 p. 236, D-17 : Seconde vue en zone saturée reste un rappel MJ', () => {
  const item = baseCoverage.items.find(t => t.talentId === 'talent-second-sight');
  assert.ok(item); assert.equal(item.clauses.every(c => c.mode === 'reminder'), true);
  assert.equal(coverage.contextReminders.find(c => c.talentId === 'talent-second-sight').mode, 'reminder');
});
});

describe('libellés et durées du catalogue (relecture)', () => {
const text=n=>snapshot.magic.spells.find(s=>s.nom===n)?.desc;
const clauses=[['Égide d’Aqshy',/Protection \(?7\+\)?/],['Bouclier céruléen',/\+3 PA/],['Bouclier céruléen',/6 Dégâts.*bras/],['Mur de Feu',/\+4/],['Le Second Signe d’Amul',/3 Points? de Chance/],['Incarnation de Wyssan',/\+30.*Endurance/],['Vision dans l’obscurité',/Bonus d’Initiative Rounds/],['Souffle',/voisins dans Bonus de Force Mentale/],['Source',/1 pinte par Round/],['Choc',/fin de votre prochain Tour/],['Toucher doré',/Force Mentale × 1d10 minutes/],['Linceul d’Invisibilité',/opposé.*incantation/]];
for(const [name,pattern] of clauses)test('R2-24/25 '+name+' : description et rappel conformes',()=>{assert.match(text(name),pattern);assert.match(getSpellContract(name).reminders,pattern);});
test('R2-24 : respiration, durée de Sonné et communication animale',()=>{assert.match(text('Ombres Étrangleuses'),/besoin de respirer[^]*169/);assert.match(text('Filet d’Amyntok'),/ne peut pas perdre.*Sonné/);assert.doesNotMatch(text('Langue des Bêtes'),/Langage \(Bataille\)/);assert.match(text('Carreau'),/Dégâts \+4/);});
test('R2-25 : libellés HEPG V5, eau de l’Esprit du Foyer et Toile 40',()=>{for(const n of ['Apothéose','Destruction des Arcanes','Glamour de Teclis','Convocation Ardente'])assert.doesNotMatch(text(n),/Difficile \(\+0\)|Moyen \(\+2 DR\)/);assert.doesNotMatch(getSpellContract('Esprit du Foyer').effects.summon.destroyedByWater || '',/^$/);assert.equal(getSpellContract('Toucher doré').overcast.options.includes('duration'),true);});
test('R2-26 : Tempête nom et canonicalName, anciennes fiches/couches/reçus migrés, id conservé',()=>{const c=getSpellContract('Tempête');assert.ok(c);assert.equal(c.id,'spell-audit-1e7a5eaec18c122bde64');assert.equal(c.canonicalName,'Tempête');assert.equal(snapshot.magic.spells.some(s=>s.nom==='empête'),false);const p=sanitizeParticipant(actor('mage',{spells:[{id:c.id,name:'empête'}],extensions:{v5:{spellEffects:[{id:'layer',spellId:c.id,spellName:'empête'}]}}}));assert.equal(p.spells[0].name,'Tempête');assert.equal(p.extensions.v5.spellEffects[0].spellName,'Tempête');const e=sanitizeMagicEnvelope({extensions:{v5:{highMagicExecutions:[{id:'x',actorId:'mage',spellId:c.id,spellName:'empête'}]}}});assert.equal(e.extensions.v5.highMagicExecutions[0].spellName,'Tempête');});
test('R2-parité : chiffres de Protection/dégâts/durée des descriptions repris dans les reminders',()=>{const numbers=s=>[...String(s).matchAll(/Protection\s*\(?\d\+?|\+\d+\s*(?:PA|Dégâts)|\d+\s*(?:Dégâts|Rounds?|minutes?|heures?|jours?|semaines?|mois)/g)].map(m=>m[0].replace(/[()+\s]/g,'').replace(/Rounds?/, 'Round'));for(const s of snapshot.magic.spells){const c=getSpellContract(s.nom);for(const n of numbers(s.desc))assert.ok(numbers(c.reminders).includes(n),s.nom+' : rappel '+n);}});
});

describe('couverture des états déclaratifs et classes de contrats', () => {
const read=p=>fs.readFileSync(new URL('../../../'+p,import.meta.url),'utf8');
function sources(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?e.name==='data'?[]:sources(path.join(dir,e.name)):e.name.endsWith('.js')&&e.name!=='v5-magic-reminder-flags.js'?[fs.readFileSync(path.join(dir,e.name),'utf8')]:[]);}
const texts=sources(path.resolve(import.meta.dirname,'../../../js')).join('\n').replace(/\/\*[^]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
const readFlag=key=>new RegExp('(?:specialStates|specialState|flags|magicFlags)\\??\\.\\??'+key+'(?![A-Za-z0-9_])').test(texts);
test('R2-10 : tous les états déclaratifs ont un lecteur ou un marqueur explicite',()=>{const keys=[...new Set(getAllSpellContracts().flatMap(c=>Object.keys(c.effects?.specialState || {})))];assert.deepEqual(keys.filter(k=>!MARKER_ONLY_SPECIAL_STATES.includes(k)&&!readFlag(k)),[]);assert.equal(readFlag('inventedStateWithoutReader'),false);assert.equal(MARKER_ONLY_SPECIAL_STATES.includes('inventedStateWithoutReader'),false);});
test('R2-11 : Mort rapide, 3e Signe et Illuminer classés calculables ; préconditions bloquantes',async()=>{const matrix=read('docs/lot3/LOT3_MATRICE_CONTRATS_V5.md');for(const name of ['Mort rapide','Le Troisième Signe d’Amul','Illuminer l’édifice'])assert.ok(matrix.split('\n').some(line=>line.includes('| '+name+' |')&&line.includes('Contrat à effet calculable')),name);const s=await setup(actor('mage',{extensions:{v5:{channelling:{type:'winds',sl:20}}}}),actor('target'));for(const name of ['Forêt d’Épines','Doppelgänger'])assert.equal(s.previewSpellExecution(name,{actorId:'mage',targetIds:[name==='Doppelgänger'?'mage':'target'],sl:20,attributeActive:false}).ready,false,name);});
test('R2-synchronisation : profil de bête conservé, nouvelles valeurs différées au retour',()=>{const mage=actor('mage',{profileId:'profile'});const transformed=applyBeastForm(mage,BEAST_PROFILES.wolf).participant;transformed.profileId='profile';const before=structuredClone(transformed);const profile={...mage,id:'profile',diceLines:[]};const snap=ficheSnapshot('synthetic',{nom:'mage',carac:Object.fromEntries(Object.entries({cc:40,ct:40,f:90,e:60,int:60,fm:50,i:40,ag:40,dex:40,soc:40}).map(([k,v])=>[k,{base:v,adv:0}])),skillsBasic:{Athlétisme:2},talentsAcq:[],equipment:[]});const next=applyFicheSync({reserve:[profile],combat:{participants:[transformed]},diceLines:[],log:[]},[{profileId:'profile',snapshot:snap}]);const p=next.combat.participants[0];assert.equal(p.maxHp,before.maxHp);assert.equal(p.caracs.F,before.caracs.F);assert.deepEqual(p.skills,before.skills);assert.ok(p.extensions.v5.beastForm.deferredFicheSync);const restored=revertBeastForm(p).participant;assert.equal(restored.caracs.F,90);assert.equal(snap.woundsMax,26);assert.equal(restored.maxHp,26);});
test('R2-10 : Acceptation du Destin rend la Peur automatiquement réussie',async()=>{const s=await setup(actor('mage',{extensions:{v5:{specialStates:{fearImmune:true,terrorAsFear:true}}}}));const p=s.previewResolution({actorId:'mage',action:{type:'skill',attr:'FM',label:'Calme',base:50},roll:95,v5:{kind:'test',choice:'keep',context:{psychologyKind:'fear'}}});assert.equal(p.success,true);});

test('R2-synchronisation : une fiche partielle ne remplace ni les Bmax ni les compétences originales par la bête',()=>{const mage=actor('mage',{profileId:'profile',skills:[{name:'Escalade',carac:'f',total:50}]});const transformed=applyBeastForm(mage,BEAST_PROFILES.boar).participant;const snap=ficheSnapshot('synthetic',{nom:'mage',carac:{fm:{base:70,adv:0}}});const result=applyFicheSync({reserve:[{...mage,id:'profile',diceLines:[]}],combat:{participants:[transformed]},diceLines:[],log:[]},[{profileId:'profile',snapshot:snap}]);const restored=revertBeastForm(result.combat.participants[0]).participant;assert.equal(restored.maxHp,mage.maxHp);assert.deepEqual(restored.skills,mage.skills);});
});

describe('réactions et dissipation (relecture)', () => {
test('R2-01 : une réaction ne consomme ni rune ni tour magique du dissipateur, Store/Undo',async()=>{
 const s=await setup(actor('mage',{extensions:{v5:{channelling:{type:'high',sl:20},cadaiRunes:{deployed:3,max:5}}}}),actor('other'));
 const o={actorId:'mage',targetIds:['mage'],roll:95,cadaiAccessible:true,cadaiRerolls:[{purpose:'test',roll:25}],dispelReaction:{dispellerId:'other',roll:95,distance:1,visible:true}};
 const p=s.previewSpellExecution('Apothéose',o);assert.equal(p.ready,true,p.error);
 const r=await s.applySpellExecution('Apothéose',o);assert.notEqual(r?.ok,false,r?.error);
 assert.equal(s.getCadaiRunes('mage').deployed,2);assert.equal(s.getCadaiRunes('other').deployed,0);
 assert.equal(person(s,'other').extensions.v5.magicAttemptTurn,undefined);await s.undo();assert.equal(s.getCadaiRunes('mage').deployed,3);
});
test('R2-04 : Mage de guerre du tour précédent autorise une réaction dans le tour courant',async()=>{
 const s=await setup(actor(),actor('other',{extensions:{v5:{warWizardTurn:'1:1'}}}));
 const p=s.previewDispelCasting({testSl:5,totalCastingSl:5},{dispellerId:'other',roll:25,distance:1,visible:true});assert.equal(p.allowed,true,p.reason);assert.equal(p.turnKey,'1:2');
});
test('R2-05 : aucune pénalité d’armure en dissipation',async()=>{
 const s=await setup(actor('mage',{equipment:[{id:'ap',kind:'armour',name:'Plate',layer:'rigid',ap:4,locations:['body'],equipped:true}]}));
 const p=s.previewDispelCasting({testSl:9,totalCastingSl:9},{roll:25,distance:1,visible:true});assert.equal(p.armorPenalty,0);assert.equal(p.selectedTest.sl,4);
});
test('R2-06 : Pause et Interruption restent possibles si muet, Surpris ou Inconscient',()=>{
 for(const key of ['surpris','inconscient'])for(const kind of ['pause','interruption'])assert.doesNotThrow(()=>prepareMagicOptions(actor('mage',{states:[{key,level:1}],extensions:{v5:{specialStates:{cannotSpeak:true},warWizardTurn:'1:1'}}}),kind,{turnKey:'1:1',roll:25}));
 assert.throws(()=>prepareMagicOptions(actor('mage',{states:[{key:'surpris',level:1}]}),'casting',{roll:25}),/Surpris/);
});
test('R2-07 : Focalisation Haute Magie sans incident ne paie pas de rune d’incident',async()=>{
 const s=await setup(actor('mage',{extensions:{v5:{cadaiRunes:{deployed:3,max:5}}}}));
 const o={actorId:'mage',type:'high',roll:25,miscastRoll:50,cadaiAccessible:true,cadaiRerolls:[{purpose:'miscast',roll:60}]};
 const p=s.previewChannelling(o);assert.equal(p.miscast,null);assert.equal(p.cadaiReceipt,null);await s.applyChannelling(p,{actorId:'mage'});assert.equal(s.getCadaiRunes('mage').deployed,3);
});
test('R2-08 : Couronne de Flamme donne +1 DR à la Focalisation avec wind UI',()=>{
 const a=actor('mage',{extensions:{v5:{spellEffects:[{id:'crown',spellName:'Couronne de Flamme',loreTestBonus:{lore:'fire',amount:1}}]}}});
 assert.equal(prepareMagicOptions(a,'channelling',{wind:'Aqshy',roll:25}).slModifiers.find(m=>m.id==='spell-lore-bonus')?.amount,1);
});
test('R2-09 : La Fortune est Capricieuse fait échouer une Pause (Test de Focalisation magique en v3 : la réserve est perdue)',()=>{
 const p=previewChannellingPause(actor('mage',{extensions:{v5:{channelling:{type:'winds',sl:5},specialStates:{forceFumbleOnDoubles:true}}}}),{roll:22});assert.equal(p.success,false);assert.equal(p.reserveLost,true);assert.equal(p.test.fumble,true);
});
test('R2-16 : le nom du cuir ne dispense pas une armure de métal de la pénalité de Ghur',()=>{
 const a=actor('mage',{equipment:[{id:'ap',kind:'armour',name:'Cuir trompeur',material:'metal',layer:'rigid',ap:3,locations:['body'],equipped:true}]});assert.equal(calculateMagicArmorPenalty(a,{wind:'Ghur'}).penalty,-3);
 a.equipment[0].material='leather';a.equipment[0].name='Armure sans nom';assert.equal(calculateMagicArmorPenalty(a,{wind:'Ghur'}).penalty,0);
});
test('R2-D10 : une Focalisation colorée vaut pour les huit Vents ; conflit de scores signalé',()=>{
 const a=actor('mage',{skills:[{name:'Focalisation (Aqshy)',total:60}]});for(const wind of ['Ulgu','Azyr','Ghur','Aqshy'])assert.equal(resolveChannellingSkill(a,{wind}).score,60);
 a.skills.push({name:'Focalisation',total:50});const p=resolveChannellingSkill(a,{wind:'Aqshy'});assert.equal(p.score,50);assert.match(p.warning,/anomalie.*Focalisation/i);
});
});

describe('sorts : réduction, formes et acquisition (relecture)', () => {
test('R2-02 : réduction avant plafonnement aux B restants, puis Store/Undo',async()=>{
 const s=await setup(actor('mage',{extensions:{v5:{channelling:{type:'winds',sl:20}}}}),actor('target',{hp:5,extensions:{v5:{damageReduction:3}}}));
 const o={actorId:'mage',targetIds:['target'],roll:25,attributeActive:false};const p=s.previewSpellExecution('Arc de T’Essla',o);assert.equal(p.ready,true,p.error);assert.equal(p.targetResults[0].finalHp,0);await s.applySpellExecution('Arc de T’Essla',o);assert.equal(person(s,'target').hp,0);await s.undo();assert.equal(person(s,'target').hp,5);
});
test('R2-03 : Araignée garde Grimpeur/Toile après Store/reload, retour et Undo',async()=>{
 const s=await setup(actor('mage',{traits:['Trait du mage'],extensions:{traits:['Trait du mage'],v5:{channelling:{type:'winds',sl:20}}}}));
 await s.applySpellExecution('Forme bestiale',{actorId:'mage',targetIds:['mage'],roll:25,beastKey:'giant-spider',attributeActive:false});
 for(const t of ['Grimpeur','Toile 40','Vision nocturne'])assert.ok(person(s).traits.includes(t),t);
 const reloaded=await setup(person(s));for(const t of ['Grimpeur','Toile 40','Vision nocturne'])assert.ok(person(reloaded).traits.includes(t),t);
 await reloaded.revertBeastForm('mage');assert.deepEqual(person(reloaded).traits,['Trait du mage']);await reloaded.undo();assert.ok(person(reloaded).traits.some(t=>/Toile/.test(t)));
});
test('R2-10 : Ennemi Anticipé refuse Surpris à l’acquisition',()=>{
 const p=acquireV5Conditions(actor('mage',{extensions:{v5:{specialStates:{cannotBeSurprised:true}}}}),[{key:'surpris',name:'Surpris',level:1}]);assert.equal(p.participant.states.length,0);assert.match(p.reminders.join(' '),/Surpris/);
});
test('R2-12 : Démonologue reste vivant ; Démon sans E exige une donnée MJ ; Fléau sans cumul',()=>{
 assert.equal(isTargetDaemon(actor('target',{name:'Démonologue'})),false);
 const a=actor('target',{traits:['Démon'],caracs:{FM:20},maxHp:30});assert.throws(()=>previewDaemonbane({caster:actor(),target:a}),/Endurance| E /);
 const target=actor('target',{traits:['Démon'],caracs:{E:90},maxHp:30});const first=applyDaemonbane(target,previewDaemonbane({caster:actor(),target})).target;assert.equal(first.maxHp,15);const twice=applyDaemonbane(first,previewDaemonbane({caster:actor(),target:first})).target;assert.equal(twice.maxHp,15);
});
test('R2-13 et Mort : attribut par effets de protection et cibles vivantes',()=>{
 const p=previewLoreAttribute({lore:'shadow',caster:actor(),spell:{name:'Dôme',effects:{ward:6},duration:'5 Rounds'}});assert.ok(p.casterEffects?.testModifiers);
 const q=previewLoreAttribute({lore:'death',caster:actor(),targets:[actor('construct',{traits:['Artificiel']}),actor('ether',{traits:['Éthéré']}),actor('alive'),actor('dead',{hp:0})]});assert.deepEqual([...q.targetEffects.keys()],['alive']);
});
test('R2-14 : fait décapité par cible rend Apothéose Verdoyante inadmissible',async()=>{
 const s=await setup(actor(),actor('corpse',{hp:0}));const p=s.previewSpellExecution('Apothéose Verdoyante',{actorId:'mage',targetIds:['corpse'],sl:20,timeSinceDeathSec:20,attributeActive:false,targetTests:{corpse:{deathDelaySec:20,decapitated:true}}});assert.equal(p.ready,false);assert.match(p.error,/décapité/);
});
test('R2-15 : le jet spécifique de résistance prime sur roll générique',async()=>{
 const s=await setup(actor(),actor('target'));const p=s.previewSpellExecution('Toucher doré',{actorId:'mage',targetIds:['target'],sl:20,attributeActive:false,domainFacts:{durationDie:2},targetTests:{target:{roll:25,resistanceRoll:95}}});assert.equal(p.ready,true,p.error);assert.equal(p.targetResults[0].resistanceTest.roll,95);
});
test('R2-17 : Lumière aveuglante ne propose pas la surpuissance de zone',()=>{assert.equal(getSpellContract('Lumière aveuglante').overcast.options.includes('aoe'),false);});
test('R2-Main de Gloire : M interdit parmi les caractéristiques choisies',()=>{assert.throws(()=>previewHandOfGlory({chosenStats:['F','M'],roll3d10:12}),/Mouvement|M /);});
test('R2-Apothéose : 0 DR final rend 0 B',()=>{const p=previewVerdantApotheosis({caster:actor(),corpses:[actor('c',{hp:0,timeSinceDeathSec:20})],castingSl:0});assert.equal(p.results[0].healedHp,0);});
test('R2-Épuisement : FM manquante refusée, BFM zéro conservé',()=>{const a=actor('mage',{caracs:{Int:60}});assert.equal(previewBurnout({participant:a,overcastSpent:4,roll:90}).ready,false);assert.match(previewBurnout({participant:a,overcastSpent:4}).error,/FM|Force Mentale/);const p=previewBurnout({participant:actor('mage',{caracs:{FM:0}}),overcastSpent:4,roll:90});assert.equal(p.bfm,0);assert.equal(p.riskPercent,4);});
});

describe('état des sorts : filtrage RTDB et réserves', () => {
test('R2-19 : trous RTDB de sorts/talents/compétences filtrés',()=>{const p=sanitizeParticipant(actor('mage',{spells:[null,{name:'Choc'},false],skills:[null,{name:'Focalisation',total:60}],talents:[null,{name:'X'}]}));assert.deepEqual(p.spells,[{name:'Choc'}]);assert.equal(p.skills.length,1);assert.equal(p.talents.length,1);});
test('R2-23 : réserve sans type rejetée, forme invalide rejetée',()=>{let p=sanitizeParticipant(actor('mage',{extensions:{v5:{channelling:{sl:10000},beastForm:{durationMinutes:-1,beastProfile:{caracs:{F:'abc'}}}}}}));assert.equal(p.extensions.v5.channelling.sl,0);assert.equal(p.extensions.v5.beastForm,undefined);});
test('R2-22 : Blizzard ne demande plus de jets à 0 B ; auteur absent produit un rappel',()=>{
 const e={id:'e',spellName:'Blizzard enflammé de Ygethmor',spellId:getSpellContract('Blizzard enflammé de Ygethmor').id,casterId:'mage',appliedAtRound:1,roundEffect:getSpellContract('Blizzard enflammé de Ygethmor').effects.roundEffect};
 let p=roundSpellEffects([actor(),actor('target',{hp:0,extensions:{v5:{spellEffects:[e]}}})],'endOfRound',2);assert.deepEqual(p.requests,[]);
 p=roundSpellEffects([actor('target',{extensions:{v5:{spellEffects:[e]}}})],'endOfRound',2);assert.ok(p.logs.some(l=>/auteur|lanceur.*absent/i.test(l.text)));
});
test('R2-22 : journal d’incident mineur ne contient pas undefined',async()=>{const s=await setup(actor(),actor('target'));await s.applySpellExecution('Carreau',{actorId:'mage',targetIds:['target'],roll:11,criticalChoice:'total-power',miscastRoll:15,attributeActive:false});assert.doesNotMatch(JSON.parse(s.getFullJSON()).log.map(l=>l.text).join(' '),/undefined/);});
test('R2-Lames Azurées : ajouter un adversaire engagé après le lancement',async()=>{
 const s=await setup(actor('mage',{extensions:{v5:{channelling:{type:'winds',sl:20}}}}),actor('target',{camp:'ennemi'}));await s.applySpellExecution('Lames Azurées',{actorId:'mage',targetIds:['mage'],roll:25,attributeActive:false,secondaryTargets:{engaged:[]}});
 const e=person(s).extensions.v5.spellEffects.find(e=>e.recurringHits);assert.ok(e);
 const p=s.previewSpellInteraction({kind:'engage',effectId:e.id,targetId:'target',engaged:true});assert.equal(p.ready,true,p.error);await s.applySpellInteraction({kind:'engage',effectId:e.id,targetId:'target',engaged:true});assert.ok(person(s).extensions.v5.spellEffects.find(layer=>layer.id===e.id).recurringHits.targetIds.includes('target'));await s.undo();assert.equal(person(s).extensions.v5.spellEffects.find(e=>e.recurringHits).recurringHits.targetIds.includes('target'),false);
});

test('R2-22 : une vraie fin de Round ne duplique pas son entrée de journal',async()=>{const s=await setup(actor('mage',{states:[{id:'s',key:'sonne',name:'Sonné',level:1}]}),actor('other'));const engine=createCombatEngine(s);await engine.nextTurn();await engine.nextTurn();const rows=JSON.parse(s.getFullJSON()).log.filter(e=>e.actorId==='mage'&&/fin de Round/.test(e.text||''));assert.equal(rows.length,1);assert.equal(new Set(rows.map(e=>e.id)).size,1);});
});

describe('reliquats : RTDB, Peur du Cor, contrats', () => {
test('Reliquat 1 : trous RTDB et lignes non objets filtrés sur tous les tableaux de fiche et participant',async()=>{
 const item={id:'sword',kind:'weapon',name:'Épée',keywords:[null,{id:'rapide',parameter:''}],locations:[null,'rightArm']};
 const action={id:'sword',type:'attack',attr:'CC',base:60,note:'Coupe',damage:4,qualities:[null,'rapide']};
 const state={id:'s1',key:'sonne',name:'Sonné',level:1};
 const layer={id:'l1',spellId:'sp1',spellName:'Choc',duration:2};
 const raw=actor('mage',{
  equipment:[null,false,'',[],item],
  weapons:[null,false,'',[],{id:'w1',name:'Dague'}],
  armours:[null,false,'',[],{id:'a1',name:'Cuir',ap:1}],
  traits:[null,false,'',[],{},'Peur (1)'],
  states:[null,false,'',[],{},state],
  actions:[null,false,'',[],action],
  diceLines:[null,false,'',[],action],
  spells:[null,false,'',[],{id:'sp1',name:'Choc'}],
  talents:[null,false,'',[],{id:'talent-war-wizard',name:'Mage de guerre',rank:1,status:'resolved'}],
  skills:[null,false,'',[],{id:'sk1',name:'Focalisation',total:60}],
  prayers:[null,false,'',[],{id:'pr1',name:'Bénédiction'}],
  tags:[null,false,'',[],'Élite'],
  extensions:{
   traits:[null,false,'',[],{name:'Vision nocturne'}],
   v5:{
    baseTraits:[null,'Peur (1)'],
    temporaryTraits:[null,'Grimpeur'],
    spellEffects:[null,false,'',[],layer],
    wards:[null,{threshold:7}],
    suppressedSpellIds:[null,'','sp2']
   }
  }
 });
 const sp=sanitizeParticipant(raw),pr=sanitizeProfile(raw);
 assert.equal(sp.equipment.length,1);
 assert.deepEqual(sp.equipment[0].keywords,[{id:'rapide',parameter:''}]);
 assert.deepEqual(sp.equipment[0].locations,['rightArm']);
 assert.deepEqual(sp.traits,['Peur (1)']);
 assert.deepEqual(sp.extensions.traits,[{name:'Vision nocturne'}]);
 assert.deepEqual(sp.extensions.v5.baseTraits,['Peur (1)']);
 assert.deepEqual(sp.extensions.v5.temporaryTraits,['Grimpeur']);
 assert.deepEqual(sp.extensions.v5.suppressedSpellIds,['sp2']);
 assert.equal(sp.states.length,1);assert.equal(sp.states[0].key,'sonne');
 assert.equal(sp.actions.length,1);assert.equal(sp.actions[0].id,'sword');
 assert.equal(pr.diceLines.length,1);assert.equal(pr.diceLines[0].id,'sword');
 assert.equal(sp.spellEffects.length,1);assert.equal(sp.spellEffects[0].id,'l1');
});

test('Reliquat 1 : attaque Store avec ligne vide d’équipement, sauvegarde et rechargement',async()=>{
 const store=await setup(actor('mage',{equipment:[null]}),actor('target',{camp:'ennemi',equipment:[null]}));
 const options={actorId:'mage',targetId:'target',action:{id:'sword',type:'attack',attr:'CC',base:60,damage:4,qualities:[]},roll:25,defense:{base:30,roll:75,v5:{kind:'melee'}},v5:{kind:'melee'}};
 const preview=store.previewResolution(options);assert.equal(preview.success,true);
 const reloaded=await setup(person(store),person(store,'target'));
 assert.equal(reloaded.previewResolution(options).success,true);
 assert.deepEqual(person(reloaded).equipment,[]);
});

test('Reliquat 2 : Cor du Andar exige et expose le Test secondaire de Peur uniquement pour un ennemi',async()=>{
 const foe=actor('foe',{camp:'ennemi'}),ally=actor('ally',{camp:'pj'});
 const s=await setup(actor(),foe,ally);
 const blocked=s.previewSpellExecution('Cor du Andar',{actorId:'mage',targetIds:['foe'],sl:20,attributeActive:false});
 assert.equal(blocked.ready,false);
 const readyEnemy=s.previewSpellExecution('Cor du Andar',{actorId:'mage',targetIds:['foe'],sl:20,attributeActive:false,targetTests:{foe:{fearRoll:40}}});
 assert.equal(readyEnemy.ready,true,readyEnemy.error);
 const readyAlly=s.previewSpellExecution('Cor du Andar',{actorId:'mage',targetIds:['ally'],sl:20,attributeActive:false});
 assert.equal(readyAlly.ready,true,readyAlly.error);
});

test('Reliquat 3 : Chasseur de démons et Démonologue ne qualifient aucune source comme Démon, Mort-vivant, Artificiel ou Éthéré',async()=>{
 const {isTargetUndead,isTargetConstruct,isTargetEthereal,hasLivingMagicNature}=await import('../../../js/core/v5-magic-attributes.js');
 const {resolveSpellDamage}=await import('../../../js/core/v5-magic-effects.js');
 for(const label of ['Chasseur de démons','Démonologue','Pas un Démon','Démoniste','Chasseur de morts-vivants','Chasseur d’Artificiels','Haine (Éthérés)']){
  for(const fields of [{traits:[label]},{extensions:{traits:[{name:label}]}},{tags:[label]},{species:label},{category:label}]){
   const t=actor('target',fields);
   assert.equal(isTargetDaemon(t),false,JSON.stringify(fields));
   assert.equal(isTargetUndead(t),false,JSON.stringify(fields));
   assert.equal(isTargetConstruct(t),false,JSON.stringify(fields));
   assert.equal(isTargetEthereal(t),false,JSON.stringify(fields));
   assert.equal(hasLivingMagicNature(t),true,JSON.stringify(fields));
  }
 }
 for(const label of ['Démon','Daemon','Daemonic','Démoniaque','Démon (9+)','Sanguinaire'])assert.equal(isTargetDaemon(actor('target',{traits:[label]})),true,label);
 assert.equal(isTargetDaemon(actor('target',{isDaemon:true,traits:['Chasseur de démons']})),true);
 assert.equal(isTargetConstruct(actor('target',{isConstruct:true})),true);
 assert.equal(isTargetEthereal(actor('target',{isEthereal:true})),true);
 const hunter=actor('target',{traits:['Démonologue','Chasseur de démons','Chasseur de morts-vivants']});
 assert.equal(resolveSpellDamage({caster:actor(),target:hunter,formula:'4',roll:24,spell:{daemonBonus:5,undeadBonus:5,ignoreAp:true}}).rawDamage,4);
 for(const fields of [{camp:'ennemi',traits:['Chasseur de démons']},{camp:'ennemi',tags:['Chasseur de démons']}]){
  const store=await setup(actor(),actor('target',fields));
  const preview=store.previewSpellExecution('Fléau des Démons',{actorId:'mage',targetIds:['target'],sl:20,attributeActive:false});
  assert.equal(preview.ready,false);assert.match(preview.error,/n’est pas un Démon|n'est pas un Démon/);
  const banish=store.previewSpellExecution('Bannissement Majeur',{actorId:'mage',targetIds:['target'],sl:20,attributeActive:false});
  assert.equal(banish.targetResults[0].resisted,true);
  const taste=store.previewSpellExecution('Goût de la Mort',{actorId:'mage',targetIds:['target'],sl:20,attributeActive:false,targetTests:{target:{resistanceRoll:95,despairRoll:95}}});
  assert.equal(taste.ready,true,taste.error);
  assert.equal(Boolean(taste.targetResults[0].resisted),false);
 }
});

for(const name of ['Drain de Magie','Blizzard enflammé de Ygethmor','Bannissement Majeur','Pulvérisation Musquée'])test('Reliquat 4 : difficulté V5 de '+name,()=>{
 const spell=snapshot.magic.spells.find(s=>s.nom===name);
 assert.doesNotMatch(spell.desc,/Difficile \(\+0(?: DR)?\)|Moyen \(\+2 DR\)/);
 assert.doesNotMatch(getSpellContract(name).reminders,/Difficile \(\+0(?: DR)?\)|Moyen \(\+2 DR\)/);
 assert.match(spell.desc,name==='Drain de Magie'||name==='Blizzard enflammé de Ygethmor'?/Intermédiaire \(\+0 DR\)/:/Accessible \(\+2 DR\)/);
});

test('Reliquat 4 : libellés des options de surpuissance des contrats harmonisés en DR V5',async()=>{
 const {getAllSpellContracts}=await import('../../../js/core/v5-spell-contracts.js');
 for(const c of getAllSpellContracts()){
  for(const opt of c.overcast?.specific || []){
   const text=(opt.label || '')+' '+(opt.reminder || '');
   assert.doesNotMatch(text,/\([+−-](?:10|20|30)\)|Difficile\s*[−-](?:10|20)|Test d’Intelligence\s*[−-]10/,c.name+' : '+text);
  }
 }
});

test('Reliquat 4 : Attaque Rapide, libellé du miracle sans mécanisation ajoutée',()=>{
 const miracle=snapshot.magic.miracles.find(s=>s.nom==='Attaque Rapide');
 assert.match(miracle.effet,/Intermédiaire \(\+0 DR\)/);
 assert.doesNotMatch(miracle.effet,/Difficile \(\+0/);
});

test('Reliquat 5 : Apothéose +10 DR rappelle Yenlui Sombre (HEPG p.86)',()=>{
 const spell=snapshot.magic.spells.find(s=>s.nom==='Apothéose');
 assert.match(spell.desc,/\+10 DR[^]*Yenlui \(Sombre\)/);
 assert.match(getSpellContract('Apothéose').reminders,/\+10 DR[^]*Yenlui \(Sombre\)/);
});
});

describe('durées et soins du catalogue (retours)', () => {
const text=name=>snapshot.magic.spells.find(s=>s.nom===name).desc;
const category=name=>fs.readFileSync('docs/lot3/LOT3_MATRICE_CONTRATS_V5.md','utf8').split('\n').find(l=>l.includes('| '+getSpellContract(name).name+' |')).split('|').map(s=>s.trim())[9];

test('Retours catalogue — V5 pp.242–244 : cinq durées sans signe parasite et unités lisibles',()=>{
 for(const name of ['Arme aethyrique','Armure aethyrique','Bouclier anti-flèches','Pont','Envol'])assert.equal(getSpellContract(name).duration,'Bonus de Force Mentale Rounds',name);
 for(const c of getAllSpellContracts())for(const field of ['range','target','duration'])assert.doesNotMatch(c[field],/\+\s*$|\bmetres\b|(?<!\p{L})m(?!\p{L})/u,c.name+' '+field);
});
test('Retours catalogue — HEPG pp.82,89 : malus de Tests en DR et clés conservées',()=>{
 assert.match(text("Masque de l'Esprit (Shyish & Ulgu)"),/−3 DR/);assert.doesNotMatch(text("Masque de l'Esprit (Shyish & Ulgu)"),/-30|–30|−30/);
 assert.match(text('Tempête'),/−3 DR/);assert.doesNotMatch(text('Tempête'),/–30|−30|-30/);assert.equal(getSpellContract('Tempête').name,'Tempête');
});
test('Retours catalogue — WoM pp.63,77,135–136 : échéances et Corrompu fidèles',()=>{
 assert.match(text('Tempête de Flammes'),/jusqu’à dissipation ou jusqu’à l’aube/);
 assert.equal(getSpellContract('Réplique de Levorg').duration,'1d10 heures');assert.match(text('Réplique de Levorg'),/1d10 heures/);
 assert.match(text('Yeux de Volans'),/Corrompu/);assert.match(text('Yeux de Volans'),/peut.*échapper/);assert.doesNotMatch(text('Yeux de Volans'),/sauf celles cachées/);
 for(const name of ['Colérique','Flamme Inextinguible'])assert.match(snapshot.magic.spells.find(s=>s.nom===name).duree,/Bonus de Force Mentale.*heures/);
});
test('Retours catalogue — Abulla et Ver Grouillant : Enchevêtré et descriptions sans abréviations de caractéristiques',()=>{
 for(const name of ["Piège d'Abulla",'Ver Grouillant']){assert.match(text(name),/Enchevêtré/);assert.doesNotMatch(text(name),/Empêtré|Immobilisé/);}
 for(const s of snapshot.magic.spells)assert.doesNotMatch(s.desc,/\b(?:BFM|BI|FM)\b/,s.nom);
});
test('Retours catalogue — tous les libellés de faits et options sont lisibles sans changer leurs identifiants',()=>{
 const forbidden=/[a-zà-ÿ][A-ZÀ-Þ0-9]|[a-zà-ÿ]\{|[a-zà-ÿ][+−–-]\d|\d(?:m|cm|pouces)\b|\d×[A-Z]/u;
 const check=(value,name)=>{const readable=String(value).replace(/\b(?:\d*d\d+|WoM|Tzeentch|Anoqeyån)\b/gu,'');assert.doesNotMatch(readable,forbidden,name+' : '+value);};
 for(const c of getAllSpellContracts()){
  for(const option of c.overcast.specific||[])check(option.label,c.name);
  for(const fact of c.effects.facts||[]){check(fact.label,c.name);for(const option of fact.options||[])check(option[1],c.name);}
 }
});
test('Retours catalogue — Écaille et Robe : deux sources distinctes, aucune proposition d’alias',()=>{
 assert.doesNotMatch(getSpellContract('Écaille d’acier').assistedClauses.join(' '),/p\. 75\s*:\s*Robe scintillante/);
 const audit=JSON.parse(fs.readFileSync('docs/lot3/LOT3_AUDIT_SORTS.json','utf8'));
 const scale=audit.items.find(s=>s.name==='Écaille d’acier');assert.doesNotMatch(JSON.stringify(scale),/possible alias|alias.*confirm|à.?valider/i);
 assert.doesNotMatch(fs.readFileSync('docs/lot3/LOT3_RAPPORT_CONTRATS_LOT5A.md','utf8'),/Option A.*deux identités|possible alias/);
});
test('Retours catalogue — WoM p.123 : Bjuna et Délivrance exécutés à la vraie fin de Tour et classés calculables',async()=>{
 for(const name of ['Destin de Bjuna','Délivrance de la Mort']){
  const {store,engine}=await fixture({foe:name==='Délivrance de la Mort'?{states:[],traits:['Mort-vivant','Éthéré']}:{states:[]}});
  await execute(store,name,input5b(name));const before=subject(store,'foe');const e=before.extensions.v5.spellEffects.find(e=>e.spellId===getSpellContract(name).id);assert(e?.roundEffect);
  await endTurn(engine);await endTurn(engine,{inputs:{foe:{['spell:'+e.id+':roundTest']:95,['spell:'+e.id+':headOrBody']:25}}});
  assert(level(subject(store,'foe'),'Sonné')>level(before,'Sonné'),name);if(name==='Destin de Bjuna')assert(subject(store,'foe').hp<before.hp,name);
  assert.match(category(name),/^Contrat à effet calculable/,name);
 }
});
test('Retours catalogue — quatre zones périodiques classées après effets et non après métadonnées',()=>{
 for(const name of ['Blizzard enflammé de Ygethmor','Comète de Cassandora','Bannissement Majeur','Tempête'])assert.match(category(name),/^Contrat à effet calculable/,name);
 for(const name of ['Pont','Ériger l’édifice'])assert.match(category(name),/^Rappel/,name);
 assert.match(category('Sang de la Terre'),/^Contrat nécessitant des données MJ/);
});
test('Retours catalogue — V5 p.250 : Sang de la Terre exige la terre puis soigne au vrai début de Round',async()=>{
 const {store,engine}=await fixture(),c=getSpellContract('Sang de la Terre');
 const i={actorId:'mage',targetIds:['foe'],sl:12,attributeActive:false,locationRoll:34,domainFacts:{},targetTests:{foe:{roll:95}}};
 assert.equal(store.previewSpellExecution(c.id,i).ready,false);
 i.domainFacts.directEarth=true;const before=subject(store,'foe').hp;
 await store.applySpellExecution(c.id,i);assert.equal(subject(store,'foe').hp,before);
 await endTurn(engine);await endTurn(engine);assert.equal(subject(store,'foe').hp,before+6);
 assert.match(category(c.name),/^Contrat nécessitant des données MJ/);
});
test('Retours catalogue — une couche périodique qui ne produit que des reçus ne devient pas calculable',async()=>{
 const {store}=await fixture(),control=JSON.parse(store.getFullJSON());
 await store.applySpellEffects('foe',{id:'receipt-only',spellId:'receipt-only',spellName:'Quantité déclarée',casterId:'mage',duration:'6 Rounds',roundEffect:{phase:'endOfRound',quantityPerRound:1,quantityMaxFormula:'10',unit:'pintes'}});
 const applied=JSON.parse(store.getFullJSON()),measure=s=>s.combat.participants.map(p=>({id:p.id,hp:p.hp,caracs:p.caracs,armor:normalizeArmorLocations(p.armor),states:p.states,traits:p.traits}));
 assert.equal(await measurePeriodicSpellOutcome(applied,control,measure),false);
});
});
