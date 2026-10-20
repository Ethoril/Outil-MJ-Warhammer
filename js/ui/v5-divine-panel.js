/** Brouillon de prière conservé entre rendus ; seul le Store peut confirmer une conséquence. */
import {getAllDivineContracts} from '../core/v5-divine-store.js';
import {resolveV5ConditionTestContext} from '../core/v5-test-context.js';
import {isBrokenActor,renderBrokenEscapeVisibilityControl} from './v5-broken-escape-panel.js';
import {emptyDivineForm,buildDivineForm,toEngineInput,buildExpiry,isSelfTargeted,classifyNeeds,describeEffectResult,summonLayerLabel,summarizeExecution,deadlineLines,fieldValue,setFieldValue,focusKey} from './v5-divine-form-model.js';
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
 let state={actorId:null,open:false,cult:'',targetIds:[],form:emptyDivineForm(),lastReceipt:null,choices:{range:0,targets:0,duration:0,effect:0}};
 function reset(actor){state={actorId:actor.id,open:state.open,cult:'',contractId:getAllDivineContracts().find(row=>row.type==='blessing')?.id,targetIds:[],form:emptyDivineForm(),lastReceipt:null,choices:{range:0,targets:0,duration:0,effect:0},sinEdit:actor.extensions?.v5?.divine?.sin??'',sinReason:'',roll:'',wrathRoll:'',wrathDurationRoll:'',wrathConsequence:'',expiryPhase:'',canSpeak:null,accessScope:'',accessReason:'',revokeReason:'',conditionPenaltyMode:'',conditionPenaltyReason:'',testOptionId:'',brokenEscapeVisibility:null,preview:null,busy:false,error:''};}
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
 function formField(container,field,invalid){
  const wrap=node('label','workspace-type',field.label),help=node('small','workspace-divine-help',field.help);help.id='divine-help-'+focusKey(field.id);
  let input;
  if(field.kind==='select'||field.kind==='tri'){
   input=node('select');for(const [id,text] of field.kind==='tri'?[['','À préciser'],['true','Oui'],['false','Non']]:field.options)input.append(new Option(text,id));
   input.value=fieldValue(state.form,field);if(field.empty)input.disabled=true;
   input.addEventListener('change',()=>{setFieldValue(state.form,field,input.value);state.testOptionId='';state.preview=null;state.error='';refresh();});
  }else if(field.kind==='check'){
   input=node('input');input.type='checkbox';input.checked=fieldValue(state.form,field)===true;wrap.className='workspace-type workspace-recipient-check';
   input.addEventListener('change',()=>{setFieldValue(state.form,field,input.checked);state.preview=null;state.error='';invalidateEditedForm(input);});
  }else{
   input=node('input');input.type=field.kind==='text'?'text':'number';input.min=field.min??0;input.step='1';if(field.max!==undefined)input.max=field.max;input.value=fieldValue(state.form,field);
   input.addEventListener('input',()=>{setFieldValue(state.form,field,input.value);state.testOptionId='';state.preview=null;state.error='';invalidateEditedForm(input);});
  }
  input.setAttribute('aria-label',field.label);input.setAttribute('aria-describedby',help.id);input.dataset.focusKey=focusKey(field.anchor);
  if(invalid)input.setAttribute('aria-invalid','true');
  wrap.append(input,help);container.append(wrap);return input;
 }
 function focusAnchor(panel,anchor){
  const key=focusKey(anchor);const target=panel.querySelector('[data-focus-key="'+key+'"]')||panel.querySelector('[data-focus-key="divine-'+anchor+'"]');
  if(target){target.scrollIntoView?.({block:'center'});target.focus();}
 }
 const errorText=error=>error?.userFacing?error.message:(error?.message||'Commande divine non appliquée.');
 async function run(work){if(state.busy)return;state.busy=true;state.error='';refresh();try{await work();}catch(error){state.error=errorText(error);}finally{state.busy=false;refresh();}}
 function button(container,label,handler,disabled=false,key){const el=node('button','workspace-primary',label);el.type='button';el.disabled=disabled||state.busy;if(key)el.dataset.divineAction=key;el.addEventListener('click',handler);container.append(el);return el;}
 function prayerInput(actor,contract){
  const self=contract.params?.targets?.kind==='self' || contract.params?.sourceTarget==='You';
  const combat=Store.getCombat(),round=Number(combat.round)||1;
  const targetIds=self?[actor.id]:state.targetIds.slice();
  const expiry=buildExpiry({contract,actor,choices:state.choices,round,phase:state.expiryPhase,manualRounds:state.form.expiryRounds});
  return {actorId:actor.id,targetIds,roll:state.roll===''?undefined:Number(state.roll),canSpeak:state.canSpeak,
   wrathRoll:state.wrathRoll===''?undefined:Number(state.wrathRoll),wrathDurationRoll:state.wrathDurationRoll===''?undefined:Number(state.wrathDurationRoll),wrathConsequences:state.wrathConsequence.trim(),
   testOptionId:state.testOptionId||undefined,conditionContext:{conditionPenaltyMode:state.conditionPenaltyMode||undefined,conditionPenaltyReason:state.conditionPenaltyReason},
   choices:clone(state.choices),...toEngineInput(state.form,{targetIds,contract,actor}),...(isBrokenActor(actor)&&typeof state.brokenEscapeVisibility==='boolean'?{brokenEscapeFacts:{visibleToAnyEnemy:state.brokenEscapeVisibility}}:{}),expiry};
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
  if(cults.length>1)select(content,'Culte',state.cult,[['','Tous les cultes'],...cults.map(cult=>[cult,cult])],value=>{state.cult=value;state.targetIds=[];state.form=emptyDivineForm();state.lastReceipt=null;state.choices={range:0,targets:0,duration:0,effect:0};state.accessScope='';state.accessReason='';change('contractId',(value?allContracts.filter(row=>row.deity===value):allContracts)[0]?.id);},'cult');
  select(content,'Prière divine',contract.id,contracts.map(row=>[row.id,row.name+(row.type==='blessing'&&row.deity?' ('+row.deity+')':'')+(row.aspect?' ['+row.aspect+']':'')+' · '+(labels[row.status]||row.status)]),value=>{state.targetIds=[];state.form=emptyDivineForm();state.lastReceipt=null;state.choices={range:0,targets:0,duration:0,effect:0};state.accessScope='';state.accessReason='';change('contractId',value);},'prayer');
  content.append(node('p','workspace-muted',(labels[contract.status]||contract.status)+' · '+(contract.deity||'Culte à préciser')+(contract.aspect?' · Aspect : '+contract.aspect:'')));
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
    list.append(node('p','',[name+' · '+[...new Set(layers.map(layer=>layer.targetName))].join(', '),...layers.map(layer=>summonLayerLabel(layer,participants)).filter(Boolean)].join(' · ')));
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
  const effectTargets=isSelfTargeted(contract)?[actor]:participants.filter(row=>row.zone==='active'&&state.targetIds.includes(row.id));
  const model=buildDivineForm(contract,{actor,targets:effectTargets,form:state.form,choices:state.choices}),descr=model.descr;
  const needs=state.preview&&!state.preview.ready?classifyNeeds(state.preview.needsInput||[],{targets:effectTargets,fields:model.effectFields}):[];
  const blocking=new Set(needs.map(row=>row.anchor).filter(Boolean));
  const factsGroup=(container,fields)=>{const group=node('div','workspace-divine-target-facts');for(const fact of fields)formField(group,fact,blocking.has(fact.anchor));container.append(group);};
  if(descr.implicitTarget){
   content.append(node('p','workspace-muted','Cible : le prêtre (cible implicite).'));
  }else if(descr.selfTargeted){
   content.append(node('p','workspace-muted','Cible : le personnage priant.'));
   if(model.factFields[actor.id])factsGroup(content,model.factFields[actor.id]);
  }else{
   const targets=node('fieldset','workspace-resolution-row');targets.append(node('legend','','Destinataires de la prière'));
   if(descr.targetLimit!==null)targets.append(node('p','workspace-muted',`Jusqu’à ${descr.targetLimit} destinataire(s) avant extensions.`));
   for(const [index,participant] of participants.filter(row=>row.zone==='active').entries()){
    const wrap=node('label','workspace-type'),check=node('input');check.type='checkbox';check.checked=state.targetIds.includes(participant.id);check.setAttribute('aria-label','Destinataire '+participant.name);
    if(!index)check.dataset.focusKey='divine-targets';
    check.addEventListener('change',()=>{state.targetIds=check.checked?[...state.targetIds,participant.id]:state.targetIds.filter(id=>id!==participant.id);state.preview=null;refresh();});wrap.append(check,document.createTextNode(participant.name));targets.append(wrap);
    if(check.checked&&model.factFields[participant.id])factsGroup(targets,model.factFields[participant.id]);
   }
   for(const text of model.warnings){const warning=node('p','workspace-field-error',text);warning.setAttribute('role','status');targets.append(warning);}
   content.append(targets);
  }
  const durationField=model.effectFields.find(row=>row.id==='expiryRounds'),effectFields=model.effectFields.filter(row=>row!==durationField);
  if(effectFields.length||model.info.length||model.notes.length){
   const effects=node('fieldset','workspace-divine-effects');effects.append(node('legend','','Saisies des effets'));
   for(const text of model.info)effects.append(node('p','workspace-muted',text));
   for(const fieldDef of effectFields.filter(row=>row.scope==='global'))formField(effects,fieldDef,blocking.has(fieldDef.anchor));
   for(const target of effectTargets){const rows=effectFields.filter(row=>row.targetId===target.id);if(!rows.length)continue;const group=node('div','workspace-divine-target-facts');for(const fieldDef of rows)formField(group,fieldDef,blocking.has(fieldDef.anchor));effects.append(group);}
   if(model.notes.length)effects.append(node('p','workspace-muted','Conditions de cible à vérifier (rappels MJ) : '+model.notes.join(' · ')+'.'));
   content.append(effects);
  }
  const extension=node('details','workspace-v5-context-details');extension.append(node('summary','','Extensions de la prière'));
  if(!model.extensions.length)extension.append(node('p','workspace-muted','Aucune extension (+2 DR) utilisable pour cette prière.'));
  for(const row of model.extensions){
   const label=node('label','workspace-type',row.label),input=node('input'),help=node('small','workspace-divine-help',row.help);help.id='divine-help-choice-'+row.key;input.type='number';input.min='0';input.step='1';input.value=state.choices[row.key];input.setAttribute('aria-label',row.label);input.setAttribute('aria-describedby',help.id);input.dataset.focusKey='divine-choice-'+row.key;
   input.addEventListener('input',()=>{state.choices[row.key]=input.value===''?0:Number(input.value);state.preview=null;state.error='';invalidateEditedForm(input);});label.append(input,help);extension.append(label);
  }
  const budget=state.preview?.preview?.extensionBudget;
  if(budget&&model.extensions.length)extension.append(node('p','workspace-muted',`Paliers de +2 DR dépensés : ${budget.spent} sur ${budget.available}.`));
  if(blocking.has('extensions'))extension.open=true;
  content.append(extension);
  if(descr.expiryField)select(content,'Fin de l’effet (choix du MJ)',state.expiryPhase,[['','À préciser'],['endOfTurn','Fin du Tour du prêtre'],['endOfRound','Fin de Round']],value=>change('expiryPhase',value),'expiry');
  if(durationField)formField(content,durationField,blocking.has('expiryRounds'));
  if(descr.calendarDuration)content.append(node('p','workspace-muted','Durée en minutes, heures ou jours : l’échéance est calculée sur l’horloge de jeu au moment de l’aperçu.'));
  const actions=node('div','workspace-resolution-row');content.append(actions);
  button(actions,'Calculer la prière',()=>{state.error='';state.lastReceipt=null;try{state.preview=Store.previewDivineExecution(contract.id,prayerInput(actor,contract));}catch(error){state.error=errorText(error);}refresh();},false,'calculate');
  button(actions,'Appliquer la prière',()=>run(async()=>{const result=await Store.applyDivineExecution(contract.id,{preview:state.preview});if(result?.ok===false || result?.ready===false)throw Error(result.error||'Prière non appliquée.');state.lastReceipt=summarizeExecution(result.receipt,{contract,participants});state.preview=null;state.roll='';state.wrathRoll='';state.wrathDurationRoll='';Object.assign(state.form,{damageRoll:'',damageRolls:{},removals:{},healCount:''});}),!state.preview?.ready,'apply');
  if(state.lastReceipt){
   const receipt=node('div','workspace-divine-receipt');receipt.setAttribute('role','status');receipt.append(node('p','workspace-rubric','Dernier résultat · '+state.lastReceipt.title));
   if(state.lastReceipt.lines.length){const list=node('ul');for(const line of state.lastReceipt.lines)list.append(node('li','',line));receipt.append(list);}
   for(const reminder of state.lastReceipt.reminders)receipt.append(node('p','workspace-muted',reminder));
   content.append(receipt);
  }
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
   if(needs.length){
    const box=node('div','workspace-divine-needs');box.append(node('p','workspace-rubric','À fournir avant d’appliquer'));const list=node('ul');
    for(const missing of needs){
     const item=node('li');
     if(missing.anchor){const link=node('button','workspace-divine-need-link',missing.label);link.type='button';link.addEventListener('click',()=>focusAnchor(panel,missing.anchor));item.append(link);}
     else item.textContent=missing.label;
     list.append(item);
    }
    box.append(list);outcome.append(box);
   }
   for(const text of deadlineLines(result,{actorName:actor.name}))outcome.append(node('p','workspace-muted',text));
   const projected=(result.projectedEffects||[]).map(row=>describeEffectResult(row,{contract,participants})).filter(Boolean);
   if(projected.length){
    const box=node('div','workspace-divine-projection');box.append(node('p','workspace-rubric','Effets projetés · rien n’est encore appliqué'));const list=node('ul');
    for(const line of projected)list.append(node('li','',line));box.append(list);outcome.append(box);
   }
   const alerts=[...(result.projectedEffects||[]).map(row=>row.result?.warning).filter(Boolean),...(result.status==='reminder'?['Effet laissé au rappel MJ : la prière sera consignée, rien d’autre n’est calculé.']:[])];
   if(alerts.length){
    const box=node('div','workspace-divine-warnings');box.append(node('p','workspace-rubric','Avertissements'));const list=node('ul');
    for(const text of [...new Set(alerts)])list.append(node('li','',text));box.append(list);outcome.append(box);
   }
   if(preview?.reminders?.length){
    const box=node('div','workspace-divine-reminders');box.append(node('p','workspace-rubric','Rappels du MJ'));const list=node('ul');
    for(const reminder of preview.reminders)list.append(node('li','workspace-muted',reminder));box.append(list);outcome.append(box);
   }
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





