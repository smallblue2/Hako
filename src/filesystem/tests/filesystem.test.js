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

  it("Check whether we can open a file (create)", async () => {
    await initFS(page);

    const { error0, error1, error2, fd, stat } = await page.evaluate(() => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/test.txt", "c");
      let { error: error1 } = window.Filesystem.close(fd);
      let { error: error2, stat } = window.Filesystem.stat("/persistent");
      return { error0, error1, error2, fd, stat }
    })

    assert.ok(fd > 0, "Invalid file descriptor");
    assert.ok(error0 == null, "Open reported an error");
    assert.ok(error1 == null, "Close reported an error");
    assert.ok(error2 == null, "Stat reported an error");
    assert.ok(stat != null, "Stat call didn't return a stat struct");
  });

  it("Confirm opening an existing file with create fails", async () => {
    await initFS(page);

    const { error0, error1, fd0, fd1 } = await page.evaluate(() => {
      let { error: error0, fd: fd0 } = window.Filesystem.open("/persistent/first", "c");
      let { error: error1, fd: fd1 } = window.Filesystem.open("/persistent/first", "c");
      // Don't need to close, as all state is wiped after each test
      return { error0, error1, fd0, fd1 }
    })

    assert.ok(error0 == null, "First open reported an error");
    assert.ok(fd0 > 0, "First open returned an invalid file descriptor");
    assert.ok(error1 != null, "Second open suceeded when it should have failed");
    assert.ok(fd1 < 0, "Second open returned a valid file descriptor when it should have been invalid");
  })

  it("Check whether closing a file works", async () => {
    await initFS(page);

    const { error0, error1, error2, error3, fd } = await page.evaluate(() => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/another.txt", "wc");
      let { error: error1 } = window.Filesystem.write(fd, "This should work");
      let { error: error2 } = window.Filesystem.close(fd);
      let { error: error3 } = window.Filesystem.write(fd, "This shouldn't work");
      return { error0, error1, error2, error3, fd };
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Invalid file descriptor from close");
    assert.ok(error1 == null, "Write reported an error");
    assert.ok(error2 == null, "Close reported an error");
    assert.ok(error3 != null, "Second write should have failed due to closed file descriptor");
  });

  it("Check we can write to an open file", async () => {
    await initFS(page);

    const { error0, error1, error2, fd } = await page.evaluate(() => {
      let { fd, error: error0 } = window.Filesystem.open("/persistent/hello.txt", "crw");
      let { error: error1 } = window.Filesystem.write(fd, "Hello, world!");
      let { error: error2 } = window.Filesystem.close(fd);
      return { error0, error1, error2, fd }
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Invalid file descriptor returned from open");
    assert.ok(error1 == null, "Write reported an error");
    assert.ok(error2 == null, "Close reported an error");
  });

  it("Check we can read an open file", async () => {
    await initFS(page);

    const { error0, error1, error2, fd } = await page.evaluate(() => {
      let { fd, error: error0 } = window.Filesystem.open("/persistent/hello.txt", "crw");
      let { error: error1 } = window.Filesystem.read(fd, 5);
      let { error: error2 } = window.Filesystem.close(fd);
      return { error0, error1, error2, fd }
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Invalid file descriptor returned from open");
    assert.ok(error1 == null, "Read reported an error");
    assert.ok(error2 == null, "Close reported an error");
  });

  it("Check whether opening with only a read flag disallows writes", async () => {
    await initFS(page);

    const { error0, error1, error2, fd } = await page.evaluate(() => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/another.txt", "cr");
      let { error: error1 } = window.Filesystem.write(fd, "This should fail");
      let { error: error2 } = window.Filesystem.close(fd);
      return { error0, error1, error2, fd };
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Invalid file descriptor returned by open");
    assert.ok(error1 != null, "Write was allowed on a read-only file descriptor");
    assert.ok(error2 == null, "Close reported an error");
  });


  it("Check whether opening with only a write flag disallows reads", async () => {
    await initFS(page);

    const { error0, error1, error2, fd } = await page.evaluate(() => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/another.txt", "cw");
      let { error: error1 } = window.Filesystem.read(fd, 10); // arbitrarily chose 10 here
      let { error: error2 } = window.Filesystem.close(fd);
      return { error0, error1, error2, fd };
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Invalid file descriptor returned by open");
    assert.ok(error1 != null, "Read was allowed on a write-only file descriptor");
    assert.ok(error2 == null, "Close reported an error");
  });

  it("Confirm opening a non-existent file without create flag fails", async () => {
    await initFS(page);

    const { error, fd } = await page.evaluate(() => {
      let { error, fd } = window.Filesystem.open("/persistent/another.txt", "rw");
      return { error, fd };
    });

    assert.ok(error != null, "Open suceeded when it should have failed");
    assert.ok(!(fd > 0), "Valid file descriptor created when it should've failed");
  });

  it("Create a file, write to it, close it, re-open it, and read it using Read", async () => {
    await initFS(page);

    let content = "Hello, World!";
    let len = content.length;

    const { error0, error1, error2, error3, error4, error5, fd0, fd1, data, size } = await page.evaluate((content, len) => {
      let { error: error0, fd: fd0 } = window.Filesystem.open("/persistent/helloworld.txt", "cw");
      let { error: error1 } = window.Filesystem.write(fd0, content);
      let { error: error2 } = window.Filesystem.close(fd0);
      let { error: error3, fd: fd1 } = window.Filesystem.open("/persistent/helloworld.txt", "r");
      let { error: error4, data, size } = window.Filesystem.read(fd1, len);
      let { error: error5 } = window.Filesystem.close(fd1);
      return { error0, error1, error2, error3, error4, error5, fd0, fd1, data, size }
    }, content, len);

    assert.ok(error0 == null, "First open reported an error");
    assert.ok(fd0 > 0, "First open returned an invalid file descriptor");
    assert.ok(error1 == null, "Write reported an error");
    assert.ok(error2 == null, "First Close reported an error");
    assert.ok(error3 == null, "Second open reported an error");
    assert.ok(fd1 > 0, "Second open returned an invalid file descriptor");
    assert.ok(error4 == null, "Read reported an error");
    assert.ok(content === data, "Read content is not the same as what was written");
    assert.ok(size === len, "Read returned an incorrect read length");
    assert.ok(error5 == null, "Second close reported an error");
  });

  it("Create a file, write to it, close it, re-open it, and read it using ReadAll", async () => {
    await initFS(page);

    let content = "Hello, World!";
    let len = content.length;

    const { error0, error1, error2, error3, error4, error5, fd0, fd1, data, size } = await page.evaluate((content) => {
      let { error: error0, fd: fd0 } = window.Filesystem.open("/persistent/helloagain.txt", "cw");
      let { error: error1 } = window.Filesystem.write(fd0, content);
      let { error: error2 } = window.Filesystem.close(fd0);
      let { error: error3, fd: fd1 } = window.Filesystem.open("/persistent/helloagain.txt", "r");
      let { error: error4, data, size } = window.Filesystem.readAll(fd1);
      let { error: error5 } = window.Filesystem.close(fd1);
      return { error0, error1, error2, error3, error4, error5, fd0, fd1, data, size }
    }, content);

    assert.ok(error0 == null, "First open reported an error");
    assert.ok(fd0 > 0, "First open returned an invalid file descriptor");
    assert.ok(error1 == null, "Write reported an error");
    assert.ok(error2 == null, "First Close reported an error");
    assert.ok(error3 == null, "Second open reported an error");
    assert.ok(fd1 > 0, "Second open returned an invalid file descriptor");
    assert.ok(error4 == null, "ReadAll reported an error");
    assert.ok(content === data, "ReadAll content is not the same as what was written");
    assert.ok(size === len, "ReadAll returned an incorrect read length");
    assert.ok(error5 == null, "Second close reported an error");
  });

  it("Confirm opening protected system files for writing is blocked", async () => {
    await initFS(page);

    const { error0, error1, error2, error3, fd0, fd1 } = await page.evaluate(() => {
      // Create system file
      let { error: error0, fd: fd0 } = window.Filesystem.open("/persistent/systemfile", "cw");
      let { error: error1 } = window.Filesystem.write(fd0, "This is protected information from writes");
      let { error: error2 } = window.Filesystem.close(fd0);
      window._FSM.FS.chmod("/persistent/systemfile", 0o710); // Internal chmod, 0b111001000
      //                                               protected system file indicator ^
      // Test if we can open it for writing (should fail)
      let { error: error3, fd: fd1 } = window.Filesystem.open("/persistent/systemfile", "w");
      return { error0, error1, error2, error3, fd0, fd1 }
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd0 > 0, "Open returned an invalid file descriptor");
    assert.ok(error1 == null, "Write reported an error");
    assert.ok(error2 == null, "Close reported an error");
    assert.ok(error3 != null, "Second open suceeded when it should have failed - not allowed to open a protected system file for writing");
    assert.ok(fd1 < 0, "Second open should have returned an invalid file descriptor");
  });

  it("Confirm opening protected system files for reading is allowed", async () => {
    await initFS(page);


    const { error0, error1, error2, error3, fd0, fd1 } = await page.evaluate(() => {
      // Create system file
      let { error: error0, fd: fd0 } = window.Filesystem.open("/persistent/systemfile", "cw");
      let { error: error1 } = window.Filesystem.write(fd0, "This is protected information from writes");
      let { error: error2 } = window.Filesystem.close(fd0);
      window._FSM.FS.chmod("/persistent/systemfile", 0o710); // Internal chmod, 0b111001000
      //                                               protected system file indicator ^
      // Test if we can open it for reading (should succeed)
      let { error: error3, fd: fd1 } = window.Filesystem.open("/persistent/systemfile", "r");
      return { error0, error1, error2, error3, fd0, fd1 }
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd0 > 0, "Open returned an invalid file descriptor");
    assert.ok(error1 == null, "Read reported an error");
    assert.ok(error2 == null, "Close reported an error");
    assert.ok(error3 == null, "Second open reported an error");
    assert.ok(fd1 > 0, "Second open returned an invalid file descriptor");
  });

  it("Get the stat of a file", async () => {
    await initFS(page);

    const { error, stat } = await page.evaluate(() => {
      return window.Filesystem.stat(".");
    });

    assert.ok(error == null, "Stat reported an error");
    assert.ok(stat != null, "Stat returned a null stat object (no data)");
  });

  it("Get the fdstat of a file", async () => {
    await initFS(page);

    const { error0, error1, error2, fd } = await page.evaluate(() => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/statme", "crw");
      let { error: error1 } = window.Filesystem.fdstat(fd);
      let { error: error2 } = window.Filesystem.close(fd);
      return { error0, error1, error2, fd };
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Open returned an invalid file descriptor");
    assert.ok(error1 == null, "Fdstat reported an error");
    assert.ok(error2 == null, "Close reported an error");

  });

  it("Permit (chmod) a file", async () => {
    await initFS(page);

    const { error0, error1, error2, error3, fd, stat } = await page.evaluate(() => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/permitme.txt", "crw");
      let { error: error1 } = window.Filesystem.close(fd);
      // Only put execute permission on this file
      let { error: error2 } = window.Filesystem.permit("/persistent/permitme.txt", "x");
      let { error: error3, stat } = window.Filesystem.stat("/persistent/permitme.txt");
      return { error0, error1, error2, error3, fd, stat }
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Open returned an invalid file descriptor");
    assert.ok(error1 == null, "Close reported an error");
    assert.ok(error2 == null, "Permit reported an error");
    assert.ok(error3 == null, "Stat reported an error");
    assert.ok(stat != null, "Stat returned a null stat object (no data)");
    assert.ok(stat.perm === "x", "Permissions inconsistent with permit call");
  });

  it("Confirm a read-only file can't be written to", async () => {
    await initFS(page);

    const { error0, error1, error2, error3, fd0, fd1 } = await page.evaluate(() => {
      let { error: error0, fd: fd0 } = window.Filesystem.open("/persistent/readonly.txt", "crw");
      let { error: error1 } = window.Filesystem.close(fd0);
      let { error: error2 } = window.Filesystem.permit("/persistent/readonly.txt", "r");
      let { error: error3, fd: fd1 } = window.Filesystem.open("/persistent/readonly.txt", "w");
      return { error0, error1, error2, error3, fd0, fd1 }
    });

    assert.ok(error0 == null, "First open reported an error");
    assert.ok(fd0 > 0, "First open returned an invalid file descriptor");
    assert.ok(error1 == null, "Close reported an error");
    assert.ok(error2 == null, "Permit reported an error");
    assert.ok(error3 != null, "Second open succeeded when it should have failed");
    assert.ok(fd1 < 0, "Second open should have returned an invalid file descriptor");
  });

  it("Confirm a write-only file can't be read", async () => {
    await initFS(page);

    const { error0, error1, error2, error3, fd0, fd1 } = await page.evaluate(() => {
      let { error: error0, fd: fd0 } = window.Filesystem.open("/persistent/readonly.txt", "crw");
      let { error: error1 } = window.Filesystem.close(fd0);
      let { error: error2 } = window.Filesystem.permit("/persistent/readonly.txt", "w");
      let { error: error3, fd: fd1 } = window.Filesystem.open("/persistent/readonly.txt", "r");
      return { error0, error1, error2, error3, fd0, fd1 }
    });

    assert.ok(error0 == null, "First open reported an error");
    assert.ok(fd0 > 0, "First open returned an invalid file descriptor");
    assert.ok(error1 == null, "Close reported an error");
    assert.ok(error2 == null, "Permit reported an error");
    assert.ok(error3 != null, "Second open succeeded when it should have failed");
    assert.ok(fd1 < 0, "Second open should have returned an invalid file descriptor");
  });

  it("Confirm shifting an open file's cursor works", async () => {
    await initFS(page);

    let content = "Shift!";
    let len = content.length;

    const { error0, error1, error2, error3, fd, data, size } = await page.evaluate((content, len) => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/cursor.txt", "crw");
      let { error: error1 } = window.Filesystem.write(fd, content); // 5 long
      let { error: error2 } = window.Filesystem.shift(fd, -len);
      let { error: error3, data, size } = window.Filesystem.read(fd, len);
      return { error0, error1, error2, error3, fd, data, size };
    }, content, len);

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Open returned an invalid file descriptor");
    assert.ok(error1 == null, "Write reported an error");
    assert.ok(error2 == null, "Shift reported an error");
    assert.ok(error3 == null, "Read reported an error");
    assert.ok(data === content, "Read returned incorrect content (Shift may have behaved incorrectly)");
    assert.ok(size == len, "Read returned incorrect read length (Shift may have behaved incorrectly)")

  });


  it("Confirm goto of an open file's cursor works", async () => {
    await initFS(page);

    let content = "Shift!";
    let len = content.length;

    const { error0, error1, error2, error3, fd, data, size } = await page.evaluate((content, len) => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/cursor.txt", "crw");
      let { error: error1 } = window.Filesystem.write(fd, content); // 5 long
      let { error: error2 } = window.Filesystem.goto(fd, 0);
      let { error: error3, data, size } = window.Filesystem.read(fd, len);
      return { error0, error1, error2, error3, fd, data, size };
    }, content, len);

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Open returned an invalid file descriptor");
    assert.ok(error1 == null, "Write reported an error");
    assert.ok(error2 == null, "Goto reported an error");
    assert.ok(error3 == null, "Read reported an error");
    assert.ok(data === content, "Read returned incorrect content (Goto may have behaved incorrectly)");
    assert.ok(size == len, "Read returned incorrect read length (Goto may have behaved incorrectly)")

  });

  it("Confirm removing a file deletes it", async () => {
    await initFS(page);

    const { error0, error1, error2, error3, error4, fd, stat0, stat1 } = await page.evaluate(() => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/cursor.txt", "crw");
      let { error: error1 } = window.Filesystem.close(fd);
      let { error: error2, stat: stat0 } = window.Filesystem.stat("/persistent/cursor.txt");
      let { error: error3 } = window.Filesystem.remove("/persistent/cursor.txt");
      let { error: error4, stat: stat1 } = window.Filesystem.stat("/persistent/cursor.txt");
      return { error0, error1, error2, error3, error4, fd, stat0, stat1 };
    });

    assert.ok(error0 == null, "Open reported an error")
    assert.ok(fd > 0, "Open returned an invalid file descriptor")
    assert.ok(error1 == null, "Close reported an error")
    assert.ok(error2 == null, "First stat reported an error")
    assert.ok(stat0 != null, "First stat returned a null stat object (no data)")
    assert.ok(error3 == null, "Remove reported an error")
    assert.ok(error4 != null, "Second stat should have reported an error")
    assert.ok(stat1 == null, "Second stat should have returned a null stat object (no data)")

  });

  it("Confirm remove fails on protected system files", async () => {
    await initFS(page);

    const { error0, error1, error2, fd } = await page.evaluate(() => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/cursor.txt", "crw");
      let { error: error1 } = window.Filesystem.close(fd);
      window._FSM.FS.chmod("/persistent/cursor.txt", 0o710) // internal chmod signifying protected file
      let { error: error2 } = window.Filesystem.remove("/persistent/cursor.txt");
      return { error0, error1, error2, fd };
    });

    assert.ok(error0 == null, "Open reported an error")
    assert.ok(fd > 0, "Open returned an invalid file descriptor")
    assert.ok(error1 == null, "Close reported an error")
    assert.ok(error2 != null, "Remove should have failed and reported an error")

  });

  it("Move a file", async () => {
    await initFS(page);

    const { error0, error1, error2, error3, error4, fd } = await page.evaluate(() => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/old.txt", "crw");
      let { error: error1 } = window.Filesystem.close(fd);
      let { error: error2 } = window.Filesystem.move("/persistent/old.txt", "/persistent/new.txt");
      let { error: error3 } = window.Filesystem.stat("/persistent/old.txt");
      let { error: error4 } = window.Filesystem.stat("/persistent/new.txt");
      return { error0, error1, error2, error3, error4, fd }
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Open returned an invalid file descriptor");
    assert.ok(error1 == null, "Close reported an error");
    assert.ok(error2 == null, "Move reported an error");
    assert.ok(error3 != null, "First stat should have reported an error but didn't");
    assert.ok(error4 == null, "Second stat reported an error");
  });

  it("Move a file", async () => {
    await initFS(page);

    const { error0, error1, error2, error3, error4, fd } = await page.evaluate(() => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/old.txt", "crw");
      let { error: error1 } = window.Filesystem.close(fd);
      let { error: error2 } = window.Filesystem.move("/persistent/old.txt", "/persistent/new.txt");
      let { error: error3 } = window.Filesystem.stat("/persistent/old.txt");
      let { error: error4 } = window.Filesystem.stat("/persistent/new.txt");
      return { error0, error1, error2, error3, error4, fd }
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Open returned an invalid file descriptor");
    assert.ok(error1 == null, "Close reported an error");
    assert.ok(error2 == null, "Move reported an error");
    assert.ok(error3 != null, "First stat should have reported an error but didn't");
    assert.ok(error4 == null, "Second stat reported an error");
  });

  it("Ensure user can't move a protected file", async () => {
    await initFS(page);

    const { error0, error1, error2, error3, error4, fd } = await page.evaluate(() => {
      let { error: error0, fd } = window.Filesystem.open("/persistent/old.txt", "crw");
      let { error: error1 } = window.Filesystem.close(fd);
      window._FSM.FS.chmod("/persistent/old.txt", 0o710); // internal chmod
      let { error: error2 } = window.Filesystem.move("/persistent/old.txt", "/persistent/new.txt");
      let { error: error3 } = window.Filesystem.stat("/persistent/old.txt");
      let { error: error4 } = window.Filesystem.stat("/persistent/new.txt");
      return { error0, error1, error2, error3, error4, fd }
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd > 0, "Open returned an invalid file descriptor");
    assert.ok(error1 == null, "Close reported an error");
    assert.ok(error2 != null, "Move should have reported an error but didn't");
    assert.ok(error3 == null, "First stat reported an error");
    assert.ok(error4 != null, "Second stat should have reported an error but didn't");
  });

  it("Ensure user can't overwrite a protected file with a move", async () => {
    await initFS(page);

    const { error0, error1, error2, error3, error4, error5, fd0, fd1 } = await page.evaluate(() => {
      let { error: error0, fd: fd0 } = window.Filesystem.open("/persistent/old.txt", "crw");
      let { error: error1 } = window.Filesystem.close(fd0);
      let { error: error2, fd: fd1 } = window.Filesystem.open("/persistent/protected.txt", "crw");
      let { error: error3 } = window.Filesystem.close(fd1);
      window._FSM.FS.chmod("/persistent/protected.txt", 0o710); // internal chmod
      let { error: error4 } = window.Filesystem.move("/persistent/old.txt", "/persistent/protected.txt");
      let { error: error5 } = window.Filesystem.stat("/persistent/old.txt");
      return { error0, error1, error2, error3, error4, error5, fd0, fd1 }
    });

    assert.ok(error0 == null, "Open reported an error");
    assert.ok(fd0 > 0, "Open returned an invalid file descriptor");
    assert.ok(error1 == null, "Close reported an error");
    assert.ok(error2 == null, "Second open reported an error");
    assert.ok(fd1 > 0, "Second open returned an invalid file descriptor");
    assert.ok(error3 == null, "Second close reported an error");
    assert.ok(error4 != null, "Move should have reported an error but didn't");
    assert.ok(error5 == null, "Stat reported an error")
  });

  it("Make a directory", async () => {
    await initFS(page);

    const { error0, error1, stat } = await page.evaluate(() => {
      let { error: error0 } = window.Filesystem.make_dir("/persistent/mydir");
      let { error: error1, stat } = window.Filesystem.stat("/persistent/mydir");
      return { error0, error1, stat }
    });

    assert.ok(error0 == null, "Make_dir reported an error");
    assert.ok(error1 == null, "Stat reported an error");
    assert.ok(stat != null, "Stat returned a null stat object (no data)");
  })

  it("Remove a directory", async () => {
    await initFS(page);

    const { error0, error1, error2, error3, stat0, stat1 } = await page.evaluate(() => {
      let { error: error0 } = window.Filesystem.make_dir("/persistent/mydir");
      let { error: error1, stat: stat0 } = window.Filesystem.stat("/persistent/mydir");
      let { error: error2 } = window.Filesystem.remove_dir("/persistent/mydir");
      let { error: error3, stat: stat1 } = window.Filesystem.stat("/persistent/mydir");
      return { error0, error1, error2, error3, stat0, stat1 }
    });

    assert.ok(error0 == null, "Make_dir reported an error");
    assert.ok(error1 == null, "First stat reported an error");
    assert.ok(stat0 != null, "First stat returned a null stat object (no data)");
    assert.ok(error2 == null, "Remove_dir reported an error");
    assert.ok(error3 != null, "Second stat should have reported an error");
    assert.ok(stat1 == null, "Second stat should have returned a null stat object (no data)");
  })

  it("Read a directory", async () => {
    await initFS(page);

    const { error0, error1, entries } = await page.evaluate(() => {
      let { error: error0 } = window.Filesystem.make_dir("/persistent/mydir");
      let { error: error1, entries } = window.Filesystem.read_dir("/persistent");
      return { error0, error1, entries };
    });

    assert.ok(error0 == null, "Make_dir reported an error");
    assert.ok(error1 == null, "Read_dir reported an error");
    assert.ok(entries.length == 4, "Read_dir returned an incorrect number of entries");
    assert.deepStrictEqual(entries, [".", "..", "sys", "mydir"], "Read_dir returned incorrect entries");
  })

  it("Change active directory", async () => {
    await initFS(page);

    const { error0, error1, error2, stat0, stat1 } = await page.evaluate(() => {
      let { entries } = window.Filesystem.read_dir(".")
      let { error: error0, stat: stat0 } = window.Filesystem.stat("/persistent");
      let { error: error1 } = window.Filesystem.change_dir("/persistent");
      let { error: error2, stat: stat1 } = window.Filesystem.stat(".");
      return { error0, error1, error2, stat0, stat1, entries }
    })

    assert.ok(error0 == null, "First stat reported an error");
    assert.ok(stat0 != null, "First stat returned a null stat object (no data)");
    assert.ok(error1 == null, "Change_dir reported an error");
    assert.ok(error2 == null, "Second stat reported an error");
    assert.ok(stat1 != null, "Second stat returned a null stat object (no data)");
    assert.deepStrictEqual(stat0, stat1, "Two stats should be exactly equal");
  });

});
