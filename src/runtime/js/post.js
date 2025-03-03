if (ENVIRONMENT_IS_PTHREAD) {
  let queue = [];
  let defaultHandleMessage = self.onmessage;

  function goBack() {
    // Set onmessage back
    self.onmessage = defaultHandleMessage;
    for (let msg of queue) { // Run any captured events
      defaultHandleMessage(msg);
    }
  }

  self.onmessage = (e) => {
    console.log(e.data);
    if (e.data.massage !== undefined) {
      console.log("FROM THE WORKER: ", e);
      goBack();
    } else {
      queue.push(e);
    }
  }
} else {
  function gammy() {
    let running = PThread.runningWorkers[0];
    if (running === undefined) {
      setTimeout(gammy, 100);
      return;
    }
    running.postMessage({ massage: "SHIT BED" });
  }
  setTimeout(gammy, 100);
}
