import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const person=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,fortune:3,fate:1,profileId:'profile-a',caracs:{CC:40,Ag:40,FM:50,E:30},skills:[],talents:[],states:[],equipment:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{fate:1}},...extra});
async function setup(){const s=createStore({storage:null});await s.ready;await s.loadFromJSON({schemaVersion:3,reserve:[person('profile-a')],combat:{round:1,currentActorId:'copy-a',order:['copy-a','copy-b','enemy'],participants:[person('copy-a'),person('copy-b'),person('enemy',{kind:'PNJ',camp:'ennemi',profileId:undefined})]},extensions:{v5:{turnIndex:1}}});await s.setFortune('copy-a',3);return s;}
const actor=s=>s.listParticipants().find(p=>p.id==='copy-a');
const attack={name:'Épreuve',type:'test',attr:'FM',base:50};
test('F2-L characterization: Chance buys Avantage before the initial roll',async()=>{const s=await setup();const p=s.previewResolution({actor:actor(s),action:attack,roll:88,v5:{kind:'test',fortuneForAdvantage:true}});assert.equal(p.test.advantage.advantage.length,1);});
test('F2-L characterization: successive Chance rerolls use the latest result and charge each time',async()=>{const s=await setup();const p=s.previewResolution({actor:actor(s),action:attack,roll:88,v5:{kind:'test',fortuneReroll:true,fortuneRerollRolls:[78,24]}});assert.deepEqual(p.fortuneReroll.rolls,[78,24]);assert.equal(p.test.roll,24);await s.applyResolution(p);assert.equal(s.getFortune('copy-a').balance,1);});
test('F2-L characterization: setting Fate on an unbacked PJ copy updates profileId peers and reserve',async()=>{const s=await setup();await s.setFate('copy-a',2,{reason:'arbitrage MJ'});assert.equal(actor(s).extensions.v5.fate,2);assert.equal(s.listParticipants().find(p=>p.id==='copy-b').extensions.v5.fate,2);assert.equal(JSON.parse(s.getFullJSON()).reserve[0].extensions.v5.fate,2);});
