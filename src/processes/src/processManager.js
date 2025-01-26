export default class ProcessManager {
  constructor() {
    // List of active processes managed by this process manager
    this.processes = [];
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
    // Create MessageChannels for inter-process communication
    const stdinChannel = new MessageChannel();
    const stdoutChannel = new MessageChannel();
    const stderrChannel = new MessageChannel();

    // Instantiate the worker with the provided script
    const worker = new Worker(processScript);

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

    // Temporary stdout and stderr handlers: log to the console
    stdoutChannel.port2.onmessage = (e) => {
      console.log(`[STDOUT]: ${e.data}`)
    }
    stderrChannel.port2.onmessage = (e) => {
      console.error(`[STDERR]: ${e.data}`)
    }

    // Store the process details
    const process = {
      worker,
      stdin: stdinChannel.port2,
      stdout: stdoutChannel.port2,
      stderr: stderrChannel.port2,
    };

    this.processes.push(process)

    // Return the recently pushed process
    return process;
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
