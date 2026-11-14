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
- Vol : celui de la créature V4 ou V5 la plus proche quand elle existe, sinon Vol (15), la valeur entre parenthèses.

## Attaques

- **Arme V2** → arme V5 de même nom (Livre de base V5 p. 293-295). La précision entre parenthèses passe d'abord : « arme à deux mains (hache à deux mains) » → Grande hache.
  - Arme à une main → Hand Weapon, BF + 4
  - Dague → BF + 2
  - Hallebarde → BF + 5
  - Hache à deux mains → BF + 6
  - Arc → BF + 4, portée 50
  - Arbalète → +9, portée 50
  - Javeline → BF + 3, portée BF × 3
  - Liste complète : `V2_WEAPONS`.
- **Arme naturelle** (griffes, morsure, cornes…) : BF + n, avec le n de la créature V5 la plus proche (liste à valider).
- **Valeur d'attaque** : CC en mêlée, CT à distance.
- **Grandes créatures** (L06 p. 360), en mêlée seulement : Grande et Énorme +BF, Monstrueuse +2 × BF.
- Une arme sans équivalent V5 (bouclier, arme à deux mains sans précision…) reste en règle spéciale.

## Compétences, talents, Traits et règles

- **Compétence V2 homonyme d'une compétence V5** : valeur = caractéristique V5 qui la gouverne + bonus V2 (« Perception +10 % » → I + 10).
  - Homonymes retenus : Perception, Esquive, Intimidation, Escalade, Natation, Commandement, Marchandage, Pistage, Évaluation, Langue.
  - Les autres compétences V2 (Charisme, Commérage, Déplacement silencieux…) restent en règles spéciales.
- **Talent V2 homonyme exact d'un Trait V5** (liste à valider) :
  - Effrayant → Peur ; Terrifiant → Terreur ;
  - Vision nocturne → Vision nocturne ; Vol → Vol ; Frénésie → Frénésie ;
  - Mort-vivant → Mort-vivant ; Éthéré → Éthéré ;
  - Instabilité → Instable ; Nuée → Nuée ; Régénération → Régénération ; Stupidité → Stupide.
- **Talent V2 homonyme exact d'un talent du catalogue V5** : ce talent (Ambidextre, Volonté de fer, Sans peur…).
- **Tout le reste** (Aura démoniaque, Écailles, Mutations du Chaos, règles propres à la créature…) : règle spéciale. Seul le nom imprimé est gardé, jamais le texte du livre.
- Points de Destin (PD) repris. Mag et PF ignorés.

## Hors bestiaire (Q19)

Les carrières V2 (blocs « +10 % ») et les personnages prétirés n'entrent pas au bestiaire.

## Trace

Chaque profil converti porte :
- `sourceEdition: "V2"` ;
- sa source (livre, page) ;
- la note de conversion du livre.
