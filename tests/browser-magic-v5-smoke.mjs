import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve('.');
const TMP_DIR = resolve('tmp/lot3');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const LAUNCH_OPTS = {
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : existsSync(EDGE_PATH)
      ? { executablePath: EDGE_PATH }
      : {})
};

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const rawPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const safePath = normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
      const filePath = resolve(join(ROOT, safePath));
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const info = await stat(filePath);
      const target = info.isDirectory() ? join(filePath, 'index.html') : filePath;
      const body = await readFile(target);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[extname(target).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not Found');
    }
  });

  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolvePromise({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

const HARNESS_HTML = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lot 3 Magie V5 — Smoke UI</title>
  <link rel="stylesheet" href="/MJ.css">
  <link rel="stylesheet" href="/js/ui/workspace.css">
</head>
<body>
  <div id="test-controls" style="display:flex;gap:.5rem;padding:.5rem 1rem;background:#1a1510;border-bottom:1px solid #4a3c2c">
    <button id="test-undo" type="button">Annuler (Undo)</button>
    <button id="test-next-turn" type="button">Tour suivant</button>
  </div>
  <div id="workspace-mount"></div>
  <script type="module">
    import { createStore } from '/js/core/store.js';
    import { initWorkspaceView } from '/js/ui/workspace-view.js';
    import { createCombatEngine } from '/js/core/combat.js';

    let saved = null;
    const listeners = new Map();
    const bus = {
      on(event, fn) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event).add(fn);
      },
      emit(event, ...args) {
        for (const fn of listeners.get(event) || []) fn(...args);
      }
    };
    const store = createStore({
      bus,
      persistence: {
        async load() { return structuredClone(saved); },
        async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; }
      }
    });
    await store.ready;

    const mage = {
      id: 'mage-1',
      name: 'Aldous Flammecoeur',
      kind: 'PJ',
      camp: 'pj',
      zone: 'active',
      init: 55,
      hp: 14,
      maxHp: 14,
      caracs: { CC: 35, CT: 35, F: 30, E: 40, I: 45, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 35 },
      skills: [
        { name: 'Focalisation', characteristic: 'FM', advances: 0, value: 50 },
        { name: 'Focalisation (Aqshy)', characteristic: 'FM', advances: 10, value: 60 },
        { name: 'Langue (Magick)', characteristic: 'Int', advances: 10, value: 60 }
      ],
      spells: [
        { id: 'spell-audit-f44d90e9c50d6dafb769', name: 'Carreau' },
        { id: 'spell-audit-44d3e9b3a2c7a6e5cef2', name: 'Forme bestiale — Jade' },
        { id: 'spell-audit-1c1dcaf3632d91591839', name: 'Main de Gloire' },
        { id: 'spell-audit-eea74da21cd65c8b6570', name: 'Robe scintillante' }
      ],
      actions: [
        { id: 'staff-1', note: 'Bâton de sorcier', type: 'attack', attr: 'CC', base: 45, mod: 0, damage: 4, qualities: [] }
      ],
      states: [],
      armor: { head: 0, body: 0, arms: 0, legs: 0 },
      extensions: {
        v5: {
          magic: { lore: 'fire' },
          channelling: { sl: 0, type: null }
        }
      }
    };

    const enemy = {
      id: 'enemy-1',
      name: 'Guerrier du Chaos',
      kind: 'Créature',
      camp: 'ennemi',
      zone: 'active',
      init: 40,
      hp: 15,
      maxHp: 15,
      caracs: { CC: 45, CT: 30, F: 40, E: 30, I: 35, Ag: 30, Dex: 25, Int: 30, FM: 35, Soc: 20 },
      actions: [
        { id: 'axe-1', note: 'Hache du Chaos', type: 'attack', attr: 'CC', base: 45, mod: 0, damage: 4, qualities: [] }
      ],
      states: [],
      armor: { head: 0, body: 0, arms: 0, legs: 0 }
    };

    await store.loadFromJSON({
      schemaVersion: 3,
      reserve: [],
      combat: {
        round: 1,
        currentActorId: 'mage-1',
        order: ['mage-1', 'enemy-1'],
        participants: [mage, enemy]
      },
      diceLines: [],
      log: []
    });

    const view = initWorkspaceView({
      mount: document.getElementById('workspace-mount'),
      Store: store,
      Bus: bus,
      actions: {
        applyResolution: preview => store.applyResolution(preview),
        acquireStates: (actorId, states, meta) => store.acquireStates(actorId, states, meta),
        recoverState: (actorId, key, opts) => store.recoverState(actorId, key, opts),
        setStates: (actorId, states, label) => store.setStates(actorId, states, label),
        setMomentum: (actorId, val) => store.setMomentum(actorId, val)
      }
    });
    view.setSpace('play');

    document.getElementById('test-undo').addEventListener('click', async () => {
      await store.undo();
      view.render();
    });
    document.getElementById('test-next-turn').addEventListener('click', async () => {
      await combat.nextTurn(); // chemin réel de main.js advanceTurn (commande end-turn-v5)
      view.render();
    });

    const combat = createCombatEngine(store);
    window.__TEST__ = { Store: store, view };
  </script>
</body>
</html>`;

const { server, baseUrl } = await startStaticServer();
let browser;

try {
  await mkdir(TMP_DIR, { recursive: true });
  browser = await chromium.launch(LAUNCH_OPTS);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.route(`${baseUrl}/__lot3_magic_ui__.html`, route =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HARNESS_HTML })
  );

  await page.goto(`${baseUrl}/__lot3_magic_ui__.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.workspace-resolution');

  // 1. Focalisation V5 via les vrais contrôles DOM du panneau de résolution
  await page.click('[data-action-key="v5-magic:channelling"]');
  await page.waitForSelector('.workspace-v5-magic');

  const initialBadge = await page.textContent('.workspace-magic-reserve');
  assert.match(initialBadge, /0 DR/, 'La réserve initiale doit afficher 0 DR');

  await page.fill('[data-roll-input="attack"]', '25');
  await page.click('[data-focus-key="calculate"]');
  await page.waitForSelector('.workspace-magic-result');

  const channelPreviewText = await page.textContent('.workspace-magic-result');
  assert.match(channelPreviewText,/Anomalie de fiche/);
  assert.match(channelPreviewText, /Focalisation réussie/, 'L’aperçu doit annoncer la focalisation réussie');
  // D-10 révisé : générique 50 prime sur l’alias Aqshy 60 en conflit ; jet25 = 3 DR + BFM5 = +8. Anomalie visible au MJ.
  assert.match(channelPreviewText, /0 DR → 8 DR \(gain \+8\)/, 'L’aperçu doit afficher la transition de réserve (3 DR + BFM 5 = +8 DR)');

  // Vérification que l'aperçu (preview) n'a pas muté le Store avant clic sur Appliquer
  const reserveBeforeApply = await page.evaluate(() =>
    window.__TEST__.Store.listParticipants().find(p => p.id === 'mage-1').extensions?.v5?.channelling?.sl ?? 0
  );
  assert.equal(reserveBeforeApply, 0, 'Le calcul d’aperçu ne doit pas modifier la réserve dans le Store');

  await page.click('[data-focus-key="apply"]');
  const reserveAfterChannel = await page.evaluate(() =>
    window.__TEST__.Store.listParticipants().find(p => p.id === 'mage-1').extensions?.v5?.channelling?.sl ?? 0
  );
  assert.ok(reserveAfterChannel >= 7, 'L’application de la focalisation doit créditer la réserve dans le Store');
  const updatedBadge = await page.textContent('.workspace-magic-reserve');
  assert.match(updatedBadge, new RegExp(`${reserveAfterChannel} DR`), 'Le badge UI doit refléter la réserve créditée');

  // 2. Incantation V5 d'un projectile magique (Carreau) via les contrôles UI
  await page.click('[data-action-key="v5-magic:cast"]');
  await page.waitForSelector('[data-focus-key="magic-spell"]');
  await page.selectOption('[data-focus-key="magic-spell"]', 'spell-audit-f44d90e9c50d6dafb769');

  const contractSummaryText = await page.textContent('.workspace-magic-contract-summary');
  assert.match(contractSummaryText, /NI 4/, 'Le résumé du contrat doit afficher NI 4 pour Carreau');

  // 2a. Reproduction UI d'un échec / maladresse d'incantation (jet 99 malgré réserve > NI 4) :
  // Aucun dégât sur la cible, consommation de la réserve et application de l'incident (Distraction -> Surpris)
  await page.fill('[data-roll-input="attack"]', '99');
  await page.fill('[data-focus-key="magicMiscastRoll"]', '15');
  await page.click('[data-focus-key="calculate"]');
  await page.waitForSelector('.workspace-magic-result');

  const failedCastPreviewText = await page.textContent('.workspace-magic-result');
  assert.match(failedCastPreviewText, /Échec d’incantation/, 'L’aperçu doit annoncer l’échec de l’incantation sur jet 99');
  assert.match(failedCastPreviewText, /Distraction/, 'L’aperçu doit afficher l’incident Distraction');

  await page.click('[data-focus-key="apply"]');
  const stateAfterFailedCast = await page.evaluate(() => {
    const participants = window.__TEST__.Store.listParticipants();
    const mage = participants.find(p => p.id === 'mage-1');
    return {
      enemyHp: participants.find(p => p.id === 'enemy-1').hp,
      mageReserve: mage.extensions?.v5?.channelling?.sl ?? 0,
      mageStates: mage.states.map(s => s.key || s.name)
    };
  });
  assert.equal(stateAfterFailedCast.enemyHp, 15, 'La cible ne doit subir aucun dégât sur un lancement échoué (jet 99)');
  assert.equal(stateAfterFailedCast.mageReserve, 0, 'La réserve doit être consommée même en cas d’échec');
  assert.ok(stateAfterFailedCast.mageStates.includes('surpris'), 'Le lanceur doit recevoir l’état Surpris de l’incident Distraction');

  // Annulation (Undo) de l'échec restaure la réserve et retire l'état Surpris
  await page.click('#test-undo');
  const stateAfterFailedUndo = await page.evaluate(() => {
    const participants = window.__TEST__.Store.listParticipants();
    const mage = participants.find(p => p.id === 'mage-1');
    return {
      mageReserve: mage.extensions?.v5?.channelling?.sl ?? 0,
      mageStatesCount: mage.states.length
    };
  });
  assert.equal(stateAfterFailedUndo.mageReserve, reserveAfterChannel, 'Undo restaure la réserve après échec');
  assert.equal(stateAfterFailedUndo.mageStatesCount, 0, 'Undo retire l’état Surpris après échec');

  // 2b. Reproduction UI d'un lancement critique réussi (jet 22, incident Mineur 15 -> Distraction) :
  // Dégâts appliqués à la cible + réserve consommée + incident Distraction (Surpris) appliqué au lanceur
  await page.click('[data-action-key="v5-magic:cast"]');
  // S-09 : option propre au sort (Effrayant, +3 DR par palier de Peur) et case « grimoire non mémorisé » ; paliers 13 et 18 acceptés.
  await page.selectOption('[data-focus-key="magic-spell"]', 'spell-audit-f4793a46d544b047664e');
  {const summary=page.getByText('Surpuissance & Paramètres du sort',{exact:true});if(!await summary.evaluate(el=>el.parentElement.open))await summary.click();}
  await page.waitForSelector('[data-focus-key="magic-specific-fear"]');
  await page.fill('[data-focus-key="magic-specific-fear"]', '2');
  assert.equal(await page.locator('[aria-label="Sort lancé depuis un grimoire sans être mémorisé (surpuissance interdite)"]').count(), 1);
  assert.equal(await page.locator('[data-focus-key="magicOvercastTargets"]').count(),0,'La cible Vous ne propose pas de surpuissance de Cibles');
  await page.fill('[data-focus-key="magic-specific-fear"]', '');
  await page.selectOption('[data-focus-key="magic-spell"]', 'spell-audit-f44d90e9c50d6dafb769');
  await page.fill('[data-roll-input="attack"]', '22');
  await page.fill('[data-focus-key="magicMiscastRoll"]', '15');
  await page.click('[data-focus-key="calculate"]');
  await page.waitForSelector('.workspace-magic-result');

  const castPreviewText = await page.textContent('.workspace-magic-result');
  assert.match(castPreviewText, /Sort lancé !/, 'L’aperçu doit confirmer la réussite du sort');
  assert.match(castPreviewText, /9 Dégâts bruts → 6 Blessures|9 Blessures/, 'Le projectile Carreau doit afficher ses dégâts (BFM 5 + 4 = 9 bruts, 6 Blessures nettes)');
  assert.match(castPreviewText, /Distraction/, 'L’aperçu doit afficher l’incident Mineur Distraction sur double réussi');

  // Avant clic sur Appliquer, les PV de la cible et la réserve sont intacts
  const stateBeforeCastApply = await page.evaluate(() => {
    const participants = window.__TEST__.Store.listParticipants();
    return {
      enemyHp: participants.find(p => p.id === 'enemy-1').hp,
      mageReserve: participants.find(p => p.id === 'mage-1').extensions?.v5?.channelling?.sl
    };
  });
  assert.equal(stateBeforeCastApply.enemyHp, 15, 'Les PV de la cible ne doivent pas changer pendant l’aperçu');
  assert.equal(stateBeforeCastApply.mageReserve, reserveAfterChannel, 'La réserve ne doit pas être consommée pendant l’aperçu');

  // Capture desktop 1440x900 avec panneau de résolution magique complet et résultat affiché
  const desktopMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  assert.ok(desktopMetrics.scrollWidth <= desktopMetrics.innerWidth, 'Aucun débordement horizontal en 1440x900');
  await page.screenshot({ path: join(TMP_DIR, 'magic-v5-desktop.png'), fullPage: true });

  // Capture mobile 390x844 et contrôle d'absence de débordement horizontal
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  assert.ok(mobileMetrics.scrollWidth <= mobileMetrics.innerWidth, `Débordement horizontal mobile: ${mobileMetrics.scrollWidth} > ${mobileMetrics.innerWidth}`);
  await page.screenshot({ path: join(TMP_DIR, 'magic-v5-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  // Application effective du sort via le bouton Appliquer
  await page.click('[data-focus-key="apply"]');
  const stateAfterCastApply = await page.evaluate(() => {
    const participants = window.__TEST__.Store.listParticipants();
    const mage = participants.find(p => p.id === 'mage-1');
    return {
      enemyHp: participants.find(p => p.id === 'enemy-1').hp,
      mageReserve: mage.extensions?.v5?.channelling?.sl,
      mageStates: mage.states.map(s => s.key || s.name)
    };
  });
  assert.equal(stateAfterCastApply.enemyHp, 9, 'Les PV de la cible doivent passer de 15 à 9 (9 dégâts - BE 3 = 6 blessures nettes)');
  assert.equal(stateAfterCastApply.mageReserve, 0, 'La réserve de focalisation doit être consommée (0 DR) après le lancer');
  assert.ok(stateAfterCastApply.mageStates.includes('surpris'), 'Le lanceur doit recevoir l’état Surpris de l’incident Distraction lors du lancer réussi');

  // 3. Test Undo via l'interface
  await page.click('#test-undo');
  const stateAfterUndo = await page.evaluate(() => {
    const participants = window.__TEST__.Store.listParticipants();
    const mage = participants.find(p => p.id === 'mage-1');
    return {
      enemyHp: participants.find(p => p.id === 'enemy-1').hp,
      mageReserve: mage.extensions?.v5?.channelling?.sl,
      mageStatesCount: mage.states.length
    };
  });
  assert.equal(stateAfterUndo.enemyHp, 15, 'Undo doit restaurer les PV de la cible à 15');
  assert.equal(stateAfterUndo.mageReserve, reserveAfterChannel, 'Undo doit restaurer la réserve de focalisation');
  assert.equal(stateAfterUndo.mageStatesCount, 0, 'Undo doit retirer l’état Surpris du lanceur');

  // 4. Forme bestiale — Jade et expiration par minutes depuis l'UI
  await page.click('[data-action-key="v5-magic:cast"]');
  await page.selectOption('[data-focus-key="magic-spell"]', 'spell-audit-44d3e9b3a2c7a6e5cef2');
  await page.click('[data-focus-key="target-mage-1"]');
  {const summary=page.getByText('Surpuissance & Paramètres du sort',{exact:true});if(!await summary.evaluate(el=>el.parentElement.open))await summary.click();}
  await page.selectOption('[data-focus-key="magic-beast-key"]', 'wolf');
  await page.fill('[data-roll-input="attack"]', '15');
  await page.click('[data-focus-key="calculate"]');
  await page.waitForSelector('.workspace-magic-result');
  await page.click('[data-focus-key="apply"]');

  const beastActive = await page.evaluate(() => {
    const mage = window.__TEST__.Store.listParticipants().find(p => p.id === 'mage-1');
    return {
      beastName: mage.extensions?.v5?.beastForm?.beastProfile?.name,
      durationMinutes: mage.extensions?.v5?.beastForm?.durationMinutes,
      caracF: mage.caracs.F
    };
  });
  assert.match(beastActive.beastName || '', /Loup/i, 'Le mage doit être transformé en loup');
  assert.equal(beastActive.caracF, 35, 'La Force du loup (35) doit remplacer celle du mage (30)');
  assert.equal(beastActive.durationMinutes, 40, 'La durée de Forme bestiale doit être Endurance (40) minutes');

  // Le profil animal masque l’incantation : ouvrir la gestion magique restante.
  await page.click('[data-action-key="v5-magic:dispel"]');
  // Avancer de 40 minutes via le contrôle UI "Minutes écoulées"
  await page.fill('[data-focus-key="advance-minutes-input"]', '40');
  await page.click('[data-focus-key="advance-minutes-btn"]');

  const beastExpired = await page.evaluate(() => {
    const mage = window.__TEST__.Store.listParticipants().find(p => p.id === 'mage-1');
    return {
      beastForm: mage.extensions?.v5?.beastForm ?? null,
      caracF: mage.caracs.F
    };
  });
  assert.equal(beastExpired.beastForm, null, 'La Forme bestiale doit expirer après Endurance (40) minutes');
  assert.equal(beastExpired.caracF, 30, 'La Force d’origine du mage (30) doit être restaurée à l’expiration');

  // 4b. Saisie MJ d’option de contrat (Goût de Feu) et choix des 4 caractéristiques (Main de Gloire) dans le DOM
  await page.click('[data-action-key="v5-magic:cast"]');
  await page.selectOption('[data-focus-key="magic-spell"]', 'spell-audit-9064959bae55a503f97d');
  await page.waitForSelector('[data-focus-key="magic-fact-catalogueMode"]');
  await page.fill('[data-roll-input="attack"]', '15');
  await page.click('[data-focus-key="calculate"]');
  await page.waitForSelector('.workspace-magic-result');

  const noChoiceApplyDisabled = await page.isDisabled('[data-focus-key="apply"]');
  assert.equal(noChoiceApplyDisabled, true, 'Le bouton Appliquer doit être désactivé tant que l’option MJ de Goût de Feu n’est pas choisie');

  await page.selectOption('[data-focus-key="magic-fact-catalogueMode"]', 'oil');
  await page.click('[data-focus-key="calculate"]');
  const withChoiceApplyDisabled = await page.isDisabled('[data-focus-key="apply"]');
  assert.equal(withChoiceApplyDisabled, false, 'Le bouton Appliquer doit être activé une fois l’option MJ choisie');
  await page.click('[data-focus-key="apply"]');

  // Main de Gloire : sélection de 4 caractéristiques incluant I et Ag dans le DOM
  await page.click('[data-action-key="v5-magic:cast"]');
  await page.selectOption('[data-focus-key="magic-spell"]', 'spell-audit-1c1dcaf3632d91591839');
  {const summary=page.getByText('Surpuissance & Paramètres du sort',{exact:true});if(!await summary.evaluate(el=>el.parentElement.open))await summary.click();}
  await page.waitForSelector('[data-focus-key="magic-chosen-stat-I"]');
  await page.check('[data-focus-key="magic-chosen-stat-CC"]');
  await page.check('[data-focus-key="magic-chosen-stat-F"]');
  await page.check('[data-focus-key="magic-chosen-stat-I"]');
  await page.check('[data-focus-key="magic-chosen-stat-Ag"]');
  await page.fill('[data-focus-key="magicRoll3d10"]', '15');
  await page.fill('[data-focus-key="magicBurnoutRoll"]', '50');
  await page.fill('[data-roll-input="attack"]', '05'); // Langue (Magick) 70 -> +7 DR vs NI 4 -> 3 DR de surpuissance seulement
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.locator('[data-focus-key="apply"]').count(),1,await page.locator('.workspace-resolution').innerText());
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), true,
    'Main de Gloire à 4 caractéristiques doit être refusée sans 6 DR de surpuissance (P1 #2)');

  // Constituer une réserve de Haute Magie via l’UI pour payer réellement les 6 DR de surpuissance
  await page.click('[data-action-key="v5-magic:channelling"]');
  await page.waitForSelector('[data-focus-key="magicChannelType"]');
  await page.selectOption('[data-focus-key="magicChannelType"]', 'high');
  await page.fill('[data-roll-input="attack"]', '25');
  await page.click('[data-focus-key="calculate"]');
  await page.click('[data-focus-key="apply"]');
  const highReserve = await page.evaluate(() =>
    window.__TEST__.Store.listParticipants().find(p => p.id === 'mage-1').extensions?.v5?.channelling
  );
  assert.equal(highReserve?.type, 'high', 'La réserve doit être de type Haute Magie');
  assert.ok((highReserve?.sl ?? 0) >= 3, 'La réserve de Haute Magie doit couvrir le manque de surpuissance');

  await page.click('[data-action-key="v5-magic:cast"]');
  await page.selectOption('[data-focus-key="magic-spell"]', 'spell-audit-1c1dcaf3632d91591839');
  const detailsOpen = await page.evaluate(() => [...document.querySelectorAll('.workspace-v5-context-details')].find(el=>el.querySelector('summary')?.textContent==='Surpuissance & Paramètres du sort')?.open === true);
  if (!detailsOpen) {const summary=page.getByText('Surpuissance & Paramètres du sort',{exact:true});if(!await summary.evaluate(el=>el.parentElement.open))await summary.click();}
  await page.waitForSelector('[data-focus-key="magic-chosen-stat-I"]');
  await page.selectOption('[data-focus-key="magic-hog-tier"]', 'overcast6');
  await page.check('[data-focus-key="magic-chosen-stat-CC"]');
  await page.check('[data-focus-key="magic-chosen-stat-F"]');
  await page.check('[data-focus-key="magic-chosen-stat-I"]');
  await page.check('[data-focus-key="magic-chosen-stat-Ag"]');
  await page.fill('[data-focus-key="magicRoll3d10"]', '15');
  await page.fill('[data-focus-key="magicBurnoutRoll"]', '50');
  await page.fill('[data-roll-input="attack"]', '05');
  await page.click('[data-focus-key="calculate"]');
  await page.click('[data-focus-key="apply"]');

  const hogApplied = await page.evaluate(() => {
    const mage = window.__TEST__.Store.listParticipants().find(p => p.id === 'mage-1');
    return {
      I: mage.caracs.I,
      Ag: mage.caracs.Ag
    };
  });
  assert.equal(hogApplied.I, 60, 'Main de Gloire doit augmenter Initiative de +15 (45 -> 60)');
  assert.equal(hogApplied.Ag, 55, 'Main de Gloire doit augmenter Agilité de +15 (40 -> 55)');

  // 4c. Destruction des Arcanes : vrais champs, coûts, Tests secondaires et annulation.
  await page.click('#test-undo'); // Restaurer la réserve de Haute Magie consommée par Main de Gloire.
  await page.evaluate(async () => {
    await window.__TEST__.Store.executeCommand('fixture-arcane-armor', draft => {
      const enemy = draft.combat.participants.find(p => p.id === 'enemy-1');
      enemy.hp = 30; enemy.maxHp = 30;
      enemy.armor = { head: 3, body: 3, arms: 3, legs: 3 };
      enemy.armorLocations = { head: 3, body: 3, leftArm: 3, rightArm: 3, leftLeg: 3, rightLeg: 3 };
      enemy.extensions = { v5: {} };
      return draft;
    });
    window.__TEST__.view.render();
  });
  const arcaneId = 'spell-audit-a15f3920b0203346ccdd';
  const arcaneState = () => page.evaluate(() => {
    const participants = window.__TEST__.Store.listParticipants();
    const mage = participants.find(p => p.id === 'mage-1');
    const enemy = participants.find(p => p.id === 'enemy-1');
    return { hp: enemy.hp, armor: enemy.armor, damage: enemy.extensions?.v5?.armorDamage || {},
      inventory: enemy.extensions?.v5?.pendingInventoryChanges || [], reserve: mage.extensions?.v5?.channelling?.sl };
  });
  async function chooseArcaneEnemy() {
    for (const [id, checked] of [['enemy-1', true], ['mage-1', false]]) {
      const input = page.locator('[data-focus-key="magic-target-' + id + '"]');
      const details = page.locator('details').filter({ has: input });
      if (!await details.evaluate(el => el.open)) await details.locator('summary').click();
      await input.setChecked(checked);
    }
  }
  const beforeArcane = await arcaneState();
  await page.click('[data-action-key="v5-magic:cast"]');
  await page.selectOption('[data-focus-key="magic-spell"]', arcaneId);
  await chooseArcaneEnemy();
  await page.fill('[data-roll-input="attack"]', '05');
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), true, 'La présence d’un objet magique doit être précisée');
  await page.selectOption('[data-focus-key="magic-arcane-item-present-enemy-1"]', 'none');
  await page.fill('[data-focus-key="magic-arcane-armor-points"]', '3');
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), true, 'Les localisations aléatoires doivent être renseignées');
  for (const [index, loc] of ['body', 'leftArm', 'rightLeg'].entries()) {
    await page.selectOption(`[data-focus-key="magic-arcane-armor-enemy-1-${index}"]`, loc);
  }
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), false, await page.textContent('.workspace-magic-result'));
  assert.deepEqual(await arcaneState(), beforeArcane, 'Aperçu sans mutation');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Champs Arcanes sans débordement mobile');
  await page.screenshot({ path: join(TMP_DIR, 'magic-v5-arcane-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.click('[data-focus-key="apply"]');
  const armorDestroyed = await arcaneState();
  assert.equal(armorDestroyed.hp, 24, 'Dégâts avant destruction des PA');
  assert.equal(armorDestroyed.armor.body, 2);
  assert.equal(armorDestroyed.armor.leftArm, 2);
  assert.equal(armorDestroyed.armor.rightLeg, 2);
  assert.deepEqual(armorDestroyed.damage, { body: 1, leftArm: 1, rightLeg: 1 });
  assert.equal(armorDestroyed.reserve, 0);
  await page.click('#test-undo');
  assert.deepEqual(await arcaneState(), beforeArcane, 'Undo restaure PV, PA, réserve et reçu inventaire');

  await page.click('[data-action-key="v5-magic:cast"]');
  await page.selectOption('[data-focus-key="magic-spell"]', arcaneId);
  await chooseArcaneEnemy();
  await page.fill('[data-focus-key="magic-arcane-armor-points"]', '0');
  await page.fill('[data-focus-key="magicBurnoutRoll"]', '50');
  await page.selectOption('[data-focus-key="magic-arcane-item-present-enemy-1"]', 'none');
  await page.fill('[data-roll-input="attack"]', '05');
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), false, 'Réduire les PA à zéro enlève les anciens tirages');
  await page.check('[data-focus-key="magicArcaneEnhancedDamage"]');
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), true, 'Palier +8 refusé avec un surplus insuffisant');

  await page.click('[data-action-key="v5-magic:channelling"]');
  await page.selectOption('[data-focus-key="magicChannelType"]', 'high');
  await page.fill('[data-roll-input="attack"]', '25');
  await page.click('[data-focus-key="calculate"]');
  await page.click('[data-focus-key="apply"]');
  const fullBefore = await arcaneState();
  await page.click('[data-action-key="v5-magic:cast"]');
  await page.selectOption('[data-focus-key="magic-spell"]', arcaneId);
  await chooseArcaneEnemy();
  await page.fill('[data-focus-key="magic-arcane-armor-points"]', '0');
  await page.fill('[data-focus-key="magicBurnoutRoll"]', '50');
  await page.selectOption('[data-focus-key="magic-arcane-item-present-enemy-1"]', 'none');
  await page.check('[data-focus-key="magicArcaneEnhancedDamage"]');
  await page.fill('[data-roll-input="attack"]', '05');
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), false, await page.textContent('.workspace-magic-result'));
  await page.click('[data-focus-key="apply"]');
  const fullAfter = await arcaneState();
  assert.equal(fullAfter.hp, 15, '+8 DR donne 18 dégâts − BE3');
  assert.deepEqual(fullAfter.armor, fullBefore.armor, '+8 DR ne détruit aucune pièce d’armure');
  assert.deepEqual(fullAfter.damage, {});
  await page.click('#test-undo');
  assert.deepEqual(await arcaneState(), fullBefore);

  await page.click('[data-action-key="v5-magic:cast"]');
  await page.selectOption('[data-focus-key="magic-spell"]', arcaneId);
  await chooseArcaneEnemy();
  await page.uncheck('[data-focus-key="magicArcaneEnhancedDamage"]');
  await page.check('[data-focus-key="magicArcaneChooseItem"]');
  await page.selectOption('[data-focus-key="magic-arcane-item-present-enemy-1"]', 'present');
  await page.fill('[data-roll-input="attack"]', '05');
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), true, 'Test de Focalisation secondaire obligatoire');
  await page.fill('[data-focus-key="magic-arcane-focalisationRoll-enemy-1"]', '85');
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), false, 'Focalisation échouée : dégâts seuls, sans destruction d’objet');
  await page.fill('[data-focus-key="magic-arcane-focalisationRoll-enemy-1"]', '25');
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), true, 'Choix de l’objet : Dextérité requise');
  await page.fill('[data-focus-key="magic-arcane-randomMagicItem-enemy-1"]', 'Anneau');
  await page.fill('[data-focus-key="magic-arcane-dexterityRoll-enemy-1"]', '85');
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), false, await page.textContent('.workspace-magic-result'));
  assert.match(await page.textContent('.workspace-magic-result'), /Anneau/, 'Dextérité échouée : objet aléatoire');
  await page.fill('[data-focus-key="magic-arcane-dexterityRoll-enemy-1"]', '55');
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), true, 'Nom de l’objet choisi obligatoire');
  await page.fill('[data-focus-key="magic-arcane-chosenMagicItem-enemy-1"]', 'Épée');
  await page.click('[data-focus-key="calculate"]');
  assert.equal(await page.isDisabled('[data-focus-key="apply"]'), false, await page.textContent('.workspace-magic-result'));
  assert.match(await page.textContent('.workspace-magic-result'), /Épée/);
  await page.screenshot({ path: join(TMP_DIR, 'magic-v5-arcane-desktop.png'), fullPage: true });
  await page.click('[data-focus-key="apply"]');
  assert.equal((await arcaneState()).inventory[0].destroyedMagicItem.name, 'Épée');
  await page.click('#test-undo');
  assert.deepEqual(await arcaneState(), fullBefore);


  // New talent/rune and persistent-dispel controls, desktop and mobile mixed-target gestures.
  await page.evaluate(async()=>{const store=window.__TEST__.Store;const mage=store.listParticipants().find(p=>p.id==='mage-1');const enemy=store.listParticipants().find(p=>p.id==='enemy-1');const ally={...structuredClone(mage),id:'ally-1',name:'Allié de recette',init:30};mage.extensions.v5={channelling:{sl:0,type:null}};mage.caracs.FM=50;mage.talents=[{id:'talent-high-magic',status:'resolved',rank:1}];mage.skills=[{name:'Focalisation',total:60},{name:'Focalisation (Haute Magie)',total:60},{name:'Langue (Magick)',total:60},{name:'Savoir (Magie)',total:60}];await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:mage.id,order:[mage.id,enemy.id,ally.id],participants:[mage,enemy,ally]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});window.__TEST__.view.render();});
  await page.click('[data-action-key="v5-magic:channelling"]');await page.fill('[data-focus-key="magicRuneKnowledgeRoll"]','25');await page.check('[data-focus-key="magicRuneMaterials"]');await page.getByRole('button',{name:'Déployer une rune (1 Round)',exact:true}).click();await page.waitForFunction(()=>window.__TEST__.Store.getCadaiRunes('mage-1').deployed===1);
  await page.click('[data-action-key="v5-magic:cast"]');// HEPG p. 84 : la rune ne sert qu'à un sort de Haute Magie (Apothéose), pas à Carreau.
  const apotheoseId=await page.evaluate(async()=>{const {getSpellContract}=await import('/js/core/v5-spell-contracts.js');return getSpellContract('Apothéose').id;});await page.selectOption('[data-focus-key="magic-spell"]',apotheoseId);await page.check('[data-focus-key="magicUseCadaiRune"]');await page.check('[data-focus-key="magicCadaiAccessible"]');await page.fill('[data-focus-key="magicCadaiTestRoll"]','85');await page.fill('[data-roll-input="attack"]','25');await page.click('[data-focus-key="calculate"]');assert.equal(await page.isDisabled('[data-focus-key="apply"]'),false,await page.textContent('.workspace-magic-result'));await page.click('[data-focus-key="apply"]');await page.waitForFunction(()=>window.__TEST__.Store.getCadaiRunes('mage-1').deployed===0);await page.click('#test-undo');assert.equal(await page.evaluate(()=>window.__TEST__.Store.getCadaiRunes('mage-1').deployed),1);
  await page.evaluate(async()=>{await window.__TEST__.Store.applySpellEffects('ally-1',{id:'ui-dispel',spellId:'ui-dispel',spellName:'Sort persistant de recette',casterId:'mage-1',cn:4,castExecutionId:'ui-dispel-group',duration:'10 Rounds',statModifiers:{Ag:20}});window.__TEST__.view.render();});
  await page.click('[data-action-key="v5-magic:dispel"]');await page.selectOption('[data-focus-key="magicPersistentId"]','ui-dispel');await page.fill('[data-focus-key="magicPersistentDistance"]','10');await page.selectOption('[data-focus-key="magicPersistentVisible"]','true');await page.fill('[data-roll-input="attack"]','25');await page.click('[data-focus-key="calculate"]');assert.equal(await page.isDisabled('[data-focus-key="apply"]'),false,await page.textContent('.workspace-magic-result'));await page.click('[data-focus-key="apply"]');await page.waitForFunction(()=>!window.__TEST__.Store.listParticipants().find(p=>p.id==='ally-1').extensions.v5.spellEffects.some(e=>e.id==='ui-dispel'));await page.click('#test-undo');assert.equal(await page.evaluate(()=>window.__TEST__.Store.listParticipants().find(p=>p.id==='ally-1').extensions.v5.spellEffects.some(e=>e.id==='ui-dispel')),true);
  await page.setViewportSize({width:390,height:844});await page.click('[data-action-key="v5-magic:cast"]');const fireId=await page.evaluate(async()=>{const {getSpellContract}=await import('/js/core/v5-spell-contracts.js');return getSpellContract('Tête Brûlante').id;});await page.selectOption('[data-focus-key="magic-spell"]',fireId);for(const id of ['ally-1','enemy-1']){const input=page.locator('[data-focus-key="magic-target-'+id+'"]');const details=page.locator('details').filter({has:input});if(!await details.evaluate(el=>el.open))await details.locator('summary').click();await input.check();}assert.equal(await page.isChecked('[data-focus-key="magic-target-ally-1"]'),true);assert.equal(await page.isChecked('[data-focus-key="magic-target-enemy-1"]'),true);await page.screenshot({path:join(TMP_DIR,'magic-v5-mixed-targets-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:900});

  // 5. Vérification réelle du Service Worker et du rechargement hors ligne
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: 'networkidle' });
  const hasSwController = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  assert.equal(hasSwController, true, 'Le Service Worker doit contrôler la page');

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const offlineCheck = await page.evaluate(async () => {
    const mod = await import('/js/core/v5-spell-contracts.js');
    const contracts = mod.getAllSpellContracts();
    return {
      controller: Boolean(navigator.serviceWorker.controller),
      contractCount: contracts.length
    };
  });
  assert.equal(offlineCheck.controller, true, 'Le Service Worker doit rester actif hors ligne');
  assert.equal(offlineCheck.contractCount, 277, 'Les 277 contrats de sorts V5 doivent être accessibles hors ligne depuis le cache SW');
  await context.setOffline(false);

  assert.equal(pageErrors.length, 0, `Aucune erreur JS non gérée ne doit survenir: ${pageErrors.join(' | ')}`);
  console.log('Tests navigateur Lot 3 Magie V5 (UI réelle + Captures + Offline SW) : OK');
} finally {
  await browser?.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
