import { launchBrowser } from './browser.mjs';
import { startStaticServer, blockExternalNetwork } from './static-server.mjs';

// Démarre index.html (Firebase remplacé au niveau du module) pour les parcours du lot 4, sous-lot C-a.
export async function startApp() {
  const { server, port } = await startStaticServer();
  const browser = await launchBrowser();
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('dialog', dialog => dialog.accept());
  await blockExternalNetwork(page, server);
  await page.route('**/js/core/sync.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    export function initFirebaseSync(onConnected) {
      document.querySelector('#login-screen')?.style.setProperty('display', 'none');
      document.querySelector('#app-content')?.style.setProperty('display', 'block');
      onConnected({ dbRef: 'isolated-test', onValue() {}, update() { return Promise.resolve(); } });
    }` }));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.locator('#app-content').waitFor({ state: 'visible' });
  return { page, errors, close: async () => { await browser.close(); server.close(); } };
}

export async function openNewProfileForm(page) {
  await page.locator('#tab-prepare').click();
  await page.locator('#workspace-prepare').getByRole('button', { name: 'Nouveau profil' }).click();
  const form = page.locator('#form-add');
  await form.waitFor({ state: 'visible' });
  return form;
}
