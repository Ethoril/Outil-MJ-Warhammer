import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMagicSubject } from '../js/core/sanitize.js';
import { getPrayerSLModifiers } from '../js/core/v5-divine-prayer-caps.js';
import { normalizeRemoteDocument } from '../js/core/sync-session.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { createStore } from '../js/core/store.js';
import { getAllDivineContracts } from '../js/core/v5-divine-store.js';

const PRAY='skill-50_72_69_e8_72_65-base';
const person=(id,sin,initiative)=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative,hp:20,maxHp:30,
  caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,arms:0,legs:0},
  states:[],traits:[],equipment:[],skills:[{id:PRAY,name:'Prière',carac:'Soc',status:'resolved',total:60}],
  talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'},{id:'talent-invoke',status:'resolved',rank:1,specialization:'Myrmidia'}],
  prayers:getAllDivineContracts().filter(row=>row.type==='miracle').map(row=>({name:row.catalogueName,status:'resolved'})),extensions:{v5:{divine:{sin}}}});
async function divineFixture(){
  let saved=null;const persistence={async load(){return saved&&structuredClone(saved)},async saveAtomic({state}){saved=structuredClone(state);return {ok:true}}};
  const store=createStore({persistence,storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[person('priest',1,60),person('ally',0,30)]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
  return store;
}
function lessonInput(extra={}){return {actorId:'priest',targetIds:['ally'],roll:99,wrathRoll:1,executionId:'ready-reminder-dev',canSpeak:true,
  choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},expiry:{phase:'endOfRound',round:6,moment:'afterEffects'},...extra};}

test('Leçons divines — sanitation préserve le -1 typé sans élargir les quantités de dégâts', () => {
  const cleaned=sanitizeMagicSubject({id:'p',extensions:{v5:{divineEffects:[
    {type:'prayer-sl-modifier',amount:-1},
    {type:'spell',amount:-1,damageReduction:-1},
  ]}}});
  assert.equal(cleaned.extensions.v5.divineEffects[0].amount,-1);
  assert.equal(cleaned.extensions.v5.divineEffects[1].amount,0);
  assert.equal(cleaned.extensions.v5.divineEffects[1].damageReduction,0);
  for(const amount of [0,'-1']){
    const forged={id:'p',extensions:{v5:{divineEffects:[{type:'prayer-sl-modifier',amount}]}}};
    assert.equal(getPrayerSLModifiers(forged).ok,false,'une couche mal formée doit demander une vérification');
  }
});

test('Leçons divines — un aperçu prêt ne garde pas le rappel Courroux à résoudre; d10 absent reste bloquant',async()=>{
  const store=await divineFixture();
  const blocked=store.previewDivineExecution('divine:blessing:myrmidia:battle',lessonInput({wrathDurationRoll:undefined}));
  assert.equal(blocked.ready,false);
  assert.ok(blocked.needsInput.some(row=>(row.path||row.field)==='wrathDurationRoll'));
  const ready=store.previewDivineExecution('divine:blessing:myrmidia:battle',lessonInput({wrathDurationRoll:4}));
  assert.equal(ready.ready,true,ready.error);
  assert.equal(ready.wrathTableResult?.id,'wrath:11-15');
  assert.equal(ready.wrathLessonDuration.rounds,5);
  assert.equal(ready.preview.reminders.some(text=>/Courroux divin déclenché.*reste à résoudre/i.test(text)),false);
});

test('Leçons divines —codec distant restaure seulement le sceneId null attesté',()=>{
  const rule=registry.prayerSLRules.find(row=>row.id==='wrath:11-15:pray-sl-modifier');
  const layer={id:'prayer-sl-modifier:codec-proof',type:'prayer-sl-modifier',amount:-1,originKind:'wrath',originExecutionId:'codec-proof',
    wrathResultId:'wrath:11-15',ruleId:rule.id,ruleVersion:1,targetId:'priest',subjectKey:'instance:priest',source:structuredClone(rule.source),sourceReceipt:structuredClone(rule.sourceReceipt),
    duration:{roll:1,sinAtTrigger:1,rounds:2,unit:'rounds'},roundAnchor:{round:1},expiry:{round:2,phase:'endOfRound',moment:'afterEffects'},
    wrathProof:{schemaVersion:1,originExecutionId:'codec-proof',durationRoll:1,
      prayer:{initialRoll:99,roll:99,optionId:'keep',reversed:false,success:false,fumble:true,sl:-5},
      wrath:{roll:1,modifiedRoll:11,sinAtTest:1,resultId:'wrath:11-15'}}};
  const raw={revision:1,receipts:{},state:{combat:{round:1,participants:[{id:'priest',extensions:{v5:{divineEffects:[layer]}}}]}}};
  const remote=normalizeRemoteDocument(raw),restored=remote.state.combat.participants[0].extensions.v5.divineEffects[0];
  assert.equal(restored.roundAnchor.sceneId,null);
  assert.equal(getPrayerSLModifiers({id:'priest',extensions:{v5:{divineEffects:[restored]}}}).ok,true);
  const invalid=structuredClone(raw);invalid.state.combat.participants[0].extensions.v5.divineEffects[0].amount=0;
  const untrusted=normalizeRemoteDocument(invalid).state.combat.participants[0].extensions.v5.divineEffects[0];
  assert.equal(Object.hasOwn(untrusted.roundAnchor,'sceneId'),false,'une preuve invalide ne doit pas obtenir de réparation canonique');
});
