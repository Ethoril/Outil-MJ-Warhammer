import {magicTalentRank} from '../core/v5-magic-talents.js';
import {getCadaiRunes,getBurnoutStatus} from '../core/v5-magic-high.js';
import {wardDiceCount,targetNatureTags,natureTagLabel,spellAttackNature,DEDUCED_TAGS} from '../core/v5-magic-combat.js';
import {isHostileTarget,getSpellContract} from '../core/v5-spell-contracts.js';
import {listDispellablePersistentEffects} from '../core/v5-magic-dispel.js';
import {missingMagicDiceMessage} from '../core/v5-magic-miscasts.js';
import {normalizeLoreId,arcaneMagicLores} from '../core/v5-magic-attributes.js';
const loreOptions=[['','Aucun attribut'],['beasts','Bêtes'],['death','Mort'],['fire','Feu'],['heavens','Cieux'],['life','Vie'],['light','Lumière'],['metal','Métal'],['shadow','Ombres']];
export function renderMagicControls({actor,participants,type,draft,handlers,targetIds}){
 const baseRevision=handlers.magicRevision?.();
 // U-01 : clé d'opération créée au rendu, consommée une fois ; null = opération déjà appliquée, bouton inactif jusqu'à la prochaine saisie.
 const opKey=name=>handlers.magicOperationKey?.(name),opSpent=name=>Boolean(handlers.magicOperationKey)&&!opKey(name);
 const box=document.createElement('details');box.className='workspace-v5-context-details';const pv=draft.preview,missingDice=pv&&[pv.missing,pv.spellPreview?.missing,pv.castPreview?.missing].some(list=>Array.isArray(list)&&list.length>0);box.open=(draft.magicControlsOpen ?? true)||Boolean(missingDice);
 const summary=document.createElement('summary');summary.textContent=type==='dispel'?'Dissiper un sort persistant':'Talents, Haute Magie et dissipation';box.append(summary);summary.addEventListener('click',()=>handlers.input('magicControlsOpen',!box.open));
 const field=(key,label,kind='number',options=[])=>{
  const line=document.createElement('label');line.className=kind==='checkbox'?'workspace-type workspace-recipient-check':'workspace-type';line.append(document.createTextNode(label));
  const input=document.createElement(kind==='select'?'select':'input');input.setAttribute('aria-label',label);input.dataset.focusKey=key;
  if(kind==='select'){for(const [value,text] of options)input.append(new Option(text,value));input.value=draft[key] ?? options[0]?.[0] ?? '';}
  else {input.type=kind;if(kind==='checkbox')input.checked=Boolean(draft[key]);else {input.value=draft[key] ?? '';if(kind==='number'){input.min='1';input.max='100';input.step='1';}}}
  input.addEventListener(kind==='number'||kind==='text'?'input':'change',()=>{const value=kind==='checkbox'?input.checked:kind==='number'?input.value===''?null:Number(input.value):input.value;if(kind==='number'||kind==='text')handlers.input(key,value);else handlers.select({[key]:value});});if(kind==='checkbox')line.prepend(input);else line.append(input);box.append(line);return input;
 };
 // D-18 : distance et visibilité sont toujours saisies, sans valeur par défaut (visibilité à trois états).
 const distanceField=(key,label)=>{const input=field(key,label);input.min='0';input.removeAttribute('max');};
 const visibleField=(key,label)=>field(key,label,'select',[['','Non renseignée'],['true','Oui, visible'],['false','Non, invisible']]);
 if(type==='dispel'){
  // D-19 : seuls les effets de sorts à NI explicite ; les méditations de talents n'apparaissent pas.
  const owned=participants.flatMap(p=>listDispellablePersistentEffects([p]).map(e=>({e,p})));
  field('magicPersistentId','Sort persistant à dissiper','select',[['','Choisir un effet'],...owned.map(({e,p})=>[e.id,`${e.spellName || e.spellId} — ${p.name} (NI ${e.cn ?? e.ni})`])]);
  distanceField('magicPersistentDistance','Distance au sort persistant, en mètres (portée de dissipation : FM du dissipateur)');
  visibleField('magicPersistentVisible','Sort persistant ou point ciblé visible du dissipateur');
  const chosen=owned.find(({e})=>e.id===draft.magicPersistentId)?.e;
  const progress=chosen?(chosen.dispelProgressByCast?.[chosen.castExecutionId || chosen.id]?.[actor.id] || {total:Number(chosen.progressByDispeller?.[actor.id]) || 0,failed:false}):null;
  if(chosen){const note=document.createElement('p');note.className='workspace-muted';note.textContent=`NI ${chosen.cn ?? chosen.ni} · progression de ${actor.name} : ${progress.total} DR${progress.failed?' (Test étendu échoué)':''}`;box.append(note);}
  if(progress?.failed||draft.preview?.attemptFailed)field('magicPersistentRestart','Recommencer la tentative : repartir de zéro DR','checkbox');
  return box;
 }
 if(type==='channelling' && activeEye(actor))field('magicDistraction','Interruption causée par une distraction','checkbox');
 field('magicTestChoice','Choix du d100 V5','select',[['keep','Conserver le jet'],['reverse','Inverser si autorisé']]);
 field('magicAssistantId','Familier assistant','select',[['','Aucun'],...participants.filter(p=>p.id!==actor.id&&(magicTalentRank(p,'animal-assistant')||magicTalentRank(p,'magical-assistant'))).map(p=>[p.id,p.name])]);
 if(draft.magicAssistantId)field('magicAssistantLinked','Familier lié à ce lanceur, aide possible','checkbox');
 if((actor.extensions?.v5?.spellEffects || []).some(e=>e.magicTalentId==='talent-sanctuary-of-the-mind' && e.magicTalentRank>=3)){const input=field('magicYenluiPenalty','Pénalité de Yenlui (DR négatifs)');input.min='-100';input.max='0';}
 if(magicTalentRank(actor,'instinctive-diction'))field('magicInstinctiveDiction','Diction instinctive : réduire le jet mineur de 20','checkbox');
 if(magicTalentRank(actor,'aethyric-attunement')){
  field('magicMiscastRoll2','Harmonisation : second jet d’incident (1d100)');
  field('magicMiscastChoice','Harmonisation : résultat retenu','select',[['','Choisir'],['first','Premier'],['second','Second']]);
 }
 // L-07 (V5 p. 238) : les deux jets supplémentaires de l'incident 91-95, saisis par le MJ, avec leurs dés secondaires.
 const extraMissing=[pv?.missing,pv?.spellPreview?.missing,pv?.castPreview?.missing,pv?.castPreview?.miscast?.missingSecondaryDice,pv?.miscast?.missingSecondaryDice].flat().filter(key=>/^additional/.test(key));
 const firstMiscast=Number(draft.magicMiscastRoll);
 if(extraMissing.length||draft.magicExtraRoll1!=null||draft.magicExtraRoll2!=null||firstMiscast>=91&&firstMiscast<=95){
  for(const n of [1,2]){
   const roll=field('magicExtraRoll'+n,'Incident 91-95 : jet supplémentaire n° '+n+' (1d100, de 1 à 90)');roll.max='90';
   field('magicExtraDuration'+n,'Jet supplémentaire n° '+n+' : dé de durée / États (1d10 ou 2d10)');
   field('magicExtraDamage'+n,'Jet supplémentaire n° '+n+' : dé de dégâts (1d10)');
   field('magicExtraDistance'+n,'Jet supplémentaire n° '+n+' : dé de distance (1d10 ou 1d100)');
   field('magicExtraLocation'+n,'Jet supplémentaire n° '+n+' : membre gelé','select',[['','—'],['Bras principal','Bras principal'],['Bras secondaire','Bras secondaire'],['Jambe gauche','Jambe gauche'],['Jambe droite','Jambe droite']]);
  }
  if(extraMissing.length){const note=document.createElement('p');note.className='workspace-muted';note.dataset.magicExtraMissing='true';note.textContent=missingDiceText(extraMissing);box.append(note);}
 }
 if(type==='cast'){
  const selected=getSpellContract(draft.magicSpellId);
  const effects=selected?.effects || {};
  const damaging=effects.type==='magic-missile' || effects.type==='damage' || Boolean(effects.missile || effects.damage || effects.rolledDamage || effects.damageFromTotalWornAp || effects.roundEffect?.damage || effects.vortex);
  const lore=selected?.domain==='arcane'?(draft.magicChosenLore || (arcaneMagicLores(actor).length===1?arcaneMagicLores(actor)[0]:null)):selected?.domain==='elven-arcane'?(draft.magicChosenLore || normalizeLoreId([].concat(selected.wind || [])[0])):selected?.domain==='high'?draft.magicChosenLore:selected?.domain;
  const allowed=selected?.attributePolicy==='first-wind-default'?[['','Par défaut : '+selected.wind[0]],...selected.wind.map(w=>[normalizeLoreId(w),w])]:loreOptions;
  field('magicChosenLore','Domaine d’Arcane ou attribut de Haute Magie/elfique','select',allowed);
  if(selected?.domain==='high')field('magicBurnoutRoll','Jet d’épuisement si surpuissance dépasse le BFM (1d100)');
  if(magicTalentRank(actor,'war-wizard'))field('magicWarWizard','Mage de guerre : Action gratuite, perdre l’Élan (NI ≤ 5)','checkbox');
  field('magicDispellerId','Réaction de dissipation adverse','select',[['','Aucune'],...participants.filter(p=>p.id!==actor.id).map(p=>[p.id,p.name])]);
  if(draft.magicDispellerId){field('magicDispelRoll','Jet Langue (Magick) du dissipateur (1d100)');distanceField('magicDispelDistance','Distance du dissipateur au lanceur ou au point ciblé, en mètres');visibleField('magicDispelVisible','Lanceur ou point ciblé visible du dissipateur');}
  for(const p of participants.filter(p=>(targetIds?.length?targetIds:draft.magicTargetIds || []).includes(p.id))){
   // Les jets secondaires sont rendus par le contrat dans renderSpellOptions.
   {const dice=damaging?wardDiceCount(p.extensions?.v5,spellAttackNature(selected,{attributeLore:lore,declared:draft.magicTargetTests?.[p.id]?.attackNature})):0;for(let k=0;k<dice;k++){const label=document.createElement('label');label.className='workspace-type';label.textContent='Protection de '+p.name+(dice>1?` ${k+1}/${dice} (Bénédiction de Lileath)`:'')+' : résultat du d10';const input=document.createElement('input');input.type='number';input.min='1';input.max='10';const saved=draft.magicTargetTests?.[p.id]?.wardRoll;input.value=(Array.isArray(saved)?saved[k]:k===0?saved:null) ?? '';input.setAttribute('aria-label',label.textContent);input.addEventListener('input',()=>{const now=draft.magicTargetTests?.[p.id]?.wardRoll;const list=Array.isArray(now)?[...now]:dice>1?[]:[now];list.length=dice;for(let j=0;j<dice;j++)list[j]??=null;list[k]=input.value===''?null:Number(input.value);handlers.input('magicTargetTests',{...draft.magicTargetTests,[p.id]:{...draft.magicTargetTests?.[p.id],wardRoll:dice===1?list[0]:list}});});label.append(input);box.append(label);}}
   if(magicTalentRank(p,'magic-defiance')){
    const cancel=document.createElement('label');cancel.className='workspace-type workspace-recipient-check';cancel.textContent='Défiance magique de '+p.name+' : annuler le sort (1 Chance, une fois par aventure)';const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label',cancel.textContent);check.checked=(draft.magicDefianceTargets || []).includes(p.id);check.addEventListener('change',()=>handlers.select({magicDefianceTargets:check.checked?[...new Set([...(draft.magicDefianceTargets || []),p.id])]:(draft.magicDefianceTargets || []).filter(id=>id!==p.id)}));cancel.prepend(check);box.append(cancel);
    const label=document.createElement('label');label.className='workspace-type';label.textContent=`Défiance magique — choix du test de ${p.name}`;const select=document.createElement('select');select.append(new Option('Conserver','keep'),new Option('Inverser si autorisé','reverse'));select.value=draft.magicTargetTests?.[p.id]?.choice || 'keep';select.setAttribute('aria-label',label.textContent);select.addEventListener('change',()=>handlers.select({magicTargetTests:{...draft.magicTargetTests,[p.id]:{...draft.magicTargetTests?.[p.id],choice:select.value}}}));label.append(select);box.append(label);
   }
  }
 }
 if(type==='cast')for(const observer of participants.filter(p=>p.id!==actor.id && magicTalentRank(p,'magical-sense'))){
  for(const [key,label,kind] of [['distance','Distance du lanceur à '+observer.name+' (Perception de la Magie, mètres)','number'],['direction','Direction approximative pour '+observer.name,'text']]){const line=document.createElement('label');line.className='workspace-type';line.textContent=label;const input=document.createElement('input');input.type=kind;if(kind==='number'){input.min='0';input.max='100000';}input.value=draft.magicSenseFacts?.[observer.id]?.[key] ?? '';input.setAttribute('aria-label',label);input.addEventListener('input',()=>handlers.input('magicSenseFacts',{...draft.magicSenseFacts,[observer.id]:{...draft.magicSenseFacts?.[observer.id],[key]:kind==='number'?(input.value===''?null:Number(input.value)):input.value}}));line.append(input);box.append(line);}
 }
 const meditations=[['talent-eye-of-the-storm','Œil de la tempête'],['talent-sanctuary-of-the-mind','Sanctuaire de l’esprit'],['talent-mind-over-body','L’esprit sur le corps'],['talent-cadai-meditation','Méditation Cadai']].filter(([id])=>magicTalentRank(actor,id));
 const body=(actor.extensions?.v5?.spellEffects || []).find(e=>e.magicTalentId==='talent-mind-over-body'&&e.magicTalentRank>=3);
 if(body){const button=document.createElement('button');button.type='button';button.className='workspace-secondary';button.textContent='Ignorer les pénalités de Blessures Critiques (1 Chance)';button.disabled=Boolean(body.ignoreCriticalPenalties || draft.busy || opSpent('mind-over-body'));{const key=opKey('mind-over-body');button.addEventListener('click',()=>handlers.magicMindOverBody(baseRevision,key));}box.append(button);}
 if(meditations.length){
  field('magicMeditationId','Talent de méditation','select',[['','Choisir'],...meditations]);
  field('magicMeditationMinutes','Minutes de contemplation ou méditation');field('magicMeditationRoll','Test de Prière (1d100)');
  field('magicMeditationDice','Durée : résultats des d10 séparés par des espaces','text');
  const apply=document.createElement('button');apply.type='button';apply.className='workspace-secondary';apply.textContent='Résoudre la méditation';apply.disabled=Boolean(draft.busy || opSpent('meditation'));{const key=opKey('meditation');apply.addEventListener('click',()=>handlers.magicMeditation(baseRevision,key));}box.append(apply);
 }
 const suffused=participants.filter(p=>magicTalentRank(p,'suffuse-with'));
 if(type==='cast'&&suffused.length){field('magicSuffusedId','Imprégné : porteur du Vent à proximité','select',[['','Aucun'],...suffused.map(p=>[p.id,p.name])]);if(draft.magicSuffusedId)field('magicSuffusedDistance','Distance du porteur d’Imprégné en mètres');}
 if(participants.some(p=>magicTalentRank(p,'magic-defiance'))){const start=document.createElement('button');start.type='button';start.className='workspace-ghost';start.textContent='Commencer une nouvelle aventure (Défiance magique)';start.disabled=Boolean(draft.busy || opSpent('adventure'));{const key=opKey('adventure');start.addEventListener('click',()=>handlers.magicAdventure(baseRevision,key));}box.append(start);}
 if(magicTalentRank(actor,'high-magic') || getCadaiRunes(actor).deployed){
 const runes=getCadaiRunes(actor);const stock=document.createElement('p');stock.className='workspace-muted';stock.textContent=`Runes des Cadai : ${runes.deployed}/${runes.max}`;box.append(stock);
 field('magicRuneKnowledgeRoll','Déploiement : jet Savoir (Magie) (+0 DR), 1d100');
 field('magicRuneMaterials','Lire/Écrire, matériel et conditions de déploiement confirmés','checkbox');
 const deploy=document.createElement('button');deploy.type='button';deploy.className='workspace-secondary';deploy.textContent='Déployer une rune (1 Round)';deploy.disabled=Boolean(draft.busy || opSpent('rune-deploy'));{const key=opKey('rune-deploy');deploy.addEventListener('click',()=>handlers.magicRune('deploy',baseRevision,key));}box.append(deploy);
 const reset=document.createElement('button');reset.type='button';reset.className='workspace-ghost';reset.textContent='Quitter le lieu : effacer les runes';reset.disabled=Boolean(draft.busy || !runes.deployed || opSpent('rune-reset'));{const key=opKey('rune-reset');reset.addEventListener('click',()=>handlers.magicRune('reset',baseRevision,key));}box.append(reset);
 if(runes.deployed){
  field('magicUseCadaiRune','Consommer une rune pour relancer','checkbox');
  if(draft.magicUseCadaiRune){field('magicCadaiAccessible','Rune visible et à portée de bras','checkbox');
   // HEPG p. 84 : une rune par jet distinct ; un champ rempli demande la relance de ce jet, payée seulement si le jet sert.
   field('magicCadaiTestRoll','Relancer le Test par une rune : nouveau jet (1d100)');
   field('magicCadaiMiscastRoll','Relancer le jet d’incident par une rune : nouveau jet (1d100)');
   if(type==='cast')field('magicCadaiBurnoutRoll','Relancer le jet d’épuisement par une rune : nouveau jet (1d100)');
   // Test de Corruption : relance liée à une exécution réelle de Haute Magie de ce lanceur.
   const executions=handlers.getHighMagicExecutions?.(actor.id) || [];
   field('magicCorruptionExecutionId','Corruption : exécution de Haute Magie concernée','select',[['','Choisir'],...executions.map(row=>[row.id,(getSpellContract(row.spellId)?.name || row.spellId)+' ('+row.id.slice(-8)+')'])]);
   if(draft.magicCorruptionExecutionId){
    field('magicCorruptionId','Identifiant du jet de Corruption (une rune au maximum par jet)','text');
    field('magicCorruptionInitialRoll','Jet initial du Test de Corruption (1d100)');field('magicCadaiCorruptionRoll','Nouveau jet Cadai du Test de Corruption (1d100)');
    const modifier=field('magicCorruptionModifier','Modificateur du Test de Corruption (DR)');modifier.min='-100';modifier.max='100';
    const button=document.createElement('button');button.type='button';button.className='workspace-secondary';button.textContent='Résoudre la relance de Corruption';button.disabled=Boolean(draft.busy || opSpent('corruption-rune'));{const key=opKey('corruption-rune');button.addEventListener('click',()=>handlers.magicCorruptionRune(baseRevision,key));}box.append(button);
   }
  }
 }
 }
 const burnout=getBurnoutStatus(actor);
 if(burnout.active){const text=document.createElement('p');text.textContent=`Épuisement magique : ${burnout.permanent?'permanent':burnout.days+' jours'}`;box.append(text);const recover=document.createElement('button');recover.type='button';recover.className='workspace-secondary';recover.textContent=burnout.permanent?'Dépenser 1 Destin pour récupérer':'Dépenser 1 Chance pour récupérer';recover.disabled=Boolean(draft.busy || opSpent('recovery'));{const key=opKey('recovery');recover.addEventListener('click',()=>handlers.magicRecovery(baseRevision,key));}box.append(recover);}
 return box;
}

function missingDiceText(keys){return missingMagicDiceMessage(keys);}
function activeEye(actor){return (actor.extensions?.v5?.spellEffects || []).some(e=>e.magicTalentId==='talent-eye-of-the-storm');}

/**
 * Réponses que le MJ donne sur la nature d'une attaque pour les Protections de la cible (métal, projectile organique,
 * origine…) ; les faits déduits (magique, feu, chute, écrasement) restent déduits tant qu'il ne les déclare pas.
 * `getCurrent` relit les réponses au moment de l'événement : chaque réponse est conservée et la vue est redessinée.
 * `base` = nature déduite de l'attaque, pour ne demander que ce qu'une Protection active rend utile.
 */
export function natureSelects(target,getCurrent,onChange,base={}){
 const current=getCurrent()||{};
 // Évalué sur la nature déduite seule : une question déjà répondue reste affichée et modifiable.
 return targetNatureTags(target,base).map(tag=>{
  const label=document.createElement('label');label.className='workspace-type';label.textContent=`${target.name} : ${natureTagLabel(tag)} ?`;
  const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);
  const deduced=DEDUCED_TAGS.includes(tag);
  select.append(new Option(deduced?`Déduit : ${base[tag]?'oui':'non'}`:'À préciser',''),new Option('Oui','true'),new Option('Non','false'));
  select.value=typeof current[tag]==='boolean'?String(current[tag]):'';
  select.addEventListener('change',()=>{const next={...getCurrent()};if(select.value==='')delete next[tag];else next[tag]=select.value==='true';onChange(next);});
  label.append(select);return label;
 });
}

const ATTRIBUTE_LORES=new Set(['fire','death','light']);
/** S-07 : destinataires secondaires (ennemis engagés, attaquant) et choix par cible des attributs facultatifs, tous désignés par le MJ. */
export function renderSpellRecipientControls({actor,participants,contract,draft,handlers,targetIds}){
 const effects=contract?.effects||{};
 const groups=[['engaged',effects.secondaryLabel || 'Ennemis engagés ou créatures affectées (désignés par le MJ)',effects.engagedEnemyConditions?.length||effects.engagedEnemyDamage||effects.engagedEnemyTestModifiers],['attacker','Attaquant visé par la réaction (désigné par le MJ)',effects.attackerConditions?.length],['collision','Créatures heurtées par Poussée (déclarées par le MJ)',effects.collisionConditions?.length]].filter(g=>g[2]);
 const mainTargets=participants.filter(p=>(targetIds?.length?targetIds:draft.magicTargetIds||[]).includes(p.id));
 const lore=contract?.domain==='arcane'?(draft.magicChosenLore || (arcaneMagicLores(actor).length===1?arcaneMagicLores(actor)[0]:null)):contract?.domain==='elven-arcane'?(draft.magicChosenLore || normalizeLoreId([].concat(contract.wind || [])[0])):contract?.domain==='high'?draft.magicChosenLore:contract?.domain;
 const attributeTargets=ATTRIBUTE_LORES.has(lore)?mainTargets.filter(p=>p.id!==actor.id):[];
 const base=spellAttackNature(contract,{attributeLore:lore});
 const setTargetTest=(id,patch)=>handlers.select({magicTargetTests:{...draft.magicTargetTests,[id]:{...draft.magicTargetTests?.[id],...patch}}});
 const natureFields=mainTargets.flatMap(p=>natureSelects(p,()=>draft.magicTargetTests?.[p.id]?.attackNature,next=>setTargetTest(p.id,{attackNature:next}),base));
 for(const p of mainTargets.filter(p=>p.extensions?.v5?.specialStates?.mindMask)){
   const label=document.createElement('label');label.className='workspace-type';label.textContent='Lecture d’esprit ou divination contre '+p.name;
   const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);for(const [v,t] of [['','Contexte à préciser'],['true','Oui (−3 DR)'],['false','Non']])select.append(new Option(t,v));select.value=draft.magicTargetTests?.[p.id]?.readingMagic==null?'':String(draft.magicTargetTests[p.id].readingMagic);select.addEventListener('change',()=>setTargetTest(p.id,{readingMagic:select.value===''?undefined:select.value==='true'}));label.append(select);natureFields.push(label);
 }
 const deathTargets=effects.special==='verdant-apotheosis'?mainTargets:[];
 if(!groups.length&&!attributeTargets.length&&!natureFields.length&&!deathTargets.length&&!effects.chainAttack&&!effects.breath&&!effects.rolledDamage)return null;
 const box=document.createElement('details');box.className='workspace-v5-context-details';box.open=true;
 const summary=document.createElement('summary');summary.textContent='Destinataires et choix par cible';box.append(summary);
 const note=text=>{const p=document.createElement('p');p.className='workspace-muted';p.textContent=text;box.append(p);};
 const perTargetNumber=(p,key,title,min=0,max=999)=>{
  const label=document.createElement('label');label.className='workspace-type';label.textContent=title+' — '+p.name;
  const input=document.createElement('input');input.type='number';input.min=String(min);input.max=String(max);input.step=key==='distance'||key==='fromPrimary'?'any':'1';input.value=draft.magicTargetTests?.[p.id]?.[key] ?? '';input.setAttribute('aria-label',label.textContent);input.dataset.focusKey='magic-target-'+key+'-'+p.id;
  input.addEventListener('input',()=>handlers.input('magicTargetTests',{...draft.magicTargetTests,[p.id]:{...draft.magicTargetTests?.[p.id],[key]:input.value===''?undefined:Number(input.value)}}));label.append(input);box.append(label);
 };
 const ordered=(targetIds || draft.magicTargetIds || []).map(id=>participants.find(p=>p.id===id)).filter(Boolean);
 if(effects.chainAttack)for(const p of ordered.slice(1)){
  perTargetNumber(p,'distance','Rebond : distance depuis la cible précédente (m)');
  const label=document.createElement('label');label.className='workspace-type';label.textContent='Rebond : cible la plus proche confirmée — '+p.name;
  const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.dataset.focusKey='magic-nearest-'+p.id;select.append(new Option('À renseigner',''),new Option('Oui','true'),new Option('Non','false'));select.value=draft.magicTargetTests?.[p.id]?.nearest===undefined?'':String(draft.magicTargetTests[p.id].nearest);
  select.addEventListener('change',()=>setTargetTest(p.id,{nearest:select.value===''?undefined:select.value==='true'}));label.append(select);box.append(label);
 }
 if(effects.breath){
  const label=document.createElement('label');label.className='workspace-type';label.textContent='Souffle : Test de CT du lanceur (d100)';const input=document.createElement('input');input.type='number';input.min='1';input.max='100';input.value=draft.magicCtRoll ?? '';input.setAttribute('aria-label',label.textContent);input.dataset.focusKey='magic-ct-roll';input.addEventListener('input',()=>handlers.input('magicCtRoll',input.value===''?undefined:Number(input.value)));label.append(input);box.append(label);
  for(const [index,p] of ordered.entries()){
   perTargetNumber(p,index===0?'distance':'fromPrimary',index===0?'Souffle : distance au lanceur (m)':'Souffle : distance à la cible principale (m)');
   const label=document.createElement('label');label.className='workspace-type';label.textContent='Souffle : opposition — '+p.name;const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.dataset.focusKey='breath-oppose-'+p.id;select.append(new Option('Esquive (d100 requis)','true'),new Option('Opposition refusée','false'));select.value=draft.magicTargetTests?.[p.id]?.opposeBreath===false?'false':'true';select.addEventListener('change',()=>setTargetTest(p.id,{opposeBreath:select.value==='true'}));label.append(select);box.append(label);
   if(draft.magicTargetTests?.[p.id]?.opposeBreath!==false)perTargetNumber(p,'dodgeRoll','Souffle : Esquive (d100)',1,100);
  }
 }
 if(effects.rolledDamage)for(const p of mainTargets)perTargetNumber(p,'damageRoll','Dégâts du sort : d'+effects.rolledDamage.sides,1,effects.rolledDamage.sides);
 for(const [group,title] of groups){
  const chosen=draft.magicSecondaryTargets?.[group]||[];
  const legend=document.createElement('p');legend.className='workspace-type';legend.textContent=title;box.append(legend);
  for(const p of participants.filter(p=>(p.id!==actor.id || effects.allowCasterSecondary || group==='collision') && (group!=='collision' || !mainTargets.some(t=>t.id===p.id)))){
   const line=document.createElement('label');line.className='workspace-type workspace-recipient-check';const check=document.createElement('input');check.type='checkbox';check.checked=chosen.includes(p.id);check.setAttribute('aria-label',title+' : '+p.name);
   // La liste est relue au moment du clic : chaque désignation s'ajoute aux précédentes, puis la vue est redessinée.
   check.addEventListener('change',()=>{const now=draft.magicSecondaryTargets?.[group]||[];handlers.select({magicSecondaryTargets:{...draft.magicSecondaryTargets,[group]:check.checked?[...new Set([...now,p.id])]:now.filter(id=>id!==p.id)}});});
   line.append(check,p.name);box.append(line);
  }
  if(!chosen.length)note('Aucun destinataire désigné : rien n’est appliqué à cette catégorie.');
  for(const id of chosen){
   const p=participants.find(x=>x.id===id);if(!p)continue;
   if(group==='collision'){perTargetNumber(p,'targetSize','Collision : Taille de la créature heurtée',1,7);perTargetNumber(p,'pushedSize','Collision : Taille de la créature repoussée',1,7);}
   if(group==='engaged'&&effects.engagedEnemyTest){
    const line=document.createElement('label');line.className='workspace-type';line.textContent=`Jet de ${effects.engagedEnemyTest.skill} de ${p.name} (1d100)`;
    const input=document.createElement('input');input.type='number';input.min='1';input.max='100';input.value=draft.magicTargetTests?.[id]?.roll??'';input.setAttribute('aria-label',line.textContent);input.dataset.focusKey='magic-secondary-test-'+id;
    input.addEventListener('input',()=>handlers.input('magicTargetTests',{...draft.magicTargetTests,[id]:{...draft.magicTargetTests?.[id],roll:input.value===''?null:Number(input.value)}}));line.append(input);box.append(line);
   }
   const damage=group==='engaged'?effects.engagedEnemyDamage:null;
   if(damage?.recurring)note(`${p.name} sera frappé à chacun de ses Tours : les localisations des ${damage.hits||1} coups sont demandées à la fin du Tour précédent.`);
   else if(damage&&(damage.dice||(!damage.ignoreAp&&!damage.directWounds))){
    const line=document.createElement('label');line.className='workspace-type';line.textContent=damage.dice?`Dégâts de ${p.name} : résultat du ${damage.dice}`:`Localisations de ${p.name} : ${damage.hits||1} résultat(s) 1d100, séparés par des espaces`;
    const input=document.createElement('input');input.type='text';input.value=(draft.magicSecondaryRolls?.[id]||[]).join(' ');input.setAttribute('aria-label',line.textContent);input.dataset.focusKey='magic-secondary-rolls-'+id;
    input.addEventListener('input',()=>handlers.input('magicSecondaryRolls',{...draft.magicSecondaryRolls,[id]:input.value.split(/[\s,;]+/).filter(Boolean).map(Number)}));line.append(input);box.append(line);
   }
  }
 }
 if(attributeTargets.length){
  note('Attribut de Vent facultatif : appliqué aux ennemis par défaut, jamais aux alliés sauf case cochée.');
  for(const p of attributeTargets){
   const line=document.createElement('label');line.className='workspace-type workspace-recipient-check';const check=document.createElement('input');check.type='checkbox';
   const explicit=draft.magicAttributeTargets?.[p.id];check.checked=typeof explicit==='boolean'?explicit:isHostileTarget(actor,p);check.setAttribute('aria-label','Appliquer l’attribut de Vent à '+p.name);
   check.addEventListener('change',()=>handlers.input('magicAttributeTargets',{...draft.magicAttributeTargets,[p.id]:check.checked}));
   line.append(check,'Appliquer l’attribut de Vent à '+p.name+(isHostileTarget(actor,p)?' (ennemi : appliqué par défaut)':' (non ennemi : non appliqué par défaut)'));box.append(line);
  }
 }
 for(const p of deathTargets){
  const line=document.createElement('label');line.className='workspace-type';line.textContent=`Délai depuis la mort de ${p.name} (secondes, moins d’une minute)`;
  const input=document.createElement('input');input.type='number';input.min='0';input.max='59';input.step='1';input.value=draft.magicTargetTests?.[p.id]?.deathDelaySec??'';input.setAttribute('aria-label',line.textContent);input.dataset.focusKey='magic-death-delay-'+p.id;
  input.addEventListener('input',()=>handlers.input('magicTargetTests',{...draft.magicTargetTests,[p.id]:{...draft.magicTargetTests?.[p.id],deathDelaySec:input.value===''?null:Number(input.value)}}));line.append(input);box.append(line);
 }
 for(const field of natureFields)box.append(field);
 return box;
}
