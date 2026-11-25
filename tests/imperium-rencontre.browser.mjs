// Parcours navigateur de la page Imperium Maledictum (lot I7b) : une rencontre jouée de bout en bout avec des dés
// saisis par le MJ dans chaque action — cases toujours affichées, chacune avec son bouton « Lancer » à côté (aucune
// bascule), refus sur case vide — mêlée avec Charge et inversion choisie, tir en rafale avec couvert et esquive,
// dépassement des blessures max (1d10 localisation/sévérité par sondage) et mort subite d'une Troupe, état Enflammé
// au passage de tour (1d5), premiers soins, test libre, Destin (dépense + brûlé), test opposé avec égalité relancée,
// filtre du journal, annuler/rétablir, rechargement, export/import, refus Warhammer/Cthulhu, page hors ligne.
// Profils du Core Book : Acolyte p. 334 (créé au formulaire), Ganger p. 340, Exécuteur p. 327.
// À lancer sous `timeout 120`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';
import { startStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

const ACOLYTE = {
  nom: 'Acolyte',
  carac: { CC: 30, CT: 30, F: 30, E: 40, Ag: 30, Int: 40, Per: 40, FM: 50, Soc: 40 }, // p. 334
  competences: 'Mêlée (Une main) 50\nTir (Pistolet) 50\nVigilance 50\nDiscipline 60\nEndurance 50\nMédecine 50', // p. 334
  armes: ['epee', 'pistolet-laser'], armure: '2', resolution: '2', source: 'Livre de base p. 334'
};

async function creerAcolyte(page) {
  await page.getByRole('button', { name: 'Nouveau profil' }).click();
  const form = page.locator('#form-profil');
  await expect(form).toBeVisible();
  await form.locator('[name=nom]').fill(ACOLYTE.nom);
  for (const [nom, valeur] of Object.entries(ACOLYTE.carac)) await form.locator(`[name="carac-${nom}"]`).fill(String(valeur));
  await form.locator('[name=competences]').fill(ACOLYTE.competences);
  await form.locator('[name=armure]').fill(ACOLYTE.armure);
  await form.locator('[name=resolution]').fill(ACOLYTE.resolution);
  await form.locator('[name=source]').fill(ACOLYTE.source);
  for (const id of ACOLYTE.armes) await form.locator(`[name=armes][value="${id}"]`).check();
  await expect(form.locator('#derives')).toContainText('Blessures max 16'); // F 30 + E 40 + FM 50 -> 3+8+5, p. 88
  await form.getByRole('button', { name: 'Créer le profil' }).click();
  await expect(page.locator('#panneau-preparer tr[data-profil="acolyte"]')).toBeVisible();
  await expect(page.locator('#panneau-preparer tr[data-profil="acolyte"]')).toContainText('Livre de base p. 334');
}

const journal = page => page.locator('#journal').innerText();
const attendrePret = page => expect(page.locator('body[data-pret="1"]')).toHaveCount(1);

/** Bouton « Lancer » d'une case de dé : le bouton placé juste après la case, sur la même ligne. */
const boutonLancer = champ => champ.locator('xpath=./following-sibling::button[1]');

/** Chaque case de dé visible sous `sel` a son bouton « Lancer » (texte « Lancer », aria-label « Lancer (<dé>) »). */
async function verifierBoutonsLancer(page, sel = '#panneau-jouer') {
  const cases = await page.evaluate(s => [...document.querySelectorAll(`${s} input[data-champ-des]`)].map(el => {
    const b = el.nextElementSibling;
    return { id: el.id || el.outerHTML.slice(0, 80), des: el.dataset.des,
      bouton: b && b.tagName === 'BUTTON' ? b.textContent.trim() : null,
      aria: b && b.tagName === 'BUTTON' ? b.getAttribute('aria-label') : null,
      titre: b && b.tagName === 'BUTTON' ? b.title : '' };
  }), sel);
  assert.ok(cases.length > 0, `aucune case de dé sous ${sel}`);
  for (const c of cases) {
    assert.equal(c.bouton, 'Lancer', `la case ${c.id} n’a pas de bouton « Lancer » à côté`);
    assert.equal(c.aria, `Lancer (${c.des})`, `aria-label du bouton de la case ${c.id}`);
    assert.ok(c.titre.length > 0, `title du bouton de la case ${c.id}`);
  }
  return cases;
}

/** Amorce le prochain Math.random de la page, juste avant le clic sur un bouton « Lancer » (valeur V : (V-0.5)/faces). */
const amorcerJet = (page, v) => page.evaluate(val => { window.__jet = val; Math.random = () => (window.__jet ?? 0.5); }, v);

async function parcours(browser, origin, port) {
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true });
  await blockExternalNetwork(context, port);
  const page = await context.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.goto(`${origin}/imperium/`);
  await attendrePret(page);

  // Préparer : réserve de départ citant les pages du Core Book ; Acolyte créé au formulaire (p. 334) ; une arme neuve.
  const reserve = page.locator('#panneau-preparer');
  await expect(reserve.locator('tr[data-profil="ganger"]')).toContainText('Livre de base p. 340');
  await expect(reserve.locator('tr[data-profil="executeur"]')).toContainText('Livre de base p. 327');
  await creerAcolyte(page);
  await page.getByRole('button', { name: 'Nouvelle arme' }).click();
  const formArme = page.locator('#form-arme');
  await expect(formArme).toBeVisible();
  await expect(formArme.locator('[name=portee]')).toHaveValue('immediate'); // une arme de mêlée neuve est Immédiate (p. 201-202)
  await formArme.locator('[name=nom]').fill('Dague');
  await formArme.locator('[name=degatsBase]').fill('1');
  await formArme.getByRole('button', { name: 'Créer l’arme' }).click();
  await expect(reserve).toContainText('Dague');

  // Composition : Acolyte + 1 Ganger (zone 1) + 1 Exécuteur (zone 2 « Abri »), Supériorité initiale 2.
  await reserve.locator('[data-compo="acolyte"]').check();
  await reserve.locator('input[data-compo="ganger"]').fill('1');
  await reserve.locator('input[data-compo="executeur"]').fill('1');
  await reserve.getByRole('button', { name: 'Ajouter une zone' }).click();
  const zone2 = reserve.locator('[data-zone-nom="zone-2"]');
  await zone2.fill('Abri');
  await zone2.press('Tab'); // « change » : le re-rendu fait apparaître le nouveau nom dans les sélecteurs de zone
  await expect(reserve.locator('[data-compo-zone="ganger"] option', { hasText: 'Abri' })).toHaveCount(1);
  await reserve.locator('[data-compo-zone="ganger"]').selectOption('zone-1');
  await reserve.locator('[data-compo-zone="executeur"]').selectOption('zone-2');
  await reserve.locator('#superiorite-initiale').fill('2');
  await reserve.getByRole('button', { name: 'Composer la rencontre' }).click();
  await expect(page.locator('#panneau-jouer')).toBeVisible();
  await expect(page.locator('#panneau-preparer')).toBeHidden();
  await expect(page.locator('#participants')).toContainText('Ganger');
  await expect(page.locator('#participants')).toContainText('Abri');
  // Enflammé est le 1er état de la liste et a des niveaux (p. 356) : le sélecteur de niveau est visible au 1er rendu.
  await expect(page.locator('#etat-niveau-executeur')).toBeVisible();

  // Round 1 : Ganger (Init 7, Ag 40) avant Acolyte (Init 7, Ag 30) ; Supériorité 2 > Résolution 1 -> Désespéré (p. 197).
  await page.getByRole('button', { name: 'Commencer le round 1' }).click();
  await expect(page.locator('#round')).toHaveText('Round 1');
  await expect(page.locator('#action h3')).toContainText('Au tour de Ganger');
  const ligneGanger = page.locator('#participants tr[data-participant="ganger"]');
  const ligneAcolyte = page.locator('#participants tr[data-participant="acolyte"]');
  const ligneExec = page.locator('#participants tr[data-participant="executeur"]');
  await expect(ligneGanger.locator('.badge.desespere')).toHaveCount(1);
  // Ni file de dés « saisis », ni bascule hasard/saisie : chaque case a son bouton « Lancer » à côté.
  await expect(page.locator('#jets-saisis')).toHaveCount(0);
  await expect(page.locator('.mode-des')).toHaveCount(0);
  await verifierBoutonsLancer(page);

  await page.locator('#fin-tour').click();
  await expect(page.locator('#action h3')).toContainText('Au tour de Acolyte');

  // Mêlée avec Charge : refus tant que les cases d100 sont vides, puis jets joués aux boutons « Lancer » (72 et 90).
  await page.locator('#melee-charge').check();
  const casesMelee = page.locator('#des-melee input[data-champ-des]');
  const j0 = await journal(page);
  await page.locator('#attaquer').click();
  await expect(page.locator('#message')).toContainText(/aucune valeur saisie/);
  await expect(casesMelee.nth(0)).toHaveAttribute('aria-invalid', 'true');
  assert.equal(await journal(page), j0, 'case vide : aucune ligne au journal, aucun changement d’état');
  await expect(page.locator('#action h3')).toContainText('Au tour de Acolyte');
  await amorcerJet(page, 0.715); // d100 -> 72
  await boutonLancer(casesMelee.nth(0)).click();
  await expect(casesMelee.nth(0)).toHaveValue('72');
  await amorcerJet(page, 0.895); // d100 -> 90
  await boutonLancer(casesMelee.nth(1)).click();
  await expect(casesMelee.nth(1)).toHaveValue('90');
  await page.locator('#attaquer').click();
  // Avantage (Charge) + échec : inversion facultative (p. 189) — le MJ choisit, tout le reste est désactivé.
  const inversion = page.locator('#action .inversion');
  await expect(inversion).toBeVisible();
  await expect(inversion).toContainText('Inverser en 27');
  // Le cadre dit que le jet peut être inversé (Avantage, p. 189), pas « jet double ».
  const texteInversion = await inversion.innerText();
  assert.ok(!texteInversion.includes('Jet double'), `libellé du cadre d’inversion : ${texteInversion}`);
  assert.match(texteInversion, /inversé/);
  // Chaque zone d’inversion (Garder / Inverser) a son propre id : les champs de dés ont des ids uniques.
  const idsZonesInv = await inversion.locator('[data-zone-des="inversion"]').evaluateAll(els => els.map(e => e.id));
  assert.ok(idsZonesInv.length >= 2 && idsZonesInv.every(Boolean), `zones d’inversion avec un id : ${idsZonesInv.join(', ')}`);
  assert.equal(new Set(idsZonesInv).size, idsZonesInv.length, `ids de zones d’inversion uniques : ${idsZonesInv.join(', ')}`);
  const idsChampsInv = await inversion.locator('input[data-champ-des]').evaluateAll(els => els.map(e => e.id));
  assert.equal(new Set(idsChampsInv).size, idsChampsInv.length, `ids de champs de dés uniques dans l’inversion : ${idsChampsInv.join(', ')}`);
  const autres = await page.locator('#panneau-jouer button:not(.inversion button)').all();
  assert.ok(autres.length >= 5, 'les autres boutons du jeu sont là…');
  for (const bouton of autres) await expect(bouton).toBeDisabled(); // … et désactivés tant que le MJ n’a pas choisi
  await inversion.locator('[data-inversion="reverse"]').click();
  await expect(page.locator('#action .inversion')).toHaveCount(0);
  await expect(casesMelee.nth(0)).toHaveValue(''); // cases consommées vidées après l’action réussie
  await expect(ligneGanger).toContainText('11/13'); // 2+BF3 + (DR +3 - -5) - armure 2 = 11 dégâts (p. 211-213)
  await expect(page.locator('.engagements')).toContainText('engagé avec'); // engagement automatique (p. 212)
  await expect(page.locator('#superiorite-entete')).toHaveText('Supériorité : 2');

  await page.locator('#fin-tour').click();
  await expect(page.locator('#action h3')).toContainText('Au tour de Exécuteur');
  await expect(ligneExec.locator('.badge.desespere')).toHaveCount(0); // Supériorité 2 = Résolution 2 : pas Désespéré
  await page.locator('#fin-tour').click();
  await expect(page.locator('#round')).toHaveText('Round 2');
  await expect(page.locator('#action h3')).toContainText('Au tour de Ganger');

  // Ganger : se mettre à couvert (moyen) et esquiver, puis fin de tour.
  await page.locator('#tactique-couvert').selectOption('moyen');
  await page.locator('[data-action="se-couvrir"]').click();
  await page.locator('[data-action="esquiver"]').click();
  await page.locator('#fin-tour').click();
  await expect(page.locator('#action h3')).toContainText('Au tour de Acolyte');

  // Tir en rafale (Burst) : 40 à l'attaque, 30 à l'esquive -> inversion défensive, on garde 30 (DR +1, touche DR final +1).
  await page.locator('#tir-mode').selectOption('rafale');
  const casesTir = page.locator('#des-tir input[data-champ-des]');
  await amorcerJet(page, 0.395); // d100 -> 40
  await boutonLancer(casesTir.nth(0)).click();
  await expect(casesTir.nth(0)).toHaveValue('40');
  await amorcerJet(page, 0.295); // d100 -> 30
  await boutonLancer(casesTir.nth(1)).click();
  await expect(casesTir.nth(1)).toHaveValue('30');
  await page.locator('#tirer').click();
  await expect(page.locator('#action .inversion')).toBeVisible();
  await expect(page.locator('#action .inversion')).toContainText('Inverser en 3');
  await page.locator('#action .inversion [data-inversion="keep"]').click();
  await expect(ligneGanger).toContainText('11/13'); // dégâts 5 + DR final +1 - (armure 2 + couvert 4) = 0 (p. 212, 204)
  await expect(ligneAcolyte).toContainText('Pistolet laser 3/4'); // une munition consommée (p. 123-125)
  assert.match(await journal(page), /DR final \+1/);
  assert.match(await journal(page), /subit 0 dégâts/);

  // État Enflammé (mineur) sur l'Exécuteur : le passage de tour exige un 1d5 (refus si vide, puis résolution).
  await page.locator('#etat-add-executeur').selectOption('enflamme');
  await expect(page.locator('#etat-niveau-executeur')).toBeVisible(); // Enflammé a des niveaux (p. 356)
  await page.locator('#etat-niveau-executeur').selectOption('mineur');
  await page.locator('[data-action="ajouter-etat"][data-id="executeur"]').click();
  await expect(ligneExec.locator('.badge.etat', { hasText: 'Enflammé' })).toHaveCount(1);
  // … et le sélecteur de niveau reste visible après un re-rendu complet (changement d’onglet).
  await page.locator('#onglet-preparer').click();
  await page.locator('#onglet-jouer').click();
  await expect(page.locator('#etat-niveau-executeur')).toBeVisible();
  const j1 = await journal(page);
  await page.locator('#fin-tour').click();
  const caseEnflamme = page.locator('#des-tour input[data-des="1d5"]');
  await expect(caseEnflamme).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#message')).toContainText(/1d5/);
  assert.equal(await journal(page), j1, 'case vide : aucun jet joué au passage de tour');
  await amorcerJet(page, 0.5); // 1d5 -> 3
  await boutonLancer(caseEnflamme).click();
  await expect(caseEnflamme).toHaveValue('3');
  await page.locator('#fin-tour').click();
  await expect(ligneExec).toContainText('3/16'); // 3 dégâts ignorant l'armure (p. 356)
  await ligneExec.locator('.badge.etat', { hasText: 'Enflammé' }).click(); // clic sur le badge : la condition est retirée (p. 357)
  await expect(ligneExec.locator('.badge.etat', { hasText: 'Enflammé' })).toHaveCount(0);
  await expect(page.locator('#action h3')).toContainText('Au tour de Exécuteur');
  await page.locator('#fin-tour').click();
  await expect(page.locator('#round')).toHaveText('Round 3');
  await expect(page.locator('#action h3')).toContainText('Au tour de Ganger'); // Init 7, Ag 40 : Ganger avant Acolyte
  await page.locator('#fin-tour').click();
  await expect(page.locator('#action h3')).toContainText('Au tour de Acolyte');

  // Mêlée finisseuse : 11 (double, DR +4, critique) contre 96 ; 1d10 localisation et sévérité apparaissent par sondage.
  await page.locator('#melee-charge').uncheck();
  await amorcerJet(page, 0.105); // d100 -> 11
  await boutonLancer(casesMelee.nth(0)).click();
  await expect(casesMelee.nth(0)).toHaveValue('11');
  await amorcerJet(page, 0.955); // d100 -> 96
  await boutonLancer(casesMelee.nth(1)).click();
  await expect(casesMelee.nth(1)).toHaveValue('96');
  const cases1d10 = page.locator('#des-melee input[data-des="1d10"]');
  await expect(cases1d10).toHaveCount(2); // localisation puis sévérité de la critique (p. 213, 358-361)
  // Re-rendu complet avec les d100 déjà saisis : valeurs conservées (routées par type, pas par la clé)
  // et les champs aval (1d10 de la critique) sont toujours proposés.
  await page.locator('#onglet-preparer').click();
  await page.locator('#onglet-jouer').click();
  await expect(casesMelee.nth(0)).toHaveValue('11');
  await expect(casesMelee.nth(1)).toHaveValue('96');
  await expect(cases1d10).toHaveCount(2);
  const j2 = await journal(page);
  await page.locator('#attaquer').click();
  await expect(page.locator('#message')).toContainText(/aucune valeur saisie/);
  await expect(cases1d10.nth(0)).toHaveAttribute('aria-invalid', 'true');
  assert.equal(await journal(page), j2, '1d10 vides : la critique n’est pas résolue');
  await amorcerJet(page, 0.25); // 1d10 -> 3 (bras droit)
  await boutonLancer(cases1d10.nth(0)).click();
  await expect(cases1d10.nth(0)).toHaveValue('3');
  await amorcerJet(page, 0.05); // 1d10 -> 1 : sévérité 11 avec l'excédent (pas de mort immédiate de table)
  await boutonLancer(cases1d10.nth(1)).click();
  await expect(cases1d10.nth(1)).toHaveValue('1');
  await page.locator('#attaquer').click();
  await expect(ligneGanger).toHaveClass(/etat-mort/); // Troupe : vaincue par sa 1re critique, mort subite (p. 216, 317, 359)
  await expect(ligneGanger).toContainText('13/13');
  await expect(ligneGanger.locator('.badge.critique')).toContainText('Bras droit'); // libellé français de la localisation
  await expect(ligneGanger).toContainText('1 à traiter'); // nombre de critiques non traitées
  await expect(page.locator('#superiorite-entete')).toHaveText('Supériorité : 3'); // +1 (p. 197)
  assert.match(await journal(page), /est vaincu par sa blessure critique/);
  assert.ok(!(await journal(page)).includes('meurt sur le coup'), 'pas de mort immédiate de table ici');

  // Premiers soins (Médecine) sur l'Exécuteur : refus sur case vide, puis 30 -> DR +2, 3 blessures récupérées (p. 219).
  await page.locator('#soins-cible').selectOption({ label: 'Exécuteur' });
  await page.locator('#soins-competence').selectOption('Médecine');
  const caseSoins = page.locator('#des-soins input[data-champ-des]');
  const j3 = await journal(page);
  await page.locator('#soigner').click();
  await expect(page.locator('#message')).toContainText(/aucune valeur saisie/);
  await expect(caseSoins).toHaveAttribute('aria-invalid', 'true');
  assert.equal(await journal(page), j3, 'case vide : aucun soin joué');
  await amorcerJet(page, 0.295); // d100 -> 30
  await boutonLancer(caseSoins).click();
  await expect(caseSoins).toHaveValue('30');
  await page.locator('#soigner').click();
  await expect(ligneExec).toContainText('0/16');
  assert.match(await journal(page), /récupère 3 blessure/);

  // Test libre (Vigilance) : refus sur case vide, puis 90 -> échec journalisé.
  // Changement de participant : la liste des compétences de « Test libre » suit (#libre-competence).
  await page.locator('#libre-qui').selectOption({ label: 'Exécuteur' });
  await expect(page.locator('#libre-competence')).toContainText('Athlétisme'); // compétence de l’Exécuteur (p. 327)
  await expect(page.locator('#libre-competence')).not.toContainText('Médecine'); // pas dans celles de l’Exécuteur
  await page.locator('#libre-qui').selectOption({ label: 'Acolyte' });
  await expect(page.locator('#libre-competence')).toContainText('Médecine'); // compétence de l’Acolyte (p. 334)
  await page.locator('#libre-competence').selectOption('Vigilance');
  const caseLibre = page.locator('#des-libre input[data-champ-des]');
  const j4 = await journal(page);
  await page.locator('#libre-lancer').click();
  await expect(page.locator('#message')).toContainText(/aucune valeur saisie/);
  await expect(caseLibre).toHaveAttribute('aria-invalid', 'true');
  assert.equal(await journal(page), j4, 'case vide : aucun test joué');
  await amorcerJet(page, 0.895); // d100 -> 90
  await boutonLancer(caseLibre).click();
  await expect(caseLibre).toHaveValue('90');
  await page.locator('#libre-lancer').click();
  assert.match(await journal(page), /Vigilance 90 : échec/);

  // Destin : « relancer » exige un d100 sondé (refus si vide), 20 -> le test de Vigilance est relancé (p. 220).
  await page.locator('#destin-effet-acolyte').selectOption('relancer');
  const caseDestin = page.locator('#des-destin-acolyte input[data-champ-des]');
  await expect(caseDestin).toBeVisible();
  const j5 = await journal(page);
  await page.locator('[data-action="depenser-destin"][data-id="acolyte"]').click();
  await expect(page.locator('#message')).toContainText(/aucune valeur saisie/);
  assert.equal(await journal(page), j5, 'case vide : aucun point de Destin dépensé');
  await amorcerJet(page, 0.195); // d100 -> 20
  await boutonLancer(caseDestin).click();
  await expect(caseDestin).toHaveValue('20');
  await page.locator('[data-action="depenser-destin"][data-id="acolyte"]').click();
  await expect(ligneAcolyte.locator('.badge.destin', { hasText: 'Destin 2/3' })).toHaveCount(1);
  assert.match(await journal(page), /relance son test de Vigilance : 20/);
  // Brûler « Renverser le cours » : +1 Supériorité, aucun jet saisi (p. 220).
  await expect(page.locator('#destin-jet-acolyte')).toBeHidden();
  await page.locator('#destin-brule-acolyte').selectOption('renverserCours');
  await page.locator('[data-action="bruler-destin"][data-id="acolyte"]').click();
  await expect(page.locator('#superiorite-entete')).toHaveText('Supériorité : 4');
  await expect(ligneAcolyte).toContainText('brûlé 1');

  // Test opposé Vigilance 50 vs 50, 30 et 30 : égalité parfaite (p. 190) -> relancer, dés saisis, Acolyte gagne.
  await page.locator('#oppose-a').selectOption({ label: 'Acolyte' });
  await page.locator('#oppose-a-comp').selectOption('Vigilance');
  await page.locator('#oppose-b').selectOption({ label: 'Exécuteur' });
  await page.locator('#oppose-b-comp').selectOption('Vigilance');
  const casesOppose = page.locator('#des-oppose input[data-champ-des]');
  await casesOppose.nth(0).fill('30');
  await casesOppose.nth(1).fill('30');
  await page.locator('#oppose-lancer').click();
  const egalite = page.locator('#action .egalite');
  await expect(egalite).toBeVisible();
  const autres2 = await page.locator('#panneau-jouer button:not(.egalite button)').all();
  for (const bouton of autres2) await expect(bouton).toBeDisabled();
  const casesEgalite = page.locator('#des-egalite input[data-champ-des]');
  const j6 = await journal(page);
  await egalite.locator('[data-egalite="relancer"]').click();
  await expect(page.locator('#message')).toContainText(/aucune valeur saisie/);
  await expect(casesEgalite.nth(0)).toHaveAttribute('aria-invalid', 'true');
  assert.equal(await journal(page), j6, 'relance refusée tant que les d100 sont vides');
  await amorcerJet(page, 0.295); // d100 -> 30
  await boutonLancer(casesEgalite.nth(0)).click();
  await expect(casesEgalite.nth(0)).toHaveValue('30');
  await amorcerJet(page, 0.695); // d100 -> 70
  await boutonLancer(casesEgalite.nth(1)).click();
  await expect(casesEgalite.nth(1)).toHaveValue('70');
  await egalite.locator('[data-egalite="relancer"]').click();
  await expect(page.locator('#action .egalite')).toHaveCount(0);
  assert.match(await journal(page), /Acolyte DR \+2 vs Exécuteur DR -2 -> Acolyte gagne/);
  // Annuler défait la relance (l’égalité revient), rétablir la refait.
  await page.locator('#annuler').click();
  await expect(page.locator('#action .egalite')).toBeVisible();
  await page.locator('#retablir').click();
  await expect(page.locator('#action .egalite')).toHaveCount(0);

  // Filtre du journal par round : « Avant le combat » = round 0, « tous » = aucun filtre.
  await page.locator('#filtre-round').selectOption('2');
  const rangs = await page.locator('#journal li .r').allTextContents();
  assert.ok(rangs.length > 0 && rangs.every(r => r === 'R2'), `filtre round 2 : ${rangs.join(',')}`);
  await page.locator('#filtre-round').selectOption('0');
  const rangs0 = await page.locator('#journal li .r').allTextContents();
  assert.ok(rangs0.length > 0 && rangs0.every(r => r === 'R0'), `filtre « Avant le combat » (round 0) : ${rangs0.join(',')}`);
  assert.match(await journal(page), /Rencontre composée/);
  await page.locator('#filtre-round').selectOption('tous');
  assert.match(await journal(page), /R1 /);
  assert.match(await journal(page), /R3 /);

  // Passage de tour : l'Exécuteur devient Désespéré (Supériorité 4 > Résolution 2) au début de son tour (p. 197).
  await page.locator('#fin-tour').click();
  await expect(page.locator('#action h3')).toContainText('Au tour de Exécuteur');
  await expect(ligneExec.locator('.badge.desespere')).toHaveCount(1);
  await page.locator('#fin-tour').click();
  await expect(page.locator('#round')).toHaveText('Round 4');
  await expect(page.locator('#action h3')).toContainText('Au tour de Acolyte');
  await verifierBoutonsLancer(page);

  // Rechargement : la rencontre et le journal reviennent ; seule la base d'Imperium existe.
  await page.waitForFunction(() => document.querySelector('#statut-sauvegarde').textContent.startsWith('Sauvegardé'));
  await page.reload();
  await attendrePret(page);
  await expect(page.locator('#panneau-jouer')).toBeVisible();
  await expect(page.locator('#round')).toHaveText('Round 4');
  assert.match(await journal(page), /Acolyte gagne/);
  const stockage = await page.evaluate(async () => ({
    bases: (await indexedDB.databases()).map(d => d.name).sort(),
    cles: Object.keys(localStorage)
  }));
  assert.deepEqual(stockage.bases, ['outil-mj-imperium-v1']);
  assert.ok(stockage.cles.every(cle => cle.startsWith('imperium.')), `clés : ${stockage.cles}`);

  // Thème partagé : bascule sans erreur, seule la clé « wfrp.theme » est ajoutée au clic.
  const boutonTheme = page.locator('#btn-theme-toggle');
  await expect(boutonTheme).toBeVisible();
  await expect(boutonTheme).toHaveText('Thème : Sombre');
  await boutonTheme.click();
  await expect(boutonTheme).toHaveText('Thème : Clair');
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(cle => !cle.startsWith('imperium.'))), ['wfrp.theme']);
  assert.equal(await page.evaluate(() => localStorage.getItem('wfrp.theme')), 'light');
  await boutonTheme.click();
  await expect(boutonTheme).toHaveText('Thème : Système');

  // Export, fin de rencontre (report du suivi dans Préparer), import (la rencontre revient), refus Warhammer/Cthulhu.
  await page.locator('summary', { hasText: 'Fichiers' }).click();
  const [telechargement] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Sauvegarder dans un fichier' }).click()]);
  const fichier = JSON.parse(readFileSync(await telechargement.path(), 'utf8'));
  assert.equal(fichier.jeu, 'imperium');
  assert.equal(fichier.contenu.rencontre.round, 4);
  await page.locator('summary', { hasText: 'Fichiers' }).click();
  await page.getByRole('button', { name: 'Terminer la rencontre' }).click();
  await expect(page.locator('#panneau-jouer')).toContainText('Aucune rencontre en cours');
  await page.locator('#onglet-preparer').click();
  await expect(reserve.locator('tr[data-profil="acolyte"]')).toContainText('Blessures 0/16');
  await expect(reserve.locator('tr[data-profil="acolyte"]')).toContainText(/Destin 2\//);
  await page.locator('#fichier-import').setInputFiles({ name: 'imperium.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fichier)) });
  await expect(page.locator('#message')).toContainText('Sauvegarde chargée');
  await page.locator('#onglet-jouer').click();
  await expect(page.locator('#round')).toHaveText('Round 4');
  await page.locator('#fichier-import').setInputFiles({ name: 'wfrp.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 4, reserve: [], combat: { participants: [] } })) });
  await expect(page.locator('#message')).toContainText(/sauvegarde de Warhammer, pas de Imperium Maledictum/);
  await expect(page.locator('#round')).toHaveText('Round 4');
  await page.locator('#fichier-import').setInputFiles({ name: 'cthulhu.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'outil-mj-sauvegarde', formatVersion: 1, jeu: 'cthulhu', nomJeu: 'L’Appel de Cthulhu', contenu: { reserve: { version: 1, profils: [], armes: {} }, rencontre: null } })) });
  await expect(page.locator('#message')).toContainText(/pas de Imperium Maledictum/);
  await expect(page.locator('#round')).toHaveText('Round 4');

  assert.deepEqual(erreurs, [], `erreurs console : ${erreurs.join(' | ')}`);
  await context.close();
}

async function horsLigne(browser, origin, port) {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  // localhost et 127.0.0.1 n'enregistrent pas le service worker : le test le fait à la place de la page.
  await context.addInitScript(() => { if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('../sw.js').catch(() => {})); });
  await blockExternalNetwork(context, port);
  const page = await context.newPage();
  await page.goto(`${origin}/imperium/`);
  await attendrePret(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Le cache de coquille est rempli à l'installation : attendre que l'adresse de la page y soit (saisie-des.js compris).
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match('/imperium/index.html'))
    && Boolean(await caches.match('/imperium/app.js')) && Boolean(await caches.match('/imperium/saisie-des.js')))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await attendrePret(page);
  await expect(page.locator('#panneau-preparer')).toContainText('Ganger');
  await creerAcolyte(page);
  await page.waitForFunction(() => document.querySelector('#statut-sauvegarde').textContent.startsWith('Sauvegardé'));
  await page.reload();
  await attendrePret(page);
  await expect(page.locator('#panneau-preparer tr[data-profil="acolyte"]')).toBeVisible();
  await context.close();
}

async function main() {
  const { server, origin, port } = await startStaticServer({ root });
  const browser = await launchBrowser();
  const resultats = [];
  try {
    for (const [nom, fn] of [['rencontre de bout en bout avec dés saisis aux boutons « Lancer », rechargement, export et import', parcours], ['page hors ligne', horsLigne]]) {
      try { await fn(browser, origin, port); resultats.push(`PASS — ${nom}`); } catch (erreur) { resultats.push(`FAIL — ${nom}: ${erreur.stack ?? erreur.message}`); }
    }
  } finally {
    await browser.close();
    server.close();
  }
  resultats.forEach(r => console.log(r));
  if (resultats.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
}

main().catch(erreur => { console.error(`✖ imperium-rencontre — ${erreur.message}`); process.exitCode = 1; });
