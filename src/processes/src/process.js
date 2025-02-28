import { ProcessStates, ProcessOperations } from "./common.js";
import Pipe from './pipe.js';
import Signal from './signal.js';

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
        requester: this.pid,
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
        requester: this.pid
      });
      this.changeState(ProcessStates.SLEEPING);
      this.signal.sleep();
      this.changeState(ProcessStates.RUNNING);
      return this.signal.get();
    }

    // TODO: Change this to Lua runtime/interpreter
    try {
      // Load WASM
      const {default: initEmscripten} = await import('./runtime.js');

      self.Module = await initEmscripten({
        onRuntimeInitialized: () => {
          console.log("WASM finished initialising inside worker!");
        }
      })

      // ASSUMING _test() EXIST - TEST STUB
      console.log("Running WASM test()");
      this.changeState(ProcessStates.RUNNING);
      Module._test();
      this.changeState(ProcessStates.SLEEPING);
      console.log("Finished WASM test()");

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
