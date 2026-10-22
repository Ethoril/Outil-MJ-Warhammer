import test from 'node:test';
import assert from 'node:assert/strict';
import { isTargetUndead, isTargetDaemon, isTargetConstruct, isTargetEthereal, hasTargetNatureOrTrait, hasLivingMagicNature } from '../js/core/v5-magic-attributes.js';
import { previewPsychologySource } from '../js/core/v5-talent-psychology.js';

const person = (id, extra = {}) => ({ id, name: id, camp: 'b', hp: 10, maxHp: 10, states: [], traits: [], talents: [], ...extra });

test('K5 : les natures lisent aussi les mots-clés (un descendant suffit), sans perdre les Traits et étiquettes', () => {
  assert.equal(isTargetUndead(person('s', { keywords: ['squelette'] })), true, 'Squelette est un Mort-vivant');
  assert.equal(isTargetUndead(person('z', { tags: ['Zombie'] })), true, 'ancien tag résolu par alias');
  assert.equal(isTargetUndead(person('t', { traits: ['Mort-vivant'] })), true, 'Trait conservé');
  assert.equal(isTargetUndead(person('n', { keywords: ['nain'] })), false);
  assert.equal(isTargetUndead(person('c', { name: 'Chasseur de morts-vivants', keywords: ['humain'] })), false, 'un rôle ne vaut pas une nature');
  assert.equal(isTargetDaemon(person('d', { keywords: ['demon-de-nurgle'] })), true);
  assert.equal(isTargetDaemon(person('k', { keywords: ['chaos'] })), false, 'Chaos n’est pas Démon : seuls les descendants de Démon');
  assert.equal(isTargetConstruct(person('a', { keywords: ['artificiel'] })), true);
  assert.equal(isTargetEthereal(person('f', { keywords: ['fantome'] })), true, 'le Fantôme est Éthéré');
  assert.equal(isTargetUndead(person('f', { keywords: ['fantome'] })), true, 'et Mort-vivant');
  assert.equal(hasLivingMagicNature(person('v', { keywords: ['squelette'] })), false, 'la nature vivante suit les mêmes mots-clés');
  assert.equal(hasLivingMagicNature(person('v2', { keywords: ['humain'] })), true);
  const excluded = person('x', { traits: ['Mort-vivant'], keywordExclusions: ['mort-vivant'] });
  assert.equal(isTargetUndead(excluded), true, 'le Trait explicite reste décisif : l’exclusion écarte seulement une déduction');
});

test('K5 : « contre les X » d’un contrat (Trait ou nature demandé) accepte un mot-clé, un alias ou un ancêtre', () => {
  const orc = person('o', { keywords: ['orque'] });
  for (const key of ['Peaux-vertes', 'peau verte', 'Orque', 'greenskins']) assert.equal(hasTargetNatureOrTrait(orc, key), true, key);
  assert.equal(hasTargetNatureOrTrait(orc, 'Gobelin'), false);
  assert.equal(hasTargetNatureOrTrait(person('d', { keywords: ['nain'] }), 'Peaux-vertes'), false);
  assert.equal(hasTargetNatureOrTrait(person('m', { traits: ['Mutation (Griffes)'] }), 'mutation'), true, 'repli sur les Traits');
  assert.equal(hasTargetNatureOrTrait(person('r', { race: 'Haut Elfe' }), 'Elfe'), true, 'race de PJ déduite');
  assert.equal(hasTargetNatureOrTrait(person('w', { name: 'Chasseur de démons' }), 'demon'), false);
});

test('K5 : une source de Psychologie « contre les Peaux-vertes » ne touche que les porteurs du mot-clé ou d’un descendant', () => {
  const broken = (id, keywords) => ({ ...person(id, keywords ? { keywords } : {}), states: [{ key: 'brise', name: 'Brisé', level: 2 }] });
  const level = (result, id) => (result.participants.find(p => p.id === id).states || []).filter(s => s.key === 'brise').reduce((n, s) => n + (s.level || 1), 0);
  const waaagh = previewPsychologySource('C0-L12-006', { author: person('a'), targets: [broken('orc', ['orque']), broken('gob', ['gobelin']), broken('nain', ['nain']), broken('inconnu')] });
  assert.equal(level(waaagh, 'orc'), 0, 'Orque : Brisé retiré');
  assert.equal(level(waaagh, 'gob'), 0);
  assert.equal(level(waaagh, 'nain'), 2, 'Nain : inchangé');
  assert.equal(level(waaagh, 'inconnu'), 0, 'sans mot-clé connu : comportement d’avant, avec rappel');
  assert.ok(waaagh.reminders.some(text => /inconnu/.test(text) && /Peaux-vertes/.test(text)), 'rappel pour le participant sans mot-clé');
  assert.ok(waaagh.reminders.some(text => /nain/i.test(text) && /Peaux-vertes/.test(text)), 'rappel : cible écartée, correction possible');
  const forced = previewPsychologySource('C0-L12-006', { author: person('a'), targets: [broken('nain', ['nain'])], facts: { keywordTargets: { nain: true } } });
  assert.equal(level(forced, 'nain'), 0, 'correction MJ : forcer l’effet');
  const removed = previewPsychologySource('C0-L12-006', { author: person('a'), targets: [broken('orc', ['orque'])], facts: { keywordTargets: { orc: false } } });
  assert.equal(level(removed, 'orc'), 2, 'correction MJ : retirer l’effet');
});
