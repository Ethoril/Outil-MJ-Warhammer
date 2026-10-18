/** Brouillon de prière conservé entre rendus ; seul le Store peut confirmer une conséquence. */
import {getAllDivineContracts} from '../core/v5-divine-store.js';
import {resolveV5ConditionTestContext} from '../core/v5-test-context.js';
import {isBrokenActor,renderBrokenEscapeVisibilityControl} from './v5-broken-escape-panel.js';
const node=(tag,klass,text)=>{const el=document.createElement(tag);if(klass)el.className=klass;if(text!==undefined)el.textContent=text;return el;};
const clone=value=>structuredClone(value);
const labels={implemented:'Effet calculable',assisted:'Effets calculés + rappels MJ',manual:'Effet assisté / rappel MJ',blocked:'Source ou arbitrage requis'};
function unitText(value,unit){
 if(unit==='yards')return `${value} mètres de jeu (source V5 : ${value} yards)`;
 return `${value}${unit?' '+({rounds:'Rounds',minutes:'minutes',hours:'heures',days:'jours',miles:'miles',allies:'alliés',targets:'cibles',meters:'mètres'}[unit]||unit):''}`;
}
function paramText(param,actor){
 if(!param)return 'À préciser';if(param.kind==='self')return 'Vous';if(param.kind==='instant'||param.unit==='instant')return 'Instantané';if(param.kind==='touch')return 'Contact';if(param.kind==='special')return param.sourceText==='Touch'?'Contact':'Spécial';
 const stat=param.characteristic||param.characteristicBonus;let value=param.value;
 if(param.kind==='characteristic'||param.kind==='area'&&param.characteristic)value=actor.caracs?.[stat];
 if(param.kind==='characteristic-bonus'||param.kind==='area'&&param.characteristicBonus)value=Number.isFinite(Number(actor.caracs?.[stat]))?Math.floor(Number(actor.caracs[stat])/10):null;
 if(value===undefined||value===null)return param.sourceText||'À préciser';
 return (param.kind==='area'?'Zone de ':'')+unitText(value,param.unit);
}
function resolvedParamText(value){
 if(value.value===null||value.value===undefined)return {self:'Vous',special:'Spécial',instant:'Instantané'}[value.unit]||'Spécial';
 if(value.unit==='touch')return 'Contact';
 return unitText(value.value,value.unit);
}
export function createDivinePanel({Store,refresh}){
 let state={actorId:null,open:false,cult:'',targetIds:[],facts:{},choices:{range:0,targets:0,duration:0,effect:0}};
 function reset(actor){state={actorId:actor.id,open:state.open,cult:'',contractId:getAllDivineContracts().find(row=>row.type==='blessing')?.id,targetIds:[],facts:{},choices:{range:0,targets:0,duration:0,effect:0},sinEdit:actor.extensions?.v5?.divine?.sin??'',sinReason:'',roll:'',wrathRoll:'',wrathDurationRoll:'',wrathConsequence:'',expiryPhase:'',canSpeak:null,accessScope:'',accessReason:'',revokeReason:'',conditionPenaltyMode:'',conditionPenaltyReason:'',testOptionId:'',brokenEscapeVisibility:null,preview:null,busy:false,error:''};}
 function change(key,value){state[key]=value;if(key!=='testOptionId')state.testOptionId='';state.preview=null;state.error='';refresh();}
 function invalidateEditedForm(input){
  const panel=input.closest('[data-divine-panel]');if(!panel)return;
  const apply=panel.querySelector('[data-divine-action="apply"]');if(apply)apply.disabled=true;
  const saveSin=panel.querySelector('[data-divine-action="sin"]');if(saveSin)saveSin.disabled=state.busy||state.sinEdit==='';
  const grantAccess=panel.querySelector('[data-divine-action="grant-access"]');if(grantAccess)grantAccess.disabled=state.busy||!state.accessScope||!state.accessReason.trim();
  panel.querySelectorAll('[data-divine-action="revoke-access"]').forEach(button=>button.disabled=state.busy||!state.revokeReason.trim());
  if(!state.preview)panel.querySelector('.workspace-divine-preview')?.remove();
  panel.querySelector('[role="alert"]')?.remove();
 }
 function field(container,label,key,{type='number',min=0,max=null}={}){
  const wrap=node('label','workspace-type',label),input=node('input');input.type=type;if(type==='number'){input.min=min;input.step='1';if(max!==null)input.max=max;}
  input.setAttribute('aria-label',label);input.dataset.focusKey='divine-'+key;input.value=state[key]??'';
  input.addEventListener('input',()=>{state[key]=input.value;if(!key.startsWith('wrath'))state.testOptionId='';state.preview=key.startsWith('wrath')&&state.preview?{...state.preview,ready:false}:null;state.error='';invalidateEditedForm(input);});
  wrap.append(input);container.append(wrap);return input;
 }
 function select(container,label,value,options,handler,key){
  const wrap=node('label','workspace-type',label),input=node('select');input.setAttribute('aria-label',label);input.dataset.focusKey='divine-'+(key||label);
  for(const [id,text] of options)input.append(new Option(text,id));input.value=value??'';input.addEventListener('change',()=>handler(input.value));wrap.append(input);container.append(wrap);return input;
 }
 const errorText=error=>error?.userFacing?error.message:(error?.message||'Commande divine non appliquée.');
 async function run(work){if(state.busy)return;state.busy=true;state.error='';refresh();try{await work();}catch(error){state.error=errorText(error);}finally{state.busy=false;refresh();}}
 function button(container,label,handler,disabled=false,key){const el=node('button','workspace-primary',label);el.type='button';el.disabled=disabled||state.busy;if(key)el.dataset.divineAction=key;el.addEventListener('click',handler);container.append(el);return el;}
 function prayerInput(actor,contract){
  const self=contract.params?.targets?.kind==='self' || contract.params?.sourceTarget==='You';
  const combat=Store.getCombat(),round=Number(combat.round)||1;
  let duration=contract.params?.duration?.value;
  if(contract.params?.duration?.characteristicBonus)duration=Math.floor(Number(actor.caracs?.[contract.params.duration.characteristicBonus])/10);
  if(contract.params?.duration?.kind==='characteristic-bonus')duration=Math.floor(Number(actor.caracs?.[contract.params.duration.characteristic])/10);
  if(contract.params?.duration?.formula==='BSoc' || /Fellowship Bonus/.test(contract.params?.duration?.sourceText||''))duration=Math.floor(Number(actor.caracs?.Soc)/10);
  if(contract.type==='blessing')duration=(Number(duration)||6)+6*Number(state.choices.duration||0);
  else if(Number.isFinite(duration))duration=duration*(1+Number(state.choices.duration||0));
  const expiry=state.expiryPhase && Number.isSafeInteger(duration)&&duration>0?{phase:state.expiryPhase,round:round+duration-1,...(state.expiryPhase==='endOfTurn'?{actorId:actor.id}:{}),moment:'afterEffects'}:undefined;
  return {actorId:actor.id,targetIds:self?[actor.id]:state.targetIds.slice(),roll:state.roll===''?undefined:Number(state.roll),canSpeak:state.canSpeak,
   wrathRoll:state.wrathRoll===''?undefined:Number(state.wrathRoll),wrathDurationRoll:state.wrathDurationRoll===''?undefined:Number(state.wrathDurationRoll),wrathConsequences:state.wrathConsequence.trim(),
   testOptionId:state.testOptionId||undefined,conditionContext:{conditionPenaltyMode:state.conditionPenaltyMode||undefined,conditionPenaltyReason:state.conditionPenaltyReason},
   choices:clone(state.choices),facts:{targets:clone(state.facts)},...(isBrokenActor(actor)&&typeof state.brokenEscapeVisibility==='boolean'?{brokenEscapeFacts:{visibleToAnyEnemy:state.brokenEscapeVisibility}}:{}),expiry};
 }
 return {render(actor,participants=[]){
  if(!actor)return null;if(state.actorId!==actor.id)reset(actor);
  const allContracts=getAllDivineContracts().filter(row=>['blessing','miracle'].includes(row.type));
  const cults=[...new Set(allContracts.map(row=>row.deity).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  const contracts=state.cult?allContracts.filter(row=>row.deity===state.cult):allContracts;
  const contract=contracts.find(row=>row.id===state.contractId)||contracts[0];if(!contract)return null;
  const panel=node('details','workspace-card workspace-divine');panel.dataset.divinePanel='';panel.open=state.open;
  panel.addEventListener('toggle',()=>{state.open=panel.open;});
  for(const type of ['input','change','click'])panel.addEventListener(type,()=>{if(panel.open)state.open=true;},true);
  panel.append(node('summary','workspace-rubric','Prières divines · '+actor.name));
  const content=node('div','workspace-divine-content');panel.append(content);
  if(cults.length>1)select(content,'Culte',state.cult,[['','Tous les cultes'],...cults.map(cult=>[cult,cult])],value=>{state.cult=value;state.targetIds=[];state.facts={};state.choices={range:0,targets:0,duration:0,effect:0};state.accessScope='';state.accessReason='';change('contractId',(value?allContracts.filter(row=>row.deity===value):allContracts)[0]?.id);},'cult');
  select(content,'Prière divine',contract.id,contracts.map(row=>[row.id,row.name+(row.type==='blessing'&&row.deity?' ('+row.deity+')':'')+' · '+(labels[row.status]||row.status)]),value=>{state.targetIds=[];state.facts={};state.choices={range:0,targets:0,duration:0,effect:0};state.accessScope='';state.accessReason='';change('contractId',value);},'prayer');
  content.append(node('p','workspace-muted',(labels[contract.status]||contract.status)+' · '+(contract.deity||'Culte à préciser')));
  content.append(node('p','',contract.labels?.effect||''));
  if(contract.sourceDelta&&contract.status!=='blocked')content.append(node('p','workspace-muted','La règle V5 est présentée ici ; le texte du catalogue de consultation doit encore être actualisé.'));
  if(contract.status!=='blocked')content.append(node('p','workspace-muted',`Portée : ${paramText(contract.params?.range,actor)} · Cibles : ${paramText(contract.params?.targets,actor)} · Durée : ${paramText(contract.params?.duration,actor)}`));
  const source=contract.source;
  const sourceLabel=source?.document?`${source.document}${source.edition?' · '+source.edition:''}${source.printedPage?' · p. '+[].concat(source.printedPage).join(', '):''}`:'Source originale non retrouvée';
  content.append(node('p','workspace-muted','Source : '+sourceLabel+(source?.sourceStatus==='found-adaptation-blocked'?' · adaptation V4 retrouvée, contrat V5 bloqué jusqu’à arbitrage.':'')));
  const sin=node('details','workspace-v5-context-details');sin.append(node('summary','','Péchés : '+(actor.extensions?.v5?.divine?.sin??'à renseigner')));content.append(sin);
  field(sin,'Total de Péchés','sinEdit');field(sin,'Raison de l’ajustement des Péchés','sinReason',{type:'text'});
  button(sin,'Enregistrer les Péchés',()=>run(async()=>{const result=await Store.setDivineSin(actor.id,Number(state.sinEdit),{reason:state.sinReason,baseRevision:Store.getLocalRevision()});if(result?.ok===false)throw Error(result.error||'Péchés non enregistrés.');state.preview=null;}),state.sinEdit==='','sin');
  const active=participants.flatMap(target=>(target.extensions?.v5?.divineEffects||[]).filter(layer=>layer.casterId===actor.id).map(layer=>({...layer,targetName:target.name})));
  if(active.length){
   const list=node('details','workspace-v5-context-details');list.append(node('summary','','Prières actives du personnage'));field(list,'Raison de fin de prière','endReason',{type:'text'});
   for(const id of [...new Set(active.map(layer=>layer.executionId))]){
    const layers=active.filter(layer=>layer.executionId===id),name=contracts.find(row=>row.id===layers[0].prayerId)?.name||'Prière';
    list.append(node('p','',name+' · '+[...new Set(layers.map(layer=>layer.targetName))].join(', ')));
    button(list,'Terminer '+name,()=>run(async()=>{const result=await Store.endDivinePrayer(id,{reason:state.endReason,baseRevision:Store.getLocalRevision()});if(result?.ok===false)throw Error(result.error||'Fin non enregistrée.');state.preview=null;}),false,'end');
   }content.append(list);
  }
  if(contract.status==='blocked')return panel;
  const access=Store.resolveDivineAccess(actor.id,contract.id);
  const accessBox=node('details','workspace-v5-context-details');accessBox.open=!access.allowed;
  accessBox.append(node('summary','','Accès à la prière'));
  accessBox.append(node('p',access.allowed?'workspace-muted':'workspace-field-error',access.reason||'Accès non établi.'));
  if(access.mode==='grant')accessBox.append(node('p','workspace-muted','Dérogation '+({once:'une utilisation',scene:'scène active',durable:'durable jusqu’à révocation'}[access.scope]||'')+' · le contenu du contrat reste soumis à ses sources et préconditions.'+(contract.status==='manual'?' L’effet reste un rappel MJ.':'')));
  const activeGrants=Store.getDivineAccessGrants(actor.id).filter(row=>row.prayerId===contract.id&&row.status==='active');
  if(activeGrants.length){
   field(accessBox,'Raison de révocation','revokeReason',{type:'text'});
   for(const grant of activeGrants){
    accessBox.append(node('p','workspace-muted',`${grant.scope==='once'?'Une utilisation':grant.scope==='scene'?'Scène active':'Durable jusqu’à révocation'} · ${grant.reason} · décision MJ`));
    button(accessBox,'Révoquer cette dérogation',()=>run(async()=>{const result=await Store.revokeDivineAccessGrant(grant.id,{reason:state.revokeReason,baseRevision:Store.getLocalRevision()});if(!result.ok)throw Error(result.error||'Révocation refusée.');state.preview=null;state.revokeReason='';}),false,'revoke-access');
   }
  }
  if(!access.allowed){
   const scene=Store.getActiveScene?.();const scopes=[['','Choisir la portée'],['once','Une utilisation']];if(scene?.status==='active'&&scene.id)scopes.push(['scene','Scène active']);scopes.push(['durable','Durable jusqu’à révocation']);
   select(accessBox,'Portée de la dérogation',state.accessScope,scopes,value=>change('accessScope',value),'access-scope');
   field(accessBox,'Motif de la décision du MJ','accessReason',{type:'text'});
   button(accessBox,'Accorder cette dérogation',()=>run(async()=>{const result=await Store.grantDivineAccess(actor.id,contract.id,{scope:state.accessScope,reason:state.accessReason,baseRevision:Store.getLocalRevision()});if(!result.ok)throw Error(result.error||'Dérogation refusée.');state.preview=null;state.accessScope='';state.accessReason='';}),!state.accessScope||!state.accessReason.trim(),'grant-access');
   accessBox.append(node('p','workspace-muted','Cette exception autorise uniquement cette prière pour ce sujet; elle ne débloque pas une source ni n’ajoute de mécanique.'));
  }
  const conditionResult=resolveV5ConditionTestContext(actor,{characteristic:'Soc',isAction:true,involvesMovement:false,
   runningOrHiding:false,requiresSight:false,reliesOnSight:false,conditionPenaltyMode:state.conditionPenaltyMode||undefined,
   conditionPenaltyReason:state.conditionPenaltyReason});
  const needsPenaltyArbitration=conditionResult.needsInput.some(row=>['conditionPenaltyMode','conditionPenaltyReason'].includes(row.field))
   ||Boolean(conditionResult.arbitration);
  if(Object.keys(conditionResult.levels).length||conditionResult.needsInput.length||conditionResult.restrictions.length){
   const conditions=node('details','workspace-v5-context-details');conditions.open=!conditionResult.ready||conditionResult.ignoredPenaltySources.length>0;
   conditions.append(node('summary','','États appliqués au Test de Prière (Soc)'));
   const penalties=[...conditionResult.slModifiers.map(row=>`${row.amount} DR · ${row.label}`),
    ...conditionResult.disadvantageSources.map(row=>`Désavantage · ${row.label}`),...conditionResult.advantageSources.map(row=>`Avantage · ${row.label}`)];
   if(penalties.length)conditions.append(node('p','workspace-muted',penalties.join(' · ')));
   for(const source of conditionResult.ignoredPenaltySources)conditions.append(node('p','workspace-muted',`${source.label} · ${source.source.document}, p. ${source.source.printedPage}.`));
   if(conditionResult.restrictions.length)conditions.append(node('p','workspace-field-error',conditionResult.restrictions.join(' ')));
   if(needsPenaltyArbitration||conditionResult.needsInput.some(row=>row.field==='conditionPenaltyMode')){
    select(conditions,'Arbitrage DIV-05 pour pénalités incomparables',state.conditionPenaltyMode,
     [['','Choisir pour ce Test'],['sl','Retenir le plus fort malus en DR'],['disadvantage','Retenir le Désavantage']],value=>change('conditionPenaltyMode',value),'condition-mode');
   }
   if(needsPenaltyArbitration||conditionResult.needsInput.some(row=>row.field==='conditionPenaltyReason'))
    field(conditions,'Motif de l’arbitrage MJ DIV-05','conditionPenaltyReason',{type:'text'});
   if(conditionResult.needsInput.some(row=>!['conditionPenaltyMode','conditionPenaltyReason'].includes(row.field)))
    conditions.append(node('p','workspace-field-error',conditionResult.needsInput.filter(row=>!['conditionPenaltyMode','conditionPenaltyReason'].includes(row.field)).map(row=>row.label).join(' ')));
   content.append(conditions);
  }
  content.append(accessBox);  const form=node('div','workspace-resolution-row');content.append(form);
  const brokenVisibility=renderBrokenEscapeVisibilityControl({actor,value:state.brokenEscapeVisibility,onChange:value=>{state.brokenEscapeVisibility=value;state.preview=null;state.error='';refresh();},key:'prayer'});if(brokenVisibility)form.append(brokenVisibility);
  select(form,'Le personnage peut prononcer la prière',state.canSpeak===null?'':String(state.canSpeak),[['','À préciser'],['true','Oui'],['false','Non']],value=>change('canSpeak',value===''?null:value==='true'),'voice');
  field(form,'Jet de Prière (d100)','roll',{min:1,max:100});
  const self=contract.params?.targets?.kind==='self'||contract.params?.sourceTarget==='You';
  if(self)content.append(node('p','workspace-muted','Cible : le personnage priant.'));
  else{
   const targets=node('fieldset','workspace-resolution-row');targets.append(node('legend','','Destinataires de la prière'));
   for(const participant of participants.filter(row=>row.zone==='active')){
    const wrap=node('label','workspace-type'),check=node('input');check.type='checkbox';check.checked=state.targetIds.includes(participant.id);check.setAttribute('aria-label','Destinataire '+participant.name);
    check.addEventListener('change',()=>{state.targetIds=check.checked?[...state.targetIds,participant.id]:state.targetIds.filter(id=>id!==participant.id);state.preview=null;refresh();});wrap.append(check,document.createTextNode(participant.name));targets.append(wrap);
    if(check.checked){
     const facts=state.facts[participant.id]||{},group=node('div','workspace-divine-target-facts');
     const rules=[contract.params?.range?.kind==='touch'?['withinTouch','Cible à portée de contact']:['withinRange','Portée / zone confirmée'],...(contract.type==='miracle'&&contract.id.endsWith('soleil-flamboyant')?[['nonMyrmidian','Ne vénère pas Myrmidia'],['lookingAtPriest','Regarde le prêtre']]:[['ally','Allié admissible']])];
     for(const [key,text] of rules)select(group,participant.name+' · '+text,facts[key]===undefined?'':String(facts[key]),[['','À préciser'],['true','Oui'],['false','Non']],value=>{state.facts[participant.id]={...facts,[key]:value===''?undefined:value==='true'};state.preview=null;refresh();},participant.id+'-'+key);
     targets.append(group);
    }
   }
   content.append(targets);
  }
  const extension=node('details','workspace-v5-context-details');extension.append(node('summary','','Extensions de la prière'));
  const declared=new Set((contract.extensions||[]).flatMap(row=>row.choices||[]).map(row=>row.param||Object.keys(row)[0]));
  for(const [key,text] of [['range','Extensions de portée'],['targets','Extensions de destinataires'],['duration','Extensions de durée'],['effect','Extensions propres à l’effet']]){
   if(!declared.has(key))continue;
   const label=node('label','workspace-type',text),input=node('input');input.type='number';input.min='0';input.step='1';input.value=state.choices[key];input.setAttribute('aria-label',text);input.dataset.focusKey='divine-choice-'+key;
   input.addEventListener('input',()=>{state.choices[key]=input.value===''?0:Number(input.value);state.preview=null;state.error='';invalidateEditedForm(input);});label.append(input);extension.append(label);
  }content.append(extension);
  const instant=contract.params?.duration?.unit==='instant'||contract.params?.duration?.kind==='instant';
  if(!instant)select(content,'Fin de l’effet (choix du MJ)',state.expiryPhase,[['','À préciser'],['endOfTurn','Fin du Tour du prêtre'],['endOfRound','Fin de Round']],value=>change('expiryPhase',value),'expiry');
  const actions=node('div','workspace-resolution-row');content.append(actions);
  button(actions,'Calculer la prière',()=>{state.error='';try{state.preview=Store.previewDivineExecution(contract.id,prayerInput(actor,contract));}catch(error){state.error=errorText(error);}refresh();},false,'calculate');
  button(actions,'Appliquer la prière',()=>run(async()=>{const result=await Store.applyDivineExecution(contract.id,{preview:state.preview});if(result?.ok===false || result?.ready===false)throw Error(result.error||'Prière non appliquée.');state.preview=null;state.roll='';state.wrathRoll='';state.wrathDurationRoll='';}),!state.preview?.ready,'apply');
  if(state.preview){
   const result=state.preview,preview=result.preview;
   const outcome=node('div','workspace-divine-preview');outcome.setAttribute('role','status');
   if(preview?.prayer)outcome.append(node('p','',`${preview.prayer.success?'Prière réussie':'Prière ratée'} · ${preview.prayer.sl} DR · score ${preview.skillScore}`));
   if(preview?.prayerSLAdjustment)outcome.append(node('p','workspace-muted',`Courroux « Pensez à vos actes » · ${preview.prayerSLAdjustment.rawSL} DR bruts → ${preview.prayerSLAdjustment.effectiveSL} DR appliqués · plafond de +0 pendant huit jours impériaux.`));
   if(preview?.prayer?.reversed)outcome.append(node('p','workspace-muted',`Désavantage : jet inversé ${preview.prayer.initialRoll} → ${preview.prayer.roll}.`));
   if(preview?.testOptions?.length&&result.needsInput?.some(row=>row.field==='testOptionId'))
    select(outcome,'Choix du jet favorable',state.testOptionId,preview.testOptions.map(option=>[option.id,option.id==='reverse'?`Inverser → ${option.result.roll}`:`Garder → ${option.result.roll}`]),value=>change('testOptionId',value),'test-option');
   if(preview?.resolvedParams)outcome.append(node('p','workspace-muted','Après extensions : '+Object.entries(preview.resolvedParams).map(([key,value])=>({range:'portée',targets:'cibles',duration:'durée'}[key]||key)+' '+resolvedParamText(value)).join(' · ')));
   if(result.error)outcome.append(node('p','workspace-field-error',result.error));
   for(const missing of result.needsInput||[])outcome.append(node('p','workspace-muted',typeof missing==='string'?missing:missing.label||missing.field));
   for(const reminder of preview?.reminders||[])outcome.append(node('p','workspace-muted',reminder));
   if(preview?.wrath?.triggered){
    outcome.append(node('p','workspace-field-error','Courroux divin déclenché · +'+(10*preview.wrath.sinAtTest)+' au résultat de table.'));
    field(outcome,'Jet de Courroux (d100)','wrathRoll',{min:1,max:100});
    if(result.wrathTableResult?.id==='wrath:6-10'){
     outcome.append(node('p','workspace-muted','Pensez à vos actes · sanction automatique : Tests de Prière réussis plafonnés à +0 DR jusqu’à la fin des huit jours impériaux suivants. Aucun texte libre MJ requis. Source : Livre de base V5 EN, p. 218; semaine impériale : p. 177 et 289.'));
    }else if(result.wrathTableResult?.id==='wrath:11-15'){
     outcome.append(node('p','workspace-muted','Leçons divines · malus automatique de −1 DR aux futurs Tests de Prière. Le Round actuel compte comme premier; la sanction prend fin après les effets du dernier Round.'));
     field(outcome,'Jet de durée (d10)','wrathDurationRoll',{min:1,max:10});
     if(result.wrathLessonDuration)outcome.append(node('p','workspace-muted',`Durée : ${result.wrathLessonDuration.roll} + ${result.wrathLessonDuration.sinAtTrigger} Péché(s) = ${result.wrathLessonDuration.rounds} Round(s); fin après les effets du Round ${result.wrathLessonDuration.expiryRound}.`));
    }else if(['wrath:61-65','wrath:89-95'].includes(result.wrathTableResult?.id)){
     const condition=result.wrathConditionPreview,projection=condition?.projection;
     if(condition&&projection){
      const label=condition.requested.condition==='hemorragique'?'Hémorragique':'Brisé';
      outcome.append(node('p','workspace-muted',`${result.wrathTableResult.label} · ${condition.requested.count} état(s) ${label} demandé(s), Péchés avant décrément.`));
      outcome.append(node('p','workspace-muted',projection.immunized?'Immunité : aucun état ne sera acquis à l’application.':`${projection.acquiredCount} état(s) ${label} seront acquis sur le prêtre à l’application.`));
      if(projection.momentumBefore&&!projection.momentumAfter)outcome.append(node('p','workspace-muted','Le Momentum sera perdu à l’application des États.'));
      for(const reminder of projection.reminders||[])outcome.append(node('p','workspace-muted',reminder));
      if(condition.requested.condition==='brise')outcome.append(node('p','workspace-muted','Le panneau Brisé de Jouer exécute Move (Flee) puis Action (Sprint) tant que le personnage reste visible d’au moins un ennemi. Fuite engagée : bloquée jusqu’au raccordement de Momentum, Brisé des ennemis et attaques gratuites. Après confirmation hors de vue de tous les ennemis, Hide reste facultatif et passe par un Test normal de Compétence. Une acquisition après une Action déjà dépensée reste bloquée par DIV-BROKEN-MIDTURN-01 pour décision MJ explicite, sans Action supplémentaire ni report. Source : Livre de base V5 EN, p. 163, 185–186.'));
      if(condition.requested.condition==='hemorragique')outcome.append(node('p','workspace-muted','Hémorragique inflige ses pertes de Blessures à la fin du Round selon l’État commun. Source : Livre de base V5 EN, p. 185.'));
     }
    }else{
     field(outcome,'Conséquences du Courroux traitées par le MJ','wrathConsequence',{type:'text'});
     if(result.wrathTableResult)outcome.append(node('p','workspace-muted',(result.wrathTableResult.label||'Résultat du Courroux')+' · '+(result.wrathTableResult.reminder||'')));
    }
   }
   content.append(outcome);
  }
  if(state.error){const message=node('p','workspace-field-error',state.error);message.setAttribute('role','alert');content.append(message);}
  return panel;
 }};
}





