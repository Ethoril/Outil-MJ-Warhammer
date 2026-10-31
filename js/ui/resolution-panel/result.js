import { node, button, rubric, outcomePill, signed, minusSigned } from './dom.js';
import { renderV5Decisions, renderCritical, criticalEffectLine } from './critical.js';
import { renderV5MagicResult } from './magic.js';
import { formatDamageFormula, previewHpLoss } from '../../core/resolution.js';
import { getReferenceCatalogue } from '../../core/reference-catalog.js';
import { V5_TALENT_TEST_CONTEXT_FIELDS, V5_TEST_TALENT_IDS } from '../../core/v5-talent-tests.js';
import { hasV5Talent, V5_TALENT_IDS } from '../../core/v5-talents.js';
import { EXCLUDED_BASE_CHARACTERISTIC_TALENTS } from '../../core/talent-contracts.js';
import { acquiredV5TalentCoverage, V5_TALENT_TREATMENT_LABELS } from '../../core/v5-talent-coverage.js';
import { readDivineRejections } from '../../core/v5-divine-access.js';

export const ROLL_LABELS = Object.freeze({ attack: 'Attaque', test: 'Test', skill: 'Compétence', defense: 'Défense', opposition: 'Opposition', channelling: 'Focalisation', cast: 'Incantation', dispel: 'Dissipation' });

export function renderResult(preview, target, draft, handlers, participants=[]) {
  if (preview?.v5MagicKind) return renderV5MagicResult(preview, target, draft, handlers);
  const result = node('div', 'workspace-result');
  const queued=(preview.input?.actor?.extensions?.v5?.combatEffects||[]).filter(row=>!['weapon-explosion','salvo-artillery-hit','salvo-artillery-destroyed','fumble-ally-hit','misfire'].includes(row.kind));
  if(queued.length)result.appendChild(node('p','workspace-field-error','Effets de maladresse encore en attente : '+queued.map(row=>row.kind).join(', ')+'. Vérifiez leur durée et résolution selon la table.'));
  if (preview.choiceRequired) result.appendChild(node('p', 'workspace-muted', 'Aperçu provisoire : les joueurs doivent confirmer leurs choix.'));
  result.appendChild(renderV5Decisions(preview, draft, handlers));
  for(const choice of Object.entries(preview.talentSLChoices || {}).flatMap(([role,choices])=>choices.map(row=>({...row,role})))){
    const role=choice.role || 'actor', draftKey=role==='defender'?'defenseTalentChoices':'talentChoices';
    const label=node('label','workspace-type',choice.label+' · '+(role==='defender'?'défense':'Test')+' · '+(choice.optionId==='keep'?'jet conservé':'jet inversé'));
    const select=document.createElement('select');
    select.setAttribute('aria-label',choice.label+' : DR ou unités ('+(role==='defender'?'défenseur':'acteur')+', '+(choice.optionId==='keep'?'jet conservé':'jet inversé')+')');
    select.dataset.focusKey='talent-sl-'+role+'-'+choice.key;
    select.append(new Option('Choisir après réussite',''),new Option('Conserver '+choice.sl+' DR','false'),new Option('Retenir '+choice.units+' (unités)','true'));
    const value=draft[draftKey]?.[choice.key];
    select.value=typeof value==='boolean'?String(value):'';
    select.addEventListener('change',()=>{
      handlers.select({[draftKey]:{...(draft[draftKey]||{}),[choice.key]:select.value===''?undefined:select.value==='true'}});
      handlers.calculate();
    });
    label.append(select);
    result.append(label);
  }
  const pills = node('div', 'workspace-result-pills');
  pills.appendChild(outcomePill(ROLL_LABELS[preview.actionType] || 'Jet', preview.success, preview.sl));
  if (preview.opposition?.mode === 'opposed') pills.appendChild(outcomePill('Défense', preview.opposition.defender.success, preview.opposition.defender.sl));
  if (preview.fumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse de l’attaquant'));
  if (preview.defenderFumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse du défenseur'));
  result.appendChild(pills);
  if(preview.combatFailure?.fumble?.outcome)result.appendChild(node('p','workspace-result-line',`Maladresse ${preview.combatFailure.fumble.roll} : ${preview.combatFailure.fumble.outcome.label}`));
  if(preview.combatFailure?.misfire?.outcome)result.appendChild(node('p','workspace-result-line',`Incident de poudre ${preview.combatFailure.misfire.roll} : ${preview.combatFailure.misfire.outcome.label}`));
  if(preview.combatFailure?.misfire?.salvo?.outcome)result.appendChild(node('p','workspace-result-line',`Incident de Salve ${preview.combatFailure.misfire.salvo.roll} : ${preview.combatFailure.misfire.salvo.outcome.label}`));
  if(preview.netEscape?.opposition){
    const o=preview.netEscape.opposition;
    result.appendChild(node('p','workspace-result-line',`Sortie de filet : Force ${o.actorSl} DR contre la source ${o.sourceSl} DR (jet ${o.sourceRoll}, Force ${o.sourceScore}${o.springLoaded?' +2 DR du Mancatcher à ressort':''}) · DR nets ${o.netSl} · ${preview.netEscape.freed?'opposition gagnée':'opposition perdue'}.`));
  }
  for(const line of preview.combatFailure?.reminders||[])result.appendChild(node('p','workspace-result-line',line));
  if(preview.grapple){
    const effect=preview.grapple.effects?.[0];
    let text;
    if(preview.grapple.status==='grappled')text='Empoignade engagée : Enchevêtré, sans dégâts d’attaque.';else if(preview.grapple.status==='opposition-lost')text='Empoignade : opposition perdue, aucun lien créé.';else if(preview.grapple.unresolved?.length)text=preview.grapple.unresolved.join(' ');else if(effect?.type==='damage')text=`Empoignade : ${effect.amount} Blessures sans PA à la localisation ${effect.location?.name||'déterminée par le jet'}.`;else if(effect?.type==='acquire-condition')text=`Empoignade : Enchevêtré augmente de ${effect.condition.level}.`;else if(effect?.type==='recover-condition')text=`Empoignade : retrait de ${effect.amount} niveau(s) d’Enchevêtré.`;else text=`Empoignade : ${preview.grapple.action||'action'}${preview.grapple.won?' réussie':' échouée'}.`;
    result.appendChild(node('p',preview.grapple.ready?'workspace-result-line':'workspace-field-error',text));
  }
  if(preview.engagedShot){
    const chosen=participants.find(row=>row.id===preview.engagedShot.selectedTargetId)?.name||target?.name||'combattant choisi';
    result.appendChild(node('p','workspace-result-line',`Tir contre des combattants engagés : déviation vers ${chosen} (d100 ${preview.engagedShot.roll}). La résolution ci-dessous porte sur cette cible.`));
  }
  if(preview.scatter){
    const scatter=preview.scatter,direction=Number(scatter.directionRoll)===9?'aux pieds du tireur':Number(scatter.directionRoll)===10?'aux pieds de la cible':scatter.direction||'direction non déterminée';
    result.appendChild(node('p','workspace-result-line',`Arme de jet déviée : d10 ${scatter.directionRoll} · ${direction} · 2d10 ${scatter.distanceRolls?.join(' et ')} m = ${scatter.rolledDistanceYards} m, plafond ${scatter.maximumYards} m, résultat ${scatter.distanceYards} m. Le pion reste en place.`));
  }
  if(preview.trip){
    const winner=preview.trip.winner==='attacker'?preview.input?.actor?.name||'l’attaquant':preview.input?.target?.name||target?.name||'le défenseur';
    result.appendChild(node('p','workspace-result-line',`Opposition de Croche-pied : victoire de ${winner}. Coût prévu : 1 Élan.${preview.trip.conditionApplied?` ${target?.name||'La cible'} reçoit À Terre.`:'Aucune chute ni état À Terre.'}`));
  }
  if(preview.tripFall){
    const fall=preview.tripFall,tests=fall.enduranceTest?`Test d’Endurance ${fall.enduranceTest.success?'réussi':'raté'} · ${fall.enduranceTest.sl} DR`:'aucun Test d’Endurance requis';
    result.appendChild(node('p','workspace-result-line',`Chute verticale de ${fall.yards} m : ${fall.rawDamage} Blessure(s) avant protection, ${fall.damageLoss} perdue(s) après protection, BE ${fall.toughnessBonus}; Armure non déduite. ${tests}${fall.criticals?.length?` · ${fall.criticals.length} critique(s) à appliquer`:''}.`));
  }
  if(preview.lethalDeath){
    const who=participants.find(row=>row.id===preview.lethalDeath.targetId)?.name||target?.name||'la cible';
    result.appendChild(node('p','workspace-critical-death',`Option létale confirmée par le MJ : ${who} sera déclaré mort et à 0 Blessure si ce résultat est appliqué.`));
  }
  if(preview.prayerSLAdjustment)result.appendChild(node('p','workspace-result-line',`Courroux « Pensez à vos actes » · ${preview.prayerSLAdjustment.rawSL} DR bruts → ${preview.prayerSLAdjustment.effectiveSL} DR appliqués · plafond de +0 pendant huit jours impériaux.`));
  if(preview.weaponSkillReceipt){
    const receipt=preview.weaponSkillReceipt,source=preview.input.action.extensions?.equipment||preview.input.actor?.equipment?.find(row=>row?.id===preview.input.action.extensions?.fiche?.equipmentId),names={
      'untrained-melee-cc-without-benefits':'Capacité de Combat sans Qualités bénéfiques', 'ballistic-skill-minus-1-dr':'Capacité de Tir, −1 DR',
      'powder-skill-engineering-minus-2-dr':'Poudre noire sur Ingénierie, −2 DR', 'blowpipe-ct-dangerous':'Capacité de Tir, Dangereuse',
      'two-handed-cavalry-on-foot':'arme de cavalerie à pied, Deux mains', 'single-handed-cavalry-improvised':'arme de cavalerie à une main, à pied',
      'cavalry-hammer-on-foot':'marteau de cavalerie à pied, Deux mains', 'improvised-weapon-profile':'profil du catalogue Arme improvisée appliqué',
      'fencing-with-basic':'Escrime employée avec Base, sans Qualités', 'bastard-sword-one-handed':'épée bâtarde à une main',
      'main-gauche-as-dagger':'Main gauche traitée comme une dague', 'sabre-basic-slash-2':'Sabre avec Base, Entaille 2'
    };
    const effects=(receipt.applied||[]).map(code=>names[code]).filter(Boolean),skill=(preview.input.actor?.skills||[]).find(row=>row.id===receipt.skillId),fencingWithBasic=(receipt.applied||[]).includes('fencing-with-basic');
    const trainingLabel=receipt.trained===true?(fencingWithBasic?'compétence de base utilisée':`spécialité entraînée${skill?.name?` (${skill.name})`:''}`):receipt.trained===false?'sans maîtrise du groupe':'données MJ requises';
    result.appendChild(node('p',receipt.missing?'workspace-field-error':'workspace-result-line',`${source?.name||'Arme'} · groupe ${receipt.group||'à confirmer'} · ${trainingLabel}${effects.length?` · ${effects.join(' · ')}`:''}`));
  }
  for(const state of preview.actorConditionApplication||[])if(state.source?.keywordId==='a-poudre-noire')result.append(node('p','workspace-result-line','À Poudre noire : '+state.level+' état(s) Brisé sur '+preview.input.actor.name));
  if(preview.test?.automatic)result.appendChild(node('p','workspace-result-line',preview.test.noTest?'Choix de talent sans Test.':'Réussite automatique, sans jet.'));
  if(preview.defenderDamage)result.appendChild(node('p','workspace-result-line','Riposte : '+preview.defenderDamage.finalDamage+' Blessures sur '+(preview.input.actor?.name||'l’attaquant')));
  const effectiveTarget = participants.find(row => row.id === preview.targetId) || target;
  if (preview.attack) result.appendChild(node('p', 'workspace-result-line', `${preview.hit ? 'Touché' : 'Pas de touche'}${preview.location ? ` · ${preview.location.name}` : ''}`));
  for (const plan of preview.profileAbilityPlans || []) {
    if (!plan.effects?.length) continue;
    const effects = plan.effects.map(effect => effect.state ? `État ${effect.state}`
      : effect.addQualities ? `Qualités ${effect.addQualities.join(', ')}`
      : effect.damage ? `${effect.damage} dégâts` : effect.transformation ? `transformation : ${effect.transformation}`
      : effect.immuneToState ? `immunité : ${effect.immuneToState}` : effect.castingCharacteristic ? `incantation avec ${effect.castingCharacteristic}`
      : effect.mayBeScared === true ? 'ce feu peut l’effrayer (décision du MJ)' : effect.mayBeScared === false ? 'ce feu est trop petit pour l’effrayer'
      : effect.modifier ? `+${effect.modifier / 10} DR au Test (V4 +${effect.modifier})` : effect.addTrait ? `Trait ${effect.addTrait}${effect.ignoresSize ? ' sans restriction de Taille' : ''}` : effect.chooseCriticalTable ? `table ${effect.chooseCriticalTable}`
      : effect.momentum ? `+${effect.momentum} Élan proposé` : effect.attack ? `${effect.attack} : ${effect.addTrait || ''}` : '').filter(Boolean);
    if (effects.length) result.appendChild(node('p', 'workspace-result-line', `${plan.label} (${plan.receipt?.source || 'règle de profil'}) : ${effects.join(' · ')}.`));
  }
  if (preview.deathblow?.triggered) result.appendChild(node('p', 'workspace-result-line', `Frappe mortelle : attaque immédiate contre un autre adversaire au contact (au plus ${preview.deathblow.maxChain} ce Tour), jamais deux fois la même créature.`));
  if (effectiveTarget && preview.damage) result.appendChild(node('p', 'workspace-result-line', `${effectiveTarget.name} : ${previewHpLoss(preview)} Blessures proposées · PV ${effectiveTarget.hp} → ${Math.max(0, Number(effectiveTarget.hp) - previewHpLoss(preview))}`));
  if (preview.actionCosts?.paid?.length) result.appendChild(node('p', 'workspace-result-line',
    'Coût proposé avant le jet : ' + preview.actionCosts.paid.map(cost => cost.resource === 'momentum' ? '1 Élan' : cost.amount + ' ' + cost.resource).join(', ')));
  if (preview.damageReplacedByTalent) result.appendChild(node('p', 'workspace-result-line', preview.damageReplacedByTalent.name||'Battement : 0 Blessure ; toutes les conséquences du critique remplacé sont supprimées. Esquive reste possible.'));
  if(preview.defenderDamageReplacedByTalent)result.append(node('p','workspace-result-line',preview.defenderDamageReplacedByTalent.name));
  for(const plan of preview.postActionCosts||[])result.append(node('p','workspace-result-line','Coût après le résultat : '+plan.paid.map(c=>c.amount+' Élan').join(', ')));
  const reductions = (preview.talentPlans || []).flatMap(plan => plan.proposals || []).filter(proposal => proposal.op === 'reduceConditionAcquisition');
  if (reductions.length) result.appendChild(node('p', 'workspace-result-line', 'Mâchoires d’acier : un Sonné évité, premier usage de cette rencontre.'));
  for (const change of preview.momentum || []) {
    const name = change.participantId === preview.input.actor?.id ? preview.input.actor.name : target?.name;
    result.appendChild(node('p', 'workspace-result-line', `${name || 'Combattant'} : Élan ${change.before ? 'oui' : 'non'} → ${change.after ? 'oui' : 'non'}`));
  }
  for(const reminder of preview.reminders || [])result.appendChild(node('p','workspace-muted',reminder));
  for(const occurrence of preview.weaponConditions?.applied || [])result.appendChild(node('p','workspace-result-line','Assommante : '+occurrence.level+' état Sonné proposé.'));
  if((preview.targetConditionApplication||[]).some(row=>row.source?.kind==='knockout'))result.appendChild(node('p','workspace-result-line','Assommer : le total de Sonné dépasse le BE; Inconscient proposé.'));
  const renderedMountedRideInputs = new Set();
  for (const fall of preview.mountedFall || []) {
    const rider = participants.find(row => row.id === fall.participantId);
    if (fall.requiredTest) {
      result.appendChild(node('p','workspace-result-line',`${rider?.name||fall.participantId} : Test de Chevaucher ${fall.requiredTest.modifier >= 0 ? '+' : ''}${fall.requiredTest.modifier} DR requis (${fall.requiredTest.purpose}).`));
      if (fall.opposedStrengthSize === 'mount' && fall.test?.success) {
        const holder = fall.participantId === preview.input.actor?.id ? preview.input.target : preview.input.actor;
        result.appendChild(node('p','workspace-muted',`Résolvez ensuite l’opposition de Force : ${rider?.name||'le cavalier'} compte à la Taille de sa monture.`));
        const current = draft.v5Context || {}, scores = current.mountedForceScores || {}, rolls = current.mountedForceRolls || {};
        for (const [side,person] of [['holder',holder],['rider',rider]]) {
          if (!Number.isSafeInteger(Number(person?.caracs?.F)) || person?.caracs?.F === '' || person?.caracs?.F == null) {
            const scoreLabel=node('label','workspace-type',`Force de ${person?.name||side} (score MJ)`),scoreInput=document.createElement('input');
            scoreInput.type='number';
            scoreInput.min='0';
            scoreInput.max='100';
            scoreInput.step='1';
            scoreInput.value=scores[side]??'';
            scoreInput.setAttribute('aria-label',scoreLabel.textContent);
            scoreInput.addEventListener('change',()=>handlers.select({v5Context:{...current,mountedForceScores:{...scores,[side]:scoreInput.value===''?undefined:Number(scoreInput.value)}}}));
            scoreLabel.append(scoreInput);
            result.append(scoreLabel);
          }
          const rollLabel=node('label','workspace-type',`Test de Force de ${person?.name||side} · d100`),rollInput=document.createElement('input');
          rollInput.type='number';
          rollInput.min='1';
          rollInput.max='100';
          rollInput.step='1';
          rollInput.value=rolls[side]??'';
          rollInput.setAttribute('aria-label',rollLabel.textContent);
          rollInput.addEventListener('change',()=>handlers.select({v5Context:{...current,mountedForceRolls:{...rolls,[side]:rollInput.value===''?undefined:Number(rollInput.value)}}}));
          rollLabel.append(rollInput);
          result.append(rollLabel);
        }
        if (fall.strengthOpposition) result.appendChild(node('p','workspace-result-line',`Opposition de Force : gagnant ${fall.strengthOpposition.winner} · DR ${fall.strengthOpposition.netSl} · Taille du cavalier ${fall.strengthOpposition.riderSize}.`));
      }
      const current = draft.v5Context || {};
      const rideInputKey = `${fall.participantId}:${fall.event}`;
      if (!renderedMountedRideInputs.has(rideInputKey)) {
        renderedMountedRideInputs.add(rideInputKey);
        const rideTests = current.mountedRideTestsById || {}, riderTests = rideTests[fall.participantId] || {}, rideTestCount = preview.mountedFall.filter(row=>row.participantId===fall.participantId&&row.requiredTest).length, riderTest = riderTests[fall.event] || (rideTestCount===1?riderTests:{});
        for (const [field,label,min,max] of [['score','score de Chevaucher',0,100],['roll','d100',1,100]]) {
        const skill = rider?.skills?.find(row => row.id === 'skill-43_68_65_76_61_75_63_68_65_72-base' && row.status !== 'unresolved');
        if (field === 'score' && Number.isSafeInteger(skill?.total)) continue;
        const eventLabel = fall.event === 'rider-surprised' ? 'Surpris' : fall.event === 'rider-stunned' ? 'Sonné' : fall.event;
        const wrap = node('label','workspace-type',`${rider?.name||fall.participantId} · ${label} (${eventLabel})`), input = document.createElement('input');
        input.type='number';
        input.min=String(min);
        input.max=String(max);
        input.step='1';
        input.value=riderTest[field] ?? '';
        input.setAttribute('aria-label',wrap.textContent);
        input.addEventListener('change',()=>handlers.select({v5Context:{...current,mountedRideTestsById:{...rideTests,[fall.participantId]:rideTestCount===1?{...riderTest,[field]:input.value===''?undefined:Number(input.value)}:{...riderTests,[fall.event]:{...riderTest,[field]:input.value===''?undefined:Number(input.value)}}}}}));
        wrap.append(input);
        result.append(wrap);
        }
      }
    } else if (fall.dismount === true) result.appendChild(node('p','workspace-result-line',`${rider?.name||fall.participantId} : chute et démontage proposés.`));
    if (['rider-dead','rider-unconscious','rider-prone'].includes(fall.event)) {
      const current = draft.v5Context || {}, label = node('label','workspace-type','Équipement confirmé empêchant la chute du cavalier');
      const input = document.createElement('input');
      input.type='checkbox';
      input.checked=current.fallPreventedByEquipment===true;
      input.setAttribute('aria-label',label.textContent);
      input.addEventListener('change',()=>handlers.select({v5Context:{...current,fallPreventedByEquipment:input.checked}}));
      label.prepend(input);
      result.append(label);
    }
  }
  if (target?.extensions?.v5?.mounted === true) {
    const current = draft.v5Context || {}, label = node('label','workspace-type','Maintien en selle après une prise (choix du MJ)'), select = document.createElement('select');
    select.setAttribute('aria-label',label.textContent);
    select.append(new Option('Aucun maintien déclaré',''),new Option('Retenu','held'),new Option('Ancré','anchored'));
    select.value=current.mountedRestraint || '';
    select.addEventListener('change',()=>handlers.select({v5Context:{...current,mountedRestraint:select.value||undefined}}));
    label.append(select);
    result.append(label);
  }
  for (const warning of preview.unresolved || []) {
    const match = /^Talent(?: (talent-[a-z0-9-]+))? : préciser (.+)\.$/.exec(warning);
    const talentName = match?.[1] ? getReferenceCatalogue().talents.find(row=>row.id===match[1])?.nom || 'Talent' : 'Talent';
    const field = match?.[2];
    const contextLabel = V5_TALENT_TEST_CONTEXT_FIELDS.find(row=>row.field===field)?.label || ({skillId:'Compétence du Test',skillGroupId:'Compétence du Test',specialization:'Spécialité du Test',specializationId:'Spécialité du Test',weaponImprovised:'Arme improvisée','weapon.improvised':'Arme improvisée',silentTakedown:'Neutralisation silencieuse',outsideCombat:'Procédure hors combat',targetUnaware:'Cible ignorant le danger'})[field];
    const text = match && (contextLabel || field.startsWith('choices.')) ? talentName+' : '+(contextLabel ? contextLabel+' — à préciser.' : 'choisir DR ou unités pour ce jet réussi.') : warning;
    result.appendChild(node('p', 'workspace-field-error', text));
  }
  if (preview.choiceRequired) result.appendChild(node('p', 'workspace-muted', 'Choisissez chaque inversion facultative avant de confirmer.'));
  if (preview.weapon?.status === 'manual') result.appendChild(node('p', 'workspace-field-error', `Dégâts à arbitrer : ${preview.weapon.text}.`));
  if (preview.protection?.manual?.length) result.appendChild(node('p', 'workspace-field-error', 'Protection à préciser : renseignez les PA après arbitrage.'));
  else if (preview.protection && preview.protection.ap === null) result.appendChild(node('p', 'workspace-field-error', 'Protection à préciser : renseignez les PA après arbitrage.'));
  if (preview.mechanicalWarnings?.length) result.appendChild(node('p', 'workspace-field-error', `Effets non validés V5 : ${preview.mechanicalWarnings.map(item => item.keywordId).join(', ')}.`));
  if (preview.critical?.details || preview.critical?.second) result.appendChild(renderCritical(preview, draft, handlers));
  for(const row of preview.secondaryTargets||[]){
    result.append(node('p','workspace-result-line',row.name+' : '+(row.damage.finalDamage+(row.critical?.application.extraWounds||0))+' Blessures proposées ; '+row.location.name));
    if(row.critical?.second){
      const injure=hasV5Talent(preview.input.actor,'talent-strike-to-injure'),inoffensive=row.damage.isInoffensive;
      const fields=[['secondEffect','Gravité du critique : '+row.name],...(inoffensive?[['secondEffectAlternative','Seconde gravité Inoffensive : '+row.name]]:[]),...(injure?[['injureSecondEffect','Autre gravité Frappe blessante : '+row.name],...(inoffensive?[['injureSecondEffectAlternative','Autre seconde gravité Inoffensive : '+row.name]]:[])]:[])];
      for(const[key,text]of fields){
        const label=node('label','workspace-type',text),input=document.createElement('input');
        input.type='number';
        input.min='1';
        input.max='100';
        input.value=draft.v5Context?.whirlwindRolls?.[row.participantId]?.[key]??'';
        input.setAttribute('aria-label',text);
        const update=()=>{
          const value=Number(input.value);
          if(Number.isInteger(value)&&value>=1&&value<=100)handlers.situationalCritical(row.participantId,key,value);
        };
        input.addEventListener('change',update);
        input.addEventListener('keydown',e=>{if(e.key==='Enter'){
          e.preventDefault();
          update();
        }});
        label.append(input);
        result.append(label);
      }
      if(injure){
        const text='Frappe blessante : gravité à retenir pour '+row.name,label=node('label','workspace-type',text),select=document.createElement('select');
        select.setAttribute('aria-label',text);
        select.append(new Option('Choisir',''),new Option('Première gravité','false'),new Option('Autre gravité','true'));
        const value=draft.v5Context?.whirlwindChoices?.[row.participantId]?.['injure:second'];
        select.value=typeof value==='boolean'?String(value):'';
        select.addEventListener('change',()=>{if(select.value)handlers.situationalCriticalChoose(row.participantId,'injure:second',select.value==='true');});
        label.append(select);
        result.append(label);
      }
      if(row.critical.second.effect)result.append(criticalEffectLine(row.critical.second));
    }
  }
  if (preview.defenderCritical) result.appendChild(renderCritical(preview, draft, handlers, true));
  const calculations = node('details', 'workspace-v5-calculations');
  calculations.appendChild(node('summary', '', 'Détail des calculs et règles'));
  for (const [name, test] of [['Attaque / Test', preview.test], ['Défense', preview.defenderTest]]) {
    if (!test) continue;
    if(test.resultTier?.label)calculations.appendChild(node('p','workspace-formula-notes',`${name} : ${test.resultTier.label} (${signed(test.sl)} DR)`));
    calculations.appendChild(node('p', 'workspace-formula-notes', `${name} : ${test.automatic?'réussite automatique, sans jet':`jet initial ${test.initialRoll}, jet final ${test.roll}`} · score ${test.score} · DR de base ${signed(test.details.baseSl)} · modificateurs ${signed(test.details.totalModifier)} · ${test.advantage.advantage.length} Avantage(s), ${test.advantage.disadvantage.length} Désavantage(s)`));
    for (const modifier of test.details.modifiers) calculations.appendChild(node('p', 'workspace-formula-notes', `${modifier.label} : ${signed(modifier.amount)} DR`));
    if (test.zeroOutcome) calculations.appendChild(node('p', 'workspace-formula-notes', test.success ? 'Réussite marginale (+0 DR)' : 'Échec marginal (−0 DR)'));
  }
  if (preview.opposition?.mode === 'opposed') calculations.appendChild(node('p', 'workspace-formula-notes', `DR net ${signed(preview.opposition.netSl)}${preview.opposition.tie ? ' · égalité : l’initiateur gagne' : ''}`));
  if (preview.damage) calculations.appendChild(node('p', 'workspace-formula num', formatDamageFormula(preview.damage)));
  if (preview.protection) calculations.appendChild(node('p', 'workspace-formula-notes', `Protection retenue : ${preview.protection.ap ?? 'inconnue'} PA`));
  calculations.appendChild(node('p', 'workspace-muted', `Règle : ${preview.ruleVersion}`));
  const covered = new Set([...Object.values(V5_TALENT_IDS),...V5_TEST_TALENT_IDS,'talent-strike-to-stun']);
  const excluded = new Set(EXCLUDED_BASE_CHARACTERISTIC_TALENTS);
  const acquired = preview.input.actor?.talents || [];

  if (acquired.some(row => excluded.has(row.id))) calculations.appendChild(node('p', 'workspace-muted', 'Les bonus permanents de caractéristiques sont déjà compris dans la fiche.'));
  const disabled = new Map((preview.talentPlans || []).flatMap(plan => plan.trace || [])
    .filter(row => ['sourceChanged','sourceUnavailable','draft'].includes(row.status)).map(row => [row.talentId, row.status]));
  for (const [id, status] of disabled) {
    const talent = [...acquired, ...(preview.input.target?.talents || [])].find(row => row.id === id);
    calculations.appendChild(node('p', 'workspace-field-error', (talent?.name || id) + ' : ' +
      (status === 'sourceChanged' ? 'description modifiée' : status === 'sourceUnavailable' ? 'source indisponible' : 'règle encore en préparation') + ' ; effet à arbitrer par le MJ.'));
  }
  for (const [role, subject] of [['Acteur',preview.input.actor],['Défenseur',preview.input.target]]) {
    const rows=acquiredV5TalentCoverage(subject);
    if(!rows.length)continue;
    const details=node('details','workspace-talent-coverage');
    details.append(node('summary','',role+' : traitement des talents acquis'));
    for(const row of rows){
      details.append(node('strong','',row.name||row.talentId));
      for(const clause of row.clauses)details.append(node('p','workspace-muted',V5_TALENT_TREATMENT_LABELS[clause.mode]+' · '+clause.text));
    }
    calculations.append(details);
  }
  result.appendChild(calculations);
  return result;
}

// Une ligne par cible : « Saskia : touché · 12 dégâts · PV 14 → 2 ».
export function comparisonText({ name, hp, preview }) {
  const damage = preview.damage;
  const outcome = preview.hit ? 'touché' : 'pas de touche';
  const manual = preview.hit && preview.weapon?.status === 'manual' ? ' · dégâts à arbitrer' : '';
  const pending = preview.critical?.details?.needsLocation ? ' · coup critique (localisation à lancer)' : '';
  const loss = previewHpLoss(preview);
  return `${name} : ${outcome}${manual}${pending}${damage ? ` · ${loss} dégâts · PV ${minusSigned(hp)} → ${minusSigned(Math.max(0, (Number(hp) || 0) - loss))}` : ''}`;
}

export function renderComparison(entries, handlers, busy) {
  const block = node('div', 'workspace-comparison');
  block.appendChild(rubric('Comparaison des cibles'));
  const list = node('ul', 'workspace-comparison-list');
  entries.forEach(entry => {
    const item = node('li', 'workspace-comparison-item');
    item.dataset.targetId = entry.targetId;
    const choose = button('Choisir', 'workspace-ghost', { 'aria-label': `Choisir ${entry.name}`, 'data-focus-key': `compare-choose-${entry.targetId}` });
    choose.disabled = busy;
    choose.addEventListener('click', () => handlers.choose(entry.targetId));
    item.append(node('span', 'num', comparisonText(entry)), choose);
    list.appendChild(item);
  });
  block.appendChild(list);
  return block;
}

/**
 * @param {object} options
 * @param {object} options.draft brouillon de la vue (jets, défense, aperçu, erreurs)
 * @param {object|null} options.actor participant qui agit
 * @param {Array} options.actions actions de celui qui agit
 * @param {string|null} options.actionKey clé de l'action retenue
 * @param {string|null} options.type type retenu
 * @param {object|null} options.target cible effective
 * @param {{ adversaries: Array, allies: Array }} options.groups cibles possibles
 * @param {{ options: Array, value: string, option: object }|null} options.defense choix de défense de la cible (attaque avec cible)
 * @param {boolean} options.canCalculate
 * @param {boolean} options.canApply
 * @param {object} options.handlers select, input, roll, calculate, compare, choose, apply, cancel
 */
export function renderDivineSocialFacts(subject,draft,handlers,{defending=false}={}){
  const checked=readDivineRejections(subject),cults=[...new Set(checked.records.filter(row=>row.kind==='permanent'||row.stage<2).map(row=>row.cult))];
  if(!cults.length)return null;
  const key=defending?'defenseContext':'v5Context',context=draft[key]||{},box=node('div','workspace-divine-social');
  box.append(node('p','workspace-muted',(defending?'Défenseur':'Auteur')+' : une interaction avec un membre du culte est au mieux Très Difficile (−3 DR), sans amélioration positive au-dessus de ce seuil. Source L06 p.219.'));
  for(const cult of cults){
    const text=(defending?'Défenseur · ':'')+'L’interaction concerne un membre de '+cult,label=node('label','workspace-type',text),select=document.createElement('select');
    select.setAttribute('aria-label',text);
    select.append(new Option('À préciser',''),new Option('Oui','true'),new Option('Non','false'));
    select.value=typeof context.divineCultMembership?.[cult]==='boolean'?String(context.divineCultMembership[cult]):'';
    select.addEventListener('change',()=>handlers.select({[key]:{...context,divineCultMembership:{...context.divineCultMembership,[cult]:select.value===''?undefined:select.value==='true'}}}));
    label.append(select);
    box.append(label);
  }
  const text=(defending?'Défenseur · ':'')+'Ce Test est une interaction sociale',label=node('label','workspace-type',text),select=document.createElement('select');
  select.setAttribute('aria-label',text);
  select.append(new Option('Selon la compétence choisie',''),new Option('Oui','true'));
  select.value=context.socialInteraction===true?'true':'';
  select.addEventListener('change',()=>handlers.select({[key]:{...context,socialInteraction:select.value==='true'?true:undefined}}));
  label.append(select);
  box.append(label);
  return box;
}
