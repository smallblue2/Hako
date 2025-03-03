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
  #processesTable;
  #waitingProcesses;

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
  async createProcess(pty=null) {
    // TODO: Think more on this
    if (pty === null) {
      throw new Error("No PTY passed for new process");
    }

    // Allocate space in the process table and retrieve references to the worker and channels
    let { pid, start } = await this.#processesTable.allocateProcess(
      { pty }, // Defined behaviour for web-worker
    );

    // Set up communication from the Worker back to this manager
    // `#handleSignalFromProcess()` will interpret messages from the process
    // like 'CHANGE_STATE'.
    // worker.onmessage = (e) => this.#handleSignalFromProcess(e, pid);

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
    console.log(this.#processesTable.getTable());
  }

  killProcess(pid) {
    // Kill the process
    let toKill = this.getProcess(pid);
    if (!toKill) {
      throw new Error("Process does not exist!");
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
  #handleSignalFromProcess(e, pid) {
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
        let newPID = this.createProcess(e.data.luaPath);
        let requestor = this.getProcess(e.data.requestor);
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
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
}
