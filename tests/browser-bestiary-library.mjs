import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const requests = [];
const page_html = '<!doctype html><meta charset="utf-8"><title>Recette bibliothèque</title><link rel="stylesheet" href="/MJ.css"><div id="holder"></div><script type="module">'
  + 'import { createStore } from "/js/core/store.js"; import { createBestiaryLibrary } from "/js/ui/bestiary-library.js";'
  + 'const values = new Map(); const store = createStore({ storage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) } });'
  + 'window.store = store; window.messages = [];'
  + 'window.library = createBestiaryLibrary({ container: document.querySelector("#holder"), store, notify: (m, t) => window.messages.push([m, t]) });'
  + 'window.ready = true;</script>';
const server = createStaticServer({ root, pages: { '/qa-library': page_html } });
server.on('request', req => requests.push(req.url)); // journal des requêtes : le chargement paresseux se vérifie dessus
await new Promise(done => server.listen(0, '127.0.0.1', done));
const url = 'http://127.0.0.1:' + server.address().port;
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/qa-library');
  await page.waitForFunction(() => window.ready === true);
  // Chargement paresseux : rien n'est demandé avant l'ouverture.
  assert.equal(requests.filter(item => item.includes('/bestiary/')).length, 0);
  await page.evaluate(() => window.library.open());
  // Racine : les dossiers de premier niveau avec leur nombre de profils, aucun profil à plat (T14, CA31).
  await page.waitForFunction(() => document.querySelectorAll('.bestiary-folder').length > 0);
  assert.ok(requests.some(item => item.endsWith('/bestiary/index.json')));
  const crumbs = page.getByRole('navigation', { name: 'Fil d’Ariane du bestiaire' });
  assert.equal(await crumbs.locator('[aria-current="location"]').innerText(), 'Tout le bestiaire');
  assert.equal(await page.locator('.item').count(), 0);
  const tiles = await page.locator('.bestiary-folder').evaluateAll(nodes => nodes.map(node => node.textContent));
  assert.deepEqual(tiles.map(text => text.replace(/\d.*$/, '')), ['Bestiaire', 'Monstres', 'Ennemis', 'Peuples', 'PNJ nommés', 'PJ prétirés', 'Gabarits']);
  assert.match(tiles[2], /^Ennemis\d+ profils · \d+ dossiers$/);
  assert.match(await page.getByRole('status').innerText(), /^\d+ profils dans 7 dossiers\.$/);
  // Filtre par nom (à plat depuis la racine, chaque résultat dit son dossier) puis fiche en lecture seule.
  await page.getByLabel('Nom du profil').fill('Zombie');
  await page.waitForFunction(() => [...document.querySelectorAll('.item strong')].every(node => /zombie/i.test(node.textContent)) && document.querySelectorAll('.item').length > 0);
  assert.equal(await page.locator('.item').filter({ hasText: 'L06' }).filter({ has: page.locator('strong', { hasText: /^Zombie\b/ }) }).first()
    .getByRole('button', { name: 'Ouvrir le dossier Ennemis › Morts-vivants' }).count(), 1);
  const zombieRow = page.locator('.item').filter({ has: page.locator('strong', { hasText: /^Zombie\b/ }) }).filter({ hasText: 'L06' }).first();
  await zombieRow.getByRole('button', { name: /Fiche de Zombie/ }).click();
  assert.match(await zombieRow.locator('.bestiary-sheet').innerText(), /Blessures : 12/);
  assert.equal(await zombieRow.locator('.bestiary-sheet input, .bestiary-sheet textarea').count(), 0);
  // Ajout au combat : trois exemplaires, valeurs imprimées, camp choisi.
  await zombieRow.getByLabel(/Nombre d’exemplaires de Zombie/).fill('3');
  await zombieRow.getByRole('button', { name: 'Ajouter au combat' }).click();
  await page.waitForFunction(() => window.store.listParticipants().length === 3);
  const added = await page.evaluate(() => window.store.listParticipants().map(p => ({ name: p.name, hp: p.hp, camp: p.camp, zone: p.zone, keywords: p.keywords })));
  assert.deepEqual(added.map(p => p.name).sort(), ['Zombie 1', 'Zombie 2', 'Zombie 3']);
  assert.ok(added.every(p => p.hp === 12 && p.camp === 'ennemi' && p.zone === 'bench' && p.keywords.includes('zombie')));
  // Copie dans la Réserve.
  await zombieRow.getByRole('button', { name: 'Copier dans la réserve' }).click();
  await page.waitForFunction(() => window.store.listProfiles().length === 1);
  const profile = await page.evaluate(() => window.store.listProfiles()[0]);
  assert.equal(profile.name, 'Zombie');
  assert.equal(profile.group, 'Bestiaire');
  assert.equal(profile.hp, 12);
  // Filtre par mot-clé avec descendants : « Mort-vivant » retrouve le Zombie, pas l'Humain.
  await page.getByLabel('Nom du profil').fill('');
  await page.getByLabel('Mot-clé').selectOption('mort-vivant');
  await page.waitForFunction(() => [...document.querySelectorAll('.item strong')].some(node => /^Zombie/.test(node.textContent)));
  assert.equal(await page.locator('.item strong', { hasText: /^Human\b/ }).count(), 0);
  // Gabarit : fiche seule, aucun bouton d'ajout.
  await page.getByLabel('Mot-clé').selectOption('');
  await page.getByLabel('Genre').selectOption('template');
  await page.waitForFunction(() => document.querySelectorAll('.item').length > 0);
  assert.equal(await page.getByRole('button', { name: 'Ajouter au combat' }).count(), 0);
  // Dossiers (T14) : ouvrir un dossier, un sous-dossier au clavier, remonter par le fil d'Ariane.
  await page.getByLabel('Genre').selectOption('');
  await page.getByRole('button', { name: /^Ennemis, \d+ profils/ }).click();
  await page.waitForFunction(() => document.querySelector('.bestiary-crumbs [aria-current]')?.textContent === 'Ennemis');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Ennemis', 'le focus va sur le dossier courant');
  assert.equal(await page.locator('.bestiary-folders').getAttribute('aria-label'), 'Sous-dossiers de Ennemis');
  assert.match(await page.getByRole('status').innerText(), /^Ennemis : \d+ profils dans \d+ dossiers\.$/);
  await page.getByRole('button', { name: /^Hommes-bêtes, 8 profils$/ }).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.bestiary-crumbs [aria-current]')?.textContent === 'Hommes-bêtes');
  assert.equal(await page.getByRole('status').innerText(), 'Ennemis › Hommes-bêtes : 8 profils.');
  assert.equal(await page.locator('.item').count(), 8);
  assert.ok(await page.locator('.item strong', { hasText: /^Gor\b/ }).count() > 0);
  assert.equal(await page.locator('.bestiary-row-folder').count(), 0, 'pas de dossier par ligne hors recherche');
  assert.deepEqual(await crumbs.getByRole('button').allInnerTexts(), ['Tout le bestiaire', 'Ennemis']);
  await crumbs.getByRole('button', { name: 'Ennemis' }).click();
  await page.waitForFunction(() => document.querySelector('.bestiary-crumbs [aria-current]')?.textContent === 'Ennemis');
  // Recherche dans un dossier : bornée au dossier et à ses sous-dossiers ; depuis la racine, tout le bestiaire.
  await page.getByLabel('Nom du profil').fill('Rat');
  await page.waitForFunction(() => /trouvés? dans Ennemis\./.test(document.querySelector('[role="status"]').textContent));
  const inEnemies = await page.locator('.bestiary-row-folder').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
  assert.ok(inEnemies.length > 0 && inEnemies.every(label => label.startsWith('Ouvrir le dossier Ennemis › ')), inEnemies.join(', '));
  assert.ok(await page.getByRole('button', { name: /^Skavens, \d+ profils?$/ }).count() === 1, 'les compteurs des sous-dossiers suivent la recherche');
  assert.equal(await page.getByRole('button', { name: /^Démons, / }).count(), 0, 'un sous-dossier sans résultat est masqué');
  await crumbs.getByRole('button', { name: 'Tout le bestiaire' }).click();
  await page.waitForFunction(() => /trouvés? dans tout le bestiaire\./.test(document.querySelector('[role="status"]').textContent));
  const everywhere = await page.locator('.bestiary-row-folder').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
  assert.ok(everywhere.length > inEnemies.length && everywhere.includes('Ouvrir le dossier Bestiaire'), everywhere.join(', '));
  // Le dossier d'un résultat s'ouvre d'un clic ; ajout à la réserve depuis ce dossier.
  await page.locator('.item').filter({ has: page.locator('strong', { hasText: /^Giant Rat\b/ }) }).first().getByRole('button', { name: 'Ouvrir le dossier Bestiaire' }).click();
  await page.waitForFunction(() => document.querySelector('.bestiary-crumbs [aria-current]')?.textContent === 'Bestiaire');
  await page.getByLabel('Nom du profil').fill('');
  await page.waitForFunction(() => /^Bestiaire : \d+ profils\.$/.test(document.querySelector('[role="status"]').textContent));
  const wolfRow = page.locator('.item').filter({ has: page.locator('strong', { hasText: /^Wolf\b/ }) }).first();
  await wolfRow.getByRole('button', { name: 'Copier dans la réserve' }).click();
  await page.waitForFunction(() => window.store.listProfiles().length === 2);
  assert.ok(await page.evaluate(() => window.store.listProfiles().some(p => p.name === 'Wolf' && p.group === 'Bestiaire')));
  // Un profil sans classement (module non régénéré) apparaît dans « À classer », à la racine.
  const unclassified = await page.evaluate(async () => {
    const { BESTIARY_FOLDERS } = await import('/js/data/bestiary-folders.js');
    const { createBestiaryLibrary } = await import('/js/ui/bestiary-library.js');
    const holder = document.createElement('div'); document.body.append(holder);
    const other = createBestiaryLibrary({ container: holder, store: window.store, folders: BESTIARY_FOLDERS.filter(folder => folder.id !== 'monstres') });
    await other.open();
    const tile = [...holder.querySelectorAll('.bestiary-folder')].at(-1);
    const result = { last: tile?.textContent, expected: BESTIARY_FOLDERS.find(folder => folder.id === 'monstres').profiles.length };
    holder.remove();
    return result;
  });
  assert.equal(unclassified.last, `À classer${unclassified.expected} profils`);
  assert.deepEqual(errors, []);
  console.log('Bibliothèque de bestiaire : parcours navigateur OK');
} finally {
  await browser.close();
  server.close();
}
