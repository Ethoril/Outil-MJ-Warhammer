import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { previewResolution, applyResolution } from '../js/core/resolution.js';
import { applyWeaponSkillRules, equipmentAttackContext, ARCANE_WEAPON_PROFILES, conjuredWeaponSkillScore } from '../js/core/equipment.js';
import { createStore } from '../js/core/store.js';
import { fixture as arcaneFixture, spellInput, contractFor } from './helpers/lot3-arcane-fixture.js';
import { encounter as waaaghEncounter, cast as castSpell, subject as participant } from './helpers/lot3-domain-fixture.js';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';
import { magicGrantedActions } from '../js/core/v5-magic-combat.js';

const catalogue = getReferenceCatalogue();
const target = { id: 'target', hp: 20, caracs: { E: 30 }, states: [] };
const fixture = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
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
const preview = (item, skills, { context = {}, slModifier = 0, action = actionFor(item, skills[0]), actorExtra = {} } = {}) =>
  previewResolution({ actor: actorFor(item, skills, actorExtra), target, action, roll: 40, baseRevision: 0,
    v5: { context, slModifier } });

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
  const result = preview(halberd, [base], { action: actionFor(halberd, base) });
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.score.base, 54);
  assert.equal(result.weaponSkillReceipt.trained, false);
  assert.equal(applyResolution(result, { revision: 0, participants: [structuredClone(target)] }).status, 'applied');
  assert.ok(!result.input.action.qualities.some(row => row.id === 'defensive'));
  const hast = skillByName("Corps à corps (Armes d'hast)");
  const trained = preview(halberd, [base, hast], { action: { ...actionFor(halberd, base), base: 69 } });
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
    const item = itemById(itemId), skill = skillByName(skillName), result = preview(item, [skill]);
    assert.deepEqual(result.unresolved, [], `${item.name} avec ${skill.name}`);
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
    assert.deepEqual(result.unresolved, []);
    assert.equal(result.weaponSkillReceipt.skillId, 'jet-trained', 'ordre fiche/alias ne masque pas la spécialité entraînée');
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
  assert.equal(conjuredWeaponSkillScore(actor,'main-gauche'),parade.total,'Main gauche utilise Parade');
  assert.equal(conjuredWeaponSkillScore(actor,'swordbreaker'),parade.total,'Brise-lame utilise Parade');
  assert.equal(conjuredWeaponSkillScore({caracs:{CC:38},skills:[]},'dagger'),38,'une arme Base sans compétence trouvée garde un score de caractéristique disponible');
  assert.equal(conjuredWeaponSkillScore({caracs:{CC:0},skills:[]},'sword'),0,'un score CC numérique explicitement nul reste connu');
  assert.equal(conjuredWeaponSkillScore({caracs:{CC:'0'},skills:[]},'sword'),0,'un score CC textuel explicitement nul reste connu');
  for(const CC of [null,'','   '])assert.equal(conjuredWeaponSkillScore({caracs:{CC},skills:[]},'sword'),null,'une valeur CC nulle ou vide reste absente');
  assert.equal(conjuredWeaponSkillScore({caracs:{},skills:[]},'dagger'),null,'une caractéristique réellement absente ne devient pas 0');
  assert.equal(conjuredWeaponSkillScore({caracs:{CC:null},skills:[{name:'Corps à corps (Base)',total:null,value:'   ',score:0}]},'dagger'),0,'un score de compétence explicitement nul reste connu malgré ses autres champs vides');
  const net=ARCANE_WEAPON_PROFILES.net,action={id:'spell-net',type:'attack',note:net.name,base:base.total,attr:'CC',qualities:[...net.qualities.map(value=>typeof value==='string'?{id:value}:value),{id:'magique'}],extensions:{v5:{materialized:true,conjuredWeaponKey:'net',conjuredWeaponProfile:net,weaponHands:1}}};
  const result=previewResolution({actor:{...actor,skills:[{...base,advances:1}]},target,action,roll:40,baseRevision:0,v5:{context:{targetHelpless:true}}});
  assert.deepEqual(result.unresolved,[]);assert.equal(result.weaponSkillReceipt.group,'Base');assert.equal(result.score.base,base.total);
});

test('F2-C Claude — une action sans compétence liée privilégie une voie légale entraînée sur sa spécialité à zéro', () => {
  const base=skillByName('Corps à corps (Base)'),escrime=skillByName('Corps à corps (Escrime)'),parade={...skillByName('Corps à corps (Bouclier)'),total:54,advances:0},cavalry=skillByName('Corps à corps (Cavalerie)');
  const run=(item,skills)=>{
    const actor=actorFor(item,skills,{extensions:{v5:{mounted:false}},ficheSnapshot:{skills,coverage:{skills:'present'}}});
    const action=actionFor(item,null);delete action.extensions.fiche.skillId;delete action.extensions.fiche.skillName;
    return applyWeaponSkillRules(actor,action,{weapon:item});
  };
  const mainGauche=itemById('weapon-armes-corps-a-corps-parade-main-gauche');
  const main=run(mainGauche,[{...parade,total:54,advances:0},{...base,total:69,advances:5}]);
  assert.deepEqual(main.unresolved,[]);assert.equal(main.receipt.trained,true);assert.equal(main.receipt.skillId,base.id);assert.equal(main.action.base,69);assert.ok(!main.action.qualities.some(row=>row.id==='defensive'));
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
  const foe=trainedStore.listParticipants().find(row=>row.id==='foe');
  const trained=trainedStore.previewResolution({actorId:'mage',targetId:'foe',actor:mage,target:foe,action:scythe,roll:25,v5:{context:{targetHelpless:true}}});
  assert.deepEqual(trained.unresolved,[]);assert.equal(trained.weaponSkillReceipt.group,'Hast');assert.equal(trained.weaponSkillReceipt.trained,true);assert.equal(trained.score.base,62);
  assert.ok(trained.input.action.qualities.some(row=>row.id==='empaleuse'));
  const legacyScythe=structuredClone(scythe);for(const key of ['materialized','conjuredWeaponKey','conjuredWeaponProfile','weaponHands'])delete legacyScythe.extensions.v5[key];
  const legacy=previewResolution({actor:mage,target:foe,action:legacyScythe,roll:25,v5:{context:{targetHelpless:true}}});
  assert.deepEqual(legacy.unresolved,[]);assert.equal(legacy.weaponSkillReceipt.group,'Hast');assert.equal(legacy.weaponSkillReceipt.trained,true,'Faux historique récupère Hallebarde par l’identifiant durable du sort');
  assert.equal((await trainedStore.applyResolution(trained)).status,'applied');assert.equal(await trainedStore.undo(),true);

  const untrainedStore=await create(0),untrainedMage=untrainedStore.listParticipants().find(row=>row.id==='mage'),untrainedScythe=magicGrantedActions(untrainedMage).find(action=>action.extensions?.v5?.conjuredWeaponKey==='halberd');
  const untrained=untrainedStore.previewResolution({actorId:'mage',targetId:'foe',actor:untrainedMage,target:untrainedStore.listParticipants().find(row=>row.id==='foe'),action:untrainedScythe,roll:25,v5:{context:{targetHelpless:true}}});
  assert.deepEqual(untrained.unresolved,[]);assert.equal(untrained.weaponSkillReceipt.trained,false);assert.equal(untrained.score.base,50);
  assert.equal(untrained.input.action.damageFormula,'BF+10');assert.ok(untrained.input.action.qualities.some(row=>row.id==='magique'));
  assert.ok(!untrained.input.action.qualities.some(row=>['defensive','empaleuse'].includes(row.id)),'les Atouts sont retirés quand Hast est à zéro');
  assert.equal((await untrainedStore.applyResolution(untrained)).status,'applied');

  const absentStore=await create(null),absentMage=absentStore.listParticipants().find(row=>row.id==='mage');
  const absentScythe=magicGrantedActions(absentMage).find(action=>action.extensions?.v5?.conjuredWeaponKey==='halberd');
  const absent=absentStore.previewResolution({actorId:'mage',targetId:'foe',actor:absentMage,target:absentStore.listParticipants().find(row=>row.id==='foe'),action:absentScythe,roll:25,v5:{context:{targetHelpless:true}}});
  assert.deepEqual(absent.unresolved,[]);assert.equal(absent.score.base,50,'sans spécialité, le profil retombe sur CC');
});
