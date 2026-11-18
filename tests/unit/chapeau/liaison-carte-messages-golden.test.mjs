// Test d'or de la liaison carte (multi-jeux, lot L1, CA7) : pour Warhammer, la suite des messages envoyés à RPG Map Display
// est identique, message par message, avant et après la découpe du protocole. Écrit et rendu vert sur le code d'avant la
// découpe (3.53.1). S'il échoue après une modification, c'est le code qu'il faut corriger, jamais la fixture.
// Régénérer la fixture (seulement sur décision explicite) : LIAISON_GOLDEN_ECRIRE=1 node --test <ce fichier>.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createMapLink } from '../../../js/core/map-link.js';
import { offScenePjParticipants, mapMaxHpOf } from '../../../js/core/map-link-state.js';
import { BEAST_PROFILES, applyBeastForm, revertBeastForm } from '../../../js/core/v5-magic-arbitrations.js';

const FIXTURE = fileURLToPath(new URL('../../fixtures/liaison-carte-messages-golden.json', import.meta.url));

const profiles = {
  'prof-r': { id: 'prof-r', name: 'Renaut (profil)', kind: 'PJ', tokenColor: '#AA3322', maxHp: 12, movement: 4, caracs: { M: 4 } },
  'prof-e': { id: 'prof-e', name: 'Elsa (profil)', kind: 'PJ', tokenColor: '#2255cc', maxHp: 11, movement: 4, caracs: { M: 4, E: 35 } }
};

const renaut = {
  id: 'r', kind: 'PJ', persistentCharacterId: 'c1', profileId: 'prof-r', name: 'Renaut', camp: 'pj', zone: 'active', hp: 12, maxHp: 12,
  init: 50, fortune: 2, movement: 4,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { ownMountId: 'h', channelling: { type: 'winds', sl: 20 } } }
};
const orc = {
  id: 'o', kind: 'PNJ', name: 'Orc', camp: 'ennemi', zone: 'active', hp: 10, maxHp: 10, movement: 4,
  states: [{ name: 'Sonné', level: 2 }, { name: 'Bénédiction de Sigmar', level: 1 }], extensions: { v5: {} }
};
const destrier = {
  id: 'h', kind: 'Créature', name: 'Destrier', camp: 'pj', zone: 'active', hp: 20, maxHp: 22, size: 'Grande', movement: 8,
  states: [], extensions: { v5: { mountOf: 'r' } }
};
const sauteur = {
  id: 'g', kind: 'Créature', name: 'Gnoblar sauteur', camp: 'ennemi', zone: 'active', hp: 6, maxHp: 6, movement: 3,
  traits: ['Bounce'], states: [{ name: 'À terre' }], extensions: { v5: {} }
};
const persistantRenaut = { id: 'c1', profileId: 'prof-r', name: 'Renaut', hp: 12, maxHp: 12, states: [] };
const persistantElsa = { id: 'c2', profileId: 'prof-e', name: 'Elsa', hp: 8, maxHp: 11, states: [{ name: 'Exténué', level: 2 }] };

const map = (type, payload = {}) => ({ v: 1, type, seq: 0, at: 0, from: 'map', payload });
const withV5 = (participant, patch) => ({ ...participant, extensions: { ...participant.extensions, v5: { ...participant.extensions.v5, ...patch } } });

/** Joue le scénario Warhammer et rend tout ce que la liaison a produit (messages sans `at`, statuts, vues, réponses). */
async function playScenario() {
  let scene = [];
  const characters = [];
  let clock = 1_000;
  const messages = [], statuses = [], placements = [], adjacency = [], ran = [], answers = [];
  const timers = [];
  const channel = { postMessage(message) { const { at, ...rest } = message; assert.equal(typeof at, 'number'); messages.push(structuredClone(rest)); }, onmessage: null };
  const link = createMapLink({
    channel,
    getParticipants: () => [...scene, ...offScenePjParticipants(characters, scene, id => profiles[id] ?? null)],
    maxHpOf: participant => mapMaxHpOf(participant, profiles[participant.profileId]),
    imageUrlOf: participant => (participant.id === 'h' ? 'maps/tokens/destrier.webp' : participant.kind === 'PNJ' ? 'maps/tokens/orc.webp' : null),
    formImageUrlOf: participant => (participant.extensions?.v5?.beastForm ? 'maps/tokens/loup.webp' : null),
    colorOf: participant => profiles[participant.profileId]?.tokenColor ?? null,
    now: () => clock,
    onStatus: status => statuses.push(status),
    onRan: ref => ran.push(ref),
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length - 1; },
    clearTimer: () => {}
  });
  link.on('placement', view => placements.push(structuredClone(view)));
  link.on('adjacency', pairs => adjacency.push(structuredClone(pairs)));
  const set = next => { scene = next; link.refresh(); };
  const from = (type, payload) => { clock += 100; link.onMessage(map(type, payload)); };

  // Instantané après map.hello (scène vide).
  from('map.hello');
  // Ajout d'un PJ persistant, d'un PNJ, d'une monture.
  characters.push(persistantRenaut);
  set([renaut]);
  set([renaut, orc]);
  set([renaut, orc, destrier]);
  from('map.placed', { ref: 'pj:c1', levelId: 'L1' });
  from('map.placed', { ref: 'p:o', levelId: 'L1' });
  from('map.placed', { ref: 'p:h', levelId: 'L1' });
  // Blessure.
  set([renaut, { ...orc, hp: 6 }, destrier]);
  // Mise en selle : mount.request, accepté, puis pion monté.
  const mountAnswer = link.requestMount({ rider: renaut, mount: destrier });
  from('mount.accepted', { riderRef: 'pj:c1', mountRef: 'p:h' });
  answers.push(['requestMount', await mountAnswer]);
  const monte = withV5(renaut, { mounted: true, mountId: 'h' });
  set([monte, { ...orc, hp: 6 }, destrier]);
  // Démontage.
  set([withV5(renaut, { mounted: false }), { ...orc, hp: 6 }, destrier]);
  // Seconde demande refusée (pas adjacents).
  const refused = link.requestMount({ rider: renaut, mount: destrier });
  from('mount.refused', { riderRef: 'pj:c1', reason: 'not-adjacent' });
  answers.push(['requestMount', await refused]);
  // Forme bestiale : prise, blessure sous la forme, retour.
  const loup = applyBeastForm(renaut, BEAST_PROFILES.wolf).participant;
  set([loup, { ...orc, hp: 6 }, destrier]);
  const loupBlesse = { ...loup, hp: loup.hp - 3 };
  set([loupBlesse, { ...orc, hp: 6 }, destrier]);
  const retour = revertBeastForm(loupBlesse).participant;
  set([retour, { ...orc, hp: 6 }, destrier]);
  // Porteur de Bond.
  set([retour, { ...orc, hp: 6 }, destrier, sauteur]);
  set([retour, { ...orc, hp: 6 }, destrier, { ...sauteur, states: [] }]);
  from('map.placed', { ref: 'p:g', levelId: 'L1' });
  // Engagement.
  const engage = (person, ...others) => withV5(person, { engagements: Object.fromEntries(others.map(id => [id, { since: 1, lastAttackRound: 1 }])) });
  set([engage(retour, 'o'), engage({ ...orc, hp: 6 }, 'r'), destrier, { ...sauteur, states: [] }]);
  from('map.adjacency', { pairs: [['pj:c1', 'p:g']] });
  // PJ hors scène.
  characters.push(persistantElsa);
  link.refresh();
  // Distance préremplie, Course, battement.
  const distance = link.queryDistance(retour, sauteur);
  from('map.distance', { queryId: 'dq-1', cells: 3.5 });
  answers.push(['queryDistance', await distance]);
  answers.push(['queryDistance', await link.queryDistance(retour, { id: 'x', kind: 'PNJ', name: 'Absent' })]);
  from('map.ran', { ref: 'pj:c1' });
  clock += 2_000;
  link.tick();
  clock += 60_000;
  from('map.ping');
  answers.push(['isPlaced', link.isPlaced(destrier), link.isPlaced(sauteur), link.isPlaced(orc)]);
  // Mort.
  set([engage(retour, 'o'), withV5(engage({ ...orc, hp: 0 }, 'r'), { dead: true, deathCause: 'fire' }), destrier, { ...sauteur, states: [] }]);
  // Retrait : le PNJ mort quitte la scène (token.remove), le PJ aussi (il reste lié, hors scène).
  set([destrier, { ...sauteur, states: [] }]);
  from('map.unplaced', { ref: 'p:g' });
  // Rechargement de la carte : nouvel instantané.
  from('map.hello');
  // Déconnexion faute de battement.
  clock += 120_000;
  link.tick();
  answers.push(['status', link.status()]);
  answers.push(['timers', timers.map(timer => timer.ms)]);
  return { messages, statuses, placements, adjacency, ran, answers };
}

test('CA7 — liaison carte Warhammer : suite des messages identique au test d’or', async () => {
  const produced = await playScenario();
  if (process.env.LIAISON_GOLDEN_ECRIRE === '1') writeFileSync(FIXTURE, `${JSON.stringify(produced, null, 2)}\n`);
  const golden = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  assert.equal(produced.messages.length, golden.messages.length, 'nombre de messages');
  produced.messages.forEach((message, index) => assert.deepEqual(message, golden.messages[index], `message n° ${index + 1} (${message.type})`));
  assert.deepEqual(produced, golden);
});

test('CA7 — le scénario d’or couvre bien chaque message attendu', async () => {
  const { messages } = await playScenario();
  const types = new Set(messages.map(message => message.type));
  for (const type of ['mj.hello', 'mj.snapshot', 'mj.roster', 'mj.engagements', 'token.add', 'token.state', 'token.remove', 'fx.wound', 'fx.death',
    'mount.request', 'mount.split', 'mj.distanceQuery', 'mj.ping']) assert.ok(types.has(type), `message ${type} présent`);
  assert.ok(messages.some(message => message.type === 'token.state' && message.payload.mounted === true), 'pion monté');
  assert.ok(messages.some(message => message.type === 'token.state' && message.payload.formImageUrl), 'forme bestiale');
  assert.ok(messages.some(message => message.type === 'token.add' && message.payload.bondCells > 0), 'porteur de Bond');
  assert.ok(messages.some(message => message.type === 'mj.engagements' && message.payload.pairs.length > 0), 'engagement');
  assert.ok(messages.some(message => message.type === 'token.add' && message.payload.ref === 'pj:c2'), 'PJ hors scène');
  assert.equal(messages.filter(message => message.type === 'fx.wound').length, 3, 'blessure du PNJ, blessure sous la forme, mort ; ni la prise ni le retour de forme');
});
