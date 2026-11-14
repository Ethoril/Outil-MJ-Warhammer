/**
 * L29 : transcription relue des profils V2 (noms et chiffres imprimés seulement, jamais le texte des règles) et choix de
 * conversion par créature (Taille, animal, mots-clés, dossier, vol de la créature V5 de référence), à valider par le MJ.
 * Transcription : Gemini (pages à profils, filigrane rogné) et relecture sur image, contrôlée contre la couche texte du PDF (14/11/2026).
 * Généré une fois, puis tenu à la main : toute correction se fait ici, relue sur la page.
 */
export const PROFILES = Object.freeze([
 {
  "printedTitle": "MARIE LA SANGUINAIRE",
  "page": 23,
  "physicalPage": 25,
  "main": [
   "48%",
   "28%",
   "51%",
   "45%",
   "53%",
   "50%",
   "56%",
   "41%"
  ],
  "secondary": [
   "1",
   "15",
   "5",
   "4",
   "4",
   "0",
   "6",
   "0"
  ],
  "skills": "Charisme, Commérage, Conduite d'attelages, Connaissances générales (Empire), Intimidation, Langue (reikspiel), Langue (tiléen), Lire/écrire, Marchandage, Métier (apothicaire), Perception +10%, Préparation de poisons, Soins +20%, Torture",
  "talents": "Calcul mental, Chirurgie, Intelligent, Lutte, Maîtrise (fléaux), Menaçant, Résistance aux maladies, Sociable",
  "rules": [],
  "weapons": "arme à une main (couperet de boucher)",
  "armourPoints": "tête 0, bras 0, corps 3, jambes 0",
  "size": "average",
  "keywords": [
   "humain"
  ],
  "folder": "pnj/l29"
 },
 {
  "printedTitle": "HERMAN SCHMIDT",
  "page": 60,
  "physicalPage": 62,
  "main": [
   "45%",
   "29%",
   "41%",
   "35%",
   "51%",
   "26%",
   "32%",
   "21%"
  ],
  "secondary": [
   "2",
   "18",
   "4",
   "3",
   "4",
   "0",
   "6",
   "0"
  ],
  "skills": "Alphabet secret (rôdeur), Commérage, Conduite d'attelages, Connaissances générales (Empire), Déplacement silencieux, Dissimulation +10%, Escalade, Esquive, Fouille, Langue (reikspiel), Marchandage, Perception, Pistage, Survie",
  "talents": "Force accrue, Fuite, Imitation, Résistance accrue",
  "rules": [
   "Mutations du Chaos"
  ],
  "weapons": "arme à une main (hachette)",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "humain",
   "mutant"
  ],
  "folder": "pnj/l29"
 },
 {
  "printedTitle": "Herman Schmidt, enfant du Chaos",
  "page": 60,
  "physicalPage": 62,
  "main": [
   "25%",
   "0%",
   "19%",
   "15%",
   "46%",
   "0%",
   "0%",
   "0%"
  ],
  "secondary": [
   "2",
   "28",
   "1",
   "1",
   "2",
   "0",
   "0",
   "0"
  ],
  "skills": "Perception +10%",
  "talents": "Armes naturelles, Sans peur, Terrifiant",
  "rules": [
   "Mutations du Chaos"
  ],
  "weapons": "tentacules",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "large",
  "keywords": [
   "mutant"
  ],
  "folder": "pnj/l29",
  "title": "Herman Schmidt, enfant du Chaos"
 },
 {
  "printedTitle": "LE DÉMON DU CATALOGUE",
  "page": 87,
  "physicalPage": 89,
  "main": [
   "25%",
   "0%",
   "28%",
   "38%",
   "44%",
   "12%",
   "32%",
   "5%"
  ],
  "secondary": [
   "1",
   "16",
   "2",
   "3",
   "4",
   "0",
   "0",
   "0"
  ],
  "skills": "aucune",
  "talents": "Armes naturelles, Effrayant",
  "rules": [
   "Adhérence",
   "Paralysie",
   "Parasite"
  ],
  "weapons": "morsure",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "small",
  "keywords": [
   "demon"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "CHIEN DU CHAOS",
  "page": 111,
  "physicalPage": 113,
  "main": [
   "44%",
   "0%",
   "34%",
   "38%",
   "47%",
   "18%",
   "34%",
   "5%"
  ],
  "secondary": [
   "1",
   "12",
   "3",
   "3",
   "7",
   "0",
   "0",
   "0"
  ],
  "skills": "Déplacement silencieux, Natation, Perception +10%, Pistage +10%",
  "talents": "Armes naturelles, Frénésie, Sens aiguisés, Troublant",
  "rules": [
   "Mutations du Chaos",
   "Silencieux comme les animaux des bois"
  ],
  "weapons": "dents",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "chien",
   "chaos"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "SANGLEBOUC",
  "page": 111,
  "physicalPage": 113,
  "main": [
   "33%",
   "0%",
   "36%",
   "44%",
   "32%",
   "20%",
   "37%",
   "12%"
  ],
  "secondary": [
   "1",
   "8",
   "3",
   "4",
   "7",
   "0",
   "0",
   "0"
  ],
  "skills": "Déplacement silencieux, Dissimulation, Perception, Pistage +10%, Survie",
  "talents": "Armes naturelles, Camouflage rural, Coups puissants, Frénésie, Sens aiguisés, Troublant",
  "rules": [
   "Charge de sanglebouc",
   "Mutations du Chaos",
   "Silencieux comme les animaux des bois"
  ],
  "weapons": "défenses et cornes",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "sanglier",
   "chaos"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "AMALGAMES",
  "page": 117,
  "physicalPage": 119,
  "main": [
   "46%",
   "0%",
   "55%",
   "56%",
   "21%",
   "0%",
   "0%",
   "0%"
  ],
  "secondary": [
   "6",
   "26",
   "5",
   "5 (7)",
   "4",
   "0",
   "0",
   "0"
  ],
  "skills": "aucune",
  "talents": "Armes naturelles, Aura démoniaque (cf. page 240), Coups assommants, Coups puissants, Terrifiant, Vision nocturne",
  "rules": [
   "Absorption",
   "Mutations du Chaos",
   "Dénué de conscience",
   "Monstrueuse puissance"
  ],
  "weapons": "dents",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "large",
  "keywords": [
   "monstre",
   "chaos"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "AMPHISBÈNES",
  "page": 118,
  "physicalPage": 120,
  "main": [
   "33%",
   "0%",
   "42%",
   "36%",
   "43%",
   "5%",
   "43%",
   "2%"
  ],
  "secondary": [
   "2",
   "15",
   "4",
   "3",
   "4",
   "0",
   "0",
   "0"
  ],
  "skills": "Déplacement silencieux +10%, Dissimulation, Esquive +10%, Perception",
  "talents": "Armes naturelles, Écailles (1)",
  "rules": [
   "Constriction",
   "Forme inhabituelle",
   "Morsure opportuniste",
   "Morsure venimeuse"
  ],
  "weapons": "crocs",
  "armourPoints": "tête 1, tête 1, corps 1",
  "size": "large",
  "keywords": [
   "serpent",
   "monstre"
  ],
  "folder": "monstres",
  "animal": true,
  "ref": "Amphisbaena L11 p. 47 (Grande)"
 },
 {
  "printedTitle": "BAISERS DE JOUVENCE",
  "page": 119,
  "physicalPage": 121,
  "main": [
   "12%",
   "0%",
   "5%",
   "11%",
   "60%",
   "35%",
   "30%",
   "55%"
  ],
  "secondary": [
   "1",
   "1",
   "0",
   "1 (3)",
   "1 (6)",
   "0",
   "0",
   "0"
  ],
  "skills": "Charisme +10%, Déplacement silencieux +10%, Dissimulation +20%, Esquive +20%, Filature, Langage mystique (démoniaque), Perception, Soins",
  "talents": "Réflexes éclair, Sans peur, Sens aiguisés, Vision nocturne, Vol",
  "rules": [
   "De lait et de miel",
   "Mutations du Chaos",
   "Obsession"
  ],
  "weapons": "dard (BF-2)",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "small",
  "keywords": [
   "monstre",
   "chaos"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "BASILICS",
  "page": 119,
  "physicalPage": 121,
  "main": [
   "33%",
   "0%",
   "52%",
   "43%",
   "30%",
   "14%",
   "14%",
   "3%"
  ],
  "secondary": [
   "3",
   "15",
   "5",
   "4",
   "4",
   "0",
   "0",
   "0"
  ],
  "skills": "Déplacement silencieux, Dissimulation, Escalade, Perception +10%, Pistage",
  "talents": "Acuité visuelle, Armes naturelles, Coups précis, Écailles (3), Effrayant, Résistance aux poisons, Sans peur, Sens aiguisés, Vision nocturne",
  "rules": [
   "Morsure venimeuse",
   "Mutations du Chaos",
   "Regard pétrifiant"
  ],
  "weapons": "dents",
  "armourPoints": "tête 3, bras 3, corps 3, jambes 3",
  "size": "large",
  "keywords": [
   "monstre"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "CHIMÈRES",
  "page": 120,
  "physicalPage": 122,
  "main": [
   "41%",
   "0%",
   "66%",
   "66%",
   "33%",
   "14%",
   "74%",
   "12%"
  ],
  "secondary": [
   "6",
   "41",
   "6",
   "6",
   "5 (10)",
   "0",
   "0",
   "0"
  ],
  "skills": "Esquive +10%, Survie",
  "talents": "Armes naturelles, Effrayant, Frénésie, Sens aiguisés, Vol, Volonté de fer",
  "rules": [
   "Morsure venimeuse",
   "Mutations du Chaos"
  ],
  "weapons": "griffes, dents, queue à pointes",
  "armourPoints": "tête 1, bras 1, corps 1, jambes 1",
  "size": "enormous",
  "keywords": [
   "chimere",
   "bete"
  ],
  "folder": "monstres",
  "animal": true,
  "fly": 80,
  "ref": "Chimera L11 p. 67 (Énorme, Vol 80)"
 },
 {
  "printedTitle": "DRAGONS DU CHAOS",
  "page": 121,
  "physicalPage": 123,
  "main": [
   "64%",
   "0%",
   "65%",
   "68%",
   "30%",
   "47%",
   "89%",
   "34%"
  ],
  "secondary": [
   "6",
   "61",
   "6",
   "6",
   "6 (8)",
   "0",
   "0",
   "0"
  ],
  "skills": "Charisme, Commandement +20%, Commérage, Connaissances académiques (démonologie) +20%, Connaissances générales (Désolations du Chaos +10%, dragons +20%, hommes-bêtes), Escalade +10%, Évaluation +10%, Fouille, Intimidation +20%, Langage mystique (démoniaque), Langue (langage sombre, plus trois autres au choix), Perception +20%",
  "talents": "Acuité visuelle, Armes naturelles, Coups assommants, Coups précis, Coups puissants, Écailles (5), Puissance imparable, Sain d'esprit, Terrifiant, Vision nocturne, Vol, Volonté de fer",
  "rules": [
   "Attaques déchirantes",
   "Multiplication des attaques",
   "Mutations du Chaos",
   "Souffle de feu"
  ],
  "weapons": "griffes, queue, dents, ailes",
  "armourPoints": "tête 5, bras 5, corps 5, jambes 5",
  "size": "enormous",
  "keywords": [
   "dragon",
   "chaos"
  ],
  "folder": "monstres",
  "fly": 80,
  "ref": "Dragon L06 p. 330 (Énorme, Vol 80)"
 },
 {
  "printedTitle": "DRAGONS-OGRES",
  "page": 122,
  "physicalPage": 124,
  "main": [
   "48%",
   "22%",
   "55%",
   "48%",
   "28%",
   "38%",
   "48%",
   "20%"
  ],
  "secondary": [
   "3",
   "34",
   "5",
   "4",
   "7",
   "0",
   "0",
   "0"
  ],
  "skills": "Commandement, Connaissances académiques (histoire) +20%, Connaissances générales (Désolations du Chaos), Escalade +10%, Intimidation +20%, Langue (langage sombre), Langue (deux au choix), Perception +20%, Survie",
  "talents": "Armes naturelles, Écailles (2), Effrayant, Maîtrise (armes lourdes), Résistance au poison, Sain d'esprit, Vision nocturne",
  "rules": [
   "Absorption d'éclairs"
  ],
  "weapons": "griffes, arme à deux mains (hache à deux mains)",
  "armourPoints": "tête 2, bras 2, corps 2, jambes 2",
  "size": "large",
  "keywords": [
   "monstre",
   "chaos"
  ],
  "folder": "monstres"
 },
 {
  "printedTitle": "SHAGGOTHS",
  "page": 122,
  "physicalPage": 124,
  "main": [
   "69%",
   "38%",
   "58%",
   "56%",
   "32%",
   "58%",
   "68%",
   "30%"
  ],
  "secondary": [
   "5",
   "66",
   "5",
   "5",
   "7",
   "0",
   "0",
   "0"
  ],
  "skills": "Commandement +20%, Connaissances académiques (histoire) +20%, Connaissances générales (Désolations du Chaos), Connaissances générales (trois au choix), Escalade +10%, Intimidation +30%, Langue (langage sombre), Langue (quatre au choix), Perception +20%, Survie",
  "talents": "Armes naturelles, Coups assommants, Coups précis, Coups puissants, Écailles (4), Maîtrise (armes lourdes), Puissance imparable, Résistance au poison, Terrifiant, Vision nocturne, Volonté de fer",
  "rules": [
   "Absorption d'éclairs",
   "Monstrueuse puissance"
  ],
  "weapons": "griffes, arme à deux mains (hache à deux mains), dents",
  "armourPoints": "tête 4, bras 4, corps 4, jambes 4",
  "size": "enormous",
  "keywords": [
   "monstre",
   "chaos"
  ],
  "folder": "monstres"
 },
 {
  "printedTitle": "FANGES DU CHAOS",
  "page": 122,
  "physicalPage": 124,
  "main": [
   "36%",
   "0%",
   "33%",
   "56%",
   "13%",
   "18%",
   "26%",
   "5%"
  ],
  "secondary": [
   "3",
   "18",
   "3",
   "5",
   "4",
   "0",
   "0",
   "0"
  ],
  "skills": "Dissimulation +20%",
  "talents": "Armes naturelles, Informe, Lutte, Résistance à la magie, Troublant",
  "rules": [
   "Enveloppement",
   "Mutagène",
   "Rampant"
  ],
  "weapons": "pseudopodes",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "large",
  "keywords": [
   "monstre",
   "chaos"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "JABBERWOCKS",
  "page": 124,
  "physicalPage": 126,
  "main": [
   "79%",
   "0%",
   "55%",
   "67%",
   "14%",
   "12%",
   "89%",
   "8%"
  ],
  "secondary": [
   "4",
   "47",
   "5",
   "6",
   "6",
   "0",
   "0",
   "0"
  ],
  "skills": "Escalade, Intimidation, Natation",
  "talents": "Coups précis, Coups puissants, Terrifiant, Vision nocturne, Volonté de fer",
  "rules": [
   "Déconcerté par la douleur",
   "Morsure venimeuse",
   "Mutations du Chaos",
   "Régénération",
   "Stupidité"
  ],
  "weapons": "dents et griffes",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "large",
  "keywords": [
   "monstre",
   "chaos"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "NUÉES DU CHAGRIN",
  "page": 124,
  "physicalPage": 126,
  "main": [
   "28%",
   "0%",
   "14%",
   "21%",
   "46%",
   "12%",
   "27%",
   "15%"
  ],
  "secondary": [
   "3",
   "10",
   "1",
   "2",
   "0 (4)",
   "0",
   "0",
   "0"
  ],
  "skills": "Déplacement silencieux, Esquive, Perception +20%",
  "talents": "Sens aiguisés, Vol",
  "rules": [
   "Aura de chagrin",
   "Frénésie des larmes",
   "Nuée"
  ],
  "weapons": "griffes (BF–1)",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "small",
  "keywords": [
   "monstre",
   "chaos"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "SOYEUSES",
  "page": 125,
  "physicalPage": 127,
  "main": [
   "28%",
   "0%",
   "18%",
   "22%",
   "48%",
   "21%",
   "28%",
   "14%"
  ],
  "secondary": [
   "1",
   "8",
   "1",
   "2",
   "4",
   "0",
   "0",
   "0"
  ],
  "skills": "Déplacement silencieux, Dissimulation +20%, Escalade +20%, Esquive +10%, Perception +10%, Survie",
  "talents": "Armes naturelles, Contorsionniste, Grimpeur chevronné, Sens aiguisés, Vision nocturne",
  "rules": [
   "Filaments",
   "Venin"
  ],
  "weapons": "dents",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "monstre",
   "chaos"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "VERS DES BRÈCHES",
  "page": 126,
  "physicalPage": 128,
  "main": [
   "5%",
   "0%",
   "6%",
   "11%",
   "18%",
   "2%",
   "10%",
   "4%"
  ],
  "secondary": [
   "1",
   "1",
   "0",
   "1",
   "1",
   "0",
   "0",
   "0"
  ],
  "skills": "Dissimulation +30%",
  "talents": "aucun",
  "rules": [
   "Fouissage",
   "Minuscule",
   "Subsistance"
  ],
  "weapons": "aucune",
  "armourPoints": "corps 0",
  "size": "small",
  "keywords": [
   "monstre"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "VERS DES MARAIS",
  "page": 126,
  "physicalPage": 128,
  "main": [
   "35%",
   "0%",
   "64%",
   "41%",
   "32%",
   "10%",
   "12%",
   "4%"
  ],
  "secondary": [
   "4",
   "23",
   "6",
   "4",
   "6",
   "0",
   "0",
   "0"
  ],
  "skills": "Déplacement silencieux, Dissimulation, Perception +20%",
  "talents": "Armes naturelles, Écailles (3), Troublant",
  "rules": [
   "Constriction",
   "Fouissage",
   "Morsure venimeuse"
  ],
  "weapons": "crocs",
  "armourPoints": "tête 3, bras 3, corps 3, jambes 3",
  "size": "enormous",
  "keywords": [
   "monstre"
  ],
  "folder": "monstres",
  "animal": true,
  "ref": "Fen Worm L11 p. 52 (Énorme)"
 },
 {
  "printedTitle": "VERS FOUETTARDS",
  "page": 127,
  "physicalPage": 129,
  "main": [
   "0%",
   "33%",
   "10%",
   "12%",
   "24%",
   "0%",
   "0%",
   "0%"
  ],
  "secondary": [
   "1",
   "7",
   "1",
   "1",
   "0",
   "0",
   "0",
   "0"
  ],
  "skills": "Dissimulation +20%",
  "talents": "aucun",
  "rules": [
   "Dénué de conscience",
   "Minuscule",
   "Sensibilité aux mouvements"
  ],
  "weapons": "organe fouetteur",
  "armourPoints": "corps 0",
  "size": "small",
  "keywords": [
   "monstre"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "VERS SOLAIRES",
  "page": 127,
  "physicalPage": 129,
  "main": [
   "14%",
   "0%",
   "46%",
   "48%",
   "60%",
   "14%",
   "18%",
   "8%"
  ],
  "secondary": [
   "0",
   "15",
   "4",
   "4",
   "1",
   "0",
   "0",
   "0"
  ],
  "skills": "Perception",
  "talents": "Troublant",
  "rules": [
   "Décharge électrique"
  ],
  "weapons": "aucune",
  "armourPoints": "corps 0",
  "size": "average",
  "keywords": [
   "monstre"
  ],
  "folder": "monstres",
  "animal": true
 },
 {
  "printedTitle": "KNUTE ALSGAARD",
  "page": 141,
  "physicalPage": 143,
  "main": [
   "56%",
   "39%",
   "42%",
   "43%",
   "62%",
   "58%",
   "64%",
   "73%"
  ],
  "secondary": [
   "1",
   "16",
   "4",
   "4",
   "4",
   "0",
   "0",
   "0"
  ],
  "skills": "Baratin, Charisme, Commérage +30%, Conduite d'attelages, Connaissances générales (Empire, Norsca), Esquive, Évaluation +20%, Fouille +10%, Langue (kislevien, norse, reikspiel, tiléen), Lecture sur les lèvres, Lire/Écrire, Marchandage +20%, Métier (cuisinier), Perception +20%, Résistance à l'alcool +10%",
  "talents": "Acuité auditive, Code de la rue, Coups assommants, Dur en affaires, Étiquette, Résistance accrue, Sain d'esprit, Sang-froid, Sociable",
  "rules": [],
  "weapons": "arme à une main (épée), dague, coup-de-poing",
  "armourPoints": "tête 0, bras 1, corps 1, jambes 0",
  "size": "average",
  "keywords": [
   "humain"
  ],
  "folder": "pnj/l29"
 },
 {
  "printedTitle": "YMIR",
  "page": 148,
  "physicalPage": 150,
  "main": [
   "44%",
   "12%",
   "38%",
   "47%",
   "31%",
   "23%",
   "28%",
   "18%"
  ],
  "secondary": [
   "2",
   "14",
   "3",
   "4",
   "5",
   "0",
   "0",
   "0"
  ],
  "skills": "Déplacement silencieux, Dissimulation +10%, Filature, Intimidation, Langue (langage sombre), Perception, Pistage, Survie",
  "talents": "Armes naturelles, Camouflage rural, Effrayant, Grimpeur chevronné (cf. page 117), Sens aiguisés, Vision nocturne",
  "rules": [
   "Mutations du Chaos"
  ],
  "weapons": "griffes",
  "armourPoints": "tête 1, bras 1, corps 1, jambes 1",
  "size": "large",
  "keywords": [
   "monstre",
   "chaos"
  ],
  "folder": "monstres"
 },
 {
  "printedTitle": "ASPIRANT CHAMPION DE TCHAR",
  "page": 164,
  "physicalPage": 166,
  "main": [
   "63%",
   "38%",
   "56%",
   "63%",
   "46%",
   "30%",
   "59%",
   "32%"
  ],
  "secondary": [
   "3",
   "21",
   "5",
   "6",
   "4",
   "0",
   "5",
   "1"
  ],
  "skills": "Commandement +10%, Connaissances académiques (démonologie), Connaissances générales (Désolations du Chaos, Norsca), Équitation +10%, Esquive, Fouille, Intimidation +10%, Langage mystique (démoniaque), Langue (langage sombre, kurgan, norse, reikspiel), Orientation, Perception +10%, Pistage, Résistance à l'alcool, Soins des anomaux, Survie",
  "talents": "Coups précis, Coups puissants, Dur à cuire, Élu du Chaos (cf. page 176), Grand voyageur, Guerrier né, Maîtrise (armes de cavalerie, fléaux), Menaçant, Résistance accrue, Rompu au Chaos (cf. page 69), Sang-froid, Sens de l'orientation",
  "rules": [
   "Mutations du Chaos",
   "Récompenses du Chaos",
   "Don de Tchar"
  ],
  "weapons": "fléau d'armes, arme à une main (épée), deux javelines, bouclier",
  "armourPoints": "tête 5, bras 5, corps 5, jambes 5",
  "size": "average",
  "keywords": [
   "humain",
   "guerrier-du-chaos"
  ],
  "folder": "ennemis/reprouves"
 },
 {
  "printedTitle": "MARAUDEUR KURGAN",
  "page": 165,
  "physicalPage": 167,
  "main": [
   "49%",
   "28%",
   "41%",
   "48%",
   "34%",
   "21%",
   "38%",
   "19%"
  ],
  "secondary": [
   "2",
   "15",
   "4",
   "4",
   "4",
   "0",
   "2",
   "0"
  ],
  "skills": "Connaissances générales (Désolations du Chaos), Équitation, Fouille, Langue (kurgan), Orientation, Perception, Pistage, Résistance à l'alcool, Soins des animaux, Survie",
  "talents": "Coups précis, Dur à cuire, Guerrier né, Maîtrise (armes de cavalerie), Résistance accrue, Rompu au Chaos (cf. page 69), Sens de l'orientation",
  "rules": [
   "Mutations du Chaos"
  ],
  "weapons": "arme à une main (épée), deux javelines, bouclier",
  "armourPoints": "tête 3, bras 0, corps 0, jambes 1",
  "size": "average",
  "keywords": [
   "humain",
   "adorateur-du-chaos"
  ],
  "folder": "ennemis/reprouves"
 },
 {
  "printedTitle": "PONEYS DE GUERRE",
  "page": 166,
  "physicalPage": 168,
  "main": [
   "31%",
   "0%",
   "38%",
   "42%",
   "36%",
   "11%",
   "21%",
   "0%"
  ],
  "secondary": [
   "1",
   "16",
   "3",
   "4",
   "7",
   "0",
   "0",
   "0"
  ],
  "skills": "Natation, Perception +10%",
  "talents": "Acuité auditive, Course à pied, Dur à cuire, Sens aiguisés",
  "rules": [
   "Perspective d'Éradication"
  ],
  "weapons": "morsure (BF-1)",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "cheval"
  ],
  "folder": "bestiaire",
  "animal": true,
  "ref": "Poney L27 p. 119 (Moyenne)"
 },
 {
  "printedTitle": "ARME ANIMÉE",
  "page": 196,
  "physicalPage": 198,
  "main": [
   "41%",
   "0%",
   "44%",
   "48%",
   "60%",
   "0%",
   "0%",
   "0%"
  ],
  "secondary": [
   "3",
   "17",
   "4",
   "4",
   "0 (4)",
   "0",
   "0",
   "0"
  ],
  "skills": "aucune",
  "talents": "Parade éclair, Vol",
  "rules": [
   "Dénué de conscience"
  ],
  "weapons": "elle-même",
  "armourPoints": "corps 4",
  "size": "small",
  "keywords": [
   "demon"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "CHIENS DE KHORNE",
  "page": 239,
  "physicalPage": 241,
  "main": [
   "54%",
   "0%",
   "46%",
   "38%",
   "48%",
   "14%",
   "66%",
   "5%"
  ],
  "secondary": [
   "1",
   "14",
   "4",
   "3 (5)",
   "7",
   "0",
   "0",
   "0"
  ],
  "skills": "Déplacement silencieux, Escalade, Natation, Perception +10%, Pistage +20%",
  "talents": "Armes naturelles, Aura démoniaque, Camouflage rural, Effrayant, Frénésie, Sans peur, Sens aiguisés, Vision nocturne",
  "rules": [
   "Collier de Khorne",
   "Instabilité",
   "Mutations du Chaos"
  ],
  "weapons": "crocs et griffes",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "demon-de-khorne"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "JUGGERNAUTS",
  "page": 239,
  "physicalPage": 241,
  "main": [
   "58%",
   "0%",
   "55%",
   "58%",
   "24%",
   "6%",
   "44%",
   "0%"
  ],
  "secondary": [
   "2",
   "24",
   "5",
   "5 (7)",
   "7",
   "0",
   "0",
   "0"
  ],
  "skills": "Perception",
  "talents": "Acuité auditive, Armes naturelles, Aura démoniaque, Coups assommants, Coups précis, Coups puissants, Effrayant, Frénésie, Sens aiguisés, Vision nocturne, Volonté de fer",
  "rules": [
   "Assoiffé de sang",
   "Instabilité",
   "Mutations du Chaos",
   "Piétinement"
  ],
  "weapons": "cornes, sabots, morsure",
  "armourPoints": "tête 2, bras 2, corps 2, jambes 2",
  "size": "large",
  "keywords": [
   "demon-de-khorne"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "SANGUINAIRES DE KHORNE",
  "page": 240,
  "physicalPage": 242,
  "main": [
   "50%",
   "0%",
   "51%",
   "34%",
   "48%",
   "48%",
   "48%",
   "10%"
  ],
  "secondary": [
   "2",
   "12",
   "5",
   "3 (5)",
   "4",
   "0",
   "0",
   "0"
  ],
  "skills": "Esquive, Langage mystique (démoniaque), Langue (langage sombre), Perception",
  "talents": "Armes naturelles, Aura démoniaque, Effrayant, Frénésie, Maîtrise (armes lourdes), Résistance à la magie, Vision nocturne, Volonté de fer",
  "rules": [
   "Instabilité",
   "Mutations du Chaos"
  ],
  "weapons": "griffes, arme à deux mains (épée à deux mains), cornes (dégâts BF-1)",
  "armourPoints": "tête 2, bras 2, corps 2, jambes 2",
  "size": "average",
  "keywords": [
   "demon-de-khorne"
  ],
  "folder": "ennemis/demons",
  "ref": "Bloodletter L06 p. 349 (Moyenne)"
 },
 {
  "printedTitle": "BÊTES DE NURGLE",
  "page": 241,
  "physicalPage": 243,
  "main": [
   "30%",
   "0%",
   "36%",
   "52%",
   "18%",
   "10%",
   "58%",
   "0%"
  ],
  "secondary": [
   "6",
   "15",
   "3",
   "5 (7)",
   "3",
   "0",
   "0",
   "0"
  ],
  "skills": "Natation, Perception +20%",
  "talents": "Armes naturelles, Aura démoniaque, Effrayant, Sens aiguisés, Vision nocturne, Volonté de fer",
  "rules": [
   "Incarnation putride",
   "Instabilité",
   "Peur du feu",
   "Mucus",
   "Mutations du Chaos",
   "Paralysie",
   "Peau caoutchouteuse",
   "Peste"
  ],
  "weapons": "tentacules",
  "armourPoints": "tête 2, bras 2, corps 2, jambes 2",
  "size": "large",
  "keywords": [
   "demon-de-nurgle"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "NURGLINGS",
  "page": 242,
  "physicalPage": 244,
  "main": [
   "20%",
   "30%",
   "21%",
   "23%",
   "60%",
   "25%",
   "30%",
   "25%"
  ],
  "secondary": [
   "2",
   "7",
   "2",
   "2 (4)",
   "4",
   "0",
   "0",
   "0"
  ],
  "skills": "Déplacement silencieux, Dissimulation +10%, Esquive, Langage mystique (démoniaque), Langue (langage sombre), Natation, Perception",
  "talents": "Ambidextre, Aura démoniaque, Sans peur, Troublant, Vision nocturne",
  "rules": [
   "Instabilité",
   "Mutations du Chaos",
   "Peste"
  ],
  "weapons": "griffes et dents (BF–2)",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "small",
  "keywords": [
   "demon-de-nurgle"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "PORTEPESTES",
  "page": 243,
  "physicalPage": 245,
  "main": [
   "45%",
   "0%",
   "41%",
   "47%",
   "40%",
   "30%",
   "44%",
   "11%"
  ],
  "secondary": [
   "1",
   "12",
   "4",
   "4 (6)",
   "4",
   "0",
   "0",
   "0"
  ],
  "skills": "Esquive, Langage mystique (démoniaque), Langue (langage sombre), Perception",
  "talents": "Ambidextre, Armes naturelles, Aura démoniaque, Coups précis, Effrayant, Vision nocturne, Volonté de fer",
  "rules": [
   "Instabilité",
   "Mutations du Chaos",
   "Peste",
   "Torrent de corruption"
  ],
  "weapons": "arme à une main, griffes",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "demon-de-nurgle"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "BÊTES DE SLAANESH",
  "page": 244,
  "physicalPage": 246,
  "main": [
   "33%",
   "0%",
   "36%",
   "35%",
   "39%",
   "14%",
   "43%",
   "0%"
  ],
  "secondary": [
   "3",
   "14",
   "3",
   "3 (5)",
   "6",
   "0",
   "0",
   "0"
  ],
  "skills": "Déplacement silencieux, Escalade, Esquive +10%, Natation, Perception +20%, Pistage +20%",
  "talents": "Acuité visuelle, Armes naturelles, Aura démoniaque, Camouflage rural, Coups précis, Écailles (2), Effrayant, Sans peur, Sens aiguisés",
  "rules": [
   "Instabilité",
   "Langue",
   "Musc",
   "Mutations du Chaos"
  ],
  "weapons": "cornes ou langue",
  "armourPoints": "tête 2, bras 2, corps 2, jambes 2",
  "size": "average",
  "keywords": [
   "demon-de-slaanesh"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "DÉMONETTES",
  "page": 245,
  "physicalPage": 247,
  "main": [
   "44%",
   "0%",
   "40%",
   "37%",
   "52%",
   "31%",
   "40%",
   "55%"
  ],
  "secondary": [
   "2",
   "12",
   "4",
   "3 (5)",
   "5",
   "0",
   "0",
   "0"
  ],
  "skills": "Commérage +20%, Charisme +20%, Esquive, Expression artistique (danseur), Langage mystique (démoniaque), Langue (langage sombre), Langue (deux au choix), Perception, Torture",
  "talents": "Ambidextre, Armes naturelles, Aura démoniaque, Effrayant, Vision nocturne, Volonté de fer",
  "rules": [
   "Aura de Slaanesh",
   "Instabilité",
   "Mutations du Chaos"
  ],
  "weapons": "pince",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "demon-de-slaanesh"
  ],
  "folder": "ennemis/demons",
  "ref": "Daemonette L06 p. 350 (Moyenne)"
 },
 {
  "printedTitle": "MONTURES DE SLAANESH",
  "page": 246,
  "physicalPage": 248,
  "main": [
   "43%",
   "0%",
   "41%",
   "48%",
   "51%",
   "12%",
   "51%",
   "3%"
  ],
  "secondary": [
   "2",
   "19",
   "4",
   "4 (6)",
   "10",
   "0",
   "0",
   "0"
  ],
  "skills": "Natation, Perception +20%, Sens de la magie",
  "talents": "Acuité auditive, Aura démoniaque, Effrayant, Sens aiguisés, Vision nocturne, Volonté de fer",
  "rules": [
   "Instabilité",
   "Mutations du Chaos"
  ],
  "weapons": "langue",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "large",
  "keywords": [
   "demon-de-slaanesh"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "DISQUES DE TZEENTCH",
  "page": 246,
  "physicalPage": 248,
  "main": [
   "35%",
   "0%",
   "51%",
   "56%",
   "44%",
   "44%",
   "58%",
   "0%"
  ],
  "secondary": [
   "1",
   "16",
   "5",
   "5 (7)",
   "1 (15)",
   "0",
   "0",
   "0"
  ],
  "skills": "Connaissances académiques (démonologie, magie), Déplacement silencieux, Dissimulation, Langage mystique (démoniaque), Langue (langage sombre), Perception +20%, Sens de la magie",
  "talents": "Armes naturelles, Aura démoniaque, Effrayant, Sans peur, Sens aiguisés, Vision nocturne, Vol",
  "rules": [
   "Instabilité",
   "Mutations du Chaos"
  ],
  "weapons": "morsure",
  "armourPoints": "corps 0",
  "size": "large",
  "keywords": [
   "demon-de-tzeentch"
  ],
  "folder": "ennemis/demons",
  "fly": 60,
  "ref": "Library Disc L17 p. 213 (Grande, Vol 60)"
 },
 {
  "printedTitle": "HORREURS ROSES",
  "page": 247,
  "physicalPage": 249,
  "main": [
   "42%",
   "0%",
   "33%",
   "35%",
   "36%",
   "45%",
   "60%",
   "15%"
  ],
  "secondary": [
   "1",
   "12",
   "3",
   "3 (5)",
   "4",
   "1-3",
   "0",
   "0"
  ],
  "skills": "Esquive, Focalisation +20%, Langage mystique (démoniaque), Perception",
  "talents": "Ambidextre, Armes naturelles, Aura démoniaque, Effrayant, Vision nocturne, Volonté de fer",
  "rules": [
   "Division",
   "Instabilité",
   "Magie vivante",
   "Mutation du Chaos"
  ],
  "weapons": "griffes",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "demon-de-tzeentch"
  ],
  "folder": "ennemis/demons",
  "ref": "Pink Horror L23 p. 85 (Moyenne)"
 },
 {
  "printedTitle": "HORREURS BLEUES",
  "page": 248,
  "physicalPage": 250,
  "main": [
   "34%",
   "0%",
   "28%",
   "35%",
   "36%",
   "20%",
   "32%",
   ""
  ],
  "secondary": [
   "1",
   "6",
   "2",
   "3 (5)",
   "4",
   "0",
   "0",
   "0"
  ],
  "skills": "Esquive, Focalisation +20%, Langage mystique (démoniaque), Langue (langage sombre), Perception",
  "talents": "Ambidextre, Armes naturelles, Aura démoniaque, Effrayant, Vision nocturne, Volonté de fer",
  "rules": [
   "Instabilité",
   "Mutation du Chaos"
  ],
  "weapons": "griffes",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "demon-de-tzeentch"
  ],
  "folder": "ennemis/demons",
  "ref": "Blue Horror L23 p. 85 (Moyenne)"
 },
 {
  "printedTitle": "HURLEURS DE TZEENTCH",
  "page": 248,
  "physicalPage": 250,
  "main": [
   "36%",
   "0%",
   "42%",
   "46%",
   "44%",
   "0%",
   "0%",
   "0%"
  ],
  "secondary": [
   "2",
   "18",
   "4",
   "4 (6)",
   "1 (20)",
   "0",
   "0",
   "0"
  ],
  "skills": "aucune",
  "talents": "Acuité visuelle, Armes naturelles, Aura démoniaque, Coups assommants, Effrayant, Sens aiguisés, Vol",
  "rules": [
   "Dénué de conscience",
   "Mutations du Chaos"
  ],
  "weapons": "barbillons, queue épineuse",
  "armourPoints": "corps 0",
  "size": "large",
  "keywords": [
   "demon-de-tzeentch"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "INCENDIAIRES DE TZEENTCH",
  "page": 249,
  "physicalPage": 251,
  "main": [
   "27%",
   "45%",
   "41%",
   "46%",
   "44%",
   "0%",
   "0%",
   "0%"
  ],
  "secondary": [
   "2",
   "11",
   "4",
   "4 (6)",
   "6 (6)",
   "0",
   "0",
   "0"
  ],
  "skills": "aucune",
  "talents": "Armes naturelles, Aura démoniaque, Effrayant, Lévitation",
  "rules": [
   "Brasier",
   "Dénué de conscience",
   "Mutations du Chaos"
  ],
  "weapons": "morsure",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "demon-de-tzeentch"
  ],
  "folder": "ennemis/demons",
  "ref": "Flamers L21 p. 21 (Moyenne)"
 },
 {
  "printedTitle": "DIABLOTINS",
  "page": 250,
  "physicalPage": 252,
  "main": [
   "28%",
   "26%",
   "25%",
   "36%",
   "55%",
   "31%",
   "31%",
   "45%"
  ],
  "secondary": [
   "1",
   "5",
   "2",
   "3 (5)",
   "4 (4)",
   "1",
   "0",
   "0"
  ],
  "skills": "Charisme +20%, Commérage, Dissimulation +10%, Esquive +10%, Focalisation, Fouille, Intimidation, Langage mystique (démoniaque), Langue (deux au choix), Natation, Torture",
  "talents": "Ambidextre, Armes naturelles, Aura démoniaque, Intrigant, Lévitation, Magie mineure (une au choix), Magie noire, Magie vulgaire (Chaos), Sans peur, Sens aiguisés, Troublant, Vision nocturne",
  "rules": [
   "Charme pernicieux",
   "Instabilité",
   "Mutations du Chaos",
   "Angoisse",
   "Bubon",
   "Malice",
   "Muse"
  ],
  "weapons": "dents",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "small",
  "keywords": [
   "demon"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "GARGOUILLES DU CHAOS",
  "page": 251,
  "physicalPage": 253,
  "main": [
   "35%",
   "0%",
   "41%",
   "36%",
   "44%",
   "30%",
   "42%",
   "15%"
  ],
  "secondary": [
   "1",
   "12",
   "4",
   "3 (5)",
   "4 (6)",
   "0",
   "0",
   "0"
  ],
  "skills": "Esquive, Langage mystique (démoniaque), Langue (langage sombre), Perception",
  "talents": "Ambidextre, Armes naturelles, Aura démoniaque, Effrayant, Vision nocturne, Vol, Volonté de fer",
  "rules": [
   "Instabilité",
   "Mutations du Chaos"
  ],
  "weapons": "griffes",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "average",
  "keywords": [
   "demon"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "MONTURES DÉMONIAQUES",
  "page": 251,
  "physicalPage": 253,
  "main": [
   "41%",
   "0%",
   "58%",
   "59%",
   "34%",
   "13%",
   "38%",
   "10%"
  ],
  "secondary": [
   "2",
   "28",
   "5",
   "5 (7)",
   "8",
   "0",
   "0",
   "0"
  ],
  "skills": "Natation, Perception +10%",
  "talents": "Acuité auditive, Armes naturelles, Aura démoniaque, Coups précis, Coups puissants, Sens aiguisés, Troublant, Vision nocturne, Volonté de fer",
  "rules": [
   "Instabilité",
   "Mutations du Chaos"
  ],
  "weapons": "sabots et cornes énormes",
  "armourPoints": "tête 0, bras 0, corps 0, jambes 0",
  "size": "large",
  "keywords": [
   "demon"
  ],
  "folder": "ennemis/demons"
 },
 {
  "printedTitle": "ZHTHY'HL",
  "page": 256,
  "physicalPage": 258,
  "main": [
   "44%",
   "41%",
   "62%",
   "44%",
   "46%",
   "31%",
   "43%",
   "20%"
  ],
  "secondary": [
   "2",
   "15",
   "6",
   "4 (6)",
   "4 (8)",
   "0",
   "0",
   "0"
  ],
  "skills": "Commandement, Esquive, Intimidation, Langage mystique (démoniaque), Langue (langage sombre), Perception",
  "talents": "Aura démoniaque, Coups puissants, Effrayant, Maîtrise (armes lourdes), Vision nocturne, Vol, Volonté de fer",
  "rules": [
   "Instabilité",
   "Mutations du Chaos"
  ],
  "weapons": "cornes (BF-1), arme à deux mains (épée à deux mains)",
  "armourPoints": "tête 3, bras 3, corps 3, jambes 3",
  "size": "average",
  "keywords": [
   "demon"
  ],
  "folder": "pnj/l29"
 },
 {
  "printedTitle": "BUVEUR DE SANG",
  "page": 260,
  "physicalPage": 262,
  "main": [
   "90%",
   "0%",
   "77%",
   "77%",
   "89%",
   "89%",
   "89%",
   "66%"
  ],
  "secondary": [
   "7",
   "69",
   "7",
   "7 (9)",
   "6 (12)",
   "0",
   "0",
   "3"
  ],
  "skills": "Commandement +20%, Esquive +20%, Intimidation +20%, Langage mystique (démoniaque), Langue (toutes), Lire/écrire, Perception +20%",
  "talents": "Acuité auditive, Acuité visuelle, Ambidextre, Armes naturelles, Aura démoniaque, Coups assommants, Coups précis, Coups puissants, Frénésie, Maîtrise (armes lourdes, armes paralysantes, fléaux), Parade éclair, Puissance imparable, Résistance à la magie, Sens aiguisés, Terrifiant, Vision nocturne, Vol, Volonté de fer",
  "rules": [
   "Armure de Khorne",
   "Assaut frénétique",
   "Charge sauvage",
   "Devoir de rendement",
   "Fouet",
   "Hache de Khorne",
   "Instabilité",
   "Monstrueuse puissance",
   "Mutations du Chaos",
   "Régénération",
   "Rugissement"
  ],
  "weapons": "griffes et dents",
  "armourPoints": "tête 5, bras 5, corps 5, jambes 5",
  "size": "monstrous",
  "keywords": [
   "demon-de-khorne"
  ],
  "folder": "ennemis/demons",
  "ref": "démon majeur, L06 p. 360 (Monstrueuse)"
 },
 {
  "printedTitle": "GRAND IMMONDE",
  "page": 262,
  "physicalPage": 264,
  "main": [
   "84%",
   "0%",
   "65%",
   "68%",
   "43%",
   "89%",
   "89%",
   "45%"
  ],
  "secondary": [
   "6",
   "69",
   "6",
   "6 (8)",
   "4",
   "4",
   "0",
   "3"
  ],
  "skills": "Baratin, Charisme, Commandement +10%, Connaissances académiques (démonologie +20%, magie +20%), Focalisation, Intimidation +20%, Langage mystique (démoniaque, magick), Langue (langage sombre), Langue (six au choix), Lire/écrire, Natation, Perception +20%, Sens de la magie",
  "talents": "Ambidextre, Armes naturelles, Aura démoniaque, Coups puissants, Éloquence, Magie mineure (deux au choix), Magie noire, Magie vulgaire (Chaos), Maîtrise (fléaux), Orateur né, Puissance imparable, Sens aiguisés, Sombre savoir (Nurgle), Terrifiant, Vision nocturne, Volonté de fer",
  "rules": [
   "Chair corrosive",
   "Chair putréfiée",
   "Couvée de nurglings",
   "Infecté",
   "Instabilité",
   "Mucus persistant",
   "Mutations du Chaos",
   "Peste",
   "Pestilence ambiante",
   "Torrent de corruption"
  ],
  "weapons": "griffes et dents, fléau",
  "armourPoints": "tête 5, bras 5, corps 5, jambes 5",
  "size": "monstrous",
  "keywords": [
   "demon-de-nurgle"
  ],
  "folder": "ennemis/demons",
  "ref": "démon majeur, L06 p. 360 (Monstrueuse)"
 },
 {
  "printedTitle": "GARDIEN DES SECRETS",
  "page": 265,
  "physicalPage": 267,
  "main": [
   "86%",
   "0%",
   "77%",
   "77%",
   "89%",
   "89%",
   "89%",
   "66%"
  ],
  "secondary": [
   "6",
   "39",
   "7",
   "7 (9)",
   "6",
   "4",
   "0",
   "3"
  ],
  "skills": "Charisme +20%, Commandement, Connaissances académiques (démonologie +10%, magie), Connaissances générales (quatre au choix), Esquive, Expression artistique (deux au choix), Focalisation, Fouille, Hypnotisme +20%, Intimidation +20%, Langage mystique (démoniaque, magick), Langue (quatre au choix), Lire/écrire, Perception, Sens de la magie, Torture +20%",
  "talents": "Acuité auditive, Acuité visuelle, Ambidextre, Armes naturelles, Aura démoniaque, Contorsionniste, Coups précis, Éloquence, Étiquette, Frénésie, Incantation de bataille, Linguistique, Magie mineure (deux au choix), Magie noire, Magie vulgaire (Chaos), Orateur né, Parade éclair, Puissance imparable, Sens aiguisés, Sombre savoir (Slaanesh), Terrifiant, Vision nocturne, Volonté de fer",
  "rules": [
   "Armure du Chaos",
   "Attaques déchirantes",
   "Aura de Slaanesh",
   "Domination",
   "Instabilité",
   "Musc soporifique",
   "Mutations du Chaos"
  ],
  "weapons": "griffes, cornes, langue perforante",
  "armourPoints": "tête 5, bras 5, corps 5, jambes 5",
  "size": "monstrous",
  "keywords": [
   "demon-de-slaanesh"
  ],
  "folder": "ennemis/demons",
  "ref": "démon majeur, L06 p. 360 (Monstrueuse)"
 },
 {
  "printedTitle": "DUC DU CHANGEMENT",
  "page": 267,
  "physicalPage": 269,
  "main": [
   "62%",
   "0%",
   "64%",
   "63%",
   "76%",
   "90%",
   "94%",
   "30%"
  ],
  "secondary": [
   "5",
   "32",
   "6",
   "6 (8)",
   "6 (18)",
   "5",
   "0",
   "3"
  ],
  "skills": "Alphabet secret (deux au choix), Commandement +20%, Commérage, Connaissances académiques (démonologie +10%, magie +20%, stratégie/tactique +20%), Connaissances académiques (deux au choix), Connaissances générales (six au choix), Esquive, Évaluation, Focalisation +10%, Fouille, Intimidation, Langage secret (deux au choix), Langage mystique (démoniaque, magick), Langue (six au choix), Marchandage, Perception +20%, Sens de la magie +20%, Torture",
  "talents": "Ambidextre, Armes naturelles, Aura démoniaque, Coups puissants, Dur en affaires, Frénésie, Harmonie aethyrique, Intrigant, Magie mineure (quatre au choix), Magie noire, Magie vulgaire (Chaos), Mains agiles, Projectile puissant, Puissance imparable, Sens aiguisés, Sombre savoir (Tzeentch), Terrifiant, Vision nocturne, Vol, Volonté de fer",
  "rules": [
   "Annihilateur magique",
   "Arme du chaos",
   "Carapace de plumes",
   "Chaos contrôlé",
   "Instabilité",
   "Mutations du Chaos",
   "Regard tétanisant",
   "Volonté de Tzeentch"
  ],
  "weapons": "bec (BF-1), arme du Chaos",
  "armourPoints": "tête 2, bras 2, corps 2, jambes 2",
  "size": "monstrous",
  "keywords": [
   "demon-de-tzeentch"
  ],
  "folder": "ennemis/demons",
  "ref": "démon majeur, L06 p. 360 (Monstrueuse)"
 }
]);
