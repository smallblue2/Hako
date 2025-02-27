let getStdIn;
let getStdOut;

onmessage = async (e) => {

  // Redefine getStdIn to be whatever we need it to be
  getStdIn = () => {
    return "HELLO FROM WITHIN THE PROCESS"
  }

  getStdOut = (msg) => {
    console.log("Stdout:", msg);
  }

 
  try {
    // Load WASM
    const {default: initEmscripten} = await import('./main.mjs');

    self.Module = await initEmscripten({
      onRuntimeInitialized: () => {
        self.postMessage("Wasm initialised within worker");
      }
    })

    console.log("Running WASM test()");
    Module._test();
    console.log("Finished WASM test()");

  } catch (err) {
    console.error("Error loading Wasm:", err);
  }
}
