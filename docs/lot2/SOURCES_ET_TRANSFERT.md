# Sources et transfert

## Talents

[Aides de jeu sur Google Sheets](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/edit), source déjà référencée par le projet.

L’inventaire initial vient du snapshot des fiches `js/catalogue/talents-sheet-snapshot.json`, schéma 2, version `sha256:0e2a9ccf3059a936e9af670386aa2565f3069127558b77629c267f078b9a956e`, collecté le 7 octobre 2026 avant la conversion du MJ. Le dépôt MJ contient aussi `js/data/reference-source-csv/Talents.csv`.

L’inventaire conserve 206 identités et empreintes, pas toutes les descriptions. Ces copies ne prouvent pas l’état actuel du référentiel V5. Relire Aides de jeu, vérifier format et IDs, actualiser les descriptions puis contractualiser. Acquisitions, rangs et spécialités viennent des fiches ; effets et empreintes viennent de la source publiée. Quotas et effets de séance restent dans l’Outil MJ.

## Livre personnel

**`WFRP5_Core_Rulebook_06_10_26.pdf`** : à transférer séparément, puis donner son nouveau chemin à l’agent. Le PDF n’est pas dans ce dépôt public ni dans le ZIP.

Pages de référence du socle : 130–131, 163–169, 184–187 ; détails dans le cadrage. Les précisions du MJ sur l’annulation 1 pour 1 et les Blessures effectivement perdues restent des décisions du chantier.

## Données de PJ et séance

Aucune donnée Firebase ni export de séance n’est incluse. Reprendre via la synchronisation habituelle du compte MJ et prévoir une sauvegarde avant toute future migration. La fixture Caelel est un exemple de test, pas les snapshots actuels.

## Nécessaire pour continuer

- Clone de `codex/lot2-talents-v5`, Node/npm et `npm ci`.
- Dossier `docs/lot2/`, fourni dans Git, en ligne et en ZIP.
- Livre PDF transféré séparément pour vérifier les règles.
- Accès aux sources habituelles lorsque le travail nécessite catalogue ou données PJ actuels.

Aucun chemin de la machine d’origine ni contenu caché de la conversation n’est nécessaire pour comprendre le chantier.
