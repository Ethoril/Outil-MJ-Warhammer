# Contrôle indépendant — Œil de l’aigle, p. 224

17 octobre 2026. Vérification ciblée de l’entrée runtime, indépendante du générateur et de son test source→sortie. Source contrôlée sur le rendu visuel `C:/Users/arnot/.codex/visualizations/2026/10/17/01a14afb-f993-7171-b422-c21e6f8aa1e2/e1-pdf/page-224.png`.

La page distingue l’aigle spectral des limites de la vision du prêtre : l’aigle possède les capacités normales d’un aigle, ne peut pas affecter physiquement le monde et ne peut pas être blessé; son profil indique Perception 55, Sens aiguisé (Vue) et Vol 80. Le prêtre contrôle son vol et voit par ses yeux. Il ne voit alors plus par ses propres yeux, ce qui le laisse potentiellement vulnérable.

Le contrat généré restitue ces éléments dans son rappel, reste `manual`, n’a aucun effet et conserve ses paramètres de portée, cible et durée. La clause d’effet demeure `manual`; aucun nouveau comportement automatisé n’est certifié. Le rappel n’ajoute pas la formulation erronée « sans accès à ses autres sens ni talents ».

## Vérifications

- Rouge historique après la première correction auteur : test indépendant p.224 échoué, car le rappel ne précisait pas la vulnérabilité potentielle du prêtre. Une assertion initiale trop littérale sur « propres yeux » a ensuite été élargie pour accepter « sans voir par les vôtres », sans relâcher l’exigence sémantique.
- Vert après la correction : `node --test --test-name-pattern='Source indépendante p.224' tests/divin-v5-e0-independent.test.js` — 1/1.
- `node --test tests/divin-v5-e0-independent.test.js` — 5/5.
- `node tools/build-v5-divine-contracts.mjs --check` — registre et inventaire courants.
- `node --test tests/divin-v5-catalogue.test.js` — 6/6, y compris les tests de non-mutation et de garde cwd.

Ce contrôle ne certifie pas les 26 pages sans texte extrait ni la recette globale du dépôt. Cette dernière reste à relancer par le principal après les changements en cours.
