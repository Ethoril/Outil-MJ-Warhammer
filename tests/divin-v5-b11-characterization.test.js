import test from 'node:test';import assert from 'node:assert/strict';import{calculateArmor,locationProtection}from '../js/core/equipment.js';
const item={id:'mail',baseId:'mail',kind:'armour',ap:2,layer:'rigid',locations:['body'],keywords:[]};
test('B11 caractérisation — les PA d’équipement utilisent les pièces présentes, pas l’agrégat manuel',()=>{const actor={equipment:[item],armor:{body:9}};assert.equal(locationProtection(actor,{location:'body'}).ap,2);assert.equal(calculateArmor(actor.equipment).body,2);});
test('B11 caractérisation — sans pièce les PA manuels sont utilisés',()=>{assert.equal(locationProtection({equipment:[],armorLocations:{body:1}},{location:'body'}).ap,1);});
test('B11 caractérisation — les PA magiques et dégâts d’armure restent distincts des pièces',()=>{const actor={equipment:[item],extensions:{v5:{magicAp:{body:2},armorDamage:{body:1}}}};assert.equal(locationProtection(actor,{location:'body'}).ap,3);});
