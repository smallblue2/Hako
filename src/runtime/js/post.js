/*
 * This file intercepts Emscripten's process system and registers it to our own.
 */

// function runs in webworker with data posted from processManager in main thread
async function initWorkerForProcess(data) {
  // Import process constructs
  const { default: Signal } = await import("/signal.js?url");
  const { default: Pipe } = await import("/pipe.js?url");
  const { ProcessStates, ProcessOperations } = await import("/common.js?url");

  function changeState(newState) {
    self.state = newState;
    self.postMessage({
      op: ProcessOperations.CHANGE_STATE,
      state: newState
    });
  }

  // Attach process constructs to worker global scope
  self.emscriptenMemory = {
    HEAP8: new Int8Array(data.emscriptenBuffer),
    HEAP16: new Int16Array(data.emscriptenBuffer),
    HEAPU8: new Uint8Array(data.emscriptenBuffer),
    HEAPU16: new Uint16Array(data.emscriptenBuffer),
    HEAP32: new Int32Array(data.emscriptenBuffer),
    HEAPU32: new Uint32Array(data.emscriptenBuffer),
    HEAPF32: new Float32Array(data.emscriptenBuffer),
    HEAPF64: new Float64Array(data.emscriptenBuffer)
  }

  self.emscriptenFuncs = {
    
  }

  self.proc = {
    pid: data.pid,
    stdin: new Pipe(0, data.stdin),
    stdout: new Pipe(0, data.stdout),
    stderr: new Pipe(0, data.stderr),
    isInATTY: false,
    isOutATTY: false,
    isErrATTY: false,
    signal: new Signal(data.signal),
    input: (amt) => {
      changeState(ProcessStates.SLEEPING);
      let s = self.proc.stdin.read(amt);
      changeState(ProcessStates.RUNNING);
      return s;
    },
    inputLine: () => {
      changeState(ProcessStates.SLEEPING);
      let s = self.proc.stdin.readLine();
      changeState(ProcessStates.RUNNING);
      return s;
    },
    inputAll: () => {
      changeState(ProcessStates.SLEEPING);
      let s = self.proc.stdin.readAll();
      changeState(ProcessStates.RUNNING);
      return s;
    },
    output: (msg) => {
      self.proc.stdout.write(msg);
    },
    error: (msg) => {
      self.proc.stderr.write(msg);
    },
    wait: (pid) => {
      // Tell the manager we'd like to wait on a process
      self.postMessage({
        op: ProcessOperations.WAIT_ON_PID,
        requestor: self.proc.pid,
        waiting_for: pid
      });
      changeState(ProcessStates.SLEEPING);
      self.proc.signal.sleep();
      changeState(ProcessStates.RUNNING);
    },
    create: (luaPath) => {
      // Tell the manager we'd like to create a process
      self.postMessage({
        op: ProcessOperations.CREATE_PROCESS,
        luaPath,
        requestor: self.proc.pid
      });
      changeState(ProcessStates.SLEEPING);
      self.proc.signal.sleep();
      changeState(ProcessStates.RUNNING);
      let newPID = self.proc.signal.read();
      return Number(newPID);
    },
    kill: (pid) => {
      // Tell the manager we'd like to kill a process
      self.postMessage({
        op: ProcessOperations.KILL_PROCESS,
        kill: pid,
        requestor: self.proc.pid
      })
    },
    list: () => {
      self.postMessage({
        op: ProcessOperations.GET_PROCESS_LIST,
        requestor: self.proc.pid
      });
      changeState(ProcessStates.SLEEPING);
      self.proc.signal.sleep();
      changeState(ProcessStates.RUNNING);
      // TODO: care about the error that this may throw
      return JSON.parse(self.proc.signal.read());
    }
  }
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
