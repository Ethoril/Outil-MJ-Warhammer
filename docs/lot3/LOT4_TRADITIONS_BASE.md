# Lot 4 — inventaire des traditions magiques du livre de base (LOT4_TRADITIONS_BASE)

20 octobre 2026 — worktree `glm-inv-D0a`, branche `glm/inv-D0a`. Inventaire documentaire uniquement : aucun code, aucun test modifié. Données structurées dans [LOT4_TRADITIONS_BASE.json](LOT4_TRADITIONS_BASE.json).

## Objet, méthode et sources

Sept traditions du livre de base absentes du catalogue de sorts : **Magie naturelle (Hedgecraft)** — avec les neuf sorts complémentaires d'AOTE3 —, **Sorcellerie (Witchcraft)**, **Demonologie**, **Nécromancie**, et les trois **Domaines du Chaos** (Nurgle, Slaanesh, Tzeentch). Socle : L06 (`Livre de base V5 EN v2.pdf`, pages imprimées = pages physiques). Noms français : L05 (`Livre de base FR.pdf`, V4 ; page physique = page imprimée + 2). Sorts Hedgecraft complémentaires : L02 (`Archives of the Empire 3.pdf`, pp. 60-65, spells pp. 62-64). L03 (`Archives of the Empire Volume 1.pdf`) a été contrôlé et ne contient aucun sort de ces traditions (grep négatif : seules des mentions de background). Note de corpus : `docs/divin/DIVIN_CORPUS_LIVRES.json` liste 17 livres (L01-L17) ; l'identifiant L18 mentionné dans la commande n'existe pas.

Les résumés sont reformulés ; les pages citées sont les pages imprimées des ouvrages.

## Statut courant (preuves d'absence)

Les 42 sorts inventoriés sont **tous absents** du catalogue :

- `js/data/v5-spell-contracts.json` : 277 contrats, 13 domaines seulement (`arcane, beasts, death, elven-arcane, elven-petty, fire, heavens, high, life, light, metal, petty, shadow`) — aucun des sept domaines visés.
- `docs/lot3/LOT3_CADRAGE_MAGIE.md:18` : « Les sorts de sorcellerie, magie sombre et Chaos absents du catalogue ne sont pas ajoutés par cet audit » — exclusion documentée du Lot 3.
- `docs/lot3/LOT3_SUIVI_EXHAUSTIF_MAGIE.json` : ces traditions n'apparaissent qu'en référence croisée (dissipation gratuite de Bannissement Majeur), jamais comme sorts inventoriés.

## Règles communes (L06)

Lancer un sort : Test Accessible (+0 DR) en Language (Magick) (L06 p. 235). Ingrédients : déclarés avant le Test d'Incantation, ils abaissent le niveau d'Incantation Imparfaite d'un cran et coûtent la moitié du NI en pistoles d'argent (L06 p. 235). Influence corruptrice : tout jet devant donner une Incantation Imparfaite Mineure bascule sur la table Majeure (L06 p. 237). Certaines entrées des tables d'Incantations Imparfaites accordent des Points de Corruption (L06 p. 238). Aucune règle V5 n'accorde de Point de Corruption pour la simple incantation de Dhar ; la V4 (L05 p. 255) en imposait un par Incantation Imparfaite de Sorcellerie — écart à arbitrer (sélecteur MJ).

---

## 1. Magie naturelle — Lore of Hedgecraft (L06 pp. 255-256 ; L05 pp. 254-255 ; L02 pp. 60-64)

**Nom FR officiel (L05 p. 254)** : « Le Domaine de la Magie naturelle ». L'appellation « Magie de la Haie » fournie dans la commande n'apparaît pas dans L05 — à arbitrer.

**Règles spécifiques**
- **Attribut de domaine (L06 p. 255)** : les sorts de la tradition ne peuvent pas être lancés sans ingrédients, partie intégrante du processus d'incantation.
- **Ingrédients (L06 p. 255)** : Test Savoir (Folklore) Accessible (+2 DR) après 2 heures de travail → 1 + DR ingrédients ; ou achat à 5 sous de cuivre l'unité. Matériaux locaux faciles à trouver, préparés avec exigence. Variante V4 (L05 p. 254) : récolte via Savoir (Herboristerie) en cherchant nourriture et herbes.
- **Incantation** : standard (Language (Magick)) ; tradition informelle transmise de maître à élève, hors Colleges, hors-la-loi dans l'Empire (L06 p. 234 ; L02 pp. 60-61 : les sorciers de village privilégient des explications naturelles et se dissimulent).
- **Corruption** : rien de propre en V5 ; règles générales uniquement (L06 pp. 237-238).
- **Familiers** : aucune règle dans L06 ni L05.

### Sorts du livre de base (L06, tous CN 0)

| Sort (EN) | Nom FR | CN | Portée | Cible | Durée | Mécaniques clés | Contrat similaire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Goodwill (p. 255) | Bonne Volonté (off., L05 p. 254) | 0 | Vous | ZdE (Bonus de Sociabilité) m | (BFM) minutes | +1 DR aux Tests de Sociabilité en zone ; Animosité et Haine neutralisées | Cœurs Enflammés, `v5-spell-contracts.json:746` |
| Halãtha's Joy (p. 255) | Joie de Halãtha *(proposé)* | 0 | Toucher | 1 | (Bonus de Sociabilité) heures | Bénédiction de fertilité : conception si biologiquement possible ; fin « quand utilisé » | Don de Vie (thématique), `:7488` |
| Mirkride (p. 256) | Chevaucher l'Obscurité (off., L05 p. 254) | 0 | Vous | Vous | (BFM) minutes | Esprit Ethéré dans la Haie, invisible et silencieux ; corps insensible ; dégât magique termine le sort ; corps tué → errance éternelle | Projection Spirituelle, `:2059` |
| Nepenthe (p. 256) | Nepenthés (off., L05 p. 254) | 0 | Toucher | Spécial | (BFM) heures | Philtre : oubli permanent et volontaire d'un individu | Effacement d'esprit, `:16156` |
| Nostrum (p. 256) | Panacée (off., L05 p. 254) | 0 | Toucher | Spécial | (Bonus de Dextérité) heures | Potion : soigne (Bonus de Dextérité) Blessures + 1 maladie, +1 par +2 DR | Purification du Corps (Ghyran & Hysh), `:10572` |
| Part the Branches (p. 256) | Séparer les branches (off., L05 p. 255) | 0 | Vous | Vous | (Initiative) minutes | Vision des créatures invisibles | Percer le Voile, `:10090` |
| Protective Charm (p. 256) | Charme protecteur (off., L05 p. 254) | 0 | Toucher | Spécial | (BFM) jours | Breloque : +2 DR pour résister aux effets magiques et à la Corruption | Bouclier magique, `:13852` |
| Shepherd's Eye (p. 256) | Œil du berger *(proposé)* | 0 | Spécial | Spécial | Instantanée | Scrying : lien organique dans un bol d'eau ; après 10 − BI minutes, localisation de la créature | Divination, `:2352` |

### Sorts complémentaires AOTE3 (L02 pp. 62-64, édition V4 — à convertir)

| Sort (EN) | Nom FR | CN | Portée | Cible | Durée | Mécaniques clés | Contrat similaire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dagger of the Art (p. 62) | Dague de l'Art *(proposé)* | 4 | Vous | Vous | (BFM) Rounds | Bâtonnet → dague Magique ; SB + 8 contre Éthérés/Corrompus ; conservable via Test de Focalisation (+0) par Round | Arme enchantée, `:3580` |
| Fellstave (p. 62) | Borne sinistre *(proposé)* | 9 | Voir texte | Voir texte | 1 mois | Poteau ward : type de créature choisi à l'apprentissage ; à 100 m, Test de Calme (+0) sinon Brisé ; apprentissages multiples | Sanctifier, `:12039` |
| Invigorer (p. 63) | Revigorer *(proposé)* | 2 | Toucher | 1 | (BFM) Rounds | La cible ignore tous les états Exténué | Calme, `:10867` |
| Lovelock (p. 63) | Philtre d'amour *(proposé)* | 10 | Toucher | Voir texte | Jusqu'à minuit | Miel-charme : amour pour la première personne attirante | Glamour de Teclis (loin), `:5107` |
| Protection Pouch (p. 63) | Sachet de protection *(proposé)* | 5 | Toucher | Voir texte | 1 sem. + 1/DR | Sachet-porte : +1 DR Calme contre Peur/Terreur surnaturelles ; +1 DR Résistance contre maladies et poisons | Protection de Phâ, `:8914` |
| Sightstep (p. 64) | Pas imperceptible *(proposé)* | 7 | Vous | Vous | (BFM) minutes | Aura magique masquée ; +2 DR Discrétion contre démons/esprits/Éthérés ; incantation, dissipation et focalisation interdites | Aura ordinaire, `:12979` |
| Silvertide (p. 64) | Marée d'argent *(proposé)* | 4 | Vous | Vous | 1d10 heures | Chance aux pièces perdues : 1d10 sous de cuivre au total | L'Or du Fou, `:3723` |
| The Ousting (p. 64) | L'Expulsion *(proposé)* | 8 | (BFM) m | 1 | 1d10 ans | Bannissement : Test FM (+0) sinon (BFM) Blessures ; à 0 → renvoi pour la durée | Bannissement Mineur (Hysh & Shyish), `:10401` |
| Wyrd Ward (p. 64) | Protection contre le wyrd *(proposé)* | 4 | Toucher | 1 | (BFM) heures | Test opposé de FM ; victoire : −2 DR à Language (Magick)/Focalisation pour Sorcellerie, Nécromancie, Démonologie et Domaines du Chaos | Destruction des Arcanes, `:4509` |

**Variantes L02 des sorts de base** : Goodwill (bonus V4 +10, durée en Rounds — L02 p. 63), Mirkride (traverse les obstacles non magiques, immunisé aux dégâts non magiques, peut lancer des sorts agissant sur le monde — L02 p. 63, contrairement à L06 p. 256), Nepenthe, Nostrum (soigne Bonus de FM au lieu de Dextérité), Part the Branches, Protective Charm (talent Résistance à la magie au lieu de +2 DR — L02 p. 64). Le socle V5/L06 prime ; les écarts sont listés dans le JSON.

**Questions ouvertes**
1. Libellé FR : « Domaine de la Magie naturelle » (L05 p. 254) ou « Magie de la Haie » (intitulé fourni, absent de L05) ? Sélecteur MJ.
2. Les 9 sorts AOTE3 (V4) demandent une conversion aux conventions V5 (DR, états) — arbitrage valeur par valeur.
3. Mirkride : la variante L02 permet de lancer des sorts depuis la Haie ; L06 l'interdit (« not affect it in any way »). Quelle version retenir ?
4. Halãtha's Joy : sens exact de la fin « quand utilisé » (tentative de conception ? rapport ? naissance ?) — arbitrage MJ.
5. Shepherd's Eye : comportement si la créature est protégée ou hors de portée du monde — arbitrage MJ.
6. Familiers : importer les familiers génériques de L17 (WoM V4, pp. 180-184) ou attendre un supplément V5 ? Sélecteur MJ.

---

## 2. Sorcellerie — Lore of Witchcraft (L06 pp. 256-257 ; L05 pp. 255-256)

**Nom FR officiel (L05 p. 255)** : « Le Domaine de la Sorcellerie ».

**Règles spécifiques**
- **Incantation** : le domaine se focalise avec Focalisation (Dhar) ou Focalisation (Magick) (L06 p. 256) ; pratique autodidacte hors-la-loi, la sorcellerie non autorisée est passible de mort (L06 p. 234).
- **Ingrédients (règle V5, L06 p. 256)** : les ingrédients ne réduisent le niveau d'Incantation Imparfaite que si le jet donne 01-40 (on garde le résultat si l'on descend de table) ; coût = NI du sort en sous de cuivre ; ou 2 heures de récolte, Test Accessible (+2 DR) en Savoir (Herbes), Survie en extérieur ou Poser un piège → 1 + DR ingrédients.
- **Aucun attribut de domaine en V5**. Écart V4 (L05 p. 255) : chaque jet d'Incantation Imparfaite infligeait 1 Point de Corruption au sorcier dissident ; tout sort du domaine permettait d'infliger 1 Hémorragie à la cible ; l'ingrédient évitait le jet obligatoire sur la table Mineure — base à arbitrer.
- **Familiers** : mentionnés sans règles — « sorcières ou leurs familiers » sont immunisés contre Horreur hantante (L06 p. 257) ; aucune règle de familier dans L06 ni L05.

### Sorts (L06)

| Sort (EN) | Nom FR | CN | Portée | Cible | Durée | Mécaniques clés | Contrat similaire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Blight (p. 256) | Dégradation (off., L05 p. 255) | 14 | (BFM) m | Spécial | Instantanée | Fléau : taverne/puits/champ/animal — denrées gâtées, eau saumâtre, cultures pourries, bête improductive morte en 24 − DR jours | Putréfaction, `:15196` ; inverse : Don de Vie, `:7488` |
| Creeping Menace (p. 257) | Menace rampante (off., L05 p. 256) | 6 | (FM) m | 1 | (BFM) Rounds | Nuées (rats/araignées géantes + Trait Nuée) Engagent la cible ; Test d'Emprise sur les animaux (+0) pour rediriger | Vol du Destin, `:5888` |
| Curse of Crippling Pain (p. 257) | Malédiction de douleur paralysante (off., L05 p. 255) | 10 | (FM) m | 1 | (BFM) Rounds | Poupée poignardée : Corps (Exténué + Test Résistance −20 sinon À Terre), Tête (Sonné + Test sinon aggravé), Membre (inutilisable) ; Action + Focalisation (+2 DR) pour une nouvelle localisation | Flétrissement des Membres, `:11886` |
| Curse of Ill Fortune (p. 257) | Malédiction de malchance (off., L05 p. 255) | 8 | (FM) m ou (BFM) miles avec ingrédient | 1 | (BFM) minutes ou jours avec ingrédient | −1 DR à tous les Tests ; Chance inutilisable ; sans Chance, relance des 01-05 ; ingrédient (possession/cheveu) ignore la ligne de vue | Malédiction du Destin, `:2291` |
| Glamour (p. 257) | Glamour *(proposé)* | 4 | Toucher | 1 adulte | (BFM) heures | Changement d'âge apparent dans les limites de l'âge adulte | Doppelgänger, `:15780` |
| Haunting Horror (p. 257) | Horreur hantante (off., L05 p. 255) | 8 | Toucher | Spécial (lieu) | (FM) jours | Lieu hanté : +1 Exténué à l'entrée ; Test de Calme (+0) sinon +1 Exténué et Brisé jusqu'à la sortie ; sorcières et familiers immunisés | Horreurs Noires, `:15514` |
| Make Hale (p. 257) | Bonne santé *(proposé)* | 4 | Toucher | 1 | Instantanée | Soigne (BFM) Blessures ; retire 1 Exténué et 1 Sonné ; à +3 DR, portée (BFM) m | Lumière guérisseuse, `:9540` |
| The Evil Eye (p. 257) | Mauvais œil (off., L05 p. 255) | 6 | 10 m max | 1 max | Instantanée | Intimidation/Calme opposé + DR d'Incantation ; victoire : Peur (1) du lanceur, 1 Exténué (+1 par +3 DR) ; +6 DR : Brisé | Effrayant, `:13198` |

**Questions ouvertes**
1. Familiers : L06 suppose des familiers de sorcière sans règle ; importer L17 (WoM V4, pp. 180-184) ? Sélecteur MJ.
2. Base V4 ou V5 pour la Corruption/Hémorragie de la Sorcellerie (L05 p. 255 contre L06 p. 256) ? Sélecteur MJ.
3. The Evil Eye : la Peur (1) est-elle permanente ou limitée à la rencontre ? Arbitrage MJ.
4. Creeping Menace : sort des nuées si le lanceur meurt avant la fin — non précisé dans L06.

---

## 3. Démonologie — Lore of Daemonology (L06 p. 258 ; L05 p. 256)

**Nom FR officiel (L05 p. 256)** : « Le Domaine de Démonologie ».

**Règles spécifiques**
- **Incantation** : magie noire (Dhar) ; invocation, liaison et contrôle des démons, le plus souvent au prix de l'âme du démonologue, devenue celle d'un nouveau Sorcier du Chaos (L06 p. 258).
- **Ingrédients / Corruption / Familiers** : rien de propre en V5 ; règles générales (L06 pp. 235, 237-238).
- **Aucun attribut de domaine** (L06 p. 258) — à arbitrer.

### Sorts (L06 p. 258)

| Sort (EN) | Nom FR | CN | Portée | Cible | Durée | Mécaniques clés | Contrat similaire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Destroy Lesser Daemon | Destruction de Démon Mineur (off., L05 p. 256) | 6 | (BFM) m | 1 démon Taille (Moyenne) ou moins | (BFM) Rounds | Résistance opposée (+4 DR) contre l'Incantation ; victoire : destruction et +10 à une Caractéristique pour la durée | Fléau des Démons, `:9368` |
| Detect Daemon | Détection de démon (off., L05 p. 256) | 4 | (FM) m | Spécial | Instantanée | Connaissance automatique de toute présence démoniaque manifeste (invoqué, lié, possesseur) | Révéler la Magie, `:11043` |
| Manifest Lesser Daemon | Manifestation de Démon Mineur (off., L05 p. 256) | 8 | (BFM) m | Spécial | (BFM) Rounds | Démon Mineur manifesté (Sanguinaire/Daemonette, p. 349) ; Focalisation (Dhar)/FM opposée ; succès : un ordre au pied de la lettre puis disparition ; échec : attaque | Invocation de Monture (plus proche), `:6852` |
| Octagramme | Octogramme (off., L05 p. 256) | 10 | Toucher | ZdE (BI m de diamètre max) | (FM) minutes | Octogramme au sol : les créatures Démoniaques ne peuvent ni entrer ni sortir (variante L05 : sorties si FM double du lanceur) | Sanctifier, `:12039` |

**Questions ouvertes**
1. Parité de traitement : ni attribut ni règle d'ingrédients en V5 — sélecteur MJ.
2. Octogramme : conserver la clause d'évasion V4 (L05 p. 256) ?
3. Manifestation : comportement du démon si l'ordre est inachevé à la fin de la durée — arbitrage MJ.
4. Destruction : quelle Caractéristique reçoit le +10 et qui choisit — arbitrage MJ.

---

## 4. Nécromancie — Lore of Necromancy (L06 pp. 258-259 ; L05 pp. 256-257)

**Nom FR officiel (L05 p. 256)** : « Le Domaine de Nécromancie ».

**Règles spécifiques**
- **Incantation** : magie noire (Dhar) ; maîtrise de la mort et quête d'immortalité au prix des cadavres (L06 p. 258) ; discipline combattue par le culte de Morr (L06 p. 233).
- **Ingrédients / Corruption / Familiers** : rien de propre en V5 ; règles générales (L06 pp. 235, 237-238).
- **Aucun attribut de domaine** (L06 p. 258) — à arbitrer.

### Sorts (L06 pp. 258-259)

| Sort (EN) | Nom FR | CN | Portée | Cible | Durée | Mécaniques clés | Contrat similaire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Raise Dead | Relever les morts (off., L05 p. 257) | 7 | (FM) m | ZdE (BFM) m | Jusqu'au lever du soleil | 1 + DR Squelettes en fin de Round, À Terre, contrôlés, ordres simples ; fin si mort/Inconscient du lanceur ; +2 DR → +1 Squelette | Invocation de Monture, `:6852` |
| Reanimate | Réanimation (off., L05 p. 257) | 8 | (FM) m | ZdE (BFM) m | Jusqu'au lever du soleil | BFM + DR corps (Zombies/Squelettes, pp. 339-340) relevés, À Terre, contrôlés ; fin si mort/Inconscient ; +2 DR → BFM + DR de plus | Contrainte des Esprits, `:11447` |
| Screaming Skull | Crâne hurlant (off., L05 p. 256) | 8 | (FM) m | Spécial | Instantanée | Projectile magique +5 en ligne droite traversant les obstacles, cibles non-Mort-vivant ; après Blessure : Calme (+0) sinon Brisé | Vortex d'âmes, `:12144` |
| Vanhel's Call | L'appel de Vanhel (off., L05 p. 256) | 6 | (FM) m | Spécial | Instantanée | BI cibles Mort-vivant : Mouvement ou Action gratuite (même choix pour toutes) ; +2 DR → BI cibles de plus | aucun équivalent ; plus proche Pensée rapide, `:9066` |

**Questions ouvertes**
1. Définir un attribut de domaine (V5 n'en donne aucun) ? Sélecteur MJ.
2. Horlogage des fins « jusqu'au lever du soleil » et « mort/Inconscient du lanceur » dans le moteur — arbitrage MJ.
3. Relever les morts : terre nue exigée (« bare earth ») — refuser sur pavés/planchers ? Arbitrage MJ.
4. Intégrer les profils Squelettes/Zombies (L06 pp. 339-340) au moteur pour les invocations.

---

## 5. Domaine de Nurgle — Lore of Nurgle (L06 p. 259 ; L05 p. 257)

**Nom FR officiel (L05 p. 257)** : « Le Domaine de Nurgle ». L06 fournit trois sorts « pour la saveur » des cultistes, en plus des Sorts d'Arcane et de la Démonologie (L06 p. 259).

**Règles spécifiques**
- **Attribut de domaine (L06 p. 259)** : pendant qu'un sort du Domaine est en vigueur, toute cible qui subit une Blessure teste pour savoir si elle devient une Blessure Suppurée (L06 p. 180).
- **Ingrédients / Familiers** : rien de propre ; règles générales (L06 p. 235).

### Sorts (L06 p. 259)

| Sort (EN) | Nom FR | CN | Portée | Cible | Durée | Mécaniques clés | Contrat similaire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Festering Inflammation | Inflammation suppurée *(proposé)* | 5 | (BFM) m | 1 | Instantanée | Une Blessure de la cible devient une Blessure Suppurée (p. 180) | aucun proche ; Putréfaction, `:15196` |
| Miasma of Pestilence | Miasme de pestilence *(proposé)* | 6 | Vous | ZdE (BFM) m | (BFM) Rounds | Vivants : Résistance Difficile (−2 DR) sinon Symptôme Nausée (p. 182) ; dévoués de Nurgle et moines de la peste skavens immunisés | Miasme mystifiant, `:16309` |
| Stream of Corruption | Flot de Corruption (off., L05 p. 257) | 9 | Spécial | Spécial | Instantanée | Souffle Acide et Poison non opposé ; projectile magique au Bonus d'Endurance, ignore les PA ; blessés au-delà du BE : Résistance (+0) sinon Pourriture du Sang (p. 179) | Souffle, `:13468` |

**Questions ouvertes**
1. Nom FR officiel absent pour deux sorts sur trois (L05 V4 n'en donne qu'un par Domaine du Chaos).
2. L'attribut suppose le registre des Blessures Suppurées (L06 p. 180) dans le moteur — dépendance à vérifier.
3. Flot de Corruption : surpuissance V4 (+2 dégâts par +2 DR, L05 p. 257) à reconvertir ou non.

---

## 6. Domaine de Slaanesh — Lore of Slaanesh (L06 p. 260 ; L05 p. 257)

**Nom FR officiel (L05 p. 257)** : « Le Domaine de Slaanesh ».

**Règles spécifiques**
- **Attribut de domaine (L06 p. 260)** : pendant qu'un sort du Domaine est en vigueur, les cibles subissent −2 DR pour résister à Animosité, Haine et Corruption, mais gagnent +2 DR pour résister à Peur et Terreur.
- **Ingrédients / Familiers** : rien de propre ; règles générales (L06 p. 235).

### Sorts (L06 p. 260)

| Sort (EN) | Nom FR | CN | Portée | Cible | Durée | Mécaniques clés | Contrat similaire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Acquiescence | Consentement (off., L05 p. 257) | 5 | Toucher | 1 | (BFM) Rounds | Résistance (+0) à chaque début de Round ; échec : perte du Mouvement et de l'Action | Danse du Désespoir, `:15295` |
| From Pain, Pleasure | De la douleur, le plaisir *(proposé)* | 6 | Toucher | 1 | (BFM) Rounds | Trait Indolore pour la durée ; sur Blessure Critique : Résistance (+20) sinon armes lâchées et Impuissante | Régénération (octroi de trait), `:8456` |
| Phantasmagoria | Phantasmagorie *(proposé)* | 8 | Vous | ZdE (BFM) m | (BFM) Rounds | Le lanceur et ses alliés gagnent le Trait Distraction ; les cibles ne se distraient pas entre elles | Distraction, `:13700` |

**Questions ouvertes**
1. Nom FR officiel absent pour deux sorts sur trois.
2. L'état Impuissante (armes lâchées) n'existe pas encore dans le moteur — à créer ou mapper.
3. L'attribut suppose le suivi des Psychologies dans le moteur — dépendance à vérifier.

---

## 7. Domaine de Tzeentch — Lore of Tzeentch (L06 p. 260 ; L05 p. 257)

**Nom FR officiel (L05 p. 257)** : « Le Domaine de Tzeentch ».

**Règles spécifiques**
- **Attribut de domaine (L06 p. 260)** : toute personne affectée par un sort du Domaine doit réussir un Test de Corruption ; échec : +1 Point de Corruption ; réussite : +1 Point de Chance jusqu'à la fin de la rencontre.
- **Ingrédients / Familiers** : rien de propre ; règles générales (L06 p. 235).

### Sorts (L06 p. 260)

| Sort (EN) | Nom FR | CN | Portée | Cible | Durée | Mécaniques clés | Contrat similaire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Boon of Tzeentch | Don de Tzeentch *(proposé)* | 9 | Vous | Vous | (Bonus d'Intelligence) jours | Un sort de n'importe quel Domaine lancé comme mémorisé ; non transcriptible ; Focalisation (Dhar) ou Vent approprié ; Incantation Imparfaite → le sort quitte l'esprit et s'efface du grimoire | aucun équivalent — à créer |
| Transformation of Tzeentch | Transformation de Tzeentch *(proposé)* | 12 | (BFM) m | 1 | (BFM) Rounds | Cible À Terre et Impuissante dans un cocon ; Résistance (+0) à chaque fin de Round sinon +1 Point de Corruption | Labyrinthe de Cristal, `:11555` |
| Treason of Tzeentch | Trahison de Tzeentch (off., L05 p. 257) | 6 | (FM) m | ZdE (Bonus d'Initiative) m | (BI) Rounds | Animosité (Alliés) ; pas de transfert d'Avantage ; sur Critique : Calme Difficile (−20) sinon attaque de l'allié le plus proche | Traître de Tarn, `:16783` |

**Questions ouvertes**
1. Nom FR officiel absent pour deux sorts sur trois ; seule Trahison de Tzeentch est officielle.
2. Don de Tzeentch : aucune règle V5 sur le coût d'apprentissage ni les limites par Domaine ; interaction avec le verrou de la Magie elfique à définir. Sélecteur MJ.
3. Le Point de Chance « jusqu'à la fin de la rencontre » exige un compteur dédié inexistant (cf. `LOT3_RAPPORT_CONTRATS_LOT4.md` sur la Corruption modérée) — arbitrage MJ.
4. Comportement des PNJ sous Animosité (Alliés) en combat — à trancher.

---

## Questions ouvertes transversales

1. **Libellé « Magie de la Haie »** : absent de L05 (officiel : « Domaine de la Magie naturelle », p. 254) — à trancher pour l'interface.
2. **Familiers** : aucune règle dans L06/L05 pour ces traditions ; seules règles du corpus : L17 Winds of Magic (V4) pp. 180-184, réservées aux mages des Colleges. Importer, adapter ou ignorer ? Sélecteur MJ.
3. **Corruption à l'incantation de Dhar** : L06 n'impose rien par incantation (seuls l'attribut Tzeentch, les tables p. 238 et l'Influence corruptrice p. 237 en génèrent) ; la V4 (L05 p. 255) imposait +1 PC par Incantation Imparfaite de Sorcellerie. Sélecteur MJ.
4. **Noms FR proposés** : 19 propositions (4 livre de base, 6 Chaos, 9 AOTE3) à valider.
5. **Conversion V4 → V5** des 9 sorts AOTE3 (bonus ±10, durées) — à arbitrer.
6. **Chaos** : intégrer les 9 sorts d'office ou par culte au cas par cas ? Sélecteur MJ.
7. **Parité Démonologie/Nécromancie** : ni attribut ni ingrédients en V5 — sélecteur MJ.
8. Aucune implémentation, grimoire, fiche ni test n'existe pour ces sorts dans le dépôt ; cet inventaire ne couvre que les données de règles.

## Comptages

| Indicateur | Valeur |
| --- | --- |
| Traditions inventoriées | 7 |
| Sorts total | 42 |
| — dont L06 (V5) | 30 |
| — dont L02/AOTE3 (V4, à convertir) | 9 |
| — dont L03 | 0 (aucun) |
| Noms FR officiels (L05) | 23 |
| Noms FR proposés | 19 |
| Sorts absents du catalogue (confirmé) | 42 / 42 |
| Questions ouvertes (transversales) | 8 |
| Questions ouvertes (par tradition) | 28 |
| **Questions ouvertes total** | **36** |
