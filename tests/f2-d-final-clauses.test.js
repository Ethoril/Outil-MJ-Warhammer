import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../js/core/resolution.js';
import { createStore } from '../js/core/store.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { ARCANE_WEAPON_PROFILES } from '../js/core/equipment.js';

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
