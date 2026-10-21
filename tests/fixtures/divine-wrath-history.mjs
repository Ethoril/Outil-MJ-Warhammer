import history from './divine-wrath-historical.json' with {type:'json'};
import registry from '../../js/data/v5-divine-contracts.json' with {type:'json'};
import {validatePrayerSLCaps} from '../../js/core/v5-divine-prayer-caps.js';
const clone=structuredClone;
const identity=(row,kind)=>row.extensions?.ficheId||row.ficheSnapshot?.charId
 ? 'fiche:'+(row.extensions?.ficheId||row.ficheSnapshot.charId)
 : row.persistentCharacterId?'persistent:'+row.persistentCharacterId
 : kind==='persistent'?'persistent:'+row.id
 : row.extensions?.v5?.resourceCharacterId?'local:'+row.extensions.v5.resourceCharacterId:'instance:'+row.id;

/** Pose directe de données historiques capturées avant Q12, jamais un nouveau jet de Courroux. */
export function previewHistoricalWrath(state,{executionId='independent-wrath-1',roll=99,actorId='priest'}={}){
 const fixture=history.cases[roll];if(!fixture)throw Error('Jet historique non capturé : '+roll);
 const captured=JSON.parse(JSON.stringify(fixture).replaceAll('historical-wrath',executionId));
 const next=clone(state),actor=next.combat.participants.find(row=>row.id===actorId),clock=next.extensions.v5.gameClock;
 const cap=captured.cap,subjectKey=identity(actor);
 Object.assign(cap,{targetId:actorId,subjectKey,clockAnchor:{campaignSeconds:clock.campaignSeconds,clockRevision:clock.revision,lastEventId:clock.lastEvent?.id??null},
  deadline:{kind:'campaign-time',atSeconds:clock.campaignSeconds+cap.duration.seconds}});
 const rows=[...next.combat.participants,...(next.reserve||[]),...(next.activeScene?.participants||[]),
  ...(next.suspendedScenes||[]).flatMap(scene=>scene.participants||[])].map(row=>({row,kind:'instance'}));
 rows.push(...(next.persistentCharacters||[]).map(row=>({row,kind:'persistent'})));
 for(const {row,kind} of rows)if(identity(row,kind)===subjectKey){
  row.extensions??={};row.extensions.v5??={};row.extensions.v5.divineEffects??=[];row.extensions.v5.divineEffects.push(clone(cap));
 }
 const ally=next.combat.participants.find(row=>row.id==='ally');
 if(ally&&captured.allyLayers.length){ally.extensions??={};ally.extensions.v5??={};ally.extensions.v5.divineEffects=[...(ally.extensions.v5.divineEffects||[]),...captured.allyLayers];}
 const receipt=captured.receipt;receipt.actorId=actorId;
 receipt.wrathSanction.subjectKey=subjectKey;receipt.wrathSanction.targetId=actorId;receipt.wrathSanction.deadline=clone(cap.deadline);
 next.extensions.v5.divineExecutions=[...(next.extensions.v5.divineExecutions||[]),receipt];
 const checked=validatePrayerSLCaps(actor,{clock});
 return {ready:checked.ok,error:checked.needsInput.map(row=>row.message).join(' '),state:next,cap,receipt,
  wrathTableResult:clone(registry.wrathTable.find(row=>row.id==='wrath:6-10'))};
}
export async function applyHistoricalWrath(store,preview){
 if(!preview.ready)throw Error(preview.error);
 const result=await store.executeCommand('fixture-historical-wrath',()=>clone(preview.state));
 return {...result,ready:result.ok!==false,receipt:clone(preview.receipt)};
}
export async function imposeHistoricalWrath(store,options){
 const preview=previewHistoricalWrath(JSON.parse(store.getFullJSON()),options);
 const result=await applyHistoricalWrath(store,preview);return {preview,result,cap:preview.cap};
}
