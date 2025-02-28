import { ProcessStates, ProcessOperations } from "./common.js";
import Pipe from './pipe.js';


// =============== PIPES TO OVERRIDE =============== 
self.stdin;
self.stdout;
self.stderr;

// =============== FUNCTION TO OVERRIDE =============== 

// stdin
self.inputLine;
self.input;
self.inputAll;

// stdout
self.output;

// stderr
self.error;

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
  constructor(stdin, stdout, stderr) {
    this.stdin = new Pipe(0, stdin);
    this.stdout = new Pipe(0, stdout);
    this.stderr = new Pipe(0, stderr);
    this.state = ProcessStates.SLEEPING;

    this.func = null;

    // Set stdin to listen for messages
    this.stdin.onmessage = (e) => {
      this.handleInput(e);
    };
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

    // Overwriting functions so the runtime can access
    self.input = (amt) => {
      return this.stdin.read(amt);
    }
    self.inputLine = () => {
      console.log("Reading a line...")
      let s = this.stdin.readLine();
      console.log("Read a line!");
      return s;
    }
    self.inputAll = () => {
      return this.stdin.readAll();
    }
    self.output = (msg) => {
      this.stdout.write(msg);
    }
    self.error = (msg) => {
      this.stderr.write(msg);
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
      Module._test();
      console.log("Finished WASM test()");

    } catch (err) {
      console.error("Error loading Wasm:", err);
    }

  }

  /**
   * Handles input from stdin, as defined in the constructor. This method executes
   * the user-provided function and writes the result to stdout or errors to stderr.
   *
   * @param {MessageEvent} e - Event from stdin containing input data for the process.
   *
   * @throws {Error} If the user-defined function throws an error during execution.
   */
  handleInput(e) {
    try {
      this.changeState(ProcessStates.RUNNING);

      // Execute the function and post the result
      const result = this.func(e);
      this.stdout.postMessage(result);

    } catch (error) {
      // Write any errors to stderr
      this.stderr.postMessage(`Error: ${error}`);
    } finally {
      // Return the process to a sleeping state
      this.changeState(ProcessStates.SLEEPING);
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
  let { stdin, stdout, stderr, sourceCode } = e.data;

  // Create a process instance
  let process = new Process(stdin, stdout, stderr);

  // Initialise the process with a function or other config
  await process.initialise({ sourceCode });
}
