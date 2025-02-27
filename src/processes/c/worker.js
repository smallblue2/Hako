var stdinPipe;
var stdoutPipe;

var getStdIn;
var sendToStdOut;

onmessage = async (e) => {
  const { default: Pipe } = await import('./pipe.js');

  // Overwriting stdin
  if (e.data.stdinBuffer) {
    console.log("Overwriting stdinPipe + getStdIn");
    stdinPipe = new Pipe(0, e.data.stdinBuffer);
    getStdIn = () => {
      return stdinPipe.readLine();
    }
  }

  // Overwriting stdout
  if (e.data.stdoutBuffer) {
    console.log("Overwriting stdoutPipe + sendToStdOut");
    stdoutPipe = new Pipe(0, e.data.stdoutBuffer);
    sendToStdOut = (msg) => {
      stdoutPipe.write(msg);
    }
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
