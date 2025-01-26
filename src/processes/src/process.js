// Handle the initial message to set up the worker environment
self.onmessage = (e) => {
  // Extract the channels and serialised function
  const { stdin, stdout, stderr, func } = e.data;

  // Dynamically reconstruct the provided function
  // WARNING: Using `new Function` is inherently risky as it can execute arbitrary code.
  // TODO: Sanitise `func` or ensure it comes from a trusted origin?
  self.func = new Function("e", `return (${func})(e)`);

  // Setup the stdin handler to process incoming messages
  stdin.onmessage = (e) => {
    try {
      // Execute the provided function and send the result to stdout
      stdout.postMessage(self.func(e));
    } catch (error) {
      // Send any errors that occur to the stderr channel
      stderr.postMessage(`Error: ${error.message}`);
    }
  }
}
