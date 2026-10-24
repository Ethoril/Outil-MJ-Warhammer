// Natures de créature lues dans les Traits imprimés (lot T1) : Éthéré, Démoniaque, Protection, Immunité, Artificiel, Mort-vivant…
// Les couches produites ont la forme de celles des sorts (`wards`, `immunities.damage`) et passent par le service commun
// `previewMagicProtection` ; rien n'est écrit sur le participant. Module sans dépendance (importé par v5-magic-combat).

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const TRAIT_NAMES = {
  ethereal: 'ethereal', etheree: 'ethereal', ethere: 'ethereal',
  daemonic: 'daemonic', demoniaque: 'daemonic',
  ward: 'ward', protection: 'ward',
  immunity: 'immunity', immunite: 'immunity',
  construct: 'construct', artificiel: 'construct', fabrique: 'construct',
  undead: 'undead', 'mort-vivant': 'undead', 'mort vivant': 'undead',
  painless: 'painless', 'insensible a la douleur': 'painless',
  magical: 'magical', magique: 'magical',
  shield: 'shield', bouclier: 'shield'
};

/** « Daemonic (8+) » → `{ key: 'daemonic', name, detail: '8+' }` ; `null` si ce n'est pas une nature connue. */
export function parseNatureTrait(trait) {
  const text = typeof trait === 'string' ? trait : trait?.name ?? trait?.nom ?? '';
  const match = /^\s*([^(]+?)\s*(?:\(\s*([^)]*)\s*\))?\s*$/.exec(String(text));
  if (!match) return null;
  const key = TRAIT_NAMES[fold(match[1])];
  const detail = (match[2] ?? (typeof trait === 'object' ? trait?.param ?? trait?.rating : '') ?? '').toString().trim();
  return key ? { key, name: match[1].trim(), detail } : null;
}

const natureTraits = participant => [
  ...(Array.isArray(participant?.traits) ? participant.traits : []),
  ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])
].map(parseNatureTrait).filter(Boolean);

/** Seuil d'un d10 (« 8+ », « 8 » : 8 ou plus) ; `null` si absent ou hors d10. */
const thresholdOf = detail => {
  const value = Number.parseInt(String(detail), 10);
  return Number.isInteger(value) && value >= 1 && value <= 10 ? value : null;
};

// Types de dégâts d'une Immunité que l'étiquette d'attaque sait trancher.
const IMMUNITY_FILTERS = { fire: { all: ['fire'] }, cold: { all: ['cold'] }, 'blunt weapons': { all: ['blunt'] }, 'armes contondantes': { all: ['blunt'] }, feu: { all: ['fire'] }, froid: { all: ['cold'] } };

/**
 * Couches de protection portées par les Traits.
 * - Éthéré : seules les attaques magiques blessent (immunité à toute attaque non magique).
 * - Démoniaque (X+) / Protection (X) : d10 au seuil, annule un coup non magique (Démoniaque) ou tout coup (Protection).
 * - Immunité (type) : dégâts du type nommé quand l'étiquette de l'attaque le permet ; les autres types restent en rappel.
 */
export function natureProtection(participant) {
  const out = { wards: [], immunities: [], reminders: [] };
  for (const trait of natureTraits(participant)) {
    if (trait.key === 'ethereal') out.immunities.push({ filter: { not: ['magical'] }, label: 'Éthéré', source: 'trait' });
    else if (trait.key === 'daemonic') {
      const threshold = thresholdOf(trait.detail);
      if (threshold) out.wards.push({ threshold, filter: { not: ['magical'] }, label: `Démoniaque (${threshold}+)`, source: 'trait' });
      else out.reminders.push('Démoniaque : indice illisible, la protection n\'est pas appliquée.');
    } else if (trait.key === 'ward') {
      const threshold = thresholdOf(trait.detail);
      if (threshold) out.wards.push({ threshold, filter: null, label: `Protection (${threshold}+)`, source: 'trait' });
      else out.reminders.push('Protection : indice illisible, la protection n\'est pas appliquée.');
    } else if (trait.key === 'immunity') {
      for (const type of trait.detail.split(',').map(fold).filter(Boolean)) {
        const filter = IMMUNITY_FILTERS[type];
        if (filter) out.immunities.push({ filter, label: `Immunité (${type})`, source: 'trait' });
        else out.reminders.push(`Immunité (${type}) : non automatisée, à appliquer à la main.`);
      }
    }
  }
  return out;
}

/**
 * Volonté de test : la valeur imprimée, sinon Endurance pour un Artificiel (V5 p.357 : pas de caractéristiques mentales,
 * Endurance remplace Volonté). `value` est `null` si rien ne répond.
 */
export function willpowerBase(participant) {
  const printed = Number(participant?.caracs?.FM);
  if (Number.isFinite(printed) && printed > 0) return { value: printed, replacedBy: null };
  if (natureTraits(participant).some(trait => trait.key === 'construct')) {
    const endurance = Number(participant?.caracs?.E);
    if (Number.isFinite(endurance) && endurance > 0) return { value: endurance, replacedBy: 'E' };
  }
  return { value: Number.isFinite(printed) ? printed : null, replacedBy: null };
}

/**
 * Les attaques du participant sont-elles magiques par nature ? Livre de base p.357 : Artificiel (« All its attacks are Magical »)
 * et Démoniaque ; Traits Magique (« Their attacks count as Magical »).
 */
export function attacksAreMagical(participant) {
  return natureTraits(participant).some(trait => ['construct', 'daemonic', 'magical'].includes(trait.key));
}

const REMINDERS = {
  undead: 'Mort-vivant : ni boire, manger ni respirer ; nature reconnue par les sorts et miracles spécifiques.',
  daemonic: 'Démoniaque : ni boire, manger ni respirer ; disparaît à zéro Blessure ; attaques magiques.',
  construct: 'Artificiel : ni boire, manger ni respirer ; pas de Tests mentaux, Endurance remplace Volonté ; Force pour les Blessures ; toutes ses attaques sont Magiques.',
  ethereal: 'Éthéré : traverse les solides ; ses attaques sont magiques.',
  painless: 'Insensible à la douleur : ignore les pénalités des Blessures Critiques (hors amputations), mais garde les États.',
  magical: 'Magique : ses attaques sont magiques et affectent les créatures vulnérables à cette seule nature.',
  shield: 'Bouclier : lu comme l\'option Bouclier (+PA, +1 DR en opposition par Esquive ou Mêlée), à appliquer en défense.'
};

/** Rappels (besoins vitaux, effets non calculés) des natures portées, sans doublon. */
export function natureReminders(participant) {
  const out = [];
  for (const trait of natureTraits(participant)) if (REMINDERS[trait.key] && !out.includes(REMINDERS[trait.key])) out.push(REMINDERS[trait.key]);
  return [...out, ...natureProtection(participant).reminders];
}
