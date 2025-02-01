import puppeteer from 'puppeteer';
import assert from 'node:assert';

// Function asynchronously blocks on a function that returns a condition (conditionFn)
// or until the timeout is up.
//
// This is for waiting on a global variable to be set to true, suggesting we can begin
// testing the filesystem.
async function waitForCondition(conditionFn, interval = 5, timeout = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const result = await conditionFn();
        if (result) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - start > timeout) {
          clearInterval(timer);
          reject(new Error('Condition not met within timeout'));
        }
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, interval);
  });
}

// All filesystem tests
describe("Filesystem tests", () => {
  // Puppeteer browser
  let browser;
  // The page instance used in tests (unique to each test)
  let page;

  // Initialises the filesystem given a page instance
  let initFS = async (pg) => {
    pg.evaluate(async () => {
      window.Filesystem.initialiseFS();
      await (async (resolve) => { setTimeout(resolve, 3000) })(); // Empirically 3 seconds chosen to allow filesystem to initialise
    })
  };

  // Before all tests, launch a puppeteer instance
  before(async () => {
    // Incognito launch as these tests are ran in Parallel
    // and we need IndexedDB instances to be completely
    // isolated, which is quite tricky. Incognito browser
    // instance is the easiest way to do this.
    browser = await puppeteer.launch({
      args: [
        "--incognito",
        "--no-sandbox" // Needed due to being ran as root in docker container
      ]
    });
  });

  // After all tests, close the puppeteer browser instance
  after(async () => {
    await browser.close();
  });

  // Before each test, create a new page, navigate to the correct page, and
  // wait for the filesystem to be initialised
  beforeEach(async () => {
    page = await browser.newPage();
    const appPath = "http://localhost:8080/index.html";
    await page.goto(appPath);

    await waitForCondition(async () => {
      return await page.evaluate(() => window.isFilesystemInitialised === true);
    });
  });

  // After each test, close the page
  afterEach(async () => {
    await page.close();
  });

  it("Check whether Filesystem object exists on the window object", async () => {
    // TODO: This is just here to keep the linter happy before we write more
    //       tests using initFS! Remove it after!
    initFS();

    const hasFilesystem = await page.evaluate(() => {
      return typeof window.Filesystem !== "undefined";
    });

    assert.strictEqual(hasFilesystem, true, "Filesystem should exist on the window object");
  });
});
