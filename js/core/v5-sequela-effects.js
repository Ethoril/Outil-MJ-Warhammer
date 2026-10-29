/**
 * Effets des séquelles durables et temporaires (V5 livre de base p.177-179), lus dans le registre de convalescence.
 * Module pur, sans dépendance : le registre est la seule source ; les lignes calculées ici sont projetées sur le
 * participant (`extensions.v5.sequelaEffects`) puis lues par la résolution. Toute modification de DR est exprimée en DR V5.
 */
export const SEQUELA_RULE_VERSION = 'v5-sequelae-2026-10-29.1';
/** p.177 : une fracture met 30 + 1d10 jours à guérir (10 de plus si majeure) ; un muscle 30 − BE jours. */
export const BONE_DAYS = 30;
export const MAJOR_BONE_EXTRA_DAYS = 10;
export const MUSCLE_DAYS = 30;
/** « Within a week » : une semaine impériale de 8 jours (p.177, Healing Times and Downtime). */
export const IMMOBILIZATION_WEEK_DAYS = 8;
export const REBIND_WINDOW_DAYS = 1;

const fold = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const SIDE_TEXT = { left: 'gauche', right: 'droit(e)' };
export const PART_TEXT = {
  head: 'tête', body: 'corps', arm: 'bras', leg: 'jambe', hand: 'main', foot: 'pied', ear: 'oreille', eye: 'œil', finger: 'doigt(s)',
  toe: 'orteil(s)', nose: 'nez', teeth: 'dents', tongue: 'langue'
};
const sided = (part, side) => `${PART_TEXT[part] || part}${side ? ` ${SIDE_TEXT[side] || side}` : ''}`;
const CARAC_ALIASES = { cc: 'CC', ws: 'CC', ct: 'CT', bs: 'CT', f: 'F', s: 'F', e: 'E', t: 'E', i: 'I', ag: 'Ag', dex: 'Dex', int: 'Int', fm: 'FM', wp: 'FM', soc: 'Soc', fel: 'Soc' };
export const normalizeCarac = value => CARAC_ALIASES[fold(value)] || (value ? String(value) : null);

export const isLanguageTest = label => /(^|\W)(langues?|languages?)(\W|$)/.test(fold(label));
export const isDodgeTest = label => /(esquive|dodge)/.test(fold(label));
const isAthleticsTest = label => /(athletisme|athletics)/.test(fold(label));
const isIntimidateTest = label => /(intimidation|intimidate)/.test(fold(label));
const isCharmTest = label => /(charme|charm)/.test(fold(label));
const isPerceptionTest = label => /perception/.test(fold(label));

/** Phase d'une séquelle au jour donné (le jour du calendrier de convalescence). */
export function sequelaPhase(sequela, day) {
  if (sequela.status === 'needs-facts') return 'needs-facts';
  if (sequela.kind === 'broken-bone') {
    if (sequela.status === 'healed' || sequela.status === 'permanent') return sequela.status;
    return day < sequela.endDay ? 'healing' : 'awaiting-test';
  }
  if (sequela.kind === 'torn-muscle') {
    if (sequela.status === 'healed') return 'healed';
    if (sequela.severity === 'major') return day < sequela.partialDay ? 'severe' : (day < sequela.endDay ? 'recovering' : 'healed');
    return day < sequela.endDay ? 'healing' : 'healed';
  }
  return sequela.status;
}

const LOWER = new Set(['foot', 'leg']);
const UPPER = new Set(['hand', 'arm']);

/**
 * Lignes d'effets d'un participant au jour courant du registre. Chaque ligne : { id, sourceId, label, lifetime, type, … }.
 * Les doublons de règles (deux pieds, deux mains…) sont agrégés ici : la résolution ne compte jamais deux fois la même cause.
 */
export function sequelaEffectRows(state, participantId) {
  const day = state?.calendar?.currentDay ?? 0;
  const own = (state?.sequelae || []).filter(row => row.participantId === participantId);
  const rows = [];
  const add = (sequela, suffix, row) => rows.push({ id: `${sequela.id}:${suffix}`, sourceId: sequela.id, lifetime: 'permanent', ...row });

  // Membres inférieurs « perdus » : pertes définitives et fracture de jambe en cours (p.177 : règles du membre amputé).
  const lowerSides = new Map();
  const upper = [];
  const fingers = new Map();
  const toes = new Map();
  let teeth = 0, nose = false, tongue = false;
  const ears = new Set(), eyes = new Set();
  for (const s of own) {
    const phase = sequelaPhase(s, day);
    if (s.kind === 'loss' && s.status === 'permanent') {
      if (LOWER.has(s.part)) lowerSides.set(s.side, { sequela: s, leg: s.part === 'leg', lifetime: 'permanent' });
      else if (UPPER.has(s.part)) upper.push({ sequela: s, side: s.side, arm: s.part === 'arm', primary: s.primary === true, relearned: s.relearned || 0, lifetime: 'permanent' });
      else if (s.part === 'finger') fingers.set(s.side, { sequela: s, count: (fingers.get(s.side)?.count || 0) + s.count });
      else if (s.part === 'toe') toes.set(s.side, (toes.get(s.side) || 0) + s.count);
      else if (s.part === 'teeth') teeth += s.count;
      else if (s.part === 'ear') ears.add(s.side);
      else if (s.part === 'eye') eyes.add(s.side);
      else if (s.part === 'nose') nose = s;
      else if (s.part === 'tongue') tongue = s;
    }
    if (s.kind === 'broken-bone' && phase === 'healing') {
      if (s.part === 'leg') lowerSides.set(s.side, lowerSides.get(s.side) || { sequela: s, leg: true, lifetime: 'temporary' });
      else if (s.part === 'arm') upper.push({ sequela: s, side: s.side, arm: true, primary: s.primary === true, relearned: 0, lifetime: 'temporary' });
      else if (s.part === 'head') add(s, 'language', { lifetime: 'temporary', type: 'language-dr', amount: -3, label: `Fracture à la tête (${s.severity === 'major' ? 'majeure' : 'mineure'}) : −3 DR aux Tests de Langue` });
      else if (s.part === 'body') {
        add(s, 'disadvantage', { lifetime: 'temporary', type: 'disadvantage-carac', carac: ['F', 'Ag'], count: 2, label: 'Fracture au corps : Désavantage majeur aux Tests de Force et d’Agilité' });
        add(s, 'movement', { lifetime: 'temporary', type: 'movement', mode: 'half', label: 'Fracture au corps : Mouvement divisé par deux' });
      }
    }
    if (s.kind === 'broken-bone' && phase === 'permanent') {
      const n = s.severity === 'major' ? 2 : 1;
      if (s.part === 'arm') add(s, 'badly-healed', { type: 'loc-dr', loc: `arm:${s.side}`, carac: ['Ag'], amount: -n, label: `Fracture mal soignée (bras ${SIDE_TEXT[s.side]}) : −${n} DR aux Tests d’Agilité utilisant ce bras` });
      else if (s.part === 'head') add(s, 'badly-healed', { type: 'speech-dr', amount: -n, label: `Fracture mal soignée (tête) : −${n} DR aux Tests de Langue parlée` });
      else {
        add(s, 'badly-healed-movement', { type: 'movement', mode: 'minus', amount: n, label: `Fracture mal soignée (${PART_TEXT[s.part]}) : Mouvement −${n}` });
        add(s, 'badly-healed-ag', { type: 'char', carac: 'Ag', amount: -10 * n, label: `Fracture mal soignée (${PART_TEXT[s.part]}) : Agilité −${10 * n}` });
      }
    }
    if (s.kind === 'torn-muscle' && ['healing', 'severe', 'recovering'].includes(phase)) {
      const amount = s.severity === 'major' ? (phase === 'recovering' ? -1 : -2) : -1;
      const loc = s.part === 'arm' || s.part === 'leg' ? `${s.part}:${s.side}` : s.part;
      add(s, 'loc', { lifetime: 'temporary', type: 'loc-dr', loc, amount, label: `Déchirure musculaire ${s.severity === 'major' ? 'majeure' : 'mineure'} (${sided(s.part, s.side)}) : ${amount} DR aux Tests impliquant la zone` });
      if (s.part === 'leg') add(s, 'movement', { lifetime: 'temporary', type: 'movement', mode: 'half', label: `Déchirure musculaire (jambe ${SIDE_TEXT[s.side]}) : Mouvement divisé par deux` });
    }
  }

  // Jambes et pieds : Mouvement, Capacité de Combat/Agilité, Désavantage Esquive/Athlétisme, Esquive interdite (p.178).
  const lost = [...lowerSides.values()];
  if (lost.length) {
    const lifetime = lost.every(row => row.lifetime === 'temporary') ? 'temporary' : 'permanent';
    const second = lost.length >= 2;
    const source = lost[0].sequela;
    const toesOnLost = [...lowerSides.keys()].reduce((sum, side) => sum + (toes.get(side) || 0), 0);
    const footPenalty = (10 + (second ? 5 : 0)) - toesOnLost;
    add(source, 'foot-movement', { lifetime, type: 'movement', mode: second ? 'one' : 'half-up', label: second ? 'Deux pieds ou jambes perdus : Mouvement 1' : 'Pied ou jambe perdu : Mouvement divisé par deux (arrondi au-dessus)' });
    add(source, 'foot-cc', { lifetime, type: 'char', carac: 'CC', amount: -footPenalty, label: `Pied/jambe perdu : Capacité de Combat −${footPenalty}` });
    add(source, 'foot-ag', { lifetime, type: 'char', carac: 'Ag', amount: -footPenalty, label: `Pied/jambe perdu : Agilité −${footPenalty}` });
    add(source, 'foot-dodge', { lifetime, type: 'dodge-athletics-disadvantage', label: 'Pied/jambe perdu : Désavantage aux Tests d’Esquive et d’Athlétisme' });
    if (lost.some(row => row.leg)) add(source, 'no-dodge', { lifetime, type: 'no-dodge', label: 'Jambe perdue : l’Esquive est impossible' });
  }
  // Orteils : −1 CC/Ag chacun ; sur un pied ensuite perdu, la pénalité du pied est réduite d'autant (ci-dessus), le total reste 10.
  for (const [side, count] of toes) {
    const own1 = own.find(row => row.kind === 'loss' && row.part === 'toe' && row.side === side);
    add(own1, 'toes-cc', { type: 'char', carac: 'CC', amount: -count, label: `${count} orteil(s) perdu(s) (pied ${SIDE_TEXT[side]}) : Capacité de Combat −${count}` });
    add(own1, 'toes-ag', { type: 'char', carac: 'Ag', amount: -count, label: `${count} orteil(s) perdu(s) (pied ${SIDE_TEXT[side]}) : Agilité −${count}` });
  }

  // Bras et mains : tâches à deux mains, armes à deux mains, bouclier, main directrice (p.178). Quatre doigts perdus valent une main.
  const asHand = [...upper];
  for (const [side, entry] of fingers) {
    if (upper.some(row => row.side === side)) continue;
    if (entry.count >= 4) asHand.push({ sequela: entry.sequela, side, arm: false, primary: entry.sequela.primary === true, relearned: entry.sequela.relearned || 0, lifetime: 'permanent', fromFingers: true });
    else add(entry.sequela, 'fingers', { type: 'loc-dr', loc: `arm:${side}`, amount: -entry.count, label: `${entry.count} doigt(s) perdu(s) (main ${SIDE_TEXT[side]}) : −${entry.count} DR aux Tests utilisant cette main` });
  }
  if (asHand.length) {
    const lifetime = asHand.every(row => row.lifetime === 'temporary') ? 'temporary' : 'permanent';
    const first = asHand[0].sequela;
    add(first, 'two-hands', { lifetime, type: 'two-hands', label: first.kind === 'broken-bone' ? 'Bras fracturé, inutilisable : Désavantage aux Tests à deux mains, armes à deux mains interdites' : 'Main ou bras perdu : Désavantage aux Tests à deux mains, armes à deux mains interdites' });
    const arm = asHand.find(row => row.arm);
    if (arm) add(arm.sequela, 'shield-arm', { lifetime: arm.lifetime, type: 'shield-arm', label: arm.sequela.kind === 'broken-bone' ? 'Bras fracturé : bouclier impossible à fixer à ce bras' : 'Bras perdu : bouclier impossible à fixer à ce bras' });
    const primary = asHand.find(row => row.primary);
    if (primary) {
      const penalty = Math.max(0, 2 - (primary.relearned || 0));
      add(primary.sequela, 'offhand', { lifetime: primary.lifetime, type: 'offhand-dr', amount: -penalty, label: `Main directrice perdue : règle de la main non directrice (−${penalty} DR après réapprentissage)` });
    }
  }

  // Sens et traits du visage (p.178-179).
  if (ears.size >= 2) add(own.find(row => row.kind === 'loss' && row.part === 'ear'), 'ears', { type: 'both-ears', label: 'Deux oreilles perdues : Désavantage aux Tests de Perception auditive' });
  if (eyes.size >= 2) add(own.find(row => row.kind === 'loss' && row.part === 'eye'), 'eyes', { type: 'both-eyes', label: 'Deux yeux perdus : Désavantage aux Tests influencés par la vue ; Avantage aux attaques de mêlée adverses' });
  if (nose) {
    add(nose, 'smell', { type: 'smell', label: 'Nez perdu : Désavantage aux Tests d’odorat' });
    add(nose, 'social', { type: 'social', intimidation: 2, charm: -2, label: 'Nez perdu (toujours une cicatrice impressionnante) : +2 DR Intimidation, −2 DR Charme' });
  }
  if (tongue) add(tongue, 'tongue', { type: 'speech-fail', label: 'Langue perdue : échec automatique des Tests de Langue impliquant la parole' });
  if (teeth >= 2) {
    const source = own.find(row => row.kind === 'loss' && row.part === 'teeth');
    add(source, 'teeth-soc', { type: 'char', carac: 'Soc', amount: -Math.floor(teeth / 2), label: `${teeth} dents perdues : Sociabilité −${Math.floor(teeth / 2)}` });
  }
  // Cicatrices : accord du MJ pour les cicatrices impressionnantes (+1/−1, remplacées par +2/−2 avec le nez) ; la cicatrice du Coup spectaculaire vaut une fois, guérie.
  const agreed = own.find(row => row.kind === 'scar-decision' && row.agreed === true);
  if (agreed && !nose) add(agreed, 'scars', { type: 'social', intimidation: 1, charm: -1, label: 'Cicatrices impressionnantes (accord du MJ) : +1 DR Intimidation, −1 DR Charme' });
  const dramatic = own.find(row => row.kind === 'scar' && row.status === 'permanent' && (state.incidents || []).some(incident => incident.id === row.incidentId && incident.status === 'closed'));
  if (dramatic) add(dramatic, 'dramatic', { type: 'appropriate-social', amount: 1, label: 'Cicatrice de duel guérie : +1 DR aux Tests sociaux appropriés (une seule fois)' });
  // Pertes de caractéristique (p.177), décidées une à une par le MJ.
  for (const s of own.filter(row => row.kind === 'characteristic-loss')) {
    add(s, 'characteristic', { type: 'char', carac: s.carac, amount: -s.applied, label: `Perte de ${s.carac} −${s.applied} (${s.reason})` });
  }
  return rows;
}

/** Mouvement effectif : une seule division par deux, Mouvement 1 pour deux pieds, puis les pertes définitives. */
export function effectiveSequelaMovement(rows, base) {
  const value = Number(base);
  if (!Number.isFinite(value)) return null;
  let movement = value;
  if (rows.some(row => row.type === 'movement' && ['half', 'half-up'].includes(row.mode))) movement = Math.ceil(value / 2);
  if (rows.some(row => row.type === 'movement' && row.mode === 'one')) movement = Math.min(movement, 1);
  movement -= rows.filter(row => row.type === 'movement' && row.mode === 'minus').reduce((sum, row) => sum + row.amount, 0);
  return Math.max(0, movement);
}

/** Pertes de caractéristique (hors Mouvement) agrégées par caractéristique, avec leurs sources : l'information à renvoyer à la fiche. */
export function sequelaCharacteristicTotals(rows, { lifetime = null } = {}) {
  const totals = {};
  for (const row of rows) {
    if (row.type !== 'char' || (lifetime && row.lifetime !== lifetime)) continue;
    const entry = totals[row.carac] ||= { amount: 0, sources: [] };
    entry.amount += row.amount;
    entry.sources.push({ id: row.id, sourceId: row.sourceId, amount: row.amount, lifetime: row.lifetime, label: row.label });
  }
  return totals;
}

/** Projection sur un participant : lignes, Mouvement effectif et rappels. Absente quand rien ne s'applique. */
export function sequelaMirror(register, participant) {
  if (!register || !Array.isArray(register.sequelae) || !register.sequelae.length || !participant?.id) return null;
  let rows;
  try { rows = sequelaEffectRows(register, participant.id); } catch { return null; }
  const reminders = [];
  const teeth = register.sequelae.filter(row => row.participantId === participant.id && row.kind === 'loss' && row.part === 'teeth' && row.status === 'permanent').reduce((sum, row) => sum + row.count, 0);
  if (teeth >= 16) reminders.push('Plus de la moitié des dents perdues (Humains 16, Elfes 18, Halflings et Nains 20) : repas doublés, certains aliments quasi impossibles (narratif, p.179).');
  if (register.sequelae.filter(row => row.participantId === participant.id && row.kind === 'loss' && UPPER.has(row.part) && row.status === 'permanent').length >= 2) reminders.push('Deux mains perdues : des prothèses sont nécessaires pour manipuler des objets (p.178).');
  if (!rows.length && !reminders.length) return null;
  const base = Number(participant.caracs?.M ?? participant.movement);
  const movement = Number.isFinite(base) ? { base, effective: effectiveSequelaMovement(rows, base) } : null;
  return { schemaVersion: 1, ruleVersion: SEQUELA_RULE_VERSION, day: register.calendar.currentDay, rows, movement, reminders };
}

const sequelaRows = participant => participant?.extensions?.v5?.sequelaEffects?.rows || [];
const hasRow = (rows, type) => rows.some(row => row.type === type);

/** Circonstances que le MJ doit préciser dans la résolution pour les effets du participant (clés de `context`). */
export function sequelaContextFields(participant) {
  const rows = sequelaRows(participant);
  const fields = [];
  const push = (key, label) => { if (!fields.some(row => row.key === key)) fields.push({ key, label }); };
  for (const row of rows) {
    if (row.type === 'loc-dr') push(`sequelaUses:${row.loc}`, `Le Test utilise cette zone : ${row.label.split(' : ')[0]}`);
    if (row.type === 'speech-dr' || row.type === 'speech-fail') push('sequelaSpeech', 'Le Test de Langue implique la parole');
    if (row.type === 'two-hands') { push('sequelaTwoHands', 'Le Test repose normalement sur deux mains'); push('sequelaShieldOnLostArm', 'Le bouclier est fixé au bras perdu ou immobilisé'); }
    if (row.type === 'offhand-dr') push('sequelaOffHand', 'Test de mêlée avec l’arme de la main non directrice');
    if (row.type === 'both-ears') push('sequelaHearing', 'Le Test de Perception repose sur l’ouïe');
    if (row.type === 'smell') push('sequelaSmell', 'Le Test de Perception repose sur l’odorat');
    if (row.type === 'appropriate-social') push('sequelaScarAppropriate', 'Test social pour lequel la cicatrice de duel est appropriée');
    if (row.type === 'both-eyes') { push('reliesOnSight', 'Le Test est réalisable sans voir mais repose sur la vue'); push('requiresSight', 'Le Test est impossible sans voir'); }
  }
  return fields;
}

/**
 * Règles de Test des séquelles pour un participant qui teste : modificateurs de DR, Avantages/Désavantages, restrictions,
 * précisions manquantes et variation du score. Une circonstance que l'outil ne connaît pas est demandée au MJ, jamais devinée.
 */
export function sequelaTestRules({ actor, opponent = null, skillLabel = '', actionLabel = '', carac = null, kind = 'test', defending = false, attack = false, context = {}, weaponHands = null, shieldUsed = false } = {}) {
  const out = { modifiers: [], advantages: [], disadvantages: [], restrictions: [], unresolved: [], scoreDelta: 0, sources: [], offHand: null };
  const rows = sequelaRows(actor);
  const label = `${skillLabel} ${actionLabel}`;
  const key = normalizeCarac(carac);
  const language = isLanguageTest(label);
  const dodge = isDodgeTest(label) || (defending && kind === 'test' && /^ag$/i.test(String(actionLabel).trim()));
  const flag = name => context?.[name];
  const ask = (name, text) => { if (typeof flag(name) !== 'boolean') out.unresolved.push(text); return flag(name) === true; };
  const used = new Set();
  const once = (row, apply) => { if (used.has(row.type + (row.loc || ''))) return; used.add(row.type + (row.loc || '')); apply(); };
  const push = (row, amount) => { out.modifiers.push({ id: `sequela:${row.id}`, label: row.label, amount }); out.sources.push(row.id); };
  for (const row of rows) {
    switch (row.type) {
      case 'language-dr': if (language) push(row, row.amount); break;
      case 'speech-dr': if (language && ask('sequelaSpeech', 'Séquelle : préciser si le Test de Langue implique la parole.')) push(row, row.amount); break;
      case 'speech-fail': if (language && ask('sequelaSpeech', 'Séquelle : préciser si le Test de Langue implique la parole.')) out.restrictions.push(row.label); break;
      case 'disadvantage-carac': if (key && row.carac.includes(key)) for (let i = 0; i < row.count; i += 1) { out.disadvantages.push({ id: `${row.id}:${i}`, label: 'Fracture au corps' }); out.sources.push(row.id); } break;
      case 'loc-dr': {
        if (row.carac && !row.carac.includes(key)) break;
        if (ask(`sequelaUses:${row.loc}`, `Séquelle : préciser si le Test utilise cette zone (${row.label.split(' : ')[0]}).`)) push(row, row.amount);
        break;
      }
      case 'two-hands': once(row, () => {
        if (weaponHands === 2) out.restrictions.push('Main ou bras perdu : une arme à deux mains est interdite.');
        else if (attack && weaponHands === 1) { /* arme à une main : rien */ }
        else if (kind === 'test' && ask('sequelaTwoHands', 'Séquelle : préciser si le Test repose normalement sur deux mains.')) { out.disadvantages.push({ id: row.id, label: 'Main ou bras perdu (Test à deux mains)' }); out.sources.push(row.id); }
      }); break;
      case 'shield-arm': if (shieldUsed) once(row, () => { if (ask('sequelaShieldOnLostArm', 'Séquelle : préciser si le bouclier est fixé au bras perdu ou immobilisé.')) out.restrictions.push('Bras perdu : on ne peut pas y fixer de bouclier.'); }); break;
      // Une seule source pour la main non directrice : la séquelle force la règle générale `offHand` (Ambidextre la supprime) et les 100 PX la réduisent.
      case 'offhand-dr': if (kind === 'melee') {
        const general = defending ? flag('offHandWeapon') === true : Number(context?.penalties?.offHand) < 0;
        if (general || ask('sequelaOffHand', 'Séquelle : préciser si le Test de mêlée emploie l’arme de la main non directrice.')) { out.offHand = { forced: !general, reduction: 2 + row.amount }; out.sources.push(row.id); }
      } break;
      case 'no-dodge': if (dodge) out.restrictions.push(row.label); break;
      case 'dodge-athletics-disadvantage': if (dodge || isAthleticsTest(label)) { out.disadvantages.push({ id: row.id, label: 'Pied/jambe perdu' }); out.sources.push(row.id); } break;
      case 'both-eyes': if (kind === 'test') {
        const known = typeof flag('reliesOnSight') === 'boolean' || typeof flag('requiresSight') === 'boolean';
        if (!known) out.unresolved.push('Séquelle : préciser si le Test est influencé par la vue.');
        else if (flag('reliesOnSight') === true || flag('requiresSight') === true) { out.disadvantages.push({ id: row.id, label: 'Deux yeux perdus' }); out.sources.push(row.id); }
      } break;
      case 'both-ears': if (isPerceptionTest(label) && ask('sequelaHearing', 'Séquelle : préciser si le Test de Perception repose sur l’ouïe.')) { out.disadvantages.push({ id: row.id, label: 'Deux oreilles perdues' }); out.sources.push(row.id); } break;
      case 'smell': if (isPerceptionTest(label) && ask('sequelaSmell', 'Séquelle : préciser si le Test de Perception repose sur l’odorat.')) { out.disadvantages.push({ id: row.id, label: 'Nez perdu' }); out.sources.push(row.id); } break;
      case 'social': once(row, () => {
        if (isIntimidateTest(label)) push(row, row.intimidation);
        else if (isCharmTest(label)) push(row, row.charm);
      }); break;
      case 'appropriate-social': if (key === 'Soc' && ask('sequelaScarAppropriate', 'Séquelle : préciser si la cicatrice de duel est appropriée à ce Test social.')) push(row, row.amount); break;
      case 'char': if (key && row.carac === key) { out.scoreDelta += row.amount; out.sources.push(row.id); } break;
      default: break;
    }
  }
  // Les yeux perdus de la cible donnent l'Avantage aux attaques de mêlée contre elle (p.178).
  if (!defending && attack && kind === 'melee' && hasRow(sequelaRows(opponent), 'both-eyes')) {
    const row = sequelaRows(opponent).find(item => item.type === 'both-eyes');
    out.advantages.push({ id: `sequela:${row.id}:opponent`, label: 'Cible privée de ses deux yeux' }); out.sources.push(row.id);
  }
  return out;
}
