# Passation — recette à la table (phase G), 01/11/2026

Tu reprends pendant la recette manuelle du MJ. Lis ce document, puis la mémoire du projet (`C:/Users/arnot/.claude/projects/E--Outil-MJ-Warhammer/memory/MEMORY.md`) et `C:/Users/arnot/.claude/CLAUDE.md` (réponses courtes, en français).

## 1. État

- **Production : 3.31.0**, `main` = 7329d8a, en ligne (https://ethoril.github.io/Outil-MJ-Warhammer/js/version.js). Suite 5 493/5 493, recette divine 26/26, parcours navigateur 105/105 (+ `tests/browser-import-json-complet.mjs`).
- Depuis le 30/10 : phase R (3.29.0 : tests regroupés sous `tests/unit/<domaine>/`, modules extraits, une instruction par ligne), arbitrages du MJ du 31/10 et feuille « Aides de jeu » réimportée (3.30.0 : 400 sorts, 214 talents, vocabulaire V5), pénitence du Courroux et rappels de sorts (3.30.1), **import JSON complet** (3.31.0, correction C9).
- Rapports : `docs/RAPPORT_PHASE_R.md` ; décisions du MJ : fin de `docs/archives/f1-reperage/ARBITRAGES_25_10.md` (31/10) ; journal de la feuille : `docs/archives/v5-diff-v2-v3/JOURNAL_FEUILLE.md`.

## 2. La recette en cours

- Le MJ suit `docs/RECETTE_UTILISATEUR.md` : **84 parcours** numérotés (G-BASE, G-DIV, G-BES, G-INI, G-ATT, G-ARM, G-EMP, G-MON, G-CRI, G-DES, G-COR, G-MAG, G-DEC), 186 étapes. Il note dans le fichier même : `[y]` = passé, `[x]` = en échec, et une ligne « Remarques : ».
- **Ce fichier porte ses notes, non commitées** (G-BASE-1 à 10 faits). Ne l'écrase pas, ne le reformate pas, ne le commite pas sans lui ; un `git pull` qui toucherait ce fichier échouerait.
- Personnages prêts : `docs/recette/PROFILS_RECETTE.md` (tableau parcours → profils), `profils-recette.json` (13), `profils-recette-complets.json` (21 prêtres et sorciers), `profils-recette-arcs.json` (G-ARM-2), créatures dans la Bibliothèque de bestiaire. À charger sur `http://localhost:8765/` (stockage séparé de sa partie réelle sur `127.0.0.1`). Serveur : `python -m http.server 8765 --bind 127.0.0.1` (`python3` = alias du Microsoft Store sous Windows).

## 3. Cahier des charges des corrections

`docs/CDC_CORRECTIONS_RECETTE_G.md` (**non commité**, document vivant) : à compléter au fil des remarques du MJ, corrections par lots.
- Décisions du MJ du 01/11 : événements = **proposer**, le MJ applique ; panneau d'action = correctif immédiat puis refonte U1 sur maquettes ; défauts de rencontre = PJ actif dans le camp des PJ, PNJ/créatures actifs ennemis ; la recette continue pendant les corrections.
- **Fait** : C9 (import JSON complet, 3.31.0) ; C8 en partie (exemple en DR V5 ; reste à reformuler le message « Ancien seuil »).
- **À faire, lot 1** : C1 bouton « Appliquer » désactivé sans raison (bloquant), C2 rencontre (statut/camp par défaut, avertissement, camp surpris), C3 combattants ajoutés invisibles, C4 « Restaurer » sans effet.
- **Lot 2** : C5 événements, C6 repères V5 → règle cliquée, C7 doublons des mots-clés de créature, fin de C8. **Chantier U1** : refonte du panneau d'action. Hors périmètre : hors ligne (G-BASE-9).
- Quand le MJ envoie de nouvelles remarques : ne rien corriger sans son accord, poser les questions (sélecteur), compléter le CDC.

## 4. Méthode qui a marché

- Délégation : sous-agents Sonnet (`implementer`, brief écrit dans `tmp/phase-r/BRIEF_*.md`), puis **vérificateur Sonnet indépendant** (agent `verifier`) avant toute publication ; ils ont trouvé de vrais bugs à chaque fois (C9 : identité partagée entre copies, puis une régression du correctif). Petites corrections : directement.
- Une correction = un test qui reproduit d'abord, puis le correctif.
- **Gemini via Antigravity** (mémoire `gemini-delegation-authorized.md`) : le MJ colle le prompt dans le panneau agent d'Antigravity ; un Monitor suit git et un fichier de fin. Bon pour le mécanique avec contrôle déterministe ; il a réécrit l'historique et contourné une erreur sur R3-10 : à arrêter au bouton stop et contre-vérifier (`tmp/phase-r/unbound-check.mjs`, `git reflog`).
- Travailler dans un worktree neuf depuis `main` (`git worktree add -b claude/<nom> tmp/<nom>-worktree main`, `npm ci`, copier `tmp/divin/*.json` depuis le worktree de publication pour le test « cwd externe »). Jamais de `git stash`, jamais de jonction `node_modules`.

## 5. Publier

Worktree de publication `C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer` (branche `codex/divin-v5`) : merge `--ff-only` de la branche ; nouveau `js/**` dans `ASSETS_TO_CACHE` de `sw.js` ; version aux 7 endroits (`js/version.js`, `package.json`, `package-lock.json` ×2, `sw.js` CACHE_NAME, `index.html` #btn-version, `README.md` titre et ligne 3) ; `node --test --test-concurrency=4` ; `node tools/run-divine-recipe.mjs` avec `PLAYWRIGHT_EXECUTABLE_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"` (si « Une source protégée a été modifiée » après un changement légitime et contre-vérifié du catalogue ou des CSV : mettre à jour les 4 empreintes de `tmp/divin/base-manifest.json` depuis le commit validé) ; commit anglais « (Claude) » + pied `Co-Authored-By` ; `git push origin codex/divin-v5:main` et `git push origin codex/divin-v5` ; vérifier la version en ligne ; `git pull --ff-only` dans `E:/Outil MJ Warhammer` ; mettre à jour la mémoire `refonte-interface-branch.md`. Changement de tests ou de docs seulement : pas de nouvelle version.

## 6. Petites choses en suspens

- Deux dossiers vides `tmp/phase-r-worktree` et `tmp/arb-worktree` bloqués par Antigravity : à supprimer quand sa fenêtre est fermée.
- Feuille « Aides de jeu » : écriture autorisée quand le MJ le demande (mémoire `feuille-aides-de-jeu-corrections.md`), toujours vérifiée par ré-export ; jamais « Importer ».
- Phase H (écriture vers les fiches) et rappels du projet des fiches : après G (mémoire `rappel-mots-cles-fiches.md`).
