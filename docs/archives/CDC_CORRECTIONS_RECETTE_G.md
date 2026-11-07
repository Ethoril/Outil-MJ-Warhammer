# Cahier des charges — corrections issues de la recette à la table (phase G)

Source : remarques du MJ dans `docs/RECETTE_UTILISATEUR.md` (parcours G-BASE-1 à 10, 01/11/2026), décisions du MJ du 01/11. Document vivant : complété à chaque série de parcours, corrigé par lots.

## Méthode commune à chaque correction

1. **Reproduire d'abord** : un test (unitaire, ou parcours navigateur sous `tests/*.mjs`) qui échoue sur la 3.30.1 et décrit le comportement attendu.
2. Corriger, puis le test passe ; suite complète, parcours navigateur et recette verts.
3. Aucune règle de jeu changée sans décision du MJ ; contre-vérification indépendante avant publication.

## Décisions du MJ du 01/11

- **Événements structurés** : quand une condition est remplie, l'outil **propose** (alerte « condition remplie » et aperçu de la conséquence) ; le MJ applique d'un clic. Rien ne change sans lui.
- **Panneau d'action** : correctif immédiat (raisons de blocage visibles, champs obligatoires marqués, actions physiques en tête), puis **refonte complète à part** (U1), sur maquettes validées par le MJ.
- **Défauts d'une rencontre** : PJ actifs dans le camp des PJ ; PNJ et créatures actifs, camp ennemi. Le MJ change les exceptions à la main.
- La recette continue pendant les corrections ; ce document s'enrichit au fil des parcours.

## État au 01/11 soir — C1 à C8 publiés en 3.32.0

Faits par ChatGPT (brief `docs/BRIEF_GPT_CORRECTIONS_RECETTE_G.md`, rapport `docs/RAPPORT_GPT_RECETTE_G.md`), contre-vérifiés par Claude, retouches « (Claude) ». Décision du MJ pendant le chantier : un combattant actif ajouté à un combat commencé lance son Initiative.
Restes connus, à voir pendant la recette :
- C1 : réordonnancement des sections non fait (renvoyé à U1) ; tous les champs bloquants ne sont pas encore cliquables depuis la liste (ex. défense engagée au tir).
- C3 : un ajout par « Modifier » ignore `namePrefix` et le personnage persistant d'une entrée (pas créés par l'interface aujourd'hui) ; retirer puis rajouter un profil donne deux combattants.
- C4 : cause du « sans effet » non établie (probablement la boîte `confirm` du navigateur, remplacée) ; le scénario fichier → chargement → versions → Restaurer n'a pas de parcours automatisé ; **validé à la table par le MJ le 02/11**.
- C5 : après Annuler d'une baisse de PV, la refaire réalerte ; l'alerte « Condition remplie » ne survit pas au rechargement (l'événement reste dans « À traiter »).
- C7 : seule la liste de saisie de l'éditeur de profil a été traitée ; à revoir si les doublons venaient d'ailleurs.
- C8 : message de l'éditeur de profil (`reserve.js`) sans test positif.

## Lot 1 — bloquants (à corriger en premier)

### C9 · L'import JSON doit porter tout le profil (priorité 1, MJ 01/11) — FAIT en 3.31.0
- **Livré** : clés françaises (talents, compétences, Traits, Taille, sorts, prières, équipement du catalogue, Fortune/Chance, Destin, Résilience, Corruption, Péchés, espèce, mouvement, `dr` sur un jet) ; tout nom ou champ inconnu signalé avec suggestion ; copies en combat indépendantes ; « Copier en JSON » et aller-retour testé sur 34 profils ; exemple en DR V5 (partie de C8). Deux contre-vérifications.
- **Reste hors périmètre** : monture et familier (liens entre combattants), Réserve de Canalisation, spécialisation libre invalide d'un talent à spécialisation (non détectée).
- **Constat** : « Créer depuis un JSON » ne porte que caractéristiques, armure, tags, mots-clés et jets. Talents (et rangs), Traits de créature, sorts, prières, Destin et Chance, Corruption, monture, Taille, compétences, armes et Qualités hors jets sont ignorés sans prévenir : le profil importé est incomplet.
- **Attendu** : tout ce que l'outil sait gérer sur un profil s'importe en JSON (clés en français, alias anglais, insensibles aux accents et à la casse comme le reste du format) ; tout ce qui n'est pas reconnu est **signalé** dans l'aperçu (jamais ignoré en silence) ; noms de talents, Traits, sorts et prières validés contre les référentiels de l'outil (proposition du nom le plus proche en cas de faute). Aller-retour : un profil exporté puis réimporté est identique. `docs/IMPORT_PROFILS_JSON.md` et « Insérer un exemple » mis à jour.
- **Cas d'essai** : `docs/recette/profils-recette-complets.json` (profils de prêtres et de sorciers de la recette) ; inventaire des champs manquants dans `docs/recette/PROFILS_RECETTE.md`.
- **Acceptation** : chaque profil de recette importé présente ses talents, sorts et prières dans l'outil ; un champ inconnu produit un avertissement ; test d'aller-retour export → import.

### C1 · Bouton « Appliquer » désactivé sans explication (G-BASE-4)
- **Constat** : « Appliquer 11 dégâts à Garde du pont » affiche un curseur d'interdiction ; le MJ ne sait pas quel champ manque, ni lesquels sont obligatoires.
- **Attendu** : sous le bouton désactivé (et au survol), la liste des saisies manquantes en clair (« À saisir : Test de Calme de l'attaquant ») ; un clic sur un élément de la liste amène au champ. Les champs exigés par le moteur sont marqués comme obligatoires ; les autres sont visiblement facultatifs.
- **Ordre du panneau** : sections des actions physiques (attaque, défense, dégâts) en tête ; Corruption, magie, divin et autres sections ensuite.
- **Acceptation** : parcours navigateur où une saisie manque → la raison s'affiche ; une fois remplie → le bouton s'active et applique.

### C2 · Rencontre : statut, camp et initiative (G-BASE-3)
- **Constat** : avec un PJ et un PNJ « en attente », le sélecteur de camp surpris ne propose que « aucun », l'ordre calculé est vide et « Calculer / actualiser l'ordre » n'a pas d'effet visible.
- **Attendu** :
  - Ajout à une rencontre : PJ → actif, camp des PJ ; PNJ et créatures → actif, camp ennemi (décision du 01/11).
  - Si le calcul de l'initiative ne trouve aucun combattant actif : avertissement explicite (« Aucun combattant actif : passez-les en Actif ») au lieu d'un ordre vide silencieux.
  - Le sélecteur de camp surpris liste les camps des combattants présents.
- **Acceptation** : rencontre neuve avec 1 PJ et 1 PNJ → ordre calculé à 2 lignes, camp surpris propose les deux camps ; tout en attente → avertissement.

### C3 · Combattants ajoutés à une rencontre en cours invisibles (G-BASE-6)
- **Constat** : « Modifier » la rencontre en cours pour ajouter des personnages fonctionne, mais ils n'apparaissent pas en revenant dans le combat (ils apparaissent après « Recommencer »).
- **Attendu** : les ajouts apparaissent aussitôt dans la piste ; combat commencé : insertion à leur rang d'Initiative (mécanisme existant, cf. G-DIV-18) ; combat non commencé : ils entrent dans l'ordre au calcul.
- **Acceptation** : parcours navigateur ajout en cours de combat → visible sans Recommencer, à son rang.

### C4 · « Restaurer » une version précédente sans effet (G-BASE-7)
- **Constat** : sauvegarde fichier, chargement, versions précédentes et aperçu fonctionnent ; « Restaurer » ne fait rien.
- **Attendu** : la restauration remplace l'état par le point choisi ; message de confirmation ; rechargement → état du point ; Annuler possible.
- **Acceptation** : parcours navigateur de bout en bout (le parcours `browser-persistence` couvre-t-il « Restaurer » ? sinon l'y ajouter).

## Lot 2 — fonctionnels

### C5 · Événements structurés (G-BASE-5)
- **Constat** : un événement créé ne réagit pas quand sa condition est remplie ; il ne peut plus être rouvert pour être relu ou modifié.
- **Attendu** :
  - Détection de la condition au moment où elle devient vraie (changement de jauge, de Round, etc.) → alerte « condition remplie » avec l'aperçu de la conséquence et un bouton pour l'appliquer (décision du 01/11 : jamais automatique).
  - Liste des événements avec ouvrir, modifier, supprimer.
- **Acceptation** : test unitaire de détection, parcours navigateur création → condition remplie → alerte → application → journal.

### C6 · Repères V5 : ouvrir la règle cliquée (G-BASE-2)
- **Constat** : dans « Règles et mots-clés », les boutons des repères V5 (Tests, Élan…) lancent une recherche de mots au lieu d'afficher la règle.
- **Attendu** : un clic ouvre directement la fiche de la règle correspondante (Tests, Élan…).
- **Acceptation** : chaque bouton de repère ouvre une fiche dont le titre est celui du bouton.

### C7 · Doublons dans la liste des mots-clés de créature (G-BASE-1)
- **Constat** : beaucoup de doublons dans la liste.
- **À faire** : trouver la source (référentiel, fusion livre/feuille, spécialisations) ; une entrée par mot-clé, spécialisations regroupées sous leur parent.
- **Acceptation** : test « aucun libellé en double dans la liste proposée ».

### C8 · Exemple d'import JSON et « Ancien seuil » (G-BASE-1) — exemple corrigé en 3.31.0, reste le message
- **Constat** : un profil importé depuis l'exemple affiche « Ancien seuil −10 : DR à préciser », incompréhensible.
- **Cause** : l'exemple de `docs/IMPORT_PROFILS_JSON.md` et du bouton « Insérer un exemple » utilise l'ancien modificateur en pourcentage (`mod`) au lieu du modificateur en DR V5.
- **Attendu** : exemple en DR V5 (aucun avertissement à l'import) ; message reformulé : « Modificateur de l'ancienne version (−10 %) : indiquez le modificateur en DR ».
- **Acceptation** : import de l'exemple → aucun avertissement ; un JSON avec l'ancien champ → message clair.

## Chantier séparé

### U1 · Refonte de l'interface du panneau d'action (G-BASE-4)
- Le cartouche est complet mais trop chargé pour aller à l'essentiel à la table.
- Démarche : inventaire des sections et des champs ; maquettes (2 à 3 variantes) présentées au MJ ; implantation après validation ; aucune règle changée.
- Après le lot 1 (C1 en pose les bases).
- **Base retenue par le MJ le 01/11 : variante D** du canevas https://claude.ai/artifact/8ZMkAK4hwMET74YrEAntNf (variantes A, B, C pour mémoire) :
  - trois étapes numérotées dans le panneau : 1 Action et cible, 2 Jets, 3 Résultat ; « Appliquer » en pied avec la liste « À saisir avant d'appliquer », chaque ligne étant un lien vers son champ (C1) ;
  - chaque d100 a sa case et un bouton « Lancer » ; une étiquette PJ ou PNJ par jet ; « Lancer tous les dés des PNJ » tire d'un coup les jets des PNJ et créatures (attaque, défense, Tests demandés) ; les dés des PJ restent saisis à la main ; rien n'est lancé sans clic ;
  - tiroir « Circonstances » à droite (repris de la variante C), ouvert par un bouton qui compte les circonstances actives, avec un résumé d'une ligne sous les jets ; il regroupe, dans l'ordre : saisies obligatoires (encadrées, ex. Test de Calme de la Bénédiction de Protection, avec « Lancer »), Combat, Défense de la cible, Avantage et Fortune, Talents ; il remplace le flux plat actuel de « Test V5 » et de « Circonstances des Tests » ;
  - sort, prière et Corruption passent par un bouton d'action secondaire, après les actions physiques ;
  - journal et règles repliés en rail ; piste des tours à gauche conservée.
- **Publié en 3.33.0 le 01/11** (GPT, rapport `docs/RAPPORT_GPT_U1.md`, contre-vérifié par Claude). Écart assumé : tiroir ouvert par défaut pour tous les types sur grand écran (l'ancienne zone Test V5 était toujours visible), fermé par défaut ≤ 900 px. Restes : aperçu recalculé à chaque frappe (coût non mesuré), « Effacer » ne vide pas les jets d'attaque et de défense, panneau divin rouvert de force pendant un jugement en cours.
- Inventaire de l'existant (sections, champs, conditions de blocage) : à refaire au moment du chantier, depuis `js/ui/resolution-panel.js` (`renderResolutionPanel`) et `js/ui/resolution-panel/`.

## Lot 3 — recette G-U1 (3.33.1, 01/11 nuit)

### Bloquants
- **C10 · Prière : « Commande trop volumineuse pour maxBytes »** à l'application d'une prière (Protection). Reproduire, trouver la commande trop grosse (probablement l'état du brouillon ou du panneau divin embarqué dans la commande).
- **C11 · « Résultat non appliqué : recalculez, puis réessayez »** sur un critique et sur le sort Serres d'ambre, alors que rien n'a changé. Trouver ce qui rend l'aperçu périmé (effets narratifs ? dés du critique ?).
- **C12 · Incident magique incomplet** : « Incident magique (MINOR) : Incident à déterminer » et « jet d'incident (initialRoll / miscastRoll) manquant », sans case de jet accessible pour le résoudre.
- **C13 · Condition qui ne se met pas à jour** : « Tir à bout portant » passé à Oui est reconnu, repassé à Non ne l'est plus, et le Test reste bloqué.
- **C14 · Impossible de changer les PV d'un personnage** (bloque d'autres parcours).
- **C15 · Chargement d'un fichier de sauvegarde : fichier non reconnu.**
- **C16 · Attaque ratée mais Test opposé gagné** : la règle du livre est conservée (MJ, 01/11) : l'attaque touche. À corriger : l'affichage, qui doit dire « attaque ratée, mais Test opposé gagné : touché » au lieu de laisser croire à une erreur.

### Ergonomie
- **C17 · Lignes « À saisir avant d'appliquer » non cliquables** (constaté en 3.33.1) : chaque ligne doit amener au champ, tiroir ouvert, champ en vue et focalisé.
- **C18 · Confirmations en un clic** : les saisies du type « à confirmer » se règlent par Oui / Non directement (boutons), pas par une liste.
- **C19 · Le MJ peut ignorer une condition non réunie** (narratif, décision du MJ du 01/11) : un bouton « Ignorer » sur chaque ligne de « À saisir avant d'appliquer » ; la condition ignorée est notée au journal ; les jets d'attaque et de défense restent obligatoires. Précision du MJ (01/11) : « Ignorer » veut dire que l'effet ne joue pas pour cette action (Protection ignorée : l'attaque se fait normalement, comme sans bénédiction) ; jamais une réussite forcée.
- **C20 · Prière** :
  - le culte du prêtre vient de sa fiche (champ de profil, import JSON compris) au lieu d'être choisi à chaque prière ;
  - Pénitence et Péchés n'apparaissent que si le personnage est concerné ;
  - « capable de prononcer la prière » à Oui par défaut ;
  - bouton « Lancer » pour le jet de prière ;
  - ne pas demander de confirmer portée et zone : la saisie du MJ vaut confirmation ;
  - créer la Bénédiction de Protection est trop compliqué : parcours à simplifier.

### À refaire après correction
- G-U1-5 (Round complet à la table), G-RETEST (G-BASE-3 à 7).

## Lot 4 — recette manuelle 3.34.0 (GPT dans Chrome, 02/11)

Source : `tmp/RECETTE_MANUELLE_CHROME_3_34.md` (90 parcours : 26 OK, 49 partiels, 12 bloqués ou en anomalie, 3 non faits). Corrections faites par Claude avec des sous-agents Sonnet, pas par GPT (MJ, 02/11).

### Décisions du MJ du 02/11
- **Convalescence** : un seul temps. Avancer le temps de campagne fait avancer le calendrier de convalescence (soins, échéances) ; « Suites de combat → Jours à avancer » devient un raccourci du même temps.
- **Circonstances** : gardées quand on change d'action puis qu'on revient (même acteur, même cible).
- **Arme non reliée à un exemplaire d'inventaire** : plus de blocage ; l'outil demande les valeurs manquantes (chargeur, pièce visée, cibles…) en saisie manuelle.
- **Entaille sans critique** (02/11, après phase V) : l'Élan n'est pas dépensé et rien ne bloque.
- **Blessé non bandé et temps de campagne** : l'avancement s'arrête et demande les Tests quotidiens avant de continuer.
- **Capteur (Aigle spectral)** : reste au banc, bouton « Faire entrer » masqué.
- **Tir dans la mêlée (C28, livre V5 v3 p. 167)** : quand le Désavantage fait rater un tir qui aurait touché, le combattant touché est tiré au sort parmi les AUTRES combattants de la mêlée (cible initiale exclue) ; il est touché d'office, sans Test de défense, avec le jet sans Désavantage (DR et localisation) ; le résultat affiche la déviation (« tir dévié vers X, d100 25, jet 35 retenu ») et la carte d'inversion n'est plus marquée retenue.
- **Recette** : Claude joue les 3 parcours non faits (G-BASE-9, G-BASE-10, G-U1-5) ; les sous-cas des partiels seront repris plus tard, petit à petit.

### Phase V — vérifications (avant de corriger)
- **V1 · Reproduire** chaque anomalie ci-dessous par un test qui échoue aujourd'hui ; une anomalie non reproduite sort du lot avec le cas manquant.
- **V2 · Règles à trancher sur le livre V5 v3** (pas le MJ) : main secondaire (−1 DR observé, G-ATT-6), portée de l'arbalète (40 m, G-ARM-2), 57 mots-clés affichés contre 55 attendus (G-ARM-1).
- **V3 · Commandes introuvables** (Peur « Au contact ou à la vue », création de Familier, Attaque naturelle, Action défensive) : la recette décrit-elle une interface qui n'existe plus, ou la commande est-elle mal placée ?
- **V4 · Parcours non faits** joués par Claude dans le navigateur : G-BASE-10 (Recommencer), G-U1-5 (Round complet), G-BASE-9 (hors ligne).

### Résultats de la phase V (02/11)

**V2 · Règles (livre V5 EN v3)** — aucun écart dans l'outil :
- main secondaire : −2 DR (p. 166-167) ; le −1 DR observé est +1 DR de jet −2. La seconde attaque à deux armes coûte 1 Élan sauf Dual Wielder : l'attendu de la recette (« ne dépense pas d'Élan ») est faux ;
- arbalète 40 m (p. ~299) ; l'arc elfique 150 m vient de la feuille Aides de jeu (pas dans le livre de base) ;
- 57 mots-clés corrects : « Inflige X » et « Bouclier » ajoutés le 27/10 ; la recette (« 55 ») est périmée.

**V3 · Commandes introuvables**
- **Défaut réel** : Peur/Terreur « Au contact ou à la vue » et « Création de familier » n'existent que sur les anciennes cartes de combattants (`card.js`, panneau `#panel-combat`), masqué en permanence depuis la refonte de l'Espace de séance. Inaccessibles aujourd'hui → **C41** (C-d).
- Attaque naturelle : le sélecteur n'apparaît que pour un Trait de combat naturel (pas pour l'attaque imprimée « Bite 35 » d'un livre V5) → recette à préciser.
- Action défensive : n'accepte que des compétences au statut `resolved` avec un total ; les profils de recette n'en ont pas → profil de recette à compléter.
- Attaque précédente (deux armes) : n'apparaît qu'après une première attaque appliquée ce Tour avec l'autre arme à une main → recette à préciser.

**V4 · Parcours non faits (Claude, navigateur intégré, 3.34.0)**
- **G-BASE-10 · Recommencer : OK.** PV, état À Terre, Round 2 et combattant ajouté reviennent à la composition ; Initiative redemandée ; un seul ↶ rend tout l'état d'avant. La confirmation passe par `window.confirm` (pas les boutons Oui/Non de C18).
- **G-BASE-9 · Hors ligne : OK pour le local.** L'outil se recharge hors ligne (service worker), le profil créé hors ligne est conservé. Divergence de compte non testable en mode invité. Après rechargement hors ligne, le statut affiche « Enregistré sur cet appareil » au lieu de « Hors ligne » (mineur).
- **G-U1-5 · Round complet (6 combattants : 2 attaques, 1 défense de PJ, 1 sort, 1 prière) : jouable, avec ces frictions** →
  - C42 · Maladresse du défenseur : la ligne « Maladresse de combat : saisissez le d10 » n'est pas cliquable (C17 incomplet) ; le champ est au fond du tiroir Circonstances ; l'effet du d10 n'apparaît ni dans le résultat ni au journal ; au Round 2 le Sorcier (défenseur maladroit) est passé en dernier sans explication.
  - C43 · Prêtre sans action préparée : la Résolution n'a ni Jets ni étapes ; le panneau de prière est loin en dessous, après Pénitences et Péchés ; « Allié admissible : À préciser » alors que la cible est du même camp ; « Fin de l'effet » obligatoire à chaque prière (proposer Fin de Round par défaut).
  - C44 · Section « Prières divines » affichée pour un PJ non prêtre, avec la liste de tous les cultes.
  - C45 · Sort : « Circonstances · 2 actives » sans aucun changement du MJ (attribut de Vent coché par défaut compté).
  - C46 · Journal : les actions d'un Tour s'affichent au-dessus de l'en-tête « Tour de X » (ordre antichronologique), on croit qu'elles appartiennent au Tour suivant.

**V1 · Reproductions** (tests sur la branche `codex/recette-g-lot4`, dossier `tests/unit/lot4/` et `tests/lot4-*-browser.mjs`, tous en échec aujourd'hui sauf mention)
- C21 · `reserve.js:58` + `MJ.css:253` : champs Bras/Jambes visibles mais ignorés.
- C22 · `main.js` `openEventsView` : jauges capturées à l'ouverture, liste non redessinée après application.
- C23 · `v5-corruption-panel.js:141,195,306` : condition de grisage passée en booléen figé au lieu d'une fonction.
- C24 · `encounters.js:21` `normalizeCamp('neutre','PJ')` renvoie `pj`.
- C25 · le critique d'excédent vient de l'aperçu figé ; la péremption n'est testée qu'au clic.
- C26 · `workspace-view.js:1135` vide `v5Context` à chaque changement d'action.
- C27 · gardes d'Initiative limités au Round 0 (`store.js:1735,2497,2686,2705,3114`) ; `insertParticipantsByInitiative` sait déjà placer à son rang.
- C28 · **non reproduit comme bug moteur** : quand l'inversion obligatoire fait rater le tir, la règle L06 p. 167 redirige vers un combattant de la mêlée au hasard et garde le jet 35 ; ici le hasard est retombé sur la cible. Défaut de présentation : la carte « Inverser en 53 » reste affichée comme retenue.
- C29 · Force reconnue par le nom seulement (`resolution.js:307-313`, libellé « F · 35 ») ; case d'empoignade testée sur la nature saisie et non la nature déduite (`resolution-panel.js:2407`).
- C30 · `resolution.js:971` : sans critique, « Élan requis » à tort et Élan annoncé dépensé.
- C31 · `resolution.js:420/436` : le raté d'arme n'annule pas la touche.
- C32 · `resolution-panel.js:1490` lit `.parameter` seulement ; les profils importés portent `rating`. Même cause probable pour « chargeur non initialisé » (`v5-reloading.js:17-21`).
- C33 · codes de blocage caractérisés (Recharge, Précise, Taille, Dispersion, Explosion).
- C34 · `v5-divine-form-model.js:307` : `toEngineInput` n'envoie pas les cibles, le choix de critique n'est jamais transmis.
- C35 · champs de perte de réserve / incident absents sur un aperçu d'interruption (`magic.js:118`) ; aucun champ `mawRoll` (ni `corruptionRoll`) dans l'UI.
- C36 · `skillScore` absent des aperçus partiels de prière ; options « Conserver/Inverser » calculées avant `slExtreme` ; motifs critiques poussés deux fois (`resolution.js:1022,1504`).
- C37 · N'écoutez point la Sorcière : moteur correct, mais l'UI appelle `previewCasting` sans cibles, le −2 DR est perdu. Malice de Ranald **non reproduit** : marche pour toute action liée à une caractéristique ; l'action manuelle n'en porte pas.
- C38 · `bestiary-profiles.js:190` : pas de repli sur CC/CT ; 112 attaques L07 sur 112 sans score.
- C39 · horloge de campagne et calendrier de convalescence indépendants (`v5-campaign-time.js`, `v5-aftermath.js`).
- C40 · spécialisation non affichée (`fiche-details.js:20`) ; le capteur au banc est voulu (test `invocations.test.js:262`), seul « Faire entrer » est en trop.

### Phase C — corrections (worktree `codex/recette-g-lot4`, un sous-lot à la fois, test de reproduction d'abord, contre-vérification indépendante avant publication)
- **C-a · Formulaires et rafraîchissement**
  - C21 · PA Bras/Jambes perdues à la création (G-BASE-1) : les anciens champs « Bras »/« Jambes » restent visibles (`label { display:flex }` annule `hidden`) et sont ignorés à l'enregistrement.
  - C22 · Événements : jauge créée absente du choix de conséquence, compteur et liste figés jusqu'à réouverture (G-BASE-5).
  - C23 · Corruption : boutons Calculer / Absolution / Solde connu grisés jusqu'au repli d'une autre section (G-COR-2, 3, 4).
  - C24 · PJ passé en camp Neutre reste PJ après enregistrement (G-DEC-4).
  - C25 · Aperçu non marqué périmé après un changement de PV (critique d'excédent conservé).
  - C26 · Circonstances gardées au changement d'action (décision du 02/11, G-U1-3).
- **C-b · Combat**
  - C27 · Renfort en cours de Round : jet d'Initiative demandé et insertion à son rang (G-INI-4, G-DIV-18).
  - C28 · Tir dans la mêlée : appliquer la décision du 02/11 (autre combattant, touché d'office, déviation affichée) (G-ATT-5).
  - C29 · Empoignade : les deux Tests de Force saisis ne sont pas reconnus (G-EMP-2) ; option de prise absente tant qu'on n'a pas changé la nature du Test (G-EMP-1).
  - C30 · Entaille réclame un Élan disponible (G-ARM-7).
  - C31 · Maladresse au pistolet « ne tire pas » mais 7 dégâts proposés (G-ARM-6).
  - C32 · Dispersion 3 affiche « 0 cibles, 0 m » (G-ARM-4).
  - C33 · Arme non reliée : saisie manuelle au lieu du blocage (décision du 02/11 ; G-ARM-3, 5, 7, G-ATT-4, 5).
- **C-c · Magie et divin**
  - C34 · Larmes de Shallya : la Blessure Critique choisie n'est jamais prise en compte, Appliquer reste désactivé (G-DIV-13).
  - C35 · Champs manquants : interruption de Focalisation (perte 1d10, incident) et d10 de l'offrande Grande Gueule (G-MAG-2, 3).
  - C36 · Affichage : « score undefined » dans l'aperçu de prière (C17), « Conserver 60 » à −1 DR au lieu de −6 (G-DIV-14), motifs en double (G-DIV-3).
  - C37 · À reproduire d'abord : N'écoutez point la Sorcière sans malus −2 (G-DIV-8), Malice de Ranald sans égalisation (G-DIV-9).
- **C-d · Bestiaire et convalescence**
  - C38 · Attaques naturelles importées sans score (Bite/Claws du Jaguar, G-DEC-3).
  - C39 · Convalescence liée au temps de campagne (décision du 02/11, G-CRI-6).
  - C41 · Peur/Terreur et Création de familier inaccessibles : les rebrancher dans l'Espace de séance (carte ou Actions du Tour).
  - C40 · Dévotion de la Guerrière : spécialisation (Humain) absente de la fiche (G-DIV-15) ; Aigle spectral proposé au banc avec « Faire entrer » alors que c'est un capteur hors de l'ordre (G-DIV-17).

**État au 02/11 soir** : C21 à C46 corrigés sur `codex/recette-g-lot4` (5e7c3a2), sauf Malice de Ranald (non reproduit). Contre-vérification indépendante faite ; ses findings corrigés (camp des PJ de la réserve, raté d'arme sans déviation, pièce frappée effacée au changement de cible, refus du temps de campagne expliqué). Suite unitaire verte (seul E0, lié à l'environnement), 131/133 parcours navigateur (les 2 « release » connus). Précise (V4) se lit désormais comme Pointue V5 (+1 DR sur réussite, livre p. 305) : à confirmer par le MJ.

Publication : 3.35.0 sur feu vert du MJ, après la suite complète et la contre-vérification.

### Rejeu 3.35.0 des parcours corrigés (02/11, Claude, Playwright par l'interface)

20 parcours rejoués (G-BASE-1, 5 ; G-INI-4 ; G-DIV-8, 13, 18 ; G-COR-2, 3, 4 ; G-ATT-1, 5 ; G-ARM-3 à 7 ; G-EMP-1, 2 ; G-MAG-2, 3) : corrections C21 à C37 confirmées. Scripts et captures dans le scratchpad de la session (recette-A, B, C). Non joués : perte de personnage au Chaos (G-COR-3), invocation magique ou divine en cours de Round (G-DIV-18), pause sous Exténué (G-MAG-3).

Anomalies relevées, vérifiées dans le code :
- C47 · À répétition sur une arme non liée : la case « tir double » n'apparaît pas (`resolution-panel.js` ne lit que `rangedWeapon.keywords`, pas `action.qualities`) (G-ARM-3).
- C48 · Toute condition d'arme est libellée « Assommante : N état Sonné » (filet → Enchevêtré, Entaille → Hémorragique) (`resolution-panel/result.js:125`, `resolution/describe.js:94`) (G-ARM-7).
- C49 · Explosion : le champ attend des identifiants internes jamais affichés ; les noms sont refusés. À remplacer par des cases à cocher sur les participants actifs (G-ARM-4).
- C50 · Recharge d'une arme jamais tirée : « Rechargement non enregistré » sans la raison (`weapon-not-fired`) ; le tir bloqué en recharge dit « À répétition » pour une arme à simple Recharge ; compteur « 0 tir(s) restant(s) » après recharge (G-ARM-5).
- C51 · Larmes de Shallya : la ligne de journal ne nomme pas les États retirés avec le critique (G-DIV-13).
- C52 · Brise-os, offrande 10 : le soin du lanceur (NI Blessures) s'applique sans être annoncé dans l'aperçu (G-MAG-2).
- Mineurs : carte « Inverser en 92 » affichée « Touché » alors que l'inversion fait rater (G-ATT-5) ; brouillon vidé entre les deux tirs du tir double ; familles de mutations hors L06 sans nom de livre (« · p.66 ») ; message « choix MJ ou délai secret requis » sans nommer le champ (G-COR-2) ; condition PV listant « Événement : … » parmi les participants (G-BASE-5).
- Fiches de recette périmées (à corriger par le MJ) : G-INI-4 et G-DIV-18 parlent d'Initiative 35/60 (V5 : bonus + d10) ; G-INI-4 « Modifier → Zone Actif » sur un combattant en attente n'existe pas en Jouer (seulement « Faire entrer ») ; G-ARM-5 « capacité / Enregistrer l'arbitrage » ne concerne que les armes À répétition variable.
- Cas non joués, joués ensuite : pause sous Exténué OK (Œil de la tempête n'agit qu'après « Résoudre la méditation », fiches G-MAG-3 et G-DEC-2 précisées) ; C53 · boutons de perte au Chaos et de mutation manuelle figés malgré le motif saisi (G-COR-3) ; C54 · invoqués en cours de Round sans jet d'Initiative, insérés après le lanceur (G-DIV-18) ; C55 · aperçu de pause toujours « DR +0 ».
- **État au 02/11 nuit** : C47 à C55 et les mineurs corrigés sur `codex/recette-g-lot5` (ce90d56), test de reproduction pour chacun ; invoqués : d10 tiré automatiquement (pas de saisie, contrairement au renfort), camp du lanceur déjà correct (non reproduit). Contre-vérification faite, ses findings corrigés (invoqué revenant du banc, Modifier un événement « après un événement résolu », décocher le tir double, pluriel). Suite 5 609/5 609, recette divine verte, 138/139 parcours (le « release » connu). Fiches de recette G-INI-4, G-DIV-18, G-ARM-5, G-MAG-3, G-DEC-2 mises à jour avec l'accord du MJ.
- Non retenu : Immobiliser stocke un Enchevêtré par entrée ([1, 3]) mais les niveaux s'additionnent (`v5-grappling.js:14`), conforme.

### Lot 6 · recette des 49 parcours partiels (03/11, branche codex/recette-g-lot6, f0edf51, non publié)

Rejouée en 3.36.0 par quatre agents Sonnet (rapports dans le scratchpad `partiels/{A,B,C,D}/RAPPORT.md`) : 49 parcours, 12 anomalies, toutes corrigées avec un test sauf mention.
- G-U1-1 · la ligne « Confirmer la règle autorisant cette défense contre un tir » mène à sa case.
- G-U1-2 · « Lancer tous les dés des PNJ » remplit le dé secondaire d'un incident (1d10, 2d10 ou 1d100) ; la liste « À saisir » le nomme.
- G-DES-2 · la ligne de coût nomme le payeur (« X paie 1 Chance ») ; plus de « 1 fortune » ni de « 1 fate ».
- G-DIV-2 · Souffle protège jusqu'au dernier passage de Round (effets de sort de fin de Round avant l'expiration divine).
- G-DIV-5 · le reçu de critique d'un sort (+20 Morsure du Loup) s'affiche. G-DIV-11 et méditation : le vrai motif de refus s'affiche.
- G-BES-4/5 · Régénération, têtes, palanquin du Slann, Nuée et Venin sont sur la fiche active de l'Espace de séance.
- G-DEC-7 · deux notes de talents passent de yards à mètres. G-DEC-8 · aide de la pénitence corrigée.
- Mineurs : Élan dépensé affiché « oui → », libellés d'Initiative lisibles, plus de « null → » de localisation, « chirurgie requise » seulement si le critique l'exige, un seul 1d10 de maladresse en Guérison, prières actives restant ouvertes après « Terminer », appel mort `openClosureView` retiré.
- G-BES-6 · le profil de recette « Maître de familier » passe en PJ (le familier se paie en Destin ou Résilience, ressources de PJ).
- Fiches mises à jour : G-BASE-8, G-ATT-6, G-BES-3, G-MON-1, G-MON-2, G-CRI-5, G-CRI-6.
- **Arbitrages du MJ (03/11)** : G-DIV-12 reporté au chantier des engagements de mêlée (fiche ajustée : le MJ applique le désengagement) ; G-CRI-2 : un appendice sans table propre demande `PA de l’appendice atteint`, bloquant tant qu'il est vide (f0edf51, 002c4f8) ; G-DES-1 : le dialogue Fortune dit que le solde ne passe d'une rencontre à l'autre qu'avec une fiche liée.
- Joués ensuite (03/11), tous OK : dissipation par un PNJ avec « Lancer tous les dés des PNJ » (G-U1-2) ; talent de compagnon du Chat suspendu hors de portée et rétabli à portée (G-BES-6) ; Hurlement du loup, Roi de la Nature et Yeux de chat créés et rattachés au prêtre, retirés par « Terminer » (G-DIV-17). Fiches G-DIV-17 et G-DIV-18 précisées (une invocation tire seule son Initiative).
- Tests : 5 608/5 610 unitaires (les 2 échecs E0/E2 tiennent au worktree sous `E:/…/tmp`), 139/141 parcours navigateur (2 parcours « release » dépendent de fichiers `tmp/` absents du worktree) ; contre-vérification Sonnet : aucun bug.

### Après la 3.37.0 · recette des fiches mises à jour et test de cumul (03/11, codex/recette-g-lot6, ac8cad0, non publié)

- 12 fiches rejouées par deux agents Sonnet : toutes OK sur le fond.
- G-MON-2 · une mort critique (immédiate ou différée) ou une mort subite confirmée désarçonne le cavalier tué et les cavaliers de la monture tuée (le cavalier restait en selle).
- G-DIV-12 · l'allié qui porte En Bon Ordre en voit le rappel sur sa fiche. G-DES-1 · le dialogue Fortune dit si le solde passe d'une rencontre à l'autre (selon la liaison). G-CRI-5 · parties amputées en français.
- Profils de recette : Deux armes porte Épée et Dague du catalogue ; Cavalier émérite reçoit Acrobaties équestres (seul ce talent dispense l'Esquive montée du Désavantage).
- Fiches précisées : G-ATT-6, G-CRI-6 (fournitures médicales), G-DIV-18 (Initiative + d10 affiché, Annuler renvoie au banc), G-DES-1.
- Test de cumul (étape 1 de docs/PROPOSITION_MOTEUR_EFFETS_UNIFIE.md, `tests/unit/moteur/cumul-effets.test.js`) : talent + prière + sort conformes au livre (p. 130, 217, 235) ; un écart, les clés de Test des sorts ignoraient Endurance = Résistance, corrigé. Pas de bug de cumul : l'étape 2 attend les suppléments.
- Restes mineurs corrigés (a64186b) : « Esquive montée » retiré des pénalités de l'attaquant ; clés de sort « … adverse » normalisées.
- Maquette B (plateau des mêlées) validée par le MJ le 03/11 pour le chantier des engagements ; planche D (circonstances par durée de vie) comme référence commune.
- G-DIV-9 Malice de Ranald, décision du MJ (03/11) : une action sans vraie Caractéristique (jet de profil ou manuel, attr « Custom ») prend CC par défaut en mêlée, sinon le MJ choisit la Caractéristique avant le calcul (443d9be). Cause trouvée par la contre-vérification : « Custom » passait pour une Caractéristique.

### Chantier engagements et circonstances (3.39.0, nuit du 03/11, codex/engagements)

Spec, plan et tâches : `docs/specs/engagements/`. Maquette B (plateau des mêlées) et planche D (circonstances par durée de vie) validées par le MJ.
- Engagements durables par paire (V5 p. 163) : créés par toute attaque de mêlée appliquée, expirés après un Round complet sans attaque, défaits au banc ou au retrait ; rangés sur les participants (persistance, scènes, Annuler).
- Plateau à la place de la piste : une zone par mêlée (rapport de forces), Libres, En attente ; menu « Déplacer… » et glisser-déposer pour le MJ ; positions durables (encerclé, position haute, à couvert).
- Barre d'actions du combattant actif, conséquence annoncée : Attaquer, Charger (forçable si engagé), Se désengager (Élan, Test opposé avec Désavantage en infériorité, encerclé interdit), Fuir (Élan aux engagés, Brisé), Tirer, Viser, Autres actions.
- Surnombre, tir engagé (Pistolet seulement si engagé, déviation) déduits du plateau, affichés « Déduit du plateau », forçables ou laissés au récit (journal). Nuée et fuite de Brisé pré-remplies.
- Circonstances : groupe « À régler maintenant » en tête du tiroir ; « Scène (toute la rencontre) » : éclairage, temps, terrain difficile, espace exigu.
- En Bon Ordre : désengagement sans Élan ni Test, pas d'Élan ni d'attaque gratuite à la fuite (interprétation à valider par le MJ).
- Fiches de recette G-ENG-1 à G-ENG-6. Limites : voir `docs/specs/engagements/tasks.md`.

## Hors périmètre pour l'instant

- **Seconde passe d'interface (MJ, 02/11) — engagements en mêlée** : qui est engagé avec qui doit se déclarer aujourd'hui action par action (surnombre, tir dans la mêlée, cible engagée), ce qui est fastidieux. À prévoir : un état d'engagement durable entre combattants, posé une fois et réutilisé par tous les calculs. Pas pour le lot 4.

- G-BASE-9, hors ligne et synchronisation : non testé, non prioritaire (MJ, 01/11).
