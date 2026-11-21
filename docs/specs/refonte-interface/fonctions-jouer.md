# Fonctions de l'espace « Jouer » (état au commit 1e88f91b, v3.56.0)

Convention : libellé — effet — fichier:ligne (relatifs au dépôt ; WV = js/ui/workspace-view.js, RP = js/ui/resolution-panel.js, RPd = js/ui/resolution-panel/).
Limites : les ~150 champs conditionnels du panneau de résolution sont listés par famille, pas un par un (inventaire complet : grep "node('label', 'workspace-type'" dans RP). Lignes approximatives (±3) pour WV 2600-2910.
Ancien onglet #panel-combat (index.html:172-245 : Démarrer, Tour suivant, Lancer d100, Effacer les jets, Terminer, journal, import/export Réserve) : présent dans le HTML mais les 4 onglets pointent sur #panel-workspace ; non inventorié en détail.

## 1. Barre du haut (index.html:36-98, js/main.js:1790-1881)
- Onglets Préparer / Jouer / Campagne / Bibliothèque (touches 1-4) — changent d'espace — index.html:40-43
- Temps de campagne — ouvre le dialog d'avance du temps (durée, confirmation « matins » du Courroux) — index.html:47, main.js:1792, js/ui/v5-campaign-time-dialog.js:119
- Événements / Jauges — feuille « Événements structurés » (conséquences, jauges, intentions) ; désactivé hors combat — index.html:48, main.js:1300, :994
- Rappels — feuille « Rappels de séance » (Résoudre / Ignorer / Reporter) ; désactivé hors combat — index.html:49, main.js:1199, :994
- Terminer le combat — (visible si combat ou participants) dialog garder/archiver les suivis, retire tous les combattants, Round à 0, toast « Annuler » — index.html:50, main.js:1881, :996, encounter-end-dialog.js:20
- Pastille « Carte connectée / déconnectée / Versions de liaison différentes » — liaison RPG Map Display — index.html:52, js/ui/map-link-indicator.js:3-5
- « À poser (N) » — pions de la carte à placer — index.html:53, js/ui/map-link-feedback.js
- Pastille État Local/Distant — index.html:54
- ↶ Annuler (Ctrl+Z) — annule la dernière action du Store — index.html:55, keyboard.js:21
- ⋯ Menu (popover non modal) — index.html:56-98 :
  - Jeu (sélecteur multi-jeux) — index.html:60, js/ui/selecteur-jeu.js
  - Sauvegarder dans un fichier / Charger un fichier (toast « Annuler » après chargement) — main.js:1800-1801
  - Versions précédentes — feuille de restauration — main.js:1136
  - Importer du texte — feuille — main.js:1062
  - Mettre à jour les PJ — feuille de synchro des fiches Firestore — main.js:1082, js/ui/fiche-sync-view.js
  - Envoyer aux fiches — feuille d'écriture (Relire la fiche, Garder la fiche, Imposer l'outil / l'ancienne valeur, Motif, Envoyer, Annuler le dernier envoi, Se connecter avec Google) — main.js:1121, js/ui/fiche-writeback-view.js:234-339
  - Recommencer le combat — rouvre la fenêtre d'initiative « Recommencer », toast « Annuler » — index.html:73, main.js:858
  - Rétablir (Ctrl+Maj+Z) — index.html:77
  - Thème (Système/clair/sombre) — index.html:81
  - Connexion Google, infos compte, Réessayer la connexion, Version 3.56.0 — index.html:85-96
- Bannière de combat : voir § 2.
- 17 fonctions

## 2. Bandeau de combat (js/ui/combat-banner.js)
- Titre = titre de la scène active ou « Combat en cours » — :88
- « Round N · tour de <nom> » / « Pas encore commencé » — :92-98
- Frise d'initiative en pastilles nom + PV (hors onglet Jouer seulement, plafonnée, « +N ») — :55-68, :105-120
- Revenir au combat — retour à l'onglet Jouer (hors Jouer) — :30
- Commencer le combat / Tour suivant (N) — démarre (ouvre la feuille d'initiative si non résolue) ou avance ; ouvre le dialog « effets V5 » si une saisie est requise — :32, :126-130, main.js:355-364
- Restaurer les Bmax (Fléau des Démons) + texte « Bmax divisées… » — :40-49, :135-138
- 6 fonctions

## 3. Plateau des mêlées (colonne gauche « Piste des tours », WV:594-760)
- Zones « Mêlée n » (ratio « 2 contre 1 ») et « Libres » ; dépôt par glisser-déposer = engager / libérer — WV:594-615, plateau.js:33-35, WV:dropOnZone ~585
- Jeton (bouton) : sélectionne l'acteur (aria-pressed), ▶ tour courant, badge « cible », « Élan », « posé » (pion sur carte), PV, barre PV (perte en attente), BE · PA, puces d'états — WV:630-665
- Textes « Engagé avec : … », « Encerclé », « Position haute », « À couvert » — WV:670-675
- Menu « Déplacer… » par jeton : Engager avec <ennemi> / Libre (désengager sans règle) / Encerclé ↔ N'est plus encerclé / Position haute ↔ Quitte la position haute / À couvert ↔ N'est plus à couvert — WV:676-692 (moveCommand ~570)
- Monture : bouton monté/pied à terre, ou liste « Monter sur <monture> » — WV:553-593
- Retirer du combat (non-PJ à 0 PV) — dialog de confirmation — WV:961-973, encounter-end-dialog.js:68
- Banc « En attente (N) » : Faire entrer (sauf capteur), Retirer du combat, rappels du participant (Fait / Ignorer) — WV:699-715, :760
- « Aucun combattant en jeu. » — WV:600
- 8 fonctions

## 4. Barre « <acteur> · ce qu'il peut faire d'ici » (plateau.js:43-125, WV:718-757)
Affichée seulement combat commencé et acteur en jeu ; chaque bouton = libellé + conséquence.
- Attaquer · <ennemi engagé> (surnombre/encerclement résumés) — plateau.js:56
- Se désengager — ouvre le formulaire 4b ; « impossible » si Éveil — :63
- Fuir — Store.applyFlee ; si Brisé : toast vers le panneau de fuite de Brisé — :68, WV:735-741
- Charger · <ennemi libre> (max 4) / Charger interdit (déjà engagé, clic = forcer) — :72-75
- Tirer · <cible> — présélectionne cible + action de tir — :82
- Viser · <cible> — déclare la Visée (toast) — :92, main.js:1755
- Se déplacer — note le déplacement du Tour (−1 DR au tir, annule la Visée) ; grisé si déjà noté — :96
- Surmonter la Peur — Test de Calme étendu (DR cumulés par Peur) — :103
- Autres actions — amène au panneau de résolution complet — :106
- Pendant l'Éveil (Chant vivifiant) tout est grisé sauf « Autres actions » — :108
### 4b. Formulaire de désengagement (plateau.js:128-228)
- Passer outre (décision du MJ) si encerclé — :145
- Compétence (Esquive / Acrobaties) ; jets d100 acteur et adversaires ; questions de condition (Pénalité en DR / Désavantage, Oui/Non) ; choix Obstiné avant le jet ; détail des modificateurs — :150-215
- Appliquer le désengagement / Fermer — :218
- 9 + 4 fonctions

## 5. Fiche de l'acteur (gauche) et de la cible (droite) — WV:974-1300, même gabarit
Rubrique « Cible » ou « Acteur » (libellé selon le rôle).
- Nom + ✎ Renommer (pour la rencontre, le pion suit, bestiaire inchangé) — WV:1006-1038
- Sans monture / Monture présente (PJ à monture déclarée) — WV:1047
- Retirer (de la rencontre, avec confirmation annulable) — WV:1060
- Rappels du participant (Fait / Ignorer) sur l'acteur — WV:760, :1075
- PV : −, quantité, + ; « Source du soin… » pour un homoncule — WV:1080-1115
- Barre PV avec perte prévisualisée — WV:1075
- Caractéristiques CC, CT, F·BF, E·BE, I, Ag — WV:1119
- États : puces avec × ; Récupérer (dialog « Récupérer X », méthode + Chance) ; + état (nom, niveau, phase d'expiration, Round, Tour de, source magique, Ajouter / Annuler) — WV:1139-1170, :882-960, v5-effect-dialog.js:36-56
- Armure portée (case par pièce, pour la rencontre) — WV:1184
- Sorts et prières (liste du PNJ, sélecteur de catalogue) — WV:1219, js/ui/magic-list-picker.js
- Blessures Critiques : liste + Guérir — WV:1235-1250
- Élan : oui/non — WV:1250
- Chance : solde, dialog Chance (corriger, renouvellement, saisie MJ) — WV:1259, main.js:778, v5-fortune-dialog.js
- Destin : solde, dialog Destin — WV:1267, main.js:783, v5-fate-dialog.js
- Assaut féroce : attaque supplémentaire (1 Élan) — WV:1274
- Monture : sélecteur dans la fiche — WV:773-780
- Blocs Traits de créature (WV:773-880) :
  - Psychologie : « Au contact ou à la vue » + boutons Peur/Terreur par cause — psychology-block.js:16-33
  - Familier : Création de familier, Retirer le lien, À portée (4 m) / Hors de portée, Mort du familier (Calme raté) — familiar-block.js:43-104
  - Régénération (début de Round) : cases Feu, Régénérer — regeneration-block.js:9-40
  - Têtes (Hydre) : « Tête n : état » — heads-block.js:19
  - Slann : À bord du palanquin / Au sol (−3), Contemplation — slann-block.js:12-39
  - États de créature : Nuée « Fin de Round : 1 Blessure aux engagés » ; Venin « Empoisonner » — creature-states-block.js:23-62
  - Traits calculés : Rencontre (Créature rencontrée) puis Effrayé, Animosité, Entrer en Frénésie, Cadavre frais ; Vampirique (Morsure, Soigner) ; Se cabrer ; marqueurs « Actions défensives seulement », « Tour perdu », Increvable n/6, Bond (cases), Corps intact — creature-states-block.js:89-218
- Puces d'équipement (details) : Pavois (direction, dépenser la 1re/2e Action de mise en place) WV:2347 ; Plate de léviathan (Encombrement, Enregistrer la référence métal) :2399 ; Rechargement (Capacité arbitrée, Commencer la recharge, Résultat du Test, DR, Enregistrer le Test) :2444 ; Projectiles fichés (chirurgie confirmée, Guérison, d100, Enregistrer le retrait) :2514 — WV:2582-2603
- Détails de fiche (details) — js/ui/fiche-details.js
- Modifier — feuille « Modifier <nom> » : Nom, PV, Initiative, Zone Actif/En attente, Camp, Combat monté + Monture active, Armes à choix durable, États, Actions préparées (Ajouter, Monter, Descendre, Trier par initiative), Retirer du combat, Enregistrer — WV:1289, main.js:1506
- Retirer du combat (non-PJ à 0 PV) — WV:961
- Projectiles fichés des absents du duel : carte séparée sous le duel — WV:2640
- ≈ 26 fonctions

## 6. Panneau de résolution (RP:293-3410) — 3 étapes + pied
Titre « Résolution » ; arrangeResolutionSteps (RP:3348) range en « 1 · Action et cible », « 2 · Jets », « 3 · Résultat », pied.
### 6.1 Action et cible
- Puces d'actions (nom, dégâts, qualités) ; « Aucune action préparée : ajoutez-en une avec Modifier » — RP:402-418
- Test… (affiche le menu Type : Attaque / Test / Compétence / Défense-esquive / Opposition) — ACTION_TYPES RP:220, bouton RP:427
- Sort, prière, Corruption… : Focalisation V5, Incantation V5, Dissipation persistante V5, Prière, Corruption (ouvrent les panneaux secondaires) — RP:434-455
- Cible : puces Adversaires / Alliés, Soi-même (sort), Aucune cible ; « Cible * » si requise — RP:460-490
- Croche-pied : attaque réussie appliquée, Athlétisme de la cible, Préparer le Croche-pied, Test de Calme de la cible — RP:500-550
- Action défensive : Compétence choisie, Déclarer l'Action défensive — RP:561-570
- Déclarer la Charge / Ignorer — RP:132-145
- Détonation : Cibles touchées, Dégâts confirmés, Préparer la résolution de la détonation — RP:377-394
- Allumer la mèche — Action distincte — RP:2932
- Quitter la préparation d'Assaut féroce — RP:1182
- Commencer une nouvelle séance — RP:2347
### 6.2 Jets
- Jet (« Attaque (CC 45) » etc.) : champ d100 + Lancer ; Entrée = Calculer ; aide « Dés lancés à la table… » — RPd/critical.js:6-45, RP:3075-3153
- Jet de défense (valeur de défense, sélecteur caractéristique / compétence / Autre) + Lancer — RP:3105-3125
- Lancer tous les dés des PNJ — RP:3143
- Jets de critique (Localisation, Gravité d100, deuxième gravité Inoffensive, Frappe blessante) — RPd/critical.js:105-129
- Jets de magie, dés de Maladresse d'incantation (dé secondaire « À saisir ») — RPd/magic.js:13-26, :626
- Calculer / Comparer les cibles (Choisir) / Effacer — RP:3156-3191, RPd/result.js:405-410
- Circonstances · N actives (ouvre l'onglet latéral) + résumé — RP:3373-3400
### 6.3 Résultat
- Pastilles Jet/Défense (réussite, DR), Maladresse de l'attaquant/défenseur, lignes Maladresse n, Incident de poudre/Salve, Sortie de filet — RPd/result.js:130-145
- Détail des calculs et règles (details) ; traitement des talents acquis — result.js:354, :382
- Demandes de Traits (Réussite/Échec + DR, Lancer d100) — result.js:30-60
- Pied : Appliquer / Appliquer N dégâts à <cible> / Appliquer le critique à <cible> / Appliquer la focalisation / la dissipation / le sort / Enregistrer la dissipation ; Effacer ; boutons-raisons de blocage qui sautent au champ manquant — RP:3189-3239, :3290-3314
- ≈ 27 fonctions (hors champs du tiroir)

## 7. Circonstances (onglet latéral, tiroir RP:302-330, monté par WV:3029-3067)
Titre « Circonstances » + Fermer ; « Ce qui est coché entre dans le calcul. » Groupes : À régler maintenant / Scène (toute la rencontre) / Combat / Défense de <cible> / Avantage et Chance / Talents / Létal / Autres réglages (details, ouvert par défaut en Attaque) — RP:314-325
- Scène : sélecteurs de scène (setScene) — RP:337-345
- Combat (RP:1898-2150) : Surnombre (mêlée), Circonstances de combat L06 p.166 (bandes Bout portant, Courte, Moyenne, Longue, Extrême en m), Premier tir du tir double, Cible à couvert ou À Terre, Tireur déplacé, Tir extraordinaire (description, difficulté), Arme de jet, Dispersion d10 par mètre, Distance confirmée, d100 du combattant touché (tir dans la mêlée), Main secondaire, Attaque précédente (autre arme)
- Défense (RP:1197-1260, 2570-2600) : Nature de la défense, Pénalité entre États mixtes, Porte-bouclier en défense, Recul en mètres, Test de Calme +0 DR, Bénédiction de Protection
- Arme et munition (RP:589-840) : Groupe d'arme, Spécialité de tir, Compétence utilisée, Augmentations, Score de compétence, Munition, Bouclier (attaché/bandoulière, tenu, bras non directeur), Pavois (planté, distance derrière, mêlée de face), PA retenus après arbitrage
- Test V5 (RP:841-1110) : Pénalité de Blessures Critiques, Familier assistant, Imprégné, Nature du Test, Attaque naturelle (Trait)
- Cibles et localisation (RP:1319-1360, 1578-1660) : Morphologie, Côté de patte, Appendice atteint, PA de l'appendice, Localisation du coup ciblé ; Dispersion : bande ; localisation d100 de chaque touché ; Explosion
- Talents (RP:1375-1540, 2232-2570) : Contexte des talents, Endurance à −1 DR, Jet secret du MJ, Poignée Grand Cerf, Maquiller en griffure, Objet de focalisation (Domaine, Rang), Assommer, Arme de la main non directrice, Piège-lame, Initiative choisie, Ennemi le plus proche, Fureur d'Ulric, Attaque rapide, Robuste, Désarmement, Calme Déterminé, Frénésie (compétence, Terminer la Frénésie), Garde royal, activation de talent
- Filet / empoignade / chutes (RP:1714-1780, 2633-2660, result.js:238-300) : Filet à crochets, Sortie d'entrave Empêtré, d100 opposé Force, Libération volontaire, Empoignade (déclarer, Effacer l'action enregistrée), Chute de cavalier (équipement, maintien en selle)
- Résolutions spéciales (RP:1808-1850, 2188-2230, 2696-3050) : Dépenser 1 Destin + d100 choisi, Localisation de la Blessure Critique, Auteur du tir à poudre noire, Issue létale (3 cases), Maladresse 10 (alliés désignés / aucun allié), Maladresse du défenseur d10, Incident de Salve (servants touchés), Trajectoire vérifiée, Poivrière, Servants (nombre, déplacé), Gros projectile, Résistance <nom> (+0 DR), Tourbillon
- Magie (RPd/magic.js:126-640, v5-magic-controls.js, v5-spell-options.js, v5-talent-*.js) : Focalisation V5 ; Incantation et Contrat de sort V5 (Sort à lancer, Choix d'effet, Effet critique, Force irrésistible, Vortex direction + Test FM, durée de base + unité, grimoire non mémorisé, Cibles multiples, PA à détruire, Objet magique porté/tiré, Membre gelé) ; Dissipation (sort persistant, distance, visibilité, Protection/Défiance magique, Conserver/Inverser, réaction adverse) ; Méditation (talent, minutes, Résoudre) ; Runes (Quitter le lieu, Consommer une rune, Rune visible) ; Familier assistant ; Harmonisation ; Surpuissance
- Traits optionnels — js/ui/optional-traits-panel.js
- ≈ 12 familles (~150 contrôles)

## 8. Panneaux secondaires (details sous le duel, WV:2690-2770)
- Prières divines · <acteur> (js/ui/v5-divine-panel.js:448-612) : Péchés (Enregistrer les Péchés, Exécuter l'événement de Péché), Commandements/présages, Prières actives (Terminer), Accès à la prière, États du Test de Prière (Soc), Extensions, Calculer / Appliquer la prière ; Récupération des États du Courroux (Préparer la récupération, Soigner la cause, Préparer l'Action de Prière imposée, Calculer/Appliquer la récupération, Absolution) ; Suppléments du Courroux (Réprouver, Confirmer la liste des alliés réprouvés, Sanctionner, scène/Round d'ancrage) ; Pénitences (Accomplir, Créer) ; Possessions confisquées ; Jugement dernier (Retour par un Point de Destin, Confirmer/Refuser le rejet) ; Enregistrer la Corruption connue — s'ouvre seul si un départ est enregistré
- Corruption (js/ui/v5-corruption-panel.js:130-413) : Exposition quotidienne à la malepierre, Démarrer / Ouvrir la séance suivante, Test de seuil (jet Résistance, score MJ, motif, d100 mutation, délai secret, Appliquer le résultat), Clore le Test devenu inutile, Mutation à confirmer (Confirmer / Refuser), Perte de personnage (Confirmer le personnage perdu au Chaos / Refuser la perte), Exposition immédiate (Calculer / Enregistrer), Exposition de fin de séance (sources, Influence corruptrice, Durée, Calculer / Enregistrer), Absolution (points, motif, Appliquer), Table de mutation (table, ligne, renvoi, Confirmer avec cette entrée), Marquer manifestée — s'ouvre si une décision est en attente (WV:2741)
- Suites de combat (js/ui/v5-aftermath-panel.js:155-738) : lien « Ouvrir dans l'espace Campagne (suivi et soins) → » ; Suivi des séquelles / Séquelles et convalescence ; Soigneur, Compétence, fournitures, Infection (Traiter), Opérer, Immobiliser la fracture, Retirer le bandage, Soigner la déchirure, Maladie à suivre, Cicatrices et pertes de caractéristique (Enregistrer), Déclarer le critique guéri, Archiver ce suivi ; fermé en combat, ouvert hors combat — WV:2753-2765
- Fuite de Brisé (js/ui/v5-broken-escape-panel.js:58-273, sous le duel WV:~2690) : Visibilité par rapport aux ennemis, compétence à tester, Athlétisme, résultat, Ennemis engagés, Attaques gratuites (Jouer / Passer), Fuite engagée, « Brisé · fuite obligatoire »
- Règles de table (details, WV:2659-2686) : case « Mort subite des figurants — désactivée par défaut »
- À traiter (WV:2897-2910, main.js:1229-1290) : rappels (Résoudre / Ignorer / Reporter), événements de scène (Voir la conséquence, Appliquer, Plus tard)
- 6 panneaux

## 9. Panneau latéral droit (js/ui/side-panel.js, WV:3002-3025) — rail repliable, onglets
- Replier / Déplier le panneau — side-panel.js:82
- Règles — tables de référence et mots-clés — main.js:1764
- Profils — recherche (« Rechercher un profil à ajouter »), « + Au combat », « + Actif », case « Sans monture (<monture>) » — WV:2915-2975
- Circonstances — voir § 7 (s'ouvre automatiquement une fois par résolution) — WV:3029-3067
- Journal — filtres Type (Gestion / Résolutions / …) et Combattant, entrées avec « Détails du jet », « Aucun événement correspondant » — journal-view.js:26-131, main.js:1766
- Effacer l'historique (ancien onglet, dialog de confirmation) — journal-view.js:150
- 6 fonctions

## 10. État vide (WV:2689-2700)
- « Aucune rencontre en cours » — Préparer une rencontre ; liste des rencontres préparées (encounterList WV:442) — WV:2689

---

## A. Décisions / demandes attendues du MJ
1. Mort subite : Choisir mort / inconscient + confirmer « PNJ secondaire » (option activée, figurant à 0 PV) — bannière haut du centre, WV:2617-2650
2. Mort par critique : Confirmer / Refuser la mort (+ « Confirmer : décapité » sur Crâne fracassé, corps intact) ; origines : décompte, table, État — section « Décisions du MJ — mort critique », WV:2776-2812
3. Choc d'amputation : occurrence À confirmer / Oui / Non, Test de Résistance, DR, Appliquer — « Chocs d'amputation », WV:2819-2895
4. Test de Corruption (seuil), mutation à confirmer/refuser, perte de personnage au Chaos, absolution, exposition — panneau Corruption (§ 8)
5. Brisé : visibilité, fuite engagée, attaques gratuites — panneau de fuite de Brisé (§ 8) ; toast si « Fuir » cliqué
6. Fuite / Désengagement : Passer outre (encerclé), Obstiné avant le jet, questions de condition — barre d'actions (§ 4b)
7. Maladresse (attaquant : alliés à portée, Maladresse 10 ; défenseur : d10 ; Incident de poudre/Salve : servants touchés ; trajectoire) — tiroir Circonstances (§ 7)
8. Déviation de tir / Dispersion : bande, d10 par mètre, distance confirmée, d100 de la personne touchée, localisation — tiroir Circonstances (§ 7)
9. Issue létale : activer l'option de table, intention létale, « Je confirme explicitement la mort » — RP:2188
10. Incident / Maladresse de magie : dés secondaires « À saisir », membre gelé, Effet critique d'incantation — magic.js:13-26, :156, :626
11. Jugement dernier / rejet de prière (Confirmer / Refuser le rejet), retour par Destin — panneau Prières (§ 8)
12. Péché (événement de Péché), Courroux (sanction, réprobation des alliés, récupération) — panneau Prières (§ 8)
13. Effets V5 de fin de tour ou d'action à saisir (résultats de table, Test + DR, d100, d10, cibles multiples) — dialog v5-effect-dialog.js:60-205, main.js:360, :766
14. Méthode de récupération d'un État (Chance éventuelle) — dialog v5-effect-dialog.js:36
15. Initiative au démarrage / recommencement : I, dés des PJ, Combat instinctif (Premier/Second), Camp surpris, Calculer, Confirmer — feuille main.js:395-475
16. Retrait d'un participant : garder le suivi ? retirer aussi la monture ? — dialog encounter-end-dialog.js:68-116
17. Fin de combat : garder ou archiver les suivis — dialog encounter-end-dialog.js:20-43
18. Événement de scène : « Condition remplie » → Appliquer / Plus tard ; Voir la conséquence — « À traiter », main.js:1259-1290
19. Rappels de tour : Résoudre / Ignorer / Reporter — « À traiter » + feuille Rappels
20. Suggestion d'engagement venue de la carte (« sont au contact : les engager ? ») — toast, map-link-feedback.js:31
21. Course sur la carte : « Action utilisée » (décompte seulement sur clic) — toast 15 s, main.js:1904-1911
22. Mort de familier (Calme raté), création/portée de familier — bloc Familier (§ 5)
23. Questions d'États sans réponse (Brisé, Enchevêtré, À terre, Aveuglé, Souillé) — panneau de questions, WV:2155
24. Arbitrages d'équipement : Capacité du chargeur, Groupe d'arme, PA retenus, Encombrement du métal, Direction du pavois — puces d'équipement (§ 5) et tiroir (§ 7)
25. Surmonter la Peur (Test de Calme étendu) — barre d'actions (§ 4)
26. Mort subite activée ou non (réglage) — Règles de table (§ 8)
→ 26 entrées (la 4 inclut test de seuil, mutation et perte de personnage).

## B. Raccourcis clavier (js/ui/keyboard.js, WV:3294)
- 1 / 2 / 3 / 4 — Préparer / Jouer / Campagne / Bibliothèque — keyboard.js:7-12, :75
- N — Tour suivant (ou Commencer le combat) si le bandeau est visible — :60-68
- Espace — idem, seulement focus sur body ou #workspace-root — :61
- D — va sur Jouer et met le focus sur le champ du jet d'attaque — :71-79
- Ctrl/⌘+Z — Annuler ; Ctrl/⌘+Maj+Z — Rétablir — :25-39
- Échap — ferme le menu ⋯, puis le dialog ouvert, masque les palettes de couleur — :43-54 ; ferme aussi le tiroir Circonstances (WV:3294-3305, RP:3380)
- Entrée dans un champ de jet — Calculer — critical.js:35
- Flèches / Début / Fin dans les onglets du panneau latéral — side-panel.js:141-147
- Aucun raccourci simple si le focus est dans un champ de saisie ; ignorés avec Ctrl/Alt/⌘

## C. dialog et feuilles
- Feuille générique openOverlay (dialog, show() non modal, bouton Fermer) — main.js:719 : Préparer une rencontre / Modifier <rencontre> (815), Nouveau profil (949), Importer des profils depuis du texte (1062), Mettre à jour les PJ (1082), Envoyer aux fiches (1121), Versions précédentes (1136), Rappels de séance (1199), Événements structurés (1300), Modifier <profil> (1473), Modifier <participant> (1506), initiative (395-416, parfois imbriquée)
- dialog modaux (showModal) : encounter-end-dialog.js:43 (confirmInTool), :77 (retrait de participant), :135 (fin de combat) ; v5-effect-dialog.js:59 (méthode de récupération) et :203 (effets V5) ; v5-fortune-dialog.js:49 ; v5-fate-dialog.js:20 ; v5-campaign-time-dialog.js:119 ; keyword-picker.js:40 ; #dlg-import index.html:317 (import réserve vers combat, main.js:1807)
- Confirmations via confirmInTool (pas de boîte native) : Appliquer les PV aux profils (main.js:1819), Supprimer ce personnage persistant (main.js:827), Effacer l'historique (journal-view.js:150)
- Popover non modal : menu ⋯ #app-menu (index.html:59, main.js:1007)
- Aside sans dialog : panneau latéral (side-panel.js:38), colonne piste (WV:3002), tiroir Circonstances (RP:302)
- Toasts à bouton d'action : Annuler (chargement, recommencer, terminer), Engager, Action utilisée — js/ui/toast.js

## D. Non trouvé / réserves
- Aucun menu contextuel de jeton (clic droit / popover) : seuls le select « Déplacer… » sous le jeton et le bouton de monture existent (WV:676-692).
- Aucun raccourci pour Fuir, Calculer, Appliquer.
- Ancien onglet Combat (index.html:172-245) non relié aux onglets actuels.
- Bibliothèque / Campagne / Préparer : hors périmètre.
