# Sélecteurs d'arbitrage MJ — Choix de l'exécutant de la Phase B (`B-C01` à `B-C04`)

21 octobre 2026 — Branche `gemini/lot2`.
Document préparatoire rédigé à partir de [`docs/plans-gpt/CHOIX_EXECUTANT_PHASE_B.md`](../plans-gpt/CHOIX_EXECUTANT_PHASE_B.md). Ce document présente les options d'arbitrage au MJ sans rien trancher.

---

## `B-C01` — Portée de l'exemption de Courroux à `0` Péché sur une Maladresse (`Q12`, `L06` pp. 217–218)

**Contexte** : L'arbitrage `Q12` prévoit qu'un prêtre à `0` Péché ne déclenche plus la table de Courroux divin lors de ses Tests de prière (`L06` pp. 217–218). Lors du lot `B01`, l'application intégrale de cette règle aux Maladresses a mis en évidence un conflit avec d'anciennes fixtures de tests qui utilisaient une Maladresse à `0` Péché pour atteindre les tranches basses de la table.

- **Option 1 (`choix actuel`)** : Désactiver tout déclenchement de la table de Courroux à `0` Péché, y compris sur une Maladresse, et migrer les fixtures de tests concernées vers un Péché positif ou une pose directe.
- **Option 2** : Exempter uniquement les jets se terminant par `0` lorsque le prêtre est à `0` Péché, mais maintenir un tirage sur la table de Courroux en cas de Maladresse (double sur un Test d'invocation raté).
- **Option 3** : Conserver le comportement historique du moteur à `0` Péché afin de laisser inchangés les déclencheurs et les tests existants.

---

## `B-C02` — Identification d'un culte elfe face aux homonymes humains (`Q10`, `L08` pp. 93–99, `L02` p. 51)

**Contexte** : L'arbitrage `Q10` exempte d'office les cultes elfes (`Cadai` et `Cytharai`) du Péché et du Courroux divin sur la base du culte et non de l'espèce du personnage. Certains théonymes comme *Khaine* ou *Mathlann* désignent toutefois aussi bien une divinité elfique qu'un culte humain du Vieux Monde (`L02` p. 51).

- **Option 1 (`choix actuel`)** : S'appuyer sur la liste sourcée des identités `Cadai`/`Cytharai` où *Mathlann* ainsi que les noms portant un qualificatif ou un titre elfique explicite sont exemptés, tandis que *Khaine* non qualifié reste rattaché au culte humain soumis au Péché.
- **Option 2** : Exempter de Péché et de Courroux toute divinité dont le nom figure dans le panthéon elfique, y compris lorsque le culte est simplement renseigné sous le nom *Khaine* sans précision.
- **Option 3** : Exiger une mention explicite (« elfe », « elfique » ou épithète elfique complet) pour tout dieu partagé entre humains et elfes, en soumettant aussi *Mathlann* non qualifié au régime humain.

---

## `B-C03` — Traitement d'un total de Péchés déjà stocké lors d'une prière elfique (`Q10`, `extensions.v5.divine.sin`)

**Contexte** : Le modèle de données conserve le compteur `extensions.v5.divine.sin` au niveau de la fiche, laquelle peut avoir hérité de points de Péché antérieurs ou combiner un culte humain et un culte elfe. Il faut définir si l'invocation d'une prière elfique modifie ou non ce compteur stocké.

- **Option 1 (`choix actuel`)** : Ignorer le compteur stocké pendant la résolution de la prière elfique (traitée à `0` Péché avec refus d'attribution de Péché au culte elfe), tout en conservant intact le total enregistré sur la fiche pour un éventuel culte humain.
- **Option 2** : Remettre automatiquement et définitivement à `0` le compteur `extensions.v5.divine.sin` de la fiche dès qu'un culte elfe est sélectionné ou invoqué.
- **Option 3** : Scinder le stockage des Péchés en compteurs distincts par culte sur la fiche afin d'isoler matériellement chaque allégeance divine.

---

## `B-C04` — Emplacement du code des cultes elfes vis-à-vis du précache Service Worker (`sw.js`, `sw.test.js`)

**Contexte** : Le test `sw.test.js` impose que tout module JavaScript importé au runtime soit déclaré dans la liste de précache de `sw.js`, fichier que les règles communes interdisent aux exécutants de modifier. L'ajout d'un nouveau fichier runtime pour les cultes elfes ferait donc échouer le test de précache.

- **Option 1 (`choix actuel`)** : Héberger les fonctions pures d'identification et d'exemption des cultes elfes dans le module existant [`js/core/v5-divine-engine.js`](../../js/core/v5-divine-engine.js), déjà précaché et partagé entre le Store et l'interface.
- **Option 2** : Extraire ces fonctions dans un module dédié (par exemple `js/core/v5-elven-cults.js`) et mettre à jour la liste de précache de `sw.js` lors de l'intégration par l'orchestrateur.
- **Option 3** : Conserver la table de reconnaissance des cultes elfes directement dans les fichiers consommateurs du Store et du panneau sans ajouter d'export partagé dans `v5-divine-engine.js`.
