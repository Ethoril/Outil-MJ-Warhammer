/**
 * Options propres à un sort (Forme bestiale, Transformation de Kadon, Main de Gloire, Apothéose) : chaque bloc ne
 * s'affiche que pour le sort concerné. La surpuissance générique reste dans resolution-panel.
 */
import { BEAST_PROFILES, KADON_PROFILES, BEAST_TRAIT_COST, KADON_OPTION_COST, optionalTransformationTraits, previewBeastForm, traitSize } from '../core/v5-magic-arbitrations.js';
import {spellObjectChoices,conjuredWeaponSkillScore} from '../core/equipment.js';
import {wardDiceCount} from '../core/v5-magic-combat.js';
import {getSpellContract,isHostileTarget} from '../core/v5-spell-contracts.js';

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const SIZE_LABELS = { small: 'Petite', average: 'Moyenne', large: 'Grande', enormous: 'Énorme', monstrous: 'Monstrueuse' };
const KADON_MANUAL = 'manual';
const MONSTER_STATS = ['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Soc'];

/** Nombre de DR de surpuissance encore disponibles d'après le dernier aperçu de l'incantation ; Infinity tant qu'il n'y en a pas. */
function availableOvercast(draft) {
  const overcast = draft.preview?.castPreview?.overcast;
  return Number.isFinite(overcast?.remainingSL) ? overcast.remainingSL + (Number(overcast.totalSpent) || 0) : Infinity;
}

/** Résumé du profil obtenu (caractéristiques remplacées, Blessures, attaques), recalculé pour le lanceur ; null si indéterminé. */
function profileSummary(actor, profile, kind, optionalTraits) {
  try {
    const { plan } = previewBeastForm(actor, profile, { kind, optionalTraits, durationRounds: kind === 'kadon' ? 1 : null });
    const stats = ['F', 'E', 'Ag', 'Dex', ...(kind === 'kadon' ? ['CC', 'CT', 'I', 'Soc'] : [])].map(key => `${key} ${plan.caracs[key] ?? '–'}`).join(' · ');
    const attacks = plan.attacks.map(attack => `${attack.name} (${attack.damageBonus ? `BF${attack.damageBonus > 0 ? '+' : ''}${attack.damageBonus}` : 'BF'}${attack.free === 'momentum' ? ', perd l’Élan' : attack.free === 'charge' ? ', en chargeant' : ''})`).join(', ');
    return `M ${plan.M} · ${stats} · Blessures ${plan.wounds} — ${plan.woundsFormula}. Armure : ${plan.armor ? `${plan.armor.name} +${plan.armor.ap} PA` : 'aucune'}. Attaques : ${attacks || 'aucune saisie'}.`;
  } catch (error) {
    return error.message;
  }
}

export function renderSpellOptions({ actor, participants, contract, draft, handlers, targetIds = [] }) {
  const special = contract?.effects?.special;
  const nodes = [];
  const push = element => { nodes.push(element); return element; };

  const numberField = (key, text, min = 0, max = 100) => {
    const label = node('label', 'workspace-type', text);
    const input = document.createElement('input');
    input.type = 'number'; input.min = String(min); input.max = String(max); input.step = '1';
    input.value = draft[key] ?? '';
    input.setAttribute('aria-label', text);
    input.dataset.focusKey = key;
    input.addEventListener('input', () => handlers.input(key, input.value === '' ? null : Number(input.value)));
    label.appendChild(input);
    return push(label);
  };
  const checkField = (key, text, { checked = Boolean(draft[key]), onChange = value => handlers.select({ [key]: value }), disabled = false, focusKey = key } = {}) => {
    const label = node('label', 'workspace-type workspace-recipient-check');
    const input = document.createElement('input');
    input.type = 'checkbox'; input.checked = checked; input.disabled = disabled;
    input.setAttribute('aria-label', text); input.dataset.focusKey = focusKey;
    input.addEventListener('change', () => onChange(input.checked));
    label.append(input, ` ${text}`);
    return push(label);
  };
  const selectField = (key, text, options, value, focusKey, onChange = next => handlers.select({ [key]: next })) => {
    const label = node('label', 'workspace-type', text);
    const select = document.createElement('select');
    select.setAttribute('aria-label', text); select.dataset.focusKey = focusKey;
    for (const [optionValue, optionText] of options) select.appendChild(new Option(optionText, optionValue));
    select.value = value;
    select.addEventListener('change', () => onChange(select.value));
    label.appendChild(select);
    return push(label);
  };

  const spellField=(key,text,{who=null,type='number',choices=null,min=0,max=100}={})=>{
    const data=who?draft.magicTargetTests?.[who.id] || {}:draft.magicSpellFacts || {},label=node('label','workspace-type',text+(who?' — '+who.name:''));
    const control=document.createElement(choices?'select':'input');control.setAttribute('aria-label',label.textContent);control.dataset.focusKey='wom-'+(who?.id || 'caster')+'-'+key;
    const change=value=>{const current=who?draft.magicTargetTests?.[who.id] || {}:draft.magicSpellFacts || {},field=who?'magicTargetTests':'magicSpellFacts',next=who?{...draft.magicTargetTests,[who.id]:{...current,[key]:value}}:{...current,[key]:value};if(choices || /^mini[1-3]Direction$/.test(key))handlers.select({[field]:next});else handlers.input(field,next);};
    if(choices){control.append(new Option('À renseigner',''));for(const [v,t] of choices)control.append(new Option(t,v));control.value=data[key]===undefined?'':String(data[key]);control.addEventListener('change',()=>change(control.value===''?undefined:type==='boolean'?control.value==='true':control.value));}
    else{control.type=type;control.min=min;control.max=max;control.value=data[key] ?? '';control.addEventListener('input',()=>change(control.value===''?undefined:type==='number'?Number(control.value):control.value));}
    label.append(control);push(label);
  };
  if(special==='verdant-apotheosis')for(const who of participants.filter(p=>targetIds.includes(p.id)))spellField('decapitated','Cadavre décapité',{who,type:'boolean',choices:[['false','Non'],['true','Oui']]});
  const vortex=contract?.effects?.vortex;
  if(vortex){
    for(const who of participants.filter(p=>targetIds.includes(p.id))){
      if(vortex.throw){spellField('throwDirection','Thorsen : direction aléatoire de projection (d8)',{who,min:1,max:8});spellField('collision','Thorsen : collision solide ou créature',{who,type:'boolean',choices:[['true','Oui'],['false','Non']]});if(draft.magicTargetTests?.[who.id]?.collision && wardDiceCount(who))spellField('collisionWardRoll','Thorsen : d10 des Protections contre collision',{who,type:'text'});}
      if(vortex.suffocation)spellField('inside','Cendres : encore dans le nuage après le déplacement',{who,type:'boolean',choices:[['true','Oui'],['false','Non']]});
      if(draft.magicOvercastSpecific?.sun){spellField('sunTouched','Soleil Violet : contact avec la sphère',{who,type:'boolean',choices:[['true','Oui'],['false','Non']]});if(draft.magicTargetTests?.[who.id]?.sunTouched)spellField('calmRoll','Soleil Violet : Calme contre la mort (d100)',{who,min:1,max:100});}
    }
    if(draft.magicOvercastSpecific?.mini && draft.magicVortexDistance!=null && Number(draft.magicVortexDistance)<=8){
      for(let i=1;i<=Math.min(3,draft.magicOvercastSpecific.mini);i++){
        const stage='mini'+i;spellField(stage+'Direction','Mini-vortex '+i+' : direction aléatoire d10',{min:1,max:10});const direction=draft.magicSpellFacts?.[stage+'Direction'];
        if(direction && direction!==1 && direction!==5)spellField(stage+'Distance','Mini-vortex '+i+' : distance 2d10',{min:2,max:20});
        if(direction && direction!==1){const label=node('label','workspace-type','Mini-vortex '+i+' : cibles réellement traversées'),select=document.createElement('select');select.multiple=true;select.setAttribute('aria-label',label.textContent);select.dataset.focusKey='wom-'+stage+'Targets';select.append(new Option('Aucune cible','none'));for(const p of participants)select.append(new Option(p.name,p.id));const previous=draft.magicSpellFacts?.[stage+'Targets'];for(const option of select.options)option.selected=Array.isArray(previous)?previous.length===0?option.value==='none':previous.includes(option.value):false;select.addEventListener('change',()=>handlers.input('magicSpellFacts',{...draft.magicSpellFacts,[stage+'Targets']:[...select.selectedOptions].map(o=>o.value).filter(id=>id!=='none')}));label.append(select);push(label);}
      }
    }
  }
  const factFields=(contract?.effects?.facts || []).flatMap(spec=>spec.perTarget?participants.filter(p=>targetIds.includes(p.id) && !(spec.optionalForSelf && p.id===actor.id)).map(p=>({...spec,targetId:p.id,label:spec.label+' — '+p.name})):spec);
  const optionalTest=contract?.effects?.optionalTargetTest;
  if(optionalTest)for(const person of participants.filter(p=>targetIds.includes(p.id))){
    const data=()=>draft.magicTargetTests?.[person.id] || {};
    const change=patch=>handlers.select({magicTargetTests:{...draft.magicTargetTests,[person.id]:{...data(),...patch}}});
    checkField('magicTargetTests','Tenter '+optionalTest.label+' — '+person.name,{checked:data()[optionalTest.choiceKey]===true,focusKey:'magic-optional-'+person.id,onChange:yes=>change({[optionalTest.choiceKey]:yes})});
    if(data()[optionalTest.choiceKey]){
      const label=node('label','workspace-type',optionalTest.label+' : d100 — '+person.name),input=document.createElement('input');
      input.type='number';input.min='1';input.max='100';input.value=data()[optionalTest.rollField] ?? '';input.setAttribute('aria-label',label.textContent);input.dataset.focusKey='magic-optional-roll-'+person.id;
      input.addEventListener('input',()=>handlers.input('magicTargetTests',{...draft.magicTargetTests,[person.id]:{...data(),[optionalTest.rollField]:input.value===''?undefined:Number(input.value)}}));label.append(input);push(label);
    }
  }
  for (const spec of factFields) {
    const current = spec.targetId ? draft.magicTargetTests?.[spec.targetId] || {} : draft.magicSpellFacts || {};
    if(spec.requiredWhen && (current[spec.requiredWhen.key] ?? draft.magicSpellFacts?.[spec.requiredWhen.key])!==spec.requiredWhen.value)continue;
    if(spec.optionalFromWeaponSkill && conjuredWeaponSkillScore(actor,draft.magicSpellFacts?.weaponKey)!==null)continue;
    if(spec.requiredIfOvercast && !Number(draft.magicOvercastSpecific?.[spec.requiredIfOvercast]))continue;
    const change = value => {
      const key=spec.targetId?'magicTargetTests':'magicSpellFacts',patch=spec.targetId?{...draft.magicTargetTests,[spec.targetId]:{...draft.magicTargetTests?.[spec.targetId],[spec.key]:value}}:{...draft.magicSpellFacts,[spec.key]:value};
      if(['boolean','select','object','effect','spell'].includes(spec.type))handlers.select({[key]:patch});else handlers.input(key,patch);
    };
    if(spec.type==='targets'){
      const label=node('label','workspace-type',spec.label),select=document.createElement('select');select.multiple=true;select.setAttribute('aria-label',spec.label);select.dataset.focusKey='magic-fact-'+spec.key;
      for(const who of participants.filter(p=>targetIds.includes(p.id))){const option=new Option(who.name,who.id);option.selected=(current[spec.key] || []).includes(who.id);select.append(option);}
      select.addEventListener('change',()=>handlers.select({magicSpellFacts:{...draft.magicSpellFacts,[spec.key]:[...select.selectedOptions].map(o=>o.value)}}));label.append(select);push(label);
    } else if (['boolean','select','object','effect','spell'].includes(spec.type)) {
      const person=participants.find(p=>p.id===(spec.targetId || targetIds[0]));
      const choices=spec.type==='effect'?(person?.extensions?.v5?.spellEffects || []).map(e=>[e.id,e.spellName+' — '+e.id]):spec.type==='spell'?(person?.spells || []).map(s=>getSpellContract(typeof s==='string'?s:s.id) || getSpellContract(s.name || s.nom)).filter(Boolean).map(c=>[c.id,c.name]):spec.type==='object'?spellObjectChoices(person,spec).map(item=>[item.id,item.label]):spec.options;
      const options = spec.type === 'boolean' ? [['','À renseigner'],['true','Oui'],['false','Non']] : [['','À renseigner'], ...(choices || [])];
      selectField('magicSpellFacts', spec.label, options, current[spec.key] === undefined ? '' : String(current[spec.key]), 'magic-fact-' + spec.key+(spec.targetId?'-'+spec.targetId:''),
        value => change(value === '' ? undefined : spec.type === 'boolean' ? value === 'true' : value));
    } else {
      const label = node('label', 'workspace-type', spec.label), input = document.createElement('input');
      input.type = spec.type === 'number' ? 'number' : 'text'; input.value = current[spec.key] ?? '';
      if (spec.type === 'number') { input.min=String(spec.min ?? 0); if(spec.max!==undefined)input.max=String(spec.max); input.step=spec.integer===false?'any':'1'; }
      input.setAttribute('aria-label',spec.label); input.dataset.focusKey='magic-fact-'+spec.key+(spec.targetId?'-'+spec.targetId:'');
      input.addEventListener('input',()=>change(input.value === '' ? undefined : spec.type === 'number' ? Number(input.value) : input.value));
      label.append(input); push(label);
    }
  }

  const baseEffects=contract?.effects || {},selectedEffects={...baseEffects,...baseEffects.factModes?.values[draft.magicSpellFacts?.[baseEffects.factModes?.fact]]};
  for(const who of participants.filter(p=>targetIds.includes(p.id))){
    const test=selectedEffects.primarySecondaryTests?(who.id===targetIds[0]?selectedEffects.primarySecondaryTests.primary:selectedEffects.primarySecondaryTests.others):selectedEffects.secondaryTest;
    if(test && (!test.whenFact || draft.magicTargetTests?.[who.id]?.[test.whenFact]===true) && !draft.magicTargetTests?.[who.id]?.[test.skipWhenFact])spellField(test.rollField || 'resistanceRoll','Sort : '+test.skill+' ('+(test.modifierSl || 0)+' DR, d100)',{who,min:1,max:100});
    if(selectedEffects.attitudeModifiers && isHostileTarget(actor,who))spellField('fearRoll','Cor : Peur (Calme, d100)',{who,min:1,max:100});
    if(selectedEffects.followupTest){const t=selectedEffects.followupTest;spellField(t.rollField,'Sort : second '+t.skill+' ('+t.modifierSl+' DR, d100) si premier échec',{who,min:1,max:100});}
    if(selectedEffects.permanentStatDice)for(const [key,field] of Object.entries(selectedEffects.permanentStatDice))spellField(field,'Vieillissement : perte permanente de '+key+' (d10) si Calme raté',{who,min:1,max:10});
    if(Object.entries(baseEffects.optionRules || {}).some(([id,r])=>r.immediateSuffocation && draft.magicOvercastSpecific?.[id] && (draft.magicSpellFacts?.['optionTargets_'+id] || []).includes(who.id)))spellField('optionResistanceRoll','Suffocation : Force Mentale (d100)',{who,min:1,max:100});
  }
  const opposition=selectedEffects.opposedTest,opposedTargets=opposition?participants.filter(p=>targetIds.includes(p.id) && (!opposition.whenFact || draft.magicTargetTests?.[p.id]?.[opposition.whenFact]===true)):[];
  if(opposedTargets.length){
    if(!factFields.some(f=>f.key==='opposedActorRoll'))spellField('opposedActorRoll','Opposition : Force Mentale du lanceur (d100)',{min:1,max:100});
    for(const who of opposedTargets)if(!factFields.some(f=>f.key==='opponentRoll'&&f.targetId===who.id))spellField('opponentRoll','Opposition : '+opposition.targetSkill+' de la cible (d100)',{who,min:1,max:100});
  }
  const active = participants.flatMap(p => (p.extensions?.v5?.spellEffects || []).filter(e=>e.spellId===contract?.id).map(e=>({owner:p,e})));
  if (active.length && handlers.magicSpellInteraction) {
    const current=draft.magicInteraction || {}, change=patch=>handlers.select({magicInteraction:{...draft.magicInteraction,...patch}});
    const details=push(node('details','workspace-v5-context-details'));
    details.open=true;
    details.append(node('summary','','Clause d’un sort actif'));
    const add=(key,text,options)=>{
      const label=node('label','workspace-type',text), select=document.createElement('select'); select.setAttribute('aria-label',text);
      select.append(new Option('À renseigner','')); for(const [value,title] of options)select.append(new Option(title,value));
      select.dataset.focusKey='magic-clause-'+key;
      select.value=current[key] || '';select.addEventListener('change',()=>change({[key]:select.value,...(key==='effectId'?{kind:''}:{})}));label.append(select);details.append(label);
    };
    add('effectId','Effet actif',active.map(({owner,e})=>[e.id,owner.name+' — '+e.spellName]));
    add('targetId','Destinataire de la clause',participants.map(p=>[p.id,p.name]));
    const e=active.find(item=>item.e.id===current.effectId)?.e;
    add('kind','Clause à résoudre',[
      ...(e?.recurringHits ? [['engage','Lames Azurées : ajouter un adversaire engagé']] : []),
      ...(e?.specialState?.bodyFire?[['body-fire','Corps de Feu : empoignade ou sang après Blessures']]:[]),
      ...(e?.specialState?.deathBurst?[['death-burst','Sang Bouillonnant : explosion à la mort confirmée']]:[]),
      ...(e?.specialState?.mountFleeing?[['calm-mount','Anraheir : calmer la monture (Chevaucher)']]:[]),
      ...(e?.specialState?.zoneModifiers?[['zone','Déclarer sortie ou rentrée dans la zone']]:[]),
      ...(e?.specialState?.endsOnEvents?.includes('leave-zone')?[['leave-zone','Sortie de zone : fin de la protection']]:[]),
      ...(e?.specialState?.wormGrapple?[['worm','Ver : lutte opposée et action']]:[]),
      ...(e?.specialState?.summonAttack?[['summon-attack','Invocation : attaquer avec une créature']]:[]),
      ...(e?.specialState?.grappleFloor?[['grapple','Iyrtu : Test d’empoignade']]:[]),
      ...(e?.triggered?[['trigger','Traversée ou effet déclenché']]:[]),
      ...(e?.specialState?.endsOnEvents?.length?[['event','Déclarer un événement de fin']]:[]),
      ...(e?.specialState?.moveTest?[['move','Tentative de mouvement']]:[]),
      ...(e?.specialState?.detection?[['detect','Détection par Seconde vue']]:[]),
      ...(e?.specialState?.endsOnAttackOrNoise?[['noise','Bruit fort ou attaque : fin de l’invisibilité']]:[]),
      ...(e?.specialState?.endsOnEvents?.includes('noise')?[['noise','Bruit fort : réveil']]:[]),
      ...(e?.specialState?.endsOnEvents?.includes('jostle')?[['jostle','Déplacement ou secousse : réveil']]:[]),
      ...(e?.specialState?.endsOnEvents?.includes('immersion')?[['immersion','Immersion complète eau/sable : fin']]:[]),
      ...(e?.specialState?.invisibleEyeActive?[['eye-refocus','Retour au corps : œil détruit, Surpris']]:[]),
      ...(e?.specialState?.missileMissReroll?[['missile-reroll','Relance d’un tir raté contre la cible maudite']]:[]),
      ...(e?.specialState?.ironVoice?[['iron-listener','Auditeur hostile : Perception −1']]:[]),
      ...(e?.specialState?.tempestMovement?[['tempest-move','Tempête : Calme pour se déplacer']]:[]),
      ...(e?.specialState?.controlTest?[['control','Contrôle du sort ('+e.specialState.controlTest.skill+')']]:[]),
      ...(e?.specialState?.objectMovement?[['opposed-move','Déplacement entravé : FM contre Force']]:[]),
      ...(e?.specialState?.damageTrigger?[['blood','Sang corrosif après Blessures : engagés déclarés']]:[]),
      ...(e?.specialState?.flightAvailable?[['flight','Déclarer en vol ou au sol']]:[]),
      ['end','Fin de l’effet déclarée par le MJ']
    ]);
    const branch = current.kind==='trigger' ? e?.triggered : current.kind==='move' ? e?.specialState?.moveTest : null;
    if(current.kind==='event')add('controlValue','Événement déclaré',(e?.specialState?.endsOnEvents || []).map(name=>[name,({'leave-shadow':'Une partie quitte l’ombre','cross-path':'Le groupe croise un chemin','harm-tree':'Le groupe blesse un arbre vivant'}[name] || name)]));
    if(current.kind==='trigger' && branch?.alternativeTest)add('controlValue','Test au choix',[['normal',branch.test.skill],['alternative',branch.alternativeTest.skill]]);
    if(current.kind==='control')add('controlValue','Modification du sort',[...(e?.specialState?.controlTest?.options || []),...(e?.specialState?.extendedAfterFailures?[['duration','Prolonger BI heures (trois échecs déclarés)']]:[])]);
    if(current.kind==='flight')add('controlValue','Position de vol',[['air','En vol'],['ground','Au sol']]);
    if(current.kind==='missile-reroll'){
      add('actionId','Action de tir de l’attaquant',(participants.find(p=>p.id===current.targetId)?.actions || []).filter(a=>a.type==='attack'&&a.attr==='CT').map(a=>[a.id,a.note || a.id]));
      for(const [key,text] of [['missileDeclared','Tir physique ou munition magique (pas un projectile magique)'],['missConfirmed','Tir initial raté confirmé']]){const label=node('label','workspace-recipient-check'),input=document.createElement('input');input.type='checkbox';input.checked=current[key]===true;input.setAttribute('aria-label',text);input.addEventListener('change',()=>change({[key]:input.checked}));label.append(input,' '+text);details.append(label);}
    }
    if(current.kind==='tempest-move')add('controlValue','Tempête : cible en vol ou au sol',[['air','En vol'],['ground','Au sol']]);
    if(current.kind==='control' && e?.specialState?.controlTest?.lineOfSight){
      const label=node('label','workspace-type','Ligne de vue confirmée'),select=document.createElement('select');select.setAttribute('aria-label',label.textContent);for(const [v,t] of [['','À renseigner'],['true','Oui'],['false','Non']])select.append(new Option(t,v));select.value=current.lineOfSight==null?'':String(current.lineOfSight);select.addEventListener('change',()=>change({lineOfSight:select.value===''?undefined:select.value==='true'}));label.append(select);details.append(label);
    }
    if(['blood','death-burst'].includes(current.kind)){
      const burst=current.kind==='death-burst';
      const label=node('label','workspace-recipient-check'),input=document.createElement('input');input.type='checkbox';input.checked=current.targetsDeclared===true;input.setAttribute('aria-label',burst?'Toutes les créatures à 2 mètres sont déclarées':'Tous les engagés sont déclarés');input.addEventListener('change',()=>change({targetsDeclared:input.checked,targetIds:current.targetIds || []}));label.append(input,burst?' Toutes les créatures à 2 mètres sont déclarées (y compris aucune)':' Tous les engagés sont déclarés (y compris aucun)');details.append(label);
      for(const person of participants.filter(p=>p.id!==active.find(item=>item.e.id===current.effectId)?.owner.id)){
        const label=node('label','workspace-recipient-check'),input=document.createElement('input');input.type='checkbox';input.checked=(current.targetIds || []).includes(person.id);input.setAttribute('aria-label',(burst?'Explosion : créature ':'Sang corrosif : engagé ')+person.name);input.addEventListener('change',()=>change({targetIds:input.checked?[...new Set([...(current.targetIds || []),person.id])]:(current.targetIds || []).filter(id=>id!==person.id)}));label.append(input,' '+person.name);details.append(label);
        if(input.checked)for(const [field,text] of [['locationRoll','Localisation d100'],['wardRoll','Protection d10'],...(current.kind==='death-burst'?[['distance','Explosion : distance (m)']]:[])]){
          const l=node('label','workspace-type',text+' — '+person.name),i=document.createElement('input');i.type=field==='wardRoll'?'text':'number';i.value=current.targetTests?.[person.id]?.[field] ?? '';i.setAttribute('aria-label',l.textContent);i.dataset.focusKey='blood-'+person.id+'-'+field;i.addEventListener('input',()=>{const latest=draft.magicInteraction || {};handlers.input('magicInteraction',{...latest,targetTests:{...latest.targetTests,[person.id]:{...latest.targetTests?.[person.id],[field]:field==='wardRoll'?i.value:i.value===''?undefined:Number(i.value)}}});});l.append(i);details.append(l);
        }
      }
    }
    if(current.kind==='body-fire'){
      add('controlValue','Clause de Corps de Feu',[['grab','Adversaire saisissant : dégâts et Calme −2'],['grapple','Votre empoignade : dégâts et Enflammé'],['blood','Blessures reçues en mêlée : Esquive ou projectile']]);
      if(current.controlValue==='blood'){const label=node('label','workspace-recipient-check'),input=document.createElement('input');input.type='checkbox';input.checked=current.meleeWoundConfirmed===true;input.setAttribute('aria-label','Corps de Feu : Blessures reçues en mêlée confirmées');input.addEventListener('change',()=>change({meleeWoundConfirmed:input.checked}));label.append(input,' Blessures reçues en mêlée confirmées');details.append(label);}
    }
    if(current.kind==='death-burst'){const label=node('label','workspace-recipient-check'),input=document.createElement('input');input.type='checkbox';input.checked=current.deathConfirmed===true;input.setAttribute('aria-label','Sang Bouillonnant : mort due au sort confirmée');input.addEventListener('change',()=>change({deathConfirmed:input.checked}));label.append(input,' Mort due au sort confirmée');details.append(label);}
    if(current.kind==='zone')add('controlValue','Présence dans la zone',[['inside','Dans la zone'],['outside','Hors de la zone']]);
    if(current.kind==='worm'){
      add('controlValue','Action du Ver',[['entangle','Ajouter Enchevêtré'],['leather','Dissoudre du cuir']]);
      if(current.controlValue==='leather'){
        const label=node('label','workspace-type','Ver : localisations réellement protégées de cuir'),select=document.createElement('select');select.multiple=true;select.setAttribute('aria-label',label.textContent);for(const [id,title] of [['head','Tête'],['body','Corps'],['arms','Bras'],['legs','Jambes']])select.append(new Option(title,id));const old=current.targetTests?.[current.targetId]?.leatherLocations || [];for(const option of select.options)option.selected=old.includes(option.value);select.addEventListener('change',()=>change({targetTests:{...current.targetTests,[current.targetId]:{...current.targetTests?.[current.targetId],leatherLocations:[...select.selectedOptions].map(o=>o.value)}}}));label.append(select);details.append(label);
      }
    }
    if(current.kind==='summon-attack'){
      add('controlValue','Défense contre l’invocation',[['melee','Corps à corps (Bagarre)'],['dodge','Esquive']]);
      for(const [key,text] of [['lineOfSight','Invocation : ligne de vue confirmée'],['actionConfirmed','Invocation : Action dépensée pour diriger']]){const label=node('label','workspace-recipient-check'),input=document.createElement('input');input.type='checkbox';input.checked=current[key]===true;input.setAttribute('aria-label',text);input.addEventListener('change',()=>change({[key]:input.checked}));label.append(input,' '+text);details.append(label);}
    }
    const rolls = [...(current.kind==='body-fire'?[...(current.controlValue!=='grapple'?[['roll','Clause : jet secondaire d100',100]]:[]),['locationRoll','Clause : localisation d100',100],['wardRoll','Clause : Protection d10',10]]:[]),...(branch?.test || ['move','detect','control','opposed-move','iron-listener','missile-reroll','tempest-move','worm','summon-attack','grapple','calm-mount'].includes(current.kind) && !(current.kind==='control'&&current.controlValue==='duration') ? [['roll','Clause : jet secondaire d100',100]] : []),
      ...(current.kind==='control'&&e?.specialState?.controlTest?.minimumDeclaredFailures?[['declaredFailures','Nombre d’échecs de Navigation déclaré',999]]:[]),
      ...(current.kind==='missile-reroll'?[['originalRoll','Tir initial : d100',100]]:[]),
      ...(branch?.opposedTest?[['opponentRoll','Auteur de l’effet magique : Force Mentale d100',100]]:[]),
      ...(['worm','summon-attack'].includes(current.kind)?[['opponentRoll','Clause : défense adverse d100',100]]:[]),
      ...(current.kind==='summon-attack'?[['distance','Invocation : distance réelle (m)',100000],['locationRoll','Invocation : localisation d100',100],['wardRoll','Invocation : Protections d10',10],...(e?.specialState?.summonAttack?.requiresStrengthBonus?[['strengthBonus',e?.specialState?.summonAttack?.invisible?'Chiens : Bonus de Force du profil MJ':'Invocation : Bonus de Force du profil MJ',100]]:[])]:[]),
      ...(current.kind==='opposed-move'?[['opponentRoll','Clause : Force adverse d100',100]]:[]),
      ...(current.kind==='blood'?[['damageRoll','Clause : dégâts communs d10',10]]:[]),
      ...(branch?.missile ? [['locationRoll','Clause : localisation d100',100],['wardRoll','Clause : Protection d10',10]] : branch?.damageOnTestSuccess?[['wardRoll','Clause : Protection d10',10]]:[])];
    for(const [key,text,max] of rolls) {
      const label=node('label','workspace-type',text), input=document.createElement('input');input.type=key==='wardRoll'?'text':'number';input.min='1';input.max=String(max);input.value=Array.isArray(current[key])?current[key].join(' '):current[key] ?? '';input.setAttribute('aria-label',text);
      if(key==='wardRoll')input.placeholder='Un d10 par Protection, séparés par des espaces';
      input.dataset.focusKey='magic-clause-'+key;
      input.addEventListener('input',()=>handlers.input('magicInteraction',{...draft.magicInteraction,[key]:key==='wardRoll'?input.value:input.value===''?undefined:Number(input.value)}));label.append(input);details.append(label);
    }
    const button=node('button','workspace-secondary','Résoudre la clause du sort');button.type='button';button.disabled=!current.effectId || !current.targetId || !current.kind || draft.busy;
    const revision=handlers.magicRevision?.();button.addEventListener('click',()=>handlers.magicSpellInteraction({...draft.magicInteraction},revision));details.append(button);
  }

  /** Traits optionnels d'une créature : une case par trait, nombre limité par les DR disponibles. */
  const traitChoices = (profile, kind, cost) => {
    const chosen = (Array.isArray(draft.magicBeastTraits) ? draft.magicBeastTraits : []).filter(name => optionalTransformationTraits(profile, kind).includes(name));
    const other = kind === 'kadon' && draft.magicKadonOther ? 1 : 0;
    const limit = Math.floor(availableOvercast(draft) / cost);
    const options = optionalTransformationTraits(profile, kind);
    if (!options.length) { push(node('p', 'workspace-muted', 'Aucun trait optionnel choisissable pour cette créature.')); return chosen; }
    push(node('p', 'workspace-muted', `Chaque trait optionnel coûte ${cost} DR de surpuissance${Number.isFinite(limit) ? ` (${limit} possible(s) avec les DR disponibles)` : ''}.`));
    for (const name of options) {
      const selected = chosen.includes(name);
      checkField('magicBeastTraits', `Trait optionnel : ${name}`, {
        checked: selected,
        // Une seule Taille à la fois (options mutuellement exclusives).
        disabled: !selected && (chosen.length + other >= limit || (traitSize(name) && chosen.some(traitSize))),
        focusKey: `magic-beast-trait-${name}`,
        onChange: value => {
          const now = Array.isArray(draft.magicBeastTraits) ? draft.magicBeastTraits : [];
          handlers.select({ magicBeastTraits: value ? [...new Set([...now, name])] : now.filter(item => item !== name) });
        }
      });
    }
    return chosen;
  };

  // Options propres au sort (V5 p. 236) : un champ par option, la dépense spéciale se déduit des paliers choisis.
  const specificOptions = contract?.overcast?.specific || [];
  if (specificOptions.length) {
    push(node('p', 'workspace-muted', 'Options propres au sort : chaque palier coûte des DR de surpuissance ; les options calculées par le moteur sont signalées, les autres sont rappelées avec leur valeur.'));
    const chosen = draft.magicOvercastSpecific || {};
    for (const option of specificOptions) {
      const text = `${option.label} (${option.cost} DR${option.repeat ? ' par palier' : ''})`;
      const label = node('label', 'workspace-type', text);
      const input = document.createElement('input');
      input.type = 'number'; input.min = '0'; input.max = option.repeat ? '9' : '1'; input.step = '1';
      input.value = chosen[option.id] ?? '';
      input.setAttribute('aria-label', text); input.dataset.focusKey = `magic-specific-${option.id}`;
      input.addEventListener('input', () => {
        const steps = input.value === '' ? 0 : Number(input.value);
        // Relu à la saisie : une option saisie juste avant (sans nouveau rendu) ne doit pas être perdue.
        const next = { ...draft.magicOvercastSpecific, [option.id]: steps || undefined };
        const total = specificOptions.reduce((sum, item) => sum + item.cost * (Number(next[item.id]) || 0), 0);
        handlers.select({magicOvercastSpecific:next,magicOvercastSpecial:total || null});
      });
      label.appendChild(input);
      push(label);
    }
  }

  if (special === 'beast-form') {
    const animals = Object.entries(BEAST_PROFILES);
    selectField('magicBeastKey', 'Animal (Bêtes du Reikland)', [['', '— Choisir un animal —'], ...animals.map(([key, profile]) => [key, `${profile.name} (Taille ${SIZE_LABELS[profile.size]}, p. ${profile.page})`])],
      draft.magicBeastKey || '', 'magic-beast-key', next => handlers.select({ magicBeastKey: next, magicBeastTraits: [] }));
    const profile = BEAST_PROFILES[draft.magicBeastKey];
    if (profile) {
      const chosen = traitChoices(profile, 'beast', BEAST_TRAIT_COST);
      push(node('p', 'workspace-muted', profileSummary(actor, profile, 'beast', chosen)));
    }
  }

  if (special === 'transformation-of-kadon') {
    const monsters = Object.entries(KADON_PROFILES);
    selectField('magicKadonMonster', 'Monstre (Taille Grande ou Énorme)', [['', '— Choisir un monstre —'], ...monsters.map(([key, profile]) => [key, `${profile.name} (Taille ${SIZE_LABELS[profile.size]}, p. ${profile.page})`]), [KADON_MANUAL, 'Autre monstre : saisie du profil']],
      draft.magicKadonMonster || '', 'magic-kadon-monster', next => handlers.select({ magicKadonMonster: next, magicBeastTraits: [] }));
    const profile = KADON_PROFILES[draft.magicKadonMonster];
    if (profile) {
      const chosen = traitChoices(profile, 'kadon', KADON_OPTION_COST);
      push(node('p', 'workspace-muted', profileSummary(actor, profile, 'kadon', chosen)));
    }
    if (draft.magicKadonMonster === KADON_MANUAL) {
      push(node('p', 'workspace-muted', 'Profil de la créature saisi par le MJ (nombres positifs ou nuls, aucun champ vide) ; Int et FM sont conservées.'));
      const nameLabel = node('label', 'workspace-type', 'Monstre : nom');
      const nameInput = document.createElement('input');
      nameInput.type = 'text'; nameInput.value = draft.magicMonsterName ?? '';
      nameInput.setAttribute('aria-label', 'Monstre : nom'); nameInput.dataset.focusKey = 'magicMonsterName';
      nameInput.addEventListener('input', () => handlers.input('magicMonsterName', nameInput.value));
      nameLabel.appendChild(nameInput);
      push(nameLabel);
      selectField('magicMonsterSize','Monstre : Taille',[['','À renseigner'],['large','Grande'],['enormous','Énorme']],draft.magicMonsterSize ?? '','magic-monster-size');
      numberField('magicMonsterM', 'Monstre : Mouvement', 0, 99);
      numberField('magicMonsterHp', 'Monstre : Blessures (B)', 1, 999);
      for (const stat of MONSTER_STATS) numberField('magicMonster' + stat, 'Monstre : ' + stat, 0, 300);
      const traitsLabel = node('label', 'workspace-type', 'Monstre : traits (séparés par des virgules)');
      const traitsInput = document.createElement('input');
      traitsInput.type = 'text'; traitsInput.value = draft.magicMonsterTraits ?? '';
      traitsInput.setAttribute('aria-label', 'Monstre : traits'); traitsInput.dataset.focusKey = 'magicMonsterTraits';
      traitsInput.addEventListener('input', () => handlers.input('magicMonsterTraits', traitsInput.value));
      traitsLabel.appendChild(traitsInput);
      push(traitsLabel);
    }
    checkField('magicKadonOther', `Option +${KADON_OPTION_COST} DR : transformer une autre créature (sort de Contact, le lanceur ne se transforme pas)`);
    if (draft.magicKadonOther) push(node('p', 'workspace-muted', 'Désigner la créature dans « Cibles multiples » ; une cible réticente résiste par un Test opposé de Force Mentale (arbitrage du MJ).'));
  }

  if (special === 'hand-of-glory') {
    selectField('magicHogTier', 'Palier Main de Gloire', [
      ['base', 'Base (0 DR) : 1 caractéristique (+3d10)'],
      ['movement', 'Base (0 DR) : Mouvement +2'],
      ['overcast6', 'Surpuissance (+6 DR) : 4 caractéristiques (+3d10) + Mouvement +2']
    ], draft.magicHogTier || 'base', 'magic-hog-tier', next => handlers.select({ magicHogTier: next, magicChosenStats: [], magicOvercastSpecial: next === 'overcast6' ? 6 : null }));
    numberField('magicRoll3d10', 'Jet 3d10 commun (Main de Gloire)', 3, 30);
    checkField('magicHogRemoveBroken', 'Option +3 DR : retirer les états Brisé des alliés');
    checkField('magicHogPurify', 'Option +8 DR : retirer Brisé et Exténué, soigner 1d10, Immunité (Psychologie)');
    if (draft.magicHogPurify) numberField('magicHealRoll', 'Soin Main de Gloire (+8 DR) : résultat du 1d10', 1, 10);
    const fieldset = node('fieldset', 'workspace-v5-choice-group workspace-magic-chosen-stats');
    fieldset.appendChild(node('legend', '', 'Caractéristiques choisies (Main de Gloire — 1 de base ou 4 à +6 DR)'));
    const current = Array.isArray(draft.magicChosenStats) ? draft.magicChosenStats : [];
    for (const stat of ['CC', 'CT', 'F', 'E', 'I', 'Ag']) {
      const label = node('label', 'workspace-type workspace-recipient-check');
      const input = document.createElement('input');
      input.type = 'checkbox'; input.checked = current.includes(stat);
      input.setAttribute('aria-label', `Caractéristique Main de Gloire : ${stat}`);
      input.dataset.focusKey = `magic-chosen-stat-${stat}`; input.dataset.action = 'toggle-magic-chosen-stat'; input.dataset.stat = stat;
      input.addEventListener('change', () => {
        const now = Array.isArray(draft.magicChosenStats) ? draft.magicChosenStats : [];
        const next = input.checked ? [...new Set([...now, stat])] : now.filter(item => item !== stat);
        handlers.select({ magicChosenStats: next, ...(next.length > 1 ? { magicHogTier: 'overcast6', magicOvercastSpecial: 6 } : {}) });
      });
      label.append(input, ` ${stat}`);
      fieldset.appendChild(label);
    }
    push(fieldset);
  }

  if (special === 'apotheose') {
    numberField('magicApoSteps', 'Option +3 DR (par palier) : paliers de Blessures soignées en plus (BFM chacun)', 0, 5);
    checkField('magicApoCritical', 'Option +6 DR : guérir une Blessure Critique (Test de Sociabilité Intermédiaire +0 DR)');
    if (draft.magicApoCritical) {
      selectField('magicApoCriticalTest', 'Résultat du Test de Sociabilité Intermédiaire (+0 DR)', [['', '— Résultat —'], ['true', 'Réussi'], ['false', 'Raté']],
        draft.magicApoCriticalTest == null ? '' : String(draft.magicApoCriticalTest), 'magic-apo-critical-test', next => handlers.select({ magicApoCriticalTest: next === '' ? null : next === 'true' }));
    }
    checkField('magicApoRaise', 'Option +10 DR : relever un mort (toutes ses Blessures, BFM minutes)');
    if (draft.magicApoRaise) {
      push(node('p', 'workspace-muted', 'Relever exige une mort constatée (0 B) et refuse qui est déjà mort au terme d’une Apothéose.'));
      for (const person of participants.filter(p => targetIds.includes(p.id))) {
        checkField('magicTargetTests', `Mort constatée : ${person.name}`, {
          checked: draft.magicTargetTests?.[person.id]?.dead === true,
          focusKey: `magic-dead-${person.id}`,
          onChange: value => handlers.select({ magicTargetTests: { ...draft.magicTargetTests, [person.id]: { ...draft.magicTargetTests?.[person.id], dead: value } } })
        });
      }
    }
  }

  return nodes;
}
