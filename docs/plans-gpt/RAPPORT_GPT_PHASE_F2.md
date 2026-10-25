# Rapport GPT - Phase F2

Date : 25/10/2026. Worktree : `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`, base `d737c5acc47e012039eb3bbf669c8a4df1c34eff` (main, version 3.26.0).

Au dernier contrôle, main a avancé extérieurement à `8ed9099` ; par rapport à la base F2, seuls `tests/browser-index.mjs` et `tests/browser-workspace.mjs` diffèrent. Ces changements n'ont pas été intégrés ici et ne sont pas revendiqués dans les résultats F2. Le code de production de base reste le même ; aucune fusion/rebase de ce worktree n'a été faite.

## Périmètre et état

Le brief F2 autorise les commits locaux et impose un arrêt à la fin de chaque tranche. La tranche autorisée en premier est T1 : C, A, B. Aucune fusion ni publication n'est autorisée. Les 194 règles du JSON restent la liste de référence ; le complément d'exécution du plan décrit les clauses déjà couvertes et les clauses restantes sans changer les décisions du MJ.

| Étape / lot | État | Preuve |
|---|---|---|
| Préparation | FAIT | Worktree neuf depuis main ; aucun changement hérité ; réglages LF ; `npm ci` : 3 paquets, audit npm sans vulnérabilité signalée. |
| Repérage des 194 règles | FAIT, documentaire, `7c576e2` | Audits Luna séparés T1, T2 et T3 ; corrections après revue du principal et contrôle croisé Luna. 45 + 69 + 80 identifiants, sans omission ni doublon. Section Exécution ajoutée au plan sans changer son texte initial. |
| F2-C | FAIT sur contrats de fiche / faits MJ, réserve de portée ci-dessous | `1034dc9` ; code Luna, corrections par le codeur, relecture indépendante Luna favorable, lecture du diff et validation finale par le principal. Attaques matérialisées des sorts conservées : ne pas présenter C comme une couverture globale de ces attaques. |
| F2-A | NON COMMENCÉ | Aucun code modifié. |
| F2-B | NON COMMENCÉ | Aucun code modifié. |
| F2-D | EN ATTENTE T2 | Fin de T1, contre-vérification Claude et feu vert MJ requis avant T2. |
| F2-E | EN ATTENTE T2 | Après D ; aucun code commencé. |
| F2-N | EN ATTENTE T2 | Aucun code commencé. |
| F2-I | EN ATTENTE T2 | Aucun code commencé. |
| F2-L | EN ATTENTE T3 | Fin de T2 et feu vert ; aucun code commencé. |
| F2-G | EN ATTENTE T3 | Aucun code commencé. |
| F2-M | EN ATTENTE T3 | Aucun code commencé. |
| F2-K | EN ATTENTE T3 | K1 puis K2 ; conception du format K2 à soumettre en fin de T2. |
| F2-F | EN ATTENTE T4 | Fin de T3 et feu vert ; dépend notamment de D et K. |
| F2-H | EN ATTENTE T4 | Aucun code commencé. |
| F2-J | EN ATTENTE T4 | Conception des séquelles à soumettre en fin de T3 ; J1/J2 non commencés. |

## Validation

**État final du code `1034dc9` :**

- `node --test --test-concurrency=4` exécuté par le principal : **4 707/4 707**, zéro échec, zéro ignoré, 122 123 ms ; `tmp/gpt-phase-f2/principal-final-tests.log`.
- Acceptation ciblée F2 + fiches et régressions de combat : **218/218**, `tmp/gpt-phase-f2/targeted-final.log`. Les deux fichiers Node F2 comptent 29 tests, dont les deux caractérisations et un contrôle de correspondance documentaire ; ce dernier lit le JSON réel et n'est pas une preuve mécanique.
- `node tests/f2-c-ui.browser.mjs` exécuté par le principal : vert ; formulaire isolé, données manquantes, nature Ingénierie, score vide, nom ASCII, contrôle de protection. Journal : `tmp/gpt-phase-f2/principal-ui.log`.
- `node tests/f2-c-workspace.browser.mjs` exécuté par le principal : vert ; vrai workspace et Store, choix MJ sans skillId (Ingénierie tir, score et augmentations), constructeur `v5Input`, nature reçue par le moteur, retour à un Test générique sans ancien groupe parasite. Journal : `tmp/gpt-phase-f2/principal-workspace.log`.
- Vérificateur indépendant : sources ciblées relues et contre-exemples rejoués, verdict favorable ; vraie fiche importée puis Store aperçu/application d'une lance de cavalerie à pied/une main : profil improvisé, BF+1, Défauts conservés, application réussie et cible de 20 à 12 PV. Aucun fichier modifié par le vérificateur.
- `git diff --check`, fins de ligne LF et garde des fichiers protégés : verts. Texte initial du plan, JSON F2, arbitrages, catalogue et fichiers de version intacts.

La suite de référence `node --test --test-concurrency=4`, après préparation des préconditions, est verte : **4 678/4 678 tests**, zéro ignoré, 134 090 ms (`tmp/gpt-phase-f2/baseline-ready-tests.log`). Aucun code modifié au moment de cette référence.

Le premier essai avait 4 669 réussites sur 4 672 tests annoncés, avec trois échecs de préparation : import de dépendance avant la fin de `npm ci`, garde E2 dont le répertoire temporaire doit être extérieur au checkout, test E0 exigeant un reçu préexistant. Correction : dépendances installées, `TEMP`/`TMP` = `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-runtime` (extérieur sur E:), copie authentique du reçu F0 depuis `tmp/gpt-phase-f-worktree/tmp/divin/recipe-receipt.json`, SHA-256 source et copie `d9f7e2e4430fc6eef4dce5287b16b03c0b46b9bd674caf53def16faeeabfcfa9`. Cette copie est uniquement une précondition E0 ; **aucune recette F2 exécutée** à ce stade. Aucun test adapté pour résoudre ces échecs.

Assertions de tests existants modifiées : aucune.

Précision de la caractérisation nouvelle F2-C : `f4da4a9` ajoute uniquement `advances: 1` et `basic` aux deux entrées de compétences de la première fixture, sans changer les assertions ni les résultats attendus. La fixture initiale avait omis ce fait et représentait donc des données d'entraînement inconnues. Avant acceptation de cette correction, les deux mêmes tests avec ces seuls ajouts ont été exécutés en important le moteur **main intact** (`../../js/` depuis la racine du worktree F2) : 2/2 verts. Le cas des données réellement inconnues est couvert séparément par les nouveaux tests métier et doit bloquer avec reçu MJ.

La première trace TDD C (`tmp/gpt-phase-f2/f2-c-step2-red.log`) contient 4 tests, dont 3 rouges : l'un reproduit directement les Qualités conservées à tort ; les autres exposent les gardes de lien existantes à raccorder. Les tests des autres règles ont ensuite été ajoutés pendant la construction du lot. Ne pas présenter cette première trace comme la preuve d'un rouge préalable de chacune des 26 clauses.

Les contre-exemples de relecture ont donné lieu aux corrections et tests : gardes de tir/emplacements ouverts, voies manuelles historiques, familles de compétences homonymes, valeurs nulles, Ingénierie mêlée/tir, Hast avec apostrophe, spécialisations personnalisées, Escrime/Base à zéro, défauts de bâtarde non maîtrisée, compétence Cavalerie conservée à pied, qualités source filtrées avant préambule/talents, dégâts improvisés issus du catalogue et raccord du constructeur UI. Le premier passage global pendant la construction avait neuf échecs ; le journal `full-suite.log` a ensuite été remplacé par les passes corrigées et ne sert pas de reçu de cette passe ancienne. Les résultats finaux de référence sont ceux du principal indiqués ci-dessus.

## Portée exacte et limites ouvertes

- Les conséquences de maîtrise sont calculées dans le vrai flux d'équipement de fiche et pour les faits MJ explicitement renseignés. Les données nécessaires absentes bloquent avec reçu ; zéro augmentation et donnée absente sont distincts. Les anciennes actions manuelles sans contrat ni faits d'entraînement restent assistées par le MJ, sans maîtrise inventée (C-MANUEL-01).
- **Armes conjurées / attaques matérialisées des sorts : chemin existant conservé.** Le générateur reprend une compétence, un score MJ ou un score fixé par le sort ; il ne vérifie pas les augmentations. Le traitement nouveau de C n'y réapplique pas la garde générale des compétences avancées. C'est une limite réelle du périmètre d'exécution retenu, à relire avec le MJ, pas une preuve que la règle est déjà couverte sur ces attaques. Ni les sorts ni ce chemin ne sont certifiés exhaustifs par cette livraison. Voir C-MATERIALISEES-01 et la succession avant toute extension ; ne pas attribuer cette exclusion à un arbitrage explicite du MJ.
- `suggestSkill` et les aménagements de choix existants sont conservés ; pas de nouveau contrôle de carrière. F-L06-0847 est conservé selon l'arbitrage, pas réimplémenté.
- A et B ne sont pas commencés : **T1 n'est pas livrée**. L'arrêt de session se fait après le code C validé et ses commits, selon la clause de volume des règles communes. La portée matérialisée ci-dessus reste une réserve à lever si la clôture attendue de C doit l'inclure.
- Recette complète `node tools/run-divine-recipe.mjs` : **non exécutée en F2**. La suite Node et les deux parcours ciblés ne remplacent pas cette recette, requise en fin de phase. Aucun feu vert T2 ni contre-vérification Claude de T1 n'est revendiqué.

## Organisation et sources

Le repérage a été confié à trois sous-agents Luna. C a été codé par un Luna puis relu par un autre à contexte neuf, avec corrections renvoyées au codeur jusqu'au verdict favorable dans le périmètre contrôlé. La revue finale du diff et les dernières exécutions ont été faites par le principal. Même organisation à conserver pour les lots suivants.

Les pages PDF de T1 ont été extraites depuis les PDF du corpus dans `tmp/gpt-phase-f2/sources/` pour lecture ciblée. L'extraction seule ne vaut pas contrôle visuel d'un tableau. Les arbitrages du 25/10 priment sur les choix bruts du journal.

Contrôles du repérage : base du plan conservée octet pour octet ; les 194 identifiants du JSON apparaissent exactement une fois dans les tableaux ; `git diff --check` propre ; aucun fichier suivi en CRLF ; aucun changement de code ni des arbitrages ou du JSON de référence. Les pages sources seront relues pour le code puis lors de la vérification indépendante de chaque lot ; ce repérage ne certifie pas une nouvelle lecture exhaustive des PDF.
