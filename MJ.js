(() => {
  // ==========================================
  // 🚀 VERSION DU LOGICIEL
  const APP_VERSION = "3.3 - Groupes Réserve";
  // ==========================================

  // ============================================================
  // UTILS — Fonctions utilitaires communes
  // ============================================================
  const uid = () => Math.random().toString(36).slice(2, 10);
  const now = () => new Date().toLocaleTimeString();
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const clampInt = (v, def = 0) => Number.isFinite(Number(v)) ? Number(v) : def;
  const on = (el, evt, fn) => { if (el) { el.addEventListener(evt, fn); } };
  function opt(v, t) { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; }

  // Debounce utility - delays execution until after wait ms of no calls
  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function badge(text, cls = '') {
    const el = document.createElement('span');
    el.className = `badge ${cls}`;
    el.textContent = text;
    return el;
  }

  // Dice utils
  const d100 = () => Math.floor(Math.random() * 100) + 1;
  const isDouble = (n) => n <= 99 && n % 11 === 0;
  const SL = (target, roll) => Math.floor((target || 0) / 10) - Math.floor(roll / 10);

  const getReverseRoll = (roll) => {
    const s = roll.toString().padStart(2, '0');
    const revS = s.split('').reverse().join('');
    let val = parseInt(revS); if (val === 0) val = 100; return val;
  };
  const getLocationName = (roll) => {
    if (roll <= 9) return { name: 'Tête', key: 'HEAD' };
    if (roll <= 24) return { name: 'Bras Gauche', key: 'ARM' };
    if (roll <= 44) return { name: 'Bras Droit', key: 'ARM' };
    if (roll <= 79) return { name: 'Corps', key: 'BODY' };
    if (roll <= 89) return { name: 'Jambe Gauche', key: 'LEG' };
    return { name: 'Jambe Droite', key: 'LEG' };
  };
  const getCritEffect = (key, roll) => {
    const table = CRIT_DATA[key]; if (!table) return null;
    return table.find(e => roll <= e.max);
  };

  // ============================================================
  // DATA — Tables statiques (critiques, magie)
  // ============================================================
  const CRIT_DATA = {
    HEAD: [
      { max: 10, name: "Blessure spectaculaire", eff: "+1 Blessure, 1 Hémorragie. Cicatrice (+1 DR Social)." },
      { max: 20, name: "Coupure mineure", eff: "+1 Blessure, 1 Hémorragie." },
      { max: 25, name: "Coup à l’œil", eff: "+1 Blessure, 1 Aveuglé." },
      { max: 30, name: "Frappe à l’oreille", eff: "+1 Blessure, 1 Assourdi." },
      { max: 35, name: "Coup percutant", eff: "+2 Blessures, 1 Sonné." },
      { max: 40, name: "Œil au beurre noir", eff: "+2 Blessures, 2 Aveuglé." },
      { max: 45, name: "Oreille tranchée", eff: "+2 Blessures, 2 Assourdi, 1 Hémorragie." },
      { max: 50, name: "En plein front", eff: "+2 Blessures, 2 Hémorragie, 1 Aveuglé (persistant)." },
      { max: 55, name: "Mâchoire fracturée", eff: "+3 Blessures, 2 Sonné, Fracture (Mineure)." },
      { max: 60, name: "Blessure majeure à l’œil", eff: "+3 Blessures, 1 Hémorragie, 1 Aveuglé (persistant)." },
      { max: 65, name: "Blessure majeure à l’oreille", eff: "+3 Blessures, Perte auditive permanente (-20 tests)." },
      { max: 70, name: "Nez cassé", eff: "+3 Blessures, 2 Hémorragie, Test Résistance ou Sonné." },
      { max: 75, name: "Mâchoire cassée", eff: "+4 Blessures, 3 Sonné, Test Résistance ou Inconscient, Fracture (Majeure)." },
      { max: 80, name: "Commotion cérébrale", eff: "+4 Blessures, 1 Assourdi, 2 Hémorragie, 1d10 Sonné, Exténué (1d10j)." },
      { max: 85, name: "Bouche explosée", eff: "+4 Blessures, 2 Hémorragie, Perte 1d10 dents." },
      { max: 90, name: "Oreille mutilée", eff: "+4 Blessures, 3 Assourdi, 2 Hémorragie, Perte oreille." },
      { max: 93, name: "Œil crevé", eff: "+5 Blessures, 3 Aveuglé, 2 Hémorragie, 1 Sonné, Perte œil." },
      { max: 96, name: "Coup défigurant", eff: "+5 Blessures, 3 Hémorragie, 3 Aveuglé, 2 Sonné, Perte œil et nez." },
      { max: 99, name: "Mâchoire mutilée", eff: "+5 Blessures, 4 Hémorragie, 3 Sonné, Fracture (Majeure), Perte langue." },
      { max: 100, name: "Décapitation", eff: "Mort instantanée." }
    ],
    ARM: [
      { max: 10, name: "Choc au bras", eff: "+1 Blessure, lâchez l’objet." },
      { max: 20, name: "Coupure mineure", eff: "+1 Blessure, 1 Hémorragie." },
      { max: 25, name: "Torsion", eff: "+1 Blessure, Déchirure musculaire (Mineure)." },
      { max: 30, name: "Choc violent", eff: "+2 Blessures, lâchez l’objet, main inutilisable 1d10-BE rounds." },
      { max: 35, name: "Déchirure musculaire", eff: "+2 Blessures, 1 Hémorragie, Déchirure (Mineure)." },
      { max: 40, name: "Main ensanglantée", eff: "+2 Blessures, 1 Hémorragie, Test Dex pour tenir objets." },
      { max: 45, name: "Clef de bras", eff: "+2 Blessures, lâchez l’objet, bras inutilisable 1d10 rounds." },
      { max: 50, name: "Blessure béante", eff: "+3 Blessures, 2 Hémorragie (risque réouverture)." },
      { max: 55, name: "Cassure nette", eff: "+3 Blessures, lâchez l’objet, Fracture (Mineure), Test Résistance ou Sonné." },
      { max: 60, name: "Ligament rompu", eff: "+3 Blessures, lâchez l’objet, Déchirure (Majeure)." },
      { max: 65, name: "Coupure profonde", eff: "+3 Blessures, 2 Hémorragie, 1 Sonné, Déchirure (Mineure), Test Rés. ou Inconscient." },
      { max: 70, name: "Artère endommagée", eff: "+4 Blessures, 4 Hémorragie (risque réouverture)." },
      { max: 75, name: "Coude fracassé", eff: "+4 Blessures, lâchez l’objet, Fracture (Majeure)." },
      { max: 80, name: "Épaule luxée", eff: "+4 Blessures, Test Rés. ou Sonné et À Terre, lâchez objet, bras inutilisable." },
      { max: 85, name: "Doigt sectionné", eff: "+4 Blessures, 1 Hémorragie, Perte d'un doigt." },
      { max: 90, name: "Main ouverte", eff: "+5 Blessures, Perte 1 doigt/round, 2 Hémorragie, 1 Sonné." },
      { max: 93, name: "Biceps déchiqueté", eff: "+5 Blessures, lâchez objet, Déchirure (Majeure), 2 Hémorragie, 1 Sonné." },
      { max: 94, name: "Main mutilée", eff: "+5 Blessures, Perte main, 2 Hémorragie, Test Rés. ou Sonné et À Terre." },
      { max: 99, name: "Tendons coupés", eff: "+5 Blessures, Bras inutilisable, 3 Hémorragie, 1 À Terre, 1 Sonné." },
      { max: 100, name: "Démembrement", eff: "Mort instantanée." }
    ],
    BODY: [
      { max: 10, name: "Égratignure", eff: "+1 Blessure, 1 Hémorragie." },
      { max: 20, name: "Coup au ventre", eff: "+1 Blessure, 1 Sonné. Test Rés. ou vomissement et À Terre." },
      { max: 25, name: "Coup bas", eff: "+1 Blessure, Test Rés. ou 3 États Sonné." },
      { max: 30, name: "Torsion du dos", eff: "+1 Blessure, Déchirure (Mineure)." },
      { max: 35, name: "Souffle coupé", eff: "+2 Blessures, 1 Sonné. Test Rés. ou À Terre. Mvt réduit." },
      { max: 40, name: "Bleus aux côtes", eff: "+2 Blessures, Malus -10 Agilité (1d10 jours)." },
      { max: 45, name: "Clavicule tordue", eff: "+2 Blessures, un bras inutilisable 1d10 rounds." },
      { max: 50, name: "Chairs déchirées", eff: "+2 Blessures, 2 Hémorragie." },
      { max: 55, name: "Côtes fracturées", eff: "+3 Blessures, 1 Sonné, Fracture (Mineure)." },
      { max: 60, name: "Blessure béante", eff: "+3 Blessures, 3 Hémorragie (risque réouverture)." },
      { max: 65, name: "Entaille douloureuse", eff: "+3 Blessures, 2 Hémorragie, 1 Sonné. Test Rés. ou Inconscient." },
      { max: 70, name: "Dégâts artériels", eff: "+3 Blessures, 4 Hémorragie (risque réouverture)." },
      { max: 75, name: "Dos froissé", eff: "+4 Blessures, Déchirure (Majeure)." },
      { max: 80, name: "Hanche fracturée", eff: "+4 Blessures, 1 Sonné, Test Rés. ou À Terre, Fracture (Mineure)." },
      { max: 85, name: "Blessure majeure", eff: "+4 Blessures, 4 Hémorragie (risque réouverture)." },
      { max: 90, name: "Blessure au ventre", eff: "+4 Blessures, 2 Hémorragie, Blessure Purulente." },
      { max: 93, name: "Organe touché", eff: "+5 Blessures, 3 Hémorragie, 1d10 Sonné, Exténué (perm)." },
      { max: 96, name: "Hémorragie interne", eff: "+5 Blessures, Hémorragie interne (difficile à soigner)." },
      { max: 99, name: "Cœur touché", eff: "+5 Blessures, Mort en 1d10 rounds si pas soigné." },
      { max: 100, name: "Éviscération", eff: "Mort instantanée." }
    ],
    LEG: [
      { max: 10, name: "Orteil contusionné", eff: "+1 Blessure, Test Rés. ou -10 Ag (1 tour)." },
      { max: 20, name: "Cheville tordue", eff: "+1 Blessure, -10 Ag (1d10 rounds)." },
      { max: 25, name: "Coupure mineure", eff: "+1 Blessure, 1 Hémorragie." },
      { max: 30, name: "Perte d’équilibre", eff: "+1 Blessure, Test Rés. ou À Terre." },
      { max: 35, name: "Coup à la cuisse", eff: "+2 Blessures, 1 Hémorragie, Test Rés. ou À Terre." },
      { max: 40, name: "Cheville foulée", eff: "+2 Blessures, Déchirure (Mineure)." },
      { max: 45, name: "Genou tordu", eff: "+2 Blessures, -20 Ag (1d10 rounds)." },
      { max: 50, name: "Coupure à l’orteil", eff: "+2 Blessures, 1 Hémorragie, risque perte orteil." },
      { max: 55, name: "Mauvaise coupure", eff: "+3 Blessures, 2 Hémorragie, Test Rés. ou À Terre." },
      { max: 60, name: "Genou tordu (grave)", eff: "+3 Blessures, Déchirure (Majeure)." },
      { max: 65, name: "Jambe charcutée", eff: "+3 Blessures, 2 Hémorragie, 1 À Terre, Fracture (Mineure), risque Sonné." },
      { max: 70, name: "Cuisse lacérée", eff: "+3 Blessures, 3 Hémorragie, Test Rés. ou À Terre." },
      { max: 75, name: "Tendon rompu", eff: "+4 Blessures, À Terre et Sonné, Test Rés. ou Inconscient, Jambe inutilisable." },
      { max: 80, name: "Entaille au tibia", eff: "+4 Blessures, Sonné et À Terre, Déchirure (Maj), Fracture (Maj)." },
      { max: 85, name: "Genou cassé", eff: "+4 Blessures, 1 Sonné, 1 À Terre, Fracture (Majeure)." },
      { max: 90, name: "Genou démis", eff: "+4 Blessures, À Terre, risque Sonné, Mvt réduit." },
      { max: 93, name: "Pied écrasé", eff: "+5 Blessures, Test Rés. ou À Terre et perte orteils, 2 Hémorragie." },
      { max: 96, name: "Pied sectionné", eff: "+5 Blessures, Perte du pied, 3 Hémorragie, 2 Sonné, 1 À Terre." },
      { max: 99, name: "Tendon coupé", eff: "+5 Blessures, 2 Hémorragie, 2 Sonné, 1 À Terre, Perte usage jambe." },
      { max: 100, name: "Bassin fracassé", eff: "Mort instantanée." }
    ]
  };

  const MAGIC_DATA = {
    MINOR: [
      { max: 5, name: "Signe de Sorcière", eff: "La prochaine créature vivante à naître dans un rayon de 1 km mute." },
      { max: 10, name: "Lait caillé", eff: "Tout le lait dans un rayon de 1d100 mètres tourne instantanément." },
      { max: 15, name: "Mildiou", eff: "Les récoltes pourrissent dans un rayon de (Bonus de FM) kilomètres." },
      { max: 20, name: "Cérumen", eff: "Vos oreilles se bouchent. Gagnez 1 État Assourdi jusqu'à nettoyage (Test Guérison)." },
      { max: 25, name: "Lueur occulte", eff: "Vous brillez d'une lueur sinistre (grand bûcher) pendant 1d10 Rounds." },
      { max: 30, name: "Murmures mortels", eff: "Réussissez un Test de FM Accessible (+20) ou gagnez 1 Point de Corruption." },
      { max: 35, name: "Rupture", eff: "Vous saignez du nez, des yeux et des oreilles. Gagnez 1d10 États Hémorragique." },
      { max: 40, name: "Secousse spirituelle", eff: "Gagnez l'État À Terre." },
      { max: 45, name: "Délié", eff: "Toutes vos boucles et lacets se détachent, risquant de faire tomber votre équipement." },
      { max: 50, name: "Tenue indisciplinée", eff: "Vos vêtements vous serrent. Recevez 1 État Enchevêtré (Force de 1d10 x 5)." },
      { max: 55, name: "Malédiction de la sobriété", eff: "Tout l'alcool à 100m s'évente et devient infect." },
      { max: 60, name: "Drain de l'âme", eff: "Gagnez 1 État Exténué pour 1d10 heures." },
      { max: 65, name: "Distraction", eff: "Si engagé, gagnez Surpris. Sinon, vous êtes décontenancé." },
      { max: 70, name: "Visions impies", eff: "Recevez l'État Aveuglé. Test de Calme Intermédiaire (+0) ou gagnez-en un autre." },
      { max: 75, name: "Langue maladroite", eff: "Pénalité de -10 à tous les Tests de Langue pendant 1d10 Rounds." },
      { max: 80, name: "L'horreur !", eff: "Test de Calme Difficile (-20) ou gagnez 1 État Brisé." },
      { max: 85, name: "Malédiction de corruption", eff: "Gagnez 1 Point de Corruption." },
      { max: 90, name: "Double problème", eff: "L'effet du Sort se produit ailleurs dans un rayon de 1d10 kilomètres." },
      { max: 95, name: "Multiplication d'infortune", eff: "Effectuez deux lancers sur cette table (relancez les 91-00)." },
      { max: 100, name: "Chaos en cascade", eff: "Effectuez un lancer sur le Tableau des Incantations Imparfaites Majeures." }
    ],
    MAJOR: [
      { max: 5, name: "Voix fantomatiques", eff: "Murmures envoûtants (FM mètres). Créatures font Calme Accessible (+20) ou 1 Corruption." },
      { max: 10, name: "Regard maudit", eff: "Yeux changent de couleur. 1 État Aveuglé permanent pendant 1d10 heures." },
      { max: 15, name: "Choc aethyrique", eff: "Subissez 1d10 Blessures (ignorant BE/PA). Test Résistance Accessible (+20) ou 1 État Sonné." },
      { max: 20, name: "Marche de la mort", eff: "Les plantes meurent sur votre passage pendant 1d10 heures." },
      { max: 25, name: "Rébellion intestinale", eff: "Vous vous souillez. Gagnez 1 État Exténué jusqu'à ce que vous vous nettoyiez." },
      { max: 30, name: "Feu de l'âme", eff: "Gagnez 1 État Enflammé (flammes impies)." },
      { max: 35, name: "Propos ésotériques", eff: "Vous jacassez de façon inintelligible pendant 1d10 Rounds (incapable d'incanter)." },
      { max: 40, name: "Essaim", eff: "Vous êtes engagé par une nuée (rats, araignées...) qui attaque pendant 1d10 Rounds." },
      { max: 45, name: "Poupée de chiffon", eff: "Projeté à 1d10 mètres en l'air. Subissez 1d10 Blessures à l'atterrissage et l'État À Terre." },
      { max: 50, name: "Membre gelé", eff: "Un membre aléatoire gèle et devient inutile pendant 1d10 heures." },
      { max: 55, name: "Vue assombrie", eff: "Perdez le talent Seconde vue et subissez -20 en Focalisation pendant 1d10 heures." },
      { max: 60, name: "Clairvoyance chaotique", eff: "Gagnez 1d10 Points de Chance bonus. Chaque dépense donne 1 Point de Corruption." },
      { max: 65, name: "Lévitation", eff: "Vous flottez à 1d10 mètres du sol pendant 1d10 minutes." },
      { max: 70, name: "Régurgitation", eff: "Vous vomissez de façon incontrôlable. Gagnez l'État Sonné pour 1d10 Rounds." },
      { max: 75, name: "Secousse du Chaos", eff: "Toutes créatures à 100m: Test Athlétisme Accessible (+20) ou État À Terre." },
      { max: 80, name: "Cœur de traître", eff: "Si vous attaquez/trahissez un allié, regagnez Chance. Si perte destin allié, gagnez +1 Destin." },
      { max: 85, name: "Terrible affaiblissement", eff: "Gagnez 1 Point de Corruption, 1 État À Terre et 1 État Exténué." },
      { max: 90, name: "Puanteur infernale", eff: "Vous gagnez le Trait de Créature Perturbant pour 1d10 heures." },
      { max: 95, name: "Drain de puissance", eff: "Incapable d'utiliser le Talent Magie des Arcanes pendant 1d10 minutes." },
      { max: 100, name: "Contre-réaction aethyrique", eff: "Tout le monde (rayon Bonus FM mètres) subit 1d10 Blessures (ignorant BE/PA) + 1 À Terre." }
    ]
  };

  // ============================================================
  // EVENTBUS — Communication inter-composants
  // ============================================================
  const Bus = { _h: new Map(), on(e, f) { (this._h.get(e) || this._h.set(e, new Set()).get(e)).add(f); }, off(e, f) { this._h.get(e)?.delete(f); }, emit(e, p) { this._h.get(e)?.forEach(fn => fn(p)); } };

  // ============================================================
  // SANITIZERS — Validation des données entrantes
  // ============================================================
  function sanitizeArray(val) {
    if (Array.isArray(val)) return val;
    // Firebase peut stocker les tableaux comme objets {0:a, 1:b} si des éléments ont été supprimés
    if (val && typeof val === 'object') return Object.values(val);
    return [];
  }
  function sanitizeProfile(o) {
    if (!o || typeof o !== 'object' || !o.id || typeof o.id !== 'string') return null;
    return {
      id: String(o.id),
      name: (typeof o.name === 'string' && o.name.trim()) ? o.name.trim() : 'Sans-nom',
      kind: ['PJ', 'Créature'].includes(o.kind) ? o.kind : 'Créature',
      initiative: Number(o.initiative) || 0,
      hp: Number(o.hp) || 0,
      caracs: (o.caracs && typeof o.caracs === 'object') ? o.caracs : {},
      armor: (o.armor && typeof o.armor === 'object') ? o.armor : { head: 0, body: 0, arms: 0, legs: 0 },
      diceLines: sanitizeArray(o.diceLines),
      group: typeof o.group === 'string' ? o.group.trim() : ''
    };
  }
  function sanitizeParticipant(o) {
    const base = sanitizeProfile(o);
    if (!base) return null;
    return {
      ...base,
      profileId: o.profileId || null,
      states: Array.isArray(o.states) ? o.states.filter(s => typeof s === 'string') : [],
      zone: ['active', 'bench'].includes(o.zone) ? o.zone : 'bench',
      color: ['default', 'red', 'green', 'blue', 'purple', 'orange'].includes(o.color) ? o.color : 'default'
    };
  }

  // ============================================================
  // MODELS — Classes de données
  // ============================================================
  class Profile {
    constructor({ id = uid(), name, kind = 'Créature', initiative = 30, hp = 10, caracs = {}, armor = { head: 0, body: 0, arms: 0, legs: 0 }, diceLines = [], group = '' } = {}) {
      this.id = id; this.name = (name || 'Sans-nom').trim(); this.kind = kind;
      this.initiative = Number(initiative) || 0; this.hp = Number(hp) || 0;
      this.caracs = { ...caracs }; this.armor = { ...armor };
      this.diceLines = [...(diceLines || [])];
      this.group = (group || '').trim();
    }
  }
  class Participant {
    constructor({ id = uid(), profileId, name, kind, initiative = 0, hp = 10, states = [], zone = 'bench', color = 'default', armor = { head: 0, body: 0, arms: 0, legs: 0 }, caracs = {} } = {}) {
      this.id = id; this.profileId = profileId || null; this.name = name || '—'; this.kind = kind || 'Créature';
      this.initiative = Number(initiative) || 0; this.hp = Number(hp) || 0;
      this.states = [...states]; this.zone = zone;
      this.color = color;
      this.armor = { ...armor };
      this.caracs = { ...caracs };
    }
  }
  class DiceLine {
    constructor({ id = uid(), participantId = '', attr = 'Custom', base = '', mod = 0, note = '', targetType = 'none', targetValue = '', targetAttr = 'CC', opponentRoll = '' } = {}) {
      Object.assign(this, { id, participantId, attr, base, mod: Number(mod) || 0, note, targetType, targetValue, targetAttr, opponentRoll });
    }
  }

  // ============================================================
  // STORE — Persistance locale et synchronisation Firebase
  // ============================================================
  const KEY = { RESERVE: 'wfrp.reserve.v1', COMBAT: 'wfrp.combat.v1', LOG: 'wfrp.log.v1', DICE: 'wfrp.dice.v1' };
  const Store = (() => {
    // ========== FIREBASE SYNC ==========
    const SYNC = (() => {
      const fb = window.__WFRP_FIREBASE__;
      if (!fb) {
        console.log('⚠️ Firebase non disponible (localStorage uniquement)');
        return null;
      }

      // ✅ Utilise l'UID de l'utilisateur connecté
      const userId = fb.userId;
      const path = `wfrp-sessions/${userId}/current`;
      const dbRef = fb.ref(fb.db, path);

      console.log(`🔥 Sync Firebase activé sur: ${path}`);

      return {
        dbRef,
        set: fb.set,
        onValue: fb.onValue
      };
    })();

    // ========== FIN FIREBASE SYNC ==========
    // 🔥 LISTENER FIREBASE (import automatique)
    if (SYNC) {
      SYNC.onValue(SYNC.dbRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        try {
          applyDataToState(data);
          localStorage.setItem(KEY.RESERVE, JSON.stringify(Array.from(reserve.values())));
          localStorage.setItem(KEY.COMBAT, JSON.stringify({ round: combat.round, turnIndex: combat.turnIndex, order: combat.order, participants: Array.from(combat.participants.values()) }));
          localStorage.setItem(KEY.LOG, JSON.stringify(log));
          localStorage.setItem(KEY.DICE, JSON.stringify(diceLines));
          Bus.emit('reserve');
          Bus.emit('combat');
          Bus.emit('log');
          console.log('🔄 Sync Firebase → Local');
        } catch (e) {
          console.error('❌ Erreur sync Firebase → Local:', e);
        }
      });
    }

    let reserve = new Map();
    let combat = { round: 0, turnIndex: -1, order: [], participants: new Map() };
    let log = [];
    let diceLines = [];

    function applyDataToState(data) {
      const rawReserve = sanitizeArray(data.reserve);
      const validProfiles = rawReserve.map(sanitizeProfile).filter(Boolean);
      if (rawReserve.length !== validProfiles.length)
        console.warn(`[Sync] ${rawReserve.length - validProfiles.length} profil(s) rejeté(s) (schéma invalide)`);
      reserve = new Map(validProfiles.map(o => [o.id, new Profile(o)]));

      const c = data.combat || {};
      combat.round = Number(c.round) || 0;
      combat.turnIndex = c.turnIndex !== undefined ? Number(c.turnIndex) : -1;

      const rawParts = sanitizeArray(c.participants);
      const validParts = rawParts.map(sanitizeParticipant).filter(Boolean);
      combat.participants = new Map(validParts.map(p => [p.id, new Participant(p)]));

      const validIds = new Set(combat.participants.keys());
      combat.order = sanitizeArray(c.order).filter(id => typeof id === 'string' && validIds.has(id));

      log = sanitizeArray(data.log).filter(s => typeof s === 'string');
      diceLines = sanitizeArray(data.diceLines).map(x => new DiceLine(x));
    }

    // Debounced Firebase sync to reduce API calls
    const syncFirebaseDebounced = debounce((payload) => {
      if (SYNC) {
        SYNC.set(SYNC.dbRef, payload).catch(e => console.error('❌ Erreur sync → Firebase:', e));
      }
    }, 300);

    function save() {
      // Immediate localStorage save (never lose data)
      localStorage.setItem(KEY.RESERVE, JSON.stringify(Array.from(reserve.values())));
      const cObj = {
        round: combat.round,
        turnIndex: combat.turnIndex,
        order: combat.order,
        participants: Array.from(combat.participants.values())
      };
      localStorage.setItem(KEY.COMBAT, JSON.stringify(cObj));
      localStorage.setItem(KEY.LOG, JSON.stringify(log));
      localStorage.setItem(KEY.DICE, JSON.stringify(diceLines));

      // 🔥 FIREBASE SYNC (debounced - 300ms)
      const payload = {
        timestamp: new Date().toISOString(),
        reserve: Array.from(reserve.values()),
        combat: cObj,
        log,
        diceLines
      };
      syncFirebaseDebounced(payload);
    }


    function load() {
      try {
        const r = JSON.parse(localStorage.getItem(KEY.RESERVE) || '[]');
        reserve = new Map(r.map(o => [o.id, new Profile(o)]));
        const c = JSON.parse(localStorage.getItem(KEY.COMBAT) || 'null');
        if (c) {
          combat.round = c.round || 0;
          combat.turnIndex = c.turnIndex ?? -1;
          combat.order = Array.isArray(c.order) ? c.order : [];
          combat.participants = new Map((c.participants || []).map(p => [p.id, new Participant(p)]));

          let repairedCount = 0;
          combat.participants.forEach(p => {
            if ((!p.caracs || Object.keys(p.caracs).length === 0) && p.profileId) {
              const prof = reserve.get(p.profileId);
              if (prof && prof.caracs) {
                p.caracs = { ...prof.caracs };
                repairedCount++;
              }
            }
          });
          if (repairedCount > 0) {
            console.log(`[Auto-Repair] ${repairedCount} combattants réparés.`);
            save();
          }
        }
        log = JSON.parse(localStorage.getItem(KEY.LOG) || '[]');
        const d = JSON.parse(localStorage.getItem(KEY.DICE) || '[]');
        diceLines = (Array.isArray(d) ? d : []).map(x => new DiceLine(x));
      } catch (e) { console.warn('Load error', e); }
    }

    function setOrderByInitiative() {
      const arr = Array.from(combat.participants.values());
      arr.sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
      combat.order = arr.map(p => p.id);
    }

    const api = {
      addProfile(p) { reserve.set(p.id, p); save(); Bus.emit('reserve'); },
      updateProfile(id, patch) {
        const p = reserve.get(id); if (!p) return;
        Object.assign(p, patch);
        // Dice lines update is handled within p object
        for (const part of combat.participants.values()) {
          if (part.profileId === id) {
            part.name = p.name; part.kind = p.kind; part.caracs = { ...p.caracs }; part.armor = { ...p.armor };
          }
        }
        save(); Bus.emit('reserve'); Bus.emit('combat');
      },
      removeProfile(id) { reserve.delete(id); save(); Bus.emit('reserve'); },
      duplicateProfile(id) {
        const p = reserve.get(id); if (!p) return;
        let baseName = p.name; const match = p.name.match(/^(.*?)(\s\d+)?$/); if (match && match[2]) baseName = match[1];
        let maxNum = 0;
        for (const other of reserve.values()) {
          if (other.name === baseName) maxNum = Math.max(maxNum, 1);
          else if (other.name.startsWith(baseName + " ")) { const s = other.name.substring(baseName.length + 1); if (!isNaN(s)) maxNum = Math.max(maxNum, parseInt(s)); }
        }
        // DiceLines are copied via Profile constructor copy of ...p properties (and deep array copy in constructor)
        const newProfile = new Profile({ ...p, id: uid(), name: `${baseName} ${maxNum + 1}`, armor: { ...p.armor }, caracs: { ...p.caracs }, diceLines: p.diceLines });
        this.addProfile(newProfile);
      },
      listProfiles() { return Array.from(reserve.values()); },
      getProfile(id) { return reserve.get(id) || null; },

      addParticipant(p) { combat.participants.set(p.id, p); this.rebuildOrder(); save(); Bus.emit('combat'); },
      removeParticipant(id) { combat.participants.delete(id); combat.order = combat.order.filter(x => x !== id); save(); Bus.emit('combat'); },
      updateParticipant(id, patch) {
        const p = combat.participants.get(id);
        if (!p) return;
        Object.assign(p, patch);
        save();
        // Optimization 3: Try targeted update first, fallback to full render
        if ('zone' in patch) {
          // Zone change requires full re-render
          Bus.emit('combat');
        } else {
          // Try targeted update
          Bus.emit('combat:update', { id, patch });
        }
      },

      setOrder(newOrderIds) { combat.order = newOrderIds; save(); },

      listParticipants() { return combat.order.map(id => combat.participants.get(id)).filter(Boolean); },
      listParticipantsRaw() { return Array.from(combat.participants.values()); },

      setRoundTurn(round, turnIndex) { combat.round = round; combat.turnIndex = turnIndex; save(); Bus.emit('combat'); },
      rebuildOrder() { setOrderByInitiative(); },
      getState() { return { reserve, combat, log, diceLines }; },

      addDiceLine(dl) { diceLines.push(new DiceLine(dl)); save(); Bus.emit('combat'); },
      updateDiceLine(id, patch, noRender = false) {
        const i = diceLines.findIndex(x => x.id === id); if (i < 0) return;
        Object.assign(diceLines[i], patch); save();
        if (!noRender) Bus.emit('combat');
      },
      removeDiceLine(id) { diceLines = diceLines.filter(x => x.id !== id); save(); Bus.emit('combat'); },
      duplicateDiceLine(id) { const src = diceLines.find(x => x.id === id); if (!src) return; diceLines.push(new DiceLine({ ...src, id: uid() })); save(); Bus.emit('combat'); },

      importFromReserve(ids) {
        ids.forEach(id => {
          const prof = reserve.get(id); if (!prof) return;
          const p = new Participant({
            profileId: prof.id, name: prof.name, kind: prof.kind,
            initiative: prof.initiative, hp: prof.hp,
            armor: { ...prof.armor }, caracs: { ...prof.caracs }, zone: 'bench'
          });
          this.addParticipant(p);

          // IMPORT DICE LINES
          if (prof.diceLines && Array.isArray(prof.diceLines)) {
            prof.diceLines.forEach(tpl => {
              this.addDiceLine(new DiceLine({
                participantId: p.id,
                base: tpl.base,
                note: tpl.note
              }));
            });
          }
        });
        this.log(`Import: ${ids.length} participant(s)`);
      },
      exportToReserve() {
        let n = 0; combat.participants.forEach(p => { if (!p.profileId) return; const prof = reserve.get(p.profileId); if (!prof) return; prof.hp = p.hp; n++; });
        save(); this.log(`Export → Réserve: ${n} profil(s) mis à jour`); Bus.emit('reserve');
      },

      log(line) { log.unshift(`[${now()}] ${line}`); save(); Bus.emit('log'); },
      clearLog() { log = []; save(); Bus.emit('log'); },
      resetCombat() { combat = { round: 0, turnIndex: -1, order: [], participants: new Map() }; save(); Bus.emit('combat'); },

      getFullJSON() {
        const data = { timestamp: new Date().toISOString(), reserve: Array.from(reserve.values()), combat: { round: combat.round, turnIndex: combat.turnIndex, order: combat.order, participants: Array.from(combat.participants.values()) }, log, diceLines };
        return JSON.stringify(data, null, 2);
      },
      loadFromJSON(jsonStr) {
        try {
          const data = JSON.parse(jsonStr);
          if (!data || !data.reserve || !data.combat) throw new Error('Format invalide');
          applyDataToState(data);
          save(); Bus.emit('reserve'); Bus.emit('combat'); Bus.emit('log'); this.log('📂 Données chargées.'); alert('Chargement réussi !');
        } catch (e) { alert('Erreur : ' + e.message); }
      }
    };
    load();
    if (api.getState().combat.order.length === 0 && api.getState().combat.participants.size > 0) { api.rebuildOrder(); }
    return api;
  })();

  // ============================================================
  // COMBAT ENGINE — Logique de tour et d'initiative
  // ============================================================
  const Combat = (() => {
    function actorAtTurn() { const st = Store.getState().combat; const id = st.order[st.turnIndex]; return id ? st.participants.get(id) : null; }
    function start() { const st = Store.getState().combat; if (st.order.length === 0) return; if (st.round === 0) st.round = 1; if (st.turnIndex === -1) st.turnIndex = 0; Store.log(`Combat démarré. Round ${st.round}. Tour: ${actorAtTurn()?.name ?? '—'}`); Store.setRoundTurn(st.round, st.turnIndex); }
    return { actorAtTurn, start };
  })();

  // ============================================================
  // DOM REFS — Références aux éléments d'interface
  // ============================================================
  const DOM = {
    tabs: qsa('.tab'),
    panels: { reserve: qs('#panel-reserve'), combat: qs('#panel-combat'), rules: qs('#panel-rules') },
    reserve: { list: qs('#reserve-list'), search: qs('#search-reserve'), form: qs('#form-add'), seed: qs('#seed-reserve'), clear: qs('#clear-reserve') },
    combat: {
      initTracker: qs('#init-tracker'),
      zoneActive: qs('#zone-active'), zoneBench: qs('#zone-bench'),
      pillRound: qs('#pill-round'), pillTurn: qs('#pill-turn'),
      btnImport: qs('#btn-import'), btnExport: qs('#btn-export'),
      btnStart: qs('#btn-start'), btnReset: qs('#btn-reset'), btnD100: qs('#btn-d100'),
      log: qs('#log'), btnClearLog: qs('#btn-clear-log'),
      btnSaveFile: qs('#btn-save-file'), btnLoadFile: qs('#btn-load-file'), fileInput: qs('#file-input'),
      results: qs('#dice-prep-results')
    },
    importModal: { dialog: qs('#dlg-import'), list: qs('#import-list'), confirm: qs('#confirm-import') },
    tplActor: qs('#tpl-actor'),
    btnVersion: qs('#btn-version')
  };

  if (DOM.btnVersion) {
    DOM.btnVersion.textContent = `Version: ${APP_VERSION}`;
    DOM.btnVersion.addEventListener('click', () => alert(`Version chargée :\n${APP_VERSION}\n\nSi ce n'est pas la bonne, essayez CTRL+F5 !`));
  }

  // ---------- Logic ----------
  DOM.tabs.forEach(t => t.addEventListener('click', () => {
    DOM.tabs.forEach(x => x.classList.remove('is-active')); t.classList.add('is-active');
    Object.values(DOM.panels).forEach(p => p.classList.remove('is-active'));
    const targetPanel = DOM.panels[t.dataset.tab];
    if (targetPanel) targetPanel.classList.add('is-active');
  }));

  function renderReserve() {
    const term = (DOM.reserve.search.value || '').toLowerCase();
    const all = Store.listProfiles();
    const filtered = all.filter(p =>
      p.name.toLowerCase().includes(term) || (p.group || '').toLowerCase().includes(term)
    );

    // Mise à jour de l'autocomplétion du champ groupe
    const datalist = qs('#group-suggestions');
    if (datalist) {
      const groups = [...new Set(all.map(p => p.group).filter(Boolean))].sort();
      datalist.replaceChildren(...groups.map(g => { const o = document.createElement('option'); o.value = g; return o; }));
    }

    const groups = new Map();
    const ungrouped = [];
    filtered.forEach(p => {
      if (p.group) {
        if (!groups.has(p.group)) groups.set(p.group, []);
        groups.get(p.group).push(p);
      } else {
        ungrouped.push(p);
      }
    });

    const children = [];
    [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, profiles]) => {
      children.push(renderReserveGroup(name, profiles));
    });
    if (ungrouped.length > 0) children.push(renderReserveGroup('Sans groupe', ungrouped));
    if (children.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'muted'; empty.style.padding = '10px';
      empty.textContent = 'Aucun profil.';
      children.push(empty);
    }
    DOM.reserve.list.replaceChildren(...children);
  }

  function renderReserveGroup(groupName, profiles) {
    const details = document.createElement('details');
    details.open = true;
    details.className = 'reserve-group';
    const summary = document.createElement('summary');
    summary.innerHTML = `${escapeHtml(groupName)} <span class="muted">(${profiles.length})</span>`;
    const body = document.createElement('div');
    body.className = 'reserve-group-body';
    body.append(...profiles.slice().sort((a, b) => a.name.localeCompare(b.name)).map(renderReserveItem));
    details.append(summary, body);
    return details;
  }

  function renderReserveItem(p) {
    const div = document.createElement('div'); div.className = 'item';
    const left = document.createElement('div');
    const right = document.createElement('div'); right.className = 'row';
    left.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong> <span class="muted">(${p.kind})</span></div><div class="muted" style="font-size:0.85em;">Init ${p.initiative} • PV ${p.hp}</div>`;
    const btnEdit = document.createElement('button'); btnEdit.textContent = 'Éditer'; btnEdit.classList.add('ghost'); btnEdit.addEventListener('click', () => loadProfileIntoForm(p));
    const btnDup = document.createElement('button'); btnDup.textContent = 'Dupliq.'; btnDup.classList.add('ghost'); btnDup.addEventListener('click', () => Store.duplicateProfile(p.id));
    const btnDel = document.createElement('button'); btnDel.textContent = 'Suppr'; btnDel.classList.add('danger', 'ghost'); btnDel.addEventListener('click', () => { Store.removeProfile(p.id); Store.log(`Réserve: supprimé ${p.name}`); });
    right.append(btnEdit, btnDup, btnDel); div.append(left, right); return div;
  }

  // --- Reserve Form (Updated v2.7 Fix) ---
  const formTitle = qs('#form-title'); const btnSubmit = qs('#btn-submit-form'); const btnCancel = qs('#btn-cancel-edit');

  function ensureDiceSectionExists() {
    if (qs('#form-dice-lines')) return;
    const sect = document.createElement('div');
    sect.id = 'form-dice-lines'; sect.style.margin = '10px 0'; sect.style.padding = '10px'; sect.style.background = 'rgba(0,0,0,0.05)'; sect.style.borderRadius = '6px';
    sect.innerHTML = `<strong>Jets pré-configurés (Attaques, etc.)</strong><div id="form-dice-list" style="margin-top:6px;"></div><button type="button" class="ghost small" style="margin-top:6px;" id="btn-add-tpl">+ Ajouter un jet</button>`;
    const actions = DOM.reserve.form.querySelector('.actions');
    DOM.reserve.form.insertBefore(sect, actions);
    qs('#btn-add-tpl').addEventListener('click', () => addProfileDiceRow());
  }
  function addProfileDiceRow({ base = '', note = '' } = {}) {
    const row = document.createElement('div'); row.className = 'row'; row.style.marginBottom = '6px';
    row.innerHTML = `<input type="number" placeholder="Score" value="${base}" class="pf-dice-base" style="width:70px;"><input type="text" placeholder="Label (ex: Hache)" value="${escapeHtml(note)}" class="pf-dice-note" style="flex:1;"><button type="button" class="danger tiny btn-remove-dice">×</button>`;

    // Ajoute juste après
    const btnRemoveDice = row.querySelector('.btn-remove-dice');
    btnRemoveDice.addEventListener('click', () => row.remove());
    qs('#form-dice-list').appendChild(row);
  }

  function loadProfileIntoForm(p) {
    const f = DOM.reserve.form;
    f.querySelector('[name=id]').value = p.id; f.querySelector('[name=name]').value = p.name;
    f.querySelector('[name=kind]').value = p.kind; f.querySelector('[name=initiative]').value = p.initiative; f.querySelector('[name=hp]').value = p.hp;
    f.querySelector('[name=group]').value = p.group || '';
    f.querySelector('[name=armor_head]').value = p.armor?.head || 0; f.querySelector('[name=armor_body]').value = p.armor?.body || 0;
    f.querySelector('[name=armor_arms]').value = p.armor?.arms || 0; f.querySelector('[name=armor_legs]').value = p.armor?.legs || 0;
    const inputE = f.querySelector('[name=E]'); if (inputE) inputE.value = p.caracs?.E || 0;
    ['CC', 'CT', 'F', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'].forEach(k => { f.querySelector(`[name=${k}]`).value = p.caracs[k] || ''; });

    // Dice templates
    ensureDiceSectionExists();
    qs('#form-dice-list').innerHTML = '';
    (p.diceLines || []).forEach(dl => addProfileDiceRow(dl));

    formTitle.textContent = "Modifier le profil"; btnSubmit.textContent = "Modifier"; btnCancel.style.display = 'inline-block';
    f.scrollIntoView({ behavior: "smooth" });
  }

  function resetForm() {
    DOM.reserve.form.reset();
    DOM.reserve.form.querySelector('[name=id]').value = '';
    DOM.reserve.form.querySelector('[name=kind]').value = 'Créature';
    DOM.reserve.form.querySelector('[name=group]').value = '';
    if (qs('#form-dice-list')) qs('#form-dice-list').innerHTML = '';
    formTitle.textContent = "Nouveau profil"; btnSubmit.textContent = "Ajouter"; btnCancel.style.display = 'none';
  }
  on(btnCancel, 'click', resetForm);

  on(DOM.reserve.form, 'submit', (e) => {
    e.preventDefault(); const fd = new FormData(DOM.reserve.form);
    const caracs = {};
    caracs['E'] = Number(fd.get('E') || 0);
    ['CC', 'CT', 'F', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'].forEach(k => { const raw = fd.get(k); if (raw !== null && raw !== '') { const v = Number(raw); if (Number.isFinite(v)) caracs[k] = v; } });
    const armor = { head: Number(fd.get('armor_head') || 0), body: Number(fd.get('armor_body') || 0), arms: Number(fd.get('armor_arms') || 0), legs: Number(fd.get('armor_legs') || 0) };

    // Dice templates gathering
    const diceLines = [];
    if (qs('#form-dice-list')) {
      qsa('#form-dice-list .row').forEach(row => {
        const b = row.querySelector('.pf-dice-base').value; const n = row.querySelector('.pf-dice-note').value;
        if (b) diceLines.push({ base: parseInt(b), note: n });
      });
    }

    const id = fd.get('id');
    const data = { name: fd.get('name'), kind: fd.get('kind'), initiative: Number(fd.get('initiative') || 0), hp: Number(fd.get('hp') || 0), group: (fd.get('group') || '').trim(), caracs, armor, diceLines };
    if (id) { Store.updateProfile(id, data); Store.log(`Réserve: modifié ${data.name}`); } else { Store.addProfile(new Profile(data)); Store.log(`Réserve: ajouté ${data.name}`); }
    resetForm();
  });

  on(DOM.reserve.seed, 'click', () => {
    [new Profile({ name: 'Renaut de Volargent', kind: 'PJ', initiative: 41, hp: 14, group: 'PJs', caracs: { CC: 52, Ag: 41, E: 35 }, armor: { head: 2, body: 2, arms: 0, legs: 0 } }),
    new Profile({ name: 'Saskia la Noire', kind: 'PJ', initiative: 52, hp: 12, group: 'PJs', caracs: { CC: 45, Ag: 52, E: 40 } }),
    new Profile({ name: 'Gobelins (2)', kind: 'Créature', initiative: 28, hp: 9, group: 'Gobelins', caracs: { CC: 35, E: 30 }, diceLines: [{ base: 35, note: "Lance" }, { base: 30, note: "Esquive" }] }),
    new Profile({ name: 'Chien de guerre', kind: 'Créature', initiative: 36, hp: 10, group: 'Gobelins', caracs: { CC: 40, E: 30 }, diceLines: [{ base: 40, note: "Morsure" }] })
    ].forEach(Store.addProfile); Store.log('Seed Réserve: 4 profils');
  });
  on(DOM.reserve.clear, 'click', () => { if (confirm('Vider toute la Réserve ?')) { localStorage.removeItem(KEY.RESERVE); location.reload(); } });
  on(DOM.reserve.search, 'input', renderReserve);

  // --- Combat Rendering ---
  function renderCombat() {
    const { combat } = Store.getState();
    if (DOM.combat.pillRound) DOM.combat.pillRound.textContent = `Round: ${combat.round}`;
    if (DOM.combat.pillTurn) DOM.combat.pillTurn.textContent = `Tour: ${Combat.actorAtTurn()?.name ?? '–'}`;

    DOM.combat.initTracker.innerHTML = '';
    let activeParticipants = Store.listParticipants().filter(p => p.zone === 'active');
    activeParticipants = [...activeParticipants].sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));

    if (activeParticipants.length === 0) {
      DOM.combat.initTracker.innerHTML = '<span class="muted">Aucun combattant actif...</span>';
    } else {
      activeParticipants.forEach(p => {
        const el = document.createElement('div');
        el.className = 'init-token';
        if (p.color && p.color !== 'default') el.classList.add('color-' + p.color);
        if (Combat.actorAtTurn()?.id === p.id) el.classList.add('current');
        el.innerHTML = `<strong>${escapeHtml(p.name)}</strong><small>${p.initiative}</small>`;
        DOM.combat.initTracker.appendChild(el);
      });
    }

    DOM.combat.zoneActive.innerHTML = '';
    DOM.combat.zoneBench.innerHTML = '';

    let activeCount = 0;

    Store.listParticipants().forEach(p => {
      try {
        const card = renderParticipantCard(p);
        if (p.zone === 'active') { DOM.combat.zoneActive.appendChild(card); activeCount++; }
        else DOM.combat.zoneBench.appendChild(card);
      } catch (err) { console.error("Erreur carte:", p.name, err); }
    });

    if (activeCount === 0) DOM.combat.zoneActive.innerHTML = '<div class="placeholder">Glissez les combattants actifs ici...</div>';
  }

  // --- TARGETED DOM UPDATE (Optimization 3) ---
  function updateCardUI(id, changes) {
    const card = document.querySelector(`.actor-card[data-id="${id}"]`);
    if (!card) return false; // Card not found, need full render

    if ('hp' in changes) {
      const hpBadge = card.querySelector('.hp-badge');
      if (hpBadge) hpBadge.textContent = `PV ${changes.hp}`;
    }
    if ('initiative' in changes) {
      const initBadge = card.querySelector('.init-badge');
      if (initBadge) initBadge.textContent = `Init ${changes.initiative}`;
    }
    if ('states' in changes) {
      const statesDiv = card.querySelector('.states');
      if (statesDiv) {
        statesDiv.innerHTML = '';
        changes.states.forEach(s => statesDiv.append(badge(s, 'warn')));
      }
    }
    if ('color' in changes) {
      card.className = card.className.replace(/\bcolor-\w+/g, '').trim();
      card.classList.add('actor-card');
      if (changes.color && changes.color !== 'default') {
        card.classList.add('color-' + changes.color);
      }
    }
    return true;
  }

  function renderParticipantCard(p) {
    const div = DOM.tplActor.content.cloneNode(true).firstElementChild;
    div.dataset.id = p.id;
    if (Combat.actorAtTurn()?.id === p.id) div.classList.add('turn');

    if (p.color && p.color !== 'default') div.classList.add('color-' + p.color);

    div.querySelector('.name').textContent = p.name;
    div.querySelector('.init-badge').textContent = `Init ${p.initiative}`;
    div.querySelector('.hp-badge').textContent = `PV ${p.hp}`;

    const statesDiv = div.querySelector('.states');
    p.states.forEach(s => statesDiv.append(badge(s, 'warn')));

    const armDiv = div.querySelector('.actor-armor');
    const BE = Math.floor((p.caracs?.E || 0) / 10);
    let armText = `<span style="font-weight:bold; color:#5a1d1d;">🛡️ BE ${BE}</span>`;
    if (p.armor && (p.armor.head || p.armor.body || p.armor.arms || p.armor.legs)) {
      armText += ` | T${p.armor.head} C${p.armor.body} B${p.armor.arms} J${p.armor.legs}`;
    }
    armDiv.innerHTML = armText;

    // Dice lines (still needs individual rendering for inputs)
    const diceContainer = div.querySelector('.dice-list');
    const myDice = Store.getState().diceLines.filter(dl => dl.participantId === p.id);
    myDice.forEach(dl => { const lineEl = renderMiniDiceLine(dl, p); diceContainer.appendChild(lineEl); });

    // Drag events (must stay on element)
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move';
      div.classList.add('dragging'); setTimeout(() => div.style.opacity = '0.5', 0);
    });
    div.addEventListener('dragend', () => { div.classList.remove('dragging'); div.style.opacity = '1'; });

    return div;
  }

  // --- EVENT DELEGATION (Optimization 1) ---
  // Single handler for all card button clicks - prevents memory leaks
  function handleZoneClick(e) {
    const card = e.target.closest('.actor-card');
    if (!card) return;

    const id = card.dataset.id;
    const p = getP(id);
    if (!p) return;

    // Prevent event bubbling for interactive elements
    if (e.target.matches('input, select, button')) {
      e.stopPropagation();
    }

    // HP buttons
    if (e.target.matches('.btn-hp-minus')) {
      e.preventDefault();
      setHP(id, p.hp - 1);
      return;
    }
    if (e.target.matches('.btn-hp-plus')) {
      e.preventDefault();
      setHP(id, p.hp + 1);
      return;
    }

    // State toggle (Blessé)
    if (e.target.matches('.btn-state')) {
      e.preventDefault();
      toggleState(id, 'Blessé');
      return;
    }

    // Remove participant
    if (e.target.matches('.btn-remove')) {
      e.preventDefault();
      Store.removeParticipant(id);
      Store.log(`Combat: retiré ${p.name}`);
      return;
    }

    // Color button
    if (e.target.matches('.btn-color')) {
      e.preventDefault();
      const palette = card.querySelector('.color-palette');
      if (palette) palette.classList.toggle('hidden');
      return;
    }

    // Color swatch selection
    if (e.target.matches('.color-swatch')) {
      e.preventDefault();
      const c = e.target.dataset.c;
      Store.updateParticipant(id, { color: c });
      const palette = card.querySelector('.color-palette');
      if (palette) palette.classList.add('hidden');
      return;
    }

    // Initiative badge click
    if (e.target.matches('.init-badge')) {
      const v = prompt('Nouvelle Initiative ?', p.initiative);
      if (v !== null && !isNaN(v)) Store.updateParticipant(id, { initiative: Number(v) });
      return;
    }

    // Add dice line
    if (e.target.matches('.btn-add-dice')) {
      e.preventDefault();
      Store.addDiceLine(new DiceLine({ participantId: id }));
      return;
    }

    // Dice line roll button
    if (e.target.matches('.action-btn:not(.danger)') && e.target.textContent === '🎲') {
      const diceRow = e.target.closest('.mini-dice-line');
      if (diceRow) {
        const diceId = diceRow.dataset.diceId;
        if (diceId) runDiceLine(diceId);
      }
      return;
    }

    // Dice line delete button
    if (e.target.matches('.action-btn.danger') && e.target.textContent === '×') {
      const diceRow = e.target.closest('.mini-dice-line');
      if (diceRow) {
        const diceId = diceRow.dataset.diceId;
        if (diceId) Store.removeDiceLine(diceId);
      }
      return;
    }
  }

  // Handle mouseleave for color palette hiding
  function handleZoneMouseOver(e) {
    const card = e.target.closest('.actor-card');
    if (!card) {
      // Hide all palettes when leaving cards
      document.querySelectorAll('.color-palette:not(.hidden)').forEach(p => p.classList.add('hidden'));
    }
  }

  // --- NEW SIMPLIFIED DICE LINE RENDER ---
  function renderMiniDiceLine(dl, p) {
    const row = document.createElement('div');
    row.className = 'mini-dice-line';
    row.dataset.diceId = dl.id; // For event delegation

    // 1. Valeur (Score de compétence)
    const inValue = document.createElement('input');
    inValue.type = 'number';
    inValue.value = dl.base || '';
    inValue.placeholder = "Score";
    inValue.title = "Compétence Totale";
    inValue.style.width = '60px';
    inValue.addEventListener('input', (e) => Store.updateDiceLine(dl.id, { base: e.target.value }, true));
    inValue.addEventListener('click', (e) => e.stopPropagation());

    // 2. Note (Label)
    const inNote = document.createElement('input');
    inNote.type = 'text';
    inNote.value = dl.note || '';
    inNote.placeholder = "Note (ex: Épée)";
    inNote.className = 'note-input';
    inNote.title = dl.note || "Note";
    inNote.addEventListener('input', (e) => { Store.updateDiceLine(dl.id, { note: e.target.value }, true); e.target.title = e.target.value; });
    inNote.addEventListener('click', (e) => e.stopPropagation());

    // 3. Bouton Lancer (click handled by delegation)
    const btnRoll = document.createElement('button');
    btnRoll.textContent = '🎲';
    btnRoll.className = 'action-btn';
    btnRoll.title = "Lancer";

    // 4. Bouton Supprimer (click handled by delegation)
    const btnDel = document.createElement('button');
    btnDel.textContent = '×';
    btnDel.className = 'action-btn danger';
    btnDel.title = "Supprimer ligne";

    row.append(inValue, inNote, btnRoll, btnDel);
    return row;
  }

  function importRow(p) {
    const label = document.createElement('label');
    label.className = 'import-row row';
    label.innerHTML = `<input type="checkbox" value="${p.id}"> <strong>${escapeHtml(p.name)}</strong> <span class="muted" style="margin-left:auto;">${p.kind} • Init ${p.initiative} • PV ${p.hp}</span>`;
    return label;
  }

  function renderImportModal() {
    const term = (qs('#import-filter')?.value || '').toLowerCase();
    const all = Store.listProfiles();
    const filtered = all.filter(p =>
      p.name.toLowerCase().includes(term) || (p.group || '').toLowerCase().includes(term)
    );

    const groups = new Map();
    const ungrouped = [];
    filtered.forEach(p => {
      if (p.group) {
        if (!groups.has(p.group)) groups.set(p.group, []);
        groups.get(p.group).push(p);
      } else {
        ungrouped.push(p);
      }
    });

    const children = [];
    [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, profiles]) => {
      children.push(renderImportGroup(name, profiles, true));
    });
    if (ungrouped.length > 0) children.push(renderImportGroup('Sans groupe', ungrouped, false));
    if (children.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'muted'; empty.style.padding = '8px';
      empty.textContent = 'Aucun profil trouvé.';
      children.push(empty);
    }
    DOM.importModal.list.replaceChildren(...children);
  }

  function renderImportGroup(groupName, profiles, collapsed) {
    const details = document.createElement('details');
    details.className = 'import-group';
    if (!collapsed) details.open = true;

    const summary = document.createElement('summary');
    summary.className = 'import-group-summary row';

    const titleSpan = document.createElement('span');
    titleSpan.innerHTML = `${escapeHtml(groupName)} <span class="muted">(${profiles.length})</span>`;

    const spacer = document.createElement('div'); spacer.className = 'spacer';

    const btnAll = document.createElement('button');
    btnAll.type = 'button'; btnAll.className = 'ghost small';
    btnAll.textContent = 'Tout';
    btnAll.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const cbs = [...body.querySelectorAll('input[type=checkbox]')];
      const allChecked = cbs.every(cb => cb.checked);
      cbs.forEach(cb => cb.checked = !allChecked);
    });

    summary.append(titleSpan, spacer, btnAll);

    const body = document.createElement('div');
    body.className = 'import-group-body';
    body.append(...profiles.slice().sort((a, b) => a.name.localeCompare(b.name)).map(importRow));

    details.append(summary, body);
    return details;
  }

  // Drag & Drop
  function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; this.classList.add('drag-over'); }
  function handleDragLeave(e) { this.classList.remove('drag-over'); }
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.actor-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  function handleDrop(e) {
    e.preventDefault(); this.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain'); if (!id) return;
    const container = this; const targetZone = container.dataset.zone;
    const afterElement = getDragAfterElement(container, e.clientY);
    Store.updateParticipant(id, { zone: targetZone });
    const activeIds = [...DOM.combat.zoneActive.querySelectorAll('.actor-card')].map(el => el.dataset.id).filter(x => x !== id);
    const benchIds = [...DOM.combat.zoneBench.querySelectorAll('.actor-card')].map(el => el.dataset.id).filter(x => x !== id);
    if (targetZone === 'active') { if (afterElement) { const idx = activeIds.indexOf(afterElement.dataset.id); activeIds.splice(idx, 0, id); } else { activeIds.push(id); } }
    else { if (afterElement) { const idx = benchIds.indexOf(afterElement.dataset.id); benchIds.splice(idx, 0, id); } else { benchIds.push(id); } }
    const newGlobalOrder = [...activeIds, ...benchIds];
    Store.setOrder(newGlobalOrder);
  }
  [DOM.combat.zoneActive, DOM.combat.zoneBench].forEach(zone => {
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('dragleave', handleDragLeave);
    zone.addEventListener('drop', handleDrop);
    // Event delegation for all card button clicks (Optimization 1)
    zone.addEventListener('click', handleZoneClick);
    zone.addEventListener('mouseleave', handleZoneMouseOver);
  });

  function setHP(id, val) { const p = getP(id); if (!p) return; Store.updateParticipant(id, { hp: val }); }
  function toggleState(id, label) { const p = getP(id); if (!p) return; const has = p.states.includes(label); const ns = has ? p.states.filter(x => x !== label) : [...p.states, label]; Store.updateParticipant(id, { states: ns }); }
  function getP(id) { return Store.getState().combat.participants.get(id); }

  on(DOM.combat.btnImport, 'click', () => { const fi = qs('#import-filter'); if (fi) fi.value = ''; renderImportModal(); DOM.importModal.dialog.showModal(); });
  on(qs('#import-filter'), 'input', renderImportModal);
  on(DOM.importModal.confirm, 'click', (e) => { e.preventDefault(); const ids = Array.from(DOM.importModal.list.querySelectorAll('input[type=checkbox]:checked')).map(ch => ch.value); Store.importFromReserve(ids); DOM.importModal.dialog.close(); });
  on(DOM.combat.btnExport, 'click', () => { if (confirm('Appliquer PV aux profils correspondants ?')) Store.exportToReserve(); });
  on(DOM.combat.btnSaveFile, 'click', () => { const json = Store.getFullJSON(); const blob = new Blob([json], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `wfrp-save-${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); });
  on(DOM.combat.btnLoadFile, 'click', () => { if (DOM.combat.fileInput) DOM.combat.fileInput.click(); });
  on(DOM.combat.fileInput, 'change', (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => Store.loadFromJSON(ev.target.result); reader.readAsText(file); e.target.value = ''; });
  on(DOM.combat.btnStart, 'click', () => Combat.start());
  on(DOM.combat.btnReset, 'click', () => { if (confirm('Effacer les résultats de dés affichés ?')) DOM.combat.results.replaceChildren(); });
  on(DOM.combat.btnD100, 'click', () => { const roll = d100(); Store.log(`🎲 Jet de d100 → ${roll}`); const res = document.createElement('div'); res.className = 'dice-result'; res.innerHTML = `<span class="dice-rollvalue">1d100 = ${roll}</span><span class="badge">Jet simple</span>`; DOM.combat.results.prepend(res); });
  Bus.on('log', () => { const arr = Store.getState().log; const frag = document.createDocumentFragment(); arr.forEach(line => { const div = document.createElement('div'); div.className = 'entry'; div.textContent = line; frag.append(div); }); DOM.combat.log.replaceChildren(frag); });

  // --- NEW SIMPLIFIED RUN LOGIC ---
  function runDiceLine(id) {
    const st = Store.getState();
    const dl = st.diceLines.find(x => x.id === id); if (!dl) return;
    const p = st.combat.participants.get(dl.participantId);

    // 1. Récupération de la Valeur (Base) - PLUS D'AVANTAGE ICI
    const target = parseInt(dl.base) || 0;

    // 2. Le Jet
    const roll = d100();
    const success = roll <= target;
    const sl = SL(target, roll);
    const dbl = isDouble(roll);
    const crit = dbl ? (success ? 'Critique' : 'Maladresse') : null;

    let extraInfo = "";
    let critInfo = "";

    if (success) {
      const revRoll = getReverseRoll(roll); const loc = getLocationName(revRoll);
      extraInfo += ` | Touche : ${loc.name} (${revRoll})`;

      if (crit === 'Critique') {
        const critLocRoll = d100(); const critLoc = getLocationName(critLocRoll);
        const critEffectRoll = d100(); const effectData = getCritEffect(critLoc.key, critEffectRoll);
        critInfo = `<div style="width:100%; margin-top:4px; font-size:0.9em; border-top:1px dashed #5a1d1d; padding-top:4px;"><strong>⚠️ CRITIQUE !</strong> (Loc: ${critLocRoll} ${critLoc.name} / Effet: ${critEffectRoll})<br><span style="color:#b33a3a;">${effectData ? effectData.name : 'Inconnu'}</span> : ${effectData ? effectData.eff : ''}</div>`;
      }
    }

    // 3. Construction du Résultat HTML
    const res = document.createElement('div');
    res.className = 'dice-result';

    let resHTML = `<span class="dice-rollvalue">1d100 = ${roll}</span>`;

    // Affichage Réussite / Echec + SL
    resHTML += `<span class="${success ? 'result-good' : 'result-bad'}">${success ? 'Réussite' : 'Échec'}</span>`;
    resHTML += `<span class="${sl >= 0 ? 'result-good' : 'result-bad'}">SL ${sl >= 0 ? '+' : ''}${sl}</span>`;

    // Badges d'infos
    resHTML += `<span class="badge">${escapeHtml(p?.name || '?')}</span>`;

    // Note perso
    if (dl.note) resHTML += `<span class="badge warn">${escapeHtml(dl.note)}</span>`;

    // Détail du calcul (Score final utilisé)
    resHTML += `<span class="badge" title="Base ${target}">Score ${target}</span>`;

    // Critique
    if (crit) resHTML += `<span class="badge ${success ? 'good' : 'bad'}">${crit}</span>`;

    // Info Touche
    if (extraInfo) resHTML += `<span class="badge" style="background:#e3f6fd; color:#333;">${extraInfo}</span>`;

    // Info Critique Textuelle
    if (critInfo) resHTML += critInfo;

    res.innerHTML = resHTML;
    DOM.combat.results.prepend(res);
    Store.log(`🎲 ${p?.name} (Roll ${roll} vs ${target}) SL${sl} ${dl.note ? '[' + dl.note + ']' : ''}`);
  }

  // --- NEW RENDER REF TABLES (AUTO) ---
  function renderReferenceTables() {
    if (qs('#table-head-crit')) {
      const makeCritTable = (data) => { let html = `<table class="wfrp-table"><thead><tr><th>D100</th><th>Nom</th><th>Effet</th></tr></thead><tbody>`; let prevMax = 0; data.forEach(row => { html += `<tr><td>${prevMax + 1}–${row.max}</td><td><strong>${row.name}</strong></td><td>${row.eff}</td></tr>`; prevMax = row.max; }); html += `</tbody></table>`; return html; };
      qs('#table-head-crit').innerHTML = makeCritTable(CRIT_DATA.HEAD); qs('#table-arm-crit').innerHTML = makeCritTable(CRIT_DATA.ARM); qs('#table-body-crit').innerHTML = makeCritTable(CRIT_DATA.BODY); qs('#table-leg-crit').innerHTML = makeCritTable(CRIT_DATA.LEG);
    }
    if (qs('#table-magic-minor')) {
      const makeMagicTable = (data) => { let html = `<table class="wfrp-table"><thead><tr><th>D100</th><th>Nom</th><th>Effet</th></tr></thead><tbody>`; let prevMax = 0; data.forEach(row => { html += `<tr><td>${prevMax + 1}–${row.max}</td><td><strong>${row.name}</strong></td><td>${row.eff}</td></tr>`; prevMax = row.max; }); html += `</tbody></table>`; return html; };
      qs('#table-magic-minor').innerHTML = makeMagicTable(MAGIC_DATA.MINOR); qs('#table-magic-major').innerHTML = makeMagicTable(MAGIC_DATA.MAJOR);
    }
  }

  Bus.on('reserve', renderReserve);
  Bus.on('combat', renderCombat);
  // Optimization 3: Targeted update listener - avoids full re-render when possible
  Bus.on('combat:update', ({ id, patch }) => {
    if (!updateCardUI(id, patch)) {
      // Card not found, fallback to full render
      renderCombat();
    }
  });
  renderReserve(); renderCombat(); renderReferenceTables();

  ensureDiceSectionExists();

  // INIT DEFAULTS (v2.6 Fix)
  resetForm();
})();
