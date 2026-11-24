// Parcours navigateur de la page Cthulhu (lot C3, CA12, CA15, CA22, CA24) : une rencontre jouée de bout en bout avec des dés
// saisis (investigateurs créés au formulaire, tir, égalité parfaite tranchée par le MJ, jets de SAN), annuler et rétablir,
// rechargement, fin de rencontre, export et import, puis la page hors ligne. À lancer sous `timeout 120`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';
import { startStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

const HALE = { nom: 'Margaret Hale', carac: { FOR: 55, CON: 60, TAI: 55, DEX: 80, APP: 60, INT: 70, POU: 65, EDU: 65 }, chance: 70,
  competences: 'Corps à corps 45\nArmes de poing 60\nEsquive 50', armeMelee: 'couteau-grand', armeTir: 'revolver-38' };
const LINDQVIST = { nom: 'Pr Arthur Lindqvist', carac: { FOR: 30, CON: 40, TAI: 60, DEX: 40, APP: 70, INT: 75, POU: 50, EDU: 80 }, chance: 60,
  competences: 'Corps à corps 45\nArmes de poing 20\nEsquive 25\nBibliothèque 70', armeMelee: 'gourdin-grand', armeTir: '' };

async function creerInvestigateur(page, p) {
  await page.getByRole('button', { name: 'Nouveau profil' }).click();
  const form = page.locator('#form-profil');
  await expect(form).toBeVisible();
  await form.locator('[name=nom]').fill(p.nom);
  for (const [nom, valeur] of Object.entries(p.carac)) await form.locator(`[name="carac-${nom}"]`).fill(String(valeur));
  await form.locator('[name=chance]').fill(String(p.chance));
  await form.locator('[name=competences]').fill(p.competences);
  await form.locator('[name=armeMelee]').selectOption(p.armeMelee);
  await form.locator('[name=armeTir]').selectOption(p.armeTir);
  await expect(form.locator('#derives')).toContainText('PV max');
  await form.getByRole('button', { name: 'Créer le profil' }).click();
  await expect(page.locator('#panneau-preparer tr[data-profil]', { hasText: p.nom })).toBeVisible();
}

const des = (page, d100, degats = '') => page.evaluate(([a, b]) => {
  document.querySelector('#file-d100').value = a;
  document.querySelector('#file-degats').value = b;
}, [d100, degats]);
const journal = page => page.locator('#journal').innerText();
const attendrePret = page => expect(page.locator('body[data-pret="1"]')).toHaveCount(1);

async function parcours(browser, origin, port) {
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true });
  await blockExternalNetwork(context, port);
  const page = await context.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.goto(`${origin}/cthulhu/`);
  await attendrePret(page);

  // Préparer : réserve de départ tirée des livres, sans le fantôme ; investigateurs créés au formulaire.
  const reserve = page.locator('#panneau-preparer');
  await expect(reserve.locator('tr[data-profil="goule"]')).toContainText('Manuel du Gardien p. 293');
  await expect(reserve.locator('tr[data-profil="disciple-jacob-smith"]')).toContainText('Aventures effroyables p. 129');
  await expect(reserve).not.toContainText('Fantôme');
  await creerInvestigateur(page, HALE);
  await creerInvestigateur(page, LINDQVIST);
  await expect(reserve.locator('tr[data-profil="margaret-hale"]')).toContainText('PV 11');

  // Composer : les deux investigateurs, le disciple, la goule cachée.
  await reserve.locator('[data-compo="margaret-hale"]').check();
  await reserve.locator('[data-compo="pr-arthur-lindqvist"]').check();
  await reserve.locator('input[data-compo="disciple-jacob-smith"]').fill('1');
  await reserve.locator('input[data-compo="goule"]').fill('1');
  await reserve.locator('[data-cachee="goule"]').check();
  await reserve.getByRole('button', { name: 'Composer la rencontre' }).click();
  await expect(page.locator('#panneau-jouer')).toBeVisible();
  await expect(page.locator('#panneau-preparer')).toBeHidden();
  await expect(page.locator('#participants')).toContainText('Goule');
  await expect(page.locator('#participants')).toContainText('(cachée)');
  await page.locator('#jets-saisis').check();

  // Round 1 : Margaret (DEX 80) tire sur le disciple, d100 25 (réussi), dégâts 6 (blessure grave : jet de CON 30).
  await page.getByRole('button', { name: 'Commencer le round 1' }).click();
  await expect(page.locator('#round')).toHaveText('Round 1');
  await expect(page.locator('#action h3')).toContainText('Au tour de Margaret Hale');
  await page.locator('#tir-cible').selectOption({ label: 'Disciple de Jacob Smith' });
  await page.locator('#tir-distance').fill('10');
  await des(page, '25 30', '6');
  await page.locator('#tirer').click();
  await expect(page.locator('#action')).toContainText('Résoudre');
  await page.locator('#resoudre').click();
  const j1 = await journal(page);
  assert.match(j1, /Margaret Hale tire sur Disciple de Jacob Smith/);
  assert.match(j1, /BLESSURE GRAVE/);
  assert.match(j1, /Disciple de Jacob Smith — CON \(blessure grave\)/);

  // Annuler et rétablir : la résolution disparaît puis revient.
  await page.locator('#annuler').click();
  await expect(page.locator('#action')).toContainText('Résoudre');
  await page.locator('#retablir').click();
  assert.match(await journal(page), /BLESSURE GRAVE/);

  // Deuxième tir sur le disciple : 0 PV avec blessure grave → Mourant (boutons « Jet CON mourant » et « Premiers soins »).
  const ligneDisciple = page.locator('#participants tr', { hasText: 'Disciple de Jacob Smith' });
  await page.locator('#tir-cible').selectOption({ label: 'Disciple de Jacob Smith' });
  await page.locator('#tir-distance').fill('10');
  await des(page, '25', '6');
  await page.locator('#tirer').click();
  await page.locator('#resoudre').click();
  await expect(ligneDisciple).toContainText('0/12');
  await expect(ligneDisciple).toContainText('mourant');
  assert.match(await journal(page), /MOURANT/);
  await expect(ligneDisciple.getByRole('button', { name: 'Jet CON mourant' })).toBeVisible();
  await expect(ligneDisciple.getByRole('button', { name: 'Premiers soins' })).toBeVisible();

  // Jet de CON mourant réussi (30 ≤ CON 60) : il survit, toujours mourant ; Premiers soins : stabilisé à 1 PV, inconscient.
  await des(page, '30', '');
  await ligneDisciple.getByRole('button', { name: 'Jet CON mourant' }).click();
  assert.match(await journal(page), /s’accroche à la vie/);
  await expect(ligneDisciple).toContainText('mourant');
  await ligneDisciple.getByRole('button', { name: 'Premiers soins' }).click();
  assert.match(await journal(page), /stabilisé \(1 PV, inconscient\)/);
  await expect(ligneDisciple).toContainText('1/12');
  await expect(ligneDisciple).toContainText('inconscient');

  // Rechargement après les deux tirs : « Recharger » rend la capacité maximale (8/8) ; l’aide cite le Gardien p. 100.
  const ligneHale = page.locator('#participants tr', { hasText: 'Margaret Hale' });
  await expect(ligneHale).toContainText('6/8');
  const boutonRecharger = ligneHale.getByRole('button', { name: 'Recharger' });
  await expect(boutonRecharger).toBeVisible();
  assert.match(await boutonRecharger.getAttribute('title'), /Gardien p\. 100/);
  await boutonRecharger.click();
  await expect(ligneHale).toContainText('8/8');
  assert.match(await journal(page), /recharge/);
  await page.locator('#fin-tour').click();

  // Égalité parfaite au test opposé : le MJ choisit. Tant qu'il n'a pas tranché, la rencontre ne continue pas.
  await page.locator('#oppose-a').selectOption({ label: 'Margaret Hale' });
  await page.locator('#oppose-a-comp').selectOption('Corps à corps');
  await page.locator('#oppose-b').selectOption({ label: 'Pr Arthur Lindqvist' });
  await page.locator('#oppose-b-comp').selectOption('Corps à corps');
  await des(page, '20 20');
  await page.locator('#oppose-lancer').click();
  const egalite = page.locator('#action .egalite');
  await expect(egalite).toBeVisible();
  await expect(egalite).toContainText('Égalité parfaite');
  await expect(egalite.getByRole('button', { name: 'Match nul' })).toBeEnabled();
  await expect(egalite.getByRole('button', { name: 'Relancer' })).toBeEnabled();
  const autres = await page.locator('#panneau-jouer button:not(.egalite button)').all();
  assert.ok(autres.length >= 5, 'les autres boutons du jeu sont là…');
  for (const bouton of autres) await expect(bouton).toBeDisabled(); // … et désactivés tant que le MJ n'a pas tranché
  // Relancer : nouvelle égalité (10 et 10 : même niveau, même valeur), puis match nul.
  await des(page, '10 10');
  await egalite.getByRole('button', { name: 'Relancer' }).click();
  await expect(page.locator('#action .egalite')).toBeVisible();
  assert.match(await journal(page), /Relance — Test opposé/);
  await page.locator('#action .egalite').getByRole('button', { name: 'Match nul' }).click();
  await expect(page.locator('#action .egalite')).toHaveCount(0);
  assert.match(await journal(page), /match nul \(décision du Gardien\)/);
  await expect(page.locator('#fin-tour')).toBeEnabled();
  // Annuler défait le choix du MJ (l'égalité revient), rétablir le refait.
  await page.locator('#annuler').click();
  await expect(page.locator('#action .egalite')).toBeVisible();
  await page.locator('#retablir').click();
  await expect(page.locator('#action .egalite')).toHaveCount(0);

  // Conservation des compétences choisies après un re-rendu (les sélecteurs de personnage sont restaurés d’abord).
  await page.locator('#oppose-a').selectOption({ label: 'Disciple de Jacob Smith' });
  await page.locator('#oppose-a-comp').selectOption('Occultisme');
  await page.locator('#oppose-b').selectOption({ label: 'Goule' });
  await page.locator('#oppose-b-comp').selectOption('Grimper');
  await ligneHale.getByRole('button', { name: 'Rengainer' }).click(); // re-rendu sans lancer de dés
  assert.equal(await page.locator('#oppose-a').inputValue(), 'disciple-jacob-smith');
  assert.equal(await page.locator('#oppose-a-comp').inputValue(), 'Occultisme');
  assert.equal(await page.locator('#oppose-b').inputValue(), 'goule');
  assert.equal(await page.locator('#oppose-b-comp').inputValue(), 'Grimper');

  // La goule surgit : jets de SAN des investigateurs conscients (Margaret : SAN 80 raté, perte 6, INT 20 réussi → folie).
  await des(page, '80 20 30', '6');
  await page.locator('#reveler').click();
  const j2 = await journal(page);
  assert.match(j2, /Apparition : Goule/);
  assert.match(j2, /Margaret Hale perd 6 SAN \(65 → 59/);
  assert.match(j2, /FOLIE TEMPORAIRE/);
  assert.match(j2, /Pr Arthur Lindqvist perd 0 SAN/);
  await expect(page.locator('#participants tr', { hasText: 'Margaret Hale' })).toContainText('temporaire');

  // La file de dégâts / SAN accepte 0 : jet de SAN raté (95), perte 1D6 saisie à 0.
  await des(page, '95', '0');
  await page.locator('#san-qui').selectOption({ label: 'Pr Arthur Lindqvist' });
  await page.locator('#jet-san').click();
  assert.match(await journal(page), /Pr Arthur Lindqvist perd 0 SAN/);

  // Rechargement : la rencontre, le journal et l'historique reviennent ; seule la base de Cthulhu existe.
  await page.waitForFunction(() => document.querySelector('#statut-sauvegarde').textContent.startsWith('Sauvegardé'));
  await page.reload();
  await attendrePret(page);
  await expect(page.locator('#panneau-jouer')).toBeVisible();
  await expect(page.locator('#round')).toHaveText('Round 1');
  assert.match(await journal(page), /FOLIE TEMPORAIRE/);
  await expect(page.locator('#annuler')).toBeEnabled();
  const stockage = await page.evaluate(async () => ({
    bases: (await indexedDB.databases()).map(d => d.name).sort(),
    cles: Object.keys(localStorage)
  }));
  assert.deepEqual(stockage.bases, ['outil-mj-cthulhu-v1']);
  assert.ok(stockage.cles.every(cle => cle.startsWith('cthulhu.')), `clés : ${stockage.cles}`);

  // Thème partagé : le bouton est présent, bascule sans erreur, et n’ajoute que la clé « wfrp.theme » au clic.
  const boutonTheme = page.locator('#btn-theme-toggle');
  await expect(boutonTheme).toBeVisible();
  await expect(boutonTheme).toHaveText('Thème : Sombre');
  await boutonTheme.click();
  await expect(boutonTheme).toHaveText('Thème : Clair');
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(cle => !cle.startsWith('cthulhu.'))), ['wfrp.theme']);
  assert.equal(await page.evaluate(() => localStorage.getItem('wfrp.theme')), 'light');
  await boutonTheme.click();
  await expect(boutonTheme).toHaveText('Thème : Système');

  // Export, fin de rencontre (le report se voit dans la réserve), import (la rencontre revient), refus d'un fichier de Warhammer.
  await page.locator('summary', { hasText: 'Fichiers' }).click();
  const [telechargement] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Sauvegarder dans un fichier' }).click()]);
  const fichier = JSON.parse(readFileSync(await telechargement.path(), 'utf8'));
  assert.equal(fichier.jeu, 'cthulhu');
  assert.equal(fichier.contenu.rencontre.round, 1);
  await page.locator('summary', { hasText: 'Fichiers' }).click();
  await page.getByRole('button', { name: 'Terminer la rencontre' }).click();
  await expect(page.locator('#panneau-jouer')).toContainText('Aucune rencontre en cours');
  await page.locator('#onglet-preparer').click();
  await expect(reserve.locator('tr[data-profil="margaret-hale"]')).toContainText('SAN 59');
  await expect(reserve.locator('tr[data-profil="margaret-hale"]')).toContainText('folie temporaire');
  await page.locator('summary', { hasText: 'Fichiers' }).click();
  await page.locator('#fichier-import').setInputFiles({ name: 'cthulhu.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fichier)) });
  await expect(page.locator('#message')).toContainText('Sauvegarde chargée');
  await page.locator('#onglet-jouer').click();
  await expect(page.locator('#round')).toHaveText('Round 1');
  await page.locator('#fichier-import').setInputFiles({ name: 'wfrp.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 4, reserve: [], combat: { participants: [] } })) });
  await expect(page.locator('#message')).toContainText('sauvegarde de Warhammer, pas de L’Appel de Cthulhu');
  await expect(page.locator('#round')).toHaveText('Round 1');

  assert.deepEqual(erreurs, [], `erreurs console : ${erreurs.join(' | ')}`);
  await context.close();
}

async function horsLigne(browser, origin, port) {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  // localhost et 127.0.0.1 n'enregistrent pas le service worker : le test le fait à la place de la page.
  await context.addInitScript(() => { if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('../sw.js').catch(() => {})); });
  await blockExternalNetwork(context, port);
  const page = await context.newPage();
  await page.goto(`${origin}/cthulhu/`);
  await attendrePret(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Le cache de coquille est rempli à l'installation : attendre que l'adresse de la page y soit.
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match('/cthulhu/index.html')) && Boolean(await caches.match('/cthulhu/app.js')))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await attendrePret(page);
  await expect(page.locator('#panneau-preparer')).toContainText('Goule');
  await creerInvestigateur(page, HALE);
  await page.waitForFunction(() => document.querySelector('#statut-sauvegarde').textContent.startsWith('Sauvegardé'));
  await page.reload();
  await attendrePret(page);
  await expect(page.locator('#panneau-preparer tr[data-profil="margaret-hale"]')).toBeVisible();
  await context.close();
}

async function main() {
  const { server, origin, port } = await startStaticServer({ root });
  const browser = await launchBrowser();
  const resultats = [];
  try {
    for (const [nom, fn] of [['rencontre de bout en bout, rechargement, export et import', parcours], ['page hors ligne', horsLigne]]) {
      try { await fn(browser, origin, port); resultats.push(`PASS — ${nom}`); } catch (erreur) { resultats.push(`FAIL — ${nom}: ${erreur.stack ?? erreur.message}`); }
    }
  } finally {
    await browser.close();
    server.close();
  }
  resultats.forEach(r => console.log(r));
  if (resultats.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
}

main().catch(erreur => { console.error(`✖ cthulhu-rencontre — ${erreur.message}`); process.exitCode = 1; });
