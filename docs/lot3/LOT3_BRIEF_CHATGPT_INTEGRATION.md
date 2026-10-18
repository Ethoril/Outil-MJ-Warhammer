# Brief pour ChatGPT — interface et intégration (phase 9)

11 octobre 2026. Chantier de code. Règles générales : celles de [ton premier brief](LOT3_BRIEF_CHATGPT_DISSIPATION_ET_FICHES.md) (« Contexte » et « Règles ») ; seules les listes de fichiers changent. Tes raccordements des phases 3 et 5 ont été faits par Claude et vérifiés (`node --test` 1 292/1 292, six tests navigateur verts) : voir la fin de [ton rapport](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md).

## Travail parallèle

Un agent Claude travaille en même temps sur la fin du socle moteur (règle du projectile, attributs de Vent, vortex, surpuissance, drapeaux non lus) et sur trois défauts de Focalisation/Lileath.

- **Tes fichiers** : `js/core/store.js`, `js/core/sanitize.js`, `js/core/migrations.js`, `js/core/sync-protocol.js`, `js/data/rules.js`, `js/ui/rules-view.js`, `index.html`, `js/ui/workspace-view.js`, `js/ui/v5-magic-controls.js`, et de nouveaux tests `tests/lot3-v5-integration-*.test.js` ; tu peux ajouter des gestes au test navigateur `tests/lot3-v5-magic-2b-ui-browser.mjs`.
- **Interdits** : tout le reste de `js/core/` (en particulier `v5-spell-contracts.js`, `v5-magic-effects.js`, `v5-magic-attributes.js`, `v5-magic-combat.js`, `v5-magic-casting.js`, `v5-magic-channelling.js`, `v5-magic-talents.js`, `resolution.js`, `equipment.js`), `js/ui/resolution-panel.js`, `js/ui/v5-spell-options.js`, `tools/`, `js/data/v5-spell-contracts.json`, `docs/lot3/LOT3_MATRICE_CONTRATS_V5.md`, `sw.js`. Si une correction en exige un, décris le changement exact dans ton rapport.
- Un échec de test dans un fichier de l'agent Claude peut venir de son travail en cours : signale-le, ne le corrige pas.

## Items

| Id | Constat | Attendu |
| --- | --- | --- |
| U-01 | Boutons secondaires de la magie (déploiement de runes, relance de Corruption, méditation, récupération d'épuisement…) : pas de `draft.busy` ni de contrôle de révision ; un double-clic applique deux fois (2 runes déployées pour un jet). | Mêmes gardes que le bouton principal (`busy`, `baseRevision`), pour chaque bouton secondaire de `workspace-view.js` et `v5-magic-controls.js`. Test navigateur double-clic. |
| U-03 | Récupération d'épuisement impossible : l'exception est levée hors de la promesse et rien ne s'affiche (`workspace-view.js`). | Message d'erreur visible ; même revue pour les autres actions secondaires. |
| U-04 | `applySpellExecution` (Store) renvoie le résultat même quand la commande échoue (`{ok:false}`) : l'interface croit le sort appliqué. | Propager l'échec ; l'interface l'affiche et ne vide pas le brouillon. |
| U-05 | Aucun contrôle de révision sur `applyLoreAttribute`, `applyHandOfGlory`, `applyBeastForm`, `applyDaemonbane`, `applyVerdantApotheosis` (API Store). | Même contrat que les autres commandes : aperçu périmé refusé. |
| U-06 | `extensions.v5.appliedSpellExecutions` grossit sans limite et est synchronisé. | Purge bornée (garde ce qui sert à l'anti-doublon et à l'Undo ; justifie la borne). Même revue pour `highMagicExecutions`. |
| U-07 | Valeurs venues du cloud non bornées : `channelling.sl`, `statModifiers` des `spellEffects`, `max` des runes, et les champs magiques ajoutés depuis (`magicAp`, `ward`, `baseCaracs`, `beastForm`, `daemonbaneMaxHp`, `fate` temporaire…). | Sanitisation : types et bornes raisonnables, sans perdre de données valides ; tests de rechargement d'un état hostile. |
| U-09 | `js/data/rules.js` (~l.89) dit encore « le raccordement du moteur magique est prévu au lot 3 ». | Mettre la section Règles à jour : procédure V5 telle qu'exécutée, et **toutes les décisions** de [LOT3_CADRAGE_MAGIE.md](LOT3_CADRAGE_MAGIE.md) (« Arbitrages confirmés » et « Arbitrages du 10 octobre », y compris les lignes du 11 octobre), rédigées pour un MJ. Vérifie la recherche dans la vue Règles. |
| U-10 | `index.html` (~l.80) affiche la version 3.12.3 (réécrite au chargement par `main.js`). | Aligner sur `js/version.js`. Ne change pas le numéro de version de l'application. |
| V-A | **Relance de Corruption par rune inatteignable** : `v5-magic-controls.js` (~l.101) lit `actor.extensions.v5.highMagicExecutions`, alors que `v5-spell-contracts.js` (~l.2923) écrit dans l'enveloppe (`draft.extensions.v5.highMagicExecutions`). Le sélecteur « exécution de Haute Magie concernée » reste vide. | Accesseur Store qui renvoie les exécutions de Haute Magie de l'acteur ; l'UI s'en sert. Geste navigateur : Apothéose réussie, puis relance de Corruption par rune, puis Undo. |
| V-B | **Regard maudit** : `assertMiscastConditionsKept` (`store.js` ~l.83-88) ne teste que la disparition de l'id ; `updateParticipant` accepte un niveau ramené à 0 ou négatif. | Refuser toute baisse de niveau d'un État verrouillé. |
| V-C | **Clairvoyance chaotique** : `clearSessionClairvoyance` (`store.js` ~l.1446) ne traite que `combat.participants` ; les scènes suspendues et `persistentCharacters` gardent `corruptionPerFortuneSpent`. | Lever l'effet sur toutes les projections du personnage au début d'une nouvelle séance ; test avec une scène suspendue reprise. |

## Fin

Tes tests verts ; `node --test` complet lancé une fois à la fin ; `node tests/lot3-v5-magic-2b-ui-browser.mjs` vert. Rapport court en français : par item ce qui est fait, tests (rouges vus ou non), changements exacts restant à faire dans les fichiers interdits.
