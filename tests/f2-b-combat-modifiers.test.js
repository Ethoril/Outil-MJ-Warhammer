import test from 'node:test';
import assert from 'node:assert/strict';
import { conditionLevels, momentumAfterChange } from '../js/core/v5-combat-rules.js';
import { previewResolution } from '../js/core/resolution.js';

const subject = (id, extra = {}) => ({ id, name: id, camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, I: 40 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const attack = ({ kind = 'ranged', actor = subject('a'), target = subject('b'), context = {}, actorSize, targetSize, defense, choice = 'keep',
  action = { type: 'attack', attr: kind === 'ranged' ? 'CT' : 'CC', base: 60, damage: 4 }, ...extra } = {}) => previewResolution({
  actor, target, action, roll: 25, ...(defense ? { defense } : {}),
  v5: { kind, choice, actorSize, targetSize, context }, ...extra
});
const mods = preview => Object.fromEntries(preview.test.details.modifiers.map(row => [row.id, row.amount]));
const delta = (preview, base = attack()) => preview.test.sl - base.test.sl;

test('F2-B Claude 11-13 — facteurs anciens/nouveaux dédoublonnés, Sapeur et cible Moyenne implicite',()=>{
 const context={height:'defender',difficultTerrain:true,penalties:{belowTarget:-1,terrainMovement:-1}};
 const p=attack({kind:'melee',context});assert.equal(p.test.sl,attack({kind:'melee'}).test.sl-2);assert.equal(p.test.details.modifiers.filter(row=>row.amount<0).length,2);
 const sapper=subject('a',{talents:[{id:'talent-underminer',status:'resolved',rank:1}]});
 const sp=attack({kind:'melee',actor:sapper,context});assert.equal(mods(sp)['height:melee'],0);assert.equal(mods(sp)['terrain:melee'],-1,'Sapeur supprime la hauteur, pas le terrain (contrat existant)');
 const size=attack({actorSize:4});assert.equal(mods(size)['size:ranged-target'],-1);
});

test('F2-B Claude 16 — Pointue recalcule le palier attaquant et défenseur',()=>{
 const action={type:'attack',attr:'CC',base:60,damage:4,qualities:[{id:'pointue'}]};
 const p=attack({kind:'melee',action,roll:40,defense:{base:60,roll:40,qualities:[{id:'pointue'}],v5:{kind:'melee',choice:'keep'}}});
 assert.equal(p.sl,3);assert.equal(p.resultTier.id,'success-3-4');assert.equal(p.test.resultTier.id,'success-3-4');
 assert.equal(p.defenderResultTier.id,'success-1-2');assert.equal(p.defenderTest.resultTier.id,'success-1-2');
});

test('F2-B Claude 19 — États niveau zéro et sources inactives sont ignorés dans les deux lectures',()=>{
 for(const state of [{key:'surpris',level:0},{key:'surpris',level:1,source:{talentId:'talent-underminer',source:{effectHash:'obsolete'}}}]){
  const p=attack({kind:'melee',target:subject('b',{states:[state]}),defense:{base:40,roll:80,v5:{kind:'melee'}}});
  assert.equal(p.test.details.modifiers.some(row=>row.id==='target:surprised'),false);
  assert.ok(p.defenderTest,'aucune interdiction de défense via conditionLevels');
 }
});

test('F2-B Claude 19 — caractérisation conditionLevels hors modificateurs de combat',()=>{
 const before=subject('a',{extensions:{v5:{hasMomentum:true}}});
 const after={...before,states:[{key:'surpris',level:0},{key:'a-terre',level:1,source:{talentId:'talent-underminer',source:{effectHash:'obsolete'}}}]};
 assert.deepEqual([...conditionLevels(after)],[]);
 assert.equal(momentumAfterChange(before,after).extensions.v5.hasMomentum,true,'un état nul ou une source de talent périmée ne compte pas comme nouvelle condition globale');
});

test('F2-B Claude 20 — difficulté positive refusée et dispersion déduite du groupe Lancer',()=>{
 const actor=subject('a',{talents:[{id:'talent-sharpshooter',status:'resolved',rank:1}]});
 assert.ok(attack({actor,context:{extraordinaryShot:true,extraordinaryShotDescription:'ricochet',extraordinaryShotDifficulty:1}}).unresolved.some(row=>row.includes('inférieure ou égale à zéro')));
 const thrown=attack({roll:95,action:{type:'attack',attr:'CT',base:60,damage:4,category:'Lancer'},context:{scatterDirectionRoll:1,scatterDistanceRolls:[10,9],shooterTargetDistanceYards:7}});
 assert.equal(thrown.scatter.maximumYards,3.5);assert.equal(thrown.scatter.distanceYards,3.5);
});

test('F2-B — six circonstances de Tir sont additives et portent uniquement sur le Test d’attaque', () => {
  const preview = attack({ target: subject('b',{states:[{key:'surpris',level:1}]}), context: { penalties: { cover: -1 },
    shotRange: 'point-blank', weather:'rain-wind', lighting:'dim', movedBeforeRangedAttack:true, aimedTargetId: 'b' } });
  assert.deepEqual(preview.unresolved, []);
  assert.equal(delta(preview), 0, 'bout portant +2, couvert -1, météo/lumière au niveau −2, mouvement −1, Surpris +1, Visée +1');
  assert.deepEqual(mods(preview), { 'penalty:cover': -1, 'range:point-blank': 2, 'weather-light:ranged': -2,
    'movement:ranged': -1, 'target:surprised-ranged': 1, 'aim:target': 1 });
  assert.equal(preview.defenderTest, null);
  const severe=attack({context:{weather:'rain-wind',lighting:'dark'}});
  assert.equal(mods(severe)['weather-light:ranged'],-3,'une seule pénalité environnementale au niveau le plus sévère');
  const proneTarget=attack({target:subject('b',{states:[{name:'À Terre',level:1}]}),context:{cover:true}});
  assert.equal(mods(proneTarget)['penalty:targetProne'],-1,'couvert et cible À Terre ne se cumulent pas');
  const inactive = attack({ context: { penalties: {} } });
  assert.equal(inactive.test.sl, attack().test.sl, 'aucune circonstance MJ ne s’invente');
});

test('F2-B — Tireur d’élite supprime le malus synthétique de couvert ou cible À Terre, sans fausse acquisition',()=>{
  const shooter=subject('a',{talents:[{id:'talent-sharpshooter',name:'Tireur d’élite',status:'resolved',rank:1}]});
  const prone=subject('b',{states:[{key:'prone',level:1}]});
  const actual=attack({actor:shooter,target:prone,context:{cover:true,shotRange:'medium'}});
  assert.equal(mods(actual)['penalty:targetProne'],0,'le vrai talent annule la pénalité de cible À Terre/couvert');
  const absent=attack({target:prone,context:{cover:true,shotRange:'medium'}});
  assert.equal(mods(absent)['penalty:targetProne'],-1,'sans acquisition, le malus p.166 reste appliqué une fois');
});

test('F2-B — Tir extraordinaire exige le vrai Tireur d’élite, une difficulté et une description MJ reçues',()=>{
  const base={extraordinaryShot:true,extraordinaryShotDescription:'ligne de tir presque impossible',extraordinaryShotDifficulty:-4};
  const shooter=subject('a',{talents:[{id:'talent-sharpshooter',name:'Tireur d’élite',status:'resolved',rank:1}]});
  const valid=attack({actor:shooter,context:base});
  assert.deepEqual(valid.unresolved,[]);assert.equal(mods(valid)['talent:sharpshooter-extraordinary'],-4);
  assert.deepEqual(valid.extraordinaryShot,{talentId:'talent-sharpshooter',description:base.extraordinaryShotDescription,difficulty:-4});
  const noTalent=attack({context:base});assert.ok(noTalent.unresolved.some(row=>/acquis et actif/.test(row)));
  const missingFact=attack({actor:shooter,context:{extraordinaryShot:true}});
  assert.ok(missingFact.unresolved.some(row=>/description MJ/.test(row)));assert.ok(missingFact.unresolved.some(row=>/difficulté en DR/.test(row)));
});

test('F2-B — Taille du tir applique Monstrueuse +2 seule et les autres rangs relatifs', () => {
  assert.equal(delta(attack({ actorSize: 3, targetSize: 4 })), 1);
  assert.equal(delta(attack({ actorSize: 3, targetSize: 5 })), 1);
  assert.equal(delta(attack({ actorSize: 6, targetSize: 6 })), 2, 'B-SIZE-01: cible Monstrueuse +2 même si le tireur l’est aussi');
  assert.equal(delta(attack({ actorSize: 3, targetSize: 6 })), 2, 'pas de cumul +1 taille supérieure et +2 Monstrueuse');
  assert.equal(delta(attack({ actorSize: 4, targetSize: 3 })), -1);
  assert.equal(delta(attack({ actorSize: 3, targetSize: 3 })), 0);
});

test('F2-B — Portées courte, moyenne, longue, extrême et bout portant suivent la portée MJ et exposent les aides d’allonge/portée', () => {
  const range = band => delta(attack({ context: { shotRange: band, weaponRangeYards: 20 } }));
  assert.deepEqual(['point-blank', 'short', 'medium', 'long', 'extreme'].map(range), [2, 1, 0, -1, -2]);
  const withBands = attack({ context: { shotRange: 'long', weaponRangeYards: 20 } });
  assert.equal(withBands.unresolved.length, 0, 'bande déclarée par le MJ suffit au DR');
  assert.deepEqual(withBands.rangeBands, { printedYards: 20, pointBlankYards: 4, shortYards: 10, mediumYards: 20, longYards: 40, extremeYards: 60 });
  const sbBands = attack({ actor: subject('a', { caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, I: 40 } }), action: { type: 'attack', attr: 'CT', base: 60, damage: 4, range: 'BF × 3' }, context: { shotRange: 'short' } });
  assert.equal(sbBands.rangeBands?.printedYards, 12);
  assert.equal(sbBands.rangeBands?.shortYards, 6);
  const veryLong = attack({ kind: 'melee', context: { weaponReach: 'Très longue' } });
  assert.equal(veryLong.reachGuide?.engagementYards, 4);
  const massive = attack({ kind: 'melee', context: { weaponReach: 'Massive' } });
  assert.equal(massive.reachGuide?.engagementYards, 6);
  const sniper = subject('a', { talents: [{ id: 'talent-sniper', name: 'Franc-tireur', status: 'resolved', rank: 1 }] });
  const sniperLong = attack({ actor: sniper, context: { shotRange: 'long', penalties: { longRange: -1 } } });
  assert.equal(mods(sniperLong)['range:long'], 0, 'Franc-tireur supprime longue portée sans double pénalité');
  assert.equal(mods(sniperLong)['penalty:longRange'], undefined);
});

test('F2-B — Mêlée cumule Surprise, hauteur, infériorité, Enchevêtré, terrain et espace exigu sans doubler B12', () => {
  const actor=subject('a'), target=subject('b', { states: [{ key: 'surpris', level: 1 }, { key: 'enchevetre', level: 1 }] });
  const ally=subject('ally',{camp:'pj'});
  const preview = attack({ kind: 'melee', actor, target,
    context: { difficultTerrain: true, narrowSpace: true, weaponReachBand:'superior', height: 'attacker', outnumberAttackerIds:['ally'] },
    v5State: { participants:[actor,target,ally] } });
  assert.deepEqual(preview.unresolved, []);
  assert.equal(preview.test.sl, 6, 'surnombre B12 conservé une fois; les autres facteurs applicables s’ajoutent');
  assert.equal(mods(preview)['target-surprised'], 2);
  assert.equal(preview.test.advantage.net >= 0, true);
  const noNarrowChoice = attack({ kind: 'melee', context: { confinedSpace: true, narrowSpace: true } });
  assert.ok(noNarrowChoice.unresolved.some(row => /allonge/i.test(row)));
  const shortReach=attack({kind:'melee',defense:{base:40,roll:80,label:'Esquive',v5:{kind:'test',choice:'keep'}},context:{narrowSpace:true,weaponReachBand:'short'}});
  assert.deepEqual(shortReach.unresolved,[]);assert.equal(shortReach.test.details.modifiers.some(row=>row.id==='confined:melee'),false);
  const enclosed=subject('a',{talents:[{id:'talent-enclosed-fighter',name:'Combattant en espace clos',status:'resolved',rank:1}]});
  const enclosedSuperior=attack({kind:'melee',actor:enclosed,context:{narrowSpace:true,weaponReachBand:'superior',penalties:{confined:-2}}});
  assert.equal(mods(enclosedSuperior)['confined:melee'],0,'Combattant en espace clos supprime le malus d’espace exigu sans doublon');
  const ambidextrous=subject('a',{talents:[{id:'talent-ambidextrous',name:'Ambidextre',status:'resolved',rank:1}]});
  assert.equal(mods(attack({kind:'melee',actor:ambidextrous,context:{secondWeaponAttack:true}}))['penalty:offHand'],0);
});

test('F2-B — attaques de Traits de créature reçoivent les modificateurs F2-B et les états inactifs/niveau 0 sont ignorés', () => {
  const creature = subject('a', { traits: [{ key: 'arme', name: 'Arme +7' }, { key: 'taille', name: 'Taille (Grande)' }] });
  const target = subject('b', { states: [{ key: 'surpris', level: 0 }, { key: 'enchevetre', level: 1 }, { key: 'aterre', level: 1, source: { talentId: 'talent-frenzy', source: { effectHash: 'sha256:expired' } } }] });
  const natural = attack({ kind: 'melee', actor: creature, target, context: { height: 'attacker', difficultTerrain: true } });
  assert.equal(mods(natural)['target:entangled'], 1);
  assert.equal(mods(natural)['height:melee'], 1);
  assert.equal(mods(natural)['terrain:melee'], -1);
  assert.equal(mods(natural)['target-surprised'], undefined, 'état de niveau 0 ignoré');
});

test('F2-B — attaquant À Terre garde son Désavantage et reçoit le −1 DR du tableau; défense hors rôle', () => {
  const prone = subject('a', { states: [{ key: 'aterre', level: 1 }] });
  const preview = attack({ kind: 'melee', actor: prone, choice:'reverse', defense: { base: 40, roll: 80, label: 'Esquive', v5: { kind: 'test' } } });
  assert.equal(preview.test.advantage.net, -1);
  assert.equal(mods(preview)['penalty:proneAttack'], -1);
  assert.equal(preview.defenderTest.details.modifiers.some(row=>row.id==='penalty:proneAttack'), false,
    'aucun modificateur d’attaque n’est copié sur la défense');
});

test('F2-B — les huit paliers distinguent succès +0 de l’échec −0', () => {
  const cases = [[60, 10, 'success-5-plus'], [60, 20, 'success-3-4'], [60, 40, 'success-1-2'],
    [60, 60, 'success-zero'], [60, 61, 'failure-zero'], [60, 70, 'failure-1-2'], [60, 90, 'failure-3-4'], [40, 90, 'failure-5-minus']];
  for (const [score, roll, tier] of cases) {
    const preview = attack({ action: { type: 'attack', attr: 'CT', base: score, damage: 1 }, roll });
    assert.equal(preview.test.resultTier?.id, tier, `${score}/${roll}`);
  }
});

test('F2-B — dispersion uniquement pour le Tir d’arme de jet raté, avec d10 relatif et demi-distance plafonnée',()=>{
  const failed=attack({roll:99,context:{throwingWeapon:true,fumbleRoll:1,scatterDirectionRoll:1,scatterDistanceRolls:[10,9],shooterTargetDistanceYards:7}});
  assert.deepEqual(failed.unresolved,[]);assert.deepEqual(failed.scatter,{directionRoll:1,direction:'haut-gauche',distanceRolls:[10,9],distanceYards:3.5,rolledDistanceYards:19,maximumYards:3.5});
  const shooter=attack({roll:99,context:{throwingWeapon:true,fumbleRoll:1,scatterDirectionRoll:9}});assert.equal(shooter.scatter.direction,'aux pieds du tireur');
  const target=attack({roll:99,context:{throwingWeapon:true,fumbleRoll:1,scatterDirectionRoll:10}});assert.equal(target.scatter.direction,'aux pieds de la cible');
  const missing=attack({roll:99,context:{throwingWeapon:true,fumbleRoll:1,scatterDirectionRoll:1,scatterDistanceRolls:[3,4]}});assert.ok(missing.unresolved.some(row=>/distance tireur-cible/i.test(row)));
  const nonThrow=attack({roll:99,context:{scatterDirectionRoll:1,scatterDistanceRolls:[3,4],shooterTargetDistanceYards:12}});assert.equal(nonThrow.scatter,null);
});
