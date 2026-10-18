import {sameSharedState} from '../js/core/sync-protocol.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createStore} from '../js/core/store.js';
import {previewCasting} from '../js/core/v5-magic-casting.js';
import {previewChannelling} from '../js/core/v5-magic-channelling.js';
import {magicTalentRank} from '../js/core/v5-magic-talents.js';
import {getSpellContract,previewSpellExecution} from '../js/core/v5-spell-contracts.js';
const talent=(id,rank=1,specialization)=>({id:'talent-'+id,status:'resolved',rank,...(specialization?{specialization}:{})});
const wizard=(id='mage',extra={})=>({id,name:id,kind:'PJ',camp:'pj',hp:30,maxHp:30,fortune:2,zone:'active',init:50,caracs:{CC:40,CT:40,F:30,E:30,Int:60,FM:50,Ag:40,I:40,Dex:40,Soc:40,M:4},skills:[{name:'Langue (Magick)',total:60},{name:'Focalisation',total:60},{name:'Focalisation (Haute Magie)',total:60},{name:'Savoir (Magie)',total:60},{name:'Prière',total:50}],talents:[],states:[],equipment:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{hasMomentum:true}},...extra});
async function combat(...people){const store=createStore();await store.ready;await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:people[0].id,order:people.map(p=>p.id),participants:people},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});return store;}
const person=(store,id)=>store.listParticipants().find(p=>p.id===id);

test('Sans ingrédients : un ancien flag conserve l’incident et ses États réels, Undo exact',async()=>{
 const store=await combat(wizard(),wizard('enemy',{camp:'ennemi'}));
 await store.applySpellExecution('Carreau',{actorId:'mage',targetIds:['enemy'],roll:77,miscastRoll:50,ingredient:true});
 assert.equal(person(store,'enemy').hp,30);assert.ok(person(store,'mage').states.some(s=>s.key==='hemorragique'));await store.undo();assert.deepEqual(person(store,'mage').states,[]);
});
test('Talents canoniques : Diction, Harmonisation et Bénédiction nécessitent une acquisition résolue',()=>{
 const base=wizard();assert.equal(magicTalentRank({...base,talents:[{name:'Diction instinctive'}]},'instinctive-diction'),0);
 const w={...base,talents:[talent('instinctive-diction'),talent('aethyric-attunement'),talent('lileath-s-blessing',2)]};
 const p=previewChannelling(w,{type:'high',roll:25});assert.equal(p.gain,11);
 const spell=getSpellContract('Carreau');const missing=previewCasting(w,spell,{roll:77,miscastRoll:50});assert.equal(missing.ready,false);
 const chosen=previewCasting(w,spell,{roll:77,miscastRoll:50,miscastRoll2:15,miscastChoice:'second',instinctiveDiction:true});assert.equal(chosen.ready,true);assert.equal(chosen.miscast,null);
 assert.equal(previewCasting(base,spell,{roll:77,miscastRoll:15,instinctiveDiction:true}).miscast.name,'Distraction');
});
test('Assistant animal inverse facultativement ; Assistant magique donne +2 DR sans Avantage supplémentaire',()=>{
 const w=wizard(),animal=wizard('animal',{talents:[talent('animal-assistant')]}),magic=wizard('familiar',{talents:[talent('magical-assistant'),talent('animal-assistant')]});
 const a=previewChannelling(w,{roll:61,assistant:animal,assistantLinked:true,choice:'reverse'});assert.equal(a.test.roll,16);assert.equal(a.success,true);
 const b=previewChannelling(w,{roll:25,assistant:magic,assistantLinked:true});assert.equal(b.gain,11);assert.equal(b.test.advantage.net,0);
});
test('HEPG p. 84 — une rune Cadai est refusée sur Carreau, hors Haute Magie, sans débit du stock',async()=>{
 const store=await combat(wizard(),wizard('enemy',{camp:'ennemi'}));await store.deployCadaiRune({actorId:'mage',roll:25,conditionsConfirmed:true});assert.equal(store.getCadaiRunes('mage').deployed,1);
 assert.throws(()=>store.previewCasting({name:'Carreau',cn:0,type:'petty'},{actorId:'mage',roll:25,useCadaiRune:true,cadaiRoll:85}),/Haute Magie/);
 const input={actorId:'mage',targetIds:['enemy'],roll:25,useCadaiRune:true,cadaiAccessible:true,cadaiPurpose:'test',cadaiRoll:85};
 assert.throws(()=>store.previewSpellExecution('Carreau',input),/Haute Magie/);
 await assert.rejects(async()=>store.applySpellExecution('Carreau',input),/Haute Magie/);
 assert.equal(store.getCadaiRunes('mage').deployed,1);assert.equal(person(store,'enemy').hp,30);
});
test('Haute Magie : épuisement obligatoire, nouveau lancer bloqué puis récupération payée',async()=>{
 const actor=wizard('mage',{caracs:{...wizard().caracs,FM:10,Int:100},extensions:{v5:{channelling:{type:'high',sl:30}}}});const store=await combat(actor,wizard('enemy',{camp:'ennemi'}));
 const input={actorId:'mage',targetIds:['enemy'],roll:25,arcaneOptions:{enhancedDamage:true},arcaneTargets:{enemy:{magicItemPresent:false}}};
 assert.equal(store.previewSpellExecution('Destruction des Arcanes',input).status,'burnout-roll-required');
 await store.applySpellExecution('Destruction des Arcanes',{...input,burnoutRoll:5});assert.equal(person(store,'mage').extensions.v5.burnout.active,true);
 assert.throws(()=>store.previewChannelling({actorId:'mage',roll:25}),/Épuisement/);
 // S-11 : sans compteur de Chance initialisé, l'épuisement ne se lève pas (aucun repli sur participant.fortune).
 assert.equal(store.previewBurnoutRecovery({actorId:'mage'}).possible,false);
 await store.setFortune('mage',1);
 await store.applyBurnoutRecovery(store.previewBurnoutRecovery({actorId:'mage'}),{actorId:'mage'});assert.equal(person(store,'mage').extensions.v5.burnout,null);assert.equal(store.getFortune('mage').balance,0);
});
test('Réaction : réserve consommée, effets bloqués, quota par Round et Undo atomique',async()=>{
 const store=await combat(wizard('mage',{extensions:{v5:{channelling:{type:'winds',sl:4}}}}),wizard('enemy',{camp:'ennemi',skills:[{name:'Langue (Magick)',total:100}]}));
 const input={actorId:'mage',targetIds:['enemy'],roll:25,dispelReaction:{dispellerId:'enemy',roll:10,distance:10,visible:true}};
 const p=store.previewSpellExecution('Carreau',input);assert.equal(p.dispelReaction.dispelled,true,p.error);
 await store.applySpellExecution('Carreau',input);assert.equal(person(store,'enemy').hp,30);assert.equal(person(store,'enemy').extensions.v5.dispelReactionRound,1);assert.equal(person(store,'mage').extensions.v5.channelling.sl,0);
 assert.equal(store.previewSpellExecution('Carreau',input).ready,false);await store.undo();assert.equal(person(store,'enemy').extensions.v5.dispelReactionRound,undefined);assert.equal(person(store,'mage').extensions.v5.channelling.sl,4);
});
test('Dissipation persistante : progression par dissipateur, retrait de toutes les couches du même lancer, restauration',async()=>{
 const store=await combat(wizard(),wizard('ally'));
 for(const id of ['mage','ally'])await store.applySpellEffects(id,{id:'buff-'+id,spellName:'Recette',spellId:'recette',casterId:'mage',cn:8,castExecutionId:'cast-1',duration:'10 Rounds',statModifiers:{Ag:20},ward:8});
 let effect=person(store,'ally').extensions.v5.spellEffects[0];let p=store.previewDispelPersistent(effect,{dispellerId:'mage',roll:25,distance:5,visible:true});assert.equal(p.earnedSl,5);assert.equal(p.dispelled,false);await store.applyDispelPersistent(p);
 effect=person(store,'ally').extensions.v5.spellEffects[0];p=store.previewDispelPersistent(effect,{dispellerId:'mage',roll:25,distance:5,visible:true});assert.equal(p.dispelled,true);await store.applyDispelPersistent(p);
 assert.equal(person(store,'ally').caracs.Ag,40);assert.equal(person(store,'mage').caracs.Ag,40);await store.undo();assert.equal(person(store,'ally').caracs.Ag,60);assert.equal(person(store,'ally').extensions.v5.spellEffects[0].progressByDispeller.mage,5);
});
test('Attribut choisi : Vie enlève les États, Cieux expire au prochain Tour',async()=>{
 const store=await combat(wizard('mage',{extensions:{v5:{channelling:{type:'high',sl:30}}}}),wizard('ally',{states:[{key:'hemorragique',name:'Hémorragique',level:2},{key:'extenue',name:'Exténué',level:1}]}));
 await store.applySpellExecution('Bouclier de Saphery',{actorId:'mage',targetIds:['ally'],roll:25,chosenLore:'life'});assert.deepEqual(person(store,'ally').states,[]);await store.undo();
 await store.applySpellExecution('Bouclier de Saphery',{actorId:'mage',targetIds:['ally'],roll:25,chosenLore:'heavens'});assert.equal(store.getFortune('mage').temporary,1);await store.nextTurn();assert.equal(store.getFortune('mage').temporary,1);await store.nextTurn();assert.equal(store.getFortune('mage').temporary,0);
});
test('Bonus de caractéristique temporaire et bonus de Test modifient effectivement la prochaine Focalisation',async()=>{
 const store=await combat(wizard());await store.applySpellEffects('mage',{spellId:'buff',duration:'10 Rounds',statModifiers:{FM:20},testModifiers:{Focalisation:2}});
 const p=store.previewChannelling({actorId:'mage',roll:25});assert.equal(p.test.score,80);assert.equal(p.sl,8);await store.expireSpellEffects('mage',{spellId:'buff'});assert.equal(store.previewChannelling({actorId:'mage',roll:25}).sl,4);
});
test('Mage de guerre : coût Élan, NI ≤ 5 et verrou jusqu’au prochain Tour',async()=>{
 const store=await combat(wizard('mage',{talents:[talent('war-wizard')]}),wizard('enemy',{camp:'ennemi'}));await store.applySpellExecution('Carreau',{actorId:'mage',targetIds:['enemy'],roll:25,warWizard:true});assert.equal(person(store,'mage').extensions.v5.hasMomentum,false);assert.throws(()=>store.previewChannelling({actorId:'mage',roll:25}),/Mage de guerre/);await store.nextTurn();await store.nextTurn();assert.equal(store.previewChannelling({actorId:'mage',roll:25}).ready,true);
});

test('Lileath : une seule couche Main de Gloire, cumul plafonné des Tests et PA, dissipation groupée',async()=>{
 const store=await combat(wizard('mage',{talents:[talent('lileath-s-blessing',1)],extensions:{v5:{channelling:{type:'high',sl:20}}}}));
 await store.applySpellExecution('Main de Gloire',{actorId:'mage',targetIds:['mage'],roll:25,tier:'overcast6',chosenStats:['CC','CT','Ag','I'],roll3d10:15,overcastChoices:{special:6},burnoutRoll:50});
 assert.equal(person(store,'mage').caracs.CC,55);assert.equal(person(store,'mage').extensions.v5.spellEffects.filter(e=>e.spellName==='Main de Gloire').length,1);
 const effect=person(store,'mage').extensions.v5.spellEffects[0];assert.equal(effect.cn,getSpellContract('Main de Gloire').cn);assert.ok(effect.castExecutionId);await store.applyDispelPersistent(store.previewDispelPersistent(effect,{dispellerId:'mage',roll:25,distance:5,visible:true}));assert.equal(person(store,'mage').caracs.CC,40);
 for(const [id,n] of [['a',2],['b',1],['c',1]])await store.applySpellEffects('mage',{id,spellId:id,casterId:'mage',duration:'10 Rounds',testModifiers:{Focalisation:n},apModifiers:{all:n}});
 assert.equal(person(store,'mage').extensions.v5.testModifiers.Focalisation,3);assert.equal(person(store,'mage').armor.head,3);
 await store.expireSpellEffects('mage',{spellId:'a'});assert.equal(person(store,'mage').armor.head,2);
});
test('Les pénalités d’incident agissent puis expirent ; un dé secondaire saisi est conservé',async()=>{
 const store=await combat(wizard());const p=store.previewMiscast({actorId:'mage',severity:'MINOR',roll:62,secondaryRolls:{duration1d10:2}});assert.equal(p.details.duration.value,2);await store.applyMiscast(p,{actorId:'mage'});
 assert.equal(store.previewChannelling({actorId:'mage',roll:25}).sl,2);await store.advanceTalentMinutes(119);assert.equal(store.previewChannelling({actorId:'mage',roll:25}).sl,2);await store.advanceTalentMinutes(1);assert.equal(store.previewChannelling({actorId:'mage',roll:25}).sl,4);await store.undo();assert.equal(store.previewChannelling({actorId:'mage',roll:25}).sl,2);
});
test('Lumière : les Blessures directes d’attribut ignorent la Protection (D-14), qui n’annule que les dégâts du projectile (D-13)',async()=>{
 const store=await combat(wizard('mage',{extensions:{v5:{channelling:{type:'high',sl:25}}}}),wizard('undead',{camp:'ennemi',traits:['Mort-vivant'],extensions:{v5:{ward:7}}}));
 const input={actorId:'mage',targetIds:['undead'],roll:25,chosenLore:'light',targetTests:{undead:{wardRoll:8}}};
 const p=store.previewSpellExecution('Extinction de l’Âme',input);assert.equal(p.ready,true,p.error);assert.equal(p.targetResults[0].loreDirectWounds,6);assert.equal(p.targetResults[0].magicProtection.wardSaved,true);assert.equal(p.targetResults[0].woundsLost,6);await store.applySpellExecution('Extinction de l’Âme',input);assert.equal(person(store,'undead').hp,24);assert.ok(person(store,'undead').states.some(s=>/aveugl/i.test(s.key||s.name)));
});
test('Défiance : chaque cible choisit ses dés ; paiement, aventure et Undo sont durables',async()=>{
 const store=await combat(wizard(),wizard('ally',{talents:[talent('magic-defiance')]}),wizard('enemy',{camp:'ennemi'}));await store.setFortune('ally',2);await store.startMagicAdventure();
 const input={actorId:'mage',targetIds:['ally'],roll:25,magicDefianceTargets:['ally']};
 await store.applySpellExecution('Carreau',input);assert.equal(person(store,'ally').hp,30);assert.equal(store.getFortune('ally').balance,1);assert.equal(store.previewSpellExecution('Carreau',input).ready,false);await store.undo();assert.equal(store.getFortune('ally').balance,2);assert.equal(store.previewSpellExecution('Carreau',input).ready,true);
 await store.applySpellExecution('Carreau',input);await store.startMagicAdventure();assert.equal(store.previewSpellExecution('Carreau',input).ready,true);
});
test('Épuisement : récupération débite le registre permanent et Undo rembourse',async()=>{
 const store=await combat(wizard('mage',{extensions:{v5:{burnout:{active:true,permanent:false,days:2}}}}));await store.setFortune('mage',2);await store.applyBurnoutRecovery(store.previewBurnoutRecovery({actorId:'mage'}),{actorId:'mage'});assert.equal(store.getFortune('mage').balance,1);await store.undo();assert.equal(store.getFortune('mage').balance,2);assert.equal(person(store,'mage').extensions.v5.burnout.active,true);await store.advanceTalentMinutes(2880);assert.equal(person(store,'mage').extensions.v5.burnout,null);
});
test('Une méditation protège réellement puis expire sans retirer une immunité encore active',async()=>{
 const store=await combat(wizard('mage',{talents:[talent('mind-over-body',2)]}));await store.applyMagicMeditation({actorId:'mage',talentId:'talent-mind-over-body',name:'L’esprit sur le corps',minutes:20,roll:45,durationRolls:[1,1]});await store.applySpellEffects('mage',{spellId:'blind',duration:'1 Round',conditions:['Aveuglé']});assert.deepEqual(person(store,'mage').states,[]);await store.advanceTalentMinutes(120);await store.applySpellEffects('mage',{spellId:'blind-2',duration:'1 Round',conditions:['Aveuglé']});assert.ok(person(store,'mage').states.some(s=>s.key==='aveugle'));
});
test('Une arme renforcée et une Protection agissent dans la résolution normale du combat',async()=>{
 const store=await combat(wizard(),wizard('enemy',{camp:'ennemi'}));const input={actorId:'mage',targetId:'enemy',action:{type:'attack',attr:'CC',base:40,damageFormula:'BF+4',qualities:[]},roll:25,defense:{base:40,roll:85,v5:{kind:'melee',choice:'keep'}},v5:{kind:'melee',choice:'keep'}};
 const before=store.previewResolution(input);await store.applySpellEffects('mage',{spellId:'weapon',duration:'2 Rounds',weaponBonus:{damage:3}});assert.equal(store.previewResolution(input).damage.finalDamage,before.damage.finalDamage+3);
 await store.applySpellEffects('enemy',{spellId:'ward',duration:'2 Rounds',ward:7});const missing=store.previewResolution(input);assert.ok(missing.unresolved.some(x=>x.includes('d10')));
 const saved=store.previewResolution({...input,v5:{kind:'melee',choice:'keep',context:{magicWardRoll:8}}});assert.equal(saved.damage.finalDamage,0);assert.equal(saved.critical,null);await store.applyResolution(saved);assert.equal(person(store,'enemy').hp,30);await store.undo();assert.equal(person(store,'enemy').hp,30);
});
test('La Fortune est Capricieuse impose une maladresse sur un double réussi et interdit Diction',async()=>{
 const actor=wizard('mage',{talents:[talent('instinctive-diction')],extensions:{v5:{specialStates:{forceFumbleOnDoubles:true,forbidCrits:true,forbidMitigation:true}}}});
 const p=previewCasting(actor,getSpellContract('Carreau'),{roll:11,miscastRoll:15,instinctiveDiction:true});assert.equal(p.spellSuccess,false);assert.equal(p.fumble,true);assert.equal(p.miscast.name,'Distraction');
});

test('Contemplation rang 3 : Fortune payée une fois, pénalité critique ignorée, expiration et Undo',async()=>{
 const store=await combat(wizard('mage',{talents:[talent('mind-over-body',3)]}));await store.setFortune('mage',2);await store.applyMagicMeditation({actorId:'mage',talentId:'talent-mind-over-body',name:'L’esprit sur le corps',minutes:20,roll:45,durationRolls:[1,1]});
 const raw={actorId:'mage',action:{type:'skill',attr:'CC',base:40},roll:25,v5:{kind:'test',context:{extendedTest:true,magicCriticalPenalty:-2}}};const before=store.previewResolution(raw).test.sl;
 await store.activateMindOverBody('mage');assert.equal(store.getFortune('mage').balance,1);assert.equal(store.previewResolution(raw).test.sl,before+2);assert.throws(()=>store.activateMindOverBody('mage'),/déjà ignorées/);await store.undo();assert.equal(store.getFortune('mage').balance,2);assert.equal(store.previewResolution(raw).test.sl,before);await store.activateMindOverBody('mage');await store.advanceTalentMinutes(120);assert.equal(person(store,'mage').extensions.v5.spellEffects.some(e=>e.ignoreCriticalPenalties),false);
});
test('Sanctuaire rang 3 : seule la pénalité Yenlui désignée est supprimée',async()=>{
 const store=await combat(wizard('mage',{talents:[talent('sanctuary-of-the-mind',3)]}));await store.applyMagicMeditation({actorId:'mage',talentId:'talent-sanctuary-of-the-mind',name:'Sanctuaire de l’esprit',minutes:20,roll:45,durationRolls:[1,1]});
 const p=store.previewCasting(getSpellContract('Carreau'),{actorId:'mage',roll:25,yenluiPenalty:-3,slModifiers:[{id:'other',amount:-1}]});assert.equal(p.test.sl,3);await store.advanceTalentMinutes(120);assert.equal(store.previewCasting(getSpellContract('Carreau'),{actorId:'mage',roll:25,yenluiPenalty:-3,slModifiers:[{id:'other',amount:-1}]}).test.sl,0);
});

test('Synchronisation : seuls les alias magiques exactement redondants sont ignorés',()=>{
 const canonical={schemaVersion:3,combat:{participants:[{id:'mage',extensions:{v5:{channelling:{type:'winds',sl:9},spellEffects:[{id:'buff'}],fortune:3}}}]}};
 const projected=structuredClone(canonical),p=projected.combat.participants[0];p.channelling={type:'winds',sl:9};p.channellingReserve={type:'winds',sl:9};p.spellEffects=[{id:'buff'}];p.fortune=3;
 assert.equal(sameSharedState(canonical,projected),true);p.extensions.spellEffects=[{id:'buff'}];p.extensions.channelling={type:'winds',sl:9};assert.equal(sameSharedState(canonical,projected),true,'D7 : miroir exact dans extensions redondant');p.extensions.spellEffects=[{id:'different'}];assert.equal(sameSharedState(canonical,projected),false,'miroir divergent = conflit réel');p.extensions.spellEffects=[{id:'buff'}];p.channelling.sl=10;assert.equal(sameSharedState(canonical,projected),false);
});

test('Forme bestiale : dégâts conservés, couches et forme retirées par dissipation groupée',async()=>{
 const store=await combat(wizard('mage',{extensions:{v5:{channelling:{type:'winds',sl:20}}}}));await store.applySpellExecution('Forme bestiale',{actorId:'mage',targetIds:['mage'],roll:25,beastKey:'wolf',attributeActive:false});assert.equal(person(store,'mage').caracs.M,9);
 await store.updateParticipant('mage',{hp:9});const effect=person(store,'mage').extensions.v5.spellEffects.find(e=>e.beastFormMarker);assert.ok(effect);assert.equal(effect.casterId,'mage');
 // A second caster dissipates while the transformed caster cannot speak.
 const dispeller=wizard('dispel');await store.addProfile(dispeller);const full=JSON.parse(store.getFullJSON());full.combat.participants.push(dispeller);full.combat.order.push(dispeller.id);await store.loadFromJSON(full);
 const p=store.previewDispelPersistent(effect,{dispellerId:'dispel',roll:10,distance:5,visible:true});assert.equal(p.dispelled,true);await store.applyDispelPersistent(p);/* LOT3_CADRAGE_MAGIE, Forme bestiale (révisé le 11 octobre) : Blessures du Loup recalculées (BF 3 + 2×BE 3 + BFM 5 = 14) ; 14 − 9 = 5 dégâts conservés, 30 − 5 = 25. */assert.equal(person(store,'mage').hp,25);assert.equal(person(store,'mage').maxHp,30);assert.equal(person(store,'mage').caracs.M,4);assert.equal(person(store,'mage').extensions.v5.beastForm,undefined);
});

test('Rune Cadai pour Corruption : nouveau dé explicite, stock perdu même sur échec et Undo',async()=>{
 const store=await combat(wizard());await store.deployCadaiRune({actorId:'mage',roll:25,conditionsConfirmed:true});await store.applySpellExecution('Apothéose',{actorId:'mage',targetIds:['mage'],roll:25,operationId:'high-1'});await store.rerollCorruptionWithCadai({actorId:'mage',castExecutionId:'high-1',accessible:true,firstRoll:85,reroll:95,slModifier:-2});assert.equal(store.getCadaiRunes('mage').deployed,0);assert.equal(person(store,'mage').extensions.v5.lastCadaiCorruption.test.success,false);assert.equal(person(store,'mage').extensions.v5.lastCadaiCorruption.firstRoll,85);await store.undo();assert.equal(store.getCadaiRunes('mage').deployed,1);
});
test('Perception magique : portée et direction enregistrées sans identifier la magie',async()=>{
 const store=await combat(wizard(),wizard('observer',{talents:[talent('magical-sense')]}));await store.applySpellExecution('Carreau',{actorId:'mage',targetIds:['observer'],roll:25,senseFacts:{observer:{distance:10,direction:'à l’est'}}});assert.ok(JSON.parse(store.getFullJSON()).log.some(entry=>/observer détecte un lancement.*à l’est.*non identifiée/.test(entry.text)));
});

test('Caractéristique actuelle : aucun double bonus sans compétence totale ou en défense',async()=>{
 const actor=wizard('mage',{skills:[{name:'Focalisation',total:60},{name:'Langue (Magick)',advances:5}]});const store=await combat(actor,wizard('enemy',{camp:'ennemi'}));await store.applySpellEffects('mage',{spellId:'buff',duration:'2 Rounds',statModifiers:{FM:20,Int:20,Ag:20}});
 assert.equal(store.previewChannelling({actorId:'mage',type:'high',roll:25}).score,70);assert.equal(store.previewChannelling({actorId:'mage',type:'high',roll:25}).gain,12);assert.equal(store.previewChannelling({actorId:'mage',roll:25}).score,80);
 assert.equal(store.previewCasting({name:'Carreau',cn:0,type:'petty'},{actorId:'mage',roll:25}).score,85);
 const p=store.previewResolution({actorId:'enemy',targetId:'mage',action:{type:'attack',attr:'CC',base:40,damageFormula:'BF+4',qualities:[]},roll:25,defense:{base:60,attr:'Ag',roll:25,label:'Ag',extensions:{v5:{scoreIsCurrent:true}},v5:{kind:'test',choice:'keep'}},v5:{kind:'melee',choice:'keep'}});assert.equal(p.opposition.defender.score,60);
});
