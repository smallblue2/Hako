// Import modules for globals and API
import './definitions.js';
import { Tests } from './helperFunctions.js'; 
import { initialiseAPI, Filesystem } from './api.js';

// Define promise, attaching its resolving when Emscripten module initialises
const FilesystemLoaded = new Promise((resolve, reject) => {
  // window.Module is defined by `compiled.js`
  // Predefine any custom behaviour
  window.Module = {
    onRuntimeInitialized: () => {
      console.log("Emscripten Module initialised");
      resolve(Module);
    },
    onAbort: (err) => {
      console.error("Emscripten Module failed to load:", err);
      reject(err);
    },
  };
  
  // TODO: Switch to dynamic import

  // Start loading the `compiled.js` file
  // Hacky - just add script import to body
  const script = document.createElement('script');
  script.src = "./filesystem/compiled.js"; // WARNING: Relative path
  script.onerror = () => reject(new Error("Failed to load compiled.js"));
  document.body.appendChild(script);
});

// Wait for the module to initialise and then interact with the API
FilesystemLoaded.then((Module) => {
  initialiseAPI(Module); // Call API initialisation logic
}).catch((err) => {
  console.error("Error intialising Module:", err);
});

// Incase any scripts need ModulePromise
export default FilesystemLoaded;

// Attach anything global to the window
window.FilesystemLoaded = FilesystemLoaded;
window.Filesystem = Filesystem;
window.Tests = Tests;
