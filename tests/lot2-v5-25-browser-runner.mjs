/** Local delivery receipt. Each script closes its own browser and server. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from '../js/version.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'tmp/lot2-25');
mkdirSync(output, { recursive: true });
const scripts = [
  'lot2-combat-v5-browser.mjs',
  'lot2-v5-23-browser.mjs',
  'lot2-v5-23-control-browser.mjs',
  'lot2-v5-24-control-browser.mjs',
  'lot2-v5-remaining-talents-browser.mjs',
  'fiches-pj-browser.mjs',
  'browser-references-smoke.mjs',
  'browser-startup.mjs',
  'lot1-pwa-sessions-browser.mjs',
  'browser-smoke.mjs'
];
const results = [];
for (const script of scripts) {
  const log = resolve(output, script.replace('.mjs', '.log'));
  const stream = createWriteStream(log);
  const code = await new Promise((done, reject) => {
    const child = spawn(process.execPath, [resolve(root, 'tests', script)], {
      cwd: root, windowsHide: true,
      env: { ...process.env, ...(process.platform === 'win32' ? { PLAYWRIGHT_EXECUTABLE_PATH: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' } : {}) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.pipe(stream, { end: false }); child.stderr.pipe(stream, { end: false });
    child.once('error', reject);
    child.once('close', exit => stream.end(() => done(exit)));
  });
  results.push({ script, code, log });
  writeFileSync(resolve(output, 'browser-receipt.json'), JSON.stringify({ appVersion: APP_VERSION, results }, null, 2));
  console.log(`${code === 0 ? 'PASS' : 'FAIL'} — ${script}`);
  if (code !== 0) { process.exitCode = 1; console.log(`Inspect ${log}`); break; }
}
