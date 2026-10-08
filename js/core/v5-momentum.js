/** Pure binary Momentum rules. Exceptions identify a loss reason, never a blanket immunity. */
const bool = (value, field) => {
  if (typeof value !== 'boolean') throw new TypeError(`${field} doit être booléen`);
  return value;
};
const count = value => {
  if (!Number.isInteger(value) || value < 0) throw new TypeError('Quantité d’événement invalide');
  return value;
};
const LOSS_REASONS = new Set(['oppositionLost', 'meleeTestFailed', 'woundsLost', 'conditionAcquired', 'combatPause', 'combatEnd']);
export function previewMomentumEvents({ hasMomentum, events = [], exceptions = [] } = {}) {
  let momentum = bool(hasMomentum, 'Élan');
  if (!Array.isArray(events) || !Array.isArray(exceptions)) throw new TypeError('Événements d’Élan invalides');
  const guards = exceptions.map(item => {
    if (!item || !LOSS_REASONS.has(item.reason) || typeof item.talentId !== 'string' || !item.talentId.trim()) throw new TypeError('Exception d’Élan invalide');
    bool(item.applies, 'Exception applicable');
    return { ...item };
  });
  const trace = [];
  const seen = new Set();
  for (const event of events) {
    if (!event || typeof event.id !== 'string' || !event.id.trim()) throw new TypeError('Événement sans identité');
    if (seen.has(event.id)) throw new TypeError('Événement d’Élan dupliqué');
    seen.add(event.id);
    let effect;
    if (event.type === 'opposedMeleeWon' || event.type === 'chargeEnemy') effect = 'gain';
    else if (event.type === 'opposedMeleeLost') effect = 'oppositionLost';
    else if (event.type === 'meleeTestFailed') effect = 'meleeTestFailed';
    else if (event.type === 'woundsLost') effect = count(event.amount) > 0 ? 'woundsLost' : 'none';
    else if (event.type === 'conditionAcquired') effect = count(event.instances) > 0 ? 'conditionAcquired' : 'none';
    else if (event.type === 'combatPause' || event.type === 'combatEnd') effect = event.type;
    else throw new TypeError('Événement d’Élan non couvert');
    const before = momentum;
    const preventedBy = guards.filter(guard => guard.applies && guard.reason === effect).map(guard => guard.talentId);
    if (effect === 'gain') momentum = true;
    else if (effect !== 'none' && !preventedBy.length) momentum = false;
    trace.push({ eventId: event.id, effect, before, after: momentum, preventedBy });
  }
  return { before: hasMomentum, after: momentum, details: trace };
}
/** Cost waivers and other ability quotas are separate; this checks only the Momentum payment quota. */
export function previewMomentumCost({ hasMomentum, paidExtraAttackUsedThisTurn, extraAttack = false, waived = false } = {}) {
  bool(hasMomentum, 'Élan'); bool(paidExtraAttackUsedThisTurn, 'Quota de dépense');
  bool(extraAttack, 'Attaque supplémentaire'); bool(waived, 'Exemption');
  const allowed = waived || (hasMomentum && (!extraAttack || !paidExtraAttackUsedThisTurn));
  return { allowed, reason: allowed ? null : !hasMomentum ? 'requiresMomentum' : 'paidExtraAttackLimit',
    cost: allowed && !waived ? 'loseMomentum' : null,
    nextMomentum: allowed && !waived ? false : hasMomentum,
    nextPaidExtraAttackUsedThisTurn: paidExtraAttackUsedThisTurn || (allowed && extraAttack && !waived),
    otherAbilityQuotasMustBeChecked: true };
}
