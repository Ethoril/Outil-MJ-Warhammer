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
 *    Endurance de l'anachorète (`ignoreConditionPenalties`, p. 226), `ignoreFatiguePenalties`, Clarté d'esprit (`clarityOfThought`, V5 p. 251, nommée aussi « Clarté de pensée » dans le code ;
 *    Sonné sans pénalité sur un Test mental), talents `ignoreConditionPenalty`. Le choix DR ou Désavantage quand les pénalités
 *    d'États diffèrent (`conditionPenaltyMode`) est aussi commun.
 *  - Talents de Test : `previewV5TalentTestModifiers` (événement `test.beforeRoll`), talents des Traits de compagnon d'un familier
 *    à portée compris (`withCompanionTalents`, déjà compté par le combat pour tout Test).
 *  - Couches de sorts et de prières, incidents de magie : `magicTestModifiers` → `collectTestEffects` (moteur d'effets, U8 L3).
 *  - Clés « … adverse » de l'opposant (`magicAdverseModifiers`) : une propriété de la couche de l'adversaire, quel que soit le Test.
 *    Le combat ne les lit que pour le testeur qui n'est pas le défenseur ; le calcul commun garde cette règle telle quelle
 *    (`role !== 'defender'`), sans la trancher.
 *  - Séquelles durables et temporaires (`sequelaTestRules`, MJ 09/11 CA13) : elles pèsent sur tout Test dont elles visent la
 *    Caractéristique ou la compétence. Le combat passe la main, le bouclier et l'arme (`test.sequela`) et ses réponses. Sur un Test
 *    secondaire, une séquelle à circonstance (zone utilisée, parole, deux mains, ouïe, odorat…) pose sa question au MJ dans
 *    `needsInput` (champ `sequela…` du contexte, MJ 09/11 CA22), comme un État ; les deux yeux perdus posent la question de la vue
 *    des États. Un contexte `sequelaNoCircumstanceInput` (départage d'Initiative) n'en pose aucune. Lignes marquées
 *    `durable` : « les pertes durables ne sont pas des pénalités d'État », aucun plafond (Obstiné, Distrait) ne les efface.
 *    `scoreDelta` (Caractéristique perdue) s'ajoute au score du Test.
 *  - Restrictions d'acteur (MJ 09/11 CA14) : Inconscient, aucun Test ; Surpris, aucun Test qui demande d'agir
 *    (`test.isAction` : désengagement, pause et interruption de Focalisation) ; `restrictions` bloque le Test secondaire. CA21 : un
 *    Test subi (`test.passive` : résister à la Warp Blade, Résistance de convalescence ou au Courroux…) reste fait par un Inconscient.
 *  - Plafonds de fin de calcul (`finalizeV5TestModifiers`) : Obstiné (`talent-strong-minded`, `ignoreNegativeModifiers`,
 *    Livre de base V5 p. 127, contrat de js/data/v5-additional-talent-contracts.json) annule tout modificateur négatif d'un Test, et
 *    Distrait (`noMomentumOrAdvantage`, v5-talent-actions.js) ôte tout Avantage. Les deux visent un Test quelconque, mais portent
 *    sur la liste complète : l'appelant les applique en dernier, sur tous ses modificateurs (le combat le fait à la même place
 *    qu'avant l'extraction).
 *
 *  Propre au combat (reste dans `buildCombatTest`) — il faut une arme, un adversaire au contact, le plateau ou une saisie du panneau :
 *  - armure portée (Discrétion, Perception) : équipement choisi pièce par pièce dans le panneau (`wornArmorItemIds`), pas un État ni
 *    un effet ; hors des familles de Q19 ;
 *  - familier qui assiste (`familiarSkillSupport`, `familiarSupport`) : présence d'un participant précis sur le plateau ;
 *  - Tourbillon de mort, Pointue, qualités, Traits de sens et de déplacement, surnombre, montures (`combatEngineEffects`) ;
 *  - psychologie, Ergoteur, Frénésie, Malice de Ranald, Défense contre Tir, Souffle froid, Tir en vol, Retranchement, Garde royal,
 *    Petit/Grand, Élan, Cible à terre / Aveuglée / Surprise, maladresses, Tir extraordinaire, À répétition, Mancatcher, Blessures
 *    Critiques précisées par le MJ : chacun dépend de l'arme, de la cible ou d'une saisie du panneau de combat ;
 *  - Clarté d'esprit (`clarityOfThought`) sur les lignes de psychologie et de mutation mentale : elle porte sur des lignes que seul le combat calcule ;
 *    la part commune (Sonné ignoré sur un Test mental) est ici.
 *  - restrictions Inconscient, Surpris, Fin glorieuse du combattant : le combat garde ses messages (avec l'exception de la Fin
 *    glorieuse) et ne lit pas `restrictions` du calcul commun.
 *
 * 2. Précision demandée au MJ (`needsInput`) pour le Test principal aujourd'hui
 *
 *  `conditionTestRules` rend des questions (`CONDITION_QUESTIONS` : mouvement, fuite, vue, Sociabilité) ; `buildCombatTest` les met
 *  dans `unresolved`, que `resolution.js` reverse dans `preview.unresolved` (aperçu non applicable). Le panneau
 *  (`applicationBlockingReasons`, js/ui/resolution-panel.js) les affiche dans « À saisir avant d'appliquer », et les cases de contexte
 *  `involvesMovement`, `runningOrHiding`, `reliesOnSight`, `requiresSight`, `usesFellowship` (et `conditionPenaltyMode`) écrivent
 *  la réponse dans `draft.v5Context` → `normalized.v5.context` (`draft.defenseContext` pour le défenseur) ; le Test se recalcule. Pour la magie, `prepareMagicOptions` rend
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
import { previewV5Test } from './v5-roll.js';
import { sourceActive } from './v5-talent-source.js';
import { withCompanionTalents } from './familiars.js';
import { previewV5TalentTestModifiers } from './v5-talent-tests.js';
import { magicTestModifiers, magicAdverseModifiers } from './v5-magic-test-effects.js';
import { conditionPenaltyEffects, conditionDisadvantageEffects, conditionTestRules, conditionDisadvantageRows, CONDITION_QUESTIONS } from './condition-effects.js';
import { sequelaTestRules, sequelaQuestionLabel } from './v5-sequela-effects.js';
import { awakeningSpell, awakeningMessage } from './v5-spell-restrictions.js';

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
 *   - T1 : `levels` (Map clé → niveau) remplace la lecture des États quand l'appelant les a déjà reconnus (contexte de Test :
 *     alias anglais, niveaux non cumulables) ; `ignoreFatigue` ajoute une dispense d'Exténué propre au Test (Œil de la tempête
 *     rang 2) ; `appliesKey(key)` remplace la table des clés de couche quand le Test lit aussi des clés hors compétence (clé
 *     `Dissipation` du Test de Dissipation) : les clés retenues forment un seul Test, cumulées comme les autres.
 *   - CA13 : `sequela` (`{ actionLabel, defending, attack, weaponHands, shieldUsed }`) : arguments du combat pour les séquelles ;
 *     sans lui, Test secondaire (questions de circonstance en `needsInput`, CA22). CA14 : `isAction` (Test qui demande d'agir,
 *     Surpris) ; CA21 : `passive` (Test subi : Inconscient ne le bloque pas).
 * `context` : contexte du Test (`settings.context` du combat) : réponses du MJ (`involvesMovement`, `conditionPenaltyMode`…).
 * Rend :
 *  - `slModifiers`, `advantageSources`, `disadvantageSources` : prêts pour `previewV5Test`, plafonds non appliqués
 *    (`finalizeV5TestModifiers` après les modificateurs propres à l'appelant) ;
 *  - `rows` : détail affichable `{ id, label, amount?, source, kind, dropped?, rule? }` (écartés : Q9) ;
 *  - `needsInput` (`{ field, label }`), `unresolved` (tous les messages, questions comprises), `restrictions` ;
 *  - `parts` : chaque famille séparée, pour que `buildCombatTest` les place là où il les plaçait.
 */
/**
 * REGLES-02 : choix unique entre une pénalité d'États en DR et un Désavantage d'État, qui ne s'additionnent pas (le MJ tranche).
 * Appelé par le calcul commun (combat, magie) et par le contexte de Test du divin.
 * - `penalty` : plus forte pénalité d'État (DR, positive) ; `disadvantages` : lignes de Désavantage du pire État ;
 * - `mode` : réponse du MJ (`sl` ou `disadvantage`) ; `ignoreNegative` : Obstiné (aucun conflit, pénalité ramenée à 0) ;
 * - `requireReason` : DIV-05 (divin), le choix ne vaut qu'avec un motif `reason` ; tant qu'il n'est pas tranché, rien ne
 *   s'applique. Sans motif exigé (combat, magie), un conflit non tranché applique les deux et reste une question.
 * Rend `{ mixed, modeMissing, reasonMissing, appliedPenalty, disadvantages, mode, reason, arbitration }`.
 */
export function resolveConditionPenaltyMix({ penalty = 0, disadvantages = [], mode, reason, ignoreNegative = false, requireReason = false } = {}) {
  const mixed = !ignoreNegative && penalty > 0 && disadvantages.length > 0;
  const validMode = mode === 'sl' || mode === 'disadvantage';
  const reasonText = typeof reason === 'string' ? reason.trim() : '';
  const decided = validMode && (!requireReason || reasonText !== '');
  const applySl = !mixed || (decided ? mode === 'sl' : !requireReason);
  const applyDisadvantage = !mixed || (decided ? mode === 'disadvantage' : !requireReason);
  return { mixed, modeMissing: mixed && !validMode, reasonMissing: mixed && requireReason && !reasonText,
    appliedPenalty: !ignoreNegative && applySl ? penalty : 0, disadvantages: applyDisadvantage ? disadvantages : [],
    mode: mixed && validMode ? mode : null, reason: mixed && reasonText ? reasonText : null,
    arbitration: mixed && requireReason && decided ? { decisionId: 'DIV-05', mode, reason: reasonText } : null };
}

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
  const layers = magicTestModifiers(actor, skillLabel, { ...settings.context, carac: settings.context?.carac || test.skillCharacteristic || characteristic }, { talentRows: talents.slModifiers, applies: test.appliesKey });
  // Clés « … adverse » du porteur opposé (le combat ne les lit que hors défense).
  const adverse = opponent && role !== 'defender' ? magicAdverseModifiers(opponent, skillLabel) : [];
  // États : un seul calcul pour tous les Tests (MJ 06/11 Q19), exceptions comprises.
  // Endurance de l'anachorète (p. 226) : malus et Désavantages d'États ignorés ; Inconscient, Surpris et la vue exigée restent.
  const ignoreAll = flags?.ignoreConditionPenalties === true;
  const rules = conditionTestRules(test.levels instanceof Map ? test.levels : conditionLevels(actor), { kind, attr: characteristic, context: situation, ignoreAll });
  // U8 L4 : pénalités d'États cumulées par le moteur d'effets (la plus forte seule) : ignoreFatiguePenalties (Exténué sans
  // pénalité ; Clarté d'esprit n'efface pas Exténué, MJ 06/11), Clarté d'esprit (`clarityOfThought` : Sonné sur un Test mental),
  // talents `ignoreConditionPenalty`, Endurance de l'anachorète.
  const penaltyEffects = conditionPenaltyEffects(rules.relevant, { ignoreAll, ignoreFatigue: Boolean(flags?.ignoreFatiguePenalties || test.ignoreFatigue),
    ignoreStun: Boolean(flags?.clarityOfThought && MENTAL.has(characteristic)), talentIgnores: talents.ignoredPenalties });
  const penalty = penaltyEffects.penalty;
  // Des pénalités d'États différentes ne s'additionnent pas : DR contre Désavantage, le MJ tranche.
  const worstDisadvantage = conditionDisadvantageEffects(conditionDisadvantageRows(rules.disadvantages));
  const mix = resolveConditionPenaltyMix({ penalty, disadvantages: worstDisadvantage, mode: situation.conditionPenaltyMode, ignoreNegative: talents.ignoreNegative });
  const { mixed, appliedPenalty, disadvantages: disadvantageRows } = mix;
  const mixedUnresolved = mix.modeMissing ? [MIXED_CONDITION_QUESTION] : [];
  const penaltyRows = appliedPenalty ? [{ id: 'conditions', label: 'Plus forte pénalité d’État', amount: -appliedPenalty }] : [];
  // U8 L6 : États écartés par la règle de cumul, montrés barrés (Q9).
  const droppedRows = penaltyEffects.dropped.map(row => ({ id: 'condition:' + row.key, label: 'État ' + ((actor?.states || []).find(s => s.key === row.key)?.name || row.key),
    amount: -(penaltyEffects.levels.get(row.key) || 0), rule: row.rule, source: 'État' }));
  // CA13 : séquelles durables. Le combat fournit la main, le bouclier, l'arme et ses réponses ; un Test secondaire n'a pas d'écran
  // pour ces circonstances : séquelles inconditionnelles seulement, sauf la vue (deux yeux perdus), question commune aux États.
  const sequelae = sequelaTestRules({ actor, opponent, skillLabel, actionLabel: skillLabel, carac: situation.carac || test.skillCharacteristic || characteristic, kind,
    context: situation, ...(test.sequela || {}) });
  const durable = list => list.map(row => ({ ...row, durable: true }));
  // Main directrice perdue sur un Test secondaire de mêlée (réponse « oui ») : la pénalité de main non directrice, réduite par les
  // 100 PX de réapprentissage ; le combat l'applique lui-même (règle générale, Ambidextre).
  const offHand = !test.sequela && sequelae.offHand?.forced ? [{ id: 'penalty:offHand', label: 'Main secondaire (séquelle)', amount: Math.min(0, -2 + sequelae.offHand.reduction) }] : [];
  const sequelaRows = { modifiers: [...durable(sequelae.modifiers), ...offHand], advantages: durable(sequelae.advantages), disadvantages: durable(sequelae.disadvantages) };
  // CA22 : questions de circonstance (champ `sequela…`) ; deux yeux perdus : question de la vue des États.
  const sightAsked = sequelae.unresolved.includes('Séquelle : préciser si le Test est influencé par la vue.');
  const sequelaNeeds = test.sequela ? [] : [...(sightAsked ? [{ field: 'reliesOnSight', label: CONDITION_QUESTIONS.sight }] : []), ...sequelae.questions];
  // CA14 : Inconscient, aucun Test ; Surpris, aucun Test qui demande d'agir pendant ce Round.
  const levels = test.levels instanceof Map ? test.levels : conditionLevels(actor);
  const actorRestrictions = [...(levels.get('inconscient') && test.passive !== true ? ['Inconscient : aucun Test ne peut être tenté.'] : []),
    ...(test.isAction === true && levels.get('surpris') ? ['Surpris : aucun Test qui demande d’agir pendant ce Round.'] : []),
    // REGLES-10 : Chant vivifiant, la créature qui s'éveille perd son prochain Tour (aucune Action).
    ...(test.isAction === true && awakeningSpell(actor) ? [awakeningMessage(actor)] : [])];
  const conditions = { rules, penaltyEffects, penalty, appliedPenalty, mixed, mixedUnresolved, penaltyRows, disadvantageRows, droppedRows,
    penaltyStates: [...penaltyEffects.levels].filter(([, value]) => value).map(([key]) => key) };

  const slModifiers = [...layers.magic, ...adverse, ...penaltyRows, ...layers.talents, ...sequelaRows.modifiers];
  const advantageSources = [...talents.advantageSources, ...sequelaRows.advantages];
  const disadvantageSources = [...disadvantageRows, ...talents.disadvantageSources, ...sequelaRows.disadvantages];
  const unresolved = [...rules.unresolved, ...mixedUnresolved, ...talents.unresolved, ...layers.unresolved, ...(test.sequela ? sequelae.unresolved : sequelaNeeds.map(row => row.label))];
  const needsInput = [...[...new Set([...rules.unresolved, ...mixedUnresolved])].map(label => ({ field: QUESTION_FIELDS.get(label) ?? null, label })),
    ...sequelaNeeds].filter((row, index, list) => !row.field || list.findIndex(other => other.field === row.field) === index);
  // Questions réellement applicables à ce Test, y compris celles déjà répondues. Elles ne bloquent pas le calcul.
  const questions = [...[...new Set([...(rules.questions || []), ...(mixed ? [MIXED_CONDITION_QUESTION] : [])])].map(label => ({ field: QUESTION_FIELDS.get(label), label })),
    ...(test.sequela ? [] : sequelae.applicableQuestions)].filter((row, index, list) => row.field && list.findIndex(other => other.field === row.field) === index);
  const tag = (list, source, rowKind) => list.map(row => ({ ...row, source, kind: rowKind }));
  const rows = [...tag(layers.magic, 'Sort ou prière', 'modifier'), ...tag(adverse, 'Effet adverse', 'modifier'), ...tag(penaltyRows, 'État', 'modifier'),
    ...tag(layers.talents, 'Talent', 'modifier'), ...tag(disadvantageRows, 'État', 'disadvantage'), ...tag(talents.advantageSources, 'Talent', 'advantage'),
    ...tag(talents.disadvantageSources, 'Talent', 'disadvantage'), ...tag(sequelaRows.modifiers, 'Séquelle', 'modifier'),
    ...tag(sequelaRows.advantages, 'Séquelle', 'advantage'), ...tag(sequelaRows.disadvantages, 'Séquelle', 'disadvantage'), ...droppedRows.map(row => ({ ...row, kind: 'modifier', dropped: true })),
    // T10 : pénalité d'État annulée par Obstiné, gardée au détail, barrée (« malus ramené à 0 et visible »), comme au combat (Q9).
    ...(talents.ignoreNegative && penalty > 0 ? [{ id: 'conditions', label: 'Plus forte pénalité d’État', amount: -penalty, source: 'État', kind: 'modifier', dropped: true, rule: 'Obstiné' }] : [])];
  return { slModifiers, advantageSources, disadvantageSources, rows, needsInput, questions, unresolved,
    restrictions: [...actorRestrictions, ...rules.restrictions, ...sequelae.restrictions], scoreDelta: sequelae.scoreDelta,
    // CA13, CA14 : restrictions qui interdisent le Test lui-même (Inconscient, Surpris sur une Action, séquelle).
    blockingRestrictions: [...actorRestrictions, ...sequelae.restrictions],
    ignoreNegative: talents.ignoreNegative, forceSuccess: talents.forceSuccess, penalty: appliedPenalty, penaltyStates: conditions.penaltyStates,
    droppedModifiers: droppedRows, parts: { talents, layers, adverse, conditions, sequelae } };
}

/**
 * Plafonds de fin de calcul, sur la liste complète de l'appelant (modifiée sur place, comme le faisait `buildCombatTest`) :
 * Distrait (`noMomentumOrAdvantage`) ôte tout Avantage ; Obstiné (`ignoreNegativeModifiers`, V5 p. 127) ramène à 0 tout
 * modificateur négatif et ôte tout Désavantage. Les lignes `durable` (séquelles, CA13) échappent aux deux, comme au combat où
 * elles sont ajoutées après les plafonds.
 */
export function finalizeV5TestModifiers(actor, resolved, { slModifiers, advantageSources, disadvantageSources }) {
  const keepDurable = list => list.splice(0, list.length, ...list.filter(row => row?.durable === true));
  if ((actor?.states || []).some(s => s.restriction === 'noMomentumOrAdvantage' && sourceActive(s))) keepDurable(advantageSources);
  if (resolved.ignoreNegative) { for (const row of slModifiers) if (row.amount < 0 && row.durable !== true) row.amount = 0; keepDurable(disadvantageSources); }
}

const optionRank = result => [result.success ? 1 : 0, result.sl];
/**
 * Q6 · T6 : Test secondaire complet sur un score de fiche saisi ou lu (arquebuse à salve, Warp Blade, convalescence, Déterminé).
 * `score` : score de fiche nu ; `slModifiers` / `advantageSources` / `disadvantageSources` : ceux propres au Test (difficulté…),
 * placés avant les modificateurs communs ; `test` et `context` : ceux de `resolveV5TestModifiers` (le contexte est celui de CE
 * Test, pas celui du Test principal de l'action). Une précision d'État manquante (`needsInput`) laisse le Test non résolu (CA8) :
 * `{ ready: false, needsInput, unresolved }`. Sinon les plafonds (`finalizeV5TestModifiers`) portent sur la liste complète, comme au
 * combat, et le testeur garde la meilleure option quand l'Avantage lui permet d'inverser le jet.
 * Une restriction (CA14) rend `{ ready: false, blocked: true, restrictions, needsInput }` (motifs en `needsInput`, champ nul).
 * Rend `{ ready: true, result, preview, modifiers, advantageSources, disadvantageSources, rows, unresolved, restrictions }` ;
 * `modifiers` (montants après plafonds) et `rows` (source de chaque ligne commune, écartées comprises) forment le détail (CA5).
 */
export function previewV5SecondaryTest(actor, { score, roll, kind = 'test', test = {}, context = {}, slModifiers = [], advantageSources = [], disadvantageSources = [] } = {}) {
  const common = resolveV5TestModifiers(actor, { kind, ...test }, context || {});
  // CA14 : une restriction (Inconscient, Surpris sur un Test d'action, séquelle qui l'interdit) bloque le Test, avec son motif.
  if (common.restrictions.length) return { ready: false, blocked: true, restrictions: common.restrictions,
    needsInput: common.restrictions.map(label => ({ field: null, label, restriction: true })), questions: common.questions, unresolved: [...common.restrictions, ...common.unresolved], rows: common.rows };
  if (common.needsInput.length) return { ready: false, needsInput: common.needsInput, questions: common.questions, unresolved: common.unresolved, rows: common.rows };
  const lists = { slModifiers: [...slModifiers, ...common.slModifiers].map(row => ({ ...row })),
    advantageSources: [...advantageSources, ...common.advantageSources], disadvantageSources: [...disadvantageSources, ...common.disadvantageSources] };
  finalizeV5TestModifiers(actor, common, lists);
  const rows = [...common.rows.map(row => {
    if (!row.dropped && row.kind === 'modifier' && row.amount < 0 && row.durable !== true && common.ignoreNegative) return { ...row, dropped: true, rule: 'Obstiné' };
    const remaining = row.kind === 'advantage' ? lists.advantageSources : row.kind === 'disadvantage' ? lists.disadvantageSources : null;
    if (!row.dropped && remaining && !remaining.some(item => item.id === row.id)) return { ...row, dropped: true, rule: row.kind === 'disadvantage' && common.ignoreNegative ? 'Obstiné' : 'Distrait' };
    return row;
  }), ...slModifiers.filter(row => common.ignoreNegative && row.amount < 0 && row.durable !== true).map(row => ({ ...row, source: 'Test', kind: 'modifier', dropped: true, rule: 'Obstiné' }))];
  const preview = previewV5Test({ score: Math.max(0, score + (common.scoreDelta || 0)), roll, kind, ...lists });
  const [first, ...others] = preview.options;
  const option = others.reduce((best, row) => { const [a, b] = [optionRank(row.result), optionRank(best.result)]; return a[0] > b[0] || a[0] === b[0] && a[1] > b[1] ? row : best; }, first);
  return { ready: true, result: option.result, optionId: option.id, preview, modifiers: lists.slModifiers, advantageSources: lists.advantageSources,
    disadvantageSources: lists.disadvantageSources, rows, needsInput: [], questions: common.questions, unresolved: common.unresolved, restrictions: common.restrictions };
}

/** Détail lisible d'un Test secondaire (CA5) : chaque modificateur avec son montant, puis Avantages et Désavantages. */
export function secondaryTestDetail(secondary) {
  if (!secondary?.ready) return [];
  const sign = value => (value > 0 ? '+' : value < 0 ? '−' : '±') + Math.abs(value);
  const dropped = (secondary.rows || []).filter(row => row.dropped).map(row => `${row.label} ${sign(row.amount)} DR (écarté${row.rule ? ' : ' + row.rule : ''})`);
  return [...secondary.modifiers.map(row => `${row.label} ${sign(row.amount)} DR`), ...secondary.advantageSources.map(row => `Avantage : ${row.label || row.id}`),
    ...secondary.disadvantageSources.map(row => `Désavantage : ${row.label || row.id}`), ...dropped];
}

/**
 * CA22 : libellé de la question d'un champ de contexte d'un Test secondaire (États ou séquelle du sujet), pour les écrans qui
 * affichent aussi les réponses déjà données ; null pour un champ inconnu. `testQuestionKind` : 'mode' (DR ou Désavantage) ou 'boolean'.
 */
export function testQuestionLabel(field, subject = null) {
  for (const [label, key] of QUESTION_FIELDS) if (key === field) return label;
  return sequelaQuestionLabel(field, subject);
}
export const testQuestionKind = field => (field === 'conditionPenaltyMode' ? 'mode' : 'boolean');
/** Champs de séquelle déjà répondus dans un contexte (`sequela…`), pour que le MJ puisse revenir sur sa réponse. */
export const answeredSequelaFields = (context = {}) => Object.keys(context || {}).filter(key => /^sequela(?!NoCircumstanceInput)/.test(key) && typeof context[key] === 'boolean');
