import {normalizeCamp} from '../core/encounters.js';
import {v5CombatActionClock} from '../core/v5-resources.js';
/** Interface MJ de la séquence obligatoire de Brisé (L06 p.163, 185–186).
 * Les faits restent locaux jusqu’au commit d’un reçu Store.
 */
const node=(tag,klass,text)=>{const el=document.createElement(tag);if(klass)el.className=klass;if(text!==undefined)el.textContent=text;return el;};
const keyOf=value=>String(value?.key||value?.name||value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const isBrokenActor=actor=>(actor?.states||[]).some(row=>['brise','broken'].includes(keyOf(row))&&Number(row?.level??1)>0);

export function renderBrokenEscapeVisibilityControl({actor,value,onChange,key='form'}={}) {
 if(!isBrokenActor(actor))return null;
 const box=node('fieldset','workspace-broken-facts');box.dataset.brokenEscapeVisibilityGroup=key;
 box.append(node('legend','','Visibilité par rapport aux ennemis'));
 const label=node('label','workspace-type','Le MJ confirme la visibilité');
 const select=document.createElement('select');select.setAttribute('aria-label','Visibilité par rapport aux ennemis');
 select.dataset.brokenEscapeVisibility=key;
 select.append(new Option('À préciser',''),new Option('Oui, visible d’au moins un ennemi','true'),new Option('Non, hors de vue de tous les ennemis','false'));
 select.value=typeof value==='boolean'?String(value):'';
 select.addEventListener('change',()=>onChange?.(select.value===''?null:select.value==='true'));
 label.append(select);box.append(label,node('p','workspace-muted','Le fait n’est pas deviné; un aperçu seul ne l’enregistre pas.'));
 return box;
}
const hideSkills=actor=>(actor?.skills||[]).filter(s=>s.status==='resolved'&&Number.isInteger(Number(s.total??s.value))&&/discr[eé]tion|stealth|\bhide\b/i.test(s.name||s.nom||s.sourceName||''));
function stateOf(Store){try{return JSON.parse(Store.getFullJSON());}catch{return {};}}
function turnOf(state){
 const clock=v5CombatActionClock(state);
 return {...clock,round:clock.round??null,actorId:state.combat?.currentActorId,turnId:clock.turnId??null};
}
function selectField(parent,label,value,key,options,change){
 const wrap=node('label','workspace-type',label),select=document.createElement('select');
 select.setAttribute('aria-label',label);select.dataset.brokenEscapeField=key;
 options.forEach(row=>select.append(new Option(row[1],row[0])));
 select.value=value??'';select.addEventListener('change',()=>change(select.value||null));wrap.append(select);parent.append(wrap);return select;
}
export function createV5BrokenEscapePanel({Store,refresh=()=>{},onPrepareHide=()=>{}}={}){
 const drafts=new Map();
 const update=(id,draft,patch)=>{Object.assign(draft,patch,{preview:null,error:''});drafts.set(id,draft);refresh();};
 function draftFor(actor,progress,turnId){
  const revision=Store.getLocalRevision?.()??null;
  let d=drafts.get(actor.id);
  if(!d)d={turnId,baseRevision:revision,action:'flee',before:null,after:null,engagement:null,engaged:[],mode:null,roll:'',choice:null,attestValue:null,preview:null,error:'',busy:false};
  else if(d.turnId!==turnId){Object.assign(d,{turnId,baseRevision:revision,action:'flee',before:null,after:null,engagement:null,engaged:[],mode:null,roll:'',choice:null,attestValue:null,hideSkillId:null,lastReceipt:null,preview:null,error:'',busy:false});}
  else if(d.baseRevision!==revision){const hadPreview=Boolean(d.preview);Object.assign(d,{baseRevision:revision,before:null,after:null,engagement:null,engaged:[],mode:null,roll:'',choice:null,attestValue:null,hideSkillId:null,preview:null,error:hadPreview?'La partie a changé : les faits et l’aperçu ont été invalidés; renseignez-les à nouveau.':''});}
  if(d.preview&&d.preview.baseRevision!==Store.getLocalRevision?.()){d.preview=null;d.error='La partie a changé : recalculez les conséquences.';}
  if(progress?.fleeCommitted&&progress.visibleToAnyEnemy===true&&!progress.sprintCommitted)d.action='sprint';
  drafts.set(actor.id,d);return d;
 }
 function appendHide(section,actor,draft,isTurn){
  const box=node('div','workspace-broken-hide');
  box.append(node('strong','','Hide reste facultatif après la sortie de vue.'));
  const skills=hideSkills(actor);
  if(!skills.length){
   box.append(node('p','workspace-muted','Aucune compétence Discrétion/Stealth résolue sur cette fiche. Reliez une vraie compétence avant son Test.'));
  }else{
   const label=node('label','workspace-type','Compétence existante à tester'),select=document.createElement('select');
   select.setAttribute('aria-label','Compétence facultative pour Hide');select.dataset.brokenEscapeHideSkill=actor.id;
   select.append(new Option('Choisir une compétence',''),...skills.map(s=>new Option((s.name||s.nom||s.sourceName)+' · '+(s.total??s.value),s.id||s.name||s.nom)));
   select.value=draft.hideSkillId||'';select.addEventListener('change',()=>{draft.hideSkillId=select.value||null;drafts.set(actor.id,draft);refresh();});
   label.append(select);box.append(label);
   const prepare=node('button','workspace-secondary','Préparer le Test facultatif dans Résolution');prepare.type='button';
   prepare.dataset.brokenEscapePrepareHide=actor.id;prepare.disabled=!isTurn||!draft.hideSkillId;
   prepare.addEventListener('click',()=>onPrepareHide(actor.id,draft.hideSkillId));box.append(prepare);
  }
  box.append(node('p','workspace-muted','Le Test passe par la résolution normale de Compétence; ce contrôle ne lance ni ne consigne aucun jet.'));
  section.append(box);
 }
 function previewBlock(section,draft,required,id){
  const p=draft.preview;if(!p)return;
  const box=node('div','workspace-broken-preview');box.setAttribute('role','status');box.dataset.brokenEscapePreview=id;section.append(box);
  if(!p.ready){
   box.append(node('p','workspace-field-error',p.error||'Aperçu bloqué.'));
   for(const need of p.needsInput||[])box.append(node('p','workspace-muted',typeof need==='string'?need:need.label||need.field));
   if(/DIV-BROKEN-MIDTURN-01/.test(p.error||''))box.append(node('p','workspace-field-error','Décision MJ explicite requise pour cette occurrence. Aucun Sprint reporté ni Action supplémentaire.'));
   if(/engag/i.test(p.error||''))box.append(node('p','workspace-muted','Fuite engagée non raccordée : Momentum, Brisé et attaques gratuites restent à résoudre par le MJ.'));
   return;
  }
  box.append(node('p','workspace-broken-status','Aperçu : aucun effet appliqué.'));
  if(required==='flee'){
   box.append(node('p','', 'Move (Flee) : '+p.moveDistance+' mètres de jeu (source V5 : '+p.moveDistance+' yards).'));
  }else{
   const t=p.test||{},r=t.result||{};
   box.append(node('p','', 'Athlétisme '+(t.score??'—')+' · jet '+(r.initialRoll??'—')+(r.reversed?' inversé vers '+r.roll:'')+' · '+(r.sl??'—')+' DR (Intermédiaire +2).'));
   box.append(node('p','', 'Move/Flee : '+p.moveDistance+' mètres de jeu (source V5 : '+p.moveDistance+' yards); Sprint supplémentaire : '+p.sprintDistance+' mètres (source V5 : '+p.sprintDistance+' yards); total : '+p.totalDistance+' mètres de jeu ('+p.totalDistance+' yards).'));
   if(t.preview?.choiceRequired){
    const select=document.createElement('select');select.setAttribute('aria-label','Choix du résultat Athlétisme');select.dataset.brokenEscapeChoice=id;
    select.append(new Option('Choisir le résultat',''),...t.preview.options.map(o=>new Option(o.id==='reverse'?'Inverser → '+o.result.roll:'Garder → '+o.result.roll,o.id)));
    select.value=draft.choice||'';select.addEventListener('change',()=>update(id,draft,{choice:select.value||null}));box.append(select);
   }
  }
  box.append(node('p','workspace-muted','Source : Livre de base V5 EN, p. 163, 185–186.'));
 }
 function appendReceipt(section,actor,whole,clock,draft){
  const receipt=draft.lastReceipt||[...(whole.extensions?.v5?.brokenEscape?.receipts||[])].reverse().find(r=>r.actorId===actor.id&&r.turn?.turnId===clock.turnId);
  if(!receipt)return;
  const proof=node('div','workspace-broken-proof');proof.setAttribute('role','status');proof.dataset.brokenEscapeReceipt=receipt.id||receipt.executionId||'';
  proof.append(node('strong','',receipt.action==='visibility-confirmation'?'Attestation MJ enregistrée':'Reçu mécanique enregistré'));
  if(receipt.action==='visibility-confirmation')proof.append(node('p','workspace-muted',(receipt.visibleToAnyEnemy?'Visible d’au moins un ennemi':'Hors de vue de tous les ennemis')+' · fait explicite pour ce Tour · aucune Action ni distance.'));
  else if(receipt.action==='flee')proof.append(node('p','workspace-muted','Move (Flee) : '+receipt.moveDistance+' mètres de jeu (source V5 : '+receipt.moveDistance+' yards).'));
  else proof.append(node('p','workspace-muted','Sprint : '+receipt.sprintDistance+' mètres supplémentaires (source V5 : '+receipt.sprintDistance+' yards), '+(receipt.test?.result?.sl??'—')+' DR.'));
  section.append(proof);
 }
 function renderActor(actor,participants){
  const whole=stateOf(Store),clock=turnOf(whole),stored=whole.extensions?.v5?.brokenEscape?.byActorId?.[actor.id];
  const progress=stored?.turnId===clock.turnId?stored:null,d=draftFor(actor,progress,clock.turnId),section=node('section','workspace-broken-escape-actor');
  section.dataset.brokenEscapeActor=actor.id;section.append(node('h4','workspace-rubric','Brisé · '+actor.name));
  const currentActor=participants.find(row=>row.id===clock.actorId);
  section.append(node('p','workspace-muted','Round '+(clock.round||'—')+' · Tour de '+(currentActor?.name||'à établir')));
  const isTurn=clock.actorId===actor.id&&actor.zone==='active';
  if(!isTurn)section.append(node('p','workspace-muted',actor.zone==='active'?'Le Tour actuel appartient à '+(clock.actorId||'un autre combattant')+'.':'Ce personnage n’est pas actif dans la rencontre.'));
  if(!progress?.fleeCommitted){
   const attestation=node('div','workspace-broken-attestation');
   attestation.append(node('strong','','Fait canonique de visibilité pour ce Tour'));
   selectField(attestation,'Le MJ confirme la visibilité envers les ennemis',d.attestValue===null?'':String(d.attestValue),'attestation',[['','À préciser'],['true','Oui, visible d’au moins un ennemi'],['false','Non, hors de vue de tous les ennemis']],value=>update(actor.id,d,{attestValue:value===null?null:value==='true'}));
   const attest=node('button','workspace-secondary','Enregistrer le fait pour ce Tour (sans Action ni déplacement)');attest.type='button';attest.dataset.brokenEscapeAttest=actor.id;attest.disabled=!isTurn||d.busy||typeof d.attestValue!=='boolean';
   attest.addEventListener('click',async()=>{if(attest.disabled)return;d.busy=true;d.error='';refresh();try{const result=await Store.confirmBrokenEscapeVisibility({actorId:actor.id,visibleToAnyEnemy:d.attestValue});if(result?.status!=='applied'){const code=result?.code||'';d.error=(code?code+' : ':'')+(result?.error||result?.needsInput?.map(row=>row.label||row.field).join(' ')||'Fait non enregistré.');}else{d.lastReceipt=result.receipt;d.baseRevision=Store.getLocalRevision?.()??null;d.error=d.attestValue?'Visibilité confirmée : cela ne satisfait ni Move (Flee) ni Sprint.':'Hors de vue de tous les ennemis confirmé pour ce Tour; aucune distance ni quota n’a été ajouté.';d.before=d.attestValue;d.after=d.attestValue;}}catch(error){d.error=error?.message||'Fait non enregistré.';}finally{d.busy=false;refresh();}});attestation.append(attest);
   attestation.append(node('p','workspace-muted','Cette attestation trace uniquement un fait. Elle ne déroge jamais à DIV-BROKEN-MIDTURN-01 et ne consomme aucune Action.'));
   section.append(attestation);
  }
  if(progress?.factsCommitted&&progress.visibleToAnyEnemy===false&&!progress.fleeCommitted){
   section.append(node('p','workspace-broken-status','Le MJ a confirmé que ce personnage était hors de vue de tous les ennemis : aucune fuite ni aucun Sprint n’est requis ce Tour. Hide reste facultatif.'));
   if(d.error)section.append(node('p','workspace-muted',d.error));
   appendReceipt(section,actor,whole,clock,d);
   appendHide(section,actor,d,isTurn);return section;
  }
  if(progress?.fleeCommitted&&progress.sprintCommitted){
   section.append(node('p','workspace-broken-status','Sprint enregistré pour ce Tour.'+(progress.visibleToAnyEnemy?' Le personnage reste visible d’au moins un ennemi; la sortie de vue est à obtenir.':' Le MJ a confirmé hors de vue de tous les ennemis.')));
   appendReceipt(section,actor,whole,clock,d);
   appendHide(section,actor,d,isTurn);return section;
  }
  if(progress?.fleeCommitted&&progress.visibleToAnyEnemy===false){
   section.append(node('p','workspace-broken-status','Flee enregistré et personnage hors de vue de tous les ennemis. Sprint n’est pas requis; Hide reste facultatif.'));
   appendReceipt(section,actor,whole,clock,d);
   appendHide(section,actor,d,isTurn);return section;
  }
  const required=progress?.fleeCommitted?'sprint':'flee';
  if(required==='sprint')section.append(node('p','workspace-broken-status','Move (Flee) enregistré; l’Action (Sprint) est obligatoire ce Tour.'));
  const controls=node('div','workspace-broken-escape-controls');
  const step=node('label','workspace-type','Étape obligatoire'),stepSelect=document.createElement('select');
  stepSelect.setAttribute('aria-label','Étape obligatoire');stepSelect.dataset.brokenEscapeActionSelect=actor.id;
  stepSelect.append(new Option(required==='flee'?'Move (Flee)':'Action (Sprint)',required));stepSelect.value=required;stepSelect.disabled=true;step.append(stepSelect);controls.append(step);
  controls.append(renderBrokenEscapeVisibilityControl({actor,value:d.before,onChange:value=>update(actor.id,d,{before:value}),key:'broken-escape'}));
  if(required==='flee'){
   const engage=selectField(controls,'Ennemis engagés avec ce personnage',d.engagement,'engagement',[
    ['','À préciser'],['none','Aucun ennemi engagé'],['selected','Un ou plusieurs ennemis engagés']
   ],value=>update(actor.id,d,{engagement:value,engaged:[]}));
   engage.dataset.brokenEscapeEngagement=actor.id;
   if(d.engagement==='selected'){
    const list=node('fieldset','workspace-broken-facts');list.dataset.brokenEscapeEngagedList=actor.id;list.append(node('legend','','Choisissez chaque ennemi engagé'));
    const others=participants.filter(p=>p.id!==actor.id&&p.zone==='active'&&normalizeCamp(p.camp,p.kind)!==normalizeCamp(actor.camp,actor.kind));
    if(!others.length)list.append(node('p','workspace-field-error','Aucun autre combattant actif disponible pour confirmer un ennemi engagé.'));
    for(const other of others){
     const label=node('label','workspace-type',other.name),check=document.createElement('input');check.type='checkbox';check.checked=d.engaged.includes(other.id);
     check.setAttribute('aria-label','Ennemi engagé : '+other.name);check.dataset.brokenEscapeEngagedId=other.id;
     check.addEventListener('change',()=>update(actor.id,d,{engaged:check.checked?[...d.engaged,other.id]:d.engaged.filter(id=>id!==other.id)}));
     label.prepend(check);list.append(label);
    }
    controls.append(list);
   }
   selectField(controls,'Déplacement Flee',d.mode,'move-mode',[['','À préciser'],['walk','Walk'],['run','Run']],value=>update(actor.id,d,{mode:value}));
  }
  selectField(controls,'Visibilité après cette étape',d.after===null?'':String(d.after),'visible-after',[
   ['','À préciser'],['true','Oui, visible d’au moins un ennemi'],['false','Non, hors de vue de tous les ennemis']
  ],value=>update(actor.id,d,{after:value===null?null:value==='true'}));
  if(required==='sprint'){
   const label=node('label','workspace-type','Jet d’Athlétisme (d100)'),input=document.createElement('input');
   input.type='number';input.min='1';input.max='100';input.step='1';input.inputMode='numeric';input.value=d.roll;input.setAttribute('aria-label','Jet d’Athlétisme pour Sprint');
   input.dataset.brokenEscapeRoll=actor.id;input.dataset.focusKey='broken-escape-roll-'+actor.id;input.addEventListener('input',()=>update(actor.id,d,{roll:input.value,choice:null}));label.append(input);controls.append(label);
   section.append(node('p','workspace-muted','Athlétisme · Test Intermédiaire (+2 DR).'));
  }
  section.append(controls);
  const buttons=node('div','workspace-resolution-row'),calc=node('button','workspace-secondary','Calculer l’aperçu');calc.type='button';calc.dataset.brokenEscapeCalculate=actor.id;
  calc.disabled=!isTurn||d.busy;
  calc.addEventListener('click',()=>{
   const facts={};if(typeof d.before==='boolean')facts.visibleToAnyEnemy=d.before;if(typeof d.after==='boolean')facts.visibleToAnyEnemyAfter=d.after;
   if(required==='flee'){
    if(d.engagement==='none')facts.engagedEnemyIds=[];
    else if(d.engagement==='selected'&&d.engaged.length)facts.engagedEnemyIds=[...d.engaged];
    if(d.mode)facts.moveMode=d.mode;
   }
   const input={actorId:actor.id,action:required,facts,...(required==='sprint'&&d.roll!==''?{roll:Number(d.roll)}:{}),...(d.choice?{choice:d.choice}:{})};
   try{d.preview=Store.previewBrokenEscape(input);d.error=d.preview.ready?'':d.preview.error||'Informations requises pour calculer.';}
   catch(error){d.preview=null;d.error=error?.message||'Aperçu impossible.';}refresh();
  });buttons.append(calc);
  const apply=node('button','workspace-primary',required==='flee'?'Appliquer Move (Flee)':'Appliquer Action (Sprint)');apply.type='button';apply.dataset.brokenEscapeApply=actor.id;
  const choiceMissing=d.preview?.test?.preview?.choiceRequired&&!d.choice;
  apply.disabled=!isTurn||d.busy||!d.preview?.ready||choiceMissing||d.preview.baseRevision!==Store.getLocalRevision?.();
  apply.addEventListener('click',async()=>{
   if(apply.disabled||d.busy)return;d.busy=true;d.error='';refresh();
   try{const result=await Store.applyBrokenEscape(d.preview);if(result?.status!=='applied')throw Error(result?.reason||result?.error||'Action non enregistrée.');
    d.lastReceipt=result.receipt;d.baseRevision=Store.getLocalRevision?.()??null;d.preview=null;d.roll='';d.choice=null;d.action=required==='flee'?'sprint':null;
   }catch(error){d.error=error?.message||'Action non enregistrée.';d.preview=null;}finally{d.busy=false;refresh();}
  });buttons.append(apply);section.append(buttons);previewBlock(section,d,required,actor.id);
  if(d.error)section.append(node('p','workspace-field-error',d.error));
  appendReceipt(section,actor,whole,clock,d);
  return section;
 }
 return {render(participants=[],currentActorId=null){
  const actors=participants.filter(isBrokenActor);if(!actors.length)return null;
  const panel=node('section','workspace-card workspace-broken-escape');panel.dataset.brokenEscapePanel='';
  panel.append(node('h3','workspace-rubric','Brisé · fuite obligatoire'));
  panel.append(node('p','workspace-muted','Move (Flee), puis Action (Sprint) tant que le personnage reste visible d’au moins un ennemi. Le MJ confirme les faits; aucun déplacement spatial n’est inventé.'));
  actors.forEach(actor=>panel.append(renderActor(actor,participants)));return panel;
 }};
}

