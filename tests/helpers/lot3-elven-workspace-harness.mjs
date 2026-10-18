import {workspaceHarness} from './lot3-workspace-harness.mjs';
export const elvenWorkspaceHarness=workspaceHarness
 .replace(".filter(c=>c.isBookV5)",".filter(c=>c.isBookV5 || ['high','elven-arcane','elven-petty'].includes(c.domain))")
 .replace("actions:[{id:'blade'", "traits:['Mort-vivant','Bestial'],actions:[{id:'arrow',note:'Arc réel',type:'attack',attr:'CT',base:50,damage:3,qualities:[]},{id:'blade'")
 .replace("spells:getAllSpellContracts()","spells:getAllSpellContracts()")
 .replace("map(c=>({id:c.id,name:c.name}))","map(c=>({id:id==='foe'?'sheet-local-'+c.id:c.id,name:c.name}))")
 .replace("const participants=[person('mage'),person('foe')];",`const participants=[person('mage'),person('foe')];
 const selected=getSpellContract(params.get('spell') || name);const high=selected?.domain==='high';
 participants[0].extensions.v5.channelling={type:high?'high':'winds',sl:30};
 participants[0].talents.push({id:'talent-high-magic',status:'resolved',rank:1});`)
 .replace("if(name){const c=getSpellContract(name);await store.applySpellExecution",`if(name){const c=getSpellContract(name);if(c.name==='Impasse')await store.applySpellEffects('foe',{spellId:'preexisting',spellName:'Couche existante',casterId:'mage',durationRounds:12,apModifiers:{all:1}});await store.applySpellExecution`)
 .replace("sl:20,attributeActive:false,locationRoll:34,domainFacts:{...declaredFacts,familiar:true}",`sl:30,attributeActive:false,burnoutRoll:50,locationRoll:34,directionRoll:4,distanceRoll:10,domainFacts:{...declaredFacts,familiar:true},overcastSpecific:c.name==='Tempête'?{cool:1}:c.name==='Glamour de Teclis'?{hours:1}:{}`)
 .replace("actorId:'mage',targetIds:[", "chosenLore:c.domain==='arcane'?'fire':undefined,actorId:'mage',targetIds:[")
 .replace("await store.applySpellEffects('foe',{ward:7", "await store.applySpellEffects('foe',{ward:7");
