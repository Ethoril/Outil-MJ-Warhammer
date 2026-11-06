# Tri des tests du 06/11

Base : `dev/recette-plateau-04-11` (7fb25cf). Chaque test a été lancé seul sous `timeout 120`.

| Test | Verdict | Avant | Après |
|---|---|---|---|
| `browser-index` | passe, rien à faire | — | vert en 33 s |
| `browser-workspace` | (b) obsolète : chemin de navigateur | échec au lancement (le test a ensuite été signalé comme dépassant 120 s) | vert en 15 s |
| `browser-magic-v5-smoke` | (b) obsolète : service worker | bloqué plus de 400 s | vert en 12 s |
| `f2-j-review-browser` | (b) obsolète : libellé du d100 | échec en 15 s | vert en 4 s |
| `f2-j2-review-browser` | (b) obsolète : libellé du d100 | échec en 15 s | vert en 10 s |
| `recette-g-c14-browser` | (b) obsolète : chemin de navigateur | échec au lancement | vert en 6 s |

Aucun test n'est une régression du code de production, et aucun n'est « trop lent » (c).

**browser-index.** Passe en 33 s sur le code actuel. Le « À trier » venait peut-être d'un état antérieur de la branche ou d'un incident ponctuel. Je n'ai pas pu le reproduire. À décider par le MJ : rien. Si l'échec revient, relancer seul et me donner la sortie.

**browser-workspace.** Le test lançait en dur `/Applications/Google Chrome.app/...` (chemin Mac) hors `PLAYWRIGHT_EXECUTABLE_PATH`. Sous Windows, le lancement échouait. Le « dépasse 120 s » vu dans la passation est un blocage de lancement, pas de la lenteur. J'ai repris le motif de `browser-index` : Edge sous Windows, Chrome Mac sinon. Le parcours dure ensuite 15 s. Rien à décider.

**browser-magic-v5-smoke.** La cause est le commit `d17639e` : `index.html` n'enregistre plus le service worker sur localhost, volontairement. L'étape 5 attendait `navigator.serviceWorker.ready`, qui ne se résout jamais sans enregistrement. Le test restait donc suspendu sans erreur, d'où les 400 s et plus. Le test enregistre maintenant `sw.js` lui-même, ce qui vérifie le même fichier, son précache et le mode hors-ligne. À décider par le MJ : rien. La vérification de l'enregistrement réel par `index.html` sur un hôte non-localhost n'est plus couverte par ce test. Elle ne peut l'être qu'en recette sur la prod.

**f2-j / f2-j2.** Le bouton « Lancer » ajouté à chaque saisie de dé (3.40.0) est dans le `<label>`. Le nom accessible du champ est devenu « d100 Lancer » et `getByLabel('d100', {exact:true})` ne trouvait plus rien. Les sélecteurs sont passés à `/^d100/`. Les deux parcours sont verts. Rien à décider.

**recette-g-c14.** Même défaut de chemin de navigateur que `browser-workspace`, corrigé de la même façon. Le test passe en 6 s. Rien à décider.

## Reste à décider

Rien de bloquant. D'autres tests `*.mjs` peuvent contenir le même chemin Mac codé en dur : `grep -l "Applications/Google Chrome" tests/*.mjs`.
