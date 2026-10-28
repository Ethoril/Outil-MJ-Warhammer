import test from 'node:test';
import assert from 'node:assert/strict';
import L11 from '../js/data/bestiary/L11.json' with { type: 'json' };
import L22 from '../js/data/bestiary/L22.json' with { type: 'json' };
import L24 from '../js/data/bestiary/L24.json' with { type: 'json' };
import L17 from '../js/data/bestiary/L17.json' with { type: 'json' };
import reference from '../js/data/reference-snapshot.json' with { type: 'json' };
import { previewSupplementalEquipment } from '../js/core/v5-supplemental-equipment.js';
import { applyResolution, previewResolution } from '../js/core/resolution.js';
import { createStore } from '../js/core/store.js';

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
    v5: { kind: 'melee', context: { warpBladeEnduranceTest: { success: false } } }, roll: 31, baseRevision: 1 });
  assert.equal(preview.damage.finalDamage, 15, 'includes +5 SL without subtracting the plate PA');
  assert.deepEqual(preview.damage.activeQualities.map(row => row.id), ['defensive', 'entaille', 'empaleuse']);
  assert.ok(preview.targetConditionApplication.some(row => row.name === 'Sonné'));
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
  const preview=previewResolution({actor,target,action:{type:'attack',...claw,base:profile.stats.CC,qualities:[]},defense:{type:'test',base:10,roll:90,label:'Esquive'},v5:{kind:'melee',context:{}},roll:31,baseRevision:1});
  assert.equal(preview.input.action.base,61,'use the published Melee (Brawling) skill, not WS 56');
  assert.ok(preview.supplementalEquipment.effects.some(row=>row.disguiseAs==='grand félin'));
  const applied=applyResolution(preview,{revision:1,participants:[actor,target],appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants.find(row=>row.id==='victim').extensions.v5.felidWoundDisguises[0].appearance,'grand félin');
});

test('F source characterization: the MJ can declare one item-linked daily Warpstone exposure into K1', async () => {
  const store=createStore({storage:null});await store.ready;
  const weapon=reference.equipment.items.find(item=>item.id==='weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const wearer={id:'wearer',name:'Porteur',zone:'active',hp:10,maxHp:10,caracs:{E:40,FM:40},equipment:[weapon],skills:[],states:[],extensions:{v5:{corruptionPoints:0}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:wearer.id,order:[wearer.id],participants:[wearer]},extensions:{v5:{turnIndex:1}}});
  const status=store.getCorruptionStatus(wearer.id);
  await store.declareWarpstoneDailyExposure(wearer.id,{itemId:weapon.id,dayLabel:'Jour de test',confirmed:true,baseRevision:status.baseRevision});
  const queued=store.getCorruptionStatus(wearer.id).pendingExposureSources;
  assert.equal(queued.length,1);
  assert.match(queued[0].source,/Mitrailleuse Ratling Skaven.*Jour de test/);
  assert.throws(()=>store.declareWarpstoneDailyExposure(wearer.id,{itemId:weapon.id,dayLabel:'Jour de test',confirmed:true,baseRevision:store.getCorruptionStatus(wearer.id).baseRevision}),/déjà été déclarée/);
});

