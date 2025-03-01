import { ProcessStates } from "./common.js";

/**
 * The ProcessTable class is responsible for storing and tracking all
 * active processes (workers). It handles PID allocation and provides
 * methods for retrieving, freeing, and updating processes.
 */
export default class ProcessTable {
  /**
   * @param {number} maxPIDs - The maximum number of processes allowed in the table.
   */
  constructor(maxPIDs) {
    /**
     * The maximum number of processes (PIDs) allowed in this table.
     * @type {number}
     */
    this.maxPIDs = maxPIDs; // Max number of processes

    /**
     * An array used to store process entries. Each entry can be null if
     * the slot is free, or an object containing process info (worker, ports, etc.)
     * @type {Array<Object|null>}
     */
    this.processTable = new Array(maxPIDs).fill(null); // Initialise proc table

    /**
     * The next PID to try allocating. This increments to avoid collisions
     * and is reset when a PID is freed.
     * @type {number}
     */
    this.nextPID = 1; // Start PID allocation from 1
  }

  /**
   * Allocates a new process record and returns a structure containing
   * the PID, message ports, and a `start` function to kick off the worker.
   *
   * @param {Object} processData - An object containing:
   *   - `processScript`: string path to the Worker script
   *   - `processFunction`: function to be stringified for the Worker
   * @returns {Object} An object with the structure:
   *   - `pid`: number - the allocated PID
   *   - `stdin`: MessagePort for input to the worker
   *   - `stdout`: MessagePort for output from the worker
   *   - `stderr`: MessagePort for error output from the worker
   *   - `worker`: the Worker instance
   *   - `start`: a function that sends the initial message (ports + function) to the Worker
   *
   * @throws {Error} If no available PIDs remain.
   */
  allocateProcess(processData) {
    // Find the next available PID
    while (this.nextPID < this.maxPIDs && this.processTable[this.nextPID] !== null) {
      this.nextPID++;
    }

    // Table is full
    if (this.nextPID >= this.maxPIDs) {
      throw new Error("No available PIDs. Process table is full.");
    }

    // ============= Initialise Process Entry ============= 

    // Create MessageChannels for inter-process communication
    const stdinChannel = new MessageChannel();
    const stdoutChannel = new MessageChannel();
    const stderrChannel = new MessageChannel();

    const process = {
      worker: null, // Will be set below
      stdin: stdinChannel.port2,
      stdout: stdoutChannel.port2,
      stderr: stderrChannel.port2,
      time: Date.now(),
      state: ProcessStates.STARTING,
    }

    // Place the new process object in the table
    this.processTable[this.nextPID] = process;

    // Create worker
    const worker = new Worker(processData.processScript, { type: "module" });
    process.worker = worker; // Attach it to the process record

    // Start closure to actually kick-off the process
    let start = () => {
      worker.postMessage(
        {
          stdin: stdinChannel.port1,
          stdout: stdoutChannel.port1,
          stderr: stderrChannel.port1,
          func: processData.processFunction.toString()
        },
        [stdinChannel.port1, stdoutChannel.port1, stderrChannel.port1],
      )
    }

    // Return the allocated PID and increment it
    return {
      pid: this.nextPID++,
      stdin: stdinChannel.port2,
      stdout: stdoutChannel.port2,
      stderr: stderrChannel.port2,
      worker,
      start
    };
  }

  /**
   * Retrieves a process record by PID.
   *
   * @param {number} pid - The PID of the process to retrieve.
   * @returns {Object|null} - The process object or null if not found or invalid.
   */
  getProcess(pid) {
    if (pid <= 0 || pid >= this.maxPIDs || this.processTable[pid] === null) {
      return null; // Process does not exist
    }

    return this.processTable[pid];
  }

  /**
   * Frees the slot for a given PID. If the process is active, the caller
   * is responsible for terminating it before calling freeProcess.
   *
   * @param {number} pid - The PID to free up.
   * @throws {Error} If the PID is invalid or already free.
   */
  freeProcess(pid) {
    // Ensure valid pid
    if (pid <= 0 || pid >= this.maxPIDs || this.processTable[pid] === null) {
      throw new Error(`Invalid or non-existent PID: ${pid}`);
    }

    // TODO: Figure out if the process is running, don't free if it is

    // Free the PID by setting the slot to null
    this.processTable[pid] = null

    // Reset the counter for the pid to be re-used
    this.nextPID = pid;
  }

  /**
   * Updates the process state for the given PID.
   *
   * @param {number} pid - The PID of the process to modify.
   * @param {string} newState - The new state string (e.g., "running", "sleeping").
   * @throws {Error} If the PID is invalid or free.
   */
  changeProcessState(pid, newState) {
    if (pid <= 0 || pid >= this.maxPIDs || this.processTable[pid] === null) {
      throw new Error(`Invalid or non-existent PID: ${pid}`);
    }

    this.processTable[pid].state = newState;
  }

  /**
   * Prints out a summary of all active (non-null) processes in the table.
   * This is a convenience method for debugging.
   */
  displayTable() {
    console.log("Process Table:")
    this.processTable.forEach((entry, index) => {
      if (entry !== null) {
        console.log(this.processToString(entry, index));
      }
    });
  }

  /**
   * Converts a process entry into a human-readable string for logging.
   *
   * @param {Object} process - The process record to format.
   * @param {number} pid - The PID of the process.
   * @returns {string} - A formatted string showing process details.
   */
  processToString(process, pid) {
    return `Process {
        PID: ${pid},
        Created at: ${new Date(process.time).toISOString()},
        Time alive: ${(Date.now() - process.time)} ms,
        State: ${process.state},
      }`
  }
}

