# Conception proposée — F2-K2 : tables de mutations

Statut : proposition à soumettre au MJ à la fin de T2 ; aucune table n'est saisie ici. K2 ne commence qu'après validation de cette conception.

## Périmètre et sources

- L06 p.189 (PDF 189) : famille de 39 lignes physiques et mentales, F-L06-0500.
- L17 : 134 lignes de marques des huit Vents et mutations physiques étendues, F-L17-0078 ; pages 55, 58, 67, 70, 79, 82, 91, 94, 103, 106, 115, 118, 127, 130, 139 et 142 (numérotation PDF indiquée dans F2_LOTS). Convertir les règles V4 retenues en V5 ; conserver la trace de chaque conversion.
- L23 : table étendue, pages à confirmer sur le PDF, notamment p.65/68 (PDF 67/70) et p.66–69 (PDF 68–71), F-L23-0136 et F-L17-0078. Délimiter les tables et compter leurs lignes depuis les pages avant saisie ; ne pas déduire leur nombre du repérage de famille.

## Contrat de données proposé

Un fichier de données versionné, distinct du moteur, contient des tables identifiées par un identifiant stable. Chaque table décrit sa famille, son dé ou mode de sélection imprimé, ses règles de renvoi et ses entrées. Chaque entrée possède :

- un identifiant stable, indépendant de son libellé ; table et plage de résultat imprimée ou autre sélecteur explicite ;
- nom et résumé en français rédigé dans nos mots ; au maximum douze mots cités de la source par entrée ;
- provenance structurée : livre, page imprimée, page PDF, référence F2, et emplacement précis dans la table ;
- règle source et conversion V5 documentées séparément : valeur initiale, valeur convertie, justification et éventuelle ambiguïté soumise au MJ ;
- effets structurés typés uniquement quand leur mécanique est établie ; sinon état `assiste` et données à demander au MJ, jamais déduction mécanique depuis le résumé ;
- statut de relecture par ligne et référence au contrôle du PDF ; variantes, renvois et choix indiqués explicitement.

Les plages sont des entiers inclusifs ; les tables sans plage simple conservent leur structure imprimée. Aucun exemple inventé de ligne ou de conversion ne fait partie des données. Les unités et durées sont explicites ; une conversion inconnue ne reçoit aucune valeur par défaut. Les identifiants et versions restent stables lors des corrections, avec migration explicite si nécessaire.

## Utilisation et persistance

K1 présente le résultat et ses choix au MJ ; aucune mutation ni perte de personnage n'est appliquée sans confirmation. Une mutation confirmée est enregistrée comme valeur durable avec identifiant de table et d'entrée, version des données, résultat éventuel, choix MJ, effets et provenance ; elle doit survivre à Undo/Redo et au rechargement et être disponible pour l'écriture future vers la fiche. L'horloge de magie ne constitue pas le calendrier de campagne. Les effets dont les conditions ou conversions restent incertaines restent assistés et visibles.

## Fabrication et contrôle avant livraison K2

1. Identifier les PDF réels et leurs éditions, vérifier pages et structure des tables ; établir un manifeste de comptage et les éventuels écarts avant de remplir les données.
2. Saisir les entrées avec résumés originaux, plages exactes, provenance et conversions ; conserver les incertitudes comme telles.
3. Faire contrôler indépendamment chaque ligne sur la page PDF, y compris bornes, renvois, effets et conversions ; réconcilier les divergences sans inventer de décision MJ.
4. Tester couverture et absence de chevauchement des plages selon chaque table, première et dernière bornes, renvois et identifiants, comptages vérifiés, conversion, sélection et confirmation MJ ; vérifier persistance et Undo/Redo. Une table non linéaire reçoit ses propres invariants.
5. Signaler dans le rapport les choix de conversion et limites, et ne déclarer une mécanique couverte que si toute sa clause fonctionne.

### Forme proposée (schéma, pas données)

```text
catalogue { schemaVersion, edition, tables[] }
table     { id, famille, source, selection, entries[] }
selection { type, de?, renvois? }
entree    { id, selection, nom, resume, source, conversion?, effets[],
            statutMecanique, questionsMJ[], verification }
source    { livre, pageImprimee, pagePdf, referenceF2, emplacement }
conversion { editionSource, formulationSource, valeurSource?, valeurV5?,
             justification, statut }
verification { controleur, date, pagePdf, statut, observations? }
```

Les champs suffixés `?` sont facultatifs seulement lorsque le type de sélection ou la source les rend inapplicables, jamais pour masquer une donnée nécessaire. `selection` doit représenter plages, choix et renvois sans les aplatir. `effets` est une liste de contrats typés validés par le moteur ; une entrée assistée conserve une liste vide si aucun effet n'est établi et expose les questions MJ. Les statuts et types exacts seront arrêtés avec le moteur K1 ; toute version publiée du schéma devra être validée par un contrôle automatisé strict. Ce contrat est une proposition, pas une promesse que chaque effet de mutation pourra être automatisé dès K2.
