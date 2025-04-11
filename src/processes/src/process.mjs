import { ProcessStates, ProcessOperations } from "./common.js";
import Pipe from './pipe.mjs';
import Signal from './signal.mjs';

// =============== FUNCTION TO OVERRIDE =============== 

// For receiving data back synchronously from process Manager
// when worker is idle
self.blockedResponse = -1;

// stdin
self.inputLine;
self.input;
self.inputAll;

// stdout
self.output;

// stderr
self.error;

// wait
self.wait;

// create
self.create;

// kill
self.kill;

// list
self.list;

/**
 * Represents a single process that runs within a Web Worker.
 *
 * The `Process` class encapsulates the functionality of a worker-based process,
 * providing a structure for handling input, executing user-defined functions,
 * managing states, and communicating via message channels (`stdin`, `stdout`, and `stderr`).
 */
class Process {

  /**
   * Creates a new Process instance with communication streams and a default state
   *
   * @param {MessagePort} stdin - Input stream for the process.
   * @param {MessagePort} stdout - Output stream for the process.
   * @param {MessagePort} stderr - Error stream for the process.
   */
  constructor(pid, stdin, stdout, stderr, signal) {
    this.pid = pid;
    this.stdin = new Pipe(0, stdin);
    this.stdout = new Pipe(0, stdout);
    this.stderr = new Pipe(0, stderr);
    this.signal = new Signal(signal);
    this.state = ProcessStates.SLEEPING;
  }

  /**
   * Initialises the process with any configuration necessary.
   *
   * @param {Object} config - Configuratio object
   * @param {string} config.func - A stringified function to execute. This function will be reconstructed within the process.
   *
   * @throws {Error} If the provided function cannot be parsed or executed.
   */
  async initialise({ sourceCode }) {

    // Redefine onmessage to handle messages from process manager
    self.onmessage = (e) => this.handleSignalFromProcessManager(e);

    // Overwriting functions so the runtime can access
    self.input = (amt) => {
      this.changeState(ProcessStates.SLEEPING);
      let s = this.stdin.read(amt);
      this.changeState(ProcessStates.RUNNING);
      return s;
    }
    self.inputLine = () => {
      this.changeState(ProcessStates.SLEEPING);
      let s = this.stdin.readLine();
      this.changeState(ProcessStates.RUNNING);
      return s;
    }
    self.inputAll = () => {
      this.changeState(ProcessStates.SLEEPING);
      let s = this.stdin.readAll();
      this.changeState(ProcessStates.RUNNING);
      return s;
    }
    self.output = (msg) => {
      this.stdout.write(msg);
    }
    self.error = (msg) => {
      this.stderr.write(msg);
    }
    self.wait = (pid) => {
      // Tell the manager we'd like to wait on a process
      self.postMessage({
        op: ProcessOperations.WAIT_ON_PID,
        requestor: this.pid,
        waiting_for: pid
      });
      this.changeState(ProcessStates.SLEEPING);
      this.signal.sleep();
      this.changeState(ProcessStates.RUNNING);
    }
    self.create = (luaPath) => {
      // Tell the manager we'd like to create a process
      self.postMessage({
        op: ProcessOperations.CREATE_PROCESS,
        luaPath,
        requestor: this.pid
      });
      this.changeState(ProcessStates.SLEEPING);
      this.signal.sleep();
      this.changeState(ProcessStates.RUNNING);
      let data = this.signal.read();
      return Number(data);
    }
    self.kill = (pid) => {
      // Tell the manager we'd like to kill a process
      self.postMessage({
        op: ProcessOperations.KILL_PROCESS,
        kill: pid,
        requestor: this.pid
      })
    }
    self.list = () => {
      self.postMessage({
        op:ProcessOperations.GET_PROCESS_LIST,
        requestor: this.pid
      })
      this.changeState(ProcessStates.SLEEPING);
      this.signal.sleep();
      this.changeState(ProcessStates.RUNNING);

      // TODO: care about the error that this may throw
      let list = JSON.parse(this.signal.read());
      let heapAllocationSize = list.length * 20 // C 'Process' struct is 16 bytes long
      // WARNING: NEEDS TO BE FREED IN C
      let memPointer = Module._malloc(heapAllocationSize);
          // pid: index,
          // created: entry.time,
          // alive: Date.now() - entry.time,
          // state: entry.state
      let offsetCounter = 0;
      list.forEach((item, index) => {
        Module.setValue(offsetCounter + memPointer, item.pid, 'i32');
        Module.setValue(offsetCounter + memPointer + 4, item.alive, 'i32');
        Module.setValue(offsetCounter + memPointer + 8, Number(BigInt(item.created) & 0xFFFFFFFFn), 'i32');
        Module.setValue(offsetCounter + memPointer + 12, Number((BigInt(item.created) >> 32n) & 0xFFFFFFFFn), 'i32');
        Module.setValue(offsetCounter + memPointer + 16, item.state, 'i32')
        offsetCounter = index * 20
      })

      return memPointer
    }

    // TODO: Change this to Lua runtime/interpreter
    try {
      // Load WASM
      const {default: initEmscripten} = await import("/runtime.mjs?url");

      console.log(Module.pty);

      // self.Module = await initEmscripten({
      //   onRuntimeInitialized: () => {
      //     console.log("WASM finished initialising inside worker!");
      //   }
      // })
    } catch (err) {
      console.error("Error loading Wasm:", err);
    }

  }

  handleSignalFromProcessManager(e) {
    const operation = e.data.op;
    switch (operation) {
      default:
        console.warn(`[PROC_MAN] Unknown operation: ${operation}`);
    }
}

  /**
   * Change the process state and notify the main thread of the update.
   *
   * @param {ProcessStates} newState - The new state to transition the process to.
   */
  changeState(newState) {
    this.state = newState;
    self.postMessage({
      op: ProcessOperations.CHANGE_STATE,
      state: newState
    });
  }

  /**
   * Shuts the process down, killing the communication streams.
   */
  shutdown() {
    this.stdin.close();
    this.stdout.close();
    this.stderr.close();
  }
}

// ======================= Worker Event Hooks =======================

/**
 * Handles the initial message from the main thread to set up the Process instance.
 * 
 * @param {MessageEvent} e - Event containing the setup data, including ports and function.
 * @param {MessagePort} e.data.stdin - Input stream for the process.
 * @param {MessagePort} e.data.stdout - Output stream for the process.
 * @param {MessagePort} e.data.stderr - Error output stream for the process.
 * @param {string} e.data.func - A stringified function to be executed by the process.
 * 
 * @example
 * // Main thread
 * worker.postMessage({
 *   stdin: stdinPort,
 *   stdout: stdoutPort,
 *   stderr: stderrPort,
 *   func: "(e) => e.data * 2",
 * });
 */
self.onmessage = async (e) => {
  let { pid, stdin, stdout, stderr, signal, sourceCode } = e.data;

  // Create a process instance
  let process = new Process(pid, stdin, stdout, stderr, signal);

  // Initialise the process with a function or other config
  await process.initialise({ sourceCode });
}
