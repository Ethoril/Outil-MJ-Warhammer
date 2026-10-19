# Évaluation de GLM 5.3 comme sous-agent de codage

Ouverte le 19 octobre 2026. Phase de test décidée par le MJ. Journal chiffré : [`GLM_EVALUATION.json`](GLM_EVALUATION.json) ; synthèse automatique : `node tools/glm-eval-summary.mjs`.

## Question posée

Avoir GLM 5.3 (via Mistral Vibe, skill `deleguer-glm`) comme sous-agent de codage permet-il d'**économiser des tokens** et de **travailler plus efficacement**, par rapport à (a) faire le travail directement, (b) le confier à un sous-agent Claude (Sonnet) ?

## Deux budgets à ne pas confondre

| Budget | Ce qu'il mesure | Comment on le lit |
| --- | --- | --- |
| **B1 — contexte de l'orchestrateur (Claude principal)** | Tout ce que je lis et écris dans la conversation : spécification, rapport de l'agent, vérification. C'est le budget `total_tokens` restant affiché dans la session. | Relevé avant et après chaque tâche : `b1_avant` − `b1_apres`. |
| **B2 — consommation du sous-agent** | Tokens dépensés par l'agent lui-même pour lire le code, écrire et corriger. Pour un sous-agent Claude : champ `subagent_tokens` de la notification de fin. Pour GLM : coût Mistral affiché par `run-vibe.ps1` (plafond, sans le cache) et console Mistral (coût réel). | `b2_tokens` (Claude) ou `b2_cout_usd` (GLM). |

Les deux comptent : B1 limite la longueur de la session, B2 consomme le quota Anthropic de l'utilisateur. **Cette session a atteint deux fois la limite individuelle de dépense (erreurs 429)** à cause de B2 des sous-agents Claude : déporter du codage sur GLM décharge ce quota, indépendamment de B1.

## Protocole

1. **Choisir des tâches comparables.** Une tâche = un objectif, un critère d'acceptation exécutable écrit par Claude avant la délégation, une liste fermée de fichiers modifiables.
2. **Alterner (A/B)** quand c'est possible : à taille et risque comparables, attribuer à GLM ou à un sous-agent Sonnet en alternance. Les tâches de risque élevé (fichiers partagés combat/résolution/store) ne sont **pas** données à GLM seul : elles suivent la discipline habituelle (caractérisation → code → contrôleur indépendant) et GLM n'y intervient que sur un morceau borné.
3. **Relever pour chaque tâche** (voir le schéma JSON) : B1 avant/après, B2, durée, nombre de tours, nombre d'itérations, réussite au premier essai (la commande d'acceptation passe sans relance), hors-périmètre (fichiers modifiés hors liste), défauts trouvés ensuite (par moi, par le contrôleur indépendant, par les tests plus tard), retouches faites par moi (lignes), et verdict qualité.
4. **Ne rien réécrire pour que GLM paraisse bon** : si je corrige, je compte les lignes corrigées ; si je reprends la main, la tâche est marquée « reprise ».
5. **Contrôle indépendant** identique pour toutes les voies sur les tâches à risque (même contrôleur, mêmes scénarios), pour comparer des défauts trouvés à vérification égale.

## Indicateurs

- **I1 — Économie de B1** : médiane de (B1 GLM) contre (B1 Sonnet) sur tâches comparables. Attention : GLM ne réduit B1 que si le prompt est court et le rapport concis ; un prompt long peut annuler le gain.
- **I2 — Économie de B2 pour le quota Anthropic** : B2 Claude évité (tokens) contre coût Mistral (USD).
- **I3 — Qualité** : taux de réussite au premier essai, nombre moyen d'itérations, retouches en lignes, taux de hors-périmètre.
- **I4 — Fiabilité** : défauts trouvés après coup par 1000 lignes livrées, par voie.
- **I5 — Délai** : durée réelle de bout en bout (spécification + exécution + vérification).
- **I6 — Domaine d'usage** : types de tâches où GLM est utile (tests rédigés à partir d'une spec, modules d'effets isolés, refactors mécaniques, génération de données) et où il ne l'est pas.

## Règle de décision proposée (à valider par le MJ)

GLM est **utile** si, sur au moins 6 tâches comparables : réussite au premier essai ≥ 60 %, aucun hors-périmètre non signalé, défauts par 1000 lignes ≤ ceux de la voie Sonnet, et B1 médian ≤ celui de Sonnet. Il est **utile mais cantonné** s'il tient ces critères uniquement sur certaines familles de tâches (à nommer). Sinon on le retire de la boucle.

## Mesures de référence : sous-agents Claude de cette session (B2)

Tâches de codage de taille comparable déjà réalisées par des sous-agents Sonnet, avant l'ouverture de l'évaluation. Tokens de B2 relevés dans les notifications de fin (durée en secondes). Ce ne sont pas des mesures contrôlées (périmètres variables) : elles donnent un ordre de grandeur.

| Tâche | Tokens B2 | Appels d'outils | Durée |
| --- | ---: | ---: | ---: |
| P4a T1, socle (statut assisté, grammaire, échéances) | 303 126 | 101 | ~896 s |
| P4a T2, dégâts directs et soins | 227 864 | 56 | ~875 s |
| P4a T4, équipement et traits | 320 960 | 80 | ~979 s |
| P4b T1, modificateurs de Test | 227 747 | 60 | ~710 s |
| P4b T2, dégâts ordinaires | 247 787 | 68 | ~1094 s |
| P4b T3, États conditionnés | 171 636 | 46 | ~670 s |
| P4b T4, contrats seuls | 174 642 | 57 | ~516 s |
| P4c B1, moteur des invocations | 281 484 | 89 | ~949 s |
| P4c B2+B3, contrats et interface | 188 892 | 59 | ~577 s |
| Correctif fin manuelle (acteur courant) | 128 566 | 43 | ~422 s |
| Lot de finition (Dévotion, Yeux de chat, Vindicte) | 139 740 | 38 | ~483 s |
| R6, cible implicite des invocations | 181 846 | 60 | ~884 s |
| R4, défaut de Tour des invocations magiques | 138 940 | 50 | ~2273 s |

Médiane B2 Sonnet sur ces 13 tâches : environ **188 900 tokens** et **~880 s**. Les contrôleurs indépendants (non comparables, lecture et essais) ont consommé 212 000 à 253 000 tokens chacun.

Coût de B1 par tâche Sonnet (estimation, à mesurer sur les prochaines) : spécification de 1 500 à 3 500 tokens, rapport de l'agent de 1 500 à 4 000 tokens, vérification personnelle de 1 000 à 3 000 tokens.

## Tâches GLM

Le journal est dans `GLM_EVALUATION.json` ; chaque entrée est ajoutée à la fin de la tâche. Synthèse : `node tools/glm-eval-summary.mjs`. Aucune tâche GLM n'est encore enregistrée à l'ouverture du document.
