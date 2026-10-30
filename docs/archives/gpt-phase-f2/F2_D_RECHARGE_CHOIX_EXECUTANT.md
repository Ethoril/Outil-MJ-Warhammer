# F2-D — choix d’exécutant pour Recharge

Le brief T2 remplace l’indice imprimé en Actions par un nombre de succès, sans préciser si un Test réussi contribue un succès ou son DR. Pour rendre le compteur exécutable, le lot retient **un succès par Test réussi**. Les DR ne s’ajoutent pas au compteur. Ce choix est une convention d’implémentation, pas une décision du MJ.

Alternative conservée pour revue : accumuler les DR positifs (SL) d’un Test étendu réussi. Elle ferait progresser plus vite une recharge après un Test à DR élevé. Il faudrait changer `advanceV5Reload`, les tests de persistance/Undo et le raccord des Tests de recharge E si cette alternative est retenue.

Le compteur est persistant sur l’exemplaire d’arme. Un échec n’ajoute rien; un chargeur à répétition partiellement rempli réduit d’un le nombre de succès requis.
