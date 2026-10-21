# Plan GPT — Phase C : Brisé, Peur, Terreur et ralliement

21 octobre 2026, Europe/Paris. Branche `gemini/phase-c`, worktree `E:/Outil MJ Warhammer/tmp/gemini-phase-c-worktree`, départ `9679989` (`codex/divin-v5` propre). Brief `docs/plans-gpt/BRIEF_GPT_PHASE_C_BRISE.md` et `docs/plans-gpt/REGLES_COMMUNES_GPT.md` appliqués ; arbitrages du 21/10 (`docs/ARBITRAGES_MJ_21_10.md`) prioritaires. Inventaire complété sur `L18–L26` : 200 + 39 = 239 entrées, commit `9f2292d`.

## Règles d’exécution

Lots exécutés dans l’ordre ci-dessous ; nouveaux tests écrits d’abord (rouges pour la bonne raison avant le code), commande d’acceptation ciblée puis suite complète `node --test --test-concurrency=4` à chaque lot ; tout changement dans un fichier partagé à risque (`js/core/resolution.js`, `js/core/store.js`, `js/core/v5-turn.js`, `js/core/turn-order.js`, `js/core/v5-store-action.js`) précédé d’un test de caractérisation commité séparément. Commit local de chaque lot avec la mention `(Gemini)`, jamais de push, fusion, changement de version (`js/version.js`, `package.json`, `package-lock.json`, `sw.js`, `index.html`, `README.md`), ni nouveau fichier sous `js/` (car `tests/sw.test.js` exige que tout module sous `js/` figure dans le précache `sw.js`, lequel est interdit de modification). Fins de ligne LF vérifiées avant chaque commit (`git ls-files --eol | Select-String "w/crlf"` vide). Fichiers d’arbitrage et `docs/PLAN_*.md` intouchés.

Variables d’environnement obligatoires pour les tests et la recette : `TEMP` et `TMP` pointent vers `E:/Outil MJ Warhammer/tmp/gemini-phase-c-runtime` (même lecteur `E:` que le worktree, mais hors du checkout afin de respecter les gardes de chemin externe).

Si le volume dépasse la session, terminer proprement le lot en cours (commit), rédiger et commiter le rapport partiel `docs/plans-gpt/RAPPORT_GPT_PHASE_C.md` (lots faits, lots restants) et s’arrêter.

## Lots

### C01 — Socle Peur et Terreur génériques, seuil `DR >= indice`, formule de Terreur V5 et maintien d’Effrayant / Petit

- Objectif : Unifier le circuit générique de Peur (`mode: 'sl'`, une tentative par Round, seuil `DR >= indice` selon Q01) et de Terreur (`indice + max(0, -DR - 1)` États Brisé à l’échec puis Peur de même indice selon Q02) pour les Traits de créature (`Peur`, `Terreur`, `Peureux / Afraid`), sorts, prières, objets et événements, tout en conservant `Effrayant` (`mode: 'successes'`, un Test par Tour) comme mécanisme distinct (Q03), le homebrew local `Petit` intact (Q04, Q08) et la saisie MJ obligatoire pour les sources à indice non chiffré (Q13, Q19).
- Inventaire : `C0-L06-001`, `C0-L06-002`, `C0-L06-003`, `C0-L06-004`, `C0-L06-005`, `C0-L06-009`, `C0-L06-010`, `C0-L06-021`, `C0-L06-022`, `C0-L06-029`, `C0-L06-032`, `C0-L06-036`, `C0-L06-039`, `C0-L06-042`, `C0-L06-043`, `C0-L06-050`, `C0-L06-051`, `C0-L06-055`, `C0-L09-001`, `C0-L09-008`, `C0-L13-002`, `C0-L18-008`, `C0-L21-004`, `C0-L22-004`, `C0-L23-005`, `C0-L24-001`, `C0-L25-001`.
- Arbitrages : Q01 (seuil de Peur `DR >= indice`, L06 p.183), Q02 (Terreur = `indice + max(0, -DR - 1)` Brisé puis Peur de même indice, L06 p.184), Q03 (`Effrayant` et Peur générale restent deux mécanismes distincts), Q04 et Q08 (`Petit` homebrew V4 conservé, pas de migration vers Taille V5 ; créatures génériques sans `Petit` suivent la Peur de Taille V5 L06 p.360), Q13 et Q19 (indices non chiffrés saisis par le MJ ; les indices de *Masque mortuaire* et *Givre d’Ulric* ne servent pas de défaut ailleurs).
- Comportements et tests :
  - Rencontrer une source générique de Peur (Trait `Peur (X)`, `Peureux / Afraid` = Peur 0 envers la source, sort, prière, objet ou événement à indice MJ) pose un état actif de Peur (`mode: 'sl'`, `rating: X`) sauf allié connu, `Sans peur` applicable, `Frénésie` ou `Immunité à la Psychologie`.
  - Le Test étendu de Calme contre la Peur générale autorise au plus une tentative par Round, commence par la source au degré le plus élevé, cumule les `DR >= 0` obtenus et surmonte la Peur dès que le total atteint l’indice (`totalSl >= rating`), libérant simultanément les sources de Peur de même indice ou inférieur.
  - Tant que la Peur n’est pas surmontée, la victime ne gagne pas d’Élan et la source bénéficie de l’Avantage en mêlée contre elle.
  - Le Talent `Effrayant` conserve son circuit distinct (`mode: 'successes'`, 1 réussite requise ou 2 si Grande taille, un Test pendant le Tour du personnage).
  - La Terreur générique exige un Test de Calme à la première rencontre : en cas de réussite, le personnage gagne l’immunité à toute Terreur de la rencontre ; en cas d’échec, il reçoit `rating + Math.max(0, -sl - 1)` États Brisé ; dans les deux cas, la source provoque ensuite une Peur de même indice (`rating`).
  - Toute source à indice non chiffré (`Cry of War`, apparition spectrale d’Arche noire, etc.) refuse de deviner un indice et exige la saisie explicite `rating` du MJ.
- Emplacements et fichiers autorisés : `js/core/v5-talent-psychology.js` (`PSYCHOLOGY_ACTIONS`, `fearAction`, `previewPsychologyActivation`, `psychologyTestRules`, helpers de Peur/Terreur génériques), `js/core/v5-talent-small.js` (`terrorAction`, `previewSmallTerror` préservant `Petit`), `js/core/v5-talent-situations.js` ; `tests/phase-c-c01-fear-terror.test.js`.
- Acceptation : `node --test tests/phase-c-c01-fear-terror.test.js tests/lot2-v5-remaining-talents.test.js`, puis `node --test --test-concurrency=4`.
- Risque : moyen.

### C02 — Fuite obligatoire, Fuite engagée, Talent `Fuite !` et Poursuite V5

- Objectif : Raccorder la transaction complète de fuite engagée (`C0-L06-014`), le Mouvement supplémentaire et l’exemption de Brisé du Talent `Fuite !` (`talent-flee`, `C0-L06-024`, `C0-L06-025`, Q07), ainsi que l’aide de Poursuite V5 (`C0-L06-074`), sans réintroduire `Exténué` en fin de Brisé (Q06).
- Inventaire : `C0-L06-011`, `C0-L06-012`, `C0-L06-013`, `C0-L06-014`, `C0-L06-015`, `C0-L06-023`, `C0-L06-024`, `C0-L06-025`, `C0-L06-044`, `C0-L06-074`, `C0-L06-075`, `C0-L13-001`.
- Arbitrages : Q06 (pas d’`Exténué` en fin de Brisé), Q07 (`Fuite !` : raccorder le Mouvement supplémentaire et l’exemption de Brisé à la fuite engagée), priorité V5 sur les variantes Up in Arms.
- Comportements et tests :
  - Caractérisation préalable commitée séparément si `js/core/store.js` est touché.
  - Sans confirmation explicite du protocole de fuite engagée (`facts.engagedEscapeConfirmed === true` et décision MJ sur les attaques gratuites `facts.freeAttacksResolved`), une `flee` avec `engagedEnemyIds` non vide reste bloquée (préservant l’invariant de `tests/divin-v5-brise-flee-sprint-independent.test.js`).
  - Lorsque `facts.engagedEscapeConfirmed === true` et `facts.freeAttacksResolved === true` sont fournis avec des `engagedEnemyIds` valides : chaque ennemi engagé gagne l’Élan (`hasMomentum: true`), le fuyard reçoit `+1` État Brisé par ennemi engagé (sauf s’il possède le Talent résolu `Fuite !` / `talent-flee` ou l’effet divin `En bon ordre` / `Tenez bon` applicable), et la fuite est permise même encerclé.
  - Le porteur du Talent résolu `Fuite !` (`talent-flee`) est exempté des États Brisé infligés par le choix de fuir un engagement (`C0-L06-025`) et peut déclencher son Mouvement supplémentaire de course après Désengagement (`C0-L06-024`), tout en conservant son bonus de `+1 DR` comme proie de poursuite (`C0-L06-023`).
  - L’aide de Poursuite V5 (`C0-L06-074`) compare le poursuivant au Mouvement le plus élevé à la proie la plus lente : rapport de Mouvement `>= 2` signalé comme fin d’office possible, sinon victoire à `+6 DR` mettant fin à la poursuite.
- Emplacements et fichiers autorisés : `js/core/v5-broken-escape.js` (`previewV5BrokenEscape`, aide de fuite engagée, `Fuite !` et poursuite V5), `js/core/v5-talent-situations.js`, `js/core/store.js` (`previewBrokenEscape`, `applyBrokenEscape` après test de caractérisation commité séparément), `js/ui/v5-broken-escape-panel.js` ; `tests/phase-c-c02-characterization.test.js`, `tests/phase-c-c02-engaged-flee.test.js`.
- Acceptation : `node --test tests/phase-c-c02-characterization.test.js tests/phase-c-c02-engaged-flee.test.js tests/divin-v5-brise-flee-sprint-independent.test.js`, puis `node --test --test-concurrency=4`.
- Risque : élevé (touche `js/core/store.js` pour l’application atomique des mutations de fuite engagée).

### C03 — Ralliement personnel, Round entier caché, Ralliement d’alliés par Commandement et Monture Brisée en fin de Round

- Objectif : Raccorder le ralliement d’alliés par `Commandement` (`C0-L06-018`), consolider les récupérations de Brisé en fin de Round (`C0-L06-016`, `C0-L06-017`, `C0-L06-020`, `C0-L06-026`, `C0-L06-028`, `C0-L25-003`, `C0-L25-005`) et raccorder la récupération de la monture Brisée en fin de Round selon V5 (`C0-L13-005`, Q16), sans jamais ajouter `Exténué` après le retrait du dernier Brisé (Q06).
- Inventaire : `C0-L06-016`, `C0-L06-017`, `C0-L06-018`, `C0-L06-020`, `C0-L06-026`, `C0-L06-028`, `C0-L13-005`, `C0-L25-003`, `C0-L25-005`.
- Arbitrages : Q06 (pas d’`Exténué` en fin de Brisé), Q16 (monture Brisée récupérée en fin de Round selon V5), Q17 (conversion V5).
- Comportements et tests :
  - Un meneur non Brisé peut tenter en action gratuite un Test de `Commandement` pour rallier des alliés Brisés à portée d’écoute : un succès retire `1 + Math.max(0, sl - 1)` (soit `Math.max(1, sl)`) occurrences de Brisé réparties explicitement entre les alliés désignés (`C0-L06-018`). Si le meneur est lui-même Brisé, l’action est refusée.
  - Le Talent naval `Master and Commander` (`C0-L25-003`) accorde `+1 DR` par rang aux Tests de `Commandement` lorsque le fait `onBoardVessel === true` est confirmé par le MJ, et `Crew Commander` permet de prêter sa CT sur Test de `Commandement (+0)`.
  - La monture Brisée (`C0-L13-005`, Q16) ne récupère qu’en fin de Round (`phase === 'endOfRound'`), soit par son propre Test de `Calme` hors engagement, soit par un Test d’`Équitation (+0)` du cavalier retirant `1 + Math.max(0, sl - 1)` occurrences de Brisé ; toute tentative en milieu de Tour est refusée.
  - Le retrait complet de `Brisé` ne pose aucun État `Exténué` (Q06). Sous *Curse of the Harsh Mistress* (`C0-L25-005`), le retrait d’`Exténué` au repos exige d’abord un Test de `Calme (-1 DR)` réussi.
- Emplacements et fichiers autorisés : `js/core/v5-effects.js` (`recoverV5Condition`, aide de ralliement collectif et de monture en fin de Round), `js/core/v5-talent-situations.js` (`SITUATION_ACTIONS`, `previewSituationActivation`) ; `tests/phase-c-c03-rally-mount.test.js`.
- Acceptation : `node --test tests/phase-c-c03-rally-mount.test.js tests/divin-v5-wrath-conditions-independent.test.js`, puis `node --test --test-concurrency=4`.
- Risque : moyen.

### C04 — Intimidation en combat et Traits de Psychologie V5 (`Belliqueux`, `À Sang-froid`, `Hurlement spectral`, `Immunité à la Psychologie`, `Craintif`, `Bestial`, `Frénésie`, `Haine`, `Animosité`)

- Objectif : Raccorder l’Intimidation en combat (`C0-L06-019`, `C0-L04-004`) et les circuits génériques des Traits de Psychologie V5 (`Belliqueux`, `À Sang-froid`, `Hurlement spectral`, `Immunité à la Psychologie`, `Marque de Slaanesh`, `Craintif / Skittish`, `Nuée`, `Bestial`, `Territorial`, `Cavalier accompli`), en ramenant toutes les variantes de suppléments à la règle V5 (Q08, Q09, Q10, Q20).
- Inventaire : `C0-L06-006`, `C0-L06-007`, `C0-L06-008`, `C0-L06-019`, `C0-L06-027`, `C0-L06-030`, `C0-L06-031`, `C0-L06-033`, `C0-L06-034`, `C0-L06-035`, `C0-L06-037`, `C0-L06-038`, `C0-L06-040`, `C0-L06-041`, `C0-L06-047`, `C0-L06-058`, `C0-L06-076`, `C0-L06-077`, `C0-L04-004`, `C0-L09-009`, `C0-L11-004`, `C0-L11-005`, `C0-L11-006`, `C0-L11-017`, `C0-L13-006`, `C0-L13-013`, `C0-L15-001`, `C0-L19-003`, `C0-L23-001`, `C0-L25-002`, `C0-L26-004`, `C0-L26-005`.
- Arbitrages : Q08, Q09 (`Belliqueux` V5 L06 p.356 : immunité à Peur tant que la créature possède l’Élan), Q10 (`Hurlement spectral` V5 L06 p.358 : dépense d’Élan, dégâts directs, Assourdi et Test de Calme `+2 DR` sinon Brisé), Q17, Q20 (`À Sang-froid` V5 L06 p.357 : Avantage aux Tests de Calme).
- Comportements et tests :
  - L’Intimidation en combat (`C0-L06-019`) oppose `Intimidation` à `Calme` : en visant un groupe (`targetGroup === true`), l’intimidateur subit `-2 DR` et la défense utilise le `Calme` du chef (`organizedGroup === true`) ou le plus faible `Calme` (`organizedGroup === false`) ; la victoire inflige une Peur d’indice `1 + Math.max(0, netSl - 1)` envers l’intimidateur. Lors d’un vol (`C0-L04-004`), un PJ intimidé reçoit cette Peur sans remise forcée automatique de ses biens.
  - `Belliqueux` (`C0-L06-030`) immunise contre la Peur (mais pas contre la Terreur) uniquement tant que le porteur possède l’Élan (`hasMomentum === true`), quelle que soit la variante de supplément d’origine (Q09).
  - `À Sang-froid` (`C0-L06-077`) accorde l’Avantage à tous les Tests de `Calme` (y compris contre Peur, Terreur et Intimidation), sans l’inversion de L09 (Q20).
  - `Hurlement spectral` (`C0-L06-033`) requiert la dépense d’un Élan, applique `1d10` dégâts sans BE/PA et `Assourdi`, et impose un Test de `Calme (+2 DR)` sous peine de `1` État Brisé (Q10).
  - `Immunité à la Psychologie` (`C0-L06-034`) et `Nuée` (`C0-L06-038`) interceptent et annulent tous les Tests et effets de Psychologie (Peur, Terreur, Haine, Animosité, Frénésie, Intimidation). `Marque de Slaanesh` (`C0-L06-035`) confère `Sans peur` envers tous les ennemis.
  - `Craintif / Skittish` (`C0-L06-037`, `C0-L06-040`, `C0-L13-006`, `C0-L23-001`, `C0-L26-004`) inflige `3` États Brisé devant un effet magique spectaculaire visible (sauf dressage `Magie`) ou un bruit violent (sauf dressage `Guerre`).
  - `Animosité` (`C0-L06-006`) est supplantée dès qu’une Peur ou Terreur est active sur le sujet. `Cavalier accompli` (`C0-L13-013`) permet d’utiliser la catégorie de Taille de la monture face à une Peur ou Terreur causée uniquement par la Taille adverse.
- Emplacements et fichiers autorisés : `js/core/v5-talent-psychology.js`, `js/core/v5-talent-situations.js`, `js/core/v5-combat-rules.js` ; `tests/phase-c-c04-intimidation-traits.test.js`.
- Acceptation : `node --test tests/phase-c-c04-intimidation-traits.test.js`, puis `node --test --test-concurrency=4`.
- Risque : moyen.

### C05 — Sorts, miracles, runes, objets, mutations et capacités de suppléments retenus en V5

- Objectif : Raccorder à l’exécuteur de psychologie et aux contrats d’effets les clauses de sorts, miracles, runes naines, objets magiques, mutations et capacités de créatures de `L01–L26` retenues en V5, avec toutes les conversions V4→V5 consignées.
- Inventaire : `C0-L06-048`, `C0-L06-049`, `C0-L06-052`, `C0-L06-053`, `C0-L06-054`, `C0-L06-056`, `C0-L06-057`, `C0-L06-060`, `C0-L06-061`, `C0-L06-062`, `C0-L06-063`, `C0-L06-064`, `C0-L06-065`, `C0-L06-066`, `C0-L06-067`, `C0-L06-068`, `C0-L06-069`, `C0-L06-070`, `C0-L06-071`, `C0-L06-072`, `C0-L06-073`, `C0-L01-002`, `C0-L01-003`, `C0-L01-004`, `C0-L02-001`, `C0-L02-002`, `C0-L02-003`, `C0-L02-004`, `C0-L02-005`, `C0-L02-006`, `C0-L04-001`, `C0-L04-002`, `C0-L04-003`, `C0-L07-001`, `C0-L07-002`, `C0-L07-003`, `C0-L07-004`, `C0-L07-005`, `C0-L07-006`, `C0-L07-007`, `C0-L07-008`, `C0-L07-009`, `C0-L08-002`, `C0-L08-003`, `C0-L08-004`, `C0-L08-005`, `C0-L08-006`, `C0-L08-007`, `C0-L08-008`, `C0-L09-004`, `C0-L09-005`, `C0-L09-006`, `C0-L09-007`, `C0-L11-001`, `C0-L11-002`, `C0-L11-003`, `C0-L11-007`, `C0-L11-008`, `C0-L11-009`, `C0-L11-011`, `C0-L11-012`, `C0-L11-014`, `C0-L11-018`, `C0-L11-019`, `C0-L12-001`, `C0-L12-002`, `C0-L12-003`, `C0-L12-004`, `C0-L12-005`, `C0-L12-006`, `C0-L13-003`, `C0-L13-004`, `C0-L15-003`, `C0-L15-004`, `C0-L15-005`, `C0-L15-006`, `C0-L15-007`, `C0-L16-001`, `C0-L17-001`, `C0-L17-002`, `C0-L17-003`, `C0-L17-004`, `C0-L17-005`, `C0-L17-007`, `C0-L17-008`, `C0-L17-009`, `C0-L17-010`, `C0-L17-011`, `C0-L17-012`, `C0-L17-013`, `C0-L17-014`, `C0-L17-016`, `C0-L17-017`, `C0-L17-018`, `C0-L17-019`, `C0-L17-020`, `C0-L17-021`, `C0-L17-022`, `C0-L17-023`, `C0-L17-025`, `C0-L17-026`, `C0-L18-001`, `C0-L18-002`, `C0-L18-003`, `C0-L18-004`, `C0-L18-005`, `C0-L18-006`, `C0-L19-001`, `C0-L19-002`, `C0-L19-004`, `C0-L20-001`, `C0-L21-001`, `C0-L21-002`, `C0-L21-003`, `C0-L22-002`, `C0-L22-003`, `C0-L23-002`, `C0-L23-003`, `C0-L23-004`, `C0-L25-004`, `C0-L25-006`, `C0-L26-003`.
- Arbitrages : Q05 (*Cœur du loup* L18 autorisé), Q11 (tableaux L07 p.151 et L09 p.63 vérifiés visuellement dans `docs/VERIFS_TABLEAUX_VISUELS.md`), Q12 (*Poisoned Whispers* : durée `BFM` Rounds + Test quotidien en rappel), Q13/Q19 (indices non chiffrés en saisie MJ), Q14 (*Fellstave* : conserver la formulation imprimée associant l’échec d’Intuition `+0` à l’identification de l’origine magique de la panique après récupération de Brisé, avec rappel explicite), Q15 (priorité V5 sur *Cœurs enflammés*, *Protection de Phâ* et *Attribut des Bêtes* en `BFM` Rounds), Q17 (conversions V4→V5 : `±10 % → ±1 DR`, `±20 % → ±2 DR`, `±30 % → ±3 DR`, `+40 % → +4 DR`, `Avantage → Élan`).
- Comportements et tests :
  - Sorts et attributs du socle et de `L17–L26` : déclenchement assisté des sources de Peur/Terreur/Brisé/Frénésie (*Effrayant : sort* Peur `1 + floor(overcast/3)`, *Terrifiant : sort* Terreur `1 + floor(overcast/3)`, *Attribut des Bêtes V5* Peur 1 pendant `BFM` Rounds, *Peau du chasseur*, *Wyssan*, *Voile pourpre*, *Destrier d’ombre*, *Horreur obsédante* avec Brisé/Exténué verrouillés dans la zone, *Mauvais œil*, *Crâne hurlant*, *Attribut de Slaanesh* `+2 DR` contre Peur/Terreur et `-2 DR` contre Animosité/Haine/Corruption, *Acquiescence* verrou d’Action sous Calme `+0`, *Delicious Excruciation* purge de Brisé et immunité à Brisé pendant `BFM` Rounds, *Fleshy Curse* Calme `-1 DR`, *Gift of Slaanesh*, *Luxurious Torment* / *Pavane*, *Mark of the Horned Rat*, *Death Frenzy*, *Musk of Terror* Terreur 1 ou 2 contre Skavens, *Skitterleap* Calme `-1 DR`).
  - *Poisoned Whispers* (`C0-L09-005`, Q12) applique la Psychologie pour `BFM` Rounds après opposition et émet le rappel du Test quotidien au lever du soleil.
  - *Fellstave* (`C0-L02-001`, Q14) impose `Calme (+0)` sinon `1` Brisé aux créatures du type choisi entrant dans les 100 verges, puis lors de la récupération de Brisé évalue le Test d’`Intuition (+0)` selon la lettre imprimée (échec = identification de la panique magique du pieu).
  - Runes naines et objets (`C0-L01-002` à `004`, `C0-L02-002`, `C0-L11-011`, `C0-L11-012`, `C0-L15-003` à `007`, `C0-L16-001`, `C0-L17-008`, `C0-L17-009`, `C0-L19-001`, `C0-L20-001`, `C0-L21-001`, `C0-L25-004`) : bonus convertis en DR V5 (`Rune of Daunting` indice de Peur = nombre de runes arme dégainée, `Rune of Courage` `+1 DR` par rune aux Tests de Psychologie, `Rune of the Valiant` `+1 DR` FM par rune, `Rune of Hearth and Home` jet de Calme forcé à `01`, `Master Rune of Dismay` `-1 DR` aux Tests ennemis non immunisés Psychologie pendant 1 Round, `The Laurels of Victory` Peur 2 dès le Round 2, `Sword of Fear` Peur 2 pour `2d10` Rounds, `Sacred Salt` Calme `-1 DR` sinon `1` Brisé sur créature aquatique d’Int ≤ 15).
  - Capacités de créatures, incidents et mutations (`C0-L06-048`, `C0-L06-049`, `C0-L07-001` à `009`, `C0-L09-004`, `C0-L11-001` à `003`, `C0-L11-007` à `009`, `C0-L11-014`, `C0-L11-018`, `C0-L11-019`, `C0-L12-001` à `006`, `C0-L17-001` à `005`, `C0-L17-007`, `C0-L17-010`, `C0-L19-002`, `C0-L19-004`, `C0-L21-002`, `C0-L21-003`, `C0-L23-002` à `004`, `C0-L25-006`, `C0-L26-003`) : résolution assistée avec dés et faits MJ explicites (`Howl of the Great Beast` : 1 Élan, 3 Assourdi, Calme `-1 DR` sinon 3 Brisé et immunité de rencontre sur réussite ; `Breath of Nightmares` : Terreur 2 sur Endurance ignorant l’immunité Psychologie ; `Gastromancie` : Brisé ignoré pendant `BFM` Rounds sans retrait ; `WAAAGH!` : purge des Brisé orques/gobelins/hobgobelins).
- Emplacements et fichiers autorisés : `js/core/v5-talent-psychology.js`, `js/core/v5-spell-contracts.js`, `js/core/v5-divine-effects-gear.js` ; `tests/phase-c-c05-supplements.test.js`.
- Acceptation : `node --test tests/phase-c-c05-supplements.test.js`, puis `node --test --test-concurrency=4`.
- Risque : moyen.

### C06 — Recette finale, contrôle de couverture des 239 entrées et rapport `RAPPORT_GPT_PHASE_C.md`

- Objectif : Vérifier la couverture des 239 entrées de `docs/COURAGE_BRISE_INVENTAIRE.json`, consigner tous les choix d’interprétation et conversions V4→V5 dans `docs/plans-gpt/CHOIX_EXECUTANT_PHASE_C.md`, exécuter la recette complète `node tools/run-divine-recipe.mjs` et la suite `node --test --test-concurrency=4`, puis rédiger et commiter `docs/plans-gpt/RAPPORT_GPT_PHASE_C.md`.
- Inventaire : socle/validation transversal des 239 entrées.
- Arbitrages : Tous les arbitrages de la section « Brisé, Peur, Terreur » du 21/10.
- Comportements et tests : Un test de contrôle vérifie que chacune des 239 entrées de `docs/COURAGE_BRISE_INVENTAIRE.json` est soit raccordée et couverte par C01–C05, soit explicitement exclue avec motif dans le plan ; `node tools/run-divine-recipe.mjs` et `node --test --test-concurrency=4` passent intégralement au vert.
- Emplacements et fichiers autorisés : `docs/plans-gpt/CHOIX_EXECUTANT_PHASE_C.md`, `docs/plans-gpt/RAPPORT_GPT_PHASE_C.md`, `tests/phase-c-c06-coverage.test.js`.
- Acceptation : `node --test tests/phase-c-c06-coverage.test.js && node tools/run-divine-recipe.mjs && node --test --test-concurrency=4`.
- Risque : faible.

## Couverture complète des 239 entrées de l’inventaire

Toutes les entrées de `docs/COURAGE_BRISE_INVENTAIRE.json` (les 200 entrées historiques de C0 ainsi que les 39 entrées du complément `L18–L26` marquées `addedOn: "2026-10-21"`) sont affectées ci-dessous à un lot (`C01` à `C05`, soit 202 entrées) ou explicitement exclues avec leur motif (`37` entrées).

| Identifiant | Statut C0 ou complément | Lot ou exclusion motivée |
| --- | --- | --- |
| C0-L06-001 | assisted | C01 |
| C0-L06-002 | assisted | C01 |
| C0-L06-003 | assisted | C01 |
| C0-L06-004 | assisted | C01 |
| C0-L06-005 | assisted | C01 |
| C0-L06-006 | reminder | C04 |
| C0-L06-007 | assisted | C04 |
| C0-L06-008 | assisted | C04 |
| C0-L06-009 | engine | C01 |
| C0-L06-010 | engine | C01 |
| C0-L06-011 | assisted | C02 |
| C0-L06-012 | assisted | C02 |
| C0-L06-013 | assisted | C02 |
| C0-L06-014 | absent | C02 |
| C0-L06-015 | assisted | C02 |
| C0-L06-016 | assisted | C03 |
| C0-L06-017 | assisted | C03 |
| C0-L06-018 | absent | C03 |
| C0-L06-019 | absent | C04 |
| C0-L06-020 | engine | C03 |
| C0-L06-021 | assisted | C01 |
| C0-L06-022 | assisted | C01 |
| C0-L06-023 | engine | C02 |
| C0-L06-024 | absent | C02 |
| C0-L06-025 | absent | C02 |
| C0-L06-026 | assisted | C03 |
| C0-L06-027 | assisted | C04 |
| C0-L06-028 | assisted | C03 |
| C0-L06-029 | reminder | C01 |
| C0-L06-030 | reminder | C04 |
| C0-L06-031 | reminder | C04 |
| C0-L06-032 | reminder | C01 |
| C0-L06-033 | reminder | C04 |
| C0-L06-034 | reminder | C04 |
| C0-L06-035 | reminder | C04 |
| C0-L06-036 | assisted | C01 |
| C0-L06-037 | reminder | C04 |
| C0-L06-038 | reminder | C04 |
| C0-L06-039 | reminder | C01 |
| C0-L06-040 | reminder | C04 |
| C0-L06-041 | assisted | C04 |
| C0-L06-042 | assisted | C01 |
| C0-L06-043 | engine | C01 |
| C0-L06-044 | assisted | C02 |
| C0-L06-045 | absent | Exclu par arbitrage Q18 (sous-système d’ivresse/drogues hors de la granularité voulue). |
| C0-L06-046 | absent | Exclu par arbitrage Q18 (drogue Racine étrange hors de la granularité voulue). |
| C0-L06-047 | reminder | C04 |
| C0-L06-048 | absent | C05 |
| C0-L06-049 | absent | C05 |
| C0-L06-050 | engine | C01 |
| C0-L06-051 | reminder | C01 |
| C0-L06-052 | assisted | C05 |
| C0-L06-053 | assisted | C05 |
| C0-L06-054 | assisted | C05 |
| C0-L06-055 | assisted | C01 |
| C0-L06-056 | assisted | C05 |
| C0-L06-057 | assisted | C05 |
| C0-L06-058 | assisted | C04 |
| C0-L06-059 | absent | Exclu par arbitrage Q18 (alcool/drogue Bière naine hors de la granularité voulue). |
| C0-L06-060 | reminder | C05 |
| C0-L06-061 | reminder | C05 |
| C0-L06-062 | reminder | C05 |
| C0-L06-063 | reminder | C05 |
| C0-L06-064 | reminder | C05 |
| C0-L06-065 | reminder | C05 |
| C0-L06-066 | reminder | C05 |
| C0-L06-067 | reminder | C05 |
| C0-L06-068 | reminder | C05 |
| C0-L06-069 | reminder | C05 |
| C0-L06-070 | assisted | C05 |
| C0-L06-071 | assisted | C05 |
| C0-L06-072 | assisted | C05 |
| C0-L06-073 | assisted | C05 |
| C0-L01-001 | absent | Exclu par arbitrages Q04 et Q08 (variante V4 de taille ogre écartée ; homebrew Petit conservé et Taille V5 L06 p.360 retenue en C01). |
| C0-L01-002 | absent | C05 |
| C0-L01-003 | absent | C05 |
| C0-L01-004 | absent | C05 |
| C0-L01-005 | absent | Exclu par arbitrage Q18 (sous-système de moral et fin de bataille de masse). |
| C0-L01-006 | absent | Exclu par arbitrage Q18 (action Bolster du sous-système de bataille de masse). |
| C0-L01-007 | absent | Exclu par arbitrage Q18 (action Hold This Ground du sous-système de bataille de masse). |
| C0-L01-008 | absent | Exclu par arbitrage Q18 (séquelles et traumatismes de guerre durables). |
| C0-L01-009 | absent | Exclu par arbitrage Q18 (scène de bataille de masse Intruders). |
| C0-L01-010 | absent | Exclu par arbitrage Q18 (engin de guerre du sous-système de bataille de masse). |
| C0-L01-011 | absent | Exclu par arbitrage Q18 (séquelles psychologiques durables liées à Terreur). |
| C0-L01-012 | absent | Exclu par arbitrage Q18 (séquelles psychologiques durables liées au Destin et aux ambitions). |
| C0-L01-013 | absent | Exclu par arbitrage Q18 (activité de récupération des séquelles psychologiques durables). |
| C0-L02-001 | absent | C05 |
| C0-L02-002 | absent | C05 |
| C0-L02-003 | absent | C05 |
| C0-L02-004 | absent | C05 |
| C0-L02-005 | assisted | C05 |
| C0-L04-001 | assisted | C05 |
| C0-L04-002 | assisted | C05 |
| C0-L04-003 | reminder | C05 |
| C0-L04-004 | absent | C04 |
| C0-L07-001 | absent | C05 |
| C0-L07-002 | absent | C05 |
| C0-L07-003 | absent | C05 |
| C0-L07-004 | absent | C05 |
| C0-L07-005 | absent | C05 |
| C0-L07-006 | absent | C05 |
| C0-L07-007 | absent | C05 |
| C0-L07-008 | absent | C05 |
| C0-L07-009 | absent | C05 |
| C0-L08-001 | absent | Exclu par arbitrage Q18 (préparation/drogue Viridescent Palliative et sous-système Yenlui associé). |
| C0-L08-002 | absent | C05 |
| C0-L08-003 | absent | C05 |
| C0-L08-004 | absent | C05 |
| C0-L08-005 | absent | C05 |
| C0-L08-006 | assisted | C05 |
| C0-L08-007 | reminder | C05 |
| C0-L08-008 | assisted | C05 |
| C0-L09-001 | absent | C01 |
| C0-L09-002 | absent | Exclu par arbitrage Q09 (variante L09 de Belliqueux écartée au profit de la règle V5 L06 p.356 traitée en C04). |
| C0-L09-003 | absent | Exclu par arbitrage Q18 (drogue Witchbrew hors de la granularité voulue). |
| C0-L09-004 | absent | C05 |
| C0-L09-005 | absent | C05 |
| C0-L09-006 | absent | C05 |
| C0-L09-007 | absent | C05 |
| C0-L09-008 | absent | C01 |
| C0-L09-009 | assisted | C04 |
| C0-L11-001 | absent | C05 |
| C0-L11-002 | absent | C05 |
| C0-L11-003 | absent | C05 |
| C0-L11-004 | absent | C04 |
| C0-L11-005 | absent | C04 |
| C0-L11-006 | absent | C04 |
| C0-L11-007 | absent | C05 |
| C0-L11-008 | absent | C05 |
| C0-L11-009 | absent | C05 |
| C0-L11-010 | absent | Exclu par arbitrage Q18 (concoction/drogue Potion de fureur de Preyton). |
| C0-L11-011 | absent | C05 |
| C0-L11-012 | absent | C05 |
| C0-L11-013 | absent | Exclu par arbitrage Q09 (variante Imperial Zoo de Belliqueux écartée au profit de la règle V5 L06 p.356 traitée en C04). |
| C0-L11-014 | absent | C05 |
| C0-L11-015 | absent | Exclu par arbitrage Q10 (variante Imperial Zoo de Ghostly Howl écartée au profit de Hurlement spectral V5 L06 p.358 traité en C04). |
| C0-L11-016 | absent | Exclu par arbitrages Q04 et Q08 (variante Imperial Zoo de Terreur à deux écarts de taille écartée ; homebrew Petit conservé et Taille V5 L06 p.360 retenue en C01). |
| C0-L11-017 | absent | C04 |
| C0-L12-001 | absent | C05 |
| C0-L12-002 | absent | C05 |
| C0-L12-003 | absent | C05 |
| C0-L12-004 | absent | C05 |
| C0-L12-005 | absent | C05 |
| C0-L12-006 | absent | C05 |
| C0-L13-001 | assisted | C02 |
| C0-L13-002 | assisted | C01 |
| C0-L13-003 | assisted | C05 |
| C0-L13-004 | assisted | C05 |
| C0-L13-005 | absent | C03 |
| C0-L13-006 | absent | C04 |
| C0-L13-007 | absent | Exclu par arbitrage Q18 (traumatisme psychologique et rechute de dépendance du mercenaire). |
| C0-L13-008 | absent | Exclu par priorité V5 (variante V4 Up in Arms de fuite et coup gratuit remplacée par la Fuite engagée V5 L06 p.163 traitée en C02). |
| C0-L13-009 | absent | Exclu par priorité V5 (variante V4 Up in Arms de distance de poursuite remplacée par la Poursuite V5 L06 p.158 traitée en C02). |
| C0-L13-010 | absent | Exclu par priorité V5 (action V4 Flee from Harm à Avantage de groupe remplacée par le Désengagement et la Fuite V5 traités en C02). |
| C0-L13-011 | absent | Exclu par arbitrage Q07 et priorité V5 (variante Up in Arms de Fuite ! remplacée par le Talent Fuite ! V5 L06 p.120 traité en C02). |
| C0-L13-012 | absent | Exclu par priorité V5 (variante Up in Arms d’Acharné liée à Flee from Harm remplacée par Acharné V5 L06 p.124 traité en C02). |
| C0-L13-013 | absent | C04 |
| C0-L14-001 | absent | Exclu par arbitrage Q18 (alcool/drogue Mirkwine hors de la granularité voulue). |
| C0-L15-001 | engine | C04 |
| C0-L15-002 | absent | Exclu par arbitrage Q18 (sous-système de Rancunes hors de la granularité voulue). |
| C0-L15-003 | absent | C05 |
| C0-L15-004 | absent | C05 |
| C0-L15-005 | absent | C05 |
| C0-L15-006 | absent | C05 |
| C0-L15-007 | absent | C05 |
| C0-L16-001 | absent | C05 |
| C0-L17-001 | absent | C05 |
| C0-L17-002 | absent | C05 |
| C0-L17-003 | absent | C05 |
| C0-L17-004 | absent | C05 |
| C0-L17-005 | absent | C05 |
| C0-L17-006 | absent | Exclu par arbitrage Q15 (variante V4 de l’Attribut des Bêtes en 1d10 Rounds écartée au profit de la durée V5 BFM Rounds traitée en C05). |
| C0-L17-007 | absent | C05 |
| C0-L17-008 | absent | C05 |
| C0-L17-009 | absent | C05 |
| C0-L17-010 | absent | C05 |
| C0-L17-011 | assisted | C05 |
| C0-L17-012 | absent | C05 |
| C0-L17-013 | absent | C05 |
| C0-L17-014 | assisted | C05 |
| C0-L17-015 | assisted | Exclu par arbitrage Q15 (variante V4 de Protection de Phâ écartée au profit de la règle V5 L06 p.252 traitée en C05). |
| C0-L17-016 | reminder | C05 |
| C0-L17-017 | reminder | C05 |
| C0-L17-018 | assisted | C05 |
| C0-L17-019 | reminder | C05 |
| C0-L17-020 | assisted | C05 |
| C0-L17-021 | reminder | C05 |
| C0-L17-022 | assisted | C05 |
| C0-L17-023 | reminder | C05 |
| C0-L17-024 | assisted | Exclu par arbitrage Q15 (variante V4 de Cœurs enflammés écartée au profit de la règle V5 L06 p.248 traitée en C05). |
| C0-L17-025 | assisted | C05 |
| C0-L06-074 | absent | C02 |
| C0-L17-026 | reminder | C05 |
| C0-L06-075 | assisted | C02 |
| C0-L06-076 | assisted | C04 |
| C0-L06-077 | reminder | C04 |
| C0-L09-010 | reminder | Exclu par arbitrage Q20 (variante L09 d’À Sang-froid écartée au profit de la règle V5 L06 p.357 traitée en C04). |
| C0-L11-018 | absent | C05 |
| C0-L11-019 | absent | C05 |
| C0-L02-006 | absent | C05 |
| C0-L18-001 | absent | C05 |
| C0-L18-002 | absent | C05 |
| C0-L18-003 | absent | C05 |
| C0-L18-004 | absent | C05 |
| C0-L18-005 | absent | C05 |
| C0-L18-006 | assisted | C05 |
| C0-L18-007 | absent | Exclu par arbitrage Q18 (concoction/drogue Potion of Resistance hors de la granularité voulue). |
| C0-L18-008 | absent | C01 |
| C0-L19-001 | absent | C05 |
| C0-L19-002 | absent | C05 |
| C0-L19-003 | absent | C04 |
| C0-L19-004 | absent | C05 |
| C0-L20-001 | absent | C05 |
| C0-L21-001 | absent | C05 |
| C0-L21-002 | absent | C05 |
| C0-L21-003 | absent | C05 |
| C0-L21-004 | absent | C01 |
| C0-L21-005 | absent | Exclu par arbitrage Q18 (ralliement de bataille de masse Ending the Attack / Rallying the Defenders). |
| C0-L22-001 | absent | Exclu par arbitrage Q18 (drogue de combat Skavenbrew hors de la granularité voulue). |
| C0-L22-002 | absent | C05 |
| C0-L22-003 | absent | C05 |
| C0-L22-004 | absent | C01 |
| C0-L23-001 | absent | C04 |
| C0-L23-002 | absent | C05 |
| C0-L23-003 | absent | C05 |
| C0-L23-004 | absent | C05 |
| C0-L23-005 | absent | C01 |
| C0-L24-001 | absent | C01 |
| C0-L25-001 | absent | C01 |
| C0-L25-002 | absent | C04 |
| C0-L25-003 | absent | C03 |
| C0-L25-004 | absent | C05 |
| C0-L25-005 | absent | C03 |
| C0-L25-006 | absent | C05 |
| C0-L26-001 | absent | Exclu par arbitrage Q18 (plante/drogue sédative Schlafenkraut hors de la granularité voulue). |
| C0-L26-002 | absent | Exclu par arbitrage Q18 (sous-système de moral de groupe A Pirate Attack). |
| C0-L26-003 | absent | C05 |
| C0-L26-004 | absent | C04 |
| C0-L26-005 | absent | C04 |
