import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../../../js/core/store.js';
import { parseProfileJson, PROFILE_JSON_EXAMPLE } from '../../../js/core/json-profile-import.js';
import { exportProfileJson, exportProfilesJson } from '../../../js/core/json-profile-export.js';
import { resolveSkill, resolveTalent } from '../../../js/core/reference-catalog.js';
import { resolveDivineAccess } from '../../../js/core/v5-divine-access.js';
import { readdirSync } from 'node:fs';
import { CREATURE_TRAIT_NAMES } from '../../../js/data/creature-trait-names.js';
import registry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };

const read = path => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
const COMPLETS = read('docs/recette/profils-recette-complets.json');
const SIMPLES = read('docs/recette/profils-recette.json');
const complets = JSON.parse(COMPLETS).profils;
const CARAC_OF = { cc: 'CC', ct: 'CT', f: 'F', e: 'E', i: 'I', ag: 'Ag', dex: 'Dex', int: 'Int', fm: 'FM', soc: 'Soc' };

/** Importe un texte JSON dans un Store neuf, ajoute tous les profils à la rencontre et rend les participants par nom. */
async function intoCombat(text) {
  const parsed = parseProfileJson(text);
  const store = createStore();
  await store.ready;
  await store.importParsedProfiles(parsed.profiles);
  await store.addProfilesToCombat(store.listProfiles().map(profile => profile.id), { zone: 'active' });
  return { parsed, store, byName: name => store.listParticipants().find(participant => participant.name === name) };
}
const importOne = text => parseProfileJson(text);
const warningsOf = result => result.errors.map(error => error.message || `${error.field} ${error.reason}`);

describe('Import JSON : les 21 profils complets de la recette', () => {
  test('ils s’importent prêts, sans avertissement', () => {
    const result = importOne(COMPLETS);
    assert.equal(result.profiles.length, 21);
    assert.deepEqual(warningsOf(result), []);
    assert.deepEqual(result.unknownQualities, []);
    assert.equal(result.status, 'ready');
  });

  test('dans un Store neuf, chacun présente ses talents, compétences, sorts, prières, Destin, Résilience, Fortune, Corruption et Péchés', async () => {
    const { store, byName } = await intoCombat(COMPLETS);
    const access = { schemaVersion: 1, grants: [] };
    for (const raw of complets) {
      const actor = byName(raw.nom);
      assert.ok(actor, raw.nom);
      for (const talent of raw.talents || []) {
        const found = resolveTalent(talent.specialisation ? `${talent.nom} (${talent.specialisation})` : talent.nom);
        const row = actor.talents.find(item => item.id === found.entry.id && (item.specialization || null) === (found.specialization || null));
        assert.ok(row, `${raw.nom} : talent ${talent.nom}`);
        assert.equal(row.rank, talent.rang || 1, `${raw.nom} : rang de ${talent.nom}`);
        assert.equal(row.status, 'resolved');
      }
      for (const skill of raw.competences || []) {
        const row = actor.skills.find(item => item.name === skill.nom);
        const carac = CARAC_OF[resolveSkill(skill.nom, { owned: true }).entry.carac] || resolveSkill(skill.nom, { owned: true }).entry.carac;
        assert.equal(row?.total, raw.caracteristiques[carac] + skill.avances, `${raw.nom} : ${skill.nom}`);
      }
      assert.deepEqual((actor.spells || []).map(spell => spell.nom), raw.sorts || [], `${raw.nom} : sorts`);
      assert.deepEqual((actor.prayers || []).map(prayer => prayer.nom), raw.prieres || [], `${raw.nom} : prières`);
      const v5 = actor.extensions?.v5 || {};
      if (raw.destin !== undefined) assert.equal(v5.fate, raw.destin, `${raw.nom} : Destin`);
      if (raw.resilience !== undefined) assert.equal(v5.resilience, raw.resilience, `${raw.nom} : Résilience`);
      if (raw.fortune !== undefined) assert.equal(store.getFortune(actor.id).sourceBalance, raw.fortune, `${raw.nom} : Fortune`);
      if (raw.corruption !== undefined) assert.equal(v5.corruptionPoints, raw.corruption, `${raw.nom} : Corruption`);
      if (raw.peches !== undefined) assert.equal(v5.divine?.sin, raw.peches, `${raw.nom} : Péchés`);
      // Prêtres : chaque Bénédiction et chaque Miracle du culte est accessible par la fiche.
      if (raw.prieres) {
        const cult = raw.talents[0].specialisation;
        const refused = registry.contracts.filter(contract => contract.requiredTalent.specialization === cult)
          .filter(contract => resolveDivineAccess(access, { actor, subjectKey: `instance:${actor.id}`, contract }).mode !== 'sheet');
        assert.deepEqual(refused.map(contract => contract.name).filter(name => (raw.prieres || []).includes(name) || /^Bénédiction/.test(name)), [], `${raw.nom} : accès divin`);
      }
    }
    assert.equal(byName('Recette Mage Œil de la tempête').talents.find(item => item.id === 'talent-eye-of-the-storm').rank, 2);
    assert.equal(store.listProfiles().find(profile => profile.name === 'Recette Deux armes').diceLines.length, 2);
  });

  test('un profil importé reste modifiable : ni lien de fiche, ni champ verrouillé, PV et Initiative du JSON conservés', async () => {
    const { parsed, byName } = await intoCombat(COMPLETS);
    const raw = complets.find(item => item.nom === 'Recette Prêtre de Ulric');
    const actor = byName(raw.nom);
    assert.equal(actor.extensions?.ficheId, undefined);
    assert.equal(actor.hp, raw.pv);
    assert.equal(actor.initiative, raw.initiative);
    assert.deepEqual(actor.caracs, raw.caracteristiques);
    assert.ok(parsed.profiles.filter(profile => profile.talents || profile.skills || profile.spells).every(profile => profile.ficheSnapshot?.resources || profile.ficheSnapshot?.coverage));
  });
});

describe('Import JSON : chaque copie en combat a sa propre identité', () => {
  test('Fortune et Corruption de deux copies d’un même profil restent indépendantes, ainsi que le profil de réserve', async () => {
    const parsed = parseProfileJson(JSON.stringify({ nom: 'Double', pv: 10, caracteristiques: { FM: 40, E: 30 }, fortune: 3, corruption: 2, talents: ['Combat instinctif'] }));
    assert.deepEqual(warningsOf(parsed), []);
    let saved = null;
    const store = createStore({ persistence: { load: async () => structuredClone(saved), saveAtomic: async input => { saved = structuredClone(input.state); return { ok: true }; } } });
    await store.ready;
    await store.importParsedProfiles(parsed.profiles);
    const [profile] = store.listProfiles();
    await store.addProfilesToCombat([profile.id, profile.id], { zone: 'active' });
    const [one, two] = store.listParticipants();
    assert.notEqual(one.id, two.id);
    await store.setFortune(one.id, 1);
    assert.notEqual(store.getFortune(one.id).characterId, store.getFortune(two.id).characterId);
    assert.notEqual(store.getFortune(one.id).balance, store.getFortune(two.id).balance);
    await store.setCorruptionPoints(one.id, 7, { reason: 'essai' });
    const points = id => store.listParticipants().find(item => item.id === id).extensions.v5.corruptionPoints;
    assert.equal(points(one.id), 7);
    assert.equal(points(two.id), 2);
    assert.equal(store.getProfile(profile.id).extensions.v5.corruptionPoints, 2);
    assert.equal(store.getProfile(profile.id).ficheSnapshot.charId, '');
  });
});

describe('Import JSON : l’archer de la recette (G-ARM-2)', () => {
  test('arc elfique, arc d’Anirain et arbalète du catalogue donnent leurs jets, liés à la compétence', async () => {
    const { parsed, byName } = await intoCombat(read('docs/recette/profils-recette-arcs.json'));
    assert.deepEqual(warningsOf(parsed), []);
    const archer = byName('Recette Archer');
    assert.deepEqual(archer.equipment.map(item => item.name), ['Arc elfique (2M)', "Arc d'Anirain Haut Elfe", 'Arbalète (2M)', 'Calotte de cuir']);
    const profile = parsed.profiles[0];
    assert.deepEqual(profile.actions.map(action => [action.note, action.base]), [['Arc elfique (2M)', 60], ["Arc d'Anirain Haut Elfe", 60], ['Arbalète (2M)', 50]]);
    assert.equal(archer.armorLocations.head, 1);
  });
});

describe('Import JSON : les 13 profils simples restent identiques', () => {
  test('même résultat qu’avant l’ajout des clés de fiche', () => {
    const result = importOne(SIMPLES);
    const before = JSON.parse(read('tests/fixtures/profils-recette-import.json'));
    assert.equal(result.status, before.status);
    assert.deepEqual(JSON.parse(JSON.stringify(result.profiles)), before.profiles);
    assert.deepEqual(result.errors, before.errors);
    assert.deepEqual(result.unknownQualities, before.unknownQualities);
  });
});

describe('Import JSON : clés françaises, alias et clés anglaises', () => {
  const base = { nom: 'Essai', pv: 10, caracteristiques: { CC: 40, CT: 40, FM: 40, Soc: 40, Ag: 40 } };

  test('casse, accents, espaces et tirets sont sans effet sur les clés ; les alias anglais valent les clés françaises', () => {
    const french = importOne(JSON.stringify({ ...base, Compétences: [{ Nom: 'Prière', Avances: 5 }], 'TALENTS': [{ nom: 'Béni', 'Spécialisation': 'Ulric' }], 'Sorts': ['Purification'], 'prières': ['Morsure du loup'], 'Fortune': 2, 'Destin': 1, 'Résilience': 1, 'Corruption': 3, 'Péchés': 1, Traits: ['Grim'], Taille: 'Grande' }));
    assert.deepEqual(warningsOf(french), []);
    const profile = french.profiles[0];
    assert.equal(profile.skills.find(skill => skill.name === 'Prière').total, 45);
    assert.equal(profile.talents[0].id, 'talent-bless');
    assert.deepEqual(profile.spells.map(spell => spell.nom), ['Purification']);
    assert.deepEqual(profile.prayers.map(prayer => prayer.nom), ['Morsure du loup']);
    assert.deepEqual([profile.extensions.v5.fate, profile.extensions.v5.resilience, profile.extensions.v5.corruptionPoints, profile.extensions.v5.divine.sin, profile.ficheSnapshot.resources.fortune], [1, 1, 3, 1, 2]);
    assert.deepEqual(profile.extensions.traits, ['Grim', 'Taille (Grande)']);
    // Alias anglais des clés à valeur simple : mêmes données.
    const english = importOne(JSON.stringify({ ...base, Compétences: [{ Nom: 'Prière', Avances: 5 }], 'TALENTS': [{ nom: 'Béni', 'Spécialisation': 'Ulric' }], 'Sorts': ['Purification'], 'prières': ['Morsure du loup'], chance: 2, fate: 1, resilience: 1, corruption: 3, sin: 1, traits: ['Grim'], size: 'Grande' }));
    const strip = value => JSON.parse(JSON.stringify({ ...value, ficheSnapshot: { ...value.ficheSnapshot, charId: null, source: null } }));
    assert.deepEqual(strip(english.profiles[0]), strip(profile));
  });

  test('les listes écrites sous leurs clés anglaises (sauvegardes) sont reprises telles quelles quand elles ont la forme interne', () => {
    const data = { ...base, talents: [{ id: 'talent-eye-of-the-storm', name: 'Œil de la tempête', status: 'resolved', rank: 2 }, { id: 'talent-hardy', name: 'Dur à cuire', status: 'resolved', rank: 2 }], skills: [], spells: [{ nom: 'Sort maison' }], prayers: [{ nom: 'Prière maison' }] };
    const result = importOne(JSON.stringify(data));
    assert.deepEqual(warningsOf(result), []);
    for (const field of ['talents', 'skills', 'spells', 'prayers']) assert.deepEqual(result.profiles[0][field], data[field], field);
    assert.equal(result.profiles[0].ficheSnapshot, undefined);
  });

  test('sous les clés anglaises, seule la forme interne reconnaissable est reprise ; le reste est validé comme sous les clés françaises', () => {
    const result = importOne(JSON.stringify({ ...base, spells: ['Purification', 'Brise os'], prayers: ['Morsure du louf', { nom: 'Prière maison' }], talents: ['Combat instinctif', { name: 'Oeil de la tempete', rank: 2 }, { id: 'talent-hardy', name: 'Dur à cuire', rank: 1, status: 'resolved' }], skills: [{ name: 'Priere', advances: 3 }, 7, ''] }));
    const text = warningsOf(result).join(' | ');
    assert.match(text, /Sort inconnu : « Brise os » — vouliez-vous « Brise-os »/);
    assert.match(text, /Prière inconnue : « Morsure du louf » — vouliez-vous « Morsure du loup »/);
    assert.match(text, /Talent inconnu : « Oeil de la tempete » — vouliez-vous « Œil de la tempête »/);
    assert.match(text, /Compétence inconnue : « Priere »/);
    assert.equal(result.errors.filter(error => error.field === 'compétences' && error.reason === 'texte-attendu').length, 2, 'élément numérique et élément vide signalés');
    const profile = result.profiles[0];
    assert.ok(profile.spells.some(spell => spell.nom === 'Purification'));
    assert.ok(profile.prayers.some(prayer => prayer.nom === 'Prière maison'), 'objet { nom } repris tel quel');
    assert.ok(profile.talents.some(talent => talent.id === 'talent-combat-reflexes'), 'la chaîne en tête de liste n’est pas perdue');
    assert.ok(profile.talents.some(talent => talent.id === 'talent-hardy'), 'objet interne repris');
  });

  test('la forme interne n’est reconnue que sous la clé anglaise et avec ses champs internes ; un id ne dispense pas de la validation', () => {
    const talent = importOne(JSON.stringify({ ...base, talents: [{ id: 't1', nom: 'Combat instincif' }] }));
    assert.match(warningsOf(talent).join(' | '), /Talent inconnu : « Combat instincif » — vouliez-vous « Combat instinctif »/);
    const skill = importOne(JSON.stringify({ ...base, competences: [{ id: 's', nom: 'Priere', avances: 2 }] }));
    assert.match(warningsOf(skill).join(' | '), /Compétence inconnue : « Priere » — vouliez-vous « Prière »/);
    const ok = importOne(JSON.stringify({ ...base, talents: [{ id: 't1', nom: 'Combat instinctif' }] }));
    assert.ok(ok.profiles[0].talents.some(row => row.id === 'talent-combat-reflexes'), 'résolu, pas brut');
    const equipment = importOne(JSON.stringify({ ...base, equipement: [{ id: 'x', baseId: 'y', nom: 'Arbalete (2M)' }] }));
    assert.match(warningsOf(equipment).join(' | '), /Objet inconnu : « Arbalete \(2M\) »/);
  });

  test('un talent donné en texte et en forme interne est fusionné (rang le plus haut) et signalé', () => {
    const result = importOne(JSON.stringify({ ...base, talents: ['Dur à cuire', { id: 'talent-hardy', name: 'Dur à cuire', rank: 2, status: 'resolved' }] }));
    const rows = result.profiles[0].talents.filter(row => row.id === 'talent-hardy');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].rank, 2);
    assert.match(warningsOf(result).join(' | '), /Talent en double : « Dur à cuire »/);
  });

  test('une liste mixte garde son ordre d’origine', () => {
    const result = importOne(JSON.stringify({ ...base, spells: [{ nom: 'Maison' }, 'Purification', { nom: 'Autre maison' }, 'Brise-os'] }));
    assert.deepEqual(result.profiles[0].spells.map(spell => spell.nom), ['Maison', 'Purification', 'Autre maison', 'Brise-os']);
  });

  test('une clé française et sa clé anglaise ensemble sont signalées', () => {
    const result = importOne(JSON.stringify({ ...base, competences: ['Prière'], skills: [], sorts: ['Purification'], spells: [{ nom: 'Purification' }] }));
    assert.deepEqual(result.errors.map(error => error.reason), ['cles-concurrentes', 'cles-concurrentes']);
    assert.match(result.errors[0].message, /« competences » et « skills »/);
  });

  test('compétence ou arme sans caractéristique pour calculer sa base : signalé', () => {
    const missing = importOne(JSON.stringify({ nom: 'Sans FM', pv: 10, caracteristiques: { CC: 40 }, competences: [{ nom: 'Prière', avances: 10 }, { nom: 'Calme', avances: 5 }] }));
    const text = warningsOf(missing).join(' | ');
    assert.match(text, /Caractéristique Soc manquante pour la compétence « Prière »/);
    assert.match(text, /Caractéristique FM manquante pour la compétence « Calme »/);
    assert.equal(missing.status, 'needs-review');
    const weapon = importOne(JSON.stringify({ nom: 'Archer sans compétence', pv: 10, caracteristiques: { CC: 40, CT: 40 }, equipement: ['Arc elfique (2M)'] }));
    assert.match(warningsOf(weapon).join(' | '), /Arme « Arc elfique \(2M\) » : aucune compétence liée avec une base/);
  });

  test('détails signalés : objet avec suggestion non ajouté, Trait objet à clé en trop, Taille concurrente, Mouvement et espèce, spécialisation perdue', () => {
    const text = extra => warningsOf(importOne(JSON.stringify({ ...base, ...extra }))).join(' | ');
    assert.match(text({ equipement: ['Arbalete (2M)'] }), /vouliez-vous « Arbalète \(2M\) » \? ; non ajouté/);
    assert.match(text({ traits: [{ nom: 'Peur', valeur: 2, couleur: 'rouge' }] }), /traits · couleur/);
    assert.match(text({ traits: ['Taille (Petite)'], taille: 'Grande' }), /« taille » ignorée : les traits donnent déjà « Taille \(Petite\) »/);
    assert.match(text({ mouvement: 'vite' }), /mouvement/);
    assert.match(text({ mouvement: -2 }), /mouvement/);
    assert.match(text({ espece: 12 }), /espece|espèce/);
    assert.equal(importOne(JSON.stringify({ ...base, espece: 'nain', mouvement: 3 })).status, 'ready');
    assert.match(text({ talents: [{ nom: 'Combat instinctif', specialisation: 'Foo' }] }), /Combat instinctif.*n’a pas de spécialisation.*« Foo » ignorée/);
    assert.match(text({ talents: [{ nom: 'Béni', specialisation: 7 }] }), /spécialisation/);
  });

  test('rang, doublons de talent et talents sans spécialisation', () => {
    const result = importOne(JSON.stringify({ ...base, talents: ['Combat instinctif', { nom: 'Combat instinctif', rang: 2 }, 'Béni'] }));
    assert.equal(result.profiles[0].talents.find(item => item.id === 'talent-combat-reflexes').rank, 3);
    assert.match(warningsOf(result).join('\n'), /Béni.*spécialisation/);
  });

  test('équipement du catalogue par nom : arcs elfique et d’Anirain, arbalète, armure ; homonymes départagés par la catégorie', () => {
    const result = importOne(JSON.stringify({ ...base, competences: [{ nom: 'Projectiles (Arc)', avances: 10 }], equipement: ['Arc elfique (2M)', "Arc d'Anirain Haut Elfe", 'Arbalète (2M)', 'Calotte de cuir', { nom: 'Plastron', categorie: 'Plates' }] }));
    assert.deepEqual(warningsOf(result), []);
    const profile = result.profiles[0];
    assert.deepEqual(profile.equipment.map(item => item.name), ['Arc elfique (2M)', "Arc d'Anirain Haut Elfe", 'Arbalète (2M)', 'Calotte de cuir', 'Plastron']);
    assert.deepEqual(profile.actions.map(action => action.note), ['Arc elfique (2M)', "Arc d'Anirain Haut Elfe", 'Arbalète (2M)']);
    const bow = profile.actions[0];
    assert.equal(bow.base, 40 + 10, 'arc lié à Projectiles (Arc)');
    assert.equal(profile.armorLocations.head, 1);
    assert.ok(profile.armorLocations.body >= 1);
    const ambiguous = importOne(JSON.stringify({ ...base, equipement: ['Plastron'] }));
    assert.match(warningsOf(ambiguous).join('\n'), /Objet ambigu : « Plastron »/);
  });

  test('un armure écrite dans le JSON l’emporte sur celle des pièces du catalogue', () => {
    const result = importOne(JSON.stringify({ ...base, armure: { tete: 3, corps: 3, bras: 3, jambes: 3 }, equipement: ['Calotte de cuir'] }));
    assert.deepEqual(result.profiles[0].armor, { head: 3, body: 3, arms: 3, legs: 3 });
    assert.equal(result.profiles[0].armorLocations, undefined);
  });

  test('Traits de créature et Taille', async () => {
    const result = importOne(JSON.stringify({ ...base, type: 'Créature', traits: ['Peur (2)', 'Grim'], taille: 'Grande' }));
    assert.deepEqual(warningsOf(result), []);
    assert.deepEqual(result.profiles[0].extensions.traits, ['Peur (2)', 'Grim', 'Taille (Grande)']);
    const store = createStore();
    await store.ready;
    await store.importParsedProfiles(result.profiles);
    await store.addProfilesToCombat(store.listProfiles().map(profile => profile.id), { zone: 'active' });
    assert.deepEqual(store.listParticipants()[0].traits, ['Peur (2)', 'Grim', 'Taille (Grande)']);
    assert.match(warningsOf(importOne(JSON.stringify({ ...base, taille: 'Gigantesque' }))).join('\n'), /Taille inconnue : « Gigantesque »/);
  });
});

describe('Import JSON : noms inconnus signalés avec le nom le plus proche', () => {
  const base = { nom: 'Essai', pv: 10, caracteristiques: { FM: 40, Soc: 40 } };
  const warnings = extra => warningsOf(importOne(JSON.stringify({ ...base, ...extra })));

  test('talent', () => {
    const result = importOne(JSON.stringify({ ...base, talents: ['Oeil de la tempete'] }));
    assert.deepEqual(warningsOf(result), ['Talent inconnu : « Oeil de la tempete » — vouliez-vous « Œil de la tempête » ?']);
    assert.equal(result.status, 'needs-review');
    assert.equal(result.errors[0].reason, 'talent-inconnu');
  });

  test('compétence, sort, prière, objet et Trait', () => {
    assert.match(warnings({ competences: ['Priere'] })[0], /^Compétence inconnue : « Priere » — vouliez-vous « Prière » \?$/);
    assert.match(warnings({ sorts: ['Brise os'] })[0], /^Sort inconnu : « Brise os » — vouliez-vous « Brise-os » \?$/);
    assert.match(warnings({ prieres: ['Morsure du louf'] })[0], /^Prière inconnue : « Morsure du louf » — vouliez-vous « Morsure du loup » \?$/);
    assert.match(warnings({ equipement: ['Arbalete (2M)'] })[0], /^Objet inconnu : « Arbalete \(2M\) » — vouliez-vous « Arbalète \(2M\) » \? ; non ajouté$/);
    assert.match(warnings({ traits: ['Regeneratoin'] })[0], /^Trait inconnu : « Regeneratoin »/);
  });

  test('un nom sans équivalent proche est signalé sans proposition', () => {
    assert.deepEqual(warnings({ sorts: ['Xylophonie du bonheur éternel'] }), ['Sort inconnu : « Xylophonie du bonheur éternel »']);
  });

  test('une clé inconnue est signalée, jamais ignorée en silence', () => {
    const result = importOne(JSON.stringify({ ...base, couleurfavorite: 'bleu', talents: [{ nom: 'Combat instinctif', niveau: 3 }] }));
    assert.deepEqual(result.errors.map(error => [error.field, error.reason]), [['couleurfavorite', 'champ-inconnu'], ['talents · niveau', 'champ-inconnu']]);
    assert.equal(result.status, 'needs-review');
  });

  test('les entiers faux sont signalés (Destin négatif, rang nul)', () => {
    assert.deepEqual(importOne(JSON.stringify({ ...base, destin: -1 })).errors.map(error => error.reason), ['valeur-negative']);
    assert.deepEqual(importOne(JSON.stringify({ ...base, talents: [{ nom: 'Combat instinctif', rang: 0 }] })).errors.map(error => error.reason), ['valeur-negative']);
  });
});

describe('Export → import : le profil revient identique', () => {
  /** Ce qui compte dans un profil du Store, sans identifiants ni lien de fiche tiré au sort. */
  const essence = profile => JSON.parse(JSON.stringify({
    movement: profile.movement, race: profile.race, protection: profile.protection,
    name: profile.name, kind: profile.kind, group: profile.group, hp: profile.maxHp, initiative: profile.initiative, caracs: profile.caracs, armor: profile.armor, armorLocations: profile.armorLocations,
    tags: profile.tags, notes: profile.notes, favorite: profile.favorite, keywords: profile.keywords, keywordExclusions: profile.keywordExclusions,
    skills: (profile.skills || []).map(({ id, name, total, advances, status }) => ({ id, name, total, advances, status })),
    talents: (profile.talents || []).map(({ id, name, rank, specialization, status }) => ({ id, name, rank, specialization, status })),
    spells: (profile.spells || []).map(spell => spell.nom), prayers: (profile.prayers || []).map(prayer => prayer.nom),
    equipment: (profile.equipment || []).map(item => item.id), traits: profile.extensions?.traits,
    v5: { fate: profile.extensions?.v5?.fate, resilience: profile.extensions?.v5?.resilience, corruption: profile.extensions?.v5?.corruptionPoints, sin: profile.extensions?.v5?.divine?.sin },
    fortune: profile.ficheSnapshot?.resources?.fortune,
    actions: (profile.diceLines || []).map(({ note, type, base, damage, damageFormula, qualities, extensions }) => ({ note, type, base, damage, damageFormula, qualities, slModifier: extensions?.v5?.slModifier, linked: Boolean(extensions?.fiche?.equipmentId), extensions: JSON.parse(JSON.stringify(extensions || {}).replace(/json-[a-z0-9]+/g, 'json')) }))
  }));

  async function roundTrip(text) {
    const first = createStore();
    await first.ready;
    const parsed = parseProfileJson(text);
    await first.importParsedProfiles(parsed.profiles);
    const exported = exportProfilesJson(first.listProfiles());
    const again = parseProfileJson(exported);
    assert.deepEqual(warningsOf(again), [], 'l’export se relit sans avertissement');
    const second = createStore();
    await second.ready;
    await second.importParsedProfiles(again.profiles);
    return [first.listProfiles(), second.listProfiles()];
  }

  test('les 34 profils de la recette (13 simples + 21 complets)', async () => {
    let total = 0;
    for (const text of [SIMPLES, COMPLETS]) {
      const [before, after] = await roundTrip(text);
      assert.equal(after.length, before.length);
      before.forEach((profile, at) => { assert.deepEqual(essence(after[at]), essence(profile), profile.name); total += 1; });
    }
    assert.equal(total, 34);
  });

  test('un profil avec équipement, Traits, Taille et DR sur un jet', async () => {
    const text = JSON.stringify({ nom: 'Géant sur mesure', type: 'Créature', espece: 'ogre', mouvement: 6, pv: 40, caracteristiques: { CC: 50, CT: 30, F: 60, E: 60, FM: 30, Ag: 30, Soc: 20 }, traits: ['Peur (2)', 'Grim'], taille: 'Énorme',
      competences: [{ nom: 'Projectiles (Arc)', avances: 5 }], equipement: ['Arc elfique (2M)', 'Calotte de cuir', 'Calotte de cuir', { nom: 'Plastron', categorie: 'Plates' }], fortune: 1,
      jets: [{ nom: 'Massue', type: 'attaque', score: 50, degats: 'BF+4', qualites: ['Percutante', 'Recharge 2'], dr: -1 }, { nom: 'Rugissement', type: 'compétence', score: 40 }] });
    const [[before], [after]] = await roundTrip(text);
    assert.deepEqual(essence(after), essence(before));
    assert.equal(before.diceLines.find(action => action.note === 'Massue').extensions.v5.slModifier, -1);
    assert.equal(before.equipment.length, 4);
  });

  test('l’exemple « Insérer un exemple » s’importe sans avertissement, avec le modificateur en DR V5', () => {
    const result = importOne(PROFILE_JSON_EXAMPLE);
    assert.deepEqual(warningsOf(result), []);
    assert.equal(result.status, 'ready');
    assert.ok(result.profiles[0].actions.every(action => !action.mod));
    assert.ok(result.profiles[0].actions.some(action => Number.isInteger(action.extensions?.v5?.slModifier)));
    assert.equal(exportProfileJson({ ...result.profiles[0], diceLines: result.profiles[0].actions }).jets.length, 4);
  });
});

describe('Référentiel des Traits de l’import', () => {
  test('tous les Traits des livres du bestiaire sont connus (sinon régénérer js/data/creature-trait-names.js)', () => {
    const known = new Set(CREATURE_TRAIT_NAMES);
    const dir = new URL('../../../js/data/bestiary/', import.meta.url);
    const missing = new Set();
    for (const file of readdirSync(dir).filter(name => /^L\d+\.json$/.test(name))) {
      for (const profile of JSON.parse(readFileSync(new URL(file, dir), 'utf8')).profiles) {
        for (const trait of [...(profile.traits || []), ...(profile.optionalTraits || [])]) if (trait?.name && !known.has(trait.name)) missing.add(`${file} : ${trait.name}`);
      }
    }
    assert.deepEqual([...missing], []);
  });
});
