# Troisième contrôle des corrections Gemini — 10 octobre 2026

**L’affirmation « tous les points corrigés » n’est pas validée.** Des raccordements réels sont maintenant présents, mais les effets ne correspondent pas tous aux règles et certains résultats restent inutilisables dans le parcours normal.

## Vérifications exécutées par Codex

- Suite complète `node --test` : **1 021 / 1 021**, zéro échec. `git diff --check` ne signale pas d’erreur de whitespace.
- `tests/browser-magic-v5-smoke.mjs` : **OK**, avec les composants du workspace, les choix MJ, les caractéristiques de Main de Gloire et le Service Worker hors ligne. Le scénario utilise une fixture, pas une campagne réelle. La recette navigateur Combat annoncée par Gemini n’a pas été rejouée pendant ce contrôle.
- **Cibles :** Carreau refuse deux cibles sans surpuissance ; une dépense `targets: 1` les autorise. La sélection mixte allié/adversaire reste acceptée pour Tête Brûlante. Le précédent défaut du nombre de cibles de Carreau est corrigé.
- **Incident :** un résultat transmis contenant Distraction, incident 15, est désormais conservé sans dupliquer le dé dans les options. Surpris est effectivement appliqué via le store. Le précédent remplacement silencieux est corrigé.
- Les options de Goût de Feu et les caractéristiques I/Ag de Main de Gloire sont maintenant accessibles. Les nouveaux champs de résistance et de dés secondaires sont raccordés ; leur résolution reste incorrectement encadrée, voir ci-dessous.

Le contrôle supplémentaire compare les résultats à `LOT3_AUDIT_SORTS.json` et au cahier des charges. La présence d’une action dans un reçu ne certifie pas l’effet du sort.

## 1. P1 — Des traitements spéciaux appliquent une autre règle

**Le Bœuf Reste Debout** (`v5-spell-contracts.js:1467`) doit retirer **DR + 1 états Brisé**, puis protéger temporairement contre les nouveaux Tests de Peur/Terreur. La configuration contient bien `removeBrokenAmount: 'SL + 1'` et `fearTerrorImmunity: true`. Le traitement ignore ces champs et retire **À Terre et Sonné**.

Reproduction via le store : cible avec **Brisé 3, À Terre 1, Sonné 1**, lancement réussi à 8 DR. Après application : **Brisé 3 reste**, À Terre et Sonné disparaissent. Seul le drapeau `oxStands` est enregistré ; l’immunité attendue n’est pas produite. L’audit contrôlé cite Winds of Magic p. 149.

**Destruction des Arcanes** (`v5-spell-contracts.js:1434`) est audité comme dégâts proportionnels à l’armure totale et destruction d’armure, avec faits et choix d’inventaire. Le traitement produit à la place « Arcane Implacable (Dégâts magiques ×2) » et `doubleSpellDamage: true`. Aucun reçu n’applique les dégâts d’armure ni sa destruction. Le sort a donc une action, mais cette action ne réalise pas la règle contrôlée.

**Attendu :** corriger identité et traitement depuis la règle de chaque contrat ; consommer effectivement ses paramètres, conditions, choix et durée. Tester avant/après indépendamment de l’attribut de Domaine. Ne pas prendre une liste d’identifiants « implémentés » ou un nombre d’actions non nul comme preuve de fidélité.

## 2. P1 — Main de Gloire accorde gratuitement l’option à +6 DR

`v5-spell-contracts.js:1875` appelle systématiquement le traitement de **Main de Gloire (+6 DR)** avec quatre caractéristiques et Mouvement +2. Il ne contrôle ni ne débite les 6 DR correspondant à cette option.

Reproduction : Langue (Magick) **90**, jet **54**, réserve **0**, NI **4**. Le résultat possède **4 DR finaux, 0 excédent disponible, 0 DR dépensé**. Avec les choix CC/F/I/Ag et le jet commun 15, l’aperçu est pourtant prêt et donne **+15 aux quatre caractéristiques et M +2**.

**Attendu :** distinguer le profil de base du profil à +6 DR, exposer le choix du palier et valider sa dépense avec les autres surpuissances. Ne pas autoriser quatre caractéristiques et M +2 lorsque l’excédent est nul. Conserver quatre au choix parmi CC/CT/F/E/I/Ag, jet partagé et Bmax inchangé pour le palier payé.

## 3. P1 — Les Points de Chance temporaires ne rejoignent pas le compteur utilisable

`v5-magic-effects.js:436` ajoute les points à `participant.fortune`, `extensions.v5.fortune` et `temporaryFortune`. Le compteur du lot 2 et son parcours de dépense utilisent **le registre de ressources du personnage**, consulté par `Store.getFortune()` / `getV5Fortune()`.

Reproduction via le store : initialiser la Fortune du mage à **0** avec `setFortune`, puis lancer **Le Second Signe d’Amul** avec succès. Le participant affiche `fortune: 3` et `temporaryFortune: 3`, mais **`Store.getFortune('mage').balance` reste 0**. La fonction séparée `consumeTemporaryFortune` n’est pas appelée par l’interface et ne raccorde pas la relance normale à cette réserve.

**Attendu :** rendre la réserve temporaire disponible au parcours normal de Fortune, sans modifier le solde permanent ou la fiche source. Débiter les points temporaires de façon atomique lors de la relance, suivre le reliquat et son expiration, puis vérifier annulation, sauvegarde/reprise et projections du personnage. Tester ce parcours depuis l’UI plutôt qu’un compteur temporaire isolé.

## 4. P1 — Les tests secondaires deviennent facultatifs ou universels

**Calme** (`v5-spell-contracts.js:1621`) considère le Test de Sociabilité réussi lorsque le dé manque. Reproduction : lancement réussi, aucune saisie secondaire ; l’aperçu est prêt avec **`roll: null, passed: true`** et retire les états. La règle exige une Sociabilité réussie.

Par ailleurs, `v5-spell-contracts.js:1197` applique à tout contrat renseigné avec `resistanceRoll` un simple Test de **FM de la cible**, puis annule l’effet si ce Test réussit. Cette résistance générique n’est conditionnée par aucune règle du sort. Un **Carreau** avec un jet secondaire 10 devient ainsi résisté, avec 0 Blessure perdue. L’UI réutilise un même dé sous `resistanceRoll`, `fellowshipRoll`, `agilityRoll` et `enduranceRoll`, et le moteur utilise le même `resistanceRoll` pour toutes les cibles.

**Attendu :** déclarer pour chaque sort le Test secondaire réellement requis, son acteur, compétence, difficulté, opposition et conséquences. Demander les dés obligatoires et bloquer l’application s’ils manquent. Recueillir les résultats par cible lorsque nécessaire. Ne pas donner une résistance FM aux sorts qui ne la prévoient pas.

## Point complémentaire P2 — L’API d’admissibilité peut ignorer le camp

`isHostileTarget` (`v5-spell-contracts.js:130`) donne priorité à `type` et `side` sur `camp`. Lui fournir un mage `type: 'PJ', camp: 'pj'` et une cible `type: 'PNJ', camp: 'ennemi'` fait accepter l’ennemi pour Main de Gloire, pourtant réservé aux alliés. Ce contrôle vise l’API ; la fixture navigateur ne reproduit pas ce mélange de champs.

**Attendu :** classifier l’alliance depuis les camps canoniques du modèle de combat, avec une convention explicite pour les éventuelles autres entrées. Un type PJ/PNJ ne constitue pas un camp.

## Suite demandée

Corriger ces résultats avant de déclarer les 277 sorts terminés. Ajouter les reproductions au parcours du store et les deux parcours utilisateur manquants : dépense de Fortune temporaire et choix/dépense du palier de Main de Gloire. Contrôler les règles des traitements spéciaux au lieu de tester uniquement la présence de leurs marqueurs, puis mettre à jour la matrice et relancer les vérifications utiles.

Preuves : `review-gemini-fourth-probes.mjs`, `gemini-fourth-probes.jsonl`, `gemini-fourth-full-tests.txt`, `gemini-fourth-browser.txt` dans `C:\Users\arnot\.codex\visualizations\2026\10\09\01a1203a-1fd5-7db0-93c2-afd3e97e1dc6`. Les rapports précédents sont conservés. Aucun code de Gemini modifié, aucun push ni déploiement ; le checkout principal reste inchangé.
