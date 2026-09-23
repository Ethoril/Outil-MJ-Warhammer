/** Pure E16 "et si" mode. It prepares an isolated E12 preview and never mutates input state. */
import { cloneValue } from './models.js';
import { applyResolution, previewResolution } from './resolution.js';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function participants(state) {
  if (Array.isArray(state?.participants)) return state.participants;
  if (isRecord(state?.participants)) return Object.values(state.participants);
  return [];
}

function participant(state, id) {
  return participants(state).find(item => item?.id === id) || null;
}

function assertRevisionedState(state) {
  if (!isRecord(state) || !Number.isInteger(state.revision) || state.revision < 0) {
    throw new TypeError('La simulation exige un état révisionné');
  }
}

function resolveInput(state, input = {}) {
  if (!isRecord(input) || !isRecord(input.action)) throw new TypeError('Action de simulation requise');
  const actor = isRecord(input.actor) ? input.actor : participant(state, input.actorId);
  const target = isRecord(input.target) ? input.target : (input.targetId ? participant(state, input.targetId) : null);
  if (!actor) throw new Error('Acteur de simulation introuvable');
  if (input.targetId && !target) throw new Error('Cible de simulation introuvable');
  if (input.baseRevision !== undefined && input.baseRevision !== state.revision) {
    return { stale: true, actor, target };
  }
  return { actor, target };
}

/** Build one isolated simulation from the current state and an explicit d100 result. */
export function simulateAction(state, input = {}) {
  assertRevisionedState(state);
  const resolved = resolveInput(state, input);
  if (resolved.stale) {
    return { status: 'stale', requiresPreview: true, baseRevision: state.revision, state: cloneValue(state) };
  }
  const preview = previewResolution({
    ...input,
    actor: resolved.actor,
    target: resolved.target,
    baseRevision: state.revision
  });
  return {
    status: 'pending',
    mode: 'simulation',
    baseRevision: state.revision,
    sourceState: cloneValue(state),
    preview: cloneValue(preview),
    // This copy is a presentation value. The real state remains untouched until applySimulation.
    simulatedState: cloneValue(state)
  };
}

export const beginSimulation = simulateAction;
export const previewSimulation = simulateAction;

/** Compare one deterministic action against explicit targets without sharing mutable previews. */
export function compareSimulationTargets(state, input = {}, targets = input.targets || []) {
  assertRevisionedState(state);
  if (!Array.isArray(targets) || targets.length === 0) throw new TypeError('Au moins une cible est requise');
  const simulations = targets.map(target => {
    const targetValue = isRecord(target) ? target : participant(state, target);
    if (!targetValue) throw new Error('Cible de simulation introuvable');
    return simulateAction(state, { ...input, target: targetValue, targetId: targetValue.id });
  });
  return { status: 'pending', mode: 'simulation-comparison', baseRevision: state.revision, simulations };
}

/** Apply exactly one chosen preview through the E12 CAS/idempotency rules. */
export function applySimulation(simulation, currentState) {
  if (!isRecord(simulation) || simulation.mode !== 'simulation' || !isRecord(simulation.preview)) {
    throw new TypeError('Simulation invalide');
  }
  if (simulation.status === 'discarded') return { status: 'discarded', state: cloneValue(currentState), simulation: cloneValue(simulation) };
  const result = applyResolution(simulation.preview, currentState);
  return { ...result, simulation: { ...cloneValue(simulation), status: result.status === 'applied' ? 'applied' : simulation.status } };
}

/** Discarding is explicit and returns a value for the UI; the source state is never touched. */
export function discardSimulation(simulation) {
  if (!isRecord(simulation) || simulation.mode !== 'simulation') throw new TypeError('Simulation invalide');
  return { status: 'discarded', simulation: { ...cloneValue(simulation), status: 'discarded' } };
}

export const abandonSimulation = discardSimulation;
