export const Filesystem = {};

export function initialiseAPI(Module) {
  console.log("Initialising API functions");

  // Cwraps [Function Signatures]
  Filesystem.initialiseFS = Module.cwrap(
    'initialiseFS', // Function name
    'null', // Return type
    [], // Argument types
  )
  Filesystem.sync = Module.cwrap(
    'syncFS', // Function name
    'null', // Return type
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
  Filesystem.write = Module.cwrap(
    'fs_write', // Function name
    'number', // Return type
    ['number', 'array', 'number'], // Argument types
  )
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
    const sp = Module.stackSave(); // Save the stack pointer
    const resultStructPtr = Module.stackAlloc(8); // Allocate space for the result struct

    try {
      Module.ccall('fs_read', null, ['number', 'number', 'number'], [fd, resultStructPtr, amt]);

      const dataPtr = Module.getValue(resultStructPtr, 'i32');
      const size = Module.getValue(resultStructPtr + 4, 'i32');

      if (size > 0) {
        const dataView = new Uint8Array(Module.HEAPU8.buffer, dataPtr, size);
        const copy = new Uint8Array(dataView); // Create a stable copy
        Module.ccall('free_read_ptr', null, ['number'], [dataPtr]); // Free the buffer
        return { data: copy, size: size };
      } else {
        console.error("read returned error:", size);
        return null;
      }
    } finally {
      Module.stackRestore(sp); // Restore the stack pointer
    }
  };
  Filesystem.unlink = Module.cwrap(
    "fs_unlink", // Function name
    null, // Return type
    ["string"], // Argument types
  );
  Filesystem.rename = Module.cwrap(
    "fs_rename", // Function name
    null, // Return type
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
  }
}
