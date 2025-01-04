export const Filesystem = {};

export function initialiseAPI(Module) {
  console.log("Initialising API functions");

  // Cwraps [Function Signatures]
  Filesystem.initialiseFS = Module.cwrap(
    'initialiseFS', // Function name
    'null', // Return type
    [], // Argument types
  )
  Filesystem.syncFS = Module.cwrap(
    'syncFS', // Function name
    'null', // Return type
    [], // Argument types
  )
  Filesystem.fs_open = Module.cwrap(
    'fs_open', // Function name
    'number', // Return type
    ['string', 'number', 'number'], // Argument types
  )
  Filesystem.fs_close = Module.cwrap(
    'fs_close', // Function name
    'number', // Return type
    ['number'], // Argument types
  )
  Filesystem.fs_read = Module.cwrap(
    'fs_read', // Function name
    'number', // Return type
    ['number', 'array', 'number'], // Argument types
  )
  Filesystem.fs_write = Module.cwrap(
    'fs_write', // Function name
    'number', // Return type
    ['number', 'array', 'number'], // Argument types
  )
  Filesystem.fs_lseek = Module.cwrap(
    'fs_lseek', // Function name
    'number', // Return type
    ['number', 'number', 'number'], // Argument types
  )
  Filesystem.printNodeStat = Module.cwrap(
    'printNodeStat', // Function name
    'null', // Return type
    ['string'] // Argument types
  )
}

// Global Module object which Emscripten uses to interact with
// and initialise WASM.
var Module = {
  onRuntimeInitialized: function() {
    console.log("Module initialised!");

    // Cwraps [Function Signatures]
    Filesystem.initialiseFS = Module.cwrap(
      'initialiseFS', // Function name
      'null', // Return type
      [], // Argument types
    )
    Filesystem.syncFS = Module.cwrap(
      'syncFS', // Function name
      'null', // Return type
      [], // Argument types
    )
    Filesystem.fs_open = Module.cwrap(
      'fs_open', // Function name
      'number', // Return type
      ['string', 'number', 'number'], // Argument types
    )
    Filesystem.fs_close = Module.cwrap(
      'fs_close', // Function name
      'number', // Return type
      ['number'], // Argument types
    )
    Filesystem.fs_read = Module.cwrap(
      'fs_read', // Function name
      'number', // Return type
      ['number', 'array', 'number'], // Argument types
    )
    Filesystem.fs_write = Module.cwrap(
      'fs_write', // Function name
      'number', // Return type
      ['number', 'array', 'number'], // Argument types
    )
    Filesystem.printNodeStat = Module.cwrap(
      'printNodeStat', // Function name
      'null', // Return type
      ['string'] // Argument types
    )
  }
}
