// Q6 CA1 : mêmes personnages et circonstances, Test du plateau contre chemin secondaire réel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCombatTest } from '../../../js/core/v5-combat-rules.js';
import { previewMountedSecondaryTest } from '../../../js/core/resolution.js';
import { resolveV5PursuitStep } from '../../../js/core/v5-broken-escape.js';
import { previewSupplementalEquipment } from '../../../js/core/v5-supplemental-equipment.js';
import { resoluteException } from '../../../js/core/v5-talent-replacements.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { withEngagement, previewDisengage } from '../../../js/core/engagements.js';
import { prepareMagicOptions } from '../../../js/core/v5-magic-talents.js';
import { roundSpellEffects } from '../../../js/core/v5-magic-turn.js';
import { previewDivineExecution } from '../../../js/core/v5-divine-engine.js';
import { getDivineContract } from '../../../js/core/v5-divine-store.js';
import registry from '../../../js/data/v5-divine-contracts.json' with { type:'json' };
import { encounter } from '../../helpers/lot3-domain-fixture.js';
import { input, contractFor } from '../../helpers/lot3-wom-fixture.js';

const context = { preRollTalent: 'strong-minded' };
const subject = () => ({ id:'hero', name:'Héros', kind:'PJ', camp:'pj', zone:'active', size:'average', hp:10, maxHp:10,
  caracs:{ CC:40, CT:40, F:40, E:40, I:40, Ag:40, Dex:40, Int:40, FM:40, Soc:40, M:4 },
  states:[{ key:'sonne', name:'Sonné', level:1 }],
  talents:[{ id:'talent-strong-minded', status:'resolved', rank:1 }], skills:[], equipment:[], traits:[], armor:{},
  extensions:{ v5:{ spellEffects:[{ id:'s', spellId:'s', spellName:'Sort', casterId:'mage', testModifiers:{ 'Tous les Tests':1 } }] } } });
function pivot(actor, skill, attr, extraContext = {}) {
  const out = buildCombatTest({ actor, target:null, roll:30,
    action:{ type:'test', label:skill, attr, base:50, qualities:[] },
    v5:{ kind:'test', context:{ ...context, ...extraContext } }, v5State:{ participants:[actor] }, combatPrelude:{}, weaponSkillUnresolved:[], protectionContext:{} });
  return out.test.options[0].result;
}
function assertWitnesses(actor, skill, attr, extraContext = {}, secondary) {
  const noTalent=structuredClone(actor); noTalent.talents=noTalent.talents.filter(t=>t.id!=='talent-strong-minded');
  const noSpell=structuredClone(actor); noSpell.extensions.v5.spellEffects=[];
  assert.equal(pivot(noTalent,skill,attr,extraContext).sl,2, 'sans Obstiné, Sonné retire 1 DR');
  assert.equal(pivot(noSpell,skill,attr,extraContext).sl,2, 'sans le sort, son +1 DR disparaît');
  assert.equal(secondary(noTalent),2, 'le chemin secondaire applique Sonné sans Obstiné');
  assert.equal(secondary(noSpell),2, 'le chemin secondaire retire le bonus quand le sort est absent');
}

test('CA1 F1 : désengagement et Test d’Esquive du plateau', () => {
  const actor=subject(), other={ ...subject(), id:'orc', camp:'ennemi', states:[], talents:[], extensions:{v5:{}}, skills:[{name:'Corps à corps (Base)',total:50}] };
  const participants=[actor,other], combat=withEngagement({round:1,participants},actor.id,other.id,1);
  actor.caracs.Ag=50;
  const primary=pivot(actor,'Esquive','Ag',{ involvesMovement:true });
  const secondary=previewDisengage({participants,combat,actorId:actor.id,input:{actorRoll:30,opponentRoll:30,context}});
  assert.equal(secondary.status,'ready');
  assert.equal(secondary.actorSl,primary.sl);
  assert.equal(primary.sl,3);
  assertWitnesses(actor,'Esquive','Ag',{ involvesMovement:true },who=>{
    const people=[who,other], field=withEngagement({round:1,participants:people},who.id,other.id,1);
    return previewDisengage({participants:people,combat:field,actorId:who.id,input:{actorRoll:30,opponentRoll:30,context}}).actorSl;
  });
});

test('CA1 F2 : Chevaucher de désarçonnement et Test de compétence du plateau', () => {
  const actor=subject(), primary=pivot(actor,'Chevaucher','Ag',{ reliesOnSight:true });
  const secondary=previewMountedSecondaryTest(actor,{ score:50, roll:30, stat:'Ag', skill:'Chevaucher', context });
  assert.equal(secondary.ready,true);
  assert.equal(secondary.test.sl,primary.sl);
  assert.equal(primary.sl,3, 'Obstiné annule Sonné, le sort apporte +1 DR');
  assertWitnesses(actor,'Chevaucher','Ag',{ reliesOnSight:true },who=>previewMountedSecondaryTest(who,{score:50,roll:30,stat:'Ag',skill:'Chevaucher',context}).test.sl);
});

test('CA1 F3 : poursuite et Test d’Athlétisme du plateau', () => {
  const actor=subject(); actor.skills=[{ id:'ath', name:'Athlétisme', carac:'Ag', status:'resolved', total:50 }];
  const primary=pivot(actor,'Athlétisme','Ag',{ involvesMovement:true, runningOrHiding:true });
  const other={ ...subject(), id:'other', states:[], talents:[], extensions:{v5:{}}, skills:actor.skills };
  const secondary=resolveV5PursuitStep({ quarry:actor, pursuer:other, initialDistance:5, quarryRoll:30, pursuerRoll:30, quarryContext:context });
  assert.equal(secondary.ready,true,secondary.error);
  assert.equal(secondary.quarryTest.sl,primary.sl);
  assert.equal(primary.sl,3);
  assertWitnesses(actor,'Athlétisme','Ag',{ involvesMovement:true, runningOrHiding:true },who=>resolveV5PursuitStep({quarry:who,pursuer:other,initialDistance:5,quarryRoll:30,pursuerRoll:30,quarryContext:context}).quarryTest.sl);
});

test('CA1 F7 : résistance à la Warp Blade et Test de Résistance du plateau', () => {
  const actor=subject(), primary=pivot(actor,'Résistance','E');
  const secondary=previewSupplementalEquipment({ item:{id:'w',name:'Warp Blade'}, actor:{id:'attacker',states:[]}, target:actor,
    hit:true, melee:true, damage:{finalDamage:2}, context:{warpBladeEnduranceTest:{score:50,roll:30,conditionContext:context}} });
  assert.ok(secondary.enduranceTest, JSON.stringify(secondary.unresolved));
  assert.equal(secondary.enduranceTest.sl,primary.sl+2, 'la difficulté propre +2 DR reste en plus');
  assert.equal(primary.sl,3);
  assertWitnesses(actor,'Résistance','E',{},who=>previewSupplementalEquipment({item:{id:'w',name:'Warp Blade'},actor:{id:'attacker',states:[]},target:who,hit:true,melee:true,damage:{finalDamage:2},context:{warpBladeEnduranceTest:{score:50,roll:30,conditionContext:context}}}).enduranceTest.sl-2);
});

test('CA1 F8 : Calme de Déterminé et Test de Calme du plateau', () => {
  const actor=subject(); actor.talents.push({id:'talent-resolute',status:'resolved',rank:1});
  actor.skills=[{id:getReferenceCatalogue().skills.find(s=>s.nom==='Calme').id,status:'resolved',total:50}];
  const primary=pivot(actor,'Calme','FM');
  const secondary=resoluteException({},actor,{context:{tryResolute:true,resoluteRoll:30,resoluteConditionContext:context}},1);
  assert.ok(secondary.test,JSON.stringify(secondary.unresolved));
  assert.equal(secondary.test.sl,primary.sl);
  assert.equal(primary.sl,3);
  assertWitnesses(actor,'Calme','FM',{},who=>resoluteException({},who,{context:{tryResolute:true,resoluteRoll:30,resoluteConditionContext:context}},1).test.sl);
});

test('CA1 F4 : préparation du lancer et Test de Langue (Magick) du plateau', () => {
  const actor=subject(); actor.skills=[{name:'Langue (Magick)',status:'resolved',total:50}];
  const primary=pivot(actor,'Langue (Magick)','Int');
  const prepared=prepareMagicOptions(actor,'casting',{conditionContext:context});
  assert.equal(prepared.slModifiers.reduce((sum,row)=>sum+row.amount,0),primary.details.totalModifier);
  assert.equal(primary.sl,3);
  assertWitnesses(actor,'Langue (Magick)','Int',{},who=>2+prepareMagicOptions(who,'casting',{conditionContext:context}).slModifiers.reduce((sum,row)=>sum+row.amount,0));
});

test('CA1 F5 : Prière et Test de Prière du plateau', () => {
  const actor=subject(); actor.id='priest'; actor.skills=[{name:'Prière',status:'resolved',total:50}];
  actor.talents.push({id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'});
  actor.extensions.v5.divine={sin:0};
  const primary=pivot(actor,'Prière','Soc');
  const out=previewDivineExecution(actor,getDivineContract('divine:blessing:myrmidia:battle'),[actor],{
    canSpeak:true,sourceFingerprint:registry.sourceFingerprint,round:1,targetIds:['priest'],facts:{targets:{priest:{withinRange:true}}},
    roll:30,expiry:{phase:'endOfRound',round:6},conditionContext:context });
  assert.equal(out.ready,true,out.error);
  assert.equal(out.preview.slModifiers.reduce((sum,row)=>sum+row.amount,0),primary.details.totalModifier);
  assert.equal(primary.sl,3);
  assertWitnesses(actor,'Prière','Soc',{},who=>2+previewDivineExecution(who,getDivineContract('divine:blessing:myrmidia:battle'),[who],{canSpeak:true,sourceFingerprint:registry.sourceFingerprint,round:1,targetIds:['priest'],facts:{targets:{priest:{withinRange:true}}},roll:30,expiry:{phase:'endOfRound',round:6},conditionContext:context}).preview.slModifiers.reduce((sum,row)=>sum+row.amount,0));
});

test('CA1 F6 : Test de Calme d’un sort au fil des tours et Test du plateau', () => {
  const actor=subject(), primary=pivot(actor,'Calme','FM');
  const run=who=>{
    const target=structuredClone(who); target.skills=[{name:'Calme',status:'resolved',total:50}];
    target.extensions.v5.spellEffects.push({id:'round',spellId:'round',spellName:'Sort de tour',casterId:'caster',appliedAtRound:1,expiresAtRound:9,roundEffect:{phase:'endOfRound',test:{skill:'Calme',stat:'FM',modifierSl:0}}});
    const caster={...subject(),id:'caster',states:[],talents:[],extensions:{v5:{}}};
    const result=roundSpellEffects([caster,target],'endOfRound',2,{hero:{'spell:round:roundTest':30,'spell:round:roundTest:preRollTalent':'strong-minded'}});
    assert.deepEqual(result.requests,[]);
    const match=result.logs.find(row=>/Calme .* DR/.test(row.text))?.text.match(/Calme (-?\d+) DR/);
    assert.ok(match,JSON.stringify(result.logs)); return Number(match[1]);
  };
  assert.equal(run(actor),primary.sl);
  assert.equal(primary.sl,3);
  assertWitnesses(actor,'Calme','FM',{},run);
});

test('CA1 F6 : opposition du contrat Perturber la magie et Test de Force Mentale du plateau', async () => {
  const actor=subject(); actor.id='foe'; actor.camp='ennemi'; actor.caracs.FM=50;
  const withoutTalent=structuredClone(actor);withoutTalent.talents=[];
  const withoutSpell=structuredClone(actor);withoutSpell.extensions.v5.spellEffects=[];
  for(const [label,who,expected] of [['avec talent et sort',actor,3],['sans talent',withoutTalent,2],['sans sort',withoutSpell,2]]){
    const {store}=await encounter({foe:who});
    const live=store.listParticipants().find(row=>row.id==='foe');
    const primary=pivot(live,'Force Mentale','FM');
    const spellInput=input('Perturber la magie',{domainFacts:{opposedActorRoll:25},
      targetTests:{foe:{opponentRoll:30,conditionContext:context}}});
    const preview=store.previewSpellExecution(contractFor('Perturber la magie').id,spellInput);
    assert.equal(preview.ready,true,`${label} : ${preview.error}`);
    const secondary=preview.targetResults.find(row=>row.targetId==='foe')?.opposedTest?.targetTest;
    assert.ok(secondary,`${label} : Test opposé de la cible absent`);
    assert.equal(primary.sl,expected,`${label} : pivot`);
    assert.equal(secondary.sl,expected,`${label} : contrat du sort`);
    assert.equal(secondary.details.totalModifier,primary.details.totalModifier,`${label} : modificateurs finaux`);
  }
});
