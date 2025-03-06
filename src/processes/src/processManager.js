import { ProcessOperations, StreamDescriptor, CustomError } from "./common.js";
import Signal from "./signal.js";
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
  async createProcess({slave = undefined, pipeStdin = false, pipeStdout = false, callerSignal = null}) {
    if (slave===undefined && (pipeStdin == false || pipeStdout == false)) {
      throw new CustomError(CustomError.symbols.PTY_PROCESS_NO_PTY);
    }
    // Allocate space in the process table and retrieve references to the worker and channels
    let { pid } = await this.#processesTable.allocateProcess(
      { slave, pipeStdin, pipeStdout }, // Defined behaviour for web-worker
    );

    // Enqueue process to be initialised
    this.#processesToBeInitialised.push([pid, callerSignal]);

    // Return the PID for external reference
    return pid;
  }

  registerWorker(worker) {
    let [toRegister, callerSignal] = this.#processesToBeInitialised.shift();
    if (toRegister === undefined) {
      let error = CustomError.symbols.NO_PROC_FOR_WORKER;
      callerSignal.write(error)
      callerSignal.wake();
      throw new CustomError(error);
    }
    let start = this.#processesTable.registerWorker(toRegister, worker);

    // Save emscripten's onmessage in the process
    let proc = this.getProcess(toRegister);
    proc.emscriptenOnMessage = worker.onmessage;

    // Override worker's omessage
    worker.onmessage = (e) => this.#handleSignalFromProcess(e, toRegister, proc);

    start();
    // If a caller requested this process to be created, give it the PID and wake it up
    if (callerSignal) {
      callerSignal.write(toRegister);
      callerSignal.wake();
    }
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
      throw CustomError(CustomError.symbols.PROC_NO_EXIST);
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
    console.log(toKill);
    if (!toKill)  {
      throw CustomError(CustomError.symbols.PROC_NO_EXIST);
    }
    if (toKill.worker === undefined) {
      throw CustomError(CustomError.symbols.PROC_NO_WORKER);
    }
    toKill.worker.terminate();
    this.#processesTable.freeProcess(pid);

    // Check if anybody else was waiting on it
    let waitingSet = this.#waitingProcesses.get(pid)
    if (waitingSet) {
      waitingSet.forEach(waitingPID => {
        try {
          let toAwakeProcess = this.getProcess(waitingPID);
          toAwakeProcess.signal.wake();
        } catch (e) {
          throw CustomError(CustomError.symbols.WAITING_PROC_NO_EXIST);
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
          throw new CustomError(CustomError.symbols.STATE_NO_EXIST);
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
        let sendBackSignal = new Signal(e.data.sendBackBuffer);
        let requestor = null;
        try {
          requestor = this.getProcess(e.data.requestor);
        } catch (err) {
          if (!(err instanceof CustomError)) {
            console.error(err);
            sendBackSignal.write(CustomError.symbols.EXTERNAL_ERROR);
          } else {
            sendBackSignal.write(err.code);
          }
        }


        try {
          // TODO: How can we set up something to be piped?
          await this.createProcess({slave: requestor.pty, callerSignal: sendBackSignal});
          // INFO: PID is written to callerSignal after a process is registered to it
        } catch (err) {
          if (!(err instanceof CustomError)) {
            console.error(err);
            sendBackSignal.write(CustomError.symbols.EXTERNAL_ERROR);
          } else {
            sendBackSignal.write(err.code);
          }
        }
        // INFO: Calling process is awoken in the processTable when the created process is
        //       registered to an emscripten worker
        break;
      }
      case ProcessOperations.KILL_PROCESS: {
        let sendBackSignal = new Signal(e.data.sendBackBuffer);
        let pidToKill = e.data.kill;
        try {
          this.killProcess(pidToKill);
          sendBackSignal.write(0);
        } catch (e) {
          sendBackSignal.write(`${e}`);
        }
        sendBackSignal.wake();
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
