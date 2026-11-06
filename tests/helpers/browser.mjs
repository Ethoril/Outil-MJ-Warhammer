import { chromium } from 'playwright';

// Seul endroit qui choisit le navigateur des tests : PLAYWRIGHT_EXECUTABLE_PATH
// s'il est défini, sinon Chrome (macOS) ou Edge (Windows/Linux) via le canal Playwright.
export function launchBrowser(options = {}) {
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  if (executablePath) return chromium.launch({ headless: true, ...options, executablePath });
  return chromium.launch({ channel: process.platform === 'darwin' ? 'chrome' : 'msedge', headless: true, ...options });
}
