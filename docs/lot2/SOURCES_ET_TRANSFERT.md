# Sources et transfert

## Talents

[Aides de jeu sur Google Sheets](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/edit), source déjà référencée par le projet.

L’inventaire initial vient du snapshot des fiches `js/catalogue/talents-sheet-snapshot.json`, schéma 2, version `sha256:0e2a9ccf3059a936e9af670386aa2565f3069127558b77629c267f078b9a956e`, collecté le 7 octobre 2026 avant la conversion du MJ. Le dépôt MJ contient aussi `js/data/reference-source-csv/Talents.csv`.

Lors de l’actualisation initiale du 9 octobre 2026, Aides de jeu converti V5 avait été relu : 206 identités stables, 19 descriptions/empreintes modifiées. Le CSV Talents et `js/data/reference-snapshot.json` sont actualisés ; l’inventaire portable reprend les empreintes exactes. SHA-256 de ce premier CSV (avant les sept corrections suivantes) : `935a96f79688a798bb1cc2fc320db78bfe753974fc8263581152ecd1322abd4e`. Les contrats restent à valider puis raccorder ; une description seule n’active pas un effet. Acquisitions, rangs et spécialités viennent des fiches ; effets et empreintes viennent de la source publiée. Quotas et effets de séance restent dans l’Outil MJ.

## Livre personnel

**`Livre de base V5 EN v2.pdf`**, 379 pages, a été consulté sur cette machine dans le dossier de règles fourni par le MJ. En cas de transfert, fournir séparément le livre et son nouveau chemin. Le PDF n’est pas dans ce dépôt public ni dans le ZIP.

Pages vérifiées : 130–131, 163–171, 173–176, 183–189, 304–306 ; détails dans le cadrage. Les précisions du MJ sur l’annulation 1 pour 1 et les Blessures effectivement perdues restent des décisions du chantier.

## Données de PJ et séance

Aucune donnée Firebase ni export de séance n’est incluse. Reprendre via la synchronisation habituelle du compte MJ et prévoir une sauvegarde avant toute future migration. La fixture Caelel est un exemple de test, pas les snapshots actuels.

## Nécessaire pour continuer

- État Git local actuel de `codex/lot2-talents-v5` (l’incrément du 9 octobre n’est pas encore poussé), Node/npm et `npm ci`.
- Dossier `docs/lot2/` actualisé dans Git local et en ZIP ; le dossier en ligne reste celui de la publication précédente.
- Livre PDF transféré séparément pour vérifier les règles.
- Accès aux sources habituelles lorsque le travail nécessite catalogue ou données PJ actuels.

Aucun chemin de la machine d’origine ni contenu caché de la conversation n’est nécessaire pour comprendre le chantier.

## Lecture comparative 2.4

[Le document des écarts](ECARTS_LIVRE_V5_AIDES_DE_JEU.md) compare le snapshot public local épinglé aux 166 talents du livre pp.114–128, plus les pages de procédures pertinentes. Il suit les corrections acceptées et les signalements retirés concernant Seigneur de guerre et les frappes. Les 39 talents de suppléments ne sont pas certifiés par cette lecture ; Petit/V4 est étudié séparément. Il prépare des corrections, sans modifier le Google Sheet ni certifier son état en ligne. Les extractions de travail restent ignorées dans tmp/.

## Source Talents corrigée par le MJ

Sept descriptions ont été retrouvées dans le CSV public après son retour : Ferveur ardente, Saut carpé, Effraction, Attirant, Acrobaties équestres, Résistance et Petit. Les 206 IDs sont conservés. SHA-256 courant : 4ef3ee500c6d4da8b26dbb30fbb751995954be66e822a7dc306acde379229d8f. Les autres feuilles n’ont pas été relues en ligne dans cette passe ; leurs données et métadonnées locales sont conservées. L’empreinte de Résistance, seul contrat actif modifié, a été revalidée explicitement. Le document d’écarts suit maintenant corrections effectuées, arbitrages de table et signalements retirés.
