import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../js/core/store.js';
import { ficheSnapshot } from '../js/core/fiche-sync.js';
import { getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { source as prayerSource } from '../docs/divin/sources/L06-prayers.mjs';

const contracts = getAllDivineContracts();
const blessings = contracts.filter(row => row.type === 'blessing');
const cults = Object.keys(prayerSource.blessingsByCult);
const baseBlessings = blessings.filter(row => cults.includes(row.deity));
// Archives of the Empire 3 : Handrich p.47, Solkan p.55 (les effets restent ceux de la p.221 du livre de base V5).
const supplementPages = { Handrich: 47, Solkan: 55 };
const supplementBlessings = blessings.filter(row => row.deity in supplementPages);
const pageOf = row => supplementPages[row.deity] ?? 221;
const fold = value => String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }],
  prayers: [], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
async function fixture(cult, allyExtra = {}) {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest', cult), actor('ally', cult, { initiative: 30, ...allyExtra })] } });
  return s;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest', moment: 'afterEffects' }, ...more });

test('60 associations culte/bénédiction : 6 par culte, 19 effets, identifiants et talents Béni propres à chaque culte', () => {
  assert.equal(baseBlessings.length, 60);
  assert.equal(new Set(baseBlessings.map(row => row.id)).size, 60);
  assert.equal(new Set(baseBlessings.map(row => row.id.split(':').pop())).size, 19);
  for (const cult of cults) {
    const rows = baseBlessings.filter(row => row.deity === cult);
    assert.equal(rows.length, 6, cult);
    assert.deepEqual(rows.map(row => row.id.split(':')[2]), Array(6).fill(fold(cult)));
    for (const row of rows) {
      assert.equal(row.id, `divine:blessing:${fold(cult)}:${row.id.split(':')[3]}`);
      assert.equal(row.requiredTalent.id, 'talent-bless');
      assert.equal(row.requiredTalent.specialization, cult);
      assert.equal(row.requiredTalent.name, `Béni (${cult})`);
      assert.equal(row.source.printedPage, 221);
      assert.equal(row.sourceReceipt.accessSource.printedPage, 220);
    }
  }
  // Le relevé source (p.220) et le registre listent les mêmes six effets par culte.
  for (const [cult, english] of Object.entries(prayerSource.blessingsByCult)) {
    const keys = english.map(name => name === 'The Hunt' ? 'hunt' : name.toLowerCase());
    assert.deepEqual(blessings.filter(row => row.deity === cult).map(row => row.id.split(':')[3]), keys, cult);
  }
});

test('la feuille de personnage résout Béni (culte) vers le talent d’accès de chacun des dix cultes', () => {
  for (const cult of cults) {
    const snapshot = ficheSnapshot('p', { nom: 'P', race: 'humain', carac: {}, talentsAcq: [{ nom: `Béni (${cult})` }] });
    const row = blessings.find(item => item.deity === cult);
    assert.equal(snapshot.talents[0].id, row.requiredTalent.id, cult);
    assert.equal(snapshot.talents[0].specialization, cult, cult);
  }
});

test('effets : 13 effets calculables, 6 rappels MJ; Soin et Tenacity/Convalescence sont instantanés', () => {
  const effects = new Map();
  for (const row of blessings) effects.set(row.id.split(':')[3], row.status);
  assert.equal(effects.size, 19);
  assert.deepEqual([...effects].filter(([, status]) => status === 'implemented').map(([key]) => key).sort(),
    ['battle', 'charisma', 'courage', 'finesse', 'grace', 'hardiness', 'healing', 'hunt', 'might', 'righteousness', 'tenacity', 'wisdom', 'wit']);
  assert.deepEqual([...effects].filter(([, status]) => status === 'manual').map(([key]) => key).sort(),
    ['breath', 'conscience', 'fortune', 'protection', 'recuperation', 'savagery']);
  for (const row of blessings.filter(item => ['healing', 'recuperation', 'tenacity'].includes(item.id.split(':')[3]))) {
    assert.deepEqual(row.params.duration, { kind: 'instant' });
    assert.equal(JSON.stringify(row.extensions).includes('"duration"'), false, 'une durée Instant ne s’étend pas');
  }
});

const STAT = { battle: 'CC', charisma: 'Soc', courage: 'FM', finesse: 'Dex', grace: 'Ag', hardiness: 'E', hunt: 'CT', might: 'F', wisdom: 'Int', wit: 'I' };
for (const row of blessings.filter(item => item.status === 'implemented' && STAT[item.id.split(':')[3]])) {
  const key = row.id.split(':')[3];
  test(`${row.name} (${row.deity}) : +10 ${STAT[key]} à l’application, retiré à l’échéance, p.${pageOf(row)}`, async () => {
    const s = await fixture(row.deity);
    const before = person(s, 'ally').caracs[STAT[key]];
    const preview = s.previewDivineExecution(row.id, input());
    assert.equal(preview.ready, true, preview.error);
    assert.equal(person(s, 'ally').caracs[STAT[key]], before, 'l’aperçu ne modifie rien');
    const result = await s.applyDivineExecution(row.id, { preview });
    assert.equal(result.ready, true, result.error);
    assert.equal(person(s, 'ally').caracs[STAT[key]], before + 10);
    assert.equal(result.receipt.source.printedPage, pageOf(row));
    await s.undo();
    assert.equal(person(s, 'ally').caracs[STAT[key]], before);
    await s.redo();
    for (let i = 0; i < 12; i++) await s.nextTurn();
    assert.equal(person(s, 'ally').caracs[STAT[key]], before);
    assert.equal(person(s, 'ally').extensions.v5.divineEffects.length, 0);
  });
}

for (const row of blessings.filter(item => item.id.split(':')[3] === 'healing')) {
  test(`${row.name} (${row.deity}) : rend 1 Blessure au toucher, instantané, sans couche`, async () => {
    const s = await fixture(row.deity, { hp: 10 });
    const preview = s.previewDivineExecution(row.id, input({ expiry: undefined }));
    assert.equal(preview.ready, true, preview.error);
    const result = await s.applyDivineExecution(row.id, { preview });
    assert.equal(result.ready, true, result.error);
    assert.equal(person(s, 'ally').hp, 11);
    assert.equal((person(s, 'ally').extensions?.v5?.divineEffects || []).length, 0);
  });
}

test('une bénédiction manuelle est résolue comme rappel MJ, sans effet inventé', async () => {
  for (const row of blessings.filter(item => item.status === 'manual')) {
    const s = await fixture(row.deity);
    const instant = row.params.duration.kind === 'instant';
    const preview = s.previewDivineExecution(row.id, input(instant ? { expiry: undefined } : {}));
    assert.equal(preview.ready, true, `${row.id} : ${preview.error}`);
    assert.equal(preview.status, 'reminder', row.id);
    assert.deepEqual(preview.preview.effects, []);
    assert.ok(preview.preview.reminders.length > 0);
    assert.equal(person(s, 'ally').caracs.CC, 40);
  }
});

test('Béni d’un culte ne donne pas accès aux bénédictions d’un autre culte', async () => {
  const s = await fixture('Morr');
  const sigmar = blessings.find(row => row.id === 'divine:blessing:sigmar:might');
  const preview = s.previewDivineExecution(sigmar.id, input());
  assert.equal(preview.ready, false);
  assert.match(preview.error, /Talent d’accès Béni \(Sigmar\)/);
  assert.equal(s.previewDivineExecution('divine:blessing:morr:courage', input()).ready, true);
});

const generator = (directory, extra = []) => spawnSync(process.execPath, ['tools/build-v5-divine-contracts.mjs', '--dry-run', `--miracle-modules=${directory}`, ...extra],
  { cwd: process.cwd(), encoding: 'utf8', windowsHide: true });
const shieldParams = { range: { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' }, targets: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'allies' }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' } };
const sample = (more = {}) => ({ name: 'Bouclier d’essai', canonicalName: 'Test Shield', printedPage: 223, summary: 'Les alliés ciblés gagnent +1 PA.', params: shieldParams, status: 'implemented',
  effect: { type: 'armor-bonus', value: 1, locations: 'all' }, targetRules: [], needsInput: [{ id: 'targets', text: 'Alliés ciblés.' }], clauses: [{ id: 'effect', mode: 'engine', text: '+1 PA.' }], sourceDelta: 'Écart d’essai.', ...more });
function withModules(files, run) {
  const directory = mkdtempSync(join(tmpdir(), 'divine-modules-'));
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(directory, name), body);
    return run(directory);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
const moduleSource = (cult, miracles) => `export const cult = ${JSON.stringify(cult)};\nexport const miracles = ${JSON.stringify(miracles)};\n`;

test('chargeur de modules : dossier vide ou absent, aucun contrat de module', () => {
  withModules({}, directory => {
    const result = generator(directory);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).counts.moduleMiracles, 0);
  });
  const missing = generator(join(tmpdir(), 'divine-modules-absent-' + Date.now()));
  assert.equal(missing.status, 0, missing.stderr);
});

test('chargeur de modules : un miracle de module prend la forme d’un miracle Myrmidia existant', () => {
  withModules({ 'b-morr.mjs': moduleSource('Morr', [sample()]), 'a-ulric.mjs': moduleSource('Ulric', [sample({ canonicalName: 'Other Shield', name: 'Autre bouclier' })]) }, directory => {
    const result = generator(directory);
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.counts.moduleMiracles, 2);
    assert.deepEqual(output.moduleContracts.map(row => row.id), ['divine:miracle:ulric:other-shield', 'divine:miracle:morr:test-shield'], 'ordre alphabétique des fichiers');
    const contract = output.moduleContracts[1], shield = contracts.find(row => row.canonicalName === 'Shield of Myrmidia');
    assert.deepEqual(Object.keys(contract).filter(key => !['catalogueEntry'].includes(key)).sort(), Object.keys(shield).filter(key => !['catalogueEntry', 'schemaVersion', 'sourceFingerprint'].includes(key)).sort());
    assert.equal(contract.type, 'miracle');
    assert.equal(contract.deity, 'Morr');
    assert.equal(contract.status, 'implemented');
    assert.deepEqual(contract.params, shield.params);
    assert.deepEqual(contract.extensions, shield.extensions);
    assert.deepEqual(contract.effects, shield.effects);
    assert.equal(contract.requiredKnownPrayer, true);
    assert.deepEqual(contract.requiredTalent, { id: 'talent-invoke', catalogueTalentId: 'talent-49_6e_76_6f_63_61_74_69_6f_6e_20_28_4d_6f_72_72_29', name: 'Invocation (Morr)', specialization: 'Morr' });
    assert.equal(contract.source.printedPage, 223);
    assert.equal(contract.source.document, shield.source.document);
    assert.equal(contract.sourceDelta, 'Écart d’essai.');
    assert.deepEqual(contract.needsInput, [{ field: 'targets', label: 'Alliés ciblés.' }]);
    assert.equal(contract.clauses[0].mode, 'engine');
  });
});

test('chargeur de modules : un effet instantané reçoit une durée Instant, un miracle assisté n’a aucun effet', () => {
  const heal = sample({ canonicalName: 'Test Mend', name: 'Soin d’essai', params: { range: { kind: 'special' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'instant' } }, effect: { type: 'wound-heal', value: 2 } });
  const manual = sample({ canonicalName: 'Test Sight', name: 'Vue d’essai', status: 'manual', effect: null });
  withModules({ 'rhya.mjs': moduleSource('Rhya', [heal, manual]) }, directory => {
    const result = generator(directory);
    assert.equal(result.status, 0, result.stderr);
    const [first, second] = JSON.parse(result.stdout).moduleContracts;
    assert.deepEqual(first.effects, [{ type: 'wound-heal', value: 2, duration: { unit: 'instant' } }]);
    assert.deepEqual(second.effects, []);
    assert.equal(second.status, 'manual');
  });
});

test('chargeur de modules : seules les règles de cible connues du moteur sont appliquées, le reste devient une note', () => {
  withModules({ 'morr.mjs': moduleSource('Morr', [sample({ targetRules: ['ally', 'prêtre uniquement', 'within-range'] })]) }, directory => {
    const result = generator(directory);
    assert.equal(result.status, 0, result.stderr);
    const [contract] = JSON.parse(result.stdout).moduleContracts;
    assert.deepEqual(contract.targetRules, ['ally', 'within-range']);
    assert.deepEqual(contract.targetNotes, ['prêtre uniquement']);
  });
});

test('chargeur de modules : un effet structuré sur un miracle manuel reste inerte pour le moteur', async () => {
  withModules({ 'verena.mjs': moduleSource('Verena', [sample({ status: 'manual', effect: { type: 'characteristic-modifier', characteristic: 'Int', value: 20 } })]) }, directory => {
    const result = generator(directory);
    assert.equal(result.status, 0, result.stderr);
    const [contract] = JSON.parse(result.stdout).moduleContracts;
    assert.equal(contract.status, 'manual');
    assert.equal(contract.effects.length, 1);
  });
});

test('chargeur de modules : un module invalide est refusé avec le fichier, le miracle et le motif', () => {
  const cases = [
    [moduleSource('Khorne', [sample()]), /a\.mjs : `cult` doit être l’un de/],
    ['export const cult = "Morr";\nexport const miracles = {};\n', /`miracles` doit être un tableau/],
    [moduleSource('Morr', [sample({ status: 'implemented', effect: null })]), /Test Shield\) : status implemented exige au moins un effet/],
    [moduleSource('Morr', [sample({ effect: { type: 'summon', value: 1 } })]), /type d’effet non pris en charge/],
    [moduleSource('Morr', [sample({ params: { ...shieldParams, duration: { kind: 'forever' } } })]), /params\.duration\.kind doit être l’un de/],
    [moduleSource('Morr', [sample({ params: { ...shieldParams, range: { kind: 'fixed', value: 'six' } } })]), /params\.range\.value doit être un entier/],
    [moduleSource('Morr', [sample({ status: 'sometimes' })]), /status doit être l’un de/],
    [moduleSource('Morr', [sample({ printedPage: '223' })]), /printedPage doit être un entier positif/],
    [moduleSource('Morr', [sample({ targetRules: [3] })]), /targetRules doit être un tableau de textes/],
    [moduleSource('Morr', [sample({ clauses: [{ id: 'effect', mode: 'automatic', text: 'x' }] })]), /clauses doit être un tableau de/],
    [moduleSource('Morr', [sample({ needsInput: ['text'] })]), /needsInput doit être un tableau de \{ id, text \}/],
    [moduleSource('Morr', [sample(), sample()]), /identifiant dupliqué divine:miracle:morr:test-shield/],
    [moduleSource('Myrmidia', [sample({ canonicalName: 'Shield of Myrmidia' })]), /déjà défini par le livre de base Myrmidia/]
  ];
  for (const [body, pattern] of cases) {
    withModules({ 'a.mjs': body }, directory => {
      const result = generator(directory);
      assert.notEqual(result.status, 0, pattern.source);
      assert.match(result.stderr, pattern);
    });
  }
});

test('Handrich et Solkan : 6 bénédictions chacun, source Archives of the Empire 3 (p.47 et p.55), effets du livre de base', () => {
  assert.equal(blessings.length, 72);
  assert.equal(supplementBlessings.length, 12);
  const expected = {
    Handrich: ['charisma', 'fortune', 'hardiness', 'protection', 'wisdom', 'wit'],
    Solkan: ['battle', 'conscience', 'courage', 'hardiness', 'might', 'tenacity']
  };
  for (const [cult, keys] of Object.entries(expected)) {
    const rows = supplementBlessings.filter(row => row.deity === cult);
    assert.deepEqual(rows.map(row => row.id), keys.map(key => `divine:blessing:${fold(cult)}:${key}`));
    for (const row of rows) {
      const base = baseBlessings.find(item => item.id.split(':')[3] === row.id.split(':')[3]);
      assert.equal(row.source.document, 'Archives of the Empire 3.pdf');
      assert.equal(row.source.fileSha256, '5c86d70ec9368857456877be59e40752cf6f051e7094a9cc9ec748ada9b1a29f');
      assert.match(row.source.edition, /^V4/);
      assert.equal(row.source.printedPage, supplementPages[cult]);
      assert.equal(row.sourceReceipt.accessSource.printedPage, supplementPages[cult]);
      assert.equal(row.sourceReceipt.fileSha256, row.source.fileSha256);
      assert.equal(row.sourceReceipt.effectSource.printedPage, 221);
      assert.equal(row.sourceReceipt.effectSource.document, 'Livre de base V5 EN v2.pdf');
      assert.deepEqual(row.requiredTalent, { id: 'talent-bless', catalogueTalentId: row.requiredTalent.catalogueTalentId, name: `Béni (${cult})`, specialization: cult });
      assert.deepEqual([row.status, row.params, row.extensions, row.effects, row.labels.effect], [base.status, base.params, base.extensions, base.effects, base.labels.effect], row.id);
    }
  }
  assert.equal(new Set(blessings.map(row => row.id.split(':')[3])).size, 19, 'aucun effet nouveau');
  assert.equal(blessings.some(row => row.deity === 'Mathlann'), false, 'Mathlann : aucune bénédiction propre inventée');
});

test('la feuille de personnage résout Béni et Invocation de Handrich, Solkan et Mathlann vers les talents d’accès', () => {
  for (const cult of ['Handrich', 'Solkan', 'Mathlann']) for (const [talent, id] of [['Béni', 'talent-bless'], ['Invocation', 'talent-invoke']]) {
    const snapshot = ficheSnapshot('p', { nom: 'P', race: 'humain', carac: {}, talentsAcq: [{ nom: `${talent} (${cult})` }] });
    assert.equal(snapshot.talents[0].id, id, `${talent} (${cult})`);
    assert.equal(snapshot.talents[0].specialization, cult);
  }
  const row = supplementBlessings.find(item => item.deity === 'Handrich');
  assert.equal(ficheSnapshot('p', { nom: 'P', race: 'humain', carac: {}, talentsAcq: [{ nom: 'Béni (Handrich)' }] }).talents[0].id, row.requiredTalent.id);
});

test('Solkan : aucun Péché ni Corruption toléré, rappel MJ sur chaque bénédiction et clause manuelle du contrat', async () => {
  const solkan = supplementBlessings.filter(row => row.deity === 'Solkan');
  for (const row of solkan) {
    assert.equal(row.reminders.length, 1, row.id);
    assert.match(row.reminders[0], /aucune Bénédiction ni aucun Miracle .* Péché ou de Corruption/);
    assert.deepEqual(row.clauses.at(-1), { id: 'solkan-purity', mode: 'manual', text: row.reminders[0], sourceRef: 'archives-of-the-empire-3-p55' });
    const s = await fixture('Solkan');
    const preview = s.previewDivineExecution(row.id, input(row.params.duration.kind === 'instant' ? { expiry: undefined } : {}));
    assert.equal(preview.ready, true, `${row.id} : ${preview.error}`);
    assert.ok(preview.preview.reminders.includes(row.reminders[0]), row.id);
  }
  for (const row of supplementBlessings.filter(item => item.deity === 'Handrich')) assert.equal(row.reminders, undefined, 'la règle de profit de Handrich vise ses Miracles, pas ses Bénédictions');
  assert.equal(blessings.filter(row => row.deity === 'Morr').some(row => row.reminders), false);
});
