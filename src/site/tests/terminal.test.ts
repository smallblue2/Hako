import { expect, test } from '@playwright/test';
import { showConsole, waitCustom, clickTaskbar } from "./helpers";

async function openTerminal(page) {
  await clickTaskbar(page, "terminal");
  const prompt = page.getByText("$", { exact: true });
  await prompt.waitFor();
}

test('Terminal closes on Ctrl-D', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await openTerminal(page);

  await page.click("#window-0"); // focus the terminal
  await page.keyboard.press("Control+D");

  const terminal = page.locator("#window-0");
  await terminal.waitFor({ state: "detached" });
});

test('Terminal closes on Ctrl-C', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await openTerminal(page);

  await page.click("#window-0"); // focus the terminal
  await page.keyboard.press("Control+C");

  const terminal = page.locator("#window-0");
  await terminal.waitFor({ state: "detached" });
});
