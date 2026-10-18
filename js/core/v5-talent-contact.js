import{situationPlan,activeSource}from'./v5-talent-situations.js';import{getReferenceCatalogue}from'./reference-catalog.js';
export function contactActions(subject){const active=(subject.states||[]).some(s=>s.key==='in-fighter-contact'&&activeSource(s));return active?[{id:'activate:end-contact',note:'Quitter le combat au contact (1 Élan)',type:'skill',base:0,mod:0,qualities:[],extensions:{v5:{kind:'test',initialContext:{talentAction:'end-contact'}}}}]:[];}
export function contactNoTest(subject,id){return id==='end-contact'&&(subject.states||[]).some(s=>s.key==='in-fighter-contact'&&activeSource(s));}
export function previewContactActivation(n,test,opposed){
 const c=n.v5.context||{},id=c.talentAction;if(!['in-fighter','end-contact'].includes(id))return null;
 const existing=(n.actor.states||[]).find(s=>s.key==='in-fighter-contact'&&s.opponentId===n.target?.id&&activeSource(s)),plan=id==='end-contact'?{proposals:existing?[{op:'activateTalent',origins:[existing.source]}]:[]}:situationPlan(n.actor,id),changes=[],unresolved=[],reminders=[];
 if(!plan.proposals.length)unresolved.push('Combat au contact : talent ou effet indisponible.');
 if(!n.target||n.target.id===n.actor.id)unresolved.push('Combat au contact : adversaire distinct requis.');
 if(id==='in-fighter'){
  const group=getReferenceCatalogue().skills.find(s=>s.id===n.action.extensions?.fiche?.skillId)?.groupId;
  if(!opposed||n.v5.kind!=='melee'||n.defense?.v5?.kind!=='melee'||!group?.startsWith('skill-group-43_6f_72_70_73')||typeof c.winnerChoosesContact!=='boolean'||n.action.type!=='opposition')unresolved.push('Combattant au contact : Action de Corps à corps opposée, puis choix du vainqueur requis.');
  if(c.winnerChoosesContact&&!unresolved.length)for(const[p,other]of[[n.actor,n.target],[n.target,n.actor]])changes.push({participantId:p.id,add:[{id:n.resolutionId+':contact:'+p.id,key:'in-fighter-contact',name:'Combat au contact',kind:'talent-pending',level:1,source:plan.proposals[0].origins[0],opponentId:other.id,authorId:n.actor.id}]});
 }
 if(id==='end-contact'){
  if(!n.noTestAction||c.beginningOfTurn!==true||!n.v5Clock.turnId?.endsWith(':'+n.actor.id))unresolved.push('Quitter le contact : début de votre Tour et 1 Élan requis.');
  if(!unresolved.length)for(const p of[n.actor,n.target])changes.push({participantId:p.id,removeIds:(p.states||[]).filter(s=>s.key==='in-fighter-contact'&&s.opponentId===(p.id===n.actor.id?n.target.id:n.actor.id)).map(s=>s.id)});
 }
 return{plan,changes,unresolved,reminders};
}
export function contactWeapon(n,subject,action,settings){
 if(!(subject.states||[]).some(s=>s.key==='in-fighter-contact'&&s.opponentId===(subject.id===n.actor.id?n.target?.id:n.actor.id)&&activeSource(s)))return{action,plans:[],unresolved:[]};
 const owned=subject.equipment?.find(s=>s.id===action.extensions?.fiche?.equipmentId),reach=owned?.reach??action.extensions?.v5?.weaponReach??settings.context?.weaponReach;
 if(!['Personnel','Courte','Moyenne','Longue','Très longue','Massive','Personal','Short','Average','Long','Very Long','Massive'].includes(reach))return{action,plans:[],unresolved:['Combat au contact : allonge de l’arme requise.']};
 const origins=subject.states.filter(s=>s.key==='in-fighter-contact'&&activeSource(s)).map(s=>s.source),plans=[{proposals:[{origins}]}];
 if(['Personnel','Courte','Personal','Short'].includes(reach))return{action,plans,unresolved:[]};
 const item=getReferenceCatalogue().items.find(s=>s.id==='weapon-armes-corps-a-corps-base-arme-improvisee');
 return{action:{...action,contactImprovised:true,sourceQualities:item.keywords||[],damage:item.damage,damageFormula:item.damageFormula,qualities:item.keywords||[]},plans,unresolved:[]};
}

export function prepareContactWeapons(n){const plans=[],unresolved=[];for(const[subject,key,settings]of[[n.actor,'action',n.v5],[n.target,'defense',n.defense?.v5]])if(subject&&n[key]&&settings?.kind==='melee'){const result=contactWeapon(n,subject,n[key],settings);n[key]=result.action;if(result.action.contactImprovised){const skill=getReferenceCatalogue().skills.find(s=>s.nom==='Corps à corps (Base)'),base=subject.skills?.find(s=>s.id===skill.id&&s.status==='resolved')?.total??subject.caracs?.CC;if(!Number.isSafeInteger(base))unresolved.push('Arme improvisée : base de Corps à corps (Base) requise.');else n[key]={...n[key],base,extensions:{fiche:{skillId:skill.id}}};}plans.push(...result.plans);unresolved.push(...result.unresolved);}return{plans,unresolved};}
