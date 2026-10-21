// Registre des sorts de traditions (phase D) : agrège les modules de tools/tradition-contracts/, un par lot.
export {fact,receipt,tradition,FM,BFM,INSTANT} from './tradition-contracts/helpers.mjs';
import {MAGIE_NATURELLE_L06} from './tradition-contracts/magie-naturelle.mjs';
import {MAGIE_NATURELLE_AOTE3} from './tradition-contracts/magie-naturelle-aote3.mjs';
import {SORCELLERIE} from './tradition-contracts/sorcellerie.mjs';
import {DEMONOLOGIE} from './tradition-contracts/demonologie.mjs';
import {NECROMANCIE} from './tradition-contracts/necromancie.mjs';
import {NURGLE} from './tradition-contracts/nurgle.mjs';

export const TRADITION_SPELLS=[
 ...MAGIE_NATURELLE_L06,
 ...MAGIE_NATURELLE_AOTE3,
 ...SORCELLERIE,
 ...DEMONOLOGIE,
 ...NECROMANCIE,
 ...NURGLE
];
