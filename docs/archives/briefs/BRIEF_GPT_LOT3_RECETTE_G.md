# Brief — lot 3 de la recette G, parcours G-U1 (pour ChatGPT / Codex)

Base : `main` en 3.33.1. Source : remarques du MJ sur les parcours G-U1 (01/11), triées dans `docs/CDC_CORRECTIONS_RECETTE_G.md`, section « Lot 3 ». Lis aussi `docs/RAPPORT_GPT_U1.md` : il décrit le panneau d'action tel que tu l'as refondu.

## 1. Règles du travail

- **Branche** : crée un worktree neuf depuis `main` : `git worktree add -b codex/recette-g-lot3 tmp/lot3-worktree main`, puis `npm ci` dedans. Ne travaille pas dans `E:/Outil MJ Warhammer` lui-même, et ne touche jamais `docs/RECETTE_UTILISATEUR.md` (notes du MJ non commitées). Jamais de `git stash`, jamais de réécriture d'historique (`rebase`, `reset --hard`, `push --force`), jamais de push : Claude contre-vérifie et publie.
- **Reproduire d'abord.** Pour chaque point : un test (unitaire sous `tests/unit/<domaine>/`, ou parcours navigateur `tests/*.mjs`) qui **échoue** sur `main` et décrit le comportement attendu, puis le correctif, puis le test passe. Si tu n'arrives pas à reproduire, ne corrige pas à l'aveugle : écris ce que tu as essayé et ce qui manque dans `tmp/lot3-worktree/QUESTIONS_GPT.md`, et passe au point suivant.
- **Une correction = un commit**, dans l'ordre C10 → C20. Message en anglais, préfixe conventionnel (`fix(divine): …`), suffixe « (GPT) ».
- **Aucune règle de jeu ne change**, sauf décision écrite du MJ ci-dessous. Tu changes l'affichage, les valeurs par défaut, les branchements, la taille des commandes ; jamais un calcul de dégâts, de DR, de critique, de bénédiction ou de prière. Si un point semble l'exiger, arrête-toi et écris la question dans `QUESTIONS_GPT.md`.
- **Ne plie jamais un test existant pour le faire passer.** Si un parcours navigateur casse parce que l'interface a changé, adapte-le au minimum, sans retirer d'assertion, et liste l'adaptation au rapport.
- **Libellés et sélecteurs stables** (`aria-label`, `data-focus-key`, `data-roll-input`, `data-blocking-field`) : une centaine de parcours s'appuient dessus.
- **Fin de travail** :
  - `node --test --test-concurrency=4` vert (≈ 5 500 tests ; TEMP/TMP sur le même disque que le worktree) ;
  - `npm run test:browser-all` à 105/108 au moins. Sous Windows : `PLAYWRIGHT_EXECUTABLE_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"`. Les deux parcours `lot2-v5-25-release` et `lot3-v5-35-release` échouent faute de fichiers locaux ignorés : ce n'est pas une régression.
- **Rapport final** dans `docs/RAPPORT_GPT_LOT3.md` (commité) :
  - par point : le commit, le test de reproduction, la cause trouvée, ce qui a été fait, ce qui reste ou est incertain ;
  - signale tout nouveau fichier `js/**` : il faudra l'ajouter au cache du service worker à la publication.

## 2. Bloquants (dans cet ordre)

### C10 · Prière : « Commande trop volumineuse pour maxBytes »
- **Constat** : appliquer une prière (Bénédiction de Protection) échoue avec ce message. Il vient de `recordCommand` (`js/core/history.js:53`) : une seule commande d'annulation dépasse 2 Mo (`DEFAULT_HISTORY_MAX_BYTES`).
- **À faire** : reproduire avec un prêtre de `docs/recette/profils-recette-complets.json` (Prêtre de Myrmidia ou de Sigmar) dans une rencontre avec quelques combattants. Mesure la commande produite et trouve ce qui la gonfle : état complet, référentiel, brouillon ou panneau embarqué. Corrige à la source, pour que la commande ne garde que ce qu'il faut pour annuler. N'augmente pas la limite pour masquer le problème. L'annulation (↶) de la prière doit toujours fonctionner.
- **Test** : une commande de prière reste sous une taille raisonnable (fixe un plafond, par exemple 200 Ko, et justifie-le au rapport) ; parcours appliquer la prière → ↶ → état d'avant.

### C11 · « Résultat non appliqué : recalculez, puis réessayez » sans raison
- **Constat** : le message apparaît sur un critique, et en lançant le sort Serres d'ambre, alors que le MJ n'a rien changé depuis Calculer. Il est produit par `js/ui/workspace-view.js:1791`, quand l'application échoue. Le MJ demande si les effets narratifs, non calculés par le moteur, en sont la cause.
- **À faire** : reproduire les deux cas (attaque avec critique ; Serres d'ambre avec le Sorcier ou le Mage des Bêtes des profils complets). Trouve l'erreur réelle que masque ce message générique. Corrige la cause. Si l'erreur reste légitime dans certains cas, affiche son vrai texte, pas le générique.
- **Test** : les deux scénarios s'appliquent sans message ; un test unitaire sur la cause.

### C12 · Incident magique impossible à résoudre
- **Constat** : lors d'un incident, l'écran montre « Incident magique (MINOR) : Incident à déterminer — » (`js/core/v5-magic-miscasts.js:511`) et « Incident magique transmis incomplet : jet d'incident (initialRoll / miscastRoll) manquant » (`js/core/v5-spell-contracts.js:1051`), sans aucune case de jet ni bouton « Lancer » pour saisir le jet d'incident.
- **À faire** : trouver pourquoi la case du jet d'incident (`magicMiscastRoll` / `magicMajorRoll`, rendue dans `js/ui/resolution-panel/magic.js` et `js/ui/v5-magic-controls.js`) n'est pas affichée ou pas atteignable dans ce cas : condition d'apparition, champ resté dans un groupe replié du tiroir, ou nom de champ différent entre l'interface et le contrat. Le MJ doit pouvoir saisir le d100 ou cliquer « Lancer », et « Lancer tous les dés des PNJ » doit le remplir pour un PNJ.
- **Test** : parcours incantation → incident mineur → case visible → saisie → incident déterminé et applicable.

### C13 · Une condition remise à « Non » n'est plus prise en compte
- **Constat** : « Tir à bout portant » passé à Oui est reconnu ; repassé à Non, il ne l'est plus et le Test reste bloqué. Le MJ l'a vu sur ce champ, d'autres sont peut-être touchés.
- **À faire** : reproduire (`pointBlank`, `js/core/resolution.js:419` et son contrôle dans le tiroir). Vérifie le chemin complet : changement → brouillon → aperçu → raisons de blocage. Une valeur `false` ne doit pas être confondue avec « non renseigné ». Cherche le même motif sur les autres contrôles Oui/Non du tiroir (`context:*`, `protectionContext`), et corrige-le partout où il existe.
- **Test** : unitaire sur la conversion du choix ; parcours Oui → Non → À préciser, le Test se débloque selon le cas.

### C14 · Impossible de changer les PV d'un personnage
- **Constat** : le MJ n'arrive plus à modifier les points de vie d'un personnage en combat, ce qui bloque d'autres parcours. Il n'a pas précisé l'écran : la fiche du combattant dans Jouer, la piste ou les boutons ±.
- **À faire** : essaie chaque façon de changer les PV dans Jouer. Vérifie en particulier si le tiroir Circonstances, ou son fond assombri, recouvre ces contrôles ; il est ouvert par défaut sur grand écran depuis la 3.33.0. Corrige la cause.
- **Test** : parcours qui change les PV par chaque moyen avec le tiroir ouvert, puis fermé.

### C15 · Fichier de sauvegarde non reconnu au chargement
- **Constat** : le chargement d'un fichier de sauvegarde (menu ⋯, `#file-input` dans `index.html:163`) le refuse comme non reconnu.
- **À faire** : fais l'aller-retour dans l'application : sauvegarder dans un fichier, puis le recharger. Fais-le avec une partie contenant les profils complets et un combat en cours. Teste aussi une sauvegarde produite par une version précédente, si les tests en contiennent une. Si tout passe, n'invente pas de cause : écris dans `QUESTIONS_GPT.md` qu'il faut le fichier du MJ et le message exact. Sinon, corrige.
- **Test** : parcours sauvegarde fichier → chargement → état identique.

## 3. Ergonomie

### C16 · Attaque ratée mais Test opposé gagné
- **Décision du MJ (01/11)** : la règle du livre est conservée. Celui qui gagne le Test opposé touche, même avec un jet d'attaque raté. **Le moteur ne change pas.**
- **À faire** : l'affichage du résultat le dit en clair, par exemple « Attaque ratée (DR −1), mais Test opposé gagné : touché ». Le MJ ne doit pas croire à une erreur en voyant des dégâts proposés.
- **Test** : parcours avec attaque ratée qui gagne l'opposé → texte présent, dégâts proposés.

### C17 · Lignes « À saisir avant d'appliquer » non cliquables
- **Constat** : en 3.33.1, à la table, les lignes ne mènent pas au champ, alors que le parcours U1 le vérifie avant Calculer.
- **À faire** : trouver dans quel état elles sont inertes : après Calculer, un aperçu bloqué tôt, des raisons sans `focus`, ou un champ absent du DOM. Chaque ligne doit ouvrir le tiroir et les blocs repliés, faire défiler jusqu'au champ et le focaliser. Une raison sans champ correspondant est signalée au rapport.
- **Test** : pour chaque raison que `applicationBlockingReasons` peut produire, un test vérifie qu'elle a un champ cible ou qu'elle est explicitement sans champ.

### C18 · Confirmations en un clic
- **À faire** : les champs « à confirmer » à trois états (À préciser / Oui / Non) du tiroir et du panneau divin deviennent un groupe de boutons Oui / Non, avec la même valeur au brouillon. « À préciser » reste l'état initial, sans bouton actif. Garde `aria-label` et `data-focus-key` sur le groupe. Les parcours qui font `selectOption('true')` sont à adapter au minimum.
- **Test** : unitaire du composant ; un parcours qui coche Oui puis Non.

### C19 · Ignorer une condition non réunie (narratif)
- **Décision du MJ (01/11)** : un bouton « Ignorer » sur chaque ligne de « À saisir avant d'appliquer ». La condition ignorée ne bloque plus Appliquer et elle est notée au journal de l'action (« Condition ignorée par le MJ : … »). Les jets d'attaque et de défense ne peuvent pas être ignorés : pas de bouton sur ces lignes.
- **À faire** : l'ignorance est stockée dans le brouillon et réinitialisée quand l'action ou la cible change. Le moteur ne change pas : seule la liste des raisons bloquantes est filtrée. Vérifie que l'application ne repose pas sur la valeur manquante ; si c'est le cas, dis-le au rapport plutôt que de deviner une valeur.
- **Test** : unitaire du filtre ; parcours : ignorer le Test de Calme de Protection → Appliquer actif → journal porte la mention.

### C20 · Prière plus directe
Panneau `js/ui/v5-divine-panel.js`, modèle `js/ui/v5-divine-form-model.js`, accès `js/core/v5-divine-access.js`.
- **Culte venant de la fiche** : un champ de profil « Culte » (éditeur de profil et import JSON, clé `culte`/`cult`, documenté dans `docs/IMPORT_PROFILS_JSON.md`, présent dans les profils de prêtres de `docs/recette/profils-recette-complets.json`) préremplit le culte de la prière. Il reste modifiable au moment de la prière.
- **Pénitence et Péchés** : n'affiche leurs champs que si le personnage est concerné (pénitence en cours, culte qui compte les Péchés, ou total de Péchés non nul). Garde les mêmes conditions de blocage du moteur.
- **« Le personnage peut prononcer la prière »** (`v5-divine-panel.js:419`) : Oui par défaut.
- **Jet de prière** : bouton « Lancer » à côté de la case, et prise en compte par « Lancer tous les dés des PNJ » si le prêtre est un PNJ.
- **« Portée / zone confirmée »** (`withinRange`, `v5-divine-form-model.js:35`) : considérée comme confirmée par défaut, puisque le MJ qui saisit l'action l'a vérifiée. Le champ reste disponible pour dire Non.
- **Créer la Bénédiction de Protection est trop compliqué** : décris au rapport le nombre de clics et de champs nécessaires aujourd'hui pour un prêtre de Myrmidia qui bénit un allié. Puis réduis ce chemin avec les points ci-dessus, et indique le nombre obtenu.
- **Tests** : unitaire des défauts ; parcours Bénédiction de Protection de bout en bout avec le minimum de saisies.

## 4. Hors périmètre

- Pas de changement de règle du moteur, à part ce que le MJ a décidé plus haut.
- Publication (version, service worker, push) : Claude s'en charge après contre-vérification.

## 5. Reprise (après contre-vérification de Claude, 01/11)

Continue sur la **même branche** `codex/recette-g-lot3`, dans `tmp/lot3-worktree`. Elle contient maintenant les commits de Claude :
- `06f676c` : la compaction de l'historique s'applique à toute commande volumineuse, et plus seulement aux cinq types d'avant ;
- `92eff01` : tes questions sont reportées dans `docs/RAPPORT_GPT_LOT3.md`, et `QUESTIONS_GPT.md` est supprimé.

Lis le rapport à jour avant de commencer. Mêmes règles qu'au §1. Complète le rapport existant ; pas de nouveau fichier de questions.

À faire, dans cet ordre :
- **C19 · Ignorer** — décision du MJ : « Ignorer » veut dire que **l'effet ne joue pas pour cette action**. Exemple : Protection ignorée, l'attaque se fait normalement, comme si la cible n'avait pas la bénédiction. Ce n'est jamais une réussite forcée.
  - Le brouillon porte la liste des conditions ignorées.
  - Le moteur reçoit cette liste et traite la source correspondante comme absente pour cette résolution. Pour Protection, aucune entrée `unresolved` n'est produite et le Test de Calme n'est pas demandé.
  - L'application note au journal « Condition ignorée par le MJ : … ».
  - Le moteur peut évoluer pour cette seule entrée explicite : ajoute un test unitaire du moteur.
  - Les jets d'attaque et de défense ne sont jamais ignorables.
  - La liste est remise à zéro quand l'action ou la cible change.
  - Commence par Protection. Puis inventorie les autres raisons bloquantes et classe-les au rapport : ignorables de la même façon, ou non, avec la raison.
- **C20 · Prière** — tout le §3 C20. Le champ « culte » n'existe pas encore. Crée-le :
  - dans le profil : éditeur, import JSON avec les clés `culte`/`cult`, export « Copier en JSON » et aller-retour ;
  - dans `docs/IMPORT_PROFILS_JSON.md` ;
  - dans les sept prêtres de `docs/recette/profils-recette-complets.json`.
  Le culte doit être cohérent avec les talents de culte déjà présents. Sans culte renseigné, le comportement actuel est conservé.
- **C18 · Oui / Non en un clic** — tout le §3 C18.
- **C17 · Lignes « À saisir »** — fais l'inventaire demandé au §3 : chaque raison de `applicationBlockingReasons` a un champ cible ou est déclarée sans champ, et un test le vérifie. Le MJ se souvient d'un problème avec un prêtre : vérifie en particulier les raisons des prières (panneau divin), après Calculer et avec le tiroir fermé.
- **C13 et C15** : n'y touche plus sans nouvel élément du MJ.

Fin de travail : comme au §1. Ajoute au rapport le nombre de clics pour la Bénédiction de Protection, avant et après C20.
