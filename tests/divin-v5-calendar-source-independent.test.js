import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceUrl = new URL('../docs/divin/sources/L06-calendar-readings.mjs', import.meta.url);
const notePath = resolve(root, 'docs/divin/sources/DIVIN_L06_CALENDRIER_CONTROLE.md');
const hash = '53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de';
const imageRoot = 'C:/Users/arnot/.codex/visualizations/2026/10/18/01a14da8-877d-7ea0-a2d5-38e6a9590721';

async function loadCalendarSource() {
  try {
    return await import(sourceUrl.href);
  } catch (error) {
    assert.fail(`Le module source indépendant L06-calendar-readings.mjs manque: ${error.message}`);
  }
}

function expectedSourceRef(page, sectionPattern) {
  return {
    bookId: 'L06',
    fileSha256: hash,
    physicalPage: page,
    printedPage: page,
    sectionPattern,
  };
}

function assertSourceRef(actual, expected, label) {
  assert.equal(actual.bookId, expected.bookId, `${label}: livre`);
  assert.equal(actual.fileSha256.toLowerCase(), expected.fileSha256, `${label}: hash source`);
  assert.equal(actual.physicalPage, expected.physicalPage, `${label}: page physique`);
  assert.equal(actual.printedPage, expected.printedPage, `${label}: folio`);
  assert.match(actual.section, expected.sectionPattern, `${label}: section`);
}

test('E1 indépendant — p.177 et p.289 attestent huit jours impériaux, sans supposer sept jours', async () => {
  const { imperialWeek } = await loadCalendarSource();
  assert.deepEqual(imperialWeek, {
    value: 8,
    unit: 'days',
    sourceRefs: imperialWeek.sourceRefs,
  });
  assert.equal(imperialWeek.sourceRefs.length, 2);
  assertSourceRef(imperialWeek.sourceRefs.find(ref => ref.physicalPage === 177),
    expectedSourceRef(177, /healing times and downtime/i), 'p.177');
  assertSourceRef(imperialWeek.sourceRefs.find(ref => ref.physicalPage === 289),
    expectedSourceRef(289, /imperial calendar/i), 'p.289');
});

test('E1 indépendant — le résultat 06–10 conserve la durée source et la distingue des secondes de la clock', async () => {
  const { imperialWeek, thinkOverYourDeeds } = await loadCalendarSource();
  assertSourceRef(thinkOverYourDeeds.sourceRef,
    expectedSourceRef(218, /wrath of the gods.*06.?10|06.?10.*think over your deeds/i), 'p.218, 06–10');
  assert.deepEqual(thinkOverYourDeeds.wrathRange, { min: 6, max: 10 });
  assert.equal(thinkOverYourDeeds.successLevelsMaximum, 0);
  assert.deepEqual(thinkOverYourDeeds.duration, { value: 1, unit: 'imperial-week' });
  assert.equal(thinkOverYourDeeds.application, 'after-wrath-resolution');
  assert.equal(thinkOverYourDeeds.occurrences, 'independent-identical-caps');
  assert.equal(imperialWeek.value, 8);
  assert.equal(imperialWeek.unit, 'days');
  assert.doesNotMatch(JSON.stringify({ imperialWeek, thinkOverYourDeeds }), /seconds|secondes|604800|691200/i,
    'la source fixe une semaine impériale de huit jours; la clock fournit l’unité seconde/jour');
});

test('E1 indépendant — les quatre lectures documentent les folios, rôles et divergence p.289', async () => {
  const { calendarReadings } = await loadCalendarSource();
  assert.equal(calendarReadings.length, 4);
  assert.equal(new Set(calendarReadings.map(reading => reading.id)).size, 4);
  const expected = [
    [177, 'first', '/root', 'dependency', /healing times and downtime/i],
    [177, 'independent', '/root/e1_strictures_control', 'dependency', /healing times and downtime/i],
    [289, 'first', '/root', 'religious-candidate', /imperial calendar/i],
    [289, 'independent', '/root/e1_strictures_control', 'dependency', /imperial calendar/i],
  ];
  for (const [page, role, reader, classification, sectionPattern] of expected) {
    const reading = calendarReadings.find(item => item.physicalPage === page && item.role === role);
    assert.ok(reading, `lecture ${role} L06/${page} absente`);
    assert.equal(reading.bookId, 'L06');
    assert.equal(reading.fileSha256.toLowerCase(), hash);
    assert.equal(reading.printedPage, page);
    assert.equal(reading.reader, reader);
    assert.equal(reading.classification, classification);
    assert.match(reading.reason, /semaine|calendrier|blessures|guérison|culte|dépendance/i);
    assert.equal(reading.evidencePath, 'docs/divin/sources/DIVIN_L06_CALENDRIER_CONTROLE.md');
    assert.equal(reading.visualEvidencePath,
      `${imageRoot}/L06-p${page}-${page}.png`);
    assert.match(reading.section, sectionPattern);
  }
});

test('E1 indépendant — la note conserve la citation des deux pages et sépare source, clock et runtime', async () => {
  await loadCalendarSource();
  const note = readFileSync(notePath, 'utf8');
  assert.match(note, /Each Downtime.{0,180}8 days by the Imperial calendar/i);
  assert.match(note, /There are eight days in the Imperial week/i);
  assert.match(note, /seconde.{0,80}jour.{0,100}clock|clock.{0,100}seconde.{0,80}jour/i);
  assert.match(note, /aucun.{0,40}7 jours.{0,50}sourc/i);
  assert.match(note, /aucun nouvel effet runtime/i);
  assert.match(note, /pas d.ancre murale|sans ancre murale/i);
});
