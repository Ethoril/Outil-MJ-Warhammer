// Registre des sorts de traditions (phase D) : agrège les modules de tools/tradition-contracts/, un par lot.
export {fact,receipt,tradition,FM,BFM,INSTANT} from './tradition-contracts/helpers.mjs';
import {MAGIE_NATURELLE_L06} from './tradition-contracts/magie-naturelle.mjs';

export const TRADITION_SPELLS=[
 ...MAGIE_NATURELLE_L06
];
