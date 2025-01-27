import { ProcessOperations } from "./common.js";
import ProcessTable from "./processTable.js";

// The max number of PIDs available to our system
const MAX_PID = 128;

/**
 * The ProcessManager class is responsible for high-level management
 * of worker-based processes. It coordinates the creation of new
 * processes via a ProcessTable, sets up message handling, and
 * provides helper methods like listing processes or retrieving a
 * particular process by PID.
 */
export default class ProcessManager {
  /**
   * @private
   * @type {ProcessTable}
   */
  #processesTable

  /**
   * Creates a new ProcessManager instance with a maximum PID capacity.
   */
  constructor() {
    /**
     * The ProcessTable instance that stores all process data.
     * @private
     */
    this.#processesTable = new ProcessTable(MAX_PID);
  }

  /**
   * Creates a new process (a Web Worker) and returns its PID.
   *
   * @param {string} [processScript="processes/src/process.js"] - The path to the worker script.
   * @param {function} [processFunction=exampleFunction] - The function to be executed by the worker.
   *   This function is stringified and passed to the worker, so it should be a pure function that
   *   can run independently of external scope.
   * @returns {number} - The newly allocated PID.
   *
   * @throws {Error} If the process table is full and cannot allocate another PID.
   */
  createProcess(processScript = "processes/src/process.js", processFunction = exampleFunction) {
    // Allocate space in the process table and retrieve references to the worker and channels
    let { pid, _, stdout, stderr, worker, start } = this.#processesTable.allocateProcess(
      { processScript, processFunction }, // Defined behaviour for web-worker
    );

    // Set up communication from the Worker back to this manager
    // `#handleSignalFromProcess()` will interpret messages from the process
    // like 'CHANGE_STATE'.
    worker.onmessage = (e) => this.#handleSignalFromProcess(e, pid);
    // Log any worker error events to the console
    worker.onerror = (e) => console.error(`[PROC_MAN] ERROR: Process reporting error: ${e.data}`);

    // TEMP: Attach simple console logging to the worker's stdout/stderr
    stdout.onmessage = (e) => console.log(`[WORKER STDOUT]: ${e.data}`);
    stderr.onmessage = (e) => console.error(`[WORKER STDERR]: ${e.data}`);

    // Actually start the Worker via closure
    start();

    // Return the PID for external reference
    return pid;
  }

  /**
   * Retrieves the process object for a given PID.
   *
   * @param {number} pid - The PID of the process to retrieve.
   * @returns {Object|null} - The process object, or null if the PID is invalid or free.
   */
  getProcess(pid) {
    return this.#processesTable.getProcess(pid);
  }

  /**
   * Lists all active processes by printing them to the console.
   */
  listProcesses() {
    this.#processesTable.displayTable();
  }

  /**
   * Handles signals (messages) from a worker. Currently interprets
   * the 'CHANGE_STATE' operation and updates the process state in
   * the process table.
   *
   * @private
   * @param {MessageEvent} e - The message event from the Worker.
   * @param {number} pid - The PID of the Worker that sent this message.
   */
  #handleSignalFromProcess(e, pid) {
    const operation = e.data.op;
    switch (operation) {
      case ProcessOperations.CHANGE_STATE:
        if ("state" in e.data) {
          let newState = e.data.state;
          console.log(`[PROC_MAN] Changing process state to "${newState}"`);
          this.#processesTable.changeProcessState(pid, newState);
        } else {
          console.error(`[PROC_MAN] ERROR: State undefined for process state change: ${e.data}`);
        }
        break;
      default:
        console.warn(`[PROC_MAN] Unknown operation: ${operation}`);
    }
  }
}

/**
 * Example function to demonstrate worker process functionality.
 * This function calculates a Fibonacci number for a given numeric input.
 * It is passed to the worker as a string, then reconstituted via `new Function()`.
 *
 * @param {MessageEvent} e - The message event containing the user input for Fibonacci.
 * @returns {string} A string representing the Fibonacci result.
 * @throws {Error} If the input is not a valid number.
 */
function exampleFunction(e) {
  const input = parseInt(e.data);

  if (isNaN(input)) {
    throw new Error("Invalid input: not a number");
  }

  const memo = {};

  function helper(n) {
    if (n <= 0) return 0;
    if (n === 1 || n === 2) return 1;
    if (n in memo) return memo[n];
    return (memo[n] = helper(n - 1) + helper(n - 2));
  }

  return `fibonacci(${input}) = ${helper(input)}`;
}
