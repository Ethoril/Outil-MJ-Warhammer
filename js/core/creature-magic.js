// Magie des créatures (lot T7) : Résistance à la Magie, Lanceur de sorts, Béni, Miracles, Champion, Marques du Chaos, Corruption,
// Corruption mentale, Mutation, Dressé.
// Module pur : lit les Traits (texte « Nom (précision) », noms anglais ou français) et rend un plan (tests, modificateurs, effets,
// points non résolus, rappels, reçu) sans rien écrire. Seule la Résistance à la Magie est lue par un service (sorts) ; le reste est assisté.

import { willpowerBase } from './creature-natures.js';

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const RULES = {
  magicResistance: { fr: 'Résistance à la Magie', names: ['magic resistance', 'resistance a la magie'], note: '−3 DR aux sorts qui affectent la créature (Imperial Zoo : réduction de l\'indice imprimé) ; incompatibilités de talents et compétences magiques à vérifier.' },
  spellcaster: { fr: 'Lanceur de sorts', names: ['spellcaster', 'lanceur de sorts', 'lanceur de sort'], note: 'Accès au domaine imprimé ; Focalisation Volonté+10 et Langue magique Intelligence+10 par défaut, selon l\'adaptation du MJ.' },
  blessed: { fr: 'Béni', names: ['blessed', 'beni'], note: 'Accès aux Bénédictions de la divinité ; Prière à Sociabilité+10 ou valeur fixée par le MJ ; ne remplace pas les prérequis explicites de la fiche.' },
  miracles: { fr: 'Miracles', names: ['miracles'], note: 'Peut employer les Miracles de la divinité ; Prière à Sociabilité+10 ou valeur fixée par le MJ.' },
  champion: { fr: 'Champion', names: ['champion'], note: 'Opposition de mêlée défensive gagnée : dégâts comme l\'attaquant.' },
  corruption: { fr: 'Corruption', names: ['corruption'], note: 'Influence corruptrice de la force précisée ; Tests d\'exposition selon ce classement.' },
  mentalCorruption: { fr: 'Corruption mentale', names: ['mental corruption', 'corruption mentale'], note: 'Un résultat de la table des corruptions mentales (tirage du MJ).' },
  mutation: { fr: 'Mutation', names: ['mutation'], note: 'Un résultat de la table de corruption physique (tirage du MJ).' },
  trained: { fr: 'Dressé', names: ['trained', 'dresse'], note: 'Compétences d\'animal dressé, chacune distincte ; leurs effets ne se cumulent pas d\'office.' }
};

const MARK_NOTES = {
  chaos: 'Marque par dieu : talent ou modifications propres, rivalité d\'Animosité visible et accès d\'apprentissage ; ne pas fusionner les quatre variantes.',
  khorne: 'Marque de Khorne : Frénésie, Étiquette (Fidèles de Khorne), Animosité réciproque envers les adorateurs de Slaanesh tant que la marque se voit ; jamais Langue (Magick) ni Focalisation sauf pour dissiper.',
  tzeentch: 'Marque de Tzeentch : 1d10/3 Mutations (arrondi au supérieur) alternées mentales et physiques, Étiquette (Fidèles de Tzeentch), Animosité réciproque envers les adorateurs de Nurgle tant que la marque se voit.',
  nurgle: 'Marque de Nurgle : variante propre au dieu, effets du profil imprimé ; Animosité réciproque envers les adorateurs de Tzeentch tant que la marque se voit.',
  slaanesh: 'Marque de Slaanesh : variante propre au dieu, effets du profil imprimé ; Animosité réciproque envers les adorateurs de Khorne tant que la marque se voit.'
};
const MARK_RIVAL = { khorne: 'Slaanesh', tzeentch: 'Nurgle', nurgle: 'Tzeentch', slaanesh: 'Khorne' };

const TRAINED_SKILLS = {
  dig: 'Creuser', creuser: 'Creuser', heel: 'Au pied', 'au pied': 'Au pied', hunt: 'Chasser', chasser: 'Chasser', point: 'Marquer', marquer: 'Marquer',
  round: 'Rabattre', rabattre: 'Rabattre', track: 'Pister', pister: 'Pister', circle: 'Cercler', cercler: 'Cercler', return: 'Revenir', revenir: 'Revenir',
  perform: 'Divertir', divertir: 'Divertir', fetch: 'Rapporter', rapporter: 'Rapporter', guard: 'Garder', garde: 'Garder', garder: 'Garder',
  magic: 'Magie', magie: 'Magie', mount: 'Monture', monture: 'Monture', war: 'Guerre', guerre: 'Guerre', tame: 'Dompté', dompte: 'Dompté', trick: 'Truc', truc: 'Truc',
  // Liste du livre de base V5 (Trained, p.363) : Brisé, Conduite, Divertissement, Rapporter, Garde, Retour, Magie, Monture, Guerre.
  broken: 'Brisé', brise: 'Brisé', drive: 'Conduite', conduite: 'Conduite', entertain: 'Divertissement', divertissement: 'Divertissement',
  home: 'Retour', retour: 'Retour'
};
// Effets des compétences de la liste V5 (la liste V4 ci-dessus garde son texte propre).
const TRAINED_EFFECTS = {
  Brisé: { ignoresBestial: true, fellowshipBonus: '+2d10' },
  Conduite: { pullsVehicles: true },
  Divertissement: { skills: ['Entertain', 'Perform', 'Play'], bonus: 10 },
  Rapporter: { fetches: true },
  Garder: { grantsTrait: 'Territorial' },
  Retour: { returnsHome: true },
  Magie: { ignoresSkittish: 'magie' },
  Monture: { acceptsRider: true, requiresRideSkill: true },
  Guerre: { weaponSkillBonus: 10, ignoresSkittish: 'bruits forts', onlyMountForCombat: true }
};
const TRAINED_DR = { Creuser: 20, 'Au pied': 20, Chasser: 20, Rabattre: 0 };

const BY_NAME = new Map(Object.entries(RULES).flatMap(([key, rule]) => rule.names.map(name => [name, key])));
const MARK_PATTERN = /^(?:mark of|marque d[eu]|marque d')\s*(chaos|khorne|nurgle|tzeentch|slaanesh)?$/;

/** « Spellcaster (Fire) » → `{ key: 'spellcaster', name, detail: 'Fire' }` ; `null` si ce n'est pas un Trait de magie. */
export function parseCreatureMagicTrait(trait) {
  const text = typeof trait === 'string' ? trait : trait?.name ?? trait?.nom ?? '';
  const match = /^\s*([^(]+?)\s*(?:\(\s*([^)]*)\s*\))?\s*$/.exec(String(text));
  if (!match) return null;
  const detail = (match[2] ?? (typeof trait === 'object' ? trait?.param ?? trait?.rating : '') ?? '').toString().trim();
  const name = match[1].trim();
  const mark = /^(?:mark of|marque d[eu]|marque d')\s*(\S+)$/.exec(fold(name));
  if (mark && MARK_NOTES[mark[1]] !== undefined) return { key: 'mark', name, detail, god: mark[1] === 'chaos' ? fold(detail) : mark[1] };
  if (MARK_PATTERN.test(fold(name))) return { key: 'mark', name, detail, god: fold(detail) };
  const key = BY_NAME.get(fold(name));
  return key ? { key, name, detail } : null;
}

const traitsOf = participant => [
  ...(Array.isArray(participant?.traits) ? participant.traits : []),
  ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])
].map(parseCreatureMagicTrait).filter(Boolean);

/** Traits de magie portés par un participant (un élément par clé, une entrée par dieu pour les Marques). */
export function creatureMagicTraits(participant) {
  const seen = new Set();
  return traitsOf(participant).filter(trait => {
    const id = trait.key === 'mark' ? `mark:${trait.god}` : trait.key;
    return seen.has(id) ? false : seen.add(id);
  });
}

const bookOf = participant => participant?.extensions?.v5?.bestiary?.book ?? null;
const carac = (participant, key) => {
  const value = participant?.caracs?.[key];
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
};

/**
 * Réduction de DR de Sorcellerie imposée par la Résistance à la Magie du participant (0 sans Trait).
 * V5 : −3. Imperial Zoo (L11) : l'indice imprimé, à défaut −3. Lu par le service de lancement de sorts.
 */
export function magicResistanceReduction(participant) {
  const owned = traitsOf(participant).find(trait => trait.key === 'magicResistance');
  if (!owned) return 0;
  const rating = Number.parseInt(owned.detail, 10);
  return bookOf(participant) === 'L11' && Number.isSafeInteger(rating) && rating >= 1 ? rating : 3;
}

const trainedSkill = detail => TRAINED_SKILLS[fold(detail)] ?? null;

/**
 * Plan d'un Trait de magie.
 * `options` : `god` (Marque : dieu choisi quand plusieurs), `skill` (Dressé : compétence ciblée si plusieurs), `prayerBase` (Béni, Miracles :
 * valeur de Prière fixée par le MJ), `focusBase` / `tongueBase` (Lanceur de sorts : valeurs fixées par le MJ).
 */
export function planCreatureMagic(participant, key, options = {}) {
  const rule = RULES[key] ?? (key === 'mark' ? { fr: 'Marque du Chaos' } : null);
  const all = traitsOf(participant);
  const matching = all.filter(trait => trait.key === key);
  const owned = key === 'mark' && options.god ? matching.find(trait => trait.god === fold(options.god)) ?? matching[0] : matching[0];
  const plan = { key, label: rule?.fr ?? key, available: false, tests: [], modifiers: [], effects: [], unresolved: [], reminders: [] };
  if (!owned) {
    plan.unresolved.push(`${plan.label} : Trait absent du participant.`);
    return { ...plan, receipt: receiptOf(plan) };
  }
  if (key === 'magicResistance') {
    const reduction = magicResistanceReduction(participant);
    plan.modifiers.push({ scope: 'sorts qui affectent la créature', dr: -reduction });
    plan.effects.push({ spellReduction: reduction });
  } else if (key === 'spellcaster') {
    if (!owned.detail) plan.unresolved.push('Lanceur de sorts : domaine non imprimé, à saisir.');
    else plan.effects.push({ lore: owned.detail });
    const will = willpowerBase(participant).value;
    const focus = Number.isFinite(options.focusBase) ? options.focusBase : will === null ? null : will + 10;
    const intelligence = carac(participant, 'Int');
    const tongue = Number.isFinite(options.tongueBase) ? options.tongueBase : intelligence === null ? null : intelligence + 10;
    if (focus === null) plan.unresolved.push('Lanceur de sorts : Volonté inconnue, Focalisation à saisir.');
    else plan.tests.push({ skill: 'Focalisation', attr: 'FM', base: focus, reason: 'valeur de départ Volonté+10, ajustable par le MJ' });
    if (tongue === null) plan.unresolved.push('Lanceur de sorts : Intelligence inconnue, Langue magique à saisir.');
    else plan.tests.push({ skill: 'Langue magique', attr: 'Int', base: tongue, reason: 'valeur de départ Intelligence+10, ajustable par le MJ' });
  } else if (key === 'blessed' || key === 'miracles') {
    if (!owned.detail) plan.unresolved.push(`${plan.label} : divinité non imprimée, à saisir.`);
    else plan.effects.push({ deity: owned.detail, access: key === 'blessed' ? 'Bénédictions' : 'Miracles' });
    const social = carac(participant, 'Soc');
    const prayer = Number.isFinite(options.prayerBase) ? options.prayerBase : social === null ? null : social + 10;
    if (prayer === null) plan.unresolved.push(`${plan.label} : Sociabilité inconnue, Prière à saisir.`);
    else plan.tests.push({ skill: 'Prière', attr: 'Soc', base: prayer, reason: 'valeur de départ Sociabilité+10, ajustable par le MJ' });
  } else if (key === 'champion') {
    plan.effects.push({ defensiveMeleeWinDamage: 'comme l\'attaquant' });
  } else if (key === 'mark') {
    const god = owned.god;
    const note = MARK_NOTES[god] ?? MARK_NOTES.chaos;
    if (!MARK_NOTES[god] || god === 'chaos') plan.unresolved.push('Marque du Chaos : dieu à préciser (Khorne, Nurgle, Tzeentch ou Slaanesh).');
    else plan.effects.push({ god, rival: MARK_RIVAL[god], reciprocalAnimosityWhileVisible: true });
    plan.reminders.push(note);
  } else if (key === 'corruption') {
    if (!owned.detail) plan.unresolved.push('Corruption : force corruptrice non imprimée, à saisir.');
    else plan.effects.push({ corruptingInfluence: owned.detail });
  } else if (key === 'mentalCorruption') {
    plan.effects.push({ table: 'corruption mentale', drawnBy: 'MJ' });
  } else if (key === 'mutation') {
    plan.effects.push({ table: 'corruption physique', drawnBy: 'MJ' });
  } else if (key === 'trained') {
    const wanted = options.skill ? trainedSkill(options.skill) : null;
    // « Trained (Drive, Fetch) » : une compétence par élément, chacune avec son effet.
    const printed = String(owned.detail ?? '').split(/\s*(?:,|;|\band\b|\bet\b)\s*/i).map(part => part.trim()).filter(Boolean).map(part => trainedSkill(part) ?? part);
    if (!printed.length && !wanted) plan.unresolved.push('Dressé : compétence non imprimée, à saisir.');
    for (const chosen of wanted ? [wanted] : [...new Set(printed)]) {
      plan.effects.push({ trainedSkill: chosen });
      if (TRAINED_EFFECTS[chosen]) plan.effects.push({ trainedEffect: { skill: chosen, ...TRAINED_EFFECTS[chosen] } });
      if (chosen in TRAINED_DR) plan.tests.push({ skill: 'Dressage', attr: 'maître', base: null, bonus: TRAINED_DR[chosen], reason: `ordre « ${chosen} » du maître (valeur du maître saisie)` });
    }
  }
  plan.reminders.push(rule.note ?? MARK_NOTES.chaos);
  plan.available = plan.unresolved.length === 0;
  return { ...plan, receipt: receiptOf(plan) };
}

function receiptOf(plan) {
  return {
    ability: plan.label,
    tests: plan.tests.map(test => `${test.skill} ${test.base ?? '?'}${test.bonus ? ` (+${test.bonus})` : ''}`),
    modifiers: plan.modifiers.map(modifier => `${modifier.scope}${modifier.dr ? ` ${modifier.dr > 0 ? '+' : ''}${modifier.dr} DR` : ''}`),
    blocked: plan.unresolved.slice()
  };
}

/** Rappels de magie d'un participant, sans doublon (affichage de fiche). */
export function creatureMagicReminders(participant) {
  const out = [];
  for (const trait of creatureMagicTraits(participant)) {
    const text = trait.key === 'mark'
      ? `Marque du Chaos : ${MARK_NOTES[trait.god] ?? MARK_NOTES.chaos}`
      : `${RULES[trait.key].fr} : ${RULES[trait.key].note}`;
    if (!out.includes(text)) out.push(text);
  }
  return out;
}
