# Protocole de recette — Outil MJ Warhammer

Recette manuelle de fin de projet. Compagnon de [`PLAN.md`](PLAN.md) : chaque vérification
renvoie au constat d'origine (`A-02`, `E-01`…) et au lot qui l'a traitée.

**Environnement de référence : Chrome sur macOS.** Aucun autre navigateur n'est à couvrir.

---

## Comment se servir de ce document

Les vérifications sont numérotées `§.n` (ex. `4.3`). En cas d'échec, noter **le numéro**, le
contenu de la console, et si le problème se reproduit après rechargement. C'est tout ce qu'il
faut pour diagnostiquer.

Chaque section porte le lot dont elle dépend : `L1` … `L13`. **Une section dont le lot n'est pas
livré se saute** — c'est ce qui rend les passes partielles possibles.

L'ordre des sections suit un usage naturel de l'outil, pas la numérotation des lots : on ne
reconstruit pas l'état entre chaque vérification.

Compter **45 à 60 minutes** pour une passe complète.

---

## 0. Préparation

### 0.1 — Remise à zéro complète

Indispensable avant une passe complète, sinon d'anciennes données faussent les résultats.
Vider les deux étages de persistance, **dans cet ordre** :

**a. Firebase** — console Firebase → Realtime Database → supprimer le nœud
`wfrp-sessions/{ton-uid}/current`. L'UID s'obtient dans la console du navigateur :

```js
firebase?.auth?.().currentUser?.uid   // ou simplement : lire le log « 🔥 Sync Firebase activé sur: … » au démarrage
```

**b. localStorage** — dans la console du navigateur, sur la page de l'outil :

```js
Object.keys(localStorage).filter(k => k.startsWith('wfrp.')).forEach(k => localStorage.removeItem(k));
location.reload();
```

> **Faire Firebase en premier.** Dans l'autre sens, le listener repeuple `localStorage` depuis
> le serveur avant même que tu aies rechargé, et tu repars avec les anciennes données.

### 0.2 — Console ouverte en permanence

Garder les DevTools ouverts sur l'onglet **Console** pendant toute la passe. Une bonne partie
des vérifications porte sur ce qui **ne doit pas** y apparaître.

### 0.3 — Jeu d'essai

Créer ces trois profils dans la Réserve (ou charger
[`tests/fixtures/ancien-format.json`](tests/fixtures/ancien-format.json), qui les contient
déjà). Les valeurs sont choisies pour que les calculs de dégâts tombent juste :

| Nom | Type | Groupe | Init | PV | E | BE | Armure |
|---|---|---|---|---|---|---|---|
| Renaut de Volargent | PJ | PJs | 41 | 14 | 35 | **3** | Tête 2, Corps 2 |
| Saskia la Noire | PJ | PJs | 52 | 12 | 40 | **4** | aucune |
| Gobelin | Créature | Peaux-Vertes | 28 | 9 | 30 | **3** | Corps 1 |

`BE = partie entière de E ÷ 10`. Il s'affiche sur chaque carte, ce qui permet de le contrôler
d'un coup d'œil.

---

## 1. Démarrage `L3` `L6`

| # | Action | Attendu |
|---|---|---|
| 1.1 | Charger l'application | L'écran de connexion Google s'affiche |
| 1.2 | Se connecter | L'écran disparaît, l'application apparaît, le nom d'utilisateur s'affiche |
| 1.3 | Lire la console | `✅ Firebase initialisé` et `🔥 Sync Firebase activé sur: …` — **aucune erreur rouge** |
| 1.4 | `L6` Taper `window.__WFRP_FIREBASE__` dans la console | `undefined` — le pont global a disparu (`C-04`) |
| 1.5 | Recharger 3 fois de suite | Démarrage identique à chaque fois, sans erreur ni doublon dans le journal |

---

## 2. Réserve `L1` `L3` `L4`

### Mise en forme (lot 1)

| # | Action | Attendu |
|---|---|---|
| 2.1 | Regarder la rangée de boutons sous le formulaire | « Ajouter » à gauche, « Exemple » et « Vider » **poussés à droite**, le tout **sur une seule ligne** (`B-01`) |
| 2.2 | Regarder « Suppr » sur un profil, et « Vider » | Tous deux **visiblement rouges**, distincts de « Éditer » et « Dupliq. » (`B-03`) |
| 2.3 | Regarder les compteurs de groupe `(2)`, le libellé « (facultatif — ex : PJs, Skaven…) » | **Plus pâles** que le texte courant (`B-02`) |
| 2.4 | Vider le filtre sur une réserve vide | « Aucun profil. » s'affiche en pâle, pas en noir |

### Fonctionnement

| # | Action | Attendu |
|---|---|---|
| 2.5 | Créer un profil avec un groupe inédit | Il apparaît sous son groupe, replié ou non, avec le bon compteur |
| 2.6 | Rouvrir le champ « Groupe » d'un nouveau profil | Le groupe créé en 2.5 est proposé en autocomplétion |
| 2.7 | Éditer un profil, changer son nom, valider | Le formulaire se réinitialise, le titre repasse à « Nouveau profil » |
| 2.8 | Dupliquer un profil deux fois | Suffixes numériques cohérents (`Gobelin 1`, `Gobelin 2`), sans collision |
| 2.9 | Filtrer par nom, puis par nom de groupe | Les deux filtrent |
| 2.10 | `L4` Cliquer « Exemple » | Les 4 profils apparaissent **d'un coup**, sans clignotement intermédiaire (`A-08`) |

### Vider la Réserve — le piège historique

| # | Action | Attendu |
|---|---|---|
| 2.11 | `L3` Cliquer « Vider » | La confirmation **annonce le nombre de profils** (`A-01`) |
| 2.12 | Confirmer | La réserve se vide **sans rechargement de page** |
| 2.13 | **Recharger (⌘R), attendre 5 s** | La réserve est **toujours vide** — c'est le cœur du test : avant le lot 3, Firebase la restaurait |
| 2.14 | Cliquer « Vider » sur une réserve déjà vide | Aucune confirmation, aucune erreur |

---

## 3. Import et piste de combat `L2` `L4`

| # | Action | Attendu |
|---|---|---|
| 3.1 | Recréer le jeu d'essai (§0.3), puis dupliquer le Gobelin jusqu'à en avoir 12 | 14 profils au total |
| 3.2 | `L4` « Imp. Réserve » → tout sélectionner → Importer | Import **instantané**, sans clignotement — et **un seul** « Import: 14 participant(s) » au journal (`A-08`) |
| 3.3 | Vérifier les cartes | Toutes en zone **Réserve tactique**, aucune en zone active |
| 3.4 | Vérifier les jets pré-configurés | Chaque carte porte les lignes de jet de son profil, avec leur libellé |
| 3.5 | Regarder l'armure sur une carte | `🛡️ BE 3` pour Renaut, avec le détail `T2 C2 B0 J0` |

### Glisser-déposer

| # | Action | Attendu |
|---|---|---|
| 3.6 | `L2` Glisser 4 cartes vers la zone active | Elles s'y déposent, la zone perd son texte d'invite |
| 3.7 | `L2` Réordonner deux cartes **dans** la zone active | Le nouvel ordre s'affiche **immédiatement**, pas une seconde plus tard (`A-06`) |
| 3.8 | Glisser une carte de l'active vers le banc, puis la ramener | Aucune carte perdue, aucun doublon |
| 3.9 | Recharger la page | Zones et ordre exactement conservés |

---

## 4. Déroulé d'un combat `L2` `L5` `L7`

Préalable : 3 combattants en zone active (Saskia 52, Renaut 41, Gobelin 1 → 28) et au moins un
au banc **avec une initiative supérieure à toutes les autres** (mettre Gobelin 2 à 99).

| # | Action | Attendu |
|---|---|---|
| 4.1 | `L2` Cliquer « Démarrer » | Round 1, tour sur **Saskia** — pas sur le Gobelin 2 du banc malgré son initiative 99 (`A-05`) |
| 4.2 | Vider la zone active, cliquer « Démarrer » | Journal : « Aucun combattant en zone active », aucun plantage |
| 4.3 | `L2` Enchaîner « Tour suivant » | Saskia → Renaut → Gobelin 1 → **Round 2** sur Saskia. Le banc n'apparaît jamais |
| 4.4 | Pendant le tour de Renaut, réordonner les cartes par glisser-déposer | Le liseré « tour en cours » **reste sur Renaut** (`A-02`) |
| 4.5 | Pendant le tour de Renaut, l'envoyer au banc, puis « Tour suivant » | Reprise au premier actif, **sans incrémenter le round**, sans plantage |
| 4.6 | Pendant le tour de quelqu'un, le supprimer (✕), puis « Tour suivant » | Idem, aucune erreur console |
| 4.7 | Ne laisser qu'un seul combattant actif, cliquer « Tour suivant » | Le round s'incrémente à chaque clic, le tour reste sur lui |

### Points de vie `L5`

| # | Action | Attendu |
|---|---|---|
| 4.8 | Saisir `8` dans le champ PV, presser **Entrée** | Les PV **baissent** de 8 ; le champ se vide et **garde le focus** (`E-01`) |
| 4.9 | Enchaîner immédiatement `3` + Entrée | Fonctionne sans reclic — c'est l'objectif du lot |
| 4.10 | Champ vide, cliquer `−` puis `+` | −1 puis +1 |
| 4.11 | Regarder le badge PV | Format `PV 4 / 14` — le maximum est affiché |
| 4.12 | Descendre sous le quart des PV max | Le badge passe au **rouge** |
| 4.13 | Descendre à 0 ou moins | Badge nettement distinct ; les PV **peuvent** passer sous zéro |
| 4.14 | Remonter au-delà du maximum | Bloqué au maximum |
| 4.15 | Cliquer sur le badge PV | Édition en ligne de la valeur absolue ; `Échap` annule, `Entrée` valide |
| 4.16 | Recharger | `maxHp` conservé, format `x / y` intact |

### États et effets automatiques `L2`

| # | Action | Attendu |
|---|---|---|
| 4.17 | Ajouter « Hémorragique » sans durée, puis passer son tour | −1 PV, entrée `🩸` au journal |
| 4.18 | Ajouter « Hémorragique » ×2 (deux fois), passer le tour | −2 PV |
| 4.19 | Ajouter « Sonné » avec durée `2`, passer 2 tours | Le badge affiche `×2` puis `×1`, puis l'état disparaît avec `⏱ … expiré` |
| 4.20 | Ajouter « Surpris », passer le tour | Il se dissipe automatiquement |
| 4.21 | Ajouter « Enflammé » au Gobelin (BE 3, Corps 1), passer le tour | Journal détaillé `1d10(n) − BE(3) − armure(0) + niveaux(1)` — l'armure retenue est **la plus faible**, donc 0 ici, pas 1 |
| 4.22 | Amener quelqu'un à 0 PV par saignement | État **Inconscient** ajouté automatiquement, `💀` au journal |
| 4.23 | Cliquer sur un badge d'état | Il se retire |

---

## 5. Jets de dés `L1` `L7` `L13`

| # | Action | Attendu |
|---|---|---|
| 5.1 | Cliquer 🎲 sur une ligne de jet | Résultat en tête du flux : valeur, Réussite/Échec, DR, nom, note |
| 5.2 | Relancer jusqu'à obtenir un **double réussi** (11, 22…) | Badge « Critique » **vert**, plus le bloc de coup critique avec localisation et effet (`B-04`) |
| 5.3 | Relancer jusqu'à un **double raté** | Badge « Maladresse » **rouge** |
| 5.4 | `L6` Obtenir un `00` (100) réussi | Compté comme **double** — décision arrêtée §6.6 |
| 5.5 | Ajouter « Sonné » + « Aveuglé » au lanceur, relancer | Score cible réduit de **20**, badge de malus affiché avec le détail |
| 5.6 | Cliquer « Effacer les jets » | Le flux se vide **sans confirmation** (`A-10`) |
| 5.7 | Cliquer « Lancer d100 » | Jet simple, sans cible ni localisation |

### Calcul des dégâts `L7`

Cible : **Renaut**, BE 3, armure Corps 2. Régler la ligne de jet sur `Dég. 6`, cible Renaut.

| # | Action | Attendu |
|---|---|---|
| 5.8 | Réussir un jet avec **2 DR** touchant le **Corps** | `6 + 2 − (3 + 2) = 3` — détail du calcul **visible** |
| 5.9 | Cliquer « Appliquer −3 PV » | Les PV de Renaut baissent de 3, journal mis à jour, le bouton **se grise** |
| 5.10 | Recliquer sur le même bouton | Sans effet — pas de double application |
| 5.11 | Passer `Dég.` à 4 et obtenir 0 DR sur le Corps | `4 + 0 − 5 = −1 → 1 minimum` — le plancher est **annoncé**, pas masqué |
| 5.12 | Activer `Inof.` et refaire 5.11 | `4 + 0 − (3 + 2×2) = −3 → 0 (Inoffensive)` — PA doublés **et** plancher levé |
| 5.13 | Toucher la **Tête** de Renaut (armure 2) puis un **Bras** (armure 0) | L'armure retenue change selon la localisation |
| 5.14 | Viser un combattant **à 0 PV** | Critique automatique **sans double** (« Acharnement »), gravité **+10**, état « À Terre » ajouté |
| 5.15 | Supprimer le combattant sélectionné comme cible | Les lignes qui le visaient repassent à « aucune cible », sans erreur |

### Mots-clés `L13`

| # | Action | Attendu |
|---|---|---|
| 5.16 | Ouvrir le sélecteur de mots-clés | Les 31 mots-clés du Sheet sont listés |
| 5.17 | Sélectionner « Percutante », lancer | Le dé des unités est ajouté aux dégâts, visible dans le détail |
| 5.18 | Sélectionner « Impact » à la place | **Résultat identique** — c'est un alias |
| 5.19 | Sélectionner un mot-clé du palier 3 (ex. « Lent ») | Son texte s'affiche en rappel, **aucun calcul n'est tenté**, aucune erreur |
| 5.20 | Modifier une ligne dans le Google Sheet, cliquer « Recharger depuis le Sheet » | Le changement apparaît **sans redéploiement** |
| 5.21 | Ajouter un mot-clé inventé dans le Sheet, recharger | Il apparaît, sélectionnable, non calculé, console propre |

---

## 6. Synchronisation `L3` `L9`

**La section la plus importante, et la seule qu'une relecture de code ne peut pas remplacer.**

### Écho et frappe

| # | Action | Attendu |
|---|---|---|
| 6.1 | Cliquer dans un champ « Note » d'une ligne de jet et taper une phrase longue **en marquant 2 s de pause au milieu** | Le curseur **ne saute jamais**, aucun caractère perdu, le champ ne se vide pas (`A-03`) |
| 6.2 | Idem dans le champ « Score » | Idem |
| 6.3 | Après la frappe, recharger | Le texte saisi est bien enregistré |

### Deux onglets

| # | Action | Attendu |
|---|---|---|
| 6.4 | Ouvrir un **second onglet** sur l'outil | Il affiche le même état |
| 6.5 | Onglet A : modifier des PV | Onglet B se met à jour en **moins d'une seconde** |
| 6.6 | Onglet A : vider la Réserve | Se vide aussi dans B |
| 6.7 | Onglet B : taper dans un champ pendant qu'A modifie autre chose | La frappe dans B n'est pas interrompue |
| 6.8 | `L9` Onglet Network → filtre **WS**, modifier **un seul** PV | La trame ne contient **que ce participant**, pas la réserve entière (`D-02`) |

### Hors ligne — le scénario qui protège le travail

| # | Action | Attendu |
|---|---|---|
| 6.9 | DevTools → Network → **Offline** | L'application continue de fonctionner |
| 6.10 | Hors ligne : modifier des PV, ajouter un état, renommer une note | Tout est pris en compte localement |
| 6.11 | Repasser **Online** | Le travail local **n'est pas écrasé** (`A-04`) |
| 6.12 | Lire la console | Si un réalignement a eu lieu : `⚠️ Données serveur plus anciennes que l'état local`, suivi d'une remontée du local |
| 6.13 | Recharger après reconnexion | L'état est celui du travail hors ligne |

---

## 7. Fichiers et persistance `L2`

| # | Action | Attendu |
|---|---|---|
| 7.1 | « 💾 Sauvegarder » | Fichier `wfrp-save-AAAA-MM-JJ.json` téléchargé |
| 7.2 | Ouvrir le fichier | Contient `currentActorId`, **pas** `turnIndex` ; le journal y figure (`§9.2`) |
| 7.3 | Modifier l'état en cours, puis recharger ce fichier | L'état sauvegardé est restauré |
| 7.4 | Charger un fichier volontairement corrompu | Message d'erreur clair, application intacte |

### Migration de l'ancien format — **vérification unique**

| # | Action | Attendu |
|---|---|---|
| 7.5 | Charger [`tests/fixtures/ancien-format.json`](tests/fixtures/ancien-format.json) | Chargement accepté |
| 7.6 | Regarder la pilule « Tour » | **Renaut de Volargent** — le fichier a `turnIndex: 1` et l'ordre `[Saskia, Renaut, Gobelin 1]` (`A-02`) |
| 7.7 | Vérifier le round | **3** |
| 7.8 | Vérifier les états | Renaut : « Hémorragique » et « Sonné ×2 » ; Gobelin 1 : « Enflammé » |
| 7.8b | `L5` Regarder le badge PV de Renaut | **`PV 9 / 14`** — le fichier ne contient aucun `maxHp` ; le maximum doit être retrouvé sur le **profil source**, pas recopié des PV courants |
| 7.9 | Vérifier les zones et couleurs | Gobelin 2 au banc ; PJs en vert, gobelins en rouge |
| 7.10 | Cliquer « Tour suivant » | Passe au Gobelin 1 (initiative 28, après Renaut 41) |

> Ce fichier est le **seul témoin** de l'ancien format. Ne jamais le régénérer avec
> l'application : elle écrirait `currentActorId` et le test perdrait tout objet.

---

## 8. Fin de combat et journal `L2` `L4` `L10`

| # | Action | Attendu |
|---|---|---|
| 8.1 | `L2` Cliquer « Terminer le combat » | Confirmation, puis les deux zones se vident, Round `0`, Tour `–` (`A-10`) |
| 8.2 | Vérifier que la Réserve est intacte | Les profils sont toujours là — seule la piste est vidée |
| 8.3 | `L4` Générer plus de 300 entrées de journal (jets répétés), recharger | L'application démarre sans lenteur, le journal est **plafonné à 300** (`A-07`) |
| 8.4 | `L10` Supprimer un participant, cliquer « Annuler » | Il revient **à l'identique** : zone, états, couleur, lignes de jet (`E-04`) |
| 8.5 | `L10` Refaire avec `⌘Z` | Même effet |
| 8.6 | `L10` Filtrer l'historique sur un combattant | Seules ses entrées restent (`E-11`) |

---

## 9. Confort d'usage `L10`

| # | Action | Attendu |
|---|---|---|
| 9.1 | Cliquer le badge « Init » d'une carte | Édition **en ligne**, aucune boîte de dialogue native (`E-07`) |
| 9.2 | Charger un fichier | Confirmation par **toast**, pas par `alert()` |
| 9.3 | Presser `N` puis `Espace`, focus hors champ | Le tour avance (`E-10`) |
| 9.4 | Presser `N` **avec le focus dans un champ de note** | La lettre « n » s'écrit, **aucun tour ne passe** — piège classique |
| 9.5 | Presser `D` | Jet de d100 |
| 9.6 | Presser `1`, `2`, `3` | Bascule Réserve / Combat / Règles |
| 9.7 | Ouvrir la palette de couleurs, presser `Échap` | Elle se ferme |
| 9.8 | Ouvrir la palette | Chaque pastille porte **son libellé** (Ennemi, Allié, Magie, Chaos, Boss) (`E-12`) |
| 9.9 | `L10` Regarder la barre supérieure | Le bouton version n'affiche que `v3.x` ; le nom d'utilisateur est **dans** la barre, sans chevauchement (`E-13`) |
| 9.10 | Réduire la fenêtre à 900 px de large | Rien ne se chevauche dans la barre supérieure |

---

## 10. Règles et référence `L8`

| # | Action | Attendu |
|---|---|---|
| 10.1 | Ouvrir l'onglet Règles | Les cinq blocs sont présents, contenu **identique** à avant le lot 8 |
| 10.2 | Déplier les tables de critiques | Les quatre tables (Tête, Bras, Corps, Jambe) sont complètes, bornes cohérentes |
| 10.3 | Déplier les tables d'incantations imparfaites | Mineure et Majeure complètes |
| 10.4 | Chercher « Brisé » | Peur & Terreur et Santé remontent, **dépliés** |
| 10.5 | Chercher une chaîne absente | Message « Aucun résultat » clair |

---

## 11. Thème et accessibilité `L11`

| # | Action | Attendu |
|---|---|---|
| 11.1 | Basculer en thème sombre | Aucune zone illisible sur les **trois** panneaux |
| 11.2 | En sombre : ouvrir la modale d'import, la palette de couleurs, un toast, les tables de règles | Aucune couleur en dur oubliée (fond clair résiduel, texte noir sur noir) |
| 11.3 | Régler macOS en sombre, thème sur « système » | L'application suit |
| 11.4 | Recharger | Le choix de thème est conservé |
| 11.5 | Regarder un badge d'état (Sonné, Hémorragique) | Contraste confortable — le seuil AA est franchi dans les deux thèmes (`E-06`) |
| 11.6 | Parcourir toute l'application à la touche `Tab` | Le focus est **toujours visible** |
| 11.7 | Sur les onglets, utiliser les **flèches** gauche/droite | La navigation fonctionne (`E-08`) |
| 11.8 | Inspecter un onglet actif | `aria-selected="true"`, et `false` sur les autres |

---

## 12. Hors-ligne et déploiement `L12`

| # | Action | Attendu |
|---|---|---|
| 12.1 | Charger l'application une fois **en ligne**, puis passer **Offline** et recharger | Elle **démarre**, affiche les données locales et un bandeau hors-ligne (`D-01`) |
| 12.2 | Hors ligne : vérifier polices et texture de fond | Cinzel et Lora s'affichent, la texture est là — tout est servi localement |
| 12.3 | Repasser en ligne | La synchronisation repart, rien n'est perdu |
| 12.4 | DevTools → Application → Manifest | Aucune erreur, icônes présentes (`D-03`) |
| 12.5 | Regarder l'onglet du navigateur | Le favicon s'affiche |
| 12.6 | Déployer une modification, recharger **sans vider le cache** | La nouvelle version est servie — plus besoin de ⌘⇧R |

---

## 13. Non-régression automatique `L6`

À lancer avant la passe manuelle : si ça échoue, inutile d'aller plus loin.

```bash
npm test        # ou : node --test tests/
```

| # | Attendu |
|---|---|
| 13.1 | Tous les tests passent, **sans `npm install` préalable** — le lanceur de Node suffit, zéro dépendance |
| 13.2 | Couverture : `dice.test.js`, `states.test.js`, `damage.test.js` |
| 13.3 | Console vide de tout avertissement de dépréciation |

---

## Fiche de relevé

| Section | Lot | Résultat | Notes |
|---|---|---|---|
| 0. Préparation | — | ☐ | |
| 1. Démarrage | L3 L6 | ☐ | |
| 2. Réserve | L1 L3 L4 | ☐ | |
| 3. Import et piste | L2 L4 | ☐ | |
| 4. Déroulé de combat | L2 L5 L7 | ☐ | |
| 5. Jets de dés | L1 L7 L13 | ☐ | |
| 6. Synchronisation | L3 L9 | ☐ | |
| 7. Fichiers | L2 | ☐ | |
| 8. Fin de combat et journal | L2 L4 L10 | ☐ | |
| 9. Confort | L10 | ☐ | |
| 10. Règles | L8 | ☐ | |
| 11. Thème et accessibilité | L11 | ☐ | |
| 12. Hors-ligne | L12 | ☐ | |
| 13. Tests automatiques | L6 | ☐ | |

---

## Les huit vérifications à ne pas sauter

Si le temps manque, ce sont celles qui couvrent les bugs les plus coûteux — chacune correspond
à un défaut qui a réellement existé dans le code.

| # | Ce qu'elle protège |
|---|---|
| **2.13** | « Vider la Réserve » restait inopérant : Firebase restaurait tout au rechargement |
| **4.1** | Le combat pouvait s'ouvrir sur un combattant du banc |
| **4.4** | Le tour dérivait silencieusement sur un autre combattant à chaque réordonnancement |
| **5.12** | Inoffensive doit doubler les PA **et** lever le plancher — les deux effets |
| **6.1** | Le champ perdait le focus en pleine frappe, 300 ms après la dernière touche |
| **6.11** | Le retour de connexion écrasait le travail fait hors ligne |
| **7.6** | Les anciennes sauvegardes doivent rouvrir sur le bon combattant |
| **12.1** | L'application doit démarrer sans réseau — c'est en séance que le wifi lâche |
