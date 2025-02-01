import { O_CREAT, O_RDONLY, O_WRONLY, errnoToString } from './definitions.js';

export const Filesystem = {};

export function initialiseAPI(Module) {
  console.log("Initialising filesystem API");

  Filesystem._UTF8Encoder = new TextEncoder();
  Filesystem._UTF8Decoder = new TextDecoder("utf-8");

  // Cwraps [Function Signatures]
  Filesystem.initialiseFS = Module.cwrap(
    'file__initialiseFS', // Function name
    null, // Return type
    [], // Argument types
  )
  Filesystem.sync = Module.cwrap(
    'file__syncFS', // Function name
    null, // Return type
    [], // Argument types
  )
  Filesystem.open = (path, flags) => {
    let errorStr = null;

    // Flags can be any combination of 'r, w or c' for READ, WRITE and CREATE
    const flagsRegex = /^(?!.*([rwc]).*\1)[rwc]{1,3}$/;

    // Validate flags
    let isValid = flagsRegex.test(flags);
    let read = flags.includes("r");
    let write = flags.includes("w");
    let create = flags.includes("c");
    if (!((read || write || create) & isValid)) {
      errorStr = "Invalid flags provided"; // Custom API error
      return { fd: -1, error: errorStr };
    }

    // Construct C flag
    let cFlag;
    if (read) cFlag = O_RDONLY;
    if (write) cFlag = cFlag | O_WRONLY;
    if (create) cFlag = cFlag | O_CREAT;

    // Save current stack pointer
    const sp = Module.stackSave();

    // Allocate memory on heap for Error pointer (4 bytes for pointer)
    const errorPointer = Module.stackAlloc(4);

    console.log(`Calling : (${path}, ${cFlag}, ${errorPointer})!`);
    let fd = Module.ccall(
      "file__open",
      "number", // file descriptor
      ["string", "number", "number"],
      [path, cFlag, errorPointer]
    );
    console.log("Finished!");

    // Get value at pointer
    const errno = Module.getValue(errorPointer, "i32");

    // Load previous stack state, cleanup
    Module.stackRestore(sp);

    // Extract error string from errno
    if (errno != 0) {
      errorStr = errnoToString(errno);
    }

    return { fd, error: errorStr };
  }
  Filesystem.close = (fd) => {
    let errorStr = null;

    let sp = Module.stackSave();

    // Allocate memory on heap for Error pointer (4 bytes for pointer)
    const errorPointer = Module.stackAlloc(4);

    Module.ccall(
      "file__close",
      null,
      ["number", "number"],
      [fd, errorPointer]
    );

    // cleanup
    Module.stackRestore(sp);

    let errno = Module.getValue(errorPointer, "i32");
    if (errno != 0) {
      errorStr = errnoToString(errno);
    }

    return { error: errorStr };
  }
  console.log("Finished initialising filesystem API")
};
