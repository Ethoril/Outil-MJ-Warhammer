// Moteurs de mots-clés qui agissent sur le JET, et non sur les dégâts.
// Séparés de damage.js parce qu'ils s'appliquent avant lui : le score cible, la
// condition de critique et celle de maladresse. Fonctions pures, donc testables —
// c'est ce qui manquait aux trois moteurs concernés (Précise, Empaleuse, Dangereuse),
// déclarés dans ENGINES mais consommés nulle part.
import { ENGINES } from '../data/keyword-engines.js';
import { slugify } from './keywords.js';

/** Moteurs actifs pour une liste de qualités, dédoublonnés par slug. */
export function activeEngines(qualities = []) {
  if (!Array.isArray(qualities)) return [];
  const vus = new Set();
  const out = [];
  for (const q of qualities) {
    const id = slugify(typeof q === 'string' ? q : (q?.id || q?.name || ''));
    if (!id || vus.has(id)) continue;
    vus.add(id);
    const def = ENGINES[id];
    if (def) out.push({ id, ...def });
  }
  return out;
}

const aUnMoteur = (qualities, nom) => activeEngines(qualities).some(e => e.engine === nom);

/**
 * Précise — bonus au score cible du test.
 * Rend le score modifié, jamais négatif.
 */
export function applyTargetBonus(baseTarget, qualities = []) {
  let bonus = 0;
  for (const e of activeEngines(qualities)) {
    if (e.engine === 'target-score-bonus') bonus += Number(e.params?.bonus) || 0;
  }
  return { target: Math.max(0, (Number(baseTarget) || 0) + bonus), bonus };
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
