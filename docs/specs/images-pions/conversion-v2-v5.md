# Conversion des profils WJDR V2 en V5 (règle maison du MJ)

Une seule règle, dans `tools/lib/bestiary-v2.mjs`, pour tous les livres V2 : le Bestiaire du Vieux Monde (L27), le Tome de la Corruption et le Seigneur liche. Elle part des valeurs imprimées, relues, et ne fait rien d'autre que ce qui suit. Décisions du MJ du 11/11/2026 (montures) et du 14/11/2026 (Q13 à Q19 de `questions-profils.md`). Tests : `tests/unit/donnees/conversion-v2-v5.test.mjs`.

## Caractéristiques

- CC, CT, F, E, Ag, Int, FM, Soc et M sont repris tels quels : même échelle en V2 et en V5.
- Une valeur à 0 % ou « — » devient absente, comme pour le Zombie V5 (L06 p. 340).
- Animaux (montures, bêtes) :
  - Dex absente ;
  - Soc 0 → 10, comme le Cheval V5 ;
  - Initiative 15 pour un cheval, sinon égale à l'Agilité.
- Les autres (humanoïdes, démons, morts-vivants, monstres) : Dex = Ag et I = Ag.
- **Liste validée des animaux** (décision du MJ du 14/11, champ `animal` de la transcription) : les montures et bêtes de L27 ; L29 : Chien du Chaos, Sanglebouc, Amalgames, Amphisbènes, Basilics, Chimères, Fanges du Chaos, Jabberwocks, Nuées du chagrin, Soyeuses, Vers des brèches, Vers des marais, Vers fouettards, Vers solaires, Poneys de guerre ; L30 : Phrenesay, Cauchemars, Squigs des tombes. **Non-animaux** : Baisers de jouvence (L29) et Bastethi (L30), Dex = Ag et Sociabilité 0 absente.

## Taille et Blessures

- Taille : celle de la même créature dans un livre V4 ou V5 quand elle existe, sinon une Taille proposée par créature et validée par le MJ.
- Blessures : jamais le B du V2, toujours la formule V5 (L06 p. 360). BF, BE et BFM y sont les bonus de Force, d'Endurance et de Force Mentale.

| Taille | Blessures |
| --- | --- |
| Petite | 2 × BE |
| Moyenne | BF + 2 × BE + BFM |
| Grande | (BF + 2 × BE + BFM) × 2 |
| Énorme | (BF + 2 × BE + BFM) × 4 |
| Monstrueuse | (BF + 2 × BE + BFM) × 8 |

## Mouvement et vol

- « M 1 (15) » : M = 1 au sol.
- Mouvement imprimé aléatoire (« 1–10 », Squigs des tombes, L30 p. 115) : M de la créature V5 la plus proche (Squig des cavernes, M 4), plus une règle spéciale « Mouvement aléatoire imprimé : 1–10 » (décision du MJ du 14/11).
- Vol : celui de la créature V4 ou V5 la plus proche quand elle existe, sinon Vol (15), la valeur entre parenthèses.

## Attaques

- **Arme V2** → arme V5 de même nom (Livre de base V5 p. 293-295). La précision entre parenthèses passe d'abord : « arme à deux mains (hache à deux mains) » → Grande hache.
  - Arme à une main → Hand Weapon, BF + 4
  - Dague → BF + 2
  - Hallebarde → BF + 5
  - Hache à deux mains → BF + 6
  - Arme à deux mains sans précision → BF + 6 (décision du MJ du 14/11)
  - Arc → BF + 4, portée 50
  - Arbalète → +9, portée 50
  - Arbalète à répétition → dégâts 8, portée 45, Empaleuse, Répétition 3, Recharge 9 : absente du Livre de base V5 (L06 p. 293-295), valeurs imprimées de la « Repeater Crossbow and Bolts » des elfes noirs (L09 p. 44), décision du MJ du 14/11 (Fatandira, L30 p. 15)
  - Javeline → BF + 3, portée BF × 3
  - Rapière BF + 4, main gauche BF + 2, brise-épée BF + 1, lance d'arçon = lance de cavalerie BF + 6 (mêmes noms en V5).
  - Les munitions (« 10 carreaux ») accompagnent l'arme et ne sont pas des attaques.
  - Liste complète : `V2_WEAPONS`.
- **Arme naturelle** (griffes, morsure, cornes…) : BF + n, avec le n de la créature V5 la plus proche (liste à valider).
- **Valeur d'attaque** : CC en mêlée, CT à distance.
- **Grandes créatures** (L06 p. 360), en mêlée seulement : Grande et Énorme +BF, Monstrueuse +2 × BF.
- Une arme sans équivalent V5 (bouclier…) reste en règle spéciale.
- **Choix propres à un profil** (décisions du MJ du 14/11, champs `weaponsV5`, `customAttacks`, `weaponRules` de la transcription) :
  - Karitamen (L30 p. 90) : une Arme à une main (BF + 4) à la place du Fléau ; les lames de l'Honorable Trépas, la crosse et le fléau restent cités en règle spéciale. Il garde ses deux sorts (Drain de Magie, Silence).
  - Lame spectrale (Généraux revenants L30 p. 101, Revenants elfes L30 p. 114) : attaque de mêlée à BF + 5, **décision du MJ** (le V2 imprime BF + 2) ; les effets de la lame restent en règle spéciale.

## Compétences, talents, Traits et règles

- **Compétence V2 homonyme d'une compétence V5** : valeur = caractéristique V5 qui la gouverne + bonus V2 (« Perception +10 % » → I + 10).
  - Homonymes retenus : Perception, Esquive, Intimidation, Escalade, Natation, Commandement, Marchandage, Pistage, Évaluation, Langue.
  - Aussi homonymes : Escamotage, Orientation, Focalisation, Dressage, Crochetage, Métier, Hypnotisme.
  - **Sous un autre nom** (validation du MJ du 14/11, compétence V5 présente au glossaire de l'outil ; liste à valider) : Déplacement silencieux et Dissimulation → Discrétion ; Commérage → Ragot ; Charisme → Charme ; Soins → Guérison ; Conduite d'attelages → Conduite d'attelage ; Équitation → Chevaucher ; Survie → Survie en extérieur ; Résistance à l'alcool ; Connaissances académiques et Connaissances générales → Savoir ; Langage mystique → Langue ; Expression artistique → Divertissement ; Alphabet secret → Signes secrets ; Soins des animaux → Soin aux animaux ; Charme animal → Emprise sur les animaux ; Jeu → Pari ; Fouille → Perception.
  - Deux compétences V2 rendues par la même compétence V5 : la plus haute valeur reste. Une spécialisation « au choix » est écartée.
  - Préparation de poisons → Métier (Empoisonneur).
  - **Compétences V2 qui sont des talents V5** (validation du 14/11) : Baratin → Baratiner ; Lire/écrire → Lire/Écrire ; Sens de la magie → Perception de la Magie ; Déguisement → Maître en déguisement ; Filature → Discret.
  - Reste en règle spéciale : Torture, et les spécialisations « au choix ».
- **Talent V2 homonyme exact d'un Trait V5** (liste à valider) :
  - Effrayant → Peur ; Terrifiant → Terreur ;
  - Vision nocturne → Vision nocturne ; Vol → Vol ; Frénésie → Frénésie ;
  - Mort-vivant → Mort-vivant ; Éthéré → Éthéré ;
  - Instabilité → Instable ; Nuée → Nuée ; Régénération → Régénération ; Stupidité → Stupide.
- **Talent V2 homonyme exact d'un talent du catalogue V5** : ce talent (Ambidextre, Volonté de fer, Sans peur…).
- **Talent V2 sous un autre nom** (équivalents sûrs, validation du 14/11) : Coups précis → Frappe blessante ; Coups assommants → Frappe assommante ; Acuité auditive / visuelle → Sens aiguisé (Ouïe / Vue) ; Résistance accrue → Très résistant ; Force accrue → Très fort ; Réflexes éclair → Réflexes foudroyants ; Dur en affaires → Négociateur ; Étiquette → Savoir-vivre ; Sang-froid → Imperturbable ; Grimpeur chevronné → Grimpeur ; Éloquence → Orateur ; Orateur né → Grand orateur ; Calcul mental → Doué en calcul ; Intelligent → Perspicace ; Résistance aux maladies / aux poisons → Résistance (Maladie / Poison) ; Course à pied → Véloce ; Grand voyageur → Voyageur aguerri ; Chance → Chanceux ; Camouflage rural → Nomade ; Fuite → Fuite !
  - Restent en règles spéciales : Troublant, Puissance imparable, Parade éclair, Lutte, Maîtrise (…), Sain d'esprit, Sur ses gardes, Code de la rue, Projectile puissant, Méditation.
- **Sorts** (validation du 14/11) :
  - Sombre savoir (Nurgle, Slaanesh, Tzeentch, Nécromancie) → Trait Lanceur de sorts et les sorts du domaine du catalogue.
  - Sombre savoir (Chaos) → le domaine du dieu de la créature d'après le livre, sinon la Démonologie.
  - Magie mineure (« au choix ») → Lanceur de sorts avec tous les sorts mineurs du catalogue, à choisir en séance.
  - Magie mineure aux sorts nommés → Lanceur de sorts de ces sorts, rapprochés du catalogue (validation du 14/11, Karitamen) : Dissipation → Drain de Magie (Haute Magie) ; Silence → Silence (domaine de l'Ombre).
  - Magie noire, Magie vulgaire, Magie commune, Magie vivante → règles spéciales.
- **Tout le reste** (Aura démoniaque, Écailles, Mutations du Chaos, règles propres à la créature…) : règle spéciale. Seul le nom imprimé est gardé, jamais le texte du livre.
- Points de Destin (PD) repris. Mag et PF ignorés.

## Hors bestiaire (Q19)

Les carrières V2 (blocs « +10 % ») et les personnages prétirés n'entrent pas au bestiaire.

## Trace

Chaque profil converti porte :
- `sourceEdition: "V2"` ;
- sa source (livre, page) ;
- la note de conversion du livre.
