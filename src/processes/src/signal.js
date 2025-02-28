export default class Signal {
  constructor(buffer = null) {
    // Allocate extra 8 bytes for control
    this.attachBuffer(buffer || new SharedArrayBuffer(4));
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  attachBuffer(buffer) {
    this.buffer = buffer;
    this.control = new Int32Array(this.buffer, 0, 1); // [optionalValue]
  }

  // Return the underlying SharedArrayBuffer.
  getBuffer() {
    return this.buffer;
  }

  // Sleeps a calling process
  sleep() {
    Atomics.wait(this.control, 0, 0);
  }

  // Wakes any slept processes
  wake() {
    Atomics.notify(this.control, 0);
  }

  set(msg) {
    Atomics.store(this.control, 0, msg);
  }

  get() {
    let retrieved = Atomics.load(this.control, 0);
    Atomics.store(this.control, 0);
    return retrieved;
  }
}
