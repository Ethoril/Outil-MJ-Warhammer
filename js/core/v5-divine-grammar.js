/** Grammaire partagée des contrats divins : le générateur, le moteur et les tests lisent les mêmes listes. */

// Cultes de supplément (hors les dix cultes du livre de base) acceptés pour les miracles de module.
export const supplementCults = Object.freeze(['Handrich', 'Solkan', 'Mathlann']);

// `touch` : portée Contact (valeur 0, fait withinTouch exigé, jamais étendue).
export const paramKinds = new Set(['fixed', 'characteristic', 'characteristic-bonus', 'self', 'area', 'count', 'special', 'instant', 'touch']);
export const paramUnits = new Set(['rounds', 'minutes', 'hours', 'days', 'yards', 'miles', 'targets', 'allies']);
// Unités de durée convertibles en secondes de campagne (échéance `campaign-time`).
export const calendarDurationUnits = new Set(['minutes', 'hours', 'days']);

// Types d'effet connus du moteur ; v5-divine-effect-handlers.js doit fournir un gestionnaire pour chacun.
// Socle : types de v5-divine-effect-handlers.js. Chaque module d'effet déclare les siens sur SA ligne ; les lignes sont séparées
// par un commentaire pour que deux tâches qui ajoutent des types en parallèle ne produisent pas de conflit de fusion.
export const effectTypes = new Set(['characteristic-modifier', 'armor-bonus', 'condition', 'healing', 'wound-heal']);
// Traits, États spéciaux, actions, Talents, bonus d'arme (v5-divine-effects-gear.js).
for (const type of ['grant-trait', 'special-state', 'grant-actions', 'grant-talent', 'weapon-bonus', 'grant-immunity']) effectTypes.add(type);
// Dégâts directs (v5-divine-effects-damage.js).
for (const type of ['direct-damage', 'ordinary-damage']) effectTypes.add(type);
// États, verrous et Chance temporaire (v5-divine-effects-conditions.js).
for (const type of ['remove-condition', 'expiry-condition', 'temporary-fortune']) effectTypes.add(type);
// Tests de compétence (v5-divine-effects-tests.js).
for (const type of ['test-modifier']) effectTypes.add(type);
// Invocations (v5-divine-effects-summon.js).
for (const type of ['summon-creature']) effectTypes.add(type);

// Source d'une force d'État : `{kind:'characteristic-bonus'|'characteristic', characteristic}` ou `{kind:'success-levels'}`.
export const strengthSources = new Set(['characteristic-bonus', 'characteristic', 'success-levels']);
// Champs d'effet que `perSuccessLevels: {every, add, field}` peut faire croître.
export const progressionFields = new Set(['level', 'value', 'wounds', 'count']);

// Règle de contrat (texte de `targetRules`) -> clé du fait fourni dans `input.facts.targets[id]`.
// Toute autre règle devient une note (`targetNotes`), jamais appliquée.
export const targetRuleFactFields = Object.freeze({
  'non-Myrmidian': 'nonMyrmidian', 'looking-at-priest': 'lookingAtPriest', 'within-range': 'withinRange', ally: 'ally',
  undead: 'undead', ruinServant: 'ruinServant', withinTouch: 'withinTouch', seesPriest: 'seesPriest',
  zeroWounds: 'zeroWounds', consenting: 'consenting', criminal: 'criminal', 'denies-crime': 'deniesCrime'
});
export const targetRuleFacts = new Set(Object.keys(targetRuleFactFields));
