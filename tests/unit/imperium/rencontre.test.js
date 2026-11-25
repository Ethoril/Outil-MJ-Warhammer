// Imperium Maledictum : moteur de rencontre pur (état -> état, dés injectés), chapitre VII Combat.
// Tous les exemples chiffrés viennent du Core Book (page citée en commentaire ; page PDF = page imprimée) :
// profils PNJ p. 327 (Exécuteur), 323 (Serviteur), 340 (Ganger) ; Sœur Helza p. 211 (Mêlée 42, F 37) ;
// formules p. 50 (bonus), 88 (blessures max, initiative, critiques max) ; règles p. 123-125 (munitions, traits),
// 186-190 (tests), 196-199 (Supériorité, Initiative, surprise), 204-213 (couvert, actions, attaques, critiques),
// 214-216 (blessures, critiques, mort), 219 (soins), 220 (Destin), 317-318 (rôles, Résolution), 355-361 (tables).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  VERSION_RENCONTRE, composerRencontre, reporterSurReserve,
  commencerRound, resoudreEgaliteInitiative, passerTour, ajusterSuperiorite,
  attaquerMelee, attaquerDistance, choisirInversion, trancherEgalite,
  testLibre, testOppose, depenserDestin, brulerDestin,
  viser, seMettreACouvert, seDesengager, prendreInitiative, recharger, aider, fuir,
  premiersSoins, traiterCritique, appliquerEtat,
  deplacerZone, definirTraitsZone, engager, desengager,
  participant, acteurCourant
} from '../../../imperium/rencontre.js';
import { reserveDeDepart } from '../../../imperium/donnees-depart.js';
import { ajouterProfil, modifierProfil, trouverProfil } from '../../../imperium/profils.js';

/** Fournisseur de dés scriptés : un appel par dé ; dé manquant -> RangeError (comme dans cthulhu). */
function desScriptes({ d100 = [], lancer = [] } = {}) {
  const jets = [...d100], valeurs = [...lancer];
  return {
    d100(meta) {
      const e = jets.shift();
      if (e === undefined) throw new RangeError(`d100 non scripté demandé (${JSON.stringify(meta)})`);
      return typeof e === 'number' ? e : { jet: e.jet };
    },
    lancer(expression) {
      if (/^[+-]?\d+$/.test(String(expression).trim())) return Number(expression);
      const e = valeurs.shift();
      if (!e) throw new RangeError(`lancer non scripté demandé (${expression})`);
      assert.equal(e[0], expression, 'expression de dé inattendue');
      return e[1];
    },
    restants: () => ({ d100: jets.length, lancer: valeurs.length })
  };
}

/** Applique fn à l'état sans jamais le mutate : vérifie la pureté à chaque action. */
function pur(s, fn) {
  const snapshot = JSON.stringify(s);
  const r = fn(s);
  assert.equal(JSON.stringify(s), snapshot, 'l’état passé en paramètre ne doit pas être muté');
  return r;
}

/** Réserve de départ + une PJ, Sœur Helza (exemple p. 211 : Mêlée 42, F 37). */
function reserveAvecHelza(suivi = undefined) {
  let r = reserveDeDepart();
  r = ajouterProfil(r, {
    id: 'helza', nom: 'Sœur Helza', kind: 'PJ', camp: 'pj',
    taille: 'moyenne', vitesse: 'normale',
    // p. 211 : Mêlée 42, F 37 ; le reste est un profil cohérent avec la formule p. 88
    carac: { CC: 40, CT: 40, F: 37, E: 40, Ag: 40, Int: 40, Per: 40, FM: 51, Soc: 40 },
    competences: { Mêlée: 42, Tir: 40, Réflexes: 50, Endurance: 50, Médecine: 40, Discrétion: 40 },
    armure: 2, armes: ['epee', 'pistolet-laser'], resolution: 3, destinMax: 3,
    suivi,
    source: 'Core Book p. 211 (exemple Sœur Helza : Mêlée 42, F 37)'
  });
  return r;
}

const ZONES2 = [{ id: 'zone-1', nom: 'Zone 1', traits: [] }, { id: 'zone-2', nom: 'Zone 2', traits: [] }];

// ---------------------------------------------------------------------------
// Scénario multi-rounds complet
// ---------------------------------------------------------------------------

test('scénario multi-rounds complet : surprise, initiative, mêlée + inversion, tir Rafale + Couvert + Esquive, Supériorité + Désespéré, blessures max + Endurance, mort subite Troupe, Maladresse + Reliable, Destin, états de tour, report', () => {
  const reserve = reserveAvecHelza();
  const des = desScriptes({
    // ..., 44 = attaque matraque, 80 = Endurance (Douleur) repete apres la matraque (p. 214-215), 20 = tir round 4
    d100: [72, 96, 35, 33, 85, 24, 61, 15, 90, 88, 99, 44, 80, 20],
    // 1d10 : severite ganger(3), loc helza(2), severite helza(4), severite exec(7),
    // table maladresse revolver(5), Reliable revolver(6), loc matraque(6), severite matraque(6) ; 1d5 : Enflamme(4)
    lancer: [['1d10', 3], ['1d10', 2], ['1d10', 4], ['1d10', 7], ['1d10', 5], ['1d10', 6], ['1d10', 6], ['1d10', 6], ['1d5', 4]]
  });
  let s = composerRencontre(reserve, ['helza', 'ganger', 'ganger', 'executeur'], {
    zones: ZONES2, superioriteInitiale: 1, surprise: 'pj' // p. 199
  });
  assert.equal(VERSION_RENCONTRE, 1);
  assert.equal(s.superiorite, 1);
  assert.equal(s.roundSurprise, true); // p. 199
  assert.deepEqual(participant(s, 'ganger').etats, [{ id: 'surpris' }]); // p. 199 : le camp surpris est Surpris
  assert.equal(participant(s, 'ganger-2').nom, 'Ganger 2'); // PNJ multipliable
  const h0 = participant(s, 'helza');
  assert.equal(h0.blessuresMax, 16); // p. 88 : BF 3 + 2*BE 4 + BFM 5 (F 37, E 40, FM 51)
  assert.equal(h0.initiative, 8); // p. 198 : BP 4 + BAg 4 (Per 40, Ag 40)
  assert.equal(h0.critiquesMax, 4); // p. 88 : bonus d'E
  assert.equal(h0.destin, 3); // p. 220 : 3 points de Destin au départ
  assert.deepEqual(h0.munitionsParArme, { epee: 0, 'pistolet-laser': 4 }); // chargeurs pleins, p. 123

  // --- Round 0 (surprise, p. 199) : seule la PJ agit, dans l'ordre d'Initiative ---
  s = pur(s, st => commencerRound(st));
  assert.equal(s.round, 0);
  assert.deepEqual(s.ordre, ['helza']);
  assert.equal(s.enAttente, null);

  // Mêlée surprise : Avantage (p. 199 + p. 211 cible qui n'oppose pas) -> inversion facultative (p. 189)
  s = pur(s, st => attaquerMelee(st, { id: 'helza', cibleId: 'ganger', armeId: 'epee' }, des)); // 72
  assert.equal(s.enAttente?.type, 'inversion');
  assert.deepEqual(s.enAttente.inversions.map(i => i.cote), ['attaque']);
  // Garde refuserSiEnAttente : toute autre action est refusée, seule une note d'erreur est ajoutée
  const bloque = attaquerDistance(s, { id: 'helza', cibleId: 'executeur', armeId: 'pistolet-laser' }, des);
  assert.equal(bloque.enAttente, s.enAttente);
  assert.deepEqual(bloque.participants, s.participants);
  assert.equal(bloque.journal.at(-1).type, 'erreur');
  assert.deepEqual(passerTour(s).participants, s.participants);
  // p. 189 : on choisit d'inverser 72 -> 27 (DR +3 contre seuil effectif 42+10, p. 188)
  s = pur(s, st => choisirInversion(st, 'reverse', des));
  assert.equal(s.enAttente, null);
  const ganger = participant(s, 'ganger');
  assert.equal(ganger.etat, 'vaincu'); // p. 216, 317 : une Troupe tombe sur une blessure critique
  assert.equal(ganger.blessures, 6); // p. 211 : 2+BF3 + DR3 - armure 2 = 6 (épée 2+BF p. 128, F 37 -> BF 3 p. 50)
  assert.equal(ganger.critiques.length, 1); // critique auto (cible surprise, p. 199, 214)
  assert.equal(ganger.critiques[0].severite, 3); // 1d10 = 3, p. 215
  assert.equal(s.superiorite, 2); // p. 197 : >= Résolution (1) Troupes vaincues dans le round -> +1
  assert.ok(s.engages.some(e => e[0] === 'ganger' && e[1] === 'helza')); // p. 212 : engagement auto

  // Fin du round de surprise : +1 Supériorité (p. 199), 'surpris' retiré ; round 1, ordre par Initiative (p. 198)
  s = pur(s, st => passerTour(st, des));
  assert.equal(s.round, 1);
  assert.equal(s.superiorite, 3);
  assert.ok(!participant(s, 'ganger-2').etats.some(e => e.id === 'surpris'));
  assert.deepEqual(s.ordre, ['helza', 'ganger-2', 'executeur']); // init 8, 7 (p. 340), 6 (p. 327, initiativeFixe)

  // --- Round 1 : test libre, puis Destin dépensé (relancer + +1 DR, p. 220) ---
  s = pur(s, st => testLibre(st, { id: 'helza', competence: 'Discrétion', caracFallback: 'Ag' }, des)); // 96 -> échec (p. 188)
  assert.equal(s.dernierTest.ap.reussi, false);
  s = pur(s, st => depenserDestin(st, 'helza', 'relancer', {}, des)); // 35 -> DR +1
  assert.equal(s.dernierTest.ap.reussi, true);
  assert.equal(s.dernierTest.ap.dr, 1);
  assert.equal(participant(s, 'helza').destin, 2);
  s = pur(s, st => depenserDestin(st, 'helza', 'plus1DR')); // p. 220 : +1 DR après le jet
  assert.equal(s.dernierTest.ap.dr, 2);
  assert.equal(participant(s, 'helza').destin, 1);

  // ganger-2 : Désespéré (p. 197, 318 : Supériorité 3 > Résolution 1) ; attaque de mêlée, 33 = double = critique (p. 213)
  s = pur(s, st => passerTour(st, des));
  assert.ok(participant(s, 'ganger-2').etats.some(e => e.id === 'desespere'));
  assert.equal(acteurCourant(s).id, 'ganger-2');
  s = pur(s, st => attaquerMelee(st, { id: 'ganger-2', cibleId: 'helza', armeId: 'couteau' }, des)); // 33 att, 85 def
  const h1 = participant(s, 'helza');
  assert.equal(h1.blessures, 6); // p. 211 : 0+BF3 + diff DR 5 - armure 2 = 6 (couteau 0+BF p. 128, F 30 -> BF 3)
  assert.equal(h1.critiques.length, 1); // p. 213 : double + DR positif = critique (localisation 1d10 = 2 -> bras-g, p. 211)
  assert.equal(h1.critiques[0].localisation, 'bras-g');
  assert.equal(h1.critiques[0].severite, 4);
  assert.equal(s.superiorite, 2); // p. 197 : première critique d'un PJ -> -1

  // executeur se met à couvert (p. 204, 210) ; sup 2 = res 2 -> pas Désespéré (p. 197)
  s = pur(s, st => passerTour(st, des));
  assert.equal(acteurCourant(s).id, 'executeur');
  assert.ok(!participant(s, 'executeur').etats.some(e => e.id === 'desespere'));
  s = pur(s, st => seMettreACouvert(st, { id: 'executeur', couvert: 'moyen' })); // +4 contre le tir, p. 204
  assert.equal(participant(s, 'executeur').couvertActif, 'moyen');

  // --- Round 2 : tir Rafale (Burst +1 DR, -1 mun, p. 124) + Supériorité (DR +2, p. 196) + Esquive (p. 212) + Couvert (p. 204) ---
  s = pur(s, st => passerTour(st, des));
  assert.equal(s.round, 2);
  s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'executeur', armeId: 'pistolet-laser', mode: 'rafale', utiliserSuperiorite: true }, des)); // 24 att, 61 esquive
  const e1 = participant(s, 'executeur');
  assert.equal(e1.blessures, 1); // p. 212 : 5 + DR5 - (armure 5 + couvert 4) = 1 ; loc 4 = jambe-g (p. 211)
  assert.equal(e1.reactionUtilisee, true); // p. 212 : la Réaction d'esquive est consommée
  assert.equal(participant(s, 'helza').munitionsParArme['pistolet-laser'], 3); // p. 123-124 : rafale -1 mun
  assert.equal(participant(s, 'helza').superioriteUtiliseeCeTour, true); // p. 196 : une fois par tour
  // fin de tour de helza : Hémorragique mineur (critique p. 359) = 1 dégât ignorant l'armure (p. 356)
  s = pur(s, st => passerTour(st, des));
  assert.equal(participant(s, 'helza').blessures, 7); // 6 + 1, p. 356

  // ganger-2 fuit : hors de combat ; un ennemi qui fuit est vaincu (p. 197), donc +1 Supériorité
  // (Troupe, Résolution 1 atteinte ce round) au lieu d'un -1 réservé aux membres du groupe PJ (p. 197, 208)
  s = pur(s, st => fuir(st, { id: 'ganger-2' }));
  assert.equal(participant(s, 'ganger-2').etat, 'fui');
  assert.equal(s.superiorite, 3);

  // executeur, Tir rapide (Rapid Fire 3 : -3 mun, Avantage + +3 dégâts, p. 125) ; blessures max atteintes (p. 214)
  s = pur(s, st => passerTour(st, des));
  s = pur(s, st => attaquerDistance(st, { id: 'executeur', cibleId: 'helza', armeId: 'fusil-automatique', mode: 'rapide-degats' }, des)); // 15 att, 90 esquive, 88 endurance
  const h2 = participant(s, 'helza');
  assert.equal(h2.blessures, 16); // p. 214 : 7+10 = 17 plafonné à 16 ; dégâts 6+3+3-2 = 10 (loc 5 = jambe-d)
  assert.equal(h2.critiques.length, 2); // excédent 1 -> critique (p. 215), sévérité 1d10+1 = 8
  assert.equal(h2.critiques[1].severite, 8);
  assert.equal(h2.etat, 'inconscient'); // p. 214 : test d'Endurance (Douleur) échoué (88) -> Inconscient, p. 357
  assert.ok(h2.etats.some(e => e.id === 'a-terre')); // p. 357
  assert.equal(participant(s, 'executeur').munitionsParArme['fusil-automatique'], 2); // 5-3, p. 125

  // --- Round 3 : executeur contre helza inconsciente (pas d'opposition, p. 199, 357) ---
  s = pur(s, st => passerTour(st, des));
  assert.equal(s.round, 3);
  assert.equal(acteurCourant(s).id, 'executeur'); // helza inconsciente : son tour est sauté
  // revolver : 99 = maladresse auto (p. 188, 213) ; table 1d10=5 puis Reliable 1d10=6 >= 4 -> résultat ignoré (p. 125)
  // p. 357 : à distance, aucune critique automatique contre une cible Inconsciente (mêlée seulement) ;
  // p. 214-215 : seule une attaque réussie contre un ennemi surpris est un critique auto -> ici, aucune critique
  s = pur(s, st => attaquerDistance(st, { id: 'executeur', cibleId: 'helza', armeId: 'revolver-automatique' }, des)); // 99
  assert.equal(s.enAttente, null); // p. 189 : 99 inversé vaut 99, aucune inversion n'est proposée
  assert.equal(participant(s, 'helza').critiques.length, 2); // aucune critique sur un tir raté (p. 213-215, 357)
  assert.ok(s.journal.some(j => j.texte.includes('Reliable'))); // p. 125
  assert.equal(participant(s, 'executeur').munitionsParArme['revolver-automatique'], 5); // 6-1, p. 123 (pas Burst/RF)
  // matraque : 44 = double + succès -> critique (p. 213), DR +1 ; dégâts 2+BF4+1-2 = 5, excédent 5 -> sévérité 1d10+5 = 11 (p. 215) ; Inflict (Sonné) p. 124, 128
  // p. 357 : en mêlée, une cible Inconsciente subit un critique automatique sur l'attaque qui touche
  // p. 214-215 : helza est déjà à son maximum de blessures et reçoit encore des dégâts -> nouveau test
  // d'Endurance (Douleur) exigé (le test se répète à chaque coup qui blesse, p. 214-215) : 80 -> échec, elle reste inconsciente
  s = pur(s, st => attaquerMelee(st, { id: 'executeur', cibleId: 'helza', armeId: 'electro-matraque' }, des)); // 44 puis 80 (Endurance)
  const h3 = participant(s, 'helza');
  assert.equal(h3.blessures, 16); // plafonné au max, p. 214
  assert.equal(h3.critiques.length, 3);
  assert.equal(h3.critiques.at(-1).severite, 11); // 6 + 5 d'excédent
  assert.ok(h3.etats.some(e => e.id === 'sonne')); // Inflict (Sonné), p. 124

  // --- Round 4 : Destin brûlé « L'Empereur vous protège » (p. 220) ---
  s = pur(s, st => passerTour(st, des));
  s = pur(s, st => brulerDestin(st, 'helza', 'eviterDegats'));
  assert.equal(participant(s, 'helza').destinBrule, 1);
  assert.equal(participant(s, 'helza').destin, 1); // min(1, 3-1), p. 220
  assert.equal(participant(s, 'helza').eviterDegatsActif, true);
  // L'exécuteur est toujours engagé avec helza (matraque du round 3, p. 212) : un tir au fusil (sans trait
  // Rapprochée, p. 133) à portée Immédiate lui vaudrait un Désavantage (p. 212), qui annulerait l'Avantage
  // contre une cible inconsciente (p. 214, 357) une pour une (p. 189) -> aucune inversion ne serait proposée.
  // Il se désengage d'abord (p. 207 : hors de portée Immédiate, plus engagé) et tire depuis sa Zone (courte,
  // le fusil est Longue, p. 133) : l'Avantage (p. 214) demeure -> inversion facultative proposée (p. 189).
  s = pur(s, st => seDesengager(st, { id: 'executeur', cibleId: 'helza' })); // p. 207
  s = pur(s, st => attaquerDistance(st, { id: 'executeur', cibleId: 'helza', armeId: 'fusil-automatique' }, des)); // 20 -> on garde 20 (p. 189)
  assert.equal(s.enAttente?.type, 'inversion');
  s = pur(s, st => choisirInversion(st, 'keep', des));
  const h4 = participant(s, 'helza');
  assert.equal(h4.blessures, 16); // aucun dégât, p. 220
  assert.equal(h4.critiques.length, 3); // aucun effet non plus
  assert.equal(h4.eviterDegatsActif, false); // consommé
  assert.equal(participant(s, 'executeur').munitionsParArme['fusil-automatique'], 2); // p. 123 : arme Rapid Fire, tir normal = 0 mun

  // États de début/fin de tour (p. 356) : Hémorragique majeur en fin de tour, Enflammé mineur en début de tour
  s = pur(s, st => appliquerEtat(st, { id: 'executeur', etat: 'hemorragique', niveau: 'majeur' }));
  s = pur(s, st => appliquerEtat(st, { id: 'executeur', etat: 'enflamme', niveau: 'mineur' }));
  s = pur(s, st => passerTour(st, des)); // fin de tour exec : 3 dégâts (p. 356) ; fin round 4 -> round 5, début de tour exec : 1d5 = 4 (p. 356)
  assert.equal(s.round, 5);
  assert.equal(participant(s, 'executeur').blessures, 1 + 3 + 4);

  // Destin dépensé « retirerEtat » (p. 220) : À terre retiré -> regagne 1 blessure
  s = pur(s, st => depenserDestin(st, 'helza', 'retirerEtat', { etat: 'a-terre' }));
  const h5 = participant(s, 'helza');
  assert.equal(h5.blessures, 15);
  assert.ok(!h5.etats.some(e => e.id === 'a-terre'));
  assert.equal(h5.destin, 0);

  // Report sur la réserve : blessures, critiques, destin, destinBrule, etats des PJ
  const reserve2 = pur(reserve, r => reporterSurReserve(r, s));
  const helzaR = trouverProfil(reserve2, 'helza');
  assert.equal(helzaR.suivi.blessures, 15);
  assert.equal(helzaR.suivi.critiques.length, 3);
  assert.equal(helzaR.suivi.destin, 0);
  assert.equal(helzaR.suivi.destinBrule, 1);
  assert.deepEqual(helzaR.suivi.etats, h5.etats);

  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 }); // exactement un appel par dé demandé
});

// ---------------------------------------------------------------------------
// Composition, ordre de tour, égalités
// ---------------------------------------------------------------------------

test('composition : PJ unique, erreurs explicites, Supériorité plafonnée à 3 (p. 196)', () => {
  const reserve = reserveAvecHelza();
  assert.throws(() => composerRencontre(reserve, ['helza', 'helza']), RangeError); // un PJ n'apparaît qu'une fois
  assert.throws(() => composerRencontre(reserve, ['inconnu']), RangeError);
  assert.throws(() => composerRencontre(reserve, []), RangeError);
  assert.throws(() => composerRencontre(reserve, ['helza'], { surprise: 'x' }), RangeError);
  assert.throws(() => composerRencontre(reserve, [{ id: 'helza', zoneId: 'zone-x' }], { zones: ZONES2 }), RangeError);
  assert.equal(composerRencontre(reserve, ['helza', 'ganger'], { superioriteInitiale: 9 }).superiorite, 3); // p. 196 : max +3
  assert.equal(composerRencontre(reserve, ['helza', 'ganger'], { superioriteInitiale: -2 }).superiorite, 0);
});

test('égalité d’initiative exacte -> test opposé tranché par le MJ (p. 198)', () => {
  const reserve = reserveAvecHelza();
  let s = composerRencontre(reserve, ['ganger', 'ganger']); // deux gangers : init 7, Ag 40 (p. 340, 88, 198)
  s = commencerRound(s);
  assert.equal(s.enAttente?.type, 'egalite-init');
  assert.deepEqual([s.enAttente.a, s.enAttente.b].sort(), ['ganger', 'ganger-2']);
  s = resoudreEgaliteInitiative(s, 'ganger-2');
  assert.equal(s.enAttente, null);
  assert.deepEqual(s.ordre, ['ganger-2', 'ganger']);
  // variante : ordreEgalites accepté directement par commencerRound
  let s2 = composerRencontre(reserve, ['ganger', 'ganger']);
  s2 = commencerRound(s2, { ordreEgalites: { 'ganger|ganger-2': 'ganger' } });
  assert.equal(s2.enAttente, null);
  assert.deepEqual(s2.ordre, ['ganger', 'ganger-2']);
});

test('test opposé et égalité parfaite tranchée (p. 190)', () => {
  const reserve = reserveAvecHelza();
  const des = desScriptes({ d100: [50, 50, 30, 70, 50, 50, 30, 70] });
  let s = composerRencontre(reserve, ['ganger', 'ganger']);
  s = commencerRound(s, { ordreEgalites: { 'ganger|ganger-2': 'ganger' } });
  // DR identiques (-1) et même seuil (Mêlée 40, p. 340) -> égalité parfaite -> trancherEgalite
  s = pur(s, st => testOppose(st, { idA: 'ganger', competenceA: 'Mêlée', idB: 'ganger-2', competenceB: 'Mêlée' }, des));
  assert.equal(s.enAttente?.type, 'egalite');
  s = trancherEgalite(s, 'b');
  assert.equal(s.enAttente, null);
  assert.equal(s.dernierOppose.res.gagnant, 'ganger-2');
  // DR différents : gagnant direct, 30 -> +1 vs 70 -> -3, diff 4 (p. 190)
  s = pur(s, st => testOppose(st, { idA: 'ganger', competenceA: 'Mêlée', idB: 'ganger-2', competenceB: 'Mêlée' }, des));
  assert.equal(s.enAttente, null);
  assert.equal(s.dernierOppose.res.gagnant, 'ganger');
  assert.equal(s.dernierOppose.res.drNet, 4);
  // nouvelle égalité -> 'relancer' rejoue les deux tests (p. 190) : 30 -> +1 vs 70 -> -3
  s = pur(s, st => testOppose(st, { idA: 'ganger', competenceA: 'Mêlée', idB: 'ganger-2', competenceB: 'Mêlée' }, des));
  assert.equal(s.enAttente?.type, 'egalite');
  s = trancherEgalite(s, 'relancer', des);
  assert.equal(s.enAttente, null);
  assert.equal(s.dernierOppose.res.gagnant, 'ganger');
  assert.equal(s.dernierOppose.res.drNet, 4);
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
});

test('surprise ennemie : -1 Supériorité (min 0) en fin de round de surprise (p. 197, 199)', () => {
  const reserve = reserveAvecHelza();
  let s = composerRencontre(reserve, ['helza', 'ganger'], { superioriteInitiale: 0, surprise: 'ennemi' });
  assert.ok(participant(s, 'helza').etats.some(e => e.id === 'surpris')); // p. 199
  s = commencerRound(s);
  assert.equal(s.round, 0);
  assert.deepEqual(s.ordre, ['ganger']); // seul le camp surprenant agit, p. 199
  s = pur(s, st => passerTour(st));
  assert.equal(s.superiorite, 0); // -1, minimum 0, p. 197, 199
  assert.ok(!participant(s, 'helza').etats.some(e => e.id === 'surpris'));
});

// ---------------------------------------------------------------------------
// Critiques, mort, Résolution
// ---------------------------------------------------------------------------

test('élite vaincue par sa 2e critique non traitée (p. 317) et +1 Supériorité (p. 197)', () => {
  const reserve = reserveAvecHelza();
  // sévérités 3 (Lacération) et 9 (Hanche fracturée) : deux critiques exigeant un traitement (p. 360) -> 2 non traitées
  const des = desScriptes({ d100: [22, 22, 80], lancer: [['1d10', 6], ['1d10', 3], ['1d10', 7], ['1d10', 9]] });
  let s = composerRencontre(reserve, ['helza', 'executeur'], { surprise: 'pj' }); // exec surpris, p. 199
  s = commencerRound(s);
  // round 0 : attaque surprise, pas d'opposition, critique auto (p. 199, 214) ; 22 = double = critique aussi (p. 213)
  s = pur(s, st => attaquerMelee(st, { id: 'helza', cibleId: 'executeur', armeId: 'epee' }, des));
  const e0 = participant(s, 'executeur');
  assert.equal(e0.critiques.length, 1);
  assert.equal(e0.etat, 'actif'); // p. 317 : une Élite encaisse sa 1re critique (critiquesMax 1, p. 88)
  assert.equal(e0.blessures, 3); // 2+BF3 + DR3 - armure 5 = 3, p. 211 (armure 5, p. 327)
  s = pur(s, st => passerTour(st, des)); // fin du round de surprise : +1 sup (p. 199)
  assert.equal(s.superiorite, 1);
  // round 1 : attaque normale, double 22 = critique (p. 213) ; défense 80 = échec
  s = pur(s, st => attaquerMelee(st, { id: 'helza', cibleId: 'executeur', armeId: 'epee' }, des));
  const e1 = participant(s, 'executeur');
  assert.equal(e1.critiques.length, 2);
  assert.equal(e1.etat, 'vaincu'); // p. 317 : 2e critique -> vaincu
  assert.equal(s.superiorite, 2); // p. 197 : Élite vaincue -> +1
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
});

test('mourant meurt en fin de round (p. 215) ; « Vivre un autre jour » brûlé (p. 220) sauve', () => {
  const crit = { id: 'laceration', nom: 'Lacération', localisation: 'corps', severite: 3, traitementRequis: true, traitee: false, mortImmediate: false, blessure: null, page: 360 };
  const suivi = { blessures: 10, critiques: [crit, { ...crit }, { ...crit }, { ...crit }], destin: 3, destinBrule: 0, etats: [] }; // 4 critiques non traitées = max (p. 88)
  const reserve = reserveAvecHelza(suivi);
  // sans Destin brûlé : la 5e critique -> Mourant (p. 215), mort en fin de round
  const des = desScriptes({ d100: [45, 30], lancer: [['1d10', 8]] });
  let s = composerRencontre(reserve, ['helza', 'executeur'], { surprise: 'ennemi' }); // helza surprise, p. 199
  s = commencerRound(s);
  assert.deepEqual(s.ordre, ['executeur']);
  s = pur(s, st => attaquerMelee(st, { id: 'executeur', cibleId: 'helza', armeId: 'electro-matraque' }, des)); // 45 att, 30 endurance
  const h = participant(s, 'helza');
  assert.equal(h.critiques.length, 5);
  assert.equal(h.etat, 'mourant'); // p. 215 : critiques non traitées 5 > bonus d'E 4
  s = pur(s, st => passerTour(st, des)); // fin de round : le Mourant meurt, p. 215
  assert.equal(participant(s, 'helza').etat, 'mort');
  // avec « Vivre un autre jour » : hors de combat au lieu de mourir, p. 220
  const des2 = desScriptes({ d100: [45, 30], lancer: [['1d10', 8]] });
  let s2 = composerRencontre(reserve, ['helza', 'executeur'], { surprise: 'ennemi' });
  s2 = commencerRound(s2);
  s2 = brulerDestin(s2, 'helza', 'survie');
  assert.equal(participant(s2, 'helza').destinSurvie, true);
  assert.equal(participant(s2, 'helza').destinBrule, 1);
  s2 = pur(s2, st => attaquerMelee(st, { id: 'executeur', cibleId: 'helza', armeId: 'electro-matraque' }, des2));
  assert.equal(participant(s2, 'helza').etat, 'mourant');
  s2 = pur(s2, st => passerTour(st, des2));
  const h2 = participant(s2, 'helza');
  assert.equal(h2.etat, 'inconscient'); // p. 220 : au lieu de mourir, mis hors de combat
  assert.equal(h2.destinSurvie, false); // consommé
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  assert.deepEqual(des2.restants(), { d100: 0, lancer: 0 });
});

test('serviteur sans Résolution (null, p. 323) ne devient jamais Désespéré (p. 197)', () => {
  const reserve = reserveAvecHelza();
  let s = composerRencontre(reserve, ['helza', 'serviteur'], { superioriteInitiale: 3 }); // p. 196 : max +3
  s = commencerRound(s);
  assert.deepEqual(s.ordre, ['helza', 'serviteur']); // init 8 vs 3 (p. 88, 323)
  s = pur(s, st => passerTour(st)); // début de tour du serviteur, Supériorité 3
  assert.equal(acteurCourant(s).id, 'serviteur');
  // p. 323 : Résolution « voir traits » lue comme null -> jamais Désespéré, même avec Supériorité 3
  assert.ok(!participant(s, 'serviteur').etats.some(e => e.id === 'desespere'));
});

// ---------------------------------------------------------------------------
// Munitions, portée, viser, recharge
// ---------------------------------------------------------------------------

test('munitions (p. 123-125) : Burst/Rapid Fire gratuits en tir normal, rafale -1, Rapid Fire -X, recharge', () => {
  const reserve = reserveAvecHelza();
  // la Réaction d'esquive ne sert qu'une fois par tour (p. 199, 212) : le 2e tir n'a pas de jet d'esquive
  const des = desScriptes({ d100: [40, 60, 40] });
  let s = composerRencontre(reserve, ['helza', 'ganger'], { zones: ZONES2 });
  s = commencerRound(s); // ordre : helza (8), ganger (7)
  // tir normal d'une arme Burst (pistolet-laser, p. 132) : 0 mun (p. 123) ; 40 -> +0, esquive 60 échec, dégâts 5+0-2 = 3
  s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'ganger', armeId: 'pistolet-laser', mode: 'normal' }, des));
  assert.equal(participant(s, 'helza').munitionsParArme['pistolet-laser'], 4); // p. 123
  assert.equal(participant(s, 'ganger').blessures, 3);
  // rafale (Burst) : +1 DR, -1 mun (p. 124) ; 40 -> DR +1, esquive 60 échec, dégâts 5+1-2 = 4
  s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'ganger', armeId: 'pistolet-laser', mode: 'rafale' }, des));
  assert.equal(participant(s, 'helza').munitionsParArme['pistolet-laser'], 3); // p. 124
  assert.equal(participant(s, 'ganger').blessures, 7);
  // recharge (p. 207) : chargeur rempli (4, p. 132)
  s = pur(s, st => recharger(st, { id: 'helza', armeId: 'pistolet-laser' }));
  assert.equal(participant(s, 'helza').munitionsParArme['pistolet-laser'], 4);
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
});

test('munitions (p. 125) : Rapid Fire exige un chargeur >= rating ; Supercharge double les munitions', () => {
  const reserve = reserveAvecHelza();
  // Rapid Fire (3) avec 2 munitions -> attaque refusée (p. 125)
  let s = composerRencontre(reserve, ['helza', 'executeur'], { surprise: 'ennemi' });
  s = commencerRound(s); // round 0 : seul exec agit
  s = { ...s, participants: s.participants.map(p => p.id === 'executeur' ? { ...p, munitionsParArme: { ...p.munitionsParArme, 'fusil-automatique': 2 } } : p) };
  const r = attaquerDistance(s, { id: 'executeur', cibleId: 'helza', armeId: 'fusil-automatique', mode: 'rapide-degats' }, desScriptes({}));
  assert.equal(r.journal.at(-1).type, 'erreur'); // munitions insuffisantes, p. 125
  assert.deepEqual(r.participants, s.participants); // rien n'a changé
  // Supercharge (4) du pistolet plasma (p. 133) : +4 dégâts, 2 munitions (doublées, p. 125)
  let r2 = reserveAvecHelza();
  r2 = modifierProfil(r2, 'helza', { armes: ['epee', 'pistolet-plasma'] });
  const des = desScriptes({ d100: [30, 70] });
  let s2 = composerRencontre(r2, ['helza', 'executeur'], { zones: ZONES2 });
  s2 = commencerRound(s2);
  s2 = pur(s2, st => attaquerDistance(st, { id: 'helza', cibleId: 'executeur', armeId: 'pistolet-plasma', mode: 'surcharger' }, des));
  // 30 -> DR +1 ; esquive 70 -> échec ; Penetrating (6) ignore l'armure 5 (p. 125, 327) -> dégâts 10+4+1-0 = 15
  assert.equal(participant(s2, 'helza').munitionsParArme['pistolet-plasma'], 4); // 6-2, p. 125
  assert.equal(participant(s2, 'executeur').blessures, 15); // max 16 (p. 327), pas de test d'Endurance (p. 214)
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
});

test('portée (p. 202, 212) et Viser (p. 207)', () => {
  const reserve = reserveAvecHelza();
  // Réaction d'esquive une fois par tour (p. 199, 212) : le 2e tir (après Viser) n'a pas de jet d'esquive
  const des = desScriptes({ d100: [25, 60, 25] });
  let s = composerRencontre(reserve, [{ id: 'helza', zoneId: 'zone-1' }, { id: 'ganger', zoneId: 'zone-3' }], {
    zones: [{ id: 'zone-1', nom: 'Z1', traits: [] }, { id: 'zone-2', nom: 'Z2', traits: [] }, { id: 'zone-3', nom: 'Z3', traits: [] }]
  });
  s = commencerRound(s);
  // pistolet-laser portée Moyenne (p. 132) ; cible à 2 zones = Longue (p. 202) -> hors portée : Désavantage (p. 212)
  // 25 -> inversé en 52 (Désavantage imposé, p. 189) ; esquive 60 échec ; tir raté (DR -1)
  s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'ganger', armeId: 'pistolet-laser' }, des));
  assert.ok(s.journal.some(j => j.texte.includes(' 52 :'))); // jet appliqué 52
  assert.equal(participant(s, 'ganger').blessures, 0);
  // Viser (p. 207) : portée +1 cran au prochain tir -> plus de Désavantage
  s = pur(s, st => viser(st, { id: 'helza' }));
  assert.equal(participant(s, 'helza').viseeActive, true);
  s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'ganger', armeId: 'pistolet-laser' }, des)); // 25 gardé, esquive 60
  assert.ok(s.journal.some(j => j.texte.includes(' 25 :')));
  assert.equal(participant(s, 'ganger').blessures, 5); // 5 + DR2 - armure 2, p. 212 ; loc 5 = jambe-d
  assert.equal(participant(s, 'helza').viseeActive, false); // perdue après le tir, p. 207
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
});

// ---------------------------------------------------------------------------
// Soins, Destin, actions diverses, pureté
// ---------------------------------------------------------------------------

test('premiers soins (p. 219) : soigne DR + BInt ; traite une critique', () => {
  const crit = { id: 'laceration', nom: 'Lacération', localisation: 'corps', severite: 3, traitementRequis: true, traitee: false, mortImmediate: false, blessure: null, page: 360 };
  const reserve = reserveAvecHelza({ blessures: 5, critiques: [crit], destin: 3, destinBrule: 0, etats: [] });
  const des = desScriptes({ d100: [30, 20] });
  let s = composerRencontre(reserve, ['helza', 'ganger'], { zones: ZONES2 });
  s = commencerRound(s);
  // Médecine 40, test Intermédiaire (+0) en combat (p. 219) ; 30 -> DR +1 ; soins = 1 + BInt 4 = 5 (Int 40, p. 50)
  s = pur(s, st => premiersSoins(st, { id: 'helza', cibleId: 'helza' }, des));
  assert.equal(participant(s, 'helza').blessures, 0);
  // traiterCritique : 20 -> DR +2 ; la critique est marquée traitée (p. 219)
  s = pur(s, st => traiterCritique(st, { id: 'helza', cibleId: 'helza' }, des));
  assert.equal(participant(s, 'helza').critiques[0].traitee, true);
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
});

test('destin (p. 220) : avantage, agirPremier, ignorerCritiques, renverserCours, pourEmpereur', () => {
  const reserve = reserveAvecHelza();
  let s = composerRencontre(reserve, ['helza', 'ganger'], { zones: ZONES2 });
  s = commencerRound(s); // ordre [helza, ganger]
  s = pur(s, st => depenserDestin(st, 'helza', 'avantage', { cibleId: 'ganger' })); // Avantage au prochain test, p. 189, 220
  assert.equal(participant(s, 'ganger').avantageProchainTest, true);
  assert.equal(participant(s, 'helza').destin, 2);
  s = pur(s, st => depenserDestin(st, 'helza', 'agirPremier')); // déjà premier : ordre inchangé
  assert.deepEqual(s.ordre, ['helza', 'ganger']);
  s = pur(s, st => depenserDestin(st, 'helza', 'ignorerCritiques', { cibleId: 'helza' }));
  assert.equal(participant(s, 'helza').ignoreCritiquesTour, true);
  assert.equal(participant(s, 'helza').destin, 0);
  const r = depenserDestin(s, 'helza', 'avantage', {});
  assert.equal(r.journal.at(-1).type, 'erreur'); // plus de point de Destin, p. 220
  // brûler : renverserCours +2 si Supériorité 0 (p. 220) ; pourEmpereur choisit le résultat du jet
  let s2 = composerRencontre(reserve, ['helza', 'ganger'], { zones: ZONES2 });
  s2 = commencerRound(s2);
  s2 = brulerDestin(s2, 'helza', 'renverserCours');
  assert.equal(s2.superiorite, 2); // p. 220 : +2 car Supériorité 0
  assert.equal(participant(s2, 'helza').destin, 2); // min(3, 3-1), réduction permanente p. 220
  s2 = brulerDestin(s2, 'helza', 'pourEmpereur', { jet: 15 });
  assert.equal(participant(s2, 'helza').destinPourEmpereur, 15);
  const des = desScriptes({ d100: [] }); // aucun d100 scripté : le résultat choisi est utilisé, p. 220
  s2 = pur(s2, st => testLibre(st, { id: 'helza', competence: 'Discrétion', caracFallback: 'Ag' }, des));
  assert.equal(s2.dernierTest.ap.jet, 15);
  assert.equal(s2.dernierTest.ap.dr, 3); // Discrétion 40, 15 -> +3, p. 187
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
});

test('zones, traits de zone, engagements, déplacements (p. 199-200, 204, 207, 212)', () => {
  const reserve = reserveAvecHelza();
  let s = composerRencontre(reserve, ['helza', 'ganger'], { zones: ZONES2 });
  s = commencerRound(s);
  s = pur(s, st => definirTraitsZone(st, 'zone-2', [{ id: 'couvert', valeur: 'moyen' }])); // p. 204
  assert.deepEqual(s.zones.find(z => z.id === 'zone-2').traits, [{ id: 'couvert', valeur: 'moyen' }]);
  s = pur(s, st => engager(st, 'helza', 'ganger')); // p. 212
  assert.deepEqual(s.engages, [['ganger', 'helza']]); // paires triées
  s = pur(s, st => deplacerZone(st, 'ganger', 'zone-2')); // p. 199-200 : perd couvert et engagements inter-zones
  assert.deepEqual(s.engages, []);
  assert.equal(participant(s, 'ganger').zoneId, 'zone-2');
  s = pur(s, st => desengager(st, 'helza', 'ganger')); // p. 207
  assert.deepEqual(s.engages, []);
  // mêlée impossible hors de la zone (portée immédiate, p. 207, 211)
  const r = attaquerMelee(s, { id: 'helza', cibleId: 'ganger', armeId: 'epee' }, desScriptes({}));
  assert.equal(r.journal.at(-1).type, 'erreur');
  // actions diverses (p. 207-209)
  s = pur(s, st => prendreInitiative(st, { id: 'helza' })); // p. 209
  assert.equal(participant(s, 'helza').saisirInitProchainRound, true);
  s = pur(s, st => aider(st, { id: 'helza', cibleId: 'helza' })); // p. 208, 189
  assert.equal(participant(s, 'helza').avantageProchainTest, true);
});

test('un appel par dé : RangeError explicite si un dé manque ; état sérialisable en JSON', () => {
  const reserve = reserveAvecHelza();
  let s = composerRencontre(reserve, ['helza', 'ganger'], { zones: ZONES2 });
  assert.equal(typeof JSON.stringify(s), 'string');
  s = commencerRound(s);
  assert.throws(() => attaquerMelee(s, { id: 'helza', cibleId: 'ganger', armeId: 'epee' }), RangeError); // fournisseur absent
  assert.throws(() => attaquerMelee(s, { id: 'helza', cibleId: 'ganger', armeId: 'epee' }, desScriptes({ d100: [] })), RangeError); // d100 manquant
  // 33 = double + succès -> critique (p. 213) -> 1d10 de localisation/sévérité requis (p. 215) : dé manquant -> RangeError
  assert.throws(() => attaquerMelee(s, { id: 'helza', cibleId: 'ganger', armeId: 'epee' }, desScriptes({ d100: [33, 90] })), /1d10/);
  // ajusterSuperiorite : minimum 0 (p. 197), état non muté
  const s2 = ajusterSuperiorite(s, 1, 'test');
  assert.equal(s.superiorite, 0);
  assert.equal(s2.superiorite, 1);
  assert.equal(ajusterSuperiorite(s2, -9).superiorite, 0);
});

// ---------------------------------------------------------------------------
// Correctifs VERIF-I3 : un test ciblé par écart bloquant (page du livre citée)
// ---------------------------------------------------------------------------

test('F1 - un critique automatique exige une attaque qui touche (p. 188, 213-215, 357)', () => {
  // (a) tir réussi contre un ennemi Surpris : critique auto (p. 214-215)
  {
    const des = desScriptes({ d100: [5], lancer: [['1d10', 3]] });
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'executeur'], { surprise: 'pj' }); // executeur surpris, p. 199
    s = commencerRound(s); // round 0 : seule la PJ agit
    s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'executeur', armeId: 'pistolet-laser' }, des));
    // 05 = succès auto DR +4 (seuil CT 40, p. 187-188) ; dégâts 5+4-armure 5 = 4 ; critique auto vs Surpris (p. 214)
    const e = participant(s, 'executeur');
    assert.equal(e.blessures, 4);
    assert.equal(e.critiques.length, 1);
    assert.equal(e.critiques[0].localisation, 'jambe-d'); // unités du jet 05, p. 211
    assert.equal(e.critiques[0].severite, 3);
    assert.equal(e.etat, 'actif'); // Élite : 1re critique encaissée (p. 317)
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
  // (b) tir raté (maladresse 99) contre un ennemi Surpris : aucun critique (p. 188, 213-215)
  {
    const des = desScriptes({ d100: [99], lancer: [['1d10', 2], ['1d10', 1]] });
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'executeur'], { surprise: 'pj' });
    s = commencerRound(s);
    s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'executeur', armeId: 'pistolet-laser' }, des));
    const e = participant(s, 'executeur');
    assert.equal(e.blessures, 0);
    assert.equal(e.critiques.length, 0); // une attaque ratée ne fait jamais de critique auto (p. 213-215)
    assert.ok(s.journal.some(j => j.type === 'maladresse')); // 99 = maladresse auto (p. 188) ; Reliable 1 < 4 (p. 125)
    assert.equal(participant(s, 'helza').desavantageTour, true); // table de maladresse 2, p. 355
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
  // (c) tir réussi contre une cible Neutralisée : dégâts mais PAS de critique auto (p. 357, mêlée seulement)
  {
    const des = desScriptes({ d100: [5], lancer: [] });
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'executeur']);
    s = commencerRound(s); // ordre [helza (8), executeur (6)]
    s = pur(s, st => appliquerEtat(st, { id: 'executeur', etat: 'neutralise' })); // p. 357
    s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'executeur', armeId: 'pistolet-laser' }, des));
    const e = participant(s, 'executeur');
    assert.equal(e.blessures, 4); // 5 + DR4 - armure 5, p. 212
    assert.equal(e.critiques.length, 0); // p. 357 : à distance, pas de critique auto contre une cible Incapable
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
  // (d) mêlée contre une cible Neutralisée : critique auto (p. 357)
  {
    const des = desScriptes({ d100: [5], lancer: [['1d10', 4]] });
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'executeur']);
    s = commencerRound(s);
    s = pur(s, st => appliquerEtat(st, { id: 'executeur', etat: 'neutralise' }));
    s = pur(s, st => attaquerMelee(st, { id: 'helza', cibleId: 'executeur', armeId: 'epee' }, des));
    const e = participant(s, 'executeur');
    // 05 = succès auto DR +4 (seuil Mêlée 42) ; dégâts 2+BF3+4-armure 5 = 4 ; critique auto en mêlée (p. 357)
    assert.equal(e.blessures, 4);
    assert.equal(e.critiques.length, 1);
    assert.equal(e.critiques[0].localisation, 'jambe-d');
    assert.equal(e.critiques[0].severite, 4);
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
});

test('F2 - esquive en mêlée = test opposé Mêlée vs Réflexes (Esquive), dégâts = arme + BF + diff. DR (p. 211) ; riposte critique seulement en opposition (p. 213)', () => {
  const des = desScriptes({ d100: [30, 70, 80, 30, 50, 22], lancer: [['1d10', 3], ['1d10', 5]] });
  let s = composerRencontre(reserveAvecHelza(), ['helza', 'ganger'], { superioriteInitiale: 1 });
  s = commencerRound(s); // ordre [helza (8), ganger (7)]
  // (a) helza attaque, ganger esquive : test opposé ; 30 -> DR +1 vs 70 -> DR -3, helza gagne avec diff +4 (p. 190, 211)
  s = pur(s, st => attaquerMelee(st, { id: 'helza', cibleId: 'ganger', armeId: 'epee', modeDefense: 'esquive' }, des));
  assert.ok(s.journal.some(j => j.texte.includes('Test opposé (Réflexes (Esquive)'))); // p. 211
  assert.equal(participant(s, 'ganger').blessures, 7); // 2+BF3 + diff DR 4 - armure 2 = 7, p. 211
  assert.equal(participant(s, 'ganger').critiques.length, 0);
  // (b) l'esquive peut aussi gagner le test opposé : 80 -> DR -4 vs 30 -> DR +1, ganger gagne, helza rate
  s = pur(s, st => attaquerMelee(st, { id: 'helza', cibleId: 'ganger', armeId: 'epee', modeDefense: 'esquive' }, des));
  assert.equal(participant(s, 'ganger').blessures, 7); // aucun dégât supplémentaire
  // (c) riposte par coup critique seulement en défendant par la compétence Mêlée (opposition, p. 213) :
  // helza 50 -> échec DR -1 ; ganger 22 -> double + succès = critique en défense -> riposte sur helza
  s = pur(s, st => attaquerMelee(st, { id: 'helza', cibleId: 'ganger', armeId: 'epee' }, des)); // modeDefense 'opposition' par défaut
  assert.equal(participant(s, 'ganger').blessures, 7); // helza a perdu le test opposé : pas de dégâts
  const h = participant(s, 'helza');
  assert.ok(s.journal.some(j => j.texte.includes('riposte par un coup critique'))); // p. 213
  assert.equal(h.blessures, 1); // riposte au couteau : 0+BF3 +0 - armure 2 = 1, p. 211
  assert.equal(h.critiques.length, 1);
  assert.equal(s.superiorite, 0); // -1 : première blessure critique d'un PJ (p. 197)
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
});

test('F3 - Rapid Fire X (p. 125) : rapide-degats = Avantage + +X dégâts ; rapide-spread = Spread sans Avantage ; -X munitions dans les deux cas', () => {
  const mk = () => {
    const r = modifierProfil(reserveAvecHelza(), 'helza', { armes: ['fusil-automatique'] }); // Rapid Fire 3, chargeur 5, p. 133
    let s = composerRencontre(r, ['helza', 'ganger'], { zones: ZONES2 });
    return commencerRound(s); // ordre [helza (8), ganger (7)]
  };
  // (a) rapide-degats : 62 -> l'Avantage du mode permet d'inverser en 26 (DR +2) ; dégâts 6+3+2-2 = 9 ; -3 munitions
  {
    const des = desScriptes({ d100: [62] });
    let s = mk();
    s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'ganger', armeId: 'fusil-automatique', mode: 'rapide-degats', modeDefense: 'aucune' }, des));
    assert.equal(s.enAttente?.type, 'inversion'); // Avantage du mode rapide-degats (p. 125, 189)
    s = pur(s, st => choisirInversion(st, 'reverse', des));
    assert.equal(participant(s, 'ganger').blessures, 9); // 6 + bonus X 3 + DR 2 - armure 2, p. 125, 212
    assert.equal(participant(s, 'helza').munitionsParArme['fusil-automatique'], 2); // 5-3, p. 125
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
  // (b) rapide-spread : aucun Avantage (62 reste 62, échec) ; -3 munitions quand même ; note Spread journalisée
  {
    const des = desScriptes({ d100: [62] });
    let s = mk();
    s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'ganger', armeId: 'fusil-automatique', mode: 'rapide-spread', modeDefense: 'aucune' }, des));
    assert.equal(s.enAttente, null); // pas d'Avantage en mode Spread (p. 125)
    assert.equal(participant(s, 'ganger').blessures, 0); // 62 -> DR -2, échec
    assert.equal(participant(s, 'helza').munitionsParArme['fusil-automatique'], 2); // -3 munitions, p. 125
    assert.ok(s.journal.some(j => j.texte.includes('Spread'))); // p. 125
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
  // (c) rapide-spread : un tir réussi ne gagne pas les +X dégâts (6 + DR 1 - 2 = 5)
  {
    const des = desScriptes({ d100: [35] });
    let s = mk();
    s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'ganger', armeId: 'fusil-automatique', mode: 'rapide-spread', modeDefense: 'aucune' }, des));
    assert.equal(participant(s, 'ganger').blessures, 5); // pas de bonus de dégâts en Spread, p. 125
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
});

test('F4 - Mourant dès qu’un participant en jeu dépasse ses critiques max (p. 215) ; Endurance ne l’écrase pas ; le traitement stabilise (p. 215, 219)', () => {
  const crit = { id: 'laceration', nom: 'Lacération', localisation: 'corps', severite: 3, traitementRequis: true, traitee: false, mortImmediate: false, blessure: null, page: 360 };
  // (a) actif -> inconscient -> mourant -> mort en fin de round
  {
    const suivi = { blessures: 16, critiques: [crit, { ...crit }, { ...crit }], destin: 3, destinBrule: 0, etats: [] }; // 3 non traitées <= max 4
    const des = desScriptes({ d100: [50, 45, 80, 45, 80], lancer: [['1d10', 8], ['1d10', 7]] });
    let s = composerRencontre(reserveAvecHelza(suivi), ['helza', 'executeur']); // ordre [helza (8), executeur (6)]
    s = commencerRound(s);
    s = pur(s, st => testLibre(st, { id: 'helza', competence: 'Discrétion', caracFallback: 'Ag' }, des)); // 50, sans importance
    s = pur(s, st => passerTour(st, des)); // tour de l'exécuteur
    // coup 1 : matraque 2+BF4+DR1-armure 2 = 5 dégâts, excédent 5 -> 4e critique (<= max) ; Endurance 80 échoue -> Inconscient
    s = pur(s, st => attaquerMelee(st, { id: 'executeur', cibleId: 'helza', armeId: 'electro-matraque', modeDefense: 'aucune' }, des));
    let h = participant(s, 'helza');
    assert.equal(h.critiques.length, 4);
    assert.equal(h.etat, 'inconscient'); // p. 214, 357 : test d'Endurance (Douleur) échoué
    // fin du round courant : pas Mourant -> elle survit ; round suivant, helza Inconsciente (tour sauté), l'exécuteur agit
    s = pur(s, st => passerTour(st, des));
    assert.equal(s.round, 2);
    assert.equal(acteurCourant(s).id, 'executeur');
    // coup 2 : cible Inconsciente -> pas d'opposition + critique auto en mêlée (p. 357) -> 5e critique > max 4 -> Mourant
    s = pur(s, st => attaquerMelee(st, { id: 'executeur', cibleId: 'helza', armeId: 'electro-matraque' }, des));
    h = participant(s, 'helza');
    assert.equal(h.critiques.length, 5);
    // p. 215 : Mourant dès que le participant est en jeu et non traitées > max, même s'il était Inconscient
    assert.equal(h.etat, 'mourant');
    // le test d'Endurance (Douleur) répété (80) échoue mais n'écrase pas Mourant en Inconscient (p. 214-215)
    assert.equal(h.etat, 'mourant');
    s = pur(s, st => passerTour(st, des)); // fin du round 1 : le Mourant meurt, p. 215
    assert.equal(participant(s, 'helza').etat, 'mort');
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
  // (b) un Mourant est stabilisé quand les critiques non traitées repassent <= max (p. 215, 219)
  {
    const suivi = { blessures: 16, critiques: [crit, { ...crit }, { ...crit }, { ...crit }, { ...crit }], destin: 3, destinBrule: 0, etats: [] }; // 5 > max 4
    let r = reserveAvecHelza(suivi);
    r = modifierProfil(r, 'helza', { carac: { Per: 20, Ag: 20 } }); // init 4 : l'exécuteur (6) agit avant elle
    r = ajouterProfil(r, {
      id: 'medicae', nom: 'Medicae', kind: 'PJ', camp: 'pj', taille: 'moyenne', vitesse: 'normale',
      carac: { CC: 30, CT: 30, F: 30, E: 30, Ag: 30, Int: 40, Per: 20, FM: 30, Soc: 30 },
      competences: { Médecine: 60 }, armure: 0, armes: ['couteau'], resolution: 3, destinMax: 3
    }); // init 5
    // sévérité 2+5 = 7 (jambe-d) -> Fracture nette : aucun état à effet de tour, pas de dé supplémentaire
    const des = desScriptes({ d100: [45, 80, 30, 30], lancer: [['1d10', 2]] });
    let s = composerRencontre(r, ['helza', 'medicae', 'executeur']); // ordre [executeur (6), medicae (5), helza (4)]
    s = commencerRound(s);
    assert.equal(acteurCourant(s).id, 'executeur');
    // l'exécuteur inflige une 6e critique -> Mourant (non traitées 6 > 4) ; Endurance échoue, elle reste Mourante
    s = pur(s, st => attaquerMelee(st, { id: 'executeur', cibleId: 'helza', armeId: 'electro-matraque', modeDefense: 'aucune' }, des));
    assert.equal(participant(s, 'helza').etat, 'mourant');
    assert.equal(participant(s, 'helza').critiques.length, 6);
    s = pur(s, st => passerTour(st, des)); // tour de medicae
    assert.equal(acteurCourant(s).id, 'medicae');
    // 1er traitement (30 -> DR +3) : 5 non traitées, toujours > 4 -> toujours Mourante (p. 219)
    s = pur(s, st => traiterCritique(st, { id: 'medicae', cibleId: 'helza' }, des));
    assert.equal(participant(s, 'helza').critiques.filter(c => c.traitee).length, 1);
    assert.equal(participant(s, 'helza').etat, 'mourant');
    // 2e traitement : 4 non traitées <= max 4 -> stabilisée, de nouveau active (p. 215, 219)
    s = pur(s, st => traiterCritique(st, { id: 'medicae', cibleId: 'helza' }, des));
    assert.equal(participant(s, 'helza').critiques.filter(c => c.traitee).length, 2);
    assert.equal(participant(s, 'helza').etat, 'actif');
    assert.ok(s.journal.some(j => j.texte.includes('stabilisé')));
    // fin du round : plus de Mourant -> helza survit au changement de round (p. 215)
    s = pur(s, st => passerTour(st, des)); // tour d'helza
    s = pur(s, st => passerTour(st, des)); // fin du round -> round suivant
    assert.equal(s.round, 2);
    assert.equal(participant(s, 'helza').etat, 'actif');
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
});

test('F5 - fuite (p. 208) : -1 Supériorité seulement pour un membre du groupe PJ ; un ennemi qui fuit est vaincu (p. 197)', () => {
  // (a) PJ qui fuit : -1 Supériorité (p. 197, 208)
  {
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'ganger'], { superioriteInitiale: 2 });
    s = commencerRound(s); // ordre [helza (8), ganger (7)]
    s = pur(s, st => fuir(st, { id: 'helza' }));
    assert.equal(participant(s, 'helza').etat, 'fui');
    assert.equal(s.superiorite, 1); // p. 197 : un membre du groupe mis hors combat -> -1
  }
  // (b) Troupe ennemie qui fuit : compte comme vaincue, +1 Supériorité si >= Résolution (p. 197, 208)
  {
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'ganger'], { superioriteInitiale: 0 });
    s = commencerRound(s);
    s = pur(s, st => engager(st, 'helza', 'ganger'));
    s = pur(s, st => passerTour(st)); // tour du ganger
    assert.equal(acteurCourant(s).id, 'ganger');
    s = pur(s, st => fuir(st, { id: 'ganger' }));
    assert.equal(participant(s, 'ganger').etat, 'fui');
    assert.deepEqual(s.engages, []); // retiré des engagements, p. 208
    assert.equal(s.superiorite, 1); // 1 Troupe vaincue >= Résolution 1 -> +1, p. 197
  }
  // (c) Élite ennemie qui fuit : +1 Supériorité (p. 197)
  {
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'executeur'], { superioriteInitiale: 0 });
    s = commencerRound(s);
    s = pur(s, st => passerTour(st)); // tour de l'exécuteur (init 6 < 8)
    s = pur(s, st => fuir(st, { id: 'executeur' }));
    assert.equal(participant(s, 'executeur').etat, 'fui');
    assert.equal(s.superiorite, 1); // Élite vaincue -> +1, p. 197
  }
});

test('F6 - déplacements inter-zones (p. 199-200), bonus à un seul test (p. 208, 220), visée (p. 207), Destin non débité si effet invalide (p. 220)', () => {
  // (a) deplacerZone ne rompt que les engagements inter-zones (p. 199-200)
  {
    const zones3 = [...ZONES2, { id: 'zone-3', nom: 'Zone 3', traits: [] }];
    let s = composerRencontre(reserveAvecHelza(), [
      { id: 'helza', zoneId: 'zone-1' }, { id: 'ganger', zoneId: 'zone-1' },
      { id: 'executeur', zoneId: 'zone-2' }, { id: 'ganger', zoneId: 'zone-2' } // 2e ganger -> id « ganger-2 »
    ], { zones: zones3 });
    s = pur(s, st => engager(st, 'helza', 'ganger'));
    s = pur(s, st => engager(st, 'executeur', 'ganger-2'));
    s = pur(s, st => deplacerZone(st, 'ganger', 'zone-3'));
    // helza-ganger devient inter-zones -> rompu ; executeur-ganger-2 (même zone) est conservé
    assert.deepEqual(s.engages, [['executeur', 'ganger-2']]);
  }
  // (b) l'Avantage « au prochain test » est consommé par un seul test (p. 208, 220)
  {
    const des = desScriptes({ d100: [45, 45] });
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'ganger']);
    s = commencerRound(s);
    s = pur(s, st => aider(st, { id: 'helza', cibleId: 'helza' })); // p. 208
    assert.equal(participant(s, 'helza').avantageProchainTest, true);
    s = pur(s, st => testLibre(st, { id: 'helza', competence: 'Discrétion', caracFallback: 'Ag' }, des)); // 45
    assert.equal(participant(s, 'helza').avantageProchainTest, false); // consommé après un seul test
    s = pur(s, st => testLibre(st, { id: 'helza', competence: 'Discrétion', caracFallback: 'Ag' }, des)); // 45, sans avantage
    assert.equal(participant(s, 'helza').avantageProchainTest, false);
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
  // (c) « Pour l'Empereur » ne vaut que pour un seul test (p. 220)
  {
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'ganger']);
    s = commencerRound(s);
    s = pur(s, st => brulerDestin(st, 'helza', 'pourEmpereur', { jet: 15 }));
    const desVide = desScriptes({ d100: [] });
    s = pur(s, st => testLibre(st, { id: 'helza', competence: 'Discrétion', caracFallback: 'Ag' }, desVide)); // jet choisi 15, aucun d100 consommé
    assert.equal(s.dernierTest.ap.jet, 15);
    assert.equal(participant(s, 'helza').destinPourEmpereur, null); // consommé, p. 220
    // le test suivant retombe sur le fournisseur de dés -> RangeError s'il est vide
    assert.throws(() => testLibre(s, { id: 'helza', competence: 'Discrétion', caracFallback: 'Ag' }, desScriptes({ d100: [] })), RangeError);
  }
  // (d) Viser (p. 207) : localisation ciblée sans pénalité au prochain tir
  {
    const des = desScriptes({ d100: [35] });
    let s = composerRencontre(reserveAvecHelza(), [{ id: 'helza', zoneId: 'zone-1' }, { id: 'ganger', zoneId: 'zone-2' }], { zones: ZONES2 });
    s = commencerRound(s);
    // distance Moyenne = portée du pistolet-laser (p. 202, 132) ; sans Viser, cibleLocalisation = Désavantage (p. 210)
    s = pur(s, st => viser(st, { id: 'helza' })); // p. 207
    s = pur(s, st => attaquerDistance(st, { id: 'helza', cibleId: 'ganger', armeId: 'pistolet-laser', cibleLocalisation: 'tete', modeDefense: 'aucune' }, des));
    assert.equal(s.enAttente, null); // pas d'inversion imposée : pas de Désavantage (p. 207)
    assert.ok(s.journal.some(j => j.texte.includes(' 35 :'))); // jet 35 gardé (inversé, 53 raterait)
    assert.equal(participant(s, 'ganger').blessures, 4); // 5 + DR1 - armure 2, p. 212 ; localisation tête visée
    assert.equal(participant(s, 'helza').viseeActive, false); // perdue après le tir, p. 207
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
  // (e) depenserDestin ne débite le point que si l'effet est valide (p. 220)
  {
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'ganger']);
    s = commencerRound(s);
    let r = depenserDestin(s, 'helza', 'relancer', {}, desScriptes({})); // aucun test échoué à relancer
    assert.equal(r.journal.at(-1).type, 'erreur');
    assert.equal(participant(r, 'helza').destin, 3); // pas de point perdu, p. 220
    r = depenserDestin(s, 'helza', 'plus1DR'); // aucun dernier test
    assert.equal(r.journal.at(-1).type, 'erreur');
    assert.equal(participant(r, 'helza').destin, 3);
  }
});

test('points mineurs - Réaction jusqu’au prochain tour de l’acteur (p. 199), ré-infliction majeure (p. 356), Charge (p. 207), Heavy en mêlée (p. 124)', () => {
  // (a) la Réaction utilisée après le tour du PJ persiste jusqu’au début de SON prochain tour (p. 199)
  {
    const des = desScriptes({ d100: [50, 60, 30] });
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'ganger', 'executeur']); // ordre [helza (8), ganger (7), executeur (6)]
    s = commencerRound(s);
    s = pur(s, st => testLibre(st, { id: 'helza', competence: 'Discrétion', caracFallback: 'Ag' }, des)); // 50
    s = pur(s, st => passerTour(st, des)); // tour du ganger
    s = pur(s, st => prendreInitiative(st, { id: 'ganger' })); // p. 209 : ganger en haut au prochain round
    // ganger tire : helza esquive, sa Réaction est consommée (p. 212)
    s = pur(s, st => attaquerDistance(st, { id: 'ganger', cibleId: 'helza', armeId: 'fusil-automatique' }, des)); // 60 att, 30 esquive
    assert.equal(participant(s, 'helza').reactionUtilisee, true);
    s = pur(s, st => passerTour(st, des)); // tour de l'exécuteur
    s = pur(s, st => passerTour(st, des)); // fin du round -> round suivant, ordre [ganger, helza, executeur]
    assert.equal(s.round, 2);
    assert.equal(acteurCourant(s).id, 'ganger');
    // le drapeau d'helza n'est pas remis à zéro au changement de round : seulement à son début de tour (p. 199)
    assert.equal(participant(s, 'helza').reactionUtilisee, true);
    s = pur(s, st => passerTour(st, des)); // début du tour d'helza
    assert.equal(acteurCourant(s).id, 'helza');
    assert.equal(participant(s, 'helza').reactionUtilisee, false);
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
  // (b) subir à nouveau une Condition à paliers la fait passer à Majeur (p. 356)
  {
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'ganger']);
    s = commencerRound(s);
    s = pur(s, st => appliquerEtat(st, { id: 'ganger', etat: 'sonne', niveau: 'mineur' }));
    s = pur(s, st => appliquerEtat(st, { id: 'ganger', etat: 'sonne', niveau: 'mineur' }));
    assert.deepEqual(participant(s, 'ganger').etats.filter(e => e.id === 'sonne'), [{ id: 'sonne', niveau: 'majeur' }]); // p. 356
  }
  // (c) Charge (p. 207) : malus de défense jusqu’au prochain tour, aussi aux tests de Réflexes (Esquive)
  {
    const des = desScriptes({ d100: [35, 30, 45] });
    let s = composerRencontre(reserveAvecHelza(), ['helza', 'ganger']);
    s = commencerRound(s); // ordre [helza (8), ganger (7)]
    // helza charge : Avantage à l'attaque et malus de défense jusqu'à son prochain tour (p. 207)
    s = pur(s, st => attaquerMelee(st, { id: 'helza', cibleId: 'ganger', armeId: 'epee', modeDefense: 'aucune', charge: true }, des)); // 35
    assert.equal(participant(s, 'helza').chargeMalusDefense, true); // p. 207
    assert.equal(participant(s, 'ganger').blessures, 5); // 2+BF3 + DR2 - armure 2, p. 211
    s = pur(s, st => passerTour(st, des)); // tour du ganger : le malus d'helza persiste (reset à SON début de tour)
    assert.equal(participant(s, 'helza').chargeMalusDefense, true);
    // ganger attaque en esquivant : le malus de Charge s'applique au test de Réflexes (Esquive), p. 207
    s = pur(s, st => attaquerMelee(st, { id: 'ganger', cibleId: 'helza', armeId: 'couteau', modeDefense: 'esquive' }, des)); // 30 att, 45 esquive
    assert.ok(s.journal.some(j => j.texte.includes('Test opposé (Réflexes (Esquive)')));
    // helza 45 -> Désavantage imposé (charge) -> 54 -> échec ; ganger 30 -> DR +1 gagne le test opposé, diff +1
    assert.equal(participant(s, 'helza').blessures, 2); // couteau 0+BF3 +1 - armure 2 = 2, p. 211
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
  // (d) Heavy en mêlée (p. 124) : arme Heavy (4) avec BF 3 < 4 -> Désavantage imposé au test d'attaque
  {
    let r = modifierProfil(reserveAvecHelza(), 'helza', { armes: ['arme-lourde'] }); // Heavy (4), p. 128
    const des = desScriptes({ d100: [38, 90] });
    let s = composerRencontre(r, ['helza', 'ganger']);
    s = commencerRound(s);
    s = pur(s, st => attaquerMelee(st, { id: 'helza', cibleId: 'ganger', armeId: 'arme-lourde' }, des)); // 38 att, 90 def
    assert.ok(s.journal.some(j => j.texte.includes(' 83 :'))); // 38 -> 83, inversion imposée par Heavy (p. 124, 189)
    // 83 -> DR -4 (échec) mais helza gagne le test opposé (90 -> DR -5), diff +1 -> touche, p. 190, 213
    assert.equal(participant(s, 'ganger').blessures, 6); // 4+BF3 +1 - armure 2 = 6, p. 211
    assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  }
});
