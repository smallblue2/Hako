import { ProcessOperations, StreamDescriptor } from "./common.js";
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
  #processesTable;
  #waitingProcesses;
  #processesToBeInitialised

  /**
   * Creates a new ProcessManager instance with a maximum PID capacity.
   */
  constructor() {
    /**
     * The ProcessTable instance that stores all process data.
     * @private
     */
    this.#processesTable = new ProcessTable(MAX_PID);
    this.#waitingProcesses = new Map();
    this.#processesToBeInitialised = [];
  }

  /**
   * Creates a new process (a Web Worker) and returns its PID.
   *
   * @param {string} [processScript="processes/src/process.js"] - The path to the worker script.
   * @param {string} [sourceCode=""] - The lua sourcode to be executed by the worker.
   * @returns {number} - The newly allocated PID.
   *
   * @throws {Error} If the process table is full and cannot allocate another PID.
   */
  async createProcess(slave=undefined, pipeStdin = false, pipeStdout = false) {
    if (slave===undefined) {
      throw new Error("Tried to create a process with no slave PTY!");
    }
    // Allocate space in the process table and retrieve references to the worker and channels
    let { pid } = await this.#processesTable.allocateProcess(
      { slave, pipeStdin, pipeStdout }, // Defined behaviour for web-worker
    );

    // Enqueue process to be initialised
    this.#processesToBeInitialised.push(pid);

    // Set up communication from the Worker back to this manager
    // `#handleSignalFromProcess()` will interpret messages from the process
    // like 'CHANGE_STATE'.
    // worker.onmessage = (e) => this.#handleSignalFromProcess(e, pid);

    // Return the PID for external reference
    return pid;
  }

  registerWorker(worker) {
    let toRegister = this.#processesToBeInitialised.shift();
    if (toRegister === undefined) {
      throw new Error("No processes to register!");
    }
    let start = this.#processesTable.registerWorker(toRegister, worker);

    // Save emscripten's onmessage in the process
    let proc = this.getProcess(toRegister);
    proc.emscriptenOnMessage = worker.onmessage;

    // Override worker's omessage
    worker.onmessage = (e) => this.#handleSignalFromProcess(e, toRegister, proc);

    start();
  }

  /**
   * Retrieves the process object for a given PID.
   *
   * @param {number} pid - The PID of the process to retrieve.
   * @returns {Object|null} - The process object, or null if the PID is invalid or free.
   */
  getProcess(pid) {
    let proc = null;
    try {
      proc = this.#processesTable.getProcess(pid);
    } catch(e) {
      console.error(`[PROC_MAN] Failed to get process: ${e}`)
    }
    return proc;
  }

  /**
   * Lists all active processes by printing them to the console.
   */
  listProcesses() {
    console.log(this.#processesTable.getTable());
  }

  killProcess(pid) {
    // Kill the process
    let toKill = this.getProcess(pid);
    console.log(`toKill: ${toKill}`);
    if (!toKill)  {
      console.error("[PROC_MAN] Couldn't kill process, getProcess returned null");
      return;
    }
    toKill.worker.terminate();
    this.#processesTable.freeProcess(pid);

    // Check if anybody else was waiting on it
    let waitingSet = this.#waitingProcesses.get(pid)
    if (waitingSet) {
      waitingSet.forEach(waitingPID => {
        let toAwakeProcess = this.getProcess(waitingPID);
        if (toAwakeProcess) {
          toAwakeProcess.signal.wake()
        } else {
          console.error(`[PROC_MAN] Process ${waitingPID} was waiting on ${pid}, but Process ${waitingPID} couldn't be retrieved.`)
        }
      })
    }
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
  async #handleSignalFromProcess(e, pid, proc) {
    console.log(`[PROC_MAN] Handling signal from process ${pid}`);
    const operation = e.data.op;
    switch (operation) {
      case ProcessOperations.CHANGE_STATE: {
        if ("state" in e.data) {
          let newState = e.data.state;
          this.#processesTable.changeProcessState(pid, newState);
        } else {
          throw new Error("State undefined for process state change");
        }
        break;
      }
      case ProcessOperations.WAIT_ON_PID: {
        let requestor = e.data.requestor;
        let waiting_on = e.data.waiting_for;
      
        // Store (waiting_for: Set{ requestor })
        let waitingSet = this.#waitingProcesses.get(waiting_on);
        if (!waitingSet) {
          waitingSet = new Set();
          this.#waitingProcesses.set(waiting_on, waitingSet);
        }
        waitingSet.add(requestor);
        break;
      }
      case ProcessOperations.CREATE_PROCESS: {
        let requestor = this.getProcess(e.data.requestor);
        let newPID = -1;
        try {
          newPID = await this.createProcess(requestor.pty);
        } catch (e) {
          console.error(`[PROC_MAN] ${e}`);
        }
        requestor.signal.write(newPID);
        requestor.signal.wake();
        break;
      }
      case ProcessOperations.KILL_PROCESS: {
        let pidToKill = e.data.kill;
        this.killProcess(pidToKill);
        break;
      }
      case ProcessOperations.GET_PROCESS_LIST: {
        let serialised = JSON.stringify(this.#processesTable.getTable());
        let requestor = this.getProcess(e.data.requestor);
        requestor.signal.write(serialised);
        requestor.signal.wake();
        break;
      }
      default:
        console.warn(`[PROC_MAN] Unknown request from process ${pid} - forwarding to emscripten`);
        proc.emscriptenOnMessage(e);
    }
  }
}
