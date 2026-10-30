# Cahier de recette F2 — préparation pour contre-vérification

**Statut : prêt à être relu par Claude avant la recette du MJ.** Les dix scénarios rapides ont été joués ou tentés ; la sortie du filet est bloquée et plusieurs variantes restent ouvertes. Le parcours complet décrit les chemins préparés et leurs limites ; il n'atteste pas une validation exhaustive.

**Révisions et preuve.** Répétition initiale sur `738b553`. Plusieurs chemins ont ensuite été rejoués sur `3437efa90bb2e9e2df2d4fc11ac03680b60a81f6`, HEAD local de `gpt/phase-f2` à la reprise, dans notre worktree détaché `tmp/recette-f2-worktree`. Les observations non marquées « 3437efa » ci-dessous concernent `738b553` et ne prouvent pas la version actuelle. Aucun code modifié ; ni Firebase ni données réelles du MJ. T3 est présent dans cette révision, mais seules les rubriques demandées sont prévues ici.
## Installation et données de test

Servir le worktree local sur `127.0.0.1` avec `python -m http.server 8766 --bind 127.0.0.1` et ouvrir `http://127.0.0.1:8766/`. Dans **Menu**, vérifier « Invité » et « Mode invité — local uniquement ». Ne pas se connecter. Les sauvegardes fictives sont à côté de ce document : `fixture-actuelle.json` (catalogue actualisé pour 3437efa), `fixture-recette.json`, `fixture-sans-escrime.json`, `fixture-complement.json`, `fixture-complet.json`, `fixture-munitions.json`, `fixture-main-fendue.json`, `fixture-decompte.json`, `fixture-figurant.json`. Les anciennes fixtures utilisent le catalogue de 738b553 ; `fixture-actuelle.json` utilise celui de 3437efa. Les objets sont issus du snapshot correspondant ; les personnages, actions et caractéristiques sont fictifs. Charger par **Menu → Charger un fichier**, relire l’aperçu et confirmer. **Cela remplace la séance locale** : travailler sur une origine isolée et exclusivement avec des données de test. Les fixtures initialisent des préconditions directement ; elles ne vérifient pas la création d’une fiche réelle.

Dans l’édition V5 EN v2 consultée, l’appendice des critiques est aux pages physiques 365–368 ; certains renvois internes historiques indiquent 173–176. Les arbitrages MJ datés cités dans `CHOIX_EXECUTANT_PHASE_F2.md` et `CONTRE_VERIFICATION_CLAUDE_T2_BIS.md` priment sur le texte imprimé.

## Parcours rapide — dix thèmes

1. Surprise et historique (5 min). 2. Initiative (4 min). 3. Rapière et maîtrise (3 min). 4. À Terre (3 min). 5. Bouclier (4 min). 6. Recharge et filet (6 min). 7. Bolas (4 min). 8. Oops et poudre (4 min). 9. Empoignade (6 min). 10. Critiques (5 min).

**Estimation : 44 minutes hors préparation, non chronométrées.** L’objectif indicatif de 30 minutes n’est pas atteint. Les dix scénarios ont été joués ou tentés ; le scénario 6 est bloqué à la sortie du filet. Les observations et sous-cas non joués sont indiqués dans chaque scénario.

# T1 — initiative, compétences et circonstances

## 1. Surprise et dégâts — répétition partielle, environ 5 minutes hors préparation

**Préparation.** Application locale servie depuis le worktree détaché avec `python -m http.server 8766 --bind 127.0.0.1` ; adresse `http://127.0.0.1:8766/` ; menu indiquant « Invité » et « Mode invité — local uniquement ». Trois profils fictifs ont été importés par **Préparer → Nouveau profil → Créer depuis un JSON → Vérifier le JSON → Créer 3 profils**. Alfred : PJ, 12 PV, CC 50, CT 50, F 40, E 30, I 40, Ag 40, jet d'attaque manuel « Épée » 50, dégâts BF+4 ; Clara et Bruno : PNJ, 12 PV, CC 40, F 30, E 30, I 40, Ag 30. Aucun PA. Ces jets manuels ne remplacent pas une vérification de l'équipement réel du catalogue.

**Étapes observées.** Créer une rencontre, ajouter les trois profils en zone **Actif**, **Lancer la rencontre**. Dans l'écran Initiative, saisir d10 PJ 5 ; les d10 PNJ sont tirés automatiquement et affichés en lecture seule. Choisir le camp neutre comme camp surpris, **Calculer / actualiser l’ordre**, puis **Confirmer et appliquer**. Ouvrir **Jouer** : Bruno et Clara portent Surpris. Sélectionner Alfred, cibler Clara, choisir l'attaque Épée et **Corps à corps**, saisir 24 puis Entrée. Ouvrir **Détail des calculs et règles**, puis **Appliquer 10 dégâts à Clara**. Cliquer **Annuler**, puis menu **Rétablir**.

**Attendu et observation.** Jet 24 sous 50 : +3 DR de base, +2 DR contre Surpris, soit +5 ; BF 4 + arme 4 + 5 DR − BE 3 − PA 0 = 10 blessures. Clara passe de 12 à 2 PV ; Annuler la remet à 12, Rétablir à 2. Observé conforme pour ce chemin. Source : décision du MJ du 25/10, B-SOURCE-01, reprise dans `docs/plans-gpt/f2/PLAN_F2_LOTS.md` et les arbitrages.

**Variante de diagnostic tir.** En conservant la même action manuelle, choisir **Nature du Test → Tir**, saisir 24 puis Entrée et ouvrir le détail : +3 DR de base, +1 contre la cible surprise, soit +4 et 9 blessures proposées. Observé sur l'aperçu ; non appliqué. Ce n'est pas une recette d'arme à distance du catalogue et ne vérifie ni munition ni compétence de tir. Pour une recette MJ complète, refaire avec une arme de tir réelle et un profil préparé à cet effet.

**Rejeu 3437efa avec objet réel.** `fixture-actuelle.json`, Rapière, Garde Surpris, 24 : +6 DR, 11 blessures, 40 → 29 ; Annuler puis Rétablir rendent respectivement 40 puis 29. La variante tir avec arme réelle reste à rejouer sur cette révision.

**Limites de cette répétition.** La surprise a été vérifiée avant **Commencer le combat**, ainsi que l'historique ; la transition du Round 0 au Round 1, le rechargement de page, l'égalité à trois, les ajouts et les autres circonstances ne l'ont pas été. L'égalité n'a pas été obtenue par les valeurs saisies lors de cet essai.


## 2. Égalité à trois et ajout direct — T1-A — 4 min

**Préparation.** Trois PJ fictifs Iris, Jules et Klara, I 40, PV 12 ; Bruno PNJ, I 40. Créer une rencontre avec les trois PJ actifs. **Lancer la rencontre** et saisir 5 pour chacun des trois d10 ; **Calculer / actualiser l’ordre**.

**Étapes.** Pour l'égalité à trois, choisir successivement Klara, Iris et Jules dans les trois listes de position ; recalculer puis **Confirmer et appliquer**. Dans **Jouer → Profils**, cliquer **Ajouter Bruno actif au combat**. Le d10 PNJ est affiché automatiquement : il valait 5 lors de cet essai. Les quatre I valent 40 et les scores valent 9 ; choisir Klara, Bruno, Iris, Jules puis recalculer et confirmer. Si le PNJ obtient un autre d10, ajuster les d10 des trois PJ à cette valeur, tout en conservant I 40 pour tous, puis choisir l'ordre.

**Attendu.** L'outil demande au MJ l'ordre direct à trois ou plus ; la piste suit les choix. L'ajout actif avant Round 1 demande un jet et prend rang. Source : décisions MJ du 26/10 et 27/10, `CHOIX_EXECUTANT_PHASE_F2.md`, `CONTRE_VERIFICATION_CLAUDE_T1_TER.md`.

**Répétition : joué conforme pour ces étapes.** Piste Klara → Iris → Jules, puis Klara → Bruno → Iris → Jules. **Rejeu 3437efa :** trois PJ I 40, d10 5, ordre manuel Klara → Iris → Jules ; ajout actif du PJ Lise avant Round 1, d10 8 : Lise → Klara → Iris → Jules. Annuler retire Lise ; Rétablir la réinsère. Prière Roi de la Nature tentée avec dérogation MJ fictive, jet 10 et Loup : blocage normal car la fiche minimale ne possède pas Prière ; invocation et rechargement non vérifiés. Pour un PNJ, lire son d10 automatique et adapter ceux des PJ avant confirmation quand possible, ou fixer manuellement l’ordre proposé.

## 3. Rapière et spécialité — T1-C — 3 min

**Préparation.** Charger `fixture-recette.json` : Héros recette CC 50, Escrime 60 avec 10 augmentations, Base 69 avec 19 ; Rapière réelle, cible Garde recette 40 PV, CC 40 et BE 3. Dans **Jouer**, choisir **Rapière**, laisser **Compétence utilisée pour cette arme → Spécialité du groupe**.

**Étapes.** Saisir 24 à l'attaque et 70 à la défense, **Calculer**. Puis charger `fixture-sans-escrime.json`, qui ne contient pas Escrime, et refaire le même aperçu.

**Attendu.** La spécialité exacte prime sur Base même si son score est inférieur ; les qualités Empaleuse et Rapide de la Rapière sont conservées si elle est maîtrisée. Sans Escrime, le repli Base retire les Qualités. Source : décision MJ du 26/10, `CHOIX_EXECUTANT_PHASE_F2.md`.

**Répétition : joué conforme en aperçu.** Rejeu 3437efa : Rapière 24 contre 70, Escrime 60, +4 DR et 12 blessures proposées. Sur 738b553 : avec Escrime, reçu « spécialité entraînée (Corps à corps (Escrime)) », +4 DR, 12 blessures proposées ; sans Escrime, reçu « Escrime employée avec Base, sans Qualités », 12 blessures proposées. Aucun résultat appliqué. **Complément :** voir scénario 11 pour le tir non entraîné. Le choix explicite Base avec Escrime présente reste à jouer.

## 4. À Terre et terrain difficile — T1-B — 3 min

**Préparation.** Héros équipé d'une Épée réelle, Base 69, adversaire Enchevêtré, Force 40, E 30, 40 PV. Ajouter **À Terre** au Héros par **+ état → À Terre → Ajouter**.

**Étapes.** Dans **Circonstances des Tests**, choisir **Terrain difficile → Oui** ; saisir attaque 24 et défense 70, puis **Calculer → Détail des calculs et règles**.

**Attendu.** Désavantage impose l'inversion 24 → 42 ; le −1 DR d'attaquant À Terre et le −1 DR du terrain se cumulent. L'état Enchevêtré de la cible ajoute ici +1 DR à l'attaque et −1 DR à sa défense. Source : L06 p.166 et arbitrage MJ du 25/10, B-SOURCE-02.

**Répétition : joué conforme en aperçu.** Rejeu 3437efa avec Rapière 60 : 24 → 42, +0 DR et 8 blessures proposées. Sur 738b553 avec Épée : le reçu donne score 69, jet final 42, base +2 DR, modificateurs −1 (−1 À Terre −1 terrain +1 cible Enchevêtrée), soit +1 DR ; défense −4, net +5 et 10 blessures proposées. Pas d'application. **Complément :** voir scénarios 12 à 14.

## 5. Bouclier attaché et tir — F2-R/D — 4 min

**Préparation.** Charger `fixture-recette.json` : Bolas, Projectiles (Entraves) 60 ; Garde avec le Bouclier réel à 2 PA et Ag 40.

**Étapes.** Choisir Bolas ; **Coup ciblé → Oui → Jambe gauche**. Dans **Protection et bouclier pour cette attaque**, choisir **Bouclier**, cocher **Bouclier attaché au bras ou en bandoulière**, choisir bras non directeur gauche, puis Oui à disponibilité, défense opposée et attaquant visible. Le panneau se replie après chaque saisie : le rouvrir si nécessaire. Choisir Ag comme défense, attaque 31 et défense 20 ; **Calculer**.

**Attendu.** Une défense au tir par Esquive est admise avec 2 PA ; le bouclier apporte +1 DR en opposition. Source : L06 p.306 et décision MJ du 27/10.

**Répétition : joué conforme en aperçu.** Attaque +1 DR après coup ciblé ; défense +3 DR (base +2, bouclier +1) ; pas de touche. Les autres zones de protection et un bouclier à 1 PA n'ont pas été rejoués.

## 6. Recharge et filet — T2-D — 6 min

**Recharge, préparation et étapes.** Après l'incident du scénario 8, la Poivrière affichait 3 tirs restants ; **Commencer la recharge** affichait 0/3 succès. Choisir **Réussite**, saisir **2** dans **DR du Test de recharge — Poivrière**, puis **Enregistrer le Test**.

**Attendu / observé : joué conforme pour ce calcul.** Une réussite +2 compte 3 succès. Sur 738b553 elle terminait la recharge à 3 succès. Sur 3437efa après incident avec main occupée, recharge complète à 0/4, puis réussite +2 : 3/4 et 0 tir restant. Source : décision MJ du 27/10, `CHOIX_EXECUTANT_PHASE_F2.md`. L'interface demande le résultat et les DR, pas le d100 de recharge ; le MJ effectue le jet à la table.

**Filet, préparation et étapes.** Charger `fixture-recette.json`, sélectionner le Filet de mêlée, attaque 25, défense 70, **Calculer → Enregistrer sans dégâts** : Garde est Enchevêtré, 40 PV. **Tour suivant**, choisir Force, type **Test**, puis **Sortie d’entrave : état Empêtré → Enchevêtré · Force 50**. Saisir 75 pour le Test et 20 dans **Jet d100 opposé — Force 50**, puis **Calculer**.

**Attendu.** Opposition de Force contre Force 50 ; l'échec ne change pas le niveau d'Empêtré, décision MJ du 28/10, L06 p.186. **Répétition : impossible à terminer dans cet essai.** Bien que le champ ait affiché 20, le reçu demande encore le jet opposé et le bouton d'enregistrement reste désactivé. Rejoué sur 3437efa : l’aide dit désormais bien « En cas d’échec, rien ne change », mais le jet opposé 20 demeure réclamé après saisie et Tab ; enregistrement désactivé. Le texte contraire concernait 738b553 et est corrigé sur la révision actuelle. La procédure d'opposition gagnée reste à rejouer.

## 7. Bolas au corps puis aux jambes — T2-D — 4 min

**Préparation.** Charger la sauvegarde fictive ; Bolas réelles, CT et Projectiles (Entraves) 60, Garde 40 PV et BE 3. Pas de défense saisie, aucune autre circonstance.

**Étapes.** Choisir Bolas, **Coup ciblé → Oui → Corps**, saisir 31, **Calculer → Appliquer 2 dégâts**. Annuler pour revenir à 40 PV ; refaire avec **Jambe gauche** et les mêmes dés.

**Attendu.** Au corps, aucun Empêtré ni À Terre ; aux jambes, les deux états sont appliqués. Source : L06 p.303 et décision MJ du 27/10.

**Répétition : joué conforme pour les deux localisations sur 738b553.** Rejeu 3437efa aux jambes : 31, +1 DR, 40 → 38, Enchevêtré et À Terre enregistrés. Sur 738b553, les deux attaques affichent +1 DR et 2 blessures ; après application, le corps laisse 38 PV sans ces états ; la jambe laisse 38 PV avec Enchevêtré et À Terre. Les autres qualités et localisations n'ont pas été parcourues ici.

## 8. Oops et poudre — T2-E — 4 min

**Oops.** Dans la rencontre de test, Épée, attaque 77, défense 30 : **Calculer** demande le résultat du d10 de maladresse. Saisir **1** dans **Maladresse de combat : résultat du d10 (V5 p. 165)** et recalculer : aperçu « Perdez 1 Blessure, sans réduire par l’Endurance ni l’Armure ». Observé en aperçu seulement. Source : L06 p.165 et décision MJ du 27/10, table Oops seule.

**Poudre.** Poivrière, Projectiles (Ingénierie) 60 ; **Seconde main libre → Non, occupée**, attaque 99, défense vide ; **Calculer**, saisir **1** dans **Incident de poudre : premier d10 (V5 p. 165)**, recalculer, puis **Enregistrer le résultat**. Observé : le reçu indique que l'arme ne tire pas et qu'une arme à feu doit être rechargée ; panneau recharge à 3 tirs. Source : L06 p.165. **Observation historique 738b553 :** le chargeur conservait trois tirs malgré la décision du 28/10. Point déjà signalé par la contre-vérification ; corrigé dans le rejeu ci-dessous.

**Rejeu 3437efa :** Poivrière main occupée, 99, d10 1, enregistrer : 0 tir restant et recharge complète 0/4 ; l’ancien comportement à trois tirs est corrigé. **Non joué :** 100, les accidents propres de hache-fusil/mortier et les lignes de la table de Salve L13 p.126.

## 9. Empoignade sur trois Tours — T2-N — 6 min

**Préparation.** Charger `fixture-recette.json`. Héros et Garde ont Bagarre 50, Force 40, BE 3 ; Héros 20 PV et Garde 40. Aucun PA utilisé.

**Étapes.** Héros : choisir Bagarre, cocher **Déclarer une tentative d’empoignade**, attaque 25, défense 70, calculer et **Enregistrer le résultat**. **Tour suivant** : Garde choisit Force, type **Opposition**, **Action d’empoignade → Blesser**, défense avec le jet Force de Héros ; 25 contre 70, calculer et enregistrer. **Tour suivant** : Héros choisit Force, Opposition, **Se dégager**, défense Force de Garde ; 25 contre 70, calculer et enregistrer. Faire **Annuler**, puis **Menu → Rétablir** ; recharger la page.

**Attendu.** Prise : Enchevêtré, sans dégâts. Blesser : BF + DR − BE, sans PA ; l'initiateur qui se dégage libère les deux. Source : décisions MJ du 27/10, `CHOIX_EXECUTANT_PHASE_F2.md`.

**Répétition : joué conforme pour ces étapes.** La prise ne modifie pas les PV ; Blesser propose et applique 5 blessures, Héros passe à 15/20 ; le dégagement retire Enchevêtré. Annuler le restaure, Rétablir le retire ; après rechargement, Héros reste à 15/20 et la piste ne montre plus Enchevêtré. **Rejeu 3437efa :** prise 25 contre 70, puis Modifier Garde → Retirer du combat : Garde disparaît et aucune action d’empoignade ne reste proposée ; Annuler restitue Garde et Enchevêtré. **Recommencer** a été déclenché mais la confirmation navigateur a bloqué l’observation : résultat non vérifié. Double critique d’initiation et état interne de lien orphelin non vérifiés. Ces limites ne sont pas des échecs de ce parcours.

## 10. Double critique et refus de mort — T2-I — 5 min

**Préparation.** Dans la sauvegarde de test, Héros équipé de l'Épée réelle, Garde BE 3 et 40 PV. Régler Garde à 1 PV par la quantité 39 et le bouton de retrait PV.

**Étapes.** Attaque 11, défense 70 ; **Calculer**. Saisir 11 pour **Localisation du critique (nouveau d100)**, 10 pour **Gravité (d100)**, et 45 pour **Gravité (d100 + 120)**. Calculer et **Appliquer 13 dégâts à Garde recette**. Dans **Décisions du MJ — mort critique**, cliquer **Refuser la mort**.

**Attendu / observé : joué conforme pour ce chemin.** 13 blessures amènent Garde à 0 ; le double produit « Choc au poignet » au bras gauche, l'excédent de 12 blessures donne 45 + 120 = 165 et « Démembrement brutal ». Les deux entrées figurent une fois chacune au registre ; l'interface demande une décision de mort, et le refus retire cette demande sans déclarer le personnage mort. L'option mort subite est décochée par défaut. Source : L06, tables de critiques ; décision MJ du 27/10 de conserver les critiques V5 et de réserver la mort au MJ.

**Complément :** voir scénarios 18 à 21 pour Assommer, Main ouverte, décompte différé et créature figurante. Le rechargement et l’annulation de ce double critique restent à jouer. Le test navigateur existant injecte certaines préconditions et ne remplace pas ces parcours manuels.


# Parcours complémentaire T1, F2-R et T2

Les scénarios 1 à 10 ci-dessus appartiennent aussi au parcours complet. Les scénarios suivants complètent les groupes ; les durées sont estimées, avec fixture prête.

## 11. Tir sans maîtrise — T1-C — 3 min

**Préparation.** Charger `fixture-complement.json`. Héros CT 60, aucune augmentation en Projectiles (Arbalète), Arbalète (2M) réelle ; Garde BE 3, Chemise de mailles 2 PA sur le bras.

**Étapes.** Choisir **Arbalète (2M)**, jet 31, défense vide, **Calculer**.

**Attendu / répétition : joué conforme en aperçu.** Le reçu indique « sans maîtrise du groupe · Capacité de Tir, −1 DR » ; base +3 DR, résultat +2 ; bras gauche, 8 blessures proposées, Garde 40 → 32. Source : L06 p.166. Pas d’application dans cet essai.

## 12. Visée puis Défensive — T1-B — 6 min

**Préparation.** `fixture-recette.json`, Héros avec Bolas et Projectiles (Entraves) 60, Garde cible.

**Étapes.** Choisir Bolas ; dans **Actions du Tour**, choisir Bolas dans **Arme de tir tenue pour viser Garde recette**, confirmer tenue en main et cliquer **Viser Garde recette**. Une tentative de tir au même Tour est refusée car l’Action est consommée. Passer deux fois **Tour suivant** jusqu’au prochain Tour du Héros ; choisir Bolas, saisir 31, **Calculer → Détail des calculs et règles**. Annuler l’aperçu. Choisir Escrime dans **Compétence choisie pour l’Action défensive**, puis **Déclarer l’Action défensive** ; passer au Tour du Garde. Choisir Bagarre, défense **Corps à corps (Escrime)**, attaque 25 et défense 40, calculer et ouvrir le détail.

**Attendu / répétition : joué conforme en aperçu.** Tir : base +3 DR, Visée +1, total +4, 5 blessures proposées. Défense : score 60, 40 → base +2, Défensive +2, total +4 ; le choix éventuel d’inversion du défenseur reste à confirmer avant application. Source : L06 p.167 et décisions F2-B. **Non joué :** annulation de Visée par mouvement ou défense, expiration de Défensive au prochain Tour.

## 13. Deux armes — T1-B — 4 min

**Préparation.** `fixture-complet.json`, Héros avec Épée et Rapière, Base 69 et Escrime 60 ; Garde 40 PV.

**Étapes.** Épée, attaque 24, défense 70, calculer et appliquer 12 dégâts : Garde passe à 28 et Héros gagne Élan. Sélectionner Rapière ; cocher **Attaque supplémentaire : payer 1 Élan** et **Attaque avec la main secondaire** ; dans **Attaque précédente pour l’attaque immédiate de l’autre arme**, choisir **Épée · touche**. Reprendre 24 contre 70, calculer et appliquer 10 dégâts.

**Attendu / répétition : joué conforme.** La première attaque doit être enregistrée ; le second coup propose le coût de 1 Élan et le malus −2 DR, passe Garde de 28 à 18. Le rappel Rapide disparaît lorsque la première attaque est réellement liée. Source : L06 p.167 et décision MJ du 26/10.

## 14. Cavalerie à pied et monté — T1-C — 4 min

**Préparation.** `fixture-complet.json`, Lance de cavalerie réelle, Héros démonté avec Cavalerie 60 et Base 69.

**Étapes.** Choisir la Lance, sélectionner Cavalerie dans le choix de compétence, attaque 24 contre 70, calculer. Annuler ; **Modifier Héros recette → Le personnage est monté → Enregistrer** et refaire le même aperçu.

**Attendu / répétition.** À pied avec cette lance à une main, le reçu affiche **arme improvisée**, groupe Base et 9 blessures proposées. Monté, il affiche Cavalerie entraînée ; `BF +6*` reste « dégâts à arbitrer », donc ne pas inventer un résultat automatique. Source : L06 p.166–168 et F2-C ; les règles complètes de monture appartiennent à T3. Aucun coup appliqué.

## 15. Discrétion et Heaume — F2-R/D — 4 min

**Préparation.** `fixture-complement.json` contient Chemise de mailles et Heaume réels ; Discrétion et Perception 50.

**Étapes.** Choisir Discrétion et cocher **Chemise de mailles porté** et **Heaume porté** ; saisir 31, calculer et ouvrir le détail. Annuler ; choisir Perception, cocher **Heaume porté**, saisir 31 et calculer.

**Attendu / répétition : joué conforme en aperçu.** Discrétion : base +2, mailles et plates −2, total 0 DR. Perception : base +2, Heaume fermé −2, total 0 DR. La présence dans l’inventaire seule ne signifie pas qu’une pièce est portée : cocher les faits. Source : notes exactes du catalogue et décision MJ du 27/10 ; L06 p.306.

## 16. Taille sur une pièce — T2-D — 4 min

**Préparation.** `fixture-complement.json`, Hache Naine réelle Taille, Garde avec Chemise de mailles 2 PA.

**Étapes.** Choisir Hache Naine ; **Coup ciblé → Oui → Corps** ; **Taille : pièce d’armure ou bouclier frappé → Chemise de mailles**. Saisir 31 contre 70 et appliquer 8 blessures ; répéter l’aperçu avec les mêmes jets.

**Attendu / répétition.** Garde passe de 40 à 32. Taille endommage de 1 PA la pièce touchée avant le calcul de chaque coup (L06 p.304). Au second aperçu, le détail indique protection retenue 0 PA après une nouvelle dégradation proposée. L’entrée de sélection continue d’afficher les 2 PA imprimés : lire le détail de protection plutôt que traiter ce libellé comme les PA restants. Le second coup n’a pas été appliqué.

## 17. Empaleuse d’un carreau — T2-D — 4 min

**Préparation.** `fixture-munitions.json` ; Arbalète (2M) et **Carreaux (12)** réels. Garde 40 PV.

**Étapes.** Choisir Arbalète, **Munition → Carreaux (12)** ; jet 20, calculer. Saisir 11 pour localisation du critique et 30 pour gravité ; calculer puis appliquer 10 dégâts.

**Attendu / répétition : joué conforme pour l’enregistrement.** Le 20 produit un critique ; « Main ensanglantée » au bras gauche ajoute 1 Blessure et Hémorragique. Le panneau **Projectiles fichés — Empaleuse** indique Garde, carreaux, Test de Guérison requis et 1 Blessure bloquée. Source : L06 p.304 et table du bras p.365. L’extraction et le déblocage du soin n’ont pas été joués.

## 18. Assommer — T2-I — 4 min

**Préparation.** `fixture-complement.json` ; Marteau nain réel, cible BE 3 et Sonné niveau 3 ajouté par **+ état**.

**Étapes.** Cocher **Assommer — déclarer avant le jet et retenir ses coups**, choisir **Coup ciblé → Oui → Tête**, attaque 11, défense 98, calculer et appliquer ; puis **Annuler**.

**Attendu / répétition : joué conforme.** L’aperçu propose 16 blessures et Inconscient car le total de Sonné dépasse BE 3 ; après application, Garde 24/40 et Inconscient. Annuler restitue 40/40 et Sonné 3 sans Inconscient. Le coup retenu ne provoque pas le critique du double. Source : L06 p.171 et décision MJ du 27/10.

## 19. Main ouverte et choc reporté — T2-I — 6 min

**Préparation.** `fixture-main-fendue.json`, Épée, Garde à 10 PV et BE 3.

**Étapes.** Attaque 11, défense 70 ; localisation du critique 11, gravité 10 ; pour le critique d’excédent saisir 87 sous **Gravité (d100 + 30)**. Calculer et appliquer 17 dégâts. Dans **Chocs d’amputation**, pour le doigt imposé choisir **Échec**, DR −2 et **Enregistrer le choc**. Pour la main, répondre **Non** à **Tous les doigts ont été perdus**, enregistrer, puis recharger la page.

**Attendu / répétition : joué conforme.** 13 dégâts de coup dépassent 0 de 3, donc 87 + 30 = 117 : « Main ouverte », +4 blessures, Hémorragique 2 et Sonné 1. Une entrée de cette blessure est enregistrée. L’échec du choc du doigt ajoute À Terre et Sonné ; le choc conditionnel de la main est reporté après Non, et ne réapparaît pas au rechargement. Source : L06 p.178 et p.365 ; décision MJ du 27/10 sur le second choc.

## 20. Décompte et refus de mort — T2-I — 5 min

**Préparation.** `fixture-decompte.json` est une précondition injectée : Garde Inconscient, BE 3, quatre critiques fictifs et décompte commencé au Round 1, échéance Round 4. Il ne démontre pas la création des quatre critiques par des coups successifs.

**Étapes.** Au Round 1 essayer **Refuser la mort**, puis avancer six Tours jusqu’au Round 4 et cliquer **Refuser la mort**.

**Attendu / répétition.** Avant échéance, le refus est bloqué ; à échéance, il est accepté et Garde reste à 0 PV et Inconscient. Source : L06 p.172 et décision MJ du 27/10. **Écart d’affichage :** dès Round 1, le panneau dit « décompte arrivé à l’échéance du Round 4 » et présente des boutons actifs ; le clic affiche toutefois « Le décompte … n’a pas atteint son échéance » et ne décide pas la mort. Voir les écarts.

## 21. Mort subite d’une créature — T2-I — 3 min

**Préparation.** `fixture-figurant.json` : participant de type Créature fictive, 0 PV, sans talent Chanceux.

**Étapes.** Dans **Jouer**, vérifier que **Activer la mort subite des figurants** est décoché ; le cocher.

**Attendu.** Le MJ peut confirmer qu’une créature est figurante et choisir mort ou Inconscient ; aucune mort automatique. Source : décision MJ du 28/10, `CONTRE_VERIFICATION_CLAUDE_T2_BIS.md`.

**Répétition 3437efa : joué conforme.** La créature à 0 est proposée ; cocher « confirmer PNJ secondaire » puis choisir « inconscient » ajoute Inconscient. La règle est décochée au départ. Sur 738b553 la créature n’était pas proposée : écart historique corrigé, pas un écart actuel. La fixture reste fictive ; elle ne prouve pas un profil du bestiaire réel.

## 22. Hache-Fusil et Mortier de main — T2-E — 6 min

**Préparation.** `fixture-munitions.json`, Hache-Fusil (2M) +9 et Mortier de main (2M) +7 réels ; Héros BE 3, chemise de mailles, 20 PV.

**Étapes Hache-Fusil.** Sélectionner l’arme, cocher **Utiliser l’arme comme arme de mêlée** et **L’arme à feu est chargée**, choisir **Nature du Test → Corps à corps**, attaque 99, défense 70 ; calculer, saisir Oops d10 1, recalculer et enregistrer.

**Observé.** Héros passe de 20 à 15 PV ; le reçu visible comporte Oops 1. L’accident propre doit primer sur l’incident générique sur 99–100 en mêlée, décision MJ du 27/10 ; détailler encore le calcul et les messages avant de certifier chaque composante.

**Étapes Mortier.** Choisir Mortier, type **Test**, cocher **Recharger le mortier à main**, jet 99, calculer et saisir Oops d10 1. L’interface demande **Dégâts maximums du profil du mortier** et le bras directeur. Saisir 7, recalculer, sélectionner **Droit**, recalculer et enregistrer.

**Observé / limite connue.** De 15 à 10 PV sur cette fixture. L’arbitrage du 28/10 demande les dégâts du profil à +0 DR au bras principal, sans champ maximum ; ce champ encore exigé est un point connu de la contre-vérification, pas une nouvelle découverte. Source : L13 p.103 et décisions MJ des 27–28/10.

## 23. Tromblon et munitions — T2-D — 3 min

**Préparation.** `fixture-munitions.json` : Tromblon (2M), Balles et poudre (12), Grenaille et poudre (12), objets réels, action liée à l’équipement.

**Étapes / observé.** Choisir Tromblon et ouvrir **Munition** : Grenaille est proposée, Balles ne l’est pas. Source : décision MJ du 27/10, Tromblon réservé à la grenaille ou aux projectiles improvisés. Rejeu 3437efa : choisir Grenaille, tir 31, +3 DR, 8 blessures proposées ; l’application exige les cibles de l’Explosion. La saisie `foe` suivie de Tab puis Calculer continue de demander ces cibles et bloque l’application ; voir les écarts. Le multi-cible reste à jouer.

## 24. Salve — T2-E — à préparer après clarification du référentiel

**Préparation.** La recherche dans `reference-snapshot.json` à `738b553` puis à `3437efa` ne trouve pas d’objet nommé « Arquebuse à salve » ; les deux profils Salve sont Baliste Faucheuse (Reaper Bolt Thrower) Druchii et Faucheuse des cieux (Sky Reaper) Druchii, des arbalètes sans poudre noire. Ne pas substituer un objet fictif en le faisant passer pour le catalogue.

**Attendu à vérifier quand le profil adéquat sera disponible.** Sur incident poudre, premier d10 générique puis second d10 de la table Salve L13 p.126 ; sans astérisque, recharge complète de la capacité (décision MJ du 27/10). Pour la ligne 1–4, la pièce est détruite et les servants désignés subissent les dégâts du profil au bras principal avec le dé des unités comme DR. Un parcours chiffré et sa répétition restent à préparer ; les limitations de l’interface Salve sont déjà répertoriées dans la contre-vérification T2 bis.

## Variantes à poursuivre après contre-vérification

- **Invocation avant Round 1.** Préparer un prêtre Taal avec Prière acquise et score courant ainsi qu’Invocation (Taal), ou une dérogation MJ pour l’accès. Sélectionner Roi de la Nature, autoriser la prononciation, jet 10, choisir Loup et sa position, calculer puis appliquer. Lire le d10 automatique et vérifier l’insertion parmi les scores déjà fixés ; Annuler, Rétablir et recharger. Le profil minimal ne possède pas Prière : le blocage observé est une précondition manquante. Source : L06 p.227, décision MJ du 27/10. Durée indicative : 5 min ; non joué jusqu’à application.
- **Fin d’empoignade sur retrait et reprise.** Répéter la prise du scénario 9, retirer Garde par Modifier → Retirer du combat, vérifier qu’aucune action d’empoignade ne reste proposée, puis Annuler et vérifier le retour de l’état. Depuis une rencontre préparée non vide, Menu → Recommencer le combat et confirmer ; vérifier qu’aucune prise ancienne ne contraint la nouvelle rencontre. Retrait et Annuler joués sur 3437efa ; confirmation de Recommencer non vérifiée. Durée indicative : 4 min.
- **Empaleuse après soins.** Après le scénario 17, ouvrir Projectiles fichés et suivre le parcours de retrait / Guérison en renseignant les faits et jets demandés par le MJ. Vérifier que la Blessure bloquée ne redevient guérissable qu’après extraction, puis Annuler et recharger. Commandes, score et résultats chiffrés restent à confirmer : ne pas inventer de jet. Source : L06 p.304. Durée indicative : 4 min.
- **Variantes de bouclier, Visée et Défensive.** Reprendre les scénarios 5 et 12 : comparer un bouclier 1 PA au 2 PA contre un tir, les zones couvertes pour le bras directeur et non directeur, une Visée interrompue par déplacement ou défense, et l’expiration de Défensive au prochain Tour. Déclarer les faits MJ et lire les reçus ; variantes non répétées. Source : L06 p.166–167, 306 ; décisions MJ du 27/10. Durée indicative : 8 min.

# T3 — à compléter après livraison

## Destin et Chance
## Localisations des créatures
## Combat monté
## Corruption et mutations

# T4 — à compléter après livraison

## Armes de suppléments
## Bestiaire
## Séquelles hors combat

# Écarts constatés pendant les répétitions

1. **Sortie de Filet bloquée — 3437efa.** Charger `fixture-actuelle.json`, Filet, 25 contre 70, Enregistrer sans dégâts ; Tour suivant, Force, type Test, sélectionner Enchevêtré Force 50, Test 75 et d100 opposé 20, quitter le champ par Tab puis Calculer. Le reçu réclame toujours le d100 opposé et désactive l’enregistrement. À contre-vérifier, notamment le traitement du champ : le constat ne démontre pas à lui seul l’origine de l’erreur. Le texte d’aide est désormais conforme à l’échec sans effet.
2. **Cible d’Explosion non prise en compte — 3437efa.** Charger `fixture-actuelle.json`, Tromblon, munition Grenaille, jet 31 ; saisir `foe` dans « Explosion : identifiants de toutes les cibles dans le diamètre », Tab, Calculer. La cible `foe` est celle de Garde dans la fixture ; le reçu réclame encore les cibles et désactive l’application. À contre-vérifier, notamment la saisie et le traitement du champ.
3. **Décompte libellé prématurément — observé sur 738b553 seulement.** Scénario 20 : au Round 1, le panneau parle d’une échéance « arrivée » au Round 4 et présente deux boutons ; un clic est refusé jusqu’au Round 4. L’affichage est trompeur mais la garde de décision était effective. Précondition des quatre critiques injectée ; à rejouer sur 3437efa.

La créature figurante et la Poivrière avaient des écarts dans l’ancienne révision ; ils sont corrigés sur les chemins rejoués en 3437efa. Le champ maximum du mortier et les restrictions Salve étaient déjà signalés par Claude et n’ont pas été revérifiés ici sur 3437efa. Le précache incomplet mentionné au rapport concerne le hors-ligne à froid ; la répétition utilise un serveur local.

# Résumé

24 scénarios numérotés, dont les dix du parcours rapide ont été joués ou tentés dans l’application locale ; le filet est bloqué à la sortie et des variantes restent ouvertes. Les observations initiales datent de `738b553`, les rejouées sont identifiées `3437efa`. Estimation : 44 minutes pour le rapide, environ 99 minutes pour les scénarios 1–23 hors installation et variantes, sans chronométrage ; Salve n’est pas encore chiffré. Deux blocages d’interface sont à contre-vérifier sur la révision actuelle, plus un affichage historique à rejouer. Salve, invocation, extraction et certaines variantes ne sont pas validées. Arrêt pour relecture Claude avant toute soumission au MJ.
