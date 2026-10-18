# Développement — Courroux 61–65 et 89–95, acquisition d’États

18 octobre 2026, worktree local divin V5. Cette tranche reste une partie du programme E5 ouvert. Aucun commit, push ou publication.

## Règles et raccordement

Le texte L06 p.218 donne 1 + Péchés états Hémorragique pour 61–65, et 1 + Péchés états Brisé pour 89–95. La table demande de lancer, d’appliquer le résultat, puis de retirer un Péché, au minimum zéro. Le total utilisé est donc le `sinAtTest` pré-décrément, que la prière ait réussi ou échoué. Les états s’empilent selon p.184–186.

Les règles sont une source typée `wrathConditionRules`, séparée des deux `prayerSLRules` de DR. Le générateur consomme `docs/divin/sources/L06-wrath-conditions-readings.mjs`, compare l’empreinte source à l’entrée L06 de `DIVIN_CORPUS_LIVRES.json` et incorpore les reçus p.184–186/218 au fingerprint canonique. Les JSON générés n’ont pas été édités à la main.

`previewStoreDivine` expose `wrathConditionPreview` en projetant `acquireV5Conditions` sur l’état post-prière. Il révèle nombre demandé, états réellement acquis, immunité, rappels et Momentum avant/après sans mutation. La validation rejette une règle absente, un aperçu périmé, falsifié ou une origine déjà portée par un état, même après éviction du journal limité à 100 entrées. Au commit, le Store recalcule depuis l’état canonique post-prière et appelle encore le helper commun. Le reçu `conditionReceipt` conserve identifiant/version, requête, quantité acquise, ids d’état, retraits/rappels, Momentum, preuve du jet et reçu source, sans recopier le personnage complet.

Les états deviennent des données `participant.states` ordinaires, avec leur provenance divine. Ils ne sont ni une couche de bénédiction ni une échéance divine; finir la bénédiction n’efface pas les états. Hémorragique suit la perte de Blessures commune en fin de Round. Brisé alimente les pénalités du moteur de Test et la récupération partagée. L’interface montre quantité demandée/réelle et immunité. Elle décrit la fuite Move (Flee) puis Action (Sprint) jusqu’à un endroit hors de vue; après cela, une Action sur un Test de Compétence pour mieux se cacher est facultative.

La fuite et le Sprint restent exécutés manuellement. Le raccordement automatise l’acquisition de Brisé et ses consommateurs déjà disponibles; il ne certifie pas la séquence de mouvement/actions E6.

## Preuves

- Rouge indépendant avant intégration : 3/6 verts, 3 échecs attendus sur règles absentes/résultat mécanique/texte libre; `independent-red.log`. Le rouge corrigé avant code vérifiait `ready` pour les conséquences entièrement sourcées; `independent-red-corrected.log`.
- Rouge indépendant ajouté après la découverte d’une collision : après éviction du reçu, l’origine d’un état n’empêchait pas le réemploi de son `executionId`; `independent-conditions-red-id-reuse.log`. Le garde est maintenant exercé dans la suite.
- Rouge de geste navigateur : l’aperçu présentait une acquisition prévue comme déjà réalisée; le libellé prospectif expose l’effet projeté et la perte d’Élan attendue au commit. `independent-browser-red.log` est conservé.
- Contrôle indépendant courant : `node --test tests/divin-v5-wrath-conditions-independent.test.js`, **15/15**. Il couvre sources, bornes après +10/Péché, succès et échec de Prière, ciblage du prêtre, cumul, immunité, Momentum, fin de Round, récupération, persistance, Undo/Redo, aperçus périmés, collisions d’identifiants et limites des reçus.
- Tests développement : `node --test tests/divin-v5-wrath-conditions-dev.test.js`, **5/5**, incluant source L06, sortie générée actuelle, aperçu inerte, commit après succès/échec, prière ciblant le prêtre et Momentum conservé sous immunité.
- Contrôle navigateur indépendant Playwright/Edge : **vert** après le rouge du libellé au passé. Le geste Calculer annonce les acquisitions et l’éventuelle perte d’Élan au futur, sans mutation; Appliquer pose Hémorragique/Brisé sur le prêtre; IndexedDB conserve les états et le reçu au rechargement. Quatre captures 1440/390 px, sombre/clair sont conservées dans `wrath-control/browser-final`; reçu `receipt.json`, runner `tests/divin-v5-wrath-conditions-browser-independent.mjs`, SHA-256 du runner `2F065B3559C883A98AA7F54C8EA5CA54A0895C93DD35407DEB7FA5A1A72FE2E6`.
- Le générateur des contrats divins a tourné deux fois de suite puis `--check` a réussi. Registre `js/data/v5-divine-contracts.json`: SHA-256 `27E2550399C0A80C7AEDE54B633ED5FA1F0D65FBE2418F111B5E02FF30CB83E7`; inventaire `docs/divin/DIVIN_INVENTAIRE.json`: `6E590C9B670F978AFBFF494832CFE24076863ECD3D11AA5FB449DE490F4461DE`.
- Le lecteur source indépendant a relu le rendu des pages et confirmé p.185–186; synthèse finale dans son dossier de preuves `integration-source-review-final-2026-10-18.md`. Son contrôle ne modifie pas les compteurs E1.
- La recette principale et les autres contrôles cloud relèvent du principal; ce rapport ne les revendique pas.

## Limites

La fuite, le Sprint et l’action facultative pour se cacher ne sont pas automatisés. Les tests de développement et indépendants ne couvrent pas la campagne réelle, le téléphone physique ni les autres lignes de la table. E1, E2 et E5 restent ouverts; aucun livre ni lot exhaustif n’est clos.
