# Rapport de mission Gemini 3.8 — Lot 3 Campagne

**Date :** 7 novembre 2026  
**Branche locale :** `codex/campagne-lot3`  
**HEAD de départ :** `50d3592`  
**Environnement :** `E:/Outil MJ Warhammer/tmp/campagne-lot3-worktree` (worktree isolé)  
**Chef d'orchestre :** Codex  
**Statut commit :** Aucun commit réalisé (modifications locales laissées prêtes à l'inspection de Codex).

---

## 1. Périmètre et fichiers touchés

Seuls les fichiers expressément autorisés par le mandat ont été modifiés ou créés pour le lot 3, en conservant intégralement la base non commitée du lot 2 :

- `js/ui/v5-aftermath-panel.js` :
  - Modularisation des fonctions de rendu (`renderReceiptStatus`, `renderParticipantConvalescence`, `renderGlobalConvalescence`, et conservation intégrale de `render(participants)`).
  - Élimination des identifiants techniques internes comme identification principale des blessures et soins (nom de critique, localisation ou cause réelle à la place de `critique <id>` ou `Incident <id>`).
  - Champs de soigneur, d100 et modificateurs rapprochés et dotés de largeurs proportionnées.
- `js/ui/campaign-workspace.js` :
  - Intégration complète du panneau de convalescence et des soins contextuels au personnage sélectionné dans la colonne de détail.
  - Section dépliable d'opérations générales de convalescence sous la vue d'ensemble (inscriptions de blessures perdues, déclarations de maladie, décisions MJ de cicatrices et pertes de caractéristiques, calendrier d'avance rapide).
  - Statut d'opération en direct (`role="status"`) signalant les réussites, soins appliqués, DR et refus explicites.
  - Identification claire des participants absents, interdiction d'actions directes non supportées pour eux, et bouton d'archivage explicite.
  - Préservation du focus et des saisies utilisateur lors des rerendus Store.
- `js/ui/campaign-workspace.css` :
  - Adaptation fidèle aux styles sobres de la maquette (`tmp/maquette-campagne-jouer/campagne.css`) :
    - Palette parchemin (`#f8f3e7`), texte encre (`#342a24`), texte atténué (`#6e6052`), rouge profond (`#792c2b` / `#852e2b`).
    - Titres en `Georgia, serif`, interface en sans-serif système.
    - Barre d'horloge sombre (`#392b28`, texte `#f8f1e1`, liseré `#9a5242`).
    - Badges de statut colorés (rouge, ambre, vert, bleu) avec puce intégrée.
    - Avatars circulaires avec initiales et code couleur d'état de santé.
    - Support complet du thème sombre (`data-theme="dark"` et `prefers-color-scheme: dark`) avec contrastes WCAG AA préservés.
    - Grille responsive sans débordement horizontal à 1440px, 900px et 520px.
- `js/ui/workspace.css` :
  - Ajout du style circonscrit `.workspace-aftermath-link` pour le lien interactif depuis *Jouer* (*Suites de combat*) vers *Campagne*.
- `js/ui/workspace-view.js` :
  - Partage de l'instance `aftermathPanel` entre *Jouer* et *Campagne* afin de maintenir la synchronisation des formulaires, des saisies mémorisées et des accusés de réception.
  - Ajout d'un bouton d'accès direct « Ouvrir dans l’espace Campagne (suivi et soins) → » au sein du volet *Suites de combat* de l'onglet *Jouer*.
- `js/ui/v5-campaign-time-dialog.js` :
  - Support de paramètres initiaux optionnels (`initialAmount`, `initialUnit`, `defaultReason`) pour pré-remplir la durée tout en préservant strictement l'ensemble des validations métier existantes.
- `tests/campaign-lot3-browser.mjs` (nouveau test Playwright) :
  - Validation de bout en bout du parcours complet Campagne : navigation depuis Jouer, rendu visuel, polices, ouverture de critique, soins de blessure, traitement d'infection, avance de temps avec Undo/Redo, gestion des absents, thème sombre et responsive.

---

## 2. Comportement exact avant / après

| Aspect | Avant (Lot 2) | Après (Lot 3) |
| :--- | :--- | :--- |
| **Soins et interventions depuis Campagne** | Vue en lecture seule : un message renvoyait vers l'onglet Jouer (*Suites de combat*). | Tous les soins contextuels (Guérison, Soins aux animaux, infections, chirurgie, clôture, soins quotidiens de maladie, décisions de séquelles) sont exécutables directement sur le personnage sélectionné. |
| **Opérations générales** | Absentes de Campagne. | Section accessible sous la mise en page permettant d'ouvrir un critique, déclarer une maladie, enregistrer une perte de blessures hors critique, saisir les décisions MJ (cicatrices, pertes de caractéristiques) ou avancer le calendrier. |
| **Intitulés des soins** | Les codes internes (`incident inc-...`, `critique crit-...`) constituaient l'intitulé principal. | Identification humaine explicite (nom du critique, localisation anatomique, cause réelle) ; identifiants techniques relégués en attributs de données ou métadonnées discrètes. |
| **Lien Jouer ↔ Campagne** | Aucun lien direct depuis *Suites de combat*. | Bouton de bascule directe dans le volet *Suites de combat* de Jouer menant à Campagne, sans perte de contexte ni de saisies en cours. |
| **Esthétique et typographie** | Styles neutres génériques du workspace. | Reprise intégrale de la charte sobre de la maquette : fond parchemin, titres Georgia, sans-serif système, rouge profond, badges d'état colorés, avatars à initiales, barre d'horloge sombre contrastée. |
| **Thème sombre** | Incomplet ou hérité sans ajustement spécifique. | Définition circonscrite des variables pour le mode sombre (surface `#1c1815`, encre `#ece4d8`, rouge adapté `#e27d75`, contrastes AA vérifiés). |
| **Retour d'action (reçu)** | Aucun statut d'opération dans Campagne. | Paragraphe de statut accessible (`role="status"`) affichant instantanément les réussites, DR, blessures rendues ou motifs explicites de refus du Store. |

---

## 3. Invariants métier et conformité

- **Identité :** Tous les incidents restent strictement rattachés à leur `participantId`. Aucun rapprochement nominatif ou automatique avec un profil de la bibliothèque n'est opéré.
- **Participants absents :** Les suivis hors rencontre sont explicitement signalés (« PARTICIPANT ABSENT »). Aucun test quotidien automatique n'est exigé pour eux. L'archivage explicite est accessible via un bouton dédié.
- **Temps et horloge :** L'avance du temps utilise la commande transactionnelle du Store (`advanceCampaignTime` ou `advanceAftermathCalendar`), synchronisant jours entiers et calendrier de convalescence en conservant le reliquat. Aucune double avance n'est produite. Le dialogue gère les tests quotidiens requis avant tout franchissement, sans mutation partielle en cas de refus.
- **Règles et arbitrages :** Aucune règle n'a été réécrite ou court-circuitée. Tous les jets (d100, d10) et choix de soigneur proviennent de saisies utilisateur et sont validés par les fonctions officielles du moteur.

---

## 4. Tests exécutés et résultats

Toutes les suites de tests ont été exécutées avec succès dans l'environnement du worktree :

1. `node --test tests/unit/lot4/c39-temps-convalescence.test.mjs`
   - **Résultat :** 7/7 tests passés (avance, fraction de jour, refus sans mutation partielle, Undo commun).
2. `node tests/campaign-workspace-browser.mjs`
   - **Résultat :** Passé avec succès (données, sélection, filtres, focus, temps, état vide).
3. `node tests/campaign-lot3-browser.mjs` (nouveau)
   - **Résultat :** Passé avec succès (parcours complet : navigation depuis Jouer, polices Georgia, ouverture de critique, soin avec augmentation de PV, avance de temps, Undo/Redo, participant absent avec archivage, thème sombre et 3 largeurs d'écran sans débordement).
4. `node tests/f2-j-review-browser.mjs`
   - **Résultat :** Passé avec succès (parcours F2-J : application de critique en combat, soin de blessure, saut de 3 jours, tests quotidiens, Undo/Redo, rechargement persistant).
5. `node tests/f2-j2-review-browser.mjs`
   - **Résultat :** Passé avec succès (parcours F2-J2 : séquelles, faits, immobilisation, constat de guérison, combat avec séquelle active).
6. `node tests/browser-index.mjs`
   - **Résultat :** Passé avec succès (navigation générale, onglet Campagne, avance du temps et annulation sur l'application réelle).
7. `node tests/browser-workspace.mjs`
   - **Résultat :** Passé avec succès (navigation workspace, duel, 15 combattants, responsive).
8. `node --test tests/unit/donnees/audit-meta-production.test.js`
   - **Résultat :** 21/21 tests passés (précache cohérent, intégrité des modules).

---

## 5. Revue contradictoire et ajustements appliqués

Une passe d'audit contradictoire à deux sous-agents indépendants a été réalisée :
1. **Auditeur Code & Invariants Métier** : vérification de l'intégrité de la base Lot 2, des invariants d'identité et de l'atomicité temporelle.
2. **Auditeur UX, Accessibilité & Tests Navigateur** : vérification des contrastes colorimétriques, de la conformité à la maquette de référence et de la non-régression dans *Jouer*.

### Ajustements intégrés suite à l'audit et aux retours contradictoires :
- **Synchronisation intégrale du soigneur et des compétences entre formulaires jumeaux :**
  - Résolution de la divergence observée où le choix du soigneur dans le détail laissait « — » dans la section générale : mise en place de `syncAllSkills()` et `populateSkillSelect()`.
  - Lorsqu'un soigneur est sélectionné sur une copie d'un formulaire, la liste des compétences disponibles sur sa fiche (`aftermathSkills`) et la compétence sélectionnée sont immédiatement reconstruites et synchronisées sur toutes les copies jumelles du DOM.
  - La sélection d'une compétence est également enregistrée et propagée en temps réel via `remember(skill, ...)`.
  - L'ensemble (soigneur + compétence choisie) est fidèlement restauré après re-rendu de production (`Bus.emit('combat')`).
- **Délimitation explicite du comportement des absents entre Campagne et Jouer :**
  - **Dans l'Espace Campagne (`allowAbsentActions: false`)** : application stricte de la politique de séance du brief. Les participants absents de la rencontre sont clairement identifiés (« PARTICIPANT ABSENT »), leurs séquelles et maladies sont affichées en consultation seule avec messages d'avertissement explicites (« *Patient absent de la rencontre : séquelle en consultation (soins et tests indisponibles)* », « *Malade absent de la rencontre : soins de maladie non disponibles* »), et aucun formulaire d'action médicale n'est proposé (seul l'archivage d'incident ouvert reste accessible).
  - **Dans l'onglet Jouer (`allowAbsentActions: true`)** : préservation intégrale des capacités d'arbitrage post-combat héritées de la Phase F2 / Lot 2. Le panneau *Suites de combat* de Jouer ne bloque pas les séquelles et maladies en consultation seule, permettant au MJ de gérer les conséquences de combat pour tous les participants enregistrés.
  - **Invariants Store** : aucune règle du Store n'a été altérée ; le Store continue de vérifier la présence du sujet (`unknown-subject`) pour les commandes qui l'exigent légitimement.
- **Test de re-rendu effectif et maintien du focus :**
  - Suppression de l'appel inopérant `Store.touch?.()` au profit d'un véritable re-rendu de production déclenché via `Bus.emit('combat')`.
  - La preuve du re-rendu est formellement vérifiée par la destruction/recréation du nœud DOM (disparition du marqueur DOM temporaire) et par la confirmation que `document.activeElement` est réassigné au champ correspondant dans la section globale (`activeFocusScope === 'global'`).
- **Test de non-divergence sur formulaires réels de production :**
  - Remplacement de la simulation artificielle par deux copies réelles du formulaire de maladie de production (`care-disease:rot-difficulty` et `care-disease:rot-rested`) rendues simultanément dans la colonne de détail et dans la section générale.
  - Preuve de synchronisation bidirectionnelle immédiate avant re-rendu, et de persistance des valeurs et cases à cocher après re-rendu de production.
- **Correction syntaxique du Thème Sombre (`campaign-workspace.css`) :** Séparation en blocs CSS distincts et valides de `:root[data-theme="dark"]` et `@media (prefers-color-scheme: dark)` (qui étaient auparavant malencontreusement associés par une virgule invalide).
- **Restauration contextualisée du focus et non-divergence des saisies (`campaign-workspace.js` & `v5-aftermath-panel.js`) :**
  - Mémorisation du conteneur d'origine (`focusScope` : `detail`, `global`, `clock`) empêchant tout saut de focus intempestif vers une copie jumelle lors des re-rendus.
  - Synchronisation en direct au sein de `remember()` pour que deux champs partageant le même nom dans le DOM reflètent instantanément la même valeur sans divergence temporaire.
- **Preuves et assertions renforcées (`campaign-lot3-browser.mjs`) :**
  - Démonstration de bout en bout du traitement d'infection via l'UI (`Store.treatAftermathInfection`, remède, statut de reçu, incident guéri).
  - Démonstration du rétablissement complet après annulation (Undo -> Redo restaurant le jour 2 et l'horloge à 172800 s).
  - Contrôle mathématique de luminance relative et ratios de contraste WCAG : texte/fond sombre à 13.89:1 (AAA), texte/fond clair à 12.2:1 (AAA), et badges de statut >= 4.5:1 (AA).
- **Mémorisation de l'ouverture du volet d'ensemble :** L'élément `<details class="campaign-global-details">` conserve désormais son état ouvert/fermé entre les rerendus Store.
- **Résilience CSS dans Jouer :** Ajout de fallbacks sur `.workspace-aftermath-status` (`var(--panel-2)`, `var(--heading-color)`) pour garantir un affichage net du statut d'opération dans le volet *Suites de combat* de l'onglet *Jouer*.

---

## 6. Limites identifiées et décisions ouvertes

1. **Continuité d'identité entre rencontres (décision ouverte Codex/MJ) :**
   Actuellement, un participant qui quitte la rencontre active devient « absent » pour les soins opérationnels (le moteur Store cherchant soigneur et patient dans `combat.participants`). Le lot 3 affiche ces absents avec exactitude et permet leur archivage, mais ne crée pas d'identité persistante hors combat (réservé à une phase ultérieure de conception).
2. **Double accès Jouer / Campagne :**
   Conformément au mandat, les deux accès (*Suites de combat* dans Jouer et *Campagne*) restent simultanément opérationnels et partagent la même instance d'état UI et le même Store. La réorganisation complète de *Jouer* est planifiée pour le lot 4.
3. **Aperçu des effets futurs non mutants :**
   Le dialogue d'avance existant demande les entrées nécessaires (tests quotidiens de blessures non bandées, confirmations de matins) mais n'affiche pas une simulation exhaustive de tous les événements de campagne lointains (sorts, talents divins, etc.), ce qui est conforme à la décision de ne pas inventer d'aperçu non garanti par le moteur.

---

## 7. Actions hors périmètre

- **Aucune.** Aucune modification n'a été apportée aux catalogues, règles Firebase, schémas, fichiers de données, `index.html` (hors base lot 2), ni au worktree principal.
- **Aucun commit réalisé.** La branche `codex/campagne-lot3` est prête pour revue par Codex.
