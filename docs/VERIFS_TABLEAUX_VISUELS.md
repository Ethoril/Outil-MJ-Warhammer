# Vérification visuelle des tableaux décalés à l'extraction texte

Contrôle effectué sur les rendus PNG à 150 ppp (`pdftoppm -png -r 150`) des pages concernées, comparés à l'extraction texte brute (`pdftotext`). Toutes les correspondances ci-dessous sont résumées en français d'après la mise en page imprimée.

## 1. L07 *Lustria* — Marques des Anciens / Bénédictions de ponte (p. 151 imprimée, p. 151 physique)

Références d'inventaire : `C0-L07-003`, `C0-Q11`, `E0-Q19`.
Les marques portant un astérisque (`*`) sont réservées aux Skinks et aux Saurus ; les autres s'appliquent aux Skinks, Saurus et Kroxigors (et se cumulent avec les améliorations de caste des Skinks).

| Ligne (Marque sacrée) | Page imprimée | Apparence et présage (résumé) | Modificateurs de profil | Traits accordés | Talents accordés | Écart avec l'extraction texte (`pdftotext`) |
| --- | --- | --- | --- | --- | --- | --- |
| **Chotec** | p. 151 | Vermillon ou orange ; inspiré par le dieu solaire | +10 Initiative, +10 Agilité | Aucun | Réflexes de combat (*Combat Reflexes*) | Les colonnes de droite (Profil, Traits, Talents) des huit premières lignes sont extraites en trois blocs groupés après les trois colonnes de gauche, détachant les bonus de chaque divinité. |
| **Huanchi\*** (Skink/Saurus) | p. 151 | Noir ; discrétion exceptionnelle | +5 Initiative, +10 Agilité | Vision dans le noir (*Dark Vision*), Discret (*Stealthy*) | Ombre (*Shadow*) | Profil, Traits et Talent sont rejetés dans les blocs groupés de fin de tableau sans séparateur de ligne. |
| **Itzl\*** (Skink/Saurus) | p. 151 | Grande crête ; maîtrise des bêtes | +5 Agilité, +5 Sociabilité | Aucun | Affinité animale (*Animal Affinity*) | Les noms `Itzl* Quetzl Sotek` sont fusionnés sur une même ligne dans la première colonne ; profil, absence de Trait et Talent sont déportés dans les blocs de droite. |
| **Quetzl** | p. 151 | Excroissances osseuses et cuir épais ; résistance protectrice | +5 Endurance, +1 Point d'Armure | Robuste (*Hardy*) | Implacable (*Implacable*) | Nom fusionné sur la ligne `Itzl* Quetzl Sotek` ; modificateurs, Trait et Talent séparés dans les blocs groupés de droite. |
| **Sotek** | p. 151 | Rouge sang ; férocité implacable | +10 Capacité de Combat, +5 Force | Haine (Skavens), Immunité (Poison) | Charge furieuse (*Berserk Charge*) | Nom fusionné sur la ligne `Itzl* Quetzl Sotek` ; les deux Traits sont collés aux Traits des lignes voisines dans le bloc Traits. |
| **Tepok\*** (Skink/Saurus) | p. 151 | Pourpre ; compréhension profonde | +5 Initiative, +15 Intelligence | Résistance à la Magie 1 (*Magic Resistance 1*) | Sixième sens (*Sixth Sense*) | Profil, Trait et Talent déportés dans les blocs groupés de droite. |
| **Tlazcotl** | p. 151 | Jaune ; détermination impassible | +10 Force Mentale (Volonté) | Aucun | Sans peur (Morts-vivants, Sang-chauds) | Le bonus de Volonté, l'absence de Trait et le talent psychologique Sans peur sont rejetés dans les blocs de droite loin du nom `Tlazcotl`. |
| **Tzunki** | p. 151 | Vert d'eau ; agilité et vue perçante | +5 Capacité de Tir, +5 Agilité | Amphibie (*Amphibious*) | Sens aiguisé (Vue) | Le présage est collé à celui de la ligne suivante dans l'extraction Git ; dans l'extraction Poppler sans `-layout`, les effets de la 9e ligne s'intercalent immédiatement après ceux de Tzunki avant le nom de la dernière marque. |
| **Marque des Anciens\*** (*Mark of the Old Ones\**, Skink/Saurus) | p. 151 | Blanc ; promis à un grand destin | +15 Sociabilité | Chef (*Leader*) | Chanceux (*Luck*) | Le titre sur deux lignes encadrant `White` décale l'ordre de lecture : les effets (`Fel+15`, `Leader`, `Luck`) sortent isolés en bas (Git) ou avant l'intitulé de la marque (Poppler). |

---

## 2. L09 *Temple of Spite* — Complications de la Magie Noire (p. 63 imprimée, p. 63 physique)

Références d'inventaire : `C0-L09-004`, `C0-Q11`.
Un jet sur cette table intervient lorsqu'un sort de Magie Noire est dissipé, qu'un rituel est interrompu avant son terme, ou chaque fois qu'un Test de Lancement dépasse le NI de +4 DR ou plus.

| Ligne (`1d100`) | Page imprimée | Correspondance vérifiée (résumé de l'effet) | Écart avec l'extraction texte (`pdftotext`) |
| --- | --- | --- | --- |
| **01–11** | p. 63 | Décharges d'énergie dans BFM yards décolorant tout : la chair reprend sa couleur en quelques jours, mais les objets inertes restent gris définitivement. | Les huit plages de `1d100` (`01–11` à `88–00`) sont extraites en bloc avant l'entête `Result`, totalement séparées des huit paragraphes d'effets. |
| **12–24** | p. 63 | Malaise spirituel des créatures vivantes dans BFM yards : Test de Calme Difficile (+0 DR) requis ; échec de −1 DR ou pire → Peur du lanceur ; autre échec (−0 DR) → Haine envers le lanceur. | Plage `12–24` extraite en amont avec `01–11` et `25–36`, sans lien direct avec le paragraphe qui déclenche Peur ou Haine. |
| **25–36** | p. 63 | Gravité faussée et sol instable dans BFM yards : pénalité de −1 DR aux Tests liés aux déplacements physiques pendant 8 Rounds. | Plage `25–36` regroupée en tête hors de son paragraphe. |
| **37–48** | p. 63 | Altération de la matière : Test de Calme Difficile (+0 DR) ou une possession subit 1 point de dégât et gagne un Défaut sur 1d10 (1–3 Laid, 4–7 Médiocre, 8–0 Peu fiable). | Plage `37–48` isolée avant l'entête `Result`. |
| **49–61** | p. 63 | Ichor noir s'écoulant des orifices des créatures vivantes dans 2 × BFM yards : −2 DR aux Tests de Perception et de Langue pendant 2d10 Rounds. | Plage `49–61` concaténée avec `62–74`, `75–87` et `88–00` avant `Result`. |
| **62–74** | p. 63 | Dispersion des énergies laissant un seul Vent de magie dominant pendant 1d10 Rounds ; seuls les sorts de ce Domaine peuvent être lancés. | Plage `62–74` séparée de son paragraphe. |
| **75–87** | p. 63 | Apparition de diablotins du Chaos pendant 8 Rounds : −2 DR à tous les Tests dans BFM yards autour de la sorcière (sans effet sur le Trait Mort-vivant). | Plage `75–87` séparée de son paragraphe. |
| **88–00** | p. 63 | Éclat de malepierre enraciné : dans BFM yards, +2 DR aux Tests de Lancement et de Canalisation de Magie Noire, et exposition à une Corruption Majeure à chaque Round passé dans la zone. | Plage `88–00` séparée de son paragraphe. |

---

## 3. L09 *Temple of Spite* — Pactes de Sorcière (p. 64 imprimée, p. 64 physique)

Référence d'inventaire : `D0b-Q07`.
Lorsqu'un sort de Magie Noire inflige des dégâts et dépasse son NI, la sorcière peut dépenser 3 DR pour déclencher un effet lié à l'un de ses pactes d'âme (cumulable avec les effets de surincantation).

| Ligne (Entité du pacte) | Page imprimée | Pacte(s) nommé(s) | Correspondance vérifiée (résumé de l'effet) | Écart avec l'extraction texte (`pdftotext`) |
| --- | --- | --- | --- | --- |
| **Hekarti** | p. 64 | 1) *Conjuration malveillante* (*Spiteful Conjuration*) **ou** 2) *Siphon du mal* (*Syphon Harm*) | **Deux options au choix dans la même cellule :** 1) Touche supplémentaire au Corps infligeant des dégâts égaux au NI de base du sort, sans Points d'Armure ; **ou** 2) Ignore les Incidents d'incantation et les gains de Corruption pendant les 1d10 prochains Tours. | Les quatre entités de la colonne de gauche sont extraites en bloc avant la colonne des effets (et après le début du sort de la colonne de droite) ; comme Hekarti regroupe deux effets séparés par « …or… », l'extraction brute aligne 4 entités face à 5 effets nommés. |
| **Démon de Slaanesh** (*Daemon of Slaanesh*) | p. 64 | *Objet de désir* (*Object of Desire*) | 3 personnages choisis dans BFM yards tentent un Test de Calme Ardu (−2 DR) ; en cas d'échec, pendant 2d10 Rounds, toute action hostile contre la sorcière exige d'abord un Test de Calme Ardu (−2 DR) réussi sous peine de recevoir l'État Surpris. | Entité extraite en tête de tableau, séparée de son effet ; la présence des deux options d'Hekarti décale d'un rang la correspondance si l'on compte par intitulé en gras. |
| **Démon de Tzeentch** (*Daemon of Tzeentch*) | p. 64 | *Distorsion du réel* (*Reality Warp*) | Tirage sur la table des Incidents mineurs, dont le résultat s'applique à une créature au choix dans BFM yards autre que la sorcière. | Dans `pdftotext` (Git), les intitulés `Daemon of Tzeentch Unaligned Daemon` sont fusionnés sur la même ligne avant l'entête `Effects`. |
| **Démon non aligné** (*Unaligned Daemon*) | p. 64 | *Influence infernale* (*Infernal Influence*) | La sorcière reçoit le Trait Démoniaque 8+ (*Daemonic 8+*) jusqu'au prochain Round. | Intitulé fusionné avec `Daemon of Tzeentch` dans la colonne de gauche et séparé du dernier paragraphe d'effet. |

---

## 4. L06 *Livre de base V5 EN* — Tableaux et barèmes de Taille et de Blessures (p. 360-361 imprimées, p. 360-361 physiques)

Références d'inventaire : `E0-Q04`, `E0-T-045`, `C0-L06-036`.

### 4a. Catégories de Taille, exemples et barèmes de combat / surnombre (p. 360 imprimée)

| Ligne (Taille) | Page imprimée | Exemples du tableau (p. 360) | Modificateur de dégâts en mêlée (hors tir, attaque gratuite et attaques bonus ; déjà inclus dans les profils PNJ) | Poids dans le calcul du surnombre | Écart avec l'extraction texte (`pdftotext`) |
| --- | --- | --- | --- | --- | --- |
| **Petit** (*Small*) | p. 360 | Papillon, souris, pigeon, chat, faucon, nourrisson humain | Dégâts normaux | Compte pour 1 créature | `Size Small Average Large` sont concaténés sur une ligne avant `Examples`, et les puces des listes de droite sont extraites sous forme de chiffres `0`. |
| **Moyen** (*Average*) | p. 360 | Rat géant, halfeling, enfant humain, nain, elfe, humain | Dégâts normaux | Compte pour 1 créature | Les exemples de *Small* et *Average* se suivent sans intitulé de ligne en regard dans l'extraction brute. |
| **Grand** (*Large*) | p. 360 | Cheval, ogre, troll | Dégâts normaux + BF | Compte pour 2 créatures | Après la ligne d'exemples `Horse, Ogre, Troll`, toute la colonne de droite de la page 360 s'intercale avant la fin du tableau d'exemples. |
| **Énorme** (*Enormous*) | p. 360 | Griffon, vouivre, manticore | Dégâts normaux + BF | Compte pour 3 créatures | La ligne `Enormous Griffon, Wyvern, Manticore` est rejetée en bas de page au milieu du dernier paragraphe de la colonne de droite. |
| **Monstrueux** (*Monstrous*) | p. 360 | Dragon, géant, démon majeur | Dégâts normaux + (2 × BF) | Compte pour 4 créatures | La ligne `Monstrous Dragon, Giant, Greater Daemon` est coupée et intercalée entre deux phrases du paragraphe final de la colonne de droite. |

### 4b. Calcul des Blessures selon la Taille (p. 361 imprimée)

| Ligne (Taille) | Page imprimée | Formule de Blessures vérifiée | Écart avec l'extraction texte (`pdftotext`) |
| --- | --- | --- | --- |
| **Petit** (*Small*) | p. 361 | $2 \times \text{BE}$ (sans BF ni BFM) | Les cinq tailles (`Size Small Average Large Enormous Monstrous`) sont extraites ensemble avant l'entête `Wounds` et la liste des formules. |
| **Moyen** (*Average*) | p. 361 | $\text{BF} + (2 \times \text{BE}) + \text{BFM}$ | Dans `pdftotext` (Git), cette formule est concaténée sur la même ligne que les trois formules suivantes (*Large*, *Enormous*, *Monstrous*). |
| **Grand** (*Large*) | p. 361 | $(\text{BF} + (2 \times \text{BE}) + \text{BFM}) \times 2$ | Catégorie regroupée en amont avec *Enormous* et *Monstrous* avant les formules multiplicatives. |
| **Énorme** (*Enormous*) | p. 361 | $(\text{BF} + (2 \times \text{BE}) + \text{BFM}) \times 4$ | Catégorie regroupée en amont ; formule collée sur la même ligne que *Average*, *Large* et *Monstrous* dans l'extraction Git. |
| **Monstrueux** (*Monstrous*) | p. 361 | $(\text{BF} + (2 \times \text{BE}) + \text{BFM}) \times 8$ | Catégorie regroupée en amont ; formule en fin de bloc sans rappel de l'intitulé de ligne. |
