import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validateBestiaryRecord } from '../../../js/core/bestiary-profiles.js';

describe('données du bestiaire — structure', () => {
const read = path => JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8'));
const inventory = read('docs/BESTIAIRE_INVENTAIRE.json');
const index = read('js/data/bestiary/index.json');

test('Bestiaire : l’index décrit exactement les fichiers de livre présents, avec leurs décomptes', () => {
  const files = readdirSync(new URL('../../../js/data/bestiary/', import.meta.url)).filter(name => /^L\d\d\.json$/.test(name)).sort();
  assert.deepEqual(index.books.map(item => item.file), files);
  for (const item of index.books) {
    const data = read(`js/data/bestiary/${item.file}`);
    assert.equal(data.book, item.book);
    assert.equal(data.profiles.length, item.counts.profiles + item.counts.templates + item.counts.pregenerated);
  }
});

for (const item of index.books) {
  test(`Bestiaire ${item.book} : un profil par entrée d’inventaire, tous conformes, valeurs imprimées`, () => {
    const data = read(`js/data/bestiary/${item.file}`);
    const expected = inventory.profiles.filter(entry => entry.book === item.book);
    assert.deepEqual(data.profiles.map(profile => profile.id).sort(), expected.map(entry => entry.id).sort(), 'identifiants = inventaire');
    for (const profile of data.profiles) {
      const entry = expected.find(row => row.id === profile.id);
      assert.equal(profile.inventoryKind ?? profile.kind, entry.kind, profile.id);
      assert.equal(profile.page, entry.page, profile.id);
      assert.deepEqual(validateBestiaryRecord(profile), [], `${profile.id} ${profile.name}`);
      for (const ability of profile.abilities || []) assert.ok(inventory.traits.some(trait => trait.id === ability), `${profile.id} → ${ability}`);
      if (profile.nameFr) assert.ok(['proposition'].includes(profile.nameFrSource) || /^L05 p\.\d+$/.test(profile.nameFrSource), `${profile.id} source du nom français`);
      assert.ok(!('_dropped' in profile), 'aucun résidu de génération');
    }
    const counts = { profile: 0, template: 0, 'pregenerated-character': 0 };
    for (const profile of data.profiles) counts[profile.kind] += 1;
    assert.deepEqual([item.counts.profiles, item.counts.templates, item.counts.pregenerated], [counts.profile, counts.template, counts['pregenerated-character']]);
  });
}
});

describe('bestiaire L01', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L01.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D4 Archives of the Empire 2 : 15 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 15);
  assert.equal(book.edition, 'V4');
  assert.ok(book.profiles.every(profile => profile.nameFr));
});

test('D4 : le Rhinox garde ses cases vides (CT, Dex) et ses valeurs imprimées (p. 34)', () => {
  const rhinox = byId('E0-P-127');
  assert.deepEqual(rhinox.stats, { M: 6, CC: 55, CT: null, F: 60, E: 55, I: 25, Ag: 20, Dex: null, Int: 10, FM: 40, Soc: 20 });
  assert.equal(rhinox.wounds, 50);
  assert.equal(rhinox.size, 'large');
  assert.equal(rhinox.armour.ap, 2);
  assert.deepEqual(rhinox.attacks.map(a => [a.name, a.damage]), [['Horns', 10], ['Weapon', 9]]);
});

test('D4 : mots-clés d’espèce et de condition des PNJ', () => {
  assert.deepEqual(byId('E0-P-123').keywords, ['ogre']);
  assert.deepEqual(byId('E0-P-124').keywords, ['ogre', 'hors-la-loi']);
  assert.deepEqual(byId('E0-P-135').keywords, ['noble', 'humain']);
  assert.deepEqual(byId('E0-P-130').keywords, ['humain']);
});
});

describe('bestiaire L02', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L02.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D5 Archives of the Empire 3 : 12 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 12);
  assert.ok(book.profiles.every(profile => profile.nameFr));
});

test('D5 : valeurs imprimées du Blaireau (p. 76) et de la Grafina (p. 30)', () => {
  const badger = byId('E0-P-139');
  assert.deepEqual(badger.stats, { M: 4, CC: 35, CT: null, F: 15, E: 25, I: 35, Ag: 30, Dex: null, Int: 15, FM: 15, Soc: 15 });
  assert.equal(badger.wounds, 5);
  assert.equal(byId('E0-P-138').wounds, 11);
  assert.equal(byId('E0-P-138').stats.Dex, 51);
});

test('D5 : familiers et petits animaux = Bêtes, PNJ = espèce', () => {
  for (const id of ['E0-P-139', 'E0-P-140', 'E0-P-141', 'E0-P-142', 'E0-P-143', 'E0-P-144']) assert.deepEqual(byId(id).keywords, ['bete'], id);
  assert.deepEqual(byId('E0-P-149').keywords, ['nain']);
  assert.deepEqual(byId('E0-P-146').keywords, ['humain']);
});
});

describe('bestiaire L03', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L03.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D6 Archives of the Empire Volume 1 : 13 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 13);
  assert.ok(book.profiles.every(profile => profile.nameFr));
});

test('D6 : valeurs imprimées du soldat halfling (p. 23) et de l’inquisiteur nain (p. 56)', () => {
  assert.deepEqual(byId('E0-P-150').stats, { M: 3, CC: 30, CT: 54, F: 21, E: 36, I: 35, Ag: 28, Dex: 44, Int: 27, FM: 53, Soc: 40 });
  assert.equal(byId('E0-P-150').wounds, 11);
  assert.deepEqual(byId('E0-P-157').stats.E, 72);
  assert.equal(byId('E0-P-157').wounds, 24);
});

test('D6 : espèces halfling (pp. 23-31) et nain (pp. 56-63)', () => {
  assert.deepEqual(byId('E0-P-150').keywords, ['soldat', 'halfling']);
  for (const id of ['E0-P-151', 'E0-P-156']) assert.deepEqual(byId(id).keywords, ['halfling'], id);
  for (const id of ['E0-P-157', 'E0-P-162']) assert.deepEqual(byId(id).keywords, ['nain'], id);
});
});

describe('bestiaire L04', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L04.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D7 Deft Steps, Light Fingers : 22 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 22);
  assert.ok(book.profiles.every(profile => profile.nameFr));
});

test('D7 : valeurs imprimées d’Albrecht (p. 64) et du chevalier de la Garde noire (p. 34)', () => {
  const albrecht = byId('E0-P-171');
  assert.deepEqual(albrecht.stats, { M: 4, CC: 62, CT: 33, F: 49, E: 51, I: 42, Ag: 44, Dex: 40, Int: 58, FM: 54, Soc: 51 });
  assert.equal(albrecht.wounds, 19);
  assert.deepEqual(albrecht.armour, { ap: 1, printedTotal: 6 });
  assert.deepEqual(albrecht.attacks.map(a => [a.name, a.damage]), [['Crossbow Pistol', 7], ['Boat Hook', 8], ['Sword', 8]]);
  assert.deepEqual(byId('E0-P-163').armour, { ap: 5, printedTotal: 8 });
});

test('D7 : le surnom « the Fish » ne donne pas le mot-clé poisson ; bêtes et hors-la-loi', () => {
  assert.deepEqual(byId('E0-P-171').keywords, ['humain']);
  assert.deepEqual(byId('E0-P-184').keywords, ['arabyen', 'bete']);
  assert.deepEqual(byId('E0-P-182').keywords, ['bete']);
  assert.deepEqual(byId('E0-P-176').keywords, ['hors-la-loi']);
});
});

describe('bestiaire L06', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L06.json', import.meta.url), 'utf8'));
const byName = name => book.profiles.find(profile => profile.name === name);

test('D2 Livre de base V5 : 53 profils et 7 gabarits, noms français du livre FR ou proposés', () => {
  assert.equal(book.profiles.length, 60);
  assert.equal(book.profiles.filter(profile => profile.kind === 'template').length, 7);
  assert.equal(book.edition, 'V5');
  assert.equal(byName('Boar').nameFr, 'Sanglier');
  assert.equal(byName('Boar').nameFrSource, 'L05 p.316');
  assert.equal(byName('Human Watchman').nameFrSource, 'proposition');
  assert.equal(book.profiles.filter(profile => !profile.nameFr).length, 0, 'tous les profils ont un nom français');
});

test('D2 : valeurs imprimées du Sanglier, du Troll et du Dragon, relues sur les pages 325, 335 et 330', () => {
  const boar = byName('Boar');
  assert.deepEqual(boar.stats, { M: 7, CC: 35, CT: null, F: 35, E: 40, I: 35, Ag: 35, Dex: null, Int: 10, FM: 10, Soc: null });
  assert.equal(boar.wounds, 12);
  assert.deepEqual(boar.attacks.map(a => [a.name, a.value, a.damage, a.free ?? null]), [['Hooves and Tusks', 40, 6, null], ['Horns', 40, 7, 'charge']]);
  assert.deepEqual(boar.armour, { toughnessBonus: 4, parts: [{ name: 'Hide', ap: 1 }] });
  const troll = byName('Troll');
  assert.deepEqual([troll.wounds, troll.size, troll.stats.F, troll.stats.E], [30, 'large', 55, 45]);
  assert.deepEqual(troll.attacks.map(a => [a.name, a.value, a.damage]), [['Hand Weapon', 45, 14], ['Bite', 40, 8], ['Vomit', 55, 8]]);
  assert.deepEqual(troll.skills.map(s => [s.name, s.value]), [['Melee (Brawling)', 40], ['Melee (Basic)', 45], ['Endurance', 55]]);
  assert.deepEqual(troll.traits.map(t => t.name), ['Infected', 'Regeneration', 'Size', 'Stupid']);
  const dragon = byName('Dragon');
  assert.equal(dragon.wounds, 104);
  assert.deepEqual(dragon.traits.find(t => t.name === 'Fly'), { name: 'Fly', rating: '80', ref: 'E0-T-023' });
  assert.deepEqual(dragon.attacks.map(a => a.damage), [22, 9, 8]);
});

test('D2 : les natures (Mort-vivant, Démoniaque, Construct) sont des Traits liés à l’inventaire', () => {
  const skeleton = byName('Skeleton');
  assert.deepEqual(skeleton.traits.map(t => t.name), ['Construct', 'Dark Vision', 'Fear', 'Painless', 'Undead', 'Unstable']);
  assert.equal(skeleton.traits.find(t => t.name === 'Undead').ref, 'E0-T-061');
  assert.deepEqual(skeleton.keywords, ['squelette']);
  const bloodletter = byName('Bloodletter of Khorne');
  assert.equal(bloodletter.traits.find(t => t.name === 'Daemonic').rating, '8+');
  assert.deepEqual(bloodletter.keywords, ['demon-de-khorne']);
  assert.deepEqual(bloodletter.attacks.map(a => [a.name, a.qualities ?? null]), [['Hellblade', ['Damaging', 'Magical']], ['Horns', ['Magical']]]);
  // Q33 : la page 343 imprime Night Vision, Undead, Vampiric (le « Bite » lu avant n'était que l'attaque Bite, et Night Vision était perdu dans le titre).
  assert.deepEqual(byName('Vampire').traits.map(t => t.name), ['Night Vision', 'Undead', 'Vampiric']);
});

test('D2 : gabarits en modificateurs signés (cases vides = aucun modificateur)', () => {
  assert.deepEqual(byName('Soldier').modifiers, { CC: 10, F: 10, E: 10, FM: 10 });
  assert.deepEqual(byName('Commander').modifiers, { CC: 30, CT: 30, F: 20, E: 20, I: 30, Ag: 20, FM: 30, Soc: 15 });
  assert.deepEqual(byName('Spellcaster Lord').modifiers, { CC: 10, I: 20, Ag: 15, Int: 30, FM: 20, Soc: 10 });
  assert.equal(byName('Soldier').stats, undefined);
});

test('D2 : mots-clés d’espèce, de nature et d’allégeance assignés', () => {
  const keywords = name => byName(name).keywords;
  assert.deepEqual(keywords('Human Watchman').sort(), ['humain', 'milicien']);
  assert.deepEqual(keywords('Goblin'), ['gobelin']);
  assert.deepEqual(keywords('Orc'), ['orque']);
  assert.deepEqual(keywords('Giant Rat'), ['rat']);
  assert.deepEqual(keywords('Rat Ogre').sort(), ['bete', 'rat-ogre'], 'Skaven et Monstre par Rat-ogre, Bête par le Trait Bestial');
  assert.deepEqual(keywords('Daemonette of Slaanesh'), ['demon-de-slaanesh']);
  assert.deepEqual(keywords('Dwarf'), ['nain']);
});
});

describe('bestiaire L07', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L07.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D8 Lustria : 68 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 68);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.ok(!book.profiles.some(profile => /Generation|Priest|Protector|Mouths/.test(profile.nameFr)), 'plus de mots anglais dans les noms proposés');
});

test('D8 : valeurs imprimées du Slann de 5e génération (p. 123), du Stégadon (p. 177) et du Kroxigor (p. 148)', () => {
  const slann = byId('E0-P-256');
  assert.deepEqual(slann.stats, { M: 4, CC: 45, CT: 35, F: 35, E: 55, I: 20, Ag: 15, Dex: 30, Int: 85, FM: 85, Soc: 30 });
  assert.deepEqual([slann.wounds, slann.size], [42, 'large']);
  const stegadon = byId('E0-P-301');
  assert.deepEqual([stegadon.wounds, stegadon.size, stegadon.stats.CT, stegadon.stats.E], [80, 'enormous', null, 65]);
  assert.deepEqual(byId('E0-P-267').stats, { M: 6, CC: 30, CT: 5, F: 45, E: 45, I: 15, Ag: 20, Dex: 20, Int: 20, FM: 30, Soc: 15 });
});

test('D8 : « Cold- blooded » coupé en fin de ligne est recollé et lié à l’inventaire', () => {
  const skink = byId('E0-P-261');
  assert.ok(skink.traits.some(trait => trait.name === 'Cold-blooded' && trait.ref));
});

test('D8 : espèces et natures', () => {
  assert.deepEqual(byId('E0-P-256').keywords, ['slann']);
  assert.deepEqual(byId('E0-P-255').keywords, ['slann']);
  assert.deepEqual(byId('E0-P-254').keywords, ['elfe-noir']);
  assert.deepEqual(byId('E0-P-252').keywords, ['haut-elfe']);
  assert.deepEqual(byId('E0-P-243').keywords, ['norse']);
  assert.ok(byId('E0-P-247').keywords.includes('demon-de-nurgle'));
  assert.deepEqual(byId('E0-P-291').keywords, ['bete'], 'Chauve-souris géante : pas de mot-clé géant');
});
});

describe('bestiaire L09', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L09.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D9 Temple of Spite : 38 profils et 15 gabarits V4 avec nom français', () => {
  assert.equal(book.profiles.length, 53);
  assert.equal(book.profiles.filter(profile => profile.kind === 'template').length, 15);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.ok(!book.profiles.some(profile => /Highborn|Lowborn|Sorceress|Beastmaster|Hag\b/.test(profile.nameFr)), 'plus de mots anglais dans les noms proposés');
});

test('D9 : valeurs imprimées de l’Elfe noir (p. 44), du Naggarothi (p. 46) et du Dragon des mers (p. 50)', () => {
  assert.deepEqual(byId('E0-P-311').stats, { M: 5, CC: 40, CT: 40, F: 30, E: 30, I: 50, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 30 });
  assert.equal(byId('E0-P-311').wounds, 13);
  const coldOne = byId('E0-P-317');
  assert.deepEqual([coldOne.wounds, coldOne.size, coldOne.stats.CT, coldOne.stats.E], [30, 'large', null, 45]);
  assert.equal(byId('E0-P-323').wounds, 232);
});

test('D9 : les entrées de l’inventaire classées « profil » aux modificateurs imprimés sont des gabarits', () => {
  const template = byId('E0-P-326');
  assert.equal(template.kind, 'template');
  assert.equal(template.inventoryKind, 'profile');
  assert.deepEqual(template.modifiers, { CC: 10, CT: 10, F: 5, I: 5, Ag: 10, FM: 10 });
  assert.ok(!template.stats);
});

test('D9 : espèces et natures', () => {
  assert.deepEqual(byId('E0-P-311').keywords, ['elfe-noir']);
  assert.deepEqual(byId('E0-P-317').keywords, ['bete'], 'le sang-froid est une monture, pas un Elfe noir');
  assert.deepEqual(byId('E0-P-336').keywords, ['elfe-noir']);
  assert.deepEqual(byId('E0-P-358').keywords, ['elfe-noir']);
  assert.deepEqual(byId('E0-P-322').keywords, ['monstre']);
  // Q26 : le Dark Steed (p. 45) a maintenant son Trait Bestial imprimé, d'où la nature « bete » (comme le sang-froid E0-P-317).
  assert.deepEqual(byId('E0-P-315').keywords, ['bete', 'cheval']);
});
});

describe('bestiaire L10', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L10.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D10 Sylvania : 29 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 29);
  assert.ok(book.profiles.every(profile => profile.kind === 'profile' && profile.nameFr));
  assert.ok(!book.profiles.some(profile => /Human|Peasant|Witch|Servant|Priest|Mystic|Clerk|Foreman|Sentry|Gang Boss|Tax Collector|Prowler/.test(profile.nameFr)), 'plus de mots anglais dans les noms proposés');
});

test('D10 : valeurs imprimées du capitaine rôdeur (p. 12), du Drakenhund (p. 38), de la sorcière squelette et de Graug (p. 51)', () => {
  assert.deepEqual(byId('E0-P-365').stats, { M: 3, CC: 62, CT: 45, F: 31, E: 58, I: 46, Ag: 32, Dex: 44, Int: 45, FM: 49, Soc: 20 });
  assert.equal(byId('E0-P-365').wounds, 17);
  assert.deepEqual(byId('E0-P-369').stats, { M: 5, CC: 40, CT: null, F: 30, E: 35, I: 35, Ag: 15, Dex: null, Int: 15, FM: 10, Soc: 10 });
  assert.deepEqual(byId('E0-P-371').stats, { M: 6, CC: 45, CT: 20, F: 45, E: 40, I: 30, Ag: 20, Dex: 20, Int: 50, FM: 50, Soc: 30 });
  assert.deepEqual([byId('E0-P-372').wounds, byId('E0-P-372').stats.CC, byId('E0-P-372').stats.E, byId('E0-P-372').stats.Int], [88, 70, 80, null]);
});

test('D10 : espèces et natures', () => {
  assert.deepEqual(byId('E0-P-365').keywords, ['nain']);
  assert.deepEqual(byId('E0-P-370').keywords, ['fantome']);
  assert.deepEqual(byId('E0-P-371').keywords, ['sorciere', 'squelette']);
  assert.deepEqual(byId('E0-P-372').keywords, ['dragon', 'zombie']);
  assert.deepEqual(byId('E0-P-373').keywords, ['goule']);
  assert.deepEqual(byId('E0-P-383').keywords, ['vampire']);
});
});

describe('bestiaire L11', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L11.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D3 Imperial Zoo : 62 profils et 6 prétirés', () => {
  assert.equal(book.profiles.length, 68);
  assert.equal(book.profiles.filter(profile => profile.kind === 'pregenerated-character').length, 6);
  assert.equal(book.edition, 'V4');
  assert.ok(book.profiles.every(profile => profile.nameFr), 'chaque profil a un nom français (livre FR ou proposition)');
});

test('D3 : valeurs imprimées de l’Arachnarok, des Dragons des forêts et du Stirpike (pp. 13, 30, 36)', () => {
  const arachnarok = byId('E0-P-004');
  assert.deepEqual(arachnarok.stats, { M: 5, CC: 50, CT: 35, F: 55, E: 45, I: 20, Ag: 40, Dex: 30, Int: 35, FM: 45, Soc: 10 });
  assert.equal(arachnarok.wounds, 136);
  assert.deepEqual(arachnarok.armour, { ap: 3, printedTotal: 7 }, 'Armour 3 (7) : les deux chiffres imprimés');
  assert.deepEqual(arachnarok.attacks.map(a => [a.name, a.damage, a.trait]), [['Bite', 9, 'Bite'], ['Fangs', 9, 'Weapon']]);
  assert.deepEqual(arachnarok.specialRules, ['Vicious Webs']);
  const dragons = byId('E0-P-017');
  assert.deepEqual([dragons.wounds, dragons.size, dragons.armour.ap, dragons.armour.printedTotal], [104, 'enormous', 5, 11]);
  assert.deepEqual(dragons.traits.find(t => t.name === 'Fly'), { name: 'Fly', rating: '50', ref: 'E0-T-023' });
  const stirpike = byId('E0-P-021');
  assert.deepEqual([stirpike.wounds, stirpike.stats.M, stirpike.stats.Dex], [40, 8, null]);
  assert.deepEqual(stirpike.abilities, ['E0-T-112', 'E0-T-113'], 'capacités propres liées à l’inventaire');
});

test('D3 : les attaques glissées dans une liste de Traits gardent leur dégât (Grand loup, Griffon, Peau-loup)', () => {
  assert.deepEqual(byId('E0-P-007').attacks.map(a => [a.name, a.damage]), [['Fangs', 7]]);
  assert.deepEqual(byId('E0-P-011').attacks.map(a => [a.name, a.damage]), [['Hooked Beak', 9], ['Talons', 9]]);
  const skin = byId('E0-P-045');
  assert.deepEqual(skin.attacks.find(a => a.trait === 'Weapon').count, 2, '2x Weapon (Claws) +10');
});

test('D3 : une valeur suivie d’un astérisque est signalée sans changer la valeur imprimée', () => {
  const swarm = byId('E0-P-015');
  assert.deepEqual([swarm.stats.CC, swarm.wounds], [55, 60]);
  assert.deepEqual(swarm.starred, ['CC', 'wounds']);
});

test('D3 : prétirés — caractéristiques actuelles, Blessures, intitulés incohérents signalés sans correction', () => {
  const lyn = byId('E0-P-538');
  assert.deepEqual(lyn.stats, { M: 5, CC: 45, CT: 57, F: 36, E: 35, I: 55, Ag: 40, Dex: 57, Int: 41, FM: 38, Soc: 31 });
  assert.equal(lyn.wounds, 15);
  assert.equal(lyn.identity.titleMismatch, true, 'le formulaire dit « Kirsten Krank », le titre « Lynathryn Nightsong »');
  assert.equal(lyn.identity.formName, 'Kirsten Krank');
  assert.equal(lyn.name, 'Lynathryn Nightsong');
  assert.deepEqual(lyn.keywords, ['elfe-sylvain']);
  assert.equal(byId('E0-P-540').wounds, 19);
  assert.deepEqual(byId('E0-P-536').keywords, ['humain']);
  assert.ok(byId('E0-P-536').skillsPartial, 'compétences : seules les lignes recoupées par la fiche sont gardées');
  for (const record of book.profiles.filter(profile => profile.kind === 'pregenerated-character')) for (const skill of record.skills || []) assert.ok(skill.value >= 1, record.name);
});

test('D3 : mots-clés d’espèce et de nature', () => {
  assert.deepEqual(byId('E0-P-017').keywords, ['dragon']);
  assert.ok(byId('E0-P-054').keywords.includes('monstre-marin'));
  assert.ok(byId('E0-P-059').keywords.includes('fantome'));
  assert.ok(byId('E0-P-023').keywords.includes('skaven'));
});
});

describe('bestiaire L12', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L12.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);
const count = kind => book.profiles.filter(profile => profile.kind === kind).length;

test('D11 Tribes and Tribulations : 64 fiches, 49 profils et 15 gabarits, genre d\'inventaire conservé', () => {
  assert.equal(book.profiles.length, 64);
  assert.deepEqual([count('profile'), count('template'), count('pregenerated-character')], [49, 15, 0]);
  assert.equal(byId('E0-P-449').inventoryKind, 'profile');
  assert.ok(book.profiles.every(profile => profile.nameFr));
});

test('D11 : la Mégère troll des rivières est un gabarit en modificateurs, sans Blessures inventées', () => {
  const hag = byId('E0-P-449');
  assert.equal(hag.kind, 'template');
  assert.deepEqual(hag.modifiers, { F: 10, E: 10, I: 5, Int: 30, FM: 20 });
  assert.ok(!('stats' in hag) && !('wounds' in hag));
});

test('D11 : valeurs imprimées de Gorfang (p. 107) et de Matthogg (p. 78, titre rétabli)', () => {
  assert.deepEqual(byId('E0-P-455').stats, { M: 4, CC: 65, CT: 40, F: 65, E: 65, I: 45, Ag: 25, Dex: 20, Int: 40, FM: 60, Soc: 30 });
  assert.equal(byId('E0-P-455').wounds, 30);
  assert.deepEqual(byId('E0-P-455').keywords, ['orque']);
  assert.equal(byId('E0-P-438').name, 'Matthogg — Ogre Bruiser');
  assert.equal(byId('E0-P-438').wounds, 46);
  assert.deepEqual(byId('E0-P-438').keywords, ['ogre']);
});

test('D11 : aucune valeur recalculée sur le Gnoblar de base (p. 9)', () => {
  assert.deepEqual(byId('E0-P-393').stats, { M: 4, CC: 25, CT: 35, F: 25, E: 30, I: 30, Ag: 35, Dex: 30, Int: 25, FM: 18, Soc: 15 });
  assert.equal(byId('E0-P-393').wounds, 9);
});
});

describe('bestiaire L13', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L13.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);
const count = kind => book.profiles.filter(profile => profile.kind === kind).length;

test('D12 Up in Arms : 15 fiches, 9 profils et 6 gabarits, noms français proposés', () => {
  assert.equal(book.profiles.length, 15);
  assert.deepEqual([count('profile'), count('template'), count('pregenerated-character')], [9, 6, 0]);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.equal(byId('E0-P-459').nameFr, 'Monture demigriffon');
});

test('D12 : valeurs imprimées du Destrier (p. 29) et du Demigryph (p. 109), Dex absente = null', () => {
  assert.deepEqual(byId('E0-P-457').stats, { M: 4, CC: 35, CT: null, F: 50, E: 50, I: 20, Ag: 20, Dex: null, Int: 10, FM: 10, Soc: 30 });
  assert.equal(byId('E0-P-457').wounds, 32);
  assert.deepEqual(byId('E0-P-459').stats, { M: 7, CC: 55, CT: null, F: 55, E: 45, I: 40, Ag: 55, Dex: null, Int: 15, FM: 45, Soc: 15 });
  assert.equal(byId('E0-P-459').wounds, 34);
});

test('D12 : les gabarits sont des modificateurs signés, sans Blessures', () => {
  assert.deepEqual(byId('E0-P-467').modifiers, { M: -1, CC: -10, CT: -10, F: -5, E: -5, I: -10, Ag: -10, Dex: -10 });
  assert.deepEqual(byId('E0-P-470').modifiers, { F: 10, E: 10, Ag: 10 });
  assert.ok(!('stats' in byId('E0-P-470')) && !('wounds' in byId('E0-P-470')));
});
});

describe('bestiaire L14', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L14.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);
const count = kind => book.profiles.filter(profile => profile.kind === kind).length;

test('D13 Sea Wardens of Cothique : 20 profils, noms français proposés, Cothiqui en Haut elfe', () => {
  assert.equal(book.profiles.length, 20);
  assert.deepEqual([count('profile'), count('template'), count('pregenerated-character')], [20, 0, 0]);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.equal(byId('E0-P-487').nameFr, 'Lion blanc');
  assert.ok(byId('E0-P-472').keywords.includes('haut-elfe'));
  assert.deepEqual(byId('E0-P-488').keywords, ['monstre-marin']);
});

test('D13 : valeurs imprimées du Prince Dalloran, de Ceyluii (p. 63) et du Kraken (p. 82)', () => {
  assert.deepEqual(byId('E0-P-472').stats, { M: 5, CC: 85, CT: 45, F: 44, E: 30, I: 88, Ag: 75, Dex: 65, Int: 88, FM: 83, Soc: 75 });
  assert.equal(byId('E0-P-472').wounds, 18);
  assert.deepEqual(byId('E0-P-483').stats, { M: 4, CC: 50, CT: 53, F: 19, E: 35, I: 60, Ag: 88, Dex: 56, Int: 45, FM: 83, Soc: 51 });
  assert.equal(byId('E0-P-483').wounds, 1);
  assert.deepEqual(byId('E0-P-488').stats, { M: 6, CC: 45, CT: null, F: 80, E: 75, I: 35, Ag: 55, Dex: 35, Int: 10, FM: 65, Soc: null });
  assert.equal(byId('E0-P-488').wounds, 224);
});
});

describe('bestiaire L16', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L16.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);
const count = kind => book.profiles.filter(profile => profile.kind === kind).length;
const attacks = id => byId(id).attacks.map(attack => [attack.name, attack.damage]);

test('D14 Lords of Stone and Steel : 23 profils, noms français proposés, mots-clés', () => {
  assert.equal(book.profiles.length, 23);
  assert.deepEqual([count('profile'), count('template'), count('pregenerated-character')], [23, 0, 0]);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.equal(byId('E0-P-507').nameFr, 'Dragon de magma');
  assert.deepEqual(byId('E0-P-492').keywords, ['nain']);
  assert.deepEqual(byId('E0-P-503').keywords, ['nain']);
  assert.deepEqual(byId('E0-P-508').keywords, ['dragon']);
  assert.deepEqual(byId('E0-P-514').keywords, ['skaven']);
});

test('D14 : valeurs imprimées de Thorgrim (p. 7), Kazgar (p. 30) et du rat de la peste (p. 90)', () => {
  assert.deepEqual(byId('E0-P-492').stats, { M: 3, CC: 82, CT: 35, F: 65, E: 75, I: 26, Ag: 30, Dex: 48, Int: 65, FM: 85, Soc: 45 });
  assert.equal(byId('E0-P-492').wounds, 28);
  assert.deepEqual(byId('E0-P-492').armour, { ap: 7, printedTotal: 18 });
  assert.deepEqual(byId('E0-P-496').stats, { M: 3, CC: 65, CT: 45, F: 50, E: 60, I: 30, Ag: 25, Dex: 42, Int: 30, FM: 60, Soc: 25 });
  assert.equal(byId('E0-P-496').wounds, 23);
  assert.deepEqual(byId('E0-P-513').stats, { M: 4, CC: 35, CT: null, F: 30, E: 25, I: 25, Ag: 35, Dex: null, Int: 15, FM: 15, Soc: 11 });
  assert.equal(byId('E0-P-513').wounds, 5);
});

test('D14 : portée imprimée avant les dégâts, armure nommée, étiquette décalée et interligne double lus', () => {
  assert.deepEqual(attacks('E0-P-493'), [['Dwarf Crossbow', 10], ['Hammer of Azul', 14]]);
  assert.deepEqual(byId('E0-P-495').armour, { ap: 1, printedTotal: 5, detail: 'Leather Apron' });
  assert.deepEqual(attacks('E0-P-495'), [['Blunderbuss', 8], ['Dwarf Warhammer', 7]]);
  assert.deepEqual(attacks('E0-P-496'), [['Runic Greataxe', 12]]);
  assert.deepEqual(attacks('E0-P-512'), [['Swords', 7]]);
  assert.ok(byId('E0-P-502').skills.length > 0 && byId('E0-P-492').talents.length > 0);
});
});

describe('bestiaire L17', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L17.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);
const count = kind => book.profiles.filter(profile => profile.kind === kind).length;

test('D15 Winds of Magic : 21 profils, noms français proposés, mots-clés', () => {
  assert.equal(book.profiles.length, 21);
  assert.deepEqual([count('profile'), count('template'), count('pregenerated-character')], [21, 0, 0]);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.equal(byId('E0-P-524').nameFr, 'Élémentaire incarné de feu');
  assert.deepEqual(byId('E0-P-524').keywords, ['elementaire']);
  assert.deepEqual(byId('E0-P-532').keywords, ['demon']);
  assert.deepEqual(byId('E0-P-534').keywords, ['tzeentch', 'demon']);
  assert.deepEqual(byId('E0-P-521').keywords, ['humain']);
});

test('D15 : valeurs imprimées de l’Élémentaire de feu (p. 174), d’Egrimm van Horstmann (p. 210) et du Disque (p. 213)', () => {
  assert.deepEqual(byId('E0-P-524').stats, { M: 7, CC: 55, CT: null, F: 55, E: 55, I: 55, Ag: 55, Dex: 31, Int: null, FM: null, Soc: null });
  assert.equal(byId('E0-P-524').wounds, 80);
  assert.deepEqual(byId('E0-P-531').stats, { M: 4, CC: 62, CT: 31, F: 54, E: 62, I: 68, Ag: 70, Dex: 58, Int: 77, FM: 85, Soc: 45 });
  assert.equal(byId('E0-P-531').wounds, 25);
  assert.deepEqual(byId('E0-P-531').armour, { ap: 6, printedTotal: 12 });
  assert.equal(byId('E0-P-534').wounds, 26);
  assert.equal(byId('E0-P-534').stats.M, 1);
});

test('D15 : le Construct (p. 30) n’imprime aucune Blessures ; lectures corrigées par relecture de page', () => {
  const construct = byId('E0-P-515');
  assert.equal(construct.wounds, null);
  assert.equal(construct.woundsAbsent, true);
  assert.deepEqual(validateBestiaryRecord(construct), []);
  assert.notEqual(construct.wounds, 0);
  assert.deepEqual(validateBestiaryRecord({ ...construct, woundsAbsent: undefined }), ['Blessures invalides']);
  const lores = id => byId(id).skills.filter(skill => /^Lore/.test(skill.name)).map(skill => skill.name);
  assert.deepEqual(lores('E0-P-522'), ['Lore (Magic)', 'Lore (Reikland)', 'Lore (Warfare)']);
  assert.ok(lores('E0-P-531').includes('Lore (Tzeentch)'));
  assert.ok(!byId('E0-P-531').traits.some(trait => /Corruption y/.test(trait.name)));
});
});

describe('bestiaire L18', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L18.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D16 Power Behind the Throne Companion : 30 profils valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 30);
  assert.ok(book.profiles.every(profile => profile.kind === 'profile' && profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-544').nameFr, 'Hausmeister Breugal — Gouverneur humain, ancien conseiller (Or 3)');
  assert.equal(byId('E0-P-570').nameFr, 'Champions squelettes sans tête');
});

test('D16 : valeurs imprimées (Golthog p. 31, squelettes sans tête p. 119) et mots-clés', () => {
  assert.equal(byId('E0-P-542').wounds, 34);
  assert.deepEqual(byId('E0-P-542').keywords, ['ogre', 'soldat']);
  assert.deepEqual(byId('E0-P-571').stats, { M: 4, CC: 25, CT: 25, F: 30, E: 30, I: 20, Ag: 20, Dex: 25, Int: null, FM: null, Soc: null });
  assert.equal(byId('E0-P-571').wounds, 12);
  assert.equal(byId('E0-P-570').wounds, 13);
  assert.deepEqual(byId('E0-P-565').keywords, ['mort-vivant']);
  assert.deepEqual(byId('E0-P-567').keywords, ['mort-vivant']);
  assert.equal(byId('E0-P-565').stats.M, null);
});
});

describe('bestiaire L19', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L19.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D17 Middenheim : 41 profils dont un gabarit, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 41);
  assert.equal(book.profiles.filter(profile => profile.kind === 'template').length, 1);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-600').nameFr, 'Loup blanc');
  assert.equal(byId('E0-P-585').name, 'Emmille Münzstätter — Human Artisan (Silver 1)');
});

test('D17 : valeurs imprimées (Valgeir p. 52, Skrray p. 109, Liche p. 157) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-575').stats, { M: 4, CC: 60, CT: 46, F: 48, E: 45, I: 48, Ag: 33, Dex: 45, Int: 39, FM: 40, Soc: 42 });
  assert.equal(byId('E0-P-575').wounds, 16);
  assert.deepEqual(byId('E0-P-575').armour, { detail: 'Helm 2, Plate 3' });
  assert.deepEqual(byId('E0-P-592').stats, { M: 5, CC: 54, CT: 36, F: 47, E: 45, I: 60, Ag: 45, Dex: 41, Int: 45, FM: 42, Soc: 45 });
  assert.equal(byId('E0-P-592').armour.ap, 4);
  assert.deepEqual(byId('E0-P-592').keywords, ['skaven']);
  assert.deepEqual(byId('E0-P-612').keywords, ['mort-vivant']);
  assert.equal(byId('E0-P-612').wounds, 22);
  assert.deepEqual(byId('E0-P-597').keywords, ['elementaire']);
});

test('D17 : l’Enfant d’Ulric est un gabarit en modificateurs signés (Blessures +4), sans dégâts fixes inventés', () => {
  const child = byId('E0-P-598');
  assert.equal(child.kind, 'template');
  assert.deepEqual(child.modifiers, { M: 1, CC: 10, F: 10, E: 10, I: 10, Ag: 10, Dex: -10, Int: -10, Soc: -20, W: 4 });
  assert.equal(child.armour.detail, 'Hide 2');
  assert.equal(child.attacks, undefined);
  assert.equal(child.stats, undefined);
});
});

describe('bestiaire L20', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L20.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D18 Altdorf : 45 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 45);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-613').name, 'Thyrus Gormann — Wizard Lord (Gold 2)');
  assert.equal(byId('E0-P-632').name, 'Freya Husslhaus — Human Priest (Silver 1)');
  assert.equal(byId('E0-P-651').name, 'Count Jäger');
});

test('D18 : valeurs imprimées (Eckstein p. 65, Brochet p. 132, Honoria p. 137) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-621').stats, { M: 4, CC: 44, CT: 34, F: 31, E: 34, I: 43, Ag: 31, Dex: 47, Int: 63, FM: 34, Soc: 62 });
  assert.equal(byId('E0-P-621').wounds, 12);
  assert.deepEqual(byId('E0-P-640').stats, { M: 4, CC: 65, CT: 5, F: 62, E: 54, I: 35, Ag: 40, Dex: 5, Int: 18, FM: 45, Soc: 4 });
  assert.equal(byId('E0-P-640').wounds, 40);
  assert.equal(byId('E0-P-640').skills[0].value, 68);
  assert.deepEqual(byId('E0-P-643').stats, { M: 5, CC: 49, CT: 25, F: 45, E: 30, I: 55, Ag: 55, Dex: 35, Int: 22, FM: 35, Soc: 15 });
  assert.deepEqual(byId('E0-P-654').keywords, ['skaven']);
  assert.deepEqual(byId('E0-P-620').keywords, ['nain']);
});
});

describe('bestiaire L21', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L21.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D19 Empire in Ruins : 58 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 58);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-665').name, 'Flamers of Tzeentch');
  assert.equal(byId('E0-P-666').name, 'Agitator — Brass 2');
  assert.equal(byId('E0-P-668').name, 'Animated Furniture, Large');
  assert.equal(byId('E0-P-684').name, 'Renia Grünewald — Human Envoy (Silver 2)');
  assert.equal(byId('E0-P-693').name, 'Necrofex Colossus');
});

test('D19 : valeurs imprimées (Flamers p. 21, Colosse nécrofex p. 64, Mobilier p. 24) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-665').stats, { M: 6, CC: 40, CT: 65, F: 40, E: 40, I: 40, Ag: 30, Dex: null, Int: 35, FM: 55, Soc: 10 });
  assert.equal(byId('E0-P-665').wounds, 17);
  assert.equal(byId('E0-P-693').wounds, 176);
  assert.equal(byId('E0-P-668').wounds, 28);
  assert.deepEqual(byId('E0-P-665').keywords, ['demon']);
  assert.deepEqual(byId('E0-P-693').keywords, ['mort-vivant']);
  assert.deepEqual(byId('E0-P-668').keywords, ['artificiel']);
  assert.equal(byId('E0-P-660').keywords, undefined);
});
});

describe('bestiaire L22', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L22.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D20 The Horned Rat Companion : 43 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 43);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-740').name, 'Mila Raast — Yellow Fang Senior Cultist');
  assert.equal(byId('E0-P-747').name, 'Gimbrin Flintbeard — Dwarf King\'s Ghost');
});

test('D20 : valeurs imprimées (Seer p. 14, Hellbeast p. 28, Abyssal Terror p. 120) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-716').stats, { M: 5, CC: 55, CT: 30, F: 32, E: 58, I: 65, Ag: 38, Dex: 35, Int: 65, FM: 55, Soc: 43 });
  assert.equal(byId('E0-P-716').wounds, 18);
  assert.deepEqual(byId('E0-P-729').stats, { M: 6, CC: 45, CT: null, F: 55, E: 55, I: 35, Ag: 45, Dex: null, Int: 10, FM: 25, Soc: 15 });
  assert.equal(byId('E0-P-729').wounds, 68);
  assert.equal(byId('E0-P-756').wounds, 84);
  assert.deepEqual(byId('E0-P-716').keywords, ['skaven']);
  assert.deepEqual(byId('E0-P-733').keywords, ['rat']);
  assert.deepEqual(byId('E0-P-756').keywords, ['mort-vivant']);
  assert.deepEqual(byId('E0-P-758').keywords, ['mort-vivant', 'artificiel']);
  assert.equal(byId('E0-P-729').keywords, undefined);
});
});

describe('bestiaire L23', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L23.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D21 Enemy in Shadows Companion : 55 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 55);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-759').name, 'Donkey or Mule');
  assert.equal(byId('E0-P-768').name, 'Aleanora \'Al\' Shortbottom — Halfling Toll Keeper (Brass 5)');
  assert.equal(byId('E0-P-783').name, 'Albert Pförtner — Human Stevedore (Silver 1)');
});

test('D21 : valeurs imprimées (Cheval de trait p. 23, Furie du Chaos p. 84, Aleanora p. 41) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-761').stats, { M: 5, CC: 25, CT: null, F: 45, E: 45, I: 17, Ag: 25, Dex: null, Int: 10, FM: 10, Soc: 20 });
  assert.equal(byId('E0-P-761').wounds, 26);
  assert.deepEqual(byId('E0-P-788').stats, { M: 4, CC: 45, CT: 0, F: 45, E: 35, I: 45, Ag: 45, Dex: 20, Int: 25, FM: 25, Soc: 5 });
  assert.deepEqual(byId('E0-P-768').stats, { M: 3, CC: 22, CT: 54, F: 22, E: 38, I: 36, Ag: 35, Dex: 44, Int: 30, FM: 38, Soc: 44 });
  assert.equal(byId('E0-P-768').wounds, 9);
  assert.deepEqual(byId('E0-P-788').keywords, ['chaos', 'demon']);
  assert.deepEqual(byId('E0-P-765').keywords, ['cheval']);
  assert.deepEqual(byId('E0-P-768').keywords, ['halfling']);
  assert.equal(byId('E0-P-803').keywords, undefined);
});
});

describe('bestiaire L24', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L24.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D22 Rough Nights & Hard Days : 81 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 81);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-823').name, 'Friedrich von Pfeifraucher — Magnate (Gold 5)');
  assert.equal(byId('E0-P-832').name, 'Mercinellin \'Seedling\' Thorncobble XIII — Hustler (Brass 1)');
  assert.equal(byId('E0-P-835').name, 'Eberhardt von Dammenblatz — Noble Lord (Gold 7)');
  assert.equal(byId('E0-P-861').name, 'Hubkind\'s Mob (Brass 4)');
});

test('D22 : valeurs imprimées (Vipère impériale, Videur de sang, Coureur des égouts) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-836').stats, { M: 4, CC: 40, CT: null, F: 25, E: 35, I: 35, Ag: 35, Dex: null, Int: 5, FM: 45, Soc: null });
  assert.equal(byId('E0-P-836').wounds, 10);
  assert.deepEqual(byId('E0-P-843').stats, { M: 4, CC: 55, CT: 35, F: 45, E: 35, I: 60, Ag: 40, Dex: 30, Int: 25, FM: 75, Soc: 15 });
  assert.equal(byId('E0-P-843').wounds, 17);
  assert.deepEqual(byId('E0-P-894').stats, { M: 5, CC: 77, CT: 64, F: 43, E: 46, I: 72, Ag: 71, Dex: 54, Int: 37, FM: 36, Soc: 21 });
  assert.deepEqual(byId('E0-P-894').keywords, ['skaven']);
  assert.deepEqual(byId('E0-P-838').keywords, ['fantome']);
});
});

describe('bestiaire L25', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L25.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D23 Sea of Claws : 28 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 28);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-895').name, 'Ludolf Köhler — Imperial Sea Lord (Gold 3)');
  assert.equal(byId('E0-P-902').name, 'Huffer — Silver 1');
  assert.equal(byId('E0-P-904').name, 'Doktor — Silver 5');
});

test('D23 : valeurs imprimées (Köhler, Huffer, Syreen) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-895').stats, { M: 4, CC: 59, CT: 34, F: 37, E: 40, I: 49, Ag: 48, Dex: 54, Int: 44, FM: 32, Soc: 51 });
  assert.equal(byId('E0-P-895').wounds, 12);
  assert.deepEqual(byId('E0-P-902').stats, { M: 4, CC: 41, CT: 31, F: 31, E: 41, I: 41, Ag: 31, Dex: 31, Int: 31, FM: 36, Soc: 36 });
  assert.equal(byId('E0-P-902').wounds, 14);
  assert.deepEqual(byId('E0-P-912').keywords, ['mort-vivant']);
  assert.deepEqual(byId('E0-P-913').keywords, ['monstre-marin']);
});
});

describe('bestiaire L26', () => {
const book = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L26.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D24 Death on the Reik Companion : 62 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 62);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-927').name, 'Gertrud Schützenberger — Human River Recruit (Silver 1)');
  assert.equal(byId('E0-P-940').name, 'Eusapia Balacañon — Human Master Wizard (Gold 1)');
  assert.equal(byId('E0-P-946').name, 'Altgräfin Emelia Luneburg — Human Magnate (Gold 5)');
  assert.equal(byId('E0-P-984').name, 'Carrion');
});

test('D24 : valeurs imprimées (Roland, Carrion) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-935').stats, { M: 4, CC: 45, CT: 35, F: 53, E: 47, I: 33, Ag: 31, Dex: 33, Int: 32, FM: 36, Soc: 22 });
  assert.equal(byId('E0-P-935').wounds, 16);
  assert.deepEqual(byId('E0-P-984').stats, { M: 4, CC: 43, CT: null, F: 30, E: 30, I: 40, Ag: 30, Dex: null, Int: 10, FM: 30, Soc: null });
  assert.equal(byId('E0-P-984').wounds, 24);
  assert.deepEqual(byId('E0-P-984').keywords, ['mort-vivant']);
  assert.ok(!byId('E0-P-935').keywords.includes('cheval'));
  assert.ok(!byId('E0-P-960').keywords.includes('geant'));
});
});

describe('bestiaire — complément et inventaire', () => {
const inventory = JSON.parse(readFileSync(new URL('../../../docs/BESTIAIRE_INVENTAIRE.json', import.meta.url), 'utf8'));
const added = list => list.filter(entry => entry.addedOn === '2026-10-21');

test('E1 : le complément L18-L26 ajoute ses profils et ses capacités sans toucher aux 541 références existantes', () => {
  assert.equal(inventory.profiles.filter(entry => !entry.addedOn).length, 541);
  assert.equal(added(inventory.profiles).length, 443);
  assert.equal(inventory.traits.filter(entry => !entry.addedOn).length, 249);
  assert.ok(added(inventory.traits).length >= 35);
  const books = new Set(added(inventory.profiles).map(entry => entry.book));
  assert.deepEqual([...books].sort(), ['L18', 'L19', 'L20', 'L21', 'L22', 'L23', 'L24', 'L25', 'L26']);
});

test('E1 : identifiants uniques, capacités rattachées existantes, pages positives', () => {
  const ids = [...inventory.traits, ...inventory.profiles].map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  const traitIds = new Set(inventory.traits.map(entry => entry.id));
  for (const profile of added(inventory.profiles)) {
    assert.ok(profile.page > 0 && profile.physicalPage > 0, profile.id);
    assert.match(profile.blockKey, /^L\d\d:\d+:\d+$/);
    for (const ref of profile.abilityRefs) assert.ok(traitIds.has(ref), `${profile.id} → ${ref}`);
  }
  for (const trait of added(inventory.traits)) assert.ok(trait.summaryFr.length > 20 && trait.currentStatus === 'absent', trait.id);
});

test('E1 : chaque livre du complément a une ligne de couverture et les questions ouvertes sont comptées', () => {
  const coverage = added(inventory.coverage);
  assert.equal(coverage.length, 9);
  assert.equal(coverage.reduce((sum, entry) => sum + entry.profiles, 0), 443);
  assert.equal(inventory.counts.openQuestions, inventory.openQuestions.length);
  assert.equal(added(inventory.openQuestions).length, 4);
});
});
