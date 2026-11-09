/** Acquisitions résolues et descriptions publiques épinglées ; jamais d'activation par lecture de prose. */
import pins from '../data/v5-magic-talent-sources.json' with { type: 'json' };
import { acquiredV5Talents } from './v5-talents.js';
import { getReferenceCatalogue } from './reference-catalog.js';
import { previewV5Test, selectV5Test, normalizeV5Roll } from './v5-roll.js';
import { getBurnoutStatus, consumeCadaiRune, prepareCadaiRerolls } from './v5-magic-high.js';
import { applyPrayerSLCaps,getPrayerSLModifiers } from './v5-divine-prayer-caps.js';
import { mishapSeverity, groundCastModifier, slannAboard } from './slann.js';
// Cycle d'import connu (v5-magic-effects lit magicTalentRank) : seules des fonctions, appelées après le chargement.
import { unsuppressedSpellEffects } from './v5-magic-effects.js';
import { combineEffects, targetAppliesToTest } from './effect-engine.js';
// Cycle d'import connu (v5-test-modifiers lit magicTestModifiers) : seules des fonctions, appelées après le chargement.
import { resolveV5TestModifiers, finalizeV5TestModifiers, conditionLevels, previewV5SecondaryTest } from './v5-test-modifiers.js';

const ruleError=message=>Object.assign(new Error(message),{userFacing:true});
/** Test de chaque Action magique (Q6 T1) : compétence au catalogue et Caractéristique ; la Dissipation est un Test de Langue (Magick). */
const MAGIC_TESTS={
 casting:{skill:'Langue (Magick)',skillId:'skill-4c_61_6e_67_75_65-4d_61_67_69_63_6b',characteristic:'Int'},
 dispel:{skill:'Langue (Magick)',skillId:'skill-4c_61_6e_67_75_65-4d_61_67_69_63_6b',characteristic:'Int'},
 channelling:{skill:'Focalisation',skillId:'skill-46_6f_63_61_6c_69_73_61_74_69_6f_6e-base',characteristic:'FM'},
 pause:{skill:'Focalisation',skillId:'skill-46_6f_63_61_6c_69_73_61_74_69_6f_6e-base',characteristic:'FM'},
 interruption:{skill:'Calme',skillId:'skill-43_61_6c_6d_65-base',characteristic:'FM'}
};
/** Variante de la clé `Dissipation` propre au mode (lue jusqu'ici en brut par v5-magic-dispel.js). */
const DISPEL_MODE_KEYS={opposed:'Dissipation (Incantation opposée)',persistent:'Dissipation (Sort persistant étendu)'};
export function magicTalentRank(actor, id, specialization = null) {
  const key = id.startsWith('talent-') ? id : 'talent-'+id;
  const lostIds = { 'sens de la magie': 'talent-magical-sense', 'perception de la magie': 'talent-magical-sense', 'magical sense': 'talent-magical-sense', 'seconde vue': 'talent-second-sight', 'second sight': 'talent-second-sight' };
  if ((actor?.extensions?.v5?.miscastEffects || []).some(effect =>
    [...(effect.talentsLost || []), effect.talentLost].filter(Boolean).some(name => (lostIds[fold(name).trim()] || name) === key))) return 0;
  const source = getReferenceCatalogue().talents.find(t => t.id === key);
  if (!source || source.description !== pins.sourceDescriptions[key]) return 0;
  return Math.max(0, ...acquiredV5Talents(actor).filter(t => t.talentId === key && (!specialization || t.specialization === specialization)).map(t=>t.rank));
}
/**
 * Talent employé pour lancer un sort (V5 p. 239, Drain de puissance) : Magie des Arcanes du Domaine, Haute Magie ; null pour un sort
 * mineur ou un contexte sans sort. `lore` vaut null si le Domaine est ambigu (sort d'Arcane sans Domaine unique chez le lanceur).
 */
const LORE_PATTERNS = { fire: /feu|fire|aqshy/, light: /lumiere|light|hysh/, beasts: /bete|beast|ghur/, death: /mort|death|shyish/, heavens: /cieux|heaven|azyr/, life: /vie|life|ghyran/, metal: /metal|chamon/, shadow: /ombre|shadow|ulgu/ };
export function castingTalent(actor, spell, options = {}) {
  const domain = spell?.domain;
  if (!spell || spell.isPetty === true || domain === 'petty' || domain === 'elven-petty' || spell.type === 'petty') return null;
  if (domain === 'high' || spell.type === 'high') return { id: 'talent-high-magic', lore: null };
  const known = [...new Set((actor?.talents || []).filter(t => t.status === 'resolved' && t.id === 'talent-arcane-magic').map(t => Object.keys(LORE_PATTERNS).find(key => LORE_PATTERNS[key].test(fold(t.specialization)))).filter(Boolean))];
  if (LORE_PATTERNS[domain]) return { id: 'talent-arcane-magic', lore: domain };
  if (domain === 'elven-arcane') {
    const winds = [].concat(spell.wind || []).flatMap(w => String(w).split(',')).map(w => windIds[w.trim()]).filter(Boolean);
    return { id: 'talent-arcane-magic', lore: winds.find(w => known.includes(w)) || winds[0] || null };
  }
  // Sort d'Arcane générique : le Domaine choisi pour le lancement désigne le Talent employé (lanceur à plusieurs Domaines).
  const chosen = Object.keys(LORE_PATTERNS).find(key => LORE_PATTERNS[key].test(fold(options?.chosenLore)));
  return { id: 'talent-arcane-magic', lore: chosen || (known.length === 1 ? known[0] : null) };
}
function isTalentDrained(actor, spell, options = {}) {
  const used = castingTalent(actor, spell, options);
  return Boolean(used) && (actor?.extensions?.v5?.miscastEffects || []).some(e => e.type === 'talent-disabled' && e.talent?.id === used.id && (!e.talent.lore || !used.lore || e.talent.lore === used.lore));
}
export const magicTurnKey = (actor, options={}) => options.turnKey ?? `${options.round ?? 1}:${options.turn ?? 1}`;
export function assertMagicTurn(actor, options={}) {
  if (actor?.extensions?.v5?.warWizardTurn === magicTurnKey(actor, options)) throw ruleError('Mage de guerre : aucun autre Test d’incantation ou de Focalisation ce Tour.');
}
export function prepareMiscastOptions(actor, options = {}) {
  const blocked = actor?.extensions?.v5?.specialStates?.forbidMitigation;
  return { ...options, instinctiveDiction: !blocked && Boolean(options.instinctiveDiction) && magicTalentRank(actor, 'instinctive-diction') > 0,
    attunementRank: blocked ? 0 : magicTalentRank(actor, 'aethyric-attunement'),
    // Maître des incidents (Slann) : un incident Majeur devient Mineur, sauf lancement à travers un autre mage (`viaTelepathy`).
    slannMishapMaster: mishapSeverity(actor, 'major', { viaTelepathy: options.viaTelepathy === true }).lowered };
}
export function prepareMagicOptions(actor, kind, options={}, spell = null) {
  if (['casting','channelling'].includes(kind)) assertMagicTurn(actor, options);
  if(getBurnoutStatus(actor).active && ['casting','channelling'].includes(kind))throw ruleError('Épuisement magique : Focalisation et incantation interdites.');
  const flags=actor.extensions?.v5?.specialStates;
  if(kind==='casting' && actor.extensions?.v5?.suppressedSpellIds?.includes(spell?.id))throw ruleError('Impasse : ce sort précis est temporairement inutilisable.');
  const recastingAura=(actor.extensions?.v5?.spellEffects || []).some(e=>e.specialState?.cannotCastOther && e.spellId===spell?.id);
  if (['casting','channelling','dispel'].includes(kind) && flags?.cannotSpeak || kind==='channelling' && flags?.cannotChannel || kind==='casting' && (flags?.cannotCast || flags?.cannotCastOther && !recastingAura || flags?.blockedSkillFamilies?.includes('language')) || kind==='dispel' && flags?.cannotDispel) throw ruleError('Effet actif : parole ou Test magique interdit.');
  const next = prepareMiscastOptions(actor, options);
  next.forceMajorMiscast=Boolean(actor.extensions?.v5?.specialStates?.forceMajorMiscast && (options.roll===100 || options.roll%11===0));
  if(actor.extensions?.v5?.specialStates?.forbidMitigation){next.instinctiveDiction=false;next.attunementRank=0;if(options.useCadaiRune && options.cadaiPurpose==='miscast')throw ruleError('La Fortune est Capricieuse interdit l’atténuation des incidents.');}
  Object.assign(next, prepareCadaiRerolls(actor, kind, options, spell));
  if (kind === 'casting' && isTalentDrained(actor, spell, options)) throw ruleError('Drain de puissance : le Talent employé pour lancer ce sort est inutilisable.');
  if(kind==='casting' && (actor.extensions?.v5?.miscastEffects || []).some(e=>e.type==='restriction' && (e.restrictions || []).some(r=>/langue|verbal/i.test(r))))throw ruleError('Incident magique : utilisation de Langue (Magick) interdite pendant la durée indiquée.');
  const assistant=options.assistant;
  // Q6 T1 (MJ 06/11 Q6, Q19) : États, talents et couches de sorts et de prières par le calcul commun du combat
  // (`resolveV5TestModifiers`, v5-test-modifiers.js), mêmes exceptions : Endurance de l'anachorète, Revigorer, Clarté d'esprit,
  // talents `ignoreConditionPenalty`, Brisé, Enchevêtré, Désavantages d'États. `options.conditionContext` porte les réponses du MJ
  // (involvesMovement, runningOrHiding, reliesOnSight, requiresSight, usesFellowship, conditionPenaltyMode) et le contexte des
  // talents ; une réponse manquante reste une question (`next.conditionNeeds`). Dissipation : Test de Langue (Magick) qui lit aussi
  // la clé `Dissipation` des couches (et sa variante du mode, `options.dispelMode`).
  const test=MAGIC_TESTS[kind]||MAGIC_TESTS.channelling;
  const conditionContext=options.conditionContext||{};
  // Œil de la tempête (rang 2) : Exténué sans pénalité à l'incantation, à la Focalisation et à sa pause.
  const ignoreFatigue=['casting','channelling','pause'].includes(kind) && Number(activeMagicTalent(actor,'eye-of-the-storm')?.magicTalentRank)>=2;
  const dispelKeys=kind==='dispel'?new Set(['dissipation',fold(DISPEL_MODE_KEYS[options.dispelMode]||DISPEL_MODE_KEYS.opposed)]):null;
  // MJ 09/11 CA14 : la pause et l'interruption de Focalisation demandent d'agir (Surpris les bloque) ; Inconscient bloque tout Test.
  const common=resolveV5TestModifiers(actor,{characteristic:test.characteristic,skill:test.skill,skillCharacteristic:test.characteristic,kind:'test',ignoreFatigue,isAction:['pause','interruption'].includes(kind),
    action:{type:'test',attr:test.characteristic,label:test.skill,base:0,qualities:[],extensions:{fiche:{skillId:test.skillId}}},
    ...(dispelKeys?{appliesKey:key=>dispelKeys.has(fold(key).trim())||testKeyApplies(key,test.skill,{carac:test.characteristic})}:{})},{...conditionContext,skillId:test.skillId});
  const {conditions,layers}=common.parts;
  const slModifiers=[...layers.magic,...(options.slModifiers || []).map(row=>({...row})),...(Number(options.yenluiPenalty)<0 ? [{id:'yenlui',label:'Yenlui',amount:Number(options.yenluiPenalty)}]:[])], advantageSources=[...(options.advantageSources || [])];
  if (['casting','channelling'].includes(kind) && assistant && options.assistantLinked === true && assistant.id !== actor.id) {
    if (magicTalentRank(assistant,'magical-assistant')) slModifiers.push({id:'magical-assistant',label:'Assistant magique',amount:2});
    else if (magicTalentRank(assistant,'animal-assistant')) advantageSources.push({id:'animal-assistant',label:'Assistant animal'});
  }
  const levels=conditionLevels(actor);
  if(['casting','channelling','dispel'].includes(kind) && (levels.has('inconscient') || levels.has('surpris')))throw ruleError('Inconscient ou Surpris : Test magique indisponible.');
  // MJ 09/11 CA17 : la pause de Focalisation est un Test mental pour Clarté d'esprit (V5 p. 251).
  const mental=['casting','channelling','dispel','pause','interruption'].includes(kind);
  if(actor.extensions?.v5?.specialStates?.clarityOfThought && mental)for(let i=slModifiers.length-1;i>=0;i--)if(slModifiers[i].amount<0 && /psychology|mental.?mutation|mutation.?mental/i.test(slModifiers[i].id))slModifiers.splice(i,1);
  if(common.restrictions.length)throw ruleError(common.restrictions.join(' '));
  if(common.penalty)slModifiers.push({id:'magic-condition-penalty',label:'Pénalité d’État',amount:-common.penalty});
  slModifiers.push(...layers.talents);
  // MJ 09/11 CA13 : séquelles durables (lignes `durable`, hors plafonds) ; la Caractéristique perdue pèse sur le score (`scoreDelta`).
  slModifiers.push(...common.slModifiers.filter(row=>row.durable));
  advantageSources.push(...common.parts.talents.advantageSources,...common.advantageSources.filter(row=>row.durable));
  next.disadvantageSources=[...(options.disadvantageSources || []),...conditions.disadvantageRows,...common.parts.talents.disadvantageSources,...common.disadvantageSources.filter(row=>row.durable)];
  next.scoreDelta=common.scoreDelta||0;
  next.conditionNeeds=common.needsInput.map(row=>row.label);
  // MJ 09/11 CA22 : questions avec leur champ (circonstances de séquelle `sequela…` comprises), pour le panneau.
  next.conditionNeedRows=common.needsInput.map(row=>({...row}));
  // MJ 09/11 CA29 : au lancer, à la Focalisation (pause et interruption comprises) et à la Dissipation, une question de séquelle sans
  // réponse empêche le jet, comme partout (CA22). Les questions d'États gardent leur règle propre à la magie (sans réponse, l'État ne
  // pèse pas). Deux yeux perdus : la question de la vue vient de la séquelle. Sans d100, l'aperçu reste possible (questions à afficher).
  const sightBySequela=common.parts.sequelae.unresolved.includes('Séquelle : préciser si le Test est influencé par la vue.');
  next.sequelaNeedRows=common.needsInput.filter(row=>/^sequela/.test(row.field || '') || sightBySequela && row.field==='reliesOnSight').map(row=>({...row}));
  if(next.sequelaNeedRows.length && options.roll!=null)throw Object.assign(ruleError('Séquelle : répondre avant le jet ('+next.sequelaNeedRows.map(row=>row.label).join(' ; ')+').'),{needsInput:next.sequelaNeedRows});
  next.conditionRows=common.rows;next.testUnresolved=common.unresolved;next.testModifiers=common;next.dispelKeyRows=dispelKeys?layers.magic.filter(row=>dispelKeys.has(fold(row.id.replace(/^spell-skill:/,'')).trim())).length:0;
  if(['casting','channelling'].includes(kind)){const ground=groundCastModifier(actor,{aboard:slannAboard(actor)});if(ground.available && ground.modifier)slModifiers.push({id:'slann-ground',label:'Slann au sol',amount:ground.modifier});}
  if(Number(activeMagicTalent(actor,'sanctuary-of-the-mind')?.magicTalentRank)>=3)for(const modifier of slModifiers)if(modifier.id==='yenlui' && modifier.amount<0)modifier.amount=0;
  const lore=String(spell?.wind || spell?.type || options.wind || options.lore || '').toLowerCase();
  for(const effect of actor.extensions?.v5?.spellEffects || []) if(effect.loreTestBonus && ['casting','channelling'].includes(kind) && (lore===effect.loreTestBonus.lore || effect.loreTestBonus.lore==='fire' && /aqshy|feu/.test(lore))) slModifiers.push({id:'spell-lore-bonus',label:effect.spellName,amount:effect.loreTestBonus.amount});
  // Plafonds de fin de calcul (Distrait, Esprit fort V5 p. 127) sur la liste de ce Test, comme au combat.
  finalizeV5TestModifiers(actor,common,{slModifiers,advantageSources,disadvantageSources:next.disadvantageSources});
  next.slModifiers=slModifiers;next.advantageSources=advantageSources;
  return next;
}
export function applyMagicAttempt(actor, preview, options={}) {
  let next=structuredClone(actor);
  const reaction = preview.actionType === 'dispel-casting';
  const cast = reaction ? preview : preview.castingPreview || preview;
  const receipts = cast.cadaiReceipts?.length ? cast.cadaiReceipts : cast.cadaiReceipt ? [cast.cadaiReceipt] : [];
  if (new Set(receipts.map(r => r.purpose)).size !== receipts.length) throw ruleError('Une rune des Cadai au maximum pour le même jet.');
  for (const receipt of receipts) {
    const used=consumeCadaiRune(next,{purpose:receipt.purpose});
    if(!used.success) throw ruleError(used.reason);
    next=used.participant;
  }
  next.extensions ??={};next.extensions.v5 ??={};
  if (!reaction) next.extensions.v5.magicAttemptTurn=magicTurnKey(next,{...options,turnKey:preview.turnKey ?? preview.castingPreview?.turnKey ?? options.turnKey});
  if(options.warWizard){
    if(!magicTalentRank(next,'war-wizard') || !next.extensions.v5.hasMomentum)throw ruleError('Mage de guerre requiert le talent et l’Élan.');
    next.extensions.v5.hasMomentum=false;next.extensions.v5.warWizardTurn=magicTurnKey(next,options);
  }
  return next;
}

const fold=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const characteristic=(values,key)=>values?.[Object.keys(values || {}).find(k=>k.toLowerCase()===String(key).toLowerCase())];
export function baseCharacteristicScore(actor,carac){return Number(characteristic(actor?.extensions?.v5?.baseCaracs || actor?.baseCaracs,carac) ?? characteristic(actor?.caracs,carac) ?? 0);}
export function effectiveSkillScore(actor,score,carac){
 const base=characteristic(actor?.extensions?.v5?.baseCaracs || actor?.baseCaracs,carac);
 return Math.max(0,Number(score) + (base!=null && Number.isFinite(Number(base)) ? Number(characteristic(actor?.caracs,carac) || 0)-Number(base) : 0));
}
export function activeMagicTalent(actor,id){return (actor?.extensions?.v5?.spellEffects || []).find(e=>e.magicTalentId==='talent-'+id);}
/**
 * Une clé de Test d'effet magique vise-t-elle ce Test ? Table unique du moteur (`targetAppliesToTest`, effect-engine.js) :
 * compétence et spécialité repliées, clé sans spécialité = toutes les spécialités, « Tous les Tests » pour tous, `carac:x` pour
 * tout Test lié à la caractéristique, « … adverse » seulement sur le Test de l'opposant (`scope:'opponent'`).
 * Une clé vide ou illisible ne vise aucun Test.
 */
function testKeyApplies(key,skill,context={},scope='self'){
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
export function previewMagicMeditation(actor,options={}){
 const id=options.talentId,rank=magicTalentRank(actor,id);
 if(!rank || !['talent-eye-of-the-storm','talent-sanctuary-of-the-mind','talent-mind-over-body','talent-cadai-meditation'].includes(id))throw ruleError('Talent de méditation validé requis.');
 const cadai=id==='talent-cadai-meditation';
 if(Number(options.minutes)<(cadai?60:20))throw ruleError(cadai?'Au moins une heure de méditation requise.':'Au moins 20 minutes de contemplation requises.');
 const skill=(actor.skills || []).find(s=>fold(s.name || s.nom)==='priere');
 const score=effectiveSkillScore(actor,skill?.total ?? skill?.value ?? skill?.score ?? baseCharacteristicScore(actor,'FM'),'FM');
 const prayerSkill=Boolean(skill&&(skill.id==='skill-50_72_69_e8_72_65-base'||fold(skill.name||skill.nom)==='priere'));
 const prayerModifiers=prayerSkill?getPrayerSLModifiers(actor,options.prayerSLContext||{}):{ok:true,status:'unchanged',modifiers:[],needsInput:[]};
 if(!prayerModifiers.ok)return {ready:false,success:false,id,error:'Le malus de Prière du Courroux est invalide ou ne peut pas être daté.',needsInput:prayerModifiers.needsInput};
 // Q6 T3 : Test de Prière (FM) par le calcul commun : États, couches, talents, séquelles ; Inconscient le bloque (CA14). Une
 // précision d'État manquante (`options.conditionContext`) laisse le Test non résolu (CA8). Accessible et Courroux avant les plafonds.
 const secondary=previewV5SecondaryTest(actor,{score,roll:normalizeV5Roll(options.roll),test:{characteristic:'FM',skill:'Prière'},context:options.conditionContext||{},
  slModifiers:[...(cadai?[{id:'meditation-difficulty',label:'Accessible',amount:2}]:[]),...prayerModifiers.modifiers]});
 if(!secondary.ready)return {ready:false,success:false,id,error:secondary.needsInput.map(row=>row.label).join(' '),needsInput:secondary.needsInput,unresolved:secondary.unresolved};
 let test=selectV5Test(secondary.preview,secondary.optionId);
 const rawSL=test.sl;
 const prayerSL=prayerSkill?applyPrayerSLCaps(actor,test):{ok:true,status:'unchanged',test,caps:[],needsInput:[]};
 if(!prayerSL.ok)return {ready:false,success:false,test,id,error:'La sanction calendaire de Prière est invalide.' ,needsInput:prayerSL.needsInput};
 test=prayerSL.test;
 const prayerSLAdjustment=prayerSL.status==='applied'?{rawSL,effectiveSL:test.sl,caps:prayerSL.caps}:null;
 if(!test.success)return {ready:true,success:false,test,id,prayerSLAdjustment};
 if(cadai)return {ready:true,success:true,test,id,yenlui:'Lumineux',prayerSLAdjustment};
 const dice=options.durationRolls;
 if(!Array.isArray(dice)||dice.length!==1+Math.max(0,test.sl)||dice.some(n=>!Number.isInteger(n)||n<1||n>10))return {ready:false,success:true,test,id,prayerSLAdjustment,error:'Saisir '+(1+Math.max(0,test.sl))+' résultats de d10 pour la durée.'};
 const hours=dice.reduce((a,b)=>a+b,0);
 return {ready:true,success:true,test,id,durationRolls:dice,prayerSLAdjustment,effect:{spellId:id,spellName:options.name || id,magicTalentId:id,magicTalentRank:rank,duration:hours+' heures',testModifiers:id==='talent-sanctuary-of-the-mind'&&rank>=2?{'Recherche':1}:undefined,traits:id==='talent-mind-over-body'?['Insensible à la douleur',...(rank>=2?['Vision mentale','Immunité à Aveuglé']:[])]:undefined}};
}

const windIds={Aqshy:'fire',Azyr:'heavens',Chamon:'metal',Ghur:'beasts',Ghyran:'life',Hysh:'light',Shyish:'death',Ulgu:'shadow'};
export function suffusedCastingBonus(actor,spell,options={}){
 const wind=windIds[spell.wind] || windIds[spell.lore] || spell.wind || spell.lore;
 return (options.suffusedBy || []).some(row=>{
   const source=(options.participants || []).find(p=>p.id===row.id);
   return source && Number.isFinite(row.distance) && row.distance>=0 && row.distance<=8 && Object.entries(windIds).some(([spec,id])=>id===wind && magicTalentRank(source,'suffuse-with',spec));
 }) ? 1 : 0;
}
export function magicSkillReplacement(actor,skill,context={}){
 const wind=context.magicSuffusedWind;
 const substitutions={Aqshy:['force mentale','entrer en frenesie'],Azyr:['perception'],Chamon:['evaluation'],Ghur:['emprise sur les animaux','savoir (betes)'],Ghyran:['savoir (plantes)','savoir (animaux)','savoir (herbes)','soin aux animaux'],Hysh:['recherche'],Shyish:['intimidation'],Ulgu:['discretion']};
 if(wind==='Aqshy' && context.talentAction!=='frenzy')return null;
 if(!wind || !magicTalentRank(actor,'suffuse-with',wind) || !(substitutions[wind] || []).includes(fold(skill)))return null;
 const foc=(actor.skills || []).find(s=>/^focalisation(?:$|\s*\()/i.test(s.name || s.nom || '')&&!/haute|qhaysh/i.test(s.name || s.nom || ''));
 return {score:effectiveSkillScore(actor,foc?.total ?? foc?.value ?? foc?.score ?? baseCharacteristicScore(actor,'FM'),'FM'),wind};
}

export function magicalSenseReceipts(caster,participants,options={}){
 return participants.filter(p=>p.id!==caster.id && magicTalentRank(p,'magical-sense')).map(observer=>{
   const skill=(observer.skills || []).find(s=>fold(s.name || s.nom)==='perception');
   const range=effectiveSkillScore(observer,skill?.total ?? skill?.value ?? skill?.score ?? baseCharacteristicScore(observer,'I'),'I');
   const fact=options.senseFacts?.[observer.id];
   const detected=Number.isFinite(fact?.distance) ? fact.distance>=0 && fact.distance<=range : null;
   return {observerId:observer.id,range,detected,direction:detected?fact.direction || 'direction approximative à préciser':null,summary:detected===null?observer.name+' : Perception de la Magie, lancement détectable à '+range+' mètres (distance à préciser).':detected?observer.name+' détecte un lancement ; '+(fact.direction || 'direction approximative à préciser')+' ; magie non identifiée.':observer.name+' : lancement hors portée de Perception de la Magie.'};
 });
}
export function familiarSkillSupport(actor,assistant,skill,context={}){
 const name=fold(skill),result={modifiers:[],advantages:[]};
 if(!assistant || context.magicAssistantLinked!==true || assistant.id===actor.id)return result;
 const basic=/focalisation|langue.*magick/.test(name);
 if(magicTalentRank(assistant,'magical-assistant')&&(basic||/savoir.*magie/.test(name)||/recherche/.test(name)&&context.magicalNature===true))result.modifiers.push({id:'magical-assistant',label:'Assistant magique',amount:2});
 else if(magicTalentRank(assistant,'animal-assistant')&&(basic||/survie/.test(name)||/perception/.test(name)&&context.magicalNature===true))result.advantages.push({id:'animal-assistant',label:'Assistant animal'});
 return result;
}

export function enforceMagicTestRestrictions(actor,test,{magical=true}={}){
 const flags=actor?.extensions?.v5?.specialStates;
 if(!magical)return flags?.mundaneDoublesFail && (test.roll===100 || test.roll%11===0)?{...test,success:false,critical:false,sl:-Math.max(1,Math.abs(test.sl)),magicRestriction:'La Fortune est Capricieuse (+4 DR)'}:test;
 if(flags?.forceFumbleOnDoubles && (test.roll===100 || test.roll%11===0))return {...test,success:false,critical:false,fumble:true,sl:-Math.max(1,Math.abs(test.sl)),magicRestriction:'La Fortune est Capricieuse'};
 return flags?.forbidCrits ? {...test,critical:false}:test;
}
