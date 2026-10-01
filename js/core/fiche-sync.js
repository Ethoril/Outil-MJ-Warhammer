// Mise à jour des profils PJ depuis les fiches de personnage (autre projet Firebase).
// Module pur : aucune E/S. La lecture des fiches est dans fiche-source.js, l'écriture
// passe par Store.applyFicheSync (une seule commande annulable).
import { cloneValue, normalizeAction, uid } from './models.js';
import { actionHasDamage, normalizeDamageFields, strengthBonusOf } from './damage.js';

export const FICHE_CHAR_IDS = Object.freeze(['bhelgi', 'caelel', 'elysia', 'hellaya', 'wren']);

// Clés de la fiche → clés canoniques du profil.
const CARAC_MAP = Object.freeze({ cc: 'CC', ct: 'CT', f: 'F', e: 'E', i: 'I', ag: 'Ag', dex: 'Dex', int: 'Int', fm: 'FM', soc: 'Soc' });

// Table des compétences de base de la fiche (js/fiche.js, BASIC_SKILLS) : `skillsBasic` ne porte que les avances.
export const FICHE_BASIC_SKILLS = Object.freeze([
  ['Art', 'dex'], ['Athlétisme', 'ag'], ['Calme', 'fm'], ['Charme', 'soc'], ['Chevaucher', 'ag'],
  ['Commandement', 'soc'], ["Conduite d'attelage", 'ag'], ['Corps à corps (Base)', 'cc'], ['Discrétion', 'ag'],
  ['Divertissement', 'soc'], ['Emprise sur les animaux', 'fm'], ['Escalade', 'f'], ['Esquive', 'ag'],
  ['Intimidation', 'f'], ['Intuition', 'i'], ['Marchandage', 'soc'], ['Orientation', 'i'], ['Pari', 'int'],
  ['Perception', 'i'], ['Ragot', 'soc'], ['Ramer', 'f'], ['Résistance', 'e'], ["Résistance à l'alcool", 'e'],
  ['Subornation', 'soc'], ['Survie en extérieur', 'int']
].map(([name, carac]) => Object.freeze({ name, carac })));

// Les halfelins n'ajoutent pas leur Bonus de Force aux Blessures (clés de la fiche, anciennes sauvegardes comprises).
const RACES_SANS_BF = new Set(['halfelin', 'halfling']);

const number = value => (Number.isFinite(Number(value)) ? Number(value) : 0);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Minuscules sans accents ni espaces superflus, pour comparer des noms. */
export function normalizeName(value) {
  return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
}

/**
 * Blessures maximum (WFRP4) : BF + 2×BE + BFM, +BE par rang de « Dur à cuire ». Sans BF pour un halfelin.
 * null quand F (hors halfelin), E ou FM manque : le résultat n'est pas calculable.
 */
export function woundsMax({ totals, race, talents = [] }) {
  const sansBF = RACES_SANS_BF.has(String(race || '').toLowerCase());
  if (!['E', 'FM', ...(sansBF ? [] : ['F'])].every(key => Number.isFinite(totals?.[key]))) return null;
  const bonus = key => Math.floor(number(totals?.[key]) / 10);
  const hardy = (Array.isArray(talents) ? talents : []).filter(item => normalizeName(item?.nom) === 'dur a cuire').length;
  const strength = sansBF ? 0 : bonus('F');
  return strength + 2 * bonus('E') + bonus('FM') + hardy * bonus('E');
}

/**
 * Fiche brute (`doc.data`) → ce que l'outil en retient : totaux, initiative, blessures max
 * et compétences utilisables (`name`, `carac`, `total`).
 */
export function ficheSnapshot(charId, fiche) {
  const source = isRecord(fiche) ? fiche : {};
  const totals = {};
  const rawTotals = {};
  for (const [key, canonical] of Object.entries(CARAC_MAP)) {
    const entry = source.carac?.[key];
    if (!isRecord(entry)) continue;
    rawTotals[canonical] = number(entry.base) + number(entry.adv);
    totals[canonical] = rawTotals[canonical];
  }
  const caracTotal = key => number(rawTotals[CARAC_MAP[key]]);
  const skills = new Map();
  // Sans la caractéristique de la fiche, le total d'une compétence serait faux : elle n'est pas proposée.
  for (const { name, carac } of FICHE_BASIC_SKILLS) {
    if (!(CARAC_MAP[carac] in rawTotals)) continue;
    const advances = number(source.skillsBasic?.[name]);
    skills.set(name, { name, carac, advances, total: caracTotal(carac) + advances });
  }
  // Une entrée de skillsBasic hors table (renommée, ancienne) n'a pas de carac connue : ignorée.
  for (const item of Array.isArray(source.skillsAdvanced) ? source.skillsAdvanced : []) {
    const name = typeof item?.nom === 'string' ? item.nom.trim() : '';
    if (!name || !CARAC_MAP[item.carac] || !(CARAC_MAP[item.carac] in rawTotals)) continue;
    const advances = number(item.adv);
    skills.set(name, { name, carac: item.carac, advances, total: caracTotal(item.carac) + advances });
  }
  const race = typeof source.race === 'string' ? source.race : '';
  return {
    charId,
    name: typeof source.nom === 'string' ? source.nom.trim() : '',
    race,
    caracs: totals,
    initiative: totals.I ?? null,
    wounds: woundsMax({ totals, race, talents: source.talentsAcq }),
    skills: [...skills.values()]
  };
}

// Premier mot significatif d'un nom : articles, particules et mots de moins de 3 lettres sont écartés.
const STOP_WORDS = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'von', 'van', 'the', 'the']);
const firstWord = value => normalizeName(value).split(/[\s'-]+/).find(word => word.length >= 3 && !STOP_WORDS.has(word)) || '';

/**
 * Profil PJ cible de chaque fiche : lien déjà enregistré (`extensions.ficheId`), puis nom
 * (normalisé) égal, puis premier mot du nom de la fiche ou identifiant du personnage.
 * Un profil ne sert qu'une fois. Renvoie { [charId]: profileId | null }.
 */
export function matchFiches(snapshots, profiles) {
  const pjs = (profiles || []).filter(profile => profile?.kind === 'PJ');
  const taken = new Set();
  const result = {};
  const claim = (snapshot, found) => {
    if (!found || taken.has(found.id) || result[snapshot.charId]) return;
    taken.add(found.id); result[snapshot.charId] = found.id;
  };
  for (const snapshot of snapshots) claim(snapshot, pjs.find(profile => profile.extensions?.ficheId === snapshot.charId));
  const unique = (snapshot, test) => {
    const found = pjs.filter(profile => !taken.has(profile.id) && test(normalizeName(profile.name)));
    return found.length === 1 ? found[0] : null;
  };
  for (const snapshot of snapshots) {
    if (!result[snapshot.charId]) claim(snapshot, unique(snapshot, name => name && name === normalizeName(snapshot.name)));
  }
  // Du plus sûr au plus large : identifiant ou premier mot égal au nom du profil, puis même premier mot.
  const tests = [
    (name, snapshot) => name === snapshot.charId || (Boolean(firstWord(snapshot.name)) && name === firstWord(snapshot.name)),
    (name, snapshot) => Boolean(firstWord(name)) && firstWord(name) === firstWord(snapshot.name)
  ];
  for (const test of tests) {
    for (const snapshot of snapshots) {
      if (!result[snapshot.charId]) claim(snapshot, unique(snapshot, name => name && test(name, snapshot)));
    }
  }
  for (const snapshot of snapshots) result[snapshot.charId] ??= null;
  return result;
}

const RANGED = /\b(arc|arbalete|fronde|javelot|javeline|lance-pierre|pistolet|arquebuse|fusil|tir|lancer|jet)\b/;
// Sorts, morsures et autres capacités : ce ne sont pas des compétences de la fiche.
const NO_SKILL = /\b(sorts?|morsures?|griffes?|souffles?|prieres?)\b/;
const PARRY = /\b(parade|parer|bouclier)\b/;

const skillNamed = (skills, name) => skills.find(skill => normalizeName(skill.name) === normalizeName(name))?.name || '';
const specOf = name => (String(name).match(/\(([^)]+)\)\s*$/)?.[1] || '');

/** Compétence de la fiche proposée pour une action (nom exact, ou '' si rien ne convient). */
export function suggestSkill(action, skills) {
  const list = Array.isArray(skills) ? skills : [];
  const name = normalizeName(action?.note);
  const type = action?.type || '';
  if (NO_SKILL.test(name)) return '';
  const melee = () => {
    const group = list.filter(skill => normalizeName(skill.name).startsWith('corps a corps'));
    const byName = group.find(skill => specOf(skill.name) && name.includes(normalizeName(specOf(skill.name))) && normalizeName(specOf(skill.name)) !== 'base');
    return byName?.name || skillNamed(list, 'Corps à corps (Base)');
  };
  const ranged = () => {
    const group = list.filter(skill => normalizeName(skill.name).startsWith('projectiles'));
    const bySpec = group.find(skill => specOf(skill.name) && name.includes(normalizeName(specOf(skill.name))));
    return bySpec?.name || (group.length === 1 ? group[0].name : '');
  };
  if (type === 'defense') return PARRY.test(name) ? melee() : skillNamed(list, 'Esquive');
  if (type === 'attack') return RANGED.test(name) ? (ranged() || melee()) : melee();
  if (!name) return '';
  const exact = list.find(skill => normalizeName(skill.name) === name);
  if (exact) return exact.name;
  // Correspondance large : mots entiers d'au moins 4 lettres seulement.
  const contains = (hay, needle) => needle.length >= 4 && new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(hay);
  const loose = list.find(skill => {
    const skillName = normalizeName(skill.name);
    const group = normalizeName(skill.name.replace(/\s*\([^)]*\)\s*$/, ''));
    return contains(name, skillName) || contains(skillName, name) || contains(name, group);
  });
  return loose?.name || '';
}

const bonusFormula = bonus => (bonus === 0 ? 'BF' : `BF${bonus > 0 ? '+' : '-'}${Math.abs(bonus)}`);

/**
 * Plan de mise à jour d'un profil depuis une fiche, sans rien écrire.
 * `choices.links` : { [actionId]: nom de compétence | '' (aucune) } ; sinon le lien enregistré, puis la proposition.
 * `choices.convert` : { [actionId]: false } décoche la conversion des dégâts fixes (cochée par défaut).
 */
export function planProfileSync(snapshot, profile, { links = {}, convert = {} } = {}) {
  const oldCaracs = profile.caracs || {};
  const caracs = Object.entries(snapshot.caracs).map(([key, value]) => ({ key, old: oldCaracs[key] ?? null, new: value, changed: oldCaracs[key] !== value }));
  const oldBonus = Number.isFinite(Number(oldCaracs.F)) && oldCaracs.F !== '' && oldCaracs.F !== null ? strengthBonusOf({ F: oldCaracs.F }) : null;
  const actions = (profile.diceLines || []).map(raw => {
    const action = normalizeAction(raw);
    const stored = action.extensions?.ficheSkill;
    const proposed = suggestSkill(action, snapshot.skills);
    const wanted = Object.hasOwn(links, action.id) ? links[action.id] : (typeof stored === 'string' ? stored : proposed);
    const skill = snapshot.skills.find(item => item.name === wanted) || null;
    // Lien enregistré qui n'existe plus dans la fiche : conservé tel quel tant que le MJ ne choisit pas autre chose.
    const missing = !Object.hasOwn(links, action.id) && typeof stored === 'string' && stored !== '' && !skill ? stored : null;
    const oldBase = action.base;
    const newBase = skill ? skill.total : oldBase;
    const fixed = action.type === 'attack' && !action.damageFormula && actionHasDamage(action) && oldBonus !== null;
    const damage = fixed ? { from: action.damage, bonus: action.damage - oldBonus, formula: bonusFormula(action.damage - oldBonus), enabled: convert[action.id] !== false } : null;
    return {
      id: action.id, name: action.note, type: action.type || '',
      skill: skill?.name || '', missing, stored: typeof stored === 'string' ? stored : null, proposed: !Object.hasOwn(links, action.id) && typeof stored !== 'string' && Boolean(proposed),
      oldBase, newBase, baseChanged: skill !== null && String(oldBase) !== String(newBase), damage
    };
  });
  return {
    profileId: profile.id, charId: snapshot.charId, name: profile.name,
    caracs,
    initiative: { old: profile.initiative, new: snapshot.initiative ?? profile.initiative },
    hp: { old: profile.hp, new: snapshot.wounds ?? profile.hp, computable: snapshot.wounds !== null },
    actions
  };
}

/**
 * Applique des mises à jour de fiches à un brouillon d'état (réserve + personnages persistants).
 * Le combat, la scène active et leurs participants ne sont jamais touchés.
 * `entries` : [{ charId, profileId, snapshot, links, convert }].
 */
export function applyFicheSync(draft, entries) {
  const reserve = (draft.reserve || []).map(cloneValue);
  let characters = (draft.persistentCharacters || []).map(cloneValue);
  const done = [];
  for (const entry of entries || []) {
    const index = reserve.findIndex(profile => profile.id === entry.profileId);
    if (index < 0 || !entry.snapshot) continue;
    const profile = reserve[index];
    const profileBefore = JSON.stringify(profile);
    const charactersBefore = JSON.stringify(characters);
    const plan = planProfileSync(entry.snapshot, profile, { links: entry.links, convert: entry.convert });
    const byId = new Map(plan.actions.map(action => [action.id, action]));
    profile.caracs = { ...profile.caracs, ...entry.snapshot.caracs };
    if (entry.snapshot.initiative !== null) profile.initiative = entry.snapshot.initiative;
    const wounds = entry.snapshot.wounds;
    if (wounds !== null) profile.hp = wounds;
    profile.extensions = { ...(profile.extensions || {}), ficheId: entry.charId };
    profile.diceLines = (profile.diceLines || []).map(raw => {
      const planned = byId.get(raw?.id);
      if (!planned) return raw;
      const action = { ...raw, extensions: { ...(raw.extensions || {}) } };
      if (planned.skill) { action.base = planned.newBase; action.extensions.ficheSkill = planned.skill; }
      else if (planned.stored && !planned.missing) action.extensions.ficheSkill = '';
      if (planned.damage?.enabled) Object.assign(action, normalizeDamageFields({ damage: planned.damage.bonus, damageFormula: planned.damage.formula }));
      return action;
    });
    // PV du personnage persistant remis au maximum : lien d'une rencontre vers ce profil, sinon même nom.
    const linked = new Set((draft.encounters || []).flatMap(item => item.entries || []).filter(item => item.profileId === profile.id && item.persistentCharacterId).map(item => item.persistentCharacterId));
    const named = characters.filter(item => normalizeName(item.name) === normalizeName(profile.name)).map(item => item.id);
    const targets = linked.size ? linked : new Set(named);
    if (wounds !== null) characters = characters.map(item => (targets.has(item.id) ? { ...item, hp: wounds } : item));
    if (JSON.stringify(profile) !== profileBefore || JSON.stringify(characters) !== charactersBefore) done.push(profile.name);
  }
  if (!done.length) return draft;
  return {
    ...draft, reserve, persistentCharacters: characters,
    log: [{ id: uid(), ts: Date.now(), kind: 'management', text: `Fiches PJ mises à jour : ${done.join(', ')}.` }, ...(draft.log || [])].slice(0, 300)
  };
}

/** Message lisible pour une erreur de lecture des fiches (Firebase ou réseau). */
export function ficheErrorMessage(error, { online = true } = {}) {
  const code = String(error?.code || '');
  if (code === 'permission-denied' || code === 'firestore/permission-denied') return 'Accès refusé : ce compte Google n’a pas le droit de lire les fiches (ou la vérification App Check a échoué).';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Connexion annulée.';
  if (code === 'auth/popup-blocked') return 'La fenêtre de connexion a été bloquée : autorisez les fenêtres surgissantes, puis réessayez.';
  if (code.startsWith('appCheck/') || code.startsWith('app-check/')) return 'Vérification App Check impossible : rechargez la page, puis réessayez depuis le site publié.';
  if (!online || code === 'unavailable' || code === 'auth/network-request-failed' || code === 'failed-precondition') return 'Fiches injoignables : vérifiez votre connexion, puis réessayez.';
  if (code === 'unauthenticated') return 'Session expirée : reconnectez-vous avec Google.';
  return 'Lecture des fiches impossible : réessayez, ou rechargez la page.';
}
