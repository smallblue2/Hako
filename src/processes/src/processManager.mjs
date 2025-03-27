import { ProcessOperations, StreamDescriptor, CustomError, ProcessExitCodeConventions } from "./common.mjs";
import Signal from "./signal.mjs";
import ProcessTable from "./processTable.mjs";
import Pipe from "./pipe.mjs";

// Allow node to also run (does not have window object)
let isNode = typeof window === 'undefined';

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
  #processesToBeInitialised;
  #Filesystem;
  #onExit

  /**
   * Creates a new ProcessManager instance with a maximum PID capacity.
   */
  constructor(onExit = null) {
    this.#Filesystem = isNode ? globalThis.Filesystem : window.Filesystem;
    /**
     * The ProcessTable instance that stores all process data.
     * @private
     */
    this.#processesTable = new ProcessTable(MAX_PID);
    this.#waitingProcesses = new Map();
    this.#processesToBeInitialised = [];
    this.#onExit = onExit;
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
  async createProcess({ luaPath = "/persistent/sys/shell.lua", args=[], slave = undefined, pipeStdin = false, pipeStdout = false, callerSignal = null, start = false }) {
    if (!isNode && slave === undefined && (pipeStdin == false || pipeStdout == false)) {
      throw new CustomError(CustomError.symbols.PTY_PROCESS_NO_PTY);
    }
    if (!Array.isArray(args)) {
      throw new CustomError(CustomError.symbols.INVALID_PROC_AGS);
    }

    // TODO: Confirm its a lua file, maybe check for shebang or simply just the extension

    // Check the filesystem for the luaPath
    let luaCode = ''
    let { error, fd } = this.#Filesystem.open(luaPath, "r");
    if (fd < 0) {
      throw new CustomError(CustomError.symbols.LUA_FILE_NO_EXIST);
    } else {
      let readResp = this.#Filesystem.readAll(fd);
      luaCode = readResp.data;
      this.#Filesystem.close(fd);
    }

    // Allocate space in the process table and retrieve references to the worker and channels
    let { pid } = await this.#processesTable.allocateProcess(
      { args, slave, pipeStdin, pipeStdout, start, luaCode }, // Defined behaviour for web-worker
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
    this.#processesTable.registerWorker(toRegister, worker);

    // Save emscripten's onmessage in the process
    let proc = this.getProcess(toRegister);
    proc.emscriptenOnMessage = worker.onmessage;

    // Override worker's omessage
    worker.onmessage = (e) => this.#handleSignalFromProcess(e, toRegister, proc);


    // If the process is to be started straight away, start it
    if (proc.start) {
      proc.worker.postMessage(
        proc.startMsg
      )
    }

    // If there is a caller, tell it the PID & wake it up
    if (callerSignal != null) {
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
    } catch (e) {
      throw new CustomError(CustomError.symbols.PROC_NO_EXIST);
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
    console.log("KILL:", pid);
    this.#stopAndCleanupProcess(pid);
    this.#wakeAwaitingProcesses(pid, ProcessExitCodeConventions.KILLED);
  }

  #exitProcess(pid, exitCode) {
    this.#stopAndCleanupProcess(pid);
    this.#wakeAwaitingProcesses(pid, exitCode);
    if (this.#onExit !== null) this.#onExit({ pid, exitCode });
  }

  #stopAndCleanupProcess(pid) {
    // Kill the process
    let toKill = this.getProcess(pid);
    if (!toKill) {
      throw CustomError(CustomError.symbols.PROC_NO_EXIST);
    }
    if (toKill.worker === undefined) {
      throw CustomError(CustomError.symbols.PROC_NO_WORKER);
    }
    toKill.worker.terminate();
    this.#processesTable.freeProcess(pid);
  }

  #wakeAwaitingProcesses(pid, exitCode) {
    // Check if anybody else was waiting on it
    let waitingSet = this.#waitingProcesses.get(pid)
    if (waitingSet) {
      waitingSet.forEach(waitingPID => {
        try {
          let toAwakeProcess = this.getProcess(waitingPID);
          // return exit code before awaking
          toAwakeProcess.signal.write(exitCode);
          toAwakeProcess.signal.wake();
        } catch (e) {
          // INFO: Maybe this shouldn't throw an error, but just report it?
          throw CustomError(CustomError.symbols.WAITING_PROC_NO_EXIST);
        }
      })
    }
  }

  // Pipes the stdout of the first argument to the stdin of the second argument
  pipe(outPid, inPid) {
    // Get first process's stdout buffer
    // Replace second process's stdin buffer
    let outProc = null;
    let inProc = null;
    try {
      outProc = this.getProcess(outPid);
      inProc = this.getProcess(inPid);
    } catch (err) {
      throw err;
    }

    if (!outProc.pipeStdout) {
      throw new CustomError(CustomError.symbols.PROC_NOT_SET_TO_PIPE_STDOUT);
    }
    if (!inProc.pipeStdin) {
      throw new CustomError(CustomError.symbols.PROC_NOT_SET_TO_PIPE_STDIN);
    }

    // If the process to be piped into has already started, throw an error
    if (inProc.start) {
      throw new CustomError(CustomError.symbols.PIPE_STARTED_PROC);
    }

    // Get the stdout buffer from the first process
    let outBuff = outProc.stdout.getBuffer();
    delete inProc.stdin;

    // Update our reference to the inProc's stdin
    inProc.stdin = new Pipe(0, outBuff);
    // Update the stdin buffer we're sending to the process on start
    inProc.startMsg.stdin = outBuff;
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
        let sendBackSignal = new Signal(e.data.sendBackBuffer);

        // Check if process to await on exists
        try {
          this.getProcess(waiting_on);
        } catch (e) {
          if (!(e instanceof CustomError)) console.log("[PROC_MAN] Error waiting on a process:", e);
          sendBackSignal.wake();
        }

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
        const pipeStdin = e.data.pipeStdin;
        const pipeStdout = e.data.pipeStdout;
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
          sendBackSignal.wake();
        }

        try {
          await this.createProcess({ luaPath: e.data.luaPath, args: e.data.args, slave: requestor.pty, pipeStdin, pipeStdout, callerSignal: sendBackSignal });
          // INFO: PID is written to callerSignal after a process is registered to it
        } catch (err) {
          if (!(err instanceof CustomError)) {
            console.error(err);
            sendBackSignal.write(CustomError.symbols.EXTERNAL_ERROR);
          } else {
            sendBackSignal.write(err.code);
          }
          sendBackSignal.wake();
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
        } catch (err) {
          if (!(err instanceof CustomError)) {
            console.error(err);
            sendBackSignal.write(CustomError.symbols.EXTERNAL_ERROR);
          } else {
            sendBackSignal.write(err.code);
          }
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
      case ProcessOperations.PIPE_PROCESSES: {
        let sendBackSignal = new Signal(e.data.sendBackBuffer);
        try {
          this.pipe(e.data.outPid, e.data.inPid);
        } catch (err) {
          if (!(err instanceof CustomError)) {
            console.error(err);
            sendBackSignal.write(CustomError.symbols.EXTERNAL_ERROR);
          } else {
            sendBackSignal.write(err.code);
          }
        }
        sendBackSignal.wake();
        break;
      }
      case ProcessOperations.START_PROCESS: {
        let sendBackSignal = new Signal(e.data.sendBackBuffer);
        try {
          let procToStart = this.getProcess(e.data.pid);
          // Send start message to worker to start it
          procToStart.worker.postMessage(procToStart.startMsg);
          // All executed well
          sendBackSignal.write(0);
        } catch (err) {
          if (!(err instanceof CustomError)) {
            console.error(err);
            sendBackSignal.write(CustomError.symbols.EXTERNAL_ERROR);
          } else {
            sendBackSignal.write(err.code);
          }
        }

        // Wake up calling process
        sendBackSignal.wake();
        break;
      }
      case ProcessOperations.EXIT_PROCESS: {
        let sendBackSignal = new Signal(e.data.sendBackBuffer);
        sendBackSignal.wake();
        let exitCode = e.data.exitCode;
        let pid = e.data.pid;
        this.#exitProcess(pid, exitCode);
        break;
      }
      default:
        // Unknown request, forward onto emscripten's onmessage - as we're intercepting
        proc.emscriptenOnMessage(e);
    }
  }
}
