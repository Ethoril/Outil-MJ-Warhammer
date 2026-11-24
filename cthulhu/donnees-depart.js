/**
 * Données de départ de Cthulhu 7e : quelques armes, dix créatures et un PNJ humain, relevés dans les livres. Le MJ en
 * ajoute d'autres par les formulaires. Seules des valeurs imprimées sont reprises, avec la page imprimée (celle du
 * livre, pas celle du fichier PDF) en commentaire et dans `source`. Une valeur que le livre ne donne pas reste absente
 * (une absence se lit comme vide) : elle n'est jamais remplie à la place du livre.
 *
 * Livres : Manuel du Gardien (USB_V7-GARDIEN.pdf), Aventures effroyables (USB_V7-AV-EFFROYABLES.pdf).
 * Pour une créature, `carac` reprend la colonne « Moy. » du bloc (la moyenne imprimée, pas le jet) ; PV, Impact,
 * Carrure et PM imprimés se retrouvent par les valeurs dérivées (le test le vérifie).
 * Les capacités que le modèle ne sait pas jouer sont décrites dans `notes`, pas codées.
 */
import { creerReserve, ajouterArme, ajouterProfil } from './profils.js';

const GARDIEN = 'Manuel du Gardien';
const AVENTURES = 'Aventures effroyables';

/** Armes. Le catalogue est une donnée de la réserve : `creerReserve()` n'en contient aucune. */
export const ARMES_DEPART = Object.freeze({
  // Mains nues des humains : 1D3 + Impact (Gardien p. 92).
  poing: { id: 'poing', nom: 'Coup de poing', competence: 'Corps à corps', des: '1D3', empalante: false, aImpact: true, type: 'melee' },
  // Tableau des armes blanches (Gardien p. 405) : petit couteau 1D4+Imp (E), couteau de cuisine 1D4+2+Imp (E), grand
  // couteau (poignard, machette) 1D8+Imp (E), petit gourdin 1D6+Imp, grand gourdin (batte, tisonnier) 1D8+Imp.
  'couteau-petit': { id: 'couteau-petit', nom: 'Petit couteau', competence: 'Corps à corps', des: '1D4', empalante: true, aImpact: true, type: 'melee' },
  'couteau-cuisine': { id: 'couteau-cuisine', nom: 'Couteau de cuisine', competence: 'Corps à corps', des: '1D4+2', empalante: true, aImpact: true, type: 'melee' },
  'couteau-grand': { id: 'couteau-grand', nom: 'Grand couteau (poignard, machette)', competence: 'Corps à corps', des: '1D8', empalante: true, aImpact: true, type: 'melee' },
  'gourdin-petit': { id: 'gourdin-petit', nom: 'Petit gourdin (matraque)', competence: 'Corps à corps', des: '1D6', empalante: false, aImpact: true, type: 'melee' },
  'gourdin-grand': { id: 'gourdin-grand', nom: 'Grand gourdin (batte)', competence: 'Corps à corps', des: '1D8', empalante: false, aImpact: true, type: 'melee' },
  // Armes de poing (Gardien p. 405-406, tableau relu ligne par ligne) : portée de base 15 m (yards = mètres), empalantes
  // (E), capacité de la colonne « Cap. » : revolver .32 = 6, revolver .38 = 8, automatique .45 = 7.
  'revolver-32': { id: 'revolver-32', nom: 'Revolver cal. 32', competence: 'Armes de poing', des: '1D8', empalante: true, aImpact: false, type: 'feu', portee: 15, capacite: 6 },
  'revolver-38': { id: 'revolver-38', nom: 'Revolver cal. 38', competence: 'Armes de poing', des: '1D10', empalante: true, aImpact: false, type: 'feu', portee: 15, capacite: 8 },
  'automatique-45': { id: 'automatique-45', nom: 'Automatique cal. 45', competence: 'Armes de poing', des: '1D10+2', empalante: true, aImpact: false, type: 'feu', portee: 15, capacite: 7 },
  // Attaques naturelles des créatures : dégâts de la ligne « Combat rapproché » du bloc.
  'griffes-goule': { id: 'griffes-goule', nom: 'Griffes de goule', competence: 'Corps à corps', des: '1D6', empalante: false, aImpact: true, type: 'melee' }, // Gardien p. 293
  'coups-ghast': { id: 'coups-ghast', nom: 'Coups de ghast', competence: 'Corps à corps', des: '1D6', empalante: false, aImpact: true, type: 'melee' }, // p. 293
  'pinces-yith': { id: 'pinces-yith', nom: 'Pinces de la Grande Race', competence: 'Corps à corps', des: '1D6', empalante: false, aImpact: true, type: 'melee' }, // p. 295
  // Arme à foudre de la Grande Race (Gardien p. 295) : 1D10 par charge, portée de 100 m, batterie de 32 charges ; Combat à
  // distance 30 %. Les charges multiples, le risque de fusion et le dé malus tous les 100 m ne sont pas modélisés.
  'arme-foudre': { id: 'arme-foudre', nom: 'Arme à foudre', competence: 'Arme à foudre', des: '1D10', empalante: false, aImpact: false, type: 'feu', portee: 100, capacite: 32 },
  'pinces-mi-go': { id: 'pinces-mi-go', nom: 'Pinces de mi-go', competence: 'Corps à corps', des: '1D6', empalante: false, aImpact: true, type: 'melee' }, // p. 303
  'pattes-maigre-bete': { id: 'pattes-maigre-bete', nom: 'Pattes de maigre bête de la nuit', competence: 'Corps à corps', des: '1D4', empalante: false, aImpact: true, type: 'melee' }, // p. 302
  'tentacules-polype': { id: 'tentacules-polype', nom: 'Tentacules de polype volant', competence: 'Corps à corps', des: '1D10', empalante: false, aImpact: false, type: 'melee' }, // p. 305, sans Impact
  'mains-profond': { id: 'mains-profond', nom: 'Mains griffues de Profond', competence: 'Corps à corps', des: '1D6', empalante: false, aImpact: true, type: 'melee' }, // p. 306
  harpon: { id: 'harpon', nom: 'Harpon de Profond', competence: 'Corps à corps', des: '1D8', empalante: false, aImpact: true, type: 'melee' }, // p. 306 : « par exemple, harpon 1D8 + impact »
  'crocs-loup-garou': { id: 'crocs-loup-garou', nom: 'Crocs et griffes de loup-garou', competence: 'Corps à corps', des: '1D8', empalante: false, aImpact: true, type: 'melee' }, // p. 338
  'coups-momie': { id: 'coups-momie', nom: 'Coups de momie', competence: 'Corps à corps', des: '1D6', empalante: false, aImpact: true, type: 'melee' } // p. 339
});

/**
 * Créatures et PNJ. `source` : livre et pages imprimées (le bloc de caractéristiques peut tenir sur la page suivante de
 * la présentation de la créature). `mvt` : Mouvement au sol du bloc (la règle générale donnerait parfois une autre valeur).
 * `attaquesParRound` est absent quand le livre ne donne pas un entier.
 */
export const CREATURES_DEPART = Object.freeze([
  {
    id: 'goule', nom: 'Goule', kind: 'CREATURE', camp: 'ennemi', image: 'maps/tokens/ennemis/morts-vivants/goule.webp',
    source: { livre: GARDIEN, pages: [293] },
    // p. 293 : FOR 80, CON 65, TAI 65, DEX 65, INT 65, POU 65 ; PV 13, Impact +1D4, Carrure 1, PM 13 ; Mouvement 9 ;
    // 3 attaques par round ; Combat rapproché 40 %, Esquive 40 % ; compétences listées ; perte de SAN 0/1D6.
    carac: { FOR: 80, CON: 65, TAI: 65, DEX: 65, APP: 0, INT: 65, POU: 65, EDU: 0 },
    competences: { 'Corps à corps': 40, Esquive: 40, Discrétion: 70, Écouter: 70, Grimper: 85, Sauter: 75, 'Trouver Objet Caché': 50 },
    mvt: 9, attaquesParRound: 3, armeMelee: 'griffes-goule', armeTir: null,
    // Armes à feu et projectiles : moitié des dégâts, arrondie à l'inférieur (p. 293).
    reductionFeu: 'moitie', coutSan: '0/1D6',
    notes: 'La manœuvre « Mordre et serrer » (1D4 par round, p. 293) n’est pas modélisée. 15 % de chances de connaître 1D10 sorts.'
  },
  {
    id: 'ghast', nom: 'Ghast', kind: 'CREATURE', camp: 'ennemi',
    source: { livre: GARDIEN, pages: [292, 293] },
    // p. 292 : FOR 110, CON 70, TAI 130, DEX 65, INT 15, POU 50 ; PV 20, Impact +2D6, Carrure 3, PM 10 ; Mouvement 10 ;
    // 2 attaques par round. p. 293 : Combat rapproché 45 % (1D6 + Impact), Esquive 35 %, Protection aucune,
    // Discrétion 70 %, perte de SAN 0/1D8.
    carac: { FOR: 110, CON: 70, TAI: 130, DEX: 65, APP: 0, INT: 15, POU: 50, EDU: 0 },
    competences: { 'Corps à corps': 45, Esquive: 35, Discrétion: 70 },
    mvt: 10, attaquesParRound: 2, armeMelee: 'coups-ghast', coutSan: '0/1D8',
    notes: 'Vit dans des cavernes sans lumière : exposée au soleil, elle s’affaiblit puis meurt (p. 292). Non modélisé.'
  },
  {
    id: 'grande-race-de-yith', nom: 'Grande Race de Yith', kind: 'CREATURE', camp: 'ennemi',
    source: { livre: GARDIEN, pages: [294, 295] },
    // p. 295 (bloc) : FOR 210, CON 130, TAI 320, DEX 50, INT 100, POU 65 ; PV 45, Impact +6D6, Carrure 7, PM 13 ;
    // Mouvement 7 ; 2 attaques par round (arme à foudre une seule fois) ; Combat rapproché 40 % (pinces, 1D6 + Impact),
    // arme à foudre 30 % (1D10 par charge), Esquive 25 % ; Protection 8 (peau) ; Biologie 80, Chimie 70, Électricité 60,
    // Psychologie 30 ; perte de SAN 0/1D6.
    carac: { FOR: 210, CON: 130, TAI: 320, DEX: 50, APP: 0, INT: 100, POU: 65, EDU: 0 },
    competences: { 'Corps à corps': 40, 'Arme à foudre': 30, Esquive: 25, Biologie: 80, Chimie: 70, Électricité: 60, Psychologie: 30 },
    mvt: 7, attaquesParRound: 2, armeMelee: 'pinces-yith', armeTir: 'arme-foudre', armure: 8, coutSan: '0/1D6',
    notes: 'Voyage temporel : échange d’esprit avec un hôte à travers les âges (p. 294), non modélisé. 10 % de chances de connaître 1D3 sorts. '
      + 'L’arme à foudre porte à 100 m ; plusieurs charges par tir et risque de fusion (p. 295) ne sont pas modélisés.'
  },
  {
    id: 'mi-go', nom: 'Mi-go', kind: 'CREATURE', camp: 'ennemi',
    source: { livre: GARDIEN, pages: [302, 303] },
    // p. 303 (bloc) : FOR 50, CON 50, TAI 50, DEX 70, INT 65, POU 65 ; PV 10, Impact 0, Carrure 0, PM 13 ; Mouvement 7
    // (13 en volant) ; 2 attaques par round ; Combat rapproché 45 % (pinces, 1D6 + Impact), Esquive 35 % ;
    // Protection aucune ; perte de SAN 0/1D6.
    carac: { FOR: 50, CON: 50, TAI: 50, DEX: 70, APP: 0, INT: 65, POU: 65, EDU: 0 },
    competences: { 'Corps à corps': 45, Esquive: 35 },
    mvt: 7, attaquesParRound: 2, armeMelee: 'pinces-mi-go', coutSan: '0/1D6',
    notes: 'Mouvement 13 en volant. Les armes perforantes (balles comprises) ne lui infligent que des dégâts minimums (p. 303), non modélisé. '
      + 'Saisir (porter une victime de carrure égale ou inférieure), hypnose, lumières du vide : non modélisés. 25 % de chances de connaître 1D3 sorts.'
  },
  {
    id: 'maigre-bete-de-la-nuit', nom: 'Maigre bête de la nuit', kind: 'CREATURE', camp: 'ennemi',
    source: { livre: GARDIEN, pages: [302] },
    // p. 302 : FOR 50, CON 50, TAI 70, DEX 65, INT 20, POU 50 ; PV 12, Impact 0, Carrure 0, PM 10 ; Mouvement 6 (12 en
    // volant) ; 1 attaque par round ; Combat rapproché 45 % (1D4 + Impact), Titiller 35 %, Esquive 35 % ; Protection 2
    // (peau) ; Discrétion 90 % ; perte de SAN 0/1D6.
    carac: { FOR: 50, CON: 50, TAI: 70, DEX: 65, APP: 0, INT: 20, POU: 50, EDU: 0 },
    competences: { 'Corps à corps': 45, Esquive: 35, Discrétion: 90 },
    mvt: 6, attaquesParRound: 1, armeMelee: 'pattes-maigre-bete', armure: 2, coutSan: '0/1D6',
    notes: 'Mouvement 12 en volant. Saisir, puis Titiller 35 % (aucun dégât ; la victime est immobilisée 1D6 + 1 rounds et subit un dé malus 1D4 rounds) : non modélisés (p. 302).'
  },
  {
    id: 'peuple-serpent', nom: 'Peuple serpent (non dégénéré)', kind: 'CREATURE', camp: 'ennemi',
    source: { livre: GARDIEN, pages: [303, 304] },
    // p. 304 (« Hommes serpents, non dégénérés ») : FOR 50, CON 50, TAI 50, DEX 65, INT 80, POU 65 ; PV 10, Impact 0,
    // Carrure 0, PM 13 ; Mouvement 8 ; 1 attaque par round ; Combat rapproché 50 % (1D3 + Impact), Morsure 35 %,
    // Esquive 32 % ; Protection 1 (écailles) ; Biologie 40, Chimie 40, Intimidation 60, Trouver Objet Caché 35 ;
    // perte de SAN 0/1D6.
    carac: { FOR: 50, CON: 50, TAI: 50, DEX: 65, APP: 0, INT: 80, POU: 65, EDU: 0 },
    competences: { 'Corps à corps': 50, Esquive: 32, Biologie: 40, Chimie: 40, Intimidation: 60, 'Trouver Objet Caché': 35 },
    mvt: 8, attaquesParRound: 1, armeMelee: 'poing', armure: 1, coutSan: '0/1D6',
    notes: 'Morsure 35 % : 1D8 de dégâts et venin (test extrême de CON, sinon 1D8 de dégâts) : non modélisée (p. 304). '
      + 'Les spécimens dégénérés ont des caractéristiques réduites jusqu’à un tiers ; non donnés. Au moins 2D6 sorts pour un non-dégénéré.'
  },
  {
    id: 'polype-volant', nom: 'Polype volant', kind: 'CREATURE', camp: 'ennemi',
    source: { livre: GARDIEN, pages: [304, 305] },
    // p. 305 (bloc) : FOR 250, CON 125, TAI 250, DEX 65, INT 70, POU 80 ; PV 37, Impact +5D6 (réservé à la bourrasque),
    // Carrure 6, PM 16 ; Mouvement 8 (12 en volant) ; attaques par round : 2D6 tentacules (non entier : champ absent) ;
    // Combat rapproché 85 % (1D10, ignore la protection), Bourrasque 70 %, Esquive 30 % ; Protection 4 ; perte de SAN 1D3/1D20.
    carac: { FOR: 250, CON: 125, TAI: 250, DEX: 65, APP: 0, INT: 70, POU: 80, EDU: 0 },
    competences: { 'Corps à corps': 85, Esquive: 30 },
    mvt: 8, armeMelee: 'tentacules-polype', armure: 4, coutSan: '1D3/1D20',
    notes: 'Attaques par round : 2D6 tentacules chaque round (le livre ne donne pas un entier ; le modèle lit une attaque faute de valeur). '
      + 'Les tentacules ignorent toute protection de la victime. Bourrasque 70 % (dégâts égaux à l’Impact +5D6, moins 1D6 par multiple de 20 m), attaque immobilisante, '
      + 'attaque tourbillon, invisibilité (1 point de magie par round) : non modélisées. Protection 4 plus invisibilité : dégâts minimaux des armes physiques. '
      + 'Mouvement 12 en volant. 70 % de chances de connaître 1D10 sorts (p. 304-305).'
  },
  {
    id: 'profond', nom: 'Profond', kind: 'CREATURE', camp: 'ennemi',
    source: { livre: GARDIEN, pages: [306] },
    // p. 306 : FOR 70, CON 50, TAI 80, DEX 50, INT 65, POU 50 ; PV 13, Impact +1D4, Carrure 1, PM 10 ; Mouvement 8 (10
    // en nageant) ; 1 attaque par round ; Combat rapproché 45 % (1D6 + Impact, ou selon l'arme : harpon 1D8 + Impact),
    // Esquive 25 % ; Protection 1 (peau et écailles) ; perte de SAN 0/1D6.
    carac: { FOR: 70, CON: 50, TAI: 80, DEX: 50, APP: 0, INT: 65, POU: 50, EDU: 0 },
    competences: { 'Corps à corps': 45, Esquive: 25 },
    mvt: 8, attaquesParRound: 1, armeMelee: 'mains-profond', armure: 1, coutSan: '0/1D6',
    notes: 'Mouvement 10 en nageant. Manie volontiers harpons (1D8 + Impact, arme « harpon » du catalogue) et tridents (p. 306). 40 % de chances de connaître 1D4 sorts.'
  },
  {
    id: 'loup-garou', nom: 'Loup-garou', kind: 'CREATURE', camp: 'ennemi',
    source: { livre: GARDIEN, pages: [338] },
    // p. 338 (« sous forme humanoïde », forme bestiale) : FOR 105, CON 65, TAI 55, DEX 65, INT 20, POU 65 ; PV 12,
    // Impact +1D4, Carrure 1, PM 13 ; Mouvement 12 ; 2 attaques par round ; Combat rapproché 50 % (1D8 + Impact),
    // Esquive 32 % ; Protection 1 (fourrure) ; Discrétion 60 %, Pister (à l'odorat) 90 % ; perte de SAN 0/1D8.
    carac: { FOR: 105, CON: 65, TAI: 55, DEX: 65, APP: 0, INT: 20, POU: 65, EDU: 0 },
    competences: { 'Corps à corps': 50, Esquive: 32, Discrétion: 60, 'Pister (à l’odorat)': 90 },
    mvt: 12, attaquesParRound: 2, armeMelee: 'crocs-loup-garou', armure: 1, coutSan: '0/1D8',
    notes: 'Bloc de la forme humanoïde bestiale ; TAI 65 sous la forme de loup géant (non modélisé). Perte de SAN 0/1D3 pour voir la transformation. '
      + 'Régénère 1 PV par round sous forme animale ou semi-bestiale ; immunisé à la plupart des armes, blessé par le feu et l’argent (une blessure grave par argent le tue) : '
      + 'non modélisé. La morsure transmet la malédiction (p. 338).'
  },
  {
    id: 'momie', nom: 'Momie', kind: 'CREATURE', camp: 'ennemi',
    source: { livre: GARDIEN, pages: [339] },
    // p. 339 : FOR 105, CON 80, TAI 65, DEX 35, INT 55, POU 75 ; PV 14, Impact +1D6, Carrure 2, PM 15 ; Mouvement 6 ;
    // 2 attaques par round ; Combat rapproché 70 % (1D6 + Impact), Esquive 17 % ; Protection 2 (peau) ; Discrétion 50 % ;
    // perte de SAN 1/1D8.
    carac: { FOR: 105, CON: 80, TAI: 65, DEX: 35, APP: 0, INT: 55, POU: 75, EDU: 0 },
    competences: { 'Corps à corps': 70, Esquive: 17, Discrétion: 50 },
    mvt: 6, attaquesParRound: 2, armeMelee: 'coups-momie', armure: 2, coutSan: '1/1D8',
    notes: 'Les armes perforantes lui infligent la moitié des dégâts (p. 339) : non modélisé (la réduction de moitié du modèle ne porte que sur les armes à feu et les projectiles). '
      + 'Une momie égyptienne est très sensible au feu (p. 339).'
  },
  {
    id: 'disciple-jacob-smith', nom: 'Disciple de Jacob Smith', kind: 'PNJ', camp: 'ennemi',
    source: { livre: AVENTURES, pages: [129] },
    // Aventures effroyables p. 129 (scénario d'Arkham, « Disciples de Jacob Smith », adorateurs d'Azathoth) : FOR 50, CON 60,
    // TAI 60, DEX 60, APP 50, INT 70, POU 60, ÉDU 80 ; PV 12, Impact 0, Carrure 0, Mouvement 8 ; Combat rapproché
    // (corps à corps) 40 % (1D3), Machette 40 % (1D8), Revolver .32 40 % (1D8), Esquive 30 % ; compétences listées.
    // Le bloc ne donne ni attaques par round, ni perte de SAN, ni arme en main : ces champs restent absents.
    carac: { FOR: 50, CON: 60, TAI: 60, DEX: 60, APP: 50, INT: 70, POU: 60, EDU: 80 },
    competences: {
      'Corps à corps': 40, 'Armes de poing': 40, Esquive: 30, Baratin: 30, Conduite: 30, Discrétion: 60, Écouter: 60, Grimper: 50,
      Intimidation: 40, Lancer: 25, Mécanique: 30, 'Mythe de Cthulhu': 20, Occultisme: 60, Persuasion: 40, Psychologie: 40, Sauter: 40,
      'Trouver Objet Caché': 40
    },
    mvt: 8, armeMelee: 'couteau-grand', armeTir: 'revolver-32',
    notes: 'La machette du livre (1D8) est le grand couteau du tableau des armes ; le revolver .32 (1D8) est celui du tableau (capacité 6). '
      + 'Au corps à corps nu : 40 %, 1D3 (arme « poing »). Santé mentale et Chance : 0 dans le bloc (p. 129).'
  }
]);

/**
 * Entrées du livre qui n'ont pas de profil chiffré : elles n'entrent pas dans la réserve, car le modèle exige des
 * caractéristiques et le livre n'en donne aucune.
 */
export const SANS_BLOC_DEPART = Object.freeze([
  {
    id: 'fantome', nom: 'Fantôme', source: { livre: GARDIEN, pages: [337] },
    raison: 'Le livre ne donne aucune caractéristique chiffrée : le Gardien taille ses fantômes sur mesure, et seuls l’INT et le POU les caractérisent (p. 337).',
    // Une attaque est un test opposé de POU : l'investigateur qui échoue perd 2D10 POU, le fantôme les perd s'il échoue (3D10 ou plus pour un fantôme puissant).
    coutSanMax: '1D8',
    notes: 'Perte de SAN : jamais plus de 1D8 (p. 337). Attaque : test opposé de POU ; perte forfaitaire de 2D10 POU (3D10 ou plus pour un fantôme puissant). Non modélisé.'
  }
]);

/** Réserve prête à l'emploi : les armes, les dix créatures et le PNJ humain des livres. Aucun investigateur. */
export function reserveDeDepart() {
  let reserve = creerReserve();
  for (const arme of Object.values(ARMES_DEPART)) reserve = ajouterArme(reserve, arme);
  for (const profil of CREATURES_DEPART) reserve = ajouterProfil(reserve, profil);
  return reserve;
}
