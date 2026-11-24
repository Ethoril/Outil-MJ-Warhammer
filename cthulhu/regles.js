/**
 * Règles de L'Appel de Cthulhu 7e.
 * Module pur : aucun accès au DOM, aucun hasard caché. Chaque fonction qui jette des dés reçoit soit les dés déjà
 * jetés, soit un générateur `rng` (() => [0, 1[) ou un `lancer(expression)` injecté.
 *
 * Source : Manuel du Gardien (USB_V7-GARDIEN.pdf), qui fait foi. Les commentaires citent la page imprimée du
 * Manuel (page du PDF − 2). Les points que le livre ne tranche pas sont marqués « À CONFIRMER » : leur choix par
 * défaut est réglable par une option, pour ne rien figer. Chaque arbitrage est couvert par
 * tests/unit/cthulhu/arbitrages.test.js.
 */

// ---------------------------------------------------------------------------
// Niveaux de réussite
// ---------------------------------------------------------------------------

export const NIVEAU = Object.freeze({ MALADRESSE: 0, ECHEC: 1, ORDINAIRE: 2, MAJEURE: 3, EXTREME: 4, CRITIQUE: 5 });

export const LIBELLE_NIVEAU = Object.freeze({
  0: 'Maladresse', 1: 'Échec', 2: 'Réussite ordinaire', 3: 'Réussite majeure', 4: 'Réussite extrême', 5: 'Réussite critique'
});

/** Difficulté demandée → niveau minimal pour réussir. */
export const DIFFICULTE = Object.freeze({ ordinaire: NIVEAU.ORDINAIRE, majeure: NIVEAU.MAJEURE, extreme: NIVEAU.EXTREME });

export const LIBELLE_DIFFICULTE = Object.freeze({ ordinaire: 'ordinaire', majeure: 'majeure', extreme: 'extrême' });

/** Seuils d'une valeur : entière, moitié, cinquième (arrondis à l'inférieur). */
export function seuils(valeur) {
  const v = Math.max(0, Math.floor(Number(valeur) || 0));
  return { ordinaire: v, majeure: Math.floor(v / 2), extreme: Math.floor(v / 5) };
}

/** Seuil effectif d'une difficulté (valeur, moitié ou cinquième). */
export function seuilDeDifficulte(valeur, difficulte = 'ordinaire') {
  const s = seuils(valeur);
  if (!(difficulte in s)) throw new RangeError(`Difficulté inconnue : ${difficulte}`);
  return s[difficulte];
}

/**
 * Plancher de maladresse : 100 seul, ou 96 à 100 si le seuil de réussite est inférieur à 50 (Manuel du Gardien p. 79).
 * Le « seuil de réussite » est celui de la difficulté demandée (exemple p. 79 : 55 % en test majeur, seuil 27 : dès 96).
 * L'option `maladresseSurValeur: true` prend la valeur entière de la compétence à la place (non utilisée).
 */
export function plancherMaladresse(valeur, { difficulte = 'ordinaire', maladresseSurValeur = false } = {}) {
  const reference = maladresseSurValeur ? Math.floor(Number(valeur) || 0) : seuilDeDifficulte(valeur, difficulte);
  return reference < 50 ? 96 : 100;
}

/** Niveau atteint par un jet (1-100) contre une valeur, sans tenir compte de la difficulté sauf pour la maladresse. */
export function niveauDuJet(jet, valeur, options = {}) {
  if (!Number.isInteger(jet) || jet < 1 || jet > 100) throw new RangeError(`Jet hors de 1-100 : ${jet}`);
  if (jet === 1) return NIVEAU.CRITIQUE;
  if (jet >= plancherMaladresse(valeur, options)) return NIVEAU.MALADRESSE;
  const s = seuils(valeur);
  if (jet <= s.extreme) return NIVEAU.EXTREME;
  if (jet <= s.majeure) return NIVEAU.MAJEURE;
  if (jet <= s.ordinaire) return NIVEAU.ORDINAIRE;
  return NIVEAU.ECHEC;
}

export const estReussite = niveau => niveau >= NIVEAU.ORDINAIRE;

// ---------------------------------------------------------------------------
// Dés bonus et malus
// ---------------------------------------------------------------------------

export const DES_NETS_MAX = 2;

/** Bonus et malus s'annulent un pour un ; le net est borné à ±2. Positif = dés bonus, négatif = dés malus. */
export function desNets(bonus = 0, malus = 0) {
  const net = Math.max(0, Math.floor(bonus)) - Math.max(0, Math.floor(malus));
  return Math.max(-DES_NETS_MAX, Math.min(DES_NETS_MAX, net));
}

/** Un d100 à partir d'un chiffre des dizaines (0-9) et d'un chiffre des unités (0-9) : 00 + 0 = 100. */
export const valeurD100 = (dizaine, unite) => (dizaine === 0 && unite === 0 ? 100 : dizaine * 10 + unite);

/**
 * Combine les dés déjà jetés : `unite` (0-9) et `dizaines` (1 + |net| chiffres 0-9). Avec des dés bonus on garde le
 * plus petit résultat, avec des dés malus le plus grand. Les dizaines en trop sont ignorées.
 */
export function combinerD100({ unite, dizaines, net = 0 }) {
  const n = Math.max(-DES_NETS_MAX, Math.min(DES_NETS_MAX, net));
  const utiles = dizaines.slice(0, 1 + Math.abs(n));
  if (utiles.length < 1 + Math.abs(n)) throw new RangeError(`Il faut ${1 + Math.abs(n)} dés des dizaines`);
  const candidats = utiles.map(d => valeurD100(d, unite));
  const jet = n > 0 ? Math.min(...candidats) : n < 0 ? Math.max(...candidats) : candidats[0];
  return { jet, candidats, net: n };
}

const chiffre = rng => Math.floor(rng() * 10);

/** Jette les dés d'un d100 avec `net` dés bonus (positif) ou malus (négatif). */
export function lancerD100({ net = 0, rng = Math.random } = {}) {
  const n = Math.max(-DES_NETS_MAX, Math.min(DES_NETS_MAX, net));
  const unite = chiffre(rng);
  const dizaines = Array.from({ length: 1 + Math.abs(n) }, () => chiffre(rng));
  return { unite, dizaines, ...combinerD100({ unite, dizaines, net: n }) };
}

/**
 * Test de compétence ou de caractéristique. `des` : un jet déjà connu (nombre 1-100) ou `{ unite, dizaines }`.
 * Sans `des`, jette avec `rng`. Rend le jet, le niveau atteint et la réussite selon la difficulté.
 */
export function testCompetence({ valeur, difficulte = 'ordinaire', bonus = 0, malus = 0, des = null, rng = Math.random, ...options }) {
  const net = desNets(bonus, malus);
  const tirage = typeof des === 'number' ? { jet: des, candidats: [des], net }
    : des ? combinerD100({ ...des, net }) : lancerD100({ net, rng });
  const niveau = niveauDuJet(tirage.jet, valeur, { difficulte, ...options });
  return {
    valeur, difficulte, net, jet: tirage.jet, candidats: tirage.candidats, niveau,
    seuil: seuilDeDifficulte(valeur, difficulte),
    reussi: niveau >= DIFFICULTE[difficulte]
  };
}

// ---------------------------------------------------------------------------
// Tests opposés et mêlée
// ---------------------------------------------------------------------------

/**
 * Test opposé : le meilleur niveau l'emporte ; à égalité de niveau (réussites), la valeur la plus haute
 * (Manuel du Gardien p. 80). Rend 'a', 'b', 'aucun' (deux échecs) ou 'egalite' (même niveau et même valeur).
 */
export function testOppose(a, b) {
  const ra = estReussite(a.niveau), rb = estReussite(b.niveau);
  if (!ra && !rb) return 'aucun';
  if (a.niveau !== b.niveau) return a.niveau > b.niveau ? 'a' : 'b';
  if (a.valeur !== b.valeur) return a.valeur > b.valeur ? 'a' : 'b';
  return 'egalite';
}

/**
 * Issues possibles d'une égalité parfaite au test opposé (Manuel du Gardien p. 80 : « un match nul, ou les deux camps
 * doivent relancer les dés »). Le livre laisse le choix au Gardien : l'outil le lui propose, il ne tranche pas.
 */
export const ISSUES_EGALITE = Object.freeze([
  Object.freeze({ id: 'nul', libelle: 'Match nul', relance: false }),
  Object.freeze({ id: 'relance', libelle: 'Les deux camps relancent les dés', relance: true })
]);

/**
 * Test opposé sous forme d'objet : `{ vainqueur: 'a' | 'b' | null, egalite, aucun, issues }`. Une égalité parfaite
 * n'a jamais de vainqueur implicite : `egalite: true`, `vainqueur: null`, et `issues` liste le choix du Gardien.
 */
export function resoudreTestOppose(a, b) {
  const r = testOppose(a, b);
  return {
    vainqueur: r === 'a' || r === 'b' ? r : null,
    egalite: r === 'egalite',
    aucun: r === 'aucun',
    issues: r === 'egalite' ? ISSUES_EGALITE : []
  };
}

/**
 * Mêlée : l'attaquant doit réussir et battre la défense (Manuel du Gardien p. 91-92).
 * - `rendre` (Rendre les coups) : égalité de niveau → l'attaquant gagne ; défense meilleure → le défenseur inflige ses
 *   dégâts, toujours au niveau ordinaire : les dégâts extrêmes et l'empalement n'existent qu'au tour d'initiative
 *   normal, jamais en rendant les coups (p. 92).
 * - `esquiver` : égalité de niveau → le défenseur esquive ; il n'inflige jamais de dégâts.
 * - `aucune` (surprise, défense impossible) : l'attaque touche si elle réussit.
 * Rend `{ vainqueur: 'attaquant' | 'defenseur' | 'aucun', touche: 'defenseur' | 'attaquant' | null, niveauDegats }`
 * où `touche` est celui qui subit les dégâts et `niveauDegats` le niveau du coup porté (empalement si Extrême ou mieux,
 * ce que seule l'attaque du tour normal peut produire).
 */
export function resoudreMelee({ attaque, defense = null, mode = 'esquiver' }) {
  const attaqueReussie = estReussite(attaque.niveau);
  if (mode === 'aucune' || !defense) {
    return attaqueReussie ? { vainqueur: 'attaquant', touche: 'defenseur', niveauDegats: attaque.niveau }
      : { vainqueur: 'aucun', touche: null, niveauDegats: null };
  }
  const defenseReussie = estReussite(defense.niveau);
  if (!attaqueReussie && !defenseReussie) return { vainqueur: 'aucun', touche: null, niveauDegats: null };
  if (mode === 'rendre') {
    if (attaqueReussie && attaque.niveau >= defense.niveau) return { vainqueur: 'attaquant', touche: 'defenseur', niveauDegats: attaque.niveau };
    return { vainqueur: 'defenseur', touche: 'attaquant', niveauDegats: NIVEAU.ORDINAIRE };
  }
  if (mode === 'esquiver') {
    if (attaqueReussie && attaque.niveau > defense.niveau) return { vainqueur: 'attaquant', touche: 'defenseur', niveauDegats: attaque.niveau };
    return { vainqueur: 'defenseur', touche: null, niveauDegats: null };
  }
  throw new RangeError(`Mode de défense inconnu : ${mode}`);
}

/**
 * Surnombre : une cible qui a déjà esquivé ou rendu les coups ce round (autant de fois que ses défenses gratuites,
 * 1 par défaut) donne 1 dé bonus aux attaques suivantes de mêlée contre elle (Manuel du Gardien p. 96). Une créature
 * à plusieurs attaques par round se défend autant de fois que d'attaques : `defensesParRound` = son nombre d'attaques
 * (une goule : 3). Ne s'applique pas aux attaques à distance.
 */
export function desBonusSurnombre({ defensesFaites = 0, defensesParRound = 1 } = {}) {
  return defensesFaites >= defensesParRound ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Ordre d'action
// ---------------------------------------------------------------------------

export const BONUS_DEX_ARME_PRETE = 50;

/** DEX d'initiative : +50 avec une arme à feu dégainée et prête. */
export const dexInitiative = ({ dex, armeFeuPrete = false }) => (Number(dex) || 0) + (armeFeuPrete ? BONUS_DEX_ARME_PRETE : 0);

/**
 * Ordre du round par DEX décroissante (+50 arme à feu prête). Égalité : la plus haute compétence de combat (`combat`)
 * passe d'abord (Manuel du Gardien p. 90), puis l'ordre d'entrée.
 */
export function ordreDex(participants) {
  return participants.map((p, i) => ({ p, i, dex: dexInitiative(p) }))
    .sort((x, y) => y.dex - x.dex || (Number(y.p.combat) || 0) - (Number(x.p.combat) || 0) || x.i - y.i)
    .map(({ p, dex }) => ({ id: p.id, dex }));
}

// ---------------------------------------------------------------------------
// Tir
// ---------------------------------------------------------------------------

/** Portée : base (ordinaire), jusqu'à ×2 (majeure), jusqu'à ×4 (extrême), au-delà hors de portée (null). */
export function difficulteDePortee(distance, porteeBase) {
  if (!(porteeBase > 0)) return 'ordinaire';
  if (distance <= porteeBase) return 'ordinaire';
  if (distance <= 2 * porteeBase) return 'majeure';
  if (distance <= 4 * porteeBase) return 'extreme';
  return null;
}

/**
 * Bout portant : à un dixième de la DEX du tireur, en mètres (Manuel du Gardien p. 100) : DEX 60 → 6 m, DEX 55 → 5,5 m
 * (l'exemple de la p. 104 place une cible à 6 m hors du bout portant pour DEX 55). Yards = mètres : aucune conversion.
 */
export const distanceBoutPortant = dex => (Number(dex) || 0) / 10;

/**
 * Défenses ouvertes à la cible d'une attaque (Manuel du Gardien p. 91, 96 et 100). Mêlée : Rendre les coups ou Esquiver.
 * Arme à feu ou de trait (`distance`) : ni l'un ni l'autre, seulement se mettre à couvert (test d'Esquive, dé malus pour
 * l'attaquant ; non modélisé ici). Arme de jet : Esquiver, et Rendre les coups seulement au corps à corps avec le lanceur.
 */
export function defensesPossibles({ type, auCorpsACorps = false }) {
  if (type === 'melee') return ['rendre', 'esquiver'];
  if (type === 'distance') return ['couvert'];
  if (type === 'jet') return auCorpsACorps ? ['rendre', 'esquiver'] : ['esquiver'];
  throw new RangeError(`Type d'attaque inconnu : ${type}`);
}

/**
 * Modificateurs d'un tir : bout portant +1 dé bonus ; tir dans une mêlée ou cible à couvert 1 dé malus chacun.
 * Rend `{ difficulte, bonus, malus, horsPortee }`.
 */
export function preparerTir({ distance, porteeBase, dexTireur, dansMelee = false, couvert = false }) {
  const difficulte = difficulteDePortee(distance, porteeBase);
  const boutPortant = distance <= distanceBoutPortant(dexTireur);
  return {
    difficulte: difficulte ?? 'extreme',
    horsPortee: difficulte === null,
    tresLonguePortee: difficulte === 'extreme',
    boutPortant,
    bonus: boutPortant ? 1 : 0,
    malus: (dansMelee ? 1 : 0) + (couvert ? 1 : 0)
  };
}

// ---------------------------------------------------------------------------
// Dés de dégâts
// ---------------------------------------------------------------------------

const TERME = /([+-]?)\s*(?:(\d*)\s*[dD]\s*(\d+)|(\d+))/g;

/** « 1D10+2 », « +1D4 », « -1 », « 0 » → termes `{ signe, n, faces }` (faces 0 = constante n). */
export function analyserExpression(expression) {
  const texte = String(expression ?? '0').replace(/\s+/g, '');
  if (!texte || texte === '0') return [];
  const termes = [];
  for (const m of texte.matchAll(TERME)) {
    const signe = m[1] === '-' ? -1 : 1;
    if (m[3]) termes.push({ signe, n: m[2] ? Number(m[2]) : 1, faces: Number(m[3]) });
    else termes.push({ signe, n: Number(m[4]), faces: 0 });
  }
  return termes;
}

/** Maximum d'une expression (les dés négatifs comptent à leur minimum). */
export function maxExpression(expression) {
  return analyserExpression(expression).reduce((s, t) => s + t.signe * (t.faces ? (t.signe > 0 ? t.n * t.faces : t.n) : t.n), 0);
}

/** Jette une expression avec `rng`. */
export function lancerExpression(expression, rng = Math.random) {
  return analyserExpression(expression).reduce((s, t) => {
    if (!t.faces) return s + t.signe * t.n;
    let total = 0;
    for (let i = 0; i < t.n; i++) total += 1 + Math.floor(rng() * t.faces);
    return s + t.signe * total;
  }, 0);
}

/** Impact (bonus aux dégâts) et Carrure selon FOR + TAI. */
export function impactEtCarrure(force, taille) {
  const total = (Number(force) || 0) + (Number(taille) || 0);
  if (total <= 64) return { impact: '-2', carrure: -2 };
  if (total <= 84) return { impact: '-1', carrure: -1 };
  if (total <= 124) return { impact: '0', carrure: 0 };
  if (total <= 164) return { impact: '+1D4', carrure: 1 };
  if (total <= 204) return { impact: '+1D6', carrure: 2 };
  const paliers = Math.floor((total - 205) / 80); // 205-284 : +2D6 / +3, puis +1D6 / +1 par tranche de 80
  return { impact: `+${2 + paliers}D6`, carrure: 3 + paliers };
}

/** PV max : (CON + TAI) ÷ 10, arrondi à l'inférieur. */
export const pvMax = (con, taille) => Math.floor(((Number(con) || 0) + (Number(taille) || 0)) / 10);

/**
 * Empalement possible ? Arme empalante ; à très longue portée (seule une réussite Extrême touche), seulement sur un
 * succès critique, un jet de 01 (Manuel du Gardien p. 100). Sans empalement, une réussite Extrême ne donne que les
 * dégâts maximaux (arme et Impact), sans jet supplémentaire : lecture retenue, le livre ne détaille pas ce cas.
 */
export const empalementPossible = ({ arme, niveau, tresLonguePortee = false }) =>
  arme.empalante === true && (!tresLonguePortee || niveau === NIVEAU.CRITIQUE);

/**
 * Dégâts d'un coup qui touche. `arme` : `{ des, empalante, aImpact }` (`aImpact` : l'Impact s'ajoute, mêlée et lancer).
 * Réussite Extrême (ou Critique) : arme empalante → maximum de l'arme + un jet de l'arme en plus (+ Impact maximal si
 * `aImpact`) ; arme non empalante → maximum de l'arme + Impact maximal. Puis réduction propre à la cible
 * (`reduction` : 'moitie' pour une créature à demi-dégâts, appliquée avant l'armure, arrondi à l'inférieur), puis armure.
 * `tresLonguePortee` : le tir est à très longue portée (voir `empalementPossible`).
 * `lancer(expression)` est injecté (tests) ; par défaut `lancerExpression` avec `rng`.
 */
export function calculerDegats({ arme, impact = '0', niveau, armure = 0, reduction = null, tresLonguePortee = false,
  lancer = null, rng = Math.random }) {
  const jette = lancer || (e => lancerExpression(e, rng));
  const avecImpact = arme.aImpact === true && impact && impact !== '0';
  const extreme = niveau >= NIVEAU.EXTREME;
  let brut, detail;
  if (!extreme) {
    const armeJet = jette(arme.des);
    const impactJet = avecImpact ? jette(impact) : 0;
    brut = armeJet + impactJet;
    detail = { arme: armeJet, impact: impactJet, empalement: 0 };
  } else {
    const armeMax = maxExpression(arme.des);
    const impactMax = avecImpact ? maxExpression(impact) : 0;
    const empale = empalementPossible({ arme, niveau, tresLonguePortee });
    const empalement = empale ? jette(arme.des) : 0;
    brut = armeMax + impactMax + empalement;
    detail = { arme: armeMax, impact: impactMax, empalement };
  }
  brut = Math.max(0, brut);
  const reduit = reduction === 'moitie' ? Math.floor(brut / 2) : brut;
  const total = Math.max(0, reduit - (Number(armure) || 0));
  return { total, brut, reduit, extreme, empale: extreme && empalementPossible({ arme, niveau, tresLonguePortee }), ...detail };
}

// ---------------------------------------------------------------------------
// Blessures, état Mourant, mort
// ---------------------------------------------------------------------------

/** Blessure grave : un seul coup qui retire au moins la moitié des PV max. */
export const estBlessureGrave = (degats, max) => degats > 0 && 2 * degats >= max;

/**
 * Applique un coup à `{ pv, pvMax, blessureGrave, etat }` (`etat` : 'actif' | 'inconscient' | 'mourant' | 'mort').
 * - Coup strictement supérieur aux PV max → mort immédiate ; égal aux PV max : blessure grave et 0 PV, donc mourant
 *   (Manuel du Gardien p. 107).
 * - Blessure grave → `jetCON` requis (échec : inconscient).
 * - 0 PV avec blessure grave (celle-ci ou une précédente) → mourant ; 0 PV sans → inconscient
 *   (Manuel du Gardien p. 107-108).
 * - PNJ et créatures suivent la même règle : à 0 PV, inconscients ou mourants, pas morts (le livre ne prévoit aucune
 *   exception, p. 107 ; p. 284 : seul un test de Premiers soins ou de Médecine fixe l'état d'une créature).
 * Rend le nouvel état et les jets à faire.
 */
export function appliquerBlessure(cible, degats) {
  const max = cible.pvMax;
  if (cible.etat === 'mort') return { ...cible, grave: false, mortImmediate: false, jetCON: false };
  if (degats > max) return { ...cible, pv: 0, etat: 'mort', grave: true, mortImmediate: true, jetCON: false };
  const grave = estBlessureGrave(degats, max);
  const pv = Math.max(0, cible.pv - degats);
  const blessureGrave = cible.blessureGrave || grave;
  let etat = cible.etat || 'actif';
  if (pv === 0) etat = blessureGrave ? 'mourant' : 'inconscient';
  return { ...cible, pv, blessureGrave, etat, grave, mortImmediate: false, jetCON: grave && etat !== 'mort' };
}

/** Jet de CON après une blessure grave : échec → inconscient (un mourant reste mourant). */
export function suiteJetConBlessure(cible, niveauCON) {
  if (estReussite(niveauCON) || cible.etat === 'mourant' || cible.etat === 'mort') return { ...cible };
  return { ...cible, etat: 'inconscient' };
}

/** Mourant : jet de CON à chaque round jusqu'à stabilisation ; échec → mort. */
export function suiteJetConMourant(cible, niveauCON) {
  if (cible.etat !== 'mourant') return { ...cible };
  return estReussite(niveauCON) ? { ...cible } : { ...cible, etat: 'mort' };
}

// ---------------------------------------------------------------------------
// Santé mentale
// ---------------------------------------------------------------------------

/** « 1/1D6 » → `{ reussite: '1', echec: '1D6' }`. */
export function analyserCoutSan(cout) {
  const [reussite, echec] = String(cout).split('/').map(s => s.trim());
  if (!echec) throw new RangeError(`Coût de SAN invalide : ${cout}`);
  return { reussite, echec };
}

/**
 * Perte de SAN d'un jet de SAN : réussite → partie gauche, échec → partie droite, maladresse → maximum de la partie
 * droite (Manuel du Gardien p. 79 et p. 138).
 */
export function perteSan({ cout, niveau, lancer = null, rng = Math.random }) {
  const jette = lancer || (e => lancerExpression(e, rng));
  const { reussite, echec } = analyserCoutSan(cout);
  if (estReussite(niveau)) return Math.max(0, jette(reussite));
  if (niveau === NIVEAU.MALADRESSE) return Math.max(0, maxExpression(echec));
  return Math.max(0, jette(echec));
}

/** Journée de SAN : SAN au début de la journée et cumul des pertes. */
export const nouvelleJourneeSan = san => ({ sanDebut: san, perteJour: 0, persistanteDeclenchee: false });

/**
 * Applique une perte de SAN. Folie passagère possible si ≥ 5 points d'un coup (il reste le jet d'INT : une réussite
 * rend fou, voir `foliePassagere`). Folie persistante (Manuel du Gardien p. 140) : le cumul des pertes de la journée,
 * perte en cours comprise, atteint 1/5 de la SAN « actuelle », celle d'avant cette perte (décision du MJ : le livre
 * ne dit pas à quel moment la mesurer). Le livre n'arrondit pas ce cinquième ; on prend l'arrondi à l'inférieur, au
 * moins 1 point. Une seule fois par journée. Folie permanente à 0.
 */
export function appliquerPerteSan({ san, journee }, perte) {
  const j = journee || nouvelleJourneeSan(san);
  const sanApres = Math.max(0, san - perte);
  const perteJour = j.perteJour + perte;
  const atteint = perte > 0 && perteJour >= Math.max(1, Math.floor(san / 5));
  const persistante = atteint && !j.persistanteDeclenchee;
  return {
    san: sanApres,
    journee: { ...j, perteJour, persistanteDeclenchee: j.persistanteDeclenchee || atteint },
    jetIntRequis: perte >= 5,
    persistante,
    permanente: sanApres === 0
  };
}

/**
 * Folie passagère : ≥ 5 points perdus d'un coup ET réussite au jet d'INT (l'investigateur comprend ce qu'il a vu).
 * Le guide se contredit (« ratez un jet d'INT » puis « comprendre l'horreur rend fou ») ; on suit le livre de base.
 */
export const foliePassagere = ({ perte, niveauINT }) => perte >= 5 && estReussite(niveauINT);

// ---------------------------------------------------------------------------
// Chance et test redoublé
// ---------------------------------------------------------------------------

/** Types de test pour les interdits. */
export const TYPE_TEST = Object.freeze({
  COMPETENCE: 'competence', CARACTERISTIQUE: 'caracteristique', COMBAT: 'combat', SAN: 'san', CHANCE: 'chance',
  DEGATS: 'degats', PERTE_SAN: 'perte-san', POURSUITE: 'poursuite', OPPOSE: 'oppose'
});

/** Dépense de Chance interdite (guide) : maladresse, SAN, Chance, dégâts ; plus la perte de SAN (livre). */
export const CHANCE_INTERDITE = Object.freeze([TYPE_TEST.SAN, TYPE_TEST.CHANCE, TYPE_TEST.DEGATS, TYPE_TEST.PERTE_SAN]);

/**
 * Peut-on dépenser de la Chance pour réussir ? 1 point par point manquant pour atteindre le seuil visé
 * (`difficulte`, ordinaire par défaut). Interdit sur maladresse, sur les types interdits et, par défaut, sur un test
 * redoublé (Manuel du Gardien p. 87 ; option `chanceSurRedouble`, non utilisée).
 */
export function depenseChance({ jet, valeur, difficulte = 'ordinaire', niveau, chance, typeTest = TYPE_TEST.COMPETENCE,
  redouble = false, chanceSurRedouble = false }) {
  if (niveau === NIVEAU.MALADRESSE) return { autorise: false, raison: 'Impossible après une maladresse.' };
  if (CHANCE_INTERDITE.includes(typeTest)) return { autorise: false, raison: `Chance interdite sur un test de ${typeTest}.` };
  if (redouble && !chanceSurRedouble) return { autorise: false, raison: 'Chance interdite sur un test redoublé.' };
  const seuil = seuilDeDifficulte(valeur, difficulte);
  if (jet <= seuil) return { autorise: false, raison: 'Le test est déjà réussi.' };
  const cout = jet - seuil;
  if (cout > chance) return { autorise: false, raison: `Il faudrait ${cout} points de Chance (${chance} disponibles).`, cout };
  return { autorise: true, cout, nouveauJet: seuil, chanceRestante: chance - cout };
}

/** Test redoublé interdit (guide) : combat, SAN, Chance, poursuite, test opposé ; plus les dégâts et la perte de SAN. */
export const REDOUBLEMENT_INTERDIT = Object.freeze([TYPE_TEST.COMBAT, TYPE_TEST.SAN, TYPE_TEST.CHANCE, TYPE_TEST.POURSUITE,
  TYPE_TEST.OPPOSE, TYPE_TEST.DEGATS, TYPE_TEST.PERTE_SAN]);

/**
 * Peut-on redoubler ? Seulement après un échec (pas une maladresse), une seule fois, hors types interdits, et pas si de
 * la Chance a été dépensée sur ce test.
 */
export function peutRedoubler({ niveau, typeTest = TYPE_TEST.COMPETENCE, dejaRedouble = false, chanceDepensee = false }) {
  if (REDOUBLEMENT_INTERDIT.includes(typeTest)) return { autorise: false, raison: `Redoublement interdit sur un test de ${typeTest}.` };
  if (dejaRedouble) return { autorise: false, raison: 'Un test ne se redouble qu’une fois.' };
  if (chanceDepensee) return { autorise: false, raison: 'De la Chance a été dépensée sur ce test.' };
  if (niveau === NIVEAU.MALADRESSE) return { autorise: false, raison: 'Impossible après une maladresse.' };
  if (niveau !== NIVEAU.ECHEC) return { autorise: false, raison: 'Seul un échec se redouble.' };
  return { autorise: true };
}
