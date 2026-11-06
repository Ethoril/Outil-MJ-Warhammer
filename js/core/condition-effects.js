/**
 * U8 lot L4 (docs/specs/moteur-effets-unifie/) : les États passent dans le moteur d'effets (`combineEffects`).
 * Adaptateur pur : lit les niveaux d'États pertinents d'un Test et leurs exceptions, produit des effets portés par la famille
 * `condition`, cumulés en `strongest` (V5 : des pénalités d'États différentes ne s'additionnent pas, seule la plus forte
 * s'applique). Les autres familles (talent, sort, prière) restent des lignes distinctes du Test et se somment à la pénalité
 * d'États (MJ 05/11 Q3, MJ 06/11 Q12, `BETWEEN_GROUPS`).
 */
import { combineEffects } from './effect-engine.js';

const PENALTY_GROUP = 'condition-penalty';
const DISADVANTAGE_GROUP = 'condition-disadvantage';

/**
 * Exceptions appliquées aux niveaux avant le cumul :
 *  - `ignoreAll` : Endurance de l'anachorète (`ignoreConditionPenalties`, p. 226), aucune pénalité d'État ;
 *  - `ignoreFatigue` : Revigorer et Clarté d'Esprit (`ignoreFatiguePenalties`), Exténué compté mais sans pénalité ;
 *  - `ignoreStun` : Clarté de pensée sur un Test mental (`clarityOfThought`), Sonné sans pénalité ;
 *  - `talentIgnores` : propositions `ignoreConditionPenalty` des talents (`{ key, amount }`), niveaux retirés de l'État visé.
 * Retourne `{ penalty, levels, kept, dropped }` : `penalty` positif (montant de la pénalité en DR), `levels` les niveaux
 * pénalisants après exceptions, `kept`/`dropped` les États retenus et écartés par la règle de cumul (CA7).
 */
export function conditionPenaltyEffects(relevant, { ignoreAll = false, ignoreFatigue = false, ignoreStun = false, talentIgnores = [] } = {}) {
  const levels = new Map(relevant);
  if (ignoreFatigue && levels.has('extenue')) levels.set('extenue', 0);
  for (const effect of talentIgnores) if (levels.has(effect.key)) levels.set(effect.key, Math.max(0, (levels.get(effect.key) || 0) - effect.amount));
  if (ignoreStun && levels.has('sonne')) levels.set('sonne', 0);
  if (ignoreAll) levels.clear();
  const entries = [...levels].filter(([, level]) => level > 0).map(([key, level]) => ({
    bearer: { kind: 'condition', sourceId: key },
    effect: { op: 'modifySL', amount: -level, stack: 'strongest', stackGroup: PENALTY_GROUP } }));
  const combined = combineEffects(entries);
  const group = combined.groups[0];
  return { penalty: Math.max(0, -(combined.totals.modifySL ?? 0)), levels,
    kept: group ? group.kept.map(entry => entry.bearer.sourceId) : [],
    dropped: group ? group.dropped.map(({ entry, rule }) => ({ key: entry.bearer.sourceId, rule })) : [] };
}

/**
 * Désavantages d'États : un seul État en donne, le plus fort (plus grand nombre de Désavantages ; à égalité, le premier
 * déclaré). `byCondition` : Map clé d'État → liste de Désavantages `{ id, label }`. Retourne la liste retenue.
 */
export function conditionDisadvantageEffects(byCondition) {
  const entries = [...byCondition].filter(([, rows]) => rows.length).map(([key, rows]) => ({
    bearer: { kind: 'condition', sourceId: key },
    effect: { op: 'grantDisadvantage', amount: rows.length, stack: 'strongest', stackGroup: DISADVANTAGE_GROUP } }));
  const group = combineEffects(entries).groups[0];
  return group ? byCondition.get(group.kept[0].bearer.sourceId) : [];
}
