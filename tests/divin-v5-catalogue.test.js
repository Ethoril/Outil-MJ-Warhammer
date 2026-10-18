import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const registryPath = resolve(root, 'js/data/v5-divine-contracts.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const byId = id => registry.contracts.find(row => row.id === id);
const miracle = name => registry.contracts.find(row => row.type === 'miracle' && row.catalogueName === name);
const blessing = key => byId(`divine:blessing:myrmidia:${key}`);

test('source pins and divine access talents remain attached to V5 source pages', () => {
  const { sourceFingerprint, ...fingerprintedPayload } = registry;
  assert.equal(sourceFingerprint, `sha256:${createHash('sha256').update(JSON.stringify(fingerprintedPayload), 'utf8').digest('hex')}`);
  assert.equal(registry.sourceManifest.authoritativeEdition, 'V5 EN');
  assert.equal(registry.sourceManifest.v5EnglishBaseSha256.length, 64);
  assert.equal(registry.commonPrayerRules.find(row => row.id === 'prayer-skill').source.printedPage, 113);
  assert.match(registry.sourceTalentDescriptions['talent-bless'], /Bénédictions/);
  assert.match(registry.sourceTalentDescriptions['talent-invoke'], /miracles|Miracles/);
  assert.match(registry.sourceTalentDescriptions['talent-holy-hatred'], /\+2 Blessures/);
  assert.equal(registry.sourceTalentRecords['talent-bless'].id, 'talent-bless');
  assert.equal(registry.sourceTalentRecords['talent-invoke'].id, 'talent-invoke');
  assert.equal(registry.sourceTalentRecords['talent-holy-hatred'].id, 'talent-holy-hatred');
});

test('six Myrmidia blessings have source-backed effects, parameters and +2 SL extensions', () => {
  const expected = [
    ['battle', 'CC', 10], ['conscience', null, null], ['courage', 'FM', 10],
    ['fortune', null, null], ['protection', null, null], ['righteousness', null, null]
  ];
  for (const [key, characteristic, value] of expected) {
    const row = blessing(key);
    assert.ok(row, key);
    assert.equal(row.source.printedPage, 221);
    assert.equal(row.requiredTalent.specialization, 'Myrmidia');
    assert.equal(row.params.range.kind, 'fixed');
    assert.equal(row.params.range.value, 6);
    assert.equal(row.params.range.unit, 'yards');
    assert.equal(row.params.targets.kind, 'count');
    assert.equal(row.params.targets.value, 1);
    assert.equal(row.params.duration.kind, 'fixed');
    assert.equal(row.params.duration.value, 6);
    assert.equal(row.params.duration.unit, 'rounds');
    assert.equal(row.extensions[0].everySuccessLevels, 2);
    assert.deepEqual(row.extensions[0].choices.map(choice => Object.keys(choice)[0]), ['range', 'targets', 'duration']);
    assert.deepEqual(row.effects[0] ? [row.effects[0].characteristic, row.effects[0].value] : [null, null], [characteristic, value]);
  }
  assert.match(blessing('conscience').labels.effect, /Accessible \(\+2 DR\)/);
  assert.match(blessing('protection').labels.effect, /Calme Accessible \(\+2 DR\)/);
  assert.match(blessing('protection').labels.effect, /attaquer/);
});

test('the six V5 Myrmidia miracles retain authoritative effects and structured parameters', () => {
  const fury = miracle('Appel à la Fureur');
  const shield = miracle('Bouclier de Myrmidia');
  const inspiring = miracle('Inspirant');
  const spear = miracle('Lance de Myrmidia');
  const eagle = miracle('Œil de l’aigle');
  const sun = miracle('Soleil flamboyant');
  for (const row of [fury, shield, inspiring, spear, eagle, sun]) {
    assert.equal(row.status === 'blocked', false, row.name);
    assert.equal(row.source.printedPage, 224);
    assert.match(row.labels.effect, /[A-Za-zÀ-ÿ]/);
    assert.doesNotMatch(row.labels.effect, /V5 :|CSV V4|Le CSV/i);
    assert.doesNotMatch(row.sourceDelta, /CSV V4|Le CSV/i);
  }
  assert.deepEqual(fury.params.range, { kind: 'self' });
  assert.deepEqual(fury.params.targets, { kind: 'area', characteristicBonus: 'Soc', unit: 'yards' });
  assert.deepEqual(inspiring.params.targets, { kind: 'area', characteristicBonus: 'Soc', unit: 'yards' });
  assert.deepEqual(shield.params.range, { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' });
  assert.deepEqual(shield.params.targets, { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'allies' });
  assert.deepEqual(shield.effects[0], {
    type: 'armor-bonus', value: 1, locations: 'all',
    duration: { value: null, sourceParameter: 'params.duration', unit: 'rounds', requiresResolvedExpiry: true }
  });
  // P4b T4 : Fureur, Inspirant et Lance sont assistés ; Bouclier et Soleil restent implémentés ; l’Œil de l’aigle devient assisté (P4c : capteur invoqué).
  assert.deepEqual([fury, inspiring, spear, shield, sun, eagle].map(row => row.status), ['assisted', 'assisted', 'assisted', 'implemented', 'implemented', 'assisted']);
  assert.deepEqual([fury, inspiring, spear].map(row => row.effects[0].type), ['grant-talent', 'grant-talent', 'weapon-bonus']);
  assert.deepEqual([fury, inspiring].map(row => row.effects[0].talents[0].id), ['talent-frenzy', 'talent-drilled']);
  assert.deepEqual(spear.effects[0].qualities, ['devastatrice']);
  assert.equal(spear.effects[0].magical, true);
  assert.match(eagle.labels.effect, /Perception 55/);
  assert.match(eagle.labels.effect, /Vol 80/);
  assert.deepEqual(sun.params, { range: { kind: 'special' }, targets: { kind: 'special' }, duration: { kind: 'instant' } });
  assert.deepEqual(sun.effects[0].perSuccessLevels, { every: 2, add: 1 });
  assert.equal(sun.effects[0].duration, undefined);
});

test('all 31 V5 wrath ranges are contiguous from 1 through 151+', () => {
  const rows = [...registry.wrathTable].sort((a, b) => a.min - b.min);
  assert.equal(rows.length, 31);
  assert.equal(rows[0].min, 1);
  let next = 1;
  for (const row of rows) {
    assert.equal(row.min, next, `gap or overlap before ${row.id}`);
    if (row.max === null) {
      assert.equal(row.min, 151);
      next = null;
    } else {
      assert.ok(row.max >= row.min);
      next = row.max + 1;
    }
  }
  assert.equal(next, null);
  const at = min => rows.find(row => row.min === min);
  assert.match(at(1).reminder, /Calme Accessible \(\+2 DR\)/);
  assert.match(at(11).reminder, /-1 DR à Prière/);
  assert.match(at(16).reminder, /Prière Accessible \(\+2 DR\)/);
  assert.match(at(26).reminder, /-1 DR aux compétences associées/);
  assert.match(at(36).reminder, /Endurance Accessible \(\+2 DR\)/);
  assert.match(at(56).reminder, /-1 DR à une compétence associée/);
  assert.match(at(71).reminder, /Endurance Difficile \(-1 DR\)/);
  assert.match(at(81).reminder, /Endurance Difficile \(-2 DR\).*Sonné \+1 par -1 DR/);
  assert.equal(at(88).max, 88);
  assert.match(at(136).reminder, /pénitence 1 restitue Béni, la pénitence 2 restitue Invocation/);
  assert.equal(rows.at(-1).min, 151);
  assert.equal(rows.at(-1).max, null);
});

test('generator check mode is deterministic and does not rewrite outputs', () => {
  const beforeRegistry = readFileSync(resolve(root, 'js/data/v5-divine-contracts.json'));
  const beforeInventory = readFileSync(resolve(root, 'docs/divin/DIVIN_INVENTAIRE.json'));
  const run = () => execFileSync(process.execPath, ['tools/build-v5-divine-contracts.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.match(run(), /registry and inventory are current/i);
  assert.match(run(), /registry and inventory are current/i);
  assert.deepEqual(readFileSync(resolve(root, 'js/data/v5-divine-contracts.json')), beforeRegistry);
  assert.deepEqual(readFileSync(resolve(root, 'docs/divin/DIVIN_INVENTAIRE.json')), beforeInventory);
});

test('generator refuses an invocation from outside its checkout before reading or writing', () => {
  const nestedWorkingDirectory = resolve(root, 'js');
  assert.throws(() => execFileSync(process.execPath, [resolve(root, 'tools/build-v5-divine-contracts.mjs'), '--check'], {
    cwd: nestedWorkingDirectory,
    encoding: 'utf8'
  }), error => /Refusing to read or write outside the generator checkout/.test(error.stderr));
});
