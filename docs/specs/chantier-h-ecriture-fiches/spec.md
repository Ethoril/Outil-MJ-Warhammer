# Spec · Chantier H — écriture en retour de l'outil MJ vers les fiches des PJ

Cadrage du 06/11/2026, à partir de `docs/PASSATION_CHANTIER_H.md` (`f842490`). Décision de principe du MJ du 21/10 : l'outil réécrit sur la fiche du site des fiches les valeurs **durables** qu'il modifie en jeu.

## Décisions du MJ (06/11/2026)

| # | Question | Décision |
|---|---|---|
| Q1 | Moment de l'écriture | **Bouton de fin de séance** « Envoyer aux fiches » (menu `⋯`), avec un aperçu des différences par PJ, sur le modèle de « Mettre à jour les PJ ». |
| Q2 | Conflit avec une modification du joueur | La fiche **refuse** le champ en conflit ; l'outil montre les deux valeurs et **le MJ choisit**. |
| Q3 | Valeurs absentes de la fiche | N'ajouter à la fiche **que ce que le joueur doit voir** : pénitences, séquelles permanentes, cicatrices, maladies, mutations visibles. Le reste reste dans l'outil. |
| Q4 | Blessures courantes | **Outil seul.** La fiche a bien un champ « Blessures actuelles » (`blessuresAct`, tenu par le joueur, contrairement à ce que disait la passation) ; l'outil ne l'écrit pas. Choix confirmé par le MJ après correction. |
| Q5 | Annulation | **Commande inverse** : « Annuler le dernier envoi » renvoie les anciennes valeurs, refusé champ par champ si la fiche a changé depuis. Possible jusqu'à l'envoi suivant. |
| Q6 | Visibilité | Le joueur lit **tout** le document de sa fiche, historique compris (`firestore.rules`, `canReadFiche`). Donc **aucune donnée réservée au MJ n'est jamais écrite sur la fiche**, ni dans un motif d'opération. |
| Q7 | Tests | **Émulateur + recette prod** : la fonction sous tests et émulateur, l'outil sur une fonction simulée, puis une recette réelle sur `ethoril.github.io` avec la fiche `test`. |

## Constats dans le dépôt des fiches (lecture seule, `e6bc651`)

- **PV et Mouvement par espèce : déjà reportés** (`js/fiche/derived.js`, commits `e4000d0`, `c0ee9c9`) : Halfelin M 3 avec BF ; Gnome M 3 sans BF ; Ogre total ×2 ; Elfe noir et Elfe des mers M 5 ; Skink M 6 sans BF. Rien à faire dans H.
- **Lecture des joueurs** : `fiches/{charId}`, `history` et `operations` sont lisibles par le joueur de la fiche ; `command_backups`, `migration_backups` et `catalogue_backups` sont réservés au MJ. Aucune écriture directe n'est permise.
- **Validation des commandes** (`functions/src/fiche/service.mjs`) : liste fermée `FICHE_COMMAND_TYPES` ; types réservés au MJ (`SERVER_ONLY_TYPES`) avec motif obligatoire ; l'administrateur est reconnu par son adresse vérifiée. Le type `patch` a déjà une détection de conflit **champ par champ** (`baseValues`), refuse **toute la commande** en cas de conflit (`aborted`, `details.fields`), et ne demande pas la révision exacte. Les autres types exigent `baseRevision === revision`.
- Formats sur la fiche : `fortune`, `peche`, `corruption` sont des chaînes de 0 à 4 chiffres ; `destin` est une chaîne ; caractéristiques `carac.<cc…soc> = { base, adv }` ; talents `talentsAcq[]`, compétences avancées `skillsAdvanced[]`, prières `prieres[]`, objets `equipment[]` (lignes à `id`).

## Scénarios et critères d'acceptation

### S1 · Préparer l'envoi de fin de séance
- **CA1** · Le menu `⋯` de l'outil propose « Envoyer aux fiches » quand le MJ est connecté au site des fiches ; sinon il propose la connexion, comme « Mettre à jour les PJ ».
- **CA2** · L'aperçu liste, par PJ lié à une fiche (identité de fiche, jamais le nom), chaque différence durable sous la forme « champ : valeur de la fiche → valeur de l'outil », avec sa provenance lisible (« Création du familier », « Séquelle : pied perdu »…).
- **CA3** · Un PJ sans différence n'apparaît pas ; s'il n'y a aucune différence, l'aperçu le dit et n'envoie rien.
- **CA4** · Le MJ peut décocher une différence ou un PJ entier ; seules les lignes cochées partent.
- **CA5** · Les Blessures courantes, les états de combat, les données de séance, les réglages de partie, les reçus d'audit et toute donnée réservée au MJ n'apparaissent jamais dans l'aperçu.

### S2 · Envoyer
- **CA6** · Un envoi produit une seule opération par fiche ; rejouée (même identifiant), elle ne s'applique pas deux fois.
- **CA7** · Après un envoi réussi, « Mettre à jour les PJ » ne voit plus ces valeurs comme un changement venu de la fiche, et un nouvel « Envoyer aux fiches » n'a plus rien à envoyer pour elles.
- **CA8** · Seul le MJ peut faire cette opération ; un joueur, même sur sa propre fiche, est refusé.
- **CA9** · L'historique de la fiche indique que l'opération vient de l'outil MJ, avec un motif lisible par le joueur, et la liste des champs avant/après.

### S3 · Conflits
- **CA10** · Étant donné un champ que le joueur a modifié depuis la dernière lecture par l'outil, quand le MJ envoie une valeur différente, alors la fiche refuse l'envoi de cette fiche sans rien écrire, et l'outil affiche ce champ avec la valeur actuelle de la fiche et celle de l'outil.
- **CA11** · Pour chaque champ en conflit, le MJ choisit « Garder la fiche » (l'outil reprend la valeur de la fiche) ou « Imposer l'outil » ; il renvoie ensuite. Les autres fiches de l'envoi ne sont pas bloquées par ce conflit.
- **CA12** · Si la fiche porte déjà la valeur que l'outil veut écrire (correction faite à la main, par exemple une perte de caractéristique), ce n'est pas un conflit et rien n'est écrit deux fois.

### S4 · Annuler le dernier envoi
- **CA13** · Après un envoi, « Annuler le dernier envoi » rétablit sur chaque fiche les valeurs d'avant, en une opération par fiche liée à l'envoi annulé.
- **CA14** · Un champ modifié sur la fiche depuis l'envoi est un conflit (même traitement que CA10–CA11).
- **CA15** · L'annulation n'est plus proposée après un nouvel envoi ; elle ne touche pas l'état de l'outil.

### S5 · Valeurs que la fiche porte déjà
- **CA16** · Destin, Fortune, Péché et Corruption modifiés en jeu partent vers `destin`, `fortune`, `peche`, `corruption`.
- **CA17** · Une perte de caractéristique par séquelle part vers la caractéristique de la fiche, Base d'abord puis Avances, selon la répartition faite dans l'outil.
- **CA18** · Une excommunication ou un rejet définitif retire de la fiche les talents Béni/Invocation du culte et met à zéro les Avances de Prière ; un réimport ultérieur ne les rétablit pas.
- **CA19** · Un objet retenu par le Courroux est retiré de l'équipement de la fiche ; rendu par une pénitence, il y revient à l'identique ; un ancien import ne le recrée jamais.

### S6 · Valeurs ajoutées à la fiche, visibles du joueur
- **CA20** · La fiche gagne une section en lecture seule pour le joueur, « Suivi du MJ », qui liste les pénitences en cours, les séquelles permanentes (parties perdues, fractures mal soignées), les cicatrices, les maladies et les mutations, chacune avec un libellé et une courte description.
- **CA21** · Seule l'opération du MJ peut écrire cette section ; une modification simple du joueur (ou du MJ sur le site) est refusée.
- **CA22** · Une pénitence close ou une maladie guérie dans l'outil disparaît de la section au prochain envoi.
- **CA23** · Le délai secret de mutation, les mutations en attente non confirmées, la perte de personnage à arbitrer et tout champ réservé au MJ n'atteignent jamais la fiche : la fonction refuse toute clé hors de la liste autorisée.

### S7 · Recette
- **CA24** · Sur `ethoril.github.io`, avec App Check actif, le MJ envoie puis annule un changement sur la fiche `test`, et l'historique de la fiche montre les deux opérations.

## Hors périmètre
- Écrire les Blessures courantes (`blessuresAct`) — décision Q4.
- Écriture automatique à chaque commande — décision Q1.
- Sur la fiche : monture et état monté, état et recharge des armes, poudre et projectiles, dégâts d'armure par pièce, effets divins calendaires (plafond, malus, réprobation, suspension), Hémorragie quotidienne, reliques, livre sacré perdu, Jugement dernier, expositions de Corruption, mots-clés posés ou écartés par le MJ — ils restent dans l'outil (Q3).
- Une zone réservée au MJ sur la fiche — décision Q6.
- Monture lue depuis la fiche (option C, non retenue) ; Taille des PJ selon l'espèce côté outil (rappel 5, chantier à part) ; PV et Mouvement des espèces (déjà faits côté fiches).
- RPG Map Display.
