import { ProcessStates, ProcessOperations } from "./common.js";

export default class ProcessManager {
  // Private field containing an array of processes
  #processes

  constructor() {
    // List of active processes managed by this process manager
    this.#processes = [];
  }

   /**
     * Creates a new process wrapper around a Web Worker.
     * 
     * @param {string} processScript - The path to the Web Worker script.
     * @param {function} func - A JavaScript function that will be dynamically sent to the worker.
     *                          The function must handle a MessageChannel event as its only argument.
     *                          By default, the function computes Fibonacci numbers as a demo.
     * @returns {Object} An object representing the created process, containing:
     *                   - `worker`: The Web Worker instance.
     *                   - `stdin`: A MessagePort for sending input to the worker.
     *                   - `stdout`: A MessagePort for receiving standard output from the worker.
     *                   - `stderr`: A MessagePort for receiving error output from the worker.
     */
  createProcess(processScript = "processes/src/process.js", func = exampleFunction) {
    // TODO: Possibly refactor processes into a class for better design

    // ============= Initialise Process ============= 

    // Create MessageChannels for inter-process communication
    const stdinChannel = new MessageChannel();
    const stdoutChannel = new MessageChannel();
    const stderrChannel = new MessageChannel();

    // Create process object
    const process = {
      worker: null,
      stdin: stdinChannel.port2,
      stdout: stdoutChannel.port2,
      stderr: stderrChannel.port2,
      time: Date.now(),
      state: ProcessStates.STARTING,
    };

    // Instantiate the worker with the provided script
    const worker = new Worker(processScript, { type: "module" });
    
    // ============= Define process/manager communication ============= 

    // Onmessage used for the process communicating with the manager
    worker.onmessage = (e) => this.#handleSignalFromProcess(e, process);

    // Onerror just lists errors
    worker.onerror = (e) => console.error(`[PROC_MAN] ERROR: Process reporting error: ${e.data}`);

    // Attach the worker to the process object
    process.worker = worker;

    // ============= Define channel/stream handlers ============= 

    // TEMP: stdout and stderr handlers: log to the console
    stdoutChannel.port2.onmessage = (e) => {
      console.log(`[WORKER STDOUT]: ${e.data}`)
    }
    stderrChannel.port2.onmessage = (e) => {
      console.error(`[WORKER STDERR]: ${e.data}`)
    }

    // ============= Start Worker ============= 

    // Send dedicated ports and function to the worker
    worker.postMessage(
      {
        stdin: stdinChannel.port1,
        stdout: stdoutChannel.port1,
        stderr: stderrChannel.port1,
        func: func.toString()
      },
      [stdinChannel.port1, stdoutChannel.port1, stderrChannel.port1],
    )

    // ============= Save and Return Process ============= 

    // Push the process to the manager's queue/state
    this.#processes.push(process)

    // Return the recently pushed process
    return process;
  }

  listProcesses() {
    if (this.#processes.length > 0) {
      this.#processes.forEach((process, index) => {
        console.log(this.#processToString(process, index));
      });
    } else {
      console.log("No Active Processes");
    }
  }

  #handleSignalFromProcess(e, process) {
      const operation = e.data.op;
      switch (operation) {
        case ProcessOperations.CHANGE_STATE:
          if ("state" in e.data) {
            let newState = e.data.state;
            console.log(`[PROC_MAN] Changing process state to "${newState}"`);
            process.state = newState;
          } else {
            console.error(`[PROC_MAN] ERROR: State undefined for process state change: ${e.data}`);
          }
          break;
      }
  }
  
  #processToString(process, pid) {
    return `Process {
        PID: ${pid},
        Created at: ${new Date(process.time).toISOString()},
        Time alive: ${(Date.now() - process.time)} ms,
        State: ${process.state},
      }`
  }
}



/**
 * Example function to demonstrate process functionality.
 * 
 * This function calculates the Fibonacci number for a given input
 * using a recursive approach with memoization. It handles a 
 * MessageChannel event object as its argument.
 * 
 * @param {MessageEvent} e - The event containing input data.
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
