import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseReferenceCSV,parseKeywordCSV,getReferenceSnapshot,getReferenceCatalogue,getReferenceStatus,refreshReferences,referenceContentPayload,sha256,resolveSkill,resolveTalent,aggregateTalents,createReferenceResolvers} from '../js/core/reference-catalog.js';
import {normalizeEquipment,armourProtection,calculateArmor,normalizeArmorLocations,locationProtection,equipmentFormula,equipmentQualities,mergeEquipmentQualities,ammunitionCompatibility} from '../js/core/equipment.js';
import {armourProtection as sourceArmour, equipmentFormula as sourceFormula} from '../js/data/shared/fiche/equipment.js';
import {keywordMechanicalStatus} from '../js/core/keywords.js';
import {qualityLabel} from '../js/core/quality-normalization.js';
import {computeDamage} from '../js/core/damage.js';
import {previewResolution,applyResolution} from '../js/core/resolution.js';
const clone=structuredClone;
const item=(id,ap=1,locations=['body'],layer='leather',keywords=[])=>({id,baseId:'model-'+id,catalogVersion:'synthetic',kind:'armour',name:id,category:'Armure',damage:'',reach:'',range:'',ap,locations,layer,keywords,notes:'',source:'Fixture synthétique',custom:true});
const fetchedCsv={};
const fetchFixture=async url=>{const name=new URL(url).searchParams.get('sheet');fetchedCsv[name]??=await readFile(new URL('../js/data/reference-source-csv/'+name+'.csv',import.meta.url),'utf8');return {ok:true,text:async()=>fetchedCsv[name]};};
const actor={id:'a',caracs:{F:39},equipment:[],states:[]};
const action={id:'weapon',type:'attack',base:80,mod:0,damage:9,qualities:[]};

test('Références — CSV accents, virgules, guillemets et cellules sur plusieurs lignes',()=>{
 assert.deepEqual(parseReferenceCSV('\uFEFF"Nom","Effet"\r\n"Épée","Une, deux\nTrois ""quatre"""'),[['Nom','Effet'],['Épée','Une, deux\nTrois "quatre"']]);
 assert.throws(()=>parseReferenceCSV('"incomplet'),/incomplet/);
});
test('Références — identifiant explicite et paramètres conservent colonnes nommées',async()=>{
 const csv=await fetchFixture('https://example.org/?sheet=Mots%20Cl%C3%A9s%20Armes%20et%20Armures').then(r=>r.text());const words=parseKeywordCSV(csv);
 assert.equal(words.length,55);assert.equal(words.find(w=>w.id==='protectrice').edition,'V4');assert.ok(words.find(w=>w.id==='protectrice').parameter);
 assert.throws(()=>parseKeywordCSV('Nom,Effet\nTest,test'),/Colonnes/);
});
test('Références — instantané commun source, compétences principales et talents traduits',()=>{
 const pack=getReferenceCatalogue();assert.equal(pack.items.length,213);assert.equal(pack.talents.length,206);
 assert.equal(pack.magic.spells.length,280);assert.equal(resolveSkill('Corps à corps (Base)').entry.carac,'cc');
 assert.equal(resolveTalent('Hardy').entry.id,resolveTalent('Dur à cuire').entry.id);
 assert.equal(resolveTalent('Magie des Arcanes (Fire)').specialization,'Aqshy');
 assert.equal(resolveSkill('Nom approchant inconnu').status,'unknown');
});
test('Références — talents rangs et spécialités séparés, acquisitions et notes conservées',()=>{
 const result=aggregateTalents([{id:'a',nom:'Sens aiguisé (Vue)',note:'un'},{id:'b',nom:'Acute Sense (Sight)',note:'deux'},{id:'c',nom:'Sens aiguisé (Ouïe)',note:'trois'}]);
 assert.equal(result.coverage,'present');assert.equal(result.items.length,2);assert.equal(result.items.find(i=>i.rank===2).acquisitions[1].note,'deux');
 assert.equal(aggregateTalents(undefined).coverage,'absent');assert.equal(aggregateTalents([]).coverage,'present');assert.equal(aggregateTalents([null]).coverage,'invalid');
});
test('Équipement — collection absente/vide/invalide et IDs dupliqués ne se confondent pas',()=>{
 assert.equal(normalizeEquipment(undefined).coverage,'absent');assert.equal(normalizeEquipment([]).coverage,'present');
 assert.equal(normalizeEquipment({}).coverage,'invalid');assert.equal(normalizeEquipment([item('one'),item('one')]).coverage,'invalid');
 const malformed=item('bad');malformed.ap='1';assert.equal(normalizeEquipment([malformed]).coverage,'invalid');
});
test('Équipement — exemplaire inconnu personnalisé et paramètre textuel conservés sans substitution',()=>{
 const custom=item('custom',null,['leftArm'],'rigid',[{id:'unknown-word',parameter:'spécial'}]);const input=[custom];const out=normalizeEquipment(input);
 assert.equal(out.coverage,'present');assert.deepEqual(out.items,input);assert.ok(out.warnings.some(w=>w.code==='unknown-keyword'));
 out.items[0].name='changed';assert.equal(custom.name,'custom');assert.equal(out.items[0].ap,null);
 assert.equal(qualityLabel({id:'explosion',parameter:'très large'}),'Explosion très large');
});
test('Équipement — parité six zones, couches et deux pièces même couche',()=>{
 const items=[item('cuir',1),item('maille',2,['body','rightArm'],'flexible',[{id:'flexible',parameter:''}]),item('plates',2,['body','leftArm'],'rigid'),item('moins-bien',1,['body'],'rigid')];
 assert.deepEqual(armourProtection(items),sourceArmour(items));assert.deepEqual(calculateArmor(items),{head:0,body:5,rightArm:2,leftArm:2,rightLeg:0,leftLeg:0});
 assert.equal(armourProtection(items).locations.find(l=>l.id==='body').ignored[0].item.id,'moins-bien');
});
test('Équipement — protections héritées symétriques sans objets fictifs',()=>{
 assert.deepEqual(normalizeArmorLocations({head:1,body:3,arms:2,legs:1}),{head:1,body:3,rightArm:2,leftArm:2,rightLeg:1,leftLeg:1});
 const target={armor:{arms:2},armorLocations:{leftArm:5,rightArm:1}};
 assert.equal(locationProtection(target,{location:{key:'ARM',side:'left'}}).ap,5);
 assert.equal(locationProtection(target,{location:{key:'ARM',side:'right'}}).ap,1);
});
test('Équipement — formule sûre en parité, BF39/40 et expression spéciale intacte',()=>{
 for(const formula of ['BF+4','+ BF +4','BF × 2','1d10 spécial','4'])for(const f of [39,40]){const data={carac:{f:{base:f,adv:0}}};assert.deepEqual(equipmentFormula(formula,data),sourceFormula(formula,data));}
 assert.equal(equipmentFormula('BF+4',{carac:{f:{base:39}}}).value,7);assert.equal(equipmentFormula('BF+4',{carac:{f:{base:40}}}).value,8);
 assert.equal(equipmentFormula('process.exit()',{}).value,null);
});
test('Protection — Partielle V5 ignore uniquement pièce en localisation paire',()=>{
 const target={equipment:[item('cuir',1),item('casque',2,['body'],'rigid',[{id:'partielle',parameter:''}])]};
 assert.equal(locationProtection(target,{location:'body',hitLocationRoll:50,critical:false}).ap,1);
 assert.equal(locationProtection(target,{location:'body',hitLocationRoll:51,critical:false}).ap,3);
 assert.equal(locationProtection(target,{location:'body'}).ap,null);
});
test('Protection — Points faibles uniquement critique Empaleuse ; Impénétrable critique impair',()=>{
 const target={equipment:[item('cuir',1),item('plates',2,['body'],'rigid',[{id:'points-faibles',parameter:''},{id:'impenetrable',parameter:''}])]};
 const base={location:'body',attackRoll:33,critical:true,qualities:[{id:'empaleuse'}]};
 const value=locationProtection(target,base);assert.equal(value.ap,1);assert.equal(value.criticalIgnored,true);
 assert.equal(locationProtection(target,{...base,critical:false}).ap,3);
 assert.equal(locationProtection(target,{...base,attackRoll:22}).criticalIgnored,false);
});
test('Protection — bouclier séparé, un seul et défense/projectiles explicites',()=>{
 const shield={...item('shield',2,[],'none',[{id:'protectrice',parameter:'2'}]),kind:'shield'};const big={...shield,id:'big',ap:4,keywords:[{id:'protectrice',parameter:'4'}]};const target={equipment:[item('cuir',1),shield,big]};
 assert.equal(calculateArmor(target.equipment).body,1);
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield',opposedWithShield:true,shieldAvailable:true,defenseProvided:true,ranged:false}).ap,3);
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield',opposedWithShield:true,shieldAvailable:false}).ap,1);
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield'}).ap,null);
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield',opposedWithShield:true}).manual[0],'disponibilite-bouclier-requise');
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield',opposedWithShield:true,shieldAvailable:true,defenseProvided:true,ranged:true}).ap,null);
 assert.equal(locationProtection(target,{location:'body',shieldId:'shield',opposedWithShield:true,shieldAvailable:true,defenseProvided:true,ranged:true,lineOfSight:true}).ap,3);
});
test('Protection — PA inconnus et mot clé retiré demandent arbitrage ; valeur manuelle traçable',()=>{
 const target={equipment:[item('unknown',null)]};assert.equal(locationProtection(target,{location:'body'}).ap,null);
 const override=locationProtection(target,{location:'body',manualAp:4});assert.equal(override.ap,4);assert.equal(override.arbitrated,true);
});
test('Qualités — munition et arme dédoublonnées avec sources et paramètres exacts',()=>{
 const weapon={id:'w',kind:'weapon',keywords:[{id:'empaleuse',parameter:''},{id:'recharge',parameter:'2'}]};const ammo={id:'m',kind:'ammunition',keywords:[{id:'empaleuse',parameter:''},{id:'explosion',parameter:'large'}]};
 const merged=mergeEquipmentQualities(weapon,ammo);assert.equal(merged.qualities.length,3);assert.equal(merged.sources.length,4);assert.equal(equipmentQualities(weapon)[1].rating,2);assert.equal(merged.qualities[2].parameter,'large');
});
test('Moteurs — Inoffensive annule les deux bonus comme source corrigée',()=>{
 const computed=computeDamage({weaponDamage:3,roll:38,sl:1,targetArmour:2,qualities:['inoffensive','percutante','devastatrice']});assert.equal(computed.sl,1);assert.equal(computed.bonusPercutante,0);assert.equal(computed.finalDamage,0);
});
test('Résolution — bonne protection à gauche/droite et aucun changement de santé avant appliquer',()=>{
 const target={id:'t',hp:20,caracs:{E:0},armorLocations:{leftArm:5,rightArm:1}};
 const left=previewResolution({actor,action,target,roll:51,baseRevision:0});const right=previewResolution({actor,action,target,roll:52,baseRevision:0});
 assert.equal(left.damage.targetArmour,5);assert.equal(right.damage.targetArmour,1);assert.equal(target.hp,20);
});
test('Résolution — action sans compétence résolue bloquée explicitement',()=>{
 assert.throws(()=>previewResolution({actor,action:{...action,base:'',extensions:{fiche:{requiresLink:true}}},roll:40}),error=>error.code==='SKILL_LINK_REQUIRED');
});
test('Résolution — contexte Partielle absent interdit application ; arbitré ensuite',()=>{
 const target={id:'t',hp:20,caracs:{E:0},equipment:[item('armor',null,['body'])]};const preview=previewResolution({actor,action,target,roll:35,baseRevision:0});
 assert.equal(preview.damage,null);assert.equal(applyResolution(preview,{revision:0,participants:[target]}).status,'manual');
 const valid=previewResolution({actor,action,target,roll:35,baseRevision:0,protectionContext:{manualAp:2}});assert.equal(valid.damage.targetArmour,2);
});
test('Références — contenu fonctionnel stable si dates changent',async()=>{
 const previous=getReferenceSnapshot();const changed=clone(previous);changed.fetchedAt='2099-12-31';changed.talents.fetchedAt='2099-12-31';changed.published.publishedAt='2099-12-31';
 assert.equal(await sha256(referenceContentPayload(changed)),await sha256(referenceContentPayload(previous)));
});
test('Références — refresh atomique réussit avec source publique et version identique',async()=>{
 const before=getReferenceSnapshot().contentVersion;const result=await refreshReferences({fetchImpl:fetchFixture,storage:null});assert.equal(result.ok,true,result.status.error);assert.equal(getReferenceSnapshot().contentVersion,before);
 assert.equal(getReferenceStatus().error,null);assert.equal(getReferenceCatalogue().items.length,213);
});
test('Références — un échec HTTP ou source incomplète conserve le dernier ensemble et date succès',async()=>{
 const before=getReferenceSnapshot(),status=getReferenceStatus();let failure=await refreshReferences({storage:null,fetchImpl:async url=>new URL(url).searchParams.get('sheet')==='Armures'?{ok:false,status:503}:fetchFixture(url)});assert.equal(failure.ok,false);assert.strictEqual(getReferenceSnapshot(),before);assert.equal(getReferenceStatus().updatedAt,status.updatedAt);assert.match(getReferenceStatus().error,/503/);
 failure=await refreshReferences({storage:null,fetchImpl:async url=>new URL(url).searchParams.get('sheet')==='Talents'?{ok:true,text:async()=>'Nom,Effet\nVide,'}:fetchFixture(url)});assert.equal(failure.ok,false);assert.strictEqual(getReferenceSnapshot(),before);
});
test('Références — effet changé reste consultable mais moteur ancien refuse et historique intact',async()=>{
 const prior=getReferenceSnapshot();const result=await refreshReferences({storage:null,fetchImpl:async url=>{const response=await fetchFixture(url);if(new URL(url).searchParams.get('sheet')!=='Mots Clés Armes et Armures')return response;const csv=await response.text();return {ok:true,text:async()=>csv.replace('Sur une touche, ajoute le dé des unités du jet d\'attaque aux Dégâts. Inoffensive l\'annule.','Effet nouvelle édition non couvert')};}});assert.equal(result.ok,true,result.status.error);assert.equal(keywordMechanicalStatus('percutante').status,'manual');assert.equal(computeDamage({weaponDamage:4,sl:2,qualities:['percutante']}),null);
 const target={id:'t',hp:20,caracs:{E:0}};const preview=previewResolution({actor,action:{...action,qualities:['percutante']},target,roll:35,baseRevision:0});assert.equal(preview.damage,null);assert.equal(applyResolution(preview,{revision:0,participants:[target]}).status,'manual');
 await refreshReferences({fetchImpl:fetchFixture,storage:null});assert.equal(keywordMechanicalStatus('percutante').status,'covered');assert.equal(getReferenceSnapshot().contentVersion,prior.contentVersion);
});
test('Références — cache contenant objet invalide rejeté avant activation',()=>{
 const invalid=clone(getReferenceSnapshot());invalid.equipment.items[0].ap=-1;assert.throws(()=>createReferenceResolvers(invalid),/PA/);
});

test('Résolution — Inoffensive exige deux gravités, minimum retenu et dés conservés',()=>{
 const target={id:'t',hp:20,caracs:{E:0}};const input={actor,action:{...action,qualities:['inoffensive']},target,roll:33,baseRevision:0,criticalRolls:{location:50,effect:71}};
 const missing=previewResolution(input);assert.equal(missing.critical.details.needsAlternative,true);assert.equal(applyResolution(missing,{revision:0,participants:[target]}).status,'manual');
 const ready=previewResolution({...input,criticalRolls:{...input.criticalRolls,effectAlternative:25}});assert.equal(ready.critical.details.effectRollBase,25);assert.deepEqual(ready.critical.details.effectRollCandidates,[71,25]);assert.equal(ready.critical.details.needsAlternative,false);
});

test('Résolution — munition uniquement arme distance et catégorie compatible',()=>{
 const bow={...item('bow',null,[],'none',[{id:'empaleuse',parameter:''}]),kind:'weapon',category:'Arc',range:'50',damage:'BF+3'};const ammo={...bow,id:'arrow',kind:'ammunition',damage:'+0'};const melee={...bow,id:'sword',category:'Base',range:''};
 assert.equal(ammunitionCompatibility(bow,ammo).status,'compatible');assert.equal(ammunitionCompatibility(melee,ammo).status,'incompatible');
 const sourceActor={...actor,equipment:[bow,ammo,melee]};const link=id=>({...action,extensions:{fiche:{equipmentId:id}}});
 assert.throws(()=>previewResolution({actor:sourceActor,action:link('sword'),roll:35,ammunitionId:'arrow'}),error=>error.code==='AMMUNITION_INCOMPATIBLE');
 const valid=previewResolution({actor:sourceActor,action:link('bow'),roll:35,ammunitionId:'arrow'});assert.equal(valid.input.ammunitionSources.length,2);assert.equal(valid.input.action.qualities.length,1);
});

test('Références — provenance des fonctions partagées vérifiée par empreinte source',async()=>{
 const pack=getReferenceSnapshot();for(const path of ['js/fiche/equipment.js','js/fiche/skill-names.js','js/fiche/basic-skills.js','js/catalogue/skill-resolver.js','js/catalogue/talent-resolver.js','js/catalogue/talent-source.js']){const bytes=await readFile(new URL('../js/data/shared/'+path.slice(3),import.meta.url),'utf8');assert.equal(createHash('sha256').update(bytes).digest('hex'),pack.sourceFiles[path].sha256,path);}
});

test('Résolution — source arc impose tir malgré contexte absent ou faux, petit bouclier refusé',()=>{
 const bow={...item('bow',null,[],'none'),kind:'weapon',category:'Arc',range:'50'};
 const shield={...item('shield',1,[],'none',[{id:'protectrice',parameter:'1'}]),kind:'shield'};
 const sourceActor={...actor,equipment:[bow]},target={id:'t',hp:20,caracs:{E:0},equipment:[shield]};
 const input={actor:sourceActor,action:{...action,extensions:{fiche:{equipmentId:'bow'}}},target,roll:35,baseRevision:0,defense:{roll:85,base:20},protectionContext:{shieldId:'shield',shieldAvailable:true,opposedWithShield:true,lineOfSight:true}};
 for(const ranged of [undefined,false]){const preview=previewResolution({...input,protectionContext:{...input.protectionContext,ranged}});assert.equal(preview.input.attackContext.ranged,true);assert.equal(preview.protection.ap,null);assert.equal(preview.protection.shieldAp,0);assert.ok(preview.protection.manual.includes('bouclier-projectile-contexte-requis'));assert.equal(applyResolution(preview,{revision:0,participants:[target]}).status,'manual');}
});
test('Résolution — bouclier exige vraie opposition et type legacy confirmé',()=>{
 const sword={...item('sword',null,[],'none'),kind:'weapon',category:'Base',range:''};
 const shield={...item('shield',2,[],'none',[{id:'protectrice',parameter:'2'}]),kind:'shield'};
 const target={id:'t',hp:20,caracs:{E:0},equipment:[shield]},context={shieldId:'shield',shieldAvailable:true,opposedWithShield:true};
 const input={actor:{...actor,equipment:[sword]},action:{...action,extensions:{fiche:{equipmentId:'sword'}}},target,roll:35,baseRevision:0,protectionContext:{...context,defenseProvided:true}};
 const absent=previewResolution(input);assert.equal(absent.protection.ap,null);assert.ok(absent.protection.manual.includes('jet-opposition-requis:bouclier'));assert.equal(absent.protection.shieldAp,0);
 const valid=previewResolution({...input,defense:{roll:85,base:20}});assert.equal(valid.protection.ap,2);assert.equal(valid.input.attackContext.ranged,false);
 const legacy=previewResolution({actor,action,target,roll:35,baseRevision:0,defense:{roll:85,base:20},protectionContext:context});assert.equal(legacy.protection.ap,null);assert.ok(legacy.protection.manual.includes('type-attaque-requis:bouclier'));
 const confirmed=previewResolution({actor,action,target,roll:35,baseRevision:0,defense:{roll:85,base:20},protectionContext:{...context,ranged:false}});assert.equal(confirmed.protection.ap,2);
});
