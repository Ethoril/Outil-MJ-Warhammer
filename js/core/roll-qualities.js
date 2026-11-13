import { keywordMechanicalStatus } from './keywords.js';
// Moteurs de mots-clés qui agissent sur le JET, et non sur les dégâts.
// Séparés de damage.js parce qu'ils s'appliquent avant lui : le score cible, la
// condition de critique et celle de maladresse. Fonctions pures, donc testables —
// c'est ce qui manquait aux trois moteurs concernés (Précise, Empaleuse, Dangereuse),
// déclarés dans ENGINES mais consommés nulle part.
import { ENGINES } from '../data/keyword-engines.js';
import { normalizeQualities } from './quality-normalization.js';
import { slModifierClause } from './effect-engine.js';

/** Moteurs actifs pour une liste de qualités, dédoublonnés par slug. */
export function activeEngines(qualities = []) {
  if (!Array.isArray(qualities)) return [];
  const out = [];
  for (const q of normalizeQualities(qualities)) {
    const id = q.id;
    const def = ENGINES[id];
    if (def && keywordMechanicalStatus(id).status === 'covered') out.push({ id, ...def });
  }
  return out;
}

const aUnMoteur = (qualities, nom) => activeEngines(qualities).some(e => e.engine === nom);

/**
 * Pointue / Imprécise — modifient le DR du test d'attaque, jamais sa réussite.
 * Pointue : +1 sur une réussite seulement ; Imprécise : −1 sur tout test, et
 * elle l'emporte sur Pointue. Rend le DR modifié et le bonus appliqué (0 sans qualité).
 */
export function applyAttackSl(sl, success, qualities = []) {
  const engines = activeEngines(qualities).filter(e => e.engine === 'attack-sl-bonus');
  const overridden = new Set(engines.flatMap(e => e.overrides || []));
  let bonus = 0;
  for (const e of engines) {
    if (overridden.has(e.id)) continue;
    if (e.params?.onSuccessOnly && !success) continue;
    bonus += Number(e.params?.bonus) || 0;
  }
  return { sl: (Number(sl) || 0) + bonus, bonus };
}

/**
 * U8 lot L5b · Pointue / Imprécise → clauses du moteur d'effets (famille `quality`), sans branchement : mêmes entrées que
 * `applyAttackSl` (`success` : la réussite du Test, qui détermine si la clause de Pointue vaut). Une clause `modifySL` par qualité
 * retenue, au moment `test.afterRoll` ; Pointue porte la condition `test.success` ; Imprécise l'emporte sur Pointue (`overrides`
 * du moteur de mot-clé, la clause écrasée n'est pas émise). Total des clauses = `applyAttackSl(...).bonus`.
 */
export function attackSlClauses(success, qualities = [], { ownerId = 'participant' } = {}) {
  const engines = activeEngines(qualities).filter(e => e.engine === 'attack-sl-bonus');
  const overridden = new Set(engines.flatMap(e => e.overrides || []));
  return engines.filter(e => !overridden.has(e.id) && !(e.params?.onSuccessOnly && !success) && (Number(e.params?.bonus) || 0) !== 0)
    .map(e => slModifierClause({ id: `quality-${e.id}`, event: 'test.afterRoll', role: 'attacker', bearer: { kind: 'quality', sourceId: `${ownerId}:quality:${e.id}` },
      amount: Number(e.params.bonus), stack: 'max', stackGroup: `quality-${e.id}`, when: e.params?.onSuccessOnly ? [{ field: 'test.success', op: 'eq', value: true }] : [] }));
}

/**
 * U8 lot L5b · Défensive, Déséquilibrée et Bouclier → clauses de la défense de mêlée (famille `quality`), sans branchement.
 * `kind` : seul un Test de mêlée lit les qualités de défense de l'arme ; `shield` : un Bouclier V5 (ou Protectrice) confirmé et non
 * annulé, décidé par l'appelant (`v5ShieldDefense`). L'exclusion du livre « sans cumul avec Défensive » (Bouclier, V5 p. 306) devient
 * une politique : les deux clauses +1 partagent le groupe `defensive-protection` en `max`, le second est écarté et reste listé.
 * Déséquilibrée écrase Défensive (`overrides` du moteur) : la clause de Défensive n'est alors pas émise, celle du Bouclier reste.
 * Total des clauses = ce que `buildCombatTest` ajoute en `defensive-protection` et `quality-desequilibree`.
 */
export function defenseQualityClauses(qualities = [], { kind = 'melee', shield = false, ownerId = 'participant' } = {}) {
  const engines = kind === 'melee' ? activeEngines(qualities).filter(e => e.engine === 'defense-sl-bonus') : [];
  const overridden = new Set(engines.flatMap(e => e.overrides || []));
  const make = (id, quality, amount, stackGroup) => slModifierClause({ id, role: 'defender', bearer: { kind: 'quality', sourceId: `${ownerId}:quality:${quality}` }, amount, stack: 'max', stackGroup });
  const clauses = [];
  if (engines.some(e => e.id === 'defensive' && !overridden.has(e.id))) clauses.push(make('defensive-protection', 'defensive', 1, 'defensive-protection'));
  if (shield) clauses.push(make('defensive-protection:shield', 'shield', 1, 'defensive-protection'));
  for (const e of engines) if (!overridden.has(e.id) && e.params.bonus < 0) clauses.push(make(`quality-${e.id}`, e.id, e.params.bonus, `quality-${e.id}`));
  return clauses;
}

/**
 * Empaleuse — critique élargi : tout multiple de 10 ou tout double, sur une réussite.
 * Sans la qualité, la règle habituelle s'applique (double seul).
 * `estDouble` est fourni par l'appelant pour rester cohérent avec isDouble() de dice.js,
 * qui porte la décision « 00 compte comme un double » (§6.6).
 */
export function isCriticalRoll(roll, estDouble, qualities = []) {
  if (estDouble) return { critique: true, élargi: false };
  if (aUnMoteur(qualities, 'expanded-critical') && Number(roll) % 10 === 0) {
    return { critique: true, élargi: true };
  }
  return { critique: false, élargi: false };
}

/**
 * Dangereuse — maladresse dès qu'un test raté comporte un 9,
 * en dizaine ou en unité, en plus de la règle habituelle du double.
 */
export function isFumbleRoll(roll, estDouble, qualities = []) {
  if (estDouble) return { maladresse: true, élargi: false };
  if (aUnMoteur(qualities, 'fumble-on-nine')) {
    const n = Number(roll) || 0;
    const dizaine = Math.floor(n / 10) % 10;
    const unité = n % 10;
    if (dizaine === 9 || unité === 9) return { maladresse: true, élargi: true };
  }
  return { maladresse: false, élargi: false };
}
