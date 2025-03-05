/*
 * This file intercepts Emscripten's process system and registers it to our own.
 */

// function runs in webworker with data posted from processManager in main thread
async function initWorkerForProcess(data) {
  // Import process constructs
  const { default: Signal } = await import("/signal.js?url");
  const { default: Pipe } = await import("/pipe.js?url");
  const { StreamDescriptor, ProcessStates, ProcessOperations } = await import("/common.js?url");

  console.log(Signal);
  console.log(data.signal);

  function changeState(newState) {
    self.state = newState;
    self.postMessage({
      op: ProcessOperations.CHANGE_STATE,
      state: newState
    });
  }

  // Attach process constructs to worker global scope
  self.emscriptenBuffer = data.emscriptenBuffer;
  self.emscriptenMemory = {
    HEAP8: new Int8Array(self.emscriptenBuffer),
    HEAP16: new Int16Array(self.emscriptenBuffer),
    HEAPU8: new Uint8Array(self.emscriptenBuffer),
    HEAPU16: new Uint16Array(self.emscriptenBuffer),
    HEAP32: new Int32Array(self.emscriptenBuffer),
    HEAPU32: new Uint32Array(self.emscriptenBuffer),
    HEAPF32: new Float32Array(self.emscriptenBuffer),
    HEAPF64: new Float64Array(self.emscriptenBuffer)
  }

  self.emscriptenFuncs = {
    
  }

  self.proc = {
    pid: data.pid,
    stdin: new Pipe(0, data.stdin),
    stdout: new Pipe(0, data.stdout),
    stderr: new Pipe(0, data.stderr),
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
    isPipeable: (stream) => {
      switch (stream) {
        case StreamDescriptor.STDIN: return data.pipeStdin;
        case StreamDescriptor.STDOUT: return data.pipeStdin;
      }
    }
  }

  // self.list = () => {
  //   self.postMessage({
  //     op: ProcessOperations.GET_PROCESS_LIST,
  //     requestor: self.pid
  //   })
  //   changeState(ProcessStates.SLEEPING);
  //   self.signal.sleep();
  //   changeState(ProcessStates.RUNNING);
  //   // TODO: care about the error that this may throw
  //   let list = JSON.parse(self.signal.read());
  //   let heapAllocationSize = list.length * 20 // C 'Process' struct is 16 bytes long
  //   // WARNING: NEEDS TO BE FREED IN C
  //   let memPointer = Module._malloc(heapAllocationSize);
  //   // pid: index,
  //   // created: entry.time,
  //   // alive: Date.now() - entry.time,
  //   // state: entry.state
  //   let offsetCounter = 0;
  //   list.forEach((item, index) => {
  //     console.log("Assigning:", item);
  //     Module.setValue(offsetCounter + memPointer, item.pid, 'i32');
  //     Module.setValue(offsetCounter + memPointer + 4, item.alive, 'i32');
  //     Module.setValue(offsetCounter + memPointer + 8, Number(BigInt(item.created) & 0xFFFFFFFFn), 'i32');
  //     Module.setValue(offsetCounter + memPointer + 12, Number((BigInt(item.created) >> 32n) & 0xFFFFFFFFn), 'i32');
  //     Module.setValue(offsetCounter + memPointer + 16, item.state, 'i32')
  //     offsetCounter = index * 20
  //   })

  //   return memPointer
  // }
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
