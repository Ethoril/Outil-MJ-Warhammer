import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createStore } from '../../../js/core/store.js';
import { ficheSnapshot } from '../../../js/core/fiche-sync.js';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { source as prayerSource } from '../../../docs/divin/sources/L06-prayers.mjs';
import { createHash } from 'node:crypto';
import * as handrich from '../../../docs/divin/sources/miracles/handrich.mjs';
import * as solkan from '../../../docs/divin/sources/miracles/solkan.mjs';
import * as rhya from '../../../docs/divin/sources/miracles/rhya-archives3.mjs';
import { paramKinds, paramUnits, effectTypes, supplementCults } from '../../../js/core/v5-divine-grammar.js';
import * as nuit from '../../../docs/divin/sources/miracles/ranald-nuit.mjs';
import * as joueur from '../../../docs/divin/sources/miracles/ranald-joueur.mjs';
import * as trompeur from '../../../docs/divin/sources/miracles/ranald-trompeur.mjs';
import * as protecteur from '../../../docs/divin/sources/miracles/ranald-protecteur.mjs';
import * as taalDeft from '../../../docs/divin/sources/miracles/taal-deft.mjs';
import * as ulricPbtt from '../../../docs/divin/sources/miracles/ulric-pbtt.mjs';
import * as mathlann from '../../../docs/divin/sources/miracles/mathlann.mjs';
import * as manann from '../../../docs/divin/sources/miracles/manann.mjs';
import * as morr from '../../../docs/divin/sources/miracles/morr.mjs';
import * as ranald from '../../../docs/divin/sources/miracles/ranald.mjs';
import * as rhya_rhya from '../../../docs/divin/sources/miracles/rhya.mjs';
import * as shallya from '../../../docs/divin/sources/miracles/shallya.mjs';
import * as sigmar from '../../../docs/divin/sources/miracles/sigmar.mjs';
import * as taal from '../../../docs/divin/sources/miracles/taal.mjs';
import * as ulric from '../../../docs/divin/sources/miracles/ulric.mjs';
import * as verena from '../../../docs/divin/sources/miracles/verena.mjs';
import { buildParticipantFromBestiary } from '../../../js/core/bestiary-profiles.js';
import L20 from '../../../js/data/bestiary/L20.json' with { type: 'json' };
import corpus from '../../../docs/divin/DIVIN_CORPUS_LIVRES.json' with { type: 'json' };
import complement from '../../../docs/divin/DIVIN_CORPUS_LIVRES_COMPLEMENT.json' with { type: 'json' };
import registry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };

const shieldParams = { range: { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' }, targets: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'allies' }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' } };
const engineEffectTypes = [...effectTypes];
const statuses = ['implemented', 'assisted', 'manual', 'blocked'];
const clauseModes = ['engine', 'assisted', 'manual'];
const norm = s => String(s).replace(/[’']/g, "'").normalize('NFC').toLowerCase();
const validParam = p => {
 assert.equal(typeof p, 'object');
 assert.ok(paramKinds.has(p.kind), `kind inconnu: ${p.kind}`);
 if (p.unit !== undefined) assert.ok(paramUnits.has(p.unit), `unité inconnue: ${p.unit}`);
 switch (p.kind) {
  case 'fixed': assert.ok(Number.isFinite(p.value) && p.value > 0); assert.ok(p.unit); break;
  case 'characteristic':
  case 'characteristic-bonus': assert.ok(typeof p.characteristic === 'string' && p.characteristic); assert.ok(p.unit); break;
  case 'area': assert.ok((typeof p.characteristicBonus === 'string') !== (typeof p.characteristic === 'string')); assert.ok(p.unit); break;
  case 'count': assert.ok(Number.isInteger(p.value) && p.value > 0); break;
  case 'touch': assert.equal(Object.keys(p).length, 1); break;
  case 'self': case 'special': case 'instant': break;
  default: assert.fail(`kind inconnu: ${p.kind}`);
 }
};

describe('bénédictions et cultes', () => {
const contracts = getAllDivineContracts();
const blessings = contracts.filter(row => row.type === 'blessing');
const cults = Object.keys(prayerSource.blessingsByCult);
const baseBlessings = blessings.filter(row => cults.includes(row.deity));
// Archives of the Empire 3 : Handrich p.47, Solkan p.55 (les effets restent ceux de la p.221 du livre de base V5).
const supplementPages = { Handrich: 47, Solkan: 55 };
const supplementBlessings = blessings.filter(row => row.deity in supplementPages);
const pageOf = row => row.deity==='Stromfels'?91:supplementPages[row.deity] ?? 221;
const fold = value => String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }],
  prayers: [], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 }, ...(cult==='Solkan'?{corruptionPoints:0}:{}) } }, ...extra });
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

test('effets : 16 effets calculables, 3 rappels MJ; Soin et Tenacity/Convalescence sont instantanés', () => {
  const effects = new Map();
  for (const row of blessings) effects.set(row.id.split(':')[3], row.status);
  assert.equal(effects.size, 19);
  assert.deepEqual([...effects].filter(([, status]) => status === 'implemented').map(([key]) => key).sort(),
    ['battle', 'breath', 'charisma', 'courage', 'finesse', 'fortune', 'grace', 'hardiness', 'healing', 'hunt', 'might', 'protection', 'righteousness', 'savagery', 'tenacity', 'wisdom', 'wit']);
  assert.deepEqual([...effects].filter(([, status]) => status === 'manual').map(([key]) => key).sort(),
    ['conscience', 'recuperation']);
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
  assert.equal(blessings.length, 78);
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
});

describe('catalogue divin', () => {
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
    ['protection', undefined, undefined]
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
  // Chance (P5, arbitrage MJ du 19 oct.) : relance gratuite du prochain Test échoué, sans dépense de Chance.
  assert.deepEqual(blessing('fortune').effects, [{ type: 'free-reroll', duration: { value: 6, unit: 'rounds' } }]);
  // Droiture (P5, arbitrage MJ du 19 oct.) : arme désignée de la cible considérée comme Magique.
  assert.deepEqual(blessing('righteousness').effects, [{ type: 'weapon-bonus', magical: true, designatedWeapon: true, weaponOwner: 'target', duration: { value: 6, unit: 'rounds' } }]);
  assert.match(blessing('conscience').labels.effect, /Accessible \(\+2 DR\)/);
  assert.match(blessing('protection').labels.effect, /Calme Accessible \(\+2 DR\)/);
  // Protection (P5) : Test de Calme Accessible de l’attaquant, saisi par le MJ.
  assert.deepEqual(blessing('protection').effects.map(({ type, skill, slBonus }) => ({ type, skill, slBonus })), [{ type: 'attack-deterrent', skill: 'Calme', slBonus: 2 }]);
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
});

describe('miracles — AotE3', () => {
const modules = { Handrich: handrich, Solkan: solkan, Rhya: rhya };
const inventory = JSON.parse(readFileSync(new URL('../../../docs/divin/sources/extraction-2026-10-18/inventaire_supplements.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../../../docs/divin/DIVIN_CORPUS_LIVRES.json', import.meta.url), 'utf8'));

const book = manifest.books.find(row => row.id === 'L02');

for (const [cult, mod] of Object.entries(modules)) {
 test(`${cult} : 6 miracles cohérents avec l’inventaire AotE3`, () => {
  assert.equal(mod.cult, cult);
  assert.equal(mod.miracles.length, 6);
  const rows = inventory.entries.filter(row => row.book === 'AOTE3' && row.cult === cult && row.type === 'miracle');
  assert.equal(rows.length, 6);
  for (const m of mod.miracles) {
   const row = rows.find(r => norm(r.name) === norm(m.canonicalName));
   assert.ok(row, `canonicalName absent de l’inventaire: ${m.canonicalName}`);
   assert.equal(m.printedPage, row.pagePrinted, m.name);
  }
  assert.equal(new Set(mod.miracles.map(m => m.name)).size, 6);
  assert.equal(new Set(mod.miracles.map(m => m.canonicalName)).size, 6);
 });

 test(`${cult} : source du livre (AotE3, hash du manifeste, édition)`, () => {
  assert.equal(mod.source.bookId, 'AotE3');
  assert.equal(mod.source.document, 'Archives of the Empire 3.pdf');
  assert.match(mod.source.fileSha256, /^[0-9a-f]{64}$/);
  assert.match(mod.source.edition, /V4/);
  assert.equal(mod.source.fileSha256, book.sha256);
 });

 test(`${cult} : champs obligatoires, params, clauses, effects`, () => {
  for (const m of mod.miracles) {
   for (const key of ['name', 'canonicalName', 'summary']) assert.ok(typeof m[key] === 'string' && m[key].length > 0, `${m.name}.${key}`);
   assert.ok(Number.isInteger(m.printedPage));
   assert.ok(statuses.includes(m.status), m.name);
   for (const key of ['range', 'targets', 'duration']) validParam(m.params?.[key]);
   assert.ok(Array.isArray(m.targetRules));
   assert.ok(Array.isArray(m.needsInput));
   for (const n of m.needsInput) assert.ok(n.id && n.text, m.name);
   assert.equal(new Set(m.needsInput.map(n => n.id)).size, m.needsInput.length, `doublon needsInput: ${m.name}`);
   assert.ok(Array.isArray(m.clauses) && m.clauses.length > 0, m.name);
   for (const c of m.clauses) { assert.ok(c.id && c.text, m.name); assert.ok(clauseModes.includes(c.mode), `${m.name}.${c.id}`); }
   assert.equal(new Set(m.clauses.map(c => c.id)).size, m.clauses.length, `doublon clauses: ${m.name}`);
   const effects = [...(m.effect ? [m.effect] : []), ...(m.effects ?? [])];
   for (const e of effects) assert.ok(engineEffectTypes.includes(e.type), `${m.name}: type ${e.type}`);
   if (m.status === 'manual') assert.ok(effects.length === 0 && m.clauses.some(c => c.mode === 'manual'), m.name);
   if (m.status === 'implemented') assert.ok(effects.length && m.clauses.every(c => c.mode === 'engine'), `${m.name}: implemented exige tout automatisé`);
   if (m.status === 'assisted') assert.ok(effects.length && m.clauses.some(c => c.mode === 'engine'), `${m.name}: assisted exige un effet moteur`);
  }
 });
}

test('règles de culte portées en clauses', () => {
 for (const m of handrich.miracles) assert.ok(m.clauses.some(c => c.id === 'profit-sin' && c.mode === 'manual'), m.name);
 for (const m of solkan.miracles) assert.ok(m.clauses.some(c => c.id === 'no-sin-corruption' && c.mode === 'manual'), m.name);
 const rage = rhya.miracles.find(m => m.canonicalName === "Rhya's Rage");
 assert.ok(rage.clauses.some(c => c.id === 'defend-only'));
});
});

describe('miracles — Deft', () => {
// [module, culte, aspect imprimé, nombre de miracles, début du libellé d'aspect dans l'inventaire]
const modules = [
 [nuit, 'Ranald', 'Night Prowler', 7, 'Night Prowler'],
 [joueur, 'Ranald', 'Gamester', 6, 'Gamester'],
 [trompeur, 'Ranald', 'Deceiver', 5, 'Deceiver'],
 [protecteur, 'Ranald', 'Protector', 6, 'Protector'],
 [taalDeft, 'Taal', undefined, 8, 'Ranger-Priest']
];
const inventory = JSON.parse(readFileSync(new URL('../../../docs/divin/sources/extraction-2026-10-18/inventaire_supplements.json', import.meta.url), 'utf8'));
const deftRows = inventory.entries.filter(row => row.book === 'DEFT' && row.type === 'miracle');

const validParam = p => {
 assert.equal(typeof p, 'object');
 assert.ok(paramKinds.has(p.kind), `kind inconnu: ${p.kind}`);
 if (p.unit !== undefined) assert.ok(paramUnits.has(p.unit), `unité inconnue: ${p.unit}`);
 switch (p.kind) {
  case 'fixed': assert.ok(Number.isFinite(p.value) && p.value > 0); assert.ok(p.unit); break;
  case 'characteristic':
  case 'characteristic-bonus': assert.ok(typeof p.characteristic === 'string' && p.characteristic); assert.ok(p.unit); break;
  case 'area': assert.ok((typeof p.characteristicBonus === 'string') !== (typeof p.characteristic === 'string')); assert.ok(p.unit); break;
  case 'count': assert.ok(Number.isInteger(p.value) && p.value > 0); break;
  case 'touch': assert.equal(Object.keys(p).length, 1); break;
  case 'special': if (p.label !== undefined) assert.ok(typeof p.label === 'string' && p.label); break;
  case 'self': case 'instant': break;
  default: assert.fail(`kind inconnu: ${p.kind}`);
 }
};

for (const [mod, cult, aspect, count, aspectLabel] of modules) {
 const title = `${cult}${aspect ? ` ${aspect}` : ' (Ranger-Priest)'}`;

 test(`${title} : ${count} miracles cohérents avec l’inventaire`, () => {
  assert.equal(mod.cult, cult);
  assert.equal(mod.aspect, aspect);
  assert.equal(mod.source.bookId, 'DeftSteps');
  assert.equal(mod.source.document, 'Deft Steps Light Fingers.pdf');
  assert.match(mod.source.fileSha256, /^[0-9a-f]{64}$/);
  assert.ok(mod.source.edition);
  assert.equal(mod.miracles.length, count);
  const rows = deftRows.filter(row => row.cult === cult && String(row.aspect).startsWith(aspectLabel));
  assert.equal(rows.length, count);
  for (const m of mod.miracles) {
   const row = rows.find(r => norm(r.name) === norm(m.canonicalName));
   assert.ok(row, `canonicalName absent de l’inventaire: ${m.canonicalName}`);
   assert.equal(m.printedPage, row.pagePrinted, m.name);
  }
  assert.equal(new Set(mod.miracles.map(m => m.name)).size, count);
  assert.equal(new Set(mod.miracles.map(m => m.canonicalName)).size, count);
 });

 test(`${title} : champs obligatoires, params, clauses, effects`, () => {
  for (const m of mod.miracles) {
   for (const key of ['name', 'canonicalName', 'summary']) assert.ok(typeof m[key] === 'string' && m[key].length > 0, `${m.name}.${key}`);
   assert.ok(Number.isInteger(m.printedPage));
   assert.ok(statuses.includes(m.status), m.name);
   for (const key of ['range', 'targets', 'duration']) validParam(m.params?.[key]);
   assert.ok(Array.isArray(m.targetRules));
   assert.ok(Array.isArray(m.needsInput));
   for (const n of m.needsInput) assert.ok(n.id && n.text, m.name);
   assert.equal(new Set(m.needsInput.map(n => n.id)).size, m.needsInput.length, `doublon needsInput: ${m.name}`);
   assert.ok(Array.isArray(m.clauses) && m.clauses.length > 0, m.name);
   for (const c of m.clauses) { assert.ok(c.id && c.text, m.name); assert.ok(clauseModes.includes(c.mode), `${m.name}.${c.id}`); }
   assert.equal(new Set(m.clauses.map(c => c.id)).size, m.clauses.length, `doublon clauses: ${m.name}`);
   if (m.sourceDelta !== undefined) assert.ok(typeof m.sourceDelta === 'string' && m.sourceDelta.length > 0, m.name);
   const effects = [...(m.effect ? [m.effect] : []), ...(m.effects ?? [])];
   for (const e of effects) assert.ok(engineEffectTypes.includes(e.type), `${m.name}: type ${e.type}`);
   if (m.status === 'manual') assert.ok(effects.length === 0 && (m.needsInput.length > 0 || m.clauses.some(c => c.mode === 'manual')), m.name);
   if (m.status === 'implemented') assert.ok(effects.length && m.clauses.every(c => c.mode === 'engine'), `${m.name}: implemented exige tout automatisé`);
   if (m.status === 'assisted') assert.ok(effects.length && m.clauses.some(c => c.mode === 'engine'), `${m.name}: assisted exige un effet moteur`);
  }
 });
}

test('Deft : 32 miracles, 24 de Ranald et 8 de Taal, sans doublon entre modules', () => {
 const all = modules.flatMap(([mod]) => mod.miracles);
 assert.equal(all.length, 32);
 assert.equal(modules.filter(([, cult]) => cult === 'Ranald').flatMap(([mod]) => mod.miracles).length, 24);
 assert.equal(new Set(all.map(m => m.canonicalName)).size, 32);
 assert.equal(new Set(all.map(m => m.name)).size, 32);
});
});

describe('miracles — PBtT et Lustria', () => {
const modules = [
 { label: 'Ulric (PBtT)', mod: ulricPbtt, cult: 'Ulric', count: 7, page: 50, book: 'PBTT' },
 { label: 'Mathlann (Lustria)', mod: mathlann, cult: 'Mathlann', count: 2, page: 81, book: 'L07' }
];

for (const { label, mod, cult, count, page, book } of modules) {
 test(`${label} : ${count} miracles, source et pages cohérentes`, () => {
  assert.equal(mod.cult, cult);
  assert.equal(mod.miracles.length, count);
  assert.equal(mod.source.bookId, book);
  assert.match(mod.source.fileSha256, /^[0-9a-f]{64}$/);
  assert.ok(mod.source.document && mod.source.edition);
  assert.equal(new Set(mod.miracles.map(m => m.name)).size, count);
  assert.equal(new Set(mod.miracles.map(m => m.canonicalName)).size, count);
  for (const m of mod.miracles) {
   assert.equal(m.printedPage, page, m.name);
  }
 });

 test(`${label} : champs obligatoires, params, clauses, effets`, () => {
  for (const m of mod.miracles) {
   for (const key of ['name', 'canonicalName', 'summary']) assert.ok(typeof m[key] === 'string' && m[key].length > 0, `${m.name}.${key}`);
   assert.ok(statuses.includes(m.status), m.name);
   for (const key of ['range', 'targets', 'duration']) validParam(m.params?.[key]);
   assert.ok(Array.isArray(m.targetRules));
   assert.ok(Array.isArray(m.needsInput));
   for (const n of m.needsInput) assert.ok(n.id && n.text, m.name);
   assert.equal(new Set(m.needsInput.map(n => n.id)).size, m.needsInput.length, `doublon needsInput: ${m.name}`);
   assert.ok(Array.isArray(m.clauses) && m.clauses.length > 0, m.name);
   for (const c of m.clauses) { assert.ok(c.id && c.text, m.name); assert.ok(clauseModes.includes(c.mode), `${m.name}.${c.id}`); }
   assert.equal(new Set(m.clauses.map(c => c.id)).size, m.clauses.length, `doublon clauses: ${m.name}`);
   const effects = [...(m.effect ? [m.effect] : []), ...(m.effects ?? [])];
   for (const e of effects) assert.ok(engineEffectTypes.includes(e.type), `${m.name}: type ${e.type}`);
   if (m.status === 'manual') assert.ok(m.needsInput.length > 0 || m.clauses.some(c => c.mode === 'manual'), m.name);
   if (m.status === 'implemented') assert.ok(effects.length && m.clauses.every(c => c.mode === 'engine'), `${m.name}: implemented exige tout automatisé`);
   if (m.status === 'assisted') assert.ok(effects.length && m.clauses.some(c => c.mode === 'engine'), `${m.name}: assisted exige un effet moteur`);
   if (m.status === 'manual') assert.equal(effects.length, 0, `${m.name}: manual sans effet structuré`);
  }
 });
}

test('Ulric (PBtT) : noms distincts des miracles du livre de base', async () => {
 const base = await import('../../../docs/divin/sources/miracles/ulric.mjs');
 const baseNames = new Set(base.miracles.map(m => norm(m.name)));
 const baseCanon = new Set(base.miracles.map(m => norm(m.canonicalName)));
 for (const m of ulricPbtt.miracles) {
  assert.ok(!baseNames.has(norm(m.name)), `nom FR déjà pris: ${m.name}`);
  assert.ok(!baseCanon.has(norm(m.canonicalName)), `nom EN déjà pris: ${m.canonicalName}`);
 }
});
});

describe('miracles — Manann, Morr, Ranald', () => {
const modules = { Manann: manann, Morr: morr, Ranald: ranald };
const extraction = JSON.parse(readFileSync(new URL('../../../docs/divin/sources/extraction-2026-10-18/miracles.json', import.meta.url), 'utf8'));
const extracted = extraction.miracles ?? extraction;

for (const [cult, mod] of Object.entries(modules)) {
 test(`${cult} : 6 miracles cohérents avec l’extraction`, () => {
  assert.equal(mod.cult, cult);
  assert.equal(mod.miracles.length, 6);
  const rows = extracted.filter(row => row.culte === cult);
  assert.equal(rows.length, 6);
  for (const m of mod.miracles) {
   const row = rows.find(r => norm(r.nom_fr) === norm(m.name));
   assert.ok(row, `nom_fr absent de l’extraction: ${m.name}`);
   assert.equal(m.printedPage, row.page_imprimee, m.name);
   // Écart d’orthographe imprimée admis seulement s’il est documenté dans sourceDelta.
   if (norm(m.canonicalName) !== norm(row.nom_en)) assert.match(m.sourceDelta ?? '', /Manalt/, `canonicalName divergent non documenté: ${m.name}`);
  }
  assert.equal(new Set(mod.miracles.map(m => m.name)).size, 6);
  assert.equal(new Set(mod.miracles.map(m => m.canonicalName)).size, 6);
 });

 test(`${cult} : champs obligatoires, params, clauses, effect`, () => {
  for (const m of mod.miracles) {
   for (const key of ['name', 'canonicalName', 'summary']) assert.ok(typeof m[key] === 'string' && m[key].length > 0, `${m.name}.${key}`);
   assert.ok(Number.isInteger(m.printedPage));
   assert.ok(statuses.includes(m.status), m.name);
   for (const key of ['range', 'targets', 'duration']) validParam(m.params?.[key]);
   assert.ok(Array.isArray(m.targetRules));
   assert.ok(Array.isArray(m.needsInput));
   for (const n of m.needsInput) assert.ok(n.id && n.text, m.name);
   assert.equal(new Set(m.needsInput.map(n => n.id)).size, m.needsInput.length, `doublon needsInput: ${m.name}`);
   assert.ok(Array.isArray(m.clauses) && m.clauses.length > 0, m.name);
   for (const c of m.clauses) { assert.ok(c.id && c.text, m.name); assert.ok(clauseModes.includes(c.mode), `${m.name}.${c.id}`); }
   assert.equal(new Set(m.clauses.map(c => c.id)).size, m.clauses.length, `doublon clauses: ${m.name}`);
   const effects = [...(m.effect ? [m.effect] : []), ...(m.effects ?? [])];
   for (const e of effects) assert.ok(engineEffectTypes.includes(e.type), `${m.name}: type ${e.type}`);
   if (m.status === 'manual') assert.ok(m.needsInput.length > 0 || m.clauses.some(c => c.mode === 'manual'), m.name);
   if (m.status === 'implemented') assert.ok(effects.length && m.clauses.every(c => c.mode === 'engine'), `${m.name}: implemented exige tout automatisé`);
   // assisted : effets structurés appliqués, clauses manuelles admises en rappels MJ.
   if (m.status === 'assisted') assert.ok(effects.length && m.clauses.some(c => c.mode === 'engine'), `${m.name}: assisted exige un effet moteur`);
  }
 });
}
});

describe('miracles — Rhya, Shallya, Sigmar', () => {
const rhya = rhya_rhya;
const extraction = JSON.parse(readFileSync(new URL('../../../docs/divin/sources/extraction-2026-10-18/miracles.json', import.meta.url), 'utf8'));
const norm = value => String(value).replace(/[’‘]/g, "'").toLowerCase();
const modules = [rhya, shallya, sigmar];
const ENGINE_EFFECT_TYPES = [...effectTypes];
const STATUSES = ['implemented', 'assisted', 'manual', 'blocked'];
const MODES = ['engine', 'assisted', 'manual'];
const UNITS = [...paramUnits];
const CHARACTERISTICS = ['Soc'];

function validParam(param) {
  if (!param || !paramKinds.has(param.kind)) return false;
  switch (param.kind) {
    case 'fixed': return Number.isFinite(param.value) && UNITS.includes(param.unit);
    case 'characteristic':
    case 'characteristic-bonus': return CHARACTERISTICS.includes(param.characteristic) && typeof param.unit === 'string';
    case 'area': return CHARACTERISTICS.includes(param.characteristicBonus ?? param.characteristic) && UNITS.includes(param.unit);
    case 'touch': return Object.keys(param).length === 1;
    case 'count': return Number.isFinite(param.value);
    case 'self': case 'special': case 'instant': return true;
    default: return false;
  }
}

for (const mod of modules) {
  test(`${mod.cult} : 6 miracles cohérents avec l'extraction`, () => {
    assert.equal(mod.miracles.length, 6);
    const expected = extraction.miracles.filter(row => row.culte === mod.cult);
    assert.equal(expected.length, 6);
    for (const row of expected) {
      const found = mod.miracles.find(item => norm(item.canonicalName) === norm(row.nom_en));
      assert.ok(found, `absent : ${row.nom_en}`);
      assert.equal(norm(found.name), norm(row.nom_fr), row.nom_en);
      assert.equal(found.printedPage, row.page_imprimee, row.nom_en);
    }
  });

  test(`${mod.cult} : champs obligatoires, params et effets valides`, () => {
    const names = new Set();
    const canon = new Set();
    for (const miracle of mod.miracles) {
      assert.ok(!names.has(miracle.name), `doublon ${miracle.name}`);
      assert.ok(!canon.has(miracle.canonicalName), `doublon ${miracle.canonicalName}`);
      names.add(miracle.name); canon.add(miracle.canonicalName);
      for (const key of ['name', 'canonicalName', 'summary']) assert.ok(typeof miracle[key] === 'string' && miracle[key].length > (key === 'summary' ? 30 : 3), `${miracle.name}.${key}`);
      assert.ok(Number.isInteger(miracle.printedPage));
      assert.ok(STATUSES.includes(miracle.status), miracle.name);
      assert.ok(Array.isArray(miracle.targetRules) && Array.isArray(miracle.needsInput) && Array.isArray(miracle.clauses));
      for (const key of ['range', 'targets', 'duration']) assert.ok(validParam(miracle.params?.[key]), `${miracle.name}.params.${key}`);
      if (miracle.effect) assert.ok(ENGINE_EFFECT_TYPES.includes(miracle.effect.type), miracle.name);
      for (const effect of miracle.effects || []) assert.ok(ENGINE_EFFECT_TYPES.includes(effect.type), miracle.name);
      if (miracle.status === 'implemented') assert.ok(miracle.effect || miracle.effects?.length, `${miracle.name} implémenté sans effet`);
      if (miracle.status === 'assisted') assert.ok(miracle.effect || miracle.effects?.length, `${miracle.name} assisté sans effet`);
      if (miracle.status === 'manual') {
        assert.ok(miracle.clauses.length > 0 && miracle.needsInput.length > 0, `${miracle.name} manuel sans clauses/faits`);
        assert.ok(miracle.clauses.some(clause => clause.mode !== 'engine'), `${miracle.name} manuel sans clause non automatisée`);
      }
      const clauseIds = new Set();
      for (const clause of miracle.clauses) {
        assert.ok(clause.id && clause.text && MODES.includes(clause.mode), `${miracle.name} clause ${clause.id}`);
        assert.ok(!clauseIds.has(clause.id), `${miracle.name} clause en double ${clause.id}`);
        clauseIds.add(clause.id);
      }
      const needIds = new Set();
      for (const need of miracle.needsInput) {
        assert.ok(need.id && need.text, `${miracle.name} needsInput`);
        assert.ok(!needIds.has(need.id), `${miracle.name} fait en double ${need.id}`);
        needIds.add(need.id);
      }
    }
  });
}

test('cultes exportés', () => {
  assert.deepEqual(modules.map(mod => mod.cult), ['Rhya', 'Shallya', 'Sigmar']);
});
});

describe('miracles — Taal, Ulric, Verena', () => {
const extraction = JSON.parse(readFileSync(new URL('../../../docs/divin/sources/extraction-2026-10-18/miracles.json', import.meta.url), 'utf8'));
const modules = [['Taal', taal], ['Ulric', ulric], ['Verena', verena]];
const engineEffectTypes = effectTypes;
const statuses = new Set(['implemented', 'assisted', 'manual', 'blocked']);
const modes = new Set(['engine', 'assisted', 'manual']);
const units = paramUnits;

const validParam = p => {
  if (!p || typeof p !== 'object' || !paramKinds.has(p.kind)) return false;
  switch (p.kind) {
    case 'fixed': return Number.isFinite(p.value) && units.has(p.unit);
    case 'characteristic':
    case 'characteristic-bonus': return typeof p.characteristic === 'string' && units.has(p.unit);
    case 'area': return typeof (p.characteristicBonus ?? p.characteristic) === 'string' && units.has(p.unit);
    case 'touch': return Object.keys(p).length === 1;
    case 'count': return Number.isFinite(p.value);
    case 'self': case 'special': case 'instant': return true;
    default: return false;
  }
};

for (const [name, mod] of modules) {
  test(`${name} : 6 miracles cohérents avec l'extraction`, () => {
    assert.equal(mod.cult, name);
    assert.equal(mod.miracles.length, 6);
    const expected = extraction.miracles.filter(row => row.culte === name);
    assert.equal(expected.length, 6);
    const names = new Set();
    for (const m of mod.miracles) {
      assert.ok(!names.has(m.canonicalName), `doublon ${m.canonicalName}`);
      names.add(m.canonicalName);
      const row = expected.find(r => r.nom_en === m.canonicalName);
      assert.ok(row, `absent de l'extraction : ${m.canonicalName}`);
      assert.equal(m.printedPage, row.page_imprimee);
    }
  });

  test(`${name} : champs obligatoires et grammaire`, () => {
    for (const m of mod.miracles) {
      for (const field of ['name', 'canonicalName', 'summary']) assert.ok(typeof m[field] === 'string' && m[field].length > 0, `${m.canonicalName}.${field}`);
      assert.ok(Number.isInteger(m.printedPage));
      assert.ok(statuses.has(m.status), m.canonicalName);
      for (const key of ['range', 'targets', 'duration']) assert.ok(validParam(m.params?.[key]), `${m.canonicalName}.params.${key}`);
      assert.ok(Array.isArray(m.targetRules));
      assert.ok(Array.isArray(m.needsInput));
      for (const n of m.needsInput) assert.ok(n.id && n.text);
      assert.ok(Array.isArray(m.clauses) && m.clauses.length > 0);
      const ids = new Set();
      for (const c of m.clauses) {
        assert.ok(c.id && c.text && modes.has(c.mode), `${m.canonicalName} clause ${c.id}`);
        assert.ok(!ids.has(c.id), `clause dupliquée ${c.id}`);
        ids.add(c.id);
      }
      if (m.effect) assert.ok(engineEffectTypes.has(m.effect.type));
      for (const e of m.effects ?? []) assert.ok(engineEffectTypes.has(e.type));
      if (m.status === 'implemented') assert.ok(m.effect !== null && m.needsInput.length === 0 && m.clauses.every(c => c.mode === 'engine'));
      if (m.status === 'manual') assert.ok(m.needsInput.length > 0 || m.clauses.some(c => c.mode !== 'engine'));
    }
  });
}

test('pas de doublon de nom entre les trois cultes', () => {
  const all = modules.flatMap(([, mod]) => mod.miracles);
  assert.equal(new Set(all.map(m => m.name)).size, 18);
  assert.equal(new Set(all.map(m => m.canonicalName)).size, 18);
});
});

describe('attaque à distance sans portée', () => {
test('attaque à distance imprimée sans portée (L20 E0-P-630, « Ranged (Pistol) +9 ») : action à distance en CT, sans portée inventée', () => {
  const participant = buildParticipantFromBestiary('E0-P-630', { library: L20.profiles });
  const pistol = participant.actions.find(action => /pistol/i.test(action.name));
  assert.ok(pistol);
  assert.equal(pistol.attr, 'CT');
  assert.equal(pistol.extensions.v5.kind, 'ranged');
  assert.equal(pistol.rangeYards, undefined);
});
});

describe('chargeur de la vague B', () => {
const generator = directory => spawnSync(process.execPath, ['tools/build-v5-divine-contracts.mjs', '--dry-run', `--miracle-modules=${directory}`],
  { cwd: process.cwd(), encoding: 'utf8', windowsHide: true });
const sample = (more = {}) => ({ name: 'Bouclier d’essai', canonicalName: 'Test Shield', printedPage: 223, summary: 'Les alliés ciblés gagnent +1 PA.', params: shieldParams, status: 'implemented',
  effect: { type: 'armor-bonus', value: 1, locations: 'all' }, clauses: [{ id: 'effect', mode: 'engine', text: '+1 PA.' }], ...more });
const moduleSource = (cult, miracles, { source, aspect } = {}) => `export const cult = ${JSON.stringify(cult)};\n${source ? `export const source = ${JSON.stringify(source)};\n` : ''}${aspect ? `export const aspect = ${JSON.stringify(aspect)};\n` : ''}export const miracles = ${JSON.stringify(miracles)};\n`;
function run(files) {
  const directory = mkdtempSync(join(tmpdir(), 'divine-wave-b-'));
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(directory, name), body);
    const result = generator(directory);
    return { ...result, contracts: result.status === 0 ? JSON.parse(result.stdout).moduleContracts : null };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
const aote3 = corpus.books.find(book => book.id === 'L02');
const deft = corpus.books.find(book => book.id === 'L04');
const lustria = corpus.books.find(book => book.id === 'L07');
const pbtt = complement.books[0];
const aote3Source = { bookId: 'AotE3', document: aote3.file, fileSha256: aote3.sha256, edition: 'V4 EN' };

test('complément de corpus : le PDF Power Behind the Throne Companion est enregistré sans toucher au manifeste de 17 livres', () => {
  assert.equal(corpus.count, 17);
  assert.equal(corpus.books.length, 17);
  assert.equal(corpus.books.some(book => book.file === pbtt.file), false);
  assert.equal(pbtt.file, 'WFRP_Power_Behind_the_Throne_Companion.pdf');
  assert.equal(pbtt.physicalPages, 128);
  assert.match(pbtt.sha256, /^[0-9a-f]{64}$/);
  assert.equal(corpus.books.some(book => book.id === pbtt.id || book.sha256 === pbtt.sha256), false);
});

test('chargeur : sans `source` ni `aspect`, un module de base garde la source du livre de base V5 EN v2', () => {
  const { status, stderr, contracts } = run({ 'morr.mjs': moduleSource('Morr', [sample()]) });
  assert.equal(status, 0, stderr);
  const [contract] = contracts;
  const base = registry.contracts.find(row => row.canonicalName === 'Shield of Myrmidia');
  assert.equal(contract.source.document, base.source.document);
  assert.equal(contract.source.fileSha256, base.source.fileSha256);
  assert.equal(contract.source.edition, 'V5 EN');
  assert.equal(contract.source.sourceStatus, 'read-and-page-checked');
  assert.equal(contract.source.printedPage, 223);
  assert.equal(contract.sourceReceipt.sourceBookSha256, base.source.fileSha256);
  assert.deepEqual(Object.keys(contract.sourceReceipt), ['referenceSnapshotSha256', 'catalogueSnapshotVersion', 'sourceBookSha256']);
  assert.equal(contract.labels.sourceStatus, 'V5 base source checked');
  assert.equal('aspect' in contract, false);
  assert.equal('reminders' in contract, false);
});

test('chargeur : un module déclarant le livre de base comme source reste identique à un module sans `source`', () => {
  const plain = run({ 'morr.mjs': moduleSource('Morr', [sample()]) });
  const declared = run({ 'morr.mjs': moduleSource('Morr', [sample()], { source: { bookId: 'L06', document: 'Livre de base V5 EN v2.pdf', fileSha256: '53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de', edition: 'V5 EN' } }) });
  assert.equal(declared.status, 0, declared.stderr);
  assert.deepEqual(declared.contracts, plain.contracts);
});

test('chargeur : source de supplément (Archives of the Empire 3) reflétée dans source, sourceReceipt et libellé', () => {
  const { status, stderr, contracts } = run({ 'handrich.mjs': moduleSource('Handrich', [sample({ printedPage: 47 })], { source: aote3Source }) });
  assert.equal(status, 0, stderr);
  const [contract] = contracts;
  assert.deepEqual(contract.source, { document: 'Archives of the Empire 3.pdf', fileSha256: aote3.sha256, edition: 'V4 EN', sourceStatus: 'read-and-page-checked', printedPage: 47, section: 'Miracles de Handrich - Test Shield', clauses: [] });
  assert.equal(contract.sourceReceipt.sourceBookSha256, aote3.sha256);
  assert.equal(contract.sourceReceipt.sourceBookId, 'L02', 'identifiant du manifeste, indépendant de l’étiquette bookId du module');
  assert.equal(contract.sourceReceipt.sourceDocument, 'Archives of the Empire 3.pdf');
  assert.equal(contract.sourceReceipt.sourceEdition, 'V4 EN');
  assert.equal(contract.labels.sourceStatus, 'V4 EN supplement L02 source checked');
  assert.equal(contract.id, 'divine:miracle:handrich:test-shield');
});

test('chargeur : le document ou l’empreinte seuls suffisent, et le PDF du complément est résolu comme un livre du manifeste', () => {
  const { status, stderr, contracts } = run({
    'a.mjs': moduleSource('Ranald', [sample()], { source: { document: deft.file, edition: 'V4 EN', sourceStatus: 'read-and-page-checked' } }),
    'b.mjs': moduleSource('Ulric', [sample({ canonicalName: 'Other Shield' })], { source: { bookId: 'PBTT', fileSha256: pbtt.sha256.toUpperCase(), edition: 'V4 EN' } }),
    'c.mjs': moduleSource('Mathlann', [sample({ canonicalName: 'Third Shield' })], { source: { bookId: 'L07', document: lustria.file, fileSha256: lustria.sha256, edition: 'V4 EN' } })
  });
  assert.equal(status, 0, stderr);
  assert.deepEqual(contracts.map(row => [row.sourceReceipt.sourceBookId, row.source.document, row.source.fileSha256]),
    [['L04', deft.file, deft.sha256], ['L18', pbtt.file, pbtt.sha256], ['L07', lustria.file, lustria.sha256]]);
});

test('chargeur : un `source` incomplet, inconnu ou contradictoire est refusé avec le fichier et le motif', () => {
  const cases = [
    [{ bookId: 'AotE3', edition: 'V4 EN' }, /doit identifier le livre \(document ou fileSha256\)/],
    [{ ...aote3Source, edition: undefined }, /edition est requise/],
    [{ ...aote3Source, fileSha256: '0'.repeat(64) }, /livre absent des manifestes/],
    [{ ...aote3Source, document: deft.file }, /livre absent des manifestes/],
    [{ ...aote3Source, bookId: 'L04' }, /livre absent des manifestes/],
    [{ ...aote3Source, sourceStatus: 3 }, /sourceStatus doit être un texte non vide/],
    [{ document: 'Livre de base V5 EN v2.pdf', edition: 'V4' }, /désigne le livre de base : edition doit valoir V5 EN/],
    ['Archives of the Empire 3.pdf', /doit être un objet/]
  ];
  for (const [source, pattern] of cases) {
    const { status, stderr } = run({ 'a.mjs': moduleSource('Handrich', [sample()], { source }) });
    assert.notEqual(status, 0, pattern.source);
    assert.match(stderr, /Module miracle a\.mjs : `source`/);
    assert.match(stderr, pattern);
  }
});

test('chargeur : l’aspect d’un module est stocké dans chaque contrat, l’accès requis reste Invocation (culte)', () => {
  const { status, stderr, contracts } = run({ 'ranald-nuit.mjs': moduleSource('Ranald', [sample(), sample({ canonicalName: 'Other Shield', name: 'Autre' })], { source: { ...aote3Source, document: deft.file, fileSha256: deft.sha256 }, aspect: 'Night Prowler' }),
    'ranald.mjs': moduleSource('Ranald', [sample({ canonicalName: 'Plain Shield' })]) });
  assert.equal(status, 0, stderr);
  assert.deepEqual(contracts.map(row => row.aspect), ['Night Prowler', 'Night Prowler', undefined]);
  for (const row of contracts) {
    assert.equal(row.requiredTalent.id, 'talent-invoke');
    assert.equal(row.requiredTalent.name, 'Invocation (Ranald)');
    assert.equal(row.requiredTalent.specialization, 'Ranald');
  }
  const bad = run({ 'a.mjs': 'export const cult = "Ranald";\nexport const aspect = "  ";\nexport const miracles = [];\n' });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /a\.mjs : `aspect` doit être un texte non vide/);
});

test('chargeur : Handrich, Solkan et Mathlann sont acceptés, un autre culte reste refusé', () => {
  assert.deepEqual([...supplementCults], ['Handrich', 'Solkan', 'Mathlann']);
  for (const cult of supplementCults) {
    const { status, stderr, contracts } = run({ 'a.mjs': moduleSource(cult, [sample()]) });
    assert.equal(status, 0, stderr);
    const [contract] = contracts;
    assert.equal(contract.deity, cult);
    assert.equal(contract.id, `divine:miracle:${cult.toLowerCase()}:test-shield`);
    assert.deepEqual({ ...contract.requiredTalent, catalogueTalentId: undefined }, { id: 'talent-invoke', catalogueTalentId: undefined, name: `Invocation (${cult})`, specialization: cult });
    assert.equal(contract.requiredTalent.catalogueTalentId, `talent-${[...`Invocation (${cult})`].map(char => char.charCodeAt(0).toString(16)).join('_')}`);
  }
  const refused = run({ 'a.mjs': moduleSource('Khorne', [sample()]) });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /`cult` doit être l’un de .*Handrich, Solkan, Mathlann/);
});

test('chargeur : Solkan n’accepte ni Péché ni Corruption, en rappel et en clause manuelle des miracles de module', () => {
  const { status, stderr, contracts } = run({ 'a.mjs': moduleSource('Solkan', [sample()]), 'b.mjs': moduleSource('Handrich', [sample()]) });
  assert.equal(status, 0, stderr);
  const [solkan, handrich] = contracts;
  assert.match(solkan.reminders[0], /Péché ou de Corruption/);
  assert.deepEqual(solkan.clauses.map(row => [row.id, row.mode]), [['effect', 'engine'], ['solkan-purity', 'manual']]);
  assert.equal('reminders' in handrich, false);
});

test('chargeur : un identifiant déjà défini est refusé, avec mention du livre de base le cas échéant', () => {
  const cases = [
    [{ 'a.mjs': moduleSource('Handrich', [sample()], { source: aote3Source }), 'b.mjs': moduleSource('Handrich', [sample()], { source: aote3Source }) }, /b\.mjs .*identifiant dupliqué divine:miracle:handrich:test-shield \(déjà défini par le module a\.mjs\)/],
    [{ 'a.mjs': moduleSource('Rhya', [sample()]), 'b.mjs': moduleSource('Rhya', [sample()], { source: aote3Source }) }, /b\.mjs .*identifiant dupliqué divine:miracle:rhya:test-shield : ce miracle est déjà présent dans le livre de base \(module a\.mjs\)/],
    [{ 'a.mjs': moduleSource('Rhya', [sample()], { source: aote3Source }), 'b.mjs': moduleSource('Rhya', [sample()]) }, /ce miracle est déjà présent dans un supplément \(module a\.mjs\)/],
    [{ 'a.mjs': moduleSource('Myrmidia', [sample({ canonicalName: 'Shield of Myrmidia' })], { source: aote3Source }) }, /déjà défini par le livre de base Myrmidia/]
  ];
  for (const [files, pattern] of cases) {
    const { status, stderr } = run(files);
    assert.notEqual(status, 0, pattern.source);
    assert.match(stderr, pattern);
  }
  // Le même nom dans deux cultes distincts n’est pas un doublon.
  const ok = run({ 'a.mjs': moduleSource('Solkan', [sample()], { source: aote3Source }), 'b.mjs': moduleSource('Handrich', [sample()], { source: aote3Source }) });
  assert.equal(ok.status, 0, ok.stderr);
});

test('registre : les livres de supplément cités par un contrat sont déclarés au moteur, empreinte du complément incluse', () => {
  const books = registry.sourceManifest.supplementBooks;
  assert.ok(books.some(book => book.bookId === 'L02' && book.document === aote3.file && book.fileSha256 === aote3.sha256));
  for (const contract of registry.contracts.filter(row => row.source?.document && row.source.fileSha256 !== registry.sourceManifest.v5EnglishBaseSha256 && row.source.sourceStatus !== 'found-adaptation-blocked'))
    assert.ok(books.some(book => book.document === contract.source.document && book.fileSha256 === contract.source.fileSha256), contract.id);
  assert.equal(registry.sourceManifest.complementCorpusSha256, createHash('sha256').update(readFileSync('docs/divin/DIVIN_CORPUS_LIVRES_COMPLEMENT.json', 'utf8'), 'utf8').digest('hex'));
  assert.equal(registry.generatorVersion, 'divine-contracts-0.4.0');
});
});
