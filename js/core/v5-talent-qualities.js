/** Temporary action Qualities and source-pinned V5 weapon condition proposals. */
import registry from '../data/v5-quality-talent-contracts.json' with { type: 'json' };
import { getReferenceCatalogue } from './reference-catalog.js';
import { keywordMechanicalStatus } from './keywords.js';
import { normalizeQualities } from './quality-normalization.js';
import { evaluateV5Talents } from './v5-talents.js';

const IMPROVISED_WEAPON_ID = 'weapon-armes-corps-a-corps-base-arme-improvisee';
const qualityIds = registry.contracts.map(row => row.talentId);
const clone = structuredClone;
const knownWounds = target => target?.hp !== null && target?.hp !== undefined && target?.hp !== '' && Number.isFinite(Number(target.hp));
/** Exact published item identity or an explicit MJ declaration; weapon names are never interpreted. */
export function v5ActionQualityContext(normalized, qualities = normalized.action.qualities, catalogue = getReferenceCatalogue()) {
  const weapon = normalized.actor?.equipment?.find(row => row.id === normalized.action.extensions?.fiche?.equipmentId);
  const declared = normalized.v5.context || {};
  for (const key of ['weaponImprovised', 'silentTakedown', 'calledShot']) if (declared[key] != null && typeof declared[key] !== 'boolean') throw new TypeError('Contexte oui/non requis : ' + key);
  const sourceId = weapon?.baseId || weapon?.id;
  const published = weapon && catalogue.items?.some(row => row.id === sourceId);
  const improvised = published ? sourceId === IMPROVISED_WEAPON_ID : declared.weaponImprovised;
  const kind = ['attack', 'attaque'].includes(normalized.action.type) ? normalized.v5.kind || (normalized.attackContext?.ranged === true || normalized.action.attr === 'CT' ? 'ranged' : 'melee') : 'test';
  return { kind, weapon: { improvised, pummel: qualities.some(row => row.id === 'assommante') },
    silentTakedown: declared.silentTakedown, calledShot: declared.calledShot };
}
/** Adds and suppresses Qualities on the cloned action only, before every Test plan. */
export function previewV5ActionQualities(input) {
  const normalized = clone(input);
  const equipment = normalized.actor?.equipment?.find(row => row.id === normalized.action.extensions?.fiche?.equipmentId);
  const sourceQualities = normalizeQualities([...(equipment?.keywords || []), ...(normalized.action.sourceQualities || normalized.action.qualities)]);
  const evaluate = qualities => evaluateV5Talents(normalized.actor, { event: 'action.before', role: 'attacker',
    context: v5ActionQualityContext(normalized, qualities), choices: normalized.v5.talentChoices || {}, includeTalents: qualityIds });
  const plan = clone(evaluate(sourceQualities));
  const suppressed = new Set(plan.proposals.filter(row => row.op === 'suppressQuality').map(row => row.key));
  const qualities = normalizeQualities([...sourceQualities, ...plan.proposals.filter(row => row.op === 'addQuality').map(row => ({ id: row.key, talentOrigins: clone(row.origins) }))]).filter(row => !suppressed.has(row.id));
  normalized.action = { ...normalized.action, sourceQualities, qualities };
  normalized.v5.calledShotPenaltyIgnored = false;
  return { normalized, plan };
}
/** Only this new family is handled here; the existing V5 Qualities retain their contracts. */
export function v5QualityMechanicalStatus(value, catalogue = getReferenceCatalogue()) {
  const id = typeof value === 'string' ? value : value?.id;
  const baseline = registry.qualityContracts.find(row => row.id === id);
  if (!baseline) return keywordMechanicalStatus(id);
  const word = catalogue?.keywords?.find(row => row.id === id);
  if (!word || word.effect !== baseline.effect || word.edition !== baseline.edition || word.source !== baseline.source)
    return { id, status: 'manual', reason: 'version-effet-non-couverte', word };
  return { id, status: 'covered', word, engine: { engine: baseline.engine, scope: 'condition' },
    effectVersion: baseline.ruleVersion + ':' + baseline.effectHash, limitations: [] };
}
/** Pummel uses Wounds actually lost from the ordinary head hit, after protection. */
export function previewV5WeaponConditions({ qualities = [], hit, location, target, damage, resolutionId, replaced = false, catalogue } = {}) {
  const proposed = [], unresolved = [], warnings = [];
  if (replaced || !qualities.some(row => row.id === 'assommante')) return { proposed, unresolved, warnings };
  const status = v5QualityMechanicalStatus('assommante', catalogue);
  if (status.status !== 'covered') warnings.push({ keywordId: 'assommante', reason: status.reason });
  if (status.status !== 'covered' || !hit || location?.key !== 'HEAD' || !damage || damage.finalDamage <= 0) return { proposed, unresolved, warnings };
  if (!knownWounds(target)) unresolved.push('Assommante : Blessures courantes de la cible requises.');
  const toughness = target?.caracs?.E;
  if (toughness === null || toughness === undefined || toughness === '' || !Number.isFinite(Number(toughness)) || Number(toughness) < 0) unresolved.push('Assommante : Bonus d’Endurance de la cible requis.');
  if (unresolved.length) return { proposed, unresolved, warnings };
  const woundsLost = Math.min(Math.max(0, Number(target.hp)), damage.finalDamage), toughnessBonus = Math.floor(Number(toughness) / 10);
  if (woundsLost >= toughnessBonus) proposed.push({ id: resolutionId + ':quality:assommante:sonne', key: 'sonne', name: 'Sonné', level: 1,
    source: { kind: 'quality', keywordId: 'assommante', ruleVersion: registry.qualityContracts[0].ruleVersion,
      effectVersion: status.effectVersion, effectHash: registry.qualityContracts[0].effectHash, reference: status.word.source, woundsLost, toughnessBonus } });
  return { proposed, unresolved, warnings };
}
