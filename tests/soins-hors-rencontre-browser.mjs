// Parcours CAMP-10 « soins hors rencontre » : fin de combat avec la fenêtre « Garder ou archiver », ↶ par le toast,
// puis Campagne : personnages suivis listés avec leurs PV, soin par un personnage suivi, maladie soignée par un soigneur
// extérieur, rechargement, et suppression confirmée d'un personnage suivi dans Préparer.
// CA8 à CA11, CA14, CA15, CA18 à CA20, CA22, CA31, CA32, CA39.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('../', import.meta.url)), base = '/Outil-MJ-Warhammer/';
const server = createStaticServer({ root, base, headers: { 'Cache-Control': 'no-store' } });
const person = (id, name, kind, extra = {}) => ({ id, name, kind, camp: kind === 'PJ' ? 'pj' : 'ennemi', zone: 'active', initiative: 30, hp: 20, maxHp: 20,
  caracs: { CC: 40, CT: 40, F: 40, E: 30, I: 40, Ag: 35, Dex: 35, Int: 50, FM: 35, Soc: 25 }, skills: [], talents: [], equipment: [], traits: [], states: [], actions: [], extensions: { v5: {} }, ...extra });
const incident = (id, participantId, extra = {}) => ({ id, participantId, source: { kind: 'wounds-lost', cause: 'combat' }, subjectKind: 'person', injuryDay: 0, status: 'open',
  bandaged: false, requiresSurgery: false, surgeryCompleted: true, infection: false, dailyChecks: [], treatments: [], ...extra });
const hildaProfile = { id: 'profil-hilda', name: 'Hilda', kind: 'PJ', hp: 20, maxHp: 20, caracs: person('x', 'x', 'PJ').caracs, skills: [], talents: [], extensions: { ficheId: 'fiche-hilda', v5: {} } };
const fixture = () => ({ schemaVersion: 3, reserve: [hildaProfile], diceLines: [], log: [], combat: { round: 1, currentActorId: 'hilda', order: ['hilda', 'otto', 'gob'], participants: [
  person('hilda', 'Hilda', 'PJ', { hp: 6, profileId: 'profil-hilda', extensions: { ficheId: 'fiche-hilda', v5: {} } }),
  person('otto', 'Otto', 'PJ', { hp: 19, skills: [{ id: 'heal', name: 'Guérison', status: 'resolved', total: 60, carac: 'Int', advances: 10 }] }),
  person('gob', 'Gobelin', 'Créature', { hp: 2, maxHp: 9 })] },
  extensions: { v5: { combatId: 'soins-hors-rencontre', turnIndex: 1, aftermathRegister: { schemaVersion: 1, revision: 3, calendar: { schemaVersion: 1, originDay: 0, currentDay: 0 }, receipts: [], diseases: [], sequelae: [],
    incidents: [incident('i-hilda', 'hilda'), incident('i-otto', 'otto', { bandaged: true }), incident('i-gob', 'gob')] } } } });

await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
try {
  const context = await browser.newContext({ serviceWorkers: 'block' }), page = await context.newPage(), errors = [];
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { errors.push(`boîte native : ${dialog.message()}`); void dialog.dismiss(); });
  const origin = `http://127.0.0.1:${server.address().port}${base}`;
  const ready = () => page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  await page.goto(origin, { waitUntil: 'domcontentloaded' }); await ready();
  const read = () => page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return JSON.parse(Store.getFullJSON()); });
  await page.evaluate(async state => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; await Store.loadFromJSON(state); }, fixture());
  await page.locator('#tab-combat').click();
  const endButton = page.locator('#workspace-end-combat');
  await expect(endButton).toBeVisible();

  // 1. Fenêtre « Garder ou archiver » : seuls Otto (PJ sans fiche) et le Gobelin sont proposés ; Hilda est suivie d'office.
  await endButton.click();
  const dialog = page.locator('dialog.encounter-end-dialog');
  await expect(dialog).toContainText('Terminer le combat : garder ou archiver');
  await expect(dialog.locator('input[name=keep]')).toHaveCount(2);
  await expect(dialog).toContainText('Garder « Otto »');
  await expect(dialog).toContainText('Garder « Gobelin »');
  await expect(dialog).not.toContainText('Hilda');
  // Annuler ne termine rien.
  await dialog.getByRole('button', { name: 'Annuler' }).click();
  await expect(dialog).toHaveCount(0);
  assert.equal((await read()).combat.participants.length, 3, 'annuler la fenêtre laisse le combat en place');

  // 2. Garder Otto, archiver le Gobelin ; un seul ↶ (toast « Annuler ») défait tout (CA11).
  await endButton.click();
  await dialog.getByLabel(/Garder « Otto »/).check();
  await dialog.getByRole('button', { name: 'Terminer le combat' }).click();
  await expect(page.locator('#toast-container')).toContainText('Combat terminé');
  let saved = await read();
  assert.equal(saved.combat.participants.length, 0);
  assert.deepEqual(saved.persistentCharacters.map(row => [row.name, row.hp]).sort(), [['Hilda', 6], ['Otto', 19]]);
  assert.deepEqual(saved.extensions.v5.aftermathRegister.incidents.map(row => row.status), ['open', 'open', 'archived']);
  await page.locator('#toast-container').getByRole('button', { name: 'Annuler' }).click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.listParticipants().length === 3; });
  saved = await read();
  assert.deepEqual([saved.persistentCharacters.length, saved.extensions.v5.aftermathRegister.incidents.map(row => row.status)], [0, ['open', 'open', 'open']], 'un seul ↶ annule gardes et archivages');
  await endButton.click();
  await dialog.getByLabel(/Garder « Otto »/).check();
  await dialog.getByRole('button', { name: 'Terminer le combat' }).click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.listParticipants().length === 0; });

  // 3. Campagne : personnages suivis listés avec leurs PV, pastille « Hors rencontre », aucun ancien libellé.
  await page.locator('#tab-campaign').click();
  const campaign = page.locator('#workspace-campaign');
  const people = campaign.locator('[data-campaign-person]');
  await expect(people).toHaveCount(2);
  const hilda = people.filter({ hasText: 'Hilda' }), otto = people.filter({ hasText: 'Otto' });
  await expect(hilda).toContainText('6 / 20 PV');
  await expect(hilda).toContainText('Hors rencontre');
  await expect(otto).toContainText('19 / 20 PV');
  for (const banned of ['Suivi hors rencontre', 'Participant absent', 'PARTICIPANT ABSENT', 'restent liées aux participants présents']) await expect(campaign).not.toContainText(banned);
  // CA31 : « Avec suivi » puis « Tous » : les deux restent listés ; après la clôture du suivi d'Otto, « Tous » le montre encore.
  await campaign.getByRole('button', { name: 'Tous' }).click();
  await expect(people).toHaveCount(2);

  // 4. Soin de Hilda par Otto, personnage suivi hors rencontre (CA15, CA20, CA21). Score 60, jet 20 : 4 DR + Bonus 5 = 9.
  await hilda.click();
  const detail = campaign.locator('.campaign-detail');
  await expect(detail).toContainText('PERSONNAGE SUIVI HORS RENCONTRE');
  await expect(detail.locator('.campaign-detail-actions-box > h4')).toHaveText('Soins et décisions disponibles');
  const treat = detail.locator('details').filter({ hasText: 'Guérison' }).first();
  await treat.locator(':scope > summary').click();
  const healer = treat.locator('select[name$="-healer"]');
  await expect(healer.locator('option')).toHaveText(['Choisir…', 'Hilda (hors rencontre)', 'Otto (hors rencontre)', 'Soigneur extérieur…']);
  await healer.selectOption({ label: 'Otto (hors rencontre)' });
  await treat.getByLabel('d100', { exact: true }).fill('20');
  await treat.getByLabel('Fournitures médicales disponibles').check();
  await treat.getByRole('button', { name: 'Enregistrer le Test de soin' }).click();
  const status = campaign.locator('.workspace-aftermath-status').first();
  await expect(status).toContainText('Enregistré');
  await expect(status).toContainText('9 Blessure(s) rendue(s)');
  await expect(people.filter({ hasText: 'Hilda' })).toContainText('15 / 20 PV');

  // 5. Maladie ouverte hors rencontre (CA32) puis soignée par un soigneur extérieur (CA22).
  const diseases = detail.locator('details.workspace-aftermath-diseases');
  await diseases.locator(':scope > summary').click();
  await diseases.getByLabel('Maladie', { exact: true }).fill('Fièvre des marais');
  await diseases.getByLabel(/Durée restante/).fill('3');
  await diseases.getByRole('button', { name: 'Enregistrer la maladie' }).click();
  await expect(status).toContainText('Enregistré');
  const card = campaign.locator('.campaign-detail .workspace-aftermath-disease').filter({ hasText: 'Fièvre des marais' });
  await expect(card).toBeVisible();
  await card.locator('select[name$="-healer"]').selectOption({ label: 'Soigneur extérieur…' });
  await card.getByLabel('Nom (extérieur)').fill('Barbier de Wurtbad');
  await card.getByLabel('Score de Guérison (extérieur)').fill('55');
  await card.getByLabel('Bonus d’Intelligence (extérieur)').fill('4');
  await card.getByLabel('d100', { exact: true }).fill('30');
  await card.getByRole('button', { name: 'Enregistrer les soins du jour' }).click();
  await expect(status).toContainText('soigneur : Barbier de Wurtbad (extérieur)');
  saved = await read();
  const disease = saved.extensions.v5.aftermathRegister.diseases[0];
  assert.deepEqual([disease.ownerLabel, disease.remainingDays, disease.careLog[0].healerName], ['Hilda', 2, 'Barbier de Wurtbad']);

  // 6. Rechargement : PV, suivis et personnages suivis sont là (CA18).
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready();
  await page.locator('#tab-campaign').click();
  await expect(campaign.locator('[data-campaign-person]').filter({ hasText: 'Hilda' })).toContainText('15 / 20 PV');
  saved = await read();
  assert.equal(saved.persistentCharacters.find(row => row.name === 'Hilda').hp, 15);

  // 7. Préparer : supprimer un personnage suivi qui a des suivis ouverts demande confirmation et les archive (CA39).
  await page.locator('#tab-prepare').click();
  await page.locator('#workspace-prepare').getByRole('button', { name: 'Nouvelle rencontre', exact: true }).click();
  const overlay = page.getByRole('dialog').filter({ has: page.locator('.prepare-persistent-characters') });
  const characters = overlay.locator('.prepare-persistent-characters');
  await characters.locator('summary').click();
  await characters.locator('.row').filter({ hasText: 'Hilda' }).getByRole('button', { name: 'Supprimer' }).click();
  const confirm = page.locator('dialog.encounter-end-dialog');
  await expect(confirm).toContainText('2 suivis ouverts');
  await confirm.getByRole('button', { name: 'Annuler' }).click();
  assert.equal((await read()).persistentCharacters.length, 2, 'annuler la confirmation ne supprime rien');
  if (!await characters.evaluate(element => element.open)) await characters.locator('summary').click();
  await characters.locator('.row').filter({ hasText: 'Hilda' }).getByRole('button', { name: 'Supprimer' }).click();
  await confirm.getByRole('button', { name: 'Supprimer et archiver' }).click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.listPersistentCharacters().length === 1; });
  saved = await read();
  assert.deepEqual(saved.extensions.v5.aftermathRegister.incidents.map(row => row.status), ['archived', 'open', 'archived']);
  assert.equal(saved.extensions.v5.aftermathRegister.diseases[0].status, 'archived');

  assert.deepEqual(errors, [], 'aucune erreur de page ni boîte native');
  console.log('soins-hors-rencontre-browser : fin de combat, ↶, soins hors rencontre, soigneur extérieur, rechargement, suppression confirmée : OK.');
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
