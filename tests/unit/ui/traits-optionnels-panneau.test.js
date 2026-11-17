// Panneau « Traits optionnels » du profil de Réserve (chantier docs/specs/traits-optionnels, lot L6) : cases, cases grisées, Tailles
// exclusives, ajout d'un Trait, valeurs imprimée / modifiée, commandes annulables, monture proposable (CA1, CA2, CA13, CA14, CA17 à CA20).
// Le DOM est un faux arbre ; le Store est réel (rien de la règle n'est simulé).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../../../js/core/store.js';
import { buildReserveProfileFromBestiary } from '../../../js/core/bestiary-profiles.js';
import { readOptionalChoices, toggleOptionalTrait } from '../../../js/core/optional-traits.js';
import { createOptionalTraitsPanel, reserveMountCandidates, mountTemplateFromProfile } from '../../../js/ui/optional-traits-panel.js';

class El {
  constructor(tag) { Object.assign(this, { tagName: tag, children: [], dataset: {}, attrs: {}, listeners: {}, className: '', value: '', checked: false, disabled: false, hidden: false, _text: '' }); }
  append(...items) { for (const item of items) if (item != null) this.children.push(typeof item === 'string' ? Object.assign(new El('#text'), { _text: item }) : item); }
  appendChild(item) { this.append(item); return item; }
  replaceChildren(...items) { this.children = []; this.append(...items); }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key]; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  focus() { El.focused = this; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(' '); }
}
const withDom = async work => {
  const old = globalThis.document;
  globalThis.document = { createElement: tag => new El(tag) };
  El.focused = null;
  try { return await work(); } finally { globalThis.document = old; }
};
const all = (root, predicate, found = []) => { if (predicate(root)) found.push(root); for (const child of root.children || []) all(child, predicate, found); return found; };
const byData = (root, key, value) => all(root, el => key in el.dataset && (value === undefined || el.dataset[key] === value))[0] || null;
const allData = (root, key) => all(root, el => key in el.dataset);
const fire = async (el, type = 'click') => { await el.listeners[type](); await new Promise(resolve => setImmediate(resolve)); };
const keysOf = panel => allData(panel.element, 'optionalKey').map(el => el.dataset.optionalKey);
const boxOf = (panel, key) => byData(panel.element, 'optionalKey', key);

const book = file => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${file}.json`, import.meta.url), 'utf8')).profiles;
const l06 = book('L06');
const OGRE = 'E0-P-072';
const ogreRecord = l06.find(row => row.id === OGRE);
const ogreTemplate = buildReserveProfileFromBestiary(OGRE, { library: l06, nameFr: true });

async function table(extra = []) {
  const store = createStore({ storage: null });
  await store.ready;
  await store.addProfile({ id: 'ogre', ...structuredClone(ogreTemplate) });
  await store.addProfile({ id: 'pj', name: 'Caelel', kind: 'PJ', caracs: { CC: 40 }, skills: [], talents: [], equipment: [], diceLines: [], extensions: {} });
  await store.addProfile({ id: 'libre', name: 'Brigand', kind: 'PNJ', initiative: 30, hp: 10, maxHp: 10, caracs: { CC: 40, F: 30, E: 30 }, skills: [], talents: [], equipment: [], diceLines: [], extensions: {} });
  for (const row of extra) await store.addProfile(row);
  return store;
}
const panelFor = (store, record = ogreRecord, Store = store) => createOptionalTraitsPanel({ Store, loadRecord: () => record });
const open = async (panel, store, id = 'ogre') => { await panel.setSubject(store.listProfiles().find(row => row.id === id)); return panel; };
const choicesOf = (store, id = 'ogre') => readOptionalChoices(store.listProfiles().find(row => row.id === id));
const messageOf = panel => byData(panel.element, 'optionalMessage').textContent.trim();
const search = async (panel, text) => { const input = byData(panel.element, 'optionalSearch'); input.value = text; await fire(input, 'input'); };
const pickable = panel => allData(panel.element, 'optionalPick').map(el => el.dataset.optionalPick);

test('CA1, CA20 : une case décochée par Trait optionnel et par pièce d’armure optionnelle, libellées', async () => withDom(async () => {
  const store = await table();
  const panel = await open(panelFor(store), store);
  assert.equal(panel.element.hidden, false);
  assert.deepEqual(keysOf(panel), ['Belligerent', 'Infected', 'Tracker', 'armour:Gut Plate', 'armour:Helmet', 'armour:Ironfist']);
  for (const el of allData(panel.element, 'optionalKey')) { assert.equal(el.checked, false); assert.equal(el.disabled, false); }
  const label = all(panel.element, el => el.tagName === 'label' && el.children.includes(boxOf(panel, 'Tracker')))[0];
  assert.match(label.textContent, /Pisteur/, 'la case est dans un label au nom français du Trait');
  assert.ok(byData(panel.element, 'optionalAdd'), 'le bouton « Ajouter un Trait » est là');
}));

test('CA2, D25 : un PNJ sans fiche de bestiaire ne montre que « Ajouter un Trait » ; un PJ n’a pas de panneau', async () => withDom(async () => {
  const store = await table();
  const free = await open(panelFor(store, null), store, 'libre');
  assert.equal(free.element.hidden, false);
  assert.deepEqual(keysOf(free), []);
  assert.ok(byData(free.element, 'optionalAdd'));
  const pj = await open(panelFor(store, null), store, 'pj');
  assert.equal(pj.element.hidden, true);
  const none = await open(panelFor(store, null), store, 'absent');
  assert.equal(none.element.hidden, true);
}));

test('Cocher une case écrit les coches du profil, par une commande annulable (CA4)', async () => withDom(async () => {
  const store = await table();
  const panel = await open(panelFor(store), store);
  const box = boxOf(panel, 'Tracker');
  box.checked = true;
  await fire(box, 'change');
  assert.deepEqual(choicesOf(store).traits.map(row => row.key), ['Tracker']);
  assert.equal(boxOf(panel, 'Tracker').checked, true, 'la case reste cochée après le nouveau dessin');
  await store.undo();
  await panel.refresh();
  assert.deepEqual(choicesOf(store).traits, []);
  assert.equal(boxOf(panel, 'Tracker').checked, false);
  await store.redo();
  await panel.refresh();
  assert.equal(boxOf(panel, 'Tracker').checked, true);
  const piece = boxOf(panel, 'armour:Helmet'); piece.checked = true; await fire(piece, 'change');
  assert.deepEqual(choicesOf(store).armour.map(row => row.name), ['Helmet']);
}));

test('CA9, D18 : valeur imprimée et valeur modifiée ; case « déjà compté » grisée et sans effet', async () => withDom(async () => {
  const store = await table();
  const record = { ...ogreRecord, optionalTraits: [{ name: 'Tough' }, { name: 'Hardy' }], traits: [...ogreRecord.traits, { name: 'Hardy' }] };
  const panel = await open(panelFor(store, record), store);
  const hardy = boxOf(panel, 'Hardy');
  assert.equal(hardy.disabled, true);
  assert.match(all(panel.element, el => el.tagName === 'label' && el.children.includes(hardy))[0].textContent, /déjà compté/);
  assert.equal(allData(panel.element, 'optionalChange').length, 0, 'sans coche, aucune ligne imprimé → modifié');
  const tough = boxOf(panel, 'Tough'); tough.checked = true; await fire(tough, 'change');
  const line = byData(panel.element, 'optionalChange', 'E');
  assert.match(line.textContent, /45/); assert.match(line.textContent, /55/); assert.match(line.textContent, /→/);
  assert.ok(byData(panel.element, 'optionalChange', 'FM'));
  assert.ok(byData(panel.element, 'optionalChange', 'Blessures'), 'les Blessures changent aussi');
  tough.checked = false; await fire(boxOf(panel, 'Tough'), 'change');
  assert.equal(allData(panel.element, 'optionalChange').length, 0, 'décocher rend l’imprimé');
}));

test('CA12 : deux Tailles ne se cochent pas ensemble', async () => withDom(async () => {
  const store = await table();
  const record = { ...ogreRecord, optionalTraits: [{ name: 'Size', param: 'Small' }, { name: 'Size', param: 'Huge' }] };
  const panel = await open(panelFor(store, record), store);
  const small = boxOf(panel, 'Size:Small'); small.checked = true; await fire(small, 'change');
  const huge = boxOf(panel, 'Size:Huge');
  assert.equal(huge.disabled, true);
  assert.match(all(panel.element, el => el.tagName === 'label' && el.children.includes(huge))[0].textContent, /Une seule Taille/);
}));

test('CA13 : une case par dressage d’une fiche dont « Dressé » est optionnel', async () => withDom(async () => {
  const store = await table();
  const record = { ...ogreRecord, optionalTraits: [{ name: 'Trained', param: 'Mount, War' }] };
  const panel = await open(panelFor(store, record), store);
  assert.deepEqual(keysOf(panel), ['Trained:Mount', 'Trained:War', 'armour:Gut Plate', 'armour:Helmet', 'armour:Ironfist']);
}));

test('D17 : Leader n’est proposé ni en case ni à l’ajout sur une créature Bestial', async () => withDom(async () => {
  const store = await table();
  const bestial = { ...ogreRecord, traits: [...ogreRecord.traits, { name: 'Bestial' }], optionalTraits: [{ name: 'Leader' }] };
  const panel = await open(panelFor(store, bestial), store);
  assert.deepEqual(keysOf(panel).filter(key => key === 'Leader'), []);
  await fire(byData(panel.element, 'optionalAdd'));
  await search(panel, 'meneur');
  assert.deepEqual(pickable(panel), []);
  const plain = await open(panelFor(store, ogreRecord), store);
  await fire(byData(plain.element, 'optionalAdd'));
  await search(plain, 'meneur');
  assert.deepEqual(pickable(plain), ['Leader']);
}));

test('CA17 : « Ajouter un Trait » cherche par nom français ou anglais, le Trait ajouté apparaît coché et se retire', async () => withDom(async () => {
  const store = await table();
  const panel = await open(panelFor(store), store);
  const add = byData(panel.element, 'optionalAdd');
  const dialog = byData(panel.element, 'optionalDialog');
  assert.equal(dialog.hidden, true);
  await fire(add);
  assert.equal(dialog.hidden, false);
  await search(panel, 'coriace');
  assert.deepEqual(pickable(panel), ['Tough']);
  await search(panel, 'tough');
  assert.deepEqual(pickable(panel), ['Tough']);
  await fire(byData(panel.element, 'optionalPick', 'Tough'));
  await fire(byData(panel.element, 'optionalConfirm'));
  assert.deepEqual(choicesOf(store).traits.map(row => [row.key, row.origin]), [['Tough', 'free']]);
  assert.equal(boxOf(panel, 'Tough').checked, true);
  assert.equal(byData(panel.element, 'optionalDialog').hidden, true, 'le dialogue se ferme après l’ajout');
  assert.equal(El.focused, byData(panel.element, 'optionalAdd'), 'le focus revient au bouton « Ajouter un Trait »');
  const box = boxOf(panel, 'Tough'); box.checked = false; await fire(box, 'change');
  assert.deepEqual(choicesOf(store).traits, []);
  assert.equal(boxOf(panel, 'Tough'), null, 'un Trait ajouté disparaît du panneau une fois retiré');
}));

test('CA19 : un Trait déjà présent n’est pas reproposé', async () => withDom(async () => {
  const store = await table();
  const panel = await open(panelFor(store), store);
  const first = toggleOptionalTrait(ogreRecord, readOptionalChoices(null), 'Tracker');
  await store.setProfileOptionalChoices('ogre', first.choices, { expectedLocalRevision: store.getLocalRevision() });
  await panel.refresh();
  await fire(byData(panel.element, 'optionalAdd'));
  await search(panel, 'pisteur');
  assert.deepEqual(pickable(panel), [], 'Pisteur est déjà coché');
  await search(panel, 'hungry');
  assert.deepEqual(pickable(panel), [], 'Affamé est déjà un Trait de base');
}));

test('CA18, D12 : un Trait à paramètre demande sa valeur ; sans valeur, refus en français annoncé par aria-live', async () => withDom(async () => {
  const store = await table();
  const panel = await open(panelFor(store), store);
  await fire(byData(panel.element, 'optionalAdd'));
  await search(panel, 'morsure');
  await fire(byData(panel.element, 'optionalPick', 'Bite'));
  const param = byData(panel.element, 'optionalParam');
  assert.equal(param.hidden, false, 'le champ du paramètre apparaît');
  await fire(byData(panel.element, 'optionalConfirm'));
  assert.match(messageOf(panel), /demande/);
  assert.equal(byData(panel.element, 'optionalMessage').attrs['aria-live'], 'assertive');
  assert.deepEqual(choicesOf(store).traits, []);
  assert.equal(byData(panel.element, 'optionalDialog').hidden, false, 'le dialogue reste ouvert sur un refus');
  param.value = '2';
  await fire(byData(panel.element, 'optionalConfirm'));
  assert.deepEqual(choicesOf(store).traits.map(row => [row.name, row.param]), [['Bite', '2']]);
}));

test('Un Store sans setProfileOptionalChoices ne fait pas échouer le panneau', async () => withDom(async () => {
  const store = await table();
  const bare = { getProfile: id => store.getProfile(id), getLocalRevision: () => store.getLocalRevision() };
  const panel = await open(panelFor(store, ogreRecord, bare), store);
  const box = boxOf(panel, 'Tracker'); box.checked = true;
  await fire(box, 'change');
  assert.match(messageOf(panel), /indisponible/);
  assert.deepEqual(choicesOf(store).traits, []);
  assert.equal(boxOf(panel, 'Tracker').checked, false, 'la case revient à l’état enregistré');
}));

test('CA22 : le profil monture-<PJ> a le même panneau', async () => withDom(async () => {
  const store = await table([{ id: 'monture-pj', name: 'Destrier', kind: 'Créature', initiative: 30, hp: 20, maxHp: 20, caracs: { CC: 40, F: 40, E: 40 }, skills: [], talents: [], equipment: [], diceLines: [], extensions: { mountFor: { profileId: 'pj' } } }]);
  const panel = await open(panelFor(store, ogreRecord), store, 'monture-pj');
  assert.equal(panel.element.hidden, false);
  assert.ok(boxOf(panel, 'Tracker'));
}));

test('CA14, D24 : un profil de Réserve coché « Dressé (Monture) » est proposé comme monture, copié avec ses coches', async () => {
  const mount = { id: 'cheval', name: 'Cheval', kind: 'Créature', caracs: {}, extensions: { v5: { optionalChoices: { traits: [{ key: 'Trained:Mount', name: 'Trained', param: 'Mount', kind: 'trained', origin: 'optional' }], attacks: [], armour: [] }, bestiary: { id: 'E0-P-1', book: 'L06' } } } };
  const plain = { id: 'chat', name: 'Chat', kind: 'Créature', caracs: {}, extensions: {} };
  const pj = { id: 'pj', name: 'Cheval du PJ', kind: 'PJ', caracs: {}, extensions: mount.extensions };
  const own = { ...mount, id: 'monture-pj', name: 'Cheval attaché', extensions: { ...mount.extensions, mountFor: { profileId: 'pj' } } };
  assert.deepEqual(reserveMountCandidates([mount, plain, pj, own, { ...mount, id: 'cheval-2', name: 'Poney' }], { search: '' }).map(row => row.id), ['cheval', 'cheval-2']);
  assert.deepEqual(reserveMountCandidates([mount, { ...mount, id: 'cheval-2', name: 'Poney' }], { search: 'pon' }).map(row => row.id), ['cheval-2']);
  assert.deepEqual(reserveMountCandidates([mount], { search: '', excludeId: 'cheval' }), []);
  const template = mountTemplateFromProfile({ ...mount, favorite: true, group: 'Écurie', extensions: { ...mount.extensions, v5: { ...mount.extensions.v5, declaredMount: { profileId: 'x' } } } });
  assert.equal(template.id, undefined);
  assert.equal(template.favorite, undefined);
  assert.deepEqual(template.extensions.v5.optionalChoices, mount.extensions.v5.optionalChoices, 'les coches suivent la copie');
  assert.equal(template.extensions.v5.declaredMount, undefined);
  assert.equal(template.extensions.v5.bestiary.id, 'E0-P-1');
});
