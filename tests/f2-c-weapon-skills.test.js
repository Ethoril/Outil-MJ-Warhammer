import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, planProfileSync, applyFicheSync, equipmentActionKey } from '../js/core/fiche-sync.js';
import { previewResolution, applyResolution } from '../js/core/resolution.js';
import { aggregateTalents, getReferenceCatalogue, resolveSkill } from '../js/core/reference-catalog.js';

const referenceItem = id => structuredClone(getReferenceCatalogue().items.find(item => item.id === id));
const file = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
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

test('F2-C — Main gauche sans Parade perd Défensive comme une dague', () => {
  const f = importedWeapon({ category: 'Parade', name: 'Main gauche', qualities: [{ id: 'defensive', parameter: '' }] });
  const result = resolve(f);
  assert.ok(!result.input.action.qualities.some(row => row.id === 'defensive'));
  const parrying=importedWeapon({category:'Parade',name:'Main gauche',advanced:[{nom:'Corps à corps (Bouclier)',adv:2}],qualities:[{id:'defensive',parameter:''}]});
  const parryingResult=resolve(parrying);
  assert.equal(parryingResult.score.base,parrying.snapshot.skills.find(row=>row.name==='Corps à corps (Bouclier)').total);
  assert.ok(parryingResult.input.action.qualities.some(row=>row.id==='defensive'),'la compétence canonique spécialisée Parade conserve l’avantage de Main gauche');
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
  const source=JSON.parse(readFileSync(new URL('../docs/plans-gpt/f2/F2_LOTS.json',import.meta.url),'utf8'));
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
