import { ProcessStates, CustomError } from "./common.mjs";
import Pipe from "./pipe.mjs";
import Signal from "./signal.mjs";

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

    /**
     * The default pipe size for processes.
     * @type {number}
     */
    this.pipeSize = 1024;
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
  async allocateProcess(processData) {
    // Find the next available PID
    while (this.nextPID < this.maxPIDs && this.processTable[this.nextPID] !== null) {
      this.nextPID++;
    }

    // Table is full
    if (this.nextPID >= this.maxPIDs) {
      throw new CustomError(CustomError.symbols.PROC_TABLE_FULL);
    }

    // ============= Initialise Process Entry ============= 

    // Create MessageChannels for inter-process communication
    const stdinPipe = new Pipe(this.pipeSize);
    const stdoutPipe = new Pipe(this.pipeSize);
    const stderrPipe = new Pipe(this.pipeSize);
    const signal = new Signal();

    const process = {
      args: processData.args,
      stdin: stdinPipe,
      stdout: stdoutPipe,
      stderr: stderrPipe,
      luaCode: processData.luaCode,
      signal: signal,
      time: Date.now() / 1000,
      state: ProcessStates.STARTING,
      pty: processData.slave,
      pipeStdin: processData.pipeStdin,
      pipeStdout: processData.pipeStdout,
      redirectStdin: processData.redirectStdin,
      redirectStdout: processData.redirectStdout,
      cwd: processData.cwd,
      start: processData.start
    }

    // Place the new process object in the table
    this.processTable[this.nextPID] = process;

    let newProcessPID = this.nextPID++;

    // Attach Module to process
    // Return the allocated PID and increment it
    return {
      pid: newProcessPID,
    };
  }

  async startEmscripten(pid) {
    let process = this.processTable[pid];

    const { default: initEmscripten } = await import("/runtime.mjs?url");

    const Module = await initEmscripten({
      onRuntimeInitialized: () => {
        console.log("Runtime emscripten module loaded");
      },
      pty: process.pty,
      pid: pid,
      noExitRuntime: false
    })

    process.emscriptenBuffer = Module.wasmMemory.buffer;
  }

  registerWorker(pid, worker) {
    let registeredProcess = this.processTable[pid];
    registeredProcess.worker = worker;

    console.log("Attached worker to registeredProcess:");

    registeredProcess.startMsg = {
        cmd: "custom-init",
        args: registeredProcess.args,
        start: registeredProcess.start,
        pid: pid,
        emscriptenBuffer: registeredProcess.emscriptenBuffer,
        signal: registeredProcess.signal.getBuffer(),
        stdin: registeredProcess.stdin.getBuffer(),
        stdout: registeredProcess.stdout.getBuffer(),
        stderr: registeredProcess.stderr.getBuffer(),
        pipeStdin: registeredProcess.pipeStdin,
        pipeStdout: registeredProcess.pipeStdout,
        redirectStdin: registeredProcess.redirectStdin,
        redirectStdout: registeredProcess.redirectStdout,
        luaCode: registeredProcess.luaCode,
        cwd: registeredProcess.cwd
    }

    return;
  }

  /**
   * Retrieves a process record by PID.
   *
   * @param {number} pid - The PID of the process to retrieve.
   * @returns {Object|null} - The process object or null if not found or invalid.
   */
  getProcess(pid) {
    if (pid <= 0 || pid >= this.maxPIDs || this.processTable[pid] === null) {
      throw new CustomError(CustomError.symbols.PROC_NO_EXIST);
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
      throw new CustomError(CustomError.symbols.PROC_NO_EXIST);
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
      throw new CustomError(CustomError.symbols.PROC_NO_EXIST)
    }

    this.processTable[pid].state = newState;
  }

  /**
   * Prints out a summary of all active (non-null) processes in the table.
   * This is a convenience method for debugging.
   */
  getTable() {
    let out = [];
    this.processTable.forEach((entry, index) => {
      if (entry !== null) {
        out.push({
          pid: index,
          created: entry.time,
          alive: (Date.now() / 1000) - entry.time,
          state: entry.state
        });
      }
    });
    return out;
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
        Created at: ${new Date(process.time * 1000).toISOString()},
        Time alive: ${(Date.now() - process.time)} ms,
        State: ${process.state},
      }`
  }
}

