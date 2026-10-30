import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { getSpellContract, getAllSpellContracts } from '../../../js/core/v5-spell-contracts.js';
import { encounter, cast, inputFor, endTurn, level, subject, verifySpell } from '../../helpers/lot3-domain-fixture.js';
import L06 from '../../../js/data/bestiary/L06.json' with {type:'json'};
import { createHash } from 'node:crypto';
import contracts from '../../../js/data/v5-spell-contracts.json' with {type:'json'};
import { normalizeLoreId, LORE_ATTRIBUTES, previewLoreAttribute } from '../../../js/core/v5-magic-attributes.js';
import { magicSkillModifiers } from '../../../js/core/v5-magic-talents.js';
import { summonProfileLibrary, registerSummonLibrary } from '../../../js/core/bestiary-profiles.js';
import { oppositeCamp } from '../../../js/core/v5-magic-turn.js';

describe('invocations magiques — fuzz', () => {
// Fuzz d'invariants du Tour avec invocations MAGIQUES : séquences déterministes (graines) mêlant lancements, fins de Tour (moteur V5 et
// legacy), fin anticipée, retrait manuel, sauts vers l'échéance et Annuler/Rétablir. FUZZ_SEEDS / FUZZ_STEPS élargissent le balayage.

const SEEDS = Number(process.env.FUZZ_SEEDS || 30), STEPS = Number(process.env.FUZZ_STEPS || 14);
const json = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
const auxOf = store => store.listParticipants().filter(p => p.extensions?.isAuxiliary);
const rng = seed => { let a = seed * 2654435761 >>> 0; return () => { a = a + 0x6D2B79F5 >>> 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const DESTRIER = getSpellContract('Destrier d’Ombre');
const DAWN = { domainFacts: { ...inputFor(DESTRIER).domainFacts, minutesToDawn: 1 } };
const view = store => { const s = json(store); return { s, c: s.combat, ids: new Set(s.combat.participants.map(p => p.id)) }; };
const orphans = c => c.participants.filter(p => {
  const v = p.extensions?.v5; if (!v?.summonCastExecutionId) return false;
  const owner = c.participants.find(x => x.id === v.summonOwnerId);
  return !owner?.extensions?.v5?.spellEffects?.some(e => e.castExecutionId === v.summonCastExecutionId && e.spellId === v.summonedBySpellId);
}).map(p => p.id);

function checkState(label, store) {
  const { c, ids } = view(store);
  assert.ok(c.currentActorId === null || ids.has(c.currentActorId), `${label} : acteur courant inconnu ${c.currentActorId}`);
  for (const id of c.order) assert.ok(ids.has(id), `${label} : ordre contient un absent ${id}`);
  const stray = orphans(c).filter(id => id !== c.currentActorId);
  assert.deepEqual(stray, [], `${label} : invocation orpheline hors acteur courant`);
  const clock = json(store).extensions?.v5?.gameClock?.combat;
  if (clock) { assert.equal(clock.currentActorId, c.currentActorId, `${label} : horloge/acteur`); assert.equal(clock.round, c.round, `${label} : horloge/round`); }
}

// Un Tour ne rejoue ni ne saute : le nouvel acteur suit l'ancien dans l'ordre d'avant, les absents entre les deux ayant été retirés.
function checkTurn(label, before, after) {
  const a = before.c, b = after.c;
  if (!a.currentActorId || !b.currentActorId) return;
  // Le chemin legacy recalcule l'ordre à chaque Tour (C4) : la comparaison n'a de sens que si l'ordre relatif des survivants est conservé.
  const kept = a.order.filter(id => b.order.includes(id)), now = b.order.filter(id => kept.includes(id));
  if (kept.join() !== now.join()) return;
  const old = a.order.indexOf(a.currentActorId);
  if (b.round === a.round) {
    const at = a.order.indexOf(b.currentActorId);
    if (at === -1) return;                                   // entrée dans l'ordre pendant le Tour : pas comparable
    assert.ok(at > old, `${label} : Tour rejoué (${a.currentActorId} -> ${b.currentActorId}, ordre ${a.order})`);
    for (const id of a.order.slice(old + 1, at)) assert.ok(!after.ids.has(id), `${label} : Tour sauté ${id}`);
  } else {
    assert.equal(b.round, a.round + 1, `${label} : round`);
    assert.equal(b.currentActorId, b.order[0] ?? b.currentActorId, `${label} : le Round ne s'ouvre pas sur la tête de l'ordre`);
    for (const id of a.order.slice(old + 1)) assert.ok(!after.ids.has(id) || id === b.currentActorId, `${label} : fin de Round sautée ${id}`);
  }
}

async function run(seed) {
  const rand = rng(seed), pick = list => list[Math.floor(rand() * list.length)];
  const env = await encounter({ foe: { initiative: pick([5, 20, 45, 70]) }, mage: { initiative: pick([60, 10, 30]) } }), { store, engine } = env;
  const mage2 = json(store).combat.participants.find(p => p.id === 'mage');
  const state = json(store);
  state.combat.participants.push({ ...structuredClone(mage2), id: 'mage2', name: 'mage2', initiative: pick([50, 25, 3]) });
  state.combat.order = ['mage', 'mage2', 'foe'].sort((x, y) => state.combat.participants.find(p => p.id === y).initiative - state.combat.participants.find(p => p.id === x).initiative);
  state.combat.currentActorId = state.combat.order[0];
  await store.loadFromJSON(state);
  const log = [];
  for (let i = 0; i < STEPS; i++) {
    const before = view(store), op = pick(['cast', 'end', 'end', 'end', 'legacy', 'legacy', 'early', 'remove', 'jump', 'jump', 'undoredo']);
    const label = `graine ${seed} pas ${i} ${op} [${log.join(' ')}]`;
    log.push(op);
    let changed = true;
    try {
      if (op === 'cast') {
        const caster = pick(['mage', 'mage2']);
        const input = { ...DAWN, actorId: caster, targetIds: ['foe'] };
        const preview = store.previewSpellExecution(DESTRIER.id, inputFor(DESTRIER, input));
        if (!preview.ready) changed = false; else { const r = await store.applySpellExecution(DESTRIER.id, inputFor(DESTRIER, input)); if (r?.ok === false) changed = false; }
      } else if (op === 'end') await endTurn(engine);
      else if (op === 'legacy') await store.nextTurn();
      else if (op === 'early') {
        const layers = store.listParticipants().flatMap(p => (p.extensions?.v5?.spellEffects || []).filter(e => e.spellId === DESTRIER.id));
        if (!layers.length) changed = false; else await store.applySpellInteraction({ effectId: pick(layers).id, targetId: 'foe', kind: 'end' });
      } else if (op === 'remove') {
        const aux = auxOf(store);
        if (!aux.length) changed = false; else await store.removeParticipant(pick(aux).id);
      } else if (op === 'jump') {
        const layers = store.listParticipants().flatMap(p => (p.extensions?.v5?.spellEffects || []).filter(e => e.spellId === DESTRIER.id));
        if (!layers.length) changed = false; else { const l = pick(layers), s = json(store); s.combat.round = l.expiresAtRound; s.combat.currentActorId = l.casterId; await store.loadFromJSON(s); changed = false; }
      } else if (op === 'undoredo') {
        const here = json(store);
        if (await store.undo()) { checkState(label + ' (après undo)', store); assert.equal(await store.redo(), true); assert.deepEqual(json(store).combat, here.combat, label + ' : Rétablir'); }
        changed = false;
      }
    } catch (error) { if (/déjà appliquée|requis|refus/i.test(error.message)) changed = false; else throw error; }
    checkState(label, store);
    if (op === 'end' || op === 'legacy') checkTurn(label, before, view(store));
    if (changed) {
      const after = json(store);
      if (await store.undo()) {
        assert.deepEqual(json(store).combat, before.s.combat, label + ' : Annuler');
        assert.equal(await store.redo(), true);
        assert.deepEqual(json(store).combat, after.combat, label + ' : Rétablir');
      }
    }
  }
}

test(`fuzz Tour et invocations magiques : ${SEEDS} graines x ${STEPS} pas`, async () => {
  for (let seed = 1; seed <= SEEDS; seed++) await run(seed);
});
});

describe('invocations magiques — tours', () => {
// Tour des invocations MAGIQUES : une invocation dont la couche expire ne désigne jamais un mauvais acteur
// (ni Tour rejoué, ni Tour sauté). Un orphelin acteur courant (hors tête d'ordre) attend la commande suivante, comme sweepDivineSummons.

const DAWN = c => ({ domainFacts: { ...inputFor(c).domainFacts, minutesToDawn: 1 } });
const json = store => JSON.parse(store.getFullJSON());
const auxOf = store => store.listParticipants().filter(p => p.extensions?.isAuxiliary);
const layersOf = (store, spellId) => store.listParticipants().flatMap(p => (p.extensions?.v5?.spellEffects || []).filter(e => e.spellId === spellId).map(e => ({ ...e, holderId: p.id })));
const jumpTo = async (store, round, currentActorId) => {
  const state = json(store); state.combat.round = round; state.combat.currentActorId = currentActorId; await store.loadFromJSON(state);
};
const combatOf = store => json(store).combat;
const spellId = getSpellContract('Destrier d’Ombre').id;
async function destrier(extras = {}) {
  const env = await encounter(extras), c = getSpellContract('Destrier d’Ombre');
  await cast(env.store, c, DAWN(c));
  return { ...env, c, horse: auxOf(env.store)[0] };
}
// Joue un Tour avec le moteur V5 ou le chemin legacy ; renvoie « round:acteur ».
async function step(env, engineName) {
  if (engineName === 'v5') await endTurn(env.engine); else await env.store.nextTurn();
  const c = combatOf(env.store);
  return `${c.round}:${c.currentActorId}`;
}

for (const engineName of ['v5', 'legacy']) {
  test(`${engineName} : invocation prochain acteur à l’expiration — gardée courante, puis retirée ; ni rejeu du lanceur ni Tour sauté`, async () => {
    const env = await destrier({ foe: { initiative: 5 } }), { store, horse } = env;
    await step(env, engineName);                           // la monture entre dans l'ordre, courante
    await step(env, engineName); await step(env, engineName);
    await jumpTo(store, 7, 'mage');
    assert.deepEqual(combatOf(store).order, ['mage', horse.id, 'foe']);
    const before = json(store);
    assert.equal(await step(env, engineName), `7:${horse.id}`, 'la monture reste l’acteur désigné par le Tour');
    assert.equal(json(store).localRevision, before.localRevision + 1);
    assert.equal(layersOf(store, spellId).length, 0, 'la couche a expiré');
    assert.deepEqual(auxOf(store).map(a => a.id), [horse.id], 'orpheline mais courante : retirée à la commande suivante');
    assert.equal(json(store).extensions.v5.gameClock.combat.currentActorId, horse.id);
    assert.equal(await step(env, engineName), '7:foe', 'foe joue son Tour du Round 7');
    assert.equal(auxOf(store).length, 0);
    assert.deepEqual(combatOf(store).order, ['mage', 'foe']);
    assert.equal(await step(env, engineName), '8:mage');
  });

  test(`${engineName} : invocation qui n’est pas le prochain acteur — retirée aussitôt, l’ordre se déroule normalement`, async () => {
    const env = await destrier(), { store, horse } = env;       // foe I20 > monture : ordre mage, foe, monture
    await step(env, engineName);
    assert.deepEqual(combatOf(store).order, ['mage', 'foe', horse.id]);
    await jumpTo(store, 7, 'mage');
    assert.equal(await step(env, engineName), '7:foe');
    assert.equal(auxOf(store).length, 0);
    assert.deepEqual(combatOf(store).order, ['mage', 'foe']);
    assert.equal(await step(env, engineName), '8:mage');
  });

  test(`${engineName} : invocation courante dont la couche n’a pas expiré — son Tour ne la retire pas`, async () => {
    const env = await destrier({ foe: { initiative: 5 } }), { store, horse } = env;
    await step(env, engineName);
    await jumpTo(store, 7, horse.id);
    assert.equal(await step(env, engineName), '7:foe');
    assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
  });

  test(`${engineName} : ordre manuel — monture placée juste après le lanceur, expiration sans rejeu`, async () => {
    const env = await destrier({ foe: { initiative: 5 } }), { store, horse } = env;
    await step(env, engineName);
    store.setOrderMode('manual');
    await store.moveInOrder(horse.id, 'foe');
    assert.equal(combatOf(store).orderMode, 'manual');
    await jumpTo(store, 7, 'mage');
    assert.deepEqual(combatOf(store).order, ['mage', horse.id, 'foe']);
    assert.equal(await step(env, engineName), `7:${horse.id}`);
    assert.equal(await step(env, engineName), '7:foe');
    assert.deepEqual(combatOf(store).order, ['mage', 'foe']);
    assert.equal(auxOf(store).length, 0);
    assert.equal(await step(env, engineName), '8:mage');
  });

  test(`${engineName} : Annuler / Rétablir autour de l’expiration — états identiques`, async () => {
    const env = await destrier({ foe: { initiative: 5 } }), { store, horse } = env;
    await step(env, engineName);
    await jumpTo(store, 7, 'mage');
    const s0 = combatOf(store);
    await step(env, engineName);
    const s1 = combatOf(store);
    await step(env, engineName);
    const s2 = combatOf(store);
    assert.equal(s1.currentActorId, horse.id); assert.equal(s2.currentActorId, 'foe');
    await store.undo(); assert.deepEqual(combatOf(store), s1);
    assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
    await store.undo(); assert.deepEqual(combatOf(store), s0);
    assert.equal(layersOf(store, spellId).length, 1);
    await store.redo(); assert.deepEqual(combatOf(store), s1);
    await store.redo(); assert.deepEqual(combatOf(store), s2);
  });
}

test('fin anticipée du sort alors que l’invocation n’est pas l’acteur courant : retirée aussitôt, acteur courant inchangé', async () => {
  const { store, c, horse } = await destrier({ foe: { initiative: 5 } });
  const [layer] = layersOf(store, c.id);
  assert.equal(combatOf(store).currentActorId, 'mage');
  await store.applySpellInteraction({ effectId: layer.id, targetId: 'foe', kind: 'end' });
  assert.equal(auxOf(store).length, 0);
  assert.equal(combatOf(store).currentActorId, 'mage');
  await store.undo();
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
});

test('deux lanceurs, deux montures dont chacune est tour à tour le prochain acteur à l’expiration : jamais de Tour faux', async () => {
  const env = await destrier({ foe: { initiative: 5 } }), { store, engine } = env;
  const state = json(store), mage2 = structuredClone(state.combat.participants.find(p => p.id === 'mage'));
  Object.assign(mage2, { id: 'mage2', name: 'mage2', initiative: 50 });
  state.combat.participants.push(mage2); state.combat.order = ['mage', 'mage2', 'foe'];
  await store.loadFromJSON(state);
  const c = getSpellContract('Destrier d’Ombre');
  await cast(store, c, { ...DAWN(c), actorId: 'mage2', targetIds: ['foe'] });
  const horses = auxOf(store).map(a => a.id);
  assert.equal(horses.length, 2);
  await endTurn(engine); await endTurn(engine);
  await jumpTo(store, 7, 'mage');
  const seq = [];
  for (let i = 0; i < 8; i++) { await endTurn(engine); const cb = combatOf(store); seq.push(`${cb.round}:${cb.currentActorId}`); }
  assert.equal(seq.filter(s => s.startsWith('7:') && s.endsWith(':mage')).length, 0, JSON.stringify(seq));
  assert.ok(seq.includes('7:foe'), JSON.stringify(seq));
  assert.equal(auxOf(store).length, 0);
  assert.ok(horses.every(id => !combatOf(store).order.includes(id)));
});

test('magie et divin simultanés : monture et loup expirent au même Tour du lanceur, chacun retiré sans Tour faux', async () => {
  const { getDivineContract, getAllDivineContracts } = await import('../../../js/core/v5-divine-store.js');
  const { default: registry } = await import('../../../js/data/v5-divine-contracts.json', { with: { type: 'json' } });
  const maskId = getAllDivineContracts().find(row => row.type === 'miracle' && row.name === 'Masque mortuaire').id;
  const { schemaVersion: _s, sourceFingerprint: _f, ...base } = getDivineContract(maskId);
  const id = 'divine:miracle:morr:test-summon-p4d-r4';
  registry.contracts.push({ ...structuredClone(base), id, name: 'Essai invocation p4d', catalogueName: 'Essai invocation p4d', canonicalName: 'Test summon p4d', status: 'assisted',
    params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: { kind: 'fixed', value: 6, unit: 'rounds' } },
    effects: [{ appliesTo: 'caster', duration: { value: 6, unit: 'rounds' }, type: 'summon-creature', kind: 'creature', profile: 'wolf' }], targetRules: [],
    clauses: [{ id: 'effect', mode: 'engine', text: 'Effet moteur.', sourceRef: 'test' }], needsInput: [] });
  try {
    const env = await destrier({ foe: { initiative: 5 } }), { store, engine, horse } = env;
    const state = json(store), mage = state.combat.participants.find(p => p.id === 'mage');
    mage.skills.push({ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 80 });
    mage.talents = [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Morr' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Morr' }];
    mage.prayers = [{ name: 'Essai invocation p4d', status: 'resolved' }];
    mage.extensions.v5.divine = { sin: 0 };
    state.combat.round = 2;                                // le loup (6 Rounds) expire alors au Round 7, comme la monture
    await store.loadFromJSON(state);
    const preview = store.previewDivineExecution(id, { actorId: 'mage', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: { phase: 'endOfTurn', round: 7, actorId: 'mage' } });
    assert.equal(preview.ready, true, preview.error);
    assert.equal((await store.applyDivineExecution(id, { preview })).ready, true);
    const wolf = store.listParticipants().find(p => p.extensions?.v5?.divineSummon);
    assert.ok(wolf);
    await jumpTo(store, 7, 'mage');
    const seq = [];
    for (let i = 0; i < 6; i++) {
      await endTurn(engine);
      const cb = combatOf(store); seq.push(`${cb.round}:${cb.currentActorId}`);
      const orphan = store.listParticipants().filter(p => p.extensions?.isAuxiliary || p.extensions?.v5?.divineSummon).map(p => p.id);
      assert.ok(orphan.every(pid => pid === cb.currentActorId || !seq.length), JSON.stringify(seq) + orphan);
      if (cb.round === 8) break;
    }
    assert.equal(seq.filter(s => s.startsWith('7:') && s.endsWith(':mage')).length, 0, JSON.stringify(seq));
    assert.ok(seq.includes('7:foe'), JSON.stringify(seq));
    assert.equal(seq.at(-1), '8:mage');
    assert.ok(![horse.id, wolf.id].some(pid => store.listParticipants().some(p => p.id === pid)));
  } finally { registry.contracts = registry.contracts.filter(row => row.id !== id); }
});
});

describe('invocations — branchement', () => {
const printed=id=>L06.profiles.find(p=>p.id===id);
const raised=(store,c)=>store.listParticipants().filter(p=>p.id.startsWith('aux-'+c.id));

test('B3 Relever les morts — Squelettes aux valeurs imprimées, À Terre, contrôlés, plus de participant générique',async()=>{
 const c=getSpellContract('Relever les morts');
 const {store}=await encounter();
 await cast(store,c,{sl:2,domainFactsExtra:{minutesToDawn:5}});
 const list=raised(store,c),skeleton=printed('E0-P-093');
 assert.ok(list.length>=2);
 for(const s of list){
  assert.equal(s.hp,skeleton.wounds);assert.equal(s.maxHp,skeleton.wounds);assert.equal(s.caracs.CC,skeleton.stats.CC);assert.equal(s.caracs.F,skeleton.stats.F);
  assert.equal(s.actions.length,skeleton.attacks.filter(a=>!a.optional).length);assert.ok(s.actions.length>0);
  assert.equal(s.extensions.v5.bestiary.id,'E0-P-093');assert.ok(!s.extensions.v5.genericSummon);
  assert.equal(level(s,'À Terre'),1);assert.ok(s.traits.includes('Mort-vivant'));assert.equal(s.extensions.v5.summonOwnerId,'mage');
 }
});

test('Invocation au Round 0 après le tirage — tire un d10 et inscrit le bonus d’Initiative',async()=>{
 const c=getSpellContract('Relever les morts');
 const {store}=await encounter();
 const state=JSON.parse(store.getFullJSON());
 state.combat.round=0;
 state.extensions.v5.combatInitiativeInitialized=true;
 state.extensions.v5.combatInitiativeResolution={order:[...state.combat.order]};
 await store.loadFromJSON(state);
 await cast(store,c,{sl:0,domainFactsExtra:{minutesToDawn:5}});
 const summoned=raised(store,c);
 assert.ok(summoned.length>0);
 for(const creature of summoned){
  const initiative=creature.extensions.v5.combatInitiative;
  assert.ok(initiative.die>=1&&initiative.die<=10);
  assert.equal(initiative.characteristic,creature.caracs.I);
  assert.equal(initiative.bonus,Math.floor(creature.caracs.I/10));
  assert.equal(initiative.score,initiative.die+initiative.bonus);
  assert.equal(initiative.initialized,true);
  assert.ok(store.getCombat().order.includes(creature.id));
 }
});

test('B3 Réanimation — Zombies ou Squelettes d’après le choix, profil imprimé de chacun',async()=>{
 const c=getSpellContract('Réanimation');
 for(const [kind,id] of [['zombies','E0-P-094'],['skeletons','E0-P-093']]){
  const {store}=await encounter();
  await cast(store,c,{sl:1,domainFactsExtra:{minutesToDawn:5,undeadKind:kind}});
  const list=raised(store,c);assert.ok(list.length>1,kind);
  assert.ok(list.every(p=>p.extensions.v5.bestiary.id===id&&p.hp===printed(id).wounds&&level(p,'À Terre')===1),kind);
 }
});

test('B3 Manifestation de Démon Mineur — Sanguinaire de Khorne ou Démonette de Slaanesh ; camp ennemi si le démon l’emporte',async()=>{
 const c=getSpellContract('Manifestation de Démon Mineur');
 for(const [kind,outcome,id,name,camp] of [['bloodletter','obeys','E0-P-107','Sanguinaire de Khorne','pj'],['daemonette','attacks','E0-P-108','Démonette de Slaanesh','ennemi']]){
  const {store}=await encounter();
  await cast(store,c,{sl:1,domainFactsExtra:{daemonKind:kind,commandOutcome:outcome}});
  const list=raised(store,c);assert.equal(list.length,1,kind);
  const [d]=list;assert.equal(d.name,name);assert.equal(d.hp,printed(id).wounds);assert.equal(d.extensions.v5.bestiary.id,id);
  assert.equal(d.camp,camp===  'pj'?store.listParticipants().find(p=>p.id==='mage').camp:camp);
 }
});
});

describe('registre des traditions — caractérisation', () => {
// Caractérisation de la phase D : les 277 contrats issus de l'audit ne changent jamais, quels que soient les sorts de traditions ajoutés.
const base=contracts.filter(c=>!c.isTradition);
test('Phase D — les 277 contrats d’audit sont inchangés (empreinte)',()=>{
 assert.equal(base.length,277);
 assert.equal(createHash('sha256').update(JSON.stringify(base)).digest('hex'),'c427b59bf32865171751222c8c95c04054bce3822c1ccc869d80bc46e0c05e89');
});
test('Phase D — ids et noms uniques sur tout le catalogue de contrats',()=>{
 const all=getAllSpellContracts();
 assert.equal(new Set(all.map(c=>c.id)).size,all.length);
 const names=all.map(c=>c.name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase());
 assert.equal(new Set(names).size,names.length);
});
test('Phase D — chaque contrat de tradition est marqué, sans ligne d’audit, avec empreinte recalculable',()=>{
 for(const c of contracts.filter(c=>c.isTradition)){
  assert.match(c.id,/^spell-tradition-/);
  assert.equal(c.row,null);
  const payload=JSON.stringify({canonicalName:c.canonicalName,page:c.page,cn:c.cn,range:c.range,target:c.target,duration:c.duration});
  assert.equal(c.sourceFingerprint,'sha256:'+createHash('sha256').update(payload).digest('hex'),c.name);
  assert.equal(getSpellContract(c.name)?.id,c.id);
  assert.equal(getSpellContract(c.canonicalName)?.id,c.id);
 }
});
});

describe('Grande Gueule', () => {
// [nom FR, nom EN, livre, page, NI, portée, cible, durée] — L01 pp. 32-33 et L12 p. 82
const SOURCE=[
 ['Brise-os','Bonecrusher','L01',32,5,'Force Mentale mètres','1','Instantané'],
 ['Gloutonneur','Bullgorger','L01',32,5,'Bonus de Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Dévore-cervelle','Braingobbler','L01',32,5,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Saveur de la mort','Taste Death','L01',33,2,'Vous','Vous','Instantané'],
 ['Tripes de troll','Trollguts','L01',33,6,'Bonus d’Endurance mètres','1','Bonus d’Endurance Rounds'],
 ['La Gueule','The Maw','L01',33,11,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Festin des tombés','Feast of the Fallen','L01',33,9,'Vous','Spécial','Bonus de Force Mentale Rounds'],
 ['Brasse-bile','Bilebrew','L12',82,6,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Bouillie de sang','Bloodgruel','L12',82,5,'Vous','Vous','Instantané'],
 ['Du cœur au ventre','Get Some Guts','L12',82,6,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Brise-dents','Toothcracker','L12',82,8,'Vous','ZdE Force Mentale mètres','Bonus de Force Mentale Rounds']
];
for(const [fr,en,book,page,cn,range,target,duration] of SOURCE)test(`Grande Gueule ${book} p. ${page} — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'maw');assert.equal(c.type,'Domaine de la Grande Gueule');assert.equal(c.sourceBook,book);
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const FACTS={'Brasse-bile':{hatredTarget:'les Nains'},'Bouillie de sang':{bloodgruelHeal:3}};
for(const [fr] of SOURCE)test(`Grande Gueule — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{domainFactsExtra:FACTS[fr]||{},targetTests:{foe:{resistanceRoll:95,roll:95,dodgeRoll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Attribut de la Grande Gueule — d10 de l’offrande : 10 ou ≥ NI soigne NI Blessures au lanceur ; jet exigé',async()=>{
 assert.equal(normalizeLoreId('great-maw'),'maw');assert.equal(LORE_ATTRIBUTES.maw.name,'Domaine de la Grande Gueule');
 const c=getSpellContract('Brise-os');
 const {store}=await encounter({mage:{hp:10}});
 const missing=store.previewSpellExecution(c.id,inputFor(c,{attributeActive:true}));
 assert.equal(missing.ready,false);assert.equal(missing.status,'dice-required');assert.match(missing.error,/offrande/);
 for(const [roll,gain] of [[4,0],[5,5],[9,5],[10,5]]){
  const e=await encounter({mage:{hp:10}});
  await cast(e.store,c,{attributeActive:true,targetTests:{foe:{roll:98,wardRoll:1},mage:{mawRoll:roll}}});
  assert.equal(subject(e.store,'mage').hp,10+gain,'d10 '+roll);
 }
 const low=getSpellContract('Saveur de la mort');
 const t=await encounter({mage:{hp:10}});
 await cast(t.store,low,{attributeActive:true,targetTests:{mage:{mawRoll:2}}});
 assert.equal(subject(t.store,'mage').hp,12,'NI 2, d10 2 : soigne 2');
});
test('Brise-os — projectile +4 qui ignore les Points d’Armure, +20 sur la table de Critiques en rappel',async()=>{
 const c=getSpellContract('Brise-os');
 assert.equal(c.effects.missile.damage,4);assert.equal(c.effects.missile.ignoreAp,true);assert.match(c.reminders,/\+20 au jet/);
 const lost=async armor=>{const {store}=await encounter({foe:{hp:200,maxHp:200,armor}});await cast(store,c,{targetTests:{foe:{roll:98,wardRoll:1}}});return 200-subject(store,'foe').hp;};
 assert.equal(await lost({head:5,body:5,arms:5,legs:5}),await lost({head:0,body:0,arms:0,legs:0}));
});
test('Gloutonneur — +20 Force, refus par Calme −2 DR, Exténué à la fin sans repas',async()=>{
 const c=getSpellContract('Gloutonneur');
 const {store}=await encounter();await cast(store,c);
 assert.equal(subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id).statModifiers.F,20);
 assert.equal(c.effects.secondaryTest.modifierSl,-2);assert.equal(c.effects.expiryEffect.conditions[0],'Exténué');
 const refuse=await encounter();
 await cast(refuse.store,c,{targetTests:{foe:{rejectsGift:true,resistanceRoll:5,roll:5}}});
 assert.ok(!(subject(refuse.store,'foe').extensions.v5.spellEffects||[]).some(e=>e.spellId===c.id),'refus réussi');
 const fail=await encounter();
 await cast(fail.store,c,{targetTests:{foe:{rejectsGift:true,resistanceRoll:95,roll:95}}});
 assert.ok(subject(fail.store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id),'refus raté');
});
test('Dévore-cervelle, Tripes de troll, Saveur de la mort — Traits et rappels',async()=>{
 assert.deepEqual(getSpellContract('Dévore-cervelle').effects.traits,['Peur (2)']);
 assert.match(getSpellContract('Dévore-cervelle').reminders,/−2 DR/);
 const troll=getSpellContract('Tripes de troll');assert.deepEqual(troll.effects.traits,['Régénération']);assert.match(troll.reminders,/Accessible \(\+2 DR\)/);
 assert.equal(getSpellContract('Saveur de la mort').treatment,'narrative');
});
test('La Gueule — Esquive +0 : réussie, dégâts 8 moins DR ; ratée, dégâts 10 et trois Enchevêtré',async()=>{
 const c=getSpellContract('La Gueule');
 const run=async dodge=>{const {store}=await encounter({foe:{hp:200,maxHp:200,armor:{head:0,body:0,arms:0,legs:0}}});
  await cast(store,c,{targetTests:{foe:{dodgeRoll:dodge,resistanceRoll:dodge,roll:98,wardRoll:1}}});return subject(store,'foe');};
 const failed=await run(95);assert.equal(level(failed,'Enchevêtré'),3);assert.ok(failed.hp<200);
 const okay=await run(5);assert.equal(level(okay,'Enchevêtré'),0);assert.ok(okay.hp<200);
 assert.ok(200-okay.hp<=200-failed.hp,'moins de dégâts sur Esquive réussie');
 assert.match(c.reminders,/Blessure Critique/);assert.match(c.reminders,/Force 60/);
});
test('Festin des tombés — Vampirisme, résistance volontaire Endurance −2 DR, fin : Calme +0 ou Sonné si blessure au corps à corps',async()=>{
 const c=getSpellContract('Festin des tombés');
 assert.deepEqual(c.effects.traits,['Vampirique']);assert.equal(c.effects.secondaryTest.modifierSl,-2);
 assert.equal(c.effects.expiryEffect.failConditions[0],'Sonné');assert.equal(c.effects.expiryEffect.test.modifierSl,0);
 assert.match(c.reminders,/−3 DR/);
});
test('Sorts de L12 — Ogres amis seulement (fait « Ogre allié »), jamais sans le fait',async()=>{
 for(const fr of ['Brasse-bile','Du cœur au ventre','Brise-dents']){
  const c=getSpellContract(fr);const facts=FACTS[fr]||{};
  const stranger=await encounter({foe:{camp:'pj'}});
  assert.equal(stranger.store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:facts})).targetResults?.[0]?.resisted,true,fr+' : sans le fait, exclu');
  const ogre=await encounter({foe:{camp:'pj'}});
  const p=ogre.store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:facts,targetTests:{foe:{ogre:true,roll:98}}}));
  assert.equal(p.ready,true,p.error);assert.notEqual(p.targetResults?.[0]?.resisted,true,fr);
 }
 assert.deepEqual(getSpellContract('Brise-dents').effects.testModifiers,{Endurance:2,Calme:2});assert.equal(getSpellContract('Brise-dents').effects.apModifiers.all,1);
 assert.deepEqual(getSpellContract('Brasse-bile').effects.traits,['Haine']);
});
test('Bouillie de sang — soigne la valeur saisie (1 + DR du Test), 0 = Test raté, Flux sanglant en rappel',async()=>{
 const c=getSpellContract('Bouillie de sang');
 const {store}=await encounter({mage:{hp:10}});await cast(store,c,{domainFactsExtra:{bloodgruelHeal:6}});
 assert.equal(subject(store,'mage').hp,16);
 const failed=await encounter({mage:{hp:10}});await cast(failed.store,c,{domainFactsExtra:{bloodgruelHeal:0}});
 assert.equal(subject(failed.store,'mage').hp,10);assert.match(c.reminders,/Flux sanglant/);
});
});

describe('Petite Waaagh!', () => {
// L12 pp. 98-99 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Du calme !','Behave!',98,2,'Force Mentale mètres','1 (maximum)','Bonus de Force Mentale minutes'],
 ['Mots malins','Cunnin’ Words',98,0,'Force Mentale mètres','1','Bonus de Force Mentale minutes'],
 ['Malédiction de la Mauvaise Lune','Curse of Da Bad Moon',98,9,'Bonus de Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Don du Dieu-Araignée','Gift of the Spider-God',98,3,'Vous','ZdE Bonus de Force Mentale mètres (Gobelins des forêts)','Bonus de Force Mentale Rounds'],
 ['Gork va arranger ça','Gork’ll Fix It',98,5,'Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['La Grande Rancune verte','The Great Green Spite',98,20,'Bonus de Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Démangeaison','Itchy Nuisance',99,4,'Bonus de Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Mork te veut !','Mork Wants Ya!',99,9,'Bonus de Force Mentale mètres','1','Instantané'],
 ['Voile de la nuit','Night Shroud',99,5,'Bonus de Force mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Chapardeur','Nikkit!',99,3,'Force Mentale mètres','1','Instantané'],
 ['Coups en traître','Sneaky Stabbin’',99,8,'Vous','ZdE Bonus de Force Mentale mètres (Orques et Gobelins)','Bonus de Force Mentale Rounds'],
 ['Regard vengeur','Vindictive Glare',99,7,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Instantané']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE)test(`Petite Waaagh L12 p. ${page} — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'little-waaagh');assert.equal(c.type,'Domaine de la Petite Waaagh');assert.equal(c.sourceBook,'L12');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const ALLY={foe:{camp:'pj'}};
const PATCH={
 'Don du Dieu-Araignée':{targetTests:{foe:{forestGoblin:true,roll:98},mage:{roll:98}}},
 'La Grande Rancune verte':{targetTests:{foe:{greenskin:true,roll:98},mage:{roll:98}}},
 'Coups en traître':{targetTests:{foe:{greenskin:true,roll:98},mage:{roll:98}}},
 'Mork te veut !':{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:95},mage:{roll:95}}}
};
for(const [fr] of SOURCE)test(`Petite Waaagh — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 const c=getSpellContract(fr);
 const patch=PATCH[fr]||{targetTests:{foe:{resistanceRoll:95,roll:95,dodgeRoll:95,objectId:'blade'},mage:{roll:95}}};
 await verifySpell(c,{...patch,...(['Don du Dieu-Araignée','La Grande Rancune verte','Coups en traître'].includes(fr)?{}:{})});
});
test('Attribut de la Petite Waaagh — 1 DR converti en 1 Point de Chance (couche sans échéance), sur demande',async()=>{
 assert.equal(normalizeLoreId('little-waaagh'),'little-waaagh');assert.equal(LORE_ATTRIBUTES['little-waaagh'].name,'Domaine de la Petite Waaagh');
 const c=getSpellContract('Gork va arranger ça');
 const yes=await encounter();
 await cast(yes.store,c,{attributeActive:true,domainFactsExtra:{waaaghFortune:true},targetTests:{foe:{roll:98}}});
 assert.ok(subject(yes.store,'mage').extensions.v5.spellEffects.some(e=>e.remainingTempFortune===1),'Chance temporaire');
 const no=await encounter();
 await cast(no.store,c,{attributeActive:true,targetTests:{foe:{roll:98}}});
 assert.ok(!(subject(no.store,'mage').extensions.v5.spellEffects||[]).some(e=>e.remainingTempFortune),'sans demande, rien');
});
test('Malédiction de la Mauvaise Lune — ennemis seulement : Exténué et Chance interdite',async()=>{
 const c=getSpellContract('Malédiction de la Mauvaise Lune');
 const {store}=await encounter();await cast(store,c);
 const foe=subject(store,'foe');assert.equal(level(foe,'Exténué'),1);assert.equal(foe.extensions.v5.specialStates.cannotUseFortune,true);
 const friend=await encounter({foe:{camp:'pj'}});
 assert.equal(friend.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,'allié exempté');
});
test('Gork va arranger ça — Exténué pour la durée ; Démangeaison — −1 DR, −2 DR en armure de métal',async()=>{
 const {store}=await encounter();await cast(store,getSpellContract('Gork va arranger ça'));
 assert.equal(level(subject(store,'foe'),'Exténué'),1);
 const c=getSpellContract('Démangeaison');
 const plain=await encounter();await cast(plain.store,c);
 assert.equal(subject(plain.store,'foe').extensions.v5.testModifiers['Tous les Tests'],-1);
 const steel=await encounter({foe:{equipment:[{id:'MaillesMailles',kind:'armour',keywords:[],name:'Cotte de mailles',category:'Mailles',layer:'flexible',ap:2,locations:['body']}]}});
 await cast(steel.store,c);
 assert.equal(subject(steel.store,'foe').extensions.v5.testModifiers['Tous les Tests'],-2,'armure de métal');
 assert.equal(c.effects.metalArmourTestModifiers['Tous les Tests'],-2);
});
test('Don du Dieu-Araignée — Venin Intermédiaire aux seuls Gobelins des forêts alliés',async()=>{
 const c=getSpellContract('Don du Dieu-Araignée');
 const none=await encounter({foe:{camp:'pj'}});
 assert.equal(none.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,'sans le fait');
 const ok=await encounter({foe:{camp:'pj'}});await cast(ok.store,c,{targetTests:{foe:{forestGoblin:true,roll:98}}});
 assert.ok(subject(ok.store,'foe').traits.some(t=>/Venin/.test(t))||JSON.stringify(subject(ok.store,'foe').extensions.v5.spellEffects).includes('Venin'));
 assert.match(c.reminders,/Difficile/);
});
test('Mork te veut ! — Force 80 opposée : main gagnante = 10 au corps, cible gagnante = aucun effet',async()=>{
 const c=getSpellContract('Mork te veut !');
 const run=async(handRoll,targetRoll)=>{const {store}=await encounter({foe:{hp:40,maxHp:40,armor:{head:0,body:0,arms:0,legs:0}}});
  await cast(store,c,{domainFactsExtra:{opposedActorRoll:handRoll},targetTests:{foe:{opponentRoll:targetRoll,resistanceRoll:targetRoll,roll:98}}});return subject(store,'foe');};
 assert.ok((await run(5,95)).hp<40,'main gagnante');assert.equal((await run(95,5)).hp,40,'cible gagnante');
 assert.equal(c.effects.opposedTest.casterScore,80);assert.match(c.reminders,/2d10 mètres/);
});
test('Voile de la nuit — Aveuglé, Vision nocturne et Vision dans le noir exemptées',async()=>{
 const c=getSpellContract('Voile de la nuit');
 const {store}=await encounter();await cast(store,c);assert.equal(level(subject(store,'foe'),'Aveugl'),1);
 for(const trait of ['Vision nocturne','Vision dans le noir']){
  const e=await encounter({foe:{traits:[trait]}});
  assert.equal(e.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,trait);
 }
});
test('Regard vengeur — Dégâts +4 en zone, Sonné seulement si Blessures et Calme raté',async()=>{
 const c=getSpellContract('Regard vengeur');
 const run=async roll=>{const {store}=await encounter({foe:{hp:40,maxHp:40,armor:{head:0,body:0,arms:0,legs:0}}});
  await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll:98,wardRoll:1}}});return subject(store,'foe');};
 const failed=await run(95);assert.ok(failed.hp<40);assert.equal(level(failed,'Sonné'),1);
 const passed=await run(5);assert.ok(passed.hp<40);assert.equal(level(passed,'Sonné'),0);
 assert.equal(c.effects.missile.damage,4);
});
test('La Grande Rancune verte, Coups en traître, Du calme !, Mots malins, Chapardeur — rappels et ciblage',async()=>{
 assert.match(getSpellContract('La Grande Rancune verte').reminders,/Coup Critique/);assert.match(getSpellContract('La Grande Rancune verte').reminders,/Hobgobelin/);
 assert.match(getSpellContract('Coups en traître').reminders,/Empaleuse et Perforante/);
 assert.match(getSpellContract('Du calme !').reminders,/Squig, Loup géant, Araignée/);
 assert.equal(getSpellContract('Mots malins').cn,0);
 assert.match(getSpellContract('Chapardeur').reminders,/Escamotage 55/);
 const c=getSpellContract('Coups en traître');
 const stranger=await encounter({foe:{camp:'pj'}});assert.equal(stranger.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true);
});
});

describe('Grande Waaagh!', () => {
// L12 pp. 100-101 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Dur comme le roc','‘Ard as Nails',100,3,'Bonus de Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Frappez-les, les gars !','Bash ‘Em Lads!',100,6,'Bonus de Force Mentale mètres','Spécial','Instantané'],
 ['Éclate-cervelle','Brainbursta',100,5,'Bonus de Force Mentale mètres','1','Instantané'],
 ['Coup de boule','‘Eadbutt',100,6,'Bonus de Force Mentale mètres','1','Instantané'],
 ['Allons-y !','‘Ere We Go!',100,7,'Vous','ZdE Bonus de Force Mentale mètres (Orques)','Bonus de Force Mentale Rounds'],
 ['Le Soleil mauvais','The Evil Sun',101,12,'Bonus de Force Mentale mètres','ZdE Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Poings de Gork','Fists of Gork',101,2,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Pied de Gork','Foot of Gork',101,10,'Bonus de Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Instantané'],
 ['Regard de Mork','Gaze of Mork',101,5,'Force Mentale mètres','Spécial','Instantané'],
 ['La Main de Gork','The Hand of Gork',101,9,'Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds'],
 ['Mork nous protège !','Mork Save Us!',101,8,'Bonus de Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds'],
 ['WAAAGH !','WAAAGH!',101,12,'Vous','ZdE Force Mentale mètres (tous les Orques, Gobelins et assimilés, alliés ou non)','Bonus de Force Mentale Rounds']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE)test(`Grande Waaagh L12 p. ${page} — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'big-waaagh');assert.equal(c.type,'Domaine de la Grande Waaagh');assert.equal(c.sourceBook,'L12');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const GS={foe:{greenskin:true,roll:98,resistanceRoll:95,dodgeRoll:95,objectId:'blade',wardRoll:1},mage:{roll:98}};
for(const [fr] of SOURCE)test(`Grande Waaagh — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{targetTests:GS});
});
test('Attribut de la Grande Waaagh — Domaine reconnu, rappel : états Brisé retirés par le MJ',()=>{
 assert.equal(normalizeLoreId('big-waaagh'),'big-waaagh');assert.equal(LORE_ATTRIBUTES['big-waaagh'].name,'Domaine de la Grande Waaagh');
 const p=previewLoreAttribute({lore:'big-waaagh',caster:{id:'c',caracs:{FM:50}},targets:[]});
 assert.match(p.casterEffects.summary,/états Brisé/);assert.equal(p.casterEffects.reminderOnly,true);
});
const elan=(store,id)=>subject(store,id).extensions.v5.hasMomentum;
test('Élan accordé — Frappez-les, Allons-y !, WAAAGH ! : Élan aux seuls Orques/Gobelins désignés (fait), Brisé retiré par WAAAGH !',async()=>{
 for(const [fr,extra] of [['Frappez-les, les gars !',{}],['Allons-y !',{}],['WAAAGH !',{states:[{id:'state-9-brise',name:'Brisé',level:1}]}]]){
  const c=getSpellContract(fr);
  const {store}=await encounter({foe:{camp:fr==='WAAAGH !'?'ennemi':'pj',extensions:{v5:{hasMomentum:false}},...extra}});
  assert.equal(elan(store,'foe'),false);
  await cast(store,c,{targetTests:{foe:{greenskin:true,roll:98}}});
  assert.equal(elan(store,'foe'),true,fr);
  if(fr==='WAAAGH !')assert.equal(level(subject(store,'foe'),'Brisé'),0,'Brisé retiré');
  await store.undo();assert.equal(elan(store,'foe'),false,'Undo : '+fr);
  const stranger=await encounter({foe:{camp:fr==='WAAAGH !'?'ennemi':'pj'}});
  assert.equal(stranger.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,fr+' : sans le fait, exclu');
 }
 assert.match(getSpellContract('Frappez-les, les gars !').reminders,/Élan/);
 assert.deepEqual(getSpellContract('WAAAGH !').effects.testModifiers,{Calme:2,Endurance:2});
});
test('Dur comme le roc — Haine de tous les ennemis, +2 DR aux Tests d’Endurance, effets d’états ignorés (rappel)',async()=>{
 const c=getSpellContract('Dur comme le roc');
 const {store}=await encounter();await cast(store,c);
 const foe=subject(store,'foe');assert.equal(foe.extensions.v5.testModifiers['carac:e'],2);
 assert.ok(foe.traits.includes('Haine (tous les ennemis)')||JSON.stringify(foe.extensions.v5.spellEffects).includes('Haine'));
 assert.match(c.reminders,/ignore les effets négatifs/);
});
test('Éclate-cervelle — À Terre, Sonné + un Sonné par DR, Critique à la tête en rappel',async()=>{
 const c=getSpellContract('Éclate-cervelle');
 const {store}=await encounter({foe:{caracs:{CC:50,CT:50,F:40,E:300,I:50,Ag:50,Dex:50,Int:60,FM:60,Soc:50,M:4}}});const p=await cast(store,c);
 const foe=subject(store,'foe');assert.equal(level(foe,'À Terre'),1);
 assert.equal(level(foe,'Sonné'),1+Math.min(20,p.castingPreview.totalCastingSl),'Sonné + 1 par DR (plafonné à 20)');
 assert.match(c.reminders,/Calme Accessible \(\+2 DR\)/);
});
test('Coup de boule — projectile +1 à la tête, +6 contre Attirance aethyrique ou Seconde vue ; cartouche de Lustria consigné',async()=>{
 const c=getSpellContract('Coup de boule');
 assert.equal(c.effects.missile.damage,1);assert.equal(c.effects.missile.fixedLocation,'HEAD');assert.deepEqual(c.effects.missile.talentDamage,{talents:['aethyric-attunement','second-sight'],damage:6});
 const lost=async talents=>{const {store}=await encounter({foe:{hp:200,maxHp:200,armor:{head:0,body:0,arms:0,legs:0},talents}});
  await cast(store,c,{targetTests:{foe:{roll:98,wardRoll:1}}});const foe=subject(store,'foe');return 200-foe.hp;};
 const plain=await lost([]),sensitive=await lost([{id:'talent-second-sight',rank:1,status:'resolved'}]);
 assert.ok(sensitive>plain,'+6 contre les sensibles à la magie ('+plain+' → '+sensitive+')');
});
test('Le Soleil mauvais — 8 + DR de dégâts à chaque Round, Enflammé sur Endurance ratée (clause de fin de Round)',async()=>{
 const c=getSpellContract('Le Soleil mauvais');
 assert.equal(c.effects.roundEffect.damage.formula,'8 + DR');assert.equal(c.effects.roundEffect.phase,'endOfRound');assert.equal(c.effects.roundEffect.failConditions[0],'Enflammé');
 const {store}=await encounter({foe:{hp:400,maxHp:400}});await cast(store,c);
 const layer=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id);assert.ok(layer?.roundEffect);
});
test('Poings de Gork — attaque créée : Corps à corps (Bagarre) 55, dégâts BF + 9',async()=>{
 const c=getSpellContract('Poings de Gork');
 const {store}=await encounter();await cast(store,c);
 const mage=subject(store,'mage');
 const fists=(mage.actions||[]).find(a=>/Poings de Gork/.test(a.note||''));
 assert.ok(fists,'action créée');assert.equal(fists.base,55);assert.equal(fists.damageFormula,'BF+9');
});
test('Pied de Gork — À Terre dans tous les cas, 8 ignorant les PA, 4 si Esquive Difficile (−1 DR) réussie',async()=>{
 const c=getSpellContract('Pied de Gork');
 const run=async dodge=>{const {store}=await encounter({foe:{hp:60,maxHp:60,armor:{head:3,body:3,arms:3,legs:3}}});
  await cast(store,c,{targetTests:{foe:{dodgeRoll:dodge,resistanceRoll:dodge,roll:98,wardRoll:1}}});return subject(store,'foe');};
 const failed=await run(95),passed=await run(5);
 assert.equal(level(failed,'À Terre'),1);assert.equal(level(passed,'À Terre'),1);
 assert.ok(failed.hp<passed.hp,'plus de dégâts si l’Esquive est ratée');
 assert.equal(c.effects.secondaryTest.modifierSl,-1);
});
test('Regard de Mork — Dégâts +4, créatures vivantes seulement ; La Main de Gork — rappel 1d10 cibles ; Mork nous protège ! — Protection 10+',async()=>{
 const gaze=getSpellContract('Regard de Mork');assert.equal(gaze.effects.missile.damage,4);
 const dead=await encounter({foe:{traits:['Mort-vivant']}});
 assert.equal(dead.store.previewSpellExecution(gaze.id,inputFor(gaze)).targetResults?.[0]?.resisted,true,'non vivant exempté');
 assert.match(getSpellContract('La Main de Gork').reminders,/1d10/);
 const save=getSpellContract('Mork nous protège !');assert.equal(save.effects.ward,10);assert.match(save.reminders,/7\+/);
 const {store}=await encounter({foe:{camp:'pj'}});await cast(store,save,{targetTests:{foe:{greenskin:true,roll:98}}});
 assert.equal(subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===save.id).ward,10);
});
test('Frappez-les et Mork nous protège — écarts L07/L12 consignés (le plus récent fait foi)',()=>{
 assert.match(getSpellContract('Frappez-les, les gars !').reminders,/Lustria/);
 assert.match(getSpellContract('Mork nous protège !').reminders,/Lustria/);
 assert.match(getSpellContract('Coup de boule').reminders,/Lustria/);
});
});

describe('Lustria et Haute Magie', () => {
// L07 pp. 128-129 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Déracinement des montagnes','Uproot the Mountains',128,8,'Ligne de vue','1','1 Round'],
 ['Ligne de terre','Earth Line',129,10,'Ligne de vue','Spécial','Instantané'],
 ['Ruine des cités','Ruination of Cities',129,12,'Ligne de vue','1 bâtiment','Instantané'],
 ['Déflagration mentale','Mental Blast',129,7,'Ligne de vue','ZdE Bonus de Force Mentale mètres','Instantané']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE)test(`Lustria L07 p. ${page} — ${fr} : paramètres relus, Haute Magie, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'high');assert.equal(c.type,'Haute Magie');assert.equal(c.sourceBook,'L07');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const PATCH={
 'Ligne de terre':{domainFactsExtra:{nexusNear:true}},
 'Ruine des cités':{domainFactsExtra:{structure:'unfortified'}},
 'Déflagration mentale':{burnoutRoll:50}
};
for(const [fr] of SOURCE)test(`Lustria — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{...(PATCH[fr]||{}),targetTests:{foe:{resistanceRoll:95,roll:95,dodgeRoll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Déracinement des montagnes — Athlétisme −3 DR : raté = À Terre, réussi = rien ; avalanche +5 DR en rappel',async()=>{
 const c=getSpellContract('Déracinement des montagnes');
 for(const [roll,fallen] of [[95,1],[3,0]]){
  const {store}=await encounter();await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll}}});
  assert.equal(level(subject(store,'foe'),'À Terre'),fallen,'jet '+roll);
 }
 assert.equal(c.overcast.specific.find(o=>o.id==='avalanche').cost,5);assert.match(c.reminders,/10 dégâts/);
});
test('Ligne de terre — 15 dégâts au corps sur Endurance −2 DR ratée, Points d’Armure ignorés ; nexus exigé',async()=>{
 const c=getSpellContract('Ligne de terre');
 const run=async(roll,armor)=>{const {store}=await encounter({foe:{hp:100,maxHp:100,armor}});
  await cast(store,c,{domainFactsExtra:{nexusNear:true},targetTests:{foe:{resistanceRoll:roll,roll:98}}});return 100-subject(store,'foe').hp;};
 const bare=await run(95,{head:0,body:0,arms:0,legs:0});assert.ok(bare>0);
 assert.equal(await run(95,{head:6,body:6,arms:6,legs:6}),bare,'PA ignorés');assert.equal(await run(3,{head:0,body:0,arms:0,legs:0}),0,'Endurance réussie');
 const {store}=await encounter();
 assert.equal(store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{nexusNear:false}})).ready,false);
 assert.deepEqual(c.overcast.specific.map(o=>[o.id,o.cost]),[['bridge',4],['path',6]]);
});
test('Ruine des cités — 20 au corps sur Esquive −2 DR ratée ; structure fortifiée exige +6 DR de surpuissance',async()=>{
 const c=getSpellContract('Ruine des cités');
 const run=async roll=>{const {store}=await encounter({foe:{hp:100,maxHp:100,armor:{head:0,body:0,arms:0,legs:0}}});
  await cast(store,c,{domainFactsExtra:{structure:'unfortified'},targetTests:{foe:{dodgeRoll:roll,resistanceRoll:roll,roll:98}}});return 100-subject(store,'foe').hp;};
 assert.ok(await run(95)>0);assert.equal(await run(3),0);
 const {store}=await encounter();
 const refused=store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{structure:'fortified'}}));
 assert.equal(refused.ready,false,'fortifiée sans surpuissance refusée');
 const ok=store.previewSpellExecution(c.id,{...inputFor(c,{sl:50,burnoutRoll:50,domainFactsExtra:{structure:'fortified'}}),overcastSpecific:{fortified:1}});
 assert.equal(ok.ready,true,ok.error);
});
test('Déflagration mentale — BInt + 6 (+6 Démoniaque/Mort-vivant), PA ignorés, Sonné sur Intelligence +2 DR ratée, ennemis seulement',async()=>{
 const c=getSpellContract('Déflagration mentale');
 const lost=async(traits,roll=95)=>{const {store}=await encounter({foe:{hp:200,maxHp:200,traits,armor:{head:4,body:4,arms:4,legs:4}}});
  await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll:98}}});return subject(store,'foe');};
 const plain=await lost([]),undead=await lost(['Mort-vivant']);
 assert.ok(200-plain.hp>0);assert.equal((200-undead.hp)-(200-plain.hp),6,'+6 contre les Morts-vivants');
 assert.equal(level(plain,'Sonné'),1);
 assert.equal(level(await lost([],3),'Sonné'),0);
 const friend=await encounter({foe:{camp:'pj'}});
 assert.equal(friend.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,'allié exempté');
 assert.deepEqual(c.overcast.specific.map(o=>[o.id,o.cost]),[['itza',6],['leveller',9]]);
});
const VARIANTS=[
 ['Apothéose (Slann)','Apothéose','slann-fear',2],
 ['Destruction des Arcanes (Slann)','Destruction des Arcanes','slann-unforge',5],
 ['Drain de Magie (Slann)','Drain de Magie','slann-drain',4],
 ['Chemin entre les Mondes (Slann)','Chemin entre les Mondes','slann-nexus',4]
];
for(const [name,baseName,id,cost] of VARIANTS)test(`Extension Slann — ${name} : contrat distinct, base elfique inchangée, option propre`,async()=>{
 const v=getSpellContract(name),base=getSpellContract(baseName);
 assert.ok(v&&base&&v.id!==base.id);assert.equal(v.variantOf,baseName);assert.equal(v.isTradition,true);assert.equal(base.isTradition,undefined);
 assert.deepEqual([v.cn,v.range,v.target,v.duration],[base.cn,base.range,base.target,base.duration]);
 assert.deepEqual(v.effects,base.effects);
 const own=v.overcast.specific.find(o=>o.id===id);assert.equal(own.cost,cost);
 assert.deepEqual(v.overcast.specific.filter(o=>o.id!==id),base.overcast.specific||[],'options de la base reprises sans changement');
 assert.ok(!(base.overcast.specific||[]).some(o=>o.id===id),'la base ne reçoit pas l’option');
 assert.match(v.reminders,/Slann/);
});
test('Extensions Slann — lancement, Undo et surpuissance propre (rappel chiffré)',async()=>{
 const c=getSpellContract('Apothéose (Slann)');
 const {store}=await encounter({foe:{hp:5,maxHp:40}});const before=store.listParticipants();
 const input={...inputFor(c,{sl:50}),overcastSpecific:{'slann-fear':1}};
 const p=store.previewSpellExecution(c.id,input);assert.equal(p.ready,true,p.error);
 const receipt=p.overcastSpecific.find(e=>e.id==='slann-fear');assert.equal(receipt.spent,2);assert.ok(receipt.reminder||receipt.applied);
 await store.applySpellExecution(c.id,input);await store.undo();assert.deepEqual(store.listParticipants(),before);
});
test('Contrats elfiques d’audit inchangés par les extensions : aucun doublon de nom, 277 contrats d’audit',()=>{
 assert.equal(getAllSpellContracts().filter(c=>!c.isTradition).length,277);
 const names=getAllSpellContracts().map(c=>c.name);assert.equal(new Set(names).size,names.length);
});
});

describe('Magie Elfique', () => {
// [nom FR, nom EN, domaine, page, NI, portée, cible, durée] — L08 pp. 102-111
const VAUL=[
 ['Toucher de l’artiste','Artist’s Touch',102,0,'Toucher','1 objet','Instantané'],
 ['Patience de Vaul','Patience of Vaul',102,0,'Toucher','1 objet','Instantané'],
 ['Grâce de Vaul','Vaul’s Grace',102,7,'Toucher','1 objet','Instantané'],
 ['Rage de Vaul','Vaul’s Rage',102,5,'Bonus de Force Mentale mètres','1 forge ou feu de camp (maximum)','Instantané'],
 ['Divination des flammes','Divination of Flames',102,4,'Bonus d’Initiative mètres (maximum)','1 forge ou feu de camp (maximum)','Bonus d’Intelligence heures'],
 ['Divination des pierres','Divination of Stones',103,6,'Bonus d’Intelligence miles','Spécial','Bonus d’Intelligence heures'],
 ['Feux de la perfection','Fires of Perfection',103,9,'Toucher','1 objet','Instantané'],
 ['Sagesse de l’acier du ciel','Wisdom of the Skysteel',103,11,'Toucher','1 objet','1 Entreprise'],
 ['Forteresse de Hotek','Fortress of Hotek',103,14,'Bonus de Force Mentale mètres','1 salle de forge ou bâtiment (maximum)','Bonus de Force Mentale heures']
];
const MER=[
 ['Lien aux poissons','Fishbonding',106,0,'Force Mentale mètres','1','Force Mentale minutes'],
 ['Sens de la tempête','Stormsense',106,0,'Initiative miles','Spécial','Instantané'],
 ['Furie de l’océan','Ocean’s Fury',106,8,'Vous','ZdE Bonus de Force Mentale miles','3 × Bonus de Force Mentale minutes'],
 ['Esprits des vagues','Spirits of the Waves',106,5,'2 × Sociabilité mètres','ZdE 2 × Bonus de Sociabilité mètres','Bonus de Sociabilité minutes'],
 ['Armure de Mathlann','Armour of Mathlann',106,10,'Force Mentale mètres','1 bateau ou navire','Force Mentale minutes'],
 ['Appel des mers','Call of the Seas',106,14,'Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds'],
 ['Manteau de Mathlann','Cloak of Mathlann',107,11,'Force Mentale mètres','1 bateau ou navire','Force Mentale minutes'],
 ['Maîtresse des profondeurs','Mistress of the Deep',107,9,'Sociabilité mètres','Spécial','Bonus de Sociabilité Rounds'],
 ['Poumons d’eau','Waterlungs',107,7,'Force Mentale mètres','1','Bonus de Force Mentale heures'],
 ['Brumes grouillantes','Writhing Mists',107,6,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale minutes']
];
const HOETH=[
 ['Calame divin','Divine Stylus',110,0,'Vous','Vous','Bonus de Force Mentale minutes'],
 ['Illumination','Enlightenment',110,0,'Bonus de Force Mentale mètres','1 animal','Bonus d’Intelligence minutes'],
 ['Aperçu arcanique','Arcane Insight',110,8,'Toucher','1 objet','Instantané'],
 ['Grand lien spirituel','Greater Spirit Bond',110,4,'Vous','Spécial','Bonus de Force Mentale minutes'],
 ['Creuset de lumière','Crucible of Light',110,6,'Toucher','1 épée','Bonus d’Intelligence minutes'],
 ['Maîtrise mnémonique','Mnemonic Control',110,6,'Bonus de Force Mentale mètres','1','Instantané'],
 ['Envoi psychique','Psychic Sending',111,7,'Force Mentale miles','1','Instantané'],
 ['Façonnage d’âme','Soulcraft',111,10,'Bonus de Force Mentale mètres','1 Fantôme','Instantané'],
 ['Sceaux sacrés','Sacred Wards',111,11,'Toucher','ZdE Bonus d’Intelligence mètres','Bonus d’Intelligence heures'],
 ['Les Mots premiers','The Primary Words',111,15,'Vous','Vous','Bonus d’Intelligence heures']
];
const GROUPS=[['vaul','Magie de Vaul',VAUL],['mathlann','Magie de la mer',MER],['hoeth','Magie de Hoeth',HOETH]];
for(const [domain,type,list] of GROUPS)for(const [fr,en,page,cn,range,target,duration] of list)test(`${type} L08 p. ${page} — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,domain);assert.equal(c.type,type);assert.equal(c.sourceBook,'L08');assert.match(c.edition,/Supplément Elfe/);
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const PATCH={
 'Forteresse de Hotek':{domainFactsExtra:{defence:'flame'}},
 'Sceaux sacrés':{domainFactsExtra:{ward:'purity'}}
};
for(const [,,list] of GROUPS)for(const [fr] of list)test(`Magie elfique — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{burnoutRoll:50,...(PATCH[fr]||{}),targetTests:{foe:{resistanceRoll:95,roll:95,dodgeRoll:95,objectId:'blade',wardRoll:1},mage:{roll:95}}});
});
test('Options de surpuissance propres : coût chiffré, rappel, « Yenlui lumineux requis » partout où le texte le dit',()=>{
 const expected={'Divination des flammes':[['invisible',2],['remote-target',3]],'Divination des pierres':[['ithilmar',3]],'Feux de la perfection':[['another-spell',5]],
  'Sagesse de l’acier du ciel':[['brittle',4],['magic-ithilmar',6]],'Forteresse de Hotek':[['extra-defence',2]],
  'Armure de Mathlann':[['larger',2],['armour-3',4],['missile-cover',6]],'Appel des mers':[['friendly',5],['stays',8]],'Manteau de Mathlann':[['larger',2],['black-arks',8]],
  'Maîtresse des profondeurs':[['immune',5],['move',3]],'Poumons d’eau':[['senses',4],['drawn',4]],'Brumes grouillantes':[['moving',3],['fear',3]],
  'Creuset de lumière':[['quality',3],['mind',5],['permanent',7]],'Maîtrise mnémonique':[['casting',2],['erase',3]],'Envoi psychique':[['image',3],['stranger',4]],
  'Sceaux sacrés':[['weeks',6]],'Les Mots premiers':[['elders',2],['spirits',4]],'Esprits des vagues':[['extra-elemental',3]]};
 for(const [name,options] of Object.entries(expected)){
  const c=getSpellContract(name);assert.deepEqual(c.overcast.specific.map(o=>[o.id,o.cost]),options,name);
  for(const o of c.overcast.specific)assert.equal(o.kind,'reminder');
 }
 assert.match(getSpellContract('Divination des flammes').overcast.specific[0].reminder,/Yenlui lumineux requis/);
 assert.doesNotMatch(getSpellContract('Esprits des vagues').overcast.specific[0].reminder,/Yenlui/);
});
test('Rage de Vaul — Dégâts +6 ignorant l’armure, deux Enflammé, À Terre et Sonné sans Esquive réussie',async()=>{
 const c=getSpellContract('Rage de Vaul');
 const run=async dodge=>{const {store}=await encounter({foe:{hp:100,maxHp:100,armor:{head:5,body:5,arms:5,legs:5}}});
  await cast(store,c,{targetTests:{foe:{dodgeRoll:dodge,resistanceRoll:dodge,roll:98,wardRoll:1}}});return subject(store,'foe');};
 const failed=await run(95),passed=await run(3);
 assert.ok(failed.hp<100);assert.equal(level(failed,'Enflammé'),2);assert.equal(level(failed,'À Terre'),1);assert.equal(level(failed,'Sonné'),1);
 assert.equal(level(passed,'Enflammé'),2);assert.equal(level(passed,'À Terre'),0);assert.equal(level(passed,'Sonné'),0);
 assert.match(c.reminders,/2 × Bonus de Force Mentale mètres/);
});
test('Sacrifices de la mer — états Exténué et Blessures du lanceur payés à l’incantation, annulés avec Undo',async()=>{
 const cases=[['Armure de Mathlann',2,0],['Appel des mers',2,2],['Manteau de Mathlann',2,1],['Maîtresse des profondeurs',1,1],['Poumons d’eau',1,0],['Brumes grouillantes',1,0]];
 for(const [name,fatigue,wounds] of cases){
  const c=getSpellContract(name);const {store}=await encounter({mage:{hp:30,maxHp:40}});const before=store.listParticipants();
  await cast(store,c);
  const mage=subject(store,'mage');assert.equal(level(mage,'Exténué'),fatigue,name+' : Exténué');assert.equal(mage.hp,30-wounds,name+' : Blessures');
  await store.undo();assert.deepEqual(store.listParticipants(),before,name+' : Undo');
 }
 for(const name of ['Lien aux poissons','Sens de la tempête','Furie de l’océan','Esprits des vagues']){
  const {store}=await encounter();await cast(store,getSpellContract(name));assert.equal(level(subject(store,'mage'),'Exténué'),0,name+' : aucun sacrifice');
 }
});
test('Brumes grouillantes — alliés de la zone : Discrétion +2 DR ; ennemis exemptés ; Poumons d’eau — rappel de respiration',async()=>{
 const c=getSpellContract('Brumes grouillantes');
 const ally=await encounter({foe:{camp:'pj'}});await cast(ally.store,c);
 assert.equal(subject(ally.store,'foe').extensions.v5.testModifiers['Discrétion'],2);
 const enemy=await encounter();assert.equal(enemy.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true);
 assert.match(c.reminders,/−2 DR pour toucher/);
 assert.match(getSpellContract('Poumons d’eau').effects.specialState.assistedReminder,/respire sous l’eau/);
});
test('Illumination — +20 Intelligence et Force Mentale ; Sceaux sacrés — un effet au choix, rappel propre',async()=>{
 const c=getSpellContract('Illumination');
 const {store}=await encounter();await cast(store,c);
 const layer=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id);
 assert.deepEqual([layer.statModifiers.Int,layer.statModifiers.FM],[20,20]);assert.match(c.reminders,/Bestial et Craintif/);
 const wards=getSpellContract('Sceaux sacrés');
 for(const [ward,text] of [['forgetfulness',/dernières 24 heures/],['purity',/mutations\) × 6|× 6/],['surveillance',/un Round/],['truthfulness',/mensonge/]]){
  const e=await encounter();await cast(e.store,wards,{domainFactsExtra:{ward}});
  assert.match(JSON.stringify(subject(e.store,'foe').extensions.v5.spellEffects),text,ward);
 }
 const missing=await encounter();
 assert.equal(missing.store.previewSpellExecution(wards.id,inputFor(wards)).ready,false,'effet choisi requis');
});
test('Forteresse de Hotek — défense choisie requise ; rappels de sacrifice (cécité, Recherche) et de Yenlui',async()=>{
 const c=getSpellContract('Forteresse de Hotek');
 const {store}=await encounter();assert.equal(store.previewSpellExecution(c.id,inputFor(c)).ready,false);
 assert.equal(store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{defence:'doors'}})).ready,true);
 assert.match(c.reminders,/cécité/);
 assert.match(getSpellContract('Sceaux sacrés').reminders,/Recherche prolongé Difficile/);
 assert.match(getSpellContract('Les Mots premiers').reminders,/Anoqeyån/);
});
});

describe('collèges — compléments', () => {
// [nom FR, nom EN, livre, page, NI, portée, cible, durée] — L17 pp. 26-27 et L07 p. 81
const SOURCE=[
 ['Belligérance du Marais de sang','Belligerence of the Bloodmarsh','L17',26,2,'Bonus de Force Mentale mètres','1 Bête des fens (n’importe laquelle)','Instantané'],
 ['Effondrement d’un construit','Collapse Construct','L17',26,6,'Bonus de Force Mentale mètres','1 Construit (n’importe lequel)','Instantané'],
 ['Déchiffrer la malédiction','Decipher Curse','L17',26,4,'Force Mentale mètres','Tout objet','Instantané'],
 ['Perturber la magie','Disrupt Magic','L17',26,8,'Force Mentale mètres','1','Instantané'],
 ['Pourriture grouillante de mouches','Fly-Infested Rotweed','L17',26,4,'Bonus de Force Mentale mètres','1 Bête des fens (n’importe laquelle)','Bonus de Force Mentale minutes'],
 ['Limon de vie','Lifebloom Silt','L17',26,4,'Bonus de Force Mentale mètres','1 Bête des fens (n’importe laquelle)','Bonus de Force Mentale minutes'],
 ['Silence (Arcane)','Silence (Arcane)','L17',27,4,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale minutes'],
 ['Secours au serviteur magique','Succour Magical Servant','L17',27,2,'Bonus de Force Mentale mètres','Un de vos Constructs ou Familiers','Instantané'],
 ['Voile de brouillard','Shroud of Fog','L07',81,8,'Vous','ZdE Bonus de Force Mentale miles','Force Mentale minutes']
];
for(const [fr,en,book,page,cn,range,target,duration] of SOURCE)test(`Collèges ${book} p. ${page} — ${fr} : paramètres relus, Arcane, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'arcane');assert.match(c.type,/^Sort d’Arcane/);assert.equal(c.sourceBook,book);assert.equal(c.isTradition,true);
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const PATCH={
 'Effondrement d’un construit':{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:95},mage:{roll:95}}},
 'Perturber la magie':{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:95},mage:{roll:95}}}
};
for(const [fr] of SOURCE)test(`Collèges — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{burnoutRoll:50,...(PATCH[fr]||{targetTests:{foe:{resistanceRoll:95,roll:95,dodgeRoll:95,objectId:'blade'},mage:{roll:95}}})});
});
test('Silence (Arcane) — contrat distinct du Silence d’Ombres, −3 DR à l’incantation dans la zone',async()=>{
 const arc=getSpellContract('Silence (Arcane)'),shadow=getSpellContract('Silence');
 assert.notEqual(arc.id,shadow.id);assert.equal(shadow.domain,'shadow');assert.equal(arc.domain,'arcane');
 const {store}=await encounter();await cast(store,arc);
 assert.equal(subject(store,'foe').extensions.v5.testModifiers['Langue (Magick)'],-3);
});
test('Bêtes des fens — Frénésie, Distrayant, Régénération doublée : Bête des fens seulement (Trait posé par le MJ)',async()=>{
 for(const [name,trait] of [['Belligérance du Marais de sang','Frénésie'],['Pourriture grouillante de mouches','Distrayant']]){
  const c=getSpellContract(name);assert.deepEqual(c.effects.traits,[trait]);
  const plain=await encounter();assert.equal(plain.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,name+' : cible ordinaire exemptée');
  const beast=await encounter({foe:{traits:['Bête des fens']}});await cast(beast.store,c);
  assert.ok(subject(beast.store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id),name);
 }
 const silt=getSpellContract('Limon de vie');assert.match(silt.effects.specialState.assistedReminder,/double/);
});
test('Effondrement d’un construit — Force Mentale contre Endurance : victoire = inerte, défaite = rien ; Construit seulement',async()=>{
 const c=getSpellContract('Effondrement d’un construit');
 const run=async(casterRoll,targetRoll)=>{const {store}=await encounter({foe:{traits:['Artificiel']}});
  await cast(store,c,{domainFactsExtra:{opposedActorRoll:casterRoll},targetTests:{foe:{opponentRoll:targetRoll,resistanceRoll:targetRoll,roll:98}}});return subject(store,'foe');};
 assert.ok((await run(5,95)).extensions.v5.spellEffects.some(e=>e.spellId===c.id),'inerte');
 assert.ok(!((await run(95,5)).extensions?.v5?.spellEffects||[]).some(e=>e.spellId===c.id),'résistance');
 const plain=await encounter();assert.equal(plain.store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:98}}})).targetResults?.[0]?.resisted,true);
 assert.match(c.reminders,/deux dés explicites/);
});
test('Perturber la magie — opposition de Force Mentale à deux dés, Fiasco mineur en rappel ; Déchiffrer la malédiction — rappels',async()=>{
 const c=getSpellContract('Perturber la magie');
 const {store}=await encounter();
 assert.equal(store.previewSpellExecution(c.id,inputFor(c)).ready,false,'sans dés explicites');
 const ok=store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:98}}}));
 assert.equal(ok.ready,true,ok.error);assert.match(c.reminders,/Fiasco mineur/);
 const dc=getSpellContract('Déchiffrer la malédiction');assert.equal(dc.treatment,'narrative');assert.match(dc.reminders,/Exposition modérée/);assert.match(dc.reminders,/Lever la malédiction/);
});
test('Secours au serviteur magique — soin du Bonus d’Endurance, doublé à +3 DR (rappel chiffré), alliés seulement',async()=>{
 const c=getSpellContract('Secours au serviteur magique');
 assert.equal(c.overcast.specific[0].cost,3);
 const {store}=await encounter({foe:{camp:'pj',hp:5,maxHp:40}});await cast(store,c);
 assert.ok(subject(store,'foe').hp>5,'Blessures récupérées');
 const enemy=await encounter({foe:{hp:5,maxHp:40}});
 assert.equal(enemy.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true);
});
test('Secours au serviteur magique — D-C122 : le soin compte le Bonus d’Endurance du serviteur, pas celui du lanceur',async()=>{
 const c=getSpellContract('Secours au serviteur magique');
 const {store}=await encounter({foe:{camp:'pj',hp:5,maxHp:40,caracs:{E:70,CC:50,F:40,I:50,Ag:50,Dex:50,Int:60,FM:60,Soc:50,M:4}}});await cast(store,c);
 assert.equal(subject(store,'foe').hp,5+7,'BE du serviteur (7), non celui du lanceur (4)');
 const noE=await encounter({foe:{camp:'pj',hp:5,maxHp:40,caracs:{CC:50}}});
 const p=noE.store.previewSpellExecution(c.id,inputFor(c));assert.equal(p.ready,false);assert.match(p.error,/Endurance/);
});
test('Voile de brouillard — rappel (visibilité 10 mètres, non magique) ; aucun doublon de nom parmi les contrats',()=>{
 const c=getSpellContract('Voile de brouillard');assert.equal(c.treatment,'narrative');assert.match(c.reminders,/10 mètres/);assert.match(c.reminders,/non magique/);
 const names=getAllSpellContracts().map(x=>x.name);assert.equal(new Set(names).size,names.length);
});
});

describe('magie naturelle', () => {
const NAMES=['Bonne Volonté','Joie de Halãtha','Chevaucher l’Obscurité','Nepenthés','Panacée','Séparer les branches','Charme protecteur','Œil du berger'];
// L06 pp. 255-256 : [nom, page, NI, portée, cible, durée]
const SOURCE=[
 ['Bonne Volonté',255,0,'Vous','ZdE Bonus de Sociabilité mètres','Bonus de Force Mentale minutes'],
 ['Joie de Halãtha',255,0,'Toucher','1','Bonus de Sociabilité heures'],
 ['Chevaucher l’Obscurité',256,0,'Vous','Vous','Bonus de Force Mentale minutes'],
 ['Nepenthés',256,0,'Toucher','Spécial','Bonus de Force Mentale heures'],
 ['Panacée',256,0,'Toucher','Spécial','Bonus de Dextérité heures'],
 ['Séparer les branches',256,0,'Vous','Vous','Initiative minutes'],
 ['Charme protecteur',256,0,'Toucher','Spécial','Bonus de Force Mentale jours'],
 ['Œil du berger',256,0,'Spécial','Spécial','Instantané']
];
for(const [name,page,cn,range,target,duration] of SOURCE)test(`Magie naturelle L06 p. ${page} — ${name} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(name);assert.ok(c,name);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'hedgecraft');assert.equal(c.type,'Domaine de la Magie naturelle');assert.equal(c.isTradition,true);
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)),'aucun ingrédient exigé');
});
test('Magie naturelle — noms canoniques anglais résolus',()=>{
 for(const [fr,en] of [['Bonne Volonté','Goodwill'],['Chevaucher l’Obscurité','Mirkride'],['Panacée','Nostrum'],['Charme protecteur','Protective Charm'],['Œil du berger','Shepherd’s Eye']])assert.equal(getSpellContract(en)?.name,fr);
});
for(const name of NAMES)test(`Magie naturelle — ${name} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(name));
});
test('Bonne Volonté — +1 DR à tout Test de Sociabilité dans la zone, aucun autre Test ; Animosité et Haine rappelées sans effet',async()=>{
 const {store}=await encounter();const c=getSpellContract('Bonne Volonté');
 await cast(store,c,{targetIds:['mage','foe']});
 for(const id of ['mage','foe']){const p=subject(store,id);
  assert.equal(p.extensions.v5.testModifiers['carac:soc'],1);
  assert.deepEqual(magicSkillModifiers(p,'Charme',{carac:'soc'}).map(m=>m.amount),[1]);
  assert.deepEqual(magicSkillModifiers(p,'Athlétisme',{carac:'ag'}),[],'les autres Tests ne bougent pas');
  assert.deepEqual(magicSkillModifiers(p,'Charme',{}),[],'sans caractéristique connue, rien d’inventé');
}
 assert.match(c.reminders,/Animosité et Haine/);});
test('Test de Sociabilité résolu : le +1 DR de Bonne Volonté entre dans la résolution',async()=>{
 const {store}=await encounter();await cast(store,getSpellContract('Bonne Volonté'),{targetIds:['foe']});
 const action={type:'skill',attr:'Soc',label:'Charme',base:50};
 const p=store.previewResolution({actorId:'foe',action,roll:45,v5:{kind:'test',choice:'keep'}});
 assert.deepEqual(p.test.details.modifiers.map(m=>[m.id,m.amount]),[['spell-skill:carac:soc',1]]);
 assert.equal(p.test.sl,2);
 const q=store.previewResolution({actorId:'mage',action,roll:45,v5:{kind:'test',choice:'keep'}});
 assert.deepEqual(q.test.details.modifiers,[]);
 const other=store.previewResolution({actorId:'foe',action:{type:'skill',attr:'Ag',label:'Esquive',base:50},roll:45,v5:{kind:'test',choice:'keep'}});
 assert.deepEqual(other.test.details.modifiers,[]);
});
test('Charme protecteur — +2 DR contre les effets magiques et la Corruption, durée BFM jours',async()=>{
 const {store}=await encounter();const c=getSpellContract('Charme protecteur');
 const p=await cast(store,c,{targetIds:['mage']});
 const mage=subject(store,'mage');
 assert.equal(c.effects.receiptFormulas.resistanceMagieEtCorruptionDR,2);assert.match(c.reminders,/\+2 DR/);
 const layer=mage.extensions.v5.spellEffects.find(e=>e.spellId===c.id);
 assert.equal(layer.durationRounds,6*8640,'BFM = 6 jours de 8 640 Rounds');
});
test('Chevaucher l’Obscurité — trait Éthéré, ni incantation ni parole, fin sur dégâts magiques en rappel',async()=>{
 const {store}=await encounter();const c=getSpellContract('Chevaucher l’Obscurité');
 await cast(store,c);const mage=subject(store,'mage');
 assert.ok(mage.traits.includes('Éthéré'));
 assert.equal(mage.extensions.v5.specialStates.cannotCast,true);assert.equal(mage.extensions.v5.specialStates.cannotSpeak,true);
 assert.match(c.reminders,/dégât magique/i);assert.match(c.reminders,/errera|erre/i);
});
test('Panacée — soigne le Bonus de Dextérité de la cible, rappel des maladies (+1 par +2 DR)',async()=>{
 const {store}=await encounter({mage:{caracs:{CC:50,CT:50,F:40,E:40,I:50,Ag:50,Dex:70,Int:60,FM:60,Soc:50,M:4}},foe:{hp:10,maxHp:40}});
 const c=getSpellContract('Panacée');
 await cast(store,c,{targetIds:['foe'],domainFacts:{}});
 assert.equal(subject(store,'foe').hp,17);
 assert.match(c.reminders,/maladie/i);
});
test('Magie naturelle — jamais d’ingrédient : lancement sans rien déclarer',async()=>{
 const {store}=await encounter();
 for(const name of NAMES){const c=getSpellContract(name);const p=store.previewSpellExecution(c.id,inputFor(c,{targetIds:/^vous$/i.test(c.target)?['mage']:['foe']}));assert.equal(p.ready,true,name+' : '+p.error);}
});
test('Magie naturelle — l’attribut du Domaine (ingrédients) n’impose aucun blocage et reste un rappel',()=>{
 for(const name of NAMES)assert.ok(getSpellContract(name).reminders,name+' : texte joint');
 assert.equal(getAllSpellContracts().filter(c=>c.domain==='hedgecraft').length>=8,true);
});
});

describe('magie naturelle — AotE3', () => {
// L02 pp. 62-64 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Dague de l’Art','Dagger of the Art',62,4,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Borne sinistre','Fellstave',62,9,'Spécial','Spécial','1 mois'],
 ['Revigorer','Invigorate',63,2,'Toucher','1','Bonus de Force Mentale Rounds'],
 ['Philtre d’amour','Lovelock',63,10,'Toucher','Spécial','Jusqu’à minuit'],
 ['Sachet de protection','Protection Pouch',63,5,'Toucher','Spécial','1 semaine + 1 semaine par DR'],
 ['Pas imperceptible','Sightstep',64,7,'Vous','Vous','Bonus de Force Mentale minutes'],
 ['Marée d’argent','Silvertide',64,4,'Vous','Vous','1d10 heures'],
 ['L’Expulsion','The Ousting',64,8,'Bonus de Force Mentale mètres','1','1d10 ans'],
 ['Protection contre le wyrd','Wyrd Ward',64,4,'Toucher','1','Bonus de Force Mentale heures']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE){
 test(`Magie naturelle AOTE3 p. ${page} — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
  const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
  assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
  assert.equal(c.domain,'hedgecraft');assert.equal(c.sourceBook,'L02');assert.match(c.edition,/AOTE3/);
  assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
 });
}
// Les contrats à dés explicites (opposition, Test fixe) ont leurs propres patchs ci-dessous.
const PATCHES={'Borne sinistre':{domainFactsExtra:{creatureType:'undead'}},'Philtre d’amour':{domainFactsExtra:{minutesToMidnight:90}}};
for(const fr of ['Borne sinistre','Revigorer','Philtre d’amour','Sachet de protection','Pas imperceptible','Marée d’argent'])
 test(`Magie naturelle AOTE3 — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{await verifySpell(getSpellContract(fr),PATCHES[fr]||{});});

test('Dague de l’Art — deux attaques Magiques : BF + 2, et BF + 8 contre Éthéré ou Corruption ; bâtonnet sans effet de règle',async()=>{
 const {store}=await encounter();const c=getSpellContract('Dague de l’Art');
 const before=store.listParticipants();
 await cast(store,c);
 const attacks=subject(store,'mage').actions.filter(a=>a.id.startsWith('spell-weapon-'));
 assert.equal(attacks.length,2);
 assert.deepEqual(attacks.map(a=>a.damageFormula),['BF+2','BF+8']);
 assert.ok(attacks.every(a=>a.qualities.some(q=>q.id==='magique')));
 assert.match(attacks[1].note,/Éthéré ou Corruption/);
 assert.match(c.reminders,/Focalisation Intermédiaire \(\+0 DR\)/);
 assert.equal(c.overcast.options.includes('targets'),false);
 assert.equal(subject(store,'mage').actions.length,3);
 await store.undo();assert.deepEqual(store.listParticipants(),before,'Undo atomique');
});
test('Revigorer — D-C22 : retire un état Exténué sur deux ; la pénalité baisse d’un cran',async()=>{
 const {store,engine}=await encounter({mage:{states:[{id:'f',name:'Exténué',level:2}]}});
 const action={type:'skill',attr:'Ag',label:'Athlétisme',base:50};
 const mod=()=>store.previewResolution({actorId:'mage',action,roll:45,v5:{kind:'test',choice:'keep'}}).test;
 const before=mod();
 await cast(store,getSpellContract('Revigorer'),{targetIds:['mage']});
 const during=mod();
 assert.equal(level(subject(store,'mage'),'Exténué'),1,'un niveau retiré');
 assert.notEqual(subject(store,'mage').extensions?.v5?.specialStates?.ignoreFatiguePenalties,true,'plus de pénalité ignorée');
 assert.equal(during.sl-before.sl,1);
});
test('Pas imperceptible — aura masquée, aucun lancer, aucune Focalisation, aucune dissipation, +2 DR Discrétion en reçu',async()=>{
 const {store}=await encounter();const c=getSpellContract('Pas imperceptible');
 await cast(store,c);
 const flags=subject(store,'mage').extensions.v5.specialStates;
 assert.equal(flags.magicAuraHidden,true);assert.equal(flags.cannotCast,true);assert.equal(flags.cannotChannel,true);assert.equal(flags.cannotDispel,true);
 assert.equal(c.effects.receiptFormulas.discretionContreDemonsEspritsEtheresDR,2);
 const other=getSpellContract('Revigorer');
 const p=store.previewSpellExecution(other.id,inputFor(other,{targetIds:['mage']}));
 assert.equal(p.ready,false);
});
test('L’Expulsion — Éthéré ou Démoniaque seulement ; Volonté +0 : réussie, rien ; ratée, BFM Blessures directes',async()=>{
 for(const [roll,hp] of [[10,20],[95,14]]){
  const {store}=await encounter({foe:{traits:['Éthéré'],hp:20}});
  const c=getSpellContract('L’Expulsion');
  await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll}}});
  assert.equal(subject(store,'foe').hp,hp,'jet '+roll);
 }
 const {store}=await encounter({foe:{traits:[],hp:20}});const c=getSpellContract('L’Expulsion');
 const ordinary=store.previewSpellExecution(c.id,inputFor(c,{targetTests:{foe:{resistanceRoll:95,roll:95}}}));
 assert.equal(ordinary.targetResults[0].resisted,true,'une cible ordinaire est exemptée');assert.equal(ordinary.targetResults[0].woundsLost||0,0);
 const daemon=await encounter({foe:{traits:['Démoniaque']}});
 assert.equal(daemon.store.previewSpellExecution(c.id,inputFor(c,{targetTests:{foe:{resistanceRoll:95,roll:95}}})).ready,true);
});
test('Protection contre le wyrd — opposition de Force Mentale à deux dés, malus rappelé pour les seules traditions sombres',async()=>{
 const c=getSpellContract('Protection contre le wyrd');
 assert.equal(c.effects.receiptFormulas.langueMagickEtFocalisationDR,-2);
 assert.match(c.reminders,/Sorcellerie, Nécromancie, Démonologie ou un Domaine du Chaos/);
 const {store}=await encounter();
 const missing=store.previewSpellExecution(c.id,inputFor(c));
 assert.equal(missing.ready,false,'sans dés explicites l’opposition est refusée');
 for(const [actorRoll,foeRoll] of [[25,95],[95,25]]){
  const {store:s}=await encounter();
  const input=inputFor(c,{domainFacts:{opposedActorRoll:actorRoll},targetTests:{foe:{opponentRoll:foeRoll,roll:foeRoll,resistanceRoll:foeRoll}}});
  const p=s.previewSpellExecution(c.id,input);
  assert.equal(p.ready,true,p.error);
 }
});
test('Magie naturelle AOTE3 — le lancement ne réclame jamais d’ingrédient',async()=>{
 const {store}=await encounter({foe:{traits:['Éthéré']}});
 for(const [fr] of SOURCE.filter(([n])=>!['Protection contre le wyrd'].includes(n))){
  const c=getSpellContract(fr);
  const p=store.previewSpellExecution(c.id,inputFor(c,{...(PATCHES[fr]||{}),targetTests:{foe:{resistanceRoll:95,roll:95}}}));
  assert.equal(p.ready,true,fr+' : '+p.error);
 }
});
});

describe('sorcellerie', () => {
// L06 pp. 256-257 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Dégradation','Blight',256,14,'Bonus de Force Mentale mètres','Spécial','Instantané'],
 ['Menace rampante','Creeping Menace',257,6,'Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Malédiction de douleur paralysante','Curse of Crippling Pain',257,10,'Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Malédiction de malchance','Curse of Ill Fortune',257,8,'Force Mentale mètres','1','Bonus de Force Mentale minutes'],
 ['Glamour','Glamour',257,4,'Toucher','1 adulte','Bonus de Force Mentale heures'],
 ['Horreur hantante','Haunting Horror',257,8,'Toucher','Spécial','Force Mentale jours'],
 ['Bonne santé','Make Hale',257,4,'Toucher','1','Instantané'],
 ['Mauvais œil','The Evil Eye',257,6,'10 mètres maximum','1 maximum','Instantané']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE)test(`Sorcellerie L06 p. ${page} — ${fr} : paramètres relus, domaine, aucun attribut ni ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'witchcraft');assert.equal(c.type,'Domaine de la Sorcellerie');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const FACTS={'Dégradation':{blightTarget:'well'},'Malédiction de douleur paralysante':{stabLocation:'body'},'Malédiction de malchance':{curseMode:'normal'},'Mauvais œil':{evilEyeOutcome:'won3'},'Menace rampante':{swarmType:'rats'}};
for(const [fr] of SOURCE.filter(([n])=>n!=='Horreur hantante'))test(`Sorcellerie — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{domainFactsExtra:FACTS[fr]||{},targetTests:{foe:{resistanceRoll:95,roll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Horreur hantante — lancement, persistance et Undo ; aucune exigence de lieu ni d’ingrédient',async()=>{
 const {store}=await encounter();const c=getSpellContract('Horreur hantante');
 const before=store.listParticipants();await cast(store,c);
 assert.ok(subject(store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id&&e.triggered));
 await store.undo();assert.deepEqual(store.listParticipants(),before);
});
test('Malédiction de malchance — −1 DR à tous les Tests, Chance interdite ; la possession donne des jours sans ligne de vue',async()=>{
 const {store}=await encounter();const c=getSpellContract('Malédiction de malchance');
 await cast(store,c,{domainFactsExtra:{curseMode:'normal'},targetTests:{foe:{resistanceRoll:95,roll:95}}});
 const foe=subject(store,'foe');
 assert.equal(foe.extensions.v5.testModifiers['Tous les Tests'],-1);assert.equal(foe.extensions.v5.specialStates.cannotUseFortune,true);
 assert.equal(foe.extensions.v5.spellEffects[0].durationRounds,6*6,'BFM minutes');
 const other=await encounter();
 await cast(other.store,c,{domainFactsExtra:{curseMode:'possession'},targetTests:{foe:{resistanceRoll:95,roll:95}}});
 assert.equal(subject(other.store,'foe').extensions.v5.spellEffects[0].durationRounds,6*8640,'BFM jours');
 assert.match(c.reminders,/relance tous ses jets 01-05/);
});
test('Bonne santé — soigne le BFM, retire un seul Exténué et un seul Sonné',async()=>{
 const {store}=await encounter({foe:{hp:10,maxHp:40,states:[{id:'a',name:'Exténué',level:2},{id:'b',name:'Sonné',level:1}]}});
 const c=getSpellContract('Bonne santé');
 await cast(store,c);
 const foe=subject(store,'foe');
 assert.equal(foe.hp,16);assert.equal(level(foe,'Exténué'),1);assert.equal(level(foe,'Sonné'),0);
 assert.equal(c.overcast.specific[0].cost,3);
});
test('Malédiction de douleur — Corps : Exténué et chute sur Endurance −2 DR ratée ; Tête : Sonné ; Membre : rappel',async()=>{
 const c=getSpellContract('Malédiction de douleur paralysante');
 for(const [roll,fallen] of [[95,1],[10,0]]){
  const {store}=await encounter();await cast(store,c,{domainFactsExtra:{stabLocation:'body'},targetTests:{foe:{resistanceRoll:roll,roll}}});
  const foe=subject(store,'foe');assert.equal(level(foe,'Exténué'),1);assert.equal(level(foe,'À Terre'),fallen,'jet '+roll);
 }
 const head=await encounter();await cast(head.store,c,{domainFactsExtra:{stabLocation:'head'}});
 assert.equal(level(subject(head.store,'foe'),'Sonné'),1);assert.equal(level(subject(head.store,'foe'),'Exténué'),0);
 const limb=await encounter();await cast(limb.store,c,{domainFactsExtra:{stabLocation:'limb'}});
 assert.equal(level(subject(limb.store,'foe'),'Sonné')+level(subject(limb.store,'foe'),'Exténué'),0);
 assert.match(c.reminders,/amputé/);
 const expire=await encounter();await cast(expire.store,c,{domainFactsExtra:{stabLocation:'body'},targetTests:{foe:{resistanceRoll:95,roll:95}}});
 const layer=subject(expire.store,'foe').extensions.v5.spellEffects[0];assert.equal(layer.durationRounds,6);
});
test('Mauvais œil — l’issue saisie fixe les Exténué (un de plus par +3 DR) et le Brisé à +6 DR',async()=>{
 const c=getSpellContract('Mauvais œil');
 for(const [outcome,fatigue,broken] of [['lost',0,0],['won',1,0],['won3',2,0],['won6',3,1],['won9',4,1]]){
  const {store}=await encounter();await cast(store,c,{domainFactsExtra:{evilEyeOutcome:outcome},targetTests:{foe:{resistanceRoll:95,roll:95}}});
  const foe=subject(store,'foe');assert.equal(level(foe,'Exténué'),fatigue,outcome);assert.equal(level(foe,'Brisé'),broken,outcome);
 }
});
test('Horreur hantante — clause d’entrée : +1 Exténué dans tous les cas, +1 Exténué et Brisé si le Calme est raté',async()=>{
 const c=getSpellContract('Horreur hantante');
 for(const [roll,fatigue,broken] of [[10,1,0],[95,2,1]]){
  const {store}=await encounter();await cast(store,c);
  const effect=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id);
  const input={effectId:effect.id,targetId:'foe',kind:'trigger',roll};
  const p=store.previewSpellInteraction(input);assert.equal(p.ready,true,p.error);
  await store.applySpellInteraction(input);
  const foe=subject(store,'foe');assert.equal(level(foe,'Exténué'),fatigue,'jet '+roll);assert.equal(level(foe,'Brisé'),broken,'jet '+roll);
 }
});
test('Menace rampante et Dégradation — rappels : essaim sans profil automatique, formule 24 − DR',async()=>{
 const menace=getSpellContract('Menace rampante');
 assert.equal(menace.effects.assistedSummon,true);assert.match(menace.reminders,/Charme animal/);
 assert.equal(getSpellContract('Dégradation').effects.receiptFormulas.joursAvantMortAnimal,'24 - DR');
});
test('Sorcellerie — aucune Corruption à l’incantation de Dhar (V5) : aucun contrat n’impose de Point de Corruption',()=>{
 for(const [fr] of SOURCE)assert.doesNotMatch(JSON.stringify(getSpellContract(fr).effects),/corruptionPoints|Point de Corruption/i,fr);
 void inputFor;void endTurn;
});
});

describe('démonologie', () => {
// L06 p. 258 : [nom FR, nom EN, NI, portée, cible, durée]
const SOURCE=[
 ['Destruction de Démon Mineur','Destroy Lesser Daemon',6,'Bonus de Force Mentale mètres','1 Démon de taille Moyenne ou inférieure','Bonus de Force Mentale Rounds'],
 ['Détection de démon','Detect Daemon',4,'Force Mentale mètres','Spécial','Instantané'],
 ['Manifestation de Démon Mineur','Manifest Lesser Daemon',8,'Bonus de Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds'],
 ['Octogramme','Octagram',10,'Toucher','ZdE Bonus d’Intelligence mètres','Force Mentale minutes']
];
for(const [fr,en,cn,range,target,duration] of SOURCE)test(`Démonologie L06 p. 258 — ${fr} : paramètres relus, domaine, aucun attribut ni ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[258,cn,range,target,duration]);
 assert.equal(c.domain,'daemonology');assert.equal(c.type,'Domaine de la Démonologie');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const FACTS={'Manifestation de Démon Mineur':{daemonKind:'bloodletter',commandOutcome:'obeys'}};
for(const [fr] of SOURCE.filter(([n])=>n!=='Destruction de Démon Mineur'))test(`Démonologie — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{domainFactsExtra:FACTS[fr]||{},targetTests:{foe:{resistanceRoll:95,roll:95},mage:{roll:95}}});
});
test('Destruction de Démon Mineur — Démon seulement ; Endurance +4 DR opposée : victoire = destruction, défaite = rien',async()=>{
 const c=getSpellContract('Destruction de Démon Mineur');
 assert.equal(c.effects.opposedTest.targetSlModifier,4);assert.equal(c.effects.destroyOnOpposedWin,true);
 const run=async(actorRoll,foeRoll)=>{
  const {store}=await encounter({foe:{traits:['Démoniaque'],hp:20}});
  await cast(store,c,{domainFactsExtra:{opposedActorRoll:actorRoll,boostedStat:'Ag'},targetTests:{foe:{opponentRoll:foeRoll,resistanceRoll:foeRoll,roll:foeRoll}}});
  return subject(store,'foe');
 };
 const won=await run(5,95);assert.equal(won.hp,0);assert.equal(won.zone,'bench');assert.equal(won.extensions.v5.destroyed,true);
 const lost=await run(95,5);assert.equal(lost.hp,20);assert.ok(!lost.extensions?.v5?.destroyed);
 const {store}=await encounter({foe:{traits:[],hp:20}});
 const ordinary=store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:95}}}));
 assert.equal(ordinary.targetResults?.[0]?.destroyed||false,false,'une cible non démoniaque n’est pas détruite');
 assert.match(c.reminders,/\+10 à la caractéristique choisie/);
});
test('Destruction de Démon Mineur — D-C30 : victoire = +10 à la caractéristique choisie du lanceur, défaite = rien',async()=>{
 const c=getSpellContract('Destruction de Démon Mineur');
 const run=async(actorRoll,foeRoll)=>{
  const {store}=await encounter({foe:{traits:['Démoniaque'],hp:20}});
  await cast(store,c,{domainFactsExtra:{opposedActorRoll:actorRoll,boostedStat:'Ag'},targetTests:{foe:{opponentRoll:foeRoll,resistanceRoll:foeRoll,roll:foeRoll}}});
  return store;
 };
 const won=await run(5,95);
 const layer=subject(won,'mage').extensions.v5.spellEffects.find(e=>e.spellId===c.id);
 assert.equal(layer.statModifiers.Ag,10);assert.deepEqual(Object.keys(layer.statModifiers),['Ag']);
 assert.equal((subject(won,'foe').extensions.v5.spellEffects||[]).some(e=>e.spellId===c.id&&Object.keys(e.statModifiers||{}).length),false,'aucun bonus sur le démon');
 const lost=await run(95,5);
 assert.equal((subject(lost,'mage').extensions?.v5?.spellEffects||[]).some(e=>e.spellId===c.id),false);
 assert.equal(c.effects.facts.find(f=>f.key==='boostedStat').options.length,10);
});
test('Destruction de Démon Mineur — un Démon de grande taille est exempté même si l’opposition est gagnée',async()=>{
 const c=getSpellContract('Destruction de Démon Mineur');
 const {store}=await encounter({foe:{traits:['Démoniaque','Grande'],hp:20}});
 await cast(store,c,{domainFactsExtra:{opposedActorRoll:5,boostedStat:'Ag'},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:95}}});
 assert.equal(subject(store,'foe').hp,20);assert.ok(!subject(store,'foe').extensions?.v5?.destroyed);
});
test('Destruction de Démon Mineur — l’opposition exige deux dés explicites',async()=>{
 const c=getSpellContract('Destruction de Démon Mineur');const {store}=await encounter({foe:{traits:['Démoniaque'],hp:20}});
 assert.equal(store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{}})).ready,false);
});
test('Manifestation de Démon Mineur — profil imprimé créé à l’incantation (E-B3), un ordre ; ordre inachevé à la fin de la durée = démon hostile (D-C32, rappel)',()=>{
 const c=getSpellContract('Manifestation de Démon Mineur');
 assert.equal(c.effects.type,'summon');assert.deepEqual(c.effects.summon.profiles,{bloodletter:'E0-P-107',daemonette:'E0-P-108'});assert.match(c.reminders,/un seul ordre/);assert.match(c.reminders,/reste et devient hostile/);
 assert.deepEqual(c.effects.facts.find(f=>f.key==='daemonKind').options.map(o=>o[0]),['bloodletter','daemonette']);
});
test('Octogramme — barrière démoniaque rappelée, version V5 sans clause d’évasion',async()=>{
 const c=getSpellContract('Octogramme');
 assert.match(c.effects.specialState.assistedReminder,/ne peuvent ni entrer/);assert.match(c.reminders,/aucune clause d’évasion/);
 const {store}=await encounter();await cast(store,c);
 assert.ok(subject(store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id&&e.specialState?.assistedReminder));
});
});

describe('nécromancie', () => {
// L06 pp. 258-259 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Relever les morts','Raise Dead',258,7,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Jusqu’au lever du soleil'],
 ['Réanimation','Reanimate',258,8,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Jusqu’au lever du soleil'],
 ['Crâne hurlant','Screaming Skull',259,8,'Force Mentale mètres','Spécial','Instantané'],
 ['L’appel de Vanhel','Vanhel’s Call',259,6,'Force Mentale mètres','Spécial','Instantané']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE)test(`Nécromancie L06 p. ${page} — ${fr} : paramètres relus, domaine, aucun attribut ni ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'necromancy');assert.equal(c.type,'Domaine de la Nécromancie');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const FACTS={'Relever les morts':{minutesToDawn:5},'Réanimation':{minutesToDawn:5,undeadKind:'zombies'},'L’appel de Vanhel':{freeKind:'move'}};
for(const [fr] of SOURCE)test(`Nécromancie — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{domainFactsExtra:FACTS[fr]||{},targetTests:{foe:{resistanceRoll:95,roll:95,objectId:'blade'},mage:{roll:95}}});
});
const dead=(store,prefix)=>store.listParticipants().filter(p=>p.id.startsWith(prefix));
test('Relever les morts — 1 + DR Squelettes À Terre, contrôlés, +1 par +2 DR, fin au lever du soleil',async()=>{
 const c=getSpellContract('Relever les morts');
 const {store}=await encounter();const before=store.listParticipants().length;
 const dr=(await cast(store,c,{sl:3,domainFactsExtra:{minutesToDawn:5}})).castingPreview.totalCastingSl;
 const raised=dead(store,'aux-'+c.id);
 assert.equal(raised.length,1+dr,'1 + DR');
 for(const s of raised){assert.equal(level(s,'À Terre'),1);assert.equal(s.extensions.v5.summonOwnerId,'mage');assert.ok(s.traits.includes('Mort-vivant'));}
 assert.equal(store.listParticipants().length,before+1+dr);
 await store.undo();assert.equal(store.listParticipants().length,before,'Undo retire les squelettes');
 assert.equal(c.overcast.specific[0].cost,2);
});
test('Relever les morts — surpuissance : un Squelette par palier de +2 DR',async()=>{
 const c=getSpellContract('Relever les morts');
 const {store}=await encounter();
 const input={...inputFor(c,{sl:6,domainFactsExtra:{minutesToDawn:5}}),overcastSpecific:{extra:1}};
 const p=store.previewSpellExecution(c.id,input);assert.equal(p.ready,true,p.error);
 await store.applySpellExecution(c.id,input);
 assert.equal(dead(store,'aux-'+c.id).length,1+p.castingPreview.totalCastingSl+1);
});
test('Relever les morts / Réanimation — D-C40 : profils imprimés Squelette (p.339) et Zombie (p.340) du bestiaire, À Terre, contrôlés',async()=>{
 const sk=L06.profiles.find(p=>p.id==='E0-P-093'),zo=L06.profiles.find(p=>p.id==='E0-P-094');
 assert.deepEqual([sk.page,sk.wounds,sk.stats.CC],[339,12,25]);assert.deepEqual([zo.page,zo.wounds,zo.stats.CC],[340,12,15]);
 const {store}=await encounter();const c=getSpellContract('Relever les morts');
 await cast(store,c,{sl:1,domainFactsExtra:{minutesToDawn:5}});
 const raised=dead(store,'aux-'+c.id);assert.ok(raised.length>=2);
 for(const s of raised){assert.equal(s.hp,12);assert.equal(s.caracs.CC,25);assert.equal(level(s,'À Terre'),1);assert.ok(s.traits.includes('Mort-vivant'));}
 const {store:s2}=await encounter();const r=getSpellContract('Réanimation');
 await cast(s2,r,{sl:1,domainFactsExtra:{minutesToDawn:5,undeadKind:'zombies'}});
 assert.equal(dead(s2,'aux-'+r.id)[0].caracs.CC,15);
});
test('Relever les morts — D-C40 : refusé quand le profil n’est pas disponible',async()=>{
 const {store}=await encounter();const c=getSpellContract('Relever les morts');
 const saved=summonProfileLibrary();
 try{
  registerSummonLibrary(saved.filter(p=>p.id!=='E0-P-093'));
  const p=store.previewSpellExecution(c.id,inputFor(c,{sl:1,domainFactsExtra:{minutesToDawn:5}}));
  assert.equal(p.ready,false);assert.match(p.error,/profil/i);
 }finally{registerSummonLibrary(saved);}
});
test('Réanimation — BFM + DR morts relevés, Zombies ou Squelettes selon le choix',async()=>{
 const c=getSpellContract('Réanimation');
 for(const [kind,name] of [['zombies','Zombie'],['skeletons','Squelette']]){
  const {store}=await encounter();
  const dr=(await cast(store,c,{sl:2,domainFactsExtra:{minutesToDawn:5,undeadKind:kind}})).castingPreview.totalCastingSl;
  const raised=dead(store,'aux-'+c.id);
  const bfm=Math.floor(subject(store,'mage').caracs.FM/10);
  assert.equal(raised.length,bfm+dr,'BFM + DR');assert.ok(raised.every(p=>p.name.startsWith(name+' ')),kind);
  assert.ok(raised.every(p=>level(p,'À Terre')===1));
 }
});
test('Relever les morts — fin sur mort ou inconscience du lanceur (événement déclaré), les morts-vivants s’effondrent',async()=>{
 const c=getSpellContract('Relever les morts');
 assert.deepEqual(subjectLayerEnds(c),['caster-down']);
 const {store}=await encounter();await cast(store,c,{sl:1,domainFactsExtra:{minutesToDawn:5}});
 const owner=store.listParticipants().find(p=>(p.extensions?.v5?.spellEffects||[]).some(e=>e.spellId===c.id));
 assert.ok(owner,'une couche porte la fin d’effet');
 const effect=owner.extensions.v5.spellEffects.find(e=>e.spellId===c.id);
 const input={effectId:effect.id,targetId:owner.id,kind:'event',controlValue:'caster-down'};
 const p=store.previewSpellInteraction(input);assert.equal(p.ready,true,p.error);
 await store.applySpellInteraction(input);
 assert.equal(dead(store,'aux-'+c.id).length,0,'les morts-vivants invoqués sont retirés');
});
function subjectLayerEnds(c){return c.effects.specialState.endsOnEvents;}
test('Crâne hurlant — projectile +5, Morts-vivants exclus, Calme +0 : Brisé seulement après Blessure',async()=>{
 const c=getSpellContract('Crâne hurlant');
 assert.equal(c.effects.missile.damage,5);
 const wounded=async roll=>{const {store}=await encounter({foe:{hp:30,traits:[]}});await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll:98,wardRoll:1}}});return subject(store,'foe');};
 const failed=await wounded(95);assert.ok(failed.hp<30,'Blessures subies');assert.equal(level(failed,'Brisé'),1);
 const passed=await wounded(10);assert.ok(passed.hp<30);assert.equal(level(passed,'Brisé'),0);
 const undead=await encounter({foe:{hp:30,traits:['Mort-vivant']}});
 const preview=undead.store.previewSpellExecution(c.id,inputFor(c,{targetTests:{foe:{resistanceRoll:95,roll:98,wardRoll:1}}}));
 assert.equal(preview.targetResults?.[0]?.resisted,true,'les Morts-vivants ne sont pas affectés');
 assert.equal(c.effects.secondaryTest.failOnlyIfWounded,true);
});
test('L’appel de Vanhel — cibles Mortes-vivantes seulement, gain commun rappelé',async()=>{
 const c=getSpellContract('L’appel de Vanhel');
 const living=await encounter({foe:{traits:[]}});
 const p=living.store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{freeKind:'move'}}));
 assert.equal(p.targetResults?.[0]?.resisted,true,'cible vivante exemptée');
 const undead=await encounter({foe:{traits:['Mort-vivant']}});
 const q=undead.store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{freeKind:'action'}}));
 assert.equal(q.ready,true,q.error);assert.notEqual(q.targetResults?.[0]?.resisted,true);
 assert.match(c.reminders,/Mouvement ou une Action gratuite/);assert.equal(c.overcast.specific[0].cost,2);
});
});

describe('attributs de Domaine — caractérisation', () => {
// Caractérisation de l'existant avant l'ajout des Domaines du Chaos (D7-D9) : les neuf attributs de Vents ne changent pas.
const caster={id:'c',name:'Mage',caracs:{FM:50,Int:40},talents:[]};
const foe={id:'f',name:'Foe',hp:20,traits:[],states:[],armor:{body:0}};
const undead={id:'u',name:'Mort',hp:20,traits:['Mort-vivant'],states:[]};
const summarize=lore=>{
 const p=previewLoreAttribute({lore,caster,targets:[foe,undead],spell:{isProtection:true},chosenLore:lore==='high'?'fire':null});
 return {lore:p.lore,casterType:p.casterEffects?.type??null,targets:[...p.targetEffects.entries()].map(([id,e])=>[id,e.type,e.summary]),dmg:{ignoreMetalAp:p.damageRules.ignoreMetalAp,ignoreNonMagicalAp:p.damageRules.ignoreNonMagicalAp,metalDamageBonus:p.damageRules.metalDamageBonus}};
};
const D={ignoreMetalAp:false,ignoreNonMagicalAp:false,metalDamageBonus:false};
const FIRE=[['f','lore-attribute-fire','Foe subit 1 état Enflammé (Attribut Feu).'],['u','lore-attribute-fire','Mort subit 1 état Enflammé (Attribut Feu).']];
const EXPECTED={
 beasts:{lore:'beasts',casterType:'lore-attribute-beasts',targets:[],dmg:D},
 death:{lore:'death',casterType:null,targets:[['f','lore-attribute-death','Foe subit 1 état Exténué (Attribut Mort).']],dmg:D},
 fire:{lore:'fire',casterType:null,targets:FIRE,dmg:D},
 heavens:{lore:'heavens',casterType:'lore-attribute-heavens',targets:[],dmg:{...D,ignoreMetalAp:true}},
 life:{lore:'life',casterType:null,targets:[['f','lore-attribute-life','Foe : retrait des états Hémorragique et Exténué.'],['u','lore-attribute-life','Mort : non vivant, états conservés. Cible Mort-vivante : subit 5 Blessures directes.']],dmg:D},
 light:{lore:'light',casterType:null,targets:[['f','lore-attribute-light','Foe : gagne 1 état Aveuglé.'],['u','lore-attribute-light','Mort : gagne 1 état Aveuglé. Démon/Mort-vivant : subit 4 Blessures directes.']],dmg:D},
 metal:{lore:'metal',casterType:null,targets:[],dmg:{...D,ignoreMetalAp:true,metalDamageBonus:true}},
 shadow:{lore:'shadow',casterType:'lore-attribute-shadow',targets:[],dmg:{...D,ignoreNonMagicalAp:true}},
 high:{lore:'fire',casterType:null,targets:FIRE,dmg:D}
};
for(const [lore,expected] of Object.entries(EXPECTED))test(`Attribut de Domaine existant — ${lore} inchangé`,()=>{assert.deepEqual(summarize(lore),expected);});
test('Attributs de Domaine — les neuf Vents de départ restent présents et les traditions sans attribut ne sont pas reconnues',()=>{
 for(const lore of Object.keys(EXPECTED))assert.ok(LORE_ATTRIBUTES[lore],lore);
 for(const id of ['hedgecraft','witchcraft','daemonology','necromancy','arcane','elven-arcane'])assert.equal(normalizeLoreId(id),null,id);
 for(const [name,id] of [['Domaine des Bêtes','beasts'],['shyish','death'],['Aqshy','fire'],['Azyr','heavens'],['Ghyran','life'],['Hysh','light'],['Chamon','metal'],['Ulgu','shadow'],['Qhaysh','high']])assert.equal(normalizeLoreId(name),id,name);
});
});

describe('Nurgle', () => {
// L06 p. 259 : [nom FR, nom EN, NI, portée, cible, durée]
const SOURCE=[
 ['Inflammation suppurée','Festering Inflammation',5,'Bonus de Force Mentale mètres','1','Instantané'],
 ['Miasme de pestilence','Miasma of Pestilence',6,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Flot de Corruption','Stream of Corruption',9,'Spécial','Spécial','Instantané']
];
for(const [fr,en,cn,range,target,duration] of SOURCE)test(`Nurgle L06 p. 259 — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[259,cn,range,target,duration]);
 assert.equal(c.domain,'nurgle');assert.equal(c.type,'Domaine de Nurgle');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
for(const [fr] of SOURCE)test(`Nurgle — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{targetTests:{foe:{resistanceRoll:95,roll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Attribut de Nurgle — Domaine reconnu, couche « Blessure Suppurée » seulement tant que le sort dure',()=>{
 assert.equal(normalizeLoreId('nurgle'),'nurgle');assert.equal(LORE_ATTRIBUTES.nurgle.name,'Domaine de Nurgle');
 const caster={id:'c',caracs:{FM:50,Int:40}},foe={id:'f',name:'Foe'};
 const lasting=previewLoreAttribute({lore:'nurgle',caster,targets:[foe],spell:{duration:'Bonus de Force Mentale Rounds'}});
 assert.equal(lasting.targetEffects.get('f').spellEffect.specialState.festeringWoundTest,true);
 const instant=previewLoreAttribute({lore:'nurgle',caster,targets:[foe],spell:{duration:'Instantané'}});
 assert.equal(instant.targetEffects.get('f').spellEffect,undefined);assert.match(instant.targetEffects.get('f').summary,/Blessure suppurée/);
});
test('Attribut de Nurgle — appliqué à la cible d’un sort de durée (couche portée, retirée avec Undo)',async()=>{
 const c=getSpellContract('Miasme de pestilence');
 const {store}=await encounter();const before=store.listParticipants();
 await cast(store,c,{attributeActive:true,targetTests:{foe:{resistanceRoll:95,roll:95}}});
 const layers=subject(store,'foe').extensions.v5.spellEffects;
 assert.ok(layers.some(e=>e.spellId===c.id),'couche du sort');
 assert.ok(layers.some(e=>e.spellId==='lore-attribute-nurgle'&&e.specialState?.festeringWoundTest),'couche de l’attribut');
 await store.undo();assert.deepEqual(store.listParticipants(),before);
 const off=await encounter();await cast(off.store,c,{targetTests:{foe:{resistanceRoll:95,roll:95}}});
 assert.ok(!subject(off.store,'foe').extensions.v5.spellEffects.some(e=>e.spellId==='lore-attribute-nurgle'),'attribut coupé (réglage par défaut de la fixture)');
});
test('Attribut de Nurgle — D-C51 : un coup qui blesse une cible marquée propose au MJ de jouer le Test de Blessure Suppurée',async()=>{
 const c=getSpellContract('Miasme de pestilence');
 const {store}=await encounter();
 await cast(store,c,{attributeActive:true,targetTests:{foe:{resistanceRoll:95,roll:95}}});
 const hit=store.previewResolution({actorId:'mage',targetId:'foe',action:{id:'blade',type:'attack',base:90,damage:3},roll:5,defense:{roll:99,base:10,label:'Esquive'}});
 assert.ok(hit.damage?.finalDamage>0,'le coup blesse');
 assert.ok(hit.reminders.some(r=>/Test de Blessure Suppurée/.test(r)&&/Foe|foe/.test(r)),hit.reminders.join(' | '));
 const {store:clean}=await encounter();
 const plain=clean.previewResolution({actorId:'mage',targetId:'foe',action:{id:'blade',type:'attack',base:90,damage:3},roll:5,defense:{roll:99,base:10,label:'Esquive'}});
 assert.ok(!plain.reminders.some(r=>/Blessure Suppurée/.test(r)),'sans marque, aucun rappel');
});
test('Miasme de pestilence — Endurance −2 DR : raté = Nausée (couche), réussi = évité ; exemptés : dévoués, moines, non-vivants',async()=>{
 const c=getSpellContract('Miasme de pestilence');
 for(const [roll,affected] of [[95,true],[3,false]]){
  const {store}=await encounter();await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll}}});
  assert.equal((subject(store,'foe').extensions.v5.spellEffects||[]).some(e=>e.spellId===c.id),affected,'jet '+roll);
 }
 for(const traits of [['Dévoué de Nurgle'],['Moine de la peste'],['Mort-vivant'],['Démoniaque']]){
  const {store}=await encounter({foe:{traits}});
  const p=store.previewSpellExecution(c.id,inputFor(c,{targetTests:{foe:{resistanceRoll:95,roll:95}}}));
  assert.equal(p.targetResults?.[0]?.resisted,true,traits.join());
 }
 assert.match(c.reminders,/Nausée/);
});
test('Flot de Corruption — Dégâts BE + DR, Points d’Armure ignorés ; Pourriture du sang rappelée',async()=>{
 const c=getSpellContract('Flot de Corruption');
 assert.equal(c.effects.damage.formula,'BE+DR');assert.equal(c.effects.damage.ignoreAp,true);
 const lost=async armor=>{const {store}=await encounter({foe:{hp:200,maxHp:200,armor}});await cast(store,c,{targetTests:{foe:{roll:98,wardRoll:1}}});return 200-subject(store,'foe').hp;};
 const bare=await lost({head:0,body:0,arms:0,legs:0}),armoured=await lost({head:5,body:5,arms:5,legs:5});
 assert.ok(bare>0);assert.equal(armoured,bare,'les Points d’Armure sont ignorés');
 assert.match(c.reminders,/Pourriture du sang/);assert.match(c.reminders,/Intermédiaire \(\+0 DR\)/);
});
test('Inflammation suppurée — rappel : le MJ désigne la Blessure suppurée',()=>{
 const c=getSpellContract('Inflammation suppurée');
 assert.equal(c.treatment,'narrative');assert.match(c.reminders,/Blessure Suppurée/);
});
});

describe('Slaanesh', () => {
// L06 p. 260 : [nom FR, nom EN, NI, portée, cible, durée]
const SOURCE=[
 ['Consentement','Acquiescence',5,'Toucher','1','Bonus de Force Mentale Rounds'],
 ['De la douleur le plaisir','From Pain, Pleasure',6,'Toucher','1','Bonus de Force Mentale Rounds'],
 ['Fantasmagorie','Phantasmagoria',8,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds']
];
for(const [fr,en,cn,range,target,duration] of SOURCE)test(`Slaanesh L06 p. 260 — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[260,cn,range,target,duration]);
 assert.equal(c.domain,'slaanesh');assert.equal(c.type,'Domaine de Slaanesh');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
for(const [fr] of SOURCE)test(`Slaanesh — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{targetTests:{foe:{resistanceRoll:95,roll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Attribut de Slaanesh — −2 DR contre Animosité, Haine, Corruption ; +2 DR contre Peur, Terreur ; couche tant que le sort dure',async()=>{
 assert.equal(normalizeLoreId('Slaanesh'),'slaanesh');assert.equal(LORE_ATTRIBUTES.slaanesh.name,'Domaine de Slaanesh');
 const p=previewLoreAttribute({lore:'slaanesh',caster:{id:'c',caracs:{FM:50}},targets:[{id:'f',name:'Foe'}],spell:{duration:'Bonus de Force Mentale Rounds'}});
 assert.deepEqual(p.targetEffects.get('f').spellEffect.specialState.resistanceModifiers,{Animosité:-2,Haine:-2,Corruption:-2,Peur:2,Terreur:2});
 const c=getSpellContract('De la douleur le plaisir');
 const {store}=await encounter();const before=store.listParticipants();
 await cast(store,c,{attributeActive:true});
 assert.ok(subject(store,'foe').extensions.v5.spellEffects.some(e=>e.spellId==='lore-attribute-slaanesh'&&e.specialState?.resistanceModifiers?.Peur===2));
 await store.undo();assert.deepEqual(store.listParticipants(),before);
});
test('Consentement — Endurance +0 au début de chaque Round : le jet est demandé et consigné ; durée BFM Rounds',async()=>{
 const c=getSpellContract('Consentement');
 assert.equal(c.effects.roundEffect.phase,'startOfRound');assert.equal(c.effects.roundEffect.test.modifierSl,0);assert.equal(c.effects.roundEffect.test.skill,'Endurance');
 const {store,engine}=await encounter();await cast(store,c);
 const layer=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id);
 assert.equal(layer.durationRounds,6);assert.ok(layer.roundEffect);
 await endTurn(engine);await endTurn(engine);
 assert.match(JSON.stringify(store.getFullJSON()),/perd son Mouvement et son Action/);
});
test('De la douleur le plaisir — Trait Indolore, Critique : Endurance +2 DR en rappel (Impuissante = cible sans défense)',async()=>{
 const c=getSpellContract('De la douleur le plaisir');
 const {store}=await encounter();await cast(store,c);
 assert.ok(subject(store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id));
 assert.ok(c.effects.traits.includes('Indolore'));assert.match(c.reminders,/Accessible \(\+2 DR\)/);assert.match(c.reminders,/sans défense/);
});
test('Fantasmagorie — le Trait Distrayant va aux alliés de la zone seulement, ennemis exemptés',async()=>{
 const c=getSpellContract('Fantasmagorie');assert.ok(c.effects.traits.includes('Distrayant'));
 const hostile=await encounter();
 assert.equal(hostile.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,'ennemi exemptée');
 const ally=await encounter({foe:{camp:'pj'}});
 const p=ally.store.previewSpellExecution(c.id,inputFor(c));assert.equal(p.ready,true,p.error);assert.notEqual(p.targetResults?.[0]?.resisted,true);
 await ally.store.applySpellExecution(c.id,inputFor(c));
 assert.ok(subject(ally.store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id));
 assert.match(c.reminders,/ne se distraient pas/);
});
});

describe('Tzeentch', () => {
// L06 p. 260 : [nom FR, nom EN, NI, portée, cible, durée]
const SOURCE=[
 ['Don de Tzeentch','Boon of Tzeentch',9,'Vous','Vous','Bonus d’Intelligence jours'],
 ['Transformation de Tzeentch','Transformation of Tzeentch',12,'Bonus de Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Trahison de Tzeentch','Treason of Tzeentch',6,'Force Mentale mètres','ZdE Bonus d’Initiative mètres','Bonus d’Intelligence Rounds']
];
for(const [fr,en,cn,range,target,duration] of SOURCE)test(`Tzeentch L06 p. 260 — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[260,cn,range,target,duration]);
 assert.equal(c.domain,'tzeentch');assert.equal(c.type,'Domaine de Tzeentch');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const FACTS={'Don de Tzeentch':{boonSpell:'Bonne santé'}};
for(const [fr] of SOURCE)test(`Tzeentch — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{domainFactsExtra:FACTS[fr]||{},targetTests:{foe:{resistanceRoll:95,roll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Attribut de Tzeentch — Domaine reconnu ; le d100 du Test de Corruption est exigé de chaque cible',async()=>{
 assert.equal(normalizeLoreId('Tzeentch'),'tzeentch');assert.equal(LORE_ATTRIBUTES.tzeentch.name,'Domaine de Tzeentch');
 const c=getSpellContract('Trahison de Tzeentch');
 const {store}=await encounter();
 const p=store.previewSpellExecution(c.id,inputFor(c,{attributeActive:true}));
 assert.equal(p.ready,false);assert.equal(p.status,'dice-required');assert.match(p.error,/Test de Corruption/);
});
test('Attribut de Tzeentch — réussite : +1 Point de Chance temporaire ; échec : +1 Point de Corruption (Undo, rechargement)',async()=>{
 const c=getSpellContract('Trahison de Tzeentch');
 for(const [roll,success] of [[10,true],[95,false]]){
  const {store}=await encounter();const before=store.listParticipants();
  await cast(store,c,{attributeActive:true,targetTests:{foe:{corruptionRoll:roll,roll:98}}});
  const foe=subject(store,'foe'),layers=foe.extensions.v5.spellEffects;
  assert.equal(layers.some(e=>e.spellId==='lore-attribute-tzeentch'&&e.remainingTempFortune===1),success,'Chance, jet '+roll);
  assert.equal(foe.extensions.v5.corruptionPoints||0,success?0:1,'Corruption, jet '+roll);
  await store.undo();assert.deepEqual(store.listParticipants(),before);
 }
});
test('Don de Tzeentch — le sort choisi doit être un contrat existant ; fin sur Incantation Imparfaite rappelée',async()=>{
 const c=getSpellContract('Don de Tzeentch');
 const {store}=await encounter();
 const bad=store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{boonSpell:'Sort inventé'}}));assert.equal(bad.ready,false);
 const good=store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{boonSpell:'Bonne santé'}}));assert.equal(good.ready,true,good.error);
 assert.match(c.reminders,/Incantation Imparfaite/);assert.match(c.reminders,/grimoire/);
 assert.equal(c.duration,'Bonus d’Intelligence jours');
});
test('Transformation de Tzeentch — À Terre, Endurance +0 en fin de Round : échec = +1 Point de Corruption',async()=>{
 const c=getSpellContract('Transformation de Tzeentch');
 for(const [roll,corruption] of [[95,1],[5,0]]){
  const {store,engine}=await encounter();await cast(store,c,{targetTests:{foe:{roll:95,resistanceRoll:95}}});
  assert.equal(level(subject(store,'foe'),'À Terre'),1);
  const layer=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id);
  await endTurn(engine,{inputs:{foe:{['spell:'+layer.id+':roundTest']:roll}}});await endTurn(engine,{inputs:{foe:{['spell:'+layer.id+':roundTest']:roll}}});
  assert.equal(subject(store,'foe').extensions.v5.corruptionPoints||0,corruption,'jet '+roll);
 }
 assert.match(c.reminders,/sans défense/);
});
test('Trahison de Tzeentch — Animosité (Alliés) et Calme −2 DR sur Critique en attaque (rappel de transfert d’Avantage)',async()=>{
 const c=getSpellContract('Trahison de Tzeentch');
 assert.deepEqual(c.effects.traits,['Animosité (Alliés)']);assert.equal(c.effects.triggered.test.modifierSl,-2);
 assert.match(c.reminders,/transfert d’Avantage/);
});
});

describe('expiration des démons', () => {
const c=getSpellContract('Manifestation de Démon Mineur');
const demons=store=>store.listParticipants().filter(p=>p.extensions?.v5?.summonedBySpellId===c.id);

async function expire(store,engine){
 const layer=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.spellId===c.id);
 const state=JSON.parse(store.getFullJSON());state.combat.round=layer.expiresAtRound;state.combat.currentActorId='mage';
 await store.loadFromJSON(state);await endTurn(engine);
}
async function run(outcome,casterCamp){
 const {store,engine}=await encounter(casterCamp?{mage:{camp:casterCamp}}:{});
 await cast(store,c,{domainFactsExtra:{daemonKind:'bloodletter',commandOutcome:outcome}});
 return {store,engine};
}

test('oppositeCamp : ennemi ↔ non-ennemi',()=>{
 assert.equal(oppositeCamp('pj'),'ennemi');assert.equal(oppositeCamp('allie'),'ennemi');assert.equal(oppositeCamp('ennemi'),'allie');assert.equal(oppositeCamp('Hostile'),'allie');
});

test('D-C32 — expiration : le démon reste, hostile au lanceur, avec le rappel ; Annuler le rétablit',async()=>{
 const {store,engine}=await run('obeys');
 assert.equal(demons(store)[0].camp,'pj','pendant la durée, il sert le lanceur');
 await expire(store,engine);
 assert.ok(!subject(store,'mage').extensions.v5.spellEffects?.some(e=>e.spellId===c.id),'le sort est expiré');
 const [demon]=demons(store);
 assert.ok(demon,'le démon n’est pas retiré');
 assert.equal(demon.camp,'ennemi');
 assert.match(demon.notes,/ordre accompli : retirez le démon/i);
 await store.undo();
 assert.equal(demons(store)[0].camp,'pj');assert.ok(!demons(store)[0].notes);
});

test('D-C32 — lanceur ennemi : le démon devient allié des PJ à l’expiration',async()=>{
 const {store,engine}=await run('obeys','ennemi');
 await expire(store,engine);
 assert.equal(demons(store)[0].camp,'allie');
});

test('Le démon qui l’emporte est dans le camp opposé au lanceur, y compris lanceur ennemi',async()=>{
 assert.equal(demons((await run('attacks')).store)[0].camp,'ennemi');
 assert.equal(demons((await run('attacks','ennemi')).store)[0].camp,'allie');
});
});
