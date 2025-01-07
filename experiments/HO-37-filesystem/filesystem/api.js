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

    // Save the current stack pointer
    const sp = Module.stackSave();
    
    // Prepare a stack allocation for the result struct (two 32-bit fields)
    const resultStructPtr = Module.stackAlloc(8);

    // TODO: Possibly cwrap this as an optimisation [WANT TO HIDE FROM ENDUSER THOUGH]
    Module.ccall(
      'fs_read', // Function name
      null, // No return
      ['number', 'number', 'number'], // Param type
      [fd, resultStructPtr, amt], // Call with function arguments
    );

    // Extract fileds: rr.data -> offset 0, rr.size -> 4
    const dataPtr = Module.getValue(resultStructPtr, 'i32');
    const size = Module.getValue(resultStructPtr+4, 'i32');


    if (size > 0) {
      // Copy bytes out into a JS TypedArray
      const dataView = new Uint8Array(Module.HEAPU8.buffer, dataPtr, size);
      // Make a copy for a stable buffer in JS
      const copy = new Uint8Array(dataView);

      // Don't need the pointer anymore - free it to avoid WASM memory leaks
      Module.ccall(
        "free_read_ptr",
        null,
        ["number"],
        [dataPtr],
      );
      // Clean up stack too
      Module.stackRestore(sp);

      return { data: copy, size: size };
    } else {
      console.error("read returned error:", size);
      // Clean up
      Module.stackRestore(sp);
      return;
    }
  }
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
}
