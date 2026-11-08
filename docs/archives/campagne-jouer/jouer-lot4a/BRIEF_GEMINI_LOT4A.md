# Mission Gemini — Lot 4A : structure et identité de Jouer

## Mandat et base

Interviens en français pour Codex dans **ce seul worktree** : `E:/Outil MJ Warhammer/tmp/jouer-lot4a-worktree`, branche `codex/jouer-lot4a`, HEAD `50d3592`. Les modifications non commitées présentes au départ sont la copie vérifiée des lots 2 et 3 intégrés dans le worktree principal : **elles constituent la base à préserver**, pas du bruit à réinitialiser. Ne compare pas le seul `HEAD` pour attribuer les modifications au lot 4A. Ne touche pas au worktree principal.

Le MJ accepte la maquette, veut conserver **toute la largeur disponible**, apprécie sa palette et ses polices, et juge les fonctions actuelles de Jouer globalement satisfaisantes. Codex contrôle ton travail avant toute intégration. Les sous-agents sont autorisés si utiles : tu restes responsable de leurs modifications et de leurs preuves ; évite les écritures concurrentes sur les mêmes fichiers.

Références : `E:/Outil MJ Warhammer/tmp/maquette-campagne-jouer/LOT_0.md`, `jouer.css`, `jouer.js`, et l'onglet Campagne intégré (`js/ui/campaign-workspace.css`). La maquette est **une référence visuelle à données fictives** : ne copie ni son état, ni ses calculs, ni des fonctionnalités supposées existantes. Tu peux lire ces références, sans les modifier.

## Résultat attendu — tranche 4A

Réorganiser la coquille et la hiérarchie visuelle de l'espace Jouer, sans changer son fonctionnement :

1. Utiliser réellement la largeur disponible, sans conteneur central à largeur maximale. Améliorer l'équilibre et la densité du plateau, de l'espace central et du volet latéral, y compris lorsque ce dernier est replié. La largeur doit servir aux informations et actions existantes, sans étirement artificiel.
2. Retrouver la direction de la maquette et de Campagne : surfaces parchemin, encre sombre, rouge profond, titres de type Georgia, interface sans-serif système, hiérarchie lisible. Adapter au thème sombre effectif et aux préférences existantes ; aucune police ou ressource distante. Ne pas imposer un fond clair en mode sombre.
3. Soigner les éléments de structure existants : bandeau/plateau, zones de mêlées et de combattants libres, espace central, panneau latéral et ses onglets Règles, Profils, Circonstances et Journal, état sans rencontre. Conserver leurs données et actions réelles ; ne pas promettre des fonctions vues uniquement dans la maquette.
4. Conserver l'accès et l'état des volets, l'usage clavier, le focus, les saisies en cours, le défilement et les sections ouvertes lors des rerendus. Préserver les événements et le cycle de vie existants : en particulier le volet latéral persistant et les clés de focus/scroll. Ne reconstruis pas le panneau latéral à chaque événement.
5. Prévoir 0, quelques et de nombreux combattants, noms longs, volet ouvert/fermé et largeurs 1440, 900 et 520 px. Aucun contrôle essentiel coupé ou superposé ; les éventuels défilements locaux restent utilisables. Conserver la navigation Préparer/Jouer/Campagne/Bibliothèque et les deux accès aux suites de combat.

**Hors tranche 4A :** refonte fonctionnelle ou détaillée des fiches acteur/cible et de la résolution, modification de leurs calculs/étapes/commandes, nouvelles interactions, données ou règles ; ces sujets relèvent du lot 4B. Les éléments existants peuvent recevoir les ajustements de style minimaux nécessaires pour s'insérer lisiblement dans la nouvelle coquille.

## Périmètre autorisé

- `js/ui/workspace.css` : styles et mise en page de Jouer, **strictement circonscrits** pour ne pas changer Préparer, Campagne, Bibliothèque ou les dialogues partagés. Examine les sélecteurs et variables existants avant de les réutiliser ; n'altère pas globalement les composants partagés.
- `js/ui/workspace-view.js` : uniquement si nécessaire, conteneurs ou classes structurels de Jouer. Préserver la création des composants, les identifiants, écouteurs, contrôles, commandes, fonctions de rendu, clés de focus/scroll et conditions d'affichage. Justifier chaque changement JS.
- Tests dédiés sous `tests/` : modifications strictement nécessaires et nouveaux tests 4A ; conserver les assertions pertinentes existantes. Ne jamais assouplir un test uniquement pour le faire passer.
- `docs/JOUER_LOT4A_GEMINI.md` : compte rendu avec fichiers modifiés, comportements préservés, résultats réellement observés, limites et instructions de prévisualisation locale.
- `sw.js` uniquement si une nouvelle ressource locale est indispensable ; conserver le précache cohérent et expliquer pourquoi. Préférer les fichiers existants.

Ne modifie pas `js/core/`, Store, données, catalogues, schémas, persistance, Firebase, synchronisation, fiches, logique de résolution/combat/magie/divin, `js/ui/side-panel.js`, `js/ui/resolution-panel.js`, `js/ui/workspace/plateau.js`, styles globaux, Campagne ou navigation globale. Ne change ni versions, ni configuration globale. Si une modification hors périmètre est nécessaire, ne la fais pas : explique le blocage et propose une tranche séparée. Aucune migration, action sur données réelles, commit, push, merge, publication, déploiement, téléchargement de police ou appel à un service externe. La rencontre de test autorisée par le MJ peut être manipulée ; utilise des fixtures isolées pour les tests automatisés.

## Vérifications attendues

- Vérifier par inspection du rendu réel, pas seulement du code : rencontre vide, rencontre active représentative, volet ouvert/replié, 1440/900/520 px, clair/sombre. Rendre compte de ce qui a été effectivement vu ; ne pas utiliser les données fictives de la maquette comme preuve produit.
- Tester les accès au plateau, aux combattants, à la cible, aux actions existantes, aux quatre onglets et au repli du volet ; vérifier l'absence de masquage, le focus clavier et la conservation d'une saisie et du défilement après un vrai rerendu. Pas de tests simulant eux-mêmes la logique de production ; vérifier que le rerendu a bien eu lieu.
- Exécuter au minimum `node tests/browser-workspace.mjs`, `node tests/browser-index.mjs`, `node tests/campaign-lot3-browser.mjs`, `node tests/f2-j-review-browser.mjs`, `node tests/f2-j2-review-browser.mjs`, et `node --test tests/unit/donnees/audit-meta-production.test.js`. Ajouter un test ciblé seulement pour les besoins non couverts par ces recettes ; vérifier notamment une petite largeur et les thèmes. Si un test échoue, décrire précisément la cause et ne pas qualifier le lot de vert tant qu'elle n'est pas comprise.
- Contrôler `git diff --check` et comparer aux fichiers de départ dans le worktree principal pour isoler tes propres changements. Ne copie rien vers celui-ci.
- Ne certifier que les états, contrastes, actions et configurations effectivement vérifiés. Le test d'une couleur ne prouve pas l'accessibilité de toute l'interface ; un parcours vert ne certifie pas toutes les règles. Signaler les éventuelles limites connues et toute décision ouverte.

## Remise

Laisser les modifications locales non commitées dans ce worktree et écrire `docs/JOUER_LOT4A_GEMINI.md`. Fournir à Codex : synthèse avant/après, fichiers et raisons, commandes et résultats précis, limites, éventuels effets de bord, et marche à suivre pour prévisualiser. Ne pas lancer le lot 4B ni intégrer le résultat toi-même.
