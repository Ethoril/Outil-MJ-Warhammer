/** Pure E08 order and turn transitions. */
import { selectV5Test, resolveV5Opposition, previewV5Test } from './v5-roll.js';
import { buildCombatTest } from './v5-combat-rules.js';
import { hasV5Talent } from './v5-talents.js';
import { getReferenceCatalogue } from './reference-catalog.js';

// Vigilance (talent Combat Aware, p. 116) : Test de Perception Challenging (+0 DR) ; sans la compétence, l'Initiative.
function vigilanceScore(participant) {
  const perceptionId = getReferenceCatalogue().skills.find(row => row.nom === 'Perception')?.id;
  const skill = (participant.skills || []).find(row => row?.id === perceptionId && row.status !== 'unresolved');
  return Number.isSafeInteger(skill?.total) && skill.total >= 0 ? skill.total : Number.isSafeInteger(participant.caracs?.I) && participant.caracs.I >= 0 ? participant.caracs.I : null;
}

export const ORDER_MODES = Object.freeze({ AUTOMATIC: 'automatic', MANUAL: 'manual' });

const clone = value => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    Object.defineProperty(out, key, { value: clone(child), writable: true, enumerable: true, configurable: true });
  }
  return out;
};

function activeParticipants(participants) {
  if (!Array.isArray(participants)) return [];
  const seen = new Set();
  return participants.filter(participant => {
    if (!participant || typeof participant.id !== 'string' || !participant.id || seen.has(participant.id)) return false;
    seen.add(participant.id);
    return participant.zone === 'active';
  }).map(clone);
}

function initiativeOrder(participants,round) {
  const active=activeParticipants(participants),position=new Map(active.map((row,index)=>[row.id,index])),initialized=active.some(row=>combatInitiativeOf(row)?.initialized);
  return active.sort((a, b) => {
    const late=p=>Number.isFinite(round)&&(p.states || []).some(s=>s.source?.coldBreath && /extenue|fatigued/i.test(s.key || s.name) && round>Number(s.v5Timing?.acquiredRound ?? s.source?.coldAfterRound ?? Infinity));
    if(late(a)!==late(b))return late(a)?1:-1;
    const combatA=a.extensions?.v5?.combatInitiative,combatB=b.extensions?.v5?.combatInitiative;
    if(initialized&&Boolean(combatA?.initialized)!==Boolean(combatB?.initialized))return combatA?.initialized?-1:1;
    if(combatA?.initialized&&combatB?.initialized){
      return Number(combatB.score)-Number(combatA.score)
        || Number(combatB.characteristic)-Number(combatA.characteristic)
        || Number(combatA.orderIndex??0)-Number(combatB.orderIndex??0);
    }
    if(initialized)return position.get(a.id)-position.get(b.id);
    const initiativeA = Number(a.initiative) || 0;
    const initiativeB = Number(b.initiative) || 0;
    return initiativeB - initiativeA || String(a.name || '').localeCompare(String(b.name || '')) || a.id.localeCompare(b.id);
  }).map(participant => participant.id);
}

const combatInitiativeOf = participant => participant?.extensions?.v5?.combatInitiative;
const lateByColdBreath = (participant, round) => Number.isFinite(round) && (participant.states || []).some(state =>
  state.source?.coldBreath && /extenue|fatigued/i.test(state.key || state.name || '')
  && round > Number(state.v5Timing?.acquiredRound ?? state.source?.coldAfterRound ?? Infinity));

function stableActiveOrder(participants, order, round) {
  const active = activeParticipants(participants), ids = new Set(active.map(row => row.id));
  const kept=[];
  for(const id of Array.isArray(order)?order:[])if(ids.has(id)&&!kept.includes(id))kept.push(id);
  for(const row of active)if(!kept.includes(row.id))kept.push(row.id);
  const rows=new Map(active.map(row=>[row.id,row]));
  return kept.sort((left,right)=>Number(lateByColdBreath(rows.get(left),round))-Number(lateByColdBreath(rows.get(right),round)));
}

function activeIds(participants) {
  return new Set(activeParticipants(participants).map(participant => participant.id));
}

function orderWithCombatFumbles(participants, order, round) {
  if (!Number.isFinite(round)) return order;
  const byId=new Map(activeParticipants(participants).map(row=>[row.id,row]));
  return [...order].sort((left,right)=>{
    const late=id=>(byId.get(id)?.extensions?.v5?.combatEffects||[]).some(effect=>effect.kind==='acts-last-next-round'&&Number(effect.round)===round);
    return Number(late(left))-Number(late(right));
  });
}

/** Return the one order used by both the visible track and the turn engine. */
export function effectiveOrder(participants, { mode = ORDER_MODES.AUTOMATIC, order = [], autoOrder = null, round } = {}) {
  const ids = activeIds(participants);
  const active=activeParticipants(participants),initialized=active.some(row=>combatInitiativeOf(row)?.initialized)||Array.isArray(autoOrder);
  if (initialized) {
    const canonical=Array.isArray(autoOrder)?autoOrder:initiativeOrder(participants,round);
    const base=stableActiveOrder(participants,canonical,round);
    if (mode !== ORDER_MODES.MANUAL) return orderWithCombatFumbles(participants,base,round);
    const kept=[];for(const id of Array.isArray(order)?order:[])if(ids.has(id)&&!kept.includes(id))kept.push(id);
    for(const id of base)if(!kept.includes(id))kept.push(id);
    return orderWithCombatFumbles(participants,kept,round);
  }
  if (mode !== ORDER_MODES.MANUAL) return orderWithCombatFumbles(participants,initiativeOrder(participants,round),round);
  const kept = [];
  for (const id of Array.isArray(order) ? order : []) {
    if (typeof id === 'string' && ids.has(id) && !kept.includes(id)) kept.push(id);
  }
  return orderWithCombatFumbles(participants,kept.concat(initiativeOrder(participants,round).filter(id => !kept.includes(id))),round);
}

/** Pure F2-A preparation. All random dice and opposed-test results are supplied by the caller. */
export function prepareCombatInitiative(participants, {
  diceById = {}, combatReflexesById = {}, characteristicById = {}, tieOrders = {}, opposedRolls = {}, tieChoices = {}, surprisedCamp = null, vigilanceRolls = {}
} = {}) {
  const active=activeParticipants(participants),needsInput=[],rows=[];
  for(const participant of active){
    const reflex=hasV5Talent(participant,'talent-combat-reflexes'),pending=participant.extensions?.v5?.combatReflexesPreparation;
    const explicit=Object.hasOwn(characteristicById,participant.id)?characteristicById[participant.id]:undefined;
    const source=explicit!==undefined?'mj':Number.isInteger(participant.caracs?.I)&&participant.caracs.I>=0?'caracs.I'
      :!pending&&Number.isInteger(participant.initiative)&&participant.initiative>0?'initiative':null;
    const characteristic=explicit!==undefined?explicit:source==='caracs.I'?participant.caracs.I:source==='initiative'?participant.initiative:null;
    const pendingSourceValid=reflex&&pending?.version===1&&pending.participantId===participant.id&&Number.isSafeInteger(pending.originalInitiative)
      &&pending.provenance?.kind==='legacy-talent-activation'&&typeof pending.provenance.resolutionId==='string';
    const pendingValid=pendingSourceValid&&pending.characteristic===characteristic
      &&Array.isArray(pending.dice)&&pending.dice.length===2&&pending.dice.every(n=>Number.isInteger(n)&&n>=1&&n<=10)
      &&['first','second'].includes(pending.choice)&&pending.selectedDie===pending.dice[pending.choice==='first'?0:1];
    const reflexInput=combatReflexesById[participant.id]||{},existing=combatInitiativeOf(participant);
    const reflexDice=pendingValid?pending.dice:reflexInput.dice||(existing?.initialized?existing.dice:undefined),reflexChoice=pendingValid?pending.choice:reflexInput.choice||(existing?.initialized?existing.choice:undefined);
    let die=reflex?undefined:(diceById[participant.id]??(existing?.initialized?existing.die:undefined));
    if(!Number.isInteger(characteristic)||characteristic<0)needsInput.push({participantId:participant.id,field:'characteristic'});
    if(reflex){
      if(!Array.isArray(reflexDice)||reflexDice.length!==2||!reflexDice.every(n=>Number.isInteger(n)&&n>=1&&n<=10))needsInput.push({participantId:participant.id,field:'combatReflexesDice'});
      if(!['first','second'].includes(reflexChoice))needsInput.push({participantId:participant.id,field:'combatReflexesChoice'});
      if(Array.isArray(reflexDice)&&reflexDice.length===2&&['first','second'].includes(reflexChoice))die=reflexDice[reflexChoice==='first'?0:1];
    }else if(!Number.isInteger(die)||die<1||die>10)needsInput.push({participantId:participant.id,field:'die'});
    if(Number.isInteger(characteristic)&&characteristic>=0&&Number.isInteger(die)&&die>=1&&die<=10){
      rows.push({...participant,...(pendingSourceValid?{initiative:pending.originalInitiative}:{}),extensions:{...(participant.extensions||{}),v5:{...(participant.extensions?.v5||{}),combatInitiative:{die,characteristic,characteristicSource:source,bonus:Math.floor(characteristic/10),score:die+Math.floor(characteristic/10),initialized:true,...(reflex?{talentId:'talent-combat-reflexes',dice:[...reflexDice],choice:reflexChoice,...(pendingValid?{preparationProvenance:clone(pending.provenance)}:{})}:{})}}}});
    }else rows.push(structuredClone(participant));
  }
  const byId=new Map(rows.map(row=>[row.id,row])), scored=rows.filter(row=>row.zone==='active'&&combatInitiativeOf(row)?.initialized);
  const sorted=scored.slice().sort((a,b)=>Number(combatInitiativeOf(b).score)-Number(combatInitiativeOf(a).score)||Number(combatInitiativeOf(b).characteristic)-Number(combatInitiativeOf(a).characteristic));
  const tieGroups=[];
  for(let index=0;index<sorted.length;){
    const first=combatInitiativeOf(sorted[index]);let end=index+1;
    while(end<sorted.length){const current=combatInitiativeOf(sorted[end]);if(current.score!==first.score||current.characteristic!==first.characteristic)break;end++;}
    const participantIds=sorted.slice(index,end).map(row=>row.id);
    if(participantIds.length>1)tieGroups.push({key:participantIds.join('|'),participantIds});
    index=end;
  }
  const oppositions=[],resolvedGroups=new Map();
  const isPermutation=(list,ids)=>Array.isArray(list)&&list.length===ids.length&&new Set(list).size===list.length&&list.every(id=>ids.includes(id));
  for(const group of tieGroups){
    // Ordre tranché par le MJ : il prime toujours (trois ex aequo ou plus, choix direct, ou vainqueur qui laisse passer).
    const choice=tieChoices[group.key],chosen=isPermutation(choice,group.participantIds);
    if(group.participantIds.length>=3){
      if(!chosen)needsInput.push({field:'tieChoice',groupKey:group.key,participantIds:group.participantIds,direct:true});
      else resolvedGroups.set(group.key,{supplied:choice,direct:true});
      continue;
    }
    // Deux ex aequo : Test opposé d'I, l'initiateur est le premier listé sauf ordre explicite (sans effet sur le classement).
    const supplied=isPermutation(tieOrders[group.key],group.participantIds)?tieOrders[group.key]:group.participantIds;
    const before=needsInput.length;
    let champion=supplied[0];
    for(let index=1;index<supplied.length;index++){
      const initiatorId=champion,opponentId=supplied[index],id=`${group.key}:${initiatorId}:${opponentId}`,rolls=opposedRolls[id];
      const missingRolls=[['initiatorRoll',initiatorId],['opponentRoll',opponentId]].filter(([field])=>!Number.isInteger(rolls?.[field])||rolls[field]<1||rolls[field]>100);
      if(missingRolls.length){for(const [field,participantId] of missingRolls)needsInput.push({field,groupKey:group.key,matchId:id,participantId});break;}
      const buildInitiativeTest=(actor,target,roll,side)=>buildCombatTest({actor,target,roll,action:{base:combatInitiativeOf(actor).characteristic,attr:'I',label:'Initiative',type:'test',qualities:[],extensions:{v5:{kind:'test',scoreIsCurrent:true}}},v5:{kind:'test',context:{skillId:'none',mandatoryTest:true,sequelaNoCircumstanceInput:true,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false,runningOrHiding:false,conditionPenaltyMode:rolls[`${side}ConditionPenaltyMode`]}},v5State:{participants:active}});
      const initiatorPlan=buildInitiativeTest(byId.get(initiatorId),byId.get(opponentId),rolls.initiatorRoll,'initiator'),opponentPlan=buildInitiativeTest(byId.get(opponentId),byId.get(initiatorId),rolls.opponentRoll,'opponent');
      for(const [side,participantId,testPlan] of [['initiator',initiatorId,initiatorPlan],['opponent',opponentId,opponentPlan]]){
        for(const label of testPlan.unresolved||[])needsInput.push({field:label.includes('États de pénalités différentes')?`${side}ConditionPenaltyMode`:'oppositionContext',groupKey:group.key,matchId:id,participantId,label});
        const choiceField=`${side}Choice`,choice=rolls[choiceField],options=testPlan.test?.options||[];
        if(options.length>1&&!options.some(option=>option.id===choice))needsInput.push({field:`${side}Choice`,groupKey:group.key,matchId:id,participantId,optionIds:options.map(option=>option.id)});
        else if(options.length===1&&choice!==undefined&&choice!==options[0].id)needsInput.push({field:`${side}Choice`,groupKey:group.key,matchId:id,participantId,optionIds:options.map(option=>option.id)});
      }
      if((initiatorPlan.unresolved||[]).length||(opponentPlan.unresolved||[]).length||needsInput.some(item=>item.matchId===id&&['initiatorChoice','opponentChoice'].includes(item.field)))break;
      const selectTest=(plan,rolls,side)=>selectV5Test(plan.test,rolls[`${side}Choice`]||plan.test.options[0].id);
      const initiator=selectTest(initiatorPlan,rolls,'initiator'),opponent=selectTest(opponentPlan,rolls,'opponent');
      const result=resolveV5Opposition(initiator,opponent),winnerId=result.winner==='initiator'?initiatorId:opponentId;
      oppositions.push({id,groupKey:group.key,initiatorId,opponentId,initiator,opponent,winnerId,netSl:result.netSl,tie:result.tie,
        initiatorChoice:rolls.initiatorChoice??initiatorPlan.test.options[0]?.id,opponentChoice:rolls.opponentChoice??opponentPlan.test.options[0]?.id,
        initiatorConditionPenaltyMode:rolls.initiatorConditionPenaltyMode,opponentConditionPenaltyMode:rolls.opponentConditionPenaltyMode});champion=winnerId;
    }
    const completed=oppositions.filter(row=>row.groupKey===group.key).length>=supplied.length-1;
    if(chosen){needsInput.splice(before);resolvedGroups.set(group.key,{...(completed?{championId:champion}:{direct:true}),supplied:choice});continue;}
    if(!completed)continue;
    resolvedGroups.set(group.key,{championId:champion,supplied:[champion,...group.participantIds.filter(id=>id!==champion)]});
  }
  let order=[];
  for(let index=0;index<sorted.length;){
    const first=combatInitiativeOf(sorted[index]);let end=index+1;
    while(end<sorted.length){const current=combatInitiativeOf(sorted[end]);if(current.score!==first.score||current.characteristic!==first.characteristic)break;end++;}
    const ids=sorted.slice(index,end).map(row=>row.id),group=tieGroups.find(row=>row.participantIds.length===ids.length&&row.participantIds.every(id=>ids.includes(id)));
    order.push(...(group&&resolvedGroups.get(group.key)?.supplied?resolvedGroups.get(group.key).supplied:ids));index=end;
  }
  rows.forEach(row=>{const metadata=combatInitiativeOf(row);if(metadata?.initialized)metadata.orderIndex=order.indexOf(row.id);});
  const validCamps=new Set(rows.filter(row=>row.zone==='active').map(row=>row.camp));
  if(surprisedCamp!==null&&surprisedCamp!==undefined&&surprisedCamp!==''&&!validCamps.has(surprisedCamp))needsInput.push({field:'surprisedCamp',camp:surprisedCamp});
  // G6 (p. 116, 161, 187) : chaque surpris qui a la Vigilance fait son Test de Perception avant le round 1 ; réussi, il n'est pas Surpris.
  const vigilance=[];
  if(surprisedCamp&&validCamps.has(surprisedCamp))for(const row of rows){
    if(row.zone!=='active'||row.camp!==surprisedCamp||!hasV5Talent(row,'talent-combat-aware'))continue;
    const score=vigilanceScore(row),roll=(vigilanceRolls||{})[row.id];
    if(score===null){needsInput.push({participantId:row.id,field:'vigilanceScore'});continue;}
    if(!Number.isInteger(roll)||roll<1||roll>100){needsInput.push({participantId:row.id,field:'vigilanceRoll'});continue;}
    const test=selectV5Test(previewV5Test({score,roll,kind:'test'}),'keep');
    vigilance.push({participantId:row.id,roll,score,success:test.success===true,sl:test.sl});
  }
  return {ready:needsInput.length===0,status:needsInput.length?'requires-input':'ready',participants:rows,order,tieGroups,oppositions,needsInput,surprisedCamp:surprisedCamp||null,vigilance};
}

/** Explicitly reorder the manual track; the caller can pass null to append. */
export function moveInOrder(order, movedId, beforeId = null) {
  const current = Array.isArray(order) ? [...order] : [];
  const index = current.indexOf(movedId);
  if (index < 0) return current;
  current.splice(index, 1);
  const target = beforeId == null ? current.length : current.indexOf(beforeId);
  current.splice(target < 0 ? current.length : target, 0, movedId);
  return current;
}

/** Insert a reinforcement after the current actor by default. */
export function insertReinforcement(order, participantId, currentActorId = null) {
  const current = Array.isArray(order) ? order.filter(id => id !== participantId) : [];
  const index = currentActorId == null ? -1 : current.indexOf(currentActorId);
  current.splice(index < 0 ? current.length : index + 1, 0, participantId);
  return current;
}

/** Register new active participants in a frozen V5 Round, preserving the Turns already ordered. */
export function insertParticipantsByInitiative(combat, participants) {
  const previous = activeIds(combat.participants || []);
  const newcomers = activeParticipants(participants).filter(participant => !previous.has(participant.id));
  if (!newcomers.length) return combat.order || [];
  if((combat.participants||[]).some(participant=>combatInitiativeOf(participant)?.initialized)){
    let order=effectiveOrder((combat.participants||[]).filter(participant=>previous.has(participant.id)),{mode:ORDER_MODES.MANUAL,order:combat.order});
    const returning=newcomers.filter(participant=>combatInitiativeOf(participant)?.initialized);
    const reinforcements=newcomers.filter(participant=>!combatInitiativeOf(participant)?.initialized);
    if(returning.length&&combat.orderMode!==ORDER_MODES.MANUAL){
      const ranked=initiativeOrder(participants,combat.round),rank=id=>ranked.indexOf(id);
      for(const participant of returning){
        order=order.filter(id=>id!==participant.id);
        const position=order.findIndex(id=>rank(id)>rank(participant.id));
        order.splice(position<0?order.length:position,0,participant.id);
      }
    }
    for(const participant of [...(combat.orderMode===ORDER_MODES.MANUAL?returning:[]),...reinforcements])order=insertReinforcement(order,participant.id,combat.currentActorId||null);
    return order;
  }
  const ranked = initiativeOrder(participants, combat.round), rank = id => ranked.indexOf(id);
  const order = effectiveOrder(participants.filter(participant => previous.has(participant.id)), { mode: ORDER_MODES.MANUAL, order: combat.order });
  for (const id of ranked.filter(id => newcomers.some(participant => participant.id === id))) {
    const current = order.indexOf(combat.currentActorId);
    // A rank that has passed is inserted before the current actor: it waits for the next Round.
    const earlier = current >= 0 && rank(id) < rank(combat.currentActorId);
    const start = earlier ? 0 : current + 1, end = earlier ? current : order.length;
    let position = end;
    for (let index = start; index < end; index++) if (rank(order[index]) > rank(id)) { position = index; break; }
    order.splice(position, 0, id);
  }
  return order;
}

/** Change initiative sorting mode without triggering a turn or end-of-turn effect. */
export function setOrderMode(participants, { mode = ORDER_MODES.AUTOMATIC, order = [], autoOrder = null, currentActorId = null } = {}) {
  const nextOrder = effectiveOrder(participants, { mode, order, autoOrder });
  const ids = new Set(nextOrder);
  return {
    mode,
    order: nextOrder,
    currentActorId: ids.has(currentActorId) ? currentActorId : (nextOrder[0] || null)
  };
}

/**
 * Tour avancé (« Jouer son tour maintenant », refonte E4c, CA24-CA25) : champ facultatif `extensions.v5.advancedTurn`
 * `{ round, playedIds, resumeActorId, resumeIndex }`. Absent, mal formé ou d'un autre round = rien d'avancé (null),
 * lu ainsi au point de lecture sans réécrire les données.
 */
export function readAdvancedTurn(value, round) {
  if (!value || typeof value !== 'object' || !(Number(round) > 0) || Number(value.round) !== Number(round)) return null;
  const playedIds = (Array.isArray(value.playedIds) ? value.playedIds : []).filter(id => typeof id === 'string' && id);
  const resumeActorId = typeof value.resumeActorId === 'string' && value.resumeActorId ? value.resumeActorId : null;
  const resumeIndex = resumeActorId && Number.isSafeInteger(value.resumeIndex) && value.resumeIndex >= 0 ? value.resumeIndex : null;
  return { round: Number(round), playedIds: [...new Set(playedIds)], resumeActorId, resumeIndex };
}

/** Ceux qui ont joué ce round : avant le tour en cours (ou avant celui qui reprend) dans l'ordre, plus les tours avancés. */
export function playedThisRound({ participants = [], order = [], currentActorId = null, round = 0, advanced = null } = {}) {
  const active = activeIds(participants), validOrder = (Array.isArray(order) ? order : []).filter(id => active.has(id));
  if (!(Number(round) > 0) || !currentActorId) return [];
  const adv = readAdvancedTurn(advanced, round), cursorId = adv?.resumeActorId || currentActorId;
  let cursor = validOrder.indexOf(cursorId);
  if (cursor < 0) cursor = adv?.resumeIndex ?? 0;
  const played = new Set(validOrder.slice(0, cursor));
  for (const id of adv?.playedIds || []) if (active.has(id) && id !== currentActorId) played.add(id);
  return validOrder.filter(id => played.has(id));
}

/** « Jouer son tour maintenant » est-il permis pour ce combattant ? `{ ok, reason }` (raison en français si refus). */
export function playTurnNowCheck({ participants = [], order = [], currentActorId = null, round = 0, advanced = null, participantId } = {}) {
  if (!(Number(round) > 0) || !currentActorId) return { ok: false, reason: 'le combat n’a pas commencé' };
  if (!activeIds(participants).has(participantId)) return { ok: false, reason: 'n’est pas dans le combat actif' };
  if (participantId === currentActorId) return { ok: false, reason: 'c’est déjà son tour' };
  const adv = readAdvancedTurn(advanced, round);
  if (adv?.resumeActorId === participantId) return { ok: false, reason: 'reprend son tour au prochain « Tour suivant »' };
  if (playedThisRound({ participants, order, currentActorId, round, advanced }).includes(participantId)) return { ok: false, reason: 'a déjà joué ce round' };
  return { ok: true };
}

/** Donne le tour tout de suite ; l'ordre ne change pas. Rend `{ ok, currentActorId, advancedTurn }` ou `{ ok:false, reason }`. */
export function playTurnNow({ participants = [], order = [], currentActorId = null, round = 0, advanced = null, participantId } = {}) {
  const check = playTurnNowCheck({ participants, order, currentActorId, round, advanced, participantId });
  if (!check.ok) return check;
  const active = activeIds(participants), validOrder = (Array.isArray(order) ? order : []).filter(id => active.has(id));
  const adv = readAdvancedTurn(advanced, round);
  // Enchaîné (un autre joue déjà par anticipation) : celui qui reprend reste le premier interrompu.
  const resumeActorId = adv?.resumeActorId || currentActorId;
  const resumeIndex = adv?.resumeActorId ? adv.resumeIndex : Math.max(0, validOrder.indexOf(currentActorId));
  return { ok: true, currentActorId: participantId,
    advancedTurn: { round: Number(round), playedIds: [...(adv?.playedIds || []), participantId], resumeActorId, resumeIndex } };
}

/** Select the next active actor; changing the order never applies effects itself. */
export function nextTurn({ participants = [], order = [], currentActorId = null, round = 0, advanced = null } = {}) {
  const active = activeIds(participants);
  const validOrder = (Array.isArray(order) ? order : []).filter(id => active.has(id));
  if (!validOrder.length) return { order: [], currentActorId: null, round };
  const currentIndex = validOrder.indexOf(currentActorId);
  const adv = readAdvancedTurn(advanced, round);
  if (adv && (currentIndex >= 0 || adv.resumeActorId)) {
    // Tour avancé : on rend la main à celui qui devait jouer, puis on saute ceux qui ont déjà joué par anticipation.
    const played = new Set(adv.playedIds), kept = { ...adv, resumeActorId: null, resumeIndex: null };
    if (adv.resumeActorId && validOrder.includes(adv.resumeActorId) && !played.has(adv.resumeActorId))
      return { order: validOrder, currentActorId: adv.resumeActorId, round, advancedTurn: kept };
    const start = adv.resumeActorId ? Math.min(adv.resumeIndex ?? 0, validOrder.length) : currentIndex + 1;
    const following = validOrder.slice(start).find(id => !played.has(id));
    if (following) return { order: validOrder, currentActorId: following, round, advancedTurn: kept };
    return { order: validOrder, currentActorId: validOrder[0], round: round + 1, advancedTurn: null };
  }
  if (currentIndex < 0) return { order: validOrder, currentActorId: validOrder[0], round };
  const nextIndex = (currentIndex + 1) % validOrder.length;
  return {
    order: validOrder,
    currentActorId: validOrder[nextIndex],
    round: nextIndex === 0 ? round + 1 : round,
    // Un champ d'un round passé est remis à zéro dès le premier Tour suivant.
    ...(advanced && !adv ? { advancedTurn: null } : {})
  };
}

/** Remove or bench a participant, selecting the next survivor without ending a turn. */
export function removeFromCombat({ participants = [], order = [], currentActorId = null, participantId } = {}) {
  const remaining = activeParticipants(participants).filter(participant => participant.id !== participantId);
  const previousOrder = (Array.isArray(order) ? order : []).filter(id => id !== participantId && activeIds(remaining).has(id));
  if (currentActorId !== participantId) return { order: previousOrder, currentActorId: activeIds(remaining).has(currentActorId) ? currentActorId : (previousOrder[0] || null) };
  const oldIndex = Array.isArray(order) ? order.indexOf(participantId) : -1;
  const oldOrder = Array.isArray(order) ? order : [];
  const candidateIds = oldOrder.slice(oldIndex + 1).concat(oldOrder.slice(0, Math.max(0, oldIndex)));
  const survivor = candidateIds.find(id => activeIds(remaining).has(id)) || previousOrder[0] || null;
  return { order: previousOrder, currentActorId: survivor };
}
