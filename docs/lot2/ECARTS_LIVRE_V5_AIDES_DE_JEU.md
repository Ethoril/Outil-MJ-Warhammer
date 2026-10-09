# Livre V5 et Aides de jeu — suivi des corrections et décisions

Revue du 9 octobre 2026, actualisée après les réponses du MJ et la relecture du CSV public Talents. Sept descriptions corrigées ont été retrouvées dans la source ; les 206 identités sont conservées. Ce document suit les corrections acceptées, les signalements retirés et les règles de table. Il ne modifie pas le Google Sheet.

## Portée et source

La première lecture portait sur les **166 talents du Livre de base V5, pages 114–128**, descriptions, limites et spécialités. Les pages 6, 130–131, 135, 175, 183–184, 191 et 360–361 fournissent les procédures utiles. Les 39 talents de suppléments nécessitent leurs sources propres ; Petit, de source V4, est traité ci-dessous comme homebrew décidé par le MJ.

La mise à jour actuelle vérifie les **sept descriptions modifiées**, sans refaire ni prétendre élargir la revue des 166 talents. Référence : [Aides de jeu](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/edit), copie locale [snapshot](../../js/data/reference-snapshot.json). SHA-256 du CSV Talents relu : `4ef3ee500c6d4da8b26dbb30fbb751995954be66e822a7dc306acde379229d8f`.

| Talent | Page | Correction acceptée et retrouvée dans la source |
|---|---:|---|
| Ferveur ardente | 121 | Avantage à Charme lorsqu’on parle de la cause ; Désavantage pour mentir à son sujet ou la dénoncer. |
| Saut carpé | 121 | Tenter immédiatement le Test de relèvement ; se relever seulement si le Test réussit. La réussite n’est pas accordée sans jet. |
| Effraction | 116 | Crochetage reçoit l’Avantage ; la restriction portes/fenêtres concerne les Tests de Force. |
| Attirant | 115 | Une ou plusieurs personnes attirées peuvent être influencées. Le choix DR/unités suit la lecture littérale ci-dessous. |
| Acrobaties équestres | 128 | Représentation autorisée à cheval ; Esquive ignore la modification liée au fait d’être monté. |
| Résistance | 124 | Avantage aux autres Tests de résistance à la menace **durant la session**. Réussite automatique une fois par séance distincte. |
| Petit | V4 FR 143 | Homebrew conservant toutes les clauses ; seul le coût du Piétinement devient **1 Momentum**. |

## Choix entre DR et chiffre des unités : décision MJ

Le MJ tranche : il s’agit de lire **le chiffre littéral des unités du jet retenu**, sans lancer un autre dé. **0 reste 0.** L’extrapolation précédente depuis la convention d’un d10 page 6 était trop affirmative et est retirée.

Formulation de table :

> Lors d’un Test réussi correspondant au talent, choisissez les DR obtenus ou le chiffre des unités de ce jet. Le chiffre 0 vaut 0 ; aucun nouveau tirage.

Un jet réussi de **20** permet donc de garder ses DR ou de retenir **0 DR**. Le choix de 0 conserve une réussite marginale (+0), et ne transforme pas un échec en réussite. Le jet de 100 reste un échec automatique. Si une inversion est choisie, lire les unités du **jet inversé retenu**, avec un choix distinct de l’option conservée.

Cette décision concerne tous les talents permettant ce choix : Attirant (p. 115), Maître en déguisement et Travailleur qualifié (p. 122), Numismate et Loup de mer (p. 123), Intrigant (p. 125), Bonnes jambes et Chirurgie (p. 127), Marinier et Tour des souvenirs (p. 128). Les déclencheurs propres à chacun restent nécessaires.

Le moteur raccordé couvre actuellement ce choix pour Maître en déguisement, Loup de mer et Numismate. Les autres talents restent des rappels jusqu’à contractualisation ; cette décision ne les active pas automatiquement.

## Seigneur de guerre : signalement retiré

La formulation des Aides suit le talent page 128. La **Peur est un effet psychologique défini page 183**, avec ses conséquences. Qu’elle ne figure pas dans les États physiques cumulables page 184 ne rend pas le talent ambigu ou invalide.

Le signalement précédent mélangeait la représentation interne de l’outil et la validité du texte. Il est **retiré** : aucune correction de Seigneur de guerre n’est demandée. Le moteur ne doit pas inventer un nouvel État cumulable pour représenter cet effet psychologique.

## Frappe blessante et Frappe assommante : clarification du signalement

Les deux talents sont distincts et leurs effets similaires de neutralisation ne se contredisent pas. **La qualification précédente de contradiction était trop affirmative et est retirée.**

Page 127 :

- Frappe blessante donne deux tirages sur la table des Blessures critiques et mentionne une exemption de pénalité de Coup ciblé pour neutraliser silencieusement.
- Frappe assommante donne Assommante aux armes improvisées et mentionne cette exemption avec une arme Assommante.

Page 135, la procédure de neutralisation silencieuse se joue hors combat contre une cible ignorant le danger, avec opposition Corps à corps/Résistance. Elle accorde explicitement **Avantage à Frappe assommante seule**. Elle ne mentionne pas de Coup ciblé. Le point soulevé concernait ce **renvoi incomplet à la procédure**, pas un conflit entre les deux talents. Avantage et exemption de pénalité peuvent coexister ; l’absence de mention ne prouve pas une incompatibilité.

La décision MJ antérieure donnant priorité à la procédure p. 135 pour le raccordement de Frappe assommante est maintenue dans sa portée actuelle. L’outil assiste le Test sans appliquer automatiquement Coup ciblé, critiques ou Élan de combat. Victoire : BF Blessures et Inconscient ; victoire de la cible : Sonné et alarme. Ces conséquences spéciales restent manuelles.

Aucun Avantage n’est transféré à Frappe blessante. Le texte public des deux frappes est inchangé dans la mise à jour actuelle ; aucune correction de traduction n’est imposée.

## Petit : homebrew explicitement conservé

Pour préserver le personnage concerné à la table, le MJ conserve **tout le talent Petit tel quel**, sauf le Piétinement : **1 Momentum remplace 1 Avantage V4**. La correction est retrouvée dans Aides de jeu.

Les différences avec Taille V5 pages 360–361 restent des choix intentionnels de ce homebrew. Elles ne sont plus proposées comme corrections à effectuer :

| Sujet | Règle de table conservée | Livre V5 pour comparaison |
|---|---|---|
| Blessures de taille Petite | 2 × BE + BFM | 2 × BE, p. 361 |
| Défense contre plus grand | −2 DR par catégorie de différence | −2 DR lorsque l’adversaire est plus grand, p. 360 |
| Dégâts et qualités liés à la taille | Multiplicateurs et qualités de la description Petit | Bonus de Force supplémentaires, avec exceptions pour tirs/attaques gratuites/supplémentaires, p. 360 |
| Peur/Terreur | Peur ou Terreur suivant l’écart indiqué par Petit | Peur envers la créature agressive plus grande, p. 360 |
| Piétinement | Attaque gratuite Bagarre, BF Dégâts, **coût 1 Momentum** | Momentum, attaque gratuite Bagarre et BF Dégâts, p. 361 |
| Exemple du halfling | Acquisition Petit conservée | Exemple Moyenne dans la table p. 360 |

L’outil conserve cette décision en rappel explicite. Il ne migre ni la taille, ni le maximum de Blessures, ni les données importées, et n’ajoute aucun automatisme de taille/Piétinement sans incrément moteur et recette. La règle de table demeure applicable manuellement.

## Autres sources et limites

Les 40 entrées hors livre V5 incluent 38 références explicitement V4 (dont Petit) et deux références Temple of Spite déclarant leur compatibilité V5. Leurs sources propres restent nécessaires pour une revue exhaustive. La bibliographie conservée ne certifie pas une conversion mécanique.

Battement conserve l’arbitrage MJ supprimant toutes les conséquences du critique attaquant remplacé ; il ne s’agit pas d’une erreur démontrée dans les Aides. Les quotas de séance de Résistance et Obstiné restent manuels ; cette limite de l’outil ne constitue pas une erreur de texte.

La revue initiale n’avait relevé aucun autre écart chiffré certain sur les 166 talents. Frénésie/Haine (p. 184), Coup bas de Combat déloyal (1 Blessure et 1 Sonné, p. 175) et achat général à 100 PX par acquisition autorisée (p. 191) restent confirmés.

Cette mise à jour ne certifie pas tous les effets des 206 talents ni une livraison 2.5. Aucun PDF, extrait privé du livre ou export de PJ n’est incorporé au dossier ou au ZIP.
