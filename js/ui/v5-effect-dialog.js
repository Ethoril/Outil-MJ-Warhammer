/** Explicit V5 effect inputs: values survive each preview and no die is drawn implicitly. */
import { userMessage, userError } from './messages.js';
import { formatV5Balance } from '../core/v5-resources.js';

const BOOLEAN_FIELDS = new Set(['silkCut','minuteElapsed','restSatisfied','engaged','fullRoundHidden','causeEnded','medicalAttention','surgery','outOfCombat','overrideRecovery']);
const el = (tag, text, className = '') => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
const METHODS = {
  'a-terre': [['stand-up','Se relever']], souille: [['clean','Se nettoyer']], extenue: [['rest','Repos adapté à la cause']],
  hemorragique: [['bandage','Poser un bandage'],['heal','Test de Guérison'],['medical-attention','Soins reçus'],['surgery','Chirurgie reçue']],
  brise: [['cool','Test de Calme'],['hiding','Un Round entier caché']], enflamme: [['athletics','Test d’Athlétisme']],
  enchevetre: [['opposed-strength','Test de Force opposé']], sonne: [['endurance','Test de Résistance'],['medical-attention','Soins reçus']],
  assourdi: [['endurance','Test de Résistance après une minute']], empoisonne: [['endurance','Test de Résistance'],['heal','Test de Guérison']],
  aveugle: [['cause-ended','Cause disparue'],['medical-attention','Soins reçus']], inconscient: [['cause-ended','Cause disparue']]
};
export function recoveryMethodsFor(condition) {
  const key = String(condition.key || condition.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[ -]+/g,'-');
  const silk = key === 'enchevetre' && condition.source?.ability === 'cliff-spider-lasso' ? [['cut-silk','Soie coupée (frappe tranchante de plus de 5 dégâts)']] : [];
  return METHODS[key] ? [...METHODS[key], ...silk, ['fortune','Dépense d’un point de Fortune']] : [];
}

/** Map explicit recovery fields without inventing a phase or changing the chosen Round. */
export function recoveryOptionsFor(input = {}, combatRound) {
  const { recoveryTest, recoveryMoment, currentRound, ...options } = input;
  if (recoveryTest) options.test = recoveryTest;
  if (currentRound !== undefined) {
    if (!Number.isSafeInteger(currentRound) || currentRound < 1) throw userError('Le Round courant doit être un entier supérieur ou égal à 1.');
    options.transition = { ...(options.transition || {}), round: currentRound };
  }
  if (recoveryMoment === 'endOfRound') options.transition = { ...(options.transition || {}), phase: 'endOfRound', round: currentRound ?? combatRound };
  if (recoveryMoment === 'outOfCombat') options.outOfCombat = true;
  return options;
}

/** Choose a recovery with its actual tool Fortune balance and cost visible. */
export function chooseV5RecoveryMethod({ participantName, condition, getFortune, editFortune } = {}) {
  const methods = recoveryMethodsFor(condition);
  if (!methods.length) return Promise.resolve(null);
  return new Promise(resolve => {
    const opener = document.activeElement;
    const dialog = el('dialog', null, 'tool-sheet v5-effect-dialog'), form = el('form');
    const heading = el('h2', 'Récupérer ' + condition.name + ' — ' + participantName); heading.id = 'v5-recovery-method-title'; dialog.setAttribute('aria-labelledby', heading.id);
    const label = el('label', 'Méthode de récupération'), select = el('select'); select.setAttribute('aria-label', 'Méthode de récupération'); select.append(new Option('Choisir…', ''), ...methods.map(([value, text]) => new Option(text, value))); label.append(select);
    const fortuneHint = el('p', '', 'workspace-muted'), fortuneEdit = el('button', 'Initialiser Fortune', 'ghost'); fortuneEdit.type = 'button';
    const controls = el('div', null, 'row'), confirm = el('button', 'Continuer'), cancel = el('button', 'Annuler', 'ghost'); confirm.type = 'submit'; cancel.type = 'button'; controls.append(confirm, cancel);
    let fortune = typeof getFortune === 'function' ? getFortune() : { balance: null }, selected = null;
    const refreshFortune = () => {
      fortune = typeof getFortune === 'function' ? getFortune() : fortune;
      fortuneHint.textContent = fortune.balance === null ? 'Fortune : solde courant inconnu. Initialisez le compteur avant une dépense.' : 'Fortune disponible : ' + formatV5Balance(fortune) + ' · coût de cette récupération : 1 point.';
      const option = Array.from(select.options).find(row => row.value === 'fortune'); if (option) option.disabled = fortune.balance === null || fortune.balance < 1;
      fortuneEdit.hidden = typeof editFortune !== 'function'; fortuneEdit.textContent = fortune.balance === null ? 'Initialiser Fortune' : 'Modifier Fortune';
      confirm.disabled = select.value === 'fortune' && (fortune.balance === null || fortune.balance < 1);
    };
    select.addEventListener('change', refreshFortune);
    fortuneEdit.addEventListener('click', async () => { fortuneEdit.disabled = true; try { await editFortune(); refreshFortune(); } finally { fortuneEdit.disabled = false; } });
    form.append(heading, label, fortuneHint, fortuneEdit, controls); dialog.append(form); document.body.append(dialog); refreshFortune();
    form.addEventListener('submit', event => { event.preventDefault(); if (!select.value) { select.focus(); return; } refreshFortune(); if (confirm.disabled) return; selected = select.value; dialog.close(); });
    cancel.addEventListener('click', () => dialog.close()); dialog.addEventListener('close', () => { dialog.remove(); if (opener?.isConnected) opener.focus(); resolve(selected); }, { once: true });
    dialog.showModal(); select.focus();
  });
}

/** Collect pending inputs, then submit against the same revision; subsequent requests reuse every value. */
export function openV5EffectInputDialog({ pending, submit, getCurrentRevision, title = 'Résoudre les effets V5' } = {}) {
  if (pending?.status !== 'requires-input' || typeof submit !== 'function') throw new TypeError('Aperçu d’effets V5 requis');
  return new Promise(resolve => {
    const opener=document.activeElement;
    const dialog=el('dialog',null,'tool-sheet v5-effect-dialog');const form=el('form');
    const heading=el('h2',title);heading.id='v5-effect-title';dialog.setAttribute('aria-labelledby',heading.id);
    const intro=el('p','Complétez les résultats de la table. Les effets seront enregistrés ensemble après confirmation.');
    const fields=el('div',null,'v5-effect-fields');const prior=el('div',null,'v5-effect-prior');const alert=el('p',null,'workspace-field-error');alert.setAttribute('role','alert');alert.hidden=true;
    const controls=el('div',null,'row');const confirm=el('button','Confirmer les effets');confirm.type='submit';const cancel=el('button','Annuler','ghost');cancel.type='button';controls.append(confirm,cancel);
    form.append(heading,intro,prior,fields,alert,controls);dialog.append(form);document.body.append(dialog);
    let current=pending,inputs=structuredClone(pending.inputs||{}),busy=false,finished=false,outcome={status:'cancelled'};
    const drawn=new Set(),labels=new Map();let readers=[];
    const keyFor=request=>`${request.participantId}:${request.field}`;
    const showError=message=>{alert.textContent=message;alert.hidden=false;};
    const finish=result=>{if(finished)return;finished=true;outcome=result;dialog.close();};
    const setValue=(request,value)=>{inputs[request.participantId]||={};inputs[request.participantId][request.field]=value;};
    const getValue=request=>inputs[request.participantId]?.[request.field];
    function render() {
      fields.replaceChildren();prior.replaceChildren();readers=[];alert.hidden=true;
      const pendingKeys=new Set((current.requests||[]).map(keyFor));
      const answered=[];
      for(const [participantId,values] of Object.entries(inputs))for(const [field,value]of Object.entries(values||{}))if(!pendingKeys.has(`${participantId}:${field}`)&&labels.has(`${participantId}:${field}`))answered.push(`${labels.get(`${participantId}:${field}`)} : ${Array.isArray(value)?(value.length?value.join(', '):'Aucune cible'):typeof value==='object'?`${value.success?'Réussite':'Échec'}, ${value.sl} DR`:String(value)}`);
      if(answered.length){const detail=el('details');detail.open=true;detail.append(el('summary','Résultats déjà renseignés'));answered.forEach(text=>detail.append(el('p',text)));prior.append(detail);}
      const groups=new Map();let manual=false,index=0;
      for(const request of current.requests||[]) {
        let group=groups.get(request.participantId);
        if(!group){group=el('fieldset');group.append(el('legend',request.participantName||'Combattant'));groups.set(request.participantId,group);fields.append(group);}
        labels.set(keyFor(request),`${request.participantName||'Combattant'} — ${request.label}`);
        const wrapper=el('div',null,'v5-effect-field');const label=el('label',`${request.label}${request.bonus?` (+${request.bonus} à la gravité)` : ''}`);const id=`v5-effect-input-${++index}`;label.htmlFor=id;wrapper.append(label);
        let kind=BOOLEAN_FIELDS.has(request.field)?'boolean':request.field==='recoveryMoment'?'moment':request.kind;
        const value=getValue(request);
        if(kind==='targets'){
          const select=document.createElement('select');select.multiple=true;select.setAttribute('aria-label',request.label);select.append(new Option('Aucune cible traversée','none'));
          for(const [id,name] of request.options || [])select.append(new Option(name,id));
          const previous=getValue(request);for(const option of select.options)option.selected=Array.isArray(previous)?previous.length===0?option.value==='none':previous.includes(option.value):false;
          wrapper.append(select);readers.push(()=>{const values=[...select.selectedOptions].map(o=>o.value);if(!values.length || values.includes('none')&&values.length>1)throw userError('Sélectionnez les destinataires ou « Aucune cible traversée ».');setValue(request,values.includes('none')?[]:values);});
        } else if(kind==='wards'){
          const input=document.createElement('input');input.type='text';input.setAttribute('aria-label',request.label);input.value=getValue(request) ?? '';wrapper.append(input);readers.push(()=>{if(!/^\s*(?:10|[1-9])(?:\s+(?:10|[1-9]))*\s*$/.test(input.value))throw userError('Un d10 par Protection, séparé par des espaces.');const dice=input.value.trim().split(/\s+/).map(Number);setValue(request,dice.length===1?dice[0]:dice);});
        } else if(kind==='manual') {
          manual=true;wrapper.append(el('p','Corrigez cette donnée dans la fiche, puis recalculez. Aucun effet n’a encore été enregistré.','workspace-muted'));
        } else if(kind==='boolean'||kind==='moment') {
          const select=el('select');select.id=id;
          const choices=kind==='moment'?[['','Choisir le moment…'],['endOfRound','Fin de Round confirmée par le MJ'],['outOfCombat','Hors combat']]:[['','À préciser'],['true','Oui'],['false','Non']];select.append(...choices.map(([key,text])=>new Option(text,key)));select.value=value==null?'':String(value);wrapper.append(select);
          readers.push(()=>{if(select.value==='')throw userError(`Précisez : ${request.label}.`);setValue(request,kind==='boolean'?select.value==='true':select.value);});
        } else if(kind==='test') {
          const row=el('div',null,'v5-effect-test');const success=el('select');success.id=id;success.setAttribute('aria-label',`${request.label} : résultat`);success.append(new Option('Résultat…',''),new Option('Réussite','true'),new Option('Échec','false'));success.value=typeof value?.success==='boolean'?String(value.success):'';
          const slLabel=el('label','DR finaux');const sl=el('input');sl.type='number';sl.step='1';sl.inputMode='numeric';sl.value=value?.sl??'';sl.setAttribute('aria-label',`${request.label} : DR`);slLabel.append(sl);row.append(success,slLabel);wrapper.append(row,el('p','Saisissez le résultat final du Test, avec les modificateurs V5 déjà retenus.','workspace-muted'));
          readers.push(()=>{const amount=Number(sl.value);if(!success.value||sl.value===''||!Number.isSafeInteger(amount))throw userError(`Saisissez la réussite et les DR : ${request.label}.`);const passed=success.value==='true';if(passed&&amount<0||!passed&&amount>0)throw userError('La réussite et les DR indiqués sont incompatibles.');setValue(request,{success:passed,sl:amount});});
        } else {
          const input=el('input');input.id=id;input.type='text';input.inputMode='numeric';input.autocomplete='off';input.value=value??'';input.setAttribute('aria-label',request.label);
          const maximum=kind==='d8'?8:kind==='d10'?10:kind==='2d10'?20:kind==='d100'?100:Number.MAX_SAFE_INTEGER;const minimum=kind==='2d10'?2:kind==='d8'||kind==='d10'||kind==='d100'||request.field==='currentRound'?1:0;
          const row=el('div',null,'row');row.append(input);
          if(kind==='d10'||kind==='d100') {
            const roll=el('button',`Lancer ${kind}`,'ghost');roll.type='button';roll.setAttribute('aria-label',`Lancer ${kind} : ${request.label}`);roll.disabled=drawn.has(keyFor(request));
            roll.addEventListener('click',()=>{if(drawn.has(keyFor(request)))return;const rolled=Math.floor(Math.random()*maximum)+1;input.value=String(rolled);setValue(request,rolled);drawn.add(keyFor(request));roll.disabled=true;input.focus();});row.append(roll);
          }
          wrapper.append(row);
          readers.push(()=>{const text=input.value.trim();const amount=kind==='d100'&&text==='00'?100:Number(text);if(!text||!Number.isSafeInteger(amount)||amount<minimum||amount>maximum)throw userError(`${request.label} : entier ${maximum===Number.MAX_SAFE_INTEGER?(minimum===1?'supérieur ou égal à 1':'positif ou nul'):`de ${minimum} à ${maximum}`} requis.`);setValue(request,amount);});
        }
        group.append(wrapper);
      }
      confirm.disabled=manual||busy;
    }
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy||confirm.disabled)return;
      if(typeof getCurrentRevision==='function'&&getCurrentRevision()!==current.baseRevision){showError('La partie a changé. Fermez cette fenêtre et recalculez les effets.');confirm.disabled=true;return;}
      try {
        readers.forEach(read=>read());busy=true;confirm.disabled=true;cancel.disabled=true;
        const result=await submit(structuredClone(inputs),current.baseRevision);
        if(result?.status==='requires-input'){current={...result,inputs};busy=false;cancel.disabled=false;render();fields.querySelector('input,select')?.focus();return;}
        if(result?.status==='stale'){busy=false;cancel.disabled=false;showError('La partie a changé. Fermez cette fenêtre et recalculez les effets.');confirm.disabled=true;return;}
        if(result===false||result?.ok===false)throw result?.error||userError('Les effets n’ont pas été enregistrés : réessayez.');
        finish(result);
      }catch(error){busy=false;confirm.disabled=false;cancel.disabled=false;showError(userMessage(error,'Les effets n’ont pas été enregistrés : vérifiez les résultats.'));}
    });
    cancel.addEventListener('click',()=>finish({status:'cancelled'}));dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    dialog.addEventListener('close',()=>{dialog.remove();opener?.isConnected&&opener.focus();resolve(outcome);},{once:true});
    render();dialog.showModal();fields.querySelector('input,select')?.focus();
  });
}
