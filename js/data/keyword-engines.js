/**
 * Dictionnaire de moteurs mécaniques pour les mots-clés d'armes et d'armures WFRP 4e.
 * Le slug est le contrat fixe entre les libellés du Sheet et les fonctions de calcul.
 */
export const ENGINES = {
  inoffensive:  { tier: 1, engine: 'armour-multiplier', params: { factor: 2, noMinimum: true } },
  percutante:   { tier: 1, engine: 'add-units-die', aliases: ['impact'] },
  impact:       { tier: 1, engine: 'add-units-die', aliasOf: 'percutante' },
  devastatrice: { tier: 1, engine: 'best-of-units-or-sl' },
  // Pointue : +1 DR sur une réussite ; Imprécise : −1 DR sur tout test, et l'emporte sur Pointue.
  pointue:      { tier: 1, engine: 'attack-sl-bonus', params: { bonus: 1, onSuccessOnly: true } },
  imprecise:    { tier: 1, engine: 'attack-sl-bonus', params: { bonus: -1 }, overrides: ['pointue'] },
  precise:      { tier: 1, engine: 'target-score-bonus', params: { bonus: 10 } },
  empaleuse:    { tier: 1, engine: 'expanded-critical' },
  dangereuse:   { tier: 1, engine: 'fumble-on-nine' }
};
