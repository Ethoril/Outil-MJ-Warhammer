import assert from 'node:assert/strict';
import {encounter} from './lot3-domain-fixture.js';
import {getAllSpellContracts} from '../../js/core/v5-spell-contracts.js';
export const contractFor=name=>getAllSpellContracts().find(c=>c.name===name);
const cFor=contractFor;
// Attentes transcrites des pages complètes WoM (numérotation PDF = imprimée).
export const sourceCases=[
 ['Sang Bouillonnant',134,5,'Contact','1','1 Round'],
 ['Epées Sanguines',137,6,'Force Mentale mètres','Vous','Bonus de Force Mentale minutes'],
 ['Blizzard enflammé de Ygethmor',137,12,'Force Mentale mètres','ZdE Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Transe d’Ambre',146,4,'Initiative mètres','1','Bonus de Force Mentale minutes'],
 ['Éveil du Bois',146,8,'Force Mentale mètres','ZdE Force Mentale mètres','Instantané'],
 ['Malédiction d’Anraheir',147,5,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Yeux de la Meute',147,3,'Contact','1','Force Mentale minutes'],
 ["Suivi de l'Odeur",148,4,'Vous','Vous','Initiative minutes'],
 ['Lunes du Chasseur',148,8,'Vous','ZdE Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Le Bœuf Reste Debout',149,5,'Vous','ZdE Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Ver Grouillant',149,4,'Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Escalier en Spirale',89,6,'Vous','Vous','Bonus de Force Mentale minutes'],
 ['Transmogrification Exaltée de Colchis',89,6,'Force Mentale mètres','ZdE Force Mentale mètres','Bonus de Force Mentale minutes'],
 ['Apothéose Verdoyante',89,16,'Ligne de vue','ZdE Bonus de Force Mentale mètres','Instantané'],
 ['L’Étreinte d’Iyrtu',124,4,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Les Enfants Sauvages de Zandox',125,5,'Spécial','Vous','Bonus de Force Mentale Rounds'],
 ['Cor du Andar',111,5,'ZdE Sociabilité mètres','Vous','Force Mentale minutes'],
 ['Visage mutable',112,4,'Contact','1','Bonus de Force Mentale heures']
];
export async function fixture(extra={}){return encounter({mage:{armor:{head:0,body:0,arms:0,legs:0},...extra.mage},foe:{hp:200,maxHp:300,...extra.foe}});}
export function input(name,patch={}){const c=cFor(name);return {actorId:'mage',targetIds:c.target==='Vous'?['mage']:['foe'],sl:12,attributeActive:false,locationRoll:34,resistanceRoll:95,domainFacts:{mode:'attractive',durationMode:'normal',opposedActorRoll:25},targetTests:{foe:{roll:95,opponentRoll:95,unwilling:true,mount:false,inside:true},mage:{roll:95,unwilling:false,mount:false,inside:true}},...patch};}
export async function execute(store,name,patch={}){const answer=input(name,patch),before=store.listParticipants(),p=store.previewSpellExecution(cFor(name).id,answer);assert.deepEqual(store.listParticipants(),before);assert.equal(p.ready,true,name+': '+p.error);const r=await store.applySpellExecution(cFor(name).id,answer);assert.notEqual(r?.ok,false,r?.error);return p;}
