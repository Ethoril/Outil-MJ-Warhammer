import test from 'node:test';
import assert from 'node:assert/strict';
import snapshot from '../js/data/reference-snapshot.json' with { type: 'json' };

// Livre de base V5 EN v3 : référentiel issu de la feuille « Aides de Jeu » corrigée le 29/10/2026.
const item = id => snapshot.equipment.items.find(row => row.id === id);
const talent = id => snapshot.talents.entries.find(row => row.id === id);
const spell = name => snapshot.magic.spells.find(row => row.nom === name);

test('v3 arcs : dégâts fixes et arbalètes à portée réduite', () => {
  const damage = Object.fromEntries(['arc-2m', 'arc-court-2m', 'arc-long-2m', 'arc-elfique-2m', 'arc-d-anirain-haut-elfe'].map(slug => [slug, item(`weapon-armes-a-distance-arc-${slug}`).damage]));
  assert.deepEqual(damage, { 'arc-2m': '+7', 'arc-court-2m': '+6', 'arc-long-2m': '+8', 'arc-elfique-2m': '+9', 'arc-d-anirain-haut-elfe': '+9' });
  assert.equal(item('weapon-armes-a-distance-arbalete-arbalete-2m').range, '40');
  assert.equal(item('weapon-armes-a-distance-arbalete-arbalete-lourde-2m').range, '50');
});

test('v3 explosifs et munitions à poudre', () => {
  const blast = id => item(id).keywords.find(word => word.id === 'explosion')?.parameter;
  assert.equal(blast('weapon-armes-a-distance-explosifs-bombe'), '10');
  assert.equal(blast('weapon-armes-a-distance-explosifs-bombe-incendiaire'), '6');
  assert.equal(blast('weapon-armes-a-distance-poudre-noire-tromblon-2m'), '2');
  assert.equal(blast('ammunition-livre-de-base-poudre-noire-grenaille-et-poudre-12'), undefined);
  assert.equal(blast('ammunition-livre-de-base-poudre-noire-munitions-improvisees-et-poudre'), '-1');
});

test('v3 À répétition : tir double à −1 DR', () => {
  assert.match(snapshot.equipment.keywords.find(word => word.id === 'a-repetition').effect, /deux fois sur la même cible avec −1 DR, en une seule Action/);
});

test('v3 talents : dix descriptions reportées, Présence imposante et Exaltant échangés', () => {
  assert.match(talent('talent-commanding-presence').description, /^Sur un Test de Commandement réussi en combat, choisissez les DR obtenus ou la valeur du dé des unités/);
  assert.match(talent('talent-inspiring').description, /^En l’absence d’autorité reconnue.*Avantage V5 aux Tests de Commandement\.$/);
  assert.match(talent('talent-sprinter').description, /pour courir\. À pied, vous ne subissez aucune pénalité/);
  assert.match(talent('talent-nose-for-trouble').description, /liés à un danger potentiel/);
  assert.match(talent('talent-instinctive-diction').description, /seulement si le Test d'incantation ou de Focalisation a réussi/);
  assert.match(talent('talent-aethyric-attunement').description, /si le Test d'incantation ou de Focalisation a réussi/);
  assert.doesNotMatch(talent('talent-fast-hands').description, /divertir/);
  assert.match(talent('talent-strike-to-stun').description, /Avantage V5 aux neutralisations silencieuses/);
  assert.match(talent('talent-riposte').description, /^Une fois par Round/);
  assert.match(talent('talent-dual-wielder').description, /ne demande pas de dépenser d'Élan, mais vous devez en avoir/);
});

test('v3 sorts : Effroi NI 2, Couronne Peur (2), Rhuin toute épée, Faux sans Élan, Souffle en Bonus de Force Mentale', () => {
  assert.equal(spell('Effrayant').cn, 2);
  assert.match(spell('Couronne de Flamme').desc, /Trait Peur \(2\)/);
  assert.doesNotMatch(spell('Couronne de Flamme').desc, /reprendre Meneur de Guerre/);
  assert.equal(spell('Épée Enflammée de Rhuin').cible, '1 épée');
  assert.match(spell('La Faux de Shyish').desc, /ne gagnent pas d’Élan/);
  assert.match(spell('Souffle').desc, /voisins dans Bonus de Force Mentale mètres/);
  assert.match(spell('Coup de vent').desc, /silhouette en cape/);
});
