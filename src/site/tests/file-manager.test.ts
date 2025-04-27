import { expect, test } from '@playwright/test';
import { showConsole, waitCustom, clickTaskbar } from "./helpers";

async function openFileManager(page) {
  await clickTaskbar(page, "file-manager");
  const fileManager = page.locator("#window-0");
  await fileManager.waitFor({ state: "attached" });
}

test('Create file', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await openFileManager(page);

  const fileManager = page.locator('#window-0');
  const boundingBox = await fileManager.boundingBox();

  if (boundingBox) {
    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;
    await page.mouse.click(centerX, centerY, { button: 'right' });
  }

  await page.click('div:text("New File")');
  await page.keyboard.insertText("MyFile");
  await page.keyboard.press("Enter");

  // Check that the file is visible in the file manager
  expect(page.locator('p:text("MyFile")')).toBeAttached();

  // Check that the file is created in the filesystem
  expect(await page.evaluate(async () => {
    let { entries } = window.Filesystem.read_dir("/persistent");
    return entries.includes("MyFile");
  })).toBe(true);
});

test('Delete file', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await openFileManager(page);

  // Create a dummy file
  expect(await page.evaluate(async () => {
    let { fd, error } = window.Filesystem.open("/persistent/MyFile", "c");
    if (error !== null) return error;
    ({ error } = window.Filesystem.close(fd));
    if (error !== null) return error;
    // send inotify event so file manager updates;
    let channel = new BroadcastChannel("inotify");
    channel.postMessage({});
    channel.close();
    return ""
  })).toEqual("");

  // File be present automatically as file manager listens on inotify broadcast channel
  const newFile = page.locator('p:text("MyFile")');
  await newFile.click({ button: "right" });
  await page.click('div:text("Delete File")');

  // Make sure it is no longer present in ui and filesystem
  expect(page.locator('button:text("MyFile")')).not.toBeAttached();
  expect(await page.evaluate(async () => {
    let { entries } = window.Filesystem.read_dir("/persistent");
    return entries.includes("MyFile");
  })).toEqual(false);
});

test('Create directory', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await openFileManager(page);

  const fileManager = page.locator('#window-0');
  const boundingBox = await fileManager.boundingBox();

  if (boundingBox) {
    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;
    await page.mouse.click(centerX, centerY, { button: 'right' });
  }

  await page.click('div:text("Create Directory")');
  await page.keyboard.insertText("MyDir");
  await page.keyboard.press("Enter");

  // Check that the file is visible in the file manager
  expect(page.locator('p:text("MyDir")')).toBeAttached();

  // Check that the dir is created in the filesystem
  expect(await page.evaluate(async () => {
    let { entries } = window.Filesystem.read_dir("/persistent");
    return entries.includes("MyDir");
  })).toBe(true);
});

test('Delete directory', async ({ page }) => {
  showConsole(page);
	await page.goto('/');

  await waitCustom(page, "loaded");
  await openFileManager(page);

  // Create a dummy Directory
  expect(await page.evaluate(async () => {
    let { error } = window.Filesystem.make_dir("/persistent/MyDir");
    if (error !== null) return error;
    // send inotify event so file manager updates;
    let channel = new BroadcastChannel("inotify");
    channel.postMessage({});
    channel.close();
    return ""
  })).toEqual("");

  // Directory be present automatically as file manager listens on inotify broadcast channel
  const newFile = page.locator('p:text("MyDir")');
  await newFile.click({ button: "right" });
  await page.click('div:text("Delete Directory")');

  // Make sure it is no longer present in ui and filesystem
  expect(page.locator('button:text("MyDir")')).not.toBeAttached();
  expect(await page.evaluate(async () => {
    let { entries } = window.Filesystem.read_dir("/persistent");
    return entries.includes("MyDir");
  })).toEqual(false);
});
