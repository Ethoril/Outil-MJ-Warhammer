import {createCombatEngine} from '../js/core/combat.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {actor,setup,person} from './helpers/relecture2-fixture.js';
import {sanitizeParticipant} from '../js/core/sanitize.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import {roundSpellEffects,previewSpellInteraction} from '../js/core/v5-magic-turn.js';
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
