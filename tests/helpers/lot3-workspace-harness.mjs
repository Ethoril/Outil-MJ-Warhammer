export const workspaceHarness=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body><div id="workspace-mount"></div><script type="module">
import {createStore} from '/js/core/store.js';
import {initWorkspaceView} from '/js/ui/workspace-view.js';
import {getSpellContract,getAllSpellContracts} from '/js/core/v5-spell-contracts.js';
import {declaredAnswers,declaredFacts} from '/tests/helpers/lot3-declared-answers.js';
const listeners=new Map(),bus={on:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},emit:(name,...args)=>{for(const fn of listeners.get(name)||[])fn(...args);}};
const store=createStore({bus,persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});await store.ready;
const person=id=>({id,name:id==='mage'?'Mage':'Cible',zone:'active',camp:id==='mage'?'pj':'ennemi',kind:'PJ',initiative:id==='mage'?60:30,hp:20,maxHp:40,
 caracs:{CC:50,CT:50,F:40,E:40,I:50,Ag:50,Dex:50,Int:60,FM:60,Soc:50,M:4},
 skills:[{name:'Langue (Magick)',total:90},{name:'Focalisation',total:90},{name:'Résistance',total:40}],traits:[],talents:[{id:'talent-arcane-magic',status:'resolved',specialization:'Feu',rank:1}],states:[],
 actions:[{id:'blade',note:'Épée de '+id,type:'attack',attr:'CC',base:50,damage:3,qualities:[]}],equipment:[],armor:{head:2,body:2,arms:2,legs:2},
 spells:getAllSpellContracts().filter(c=>c.isBookV5).map(c=>({id:c.id,name:c.name})),extensions:{v5:{hasMomentum:true,channelling:{type:'winds',sl:30}}}});
const params=new URLSearchParams(location.search),name=params.get('active');
const participants=[person('mage'),person('foe')];participants[1].talents.push({id:'talent-second-sight',status:'resolved',rank:1});if(params.get('allies'))participants[1].camp='pj';
await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'mage',order:['mage','foe'],participants},log:[],diceLines:[]});
if(name){const c=getSpellContract(name);await store.applySpellExecution(c.id,{...declaredAnswers(['mage','foe']),actorId:'mage',targetIds:[/^Vous$/i.test(c.target)?'mage':'foe'],sl:20,attributeActive:false,locationRoll:34,domainFacts:{...declaredFacts,familiar:true}});
 await store.applySpellEffects('foe',{ward:7,durationRounds:10,casterId:'mage',casterLileathRank:1});if(name==='Firewall')await store.applySpellEffects('foe',{ward:9,durationRounds:10,casterId:'mage',casterLileathRank:1});}
const view=initWorkspaceView({mount:document.querySelector('#workspace-mount'),Store:store,Bus:bus,actions:{applyResolution:p=>store.applyResolution(p),acquireStates:(a,s,m)=>store.acquireStates(a,s,m),recoverState:(a,k,o)=>store.recoverState(a,k,o),setStates:(a,s,l)=>store.setStates(a,s,l),setMomentum:(a,v)=>store.setMomentum(a,v)}});view.setSpace('play');
window.__TEST__={Store:store,view,getSpellContract};window.ready=true;
</script></body></html>`;
