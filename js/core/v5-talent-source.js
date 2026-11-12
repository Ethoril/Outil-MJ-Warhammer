/** Activité d'un effet de talent sourcé (ARCH-03) : module feuille, sans import du cœur des règles. */
import { currentV5TalentHashes } from './v5-talent-registry.js';
import { magicTalentRank } from './v5-magic-talent-rank.js';
export const suffusedFrenzy=actor=>magicTalentRank(actor,'suffuse-with','Aqshy')>0;
export const sourceActive=effect=>effect?.source?.source?.effectHash&&currentV5TalentHashes()[effect.source.talentId]===effect.source.source.effectHash && (!effect.source.grantedBy || suffusedFrenzy({talents:[effect.source.grantedBy]}));
