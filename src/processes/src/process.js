self.onmessage = (e) => {
  // Receive dedicated channels
  const { stdin, stdout, stderr, func } = e.data;

  self.func = new Function("e", `return (${func})(e)`);

  // Define how to handle stdin
  stdin.onmessage = (e) => {
    try {
      // Return the output of the func
      stdout.postMessage(self.func(e));
      // On error, send it to the stderr channel
    } catch (error) {
      stderr.postMessage(`Error: ${error.message}`);
    }
  }
}
