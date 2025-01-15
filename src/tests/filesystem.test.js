const puppeteer = require('puppeteer');
const assert = require('assert');

async function waitForCondition(conditionFn, interval = 100, timeout = 5000) {
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

describe("Filesystem tests", () => {
  let browser;
  let page;

  let initFS = async (pg) => {
    pg.evaluate(async () => {
      window.Filesystem.initialiseFS();
      await (async (resolve) => { setTimeout(resolve, 3000) })(); // Empirically 3 seconds chosen to allow filesystem to initialise
    })
  };

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

  after(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    const appPath = "http://localhost:8080/index.html";
    await page.goto(appPath);

    await waitForCondition(async () => {
      return await page.evaluate(() => window.isFilesystemInitialised === true);
    });
  });

  afterEach(async () => {
    await page.close();
  });

  it("Check whether Filesystem object exists on the window object", async () => {
    const hasFilesystem = await page.evaluate(() => {
      return typeof window.Filesystem !== "undefined";
    });

    assert.strictEqual(hasFilesystem, true, "Filesystem should exist on the window object");
  });

  it("Check valid initialisation of the filesystem", async () => {

    await initFS(page);

    let persistentVolumeExists = await page.evaluate(async () => {
      return window.Filesystem.access("persistent", window.Filesystem.F_OK) == 0;
    });

    assert.ok(persistentVolumeExists);
  });

  it("Confirm lack of persistence due to incognito tab", async () => {
    const persistentVolumeExists = await page.evaluate(async () => {
      return window.Filesystem.access("persistent", window.Filesystem.F_OK) == -1;
    })

    assert.ok(persistentVolumeExists);
  });

  it("Test `chdir`", async () => {

    await initFS(page);

    let origStat = await page.evaluate(async () => {
      return window.Filesystem.stat("persistent")
    });

    let chdirRes = await page.evaluate(async () => {
      return window.Filesystem.chdir("persistent") == 0;
    });

    let newStat = await page.evaluate(async () => {
      return window.Filesystem.stat(".");
    });

    assert.ok(chdirRes);
    assert.deepStrictEqual(origStat, newStat, "Stats are not equal, suggesting an incorrect chdir.");
  })

  it("Test creating a file with `open` and closing it with `close`", async () => {

    await initFS(page);

    let { notExistBefore, fd, closeRes, accessRes } = await page.evaluate(async () => {
      let notExistBefore = window.Filesystem.access("persistent/hello.txt", window.Filesystem.F_OK) == -1;
      let fd = window.Filesystem.open("persistent/hello.txt", window.Filesystem.O_CREAT, 0o333);
      let closeRes = window.Filesystem.close(fd) == 0;
      let accessRes = window.Filesystem.access("persistent/hello.txt", window.Filesystem.F_OK) == 0;
      return { notExistBefore, fd, closeRes, accessRes }
    });

    assert.ok(notExistBefore, "File existed before test when it shouldn't");
    assert.ok(fd >= 0, "Invalid file descriptor");
    assert.ok(closeRes, "Couldn't close file descriptor");
    assert.ok(accessRes, "File access failed after its creation");

  })

  it("Test `mkdir`", async () => {

    await initFS(page);

    let { accessResp, mkdirResp } = await page.evaluate(async () => {
      let mkdirResp = window.Filesystem.mkdir("persistent/testdir") == 0;
      let accessResp = window.Filesystem.access("persistent/testdir", window.Filesystem.F_OK) == 0;
      return { accessResp, mkdirResp }
    });

    assert.ok(mkdirResp, "Failed to create directory");
    assert.ok(accessResp, "Seems like directory doesn't exist");

  });

  it("Test `rmdir`", async () => {

    await initFS(page);

    let { mkdirResp, confirmCreat, rmdirResp, confirmDel } = await page.evaluate(async () => {
      let mkdirResp = window.Filesystem.mkdir("persistent/testdir") == 0;
      let confirmCreat = window.Filesystem.access("persistent/testdir", window.Filesystem.F_OK) == 0;
      let rmdirResp = window.Filesystem.rmdir("persistent/testdir") == 0;
      let confirmDel = window.Filesystem.access("persistent/testdir", window.Filesystem.F_OK) == -1;
      return { mkdirResp, confirmCreat, rmdirResp, confirmDel }
    });

    assert.ok(mkdirResp, "Failed to create directory to delete");
    assert.ok(confirmCreat, "Failed to confirm the creation of directory to delete");
    assert.ok(rmdirResp, "Failed to remove directory");
    assert.ok(confirmDel, "Directory still exists despite deletion");

  });

  it("Test `opendir`, `readdir` and `closedir`", async () => {

    await initFS(page);

    let { dd, readRes, closeRes } = await page.evaluate(async () => {
      let dd = window.Filesystem.opendir(".");
      let readRes = window.Filesystem.readdir(dd);
      let closeRes = window.Filesystem.closedir(dd) == 0;
      return { dd, readRes, closeRes }
    });

    assert.ok(dd >= 0, "Invalid directory descriptor when opening");
    assert.ok(readRes.length > 0, "Opened directory was empty, expected non-empty");
    assert.ok(closeRes, "Failed to close directory");
    
  });

  it("Test `read` and `write`", async () => {

    await initFS(page);

    let { fd, bytesWritten0, readRes0, lseekRes0, bytesWritten1, lseekRes1, readRes1 } = await page.evaluate(async () => {
      let fd = window.Filesystem.open("persistent/random.txt", Filesystem.O_CREAT | Filesystem.O_RDWR, 0o777);
      // 4
      let bytesWritten0 = window.Filesystem.write(fd, "this is a test");
      // 14
      let readRes0 = window.Filesystem.read(fd, 14);
      // Object { data: "", size: 0 }
      let lseekRes0 = window.Filesystem.lseek(fd, 0, 0) == 0;
      // 0
      let bytesWritten1 = window.Filesystem.write(fd, 14);
      // 2
      let lseekRes1 = window.Filesystem.lseek(fd, 0, 0) == 0;
      // 0
      let readRes1 = window.Filesystem.read(fd, 14)
      // Object { data: "14is is a test", size: 14 }
      return { fd, bytesWritten0, readRes0, lseekRes0, bytesWritten1, lseekRes1, readRes1 }
    })

    assert.ok(fd >= 0, "File couldn't be opened (O_CREAT | O_RDRW)");
    assert.ok(bytesWritten0 == 14, `Failed to write expected bytes in first write. Expected 14, got ${bytesWritten0}`);
    assert.ok(readRes0.size == 0, "First read result should have been empty but wasn't");
    assert.ok(lseekRes0, "Failed first move file pointer to start of file with lseek");
    assert.ok(bytesWritten1, `Failed to write expected bytes in second write. Expected 2, got ${bytesWritten1}`);
    assert.ok(lseekRes1, "Failed second move file pointer to start of file with lseek");
    assert.strictEqual(readRes1.data, "14is is a test");
  });
});
