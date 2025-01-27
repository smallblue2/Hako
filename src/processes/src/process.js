import { ProcessStates, ProcessOperations } from "./common.js";

// Change the process state
self.changeState = (newState) => {
  self.postMessage({ op: ProcessOperations.CHANGE_STATE, state: newState });
}

// Signify that we're initially awaiting input
// -> Initial input from `process manager`
self.changeState(ProcessStates.SLEEPING);

// Handle the initial message to set up the worker environment
self.onmessage = (e) => {
  // Notify to the process manager that we're running
  self.changeState(ProcessStates.RUNNING);

  // Extract the channels and serialised function
  const { stdin, stdout, stderr, func } = e.data;

  // Dynamically reconstruct the provided function
  // WARNING: Using `new Function` is inherently risky as it can execute arbitrary code.
  // TODO: Sanitise `func` or ensure it comes from a trusted origin?
  self.func = new Function("e", `return (${func})(e)`);

  // Setup the stdin handler to process incoming messages
  stdin.onmessage = (e) => {
    try {
      // Notify to the process manager that we're running
      self.changeState(ProcessStates.RUNNING);
      // Execute the provided function and send the result to stdout
      stdout.postMessage(self.func(e));
    } catch (error) {
      // Send any errors that occur to the stderr channel
      stderr.postMessage(`Error: ${error.message}`);
    } finally {
      // Notify to the process manager that we're running
      self.changeState(ProcessStates.SLEEPING);
    }
  }

  // Signify that we're finished
  self.changeState(ProcessStates.SLEEPING);
}
