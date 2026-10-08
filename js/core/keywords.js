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
export function keywordMechanicalStatus(value){
 const raw=typeof value==='string'?value:value?.id;const id=ENGINES[raw]?.aliasOf??resolveKeyword(raw)?.id??raw;
 const word=resolveKeyword(id),baseline=contracts.entries.find(w=>w.id===id);
 const protectionEngine = ({flexible:'armour-layers',partielle:'conditional-location-armour','points-faibles':'conditional-critical-armour',impenetrable:'odd-hit-critical-immunity',protectrice:'contextual-shield-armour'})[id];
 const engine=ENGINES[id] || (protectionEngine ? {tier:1,engine:protectionEngine,scope:'protection'} : null);if(!engine)return {id,status:'manual',reason:'effet-non-automatise',word};
 if(!word||!baseline||word.effect!==baseline.effect||word.edition!==baseline.edition)return {id,status:'manual',reason:'version-effet-non-couverte',word};
 return {id,status:'covered',word,engine,effectVersion:`${contracts.sourceVersion}:${id}`,limitations:id==='empaleuse'?['Projectiles fichés et soin à gérer manuellement']:id==='inoffensive'?['Deux jets de gravité requis pour le critique']:[]};
}
