export const Filesystem = {};

export function initialiseAPI(Module) {
  console.log("Initialising API functions");

  Filesystem._UTF8Encoder = new TextEncoder();
  Filesystem._UTF8Decoder = new TextDecoder("utf-8");

  // Cwraps [Function Signatures]
  Filesystem.initialiseFS = Module.cwrap(
    'initialiseFS', // Function name
    'number', // Return type
    [], // Argument types
  )
  Filesystem.sync = Module.cwrap(
    'syncFS', // Function name
    'number', // Return type
    [], // Argument types
  )
  Filesystem.open = Module.cwrap(
    'fs_open', // Function name
    'number', // Return type
    ['string', 'number', 'number'], // Argument types
  )
  Filesystem.close = Module.cwrap(
    'fs_close', // Function name
    'number', // Return type
    ['number'], // Argument types
  )
  Filesystem.write = function(fd, content) {
    
    const encodedContent = Filesystem._UTF8Encoder.encode(content);
    
    return Module.ccall(
      'fs_write', // Function name
      'number', // Return type
      ['number', 'array', 'number'], // Argument types
      [fd, encodedContent, encodedContent.length]
    );
  }
  Filesystem.lseek = Module.cwrap(
    'fs_lseek', // Function name
    'number', // Return type
    ['number', 'number', 'number'], // Argument types
  )
  Filesystem.printStat = Module.cwrap(
    'printNodeStat', // Function name
    'null', // Return type
    ['string'] // Argument types
  )
  Filesystem.read = function(fd, amt) {
    const sp = Module.stackSave();
    const resultStructPtr = Module.stackAlloc(8);

    // Declare "dataPtr" & "size" so they're always in scope
    let dataPtr = 0;
    let size = 0;

    try {
      Module.ccall('fs_read', null, ['number', 'number', 'number'], [fd, resultStructPtr, amt]);

      dataPtr = Module.getValue(resultStructPtr, 'i32');
      size = Module.getValue(resultStructPtr + 4, 'i32');

      if (size >= 0) {
        const dataView = new Uint8Array(Module.HEAPU8.buffer, dataPtr, size);
        const copy = new Uint8Array(dataView);
        return { data: Filesystem._UTF8Decoder.decode(copy), size: size };
      } else {
        console.error("read returned error:", size);
        return null;
      }

    } finally {
      // Only free if dataPtr != 0 (or if size > 0, if that is your logic):
      if (dataPtr) {
        Module._free(dataPtr);
      }
      Module.stackRestore(sp);
    }
  };

  Filesystem.unlink = Module.cwrap(
    "fs_unlink", // Function name
    "number", // Return type
    ["string"], // Argument types
  );
  Filesystem.rename = Module.cwrap(
    "fs_rename", // Function name
    "number", // Return type
    ["string", "string"], // Argument types
  )
  Filesystem.access = Module.cwrap(
    "fs_access", // Function name
    "number", // Return type
    ["string", "number"], // Argument types
  )
  Filesystem.stat = function(name) {

    // Save the current stack pointer
    const sp = Module.stackSave();

    // Allocate memory on heap for StatResult struct
    const statResultPtr = Module._malloc(48); // 48 bytes
    if (!statResultPtr) {
      console.error("Faild to stat node!");
      return;
    }

    // Call the wasm procedure
    Module.ccall(
      "fs_stat",
      null,
      ["string", "number"],
      [name, statResultPtr],
    );

    // Extract fields from StatResult struct
    const size = Module.getValue(statResultPtr, "i32");
    const blocks = Module.getValue(statResultPtr + 4, "i32");
    const blocksize = Module.getValue(statResultPtr + 8, "i32");
    const ino = Module.getValue(statResultPtr + 12, "i32");
    const nlink = Module.getValue(statResultPtr + 16, "i32");
    const mode = Module.getValue(statResultPtr + 20, "i32");

    const atimeSec = Module.getValue(statResultPtr + 24, "i32");
    const atimeNSec = Module.getValue(statResultPtr + 28, "i32");
    const mtimeSec = Module.getValue(statResultPtr + 32, "i32");
    const mtimeNSec = Module.getValue(statResultPtr + 36, "i32");
    const ctimeSec = Module.getValue(statResultPtr + 40, "i32");
    const ctimeNSec = Module.getValue(statResultPtr + 42, "i32");

    // Free the heap memory
    Module._free(statResultPtr);
    // Clean up stack
    Module.stackRestore(sp);

    return {
      size: size,
      blocks: blocks,
      blocksize: blocksize,
      ino: ino,
      nlink: nlink,
      mode: mode,
      atime: { sec: atimeSec, nsec: atimeNSec },
      mtime: { sec: mtimeSec, nsec: mtimeNSec },
      ctime: { sec: ctimeSec, nsec: ctimeNSec },
    }
  }
  Filesystem.lstat = function(name) {

    // Save the current stack pointer
    const sp = Module.stackSave();

    // Allocate memory on heap for StatResult struct
    const statResultPtr = Module._malloc(48); // 48 bytes
    if (!statResultPtr) {
      console.error("Faild to stat node!");
      return;
    }

    // Call the wasm procedure
    Module.ccall(
      "fs_lstat",
      null,
      ["string", "number"],
      [name, statResultPtr],
    );

    // Extract fields from StatResult struct
    const size = Module.getValue(statResultPtr, "i32");
    const blocks = Module.getValue(statResultPtr + 4, "i32");
    const blocksize = Module.getValue(statResultPtr + 8, "i32");
    const ino = Module.getValue(statResultPtr + 12, "i32");
    const nlink = Module.getValue(statResultPtr + 16, "i32");
    const mode = Module.getValue(statResultPtr + 20, "i32");

    const atimeSec = Module.getValue(statResultPtr + 24, "i32");
    const atimeNSec = Module.getValue(statResultPtr + 28, "i32");
    const mtimeSec = Module.getValue(statResultPtr + 32, "i32");
    const mtimeNSec = Module.getValue(statResultPtr + 36, "i32");
    const ctimeSec = Module.getValue(statResultPtr + 40, "i32");
    const ctimeNSec = Module.getValue(statResultPtr + 42, "i32");

    // Free the heap memory
    Module._free(statResultPtr);
    // Clean up stack
    Module.stackRestore(sp);

    return {
      size: size,
      blocks: blocks,
      blocksize: blocksize,
      ino: ino,
      nlink: nlink,
      mode: mode,
      atime: { sec: atimeSec, nsec: atimeNSec },
      mtime: { sec: mtimeSec, nsec: mtimeNSec },
      ctime: { sec: ctimeSec, nsec: ctimeNSec },
    }
  };
  Filesystem.symlink = Module.cwrap(
    "fs_symlink",
    "number",
    ["string", "string"],
  );
  Filesystem.link = Module.cwrap(
    "fs_link",
    "number",
    ["string", "string"],
  );
  Filesystem.mkdir = Module.cwrap(
    "fs_mkdir",
    "number",
    ["string", "number"],
  );
  Filesystem.opendir = Module.cwrap(
    "fs_opendir",
    "number",
    ["string"],
  );
  Filesystem.closedir = Module.cwrap(
    "fs_closedir",
    "number",
    ["number"],
  );
  Filesystem.readdir = function(dd) {
    const nameBufSize = 256;
    const nameBufPtr = Module._malloc(nameBufSize);

    let entries = [];

    try {
      while (true) {
        const result = Module.ccall(
          "fs_readdir",
          "number",
          ["number", "number"],
          [dd, nameBufPtr]);
        if (result < 0) {
          // No more entries or error
          break;
        }

        entries.push(Module.UTF8ToString(nameBufPtr));
      }
    } finally {
      // Free buffer
      Module._free(nameBufPtr);
    }

    return entries;
  };
  Filesystem.rmdir = Module.cwrap(
    "fs_rmdir",
    "number",
    ["string"],
  );
  Filesystem.chdir = Module.cwrap(
    "fs_chdir",
    "number",
    ["string"],
  );
  Filesystem.chmod = Module.cwrap(
    "fs_chmod",
    "number",
    ["string", "number"],
  )
  Filesystem.utime = Module.cwrap(
    "fs_utime",
    "number",
    ["string", "number", "number"],
  )
  Filesystem.cp = Module.cwrap(
    "fs_cp",
    "number",
    ["string", "string"],
  )
  Filesystem.ftruncate = Module.cwrap(
    "fs_ftruncate",
    "number",
    ["number", "number"]
  )
}
