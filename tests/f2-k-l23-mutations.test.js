import test from 'node:test';
import assert from 'node:assert/strict';
import { V5_L23_MUTATION_TABLES, V5_L23_MUTATION_COUNT } from '../js/data/v5-corruption-mutations-l23.js';
import { V5_L23_AUDIT_PROVENANCE } from '../js/data/v5-corruption-mutations-l23-audit.js';

const powers = ['any', 'khorne', 'nurgle', 'slaanesh', 'tzeentch'];
const ordered = band => {
  const parts = band.split('-').map(Number);
  const [a, b] = parts.length === 1 ? [parts[0], parts[0]] : parts;
  const from = a === 0 ? 100 : a;
  const to = b === 0 ? 100 : b;
  return Array.from({ length: (to - from + 100) % 100 + 1 }, (_, i) => (from + i) % 100 || 100);
};

test('F2-K2 L23 — transcription has 125 uniquely identified rows and preserves referenced tables', () => {
  assert.equal(V5_L23_MUTATION_COUNT, 125);
  assert.deepEqual(V5_L23_MUTATION_TABLES.map(t => [t.id, t.entrees.length]), [
    ['l23-physical', 62], ['l23-beast-head', 10], ['l23-mental', 34], ['l23-fixations', 19]
  ]);
  const ids = V5_L23_MUTATION_TABLES.flatMap(t => t.entrees.map(e => e.id));
  assert.equal(new Set(ids).size, 125);
  assert.equal(V5_L23_MUTATION_TABLES[1].selection.renvoiDepuis, 'l23-physical:Beast Head');
  assert.deepEqual(V5_L23_MUTATION_TABLES[3].selection.renvoiDepuis, ['Fitful Hatred', 'Terrible Phobia']);
  const physical = V5_L23_MUTATION_TABLES[0].entrees;
  assert.equal(physical[0].source.referenceF2, 'F-L23-0138');
  assert.equal(physical.at(-1).source.referenceF2, 'F-L23-0201');
  assert.deepEqual(physical[29].source.referencesF2, ['F-L23-0167', 'F-L23-0168']);
  assert.deepEqual(physical[44].source.referencesF2, ['F-L23-0183', 'F-L23-0184']);
  assert.equal(V5_L23_MUTATION_TABLES[1].entrees[0].source.referenceF2, 'F-L23-0202');
  assert.equal(V5_L23_MUTATION_TABLES[1].entrees.at(-1).source.referenceF2, 'F-L23-0211');
  assert.deepEqual(V5_L23_MUTATION_TABLES[3].entrees.map(e => [e.selection.min, e.selection.max]),
    Array.from({ length: 19 }, (_, i) => [i + 2, i + 2]));
});

test('F2-K2 L23 — all power-column ranges are valid and non-overlapping; rows remain MJ-assisted', () => {
  for (const table of V5_L23_MUTATION_TABLES.slice(0, 3)) {
    for (const power of powers) {
      const used = new Set();
      for (const entry of table.entrees) {
        const band = entry.selection.ranges[power];
        if (!band) continue;
        for (const value of ordered(band)) {
          assert.ok(value >= 1 && value <= 100, `${table.id}/${power}/${entry.nom}: ${band}`);
          assert.equal(used.has(value), false, `${table.id}/${power}/${value} overlaps`);
          used.add(value);
        }
      }
      assert.ok(used.size > 0);
      if (power === 'any') assert.equal(used.size, 100, `${table.id}/${power} should cover 01–00`);
    }
  }
  assert.deepEqual(V5_L23_MUTATION_TABLES[0].entrees.slice(0, 1).map(e => [e.source.pageImprimee, e.source.pagePdf]), [[66,68]]);
  assert.deepEqual(V5_L23_MUTATION_TABLES[0].entrees.slice(-1).map(e => [e.source.pageImprimee, e.source.pagePdf]), [[68,70]]);
  assert.deepEqual(V5_L23_MUTATION_TABLES[2].entrees.slice(-1).map(e => [e.source.pageImprimee, e.source.pagePdf]), [[71,73]]);
  for (const table of V5_L23_MUTATION_TABLES) for (const entry of table.entrees) {
    assert.ok(entry.nom && entry.resume);
    assert.equal(entry.source.pagePdf, entry.verification.pagePdf);
    assert.equal(entry.verification.controleur, 'review_l23');
    assert.equal(entry.verification.date, '2026-10-28');
    assert.equal(entry.verification.statut, 'relue-indépendamment');
    assert.equal(entry.statutMecanique, 'assiste');
    assert.equal(entry.conversion.statut, 'assiste');
    assert.ok(entry.regleSource);
    assert.ok(entry.conversion.propositionV5);
    assert.deepEqual(entry.effets, []);
    assert.equal(entry.source.livre, 'L23 — Enemy in Shadows Companion');
  }
  const physical = V5_L23_MUTATION_TABLES[0].entrees;
  assert.match(physical[29].resume, /Peur (2|deux)/i);
  assert.match(physical[30].resume, /Mouvement.*(2|deux).*Bond/i);
  const mental = Object.fromEntries(V5_L23_MUTATION_TABLES[2].entrees.map(e => [e.nom, e.resume]));
  assert.equal(mental['Aethyric Leak'], 'Gagne le talent Witch!; Fellowship −5 et Intelligence −5.');
  assert.match(mental['Blasted Mind'], /1d10.*rounds.*1d10.*Brisé/i);
  assert.match(mental['Glorious Corruption'], /chaque semaine.*sans gagner.*sans être responsable.*perd tous/i);
  assert.match(mental['Mindless Wandering'], /Intelligence −10.*Willpower \+10.*Stupid/i);
  assert.match(mental['Hurried Masochism'], /Belligerent.*Fuir/i);
  assert.match(mental['Fitful Hatred'], /Hatred \(Target\).*une fois par jour.*Fixations/);
  assert.match(mental['Terrible Phobia'], /Afraid \(Target\).*Fixations/);
  assert.match(mental['Jealous Thoughts'], /Fellowship −10/);
  assert.match(mental['Lingering Foulness'], /Après chaque interaction.*saleté.*Nausée.*1d10 heures/);
  assert.match(mental['Soul Sickness'], /échec.*Willpower.*Convulsions.*1d10 heures/i);
  assert.match(mental['Suspicious Mind'], /Initiative −5.*Intelligence −5/);
  assert.match(mental['Thrill Seeker'], /Willpower \+10.*Initiative −10/);
  assert.match(mental['Tortured Visions'], /Initiative −10/);
  for (const table of V5_L23_MUTATION_TABLES.slice(2)) {
    assert.equal(table.source.referenceF2, null);
    assert.match(table.source.referenceAudit, /aucune entrée par ligne/i);
    for (const entry of table.entrees) {
      assert.equal(entry.source.referenceF2, null);
      assert.deepEqual(entry.source.referencesF2, []);
      assert.match(entry.source.referenceAudit, /provenance PDF directe/i);
    }
  }
  const fixations = Object.fromEntries(V5_L23_MUTATION_TABLES[3].entrees.map(e => [e.selection.min, e]));
  assert.equal(fixations[2].nom, 'Inanimate Objects');
  assert.equal(fixations[7].nom, 'Figures/Symbols of Religion');
  assert.equal(fixations[20].nom, 'Happiness');
  assert.deepEqual(V5_L23_MUTATION_TABLES[3].selection.renvoiDepuis, ['Fitful Hatred','Terrible Phobia']);
  assert.match(mental['Fitful Hatred'], /Fixations/);
  assert.match(mental['Terrible Phobia'], /Fixations/);
  const mentalEntries = V5_L23_MUTATION_TABLES[2].entrees;
  assert.match(mentalEntries[0].conversion.propositionV5, /talent Witch!.*Fellowship −5.*Intelligence −5/);
  const beacon = mentalEntries.find(e => e.nom === 'Beacon of Corruption');
  assert.match(beacon.resume, /Fellowship −10/);
  assert.match(beacon.conversion.propositionV5, /Fellowship −10 comme modification de caractéristique.*ne pas convertir.*DR/);
  assert.equal(beacon.verification.observations, 'Dernier correctif Beacon simple contrôlé.');
  assert.match(mentalEntries.find(e => e.nom === 'Lingering Foulness').conversion.propositionV5, /Après chaque interaction.*1d10 heures/);
  assert.match(mentalEntries.find(e => e.nom === 'Soul Sickness').conversion.propositionV5, /après l’échec.*1d10 heures/i);
  assert.equal(new Set(mentalEntries.map(e => e.conversion.propositionV5)).size, 34);
});

test('F2-K2 L23 — all registry mutation references 0138–0211 are attached to matching source summaries', () => {
  const audit = new Map(V5_L23_AUDIT_PROVENANCE.map(item => [item.id, item]));
  const entries = V5_L23_MUTATION_TABLES.flatMap(table => table.entrees);
  const attached = entries.flatMap(entry => entry.source.referencesF2 || []);
  const directV4Sources = new Set(['F-L23-0162','F-L23-0171','F-L23-0172','F-L23-0182','F-L23-0198','F-L23-0200','F-L23-0208','F-L23-0211']);
  assert.equal(audit.size, 74);
  assert.equal(new Set(attached.filter(id => audit.has(id))).size, 74);
  for (const entry of entries) {
    for (const reference of entry.source.referencesF2 || []) {
      if (!audit.has(reference)) continue;
      if (!directV4Sources.has(reference)) assert.ok(entry.regleSource.includes(audit.get(reference).summary));
    }
  }
});

test('F2-K2 L23 — all 72 physical and Beast Head rows have line-specific V5 proposals separate from V4 source', () => {
  const tables = V5_L23_MUTATION_TABLES.slice(0, 2);
  const entries = tables.flatMap(table => table.entrees);
  assert.equal(entries.length, 72);
  for (const entry of entries) {
    assert.ok(entry.regleSource);
    assert.ok(entry.conversion.propositionV5);
    assert.ok(entry.questionsMJ.length);
    assert.doesNotMatch(entry.conversion.propositionV5, /^Proposition V5 pour /);
  }
  const byName = Object.fromEntries(entries.map(entry => [entry.nom, entry]));
  assert.match(byName['Lolling Tongue'].regleSource, /−10.*Language/);
  assert.match(byName['Lolling Tongue'].conversion.propositionV5, /−10.*−1 DR/);
  assert.match(byName['Rearranged Face'].regleSource, /−20.*Intuition/);
  assert.match(byName['Rearranged Face'].conversion.propositionV5, /−20.*−2 DR/);
  assert.match(byName['Whiskered Snout'].regleSource, /\+10 Track/);
  assert.match(byName['Whiskered Snout'].conversion.propositionV5, /Odorat.*\+2 DR.*\+10 Track.*V4/);
  assert.match(byName['Iron Skin'].regleSource, /\+2 Armour Points.*−10 Agility/);
  assert.match(byName['Iron Skin'].conversion.propositionV5, /\+2 PA.*F-L06-0511.*−10 Agility.*sans l’appliquer/);
  assert.match(byName['Fleshy Tentacle'].regleSource, /sans indice de niveau/);
  assert.match(byName['Fleshy Tentacle'].conversion.propositionV5, /Tentacles \(1\).*F-L06-0507/);
  assert.match(byName['Webbed Feet'].regleSource, /Amphibious/);
  assert.match(byName['Webbed Feet'].conversion.propositionV5, /Foulée \(Marais\).*Amphibie/);
  for (const name of ['Giant Spider','Snake']) {
    assert.match(byName[name].regleSource, /Venom \(Average\)/);
    assert.match(byName[name].conversion.propositionV5, /Venom \(Average\)/);
    assert.doesNotMatch(byName[name].resume, /Accessible/);
  }
});
