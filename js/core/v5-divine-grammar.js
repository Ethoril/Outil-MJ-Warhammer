/** Grammaire partagée des contrats divins : le générateur, le moteur et les tests lisent les mêmes listes. */

// `touch` : portée Contact (valeur 0, fait withinTouch exigé, jamais étendue).
export const paramKinds = new Set(['fixed', 'characteristic', 'characteristic-bonus', 'self', 'area', 'count', 'special', 'instant', 'touch']);
export const paramUnits = new Set(['rounds', 'minutes', 'hours', 'days', 'yards', 'miles', 'targets', 'allies']);
// Unités de durée convertibles en secondes de campagne (échéance `campaign-time`).
export const calendarDurationUnits = new Set(['minutes', 'hours', 'days']);

// Types d'effet connus du moteur ; v5-divine-effect-handlers.js doit fournir un gestionnaire pour chacun.
export const effectTypes = new Set(['characteristic-modifier', 'armor-bonus', 'condition', 'healing', 'wound-heal']);
effectTypes.add('direct-damage');

// Source d'une force d'État : `{kind:'characteristic-bonus'|'characteristic', characteristic}` ou `{kind:'success-levels'}`.
export const strengthSources = new Set(['characteristic-bonus', 'characteristic', 'success-levels']);
// Champs d'effet que `perSuccessLevels: {every, add, field}` peut faire croître.
export const progressionFields = new Set(['level', 'value', 'wounds', 'count']);

// Règle de contrat (texte de `targetRules`) -> clé du fait fourni dans `input.facts.targets[id]`.
// Toute autre règle devient une note (`targetNotes`), jamais appliquée.
export const targetRuleFactFields = Object.freeze({
  'non-Myrmidian': 'nonMyrmidian', 'looking-at-priest': 'lookingAtPriest', 'within-range': 'withinRange', ally: 'ally',
  undead: 'undead', ruinServant: 'ruinServant', withinTouch: 'withinTouch', seesPriest: 'seesPriest',
  zeroWounds: 'zeroWounds', consenting: 'consenting', criminal: 'criminal'
});
export const targetRuleFacts = new Set(Object.keys(targetRuleFactFields));
