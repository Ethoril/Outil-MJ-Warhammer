# Audit de reprise T2 bis — mots-clés et règles F2-D

État audité le 28 octobre 2026 dans `F2_LOTS.json`, contre `CONTRE_VERIFICATION_CLAUDE_T3.md`, les parcours de résolution et les pages PDF du corpus.

## Décompte

Le rapport T3 demande la reprise des 21 entrées alors partielles ou ouvertes dans F2-D : 14 `partiel` et 7 `ouvert` dans la version de la matrice avant cet audit. L’ancien `F2_REPERAGE_T2.md` en dénombre 24 partielles ; ce décompte est périmé et ne correspond pas à la liste F2-D actuelle. La liste ci-dessous vient des identifiants présents dans `F2_LOTS.json` ; elle n’est pas reconstruite depuis l’ancien rapport.

Après réexamen, la matrice passe à 7 couvertes, 13 partielles et 1 ouverte.

| État révisé | Identifiants |
| --- | --- |
| Couvertes (7) | F-L06-1054, F-L06-1058, F-L06-1061, F-L06-1071, F-L13-0078, F-L13-0099, F-L11-0009 |
| Partielles (13) | F-L06-1042, F-L06-1045, F-L06-1049, F-L06-1060, F-L13-0077, F-L13-0079, F-L13-0080, F-L13-0085, F-L13-0091, F-L13-0098, F-L13-0101, F-L13-0102, F-L11-0010 |
| Ouverte (1) | F-L06-1135 |

## Statuts mécaniques

`keywordMechanicalStatus()` déclare désormais couvertes les clauses complètes `immobilisante`, `pistolet`, `piege-lame`, `a-enroulement`, `bouclier`, `taille`, `parade`, `a-repetition` et `recharge`. Cette déclaration dédiée ne rajoute aucun moteur à l’ancien registre `ENGINES` et ne réapplique aucun effet. Chaque déclaration est liée au texte exact du catalogue par `keyword-engine-contracts.json` et indique son parcours de preuve dans `keywords.js`.

`inflige` reste manuel : son parseur ne reconnaît que six états canoniques (Empêtré, À terre, Enflammé, Assourdi, Sonné, Hémorragique), tandis que la clause V5 accepte un état X générique. Les paramètres actuels des objets de catalogue passent, mais cela ne suffit pas à couvrir le mot-clé complet.

Explosion reste manuelle car le code ne mesure pas le diamètre. Dispersion reste manuelle pour les bandes courte à extrême, car le code ne valide pas les cibles visibles les plus proches ni les distances entre elles. Rapide n’applique pas l’Initiative, Incassable ne protège que la rupture liée à Piège-lame, et Entaille est erronée. Salve, Équipage et À Poudre noire restent aussi manuels : leurs parcours ne couvrent pas entièrement le déclenchement ou les données requis.

## Écart de règle confirmé sur Entaille

La page 89 du PDF réel *Up in Arms* indique qu’un Critique ajoute un état Hémorragique et que payer le coût X permet d’en ajouter un seul supplémentaire. `previewV5Slash()` ajoute actuellement un état supplémentaire par point dépensé. Son commentaire cite « V5 p.58 », mais la page 58 du PDF V5 concerne la carrière d’Ingénieur. Entaille reste partielle jusqu’à correction de la règle et de ses tests.

## Pages PDF vérifiées

- *Livre de base V5 EN v2* : pages PDF 304–307 et 318.
- *Up in Arms* : pages PDF 89, 91 et 95–96.
- *The Imperial Zoo* : page PDF 29. La sortie du filet suit l’arbitrage MJ du 25 octobre dans `tmp/f1-reperage/ARBITRAGES_25_10.md`, qui remplace sur ce point le texte imprimé.
