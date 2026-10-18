// Targeted source references: L06 pp. 184–186, 218.
// Visual evidence: independently rendered and inspected pp. 185, 186, 218.
// Page 184 is a cumulative-Conditions reference, not a new visual-reading claim.
// This does not change the E1 page-reading counters or certify other Wrath rows.
const V5 = Object.freeze({
 document: 'Livre de base V5 EN v2.pdf',
 fileSha256: '53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de',
 edition: 'V5 EN',
 sourceStatus: 'read-and-page-checked'
});

export const wrathConditionRules = Object.freeze([
 Object.freeze({
  id: 'wrath:61-65:conditions', type: 'condition-acquisition', ruleVersion: 1,
  resultId: 'wrath:61-65', conditions: Object.freeze([{ name: 'Hémorragique', base: 1, perSin: 1 }]),
  source: Object.freeze({ ...V5, printedPage: 218, section: 'Table de la Colère des dieux' })
 }),
 Object.freeze({
  id: 'wrath:89-95:conditions', type: 'condition-acquisition', ruleVersion: 1,
  resultId: 'wrath:89-95', conditions: Object.freeze([{ name: 'Brisé', base: 1, perSin: 1 }]),
  source: Object.freeze({ ...V5, printedPage: 218, section: 'Table de la Colère des dieux' })
 })
]);

export const wrathConditionReading = Object.freeze({
 sourceRefs: Object.freeze([
  Object.freeze({ ...V5, printedPage: 218, section: 'Table de la Colère des dieux' }),
  Object.freeze({ ...V5, printedPage: 184, section: 'Conditions cumulables' }),
  Object.freeze({ ...V5, printedPage: 185, section: 'Hémorragique et récupération' }),
  Object.freeze({ ...V5, printedPage: 186, section: 'Brisé et récupération' })
 ]),
 sinTiming: 'before-decrement', applicationOrder: 'apply-then-decrement',
 conditionsStack: true,
 limits: Object.freeze({
  brokenFleeing: 'Sources p.185–186 require Move (Flee), then Action (Sprint); once safely out of sight, spend an Action on a Skill Test to hide further. The current app does not automate that action sequence.',
  readingScope: 'Targeted visual reading only; does not change E1 counters or certify other Wrath results.'
 }),
 evidencePath: 'task evidence wrath-source/source-observation.md'
});
