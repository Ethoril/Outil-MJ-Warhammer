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
  pointue:      { tier: 1, engine: 'attack-sl-bonus', params: { bonus: 1, onSuccessOnly: true }, aliases: ['precise'] },
  imprecise:    { tier: 1, engine: 'attack-sl-bonus', params: { bonus: -1 }, overrides: ['pointue'] },
  defensive:    { tier: 1, engine: 'defense-sl-bonus', params: { bonus: 1 } },
  desequilibree: { tier: 1, engine: 'defense-sl-bonus', params: { bonus: -1 }, overrides: ['defensive'] },
  // REGLES-11 (MJ 13/11) : Précise (Accurate V4, +10) n'existe plus en V5 ; elle se lit comme Pointue partout.
  precise:      { tier: 1, engine: 'attack-sl-bonus', aliasOf: 'pointue' },
  empaleuse:    { tier: 1, engine: 'expanded-critical' },
  dangereuse:   { tier: 1, engine: 'fumble-on-nine' }
};
