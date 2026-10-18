import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import coverage from '../js/data/v5-magic-talent-coverage.json' with { type: 'json' };
import baseCoverage from '../js/data/v5-talent-coverage.json' with { type: 'json' };
import { createStore } from '../js/core/store.js';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';
import { acquireV5Conditions } from '../js/core/v5-effects.js';

const talent = (id, rank = 1, specialization) => ({ id: 'talent-' + id, status: 'resolved', rank, ...(specialization ? { specialization } : {}) });
const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 },
    { name: 'Savoir (Magie)', total: 60 }, { name: 'Prière', total: 50 }], talents: [], states: [], equipment: [],
  extensions: { v5: { hasMomentum: true } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id,
    order: people.map(p => p.id), participants: people }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id = 'mage') => store.listParticipants().find(p => p.id === id);
const clauses = new Map();
function probe(id, clause, source, run) {
  const key = `talent-${id}/${clause}`; clauses.set(key, run);
  test(`H-07 — ${key} — ${source}`, run);
}
const resolution = (store, skill, base, context = {}, roll = 25) => store.previewResolution({ actorId: 'mage',
  action: { type: 'skill', attr: 'Int', label: skill, base }, roll, v5: { kind: 'test', choice: 'keep', context } });
const meditation = (store, id, durationRolls = [1, 1]) => store.applyMagicMeditation({ actorId: 'mage', talentId: 'talent-' + id,
  name: id, minutes: 20, roll: 45, durationRolls });

probe('animal-assistant', 'magic:0', 'Archives of the Empire 3 p. 81, adaptation Avantage V5', async () => {
  const store = await combat(wizard(), wizard('familiar', { talents: [talent('animal-assistant')] }));
  assert.equal(store.previewChannelling({ actorId: 'mage', roll: 61, assistantId: 'familiar', assistantLinked: true, choice: 'reverse' }).test.roll, 16);
  assert.equal(store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 61, assistantId: 'familiar', assistantLinked: true, choice: 'reverse' }).test.roll, 16);
  for (const skill of ['Survie en extérieur', 'Perception']) {
    const p = resolution(store, skill, 40, { magicAssistantId: 'familiar', magicAssistantLinked: true, magicalNature: true }, 61);
    assert.equal(p.test.advantage.net, 1);
  }
});
probe('magical-assistant', 'magic:0', 'Winds of Magic p. 186, adaptation +2 DR', async () => {
  const store = await combat(wizard(), wizard('familiar', { talents: [talent('magical-assistant'), talent('animal-assistant')] }));
  const context = { magicAssistantId: 'familiar', magicAssistantLinked: true, magicalNature: true };
  for (const skill of ['Focalisation', 'Langue (Magick)', 'Savoir (Magie)', 'Recherche']) {
    const p = resolution(store, skill, 60, context);
    assert.equal(p.test.sl, 6); assert.equal(p.test.advantage.net, 0);
  }
});
probe('lileath-s-blessing', 'magic:0', 'HEPG p. 83', async () => {
  const store = await combat(wizard('mage', { talents: [talent('lileath-s-blessing', 2)] }));
  assert.equal(store.previewChannelling({ actorId: 'mage', type: 'high', roll: 25 }).gain, 11);
  assert.equal(store.previewChannelling({ actorId: 'mage', type: 'winds', roll: 25 }).gain, 9);
  assert.equal(store.previewChannelling({ actorId: 'mage', type: 'high', roll: 85 }).gain, 0);
});
probe('magic-defiance', 'magic:0', 'Dwarf Player’s Guide p. 80', async () => {
  const store = await combat(wizard(), wizard('target', { talents: [talent('magic-defiance')], skills: [{ name: 'Calme', total: 50 }] }));
  const input = { actorId: 'mage', targetIds: ['target'], sl: 6, resistanceRoll: 81, attributeActive: false };
  const kept = store.previewSpellExecution('Twitch', { ...input, targetTests: { target: { objectHeld:true, roll: 81, choice: 'keep' } } });
  const reversed = store.previewSpellExecution('Twitch', { ...input, targetTests: { target: { objectHeld:true, roll: 81, choice: 'reverse' } } });
  assert.equal(kept.targetResults[0].resistanceTest.resisted, false);
  assert.equal(reversed.targetResults[0].resistanceTest.resisted, true);
});
probe('magic-defiance', 'magic:1', 'Dwarf Player’s Guide p. 80', async () => {
  const store = await combat(wizard(), wizard('target', { talents: [talent('magic-defiance')] }));
  await store.setFortune('target', 2); await store.startMagicAdventure();
  const input = { actorId: 'mage', targetIds: ['target'], roll: 25, magicDefianceTargets: ['target'] };
  await store.applySpellExecution('Carreau', input); assert.equal(person(store, 'target').hp, 30); assert.equal(store.getFortune('target').balance, 1);
  assert.equal(store.previewSpellExecution('Carreau', input).ready, false);
  await store.undo(); assert.equal(store.getFortune('target').balance, 2); assert.equal(store.previewSpellExecution('Carreau', input).ready, true);
});
probe('instinctive-diction', 'magic:0', 'V5 p. 121', async () => {
  const store = await combat(wizard('mage', { talents: [talent('instinctive-diction')] }));
  const input = { actorId: 'mage', roll: 77, miscastRoll: 15, instinctiveDiction: true };
  assert.equal(store.previewCasting(getSpellContract('Carreau'), input).miscast, null);
  await store.updateParticipant('mage', { extensions: { v5: { specialStates: { forbidMitigation: true } } } });
  assert.equal(store.previewCasting(getSpellContract('Carreau'), input).miscast.name, 'Distraction');
});
probe('aethyric-attunement', 'magic:0', 'V5 p. 114', async () => {
  for (const rank of [1, 2]) {
    const store = await combat(wizard('mage', { talents: [talent('aethyric-attunement', rank)] }));
    const input = { participant: person(store), severity: rank === 1 ? 'MINOR' : 'MAJOR', roll: 50, miscastRoll2: 85 };
    assert.equal(store.previewMiscast(input).ready, false);
    assert.equal(store.previewMiscast({ ...input, miscastChoice: 'first' }).initialRoll, 50);
  }
});
probe('high-magic', 'magic:0', 'HEPG pp. 83/84, plafond V5 p. 236', async () => {
  const store = await combat(wizard('mage', { talents: [talent('high-magic', 1)], extensions: { v5: { channelling: { type: 'high', sl: 20 } } } }));
  const p = store.previewCasting(getSpellContract('Main de Gloire'), { actorId: 'mage', roll: 25 });
  assert.equal(p.availableOvercastSl, p.totalCastingSl - getSpellContract('Main de Gloire').cn + 1);
  assert.equal(p.maxOvercastSpend, 11);
});
probe('suffuse-with', 'magic:0', 'Winds of Magic p. 186', async () => {
  const store = await combat(wizard(), wizard('target'), wizard('aura', { talents: [talent('suffuse-with', 1, 'Aqshy')] }), wizard('aura2', { talents: [talent('suffuse-with', 1, 'Aqshy')] }));
  const fire = getSpellContract('Cautérisation');
  const base = store.previewCasting(fire, { actorId: 'mage', roll: 25 });
  const p = store.previewCasting(fire, { actorId: 'mage', roll: 25, participants: store.listParticipants(), suffusedBy: [{ id: 'aura', distance: 8 }, { id: 'aura2', distance: 8 }] });
  assert.equal(p.totalCastingSl, base.totalCastingSl + 1);
});
probe('suffuse-with', 'magic:1', 'Winds of Magic p. 186', async () => {
  const cases = { Aqshy: ['Force Mentale'], Azyr: ['Perception'], Chamon: ['Évaluation'], Ghur: ['Emprise sur les animaux', 'Savoir (Bêtes)'],
    Ghyran: ['Savoir (Plantes)', 'Savoir (Animaux)', 'Savoir (Herbes)', 'Soin aux animaux'], Hysh: ['Recherche'], Shyish: ['Intimidation'], Ulgu: ['Discrétion'] };
  for (const [wind, skills] of Object.entries(cases)) {
    const store = await combat(wizard('mage', { talents: [talent('suffuse-with', 1, wind)] }));
    for (const skill of skills) assert.equal(resolution(store, skill, 20, { magicSuffusedWind: wind,...(wind==='Aqshy'?{talentAction:'frenzy'}:{}) }).test.score, 60);
  }
});
for (const id of ['mind-over-body', 'sanctuary-of-the-mind', 'eye-of-the-storm']) {
  probe(id, 'magic:0', `HEPG p. ${{ 'mind-over-body': 101, 'sanctuary-of-the-mind': 109, 'eye-of-the-storm': 105 }[id]}`, async () => {
    const store = await combat(wizard('mage', { talents: [talent(id)] }));
    await assert.rejects(async () => meditation(store, id, [1]), /d10/);
    await meditation(store, id);
    assert.ok(person(store).extensions.v5.spellEffects.some(e => e.magicTalentId === 'talent-' + id));
    if (id === 'eye-of-the-storm') assert.equal(store.previewChannelling({ actorId: 'mage', mode: 'interruption', distraction: true }).ready, true);
    await store.advanceTalentMinutes(120);
    assert.equal(person(store).extensions.v5.spellEffects.some(e => e.magicTalentId === 'talent-' + id), false);
  });
}
probe('mind-over-body', 'magic:1', 'HEPG p. 101', async () => {
  const store = await combat(wizard('mage', { talents: [talent('mind-over-body', 2)] })); await meditation(store, 'mind-over-body');
  const actor = person(store);
  assert.deepEqual(acquireV5Conditions(actor, ['Sonné'], { painRelated: true }).participant.states, []);
  await store.applySpellEffects('mage', { spellId: 'blind', duration: '1 Round', conditions: ['Aveuglé'] });
  assert.deepEqual(person(store).states, []);
});
probe('mind-over-body', 'magic:2', 'HEPG p. 101, adaptation Chance du catalogue', async () => {
  const store = await combat(wizard('mage', { talents: [talent('mind-over-body', 3)] })); await store.setFortune('mage', 2); await meditation(store, 'mind-over-body');
  const before = resolution(store, 'Métier (Forgeron)', 40, { extendedTest: true, magicCriticalPenalty: -2 }).test.sl;
  await store.activateMindOverBody('mage'); assert.equal(store.getFortune('mage').balance, 1);
  assert.equal(resolution(store, 'Métier (Forgeron)', 40, { extendedTest: true, magicCriticalPenalty: -2 }).test.sl, before + 2);
  await store.undo(); assert.equal(store.getFortune('mage').balance, 2);
});
probe('war-wizard', 'magic:0', 'V5 p. 128', async () => {
  const store = await combat(wizard('mage', { talents: [talent('war-wizard')] }), wizard('target'));
  await store.applySpellExecution('Carreau', { actorId: 'mage', targetIds: ['target'], roll: 25, warWizard: true });
  assert.equal(person(store).extensions.v5.hasMomentum, false);
  assert.throws(() => store.previewChannelling({ actorId: 'mage', roll: 25 }), /Mage de guerre/);
  await store.nextTurn(); await store.nextTurn(); assert.equal(store.previewChannelling({ actorId: 'mage', roll: 25 }).ready, true);
});
probe('arcane-magic', 'magic:0', 'V5 pp. 248/251', async () => {
  for (const [lore, spec, spellName, key] of [['fire', 'Feu', 'Extinction de l’Âme', 'enflamme'], ['light', 'Lumière', 'Extinction de l’Âme', 'aveugle']]) {
    const store = await combat(wizard('mage', { extensions: { v5: { channelling: { type: 'high', sl: 25 } } } }), wizard('target', { camp: 'ennemi', talents: [talent('arcane-magic', 1, spec)] }), wizard('free', { camp: 'ennemi', talents: [{ name: `Magie des Arcanes (${spec})` }] }));
    await store.applySpellExecution(spellName, { actorId: 'mage', targetIds: ['target', 'free'], roll: 25, chosenLore: lore });
    assert.equal(person(store, 'target').states.some(s => s.key === key), false);
    assert.equal(person(store, 'free').states.some(s => s.key === key), true);
  }
});
probe('cadai-meditation', 'magic:0', 'HEPG p. 101, adaptation +2 DR', async () => {
  const store = await combat(wizard('mage', { talents: [talent('cadai-meditation')] }));
  await assert.rejects(async () => store.applyMagicMeditation({ actorId: 'mage', talentId: 'talent-cadai-meditation', minutes: 59, roll: 25 }), /heure/);
  await store.applyMagicMeditation({ actorId: 'mage', talentId: 'talent-cadai-meditation', minutes: 60, roll: 25 });
  assert.equal(person(store).extensions.v5.yenlui, 'Lumineux');
});
probe('eye-of-the-storm', 'magic:1', 'HEPG p. 105', async () => {
  const store = await combat(wizard('mage', { talents: [talent('eye-of-the-storm', 2)], states: [{ name: 'Exténué', level: 2 }] }));
  await meditation(store, 'eye-of-the-storm');
  assert.equal(store.previewChannelling({ actorId: 'mage', roll: 25 }).test.sl, 4);
  assert.equal(store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25 }).test.sl, 4);
});
probe('magical-sense', 'magic:0', 'V5 p. 122', async () => {
  const store = await combat(wizard(), wizard('observer', { talents: [talent('magical-sense')], skills: [{ name: 'Perception', total: 40 }] }));
  await store.applySpellExecution('Carreau', { actorId: 'mage', targetIds: ['observer'], roll: 25, senseFacts: { observer: { distance: 40, direction: 'à l’est' } } });
  assert.ok(JSON.parse(store.getFullJSON()).log.some(e => /observer détecte.*à l’est.*non identifiée/.test(e.text)));
});
probe('magical-sense', 'magic:1', 'V5 p. 122', async () => {
  const store = await combat(wizard('mage', { talents: [talent('magical-sense')] }));
  assert.equal(resolution(store, 'Perception', 40, { magicalNature: true, seesWinds: true }, 61).test.advantage.net, 1);
  assert.equal(resolution(store, 'Perception', 40, { magicalNature: true, seesWinds: false }, 61).test.advantage.net, 0);
});
probe('magic-resistance', 'magic:0', 'V5 p. 122, hors Puissance totale', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 2 } } } }), wizard('target', { talents: [talent('magic-resistance')] }), wizard('normal'));
  const input = { actorId: 'mage', targetIds: ['target', 'normal'], roll: 25, overcastChoices: { targets: 1 }, attributeActive: false };
  const p = store.previewSpellExecution('Carreau', input);
  assert.equal(p.targetResults.find(r => r.targetId === 'target').resisted, true);
  assert.equal(p.targetResults.find(r => r.targetId === 'normal').woundsLost > 0, true);
});
probe('sanctuary-of-the-mind', 'magic:1', 'HEPG p. 109', async () => {
  const store = await combat(wizard('mage', { talents: [talent('sanctuary-of-the-mind', 2)] })); await meditation(store, 'sanctuary-of-the-mind');
  await store.applyMiscast(store.previewMiscast({ severity: 'MINOR', roll: 85 }), { actorId: 'mage' });
  assert.equal(person(store).extensions.v5.corruptionPoints, 0);
  assert.equal(resolution(store, 'Recherche', 40).test.sl, 3);
});
probe('sanctuary-of-the-mind', 'magic:2', 'HEPG p. 109', async () => {
  const store = await combat(wizard('mage', { talents: [talent('sanctuary-of-the-mind', 3)] })); await meditation(store, 'sanctuary-of-the-mind');
  const p = store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25, yenluiPenalty: -3, slModifiers: [{ id: 'other', amount: -1 }] });
  assert.equal(p.test.sl, 3); await store.advanceTalentMinutes(120);
  assert.equal(store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25, yenluiPenalty: -3, slModifiers: [{ id: 'other', amount: -1 }] }).test.sl, 0);
});

test('H-07 : toute clause moteur a une sonde exécutée et une référence dans la couverture', () => {
  for (const item of coverage.items) for (const clause of item.clauses.filter(c => ['automatic', 'assisted'].includes(c.mode))) {
    const key = `${item.talentId}/${clause.id}`;
    if(clauses.has(key))assert.equal(clause.executionProbe, 'tests/lot3-v5-high-talent-coverage.test.js#'+key);
    else {const [file,anchor]=clause.executionProbe.split('#');assert.ok(file.startsWith('tests/lot3-'));assert.ok(readFileSync(new URL('../'+file,import.meta.url),'utf8').includes(anchor),'Sonde absente : '+key);}
  }
});
test('H-08 — V5 p. 236, D-17 : Seconde vue en zone saturée reste un rappel MJ', () => {
  const item = baseCoverage.items.find(t => t.talentId === 'talent-second-sight');
  assert.ok(item); assert.equal(item.clauses.every(c => c.mode === 'reminder'), true);
  assert.equal(coverage.contextReminders.find(c => c.talentId === 'talent-second-sight').mode, 'reminder');
});
