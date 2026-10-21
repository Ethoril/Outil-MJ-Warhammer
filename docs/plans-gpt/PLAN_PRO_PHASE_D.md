# Plan de lots — Phase D (traditions de magie et compléments), exécutant : Claude Pro

Contexte : `docs/plans-gpt/BRIEF_GPT_PHASE_D_MAGIE.md`, `docs/plans-gpt/REGLES_COMMUNES_GPT.md`, arbitrages `docs/ARBITRAGES_MJ_21_10.md`. Branche `pro/phase-d`. Inventaires : `docs/lot3/LOT4_TRADITIONS_BASE.json` (42 sorts), `docs/lot3/LOT4_TRADITIONS_SUPPLEMENTS.json` (144 + 114 du complément du 21/10, 90 runes, 28 règles de système). Compléments : commit `de56652`.

## Règles de travail (rappel)

Fichiers LF. Pas de `git stash`, pas de push, pas de changement de version. Par lot : tests d'abord (ils échouent pour la bonne raison), code, commande d'acceptation, générateur `node tools/build-v5-spell-contracts.mjs` (jamais de JSON édité à la main), suite complète `node --test --test-concurrency=4`, commit `<type>(magie): <résumé> (Claude Pro)`. Source de vérité des textes : PDF (V5 EN L06 d'abord, puis suppléments ; noms FR : L05). `SL` du texte anglais = `DR` du moteur. Résumés en français, pas de recopie.

## Circuit existant (constat)

- Les 277 contrats viennent de `docs/lot3/LOT3_AUDIT_SORTS.json` (lignes de la feuille Magie, empreinte sha256 de la ligne) + configuration dans `tools/build-v5-spell-contracts.mjs` (`DOMAIN_V5`, `ARCANE_PETTY_V5`, `WOM_SOURCE`, `CATALOGUE_SOURCE`, `ELVEN_SPELL_CONFIG`) → `js/data/v5-spell-contracts.json`, lu par `js/core/v5-spell-contracts.js` (`getAllSpellContracts`, `getSpellContract`). L'interface liste **tous** les contrats (`Contrats de sorts V5`) : un contrat ajouté est lançable sans fiche.
- Le catalogue public (`js/data/reference-snapshot.json`, 277 identités, miroir de la feuille) ne contient aucune des traditions visées et ne peut pas être modifié d'ici : pas de ligne d'audit possible.
- **Décision de conception** : les sorts de traditions ont leur propre source, `tools/v5-tradition-spell-contracts.mjs` (même rôle que `v5-elven-spell-contracts.mjs`), traitée par le même générateur après la boucle d'audit et écrite dans le même `js/data/v5-spell-contracts.json`. Id `spell-tradition-<slug>`, `isTradition: true`, `row: null`, `edition` = « Tradition V5 (livre de base) » / « Supplément … adaptation V5 », `sourceFingerprint` = sha256 de {nom canonique, page, NI, portée, cible, durée}. Aucune ligne d'audit, aucun changement du catalogue public. Conséquence : seule l'assertion `getAllSpellContracts().length === 277` (tests/lot3-v5-catalogue-lileath.test.js) change (lot D1).
- Attributs de Domaine : `js/core/v5-magic-attributes.js` (`LORE_ATTRIBUTES`, `normalizeLoreId`, `previewLoreAttribute`) ne connaît que les 8 Vents + Haute Magie ; `contract.domain` fournit le Domaine (`previewLoreAttribute` via `normalizeLoreId(contract.domain)`). Les attributs de Chaos et de Grande Gueule s'ajoutent là (lots D7-D9, D12).

## Arbitrages appliqués à toute la phase

Aucun ingrédient exigé (rappel narratif seulement) ; Petit = homebrew V4 local ; `SL`→DR, ±10→±1 DR, ±20→±2 DR, Avantage V4→Élan ; livre V5 prime sur V4 ; livre le plus récent prime entre suppléments ; tout choix d'interprétation → `CHOIX_EXECUTANT_PHASE_D.md` (id, source, question, choix, raison, alternative).

## Lots

Format : objectif — inventaire — comportements attendus (tests) — emplacements — fichiers autorisés — acceptation — risque.

### D1 — Socle des contrats de traditions
- Objectif : brancher `tools/v5-tradition-spell-contracts.mjs` sur le générateur ; domaines et libellés des 7 traditions ; garde-fous.
- Tests de caractérisation (commit à part, avant changement) : `tests/pro-d1-characterization.test.js` : le générateur actuel reproduit à l'identique `js/data/v5-spell-contracts.json` (hash), 277 contrats, ids uniques, noms uniques.
- Comportements : (1) après D1, 277 contrats d'audit inchangés octet pour octet ; (2) chaque contrat de tradition a `isTradition: true`, id préfixé, empreinte recalculable, aucun nom en collision avec un des 277 (Silence arcane L17 sera nommé « Silence (Arcane) » en D19) ; (3) `getSpellContract('<nom FR>')` et le nom EN canonique résolvent le contrat ; (4) un contrat de tradition s'affiche dans la liste avec son domaine ; (5) l'assertion de décompte devient `filter(c=>!c.isTradition).length === 277`.
- Emplacements : `tools/build-v5-spell-contracts.mjs` (après la boucle `for (const item of audit.items)`), nouveau `tools/v5-tradition-spell-contracts.mjs`, `js/core/v5-spell-contracts.js` (aucun changement attendu hors drapeau), `tests/lot3-v5-catalogue-lileath.test.js:13`.
- Fichiers autorisés : ces fichiers, `js/data/v5-spell-contracts.json` (généré), `tests/pro-d1-*.test.js`. Acceptation : `node --test tests/pro-d1-*.test.js tests/lot3-v5-catalogue-lileath.test.js tests/lot3-v5-catalogue-parity.test.js`. Risque : moyen (JSON partagé par toutes les suites de magie).

### D2 — Magie naturelle, sorts du livre V5 (8)
- Inventaire : LOT4_TRADITIONS_BASE « Hedgecraft » L06 pp.255-256. Nom du Domaine : « Domaine de la Magie naturelle » (arbitré). Attribut du Domaine (ingrédients obligatoires) **neutralisé** : rappel narratif.
- Sorts, paramètres vérifiés sur L06 (tous NI 0) : Bonne Volonté (Vous, ZdE BSoc m, BFM minutes), Joie de Halãtha (Toucher, 1, BSoc heures), Chevaucher l'Obscurité (Vous, Vous, BFM minutes), Nepenthés (Toucher, spécial, BFM heures), Panacée (Toucher, spécial, BDex heures), Séparer les branches (Vous, Vous, Initiative minutes), Charme protecteur (Toucher, spécial, BFM **jours**), Œil du berger (spécial, spécial, instantanée).
- Comportements : Bonne Volonté : +1 DR Sociabilité à tous les participants de la zone (alliés, ennemis, neutres), Animosité et Haine marquées sans effet, expiration à BFM minutes ; Charme protecteur : +2 DR pour résister aux effets magiques et à la Corruption pour le porteur, durée BFM jours (V5 prime sur L02 : pas de talent Résistance à la Magie) ; Chevaucher l'Obscurité : trait Éthéré, couche qui prend fin sur dégâts magiques, rappel corps immobile (version V5 arbitrée : le sort n'agit pas sur le monde) ; Panacée : soigne BDex Blessures, +1 maladie par +2 DR (reçu de maladies : rappel MJ) ; Séparer les branches : perçoit invisibles ; Nepenthés, Joie de Halãtha, Œil du berger : rappels avec reçus (`treatment: narrative`/`mjInput`) ; ingrédients : aucun blocage (test : lancement sans ingrédient prêt).
- Tests : `tests/pro-d2-magie-naturelle.test.js` (paramètres relus pour 8 sorts ; 5 comportements ci-dessus avec Store, Undo, rechargement, expiration).
- Emplacements : `tools/v5-tradition-spell-contracts.mjs`, `js/data/v5-spell-contracts.json`. Acceptation : `node --test tests/pro-d2-*.test.js`. Risque : faible.

### D3 — Magie naturelle, 9 sorts d'AOTE3 convertis en V5
- Source L02 pp.62-64 relue. Noms FR : propositions de Gemini (`docs/plans-gemini/PROPOSITIONS_CONVERSION_AOTE3.md`), vérifiées ; écarts consignés. Écarts déjà relevés : (a) Dague de l'Art : le texte parle des Traits Éthéré **ou Corrompu** → Éthéré et Corruption (tout degré) seulement, la liste élargie de Gemini (Mutation, Marque du Chaos, Démoniaque) n'est pas dans la source ; (b) Protection contre le wyrd : source = Sorcellerie, Nécromancie, Démonologie, Chaos ; l'ajout « tout sort de Focalisation (Dhar) » de Gemini est écarté ; (c) Borne sinistre, test d'Intuition : lecture littérale de la source (rappel) au lieu de l'inversion proposée ; (d) Expulsion : test fixe de Volonté (+0 DR), non opposé.
- Conversions : ±10→±1 DR ; Challenging (+0)→Intermédiaire +0 DR ; Exténué V4 (−10) → −1 DR (Revigorer ignore les pénalités, ne retire rien) ; yards→mètres ; Avantage n'apparaît pas.
- Comportements : Dague de l'Art : attaque temporaire dague Magique, dégâts BF+8 contre Éthéré/Corruption, maintien par Focalisation +0/Round (saisie) ; Revigorer : `ignoreFatiguePenalties` pendant BFM Rounds, compteur d'Exténué intact ; Sachet de protection : +1 DR Calme contre Peur/Terreur surnaturelles, +1 DR Résistance contre maladies et Empoisonné, durée « 1 semaine + 1 par DR » ; Pas imperceptible : aura masquée (`magicAuraHidden`), +2 DR Discrétion contre Démoniaque/Éthéré, interdit incantation, Focalisation, dissipation ; Expulsion : cible Éthérée/Démoniaque uniquement, Volonté +0, échec = BFM Blessures directes, à 0 bannie (reçu 1d10 ans) ; Protection contre le wyrd : Force Mentale opposée, victoire = −2 DR Langue (Magick)/Focalisation pour les 6 traditions listées ; Marée d'argent, Philtre d'amour, Borne sinistre : rappels et reçus (1d10 sous ; engouement jusqu'à minuit).
- Tests : `tests/pro-d3-magie-naturelle-aote3.test.js`. Acceptation idem. Risque : moyen (Pas imperceptible, Wyrd interagissent avec incantation).

### D4 — Sorcellerie (8)
- L06 pp.256-257 : Dégradation (14), Menace rampante (6), Malédiction de douleur paralysante (10), Malédiction de malchance (8), Glamour (4), Horreur hantante (8), Bonne santé (4, soigne **BVol**, pas BFM : même caractéristique, noms FR), Mauvais œil (6). Attribut : **aucun** ; règle d'ingrédients neutralisée ; Corruption à l'incantation de Dhar : V5 (rien par incantation).
- Comportements : Malédiction de malchance : −1 DR à tous les Tests, Chance dépensable interdite, relance 01-05 sans Chance ; Mauvais œil : opposition Intimidation/Calme + DR, Peur (1), 1 Exténué (+1 par +3 DR), Brisé à +6 ; Horreur hantante : +1 Exténué à l'entrée (sauf sorcières et familiers), Calme +0 sinon +1 Exténué et Brisé jusqu'à la sortie ; Bonne santé : soin BVol, retire 1 Exténué et 1 Sonné, portée BVol m à +3 DR ; Malédiction de douleur : choix de localisation (Corps/Tête/Membre) avec états et tests, nouvelle localisation par Action Focalisation +2 DR ; Menace rampante : essaim (rats/araignées) engagé, trait Nuée, Charm Animal +0 pour rediriger ; Dégradation et Glamour : rappels.
- Tests : `tests/pro-d4-sorcellerie.test.js`. Risque : moyen.

### D5 — Démonologie (4)
- L06 p.258 : Destruction de Démon Mineur (6), Détection de démon (4), Manifestation de Démon Mineur (8), Octogramme (10). Aucun attribut. Octogramme : version V5 (sans clause d'évasion V4).
- Comportements : Destruction : cible Démon taille ≤ Moyenne, Endurance opposée +4 DR ; victoire = destruction + choix d'une caractéristique +10 pour BFM Rounds (choix du lanceur, consigné CHOIX) ; Manifestation : démon (Sanguinaire/Daemonette, profils existants si présents sinon participant générique) , opposition Focalisation (Dhar)/Calme, un ordre puis disparition, échec = attaque ; fin de durée avec ordre inachevé : le démon disparaît (CHOIX) ; Détection : rappel ; Octogramme : zone, Démoniaque ne peut entrer ni sortir.
- Tests : `tests/pro-d5-demonologie.test.js`. Risque : moyen.

### D6 — Nécromancie (4)
- L06 pp.258-259 : Relever les morts (7), Réanimation (8), Crâne hurlant (8), L'appel de Vanhel (6). Aucun attribut. Relever les morts : profils Squelettes/Zombies = phase E ; **participant générique** en attendant (1 + DR squelettes, À Terre, contrôlés, fin à la mort/inconscience du lanceur, +1 par +2 DR) ; raccordement noté pour la phase E dans le rapport.
- Fins : « jusqu'au lever du soleil » via horloge existante (`minutesToDawn` en saisie, comme Ombrelame/Shadowsteed) ; fin sur mort/Inconscient du lanceur par `endsOnEvents` (CHOIX : lecture la plus simple).
- Terre nue (Relever les morts) : rappel, aucun refus (CHOIX).
- Comportements : Crâne hurlant : projectile +5 en ligne, ignore obstacles, exclut Morts-vivants, Calme +0 sinon Brisé après Blessure ; Vanhel : BI cibles Mort-vivant, Mouvement ou Action gratuite, +BI cibles par +2 DR.
- Tests : `tests/pro-d6-necromancie.test.js`. Risque : moyen.

### D7 / D8 / D9 — Domaines du Chaos : Nurgle, Slaanesh, Tzeentch (3 chacun)
- L06 pp.259-260 ; noms FR : Flot de Corruption, Consentement, Trahison de Tzeentch officiels (L05 p.257), autres propositions de Gemini vérifiées (Inflammation suppurée, Miasme de pestilence, De la douleur le plaisir, Fantasmagorie ?, Don de Tzeentch, Transformation de Tzeentch ; choix de « Phantasmagorie/Fantasmagorie » consigné).
- Attributs (dans `v5-magic-attributes.js`, 3 Domaines ajoutés ; tests de caractérisation de l'existant d'abord) : Nurgle : pendant un sort du Domaine, toute cible qui subit une Blessure fait le test de Blessure Suppurée (vérifier le registre : sinon reçu MJ) ; Slaanesh : −2 DR pour résister à Animosité, Haine, Corruption, +2 DR Peur/Terreur ; Tzeentch : Test de Corruption par cible affectée, échec +1 Point de Corruption, réussite +1 Point de Chance jusqu'à la fin de la rencontre (compteur temporaire, lecture simple, CHOIX).
- Comportements par sort : Flot de Corruption (souffle Acide/Poison, projectile BE ignorant PA, Endurance +0 sinon Pourriture du sang au-delà du BE ; surpuissance V5, pas la V4 « +2 par +2 DR ») ; Miasme (Endurance −2 DR sinon Nausée, exempts : dévoués de Nurgle et moines de la peste) ; Inflammation (une Blessure devient Suppurée) ; Consentement (Endurance +0 à chaque début de Round, échec : perte du Mouvement et de l'Action) ; De la douleur (Indolore ; Blessure Critique : Endurance +2 DR sinon armes lâchées, état **Impuissante** = mappé sur Sans défense, CHOIX) ; Fantasmagorie (Distraction aux alliés, pas entre eux) ; Don de Tzeentch (sort quelconque lancé comme mémorisé, non transcriptible, Incantation Imparfaite : le sort quitte l'esprit ; contrat à données : sort choisi parmi les contrats, CHOIX sur interaction avec le verrou elfique) ; Transformation (À Terre et Sans défense, Endurance +0 chaque fin de Round sinon +1 Corruption) ; Trahison (Animosité (Alliés), pas de transfert d'Avantage, critique : Calme −2 DR sinon attaque l'allié le plus proche).
- Tests : `tests/pro-d7-nurgle.test.js`, `pro-d8-slaanesh`, `pro-d9-tzeentch`. Risque : élevé pour l'attribut (v5-magic-attributes.js) ; caractérisation commitée à part.

### D10 — Familiers : document de conception (aucun code)
- `docs/plans-gpt/CONCEPTION_FAMILIERS.md` : règles de Winds of Magic (L17 pp.180-184) converties en V5, ouvertes à tous (Magie naturelle, Sorcellerie, Collèges) ; lien automatisé maître-familier (effets partagés, portée en saisie MJ, deux systèmes distincts animal / homoncule) ; coordination avec la phase E ; inventaire des règles, conversion, modèle de données, cas de test. Commité avant D11.

### D11 — Familiers : code selon la conception (si la conception ne dépend pas de la phase E ; sinon BLOQUÉ + raison)

### D12 — Grande Gueule (Ogres), 11 sorts
- L01 pp.31-33 (Bonecrusher, Bullgorger, Braingobbler, Taste Death, Trollguts, The Maw, Feast of the Fallen) + L12 p.82 (Bilebrew, Bloodgruel, Get Some Guts, Toothcracker) ; Attribut (L01 p.32 : 1d10 après sort réussi, 10 ou ≥ NI : soigne NI Blessures) ; **sans ingrédient**, l'acte de manger en rappel (D0b-Q04 réglé par le principe transversal) ; Bullgorger : difficulté nommée « Difficile » à +20 : lecture V5 −2 DR (CHOIX Q05). Noms FR proposés, consignés.

### D13 / D14 — Magie orque (Gork et Mork)
- L12 pp.98-101 (12 « Petite Waaagh », 12 « Grande Waaagh ») avec variantes L07 p.183 (Lustria) : « le livre le plus récent fait foi » : dates de publication relevées au démarrage du lot (crédits), retenue consignée ; écarts de cartouche (‘Eadbutt, Bash ‘Em Lads, Mork Save Us) consignés. Rouse Idol of Gork : rituel, exclu.

### D15 — Variantes slann et Haute Magie ajoutée
- L07 pp.128-129 : Uproot the Mountains (Haute Magie), Earth Line, Ruination of Cities, Mental Blast (Slann), variantes des contrats existants en **extensions explicites** (jamais de remplacement des contrats elfiques). Méditations p.129 = ni sorts ni rituels, exclues.

### D16 / D17 / D18 — Magie elfique : Vaul (9), mer (10), Hoeth (10)
- L08 pp.102-111 ; options sous Yenlui, sacrifices (vue, Recherche, Exténué) en reçus/faits MJ ; conversions V5.

### D19 — Compléments des Collèges
- L17 p.26-27 (8 arcanes : Belligerence of the Bloodmarsh, Collapse Construct, Decipher Curse, Disrupt Magic, Fly-Infested Rotweed, Lifebloom Silt, Silence → « Silence (Arcane) », Succour Magical Servant), Shroud of Fog (L07 p.81).

### D20 — Runes naines : conception uniquement
- `docs/plans-gpt/CONCEPTION_RUNES.md` : gravure, types, Runes de Maître, conversion V5 (±10→±1 DR, Avantage→Élan), interaction avec équipement/talents, 90 runes (82 + 8 du complément), seuils jamais inventés. Aucun code.

### D21 — Recette et rapport
- `node tools/run-divine-recipe.mjs` verte ; `docs/plans-gpt/RAPPORT_PRO_PHASE_D.md`.

## Entrées d'inventaire non couvertes (exclusions motivées)

- Rituels (système à part) : D0b-L02-016, D0b-L16-001, D0b-L17-010 à 026 et 031/033 voir ci-dessous ; Mòna (L17 p.217, Fimir) : hors liste d'arbitrage, à arbitrer ; magie noire elfique L09 (24 sorts, Temple of Spite) : non citée aux arbitrages, à arbitrer ; D0b-L14-001 Phoenix Reborn : capacité de créature → phase E.
- Exclus par arbitrage : Vampires, O Mere Be More (D0b-L17-031), Skin of Bone and Bark (D0b-L17-033), rituels.
- Complément du 21/10 (L18-L26) : magie skaven (37), Slaanesh V4 (L18), Chaos arcane/Tzeentch étendu (L23, L26), sorts de navire (L25), Spirit Walk, Reveal the Inner Beauty, variantes : « à arbitrer », non implantés (D0b-Q22 à Q25). Runes : conception seule.
- Le détail des cas de test des lots D12 à D19 est précisé par un addendum de plan commité avant le code de chaque lot (lecture ciblée des pages au démarrage du lot).
