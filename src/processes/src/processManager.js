export default class ProcessManager {
  constructor() {
    this.processes = [];
  }

  createProcess(processScript = "processes/src/process.js", func = exampleFunction) {
    // Create channels for the 'process'
    const stdinChannel = new MessageChannel();
    const stdoutChannel = new MessageChannel();
    const stderrChannel = new MessageChannel();

    const worker = new Worker(processScript);

    // Send dedicated ports to the worker
    worker.postMessage(
      {
        stdin: stdinChannel.port1,
        stdout: stdoutChannel.port1,
        stderr: stderrChannel.port1,
        func: func.toString()
      },
      [stdinChannel.port1, stdoutChannel.port1, stderrChannel.port1],
    )

    // TODO: Figure out wrappers around these message channel streams
    // For now, set stdout and stderr to the console equivelants for now
    stdoutChannel.port2.onmessage = (e) => {
      console.log(`[STDOUT]: ${e.data}`)
    }
    stderrChannel.port2.onmessage = (e) => {
      console.error(`[STDERR]: ${e.data}`)
    }

    // Store this process
    this.processes.push({
      worker,
      stdin: stdinChannel.port2,
      stdout: stdoutChannel.port2,
      stderr: stderrChannel.port2,
    });

    // Return the recently pushed process
    return this.processes[this.processes.length - 1];
  }
}


// Example function of a processes
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
