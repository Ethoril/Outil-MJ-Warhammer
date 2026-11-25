// Imperium Maledictum : blessures critiques (p. 214-216, 358-361), maladresses (p. 355),
// rôles de PNJ (p. 317) et états (p. 356-357, 197, 199).
// Exemples chiffrés du Core Book (page citée en commentaire).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  ETATS, appliquerDegats, critiquesMax, degatsEtatTour, lancerExpression,
  TABLE_MALADRESSE, TABLES_CRITIQUES, consulterMaladresse, consulterCritique
} from '../../../imperium/regles.js';

test('exemple p. 215 : Kalli (12 blessures sur 16 max) inflige 6 dégâts au Gang Leader → excédent 2, sévérité 1d10+2 = 9 → pied broyé (jambe)', () => {
  const r = appliquerDegats({ blessures: 12, blessuresMax: 16, degats: 6, role: 'chef', critiquesNonTraitees: 0, critiquesMax: 3 });
  assert.equal(r.blessures, 16); // « The first 4 Damage inflict 4 Wounds, meaning the Gang Leader reaches their Maximum Wounds », p. 215
  assert.equal(r.excedent, 2); // « The remaining 2 Damage causes a Critical Wound », p. 215
  assert.equal(r.jetEnduranceRequis, true); // à 16/16 : test de FM (Résistance à la douleur) ou inconscient, p. 214
  assert.equal(r.blesseCritiquementSeuil, true);
  assert.equal(r.critiqueDeclenche, true);
  assert.equal(r.severiteBonus, 2); // « roll 1d10 + the excess Damage », p. 215
  const severite = lancerExpression('1d10', () => 0.65) + r.severiteBonus; // « The GM gets a 7 on the die, for a total of 9 », p. 215
  assert.equal(severite, 9);
  const crit = consulterCritique('jambe-d', severite); // « struck ... in the right leg ... 9th row on the Leg Critical Wound Table », p. 215
  assert.equal(crit.id, 'pied-broye'); // Mangled Foot, p. 361
  assert.equal(crit.page, 361);
  assert.equal(crit.traitementRequis, true);
  assert.equal(crit.mortImmediate, false);
});

test('coup retenu (p. 215) : aucun critique même avec un coup critique ou un excédent', () => {
  const r1 = appliquerDegats({ blessures: 5, blessuresMax: 10, degats: 3, coupCritique: true, retenirCoups: true });
  assert.equal(r1.critiqueDeclenche, false); // « does not generate a Critical Wound, even if a Critical Hit is rolled », p. 215
  const r2 = appliquerDegats({ blessures: 9, blessuresMax: 10, degats: 3, retenirCoups: true });
  assert.equal(r2.excedent, 2);
  assert.equal(r2.critiqueDeclenche, false);
});

test('rôles de PNJ (p. 317) : Troupe hors combat dès la première blessure critique, Élite dès la deuxième', () => {
  assert.equal(critiquesMax({ E: 35 }, 'troupe'), 0);
  assert.equal(critiquesMax({ E: 35 }, 'elite'), 1);
  assert.equal(critiquesMax({ E: 35 }, 'chef'), 3); // bonus d'E, p. 88
  const troupe = appliquerDegats({ blessures: 5, blessuresMax: 10, degats: 2, coupCritique: true, role: 'troupe', critiquesMax: 0 });
  assert.equal(troupe.critiqueDeclenche, true);
  assert.equal(troupe.mortSubiteRole, true); // « Any time they would suffer a Critical Wound, they are immediately defeated », p. 317
  const elite1 = appliquerDegats({ blessures: 5, blessuresMax: 10, degats: 2, coupCritique: true, role: 'elite', critiquesNonTraitees: 0, critiquesMax: 1 });
  assert.equal(elite1.mortSubiteRole, false); // première blessure critique : survivable
  const elite2 = appliquerDegats({ blessures: 5, blessuresMax: 10, degats: 2, coupCritique: true, role: 'elite', critiquesNonTraitees: 1, critiquesMax: 1 });
  assert.equal(elite2.mortSubiteRole, true); // « if they suffer a second Critical Wound, they are immediately defeated », p. 317
  const chef = appliquerDegats({ blessures: 5, blessuresMax: 10, degats: 2, coupCritique: true, role: 'chef', critiquesMax: 3 });
  assert.equal(chef.mortSubiteRole, false);
});

test('mourant : blessures critiques non traitées > bonus d\'E → mort en fin de round (p. 88, 214-215 ; Leo, bonus d\'E 3 et 3 critiques, p. 215)', () => {
  const r = appliquerDegats({ blessures: 16, blessuresMax: 16, degats: 5, coupCritique: true, role: 'pj', critiquesNonTraitees: 3, critiquesMax: 3 });
  assert.equal(r.critiquesNonTraiteesApres, 4);
  assert.equal(r.mourant, true); // « four untreated Critical Wounds, which exceeds his Toughness Bonus », p. 215
  const ok = appliquerDegats({ blessures: 5, blessuresMax: 16, degats: 2, role: 'pj', critiquesNonTraitees: 1, critiquesMax: 3 });
  assert.equal(ok.mourant, false);
});

test('table de maladresse p. 355 : les 10 entrées, dans l\'ordre', () => {
  assert.equal(TABLE_MALADRESSE.length, 10);
  const effets = TABLE_MALADRESSE.map(e => e.effet);
  assert.deepEqual(effets, ['initiativeBas', 'desavantageTour', 'lacherArme', 'aTerre', 'vitesseLente',
    'armeInstable', 'aveugleOuAssourdi', 'armureMoins1', 'sonneOuHemorragique', 'toucheAllie']);
  for (let n = 1; n <= 10; n++) {
    const e = consulterMaladresse(n);
    assert.equal(e.min, n);
    assert.equal(e.max, n);
    assert.equal(e.page, 355);
  }
  assert.equal(consulterMaladresse(3).id, 'lacher-arme');
  assert.equal(consulterMaladresse(10).id, 'touche-allie');
});

test('tables de critiques : alias de localisation et borne au maximum de la table', () => {
  assert.equal(consulterCritique('bras-g', 7), consulterCritique('bras', 7));
  assert.equal(consulterCritique('bras-d', 7), consulterCritique('bras', 7));
  assert.equal(consulterCritique('jambe-g', 9), consulterCritique('jambe', 9));
  assert.equal(consulterCritique('jambe-d', 9).id, 'pied-broye');
  assert.equal(consulterCritique('tete', 500).id, 'crane-fracture'); // 15+ borné au max
  assert.equal(consulterCritique('corps', 999).id, 'ecartele'); // 18+
  assert.throws(() => consulterCritique('ventre', 5), RangeError);
});

test('tables de critiques : toutes les plages sont couvertes et citent leur page (p. 358-361)', () => {
  const attentes = { tete: 358, bras: 359, corps: 360, jambe: 361 };
  for (const [cle, page] of Object.entries(attentes)) {
    const table = TABLES_CRITIQUES[cle];
    const max = table[table.length - 1].max;
    let minAttendu = 1;
    for (const e of table) {
      assert.equal(e.min, minAttendu, `${cle} : trou avant ${e.id}`);
      assert.equal(e.page, page);
      assert.ok(e.nom && e.resume, `${cle}/${e.id} : nom et résumé présents`);
      minAttendu = e.max + 1;
    }
    assert.ok(max >= 15, `${cle} : entrée « + » présente`);
    for (let total = 1; total <= max + 10; total++) {
      const e = consulterCritique(cle, total);
      const borne = Math.min(max, total);
      assert.ok(borne >= e.min && borne <= e.max, `${cle} total ${total} → ${e.id}`);
    }
  }
});

test('« Aucun traitement requis » (p. 219/356) : Tête 1-2, Bras 1-2, Corps 1-2 et 5, Jambe 1-2', () => {
  const sansTraitement = [['tete', 1], ['tete', 2], ['bras', 1], ['bras', 2], ['corps', 1], ['corps', 2], ['corps', 5], ['jambe', 1], ['jambe', 2]];
  for (const [loc, total] of sansTraitement) {
    assert.equal(consulterCritique(loc, total).traitementRequis, false, `${loc} ${total}`);
  }
  // Toutes les autres entrées requièrent un traitement.
  for (const [cle, table] of Object.entries(TABLES_CRITIQUES)) {
    for (const e of table) {
      const estSansTraitement = sansTraitement.some(([l, t]) => l === cle && t >= e.min && t <= e.max);
      if (!estSansTraitement) assert.equal(e.traitementRequis, true, `${cle} ${e.id}`);
    }
  }
});

test('entrées mortelles : Tête 15+, Bras 20+, Corps 18+, Jambe 20+ (p. 358-361)', () => {
  assert.equal(consulterCritique('tete', 15).mortImmediate, true);
  assert.equal(consulterCritique('tete', 14).mortImmediate, false);
  assert.equal(consulterCritique('bras', 20).mortImmediate, true);
  assert.equal(consulterCritique('bras', 19).mortImmediate, false);
  assert.equal(consulterCritique('corps', 18).mortImmediate, true);
  assert.equal(consulterCritique('corps', 17).mortImmediate, false);
  assert.equal(consulterCritique('jambe', 20).mortImmediate, true);
  assert.equal(consulterCritique('jambe', 19).mortImmediate, false);
});

test('états (Annexe IV p. 356-357, désespéré p. 197, surpris p. 199) : ids, paliers et pages', () => {
  assert.deepEqual(ETATS.map(e => e.id),
    ['enflamme', 'hemorragique', 'aveugle', 'assourdi', 'extenue', 'effraye', 'neutralise', 'surcharge',
      'empoisonne', 'a-terre', 'entrave', 'sonne', 'inconscient', 'desespere', 'surpris']);
  const niveaux = Object.fromEntries(ETATS.map(e => [e.id, e.niveaux]));
  // Deux paliers (mineur/majeur) pour ceux décrits en Minor/Major, p. 356-357.
  for (const id of ['enflamme', 'hemorragique', 'extenue', 'effraye', 'empoisonne', 'entrave', 'sonne']) assert.equal(niveaux[id], true, id);
  for (const id of ['aveugle', 'assourdi', 'neutralise', 'surcharge', 'a-terre', 'inconscient', 'desespere', 'surpris']) assert.equal(niveaux[id], false, id);
  const pages = Object.fromEntries(ETATS.map(e => [e.id, e.page]));
  assert.equal(pages['enflamme'], 356);
  assert.equal(pages['hemorragique'], 356);
  assert.equal(pages['aveugle'], 356);
  assert.equal(pages['assourdi'], 356);
  assert.equal(pages['extenue'], 356);
  assert.equal(pages['effraye'], 357);
  assert.equal(pages['neutralise'], 357);
  assert.equal(pages['surcharge'], 357);
  assert.equal(pages['empoisonne'], 357);
  assert.equal(pages['a-terre'], 357);
  assert.equal(pages['entrave'], 357);
  assert.equal(pages['sonne'], 357);
  assert.equal(pages['inconscient'], 357);
  assert.equal(pages['desespere'], 197);
  assert.equal(pages['surpris'], 199);
});

test('dégâts d\'état par tour (p. 356) : Enflammé 1d5/1d10 en début de tour, Hémorragique 1/3 en fin de tour, 0 sinon', () => {
  const max = e => lancerExpression(e, () => 0.99);
  assert.equal(degatsEtatTour('enflamme', 'mineur', max), 5); // 1d5, p. 356
  assert.equal(degatsEtatTour('enflamme', 'majeur', max), 10); // 1d10, p. 356
  assert.equal(degatsEtatTour('hemorragique', 'mineur'), 1); // p. 356
  assert.equal(degatsEtatTour('hemorragique', 'majeur'), 3); // p. 356
  assert.equal(degatsEtatTour('aveugle', 'mineur', max), 0);
  assert.equal(degatsEtatTour('sonne', 'majeur', max), 0);
});
