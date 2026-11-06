// U8 lot L0 (CA4, CA5) : cumul entre familles d'effets sur un même Test (docs/specs/moteur-effets-unifie/).
// Une ligne par paire de familles de la table de cas du MJ (questions-mj.md, Q1 à Q5).
// Tant qu'une paire n'est pas arbitrée par le MJ, son cas reste en `todo` : aucune valeur attendue n'est inventée ici.
// Un cas arbitré devient un test réel ; une paire que le livre ne tranche pas et que le MJ n'a pas arbitrée doit être
// signalée (CA5), jamais additionnée ni écartée en silence : son test attendra ce signalement (lot L2).
// Déjà réglés par le livre et couverts par cumul-effets.test.js : talent + prière (R1, p. 130), sorts entre eux (R3, p. 235),
// même prière deux fois (R4, p. 217), sources d'Avantage (R2, p. 130).
import test from 'node:test';

test.todo('Q2 · prière et sort sur la même cible de Test (DIV-05) : somme, meilleur bonus seul ou cas par cas ?');
test.todo('Q2 · prière et sort sur la même caractéristique (DIV-05, statModifiers)');
test.todo('Q2 · deux prières différentes sur le même Test par des clés différentes (le livre ne règle que la même prière, R4)');
test.todo('Q3 · pénalité d\'État (la plus forte) et malus de sort au même Test (ex. Sonné et Démangeaison)');
test.todo('Q3 · pénalité d\'État et malus de prière au même Test');
test.todo('Q4 · qualité d\'arme (Défensive, Déséquilibrée, Pointue, Imprécise) et sort ou talent au même Test');
test.todo('Q4 · Avantage de cavalerie et talent qui donne un Avantage sur la même attaque : deux sources distinctes (p. 130) ?');
test.todo('Q4 · Désavantage du cavalier et autre source de Désavantage');
test.todo('Q4 · surnombre et talent, prière ou sort au même Test');
test.todo('Q5 · plafond de DR de prière (Courroux) : sur le résultat final, bonus compris, ou avant les bonus ?');
test.todo('CA5 · une paire de familles absente de la table est signalée au MJ, jamais additionnée en silence (lot L2)');
