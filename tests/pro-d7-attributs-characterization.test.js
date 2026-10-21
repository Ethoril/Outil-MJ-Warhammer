import test from 'node:test';
import assert from 'node:assert/strict';
import {previewLoreAttribute,normalizeLoreId,LORE_ATTRIBUTES} from '../js/core/v5-magic-attributes.js';

// Caractérisation de l'existant avant l'ajout des Domaines du Chaos (D7-D9) : les neuf attributs de Vents ne changent pas.
const caster={id:'c',name:'Mage',caracs:{FM:50,Int:40},talents:[]};
const foe={id:'f',name:'Foe',hp:20,traits:[],states:[],armor:{body:0}};
const undead={id:'u',name:'Mort',hp:20,traits:['Mort-vivant'],states:[]};
const summarize=lore=>{
 const p=previewLoreAttribute({lore,caster,targets:[foe,undead],spell:{isProtection:true},chosenLore:lore==='high'?'fire':null});
 return {lore:p.lore,casterType:p.casterEffects?.type??null,targets:[...p.targetEffects.entries()].map(([id,e])=>[id,e.type,e.summary]),dmg:{ignoreMetalAp:p.damageRules.ignoreMetalAp,ignoreNonMagicalAp:p.damageRules.ignoreNonMagicalAp,metalDamageBonus:p.damageRules.metalDamageBonus}};
};
const D={ignoreMetalAp:false,ignoreNonMagicalAp:false,metalDamageBonus:false};
const FIRE=[['f','lore-attribute-fire','Foe subit 1 état Enflammé (Attribut Feu).'],['u','lore-attribute-fire','Mort subit 1 état Enflammé (Attribut Feu).']];
const EXPECTED={
 beasts:{lore:'beasts',casterType:'lore-attribute-beasts',targets:[],dmg:D},
 death:{lore:'death',casterType:null,targets:[['f','lore-attribute-death','Foe subit 1 état Exténué (Attribut Mort).']],dmg:D},
 fire:{lore:'fire',casterType:null,targets:FIRE,dmg:D},
 heavens:{lore:'heavens',casterType:'lore-attribute-heavens',targets:[],dmg:{...D,ignoreMetalAp:true}},
 life:{lore:'life',casterType:null,targets:[['f','lore-attribute-life','Foe : retrait des états Hémorragique et Exténué.'],['u','lore-attribute-life','Mort : non vivant, états conservés. Cible Mort-vivante : subit 5 Blessures directes.']],dmg:D},
 light:{lore:'light',casterType:null,targets:[['f','lore-attribute-light','Foe : gagne 1 état Aveuglé.'],['u','lore-attribute-light','Mort : gagne 1 état Aveuglé. Démon/Mort-vivant : subit 4 Blessures directes.']],dmg:D},
 metal:{lore:'metal',casterType:null,targets:[],dmg:{...D,ignoreMetalAp:true,metalDamageBonus:true}},
 shadow:{lore:'shadow',casterType:'lore-attribute-shadow',targets:[],dmg:{...D,ignoreNonMagicalAp:true}},
 high:{lore:'fire',casterType:null,targets:FIRE,dmg:D}
};
for(const [lore,expected] of Object.entries(EXPECTED))test(`Attribut de Domaine existant — ${lore} inchangé`,()=>{assert.deepEqual(summarize(lore),expected);});
test('Attributs de Domaine — les neuf Vents de départ restent présents et les traditions sans attribut ne sont pas reconnues',()=>{
 for(const lore of Object.keys(EXPECTED))assert.ok(LORE_ATTRIBUTES[lore],lore);
 for(const id of ['hedgecraft','witchcraft','daemonology','necromancy','arcane','elven-arcane'])assert.equal(normalizeLoreId(id),null,id);
 for(const [name,id] of [['Domaine des Bêtes','beasts'],['shyish','death'],['Aqshy','fire'],['Azyr','heavens'],['Ghyran','life'],['Hysh','light'],['Chamon','metal'],['Ulgu','shadow'],['Qhaysh','high']])assert.equal(normalizeLoreId(name),id,name);
});
