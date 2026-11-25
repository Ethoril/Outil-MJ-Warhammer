// Parcours navigateur de la page Cthulhu (lot C3, CA12, CA15, CA22, CA24, M7) : une rencontre jouée de bout en bout avec
// des dés saisis par le MJ dans chaque action (case « Jets saisis par le MJ » en haut d'Action, refus sur case vide, tir
// + blessure grave + jet de CON dynamique, mêlée avec dégâts, jet de CON mourant en ligne, jets de SAN et « Elle surgit »,
// test opposé et égalité relancée), mode hasard, annuler/rétablir, rechargement, fin de rencontre, export/import, page hors
// ligne. À lancer sous `timeout 120`.
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
  competences: 'Corps à corps 45\nArmes de poing 20\nEsquive 25\nBibliothèque 70\nÉpée 40', armeMelee: { label: 'Canne-épée' }, armeTir: '' };

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
  await page.getByRole('button', { name: 'Nouvelle arme' }).click();
  const formArme = page.locator('#form-arme');
  await expect(formArme).toBeVisible();
  await formArme.locator('[name=nom]').fill('Canne-épée');
  await formArme.locator('[name=competence]').fill('Épée');
  await formArme.locator('[name=des]').fill('1D6');
  await formArme.getByRole('button', { name: 'Créer l’arme' }).click();
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

  // M7 : l'ancien bloc « Dés » et ses files ont disparu ; la case « Jets saisis par le MJ » est en haut de la carte Action.
  await expect(page.locator('#file-d100')).toHaveCount(0);
  await expect(page.locator('#file-degats')).toHaveCount(0);
  await expect(page.locator('[data-champ-des]')).toHaveCount(0);
  const caseSaisie = page.locator('#panneau-jouer #jets-saisis');
  await expect(caseSaisie).toBeVisible();
  const position = await page.evaluate(() => {
    const h2 = document.querySelector('#t-action');
    const cb = document.querySelector('#jets-saisis');
    const action = document.querySelector('#action');
    return {
      sousLeTitre: Boolean(h2.compareDocumentPosition(cb) & Node.DOCUMENT_POSITION_FOLLOWING),
      avantAction: Boolean(cb.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING)
    };
  });
  assert.deepEqual(position, { sousLeTitre: true, avantAction: true }, '#jets-saisis est juste sous « Action », au-dessus du contenu');
  await caseSaisie.check();

  // Round 1 : Margaret (DEX 80) tire sur le disciple. Refus tant que la case d100 est vide (aucun tirage au hasard).
  await page.getByRole('button', { name: 'Commencer le round 1' }).click();
  await expect(page.locator('#round')).toHaveText('Round 1');
  await expect(page.locator('#action h3')).toContainText('Au tour de Margaret Hale');
  await expect(page.locator('#action fieldset legend').first()).toContainText('Mêlée (Grand couteau (poignard, machette), Corps à corps 45 %)');
  await page.locator('#tir-cible').selectOption({ label: 'Disciple de Jacob Smith' });
  await page.locator('#tir-distance').fill('10');
  const j0 = await journal(page);
  await page.locator('#tirer').click();
  await expect(page.locator('#message')).toContainText(/d100 tir/);
  await expect(page.locator('#tir-d100')).toHaveAttribute('aria-invalid', 'true');
  assert.equal(await journal(page), j0, 'case vide : aucune ligne au journal, aucun changement d’état');
  await expect(page.locator('#action h3')).toContainText('Au tour de Margaret Hale');
  await page.locator('#tir-d100').fill('0');
  await page.locator('#tirer').click();
  await expect(page.locator('#message')).toContainText(/hors limites/);
  await page.locator('#tir-d100').fill('25'); // 25 ≤ 60 : le tir touche (réussite majeure)
  await page.locator('#tirer').click();
  await expect(page.locator('#action')).toContainText('Résoudre');
  await expect(page.locator('#action .saisie-des label').first()).toContainText('Arme (1D10)');

  // Résolution : refus tant que les dégâts sont vides, puis saisie des dégâts ; 6 ≥ la moitié des 12 PV max → blessure
  // grave → la case d100 CON apparaît en place dès la saisie des dégâts.
  const j1 = await journal(page);
  await page.locator('#resoudre').click();
  await expect(page.locator('#message')).toContainText(/Arme \(1D10\)/);
  await expect(page.locator('#res-degats-arme')).toHaveAttribute('aria-invalid', 'true');
  assert.equal(await journal(page), j1, 'dégâts vides : la résolution est refusée');
  await page.locator('#res-degats-arme').fill('6');
  await expect(page.locator('#res-con-d100')).toBeVisible();
  await page.locator('#res-con-d100').fill('30'); // CON 60 : réussi, le disciple reste conscient
  await page.locator('#resoudre').click();
  const j2 = await journal(page);
  assert.match(j2, /Margaret Hale tire sur Disciple de Jacob Smith/);
  assert.match(j2, /BLESSURE GRAVE/);
  assert.match(j2, /Disciple de Jacob Smith — CON \(blessure grave\)/);
  // Les cases consommées sont vidées après l’action réussie.
  await expect(page.locator('#tir-d100')).toHaveValue('');

  // Annuler et rétablir : la résolution disparaît puis revient.
  await page.locator('#annuler').click();
  await expect(page.locator('#action')).toContainText('Résoudre');
  await page.locator('#retablir').click();
  assert.match(await journal(page), /BLESSURE GRAVE/);

  // Deuxième tir sur le disciple : 0 PV avec blessure grave → Mourant (pas de jet de CON : il sombre à 0 PV).
  const ligneDisciple = page.locator('#participants tr', { hasText: 'Disciple de Jacob Smith' });
  await page.locator('#tir-cible').selectOption({ label: 'Disciple de Jacob Smith' });
  await page.locator('#tir-distance').fill('10');
  await page.locator('#tir-d100').fill('25');
  await page.locator('#tirer').click();
  await page.locator('#res-degats-arme').fill('6');
  await expect(page.locator('#res-con-d100')).toHaveCount(0);
  await page.locator('#resoudre').click();
  await expect(ligneDisciple).toContainText('0/12');
  await expect(ligneDisciple).toContainText('mourant');
  assert.match(await journal(page), /MOURANT/);
  const boutonMourant = ligneDisciple.getByRole('button', { name: 'Jet CON mourant' });
  const boutonSoins = ligneDisciple.getByRole('button', { name: 'Premiers soins' });
  await expect(boutonMourant).toBeVisible();
  await expect(boutonSoins).toBeVisible();
  assert.match(await boutonMourant.getAttribute('title'), /CON.*mourant.*Gardien p\. 107-108/i);
  assert.match(await boutonSoins.getAttribute('title'), /stabilise.*1 PV.*\+1 PV/i);

  // Jet de CON mourant : case inline sur la ligne du mourant — refus si vide, puis 30 ≤ CON 60 : il survit.
  const champMourant = ligneDisciple.locator('[data-mourant-d100="disciple-jacob-smith"]');
  await expect(champMourant).toBeVisible();
  const j3 = await journal(page);
  await boutonMourant.click();
  await expect(page.locator('#message')).toContainText(/d100 CON mourant/);
  await expect(champMourant).toHaveAttribute('aria-invalid', 'true');
  assert.equal(await journal(page), j3, 'case vide : aucun jet joué');
  await champMourant.fill('30');
  await boutonMourant.click();
  assert.match(await journal(page), /s’accroche à la vie/);
  await expect(ligneDisciple).toContainText('mourant');
  await expect(champMourant).toHaveValue(''); // case vidée après l’action réussie
  await ligneDisciple.getByRole('button', { name: 'Premiers soins' }).click();
  assert.match(await journal(page), /stabilisé \(1 PV, inconscient\)/);
  await expect(ligneDisciple).toContainText('1/12');
  await expect(ligneDisciple).toContainText('inconscient');

  // Rechargement après les deux tirs : « Recharger » ajoute deux balles (6/8 → 8/8) ; l’aide cite durée et page (Gardien p. 100).
  const ligneHale = page.locator('#participants tr', { hasText: 'Margaret Hale' });
  await expect(ligneHale).toContainText('6/8');
  const boutonRecharger = ligneHale.getByRole('button', { name: 'Recharger' });
  await expect(boutonRecharger).toBeVisible();
  assert.match(await boutonRecharger.getAttribute('title'), /1 round.*deux balles.*Gardien p\. 100/i);
  await boutonRecharger.click();
  await expect(ligneHale).toContainText('8/8');
  assert.match(await journal(page), /recharge/);
  await page.locator('#fin-tour').click();
  await expect(page.locator('#action h3')).toContainText('Au tour de Pr Arthur Lindqvist');
  await expect(page.locator('#action fieldset legend').first()).toContainText('Mêlée (Canne-épée, Épée 40 %)');

  // Mêlée complète : d100 attaquant + d100 défense, puis dégâts saisis dans la fenêtre « Résoudre ».
  await page.locator('#melee-cible').selectOption({ label: 'Disciple de Jacob Smith' });
  const j4 = await journal(page);
  await page.locator('#attaquer').click();
  await expect(page.locator('#message')).toContainText(/d100 attaque/);
  await expect(page.locator('#melee-attaque-d100')).toHaveAttribute('aria-invalid', 'true');
  assert.equal(await journal(page), j4, 'case vide : l’attaque est refusée, rien n’est joué');
  // Le libellé de la case de défense suit le mode ; « aucune » la masque.
  await expect(page.locator('#melee-defense-zone label')).toContainText('d100 Esquive');
  await page.locator('#melee-mode').selectOption('rendre');
  await expect(page.locator('#melee-defense-zone label')).toContainText('d100 Rendre les coups');
  await page.locator('#melee-mode').selectOption('aucune');
  await expect(page.locator('#melee-defense-d100')).toHaveCount(0);
  await page.locator('#melee-mode').selectOption('esquiver');
  await expect(page.locator('#melee-defense-d100')).toBeVisible();
  await page.locator('#melee-attaque-d100').fill('20'); // Épée 40 : 20 ≤ 20 → réussite majeure
  await page.locator('#melee-defense-d100').fill('40'); // Esquive 30 : 40 > 30 → échec
  await page.locator('#attaquer').click();
  await expect(page.locator('#action')).toContainText('Résoudre');
  await expect(page.locator('#action .saisie-des label').first()).toContainText('Arme (1D6)');
  await page.locator('#res-degats-arme').fill('5'); // 1 PV → 0, blessure grave déjà connue → mourant, pas de jet de CON
  await expect(page.locator('#res-con-d100')).toHaveCount(0);
  await page.locator('#resoudre').click();
  await expect(ligneDisciple).toContainText('0/12');
  assert.match(await journal(page), /Pr Arthur Lindqvist touche Disciple de Jacob Smith/);
  await expect(page.locator('#melee-attaque-d100')).toHaveValue(''); // cases consommées vidées

  // Égalité parfaite au test opposé : le MJ choisit. Tant qu'il n'a pas tranché, la rencontre ne continue pas.
  await page.locator('#oppose-a').selectOption({ label: 'Margaret Hale' });
  await page.locator('#oppose-a-comp').selectOption('Corps à corps');
  await page.locator('#oppose-b').selectOption({ label: 'Pr Arthur Lindqvist' });
  await page.locator('#oppose-b-comp').selectOption('Corps à corps');
  await page.locator('#oppose-a-d100').fill('20'); // 20 ≤ 22 → majeure des deux côtés, valeur 45 = 45 : égalité
  await page.locator('#oppose-b-d100').fill('20');
  await page.locator('#oppose-lancer').click();
  const egalite = page.locator('#action .egalite');
  await expect(egalite).toBeVisible();
  await expect(egalite).toContainText('Égalité parfaite');
  await expect(egalite.getByRole('button', { name: 'Match nul' })).toBeEnabled();
  await expect(egalite.getByRole('button', { name: 'Relancer' })).toBeEnabled();
  const autres = await page.locator('#panneau-jouer button:not(.egalite button)').all();
  assert.ok(autres.length >= 5, 'les autres boutons du jeu sont là…');
  for (const bouton of autres) await expect(bouton).toBeDisabled(); // … et désactivés tant que le MJ n'a pas tranché
  await expect(page.locator('#oppose-a-d100')).toHaveValue(''); // cases du test opposé vidées après le lancer
  // Relancer : les cases d100 de l'égalité sont exigées (refus si vides), puis nouvelle égalité (10 et 10), puis match nul.
  await egalite.getByRole('button', { name: 'Relancer' }).click();
  await expect(page.locator('#message')).toContainText(/d100 relance/);
  await expect(page.locator('#egalite-a-d100')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#egalite-a-d100').fill('10');
  await page.locator('#egalite-b-d100').fill('10');
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

  // La goule surgit : une ligne par investigateur conscient qui ne l'a pas encore vue (d100 SAN, perte, d100 INT en place).
  await expect(page.locator('#reveler-des-zone')).toBeVisible();
  const sanHale = page.locator('[data-reveler-san="margaret-hale"]');
  const sanLind = page.locator('[data-reveler-san="pr-arthur-lindqvist"]');
  await expect(sanHale).toBeVisible();
  await expect(sanLind).toBeVisible();
  await sanHale.fill('80'); // SAN 65 : échec → perte 1D6 à saisir
  await expect(page.locator('[data-reveler-perte="margaret-hale"]')).toBeVisible();
  await page.locator('[data-reveler-perte="margaret-hale"]').fill('6'); // ≥ 5 → d100 INT
  await expect(page.locator('[data-reveler-int="margaret-hale"]')).toBeVisible();
  await page.locator('[data-reveler-int="margaret-hale"]').fill('20'); // INT 70 réussi → folie temporaire
  await sanLind.fill('30'); // SAN 50 : réussite → perte fixe 0, ni perte ni INT
  await expect(page.locator('[data-reveler-perte="pr-arthur-lindqvist"]')).toHaveCount(0);
  await page.locator('#reveler').click();
  const j5 = await journal(page);
  assert.match(j5, /Apparition : Goule/);
  assert.match(j5, /Margaret Hale perd 6 SAN \(65 → 59/);
  assert.match(j5, /FOLIE TEMPORAIRE/);
  assert.match(j5, /Pr Arthur Lindqvist perd 0 SAN/);
  await expect(page.locator('#participants tr', { hasText: 'Margaret Hale' })).toContainText('temporaire');

  // Jet de SAN libre : la perte se saisit dans la sous-zone (0 accepté) ; d100 INT dynamique si perte ≥ 5.
  await page.locator('#san-qui').selectOption({ label: 'Pr Arthur Lindqvist' });
  await page.locator('#san-d100').fill('95'); // 95 > 50 : échec → perte 1D6 (coût 1/1D6)
  await expect(page.locator('#san-perte')).toBeVisible();
  await page.locator('#san-perte').fill('0');
  await expect(page.locator('#san-int-d100')).toHaveCount(0); // 0 < 5
  await page.locator('#jet-san').click();
  assert.match((await journal(page)).slice(j5.length), /Pr Arthur Lindqvist perd 0 SAN/);
  await expect(page.locator('#san-d100')).toHaveValue(''); // case vidée après l’action
  await page.locator('#san-qui').selectOption({ label: 'Margaret Hale' });
  await page.locator('#san-d100').fill('95'); // 95 > 59 : échec → perte 1D6
  await page.locator('#san-perte').fill('6');
  await expect(page.locator('#san-int-d100')).toBeVisible(); // 6 ≥ 5 → d100 INT demandé en place
  await page.locator('#san-int-d100').fill('90'); // INT 70 : échec → il refoule l’horreur
  await page.locator('#jet-san').click();
  const j6 = await journal(page);
  assert.match(j6.slice(j5.length), /Margaret Hale perd 6 SAN \(59 → 53/);
  assert.match(j6.slice(j5.length), /refoule l’horreur/);

  // Mode hasard : décocher masque toutes les cases de dés et permet de jouer un test sans saisie.
  await page.locator('#jets-saisis').uncheck();
  await expect(page.locator('#jets-saisis')).toBeVisible();
  await expect(page.locator('[data-champ-des]')).toHaveCount(0);
  await page.locator('#libre-lancer').click();
  await expect(page.locator('#libre-resultat .test')).toBeVisible(); // test joué, dés tirés au hasard
  await page.locator('#jets-saisis').check();
  await expect(page.locator('#melee-attaque-d100')).toBeVisible();

  // Rechargement : la rencontre, le journal et l'historique reviennent ; seule la base de Cthulhu existe.
  await page.waitForFunction(() => document.querySelector('#statut-sauvegarde').textContent.startsWith('Sauvegardé'));
  await page.reload();
  await attendrePret(page);
  await expect(page.locator('#panneau-jouer')).toBeVisible();
  await expect(page.locator('#round')).toHaveText('Round 1');
  assert.match(await journal(page), /FOLIE TEMPORAIRE/);
  await expect(page.locator('#annuler')).toBeEnabled();
  await expect(page.locator('#jets-saisis')).toBeChecked(); // préférence « cthulhu.jets-saisis » conservée
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
  await expect(reserve.locator('tr[data-profil="margaret-hale"]')).toContainText('SAN 53');
  await expect(reserve.locator('tr[data-profil="margaret-hale"]')).toContainText('folie persistante');
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
  // Le cache de coquille est rempli à l'installation : attendre que l'adresse de la page y soit (saisie-des.js compris).
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match('/cthulhu/index.html'))
    && Boolean(await caches.match('/cthulhu/app.js')) && Boolean(await caches.match('/cthulhu/saisie-des.js')))).toBe(true);
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
    for (const [nom, fn] of [['rencontre de bout en bout avec dés saisis, rechargement, export et import', parcours], ['page hors ligne', horsLigne]]) {
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
