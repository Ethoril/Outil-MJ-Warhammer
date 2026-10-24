/**
 * Liste, pour les livres V5 (L06, L09, L10), les attaques naturelles dont « formule V5 du Trait + Taille » diffère du chiffre imprimé.
 * Décision (4) du MJ du 24/10 : le chiffre imprimé d'un livre V5 inclut déjà la Taille, il est gardé ; cette liste n'écrase rien.
 *   node tools/list-v5-natural-gaps.mjs [sortie.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { inferNaturalAttackKey, planNaturalAttack } from '../js/core/creature-combat.js';

const output = process.argv[2] || 'tmp/divin/ecarts-attaques-naturelles-livres-v5.json';
const gaps = [];
let compared = 0;
for (const book of ['L06', 'L09', 'L10']) {
  const file = JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8'));
  const library = file.profiles.map(profile => ({ ...profile, edition: file.edition }));
  for (const record of library.filter(profile => profile.kind === 'profile')) {
    let participant;
    try { participant = buildParticipantFromBestiary(record.id, { library, includeOptional: true }); } catch { continue; }
    // Même calcul que pour un livre V4 : on retire l'édition pour que le moteur ajoute la Taille.
    const asV4 = { ...participant, extensions: { ...participant.extensions, v5: { ...participant.extensions.v5, bestiary: { ...participant.extensions.v5.bestiary, edition: 'V4' } } } };
    for (const action of participant.actions) {
      const key = inferNaturalAttackKey(asV4, action);
      if (!key) continue;
      const plan = planNaturalAttack(asV4, key, { ordinary: true });
      // Morsure sans valeur au Trait : la formule serait le chiffre imprimé lui-même, rien à comparer.
      if (plan.damageFormula === 'imprimé') continue;
      const formula = Number(plan.damageFormula);
      if (!Number.isFinite(formula) || !Number.isFinite(Number(action.damage))) continue;
      compared += 1;
      if (formula !== Number(action.damage)) gaps.push({ id: record.id, book, page: record.page, name: record.name, attack: action.name, printed: Number(action.damage), formulaPlusSize: formula, sizeBonus: plan.sizeBonus });
    }
  }
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({ compared, differing: gaps.length, gaps }, null, 1)}\n`);
console.log(`${compared} attaques comparées, ${gaps.length} écarts : ${output}`);
