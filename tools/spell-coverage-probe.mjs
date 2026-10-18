function answer(request){
 const field=request.field;
 if(request.kind==='boolean')return !/:(?:cover|astronomy|flying|machine)$/.test(field);
 if(request.kind==='test')return {success:true,sl:2};
 if(request.kind==='d100')return /:(?:roundTest|athletics)$/.test(field)?95:25;
 if(request.kind==='2d10')return 2;
 if(request.kind==='d10')return 2;
 if(request.kind==='integer')return /:size$/.test(field)?3:1;
 return undefined;
}
async function nextDeclaredTurn(engine){
 const inputs={};let preview=engine.previewNextTurn({inputs});
 for(let pass=0;!preview.ready&&pass<12;pass++){
  let changed=false;
  for(const request of preview.requests || []){
   const value=answer(request),data=inputs[request.participantId] ??={};
   if(value!==undefined&&data[request.field]===undefined){data[request.field]=value;changed=true;}
  }
  if(!changed)return false;
  preview=engine.previewNextTurn({inputs});
 }
 if(!preview.ready)return false;
 await engine.nextTurn({inputs});return true;
}
async function prepared(state){
 const [{createStore},{createCombatEngine}]=await Promise.all([import('../js/core/store.js'),import('../js/core/combat.js')]);
 const envelope=structuredClone(state);
 for(const p of envelope.combat.participants)p.zone='active';
 envelope.schemaVersion=3;envelope.reserve=[];envelope.diceLines=[];envelope.log=[];
 envelope.combat.order=envelope.combat.participants.map(p=>p.id);
 envelope.combat.currentActorId=envelope.combat.order[0];
 envelope.extensions={v5:{turnIndex:1}};
 const store=createStore({storage:null});await store.ready;await store.loadFromJSON(envelope);
 return {store,engine:createCombatEngine(store)};
}

/** Aucun effet déclaré calculable sur la seule présence d'une couche ou d'un reçu. */
export async function measurePeriodicSpellOutcome(applied,control,measure){
 const actual=await prepared(applied),reference=await prepared(control);
 const turns=2*applied.combat.participants.length;
 for(let turn=0;turn<turns;turn++){
  if(!await nextDeclaredTurn(actual.engine)||!await nextDeclaredTurn(reference.engine))return false;
  const left=measure(JSON.parse(actual.store.getFullJSON())),right=measure(JSON.parse(reference.store.getFullJSON()));
  if(JSON.stringify(left)!==JSON.stringify(right))return true;
 }
 return false;
}
