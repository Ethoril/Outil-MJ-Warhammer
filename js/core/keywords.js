import talentQualityRegistry from '../data/v5-quality-talent-contracts.json' with {type:'json'};
import contracts from '../data/keyword-engine-contracts.json' with { type: 'json' };
import { ENGINES } from '../data/keyword-engines.js';
import { referenceSlug, parseReferenceCSV, parseKeywordCSV, getReferenceCatalogue, getReferenceStatus, loadInitialReferences, refreshReferences, resolveKeyword } from './reference-catalog.js';
export const slugify=referenceSlug;
const display=word=>({...word,slug:word.id,hasRating:Boolean(word.parameter)});
/** Supports the historic two-column format for imports; network refresh requires the explicit contract. */
export function parseCSV(text){const table=parseReferenceCSV(text);if(table[0]?.some(h=>h==='Identifiant'))return parseKeywordCSV(text).map(display);const [headers,...rows]=table;if(!headers||headers.length<2)return [];return rows.filter(row=>row[0]?.trim()).map(row=>({name:row[0].trim(),slug:slugify(row[0]),hasRating:/\bx\b/iu.test(row[0]),effect:row[1]||''}));}
export const loadInitialKeywords=()=>{loadInitialReferences();return getKeywordList();};
export async function fetchKeywords(forceRefresh=false){await refreshReferences({forceRefresh});return getKeywordList();}
export const getKeywordList=()=>getReferenceCatalogue().keywords.map(display);
export const getKeywordBySlug=value=>{const word=resolveKeyword(value);return word?display(word):null;};
export const getKeywordsStatus=()=>getReferenceStatus();
// These V5 weapon clauses are handled by complete resolution/store flows but
// deliberately stay outside the legacy V4 ENGINES registry. This declaration
// reports coverage only; it does not apply any mechanical effect.
const RESOLUTION_QUALITY_COVERAGE=Object.freeze({
 immobilisante:Object.freeze({engine:'v5-entanglement',evidence:'tests/f2-d-weapon-qualities.test.js: F2-D resolution Immobilisante locks and releases the linked weapon'}),
 pistolet:Object.freeze({engine:'v5-pistol-contact',evidence:'tests/f2-d-weapon-qualities.test.js: F2-D resolution Pistolet opposed with Melee'}),
 'piege-lame':Object.freeze({engine:'v5-trap-blade',evidence:'tests/f2-d-weapon-qualities.test.js: F2-D Store Trap Blade disposition and recovery'}),
 'a-enroulement':Object.freeze({engine:'v5-wrap-defense',evidence:'tests/f2-d-weapon-qualities.test.js: F2-D resolution Wrap applies the opposing Melee penalty'}),
 bouclier:Object.freeze({engine:'v5-shield',evidence:'tests/f2-d-weapon-qualities.test.js: F2-D shield defense, attack suspension, and hand constraints'}),
 taille:Object.freeze({engine:'v5-armor-wear',evidence:'tests/f2-d-weapon-qualities.test.js: F2-D Store persists armor and shield wear'}),
 parade:Object.freeze({engine:'v5-parry',evidence:'tests/f2-d-weapon-qualities.test.js: F2-D resolution off-hand defense and second attack'}),
 'a-repetition':Object.freeze({engine:'v5-repeater-magazine',evidence:'F-L06-1057 covered; durable reload state consumes shots in resolution'}),
 recharge:Object.freeze({engine:'v5-reload-progress',evidence:'F-L06-1064 covered; Store persists reload progress and restores the magazine'})
});
export function keywordMechanicalStatus(value){
 const raw=typeof value==='string'?value:value?.id;const id=ENGINES[raw]?.aliasOf??resolveKeyword(raw)?.id??raw;
 const word=resolveKeyword(id),baseline=contracts.entries.find(w=>w.id===id)||talentQualityRegistry.qualityContracts.find(w=>w.id===id);
 const protectionEngine = ({perforante:'ignore-two-armour',flexible:'armour-layers',partielle:'conditional-location-armour','points-faibles':'conditional-critical-armour',impenetrable:'odd-hit-critical-immunity',protectrice:'contextual-shield-armour'})[id];
 const declaration=RESOLUTION_QUALITY_COVERAGE[id];
 const engine=ENGINES[id] || (declaration ? {tier:1,engine:declaration.engine,scope:'resolution-quality'} : protectionEngine ? {tier:1,engine:protectionEngine,scope:'protection'} : null);if(!engine)return {id,status:'manual',reason:'effet-non-automatise',word};
 if(!word||!baseline||word.effect!==baseline.effect||word.edition!==baseline.edition)return {id,status:'manual',reason:'version-effet-non-couverte',word};
 return {id,status:'covered',word,engine,effectVersion:`${contracts.sourceVersion}:${id}`,...(declaration?{coverageEvidence:declaration.evidence}:{}),limitations:id==='empaleuse'?['Extraction de balle : compétence de chirurgien confirmée par le MJ']:id==='inoffensive'?['Deux jets de gravité requis pour le critique']:[]};
}
