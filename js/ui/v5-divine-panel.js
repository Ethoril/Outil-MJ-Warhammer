/** Brouillon de prière conservé entre rendus ; seul le Store peut confirmer une conséquence. */
import {spellObjectChoices} from '../core/equipment.js';
import {CAMP_LABELS} from '../core/encounters.js';
import {getAllDivineContracts} from '../core/v5-divine-store.js';
import {divineSinPolicy} from '../core/v5-divine-engine.js';
import {resolveV5ConditionTestContext} from '../core/v5-test-context.js';
import {isBrokenActor,renderBrokenEscapeVisibilityControl} from './v5-broken-escape-panel.js';
import {emptyDivineForm,buildDivineForm,toEngineInput,buildExpiry,isSelfTargeted,classifyNeeds,describeEffectResult,summonLayerLabel,summarizeExecution,deadlineLines,formatCampaignTime,fieldValue,setFieldValue,focusKey} from './v5-divine-form-model.js';
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
 function reset(actor){state={actorId:actor.id,open:state.open,cult:'',contractId:getAllDivineContracts().find(row=>row.type==='blessing')?.id,targetIds:[],form:emptyDivineForm(),lastReceipt:null,choices:{range:0,targets:0,duration:0,effect:0},sinEdit:actor.extensions?.v5?.divine?.sin??'',sinReason:'',corruptionEdit:actor.extensions?.v5?.corruptionPoints??'',corruptionReason:'',roll:'',wrathRoll:'',wrathDurationRoll:'',wrathConsequence:'',expiryPhase:'',canSpeak:null,accessScope:'',accessReason:'',revokeReason:'',conditionPenaltyMode:'',conditionPenaltyReason:'',testOptionId:'',brokenEscapeVisibility:null,preview:null,busy:false,error:''};}
 function change(key,value){state[key]=value;if(key!=='testOptionId')state.testOptionId='';state.preview=null;state.error='';refresh();}
 function changeWrath(key,value){state[key]=value;state.preview=state.preview?{...state.preview,ready:false}:null;state.error='';refresh();}
 function invalidateEditedForm(input){
  const panel=input.closest('[data-divine-panel]');if(!panel)return;
  const apply=panel.querySelector('[data-divine-action="apply"]');if(apply)apply.disabled=true;
  const recoveryApply=panel.querySelector('[data-divine-action="recovery-apply"]');if(recoveryApply)recoveryApply.disabled=true;
  const recoveryHeal=panel.querySelector('[data-divine-action="recovery-heal"]');if(recoveryHeal)recoveryHeal.disabled=state.busy||!state.wrathRecoveryHeal;
  const saveCorruption=panel.querySelector('[data-divine-action="corruption-fact"]');if(saveCorruption)saveCorruption.disabled=state.busy||state.corruptionEdit===''||!(state.corruptionReason||'').trim();
  panel.querySelectorAll('[data-divine-action="penance-create"]').forEach(button=>button.disabled=state.busy||!(state.penanceText||'').trim()||!(state.penanceReason||'').trim());panel.querySelectorAll('[data-divine-action="penance-complete"]').forEach(button=>button.disabled=state.busy||!(state.penanceCloseReason||'').trim());
  const saveSin=panel.querySelector('[data-divine-action="sin"]');if(saveSin)saveSin.disabled=state.busy||state.sinEdit==='';
  const grantAccess=panel.querySelector('[data-divine-action="grant-access"]');if(grantAccess)grantAccess.disabled=state.busy||!state.accessScope||!state.accessReason.trim();
  panel.querySelectorAll('[data-divine-action="revoke-access"]').forEach(button=>button.disabled=state.busy||!state.revokeReason.trim());
  if(!state.preview)panel.querySelector('.workspace-divine-preview')?.remove();
  panel.querySelector('[role="alert"]')?.remove();
 }
 function field(container,label,key,{type='number',min=0,max=null}={}){
  const wrap=node('label','workspace-type',label),input=node('input');input.type=type;if(type==='number'){input.min=min;input.step='1';if(max!==null)input.max=max;}
  input.setAttribute('aria-label',label);input.dataset.focusKey='divine-'+key;input.value=state[key]??'';
  input.addEventListener('input',()=>{state[key]=input.value;if(key.startsWith('wrathRecovery')&&state.recoveryPreview)state.recoveryPreview={...state.recoveryPreview,ready:false};if(!key.startsWith('wrath'))state.testOptionId='';state.preview=key.startsWith('wrath')&&state.preview?{...state.preview,ready:false}:null;state.error='';invalidateEditedForm(input);});
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
   wrathAllyIds:clone(state.wrathAllyIds),wrathAlliesConfirmed:state.wrathAlliesConfirmed==='true',wrathSkillIds:clone(state.wrathSkillIds),wrathRoundPolicy:state.wrathRoundPolicy||undefined,wrathActionDecision:state.wrathActionDecision||undefined,wrathRoundAnchor:state.wrathAnchorScene&&state.wrathAnchorRound?{sceneId:state.wrathAnchorScene,round:Number(state.wrathAnchorRound)}:undefined,
   wrathRoll:state.wrathRoll===''?undefined:Number(state.wrathRoll),wrathDurationRoll:state.wrathDurationRoll===''?undefined:Number(state.wrathDurationRoll),wrathConsequences:state.wrathConsequence.trim(),wrathPenanceText:state.wrathPenanceText||'',wrathRejectionConfirmed:state.wrathRejectionConfirmed==='true',wrathPrayAdvances:state.wrathPrayAdvances===undefined||state.wrathPrayAdvances===''?undefined:Number(state.wrathPrayAdvances),wrathFirstMorningAt:state.wrathFirstMorningAt===undefined||state.wrathFirstMorningAt===''?undefined:Number(state.wrathFirstMorningAt),...confiscationInput(),
   wrathDamageRoll:state.wrathDamageRoll?Number(state.wrathDamageRoll):undefined,wrathEnduranceRoll:state.wrathEnduranceRoll?Number(state.wrathEnduranceRoll):undefined,
   wrathTestOptionId:state.wrathTestOptionId||undefined,wrathConditionContext:{conditionPenaltyMode:state.wrathConditionPenaltyMode||undefined,conditionPenaltyReason:state.wrathConditionPenaltyReason||''},
   testOptionId:state.testOptionId||undefined,conditionContext:{conditionPenaltyMode:state.conditionPenaltyMode||undefined,conditionPenaltyReason:state.conditionPenaltyReason},
   choices:clone(state.choices),...toEngineInput(state.form,{targetIds,contract,actor}),...(isBrokenActor(actor)&&typeof state.brokenEscapeVisibility==='boolean'?{brokenEscapeFacts:{visibleToAnyEnemy:state.brokenEscapeVisibility}}:{}),expiry};
 }
 function accessControls(container,preview,{recovery=false}={}){
  field(container,'Jet de durée de suspension ('+preview.dice+'d10)',recovery?'wrathRecoveryDuration':'wrathDurationRoll',{min:preview.dice,max:10*preview.dice});
  container.append(node('p','workspace-muted','Béni et Invocation ('+preview.cult+') seront suspendus'+(preview.value?' pendant '+preview.value+' jour(s)':'')+'. Les acquisitions permanentes sont conservées. Source L06 p.219.'));
 }

 function alliesControls(container,preview,actor,participants,{recovery=false}={}){
  const key=recovery?'wrathRecoveryAllyIds':'wrathAllyIds',confirm=recovery?'wrathRecoveryAlliesConfirmed':'wrathAlliesConfirmed',duration=recovery?'wrathRecoveryDuration':'wrathDurationRoll';
  if(!Array.isArray(state[key]))state[key]=clone(preview.proposedIds);
  container.append(node('p','workspace-muted','Alliés proposés selon le même camp que '+actor.name+'. Le MJ peut corriger cette liste.'));
  for(const target of participants.filter(row=>row.zone==='active')){
   const wrap=node('label','workspace-type workspace-recipient-check'),input=node('input');input.type='checkbox';input.checked=state[key].includes(target.id);input.setAttribute('aria-label','Réprouver '+target.name);input.dataset.focusKey='divine-'+key+'-'+target.id;
   input.addEventListener('change',()=>{const ids=new Set(state[key]);if(input.checked)ids.add(target.id);else ids.delete(target.id);state[key]=[...ids];state[confirm]='';if(recovery&&state.recoveryPreview)state.recoveryPreview={...state.recoveryPreview,ready:false};changeWrath(key,state[key]);});wrap.append(input,document.createTextNode(target.name+' · '+(CAMP_LABELS[target.camp]||target.camp||'camp à préciser')));container.append(wrap);
  }
  select(container,'Confirmer la liste des alliés réprouvés',state[confirm]||'',[['','Confirmation MJ requise'],['true','Liste vérifiée, y compris si vide']],value=>{state[confirm]=value;if(recovery&&state.recoveryPreview)state.recoveryPreview={...state.recoveryPreview,ready:false};changeWrath(confirm,value);},confirm);
  field(container,'Jet de durée du rejet (d10)',duration,{min:1,max:10});
  if(preview.value)container.append(node('p','workspace-muted','À Terre : '+(preview.targets.map(row=>row.name).join(', ')||'aucune cible (liste vide confirmée)')+'. Les Bénédictions et Miracles de '+preview.cult+' les visant seront rejetés pendant '+preview.value+' jour(s). Source L06 p.218.'));
 }

 function skillControls(container,preview,actor,{recovery=false}={}){
  const key=recovery?'wrathRecoverySkillIds':'wrathSkillIds',duration=recovery?'wrathRecoveryDuration':'wrathDurationRoll';
  container.append(node('p','workspace-muted',preview.multiple?'Compétences associées au dieu : choix du MJ sur cette fiche (une ou plusieurs).':'Compétence associée au dieu : choix du MJ, exactement une.'));
  for(const skill of actor.skills||[]){
   const name=skill.name||skill.nom||skill.id,wrap=node('label','workspace-type workspace-recipient-check'),input=node('input');input.type='checkbox';input.checked=(state[key]||[]).includes(skill.id);input.disabled=skill.status!=='resolved'||!skill.id;input.setAttribute('aria-label','Sanctionner '+name);input.dataset.focusKey='divine-'+key+'-'+skill.id;
   input.addEventListener('change',()=>{const ids=new Set(state[key]||[]);if(input.checked)ids.add(skill.id);else ids.delete(skill.id);state[key]=[...ids];if(recovery&&state.recoveryPreview)state.recoveryPreview={...state.recoveryPreview,ready:false};changeWrath(key,state[key]);});wrap.append(input,document.createTextNode(name+(skill.status!=='resolved'?' · à résoudre':'')));container.append(wrap);
  }
  field(container,'Jet de durée du malus (d10)',duration,{min:1,max:10});
  if(preview.value)container.append(node('p','workspace-muted','−1 DR : '+preview.skills.map(row=>row.name).join(', ')+' · '+preview.value+(preview.unit==='hours'?' heure(s)':' jour(s)')+' à partir de l’application. Source L06 p.218.'));
 }

 function roundControls(container,preview,{recovery=false}={}){
  const duration=recovery?'wrathRecoveryDuration':'wrathDurationRoll',policy=recovery?'wrathRecoveryPolicy':'wrathRoundPolicy',decision=recovery?'wrathRecoveryAction':'wrathActionDecision';
  const scene=recovery?'wrathRecoveryScene':'wrathAnchorScene',round=recovery?'wrathRecoveryRound':'wrathAnchorRound';
  const changed=(key,value)=>{state[key]=value;if(recovery&&state.recoveryPreview)state.recoveryPreview={...state.recoveryPreview,ready:false};changeWrath(key,value);};
  field(container,'Jet de durée du Courroux ('+(preview.dice||1)+'d10)',duration,{min:preview.dice||1,max:10*(preview.dice||1)});
  select(container,'Premier Round de la sanction',state[policy]||'',[['','Décision MJ requise'],['current','Compter le Round actuel'],['next','Commencer au Round suivant']],value=>changed(policy,value),policy);
  if(!Store.getCombat().round){field(container,'Scène d’ancrage de la sanction',scene,{type:'text'});field(container,'Round d’ancrage de la sanction',round,{min:1});}
  if(preview.mode==='forced')select(container,'Action du Tour déclencheur',state[decision]||'',[['','Décision MJ requise'],['count-trigger','La Prière déclencheuse compte pour ce Tour'],['next-turn','Action déjà utilisée : obligation au prochain Tour']],value=>changed(decision,value),decision);
  if(preview.rounds)container.append(node('p','workspace-muted',preview.rounds+' Round(s) ; expiration après les effets du Round '+preview.roundDeadline+'.'));
 }

 function recoveryPanel(actor,participants){
  const rows=(actor.states||[]).flatMap(condition=>(condition.divineWrathLocks||[]).map(lock=>({condition,lock})));
  const forced=(actor.extensions?.v5?.divineEffects||[]).some(row=>row.type==='wrath-round-rule'&&row.mode==='forced');
  if(!rows.length&&!state.lastRecovery&&!forced)return null;
  const box=node('div','workspace-divine-recovery');box.append(node('p','workspace-rubric','Récupération des États du Courroux'));
  if(state.lastRecovery)box.append(node('p','workspace-muted',state.lastRecovery));
  const changed=(key,value)=>{state[key]=value;if(state.recoveryPreview)state.recoveryPreview={...state.recoveryPreview,ready:false};refresh();};
  for(const {condition,lock} of rows){
   box.append(node('p','workspace-muted',`${condition.name} ${condition.level||1} · Courroux ${lock.resultId.replace('wrath:','')} · source V5 p. ${lock.source.printedPage}. Retrait générique verrouillé.`));
   if(lock.kind==='pray')button(box,'Préparer la récupération · '+condition.name+' · '+lock.resultId.replace('wrath:',''),()=>{state.recoverySelection={stateId:condition.id,originExecutionId:lock.executionId};state.recoveryPreview=null;state.wrathRecoveryRoll='';state.wrathRecoveryOption='';refresh();},false,'recovery-select');
   else if(lock.kind==='wounds-regained'){
    box.append(node('p','workspace-muted','Inconscient reste jusqu’à la récupération effective d’au moins une Blessure. Les autres causes d’Inconscient restent suivies séparément.'));
    field(box,'Blessures à récupérer','wrathRecoveryHeal',{min:1});
    button(box,'Soigner la cause du Courroux',()=>run(async()=>{const receipt=await Store.healWounds(actor.id,Number(state.wrathRecoveryHeal));if(receipt?.ok===false||receipt?.ready===false)throw Error(receipt.error||'Soins non appliqués.');state.lastRecovery=`Soins appliqués : ${receipt.hpDelta} Blessure(s) récupérée(s).`;state.preview=null;state.recoveryPreview=null;}),!state.wrathRecoveryHeal,'recovery-heal');
   }
  }
  if(forced)button(box,'Préparer l’Action de Prière imposée',()=>{state.recoverySelection={forcedPrayer:true};state.recoveryPreview=null;state.wrathRecoveryRoll='';state.wrathRecoveryOption='';refresh();},false,'forced-prayer-select');
  const selection=state.recoverySelection;
  if(!selection||!(selection.forcedPrayer===true&&forced)&&!rows.some(row=>row.condition.id===selection.stateId&&row.lock.executionId===selection.originExecutionId))return box;
  select(box,selection.forcedPrayer?'Peut prononcer la Prière imposée':'Peut prononcer la Prière de récupération',state.wrathRecoveryCanSpeak||'',[['','À préciser'],['true','Oui'],['false','Non']],value=>changed('wrathRecoveryCanSpeak',value),'wrathRecoveryCanSpeak');
  field(box,selection.forcedPrayer?'Jet de Prière imposée (d100)':'Jet de récupération du Courroux (d100)','wrathRecoveryRoll',{min:1,max:100});
  const context=node('details','workspace-v5-context-details');context.append(node('summary','','États du Test de récupération'));
  select(context,'Arbitrage des États de récupération',state.wrathRecoveryPenaltyMode||'',[['','Si nécessaire : choisir'],['sl','Retenir le plus fort malus en DR'],['disadvantage','Retenir le Désavantage']],value=>changed('wrathRecoveryPenaltyMode',value),'wrathRecoveryPenaltyMode');
  field(context,'Motif de l’arbitrage de récupération','wrathRecoveryPenaltyReason',{type:'text'});box.append(context);
  const input=()=>({actorId:actor.id,...selection,roll:state.wrathRecoveryRoll?Number(state.wrathRecoveryRoll):undefined,canSpeak:state.wrathRecoveryCanSpeak==='true',testOptionId:state.wrathRecoveryOption||undefined,conditionContext:{conditionPenaltyMode:state.wrathRecoveryPenaltyMode||undefined,conditionPenaltyReason:state.wrathRecoveryPenaltyReason||''},brokenEscapeFacts:{visibleToAnyEnemy:state.brokenEscapeVisibility},
   wrathAllyIds:clone(state.wrathRecoveryAllyIds),wrathAlliesConfirmed:state.wrathRecoveryAlliesConfirmed==='true',wrathSkillIds:clone(state.wrathRecoverySkillIds),wrathRoundPolicy:state.wrathRecoveryPolicy||undefined,wrathActionDecision:state.wrathRecoveryAction||undefined,wrathRoundAnchor:state.wrathRecoveryScene&&state.wrathRecoveryRound?{sceneId:state.wrathRecoveryScene,round:Number(state.wrathRecoveryRound)}:undefined,
   wrathRoll:state.wrathRecoveryWrathRoll?Number(state.wrathRecoveryWrathRoll):undefined,wrathDurationRoll:state.wrathRecoveryDuration?Number(state.wrathRecoveryDuration):undefined,wrathConsequences:state.wrathRecoveryConsequences||'',wrathPenanceText:state.wrathRecoveryPenance||'',wrathRejectionConfirmed:state.wrathRecoveryRejectionConfirmed==='true',wrathPrayAdvances:state.wrathRecoveryPrayAdvances===undefined||state.wrathRecoveryPrayAdvances===''?undefined:Number(state.wrathRecoveryPrayAdvances),wrathFirstMorningAt:state.wrathRecoveryFirstMorningAt===undefined||state.wrathRecoveryFirstMorningAt===''?undefined:Number(state.wrathRecoveryFirstMorningAt),...confiscationInput(true),wrathDamageRoll:state.wrathRecoveryDamage?Number(state.wrathRecoveryDamage):undefined,wrathEnduranceRoll:state.wrathRecoveryEndurance?Number(state.wrathRecoveryEndurance):undefined,wrathTestOptionId:state.wrathRecoveryDamageOption||undefined,wrathConditionContext:{conditionPenaltyMode:state.wrathRecoveryDamageMode||undefined,conditionPenaltyReason:state.wrathRecoveryDamageReason||''}});
  button(box,selection.forcedPrayer?'Calculer la Prière imposée':'Calculer la récupération',()=>{state.recoveryPreview=Store.previewDivineWrathRecovery(input());refresh();},false,'recovery-calculate');
  button(box,selection.forcedPrayer?'Appliquer la Prière imposée':'Appliquer la récupération',()=>run(async()=>{const result=await Store.applyDivineWrathRecovery({preview:state.recoveryPreview});if(result?.ok===false)throw Error(result.error||'Récupération non enregistrée.');state.lastRecovery=`Prière ${selection.forcedPrayer?'imposée':'de récupération'} ${result.test.success?'réussie':'ratée'} · ${result.test.sl} DR · ${result.removedCount} État(s) retiré(s).`;state.recoverySelection=null;state.recoveryPreview=null;state.preview=null;for(const key of ['wrathRecoveryWrathRoll','wrathRecoveryDuration','wrathRecoveryConsequences','wrathRecoveryDamage','wrathRecoveryEndurance','wrathRecoveryDamageOption'])state[key]='';}),!state.recoveryPreview?.ready,'recovery-apply');
  const preview=state.recoveryPreview;
  if(preview){
   const projected=node('div','workspace-divine-preview');projected.dataset.wrathRecoveryPreview='';
   if(preview.test)projected.append(node('p','workspace-muted',`Prière ${preview.test.success?'réussie':'ratée'} · ${preview.test.sl} DR · difficulté ${preview.difficulty>=0?'+':''}${preview.difficulty??''}. À l’application : ${preview.removedCount??0} État(s) retiré(s). Rien n’est encore appliqué.`));
   if(preview.error)projected.append(node('p','workspace-field-error',preview.error));
   if(preview.needsInput?.length)projected.append(node('p','workspace-field-error',preview.needsInput.map(row=>row.label||row.message).join(' · ')));
   if(preview.needsInput?.some(row=>row.field==='testOptionId'))select(projected,'Choix du jet de récupération',state.wrathRecoveryOption||'',[['','Choisir'],...(preview.testOptions||[]).map(option=>[option.id,`${option.id==='reverse'?'Inverser':'Garder'} → ${option.result.roll}`])],value=>changed('wrathRecoveryOption',value),'wrathRecoveryOption');
   if(preview.wrath?.triggered){
    projected.append(node('p','workspace-field-error','Nouveau Courroux déclenché par la Prière de récupération. Ses conséquences seront appliquées dans la même commande.'));
    field(projected,'Jet du nouveau Courroux (d100)','wrathRecoveryWrathRoll',{min:1,max:100});
    if(preview.wrath.resultId)projected.append(node('p','workspace-muted','Résultat : '+preview.wrath.resultId.replace('wrath:','')));
    if(['wrath:136-140','wrath:146-150'].includes(preview.wrath.resultId))rejectionControls(projected,actor,preview.wrath.resultId==='wrath:146-150',true);
    if(preview.wrath.resultId==='wrath:131-135')dailyBleedingControls(projected,actor,true);
    if(preview.wrath.resultId==='wrath:111-115')confiscationControls(projected,actor,true);
    if(preview.wrath.resultId==='wrath:96-100')field(projected,'Pénitence du nouveau Courroux','wrathRecoveryPenance',{type:'text'});
    if(preview.wrath.resultId==='wrath:11-15')field(projected,'Durée des nouvelles Leçons (d10)','wrathRecoveryDuration',{min:1,max:10});
    if(preview.wrathAccessPreview)accessControls(projected,preview.wrathAccessPreview,{recovery:true});
    if(preview.wrathAlliesPreview)alliesControls(projected,preview.wrathAlliesPreview,actor,participants,{recovery:true});
    if(preview.wrathSkillPreview)skillControls(projected,preview.wrathSkillPreview,actor,{recovery:true});
    if(preview.wrathRoundPreview)roundControls(projected,preview.wrathRoundPreview,{recovery:true});
    if(preview.wrathDamagePreview){
     if(preview.wrathDamagePreview.diceCount)field(projected,`Blessures du nouveau Courroux (${preview.wrathDamagePreview.diceCount}d10)`,'wrathRecoveryDamage',{min:preview.wrathDamagePreview.diceCount,max:10*preview.wrathDamagePreview.diceCount});
     field(projected,'Résistance du nouveau Courroux (d100)','wrathRecoveryEndurance',{min:1,max:100});
     if(preview.needsInput?.some(row=>row.field==='wrathTestOptionId'))select(projected,'Choix du jet de Résistance supplémentaire',state.wrathRecoveryDamageOption||'',[['','Choisir'],...(preview.wrathDamagePreview.testOptions||[]).map(option=>[option.id,`${option.id==='reverse'?'Inverser':'Garder'} → ${option.result.roll}`])],value=>changed('wrathRecoveryDamageOption',value),'wrathRecoveryDamageOption');
     if(preview.needsInput?.some(row=>row.field?.startsWith('wrathConditionContext'))){
      select(projected,'Arbitrage des États de Résistance supplémentaire',state.wrathRecoveryDamageMode||'',[['','Choisir'],['sl','Retenir le plus fort malus en DR'],['disadvantage','Retenir le Désavantage']],value=>changed('wrathRecoveryDamageMode',value),'wrathRecoveryDamageMode');field(projected,'Motif de Résistance supplémentaire','wrathRecoveryDamageReason',{type:'text'});
     }
    }
    if(preview.needsInput?.some(row=>row.field==='wrathConsequences')||preview.receipt?.wrathDetails?.resolvedBy==='MJ')field(projected,'Conséquences du nouveau Courroux traitées par le MJ','wrathRecoveryConsequences',{type:'text'});
   }
   box.append(projected);
  }
  return box;
 }
 function rejectionControls(box,actor,permanent,recovery=false){box.append(node('p','workspace-muted',permanent?'Rejet définitif : les talents du culte sont retirés. Toutes les avances de la compétence Prière commune sont perdues ; les autres compétences et talents de cultes distincts restent conservés. Source L06 p.219.':'Excommunication : les acquisitions restent conservées. La première nouvelle pénitence du même culte rend Béni, la seconde Invocation et met fin au rejet social. Source L06 p.219.'));if(!permanent)return;const prefix=recovery?'wrathRecovery':'wrath',known=(actor.skills||[]).find(row=>['Prière','Pray'].includes(row.name));if(state[prefix+'PrayAdvances']===undefined&&Number.isSafeInteger(known?.advances))state[prefix+'PrayAdvances']=String(known.advances);field(box,'Avances de Prière connues',prefix+'PrayAdvances');select(box,'Confirmer le rejet et la perte des avances de Prière',state[prefix+'RejectionConfirmed']||'',[['','À préciser'],['true','Oui, décision MJ confirmée'],['false','Non']],value=>changeWrath(prefix+'RejectionConfirmed',value),prefix+'RejectionConfirmed');}
 function dailyBleedingControls(box,actor,recovery=false){const now=JSON.parse(Store.getFullJSON()).extensions?.v5?.gameClock?.campaignSeconds;box.append(node('p','workspace-muted','Chaque matin connu : 1 + Péchés avant décrément Hémorragique jusqu’à pénitence accomplie. Temps actuel : '+now+' secondes de campagne. Le MJ désigne le premier matin, puis une journée vaut 86400 secondes. Source L06 p.219.'));field(box,'Premier matin connu (secondes de campagne)',recovery?'wrathRecoveryFirstMorningAt':'wrathFirstMorningAt');}
 function confiscationInput(recovery=false){const prefix=recovery?'wrathRecovery':'wrath',retained=Object.fromEntries(['head','body','rightArm','leftArm','rightLeg','leftLeg'].filter(key=>state[prefix+'Retained'+key]!==undefined&&state[prefix+'Retained'+key]!=='').map(key=>[key,Number(state[prefix+'Retained'+key])]));return {wrathInventoryConfirmed:state[prefix+'InventoryConfirmed']==='true',wrathMagicalItemIds:state[prefix+'MagicalItemIds']||[],wrathRetainedArmor:retained};}
 function confiscationControls(box,actor,recovery=false){const prefix=recovery?'wrathRecovery':'wrath';box.append(node('p','workspace-muted','Tous les objets identifiés seront retirés avec leurs Actions. Confirmez l’inventaire et cochez seulement les objets magiques ; une pénitence en rendra un seul. Source L06 p.219.'));for(const choice of spellObjectChoices(actor)){const label=node('label','workspace-type workspace-recipient-check','Objet magique : '+choice.label),input=node('input');input.type='checkbox';input.setAttribute('aria-label','Objet magique : '+choice.label);input.checked=(state[prefix+'MagicalItemIds']||[]).includes(choice.id);input.addEventListener('change',()=>{const ids=new Set(state[prefix+'MagicalItemIds']||[]);input.checked?ids.add(choice.id):ids.delete(choice.id);changeWrath(prefix+'MagicalItemIds',[...ids]);});label.prepend(input);box.append(label);}select(box,'Inventaire et désignation magique confirmés',state[prefix+'InventoryConfirmed']||'',[['','À préciser'],['true','Oui, y compris si aucun objet magique'],['false','Non']],value=>changeWrath(prefix+'InventoryConfirmed',value),prefix+'InventoryConfirmed');for(const[key,label]of [['head','Tête'],['body','Corps'],['rightArm','Bras droit'],['leftArm','Bras gauche'],['rightLeg','Jambe droite'],['leftLeg','Jambe gauche']])field(box,'PA physiques conservés sans possession · '+label,prefix+'Retained'+key);}
 function penanceControls(content,actor,cult){
  const restitution=id=>{const value=state.penanceRestitutions?.[id];if(!value)return {};const [confiscationId,restoreItemId]=JSON.parse(value);return {confiscationId,restoreItemId};};
  const box=node('div','workspace-divine-penances');box.style.minWidth='0';box.append(node('h3','','Pénitences de la fiche'));const rows=actor.extensions?.v5?.divinePenances||[],mayManage=Store.canManageDivinePenances?.()===true;
  if(!rows.length)box.append(node('p','workspace-muted','Aucune pénitence enregistrée.'));
  if(mayManage&&rows.some(row=>row.status==='open'))field(box,'Motif de clôture MJ','penanceCloseReason',{type:'text'});
  for(const row of rows){const item=node('div','workspace-divine-penance');item.append(node('p','',row.cult+' · '+(row.status==='completed'?'Accomplie':'En cours')+' · '+row.text),node('small','workspace-muted',row.source.document+' p.'+row.source.printedPage));if(row.status==='completed')item.append(node('p','workspace-muted','Clôture MJ : '+row.completedReason));else if(mayManage){const eligible=(actor.extensions?.v5?.divineConfiscations||[]).filter(record=>record.cult===row.cult).flatMap(record=>(record.items||[]).filter(held=>held.magical&&held.status==='held').map(held=>[JSON.stringify([record.id,held.itemId]),held.label]));if(eligible.length)select(item,'Objet magique à restituer pour : '+row.text,state.penanceRestitutions?.[row.id]||'',[['','Choisir exactement un objet'],...eligible],value=>{state.penanceRestitutions={...(state.penanceRestitutions||{}),[row.id]:value};change('penanceCloseReason',state.penanceCloseReason||'');},'restitution-'+row.id);button(item,'Accomplir la pénitence : '+row.text,()=>run(async()=>{const result=await Store.completeDivinePenance(actor.id,row.id,{reason:state.penanceCloseReason,...restitution(row.id),baseRevision:Store.getLocalRevision()});if(result?.ok===false)throw Error(result.error||'Clôture non enregistrée.');state.preview=null;}),!(state.penanceCloseReason||'').trim(),'penance-complete');}box.append(item);}
  if(mayManage){const examples=(Store.getDivinePenanceExamples?.()||[]).filter(row=>row.cult===cult);select(box,'Exemple de pénitence',state.penanceExample||'',[['','Mission définie par le MJ'],...examples.map(row=>[row.id,row.text+' (p.'+row.source.printedPage+')'])],value=>{const example=examples.find(row=>row.id===value);state.penanceText=example?.text||'';change('penanceExample',value);},'penanceExample');field(box,'Mission de pénitence','penanceText',{type:'text'});field(box,'Motif de création MJ','penanceReason',{type:'text'});button(box,'Créer la pénitence',()=>run(async()=>{const result=await Store.createDivinePenance(actor.id,{text:state.penanceText,reason:state.penanceReason,cult,exampleId:state.penanceExample||undefined,baseRevision:Store.getLocalRevision()});if(result?.ok===false)throw Error(result.error||'Pénitence non enregistrée.');state.penanceText='';state.penanceReason='';state.penanceExample='';state.preview=null;}),!(state.penanceText||'').trim()||!(state.penanceReason||'').trim(),'penance-create');}
  for(const record of actor.extensions?.v5?.divineRejections||[])box.append(node('p','workspace-divine-rejection',record.cult+' · '+(record.kind==='permanent'?'Rejet définitif : talents et avances de Prière perdus':record.stage===2?'Excommunication levée après deux pénitences':record.stage===1?'Béni rendu ; une pénitence reste pour Invocation':'Excommunication : deux pénitences requises')+' · Source L06 p.219.'));
  for(const record of actor.extensions?.v5?.divineDailyBleeding||[])box.append(node('p','workspace-divine-daily-bleeding','Hémorragie quotidienne · '+record.cult+' · '+(record.status==='completed'?'terminée par pénitence':record.quantity+' Hémorragique au prochain matin : '+formatCampaignTime(record.nextMorningAt))+' · Source L06 p.219.'));
  for(const record of actor.extensions?.v5?.divineConfiscations||[]){const held=node('div','workspace-divine-confiscation');held.append(node('h4','','Possessions confisquées · '+record.cult));for(const item of record.items||[])held.append(node('p','',item.label+' · '+(item.magical?'magique':'non magique')+' · '+(item.status==='returned'?'rendu':'retenu')));box.append(held);}
  content.append(box);
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
  content.append(node('p','',contract.labels?.effect||''));penanceControls(content,actor,contract.deity);
  if(contract.sourceDelta&&contract.status!=='blocked')content.append(node('p','workspace-muted','La règle V5 est présentée ici ; le texte du catalogue de consultation doit encore être actualisé.'));
  if(contract.status!=='blocked')content.append(node('p','workspace-muted',`Portée : ${paramText(contract.params?.range,actor)} · Cibles : ${paramText(contract.params?.targets,actor)} · Durée : ${paramText(contract.params?.duration,actor)}`));
  const source=contract.source;
  const sourceLabel=source?.document?`${source.document}${source.edition?' · '+source.edition:''}${source.printedPage?' · p. '+[].concat(source.printedPage).join(', '):''}`:'Source originale non retrouvée';
  content.append(node('p','workspace-muted','Source : '+sourceLabel+(source?.sourceStatus==='found-adaptation-blocked'?' · adaptation V4 retrouvée, contrat V5 bloqué jusqu’à arbitrage.':'')));
  if(divineSinPolicy(contract).exempt){
   content.append(node('p','workspace-muted',`${contract.deity} : culte elfe exempt du Péché et du Courroux (Guide des Hauts Elfes, p. 99).`));
  }else{
   const sin=node('details','workspace-v5-context-details');sin.append(node('summary','','Péchés : '+(actor.extensions?.v5?.divine?.sin??'à renseigner')));content.append(sin);
   field(sin,'Total de Péchés','sinEdit');field(sin,'Raison de l’ajustement des Péchés','sinReason',{type:'text'});
   button(sin,'Enregistrer les Péchés',()=>run(async()=>{const result=await Store.setDivineSin(actor.id,Number(state.sinEdit),{reason:state.sinReason,cult:contract.deity,baseRevision:Store.getLocalRevision()});if(result?.ok===false)throw Error(result.error||'Péchés non enregistrés.');state.preview=null;}),state.sinEdit==='','sin');
  }
  const active=participants.flatMap(target=>(target.extensions?.v5?.divineEffects||[]).filter(layer=>layer.casterId===actor.id).map(layer=>({...layer,targetName:target.name})));
  if(active.length){
   const list=node('details','workspace-v5-context-details');list.append(node('summary','','Prières actives du personnage'));field(list,'Raison de fin de prière','endReason',{type:'text'});
   for(const id of [...new Set(active.map(layer=>layer.executionId))]){
    const layers=active.filter(layer=>layer.executionId===id),name=contracts.find(row=>row.id===layers[0].prayerId)?.name||'Prière';
    list.append(node('p','',[name+' · '+[...new Set(layers.map(layer=>layer.targetName))].join(', '),...layers.map(layer=>summonLayerLabel(layer,participants)).filter(Boolean)].join(' · ')));
    button(list,'Terminer '+name,()=>run(async()=>{const result=await Store.endDivinePrayer(id,{reason:state.endReason,baseRevision:Store.getLocalRevision()});if(result?.ok===false)throw Error(result.error||'Fin non enregistrée.');state.preview=null;}),false,'end');
   }content.append(list);
  }
  if((actor.extensions?.v5?.divineEffects||[]).some(row=>row.type==='wrath-fortune-refresh'))content.append(node('p','workspace-muted','Courroux : prochain renouvellement de Chance limité à un point permanent (L06 p.219).'));
  for(const layer of actor.extensions?.v5?.divineEffects||[])if(layer.type==='divine-access-suspension')content.append(node('p','workspace-field-error','Courroux : Béni et Invocation ('+layer.cult+') suspendus jusqu’à '+formatCampaignTime(layer.deadline.atSeconds)+' de temps de campagne ; les acquisitions restent conservées. Source L06 p.219.'));
  for(const layer of actor.extensions?.v5?.divineEffects||[])if(layer.type==='wrath-deity-rejection')content.append(node('p','workspace-field-error','Réprouvé par '+layer.cult+' : les Bénédictions et Miracles de ce dieu visant ce personnage échouent jusqu’à '+formatCampaignTime(layer.deadline.atSeconds)+' de temps de campagne. Source L06 p.218.'));
  for(const layer of actor.extensions?.v5?.divineEffects||[])if(layer.type==='wrath-skill-penalty')content.append(node('p','workspace-field-error','Courroux : −1 DR à '+layer.skills.map(row=>row.name).join(', ')+' · '+layer.duration.value+(layer.duration.unit==='hours'?' heure(s)':' jour(s)')+' · échéance : '+formatCampaignTime(layer.deadline.atSeconds)+' de temps de campagne · Source L06 p.218.'));
  for(const layer of actor.extensions?.v5?.divineEffects||[])if(layer.type==='wrath-round-rule')content.append(node('p','workspace-field-error',(layer.mode==='ban'?'Prière interdite':'Prière comme Action obligatoire')+' · '+layer.resultId.replace('wrath:','')+' · '+layer.rounds+' Round(s), fin après les effets du Round '+layer.roundDeadline+' · scène '+(layer.roundAnchor.sceneId||'combat local')+' · Source L06 p.218.'));
  const recovery=recoveryPanel(actor,participants);if(recovery)content.append(recovery);
  if(contract.status==='blocked')return panel;
  if(contract.deity==='Solkan'){
   const box=node('div','workspace-divine-corruption');box.append(node('p','workspace-muted','Pureté de Solkan : Péchés et Corruption doivent être connus et nuls. Corruption actuelle : '+(Number.isSafeInteger(actor.extensions?.v5?.corruptionPoints)?actor.extensions.v5.corruptionPoints:'inconnue')+'. Source : Archives of the Empire 3 p.55.'));
   field(box,'Points de Corruption connus','corruptionEdit',{min:0});field(box,'Motif de la valeur de Corruption','corruptionReason',{type:'text'});
   const expectedLocalRevision=Store.getLocalRevision();
   button(box,'Enregistrer la Corruption connue',()=>run(async()=>{const value=Number(state.corruptionEdit),reason=(state.corruptionReason||'').trim();if(state.corruptionEdit===''||!Number.isSafeInteger(value)||value<0||!reason)throw Error('Valeur entière positive ou nulle et motif MJ requis.');const result=await Store.updateParticipant(actor.id,{extensions:{...clone(actor.extensions||{}),v5:{...clone(actor.extensions?.v5||{}),corruptionPoints:value,corruptionEntry:{kind:'gm-fact',value,reason,sourceRule:'solkan-purity'}}}},{expectedLocalRevision});if(result?.ok===false)throw Error(result.error||'Valeur non enregistrée.');state.preview=null;}),state.corruptionEdit===''||!(state.corruptionReason||'').trim(),'corruption-fact');content.append(box);
  }
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
  if(!access.allowed&&['DIVINE_ACCESS_SUSPENDED','DIVINE_REJECTION','SOLKAN_PURITY','STROMFELS_SIN','DIVINE_DATA_REQUIRED'].includes(access.code))accessBox.append(node('p','workspace-muted','Cette restriction source doit être résolue ; une dérogation d’accès ne la contourne pas.'));
  if(!access.allowed&&!['DIVINE_ACCESS_SUSPENDED','DIVINE_REJECTION','SOLKAN_PURITY','STROMFELS_SIN','DIVINE_DATA_REQUIRED'].includes(access.code)){
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
  const model=buildDivineForm(contract,{actor,targets:effectTargets,participants,form:state.form,choices:state.choices}),descr=model.descr;
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
  button(actions,'Appliquer la prière',()=>run(async()=>{const result=await Store.applyDivineExecution(contract.id,{preview:state.preview});if(result?.ok===false || result?.ready===false)throw Error(result.error||'Prière non appliquée.');state.lastReceipt=summarizeExecution(result.receipt,{contract,participants});state.preview=null;state.roll='';state.wrathRoll='';state.wrathDurationRoll='';state.wrathDamageRoll='';state.wrathEnduranceRoll='';state.wrathTestOptionId='';state.wrathConditionPenaltyMode='';state.wrathConditionPenaltyReason='';Object.assign(state.form,{damageRoll:'',damageRolls:{},removals:{},healCount:''});}),!state.preview?.ready,'apply');
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
   if(preview?.targetRejections?.length)outcome.append(node('p','workspace-field-error','Invocation rejetée par '+contract.deity+' : cible(s) réprouvée(s) '+preview.targetRejections.map(row=>participants.find(target=>target.id===row.targetId)?.name||row.targetId).join(', ')+'. Le Test de Prière reste résolu, aucun effet d’invocation ne sera appliqué.'));
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
    }else if(result.wrathRejectionPreview){rejectionControls(outcome,actor,result.wrathRejectionPreview.permanent);
    }else if(result.wrathDailyBleedingPreview){dailyBleedingControls(outcome,actor);
    }else if(result.wrathConfiscationPreview){confiscationControls(outcome,actor);
    }else if(result.wrathPenancePreview){field(outcome,'Pénitence imposée par le Courroux','wrathPenanceText',{type:'text'});outcome.append(node('p','workspace-muted','Mission suivie sur la fiche, clôturée par le MJ. Aucun retrait automatique de Péché. Source L06 p.218–219.'));
    }else if(result.wrathFortunePreview){outcome.append(node('p','workspace-muted','Le prochain renouvellement normal de Chance donnera un point. Le compteur actuel reste inchangé. Source L06 p.219.'));
    }else if(result.wrathAccessPreview){
     accessControls(outcome,result.wrathAccessPreview);
    }else if(result.wrathAlliesPreview){
     alliesControls(outcome,result.wrathAlliesPreview,actor,participants);
    }else if(result.wrathSkillPreview){
     skillControls(outcome,result.wrathSkillPreview,actor);
    }else if(result.wrathRoundPreview){
     outcome.append(node('p','workspace-muted',result.wrathRoundPreview.mode==='ban'?'Tout Test de Prière sera interdit jusqu’à expiration attestée. Source : L06 p.218.':'Une Prière comme Action sera obligatoire à chaque Tour, sans Action supplémentaire. Source : L06 p.218.'));
     roundControls(outcome,result.wrathRoundPreview);
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
    }else if(result.wrathStatePreview){
     const states=result.wrathStatePreview;
     outcome.append(node('p','workspace-muted',`${result.wrathTableResult.label} · À l’application : ${states.conditions.map(row=>`${row.name} ${row.level||1}${row.locked?' (récupération sourcée)':''}`).join(', ')||'aucun État acquis (immunité)'}. Blessures : ${states.hpBefore} → ${states.hpAfter}. Source : Livre de base V5 EN, p. ${result.wrathTableResult.source.printedPage}.`));
     if(states.recovery?.kind==='pray')outcome.append(node('p','workspace-muted',`Retrait par Prière ${states.recovery.difficulty>=0?'+':''}${states.recovery.difficulty} DR, depuis le panneau de récupération après application.`));
     if(states.recovery?.kind==='wounds-regained')outcome.append(node('p','workspace-muted','Inconscient ne sera libéré qu’après récupération effective d’au moins une Blessure.'));
     for(const reminder of states.reminders)outcome.append(node('p','workspace-muted',reminder));
    }else if(result.wrathDamagePreview){
     const damage=result.wrathDamagePreview;
     outcome.append(node('p','workspace-muted',`${result.wrathTableResult.label} · Blessures directes sur le prêtre, sans réduction d’Endurance ou d’armure. Source : Livre de base V5 EN, p. 218.`));
     if(damage.diceCount)field(outcome,`Jet de Blessures du Courroux (${damage.diceCount}d10)`,'wrathDamageRoll',{min:damage.diceCount,max:10*damage.diceCount});
     field(outcome,'Jet de Résistance du Courroux (d100)','wrathEnduranceRoll',{min:1,max:100});
     outcome.append(node('p','workspace-muted',`Difficulté de Résistance : ${damage.enduranceDifficulty>=0?'+':''}${damage.enduranceDifficulty} DR. Péchés utilisés pour les Blessures : ${damage.sinAtTest}, avant décrément.`));
     if(result.needsInput?.some(row=>row.field?.startsWith('wrathConditionContext.'))||state.wrathConditionPenaltyMode){
      select(outcome,'Arbitrage des États pour la Résistance',state.wrathConditionPenaltyMode,[['','Choisir pour ce Test'],['sl','Retenir le plus fort malus en DR'],['disadvantage','Retenir le Désavantage']],value=>changeWrath('wrathConditionPenaltyMode',value),'wrathConditionPenaltyMode');
      field(outcome,'Motif de l’arbitrage pour la Résistance','wrathConditionPenaltyReason',{type:'text'});
     }
     if(result.needsInput?.some(row=>row.field==='wrathTestOptionId'))
      select(outcome,'Choix du jet de Résistance',state.wrathTestOptionId,[['','Choisir'],...(damage.testOptions||[]).map(option=>[option.id,`${option.id==='reverse'?'Inverser':'Garder'} → ${option.result.roll}`])],value=>changeWrath('wrathTestOptionId',value),'wrathTestOptionId');
     if(damage.enduranceTest){
      outcome.append(node('p','workspace-muted',`À l’application : ${damage.woundsLost} Blessure(s) perdue(s), ${damage.hpBefore} → ${damage.hpAfter}. Résistance ${damage.enduranceTest.success?'réussie':'ratée'} · ${damage.enduranceTest.sl} DR.`));
      outcome.append(node('p','workspace-muted',`${damage.stunnedRequested} Sonné demandé(s). États qui seront acquis : ${damage.conditions.map(row=>`${row.name} ${row.level||1}`).join(', ')||'aucun'}.`));
      if(damage.momentumBefore&&!damage.momentumAfter)outcome.append(node('p','workspace-muted','Le Momentum sera perdu à l’application.'));
      for(const reminder of damage.reminders||[])outcome.append(node('p','workspace-muted',reminder));
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





