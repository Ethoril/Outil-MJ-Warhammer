import { v5StoreActionClock } from '../v5-store-action.js';
import { previewV5Test } from '../v5-roll.js';
import { previewV5ProjectileExtraction } from '../v5-weapon-qualities.js';
import { cloneValue, uid } from '../models.js';
import { recordV5ActionUsage, standardV5ActionSpent, previewV5PaviseDeploymentFrom } from '../store/v5-action-guards.js';
import { initialV5ReloadState, createV5ReloadState, beginV5Reload, advanceV5Reload } from '../v5-reloading.js';
import { previewV5BrokenEscape, BROKEN_ESCAPE_SOURCE, BROKEN_ESCAPE_RULE_VERSION } from '../v5-broken-escape.js';

export function createV5CombatActionsApi({ api, currentEnvelope, issuedBrokenEscapePreviews, issuedPaviseDeploymentPreviews }) {
  return {
    confirmBrokenEscapeVisibility({actorId,visibleToAnyEnemy}={}) {
      const envelope=currentEnvelope(),clock=v5StoreActionClock(envelope);
      if(typeof visibleToAnyEnemy!=='boolean')return {ready:false,status:'requires-input',needsInput:[{field:'visibleToAnyEnemy',label:'Le MJ doit confirmer la visibilité envers tout ennemi.'}]};
      if(!actorId||actorId!==envelope.combat?.currentActorId)return {ready:false,status:'blocked',error:'L’attestation de visibilité doit viser l’acteur du Tour canonique.'};
      const actor=envelope.combat?.participants?.find(row=>row.id===actorId),broken=(actor?.states||[]).some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
      if(!broken)return {ready:false,status:'blocked',error:'Le personnage ne porte pas Brisé.'};
      const key=JSON.stringify([clock.encounterId,clock.turnId]),ledger=envelope.extensions?.v5?.actionLedger||{appliedActions:[],quotaUsage:[]};
      const actionUsed=ledger.quotaUsage.some(row=>row.actorId===actorId&&row.quotaId==='system:turn-action'&&row.scope==='turn'&&row.scopeKey===key&&row.used>0)||standardV5ActionSpent(envelope,actorId,clock);
      const seq=envelope.extensions?.v5?.brokenEscape?.byActorId?.[actorId];
      const sameTurn=seq?.turnId===clock.turnId;
      if(actionUsed&&!(sameTurn&&seq?.fleeCommitted))return {ready:false,status:'blocked',code:'DIV-BROKEN-MIDTURN-01',needsInput:[{field:'decision.DIV-BROKEN-MIDTURN-01',label:'Décision MJ explicite requise pour cette occurrence; ce fait de visibilité ne la remplace pas.'}],error:'DIV-BROKEN-MIDTURN-01 : confirmer hors vue ne résout pas une Action déjà dépensée.'};
      let receipt;
      const saved=api.executeCommand('v5-broken-escape-visibility',draft=>{
        if(draft.localRevision!==envelope.localRevision)throw Object.assign(new Error('La partie a changé; recalculez le fait de visibilité.'),{userFacing:true});
        const root=draft.extensions?.v5||{},state=structuredClone(root.brokenEscape||{byActorId:{},receipts:[]});
        state.byActorId??={};
        const previous=sameTurn?(state.byActorId[actorId]||{}):{};
        state.byActorId[actorId]={...previous,actorId,turnId:clock.turnId,visibleToAnyEnemy,factsCommitted:true,fleeCommitted:previous.fleeCommitted===true,sprintCommitted:previous.sprintCommitted===true};
        receipt={id:`visibility:${actorId}:${clock.turnId}:${visibleToAnyEnemy?'visible':'hidden'}`,actorId,action:'visibility-confirmation',turn:clock,visibleToAnyEnemy,source:'explicit-gm',sourceRuleVersion:BROKEN_ESCAPE_RULE_VERSION};
        state.receipts=[...(state.receipts||[]),receipt].slice(-300);
        draft.extensions??={};
        draft.extensions.v5={...root,brokenEscape:state};
        return draft;
      });
      const finish=result=>result?.ok===false?{status:'error',error:result.error}: {status:'applied',receipt,persistence:result};
      return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    previewV5ProjectileExtraction(input = {}) {
      const envelope=currentEnvelope(),participant=envelope.combat?.participants?.find(row=>row.id===input.participantId);
      const projectile=participant?.extensions?.v5?.lodgedProjectiles?.find(row=>row.id===input.projectileId);
      let test=null;
      if(projectile?.removal==='heal-test'){
        const skill=participant.skills?.find(row=>row.id===input.skillId&&/gu[eé]rison|heal/iu.test(row.name||row.nom||''));
        const score=Number(skill?.total??skill?.score??skill?.value),roll=Number(input.roll);
        if(!Number.isFinite(score)||score<0||score>100||!Number.isInteger(roll)||roll<1||roll>100)
          return {ready:false,status:'requires-input',error:'Empaleuse : choisir une compétence Guérison et saisir son d100.'};
        test=previewV5Test({score,roll,kind:'test'}).options[0].result;
      }
      const result=previewV5ProjectileExtraction({projectile,method:input.method,success:test?.success,testSl:test?.sl,surgeryConfirmed:input.surgeryConfirmed});
      if(!result.ready)return {ready:false,status:'requires-input',error:result.unresolved[0]};
      return {ready:true,baseRevision:envelope.localRevision||0,participantId:participant.id,projectileId:projectile.id,before:structuredClone(projectile),after:{...structuredClone(projectile),removed:true,
        removalReceipt:{method:result.method,...(test?{test:{roll:test.roll,score:test.score,success:test.success,sl:test.sl}}:{}),...(input.surgeryConfirmed?{surgeryConfirmed:true}:{})}}};
    },
    applyV5ProjectileExtraction(supplied) {
      const plan=cloneValue(supplied);
      if(!plan?.ready)return Promise.resolve({status:'blocked',reason:'Recalculer l’extraction avant application.'});
      const saved=api.executeCommand('v5-projectile-extraction',draft=>{
        if((draft.localRevision||0)!==plan.baseRevision)throw Object.assign(new Error('La partie a changé; recalculez l’extraction.'),{userFacing:true});
        const participant=draft.combat?.participants?.find(row=>row.id===plan.participantId),live=participant?.extensions?.v5?.lodgedProjectiles?.find(row=>row.id===plan.projectileId);
        if(!live||JSON.stringify(live)!==JSON.stringify(plan.before))throw Object.assign(new Error('Le projectile fiché a changé; recalculez l’extraction.'),{userFacing:true});
        const updated=structuredClone(participant);
        updated.extensions.v5.lodgedProjectiles=updated.extensions.v5.lodgedProjectiles.map(row=>row.id===plan.projectileId?structuredClone(plan.after):row);
        draft.combat.participants=draft.combat.participants.map(row=>row.id===participant.id?updated:row);
        return draft;
      });
      return Promise.resolve(saved).then(result=>result?.ok===false?{status:'error',reason:result.error}:{status:'applied',participantId:plan.participantId,projectileId:plan.projectileId,persistence:result});
    },
    previewV5PaviseDeployment(input = {}) {
      const plan=previewV5PaviseDeploymentFrom(currentEnvelope(),input);
      if(!plan.ready)return plan;
      plan.previewId=uid();
      issuedPaviseDeploymentPreviews.set(plan.previewId,JSON.stringify(plan));
      while(issuedPaviseDeploymentPreviews.size>100)issuedPaviseDeploymentPreviews.delete(issuedPaviseDeploymentPreviews.keys().next().value);
      return plan;
    },
    applyV5PaviseDeployment(supplied) {
      const plan=cloneValue(supplied);
      if(!plan?.ready)return Promise.resolve({status:'blocked',reason:plan?.error||'Aperçu de mise en place requis.'});
      if(!plan.previewId||issuedPaviseDeploymentPreviews.get(plan.previewId)!==JSON.stringify(plan))return Promise.resolve({status:'blocked',reason:'Aperçu de mise en place absent ou modifié; recalculez.'});
      const actionId=`pavise-setup:${plan.equipmentId}:${plan.turnId}`;
      const saved=api.executeCommand('v5-pavise-deployment',draft=>{
        if((draft.localRevision||0)!==plan.baseRevision)throw Object.assign(new Error('La partie a changé; recalculez la mise en place.'),{userFacing:true});
        const checked=previewV5PaviseDeploymentFrom(draft,{actorId:plan.actorId,equipmentId:plan.equipmentId,direction:plan.direction});
        if(!checked.ready||checked.step!==plan.step||checked.turnId!==plan.turnId||checked.baseRevision!==plan.baseRevision||JSON.stringify(checked.before)!==JSON.stringify(plan.before))throw Object.assign(new Error(checked.error||'Le plan de mise en place est altéré ou périmé; recalculez.'),{userFacing:true});
        const actor=draft.combat?.participants?.find(row=>row.id===checked.actorId),after=checked.step===1?{status:'setting-up',actionsPaid:1,facing:checked.direction,lastTurnId:checked.turnId,startedAt:Date.now()}
          :{status:'planted',actionsPaid:2,facing:checked.direction,lastTurnId:checked.turnId,plantedAt:Date.now()};
        actor.extensions??={};
        actor.extensions.v5??={};
        actor.extensions.v5.paviseDeploymentByItemId={...(actor.extensions.v5.paviseDeploymentByItemId||{}),[plan.equipmentId]:after};
        draft.combat.participants=draft.combat.participants.map(row=>row.id===actor.id?actor:row);
        recordV5ActionUsage(draft,actor.id,actionId);
        draft.log=[{id:uid(),kind:'management',actorId:actor.id,actorName:actor.name,text:`${actor.name||actor.id} : Action ${checked.step}/2 de mise en place du Pavois`,detail:{kind:'v5-pavise-deployment',equipmentId:plan.equipmentId,after} },...(draft.log||[])].slice(0,300);
        return draft;
      });
      return Promise.resolve(saved).then(result=>{
        issuedPaviseDeploymentPreviews.delete(plan.previewId);
        return result?.ok===false?{status:'error',reason:result.error}:{status:'applied',step:plan.step,statusText:plan.step===2?'planted':'setting-up'};
      });
    },
    previewV5WeaponReload(input = {}) {
      const envelope = currentEnvelope(), actor = envelope.combat?.participants?.find(row => row.id === input.actorId);
      const weapon = actor?.equipment?.find(row => row.id === input.equipmentId && row.kind === 'weapon');
      if (!actor || !weapon) return { ready: false, status: 'blocked', error: 'Choisir une arme équipée pour le rechargement.' };
      const current = weapon.extensions?.v5?.reloadState || initialV5ReloadState(weapon).state;
      const variableRepeater=weapon.keywords?.some(row=>(typeof row==='string'?row:row?.id)==='a-repetition'&&String(row?.parameter).toLowerCase()==='variable');
      if(variableRepeater&&!current&&input.operation==='arbitrate'){
        const capacity=Number(input.repeaterRating),reloadSuccesses=Number(weapon.keywords?.find(row=>(typeof row==='string'?row:row?.id)==='recharge')?.parameter);
        if(!Number.isSafeInteger(capacity)||capacity<1)return {ready:false,status:'requires-input',error:'Arbitrage Ratling : capacité entière positive requise.'};
        const adjudicated=createV5ReloadState({repeaterRating:capacity,reloadSuccesses});
        if(!adjudicated.ready)return {ready:false,status:'requires-input',error:'Arbitrage Ratling : capacité entière positive requise.'};
        return {ready:true,actorId:actor.id,equipmentId:weapon.id,operation:'arbitrate',baseRevision:envelope.localRevision||0,before:null,after:adjudicated.state,result:'arbitrated',progress:null};
      }
      if (!current) return { ready: false, status: 'requires-input', error: 'Valeurs À répétition/Recharge non interprétables; arbitrage MJ requis.' };
      let plan;
      if (input.operation === 'begin') plan = beginV5Reload(current, { expectedRevision: input.expectedWeaponRevision ?? current.revision });
      else if (input.operation === 'progress') plan = advanceV5Reload(current, { success: input.success, testSl: input.testSl,
        expectedRevision: input.expectedWeaponRevision ?? current.revision });
      else return { ready: false, status: 'blocked', error: 'Choisir début ou progression du rechargement.' };
      if (!plan.ready || plan.status === 'stale' || plan.status === 'unavailable') return { ready: false, status: plan.status || 'requires-input',
        error: plan.unresolved?.[0] || `Rechargement indisponible : ${plan.reason || plan.status}.` };
      return { ready: true, actorId: actor.id, equipmentId: weapon.id, operation: input.operation,
        baseRevision: envelope.localRevision || 0, before: structuredClone(current), after: structuredClone(plan.state),
        result: plan.status, progress: plan.progress || null };
    },
    applyV5WeaponReload(supplied) {
      const plan = cloneValue(supplied);
      if (!plan?.ready) return Promise.resolve({ status: 'blocked', reason: 'Recalculer le rechargement avant application.' });
      const saved = api.executeCommand('v5-weapon-reload', draft => {
        if ((draft.localRevision || 0) !== plan.baseRevision) throw Object.assign(new Error('La partie a changé; recalculez le rechargement.'), { userFacing: true });
        const actor = draft.combat?.participants?.find(row => row.id === plan.actorId);
        const weapon = actor?.equipment?.find(row => row.id === plan.equipmentId && row.kind === 'weapon');
        const live = weapon?.extensions?.v5?.reloadState || (weapon && initialV5ReloadState(weapon).state);
        if(plan.operation==='arbitrate'&&weapon&&!live){
          const variable=weapon.keywords?.some(row=>(typeof row==='string'?row:row?.id)==='a-repetition'&&String(row?.parameter).toLowerCase()==='variable');
          if(!variable||plan.before!==null)throw Object.assign(new Error('Arbitrage de chargeur devenu invalide.'),{userFacing:true});
          const updated=structuredClone(actor);
          updated.equipment=updated.equipment.map(row=>row.id===plan.equipmentId?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),reloadState:structuredClone(plan.after)}}}:row);
          draft.combat.participants=draft.combat.participants.map(row=>row.id===actor.id?updated:row);
          return draft;
        }
        if (!actor || !weapon || JSON.stringify(live) !== JSON.stringify(plan.before)) throw Object.assign(new Error('L’arme ou son état de recharge a changé; recalculez.'), { userFacing: true });
        const updated = structuredClone(actor);
        updated.equipment = updated.equipment.map(row => row.id === plan.equipmentId ? { ...row,
          extensions: { ...(row.extensions || {}), v5: { ...(row.extensions?.v5 || {}), reloadState: structuredClone(plan.after) } } } : row);
        draft.combat.participants = draft.combat.participants.map(row => row.id === actor.id ? updated : row);
        return draft;
      });
      return Promise.resolve(saved).then(result => result?.ok === false ? { status: 'error', reason: result.error }
        : { status: 'applied', equipmentId: plan.equipmentId, state: plan.after, result: plan.result, progress: plan.progress || null, persistence: result });
    },
    previewBrokenEscape(input = {}) {
      const envelope = currentEnvelope(), actor = envelope.combat?.participants?.find(row => row.id === input.actorId && row.zone === 'active');
      const clock = v5StoreActionClock(envelope);
      if (input.actorId !== envelope.combat?.currentActorId) return {ready:false,status:'blocked',error:'La fuite doit être résolue pendant le Tour canonique du personnage.'};
      const key = clock.encounterId && clock.turnId ? JSON.stringify([clock.encounterId,clock.turnId]) : null;
      const quota = (envelope.extensions?.v5?.actionLedger?.quotaUsage || []);
      const used = id => id==='system:turn-action'&&standardV5ActionSpent(envelope,input.actorId,clock) ? 1 : key && quota.find(row => row.actorId === input.actorId && row.quotaId === id && row.scope === 'turn' && row.scopeKey === key)?.used || 0;
      const sequence = envelope.extensions?.v5?.brokenEscape?.byActorId?.[input.actorId] || null;
      if(input.action==='flee'&&(actor?.extensions?.v5?.combatEffects||[]).some(row=>row.kind==='lose-next-move'))return {ready:false,status:'blocked',error:'Maladresse précédente : ce Mouvement est perdu pour ce Tour.'};
      if (input.action === 'flee' && used('system:turn-action') > 0) return {ready:false,status:'blocked',code:'DIV-BROKEN-MIDTURN-01',needsInput:[{field:'decision.DIV-BROKEN-MIDTURN-01',label:'Décision MJ explicite requise pour cette occurrence.'}],error:'DIV-BROKEN-MIDTURN-01 : une Action a déjà été dépensée pendant ce Tour; décision MJ explicite requise pour cette occurrence.'};
      if (input.action === 'flee' && used('system:turn-move') > 0) return {ready:false,status:'blocked',error:'Le quota Move du Tour est déjà dépensé.'};
      if (['sprint','hide'].includes(input.action) && used('system:turn-action') > 0) return {ready:false,status:'blocked',error:'Le quota Action du Tour est déjà dépensé.'};
      const value = previewV5BrokenEscape({state:envelope,actor,actorId:input.actorId,action:input.action,facts:input.facts,turn:clock,roll:input.roll,choice:input.choice,sequence:sequence && sequence.turnId===clock.turnId ? sequence : null});
      if (value.ready) {
        value.baseRevision = envelope.localRevision || 0;
        value.actionId = `broken-escape:${input.actorId}:${clock.turnId}:${input.action}`;
        value.facts = structuredClone(input.facts);
        const proof=JSON.stringify(value);
        issuedBrokenEscapePreviews.set(value.actionId,proof);
        while(issuedBrokenEscapePreviews.size>100)issuedBrokenEscapePreviews.delete(issuedBrokenEscapePreviews.keys().next().value);
      }
      return value;
    },
    applyBrokenEscape(supplied) {
      const plan = cloneValue(supplied), actorId=plan?.actorId;
      const prior=currentEnvelope().extensions?.v5?.actionLedger?.appliedActions?.find(row=>row.actionId===plan?.actionId);
      if(prior)return Promise.resolve({status:'duplicate',receipt:currentEnvelope().extensions?.v5?.brokenEscape?.receipts?.find(row=>row.id===plan.actionId)||null});
      if (!plan?.ready || !plan.actionId || issuedBrokenEscapePreviews.get(plan.actionId)!==JSON.stringify(plan)) return Promise.reject(new Error('Aperçu de fuite absent ou modifié; recalculez.'));
      let receipt;
      const saved=api.executeCommand('v5-broken-escape',draft=>{
        const clock=v5StoreActionClock(draft),key=clock.encounterId&&clock.turnId?JSON.stringify([clock.encounterId,clock.turnId]):null;
        if(draft.localRevision!==plan.baseRevision||JSON.stringify(clock)!==JSON.stringify(plan.turn))throw Object.assign(new Error('La partie ou le Tour a changé; recalculez la fuite.'),{userFacing:true});
        const actor=draft.combat?.participants?.find(row=>row.id===actorId&&row.zone==='active');
        if(!actor)throw new Error('Personnage de fuite absent.');
        const root=draft.extensions?.v5||{},ledger=structuredClone(root.actionLedger||{appliedActions:[],quotaUsage:[]}),quotaId=plan.action==='flee'?'system:turn-move':'system:turn-action';
        const old=ledger.quotaUsage.find(row=>row.actorId===actorId&&row.quotaId===quotaId&&row.scope==='turn'&&row.scopeKey===key);
        if(old?.used)throw Object.assign(new Error('Quota de Tour déjà dépensé; recalcul requis.'),{userFacing:true});
        const seqs=structuredClone(root.brokenEscape||{byActorId:{},receipts:[]}),seq=seqs.byActorId?.[actorId]||{};
        if(plan.action==='sprint'&&(!seq.fleeCommitted||seq.turnId!==clock.turnId||seq.visibleToAnyEnemy!==true))throw Object.assign(new Error('Move Flee préalable manquant ou périmé.'),{userFacing:true});
        const engagedIds=plan.facts.engagedEnemyIds||[];
        const validEngaged=engagedIds.length>0&&plan.facts.engagedEscapeConfirmed===true&&plan.facts.freeAttacksResolved===true&&Boolean(plan.engagedEscapeEffects);
        if(plan.action==='flee'&&((engagedIds.length&&!validEngaged)||plan.facts.visibleToAnyEnemy!==true))throw Object.assign(new Error('Faits de fuite modifiés; recalculez.'),{userFacing:true});
        if(plan.action==='flee'&&(ledger.quotaUsage.some(row=>row.actorId===actorId&&row.quotaId==='system:turn-action'&&row.scope==='turn'&&row.scopeKey===key&&row.used)||standardV5ActionSpent(draft,actorId,clock)))throw Object.assign(new Error('DIV-BROKEN-MIDTURN-01 : Action déjà dépensée, décision MJ explicite requise.'),{userFacing:true});
        if(plan.action==='flee'&&validEngaged){
          const fx=plan.engagedEscapeEffects;
          for(const enemyId of fx.engagedEnemyIds||[]){
            const foe=draft.combat?.participants?.find(row=>row.id===enemyId&&row.zone==='active');
            if(!foe)continue;
            foe.extensions??={};
            foe.extensions.v5??={};
            foe.extensions.v5.hasMomentum=(fx.momentumRetainedEnemyIds||[]).includes(enemyId);
          }
          if(Number(fx.addedBrokenCount)>0){
            actor.states=[...(actor.states||[]),{id:`${plan.actionId}:broken-engaged`,key:'brise',name:'Brisé',level:fx.addedBrokenCount,source:structuredClone(BROKEN_ESCAPE_SOURCE)}];
            actor.extensions??={};
            actor.extensions.v5??={};
            actor.extensions.v5.hasMomentum=false;
          }
        }
        if(old)old.used=1;else ledger.quotaUsage.push({actorId,quotaId,scope:'turn',scopeKey:key,used:1});
        ledger.appliedActions??=[];
        ledger.appliedActions.push({actionId:plan.actionId,actorId,encounterId:clock.encounterId||null});
        const current=plan.action==='flee'?{...plan.sequenceAfter,fleeCommitted:true,sprintCommitted:false,turnId:clock.turnId,startedAtRevision:draft.localRevision+1}:plan.action==='sprint'?{...plan.sequenceAfter,fleeCommitted:true,sprintCommitted:true,turnId:clock.turnId}:seq;
        seqs.byActorId??={};
        if(plan.action!=='hide')seqs.byActorId[actorId]=current;
        receipt={id:plan.actionId,actorId,action:plan.action,turn:structuredClone(clock),facts:{...structuredClone(plan.facts),...(plan.action==='flee'?{engagementConfirmation:{confirmed:true,enemyCount:(plan.facts.engagedEnemyIds||[]).length}}:{})},...(plan.engagedEscapeEffects?{engagedEscapeEffects:structuredClone(plan.engagedEscapeEffects)}:{}),test:plan.test?structuredClone(plan.test):null,moveDistance:plan.moveDistance,sprintDistance:plan.sprintDistance??null,totalDistance:plan.totalDistance??plan.moveDistance,source:structuredClone(BROKEN_ESCAPE_SOURCE),ruleVersion:BROKEN_ESCAPE_RULE_VERSION};
        seqs.receipts=[...(seqs.receipts||[]),receipt].slice(-300);
        draft.extensions??={};
        draft.extensions.v5={...root,actionLedger:ledger,brokenEscape:seqs};
        return draft;
      });
      const finish=result=>{
        if(result?.ok===false)return {status:'error',reason:result.error||'Écriture refusée; état inchangé.'};
        issuedBrokenEscapePreviews.delete(plan.actionId);
        return {status:'applied',receipt,persistence:result};
      };
      return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
  };
}
