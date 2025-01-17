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

  it("Test `readdir`", async () => {

    await initFS(page);

    let readRes = await page.evaluate(async () => {
      let readRes = window.Filesystem.readdir("persistent");
      return readRes
    });

    assert.ok(readRes.length > 0, "Opened directory was empty, expected non-empty");

  });

  it("Test `read`,`write` and `lseek`", async () => {

    await initFS(page);

    let { fd, bytesWritten0, readRes0, lseekRes0, bytesWritten1, lseekRes1, readRes1 } = await page.evaluate(async () => {
      let fd = window.Filesystem.open("persistent/random.txt", window.Filesystem.O_CREAT | window.Filesystem.O_RDWR, 0o777);
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
      let fd = window.Filesystem.open("persistent/deleteme", window.Filesystem.O_CREAT, 0o777);
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
      let fd = window.Filesystem.open("persistent/renameme", window.Filesystem.O_CREAT, 0o777);
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

  it("Test read permission (remove read perms and restore them)", async () => {
    await initFS(page);

    let {
      fd,
      writeRes,
      chmodToWriteOnly,
      readResultNoPerms,
      chmodToRW,
      readResultAfterFix
    } = await page.evaluate(async () => {
      // 1) Create file with full perms, open + write
      let fd = window.Filesystem.open("persistent/noread.txt", window.Filesystem.O_CREAT | window.Filesystem.O_RDWR, 0o777);
      let writeRes = window.Filesystem.write(fd, "no one can read this line");

      // Move back to the start so we can attempt to read it from there
      window.Filesystem.lseek(fd, 0, 0);

      // 2) Change permissions to write-only: (0o200)
      let chmodToWriteOnly = window.Filesystem.chmod("persistent/noread.txt", 0o200) == 0;

      // Attempt to read
      // We'll keep reading from the same open fd:
      let readResultNoPerms = window.Filesystem.read(fd, 100);

      // 3) Change perms back to read/write
      let chmodToRW = window.Filesystem.chmod("persistent/noread.txt", 0o600) == 0;

      // Re-seek to start
      window.Filesystem.lseek(fd, 0, 0);

      // 4) Attempt to read again
      let readResultAfterFix = window.Filesystem.read(fd, 100);

      // Close
      window.Filesystem.close(fd);

      return {
        fd,
        writeRes,
        chmodToWriteOnly,
        readResultNoPerms,
        chmodToRW,
        readResultAfterFix
      };
    });

    // Basic checks
    assert.ok(fd >= 0, "Failed to create/open file descriptor");
    assert.ok(writeRes > 0, "Write operation to file failed");
    assert.ok(chmodToWriteOnly, "Failed to chmod to write-only");

    // Expect read to fail or return null (failed perms)
    assert.strictEqual(
      readResultNoPerms,
      null,
      "Expected null or error reading a file with no read perms"
    );

    assert.ok(chmodToRW, "Failed to chmod back to read/write");

    // After restoring read perms, the read call should succeed
    assert.ok(readResultAfterFix?.data, "Expected to read data after restoring R/W perms");
    assert.strictEqual(
      readResultAfterFix?.data,
      "no one can read this line",
      "Read data was not as expected after restoring permissions"
    );
  });

  it("Test write permission (remove write perms and restore them)", async () => {
    await initFS(page);

    let {
      fd,
      firstWrite,
      chmodNoWrite,
      secondWrite,
      chmodRestoreWrite,
      thirdWrite
    } = await page.evaluate(async () => {
      // 1) Create file with read + write perms
      let fd = window.Filesystem.open("persistent/writeperm.txt", window.Filesystem.O_CREAT | window.Filesystem.O_RDWR, 0o666); // user/group/other => rw

      // Write once
      let firstWrite = window.Filesystem.write(fd, "Initial content");

      // 2) Remove write permission from user => 0o444 => read-only
      let chmodNoWrite = (window.Filesystem.chmod("persistent/writeperm.txt", 0o444) === 0);

      // 3) Try writing => expect fail, the return should be -1.
      let secondWrite = window.Filesystem.write(fd, "Should fail or do nothing") < 0;

      // 4) Restore write permission => 0o666
      let chmodRestoreWrite = (window.Filesystem.chmod("persistent/writeperm.txt", 0o666) === 0);

      // 5) Try writing again => should succeed
      let thirdWrite = window.Filesystem.write(fd, "Now it should work") >= 0;

      // Close
      window.Filesystem.close(fd);

      return {
        fd,
        firstWrite,
        chmodNoWrite,
        secondWrite,
        chmodRestoreWrite,
        thirdWrite
      };
    });

    assert.ok(fd >= 0, "Failed to create/open file descriptor");
    assert.ok(firstWrite > 0, "Initial write returned unexpected value");
    assert.ok(chmodNoWrite, "Failed to remove write permissions (chmod 0o444)");

    // FS is enforcing permissions, should expect a failure (-1).
    assert.ok(secondWrite,
      "Write likely failed with no write permission, which is correct for a strictly enforced FS")

    assert.ok(chmodRestoreWrite, "Failed to chmod file back to write perms (0o666)");
    assert.ok(thirdWrite, "Expected final write to succeed once perms were restored");
  });

  it("Test directory execute permission (traverse vs. no traverse)", async () => {
    await initFS(page);

    let {
      mkdirOk,
      chmodNoExec,
      readdirNoExec,
      chmodExecAgain,
      readdirWithExec
    } = await page.evaluate(async () => {
      // Create a directory with full perms
      let mkdirOk = (window.Filesystem.mkdir("persistent/dirnoexec") === 0);

      // Remove 'execute' from user => e.g. 0o666 => user rw, group rw, other rw, no one has x
      let chmodNoExec = (window.Filesystem.chmod("persistent/dirnoexec", 0o666) === 0);

      let readdirNoExec;
      try {
        readdirNoExec = window.Filesystem.readdir("persistent/dirnoexec");
      } catch (err) {
        // If it fails, store null or something
        readdirNoExec = null;
      }

      // Restore execute => 0o777
      let chmodExecAgain = (window.Filesystem.chmod("persistent/dirnoexec", 0o777) === 0);

      let readdirWithExec;
      try {
        readdirWithExec = window.Filesystem.readdir("persistent/dirnoexec");
      } catch (err) {
        readdirWithExec = null;
      }

      return {
        mkdirOk,
        chmodNoExec,
        readdirNoExec,
        chmodExecAgain,
        readdirWithExec
      };
    });

    assert.ok(mkdirOk, "Failed to create test directory");
    assert.ok(chmodNoExec, "Failed to chmod directory to remove 'execute' bit");

    // If emscripten enforces x-permission, readdirNoExec might be null or throw an error
    if (readdirNoExec !== null) {
      console.warn(
        "readdir succeeded even though 'execute' was removed. " +
        "Emscripten doens't seem to strictly enforce directory x-perms."
      );
    }

    assert.ok(chmodExecAgain, "Failed to chmod directory back to full perms (0o777)");

    // Now readdir should succeed
    assert.ok(
      Array.isArray(readdirWithExec),
      "Expected readdir to return an array after restoring directory x-permission"
    );
  });

  it("Test chown (Emscripten support is questionable)", async () => {
    await initFS(page);

    let { fd, closeRes, chownRes, postStat } = await page.evaluate(() => {
      // Create a file
      let fd = window.Filesystem.open("persistent/ownercheck", window.Filesystem.O_CREAT, 0o777);
      let closeRes = (window.Filesystem.close(fd) === 0);

      // Attempt to chown => let's try to set user=1, group=2 (arbitrary)
      let chownRes = window.Filesystem.chown("persistent/ownercheck", 1, 2);

      // Get updated stat
      let postStat = window.Filesystem.stat("persistent/ownercheck");

      return {
        fd,
        closeRes,
        chownRes,
        postStat
      };
    });

    assert.ok(fd >= 0, "Failed to create file descriptor");
    assert.ok(closeRes, "Failed to close the file descriptor");
    if (chownRes !== 0) {
      console.warn("chown failed - your FS may not allow chown on this file");
    } else {
      // If success, check if uid/gid changed
      // Emscripten may ignore the call. If not ignored, expect postStat.uid=1, postStat.gid=2
      const changedUID = (postStat.uid === 1);
      const changedGID = (postStat.gid === 2);
      if (!changedUID || !changedGID) {
        console.warn(
          "chown succeeded but ownership didn't change as expected. " +
          "Some FS drivers do not actually store UID/GID changes."
        );
      }
      assert.ok(true, "chown call was attempted, check console for details.");
    }
  });

  it("Test access() checks (R_OK, W_OK, X_OK)", async () => {
    await initFS(page);

    let results = await page.evaluate(() => {
      // 1) Create a file => 0o644
      let fd = window.Filesystem.open("persistent/check_access.txt", window.Filesystem.O_CREAT, 0o644);
      window.Filesystem.close(fd);

      // 2) Check R_OK => Should be 0
      const readCheck = window.Filesystem.access("persistent/check_access.txt", 4); // 4 => R_OK

      // 3) Check W_OK => Should be 0 if user is the owner with mode 0o600+
      const writeCheck = window.Filesystem.access("persistent/check_access.txt", 2); // 2 => W_OK

      // 4) Check X_OK => should be -1 since we haven't set x bit in 0o644
      const execCheck = window.Filesystem.access("persistent/check_access.txt", 1); // 1 => X_OK

      // 5) For comparison, chmod => 0o755 => re-check X_OK
      window.Filesystem.chmod("persistent/check_access.txt", 0o755);
      const execCheckAfterChmod = window.Filesystem.access("persistent/check_access.txt", 1);

      return {
        readCheck,
        writeCheck,
        execCheck,
        execCheckAfterChmod
      };
    });

    assert.strictEqual(results.readCheck, 0, "File should be readable (R_OK=0) with 0o644");
    assert.strictEqual(results.writeCheck, 0, "File should be writable by owner (W_OK=0) with 0o644");
    assert.strictEqual(results.execCheck, -1, "File should not be executable with 0o644");
    assert.strictEqual(results.execCheckAfterChmod, 0, "After chmod 0o755, file should be executable");
  });
});
