// Protocole neutre de la liaison carte (multi-jeux, lot L1) : CA6 (aucune règle de Warhammer chargée), CA8 (un jeu fournit
// sa projection participant → pion : grille, Zones sans portée, jeu sans PV), CA9 (aucun marqueur inconnu de la carte envoyé).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PROTOCOL = join(ROOT, 'js/core/map-link-protocol.js');
const { createMapLinkProtocol, MARQUEURS_CARTE } = await import('../../../js/core/map-link-protocol.js');

/** Fermeture des imports relatifs (statiques, réexports et `import()` dynamiques) d'un module, chemins relatifs à la racine. */
function importClosure(entry) {
  const seen = new Set(), queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g)]
      .map(match => match[1] ?? match[2] ?? match[3]).filter(spec => spec.startsWith('.'));
    for (const spec of specifiers) {
      const target = resolve(dirname(file), spec);
      assert.ok(existsSync(target), `import introuvable : ${spec} dans ${relative(ROOT, file)}`);
      const key = relative(ROOT, target).replaceAll('\\', '/');
      if (!seen.has(key)) { seen.add(key); queue.push(target); }
    }
  }
  return [...seen].sort();
}

test('CA6 — le protocole ne charge que les constantes partagées de la liaison', () => {
  assert.deepEqual(importClosure(PROTOCOL), ['js/data/donnees-communes.js']);
});

test('CA9 — les 16 marqueurs du contrat §5, liste figée', () => {
  assert.deepEqual([...MARQUEURS_CARTE].sort(), ['ablaze', 'bleeding', 'blinded', 'broken', 'deafened', 'entangled', 'fatigued', 'fear', 'frenzy',
    'poisoned', 'prone', 'stunned', 'surprised', 'tainted', 'terror', 'unconscious']);
  assert.ok(Object.isFrozen(MARQUEURS_CARTE));
});

const map = (type, payload = {}) => ({ v: 1, type, seq: 0, at: 0, from: 'map', payload });

/** Branche une projection d'essai sur le protocole avec un faux canal ; `set` change la scène et relit. */
function linked(projection, initial = []) {
  let scene = initial;
  const sent = [];
  const link = createMapLinkProtocol({ channel: { postMessage: message => sent.push(structuredClone(message)), onmessage: null },
    projection, getParticipants: () => scene, now: () => 0, setTimer: () => 0, clearTimer: () => {} });
  return { link, sent, set: next => { scene = next; link.refresh(); }, of: type => sent.filter(message => message.type === type) };
}

/** Projection minimale d'un jeu d'essai : `cells(participant)` rend les portées, `hp(participant)` les PV ou `null`. */
const trialProjection = ({ cells, hp }) => ({
  refOf: participant => (participant.pj ? `pj:${participant.id}` : `p:${participant.id}`),
  tokenStates(participants) {
    return Object.fromEntries(participants.map(participant => {
      const ref = participant.pj ? `pj:${participant.id}` : `p:${participant.id}`;
      return [ref, { ref, label: participant.name, camp: participant.pj ? 'pj' : 'ennemi', kind: participant.pj ? 'pc' : 'npc', visionSource: Boolean(participant.pj),
        imageUrl: null, formImageUrl: null, color: null, sizeCells: 1, ...cells(participant), visionDim: 1, hp: hp(participant),
        health: 'unharmed', markers: participant.markers ?? [], markerLevels: participant.markerLevels ?? {}, mounted: false, rider: null,
        dead: participant.dead === true, deathCause: null }];
    }));
  }
});

const PROJECTIONS = {
  'grille (portées en cases)': trialProjection({ cells: p => ({ speedCells: p.move, runCells: 2 * p.move }), hp: p => ({ current: p.hp, max: p.maxHp }) }),
  'Zones sans portée calculée': trialProjection({ cells: () => ({ speedCells: null, runCells: null }), hp: p => ({ current: p.hp, max: p.maxHp }) }),
  'sans PV': trialProjection({ cells: p => ({ speedCells: p.move, runCells: 2 * p.move }), hp: () => null })
};

for (const [name, projection] of Object.entries(PROJECTIONS)) {
  test(`CA8 — projection « ${name} » : instantané, ajout, état, retrait, liste des PJ, engagements vides`, () => {
    const hero = { id: 'h1', pj: true, name: 'Héroïne', hp: 12, maxHp: 12, move: 4 };
    const foe = { id: 'f1', name: 'Cultiste', hp: 9, maxHp: 9, move: 4 };
    const t = linked(projection, [hero]);
    assert.equal(t.sent[0].type, 'mj.hello');
    t.link.onMessage(map('map.hello'));
    assert.equal(t.link.status(), 'connected');
    const [snapshot] = t.of('mj.snapshot');
    assert.deepEqual(snapshot.payload.tokens.map(token => token.ref), ['pj:h1']);
    assert.deepEqual(t.of('mj.roster').at(-1).payload, { characters: [{ ref: 'pj:h1', label: 'Héroïne' }] });
    assert.deepEqual(t.of('mj.engagements').map(message => message.payload), [{ pairs: [] }], 'projection sans engagements : liste vide');
    t.set([hero, foe]);
    assert.deepEqual(t.of('token.add').map(message => message.payload.ref), ['p:f1']);
    t.set([hero, { ...foe, hp: 4, markers: ['prone'] }]);
    const [state] = t.of('token.state');
    assert.equal(state.payload.ref, 'p:f1');
    assert.deepEqual(state.payload.markers, ['prone']);
    const wounds = t.of('fx.wound');
    if (projection === PROJECTIONS['sans PV']) {
      assert.equal(state.payload.hp, null, 'aucun PV envoyé');
      assert.deepEqual(wounds, [], 'pas de fx.wound sans PV');
    } else {
      assert.deepEqual(wounds.map(message => message.payload), [{ ref: 'p:f1', hpLost: 5, maxHp: 9, target: 'self' }]);
    }
    if (projection === PROJECTIONS['Zones sans portée calculée']) {
      assert.equal(state.payload.speedCells, null, 'la carte garde la portée saisie');
      assert.equal(state.payload.runCells, null);
    }
    t.set([hero, { ...foe, hp: 0, dead: true }]);
    assert.deepEqual(t.of('fx.death').map(message => message.payload), [{ ref: 'p:f1', cause: 'blood' }]);
    t.set([hero]);
    assert.deepEqual(t.of('token.remove').map(message => message.payload), [{ ref: 'p:f1' }]);
    t.set([]);
    assert.equal(t.of('token.remove').length, 1, 'un PJ n’est jamais retiré (contrat §3)');
    assert.deepEqual(t.of('mj.roster').at(-1).payload, { characters: [] });
    assert.equal(t.of('mj.engagements').length, 1, 'liste inchangée : rien de renvoyé');
    for (const message of t.sent) assert.deepEqual(Object.keys(message), ['v', 'type', 'seq', 'at', 'from', 'payload']);
    assert.deepEqual(t.sent.map(message => message.seq), t.sent.map((_, index) => index + 1));
  });
}

test('CA8 — la projection fournit engagements et signature de forme ; distance et mise en selle passent par son refOf', async () => {
  const base = PROJECTIONS['grille (portées en cases)'];
  const projection = { ...base, engagementPairs: participants => (participants.length > 1 ? [['p:f1', 'pj:h1']] : []), formSignature: p => p.form ?? '' };
  const hero = { id: 'h1', pj: true, name: 'Héroïne', hp: 12, maxHp: 12, move: 4 };
  const foe = { id: 'f1', name: 'Cultiste', hp: 9, maxHp: 9, move: 4 };
  const t = linked(projection, [hero]);
  t.link.onMessage(map('map.hello'));
  t.set([hero, foe]);
  assert.deepEqual(t.of('mj.engagements').at(-1).payload, { pairs: [['p:f1', 'pj:h1']] });
  t.set([hero, { ...foe, hp: 5, form: 'loup' }]);
  assert.deepEqual(t.of('fx.wound'), [], 'changement de forme : pas de blessure');
  t.link.onMessage(map('map.placed', { ref: 'pj:h1' }));
  t.link.onMessage(map('map.placed', { ref: 'p:f1' }));
  assert.equal(t.link.isPlaced(hero), true);
  const distance = t.link.queryDistance(hero, foe);
  assert.deepEqual(t.of('mj.distanceQuery').at(-1).payload, { fromRef: 'pj:h1', toRef: 'p:f1', queryId: 'dq-1' });
  t.link.onMessage(map('map.distance', { queryId: 'dq-1', cells: 2 }));
  assert.deepEqual(await distance, { ok: true, cells: 2 });
  const mount = t.link.requestMount({ rider: hero, mount: foe });
  assert.deepEqual(t.of('mount.request').at(-1).payload, { riderRef: 'pj:h1', mountRef: 'p:f1' });
  t.link.onMessage(map('mount.accepted', { riderRef: 'pj:h1' }));
  assert.deepEqual(await mount, { ok: true });
});

test('CA9 — un marqueur inconnu de la carte n’est jamais envoyé, niveaux et monture compris', () => {
  const base = PROJECTIONS['grille (portées en cases)'];
  const projection = { ...base, tokenStates(participants) {
    const states = base.tokenStates(participants);
    for (const state of Object.values(states)) state.rider = { ref: 'p:m', label: 'Monture', imageUrl: null, hp: null, health: 'unharmed', markers: ['insane', 'stunned'], markerLevels: { insane: 2, stunned: 3 } };
    return states;
  } };
  const foe = { id: 'f1', name: 'Cultiste', hp: 9, maxHp: 9, move: 4, markers: ['dying', 'prone', 'insane'], markerLevels: { dying: 2, prone: 2 } };
  const t = linked(projection, [foe]);
  t.link.onMessage(map('map.hello'));
  t.set([{ ...foe, markers: ['insane', 'fatigued'], markerLevels: { insane: 3, fatigued: 2 } }]);
  t.set([foe, { id: 'f2', name: 'Goule', hp: 13, maxHp: 13, move: 4, markers: ['dying'], markerLevels: { dying: 4 } }]);
  const allowed = new Set(MARQUEURS_CARTE);
  const found = [];
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value.markers)) found.push(...value.markers);
    if (value.markerLevels && typeof value.markerLevels === 'object') found.push(...Object.keys(value.markerLevels));
    Object.values(value).forEach(walk);
  };
  t.sent.forEach(walk);
  assert.ok(found.length > 0);
  assert.deepEqual(found.filter(marker => !allowed.has(marker)), [], 'aucun marqueur hors contrat');
  const [snapshot] = t.of('mj.snapshot');
  assert.deepEqual(snapshot.payload.tokens[0].markers, ['prone']);
  assert.deepEqual(snapshot.payload.tokens[0].markerLevels, { prone: 2 });
  assert.deepEqual(snapshot.payload.tokens[0].rider.markers, ['stunned']);
  assert.deepEqual(snapshot.payload.tokens[0].rider.markerLevels, { stunned: 3 });
  assert.deepEqual(t.of('token.add').map(message => [message.payload.markers, message.payload.markerLevels]), [[[], {}]]);
});
