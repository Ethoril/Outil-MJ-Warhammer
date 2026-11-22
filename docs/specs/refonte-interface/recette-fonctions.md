# Recette des fonctions · refonte de l'interface (lot E8, 22/11/2026)

Spec CA16 : chaque fonction du relevé [fonctions-jouer.md](fonctions-jouer.md) (sections 1 à 10), plus Préparer, Campagne et Bibliothèque, reste accessible en **deux clics au plus** depuis l'écran concerné. Base vérifiée : `claude/refonte-e8` (945d04aa, E7a, E7b, F1, F2, F3 fusionnés), fenêtre 1440 × 800.

**Lecture.** *Clics* = clics pour atteindre le contrôle depuis l'écran Jouer (0 = déjà à l'écran) ; une confirmation ou une saisie demandée ensuite n'est pas comptée.
- **✔** = la fonction a été vue dans l'outil pendant ce lot. Source : **[P]** parcours de mesure (`refonte-ecran`, `refonte-preparer`, `refonte-campagne`, `refonte-bibliotheque`, tous verts) ; **[S]** sonde de recette (script navigateur jetable de ce lot, non versionné, qui ouvre menus, feuilles et panneaux et relit leurs commandes) ; **[C]** capture `captures/apres-*.jpg`.
- **non vérifiée** = je n'ai pas vu la fonction dans l'outil (cas conditionnel qui ne naît pas dans R20, ou geste non joué) ; l'emplacement donné est alors celui du code, à confirmer à la table.
- Aucun écart bloquant (fonction introuvable ou à plus de deux clics) n'a été relevé ; les constats sont en fin de fichier.

Repères de l'écran Jouer : **haut** = barre du haut (onglets, Round et tour, Jouer son tour maintenant, Tour suivant, compteur « à décider », Temps de campagne, Événements / Jauges, Rappels, Terminer le combat, ↶, ⋯) ; **frise** ; **acteur** (gauche) ; **centre** (mêlées, puis résolution) ; **À décider** et **cible** (droite) ; **bas** (barre d'actions, onglets Règles · Profils · Journal).

## 1. Barre du haut

| Fonction | Nouvel emplacement | Clics | État |
|---|---|---|---|
| Onglets Préparer / Jouer / Campagne / Bibliothèque (touches 1-4) | haut | 1 | ✔ [S][C] |
| Temps de campagne | haut ; fenêtre non modale (durée, unité, motif, Avancer le temps, Annuler) | 1 | ✔ [S] ; confirmation « matins » du Courroux non vérifiée |
| Événements / Jauges | haut ; grisé sans scène active (comme avant) | 1 | non vérifiée (ouverture : aucune scène active dans R20) |
| Rappels | haut ; grisé sans scène active | 1 | non vérifiée (ouverture) |
| Terminer le combat | haut | 1 | ✔ [P][S] ; toast « Annuler » vu [S] ; choix garder / archiver non vu (aucun suivi dans R20) |
| Pastille Carte connectée / déconnectée | haut (point + libellé hors Jouer) | 0 | ✔ [C] « Carte déconnectée » ; « Versions différentes » non vérifiée |
| « À poser (N) » | haut | 0 | non vérifiée (n'apparaît qu'avec la carte) |
| Pastille État Local / Distant | haut (point + « Enregistré sur cet appareil » hors Jouer) | 0 | ✔ [C] |
| ↶ Annuler (Ctrl+Z) | haut | 1 | ✔ [P][C] |
| ⋯ Menu | haut | 1 | ✔ [S] |
| Jeu (sélecteur multi-jeux) | ⋯ | 1 | non vérifiée : groupe masqué tant qu'un seul jeu est publié (voulu, `selecteur-jeu.js`) |
| Sauvegarder dans un fichier / Charger un fichier | ⋯ | 2 | ✔ [P] (chargement) ; toast « Annuler » vu [C] |
| Versions précédentes | ⋯ → feuille (Voir le contenu, Restaurer) | 2 | ✔ [S] |
| Importer du texte | ⋯ → feuille (Analyser le texte) | 2 | ✔ [S] |
| Mettre à jour les PJ | ⋯ → feuille | 2 | ✔ [S] (ouverture) ; synchro Firestore non vérifiée |
| Envoyer aux fiches | ⋯ → feuille (Se connecter avec Google) | 2 | ✔ [S] (ouverture) ; Relire, Imposer, Motif, Envoyer non vérifiées (compte Google requis) |
| Recommencer le combat | ⋯ | 2 | ✔ [S] (entrée vue) ; feuille d'initiative non rouverte |
| Rétablir (Ctrl+Maj+Z) | ⋯ | 2 | ✔ [S] |
| Thème (Système / clair / sombre) | ⋯ | 2 | ✔ [S] (entrée « Thème : Système ») |
| Connexion Google, Version, Réessayer la connexion | ⋯ | 2 | ✔ [S] (Connexion Google, Version) ; « Réessayer » non vérifiée (n'apparaît qu'en échec) |

## 2. Bandeau de combat (fondu dans la barre du haut)

| Fonction | Nouvel emplacement | Clics | État |
|---|---|---|---|
| Titre de la scène / « Combat en cours » | haut | 0 | non vérifiée |
| « Round N · au tour de X » / « Pas encore commencé » | haut | 0 | ✔ [C] « Round 1 · au tour de … » ; « Pas encore commencé » non lu (avant le round 1 le centre porte l'initiative [P]) |
| Frise d'initiative (portraits nom + PV, Élan, monture, marque de décision) | frise, toujours visible dans Jouer | 0 | ✔ [P][C] ; plafond « +N » au-delà de 20 non vérifié |
| Revenir au combat | haut, depuis un autre espace | 1 | ✔ [C] (capture Campagne) |
| Commencer le combat / Tour suivant (N) | haut | 1 | ✔ [P][C] ; fenêtre d'effets V5 de fin de tour non vérifiée |
| Restaurer les Bmax (Fléau des Démons) | haut | 1 | non vérifiée (cas conditionnel) |
| **Nouveau** : Jouer son tour maintenant, « agit hors de son tour » | frise (clic sur un portrait) → haut | 1-2 | ✔ [P][S][C] |

## 3. Plateau des mêlées (centre, cartouches)

| Fonction | Nouvel emplacement | Clics | État |
|---|---|---|---|
| Zones « Mêlée n » (ratio) et « Libres » ; engager / libérer par glisser-déposer | centre | 0 | ✔ [C] zones et ratio « 1 contre 1 » ; glisser-déposer non joué (l'engagement par « Déplacer… » l'est [P]) |
| Cartouche : sélection (clic = cible), ▶ tour, « cible », Élan, « posé », PV, barre, BE · PA | centre | 0-1 | ✔ [P][C][S] ; puces d'états du cartouche non vérifiées |
| « Engagé avec… », « Encerclé », « Position haute », « À couvert » | centre | 0 | ✔ ratio ; textes d'états non vérifiés |
| Menu « Déplacer… » (Engager avec, Libre, Encerclé, Position haute, À couvert) | cartouche | 2 | ✔ [P][S] (« Libre » n'apparaît qu'engagé : non vu) |
| Monture : monté / pied à terre, « Monter sur » | cartouche (« Monté · Cheval de selle ») et fiche | 1 | ✔ [S][P] |
| Retirer du combat (non-PJ à 0 PV) | fiche ⋯ → « Retirer du combat… » + confirmation | 2 | ✔ [P] (retrait, confirmation, Annuler) |
| Banc « En attente (N) » : Faire entrer, Retirer, rappels du participant | centre, sous les mêlées | 1 | ✔ [P][C] ; Retirer et rappels du banc non vérifiés |
| « Aucun combattant en jeu. » | centre | 0 | ✔ [S] |

## 4. Barre d'actions (bas)

| Fonction | Nouvel emplacement | Clics | État |
|---|---|---|---|
| Attaquer · ennemi engagé | bas | 1 | ✔ [C] |
| Se désengager | bas | 1 | ✔ [P][C] |
| Fuir | bas | 1 | ✔ [C] ; renvoi vers la fuite du Brisé non vu |
| Charger · cible (sans limite), « interdit : déjà engagé (p. 163) » + forçage | bas, cible choisie | 1 | ✔ [P][S][C] (cas interdit vu grisé [C]) |
| Tirer · cible | bas | 1 | ✔ [S] |
| Viser · cible | bas | 1 | ✔ [S] |
| Se déplacer | bas | 1 | ✔ [S][C] |
| Surmonter la Peur | bas | 1 | non vérifiée (aucune Peur dans R20) |
| Autres actions | bas | 1 | ✔ [S][C] |
| Éveil (tout grisé sauf Autres actions) | bas | 1 | non vérifiée (cas conditionnel) |
| 4b. Formulaire de désengagement (Passer outre, compétence, jets, questions de condition, Obstiné, détail, Appliquer / Fermer) | centre, remplace la résolution | 1 | ✔ [P] (formulaire ouvert, sans débordement) ; ses champs un à un non vérifiés |

## 5. Fiche de l'acteur (gauche, zone acteur) et de la cible (droite)

| Fonction | Nouvel emplacement | Clics | État |
|---|---|---|---|
| Nom ; Renommer | fiche, ⋯ → Renommer (grisé pour un PJ) | 2 | ✔ [S] (entrée) ; renommage non joué |
| Sans monture / Monture présente | fiche, sélecteur « Monture » ; ⋯ du cartouche | 1 | ✔ [P][C] |
| Retirer de la rencontre | fiche ⋯ | 2 | ✔ [P][S] |
| Rappels du participant (Fait / Ignorer) | fiche, pastille « Rappels N » ; feuille « fiche complète » | 1 | ✔ [C][S] |
| PV −, quantité, + ; barre PV | fiche | 0 | ✔ [P][C] ; « Source du soin » (homoncule) non vérifiée |
| Caractéristiques CC, CT, F·BF, E·BE, I, Ag ; PA par zone | fiche | 0 | ✔ [C][S] |
| États : puces, × ; + état (formulaire) | fiche | 1 | ✔ [P] (formulaire, état ajouté) ; Récupérer non vérifiée |
| Armure portée (case par pièce) | fiche (bloc « Armure portée ») | ? | non vérifiée : bloc non vu dans R20 (`workspace-view.js:1161`) |
| Sorts et prières (liste, sélecteur de catalogue) | fiche ⋯ → « Sorts et prières » | 2 | ✔ [S] (panneau « tout le catalogue ») |
| Blessures Critiques : liste + Guérir | fiche, pastille « Blessures Critiques » | 1 | ✔ [C] (pastille) ; Guérir non joué |
| Élan : oui / non | fiche | 0 | ✔ [C] |
| Chance, Destin : soldes et fenêtres | fiche (PJ) | 1 | ✔ [P] (fenêtres non modales) |
| Assaut féroce (1 Élan) | fiche | 0 | non vérifiée (cas conditionnel) |
| Monture : sélecteur dans la fiche | fiche | 0 | ✔ [C] |
| Blocs de Traits de créature (Psychologie, Familier, Régénération, Têtes, Slann, États de créature, Traits calculés) | fiche, pastille « Traits de créature » ; fiche complète | 1-2 | non vérifiée (pastille attendue d'après `workspace-view.js:1576`, non vue sur les profils de R20) |
| Puces d'équipement (Pavois, Plate de léviathan, Rechargement, Projectiles fichés) | fiche, pastille « Équipement en jeu » | 1 | non vérifiée |
| Détails de fiche (compétences, talents, magie) | fiche ⋯ → « Fiche complète » | 2 | ✔ [P][S][C] (panneau dans la fenêtre) |
| Modifier (Nom, PV, Initiative, Zone, Camp, Monture, États, Actions préparées, Retirer, Enregistrer) | fiche ⋯ → « Modifier… » | 2 | ✔ [S] (tous les champs lus) ; enregistrement non joué |
| Changer de camp | fiche ⋯ | 2 | ✔ [S] (entrée) |
| Projectiles fichés des absents du duel | centre (sous le duel) | ? | non vérifiée |

## 6. Panneau de résolution (centre) : 1 · Action et cible, 2 · Jets, 3 · Résultat, pied

| Fonction | Nouvel emplacement | Clics | État |
|---|---|---|---|
| Puces d'actions ; « Aucune action préparée… » | résolution, étape 1 | 0 | ✔ [P][C][S] |
| Test… (Attaque, Test, Compétence, Défense, Opposition) | résolution, étape 1 | 1 | ✔ [S] (menu « Type d'action ») |
| Sort, prière, Corruption… (Focalisation V5, Incantation V5, Dissipation, Prière, Corruption) | résolution, étape 1 | 2 | ✔ [S] (les cinq entrées) ; panneaux Incantation [S] et Prière [P] ouverts dans le centre |
| Cible : Adversaires, Alliés, Soi-même, Aucune cible | résolution ; clic sur un cartouche | 0-1 | ✔ [P][C] |
| Croche-pied | résolution (action) | 1 | non vérifiée |
| Action défensive (compétence, Déclarer) | résolution | 1 | ✔ [S] (champ et bouton vus) |
| Déclarer la Charge / Ignorer | résolution, après Charger | 1 | ✔ [P] (étape « charger ») |
| Détonation ; Allumer la mèche ; Assaut féroce (quitter) ; nouvelle séance | résolution | 1-2 | non vérifiée (cas conditionnels) |
| Jet d'attaque (d100 + Lancer ; Entrée = Calculer) | résolution, étape 2 | 0 | ✔ [P][C] |
| Jet de défense (valeur, sélecteur, Lancer) | résolution, étape 2 | 0 | ✔ [C] |
| Lancer tous les dés des PNJ ; Calculer ; Comparer les cibles ; Effacer | résolution, pied | 0 | ✔ [C] |
| Jets de critique (Localisation, Gravité, Frappe blessante) | résolution, étape 2 | 0 | ✔ [P] (étape « dégâts avec critique ») |
| Jets de magie, dés de Maladresse d'incantation | résolution (magie) | 1-2 | ✔ [P] (étape « sort ») ; dés « À saisir » non vus |
| Circonstances de cette action (puces déduites + panneau « autres… ») | résolution, bouton « autres… » | 1 | ✔ [P][S] (panneau dans la fenêtre) |
| Ligne « Distance » (tir) | résolution, étape 1 | 0 | ✔ [P][C] (étape « tir ») |
| Résultat : pastilles, Maladresse, détail des calculs, Demandes de Traits | résolution, étape 3 | 0 | ✔ [P] (attaque, critique) ; Maladresse, poudre, filet non vus |
| Pied : Appliquer N dégâts, Appliquer le critique, focalisation / dissipation / sort, Effacer, raisons de blocage | résolution, pied collant | 0 | ✔ [P][C] (dégâts, critique) ; focalisation et dissipation non appliquées |

## 7. Circonstances (désormais panneau « autres… » de la résolution, plus d'onglet)

| Fonction | Nouvel emplacement | Clics | État |
|---|---|---|---|
| Titre « Circonstances de cette action » + Fermer | résolution → « autres… » | 1 | ✔ [P][S] |
| Scène (éclairage, temps, terrain difficile, espace exigu) | « autres… », réglages détaillés | 2 | ✔ [S] |
| Combat (Surnombre, bandes de portée, tir, couvert, tireur déplacé…) | ligne Distance + puces + « autres… » | 0-2 | ✔ [P] (tir) ; Surnombre ✔ [S] ; Tir extraordinaire, Dispersion, Main secondaire non vus |
| Défense (Nature, États mixtes, bouclier, recul, Calme, Protection) | « autres… » | 2 | ✔ [S] (Nature du Test, États mixtes) ; le reste non vérifié |
| Arme et munition ; Test V5 ; Cibles et localisation ; Talents ; Filet / empoignade / chutes ; Résolutions spéciales | « autres… » (selon l'action) | 2 | non vérifiée champ par champ (~150 contrôles conditionnels) ; mêmes appels qu'en 3.56.0 par la suite unitaire |
| Magie (Focalisation, Incantation, Dissipation, Méditation, Runes, Familier, Harmonisation, Surpuissance) | panneau de magie du centre | 2 | ✔ [S] (Incantation : Sort à lancer, Effet critique, Surpuissance, Cibles multiples, grimoire, Choix du d100, Familier, Réaction de dissipation) ; autres panneaux non vérifiés |
| Traits optionnels | « autres… » / fiche | 2 | non vérifiée |

## 8. Panneaux secondaires (sous le duel en 3.56.0)

| Fonction | Nouvel emplacement | Clics | État |
|---|---|---|---|
| Prières divines (Péchés, Commandements, prières actives, Test de Prière, Courroux, Pénitences, Jugement dernier) | centre, résolution → Sort, prière, Corruption… → Prière | 2 | ✔ [P] (panneau « prière » sans débordement) ; sections Péchés, Courroux, Jugement dernier non vues |
| Corruption (exposition, seuil, mutation, perte, absolution, table) | centre, résolution → Sort, prière, Corruption… → Corruption | 2 | ✔ [S] (entrée) ; formulaires non vus |
| Suites de combat (séquelles, soins, convalescence, calendrier) | **Campagne**, détail du personnage (pli « Soins et décisions ») ; lien depuis le combat : onglet Campagne ou « Revenir au combat » | 1 | ✔ [P][C] (CA20) |
| Fuite de Brisé | centre (sous le duel) | 1 | non vérifiée (aucun Brisé dans R20) |
| Règles de table (Mort subite des figurants) | bas, onglet Règles | 1 | ✔ [S] |
| À traiter : rappels (Résoudre / Ignorer / Reporter), événements de scène | case « À décider » | 0 | ✔ [C] (« Fin du tour de … À traiter · Résoudre · Ignorer · Reporter ») ; événements de scène non vus |

## 9. Panneau latéral (désormais onglets du bas)

| Fonction | Nouvel emplacement | Clics | État |
|---|---|---|---|
| Replier / Déplier le panneau | bas, bouton à droite des onglets | 1 | ✔ [S][C] |
| Règles (tables, mots-clés, aides de jeu, Favori) | bas, onglet Règles | 1 | ✔ [S] |
| Profils (recherche, + Au combat, + Actif, Sans monture) | bas, onglet Profils | 1 | ✔ [S] (champ de recherche) ; boutons d'ajout non vus (réserve vide dans la sonde) |
| Circonstances | résolution → « autres… » (plus d'onglet, CA15a) | 1 | ✔ voir § 7 |
| Journal (filtres Type et Combattant, entrées) | bas, onglet Journal | 1 | ✔ [S] ; « Détails du jet » non vu |
| Effacer l'historique | bas, onglet Journal | 1 | non vérifiée (bouton non listé par la sonde) |

## 10. État vide

| Fonction | Nouvel emplacement | Clics | État |
|---|---|---|---|
| « Aucune rencontre en cours » + Préparer une rencontre | centre | 1 | ✔ [S] ; liste des rencontres préparées non vue (aucune dans la sonde) |

## A. Décisions attendues du MJ (case « À décider », droite)

Visibles dans la case, au premier plan, jamais bloquantes : 0 clic pour les voir, 1 pour trancher.

| Décision | État |
|---|---|
| 1 Mort subite (Mort, Inconscient, Plus tard, Pas un figurant) | ✔ [P][C] |
| 18-19 Événement de scène ; rappels de tour (Résoudre / Ignorer / Reporter) | ✔ [C] (rappel) ; événement de scène non vu |
| 15 Initiative au démarrage | ✔ [P] (centre, trois colonnes, Combat instinctif, égalités, camp surpris, monté) |
| 16 Retrait d'un participant ; 17 Fin de combat | ✔ [P][S] (confirmation de retrait ; fin de combat sans suivi) |
| 6 Fuite / désengagement | ✔ [P] (formulaire) |
| 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24, 25, 26 | non vérifiée dans l'outil (cas qui ne naissent pas dans R20) ; une situation par décision est couverte par `tests/unit/ui/combat-decisions.test.js` |

## B. Raccourcis clavier

| Raccourci | État |
|---|---|
| 1 / 2 / 3 / 4, N, Espace, D, Ctrl+Z / Ctrl+Maj+Z, Échap, Entrée dans un jet, flèches des onglets | couverts par `tests/unit/ui/raccourcis-clavier.test.mjs` (lancé dans la suite, vert) ; non rejoués au clavier dans l'outil pendant ce lot |

## C. Fenêtres

Pendant le combat, aucune fenêtre modale hors « Terminer le combat » (mesuré à chaque étape [P]) : Chance, Destin, Temps de campagne, effets V5 s'ouvrent sans bloquer l'écran. ✔ [P] pour Chance et Destin ; Temps de campagne ✔ [S].

## Préparer

| Fonction | Emplacement | Clics | État |
|---|---|---|---|
| Nouvelle rencontre (formulaire d'ajout) | Préparer, en-tête | 1 | ✔ [P] (fenêtre dans l'écran) |
| Rencontres : Lancer, Modifier, Supprimer | colonne gauche (défile dans sa case) | 1 | ✔ [P] (Lancer, Modifier une rencontre de 18 lignes) ; Supprimer vu [C] |
| Nouveau profil | en-tête | 1 | ✔ [P] (capture `nouveau-profil`) |
| Réserve de profils : Modifier, Dupliquer, Supprimer, Fiche | colonne de droite (défile dans sa case) | 1 | ✔ [P][C] |
| Préparer pendant un combat en cours | Préparer | 1 | ✔ [P] |
| Banc : Faire entrer, renforts | centre de Jouer | 1 | ✔ [P] (renfort et retrait pendant la saisie) |

## Campagne

| Fonction | Emplacement | Clics | État |
|---|---|---|---|
| Avancer le temps…, temps de jeu suivi | Campagne, en-tête | 1 | ✔ [P][C] ; fenêtre vue [S] |
| « À traiter » (puces cliquables) | Campagne, haut | 1 | ✔ [P][C] |
| Personnages : Tous / Avec suivi, liste (défile dans sa case) | gauche | 0 | ✔ [P][C] |
| Détail : Suivis, Soins et décisions (plis), Maladies suivies, Critiques à suivre, Séquelles, Entre-aventure, Aperçu des échéances, Confirmer l'avancement | droite, plis repliables | 1-2 | ✔ [P][S][C] |
| Absent : arbitrage des séquelles et maladies | détail d'un absent | 2 | ✔ [P] (étapes « Absent ») |
| Opérations d'ensemble (groupe, calendrier, pertes) | pied de Campagne, pli | 1 | ✔ [P] (étape 09) |
| Thème sombre, 1920 × 1080 | — | — | ✔ [P] |

## Bibliothèque

| Fonction | Emplacement | Clics | État |
|---|---|---|---|
| Profils : liste, recherche, Afficher la fiche, Modifier, Dupliquer, Supprimer, Favori | gauche + fiche à droite | 1 | ✔ [P][C] |
| Règles et mots-clés (lecture, recherche, blocs) | onglet | 1 | ✔ [P] |
| Favoris | onglet | 1 | ✔ [P] |
| Bibliothèque de bestiaire (racine, recherche à plat, fiche dépliée) | pli en pied | 1 | ✔ [P] |

## Constats (non corrigés : lot de recette)

1. **`accessibilite-browser` rouge** (`tests/accessibilite-browser.mjs:206`) : il attend les fenêtres « Temps de campagne » (Jouer) et « Avancer le temps » (Campagne) **modales** ; E7b les a rendues non modales (CA10). Test à mettre à jour (attente de structure, pas de règle de jeu).
2. **`fiches-pj-browser` rouge** (`tests/fiches-pj-browser.mjs:146`) : le test cherche `.fiche-consultation > summary` dans la carte « Caelel » de la Bibliothèque ; F3 affiche la fiche déjà dépliée (`summary` masqué). Sélecteur à réparer.
3. **Barre du haut tronquée** : avec « Jouer son tour maintenant » ou « 1 à décider », « Round 1 · au tour de … » est coupé (« Rou… », « au tour de Ungra… ») à 1440 px ; en Campagne, « Pas encore commencé » devient « Pas enco… ». Cosmétique, à juger à la table.
4. **Fonctions non rejouées** : voir les lignes « non vérifiée » ci-dessus ; aucune n'a été trouvée absente, mais celles qui dépendent d'une situation rare (Brisé, Peur, Éveil, Courroux, filet, Détonation…) n'ont pas été jouées dans l'outil.
