import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';
import { closeU1Drawer } from './helpers/u1-drawer.mjs';

// Traits calculés (docs/specs/traits-calculs, L8) : une rencontre avec un porteur de Sang corrosif, un Instable, deux Stupides, un porteur de Bond,
// un mort porteur d'Increvable et un adversaire avec Élan traverse un Round entier dans le vrai navigateur.
//  1. Blessure du porteur de Sang corrosif : une demande unique de d10, résolue par « Lancer d10 », réduit les Blessures de l'engagé (CA26, CA0).
//  2. Fin du Round : l'Instable perd 2 Blessures et le journal le dit ; début du Round : question « guidé ? » (Oui / Non, plus de boucle),
//     Test d'Intelligence résolu par « Lancer d100 », marqueur « tour perdu » sur échec ; total d'Increvable du mort (x / 6 DR) ; pastille de Bond.
//  3. ↶ rétablit chaque effet d'un seul coup, ↷ le rejoue, le rechargement de la page garde le résultat (CA25).
// Aucun réseau : serveur local, hôtes externes bloqués. À lancer sous `timeout 120 node tests/traits-calculs-browser.mjs`.
const root = fileURLToPath(new URL('..', import.meta.url));
const server = createStaticServer({ root, headers: { 'Cache-Control': 'no-store' } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
try {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
  await blockExternalNetwork(context, server);
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  const state = () => page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.whenIdle(); return JSON.parse(Store.getFullJSON()); });
  const person = (full, id) => full.combat.participants.find(row => row.id === id);
  const logText = full => (full.log || []).map(row => row.text || row.message || '').join('\n');
  // Le dé de la page est fixé pour le test : 0,95 → d10 = 10 ; 0,995 → d100 = 100 (échec du Test d'Intelligence).
  const fixDie = value => page.evaluate(next => { window.__realRandom ||= Math.random; Math.random = () => next; }, value);

  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  await page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    const fighter = (id, name, camp, initiative, traits = [], v5 = {}, extra = {}) => ({ id, name, kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, zone: 'active', initiative, hp: 20, maxHp: 20,
      caracs: { CC: 45, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], traits, equipment: [], talents: [], prayers: [],
      skills: [], actions: [{ id: 'blade', type: 'attack', base: 45, damage: 3 }], extensions: { v5 }, ...extra });
    await Store.loadFromJSON({ schemaVersion: 3, reserve: [], diceLines: [], log: [], extensions: { v5: { turnIndex: 1, combatId: 'qa-traits-calculs' } },
      combat: { round: 1, currentActorId: 'hero', order: ['hero', 'acid', 'inst', 'stup', 'stup2', 'horse', 'undying', 'sent'], participants: [
        fighter('hero', 'Héros', 'pj', 60),
        fighter('acid', 'Acide', 'ennemi', 50, [{ name: 'Sang corrosif' }]),
        fighter('inst', 'Instable', 'ennemi', 40, [{ name: 'Instable' }]),
        fighter('stup', 'Stupide', 'ennemi', 30, [{ name: 'Stupide' }]),
        fighter('stup2', 'Stupide bis', 'ennemi', 20, [{ name: 'Stupide' }]),
        fighter('horse', 'Destrier', 'pj', 10, [{ name: 'Bond' }], {}, { caracs: { CC: 35, CT: 0, F: 40, E: 40, I: 30, Ag: 30, Dex: 0, Int: 14, FM: 30, Soc: 0, M: 6 } }),
        fighter('undying', 'Revenant', 'ennemi', 5, [{ name: 'Increvable' }], { dead: true, dieHard: { total: 2, roundsLeft: 3, bodyIntact: true, startRound: 1, lastRound: 1, ended: null } }, { hp: 0 }),
        fighter('sent', 'Sentinelle', 'pj', 1, [], { hasMomentum: true })] } });
    await Store.engageParticipants('hero', 'acid');
    await Store.engageParticipants('hero', 'inst');
    await Store.engageParticipants('sent', 'inst');
  });
  await page.getByRole('tab', { name: 'Jouer', exact: true }).click();
  await closeU1Drawer(page);
  const start = await state();
  assert.equal(person(start, 'acid').hp, 20); assert.equal(person(start, 'hero').hp, 20);
  assert.equal(start.combat.round, 1);
  console.log('PASS 0 — rencontre posée : Héros engagé avec l’Acide et l’Instable, Sentinelle à Élan engagée avec l’Instable, deux Stupides, un Destrier à Bond, un Revenant Increvable');

  // 1. Le Héros frappe l'Acide ; la blessure demande un seul d10 (Sang corrosif), résolu par le bouton.
  const resolution = page.locator('.workspace-resolution');
  await resolution.getByRole('group', { name: 'Adversaires' }).getByRole('button', { name: 'Acide', exact: true }).click();
  await page.locator('[data-roll-input="attack"]').fill('20');
  await page.locator('[data-roll-input="defense"]').fill('90');
  await page.locator('[data-roll-input="defense"]').press('Enter');
  const result = page.locator('.workspace-result');
  await expect_(result, /Sang corrosif/);
  // Un seul d10 pour tous les engagés : une seule demande, avec son bouton de dé et sa saisie.
  assert.equal(await page.locator('.workspace-trait-request').count(), 1, 'une seule demande de d10');
  await fixDie(0.95);
  await result.getByRole('button', { name: /^Lancer d10/ }).click();
  await expect_(result, /Sang corrosif \(d10 10\)/);
  await page.waitForFunction(() => document.querySelector('.workspace-primary[data-focus-key="apply"]:not([disabled])'));
  const apply = page.getByRole('button', { name: /^Appliquer \d+ dégâts? à Acide$/ });
  await apply.click();
  await page.waitForFunction(async () => { const { Store } = await import('/js/main.js'); await Store.whenIdle(); return JSON.parse(Store.getFullJSON()).combat.participants.find(row => row.id === 'acid').hp < 20; });
  const wounded = await state();
  assert.equal(person(wounded, 'acid').hp, 13, 'l’Acide perd 7 Blessures');
  assert.equal(person(wounded, 'hero').hp, 13, 'le Héros engagé perd 10 − BE 3 = 7 Blessures (Sang corrosif)');
  assert.match(logText(wounded), /Sang corrosif \(d10 10\)/);
  console.log('PASS 1 — blessure de l’Acide : demande unique de d10 résolue par « Lancer d10 », Héros 20 → 13');
  const afterWound = wounded;

  // 2. Le Round se termine : six Tours passés sans effet, le septième (le Revenant) ouvre la fin du Round et le début du suivant.
  const dialog = page.locator('dialog[open]');
  const nextTurn = () => page.locator('.combat-banner-primary').click();
  for (const expected of ['acid', 'inst', 'stup', 'stup2', 'horse', 'undying', 'sent']) {
    await nextTurn();
    await page.waitForFunction(async id => { const { Store } = await import('/js/main.js'); await Store.whenIdle(); return JSON.parse(Store.getFullJSON()).combat.currentActorId === id; }, expected);
  }
  assert.equal((await state()).combat.round, 1, 'toujours le Round 1');
  await nextTurn();
  await dialog.waitFor({ state: 'visible' });
  await expect_(dialog, /Terminer le tour : effets V5/);
  // Stupide, question « guidé ? » : Non, puis le Test d'Intelligence apparaît (la demande ne boucle pas) ; Stupide bis : Oui, rien de plus.
  const guided = id => dialog.getByLabel(`${id} · Stupide : un allié non Stupide le guide-t-il ?`, { exact: true });
  await guided('Stupide').selectOption('false');
  await guided('Stupide bis').selectOption('true');
  // Dés fixés : Endurance du Revenant (+0) avec 15 = réussite ; Intelligence 50 +4 DR avec 100 = échec.
  await fixDie(0.14);
  await dialog.getByRole('button', { name: /^Lancer d100 : Revenant · Increvable/ }).click();
  await dialog.getByRole('button', { name: 'Confirmer les effets', exact: true }).click();
  const intelligence = dialog.getByRole('button', { name: /^Lancer d100 : Stupide · Intelligence/ });
  await intelligence.waitFor({ state: 'visible' });
  assert.equal(await dialog.getByLabel(/Stupide bis · Intelligence/).count(), 0, 'Oui : aucun Test pour le Stupide guidé');
  assert.equal(await guided('Stupide').count(), 0, 'la question « guidé ? » n’est plus reposée (pas de boucle)');
  assert.equal(await guided('Stupide bis').count(), 0, 'ni celle du Stupide guidé');
  await expect_(dialog, /Résultats déjà renseignés/);
  await fixDie(0.995);
  await intelligence.click();
  await dialog.getByRole('button', { name: 'Confirmer les effets', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  const round2 = await state();
  assert.equal(round2.combat.round, 2, 'le Round 2 a commencé');
  assert.equal(person(round2, 'inst').hp, 18, 'Instable engagé contre l’Élan du Héros, sans Élan : 2 Blessures directes en fin de Round');
  assert.equal(person(round2, 'hero').hp, 13, 'le Héros n’est pas touché par la fin de Round');
  assert.match(logText(round2), /Instable, fin de Round : 2 Blessures directes/);
  assert.match(logText(round2), /Stupide : Intelligence ratée/);
  assert.equal(person(round2, 'stup').extensions.v5.lostTurn?.cause, 'stupid', 'le Stupide a perdu son tour');
  assert.equal(person(round2, 'stup2').extensions?.v5?.lostTurn, undefined, 'le Stupide guidé ne perd rien');
  const revenant = person(round2, 'undying').extensions.v5.dieHard;
  assert.ok(revenant.total > 2 && revenant.total < 6, `total d’Increvable avancé (${revenant.total})`);
  console.log(`PASS 2 — fin de Round : Instable 20 → 18, journal ; début de Round : « guidé ? » Non / Oui sans boucle, Test d’Intelligence par « Lancer d100 », Stupide a perdu son tour, Increvable à ${revenant.total} / 6 DR`);

  // Marqueurs de la fiche : « tour perdu », total d'Increvable, pastille de Bond, dans le vrai navigateur.
  const play = page.locator('#workspace-play');
  const show = async (id, name) => { await page.locator(`[data-workspace-select="${id}"]`).click(); await expect_(page.locator('.workspace-sheet-name', { hasText: name }).first(), new RegExp(name)); };
  await show('stup', 'Stupide');
  await expect_(play, /Tour perdu/);
  await show('undying', 'Revenant');
  await expect_(play, new RegExp(`Increvable[^\\n]*${revenant.total}\\s*/\\s*6 DR`));
  await show('horse', 'Destrier');
  await expect_(play, /Bond : Charge, Saut, Sprint à 2 × Course/);
  console.log(`PASS 3 — fiches : marqueur « tour perdu » du Stupide, Increvable ${revenant.total} / 6 DR du Revenant, pastille de Bond du Destrier`);

  // 4. ↶ rétablit chaque commande d'un seul coup, ↷ la rejoue, le rechargement conserve le résultat.
  const revisionOf = () => page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.whenIdle(); return Store.getLocalRevision(); });
  // Un clic = une commande défaite ou rejouée ; on attend que la révision change avant de continuer.
  const step = async kind => {
    const before = await revisionOf();
    if (kind === 'undo') await page.locator('#btn-undo').click(); else { await page.locator('#btn-menu').click(); await page.locator('#btn-redo').click(); }
    const limit = Date.now() + 8000;
    while (Date.now() < limit && await revisionOf() === before) await page.waitForTimeout(100);
    assert.notEqual(await revisionOf(), before, kind + ' sans effet');
  };
  const hpOf = (full, id) => person(full, id).hp;
  await step('undo');
  const back = await state();
  assert.equal(back.combat.round, 1, 'un ↶ défait le changement de Round');
  assert.equal(person(back, 'inst').hp, 20, '↶ rend les 2 Blessures de l’Instable');
  assert.equal(person(back, 'stup').extensions?.v5?.lostTurn, undefined, '↶ lève le tour perdu');
  assert.equal(person(back, 'undying').extensions.v5.dieHard.total, 2, '↶ rend le total d’Increvable');
  assert.equal(hpOf(back, 'hero'), 13, 'la blessure de l’Acide reste appliquée');
  // Le journal est volontairement hors de ↶/↷ (Store.preserveLocalStateDuringHistory) : ses lignes restent, seul l'état est rétabli.
  // Les Tours sans effet se défont un à un (une commande chacun) ; le ↶ qui rend l'Acide rend aussi le Héros, d'un seul coup.
  let undone = 0, previous = await state();
  while (hpOf(previous, 'acid') !== 20 && undone < 14) {
    await step('undo'); undone += 1;
    const now = await state();
    if (hpOf(now, 'acid') === 20) { assert.equal(hpOf(previous, 'hero'), 13); assert.equal(hpOf(now, 'hero'), 20, 'le même ↶ rend les Blessures du Sang corrosif (CA25)'); }
    else assert.equal(hpOf(now, 'hero'), 13, 'les ↶ des Tours ne touchent pas aux Blessures');
    previous = now;
  }
  assert.equal(hpOf(previous, 'acid'), 20, 'l’Acide est rendu'); assert.ok(undone >= 2 && undone <= 12, 'nombre de ↶ plausible (' + undone + ')');
  for (let n = 1; n <= undone; n += 1) {
    // ↷ rejoue dans l'ordre : le dernier ↶ (la blessure) est le premier ↷.
    await step('redo');
    const now = await state();
    if (n === 1) { assert.equal(hpOf(now, 'acid'), 13, '↷ rejoue la blessure'); assert.equal(hpOf(now, 'hero'), 13, 'le même ↷ rejoue le Sang corrosif'); }
  }
  assert.equal((await state()).combat.round, 1);
  await step('redo');
  assert.equal((await state()).combat.round, 2, 'le dernier ↷ rejoue le changement de Round');
  const replayed = await state();
  assert.equal(replayed.combat.round, 2, '↷ rejoue le changement de Round');
  assert.equal(person(replayed, 'inst').hp, 18); assert.equal(person(replayed, 'stup').extensions.v5.lostTurn?.cause, 'stupid');
  assert.equal(person(replayed, 'undying').extensions.v5.dieHard.total, revenant.total);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  const reloaded = await state();
  assert.equal(reloaded.combat.round, 2); assert.equal(person(reloaded, 'inst').hp, 18); assert.equal(person(reloaded, 'hero').hp, 13);
  assert.equal(person(reloaded, 'stup').extensions.v5.lostTurn?.cause, 'stupid');
  assert.equal(person(reloaded, 'undying').extensions.v5.dieHard.total, revenant.total);
  assert.match(logText(reloaded), /Instable, fin de Round : 2 Blessures directes/);
  console.log('PASS 4 — ↶ rétablit chaque effet d’un seul coup, ↷ le rejoue, le rechargement conserve le résultat');
  assert.deepEqual(errors, [], 'aucune erreur JS');
} finally {
  await browser.close();
  server.close();
}
async function expect_(locator, pattern) { await locator.waitFor({ state: 'visible' }); assert.match(await locator.innerText(), pattern); }
