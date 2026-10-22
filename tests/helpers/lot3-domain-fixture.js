import assert from 'node:assert/strict';
import { createStore } from '../../js/core/store.js';
import { createCombatEngine } from '../../js/core/combat.js';
import SPELL_CONTRACTS from '../../js/data/v5-spell-contracts.json' with { type: 'json' };
import L06 from '../../js/data/bestiary/L06.json' with { type: 'json' };
import { registerSummonLibrary } from '../../js/core/bestiary-profiles.js';
registerSummonLibrary(L06.profiles);

export const contracts = SPELL_CONTRACTS.filter(c => c.isBookV5 && ['beasts','heavens','fire','light','metal','death','shadow','life'].includes(c.domain));
export const subject = (store, id) => store.listParticipants().find(p => p.id === id);
export const level = (person, text) => (person.states || []).filter(s => (s.name || s.label || '').includes(text)).reduce((n,s) => n + (s.level || 1), 0);
const person = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'mage' ? 'pj' : 'ennemi', zone: 'active', hp: 20, maxHp: 40, initiative: id === 'mage' ? 60 : 20,
  caracs: { CC: 50, CT: 50, F: 40, E: 40, I: 50, Ag: 50, Dex: 50, Int: 60, FM: 60, Soc: 50, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 90 }, { name: 'Focalisation', total: 90 }, { name: 'Résistance', total: 40 }, { name: 'Endurance', total: 40 }],
  traits: [], talents: [], states: [], equipment: [], actions:[{id:'blade',note:'Épée de la fixture',type:'attack',attr:'CC',base:50,damage:3,qualities:[]}],armor: { head: 2, body: 2, arms: 2, legs: 2 },
  extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 30 } } }, ...extra });
export async function encounter(extras = {}) {
  let saved;
  const persistence = { load: async () => saved && structuredClone(saved), saveAtomic: async ({state}) => { saved = structuredClone(state); return {ok: true}; } };
  const store = createStore({ persistence }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'mage', order: ['mage','foe'], participants: [person('mage', extras.mage), person('foe', extras.foe)] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return { store, engine: createCombatEngine(store), persistence };
}
export function inputFor(c, patch = {}) {
  const {domainFactsExtra,...rest} = patch;
  const out = { actorId: 'mage', targetIds: /^Vous$/i.test(c.target) ? ['mage'] : ['foe'], sl: 12, attributeActive: false, locationRoll: 34, beastKey: 'wolf', enduranceRoll: 98,
    mjDuration: { amount: 3, unit: 'rounds' }, mjChoice: 'Projet et objet validés par le MJ',
    domainFacts: { directEarth: true, patchEarth: true, familiar: true, objectMetal: true, objectMagical: false, objectWorn: true, objectHeld: false, objectId: 'blade', location: 'HEAD', naturalArmorAp:0, encumbranceMode: 'heavier', minutesToDawn: 1, sunlight: false },
    targetTests: { foe: { objectId:'blade',roll: 98, enduranceRoll: 98, wardRoll: 1,encumbranceStep:0,unburdenedM:4,unburdenedAg:50 }, mage: { objectId:'blade',roll: 98,encumbranceStep:0,unburdenedM:4,unburdenedAg:50 } }, ...rest };
  if (domainFactsExtra) out.domainFacts = { ...out.domainFacts, ...domainFactsExtra };
  return out;
}
export async function cast(store, c, patch = {}) {
  const input = inputFor(c, patch), preview = store.previewSpellExecution(c.id, input);
  assert.equal(preview.ready, true, `${c.name}: ${preview.error}`);
  const result = await store.applySpellExecution(c.id, input);
  assert.notEqual(result?.ok, false, result?.error);
  return preview;
}
export async function endTurn(engine, patch = {}) {
  let preview = engine.previewNextTurn(patch);
  const inputs = structuredClone(patch.inputs || {});
  for (let pass=0; !preview.ready && pass<5; pass++) {
    for (const request of preview.requests || []) {
      const data = inputs[request.participantId] ||= {};
      if (data[request.field] === undefined) data[request.field] = request.kind === 'boolean' ? !request.field.endsWith(':astronomy') : request.kind === 'test' ? { success: true, sl: 2 } : request.kind==='2d10'?2:1;
    }
    preview = engine.previewNextTurn({ inputs });

  }
  assert.equal(preview.ready,true,JSON.stringify(preview.requests));
  return engine.nextTurn({inputs});
}
export function assertSourceBehaviour(c, preview, store) {
  const name = c.canonicalName, mage = subject(store,'mage'), foe = subject(store,'foe'), e = mage.extensions.v5, row = preview.targetResults[0];
  switch (name) {
    case 'Purge': assert.equal(level(foe,'Enflammé'), 42); break; // MJ 12 octobre : 12 + réserve 30
    case 'Cauterise': assert.equal(foe.hp, 21); assert.equal(row.resistanceTest?.roll, 98); assert.equal(level(foe,'Sonné'), 1); break;
    case 'Crown of Flame': assert.ok((e.spellEffects || []).some(s => s.talents?.includes('Chef de guerre'))); break;
    case 'Firewall': assert.equal(foe.hp,20,'la création du mur ne frappe personne'); break;
    case 'Flaming Sword of Rhuin': assert.equal(foe.extensions.v5.weaponBonuses[0].replaceDamageBonus,6); break;
    case 'Great Fires of U’Zhul': assert.equal(level(foe,'Enflammé'),2); assert.equal(level(foe,'À Terre'),1); break;
    case 'Fate’s Fickle Fingers': assert.equal(foe.extensions.v5.testModifiers?.Dextérité || 0,0); assert.match(foe.extensions.v5.specialStates?.assistedReminder,/Chance/); break;
    case 'The Third Portent of Amul': assert.equal(c.duration,'Initiative Rounds'); break;
    case 'Starcrossed': assert.equal(foe.extensions.v5.specialStates?.cannotUseFortune,undefined); break;
    case 'Comet of Casandora': assert.equal(foe.hp,20,'la comète attend la fin du Round suivant'); break;
    case 'Feather of Lead': assert.equal(foe.caracs.M,2); assert.equal(foe.caracs.Ag,30); break;
    case 'Transmutation of Chamon': assert.equal(level(foe,'Aveuglé'),1); assert.equal(level(foe,'Assourdi'),1); assert.equal(level(foe,'Sonné'),1); assert.equal(foe.armor.body,3); break;
    case 'Enchant Weapon': assert.equal(foe.extensions.v5.weaponBonuses[0].damage,6); break;
    case 'Beast Master': assert.equal(foe.extensions.v5.testModifiers?.Dressage || 0,0); break;
    case 'Beast Tongue': assert.equal(c.duration,'Force Mentale minutes'); assert.equal(e.specialStates?.cannotCast,true); break;
    case 'Flock of Doom': assert.equal(foe.hp,20,'la nuée frappe en fin de Round'); break;
    case 'Amber Talons': assert.equal(e.weaponBonuses[0].unarmedOnly,true); assert.equal(e.weaponBonuses[0].replaceDamageBonus,4); break;
    case 'Hunter’s Hide': assert.ok(!mage.traits.includes('Foulée (Forêts)')); break;
    case 'The Amber Spear': assert.equal(c.target,'1 (maximum)'); assert.equal(level(foe,'Hémorragique'),1); assert.equal(row.missile.location,'Tête'); break;
    case 'Lifebloom': assert.equal(foe.hp,20,'la fertilité n’invente pas 4 Blessures'); break;
    case 'Barkskin': assert.equal(foe.armor.body,2); assert.equal(foe.caracs.E,60); break;
    case 'Earthblood': assert.equal(foe.hp,20,'le soin attend le début du prochain Round'); break;
    case 'Earthpool': assert.equal(mage.hp,20); assert.equal(e.specialStates?.underground,true); break;
    case 'Forest of Thorns': assert.equal(foe.hp,20); assert.equal(level(foe,'Hémorragique'),0,'sans traversée pas d’état'); break;
    case 'Phâ’s Protection': assert.equal(foe.extensions.v5.rangedOpponentPenaltySl,undefined); assert.equal(foe.extensions.v5.specialStates?.corruptionImmune,true); break;
    case 'Banishment': assert.equal(foe.hp,20,'une cible vivante n’est pas frappée'); break;
    case 'Healing Light': assert.equal(foe.hp,26); assert.ok(row.temporaryEffect?.specialState?.purified); break;
    case 'Net of Amyntok': assert.equal(level(foe,'Sonné'),1); assert.equal(foe.caracs.M,0); assert.equal(c.duration,'Bonus d’Intelligence Rounds'); break;
    case 'Purple Pall of Shyish': assert.equal(mage.armor.body,8); break;
    case 'Sanctify': assert.equal(foe.extensions.v5.testModifiers?.Calme || 0,0); break;
    case 'Swift Passing': assert.equal(foe.extensions.v5.dead,undefined,'une cible au-dessus de 0 B reste vivante'); break;
    case 'Choking Shadows': assert.equal(foe.extensions.v5.specialStates?.cannotSpeak,true); assert.equal(foe.extensions.v5.specialStates?.suffocating,true); break;
    case 'Doppelganger': assert.equal(e.testModifiers?.Déguisement || 0,0); break;
    case 'Illusion': assert.equal(foe.extensions.v5.testModifiers?.['Intuition adverse'] || 0,0); break;
    case 'Mindslip': assert.equal(level(foe,'Surpris'),0); break;
    case 'Mystifying Miasma': assert.equal(foe.extensions.v5.specialStates?.moveTest?.skill,'Perception'); break;
    case 'Shadowsteed': assert.equal(foe.caracs.M,4,'la monture ne modifie pas le cavalier'); break;
    case 'Shroud of Invisibility': assert.equal(foe.extensions.v5.rangedOpponentPenaltySl,undefined); break;
  }
}
export async function verifySpell(c, patch = {}) {
  const { store, engine, persistence } = await encounter({ foe: c.canonicalName === 'Beast Master' ? { traits: ['Bestial','Taille (Moyenne)'] } : c.canonicalName === 'Daemonbane' ? {traits:['Démoniaque']} : c.canonicalName === 'Cauterise' ? {skills:[{name:'Endurance',total:20}],caracs:{E:20,FM:40,M:4}} : c.canonicalName === 'Fate’s Fickle Fingers' ? {camp:'pj'} : {} });
  const initial=JSON.parse(store.getFullJSON());
  const before = store.listParticipants(), preview = await cast(store,c,patch);
  assertSourceBehaviour(c,preview,store);
  const applied = store.listParticipants(), reload = createStore({persistence}); await reload.ready;
  assert.deepEqual(reload.listParticipants(),applied,'persistance');
  await store.undo(); assert.deepEqual(store.listParticipants(),before,'Undo atomique');
  await cast(store,c,patch);
  const layer = store.listParticipants().flatMap(p => p.extensions.v5.spellEffects || []).find(s => s.spellId === c.id);
  if (layer?.expiresAtRound > 1) {
    // Le combat réel joue la dernière fin de tour ; le saut de fixture évite des centaines de tours sans événement.
    const state = JSON.parse(store.getFullJSON()); state.combat.round = layer.expiresAtRound; state.combat.currentActorId = 'mage';
    await store.loadFromJSON(state); await endTurn(engine);
    assert.ok(!store.listParticipants().some(p => (p.extensions.v5.spellEffects || []).some(s => s.spellId === c.id)), 'expiration à la fin du tour de l’auteur');
    await store.undo(); assert.ok(store.listParticipants().some(p => (p.extensions.v5.spellEffects || []).some(s => s.spellId === c.id)), 'Undo de la fin de tour');
  }
  // V5 p. 236 : chaque catégorie autorisée est payée et exécutée séparément via le Store.
  for(const kind of c.overcast.options.filter(k=>k!=='special')){
    await store.loadFromJSON(initial);
    const optionBefore=store.listParticipants();
    const amount=kind==='targets'?1:kind==='aoe'?3:2, p=await cast(store,c,{...patch,sl:50,overcastChoices:{[kind]:amount}});
    assert.equal(p.overcast.choices[kind],amount,c.name+' : dépense '+kind);
    if(['range','duration','aoe'].includes(kind))assert.equal(p.overcast[kind+'Multiplier'],2);
    if(kind==='targets')assert.equal(p.overcast.targetsBonus,1);
    if(kind==='damage')assert.equal(p.overcast.damageBonus,2);
    await store.undo();assert.deepEqual(store.listParticipants(),optionBefore);
  }
  for(const option of c.overcast.specific || []){
    await store.loadFromJSON(initial);
    const p=await cast(store,c,{...patch,sl:50,overcastSpecific:{[option.id]:1}});
    const receipt=p.overcastSpecific.find(e=>e.id===option.id);assert.equal(receipt.spent,option.cost);
    assert.ok(receipt.applied || receipt.reminder,'option calculée ou rappel chiffré explicite');
  }
  for(const spec of c.effects.facts || []){
    await store.loadFromJSON(initial);
    const input=inputFor(c,patch);if(spec.perTarget)delete input.targetTests.foe[spec.key];else delete input.domainFacts[spec.key];
    assert.equal(store.previewSpellExecution(c.id,input).ready,false,c.name+' : fait '+spec.key+' absent');
  }
}
