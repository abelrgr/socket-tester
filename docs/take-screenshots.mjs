/**
 * Playwright screenshot script for socket-tester USER_GUIDE.md
 * Run: node docs/take-screenshots.mjs
 *
 * Prerequisites:
 *   - socket-tester running on http://localhost:3000
 *   - (optional) socket-server running on ws://localhost:4500
 *   - Playwright installed: npx playwright install chromium
 */

import { chromium } from 'playwright';
import { mkdir, unlink } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, 'screenshots');
const BASE = 'http://localhost:3000';

await mkdir(DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const shot = async (name) => {
  const tmp = join(DIR, `${name}.png`);
  const out = join(DIR, `${name}.webp`);
  await page.screenshot({ path: tmp, type: 'png' });
  await execFileAsync('cwebp', ['-q', '90', tmp, '-o', out]);
  await unlink(tmp);
  console.log(`  [ok] ${name}.webp`);
};
const wait = (ms) => page.waitForTimeout(ms);

console.log('Starting screenshot capture...\n');

// 01 — Main interface on first load
await page.goto(BASE, { waitUntil: 'networkidle' });
await wait(600);
await shot('01-main-interface');

// 02 — Socket.IO panel
await page.locator('text=Socket.io').click();
await wait(300);
await shot('02-socketio-panel');

// 03 — MQTT panel
await page.locator('text=MQTT').click();
await wait(300);
await shot('03-mqtt-panel');

// 04 — WebSocket panel with URL pre-filled
await page.locator('text=WebSocket').click();
await wait(300);
await page.locator('input').first().fill('ws://localhost:4500');
await wait(200);
await shot('04-websocket-url-filled');

// 05 — Command palette (Ctrl+K)
await page.keyboard.press('Control+k');
await wait(400);
await shot('05-command-palette');
await page.keyboard.press('Escape');
await wait(200);

// 06 — Built-in docs page
await page.locator('text=Docs').click();
await wait(700);
await shot('06-docs-page');

// 07 — Stats tab (idle)
await page.goto(BASE, { waitUntil: 'networkidle' });
await wait(500);
await page.locator('text=Stats').first().click();
await wait(300);
await shot('07-stats-tab');

// 08 — Logs tab (idle)
await page.locator('text=Logs').first().click();
await wait(300);
await shot('08-logs-tab');

// 09 — Performance tab (idle)
await page.locator('text=Performance').first().click();
await wait(300);
await shot('09-performance-tab');

// 11 — Multi-tab view
await page.goto(BASE, { waitUntil: 'networkidle' });
await wait(400);
await page.keyboard.press('Control+n');
await wait(300);
await page.locator('text=Socket.io').first().click();
await wait(300);
await shot('11-new-tab');

// 18 — MQTT panel with broker URL filled
await page.goto(BASE, { waitUntil: 'networkidle' });
await wait(400);
await page.locator('text=MQTT').click();
await wait(300);
await page.locator('input').first().fill('mqtt://localhost:1883');
await wait(200);
await shot('18-mqtt-panel-filled');

// Live connection screenshots (requires socket-server on ws://localhost:4500)
await page.goto(BASE, { waitUntil: 'networkidle' });
await wait(400);
await page.locator('text=WebSocket').click();
await wait(200);
await page.locator('input').first().fill('ws://localhost:4500');
await page.locator('button:has-text("Connect")').first().click();
await wait(2000);

// 12 — Connected state with welcome message
await shot('12-connected-state');

// 13 — Message sent and echo received
const composer = page.locator('textarea').first();
if (await composer.isVisible({ timeout: 1000 })) {
  await composer.fill('{"hello": "socket-tester"}');
  await wait(200);
  await page.keyboard.press('Control+Enter');
  await wait(1000);
}
await shot('13-message-sent');

// 14 — Stats tab while connected
await page.locator('text=Stats').first().click();
await wait(500);
await shot('14-stats-connected');

// 15 — Logs tab while connected
await page.locator('text=Logs').first().click();
await wait(400);
await shot('15-logs-connected');

// 16 — Performance panel while connected
await page.locator('text=Performance').first().click();
await wait(400);
await shot('16-performance-panel');

// 17 — Messages view while connected (full)
await page.locator('text=Messages').first().click();
await wait(400);
await shot('17-messages-full');

// 19 — Network simulation panel (expanded automatically when connected)
const netSim = page.locator('text=NETWORK SIMULATION');
if (await netSim.isVisible({ timeout: 2000 })) {
  await netSim.scrollIntoViewIfNeeded();
  await wait(300);
}
await shot('19-network-simulation');

// 20 — Save config dialog
await page.locator('button:has-text("Save Config"), text=Save Config').first().click().catch(() => {});
await wait(500);
await shot('20-save-config');

// 21 — Multi-tab while one connection is live
await page.keyboard.press('Control+n');
await wait(300);
await page.locator('text=Socket.io').first().click();
await wait(300);
await shot('21-multi-tab');

await browser.close();

console.log(`\nAll screenshots saved to ${DIR}`);
