// <h1>Web Worker Experiment</h1>
// <label for="numberInput">Fibonacci Sequence</label>
// <input type="number" id="numberInput"></input>
// <br />
// <label for="stdoutSwitch">(ON: stdout | OFF: console)</label>
// <input type="checkbox" id="stdoutSwitch"></input>
// <br />
// <button id="button">Launch Job</button>
// <br />
// <p>stdout:</p>
// <p id="stdout"></p>

let toggle = document.getElementById("stdoutSwitch");
let isToggled = false;
toggle.onchange = (_) => {
  isToggled = !isToggled;
}
let numberInput = document.getElementById("numberInput");
let button = document.getElementById("button");

button.onclick = (_) => {

  let stdinChannel = new MessageChannel();
  let stdin = stdinChannel.port1;
  let stdoutChannel = new MessageChannel();
  let stdout = stdoutChannel.port1;
  let terminalChannel = new MessageChannel();
  let terminal = terminalChannel.port1;

  // Capturing stdout
  stdout.onmessage = (e) => { // Proc -> Stdout
    let stdout = document.getElementById("stdout");
    stdout.textContent = `stdout $> ${e.data}`;
  };
  // Capturing messages to terminal
  terminal.onmessage = (e) => {
    console.log(e.data);
  }

  let worker = new Worker("worker.js");
  let workerStdin = stdinChannel.port2;
  let workerStdout = isToggled ? stdoutChannel.port2 : terminalChannel.port2
  worker.postMessage(
    {
      stdin: workerStdin,
      stdout: workerStdout
    },
    [workerStdin, workerStdout]
  );
  stdin.postMessage(numberInput.value);
} 
