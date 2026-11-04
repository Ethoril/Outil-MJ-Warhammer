/** Export d'un profil vers le JSON d'import (clés françaises) : ce que `parseProfileJson` relit à l'identique. Module pur. */
import { getReferenceCatalogue } from './reference-catalog.js';
import { FICHE_BASIC_SKILLS } from './fiche-sync.js';
import { calculateArmor } from './equipment.js';
import { normalizeArmorLocations } from './models.js';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const BASIC_SKILLS = new Map(FICHE_BASIC_SKILLS.map(skill => [skill.name, skill.carac]));
const CARAC_UPPER = { cc: 'CC', ct: 'CT', f: 'F', e: 'E', i: 'I', ag: 'Ag', dex: 'Dex', int: 'Int', fm: 'FM', soc: 'Soc' };
const sameValues = (a, b) => Object.keys({ ...a, ...b }).every(key => (a?.[key] ?? 0) === (b?.[key] ?? 0));
const has = value => value !== undefined && value !== null && value !== '';

function exportArmor(profile) {
  const equipment = Array.isArray(profile.equipment) ? profile.equipment : [];
  // Les Points d'Armure qui viennent des pièces du catalogue se relisent depuis `equipement`.
  if (profile.armorLocations && equipment.some(item => ['armour', 'shield'].includes(item.kind)) && sameValues(profile.armorLocations, calculateArmor(equipment))) return undefined;
  const armor = profile.armor || {};
  const locations = profile.armorLocations && !sameValues(profile.armorLocations, normalizeArmorLocations(armor)) ? profile.armorLocations : null;
  if (locations) return { tete: locations.head, corps: locations.body, brasdroit: locations.rightArm, brasgauche: locations.leftArm, jambedroite: locations.rightLeg, jambegauche: locations.leftLeg };
  return { tete: armor.head ?? 0, corps: armor.body ?? 0, bras: armor.arms ?? 0, jambes: armor.legs ?? 0 };
}

function exportQuality(quality) {
  const extra = has(quality.rating) || has(quality.parameter);
  if (!extra) return quality.name || quality.id;
  return { nom: quality.name || quality.id, ...(has(quality.rating) ? { valeur: quality.rating } : {}), ...(has(quality.parameter) ? { parameter: quality.parameter } : {}) };
}

function exportAction(action) {
  const damage = action.damageFormula || (Number(action.damage) ? action.damage : undefined);
  return {
    nom: action.note, ...(action.type ? { type: action.type } : {}), score: action.base,
    ...(action.mod ? { modificateur: action.mod } : {}),
    ...(Number.isInteger(action.extensions?.v5?.slModifier) ? { dr: action.extensions.v5.slModifier } : {}),
    ...(damage !== undefined ? { degats: damage } : {}),
    ...(action.qualities?.length ? { qualites: action.qualities.map(exportQuality) } : {}),
    ...(has(action.valuesX) ? { x: action.valuesX } : {}), ...(has(action.capacity) ? { capacite: action.capacity } : {})
  };
}

function exportSkills(profile) {
  const rows = [];
  for (const skill of profile.skills || []) {
    const name = skill.name || skill.sourceName;
    if (!name) continue;
    const carac = CARAC_UPPER[skill.carac] || skill.carac;
    const advances = Number.isFinite(skill.advances) ? skill.advances : Number.isFinite(skill.total) && Number.isFinite(profile.caracs?.[carac]) ? skill.total - profile.caracs[carac] : null;
    if (advances === null || (advances === 0 && BASIC_SKILLS.has(name))) continue;
    rows.push({ nom: name, avances: advances });
  }
  return rows;
}

function exportTalents(profile, catalogue) {
  return (profile.talents || []).map(talent => {
    const entry = catalogue.talents.find(row => row.id === talent.id);
    const rank = Number(talent.rank) > 1 ? Number(talent.rank) : undefined;
    const specialization = talent.specialization || talent.specialty;
    return { nom: entry?.nom || talent.name || talent.nom, ...(specialization ? { specialisation: specialization } : {}), ...(rank ? { rang: rank } : {}) };
  });
}

function exportEquipment(profile, catalogue) {
  const names = new Map();
  for (const item of catalogue.items) names.set(item.name, (names.get(item.name) || 0) + 1);
  return (profile.equipment || []).map(item => {
    const model = catalogue.items.find(row => row.id === item.baseId);
    // Un objet du catalogue, tel quel, s'écrit par son nom ; un objet modifié ou hors catalogue s'écrit en entier.
    if (!model || item.custom || JSON.stringify({ ...model, id: item.id }) !== JSON.stringify(item)) return JSON.parse(JSON.stringify(item));
    return names.get(item.name) > 1 ? { nom: item.name, categorie: item.category } : item.name;
  });
}

const namesOf = list => (list || []).map(row => (typeof row === 'string' ? row : row?.nom ?? row?.name)).filter(Boolean);

/** Profil du Store → objet JSON d'import (sans `id`, ni lien de fiche). */
export function exportProfileJson(profile) {
  const catalogue = getReferenceCatalogue();
  const v5 = profile.extensions?.v5 || {};
  const traits = (profile.extensions?.traits || profile.traits || []).map(trait => (typeof trait === 'string' ? trait : trait?.name ?? trait?.nom)).filter(Boolean);
  const fortune = profile.ficheSnapshot?.resources?.fortune;
  const fate = v5.fate ?? profile.fate;
  const skills = exportSkills(profile);
  const talents = exportTalents(profile, catalogue);
  const armor = exportArmor(profile);
  const jets = (profile.diceLines || []).filter(action => !action.extensions?.fiche?.equipmentId).map(exportAction);
  const out = {
    ...(profile.tokenImage ? { tokenImage: profile.tokenImage } : {}),
    nom: profile.name, type: profile.kind, ...(profile.group ? { groupe: profile.group } : {}),
    pv: profile.maxHp ?? profile.hp, initiative: profile.initiative, caracteristiques: { ...profile.caracs },
    ...(armor ? { armure: armor } : {}),
    ...(profile.race ? { espece: profile.race } : {}), ...(has(profile.movement) ? { mouvement: profile.movement } : {}),
    ...(profile.tags?.length ? { tags: [...profile.tags] } : {}), ...(profile.notes ? { notes: profile.notes } : {}), ...(profile.favorite ? { favori: true } : {}),
    ...(profile.keywords?.length ? { keywords: [...profile.keywords] } : {}), ...(profile.keywordExclusions?.length ? { keywordExclusions: [...profile.keywordExclusions] } : {}),
    ...(skills.length ? { competences: skills } : {}), ...(talents.length ? { talents } : {}), ...(traits.length ? { traits } : {}),
    ...(profile.spells?.length ? { sorts: namesOf(profile.spells) } : {}), ...(profile.prayers?.length ? { prieres: namesOf(profile.prayers) } : {}),
    ...(typeof profile.cult === 'string' ? { culte: profile.cult } : {}),
    ...(profile.equipment?.length ? { equipement: exportEquipment(profile, catalogue) } : {}),
    ...(Number.isInteger(fortune) ? { fortune } : {}), ...(Number.isInteger(fate) ? { destin: fate } : {}),
    ...(Number.isInteger(v5.resilience) ? { resilience: v5.resilience } : {}), ...(Number.isInteger(v5.corruptionPoints) ? { corruption: v5.corruptionPoints } : {}),
    ...(Number.isInteger(v5.divine?.sin) ? { peches: v5.divine.sin } : {}),
    ...(jets.length ? { jets } : {})
  };
  return out;
}

/** Un ou plusieurs profils → texte JSON prêt à coller dans « Créer depuis un JSON ». */
export function exportProfilesJson(profiles) {
  const list = (Array.isArray(profiles) ? profiles : [profiles]).filter(isRecord).map(exportProfileJson);
  return JSON.stringify(list.length === 1 ? { format: 'outil-mj-profil', version: 1, ...list[0] } : { format: 'outil-mj-profil', version: 1, profils: list }, null, 2);
}
