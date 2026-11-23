// Passe G, lot G4 (R16, option B du MJ, 22/11) : point d'impact d'un sort de zone choisi d'un clic sur la carte.
// Contrat de liaison §10.1 (révision du 23/11/2026, version 3) : `mj.impactQuery`, `mj.impactCancel`, `map.impact`.
// La carte n'est pas là (lot jumeau C4 dans l'autre dépôt) : faux canal, comme liaison-carte-protocole.test.mjs.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createMapLinkProtocol, MAP_LINK_VERSION } from '../../../js/core/map-link-protocol.js';
import { LIAISON_CARTE } from '../../../js/data/donnees-communes.js';

const map = (type, payload = {}, v = MAP_LINK_VERSION) => ({ v, type, seq: 0, at: 0, from: 'map', payload });
const person = (id, extra = {}) => ({ id, name: id.toUpperCase(), zone: 'active', ...extra });
const projection = {
  refOf: participant => (participant.pj ? `pj:${participant.pid}` : `p:${participant.id}`),
  tokenStates: participants => Object.fromEntries(participants.map(participant => {
    const ref = participant.pj ? `pj:${participant.pid}` : `p:${participant.id}`;
    return [ref, { ref, label: participant.name }];
  }))
};

/** Liaison connectée (map.hello reçu), scène `people`, faux canal. */
function linked(people = [person('mage'), person('a'), person('b'), person('pj1', { pj: true, pid: 'c1' }), person('bench', { zone: 'bench' })]) {
  const sent = [], statuses = [];
  let clock = 0;
  const link = createMapLinkProtocol({ channel: { postMessage: message => sent.push(structuredClone(message)), onmessage: null },
    projection, getParticipants: () => people, now: () => clock, onStatus: status => statuses.push(status), setTimer: () => 0, clearTimer: () => {} });
  link.onMessage(map('map.hello'));
  const of = type => sent.filter(message => message.type === type);
  const active = people.filter(row => row.zone === 'active');
  return { link, sent, of, people, active, statuses, advance: ms => { clock += ms; } };
}

describe('G4 — mj.impactQuery, map.impact, mj.impactCancel (contrat §10.1)', () => {
  test('(1) la demande part une fois avec queryId, label, radiusCells et casterRef', () => {
    const t = linked();
    const query = t.link.queryImpact({ label: 'Boule de feu', radiusCells: 4, caster: t.people[0], candidates: t.active });
    assert.equal(typeof query.queryId, 'string');
    const queries = t.of('mj.impactQuery');
    assert.equal(queries.length, 1);
    assert.deepEqual(queries[0].payload, { queryId: query.queryId, label: 'Boule de feu', radiusCells: 4, casterRef: 'p:mage' });
    assert.equal(queries[0].v, 3);
    assert.equal(t.link.impactPending(), query.queryId);
  });

  test('(1 bis) label coupé à 40 caractères, rayon négatif ou illisible ramené à 0, lanceur absent : casterRef null', () => {
    const t = linked();
    t.link.queryImpact({ label: 'x'.repeat(60), radiusCells: -3, caster: null, candidates: t.active });
    const payload = t.of('mj.impactQuery')[0].payload;
    assert.equal(payload.label.length, 40);
    assert.equal(payload.radiusCells, 0);
    assert.equal(payload.casterRef, null);
  });

  test('(2) map.impact de ce queryId : refs remises, ref inconnues ou de non-actifs ignorées', async () => {
    const t = linked();
    const query = t.link.queryImpact({ label: 'Boule de feu', radiusCells: 2, caster: t.people[0], candidates: t.active });
    t.link.onMessage(map('map.impact', { queryId: query.queryId, levelId: 'L1', cell: { x: 4, y: 7 }, refs: ['p:a', 'pj:c1', 'p:bench', 'p:inconnu', 'p:a'] }));
    const answer = await query.answer;
    assert.deepEqual(answer, { ok: true, queryId: query.queryId, levelId: 'L1', cell: { x: 4, y: 7 }, refs: ['p:a', 'pj:c1', 'p:bench', 'p:inconnu', 'p:a'], ids: ['a', 'pj1'] });
    assert.equal(t.link.impactPending(), null);
  });

  test('(2 bis) refs: [] = case sans personne ; refs absentes lues comme vides', async () => {
    const t = linked();
    const first = t.link.queryImpact({ label: 'Sort', radiusCells: 1, caster: t.people[0], candidates: t.active });
    t.link.onMessage(map('map.impact', { queryId: first.queryId, levelId: 'L1', cell: { x: 0, y: 0 }, refs: [] }));
    assert.deepEqual((await first.answer).ids, []);
    const second = t.link.queryImpact({ label: 'Sort', radiusCells: 1, caster: t.people[0], candidates: t.active });
    t.link.onMessage(map('map.impact', { queryId: second.queryId, levelId: 'L1', cell: { x: 0, y: 0 } }));
    assert.deepEqual((await second.answer).ids, []);
  });

  test('(3) cancelled : retour au choix manuel', async () => {
    const t = linked();
    const query = t.link.queryImpact({ label: 'Sort', radiusCells: 1, caster: t.people[0], candidates: t.active });
    t.link.onMessage(map('map.impact', { queryId: query.queryId, cancelled: true }));
    assert.deepEqual(await query.answer, { ok: false, queryId: query.queryId, reason: 'cancelled' });
    assert.equal(t.link.impactPending(), null);
    assert.equal(t.of('mj.impactCancel').length, 0, 'la carte a abandonné elle-même : rien à lui renvoyer');
  });

  test('(4) queryId périmé ou seconde réponse au même : ignorés', async () => {
    const t = linked();
    const query = t.link.queryImpact({ label: 'Sort', radiusCells: 1, caster: t.people[0], candidates: t.active });
    t.link.onMessage(map('map.impact', { queryId: 'iq-ancien', levelId: 'L1', cell: { x: 1, y: 1 }, refs: ['p:b'] }));
    assert.equal(t.link.impactPending(), query.queryId, 'réponse étrangère ignorée');
    t.link.onMessage(map('map.impact', { queryId: query.queryId, levelId: 'L1', cell: { x: 1, y: 1 }, refs: ['p:a'] }));
    t.link.onMessage(map('map.impact', { queryId: query.queryId, levelId: 'L1', cell: { x: 2, y: 2 }, refs: ['p:b'] }));
    assert.deepEqual((await query.answer).ids, ['a'], 'seule la première réponse compte');
    assert.equal(t.link.impactPending(), null);
  });

  test('(5) nouvelle demande : mj.impactCancel de la précédente, qui rend « remplacée »', async () => {
    const t = linked();
    const first = t.link.queryImpact({ label: 'Sort 1', radiusCells: 1, caster: t.people[0], candidates: t.active });
    const second = t.link.queryImpact({ label: 'Sort 2', radiusCells: 2, caster: t.people[0], candidates: t.active });
    assert.notEqual(first.queryId, second.queryId);
    assert.deepEqual(t.of('mj.impactCancel').map(message => message.payload), [{ queryId: first.queryId }]);
    assert.deepEqual(await first.answer, { ok: false, queryId: first.queryId, reason: 'superseded' });
    assert.equal(t.link.impactPending(), second.queryId);
    const types = t.sent.map(message => message.type).filter(type => type.startsWith('mj.impact'));
    assert.deepEqual(types, ['mj.impactQuery', 'mj.impactCancel', 'mj.impactQuery'], 'l’annulation part avant la nouvelle demande');
  });

  test('(5 bis) cancelImpact : mj.impactCancel de la demande en cours, une seule fois ; sans effet sur un autre queryId', async () => {
    const t = linked();
    const query = t.link.queryImpact({ label: 'Sort', radiusCells: 1, caster: t.people[0], candidates: t.active });
    assert.equal(t.link.cancelImpact('iq-autre'), false);
    assert.equal(t.of('mj.impactCancel').length, 0);
    assert.equal(t.link.cancelImpact(query.queryId), true);
    assert.equal(t.link.cancelImpact(query.queryId), false);
    assert.deepEqual(t.of('mj.impactCancel').map(message => message.payload), [{ queryId: query.queryId }]);
    assert.deepEqual(await query.answer, { ok: false, queryId: query.queryId, reason: 'withdrawn' });
    t.link.onMessage(map('map.impact', { queryId: query.queryId, levelId: 'L1', cell: { x: 1, y: 1 }, refs: ['p:a'] }));
    assert.equal(t.link.impactPending(), null, 'réponse tardive ignorée');
  });

  test('(6) déconnexion : demande abandonnée, sans message ; carte déconnectée : aucune demande', async () => {
    const t = linked();
    const query = t.link.queryImpact({ label: 'Sort', radiusCells: 1, caster: t.people[0], candidates: t.active });
    t.advance(20_000);
    t.link.tick();
    assert.equal(t.link.status(), 'disconnected');
    assert.deepEqual(await query.answer, { ok: false, queryId: query.queryId, reason: 'disconnected' });
    assert.equal(t.link.impactPending(), null);
    assert.equal(t.of('mj.impactCancel').length, 0);
    const offline = t.link.queryImpact({ label: 'Sort', radiusCells: 1, caster: t.people[0], candidates: t.active });
    assert.equal(offline.queryId, null);
    assert.deepEqual(await offline.answer, { ok: false, queryId: null, reason: 'disconnected' });
    assert.equal(t.of('mj.impactQuery').length, 1, 'aucune demande envoyée à une carte déconnectée');
  });

  test('(7) version 3 : mj.hello et mj.impactQuery en v3 ; une carte en version 2 voit « version différente », rien ne passe', async () => {
    assert.equal(LIAISON_CARTE.version, 3);
    assert.equal(MAP_LINK_VERSION, 3);
    const sent = [], statuses = [];
    const people = [person('mage'), person('a')];
    const link = createMapLinkProtocol({ channel: { postMessage: message => sent.push(message), onmessage: null }, projection,
      getParticipants: () => people, onStatus: status => statuses.push(status), setTimer: () => 0, clearTimer: () => {} });
    assert.deepEqual([sent[0].type, sent[0].v], ['mj.hello', 3]);
    link.onMessage(map('map.hello', {}, 2));
    assert.equal(link.status(), 'version-mismatch');
    assert.equal(sent.filter(message => message.type === 'mj.snapshot').length, 0);
    const refused = link.queryImpact({ label: 'Sort', radiusCells: 1, caster: people[0], candidates: people });
    assert.equal(refused.queryId, null, 'pas de demande à une carte d’une autre version');
    link.onMessage(map('map.hello'));
    assert.equal(link.status(), 'connected');
    const query = link.queryImpact({ label: 'Sort', radiusCells: 1, caster: people[0], candidates: people });
    link.onMessage(map('map.impact', { queryId: query.queryId, levelId: 'L1', cell: { x: 0, y: 0 }, refs: ['p:a'] }, 2));
    assert.equal(link.status(), 'version-mismatch');
    assert.equal(link.impactPending(), null);
    assert.deepEqual(await query.answer, { ok: false, queryId: query.queryId, reason: 'disconnected' }, 'version différente : demande abandonnée');
    assert.deepEqual(statuses, ['version-mismatch', 'connected', 'version-mismatch']);
  });
});
