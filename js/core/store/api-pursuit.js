// Commandes de poursuite du Store (docs/specs/poursuite-v5, lot L3). En combat (D5, D9) : l'état vit dans
// `extensions.v5.pursuit`, chaque Test se joue au Tour de son personnage et prend son Action ; aperçu émis puis comparé à
// l'application (révision, ↶/↷, Obstiné). Hors combat (D8) : un aperçu, une application, rien de conservé. La règle est
// dans js/core/v5-pursuit.js ; ici seulement l'état, le journal et les garde-fous.
import { uid, cloneValue } from '../models.js';
import { v5StoreActionClock } from '../v5-store-action.js';
import { withEngagement } from '../engagements.js';
import { consumeObstinate } from '../v5-obstinate.js';
import { recordV5ActionUsage, brokenEscapeActionSpent, combatActionBlock } from './v5-action-guards.js';
import { engagementLogEntry } from './api-engagements.js';
import { PURSUIT_SOURCE, pursuitMovementOf, pursuitMovementIssues, pickPursuitPair, pursuitObstacleSide, pursuitOpposition, suggestFactors, drawObstacle, freeObstacle,
  evaluatePursuit, previewPursuitTest as previewPursuitCheck, previewObstacleTest as previewObstacleCheck } from '../v5-pursuit.js';

const FACTOR_KEYS = ['won', 'speed', 'terrain'];
const FACTOR_LABELS = { won: 'Test gagné', speed: 'Mouvement', terrain: 'terrain' };
const userError = message => Object.assign(new Error(message), { userFacing: true });
const blocked = error => ({ ready: false, status: 'blocked', error });
const people = state => state?.combat?.participants || [];
const personOf = (state, id) => people(state).find(row => row.id === id) || null;
const nameOf = (state, id) => personOf(state, id)?.name || id;
const namesOf = (state, ids) => ids.map(id => nameOf(state, id)).join(', ');
const pursuitOf = state => state?.extensions?.v5?.pursuit || null;
const withPursuit = (draft, pursuit) => ({ ...draft, extensions: { ...(draft.extensions || {}), v5: { ...(draft.extensions?.v5 || {}), pursuit } } });
// Lignes données dans l'ordre chronologique ; le journal est tenu du plus récent au plus ancien.
const withLines = (draft, lines, actorId = null) => ({ ...draft, log: [...lines.map(text => engagementLogEntry(text, actorId)).reverse(), ...(draft.log || [])].slice(0, 300) });
const groupOf = pursuit => (pursuit.obstacleSide === 'prey' ? pursuit.preyIds : pursuit.obstacleSide === 'pursuers' ? pursuit.pursuerIds : []);
const signed = value => (value > 0 ? `+${value}` : String(value));
const notReady = out => ({ ...out, ready: false, status: out.blocked ? 'blocked' : 'requires-input',
  error: out.error || (out.needsInput || []).map(row => row.label).join(' ') || (out.unresolved || []).join(' ') || 'Test incomplet.' });
const testRow = (out, participantId, extra = {}) => ({ participantId, skill: out.skill, roll: out.test.roll, score: out.score, sl: out.test.sl,
  success: out.test.success, astonishing: out.astonishing === true, detail: out.detail, ...extra });

/** Deux camps distincts, non vides, de participants actifs de la rencontre en cours. Rend un message d'erreur ou null. */
function campError(state, preyIds, pursuerIds) {
  const ids = [...preyIds, ...pursuerIds];
  if (!preyIds.length || !pursuerIds.length || new Set(ids).size !== ids.length) return 'Fuyards et poursuivants : deux camps distincts, chacun d’au moins un personnage.';
  const missing = ids.filter(id => personOf(state, id)?.zone !== 'active');
  return missing.length ? `Seuls les participants actifs de la rencontre en cours prennent part à la poursuite (${missing.join(', ')}).` : null;
}

/** Mouvements comptés (D14), corrigés par le MJ ; une correction est un nombre positif ou nul. */
function movementOf(state, ids, corrected = {}) {
  const movement = {};
  for (const id of ids) {
    if (Object.hasOwn(corrected, id)) {
      if (!Number.isFinite(corrected[id]) || corrected[id] < 0) throw userError(`Mouvement de ${nameOf(state, id)} : un nombre positif ou nul.`);
      movement[id] = corrected[id];
    } else movement[id] = pursuitMovementOf(personOf(state, id), people(state));
  }
  return movement;
}

const ruleState = pursuit => ({ preyIds: pursuit.preyIds, pursuerIds: pursuit.pursuerIds, movement: pursuit.movement, obstacleSide: pursuit.obstacleSide,
  opposed: pursuit.opposed, factors: pursuit.factors || {}, obstacles: pursuit.obstacles });
/** D22 : une ligne par Mouvement inconnu ou nul, qui attend la saisie du MJ. */
const movementLines = (state, pursuit) => pursuitMovementIssues(pursuit)
  .map(issue => `Poursuite · ${nameOf(state, issue.participantId)} : ${issue.label} ; ni Mouvement double ni paire automatique avant.`);
const pairText = (state, pair) => (pair ? `Test opposé de ${nameOf(state, pair.pursuerId)} contre ${nameOf(state, pair.preyId)}` : 'paire du Test opposé en attente des Mouvements');

/** Issue en mots, avec l'issue partielle (D15) : qui a franchi, ce qu'il peut encore faire. */
function outcomeText(state, outcome) {
  if (outcome.reason === 'gm') return `abandon du MJ${outcome.kind ? ` (${outcome.kind === 'caught' ? 'fuyard rattrapé' : 'fuyard échappé'})` : ''}.`;
  let text = `${outcome.kind === 'caught' ? 'fuyard rattrapé' : 'fuyard échappé'} (${outcome.label}).`;
  const partial = outcome.partial;
  if (partial) {
    text += ` Ont franchi leur Obstacle : ${namesOf(state, partial.crossedIds)}.`;
    if (partial.canEscapeAnyway) text += ' Chacun peut encore s’échapper en abandonnant les autres (Retirer de la rencontre).';
    if (partial.canContinueAlone) text += ' Chacun peut continuer seul, avec une seule occasion d’attaquer ou de retenir le fuyard le plus lent.';
  }
  return text;
}

/** Compare la paire une fois les deux Tests faits (facteurs cochés par l'outil, D13), puis tranche si la règle le permet. */
function settle(state, pursuit) {
  const lines = [], opposition = pursuitOpposition(pursuit.opposed);
  if (opposition && pursuit.opposed.netSl === null) {
    pursuit.opposed = { ...pursuit.opposed, ...opposition };
    pursuit.factors ??= suggestFactors({ ...ruleState(pursuit) });
    lines.push(`Poursuite · Test opposé : ${opposition.winner === 'pursuer' ? 'les poursuivants l’emportent' : 'les fuyards l’emportent'} (${signed(opposition.netSl)} DR).`);
  }
  const evaluation = evaluatePursuit(ruleState(pursuit));
  if (evaluation.outcome) {
    pursuit.status = 'ended';
    pursuit.outcome = { ...evaluation.outcome, crossedIds: evaluation.crossedIds, partial: evaluation.partial, endedRound: state.combat?.round || 0 };
    lines.push(`Fin de poursuite : ${outcomeText(state, pursuit.outcome)}`);
  }
  return { pursuit, evaluation, lines };
}

/**
 * D20 : le fuyard Brisé a fait pendant ce Tour son Test de poursuite ou d'Obstacle (enregistrable seulement poursuite en cours) ;
 * ce Test vaut pour son obligation de fuite et de Sprint, et son Tour peut se terminer.
 */
export function pursuitTestThisTurn(state, actorId, turnId) {
  const pursuit = pursuitOf(state);
  if (!turnId || !pursuit?.preyIds?.includes(actorId)) return false;
  return [pursuit.opposed?.pursuer, pursuit.opposed?.prey, ...(pursuit.obstacles || []).map(row => row.test)]
    .some(test => test?.participantId === actorId && test.turnId === turnId);
}

/**
 * D21 : un Brisé fuyard d'une poursuite en cours n'a plus à fuir ni à sprinter, Test fait ou non ; son Tour se termine. Il le peut aussi
 * le Tour où son propre Test a terminé la poursuite (D20). Abandonnée ou finie avant ce Tour, l'obligation revient.
 */
export function pursuitFreesBrokenPrey(state, actorId, turnId) {
  const pursuit = pursuitOf(state);
  return (pursuit?.status === 'active' && pursuit.preyIds?.includes(actorId)) || pursuitTestThisTurn(state, actorId, turnId);
}

/** Abandon d'une poursuite en cours sans issue (D18), avec une ligne au journal ; une poursuite déjà finie s'efface sans bruit. */
export function withAbandonedPursuit(state, why) {
  const pursuit = pursuitOf(state);
  if (!pursuit) return state;
  const { pursuit: _gone, ...v5 } = state.extensions.v5;
  const next = { ...state, extensions: { ...state.extensions, v5 } };
  return pursuit.status === 'active' ? withLines(next, [`Poursuite abandonnée sans issue : ${why}.`]) : next;
}

/** D24 : scène qui porte la poursuite donnée (mise en pause) ; `pursuit` nul : scène sans poursuite (reprise, une seule copie). */
export function withScenePursuit(scene, pursuit) {
  const { pursuit: _old, ...v5 } = scene?.extensions?.v5 || {};
  return { ...scene, extensions: { ...(scene?.extensions || {}), v5: pursuit ? { ...v5, pursuit } : v5 } };
}
/** D24 : extensions de l'enveloppe sans la poursuite, partie avec sa scène. */
export function withoutScenePursuit(extensions) {
  const { pursuit: _gone, ...v5 } = extensions?.v5 || {};
  return { ...(extensions || {}), v5 };
}

/** Le participant prend part à une poursuite en cours. */
export function pursuitInvolves(state, id) {
  const pursuit = pursuitOf(state);
  return pursuit?.status === 'active' && [...pursuit.preyIds, ...pursuit.pursuerIds].includes(id);
}

/**
 * Participant retiré de la rencontre ou mis au banc pendant une poursuite en cours : il sort du compte de son camp (réussites exigées
 * recalculées, paire refaite s'il en était et que le Test opposé n'est pas comparé), avec une ligne au journal. Son camp vide, la
 * poursuite est abandonnée sans issue (D18). À appeler avant de retirer le participant (son nom sert au journal).
 */
export function withoutPursuitParticipant(state, id, why) {
  if (!pursuitInvolves(state, id)) return state;
  const pursuit = cloneValue(pursuitOf(state)), name = nameOf(state, id), prey = pursuit.preyIds.includes(id);
  pursuit.preyIds = pursuit.preyIds.filter(other => other !== id);
  pursuit.pursuerIds = pursuit.pursuerIds.filter(other => other !== id);
  if (!pursuit.preyIds.length || !pursuit.pursuerIds.length) return withAbandonedPursuit(state, `${name} ${why}, son camp est vide`);
  const { [id]: _gone, ...movement } = pursuit.movement;
  pursuit.movement = movement;
  pursuit.obstacles = pursuit.obstacles.filter(row => row.participantId !== id);
  if (pursuit.opposed.netSl === null && [pursuit.pair?.pursuerId, pursuit.pair?.preyId].includes(id)) {
    pursuit.pair = pickPursuitPair(pursuit);
    for (const role of ['pursuer', 'prey']) if (pursuit.opposed[role] && pursuit.opposed[role].participantId !== pursuit.pair?.[role + 'Id']) pursuit.opposed[role] = null;
  }
  const settled = settle(state, pursuit);
  return withLines(withPursuit(state, settled.pursuit), [`Poursuite · ${name} ${why} : sort du camp des ${prey ? 'fuyards' : 'poursuivants'}.`, ...settled.lines], id);
}

export function createPursuitApi({ api, currentEnvelope }) {
  const issued = new Map(), appliedScenes = new Map();
  const issue = plan => {
    plan.previewId = uid();
    issued.set(plan.previewId, JSON.stringify(plan));
    while (issued.size > 100) issued.delete(issued.keys().next().value);
    return plan;
  };
  // Aperçu émis par ce Store, inchangé, sur la révision courante ; sinon « recalculez ».
  const checkIssued = (plan, what) => {
    if (!plan?.ready || !plan.previewId || issued.get(plan.previewId) !== JSON.stringify(plan)) return userError(`Aperçu ${what} absent ou modifié ; recalculez.`);
    if ((currentEnvelope().localRevision || 0) !== plan.baseRevision) return userError(`La partie a changé ; recalculez ${what === 'de poursuite hors combat' ? 'la poursuite' : 'le Test'}.`);
    return null;
  };
  const finish = (saved, result) => Promise.resolve(saved).then(out => (out?.ok === false ? { status: 'error', reason: out.error || 'Écriture refusée ; état inchangé.' } : { status: 'applied', ...result(), persistence: out }));
  const activePursuit = state => {
    const pursuit = pursuitOf(state);
    if (!pursuit || pursuit.status !== 'active') throw userError('Aucune poursuite en cours.');
    return cloneValue(pursuit);
  };
  // D5, D9 : un Test se joue au Tour de son personnage et prend l'Action de ce Tour.
  const turnBlock = (state, pursuit, participantId) => {
    if (!pursuit || pursuit.status !== 'active') return blocked('Aucune poursuite en cours.');
    const clock = v5StoreActionClock(state);
    if (!clock.turnId || state.combat?.currentActorId !== participantId) return blocked('Le Test se joue pendant le Tour de ce personnage.');
    if (brokenEscapeActionSpent(state, participantId, clock) || combatActionBlock(state, participantId)) return blocked(`${nameOf(state, participantId)} a déjà utilisé l’Action de ce Tour.`);
    return null;
  };
  const obstaclesOpen = pursuit => evaluatePursuit(ruleState(pursuit)).pending === 'obstacles';
  const command = (type, actorId, change) => api.executeCommand(type, draft => {
    const { pursuit, lines } = change(draft, cloneValue(pursuitOf(draft)));
    return withLines(withPursuit(draft, pursuit), lines, actorId);
  });

  return {
    getPursuit() { const pursuit = pursuitOf(currentEnvelope()); return pursuit ? cloneValue(pursuit) : null; },
    /**
     * Lance la poursuite en combat depuis le panneau du Brisé : refusée si le fuyard est hors de vue de tout ennemi (CA12).
     * `input` : { preyIds, pursuerIds, visibleToAnyEnemy?, movement?, obstacleSide? (sans PJ, D12), pair? (correction du MJ, CA1) }.
     */
    startPursuit({ preyIds = [], pursuerIds = [], visibleToAnyEnemy, movement: corrected = {}, obstacleSide: chosenSide = null, pair: override = null } = {}) {
      const state = currentEnvelope();
      if (pursuitOf(state)?.status === 'active') throw userError('Une poursuite est déjà en cours.');
      const invalid = campError(state, preyIds, pursuerIds);
      if (invalid) throw userError(invalid);
      const seen = typeof visibleToAnyEnemy === 'boolean' ? visibleToAnyEnemy
        : preyIds.every(id => state.extensions?.v5?.brokenEscape?.byActorId?.[id]?.visibleToAnyEnemy === true);
      if (!seen) throw userError('Le fuyard est hors de vue de tout ennemi : pas de poursuite.');
      const movement = movementOf(state, [...preyIds, ...pursuerIds], corrected);
      const obstacleSide = pursuitObstacleSide({ preyIds, pursuerIds, isPlayer: id => personOf(state, id)?.kind === 'PJ' })
        ?? (['prey', 'pursuers'].includes(chosenSide) ? chosenSide : null);
      if (!obstacleSide) throw userError('Aucun PJ dans la poursuite : désignez le camp qui franchit les Obstacles.');
      if (override && (!pursuerIds.includes(override.pursuerId) || !preyIds.includes(override.preyId))) throw userError('Paire corrigée : un poursuivant contre un fuyard de la poursuite.');
      const pair = pickPursuitPair({ preyIds, pursuerIds, movement, override });
      return command('pursuit-start', pair?.pursuerId ?? pursuerIds[0], draft => {
        const pursuit = { id: uid(), mode: 'combat', status: 'active', source: PURSUIT_SOURCE, startedRound: draft.combat?.round || 0,
          scopeKey: v5StoreActionClock(draft).encounterId || null, preyIds: [...preyIds], pursuerIds: [...pursuerIds], movement, obstacleSide, pair,
          opposed: { pursuer: null, prey: null, netSl: null, winner: null }, factors: null, factorsTouched: [], obstacles: [], outcome: null, endApplied: [] };
        const settled = settle(draft, pursuit);
        return { pursuit: settled.pursuit, lines: [`Poursuite lancée : ${namesOf(draft, preyIds)} poursuivi(s) par ${namesOf(draft, pursuerIds)} ; ${pairText(draft, pair)} (${PURSUIT_SOURCE}).`,
          ...movementLines(draft, pursuit), ...settled.lines] };
      });
    },
    /**
     * Mouvement corrigé par le MJ (D14) : la paire est recalculée tant que le Test opposé n'est pas commencé ; le Mouvement double peut trancher.
     * Le facteur « Mouvement » déduit suit la correction tant que le MJ n'a pas touché sa case (D13).
     */
    setPursuitMovement(participantId, value) {
      const state = currentEnvelope(), current = activePursuit(state);
      if (![...current.preyIds, ...current.pursuerIds].includes(participantId)) throw userError('Ce personnage ne prend pas part à la poursuite.');
      movementOf(state, [participantId], { [participantId]: value });
      return command('pursuit-movement', participantId, (draft, pursuit) => {
        pursuit.movement = { ...pursuit.movement, [participantId]: value };
        if (!pursuit.pair?.forced && !pursuit.opposed.pursuer && !pursuit.opposed.prey) pursuit.pair = pickPursuitPair(pursuit);
        if (pursuit.factors && !(pursuit.factorsTouched || []).includes('speed')) pursuit.factors = { ...pursuit.factors, speed: suggestFactors(ruleState(pursuit)).speed };
        const settled = settle(draft, pursuit);
        return { pursuit: settled.pursuit, lines: [`Poursuite · Mouvement de ${nameOf(draft, participantId)} : ${value} (MJ).`, ...movementLines(draft, pursuit), ...settled.lines] };
      });
    },
    previewPursuitTest({ participantId, skill, roll, context = {} } = {}) {
      const state = currentEnvelope(), pursuit = pursuitOf(state);
      const block = turnBlock(state, pursuit, participantId);
      if (block) return block;
      if (!pursuit.pair) return blocked('Paire du Test opposé en attente : saisissez d’abord les Mouvements inconnus ou nuls.');
      const role = pursuit.pair.pursuerId === participantId ? 'pursuer' : pursuit.pair.preyId === participantId ? 'prey' : null;
      if (!role) return blocked('Seule la paire (poursuivant le plus rapide, fuyard le plus lent) fait le Test de poursuite.');
      if (pursuit.opposed[role]) return blocked('Test de poursuite déjà joué.');
      const out = previewPursuitCheck(personOf(state, participantId), { skill, roll, role, context });
      if (!out.ready) return notReady(out);
      const turnId = v5StoreActionClock(state).turnId;
      return issue({ ready: true, kind: 'pursuit-test', baseRevision: state.localRevision || 0, pursuitId: pursuit.id, participantId, role, turnId,
        context: cloneValue(context), choices: out.choices || [], test: testRow(out, participantId, { turnId, round: state.combat?.round || 0 }) });
    },
    /** Une entrée d'historique : Test, Action du Tour, Obstiné, comparaison de la paire et fin éventuelle (CA13, CA15). */
    applyPursuitTest(supplied) {
      const plan = cloneValue(supplied), refused = checkIssued(plan, 'de Test de poursuite');
      if (refused) return Promise.reject(refused);
      let after;
      const saved = command('pursuit-test', plan.participantId, (draft, pursuit) => {
        if ((draft.localRevision || 0) !== plan.baseRevision) throw userError('La partie a changé ; recalculez le Test.');
        const block = turnBlock(draft, pursuit, plan.participantId);
        if (block || pursuit.id !== plan.pursuitId || pursuit.opposed[plan.role]) throw userError(`${block?.error || 'Test déjà joué.'} Recalculez.`);
        consumeObstinate(draft, personOf(draft, plan.participantId), plan.context);
        recordV5ActionUsage(draft, plan.participantId, `pursuit-test:${pursuit.id}:${plan.turnId}`);
        pursuit.opposed[plan.role] = plan.test;
        const { test } = plan, settled = settle(draft, pursuit);
        after = settled.pursuit;
        return { pursuit: after, lines: [`Poursuite · ${nameOf(draft, plan.participantId)} (${plan.role === 'pursuer' ? 'poursuivant' : 'fuyard'}) : Test de ${test.skill}, ${test.roll} → ${signed(test.sl)} DR, ${test.success ? 'réussite' : 'échec'}.`, ...settled.lines] };
      });
      issued.delete(plan.previewId);
      return finish(saved, () => ({ pursuit: cloneValue(after) }));
    },
    /** Facteurs favorables (D13) : trois cases booléennes, cochées par l'outil et modifiables par le MJ (0 à 3, CA4). */
    setPursuitFactors(patch = {}) {
      for (const [key, value] of Object.entries(patch)) if (!FACTOR_KEYS.includes(key) || typeof value !== 'boolean')
        throw userError('Facteurs favorables : trois cases (Test gagné, Mouvement, terrain), cochées ou non.');
      const current = activePursuit(currentEnvelope());
      if (!obstaclesOpen(current)) throw userError('Les facteurs favorables se règlent après le Test de poursuite.');
      return command('pursuit-factors', null, (draft, pursuit) => {
        pursuit.factors = { ...pursuit.factors, ...patch };
        pursuit.factorsTouched = [...new Set([...(pursuit.factorsTouched || []), ...Object.keys(patch)])];
        const checked = FACTOR_KEYS.filter(key => pursuit.factors[key] === true), settled = settle(draft, pursuit);
        return { pursuit: settled.pursuit, lines: [`Poursuite · facteurs favorables : ${checked.map(key => FACTOR_LABELS[key]).join(', ') || 'aucun'} (${checked.length}/3).`, ...settled.lines] };
      });
    },
    /** Obstacle d'un personnage du camp qui franchit (D3, D12) : tiré au d10 (`d10` injecté ou tiré ici), ou libre ({ label, skills }), tracé (CA9). */
    setPursuitObstacle(participantId, spec = {}) {
      const state = currentEnvelope(), current = activePursuit(state);
      if (!obstaclesOpen(current)) throw userError('Les Obstacles viennent après le Test de poursuite.');
      if (!groupOf(current).includes(participantId)) throw userError('Seul le camp qui franchit les Obstacles en rencontre.');
      const previous = current.obstacles.find(row => row.participantId === participantId);
      if (previous?.test) throw userError('Cet Obstacle a déjà été tenté.');
      const free = spec.label !== undefined || spec.skills !== undefined;
      const d10 = free ? null : spec.d10 ?? Math.floor(Math.random() * 10) + 1;
      let obstacle;
      try { obstacle = free ? freeObstacle(spec) : drawObstacle(d10); } catch (error) { throw userError(error.message); }
      return command('pursuit-obstacle', participantId, (draft, pursuit) => {
        pursuit.obstacles = [...pursuit.obstacles.filter(row => row.participantId !== participantId), { participantId, obstacle, d10, test: null, beneficiaryId: null }];
        const replaced = previous ? `, remplace « ${previous.obstacle.label} »` : '';
        const origin = free ? `obstacle libre du MJ, compétences : ${obstacle.skills.map(row => row.label).join(', ')}` : `d10 = ${d10}`;
        return { pursuit, lines: [`Poursuite · Obstacle de ${nameOf(draft, participantId)} : ${obstacle.label} (${origin}${replaced}).`] };
      });
    },
    /** Test d'Obstacle (CA10) ; Réussite éclatante : `beneficiaryId` parmi les alliés de la poursuite (D11). */
    previewObstacleTest({ participantId, skill, roll, context = {}, beneficiaryId = null } = {}) {
      const state = currentEnvelope(), pursuit = pursuitOf(state);
      const block = turnBlock(state, pursuit, participantId);
      if (block) return block;
      if (!obstaclesOpen(pursuit)) return blocked('Les Obstacles viennent après le Test de poursuite.');
      const row = pursuit.obstacles.find(item => item.participantId === participantId);
      if (!row) return blocked('Aucun Obstacle posé pour ce personnage.');
      if (row.test) return blocked('Cet Obstacle a déjà été tenté.');
      const allies = groupOf(pursuit).map(id => ({ id, name: nameOf(state, id) }));
      const out = previewObstacleCheck(personOf(state, participantId), { obstacle: row.obstacle, skill, roll, role: pursuit.obstacleSide === 'prey' ? 'prey' : 'pursuer', context, allies });
      if (!out.ready) return notReady(out);
      if (beneficiaryId !== null && !out.beneficiaryOptions.some(option => option.id === beneficiaryId))
        return blocked(out.astonishing ? 'Le bénéficiaire de l’Avantage se choisit parmi les alliés de la poursuite.' : 'L’Avantage à un autre demande une Réussite éclatante.');
      const turnId = v5StoreActionClock(state).turnId;
      return issue({ ready: true, kind: 'obstacle-test', baseRevision: state.localRevision || 0, pursuitId: pursuit.id, participantId, turnId,
        context: cloneValue(context), choices: out.choices || [], beneficiaryOptions: out.beneficiaryOptions, beneficiaryId, test: testRow(out, participantId, { turnId, round: state.combat?.round || 0 }) });
    },
    applyObstacleTest(supplied) {
      const plan = cloneValue(supplied), refused = checkIssued(plan, 'de Test d’Obstacle');
      if (refused) return Promise.reject(refused);
      let after;
      const saved = command('pursuit-obstacle-test', plan.participantId, (draft, pursuit) => {
        if ((draft.localRevision || 0) !== plan.baseRevision) throw userError('La partie a changé ; recalculez le Test.');
        const block = turnBlock(draft, pursuit, plan.participantId), row = pursuit?.obstacles.find(item => item.participantId === plan.participantId);
        if (block || pursuit.id !== plan.pursuitId || !row || row.test) throw userError(`${block?.error || 'Obstacle déjà tenté.'} Recalculez.`);
        consumeObstinate(draft, personOf(draft, plan.participantId), plan.context);
        recordV5ActionUsage(draft, plan.participantId, `pursuit-obstacle:${pursuit.id}:${plan.turnId}`);
        Object.assign(row, { test: plan.test, beneficiaryId: plan.beneficiaryId });
        const { test } = plan, settled = settle(draft, pursuit);
        after = settled.pursuit;
        const advantage = test.astonishing ? ` ; Réussite éclatante${plan.beneficiaryId ? ` : Avantage à ${nameOf(draft, plan.beneficiaryId)}` : ''}` : '';
        return { pursuit: after, lines: [`Poursuite · ${nameOf(draft, plan.participantId)} ${test.success ? 'franchit' : 'ne franchit pas'} son Obstacle (${test.skill}, ${test.roll} → ${signed(test.sl)} DR)${advantage}.`, ...settled.lines] };
      });
      issued.delete(plan.previewId);
      return finish(saved, () => ({ pursuit: cloneValue(after) }));
    },
    /** Abandon du MJ (CA17) ; `kind` facultatif ('caught' | 'escaped') pour donner tout de même une issue aux boutons de fin. */
    endPursuit({ reason = 'gm', kind = null } = {}) {
      if (reason !== 'gm' || ![null, 'caught', 'escaped'].includes(kind)) throw userError('Fin de poursuite : abandon du MJ, avec ou sans issue.');
      activePursuit(currentEnvelope());
      return command('pursuit-end', null, (draft, pursuit) => {
        pursuit.status = 'ended';
        pursuit.outcome = { kind, reason: 'gm', label: 'Abandon du MJ', crossedIds: [], partial: null, endedRound: draft.combat?.round || 0 };
        return { pursuit, lines: [`Fin de poursuite : ${outcomeText(draft, pursuit.outcome)}`] };
      });
    },
    /**
     * Boutons de fin (D6, D15), que le MJ clique ou non : 'engage' engage le fuyard rattrapé avec ses poursuivants ; 'remove' retire de
     * la rencontre un fuyard échappé, ou, rattrapé, celui qui a franchi son Obstacle. Hors combat : `scenePlan`, l'aperçu validé.
     */
    applyPursuitEnd(kind, { participantId = null, scenePlan = null } = {}) {
      const state = currentEnvelope(), stored = pursuitOf(state);
      const source = scenePlan ? appliedScenes.get(scenePlan.previewId) : stored?.status === 'ended' ? stored : null;
      if (!source) throw userError(scenePlan ? 'Poursuite hors combat non validée.' : 'Aucune poursuite terminée.');
      if (scenePlan && !(state.extensions?.v5?.scenePursuitReceipts || []).includes(scenePlan.previewId))
        throw userError('Poursuite hors combat annulée (↶) : validez-la de nouveau.');
      const outcome = source.outcome;
      if (kind === 'engage') {
        if (outcome?.kind !== 'caught') throw userError('Seul un fuyard rattrapé s’engage avec ses poursuivants.');
        if (!scenePlan && stored.endApplied?.includes('engage')) throw userError('Déjà engagés.');
        const preyIds = source.preyIds.filter(id => personOf(state, id)), pursuerIds = source.pursuerIds.filter(id => personOf(state, id));
        return api.executeCommand('pursuit-engage', draft => {
          let combat = draft.combat;
          for (const preyId of preyIds) for (const pursuerId of pursuerIds) combat = withEngagement(combat, preyId, pursuerId, draft.combat?.round || 0);
          const next = withLines({ ...draft, combat }, [`Poursuite · ${namesOf(draft, preyIds)} engagé(s) avec ${namesOf(draft, pursuerIds)} (MJ).`], preyIds[0]);
          return scenePlan ? next : withPursuit(next, { ...pursuitOf(draft), endApplied: [...(pursuitOf(draft).endApplied || []), 'engage'] });
        });
      }
      if (kind !== 'remove') throw userError('Fin de poursuite : engager ou retirer.');
      const allowed = outcome?.kind === 'escaped' ? source.preyIds : outcome?.partial?.canEscapeAnyway ? outcome.partial.crossedIds : [];
      if (!allowed.length) throw userError('Seul un fuyard échappé se retire de la rencontre.');
      const id = participantId ?? (allowed.length === 1 ? allowed[0] : null);
      if (!id) throw userError('Choisissez le fuyard à retirer.');
      if (!allowed.includes(id)) throw userError(outcome.kind === 'escaped' ? `${nameOf(state, id)} n’est pas un fuyard de cette poursuite.` : `${nameOf(state, id)} n’a pas franchi son Obstacle : il reste rattrapé.`);
      return api.removeParticipant(id);
    },
    /** Entrée de l'écran Jouer (D17) : grisée sans participants actifs de la rencontre en cours, avec son motif. */
    scenePursuitAvailability() {
      const count = people(currentEnvelope()).filter(row => row.zone === 'active').length;
      return count >= 2 ? { available: true, reason: null }
        : { available: false, reason: count ? 'Un seul participant dans la rencontre en cours : il en faut deux pour une poursuite.' : 'Aucun participant dans la rencontre en cours.' };
    },
    /**
     * Poursuite hors combat d'un bloc (D8) : aucune Action, aucun Round, rien de conservé. `input` : { preyIds, pursuerIds, movement?,
     * obstacleSide?, pair?, tests: { pursuer, prey } ({ skill, roll, context? }), factors?, obstacles: [{ participantId, d10 | label+skills,
     * skill, roll, context?, beneficiaryId? }] }. Prête quand la règle tranche ; sinon `error` dit ce qui manque.
     */
    previewScenePursuit(input = {}) {
      const state = currentEnvelope(), { preyIds = [], pursuerIds = [], tests = {}, obstacles: specs = [] } = input;
      const invalid = campError(state, preyIds, pursuerIds);
      if (invalid) return blocked(invalid);
      let movement;
      try { movement = movementOf(state, [...preyIds, ...pursuerIds], input.movement || {}); } catch (error) { return blocked(error.message); }
      const obstacleSide = pursuitObstacleSide({ preyIds, pursuerIds, isPlayer: id => personOf(state, id)?.kind === 'PJ' })
        ?? (['prey', 'pursuers'].includes(input.obstacleSide) ? input.obstacleSide : null);
      const pair = pickPursuitPair({ preyIds, pursuerIds, movement, override: input.pair });
      const errors = [], contexts = [];
      const plan = { kind: 'scene-pursuit', baseRevision: state.localRevision || 0, preyIds: [...preyIds], pursuerIds: [...pursuerIds], movement, obstacleSide, pair,
        opposed: { pursuer: null, prey: null, netSl: null, winner: null }, factors: null, obstacles: [] };
      for (const role of ['pursuer', 'prey']) {
        if (!pair || !tests[role]) continue;
        const spec = tests[role], id = role === 'pursuer' ? pair.pursuerId : pair.preyId;
        const out = previewPursuitCheck(personOf(state, id), { ...spec, role });
        if (!out.ready) { errors.push(`${nameOf(state, id)} : ${notReady(out).error}`); continue; }
        plan.opposed[role] = testRow(out, id);
        contexts.push({ participantId: id, context: cloneValue(spec.context || {}) });
      }
      const opposition = pursuitOpposition(plan.opposed);
      if (opposition) {
        Object.assign(plan.opposed, opposition);
        if (input.factors && Object.entries(input.factors).some(([key, value]) => !FACTOR_KEYS.includes(key) || typeof value !== 'boolean'))
          return blocked('Facteurs favorables : trois cases (Test gagné, Mouvement, terrain), cochées ou non.');
        plan.factors = { ...suggestFactors({ ...plan, obstacleSide }), ...(input.factors || {}) };
      }
      const group = obstacleSide === 'prey' ? preyIds : obstacleSide === 'pursuers' ? pursuerIds : [];
      if (opposition && evaluatePursuit(ruleState(plan)).pending === 'obstacles') for (const spec of specs) {
        if (!group.includes(spec.participantId)) { errors.push(`${nameOf(state, spec.participantId)} n’est pas du camp qui franchit les Obstacles.`); continue; }
        const free = spec.label !== undefined || spec.skills !== undefined, d10 = free ? null : spec.d10 ?? Math.floor(Math.random() * 10) + 1;
        let obstacle;
        try { obstacle = free ? freeObstacle(spec) : drawObstacle(d10); } catch (error) { errors.push(error.message); continue; }
        const row = { participantId: spec.participantId, obstacle, d10, test: null, beneficiaryId: null };
        plan.obstacles.push(row);
        if (spec.skill === undefined || spec.roll === undefined) continue;
        const out = previewObstacleCheck(personOf(state, spec.participantId), { obstacle, skill: spec.skill, roll: spec.roll, role: obstacleSide === 'prey' ? 'prey' : 'pursuer',
          context: spec.context || {}, allies: group.map(id => ({ id, name: nameOf(state, id) })) });
        if (!out.ready) { errors.push(`${nameOf(state, spec.participantId)} : ${notReady(out).error}`); continue; }
        const beneficiaryId = spec.beneficiaryId ?? null;
        if (beneficiaryId !== null && !out.beneficiaryOptions.some(option => option.id === beneficiaryId)) { errors.push('Le bénéficiaire de l’Avantage se choisit parmi les alliés de la poursuite.'); continue; }
        Object.assign(row, { test: testRow(out, spec.participantId), beneficiaryId, beneficiaryOptions: out.beneficiaryOptions });
        contexts.push({ participantId: spec.participantId, context: cloneValue(spec.context || {}) });
      }
      const evaluation = evaluatePursuit(ruleState(plan));
      const pending = { movement: evaluation.movementIssues.map(issue => `${nameOf(state, issue.participantId)} : ${issue.label}.`).join(' '),
        opposed: 'Test de poursuite des deux côtés à saisir.', 'obstacle-side': 'Aucun PJ : désignez le camp qui franchit les Obstacles.',
        obstacles: `Obstacles : ${evaluation.crossedIds.length} franchi(s) sur ${evaluation.required} exigé(s), d’autres Tests à jouer.` }[evaluation.pending];
      Object.assign(plan, { contexts, evaluation, ready: evaluation.outcome !== null, error: evaluation.outcome ? null : errors[0] || pending || null, errors });
      return plan.ready ? issue(plan) : plan;
    },
    /** Une entrée d'historique et une ligne de journal ; Obstiné consommé pour chaque Test qui l'a choisi (CA20). */
    applyScenePursuit(supplied) {
      const plan = cloneValue(supplied), refused = checkIssued(plan, 'de poursuite hors combat');
      if (refused) return Promise.reject(refused);
      const outcome = { ...plan.evaluation.outcome, crossedIds: plan.evaluation.crossedIds, partial: plan.evaluation.partial };
      const saved = api.executeCommand('pursuit-scene', draft => {
        if ((draft.localRevision || 0) !== plan.baseRevision) throw userError('La partie a changé ; recalculez la poursuite.');
        for (const row of plan.contexts) consumeObstinate(draft, personOf(draft, row.participantId), row.context);
        const opposed = plan.opposed.netSl === null ? '' : ` Test opposé : ${signed(plan.opposed.netSl)} DR.`;
        const next = withLines(draft, [`Poursuite hors combat : ${namesOf(draft, plan.preyIds)} poursuivi(s) par ${namesOf(draft, plan.pursuerIds)}.${opposed} Issue : ${outcomeText(draft, outcome)}`], plan.pair?.preyId ?? null);
        // Reçu de la validation, dans l'état annulable (le journal ne l'est pas) : ↶ le retire, et les boutons de fin le constatent.
        const receipts = [...(draft.extensions?.v5?.scenePursuitReceipts || []), plan.previewId].slice(-20);
        return { ...next, extensions: { ...(next.extensions || {}), v5: { ...(next.extensions?.v5 || {}), scenePursuitReceipts: receipts } } };
      });
      issued.delete(plan.previewId);
      return finish(saved, () => {
        appliedScenes.set(plan.previewId, { preyIds: plan.preyIds, pursuerIds: plan.pursuerIds, outcome });
        while (appliedScenes.size > 20) appliedScenes.delete(appliedScenes.keys().next().value);
        return { outcome: cloneValue(outcome) };
      });
    }
  };
}
