// Import modules for globals and API
import './definitions.js';
import { initialiseAPI, Filesystem } from './api.js';

window.isFilesystemInitialised = false;

// Define a promise for loading the Emscripten module
const LoadFilesystem = (async () => {
  try {
    // Dynamically load the emscripten module
    const { default: initEmscripten } = await import('./compiled.mjs'); // WARNING: RELATIVE PATH

    // Initialise the emscripten module
    const Module = await initEmscripten({
      onRuntimeInitialized: () => {
        console.log("Filesystem Emscripten module loaded.");
      }
    });

    return Module
  } catch (err) {
    console.error("Filesystem Emscripten module failed to load:", err);
    throw err;
  }
})();

LoadFilesystem.then((Module) => {
  // Initialised the Filesystem API
  initialiseAPI(Module);
  // Attach to the global scope
  window.isFilesystemInitialised = true;
  window.Filesystem = Filesystem;
}).catch((err) => {
  console.error("Failed to define filesystem API:", err);
  rejectFilesystemInitialised(err);
});
