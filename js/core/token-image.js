/**
 * Image du pion envoyée à Map Display (chantier « images des pions », docs/specs/images-pions). Module pur.
 * Ordre (décision du MJ du 13/11/2026, Q1) : image importée (`tokenImage`, data: ≤ 24 Kio), sinon image choisie dans la
 * bibliothèque (`tokenLibraryImage`), sinon image automatique du profil du bestiaire (`extensions.v5.bestiary.id`, apparié
 * dans `js/data/token-images.js`), sinon rien. Un champ absent ou invalide se lit comme vide, sans réécrire le profil.
 * Ne dépend pas de models.js (qui importe d'ici `normalizeLibraryImage`).
 */
import { TOKEN_IMAGES } from '../data/token-images.js';
import { REIKLAND_BEASTS, KADON_MONSTERS } from '../data/v5-transformation-bestiary.js';
import { normalizeLibraryImage } from './token-library-path.js';

// Règle unique du chemin de bibliothèque, partagée avec le générateur de la table.
export { normalizeLibraryImage };
const LIBRARY_PREFIX = 'maps/tokens/';
/** Racine de Map Display vue depuis l'outil (dépôts voisins, même serveur local ou même site). */
const MAP_DISPLAY_ROOT = '../rpg-map-display/';

// Image importée : déjà normalisée à l'enregistrement (models.js) ; ici, seulement la forme.
const importedImageOf = value => (typeof value === 'string' && /^data:image\/(?:webp|jpeg);base64,./.test(value) ? value : undefined);

const indexes = new WeakMap();
function autoIndexOf(table) {
  let index = indexes.get(table);
  if (!index) {
    index = new Map();
    for (const row of table || []) for (const id of row?.profiles || []) if (!index.has(id)) index.set(id, row.path);
    indexes.set(table, index);
  }
  return index;
}

/** `{ url, source }` : source `'imported'`, `'chosen'`, `'auto'` ou `null` (aucune image, `url` null). */
export function tokenImageOf(profile, table = TOKEN_IMAGES) {
  const imported = importedImageOf(profile?.tokenImage);
  if (imported) return { url: imported, source: 'imported' };
  const chosen = normalizeLibraryImage(profile?.tokenLibraryImage);
  if (chosen) return { url: chosen, source: 'chosen' };
  const bestiaryId = profile?.extensions?.v5?.bestiary?.id;
  const auto = typeof bestiaryId === 'string' ? normalizeLibraryImage(autoIndexOf(table).get(bestiaryId)) : undefined;
  return auto ? { url: auto, source: 'auto' } : { url: null, source: null };
}

/**
 * Image montrée dans l'outil pour un profil : celle qui partira vers la carte. Un PJ n'envoie que l'image que le MJ a choisie
 * (importée ou de la bibliothèque ; décision du 16/11/2026, qui amende CA16) ; sans choix, la carte garde la sienne :
 * `{ url: null, source: 'map' }`. Pas d'image automatique pour un PJ.
 */
export function shownTokenImageOf(profile, table = TOKEN_IMAGES) {
  const resolved = tokenImageOf(profile, table);
  return profile?.kind === 'PJ' && resolved.source !== 'imported' && resolved.source !== 'chosen' ? { url: null, source: 'map' } : resolved;
}

/**
 * Image envoyée pour un participant (`imageUrlOf` de la liaison) : celle de son profil de Réserve, sinon, pour un participant
 * ajouté depuis le bestiaire sans profil, la sienne. Une monture est un profil (`monture-<id>`) : même résolution (T6).
 * Un PJ n'envoie que l'image choisie dans l'outil, sinon `null` (la carte garde la sienne).
 */
export function participantTokenImageUrl(participant, profileOf = () => null, table = TOKEN_IMAGES) {
  const profile = participant?.profileId ? profileOf(participant.profileId) : null;
  return shownTokenImageOf(participant?.kind === 'PJ' ? { ...(profile || participant), kind: 'PJ' } : profile || participant, table).url;
}

/** Adresse d'une image de la bibliothèque pour les vignettes de l'outil ; `null` hors bibliothèque. */
export function libraryImageSrc(path) {
  const valid = normalizeLibraryImage(path);
  return valid ? MAP_DISPLAY_ROOT + valid : null;
}

/** Libellé d'une image de la bibliothèque : celui de la table, sinon le nom du fichier. */
export function tokenImageLabelOf(path, table = TOKEN_IMAGES) {
  return (table || []).find(row => row.path === path)?.label || String(path ?? '').split('/').pop();
}

const fold = value => String(value ?? '').toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Images de la table dont le libellé ou le chemin contient le texte cherché (casse et accents ignorés), dans l'ordre de la table. */
export function searchTokenImages(query, table = TOKEN_IMAGES, { limit = Infinity } = {}) {
  const wanted = fold(query).trim();
  return (table || []).filter(row => !wanted || fold(row.label).includes(wanted) || fold(row.path.slice(LIBRARY_PREFIX.length)).includes(wanted)).slice(0, limit);
}

// Forme bestiale (S6) : la forme garde le profil de la bête (copie de REIKLAND_BEASTS[clé]), pas sa clé ; on la retrouve par le nom.
const BEAST_KEY_BY_NAME = new Map(Object.entries(REIKLAND_BEASTS).map(([key, beast]) => [beast.name, key]));
const MONSTER_KEY_BY_NAME = new Map(Object.entries(KADON_MONSTERS).map(([key, monster]) => [monster.name, key]));
/** Vent d'une Forme bestiale : `wind` écrit à la transformation, sinon `isJade` (déjà enregistré avant), sinon Vent des Bêtes. */
const formWindOf = form => (form.wind === 'beasts' || form.wind === 'jade' ? form.wind : form.isJade === true ? 'jade' : 'beasts');

/**
 * Image de forme (`formImageUrl`, contrat §4) d'un participant transformé : sous Forme bestiale, celle de la table pour sa bête
 * et le vent du sort lancé ; sous Transformation de Kadon, celle de son monstre (une seule image, sans vent ; décision du
 * 15/11/2026). `null` hors forme et pour une bête ou un monstre sans image (CA19 : le pion reste inchangé).
 */
export function formImageOf(participant, table = TOKEN_IMAGES) {
  const form = participant?.extensions?.v5?.beastForm;
  if (!form || typeof form !== 'object') return null;
  if (form.kind === 'kadon') {
    const monster = MONSTER_KEY_BY_NAME.get(form.beastProfile?.name ?? form.name);
    return (monster && normalizeLibraryImage((table || []).find(item => item?.form?.monster === monster)?.path)) || null;
  }
  const beast = BEAST_KEY_BY_NAME.get(form.beastProfile?.name ?? form.name);
  if (!beast) return null;
  const wind = formWindOf(form);
  const row = (table || []).find(item => item?.form?.beast === beast && item.form.wind === wind);
  return normalizeLibraryImage(row?.path) ?? null;
}
