import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,cast,endTurn} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import {oppositeCamp} from '../js/core/v5-magic-turn.js';

const c=getSpellContract('Manifestation de Démon Mineur');
const demons=store=>store.listParticipants().filter(p=>p.extensions?.v5?.summonedBySpellId===c.id);

async function expire(store,engine){
 const layer=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.spellId===c.id);
 const state=JSON.parse(store.getFullJSON());state.combat.round=layer.expiresAtRound;state.combat.currentActorId='mage';
 await store.loadFromJSON(state);await endTurn(engine);
}
async function run(outcome,casterCamp){
 const {store,engine}=await encounter(casterCamp?{mage:{camp:casterCamp}}:{});
 await cast(store,c,{domainFactsExtra:{daemonKind:'bloodletter',commandOutcome:outcome}});
 return {store,engine};
}

test('oppositeCamp : ennemi ↔ non-ennemi',()=>{
 assert.equal(oppositeCamp('pj'),'ennemi');assert.equal(oppositeCamp('allie'),'ennemi');assert.equal(oppositeCamp('ennemi'),'allie');assert.equal(oppositeCamp('Hostile'),'allie');
});

test('D-C32 — expiration : le démon reste, hostile au lanceur, avec le rappel ; Annuler le rétablit',async()=>{
 const {store,engine}=await run('obeys');
 assert.equal(demons(store)[0].camp,'pj','pendant la durée, il sert le lanceur');
 await expire(store,engine);
 assert.ok(!subject(store,'mage').extensions.v5.spellEffects?.some(e=>e.spellId===c.id),'le sort est expiré');
 const [demon]=demons(store);
 assert.ok(demon,'le démon n’est pas retiré');
 assert.equal(demon.camp,'ennemi');
 assert.match(demon.notes,/ordre accompli : retirez le démon/i);
 await store.undo();
 assert.equal(demons(store)[0].camp,'pj');assert.ok(!demons(store)[0].notes);
});

test('D-C32 — lanceur ennemi : le démon devient allié des PJ à l’expiration',async()=>{
 const {store,engine}=await run('obeys','ennemi');
 await expire(store,engine);
 assert.equal(demons(store)[0].camp,'allie');
});

test('Le démon qui l’emporte est dans le camp opposé au lanceur, y compris lanceur ennemi',async()=>{
 assert.equal(demons((await run('attacks')).store)[0].camp,'ennemi');
 assert.equal(demons((await run('attacks','ennemi')).store)[0].camp,'allie');
});
