/** Brouillon de prière conservé entre rendus ; seul le Store peut confirmer une conséquence. */
import {getAllDivineContracts} from '../core/v5-divine-store.js';
const node=(tag,klass,text)=>{const el=document.createElement(tag);if(klass)el.className=klass;if(text!==undefined)el.textContent=text;return el;};
const clone=value=>structuredClone(value);
const labels={implemented:'Effet calculable',manual:'Effet assisté / rappel MJ',blocked:'Source ou arbitrage requis'};
function paramText(param,actor){
 if(!param)return 'À préciser';if(param.kind==='self')return 'Vous';if(param.kind==='instant'||param.unit==='instant')return 'Instantané';if(param.kind==='special')return 'Spécial';
 const stat=param.characteristic||param.characteristicBonus;let value=param.value;
 if(param.kind==='characteristic')value=actor.caracs?.[stat];
 if(['area','characteristic-bonus'].includes(param.kind))value=Number.isFinite(Number(actor.caracs?.[stat]))?Math.floor(Number(actor.caracs[stat])/10):null;
 if(value===undefined||value===null)return param.sourceText||'À préciser';
 return (param.kind==='area'?'Zone de ':'')+value+(param.unit?' '+({rounds:'Rounds',allies:'alliés'}[param.unit]||param.unit):'');
}
export function createDivinePanel({Store,refresh}){
 let state={actorId:null,open:false,targetIds:[],facts:{},choices:{range:0,targets:0,duration:0,effect:0}};
 function reset(actor){state={actorId:actor.id,open:state.open,contractId:getAllDivineContracts().find(row=>row.type==='blessing')?.id,targetIds:[],facts:{},choices:{range:0,targets:0,duration:0,effect:0},sinEdit:actor.extensions?.v5?.divine?.sin??'',sinReason:'',roll:'',wrathRoll:'',wrathConsequence:'',expiryPhase:'',canSpeak:null,preview:null,busy:false,error:''};}
 function change(key,value){state[key]=value;state.preview=null;state.error='';refresh();}
 function invalidateEditedForm(input){
  const panel=input.closest('[data-divine-panel]');if(!panel)return;
  const apply=panel.querySelector('[data-divine-action="apply"]');if(apply)apply.disabled=true;
  const saveSin=panel.querySelector('[data-divine-action="sin"]');if(saveSin)saveSin.disabled=state.busy||state.sinEdit==='';
  if(!state.preview)panel.querySelector('.workspace-divine-preview')?.remove();
  panel.querySelector('[role="alert"]')?.remove();
 }
 function field(container,label,key,{type='number',min=0,max=null}={}){
  const wrap=node('label','workspace-type',label),input=node('input');input.type=type;if(type==='number'){input.min=min;input.step='1';if(max!==null)input.max=max;}
  input.setAttribute('aria-label',label);input.dataset.focusKey='divine-'+key;input.value=state[key]??'';
  input.addEventListener('input',()=>{state[key]=input.value;state.preview=key.startsWith('wrath')&&state.preview?{...state.preview,ready:false}:null;state.error='';invalidateEditedForm(input);});
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
   wrathRoll:state.wrathRoll===''?undefined:Number(state.wrathRoll),wrathConsequences:state.wrathConsequence.trim(),
   choices:clone(state.choices),facts:{targets:clone(state.facts)},expiry};
 }
 return {render(actor,participants=[]){
  if(!actor)return null;if(state.actorId!==actor.id)reset(actor);
  const contracts=getAllDivineContracts().filter(row=>['blessing','miracle'].includes(row.type));
  const contract=contracts.find(row=>row.id===state.contractId)||contracts[0];if(!contract)return null;
  const panel=node('details','workspace-card workspace-divine');panel.dataset.divinePanel='';panel.open=state.open;
  panel.addEventListener('toggle',()=>{state.open=panel.open;});
  panel.append(node('summary','workspace-rubric','Prières divines · '+actor.name));
  const content=node('div','workspace-divine-content');panel.append(content);
  select(content,'Prière divine',contract.id,contracts.map(row=>[row.id,row.name+' · '+(labels[row.status]||row.status)]),value=>{state.targetIds=[];state.facts={};state.choices={range:0,targets:0,duration:0,effect:0};change('contractId',value);},'prayer');
  content.append(node('p','workspace-muted',(labels[contract.status]||contract.status)+' · '+(contract.deity||'Culte à préciser')));
  content.append(node('p','',contract.labels?.effect||''));
  if(contract.sourceDelta&&contract.status!=='blocked')content.append(node('p','workspace-muted','La règle V5 est présentée ici ; le texte du catalogue de consultation doit encore être actualisé.'));
  if(contract.status!=='blocked')content.append(node('p','workspace-muted',`Portée : ${paramText(contract.params?.range,actor)} · Cibles : ${paramText(contract.params?.targets,actor)} · Durée : ${paramText(contract.params?.duration,actor)}`));
  const source=contract.source;content.append(node('p','workspace-muted',source?.printedPage?'Source : livre V5, p. '+[].concat(source.printedPage).join(', '):'Source originale non retrouvée : cette prière reste indisponible.'));
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
  const form=node('div','workspace-resolution-row');content.append(form);
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
     const rules=[['withinRange','Portée / zone confirmée'],...(contract.type==='miracle'&&contract.id.endsWith('soleil-flamboyant')?[['nonMyrmidian','Ne vénère pas Myrmidia'],['lookingAtPriest','Regarde le prêtre']]:[['ally','Allié admissible']])];
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
  button(actions,'Appliquer la prière',()=>run(async()=>{const result=await Store.applyDivineExecution(contract.id,{preview:state.preview});if(result?.ok===false || result?.ready===false)throw Error(result.error||'Prière non appliquée.');state.preview=null;state.roll='';state.wrathRoll='';}),!state.preview?.ready,'apply');
  if(state.preview){
   const result=state.preview,preview=result.preview;
   const outcome=node('div','workspace-divine-preview');outcome.setAttribute('role','status');
   if(preview?.prayer)outcome.append(node('p','',`${preview.prayer.success?'Prière réussie':'Prière ratée'} · ${preview.prayer.sl} DR · score ${preview.skillScore}`));
   if(preview?.resolvedParams)outcome.append(node('p','workspace-muted','Après extensions : '+Object.entries(preview.resolvedParams).map(([key,value])=>({range:'portée',targets:'cibles',duration:'durée'}[key]||key)+' '+(value.value??({self:'Vous',special:'Spécial',instant:'Instantané'}[value.unit]||'Spécial'))+(value.unit&&!['self','special','instant'].includes(value.unit)?' '+value.unit:'')).join(' · ')));
   if(result.error)outcome.append(node('p','workspace-field-error',result.error));
   for(const missing of result.needsInput||[])outcome.append(node('p','workspace-muted',typeof missing==='string'?missing:missing.label||missing.field));
   for(const reminder of preview?.reminders||[])outcome.append(node('p','workspace-muted',reminder));
   if(preview?.wrath?.triggered){
    outcome.append(node('p','workspace-field-error','Courroux divin déclenché · +'+(10*preview.wrath.sinAtTest)+' au résultat de table.'));
    field(outcome,'Jet de Courroux (d100)','wrathRoll',{min:1,max:100});
    field(outcome,'Conséquences du Courroux traitées par le MJ','wrathConsequence',{type:'text'});
    if(result.wrathTableResult)outcome.append(node('p','workspace-muted',(result.wrathTableResult.label||'Résultat du Courroux')+' · '+(result.wrathTableResult.reminder||'')));
   }
   content.append(outcome);
  }
  if(state.error){const message=node('p','workspace-field-error',state.error);message.setAttribute('role','alert');content.append(message);}
  return panel;
 }};
}
