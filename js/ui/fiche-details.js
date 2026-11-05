import { resolveKeyword, resolveTalent, getReferenceCatalogue } from '../core/reference-catalog.js';
import { bestiarySpellLines, unvaluedSkillNames } from '../core/bestiary-profiles.js';
import { acquiredV5TalentCoverage, V5_TALENT_TREATMENT_LABELS } from '../core/v5-talent-coverage.js';
import { formatCurrency } from '../core/currency.js';
const element = (tag,text) => { const node=document.createElement(tag); if(text!=null)node.textContent=String(text); return node; };
const attr = (node,name,value) => { if(typeof node.setAttribute==='function')node.setAttribute(name,String(value)); else (node.attributes ||= {})[name]=String(value); };
const listen = (node,type,handler) => { if(typeof node.addEventListener==='function')node.addEventListener(type,handler); };
const names={head:'Tête',body:'Corps',rightArm:'Bras droit',leftArm:'Bras gauche',rightLeg:'Jambe droite',leftLeg:'Jambe gauche'};
const TABS=[['skills','Compétences'],['talents','Talents'],['equipment','Équipement'],['magic','Magie/Foi']];
const LONG_TEXT=110;
// Onglet actif par participant : workspace-view.js reconstruit la fiche à chaque rendu.
const activeTabs=new Map();
let instance=0;
export function resetFicheTabs(){activeTabs.clear();}
export function renderFicheDetails(subject={}) {
 const root=element('details');root.className='fiche-consultation';root.append(element('summary','Fiche : compétences, talents et équipement'));
 const source=subject.ficheSnapshot?.source;
 if(source&&(subject.extensions?.ficheId||subject.ficheSnapshot.charId))root.append(element('p',`Fiche ${subject.extensions?.ficheId || subject.ficheSnapshot.charId} · révision ${source.revision ?? 'non fournie'} · référentiel ${source.resolverVersion ? String(source.resolverVersion).replace(/^references:/,'').slice(0,12) : 'non indiqué'}`));
 const panels=new Map(TABS.map(([key])=>[key,element('div')]));
 const row=(label,text)=>{
  const line=element('div');line.className='fiche-row';
  const value=String(text||'Donnée conservée sans définition reconnue.');
  line.append(element('strong',label),element('span',value));
  if(value.length>LONG_TEXT){
   line.className='fiche-row fiche-row-long';attr(line,'tabindex',0);attr(line,'role','button');attr(line,'aria-expanded','false');
   const toggle=()=>{const open=!/\bis-open\b/.test(line.className);line.className='fiche-row fiche-row-long'+(open?' is-open':'');attr(line,'aria-expanded',open);};
   listen(line,'click',toggle);
   listen(line,'keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault?.();toggle();}});
  }
  return line;
 };
 const counts={};
 const add=(tab,title,rows,describe)=>{rows=rows.filter(item=>item && typeof item==='object');if(!rows.length)return;counts[tab]=(counts[tab]||0)+rows.length;const block=element('section');block.className='fiche-section';block.append(element('h4',`${title} (${rows.length})`));const grid=element('div');grid.className='fiche-grid';for(const item of rows){const [label,text]=describe(item);grid.append(row(label,text));}block.append(grid);panels.get(tab).append(block);};
 add('skills','Compétences',subject.skills||[],row=>[`${row.name || row.sourceName} : ${row.total ?? 'spécialité à choisir'} (${row.advances || 0} avances)`,`${row.carac || ''} · ${row.status === 'resolved' ? 'Référentiel reconnu' : 'À vérifier : '+(row.status || 'non reconnu')}`]);
 const unvalued=unvaluedSkillNames(subject.extensions?.v5?.bestiary?.unvaluedSkills);
 add('skills','Compétences sans valeur imprimée (bestiaire)',unvalued.map(name=>({name})),row=>[row.name,'Imprimée sans valeur dans le livre : à fixer par le MJ.']);
 add('talents','Talents',subject.talents||[],row=>{const found=resolveTalent(row.name||row.nom||row.sourceName);const specialization=row.specialization||row.specialty;const description=row.description || found?.description || found?.entry?.description;return [`${row.name||row.nom||row.sourceName} · rang ${row.rank ?? row.ranks ?? 1}${specialization?' ('+specialization+')':''}`,specialization&&description?`Spécialisation : ${specialization}. ${String(description).replace(/^Choisissez une? [^.:]*[.:]\s*/i,'')}`:description];});
 if((subject.talents||[]).length){
  const treatment=element('section');treatment.className='fiche-section fiche-treatment';treatment.append(element('h4','Traitement des talents en séance'));
  for(const entry of acquiredV5TalentCoverage(subject)){const block=element('div');block.className='fiche-row';block.append(element('strong',entry.name || entry.talentId));for(const clause of entry.clauses)block.append(element('span',V5_TALENT_TREATMENT_LABELS[clause.mode]+' : '+clause.text));treatment.append(block);}
  panels.get('talents').append(treatment);
 }
 add('equipment','Équipement',subject.equipment||[],row=>[row.name,[row.category,row.damage?'Dégâts : '+row.damage:'',row.price!=null?'Prix : '+(typeof row.price==='object'?formatCurrency(row.price):String(row.price)):'',row.reach?'Allonge : '+row.reach:'',row.range?'Portée : '+row.range:'',row.ap!=null?'PA : '+row.ap:'',(row.locations||[]).map(key=>names[key]||key).join(', '),row.layer && row.layer!=='none' ? 'Couche : '+(({leather:'Cuir',flexible:'Souple',rigid:'Rigide',bonus:'Renfort'})[row.layer] || row.layer) : '',...(row.keywords||[]).map(word=>{const found=resolveKeyword(word.id);const entry=found?.entry||found;return `${entry?.name||word.id}${word.parameter?' ('+word.parameter+')':''} : ${entry?.effect || 'définition non reconnue'}`;}),row.notes,row.custom?'Exemplaire personnalisé : valeurs de la fiche conservées.':'',row.kind==='shield'?'Protection conditionnelle : bouclier choisi pour cette résolution.':''].filter(Boolean).join(' · ')]);
 if(panels.get('equipment').children.length)panels.get('equipment').append(element('p','Monnaie : 1 couronne = 20 pistoles = 240 sous ; 1 pistole = 12 sous.'));
 const catalog=getReferenceCatalogue();
 add('magic','Rejets divins',subject.extensions?.v5?.divineRejections||[],row=>[row.cult+' · '+(row.kind==='permanent'?'Rejet définitif':'Excommunication : '+row.stage+'/2 pénitences'),row.source.document+' p.'+row.source.printedPage+(row.prayLoss?' · '+row.prayLoss.advances+' avances Prière perdues':'')]);
 add('magic','Hémorragie quotidienne',subject.extensions?.v5?.divineDailyBleeding||[],row=>[row.cult+' · '+(row.status==='completed'?'Terminée par pénitence':'En cours'),row.quantity+' Hémorragique par matin · prochain matin '+row.nextMorningAt+' secondes de campagne · '+row.source.document+' p.'+row.source.printedPage]);
 add('magic','Possessions confisquées',(subject.extensions?.v5?.divineConfiscations||[]).flatMap(record=>(record.items||[]).map(item=>({...item,source:record.source}))),row=>[row.label+' · '+(row.status==='returned'?'Rendu':'Retenu'),(row.magical?'Objet magique':'Objet non magique')+' · '+row.source.document+' p.'+row.source.printedPage]);
 add('magic','Pénitences',subject.extensions?.v5?.divinePenances||[],row=>[(row.status==='completed'?'Accomplie':'En cours')+' · '+row.cult+' · '+row.text,row.source.document+' p.'+row.source.printedPage+(row.completedReason?' · Clôture MJ : '+row.completedReason:'')]);
 add('magic','Sorts — consultation',subject.spells||[],row=>[row.nom||row.name,row.desc||row.description||catalog.magic?.spells?.find(item=>item.nom===(row.nom||row.name))?.desc]);
 add('magic','Sorts du profil (bestiaire)',bestiarySpellLines(subject.extensions?.v5?.bestiary?.spells).map(line=>({line})),row=>{const [label,...rest]=row.line.split(' : ');return [label,rest.join(' : ')||row.line];});
 add('magic','Prières — consultation',subject.prayers||[],row=>[row.nom||row.name,row.effet||row.description||catalog.magic?.miracles?.find(item=>item.nom===(row.nom||row.name))?.effet]);

 const available=TABS.filter(([key])=>panels.get(key).children.length);
 if(!available.length)return root;
 const memoKey=subject.id!=null?String(subject.id):null;
 const keys=available.map(([key])=>key);
 let active=memoKey!==null&&keys.includes(activeTabs.get(memoKey))?activeTabs.get(memoKey):keys[0];
 const prefix='fiche-tab-'+(++instance);
 const tablist=element('div');tablist.className='fiche-tabs';attr(tablist,'role','tablist');attr(tablist,'aria-label','Sections de la fiche');
 const buttons=new Map();
 const apply=(focus)=>{for(const [key,button] of buttons){const on=key===active;attr(button,'aria-selected',on);attr(button,'tabindex',on?0:-1);button.className='fiche-tab'+(on?' is-active':'');panels.get(key).hidden=!on;}if(focus)buttons.get(active).focus?.();};
 const select=(key,focus)=>{active=key;if(memoKey!==null)activeTabs.set(memoKey,key);apply(focus);};
 for(const [key,label] of available){
  const button=element('button',counts[key]?`${label} (${counts[key]})`:label);
  attr(button,'type','button');attr(button,'role','tab');attr(button,'id',`${prefix}-${key}`);attr(button,'aria-controls',`${prefix}-${key}-panel`);
  listen(button,'click',()=>select(key,false));
  listen(button,'keydown',event=>{
   const at=keys.indexOf(key);let next=null;
   if(event.key==='ArrowRight')next=keys[(at+1)%keys.length];
   else if(event.key==='ArrowLeft')next=keys[(at-1+keys.length)%keys.length];
   else if(event.key==='Home')next=keys[0];
   else if(event.key==='End')next=keys[keys.length-1];
   if(next!==null){event.preventDefault?.();select(next,true);}
  });
  buttons.set(key,button);tablist.append(button);
  const panel=panels.get(key);panel.className='fiche-panel';attr(panel,'role','tabpanel');attr(panel,'id',`${prefix}-${key}-panel`);attr(panel,'aria-labelledby',`${prefix}-${key}`);
 }
 root.append(tablist);
 for(const key of keys)root.append(panels.get(key));
 apply(false);
 return root;
}
