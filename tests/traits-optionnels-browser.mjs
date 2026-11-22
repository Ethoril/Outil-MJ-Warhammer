// Traits optionnels d'un profil de Réserve, de bout en bout dans l'interface réelle (chantier traits-optionnels, lot L7) :
// copie du bestiaire en Réserve, panneau à l'édition, coches Tough / Hardy (imprimé → modifié), « Ajouter un Trait » avec et sans
// paramètre, ↶, case grisée « déjà compté », attaque et armure optionnelles, Taille cochée (Blessures recalculées par différence),
// entrée en rencontre, rechargement, export puis import du JSON du profil, monture d'un PJ prise dans la Réserve (Dressé (Monture) coché).
// Aucun réseau : la synchronisation est neutralisée. À lancer sous `timeout 120 node tests/traits-optionnels-browser.mjs`.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';
import { startStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const SYNC_STUB = 'export function initFirebaseSync(onConnected) { document.querySelector(\'#login-screen\')?.style.setProperty(\'display\', \'none\'); document.querySelector(\'#app-content\')?.style.setProperty(\'display\', \'block\'); onConnected({ dbRef: \'isolated-test\', onValue() {}, update() { return Promise.resolve(); } }); }';

const { server, port } = await startStaticServer({ root });
const origin = `http://127.0.0.1:${port}`;
const browser = await launchBrowser();
let failed = false;
try {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  // Les images de pions (dépôt rpg-map-display, absent du dépôt local) répondent 404 : tolérées, et seulement elles.
  const missing = [];
  page.on('response', response => { if (response.status() === 404) missing.push(response.url()); });
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource.*404/.test(message.text())) errors.push('console: ' + message.text()); });
  const external = [];
  page.on('request', request => { if (!request.url().startsWith(origin)) external.push(request.url()); });
  await blockExternalNetwork(page, port);
  await page.route('**/js/core/sync.js', route => route.fulfill({ contentType: 'text/javascript', body: SYNC_STUB }));

  const boot = async () => { await page.goto(`${origin}/index.html`); await expect(page.locator('#app-content')).toBeVisible(); await page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.ready; }); };
  const profilesByBestiary = () => page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    return Store.listProfiles().map(p => ({ id: p.id, name: p.name, kind: p.kind, hp: p.hp, bestiaryId: p.extensions?.v5?.bestiary?.id ?? null, choices: p.extensions?.v5?.optionalChoices ?? null }));
  });
  const profileOf = async bestiaryId => { const found = (await profilesByBestiary()).filter(p => p.bestiaryId === bestiaryId); assert.equal(found.length >= 1, true, `profil ${bestiaryId} en Réserve`); return found.at(-1); };

  // Copie d'une fiche du bestiaire en Réserve par la bibliothèque (bouton « Copier dans la réserve »).
  const copyFromLibrary = async (search, rowText, bestiaryId) => {
    const before = (await profilesByBestiary()).filter(p => p.bestiaryId === bestiaryId).length;
    await page.locator('#tab-library').click();
    const library = page.locator('#bestiary-library');
    await expect(library).toBeVisible();
    if (!(await library.evaluate(node => node.open))) await library.locator('summary').click();
    await page.getByLabel('Nom du profil').fill(search);
    const row = library.locator('.item').filter({ has: page.locator('strong', { hasText: rowText }) }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Copier dans la réserve' }).click();
    await expect.poll(async () => (await profilesByBestiary()).filter(p => p.bestiaryId === bestiaryId).length).toBe(before + 1);
    return profileOf(bestiaryId);
  };
  const openEditor = async profileId => {
    await page.locator('#tab-library').click();
    await page.locator(`.workspace-space-library .workspace-profile-card[data-profile-id="${profileId}"]`).getByRole('button', { name: 'Modifier' }).click();
    const dialog = page.locator('dialog[open]').last();
    await expect(dialog.locator('#form-add')).toBeVisible();
    return dialog;
  };
  const closeEditor = async () => { await page.keyboard.press('Escape'); await expect(page.locator('dialog[open] #form-add')).toHaveCount(0); };
  const panel = dialog => dialog.locator('#form-optional-traits');
  const box = (dialog, key) => panel(dialog).locator(`[data-optional-key="${key}"]`);
  const caseLabel = (dialog, key) => panel(dialog).locator(`label.optional-traits-case:has([data-optional-key="${key}"])`);
  const change = (dialog, field) => panel(dialog).locator(`[data-optional-change="${field}"]`);
  const undo = async () => { await expect(page.locator('#btn-undo')).toBeEnabled(); await page.locator('#btn-undo').click(); };
  const caseKeys = dialog => panel(dialog).locator('[data-optional-key]').evaluateAll(nodes => nodes.map(node => node.dataset.optionalKey));
  const numbers = text => (text.match(/-?\d+/g) || []).map(Number);

  await boot();

  // 1. Heavy Warhorse en Réserve ; le panneau s'ouvre à l'édition, sept cases facultatives (dont Cavalerie de choc, ajoutée en 3.54.0), aucune modification.
  const warhorse = await copyFromLibrary('Heavy Warhorse', /^Cheval de guerre lourd/, 'E0-P-766');
  assert.equal(warhorse.name, 'Cheval de guerre lourd');
  let editor = await openEditor(warhorse.id);
  await expect(panel(editor)).toBeVisible();
  await expect(panel(editor)).toContainText('Ajouter un Trait');
  assert.deepEqual((await caseKeys(editor)).sort(), ['Champion', 'Clever', 'Elite', 'Hardy', 'Rear', 'Tough', 'Trained:Shock Cavalry']);
  await expect(panel(editor).locator('[data-optional-change]')).toHaveCount(0);
  console.log('PASS 1 — copie en Réserve, panneau ouvert à l’édition : 7 cases facultatives, aucun changement');

  // 2. Tough : « imprimé → modifié » sur E (et FM), la valeur imprimée reste visible.
  await box(editor, 'Tough').click();
  await expect(box(editor, 'Tough')).toBeChecked();
  await expect(change(editor, 'E')).toBeVisible();
  const eLine = await change(editor, 'E').innerText();
  assert.deepEqual(numbers(eLine).slice(0, 2), [50, 60], `E imprimée 50 → 60 : ${eLine}`);
  await expect(change(editor, 'FM')).toContainText('10 → 20');
  console.log('PASS 2 — Tough : ' + eLine);

  // 3. Hardy : les Blessures changent à leur tour, avec la valeur imprimée (32).
  await box(editor, 'Hardy').click();
  await expect(box(editor, 'Hardy')).toBeChecked();
  const woundsLine = panel(editor).locator('[data-optional-change]').filter({ hasText: /^Blessures/ });
  await expect(woundsLine).toHaveCount(1);
  const wounds = numbers(await woundsLine.innerText());
  assert.equal(wounds[0], 32, 'Blessures imprimées visibles');
  assert.ok(wounds[1] > 32, `Blessures modifiées > imprimées (${wounds})`);
  const choicesAfter = (await profileOf('E0-P-766')).choices;
  assert.deepEqual(choicesAfter.traits.map(item => item.name).sort(), ['Hardy', 'Tough']);
  console.log(`PASS 3 — Hardy : Blessures ${wounds[0]} → ${wounds[1]}`);

  // 4. « Ajouter un Trait » : Peur refusée sans indice, acceptée avec (2).
  await panel(editor).locator('[data-optional-add]').click();
  const dialogTrait = panel(editor).locator('[data-optional-dialog]');
  await expect(dialogTrait).toBeVisible();
  await dialogTrait.locator('[data-optional-search]').fill('Fear');
  await dialogTrait.locator('[data-optional-pick="Fear"]').click();
  await dialogTrait.locator('[data-optional-confirm]').click();
  await expect(panel(editor).locator('[data-optional-message]')).not.toBeEmpty();
  console.log('   message de refus : ' + await panel(editor).locator('[data-optional-message]').innerText());
  assert.equal((await caseKeys(editor)).some(key => key.startsWith('Fear')), false, 'Peur non ajoutée sans indice');
  assert.equal((await profileOf('E0-P-766')).choices.traits.some(item => item.name === 'Fear'), false, 'rien d’enregistré');
  await dialogTrait.locator('[data-optional-param]').fill('2');
  await dialogTrait.locator('[data-optional-confirm]').click();
  await expect(dialogTrait).toBeHidden();
  const fearKey = (await caseKeys(editor)).find(key => key.startsWith('Fear'));
  assert.ok(fearKey, 'case Peur présente');
  await expect(box(editor, fearKey)).toBeChecked();
  await expect(caseLabel(editor, fearKey)).toContainText('2');
  console.log(`PASS 4 — Peur : refusée sans indice, ajoutée avec 2 (${fearKey})`);

  // 5. ↶ rend l'état : Peur disparaît, Tough et Hardy restent.
  await undo();
  await expect(box(editor, fearKey)).toHaveCount(0);
  await expect(box(editor, 'Tough')).toBeChecked();
  await expect(box(editor, 'Hardy')).toBeChecked();
  // Décocher Tough puis ↶ : la coche revient.
  await box(editor, 'Tough').click();
  await expect(box(editor, 'Tough')).not.toBeChecked();
  await expect(change(editor, 'E')).toHaveCount(0);
  await undo();
  await expect(box(editor, 'Tough')).toBeChecked();
  await expect(change(editor, 'E')).toBeVisible();
  // Peur de nouveau (elle servira à l'entrée en rencontre et à l'export).
  await panel(editor).locator('[data-optional-add]').click();
  await dialogTrait.locator('[data-optional-search]').fill('Fear');
  await dialogTrait.locator('[data-optional-pick="Fear"]').click();
  await dialogTrait.locator('[data-optional-param]').fill('2');
  await dialogTrait.locator('[data-optional-confirm]').click();
  await expect(dialogTrait).toBeHidden();
  await expect(box(editor, fearKey)).toBeChecked();
  console.log('PASS 5 — ↶ annule l’ajout de Peur puis la décoche de Tough ; Peur (2) remise');
  await closeEditor();

  // 6. Entrée en rencontre : le participant porte les Traits cochés (E modifiée, Peur).
  await page.locator('#tab-combat').click();
  const sideTab = page.getByRole('tab', { name: 'Profils', exact: true });
  if (await sideTab.count()) await sideTab.click();
  await page.getByLabel('Rechercher un profil à ajouter').fill('Cheval de guerre');
  await page.getByRole('button', { name: 'Ajouter Cheval de guerre lourd au combat', exact: true }).click();
  const participant = await expect.poll(() => page.evaluate(async () => { const { Store } = await import('/js/main.js'); return Store.listParticipants().length; })).toBe(1)
    .then(() => page.evaluate(async () => { const { Store } = await import('/js/main.js'); const p = Store.listParticipants()[0]; return JSON.parse(JSON.stringify(p)); }));
  const traitNames = JSON.stringify(participant.traits ?? participant.extensions?.traits ?? []);
  assert.match(traitNames, /Fear|Peur/, `participant porte Peur : ${traitNames}`);
  assert.equal(participant.caracs?.E ?? participant.stats?.E, 60, 'E du participant modifiée (60)');
  console.log('PASS 6 — participant en rencontre : Peur présente, E 60 ; Traits = ' + traitNames.slice(0, 160));

  // 7. Rechargement : les coches sont encore là.
  await page.reload(); await expect(page.locator('#app-content')).toBeVisible();
  await page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.ready; });
  editor = await openEditor(warhorse.id);
  await expect(panel(editor)).toBeVisible();
  for (const key of ['Tough', 'Hardy', fearKey]) await expect(box(editor, key)).toBeChecked();
  await expect(change(editor, 'E')).toContainText('50 → 60');
  console.log('PASS 7 — rechargement : Tough, Hardy et Peur (2) toujours cochés');
  await closeEditor();

  // 8. Export puis import du JSON du profil : les coches reviennent sur le profil créé.
  const json = await page.evaluate(async id => { const { Store } = await import('/js/main.js'); const { exportProfilesJson } = await import('/js/core/json-profile-export.js'); return exportProfilesJson(Store.getProfile(id)); }, warhorse.id);
  assert.match(json, /traitsOptionnels/);
  const parsedJson = JSON.parse(json); (Array.isArray(parsedJson) ? parsedJson[0] : parsedJson).nom = 'Cheval importé';
  const renamed = JSON.stringify(parsedJson);
  await page.locator('#tab-prepare').click();
  await page.locator('#workspace-prepare').getByRole('button', { name: 'Nouveau profil' }).click();
  const creation = page.locator('dialog[open]').last();
  await creation.getByText('Créer depuis un JSON', { exact: true }).click();
  await creation.getByLabel('JSON du profil').fill(renamed);
  await creation.getByRole('button', { name: 'Vérifier le JSON' }).click();
  await creation.getByRole('button', { name: /^Créer 1 profil$/ }).click();
  await expect.poll(async () => (await profilesByBestiary()).some(p => p.name === 'Cheval importé')).toBe(true);
  const imported = (await profilesByBestiary()).find(p => p.name === 'Cheval importé');
  assert.deepEqual(imported.choices?.traits?.map(item => item.name).sort(), ['Fear', 'Hardy', 'Tough'], 'coches importées');
  console.log('PASS 8 — JSON exporté puis importé : Tough, Hardy, Peur retrouvés sur le nouveau profil');
  await page.keyboard.press('Escape').catch(() => {});

  // 9. Case grisée « déjà compté » : River Trolls imprime déjà Tough.
  const trolls = await copyFromLibrary('River Trolls', /^Trolls des rivières/, 'E0-P-963');
  editor = await openEditor(trolls.id);
  await expect(box(editor, 'Tough')).toBeDisabled();
  await expect(caseLabel(editor, 'Tough')).toContainText('déjà compté');
  console.log('PASS 9 — Tough grisée « déjà compté » sur un profil qui l’imprime');
  await closeEditor();

  // 10. Attaque et armure optionnelles d'une autre créature (Human : arc, armure légère).
  const human = await copyFromLibrary('Human', /^(Humain|Human)\b/, 'E0-P-063');
  editor = await openEditor(human.id);
  const humanKeys = await caseKeys(editor);
  const attackKey = humanKeys.find(key => key.startsWith('attack:')), armourKey = humanKeys.find(key => key.startsWith('armour:'));
  assert.ok(attackKey && armourKey, `Human propose une attaque et une armure (${humanKeys})`);
  await box(editor, attackKey).click(); await expect(box(editor, attackKey)).toBeChecked();
  await box(editor, armourKey).click(); await expect(box(editor, armourKey)).toBeChecked();
  const humanChoices = (await profileOf('E0-P-063')).choices;
  assert.equal(humanChoices.attacks.length, 1); assert.equal(humanChoices.armour.length, 1);
  console.log(`PASS 10 — ${attackKey} et ${armourKey} cochées et enregistrées`);
  await closeEditor();

  // 11. Taille cochée : Ours (Grande → Énorme), Blessures recalculées par différence.
  const bear = await copyFromLibrary('Bear', /^(Ours|Bear)\b/, 'E0-P-194');
  editor = await openEditor(bear.id);
  const sizeKey = (await caseKeys(editor)).find(key => key.startsWith('Size:'));
  assert.ok(sizeKey, 'case de Taille');
  await box(editor, sizeKey).click(); await expect(box(editor, sizeKey)).toBeChecked();
  const bearWounds = panel(editor).locator('[data-optional-change]').filter({ hasText: /^Blessures/ });
  await expect(bearWounds).toHaveCount(1);
  const bw = numbers(await bearWounds.innerText());
  assert.equal(bw[0], 28, 'Blessures imprimées de l’Ours');
  assert.ok(bw[1] > 28, `Blessures recalculées (${bw})`);
  console.log(`PASS 11 — Taille ${sizeKey} : Blessures ${bw[0]} → ${bw[1]}`);
  await closeEditor();

  // 12. Profil sans optionnel : seul « Ajouter un Trait ».
  const ogre = await copyFromLibrary('Isrogdal', /^Isrogdal/, 'E0-P-123');
  editor = await openEditor(ogre.id);
  await expect(panel(editor)).toBeVisible();
  assert.deepEqual(await caseKeys(editor), []);
  await expect(panel(editor).locator('[data-optional-add]')).toBeVisible();
  console.log('PASS 12 — profil sans optionnel : aucune case, « Ajouter un Trait » seul');
  await closeEditor();

  // 13. Monture d'un PJ : le Cheval de trait lourd, coché « Dressé (Monture) », est proposé depuis la Réserve.
  const draught = await copyFromLibrary('Heavy Draught Horse', /^Cheval de trait lourd/, 'E0-P-763');
  editor = await openEditor(draught.id);
  const mountKey = (await caseKeys(editor)).find(key => key.startsWith('Trained'));
  assert.ok(mountKey, 'case Dressé (Monture)');
  await expect(caseLabel(editor, mountKey)).toContainText('Monture');
  await box(editor, mountKey).click(); await expect(box(editor, mountKey)).toBeChecked();
  await closeEditor();
  const pjId = await page.evaluate(async () => { const { Store } = await import('/js/main.js'); const { Profile } = await import('/js/core/models.js'); const profile = new Profile({ name: 'Aline PJ', kind: 'PJ', hp: 14, maxHp: 14, initiative: 40 }); await Store.addProfile(profile); return profile.id; });
  editor = await openEditor(pjId);
  await expect(panel(editor)).toBeHidden();
  await editor.getByLabel('Chercher une monture dans le bestiaire').fill('Cheval de trait');
  const pick = editor.locator('.form-mount-pick-reserve');
  await expect(pick).toHaveCount(1);
  await expect(pick).toContainText('Cheval de trait lourd');
  await pick.click();
  await expect.poll(() => page.evaluate(async id => { const { Store } = await import('/js/main.js'); return Store.getProfile(id)?.extensions?.v5?.declaredMount?.name ?? null; }, pjId)).toBe('Cheval de trait lourd');
  const mount = await page.evaluate(async id => { const { Store } = await import('/js/main.js'); const declared = Store.getProfile(id).extensions.v5.declaredMount; return JSON.parse(JSON.stringify(Store.getProfile(declared.profileId))); }, pjId);
  assert.equal(mount.id, `monture-${pjId}`);
  assert.equal(mount.extensions.v5.optionalChoices.traits.some(item => item.name === 'Trained'), true, 'la monture garde la coche Dressé (Monture)');
  console.log('PASS 13 — monture du PJ prise dans la Réserve, coche Dressé (Monture) conservée');
  // Le profil monture-<PJ> s'ouvre avec le même panneau.
  await closeEditor();
  editor = await openEditor(mount.id);
  await expect(panel(editor)).toBeVisible();
  await expect(box(editor, mountKey)).toBeChecked();
  console.log('PASS 14 — profil monture-<PJ> : même panneau, coche présente');
  await closeEditor();

  assert.deepEqual(errors, [], 'aucune erreur de page ni de console');
  assert.deepEqual(missing.filter(url => !url.includes('/rpg-map-display/maps/tokens/')), [], 'seules les images de pions peuvent manquer');
  assert.deepEqual(external, [], 'aucune requête hors du serveur local');
  console.log('PASS — Traits optionnels : parcours complet dans l’interface réelle, sans réseau');
} catch (error) {
  failed = true;
  console.error(`FAIL — traits optionnels browser: ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
if (failed) process.exitCode = 1;
