const puppeteer = require('puppeteer');
const assert = require('assert');

// Function asynchronously blocks on a function that returns a condition (conditionFn)
// or until the timeout is up.
//
// This is for waiting on a global variable to be set to true, suggesting we can begin
// testing the filesystem.
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

  // Change directory and compare stats based on relative paths
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

  it("Test `read`,`write` and `lseek`", async () => {

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

  it("Test `unlink`", async () => {

    await initFS(page);

    let { fd, closeRes, unlinkRes, confirmDel } = await page.evaluate(async () => {
      let fd = window.Filesystem.open("persistent/deleteme", Filesystem.O_CREAT, 0o777);
      let closeRes = window.Filesystem.close(fd) == 0;
      let unlinkRes = window.Filesystem.unlink("persistent/deleteme") == 0;
      let confirmDel = window.Filesystem.access("persistent/deleteme", window.Filesystem.F_OK) == -1;
      return { fd, closeRes, unlinkRes, confirmDel }
    })

    assert.ok(fd >= 0, "Failed to create file with open");
    assert.ok(closeRes, "Failed to close open file");
    assert.ok(unlinkRes, "Failed to unlink created file");
    assert.ok(confirmDel, "The file still exists after unlinking");

  });

  it("Test `rename`", async () => {

    await initFS(page);

    let { fd, closeRes, renameRes, checkOldGone, checkNewExists } = await page.evaluate(async () => {
      let fd = window.Filesystem.open("persistent/renameme", Filesystem.O_CREAT, 0o777);
      let closeRes = window.Filesystem.close(fd) == 0;
      let renameRes = window.Filesystem.rename("persistent/renameme", "persistent/moved") == 0;
      let checkOldGone = window.Filesystem.access("persistent/renameme", window.Filesystem.F_OK) == -1;
      let checkNewExists = window.Filesystem.access("persistent/moved", window.Filesystem.F_OK) == 0;
      return { fd, closeRes, renameRes, checkOldGone, checkNewExists };
    });

    assert.ok(fd >= 0, "Failed to open file");
    assert.ok(closeRes, "Failed to close file descriptor");
    assert.ok(renameRes, "Failed to rename file");
    assert.ok(checkOldGone, "Old file still exists after rename");
    assert.ok(checkNewExists, "New file doesn't exist after rename");
  })

  it("Test `stat`", async () => {

    await initFS(page);

    let stat = await page.evaluate(async () => {
      return window.Filesystem.stat("persistent");
    })

    assert.ok(stat.size == 4096, `Was expecting directory to be 4096 bytes, got ${stat.size}`);
    assert.ok(stat.blocks == 1, `Was expecting blocks to be 1, got ${stat.blocks}`);
    assert.ok(stat.ino > 0, `Was expecting the inode to be > 0, got ${stat.ino}`);
    assert.ok((stat.mode & 0o170000) == 0o040000, `Mode is incorrect, it should represent a directory 0o040000, got ${(stat.mode & 0o170000).toString(2)}`);
    assert.ok((stat.mode & 0o777) == 0b111111111, `Mode is incorrect, permissions should be 0b111111111, got ${(stat.mode & 0o777).toString(2)}`);
    assert.ok(stat.nlink == 1, `Incorrect link, expected 1, got ${stat.nlink}`);
  })

  it("Test `chmod`", async () => {

    await initFS(page);

    let { fd, closeRes, statOne, chmodRes, statTwo } = await page.evaluate(async () => {
      let fd = await window.Filesystem.open("persistent/changemymode", window.Filesystem.O_CREAT, 0o777);
      let closeRes = await window.Filesystem.close(fd) == 0;
      let statOne = await window.Filesystem.stat("persistent/changemymode");
      let chmodRes = await window.Filesystem.chmod("persistent/changemymode", 0b001010011) == 0;
      let statTwo = await window.Filesystem.stat("persistent/changemymode");
      return { fd, closeRes, statOne, chmodRes, statTwo };
    });

    assert.ok(fd >= 0, "Invalid file descriptor when creating a file");
    assert.ok(closeRes, "Failed to close file descriptor");
    assert.ok((statOne.mode & 0b111111111) == 0b111111111, `File was created with incorrect permissions. Expected 0b111111111, got ${(statOne.mode & 0b111111111).toString(2)}`)
    assert.ok(chmodRes, "Failed to change mode of file");
    assert.ok((statTwo.mode & 0b111111111) == 0b001010011, `Mode not correct after change, expected 0b001010011, got ${(statTwo.mode & 0b111111111).toString(2)}`);
  })

  it("Test `utime`", async () => {
    await initFS(page);

    let { fd, closeRes, statBefore, utimeRes, statAfter } = await page.evaluate(async () => {
      let fd = window.Filesystem.open("persistent/utimefile", window.Filesystem.O_CREAT, 0o777);
      let closeRes = window.Filesystem.close(fd) == 0;

      let statBefore = window.Filesystem.stat("persistent/utimefile");

      const newAtime = statBefore.atime.sec + 1000; // Increment access time by 1000 seconds
      const newMtime = statBefore.mtime.sec + 2000; // Increment modification time by 2000 seconds
      let utimeRes = window.Filesystem.utime("persistent/utimefile", newAtime, newMtime) == 0;

      // Get the updated stats
      let statAfter = window.Filesystem.stat("persistent/utimefile");

      return { fd, closeRes, statBefore, utimeRes, statAfter };
    });

    assert.ok(fd >= 0, "Invalid file descriptor when creating file");
    assert.ok(closeRes, "Failed to close file descriptor");
    assert.ok(utimeRes, "Failed to update atime and mtime using utime");

    // Check if atime and mtime were updated correctly
    assert.ok(
      statAfter.atime.sec === statBefore.atime.sec + 1000,
      `Access time (atime) was not updated correctly. Expected ${statBefore.atime.sec + 1000
      }, got ${statAfter.atime.sec}`
    );
    assert.ok(
      statAfter.mtime.sec === statBefore.mtime.sec + 2000,
      `Modification time (mtime) was not updated correctly. Expected ${statBefore.mtime.sec + 2000
      }, got ${statAfter.mtime.sec}`
    );
  });

  it("Test `cp`", async () => {
    await initFS(page);

    let { createRes, writeRes, cpRes, srcStat, destStat, destContents } = await page.evaluate(async () => {
      // Create a source file
      let fd = window.Filesystem.open("persistent/source.txt", window.Filesystem.O_CREAT | window.Filesystem.O_WRONLY, 0o777);
      let writeRes = window.Filesystem.write(fd, "This is a test file.");
      let createRes = window.Filesystem.close(fd) == 0;

      // Copy the file
      let cpRes = window.Filesystem.cp("persistent/source.txt", "persistent/destination.txt") == 0;

      // Stat both files
      let srcStat = window.Filesystem.stat("persistent/source.txt");
      let destStat = window.Filesystem.stat("persistent/destination.txt");

      // Read destination file contents
      let fdDest = window.Filesystem.open("persistent/destination.txt", window.Filesystem.O_RDONLY, 0);
      let destContents = window.Filesystem.read(fdDest, destStat.size).data;
      window.Filesystem.close(fdDest);

      return { createRes, writeRes, cpRes, srcStat, destStat, destContents };
    });

    assert.ok(createRes, "Failed to create source file");
    assert.ok(writeRes > 0, "Failed to write to source file");
    assert.ok(cpRes, "Failed to copy file using `cp`");

    assert.strictEqual(srcStat.size, destStat.size, "Source and destination sizes do not match");

    // Verify file contents
    assert.strictEqual(destContents, "This is a test file.", "Destination file contents do not match source file contents");
  });

  it("Test `ftruncate`", async () => {
    await initFS(page);

    let { fd, writeRes, ftruncateRes, statAfterTruncate, fileContents, lseekRes } = await page.evaluate(async () => {
      // Create and write to a file
      let fd = window.Filesystem.open("persistent/truncatefile", window.Filesystem.O_CREAT | window.Filesystem.O_RDWR, 0o777);
      let writeRes = window.Filesystem.write(fd, "This is a test file with extra content.");

      // Truncate the file to a smaller size
      let ftruncateRes = window.Filesystem.ftruncate(fd, 14) == 0;

      // Get the file's stats after truncation
      let statAfterTruncate = window.Filesystem.stat("persistent/truncatefile");

      // Read the file's contents after truncation
      let lseekRes = window.Filesystem.lseek(fd, 0, 0) == 0;
      let fileContents = window.Filesystem.read(fd, statAfterTruncate.size).data;

      window.Filesystem.close(fd);
      return { fd, writeRes, ftruncateRes, statAfterTruncate, fileContents, lseekRes };
    });

    assert.ok(fd >= 0, "Failed to open file descriptor");
    assert.ok(writeRes > 0, "Failed to write to file");
    assert.ok(ftruncateRes, "Failed to truncate file");

    // Verify the file size after truncation
    assert.strictEqual(statAfterTruncate.size, 14, `File size after truncation should be 14 bytes, got ${statAfterTruncate.size}`);
    assert.ok(lseekRes, "Failed to seek back to the start of the file");

    // Ensure strings are correct
    assert.strictEqual(fileContents, "This is a test", `File contents after truncation do not match expected value. Got ${fileContents}`);
  });
});
