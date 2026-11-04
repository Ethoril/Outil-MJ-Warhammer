import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewV5TalentTestModifiers } from '../../../js/core/v5-talent-tests.js';
import { parsePsychologyTrait } from '../../../js/core/creature-psychology.js';
import { applicationBlockingReasons } from '../../../js/ui/resolution-panel.js';
import { actionBarModel } from '../../../js/ui/workspace/plateau.js';

// Recette du MJ du 04/11/2026 : premier test du plateau.
const owned = id => ({ id, status: 'resolved', rank: 1 });

test('un jet de combat sans compétence importée ne demande pas la compétence aux talents d’autres compétences', () => {
  const bhelgi = { id: 'b', talents: [owned('talent-public-speaker'), owned('talent-alley-cat'), owned('talent-fast-hands')] };
  for (const [action, kind] of [[{ label: 'Hache', type: 'attack', attr: 'CC' }, 'melee'], [{ label: 'Esquive', type: 'test', attr: 'Ag' }, 'test'], [{ label: 'Arc', type: 'attack', attr: 'CT' }, 'ranged']]) {
    const plan = previewV5TalentTestModifiers(bhelgi, { action, settings: {}, kind, role: 'defender' });
    assert.deepEqual(plan.unresolved, [], action.label);
  }
});

test('un Test sans compétence connue reste à préciser pour un talent de compétence', () => {
  const plan = previewV5TalentTestModifiers({ id: 'b', talents: [owned('talent-alley-cat')] }, { action: { label: 'Test', type: 'test', attr: 'Ag' }, settings: {}, kind: 'test', role: 'actor' });
  assert.ok(plan.unresolved.some(row => /skillId/.test(row)));
});

test('Peur et Terreur imprimées sans parenthèses sont reconnues', () => {
  assert.deepEqual(parsePsychologyTrait('Peur 2'), { key: 'fear', name: 'Peur', detail: '2' });
  assert.deepEqual(parsePsychologyTrait('Terreur 1'), { key: 'terror', name: 'Terreur', detail: '1' });
  assert.equal(parsePsychologyTrait('Terreur abyssale'), null);
});

test('une Charge requise se déclare depuis la liste ; le jet de critique attend sa localisation', () => {
  const reasons = applicationBlockingReasons({ ready: false, unresolved: ['Cornes : une Charge est requise.'], critical: { details: { pending: true, needsLocation: true } } }, {}, true);
  assert.equal(reasons.find(row => /Charge/.test(row.text)).action, 'charge');
  assert.ok(reasons.some(row => row.focus === 'critical-location'));
  assert.ok(!reasons.some(row => row.focus === 'critical-pending'));
});

test('barre d’actions : Peur à surmonter, Viser d’un clic avec l’arme du tir, déplacement noté', () => {
  const actor = { id: 'b', name: 'Bhelgi', zone: 'active', camp: 'pj', states: [{ key: 'fear-of-talent', authorId: 't', rating: 2, successes: 1, name: 'Peur (2)' }] };
  const beast = { id: 't', name: 'Taureau', zone: 'active', camp: 'ennemi' };
  const actions = [{ id: 'xbow', type: 'attack', attr: 'CT', name: 'Arbalète' }, { id: 'activate:overcome-fear', type: 'skill', attr: 'FM' }];
  const rows = actionBarModel({ actor, active: [actor, beast], actions, actionKeys: ['xbow', 'activate:overcome-fear'], previewDisengage: () => ({}), turnFacts: { moved: true } });
  assert.match(rows[0].label, /Surmonter la Peur/);
  assert.match(rows[0].consequence, /Taureau 1\/2 DR/);
  const calls = [];
  rows.find(row => row.id === 'aim-t').run({ aim: values => calls.push(values) });
  assert.deepEqual(calls, [{ targetId: 't', weaponName: 'Arbalète', rangedWeaponConfirmed: true, rangedWeaponHeldConfirmed: true }]);
  assert.equal(rows.find(row => row.id === 'move').disabled, true);
});

test('premier import d’une fiche : un profil PJ est créé dans la bibliothèque vide, puis annulable', async () => {
  const { readFileSync } = await import('node:fs');
  const { ficheSnapshot } = await import('../../../js/core/fiche-sync.js');
  const { createStore } = await import('../../../js/core/store.js');
  const snapshot = ficheSnapshot('caelel', JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8')));
  const store = createStore({ storage: null });
  await store.ready;
  const newProfile = { id: 'pj-caelel', name: snapshot.name, kind: 'PJ', caracs: {}, skills: [], talents: [], equipment: [], diceLines: [], extensions: {} };
  const result = await store.applyFicheSync([{ charId: 'caelel', profileId: 'pj-caelel', newProfile, snapshot }]);
  assert.notEqual(result?.changed, false);
  const profile = store.listProfiles().find(row => row.id === 'pj-caelel');
  assert.equal(profile.kind, 'PJ');
  assert.equal(profile.extensions.ficheId, 'caelel');
  assert.equal(profile.caracs.CC, 54);
  assert.equal(profile.maxHp, 18);
  await store.undo();
  assert.equal(store.listProfiles().some(row => row.id === 'pj-caelel'), false);
});

test('Surmonter la Peur sans désigner la Peur : celle de plus haut indice est prise d’office, les DR s’ajoutent', async () => {
  const { createStore } = await import('../../../js/core/store.js');
  const { fearAction } = await import('../../../js/core/v5-talent-psychology.js');
  const store = createStore({ storage: null });
  await store.ready;
  const f = (id, name, camp, extra = {}) => ({ id, name, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', initiative: 50, hp: 14, maxHp: 14, caracs: { CC: 45, CT: 40, F: 35, E: 35, I: 40, Ag: 38, Dex: 35, Int: 30, FM: 35, Soc: 30, M: 4 }, skills: [], talents: [], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'elysia', order: ['elysia', 'beast'], participants: [f('beast', 'Taureau', 'ennemi', { traits: ['Peur (3)'] }), f('elysia', 'Elysia', 'pj')] } });
  await store.applyCreaturePsychology('beast', 'fear', { targetId: 'elysia' });
  const actor = store.listParticipants().find(row => row.id === 'elysia'), action = fearAction(actor);
  const preview = store.previewResolution({ actorId: 'elysia', actor, action, roll: 12, v5: { kind: 'test', context: { ...action.extensions.v5.initialContext } } });
  assert.deepEqual(preview.unresolved, []);
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  const fear = store.listParticipants().find(row => row.id === 'elysia').states.find(row => row.key === 'fear-of-talent');
  assert.equal(fear.successes, 2);
});

test('aucun talent de Test ne pose de question hors sujet sur une attaque ou une défense ordinaire (seule la Haine demande le groupe)', async () => {
  const { V5_TEST_TALENT_IDS } = await import('../../../js/core/v5-talent-tests.js');
  const asked = new Set();
  for (const [action, kind, roles] of [[{ label: 'Hache', type: 'attack', attr: 'CC', qualities: [] }, 'melee', ['attacker', 'defender']], [{ label: 'Arc', type: 'attack', attr: 'CT', qualities: [] }, 'ranged', ['attacker', 'defender']], [{ label: 'Esquive', type: 'test', attr: 'Ag' }, 'test', ['defender']]])
    for (const role of roles) for (const id of new Set(V5_TEST_TALENT_IDS))
      for (const row of previewV5TalentTestModifiers({ id: 'x', talents: [owned(id)] }, { action, settings: {}, kind, role }).unresolved) asked.add(row);
  assert.deepEqual([...asked], ['Talent talent-hatred : préciser enemyGroup.']);
});

test('la fiche peut nommer sa ressource `fortune` (ex-`chance`)', async () => {
  const { ficheSnapshot } = await import('../../../js/core/fiche-sync.js');
  assert.equal(ficheSnapshot('a', { nom: 'A', fortune: 3 }).resources.fortune, 3);
  assert.equal(ficheSnapshot('b', { nom: 'B', chance: 2 }).resources.fortune, 2);
  assert.equal(ficheSnapshot('c', { nom: 'C', fortune: 1, chance: 4 }).resources.fortune, 1);
});

test('fiche V5 : fortune vide vaut 0, Péché et Corruption importés puis conservés en séance tant que la fiche ne change pas', async () => {
  const { ficheSnapshot, applyFicheSync } = await import('../../../js/core/fiche-sync.js');
  assert.equal(ficheSnapshot('a', { nom: 'A', fortune: '', chance: '3' }).resources.fortune, 0);
  const snap = (peche, corruption) => ficheSnapshot('p', { nom: 'Prêtre', destin: '2', peche, corruption });
  assert.deepEqual(snap('1', '3').durables, { fate: 2, sin: 1, corruption: 3 });
  assert.equal(snap('x', '').durables.sin, undefined);
  const profile = { id: 'pj', name: 'Prêtre', kind: 'PJ', caracs: {}, skills: [], talents: [], equipment: [], diceLines: [], extensions: {} };
  let draft = applyFicheSync({ reserve: [profile] }, [{ snapshot: snap('1', '3'), profileId: 'pj' }]);
  assert.equal(draft.reserve[0].extensions.v5.divine.sin, 1);
  assert.equal(draft.reserve[0].extensions.v5.corruptionPoints, 3);
  draft.reserve[0].extensions.v5.divine.sin = 2;
  draft = applyFicheSync(draft, [{ snapshot: snap('1', '3'), profileId: 'pj' }]);
  assert.equal(draft.reserve[0].extensions.v5.divine.sin, 2, 'fiche inchangée : la valeur de séance est gardée');
  draft = applyFicheSync(draft, [{ snapshot: snap('0', '4'), profileId: 'pj' }]);
  assert.equal(draft.reserve[0].extensions.v5.divine.sin, 0);
  assert.equal(draft.reserve[0].extensions.v5.corruptionPoints, 4);
});

test('fiche V5 : familiers créés depuis le bestiaire et liés en combat sans débit de Destin ; mots-clés en cible des talents', async () => {
  const { readFileSync } = await import('node:fs');
  const { ficheSnapshot } = await import('../../../js/core/fiche-sync.js');
  const { buildReserveProfileFromBestiary } = await import('../../../js/core/bestiary-profiles.js');
  const { createStore } = await import('../../../js/core/store.js');
  const { acquiredV5Talents } = await import('../../../js/core/v5-talents.js');
  const raw = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
  const familiers = [{ id: 'fam_a', systeme: 'homunculus', type: 'spell', vent: 'ulgu', espece: null, nom: 'Brindille', destinSacrifie: 2 },
    { id: 'fam_b', systeme: 'animal', type: 'power', vent: null, espece: 'cat', nom: '', destinSacrifie: 1 },
    { id: 'bad', systeme: 'animal', type: 'spell', vent: null, espece: 'cat', nom: 'X', destinSacrifie: 1 }];
  const fiche = extra => ficheSnapshot('caelel', { ...raw, destin: '3', familiers, motsCles: [{ id: 'haine', cible: 'peaux-vertes' }], ...extra });
  const snapshot = fiche();
  assert.deepEqual(snapshot.familiars.map(row => [row.name, row.profileId]), [['Brindille', 'fiche-familier-caelel-fam_a'], ['Chat', 'fiche-familier-caelel-fam_b']]);
  assert.ok(snapshot.warnings.some(row => row.code === 'familiar-invalid'));
  const l17 = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L17.json', import.meta.url), 'utf8')).profiles;
  const familiarProfiles = { fam_a: buildReserveProfileFromBestiary('E0-P-530', { library: l17, nameFr: true }) };
  const store = createStore({ storage: null });
  await store.ready;
  const newProfile = { id: 'pj-caelel', name: 'Caelel', kind: 'PJ', caracs: {}, skills: [], talents: [{ id: 'talent-hatred', status: 'resolved', rank: 1 }], equipment: [], diceLines: [], extensions: {} };
  await store.applyFicheSync([{ charId: 'caelel', profileId: 'pj-caelel', newProfile, snapshot, familiarProfiles }]);
  const spell = store.listProfiles().find(row => row.id === 'fiche-familier-caelel-fam_a');
  assert.equal(spell.name, 'Brindille');
  assert.ok(Number(spell.caracs.FM) > 0, 'profil type du bestiaire');
  assert.ok(store.listProfiles().some(row => row.id === 'fiche-familier-caelel-fam_b'), 'sans profil type : profil vierge');
  await store.addProfilesToCombat(['pj-caelel']);
  const people = store.listParticipants();
  const master = people.find(row => row.profileId === 'pj-caelel');
  assert.equal(people.length, 3, 'les deux familiers entrent avec leur maître');
  assert.deepEqual(master.extensions.v5.familiarLinks.map(link => [link.id, link.system, link.kind, link.wind, link.creation.pointsToDistribute]), [['fiche:fam_a', 'homunculus', 'spell', 'ulgu', 1], ['fiche:fam_b', 'animal', 'power', null, 0]]);
  assert.equal(master.extensions.v5.fate, 3, 'aucun Destin débité : il est déjà compté sur la fiche');
  assert.equal(people.find(row => row.profileId === 'fiche-familier-caelel-fam_a').extensions.v5.familiarOf.masterId, master.id);
  // La talent Haine reçoit la cible du mot-clé de la fiche.
  assert.deepEqual(master.extensions.v5.keywordTargets, [{ id: 'haine', target: 'peaux-vertes' }]);
  assert.ok(acquiredV5Talents({ ...master, talents: [{ id: 'talent-hatred', status: 'resolved', rank: 1 }] }).some(row => row.talentId === 'talent-hatred' && row.specialization === 'peaux-vertes'));
  // Familier retiré de la fiche : lien retiré au prochain import.
  await store.applyFicheSync([{ charId: 'caelel', profileId: 'pj-caelel', snapshot: fiche({ familiers: familiers.slice(0, 1) }) }]);
  const after = store.listParticipants().find(row => row.profileId === 'pj-caelel');
  assert.deepEqual(after.extensions.v5.familiarLinks.map(link => link.id), ['fiche:fam_a']);
  assert.equal(store.listParticipants().find(row => row.profileId === 'fiche-familier-caelel-fam_b').extensions.v5.familiarOf, undefined);
});
