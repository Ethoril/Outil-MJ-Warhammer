import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution, applyResolution, normalizeResolutionInput } from '../../../js/core/resolution.js';
import { getReferenceCatalogue, aggregateTalents } from '../../../js/core/reference-catalog.js';
import { conditionalV5KnifeQualities, calculateV5ArmorPenalty, parseV5Inflict, previewV5ImpaleProjectile, advanceV5NetEscape, applyV5SportSwordQuality, entanglementStrength, canUseV5PowderAmmunition, naturalWeaponDefaults, previewV5Blast, previewV5Fast, previewV5Hack, previewV5HookedNet, previewV5ProjectileExtraction, previewV5Inflict, previewV5Parry, previewV5WoundRecovery, previewV5PistolContact, previewV5Shield, previewV5Slash, previewV5Spread, previewV5TrapBlade, previewV5Wrap, validateV5ShieldHands } from '../../../js/core/v5-weapon-qualities.js';
import { decideCriticalDeath, updateCriticalDeathCountdown, createCriticalAftermathRecord, previewSuddenDeath } from '../../../js/core/v5-critical-aftermath.js';
import { createStore } from '../../../js/core/store.js';
import { getV5CriticalEffect } from '../../../js/data/v5-crits.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { activeEngines } from '../../../js/core/roll-qualities.js';
import { keywordMechanicalStatus } from '../../../js/core/keywords.js';
import { v5ShieldDefense, buildCombatTest } from '../../../js/core/v5-combat-rules.js';
import { ammunitionCompatibility, applyWeaponSkillRules, locationProtection } from '../../../js/core/equipment.js';
import { healV5Wounds } from '../../../js/core/v5-effects.js';
import { advanceV5Reload, beginV5Reload, consumeV5WeaponShot, createV5ReloadState, initialV5ReloadState } from '../../../js/core/v5-reloading.js';
import { previewCombatFailure } from '../../../js/core/v5-combat-fumbles.js';
import { ENGINES } from '../../../js/data/keyword-engines.js';
import { spawnSync } from 'node:child_process';
import { computeDamage } from '../../../js/core/damage.js';

describe('Qualités d\'armes T2', () => {
// Contre-vérification T2 (Claude) : Taille sans pièce touchée, Mortier de main du
// catalogue, qualités conditionnelles V5 du Couteau Bollock, refus de mort limité à un épisode.

const mk = (id, camp, extra = {}) => ({ id, name: id, camp, kind: 'PNJ', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 70, CT: 60, F: 40, E: 30, Ag: 40 }, skills: [], states: [], equipment: [], armor: {},
  extensions: { v5: { hasMomentum: false } }, ...extra });

function hackPreview(target, id) {
  const actor = mk('actor', 'allies');
  return previewResolution({ resolutionId: `hack-${id}`, actor, target, baseRevision: 0, round: 1, roll: 54,
    action: { id: 'x', type: 'attack', attr: 'CC', base: 70, damage: 'BF+4', qualities: [{ id: 'taille', parameter: '' }] },
    defense: { type: 'skill', label: 'CC', attr: 'CC', base: 30, roll: 90, qualities: [], v5: { kind: 'melee', context: {} } },
    v5: { kind: 'melee', context: {} }, attackContext: { ranged: false }, v5State: { participants: [actor, target] } });
}

test('Claude T2 — Taille ne bloque pas une touche sans pièce d’armure ni bouclier à la localisation', () => {
  const unarmoured = hackPreview(mk('t', 'foes'), 'none');
  assert.ok(!unarmoured.unresolved.some(line => /Taille/.test(line)), JSON.stringify(unarmoured.unresolved));
  const otherLocation = hackPreview(mk('t', 'foes', { equipment: [{ id: 'H', kind: 'armour', name: 'Calotte',
    category: 'Cuir Souple', ap: 1, locations: ['head'], layer: 'soft', keywords: [] }] }), 'other');
  assert.ok(!otherLocation.unresolved.some(line => /Taille/.test(line)), JSON.stringify(otherLocation.unresolved));
});

test('Claude T2 — Taille exige toujours la pièce frappée quand une pièce couvre la localisation', () => {
  const mail = { id: 'M', kind: 'armour', name: 'Cotte', category: 'Mailles', ap: 2,
    locations: ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'], layer: 'chain', keywords: [] };
  const armoured = hackPreview(mk('t', 'foes', { equipment: [mail] }), 'mail');
  assert.ok(armoured.unresolved.some(line => /Taille : pièce ou bouclier touché requis/.test(line)));
});

test('Claude T2 — le Mortier de main du catalogue explose sur maladresse au rechargement (L13 p.103)', () => {
  const catalogue = getReferenceCatalogue();
  const item = { ...structuredClone(catalogue.items.find(row => row.name === 'Mortier de main (2M)' && row.kind === 'weapon')), id: 'w1', extensions: {} };
  const actor = mk('actor', 'allies', { kind: 'PJ', equipment: [item] });
  const preview = previewResolution({ resolutionId: 'mortar', actor, baseRevision: 0, round: 1, roll: 66,
    action: { id: 'x', type: 'skill', attr: 'CT', base: 20, label: 'Recharge', extensions: { fiche: { equipmentId: 'w1' } } },
    v5: { kind: 'test', context: { reloading: true, fumbleRoll: 3, weaponDamageMaximum: 12 } }, v5State: { participants: [actor] } });
  assert.ok(preview.unresolved.some(line => /bras directeur touché/.test(line)), JSON.stringify(preview.unresolved));
  const resolved = previewResolution({ resolutionId: 'mortar-with-arm', actor, baseRevision: 0, round: 1, roll: 66,
    action: { id: 'x', type: 'skill', attr: 'CT', base: 20, label: 'Recharge', extensions: { fiche: { equipmentId: 'w1' } } },
    v5: { kind: 'test', context: { reloading: true, fumbleRoll: 3, weaponExplosionArmSide: 'right' } },
    v5State: { participants: [actor] } });
  assert.ok(resolved.combatFailure?.effects?.some(effect => effect.type === 'weapon-explosion' && effect.damage === 7 && effect.damageMode === 'profile-at-zero-sl' && effect.sl === 0 && effect.armSide === 'right'),
    JSON.stringify(resolved.combatFailure?.effects));
});

test('Claude T2 — le Couteau Bollock gagne Pointue V5 (pas Précise V4) contre une cible À Terre', () => {
  const ids = rows => rows.map(row => typeof row === 'string' ? row : row.id).sort();
  const base = [{ id: 'perforante' }, { id: 'empaleuse' }, { id: 'pointue' }];
  assert.deepEqual(ids(conditionalV5KnifeQualities({ qualities: base, targetProne: true }).qualities), ['empaleuse', 'perforante', 'pointue']);
  assert.deepEqual(ids(conditionalV5KnifeQualities({ qualities: base }).qualities), ['perforante']);
});

test('Claude T2 — un refus de mort ne vaut que pour un épisode : un nouvel Inconscient rouvre le décompte', () => {
  let p = { id: 'p', name: 'p', kind: 'PJ', hp: 0, caracs: { E: 20 }, states: [{ id: 'u', key: 'inconscient', name: 'Inconscient', level: 1 }],
    extensions: { v5: { criticalWounds: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] } } };
  p = updateCriticalDeathCountdown(p, { round: 1, toughnessBonus: 2 }).participant;
  p = updateCriticalDeathCountdown(p, { round: 3, toughnessBonus: 2 }).participant;
  const declined = decideCriticalDeath(p, { decision: 'decline', round: 3 });
  assert.equal(declined.participant.extensions.v5.dead, undefined);
  p = declined.participant;
  assert.equal(updateCriticalDeathCountdown(p, { round: 4, toughnessBonus: 2 }).status, 'declined', 'même épisode : refus maintenu');
  p = { ...p, extensions: { v5: { ...p.extensions.v5, criticalWounds: [{ id: 'a' }, { id: 'b' }] } } };
  p = updateCriticalDeathCountdown(p, { round: 5, toughnessBonus: 2 }).participant;
  p = { ...p, extensions: { v5: { ...p.extensions.v5, criticalWounds: [{ id: 'a' }, { id: 'b' }, { id: 'n1' }] } } };
  const second = updateCriticalDeathCountdown(p, { round: 20, toughnessBonus: 2 });
  assert.equal(second.status, 'countdown');
  assert.equal(second.participant.extensions.v5.dead, undefined);
});
});

describe('Qualités d\'armes T2bis', () => {
// Contre-vérification T2 bis (Claude) : armure d'inventaire des dégâts incidents,
// Discrétion par catégorie marquée, Empaleuse des armes de jet et de siège, Bolas « ; »,
// recharge de l'arquebuse à salve, cible absente, créatures en mort subite, report de la main fendue.

const catalogue = getReferenceCatalogue();
const item = id => structuredClone(catalogue.items.find(row => row.id === id || row.baseId === id));
const byName = name => structuredClone(catalogue.items.find(row => row.name === name));
const memory = () => { let saved; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };
const mk = (id, equipment = [], extra = {}) => ({ id, name: id, hp: 30, maxHp: 30, zone: 'active', camp: 'x',
  caracs: { CC: 50, CT: 50, F: 40, E: 30, Ag: 40, I: 30 }, armor: {}, states: [], skills: [], talents: [],
  equipment, extensions: { v5: {} }, ...extra });

test('Claude T2 bis — l’allié touché par maladresse garde les PA de plates (Points faibles) et de mailles', () => {
  const hpAfter = armour => {
    const actor = mk('shooter', [], { hp: 12 });
    const ally = mk('ally', armour.map(row => ({ ...row, worn: true })), { hp: 20 });
    const foe = { ...mk('foe'), camp: 'foes' };
    const participants = [actor, ally, foe];
    const preview = previewResolution({ actor, target: foe, action: { type: 'attack', attr: 'CT', base: 10, damage: 'BF+2' }, roll: 99,
      baseRevision: 0, round: 1, v5State: { participants }, attackContext: { ranged: true },
      v5: { kind: 'ranged', context: { fumbleRoll: 10, allyCandidates: ['ally'], fumbleAllySelectionRoll: 50, fumbleAllyUnitsRoll: 3 } } });
    assert.deepEqual(preview.unresolved, []);
    return applyResolution(preview, { revision: 0, round: 1, participants }).state.participants.find(row => row.id === 'ally').hp;
  };
  const bare = hpAfter([]);
  assert.equal(hpAfter([item('armour-armures-mailles-cotte-de-mailles')]), bare + 2);
  assert.equal(hpAfter([item('armour-armures-plates-plastron')]), bare + 2);
});

test('Claude T2 bis — Discrétion : une pénalité par catégorie marquée au catalogue', () => {
  const worn = names => names.map(name => ({ ...byName(name), worn: true }));
  assert.equal(calculateV5ArmorPenalty({ worn: worn(['Cotte de mailles', 'Brassards']) }).stealthDr, -2);
  assert.equal(calculateV5ArmorPenalty({ worn: worn(['Brassards', 'Jambières d’acier']) }).stealthDr, -1);
  assert.equal(calculateV5ArmorPenalty({ worn: [] }).stealthDr, 0);
});

test('Claude T2 bis — Empaleuse : projectile générique pour les armes de jet et de siège du catalogue', () => {
  for (const name of ['Javelot', 'Javelot Blackbriar elfe sylvain', 'Canon Pivotant (avec balles) Nain', 'Baliste navale']) {
    const weapon = byName(name);
    const lodged = previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: true, critical: true, participantId: 'b',
      weaponId: weapon.id, weaponName: weapon.name, weaponCategory: weapon.category });
    assert.equal(lodged.ready, true, `${name} : ${JSON.stringify(lodged.unresolved)}`);
  }
});

test('Claude T2 bis — Bolas : « ; » sépare aussi les deux états de l’Inflige', () => {
  assert.equal(parseV5Inflict('Empêtré 35 ; À terre', 40).ready, true);
});

test('Claude T2 bis — l’arquebuse à salve recharge de 1 + DR positifs (décision du MJ)', () => {
  const base = item('weapon-armes-a-distance-arbalete-baliste-faucheuse-reaper-bolt-thrower-druchii');
  const volley = { ...base, id: 'volley', name: 'Arquebuse à salve', damage: '+10', reload: 4, category: 'Poudre Noire',
    keywords: [{ id: 'a-poudre-noire', parameter: '' }, { id: 'salve', parameter: '4' }, { id: 'recharge', parameter: '4' }] };
  const preview = previewResolution({ actor: mk('a', [volley]), target: mk('b'), roll: 10, baseRevision: 0, round: 1,
    action: { type: 'test', attr: 'CT', base: 60, extensions: { fiche: { equipmentId: 'volley' } } },
    v5: { kind: 'test', context: { reloading: true, crewCount: 2, weaponReload: 4 } } });
  const progress = preview.combatFailure.effects.find(row => row.type === 'reload-progress');
  assert.equal(progress.successes, 6, 'réussite à +5 DR');
});

test('Claude T2 bis — une cible qui a quitté la rencontre est refusée sans planter', async () => {
  const store = createStore({ storage: null, persistence: memory() }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a'], participants: [{ ...mk('a'), kind: 'PJ' }] },
    extensions: { v5: { combatId: 'cv', turnIndex: 1 } }, log: [], diceLines: [] });
  const preview = store.previewResolution({ actorId: 'a', targetId: 'ghost', roll: 40,
    action: { id: 'x', type: 'attack', attr: 'CC', base: 50, damage: 4 },
    defense: { type: 'skill', attr: 'CC', base: 50, roll: 70, label: 'Corps à corps', v5: { kind: 'melee', choice: 'keep' } },
    v5: { kind: 'melee', choice: 'keep', context: {} } });
  assert.equal(preview.ready, false);
  assert.equal(preview.code, 'TARGET_NOT_FOUND');
});

test('Claude T2 bis — mort subite : une créature confirmée figurant est éligible, jamais un PJ', () => {
  const at0 = kind => ({ id: kind, name: kind, kind, hp: 0, talents: [], extensions: { v5: {} } });
  const options = { tableOptionEnabled: true, secondaryNpcConfirmed: true };
  assert.equal(previewSuddenDeath(at0('Créature'), options).status, 'choice-required');
  assert.equal(previewSuddenDeath(at0('PJ'), options).status, 'ineligible');
});

test('Claude T2 bis — main fendue : « Non » à la perte de tous les doigts se reporte au Round suivant', async () => {
  const person = id => ({ ...mk(id), kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20 });
  const effectRoll = Array.from({ length: 200 }, (_, i) => i + 1).find(roll => getV5CriticalEffect('ARM', roll)?.source?.printedName === 'Cleft Hand');
  const source = createCriticalAftermathRecord(person('hero'), { table: 'ARM', effectRoll, resolutionId: 'sh', round: 1 });
  const store = createStore({ storage: null, persistence: memory() }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero', 'foe'], participants: [source.participant, person('foe')] },
    log: [], diceLines: [], extensions: { v5: { combatId: 'x', turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const id = source.record.id;
  const finger = store.previewAmputationShock({ participantId: 'hero', criticalId: id, amputationOccurred: true, difficultyDR: -1, test: { success: true, sl: 0 } });
  await store.applyAmputationShock(finger);
  const pending = store.previewAmputationShock({ participantId: 'hero', criticalId: id });
  // Same part the workspace view now derives when the preview carries no shockPart.
  const part = pending.shockPart || pending.requirements[0]?.part;
  assert.equal(part, 'hand');
  await store.deferAmputationShock('hero', id, part);
  assert.equal(store.previewAmputationShock({ participantId: 'hero', criticalId: id }).status, 'deferred');
});
});

describe('Qualités F2-D (caractérisation)', () => {
test('F2-D characterization — existing roll engines remain covered and deduplicated', () => {
  for (const id of ['inoffensive', 'percutante', 'devastatrice', 'pointue', 'imprecise', 'defensive', 'desequilibree', 'precise', 'empaleuse', 'dangereuse']) {
    assert.equal(keywordMechanicalStatus(id).status, 'covered', `${id} is an existing mechanical contract`);
  }

  const engines = activeEngines([{ id: 'percutante' }, { id: 'impact' }, { id: 'pointue' }]);
  assert.deepEqual(engines.map(row => row.id), ['percutante', 'pointue']);
});

test('F2-D characterization — legacy Protectrice shield requires explicit held-shield opposition', () => {
  const shield = { id: 'old-shield', kind: 'shield', keywords: [{ id: 'protectrice', parameter: '2' }] };
  const target = { equipment: [shield] };
  const confirmed = v5ShieldDefense({
    target,
    defense: { type: 'test' },
    protectionContext: { shieldId: shield.id, shieldAvailable: true, opposedWithShield: true }
  });
  assert.deepEqual(confirmed, { confirmed: true, rangedDodgeAllowed: true, rating: 2, unresolved: null });

  const notChosen = v5ShieldDefense({
    target,
    defense: { type: 'test' },
    protectionContext: { shieldId: shield.id, shieldAvailable: true, opposedWithShield: false }
  });
  assert.equal(notChosen.confirmed, false);
  assert.equal(notChosen.rating, null);
});

test('F2-D characterization — V5 Bouclier is covered by its resolution flow, separate from legacy Protectrice', () => {
  const status = keywordMechanicalStatus('bouclier');
  assert.equal(status.status, 'covered');
  assert.equal(status.engine.scope, 'resolution-quality');
  assert.equal(status.engine.engine, 'v5-shield');
});
});

describe('Qualités d\'armes', () => {
const q = (id, parameter = '') => ({ id, parameter });

test('F2-D pure proposal — Explosion uses only GM targets, omits SL damage, keeps Conditions', () => {
  const preview = previewV5Blast({ qualities: [q('explosion', '3'), q('devastatrice')], targetIds: ['a', 'b', 'a'],
    weaponDamage: 7, unitsDie: 4, conditions: [{ key: 'enflamme' }] });
  assert.equal(preview.ready, true);
  assert.deepEqual(preview.targets.map(row => row.participantId), ['a', 'b']);
  assert.deepEqual(preview.targets[0], { participantId: 'a', damage: 11, slDamage: 0, opposed: false, conditions: [{ key: 'enflamme' }] });
  assert.equal(previewV5Blast({ qualities: [q('explosion', '3')], targetIds: ['a'], weaponDamage: 7 }).targets[0].damage, 7);
  assert.match(previewV5Blast({ qualities: [q('explosion', '3')], weaponDamage: 7 }).unresolved[0], /cibles désignées/u);
});

test('F2-D pure proposal — Rapide applies only to attacks with one weapon', () => {
  assert.equal(previewV5Fast({ qualities: ['rapide'], isAttack: true }).initiativeBonus, 2);
  assert.equal(previewV5Fast({ qualities: ['rapide'], isAttack: true, secondWeaponAttack: true }).initiativeBonus, 0);
  assert.equal(previewV5Fast({ qualities: ['rapide'], isAttack: true, dualWielding: true }).initiativeBonus, 0);
  assert.equal(previewV5Fast({ qualities: ['rapide'], isAttack: false }).initiativeBonus, 0);
});

test('F2-D Rapide — affiche +2 Initiative sur cette attaque pour arbitrage MJ, sans DR ni fiche',()=>{
  const actor={id:'fast',camp:'allies',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const target={id:'foe',camp:'foes',hp:20,maxHp:20,caracs:{E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const preview=previewResolution({actor,target,round:1,baseRevision:0,roll:30,action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('rapide')]},attackContext:{ranged:false},v5:{kind:'melee',context:{}}});
  assert.equal(preview.fast.initiativeBonus,2);assert.ok(preview.reminders.some(text=>/Rapide : \+2 Initiative pour cette attaque uniquement/u.test(text)));
  assert.equal(preview.test.details.totalModifier,0,'Rapide ne modifie pas les DR');
  const dual=previewResolution({actor,target,round:1,baseRevision:0,roll:30,action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('rapide')]},attackContext:{ranged:false},v5:{kind:'melee',context:{dualWielding:true}}});
  assert.equal(dual.fast.initiativeBonus,0);
  const second=previewResolution({actor,target,round:1,baseRevision:0,roll:30,action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('rapide')]},attackContext:{ranged:false},v5:{kind:'melee',context:{secondWeaponAttack:true}}});
  assert.equal(second.fast.initiativeBonus,0);
});

test('F2-D pure proposal — Taille damages only the named struck armour piece', () => {
  assert.deepEqual(previewV5Hack({ qualities: ['taille'], hit: true, struckItemId: 'mail-coat', currentAp: 2 }).damage,
    { itemId: 'mail-coat', before: 2, after: 1, amount: 1 });
  assert.equal(previewV5Hack({ qualities: ['taille'], hit: true, struckItemId: 'buckler', currentAp: 0 }).damage.after, 0);
  assert.equal(previewV5Hack({ qualities: ['taille'], hit: false, struckItemId: 'mail-coat', currentAp: 2 }).damage, null);
  assert.equal(previewV5Hack({ qualities: ['taille'], hit: true, currentAp: 2 }).ready, false);
});

test('F2-D résolution — Taille retire 1 PA de la seule pièce choisie avant les dégâts',()=>{
  const actor={id:'hacker',camp:'allies',zone:'active',hp:20,caracs:{CT:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const armour={id:'mail',kind:'armour',name:'Cotte',ap:2,layer:'mail',locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[]};
  const target={id:'armoured',camp:'foes',zone:'active',hp:20,caracs:{E:30},states:[],skills:[],equipment:[armour],extensions:{v5:{}}};
  const preview=previewResolution({actor,target,round:1,baseRevision:0,roll:21,action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('taille')]},
    attackContext:{ranged:true},v5:{kind:'ranged',context:{struckItemId:'mail'}}});
  assert.equal(preview.unresolved.length,0,preview.unresolved.join('; '));
  assert.equal(preview.hack.damage.after,1);
  assert.equal(preview.protection.ap,1);
  assert.equal(preview.damage.targetArmour,1);
});

test('F2-D Store — Taille persiste la pièce frappée, affecte le coup suivant, survit au reload et Undo',async()=>{
  let saved=null;const io={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({storage:null,persistence:io});await store.ready;
  const actor={id:'hacker',name:'Hacker',kind:'PJ',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CT:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const armour={id:'mail',kind:'armour',name:'Cotte',ap:2,layer:'mail',locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[]};
  const target={id:'armoured',name:'Armoured',kind:'PNJ',camp:'foes',zone:'active',hp:40,maxHp:40,caracs:{E:30},states:[],skills:[],equipment:[armour],extensions:{v5:{}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},log:[],diceLines:[]});
  const makePlan=(id)=>store.previewResolution({actorId:actor.id,targetId:target.id,resolutionId:id,roll:21,round:1,
    action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('taille')]},attackContext:{ranged:true},v5:{kind:'ranged',context:{struckItemId:'mail'}}});
  let first=makePlan('taille-one');assert.equal(first.protection.ap,1);assert.equal((await store.applyResolution(first)).status,'applied');
  assert.equal(store.listParticipants().find(row=>row.id===target.id).extensions.v5.armorDamageByItem.mail,1);
  const restored=createStore({storage:null,persistence:io});await restored.ready;await restored.loadFromJSON(store.getFullJSON());
  assert.equal(restored.listParticipants().find(row=>row.id===target.id).extensions.v5.armorDamageByItem.mail,1);
  const second=restored.previewResolution({actorId:actor.id,targetId:target.id,resolutionId:'taille-two',roll:21,round:1,
    action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('taille')]},attackContext:{ranged:true},v5:{kind:'ranged',context:{struckItemId:'mail'}}});
  assert.equal(second.protection.ap,0,'la pièce reste dégradée au coup suivant');
  assert.equal(second.hack.damage.after,0);
  assert.equal((await restored.applyResolution(second)).status,'applied');
  assert.equal(restored.listParticipants().find(row=>row.id===target.id).extensions.v5.armorDamageByItem.mail,2);
  assert.equal(await store.undo(),true);
  assert.equal(store.listParticipants().find(row=>row.id===target.id).extensions.v5.armorDamageByItem?.mail,undefined,'Undo annule aussi la dégradation');
});

test('F2-D Store — Taille peut frapper le bouclier choisi et persiste sa dégradation',async()=>{
  const store=createStore({storage:null});await store.ready;
  const actor={id:'hacker',name:'Hacker',kind:'PJ',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const shield={id:'buckler',kind:'shield',name:'Bouclier',ap:2,locations:[],keywords:[q('bouclier')]};
  const target={id:'guard',name:'Guard',kind:'PNJ',camp:'foes',zone:'active',hp:30,maxHp:30,caracs:{E:30},states:[],skills:[],equipment:[shield],extensions:{v5:{}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},log:[],diceLines:[]});
  const preview=store.previewResolution({actorId:actor.id,targetId:target.id,resolutionId:'taille-shield',roll:21,round:1,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('taille')]},attackContext:{ranged:false},
    protectionContext:{shieldId:'buckler',shieldAvailable:true,opposedWithShield:true,defenseProvided:true,ranged:false},
    defense:{type:'skill',label:'Esquive',attr:'Ag',base:40,roll:40,v5:{kind:'test',context:{}}},
    v5:{kind:'melee',context:{struckItemId:'buckler'}}});
  assert.equal(preview.unresolved.length,0,preview.unresolved.join('; '));assert.equal(preview.protection.ap,1);assert.equal(preview.hack.damage.itemId,'buckler');
  assert.equal((await store.applyResolution(preview)).status,'applied');
  assert.equal(store.listParticipants().find(row=>row.id===target.id).extensions.v5.armorDamageByItem.buckler,1);
});

test('F2-D Store — Entaille applique Hémorragique au critique, dépense 1 Élan pour +1 et s’annule',async()=>{
  let saved=null;const io={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({storage:null,persistence:io});await store.ready;
  const actor={id:'slasher',name:'Slasher',kind:'PJ',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{hasMomentum:true}}};
  const target={id:'victim',name:'Victim',kind:'PNJ',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},log:[],diceLines:[]});
  const plan=store.previewResolution({actorId:actor.id,targetId:target.id,resolutionId:'entaille-hit',roll:11,round:1,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('entaille','2 A')]},attackContext:{ranged:false},
    defense:{type:'skill',label:'Corps à corps',attr:'CC',base:30,roll:45,v5:{kind:'melee',context:{}}},
    criticalRolls:{location:45,effect:80},v5:{kind:'melee',context:{entailleMomentumSpend:1}}});
  assert.equal(plan.slash.bleedingConditions,2);assert.equal(plan.slash.momentumSpent,1);
  assert.ok(plan.targetConditionApplication.some(row=>row.key==='hemorragique'&&row.level===2));
  assert.equal(plan.momentum.find(row=>row.participantId===actor.id).after,false);
  const applied=await store.applyResolution(plan);assert.equal(applied.status,'applied',applied.reason||plan.unresolved.join('; '));
  const updated=store.listParticipants().find(row=>row.id===target.id);assert.equal(updated.states.filter(row=>row.key==='hemorragique').reduce((sum,row)=>sum+row.level,0),2);
  assert.equal(store.listParticipants().find(row=>row.id===actor.id).extensions.v5.hasMomentum,false);
  const reloaded=createStore({storage:null,persistence:io});await reloaded.ready;await reloaded.loadFromJSON(store.getFullJSON());
  assert.equal(reloaded.listParticipants().find(row=>row.id===target.id).states.filter(row=>row.key==='hemorragique').reduce((sum,row)=>sum+row.level,0),2);
  assert.equal(reloaded.listParticipants().find(row=>row.id===actor.id).extensions.v5.hasMomentum,false);
  assert.equal(await store.undo(),true);assert.equal(store.listParticipants().find(row=>row.id===target.id).states.some(row=>row.key==='hemorragique'),false);
  assert.equal(store.listParticipants().find(row=>row.id===actor.id).extensions.v5.hasMomentum,true);
  const oneAdvantage=previewResolution({actor,target,round:1,baseRevision:0,roll:11,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('entaille','1 A')]},attackContext:{ranged:false},
    defense:{type:'skill',label:'Corps à corps',attr:'CC',base:30,roll:45,v5:{kind:'melee',context:{}}},criticalRolls:{location:45,effect:80},
    v5:{kind:'melee',context:{entailleMomentumSpend:1}}});
  assert.equal(oneAdvantage.slash.bleedingConditions,2,'le paramètre V4 1A ne multiplie pas l’effet V5');
});

test('F2-D Piège-lame Store — critique remplace, lâche, bloque puis permet un ramassage confirmé et annulable',async()=>{
  let saved=null;const io={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({storage:null,persistence:io});await store.ready;
  const sword={id:'enemy-sword',kind:'weapon',name:'Épée',category:'Escrime',damage:4,keywords:[]};
  const actor={id:'attacker',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],states:[],equipment:[sword],extensions:{v5:{}}};
  const target={id:'defender',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:50,F:30,E:30},skills:[],states:[],talents:[],equipment:[],extensions:{v5:{}}};
  const input={actor,target,round:1,baseRevision:0,roll:35,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:sword.id}}},
    defense:{type:'attack',label:'Corps à corps',attr:'CC',base:50,roll:11,qualities:[q('piege-lame')],
      v5:{kind:'melee',context:{trapBladeChoice:true,opponentWeaponType:'blade',defenderSize:2,opponentSize:2}}},
    defenderCriticalRolls:{location:45,effect:80},v5:{kind:'melee',context:{actorSize:2,targetSize:2}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},log:[],diceLines:[]});
  const {actor:_actor,target:_target,baseRevision:_baseRevision,...request}=input;
  const preview=store.previewResolution({actorId:actor.id,targetId:target.id,...request});
  assert.equal(preview.weaponTrap?.disposition,'dropped');assert.equal(preview.defenderCritical.kind,'Piège-lame');
  assert.equal(preview.defenderCritical.application.extraWounds,0);
  const trapApply=await store.applyResolution(preview);assert.equal(trapApply.status,'applied',JSON.stringify({status:trapApply.status,reason:trapApply.reason,previewRevision:preview.baseRevision,storeRevision:store.revision}));
  const dropped=store.listParticipants().find(row=>row.id===actor.id).equipment[0];assert.equal(dropped.extensions.v5.weaponDisposition,'dropped');
  const retry=store.previewResolution({actorId:actor.id,targetId:target.id,round:1,resolutionId:'reuse-dropped',roll:35,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:sword.id}}},defense:input.defense,
    defenderCriticalRolls:input.defenderCriticalRolls,v5:input.v5});
  assert.match(retry.unresolved.join('; '),/lâchée ou saisie/u);
  const restored=createStore({storage:null,persistence:io});await restored.ready;await restored.loadFromJSON(store.getFullJSON());
  const collisionState={schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id,'other-owner'],participants:restored.listParticipants().map(row=>structuredClone(row))},log:[],diceLines:[]};
  collisionState.combat.participants.push({id:'other-owner',camp:'foes',zone:'active',hp:10,maxHp:10,caracs:{CC:20},skills:[],states:[],equipment:[{id:sword.id,kind:'weapon',name:'Autre épée',extensions:{v5:{weaponDisposition:'dropped'}}}],extensions:{v5:{}}});
  const collisionStore=createStore({storage:null,persistence:io});await collisionStore.ready;await collisionStore.loadFromJSON(collisionState);
  const collision=collisionStore.previewResolution({actorId:target.id,round:1,resolutionId:'pick-up-collision',action:{type:'test',attr:'CC',base:0},v5:{kind:'test',context:{recoverDroppedWeaponId:sword.id}}});
  assert.match(collision.unresolved.join('; '),/conflit d’identifiant/u);assert.equal(collision.weaponTrapRecovery,null);
  const explicit=collisionStore.previewResolution({actorId:target.id,round:1,resolutionId:'pick-up-specific-owner',action:{type:'test',attr:'CC',base:0},v5:{kind:'test',context:{recoverDroppedWeaponId:sword.id,recoverDroppedWeaponOwnerId:'other-owner'}}});
  assert.equal(explicit.weaponTrapRecovery.fromParticipantId,'other-owner');assert.equal(explicit.unresolved.length,0,explicit.unresolved.join('; '));
  assert.equal((await collisionStore.applyResolution(explicit)).status,'applied');
  assert.equal(collisionStore.listParticipants().find(row=>row.id==='other-owner').equipment.length,0);
  assert.equal(collisionStore.listParticipants().find(row=>row.id===target.id).equipment.some(row=>row.id===sword.id),true);
  const recovery=restored.previewResolution({actorId:actor.id,round:1,resolutionId:'pick-up-sword',action:{type:'test',attr:'CC',base:0},v5:{kind:'test',context:{recoverDroppedWeaponId:sword.id,recoverDroppedWeaponOwnerId:actor.id}}});
  assert.ok(recovery.weaponTrapRecovery);assert.equal(recovery.unresolved.length,0,recovery.unresolved.join('; '));
  assert.equal((await restored.applyResolution(recovery)).status,'applied');
  assert.equal(restored.listParticipants().find(row=>row.id===actor.id).equipment[0].extensions?.v5?.weaponDisposition,undefined);
  assert.equal(await restored.undo(),true);assert.equal(restored.listParticipants().find(row=>row.id===actor.id).equipment[0].extensions.v5.weaponDisposition,'dropped');
});

test('F2-D Incassable — bloque le bris du Piège-lame, mais pas le désarmement',()=>{
  const make=(unbreakable)=>{
    const sword={id:unbreakable?'unbreakable-sword':'breakable-sword',kind:'weapon',name:'Épée',category:'Escrime',damage:4,keywords:unbreakable?[q('incassable')]:[]};
    const actor={id:'attacker-'+unbreakable,camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],states:[],equipment:[sword],extensions:{v5:{}}};
    const target={id:'defender-'+unbreakable,camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:50,F:40,E:30},skills:[],states:[],talents:[],equipment:[],extensions:{v5:{}}};
    const input={actor,target,round:1,baseRevision:0,roll:35,resolutionId:'trap-break-'+unbreakable,
      action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:sword.id}}},
      defense:{type:'attack',label:'Corps à corps',attr:'CC',base:50,roll:11,qualities:[q('piege-lame')],
        v5:{kind:'melee',context:{trapBladeChoice:true,opponentWeaponType:'blade',defenderSize:2,opponentSize:2,trapBladeChooseBreak:true,trapBladeStrengthTest:{base:60,roll:20}}}},
      defenderCriticalRolls:{location:45,effect:80},v5:{kind:'melee',context:{actorSize:2,targetSize:2}}};
    return {actor,target,sword,input,preview:previewResolution(input)};
  };
  const breakable=make(false),unbreakable=make(true);
  assert.equal(breakable.preview.weaponTrap.disposition,'broken');
  assert.equal(unbreakable.preview.weaponTrap.disposition,'dropped');
  assert.equal(unbreakable.preview.weaponTrap.receipt.breakBlockedByUnbreakable,true);
  const brokenState={revision:0,round:1,participants:[breakable.actor,breakable.target],appliedResolutionIds:[]};
  const brokenApply=applyResolution(breakable.preview,brokenState);assert.equal(brokenApply.status,'applied');
  assert.equal(brokenApply.state.participants.find(row=>row.id===breakable.actor.id).equipment[0].extensions.v5.weaponDisposition,'broken');
  const state={revision:0,round:1,participants:[unbreakable.actor,unbreakable.target],appliedResolutionIds:[]};
  const applied=applyResolution(unbreakable.preview,state);assert.equal(applied.status,'applied');
  const sword=applied.state.participants.find(row=>row.id===unbreakable.actor.id).equipment[0];
  assert.equal(sword.extensions.v5.weaponDisposition,'dropped','Incassable n’empêche pas le désarmement');
});

test('F2-D Piège-lame — Talent Désarmement transfère l’arme saisie pour 1 Élan, Undo et reload',async()=>{
  let saved=null;const io={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({storage:null,persistence:io});await store.ready;
  const sword={id:'caught-sword',kind:'weapon',name:'Épée',category:'Escrime',damage:4,keywords:[]};
  const actor={id:'attacker-catch',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],states:[],equipment:[sword],extensions:{v5:{}}};
  const target={id:'defender-catch',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:50,F:30,E:30},skills:[],talents:[{id:'talent-disarm'}],states:[],equipment:[],extensions:{v5:{hasMomentum:false}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},log:[],diceLines:[]});
  const preview=store.previewResolution({actorId:actor.id,targetId:target.id,round:1,roll:35,resolutionId:'trap-catch',
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:sword.id}}},
    defense:{type:'attack',label:'Corps à corps',attr:'CC',base:50,roll:11,qualities:[q('piege-lame')],
      v5:{kind:'melee',context:{trapBladeChoice:true,opponentWeaponType:'blade',defenderSize:2,opponentSize:2,trapBladeCatch:true,trapBladeSpendMomentum:true}}},
    defenderCriticalRolls:{location:45,effect:80},v5:{kind:'melee',context:{actorSize:2,targetSize:2}}});
  assert.equal(preview.weaponTrap.disposition,'caught');assert.equal(preview.momentum.find(row=>row.participantId===target.id).after,false);
  assert.ok(preview.momentum.find(row=>row.participantId===target.id).details.some(row=>row.eventId==='trap-catch:trap-blade-catch'));
  const contradictory=previewResolution({actor,target,round:1,roll:35,resolutionId:'trap-catch-and-break',
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:sword.id}}},
    defense:{type:'attack',label:'Corps à corps',attr:'CC',base:50,roll:11,qualities:[q('piege-lame')],v5:{kind:'melee',context:{trapBladeChoice:true,opponentWeaponType:'blade',defenderSize:2,opponentSize:2,trapBladeCatch:true,trapBladeSpendMomentum:true,trapBladeChooseBreak:true,trapBladeStrengthTest:{base:60,roll:20}}}},
    defenderCriticalRolls:{location:45,effect:80},v5:{kind:'melee',context:{actorSize:2,targetSize:2}}});
  assert.equal(contradictory.weaponTrap.disposition,'broken');assert.ok(contradictory.weaponTrap.catch);
  assert.equal(contradictory.unresolved.length,0,contradictory.unresolved.join('; '));
  const sequenceState={revision:0,round:1,participants:[actor,target],appliedResolutionIds:[]};
  const sequenceApplied=applyResolution(contradictory,sequenceState);assert.equal(sequenceApplied.status,'applied');
  const transferred=sequenceApplied.state.participants.find(row=>row.id===target.id).equipment.find(row=>row.id===sword.id);
  assert.equal(transferred.extensions.v5.weaponDisposition,'broken');assert.equal(transferred.extensions.v5.weaponTrap.caughtBy,target.id);
  assert.equal((await store.applyResolution(preview)).status,'applied');
  assert.equal(store.listParticipants().find(row=>row.id===actor.id).equipment.some(row=>row.id===sword.id),false);
  const recipient=store.listParticipants().find(row=>row.id===target.id);assert.equal(recipient.equipment.find(row=>row.id===sword.id).extensions.v5.weaponTrap.caughtBy,target.id);
  assert.equal(recipient.extensions.v5.hasMomentum,false);
  const reloaded=createStore({storage:null,persistence:io});await reloaded.ready;await reloaded.loadFromJSON(store.getFullJSON());
  assert.ok(reloaded.listParticipants().find(row=>row.id===target.id).equipment.some(row=>row.id===sword.id));
  assert.equal(await store.undo(),true);assert.equal(store.listParticipants().find(row=>row.id===actor.id).equipment.some(row=>row.id===sword.id),true);
  assert.equal(store.listParticipants().find(row=>row.id===target.id).equipment.some(row=>row.id===sword.id),false);
});

test('F2-D pure proposal — ranged Empaleuse critical blocks one wound until extraction', () => {
  assert.equal(previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: true, critical: true, ammunitionId: 'opaque-19', participantId: 't' }).ready, false);
  assert.equal(previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: true, critical: true, ammunitionId: 'opaque-19', ammunitionType: 'Balle', participantId: 't' }).lodgedProjectile.removal, 'surgery');
  assert.deepEqual(previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: true, critical: true, ammunitionId: 'arrow-1', ammunitionType: 'Flèche', participantId: 't' }),
    { ready: true, unresolved: [], lodgedProjectile: { participantId: 't', ammunitionId: 'arrow-1', ammunitionType: 'fleche', removal: 'heal-test', healTestModifier: 0 }, healingBlocked: 1 });
  assert.equal(previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: false, critical: true, ammunitionId: 'a', participantId: 't' }).healingBlocked, 0);
  assert.equal(previewV5ImpaleProjectile({ qualities: ['empaleuse'], ranged: true, critical: true }).ready, false);
  assert.deepEqual(previewV5WoundRecovery({ lodgedProjectiles: [{ id: 'arrow' }, { id: 'bullet', removed: true }], requestedWounds: 2 }),
    { ready: true, unresolved: [], requestedWounds: 2, blockedWounds: 1, recoverableWounds: 1 });
});

test('F2-D pure proposal — Inflige parses fixed and carrier Strength, locks an entangling weapon', () => {
  assert.deepEqual(parseV5Inflict('Empêtré 50'), { ready: true, unresolved: [], condition: { key: 'enchevetre', name: 'Empêtré', level: 1, strength: 50 } });
  assert.deepEqual(parseV5Inflict('Empêtré (votre Force)', 37).condition, { key: 'enchevetre', name: 'Empêtré', level: 1, strength: 37 });
  assert.equal(parseV5Inflict('Empêtré (votre Force)').ready, false);
  assert.deepEqual(previewV5Inflict({ qualities: [q('inflige', 'Empêtré 50')], hit: true, entangling: true, itemId: 'net-1' }), {
    ready: true, unresolved: [], condition: { key: 'enchevetre', name: 'Empêtré', level: 1, strength: 50 },
    weaponLocked: true, lockedItemId: 'net-1', release: { voluntary: true, weaponId: 'net-1' }
  });
  assert.equal(previewV5Inflict({ qualities: [q('inflige', 'Empêtré votre Force')], hit: true }).ready, false);
  assert.equal(previewV5Inflict({ qualities: [q('inflige', 'Empêtré 50')], hit: false }).condition, null);
});

test('F2-D pure proposal — Parade handles off-hand defense and second attack separately', () => {
  assert.equal(previewV5Parry({ qualities: ['parade'], defending: true, offHand: true }).defensePenalty, 0);
  assert.equal(previewV5Parry({ qualities: [], defending: true, offHand: true }).defensePenalty, null);
  assert.equal(previewV5Parry({ qualities: ['parade'], dualWielding: true, isSecondAttack: true, firstAttackHit: true }).secondAttackUnopposed, true);
  assert.equal(previewV5Parry({ qualities: ['parade'], dualWielding: true, isSecondAttack: true, firstAttackHit: false }).secondAttackUnopposed, false);
});

test('F2-D Parade — arme secondaire annule le −2 DR en défense et peut rendre la seconde attaque non opposable',()=>{
  const actor={id:'parrier',camp:'allies',zone:'active',hp:20,caracs:{CC:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const enemy={id:'enemy',camp:'foes',zone:'active',hp:20,caracs:{CC:50},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const defensePlan=buildCombatTest(normalizeResolutionInput({actor,target:enemy,roll:30,action:{type:'test',attr:'CC',base:50},
    defense:{type:'skill',attr:'CC',base:50,roll:30,qualities:[q('parade')],v5:{kind:'melee',context:{offHandWeapon:true}}},v5:{kind:'melee'}}),'defender');
  assert.equal(defensePlan.test.options[0].result.details.modifiers.some(row=>row.id==='quality:offhand-defense'),false);
  const ordinaryDefense=buildCombatTest(normalizeResolutionInput({actor,target:enemy,roll:30,action:{type:'test',attr:'CC',base:50},
    defense:{type:'skill',attr:'CC',base:50,roll:30,qualities:[],v5:{kind:'melee',context:{offHandWeapon:true}}},v5:{kind:'melee'}}),'defender');
  assert.equal(ordinaryDefense.test.options[0].result.details.modifiers.find(row=>row.id==='quality:offhand-defense')?.amount,-2);
  const target={id:'target',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:60,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const preview=previewResolution({actor,target,round:1,baseRevision:0,roll:21,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[q('parade')]},
    defense:{type:'skill',attr:'CC',base:100,roll:10,label:'Corps à corps'},v5:{kind:'melee',context:{dualWielding:true,secondWeaponAttack:true,firstWeaponAttackHit:true}}});
  assert.equal(preview.hit,true,'la réussite adverse ne s’oppose pas à cette seconde attaque Parade');
});

test('F2-D Parade — une maîtrise C avec Base retire Parade avant l’attaque et ne neutralise pas l’opposition',()=>{
  const actor={id:'fencer',camp:'allies',zone:'active',hp:20,caracs:{CC:60,F:30,E:30},states:[],skills:[{id:'base',name:'Corps à corps (Base)',group:'Corps à corps',specialty:'Base',basic:true,total:60,advances:1}],equipment:[],extensions:{v5:{}}};
  const weapon={id:'sword',kind:'weapon',name:'Épée',category:'Escrime',damage:4,keywords:[q('parade')]};actor.equipment=[weapon];
  const target={id:'target',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:50,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const trained=applyWeaponSkillRules(actor,{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:'sword'}}},{weapon,context:{weaponSkillId:'base'},sourceQualities:weapon.keywords});
  assert.equal(trained.receipt.trained,true);assert.ok(trained.action.qualities.every(row=>row.id!=='parade'));
  const preview=previewResolution({actor,target,round:1,baseRevision:0,roll:21,
    action:{type:'attack',attr:'CC',base:60,damage:4,qualities:trained.action.qualities,extensions:{fiche:{equipmentId:'sword'}}},
    defense:{type:'skill',attr:'CC',base:80,roll:25,label:'Corps à corps'},
    v5:{kind:'melee',context:{dualWielding:true,secondWeaponAttack:true,firstWeaponAttackHit:true,weaponSkillId:'base'}}});
  assert.ok(preview.opposition,'l’opposition reste présente même avec les faits de seconde attaque');
  assert.equal(preview.hit,false,'la Parade retirée par maîtrise C ne donne pas de seconde attaque gratuite');
});

test('F2-D pure proposal — Pistolet can attack engaged targets without range penalty', () => {
  assert.deepEqual(previewV5PistolContact({ qualities: ['pistolet'], attack: true, engaged: true, ranged: true }),
    { ready: true, unresolved: [], allowed: true, rangeModifier: 0, oppositionKind: 'melee' });
  assert.equal(previewV5PistolContact({ qualities: ['pistolet'], attack: true, engaged: false, ranged: true }).allowed, false);
});

test('F2-D integration — Pistolet quality removes the engaged-target ranged penalty while other weapons retain it', () => {
  const actor={id:'pistol-user',caracs:{CT:50},skills:[],states:[],extensions:{v5:{}}};
  const target={id:'engaged-target',caracs:{CC:40},skills:[],states:[],extensions:{v5:{}}};
  const makePlan=qualities=>buildCombatTest(normalizeResolutionInput({actor,target,roll:35,
    action:{type:'attack',attr:'CT',base:50,qualities},v5:{kind:'ranged',context:{targetEngaged:true}}}));
  assert.equal(makePlan([q('pistolet')]).test.advantage.disadvantage.some(row=>row.id==='target-engaged'),false);
  assert.equal(makePlan([]).test.advantage.disadvantage.some(row=>row.id==='target-engaged'),true);
});

test('F2-D resolution — an engaged Pistolet may be opposed with Melee, while a non-Pistolet still needs authorization', () => {
  const actor={id:'pistol-user',camp:'a',hp:12,caracs:{CT:50,F:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const target={id:'engaged-target',camp:'b',hp:12,caracs:{CC:50,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const resolve=qualities=>previewResolution({actor,target,roll:35,baseRevision:0,
    action:{type:'attack',attr:'CT',base:50,damage:3,qualities},
    defense:{type:'defense',label:'Corps à corps',attr:'CC',base:50,roll:40,v5:{kind:'melee'}},
    attackContext:{ranged:true},v5:{kind:'ranged',context:{targetEngaged:true}}});
  const pistol=resolve([q('pistolet')]);
  const other=resolve([]);
  assert.equal(pistol.unresolved.some(row=>row.includes('Confirmer la règle autorisant cette défense')),false);
  assert.equal(other.unresolved.some(row=>row.includes('Confirmer la règle autorisant cette défense')),true);
});

test('F2-D pure proposal — Piège-lame can trap only on a qualifying defensive critical', () => {
  const trapped = previewV5TrapBlade({ qualities: ['piege-lame'], defensiveCritical: true, opponentWeaponType: 'blade',
    defenderSize: 4, opponentSize: 4, chooseTrap: true, hasDisarmTalent: true, spendMomentum: true, catchInFreeHand: true,
    chooseBreak: true, strengthTestSuccess: true, meleeSl: 2 });
  assert.deepEqual(trapped, { ready: true, unresolved: [], available: true, trapped: true, criticalReplaced: true, opponentDropsWeapon: true,
    catch: { inFreeHand: true, momentumSpent: true }, break: { test: 'strength', difficultySl: -3, addedMeleeSl: 2, weaponBroken: true }, breakBlockedByUnbreakable: false });
  assert.equal(previewV5TrapBlade({ qualities: ['piege-lame'], defensiveCritical: true, opponentWeaponType: 'blade', defenderSize: 3, opponentSize: 4, chooseTrap: true }).available, false);
  assert.equal(previewV5TrapBlade({ qualities: ['piege-lame'], defensiveCritical: true, opponentWeaponType: 'blade', defenderSize: 4, opponentSize: 4, chooseTrap: true, chooseBreak: true, strengthTestSuccess: true, unbreakable: true }).break, null);
  assert.equal(previewV5TrapBlade({ qualities: ['piege-lame'], defensiveCritical: false, opponentWeaponType: 'blade' }).available, false);
});

test('F2-D pure proposal — Incassable cancels only the break option; Enroulement penalizes melee opposition', () => {
  const row = previewV5TrapBlade({ qualities: ['piege-lame'], defensiveCritical: true, opponentWeaponType: 'blade', defenderSize: 4,
    opponentSize: 4, chooseTrap: true, chooseBreak: true, strengthTestSuccess: true, unbreakable: true });
  assert.equal(row.breakBlockedByUnbreakable, true);
  assert.equal(previewV5Wrap({ qualities: ['a-enroulement'], opposingMelee: true }).defenderSlPenalty, -1);
  assert.equal(previewV5Wrap({ qualities: ['a-enroulement'], opposingMelee: false }).defenderSlPenalty, 0);
});

test('F2-D pure proposal — V5 Entaille adds exactly one Bleeding per Momentum spent, independent of V4 rating', () => {
  assert.deepEqual(previewV5Slash({ qualities: [q('entaille', '2')], criticalDamage: true, spendAdvantage: 1 }),
    { ready: true, unresolved: [], bleedingConditions: 2, momentumSpent: 1, unusedMomentum: 0 });
  assert.equal(previewV5Slash({ qualities: [q('entaille', '1')], criticalDamage: true, spendAdvantage: 1 }).bleedingConditions,2);
  assert.equal(previewV5Slash({ qualities: [q('entaille', '2')], criticalDamage: false, spendAdvantage: 2 }).bleedingConditions, 0);
  assert.equal(previewV5Slash({ qualities: [q('entaille')], criticalDamage: true, spendAdvantage: 0 }).bleedingConditions, 1);
});

test('F2-D pure proposal — Dispersion respects band behavior and requires GM-selected targets', () => {
  assert.deepEqual(previewV5Spread({ qualities: [q('dispersion', '2')], rangeBand: 'point-blank', targetIds: ['a'], weaponDamage: 6 }).targets,
    [{ participantId: 'a', damage: 8 }]);
  const extreme = previewV5Spread({ qualities: [q('dispersion', '2')], rangeBand: 'extreme', targetIds: ['a', 'b', 'c'], weaponDamage: 6 });
  assert.deepEqual(extreme.targets.map(row => row.damage), [4, 4, 4]);
  assert.equal(previewV5Spread({ qualities: [q('dispersion', '2')], rangeBand: 'point-blank', targetIds: ['a', 'b'], weaponDamage: 6 }).ready, false);
  assert.equal(previewV5Spread({ qualities: [q('dispersion', '2')], rangeBand: 'long', weaponDamage: 6 }).ready, false);
  assert.equal(extreme.requiresGMTargetValidation, true);
});

test('F2-D résolution — Dispersion applies only to MJ-designated targets and the chosen band', () => {
  const actor={id:'sprayer',camp:'allies',zone:'active',hp:20,caracs:{CT:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const primary={id:'primary',camp:'foes',zone:'active',hp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const extra={id:'extra',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const outside={id:'outside',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const preview=previewResolution({actor,target:primary,baseRevision:0,round:1,roll:20,
    action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('dispersion','2')]},attackContext:{ranged:true},
    v5:{kind:'ranged',context:{spreadRangeBand:'short',spreadTargetIds:['primary','extra'],spreadLocationRollsById:{extra:35}}},v5State:{participants:[actor,primary,extra,outside]}});
  assert.equal(preview.spreadPlan.targets.length,2);
  assert.equal(preview.secondaryTargets.length,1);
  assert.equal(preview.secondaryTargets[0].participantId,'extra');
  const applied=applyResolution(preview,{revision:0,round:1,participants:[actor,primary,extra,outside],appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  assert.ok(applied.state.participants.find(row=>row.id==='primary').hp<20);
  assert.ok(applied.state.participants.find(row=>row.id==='extra').hp<20);
  assert.equal(applied.state.participants.find(row=>row.id==='outside').hp,20);
});

test('F2-D résolution — Explosion ignores opposition and DR, and applies to every MJ-designated active target',()=>{
  const actor={id:'bomber',camp:'allies',zone:'active',hp:20,caracs:{CT:60,F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const primary={id:'blast-primary',camp:'foes',zone:'active',hp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const secondary={id:'blast-secondary',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const outside={id:'blast-outside',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const participants=[actor,primary,secondary,outside];
  const preview=previewResolution({actor,target:primary,baseRevision:0,round:1,roll:21,
    action:{type:'attack',attr:'CT',base:60,damage:'BF+2',qualities:[q('explosion','3'),q('devastatrice')]},
    defense:{type:'skill',base:50,roll:99,label:'Esquive'},attackContext:{ranged:true},
    v5:{kind:'ranged',context:{explosionTargetIds:[primary.id,secondary.id],explosionLocationRollsById:{[secondary.id]:35}}},v5State:{participants}});
  assert.equal(preview.hit,true);
  assert.equal(preview.blastPlan.targets.length,2);
  assert.equal(preview.damage.sl,0);
  assert.equal(preview.damage.weaponDamage,6,'l’arme BF+2 vaut 5, puis Dévastatrice ajoute le dé des unités');
  assert.equal(preview.secondaryTargets.length,1);
  assert.equal(preview.secondaryTargets[0].participantId,secondary.id);
  assert.equal(preview.secondaryTargets[0].damage.sl,0);
  const applied=applyResolution(preview,{revision:0,round:1,participants,appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  assert.ok(applied.state.participants.find(row=>row.id===primary.id).hp<20);
  assert.ok(applied.state.participants.find(row=>row.id===secondary.id).hp<20);
  assert.equal(applied.state.participants.find(row=>row.id===outside.id).hp,20);
  const exceptional=previewResolution({actor,target:primary,baseRevision:0,round:1,roll:21,
    action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('explosion','3'),q('devastatrice')]},
    defense:{type:'skill',base:100,roll:20,label:'Esquive'},attackContext:{ranged:true},
    v5:{kind:'ranged',context:{explosionOpposed:true,explosionTargetIds:[primary.id]}}});
  assert.equal(exceptional.hit,false);
  const unknownHp={id:'unknown-hp',camp:'foes',zone:'active',caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const blocked=previewResolution({actor,target:primary,baseRevision:0,round:1,roll:21,
    action:{type:'attack',attr:'CT',base:60,damage:4,qualities:[q('explosion','3')]},attackContext:{ranged:true},
    v5:{kind:'ranged',context:{explosionTargetIds:[primary.id,unknownHp.id],explosionLocationRollsById:{[unknownHp.id]:35}}},
    v5State:{participants:[actor,primary,unknownHp]}});
  assert.ok(blocked.unresolved.some(row=>row.includes('PV actuels et maximum requis')));
  const refused=applyResolution(blocked,{revision:0,round:1,participants:[actor,primary,unknownHp],appliedResolutionIds:[]});
  assert.equal(refused.status,'manual');
  assert.equal(refused.state.participants.find(row=>row.id===unknownHp.id).hp,undefined,'aucune cible sans PV n’est écrasée à 0');
});

test('F2-D pure proposal — conditional knife keeps Penetrating and gates only Impale/Pointue', () => {
  assert.deepEqual(conditionalV5KnifeQualities({ qualities: ['empaleuse', 'pointue', 'perforante'], targetSurprised: false, targetProne: false }).qualities, ['perforante']);
  assert.deepEqual(conditionalV5KnifeQualities({ qualities: ['empaleuse', 'pointue', 'perforante'], targetProne: true }).qualities,
    ['empaleuse', 'pointue', 'perforante']);
});

test('F2-D pure proposal — V5 shield defense, attached coverage, ranged boundary and attack suspension', () => {
  const shield = { id: 'buckler', kind: 'shield', ap: 2, keywords: ['bouclier'] };
  const defended = previewV5Shield({ shield, selected: true, available: true, defenseSkill: 'dodge', ranged: true, shieldAttached: true });
  assert.equal(defended.defenseBonus, 1);
  assert.equal(defended.rangedDodgeAllowed, true);
  assert.deepEqual(defended.locations, ['head', 'body', 'offArm']);
  assert.equal(previewV5Shield({ shield: { ...shield, ap: 1 }, selected: true, available: true, defenseSkill: 'dodge', ranged: true }).confirmed, false);
  assert.equal(previewV5Shield({ shield, selected: true, available: true, defenseSkill: 'melee', ranged: false }).defenseBonus, 1);
  assert.equal(previewV5Shield({ shield, attackWithShield: true }).confirmed, false);
  assert.deepEqual(previewV5Shield({ shield, selected: true, available: true, attackWithShield: true }), { ready: true, unresolved: [], confirmed: true,
    defenseBonus: 0, armorPoints: 0, reach: 'personal', improvisedWeapon: true, protectionSuspended: true, resumesAt: 'start-next-turn' });
  assert.equal(previewV5Shield({ shield, selected: false, available: true, defenseSkill: 'melee' }).confirmed, false);
  assert.equal(previewV5Shield({ shield, selected: true, available: false, attackWithShield: true }).confirmed, false);
});

test('F2-D pure proposal — an attached shield permits polearms; a buckler frees the off-hand for a zero-Enc weapon', () => {
  const shield = { id: 'shield', kind: 'shield', ap: 2, keywords: ['bouclier'] };
  assert.equal(validateV5ShieldHands({ shield, weaponHands: 2, weaponEncumbrance: 2, polearm: true, attached: true }).allowed, true);
  assert.equal(validateV5ShieldHands({ shield, weaponHands: 2, weaponEncumbrance: 2, polearm: false, attached: true }).allowed, false);
  assert.equal(validateV5ShieldHands({ shield: { ...shield, ap: 1 }, weaponHands: 2, weaponEncumbrance: 2, attached: true }).allowed, false);
  assert.equal(validateV5ShieldHands({ shield: { ...shield, ap: 1 }, weaponHands: 2, weaponEncumbrance: 2, polearm: true, attached: true }).allowed, true);
  const buckler = { ...shield, ap: 1 };
  assert.equal(validateV5ShieldHands({ shield: buckler, weaponHands: 1, weaponEncumbrance: 1, attached: true, offHandWeaponEncumbrance: 0 }).reason, 'buckler-free-hand');
  assert.equal(validateV5ShieldHands({ shield, weaponHands: 1, weaponEncumbrance: 1, attached: true, offHandWeaponEncumbrance: 0 }).reason, null);
});

test('F2-D bouclier attaquant — mains à deux mains bloquées, hast attachée et rondache + arme 0 Enc passent',()=>{
  const actor={id:'shield-attacker',camp:'allies',hp:20,maxHp:20,caracs:{CC:60,F:30,E:30},skills:[],ficheSkillsComplete:true,states:[],equipment:[
    {id:'polearm',kind:'weapon',name:'Hallebarde (2M)',category:'Armes d’Hast',damage:5,encumbrance:3},
    {id:'buckler',kind:'shield',name:'Targe',category:'Bouclier',ap:1,keywords:[q('bouclier')]},
    {id:'shield',kind:'shield',name:'Bouclier',category:'Bouclier',ap:2,keywords:[q('bouclier')]},
    {id:'sword',kind:'weapon',name:'Épée',category:'Base',damage:4,encumbrance:1},
    {id:'free-weapon',kind:'weapon',name:'Dague',category:'Base',damage:2,encumbrance:0}],extensions:{v5:{}}};
  const target={id:'guard',camp:'foes',hp:20,maxHp:20,caracs:{CC:40,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const plan=context=>previewResolution({actor,target,round:1,baseRevision:0,roll:35,action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:'polearm'}}},
    attackContext:{ranged:false},v5:{kind:'melee',context:{...context,actorShieldId:'shield',weaponHands:2,weaponEncumbrance:3}}});
  assert.ok(plan({shieldAttached:false}).unresolved.some(text=>/combinaison des mains incompatible/u.test(text)));
  const polearmPlan=plan({shieldAttached:true});assert.ok(!polearmPlan.unresolved.some(text=>/combinaison des mains incompatible/u.test(text)),JSON.stringify(polearmPlan.unresolved));
  const bucklerAttack=previewResolution({actor,target,round:1,baseRevision:0,roll:35,action:{type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:'sword'}}},
    attackContext:{ranged:false},v5:{kind:'melee',context:{actorShieldId:'buckler',shieldAttached:true,weaponHands:1,weaponEncumbrance:1,offHandWeaponId:'free-weapon'}}});
  assert.ok(!bucklerAttack.unresolved.some(text=>/combinaison des mains incompatible/u.test(text)),'rondache attachée laisse libre une arme d’Encombrement 0 en main secondaire');
});

test('F2-D pure proposal — powder ammunition: only the blunderbuss accepts small/improvised shot', () => {
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre noire', ammunitionType: 'grenaille', isBlunderbuss: true }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre noire', ammunitionType: 'projectile improvisé', isBlunderbuss: false }).allowed, false);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Ingénierie', ammunitionType: 'bullet' }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre noire', ammunitionType: 'unknown' }).allowed, false);
});

test('F2-D munitions poudre — catalogue profil Tromblon accepte grenaille/improvisé, arquebuse les bloque',()=>{
  const items=getReferenceCatalogue().items,weapon=(name)=>items.find(row=>row.kind==='weapon'&&row.name===name),ammo=(pattern)=>items.find(row=>row.kind==='ammunition'&&pattern.test(row.name));
  const blunderbuss=weapon('Tromblon (2M)'),arquebuse=weapon('Arquebuse (2M)'),bullets=ammo(/Balles et poudre/u),shot=ammo(/Grenaille et poudre/u),improvised=ammo(/Munitions improvisées/u);
  assert.equal(ammunitionCompatibility(blunderbuss,shot).status,'compatible');
  assert.equal(ammunitionCompatibility(blunderbuss,improvised).status,'compatible');
  assert.equal(ammunitionCompatibility(arquebuse,shot).status,'incompatible');
  assert.equal(ammunitionCompatibility(arquebuse,improvised).status,'incompatible');
  assert.equal(ammunitionCompatibility(arquebuse,bullets).status,'compatible');
  const actor={id:'ammo-user',caracs:{CT:50},skills:[],equipment:[arquebuse,bullets],states:[],extensions:{v5:{}}};
  assert.doesNotThrow(()=>normalizeResolutionInput({actor,roll:40,ammunitionId:bullets.id,action:{type:'attack',attr:'CT',base:50,extensions:{fiche:{equipmentId:arquebuse.id}}}}));
  assert.throws(()=>normalizeResolutionInput({actor:{...actor,equipment:[arquebuse,shot]},roll:40,ammunitionId:shot.id,action:{type:'attack',attr:'CT',base:50,extensions:{fiche:{equipmentId:arquebuse.id}}}}),error=>error.code==='AMMUNITION_INCOMPATIBLE');
});

test('F2-D pure proposal — worn mail/plate and closed helm penalties apply by category only once', () => {
  const marked = { notes: '-1 DR en Discrétion si une ou plusieurs pièces de mailles sont portées' };
  assert.deepEqual(calculateV5ArmorPenalty({ worn: [{ category: 'mail', ...marked }, { category: 'mail', ...marked }, { category: 'plate' }, { category: 'closed-helm' }] }),
    { ready: true, unresolved: [], stealthDr: -1, perceptionDr: -2 });
  assert.deepEqual(calculateV5ArmorPenalty({ worn: [{ category: 'plate', worn: false }, { category: 'closed-helm', worn: false }] }),
    { ready: true, unresolved: [], stealthDr: 0, perceptionDr: 0 });
});

test('F2-D armures — pénalités catalogue appliquées seulement aux pièces explicitement portées',()=>{
  const mail={id:'mail',kind:'armour',category:'Mailles',locations:['body'],keywords:[],notes:'-1 DR en Discrétion si une ou plusieurs pièces de mailles sont portées'};
  const plate={id:'plate',kind:'armour',category:'Plates',locations:['body'],keywords:[]};
  const helm={id:'helm',kind:'armour',category:'Plates',locations:['head'],keywords:[q('impenetrable')]};
  const openHelm={id:'open-helm',kind:'armour',category:'Plates',locations:['head'],keywords:[q('partielle')]};
  const actor={id:'armoured-test',caracs:{Ag:40,Int:40},skills:[],states:[],equipment:[mail,plate,helm,openHelm],extensions:{v5:{}}};
  const stealth=buildCombatTest(normalizeResolutionInput({actor,roll:30,action:{type:'test',attr:'Ag',base:50,label:'Discrétion'},
    v5:{kind:'test',context:{wornArmorItemIds:['mail','plate']}}}));
  assert.equal(stealth.test.options[0].result.details.modifiers.find(row=>row.id==='armor:stealth')?.amount,-1);
  const perception=buildCombatTest(normalizeResolutionInput({actor,roll:30,action:{type:'test',attr:'Int',base:50,label:'Perception'},
    v5:{kind:'test',context:{wornArmorItemIds:['helm']}}}));
  assert.equal(perception.test.options[0].result.details.modifiers.find(row=>row.id==='armor:perception')?.amount,-2);
  const open=buildCombatTest(normalizeResolutionInput({actor,roll:30,action:{type:'test',attr:'Int',base:50,label:'Perception'},
    v5:{kind:'test',context:{wornArmorItemIds:['open-helm']}}}));
  assert.equal(open.test.options[0].result.details.modifiers.some(row=>row.id==='armor:perception'),false);
});

test('F2-D armures catalogue — Mailles/Plates naines et notes Gromril/Ithilmar déclenchent les catégories correctes',()=>{
  const items=getReferenceCatalogue().items.filter(item=>item.kind==='armour');
  const at=(category,name)=>items.find(item=>item.category===category&&item.name===name);
  const dwarfMail=at('Mailles Naines','Jupe de mailles'),dwarfPlate=at('Plates Naines','Casque de mineur (ouvert)');
  const gromrilOpen=at('Gromril (nain)','Heaume ouvert'),gromrilClosed=at('Gromril (nain)','Heaume');
  const ithilmarClosed=at('Ithilmar Haut Elfe','Heaume Ithiltaen');
  assert.ok(dwarfMail&&dwarfPlate&&gromrilOpen&&gromrilClosed&&ithilmarClosed);
  assert.deepEqual(calculateV5ArmorPenalty({worn:[dwarfMail]}).stealthDr,0);
  assert.deepEqual(calculateV5ArmorPenalty({worn:[dwarfPlate]}).stealthDr,-1);
  assert.deepEqual(calculateV5ArmorPenalty({worn:[gromrilOpen]}),{ready:true,unresolved:[],stealthDr:-1,perceptionDr:0});
  assert.deepEqual(calculateV5ArmorPenalty({worn:[gromrilClosed]}),{ready:true,unresolved:[],stealthDr:-1,perceptionDr:-2});
  assert.deepEqual(calculateV5ArmorPenalty({worn:[ithilmarClosed]}),{ready:true,unresolved:[],stealthDr:0,perceptionDr:-2});
});

test('F2-D pure proposal — natural weapons default to personal reach with no qualities', () => {
  assert.deepEqual(naturalWeaponDefaults({ natural: true }), { ready: true, unresolved: [], reach: 'personal', qualities: [], defaultsApplied: true });
  assert.deepEqual(naturalWeaponDefaults({ natural: false, reach: 'long', qualities: ['empaleuse'] }).qualities, ['empaleuse']);
});

test('F2-D pure proposal — entanglement Strength values are typed, and hook-net damage is not invented', () => {
  assert.deepEqual(entanglementStrength({ kind: 'cloak' }).strength, 25);
  assert.deepEqual(entanglementStrength({ kind: 'weighted-net' }).strength, 55);
  assert.deepEqual(entanglementStrength({ kind: 'mancatcher', actorStrength: 42, springLoaded: true }),
    { ready: true, unresolved: [], strength: 42 });
  assert.deepEqual(entanglementStrength({ kind: 'garrote', actorStrength: 38 }).strength, 38);
  assert.deepEqual(entanglementStrength({ kind: 'garrote', actorStrength: 38, explicitStrength: 44 }).strength, 44);
  assert.equal(entanglementStrength({ kind: 'druchii-net' }).ready, false);
  assert.equal(previewV5HookedNet({ hookedNet: true, struggle: true }).ready, false);
  assert.deepEqual(previewV5HookedNet({ hookedNet: true, struggle: true, damageAmount: 3 }),
    { ready: true, unresolved: [], damage: 3, armourIgnored: true });
});

test('F2-D catalogue exception — Épée de sport carries Inoffensive', () => {
  assert.deepEqual(applyV5SportSwordQuality({ weaponName: 'Épée de sport', qualities: ['defensive'] }).qualities, ['defensive', 'inoffensive']);
  assert.deepEqual(applyV5SportSwordQuality({ weaponName: 'Épée courte', qualities: ['defensive'] }).qualities, ['defensive']);
  const weapon={id:'sport',kind:'weapon',name:'Épée de sport',category:'Base',keywords:[]};
  const resolved=applyWeaponSkillRules({id:'a',caracs:{CC:50},skills:[],equipment:[weapon]},
    {type:'attack',base:50,qualities:[],extensions:{fiche:{equipmentId:'sport'}}},{weapon,context:{}});
  assert.ok(resolved.action.qualities.some(row=>row.id==='inoffensive'));
});

test('F2-D integration — Inflige is previewed, shown as applied and committed through resolution', () => {
  const actor = { id: 'a', name: 'A', camp: 'allies', zone: 'active', hp: 20, maxHp: 20,
    caracs: { CC: 60, CT: 60, F: 40, E: 30 }, states: [], equipment: [], talents: [], extensions: { v5: { hasMomentum: false } } };
  const target = { ...actor, id: 't', name: 'T', camp: 'foes' };
  const preview = previewResolution({ resolutionId: 'f2-d-inflict', actor, target, baseRevision: 0, round: 1, roll: 23,
    action: { id: 'weapon', type: 'attack', base: 60, damage: 4, qualities: [q('inflige', 'Sonné')] },
    v5: { kind: 'ranged' }, attackContext: { ranged: true } });
  assert.equal(preview.hit, true);
  assert.equal(preview.weaponConditions.applied[0].key, 'sonne');
  const applied = applyResolution(preview, { revision: 0, round: 1, participants: [actor, target], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants.find(row => row.id === 't').states[0].key, 'sonne');
});

test('F2-D resolution — Immobilisante locks its linked weapon until opposed Force Tests remove every Empêtré', () => {
  const weapon={id:'net-1',kind:'weapon',name:'Filet lesté',keywords:[q('immobilisante','2')],extensions:{}};
  const holder={id:'holder',name:'Porteur',camp:'allies',zone:'active',hp:20,caracs:{CC:50,CT:50,F:3,E:30},skills:[],states:[],equipment:[weapon],extensions:{v5:{}}};
  const victim={id:'victim',name:'Cible',camp:'foes',zone:'active',hp:20,caracs:{CC:40,CT:40,F:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const attack=previewResolution({resolutionId:'d-net-hit',actor:holder,target:victim,baseRevision:0,round:1,roll:20,
    action:{id:'throw-net',type:'attack',attr:'CT',base:50,damage:0,qualities:[q('immobilisante','2')],extensions:{fiche:{equipmentId:'net-1'}}},
    attackContext:{ranged:true},v5:{kind:'ranged'}});
  assert.equal(attack.entanglement.weaponLocked,true);
  let applied=applyResolution(attack,{revision:0,round:1,participants:[holder,victim],appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  let captor=applied.state.participants.find(row=>row.id==='holder'),entangled=applied.state.participants.find(row=>row.id==='victim');
  const lockId=entangled.states.find(row=>row.key==='enchevetre').source.linkId;
  assert.equal(entangled.states.find(row=>row.key==='enchevetre').strength,3,'le seuil Immobilisante est la Force du porteur, pas son paramètre non publié');
  assert.deepEqual(captor.equipment[0].extensions.v5.entanglementLocks,[lockId]);
  const blockedAttack=previewResolution({resolutionId:'d-net-blocked-weapon',actor:captor,target:victim,baseRevision:applied.state.revision,round:1,roll:20,
    action:{type:'attack',attr:'CT',base:50,damage:1,qualities:[],extensions:{fiche:{equipmentId:'net-1'}}},attackContext:{ranged:true},v5:{kind:'ranged'}});
  assert.ok(blockedAttack.unresolved.some(row=>row.includes('retenue par un état Empêtré')));
  for(const [index,[id,roll]] of [['d-net-escape-1',30],['d-net-escape-2',12]].entries()){
    const escape=previewResolution({resolutionId:id,actor:entangled,baseRevision:applied.state.revision,round:1,roll,
      action:{type:'test',attr:'F',base:30,label:'Force'},v5:{kind:'test',context:{netEscapeConditionId:entangled.states[0].id,
        netEscapeOpponentRoll:index===0?1:30,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
    assert.equal(escape.unresolved.length,0,escape.unresolved.join('; '));
    applied=applyResolution(escape,{revision:applied.state.revision,round:1,participants:applied.state.participants,appliedResolutionIds:applied.state.appliedResolutionIds||[]});
    assert.equal(applied.status,'applied');
    entangled=applied.state.participants.find(row=>row.id==='victim');
    if(index===0)assert.equal(entangled.states.find(row=>row.key==='enchevetre').level,1,'un Test de sortie perdu ne change pas Empêtré');
  }
  assert.equal(entangled.states.some(row=>row.id===lockId),false);
  captor=applied.state.participants.find(row=>row.id==='holder');
  assert.deepEqual(captor.equipment[0].extensions.v5.entanglementLocks,[]);
});

test('F2-D resolution — typed net Strength values supply the entanglement source Strength, not keyword digits', () => {
  const make=kind=>{
    const weapon={id:'typed-'+kind,kind:'weapon',name:'Typed entangler',keywords:[q('immobilisante','2')],extensions:{v5:{entanglementKind:kind}}};
    const actor={id:'holder-'+kind,camp:'allies',hp:20,caracs:{CT:50,F:38,E:30},states:[],skills:[],equipment:[weapon],extensions:{v5:{}}};
    const target={id:'target-'+kind,camp:'foes',hp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
    return previewResolution({actor,target,roll:20,baseRevision:0,action:{type:'attack',attr:'CT',base:50,damage:0,
      qualities:[q('immobilisante','2')],extensions:{fiche:{equipmentId:weapon.id}}},attackContext:{ranged:true},v5:{kind:'ranged'}});
  };
  assert.equal(make('cloak').targetConditionApplication[0].strength,25);
  assert.equal(make('weighted-net').targetConditionApplication[0].strength,55);
  assert.equal(make('mancatcher').targetConditionApplication[0].strength,38);
  assert.equal(make('garrote').targetConditionApplication[0].strength,38);
  assert.equal(make('druchii-net').targetConditionApplication[0].strength,38);
});

test('F2-D Test de Force — un Mancatcher à ressort ajoute +20/+2 DR uniquement au Test explicitement déclaré', () => {
  const weapon={id:'mancatcher',kind:'weapon',extensions:{v5:{entanglementKind:'mancatcher',springLoaded:true}}};
  const actor={id:'holder',caracs:{F:40},skills:[],states:[],equipment:[weapon],extensions:{v5:{}}};
  const makePlan=entanglementTest=>buildCombatTest(normalizeResolutionInput({actor,roll:25,
    action:{type:'test',attr:'F',base:40,extensions:{fiche:{equipmentId:'mancatcher'}}},
    v5:{kind:'test',context:{entanglementTest,entanglementWeaponId:'mancatcher'}}}));
  const applied=makePlan(true),ordinary=makePlan(false);
  assert.equal(applied.test.options[0].result.details.modifiers.find(row=>row.id==='quality:mancatcher-spring-loaded')?.amount,2);
  assert.equal(ordinary.test.options[0].result.details.modifiers.some(row=>row.id==='quality:mancatcher-spring-loaded'),false);
});

test('F2-D résolution — Test de Force réussi avec Mancatcher à ressort applique Empêtré et verrouille l’arme', () => {
  const weapon={id:'mancatcher-test',kind:'weapon',name:'Mancatcher',extensions:{v5:{entanglementKind:'mancatcher',springLoaded:true}}};
  const actor={id:'holder',name:'Porteur',camp:'allies',hp:20,caracs:{F:38,CC:40,E:30},states:[],skills:[],equipment:[weapon],extensions:{v5:{}}};
  const target={id:'target',name:'Cible',camp:'foes',hp:20,caracs:{F:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const preview=previewResolution({actor,target,baseRevision:0,round:1,roll:10,
    action:{type:'test',attr:'F',base:40,label:'Force',extensions:{fiche:{equipmentId:weapon.id}}},
    v5:{kind:'test',context:{entanglementTest:true,entanglementWeaponId:weapon.id,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.equal(preview.test.details.modifiers.find(row=>row.id==='quality:mancatcher-spring-loaded')?.amount,2);
  assert.equal(preview.targetConditionApplication[0].strength,38);
  const applied=applyResolution(preview,{revision:0,round:1,participants:[actor,target],appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants.find(row=>row.id==='target').states[0].key,'enchevetre');
  assert.deepEqual(applied.state.participants.find(row=>row.id==='holder').equipment[0].extensions.v5.entanglementLocks,[preview.entanglement.linkId]);
});

test('F2-D catalogue — Cape/Filet infligent leur Force publiée et verrouillent l’arme; Mancatcher à ressort est rattaché au vrai profil', () => {
  const catalogue=getReferenceCatalogue().items;
  const item=name=>catalogue.find(row=>row.name===name);
  const cloak=item('Cape'),net=item('Filet'),mancatcher=item('Mancatcher (2M)');
  assert.ok(cloak&&net&&mancatcher);
  assert.equal(previewV5Inflict({qualities:cloak.keywords,hit:true,actorStrength:38}).condition.strength,25);
  assert.equal(previewV5Inflict({qualities:net.keywords,hit:true,actorStrength:38}).condition.strength,50);
  assert.equal(previewV5Inflict({qualities:mancatcher.keywords,hit:true,actorStrength:38}).condition.strength,38);

  for(const weapon of [cloak,net]){
    const actor={id:'catalog-holder-'+weapon.id,camp:'allies',zone:'active',hp:20,caracs:{CC:50,CT:50,F:38,E:30},states:[],skills:[],equipment:[weapon],extensions:{v5:{}}};
    const target={id:'catalog-target-'+weapon.id,camp:'foes',zone:'active',hp:20,caracs:{CC:30,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
    const preview=previewResolution({actor,target,round:1,roll:20,baseRevision:0,action:{type:'attack',attr:'CT',base:50,damage:0,
      qualities:weapon.keywords,extensions:{fiche:{equipmentId:weapon.id}}},defense:{type:'skill',base:30,roll:20,label:'Corps à corps'},attackContext:{ranged:false},v5:{kind:'melee'}});
    assert.equal(preview.targetConditionApplication[0].strength,weapon===cloak?25:50);
    assert.equal(preview.entanglement?.weaponLocked,true);
    assert.equal(preview.weaponConditions.proposed[0].source.weaponLocked,true);
    const applied=applyResolution(preview,{revision:0,round:1,participants:[actor,target],appliedResolutionIds:[]});
    assert.equal(applied.status,'applied');
    assert.deepEqual(applied.state.participants.find(row=>row.id===actor.id).equipment[0].extensions.v5.entanglementLocks,[preview.entanglement.linkId]);
    assert.equal(applied.state.participants.find(row=>row.id===target.id).states[0].source.weaponLocked,true);
  }

  const actor={id:'catalog-mancatcher-holder',camp:'allies',zone:'active',hp:20,caracs:{F:38,E:30},states:[],skills:[],
    equipment:[{...mancatcher,extensions:{v5:{springLoaded:true}}}],extensions:{v5:{}}};
  const target={id:'catalog-mancatcher-target',camp:'foes',zone:'active',hp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const weapon=actor.equipment[0];
  const preview=previewResolution({actor,target,round:1,roll:10,baseRevision:0,action:{type:'test',attr:'F',base:40,
    extensions:{fiche:{equipmentId:weapon.id}}},v5:{kind:'test',context:{entanglementTest:true,entanglementWeaponId:weapon.id,
      involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.equal(preview.test.details.modifiers.find(row=>row.id==='quality:mancatcher-spring-loaded')?.amount,2);
  assert.equal(preview.targetConditionApplication[0].strength,38);
  assert.equal(preview.targetConditionApplication[0].source.weaponLocked,true);
});

test('F2-D integration — Enroulement penalizes a melee opposition, but not a ranged defense', () => {
  const actor = { id: 'a', name: 'A', camp: 'allies', zone: 'active', hp: 20, maxHp: 20,
    caracs: { CC: 60, CT: 60, F: 40, E: 30 }, states: [], equipment: [], talents: [], extensions: { v5: { hasMomentum: false } } };
  const target = { ...actor, id: 't', name: 'T', camp: 'foes' };
  const make = kind => previewResolution({ resolutionId: `f2-d-wrap-${kind}`, actor, target, baseRevision: 0, round: 1, roll: 23,
    action: { id: 'weapon', type: 'attack', base: 60, damage: 4, qualities: [q('a-enroulement')] },
    defense: { type: 'skill', base: 50, roll: 47, label: 'Corps à corps', v5: { kind } }, v5: { kind: 'melee' } });
  const melee = make('melee'), ranged = make('ranged');
  assert.equal(melee.defenderTest.details.modifiers.find(row => row.id === 'quality:a-enroulement')?.amount, -1);
  assert.equal(ranged.defenderTest.details.modifiers.some(row => row.id === 'quality:a-enroulement'), false);
});

test('F2-D Empaleuse — lodged projectiles block one Wound each and require source-matched extraction', () => {
  const participant={id:'p',hp:5,maxHp:10,states:[],extensions:{v5:{lodgedProjectiles:[
    {id:'arrow',removal:'heal-test',removed:false},{id:'bullet',removal:'surgery',removed:false},{id:'removed',removed:true}
  ]}}};
  const healing=healV5Wounds(participant,3);
  assert.equal(healing.participant.hp,6);
  assert.equal(healing.healingBlockedByLodgedProjectiles,2);
  assert.equal(previewV5ProjectileExtraction({projectile:participant.extensions.v5.lodgedProjectiles[0],method:'heal-test',success:false,testSl:-1}).ready,false);
  assert.equal(previewV5ProjectileExtraction({projectile:participant.extensions.v5.lodgedProjectiles[0],method:'heal-test',success:true,testSl:0}).removed,true);
  assert.equal(previewV5ProjectileExtraction({projectile:participant.extensions.v5.lodgedProjectiles[1],method:'heal-test',success:true,testSl:0}).ready,false);
  assert.equal(previewV5ProjectileExtraction({projectile:participant.extensions.v5.lodgedProjectiles[1],method:'surgery',surgeryConfirmed:true}).removed,true);
});

test('F2-D pure proposal — net escape opposes each Test independently; SL do not accumulate', () => {
  const lost = advanceV5NetEscape({ testSl: 0, opponentSl: 1, entangled: 2 });
  assert.equal(lost.won, false);
  assert.equal(lost.addEntangledOnFailure, false);
  const won = advanceV5NetEscape({ testSl: 2, opponentSl: 0, entangled: 3 });
  assert.equal(won.freed, true);
  assert.equal(won.remainingEntangled, 1);
});

test('F2-D Reload/Reapter — shots use the magazine without Action counters', () => {
  const initial = createV5ReloadState({ repeaterRating: 3, reloadSuccesses: 5 }).state;
  const first = consumeV5WeaponShot(initial).state;
  const second = consumeV5WeaponShot(first).state;
  const third = consumeV5WeaponShot(second).state;
  assert.equal(first.shotsRemaining, 2);
  assert.equal(second.requiresReload, false);
  assert.equal(third.requiresReload, true);
  assert.equal(consumeV5WeaponShot(third).reason, 'reload-required');
});

test('F2-D Reload — a partially filled repeater reduces the success target by one', () => {
  const state = consumeV5WeaponShot(createV5ReloadState({ repeaterRating: 4, reloadSuccesses: 3 }).state).state;
  const begun = beginV5Reload(state);
  assert.equal(begun.state.requiredSuccesses, 2);
  assert.equal(begun.state.partialRepeater, true);
  const progress = advanceV5Reload(begun.state, { success: true, testSl: 0 });
  assert.equal(progress.status, 'progress', 'un Test réussi à +0 DR ajoute le succès de base');
  assert.equal(progress.state.accumulatedSuccesses, 1);
  const done = advanceV5Reload(progress.state, { success: true, testSl: 0 });
  assert.equal(done.status, 'reloaded');
  assert.equal(done.state.shotsRemaining, 4);
  assert.equal(done.state.requiresReload, false);
});

test('F2-D Reload — each success adds one plus positive DR; a failed Test adds zero', () => {
  const empty = createV5ReloadState({ repeaterRating: 1, reloadSuccesses: 4 }).state;
  const used = consumeV5WeaponShot(empty).state;
  const loading = beginV5Reload(used).state;
  const failure = advanceV5Reload(loading, { success: false, testSl: 2 });
  assert.equal(failure.state.accumulatedSuccesses, 0);
  const progress = advanceV5Reload(failure.state, { success: true, testSl: 1 });
  assert.equal(progress.state.accumulatedSuccesses, 2);
  assert.equal(progress.status, 'progress');
});

test('F2-D Reload — revisions reject stale actions and malformed contract data blocks', () => {
  const initial = createV5ReloadState({ repeaterRating: 2, reloadSuccesses: 3 }).state;
  assert.equal(consumeV5WeaponShot(initial, { expectedRevision: 99 }).status, 'stale');
  assert.equal(createV5ReloadState({ repeaterRating: -1, reloadSuccesses: 0 }).ready, false);
  assert.equal(advanceV5Reload(initial, { success: true, testSl: 2 }).ready, false);
});
});

describe('Assommer et store (caractérisation)', () => {
const copy=structuredClone;
const memory=()=>{let saved=null;return{async load(){return saved&&copy(saved);},async saveAtomic({state}){saved=copy(state);return{ok:true};}};};
const fighter=(id,extra={})=>({id,name:id,kind:'PJ',camp:id==='target'?'ennemi':'pj',zone:'active',hp:20,maxHp:20,
  caracs:{CC:60,F:40,E:30,BE:3,Ag:30},skills:[],talents:[],equipment:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});
async function fixture(targetHp=20,targetE=30){
  const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'attacker',order:['attacker','target'],participants:[fighter('attacker'),fighter('target',{hp:targetHp,maxHp:20,caracs:{CC:50,F:30,E:targetE,BE:Math.floor(targetE/10),Ag:30}})]},log:[],diceLines:[],extensions:{v5:{combatId:'assommer-characterization'}}});
  return{store,persistence};
}
const byId=(store,id)=>store.listParticipants().find(row=>row.id===id);

test('T2 bis characterization — Store applies and undoes Assommante Sonné at Head when Wounds lost meet TB',async()=>{
  const {store,persistence}=await fixture();
  // Roll 90 reverses to 9, the Head hit location. Assommante/Pummel is the published quality.
  const preview=store.previewResolution({resolutionId:'assommer-pummel-head',actorId:'attacker',targetId:'target',roll:90,
    action:{type:'attack',attr:'CC',base:100,damage:5,qualities:['assommante']},defense:{type:'skill',attr:'CC',base:50,roll:98,v5:{kind:'melee'}},v5:{kind:'melee'}});
  assert.deepEqual(preview.unresolved,[]);
  assert.ok(preview.weaponConditions?.proposed?.some(row=>row.key==='sonne'),JSON.stringify(preview.weaponConditions));
  const applied=await store.applyResolution(preview);assert.equal(applied.status,'applied');
  assert.ok(byId(store,'target').states.some(row=>row.key==='sonne'&&row.source?.keywordId==='assommante'));
  const reloaded=createStore({storage:null,persistence});await reloaded.ready;
  assert.ok(byId(reloaded,'target').states.some(row=>row.key==='sonne'));
  assert.equal(await reloaded.undo(),true);
  assert.ok(!byId(reloaded,'target').states.some(row=>row.key==='sonne'),'Undo retire l’État Assommante créé par la résolution');
  const afterUndo=createStore({storage:null,persistence});await afterUndo.ready;
  assert.ok(!byId(afterUndo,'target').states.some(row=>row.key==='sonne'));
});

test('T2 bis characterization — Assommante does not stun when a Head hit deals fewer Wounds than TB',async()=>{
  const {store}=await fixture(20,40);
  const preview=store.previewResolution({resolutionId:'assommer-below-tb',actorId:'attacker',targetId:'target',roll:90,
    action:{type:'attack',attr:'CC',base:100,damage:2,qualities:['assommante']},defense:{type:'skill',attr:'CC',base:50,roll:98,v5:{kind:'melee'}},v5:{kind:'melee'}});
  assert.equal(preview.damage?.finalDamage,3);
  assert.equal(preview.weaponConditions?.proposed?.length,0,'la cible ne perd que 3 Blessures, sous son BE 4');
  assert.ok(!preview.weaponConditions?.proposed?.some(row=>row.key==='sonne'));
  const applied=await store.applyResolution(preview);assert.equal(applied.status,'applied');
  assert.ok(!byId(store,'target').states.some(row=>row.key==='sonne'));
});

test('T2 bis characterization — declared knockout pull-blow keeps ordinary damage but suppresses the Head Critical Wound',async()=>{
  const {store,persistence}=await fixture();
  await store.updateParticipant('target',{states:[{id:'already-stunned',key:'sonne',name:'Sonné',level:3}]});
  const preview=store.previewResolution({resolutionId:'assommer-declared-knockout',actorId:'attacker',targetId:'target',roll:11,
    action:{type:'attack',attr:'CC',base:60,damage:5,qualities:['assommante']},
    defense:{type:'skill',attr:'CC',base:50,roll:98,v5:{kind:'melee'}},
    criticalRolls:{location:9,effect:50},v5:{kind:'melee',context:{knockout:true,calledShot:true,calledShotLocation:'head'}}});
  assert.deepEqual(preview.unresolved,[]);
  assert.equal(preview.location?.key,'HEAD');
  assert.equal(preview.damage?.finalDamage>0,true,'un coup retenu conserve les dégâts ordinaires');
  assert.equal(preview.critical?.details,undefined,'la déclaration avant le jet permet d’ignorer la Blessure Critique');
  assert.equal(preview.critical?.extraWounds||0,0);
  assert.ok(preview.weaponConditions?.proposed?.some(row=>row.key==='sonne'),JSON.stringify(preview.weaponConditions));
  assert.ok(preview.targetConditionApplication.some(row=>row.key==='inconscient'),'le total de Sonné strictement supérieur au BE met la cible Inconsciente');
  assert.equal((await store.applyResolution(preview)).status,'applied');
  assert.ok(byId(store,'target').states.some(row=>row.key==='inconscient'&&row.source?.kind==='knockout'));
  const reloaded=createStore({storage:null,persistence});await reloaded.ready;
  assert.ok(byId(reloaded,'target').states.some(row=>row.key==='inconscient'&&row.source?.kind==='knockout'),'Inconscient survit au rechargement');
  assert.equal(await reloaded.undo(),true);
  assert.ok(!byId(reloaded,'target').states.some(row=>row.key==='inconscient'),'Undo retire Inconscient');
});

test('T2 bis — knockout needs more Stunned Conditions than TB and still suppresses an excess Critical Wound',async()=>{
  const {store}=await fixture(1,30);
  await store.updateParticipant('target',{states:[{id:'two-stuns',key:'sonne',name:'Sonné',level:2}]});
  const preview=store.previewResolution({resolutionId:'knockout-equal-be',actorId:'attacker',targetId:'target',roll:11,
    action:{type:'attack',attr:'CC',base:60,damage:5,qualities:['assommante']},
    defense:{type:'skill',attr:'CC',base:50,roll:98,v5:{kind:'melee'}},
    v5:{kind:'melee',context:{knockout:true,calledShot:true,calledShotLocation:'head'}},criticalRolls:{location:9,effect:50,secondEffect:60}});
  assert.equal(preview.damage.finalDamage>1,true);
  assert.equal(preview.critical,null,'pulling the blow suppresses both the ordinary and excess Critical Wound');
  assert.ok(!preview.targetConditionApplication.some(row=>row.key==='inconscient'),'2 existing Sonné + 1 new = BE 3, not more than BE');
});

test('T2 bis — a defended or missed pull-blow cannot knock the target unconscious',async()=>{
  const {store}=await fixture();
  const preview=store.previewResolution({resolutionId:'knockout-defended',actorId:'attacker',targetId:'target',roll:90,
    action:{type:'attack',attr:'CC',base:40,damage:5,qualities:['assommante']},
    defense:{type:'skill',attr:'CC',base:80,roll:10,v5:{kind:'melee'}},
    v5:{kind:'melee',context:{knockout:true}}});
  assert.equal(preview.hit,false);
  assert.deepEqual(preview.weaponConditions.proposed,[]);
  assert.ok(!preview.targetConditionApplication.some(row=>row.key==='inconscient'));
});

test('T2 bis — Assommer requires explicit declaration and refuses excluded weapons and attack kinds',async()=>{
  const {store}=await fixture();
  await store.updateParticipant('target',{states:[{id:'already-stunned',key:'sonne',name:'Sonné',level:3}]});
  const base={actorId:'attacker',targetId:'target',roll:11,action:{type:'attack',attr:'CC',base:100,damage:5,qualities:['assommante']},defense:{type:'skill',attr:'CC',base:50,roll:98,v5:{kind:'melee'}},criticalRolls:{location:9,effect:50}};
  const undeclared=store.previewResolution({...base,resolutionId:'knockout-undeclared',v5:{kind:'melee'}});
  assert.ok(!undeclared.targetConditionApplication?.some(row=>row.key==='inconscient'));
  for(const [id,changes] of [['ranged',{v5:{kind:'ranged',context:{knockout:true}}}],['spell',{v5:{kind:'melee',context:{knockout:true,attackNature:'spell'}}}],['miracle',{v5:{kind:'melee',context:{knockout:true,attackNature:'miracle'}}}],['ablaze',{action:{...base.action,qualities:['assommante','enflamme']},v5:{kind:'melee',context:{knockout:true}}}],['missing-pummel',{action:{...base.action,qualities:[]},v5:{kind:'melee',context:{knockout:true}}}]]){
    const preview=store.previewResolution({ ...base,...changes,resolutionId:'knockout-'+id });
    assert.ok(preview.unresolved.some(row=>row.startsWith('Assommer :')),id+': '+JSON.stringify(preview.unresolved));
    assert.ok(!preview.targetConditionApplication?.some(row=>row.source?.kind==='knockout'),id+': une déclaration invalide ne doit pas proposer Inconscient');
    if(id==='spell')assert.ok(preview.critical?.details,'une déclaration de coup retenu invalide ne supprime pas le critique ordinaire');
    if(id==='ablaze')assert.ok(preview.input.action.qualities.some(row=>(typeof row==='string'?row:row.id)==='enflamme'),'une déclaration invalide ne retire aucune Qualité');
  }
  const removed=store.previewResolution({...base,resolutionId:'knockout-dropped-qualities',action:{...base.action,qualities:['assommante','devastatrice','taille','empaleuse','perforante']},v5:{kind:'melee',context:{knockout:true}}});
  assert.deepEqual(removed.input.action.qualities.map(q=>typeof q==='string'?q:q.id),['assommante']);
});
});

describe('Empaleuse (caractérisation)', () => {
const participant = (id, extra = {}) => ({
  id, name: id, kind: id === 'shooter' ? 'PJ' : 'PNJ', camp: id === 'shooter' ? 'pj' : 'foe',
  hp: 20, maxHp: 20, caracs: { CT: 60, E: 30 }, skills: [], states: [], equipment: [],
  armor: {}, extensions: { v5: {} }, ...extra,
});

function criticalRangedAttack({ weaponId, category, name, resolutionId }) {
  const shooter = participant('shooter', { equipment: [{ id: weaponId, kind: 'weapon', name, category,
    damage: '+4', keywords: [{ id: 'empaleuse' }] }] });
  const target = participant('target');
  const preview = previewResolution({
    resolutionId, actor: shooter, target, baseRevision: 0, round: 1, roll: 11,
    criticalRolls: { location: 2, effect: 80 },
    action: { id: 'ranged-attack', type: 'attack', attr: 'CT', base: 60, damage: 4,
      qualities: [{ id: 'empaleuse' }], extensions: { fiche: { equipmentId: weaponId } } },
    v5: { kind: 'ranged' }, attackContext: { ranged: true },
  });
  return { preview, shooter, target };
}

test('F2-T2 bis characterization — untracked bow/crossbow projectiles lodge from the weapon profile', () => {
  for (const [category, name] of [['Arc', 'Arc de test'], ['Arbalète', 'Arbalète de test']]) {
    const { preview, shooter, target } = criticalRangedAttack({
      weaponId: `weapon-${category}`, category, name, resolutionId: `impale-${category}`,
    });
    assert.deepEqual(preview.unresolved, [], `${category}: a critical Impale shot needs no tracked ammunition`);
    assert.equal(preview.projectileLodging?.removal, 'heal-test');
    const applied = applyResolution(preview, { revision: 0, round: 1,
      participants: [shooter, target], appliedResolutionIds: [] });
    assert.equal(applied.status, 'applied');
    assert.equal(applied.state.participants.find(row => row.id === 'target').extensions.v5.lodgedProjectiles.length, 1);
  }
});

test('F2-T2 bis characterization — untracked black-powder projectile requires surgery', () => {
  const { preview, shooter, target } = criticalRangedAttack({
    weaponId: 'pistol', category: 'Poudre noire', name: 'Pistolet de test', resolutionId: 'impale-bullet',
  });
  assert.deepEqual(preview.unresolved, [], 'the weapon profile supplies the generic bullet type');
  assert.equal(preview.projectileLodging?.removal, 'surgery');
  const applied = applyResolution(preview, { revision: 0, round: 1,
    participants: [shooter, target], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants.find(row => row.id === 'target').extensions.v5.lodgedProjectiles[0].removal, 'surgery');
});
});

describe('Empaleuse et store (intégration)', () => {
const weapon = { id: 'bow', kind: 'weapon', name: 'Arc de test', category: 'Arc', damage: '+4',
  keywords: [{ id: 'empaleuse' }] };
const participant = (id, extra = {}) => ({ id, name: id, kind: id === 'shooter' ? 'PJ' : 'PNJ',
  camp: id === 'shooter' ? 'pj' : 'foe', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CT: 60, CC: 40, E: 30, Ag: 30 }, skills: [], states: [], equipment: [], armor: {},
  extensions: { v5: {} }, ...extra });

test('F2-T2 bis — projectile Empaleuse générique persiste, se recharge et s’annule', async () => {
  let saved = null;
  const persistence = {
    load: async () => structuredClone(saved),
    saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; },
  };
  const store = createStore({ persistence });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], extensions: { v5: { combatId: 'impale-store' } },
    combat: { round: 1, currentActorId: 'shooter', order: ['shooter', 'target'],
      participants: [participant('shooter', { equipment: [weapon] }), participant('target')] }, diceLines: [], log: [] });
  const input = { resolutionId: 'generic-arrow', actorId: 'shooter', targetId: 'target', round: 1, roll: 11,
    criticalRolls: { location: 2, effect: 80 },
    action: { id: 'ranged-attack', type: 'attack', attr: 'CT', base: 60, damage: 4,
      qualities: [{ id: 'empaleuse' }], extensions: { fiche: { equipmentId: weapon.id } } },
    v5: { kind: 'ranged' }, attackContext: { ranged: true } };
  const preview = store.previewResolution(input);
  assert.deepEqual(preview.unresolved, []);
  assert.equal(preview.projectileLodging.genericProjectile, true);
  assert.equal(preview.projectileLodging.ammunitionType, 'fleche');
  assert.equal((await store.applyResolution(preview)).status, 'applied');

  const lodged = store.listParticipants().find(row => row.id === 'target').extensions.v5.lodgedProjectiles;
  assert.equal(lodged.length, 1);
  assert.equal(lodged[0].ammunitionId, 'generic:bow:fleche');
  assert.equal(lodged[0].genericProjectile, true);

  const reloaded = createStore({ persistence });
  await reloaded.ready;
  assert.deepEqual(reloaded.listParticipants().find(row => row.id === 'target').extensions.v5.lodgedProjectiles, lodged);
  await reloaded.undo();
  assert.deepEqual(reloaded.listParticipants().find(row => row.id === 'target').extensions.v5.lodgedProjectiles || [], []);

  const afterUndoReload = createStore({ persistence });
  await afterUndoReload.ready;
  assert.deepEqual(afterUndoReload.listParticipants().find(row => row.id === 'target').extensions.v5.lodgedProjectiles || [], []);
});
});

describe('Quatre défauts signalés', () => {
const catalogue = getReferenceCatalogue();

test('T2 bis — caractérisation corrigée : la Ratling devient chargeable après arbitrage de capacité', () => {
  const weapon = catalogue.items.find(row => row.name === 'Mitrailleuse Ratling Skaven');
  assert.ok(weapon);
  assert.equal(initialV5ReloadState(weapon).ready,false);
  const initial = initialV5ReloadState({...weapon,extensions:{v5:{repeaterRating:6}}});
  assert.equal(initial.ready,true);
  assert.equal(initial.state.repeaterRating,6);
});

test('T2 bis — caractérisation corrigée : l’import conserve l’astérisque de la Poivrière', () => {
  const weapon = catalogue.items.find(row => row.name === 'Poivrière');
  assert.ok(weapon);
  const repeater = weapon.keywords.find(row => row.id === 'a-repetition');
  assert.equal(repeater?.parameter, '4');
  assert.equal(repeater?.asterisk, true);
});

test('T2 bis — Poivrière p.103 : main occupée impose une recharge complète après le tir',()=>{
  const model=catalogue.items.find(row=>row.name==='Poivrière'),weapon={...structuredClone(model),id:'pepperbox-1'};
  const actor={id:'shooter',name:'Tireur',camp:'pj',hp:12,caracs:{CT:60,E:30},states:[],skills:[],equipment:[weapon],extensions:{v5:{}}};
  const target={id:'foe',name:'Cible',camp:'foe',hp:12,caracs:{E:30},states:[],armor:{},equipment:[]};
  const input={actor,target,action:{type:'attack',attr:'CT',base:60,damage:8,extensions:{fiche:{equipmentId:weapon.id}}},roll:20,attackContext:{ranged:true},v5:{kind:'ranged'}};
  const unspecified=previewResolution(input);assert.ok(unspecified.unresolved.some(row=>/seconde main/.test(row)),'il faut saisir oui ou non');
  const yes=previewResolution({...input,v5:{kind:'ranged',context:{freeHandAvailable:true}}});assert.equal(yes.unresolved.length,0);assert.equal(yes.weaponReload.after.shotsRemaining,3);
  const no=previewResolution({...input,v5:{kind:'ranged',context:{freeHandAvailable:false}}});assert.equal(no.unresolved.length,0,'la main occupée n’interdit pas le tir actuel');assert.equal(no.weaponReload.after.shotsRemaining,0,'la Poivrière impose une recharge complète');assert.equal(no.weaponReload.after.requiresReload,true);assert.equal(no.weaponReload.after.requiresManualRotation,false);
  const stateAfterNoHand={...weapon,extensions:{v5:{reloadState:no.weaponReload.after}}},blocked=previewResolution({...input,actor:{...actor,equipment:[stateAfterNoHand]},v5:{kind:'ranged',context:{freeHandAvailable:false}}});assert.ok(blocked.unresolved.some(row=>/rechargée/.test(row)),'un nouveau tir est bloqué jusqu’à la recharge complète');
});

test('T2 bis — caractérisation corrigée : la décharge Hache-fusil porte les dégâts du profil de tir +9', () => {
  const weapon = { id:'gun-axe', kind:'weapon', name:'Hache-fusil', damage:'+9', keywords:['a-poudre-noire'] };
  const preview = previewCombatFailure({
    normalized: { actor:{id:'shooter',equipment:[weapon]}, action:{type:'attack',damage:5,note:'Hache-fusil'}, resolutionId:'axe-shot-profile' },
    roll:99, fumble:{expanded:false}, context:{weaponName:'Hache-fusil',weaponGroup:'Poudre noire',meleeUse:true,weaponLoaded:true,fumbleRoll:2,powderIncidentRoll:1}
  });
  const discharge = preview.effects.find(effect => effect.reason === 'hache-fusil-chargee');
  assert.ok(discharge);
  assert.equal(discharge.damage, 9);
});

test('T2 bis — caractérisation corrigée : un effet transitoire de maladresse est purgé après une Action', () => {
  const actor={id:'shooter',name:'Tireur',hp:12,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{combatEffects:[{id:'old-fumble',kind:'next-action-sl',createdTurnIndex:1}]}}};
  const target={id:'foe',name:'Cible',hp:12,caracs:{E:30},states:[],armor:{}};
  const preview=previewResolution({actor,target,action:{type:'attack',attr:'CT',base:40,damage:3},roll:20,v5:{kind:'ranged'},baseRevision:0});
  assert.equal(preview.status,'preview');
  const state={participants:[actor,target],log:[],revision:0};
  const applied=applyResolution(preview,state);
  assert.deepEqual(applied.state.participants[0].extensions.v5.combatEffects,[]);
});
});

describe('Statut des mots-clés (caractérisation)', () => {
const fullyIntegratedQualities = [
  'immobilisante', 'pistolet', 'piege-lame', 'a-enroulement',
  'bouclier', 'taille', 'parade', 'a-repetition', 'recharge'
];

test('T2 bis — only fully integrated clauses use the separate resolution-coverage declaration', () => {
  for (const id of fullyIntegratedQualities) {
    const status = keywordMechanicalStatus(id);
    assert.equal(status.status, 'covered', `${id} has a complete tested resolution/store flow`);
    assert.equal(status.engine.scope, 'resolution-quality', `${id} is not registered as a legacy ENGINES mechanic`);
    assert.equal(Object.hasOwn(ENGINES, id), false, `${id} coverage does not reapply a legacy engine`);
    assert.ok(status.coverageEvidence, `${id} records its implementation evidence`);
  }
  for (const id of ['explosion', 'rapide', 'incassable', 'entaille', 'dispersion', 'inflige', 'salve', 'equipage', 'a-poudre-noire']) {
    assert.equal(keywordMechanicalStatus(id).status, 'manual', `${id} still has an incomplete or externally triggered clause`);
  }
});

test('T2 bis — generic Inflige remains manual because only six state names parse', () => {
  for (const state of ['Empêtré 50', 'À terre', 'Enflammé', 'Assourdi', 'Sonné', 'Hémorragique']) {
    assert.equal(parseV5Inflict(state).ready, true, `${state} is currently supported`);
  }
  assert.equal(parseV5Inflict('Brisé').ready, false, 'the generic V5 state clause is broader than the six-state parser');
  assert.equal(keywordMechanicalStatus('inflige').status, 'manual');
});

test('T2 bis characterization — the next Action purges resolved combat records and preserves effects with separate lifecycles', () => {
  const resolvedKinds = ['weapon-explosion', 'salvo-artillery-hit', 'salvo-artillery-destroyed',
    'fumble-ally-hit', 'misfire', 'critical-follow-up', 'next-action-sl'];
  const preserved = [
    { id: 'move', kind: 'lose-next-move' },
    { id: 'late', kind: 'acts-last-next-round', round: 2 },
    { id: 'ankle', kind: 'twisted-ankle', location: 'left-leg', createdRound: 1, rounds: 2 },
    { id: 'bomb', kind: 'bomb-detonation', requiresTargetResolution: true }
  ];
  const actor = { id: 'actor', name: 'A', camp: 'allies', zone: 'active', hp: 20, maxHp: 20,
    caracs: { CC: 50, CT: 50, F: 30, E: 30 }, skills: [], states: [], equipment: [], armor: {},
    extensions: { v5: { combatEffects: [...resolvedKinds.map((kind, index) => ({ id: `resolved-${index}`, kind })), ...preserved] } } };
  const preview = previewResolution({ resolutionId: 't2bis-all-resolved-effects', actor, baseRevision: 0, round: 1, roll: 30,
    action: { type: 'test', attr: 'F', base: 40 },
    v5: { kind: 'test', context: { isAction: true, involvesMovement: false, requiresSight: false, reliesOnSight: false, usesFellowship: false } } });
  assert.deepEqual(preview.consumedCombatEffects, resolvedKinds.map((_, index) => `resolved-${index}`));
  const applied = applyResolution(preview, { revision: 0, round: 1, participants: [actor], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  assert.deepEqual(applied.state.participants.find(row => row.id === 'actor').extensions.v5.combatEffects, preserved);
});

test('T2 bis characterization — non-action Tests do not consume action-scoped combat effects', () => {
  const actor = { id: 'actor', camp: 'allies', hp: 20, maxHp: 20, caracs: { F: 40 }, skills: [], states: [], equipment: [],
    extensions: { v5: { combatEffects: [{ id: 'fumble', kind: 'next-action-sl' }, { id: 'follow-up', kind: 'critical-follow-up' },
      { id: 'action', kind: 'lose-next-action' }, { id: 'explosion', kind: 'weapon-explosion' }] } } };
  const preview = previewResolution({ actor, resolutionId: 't2bis-non-action-effects', baseRevision: 0, round: 1, roll: 30,
    action: { type: 'test', attr: 'F', base: 40 }, v5: { kind: 'test', context: { isAction: false } } });
  assert.deepEqual(preview.consumedCombatEffects, []);
});
});

describe('Défauts restants', () => {
const q = (id, parameter = '') => ({ id, parameter });
const fighter = (id, extra = {}) => ({ id, name: id, camp: 'foes', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 50, F: 40, E: 30, Ag: 40 }, states: [], skills: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });

test('T2 bis characterization — pistolet au contact accepte Esquive comme opposition de mêlée', () => {
  const actor = fighter('shooter', { camp: 'hero' }), target = fighter('target');
  const preview = previewResolution({ actor, target, resolutionId: 't2bis-pistol-contact', roll: 20,
    action: { type: 'attack', attr: 'CT', base: 60, damage: 4, qualities: [q('pistolet')] },
    attackContext: { ranged: true, targetEngaged: true },
    defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: 30 },
    v5: { kind: 'ranged', context: { engaged: true } } });
  assert.deepEqual(preview.unresolved, []);
  assert.equal(preview.opposition?.mode, 'opposed');
});

test('T2 bis characterization — Inflige atteint la cible secondaire de bombe', () => {
  const actor = fighter('thrower', { camp: 'hero' }), primary = fighter('primary'), secondary = fighter('secondary');
  const participants = [actor, primary, secondary];
  const bomb = previewResolution({ actor, target: primary, resolutionId: 't2bis-bomb-secondary', roll: 20,
    action: { type: 'attack', attr: 'CT', base: 60, damage: 8, qualities: [q('explosion', '3'), q('inflige', 'Sonné')] },
    attackContext: { ranged: true }, v5State: { participants },
    v5: { kind: 'ranged', context: { explosionTargetIds: ['primary', 'secondary'], explosionLocationRollsById: { secondary: 35 } } } });
  assert.ok(bomb.secondaryTargets.find(row => row.participantId === 'secondary')?.conditions.length,
    'la cible secondaire de la bombe reçoit la proposition d’état Inflige');

});

test('T2 bis characterization — Inflige atteint la cible secondaire de Dispersion', () => {
  const actor = fighter('thrower', { camp: 'hero' }), primary = fighter('primary'), secondary = fighter('secondary');
  const participants = [actor, primary, secondary];
  const spread = previewResolution({ actor, target: primary, resolutionId: 't2bis-spread-secondary', roll: 20,
    action: { type: 'attack', attr: 'CT', base: 60, damage: 8, qualities: [q('dispersion', '1'), q('inflige', 'Sonné')] },
    attackContext: { ranged: true }, v5State: { participants },
    v5: { kind: 'ranged', context: { spreadTargetIds: ['primary', 'secondary'], spreadRating: 1, spreadRangeBand: 'medium', spreadLocationRollsById: { secondary: 35 } } } });
  assert.ok(spread.secondaryTargets.find(row => row.participantId === 'secondary')?.conditions.length,
    'la cible secondaire de Dispersion reçoit la proposition d’état Inflige');
});

test('T2 bis characterization — Inflige secondaire est annulé avec Bombe incendiaire et Dispersion', async () => {
  const store = createStore({ persistence: null, storage: null }); await store.ready;
  for (const scenario of [
    { id: 'firebomb', qualities: [q('explosion', '4'), q('inflige', 'Enflammé')], context: { explosionTargetIds: ['primary', 'secondary'], explosionLocationRollsById: { secondary: 35 } } },
    { id: 'spread', qualities: [q('dispersion', '1'), q('inflige', 'Sonné')], context: { spreadTargetIds: ['primary', 'secondary'], spreadRating: 1, spreadRangeBand: 'medium', spreadLocationRollsById: { secondary: 35 } } }
  ]) {
    const actor = fighter('thrower', { camp: 'hero' }), primary = fighter('primary'), secondary = fighter('secondary');
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'thrower', order: ['thrower', 'primary', 'secondary'], participants: [actor, primary, secondary] }, log: [], diceLines: [] });
    const preview = store.previewResolution({ actorId: 'thrower', targetId: 'primary', action: { type: 'attack', attr: 'CT', base: 60, damage: 8, qualities: scenario.qualities }, roll: 20,
      v5: { kind: 'ranged', context: scenario.context } });
    assert.deepEqual(preview.unresolved, [], `${scenario.id}: ${JSON.stringify(preview.unresolved)}`);
    assert.equal((await store.applyResolution(preview)).status, 'applied', scenario.id);
    const applied = store.listParticipants().find(row => row.id === 'secondary');
    assert.ok(applied.states.some(row => row.key === (scenario.id === 'firebomb' ? 'enflamme' : 'sonne')), scenario.id);
    await store.undo();
    assert.deepEqual(store.listParticipants().find(row => row.id === 'secondary').states, []);
  }
});

test('T2 bis characterization — résoudre la détonation purge son combatEffect en cours', async () => {
  let saved;
  const persistence = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence, storage: null }); await store.ready;
  const actor = fighter('bomber', { camp: 'hero', extensions: { v5: { combatEffects: [{ id: 'due', kind: 'bomb-detonation' }] } } });
  const target = fighter('target');
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'bomber', order: ['bomber', 'target'], participants: [actor, target] }, log: [], diceLines: [] });
  const preview = store.previewResolution({ actorId: 'bomber', targetId: 'target', action: { type: 'skill', base: 10 }, roll: 45,
    v5: { kind: 'test', context: { bombDetonation: true, bombDamage: 8, designatedTargetIds: ['target'] } } });
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === 'bomber').extensions.v5.combatEffects.some(row => row.id === 'due'), false);
});

test('T2 bis characterization — garde d’empoignade couvre les Actions de combat previewées', async () => {
  const store = createStore({ persistence: null, storage: null }); await store.ready;
  const held = fighter('held'); held.states = [{ id: 'held-state', key: 'enchevetre', name: 'Enchevêtré', level: 1, source: { kind: 'grapple', linkId: 'g' } }];
  const holder = fighter('holder', { extensions: { v5: { grapples: [{ id: 'g', initiatorId: 'holder', targetId: 'held', status: 'active' }] } } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'holder', order: ['holder', 'held'], participants: [holder, held] }, log: [], diceLines: [] });
  const preview = store.previewV5CombatAction({ actorId: 'holder', kind: 'defensive', skillId: 'dodge' });
  assert.equal(preview.ready, false, 'le partenaire tenu doit déclarer une Action Force avant Défensive');
});

test('T2 bis characterization — partenaire d’empoignade absent ne fait pas planter buildCombatTest', async () => {
  const store = createStore({ persistence: null, storage: null }); await store.ready;
  const holder = fighter('holder', { extensions: { v5: { grapples: [{ id: 'g', initiatorId: 'holder', targetId: 'removed', status: 'active' }] } } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'holder', order: ['holder'], participants: [holder] }, log: [], diceLines: [] });
  assert.doesNotThrow(() => store.previewResolution({ actorId: 'holder', action: { type: 'test', label: 'Force', base: 40 }, roll: 35,
    v5: { kind: 'test', context: { grappleAction: 'escape', skillId: 'force' } } }));
});

test('T2 bis characterization — Test de Résistance libre pendant une empoignade ne consomme pas l’Action', async () => {
  const store = createStore({ persistence: null, storage: null }); await store.ready;
  const link = { id: 'prior-grapple', initiatorId: 'holder', targetId: 'held', status: 'active' };
  const held = fighter('held', { extensions: { v5: { grapples: [link] } }, states: [
    { id: 'held-state', key: 'enchevetre', name: 'Enchevêtré', level: 1, source: { kind: 'grapple', linkId: link.id } }
  ] });
  const holder = fighter('holder', { extensions: { v5: { grapples: [link] } } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 2, currentActorId: 'held', order: ['holder', 'held'], participants: [holder, held] },
    extensions: { v5: { combatId: 'characterize-free-test', turnIndex: 2 } }, log: [], diceLines: [] });
  const freeTest = store.previewResolution({ actorId: 'held', targetId: 'holder', action: { type: 'test', label: 'Endurance', attr: 'E', base: 30 }, roll: 35,
    v5: { kind: 'test', context: { skillId: 'endurance', isAction: false } } });
  assert.notEqual(freeTest.code, 'F2_GRAPPLE_FIRST_ACTION', 'un actionized Resistance Test stays available during the actor’s Turn');
  const declaredAction = store.previewResolution({ actorId: 'held', targetId: 'holder', action: { type: 'test', label: 'Force', attr: 'F', base: 40 }, roll: 35,
    v5: { kind: 'test', context: { skillId: 'force', isAction: true } } });
  assert.equal(declaredAction.code, 'F2_GRAPPLE_FIRST_ACTION', 'an explicitly declared Test Action remains subject to the grapple rule');
});
});

describe('Défauts signalés', () => {
test('T2 bis characterization — Perdez votre prochaine Action ne bloque pas un Test hors Action', () => {
  const actor={id:'a',states:[],skills:[],extensions:{v5:{combatEffects:[{id:'fumble',kind:'lose-next-action'}]}}};
  const result=buildCombatTest({actor,action:{type:'test',label:'Endurance',base:40},roll:25,v5:{kind:'test',context:{isAction:false}},round:1});
  assert.equal(result.restrictions.some(row=>row.includes('cette Action est perdue')),false);
});

for(const label of ['Ag','Escrime','Bagarre']) test(`T2 bis characterization — Bouclier reconnaît ${label} par libellé`, () => {
  const target={equipment:[{id:'shield',kind:'shield',ap:2,keywords:[{id:'bouclier'}]}],extensions:{v5:{}}};
  const result=v5ShieldDefense({target,defense:{label},protectionContext:{shieldId:'shield',shieldAvailable:true,opposedWithShield:true},attackContext:{ranged:false}});
  assert.equal(result.v5Bonus,true,`${label} doit être une défense recevable avec un bouclier`);
  assert.equal(result.rating,2);
});

test('T2 bis characterization — Ag brute est Esquive pour un tir avec au moins 2 PA', () => {
  const target={equipment:[{id:'shield',kind:'shield',ap:2,keywords:[{id:'bouclier'}]}],extensions:{v5:{}}};
  const result=v5ShieldDefense({target,defense:{label:'Ag'},protectionContext:{shieldId:'shield',shieldAvailable:true,opposedWithShield:true},attackContext:{ranged:true}});
  assert.equal(result.v5Bonus,true);
  assert.equal(result.rangedDodgeAllowed,true);
});

test('T2 bis characterization — Ag brute ne permet pas d’opposer un tir avec moins de 2 PA', () => {
  const target={equipment:[{id:'shield',kind:'shield',ap:1,keywords:[{id:'bouclier'}]}],extensions:{v5:{}}};
  const result=v5ShieldDefense({target,defense:{label:'Ag'},protectionContext:{shieldId:'shield',shieldAvailable:true,opposedWithShield:true},attackContext:{ranged:true}});
  assert.equal(result.v5Bonus,false);
  assert.equal(result.rangedDodgeAllowed,false);
});

test('T2 bis characterization — Ag brute reste une défense valide contre une attaque de mêlée', () => {
  const target={equipment:[{id:'shield',kind:'shield',ap:1,keywords:[{id:'bouclier'}]}],extensions:{v5:{}}};
  const result=v5ShieldDefense({target,defense:{label:'Ag'},protectionContext:{shieldId:'shield',shieldAvailable:true,opposedWithShield:true},attackContext:{ranged:false}});
  assert.equal(result.v5Bonus,true);
});

test('T2 bis characterization — PA du bouclier attaché ne couvrent que Tête, Corps et bras non directeur', () => {
  const shield={id:'shield',kind:'shield',name:'Pavois',ap:2,locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[{id:'bouclier'}]};
  const target={equipment:[shield],extensions:{v5:{}}};
  const common={shieldId:'shield',shieldAvailable:true,defenseProvided:true,opposedWithShield:true,ranged:false,shieldAttached:true,nonDominantArmSide:'left'};
  for(const location of ['head','body','leftArm']) {
    assert.equal(locationProtection(target,{...common,location}).shieldAp,2,`${location} couvert`);
  }
  for(const location of ['rightArm','leftLeg','rightLeg']) {
    assert.equal(locationProtection(target,{...common,location}).shieldAp,0,`${location} non couvert`);
  }
});

test('T2 bis characterization — PA de défense du bouclier tiennent compte des dégâts d’équipement', () => {
  const shield={id:'shield',kind:'shield',ap:2,keywords:[{id:'bouclier'}]};
  const target={equipment:[shield],extensions:{v5:{armorDamageByItem:{shield:1}}}};
  const result=v5ShieldDefense({target,defense:{label:'Esquive'},protectionContext:{shieldId:'shield',shieldAvailable:true,opposedWithShield:true},attackContext:{ranged:false}});
  assert.equal(result.rating,1);
});

test('T2 bis characterization — décide la mort au Round courant du Store, même si options.round est fourni', async () => {
  let saved;
  const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({persistence,storage:null}); await store.ready;
  const participant={id:'p',name:'P',kind:'PJ',zone:'active',hp:0,maxHp:10,caracs:{BE:0},states:[{id:'u',key:'inconscient',name:'Inconscient'}],extensions:{v5:{criticalDeath:{status:'awaiting-mj',dueRound:3,toughnessBonus:0,criticalIds:['c']},criticalWounds:[{id:'c'}]}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:2,currentActorId:'p',order:['p'],participants:[participant]},extensions:{v5:{}}});
  await assert.rejects(store.decideCriticalDeath('p','confirm',{round:3}),/n’a pas atteint son échéance/);
  assert.equal(store.listParticipants().find(row=>row.id==='p').extensions.v5.dead,undefined);
});
});

describe('Store et journal (caractérisation)', () => {
const memory = () => {
  let saved = null;
  return {
    async load() { return saved && structuredClone(saved); },
    async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; },
  };
};

test('T2 bis regression — a successful action.type=test is journaled as Test', async () => {
  const store = createStore({ storage: null, persistence: memory() });
  await store.ready;
  const actor = { id: 'tester', name: 'Testeur', kind: 'PJ', zone: 'active', hp: 10, maxHp: 10,
    caracs: { F: 40 }, skills: [], states: [], equipment: [], extensions: { v5: {} } };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: actor.id,
    order: [actor.id], participants: [actor] }, log: [], diceLines: [] });
  const preview = store.previewResolution({ resolutionId: 'journal-test-action', actorId: actor.id, round: 1,
    action: { type: 'test', attr: 'F', base: 40 }, roll: 20, v5: { kind: 'test' } });
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  const entry = JSON.parse(store.getFullJSON()).log[0];
  assert.equal(entry.detail.actionType, 'test');
  assert.match(entry.text, /^Test — réussite/u);
});
});

describe('Talents de mots-clés V5', () => {
// All participants, acquisitions and equipment are synthetic, with public rule identities.
const talents = (...names) => aggregateTalents(names.map(nom => ({ nom }))).items;
const skill = name => getReferenceCatalogue().skills.find(row => row.nom === name).id;
const person = (id, extra = {}) => ({ id, name: 'Personnage synthétique ' + id,
  kind: id === 'a' ? 'PJ' : 'Créature', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active',
  hp: 40, maxHp: 40, initiative: 60, caracs: { CC: 60, CT: 60, F: 30, E: 30 },
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], talents: [],
  extensions: { v5: { hasMomentum: false } }, ...extra });
const object = (id, extra = {}) => ({ id, baseId: 'synthetic-model-' + id, catalogVersion: 'synthetic',
  kind: 'armour', name: 'Objet synthétique ' + id, category: 'Armure', damage: '', reach: '', range: '',
  ap: 1, locations: ['body'], layer: 'leather', keywords: [], notes: '', source: 'Recette synthétique', custom: true, ...extra });
const words = (...ids) => ids.map(id => ({ id, parameter: '' }));
const weapon = (id, ids = [], extra = {}) => object(id, { kind: 'weapon', category: 'Base',
  damage: 'BF+1', ap: null, locations: [], layer: 'none', keywords: words(...ids), ...extra });
const bow = (ids = []) => weapon('bow', ids, { category: 'Arc', range: '50' });
const ammo = (ids = []) => object('arrow', { kind: 'ammunition', category: 'Arc', damage: '+0',
  ap: null, locations: [], layer: 'none', keywords: words(...ids) });
const attack = (extra = {}) => ({ id: 'synthetic-attack', type: 'attack', base: 60, damage: 4, qualities: [], ...extra });
const raw = (extra = {}) => ({ resolutionId: 'keyword-interaction', actor: person('a'), target: person('t'),
  baseRevision: 2, round: 1, roll: 23, action: attack(),
  defense: { base: 30, roll: 47, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });
const pureState = p => ({ revision: p.baseRevision, round: p.input.round,
  participants: [p.input.actor, p.input.target], appliedResolutionIds: [] });
const proposals = p => p.talentPlans.flatMap(plan => plan.proposals || []);
const frozen = value => { if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); } return value; };
const snapshotStore = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
async function setup(a = person('a'), t = person('t')) {
  let saved = null;
  const persistence = { load: async () => structuredClone(saved),
    saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, extensions: { v5: { combatId: 'keyword-synthetic-combat', turnIndex: 1 } },
    reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a', 't'], participants: [a, t] }, diceLines: [], log: [] });
  return { store, persistence };
}
const storeInput = extra => ({ actorId: 'a', targetId: 't', resolutionId: 'keyword-store-interaction',
  roll: 23, action: attack(), defense: { base: 30, roll: 47, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });
function isolated(source) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source],
    { cwd: new URL('../../..', import.meta.url), encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('Mots clés × talents — arc et munition Empaleuse dédoublonnés, Tir précis, armure et reçu Store', async () => {
  const equipment = [bow(['empaleuse']), ammo(['empaleuse'])];
  const protection = [object('helmet', { locations: ['head'] }),
    object('plates', { ap: 3, layer: 'rigid', keywords: words('points-faibles', 'impenetrable') })];
  const a = person('a', { equipment, talents: talents('Tir précis', 'Coup puissant') });
  const t = person('t', { equipment: protection, talents: talents('Tir précis', 'Coup puissant') });
  const { store, persistence } = await setup(a, t);
  const before = snapshotStore(store);
  const input = frozen(storeInput({ roll: 20, defense: undefined, ammunitionId: 'arrow',
    action: attack({ extensions: { fiche: { equipmentId: 'bow' } } }),
    criticalRolls: { location: 50, effect: 4 }, v5: { kind: 'ranged', aimed: true } }));
  const p = store.previewResolution(input);
  assert.equal(p.input.action.qualities.filter(row => row.id === 'empaleuse').length, 1);
  assert.equal(p.input.ammunitionSources.length, 2);
  assert.equal(p.critical.expanded, true); assert.equal(p.location.key, 'HEAD');
  assert.equal(p.critical.details.location.key, 'BODY');
  assert.equal(p.protection.ap, 1); assert.equal(p.critical.details.protection.ap, 0);
  assert.equal(p.damage.talentDamage, 2); assert.equal(p.damage.finalDamage, 6);
  assert.deepEqual(snapshotStore(store), before, 'aperçu pur malgré pièces et munition liées');
  assert.equal((await store.applyResolution(p)).status, 'applied');
  const applied = snapshotStore(store);
  assert.equal(p.critical.application.extraWounds, 0);
  assert.equal(store.listParticipants().find(row => row.id === 't').hp, 34);
  for (const participant of applied.combat.participants) {
    const original = before.combat.participants.find(row => row.id === participant.id);
    assert.deepEqual(participant.equipment, original.equipment);
  }
  const detail = store.getLog()[0].detail;
  assert.equal(detail.damage.talentDamage, 2); assert.equal(detail.ammunitionSources.length, 2);
  assert.equal(detail.critical.details.protection.ap, 0);
  assert.equal((await store.applyResolution(p)).status, 'duplicate');
  const reloaded = createStore({ persistence }); await reloaded.ready;
  assert.deepEqual(reloaded.listParticipants(), store.listParticipants());
  assert.deepEqual(reloaded.getLog()[0].detail, detail);
  await reloaded.undo(); assert.deepEqual(snapshotStore(reloaded).combat.participants, before.combat.participants);
});

test('Mots clés × talents — Empaleuse exige réussite propre, même sur opposition gagnée', () => {
  for (const roll of [55, 60, 100]) {
    const p = previewResolution(raw({ roll, action: attack({ base: 40, qualities: ['empaleuse'] }),
      actor: person('a', { talents: talents('Coup puissant') }),
      defense: { base: 0, roll: 94, v5: { kind: 'melee' } } }));
    assert.equal(p.success, false); assert.equal(p.critical, null);
    if (roll !== 100) assert.equal(p.hit, true, 'victoire opposée ne suffit pas à déclencher Empaleuse');
  }
});

test('Mots clés × talents — critique Empaleuse indépendant de victoire et armure de sa localisation', () => {
  const target = person('t', { equipment: [object('plates', { ap: 2, layer: 'rigid', keywords: words('impenetrable') })] });
  const common = raw({ target, actor: person('a', { talents: talents('Coup puissant') }), roll: 33,
    action: attack({ base: 50, qualities: ['empaleuse'] }),
    defense: { base: 70, roll: 20, v5: { kind: 'melee' } } });
  const protectedBody = previewResolution({ ...common, criticalRolls: { location: 50, effect: 20 } });
  assert.equal(protectedBody.hit, false); assert.equal(protectedBody.success, true);
  assert.equal(protectedBody.damage, null); assert.equal(protectedBody.critical, null);
  assert.equal(proposals(protectedBody).some(row => row.op === 'modifyDamage'), false);
  const bareHead = previewResolution({ ...common, criticalRolls: { location: 2, effect: 20 } });
  assert.equal(bareHead.hit, false); assert.equal(bareHead.critical.expanded, false);
  assert.equal(bareHead.critical.details.location.key, 'HEAD'); assert.equal(bareHead.critical.application.extraWounds, 1);
  const even = previewResolution({ ...common, roll: 30, criticalRolls: { location: 50, effect: 20 } });
  assert.equal(even.hit, false); assert.equal(even.critical.expanded, true);
});

test('Mots clés × talents — défense Empaleuse a son propre jet et protège seulement la localisation critique de l’attaquant', () => {
  const actor = person('a', { equipment: [object('plates', { ap: 2, layer: 'rigid', keywords: words('impenetrable') })],
    talents: talents('Coup puissant') });
  for (const [roll, location, expectedCritical] of [[33, 50, false], [33, 2, true], [30, 50, true]]) {
    const p = previewResolution(raw({ actor, target: person('t', { talents: talents('Coup puissant') }), action: attack({ base: 30 }),
      defense: { base: 70, roll, qualities: ['empaleuse'], v5: { kind: 'melee' } },
      defenderCriticalRolls: { location, effect: 20 } }));
    assert.equal(Boolean(p.defenderCritical), expectedCritical);
    assert.equal(proposals(p).some(row => row.op === 'modifyDamage'), false, 'talent du défenseur ne devient pas bonus de blessure critique');
    if (p.defenderCritical) assert.equal(p.defenderCritical.targetId, 'a');
  }
});

test('Mots clés × talents — inversion contextuelle choisit le jet qui déclenche Empaleuse', () => {
  const action = attack({ qualities: ['empaleuse'], extensions: { fiche: { skillId: skill('Corps à corps (Bagarre)') } } });
  const actor = person('a', { talents: talents('Mains agiles', 'Coup puissant') });
  const initialMultiple = previewResolution(raw({ actor, action, roll: 70,
    v5: { kind: 'melee', choice: 'reverse', context: { touchingOpponent: true } } }));
  assert.equal(initialMultiple.test.advantage.net, 1); assert.equal(initialMultiple.roll, 7);
  assert.equal(initialMultiple.critical, null); assert.equal(initialMultiple.damage.talentDamage, 2);
  const finalMultiple = previewResolution(raw({ actor, action, roll: 4,
    criticalRolls: { location: 2, effect: 20 },
    v5: { kind: 'melee', context: { touchingOpponent: true }, disadvantageSources: [{ id: 'synthetic-one' }, { id: 'synthetic-two' }] } }));
  assert.equal(finalMultiple.test.advantage.net, -1); assert.equal(finalMultiple.roll, 40);
  assert.equal(finalMultiple.test.optionId, 'reverse'); assert.equal(finalMultiple.critical.expanded, true);
  assert.equal(finalMultiple.damage.talentDamage, 1, 'avantage talent annulé ne majore pas Coup puissant');
});

test('Mots clés × talents — Défensive/Déséquilibrée face à une inversion Bagarre, sans avantage de défense Mains agiles', () => {
  const action = attack({ base: 40, extensions: { fiche: { skillId: skill('Corps à corps (Bagarre)') } } });
  const actor = person('a', { talents: talents('Mains agiles', 'Coup puissant') });
  const target = person('t', { talents: talents('Mains agiles', 'Coup puissant') });
  const defense = { base: 50, roll: 42, qualities: ['defensive', 'Defensive'],
    extensions: { fiche: { skillId: skill('Corps à corps (Bagarre)') } }, v5: { kind: 'melee', context: { touchingOpponent: true } } };
  const absent = previewResolution(raw({ action, target, roll: 61, defense }));
  assert.equal(absent.hit, false); assert.equal(absent.test.advantage.net, 0);
  const supplied = previewResolution(raw({ action, actor, target, roll: 61, defense,
    v5: { kind: 'melee', choice: 'reverse', context: { touchingOpponent: true } } }));
  assert.equal(supplied.roll, 16); assert.equal(supplied.defenderTest.advantage.net, 0);
  assert.equal(supplied.defenderTest.sl, 2); assert.equal(supplied.opposition.netSl, 1);
  assert.equal(supplied.damage.talentDamage, 2); assert.equal(supplied.damage.finalDamage, 4);
  const unwieldy = previewResolution(raw({ action, actor, target, roll: 61,
    defense: { ...defense, qualities: [...defense.qualities, 'desequilibree'] },
    v5: { kind: 'melee', choice: 'reverse', context: { touchingOpponent: true } } }));
  assert.equal(unwieldy.defenderTest.sl, 0); assert.equal(unwieldy.opposition.netSl, 3);
  assert.equal(unwieldy.damage.finalDamage, 6);
  assert.equal(unwieldy.defenderTest.details.modifiers.some(row => row.id === 'defensive-protection'), false);
});

test('Mots clés × talents — Pointue conditionnelle, Imprécise prioritaire et Coup puissant avant protection', () => {
  for (const [qualities, expectedSl, bareDamage, talentDamage] of [
    [[], 1, 3, 4], [['pointue'], 2, 4, 5], [['pointue', 'imprecise'], 0, 2, 3]
  ]) {
    for (const acquired of [false, true]) {
      const input = frozen(raw({ roll: 49, action: attack({ base: 50, qualities }),
        actor: person('a', { talents: acquired ? talents('Coup puissant') : [] }) }));
      const before = structuredClone(input), p = previewResolution(input);
      assert.equal(p.sl, expectedSl); assert.equal(p.success, true);
      assert.equal(p.damage.finalDamage, acquired ? talentDamage : bareDamage);
      assert.equal(p.damage.talentDamage || 0, acquired ? 1 : 0);
      assert.deepEqual(input, before);
    }
  }
  const failed = previewResolution(raw({ roll: 49, action: attack({ base: 40, qualities: ['pointue'] }),
    defense: { base: 0, roll: 94, v5: { kind: 'melee' } } }));
  assert.equal(failed.success, false); assert.equal(failed.hit, true); assert.equal(failed.sl, 0);
  assert.equal(failed.test.details.modifiers.some(row => row.id === 'quality-success'), false);
});

test('Mots clés × talents — Pointue d’arme, Imprécise de munition et Tir précis suivent visée et réussite', () => {
  for (const [ammoQualities, expectedSl, expectedDamage] of [[[], 2, 5], [['imprecise'], 0, 3]]) {
    const equipment = [bow(['pointue']), ammo(ammoQualities)];
    const p = previewResolution(raw({ actor: person('a', { equipment, talents: talents('Tir précis', 'Coup puissant') }),
      target: person('t', { armor: { head: 0, body: 1, arms: 0, legs: 0 } }), defense: undefined, roll: 49,
      ammunitionId: 'arrow', action: attack({ base: 50, extensions: { fiche: { equipmentId: 'bow' } } }),
      v5: { kind: 'ranged', aimed: true } }));
    assert.equal(p.sl, expectedSl); assert.equal(p.damage.talentDamage, 2); assert.equal(p.damage.finalDamage, expectedDamage);
    assert.deepEqual(p.input.actor.equipment, equipment);
    const ordinary = previewResolution({ ...p.input, v5: { kind: 'ranged', aimed: false } });
    assert.equal(ordinary.damage.talentDamage, 1); assert.equal(ordinary.damage.finalDamage, expectedDamage - 1);
  }
  const miss = previewResolution(raw({ actor: person('a', { talents: talents('Tir précis') }), defense: undefined,
    action: attack({ base: 30, qualities: ['pointue'] }), roll: 49, v5: { kind: 'ranged' } }));
  assert.equal(miss.success, false); assert.equal(miss.damage, null);
  assert.equal(miss.unresolved.some(row => row.includes('aimed')), false);
});

test('Mots clés × talents — Inoffensive annule Dévastatrice sans supprimer Coup puissant ni le seuil de zéro', () => {
  for (const [qualities, present, advantage, expected] of [
    [['devastatrice'], false, false, 8], [['devastatrice'], true, false, 9],
    [['inoffensive', 'devastatrice'], false, false, 0], [['inoffensive', 'devastatrice'], true, false, 0],
    [['inoffensive', 'devastatrice'], true, true, 1]
  ]) {
    const p = previewResolution(raw({ roll: 38,
      actor: person('a', { talents: present ? talents('Coup puissant') : [] }),
      target: person('t', { armor: { head: 2, body: 2, arms: 2, legs: 2 } }),
      action: attack({ base: 40, damage: 5, qualities }),
      defense: { base: 40, roll: 42, v5: { kind: 'melee' } },
      v5: { kind: 'melee', ...(advantage ? { advantageSources: [{ id: 'synthetic-advantage' }] } : {}) } }));
    assert.equal(p.damage.finalDamage, expected); assert.equal(p.damage.sl, qualities.includes('inoffensive') ? 1 : 8);
    assert.equal(p.damage.talentDamage || 0, present ? advantage ? 2 : 1 : 0);
    assert.equal(p.damage.paEffectif, qualities.includes('inoffensive') ? 4 : 2);
  }
});

test('Mots clés × talents — Inoffensive et Dévastatrice gardent Tir précis hors multiplication des PA', () => {
  for (const [aimed, expected] of [[false, 0], [true, 1]]) {
    const p = previewResolution(raw({ actor: person('a', { talents: talents('Tir précis') }), defense: undefined,
      target: person('t', { armor: { head: 2, body: 2, arms: 2, legs: 2 } }), roll: 38,
      action: attack({ base: 40, damage: 5, qualities: ['inoffensive', 'devastatrice'] }), v5: { kind: 'ranged', aimed } }));
    assert.equal(p.damage.sl, 1); assert.equal(p.damage.paEffectif, 4);
    assert.equal(p.damage.talentDamage, aimed ? 2 : 1); assert.equal(p.damage.finalDamage, expected);
  }
});

test('Mots clés × talents — inversion choisie modifie Partielle et opposition, sans réécrire l’armure', async () => {
  const equipment = [object('leather'), object('partial', { ap: 2, layer: 'rigid', keywords: words('partielle') })];
  const { store } = await setup(person('a', { talents: talents('Mains agiles', 'Coup puissant') }), person('t', { equipment }));
  const before = snapshotStore(store);
  const input = storeInput({ roll: 74, action: attack({ base: 80, damage: 5,
    extensions: { fiche: { skillId: skill('Corps à corps (Bagarre)') } } }),
    defense: { base: 40, roll: 32, v5: { kind: 'melee' } },
    v5: { kind: 'melee', choice: 'keep', context: { touchingOpponent: true } } });
  const keep = store.previewResolution(input), reversed = store.previewResolution({ ...input, v5: { ...input.v5, choice: 'reverse' } });
  assert.equal(keep.roll, 74); assert.equal(keep.location.roll, 47); assert.equal(keep.protection.ap, 3); assert.equal(keep.damage.finalDamage, 1);
  assert.equal(reversed.roll, 47); assert.equal(reversed.location.roll, 74); assert.equal(reversed.protection.ap, 1); assert.equal(reversed.damage.finalDamage, 6);
  assert.equal(reversed.protection.ignored.find(row => row.item.id === 'partial').reason, 'Partielle : localisation paire');
  assert.deepEqual(snapshotStore(store), before);
  assert.equal((await store.applyResolution(reversed)).status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === 't').hp, 34);
  assert.deepEqual(store.listParticipants().find(row => row.id === 't').equipment, equipment);
  await store.undo(); assert.deepEqual(snapshotStore(store).combat.participants, before.combat.participants);
});

test('Mots clés × talents — zones gauche/droite et couches exactes avec Tir précis', () => {
  const equipment = [object('leather', { locations: ['leftArm', 'rightArm'] }),
    object('left-mail', { ap: 2, locations: ['leftArm'], layer: 'flexible', keywords: words('flexible') }),
    object('right-plates', { ap: 4, locations: ['rightArm'], layer: 'rigid' }),
    object('right-lesser', { ap: 2, locations: ['rightArm'], layer: 'rigid' })];
  const target = frozen(person('t', { equipment })), before = structuredClone(target);
  for (const [roll, side, armour, damage] of [[51, 'left', 3, 2], [52, 'right', 5, 1]]) {
    const p = previewResolution(raw({ actor: person('a', { talents: talents('Tir précis') }), target, roll, defense: undefined,
      action: attack({ base: 80 }), v5: { kind: 'ranged', aimed: false } }));
    assert.equal(p.location.side, side); assert.equal(p.protection.ap, armour); assert.equal(p.damage.finalDamage, damage);
    assert.equal(p.damage.talentDamage, 1);
  }
  assert.deepEqual(target, before);
});

test('Mots clés × talents — Assommante déjà présente ne s’ajoute pas avec Frappe, Mâchoires réduit une seule acquisition', async () => {
  const equipment = [weapon('club', ['assommante'])];
  const { store } = await setup(person('a', { equipment, talents: talents('Frappe assommante', 'Coup puissant') }),
    person('t', { talents: talents('Mâchoires d’acier') }));
  const p = store.previewResolution(storeInput({ roll: 10,
    action: attack({ base: 40, qualities: ['assommante', 'Pummel'], extensions: { fiche: { equipmentId: 'club' } } }),
    defense: { base: 40, roll: 32, v5: { kind: 'melee' } },
    v5: { kind: 'melee', context: { weaponImprovised: true } } }));
  assert.equal(p.input.action.qualities.filter(row => row.id === 'assommante').length, 1);
  assert.equal(proposals(p).filter(row => row.op === 'addQuality').length, 0);
  assert.equal(p.damage.talentDamage, 1); assert.equal(p.damage.finalDamage, 4);
  assert.equal(p.weaponConditions.proposed.length, 1); assert.equal(p.weaponConditions.applied.length, 0);
  assert.equal(p.talentUsageRequests.length, 1);
  assert.equal((await store.applyResolution(p)).status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === 't').hp, 36);
  assert.equal(store.listParticipants().find(row => row.id === 't').states.some(row => row.key === 'sonne'), false);
  assert.deepEqual(store.listParticipants().find(row => row.id === 'a').equipment, equipment);
  assert.equal(snapshotStore(store).extensions.v5.actionLedger.quotaUsage.length, 1);
});

test('Mots clés × talents — Battement remplace Empaleuse/Dévastatrice/Assommante et conserve le critique défensif', async () => {
  const equipment = [weapon('club', ['assommante', 'empaleuse', 'devastatrice'])];
  const { store } = await setup(person('a', { equipment, talents: talents('Battement', 'Frappe assommante', 'Coup puissant') }),
    person('t', { talents: talents('Mâchoires d’acier') }));
  const p = store.previewResolution(storeInput({ roll: 22,
    action: attack({ base: 90, damage: 40, extensions: { fiche: { equipmentId: 'club' } } }),
    defense: { base: 30, roll: 22, qualities: ['empaleuse'], v5: { kind: 'melee' } },
    criticalRolls: { location: 2, effect: 20 }, defenderCriticalRolls: { location: 2, effect: 20 },
    v5: { kind: 'melee', actorSize: 3, targetSize: 3, context: { weaponImprovised: true },
      talentChoices: { 'talent-beat-blade:replace-damage': true } } }));
  assert.equal(p.damage, null); assert.equal(p.critical, null); assert.equal(p.weaponConditions.proposed.length, 0);
  assert.equal(p.talentUsageRequests.length, 0); assert.equal(p.defenderCritical.application.extraWounds, 1);
  assert.equal((await store.applyResolution(p)).status, 'applied');
  const [a, t] = ['a', 't'].map(id => store.listParticipants().find(row => row.id === id));
  assert.equal(a.hp, 39); assert.equal(t.hp, 40); assert.ok(a.states.some(row => row.key === 'sonne'));
  assert.ok(t.states.some(row => row.kind === 'talent-active')); assert.equal(t.states.some(row => row.key === 'sonne'), false);
  assert.deepEqual(a.equipment, equipment); assert.equal(snapshotStore(store).extensions.v5.actionLedger.quotaUsage.length, 0);
});

test('Mots clés × talents — V4 Précise/Percutante ne deviennent pas DR V5 avec Coup puissant', () => {
  for (const quality of ['precise', 'percutante']) {
    const p = previewResolution(raw({ actor: person('a', { talents: talents('Coup puissant') }),
      action: attack({ qualities: [quality] }) }));
    assert.equal(p.test.score, 60); assert.equal(p.sl, 4); assert.equal(p.damage, null);
    assert.ok(p.mechanicalWarnings.some(row => row.keywordId === quality));
    assert.equal(applyResolution(p, pureState(p)).status, 'manual');
  }
});

test('Mots clés × talents — inconnu reste rappel visible sans moteur, armure inconnue ne vaut pas zéro', () => {
  const base = raw({ actor: person('a', { talents: talents('Coup puissant') }) });
  const unknown = previewResolution({ ...base, action: attack({ qualities: ['unknown-editorial-word'] }) });
  const ordinary = previewResolution(base);
  assert.equal(unknown.mechanics[0].status, 'manual'); assert.equal(unknown.mechanics[0].engine, null);
  assert.equal(unknown.damage.finalDamage, ordinary.damage.finalDamage);
  assert.equal(unknown.sl, ordinary.sl); assert.equal(applyResolution(unknown, pureState(unknown)).status, 'applied', 'politique historique du rappel sans moteur');
  const missing = previewResolution({ ...base, target: person('t', { equipment: [object('unknown-ap', { ap: null, locations: ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'] })] }) });
  assert.equal(missing.protection.ap, null); assert.equal(missing.damage, null);
  assert.equal(applyResolution(missing, pureState(missing)).status, 'manual');
});

test('Mots clés × talents — sources retirées ou V4 désactivent qualités et bonus sans deviner', () => {
  isolated(`
    import assert from 'node:assert/strict';
    import snapshot from './js/data/reference-snapshot.json' with { type: 'json' };
    const pack = structuredClone(snapshot);
    pack.equipment.keywords = pack.equipment.keywords.filter(row => row.id !== 'empaleuse');
    pack.equipment.keywords.find(row => row.id === 'impenetrable').edition = 'V4';
    pack.talents.entries = pack.talents.entries.filter(row => row.id !== 'talent-strike-mighty-blow');
    globalThis.localStorage = { getItem: () => JSON.stringify({ data: pack, updatedAt: '2030-01-01T00:00:00Z' }) };
    const { previewResolution, applyResolution } = await import('./js/core/resolution.js');
    const a = { id:'a',hp:40,caracs:{F:30,E:30},states:[],talents:[{id:'talent-strike-mighty-blow',status:'resolved',rank:1}] };
    const t = { id:'t',hp:40,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0},states:[] };
    const base={actor:a,target:t,roll:20,baseRevision:2,round:1,action:{type:'attack',base:60,damage:4,qualities:['empaleuse']},defense:{base:30,roll:47,v5:{kind:'melee'}},v5:{kind:'melee'}};
    const p=previewResolution(base);assert.equal(p.critical,null);assert.equal(p.damage,null);assert.equal(applyResolution(p,{revision:2,round:1,participants:[a,t]}).status,'manual');
    const ordinary=previewResolution({...base,roll:23,action:{...base.action,qualities:[]}});
    assert.equal(ordinary.damage.talentDamage,undefined);assert.ok(ordinary.talentPlans.some(plan=>plan.trace.some(row=>row.status==='sourceUnavailable')));
    const armored={...t,equipment:[{id:'plate',kind:'armour',name:'Plate synthétique',ap:2,locations:['body'],layer:'rigid',keywords:[{id:'impenetrable',parameter:''}]}]};
    const protectedCritical=previewResolution({...base,target:armored,roll:33,action:{...base.action,qualities:[]},criticalRolls:{location:50,effect:20}});
    assert.ok(protectedCritical.critical);assert.ok(protectedCritical.unresolved.some(row=>row.includes('impenetrable')));
    assert.equal(applyResolution(protectedCritical,{revision:2,round:1,participants:[a,armored]}).status,'manual');
  `);
});

for (const affected of ['pointue', 'defensive', 'impenetrable', 'partielle']) {
  test('Mots clés × talents — confirmation Store refuse source changée : ' + affected, () => {
    isolated(`
      import assert from 'node:assert/strict';
      import { readFile } from 'node:fs/promises';
      import { createStore } from './js/core/store.js';
      import { getReferenceCatalogue, refreshReferences } from './js/core/reference-catalog.js';
      const id=${JSON.stringify(affected)};
      const a={id:'a',name:'Auteur synthétique',kind:'PJ',camp:'pj',zone:'active',hp:40,maxHp:40,caracs:{F:30,E:30},states:[],talents:[{id:'talent-strike-mighty-blow',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false}}};
      const t={id:'t',name:'Cible synthétique',kind:'Créature',camp:'ennemi',zone:'active',hp:40,maxHp:40,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0},states:[]};
      if(['impenetrable','partielle'].includes(id))t.equipment=[{id:'helmet',kind:'armour',name:'Casque synthétique',ap:2,locations:['head'],layer:'rigid',keywords:[{id,parameter:''}]}];
      const store=createStore({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});await store.ready;
      await store.loadFromJSON({schemaVersion:3,extensions:{v5:{combatId:'keyword-source-combat',turnIndex:1}},reserve:[],combat:{round:1,currentActorId:'a',order:['a','t'],participants:[a,t]},diceLines:[],log:[]});
      const p=store.previewResolution({actorId:'a',targetId:'t',resolutionId:'keyword-source-result',roll:id==='impenetrable'?33:id==='partielle'?40:23,
        action:{type:'attack',base:60,damage:4,qualities:id==='pointue'?['pointue']:[]},
        defense:{base:30,roll:47,qualities:id==='defensive'?['defensive']:[],v5:{kind:'melee'}},
        criticalRolls:{location:2,effect:20},v5:{kind:'melee'}});
      assert.equal(p.unresolved.length,0);assert.ok(p.damage);
      if(id==='impenetrable')assert.equal(p.critical,null);
      if(id==='partielle')assert.equal(p.protection.counted.length,0);
      const capture=()=>{const s=JSON.parse(store.getFullJSON());delete s.exportedAt;return s;};
      const before=capture(),history=store.getHistory(),revision=store.getLocalRevision();
      const oldText=getReferenceCatalogue().keywords.find(row=>row.id===id).effect;
      const refreshed=await refreshReferences({storage:null,forceRefresh:true,fetchImpl:async url=>{
        const sheet=decodeURIComponent(url.split('&sheet=')[1]);let csv=await readFile('./js/data/reference-source-csv/'+sheet+'.csv','utf8');
        if(sheet==='Mots Clés Armes et Armures'){assert.ok(csv.includes(oldText));csv=csv.replace(oldText,'Effet synthétique modifié pour la recette de confirmation.');}
        return {ok:true,text:async()=>csv};
      }});
      assert.equal(refreshed.ok,true,refreshed.status?.error);
      assert.equal((await store.applyResolution(p)).status,'manual');
      assert.equal(store.getLocalRevision(),revision);assert.deepEqual(capture(),before);assert.deepEqual(store.getHistory(),history);
    `);
  });
}

test('Mots clés × talents — Protectrice changée avant aperçu ne donne ni DR ni défense contre le tir', () => {
  isolated(`
    import assert from 'node:assert/strict';
    import snapshot from './js/data/reference-snapshot.json' with { type: 'json' };
    const pack=structuredClone(snapshot);pack.equipment.keywords.find(row=>row.id==='protectrice').effect+=' Effet changé.';
    globalThis.localStorage={getItem:key=>key==='wfrp.references.v1'?JSON.stringify({data:pack,updatedAt:'2030-01-01T00:00:00Z'}):null};
    const {createStore}=await import('./js/core/store.js');
    const {v5ShieldDefense}=await import('./js/core/v5-combat-rules.js');
    const a={id:'a',name:'Auteur synthétique',kind:'PJ',camp:'pj',zone:'active',hp:40,maxHp:40,caracs:{F:30,E:30},states:[],talents:[{id:'talent-strike-mighty-blow',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false}}};
    const t={id:'t',name:'Cible synthétique',kind:'Créature',camp:'ennemi',zone:'active',hp:40,maxHp:40,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0},states:[],
      equipment:[{id:'shield',kind:'shield',name:'Bouclier synthétique',ap:2,locations:[],layer:'none',keywords:[{id:'protectrice',parameter:'2'}]}]};
    const store=createStore({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});await store.ready;
    await store.loadFromJSON({schemaVersion:3,extensions:{v5:{combatId:'keyword-shield-combat',turnIndex:1}},reserve:[],combat:{round:1,currentActorId:'a',order:['a','t'],participants:[a,t]},diceLines:[],log:[]});
    const capture=()=>{const s=JSON.parse(store.getFullJSON());delete s.exportedAt;return s;};
    const before=capture(),history=store.getHistory(),revision=store.getLocalRevision();
    for(const kind of ['melee','ranged']){
      const p=store.previewResolution({actorId:'a',targetId:'t',resolutionId:'keyword-shield-'+kind,roll:47,
        action:{type:'attack',base:20,damage:4,qualities:[]},defense:{base:40,roll:23,label:kind==='ranged'?'Esquive':'CC',v5:{kind:kind==='ranged'?'test':'melee'}},
        protectionContext:{shieldId:'shield',shieldAvailable:true,opposedWithShield:true,lineOfSight:true},v5:{kind}});
      assert.equal(p.hit,false);assert.equal(p.defenderTest.sl,2);assert.equal(p.defenderTest.details.modifiers.some(row=>row.id==='defensive-protection'),false);
      assert.equal(v5ShieldDefense(p.input).rangedDodgeAllowed,false);assert.ok(p.unresolved.some(row=>row.includes('Protectrice')));
      if(kind==='ranged')assert.ok(p.unresolved.some(row=>row.includes('défense contre un tir')));
      assert.equal((await store.applyResolution(p)).status,'manual');
      assert.equal(store.getLocalRevision(),revision);assert.deepEqual(capture(),before);assert.deepEqual(store.getHistory(),history);
    }
  `);
});

for (const change of ['unrelated', 'source-only']) {
  test('Mots clés × talents — actualisation ' + change + ' respecte les seules sources utilisées', () => {
    isolated(`
      import assert from 'node:assert/strict';
      import {readFile} from 'node:fs/promises';
      import {createStore} from './js/core/store.js';
      import {refreshReferences,parseReferenceCSV} from './js/core/reference-catalog.js';
      const change=${JSON.stringify(change)};
      const a={id:'a',name:'Auteur synthétique',kind:'PJ',camp:'pj',zone:'active',hp:40,maxHp:40,caracs:{F:30,E:30},states:[],talents:[{id:'talent-strike-mighty-blow',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false}}};
      const t={id:'t',name:'Cible synthétique',kind:'Créature',camp:'ennemi',zone:'active',hp:40,maxHp:40,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0},states:[]};
      const store=createStore({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});await store.ready;
      await store.loadFromJSON({schemaVersion:3,extensions:{v5:{combatId:'keyword-freshness-combat',turnIndex:1}},reserve:[],combat:{round:1,currentActorId:'a',order:['a','t'],participants:[a,t]},diceLines:[],log:[]});
      const p=store.previewResolution({actorId:'a',targetId:'t',resolutionId:'keyword-freshness-'+change,roll:23,
        action:{type:'attack',base:60,damage:4,qualities:['pointue']},defense:{base:30,roll:47,v5:{kind:'melee'}},v5:{kind:'melee'}});
      assert.equal(p.sl,5);assert.equal(p.damage.finalDamage,8);
      const capture=()=>{const s=JSON.parse(store.getFullJSON());delete s.exportedAt;return s;};
      const before=capture(),history=store.getHistory(),revision=store.getLocalRevision();
      const refreshed=await refreshReferences({storage:null,forceRefresh:true,fetchImpl:async url=>{
        const sheet=decodeURIComponent(url.split('&sheet=')[1]);let csv=await readFile('./js/data/reference-source-csv/'+sheet+'.csv','utf8');
        if(sheet==='Mots Clés Armes et Armures'){
          const rows=parseReferenceCSV(csv),headers=rows[0];
          const row=rows.find(cells=>cells[headers.indexOf('Identifiant')]===(change==='source-only'?'pointue':'imprecise'));
          assert.ok(row);row[headers.indexOf(change==='source-only'?'Source':'Effet')]+=' Recette synthétique.';
          const quote=String.fromCharCode(34);csv=rows.map(cells=>cells.map(cell=>quote+cell.replaceAll(quote,quote+quote)+quote).join(',')).join(String.fromCharCode(13,10));
        }
        return {ok:true,text:async()=>csv};
      }});
      assert.equal(refreshed.ok,true,refreshed.status?.error);
      const result=await store.applyResolution(p);
      if(change==='source-only'){
        assert.equal(result.status,'manual');assert.equal(store.getLocalRevision(),revision);assert.deepEqual(capture(),before);assert.deepEqual(store.getHistory(),history);
      }else{
        assert.equal(result.status,'applied');assert.equal(store.listParticipants().find(row=>row.id==='t').hp,32);
        assert.equal(store.getLog()[0].detail.sl,5);assert.equal(store.getLog()[0].detail.damage.talentDamage,1);
      }
    `);
  });
}

for (const scenario of ['lower-partial', 'unavailable-shield', 'defensive-critical-impenetrable']) {
  test('Mots clés × talents — fraîcheur exacte des règles consultées : ' + scenario, () => {
    isolated(`
      import assert from 'node:assert/strict';
      import {readFile} from 'node:fs/promises';
      import {createStore} from './js/core/store.js';
      import {getReferenceCatalogue,refreshReferences} from './js/core/reference-catalog.js';
      const scenario=${JSON.stringify(scenario)};
      const affected=scenario==='lower-partial'?'partielle':scenario==='unavailable-shield'?'protectrice':'impenetrable';
      const armour=(id,ap,locations,keywords=[])=>({id,kind:'armour',name:'Armure synthétique '+id,ap,locations,layer:'rigid',keywords});
      const a={id:'a',name:'Auteur synthétique',kind:'PJ',camp:'pj',zone:'active',hp:40,maxHp:40,caracs:{F:30,E:30},states:[],talents:[{id:'talent-strike-mighty-blow',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false}}};
      const t={id:'t',name:'Cible synthétique',kind:'Créature',camp:'ennemi',zone:'active',hp:40,maxHp:40,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0},states:[]};
      if(scenario==='lower-partial')t.equipment=[armour('better',3,['rightArm']),armour('lower',1,['rightArm'],[{id:'partielle',parameter:''}])];
      if(scenario==='unavailable-shield')t.equipment=[{id:'shield',kind:'shield',name:'Bouclier synthétique',ap:2,locations:[],layer:'none',keywords:[{id:'protectrice',parameter:'2'}]}];
      if(scenario==='defensive-critical-impenetrable')a.equipment=[armour('helmet',2,['head'],[{id:'impenetrable',parameter:''}])];
      const store=createStore({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});await store.ready;
      await store.loadFromJSON({schemaVersion:3,extensions:{v5:{combatId:'keyword-exact-source-combat',turnIndex:1}},reserve:[],combat:{round:1,currentActorId:'a',order:['a','t'],participants:[a,t]},diceLines:[],log:[]});
      const p=store.previewResolution({actorId:'a',targetId:'t',resolutionId:'keyword-exact-'+scenario,roll:23,
        action:{type:'attack',base:60,damage:4,qualities:[]},
        defense:{base:scenario==='defensive-critical-impenetrable'?70:30,roll:scenario==='defensive-critical-impenetrable'?33:47,v5:{kind:'melee'}},
        ...(scenario==='unavailable-shield'?{protectionContext:{shieldId:'shield',shieldAvailable:false,opposedWithShield:true}}:{}),
        defenderCriticalRolls:{location:2,effect:20},v5:{kind:'melee'}});
      assert.equal(p.unresolved.length,0);assert.ok(p.damage);
      if(scenario==='lower-partial'){
        assert.equal(p.protection.ap,3);assert.ok(p.protection.ignored.some(row=>row.item.id==='lower'));
        assert.equal(p.damage.finalDamage,4);
      }
      if(scenario==='unavailable-shield'){
        assert.equal(p.defenderTest.sl,-1);assert.equal(p.protection.shieldAp,0);assert.equal(p.damage.finalDamage,7);
      }
      if(scenario==='defensive-critical-impenetrable'){
        assert.equal(p.defenderTest.critical,true);assert.equal(p.defenderCritical,null);
        assert.ok(p.mechanics.some(row=>row.id==='impenetrable'));
      }else assert.equal(p.mechanics.some(row=>row.id===affected),false,'mot clé jamais évalué ne périme pas l’action');
      const capture=()=>{const s=JSON.parse(store.getFullJSON());delete s.exportedAt;return s;};
      const before=capture(),history=store.getHistory(),revision=store.getLocalRevision();
      const oldText=getReferenceCatalogue().keywords.find(row=>row.id===affected).effect;
      const refreshed=await refreshReferences({storage:null,forceRefresh:true,fetchImpl:async url=>{
        const sheet=decodeURIComponent(url.split('&sheet=')[1]);let csv=await readFile('./js/data/reference-source-csv/'+sheet+'.csv','utf8');
        if(sheet==='Mots Clés Armes et Armures'){assert.ok(csv.includes(oldText));csv=csv.replace(oldText,'Effet synthétique modifié pour la fraîcheur exacte.');}
        return {ok:true,text:async()=>csv};
      }});
      assert.equal(refreshed.ok,true,refreshed.status?.error);
      const result=await store.applyResolution(p);
      if(scenario==='defensive-critical-impenetrable'){
        assert.equal(result.status,'manual');assert.equal(store.getLocalRevision(),revision);assert.deepEqual(capture(),before);assert.deepEqual(store.getHistory(),history);
      }else{
        assert.equal(result.status,'applied');assert.equal(store.listParticipants().find(row=>row.id==='t').hp,scenario==='lower-partial'?36:33);
        assert.equal(store.getLog()[0].detail.damage.finalDamage,scenario==='lower-partial'?4:7);
        for(const participant of capture().combat.participants){const original=before.combat.participants.find(row=>row.id===participant.id);assert.deepEqual(participant.equipment,original.equipment);}
      }
    `);
  });
}

test('Mots clés × talents — Dévastatrice garde zéro aux dizaines, dégâts opposés et Coup puissant avant protection', async () => {
  const target = person('t', { armor: { head: 1, body: 1, arms: 1, legs: 1 } });
  const actor = person('a', { talents: talents('Coup puissant', 'Tir précis') });
  const action = attack({ qualities: ['devastatrice'] });
  const defense = { base: 40, roll: 32, v5: { kind: 'melee' } };
  for (const [roll, margin, damage] of [[20, 3, 4], [30, 2, 3], [40, 1, 2], [50, 0, 1]]) {
    const p = previewResolution(raw({ actor, target, action, defense, roll }));
    assert.equal(p.opposition.netSl, margin); assert.equal(p.damage.sl, margin);
    assert.equal(p.damage.talentDamage, 1); assert.equal(p.damage.finalDamage, damage);
    assert.equal(p.damage.targetArmour, 1); assert.equal(p.damage.be, 3);
  }
  const { store } = await setup(actor, target);
  const before = snapshotStore(store);
  const p = store.previewResolution(storeInput({ roll: 20, action, defense }));
  assert.equal(p.sl, 4); assert.equal(p.damage.sl, 3); assert.equal(p.damage.finalDamage, 4);
  assert.deepEqual(snapshotStore(store), before);
  assert.equal((await store.applyResolution(p)).status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === 't').hp, 36);
  const detail = store.getLog()[0].detail;
  assert.equal(detail.sl, 4); assert.equal(detail.damage.sl, 3); assert.equal(detail.damage.talentDamage, 1);
  assert.equal(detail.damage.finalDamage, 4);
  await store.undo(); assert.deepEqual(snapshotStore(store).combat.participants, before.combat.participants);
});

test('Mots clés × talents — Dévastatrice zéro au tir conserve DR et Tir précis avant les PA', () => {
  const target = person('t', { armor: { head: 1, body: 1, arms: 1, legs: 1 } });
  for (const [roll, dr, damage] of [[20, 4, 6], [30, 3, 5], [40, 2, 4], [60, 0, 2]]) {
    const p = previewResolution(raw({ actor: person('a', { talents: talents('Tir précis', 'Coup puissant') }),
      target, roll, defense: undefined, action: attack({ qualities: ['devastatrice'] }), v5: { kind: 'ranged', aimed: true } }));
    assert.equal(p.success, true); assert.equal(p.sl, dr); assert.equal(p.damage.sl, dr);
    assert.equal(p.damage.talentDamage, 2); assert.equal(p.damage.finalDamage, damage);
    assert.equal(p.damage.paEffectif, 1); assert.equal(p.damage.absorption, 4);
  }
});

test('Mots clés × talents — Dévastatrice utilise encore unités non nulles et Inoffensive annule le remplacement', () => {
  const actor = person('a', { talents: talents('Coup puissant') });
  const target = person('t', { armor: { head: 1, body: 1, arms: 1, legs: 1 } });
  const defense = { base: 40, roll: 32, v5: { kind: 'melee' } };
  for (const [roll, units, damage] of [[23, 3, 4], [28, 8, 9]]) {
    const input = raw({ actor, target, defense, roll, action: attack({ base: 50, qualities: ['devastatrice'] }) });
    const p = previewResolution(input);
    assert.equal(p.opposition.netSl, 2); assert.equal(p.damage.sl, units);
    assert.equal(p.damage.talentDamage, 1); assert.equal(p.damage.finalDamage, damage);
    const harmless = previewResolution({ ...input, action: { ...input.action, qualities: ['devastatrice', 'inoffensive'] } });
    assert.equal(harmless.damage.sl, 2); assert.equal(harmless.damage.talentDamage, 1);
    assert.equal(harmless.damage.paEffectif, 2); assert.equal(harmless.damage.finalDamage, 2);
  }
  const zero = previewResolution(raw({ actor, target, defense, roll: 20,
    action: attack({ qualities: ['devastatrice', 'inoffensive'] }) }));
  assert.equal(zero.damage.sl, 3); assert.equal(zero.damage.talentDamage, 1);
  assert.equal(zero.damage.paEffectif, 2); assert.equal(zero.damage.finalDamage, 3);
});

test('Mots clés × talents — Dévastatrice prend le chiffre du jet retenu après choix ou inversion forcée', () => {
  const actor = person('a', { talents: talents('Mains agiles', 'Coup puissant') });
  const target = person('t', { armor: { head: 1, body: 3, arms: 2, legs: 1 } });
  const defense = { base: 40, roll: 32, v5: { kind: 'melee' } };
  const action = base => attack({ base, qualities: ['devastatrice'],
    extensions: { fiche: { skillId: skill('Corps à corps (Bagarre)') } } });
  for (const [initialRoll, base, choice, finalRoll, margin, damageDr, damage] of [
    [20, 60, 'keep', 20, 3, 3, 5], [20, 60, 'reverse', 2, 5, 5, 6],
    [61, 70, 'keep', 61, 0, 1, 2], [61, 70, 'reverse', 16, 5, 6, 6]
  ]) {
    const p = previewResolution(raw({ actor, target, defense, roll: initialRoll, action: action(base),
      v5: { kind: 'melee', choice, context: { touchingOpponent: true } } }));
    assert.equal(p.roll, finalRoll); assert.equal(p.opposition.netSl, margin); assert.equal(p.damage.sl, damageDr);
    assert.equal(p.damage.talentDamage, 2); assert.equal(p.damage.finalDamage, damage);
    assert.equal(p.test.advantage.net, 1);
  }
  const forced = previewResolution(raw({ actor, target, defense, roll: 2, action: action(60),
    v5: { kind: 'melee', context: { touchingOpponent: true },
      disadvantageSources: [{ id: 'synthetic-first' }, { id: 'synthetic-second' }] } }));
  assert.equal(forced.roll, 20); assert.equal(forced.test.optionId, 'reverse'); assert.equal(forced.test.advantage.net, -1);
  assert.equal(forced.damage.sl, 3); assert.equal(forced.damage.talentDamage, 1); assert.equal(forced.damage.finalDamage, 4);
});

test('Mots clés × talents — Dévastatrice max littéral peut porter DR négatif à zéro sans transformer un échec', () => {
  const zero = computeDamage({ weaponDamage: 4, sl: -3, roll: 20, targetToughnessBonus: 3, targetArmour: 1, qualities: ['devastatrice'] });
  assert.equal(zero.sl, 0); assert.equal(zero.net, 0); assert.equal(zero.finalDamage, 1);
  const positive = computeDamage({ weaponDamage: 4, sl: -3, roll: 23, targetToughnessBonus: 3, targetArmour: 1, qualities: ['devastatrice'] });
  assert.equal(positive.sl, 3); assert.equal(positive.finalDamage, 3);
  const harmless = computeDamage({ weaponDamage: 4, sl: -3, roll: 20, targetToughnessBonus: 3, targetArmour: 1,
    qualities: ['devastatrice', 'inoffensive'] });
  assert.equal(harmless.sl, -3); assert.equal(harmless.finalDamage, 0);
  const hit = previewResolution(raw({ actor: person('a', { talents: talents('Tir précis') }),
    target: person('t', { armor: { head: 1, body: 1, arms: 1, legs: 1 } }), roll: 20, defense: undefined,
    action: attack({ base: 0, qualities: ['devastatrice'] }),
    v5: { kind: 'ranged', aimed: true, context: { targetCannotDefend: true, pointBlank: true } } }));
  assert.equal(hit.hit, true); assert.equal(hit.success, false); assert.equal(hit.sl, -2);
  assert.equal(hit.damage.sl, 0); assert.equal(hit.damage.finalDamage, 1);
  assert.equal(hit.damage.talentDamage, undefined, 'Tir précis requiert sa propre réussite');
});
});
