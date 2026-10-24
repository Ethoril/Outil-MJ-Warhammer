import { resolveKeyword, resolveTalent, getReferenceCatalogue } from '../core/reference-catalog.js';
import { bestiarySpellLines, unvaluedSkillNames } from '../core/bestiary-profiles.js';
import { acquiredV5TalentCoverage, V5_TALENT_TREATMENT_LABELS } from '../core/v5-talent-coverage.js';
const element = (tag,text) => { const node=document.createElement(tag); if(text!=null)node.textContent=String(text); return node; };
const names={head:'Tête',body:'Corps',rightArm:'Bras droit',leftArm:'Bras gauche',rightLeg:'Jambe droite',leftLeg:'Jambe gauche'};
export function renderFicheDetails(subject={}) {
 const root=element('details');root.className='fiche-consultation';root.append(element('summary','Fiche : compétences, talents et équipement'));
 const source=subject.ficheSnapshot?.source;
 if(source)root.append(element('p',`Fiche ${subject.extensions?.ficheId || subject.ficheSnapshot.charId} · révision ${source.revision ?? 'non fournie'} · référentiel ${source.resolverVersion ? String(source.resolverVersion).replace(/^references:/,'').slice(0,12) : 'non indiqué'}`));
 const section=(title,rows,describe)=>{rows=rows.filter(row=>row && typeof row==='object');const block=element('details');block.append(element('summary',`${title} (${rows.length})`));for(const row of rows){const item=element('details');const [label,text]=describe(row);item.append(element('summary',label),element('p',text||'Donnée conservée sans définition reconnue.'));block.append(item);}root.append(block);};
 section('Rejets divins',subject.extensions?.v5?.divineRejections||[],row=>[row.cult+' · '+(row.kind==='permanent'?'Rejet définitif':'Excommunication : '+row.stage+'/2 pénitences'),row.source.document+' p.'+row.source.printedPage+(row.prayLoss?' · '+row.prayLoss.advances+' avances Prière perdues':'')]);
 section('Hémorragie quotidienne',subject.extensions?.v5?.divineDailyBleeding||[],row=>[row.cult+' · '+(row.status==='completed'?'Terminée par pénitence':'En cours'),row.quantity+' Hémorragique par matin · prochain matin '+row.nextMorningAt+' secondes de campagne · '+row.source.document+' p.'+row.source.printedPage]);
 section('Possessions confisquées',(subject.extensions?.v5?.divineConfiscations||[]).flatMap(record=>(record.items||[]).map(item=>({...item,source:record.source}))),row=>[row.label+' · '+(row.status==='returned'?'Rendu':'Retenu'),(row.magical?'Objet magique':'Objet non magique')+' · '+row.source.document+' p.'+row.source.printedPage]);
 section('Pénitences',subject.extensions?.v5?.divinePenances||[],row=>[(row.status==='completed'?'Accomplie':'En cours')+' · '+row.cult+' · '+row.text,row.source.document+' p.'+row.source.printedPage+(row.completedReason?' · Clôture MJ : '+row.completedReason:'')]);
 section('Compétences',subject.skills||[],row=>[`${row.name || row.sourceName} : ${row.total ?? 'spécialité à choisir'} (${row.advances || 0} avances)`,`${row.carac || ''} · ${row.status === 'resolved' ? 'Référentiel reconnu' : 'À vérifier : '+(row.status || 'non reconnu')}`]);
 const unvalued=unvaluedSkillNames(subject.extensions?.v5?.bestiary?.unvaluedSkills);
 if(unvalued.length)section('Compétences sans valeur imprimée (bestiaire)',unvalued.map(name=>({name})),row=>[row.name,'Imprimée sans valeur dans le livre : à fixer par le MJ.']);
 section('Talents',subject.talents||[],row=>{const found=resolveTalent(row.name||row.nom||row.sourceName);return [`${row.name||row.nom||row.sourceName} · rang ${row.rank ?? row.ranks ?? 1}`,row.description || found?.description || found?.entry?.description];});
 section('Équipement',subject.equipment||[],row=>[row.name,[row.category,row.damage?'Dégâts : '+row.damage:'',row.reach?'Allonge : '+row.reach:'',row.range?'Portée : '+row.range:'',row.ap!=null?'PA : '+row.ap:'',(row.locations||[]).map(key=>names[key]||key).join(', '),row.layer && row.layer!=='none' ? 'Couche : '+(({leather:'Cuir',flexible:'Souple',rigid:'Rigide',bonus:'Renfort'})[row.layer] || row.layer) : '',...(row.keywords||[]).map(word=>{const found=resolveKeyword(word.id);const entry=found?.entry||found;return `${entry?.name||word.id}${word.parameter?' ('+word.parameter+')':''} : ${entry?.effect || 'définition non reconnue'}`;}),row.notes,row.custom?'Exemplaire personnalisé : valeurs de la fiche conservées.':'',row.kind==='shield'?'Protection conditionnelle : bouclier choisi pour cette résolution.':''].filter(Boolean).join(' · ')]);
 const treatment=element('details');treatment.append(element('summary','Traitement des talents en séance'));
 for(const row of acquiredV5TalentCoverage(subject)){treatment.append(element('strong',row.name || row.talentId));for(const clause of row.clauses)treatment.append(element('p',V5_TALENT_TREATMENT_LABELS[clause.mode]+' : '+clause.text));}
 if((subject.talents||[]).length)root.append(treatment);
 const catalog=getReferenceCatalogue();
 section('Sorts — consultation',subject.spells||[],row=>[row.nom||row.name,row.desc||row.description||catalog.magic?.spells?.find(item=>item.nom===(row.nom||row.name))?.desc]);
 section('Sorts du profil (bestiaire)',bestiarySpellLines(subject.extensions?.v5?.bestiary?.spells).map(line=>({line})),row=>{const [label,...rest]=row.line.split(' : ');return [label,rest.join(' : ')||row.line];});
 section('Prières — consultation',subject.prayers||[],row=>[row.nom||row.name,row.effet||row.description||catalog.magic?.miracles?.find(item=>item.nom===(row.nom||row.name))?.effet]);
 return root;
}
