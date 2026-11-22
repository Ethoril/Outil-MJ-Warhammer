import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publishedDecisions, withdrawDecision } from '../../../js/ui/combat-decisions.js';
import { disengageDecision } from '../../../js/ui/workspace/plateau.js';
import { wrathDecisionOf } from '../../../js/ui/v5-divine-panel.js';
import { confirmParticipantRemoval, openEncounterEndDialog } from '../../../js/ui/encounter-end-dialog.js';
import { mountMapLinkFeedback, runDecision } from '../../../js/ui/map-link-feedback.js';
import { createMapLink } from '../../../js/core/map-link.js';

// Refonte de l'interface, lot E2b (CA7, CA10) : les six décisions que E2 n'avait pas branchées (6, 12, 16, 17, 20, 21)
// sont publiées dans la case « À décider » pendant qu'elles attendent, puis retirées ; les fenêtres de décision du combat
// ne sont plus modales, sauf la confirmation de « Terminer le combat ».
const source = path => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
const published = id => publishedDecisions().find(row => row.id === id) || null;
const keys = entry => entry.options.map(option => option.key);

// DOM minimal : juste ce que les fenêtres d'encounter-end-dialog.js utilisent.
function installFakeDocument() {
  const fire = (target, type, event = {}) => {
    const list = target.listeners[type] || [];
    target.listeners[type] = list.filter(row => !row.once);
    for (const row of list) row.fn({ type, preventDefault() {}, ...event });
  };
  const make = tag => {
    const node = {
      tagName: tag.toUpperCase(), children: [], style: {}, dataset: {}, listeners: {}, attributes: {}, textContent: '', className: '', isConnected: true, checked: false, value: '', type: '', name: '',
      append(...items) { for (const item of items) if (item && typeof item === 'object') { item.parentElement = node; node.children.push(item); } },
      prepend(...items) { node.append(...items); },
      before(item) { node.parentElement?.append(item); },
      remove() { node.isConnected = false; },
      setAttribute(key, value) { node.attributes[key] = String(value); },
      getAttribute(key) { return node.attributes[key] ?? null; },
      addEventListener(type, fn, options) { (node.listeners[type] ||= []).push({ fn, once: options?.once === true }); },
      focus() {},
      all() { return [node, ...node.children.flatMap(child => (child.all ? child.all() : []))]; }
    };
    if (tag === 'dialog') {
      node.open = false; node.modal = false;
      node.show = () => { node.open = true; node.modal = false; };
      node.showModal = () => { node.open = true; node.modal = true; };
      node.close = () => { if (!node.open) return; node.open = false; fire(node, 'close'); };
    }
    if (tag === 'form') node.requestSubmit = () => fire(node, 'submit');
    if (tag === 'button') node.click = () => fire(node, 'click');
    return node;
  };
  const body = make('body');
  globalThis.document = { createElement: make, createTextNode: text => ({ text }), body, activeElement: null, getElementById: () => null };
  return { lastDialog: () => body.children.filter(child => child.tagName === 'DIALOG').at(-1) };
}

test('6 · désengagement encerclé : « Passer outre » ou « Renoncer » dans la case, branchés sur le formulaire', () => {
  const calls = [];
  const actor = { id: 'a', name: 'Erich' };
  const entry = disengageDecision({ actor, plan: { mode: 'surrounded', status: 'blocked', reason: 'Erich est encerclé.' }, state: {} },
    { onForce: () => calls.push('force'), onClose: () => calls.push('close'), onAnswer: () => calls.push('answer') });
  assert.equal(entry.id, 'fuite:a');
  assert.equal(entry.kind, 'fuite');
  assert.equal(entry.participantId, 'a');
  assert.match(entry.titre, /Erich/);
  assert.deepEqual(keys(entry), ['override', 'close']);
  entry.onChoose('override');
  entry.onChoose('close');
  assert.deepEqual(calls, ['force', 'close']);
  assert.equal(disengageDecision({ actor, plan: { mode: 'surrounded', status: 'blocked' }, state: { force: true } }), null, 'passé outre : plus rien à décider');
});

test('6 · désengagement : une question d’État sans réponse attend le MJ ; répondue, elle quitte la case', () => {
  const actor = { id: 'a', name: 'Erich' };
  const plan = { mode: 'test', status: 'requires-input', needsInput: [{ side: 'actor', field: 'involvesMovement', label: 'Le test implique-t-il un mouvement ?' }] };
  let answered = 0;
  const entry = disengageDecision({ actor, plan, state: {} }, { onAnswer: () => { answered += 1; } });
  assert.equal(entry.kind, 'fuite');
  assert.match(entry.titre, /mouvement/);
  assert.deepEqual(keys(entry), ['answer']);
  entry.onChoose('answer');
  assert.equal(answered, 1);
  assert.equal(disengageDecision({ actor, plan, state: { context: { involvesMovement: false } } }), null);
  assert.equal(disengageDecision({ actor, plan: { mode: 'test', status: 'ready', needsInput: [] }, state: {} }), null, 'jet prêt : rien à décider');
  assert.equal(disengageDecision({ actor: null, plan, state: {} }), null);
});

test('12 · Courroux déclenché par la prière en cours : décision dans la case jusqu’à l’application', () => {
  const actor = { id: 'p', name: 'Père Pedragar' };
  const entry = wrathDecisionOf(actor, { wrath: { triggered: true, sinAtTest: 3 } });
  assert.equal(entry.id, 'courroux:p');
  assert.equal(entry.kind, 'courroux');
  assert.equal(entry.participantId, 'p');
  assert.match(entry.titre, /Courroux/);
  assert.deepEqual(keys(entry), ['open']);
  assert.equal(wrathDecisionOf(actor, { wrath: { triggered: false } }), null);
  assert.equal(wrathDecisionOf(actor, null), null);
  assert.equal(wrathDecisionOf(null, { wrath: { triggered: true } }), null);
});

test('12 · le moteur n’écrit aucun « Courroux en attente » : la décision vient du panneau des prières, pas de l’état de la partie', () => {
  // `pendingWrath` est lu par le moteur (garde avant une nouvelle prière) mais aucune ligne ne l'écrit.
  const core = ['js/core/v5-divine-store.js', 'js/core/v5-divine-engine.js'].map(source).join('\n');
  assert.doesNotMatch(core, /pendingWrath\s*[:=]/);
  assert.match(source('js/ui/workspace-view.js'), /divinePanel\.decision\(/);
});

test('16 · retrait d’un participant : fenêtre non modale, question publiée, « Annuler » la retire sans rien retirer', async () => {
  const dom = installFakeDocument();
  const removed = [];
  const Store = { listParticipants: () => [{ id: 'u', name: 'Ungor 1', kind: 'PNJ', extensions: {} }], previewEncounterEnd: () => [], removeParticipant: async (id, options) => { removed.push([id, options]); } };
  const pending = confirmParticipantRemoval(Store, 'u');
  const dialog = dom.lastDialog();
  assert.equal(dialog.open, true);
  assert.equal(dialog.modal, false, 'pas de fenêtre modale pendant le combat (CA10)');
  const entry = published('retrait:u');
  assert.equal(entry.kind, 'retrait');
  assert.equal(entry.participantId, 'u');
  assert.deepEqual(keys(entry), ['confirm', 'cancel']);
  await entry.onChoose('cancel');
  assert.equal(await pending, false);
  assert.equal(published('retrait:u'), null, 'retirée à la fermeture');
  assert.deepEqual(removed, []);
});

test('16 · retrait confirmé depuis la case : même appel au store que le bouton de la fenêtre', async () => {
  const dom = installFakeDocument();
  const removed = [];
  const Store = { listParticipants: () => [{ id: 'u', name: 'Ungor 1', kind: 'PNJ', extensions: {} }], previewEncounterEnd: () => [], removeParticipant: async (id, options) => { removed.push([id, options]); } };
  const pending = confirmParticipantRemoval(Store, 'u');
  assert.equal(dom.lastDialog().modal, false);
  await published('retrait:u').onChoose('confirm');
  assert.equal(await pending, true);
  assert.deepEqual(removed, [['u', { withMount: false, keepIds: [] }]]);
  assert.equal(published('retrait:u'), null);
});

test('16 et 17 · « Garder ou archiver » : non modale au retrait, modale (seule exception) à la fin du combat ; question publiée', async () => {
  const dom = installFakeDocument();
  const candidates = [{ participantId: 'u', name: 'Ungor 1', count: 1 }];
  const removal = openEncounterEndDialog({ candidates, removal: true });
  assert.equal(dom.lastDialog().modal, false);
  const removalEntry = publishedDecisions().find(row => row.kind === 'retrait');
  assert.ok(removalEntry, 'retrait publié');
  await removalEntry.onChoose('cancel');
  assert.equal(await removal, null);
  assert.equal(publishedDecisions().filter(row => row.kind === 'retrait').length, 0);

  const end = openEncounterEndDialog({ candidates });
  assert.equal(dom.lastDialog().modal, true, 'la confirmation de « Terminer le combat » reste modale');
  const endEntry = published('fin-combat');
  assert.equal(endEntry.kind, 'fin-combat');
  assert.deepEqual(keys(endEntry), ['confirm', 'cancel']);
  await endEntry.onChoose('confirm');
  assert.deepEqual(await end, { keepIds: [], openCampaign: false });
  assert.equal(published('fin-combat'), null);
});

test('fenêtres d’effets V5 et de récupération : plus de showModal (CA10)', () => {
  assert.doesNotMatch(source('js/ui/v5-effect-dialog.js'), /showModal/);
});

const fakeChannel = () => ({ all: [], postMessage(message) { this.all.push(message); }, onmessage: null });
const pj = { id: 'a', kind: 'PJ', persistentCharacterId: 'c9', name: 'Ulrika', hp: 10, maxHp: 14, states: [], movement: 4, zone: 'active' };
const gob = id => ({ id, kind: 'PNJ', camp: 'ennemi', name: `Gobelin ${id}`, hp: 8, maxHp: 8, states: [], movement: 4, zone: 'active' });

function feedback(people) {
  const channel = fakeChannel(), toasts = [], engaged = [];
  const link = createMapLink({ channel, getParticipants: () => people, now: () => 1000, setTimer: () => 0, clearTimer: () => {} });
  const store = { listParticipants: () => people, listEngagedWith: () => [], engageParticipants: (a, b) => { engaged.push([a, b]); return { ok: true }; } };
  const node = { hidden: true, textContent: '', removeAttribute() {} };
  const ui = mountMapLinkFeedback({ mapLink: link, store, pendingNode: node, showToast: (message, type, action) => toasts.push({ message, action }) });
  const map = (type, payload = {}) => channel.onmessage({ data: { v: 1, type, from: 'map', payload } });
  return { ui, toasts, engaged, map };
}

test('20 · engagement suggéré par la carte : publié dans la case, « Engager » passe par le store, puis retiré', async () => {
  const f = feedback([pj, gob('g1'), gob('g2')]);
  f.map('map.adjacency', { pairs: [['pj:c9', 'p:g1'], ['pj:c9', 'p:g2']] });
  const entries = publishedDecisions().filter(row => row.kind === 'engagement-carte');
  assert.equal(entries.length, 2);
  const first = entries.find(row => /Gobelin g1/.test(row.titre));
  assert.deepEqual(keys(first), ['engage', 'ignore']);
  await first.onChoose('engage');
  assert.deepEqual(f.engaged, [['a', 'g1']]);
  assert.equal(published(first.id), null);
  // Ignorer retire la question sans rien engager.
  const second = publishedDecisions().find(row => row.kind === 'engagement-carte');
  await second.onChoose('ignore');
  assert.equal(publishedDecisions().filter(row => row.kind === 'engagement-carte').length, 0);
  assert.equal(f.engaged.length, 1);
  // Une paire qui n'est plus au contact quitte la case ; le bouton du toast la retire aussi.
  f.map('map.adjacency', { pairs: [] });
  f.map('map.adjacency', { pairs: [['pj:c9', 'p:g1']] });
  assert.equal(publishedDecisions().filter(row => row.kind === 'engagement-carte').length, 1);
  f.map('map.adjacency', { pairs: [] });
  assert.equal(publishedDecisions().filter(row => row.kind === 'engagement-carte').length, 0);
  f.map('map.adjacency', { pairs: [['pj:c9', 'p:g2']] });
  await f.toasts.at(-1).action.onClick();
  assert.equal(publishedDecisions().filter(row => row.kind === 'engagement-carte').length, 0);
  f.ui.destroy();
});

test('21 · course sur la carte : « Action utilisée » ne décompte qu’au clic, puis la question quitte la case', async () => {
  const spent = [];
  const entry = runDecision({ actorId: 'a', canSpend: true, message: 'Ulrika a couru : Action utilisée ?' }, { spend: id => { spent.push(id); return { ok: true }; } });
  assert.equal(entry.id, 'course-carte:a');
  assert.equal(entry.kind, 'course-carte');
  assert.equal(entry.participantId, 'a');
  assert.deepEqual(keys(entry), ['used', 'ignore']);
  assert.deepEqual(spent, [], 'rien sans clic');
  await entry.onChoose('used');
  assert.deepEqual(spent, ['a']);
  assert.equal(runDecision({ actorId: 'a', canSpend: false, message: 'hors de son Tour' }, { spend: () => {} }), null, 'rien à décompter : pas de question');
  // main.js publie la question à la course et la retire au clic du toast.
  const main = source('js/main.js');
  assert.match(main, /publishDecision\(runDecision\(/);
  assert.match(main, /withdrawDecision\(`course-carte:\$\{proposal\.actorId\}`\)/);
  for (const row of publishedDecisions()) withdrawDecision(row.id);
});
