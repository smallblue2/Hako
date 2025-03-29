import { O_CREAT, O_RDONLY, O_WRONLY, O_RDWR, errnoToString } from './definitions.mjs';

export const Filesystem = {};

export function initialiseAPI(Module) {
  console.log("Initialising filesystem API");

  function callWithErrno(fnName, returnType, argTypes = [], args = []) {
    let sp = Module.stackSave();

    let errorPointer = Module.stackAlloc(4);

    let returnVal = Module.ccall(
      fnName,
      returnType,
      [...argTypes, "number"],
      [...args, errorPointer]
    );

    let errno = Module.getValue(errorPointer, 'i32');

    Module.stackRestore(sp);

    return { returnVal, errno };
  }

  function extractStatFields(statResultPtr) {

    // Extract fields from StatResult struct
    const size = Module.getValue(statResultPtr, "i32");
    const blocks = Module.getValue(statResultPtr + 4, "i32");
    const blocksize = Module.getValue(statResultPtr + 8, "i32");
    const ino = Module.getValue(statResultPtr + 12, "i32");
    const permNum = Module.getValue(statResultPtr + 16, "i32");
    const type = Module.getValue(statResultPtr + 20, "i32");
    let typeString = type == 1 ? "directory" : "file";

    let permString = "";
    if ((permNum & 0o400) == 0o400) permString += "r";
    if ((permNum & 0o200) == 0o200) permString += "w";
    if ((permNum & 0o100) == 0o100) permString += "x";

    const atimeSec = Module.getValue(statResultPtr + 24, "i32");
    const atimeNSec = Module.getValue(statResultPtr + 28, "i32");
    const mtimeSec = Module.getValue(statResultPtr + 32, "i32");
    const mtimeNSec = Module.getValue(statResultPtr + 36, "i32");
    const ctimeSec = Module.getValue(statResultPtr + 40, "i32");
    const ctimeNSec = Module.getValue(statResultPtr + 44, "i32");

    return {
      size,
      blocks,
      blocksize,
      ino,
      type: typeString,
      perm: permString,
      atime: { sec: atimeSec, nsec: atimeNSec },
      mtime: { sec: mtimeSec, nsec: mtimeNSec },
      ctime: { sec: ctimeSec, nsec: ctimeNSec },
    }
  }

  Filesystem._UTF8Encoder = new TextEncoder();
  Filesystem._UTF8Decoder = new TextDecoder("utf-8");

  // For node based tests
  Filesystem.initialiseFSNode = Module.cwrap(
    'file__initialiseFSNode', // Function name
    null, // Return type
    [], // Argument types
  )
  // Cwraps [Function Signatures]
  Filesystem.initialiseFS = Module.cwrap(
    'file__initialiseFS', // Function name
    null, // Return type
    [], // Argument types
  )
  Filesystem.sync = Module.cwrap(
    'file__pullFromPersist', // Function name
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
    if (!((read || write || create) && isValid)) {
      errorStr = "Invalid flags provided"; // Custom API error
      return { error: errorStr, fd: -1, };
    }

    // Construct C flag
    let cFlag = 0;
    if (read && write) cFlag |= O_RDWR;
    else if (read) cFlag |= O_RDONLY;
    else if (write) cFlag |= O_WRONLY;

    if (create) cFlag |= O_CREAT;

    let { returnVal: fd, errno } = callWithErrno(
      "file__open",
      "number",
      ["string", "number"],
      [path, cFlag] // errno Will be attached
    )

    // Extract error string from errno
    if (errno != 0) {
      errorStr = errnoToString(errno);
    }

    return { error: errorStr, fd };
  }
  Filesystem.close = (fd) => {
    let errorStr = null;

    let { errno } = callWithErrno(
      "file__close",
      null,
      ["number"],
      [fd]
    );

    if (errno != 0) {
      errorStr = errnoToString(errno);
    }

    return { error: errorStr };
  }
  Filesystem.write = (fd, content) => {
    let errorStr = null;

    let { errno } = callWithErrno(
      "file__write",
      null,
      ["number", "string"],
      [fd, content]
    );

    if (errno != 0) {
      errorStr = errnoToString(errno);
    }

    return { error: errorStr };
  }
  Filesystem.read = (fd, amt) => {
    let errorStr = null;

    let sp = Module.stackSave();

    let readResultPtr = Module.stackAlloc(8);

    let { errno } = callWithErrno(
      "file__read",
      null,
      ["number", "number", "number"],
      [fd, amt, readResultPtr]
    );

    if (errno > 0) {
      errorStr = errnoToString(errno);
    }

    let dataPtr = Module.getValue(readResultPtr, 'i32');
    let size = Module.getValue(readResultPtr + 4, 'i32');


    try {
      // If it suceeded its read
      if (size >= 0) {
        const dataView = new Uint8Array(Module.HEAPU8.buffer, dataPtr, size);
        const copy = new Uint8Array(dataView);
        return {
          error: errorStr,
          data: Filesystem._UTF8Decoder.decode(copy),
          size: size
        }
      } else {
        return {
          error: errorStr
        }
      }
    } finally {
      // Free the string buffer from C (if it isn't null)
      if (dataPtr) {
        Module._free(dataPtr);
      }
      Module.stackRestore(sp);
    }
  }
  Filesystem.readAll = (fd) => {
    let errorStr = null;

    let sp = Module.stackSave();

    let readResultPtr = Module.stackAlloc(8);

    let { errno } = callWithErrno(
      "file__read_all",
      null,
      ["number", "number"],
      [fd, readResultPtr],
    )

    if (errno > 0) {
      errorStr = errnoToString(errno);
    }

    let dataPtr = Module.getValue(readResultPtr, 'i32');
    let size = Module.getValue(readResultPtr + 4, 'i32');

    try {
      // If it suceeded its read
      if (size >= 0) {
        const dataView = new Uint8Array(Module.HEAPU8.buffer, dataPtr, size);
        const copy = new Uint8Array(dataView);
        return {
          error: errorStr,
          data: Filesystem._UTF8Decoder.decode(copy),
          size: size
        }
      } else {
        return {
          error: errorStr
        }
      }
    } finally {
      // Free the string buffer from C (if it isn't null)
      if (dataPtr) {
        Module._free(dataPtr);
      }
      Module.stackRestore(sp);
    }
  }
  Filesystem.shift = (fd, amt) => {
    let errorStr = null;

    let { errno } = callWithErrno(
      "file__shift",
      null,
      ["number", "number"],
      [fd, amt]
    );

    if (errno > 0) {
      errorStr = errnoToString(errno);
    }

    return { error: errorStr };
  }
  Filesystem.goto = (fd, pos) => {
    let errorStr = null;

    let { errno } = callWithErrno(
      "file__goto",
      null,
      ["number", "number"],
      [fd, pos]
    );

    if (errno > 0) {
      errorStr = errnoToString(errno);
    }

    return { error: errorStr }
  };
  Filesystem.remove = (path) => {
    let errorStr = null;

    let { errno } = callWithErrno(
      "file__remove",
      null,
      ["string"],
      [path],
    )

    if (errno > 0) {
      errorStr = errnoToString(errno);
    }

    return { error: errorStr }
  }

  Filesystem.move = (oldPath, newPath) => {
    let errorStr = null;

    let { errno } = callWithErrno(
      "file__move",
      null,
      ["string", "string"],
      [oldPath, newPath]
    );

    if (errno > 0) {
      errorStr = errnoToString(errno);
    }

    return { error: errorStr }
  }
  Filesystem.make_dir = (path) => {
    let errorStr = null;

    let { errno } = callWithErrno(
      "file__make_dir",
      null,
      ["string"],
      [path]
    );

    if (errno > 0) {
      errorStr = errnoToString(errno);
    }

    return { error: errorStr }
  }
  Filesystem.remove_dir = (path) => {
    let errorStr = null;

    let { errno } = callWithErrno(
      "file__remove_dir",
      null,
      ["string"],
      [path]
    );

    if (errno > 0) {
      errorStr = errnoToString(errno);
    }

    return { error: errorStr }
  }
  Filesystem.read_dir = (path) => {
    let errorStr = null;

    let entries = [];

    let sp = Module.stackSave();

    // Allocate space on the heap for the Entry struct
    // Heap is chosen here to allow the Entry to persist
    // accross calls
    let entryPtr = Module._malloc(16);

    while (true) {
      let { errno } = callWithErrno(
        "file__read_dir",
        null,
        ["string", "number"],
        [path, entryPtr]
      )

      if (errno > 0) {
        errorStr = errnoToString(errno);
        break;
      }

      let entryNameLength = Module.getValue(entryPtr, 'i32');
      let dataPtr = Module.getValue(entryPtr + 4, 'i32');
      let endIndicator = Module.getValue(entryPtr + 8, 'i32');
      if (endIndicator == 1) break; // STOP if we're at the end

      if (entryNameLength > 0) {
        // Extract the entry name
        const dataView = new Uint8Array(Module.HEAPU8.buffer, dataPtr, entryNameLength);
        const copy = new Uint8Array(dataView);
        const entryName = Filesystem._UTF8Decoder.decode(copy);
        entries.push(entryName);
        // Free the entry name string as it was created via
        // `strdup` in C
        Module._free(dataPtr);
      }
    }

    // Free the entry pointer
    Module._free(entryPtr);

    Module.stackRestore(sp);

    return { error: errorStr, entries }
  }
  Filesystem.stat = (path) => {
    let errorStr = null;

    let sp = Module.stackSave();

    let statResultPtr = Module.stackAlloc(44);

    let { errno } = callWithErrno(
      "file__stat",
      null,
      ["string", "number"],
      [path, statResultPtr],
    );

    if (errno > 0) {
      errorStr = errnoToString(errno);
      return { error: errorStr }
    }

    const stat = extractStatFields(statResultPtr);

    Module.stackRestore(sp);

    return { error: errorStr, stat }
  }
  Filesystem.fdstat = (fd) => {
    let errorStr = null;

    let sp = Module.stackSave();

    let statResultPtr = Module.stackAlloc(44);

    let { errno } = callWithErrno(
      "file__fdstat",
      null,
      ["number", "number"],
      [fd, statResultPtr]
    );

    if (errno > 0) {
      errorStr = errnoToString(errno);
      return { error: errorStr }
    }

    const stat = extractStatFields(statResultPtr);

    Module.stackRestore(sp);

    return { error: errorStr, stat }
  }
  Filesystem.change_dir = (path) => {
    let errorStr = null;

    let { errno } = callWithErrno(
      "file__change_dir",
      null,
      ["string"],
      [path],
    );

    if (errno > 0) {
      errorStr = errnoToString(errno);
    }

    return { error: errorStr };
  }
  Filesystem.permit = (path, flags) => {

    let errorStr = null;

    // Flags can be any combination of 'r, w or x' for READ, WRITE and EXECUTE
    const flagsRegex = /^(?!.*([rwx]).*\1)[rwx]{1,3}$/;

    // Validate flags
    let isValid = flagsRegex.test(flags);
    let read = flags.includes("r");
    let write = flags.includes("w");
    let exec = flags.includes("x");
    if (!((read || write || exec) && isValid) && flags != "") {
      errorStr = "Invalid flags provided"; // Custom API error
      return { error: errorStr };
    }

    // Construct C flag
    let cFlag = 0;
    if (read) cFlag |= 0o400;
    if (write) cFlag |= 0o200;
    if (exec) cFlag |= 0o100;

    let { errno } = callWithErrno(
      "file__permit",
      null,
      ["string", "number"],
      [path, cFlag],
    );

    if (errno > 0) {
      errorStr = errnoToString(errno);
      return { error: errorStr }
    }

    return { error: errorStr }
  }
  Filesystem.truncate = (fd, length) => {
    let { errno } = callWithErrno(
      "file__truncate",
      null,
      ["number", "number"],
      [fd, length],
    );
    if (errno > 0) {
      return { error: errnoToString(errno) };
    }
    return { error: null };
  }
};
