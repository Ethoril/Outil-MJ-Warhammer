// CAMP-12 (13/11) : fonctions pures de l'écran Campagne (statut, résumé, regroupement des absents et des
// personnages suivis hors rencontre), sans DOM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCampaignPeople, followupsOf, formatElapsed, getInitials, getPersonStatus, hpText, humanSummary, personSubtitle } from '../../../js/ui/campaign-model.js';

const incident = (id, participantId, extra = {}) => ({ id, participantId, status: 'open', bandaged: true, infection: false, requiresSurgery: false, surgeryCompleted: false, ...extra });
const present = { id: 'p1', absent: false };

test('getPersonStatus : absent en bleu selon le lieu, puis rouge, ambre, vert', () => {
  assert.deepEqual(getPersonStatus({ absent: true, place: 'suspendue' }, [], [], [], []), { text: 'Scène suspendue', color: 'blue' });
  assert.deepEqual(getPersonStatus({ absent: true, place: 'aucun' }, [], [], [], []), { text: 'Ancien suivi', color: 'blue' });
  assert.deepEqual(getPersonStatus({ absent: true, place: 'inconnu' }, [], [], [], []), { text: 'Ancien suivi', color: 'blue' });
  // Rouge : critique à ouvrir, blessure non bandée, infectée ou chirurgie requise non faite.
  assert.equal(getPersonStatus(present, [], [], [], [{ participantId: 'p1' }]).color, 'red');
  assert.equal(getPersonStatus(present, [incident('w', 'p1', { bandaged: false })], [], [], []).color, 'red');
  assert.equal(getPersonStatus(present, [incident('w', 'p1', { infection: true })], [], [], []).color, 'red');
  assert.equal(getPersonStatus(present, [incident('w', 'p1', { requiresSurgery: true })], [], [], []).color, 'red');
  assert.deepEqual(getPersonStatus(present, [incident('w', 'p1', { requiresSurgery: true, surgeryCompleted: true })], [], [], []), { text: 'À surveiller', color: 'amber' });
  assert.equal(getPersonStatus(present, [], [{ id: 'd' }], [], []).color, 'amber');
  assert.equal(getPersonStatus(present, [], [], [{ id: 's' }], []).color, 'amber');
  assert.deepEqual(getPersonStatus(present, [], [], [], []), { text: 'Rien à traiter', color: 'green' });
});

test('humanSummary et personSubtitle : accords au singulier et au pluriel, critiques en tête', () => {
  assert.equal(humanSummary([], [], []), 'Aucun suivi actif');
  assert.equal(humanSummary([1], [1, 2], [1]), '1 blessure suivie · 2 maladies suivies · 1 séquelle suivie');
  assert.equal(humanSummary([1, 2], [], [1, 2, 3]), '2 blessures suivies · 3 séquelles suivies');
  assert.equal(personSubtitle({ incidents: [1], diseases: [], sequelae: [], proposals: [] }), '1 blessure suivie');
  assert.equal(personSubtitle({ incidents: [], diseases: [], sequelae: [], proposals: [1, 2] }), '2 critiques à suivre · Aucun suivi actif');
});

test('formatElapsed, getInitials, hpText', () => {
  assert.equal(formatElapsed(90061), '1 j 1 h 1 min 1 s');
  assert.equal(formatElapsed(0), '0 s');
  assert.equal(formatElapsed(null), 'Horloge non initialisée');
  assert.equal(formatElapsed(undefined), 'Horloge non initialisée');
  assert.equal(formatElapsed(-1), 'Horloge non initialisée');
  assert.equal(getInitials('Agnès'), 'AG');
  assert.equal(getInitials('  Jean de la Tour '), 'JT');
  assert.equal(getInitials(''), '?');
  assert.equal(hpText({ person: { hp: 6, maxHp: 12 } }, 'x'), '6 / 12 PV');
  assert.equal(hpText({ person: { hp: 6 } }, 'x'), 'PV indisponibles');
  assert.equal(hpText({ person: null, absent: true }, 'Consultation'), 'Consultation');
});

test('followupsOf : seulement les suivis actifs du personnage', () => {
  const registry = {
    incidents: [incident('w1', 'p1'), incident('w2', 'p1', { status: 'healed' }), incident('w3', 'p2')],
    diseases: [{ id: 'd1', participantId: 'p1', status: 'active' }, { id: 'd2', participantId: 'p1', status: 'cured' }],
    sequelae: ['open', 'needs-facts', 'permanent', 'healed'].map((status, i) => ({ id: `s${i}`, participantId: 'p1', status })),
    proposals: [{ participantId: 'p1', criticalId: 'c1' }, { participantId: 'p2', criticalId: 'c2' }]
  };
  const own = followupsOf('p1', registry);
  assert.deepEqual(own.incidents.map(row => row.id), ['w1']);
  assert.deepEqual(own.diseases.map(row => row.id), ['d1']);
  assert.deepEqual(own.sequelae.map(row => row.id), ['s0', 's1', 's2']);
  assert.deepEqual(own.proposals.map(row => row.criticalId), ['c1']);
});

test('buildCampaignPeople : participants puis suivis hors rencontre dans l’ordre reçu, puis un suivi sans sujet par absent', () => {
  const participants = [
    { id: 'p1', name: 'Agnès', hp: 6, maxHp: 12 },
    { id: 'p2', name: '', hp: 10, maxHp: 10 },
    { id: 'f1', name: 'Bertin', offEncounter: true }
  ];
  const labels = [];
  const { people, activeIds, absentIds } = buildCampaignPeople({
    participants,
    incidents: [incident('w1', 'p1'), incident('w2', 'gone'), incident('w3', 'old', { status: 'healed' })],
    diseases: [{ id: 'd1', participantId: 'sus', status: 'active', label: 'Fièvre' }],
    sequelae: [{ id: 's1', participantId: 'gone', status: 'open' }],
    pending: [{ participantId: 'pend' }],
    proposals: [{ participantId: 'prop' }],
    rowLabel: row => { labels.push(row.id); return row.id === 'w2' ? 'Hans' : ''; },
    subjectPlace: id => (id === 'sus' ? 'suspendue' : 'aucun')
  });
  assert.deepEqual(people.map(person => person.id), ['p1', 'p2', 'f1', 'gone', 'sus', 'pend', 'prop']);
  assert.deepEqual(people.slice(0, 3).map(({ name, absent, off }) => ({ name, absent, off })), [
    { name: 'Agnès', absent: false, off: false },
    { name: 'Personnage sans nom', absent: false, off: false },
    { name: 'Bertin', absent: false, off: true }
  ]);
  // Absent : nom enregistré sur sa première ligne (incidents, maladies, séquelles, décisions), repli « Ancien suivi ».
  assert.deepEqual(people.slice(3).map(({ name, place, absent, person }) => ({ name, place, absent, person })), [
    { name: 'Hans', place: 'aucun', absent: true, person: null },
    { name: 'Ancien suivi', place: 'suspendue', absent: true, person: null },
    { name: 'Ancien suivi', place: 'aucun', absent: true, person: null },
    // Une critique à ouvrir seule n'a pas de ligne à nommer : rowLabel n'est pas appelé pour elle.
    { name: 'Ancien suivi', place: 'aucun', absent: true, person: null }
  ]);
  assert.deepEqual(labels, ['w2', 'd1', undefined]);
  assert.deepEqual([...activeIds].sort(), ['gone', 'p1', 'pend', 'prop', 'sus']);
  assert.deepEqual(absentIds, ['gone', 'sus', 'pend', 'prop']);
});

test('buildCampaignPeople : rien d’actif, aucun suivi fictif', () => {
  const result = buildCampaignPeople({ participants: [], incidents: [], diseases: [], sequelae: [], proposals: [], rowLabel: () => 'x', subjectPlace: () => 'aucun' });
  assert.deepEqual(result.people, []);
  assert.deepEqual(result.absentIds, []);
});
