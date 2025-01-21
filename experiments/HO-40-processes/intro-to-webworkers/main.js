let input = document.getElementById("numberInput")
let button = document.getElementById("button");

button.onclick = (e) => {
  e.preventDefault();
  let fibNum = parseInt(input.value);
  for (let i = 0; i < fibNum; i++) {
    const worker = new Worker("./webworker.js");
    worker.postMessage(i);
    worker.onmessage = (e) => {
      console.log(`${i}: ${e.data}`);
    }
  }
};
