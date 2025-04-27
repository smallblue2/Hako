import { expect, test } from '@playwright/test';
import { showConsole, waitCustom, clickTaskbar } from "./helpers";

test('Open terminal', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await clickTaskbar(page, "terminal");

  const terminal = page.locator("#window-0");
  await terminal.waitFor({ state: "attached" });
});

test('Close terminal', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await clickTaskbar(page, "terminal");

  await page.waitForSelector("#close-0");
  await page.click("#close-0");

  const terminal = page.locator("#window-0");
  await terminal.waitFor({ state: "detached" });
});

test('Open file manager', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await clickTaskbar(page, "file-manager");

  const fileManager = page.locator("#window-0");
  await fileManager.waitFor({ state: "attached" });
});

test('Close file manager', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await clickTaskbar(page, "file-manager");

  await page.waitForSelector("#close-0");
  await page.click("#close-0");

  const fileManager = page.locator("#window-0");
  await fileManager.waitFor({ state: "detached" });
});

test('Open editor', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await clickTaskbar(page, "editor");

  const editor = page.locator("#window-0");
  await editor.waitFor({ state: "attached" });
});

test('Open editor file dialog', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await clickTaskbar(page, "editor");

  const editor = page.locator("#window-0");
  await editor.waitFor({ state: "attached" });

  // Click select file button and check that 
  await page.click('button:text("Select file")');

  // Editor by default opens file dialog
  const fileManager = page.locator("#window-1");
  await fileManager.waitFor({ state: "attached" });
});

test('Cancel editor', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await clickTaskbar(page, "editor");

  await page.waitForSelector("#close-0");
  await page.keyboard.press("Escape");

  const editor = page.locator("#window-0");
  await editor.waitFor({ state: "detached" });
});

test('Open manual', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await clickTaskbar(page, "manual");

  const manual = page.locator("#window-0");
  await manual.waitFor({ state: "attached" });
});

test('Close manual', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await clickTaskbar(page, "manual");

  await page.waitForSelector("#close-0");
  await page.click("#close-0");

  const manual = page.locator("#window-0");
  await manual.waitFor({ state: "detached" });
});

test('Open terminal creates runtime', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await clickTaskbar(page, "terminal");

  expect(await page.evaluate(async () => {
    return new Promise((resolve, _reject) => {
      document.addEventListener("new-runtime", () => {
        resolve(true);
      })
    })
  })).toBe(true);
});
