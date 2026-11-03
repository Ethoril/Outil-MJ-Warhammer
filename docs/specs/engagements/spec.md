# Spec · Engagements de mêlée et circonstances (maquettes B et D)

Chantier du 03/11/2026, décisions du MJ : le plateau par zones **remplace la piste** de l'espace Jouer ; engagements d'abord, circonstances ensuite ; toute déduction est **forçable** par le MJ ; publication 3.39.0 si tout est vert. Maquettes : https://claude.ai/artifact/5RBEahPXj3Pmqie9DkKDRV. Règles : livre de base V5 v3 (pages imprimées).

## Règles de référence (V5)
- Engagement = relation **par paire**, créée par toute attaque de mêlée entre deux combattants ; elle cesse si aucun des deux n'a attaqué l'autre pendant un Round complet (p. 163).
- Désengagement (Action, p. 163) : avec l'Élan, on le perd et on part sans Test ; sans Élan, Test opposé d'Esquive (ou Acrobaties) contre la meilleure Mêlée des engagés. En infériorité numérique : Désavantage ; encerclé : impossible (la Fuite reste permise). Échec : les adversaires gagnent l'Élan ; réussite : aucune attaque gratuite.
- Fuite (Move, p. 120, 163) : chaque engagé gagne l'Élan et peut le perdre pour une attaque gratuite ; le fuyard gagne 1 Brisé par engagé (déjà géré par l'outil).
- Charge (p. 163) : seulement si non engagé ; l'Élan seulement si la cible était à Mouvement mètres ou plus et à portée de course.
- Surnombre (p. 166-167, 360) : compté parmi les seuls combattants engagés entre eux ; +1 DR à l'attaque, +2 si la cible est encerclée, non cumulés ; tailles Grande 2, Énorme 3, Monstrueuse 4.
- Tir (p. 165, 167) : un tireur engagé ne tire qu'au Pistolet ; tirer sur son adversaire de mêlée = mêlée opposée ; cible engagée avec un tiers : Désavantage et déviation possible vers un autre engagé.
- En Bon Ordre (Up in Arms p. 79) : Désengagement sans Élan ; quand l'allié fuit, les engagés ne gagnent pas l'Élan et n'ont pas d'attaque gratuite (il prend quand même ses Brisé). *Interprétation retenue, à valider par le MJ : le Désengagement sous En Bon Ordre réussit sans Élan ni Test.*

## Scénarios et critères d'acceptation

### S1 · Voir le combat comme un plateau
- CA1 · Dans Jouer, à la place de la piste, un plateau montre trois sortes de zones : une zone par **mêlée** (groupe de combattants reliés par des engagements), **Libres** (actifs non engagés), **Hors combat** (le banc « En attente », avec « Faire entrer »).
- CA2 · Chaque combattant y est un jeton cliquable qui le sélectionne comme aujourd'hui (même sélecteur `data-workspace-select`), avec PV, États, marque du combattant qui joue et de la cible ; l'ordre du Round reste lisible (bandeau, rang d'Initiative sur le jeton).
- CA3 · Une mêlée affiche son rapport de forces (« 2 contre 1 ») et ses paires d'engagement sont consultables sur le jeton (« Engagé avec : Orc »).
- CA4 · Rien ne disparaît par rapport à la piste : Retirer un vaincu, banc, capteurs sans « Faire entrer », compteur « En attente (n) ».

### S2 · Engagements durables
- CA5 · Une attaque de mêlée appliquée entre deux combattants les engage (paire créée ou rafraîchie au Round courant).
- CA6 · Le MJ peut engager ou désengager à la main depuis le jeton (choisir une mêlée ou un adversaire, ou Libre) sans passer par une règle ; c'est noté au journal et annulable (Annuler).
- CA7 · À la fin d'un Round, une paire sans attaque entre les deux pendant ce Round complet cesse, avec une ligne au journal.
- CA8 · Un combattant mis hors combat (banc, retiré, mort, Inconscient) ne compte plus dans aucune paire.
- CA9 · Les engagements survivent au rechargement, à Suspendre/Reprendre et sont restaurés par Annuler.

### S3 · Actions qui annoncent leur conséquence
- CA10 · Sous le plateau, le combattant actif a une barre d'actions qui dépend de sa position : Attaquer (chaque adversaire engagé), Charger (si non engagé), Se désengager et Fuir (si engagé), Tirer, Viser, et « Sort, prière, Test… ». Chaque bouton affiche sa conséquence avant le clic.
- CA11 · Attaquer / Charger / Tirer / Viser préparent le panneau de résolution existant (action, cible, Charge cochée) sans rien appliquer.
- CA12 · Se désengager : avec l'Élan, le perd et rend le combattant Libre ; sans Élan, Test opposé (Esquive ou Acrobaties contre la meilleure Mêlée des engagés, Désavantage s'il est en infériorité) ; réussite = Libre, échec = les engagés gagnent l'Élan ; impossible s'il est encerclé (sauf forçage). Sous En Bon Ordre : réussite sans Élan ni Test.
- CA13 · Fuir ouvre la fuite existante avec les engagés déjà renseignés ; appliquée, le fuyard n'est plus engagé. Sous En Bon Ordre, pas d'Élan ni d'attaque gratuite pour les engagés.
- CA14 · Charger alors que le combattant est engagé est refusé avec la raison (forçable).

### S4 · Déductions dans le calcul, forçables
- CA15 · Pour une attaque de mêlée, le surnombre est calculé depuis les engagements, sans case à cocher ; il s'affiche comme déduit.
- CA16 · Pour un tir, « cible engagée », « tireur engagé avec la cible » et la liste des engagés pour la déviation sont déduits ; un tireur engagé avec quelqu'un d'autre que sa cible ne tire qu'au Pistolet.
- CA17 · La Nuée (fin de Round) et la fuite des Brisés reçoivent les engagés déduits.
- CA18 · Chaque déduction affichée peut être forcée par le MJ (autre valeur ou « Laisser au récit ») ; le forçage vaut pour l'action en cours et apparaît au journal du résultat.

### S5 · Circonstances par durée de vie (planche D, après S1-S4)
- CA19 · En tête du tiroir, « À régler maintenant » regroupe ce qui bloque le calcul, chaque ligne menant à sa commande.
- CA20 · **Scène** : lumière, météo, terrain/espace exigu se règlent une fois pour la rencontre et pré-remplissent chaque action ; changer la scène ne touche pas une action déjà appliquée.
- CA21 · **Positions** : position haute et couvert se posent sur un combattant et restent jusqu'au changement ; elles pré-remplissent les actions qui le concernent.
- CA22 · **Cette action** : les autres circonstances restent dans les groupes actuels ; les cases « confirmé par le MJ » deviennent un choix Oui / Non / Laisser au récit.

## Hors périmètre
Distances et positions géométriques (pas de carte), Poursuite, déplacement par glisser-déposer obligatoire (un menu suffit ; le glisser est un bonus), refonte du panneau de résolution, renommage des mêlées, talents d'engagement non listés (Tourbillon, Drilled, Small…) qui gardent leurs cases.
