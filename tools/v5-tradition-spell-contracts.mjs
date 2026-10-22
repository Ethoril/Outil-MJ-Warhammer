// Registre des sorts de traditions (phase D) : agrège les modules de tools/tradition-contracts/, un par lot.
export {fact,receipt,tradition,FM,BFM,INSTANT} from './tradition-contracts/helpers.mjs';
import {MAGIE_NATURELLE_L06} from './tradition-contracts/magie-naturelle.mjs';
import {MAGIE_NATURELLE_AOTE3} from './tradition-contracts/magie-naturelle-aote3.mjs';
import {SORCELLERIE} from './tradition-contracts/sorcellerie.mjs';
import {DEMONOLOGIE} from './tradition-contracts/demonologie.mjs';
import {NECROMANCIE} from './tradition-contracts/necromancie.mjs';
import {NURGLE} from './tradition-contracts/nurgle.mjs';
import {SLAANESH} from './tradition-contracts/slaanesh.mjs';
import {TZEENTCH} from './tradition-contracts/tzeentch.mjs';
import {GRANDE_GUEULE} from './tradition-contracts/grande-gueule.mjs';
import {WAAAGH_PETITE,WAAAGH_GRANDE} from './tradition-contracts/waaagh.mjs';
import {LUSTRIA} from './tradition-contracts/lustria.mjs';
import {ELFIQUE_VAUL,ELFIQUE_MER,ELFIQUE_HOETH} from './tradition-contracts/elfique.mjs';
import {ARCANES_COLLEGES} from './tradition-contracts/arcanes-colleges.mjs';

export const TRADITION_SPELLS=[
 ...MAGIE_NATURELLE_L06,
 ...MAGIE_NATURELLE_AOTE3,
 ...SORCELLERIE,
 ...DEMONOLOGIE,
 ...NECROMANCIE,
 ...NURGLE,
 ...SLAANESH,
 ...TZEENTCH,
 ...GRANDE_GUEULE,
 ...WAAAGH_PETITE,
 ...WAAAGH_GRANDE,
 ...LUSTRIA,
 ...ELFIQUE_VAUL,
 ...ELFIQUE_MER,
 ...ELFIQUE_HOETH,
 ...ARCANES_COLLEGES
];
