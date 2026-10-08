import { resolveKeyword, resolveTalent, getReferenceCatalogue } from '../core/reference-catalog.js';
const element = (tag,text) => { const node=document.createElement(tag); if(text!=null)node.textContent=String(text); return node; };
const names={head:'Tête',body:'Corps',rightArm:'Bras droit',leftArm:'Bras gauche',rightLeg:'Jambe droite',leftLeg:'Jambe gauche'};
export function renderFicheDetails(subject={}) {
 const root=element('details');root.className='fiche-consultation';root.append(element('summary','Fiche : compétences, talents et équipement'));
 const source=subject.ficheSnapshot?.source;
 if(source)root.append(element('p',`Fiche ${subject.extensions?.ficheId || subject.ficheSnapshot.charId} · révision ${source.revision ?? 'non fournie'} · référentiel ${source.resolverVersion ? String(source.resolverVersion).replace(/^references:/,'').slice(0,12) : 'non indiqué'}`));
 const section=(title,rows,describe)=>{const block=element('details');block.append(element('summary',`${title} (${rows.length})`));for(const row of rows){const item=element('details');const [label,text]=describe(row);item.append(element('summary',label),element('p',text||'Donnée conservée sans définition reconnue.'));block.append(item);}root.append(block);};
 section('Compétences',subject.skills||[],row=>[`${row.name || row.sourceName} : ${row.total ?? 'spécialité à choisir'} (${row.advances || 0} avances)`,`${row.carac || ''} · ${row.status === 'resolved' ? 'Référentiel reconnu' : 'À vérifier : '+(row.status || 'non reconnu')}`]);
 section('Talents',subject.talents||[],row=>{const found=resolveTalent(row.name||row.nom||row.sourceName);return [`${row.name||row.nom||row.sourceName} · rang ${row.rank ?? row.ranks ?? 1}`,row.description || found?.description || found?.entry?.description];});
 section('Équipement',subject.equipment||[],row=>[row.name,[row.category,row.damage?'Dégâts : '+row.damage:'',row.reach?'Allonge : '+row.reach:'',row.range?'Portée : '+row.range:'',row.ap!=null?'PA : '+row.ap:'',(row.locations||[]).map(key=>names[key]||key).join(', '),row.layer && row.layer!=='none' ? 'Couche : '+(({leather:'Cuir',flexible:'Souple',rigid:'Rigide',bonus:'Renfort'})[row.layer] || row.layer) : '',...(row.keywords||[]).map(word=>{const found=resolveKeyword(word.id);const entry=found?.entry||found;return `${entry?.name||word.id}${word.parameter?' ('+word.parameter+')':''} : ${entry?.effect || 'définition non reconnue'}`;}),row.notes,row.custom?'Exemplaire personnalisé : valeurs de la fiche conservées.':'',row.kind==='shield'?'Protection conditionnelle : bouclier choisi pour cette résolution.':''].filter(Boolean).join(' · ')]);
 const catalog=getReferenceCatalogue();
 section('Sorts — consultation',subject.spells||[],row=>[row.nom||row.name,row.desc||row.description||catalog.magic?.spells?.find(item=>item.nom===(row.nom||row.name))?.desc]);
 section('Prières — consultation',subject.prayers||[],row=>[row.nom||row.name,row.effet||row.description||catalog.magic?.miracles?.find(item=>item.nom===(row.nom||row.name))?.effet]);
 return root;
}
