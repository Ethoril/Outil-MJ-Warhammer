/**
 * Données de départ d'Imperium Maledictum : armes de départ et dix statblocks de PNJ du Core Book.
 * Le MJ en ajoute d'autres par les formulaires. Seules des valeurs imprimées sont reprises, avec la page
 * imprimée en commentaire et dans `source` (page du PDF = page imprimée). Aucune valeur inventée, aucun texte
 * du livre recopié : paraphrase courte en français + page seulement. Une valeur que le livre ne donne pas
 * reste absente (une absence se lit comme vide).
 *
 * Livre : Imperium Maledictum Core Book (core.txt). Caractéristiques imprimées : CC CT F E Ag Int Per FM Soc.
 * Compétences : nom français de la compétence ; la spécialisation entre parenthèses hérite de la compétence
 * parente (p. 92) ; un PNJ sans la compétence utilise la caractéristique correspondante (p. 316).
 */
import { creerReserve, ajouterArme, ajouterProfil } from './profils.js';

const LIVRE = 'Livre de base';
const src = p => `${LIVRE} p. ${p}`;

/**
 * Armes de départ. Mêlée : tableau p. 128 (dégâts « X+BF » = `degatsBase` X + bonus de F, `ajouteBF`).
 * Tir : tableaux p. 132 (laser, bolter) et p. 133 (projectiles solides, plasma), grenades p. 136.
 * Attaques naturelles : griffe-serviteur p. 323, griffes du Warp p. 222 et 344.
 * `traits` : `{ id, valeur? }`, ids anglais comme dans regles.js (ex. `rend` 2 = Rend (2)).
 */
export const ARMES_DEPART = Object.freeze({
  // --- Mêlée (p. 128) ---
  'mains-nues': { id: 'mains-nues', nom: 'Mains nues', type: 'melee', specialisation: 'Mêlée (Mains nues)', degatsBase: 0, ajouteBF: true, portee: 'immediate', chargeur: null, traits: [{ id: 'ineffective' }], source: src(128) }, // 0+BF, Ineffective, p. 128
  'couteau': { id: 'couteau', nom: 'Couteau', type: 'melee', specialisation: 'Mêlée (Une main)', degatsBase: 0, ajouteBF: true, portee: 'immediate', chargeur: null, traits: [{ id: 'subtle' }, { id: 'thrown', valeur: 'courte' }], source: src(128) }, // 0+BF, Subtle, Lancer (courte), p. 128
  'epee': { id: 'epee', nom: 'Épée', type: 'melee', specialisation: 'Mêlée (Une main)', degatsBase: 2, ajouteBF: true, portee: 'immediate', chargeur: null, traits: [], source: src(128) }, // 2+BF, p. 128
  'hache': { id: 'hache', nom: 'Hache', type: 'melee', specialisation: 'Mêlée (Une main)', degatsBase: 2, ajouteBF: true, portee: 'immediate', chargeur: null, traits: [], source: src(128) }, // 2+BF, p. 128
  'arme-lourde': { id: 'arme-lourde', nom: 'Arme lourde', type: 'melee', specialisation: 'Mêlée (Deux mains)', degatsBase: 4, ajouteBF: true, portee: 'immediate', chargeur: null, traits: [{ id: 'heavy', valeur: 4 }, { id: 'two-handed' }], source: src(128) }, // 4+BF, Heavy (4), Deux mains, p. 128 (9+BF pour F 50, chef de gang p. 342)
  'epee-tronconneuse': { id: 'epee-tronconneuse', nom: 'Épée tronçonneuse', type: 'melee', specialisation: 'Mêlée (Une main)', degatsBase: 3, ajouteBF: true, portee: 'immediate', chargeur: null, traits: [{ id: 'loud' }, { id: 'rend', valeur: 2 }], source: src(128) }, // 3+BF, Loud, Rend (2), p. 128 (7+BF pour F 40, chasseur de primes p. 342)
  'electro-matraque': { id: 'electro-matraque', nom: 'Électro-matraque', type: 'melee', specialisation: 'Mêlée (Une main)', degatsBase: 2, ajouteBF: true, portee: 'immediate', chargeur: null, traits: [{ id: 'loud' }, { id: 'inflict', valeur: 'sonne' }], source: src(128) }, // 2+BF, Loud, Inflict (Sonné), p. 128 (6+BF pour F 40, exécuteur p. 327)
  'epee-energetique': { id: 'epee-energetique', nom: 'Épée énergétique', type: 'melee', specialisation: 'Mêlée (Une main)', degatsBase: 4, ajouteBF: true, portee: 'immediate', chargeur: null, traits: [{ id: 'penetrating', valeur: 4 }], source: src(128) }, // 4+BF, Penetrating (4), p. 128
  // Attaques naturelles (le bonus de F s'ajoute aussi, p. 316 : les dégâts de mêlée incluent le bonus de F)
  'griffe-serviteur': { id: 'griffe-serviteur', nom: 'Griffe-serviteur', type: 'melee', specialisation: 'Mêlée (Mains nues)', degatsBase: 2, ajouteBF: true, portee: 'immediate', chargeur: null, traits: [{ id: 'penetrating', valeur: 2 }], source: src(323) }, // 2+BF (7 pour F 50), Penetrating (2), p. 323
  'griffes-du-warp': { id: 'griffes-du-warp', nom: 'Griffes du Warp', type: 'melee', specialisation: 'Mêlée (Mains nues)', degatsBase: 0, ajouteBF: true, portee: 'immediate', chargeur: null, traits: [{ id: 'rend', valeur: 1 }], source: `${src(222)}, ${src(344)}` }, // mains nues perdent Ineffective et gagnent Rend (1), p. 222 et 344
  // --- Tir (p. 132-133, grenades p. 136) ; dégâts fixes, sans bonus de F ---
  'pistolet-laser': { id: 'pistolet-laser', nom: 'Pistolet laser', type: 'tir', specialisation: 'Tir (Pistolet)', degatsBase: 5, ajouteBF: false, portee: 'moyenne', chargeur: 4, traits: [{ id: 'burst' }, { id: 'close' }, { id: 'loud' }, { id: 'reliable' }], source: src(132) }, // 5, Moyenne, Mag 4, Burst, Rapprochée, Loud, Reliable, p. 132
  'fusil-laser': { id: 'fusil-laser', nom: 'Fusil laser', type: 'tir', specialisation: 'Tir (Arme longue)', degatsBase: 6, ajouteBF: false, portee: 'longue', chargeur: 8, traits: [{ id: 'burst' }, { id: 'loud' }, { id: 'reliable' }, { id: 'two-handed' }], source: src(132) }, // 6, Longue, Mag 8, Burst, Loud, Reliable, Deux mains, p. 132
  'pistolet-automatique': { id: 'pistolet-automatique', nom: 'Pistolet automatique', type: 'tir', specialisation: 'Tir (Pistolet)', degatsBase: 5, ajouteBF: false, portee: 'moyenne', chargeur: 3, traits: [{ id: 'close' }, { id: 'loud' }, { id: 'rapid-fire', valeur: 3 }], source: src(133) }, // 5, Moyenne, Mag 3, Rapprochée, Loud, Rapid Fire (3), p. 133
  'fusil-automatique': { id: 'fusil-automatique', nom: 'Fusil automatique', type: 'tir', specialisation: 'Tir (Arme longue)', degatsBase: 6, ajouteBF: false, portee: 'longue', chargeur: 5, traits: [{ id: 'loud' }, { id: 'rapid-fire', valeur: 3 }, { id: 'two-handed' }], source: src(133) }, // 6, Longue, Mag 5, Loud, Rapid Fire (3), Deux mains, p. 133
  'revolver-automatique': { id: 'revolver-automatique', nom: 'Revolver automatique', type: 'tir', specialisation: 'Tir (Pistolet)', degatsBase: 6, ajouteBF: false, portee: 'moyenne', chargeur: 6, traits: [{ id: 'close' }, { id: 'loud' }, { id: 'reliable' }], source: src(133) }, // 6, Moyenne, Mag 6, Rapprochée, Loud, Reliable, p. 133
  'pistolet-automatique-lourd': { id: 'pistolet-automatique-lourd', nom: 'Pistolet automatique lourd', type: 'tir', specialisation: 'Tir (Pistolet)', degatsBase: 6, ajouteBF: false, portee: 'moyenne', chargeur: 2, traits: [{ id: 'burst' }, { id: 'close' }, { id: 'loud' }], source: src(133) }, // 6, Moyenne, Mag 2, Burst, Rapprochée, Loud, p. 133
  'canon-a-main': { id: 'canon-a-main', nom: 'Canon à main', type: 'tir', specialisation: 'Tir (Pistolet)', degatsBase: 8, ajouteBF: false, portee: 'moyenne', chargeur: 4, traits: [{ id: 'close' }, { id: 'heavy', valeur: 4 }, { id: 'loud' }, { id: 'penetrating', valeur: 2 }], source: src(133) }, // 8, Moyenne, Mag 4, Rapprochée, Heavy (4), Loud, Penetrating (2), p. 133 (chef de gang p. 342)
  'fusil-a-pompe': { id: 'fusil-a-pompe', nom: 'Fusil à pompe', type: 'tir', specialisation: 'Tir (Arme longue)', degatsBase: 6, ajouteBF: false, portee: 'moyenne', chargeur: 8, traits: [{ id: 'inflict', valeur: 'a-terre' }, { id: 'loud' }, { id: 'spread' }, { id: 'two-handed' }], source: src(133) }, // 6, Moyenne, Mag 8, Inflict (À terre), Loud, Spread, Deux mains, p. 133 (arbitre p. 327)
  'pistolet-bolter': { id: 'pistolet-bolter', nom: 'Pistolet bolter', type: 'tir', specialisation: 'Tir (Ordinance)', degatsBase: 8, ajouteBF: false, portee: 'moyenne', chargeur: 2, traits: [{ id: 'burst' }, { id: 'close' }, { id: 'loud' }, { id: 'penetrating', valeur: 4 }, { id: 'spread' }], source: src(132) }, // 8, Moyenne, Mag 2, Burst, Rapprochée, Loud, Penetrating (4), Spread, p. 132
  'pistolet-plasma': { id: 'pistolet-plasma', nom: 'Pistolet plasma', type: 'tir', specialisation: 'Tir (Pistolet)', degatsBase: 10, ajouteBF: false, portee: 'moyenne', chargeur: 6, traits: [{ id: 'close' }, { id: 'loud' }, { id: 'penetrating', valeur: 6 }, { id: 'supercharge', valeur: 4 }, { id: 'unstable' }], source: src(133) }, // 10, Moyenne, Mag 6, Rapprochée, Loud, Penetrating (6), Supercharge (4), Unstable, p. 133
  toilleur: { id: 'toilleur', nom: 'Toilleur', type: 'tir', specialisation: 'Tir (Arme longue)', degatsBase: 0, ajouteBF: false, portee: 'moyenne', chargeur: 6, traits: [{ id: 'inflict', valeur: 'entrave' }, { id: 'two-handed' }], source: src(133) }, // 0, Moyenne, Mag 6, Inflict (Entravé), Deux mains, p. 133 (chasseur de primes p. 342)
  'grenade-fragmentation': { id: 'grenade-fragmentation', nom: 'Grenade à fragmentation', type: 'tir', specialisation: 'Tir (Lancer)', degatsBase: 6, ajouteBF: false, portee: 'moyenne', chargeur: null, traits: [{ id: 'blast' }, { id: 'loud' }, { id: 'thrown', valeur: 'moyenne' }, { id: 'unstable' }], source: src(136) } // 6, Blast, Loud, Lancer (moyenne), Unstable, p. 136
});

/**
 * Les dix statblocks de PNJ de départ du Core Book. `carac` reprend les neuf caractéristiques imprimées
 * (CC CT F E Ag Int Per FM Soc). Les valeurs dérivées (blessures max, critiques max, initiative) suivent la
 * formule p. 88, sauf champ `...Fixe` quand le statblock imprime une valeur différente (ex. Exécuteur p. 327 :
 * Per 40 + Ag 30 mais Initiative 6 imprimée). Armure : une seule valeur appliquée à toutes les localisations
 * (p. 316). `resolution` = Resolve imprimé. `source` cite la page imprimée du statblock.
 */
export const PNJ_DEPART = Object.freeze([
  {
    id: 'citoyen-imperial', nom: 'Citoyen impérial', kind: 'PNJ', role: 'troupe', camp: 'ennemi',
    taille: 'moyenne', vitesse: 'normale',
    // p. 340 : CC 30 CT 30 F 30 E 30 Ag 30 Int 30 Per 30 FM 30 Soc 30 ; armure 0, blessures 12, critiques 0, initiative 6, vitesse normale, résolution 1
    carac: { CC: 30, CT: 30, F: 30, E: 30, Ag: 30, Int: 30, Per: 30, FM: 30, Soc: 30 },
    competences: { Athlétisme: 40, Dextérité: 40, Erudition: 35 }, // compétences imprimées, p. 340
    armure: 0, armes: ['mains-nues'], resolution: 1,
    traitsTexte: '', notes: 'Attaque mains nues : 1 dégât, Ineffective (p. 340).', source: src(340)
  },
  {
    id: 'miserable', nom: 'Misérable', kind: 'PNJ', role: 'troupe', camp: 'ennemi',
    taille: 'moyenne', vitesse: 'normale',
    // p. 340 : CC 40 CT 30 F 30 E 40 Ag 30 Int 20 Per 30 FM 20 Soc 20 ; armure 0, blessures 13, critiques 0, initiative 6, vitesse normale, résolution 1
    carac: { CC: 40, CT: 30, F: 30, E: 40, Ag: 30, Int: 20, Per: 30, FM: 20, Soc: 20 },
    competences: { Athlétisme: 40, Vigilance: 40, Discrétion: 40 }, // p. 340
    armure: 0, armes: ['revolver-automatique', 'couteau'], resolution: 1,
    traitsTexte: 'Désespéré : avantage aux tests de Dextérité (Escamotage) pour voler (p. 340). Conditions pénibles : mutation ou malignance aléatoire possible (p. 222-223).',
    notes: '', source: src(340)
  },
  {
    id: 'ganger', nom: 'Ganger', kind: 'PNJ', role: 'troupe', camp: 'ennemi',
    taille: 'moyenne', vitesse: 'normale',
    // p. 340 : CC 35 CT 35 F 30 E 40 Ag 40 Int 20 Per 30 FM 20 Soc 20 ; armure 2, blessures 13 (F 30 + E 40 + FM 20 → 3+8+2), critiques 0, initiative 7, résolution 1
    carac: { CC: 35, CT: 35, F: 30, E: 40, Ag: 40, Int: 20, Per: 30, FM: 20, Soc: 20 },
    competences: { Mêlée: 40, Présence: 40, Tir: 40, Discrétion: 50 }, // p. 340
    armure: 2, armes: ['fusil-automatique', 'pistolet-automatique-lourd', 'couteau'], resolution: 1,
    traitsTexte: 'Embuscade : test de Discrétion en se déplaçant si la zone offre un couvert. Territoire natal : +1 résolution et avantage aux tests de Discipline dans son territoire (p. 340).',
    notes: '', source: src(340)
  },
  {
    id: 'serviteur', nom: 'Serviteur', kind: 'PNJ', role: 'troupe', camp: 'ennemi',
    taille: 'moyenne', vitesse: 'lente',
    // p. 323 : CC 30 CT 30 F 50 E 50 Ag 20 Int 10 Per 10 FM 10 Soc 10 ; armure 2, blessures 16, critiques 0, initiative 3, vitesse lente, résolution « voir traits » (lu comme null)
    carac: { CC: 30, CT: 30, F: 50, E: 50, Ag: 20, Int: 10, Per: 10, FM: 10, Soc: 10 },
    competences: { 'Athlétisme (Force)': 60, Dextérité: 30 }, // p. 323
    armure: 2, armes: ['griffe-serviteur'], resolution: null,
    traitsTexte: 'Programmé pour servir : agit selon sa programmation jusqu’à reprogrammation (test ardu de Tech (Augmétiques), p. 323).',
    notes: 'Griffe-serviteur : 2+BF (7 pour F 50), Penetrating (2) (p. 323).', source: src(323)
  },
  {
    id: 'cultiste', nom: 'Cultiste', kind: 'PNJ', role: 'troupe', camp: 'ennemi',
    taille: 'moyenne', vitesse: 'normale',
    // p. 344 : CC 30 CT 30 F 30 E 30 Ag 30 Int 30 Per 30 FM 30 Soc 30 ; armure 1, blessures 12, critiques 0, initiative 6, vitesse normale, résolution 1
    carac: { CC: 30, CT: 30, F: 30, E: 30, Ag: 30, Int: 30, Per: 30, FM: 30, Soc: 30 },
    competences: { 'Linguistique (Interdit)': 40, 'Erudition (Interdit)': 40, Mêlée: 40, Présence: 40, Tir: 40, 'Rapport (Tromperie)': 40, Discrétion: 40 }, // p. 344
    armure: 1, armes: ['fusil-automatique', 'pistolet-automatique', 'epee', 'couteau'], resolution: 1,
    traitsTexte: 'Sanité pour les faibles : en cas d’échec d’un test de Discipline, peut subir 1d10 dégâts ignorant l’armure pour réussir automatiquement (p. 344). Marque hérétique (p. 344).',
    notes: '', source: src(344)
  },
  {
    id: 'cultiste-maudit', nom: 'Cultiste maudit', kind: 'PNJ', role: 'troupe', camp: 'ennemi',
    taille: 'moyenne', vitesse: 'normale',
    // p. 344 : CC 50 CT 30 F 30 E 30 Ag 30 Int 30 Per 30 FM 25 Soc 25 ; armure 2, blessures 11, critiques 0, initiative 6, vitesse normale, résolution 1
    carac: { CC: 50, CT: 30, F: 30, E: 30, Ag: 30, Int: 30, Per: 30, FM: 25, Soc: 25 },
    competences: { Vigilance: 40, 'Linguistique (Interdit)': 40, 'Erudition (Interdit)': 40, 'Mêlée (Mains nues)': 60, Présence: 30, Discrétion: 40 }, // p. 344
    armure: 2, armes: ['pistolet-automatique', 'griffes-du-warp'], resolution: 1,
    traitsTexte: 'Œil supplémentaire (compte comme des photo-viseurs, p. 144). Tentacule cinglant : attaques mains nues gagnent Portée et Inflict (Entravé) (p. 222, 344). Griffes du Warp : mains nues perdent Ineffective, gagnent Rend (1) (p. 222, 344).',
    notes: '', source: src(344)
  },
  {
    id: 'executeur', nom: 'Exécuteur', kind: 'PNJ', role: 'elite', camp: 'ennemi',
    taille: 'moyenne', vitesse: 'normale',
    // p. 327 : CC 35 CT 35 F 40 E 40 Ag 30 Int 25 Per 40 FM 40 Soc 25 ; armure 5, blessures 16 (4+8+4), critiques 1, initiative 6 imprimée (formule Per 40 + Ag 30 → 7 : champ initiativeFixe), résolution 2
    carac: { CC: 35, CT: 35, F: 40, E: 40, Ag: 30, Int: 25, Per: 40, FM: 40, Soc: 25 },
    competences: { Athlétisme: 50, Vigilance: 50, Discipline: 50, Endurance: 50, Intuition: 50, Mêlée: 40, 'Mêlée (Une main)': 50, Présence: 50, 'Présence (Interrogatoire)': 60, 'Présence (Intimidation)': 60, Tir: 40, Rapport: 30 }, // p. 327
    armure: 5, armes: ['electro-matraque', 'fusil-automatique', 'revolver-automatique'], resolution: 2,
    initiativeFixe: 6, // initiative 6 imprimée p. 327 (au lieu de 7 = bonus Per 4 + bonus Ag 3, p. 88)
    traitsTexte: 'Appel à la rescousse : tous les exécuteurs dans un rayon d’un kilomètre entendent l’appel (p. 327). Incarcération : peut menotter en action gratuite lors d’une lutte (p. 327).',
    notes: 'Grenade suffocante non modélisée (p. 327).', source: src(327)
  },
  {
    id: 'chasseur-de-primes', nom: 'Chasseur de primes', kind: 'PNJ', role: 'elite', camp: 'ennemi',
    taille: 'moyenne', vitesse: 'normale',
    // p. 342 : CC 50 CT 50 F 40 E 50 Ag 40 Int 30 Per 50 FM 30 Soc 30 ; armure 2, blessures 17, critiques 1, initiative 9, vitesse normale, résolution 3
    carac: { CC: 50, CT: 50, F: 40, E: 50, Ag: 40, Int: 30, Per: 50, FM: 30, Soc: 30 },
    competences: { Athlétisme: 50, Vigilance: 60, 'Intuition (Humains)': 60, 'Logique (Enquête)': 50, 'Navigation (Pistage)': 50, Présence: 40, 'Rapport (Questionnement)': 50 }, // p. 342
    armure: 2, armes: ['epee-tronconneuse', 'electro-matraque', 'fusil-automatique', 'toilleur'], resolution: 3,
    traitsTexte: 'Embuscade (p. 342). Poursuite implacable : avantage aux tests de Vigilance et Navigation (Pistage) pour retrouver sa proie, +1 DR aux attaques la ciblant (p. 342).',
    notes: '', source: src(342)
  },
  {
    id: 'chef-de-gang', nom: 'Chef de gang', kind: 'PNJ', role: 'chef', camp: 'ennemi',
    taille: 'moyenne', vitesse: 'normale',
    // p. 342 : CC 50 CT 50 F 50 E 50 Ag 50 Int 30 Per 30 FM 40 Soc 40 ; armure 2, blessures 19, critiques 5, initiative 8, vitesse normale, résolution 2
    carac: { CC: 50, CT: 50, F: 50, E: 50, Ag: 50, Int: 30, Per: 30, FM: 40, Soc: 40 },
    competences: { Athlétisme: 60, Vigilance: 40, Discipline: 50, Intuition: 50, Mêlée: 60, Présence: 50, Tir: 60 }, // p. 342
    armure: 2, armes: ['arme-lourde', 'couteau', 'canon-a-main'], resolution: 2,
    traitsTexte: 'Territoire natal : +1 résolution et avantage aux tests de Discipline, Présence, Navigation, Discrétion dans son territoire (p. 342). Dirigeant : test de Présence pour faire agir des gangers (p. 342).',
    notes: 'Bombes incendiaires (p. 342) non modélisées en arme dédiée.', source: src(342)
  },
  {
    id: 'chef-de-culte', nom: 'Chef de culte', kind: 'PNJ', role: 'chef', camp: 'ennemi',
    taille: 'moyenne', vitesse: 'normale',
    // p. 346 : CC 40 CT 40 F 40 E 50 Ag 40 Int 40 Per 40 FM 50 Soc 50 ; armure 2, blessures 19, critiques 5, initiative 8, vitesse normale, résolution 3
    carac: { CC: 40, CT: 40, F: 40, E: 50, Ag: 40, Int: 40, Per: 40, FM: 50, Soc: 50 },
    competences: { Vigilance: 50, Discipline: 60, 'Discipline (Peur)': 70, Endurance: 60, Intuition: 50, 'Linguistique (Interdit)': 50, 'Erudition (Interdit)': 50, Mêlée: 50, 'Mêlée (Une main)': 60, Présence: 60, 'Présence (Intimidation)': 70, 'Présence (Commandement)': 70, 'Rapport (Tromperie)': 60, Discrétion: 50 }, // p. 346
    armure: 2, armes: ['epee-tronconneuse', 'couteau', 'canon-a-main'], resolution: 3,
    traitsTexte: 'Zèle fanatique : peut ordonner aux cultistes de sa zone de charger avec +1 DR (p. 346). Prix de l’échec : peut se transformer en progéniture du Chaos (p. 345-346). Sanité pour les faibles et marque hérétique (p. 344, 346).',
    notes: '', source: src(346)
  }
]);

/** Réserve prête à l'emploi : les armes et les dix PNJ du Core Book. Aucun PJ. */
export function reserveDeDepart() {
  let reserve = creerReserve();
  for (const arme of Object.values(ARMES_DEPART)) reserve = ajouterArme(reserve, arme);
  for (const profil of PNJ_DEPART) reserve = ajouterProfil(reserve, profil);
  return reserve;
}
