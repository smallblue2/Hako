import { O_CREAT, O_RDONLY, O_WRONLY, O_RDWR, errnoToString } from './definitions.js';

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

    console.log(`${fnName} = ${returnVal}`);

    let errno = Module.getValue(errorPointer, 'i32');

    Module.stackRestore(sp);

    return { returnVal, errno };
  }

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

    console.log(`Flags: ${cFlag.toString(8)}`)

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

    let { _, errno } = callWithErrno(
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

    let { _, errno } = callWithErrno(
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

    let { _, errno } = callWithErrno(
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
  Filesystem.test = () => {
    let { error: err0, fd: fd0 } = Filesystem.open("/persistent/test.txt", "cw");
    console.log(`err0: ${err0}, fd0: ${fd0}`);
    Filesystem.write(fd0, "PLEASE");
    Filesystem.close(fd0);
    let { error: err1, fd: fd1 } = Filesystem.open("/persistent/test.txt", "rw");
    console.log(`err1: ${err1}, fd1: ${fd1}`);
    console.log(Filesystem.read(fd1, 6));
    Filesystem.close(fd1);
  }
  console.log("Finished initialising filesystem API");

};
