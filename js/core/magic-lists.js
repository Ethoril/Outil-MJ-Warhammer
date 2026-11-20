/**
 * Listes de sorts et de prières d'un profil ou d'un participant (`spells`, `prayers`, lignes `{ nom }` comme celles des fiches).
 * Pour un PJ, la fiche les fournit (fiche-sync) ; pour un PNJ, le MJ les choisit dans les catalogues. Une liste absente vaut vide :
 * le combat propose alors tout le catalogue, comme avant. Avec une liste, le combat la propose seule, « Tous » rouvre le catalogue.
 * Fonctions pures.
 */
import { getAllSpellContracts, getSpellContract } from './v5-spell-contracts.js';

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const rowName = row => (typeof row === 'string' ? row : row?.nom ?? row?.name ?? '');
const rows = value => (Array.isArray(value) ? value.filter(row => fold(rowName(row))) : []);

/** Nom d'une prière tel que l'accès divin le compare (v5-divine-access.js) : nom du catalogue d'abord. */
export const divineContractName = contract => contract?.catalogueName || contract?.labels?.canonicalName || contract?.name || '';

/** Lignes de sorts et de prières du sujet ; toute absence vaut vide. */
export const spellRows = subject => rows(subject?.spells);
export const prayerRows = subject => rows(subject?.prayers);

/** Nom de sort du catalogue V5 pour un texte saisi (nom, nom canonique ou identifiant), sinon null. */
export function resolveSpellName(text) {
  const contract = getSpellContract(String(text ?? '').trim());
  return contract?.name || null;
}

/** Nom de prière du catalogue divin pour un texte saisi (nom affiché ou nom du catalogue), sinon null. */
export function resolvePrayerName(text, divineContracts) {
  const wanted = fold(text);
  if (!wanted) return null;
  const found = (divineContracts || []).find(contract => [contract.name, divineContractName(contract), contract.labels?.canonicalName].some(name => name && fold(name) === wanted));
  return found ? divineContractName(found) : null;
}

/** Ajoute une ligne `{ nom }` sans doublon (casse et accents ignorés). Pur. */
export function withRow(list, nom) {
  const kept = rows(list);
  return kept.some(row => fold(rowName(row)) === fold(nom)) ? kept : [...kept, { nom }];
}

/** Retire la ligne de ce nom ; les autres lignes restent telles quelles. Pur. */
export function withoutRow(list, nom) {
  return rows(list).filter(row => fold(rowName(row)) !== fold(nom));
}

/**
 * Sorts proposés au lanceur : `own` (ses sorts, contrat résolu si possible) et `others` (le reste du catalogue V5, vide quand la liste
 * du lanceur fait foi). Sans liste, `others` est tout le catalogue : rien ne change pour un profil non renseigné.
 */
export function spellChoices(actor, { showAll = false } = {}) {
  const own = spellRows(actor).map(row => {
    const contract = getSpellContract(row.id) || getSpellContract(rowName(row));
    return { id: contract?.id || row.id || rowName(row), name: contract?.name || rowName(row), cn: contract?.cn ?? row.cn ?? 0, contract };
  });
  const listed = new Set(own.map(row => row.id));
  const others = own.length && !showAll ? [] : getAllSpellContracts().filter(contract => !listed.has(contract.id));
  return { own, others, hasList: own.length > 0 };
}

/**
 * Prières proposées : sans liste, tout le catalogue fourni. Avec une liste et sans « Tous », ses prières connues, plus les Bénédictions
 * de ses cultes (`cults`), que le talent Béni ouvre en entier. Une liste dont aucune ligne n'est reconnue n'efface rien.
 */
export function prayerChoices(actor, contracts, { showAll = false, cults = [] } = {}) {
  const all = Array.isArray(contracts) ? contracts : [];
  const known = new Set(prayerRows(actor).map(row => fold(rowName(row))));
  if (!known.size || showAll) return { contracts: all, hasList: known.size > 0, filtered: false };
  const cultSet = new Set([actor?.cult, ...cults].map(fold).filter(Boolean));
  const kept = all.filter(contract => known.has(fold(divineContractName(contract))) || known.has(fold(contract.name))
    || (contract.type === 'blessing' && cultSet.has(fold(contract.deity))));
  return kept.length ? { contracts: kept, hasList: true, filtered: true } : { contracts: all, hasList: true, filtered: false };
}
