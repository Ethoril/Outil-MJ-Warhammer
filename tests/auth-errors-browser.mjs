/** Exercise actual sync.loginWithGoogle against isolated SDK failures; no account or remote writes. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  try {
    const route = new URL(req.url, 'http://localhost').pathname;
    if (route === '/auth-harness.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><meta charset="utf-8"><button id="login" data-google-login>Connexion Google</button><div id="login-screen"></div><div id="app-content"></div><div id="user-info"></div>'); return;
    }
    const path = resolve(root, '.' + route);
    assert.ok(path.startsWith(resolve(root) + sep) && statSync(path).isFile());
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' }); res.end(readFileSync(path));
  } catch { res.writeHead(404); res.end('Not found'); }
});
let browser;
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
  const scenarios = [
    { code: 'auth/popup-blocked', expected: 'fenêtre Google a été bloquée' },
    { code: 'auth/popup-closed-by-user', expected: 'fermée avant la fin' },
    { code: 'auth/network-request-failed', expected: 'requête de connexion' },
    { code: 'auth/web-storage-unsupported', expected: 'stockage nécessaire' },
    { code: 'auth/unauthorized-domain', expected: 'domaine n’est pas autorisé' },
    { code: 'auth/internal-error', expected: 'initialisation', synchronous: true },
    { code: 'auth/not-initialized', expected: 'pas encore disponible', uninitialized: true },
    { code: 'unsafe-email@example.test', displayedCode: 'auth/unknown', expected: 'connexion Google a échoué' }
  ];
  for (const scenario of scenarios) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    await context.route('**/vendor/firebase/firebase-app.js', route => route.fulfill({ contentType: 'text/javascript', body: `export const initializeApp=()=>{${scenario.uninitialized ? "throw Error('SDK initialization fixture');" : 'return {};'}};` }));
    await context.route('**/vendor/firebase/firebase-database.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const getDatabase=()=>({}),ref=()=>({}),get=()=>{},runTransaction=()=>{},onValue=()=>{},set=()=>{},update=()=>{};' }));
    await context.route('**/vendor/firebase/firebase-auth.js', route => route.fulfill({ contentType: 'text/javascript', body: `
      export class GoogleAuthProvider {}
      export const getAuth=()=>({}), signOut=()=>Promise.resolve();
      export const onAuthStateChanged=(auth,callback)=>{queueMicrotask(()=>callback(null));return ()=>{};};
      export const signInWithPopup=()=>{
        window.sdkCalls=(window.sdkCalls||0)+1;
        window.sdkActivation=navigator.userActivation.isActive;
        const error=Object.assign(Error('secret-email@example.test secret-token'),{code:${JSON.stringify(scenario.code)},customData:{email:'secret-email@example.test',credential:'secret-token'}});
        ${scenario.synchronous ? 'throw error;' : 'return Promise.reject(error);'}
      };
    ` }));
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/auth-harness.html');
    await page.evaluate(async uninitialized => {
      localStorage.setItem('qa-local-data', 'retain this data');
      const sdk = await import('/js/core/sync.js');
      sdk.initFirebaseSync();
      // Initialization failure prevents binding; invoke the same exported action to cover its guard.
      if (uninitialized) document.querySelector('#login').addEventListener('click', () => sdk.loginWithGoogle());
    }, !!scenario.uninitialized);
    const dialogPromise = page.waitForEvent('dialog');
    const clicked = page.locator('#login').click();
    const dialog = await dialogPromise, message = dialog.message();
    assert.ok(message.includes(scenario.expected), message);
    assert.ok(message.endsWith(`Code : ${scenario.displayedCode || scenario.code}`), message);
    assert.ok(!message.includes('secret-email') && !message.includes('secret-token') && !message.includes('unsafe-email'));
    await dialog.accept();
    await clicked;
    assert.equal(await page.evaluate(() => localStorage.getItem('qa-local-data')), 'retain this data');
    assert.equal(await page.evaluate(() => window.sdkCalls || 0), scenario.uninitialized ? 0 : 1);
    if (!scenario.uninitialized) assert.equal(await page.evaluate(() => window.sdkActivation), true, 'SDK called during actual click activation');
    assert.deepEqual(errors, [], 'no unhandled rejected promise');
    await context.close();
    console.log(`Connexion Google : ${scenario.displayedCode || scenario.code} affiché, données conservées.`);
  }
} finally { await browser?.close(); await new Promise(done => server.close(done)); }
