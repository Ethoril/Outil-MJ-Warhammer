import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import snapshot from '../js/data/reference-snapshot.json' with {type:'json'};
import {getAllSpellContracts,getSpellContract} from '../js/core/v5-spell-contracts.js';
import {fixture,execute,subject,level,endTurn} from './helpers/lot3-catalogue-fixture.js';
import {input as input5b} from './helpers/lot5b-catalogue-fixture.js';
import {measurePeriodicSpellOutcome} from '../tools/spell-coverage-probe.mjs';
import {normalizeArmorLocations} from '../js/core/equipment.js';
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
