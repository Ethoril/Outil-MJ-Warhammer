import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { TRADITION_SPELLS } from '../../../tools/v5-tradition-spell-contracts.mjs';
import contracts from '../../../js/data/v5-spell-contracts.json' with {type:'json'};
import { getAllSpellContracts } from '../../../js/core/v5-spell-contracts.js';
import book from '../../../js/data/bestiary/L06.json' with { type: 'json' };
import { readFileSync } from 'node:fs';
import { MAGIC_DATA } from '../../../js/data/magic.js';
import snapshot from '../../../js/data/reference-snapshot.json' with { type: 'json' };
import { V5_CRIT_DATA, getV5CriticalEffect } from '../../../js/data/v5-crits.js';

describe('registre des traditions de magie', () => {
const generatedBase=t=>contracts.find(c=>!c.isTradition&&c.name===t.variantOf);
test('Phase D — le registre des traditions est cohérent et intégralement généré dans les contrats',()=>{
 const slugs=TRADITION_SPELLS.map(t=>t.slug);
 assert.equal(new Set(slugs).size,slugs.length);
 for(const t of TRADITION_SPELLS){
  const keys=t.variantOf?['slug','name','canonicalName','book','page','edition','description','addOvercastSpecific']:['slug','name','canonicalName','book','page','domain','type','edition','range','target','duration','description','effects'];
  for(const key of keys)assert.ok(t[key]!==undefined&&t[key]!==null&&t[key]!=='',t.slug+' : '+key);
  if(t.variantOf){assert.ok(generatedBase(t),t.slug+' : contrat de base');continue;}
  assert.ok(Number.isInteger(t.cn)&&t.cn>=0,t.slug+' : NI');
  assert.ok(t.effects.type,t.slug+' : type d’effet');
 }
 const generated=contracts.filter(c=>c.isTradition);
 assert.deepEqual(generated.map(c=>c.id),TRADITION_SPELLS.map(t=>'spell-tradition-'+t.slug));
});
test('Phase D — le catalogue public garde ses 277 identités, les traditions s’y ajoutent',()=>{
 const all=getAllSpellContracts();
 assert.equal(all.filter(c=>!c.isTradition).length,277);
 assert.equal(all.length,277+TRADITION_SPELLS.length);
});
});

describe('corrections v3 — bestiaire', () => {
// Livre de base V5 EN v3 : bestiaire pp.320-356.
const profile = name => book.profiles.find(row => row.name === name);
const attack = (name, attackName) => profile(name).attacks.find(row => row.name === attackName);
const trait = (name, traitName) => profile(name).traits.find(row => row.name === traitName);

test('v3 grands monstres : dégâts imprimés relevés, Morsure et Queue inchangées', () => {
  assert.equal(attack('Dragon', 'Claws').damage, 22);
  assert.equal(attack('Giant', 'Hand Weapon').damage, 22);
  assert.equal(attack('Griffon', 'Talons').damage, 19);
  assert.equal(attack('Manticore', 'Claws').damage, 19);
  assert.deepEqual([attack('Dragon', 'Bite').damage, attack('Dragon', 'Tail').damage, attack('Griffon', 'Bite').damage, attack('Manticore', 'Tail').damage], [9, 8, 8, 7]);
});

test('v3 gabarits : Lieutenant, Commandant et Seigneur lanceur', () => {
  const lieutenant = profile('Lieutenant');
  assert.equal(lieutenant.nameFr, 'Lieutenant');
  assert.deepEqual(lieutenant.modifiers, { CC: 20, CT: 20, F: 20, E: 20, I: 20, Ag: 20, FM: 20, Soc: 10 });
  assert.deepEqual(profile('Commander').modifiers, { CC: 30, CT: 30, F: 20, E: 20, I: 30, Ag: 20, FM: 30, Soc: 15 });
  assert.deepEqual(profile('Spellcaster Lord').modifiers, { CC: 10, I: 20, Ag: 15, Int: 30, FM: 20, Soc: 10 });
});

test('v3 Ungrakk : profil p.355, Dextérité 35 imprimée', () => {
  const ungrakk = book.profiles.find(row => row.name.startsWith('Ungrakk'));
  assert.deepEqual(ungrakk.stats, { M: 5, CC: 65, CT: 60, F: 55, E: 60, I: 60, Ag: 55, Dex: 35, Int: 20, FM: 60, Soc: 25 });
  assert.equal(ungrakk.wounds, 23);
  assert.equal(ungrakk.armour.toughnessBonus, 6);
  assert.deepEqual(ungrakk.attacks.map(row => [row.name, row.value, row.damage]), [['Hand Weapon', 85, 9], ['Horns', 65, 9]]);
  const skill = name => ungrakk.skills.find(row => row.name === name).value;
  assert.deepEqual(['Cool', 'Dodge', 'Intimidate', 'Leadership', 'Lore (Warfare)', 'Perception'].map(skill), [80, 75, 75, 55, 55, 80]);
  assert.deepEqual(ungrakk.skills.filter(row => row.name.startsWith('Melee')).map(row => row.value), [85, 85]);
});

test('v3 Ogre sans Trait Peur ; indices de Peur explicites', () => {
  assert.equal(trait('Ogre', 'Fear'), undefined);
  for (const name of ['Skeleton', 'Zombie', 'Dire Wolf', 'Ghost', 'Daemonette of Slaanesh']) assert.equal(trait(name, 'Fear').rating, '2', name);
  assert.equal(profile('Vampire').optionalTraits.find(row => row.name === 'Fear').rating, '2');
  assert.equal(trait('Bloodletter of Khorne', 'Fear').rating, '3');
});

test('v3 elfes et nains p.320 : arc long +8, arbalète à 40', () => {
  assert.equal(profile('High Elf or Wood Elf').attacks.find(row => row.name === 'Longbow and Elf Arrows').damage, 8);
  assert.equal(profile('Dwarf').attacks.find(row => row.name === 'Crossbow and Bolts').rangeYards, 40);
});

test('v3 Grim : Trait optionnel des neuf profils', () => {
  for (const name of ['Bog Octopus', 'Dragon', 'Giant', 'Griffon', 'Manticore', 'Troll', 'Vampire', 'Varghulf', 'Minotaur'])
    assert.ok(profile(name).optionalTraits.some(row => row.name === 'Grim' && row.ref === 'E0-T-026'), name);
});
});

describe('corrections v3 — mètres', () => {
// Convention du projet : toute mesure affichée en yards s'écrit avec la même valeur en mètres.
const text = path => readFileSync(new URL('../../../' + path, import.meta.url), 'utf8');

test('v3 mètres : plus de « yard » dans les textes affichés des données écrites à la main', () => {
  for (const path of ['js/data/creature-abilities.js', 'js/data/v5-combat-fumbles.js', 'js/data/rules.js', 'js/data/v5-rules.js'])
    assert.doesNotMatch(text(path), /\byards?\b/i, path);
  assert.doesNotMatch(JSON.stringify(MAGIC_DATA), /\byards?\b/i);
  assert.doesNotMatch(text('js/data/v5-spell-contracts.json'), /\byards?\b/i);
});

test('v3 mètres : contrats de prières — les textes affichés sont en mètres, les unités de paramètres restent codées', () => {
  const registry = JSON.parse(text('js/data/v5-divine-contracts.json'));
  const shown = [];
  for (const contract of registry.contracts) for (const row of [...(contract.clauses || []), ...(contract.needsInput || [])]) shown.push(row.text);
  assert.ok(shown.length > 100);
  assert.deepEqual(shown.filter(value => /\byards?\b/i.test(value || '')), []);
});
});

describe('corrections v3 — référentiel de règles', () => {
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

test('v3 Souffle : la note du contrat dit aussi Bonus de Force Mentale', async () => {
  const { getSpellContract } = await import('../../../js/core/v5-spell-contracts.js');
  const contract = getSpellContract('Souffle');
  assert.doesNotMatch(JSON.stringify(contract), /voisins dans BI\b/);
  assert.match(JSON.stringify(contract.assistedClauses), /voisins dans BFM mètres/);
});
});

describe('corrections v3 — tables', () => {
// Livre de base V5 EN v3 : table des critiques au Corps (p.175) et table des incidents mineurs (p.238).
test('v3 Entaille douloureuse : l’échec spectaculaire est à −5 DR', () => {
  const entry = getV5CriticalEffect('BODY', 75);
  assert.equal(entry.name, 'Entaille douloureuse');
  assert.match(entry.manual || entry.note || JSON.stringify(entry), /échec à −5 DR ou moins : Inconscient/);
  assert.doesNotMatch(JSON.stringify(V5_CRIT_DATA.BODY), /−6 DR/);
});

test('v3 incidents mineurs : Délié, Rébellion intestinale, Hurlement et Rupture permutés, textes identiques', () => {
  const at = max => MAGIC_DATA.MINOR.find(row => row.max === max);
  assert.deepEqual([20, 25, 50, 70].map(max => at(max).name), ['Délié', 'Rébellion intestinale', 'Hurlement intérieur', 'Rupture']);
  assert.equal(at(20).eff, 'Vos boucles et lacets se défont ; ceintures, sacs, équipement et armures peuvent tomber ou glisser.');
  assert.equal(at(25).eff, 'Vous vous souillez : gagnez Souillé.');
  assert.equal(at(50).eff, 'Gagnez 1 Assourdi pendant 1d10 Rounds.');
  assert.equal(at(70).eff, 'Votre nez, vos yeux et vos oreilles saignent : gagnez 1 Hémorragique.');
});
});
