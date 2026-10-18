# Relevé documentaire — « Heed My Lessons » (Courroux 11–15)

Relevé complémentaire du 18 octobre 2026, fondé sur des contrôles ciblés de source et de rendu visuel. Ce document ne constitue pas une nouvelle double lecture des pages et ne modifie pas les compteurs de lecture.

## Clause 11–15 et ordre des Péchés (p. 218)

Source : *Livre de base V5 EN v2*, L06, SHA-256 `53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de`, p. 218. La table indique : « Heed My Lessons: You suffer a -1 SL penalty to your Pray Skill for the next 1d10 + Sin Points Rounds. » La conséquence vise le fidèle qui subit Courroux. La ligne ne mentionne aucun test secondaire, condition liée à la réussite de Pray, durée de scène ou session.

Le paragraphe général dit qu’on ajoute +10 au jet de Courroux par Péché, puis qu’après avoir jeté et appliqué le résultat, on réduit les Péchés de 1, minimum 0. L’ordre explicite conduit à prendre le total courant avant décrément pour déterminer la durée exprimée en « Sin Points ». C’est une déduction de séquencement, pas une précision répétée dans la ligne 11–15. Le d10 de durée est un résultat explicite à fournir.

Le Courroux est postérieur au Test qui l’a déclenché. P. 217 établit qu’un Test de Pray réussi manifeste l’effet selon ses règles, un échec simple n’a pas d’effet, et un Fumble appelle Courroux; p. 218 ajoute que les unités ≤ Sin courant déclenchent aussi Courroux même si Pray réussit. La pénalité 11–15 vise donc les Tests ultérieurs, pas rétroactivement le Test déclencheur.

## Raccordement au Test partagé (p. 130–131)

P. 130 décrit le calcul du SL à partir du jet et de la compétence/caractéristique. Un jet inférieur ou égal à la compétence réussit; un jet supérieur échoue. Les SL modifiés à 0 sont marginalement réussis quand le résultat nul vient d’un succès naturel, et marginalement échoués quand il vient d’un échec naturel. P. 131 dit que difficulté et modificateurs du personnage sont combinés en un modificateur SL final du jet; cela peut transformer le succès en échec ou l’inverse. Son résumé relie un SL positif au succès et un SL négatif à l’échec.

Le -1 SL de compétence Pray est donc un modificateur ordinaire du Test partagé, à appliquer avant de décider l’issue. Il peut changer succès/échec. Cette opération diffère du Courroux 06–10, qui limite le SL des Tests réussis à +0. La formulation de 06–10 conditionne explicitement le plafond au fait que le Test réussisse : il ne transforme pas un échec en succès et ne répare pas un résultat négatif. Garder les deux sanctions distinctes — malus pré-issue, plafond post-issue — est compatible avec leur formulation. Les deux lignes ne précisent pas explicitement leur coexistence ni une annulation mutuelle.

## Durée et fin d’effet : limites de la source

- P. 162–164 décrit Tours et Rounds de combat. Ces pages ne définissent pas une durée en secondes par Round, une horloge hors combat, le traitement d’un Round partiel ni une échéance générique des malus en Rounds.
- P. 184 décrit les Conditions; « Heed My Lessons » est un malus de compétence, pas une Condition.
- P. 216–217 n’ajoute pas de durée générique de pénalité de Courroux.
- P. 220–222 décrit les durées propres aux prières et leur progression, pas une conversion des Rounds en temps civil ni une échéance générale du Courroux.

La source ne décide pas si cette durée se décompte seulement en Rounds de combat effectivement joués, comment traiter un effet posé au milieu d’un Round, à quel moment exact elle commence ou cesse, ni comment le temps passe hors combat. Elle ne fournit aucune conversion en secondes. Ne pas assimiler cette durée à la durée de campagne des effets magiques.

## Arbitrage produit consigné séparément

Décision `DIV-TIME-LESSONS-01`, reçue explicitement de l’utilisateur : « Fin du Nᵉ Round, en comptant le Round actuel comme premier Round ». Pour l’exemple Round 4, d10=3 et Sin=1, N=4; l’effet expire après les effets de fin du Round 7. Cette décision produit ne provient pas d’une règle explicite de temporisation dans les pages citées. Sans Round courant attesté, l’application automatique doit être bloquée. Une avance de campagne ou un changement manuel de Round ne simule pas la phase réelle. La preuve de décision est conservée dans `roundPolicy` du contrat, séparément du reçu de source PDF.
