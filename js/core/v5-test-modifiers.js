/**
 * Q6 · T0 (docs/specs/tests-secondaires-agregateur/) : calcul commun des modificateurs d'un Test V5, extrait de `buildCombatTest`
 * (v5-combat-rules.js). Un seul calcul, celui du combat (MJ 06/11 Q19) : États, talents, couches de sorts et de prières. Le
 * combat l'appelle pour son Test principal ; les Tests secondaires l'appelleront famille par famille (T1 à T8).
 *
 * 1. Ce qui relève du calcul commun, et ce qui reste propre au combat
 *
 *  Commun (ici) — une propriété du testeur ou d'un effet posé sur lui, valable pour tout Test :
 *  - États : `conditionTestRules`, `conditionPenaltyEffects`, `conditionDisadvantageRows` / `conditionDisadvantageEffects`
 *    (condition-effects.js). Le livre les définit pour « tous les Tests » (V5 v3 p. 183-186 ; MJ 06/11 Q19). Exceptions comprises :
 *    Endurance de l'anachorète (`ignoreConditionPenalties`, p. 226), `ignoreFatiguePenalties`, Clarté d'esprit (`clarityOfThought`,
 *    Sonné sans pénalité sur un Test mental), talents `ignoreConditionPenalty`. Le choix DR ou Désavantage quand les pénalités
 *    d'États diffèrent (`conditionPenaltyMode`) est aussi commun.
 *  - Talents de Test : `previewV5TalentTestModifiers` (événement `test.beforeRoll`), talents des Traits de compagnon d'un familier
 *    à portée compris (`withCompanionTalents`, déjà compté par le combat pour tout Test).
 *  - Couches de sorts et de prières, incidents de magie : `magicTestModifiers` → `collectTestEffects` (moteur d'effets, U8 L3).
 *  - Clés « … adverse » de l'opposant (`magicAdverseModifiers`) : une propriété de la couche de l'adversaire, quel que soit le Test.
 *    Le combat ne les lit que pour le testeur qui n'est pas le défenseur ; le calcul commun garde cette règle telle quelle
 *    (`role !== 'defender'`), sans la trancher.
 *  - Plafonds de fin de calcul (`finalizeV5TestModifiers`) : Esprit fort (`talent-strong-minded`, `ignoreNegativeModifiers`,
 *    Livre de base V5 p. 127, contrat de js/data/v5-additional-talent-contracts.json) annule tout modificateur négatif d'un Test, et
 *    Distrait (`noMomentumOrAdvantage`, v5-talent-actions.js) ôte tout Avantage. Les deux visent un Test quelconque, mais portent
 *    sur la liste complète : l'appelant les applique en dernier, sur tous ses modificateurs (le combat le fait à la même place
 *    qu'avant l'extraction).
 *
 *  Propre au combat (reste dans `buildCombatTest`) — il faut une arme, un adversaire au contact, le plateau ou une saisie du panneau :
 *  - armure portée (Discrétion, Perception) : équipement choisi pièce par pièce dans le panneau (`wornArmorItemIds`), pas un État ni
 *    un effet ; hors des familles de Q19 ;
 *  - familier qui assiste (`familiarSkillSupport`, `familiarSupport`) : présence d'un participant précis sur le plateau ;
 *  - séquelles durables (`sequelaTestRules`) : main, bouclier, arme utilisée ; « les pertes durables ne sont pas des pénalités
 *    d'État » (commentaire du pivot) — à reposer au MJ si elles doivent suivre les Tests secondaires ;
 *  - Tourbillon de mort, Pointue, qualités, Traits de sens et de déplacement, surnombre, montures (`combatEngineEffects`) ;
 *  - psychologie, Ergoteur, Frénésie, Malice de Ranald, Défense contre Tir, Souffle froid, Tir en vol, Retranchement, Garde royal,
 *    Petit/Grand, Élan, Cible à terre / Aveuglée / Surprise, maladresses, Tir extraordinaire, À répétition, Mancatcher, Blessures
 *    Critiques précisées par le MJ : chacun dépend de l'arme, de la cible ou d'une saisie du panneau de combat ;
 *  - Clarté d'esprit sur les lignes de psychologie et de mutation mentale : elle porte sur des lignes que seul le combat calcule ;
 *    la part commune (Sonné ignoré sur un Test mental) est ici.
 *  - restrictions Inconscient, Surpris, Fin glorieuse : le pivot les formule pour un combattant (avec l'exception de la Fin
 *    glorieuse) ; la question vaut pour les Tests secondaires et sera traitée famille par famille.
 *
 * 2. Précision demandée au MJ (`needsInput`) pour le Test principal aujourd'hui
 *
 *  `conditionTestRules` rend des questions (`CONDITION_QUESTIONS` : mouvement, fuite, vue, Sociabilité) ; `buildCombatTest` les met
 *  dans `unresolved`, que `resolution.js` reverse dans `preview.unresolved` (aperçu non applicable). Le panneau
 *  (`blockingReasons`, js/ui/resolution-panel.js) les affiche dans « À saisir avant d'appliquer », et les cases de contexte
 *  `involvesMovement`, `runningOrHiding`, `reliesOnSight`, `requiresSight`, `usesFellowship` (et `conditionPenaltyMode`) écrivent
 *  la réponse dans `draft.v5Context` → `normalized.v5.context` ; le Test se recalcule. Pour la magie, `prepareMagicOptions` rend
 *  `conditionNeeds`, que `js/ui/resolution-panel/condition-questions.js` traduit en champs (`conditionQuestions`) et range dans
 *  `draft.magicConditionContext`. Ici, `needsInput` rend ces mêmes questions sous la forme `{ field, label }` (mêmes libellés, mêmes
 *  champs que ces deux écrans) : un Test secondaire qui en reçoit une n'est pas résolu (CA8).
 *
 * 3. Cycle d'imports
 *
 *  Mesuré sur js/core (composantes fortement connexes du graphe d'imports statiques, script équivalent à
 *  `madge --circular`). Avant : 2 composantes cycliques (24 fichiers, dont v5-combat-rules.js, v5-talent-tests.js,
 *  v5-magic-talents.js, familiars.js, v5-talent-actions.js ; et 3 fichiers de magie). Les briques importées ici sont déjà toutes
 *  dans la composante de 24 (sauf condition-effects.js et effects.js, hors cycle) : ce module, importé par v5-combat-rules.js, y
 *  entre forcément. Après : 2 composantes, 25 et 3 fichiers ; la composante de 25 est celle de 24 plus ce module, aucun fichier
 *  jusque-là hors cycle n'y entre, aucune composante nouvelle. Ce module n'importe pas v5-combat-rules.js (`conditionLevels` y a
 *  été déplacé et y reste réexporté).
 */
import { normalizeState } from './effects.js';
import { sourceActive } from './v5-talent-actions.js';
import { withCompanionTalents } from './familiars.js';
import { previewV5TalentTestModifiers } from './v5-talent-tests.js';
import { magicTestModifiers, magicAdverseModifiers } from './v5-magic-talents.js';
import { conditionPenaltyEffects, conditionDisadvantageEffects, conditionTestRules, conditionDisadvantageRows, CONDITION_QUESTIONS } from './condition-effects.js';

/** Niveaux d'États actifs du participant (clé sans espace ni tiret → niveau cumulé) ; marqueurs de talent exclus. */
export const conditionLevels = actor => {
  const levels = new Map();
  for (const [index, raw] of (actor?.states || []).entries()) {
    if (Number(raw?.level) === 0 || (raw?.source?.source?.effectHash && !sourceActive(raw))) continue;
    const state = normalizeState(raw, index);if(['talent-active','talent-pending'].includes(state.kind))continue;
    const key = state.key.replace(/[- ]/g, '');
    levels.set(key, (levels.get(key) || 0) + state.level);
  }
  return levels;
};

export const MIXED_CONDITION_QUESTION = 'États de pénalités différentes : choisir les DR ou le Désavantage retenu par le MJ.';
const QUESTION_FIELDS = new Map([[CONDITION_QUESTIONS.movement, 'involvesMovement'], [CONDITION_QUESTIONS.escape, 'runningOrHiding'],
  [CONDITION_QUESTIONS.sight, 'reliesOnSight'], [CONDITION_QUESTIONS.fellowship, 'usesFellowship'], [MIXED_CONDITION_QUESTION, 'conditionPenaltyMode']]);
const MENTAL = new Set(['Int', 'I', 'FM', 'Soc']);

/**
 * Modificateurs communs d'un Test V5 (voir l'en-tête).
 * `test` : `{ characteristic, skill?, skillCharacteristic?, kind = 'test', role = 'actor', opponent?, participants?, action?, settings? }`
 *   - `characteristic` : Caractéristique du Test (États, Test mental) ; `skill` : libellé de la compétence (couches) ;
 *   - `skillCharacteristic` : Caractéristique de la compétence au catalogue, pour les couches « Tests de <carac> » quand le contexte
 *     n'en donne pas (`context.carac` d'abord, puis elle, puis `characteristic`) ;
 *   - `role` : rôle de talent (`actor`, `attacker`, `defender`) ; `opponent` : participant opposé, ou rien ;
 *   - `participants` : participants du plateau (talents de compagnon d'un familier) ;
 *   - `action`, `settings` : forme du combat, lue par les talents ; à défaut, construites depuis `characteristic`, `skill`, `kind`.
 * `context` : contexte du Test (`settings.context` du combat) : réponses du MJ (`involvesMovement`, `conditionPenaltyMode`…).
 * Rend :
 *  - `slModifiers`, `advantageSources`, `disadvantageSources` : prêts pour `previewV5Test`, plafonds non appliqués
 *    (`finalizeV5TestModifiers` après les modificateurs propres à l'appelant) ;
 *  - `rows` : détail affichable `{ id, label, amount?, source, kind, dropped?, rule? }` (écartés : Q9) ;
 *  - `needsInput` (`{ field, label }`), `unresolved` (tous les messages, questions comprises), `restrictions` ;
 *  - `parts` : chaque famille séparée, pour que `buildCombatTest` les place là où il les plaçait.
 */
export function resolveV5TestModifiers(actor, test = {}, context = {}) {
  const situation = context || {};
  const kind = test.kind || 'test', role = test.role || 'actor', opponent = test.opponent ?? null;
  const characteristic = test.characteristic ?? null, skillLabel = test.skill || '';
  const action = test.action || { type: 'test', attr: characteristic, label: skillLabel, base: 0, qualities: [] };
  const settings = test.settings || { kind, context: situation };
  const flags = actor?.extensions?.v5?.specialStates;
  // Talents : ceux des Traits de compagnon d'un familier à portée comptent comme ceux du maître pour ce Test.
  const talents = previewV5TalentTestModifiers(withCompanionTalents(actor, test.participants || []), { action, settings, kind, role, opponent });
  // U8 L3 : talents et couches (sorts, prières) réunis par le moteur d'effets (collectTestEffects).
  const layers = magicTestModifiers(actor, skillLabel, { ...settings.context, carac: settings.context?.carac || test.skillCharacteristic || characteristic }, { talentRows: talents.slModifiers });
  // Clés « … adverse » du porteur opposé (le combat ne les lit que hors défense).
  const adverse = opponent && role !== 'defender' ? magicAdverseModifiers(opponent, skillLabel) : [];
  // États : un seul calcul pour tous les Tests (MJ 06/11 Q19), exceptions comprises.
  // Endurance de l'anachorète (p. 226) : malus et Désavantages d'États ignorés ; Inconscient, Surpris et la vue exigée restent.
  const ignoreAll = flags?.ignoreConditionPenalties === true;
  const rules = conditionTestRules(conditionLevels(actor), { kind, attr: characteristic, context: situation, ignoreAll });
  // U8 L4 : pénalités d'États cumulées par le moteur d'effets (la plus forte seule) : ignoreFatiguePenalties (Exténué sans
  // pénalité ; pas Clarté d'esprit, MJ 06/11), Clarté de pensée (Sonné sur un Test mental), talents, Endurance de l'anachorète.
  const penaltyEffects = conditionPenaltyEffects(rules.relevant, { ignoreAll, ignoreFatigue: Boolean(flags?.ignoreFatiguePenalties),
    ignoreStun: Boolean(flags?.clarityOfThought && MENTAL.has(characteristic)), talentIgnores: talents.ignoredPenalties });
  const penalty = penaltyEffects.penalty;
  // Des pénalités d'États différentes ne s'additionnent pas : DR contre Désavantage, le MJ tranche.
  const worstDisadvantage = conditionDisadvantageEffects(conditionDisadvantageRows(rules.disadvantages));
  const mixed = !talents.ignoreNegative && penalty > 0 && worstDisadvantage.length > 0;
  const mode = situation.conditionPenaltyMode;
  const mixedUnresolved = mixed && !['sl', 'disadvantage'].includes(mode) ? [MIXED_CONDITION_QUESTION] : [];
  const appliedPenalty = talents.ignoreNegative || mixed && mode === 'disadvantage' ? 0 : penalty;
  const penaltyRows = appliedPenalty ? [{ id: 'conditions', label: 'Plus forte pénalité d’État', amount: -appliedPenalty }] : [];
  const disadvantageRows = !mixed || mode !== 'sl' ? worstDisadvantage : [];
  // U8 L6 : États écartés par la règle de cumul, montrés barrés (Q9).
  const droppedRows = penaltyEffects.dropped.map(row => ({ id: 'condition:' + row.key, label: 'État ' + ((actor?.states || []).find(s => s.key === row.key)?.name || row.key),
    amount: -(penaltyEffects.levels.get(row.key) || 0), rule: row.rule, source: 'État' }));
  const conditions = { rules, penaltyEffects, penalty, appliedPenalty, mixed, mixedUnresolved, penaltyRows, disadvantageRows, droppedRows,
    penaltyStates: [...penaltyEffects.levels].filter(([, value]) => value).map(([key]) => key) };

  const slModifiers = [...layers.magic, ...adverse, ...penaltyRows, ...layers.talents];
  const advantageSources = [...talents.advantageSources];
  const disadvantageSources = [...disadvantageRows, ...talents.disadvantageSources];
  const unresolved = [...rules.unresolved, ...mixedUnresolved, ...talents.unresolved, ...layers.unresolved];
  const needsInput = [...new Set([...rules.unresolved, ...mixedUnresolved])].map(label => ({ field: QUESTION_FIELDS.get(label) ?? null, label }));
  const tag = (list, source, rowKind) => list.map(row => ({ ...row, source, kind: rowKind }));
  const rows = [...tag(layers.magic, 'Sort ou prière', 'modifier'), ...tag(adverse, 'Effet adverse', 'modifier'), ...tag(penaltyRows, 'État', 'modifier'),
    ...tag(layers.talents, 'Talent', 'modifier'), ...tag(disadvantageRows, 'État', 'disadvantage'), ...tag(talents.advantageSources, 'Talent', 'advantage'),
    ...tag(talents.disadvantageSources, 'Talent', 'disadvantage'), ...droppedRows.map(row => ({ ...row, kind: 'modifier', dropped: true }))];
  return { slModifiers, advantageSources, disadvantageSources, rows, needsInput, unresolved, restrictions: [...rules.restrictions],
    ignoreNegative: talents.ignoreNegative, forceSuccess: talents.forceSuccess, penalty: appliedPenalty, penaltyStates: conditions.penaltyStates,
    droppedModifiers: droppedRows, parts: { talents, layers, adverse, conditions } };
}

/**
 * Plafonds de fin de calcul, sur la liste complète de l'appelant (modifiée sur place, comme le faisait `buildCombatTest`) :
 * Distrait (`noMomentumOrAdvantage`) ôte tout Avantage ; Esprit fort (`ignoreNegativeModifiers`, V5 p. 127) ramène à 0 tout
 * modificateur négatif et ôte tout Désavantage.
 */
export function finalizeV5TestModifiers(actor, resolved, { slModifiers, advantageSources, disadvantageSources }) {
  if ((actor.states || []).some(s => s.restriction === 'noMomentumOrAdvantage' && sourceActive(s))) advantageSources.length = 0;
  if (resolved.ignoreNegative) { for (const row of slModifiers) if (row.amount < 0) row.amount = 0; disadvantageSources.length = 0; }
}
