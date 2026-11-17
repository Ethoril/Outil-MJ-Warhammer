import { getStoreDivineAccessGrants, resolveStoreDivineAccess, createStoreDivineAccessGrant, revokeStoreDivineAccessGrant, getDivineContract, getAllDivineContracts, getDivinePenanceExamples, previewStoreDivineAbsolution, applyStoreDivineAbsolution, previewStoreDivineNavalEvent, getStoreDivineDailyWrathStatus, getDivineSinEvents, getDivineSinReminders, previewStoreDivineSinEvent, applyStoreDivineWrathRecovery, applyStoreDivine } from '../v5-divine-store.js';
import { consumeObstinate } from '../v5-obstinate.js';
import { cloneValue } from '../models.js';
import { combatActionBlock, brokenEscapeActionBlock, isBrokenEscapeActor, recordV5ActionUsage, recordV5EscapeVisibility } from '../store/v5-action-guards.js';
import { isV5BrokenEscapeActionBlocked } from '../v5-broken-escape.js';
import { registerNewV5Participants } from '../store/participant-registry.js';
import { resolveImposedTestOnState } from '../v5-divine-effects-imposed.js';
import { setDivineZoneMembersOnState } from '../v5-divine-effects-zones.js';
import { spendDivineCounterOnState, pushDivineCounterOnState, setDivineFlagOnState } from '../v5-divine-effects-counters.js';

export function createDivineApi({ api, currentEnvelope, divineAuthority }) {
  // Commande pure de compteur : essai à blanc sur l'état courant, puis un seul executeCommand (un ↶).
  const counterCommand=(name,run,args,failure,shape)=>{
    const before=run(currentEnvelope(),...cloneValue(args));
    if(!before.ok)return before;
    let transition;
    const saved=api.executeCommand(name,draft=>{
      transition=run(draft,...cloneValue(args));
      if(!transition.ok)throw Object.assign(new Error(transition.error),{userFacing:true});
      return transition.state;
    });
    const finish=result=>result?.ok===false?{ok:false,error:result.error||failure}:shape(transition);
    return saved&&typeof saved.then==='function'?saved.then(finish).catch(error=>({ok:false,error:error.message||failure})):finish(saved);
  };
  return {
    getDivineAccessGrants(actorId=null) { return getStoreDivineAccessGrants(currentEnvelope(),actorId); },
    resolveDivineAccess(actorId,contractId) { return resolveStoreDivineAccess(currentEnvelope(),actorId,contractId); },
    grantDivineAccess(actorId,contractId,options={}) {
      const expected=options.baseRevision;
      const before=createStoreDivineAccessGrant(currentEnvelope(),actorId,contractId,{...options,baseRevision:expected});
      if(!before.ok)return before;
      let transition;
      try{
        const saved=api.executeCommand('v5-divine-access-grant',draft=>{
          transition=createStoreDivineAccessGrant(draft,actorId,contractId,{...options,baseRevision:expected});
          if(!transition.ok)throw Object.assign(new Error(transition.error),{userFacing:true,code:transition.code});
          return transition.state;
        });
        const finish=result=>result?.ok===false?{ok:false,error:result.error||'La dérogation n’a pas été enregistrée.',code:result.code||'PERSISTENCE'}:{...transition,ok:true};
        return saved&&typeof saved.then==='function'?saved.then(finish).catch(error=>({ok:false,error:error.message||'La dérogation n’a pas été enregistrée.',code:error.code||'DIVINE_ACCESS_COMMAND'})):finish(saved);
      }catch(error){return {ok:false,error:error.message||'La dérogation n’a pas été enregistrée.',code:error.code||'DIVINE_ACCESS_COMMAND'};}
    },
    revokeDivineAccessGrant(grantId,options={}) {
      const expected=options.baseRevision;
      const before=revokeStoreDivineAccessGrant(currentEnvelope(),grantId,{...options,baseRevision:expected});
      if(!before.ok)return before;
      let transition;
      try{
        const saved=api.executeCommand('v5-divine-access-revoke',draft=>{
          transition=revokeStoreDivineAccessGrant(draft,grantId,{...options,baseRevision:expected});
          if(!transition.ok)throw Object.assign(new Error(transition.error),{userFacing:true,code:transition.code});
          return transition.state;
        });
        const finish=result=>result?.ok===false?{ok:false,error:result.error||'La révocation n’a pas été enregistrée.',code:result.code||'PERSISTENCE'}:{...transition,ok:true};
        return saved&&typeof saved.then==='function'?saved.then(finish).catch(error=>({ok:false,error:error.message||'La révocation n’a pas été enregistrée.',code:error.code||'DIVINE_ACCESS_COMMAND'})):finish(saved);
      }catch(error){return {ok:false,error:error.message||'La révocation n’a pas été enregistrée.',code:error.code||'DIVINE_ACCESS_COMMAND'};}
    },
    getDivineContract(identifier) { return getDivineContract(identifier); },
    getAllDivineContracts() { return getAllDivineContracts(); },
    canManageDivinePenances(){return divineAuthority==='MJ';},
    getDivinePenanceExamples(){return getDivinePenanceExamples();},
    previewDivineAbsolution(input={}) {return previewStoreDivineAbsolution(currentEnvelope(),input);},
    applyDivineAbsolution(input={}) {
      const captured=cloneValue(input);
      let execution;
      if(['absolution','gm-wrath'].includes(captured.preview?.input?.absolution?.kind)&&divineAuthority!=='MJ')throw new Error('Seul le MJ peut décider cette absolution ou ce Courroux.');
      const saved=api.executeCommand('v5-divine-absolution',draft=>{
        execution=applyStoreDivineAbsolution(draft,captured);
        return execution.state;
      });
      const finish=result=>result?.ok===false?result:{...execution,ok:true};
      return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    previewDivineNavalEvent(input={}){return previewStoreDivineNavalEvent(currentEnvelope(),input);},
    getDivineDailyWrathStatus(actorId,id){return getStoreDivineDailyWrathStatus(currentEnvelope(),actorId,id);},
    getDivineSinEvents(){return getDivineSinEvents();},
    getDivineSinReminders(){return getDivineSinReminders();},
    previewDivineSinEvent(input={}){return previewStoreDivineSinEvent(currentEnvelope(),input);},
    applyDivineWrathRecovery(input={}) {
      const captured=cloneValue(input);
      let execution;
      const saved=api.executeCommand('v5-divine-wrath-recovery',draft=>{
        const actorId=captured.preview?.input?.actorId,actor=draft.combat?.participants?.find(row=>row.id===actorId),visible=captured.preview?.input?.brokenEscapeFacts?.visibleToAnyEnemy;
        const spent=combatActionBlock(draft,actorId);
        if(spent)throw Object.assign(new Error(spent.error),{userFacing:true,code:spent.code});
        const block=brokenEscapeActionBlock(draft,actorId);
        if(block||isBrokenEscapeActor(actor)&&(typeof visible!=='boolean'||isV5BrokenEscapeActionBlocked(actor,{visibleToAnyEnemy:visible,sequence:draft.extensions?.v5?.brokenEscape?.byActorId?.[actorId]})))throw Object.assign(new Error('Brisé : Prière de récupération indisponible pour ce Tour.'),{userFacing:true});
        execution=applyStoreDivineWrathRecovery(draft,captured);
        consumeObstinate(execution.state,actor,captured.preview?.input?.conditionContext);
        if(execution.state.extensions?.v5?.combatActions?.byActorId?.[actorId]?.kind==='aim')delete execution.state.extensions.v5.combatActions.byActorId[actorId];
        if(execution?.state)registerNewV5Participants(draft,execution.state);
        recordV5ActionUsage(execution.state,actorId,execution.executionId);
        if(isBrokenEscapeActor(execution.state.combat.participants.find(row=>row.id===actorId)))recordV5EscapeVisibility(execution.state,actorId,visible,execution.executionId);
        return execution.state;
      });
      const finish=result=>result?.ok===false?result:{...execution,ok:true};
      return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    applyDivineExecution(identifier,input={}) {
      input=cloneValue(input);
      let execution;
      const saved=api.executeCommand('v5-divine-prayer',draft=>{
        const actorId=input.preview?.input?.actorId||input.preview?.input?.actor?.id||draft.combat?.currentActorId,actor=draft.combat?.participants?.find(row=>row.id===actorId),brise=actor?.states?.some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
        const actionSpent=combatActionBlock(draft,actorId);
        if(actionSpent)throw Object.assign(new Error(actionSpent.error),{userFacing:true,code:actionSpent.code});
        const actionBlock=brokenEscapeActionBlock(draft,actorId);
        if(actionBlock)throw Object.assign(new Error(actionBlock.error),{userFacing:true,code:actionBlock.code});
        const visibility=input.brokenEscapeFacts?.visibleToAnyEnemy??input.preview?.input?.brokenEscapeFacts?.visibleToAnyEnemy;
        if(brise){
          if(typeof visibility!=='boolean')throw Object.assign(new Error('Le MJ doit confirmer la visibilité actuelle envers tout ennemi.'),{userFacing:true});
          const blocked=isV5BrokenEscapeActionBlocked(actor,{visibleToAnyEnemy:visibility,sequence:draft.extensions?.v5?.brokenEscape?.byActorId?.[actorId]});
          if(blocked)throw Object.assign(new Error('Brisé impose Move (Flee), puis Action (Sprint) tant que le personnage reste visible.'),{userFacing:true});
          const actionBlock=brokenEscapeActionBlock(draft,actorId);
          if(actionBlock)throw Object.assign(new Error(actionBlock.error),{userFacing:true,code:actionBlock.code});
        }
        execution=applyStoreDivine(draft,identifier,input);
        if (execution?.ready && execution.state) registerNewV5Participants(draft, execution.state);
        if(execution?.ready&&execution.state){
          consumeObstinate(execution.state,actor,input.preview?.input?.conditionContext);
          const executionId=execution.executionId||input.preview?.executionId||`prayer:${identifier}:${execution.state.localRevision}`,tracked=recordV5ActionUsage(execution.state,actorId,executionId);
          if(!tracked.ok)throw Object.assign(new Error(tracked.reason),{userFacing:true});
          if(execution.state.extensions?.v5?.combatActions?.byActorId?.[actorId]?.kind==='aim')delete execution.state.extensions.v5.combatActions.byActorId[actorId];
          if((execution.state.combat?.participants||[]).find(row=>row.id===actorId)?.states?.some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())))recordV5EscapeVisibility(execution.state,actorId,visibility,executionId);
        }
        return execution.state;
      });
      const finish=result=>result?.ok===false?result:{...execution,ok:true};
      return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    /** Présence dans une zone divine (F5) : désignée par le MJ, un seul ↶. */
    setDivineZoneMembers(casterId,layerId,ids=[]) {
      const before=setDivineZoneMembersOnState(currentEnvelope(),casterId,layerId,cloneValue(ids));
      if(!before.ok)return before;
      const saved=api.executeCommand('v5-divine-zone-members',draft=>{
        const transition=setDivineZoneMembersOnState(draft,casterId,layerId,cloneValue(ids));
        if(!transition.ok)throw Object.assign(new Error(transition.error),{userFacing:true});
        return transition.state;
      });
      const finish=result=>result?.ok===false?{ok:false,error:result.error||'Présence non enregistrée.'}:{ok:true,members:before.members};
      return saved&&typeof saved.then==='function'?saved.then(finish).catch(error=>({ok:false,error:error.message||'Présence non enregistrée.'})):finish(saved);
    },
    /** Compteurs et cases des miracles (F3) : un seul ↶ par commande, jets saisis par le MJ. */
    spendDivineCounter(participantId,layerId,amount=1) { return counterCommand('v5-divine-counter-spend',spendDivineCounterOnState,[participantId,layerId,amount],'Dépense non enregistrée.',transition=>({ok:true,remaining:transition.remaining,reminders:transition.reminders})); },
    pushDivineCounter(participantId,layerId,roll) { return counterCommand('v5-divine-counter-push',pushDivineCounterOnState,[participantId,layerId,roll],'Jet non enregistré.',transition=>({ok:true,value:transition.value,bust:transition.bust})); },
    setDivineFlag(participantId,layerId,value) { return counterCommand('v5-divine-flag',setDivineFlagOnState,[participantId,layerId,value],'Case non enregistrée.',transition=>({ok:true,value:transition.value})); },
    /** Test imposé `manual` d'une prière active (miracles narratifs, F2) : jet saisi par le MJ, issue appliquée, un seul ↶. */
    resolveDivineImposedTest(participantId,layerId,input={}) {
      const before=resolveImposedTestOnState(currentEnvelope(),participantId,layerId,cloneValue(input||{}));
      if(!before.ok)return before;
      let transition;
      const saved=api.executeCommand('v5-divine-imposed-test',draft=>{
        transition=resolveImposedTestOnState(draft,participantId,layerId,cloneValue(input||{}));
        if(!transition.ok)throw Object.assign(new Error(transition.error),{userFacing:true});
        return transition.state;
      });
      const finish=result=>result?.ok===false?{ok:false,error:result.error||'Test imposé non enregistré.'}:{ok:true,result:transition.result,applied:transition.applied,reminders:transition.reminders};
      return saved&&typeof saved.then==='function'?saved.then(finish).catch(error=>({ok:false,error:error.message||'Test imposé non enregistré.'})):finish(saved);
    },
  };
}
