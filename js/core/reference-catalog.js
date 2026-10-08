/** Public references only. Authenticated PJ snapshots are never stored here. */
import snapshot from '../data/reference-snapshot.json' with { type: 'json' };
import { createSkillResolver, buildSkillEntries } from '../data/shared/catalogue/skill-resolver.js';
import { createTalentResolver } from '../data/shared/catalogue/talent-resolver.js';
import { parseTalentSourceRows } from '../data/shared/catalogue/talent-source.js';
import { validateEquipmentItem } from '../data/shared/fiche/equipment.js';
import { buildEquipmentRows } from '../data/reference-equipment-builder.js';
const CACHE_KEY = 'wfrp.references.v1';
const SHEET_ROOT = 'https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&sheet=';
const REQUIRED_SHEETS = ['Mots Clés Armes et Armures','Armes Corps à Corps','Armes à Distance','Armures','Talents','Magie','Miracles'];
export const referenceKey = value => String(value ?? '').normalize('NFC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('fr');
export const referenceSlug = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/gu,'').replace(/\s+x\b/giu,'').replace(/[^a-z0-9]+/gu,'-').replace(/^-+|-+$/gu,'');
export function referenceContentPayload(pack){return {skills:pack.published.skills,talentContract:pack.published.talents,talents:{entries:pack.talents.entries,legacyAliases:pack.talents.legacyAliases,specializationTranslations:pack.talents.specializationTranslations},equipment:{items:pack.equipment.items,keywords:pack.equipment.keywords},additionalSkills:pack.additionalSkills,magic:{spells:pack.magic.spells,miracles:pack.magic.miracles}};}
const copy = value => globalThis.structuredClone(value);
const deepFreeze = value => { if(value && typeof value==='object' && !Object.isFrozen(value)){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}return value; };
export const canonicalReferenceValue = (key,value) => ['catalogVersion','contentVersion','version','descriptionSnapshotVersion','fetchedAt','publishedAt'].includes(key) ? undefined : value && typeof value==='object' && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])) : value;
export async function sha256(value){const body=typeof value==='string'?value:JSON.stringify(value,canonicalReferenceValue);const bytes=new TextEncoder().encode(body);return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');}

/** RFC 4180 parser including embedded newlines and doubled quotes. */
export function parseReferenceCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 const input=String(text ?? '').replace(/^\uFEFF/u,'');
 for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
 else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('CSV incomplet : guillemet non fermé');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
export function parseKeywordCSV(text){
 const [headers,...rows]=parseReferenceCSV(text);if(!headers)throw new Error('Source mots clés vide');
 const index=name=>headers.findIndex(h=>referenceKey(h)===referenceKey(name));
 const required=['Identifiant','Nom','Effet','Type','Paramètre','Source','Version retenue','Anciens noms','Nom EN','Remarque'];
 if(required.some(h=>index(h)<0))throw new Error('Colonnes du référentiel mots clés inattendues');
 const value=(row,name)=>String(row[index(name)]??'').trim();
 const words=rows.filter(row=>value(row,'Nom')).map(row=>({id:value(row,'Identifiant'),name:value(row,'Nom'),effect:value(row,'Effet'),type:value(row,'Type'),parameter:value(row,'Paramètre'),source:value(row,'Source'),edition:value(row,'Version retenue'),aliases:[value(row,'Nom EN'),...value(row,'Anciens noms').split(',').map(v=>v.trim())].filter(Boolean),note:value(row,'Remarque')}));
 if(!words.length||new Set(words.map(w=>w.id)).size!==words.length||words.some(w=>!w.id||!w.effect||!w.source||!w.edition))throw new Error('Référentiel mots clés vide, incomplet ou ambigu');return words;
}


/** Consultation mapping matches fiches/tools/refresh-fiche-catalog.mjs; retired spells retained. */
export function buildMagicReferences(tables,previous){
 const header=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/gu,'').toLowerCase().trim();
 const records=name=>{const [headers,...rows]=tables[name]||[];if(!headers)throw new Error('Source magique absente : '+name);const keys=headers.map(header);if(!keys.includes('nom'))throw new Error('Colonne magique Nom absente');return rows.map(row=>Object.fromEntries(keys.map((key,i)=>[key,String(row[i]||'').trim()]).filter(([key])=>key))).filter(row=>row.nom);};
 const spells=records('Magie').map(row=>({nom:row.nom,type:row.type||'',cn:Number(row.ni)||0,portee:row.portee||'',cible:row.cible||'',duree:row.duree||'',desc:row.description||'',...(row.nom==='Epées Sanguines'?{aliases:['Sanguine Swords']}:{})}));
 const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/gu,'').replace(/[’']/gu,"'").toLowerCase().trim();
 for(const old of previous.spells){const current=spells.find(row=>normalize(row.nom)===normalize(old.nom)||(row.aliases||[]).some(alias=>normalize(alias)===normalize(old.nom)));if(current){const aliases=[...new Set([...(current.aliases||[]),...(old.aliases||[])])];if(aliases.length)current.aliases=aliases;}else spells.push({...old,retired:true});}
 const miracles=records('Miracles').map(row=>({nom:row.nom,portee:row.portee||'',cible:row.cible||'',duree:row.duree||'',effet:row.effet||''}));
 if(spells.length<100||miracles.length<10||spells.some(row=>!row.desc)||miracles.some(row=>!row.effet))throw new Error('Ensemble de références magiques incomplet');return {spells,miracles};
}

export function createReferenceResolvers(pack){
 if(pack?.schemaVersion!==1||typeof pack.contentVersion!=='string'||!pack.published?.skills||!Array.isArray(pack.talents?.entries)||!Array.isArray(pack.equipment?.keywords)||!Array.isArray(pack.equipment?.items)||!Array.isArray(pack.magic?.spells)||!Array.isArray(pack.magic?.miracles))throw new Error('Ensemble de références invalide');
 const known=new Set(pack.published.skills.entries.map(s=>s.nom));
 const extra=buildSkillEntries(pack.additionalSkills||[]).filter(s=>!known.has(s.nom));
 const skillResolver=createSkillResolver({version:pack.contentVersion,...pack.published.skills,entries:[...pack.published.skills.entries,...extra]});
 const talentResolver=createTalentResolver({version:pack.contentVersion,...pack.published.talents,sheetSnapshot:pack.talents});
 if(skillResolver.aliasErrors.length||talentResolver.aliasErrors.length)throw new Error('Alias de référentiel invalides');
 if(pack.equipment.keywords.length<40||pack.equipment.items.length<100||pack.talents.entries.length<100||pack.magic.spells.length<100||pack.magic.miracles.length<10)throw new Error('Ensemble de références incomplet');
 for(const collection of [pack.equipment.items,pack.equipment.keywords,pack.talents.entries])if(new Set(collection.map(v=>v.id)).size!==collection.length)throw new Error('Identités de référentiel dupliquées');
 for(const word of pack.equipment.keywords)if(!word.id||!word.name||!word.effect||!word.source||!word.edition||!Array.isArray(word.aliases))throw new Error('Définition de mot clé invalide');
 for(const item of pack.equipment.items)validateEquipmentItem(item,pack.equipment);
 return {skillResolver,talentResolver};
}
let current=deepFreeze(copy(snapshot));let resolvers=createReferenceResolvers(current);
let status={source:'instantané local (dépôt)',contentVersion:current.contentVersion,updatedAt:current.fetchedAt,error:null};
let initialized=false;let pending=null;
export function loadInitialReferences(){
 if(initialized)return current;initialized=true;
 try{const raw=globalThis.localStorage?.getItem(CACHE_KEY);if(raw){const cache=JSON.parse(raw);const next=createReferenceResolvers(cache.data);current=deepFreeze(cache.data);resolvers=next;status={source:'localStorage',contentVersion:current.contentVersion,updatedAt:cache.updatedAt||current.fetchedAt,error:null};}}
 catch(error){status={...status,error:`Cache de références ignoré : ${error.message}`};}return current;
}
export function getReferenceCatalogue(){loadInitialReferences();return {...current.equipment,contentVersion:current.contentVersion,talents:resolvers.talentResolver.entries,skills:resolvers.skillResolver.primaryEntries,magic:current.magic};}
export const getReferenceSnapshot=()=>{loadInitialReferences();return current;};
export const getReferenceStatus=()=>{loadInitialReferences();return {...status};};
export const getSkillResolver=()=>{loadInitialReferences();return resolvers.skillResolver;};
export const getTalentResolver=()=>{loadInitialReferences();return resolvers.talentResolver;};
export const resolveSkill=(value,{owned=false}={})=>owned?getSkillResolver().resolveOwnedSkill(value):getSkillResolver().resolve(value);
export const resolveTalent=value=>getTalentResolver().resolve(value);
export function resolveKeyword(value){
 const words=getReferenceCatalogue().keywords;const text=String(value??'');const exact=words.find(w=>w.id===text);if(exact)return exact;
 const folded=referenceKey(text);const matches=words.filter(w=>[w.name,...(w.aliases||[])].some(n=>referenceKey(n)===folded));
 if(matches.length===1)return matches[0];if(matches.length>1)return null;
 const slug=referenceSlug(text);return words.find(w=>w.id===slug)||null;
}
export function aggregateTalents(collection,{present=collection!==undefined}={}){
 if(!present)return {coverage:'absent',items:[],warnings:[]};
 if(!Array.isArray(collection)||collection.some(row=>!row||typeof row!=='object'||typeof(row.nom??row.name)!=='string'))return {coverage:'invalid',items:[],warnings:[{field:'talents',code:'invalid-collection',severity:'error',message:'Acquisitions de talents invalides'}]};
 const groups=new Map(),warnings=[];
 for(const raw of collection){const name=raw.nom??raw.name;const match=resolveTalent(name);const specialty=match.specialization??null;const id=match.entry?.id??null;const key=JSON.stringify([id??name,specialty]);
 if(!groups.has(key))groups.set(key,{id,name:match.displayedName??name,specialty,specialization:specialty,rank:0,status:match.status,acquisitions:[],description:match.description??'',descriptionSource:match.descriptionSource??null,limitText:match.limitText??'',source:match.entry?.source??null});
 const item=groups.get(key);item.rank++;item.acquisitions.push(copy(raw));if(match.status!=='resolved'||match.open)warnings.push({field:'talents',entry:raw.id??name,code:match.open?'specialization-required':'unresolved-reference',severity:'warning',message:match.open?'Spécialité de talent à préciser':'Talent sans référence résolue'});}
 return {coverage:'present',items:[...groups.values()],warnings};
}

/** Refresh all mutable sheets atomically; an error never installs a partial set. */
export async function refreshReferences({fetchImpl=globalThis.fetch,forceRefresh=false,storage}={}){
 loadInitialReferences();if(pending)return pending;
 pending=(async()=>{try{
 if(typeof fetchImpl!=='function')throw new Error('Réseau indisponible');
 const loaded=await Promise.all(REQUIRED_SHEETS.map(async name=>{const url=SHEET_ROOT+encodeURIComponent(name);const response=await fetchImpl(url,{cache:forceRefresh?'reload':'default'});if(!response.ok)throw new Error(`${name} : HTTP ${response.status}`);const csv=await response.text();return {name,url,csv,table:parseReferenceCSV(csv),sha256:await sha256(csv)};}));
 const tables=Object.fromEntries(loaded.map(v=>[v.name,v.table]));
 for(const [name,headers] of Object.entries({'Armes Corps à Corps':['Nom','Catégorie','Dégâts','Allonge','Atouts et Défauts'],'Armes à Distance':['Nom','Catégorie','Dégâts','Portée','Atouts et Défauts'],'Armures':['Nom','Catégorie','Zones Couvertes',"Valeur d'Armure (PA)"]})) {
  if(headers.some(header=>!tables[name]?.[0]?.includes(header)))throw new Error('Colonnes équipement inattendues : '+name);
 }parseKeywordCSV(loaded.find(v=>v.name===REQUIRED_SHEETS[0]).csv);
 const equipment=buildEquipmentRows(tables);equipment.catalogVersion='equipment:'+await sha256(JSON.stringify({items:equipment.items,keywords:equipment.keywords}));
 for(const item of equipment.items)item.catalogVersion=equipment.catalogVersion;
 equipment.sources=Object.fromEntries(loaded.filter(v=>['Mots Clés Armes et Armures','Armes Corps à Corps','Armes à Distance','Armures'].includes(v.name)).map(v=>[v.name,{url:v.url,sha256:v.sha256}]));equipment.fetchedAt=new Date().toISOString();
 const [headers,...rows]=tables.Talents;const entries=parseTalentSourceRows(headers,rows);
 const talents={...copy(current.talents),entries,fetchedAt:equipment.fetchedAt,catalogVersion:'sha256:'+await sha256({entries,legacyAliases:current.talents.legacyAliases,specializationTranslations:current.talents.specializationTranslations})};
 const magic=buildMagicReferences(tables,current.magic);magic.catalogVersion='sha256:'+await sha256(magic);magic.fetchedAt=equipment.fetchedAt;magic.sources=Object.fromEntries(loaded.filter(v=>['Magie','Miracles'].includes(v.name)).map(v=>[v.name==='Magie'?'spells':'miracles',v.url]));
 const next={...copy(current),equipment,talents,magic,fetchedAt:equipment.fetchedAt,sourceManifest:loaded.map(row=>({worksheet:row.name,url:row.url,sha256:row.sha256,fetchedAt:equipment.fetchedAt,status:'public-export'}))};
 // Skill identities and translations remain the versioned public fiche contract.
 next.contentVersion='references:'+await sha256(referenceContentPayload(next));
 const prepared=createReferenceResolvers(next);let cacheWarning=null;
 try{(storage === undefined ? globalThis.localStorage : storage)?.setItem(CACHE_KEY,JSON.stringify({data:next,updatedAt:next.fetchedAt}));}catch(error){cacheWarning=`Cache non enregistré : ${error.message}`;}
 current=deepFreeze(next);resolvers=prepared;status={source:'Google Sheets + contrat publié des fiches',contentVersion:current.contentVersion,updatedAt:current.fetchedAt,error:null,cacheWarning};return {ok:true,catalogue:getReferenceCatalogue(),status:getReferenceStatus()};
 }catch(error){status={...status,error:error.message};return {ok:false,catalogue:getReferenceCatalogue(),status:getReferenceStatus()};}finally{pending=null;}})();return pending;
}
