import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution, applyResolution } from '../../../js/core/resolution.js';
import { conjuredWeaponSkillScore, applyWeaponSkillRules, equipmentAttackContext, ARCANE_WEAPON_PROFILES, weaponSkillGroupInfo } from '../../../js/core/equipment.js';
import { suggestSkill, ficheSnapshot, planProfileSync, applyFicheSync, equipmentActionKey } from '../../../js/core/fiche-sync.js';
import { readFileSync } from 'node:fs';
import { getReferenceCatalogue, aggregateTalents, resolveSkill } from '../../../js/core/reference-catalog.js';
import { createStore } from '../../../js/core/store.js';
import { fixture as arcaneFixture, spellInput, contractFor } from '../../helpers/lot3-arcane-fixture.js';
import { encounter as waaaghEncounter, cast as castSpell, subject as participant } from '../../helpers/lot3-domain-fixture.js';
import { getSpellContract } from '../../../js/core/v5-spell-contracts.js';
import { magicGrantedActions } from '../../../js/core/v5-magic-combat.js';
import divineGearHandlers from '../../../js/core/v5-divine-effects-gear.js';

describe('Compétences des armes (caractérisation)', () => {
const target = { id: 'target', hp: 20, caracs: { E: 30 }, states: [] };
const ficheWeapon = {
  id: 'sword-instance', kind: 'weapon', name: 'Épée de fiche', category: 'Arme de base',
  damage: '4', range: '', keywords: [{ id: 'desequilibree', parameter: '' }]
};

test('F2-C caractérisation — la compétence proposée reste confirmable sur une arme de fiche', () => {
  const skills = [
    { id: 'melee-basic', name: 'Corps à corps (Base)', total: 61, advances: 1, basic: true },
    { id: 'melee-fencing', name: 'Corps à corps (Escrime)', total: 72, advances: 1, basic: false }
  ];
  const weaponAction = { id: 'attack-sword', type: 'attack', note: 'Épée de fiche', base: 61, damage: 4,
    qualities: ['Déséquilibrée'], extensions: { fiche: {
      charId: 'hero', equipmentId: ficheWeapon.id, skillId: 'melee-basic', skillName: 'Corps à corps (Base)'
    } } };
  const actor = { id: 'hero', states: [], skills, equipment: [ficheWeapon] };
  const sourceSnapshot = structuredClone({ actor, target, weaponAction });

  assert.equal(suggestSkill(weaponAction, skills), 'Corps à corps (Base)');
  const preview = previewResolution({ actor, target, action: weaponAction, roll: 40, baseRevision: 0,
    defense: { type: 'defense', label: 'Esquive', base: 45, roll: 50, v5: { kind: 'test' } } });
  assert.equal(preview.score.base, 61, 'le choix confirmé et son seuil fourni alimentent le test');
  assert.equal(preview.score.target, 61);
  assert.deepEqual(preview.input.action.extensions.fiche, weaponAction.extensions.fiche);
  assert.deepEqual(preview.input.action.qualities.map(q => q.id), ['desequilibree']);
  assert.deepEqual({ actor, target, weaponAction }, sourceSnapshot, 'aperçu sans mutation de la fiche, de l’action ou de la cible');

  const applied = applyResolution(preview, { revision: 0, participants: [structuredClone(target)] });
  assert.equal(applied.status, 'applied');
  assert.deepEqual({ actor, target, weaponAction }, sourceSnapshot, 'application sans mutation des entrées source');
});

test('F2-C caractérisation — une arme conjurée conserve son calcul de compétence et ses qualités propres', () => {
  const actor = {
    id: 'mage', caracs: { CC: 38 }, states: [],
    skills: [{ id: 'fencing', name: 'Corps à corps (Escrime)', total: 67 }]
  };
  const profile = { id: 'foil', name: 'Fleuret aethyrique', damage: 3, hands: 1, reach: 'average', qualities: ['rapide', 'empaleuse'] };
  const conjuredScore = conjuredWeaponSkillScore(actor, profile.id);
  assert.equal(conjuredScore, 67);

  const action = { id: 'conjured-foil', type: 'attack', attr: 'CC', note: profile.name, base: conjuredScore,
    damage: profile.damage, qualities: [...profile.qualities, 'magique'], extensions: { v5: {
      weaponHands: profile.hands, weaponReach: profile.reach, magical: true, materialized: true
    } } };
  const snapshot = structuredClone({ actor, target, action, profile });
  const preview = previewResolution({ actor, target, action, roll: 35, baseRevision: 0 });
  assert.equal(preview.score.base, 67);
  assert.equal(preview.score.target, 67);
  assert.deepEqual(preview.input.action.qualities.map(q => q.id), ['rapide', 'empaleuse', 'magique']);
  assert.deepEqual({ actor, target, action, profile }, snapshot, 'le profil conjuré et ses qualités ne sont pas modifiés');
});
});

describe('Compétences des armes (régressions)', () => {
const catalogue = getReferenceCatalogue();
const target = { id: 'target', hp: 20, caracs: { E: 30 }, states: [] };
const fixture = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const itemById = id => structuredClone(catalogue.items.find(row => row.id === id));
const skillByName = name => {
  const ref = catalogue.skills.find(row => row.nom === name);
  assert.ok(ref, `spécialité réelle dans le catalogue : ${name}`);
  return { id: ref.id, name: ref.nom, group: ref.group, specialization: ref.specialization, basic: ref.basic,
    carac: ref.carac || (/^Projectiles/.test(ref.nom) ? 'CT' : 'CC'), total: 62, advances: 2, status: 'resolved' };
};
const actorFor = (item, skills = [], extra = {}) => ({
  id: 'hero', kind: 'PJ', caracs: { CC: 54, CT: 43 },
  extensions: { v5: { baseCaracs: { CC: 54, CT: 43 } } },
  skills, equipment: [item], states: [], ficheSnapshot: { skills, coverage: { skills: 'present' } }, ...extra
});
const actionFor = (item, skill = null, extra = {}) => ({
  id: 'attack-' + item.id, type: 'attack', note: item.name, attr: equipmentAttackContext(item)?.ranged ? 'CT' : 'CC',
  base: skill?.total ?? 54, damage: item.damage ?? 4, qualities: (item.keywords || []).map(row => ({ ...row })),
  extensions: { fiche: { equipmentId: item.id, bindingVersion: 1, ...(skill ? { skillId: skill.id, skillName: skill.name } : {}) }, equipment: item, v5: { kind: 'test' }, ...extra.extensions }
});
const preview = (item, skills, { context = {}, slModifier = 0, action = actionFor(item, skills[0]), actorExtra = {}, targetExtra = {} } = {}) => {
  const actor = actorFor(item, skills, actorExtra), targetRow = { ...target, ...targetExtra };
  return previewResolution({ actor, target: targetRow, action, roll: 40, baseRevision: 0,
    ...(Array.isArray(context.explosionTargetIds) ? { v5State: { participants: [{ ...actor, zone: 'active' }, { ...targetRow, zone: 'active' }] } } : {}), v5: { context, slModifier } });
};

test('F2-C T1 — Dent et griffe garde ses attaques naturelles sans contrôle de groupe', () => {
  const contracts=JSON.parse(readFileSync(new URL('../../../js/data/v5-divine-contracts.json',import.meta.url),'utf8'));
  const contract=contracts.contracts.find(row=>row.name==='Dent et griffe');
  const effect=contract.effects.find(row=>row.type==='grant-actions');
  const layer=divineGearHandlers['grant-actions'].buildLayer(effect);
  assert.ok(layer.grantedActions.length);
  for(const granted of layer.grantedActions){
    const action={...granted,base:54,damage:4};
    const result=previewResolution({actor:actorFor(null,[],{equipment:[]}),target,action,roll:40,v5:{context:{targetHelpless:true}}});
    assert.equal(result.weaponSkillReceipt,undefined);
    assert.deepEqual(result.unresolved,[]);
    assert.equal(applyResolution(result,{revision:0,participants:[structuredClone(target)]}).status,'applied');
  }
});

test('F2-C T1 — les canons à poudre acceptent les faits MJ sans compétence possédée', () => {
  const items=catalogue.items.filter(row=>row.kind==='weapon'&&['Siège','Embarquée'].includes(row.category)&&(row.keywords||[]).some(word=>word.id==='a-poudre-noire'));
  assert.equal(items.length,8);
  for(const item of items){
    const result=preview(item,[],{context:{weaponTrainingSpecialty:'Poudre noire',weaponAdvances:2,weaponSkillScore:55,explosionTargetIds:['target']}});
    assert.deepEqual(result.unresolved,[],item.name);
    assert.equal(result.score.base,55,item.name);
    assert.equal(result.weaponSkillReceipt.trained,true);
    assert.ok(preview(item,[],{context:{weaponTrainingSpecialty:'Arc',weaponAdvances:2,weaponSkillScore:55}}).unresolved.length,'Arc ne devient pas une voie licite');
  }
});

test('F2-C T1 — sans lien la spécialité exacte entraînée prime sur Base et sur l’ordre des compétences', () => {
  const item=itemById('weapon-armes-corps-a-corps-escrime-petit-sabre');
  const base={...skillByName('Corps à corps (Base)'),total:69},escrime={...skillByName('Corps à corps (Escrime)'),total:60};
  for(const skills of [[base,escrime],[escrime,base]]){
    const result=preview(item,skills,{action:actionFor(item)});
    assert.deepEqual(result.unresolved,[]);
    assert.equal(result.score.base,60);
    assert.equal(result.weaponSkillReceipt.skillId,escrime.id);
    assert.ok(result.input.action.qualities.some(row=>row.id==='rapide'));
    const explicit=preview(item,skills,{action:actionFor(item),context:{weaponSkillId:base.id}});
    assert.equal(explicit.score.base,69);
    assert.ok(!explicit.input.action.qualities.some(row=>row.id==='rapide'));
  }
});

test('F2-C T1 — un groupe Siège générique ne prend pas une compétence sans storageKey pour un lien', () => {
  const item=itemById('weapon-armes-a-distance-siege-baliste-navale');
  const arc=skillByName('Projectiles (Arc)'),crossbow=skillByName('Projectiles (Arbalète)');
  for(const skills of [[arc,crossbow],[crossbow,arc]]){
    const result=preview(item,skills,{action:actionFor(item)});
    assert.equal(result.weaponSkillReceipt.missing,'weapon-training-specialty-required');
  }
});

test('F2-C T1 — les liens Arc périmés se corrigent par le choix de résolution', () => {
  const arc=skillByName('Projectiles (Arc)');
  for(const [item,valid] of [[catalogue.items.find(row=>row.kind==='weapon'&&row.category==='Base'),skillByName('Corps à corps (Base)')],[catalogue.items.find(row=>row.kind==='weapon'&&row.category==='Arbalète'),skillByName('Projectiles (Arbalète)')]]){
    const skills=[arc,valid],action=actionFor(item,arc);
    assert.ok(preview(item,skills,{action}).unresolved.length,'un lien erroné ne certifie pas la maîtrise');
    const result=preview(item,skills,{action,context:{weaponSkillId:valid.id}});
    assert.deepEqual(result.unresolved,[]);
    assert.equal(result.score.base,valid.total);
    assert.equal(result.weaponSkillReceipt.skillId,valid.id);
    assert.equal(applyResolution(result,{revision:0,participants:[structuredClone(target)]}).status,'applied');
  }
});

test('F2-C T1 — la bâtarde sans suffixe a le défaut une main et ses défauts', () => {
  const item={id:'custom-bastard',kind:'weapon',name:'Épée bâtarde',category:'Deux mains',keywords:[]};
  const result=preview(item,[skillByName('Corps à corps (Base)')]);
  assert.deepEqual(result.unresolved,[]);
  assert.equal(result.weaponSkillReceipt.hands,1);
  assert.ok(result.input.action.qualities.some(row=>row.id==='epuisante'));
  assert.ok(result.input.action.qualities.some(row=>row.id==='lente'));
});

test('F2-C T1 — le malus CT conserve le modificateur de DR porté par l’action', () => {
  const item=itemById('weapon-armes-a-distance-lancer-javelot-blackbriar-elfe-sylvain');
  const action=actionFor(item);action.extensions.v5.slModifier=2;
  const result=previewResolution({actor:actorFor(item,[]),target,action,roll:40,v5:{context:{targetHelpless:true}}});
  assert.deepEqual(result.unresolved, [], 'le Javelot Blackbriar ne porte pas d’Inflige vide');
  assert.equal(result.score.mod,1);
  assert.equal(previewResolution(result.input).score.mod,1,'ré-aperçu sans cumul');
});

test('F2-C Claude — les replis CC/CT utilisent la base avant que le delta de caractéristique soit ajouté', async () => {
  const rapier = itemById('weapon-armes-corps-a-corps-escrime-petit-sabre');
  const noTraining = preview(rapier, [], { actorExtra: { caracs: { CC: 64, CT: 43 }, extensions: { v5: { baseCaracs: { CC: 54, CT: 43 } } } } });
  assert.equal(noTraining.score.base, 64, 'CC 54 + effet de caractéristique +10 doit faire 64');
  assert.ok(!noTraining.unresolved.length);
  const thrown = itemById(catalogue.items.find(row => row.kind === 'weapon' && row.category === 'Lancer')?.id);
  const ctFallback = preview(thrown, [], { actorExtra: { caracs: { CC: 54, CT: 38 }, extensions: { v5: { baseCaracs: { CC: 54, CT: 43 } } } } });
  assert.equal(ctFallback.score.base, 38, 'CT courant inférieur à la base reste appliqué une seule fois');
  assert.equal(applyResolution(noTraining, { revision: 0, participants: [structuredClone(target)] }).status, 'applied');

  let saved=null;const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({persistence,storage:null});await store.ready;
  const persistentActor={...actorFor(rapier,[]),caracs:{CC:64,CT:43},zone:'active',hp:20,maxHp:20,actions:[actionFor(rapier)],ficheSnapshot:{skills:[],coverage:{skills:'present'}}};
  const persistentTarget={...target,zone:'active'};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'hero',order:['hero','target'],participants:[persistentActor,persistentTarget]},log:[],diceLines:[]});
  const appliedPreview=store.previewResolution({actorId:'hero',targetId:'target',actor:store.listParticipants().find(row=>row.id==='hero'),target:persistentTarget,action:persistentActor.actions[0],roll:40,v5:{context:{targetHelpless:true}}});
  assert.equal(appliedPreview.score.base,64,'Store additionne l’effet courant une seule fois au repli CC');assert.deepEqual(appliedPreview.unresolved,[]);
  assert.equal((await store.applyResolution(appliedPreview)).status,'applied');
  assert.equal(await store.undo(),true,'Undo Store restaure le résultat précédent');
  const reload=createStore({persistence,storage:null});await reload.ready;
  assert.equal(reload.listParticipants().find(row=>row.id==='hero').caracs.CC,64);
  assert.equal(reload.listParticipants().find(row=>row.id==='hero').extensions.v5.baseCaracs.CC,54);
});

test('F2-C Claude — un ancien lien vers Base ne bloque pas une arme de spécialité différente', () => {
  const halberd = itemById('weapon-armes-corps-a-corps-arme-d-hast-hallebarde-haut-elfe');
  const base = skillByName('Corps à corps (Base)');
  const armour = { id:'training-test-mail', kind:'armour', name:'Cotte de mailles', ap:2, layer:'mail', locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'], keywords:[] };
  const result = preview(halberd, [base], { action: actionFor(halberd, base), context:{struckItemId:armour.id}, targetExtra:{equipment:[armour]} });
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.score.base, 54);
  assert.equal(result.weaponSkillReceipt.trained, false);
  assert.equal(applyResolution(result, { revision: 0, participants: [structuredClone(result.input.target)] }).status, 'applied');
  assert.ok(!result.input.action.qualities.some(row => row.id === 'defensive'));
  const hast = skillByName("Corps à corps (Armes d'hast)");
  const trained = preview(halberd, [base, hast], { action: { ...actionFor(halberd, base), base: 69 }, context:{struckItemId:armour.id}, targetExtra:{equipment:[armour]} });
  assert.deepEqual(trained.unresolved, []);
  assert.equal(trained.score.base, hast.total, 'un ancien score Base ne devient pas une saisie MJ pour la compétence Hast nouvellement utilisée');
  assert.equal(trained.input.action.extensions.fiche.skillId, hast.id, 'les talents reçoivent la spécialité effectivement utilisée');
});

test('F2-C Claude — siège et embarquée acceptent les compétences de tir réellement possédées', () => {
  const testRows = [
    ['weapon-armes-a-distance-siege-canon-nain', 'Projectiles (Poudre noire)'],
    ['weapon-armes-a-distance-siege-baliste-navale', 'Projectiles (Arbalète)'],
    ['weapon-armes-a-distance-siege-catapulte-petite', 'Projectiles (Jet)'],
    ['weapon-armes-a-distance-embarquee-mitrailleuse-clattergun-nain', 'Projectiles (Poudre noire)'],
    ['weapon-armes-a-distance-embarquee-canon-fracasseur-breaker-nain', 'Projectiles (Ingénierie)'],
    ['weapon-armes-a-distance-embarquee-canon-tempete-tempest-nain', 'Projectiles (Poudre noire)'],
    ['weapon-armes-a-distance-embarquee-canon-tonnerre-thunder-nain', 'Projectiles (Ingénierie)'],
    ['weapon-armes-a-distance-siege-canon-pivotant-avec-balles-nain', 'Projectiles (Poudre noire)'],
    ['weapon-armes-a-distance-siege-bombarde-petit-canon-nain', 'Projectiles (Ingénierie)'],
    ['weapon-armes-a-distance-siege-mortier-nain', 'Projectiles (Poudre noire)'],
    ['weapon-armes-a-distance-siege-catapulte-moyenne', 'Projectiles (Ingénierie)'],
    ['weapon-armes-a-distance-ingenierie-lance-feu-a-malepierre-skaven', 'Projectiles (Lance-flammes)']
  ];
  for (const [itemId, skillName] of testRows) {
    const item = itemById(itemId), skill = skillByName(skillName), result = preview(item, [skill], { context:{explosionTargetIds:['target']} });
    assert.deepEqual(result.unresolved, [], `${item.name} avec ${skill.name}; qualités=${JSON.stringify(result.input.action.qualities)}`);
    assert.equal(result.weaponSkillReceipt.trained, true, item.name);
    assert.equal(result.score.base, skill.total, item.name);
    assert.equal(equipmentAttackContext(item).ranged, true, item.name);
  }
  const badGroup = itemById('weapon-armes-a-distance-siege-canon-nain');
  assert.ok(preview(badGroup, [skillByName('Corps à corps (Base)')]).unresolved.length,
    'un lien de mêlée ne devient pas une maîtrise de tir');
  const ballista = itemById('weapon-armes-a-distance-siege-baliste-navale'), crossbow = skillByName('Projectiles (Arbalète)');
  const unresolved = preview(ballista, [crossbow], { action: actionFor(ballista) });
  assert.ok(unresolved.unresolved.some(text => /spécialité de tir|choisir/i.test(text)), 'sans règle catalogue ou choix explicite, la spécialité reste à arbitrer');
  const selected = preview(ballista, [crossbow], { context: { weaponSkillId: crossbow.id }, action: actionFor(ballista) });
  assert.equal(selected.weaponSkillReceipt.skillId, crossbow.id);
  assert.equal(selected.weaponSkillReceipt.trainingChoice, 'explicit-mj-or-historical-link');

  const throwing = itemById(catalogue.items.find(row => row.kind === 'weapon' && row.category === 'Lancer')?.id);
  const low = { ...skillByName('Projectiles (Jet)'), id: 'jet-low', name: 'Projectiles (Armes de jet)', total: 44, advances: 0 };
  const trained = { ...skillByName('Projectiles (Jet)'), id: 'jet-trained', total: 61, advances: 2 };
  for (const skills of [[low, trained], [trained, low]]) {
    const result = preview(throwing, skills, { action: actionFor(throwing) });
    assert.deepEqual(result.unresolved, [], 'le Javelot Blackbriar utilisable ne porte pas d’Inflige vide');
    assert.equal(result.weaponSkillReceipt.skillId, 'jet-trained', 'ordre fiche/alias ne masque pas la spécialité entraînée');
    assert.equal(result.score.base,trained.total);
  }
});

test('F2-C Claude — le score action.base ajusté par le MJ est préservé sur un lien valide', () => {
  const rapier = itemById('weapon-armes-corps-a-corps-escrime-petit-sabre');
  const skill = skillByName('Corps à corps (Base)');
  const action = { ...actionFor(rapier, skill), base: 75 };
  const result = preview(rapier, [skill], { action });
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.score.base, 75);
  assert.equal(result.input.action.base, 75);
  const effected=preview(rapier,[skill],{action,actorExtra:{caracs:{CC:48,CT:43},extensions:{v5:{baseCaracs:{CC:38,CT:43}}}}});
  assert.deepEqual(effected.unresolved,[]);
  assert.equal(effected.input.action.base,75,'le score manuel source reste conservé dans l’action');
  assert.equal(effected.score.base,85,'le delta CC +10 s’applique une fois au score manuel pré-effet');
  const contextual=preview(rapier,[skill],{context:{weaponSkillId:skill.id,weaponAdvances:1,weaponSkillScore:75},actorExtra:{caracs:{CC:48,CT:43},extensions:{v5:{baseCaracs:{CC:38,CT:43}}}}});
  assert.deepEqual(contextual.unresolved,[]);
  assert.equal(contextual.score.base,85,'un score saisi en contexte n’est pas présumé déjà courant');
});

test('F2-C Claude — les malus de maîtrise s’ajoutent aux modificateurs MJ et restent décomposés', () => {
  const crossbow = itemById('weapon-armes-a-distance-arbalete-arbalete-de-poing');
  const result = preview(crossbow, [], { slModifier: 2 });
  assert.equal(result.score.mod, 1, '+2 bout portant et -1 arbalète = +1 DR');
  assert.equal(result.weaponSkillReceipt.applied.includes('ballistic-skill-minus-1-dr'), true);
  assert.equal(result.input.v5.slModifier, 1, 'le résultat combine une fois les deux sources');
  const engineeringWeapon = itemById('weapon-armes-a-distance-ingenierie-lance-feu-a-malepierre-skaven');
  const powder = skillByName('Projectiles (Poudre noire)');
  const engineering = preview(engineeringWeapon, [powder], { slModifier: -1 });
  assert.equal(engineering.score.mod, -3, '-1 MJ et -2 spécialité Poudre noire sur Ingénierie = -3 DR');
  const repeated = previewResolution(engineering.input);
  assert.equal(repeated.score.mod, -3, 're-preview de l’entrée normalisée ne rajoute pas une deuxième fois le malus');
});

test('F2-C Claude — les options d’instance persistent et les armes conjurées suivent la maîtrise', () => {
  const sword = catalogue.items.find(row => row.kind === 'weapon' && /Épée bâtarde.*\(2M\)/i.test(row.name));
  assert.ok(sword, 'le vrai nom de catalogue porte le marqueur (2M)');
  const bastard = structuredClone(sword);
  const defaultHands = applyWeaponSkillRules(actorFor(bastard, [skillByName('Corps à corps (Deux mains)')]), actionFor(bastard), { weapon: bastard });
  assert.deepEqual(defaultHands.unresolved, []);
  assert.equal(defaultHands.receipt.hands, 2);

  const conjured = { id: 'conjured-foil', type: 'attack', note: 'Fleuret aethyrique', attr: 'CC', base: 67,
    qualities: [{ id: 'rapide' }, { id: 'empaleuse' }, { id: 'magique' }],
    extensions: { v5: { kind: 'test', materialized: true, conjuredWeaponKey: 'foil', weaponHands: 1 } } };
  const caster = { id: 'mage', caracs: { CC: 38 }, states: [], skills: [{ ...skillByName('Corps à corps (Escrime)'), total: 67, advances: 0 }], ficheSnapshot: { coverage: { skills: 'present' } } };
  const result = previewResolution({ actor: caster, target, action: conjured, roll: 35, baseRevision: 0 });
  assert.deepEqual(result.unresolved, [], 'un profil de mêlée non maîtrisé reste attaquable avec le repli CC');
  assert.equal(result.weaponSkillReceipt?.trained, false);
  assert.equal(result.score.base, 38, 'la maîtrise absente utilise CC pour le fleuret conjuré');
  assert.ok(!result.input.action.qualities.some(row => row.id === 'rapide'));
  assert.ok(result.input.action.qualities.some(row => row.id === 'magique'));

  const flail={id:'conjured-flail',type:'attack',note:'Fléau aethyrique',attr:'CC',base:58,qualities:[{id:'assommante'},{id:'a-enroulement'},{id:'desequilibree'},{id:'magique'}],extensions:{v5:{kind:'test',materialized:true,conjuredWeaponKey:'flail',weaponHands:1}}};
  const flailCaster={...caster,skills:[{...skillByName('Corps à corps (Fléau)'),total:58,advances:0}]};
  const flailResult=previewResolution({actor:flailCaster,target,action:flail,roll:35,baseRevision:0});
  assert.deepEqual(flailResult.unresolved,[]);
  assert.equal(flailResult.score.base,38);
  assert.ok(flailResult.input.action.qualities.some(row=>row.id==='dangereuse'),'Fléau sans maîtrise conserve Dangereuse');
  assert.ok(flailResult.input.action.qualities.some(row=>row.id==='desequilibree'),'les Défauts restent');
  assert.ok(flailResult.input.action.qualities.some(row=>row.id==='magique'),'Magique reste');
  assert.ok(!flailResult.input.action.qualities.some(row=>['assommante','a-enroulement'].includes(row.id)),'les Atouts non maîtrisés sont retirés');
});

test('F2-C Claude — l’état monté anciennement absent vaut démonté, avec choix d’action explicite prioritaire', () => {
  const cavalry = itemById('weapon-armes-corps-a-corps-cavalerie-lance-de-cavalerie');
  assert.ok(cavalry);
  const base = skillByName('Corps à corps (Base)');
  const result = preview(cavalry, [base], { context: {}, action: actionFor(cavalry, base) });
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.weaponSkillReceipt.applied.includes('single-handed-cavalry-improvised'), true);
});

test('F2-C Claude — une Lance de cavalerie à pied suit son profil à une main même avec un lien Cavalerie entraîné', () => {
  const lance=itemById('weapon-armes-corps-a-corps-cavalerie-lance-de-cavalerie');
  assert.ok(lance&&!/\(\s*2\s*M\s*\)/i.test(lance.name||''));
  const cavalry=skillByName('Corps à corps (Cavalerie)'),action=actionFor(lance,cavalry);
  const result=preview(lance,[cavalry],{action,actorExtra:{extensions:{v5:{mounted:false}}}});
  assert.deepEqual(result.unresolved,[]);
  assert.equal(result.weaponSkillReceipt.mounted,false);assert.equal(result.weaponSkillReceipt.hands,1);
  assert.equal(result.weaponSkillReceipt.group,'Base');assert.equal(result.weaponSkillReceipt.trained,false);
  assert.equal(result.score.base,54);
  assert.ok(result.weaponSkillReceipt.applied.includes('improvised-weapon-profile'));
  assert.equal(result.input.action.damageFormula,'BF +1');
  assert.ok(!result.input.action.qualities.some(row=>row.id==='empaleuse'));
});

test('F2-C Claude — Store conserve mounted et override des mains dans combat, scène, reload, Undo et Redo', async () => {
  let saved=null;
  const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return {ok:true};}};
  const store=createStore({persistence,storage:null});await store.ready;
  const hero={...actorFor(null,[]),kind:'PJ',name:'Héros',zone:'active',hp:20,maxHp:20,actions:[],equipment:[{id:'bastard-1',kind:'weapon',name:'Épée bâtarde (2M)',category:'Deux mains'}],extensions:{v5:{mounted:false,weaponHandsByEquipmentId:{}}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'hero',order:['hero'],participants:[hero]},activeScene:{id:'scene',status:'active',encounterId:'enc',round:1,currentActorId:'hero',order:['hero'],participants:[hero]},encounters:[],suspendedScenes:[],persistentCharacters:[],log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
  await store.updateParticipant('hero',{extensions:{...hero.extensions,v5:{...hero.extensions.v5,mounted:true,weaponHandsByEquipmentId:{'bastard-1':1}}}});
  const after=store.listParticipants()[0];assert.equal(after.extensions.v5.mounted,true);assert.equal(after.extensions.v5.weaponHandsByEquipmentId['bastard-1'],1);
  assert.equal(store.getActiveScene().participants[0].extensions.v5.weaponHandsByEquipmentId['bastard-1'],1);
  const reloaded=createStore({persistence,storage:null});await reloaded.ready;
  assert.equal(reloaded.listParticipants()[0].extensions.v5.mounted,true);
  assert.equal(reloaded.listParticipants()[0].extensions.v5.weaponHandsByEquipmentId['bastard-1'],1);
  assert.equal(await reloaded.undo(),true);assert.equal(reloaded.listParticipants()[0].extensions.v5.mounted,false);assert.equal(reloaded.listParticipants()[0].extensions.v5.weaponHandsByEquipmentId['bastard-1'],undefined);
  assert.equal(await reloaded.redo(),true);assert.equal(reloaded.listParticipants()[0].extensions.v5.mounted,true);assert.equal(reloaded.listParticipants()[0].extensions.v5.weaponHandsByEquipmentId['bastard-1'],1);
});

test('F2-C Claude — Aethyric Arms génère une arme contrôlée puis Store applique et annule une vraie attaque', async () => {
  const row=['Aethyric Arms',242,3,'Vous','Vous','Bonus de Force Mentale Rounds'];
  const {store}=await arcaneFixture(row),spell=contractFor('Aethyric Arms');
  const mage=store.listParticipants().find(person=>person.id==='mage');
  const base=skillByName('Corps à corps (Base)');
  await store.updateParticipant('mage',{caracs:{...mage.caracs,CC:null},extensions:{...mage.extensions,v5:{...mage.extensions.v5,baseCaracs:{...mage.extensions.v5.baseCaracs,CC:null}}}});
  const missingInput=spellInput(row,{domainFacts:{...spellInput(row).domainFacts,weaponKey:'sword',weaponSkillScore:undefined},weaponSkillScore:undefined});
  const missing=store.previewSpellExecution(spell.id,missingInput);assert.equal(missing.ready,false,'la preview demande un score MJ quand CC est absente');
  const zeroInput={...missingInput,domainFacts:{...missingInput.domainFacts,weaponSkillScore:0},weaponSkillScore:0};
  const explicitZero=store.previewSpellExecution(spell.id,zeroInput);assert.equal(explicitZero.ready,true,explicitZero.error);
  await store.updateParticipant('mage',{skills:[...mage.skills,{...base,total:58,advances:1}],caracs:{...mage.caracs,CC:38},extensions:{...mage.extensions,v5:{...mage.extensions.v5,baseCaracs:{CC:38}}}});
  const input=spellInput(row,{domainFacts:{...spellInput(row).domainFacts,weaponKey:'sword',weaponSkillScore:undefined},weaponSkillScore:undefined});
  const cast=store.previewSpellExecution(spell.id,input);assert.equal(cast.ready,true,cast.error);
  await store.applySpellExecution(spell.id,input);
  const granted=store.listParticipants().find(person=>person.id==='mage').actions.find(action=>action.extensions?.v5?.materialized===true);
  assert.ok(granted);assert.equal(granted.extensions.v5.conjuredWeaponKey,'sword');assert.equal(granted.extensions.v5.spellWeaponScoreImposed,undefined);
  const legacyAction=structuredClone(granted);delete legacyAction.extensions.v5.conjuredWeaponKey;delete legacyAction.extensions.v5.conjuredWeaponProfile;
  const legacy=previewResolution({actor:store.listParticipants().find(person=>person.id==='mage'),target,action:legacyAction,roll:30,baseRevision:0,v5:{context:{targetHelpless:true}}});
  assert.deepEqual(legacy.unresolved,[]);assert.equal(legacy.weaponSkillReceipt.group,'Base');assert.equal(legacy.score.base,58,'la couche de sort reconstitue le profil Aethyric Arms historique via sa donnée durable');
  const targetNow=store.listParticipants().find(person=>person.id==='foe');
  const attack=store.previewResolution({actorId:'mage',targetId:'foe',actor:store.listParticipants().find(person=>person.id==='mage'),target:targetNow,action:granted,roll:30,v5:{context:{targetHelpless:true}}});
  assert.deepEqual(attack.unresolved,[]);assert.equal(attack.score.base,58);assert.equal(attack.weaponSkillReceipt.trained,true);
  assert.equal((await store.applyResolution(attack)).status,'applied');
  assert.equal(await store.undo(),true);
  assert.equal(store.listParticipants().find(person=>person.id==='foe').hp,targetNow.hp);
});

test('F2-C Claude — Poings de Gork matérialise le score imposé par le sort et contourne le contrôle de maîtrise', async () => {
  const {store}=await waaaghEncounter(),spell=getSpellContract('Poings de Gork');
  await castSpell(store,spell);
  const mage=participant(store,'mage'),fists=mage.actions.find(action=>/Poings de Gork/.test(action.note||''));
  assert.ok(fists);assert.equal(fists.base,55);assert.equal(fists.extensions.v5.spellWeaponScoreImposed,true);
  const untrained={...mage,skills:[],ficheSnapshot:{coverage:{skills:'present'},skills:[]}};
  const check=applyWeaponSkillRules(untrained,fists);
  assert.deepEqual(check.unresolved,[]);assert.equal(check.action.base,55,'le score propre au sort reste prioritaire');
  const legacy=structuredClone(fists);delete legacy.extensions.v5.conjuredWeaponKey;delete legacy.extensions.v5.conjuredWeaponProfile;delete legacy.extensions.v5.spellWeaponScoreImposed;
  const legacyCheck=applyWeaponSkillRules(untrained,legacy);
  assert.deepEqual(legacyCheck.unresolved,[]);assert.equal(legacyCheck.action.base,55,'le contrat d’origine rétablit le score fixe des anciennes actions Poings de Gork');
});

test('F2-C Claude — les profils conjurés utilisent le même groupe canonique pour le score généré et l’attaque', () => {
  const base=skillByName('Corps à corps (Base)'),escrime=skillByName('Corps à corps (Escrime)'),parade={id:'custom-parade',name:'Corps à corps (Parade)',group:'Corps à corps',specialization:'Parade',carac:'CC',total:55,advances:2,status:'mj-confirmed'};
  const actor={id:'mage',caracs:{CC:38},skills:[base,escrime,parade]};
  assert.equal(conjuredWeaponSkillScore(actor,'net'),base.total,'Net utilise Base');
  assert.equal(conjuredWeaponSkillScore(actor,'buckler'),escrime.total,'Bocle utilise Escrime');
  assert.equal(conjuredWeaponSkillScore(actor,'main-gauche'),escrime.total,'Main gauche utilise Escrime en V5');
  assert.equal(conjuredWeaponSkillScore(actor,'swordbreaker'),escrime.total,'Brise-lame utilise Escrime en V5');
  assert.equal(weaponSkillGroupInfo('Parade'),null,'Parade ne figure plus parmi les groupes proposés');
  const legacy={id:'old-main-gauche',kind:'weapon',name:'Main gauche',category:'Parade',keywords:[]};
  const linked=applyWeaponSkillRules({...actor,skills:[parade],ficheSnapshot:{skills:[parade],coverage:{skills:'present'}}},actionFor(legacy,parade),{weapon:legacy});
  assert.deepEqual(linked.unresolved,[],'une liaison historique reste utilisable sans migrer la fiche');
  assert.equal(linked.receipt.group,'Escrime');
  assert.equal(linked.receipt.skillId,parade.id,'la fiche garde son ancienne spécialité liée sans migration');
  assert.equal(conjuredWeaponSkillScore({caracs:{CC:38},skills:[]},'dagger'),38,'une arme Base sans compétence trouvée garde un score de caractéristique disponible');
  assert.equal(conjuredWeaponSkillScore({caracs:{CC:0},skills:[]},'sword'),0,'un score CC numérique explicitement nul reste connu');
  assert.equal(conjuredWeaponSkillScore({caracs:{CC:'0'},skills:[]},'sword'),0,'un score CC textuel explicitement nul reste connu');
  for(const CC of [null,'','   '])assert.equal(conjuredWeaponSkillScore({caracs:{CC},skills:[]},'sword'),null,'une valeur CC nulle ou vide reste absente');
  assert.equal(conjuredWeaponSkillScore({caracs:{},skills:[]},'dagger'),null,'une caractéristique réellement absente ne devient pas 0');
  assert.equal(conjuredWeaponSkillScore({caracs:{CC:null},skills:[{name:'Corps à corps (Base)',total:null,value:'   ',score:0}]},'dagger'),0,'un score de compétence explicitement nul reste connu malgré ses autres champs vides');
  const net=ARCANE_WEAPON_PROFILES.net,action={id:'spell-net',type:'attack',note:net.name,base:base.total,attr:'CC',spellEffectId:'aethyric-arms',qualities:[...net.qualities.map(value=>typeof value==='string'?{id:value}:value),{id:'magique'}],extensions:{v5:{materialized:true,spellEffectId:'aethyric-arms',conjuredWeaponKey:'net',conjuredWeaponProfile:net,weaponHands:1}}};
  const actorWithEffect={...actor,skills:[{...base,advances:1}],extensions:{v5:{spellEffects:[{id:'aethyric-arms',grantedActions:[{id:'spell-net'}]}]}}};
  const result=previewResolution({actor:actorWithEffect,target,action,roll:40,baseRevision:0,v5:{context:{targetHelpless:true}}});
  assert.equal(result.unresolved.length,0,result.unresolved.join('; '));
  assert.equal(result.entanglement.weaponLocked,true,'le filet conjuré est verrouillé via son effet actif durable');
  assert.equal(result.weaponSkillReceipt.group,'Base');assert.equal(result.score.base,base.total);
  assert.deepEqual(net.qualities.find(row=>typeof row==='object'&&row.id==='inflige'),{id:'inflige',parameter:'Empêtré 50'},'Filet V5 p.301 est Inflige (Empêtré 50), pas l’ancien mot-clé V4 Immobilisante');
});

test('F2-C T1 — la spécialité exacte présente à zéro prime aussi sur Base, les alternatives restent licites', () => {
  const base=skillByName('Corps à corps (Base)'),escrime=skillByName('Corps à corps (Escrime)'),parade={...skillByName('Corps à corps (Bouclier)'),total:54,advances:0},cavalry=skillByName('Corps à corps (Cavalerie)');
  const run=(item,skills)=>{
    const actor=actorFor(item,skills,{extensions:{v5:{mounted:false}},ficheSnapshot:{skills,coverage:{skills:'present'}}});
    const action=actionFor(item,null);delete action.extensions.fiche.skillId;delete action.extensions.fiche.skillName;
    return applyWeaponSkillRules(actor,action,{weapon:item});
  };
  const mainGauche=itemById('weapon-armes-corps-a-corps-escrime-main-gauche');
  const main=run(mainGauche,[{...parade,total:54,advances:0},{...base,total:69,advances:5}]);
  assert.deepEqual(main.unresolved,[]);assert.equal(main.receipt.trained,true);assert.equal(main.receipt.skillId,base.id);assert.equal(main.action.base,69,'sans lien explicite, Main gauche choisit Escrime ou le repli Base, jamais Parade');assert.ok(!main.action.qualities.some(row=>row.id==='defensive'));
  const escrimeChoice=run(mainGauche,[parade,escrime]);assert.equal(escrimeChoice.receipt.skillId,escrime.id,'Escrime entraînée passe avant une compétence Parade non liée');
  const explicitLegacy=applyWeaponSkillRules(actorFor(mainGauche,[parade]),actionFor(mainGauche),{weapon:mainGauche,context:{weaponSkillId:parade.id}});
  assert.deepEqual(explicitLegacy.unresolved,[]);assert.equal(explicitLegacy.receipt.skillId,parade.id,'un lien Parade historique explicite reste utilisable');
  const fencing=itemById('weapon-armes-corps-a-corps-escrime-petit-sabre'),skills=[{...base,total:69,advances:5},{...escrime,total:54,advances:0}];
  const exactZero=run(fencing,skills);assert.equal(exactZero.receipt.trained,false);assert.equal(exactZero.action.base,54);
  const explicitBase=applyWeaponSkillRules(actorFor(fencing,skills),actionFor(fencing),{weapon:fencing,context:{weaponSkillId:base.id}});
  assert.deepEqual(explicitBase.unresolved,[]);assert.equal(explicitBase.action.base,69);assert.equal(explicitBase.receipt.skillId,base.id);
  const sabre=itemById('weapon-armes-corps-a-corps-cavalerie-sabre');
  const footSabre=run(sabre,[{...base,total:54,advances:0},{...escrime,total:69,advances:5}]);
  assert.deepEqual(footSabre.unresolved,[]);assert.equal(footSabre.receipt.trained,true);assert.equal(footSabre.receipt.skillId,escrime.id);assert.equal(footSabre.action.base,69);
  const twoHandCavalry=itemById('weapon-armes-corps-a-corps-cavalerie-marteau-a-bec-de-corbin-2m');
  const twoHand=run(twoHandCavalry,[{...skillByName('Corps à corps (Deux mains)'),total:54,advances:0},{...cavalry,total:69,advances:5}]);
  assert.deepEqual(twoHand.unresolved,[]);assert.equal(twoHand.receipt.trained,true);assert.equal(twoHand.receipt.skillId,cavalry.id);assert.equal(twoHand.action.base,69);
});

test('F2-C Claude — la Faux de Shyish produit une hallebarde contrôlée sans changer son profil magique', async () => {
  const spell=getSpellContract('La Faux de Shyish');
  const create=async advances=>{
    const skills=[{name:'Langue (Magick)',total:90},{name:'Focalisation',total:90},{name:'Résistance',total:40},{name:'Endurance',total:40},...(advances===null?[]:[{...skillByName("Corps à corps (Armes d'hast)"),total:62,advances}])];
    const {store}=await waaaghEncounter({mage:{skills,ficheSnapshot:{skills,coverage:{skills:'present'}}}});
    await castSpell(store,spell);
    return store;
  };
  const trainedStore=await create(1),mage=trainedStore.listParticipants().find(row=>row.id==='mage');
  const scythe=magicGrantedActions(mage).find(action=>action.extensions?.v5?.conjuredWeaponKey==='halberd');assert.ok(scythe);assert.equal(scythe.base,62);assert.equal(scythe.extensions.v5.conjuredWeaponKey,'halberd');
  assert.equal(scythe.extensions.v5.materialized,undefined);assert.equal(scythe.damageFormula,'BF+10','le bonus magique et le bonus de sort sont préservés');
  const armour={id:'foe-mail',kind:'armour',name:'Cotte de mailles',ap:2,layer:'mail',locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[]};
  let foe=trainedStore.listParticipants().find(row=>row.id==='foe');await trainedStore.updateParticipant('foe',{equipment:[...foe.equipment,armour]});foe=trainedStore.listParticipants().find(row=>row.id==='foe');
  const trained=trainedStore.previewResolution({actorId:'mage',targetId:'foe',actor:mage,target:foe,action:scythe,roll:25,v5:{context:{targetHelpless:true,struckItemId:armour.id}}});
  assert.deepEqual(trained.unresolved,[]);assert.equal(trained.weaponSkillReceipt.group,'Hast');assert.equal(trained.weaponSkillReceipt.trained,true);assert.equal(trained.score.base,62);
  assert.ok(trained.input.action.qualities.some(row=>row.id==='empaleuse'));
  const legacyScythe=structuredClone(scythe);for(const key of ['materialized','conjuredWeaponKey','conjuredWeaponProfile','weaponHands'])delete legacyScythe.extensions.v5[key];
  const legacy=previewResolution({actor:mage,target:foe,action:legacyScythe,roll:25,v5:{context:{targetHelpless:true,struckItemId:armour.id}}});
  assert.deepEqual(legacy.unresolved,[]);assert.equal(legacy.weaponSkillReceipt.group,'Hast');assert.equal(legacy.weaponSkillReceipt.trained,true,'Faux historique récupère Hallebarde par l’identifiant durable du sort');
  assert.equal((await trainedStore.applyResolution(trained)).status,'applied');assert.equal(await trainedStore.undo(),true);

  const untrainedStore=await create(0),untrainedMage=untrainedStore.listParticipants().find(row=>row.id==='mage'),untrainedScythe=magicGrantedActions(untrainedMage).find(action=>action.extensions?.v5?.conjuredWeaponKey==='halberd');
  const untrainedFoe=untrainedStore.listParticipants().find(row=>row.id==='foe');await untrainedStore.updateParticipant('foe',{equipment:[...untrainedFoe.equipment,armour]});
  const untrained=untrainedStore.previewResolution({actorId:'mage',targetId:'foe',actor:untrainedMage,target:untrainedStore.listParticipants().find(row=>row.id==='foe'),action:untrainedScythe,roll:25,v5:{context:{targetHelpless:true,struckItemId:armour.id}}});
  assert.deepEqual(untrained.unresolved,[]);assert.equal(untrained.weaponSkillReceipt.trained,false);assert.equal(untrained.score.base,50);
  assert.equal(untrained.input.action.damageFormula,'BF+10');assert.ok(untrained.input.action.qualities.some(row=>row.id==='magique'));
  assert.ok(!untrained.input.action.qualities.some(row=>['defensive','empaleuse'].includes(row.id)),'les Atouts sont retirés quand Hast est à zéro');
  assert.equal((await untrainedStore.applyResolution(untrained)).status,'applied');

  const absentStore=await create(null),absentMage=absentStore.listParticipants().find(row=>row.id==='mage');
  const absentScythe=magicGrantedActions(absentMage).find(action=>action.extensions?.v5?.conjuredWeaponKey==='halberd');
  const absent=absentStore.previewResolution({actorId:'mage',targetId:'foe',actor:absentMage,target:absentStore.listParticipants().find(row=>row.id==='foe'),action:absentScythe,roll:25,v5:{context:{targetHelpless:true}}});
  assert.deepEqual(absent.unresolved,[]);assert.equal(absent.score.base,50,'sans spécialité, le profil retombe sur CC');
});
});

describe('Compétences des armes', () => {
const referenceItem = id => structuredClone(getReferenceCatalogue().items.find(item => item.id === id));
const file = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const target = { id: 'target', hp: 20, caracs: { E: 30 }, states: [] };

function importedWeapon({ category, name = 'Arme test', range = '', advanced = [], extra = {}, qualities, context = {} }) {
  const equipment = { ...referenceItem('weapon-armes-corps-a-corps-base-epee'), id: 'test-weapon', baseId: 'weapon-armes-corps-a-corps-base-epee',
    name, category, range, custom: true, keywords: qualities || [{ id: 'rapide', parameter: '' }, { id: 'desequilibree', parameter: '' }], ...extra };
  const raw = { ...file, nom: 'Testeur', equipment: [equipment], skillsAdvanced: advanced };
  const snapshot = ficheSnapshot('testeur', raw);
  const original = structuredClone(snapshot);
  const profile = { id: 'testeur-profile', name: 'Testeur', kind: 'PJ', hp: 10, caracs: {}, skills: [], equipment: [], diceLines: [], extensions: {} };
  const choices = { equipmentLinks: { [equipmentActionKey(snapshot.charId, equipment.id, 'attack')]: advanced[0]?.nom || '' } };
  const plan = planProfileSync(snapshot, profile, choices);
  const draft = { reserve: [profile], persistentCharacters: [], encounters: [] };
  const applied = applyFicheSync(draft, [{ snapshot, profileId: profile.id, ...choices }]);
  const imported = applied.reserve[0].diceLines.find(action => action.extensions?.fiche?.equipmentId === equipment.id && action.type === 'attack');
  const actor = { id: 'testeur', name: 'Testeur', caracs: snapshot.caracs, skills: snapshot.skills, equipment: snapshot.equipment, ficheSnapshot: snapshot, states: [] };
  return { snapshot, original, profile, plan, imported, actor, equipment, context };
}

const resolve = (fixture, context = {}) => previewResolution({ actor: fixture.actor, target, action: fixture.imported, roll: 40, baseRevision: 0, v5: { context: { ...fixture.context, ...context } } });

test('F2-C T1 — Escrime présente à zéro garde le repli CC par défaut, Base entraînée reste un choix MJ', () => {
  const f = importedWeapon({ category: 'Escrime', advanced: [{ nom: 'Corps à corps (Escrime)', adv: 0 }] });
  assert.equal(f.imported.extensions.fiche.requiresLink, false);
  const result = resolve(f);
  const base = f.snapshot.skills.find(row => row.name === 'Corps à corps (Base)');
  assert.ok(base?.advances > 0);
  assert.equal(result.score.base, f.actor.caracs.CC);
  assert.equal(result.weaponSkillReceipt.trained, false);
  assert.equal(resolve(f,{weaponSkillId:base.id}).score.base,base.total);
  assert.deepEqual(result.input.action.qualities.map(row => row.id), ['desequilibree']);
  assert.deepEqual(result.input.action.qualities.map(row => row.id).filter(id => id === 'desequilibree'), ['desequilibree'], 'le Défaut reste actif');
  assert.deepEqual(f.snapshot, f.original, 'les données importées sources ne changent pas');
  assert.deepEqual(f.equipment.keywords.map(row => row.id), ['rapide', 'desequilibree'], 'le catalogue/équipement garde ses Qualités');
});

test('F2-C — spécialité entraînée conserve score et qualités de fiche dans le parcours importé', () => {
  const f = importedWeapon({ category: 'Escrime', advanced: [{ nom: 'Corps à corps (Escrime)', adv: 12 }] });
  const result = resolve(f);
  const trained = f.snapshot.skills.find(row => row.name === 'Corps à corps (Escrime)');
  assert.equal(result.score.base, trained.total);
  assert.deepEqual(result.input.action.qualities.map(row => row.id), ['rapide', 'desequilibree']);
});

test('F2-C — tir spécialisé à zéro progrès est bloqué avec reçu et ne s’applique pas', () => {
  const f = importedWeapon({ category: 'Arc', range: '60', advanced: [{ nom: 'Projectiles (Arc)', adv: 0 }] });
  const result = resolve(f);
  assert.ok(result.unresolved.some(text => /avancement|maîtrise|spécialité/i.test(text)), JSON.stringify(result.unresolved));
  assert.equal(applyResolution(result, { revision: 0, participants: [structuredClone(target)] }).status, 'manual');
});

test('F2-C — les armes de tir sans groupe ne sont pas devinées à partir de leur nom', () => {
  const f = importedWeapon({ category: '', name: 'Morsure', range: '' });
  assert.throws(()=>resolve(f),error=>error.code==='SKILL_LINK_REQUIRED','un nom seul ne lève pas la garde de liaison');
  const selected = resolve(f,{weaponTrainingGroup:'Base'});
  assert.equal(selected.weaponSkillReceipt.group,'Base','le groupe explicitement choisi par le MJ permet le vrai parcours de résolution');
});

test('F2-C — les champs vides ou nuls ne créent pas un score de compétence zéro', () => {
  const melee = importedWeapon({ category: 'Base', name: 'Épée' });
  const noCcActor = { ...melee.actor, caracs: { ...melee.actor.caracs, CC: null }, skills: [], ficheSnapshot: { ...melee.snapshot, skills: [], coverage: { skills: 'present' } } };
  const noCc = previewResolution({ actor: noCcActor, target, action: melee.imported, roll: 40, baseRevision: 0 });
  assert.ok(noCc.unresolved.some(text => /Capacité de Combat absente/i.test(text)));
  const trained = importedWeapon({ category: 'Escrime', advanced: [{ nom: 'Corps à corps (Escrime)', adv: 3 }] });
  const skill = trained.actor.skills.find(row => row.name === 'Corps à corps (Escrime)');
  const noSkillScoreActor = { ...trained.actor, skills: trained.actor.skills.map(row => row.id === skill.id ? { ...row, total: null, value: '' } : row) };
  const noSkillScore = previewResolution({ actor: noSkillScoreActor, target, action: trained.imported, roll: 40, baseRevision: 0 });
  assert.ok(noSkillScore.unresolved.some(text => /score de la compétence de groupe est indisponible/i.test(text)));
});

test('F2-C — arbalète et lancer restent utilisables avec CT et −1 DR; les autres tirs sans maîtrise bloquent', () => {
  for (const category of ['Arbalète', 'Lancer']) {
    const f = importedWeapon({ category, name: category === 'Arbalète' ? 'Arbalète' : 'Javelot', range: '30' });
    const result = resolve(f);
    assert.equal(result.score.base, f.snapshot.caracs.CT, category);
    assert.equal(result.score.mod, -1, category);
    assert.ok(result.weaponSkillReceipt.applied.includes('ballistic-skill-minus-1-dr'));
  }
  const bow = importedWeapon({ category: 'Arc', name: 'Arc long', range: '60' });
  assert.throws(()=>resolve(bow),error=>error.code==='SKILL_LINK_REQUIRED','un arc sans spécialité garde sa garde de liaison');
  const trainedCrossbow = importedWeapon({ category: 'Arbalète', name: 'Arbalète', range: '30', advanced: [{ nom: 'Projectiles (Arbalète)', adv: 2 }] });
  const trainedResult = resolve(trainedCrossbow);
  assert.equal(trainedResult.score.mod, 0);
  assert.equal(trainedResult.score.base, trainedCrossbow.snapshot.skills.find(row => row.name === 'Projectiles (Arbalète)').total);
});

test('F2-C — les qualités de munition restent fusionnées sur le parcours importé', () => {
  const f = importedWeapon({ category: 'Arbalète', name: 'Arbalète', range: '30', advanced: [{ nom: 'Projectiles (Arbalète)', adv: 2 }] });
  const ammunition = referenceItem('ammunition-livre-de-base-arbalete-carreaux-12');
  const actor = { ...f.actor, equipment: [...f.actor.equipment, ammunition] };
  const result = previewResolution({ actor, target, action: f.imported, ammunitionId: ammunition.id, roll: 40, baseRevision: 0 });
  assert.ok(result.input.action.qualities.some(row => row.id === 'empaleuse'));
  assert.equal(result.input.action.attr, 'CT');
});

test('F2-C — les deux voies Poudre noire / Ingénierie respectent leurs DR', () => {
  const engineering = importedWeapon({ category: 'Poudre Noire', name: 'Arquebuse', range: '60', advanced: [{ nom: 'Projectiles (Ingénierie)', adv: 4 }] });
  const engineeringResult = resolve(engineering);
  assert.equal(engineeringResult.score.base, engineering.snapshot.skills.find(row => row.name === 'Projectiles (Ingénierie)').total);
  assert.equal(engineeringResult.score.mod, 0);
  const powder = importedWeapon({ category: 'Ingénierie', name: 'Pistolet', range: '20', extra:{source:'Aides de jeu : Armes à Distance / Ingénierie / Pistolet'}, advanced: [{ nom: 'Projectiles (Poudre noire)', adv: 4 }] });
  const powderResult = resolve(powder);
  assert.equal(powderResult.score.mod, -2);
  assert.ok(powderResult.weaponSkillReceipt.applied.includes('powder-skill-engineering-minus-2-dr'));
  const explosive=importedWeapon({category:'Explosifs',name:'Explosif',range:'20',advanced:[{nom:'Projectiles (Ingénierie)',adv:4}]});
  const explosiveResult=resolve(explosive);
  assert.equal(explosiveResult.score.mod,0,'Ingénierie permet les explosifs sans malus de spécialité');
  const wrongExplosive=importedWeapon({category:'Explosifs',name:'Explosif',range:'20',advanced:[{nom:'Projectiles (Arc)',adv:4}]});
  assert.equal(resolve(wrongExplosive).weaponSkillReceipt.missing,'skill-group-mismatch','une spécialité sans rapport ne profite pas de l’exception Ingénierie');
});

test('F2-C — la spécialité seule ne valide pas une compétence d’une autre famille', () => {
  const ranged = importedWeapon({ category: 'Poudre Noire', name: 'Arquebuse', range: '60', advanced: [{ nom: 'Savoir (Ingénierie)', adv: 4 }] });
  const rangedResult = resolve(ranged);
  assert.ok(rangedResult.unresolved.some(text => /compétence confirmée ne correspond pas au groupe/i.test(text)));
  assert.equal(rangedResult.weaponSkillReceipt.missing, 'skill-group-mismatch');
  const parry = importedWeapon({ category: 'Parade', name: 'Main gauche', advanced: [{ nom: 'Représentation (Parade)', adv: 4 }], qualities: [{ id: 'defensive', parameter: '' }] });
  const parryResult = resolve(parry);
  assert.ok(parryResult.unresolved.some(text => /compétence confirmée ne correspond pas au groupe/i.test(text)));
  assert.equal(parryResult.weaponSkillReceipt.missing, 'skill-group-mismatch');
});

test('F2-C — Ingénierie suit la nature réelle de chaque profil, pas sa catégorie seule', () => {
  const meleeIds=['weapon-armes-corps-a-corps-ingenierie-foret-a-vapeur-nain','weapon-armes-corps-a-corps-ingenierie-hache-dentee-cog-axe-naine','weapon-armes-corps-a-corps-ingenierie-gantelet-a-vapeur-nain'];
  for(const id of meleeIds){
    const item=referenceItem(id),f=importedWeapon({category:item.category,name:item.name,range:item.range,qualities:item.keywords,extra:{...item,id:'test-engineering-melee',baseId:item.id},advanced:[{nom:'Corps à corps (Ingénierie)',adv:5}]});
    const result=resolve(f),skill=f.snapshot.skills.find(row=>row.name==='Corps à corps (Ingénierie)');
    assert.equal(result.input.attackContext.ranged,false,item.name);
    assert.equal(result.input.action.attr,'CC',item.name);
    assert.equal(result.score.base,skill.total,item.name);
  }
  const rangedItem=referenceItem('weapon-armes-a-distance-ingenierie-arquebuse-a-repetition-2m');
  const ranged=importedWeapon({category:rangedItem.category,name:rangedItem.name,range:rangedItem.range,qualities:rangedItem.keywords,extra:{...rangedItem,id:'test-engineering-ranged',baseId:rangedItem.id},advanced:[{nom:'Projectiles (Ingénierie)',adv:5}]});
  const rangedResult=resolve(ranged);
  assert.equal(rangedResult.input.attackContext.ranged,true);
  assert.equal(rangedResult.input.action.attr,'CT');
  const ambiguous=importedWeapon({category:'Ingénierie',name:'Objet d’ingénierie',range:'',extra:{source:''},advanced:[{nom:'Corps à corps (Ingénierie)',adv:5}],context:{weaponTrainingGroup:'Ingénierie tir'}});
  const ambiguousResult=resolve(ambiguous);
  assert.equal(ambiguousResult.input.attackContext.ranged,true,'la sélection MJ du groupe résout la nature d’un objet personnalisé ambigu');
  assert.ok(ambiguousResult.unresolved.some(text=>/ne correspond pas au groupe/i.test(text)),'une sélection Tir ne rend pas utilisable une compétence de mêlée');
  const halberd=referenceItem('weapon-armes-corps-a-corps-arme-d-hast-hallebarde-haut-elfe');
  const halberdSkill=getReferenceCatalogue().skills.find(row=>row.nom==="Corps à corps (Armes d'hast)");
  const halberdFiche=importedWeapon({category:halberd.category,name:halberd.name,range:halberd.range,qualities:halberd.keywords,
    extra:{...halberd,id:'test-real-halberd',baseId:halberd.id},advanced:[{nom:halberdSkill.nom,adv:10}]});
  const halberdResult=resolve(halberdFiche);
  assert.equal(halberdResult.weaponSkillReceipt.trained,true,'la valeur catalogue « Armes d’hast » se lie à la spécialité canonique Hast');
  assert.equal(halberdResult.score.base,halberdFiche.snapshot.skills.find(row=>row.id===halberdSkill.id).total);
});

test('F2-C — Sarbacane sans progression tire avec CT et ajoute Dangereuse', () => {
  const f = importedWeapon({ category: 'Sarbacane', name: 'Sarbacane', range: '20', qualities: [] });
  const result = resolve(f);
  assert.equal(result.score.base, f.snapshot.caracs.CT);
  assert.deepEqual(result.input.action.qualities.map(row => row.id), ['dangereuse']);
});

test('F2-C — Fléau sans progrès retombe sur CC, perd ses Atouts et gagne Dangereuse', () => {
  const f = importedWeapon({ category: 'Fléau', name: 'Fléau', advanced: [{ nom: 'Corps à corps (Fléau)', adv: 0 }] });
  const result = resolve(f);
  assert.equal(result.score.base, f.snapshot.caracs.CC);
  assert.deepEqual(result.input.action.qualities.map(row => row.id), ['desequilibree', 'dangereuse']);
});

test('F2-C — Escrime employée avec Base garde le score confirmé et perd ses Qualités', () => {
  const f = importedWeapon({ category: 'Escrime', name: 'Rapière', advanced: [{ nom: 'Corps à corps (Base)', adv: 0 }] });
  const baseSkill=f.actor.skills.find(row=>row.name==='Corps à corps (Base)');
  f.actor={...f.actor,skills:f.actor.skills.map(row=>row.id===baseSkill.id?{...row,advances:0,total:f.actor.caracs.CC}:row)};
  const result = resolve(f);
  assert.equal(result.score.base, f.actor.caracs.CC);
  assert.deepEqual(result.input.action.qualities.map(row => row.id), ['desequilibree']);
  assert.equal(result.weaponSkillReceipt.applied.filter(code=>code==='fencing-with-basic').length,0,'Base à zéro est un repli CC, pas une compétence Base entraînée');
  assert.equal(result.weaponSkillReceipt.trained,false);
});

test('F2-C — armes de cavalerie à pied distinguent Deux mains et l’arme improvisée', () => {
  const twoHands = importedWeapon({ category: 'Cavalerie', name: 'Lance de cavalerie', advanced: [{ nom: 'Corps à corps (Deux mains)', adv: 6 }], context: { weaponMounted: false, weaponHands: 2 } });
  const twoHandResult = resolve(twoHands);
  assert.equal(twoHandResult.score.base, twoHands.snapshot.skills.find(row => row.name === 'Corps à corps (Deux mains)').total);
  assert.ok(twoHandResult.weaponSkillReceipt.applied.includes('two-handed-cavalry-on-foot'));
  const retainedCavalry=importedWeapon({category:'Cavalerie',name:'Lance de cavalerie',advanced:[{nom:'Corps à corps (Cavalerie)',adv:5}],context:{weaponMounted:false,weaponHands:2}});
  const retainedResult=resolve(retainedCavalry,{targetHelpless:true});
  assert.equal(retainedResult.score.base,retainedCavalry.snapshot.skills.find(row=>row.name==='Corps à corps (Cavalerie)').total,'Deux mains est une voie facultative; la compétence confirmée Cavalerie reste valide');
  assert.equal(retainedResult.weaponSkillReceipt.group,'Cavalerie');
  assert.deepEqual(retainedResult.unresolved,[],'la voie confirmée Cavalerie à pied reste résoluble');
  assert.equal(applyResolution(retainedResult,{revision:0,participants:[target]}).status,'applied');
  const oneHand = importedWeapon({ category: 'Cavalerie', name: 'Lance de cavalerie', advanced: [{ nom: 'Corps à corps (Base)', adv: 0 }], context: { weaponMounted: false, weaponHands: 1 } });
  const baseSkill = oneHand.actor.skills.find(row => row.name === 'Corps à corps (Base)');
  oneHand.actor = { ...oneHand.actor, skills: oneHand.actor.skills.map(row => row.id === baseSkill.id ? { ...row, advances: 0 } : row) };
  const oneHandResult = resolve(oneHand);
  assert.equal(oneHandResult.score.base, oneHand.snapshot.caracs.CC);
  assert.ok(oneHandResult.weaponSkillReceipt.applied.includes('improvised-weapon-profile'));
  assert.equal(oneHandResult.input.action.damageFormula, 'BF +1', 'la formule du profil de catalogue est conservée');
  assert.equal(oneHandResult.input.action.damage, 1);
  assert.equal(oneHandResult.input.action.reach, 'Variable');
  assert.deepEqual(oneHandResult.input.action.qualities.map(row => row.id), ['desequilibree', 'inoffensive'], 'les Défauts du profil improvisé restent sans maîtrise');
  const trainedImprovised = importedWeapon({ category: 'Cavalerie', name: 'Lance de cavalerie', advanced: [{ nom: 'Corps à corps (Base)', adv: 4 }], context: { weaponMounted: false, weaponHands: 1 } });
  const trainedImprovisedResult = resolve(trainedImprovised);
  assert.equal(trainedImprovisedResult.input.action.damageFormula, 'BF +1');
  assert.deepEqual(trainedImprovisedResult.input.action.qualities.map(row => row.id), ['desequilibree', 'inoffensive']);
});

test('F2-C — Marteau de cavalerie à pied utilise Deux mains', () => {
  const missingMounted = importedWeapon({ category: 'Cavalerie', name: 'Marteau de cavalerie', advanced: [{ nom: 'Corps à corps (Deux mains)', adv: 3 }] });
  assert.equal(resolve(missingMounted).weaponSkillReceipt.mounted, false, 'monté absent se lit démonté par défaut');
  assert.ok(!resolve(missingMounted).unresolved.some(text => /monté|cavalier/i.test(text)), 'la résolution ne redemande pas l’état monté à chaque action');
  const f = importedWeapon({ category: 'Cavalerie', name: 'Marteau de cavalerie', advanced: [{ nom: 'Corps à corps (Deux mains)', adv: 3 }], context: { weaponMounted: false } });
  const result = resolve(f);
  assert.equal(result.score.base, f.snapshot.caracs.CC + 3);
  assert.ok(result.weaponSkillReceipt.applied.includes('cavalry-hammer-on-foot'));
  const cavalryAtFoot=importedWeapon({category:'Cavalerie',name:'Marteau de cavalerie',advanced:[{nom:'Corps à corps (Cavalerie)',adv:4}],context:{weaponMounted:false}});
  const cavalryAtFootResult=resolve(cavalryAtFoot,{targetHelpless:true});
  assert.equal(cavalryAtFootResult.score.base,cavalryAtFoot.snapshot.skills.find(row=>row.name==='Corps à corps (Cavalerie)').total,'le Marteau conserve la compétence confirmée sans exiger Deux mains');
  assert.equal(cavalryAtFootResult.weaponSkillReceipt.group,'Cavalerie');
  assert.deepEqual(cavalryAtFootResult.unresolved,[]);
  const mounted = importedWeapon({ category: 'Cavalerie', name: 'Marteau de cavalerie', advanced: [{ nom: 'Corps à corps (Cavalerie)', adv: 3 }], context: { weaponMounted: true } });
  assert.equal(resolve(mounted).score.base, mounted.snapshot.caracs.CC + 3, 'monté utilise le groupe de cavalerie');
  const conflictingHands=importedWeapon({category:'Cavalerie',name:'Marteau de cavalerie',advanced:[{nom:'Corps à corps (Deux mains)',adv:3}],context:{weaponMounted:false,weaponHands:1}});
  const conflictingResult=resolve(conflictingHands);
  assert.equal(conflictingResult.score.base,conflictingHands.snapshot.skills.find(row=>row.name==='Corps à corps (Deux mains)').total,'les mains ne remplacent pas la règle particulière du Marteau');
  assert.equal(conflictingResult.weaponSkillReceipt.group,'Deux mains');
});

test('F2-C — Sabre à pied adapte Entaille selon Base ou Escrime', () => {
  const base = importedWeapon({ category: 'Cavalerie', name: 'Sabre', advanced: [{ nom: 'Corps à corps (Base)', adv: 3 }], qualities: [{ id: 'entaille', parameter: '1' }], context: { weaponMounted: false } });
  const once = resolve(base).input.action.qualities.find(row => row.id === 'entaille')?.parameter;
  const twice = resolve(base).input.action.qualities.find(row => row.id === 'entaille')?.parameter;
  assert.equal(once, '2');
  assert.equal(twice, once, 'la résolution répétée ne double pas l’amélioration');
  const fencing = importedWeapon({ category: 'Cavalerie', name: 'Sabre', advanced: [{ nom: 'Corps à corps (Escrime)', adv: 3 }], qualities: [{ id: 'entaille', parameter: '1' }], context: { weaponMounted: false } });
  assert.equal(resolve(fencing).input.action.qualities.find(row => row.id === 'entaille')?.parameter, '1');
  const conflictingHands=importedWeapon({category:'Cavalerie',name:'Sabre',advanced:[{nom:'Corps à corps (Escrime)',adv:3}],context:{weaponMounted:false,weaponHands:2}});
  const conflictingResult=resolve(conflictingHands);
  assert.equal(conflictingResult.score.base,conflictingHands.snapshot.skills.find(row=>row.name==='Corps à corps (Escrime)').total,'les mains ne remplacent pas la règle particulière du Sabre');
  assert.equal(conflictingResult.weaponSkillReceipt.group,'Escrime');
});

test('F2-C — talent Frappe assommante reconnaît l’arme de cavalerie improvisée à pied', () => {
  const f = importedWeapon({ category: 'Cavalerie', name: 'Lance de cavalerie', advanced: [{ nom: 'Corps à corps (Base)', adv: 0 }], context: { weaponMounted: false, weaponHands: 1 } });
  f.actor = { ...f.actor, talents: aggregateTalents([{ nom: 'Frappe assommante' }]).items };
  const result = resolve(f);
  assert.ok(result.input.action.contactImprovised);
  assert.ok(result.input.action.qualities.some(row => row.id === 'assommante'), 'le talent ajoute sa Qualité au profil reconnu comme improvisé');
  assert.ok(result.input.action.qualities.some(row => row.id === 'desequilibree'), 'le Défaut catalogue du profil improvisé est conservé');
});

test('F2-C — un Atout source supprimé par absence de maîtrise ne neutralise pas le talent qui le confère', () => {
  const make=(qualities)=>{
    const f=importedWeapon({category:'Escrime',name:'Gourdin improvisé',extra:{baseId:'custom-gourdin-improvisé'},advanced:[{nom:'Corps à corps (Escrime)',adv:0}],qualities});
    f.actor={...f.actor,talents:aggregateTalents([{nom:'Frappe assommante'}]).items};
    return resolve(f,{weaponImprovised:true});
  };
  const sourceHasPummel=make([{id:'assommante',parameter:''}]),sourceLacksPummel=make([]);
  for(const result of [sourceHasPummel,sourceLacksPummel])assert.equal(result.input.action.qualities.filter(row=>row.id==='assommante').length,1);
  assert.deepEqual(sourceHasPummel.input.action.qualities.map(({id,parameter})=>({id,parameter:parameter||''})),sourceLacksPummel.input.action.qualities.map(({id,parameter})=>({id,parameter:parameter||''})),'le talent confère le même Atout une fois après filtrage de la source');
});

test('F2-C — la résolution restaure équipement et munitions avant filtrage, puis filtre avant le prélude', () => {
  const makeHack=(withSize)=>{
    const f=importedWeapon({category:'Escrime',name:'Gourdin',qualities:withSize?[{id:'taille',parameter:''}]:[],advanced:[{nom:'Corps à corps (Escrime)',adv:0}]});
    f.imported={...f.imported,qualities:[]};
    f.actor={...f.actor,talents:aggregateTalents([{nom:'Démolisseur'}]).items};
    const result=previewResolution({actor:f.actor,target,action:f.imported,roll:40,baseRevision:0,v5:{context:{weaponTrainingGroup:'Base',penalties:{cover:-2}}}});
    return {f,result};
  };
  const plain=makeHack(false),inactiveSize=makeHack(true);
  assert.deepEqual(inactiveSize.result.input.action.qualities,[],'Taille catalogue ne survit pas sans maîtrise');
  assert.deepEqual(plain.result.input.action.qualities,[]);
  assert.equal(inactiveSize.result.input.v5.context.penalties.cover,-2,'Démolisseur ne reçoit pas une Taille filtrée après le prélude');
  assert.equal(plain.result.input.v5.context.penalties.cover,-2);
  assert.deepEqual(inactiveSize.f.equipment.keywords.map(row=>row.id),['taille'],'le filtrage reste sur la copie de résolution');
});

test('F2-C — Main gauche suit Escrime en V5 et perd Défensive sans maîtrise', () => {
  const f = importedWeapon({ category: 'Escrime', name: 'Main gauche', advanced: [{ nom: 'Corps à corps (Escrime)', adv: 0 }], qualities: [{ id: 'defensive', parameter: '' }] });
  const result = resolve(f);
  assert.ok(!result.input.action.qualities.some(row => row.id === 'defensive'));
  const parrying=importedWeapon({category:'Escrime',name:'Main gauche',advanced:[{nom:'Corps à corps (Escrime)',adv:2}],qualities:[{id:'defensive',parameter:''}]});
  const parryingResult=resolve(parrying);
  assert.equal(parryingResult.score.base,parrying.snapshot.skills.find(row=>row.name==='Corps à corps (Escrime)').total);
  assert.ok(parryingResult.input.action.qualities.some(row=>row.id==='defensive'),'la compétence canonique Escrime conserve l’avantage de Main gauche');
});

test('F2-C — Épée bâtarde à une main avec Base reçoit Épuisante et Lente', () => {
  const f = importedWeapon({ category: 'Deux-Mains', name: 'Épée bâtarde', advanced: [{ nom: 'Corps à corps (Base)', adv: 0 }], context: { weaponHands: 1 } });
  const baseSkill=f.actor.skills.find(row=>row.name==='Corps à corps (Base)');
  f.actor={...f.actor,skills:f.actor.skills.map(row=>row.id===baseSkill.id?{...row,advances:0,total:f.actor.caracs.CC}:row)};
  const result = resolve(f);
  assert.equal(result.score.base, f.actor.caracs.CC);
  assert.ok(result.input.action.qualities.some(row => row.id === 'epuisante'));
  assert.ok(result.input.action.qualities.some(row => row.id === 'lente'));
  const noSpecialty=importedWeapon({category:'Deux-Mains',name:'Épée bâtarde',context:{weaponHands:1}});
  noSpecialty.actor={...noSpecialty.actor,skills:noSpecialty.actor.skills.filter(row=>row.name!=='Corps à corps (Base)'),ficheSnapshot:{...noSpecialty.snapshot,skills:noSpecialty.snapshot.skills.filter(row=>row.name!=='Corps à corps (Base)')}};
  const fallback=resolve(noSpecialty);
  assert.equal(fallback.score.base,noSpecialty.snapshot.caracs.CC);
  assert.ok(fallback.input.action.qualities.some(row=>row.id==='epuisante'));
  assert.ok(fallback.input.action.qualities.some(row=>row.id==='lente'));
});

test('F2-C — avan. absentes sont inconnues et une compétence avancée à 0 ne se teste pas', () => {
  const f = importedWeapon({ category: 'Escrime', advanced: [{ nom: 'Corps à corps (Escrime)', adv: 0 }] });
  const skill = f.snapshot.skills.find(row => row.name === 'Corps à corps (Escrime)');
  const actor = { ...f.actor, skills: f.actor.skills.map(row => row.id === skill.id ? { ...row, advances: undefined } : row) };
  const missing = previewResolution({ actor, target, action: f.imported, roll: 40, baseRevision: 0 });
  assert.ok(missing.unresolved.some(text => /augmentations.*pas renseignées/i.test(text)));
  const advancedTest = previewResolution({ actor: f.actor, target, action: { type: 'skill', base: skill.total, extensions: { fiche: { skillId: skill.id } } }, roll: 40, baseRevision: 0 });
  assert.ok(advancedTest.unresolved.some(text => /compétence avancée.*sans au moins une augmentation/i.test(text)));
  const trainedActor = { ...actor, skills: actor.skills.map(row => row.id === skill.id ? { ...row, advances: 1 } : row) };
  const trainedTest = previewResolution({ actor: trainedActor, target, action: { type: 'skill', base: skill.total, extensions: { fiche: { skillId: skill.id } } }, roll: 40, baseRevision: 0 });
  assert.equal(trainedTest.unresolved.some(text => /compétence avancée.*sans au moins une augmentation/i.test(text)), false);
  const defenseTest = previewResolution({ actor: f.actor, target: { ...target, skills: f.actor.skills }, action: { type: 'attack', base: 40, damage: 4 },
    defense: { type: 'skill', base: skill.total, attr: 'CC', roll: 40, extensions: { fiche: { skillId: skill.id } } }, roll: 40, baseRevision: 0 });
  assert.ok(defenseTest.unresolved.some(text => /compétence avancée.*sans au moins une augmentation/i.test(text)), 'une défense avec compétence avancée à zéro est aussi bloquée');
});

test('F2-C — compétences confirmées et profils naturels sans arme gardent leur chemin', () => {
  const f = importedWeapon({ category: 'Arc', range: '30', advanced: [{ nom: 'Projectiles (Poudre noire)', adv: 4 }, { nom: 'Projectiles (Arc)', adv: 8 }] });
  const wrong = previewResolution({ actor: f.actor, target, action: f.imported, roll: 40, baseRevision: 0 });
  assert.ok(wrong.unresolved.some(text => /compétence confirmée ne correspond pas/i.test(text)));
  const natural = previewResolution({ actor: { id: 'beast', states: [], traits: ['Morsure'] }, target,
    action: { type: 'attack', note: 'Morsure', base: 45, damage: 4 }, roll: 40, baseRevision: 0 });
  assert.equal(natural.weaponSkillReceipt, undefined);
  assert.equal(natural.score.base, 45);
});

test('F2-C — les actions manuelles sans données de maîtrise restent arbitrées par le MJ, les faits saisis restent contrôlés', () => {
  const legacy=importedWeapon({category:'Base',name:'Épée'});
  const legacyActor={...legacy.actor,skills:[],ficheSnapshot:undefined};
  const manualAction={id:'manual',type:'attack',base:48,attr:'CC',damage:4,qualities:[],extensions:{fiche:{equipmentId:legacy.equipment.id}}};
  const manual=previewResolution({actor:legacyActor,target,action:manualAction,roll:40,baseRevision:0});
  assert.equal(manual.score.base,48,'sans contrat ni faits d’entraînement la valeur manuelle reste sous arbitrage MJ');
  assert.equal(manual.weaponSkillReceipt,undefined);

  const advanced=importedWeapon({category:'Arc',name:'Arc long',range:'60',advanced:[{nom:'Projectiles (Arc)',adv:0}]});
  const manualAdvanced={...advanced.imported,extensions:{fiche:{...advanced.imported.extensions.fiche,bindingVersion:undefined}}};
  const checked=previewResolution({actor:advanced.actor,target,action:manualAdvanced,roll:40,baseRevision:0});
  assert.ok(checked.unresolved.some(text=>/Aucune augmentation dans la spécialité de tir/i.test(text)),'un fait explicite à zéro ne devient pas une exception legacy');
});

test('F2-C — les libellés de groupe utilisés pour une compétence MJ sont ramenés à leur spécialité canonique', () => {
  const f=importedWeapon({category:'',name:'Arme personnalisée'});
  for(const [label,specialty] of [['Ingénierie tir','Ingénierie'],['Ingénierie mêlée','Ingénierie'],['Deux-Mains','Deux mains'],['Armes d’Hast','Hast']]){
    const result=resolve(f,{weaponTrainingGroup:label,weaponSkillScore:45,weaponAdvances:3});
    assert.equal(result.weaponSkillReceipt.group,specialty,label);
    assert.equal(result.weaponSkillReceipt.trained,true,label);
    assert.equal(result.input.action.base,45,label);
    assert.equal(result.weaponSkillReceipt.missing,undefined,label);
  }
});

test('F2-C — une spécialité personnalisée catalogue reste avancée tant que ses augmentations sont absentes ou nulles', () => {
  const resolved=resolveSkill('Projectiles (Sarbacane)',{owned:true});
  assert.equal(resolved.status,'custom-specialization');
  const row={...resolved.entry,total:45,advances:0,status:'resolved'};
  const actor={id:'specialiste',caracs:{CT:45,CC:40},skills:[row],ficheSnapshot:{skills:[row],coverage:{skills:'present'}},states:[]};
  const action={id:'custom-advanced-test',type:'skill',base:45,attr:'CT',note:row.nom,extensions:{fiche:{bindingVersion:1,skillId:row.id}}};
  const zero=previewResolution({actor,target,action,roll:40,baseRevision:0});
  assert.ok(zero.unresolved.some(text=>/compétence avancée ne peut pas être testée sans au moins une augmentation/i.test(text)));
  const missingActor={...actor,skills:[{...row,advances:undefined}],ficheSnapshot:{skills:[{...row,advances:undefined}],coverage:{skills:'present'}}};
  const missing=previewResolution({actor:missingActor,target,action,roll:40,baseRevision:0});
  assert.ok(missing.unresolved.some(text=>/augmentations de cette compétence avancée ne sont pas renseignées/i.test(text)));
  const trained={...row,advances:1,total:46},trainedActor={...actor,skills:[trained],ficheSnapshot:{skills:[trained],coverage:{skills:'present'}}};
  const available=previewResolution({actor:trainedActor,target,action:{...action,base:46},roll:40,baseRevision:0});
  assert.equal(available.unresolved.some(text=>/compétence avancée ne peut pas être testée sans au moins une augmentation/i.test(text)),false);
});

test('F2-C — le mapping documentaire couvre les identifiants du lot source', () => {
  const source=JSON.parse(readFileSync(new URL('../../../docs/plans-gpt/f2/F2_LOTS.json',import.meta.url),'utf8'));
  const ids=source['F2-C'].map(row=>row.id);
  const mapping = {
    'F-L06-0096':'fiche imports use group category and trained specialization', 'F-L06-0097':'untrained melee fallback', 'F-L06-0098':'ranged training required',
    'F-L06-0099':'Engineering enables powder and explosive weapons', 'F-L06-0100':'powder skill on Engineering weapon', 'F-L06-0101':'crossbow and throwing CT exception',
    'F-L06-0102':'two handed cavalry on foot', 'F-L06-0103':'one handed cavalry improvised on foot', 'F-L06-0104':'Fencing with Basic removes benefits',
    'F-L06-0105':'untrained flail Dangerous', 'F-L06-1029':'untrained melee fallback duplicate', 'F-L06-1030':'cavalry on foot duplicate',
    'F-L06-1031':'Fencing with Basic duplicate', 'F-L06-1032':'flail Dangerous duplicate', 'F-L06-1036':'ranged training required duplicate',
    'F-L06-1037':'Engineering powder exception duplicate', 'F-L06-1038':'crossbow and throwing CT exception duplicate', 'F-L06-1039':'powder skill penalty duplicate',
    'F-L06-0846':'advanced skill with zero advances is blocked', 'F-L06-0847':'confirmed skill choice and specialization entries preserved',
    'F-L07-0176':'Sarbacane CT and Dangerous', 'F-L13-0088':'cavalry hammer on foot', 'F-L13-0090':'sabre Base versus Fencing',
    'F-L13-0097':'untrained flail duplicate', 'F-L13-0100':'Main Gauche without Parrying', 'F-L13-0103':'one handed Bastard Sword with Basic'
  };
  assert.deepEqual(Object.keys(mapping).sort(), [...ids].sort());
  assert.ok(Object.values(mapping).every(name => typeof name === 'string' && name.length > 8));
});
});
