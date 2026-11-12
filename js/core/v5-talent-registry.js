/** Registre des talents V5 et acquisitions résolues (ARCH-03) : module feuille, sans import du cœur des règles. */
import baseRegistry from '../data/v5-talent-contracts.json' with { type: 'json' };
import testRegistry from '../data/v5-test-talent-contracts.json' with { type: 'json' };
import qualityRegistry from '../data/v5-quality-talent-contracts.json' with { type: 'json' };
import additionalRegistry from '../data/v5-additional-talent-contracts.json' with { type: 'json' };
import { resolveKeyword } from './creature-keywords.js';
import { SUPPLEMENTS, mergeTalentRegistry } from './supplement-loader.js';
// Talents de supplément (U8 L7) : déclarés en JSON (`v5-supplements.json`), validés au démarrage, évalués comme ceux du livre.
const registry = mergeTalentRegistry({contracts:[...baseRegistry.contracts,...testRegistry.contracts,...qualityRegistry.contracts,...additionalRegistry.contracts],
  sourceDescriptions:{...baseRegistry.sourceDescriptions,...testRegistry.sourceDescriptions,...qualityRegistry.sourceDescriptions,...additionalRegistry.sourceDescriptions}}, SUPPLEMENTS);
export const V5_TALENT_CONTRACTS = Object.freeze(registry.contracts);
export const V5_TALENT_APPROVED_OVERRIDES = Object.freeze({...qualityRegistry.approvedOverrides,...additionalRegistry.approvedOverrides});
import { getReferenceCatalogue } from './reference-catalog.js';
const KEYWORD_TALENTS = Object.freeze({ haine: 'talent-hatred', 'sans-peur': 'talent-fearless' });
export function acquiredV5Talents(participant) {
  const groups = new Map();
  for (const row of participant?.talents || []) {
    if (row?.status !== 'resolved' || typeof row.id !== 'string' || !Number.isSafeInteger(row.rank) || row.rank < 1) continue;
    const specialization = row.specialization || row.specialty || null;
    const key = JSON.stringify([row.id, specialization]);
    if (!groups.has(key)) groups.set(key, { talentId: row.id, rank: row.rank, ...(specialization ? { specialization } : {}) });
  }
  // Mots-clés de la fiche (04/11/2026) : la cible de Haine et de Sans peur, en identifiant du référentiel, vaut spécialité du talent possédé.
  for (const target of participant?.extensions?.v5?.keywordTargets || []) {
    const talentId = KEYWORD_TALENTS[target?.id];
    const owned = [...groups.values()].filter(row => row.talentId === talentId);
    if (!owned.length || owned.some(row => row.specialization && resolveKeyword(row.specialization)?.id === target.target)) continue;
    groups.set(JSON.stringify([talentId, target.target]), { talentId, rank: Math.max(...owned.map(row => row.rank)), specialization: target.target });
  }
  return [...groups.values()];
}
export const hasV5Talent = (participant, id) => acquiredV5Talents(participant).some(row => row.talentId === id);
/**
 * Equality against the pinned published texts is synchronous; SHA256 pins are independently checked in tests.
 * Empreintes des sources de talents d'un registre (pur) : texte du catalogue identique au texte épinglé → empreinte du contrat ;
 * texte changé → 'source-text-changed' ; talent de supplément absent du catalogue → son empreinte (`supplementHashes`, U8 L7),
 * son texte étant dans le supplément même.
 */
export function talentSourceHashes(talentRegistry, supplementHashes = {}, catalogue = getReferenceCatalogue()) {
  const texts = new Map((catalogue?.talents || []).map(row => [row.id, row.description]));
  return Object.fromEntries(talentRegistry.contracts.flatMap(contract => texts.has(contract.talentId)
    ? [[contract.talentId, texts.get(contract.talentId) === talentRegistry.sourceDescriptions[contract.talentId]
      ? contract.source.effectHash : 'source-text-changed']]
    : Object.hasOwn(supplementHashes, contract.talentId) ? [[contract.talentId, supplementHashes[contract.talentId]]] : []));
}
export function currentV5TalentHashes(catalogue = getReferenceCatalogue()) { return talentSourceHashes(registry, SUPPLEMENTS.talentHashes, catalogue); }
export { registry as V5_TALENT_REGISTRY };
