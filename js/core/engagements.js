// Engagements de mêlée durables (V5 p. 163) : une attaque de mêlée engage la paire attaquant/cible ; la paire cesse quand
// aucun des deux n'a attaqué l'autre pendant un Round complet. Module pur : chaque participant porte ses paires
// (`extensions.v5.engagements` = { autreId: { since, lastAttackRound } }, écrites des deux côtés, ce qui les fait suivre la
// persistance, les scènes et Annuler) ; tout le reste (mêlées affichées, surnombre, tir engagé, engagés d'une fuite) en est
// déduit, et le MJ peut toujours forcer une autre valeur dans le contexte de l'action.
import { outnumberSide, outnumberWeightOf } from './outnumbering.js';
import { previewV5Test, resolveV5Opposition } from './v5-roll.js';
import { awakeningMessage } from './v5-spell-restrictions.js';
import { resolveV5TestModifiers, finalizeV5TestModifiers } from './v5-test-modifiers.js';

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const pairKey = (a, b) => (a < b ? [a, b] : [b, a]);

const intOr0 = value => (Number.isInteger(value) ? value : 0);

/** Paires enregistrées, normalisées (ids triés, Rounds entiers), sans doublon ni paire réflexive ; un côté suffit à les lire. */
export function listEngagements(combat) {
  const seen = new Map();
  for (const person of combat?.participants || []) {
    const own = person?.extensions?.v5?.engagements;
    if (!own || typeof own !== 'object' || Array.isArray(own)) continue;
    for (const [other, row] of Object.entries(own)) {
      if (typeof person.id !== 'string' || other === person.id) continue;
      const [a, b] = pairKey(person.id, other), key = a + '|' + b, previous = seen.get(key);
      const since = intOr0(row?.since), last = intOr0(row?.lastAttackRound);
      seen.set(key, previous ? { ...previous, since: Math.min(previous.since, since), lastAttackRound: Math.max(previous.lastAttackRound, last) } : { a, b, since, lastAttackRound: last });
    }
  }
  return [...seen.values()];
}

/** Un combattant compte dans un engagement : en jeu, debout (PV > 0), ni mort ni Inconscient. */
export function canBeEngaged(person) {
  return person?.zone === 'active' && Number(person.hp) > 0 && person.extensions?.v5?.dead !== true
    && !(person.states || []).some(state => fold(state?.key ?? state?.name) === 'inconscient');
}

const byId = participants => new Map((participants || []).map(person => [person.id, person]));

/** Paires actives : les deux combattants comptent encore (les autres sont ignorées à la lecture, purgées en fin de Round). */
export function activeEngagements(combat, participants) {
  const people = byId(participants);
  return listEngagements(combat).filter(row => canBeEngaged(people.get(row.a)) && canBeEngaged(people.get(row.b)));
}

/** Ids des combattants engagés avec `id`. */
export function engagedWith(combat, participants, id) {
  return activeEngagements(combat, participants).flatMap(row => (row.a === id ? [row.b] : row.b === id ? [row.a] : []));
}

/** Mêlées = composantes connexes des paires actives, dans l'ordre des participants ; `ids` dans le même ordre. */
export function meleeGroups(combat, participants) {
  const pairs = activeEngagements(combat, participants), links = new Map();
  for (const { a, b } of pairs) {
    links.set(a, [...(links.get(a) || []), b]);
    links.set(b, [...(links.get(b) || []), a]);
  }
  const order = (participants || []).map(person => person.id).filter(id => links.has(id));
  const seen = new Set(), groups = [];
  for (const start of order) {
    if (seen.has(start)) continue;
    const stack = [start], members = new Set();
    while (stack.length) {
      const id = stack.pop();
      if (members.has(id)) continue;
      members.add(id);
      stack.push(...(links.get(id) || []));
    }
    for (const id of members) seen.add(id);
    groups.push({ id: 'melee-' + (groups.length + 1), ids: order.filter(id => members.has(id)) });
  }
  return groups;
}

/** Combat dont les participants portent exactement `engagements` (les deux côtés de chaque paire). */
function withPairs(combat, engagements) {
  const own = new Map();
  for (const row of engagements) {
    for (const [self, other] of [[row.a, row.b], [row.b, row.a]]) own.set(self, { ...(own.get(self) || {}), [other]: { since: row.since, lastAttackRound: row.lastAttackRound } });
  }
  return { ...combat, participants: (combat?.participants || []).map(person => {
    const mine = own.get(person.id), had = person?.extensions?.v5?.engagements;
    if (!mine && !had) return person;
    const v5 = { ...(person.extensions?.v5 || {}) };
    if (mine) v5.engagements = mine; else delete v5.engagements;
    return { ...person, extensions: { ...(person.extensions || {}), v5 } };
  }) };
}

/** Combat où `aId` et `bId` sont engagés ; une paire existante est rafraîchie au Round donné (attaque entre eux). */
export function withEngagement(combat, aId, bId, round) {
  if (typeof aId !== 'string' || typeof bId !== 'string' || aId === bId) return combat;
  const [a, b] = pairKey(aId, bId), when = Number.isInteger(round) ? round : 0;
  const rows = listEngagements(combat), existing = rows.find(row => row.a === a && row.b === b);
  return withPairs(combat, existing
    ? rows.map(row => (row === existing ? { ...row, lastAttackRound: Math.max(row.lastAttackRound, when) } : row))
    : [...rows, { a, b, since: when, lastAttackRound: when }]);
}

/** Combat où `id` n'est plus engagé avec `otherIds` (tous si absent). */
export function withoutEngagements(combat, id, otherIds = null) {
  const others = otherIds ? new Set(otherIds) : null;
  return withPairs(combat, listEngagements(combat).filter(row => {
    const other = row.a === id ? row.b : row.b === id ? row.a : null;
    return other === null || (others !== null && !others.has(other));
  }));
}

/**
 * Passage du Round `endedRound` au suivant : une paire sans attaque entre les deux pendant ce Round cesse (Round complet sans
 * attaque, p. 163) ; une paire dont un membre ne compte plus (banc, mort, Inconscient, retiré) est purgée.
 */
export function expireEngagements(combat, participants, endedRound) {
  const people = byId(participants), kept = [], expired = [];
  for (const row of listEngagements(combat)) {
    const alive = canBeEngaged(people.get(row.a)) && canBeEngaged(people.get(row.b));
    if (alive && row.lastAttackRound >= endedRound) kept.push(row);
    else expired.push({ ...row, reason: alive ? 'no-attack' : 'out-of-combat' });
  }
  return { combat: withPairs(combat, kept), expired };
}

const enemies = (a, b) => outnumberSide(a) !== outnumberSide(b);

/**
 * Contexte de résolution déduit des engagements, au format des clés existantes du moteur. Les valeurs forcées par le MJ dans
 * le brouillon l'emportent (fusion faite par l'appelant). `kind` : 'melee' | 'ranged' | autre.
 */
export function deriveEngagementContext({ combat, participants = [], actorId, targetId, kind } = {}) {
  const people = byId(participants), actor = people.get(actorId), target = people.get(targetId);
  if (!actor || !target || actor.id === target.id) return {};
  const pairs = activeEngagements(combat, participants);
  const linked = (x, y) => pairs.some(row => (row.a === x && row.b === y) || (row.a === y && row.b === x));
  const others = participants.filter(person => person.id !== actor.id && person.id !== target.id && canBeEngaged(person));
  if (kind === 'melee') {
    const attackerIds = others.filter(person => !enemies(person, actor) && linked(person.id, target.id)).map(person => person.id);
    const attackers = new Set([actor.id, ...attackerIds]);
    const defenderIds = others.filter(person => !enemies(person, target) && enemies(person, actor) && [...attackers].some(id => linked(person.id, id))).map(person => person.id);
    return { outnumberAttackerIds: attackerIds, outnumberDefenderIds: defenderIds, surrounded: target.extensions?.v5?.position?.surrounded === true };
  }
  if (kind === 'ranged') {
    const shooterPartners = engagedWith(combat, participants, actor.id);
    const targetPartners = engagedWith(combat, participants, target.id);
    const engagedWithShooter = shooterPartners.includes(target.id);
    // Cible engagée avec un tiers (p. 167) : candidats de déviation = la cible et les autres combattants de sa mêlée (tireur exclu),
    // au format du moteur (la cible en tête, au moins un autre).
    const thirdParties = targetPartners.filter(id => id !== actor.id);
    const melee = meleeGroups(combat, participants).find(group => group.ids.includes(target.id))?.ids || [];
    return {
      targetEngaged: thirdParties.length > 0,
      engagedWithShooter,
      engagedTargetIds: thirdParties.length ? [target.id, ...melee.filter(id => id !== target.id && id !== actor.id)] : [],
      shooterEngagedElsewhere: shooterPartners.some(id => id !== target.id)
    };
  }
  return {};
}

/**
 * Valeurs par défaut issues de la scène (planche D) et des positions durables : météo et lumière pour un tir, terrain difficile
 * et espace exigu pour une mêlée ; position haute → hauteur relative en mêlée ; cible à couvert → couvert au tir.
 */
export function deriveSceneContext({ scene = {}, actor, target, kind } = {}) {
  const out = {};
  if (kind === 'ranged') {
    for (const key of ['weather', 'lighting']) if (scene[key] && scene[key] !== 'normal') out[key] = scene[key];
    if (target?.extensions?.v5?.position?.cover === true) out.cover = true;
  }
  if (kind === 'melee') {
    for (const key of ['difficultTerrain', 'narrowSpace']) if (scene[key] === true) out[key] = true;
    const high = person => person?.extensions?.v5?.position?.higherGround === true;
    if (high(actor) && !high(target)) out.height = 'attacker';
    else if (high(target) && !high(actor)) out.height = 'defender';
  }
  return out;
}

/** Meilleur score de Corps à corps (CC à défaut) : celui que le désengagé doit battre (p. 163). */
export function bestMeleeScore(person) {
  const melee = (person?.skills || []).filter(row => /^corps a corps/.test(fold(row?.name ?? row?.nom))).map(row => Number(row.total ?? row.score)).filter(Number.isFinite);
  return melee.length ? Math.max(...melee) : Number(person?.caracs?.CC) || 0;
}
const skillScore = (person, pattern, carac) => {
  const row = (person?.skills || []).find(item => pattern.test(fold(item?.name ?? item?.nom)));
  const value = Number(row?.total ?? row?.score);
  return Number.isFinite(value) ? value : Number(person?.caracs?.[carac]) || 0;
};
// Perform (Acrobatics), p. 163 : « Représentation (Acrobatie) » au catalogue ; « Acrobaties » reste accepté sur une fiche ancienne.
const ACROBATICS = /acrobatie/;
/** Libellé de la meilleure compétence de Corps à corps (celle de `bestMeleeScore`), « Corps à corps » à défaut (CC seule). */
const bestMeleeSkill = person => {
  const rows = (person?.skills || []).filter(row => /^corps a corps/.test(fold(row?.name ?? row?.nom)) && Number.isFinite(Number(row.total ?? row.score)));
  const best = rows.reduce((top, row) => (top && Number(top.total ?? top.score) >= Number(row.total ?? row.score) ? top : row), null);
  return best ? String(best.name ?? best.nom) : 'Corps à corps';
};

/**
 * Q6 · T2 : modificateurs d'un camp du Désengagement. Calcul commun (États, talents, sorts et prières : `resolveV5TestModifiers`),
 * plus la situation propre au Désengagement (infériorité numérique, Élan), puis les plafonds de fin de calcul sur la liste complète
 * (Obstiné, Distrait), comme le Test principal. `rows` : détail affiché, source et montant ; un malus annulé par un plafond reste
 * visible, barré (Q9). Les lignes sont prises avant les plafonds (qui modifient les modificateurs sur place).
 */
function disengageSide(person, test, context, { advantages = [], disadvantages = [] } = {}) {
  const resolved = resolveV5TestModifiers(person, test, context);
  const situation = (list, kind) => list.map(row => ({ ...row, source: 'Situation', kind }));
  const rows = [...resolved.rows, ...situation(advantages, 'advantage'), ...situation(disadvantages, 'disadvantage')];
  const lists = { slModifiers: resolved.slModifiers.map(row => ({ ...row })), advantageSources: [...resolved.advantageSources, ...advantages],
    disadvantageSources: [...resolved.disadvantageSources, ...disadvantages] };
  const hadAdvantage = lists.advantageSources.length > 0;
  finalizeV5TestModifiers(person, resolved, lists);
  const capped = rows.map(row => {
    if (row.dropped || row.durable) return row;
    if (resolved.ignoreNegative && ((row.kind === 'modifier' && row.amount < 0) || row.kind === 'disadvantage')) return { ...row, dropped: true, rule: 'Obstiné' };
    if (hadAdvantage && !lists.advantageSources.length && row.kind === 'advantage') return { ...row, dropped: true, rule: 'Distrait' };
    return row;
  });
  return { ...lists, rows: capped, needsInput: resolved.needsInput, unresolved: resolved.unresolved, restrictions: resolved.restrictions, penalty: resolved.penalty,
    scoreDelta: resolved.scoreDelta || 0, blockingRestrictions: resolved.blockingRestrictions || [] };
}
const bestOption = preview => preview.options.reduce((best, option) => (option.result.sl > best.result.sl ? option : best), preview.options[0]);

/**
 * Aperçu d'un Désengagement (p. 163). `input` : `skill` ('esquive' | 'acrobaties'), `actorRoll`, `opponentRoll` (d100 saisis),
 * `force` (le MJ passe outre l'encerclement). Rend `{ status, mode, reason?, opponents, best, … }` ; `status` 'ready' seulement
 * si l'issue est connue (`success` true/false).
 */
export function previewDisengage({ combat, participants = [], actorId, input = {} } = {}) {
  const people = byId(participants), actor = people.get(actorId);
  if (!actor) return { status: 'blocked', reason: 'Combattant introuvable.' };
  const opponentIds = engagedWith(combat, participants, actorId).filter(id => enemies(people.get(id), actor));
  if (!opponentIds.length) return { status: 'blocked', reason: `${actor.name} n’est engagé avec aucun adversaire.` };
  const opponents = opponentIds.map(id => people.get(id));
  // REGLES-10 : Chant vivifiant, aucun Mouvement pendant l'éveil (le Désengagement est un déplacement).
  const awakening = awakeningMessage(actor, 'move');
  if (awakening) return { status: 'blocked', mode: 'awakening', opponentIds, reason: awakening };
  if (actor.extensions?.v5?.position?.surrounded === true && input.force !== true)
    return { status: 'blocked', mode: 'surrounded', opponentIds, reason: `${actor.name} est encerclé : se désengager est impossible ; il peut Fuir (p. 163).` };
  if (actor.extensions?.v5?.specialStates?.orderlyDisengage === true)
    return { status: 'ready', mode: 'orderly', success: true, opponentIds, summary: 'En Bon Ordre : désengagement sans Élan ni Test.' };
  if (actor.extensions?.v5?.hasMomentum === true)
    return { status: 'ready', mode: 'momentum', success: true, opponentIds, spendsMomentum: true, summary: `${actor.name} perd l’Élan et se désengage sans Test.` };
  const best = opponents.reduce((top, person) => (bestMeleeScore(person) > bestMeleeScore(top) ? person : top), opponents[0]);
  // En infériorité numérique (deux contre un parmi les engagés, Taille comprise, p. 360) : Désavantage au Test.
  const allies = [actor, ...participants.filter(person => person.id !== actor.id && canBeEngaged(person) && !enemies(person, actor)
    && opponentIds.some(id => engagedWith(combat, participants, person.id).includes(id)))];
  const weight = list => list.reduce((sum, person) => sum + outnumberWeightOf(person, 'defender'), 0);
  const outnumbered = weight(opponents) >= 2 * weight(allies);
  const skill = input.skill === 'acrobaties' ? 'acrobaties' : 'esquive';
  const actorScore = Number.isInteger(input.actorScore) ? input.actorScore : skill === 'acrobaties' ? skillScore(actor, ACROBATICS, 'Ag') : skillScore(actor, /^esquive/, 'Ag');
  const opponentScore = Number.isInteger(input.opponentScore) ? input.opponentScore : bestMeleeScore(best);
  // Q6 · T2 : calcul commun des deux côtés (CA3), la situation se somme (CA4). Le désengagé fait un Test d'Esquive ou d'Acrobaties
  // (Test de compétence qui compte toujours comme un mouvement, MJ 09/11 CA15 : À terre et Enchevêtré s'appliquent sans question ;
  // Test d'action, CA14 : Inconscient ou Surpris le bloquent) ; l'adversaire résiste avec sa Mêlée (Test de mêlée, comme au combat)
  // et ne lit pas les clés « … adverse » du désengagé (rôle de défenseur, comme au combat, CA16).
  const actorSkill = skill === 'acrobaties' ? (actor.skills || []).map(row => row?.name ?? row?.nom).find(name => ACROBATICS.test(fold(name))) || 'Représentation (Acrobatie)' : 'Esquive';
  const actorModifiers = disengageSide(actor, { characteristic: 'Ag', skill: actorSkill, skillCharacteristic: 'ag', kind: 'test', role: 'actor', opponent: best, participants, isAction: true },
    { ...(input.context || {}), involvesMovement: true }, { disadvantages: outnumbered ? [{ id: 'disengage:outnumbered', label: 'En infériorité numérique' }] : [] });
  const opponentModifiers = disengageSide(best, { characteristic: 'CC', skill: bestMeleeSkill(best), skillCharacteristic: 'cc', kind: 'melee', role: 'defender', opponent: actor, participants },
    input.opponentContext || {}, { advantages: best.extensions?.v5?.hasMomentum === true ? [{ id: 'momentum', label: 'Élan' }] : [] });
  const blockedBy = actorModifiers.blockingRestrictions;
  if (blockedBy.length) return { status: 'blocked', mode: 'restricted', opponentIds, bestOpponentId: best.id, skill, actorModifiers, opponentModifiers,
    reason: `${actor.name} ne peut pas se désengager : ${blockedBy.join(' ')}` };
  const needsInput = [...actorModifiers.needsInput.map(row => ({ side: 'actor', ...row })), ...opponentModifiers.needsInput.map(row => ({ side: 'opponent', ...row }))];
  const base = { mode: 'test', opponentIds, bestOpponentId: best.id, skill, actorScore, opponentScore, outnumbered, actorModifiers, opponentModifiers, needsInput };
  if (needsInput.length) return { ...base, status: 'needs-input', reason: `À saisir avant d’appliquer : ${needsInput.map(row => `${row.side === 'actor' ? actor.name : best.name} · ${row.label}`).join(' ; ')}` };
  if (!Number.isInteger(input.actorRoll) || !Number.isInteger(input.opponentRoll)) return { ...base, status: 'needs-rolls', reason: 'Saisissez les deux d100 du Test opposé.' };
  const test = (score, roll, side) => previewV5Test({ score, roll, slModifiers: side.slModifiers, advantageSources: side.advantageSources, disadvantageSources: side.disadvantageSources });
  // Séquelles (CA13) : une Caractéristique perdue pèse sur le score de chaque camp.
  const actorTest = test(Math.max(0, actorScore + actorModifiers.scoreDelta), input.actorRoll, actorModifiers),
    opponentTest = test(Math.max(0, opponentScore + opponentModifiers.scoreDelta), input.opponentRoll, opponentModifiers);
  const own = bestOption(actorTest).result, theirs = bestOption(opponentTest).result;
  const opposition = resolveV5Opposition(own, theirs);
  const success = opposition.winner === 'initiator';
  return { ...base, status: 'ready', success, actorSl: own.sl, opponentSl: theirs.sl,
    summary: success ? `${actor.name} se désengage (${own.sl} DR contre ${theirs.sl}).` : `${actor.name} échoue (${own.sl} DR contre ${theirs.sl}) : ses adversaires gagnent l’Élan.` };
}
