import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSkill } from '../../../js/core/reference-catalog.js';
import { traitText } from '../../../js/core/bestiary-profiles.js';
import { applyOptionalChoices } from '../../../js/core/optional-traits.js';

const gele = valeur => { if (valeur && typeof valeur === 'object') { Object.values(valeur).forEach(gele); Object.freeze(valeur); } return valeur; };

const competence = (nom, total) => {
  const { entry } = resolveSkill(nom);
  return { name: nom, sourceName: nom, total, id: entry.id, group: entry.group, carac: entry.carac, status: 'resolved' };
};
const coche = (name, param = '', kind = 'trait') => ({ key: param ? `${name}:${param}` : name, name, param, kind, origin: 'optional' });
const profil = ({ traits = ['Night Vision'], caracs = {}, coches = [], attacks = [], armour = [], hp = 14, extra = {} } = {}) => gele({
  name: 'Bete', kind: 'Créature', initiative: 30, hp, maxHp: hp,
  caracs: { M: 4, CC: 40, CT: 30, F: 40, E: 40, I: 30, Ag: 30, Dex: 10, Int: 20, FM: 30, Soc: 10, ...caracs },
  armor: { head: 0, body: 1, arms: 0, legs: 0 },
  diceLines: [
    { id: 'a1', name: 'Bite', type: 'attack', attr: 'CC', base: 40, damage: 5, qualities: [], extensions: { v5: { kind: 'melee' } } },
    { id: 'a2', name: 'Spit', type: 'attack', attr: 'CT', base: 30, damage: 3, qualities: [], extensions: { v5: { kind: 'ranged' } } }
  ],
  skills: [competence('Calme', 30), competence('Esquive', 35), competence('Corps à corps (Base)', 40), competence('Corps à corps (Escrime)', 45)],
  talents: [], traits: [...traits], keywords: [],
  extensions: { v5: { optionalChoices: { traits: coches, attacks, armour } } }, ...extra
});
const change = (resultat, champ) => resultat.changes.find(item => item.field === champ);
const competenceDe = (resultat, nom) => resultat.profile.skills.find(item => item.name === nom);

describe('traits optionnels : sans coche (CA6)', () => {
  test('le profil d entrée est rendu tel quel, sans changement ni note', () => {
    const entree = profil();
    const sortie = applyOptionalChoices(entree);
    assert.equal(sortie.profile, entree);
    assert.deepEqual(sortie.changes, []);
    assert.deepEqual(sortie.notes, []);
  });
  test('un profil sans extensions ni coches est rendu tel quel', () => {
    const entree = gele({ name: 'X', caracs: { F: 30 }, traits: [] });
    assert.equal(applyOptionalChoices(entree).profile, entree);
    assert.equal(applyOptionalChoices(null).profile, null);
  });
});

describe('traits optionnels : Traits de D5 pris seuls (CA7, CA9, D13)', () => {
  test('Tough : E et FM +10, Blessures par la formule, compétence liée, valeur imprimée et modifiée', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Tough')] }));
    assert.equal(sortie.profile.caracs.E, 50);
    assert.equal(sortie.profile.caracs.FM, 40);
    assert.equal(sortie.profile.maxHp, 17);
    assert.equal(sortie.profile.hp, 17);
    assert.equal(competenceDe(sortie, 'Calme').total, 40);
    assert.ok(sortie.profile.traits.includes('Tough'));
    assert.deepEqual(change(sortie, 'E'), { field: 'E', printed: 40, effective: 50, source: 'Tough' });
    assert.deepEqual(change(sortie, 'Blessures'), { field: 'Blessures', printed: 14, effective: 17, source: 'Tough' });
  });
  test('Fast : M +1 et Ag +10, l Esquive suit', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Fast')] }));
    assert.equal(sortie.profile.caracs.M, 5);
    assert.equal(sortie.profile.caracs.Ag, 40);
    assert.equal(competenceDe(sortie, 'Esquive').total, 45);
    assert.equal(sortie.profile.maxHp, 14);
    assert.equal(change(sortie, 'Blessures'), undefined);
  });
  test('Big : F +10, E +10, Ag -5 ; dégâts de mêlée +1 (écart du BF), tirs inchangés, base de l attaque inchangée', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Big')] }));
    assert.deepEqual([sortie.profile.caracs.F, sortie.profile.caracs.E, sortie.profile.caracs.Ag], [50, 50, 25]);
    const morsure = sortie.profile.diceLines.find(ligne => ligne.name === 'Bite');
    const crachat = sortie.profile.diceLines.find(ligne => ligne.name === 'Spit');
    assert.equal(morsure.damage, 6);
    assert.equal(morsure.base, 40);
    assert.equal(crachat.damage, 3);
    assert.equal(sortie.profile.maxHp, 17);
  });
  test('Brute : M -1, Ag -10, F +10, E +10', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Brute')] }));
    assert.deepEqual([sortie.profile.caracs.M, sortie.profile.caracs.Ag, sortie.profile.caracs.F, sortie.profile.caracs.E], [3, 20, 50, 50]);
  });
  test('Clever : Int +20, I +10 ; l initiative suit I', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Clever')] }));
    assert.equal(sortie.profile.caracs.Int, 40);
    assert.equal(sortie.profile.caracs.I, 40);
    assert.equal(sortie.profile.initiative, 40);
    assert.deepEqual(change(sortie, 'Initiative'), { field: 'Initiative', printed: 30, effective: 40, source: 'Clever' });
  });
  test('Cunning : Soc +10, Int +10, I +10', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Cunning')] }));
    assert.deepEqual([sortie.profile.caracs.Soc, sortie.profile.caracs.Int, sortie.profile.caracs.I], [20, 30, 40]);
  });
  test('un Trait sans l impact d un modificateur ajoute seulement son texte (CA7 : Cornes, Furtif, Pisteur, Venin, Infravision)', () => {
    const cas = [['Horns', '2'], ['Stealthy', ''], ['Tracker', ''], ['Venom', '3'], ['Dark Vision', '']];
    for (const [nom, param] of cas) {
      const entree = profil({ coches: [coche(nom, param)] });
      const sortie = applyOptionalChoices(entree);
      assert.ok(sortie.profile.traits.includes(traitText(param ? { name: nom, rating: param } : { name: nom })), nom);
      assert.deepEqual(sortie.profile.caracs, entree.caracs, nom);
      assert.equal(sortie.profile.maxHp, entree.maxHp, nom);
      assert.deepEqual(sortie.profile.skills, entree.skills, nom);
      assert.deepEqual(sortie.profile.diceLines, entree.diceLines, nom);
      assert.deepEqual(sortie.changes, [], nom);
    }
  });
});

describe('traits optionnels : cumul, Traits déjà imprimés, décochage (CA10, CA11)', () => {
  test('Fast et Tough ensemble : les écarts s additionnent', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Fast'), coche('Tough')] }));
    assert.deepEqual([sortie.profile.caracs.M, sortie.profile.caracs.Ag, sortie.profile.caracs.E, sortie.profile.caracs.FM], [5, 40, 50, 40]);
    assert.equal(change(sortie, 'E').source, 'Tough');
  });
  test('Clever et Cunning ensemble : Int +30, I +20', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Clever'), coche('Cunning')] }));
    assert.equal(sortie.profile.caracs.Int, 50);
    assert.equal(sortie.profile.caracs.I, 50);
    assert.equal(change(sortie, 'I').source, 'Clever, Cunning');
  });
  test('un Trait de D5 déjà imprimé en base n a aucun effet', () => {
    const entree = profil({ traits: ['Night Vision', 'Tough'], coches: [coche('Tough')] });
    const sortie = applyOptionalChoices(entree);
    assert.deepEqual(sortie.profile.caracs, entree.caracs);
    assert.deepEqual(sortie.profile.traits, ['Night Vision', 'Tough']);
    assert.deepEqual(sortie.changes, []);
  });
  test('décocher rend exactement l imprimé', () => {
    const imprime = profil();
    const coche1 = applyOptionalChoices(profil({ coches: [coche('Tough'), coche('Big')] }));
    assert.notDeepEqual(coche1.profile.caracs, imprime.caracs);
    const decoche = applyOptionalChoices(profil({ coches: [] }));
    assert.deepEqual(decoche.profile, imprime);
  });
});

describe('traits optionnels : Hardy, Taille (D11, D16, D23)', () => {
  const hardy = traits => applyOptionalChoices(profil({ traits, coches: [coche('Hardy')] }));
  test('Hardy sur Taille Moyenne : + BE', () => {
    const sortie = hardy(['Night Vision']);
    assert.equal(sortie.profile.maxHp, 18);
    assert.deepEqual(sortie.profile.caracs, profil().caracs);
    assert.deepEqual(change(sortie, 'Blessures'), { field: 'Blessures', printed: 14, effective: 18, source: 'Hardy' });
  });
  test('Hardy sur Taille Petite : + BE', () => {
    assert.equal(hardy(['Size (Small)']).profile.maxHp, 18);
  });
  test('Hardy sur Taille Grande : + BE × 2', () => {
    assert.equal(hardy(['Size (Large)']).profile.maxHp, 22);
  });
  test('Hardy sans F, E ou FM : Blessures inchangées et une note', () => {
    const entree = gele({ ...profil({ coches: [coche('Hardy')] }), caracs: { M: 4, CC: 40, E: 40, FM: 30 } });
    const sortie = applyOptionalChoices(entree);
    assert.equal(sortie.profile.maxHp, 14);
    assert.ok(sortie.notes.some(note => /Blessures/.test(note) && /F/.test(note)), sortie.notes.join('|'));
    assert.ok(sortie.profile.traits.includes('Hardy'));
  });
  test('Taille Grande cochée sur une créature Moyenne : Blessures par différence de formules, le Trait Size est remplacé', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Size', 'Large', 'size')] }));
    assert.equal(sortie.profile.maxHp, 29);
    assert.deepEqual(sortie.profile.traits.filter(texte => /^Size/.test(texte)), ['Size (Large)']);
    assert.deepEqual(change(sortie, 'Taille'), { field: 'Taille', printed: 'Moyenne', effective: 'Grande', source: 'Size' });
  });
  test('Taille Grande cochée sur une créature Petite : un seul Trait Size, Blessures recalculées par différence', () => {
    const sortie = applyOptionalChoices(profil({ traits: ['Size (Small)'], coches: [coche('Size', 'Large', 'size')] }));
    assert.deepEqual(sortie.profile.traits, ['Size (Large)']);
    assert.equal(sortie.profile.maxHp, 36);
  });
  test('Hardy et Taille Grande ensemble : formule avec Hardy et nouvelle Taille contre formule imprimée', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Hardy'), coche('Size', 'Large', 'size')] }));
    assert.equal(sortie.profile.maxHp, 14 + (4 + 3 * 4 + 3) * 2 - 15);
  });
});

describe('traits optionnels : Trained (War) (D6, CA15)', () => {
  test('Guerre : CC +10, base des attaques de mêlée et compétences de CC suivent, tirs inchangés', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Trained', 'War', 'trained')] }));
    assert.equal(sortie.profile.caracs.CC, 50);
    assert.equal(sortie.profile.diceLines.find(ligne => ligne.name === 'Bite').base, 50);
    assert.equal(sortie.profile.diceLines.find(ligne => ligne.name === 'Spit').base, 30);
    assert.equal(competenceDe(sortie, 'Corps à corps (Base)').total, 50);
    assert.deepEqual(sortie.profile.traits, ['Night Vision', 'Trained (War)']);
    assert.equal(sortie.profile.maxHp, 14);
  });
  test('Dressé fusionné en un seul texte avec les dressages imprimés', () => {
    const sortie = applyOptionalChoices(profil({ traits: ['Trained (Broken, Mount)'], coches: [coche('Trained', 'War', 'trained'), coche('Trained', 'Magic', 'trained')] }));
    assert.deepEqual(sortie.profile.traits, ['Trained (Broken, Mount, War, Magic)']);
    assert.equal(sortie.profile.caracs.CC, 50);
  });
  test('un dressage autre que Guerre ne change aucune caractéristique', () => {
    const entree = profil({ coches: [coche('Trained', 'Mount', 'trained')] });
    const sortie = applyOptionalChoices(entree);
    assert.deepEqual(sortie.profile.caracs, entree.caracs);
    assert.deepEqual(sortie.profile.traits, ['Night Vision', 'Trained (Mount)']);
  });
  test('Guerre déjà imprimé : aucun effet', () => {
    const entree = profil({ traits: ['Trained (War)'], coches: [coche('Trained', 'War', 'trained')] });
    const sortie = applyOptionalChoices(entree);
    assert.equal(sortie.profile.caracs.CC, 40);
    assert.deepEqual(sortie.profile.traits, ['Trained (War)']);
  });
});

describe('traits optionnels : modèles V5 Elite et Leader (D19, D20, D21)', () => {
  test('Elite : caractéristiques du modèle, jamais les valeurs du Trait V4', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Elite')] }));
    const c = sortie.profile.caracs;
    assert.deepEqual([c.CC, c.F, c.E, c.I, c.FM], [55, 55, 55, 45, 45]);
    assert.equal(c.CT, 30);
    assert.equal(sortie.profile.initiative, 45);
    assert.ok(sortie.profile.traits.includes('Elite'));
  });
  test('Elite : Blessures par différence de formules (BF 5, BE 5, BFM 4 contre 4, 4, 3)', () => {
    assert.equal(applyOptionalChoices(profil({ coches: [coche('Elite')] })).profile.maxHp, 18);
  });
  test('Elite : compétences = ancien total + écart de la caractéristique + bonus ; compétence absente = caractéristique modifiée + bonus', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Elite')] }));
    assert.equal(competenceDe(sortie, 'Calme').total, 60);
    assert.equal(competenceDe(sortie, 'Esquive').total, 50);
    assert.equal(competenceDe(sortie, 'Intimidation').total, 65);
    assert.equal(competenceDe(sortie, 'Commandement').total, 15);
    assert.equal(competenceDe(sortie, 'Perception').total, 60);
    assert.equal(competenceDe(sortie, 'Corps à corps (Base)').total, 70);
    assert.equal(competenceDe(sortie, 'Corps à corps (Escrime)').total, 75);
    assert.equal(competenceDe(sortie, 'Intimidation').carac, 'f');
  });
  test('Elite : Talents ajoutés avec leurs clés', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Elite')] }));
    assert.deepEqual(sortie.profile.talents.map(talent => talent.id), ['talent-combat-aware', 'talent-combat-reflexes', 'talent-resolute']);
  });
  test('Elite : un Talent déjà tenu n est pas ajouté deux fois', () => {
    const entree = gele({ ...profil({ coches: [coche('Elite')] }), talents: [{ name: 'Vigilance', id: 'talent-combat-aware', rank: 1, status: 'resolved' }] });
    const sortie = applyOptionalChoices(entree);
    assert.equal(sortie.profile.talents.filter(talent => talent.id === 'talent-combat-aware').length, 1);
    assert.equal(sortie.profile.talents.length, 3);
  });
  test('Elite sur un profil sans compétence de corps à corps : Corps à corps (Base) ajouté', () => {
    const entree = gele({ ...profil({ coches: [coche('Elite')] }), skills: [] });
    const sortie = applyOptionalChoices(entree);
    assert.equal(competenceDe(sortie, 'Corps à corps (Base)').total, 70);
    assert.equal(sortie.profile.skills.filter(skill => skill.group === 'Corps à corps').length, 1);
  });
  test('Elite sur une bête sans CT : appliqué, rien d inventé', () => {
    const entree = profil({ caracs: { CT: null }, coches: [coche('Elite')] });
    const sortie = applyOptionalChoices(entree);
    assert.equal(sortie.profile.caracs.CC, 55);
    assert.ok(!('CT' in sortie.profile.caracs) || sortie.profile.caracs.CT === null);
  });
  test('Leader : modèle Lieutenant, +20 partout et Soc +10', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Leader')] }));
    const c = sortie.profile.caracs;
    assert.deepEqual([c.CC, c.CT, c.F, c.E, c.I, c.Ag, c.FM, c.Soc], [60, 50, 60, 60, 50, 50, 50, 20]);
    assert.equal(sortie.profile.talents.length, 6);
    assert.equal(competenceDe(sortie, 'Savoir (Guerre)').total, 20 + 10);
    assert.equal(competenceDe(sortie, 'Calme').total, 30 + 20 + 15);
  });
  test('Leader sur un profil sans CT : CT jamais inventée, signalée en note', () => {
    const sortie = applyOptionalChoices(profil({ caracs: { CT: null }, coches: [coche('Leader')] }));
    assert.equal(sortie.profile.caracs.CC, 60);
    assert.ok(sortie.profile.caracs.CT === null || !('CT' in sortie.profile.caracs));
    assert.ok(sortie.notes.some(note => /CT/.test(note)), sortie.notes.join('|'));
  });
  test('Leader refusé sur une créature Bestial : sans effet, avec une note', () => {
    const entree = profil({ traits: ['Bestial'], coches: [coche('Leader')] });
    const sortie = applyOptionalChoices(entree);
    assert.deepEqual(sortie.profile.caracs, entree.caracs);
    assert.ok(sortie.notes.some(note => /Bestial/.test(note)));
  });
});

describe('traits optionnels : attaques et armures cochées (CA21)', () => {
  const action = { id: 'x1', name: 'Claws', type: 'attack', attr: 'CC', base: 40, damage: 7, qualities: [], extensions: { v5: { kind: 'melee' } } };
  test('une attaque cochée entre dans diceLines, avec le suivi des caractéristiques', () => {
    const sortie = applyOptionalChoices(profil({ coches: [coche('Big')], attacks: [{ name: 'Claws', actions: [action] }] }));
    const griffes = sortie.profile.diceLines.find(ligne => ligne.name === 'Claws');
    assert.ok(griffes);
    assert.equal(griffes.damage, 8);
    assert.equal(sortie.profile.diceLines.length, 3);
  });
  test('une pièce d armure cochée prend le maximum par zone', () => {
    const sortie = applyOptionalChoices(profil({ armour: [{ name: 'Casque', part: {}, zones: { head: 2, body: 0, arms: 0, legs: 0 } }, { name: 'Cotte', part: {}, zones: { head: 0, body: 3, arms: 1, legs: 0 } }] }));
    assert.deepEqual(sortie.profile.armor, { head: 2, body: 3, arms: 1, legs: 0 });
    assert.deepEqual(change(sortie, 'Armure (corps)'), { field: 'Armure (corps)', printed: 1, effective: 3, source: 'Cotte' });
  });
  test('une armure moins haute que l imprimée ne la diminue pas', () => {
    const sortie = applyOptionalChoices(profil({ armour: [{ name: 'Cuir', part: {}, zones: { head: 0, body: 0, arms: 0, legs: 0 } }] }));
    assert.equal(sortie.profile.armor.body, 1);
  });
});

describe('traits optionnels : entrées gelées', () => {
  test('aucune entrée n est modifiée, quelles que soient les coches', () => {
    const entree = profil({ coches: [coche('Big'), coche('Hardy'), coche('Elite'), coche('Trained', 'War', 'trained'), coche('Size', 'Large', 'size')] });
    const avant = JSON.stringify(entree);
    assert.doesNotThrow(() => applyOptionalChoices(entree));
    assert.equal(JSON.stringify(entree), avant);
  });
});
