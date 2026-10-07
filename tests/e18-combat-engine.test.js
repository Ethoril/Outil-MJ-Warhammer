import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { CARAC_KEYS, Profile, Participant, normalizeCaracs } from '../js/core/models.js';
import { sanitizeParticipant, sanitizeProfile } from '../js/core/sanitize.js';
import { migrateSnapshot } from '../js/core/migrations.js';
import { parseProfileText } from '../js/core/text-profile-import.js';
import { inferActionType, previewResolution, applyResolution, ResolutionError } from '../js/core/resolution.js';
import { computeDamage, damageBreakdown, formatDamageFormula } from '../js/core/damage.js';
import { deriveReminders } from '../js/core/reminders.js';

function memoryPersistence(initial = null) {
  let state = initial && structuredClone(initial);
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; },
    peek() { return state && structuredClone(state); }
  };
}

// --- 1. Caractéristiques canoniques -------------------------------------------------

test('E18 caracs — alias convertis, canonique prioritaire, nombres finis, idempotent', () => {
  assert.deepEqual(CARAC_KEYS, ['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc']);
  const raw = { cc: 45, ct: '30', f: 35, e: 38, i: 40, agi: 33, dex: 25, int: 20, fm: 28, soc: 15, m: 4, a: 1, b: 12, bf: 3 };
  assert.deepEqual(normalizeCaracs(raw), { CC: 45, CT: 30, F: 35, E: 38, I: 40, Ag: 33, Dex: 25, Int: 20, FM: 28, Soc: 15, M: 4, A: 1, B: 12, BF: 3 });
  assert.deepEqual(normalizeCaracs({ ag: 31 }), { Ag: 31 });
  assert.deepEqual(normalizeCaracs({ e: 20, E: 38 }), { E: 38 }, 'la clé canonique gagne quel que soit l’ordre');
  assert.deepEqual(normalizeCaracs({ E: 38, e: 20 }), { E: 38 });
  assert.deepEqual(normalizeCaracs({ E: NaN, CC: 'x', F: null, CT: '', Ag: Infinity, I: 30 }), { I: 30 });
  const once = normalizeCaracs(raw);
  assert.deepEqual(normalizeCaracs(once), once);
  assert.deepEqual(normalizeCaracs(null), {});
});

test('E18 caracs — import texte en clés canoniques, I et Ag reconnus, messages en caracs.E', () => {
  const result = parseProfileText('Nom: Orc\nPV: 12\nE: 38\nCC: 45\nI: 30\nAg: 25\nAgi: 25');
  assert.deepEqual(result.profiles[0].caracs, { E: 38, CC: 45, I: 30, Ag: 25 });
  assert.equal(result.errors.length, 0);
  const ambiguous = parseProfileText('Nom: Orc\nPV: 12\ne: 38\nE: 40\nCC: x');
  assert.equal(ambiguous.ambiguities[0].field, 'caracs.E');
  assert.equal(ambiguous.errors[0].field, 'caracs.CC');
});

test('E18 caracs — sanitize, constructeurs et migration normalisent', () => {
  assert.deepEqual(sanitizeProfile({ id: 'p', caracs: { e: 38, cc: 45 } }).caracs, { E: 38, CC: 45 });
  assert.deepEqual(sanitizeParticipant({ id: 'c', caracs: { e: 38 } }).caracs, { E: 38 });
  assert.deepEqual(new Profile({ caracs: { agi: 30 } }).caracs, { Ag: 30 });
  assert.deepEqual(new Participant({ caracs: { fm: 30 } }).caracs, { FM: 30 });
  const migrated = migrateSnapshot({ reserve: [{ id: 'p', caracs: { e: 38, cc: 45 } }], combat: { participants: [{ id: 'c', caracs: { e: 38, cc: 45 } }] } }).data;
  assert.deepEqual(migrated.reserve[0].caracs, { E: 38, CC: 45 });
  assert.deepEqual(migrated.combat.participants[0].caracs, { E: 38, CC: 45 });
});

test('E18 caracs — instantané minuscule rechargé en canonique partout, puis sauvegardé ainsi', async () => {
  const lower = () => ({ e: 38, cc: 45 });
  const participant = { id: 'c', name: 'Orc', hp: 10, zone: 'active', caracs: lower() };
  const persistence = memoryPersistence({
    schemaVersion: 2,
    reserve: [{ id: 'p', name: 'Orc', hp: 10, caracs: lower() }],
    combat: { round: 1, currentActorId: 'c', order: ['c'], participants: [participant] },
    log: [], diceLines: [],
    activeScene: { id: 's', status: 'active', round: 1, currentActorId: 'c', order: ['c'], participants: [structuredClone(participant)] },
    suspendedScenes: [{ id: 's2', status: 'suspended', participants: [{ ...structuredClone(participant), id: 'c2' }] }],
    persistentCharacters: [{ id: 'pc', name: 'Orc', hp: 10, caracs: lower() }]
  });
  const store = createStore({ persistence });
  await store.ready;
  const canonical = { E: 38, CC: 45 };
  assert.deepEqual(store.getProfile('p').caracs, canonical);
  assert.deepEqual(store.getCombat().participants.get('c').caracs, canonical);
  assert.deepEqual(store.getActiveScene().participants[0].caracs, canonical);
  assert.deepEqual(store.listSuspendedScenes()[0].participants[0].caracs, canonical);
  assert.deepEqual(store.listPersistentCharacters()[0].caracs, canonical);
  await store.addProfile({ id: 'other', name: 'Autre', hp: 5 });
  const saved = persistence.peek();
  assert.deepEqual(saved.reserve.find(item => item.id === 'p').caracs, canonical);
  assert.deepEqual(saved.combat.participants[0].caracs, canonical);
  assert.deepEqual(saved.activeScene.participants[0].caracs, canonical);
  assert.deepEqual(saved.suspendedScenes[0].participants[0].caracs, canonical);
  // Conséquence visible : la BE de la cible n’est plus nulle.
  const preview = store.previewResolution({ actor: { id: 'x', states: [] }, targetId: 'c', action: { type: 'attack', base: 60, damage: 8 }, roll: 42 });
  assert.equal(preview.damage.be, 3);
});

test('E18 caracs — importParsedProfiles enregistre des clés canoniques', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.importParsedProfiles([{ name: 'Orc', hp: 10, caracs: { e: 35 } }]);
  assert.deepEqual(store.listProfiles()[0].caracs, { E: 35 });
});

// --- 2. Banc visible et ajout depuis la bibliothèque -------------------------------

async function launchedStore() {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'guard', name: 'Garde', hp: 12, initiative: 30 });
  await store.addProfile({ id: 'wolf', name: 'Loup', hp: 8, initiative: 45 });
  await store.addProfile({ id: 'rat', name: 'Rat', hp: 3, initiative: 50 });
  await store.saveEncounter({ id: 'enc', title: 'Cour', entries: [
    { id: 'e1', profileId: 'guard', zone: 'active' },
    { id: 'e2', profileId: 'wolf', zone: 'bench', quantity: 2 },
    { id: 'e3', profileId: 'rat', zone: 'bench' }
  ] });
  await store.launchEncounter('enc');
  return store;
}

test('E18 banc — les participants hors ordre sont listés après l’ordre, par initiative puis nom', async () => {
  const store = await launchedStore();
  const names = store.listParticipants().map(item => item.name);
  assert.deepEqual(names, ['Garde', 'Rat', 'Loup 1', 'Loup 2']);
  assert.deepEqual(store.getEffectiveOrder().map(id => store.getCombat().participants.get(id).name), ['Garde'], 'le banc ne joue pas');
});

test('E18 banc — moveParticipant(active) insère par initiative et garde la scène cohérente', async () => {
  const store = await launchedStore();
  const wolf = store.listParticipants().find(item => item.name === 'Loup 1');
  await store.moveParticipant(wolf.id, 'active');
  const combat = store.getCombat();
  assert.equal(combat.participants.get(wolf.id).zone, 'active');
  const activeInOrder = combat.order.filter(id => combat.participants.get(id).zone === 'active');
  assert.deepEqual(activeInOrder.map(id => combat.participants.get(id).name), ['Loup 1', 'Garde']);
  assert.deepEqual(store.getEffectiveOrder().map(id => combat.participants.get(id).name), ['Loup 1', 'Garde']);
  const scene = store.getActiveScene();
  assert.deepEqual(scene.order, combat.order);
  assert.equal(scene.participants.find(item => item.id === wolf.id).zone, 'active');
  assert.equal(store.listParticipants().length, 4);
});

test('E18 bibliothèque — addProfilesToCombat avec scène active, noms suffixés, annulable et journalisé', async () => {
  const store = await launchedStore();
  const before = store.listParticipants().length;
  const result = await store.addProfilesToCombat(['guard', 'guard']);
  assert.equal(result.ok, true);
  const added = store.listParticipants().slice(before);
  assert.deepEqual(added.map(item => item.name).sort(), ['Garde 2', 'Garde 3']);
  assert.ok(added.every(item => item.zone === 'bench' && item.profileId === 'guard'));
  assert.ok(added.every(item => !store.getCombat().order.includes(item.id)), 'le banc reste hors de l’ordre');
  const scene = store.getActiveScene();
  assert.ok(added.every(item => scene.participants.some(part => part.id === item.id)), 'ajout visible dans la scène');
  assert.match(store.getLog()[0].text, /Garde 2, Garde 3/);
  await store.undo();
  assert.equal(store.listParticipants().length, before);
  assert.equal(store.getActiveScene().participants.length, before);
});

test('E18 bibliothèque — addProfilesToCombat en zone active entre dans l’ordre par initiative', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'slow', name: 'Lent', hp: 5, initiative: 10, diceLines: [{ base: 40, note: 'Hache', damage: 7 }] });
  await store.addProfile({ id: 'fast', name: 'Vif', hp: 5, initiative: 60 });
  await store.addProfilesToCombat(['slow'], { zone: 'active' });
  await store.addProfilesToCombat(['fast'], { zone: 'active' });
  assert.deepEqual(store.listParticipants().map(item => item.name), ['Vif', 'Lent']);
  const slow = store.listParticipants()[1];
  assert.equal(store.getDiceLines().filter(line => line.participantId === slow.id).length, 1);
  assert.throws(() => store.addProfilesToCombat(['missing']), /Aucun profil/);
});

test('E18 bibliothèque — addProfilesToCombat ignore un profil supprimé avant l’exécution de la commande', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'gone', name: 'Disparu', hp: 5, initiative: 10 });
  await store.addProfile({ id: 'kept', name: 'Restant', hp: 5, initiative: 20 });
  // La suppression est en file avant l'ajout : le contrôle préalable passe encore.
  const removal = store.removeProfile('gone');
  const adding = store.addProfilesToCombat(['gone', 'kept']);
  await removal;
  await adding;
  assert.deepEqual(store.listParticipants().map(item => item.name), ['Restant']);
  const lonely = store.removeProfile('kept');
  const rejected = store.addProfilesToCombat(['kept']);
  await lonely;
  await assert.rejects(rejected, /Aucun profil/);
  assert.deepEqual(store.listParticipants().map(item => item.name), ['Restant']);
});

// --- 3. Test opposé -----------------------------------------------------------------

const attacker = { id: 'a', name: 'Attaquant', states: [] };
const defender = { id: 't', name: 'Cible', hp: 10, caracs: { E: 30 }, armor: { head: 0, body: 1, arms: 0, legs: 2 }, states: [] };

test('E18 opposé — sans défense, hit === success et rien d’autre ne change', () => {
  const input = { actor: attacker, target: defender, action: { type: 'attack', base: 50, damage: 4 }, roll: 34 };
  const result = previewResolution(input);
  assert.equal(result.hit, result.success);
  assert.equal(result.opposition, null);
  assert.equal('defense' in result.input, false);
  assert.equal(result.location.name, 'Bras Droit', '34 inversé = 43');
  assert.equal(result.location.side, 'right');
  assert.equal(previewResolution({ ...input, action: { ...input.action, base: 60 }, roll: 57 }).location.side, null, '75 = Corps');
});

test('E18 opposé — DR net, dégâts avec DR net, localisation latéralisée', () => {
  // Attaquant 50, jet 21 → DR 3. Défenseur 40, jet 35 → DR 1. Net 2.
  const result = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 50, damage: 4 }, roll: 21, defense: { roll: 35, base: 40 } });
  assert.equal(result.hit, true);
  assert.deepEqual(result.opposition, {
    mode: 'opposed',
    attacker: { score: 50, roll: 21, success: true, sl: 3 },
    defender: { label: 'CC', base: 40, mod: 0, statePenalty: 0, score: 40, roll: 35, success: true, sl: 1 },
    netSl: 2, winner: 'attacker'
  });
  assert.equal(result.location.roll, 12);
  assert.equal(result.location.name, 'Bras Gauche');
  assert.equal(result.location.side, 'left');
  assert.equal(result.damage.sl, 2);
  assert.equal(result.damage.finalDamage, 4 + 2 - 3 - 0);
});

test('E18 opposé — défense gagnante : pas de touche, ni localisation ni dégâts ni critique', () => {
  const result = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 50, damage: 4 }, roll: 44, defense: { roll: 11, base: 60, label: 'Esquive' } });
  assert.equal(result.success, true);
  assert.equal(result.critical, null, 'double réussi mais pas de touche');
  assert.equal(result.hit, false);
  assert.equal(result.opposition.winner, 'defender');
  assert.equal(result.opposition.defender.label, 'Esquive');
  assert.equal(result.location, null);
  assert.equal(result.damage, null);
  const applied = applyResolution(result, { revision: 0, participants: [defender], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants[0].hp, 10);
});

test('E18 opposé — l’attaquant peut toucher en ratant si la défense rate davantage', () => {
  // Attaquant 30, jet 45 → DR −1 (échec). Défenseur 30 − 10 (Sonné), jet 80 → DR −6.
  const result = previewResolution({ actor: attacker, target: { ...defender, states: ['Sonné'] }, action: { type: 'attack', base: 30, damage: 4 }, roll: 45, defense: { roll: '80', base: 30 } });
  assert.equal(result.success, false);
  assert.equal(result.hit, true);
  assert.equal(result.opposition.defender.statePenalty, 10);
  assert.equal(result.opposition.defender.score, 20);
  assert.equal(result.opposition.netSl, 5);
  assert.equal(result.location.roll, 54);
  assert.equal(result.damage.sl, 5);
  assert.equal(result.critical, null);
});

test('E18 opposé — égalité de DR : le plus haut score gagne, égalité parfaite = pas de touche', () => {
  const higher = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 55, damage: 4 }, roll: 30, defense: { roll: 20, base: 45 } });
  assert.equal(higher.opposition.netSl, 0);
  assert.equal(higher.opposition.winner, 'attacker');
  assert.equal(higher.hit, true);
  assert.equal(higher.damage.sl, 0);
  const lower = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 45, damage: 4 }, roll: 20, defense: { roll: 30, base: 55 } });
  assert.equal(lower.opposition.winner, 'defender');
  const tie = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 50, damage: 4 }, roll: 30, defense: { roll: 30, base: 50 } });
  assert.equal(tie.opposition.winner, 'tie');
  assert.equal(tie.hit, false);
  assert.equal(tie.damage, null);
});

test('E18 opposé — jet de défense validé comme le jet d’attaque, 00 = 100', () => {
  assert.throws(() => previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 50 }, roll: 30, defense: { roll: 0, base: 40 } }), ResolutionError);
  const result = previewResolution({ actor: attacker, target: defender, action: { type: 'attack', base: 50 }, roll: 30, defense: { roll: '00', base: 40 } });
  assert.equal(result.opposition.defender.roll, 100);
});

test('E18 opposé — le Store transmet la défense et journalise le DR net', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addParticipant({ id: 'actor', name: 'Attaquant', hp: 10, zone: 'active' });
  await store.addParticipant({ id: 'target', name: 'Cible', hp: 10, armor: { arms: 0 }, caracs: { E: 30 }, zone: 'active' });
  const preview = store.previewResolution({ actorId: 'actor', targetId: 'target', action: { type: 'attack', base: 50, damage: 4 }, roll: 21, defense: { roll: 35, base: 40, label: 'Esquive' } });
  assert.equal(preview.opposition.netSl, 2);
  const result = await store.applyResolution(preview);
  assert.equal(result.status, 'applied');
  assert.equal(store.getCombat().participants.get('target').hp, 7);
  const entry = store.getLog()[0];
  assert.match(entry.text, /défense Esquive/);
  assert.match(entry.text, /DR net 2/);
  assert.equal(entry.detail.opposition.netSl, 2);
  assert.equal(entry.detail.hit, true);
});

test('E18 inferActionType — type explicite, sinon dégâts, sinon compétence', () => {
  assert.equal(inferActionType({ type: 'defense', damage: 5 }), 'defense');
  assert.equal(inferActionType({ type: 'attaque' }), 'attack');
  assert.equal(inferActionType({ type: 'opposed' }), 'opposition');
  assert.equal(inferActionType({ type: 'skill', damage: 4 }), 'skill');
  assert.equal(inferActionType({ damage: 4 }), 'attack');
  assert.equal(inferActionType({ damage: '1d10' }), 'attack');
  assert.equal(inferActionType({ damage: '' }), 'skill');
  assert.equal(inferActionType({ damage: 0 }), 'skill', 'normalizeAction stocke 0 pour une action sans dégâts');
  assert.equal(inferActionType({ type: 'test' }), 'skill');
  assert.equal(inferActionType(null), 'skill');
});

test('E18 damageBreakdown — termes lisibles et formule', () => {
  const damage = computeDamage({ weaponDamage: 8, sl: 4, roll: 43, targetToughnessBonus: 3, targetArmour: 0, qualities: ['Percutante'] });
  assert.deepEqual(damageBreakdown(damage), {
    terms: [
      { sign: '+', value: 8, label: 'arme' },
      { sign: '+', value: 4, label: 'DR' },
      { sign: '+', value: 3, label: 'Percutante' },
      { sign: '−', value: 3, label: 'BE' },
      { sign: '−', value: 0, label: 'PA' }
    ],
    total: 12,
    notes: []
  });
  assert.equal(formatDamageFormula(damage), '8 arme + 4 DR + 3 Percutante − 3 BE − 0 PA = 12');
});

test('E18 damageBreakdown — Pointue, Dévastatrice, Inoffensive et plancher', () => {
  const pointue = damageBreakdown(computeDamage({ weaponDamage: 4, sl: 0, roll: 41, targetToughnessBonus: 3, targetArmour: 2, qualities: ['Pointue', 'Dévastatrice'] }));
  assert.equal(pointue.terms[0].value, 4, 'Pointue ne touche pas l’arme');
  assert.equal(pointue.terms[1].label, 'DR (Dévastatrice)');
  assert.equal(pointue.total, 1);
  assert.ok(pointue.notes.some(note => /Dévastatrice/.test(note)));
  const floored = computeDamage({ weaponDamage: 2, sl: 0, targetToughnessBonus: 3, targetArmour: 2 });
  assert.ok(damageBreakdown(floored).notes.includes('minimum 1'));
  assert.equal(formatDamageFormula(floored), '2 arme + 0 DR − 3 BE − 2 PA = 1 (minimum 1)');
  const harmless = computeDamage({ weaponDamage: 2, sl: 0, targetToughnessBonus: 3, targetArmour: 2, qualities: ['Inoffensive'] });
  const breakdown = damageBreakdown(harmless);
  assert.equal(breakdown.total, 0);
  assert.deepEqual(breakdown.terms.at(-1), { sign: '−', value: 4, label: 'PA (×2)' });
  assert.ok(!breakdown.notes.includes('minimum 1'));
  assert.equal(formatDamageFormula(harmless), '2 arme + 0 DR − 3 BE − 4 PA (×2) = 0 (pas de minimum)');
});

// --- 4. Rappels lisibles ------------------------------------------------------------

test('E18 rappels — libellé de tour lisible, identifiant inchangé', () => {
  const snapshot = { sceneId: 's', participants: [{ id: 'p1', name: 'Saskia' }] };
  const end = deriveReminders(snapshot, { id: 't1', type: 'endTurn', actorId: 'p1' })[0];
  assert.equal(end.text, 'Fin du tour de Saskia');
  assert.equal(end.id, 's:t1:endTurn:p1');
  assert.equal(deriveReminders({ sceneId: 's' }, { id: 't2', type: 'startTurn', actorId: 'p1', actorName: 'Renaut' })[0].text, 'Début du tour de Renaut');
  assert.equal(deriveReminders({ sceneId: 's' }, { id: 't3', type: 'startTurn' })[0].text, 'Début du tour');
  assert.equal(deriveReminders({ sceneId: 's' }, { id: 't4', type: 'endTurn', text: 'Explicite' })[0].text, 'Explicite');
});

test('E18 rappels — Store.getReminders nomme le participant', async () => {
  const store = await launchedStore();
  const guard = store.listParticipants()[0];
  const reminders = store.getReminders({ id: 'turn-1', type: 'endTurn', actorId: guard.id });
  const turn = reminders.find(item => item.kind === 'endTurn');
  assert.equal(turn.text, 'Fin du tour de Garde');
  assert.equal(turn.id, `${store.getActiveScene().id}:turn-1:endTurn:${guard.id}`);
});
