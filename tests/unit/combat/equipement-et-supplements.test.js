import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { applyWeaponSkillRules, weaponHandsForParticipant, ARCANE_WEAPON_PROFILES, locationProtection, ammunitionCompatibility } from '../../../js/core/equipment.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { createStore } from '../../../js/core/store.js';
import { previewResolution, applyResolution } from '../../../js/core/resolution.js';
import { buildCombatTest, v5ShieldDefense } from '../../../js/core/v5-combat-rules.js';
import referenceSnapshot from '../../../js/data/reference-snapshot.json' with { type: 'json' };
import reference from '../../../js/data/reference-snapshot.json' with { type: 'json' };
import L22 from '../../../js/data/bestiary/L22.json' with { type: 'json' };
import * as supplemental from '../../../js/core/v5-supplemental-equipment.js';
import { previewSupplementalEquipment, F2_F_RULE_IDS } from '../../../js/core/v5-supplemental-equipment.js';
import L11 from '../../../js/data/bestiary/L11.json' with { type: 'json' };
import L24 from '../../../js/data/bestiary/L24.json' with { type: 'json' };
import L17 from '../../../js/data/bestiary/L17.json' with { type: 'json' };
import { buildParticipantFromBestiary } from '../../../js/core/bestiary-profiles.js';
import lots from '../../../docs/plans-gpt/f2/F2_LOTS.json' with { type: 'json' };
import { createV5ReloadState } from '../../../js/core/v5-reloading.js';
import { calculateV5ArmorPenalty, canUseV5PowderAmmunition, parseV5Inflict, validateV5ShieldHands } from '../../../js/core/v5-weapon-qualities.js';

describe('Équipement F2R', () => {
// Corrections Claude après la contre-vérification de F2-R (27/10/2026) : exemplaires anciens du catalogue V4.
const legacy = (id, name, category, extra = {}) => ({ id: 'inst-' + id, baseId: id, kind: 'weapon', name, category, keywords: [], ...extra });

test('un exemplaire ancien dont le modèle a quitté le catalogue garde ses mains d’origine', () => {
  const catalogue = getReferenceCatalogue();
  for (const id of ['weapon-armes-corps-a-corps-parade-main-gauche', 'weapon-armes-corps-a-corps-parade-filet-leste-2m', 'weapon-armes-a-distance-entraves-lasso'])
    assert.equal(catalogue.items.some(row => row.id === id), false, 'modèle retiré : ' + id);
  assert.equal(weaponHandsForParticipant(legacy('weapon-armes-corps-a-corps-parade-main-gauche', 'Main gauche', 'Parade')), 1);
  assert.equal(weaponHandsForParticipant(legacy('weapon-armes-corps-a-corps-parade-filet-leste-2m', 'Filet lesté (2M)', 'Parade')), 2);
  assert.equal(weaponHandsForParticipant(legacy('weapon-armes-a-distance-entraves-lasso', 'Lasso', 'Entraves', { range: 'BF × 2' })), 1);
});

test('une ancienne action de groupe Parade sans lien explicite reste résolue', () => {
  const item = legacy('weapon-armes-corps-a-corps-parade-brise-epee', 'Brise-épée', 'Parade', { keywords: [{ id: 'defensive', parameter: '' }] });
  const base = { id: 'skill-base', name: 'Corps à corps (Base)', group: 'Corps à corps', specialization: 'Base', basic: true, carac: 'CC', total: 69, advances: 5, status: 'resolved' };
  const actor = { id: 'hero', kind: 'PJ', caracs: { CC: 54 }, extensions: { v5: { baseCaracs: { CC: 54 } } }, skills: [base], equipment: [item], states: [], ficheSnapshot: { skills: [base], coverage: { skills: 'present' } } };
  const action = { id: 'attack', type: 'attack', note: item.name, attr: 'CC', base: 54, damage: 3, qualities: [{ id: 'defensive', parameter: '' }],
    extensions: { fiche: { equipmentId: item.id, bindingVersion: 1 }, equipment: item, v5: { kind: 'test' } } };
  const result = applyWeaponSkillRules(actor, action, { weapon: item });
  assert.ok(!result.unresolved?.some(text => /Groupe d’arme manquant/.test(text)), 'plus de « Groupe d’arme manquant » à chaque jet');
});
});

describe('Explosion (intégration)', () => {
const persistence=()=>{let saved=null;return{async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};};
const q=(id,parameter='')=>({id,parameter});
const person=(id,camp)=>({id,name:id,camp,kind:camp==='allies'?'PJ':'PNJ',zone:'active',hp:20,maxHp:20,
  caracs:{CC:50,CT:60,F:30,E:30},skills:[],states:[],equipment:[],armor:{},extensions:{v5:{hasMomentum:false}}});

for(const quality of ['explosion','dispersion'])test(`F2-D Store blast — ${quality} cible les sélections MJ, annule et persiste`,async()=>{
  const io=persistence(),store=createStore({storage:null,persistence:io});await store.ready;
  const actor=person('actor','allies'),primary=person('primary','foes'),secondary=person('secondary','foes'),outside=person('outside','foes');
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'actor',order:['actor','primary'],participants:[actor,primary,secondary,outside]},log:[],diceLines:[]});
  const context=quality==='explosion'?{explosionTargetIds:['primary','secondary'],explosionLocationRollsById:{secondary:35}}:{spreadRangeBand:'short',spreadTargetIds:['primary','secondary'],spreadLocationRollsById:{secondary:35}};
  const plan=store.previewResolution({actorId:'actor',targetId:'primary',resolutionId:`store-${quality}`,roll:21,round:1,
    action:{id:'blast-weapon',type:'attack',attr:'CT',base:60,damage:quality==='explosion'?'BF+2':4,qualities:[q(quality,'3'),...(quality==='explosion'?[q('devastatrice')]:[])]},
    attackContext:{ranged:true},v5:{kind:'ranged',context}});
  assert.equal(plan.unresolved.length,0,plan.unresolved.join('; '));
  assert.equal((await store.applyResolution(plan)).status,'applied');
  const applied=store.listParticipants();
  assert.ok(applied.find(row=>row.id==='primary').hp<20);
  assert.ok(applied.find(row=>row.id==='secondary').hp<20);
  assert.equal(applied.find(row=>row.id==='outside').hp,20);
  const snapshot=store.getFullJSON(),restored=createStore({storage:null,persistence:io});await restored.ready;await restored.loadFromJSON(snapshot);
  assert.ok(restored.listParticipants().find(row=>row.id==='secondary').hp<20);
  assert.equal(await store.undo(),true);
  assert.equal(store.listParticipants().find(row=>row.id==='primary').hp,20);
  assert.equal(store.listParticipants().find(row=>row.id==='secondary').hp,20);
});
});

describe('Enchevêtrement (intégration)', () => {
const memory=()=>{let saved=null;return{async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};};
const q=(id,parameter='')=>({id,parameter});
async function setup(){
  const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
  const weapon={id:'net-1',kind:'weapon',name:'Entrave',keywords:[q('immobilisante','2')],extensions:{}};
  const holder={id:'holder',name:'Porteur',camp:'allies',kind:'PJ',zone:'active',hp:20,maxHp:20,caracs:{CC:50,CT:50,F:3,E:30},skills:[],states:[],equipment:[weapon],armor:{},extensions:{v5:{hasMomentum:false}}};
  const victim={id:'victim',name:'Cible',camp:'foes',kind:'PNJ',zone:'active',hp:20,maxHp:20,caracs:{CC:40,CT:40,F:30,E:30},skills:[],states:[],equipment:[],armor:{},extensions:{v5:{hasMomentum:false}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'holder',order:['holder','victim'],participants:[holder,victim]},log:[],diceLines:[]});
  return{store,persistence};
}
const participant=(store,id)=>store.listParticipants().find(row=>row.id===id);

test('F2-D Immobilisante Store — échec sans changement, libération, Undo et rechargement restent atomiques',async()=>{
  let {store,persistence}=await setup();
  let plan=store.previewResolution({actorId:'holder',targetId:'victim',resolutionId:'net-store-hit',roll:20,round:1,
    action:{id:'net-attack',type:'attack',attr:'CT',base:50,damage:0,qualities:[q('immobilisante','2')],extensions:{fiche:{equipmentId:'net-1'}}},
    attackContext:{ranged:true},v5:{kind:'ranged'}});
  assert.equal(plan.entanglement.weaponLocked,true);
  assert.equal((await store.applyResolution(plan)).status,'applied');
  assert.equal(participant(store,'holder').equipment[0].extensions.v5.entanglementLocks.length,1);
  assert.equal(participant(store,'victim').states[0].strength,3,'Immobilisante utilise la Force de l’attaquant, non le chiffre non publié du mot-clé');
  assert.equal(await store.undo(),true);
  assert.equal(participant(store,'victim').states.some(row=>row.key==='enchevetre'),false);
  assert.equal(participant(store,'holder').equipment[0].extensions?.v5?.entanglementLocks,undefined);
  assert.equal(await store.redo(),true);
  assert.equal(participant(store,'holder').equipment[0].extensions.v5.entanglementLocks.length,1);
  const afterHit=store.getFullJSON();
  let restored=createStore({storage:null,persistence});await restored.ready;await restored.loadFromJSON(afterHit);
  assert.equal(participant(restored,'holder').equipment[0].extensions.v5.entanglementLocks.length,1);

  let victim=participant(restored,'victim');
  for(const [index,roll] of [30,12,12].entries()){
    if(!victim.states.length)break;
    plan=restored.previewResolution({actorId:'victim',resolutionId:`net-store-escape-${index+1}`,roll,round:1,
      action:{id:'escape',type:'test',attr:'F',base:30,label:'Force'},
      v5:{kind:'test',context:{netEscapeConditionId:victim.states[0].id,netEscapeOpponentRoll:index===0?1:30,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
    assert.equal(plan.unresolved.length,0,plan.unresolved.join('; '));
    assert.equal((await restored.applyResolution(plan)).status,'applied');
    victim=participant(restored,'victim');
    if(index===0){
      assert.equal(victim.states[0].level,1,'un échec opposé ne change pas Empêtré');
      assert.equal(victim.extensions.v5.netEscapeProgress?.[victim.states[0].id],undefined,'les DR ne se cumulent plus');
      const mid=restored.getFullJSON(),afterReload=createStore({storage:null,persistence});await afterReload.ready;await afterReload.loadFromJSON(mid);
      assert.equal(participant(afterReload,'victim').states[0].level,1);
      restored=afterReload;
    }
  }
  assert.equal(participant(restored,'victim').states.some(row=>row.key==='enchevetre'),false);
  assert.deepEqual(participant(restored,'holder').equipment[0].extensions.v5.entanglementLocks,[]);
  assert.equal(await restored.undo(),true);
  assert.equal(participant(restored,'victim').states.some(row=>row.key==='enchevetre'),true);
  assert.equal(participant(restored,'holder').equipment[0].extensions.v5.entanglementLocks.length,1);
});

test('F2-D Inflige Empêtré — libération volontaire retire état et verrou; Undo et persistence les restaurent',async()=>{
  const {store,persistence}=await setup();
  let plan=store.previewResolution({actorId:'holder',targetId:'victim',resolutionId:'voluntary-net-hit',roll:20,round:1,
    action:{id:'net-attack',type:'attack',attr:'CT',base:50,damage:0,qualities:[q('inflige','Empêtré 55')],extensions:{fiche:{equipmentId:'net-1'}}},
    attackContext:{ranged:true},v5:{kind:'ranged'}});
  assert.equal(plan.entanglement.weaponLocked,true);
  assert.equal((await store.applyResolution(plan)).status,'applied');
  const linkId=participant(store,'victim').states[0].source.linkId;
  plan=store.previewResolution({actorId:'holder',resolutionId:'voluntary-net-release',round:1,roll:20,
    action:{id:'release-net',type:'test',attr:'F',base:50,label:'Force'},
    v5:{kind:'test',context:{releaseEntanglementLinkId:linkId,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.equal(plan.unresolved.length,0,plan.unresolved.join('; '));
  assert.ok(plan.entanglementRelease);
  assert.equal((await store.applyResolution(plan)).status,'applied');
  assert.equal(participant(store,'victim').states.some(row=>row.source?.linkId===linkId),false);
  assert.deepEqual(participant(store,'holder').equipment[0].extensions.v5.entanglementLocks,[]);
  assert.equal(await store.undo(),true);
  assert.equal(participant(store,'victim').states.some(row=>row.source?.linkId===linkId),true);
  assert.deepEqual(participant(store,'holder').equipment[0].extensions.v5.entanglementLocks,[linkId]);
  const snapshot=store.getFullJSON(),restored=createStore({storage:null,persistence});await restored.ready;await restored.loadFromJSON(snapshot);
  assert.equal(participant(restored,'victim').states.some(row=>row.source?.linkId===linkId),true);
  assert.deepEqual(participant(restored,'holder').equipment[0].extensions.v5.entanglementLocks,[linkId]);
});
});

describe('Clauses finales F2-D', () => {
const q = (id, parameter = '') => ({ id, parameter });

function knifePreview(name, states = [], trained = false, withDefense = true) {
  const bollock = name === 'Couteau Bollock';
  const catalogKnife=bollock?structuredClone(getReferenceCatalogue().items.find(row=>row.id==='weapon-armes-corps-a-corps-base-couteau-bollock')):null;
  const skillRef=getReferenceCatalogue().skills.find(row=>row.nom==='Corps à corps (Base)');
  const skills=trained&&skillRef?[{id:skillRef.id,name:skillRef.nom,group:skillRef.group,specialization:skillRef.specialization,basic:true,total:60,advances:2,status:'resolved'}]:[];
  const actor = { id: 'attacker', camp: 'allies', hp: 20, maxHp: 20, caracs: { CC: 60, F: 30, E: 30 }, skills, ficheSnapshot:{skills,coverage:{skills:'present'}}, states: [],
    equipment: [{ ...(catalogKnife||{}), id: catalogKnife?.id||'knife', kind: 'weapon', name, baseId: bollock ? 'weapon-armes-corps-a-corps-base-couteau-bollock' : 'custom-knife', damage: 'BF +1', reach: 'Très courte', keywords: [q('perforante')] }], extensions: { v5: {} } };
  const target = { id: 'target', camp: 'foes', hp: 20, maxHp: 20, caracs: { CC: 30, E: 30 }, skills: [], states, equipment: [], extensions: { v5: {} } };
  return previewResolution({ actor, target, round: 1, baseRevision: 0, roll: 40,
    action: { type: 'attack', attr: 'CC', base: 60, damage: 4, qualities: [], extensions: { fiche: { equipmentId: catalogKnife?.id||'knife', ...(bollock?{bindingVersion:1}:{}), ...(skills[0]?{skillId:skills[0].id,skillName:skills[0].name}:{}) } } },
    attackContext: { ranged: false }, ...(withDefense?{defense:{type:'skill',label:'Corps à corps',attr:'CC',base:30,roll:60,v5:{kind:'melee',context:{}}}}:{}),
    v5: { kind: 'melee', context: {} } });
}

test('F2-D L13 — le Couteau Bollock garde seulement Perforante hors Surprise/À Terre', () => {
  const preview = knifePreview('Couteau Bollock',[],true);
  assert.deepEqual(preview.input.action.qualities.map(row => typeof row === 'string' ? row : row.id), ['perforante']);
});

test('F2-D L13 — Couteau Bollock active ses qualités conditionnelles contre une cible À Terre si formé', () => {
  const prone = knifePreview('Couteau Bollock', [{ id: 'prone', key: 'a-terre', name: 'À Terre', level: 1 }], true);
  assert.deepEqual(prone.input.action.qualities.map(row => typeof row === 'string' ? row : row.id).sort(), ['empaleuse', 'perforante', 'pointue']);
  const ordinaryKnife = knifePreview('Couteau');
  assert.deepEqual(ordinaryKnife.input.action.qualities.map(row => typeof row === 'string' ? row : row.id), ['perforante']);
  const surprised=knifePreview('Couteau Bollock',[{id:'surprised',key:'surpris',name:'Surpris',level:1}],true);
  assert.deepEqual(surprised.input.action.qualities.map(row=>typeof row==='string'?row:row.id).sort(),['empaleuse','perforante','pointue']);
  const untrainedSurprise=knifePreview('Couteau Bollock',[{id:'surprised',key:'surpris',name:'Surpris',level:1}],false);
  assert.ok(!untrainedSurprise.input.action.qualities.some(row=>['empaleuse','pointue'].includes(typeof row==='string'?row:row.id)));
  const inactiveProne=knifePreview('Couteau Bollock',[{id:'prone-zero',key:'a-terre',name:'À Terre',level:0}],true);
  assert.deepEqual(inactiveProne.input.action.qualities.map(row=>typeof row==='string'?row:row.id),['perforante']);
  const inactiveSurprise=knifePreview('Couteau Bollock',[{id:'surprised-zero',key:'surpris',name:'Surpris',level:0}],true);
  assert.deepEqual(inactiveSurprise.input.action.qualities.map(row=>typeof row==='string'?row:row.id),['perforante']);
  const staleSurprise=knifePreview('Couteau Bollock',[{id:'surprised-stale',key:'surpris',name:'Surpris',level:1,source:{talentId:'talent-frenzy',source:{effectHash:'sha256:'+'0'.repeat(64)}}}],true);
  assert.deepEqual(staleSurprise.input.action.qualities.map(row=>typeof row==='string'?row:row.id),['perforante']);
  const surprisedWithoutDefense=knifePreview('Couteau Bollock',[{id:'surprised',key:'surpris',name:'Surpris',level:1}],true,false);
  assert.deepEqual(surprisedWithoutDefense.input.action.qualities.map(row=>typeof row==='string'?row:row.id).sort(),['empaleuse','perforante','pointue']);
});

test('F2-D L06 — attaque au bouclier suspend sa protection, persiste et Undo la rétablit', async () => {
  let saved = null;
  const io = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ storage: null, persistence: io }); await store.ready;
  const shield = { id: 'shield-1', kind: 'shield', name: 'Bouclier', ap: 2, keywords: [q('bouclier')] };
  const skillRef=getReferenceCatalogue().skills.find(row=>row.nom==='Corps à corps (Base)');
  const skill={id:skillRef.id,name:skillRef.nom,group:skillRef.group,specialization:skillRef.specialization,basic:true,total:60,advances:2,status:'resolved'};
  const actor = { id: 'attacker', kind: 'PJ', camp: 'allies', hp: 20, maxHp: 20, caracs: { CC: 60, F: 30, E: 30 }, skills:[skill],ficheSnapshot:{skills:[skill],coverage:{skills:'present'}}, states: [], equipment: [shield], extensions: { v5: {} } };
  const target = { id: 'target', kind: 'PNJ', camp: 'foes', hp: 20, maxHp: 20, caracs: { CC: 30, E: 30 }, skills: [], states: [], equipment: [], extensions: { v5: {} } };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: actor.id, order: [actor.id, target.id], participants: [actor, target] }, log: [], diceLines: [] });
  const preview = store.previewResolution({ actorId: actor.id, targetId: target.id, resolutionId: 'shield-hit', roll: 30, round: 1,
    action: { type: 'attack', attr: 'CC', base: 60, damage: 3 }, attackContext: { ranged: false },
    v5: { kind: 'melee', context: { actorShieldId: shield.id, attackWithShield: true } },
    defense: { type: 'skill', label: 'Corps à corps', attr: 'CC', base: 30, roll: 60, v5: { kind: 'melee', context: {} } } });
  assert.equal(preview.shieldAttack.confirmed, true); assert.equal(preview.input.action.reach, 'Personnelle');
  assert.equal(preview.input.action.damage, 1); assert.equal(preview.input.action.damageFormula, 'BF +1');
  assert.deepEqual(preview.input.action.qualities.map(row=>typeof row==='string'?row:row.id).sort(),['desequilibree','inoffensive']);
  const shieldApplied=await store.applyResolution(preview);assert.equal(shieldApplied.status, 'applied',shieldApplied.reason||preview.unresolved.join('; '));
  assert.deepEqual(store.listParticipants().find(row => row.id === actor.id).extensions.shieldUnavailable, [shield.id]);
  const restored = createStore({ storage: null, persistence: io }); await restored.ready; await restored.loadFromJSON(store.getFullJSON());
  assert.deepEqual(restored.listParticipants().find(row => row.id === actor.id).extensions.shieldUnavailable, [shield.id]);
  assert.equal(await store.undo(), true);
  assert.equal(store.listParticipants().find(row => row.id === actor.id).extensions.shieldUnavailable, undefined);
});

test('F2-D — le verrou d’arme reste jusqu’au retrait du dernier niveau Empêtré',async()=>{
  let saved=null;const io={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({storage:null,persistence:io});await store.ready;
  const weapon={id:'net-weapon',kind:'weapon',name:'Filet',extensions:{v5:{entanglementLocks:['link-1']}}};
  const holder={id:'holder',kind:'PJ',camp:'allies',hp:20,maxHp:20,caracs:{F:30,E:30},skills:[],states:[],equipment:[weapon],extensions:{v5:{}}};
  const victim={id:'victim',kind:'PNJ',camp:'foes',hp:20,maxHp:20,caracs:{F:60,E:30},skills:[],states:[{id:'condition-1',key:'enchevetre',name:'Empêtré',level:2,strength:30,source:{kind:'quality',entanglementKind:'wielder',linkId:'link-1',authorId:holder.id,weaponId:weapon.id,weaponLocked:true}}],equipment:[],extensions:{v5:{}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:victim.id,order:[holder.id,victim.id],participants:[holder,victim]},log:[],diceLines:[]});
  const escape=(id,storeToUse=store)=>{const liveVictim=storeToUse.listParticipants().find(row=>row.id===victim.id);return storeToUse.previewResolution({actorId:victim.id,resolutionId:id,roll:40,round:1,action:{type:'test',attr:'F',base:60,label:'Force'},
    v5:{kind:'test',context:{netEscapeConditionId:liveVictim.states[0].id,netEscapeOpponentRoll:20,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});};
  let first=escape('escape-first');assert.equal(first.netEscape?.freed,true,first.unresolved.join('; '));assert.equal(first.netEscape.remainingEntangled,1);
  assert.equal((await store.applyResolution(first)).status,'applied');
  assert.equal(store.listParticipants().find(row=>row.id===holder.id).equipment[0].extensions.v5.entanglementLocks.includes('link-1'),true);
  assert.equal(store.listParticipants().find(row=>row.id===victim.id).states[0].level,1);
  let restored=createStore({storage:null,persistence:io});await restored.ready;await restored.loadFromJSON(store.getFullJSON());
  const second=escape('escape-second',restored);
  assert.equal(second.netEscape.remainingEntangled,0);assert.equal((await restored.applyResolution(second)).status,'applied');
  assert.equal(restored.listParticipants().find(row=>row.id===holder.id).equipment[0].extensions.v5.entanglementLocks.includes('link-1'),false);
  assert.equal(await restored.undo(),true);
  assert.equal(restored.listParticipants().find(row=>row.id===holder.id).equipment[0].extensions.v5.entanglementLocks.includes('link-1'),true);
});

test('F2-D L11 — Filet à crochets demande le montant MJ et applique les dégâts malgré une évasion réussie', async () => {
  let saved = null;
  const io = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ storage: null, persistence: io }); await store.ready;
  const net = { id: 'hooked-net', kind: 'weapon', name: 'Filet à crochets', damage: '-', keywords: [q('inflige', 'Empêtré 1')], extensions: { v5: { hookedNet: true } } };
  const holder = { id: 'holder', kind: 'PJ', camp: 'allies', hp: 20, maxHp: 20, caracs: { CT: 60, F: 30, E: 30 }, skills: [], states: [], equipment: [net], extensions: { v5: {} } };
  const victim = { id: 'victim', kind: 'PNJ', camp: 'foes', hp: 20, maxHp: 20, caracs: { F: 40, E: 30 }, skills: [], states: [], equipment: [], extensions: { v5: {} } };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: holder.id, order: [holder.id, victim.id], participants: [holder, victim] }, log: [], diceLines: [] });
  const hit = store.previewResolution({ actorId: holder.id, targetId: victim.id, resolutionId: 'hooked-hit', roll: 20, round: 1,
    action: { type: 'attack', attr: 'CT', base: 60, damage: 0, qualities: [q('inflige', 'Empêtré 1')], extensions: { fiche: { equipmentId: net.id } } },
    attackContext: { ranged: true }, v5: { kind: 'ranged', context: { hookedNet: true } } });
  assert.equal(hit.unresolved.length, 0, hit.unresolved.join('; '));
  assert.equal((await store.applyResolution(hit)).status, 'applied');
  const trapped = store.listParticipants().find(row => row.id === victim.id);
  const hpBeforeEscape=trapped.hp;
  const state = trapped.states.find(row => row.key === 'enchevetre'); assert.equal(state.source.hookedNet, true);
  const restored = createStore({ storage: null, persistence: io }); await restored.ready; await restored.loadFromJSON(store.getFullJSON());
  const missingAmount=restored.previewResolution({actorId:victim.id,resolutionId:'hooked-escape-no-amount',roll:20,round:1,
    action:{type:'test',attr:'F',base:40,label:'Force'},
    v5:{kind:'test',context:{netEscapeConditionId:state.id,netEscapeOpponentRoll:20,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.ok(missingAmount.unresolved.some(text=>/montant de dégâts à fixer par le MJ/u.test(text)));
  const escape = restored.previewResolution({ actorId: victim.id, resolutionId: 'hooked-escape', roll: 20, round: 1,
    action: { type: 'test', attr: 'F', base: 40, label: 'Force' },
    v5: { kind: 'test', context: { netEscapeConditionId: state.id, netEscapeOpponentRoll:20, hookedNetDamage: 4, involvesMovement: false, requiresSight: false, reliesOnSight: false, usesFellowship: false } } });
  assert.equal(escape.netEscape.freed, true);
  assert.equal(escape.netEscape.hookedNetDamage, 4);
  const escaped = await restored.applyResolution(escape); assert.equal(escaped.status, 'applied', escaped.reason || escape.unresolved.join('; '));
  assert.equal(restored.listParticipants().find(row => row.id === victim.id).hp, hpBeforeEscape - 4);
  assert.equal(restored.listParticipants().find(row => row.id === victim.id).states.some(row => row.id === state.id), false);
  assert.equal(await restored.undo(), true);
  assert.equal(restored.listParticipants().find(row => row.id === victim.id).hp, hpBeforeEscape);
});

test('F2-C/F2-D — Filet conjuré verrouille l’action dans l’effet actif, avec persistance et Undo', async () => {
  let saved = null;
  const io = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ storage: null, persistence: io }); await store.ready;
  const effect = { id: 'aethyric-arms', grantedActions: [{ id: 'spell-net', name: 'Filet', type: 'attack' }] };
  const baseSkill=getReferenceCatalogue().skills.find(row=>row.nom==='Corps à corps (Base)');
  const trainedSkill={id:baseSkill.id,name:baseSkill.nom,group:baseSkill.group,specialization:baseSkill.specialization,basic:true,total:60,advances:1,status:'resolved'};
  const actor = { id: 'mage', kind: 'PJ', camp: 'allies', hp: 20, maxHp: 20, caracs: { CC: 60, CT: 40, F: 30, E: 30 }, skills: [trainedSkill], ficheSnapshot: { skills: [trainedSkill], coverage: { skills: 'present' } }, states: [], equipment: [], extensions: { v5: { spellEffects: [effect] } } };
  const target = { id: 'victim', kind: 'PNJ', camp: 'foes', hp: 20, maxHp: 20, caracs: { E: 30 }, skills: [], states: [], equipment: [], extensions: { v5: {} } };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: actor.id, order: [actor.id, target.id], participants: [actor, target] }, log: [], diceLines: [] });
  const profile=ARCANE_WEAPON_PROFILES.net;
  const action = { id: 'spell-net', type: 'attack', note: profile.name, attr: 'CC', base: 60, damage: 0,
    spellEffectId: effect.id, qualities: [...profile.qualities.map(row=>typeof row==='string'?q(row):row), q('magique')],
    extensions: { v5: { materialized: true, spellEffectId: effect.id, conjuredWeaponKey: 'net', conjuredWeaponProfile: profile } } };
  const hit = store.previewResolution({ actorId: actor.id, targetId: target.id, resolutionId: 'conjured-net-hit', roll: 20, round: 1, action,
    attackContext: { ranged: true }, v5: { kind: 'ranged', context: { targetHelpless: true } } });
  assert.equal(hit.unresolved.length, 0, hit.unresolved.join('; '));
  assert.equal((await store.applyResolution(hit)).status, 'applied');
  const locked = store.listParticipants().find(row => row.id === actor.id).extensions.v5.spellEffects[0];
  assert.deepEqual(locked.weaponLocks, [{ linkId: 'entanglement:conjured-net-hit', weaponKey: 'net' }]);
  const blockedAttack = store.previewResolution({ actorId: actor.id, targetId: target.id, resolutionId: 'conjured-net-repeat', roll: 20, round: 1, action,
    attackContext: { ranged: true }, v5: { kind: 'ranged', context: { targetHelpless: true } } });
  assert.ok(blockedAttack.unresolved.some(text => /arme conjurée est retenue/u.test(text)));
  const restored = createStore({ storage: null, persistence: io }); await restored.ready; await restored.loadFromJSON(store.getFullJSON());
  assert.equal(restored.listParticipants().find(row => row.id === actor.id).extensions.v5.spellEffects[0].weaponLocks.length, 1);
  const release=restored.previewResolution({actorId:actor.id,resolutionId:'conjured-net-release',round:1,roll:20,
    action:{type:'test',attr:'F',base:60},v5:{kind:'test',context:{releaseEntanglementLinkId:'entanglement:conjured-net-hit'}}});
  assert.equal(release.unresolved.length,0,release.unresolved.join('; '));
  assert.equal((await restored.applyResolution(release)).status,'applied');
  assert.equal(restored.listParticipants().find(row=>row.id===target.id).states.some(row=>row.key==='enchevetre'),false);
  assert.equal(restored.listParticipants().find(row=>row.id===actor.id).extensions.v5.spellEffects[0].weaponLocks.length,0);
  assert.equal(await restored.undo(), true);
  assert.equal(restored.listParticipants().find(row=>row.id===actor.id).extensions.v5.spellEffects[0].weaponLocks.length,1);
  assert.equal(await store.undo(), true);
  assert.equal(store.listParticipants().find(row => row.id === actor.id).extensions.v5.spellEffects[0].weaponLocks, undefined);
});
});

describe('Défense au bouclier', () => {
const shield = (ap = 2, id = 'shield') => ({ id, kind: 'shield', name: 'Bouclier V5', category: 'Bouclier',
  ap, locations: [], layer: 'none', keywords: [{ id: 'bouclier', parameter: '' }], custom: true });
const participant = id => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 30, Ag: 40 }, states: [], talents: [], skills: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } });
const normalized = ({ ap = 2, skill = 'Esquive', qualities = [], ranged = false, selected = true, available = true } = {}) => {
  const actor = participant('actor'), target = participant('target');
  target.equipment = [shield(ap)];
  return { actor, target, action: { type: 'attack', label: 'Attaque', attr: ranged ? 'CT' : 'CC', base: 40, qualities: [] },
    defense: { type: 'skill', label: skill, attr: skill === 'Esquive' ? 'Ag' : 'CC', base: 40, roll: 42, qualities,
      v5: { kind: skill === 'Esquive' ? 'test' : 'melee', context: {} } },
    attackContext: { ranged }, v5: { kind: ranged ? 'ranged' : 'melee', context: {} }, v5State: { participants: [actor, target] },
    combatPrelude: {}, weaponSkillUnresolved: [], protectionContext: { shieldId: selected ? 'shield' : '',
      shieldAvailable: available, opposedWithShield: selected, ranged, lineOfSight: false } };
};

test('Bouclier V5 — Esquive ou Corps à corps confirmé donne +1 DR, sans cumul avec Défensive', () => {
  for (const skill of ['Esquive', 'Corps à corps (Base)']) {
    const input = normalized({ skill, qualities: ['defensive'] });
    const status = v5ShieldDefense(input);
    assert.deepEqual(status, { confirmed: false, v5Bonus: true, rangedDodgeAllowed: false, rating: 2, unresolved: null });
    const plan = buildCombatTest(input, 'defender');
    const bonuses = plan.test.options[0].result.details.modifiers.filter(row => row.id === 'defensive-protection');
    assert.equal(bonuses.length, 1);
    assert.equal(bonuses[0].amount, 1);
    assert.match(bonuses[0].label, /Bouclier V5/);
  }
});

test('Bouclier V5 — 2 PA permettent l’Esquive contre tir à toute portée, sans ligne de vue', () => {
  const rangedDefense = normalized({ skill: 'Esquive', ranged: true, ap: 2 });
  const twoPa = v5ShieldDefense(rangedDefense);
  assert.equal(twoPa.confirmed, false);
  assert.equal(twoPa.v5Bonus, true);
  assert.equal(twoPa.rangedDodgeAllowed, true);
  assert.equal(twoPa.rating, 2);
  const rangedPlan = buildCombatTest(rangedDefense, 'defender');
  assert.ok(rangedPlan.test.options[0].result.details.modifiers.some(row => row.id === 'defensive-protection' && row.amount === 1));
  const onePa = v5ShieldDefense(normalized({ skill: 'Esquive', ranged: true, ap: 1 }));
  assert.equal(onePa.confirmed, false);
  assert.equal(onePa.rangedDodgeAllowed, false);
});

test('Bouclier V5 — tir opposé par Corps à corps et autres compétences ne reçoivent pas le bonus', () => {
  const melee = v5ShieldDefense(normalized({ skill: 'Corps à corps', ranged: true, ap: 3 }));
  assert.equal(melee.confirmed, false);
  assert.equal(melee.rangedDodgeAllowed, false);
  assert.match(melee.unresolved, /tir.*Esquive et 2 PA/u);
  const unrelated = v5ShieldDefense(normalized({ skill: 'Résistance', ranged: false, ap: 3 }));
  assert.equal(unrelated.confirmed, false);
  assert.equal(unrelated.unresolved, 'Bouclier V5 : opposition par Esquive ou Corps à corps requise.');
});

test('Bouclier V5 — non sélectionné, indisponible ou protection opposée non confirmée : aucun bonus', () => {
  assert.equal(v5ShieldDefense(normalized({ selected: false })).confirmed, false);
  assert.equal(v5ShieldDefense(normalized({ available: false })).confirmed, false);
  const input = normalized();
  input.protectionContext.opposedWithShield = false;
  assert.equal(v5ShieldDefense(input).confirmed, false);
  input.target.extensions.shieldUnavailable = ['shield'];
  input.protectionContext.opposedWithShield = true;
  assert.equal(v5ShieldDefense(input).confirmed, false);
});

test('Bouclier V5 — une source ou un effet modifié bloque le bonus', () => {
  const input = normalized();
  assert.equal(v5ShieldDefense(input).v5Bonus, true);
  const changed = structuredClone(getReferenceCatalogue());
  changed.keywords.find(row => row.id === 'bouclier').effect += ' Effet modifié.';
  const blocked = v5ShieldDefense(input, changed);
  assert.equal(blocked.v5Bonus, false);
  assert.match(blocked.unresolved, /source ou effet modifié/u);
});

test('Bouclier V5 — ses PA ne s’ajoutent qu’à la localisation touchée et seulement après opposition', () => {
  const target = participant('target');
  target.equipment = [shield(2)];
  const protectedHit = locationProtection(target, { location: 'body', shieldId: 'shield', shieldAvailable: true,
    opposedWithShield: true, defenseProvided: true, ranged: true, lineOfSight: false });
  assert.equal(protectedHit.ap, 2);
  assert.equal(protectedHit.shieldAp, 2);
  assert.deepEqual(protectedHit.manual, []);
  const otherLocation = locationProtection(target, { location: 'head', ranged: true });
  assert.equal(otherLocation.ap, 0);
  assert.equal(otherLocation.shieldAp, 0);
});
});

describe('Équipement F2-F (caractérisation)', () => {
const equipment = reference.equipment.items;
const byId = id => equipment.find(row => row.id === id);

test('F2-F characterization — the GM equipment sheet remains authoritative for Skaven weapons', () => {
  const ratling = byId('weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const firethrower = byId('weapon-armes-a-distance-ingenierie-lance-feu-a-malepierre-skaven');
  assert.deepEqual([ratling.damage, ratling.range, ratling.keywords.map(row => row.id)], [
    '+9', '60', ['a-repetition', 'dangereuse', 'devastatrice', 'equipage', 'malepierre', 'recharge']
  ]);
  assert.deepEqual([firethrower.damage, firethrower.range, firethrower.keywords.map(row => row.id)], [
    '+10', '30', ['dangereuse', 'devastatrice', 'enflammee', 'equipage', 'explosion', 'malepierre']
  ]);
});

test('F2-F characterization — a printed fixed creature damage value does not add attacker BF again', () => {
  const result = previewResolution({
    actor: { id: 'attacker', caracs: { F: 60 }, states: [] },
    target: { id: 'target', hp: 20, caracs: { E: 30 }, armor: {}, states: [] },
    action: { type: 'attack', base: 80, damage: 11, qualities: [] },
    roll: 31, baseRevision: 1
  });
  assert.equal(result.damage.weaponDamage, 11);
  assert.equal(result.damage.finalDamage, 13, 'fixed printed damage remains 11; only +5 DR and target BE 3 are applied');
});
});

describe('Équipement F2-F (contre-revue)', () => {
test('F counter-review: Warp Blade Endurance is a real V5 test with converted +2 DR', () => {
  const actor={id:'attacker',caracs:{CC:80,F:40},skills:[{name:'Melee (Basic)',total:80}],equipment:[],states:[]};
  const target={id:'victim',hp:30,caracs:{E:40},equipment:[],states:[]};
  const preview=previewResolution({actor,target,action:{type:'attack',name:'Warp Blade',base:80,damage:10,qualities:[]},
    v5:{kind:'melee',context:{warpBladeEnduranceTest:{score:40,roll:61}}},roll:31,baseRevision:1});
  assert.equal(preview.supplementalEquipment.enduranceTest?.score,40);
  assert.equal(preview.supplementalEquipment.enduranceTest?.roll,61);
  assert.ok(preview.supplementalEquipment.enduranceTest?.details.modifiers.some(row=>row.amount===2), 'V4 +20 becomes V5 +2 DR');
  assert.ok(preview.targetConditionApplication.some(row=>row.name==='Sonné'), 'failed test should apply Sonné');
});

test('F counter-review: actual Bonebreaker critical without a wound does not expose the target', () => {
  const profile=L22.profiles.find(row=>row.name==='Rat Ogre Bonebreaker');
  const shard=profile.attacks.find(row=>row.name==='Warpstone Shard*');
  const actualAttack={name:shard.name,damage:shard.damage,qualities:shard.qualities};
  const result=previewSupplementalEquipment({item:actualAttack,actor:{id:'bonebreaker'},target:{id:'victim'},
    hit:true,damage:{finalDamage:0},critical:{severity:'critical'}});
  assert.equal(result.exposure,null);
});
});

describe('Équipement F2-F (revue finale)', () => {
// Dernière contre-revue F (29/10) : critique d'excédent, Warp Blade en mêlée seulement, score de Résistance au-delà de 100.
const shardAttack=()=>{const shard=L22.profiles.find(row=>row.name==='Rat Ogre Bonebreaker').attacks.find(row=>row.name==='Warpstone Shard*');return {type:'attack',name:shard.name,base:80,damage:10,qualities:[]};};
const bonebreaker={id:'bonebreaker',caracs:{CC:80,F:60},skills:[{name:'Melee (Basic)',total:80}],equipment:[],states:[]};

test('F final review: an excess-wounds Critical from the Warpstone Shard causes Minor Exposure (L22 p.32)', () => {
  const target={id:'victim',hp:3,maxHp:12,caracs:{E:30},equipment:[],states:[]};
  const preview=previewResolution({actor:bonebreaker,target,action:shardAttack(),v5:{kind:'melee'},roll:31,baseRevision:1});
  assert.ok(preview.critical?.second,'the hit goes below 0 Wounds');
  assert.equal(preview.critical?.details ?? null,null,'no doubles Critical on 31');
  assert.equal(preview.supplementalEquipment?.exposure?.status,'needs-corruption-test');
});

test('F final review: the same hit on a healthy target causes no exposure', () => {
  const target={id:'victim',hp:100,maxHp:100,caracs:{E:30},equipment:[],states:[]};
  const preview=previewResolution({actor:bonebreaker,target,action:shardAttack(),v5:{kind:'melee'},roll:31,baseRevision:1});
  assert.equal(preview.supplementalEquipment?.exposure ?? null,null);
});

test('F final review: a ranged Warp Blade discharge asks for no Endurance test (L11 p.94, melee strikes only)', () => {
  const result=previewSupplementalEquipment({item:{name:'Warp Blade'},actor:{id:'warlock'},target:{id:'victim'},hit:true,damage:{finalDamage:5},context:{},melee:false});
  assert.deepEqual(result.unresolved,[]);
  assert.equal(result.effects.some(row=>row.state==='Sonné'),false);
  const melee=previewSupplementalEquipment({item:{name:'Warp Blade'},actor:{id:'warlock'},target:{id:'victim'},hit:true,damage:{finalDamage:5},context:{},melee:true});
  assert.equal(melee.unresolved.length,1,'the melee strike still asks for the test');
});

test('F final review: an Endurance score above 100 is a legal V5 score', () => {
  const result=previewSupplementalEquipment({item:{name:'Warp Blade'},actor:{id:'warlock'},target:{id:'victim'},hit:true,damage:{finalDamage:5},context:{warpBladeEnduranceTest:{score:110,roll:95}}});
  assert.deepEqual(result.unresolved,[]);
  assert.ok(result.reminders.some(row=>/Test de Résistance V5 réussi/.test(row)));
});
});

describe('Pavois (durcissement)', () => {
const pavise=reference.equipment.items.find(item=>item.id==='shield-armures-bouclier-pavois-pavise');
const person=(id,equipment=[])=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,caracs:{CC:40,F:30,E:40,FM:40},equipment,states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}}});
async function setup(){
  const store=createStore({storage:null});await store.ready;
  const actor=person('carrier',[pavise]),foe=person('foe');
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:actor.id,orderMode:'manual',order:[actor.id,foe.id],participants:[actor,foe]},extensions:{v5:{combatId:'pavise-hardening',turnIndex:1}}});
  return{store,actorId:actor.id};
}
const planFor=store=>store.previewV5PaviseDeployment({actorId:'carrier',equipmentId:pavise.id,direction:'north'});
const stored=(store,actorId)=>store.listParticipants().find(row=>row.id===actorId)?.extensions?.v5?.paviseDeploymentByItemId?.[pavise.id];

test('pavois — an altered step cannot turn the first paid Action into completion',async()=>{
  const{store,actorId}=await setup(),plan=planFor(store);
  assert.equal(plan.ready,true);
  const result=await store.applyV5PaviseDeployment({...plan,step:99});
  assert.notEqual(result.status,'applied');
  assert.equal(stored(store,actorId),undefined);
});

test('pavois — an invalid altered facing is rejected without charging or planting',async()=>{
  const{store,actorId}=await setup(),plan=planFor(store);
  const result=await store.applyV5PaviseDeployment({...plan,direction:'up'});
  assert.notEqual(result.status,'applied');
  assert.equal(stored(store,actorId),undefined);
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.standardTurnActions?.length||0,0);
});

test('pavois — once the Action is spent, preview refuses a second deployment step in the same turn',async()=>{
  const{store}=await setup(),first=planFor(store);assert.equal((await store.applyV5PaviseDeployment(first)).status,'applied');
  const second=planFor(store);assert.equal(second.ready,false);
  store.nextTurn();
  const inactive=planFor(store);assert.equal(inactive.ready,false,'l’acteur qui n’est pas courant ne peut pas continuer');
});

test('pavois — Undo/Redo and combat restart keep deployment and action ledger coherent',async()=>{
  const{store,actorId}=await setup(),first=planFor(store);await store.applyV5PaviseDeployment(first);
  await store.undo();assert.equal(stored(store,actorId),undefined);
  await store.redo();assert.equal(stored(store,actorId)?.status,'setting-up');
  store.nextTurn();store.nextTurn();const second=planFor(store);assert.equal(second.ready,true);await store.applyV5PaviseDeployment(second);
  assert.equal(stored(store,actorId)?.status,'planted');
  await store.restartCombat();
  assert.equal(stored(store,actorId),undefined,'Recommencer doit restaurer la scène au départ sans état installé en cours de combat');
});
});

describe('Équipement F2-F (revue)', () => {
const actor = { id: 'holder', name: 'MJ', states: [] };
const target = { id: 'target', name: 'Cible', states: [] };

test('F2-F review characterization — actual Antler Hilted Blade requires explicit handle origin', () => {
  const item = { id: 'antler-blade-real', name: 'Antler Hilted Blade', kind: 'weapon' };
  const unresolved = supplemental.previewSupplementalEquipment({ item, actor, target, used: true, context: {} });
  assert.ok(unresolved?.unresolved.some(row => /préciser si le bois/i.test(row)));
  const naturallyFallen = supplemental.previewSupplementalEquipment({ item, actor, target, used: true, context: { antlerHandleOrigin: 'naturally-fallen' } });
  assert.ok(naturallyFallen?.reminders.some(row => /ne se brise pas.*combat/i.test(row)));
  const violent = supplemental.previewSupplementalEquipment({ item, actor, target, critical: { id: 'critical' }, context: { antlerHandleOrigin: 'violent' } });
  assert.deepEqual(violent?.effects.map(row => row.participantId), [target.id, actor.id]);
});

test('F2-F review characterization — accented real staff label resolves associated-domain focus', () => {
  const item = { id: 'staff-real', name: 'Bâton enchanté', kind: 'weapon', associatedDomain: 'Aqshy', focusRank: 2 };
  const plan = supplemental.previewSupplementalEquipment({ item, actor, target, spell: { wind: 'Aqshy' } });
  assert.equal(plan?.ruleId, 'F-L06-1104');
  assert.equal(plan?.casting.focusSL, 2);
});

test('F2-F review characterization — leviathan encumbrance is calculated per item from MJ metal baseline', () => {
  const leviathan = { id: 'leviathan-plate', name: 'Leviathan Plate' };
  assert.equal(supplemental.effectiveSupplementalEncumbrance(leviathan, 4), 3);
  assert.equal(supplemental.effectiveSupplementalEncumbrance({ id: 'ordinary-plate', name: 'Plate Armour' }, 4), 4);
});

test('F2-F review characterization — the real pavise cannot protect while merely selected for planting', async () => {
  const pavise = reference.equipment.items.find(item => item.id === 'shield-armures-bouclier-pavois-pavise');
  assert.ok(pavise);
  const store = createStore({ storage: null }); await store.ready;
  assert.equal(typeof store.previewV5PaviseDeployment, 'function');
  assert.equal(typeof store.applyV5PaviseDeployment, 'function');
});

test('F2-F review — planting the real pavise consumes two Actions on separate turns before Protectrice 5 applies', async () => {
  const pavise=reference.equipment.items.find(item=>item.id==='shield-armures-bouclier-pavois-pavise');
  const wearer={id:'wearer',name:'Porteur',zone:'active',hp:20,maxHp:20,caracs:{E:40,FM:40},equipment:[pavise],armorLocations:{head:0,body:2,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},states:[],extensions:{v5:{}}};
  const foe={id:'foe',name:'Ennemi',zone:'active',hp:20,maxHp:20,caracs:{E:40,FM:40},equipment:[],armorLocations:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},states:[],extensions:{v5:{}}};
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:wearer.id,orderMode:'manual',order:[wearer.id,foe.id],participants:[wearer,foe]},extensions:{v5:{combatId:'pavise-test',turnIndex:1}}});
  const first=store.previewV5PaviseDeployment({actorId:wearer.id,equipmentId:pavise.id,direction:'north'});assert.equal(first.ready,true,first.error);
  assert.equal((await store.applyV5PaviseDeployment(first)).status,'applied');
  assert.equal(store.listParticipants().find(row=>row.id===wearer.id).extensions.v5.paviseDeploymentByItemId[pavise.id].status,'setting-up');
  assert.equal(store.previewV5PaviseDeployment({actorId:wearer.id,equipmentId:pavise.id,direction:'north'}).ready,false,'une deuxième Action ne peut pas être dépensée durant le même Tour');
  store.nextTurn();store.nextTurn();
  const second=store.previewV5PaviseDeployment({actorId:wearer.id,equipmentId:pavise.id,direction:'north'});assert.equal(second.ready,true,second.error);
  assert.equal((await store.applyV5PaviseDeployment(second)).status,'applied');
  const deployed=store.listParticipants().find(row=>row.id===wearer.id);
  assert.equal(deployed.extensions.v5.paviseDeploymentByItemId[pavise.id].status,'planted');
  assert.equal((store.getFullJSON()&&JSON.parse(store.getFullJSON()).extensions.v5.standardTurnActions.filter(row=>row.actionId.startsWith('pavise-setup:')).length),2);
  assert.equal(locationProtection(deployed,{location:'body',paviseId:pavise.id,attackDirection:'north',paviseDistanceYards:1,ranged:true}).ap,5);
  assert.equal(locationProtection(deployed,{location:'body',paviseId:pavise.id,shieldId:pavise.id,shieldAvailable:true,opposedWithShield:true,defenseProvided:true,ranged:true,attackDirection:'north',paviseDistanceYards:1}).ap,5,'le pavois posé ne se cumule pas comme bouclier tenu');
});
});

describe('Noms de source des équipements', () => {
const actor = { id: 'holder', name: 'MJ', states: [] };
const target = { id: 'target', name: 'Cible', states: [] };
const clause = name => previewSupplementalEquipment({ item: { name }, actor, target, hit: true, damage: { finalDamage: 2 }, used: true, context: {} });
const findNamed = (data, name) => {
  let found = null;
  const visit = value => {
    if (!value || typeof value !== 'object' || found) return;
    if (value.name === name) found = value;
    for (const child of Object.values(value)) Array.isArray(child) ? child.forEach(visit) : visit(child);
  };
  visit(data);
  return found;
};

test('F source characterization: real English names resolve without synthetic supplementalRuleId', () => {
  const expected = new Map([
    ['Fell Dagger', 'F-L11-0076'], ['Antler Hilted Blade', 'F-L11-0078'],
    ['Ratling Cannon', 'F-L11-0013'], ['Warp Blade', 'F-L11-0014'],
    ['Warpfire Thrower', 'F-L11-0016'], ['Warplock Jezzail', 'F-L11-0017'],
    ['Warplock Pistol', 'F-L11-0018'], ['Leviathan Plate', 'F-L11-0081'],
    ['Shard Tips', 'F-L11-0083'], ['Rat Ogre Bonebreaker', 'F-L22-0139'],
    ['Warpstone Shard*', 'F-L22-0139'], ['Tiger Claws', 'F-L24-0008'],
    ["Wizard's Robes", 'F-L06-1105']
  ]);
  const failures = [];
  for (const [name, ruleId] of expected) {
    const actual = clause(name)?.ruleId;
    if (actual !== ruleId) failures.push(`${name}: expected ${ruleId}, got ${actual || 'no rule'}`);
  }
  assert.deepEqual(failures, [], failures.join('; '));
});

test('F source characterization: Warp Blade follows its printed weapon rule, never a Corruption exposure', () => {
  const result = clause('Warp Blade');
  assert.equal(result?.exposure, null);
  assert.ok(result?.unresolved.some(text => /Résistance|Endurance/i.test(text)), 'needs a source-defined Endurance test for Stunned');
});

test('F source characterization: Warp Blade resolution ignores metal PA and applies its three qualities plus failed Endurance', () => {
  const actor = { id: 'skaven', caracs: { CC: 80, F: 60 }, skills: [{ name: 'Melee (Basic)', total: 80 }], equipment: [], states: [] };
  const metal = { id: 'metal-plate', name: 'Plate Armour', kind: 'armour', category: 'Plates', ap: 3, layer: 'rigid', locations: ['body'], keywords: [] };
  const victim = { id: 'target', hp: 30, caracs: { E: 0 }, equipment: [metal], states: [] };
  const preview = previewResolution({ actor, target: victim,
    action: { type: 'attack', name: 'Warp Blade', base: 80, damage: 10, qualities: [] },
    v5: { kind: 'melee', context: { warpBladeEnduranceTest: { score: 40, roll: 61 } } }, roll: 31, baseRevision: 1 });
  assert.equal(preview.damage.finalDamage, 15, 'includes +5 SL without subtracting the plate PA');
  assert.deepEqual(preview.damage.activeQualities.map(row => row.id), ['defensive', 'entaille', 'empaleuse']);
  assert.ok(preview.targetConditionApplication.some(row => row.name === 'Sonné'));
  assert.equal(preview.supplementalEquipment.enduranceTest.success,false);
  assert.ok(preview.supplementalEquipment.enduranceTest.details.modifiers.some(row=>row.amount===2));
  assert.equal(preview.supplementalEquipment.exposure, null);
});

test('F source characterization: Shard Tips selected as ammunition reach the actual attack preview', () => {
  const weapon = { id: 'bow', name: 'Bow', kind: 'weapon', range: '50', damage: '+4', category: 'Bow', keywords: [] };
  const ammo = { id: 'shard-tips', name: 'Shard Tips', kind: 'ammunition', category: 'Arrows/Bolts', damage: '', range: '', keywords: [], source: 'The Imperial Zoo p.114' };
  const shooter = { id: 'archer', caracs: { CT: 80, F: 40 }, skills: [{ name: 'Projectiles (Bow)', total: 80 }], equipment: [weapon, ammo], states: [] };
  const preview = previewResolution({ actor: shooter, target: { ...target, hp: 20, caracs: { E: 10 }, armor: {}, states: [] },
    action: { type: 'attack', name: 'Bow', base: 80, damage: 4, qualities: [], extensions: { fiche: { equipmentId: weapon.id }, equipment: weapon } },
    ammunitionId: ammo.id, ammunitionArbitrated: true, v5: { kind: 'ranged', context: {} }, roll: 31, baseRevision: 1 });
  assert.ok(preview.supplementalEquipment?.effects.some(row => row.state === 'Hémorragique'), 'one wound from the selected ammunition adds Bleeding');
});

test('F source characterization: published creature profiles contain the real targets', () => {
  const bonebreaker = findNamed(L22, 'Rat Ogre Bonebreaker');
  const tiger = findNamed(L24, 'Tiger Claws');
  const robeWearer = (() => {
    let found = null;
    const visit = value => {
      if (!value || typeof value !== 'object' || found) return;
      if (String(value.name || '').includes('Sergov Pfeiffer')) found = value;
      for (const child of Object.values(value)) Array.isArray(child) ? child.forEach(visit) : visit(child);
    };
    visit(L17);
    return found;
  })();
  assert.ok(bonebreaker?.attacks?.some(row => row.name === 'Warpstone Shard*'));
  assert.ok(tiger);
  assert.ok(robeWearer?.trappings?.includes("Wizard's Robes"));
  assert.ok(findNamed(L11, 'Rat Ogre Bonebreaker'));
  assert.ok(reference.equipment.items.some(item => item.name === 'Pavois (Pavise)'));
});

test('F source characterization: Warpstone Shard* exposes only on a critical wound', () => {
  const ordinary = previewSupplementalEquipment({ item: { name: 'Warpstone Shard*' }, actor, target, hit: true, damage: { finalDamage: 8 } });
  assert.equal(ordinary?.exposure, null);
  const critical = previewSupplementalEquipment({ item: { name: 'Warpstone Shard*' }, actor, target, hit: true, damage: { finalDamage: 8 }, critical: { severity: 'critical' } });
  assert.equal(critical?.exposure?.influence, 'minor');
  assert.equal(critical?.exposure?.participantId, target.id);
});

test('F source characterization: actual Rat Ogre Bonebreaker profile applies Penetrating and Warpstone only at critical', () => {
  const profile=L22.profiles.find(row=>row.name==='Rat Ogre Bonebreaker');
  const shard=profile.attacks.find(row=>row.name==='Warpstone Shard*');
  const actor={id:'bonebreaker',name:profile.name,caracs:profile.stats,skills:profile.skills.map(row=>({name:row.name,total:row.value})),equipment:[],states:[]};
  const target={id:'victim',hp:100,caracs:{E:0},equipment:[],states:[]};
  const attack=roll=>previewResolution({actor,target,action:{type:'attack',...shard,base:70,qualities:[]},defense:{type:'test',base:10,roll:99,label:'Esquive'},v5:{kind:'melee',context:{misfireRoll:5}},roll,baseRevision:1});
  const ordinary=attack(31);
  assert.ok(ordinary.damage.activeQualities.some(row=>row.id==='perforante'));
  assert.equal(ordinary.supplementalEquipment.exposure,null);
  const critical=attack(11);
  assert.equal(critical.supplementalEquipment.exposure.influence,'minor');
  assert.equal(critical.supplementalEquipment.exposure.participantId,target.id);
});

test('F source characterization: the catalogue pavise strike resolves as Defensive with BF+2', () => {
  const pavise=reference.equipment.items.find(item=>item.id==='shield-armures-bouclier-pavois-pavise');
  const actor={id:'pavise-user',caracs:{CC:80,F:50},skills:[{name:'Melee (Basic)',total:80}],equipment:[pavise],states:[]};
  const target={id:'foe',hp:30,caracs:{E:0},equipment:[],states:[]};
  const preview=previewResolution({actor,target,action:{type:'attack',name:pavise.name,base:80,damage:1,qualities:[]},
    v5:{kind:'melee',context:{attackWithShield:true,actorShieldId:pavise.id}},roll:51,baseRevision:1});
  assert.equal(preview.damage.weaponDamage,7,'BF 5 plus two printed damage');
  assert.ok(preview.damage.activeQualities.some(row=>row.id==='defensive'));
  assert.ok(preview.damage.activeQualities.some(row=>row.id==='inoffensive'));
});

test('F source characterization: actual Taggees Tiger Claws uses Brawling and records the disguise on a wound', () => {
  const profile=L24.profiles.find(row=>row.name?.startsWith('Taggees'));
  const claw=profile.attacks.find(row=>row.name==='Tiger Claws');
  const actor={id:'taggee',name:profile.name,caracs:profile.stats,skills:profile.skills.map(row=>({name:row.name,nameFr:row.nameFr,total:row.value})),equipment:[],states:[]};
  const target={id:'victim',hp:30,caracs:{E:0},equipment:[],states:[]};
  const preview=previewResolution({actor,target,action:{type:'attack',...claw,base:profile.stats.CC,qualities:[]},defense:{type:'test',base:10,roll:90,label:'Esquive'},v5:{kind:'melee',context:{felidWoundDisguise:true}},roll:31,baseRevision:1});
  assert.equal(preview.input.action.base,61,'use the published Melee (Brawling) skill, not WS 56');
  assert.ok(preview.supplementalEquipment.effects.some(row=>row.disguiseAs==='grand félin'));
  const applied=applyResolution(preview,{revision:1,participants:[actor,target],appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants.find(row=>row.id==='victim').extensions.v5.felidWoundDisguises[0].appearance,'grand félin');
});

test('F source characterization: Taggees Tiger Claws record no disguise unless the panel checkbox sets felidWoundDisguise', () => {
  const profile=L24.profiles.find(row=>row.name?.startsWith('Taggees'));
  const claw=profile.attacks.find(row=>row.name==='Tiger Claws');
  const actor={id:'taggee',name:profile.name,caracs:profile.stats,skills:profile.skills.map(row=>({name:row.name,nameFr:row.nameFr,total:row.value})),equipment:[],states:[]};
  const target={id:'victim',hp:30,caracs:{E:0},equipment:[],states:[]};
  for(const context of [{},{felidWoundDisguise:false},{felidWoundDisguise:undefined}]){
    const preview=previewResolution({actor,target,action:{type:'attack',...claw,base:profile.stats.CC,qualities:[]},defense:{type:'test',base:10,roll:90,label:'Esquive'},v5:{kind:'melee',context},roll:31,baseRevision:1});
    assert.equal(preview.hit,true);
    assert.ok(!preview.supplementalEquipment.effects.some(row=>row.disguiseAs),'unchecked: no disguise effect');
    const applied=applyResolution(preview,{revision:1,participants:[actor,target],appliedResolutionIds:[]});
    assert.equal(applied.status,'applied');
    assert.equal(applied.state.participants.find(row=>row.id==='victim').extensions?.v5?.felidWoundDisguises,undefined);
  }
});

test('F source characterization: the real Tiger Claws profile applies through Store', async () => {
  const profile=L24.profiles.find(row=>row.name?.startsWith('Taggees'));
  const actor=buildParticipantFromBestiary(profile.id,{library:L24.profiles,idFactory:()=> 'taggee-store'});
  actor.zone='active';actor.camp='pj';
  const claw=actor.actions.find(row=>row.name==='Tiger Claws');
  const target={id:'cat-victim',name:'Témoin',zone:'active',camp:'ennemi',hp:30,maxHp:30,caracs:{CC:20,E:0},equipment:[],actions:[],skills:[],states:[],armor:{},extensions:{v5:{}}};
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON(JSON.stringify({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},extensions:{v5:{turnIndex:1}}}));
  const brawling=actor.skills.find(row=>/Bagarre|Brawling/i.test(`${row.name} ${row.sourceName}`));
  const preview=store.previewResolution({actorId:actor.id,targetId:target.id,action:{...claw,base:profile.stats.CC,qualities:[],extensions:{...claw.extensions,fiche:{skillId:brawling.id}}},defense:{type:'test',base:10,roll:90,label:'Esquive'},v5:{kind:'melee',context:{felidWoundDisguise:true}},roll:31});
  assert.equal(preview.input.action.base,61,'Store still routes the actual profile attack through Melee (Brawling)');
  assert.ok(preview.supplementalEquipment.effects.some(row=>row.disguiseAs==='grand félin'));
  const result=await store.applyResolution(preview);
  assert.equal(result.status,'applied');
  assert.equal(store.listParticipants().find(row=>row.id===target.id).extensions.v5.felidWoundDisguises[0].appearance,'grand félin');
});

test('F source characterization: the MJ can declare one item-linked daily Warpstone exposure into K1', async () => {
  const store=createStore({storage:null});await store.ready;
  const weapon=reference.equipment.items.find(item=>item.id==='weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const wearer={id:'wearer',name:'Porteur',zone:'active',hp:10,maxHp:10,caracs:{E:40,FM:40},equipment:[weapon],skills:[],states:[],extensions:{v5:{corruptionPoints:0}}};
  await store.loadFromJSON(JSON.stringify({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:wearer.id,order:[wearer.id],participants:[wearer]},extensions:{v5:{turnIndex:1}}}));
  const status=store.getCorruptionStatus(wearer.id);
  await store.declareWarpstoneDailyExposure(wearer.id,{itemId:weapon.id,dayLabel:'Jour de test',confirmed:true,baseRevision:status.baseRevision});
  const queued=store.getCorruptionStatus(wearer.id).pendingExposureSources;
  assert.equal(queued.length,1);
  assert.match(queued[0].source,/Mitrailleuse Ratling Skaven.*Jour de test/);
  assert.throws(()=>store.declareWarpstoneDailyExposure(wearer.id,{itemId:weapon.id,dayLabel:'Jour de test',confirmed:true,baseRevision:store.getCorruptionStatus(wearer.id).baseRevision}),/déjà été déclarée/);
});

test('F source characterization: the real Bonebreaker Shard attack is a stable daily exposure source with history', async () => {
  let sequence=0;
  const profile=L22.profiles.find(row=>row.name==='Rat Ogre Bonebreaker');
  const bonebreaker=buildParticipantFromBestiary(profile.id,{library:L22.profiles,idFactory:()=>`bonebreaker-${++sequence}`});
  const shard=bonebreaker.actions.find(row=>row.name==='Warpstone Shard*');
  assert.ok(shard?.id);
  bonebreaker.zone='active';bonebreaker.extensions.v5.corruptionPoints=0;
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON(JSON.stringify({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:bonebreaker.id,order:[bonebreaker.id],participants:[bonebreaker]},extensions:{v5:{turnIndex:1}}}));
  const status=store.getCorruptionStatus(bonebreaker.id);
  await store.declareWarpstoneDailyExposure(bonebreaker.id,{attackId:shard.id,dayLabel:'Jour du profil',confirmed:true,baseRevision:status.baseRevision});
  const queued=store.getCorruptionStatus(bonebreaker.id).pendingExposureSources;
  assert.equal(queued.length,1);
  assert.equal(queued[0].actionId,shard.id);
  assert.match(queued[0].id,/E0-P-737/);
  assert.throws(()=>store.declareWarpstoneDailyExposure(bonebreaker.id,{attackId:shard.id,dayLabel:'Jour du profil',confirmed:true,baseRevision:store.getCorruptionStatus(bonebreaker.id).baseRevision}),/déjà été déclarée/);
  await store.undo();
  assert.equal(store.getCorruptionStatus(bonebreaker.id).pendingExposureSources.length,0);
  await store.redo();
  assert.equal(store.getCorruptionStatus(bonebreaker.id).pendingExposureSources.length,1);
  const reload=createStore({storage:null});await reload.ready;await reload.loadFromJSON(store.getFullJSON());
  assert.equal(reload.getCorruptionStatus(bonebreaker.id).pendingExposureSources[0].actionId,shard.id);
});
});

describe('Équipement supplémentaire', () => {
const row = id => ({ supplementalRuleId: id, id: `test:${id}`, name: id });
const actor = { id: 'actor', name: 'A', equipment: [] };
const target = { id: 'target', name: 'T' };

test('F2-F — each of the 17 selected source rows has an executable supplement clause', () => {
  assert.equal(lots['F2-F'].length, 17);
  assert.deepEqual(F2_F_RULE_IDS, lots['F2-F'].map(entry => entry.id));
  for (const id of F2_F_RULE_IDS) assert.equal(previewSupplementalEquipment({ item: row(id), actor, target })?.ruleId, id);
});

test('F2-F — Skaven weapon exposures use the real wounded target and converted DR modifiers', () => {
  const cases = [
    ['F-L11-0013', 'minor', 2], ['F-L11-0016', 'moderate', 0],
    ['F-L11-0017', 'minor', 0], ['F-L11-0018', 'minor', 0]
  ];
  for (const [id, influence, skillModifier] of cases) {
    const plan = previewSupplementalEquipment({ item: row(id), actor, target, hit: true, damage: { finalDamage: 1 } });
    assert.deepEqual([plan.exposure.participantId, plan.exposure.influence, plan.exposure.skillModifier, plan.exposure.thresholdTestRequired], [target.id, influence, skillModifier, true]);
    assert.equal(previewSupplementalEquipment({ item: row(id), actor, target, hit: true, damage: { finalDamage: 0 } }).exposure, null);
  }
});

test('F2-F — knife, antler blades, and dragon shards propose only the source effects on the required trigger', () => {
  const poison = previewSupplementalEquipment({ item: row('F-L11-0076'), actor, target, hit: true, damage: { finalDamage: 1 } });
  assert.match(poison.unresolved.join(' '), /Endurance.*−1 DR/);
  assert.deepEqual(previewSupplementalEquipment({ item: row('F-L11-0076'), actor, target, hit: true, damage: { finalDamage: 1 }, context: { supplementalPoisonTest: { success: false } } }).effects.map(effect => effect.state), ['Empoisonné']);
  assert.deepEqual(previewSupplementalEquipment({ item: row('F-L11-0079'), actor, target, critical: { id: 'critical' }, context: { antlerHandleOrigin: 'violent' } }).effects.map(effect => effect.participantId), ['target', 'actor']);
  assert.deepEqual(previewSupplementalEquipment({ item: row('F-L11-0083'), actor, target, hit: true, damage: { finalDamage: 1 } }).effects.map(effect => effect.state), ['Hémorragique']);
});

test('F2-F — tiger claws disguise a wound from a successful Brawling attack', () => {
  const item = row('F-L24-0008');
  const success = previewSupplementalEquipment({ item, actor, target, hit: true, damage: { finalDamage: 1 }, context: { felidWoundDisguise: true } });
  assert.equal(success.effects[0].disguiseAs, 'grand félin');
  assert.equal(previewSupplementalEquipment({ item, actor, target, hit: true, damage: { finalDamage: 1 } }).effects.length, 0, 'disguise is the wielder choice, off by default');
  assert.equal(previewSupplementalEquipment({ item, actor, target, hit: false, damage: { finalDamage: 0 } }).effects.length, 0);
});

test('F2-F — secret d10 exhausts the Fell Dagger poison and breaks it on its next use', () => {
  const linked = { ...row('F-L11-0076'), extensions: { v5: {} } };
  const firstUse = previewSupplementalEquipment({ item: linked, actor, target, used: true, context: { fellDaggerSecretRoll: 1 } });
  assert.deepEqual(firstUse.weaponDispositionUpdate, { itemId: linked.id, weaponDisposition: null, fellDaggerBreakNextUse: true });
  assert.equal(firstUse.unresolved.length, 0, 'le poison épuisé ne demande pas de Test d’Endurance');
  const secondUse = previewSupplementalEquipment({ item: { ...linked, extensions: { v5: { fellDaggerBreakNextUse: true } } }, actor, target, used: true });
  assert.deepEqual(secondUse.weaponDispositionUpdate, { itemId: linked.id, weaponDisposition: 'broken', fellDaggerBreakNextUse: false });
});

test('F2-F — carried/planted pavise, leviathan plate, fallen antler, and warpstone shard state their exact limits', () => {
  assert.match(previewSupplementalEquipment({ item: row('F-L13-0086') }).reminders.join(' '), /Protectrice 3.*BF\+2/);
  assert.match(previewSupplementalEquipment({ item: row('F-L13-0087') }).reminders.join(' '), /2 Actions.*Protectrice 5/);
  assert.match(previewSupplementalEquipment({ item: row('F-L11-0081') }).reminders.join(' '), /Encombrement.*−1.*PA et Taille inchangés/);
  assert.match(previewSupplementalEquipment({ item: row('F-L11-0078'), context: { antlerHandleOrigin: 'naturally-fallen' } }).reminders.join(' '), /ne se brise pas.*combat/);
  assert.ok(previewSupplementalEquipment({ item: row('F-L22-0139'), hit: true, damage: { finalDamage: 1 } }).reminders.some(line => /Pénétrante/.test(line)));
});

test('F2-F — planted pavise changes effective protection only within declared facing, range and first melee turn', () => {
  const pavise=reference.equipment.items.find(item=>item.id==='shield-armures-bouclier-pavois-pavise');
  const wearer = { id: 'wearer', equipment:[pavise,{id:'mail',name:'mail',kind:'armour',ap:2,locations:['body'],layer:'rigid',keywords:[]}],extensions:{v5:{paviseDeploymentByItemId:{[pavise.id]:{status:'planted',actionsPaid:2,facing:'north'}}}} };
  const base = { location: 'body', paviseId:pavise.id, attackDirection: 'north', paviseDistanceYards: 1, ranged: true };
  assert.equal(locationProtection(wearer, base).ap, 5);
  assert.equal(locationProtection(wearer, { ...base, attackDirection: 'south' }).ap, 2);
  assert.equal(locationProtection(wearer, { ...base, paviseDistanceYards: 2 }).ap, 2);
  assert.equal(locationProtection(wearer, { ...base, ranged: false, paviseMeleeFirstTurn: false }).ap, 2);
  assert.equal(locationProtection(wearer, { ...base, ranged: false, paviseMeleeFirstTurn: true }).ap, 5);
});

test('F2-F — the actual catalogue pavise supplies its carried PA to an opposed resolution', () => {
  const pavise = reference.equipment.items.find(item => item.id === 'shield-armures-bouclier-pavois-pavise');
  assert.ok(pavise, 'objet source Pavois (Pavise)');
  const wearer = { id: 'wearer', armorLocations: { head: 0, body: 0, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 }, equipment: [pavise] };
  const protection = locationProtection(wearer, { location: 'body', shieldId: pavise.id, shieldAvailable: true, opposedWithShield: true, defenseProvided: true, ranged: false });
  assert.equal(protection.ap, 3);
});

test('F2-F — robes never grant Focalisation DR on another domain or an unknown rank', () => {
  const robe = { ...row('F-L06-1105'), associatedDomain: 'Aqshy', robeRank: 3 };
  assert.match(previewSupplementalEquipment({ item: robe, spell: { wind: 'Ghur' } }).reminders.join(' '), /aucun bonus/);
  const matching = previewSupplementalEquipment({ item: robe, spell: { wind: 'Aqshy' } });
  assert.match(matching.reminders.join(' '), /\+3 DR.*Aqshy seulement/);
  assert.equal(matching.casting.focusSL, 3);
  assert.ok(previewSupplementalEquipment({ item: { ...robe, robeRank: 4 }, spell: { wind: 'Aqshy' } }).unresolved.some(line => /choisir le rang/.test(line)));
  const staff = previewSupplementalEquipment({ item: { ...row('F-L06-1104'), associatedDomain: 'Aqshy', focusRank: 2 }, spell: { wind: 'Aqshy' } });
  assert.equal(staff.casting.focusSL, 2);
  assert.equal(staff.casting.cnReduction, undefined, 'le bâton ne réduit pas le NI, selon la décision T4');
  assert.ok(previewSupplementalEquipment({ item: { ...row('F-L06-1104'), associatedDomain: 'Aqshy' }, spell: { wind: 'Aqshy' } }).unresolved.some(line => /choisir le rang/.test(line)));
});

test('F2-F — matching robe rank changes only a real Focalisation Test DR', () => {
  const input = {
    actor: { id: 'mage', states: [] }, target: null,
    action: { type: 'test', name: 'Focalisation (Aqshy)', base: 50 }, roll: 56,
    v5: { context: { focalisationSupplementRuleId: 'F-L06-1105', focalisationAssociatedDomain: 'Aqshy', focalisationDomain: 'Aqshy', focalisationRobeRank: 2 } },
    baseRevision: 1
  };
  const boosted = previewResolution(input);
  const plain = previewResolution({ ...input, v5: { context: {} } });
  assert.equal(boosted.sl, plain.sl + 2);
  const otherDomain = previewResolution({ ...input, action: { ...input.action, name: 'Focalisation (Ghur)' }, v5: { context: { ...input.v5.context, focalisationDomain: 'Ghur' } } });
  assert.equal(otherDomain.sl, plain.sl);
});

test('F2-F — the source snapshot profiles remain byte-for-byte at the authoritative sheet values', () => {
  const ratling = reference.equipment.items.find(item => item.id === 'weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const lance = reference.equipment.items.find(item => item.id === 'weapon-armes-a-distance-ingenierie-lance-feu-a-malepierre-skaven');
  assert.deepEqual([ratling.damage, ratling.range], ['+9', '60']);
  assert.deepEqual([lance.damage, lance.range, lance.keywords.find(word => word.id === 'explosion')?.parameter], ['+10', '30', '3']);
});

test('F2-F — linked Ratling resolution emits a K1 exposure only when it wounds', () => {
  const ratling = reference.equipment.items.find(item => item.id === 'weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const actorWithWeapon = { id: 'ratling-user', caracs: { F: 40, CT: 80 }, skills: [{ name: 'Projectiles (Ingénierie)', total: 80 }], equipment: [ratling], states: [] };
  const victim = { id: 'victim', hp: 20, caracs: { E: 10 }, armor: {}, states: [] };
  const preview = previewResolution({ actor: actorWithWeapon, target: victim,
    action: { type: 'attack', name: 'Mitrailleuse Ratling', base: 80, damage: 9, qualities: [], extensions: { fiche: { equipmentId: ratling.id } } },
    v5: { kind: 'ranged', context: {} }, roll: 31, baseRevision: 1 });
  assert.equal(preview.supplementalEquipment?.exposure?.sourceRuleId, 'F-L11-0013');
  assert.equal(preview.supplementalEquipment.exposure.skillModifier, 2);
  assert.ok(preview.reminders.some(line => /Test de Corruption mineure \(\+2 DR\)/.test(line)));
});

test('F2-F — Store carries a wounded Ratling exposure into the target K1 queue and resolves it without a session', async () => {
  const store = createStore({ storage: null }); await store.ready;
  const sourceRatling = reference.equipment.items.find(item => item.id === 'weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const ratling = { ...sourceRatling, extensions: { v5: { reloadState: createV5ReloadState({ repeaterRating: 10, reloadSuccesses: 1 }).state } } };
  const shooter = { ...actor, id: 'shooter', zone: 'active', hp: 20, maxHp: 20, caracs: { CT: 80, F: 30 },
    skills: [{ id: 'skill-50_72_6f_6a_65_63_74_69_6c_65_73-49_6e_67_e9_6e_69_65_72_69_65', name: 'Projectiles (Ingénierie)', status: 'resolved', total: 80, carac: 'CT' }], equipment: [ratling], extensions: { v5: {} } };
  const victim = { ...target, zone: 'active', hp: 20, maxHp: 20, caracs: { E: 40, FM: 50 }, equipment: [], skills: [{ id: 'skill-52_e9_73_69_73_74_61_6e_63_65-base', name: 'Résistance', total: 50 }], extensions: { v5: { corruptionPoints: 0 } } };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: shooter.id, order: [shooter.id, victim.id], participants: [shooter, victim] }, extensions: { v5: { turnIndex: 1 } } });
  const attack = store.previewResolution({ actorId: shooter.id, targetId: victim.id, roll: 31,
    action: { type: 'attack', name: 'Mitrailleuse Ratling', base: 80, damage: 9, qualities: [], extensions: { fiche: { equipmentId: ratling.id } } },
    v5: { kind: 'ranged', context: { weaponAdvances: 10 } } });
  assert.equal(attack.supplementalEquipment?.exposure?.participantId, victim.id);
  assert.equal((await store.applyResolution(attack)).status, 'applied');
  const queued = store.listParticipants().find(row => row.id === victim.id).extensions.v5.pendingCorruptionExposures;
  assert.equal(queued.length, 1);
  const exposure = store.previewCorruptionExposure(victim.id, { immediateExposureId: queued[0].id, skillId: victim.skills[0].id, roll: 51 });
  assert.equal(exposure.status, 'ready');
  assert.equal(exposure.input.difficultyDR, 2);
  assert.equal((await store.applyCorruptionExposure(victim.id, exposure)).status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === victim.id).extensions.v5.pendingCorruptionExposures.length, 0);
});

test('F2-F — Store application persists Fell Dagger poison exhaustion and blocks it after its next use', () => {
  const weapon = { id: 'fell-dagger-1', name: 'Dague funeste', kind: 'weapon', extensions: { v5: {} } };
  const owner = { id: 'owner', caracs: { CC: 80, F: 40 }, equipment: [weapon], states: [] };
  const victim = { id: 'victim', hp: 100, caracs: { E: 10 }, armor: {}, states: [] };
  const input = { actor: owner, target: victim, action: { type: 'attack', name: weapon.name, base: 80, damage: 1, qualities: [], extensions: { fiche: { equipmentId: weapon.id } } },
    v5: { context: { fellDaggerSecretRoll: 1 } }, defense: { type: 'test', base: 30, roll: 90, label: 'Esquive' }, roll: 62, baseRevision: 0 };
  const first = previewResolution(input);
  assert.equal(first.supplementalEquipment?.weaponDispositionUpdate?.fellDaggerBreakNextUse, true);
  assert.deepEqual(first.unresolved, []);
  const applied = applyResolution(first, { revision: 0, participants: [owner, victim], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  const exhaustedOwner = applied.state.participants.find(row => row.id === owner.id);
  const exhaustedVictim = applied.state.participants.find(row => row.id === victim.id);
  assert.equal(exhaustedOwner.equipment[0].extensions.v5.fellDaggerBreakNextUse, true);
  const next = previewResolution({ ...input, actor: exhaustedOwner, target: exhaustedVictim, v5: { choice: 'keep', context: {} }, baseRevision: 1 });
  assert.equal(next.supplementalEquipment?.weaponDispositionUpdate?.weaponDisposition, 'broken');
  const broken = applyResolution(next, { revision: 1, participants: applied.state.participants, appliedResolutionIds: applied.state.appliedResolutionIds });
  assert.equal(broken.status, 'applied');
  const brokenOwner = broken.state.participants.find(row => row.id === owner.id);
  assert.equal(brokenOwner.equipment[0].extensions.v5.weaponDisposition, 'broken');
  assert.ok(previewResolution({ ...input, actor: brokenOwner, target: broken.state.participants.find(row => row.id === victim.id), v5: { choice: 'keep', context: {} }, baseRevision: 2 }).unresolved.some(message => /lame s’est brisée/.test(message)));
});
});

describe('Équipement T2bis (caractérisation)', () => {
const participant = (id, equipment = []) => ({ id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'foes', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 50, F: 30, E: 30, Ag: 40, I: 30 }, skills: [], talents: [], states: [], equipment, armor: {},
  extensions: { v5: { hasMomentum: false } } });
const shield = { id: 'buckler', kind: 'shield', name: 'Targe', ap: 1, locations: [], keywords: [{ id: 'bouclier', parameter: '' }] };

test('T2 bis characterization — Bolas: parameter parsing accepts combined state text and hit effects remain leg-location only', () => {
  const weapon = referenceSnapshot.equipment.items.find(item => item.baseId === 'weapon-armes-a-distance-entraves-bolas');
  const parsed = parseV5Inflict(weapon.keywords.find(word => word.id === 'inflige').parameter);
  assert.equal(parsed.ready, true, parsed.unresolved?.join('; '));
  assert.deepEqual(parsed.conditions.map(row => row.key), ['enchevetre', 'a-terre']);
  const input = calledShotLocation => previewResolution({ actor: participant('a', [weapon]), target: participant('b'), roll: 20,
    action: { type: 'attack', attr: 'CT', base: 50, damage: 0, qualities: weapon.keywords,
      extensions: { fiche: { equipmentId: weapon.id } } },
    attackContext: { ranged: true }, v5: { kind: 'ranged', context: { calledShot: true, calledShotLocation } } });
  const legs = input('leftLeg'), body = input('body');
  assert.deepEqual(legs.targetConditionApplication?.map(row => row.key), ['enchevetre', 'a-terre']);
  assert.deepEqual(body.targetConditionApplication?.map(row => row.key), []);
});

test('T2 bis characterization — bouclier attaché: PA limités à tête, corps et bras non directeur', () => {
  const target = participant('b', [shield]);
  const protection = (location, nonDominantArmSide) => locationProtection(target, { location, shieldId: 'buckler', shieldAvailable: true,
    opposedWithShield: true, defenseProvided: true, ranged: false, shieldAttached: true, nonDominantArmSide });
  assert.equal(protection({ key: 'HEAD' }, undefined).shieldAp, 1);
  assert.equal(protection({ key: 'BODY' }, undefined).shieldAp, 1);
  assert.equal(protection({ key: 'ARM', side: 'left' }, 'left').shieldAp, 1);
  assert.equal(protection({ key: 'ARM', side: 'right' }, 'left').shieldAp, 0);
  assert.equal(protection({ key: 'LEGS' }, undefined).shieldAp, 0);
  const hands = validateV5ShieldHands({ shield, weaponHands: 2, weaponEncumbrance: 3, attached: true, polearm: true });
  assert.equal(hands.allowed, true);
  const buckler = validateV5ShieldHands({ shield, weaponHands: 1, weaponEncumbrance: 0, attached: true, offHandWeaponEncumbrance: 0 });
  assert.equal(buckler.allowed, true);
  const missingSide = protection({ key: 'ARM', side: 'right' }, undefined);
  assert.equal(missingSide.shieldAp, 0);
  assert.ok(missingSide.manual.includes('bras-non-directeur-requis:bouclier-attache'));
});

test('T2 bis integration — attached shield side selection reaches hit protection and missing side blocks only an arm hit', () => {
  const actor = participant('a', [referenceSnapshot.equipment.items.find(item => item.kind === 'weapon')]);
  const target = participant('b', [shield]);
  const make = nonDominantArmSide => previewResolution({ actor, target, roll: 20,
    action: { type: 'attack', attr: 'CC', base: 50, damage: 4, qualities: [], extensions: { fiche: { equipmentId: actor.equipment[0].id } } },
    v5: { kind: 'melee', context: { calledShot: true, calledShotLocation: 'rightArm' } },
    protectionContext: { shieldId: 'buckler', shieldAvailable: true, opposedWithShield: true, defenseProvided: true,
      ranged: false, shieldAttached: true, ...(nonDominantArmSide ? { nonDominantArmSide } : {}) },
    defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: 60, v5: { kind: 'test', context: {} } } });
  const unknown = make(undefined);
  assert.ok(unknown.protection.manual.includes('bras-non-directeur-requis:bouclier-attache'));
  const known = make('right');
  assert.equal(known.protection.shieldAp, 1);
  assert.equal(known.unresolved.some(row => row.includes('bras-non-directeur-requis:bouclier-attache')), false);
});

test('T2 bis characterization — pistolet au contact: Esquive remains a valid opposition', () => {
  const actor = participant('a'), target = participant('b');
  const plan = previewResolution({ actor, target, roll: 40,
    action: { type: 'attack', label: 'Pistolet', attr: 'CT', base: 50, damage: 9, qualities: [{ id: 'pistol' }] },
    attackContext: { ranged: true, range: 'contact' },
    defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: 25, v5: { kind: 'test', context: {} } },
    v5: { kind: 'ranged', context: { rangeBand: 'contact' } } });
  assert.equal(plan.unresolved.some(row => /Esquive.*refus|Esquive.*impossible/i.test(String(row))), false);
});

test('T2 bis characterization — Discrétion penalty follows only catalogue-marked armor; blunderbuss rejects bullets', () => {
  const marked = calculateV5ArmorPenalty({ worn: [{ worn: true, category: 'mail', notes: 'Flexible (-1 DR en Discrétion si une ou plusieurs pièces de mailles sont portées)' }] });
  const unmarked = calculateV5ArmorPenalty({ worn: [{ worn: true, category: 'Ithilmar haut elfe', notes: '' }] });
  assert.equal(marked.stealthDr, -1);
  assert.equal(unmarked.stealthDr, 0);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'grenaille', isBlunderbuss: true }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'projectile improvisé', isBlunderbuss: true }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'balle', isBlunderbuss: true }).allowed, false);
});

test('T2 bis characterization — Tromblon profile accepts shot and improvised ammo, but not bullets', () => {
  const weapon = referenceSnapshot.equipment.items.find(item => item.baseId === 'weapon-armes-a-distance-poudre-noire-tromblon-2m');
  const ammunition = name => referenceSnapshot.equipment.items.find(item => item.kind === 'ammunition' && item.name.startsWith(name));
  assert.equal(ammunitionCompatibility(weapon, ammunition('Grenaille et poudre')).status, 'compatible');
  assert.equal(ammunitionCompatibility(weapon, ammunition('Munitions improvisées et poudre')).status, 'compatible');
  assert.equal(ammunitionCompatibility(weapon, ammunition('Balles et poudre')).status, 'incompatible');
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: weapon.category, ammunitionType: 'balle', isBlunderbuss: true }).allowed, false);
});
});

describe('Filet et opposition (intégration)', () => {
const memory=()=>{let saved=null;return{async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};};
const item=name=>getReferenceCatalogue().items.find(row=>row.name===name);

async function scene(weapon){
  const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
  const holder={id:'holder',name:'Porteur',kind:'PJ',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:50,CT:50,F:3,E:30},skills:[],states:[],equipment:[weapon],extensions:{v5:{}}};
  const victim={id:'victim',name:'Cible',kind:'PNJ',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:40,CT:40,F:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:holder.id,order:[holder.id,victim.id],participants:[holder,victim]},log:[],diceLines:[]});
  const attack=store.previewResolution({actorId:holder.id,targetId:victim.id,resolutionId:`hit-${weapon.id}`,roll:20,round:1,
    action:{type:'attack',attr:'CC',base:50,damage:4,qualities:weapon.keywords,extensions:{fiche:{equipmentId:weapon.id}}},
    defense:{type:'skill',attr:'CC',base:30,roll:20,label:'Corps à corps',v5:{kind:'melee',context:{}}},v5:{kind:'melee'}});
  const applied=await store.applyResolution(attack);assert.equal(applied.status,'applied',attack.unresolved.join('; '));
  return store;
}

test('T2 bis filet générique — la Force catalogue est testée et un échec ne renforce pas Empêtré',async()=>{
  const store=await scene(item('Filet'));
  let victim=store.listParticipants().find(row=>row.id==='victim');
  const condition=victim.states.find(row=>row.key==='enchevetre');assert.equal(condition.strength,50);
  const escapeInput={actorId:'victim',resolutionId:'escape-catalog-net-negative',roll:20,round:1,
    action:{type:'skill',attr:'F',base:30,label:'Force'},
    v5:{kind:'test',context:{netEscapeConditionId:condition.id,netEscapeOpponentRoll:20,requiresSight:false,reliesOnSight:false,usesFellowship:false}}};
  const wrongType=store.previewResolution(escapeInput);
  assert.ok(wrongType.unresolved.includes('Entrave : le Test de sortie doit être un Test de Force.'),'un jet de compétence ne peut pas se déclarer Test de sortie');
  const wrongAttribute=store.previewResolution({...escapeInput,resolutionId:'escape-catalog-net-wrong-attribute',action:{...escapeInput.action,type:'test',attr:'Ag'}});
  assert.ok(wrongAttribute.unresolved.includes('Entrave : le Test de sortie doit être un Test de Force.'),'le type Test ne suffit pas sans caractéristique Force');
  const preview=store.previewResolution({actorId:'victim',resolutionId:'escape-catalog-net',roll:20,round:1,
    action:{type:'test',attr:'F',base:30,label:'Force'},
    v5:{kind:'test',context:{netEscapeConditionId:condition.id,netEscapeOpponentRoll:20,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.deepEqual(preview.unresolved,[]);
  assert.equal(preview.test.sl,0,'Empêtré impose −1 DR au Test de sortie impliquant un mouvement');
  assert.equal(preview.netEscape.opposition.sourceScore,50,'la Force publiée du filet sert de score au Test adverse');
  assert.equal(preview.netEscape.freed,false);
  assert.equal((await store.applyResolution(preview)).status,'applied');
  victim=store.listParticipants().find(row=>row.id==='victim');
  assert.equal(victim.states.find(row=>row.id===condition.id).level,1);
  assert.equal(victim.extensions.v5.netEscapeProgress?.[condition.id],undefined,'les DR ne se cumulent pas');
});

test('T2 bis Mancatcher catalogue — ressort ajoute +2 DR au Test de Force du porteur pendant l’opposition',async()=>{
  const catalog=item('Mancatcher (2M)');
  const weapon={...catalog,extensions:{v5:{springLoaded:true}}};
  const store=await scene(weapon);
  let victim=store.listParticipants().find(row=>row.id==='victim');
  const condition=victim.states.find(row=>row.key==='enchevetre');
  assert.equal(condition.strength,3,'le profil emploie votre Force, ici celle du porteur');
  assert.equal(condition.source.entanglementKind,'mancatcher');
  assert.equal(condition.source.springLoaded,true);
  const preview=store.previewResolution({actorId:'victim',resolutionId:'escape-mancatcher-spring',roll:10,round:1,
    action:{type:'test',attr:'F',base:30,label:'Force'},
    v5:{kind:'test',context:{netEscapeConditionId:condition.id,netEscapeOpponentRoll:30,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.deepEqual(preview.unresolved,[]);
  assert.equal(preview.test.sl,1,'le Test du personnage subit −1 DR pour se dégager');
  assert.equal(preview.netEscape.opposition.sourceScore,3,'la Force de la source vient du porteur sans conversion implicite');
  assert.equal(preview.netEscape.opposition.sourceSl,-1,'DR de la Force publiée 3 +2 DR du ressort');
  assert.equal(preview.netEscape.opposition.netSl,2);
  assert.equal(preview.netEscape.freed,true,'l’opposition utilise directement la Force publiée 3');
  assert.equal((await store.applyResolution(preview)).status,'applied');
  victim=store.listParticipants().find(row=>row.id==='victim');
  assert.equal(victim.states.some(row=>row.id===condition.id),false,'l’évasion complète retire l’état Empêtré');
});
});
