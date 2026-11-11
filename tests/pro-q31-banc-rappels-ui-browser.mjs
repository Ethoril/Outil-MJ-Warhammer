import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { startStaticServer } from './helpers/static-server.mjs';

// Q31 : le rappel d'un participant au banc (« Ajouter au combat » depuis la bibliothèque) est affiché dans la rubrique « En attente » (rendu DOM réel),
// et le bouton « Fait » le retire.
const root = fileURLToPath(new URL('..', import.meta.url));

const failures = [];
const pageErrors = [];
const check = (ok, description) => { if (ok) console.log('PASS — ' + description); else { failures.push(description); console.log('FAIL — ' + description); } };

const { server, port } = await startStaticServer({ root });
const browser = await launchBrowser();
try {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/blank`);
  await page.setContent('<main><div id="mount"></div></main>');
  await page.evaluate(async ({ base }) => {
    const { initWorkspaceView } = await import(base + '/js/ui/workspace-view.js');
    const { buildParticipantFromBestiary } = await import(base + '/js/core/bestiary-profiles.js');
    const { createStore } = await import(base + '/js/core/store.js');
    const books = await Promise.all(['L18', 'L19', 'L20', 'L21', 'L23'].map(async id => (await (await fetch(base + '/js/data/bestiary/' + id + '.json')).json()).profiles));
    let saved = null;
    const Store = createStore({ persistence: { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }, storage: null });
    await Store.ready;
    await Store.addParticipant(buildParticipantFromBestiary('E0-P-593', { library: books.flat(), zone: 'bench' }));
    const handlers = new Map();
    initWorkspaceView({ Store, Bus: { on(event, fn) { handlers.set(event, fn); } }, mount: document.querySelector('#mount'), actions: { enterParticipant() {} } });
  }, { base: `http://127.0.0.1:${port}` });

  await page.getByRole('tab', { name: 'Jouer' }).click();
  const bench = page.locator('.workspace-bench');
  check(await bench.count() === 1, 'la rubrique « En attente » est affichée');
  // Les rappels de Traits (Régénération, Increvable, Infecté : T3/T8, 23/10) s'ajoutent à celui de l'armure : on cible l'armure.
  const armour = bench.locator('.actor-reminder', { hasText: 'Armure imprimée' });
  check(await armour.count() === 1, 'le rappel d’armure du participant au banc est affiché');
  check(/Armure imprimée/.test(await armour.first().innerText()), 'le texte est celui du rappel d’armure');
  await armour.locator('.btn-reminder[data-decision="resolve"]').click();
  await page.locator('.workspace-bench .actor-reminder', { hasText: 'Armure imprimée' }).first().waitFor({ state: 'detached' });
  check(await page.locator('.workspace-bench .actor-reminder', { hasText: 'Armure imprimée' }).count() === 0, '« Fait » retire le rappel d’armure');
  check(pageErrors.length === 0, 'aucune erreur de page (' + (pageErrors[0] || 'rien') + ')');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (failures.length) { console.error(failures.length + ' contrôle(s) en échec.'); process.exit(1); }
console.log('pro-q31-banc-rappels-ui-browser : tous les contrôles sont au vert.');
