import test, { after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { resolveDivineTalentRestriction } from '../../../js/core/v5-divine-access.js';
import { acquiredV5Talents } from '../../../js/core/v5-talents.js';

// L10 : clauses déjà tenues par le moteur, requalifiées en `engine`. Chaque clause est prouvée par le comportement qui la tient.
const lire = (chemin) => JSON.parse(readFileSync(resolve(chemin), 'utf8'));
const { contracts: tous } = lire('js/data/v5-divine-contracts.json');
const table = lire('tests/fixtures/miracles-narratifs-familles.json');
const clone = (valeur) => structuredClone(valeur);
const memoire = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };

const miracle = (nom) => getAllDivineContracts().find((c) => c.type === 'miracle' && (c.catalogueName === nom || c.name === nom));
const contratParId = (id) => tous.find((c) => c.id === id);

// Clauses requalifiées : « id du contrat#id de la clause ».
const REQUALIFIEES = [
  'divine:miracle:il-de-l-aigle#eagle-intangible',
  'divine:miracle:en-bon-ordre#area',
  'divine:miracle:en-bon-ordre#duration',
  'divine:miracle:sur-un-terrain-mortel#duration-unattested',
  'divine:miracle:attaque-rapide#free-attack',
  'divine:miracle:devotion-de-la-guerriere#myrmidians',
  'divine:miracle:competence-martiale#allies',
  'divine:miracle:ranald:ranald-s-mischief#table-roll',
  'divine:miracle:verena:shackles-of-truth#end',
  'divine:miracle:verena:sword-of-justice#end',
  'divine:miracle:sigmar:sigmar-s-fiery-hammer#weapon-restriction',
  'divine:miracle:solkan:flaming-blade#sword-only',
  'divine:miracle:sigmar:vanquish-the-unrighteous#priest-counted',
  ...['absolute-purity', 'fist-of-vengeance', 'flaming-blade', 'fury-of-the-righteous-sun']
    .flatMap((id) => ['no-sin-corruption', 'solkan-purity'].map((cl) => `divine:miracle:solkan:${id}#${cl}`))
];
// `line-of-sight` (Commander la Légion) reste manuelle : le contrat ne porte aucune règle de cible `seesPriest`, rien ne la tient.
const RESTE_MANUELLE = 'divine:miracle:commander-la-legion#line-of-sight';

const clause = (cle) => {
  const [id, cl] = cle.split('#');
  return contratParId(id)?.clauses.find((c) => c.id === cl);
};

describe('L10 : clauses requalifiées en engine', () => {
  test('21 clauses sont en mode engine, aucune ne reste en rappel', () => {
    assert.equal(REQUALIFIEES.length, 21);
    for (const cle of REQUALIFIEES) {
      const c = clause(cle);
      assert.ok(c, `Clause introuvable : ${cle}`);
      assert.equal(c.mode, 'engine', `La clause ${cle} devrait être en mode « engine »`);
    }
  });

  test('line-of-sight reste manuelle : aucune règle seesPriest dans le contrat', () => {
    assert.equal(clause(RESTE_MANUELLE).mode, 'manual');
    assert.deepEqual(contratParId('divine:miracle:commander-la-legion').targetRules, []);
  });

  test('la table du garde-fou ne garde que les clauses encore manuelles', () => {
    for (const cle of REQUALIFIEES) assert.equal(table.clauses[cle], undefined, `La table garde encore ${cle}`);
    assert.equal(table.clauses[RESTE_MANUELLE], 'F8');
    // Les comptes par famille évoluent à chaque lot : ils sont verrouillés par miracles-narratifs-inventaire.test.js, pas ici.
    assert.equal(Object.values(table.clauses).filter(f => f === 'F8').length, 1, 'seule line-of-sight reste en F8');
  });

  test('un contrat requalifié ne rappelle plus la clause : texte absent des clauses non engine', () => {
    for (const cle of REQUALIFIEES) {
      const [id] = cle.split('#');
      const restantes = contratParId(id).clauses.filter((c) => c.mode !== 'engine').map((c) => c.id);
      assert.ok(!restantes.includes(cle.split('#')[1]), `${cle} figure encore parmi les clauses de rappel`);
    }
  });

  test('Q13 : Sur un terrain mortel porte l’étiquette « durée non attestée par le livre »', () => {
    const c = contratParId('divine:miracle:sur-un-terrain-mortel');
    assert.match(c.labels.durationNote, /durée non attestée par le livre/);
    assert.deepEqual(c.params.duration, { kind: 'characteristic-bonus', characteristic: 'FM', unit: 'rounds' });
    // Les autres contrats n'ont pas de note : l'absence se lit comme vide.
    assert.equal(tous.filter((x) => x.labels?.durationNote !== undefined).length, 1);
  });

  test('Q11 : Vaincre les impies porte un second jeu d’effets de Haine pour le prêtre', () => {
    const c = contratParId('divine:miracle:sigmar:vanquish-the-unrighteous');
    const haines = c.effects.filter((e) => e.type === 'grant-talent');
    assert.equal(haines.length, 2);
    assert.equal(haines[0].appliesTo, undefined);
    assert.equal(haines[1].appliesTo, 'caster');
    assert.deepEqual(haines[1].talents, haines[0].talents);
    assert.equal(clause('divine:miracle:sigmar:vanquish-the-unrighteous#hatred-kill').mode, 'engine'); // L6 : case « a tué un ennemi visé »
  });

  test('les cultes Solkan gardent leur rappel de pureté, affiché une fois', () => {
    for (const c of tous.filter((x) => x.deity === 'Solkan')) {
      assert.equal(c.reminders?.length, 1, `Rappel de pureté absent : ${c.id}`);
      assert.match(c.reminders[0], /Solkan n’accepte aucune Bénédiction/);
    }
  });
});

// ---- Comportement du moteur qui tient chaque clause ----
const registre = (await import('../../../js/data/v5-divine-contracts.json', { with: { type: 'json' } })).default;
const base = clone(miracle('Masque mortuaire'));
const enregistres = [];
after(() => { registre.contracts = registre.contracts.filter((c) => !enregistres.includes(c.id)); });
void base; void enregistres;

const acteur = (id, culte, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: culte }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: culte }],
  prayers: getAllDivineContracts().filter((c) => c.type === 'miracle').map((c) => ({ name: c.catalogueName, status: 'resolved' })),
  equipment: [], traits: ['Vigilant'], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const personne = (store, id) => store.listParticipants().find((p) => p.id === id);
async function banc({ culte = 'Sigmar', pretre = {}, allie = {} } = {}) {
  const store = createStore({ persistence: memoire(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [acteur('priest', culte, pretre), acteur('ally', culte, { initiative: 30, ...allie })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const echeance = { phase: 'endOfTurn', round: 6, actorId: 'priest' };
const fin = (round) => ({ phase: 'endOfTurn', round, actorId: 'priest' });
const entree = (plus = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: echeance, ...plus });
const ID = (fin) => `divine:miracle:${fin}`;
async function lancer(store, id, plus) {
  const contrat = contratParId(id);
  const preview = store.previewDivineExecution(contrat.id, entree(plus));
  assert.equal(preview.ready, true, preview.error);
  const resultat = await store.applyDivineExecution(contrat.id, { preview });
  assert.equal(resultat.ready, true, resultat.error);
  return { preview, resultat };
}
const couches = (store, id) => personne(store, id).extensions.v5.divineEffects || [];
const injectes = (p) => (p.talents || []).filter((t) => t.divineEffectId);

describe('L10 : le moteur tient chaque clause', () => {
  test('eagle-intangible : l’aigle est créé avec le Trait Intangible', async () => {
    const store = await banc({ culte: 'Myrmidia' });
    await lancer(store, ID('il-de-l-aigle'));
    const capteur = store.listParticipants().find((p) => /Aigle spectral/.test(p.name || ''));
    assert.ok(capteur, 'capteur absent');
    assert.ok(JSON.stringify(capteur.traits || capteur).includes('Intangible'), 'Trait Intangible absent');
  });

  test('area et duration (En bon ordre) : zone et durée viennent de params', () => {
    const c = contratParId('divine:miracle:en-bon-ordre');
    assert.deepEqual(c.params.targets, { kind: 'area', characteristicBonus: 'FM', unit: 'yards' });
    assert.deepEqual(c.params.duration, { kind: 'characteristic-bonus', characteristic: 'FM', unit: 'rounds' });
    assert.deepEqual(c.effects[0].duration.sourceParameter, 'params.duration');
  });

  test('En bon ordre : la durée résolue suit le Bonus de Volonté (FM 50 : 5 Rounds)', async () => {
    const store = await banc({ culte: 'Myrmidia' });
    const preview = store.previewDivineExecution(ID('en-bon-ordre'), entree({ targetIds: ['ally'], expiry: fin(5) }));
    assert.equal(preview.ready, true, preview.error);
    assert.equal(preview.preview.resolvedParams.duration.value, 5);
    assert.equal(preview.preview.resolvedParams.duration.unit, 'rounds');
  });

  test('duration-unattested : Sur un terrain mortel garde sa durée Bonus de Volonté', async () => {
    const store = await banc({ culte: 'Myrmidia' });
    const preview = store.previewDivineExecution(ID('sur-un-terrain-mortel'), entree({ targetIds: ['priest', 'ally'], expiry: fin(5) }));
    assert.equal(preview.ready, true, preview.error);
    assert.equal(preview.preview.resolvedParams.duration.value, 5);
    assert.equal(preview.preview.resolvedParams.duration.unit, 'rounds');
  });

  test('Chaînes de vérité et Épée de justice : durée Bonus de Sociabilité en Rounds issue de params', () => {
    for (const id of ['divine:miracle:verena:shackles-of-truth', 'divine:miracle:verena:sword-of-justice']) {
      const c = contratParId(id);
      assert.deepEqual(c.params.duration, { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' });
      assert.equal(c.effects[0].duration.sourceParameter, 'params.duration');
    }
  });

  test('free-attack : Attaque rapide pose une attaque gratuite de Round sur le prêtre', async () => {
    const store = await banc({ culte: 'Myrmidia' });
    await lancer(store, ID('attaque-rapide'), { expiry: fin(3) });
    const couche = couches(store, 'priest').find((l) => JSON.stringify(l).includes('freeAttack') || JSON.stringify(l).includes('free-attack'));
    assert.ok(couche, 'couche de free-attack absente');
  });

  test('myrmidians et allies : règles ally et within-range, désignation libre sans plafond', async () => {
    for (const id of ['divine:miracle:devotion-de-la-guerriere', 'divine:miracle:competence-martiale']) {
      assert.deepEqual(contratParId(id).targetRules, ['ally', 'within-range']);
    }
    const store = await banc({ culte: 'Myrmidia' });
    const id = ID('competence-martiale');
    const dehors = store.previewDivineExecution(id, entree({ expiry: fin(4), targetIds: ['ally'], facts: { targets: { ally: { ally: true, withinRange: false } } } }));
    assert.equal(dehors.ready, false, 'cible hors de portée acceptée');
    const dedans = store.previewDivineExecution(id, entree({ expiry: fin(4), targetIds: ['priest', 'ally'], facts: { targets: { priest: { ally: true, withinRange: true }, ally: { ally: true, withinRange: true } } } }));
    assert.equal(dedans.ready, true, dedans.error);
  });

  test('table-roll : Malice de Ranald attend les deux Caractéristiques saisies par le MJ', async () => {
    const store = await banc({ culte: 'Ranald' });
    const id = ID('ranald:ranald-s-mischief');
    const sans = store.previewDivineExecution(id, entree({ targetIds: ['ally'], facts: { targets: { ally: { withinRange: true } } } }));
    assert.equal(sans.ready, false);
    assert.ok(JSON.stringify(sans).includes('characteristicMatch.first'));
    const avec = store.previewDivineExecution(id, entree({ targetIds: ['ally'], facts: { targets: { ally: { withinRange: true } } }, characteristicMatch: { first: 'CC', second: 'Int' } }));
    assert.equal(avec.ready, true, avec.error);
  });

  test('weapon-restriction et sword-only : arme hors classe non bloquante, classe d’arme non confirmée', async () => {
    for (const [id, culte] of [[ID('sigmar:sigmar-s-fiery-hammer'), 'Sigmar'], [ID('solkan:flaming-blade'), 'Solkan']]) {
      const store = await banc({ culte, pretre: { extensions: { v5: { divine: { sin: 0 }, corruptionPoints: 0 } }, equipment: [{ id: 'hache', name: 'Hache', kind: 'weapon' }] } });
      const preview = store.previewDivineExecution(id, entree({ facts: { weapon: { equipmentId: 'hache', classConfirmed: false } } }));
      assert.equal(preview.ready, true, `${id} : ${preview.error}`);
      const resultat = await store.applyDivineExecution(id, { preview });
      assert.equal(resultat.ready, true, resultat.error);
      assert.match(JSON.stringify(resultat), /"classConfirmed":false/, `${id} : classe d’arme non confirmée attendue`);
    }
  });

  test('pureté de Solkan : Péché ou Corruption refusés, Corruption inconnue refusée', () => {
    const pretre = (sin, corruption) => ({ extensions: { v5: { divine: { sin }, ...(corruption === undefined ? {} : { corruptionPoints: corruption }) } } });
    const test = (actor) => resolveDivineTalentRestriction(actor, { cult: 'Solkan', talentId: 'talent-bless' });
    assert.equal(test(pretre(0, 0)).allowed, true);
    assert.equal(test(pretre(1, 0)).code, 'SOLKAN_PURITY');
    assert.equal(test(pretre(0, 2)).code, 'SOLKAN_PURITY');
    const inconnue = test(pretre(0, undefined));
    assert.equal(inconnue.allowed, false);
    assert.equal(inconnue.code, 'DIVINE_DATA_REQUIRED');
  });

  test('priest-counted : le prêtre porte la Haine sans être désigné, et une seule fois s’il l’est', async () => {
    const sans = await banc();
    await lancer(sans, ID('sigmar:vanquish-the-unrighteous'), { targetIds: ['ally'], facts: { targets: { ally: { withinRange: true } } } });
    assert.equal(injectes(personne(sans, 'ally')).length, 4);
    assert.equal(injectes(personne(sans, 'priest')).length, 4, 'prêtre non désigné sans Haine');
    assert.ok(acquiredV5Talents(personne(sans, 'priest')).some((t) => t.talentId === 'talent-hatred'));

    const avec = await banc();
    await lancer(avec, ID('sigmar:vanquish-the-unrighteous'), { targetIds: ['priest', 'ally'], facts: { targets: { priest: { withinRange: true }, ally: { withinRange: true } } } });
    // Désigné, le prêtre reçoit les deux jeux d'effets (8 lignes) mais la Haine ne se cumule pas : une entrée par groupe, au rang 1.
    const haines = acquiredV5Talents(personne(avec, 'priest')).filter((t) => t.talentId === 'talent-hatred');
    assert.equal(haines.length, 4);
    assert.ok(haines.every((t) => t.rank === 1), 'Haine cumulée au-delà du rang 1');
    assert.equal(injectes(personne(avec, 'ally')).length, 4);
    for (let i = 0; i < 12; i++) await avec.nextTurn();
    assert.equal(injectes(personne(avec, 'priest')).length, 0, 'Haine du prêtre non retirée à la fin');
    assert.equal(couches(avec, 'priest').length, 0);
  });

  test('pureté de Solkan : le rappel s’affiche une fois au résultat, sans rappel de clause', async () => {
    const store = await banc({ culte: 'Solkan', pretre: { extensions: { v5: { divine: { sin: 0 }, corruptionPoints: 0 } } } });
    const preview = store.previewDivineExecution(ID('solkan:flaming-blade'), entree({ facts: { weapon: { equipmentId: 'epee', classConfirmed: true } } }));
    assert.equal(preview.ready, true, preview.error);
    const rappels = preview.preview.reminders || [];
    const purete = rappels.filter((r) => /Solkan n’accepte aucune Bénédiction/.test(r));
    assert.equal(purete.length, 1, `Rappel de pureté affiché ${purete.length} fois`);
    assert.ok(!rappels.some((r) => /Solkan refuse tout miracle/.test(r)), 'clause no-sin-corruption encore en rappel');
  });
});
