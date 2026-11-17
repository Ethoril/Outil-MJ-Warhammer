# Traits optionnels des créatures et des montures

Cadrage du 17/11/2026. Demande du MJ (16/11) : une monture peut recevoir des Traits optionnels (Up in Arms, Enemy in Shadows Companion, d'autres livres à venir) ; vérifier Trait par Trait ce qui est calculé, puis pouvoir cocher les optionnels. Inventaire qui fonde ce cadrage : [inventaire.md](inventaire.md).

## Pourquoi

Le bestiaire porte 761 Traits optionnels sur 200 profils (dont 45 montures), mais l'outil ne permet pas de les activer : ils restent en texte dans la Bibliothèque. Même chose pour 11 attaques et 80 pièces d'armure optionnelles, écartées sans écran. Les Traits de base, eux, sont branchés depuis la 3.26.0. Le Livre de base V5 (« Customising Creatures », chapitre du bestiaire) dit que les Traits optionnels d'une fiche sont des variantes courantes et que tout Trait peut aller à toute créature : l'outil doit le permettre.

## Décisions du MJ (17/11/2026)

| N° | Sujet | Décision |
|---|---|---|
| D1 | Créatures concernées | Toutes les créatures du bestiaire, montures comprises. |
| D2 | Où cocher | Sur le profil en Réserve (Préparer). Le choix vaut pour toutes les rencontres de ce profil. Un participant déjà en rencontre n'est pas modifié. |
| D3 | Traits hors de la liste de la fiche | Les Traits optionnels de la fiche sont en cases ; un bouton « Ajouter un Trait » permet d'en prendre un autre dans le catalogue des Traits. |
| D4 | Attaques et armures optionnelles | Dans le même panneau, une case chacune. |
| D5 | Traits qui modifient le profil | Big, Brute, Clever, Cunning, Elite, Fast, Leader, Tough (Caractéristiques, Mouvement) et Hardy (Blessures) s'appliquent au profil quand ils sont cochés. Le profil montre la valeur imprimée et la valeur modifiée. Décocher revient à l'imprimé. |
| D6 | Dressé (Trained) | Une case par dressage. « Guerre » applique son bonus de CC au profil ; les exceptions à Craintif (bruits, magie) restent en rappel. |
| D7 | Autres Traits non calculés | Ce chantier garantit que tout Trait coché apparaît au moins en rappel. Le tableau Trait par Trait est remis au MJ ; les nouveaux calculs feront un second chantier, selon son tri. |
| D8 | Monture d'un PJ | Le MJ coche dans l'outil, sur le profil de la monture ; « Mettre à jour les PJ » conserve ses coches. Rien ne change dans les fiches des joueurs. |

## Choix de cadrage (Claude, confirmés par le MJ le 17/11/2026, D10 et D11 compris)

| N° | Sujet | Choix |
|---|---|---|
| D9 | Trait coché déjà calculé | Il se comporte exactement comme le même Trait imprimé en Trait de base (37 des 77 noms optionnels sont dans ce cas). |
| D10 | Traits de base imprimés | Les modificateurs de D5 ne s'appliquent qu'aux Traits cochés ou ajoutés. Un Trait de D5 imprimé parmi les Traits de base d'une fiche est réputé déjà compté dans son profil imprimé : l'outil n'y touche pas. |
| D11 | Taille optionnelle | Cocher une Taille remplace la Taille du profil, une seule à la fois, et recalcule les Blessures (comme le fait déjà la Forme bestiale). |
| D12 | Trait à paramètre ajouté librement | À l'ajout d'un Trait qui porte un indice ou une précision (Peur 2, Taille, Dressé, Haine de…), le MJ le saisit. |
| D13 | Valeurs chiffrées | Les valeurs des neuf Traits de D5 et de Dressé (Guerre) sont relues dans les livres avant le code, et la table saisie est relue par le MJ. |
| D14 | Durée de vie des coches | Les coches font partie du profil : elles suivent la sauvegarde, l'export et l'import JSON, la synchronisation. Un profil créé avant ce chantier n'a aucune coche et se comporte comme aujourd'hui. |
| D15 | Données des livres | Corrections de données dans ce chantier : « Stubborn » ajouté au catalogue (L23 p. 22, en rappel) et proposé sur l'âne et la mule ; Dressé (Magie) du Demigryph (L13) ; liste des dressages du Cheval de trait lourd (L23). « Fast » des pur-sang se pose par l'ajout libre. |

## Décisions du MJ après la relecture D13 (17/11/2026)

Table relue : [valeurs-traits.md](valeurs-traits.md). D10 n'est pas tranché par les livres mais la plupart des profils le confirment : il est maintenu.

| N° | Sujet | Décision |
|---|---|---|
| D16 | Hardy coché | Blessures imprimées + (formule avec Hardy − formule sans), selon la Taille ; le total du livre n'est jamais recalculé en entier. |
| D17 | Leader sur une créature Bestial | Bloqué : Leader n'est pas proposé (ni en case ni à l'ajout) sur une créature qui a le Trait Bestial (Livre de base FR p. 340). |
| D18 | Trait optionnel déjà présent en Trait de base | Case grisée, libellée « déjà compté », sans effet. |
| D19 | Valeurs de D5 | Celles de [valeurs-traits.md](valeurs-traits.md) (L11 et Livre de base FR, identiques) pour Big, Brute, Clever, Cunning, Fast, Tough, Hardy et Dressé (Guerre). **Sauf Elite et Leader** : cocher l'un d'eux applique le modèle du même nom du Livre de base V5 (p. 353), caractéristiques, compétences et Talents compris, à la place des valeurs du Trait V4. Le détail du modèle est relu dans le livre avant le plan. |

## Scénarios et critères d'acceptation

**S1. Cocher les Traits optionnels d'une créature en Réserve.**
- CA1. Étant donné un profil de Réserve tiré du bestiaire dont la fiche a des Traits optionnels, son écran montre un panneau « Traits optionnels » avec une case par Trait, toutes décochées au départ.
- CA2. Un profil sans Trait, attaque ni armure optionnels montre seulement le bouton « Ajouter un Trait ».
- CA3. Quand le MJ coche un Trait puis ajoute le profil à une rencontre, le participant porte ce Trait parmi ses Traits ; un participant du même profil ajouté avant la coche ne change pas.
- CA4. Décocher retire le Trait pour les participants ajoutés ensuite. Cocher et décocher s'annulent par ↶.
- CA5. Les coches survivent au rechargement de la page, à l'export puis import JSON du profil, et à une relecture du compte en ligne.
- CA6. Un profil enregistré avant ce chantier s'ouvre sans erreur, sans coche, et ses participants sont identiques à aujourd'hui.

**S2. Effets d'un Trait coché.**
- CA7. Un Trait coché que l'outil calcule déjà pour un Trait de base produit le même calcul (exemples à prouver : Cornes, Furtif, Pisteur, Venin, Infravision).
- CA8. Tout Trait coché ou ajouté apparaît dans les rappels du participant, avec son nom français s'il existe et un texte d'effet. Aucun des 124 noms de l'inventaire ne reste sans affichage.
- CA9. Cocher l'un des neuf Traits de D5 modifie le profil selon la table relue (D13) ; l'écran du profil montre la valeur imprimée et la valeur modifiée ; décocher rend la valeur imprimée exacte.
- CA10. Deux Traits de D5 cochés ensemble cumulent leurs modificateurs ; les valeurs dérivées (bonus, Blessures) suivent.
- CA11. Un Trait de D5 imprimé parmi les Traits de base ne modifie pas le profil (D10).
- CA12. Cocher une Taille optionnelle remplace la Taille du profil et recalcule ses Blessures ; deux Tailles ne peuvent pas être cochées ensemble.

**S3. Dressages.**
- CA13. Pour une fiche dont « Dressé » est optionnel, le panneau montre une case par dressage imprimé.
- CA14. Cocher « Monture » sur une créature qui ne l'avait pas la rend proposable comme monture.
- CA15. Cocher « Guerre » applique son bonus de CC au profil ; « Guerre » et « Magie » affichent en rappel leur exception à Craintif.
- CA16. « Cavalerie de choc » se coche et s'affiche en rappel.

**S4. Ajouter un Trait hors liste.**
- CA17. « Ajouter un Trait » propose le catalogue des Traits, avec recherche par nom français ou anglais ; le Trait ajouté apparaît dans le panneau, coché, et peut être retiré.
- CA18. Un Trait à paramètre demande sa valeur à l'ajout (D12) ; sans valeur, l'ajout est refusé avec un message en français.
- CA19. Un Trait déjà présent sur le profil (de base, coché ou ajouté) n'est pas proposé en double, sauf s'il porte un paramètre différent.

**S5. Attaques et armures optionnelles.**
- CA20. Chaque attaque et chaque pièce d'armure optionnelle de la fiche a sa case dans le panneau.
- CA21. Cochée, l'attaque devient une action du participant et la pièce d'armure compte dans ses points d'armure par zone ; décochée, rien ne change par rapport à aujourd'hui.

**S6. Monture d'un PJ.**
- CA22. Le profil `monture` d'un PJ montre le même panneau.
- CA23. Après « Mettre à jour les PJ », les coches du MJ sont intactes quand l'espèce de la monture n'a pas changé ; quand l'espèce change, le nouveau profil repart sans coche et l'aperçu le dit.

**S7. Données et tableau remis au MJ.**
- CA24. Les trois corrections de D15 sont dans les données, et la régénération du bestiaire reste verrouillée par son contrôle `--check`.
- CA25. [inventaire.md](inventaire.md) donne pour chaque Trait : calculé, rappel ou rien, et calculable ou non ; après le chantier, plus aucun Trait n'y est « rien ».

## Hors périmètre

- Tout nouveau calcul de Trait autre que D5, D6 (bonus de Guerre) et D11 : second chantier, après le tri du MJ sur l'inventaire.
- Cocher ou décocher sur un participant en cours de rencontre.
- Cases de Traits sur la fiche en ligne d'un joueur.
- Calcul de « Cavalerie de choc » et de « Stubborn » (rappels).
- La Forme bestiale et ses propres choix de Traits : inchangés.
- La fiche du bestiaire dans la Bibliothèque : inchangée (texte).
