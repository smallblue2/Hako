export default class Signal {
  constructor(buffer = null) {
    // Allocate extra 8 bytes for control
    this.length = 16384;
    this.atomicsOffset = 12;
    this.attachBuffer(buffer || new SharedArrayBuffer(this.length + this.atomicsOffset));
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  attachBuffer(buffer) {
    this.buffer = buffer;
    this.control = new Int32Array(this.buffer, 0, this.atomicsOffset / 3); // [readPtr, writePtr, sleep/Awake]
    this.data = new Uint8Array(this.buffer, this.atomicsOffset, this.length)
  }

  // Return the underlying SharedArrayBuffer.
  getBuffer() {
    return this.buffer;
  }

  // Sleeps a calling process
  sleep() {
    while (true) {
      // Load the wake counter
      let wakeCount = Atomics.load(this.control, 2);
      // If there's a pending awake signal, consume it and return
      if (wakeCount > 0) {
        Atomics.sub(this.control, 2, 1);
        break;
      }
      // Otherwise wait until counter changes
      Atomics.wait(this.control, 2, wakeCount);
    }
  }

  // Wakes any slept processes
  wake() {
    // Increment wake counter
    Atomics.add(this.control, 2, 1);
    // Notify one waiting thread
    Atomics.notify(this.control, 2, 1);
  }

  write(data) {
    data = String(data);
    const encoded = this.encoder.encode(data);
    for (let i = 0; i < encoded.length; i++) {
      while (true) {
        const wr = Atomics.load(this.control, 1);
        const rd = Atomics.load(this.control, 0);
        // Buffer is full if the next write index equals the read pointer
        if (((wr + 1) % this.data.length) === rd) {
          // Buffer full; wait on the read pointer
          Atomics.wait(this.control, 0, rd);
          continue;
        }
        // Write the byte at the current write pointer
        this.data[wr] = encoded[i];
        const newWr = (wr + 1) % this.data.length;
        Atomics.store(this.control, 1, newWr);
        // Notify the reader that new data is available
        Atomics.notify(this.control, 1, 1);
        break;
      }
    }
  }

  // Non-blocking readAll. If empty, instantly returns.
  read() {
    const result = []
    while (true) {
      const rd = Atomics.load(this.control, 0);
      const wr = Atomics.load(this.control, 1);

      // If buffer is empty, break
      if (rd === wr) break;

      result.push(this.data[rd]);
      const newRd = (rd + 1) % this.data.length;
      Atomics.store(this.control, 0, newRd);
      Atomics.notify(this.control, 0, 1);
    }
    return this.decoder.decode(new Uint8Array(result));
  }
}
