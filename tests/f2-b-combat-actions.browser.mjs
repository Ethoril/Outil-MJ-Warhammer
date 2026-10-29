import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const base = '/Outil-MJ-Warhammer/';
const server = createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    assert.ok(pathname.startsWith(base));
    const path = resolve(root, pathname.slice(base.length) || 'index.html');
    assert.ok(path.startsWith(resolve(root) + sep) && statSync(path).isFile());
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(path));
  } catch { res.writeHead(404); res.end('Not found'); }
});
const actor = (id, name, camp, extra = {}) => ({ id, name, kind: 'PJ', camp, zone: 'active', initiative: id === 'b' ? 35 : 60, hp: 30, maxHp: 30,
  caracs: { CC: 60, CT: 70, F: 45, E: 40, I: 50, Ag: 45, Dex: 45, Int: 45, FM: 40, Soc: 35 },
  skills: [{ id: 'dodge', name: 'Esquive', status: 'resolved', total: 55, carac: 'Ag' }], actions: [], equipment: [], traits: [], talents: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true } }, ...extra });
const fixture = () => ({ schemaVersion: 3, reserve: [], diceLines: [], log: [],
  extensions: { v5: { combatId: 'f2-b-browser', turnIndex: 1 } },
  combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [
    actor('a', 'Aline', 'pj', { equipment: [{ id: 'bow', kind: 'weapon', name: 'Arc long', category: 'Arc', range: '100 yards', hands: 2 }],
      actions: [{ id: 'shot', note: 'Tir à l’arc', type: 'attack', attr: 'CT', base: 70, damage: 4, qualities: [] }] }),
    actor('b', 'Garde', 'ennemi', { kind: 'PNJ', caracs: { CC: 50, CT: 40, F: 40, E: 40, I: 35, Ag: 35, Dex: 35, Int: 30, FM: 35, Soc: 25 }, actions: [] })
  ] } });

let browser;
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
  const context = await browser.newContext({ serviceWorkers: 'block' }), page = await context.newPage(), errors = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  await page.goto(`http://127.0.0.1:${server.address().port}${base}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  await page.locator('#tab-combat').click();
  await page.evaluate(async state => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; await Store.loadFromJSON(state); }, fixture());

  const combat = page.locator('#workspace-root'), actorCard = combat.locator('[data-workspace-select="a"]');
  await actorCard.click();
  await combat.getByRole('combobox', { name: /Arme de tir tenue pour viser Garde/ }).selectOption('bow');
  await combat.getByRole('checkbox', { name: 'Je confirme que cette arme est tenue en main' }).check();
  await combat.getByRole('button', { name: 'Viser Garde' }).click();
  await page.waitForFunction(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    const state = JSON.parse(Store.getFullJSON()).extensions?.v5?.combatActions?.byActorId?.a;
    return state?.kind === 'aim' && state.targetId === 'b' && state.weaponId === 'bow';
  });

  await combat.getByRole('button', { name: 'Déclarer un déplacement effectué' }).click();
  await page.waitForFunction(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    const combatActions = JSON.parse(Store.getFullJSON()).extensions?.v5?.combatActions;
    return !combatActions?.byActorId?.a && combatActions?.movementByActorId?.a?.actorId === 'a';
  });
  const movedState = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return JSON.parse(Store.getFullJSON()).extensions.v5.combatActions; });
  assert.equal(movedState.movementByActorId.a.actorId, 'a');

  await page.evaluate(async state => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.loadFromJSON(state); }, fixture());
  await actorCard.click();
  await combat.getByRole('combobox', { name: 'Compétence choisie pour l’Action défensive' }).selectOption('dodge');
  await combat.getByRole('button', { name: 'Déclarer l’Action défensive' }).click();
  await page.waitForFunction(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    const row = JSON.parse(Store.getFullJSON()).extensions?.v5?.combatActions?.byActorId?.a;
    return row?.kind === 'defensive' && row.skillId === 'dodge';
  });
  const afterDefense = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return JSON.parse(Store.getFullJSON()); });
  assert.equal(afterDefense.extensions.v5.combatActions.byActorId.a.skillId, 'dodge');

  await page.locator('#btn-undo').click();
  const undone = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return JSON.parse(Store.getFullJSON()); });
  assert.equal(undone.extensions.v5.combatActions?.byActorId?.a, undefined, 'Undo annule la déclaration défensive');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  const afterReload = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; return JSON.parse(Store.getFullJSON()); });
  assert.equal(afterReload.extensions.v5.combatActions?.byActorId?.a, undefined, 'rechargement conserve l’Undo appliqué');

  await page.locator('#tab-combat').click();
  await page.evaluate(async state => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.loadFromJSON(state); }, fixture());
  await actorCard.click();
  await combat.getByRole('combobox', { name: 'Nature du Test' }).selectOption('ranged');
  assert.match(await combat.locator('.workspace-resolution').innerText(), /Bandes dérivées de la portée imprimée \(100 m\) : Bout portant ≤ 4 m \(\+2 DR\) · Courte ≤ 50 m \(\+1 DR\) · Moyenne ≤ 100 m \(0 DR\) · Longue ≤ 200 m \(−1 DR\) · Extrême ≤ 300 m \(−2 DR\)/);
  await combat.getByRole('combobox', { name: 'Bande de portée choisie par le MJ' }).selectOption('point-blank');
  await combat.getByRole('combobox', { name: 'Météo' }).selectOption('rain-wind');
  await combat.getByRole('combobox', { name: 'Lumière' }).selectOption('fog');
  await combat.getByRole('checkbox', { name: 'La cible est à couvert ou À Terre (−1 DR, une seule fois)' }).check();
  await combat.getByRole('textbox', { name: 'Attaque (CT 70)' }).fill('10');
  await combat.getByRole('button', { name: 'Calculer' }).click();
  const shotPreviewText = await combat.locator('.workspace-result-live').innerText();
  await combat.getByText('Détail des calculs et règles').click();
  const detailedShotPreview = await combat.locator('.workspace-result-live').innerText();
  assert.match(detailedShotPreview, /Météo et lumière \(niveau le plus sévère\) : −2 DR/);
  assert.match(detailedShotPreview, /Bande de portée choisie par le MJ : .* DR/);
  await combat.locator('.workspace-result-live').getByRole('button', { name: /Appliquer/ }).click();
  await page.waitForFunction(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getCombat().participants.get('b')?.hp < 30;
  });
  const appliedShot = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const state=JSON.parse(Store.getFullJSON()); return { hp:Store.getCombat().participants.get('b').hp, log:state.log[0] }; });
  assert.ok(appliedShot.hp < 30, 'l’action modifiée a appliqué de vraies Blessures');
  assert.equal(appliedShot.log?.detail?.input?.v5?.context?.shotRange, 'point-blank', 'le reçu consigne la bande retenue');
  await page.locator('#btn-undo').click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getCombat().participants.get('b')?.hp === 30; });
  await page.locator('#btn-menu').click();
  await page.locator('#btn-redo').click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getCombat().participants.get('b')?.hp < 30; });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  const redoneAfterReload = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; return { hp:Store.getCombat().participants.get('b')?.hp, log:JSON.parse(Store.getFullJSON()).log[0] }; });
  assert.ok(redoneAfterReload.hp < 30, 'Redo est conservé après rechargement');

  const helplessFixture = fixture();
  helplessFixture.combat.participants[1].states = [{ key: 'inconscient', name: 'Inconscient', level: 1 }];
  await page.locator('#tab-combat').click();
  await page.evaluate(async state => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.loadFromJSON(state); }, helplessFixture);
  await actorCard.click();
  await combat.getByRole('combobox', { name: 'Nature du Test' }).selectOption('ranged');
  await combat.getByRole('combobox', { name: 'Bande de portée choisie par le MJ' }).selectOption('point-blank');
  const tableLethal = combat.getByRole('checkbox', { name: 'Activer l’option létale de la table pour cette résolution' });
  const intentLethal = combat.getByRole('checkbox', { name: 'Déclarer une intention létale contre Garde' });
  assert.equal(await tableLethal.isChecked(), false, 'l’option létale est inactive par défaut');
  assert.equal(await intentLethal.isChecked(), false, 'l’intention létale est distincte et inactive par défaut');
  await tableLethal.check();
  await intentLethal.check();
  await combat.getByRole('checkbox', { name: 'Je confirme explicitement la mort de Garde' }).check();
  await combat.getByRole('textbox', { name: 'Attaque (CT 70)' }).fill('1');
  await combat.getByRole('button', { name: 'Calculer' }).click();
  assert.match(await combat.locator('.workspace-result-live').innerText(), /OPTION LÉTALE CONFIRMÉE PAR LE MJ/);
  await combat.locator('.workspace-result-live').getByRole('button', { name: /Appliquer/ }).click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const target=Store.getCombat().participants.get('b'); return target?.hp===0&&target?.extensions?.v5?.dead===true; });
  const lethalApplied = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return { target:Store.getCombat().participants.get('b'), log:JSON.parse(Store.getFullJSON()).log[0] }; });
  assert.equal(lethalApplied.target.hp, 0, 'la confirmation létale applique les PV à zéro');
  assert.equal(lethalApplied.target.extensions.v5.dead, true, 'la confirmation létale pose mort');
  assert.equal(lethalApplied.log?.detail?.input?.v5?.context?.confirmLethalDeath, true, 'le reçu conserve la confirmation explicite');
  await page.locator('#btn-undo').click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const target=Store.getCombat().participants.get('b'); return target?.extensions?.v5?.dead!==true&&target?.hp===30; });

  await page.evaluate(async state => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.loadFromJSON(state); }, fixture());
  await actorCard.click();
  await combat.getByRole('combobox', { name: 'Compétence choisie pour l’Action défensive' }).selectOption('dodge');
  await combat.getByRole('button', { name: 'Déclarer l’Action défensive' }).click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return JSON.parse(Store.getFullJSON()).extensions?.v5?.combatActions?.byActorId?.a?.kind === 'defensive'; });
  const turnAdvance = page.locator('#combat-banner .combat-banner-primary');
  await turnAdvance.click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const combat=Store.getCombat(); return combat.currentActorId==='b'&&JSON.parse(Store.getFullJSON()).extensions?.v5?.combatActions?.byActorId?.a?.kind==='defensive'; });
  await turnAdvance.click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const combat=Store.getCombat(), actions=JSON.parse(Store.getFullJSON()).extensions?.v5?.combatActions; return combat.currentActorId==='a'&&!actions?.byActorId?.a; });

  const sharpshooterFixture = fixture();
  sharpshooterFixture.combat.participants[0].talents = [{ id: 'talent-sharpshooter', name: 'Tireur d’élite', status: 'resolved', rank: 1 }];
  await page.evaluate(async state => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.loadFromJSON(state); }, sharpshooterFixture);
  await actorCard.click();
  await combat.getByRole('combobox', { name: 'Nature du Test' }).selectOption('ranged');
  await combat.getByRole('checkbox', { name: 'Tir extraordinaire selon Tireur d’élite' }).check();
  await combat.getByRole('textbox', { name: 'Décrire le Tir extraordinaire' }).fill('tir entre les barreaux de la herse');
  await combat.getByRole('textbox', { name: 'Décrire le Tir extraordinaire' }).press('Tab');
  await combat.getByRole('spinbutton', { name: 'Difficulté du Tir extraordinaire (DR signés)' }).fill('-4');
  await combat.getByRole('spinbutton', { name: 'Difficulté du Tir extraordinaire (DR signés)' }).press('Tab');
  await combat.getByRole('textbox', { name: 'Attaque (CT 70)' }).fill('10');
  await combat.getByRole('button', { name: 'Calculer' }).click();
  const extraordinaryDetails = await combat.locator('.workspace-resolution').innerText();
  assert.match(extraordinaryDetails, /Appliquer/);
  await combat.locator('.workspace-result-live').getByRole('button', { name: /Appliquer/ }).click();
  const extraordinaryLog = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return JSON.parse(Store.getFullJSON()).log[0]; });
  assert.equal(extraordinaryLog?.detail?.input?.v5?.context?.extraordinaryShot, true);
  assert.equal(extraordinaryLog?.detail?.input?.v5?.context?.extraordinaryShotDifficulty, -4);
  assert.equal(extraordinaryLog?.detail?.input?.v5?.context?.extraordinaryShotDescription, 'tir entre les barreaux de la herse');

  // Dispersion d’une arme de jet ratée
  await page.evaluate(async state => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.loadFromJSON(state); }, fixture());
  await actorCard.click();
  await combat.getByRole('combobox', { name: 'Nature du Test' }).selectOption('ranged');
  await combat.getByRole('checkbox', { name: 'Il s’agit d’une arme de jet (dispersion seulement si le tir échoue)' }).check();
  await combat.getByRole('combobox', { name: 'Déviation d10 (direction relative à la cible)' }).selectOption('3');
  await combat.getByRole('spinbutton', { name: 'Dispersion · d10 1 (mètres)' }).fill('7');
  await combat.getByRole('spinbutton', { name: 'Dispersion · d10 1 (mètres)' }).press('Tab');
  await combat.getByRole('spinbutton', { name: 'Dispersion · d10 2 (mètres)' }).fill('6');
  await combat.getByRole('spinbutton', { name: 'Dispersion · d10 2 (mètres)' }).press('Tab');
  await combat.getByRole('spinbutton', { name: 'Distance cible-tireur confirmée par le MJ (mètres; nécessaire pour plafonner la dispersion)' }).fill('12');
  await combat.getByRole('spinbutton', { name: 'Distance cible-tireur confirmée par le MJ (mètres; nécessaire pour plafonner la dispersion)' }).press('Tab');
  await combat.getByRole('textbox', { name: 'Attaque (CT 70)' }).fill('95');
  await combat.getByRole('button', { name: 'Calculer' }).click();
  assert.match(await combat.locator('.workspace-result-live').innerText(), /Arme de jet déviée : d10 3 · haut-droite · 2d10 7 et 6 m = 13 m, plafond 6 m, résultat 6 m/);
  await combat.locator('.workspace-result-live').getByRole('button', { name: /Enregistrer le résultat/ }).click();
  const scatterLog = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return JSON.parse(Store.getFullJSON()).log[0]; });
  assert.equal(scatterLog?.detail?.scatter?.distanceYards, 6);

  // Tir sur une cible engagée au corps à corps : redirection de la touche annulée par Désavantage vers l’allié engagé
  const engagedFixture = fixture();
  engagedFixture.combat.order = ['a', 'b', 'c'];
  engagedFixture.combat.participants.push(actor('c', 'Allié', 'pj', { hp: 25, maxHp: 25 }));
  await page.evaluate(async state => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.loadFromJSON(state); }, engagedFixture);
  await actorCard.click();
  await combat.getByRole('combobox', { name: 'Nature du Test' }).selectOption('ranged');
  await combat.getByRole('combobox', { name: 'La cible est engagée au corps à corps (Désavantage au tir)' }).selectOption('true');
  await combat.getByRole('checkbox', { name: 'Engagé avec la cible : Allié' }).check();
  await combat.getByRole('spinbutton', { name: 'Jet d100 pour désigner le combattant touché' }).fill('80');
  await combat.getByRole('spinbutton', { name: 'Jet d100 pour désigner le combattant touché' }).press('Tab');
  await combat.getByRole('textbox', { name: 'Attaque (CT 70)' }).fill('28');
  await combat.getByRole('button', { name: 'Calculer' }).click();
  assert.match(await combat.locator('.workspace-result-live').innerText(), /Tir contre des combattants engagés : déviation vers Allié \(d100 80\)/);
  await combat.locator('.workspace-result-live').getByRole('button', { name: /Appliquer .* à Allié/ }).click();
  await page.waitForFunction(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    return Store.getCombat().participants.get('c')?.hp < 25 && Store.getCombat().participants.get('b')?.hp === 30;
  });

  // Mêlée : repère d’allonge Très longue, touche primaire à la hallebarde/fléau (Croche-pied), Croche-pied monté et seconde arme
  const meleeFixture = fixture();
  meleeFixture.combat.participants[0] = actor('a', 'Aline', 'pj', {
    extensions: { v5: { hasMomentum: false } },
    skills: [{ id: 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65', name: 'Corps à corps (Base)', status: 'resolved', total: 65, advances: 5, carac: 'CC' }],
    equipment: [
      { id: 'whip', kind: 'weapon', name: 'Fouet', category: 'Base', reach: 'Très longue', hands: 1, keywords: [{ id: 'croche-pied' }] },
      { id: 'dagger', kind: 'weapon', name: 'Dague', category: 'Base', reach: 'Très courte', hands: 1, keywords: [] }
    ],
    actions: [
      { id: 'whip-strike', note: 'Coup de fouet', type: 'attack', attr: 'CC', base: 65, damage: 4, qualities: [{ id: 'croche-pied' }], extensions: { fiche: { equipmentId: 'whip', skillId: 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65' }, v5: { kind: 'melee' } } },
      { id: 'dagger-strike', note: 'Coup de dague', type: 'attack', attr: 'CC', base: 65, damage: 3, qualities: [], extensions: { fiche: { equipmentId: 'dagger', skillId: 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65' }, v5: { kind: 'melee' } } }
    ]
  });
  meleeFixture.combat.participants[1] = actor('b', 'Garde', 'ennemi', {
    kind: 'PNJ',
    caracs: { CC: 45, CT: 40, F: 40, E: 30, I: 35, Ag: 35, Dex: 35, Int: 30, FM: 35, Soc: 25 },
    skills: [{ id: 'skill-41_74_68_6c_e9_74_69_73_6d_65-base', name: 'Athlétisme', status: 'resolved', total: 35, carac: 'Ag' }],
    extensions: { v5: { hasMomentum: false, mounted: true } }
  });
  await page.evaluate(async state => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.loadFromJSON(state); }, meleeFixture);
  await actorCard.click();
  assert.match(await combat.locator('.workspace-resolution').innerText(), /Allonge Très longue : permet d’engager jusqu’à 4 m au lieu de 2/);
  await combat.getByRole('textbox', { name: 'Attaque (CC 65)' }).fill('20');
  await combat.getByRole('textbox', { name: /Jet de défense/ }).fill('80');
  await combat.getByRole('button', { name: 'Calculer' }).click();
  await combat.locator('.workspace-result-live').getByRole('button', { name: /Appliquer .* à Garde/ }).click();
  await page.waitForFunction(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    return Store.getCombat().participants.get('b')?.hp < 30;
  });

  // Croche-pied sur cible montée après la touche appliquée
  await combat.getByRole('combobox', { name: 'Attaque réussie déjà appliquée ce Tour' }).selectOption({ index: 1 });
  await combat.getByRole('combobox', { name: 'Athlétisme de Garde' }).selectOption('skill-41_74_68_6c_e9_74_69_73_6d_65-base');
  await combat.getByRole('button', { name: 'Préparer le Croche-pied' }).click();
  await combat.getByRole('spinbutton', { name: 'Test d’Endurance de Garde (d100, si perte après protection > BE)' }).fill('20');
  await combat.getByRole('spinbutton', { name: 'Test d’Endurance de Garde (d100, si perte après protection > BE)' }).press('Tab');
  await combat.getByRole('textbox', { name: 'Attaque (CC 65)' }).fill('15');
  await combat.getByRole('textbox', { name: /Jet de défense/ }).fill('85');
  await combat.getByRole('button', { name: 'Calculer' }).click();
  assert.match(await combat.locator('.workspace-result-live').innerText(), /Opposition de Croche-pied : victoire de Aline\. Coût prévu : 1 Élan\. Garde reçoit À Terre\./);
  assert.match(await combat.locator('.workspace-result-live').innerText(), /Chute verticale de 2 m/);
  await combat.locator('.workspace-result-live').getByRole('button', { name: /Enregistrer le résultat/ }).click();
  await page.waitForFunction(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    const target = Store.getCombat().participants.get('b');
    return target?.extensions?.v5?.mounted === false && (target?.states || []).some(s => s.key === 'aterre');
  });

  // Attaque immédiate de la seconde arme à une main après réacquisition d’Élan
  await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.updateParticipant('a', { extensions: { v5: { hasMomentum: true } } }); });
  await combat.getByRole('button', { name: /Coup de dague/ }).click();
  await combat.getByRole('combobox', { name: 'Attaque précédente pour l’attaque immédiate de l’autre arme' }).selectOption({ index: 1 });
  await combat.getByRole('textbox', { name: 'Attaque (CC 65)' }).fill('20');
  await combat.getByRole('textbox', { name: /Jet de défense/ }).fill('80');
  await combat.getByRole('button', { name: 'Calculer' }).click();
  await combat.getByRole('radio', { name: /Conserver 20/ }).check();
  assert.match(await combat.locator('.workspace-result-live').innerText(), /Coût proposé avant le jet : 1 Élan/);
  await combat.locator('.workspace-result-live').getByRole('button', { name: /Appliquer .* à Garde/ }).click();
  const secondWeaponState = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return JSON.parse(Store.getFullJSON()); });
  assert.equal(secondWeaponState.extensions.v5.actionLedger.quotaUsage.some(row => row.quotaId === 'combat:base-second-weapon' && row.used === 1), true);

  assert.deepEqual(errors, [], `erreurs de page/console: ${errors.join(' | ')}`);
  console.log('F2-B browser: Visée, déplacement, Action défensive, tir modifié, mort directe, Tir extraordinaire, dispersion, tir engagé, allonge, Croche-pied monté et seconde arme OK');
} finally {
  await browser?.close();
  await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
}
