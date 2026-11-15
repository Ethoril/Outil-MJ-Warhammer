// Registres V5 relus depuis la base temps réel (RTDB), qui retire à l'écriture les tableaux vides, les objets vides et les
// propriétés nulles : registre des usages (`extensions.v5.actionLedger`) et opportunités de réaction
// (`extensions.v5.reactionOpportunities`). Relus d'un second appareil, ou déjà adoptés localement, ils restent lisibles et
// utilisables, sans rien inventer ; les vraies erreurs restent refusées.
import test from 'node:test';
import assert from 'node:assert/strict';
import { previewV5ActionCosts, commitV5ActionCosts } from '../../../js/core/v5-action-costs.js';
import { listV5ReactionOpportunities, validateV5ReactionInput } from '../../../js/core/v5-reactions.js';
import { purgeEncounterJournal } from '../../../js/core/encounter-journal.js';
import { v5StoreActionClock } from '../../../js/core/v5-store-action.js';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { memoryPersistence } from '../sequelles/soins-scenario.helper.js';
import { rtdb } from './rtdb.helper.js';

const clone = structuredClone;
const base = () => ({ revision: 1, participants: [{ id: 'a', hp: 10, caracs: { E: 30 }, states: [], extensions: { v5: { hasMomentum: true, resources: { fortune: 3 } } } }] });
const applied = outcome => { assert.equal(outcome.status, 'applied', JSON.stringify(outcome)); return outcome.state; };
/** Une action confirmée par le vrai moteur des coûts, sur l'état donné. */
function act(state, actionId, { costs = [], quotas = [], clock = {} } = {}) {
  const plan = previewV5ActionCosts({ state, actionId, actorId: 'a', costs, quotas, clock });
  assert.equal(plan.ready, true, JSON.stringify(plan.unresolved));
  return applied(commitV5ActionCosts(plan, state, { resolveAction: draft => ({ status: 'applied', state: draft }) }));
}
const fortune = id => [{ id, resource: 'fortune', amount: 1 }];
const clock = { encounterId: 'enc', round: 1, turnId: 'enc:1:a', sessionId: 'seance' };

/** Les trois formes que le moteur produit et que RTDB dépouille : une liste vide, ou une rencontre nulle. */
function ledgers() {
  // Chance dépensée sans quota : `quotaUsage` vide.
  const sansQuota = act(base(), 'paye', { costs: fortune('f1'), clock }).v5ActionLedger;
  // Action hors rencontre : `encounterId: null` (et `quotaUsage` vide).
  const horsRencontre = act(base(), 'hors-rencontre', { costs: fortune('f1') }).v5ActionLedger;
  // Quota de séance qui survit à la suppression de la rencontre : `appliedActions` vide.
  const seance = act(base(), 'seance', { quotas: [{ id: 'obstine', scope: 'session', maximum: 1 }], clock }).v5ActionLedger;
  const purged = purgeEncounterJournal({ extensions: { v5: { actionLedger: seance } } }, { encounterId: 'enc', sceneIds: [] }).extensions.v5.actionLedger;
  return { 'Chance sans quota': sansQuota, 'hors rencontre': horsRencontre, 'quota de séance après suppression de la rencontre': purged };
}

test('registre des usages : le moteur produit des formes que RTDB dépouille (sinon le test ne prouverait rien)', () => {
  const all = ledgers();
  assert.deepEqual(all['Chance sans quota'].quotaUsage, []);
  assert.equal(all['hors rencontre'].appliedActions[0].encounterId, null);
  assert.deepEqual(all['quota de séance après suppression de la rencontre'].appliedActions, []);
  assert.equal(all['quota de séance après suppression de la rencontre'].quotaUsage.length, 1);
  for (const [name, ledger] of Object.entries(all)) assert.notDeepEqual(rtdb(ledger), ledger, name);
});

test('registre des usages relu de RTDB : aperçu, doublon et nouvelle action comme sur l’original', () => {
  for (const [name, ledger] of Object.entries(ledgers())) {
    const original = { ...base(), v5ActionLedger: ledger }, read = { ...base(), v5ActionLedger: rtdb(ledger) };
    const before = clone(read);
    const request = { actorId: 'a', costs: fortune('f2'), quotas: [{ id: 'q', scope: 'encounter', maximum: 1 }], clock };
    const fromOriginal = previewV5ActionCosts({ state: original, actionId: 'nouvelle', ...request });
    const fromRead = previewV5ActionCosts({ state: read, actionId: 'nouvelle', ...request });
    assert.deepEqual(fromRead.baseLedger, fromOriginal.baseLedger, `${name} : forme canonique restaurée`);
    assert.equal(fromRead.ready, true, name);
    for (const { actionId } of ledger.appliedActions) assert.equal(previewV5ActionCosts({ state: read, actionId, actorId: 'a', clock }).duplicate, true, `${name} : doublon reconnu`);
    const next = act(read, 'nouvelle', request);
    assert.equal(next.v5ActionLedger.appliedActions.length, ledger.appliedActions.length + 1, name);
    assert.ok(next.v5ActionLedger.quotaUsage.some(row => row.quotaId === 'q' && row.used === 1), name);
    assert.deepEqual(read, before, `${name} : la lecture ne réécrit pas le registre relu`);
  }
});

test('registre des usages relu de RTDB : suppression d’une rencontre (purge du journal)', () => {
  for (const [name, ledger] of Object.entries(ledgers())) {
    const scope = { encounterId: 'enc', sceneIds: [] };
    const expected = purgeEncounterJournal({ extensions: { v5: { actionLedger: ledger } } }, scope).extensions.v5.actionLedger;
    const read = purgeEncounterJournal({ extensions: { v5: { actionLedger: rtdb(ledger) } } }, scope).extensions.v5.actionLedger;
    assert.deepEqual(read, expected, name);
  }
});

test('registre des usages : les vraies erreurs restent refusées', () => {
  const ledger = act(base(), 'paye', { costs: fortune('f1'), quotas: [{ id: 'q', scope: 'encounter', maximum: 2 }], clock }).v5ActionLedger;
  const broken = [
    ['actions en chaîne', l => { l.appliedActions = 'aucune'; }, /Registre des usages invalide/],
    ['usages en objet', l => { l.quotaUsage = { a: 1 }; }, /Registre des usages invalide/],
    ['usages nuls (local)', l => { l.quotaUsage = null; }, /Registre des usages invalide/],
    ['champ inconnu', l => { l.extra = []; l.extra.push(1); }, /Champ de coût\/quota non couvert/],
    ['identifiant d’action vide', l => { l.appliedActions[0].actionId = ' '; }, /Action enregistrée requis/],
    ['identifiant d’action absent', l => { delete l.appliedActions[0].actionId; }, /Action enregistrée requis/],
    ['acteur absent', l => { delete l.appliedActions[0].actorId; }, /Acteur enregistré requis/],
    ['rencontre en nombre', l => { l.appliedActions[0].encounterId = 3; }, /Rencontre enregistrée requis/],
    ['action en double', l => { l.appliedActions.push(clone(l.appliedActions[0])); }, /Action enregistrée en double/],
    ['usage en chaîne', l => { l.quotaUsage[0].used = '1'; }, /Usage de quota invalide/],
    ['usage absent', l => { delete l.quotaUsage[0].used; }, /Usage de quota invalide/],
    ['portée inconnue', l => { l.quotaUsage[0].scope = 'jour'; }, /Portée de quota invalide/],
    ['horloge de quota absente', l => { delete l.quotaUsage[0].scopeKey; }, /Horloge de quota requis/],
    ['registre en tableau', () => [], /Champ de coût\/quota non couvert/]
  ];
  for (const [name, change, message] of broken) {
    const value = clone(ledger);
    const changed = change(value) ?? value;
    assert.throws(() => previewV5ActionCosts({ state: { ...base(), v5ActionLedger: changed }, actionId: 'x', actorId: 'a', clock }), message, name);
    if (!name.includes('(local)')) assert.throws(() => previewV5ActionCosts({ state: { ...base(), v5ActionLedger: rtdb(changed) ?? changed }, actionId: 'x', actorId: 'a', clock }), message, `${name} (relu de RTDB)`);
  }
});

// Combat du Store : deux combattants, Assaut furieux pour l'auteur (contrôles Lot 2 de chance-destin-fortune).
const owned = id => ({ id, name: id, rank: 1, status: 'resolved' });
const envelopeOf = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
async function combat({ talents = [owned('talent-furious-assault')], states = [] } = {}) {
  const store = createStore({ persistence: memoryPersistence(), storage: null });
  await store.ready;
  await store.addProfile({ id: 'profil-a', name: 'Auteur', kind: 'PJ', hp: 40, maxHp: 40, initiative: 60, caracs: { CC: 60, E: 30, F: 30, Ag: 40, M: 4 }, size: 3, talents, states, armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { ficheId: 'fiche-a' } });
  await store.addProfile({ id: 'profil-t', name: 'Cible', kind: 'PJ', hp: 40, maxHp: 40, initiative: 30, caracs: { CC: 30, E: 30, F: 30, Ag: 40, M: 4 }, size: 3, talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { ficheId: 'fiche-t' } });
  await store.saveEncounter({ id: 'enc-rtdb', title: 'Relecture', entries: [{ id: 'e-a', profileId: 'profil-a', quantity: 1, zone: 'active' }, { id: 'e-t', profileId: 'profil-t', quantity: 1, zone: 'active' }] });
  await store.launchEncounter('enc-rtdb');
  await createCombatEngine(store).start();
  const [actor, target] = store.listParticipants();
  return { store, actorId: actor.id, targetId: target.id };
}
const attack = (ctx, resolutionId, v5 = {}) => ctx.store.previewResolution({ resolutionId, actorId: ctx.actorId, targetId: ctx.targetId,
  action: { id: 'lame', type: 'attack', attr: 'CC', base: 60, damage: 4 }, roll: 23, defense: { base: 20, roll: 81 }, v5: { kind: 'melee', ...v5 } });
/** Même état local, mais avec le registre tel qu'il a été relu de RTDB (état déjà adopté). */
async function adoptedStripped(ctx, path) {
  const envelope = envelopeOf(ctx.store);
  const holder = path.reduce((node, key) => node[key], envelope);
  const last = path.at(-1);
  envelope.extensions.v5[last] = rtdb(holder);
  await ctx.store.loadFromJSON(envelope);
  assert.deepEqual(envelopeOf(ctx.store).extensions.v5[last], rtdb(holder), 'le Store garde le registre dépouillé tel quel');
}

test('Store : une attaque payée suit un registre des usages déjà adopté sous sa forme RTDB', async () => {
  const ctx = await combat({ talents: [] });
  await ctx.store.setFortune(ctx.actorId, 3);
  assert.equal((await ctx.store.applyResolution(attack(ctx, 'paye', { costs: fortune('f1') }))).status, 'applied');
  assert.deepEqual(envelopeOf(ctx.store).extensions.v5.actionLedger.quotaUsage, []);
  await adoptedStripped(ctx, ['extensions', 'v5', 'actionLedger']);
  const next = attack(ctx, 'suivante', { costs: fortune('f2'), quotas: [{ id: 'q', scope: 'encounter', maximum: 2 }] });
  assert.equal(next.actionCosts.ready, true, JSON.stringify(next.unresolved));
  assert.equal((await ctx.store.applyResolution(next)).status, 'applied');
  assert.equal((await ctx.store.applyResolution(attack(ctx, 'paye', { costs: fortune('f1') }))).status, 'duplicate');
  assert.deepEqual(envelopeOf(ctx.store).extensions.v5.actionLedger.appliedActions.map(row => row.actionId), ['paye', 'suivante']);
});

test('Store : une attaque suit un registre des usages sans actions (quota de séance seul) relu de RTDB', async () => {
  const ctx = await combat({ talents: [] });
  await ctx.store.startTalentSession();
  assert.equal((await ctx.store.applyResolution(attack(ctx, 'seance', { quotas: [{ id: 'q-seance', scope: 'session', maximum: 1 }] }))).status, 'applied');
  await ctx.store.deleteEncounter('enc-rtdb');
  const ledger = envelopeOf(ctx.store).extensions.v5.actionLedger;
  assert.deepEqual(ledger.appliedActions, [], 'la purge de la rencontre garde le quota de séance seul');
  const again = await combat({ talents: [] });
  const envelope = envelopeOf(again.store);
  envelope.extensions.v5.actionLedger = rtdb(ledger);
  await again.store.loadFromJSON(envelope);
  assert.equal((await again.store.applyResolution(attack(again, 'apres-purge'))).status, 'applied');
});

test('Store : fuite d’un Brisé avec un registre des usages relu de RTDB', async () => {
  const ctx = await combat({ talents: [], states: [] });
  await ctx.store.setFortune(ctx.actorId, 3);
  assert.equal((await ctx.store.applyResolution(attack(ctx, 'paye', { costs: fortune('f1') }))).status, 'applied');
  // Tour suivant de l'auteur : son Action est de nouveau libre, le registre garde l'attaque payée sans aucun quota.
  const engine = createCombatEngine(ctx.store);
  await engine.nextTurn(); await engine.nextTurn();
  assert.equal(ctx.store.getCombat().currentActorId, ctx.actorId);
  await ctx.store.acquireConditions(ctx.actorId, [{ key: 'brise', name: 'Brisé', level: 1 }]);
  assert.deepEqual(envelopeOf(ctx.store).extensions.v5.actionLedger.quotaUsage, []);
  await adoptedStripped(ctx, ['extensions', 'v5', 'actionLedger']);
  assert.ok(ctx.store.listParticipants().find(row => row.id === ctx.actorId).states.some(row => row.key === 'brise'));
  const plan = ctx.store.previewBrokenEscape({ actorId: ctx.actorId, action: 'flee', facts: { visibleToAnyEnemy: true, engagedEnemyIds: [], moveMode: 'run', visibleToAnyEnemyAfter: true } });
  assert.equal(plan.ready, true, plan.error);
  const result = await ctx.store.applyBrokenEscape(plan);
  assert.equal(result?.status, 'applied', JSON.stringify(result));
  assert.ok(envelopeOf(ctx.store).extensions.v5.actionLedger.quotaUsage.some(row => row.quotaId === 'system:turn-move' && row.used === 1));
});

test('Store : attestation de visibilité d’un Brisé avec un registre des usages relu de RTDB', async () => {
  const ctx = await combat({ talents: [] });
  await ctx.store.setFortune(ctx.actorId, 3);
  assert.equal((await ctx.store.applyResolution(attack(ctx, 'paye', { costs: fortune('f1') }))).status, 'applied');
  await ctx.store.acquireConditions(ctx.actorId, [{ key: 'brise', name: 'Brisé', level: 1 }]);
  // L'attaque payée a dépensé l'Action du Tour : l'attestation est refusée (sans rien écrire), relue ou non.
  const expected = await ctx.store.confirmBrokenEscapeVisibility({ actorId: ctx.actorId, visibleToAnyEnemy: false });
  assert.equal(expected.code, 'DIV-BROKEN-MIDTURN-01');
  await adoptedStripped(ctx, ['extensions', 'v5', 'actionLedger']);
  const read = await ctx.store.confirmBrokenEscapeVisibility({ actorId: ctx.actorId, visibleToAnyEnemy: false });
  assert.deepEqual([read?.ready, read?.status, read?.code], [expected?.ready, expected?.status, expected?.code], JSON.stringify(read));
});

test('opportunités de réaction : le moteur en ouvre une que RTDB dépouille (exemptions vides, arme figée)', async () => {
  const ctx = await combat();
  assert.equal((await ctx.store.applyResolution(attack(ctx, 'source'))).status, 'applied');
  const [row] = envelopeOf(ctx.store).extensions.v5.reactionOpportunities;
  assert.deepEqual(row.exemptions, []);
  assert.deepEqual([row.action.qualities, row.action.valuesX, row.action.capacity, row.action.extensions], [[], null, null, {}]);
  const stripped = rtdb(row);
  for (const key of ['exemptions']) assert.equal(Object.hasOwn(stripped, key), false);
  for (const key of ['qualities', 'valuesX', 'capacity', 'extensions']) assert.equal(Object.hasOwn(stripped.action, key), false);
});

test('opportunités de réaction relues de RTDB : liste, entrée validée et réaction appliquée comme sur l’original', async () => {
  const ctx = await combat();
  assert.equal((await ctx.store.applyResolution(attack(ctx, 'source'))).status, 'applied');
  const original = envelopeOf(ctx.store), read = rtdb(original), before = clone(read);
  const live = v5StoreActionClock(original);
  const offers = listV5ReactionOpportunities(original, ctx.actorId, { clock: live });
  assert.equal(offers.length, 1);
  assert.deepEqual(listV5ReactionOpportunities(read, ctx.actorId, { clock: live }), offers, 'forme canonique restaurée');
  // Variantes de la même offre : sans coûts, sans quotas, avec exemption (seul l'Assaut furieux ouvre une réaction aujourd'hui).
  const variants = { 'sans coûts': row => ({ ...row, costs: [], exemptions: [] }), 'sans quotas': row => ({ ...row, quotas: [] }),
    'avec exemption': row => ({ ...row, exemptions: [{ costId: row.costs[0].id, sourceId: 'source-exemption' }] }) };
  for (const [name, change] of Object.entries({ telle: row => row, ...variants })) {
    const offer = change(offers[0]);
    const envelope = { ...original, extensions: { ...original.extensions, v5: { ...original.extensions.v5, reactionOpportunities: [offer] } } };
    const input = { actorId: ctx.actorId, targetId: ctx.targetId, action: clone(offer.action), roll: 61, v5: { kind: 'melee', reactionId: offer.id, costs: [], quotas: [] } };
    const expected = validateV5ReactionInput(envelope, input, { clock: live });
    assert.equal(expected.ready, true, `${name} : ${expected.reason}`);
    const fromRead = validateV5ReactionInput(rtdb(envelope), { ...input, action: clone(rtdb(offer).action) }, { clock: live });
    assert.equal(fromRead.ready, true, `${name} : ${fromRead.reason}`);
    assert.deepEqual([fromRead.opportunity, fromRead.input.v5], [expected.opportunity, expected.input.v5], name);
  }
  assert.deepEqual(read, before, 'la lecture ne réécrit pas les opportunités relues');
  // Dans le Store, déjà adoptées sous leur forme RTDB, la réaction se joue.
  await adoptedStripped(ctx, ['extensions', 'v5', 'reactionOpportunities']);
  const [offer] = ctx.store.getReactionOpportunities(ctx.actorId);
  assert.ok(offer, 'offre toujours proposée');
  const reaction = ctx.store.previewResolution({ resolutionId: 'reaction', actorId: ctx.actorId, targetId: ctx.targetId, action: clone(offer.action), roll: 61, defense: { base: 20, roll: 81 },
    v5: { kind: 'melee', reactionId: offer.id, costs: [], quotas: [] } });
  assert.deepEqual(reaction.unresolved, []);
  assert.equal((await ctx.store.applyResolution(reaction)).status, 'applied');
  assert.equal(ctx.store.getReactionOpportunities(ctx.actorId).length, 0);
});

test('opportunités de réaction : les vraies erreurs restent refusées', async () => {
  const ctx = await combat();
  assert.equal((await ctx.store.applyResolution(attack(ctx, 'source'))).status, 'applied');
  const original = envelopeOf(ctx.store), live = v5StoreActionClock(original);
  const broken = [
    ['registre en objet', v5 => { v5.reactionOpportunities = { a: 1 }; }, /Registre des réactions invalide/],
    ['coûts en chaîne', v5 => { v5.reactionOpportunities[0].costs = 'aucun'; }, /Opportunité de réaction invalide/],
    ['quotas en objet', v5 => { v5.reactionOpportunities[0].quotas = { a: 1 }; }, /Opportunité de réaction invalide/],
    ['exemptions nulles (local)', v5 => { v5.reactionOpportunities[0].exemptions = null; }, /Opportunité de réaction invalide/],
    ['identifiant vide', v5 => { v5.reactionOpportunities[0].id = ' '; }, /Opportunité de réaction invalide/],
    ['identifiant absent', v5 => { delete v5.reactionOpportunities[0].id; }, /Opportunité de réaction invalide/],
    ['identifiant en nombre', v5 => { v5.reactionOpportunities[0].id = 7; }, /Opportunité de réaction invalide/],
    ['auteur absent', v5 => { delete v5.reactionOpportunities[0].actorId; }, /Opportunité de réaction invalide/],
    ['source absente', v5 => { delete v5.reactionOpportunities[0].sourceResolutionId; }, /Opportunité de réaction invalide/],
    ['Round absent', v5 => { delete v5.reactionOpportunities[0].round; }, /Opportunité de réaction invalide/],
    ['arme absente', v5 => { delete v5.reactionOpportunities[0].action; }, /Opportunité de réaction invalide/],
    ['arme en chaîne', v5 => { v5.reactionOpportunities[0].action = 'lame'; }, /Opportunité de réaction invalide/],
    ['en double', v5 => { v5.reactionOpportunities.push(clone(v5.reactionOpportunities[0])); }, /Opportunité de réaction invalide/]
  ];
  for (const [name, change, message] of broken) {
    const envelope = clone(original);
    change(envelope.extensions.v5);
    assert.throws(() => listV5ReactionOpportunities(envelope, ctx.actorId, { clock: live }), message, name);
    if (!name.includes('(local)')) assert.throws(() => listV5ReactionOpportunities(rtdb(envelope), ctx.actorId, { clock: live }), message, `${name} (relu de RTDB)`);
  }
  // Une arme présente mais différente n'est jamais remplacée par la restauration.
  const changed = clone(original); changed.extensions.v5.reactionOpportunities[0].action.qualities = ['assommante'];
  const [offer] = listV5ReactionOpportunities(original, ctx.actorId, { clock: live });
  const input = { actorId: ctx.actorId, targetId: ctx.targetId, action: clone(offer.action), roll: 61, v5: { kind: 'melee', reactionId: offer.id } };
  assert.equal(validateV5ReactionInput(rtdb(changed), input, { clock: live }).ready, false);
});
