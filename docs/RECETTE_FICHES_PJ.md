# Recette indépendante des fiches PJ et référentiels

Contrôle du 8 octobre 2026, application locale 3.12.0, cahier des charges v1.3 (R01–R40).

**Verdict final : aucun blocage local identifié pour le lot 1.** Le cahier v1.3 est couvert par les contrôles unitaires, navigateur et Auth/RTDB locaux décrits ci-dessous. Les dernières gardes source/édition, les interfaces d’association et de provenance, et le démarrage hors ligne sont vérifiés. Aucun déploiement ni accès aux fiches Firestore privées n'a été réalisé par le contrôleur. La connexion au compte MJ/App Check, l'application des règles déployées et la réception sur appareils physiques restent à effectuer avant réception production complète.

## Baseline et résultats

Le point de départ est le commit 3bc07ed880561831334f6d96dc9755a6afe6e47d (3.11.1). La baseline comportait 320 tests unitaires réussis et un smoke navigateur réussi avec Edge. npm ci avait installé trois dépendances et annoncé zéro vulnérabilité, sans modifier le package/lock à cette étape. La montée de version ultérieure appartient au chantier.

Preuves obtenues :

- Première intégration : npm test exécuté indépendamment, **382/382 passent**, zéro échec/ignoré, 9,027 s. Les erreurs réseau/IDB/quota affichées sont des scénarios d’échec attendus dont les assertions réussissent.
- Validation globale finale après tous les correctifs : **397/397 tests unitaires passent**, zéro échec/ignoré, 12,143 s, exécution du chef d'orchestre avec Node24.19.0.
- tests/fiches-pj-control.test.js : **19/19 passent**, exécution indépendante après correction CAS. Ce sont les 17 contrôles initiaux plus les deux courses d’édition participant/profil pendant une sauvegarde source.
- LOT1_BROWSER_FINAL=1 et Edge, node --test tests/lot1-final-control.test.js : **13/13 passent** indépendamment (12 cas unitaires et scénario navigateur d'édition/adoption/actualisation et remplacement explicite d'association), dernière exécution 7,144 s.
- node tests/fiches-pj-browser.mjs : **passe**, dernière exécution indépendante 7,046 s ; source simulée et vraie application/CSS pour les actions et la recette visuelle.
- Les **cinq parcours navigateur finaux** passent sous Edge selon le chef d'orchestre : smoke historique, fiche, référentiels, final-control et PWA/sessions. La recette PWA complète a aussi été rejouée indépendamment (8,808 s), après correction première installation et restauration hors ligne du compte ; elle couvre le vrai rendu de provenance du journal.
- Auth/RTDB : **37 contrôles HTTP passent**, 16 autorisations HTTP 200 et 21 refus HTTP 401, avec les règles production effectivement chargées dans les émulateurs.
- git diff --check et vérifications de syntaxe des helpers QA passent. Les avertissements LF/CRLF ne sont pas des erreurs de whitespace. Les CSV bruts de source conservent leurs espaces et fins de ligne pour préserver les preuves SHA256 ; .gitattributes les exclut des contrôles de whitespace et de la conversion EOL. Les contrôles s’appliquent au code et à la documentation.

Le navigateur utilisé est Edge installé, avec PLAYWRIGHT_EXECUTABLE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe. Le chemin navigateur macOS par défaut des scripts historiques ne permet pas une exécution locale valide.

## Couverture du contrat

« Vérifié localement » désigne une preuve par tests, scénario navigateur ou lecture croisée du code livré. Les cas comportant un service externe ou un appareil réel conservent leur limite.

| Cas | Preuve et résultat local | Limite de réception |
|---|---|---|
| R01 | Source simulée avec métadonnées de protocole, données utiles normalisées, accès source utilisé en lecture seule | Auth/App Check et cinq fiches privées à contrôler avec le compte MJ |
| R02–R05 | Exemplaires distincts, renommage avec ID stable, retrait des seules actions liées, adoption sans doublon et réapplication sans second delta/révision | Remplacement explicite et refus des associations concurrentes vérifiés dans l'interface |
| R06–R09 | Exemplaires personnalisés et paramètres textuels conservés ; rangs/spécialités séparés ; résolveur commun et scores source ; emplacement ouvert non calculable | Source/édition limitée aux références tracées dans la matrice |
| R10 | Tir sans compétence : base vide, liaison requise, SKILL_LINK_REQUIRED et confirmation explicite ; aucun repli mêlée | Aucune limite locale identifiée |
| R11–R12 | Formules BF conservées et recalculées par caractéristique ; expression inconnue intacte et arbitrage requis | Aucune exécution du texte comme code |
| R13–R16 | Addition des couches, meilleure pièce de même couche, six zones/côtés et migration quatre zones sans objet fictif | Aucune limite locale identifiée |
| R17 | Bouclier séparé des PA permanents ; contexte défense/distance nécessaire ; un seul bouclier ; arme source de tir prévaut sur UI contradictoire | Contexte historique incomplet à arbitrer |
| R18 | Attaque au bouclier directe et simulée : indisponibilité conservée après sync/suspension/reprise ; réactivation au prochain tour du porteur ; undo restaure l'indisponibilité | Store/moteur locaux, sans séance Firebase réelle |
| R19–R20 | Partielle, Points faibles, Impénétrable et qualité de munition avec provenance ; dédoublonnage ; munition incompatible refusée ; interface tir/munitions testée | Contexte inconnu explicitement à arbitrer |
| R21–R22 | Absent conserve, tableau vide confirmé retire ; collection invalide/ID dupliqué exclu sans perte ; anciennes liaisons conservées si compétences invalides | Aucune limite locale identifiée |
| R23–R24 | 8/14→10/16 ; 8/14→4/10 puis −2/4 ; copies actives/suspendues/persistantes cohérentes, archives intactes | Aucun état ou effet de seuil ajouté par sync |
| R25 | Source et profil périmés refusés avant/après relecture ; CAS vérifié dans la file durable ; édition participant/profil ne rétablit pas une arme BF+4 après sync BF+7 | Latence source simulée, pas de service privé réel |
| R26–R27 | Undo/JSON/copies préservés ; deux contextes navigateur avec IndexedDB natif, file hors ligne durable, reprise, transfert v3, conflit, export et restauration | Transport HTTP CAS simulé ; deux appareils physiques et Firebase réels non vérifiés |
| R28–R29 | Sheets incomplet/en échec conserve l'ensemble précédent ; effet non couvert conserve son texte et demande arbitrage ; historique inchangé | Aides locales sans preuve Sheets explicitement à arbitrer |
| R30 | Vrai service worker contrôlant la page ; reload hors ligne, catalogue, sync identique, vraie mise à jour par Actualiser, purge anciens caches sans perte IDB | Installation système sur téléphone physique non attestée |
| R31 | Migration pure/course d’initialisation/anciennes files ; Auth+RTDB sous émulateurs : owner/foreign/guest, v1/v2 gelés, schema3 et révisions/reçus | Déploiement des règles et clients physiques v2/v3 sur même compte à vérifier |
| R32 | Résolveur/référentiel commun, provenance/version fondée sur contenu utile, navigation des référentiels et détail historique | Les aides complémentaires locales ne deviennent pas une source Sheets par affichage |
| R33–R35 | Imports PNJ/texte/JSON conservés ; six zones ; caractéristiques/scores sans bonus talent ajouté ; équipement actualisé et santé persistante à la rencontre | Export de plusieurs copies divergentes vers un persistant refusé explicitement |
| R36 | Sorts/prières conservés et consultables, sans nouvelle action ni moteur magique | Combat magique hors lot 1 |
| R37–R40 | Maximum inconnu/non calculable : conservation et avertissement ; 16/14→18/16, −2/14→0/16 ; reprise/réapplication sans second delta | Anomalies historiques visibles sans écrêtage |

Les attentes santé proviennent des exemples validés, et non d’une copie de l’algorithme interne. Les paramètres textuels inconnus, états et copies indépendantes font partie des assertions de conservation.

## Gardes de fermeture v1.3

Les contrôles supplémentaires vérifient qu'une action locale homonyme n'est jamais adoptée implicitement, qu'une action source retirée ne reste pas orpheline dans une ancienne scène et qu'un remplacement d'association retire seulement les anciennes actions source. Un emplacement de compétence ouvert ne devient pas un score utilisable.

Les éditeurs conservent les données source actuelles lorsqu’une arme est ajoutée, actualisée, retirée ou adoptée pendant leur ouverture ; les modificateurs de séance et actions locales restent éditables. Le scénario réel indépendant confirme le passage d’une ancienne action locale à une arme adoptée, sans restauration de ses anciens dégâts ou score au submit.

Une course supplémentaire a été reproduite : une sync BF+4→BF+7 attendait sa sauvegarde ; le formulaire capturait BF+4 puis s’exécutait après elle. Le correctif ajoute expectedLocalRevision opt-in à updateParticipant et updateProfile, vérifié dans le reducer durable. Les deux tests adversariaux prouvent le refus LOCAL_EDIT_STALE, la conservation de BF+7, l’absence d’application partielle du modificateur et une seule nouvelle révision. Le refus doit laisser la saisie ouverte avec un message explicite.

Un maximum persistant explicitement inconnu reste inconnu au lancement et à la réhydratation. La réserve PJ utilise le maximum calculable ; les PV courants sont portés par les copies/persistants avec avertissement pour la transition historique. L’export santé vise uniquement un persistant déjà lié de manière unique ; il n’en crée pas par ressemblance. Deux copies divergentes vers le même persistant produisent un avertissement et ne choisissent pas arbitrairement la dernière ; deux copies identiques peuvent être reportées. Ces deux cas ont passé le contrôle indépendant.

La provenance arme/munition/protection, version, édition et texte d'effet est conservée dans le reçu historique et l'export. Son affichage relit le reçu, sans recalcul avec le catalogue courant ; les textes source sont échappés dans le vrai journal (recette du chef d’orchestre).

## Recette navigateur et visuelle

La recette indépendante couvre relecture avant application, choix de compétences, adoption historique, source/profil périmés et conservation d'une action locale lors d'un équipement source vidé.

L'application complète a été rendue en clair/sombre à 1440 et 390 pixels. L'absence de débordement horizontal est assertée pour les quatre vues de bibliothèque. Les captures montrent les noms longs, talents, équipement et protection sur six zones. Les preuves temporaires sont dans tmp/fiches-pj-receipt/, avec captures bibliothèque, combat et critique Inoffensive ; elles ne sont pas des fichiers métier à publier.

L'interface réelle vérifie aussi :

- Un bouton historique d’attaque reliée au bouclier ouvre le résolveur canonique avec la bonne action et un jet vide, sans tirage, dommage ni révision.
- Les flèches sont proposées pour l’arc ; changer d’action efface la munition.
- Inoffensive demande deux gravités de critique, bloque Appliquer avant la seconde et retient 20 pour 60/20 ; aucun dommage n’est appliqué au stade aperçu.
- Le vrai service worker contrôle la page après installation, recharge hors ligne et permet une mise à jour explicite. La première installation n'annonce pas un worker de remplacement inexistant.
- Un démarrage à froid hors ligne restaure le contexte account:qa-mj à partir d'une identité Auth persistée explicitement simulée, sans copie dans guest. App, sync.js, IndexedDB et service worker sont réels ; les modules Auth et distant de ce segment sont des fixtures locales. Le premier segment PWA utilise les modules embarqués réels, sans ces fixtures.
- Deux contextes IndexedDB natifs reprennent une file hors ligne, échangent v3 via HTTP CAS simulé, détectent un conflit, exportent et restaurent sans effacer les données locales.

Défauts détectés puis corrigés : doublons à l’adoption, attaque inventée pour bouclier sans dégâts, repli mêlée implicite, erreur d’aperçu masquée, course pendant relecture/source en file durable, formulaire dupliqué, syntaxe des cartes, débordement mobile, munition conservée après changement d’action et faux message PWA de première installation.

## Sources et limites

docs/MATRICE_REFERENCES_ET_MOTEURS.md trace source, édition et couverture moteur. Les référentiels communs suivent le même contrat public que les fiches ; les sept onglets publics ont été relus pendant le développement. Une aide locale historique sans preuve Sheets garde son statut d’arbitrage/complément local. Aucun nouveau moteur de talent au lot 1 ; les effets supplémentaires relèvent du lot 2. Magie acquise en consultation seulement.

La recette Auth/RTDB a réellement chargé les règles production et trouvé un défaut : receipts:1 était accepté par le seul wildcard des enfants. Le durcissement autorisé ajoute newData.hasChildren() au conteneur receipts dans production et fixture v3. Le scalaire est désormais refusé ; receipts:{} reste accepté et supprimé nativement par RTDB. La fixture de combat vide a été adaptée à cette même suppression native, sans modification métier pour faire passer un test.

Avant réception production, appliquer le guide avec le compte MJ : Auth/App Check et cinq fiches privées, migration cloud et règles déployées, clients physiques v2/v3 sur deux appareils, installation système/actualisation PWA. Vérifier SHA/version après publication effective. Les émulateurs, service worker et deux contextes locaux sont des preuves valides de leur périmètre ; ils n'attestent pas de ces opérations de production.

## Reproduction et preuves Auth/RTDB

Outils installés uniquement dans tmp/firebase-validation : Temurin JDK21.0.12.1+1 portable, Firebase CLI15.33.0 et Database Emulator4.11.2. Node de cette recette indépendante : 24.12.0 ; le chef d’orchestre utilise également un runtime24.19.0 pour ses contrôles. L’installation QA n’a modifié aucun package/lock applicatif ni installé Java/CLI globalement.

Sources officielles : [Temurin](https://adoptium.net/temurin/releases/?arch=x64&os=windows&version=21) et [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure). L’archive provenant de l’API officielle Adoptium a été vérifiée contre le SHA256 publié f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e.

tests/run-firebase-v3-emulators.ps1 lance uniquement Auth et RTDB avec le projet demo-fiches-pj-control, sans login. Les ports sont liés à 127.0.0.1 : RTDB19000, Auth19099, hub14400 et logging14500. Il refuse les ports occupés, ne termine aucun processus préexistant et restaure son environnement de processus.

Avec les outils portables présents, depuis le worktree :

    powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-firebase-v3-emulators.ps1

Le test n’accepte qu’un hôte local avec port, sans identifiant, chemin, query ni fragment. SHA256 des règles effectivement éprouvées : d1d4f10227d429117ef7a8f80e208f3a0dec4564cb547120c144ef190be49e1a. Les preuves sont dans tmp/firebase-validation/run/ : receipt.log, receipt-checks.json et environment-proof.json.

Fin de recette : namespace jetable supprimé ; emulators:exec a arrêté tous ses services ; absence d’écoute sur les quatre ports vérifiée. Le debug CLI contenant l’environnement de processus est supprimé par le helper ; transcript conservé. Les runtimes/caches portables restent dans tmp pour rejouer et ne sont pas à publier.

## Documents et contrôles associés

- Contrat : docs/CAHIER_DES_CHARGES_FICHES_PJ_ET_REFERENTIELS.md.
- Lots et suivi : docs/SUIVI_FICHES_PJ.md.
- Guide : docs/GUIDE_FICHES_PJ_ET_REPRISE_V3.md.
- Références/moteurs : docs/MATRICE_REFERENCES_ET_MOTEURS.md.
- QA indépendante : tests/fiches-pj-control.test.js, tests/fiches-pj-browser.mjs et tests/firebase-rules-v3-emulator.mjs.
- Fermeture/PWA : tests/lot1-final-control.test.js et tests/lot1-pwa-sessions-browser.mjs.
- Lanceur : tests/run-firebase-v3-emulators.ps1.
