/** Modificateurs magiques d'un Test (couches, incidents) (ARCH-03) : module feuille, sorti pour casser un cycle d'imports. */
import { combineEffects, targetAppliesToTest } from './effect-engine.js';
import { fold } from './v5-magic-talent-rank.js';
import { unsuppressedSpellEffects } from './v5-spell-effects-active.js';
/**
 * Une clé de Test d'effet magique vise-t-elle ce Test ? Table unique du moteur (`targetAppliesToTest`, effect-engine.js) :
 * compétence et spécialité repliées, clé sans spécialité = toutes les spécialités, « Tous les Tests » pour tous, `carac:x` pour
 * tout Test lié à la caractéristique, « … adverse » seulement sur le Test de l'opposant (`scope:'opponent'`).
 * Une clé vide ou illisible ne vise aucun Test.
 */
export function testKeyApplies(key,skill,context={},scope='self'){
 try{return targetAppliesToTest(key,{skill,carac:context?.carac,skillContext:context?.skillContext,scope});}catch{return false;}
}
const CARAC_LABELS={cc:'Capacité de Combat',ct:'Capacité de Tir',f:'Force',e:'Endurance',i:'Initiative',ag:'Agilité',dex:'Dextérité',int:'Intelligence',fm:'Force Mentale',soc:'Sociabilité'};
const MAGIC_TEST_GROUP='magic-test';
const hasTestLayer=v5=>[...(Array.isArray(v5?.spellEffects)?v5.spellEffects:[]),...(Array.isArray(v5?.divineEffects)?v5.divineEffects:[])].some(e=>e&&typeof e.testModifiers==='object'&&e.testModifiers);
/**
 * U8 lot L3 · adaptateur couches → effets portés du moteur (`combineEffects`). Une couche de sort (`spellEffects`, sans les couches
 * supprimées) ou de prière (`divineEffects`) donne un effet `modifySL` par clé de `testModifiers` non nulle, porté par
 * `{ kind:'spell'|'prayer', sourceId, layerId }` : la couche est la source (Q13 du MJ, ses clés s'additionnent), le cumul dans une
 * famille suit `bestBonusWorstPenalty` (R3 p. 235 ; prières : Q10 du MJ), les familles se somment (Q2). `casterLileathRank` du
 * lanceur → `extraBonusSources` (HEPG p. 83, D-06) ; `stackable` / `isStackable` → exception cumulée. Le format stocké ne change pas.
 */
export function layerTestEffects(v5={}){
 const entries=[];
 const read=(kind,layers)=>{for(const [index,layer] of layers.entries()){
  if(!layer||typeof layer!=='object'||!layer.testModifiers||typeof layer.testModifiers!=='object')continue;
  const layerId=`${kind}:${index}:${layer.id??''}`,rank=Math.max(0,Math.floor(Number(layer.casterLileathRank)||0));
  const bearer={kind,sourceId:String(layer.spellId||layer.prayerId||layer.id||layerId),layerId,...(layer.casterId!=null&&layer.casterId!==''?{casterId:String(layer.casterId)}:{}),...(rank?{extraBonusSources:rank}:{})};
  const stackable=layer.stackable===true||layer.isStackable===true;
  for(const [key,raw] of Object.entries(layer.testModifiers)){
   const amount=Number(raw);
   if(!Number.isFinite(amount)||amount===0||typeof key!=='string'||!key.trim())continue;
   entries.push({bearer,effect:{op:'modifySL',amount,target:key,stack:'bestBonusWorstPenalty',stackGroup:MAGIC_TEST_GROUP,...(stackable?{stackable:true}:{})},key});
  }
 }};
 read('spell',unsuppressedSpellEffects(Array.isArray(v5?.spellEffects)?v5.spellEffects:[]));
 read('prayer',Array.isArray(v5?.divineEffects)?v5.divineEffects:[]);
 return entries;
}
/**
 * Effets de Test retenus pour UN Test résolu : couches (adaptateur ci-dessus) et, si fournies, lignes de talents déjà cumulées par
 * leur moteur (`talentRows`, schéma 2). Le tout passe par `combineEffects` et sa table entre familles (R1 talent + sort/prière).
 * `test = { skill, carac?, skillContext?, scope? }` ; `scope:'opponent'` lit les clés « … adverse » du porteur.
 * Retourne `{ layerRows:[{key,amount}], talentRows, signals, unresolved }` ; une paire de familles non arbitrée (CA5) n'est
 * jamais additionnée : ses montants sont retirés et un message `unresolved` la nomme.
 */
export function collectTestEffects(actor,test={},{talentRows=[],applies=null}={}){
 const v5=actor?.extensions?.v5||{};
 // `applies(key)` : sélection des clés propre à l'appelant (table de clés d'un moteur qui n'est pas celle des compétences) ; les clés
 // retenues visent alors toutes le même Test et forment un seul groupe par famille.
 const layers=typeof applies==='function'?layerTestEffects(v5).filter(entry=>applies(entry.key)).map(({effect:{target,...effect},...entry})=>({...entry,effect})):layerTestEffects(v5);
 // Une ligne de talent sans montant chiffré n'entre pas dans le cumul : elle est rendue telle quelle, à sa place.
 const talents=talentRows.map((row,index)=>Number.isFinite(row?.amount)?{bearer:{kind:'talent',sourceId:String(row.id||'talent:'+index)},effect:{op:'modifySL',amount:row.amount,stack:'add',stackGroup:'talent:'+index},row}:{row,passThrough:true});
 const combined=combineEffects([...layers,...talents.filter(entry=>!entry.passThrough)],typeof applies==='function'?{}:{test});
 const applied=combined.groups.filter(group=>group.status==='applied');
 const totals=new Map();
 for(const group of applied.filter(group=>group.kind!=='talent'))for(const entry of group.kept)totals.set(entry.key,(totals.get(entry.key)||0)+entry.effect.amount);
 const keptTalents=new Set(applied.filter(group=>group.kind==='talent').flatMap(group=>group.kept));
 return {
  layerRows:[...totals].filter(([,amount])=>amount!==0).map(([key,amount])=>({key,amount})),
  talentRows:talents.filter(entry=>entry.passThrough||keptTalents.has(entry)).map(entry=>entry.row),
  signals:combined.signals,
  unresolved:combined.signals.map(signal=>`Cumul non arbitré entre ${signal.kinds.join(' et ')} (${signal.op}) : à trancher par le MJ avant le Test.`)
 };
}
/**
 * Modificateurs d'un Test réunis par le moteur (U8 L3, lu par `buildCombatTest`) : couches magiques (`magic`, cumul sur les clés qui
 * visent CE Test, incidents compris), lignes de talents (`talents` : `talentRows` passées par la table entre familles, R1) et
 * messages de cumul non arbitré (`unresolved`). Sans couche, les modificateurs par clé du porteur sont lus tels quels.
 */
export function magicTestModifiers(actor,skill,context={},{talentRows=[],applies=null}={}){
 const name=fold(skill);const v5=actor?.extensions?.v5 || {};
 // `applies(key)` (Q6 T1) : table de clés propre au Test (Dissipation : compétence + clé `Dissipation`), couches et repli compris.
 const selector=typeof applies==='function'?applies:null;
 const collected=collectTestEffects(actor,{skill,carac:context?.carac,skillContext:context?.skillContext},{talentRows,applies:selector});
 const rows=hasTestLayer(v5)?collected.layerRows.map(row=>[row.key,row.amount]):Object.entries(v5.testModifiers || {}).filter(([key])=>selector?selector(key):testKeyApplies(key,skill,context));
 const magic=rows.map(([key,amount])=>({id:'spell-skill:'+key,label:'Effet magique : '+(/^carac:/i.test(key)?'Tests de '+(CARAC_LABELS[fold(key.slice(6))]||key.slice(6)):key),amount}));
 for(const [index,effect] of (v5.miscastEffects || []).entries())if(effect.type==='penalty' && [...(effect.targetSkills || []),effect.targetSkillCategory].filter(Boolean).some(s=>name.includes(fold(s)) || name.includes('langue')&&s==='Incantation'))magic.push({id:'miscast:'+index,label:effect.name,amount:effect.slModifier});
 return {magic,talents:collected.talentRows,unresolved:collected.unresolved};
}
/** Modificateurs magiques d'un Test (couches et incidents), voir `magicTestModifiers`. */
export function magicSkillModifiers(actor,skill,context={}){return magicTestModifiers(actor,skill,context).magic;}
/**
 * Clés « … adverse » du porteur d'un effet (Perception adverse…) : elles s'appliquent au Test de qui s'y oppose (« Mêlée adverse »
 * vise un Test de Corps à corps). Avec des couches, cumul par Test résolu comme les autres clés (R3 p. 235 ; Q10, Q13 du MJ).
 */
export function magicAdverseModifiers(holder,skill){
 const v5=holder?.extensions?.v5||{};
 const rows=hasTestLayer(v5)?collectTestEffects(holder,{skill,scope:'opponent'}).layerRows.map(row=>[row.key,row.amount]):Object.entries(v5.testModifiers || {}).filter(([key])=>testKeyApplies(key,skill,{},'opponent'));
 return rows.map(([key,amount])=>({id:'spell-adverse:'+key,label:'Effet magique adverse : '+key,amount}));
}
