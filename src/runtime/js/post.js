/*
 * This file intercepts Emscripten's process system and registers it to our own.
 */

// function runs in webworker with data posted from processManager in main thread
async function initWorkerForProcess(data) {
  // Import process constructs
  const { default: Signal } = await import("/signal.js?url");
  const { default: Pipe } = await import("/pipe.js?url");

  // Attach process constructs to worker global scope
  self.stdin = new Pipe(0, data.stdin);
  self.stdout = new Pipe(0, data.stdout);
  self.stderr = new Pipe(0, data.stderr);
  self.signal = new Signal(data.signal);
}

// Function intercepts thread creation to add a MessageChannel
function interceptThreadCreation() {
  let queue = [];
  let defaultHandleMessage = self.onmessage;

  function goBack() {
    // Set onmessage back
    self.onmessage = defaultHandleMessage;
    for (let msg of queue) { // Run any captured events
      defaultHandleMessage(msg);
    }
  }

  self.onmessage = async (e) => {
    console.log(e.data);
    if (e.data.cmd === "custom-init") {
      await initWorkerForProcess(e.data);
      goBack();
    } else {
      queue.push(e);
    }
  }
}

// Function intercepts main thread to send messages to main thread
function interceptMainThread() {
  let running = PThread.runningWorkers[0];
  if (running === undefined) {
    setTimeout(interceptMainThread, 100);
    return;
  }
  // Register the worker to a process
  window.ProcessManager.registerWorker(running);
}

if (ENVIRONMENT_IS_PTHREAD) {
  interceptThreadCreation();
} else {
  interceptMainThread();
}
