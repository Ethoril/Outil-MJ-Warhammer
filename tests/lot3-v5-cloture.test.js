import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createStore } from '../js/core/store.js';
import { availableV5TalentActions, sourceActive } from '../js/core/v5-talent-actions.js';

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
 const {refreshReferences,getReferenceSnapshot}=await import('../js/core/reference-catalog.js');
 const snapshot=JSON.parse(fs.readFileSync(new URL('../js/data/reference-snapshot.json',import.meta.url),'utf8'));
 const result=await refreshReferences({forceRefresh:true,storage:null,fetchImpl:async url=>({ok:true,text:async()=>fs.readFileSync(new URL('../js/data/reference-source-csv/'+new URL(url).searchParams.get('sheet')+'.csv',import.meta.url),'utf8')})});
 assert.equal(result.ok,true);assert.equal(getReferenceSnapshot().contentVersion,snapshot.contentVersion);
 const lileath=getReferenceSnapshot().talents.entries.find(t=>t.id==='talent-lileath-s-blessing');assert.ok(lileath.description.startsWith('+1'));
 const s=await setup(actor('mage',{talents:[talent('lileath-s-blessing')]}));assert.equal(s.previewChannelling({actorId:'mage',type:'high',roll:75}).test.sl,2);
 for(const id of ['suave','luck','strike-mighty-blow','nimble-fingered'])assert.ok(getReferenceSnapshot().talents.entries.find(t=>t.id==='talent-'+id).description.startsWith('='),id);
 assert.doesNotMatch(getReferenceSnapshot().talents.entries.find(t=>t.id==='talent-small').description,/Frappes Mortelles/);
});
test('Section 0 — Petit : toucher une cible survivante ne déclenche aucune Frappe Mortelle',async()=>{
 const s=await setup(actor('mage'),actor('target',{hp:100,maxHp:100,talents:[talent('small')]}));
 const p=s.previewResolution({resolutionId:'closure-small',actorId:'mage',targetId:'target',action:{type:'attack',attr:'CC',base:60,damage:5},roll:25,defense:{base:20,roll:91,v5:{kind:'melee',choice:'keep'}},v5:{kind:'melee',choice:'keep',actorSize:4,targetSize:2}});
 assert.deepEqual(p.unresolved,[]);assert.equal(p.hit,true);assert.equal(p.critical,null);assert.equal(p.defenderCritical,null);
 await s.applyResolution(p);assert.ok(person(s,'target').hp>0);assert.equal(person(s,'target').states.some(e=>/mort|dead/i.test(e.key||e.name)),false);
});
test('Clôture — couverture : le générateur reproduit les données validées et deux générations identiques',()=>{
 const root=path.resolve(import.meta.dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'lot3-cloture-coverage-'));
 try{for(const f of ['tools/build-v5-talent-coverage.mjs','js/data/reference-snapshot.json','docs/lot2/LOT2_INVENTAIRE_TALENTS.json','docs/lot2/LOT2_TRI_TALENTS.json','js/data/v5-magic-talent-coverage.json',...['v5-talent-contracts','v5-test-talent-contracts','v5-quality-talent-contracts','v5-additional-talent-contracts'].map(n=>'js/data/'+n+'.json')]){fs.mkdirSync(path.dirname(path.join(tmp,f)),{recursive:true});fs.copyFileSync(path.join(root,f),path.join(tmp,f));}
 execFileSync(process.execPath,['tools/build-v5-talent-coverage.mjs'],{cwd:tmp});const first=fs.readFileSync(path.join(tmp,'js/data/v5-talent-coverage.json'));assert.deepEqual(first,fs.readFileSync(path.join(root,'js/data/v5-talent-coverage.json')));
 execFileSync(process.execPath,['tools/build-v5-talent-coverage.mjs'],{cwd:tmp});assert.deepEqual(fs.readFileSync(path.join(tmp,'js/data/v5-talent-coverage.json')),first);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
