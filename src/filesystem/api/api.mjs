import { O_CREAT, O_RDONLY, O_WRONLY, O_RDWR, errnoToString } from './definitions.mjs';

export const Filesystem = {};

// Below are all helpers to access exported variables from the C filesystem
// module. This allows us to get size of structs aswell as the offsets of their
// fields in js.
function sizeof(M, structName) {
  const symbolName = `_sizeof_${structName}`;
  const symbol = M[symbolName];
  if (symbol === undefined) {
    throw new Error("symbol not found: " + symbolName);
  }
  return M.getValue(symbol, 'i32');
}

function offsetof(M, structName, field) {
  const symbolName = `_offsetof_${structName}__${field}`;
  const symbol = M[symbolName];
  if (symbol === undefined) {
    throw new Error("symbol not found: " + symbolName);
  }
  return M.getValue(M[symbolName], 'i32');
}

function derefi32(M, ptr, structName, field) {
  return M.getValue(ptr + offsetof(M, structName, field), 'i32');
}

class StructView {
  M;
  ptr;
  structName;
  constructor(M, structName, ptr) {
    this.M = M;
    this.ptr = ptr;
    this.structName = structName;
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        return derefi32(target.M, target.ptr, target.structName, prop);
      }
    });
  }
  offsetof(field) {
    return offsetof(this.M, this.structName, field);
  }
  addressof(field) {
    return this.ptr + this.offsetof(field);
  }
}

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
    const stats = new StructView(Module, "StatResult", statResultPtr);

    const permNum = stats.perm;
    const type = stats.type;
    let typeString = type == 1 ? "directory" : "file";

    let permString = "";
    if ((permNum & 0o400) == 0o400) permString += "r";
    if ((permNum & 0o200) == 0o200) permString += "w";
    if ((permNum & 0o100) == 0o100) permString += "x";

    // Edge case for system/protected files
    if ((permNum & 0o710) == 0o710) permString = "rx";

    const atime = new StructView(Module, "Time", stats.addressof("atime"));
    const mtime = new StructView(Module, "Time", stats.addressof("mtime"));
    const ctime = new StructView(Module, "Time", stats.addressof("ctime"));

    return {
      size: stats.size,
      blocks: stats.blocks,
      blocksize: stats.blocksize,
      ino: stats.ino,
      type: typeString,
      perm: permString,
      atime: { sec: atime.sec, nsec: atime.nsec },
      mtime: { sec: mtime.sec, nsec: mtime.nsec },
      ctime: { sec: ctime.sec, nsec: ctime.nsec },
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

  Filesystem.initialiseFS = async () => {
    let M = window._FSM;
    let persistentRoot = "/persistent";
    let check = M.FS.analyzePath(persistentRoot, false);
    if (check.exists) {
      console.log("[JS]", persistentRoot, "already exists!");
      console.log("[JS] Directory info:", check);
    } else {
      console.log("[JS] Creating directory:", persistentRoot);
      M.FS.mkdir(persistentRoot);
    }

    // Mount IDBFS
    console.log("[JS] Mounting IDBFS at", persistentRoot);
    try {
      M.FS.mount(M.IDBFS, {autoPersist : true}, persistentRoot);
    } catch (err) {
      console.error("[JS] Failed to mount filesystem:", err);
    }

    function ifNotExists(path, doit) {
      if (!M.FS.analyzePath(path, false).exists) {
        return doit(path);
      }
    }

    function moveFilesIn() {
      console.log("Moving fresh system files in...");

      // Initialise system files
      let systemFilePath = "/persistent/sys";

      // WARNING: IDBFS requires write access - however users will not be
      //          able modify regardless due to the PROTECTED_BIT being
      //          raised signifying it's a system file (0o010)
      ifNotExists(systemFilePath, (p) => M.FS.mkdir(p, 0o710));

      // Move lua files into correct place in IDBFS
      for (const luaFile of M.FS.readdir("/luaSource")) {
        if (luaFile == "." || luaFile == ".." || luaFile == "luaSource") continue;

        let sourcePath = `/luaSource/${luaFile}`;
        let systemPath = `${systemFilePath}/${luaFile}`;

        // Move files into systemFilePath
        let data = M.FS.readFile(sourcePath);
        ifNotExists(systemPath, (p) => {
          M.FS.writeFile(p, data);
          // Set correct permissions on file
          M.FS.chmod(p, 0o710);
          console.log(`ADDED: ${p}`);
        });
      }
      // Set correct permissions so parent directory cannot be modified either
      // INFO: I don't believe we're currently using dir permission bits, but future proofing regardless
      M.FS.chmod(systemFilePath, 0o710);

      return new Promise((res, rej) => {
        M.FS.syncfs(
          false, function(err) {
            if (err) {
              console.error("[JS] Error during sync:", err);
              rej("Failed to syncronize");
            } else {
              console.log("[JS] Sync completed succesfully!");
              res();
            }
        });
      })
    }

    return new Promise((res, rej) => {
      // Pull in previous data after mounting
      M.FS.syncfs(
        true, async (err) => {
          if (err) {
            console.error("[JS] Error during sync:", err);
            rej("Failed to syncronize")
          } else {
            console.log("[JS] Sync completed succesfully!");
            await moveFilesIn(res);
            res();
          }
      });
    });
  };

  // Cwraps [Function Signatures]
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
    let entryPtr = Module._malloc(sizeof(Module, "Entry"));
    const entryView = new StructView(Module, "Entry", entryPtr);

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

      let entryNameLength = entryView.name_len;
      let dataPtr = entryView.name;
      let endIndicator = entryView.isEnd;
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

    let statResultPtr = Module.stackAlloc(sizeof(Module, "StatResult"));

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
  Filesystem.cwd = () => {
    let { returnVal, errno } = callWithErrno(
      "file__cwd",
      "string",
      [],
      []
    );
    if (errno > 0) {
      return { error: errnoToString(errno) };
    }
    return { cwd: returnVal, error: null };
  }
};
