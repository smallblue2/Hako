export default class Pipe {
  /**
   * Create a Pipe that uses a SharedArrayBuffer.
   * @param {number} size The capacity of the data region.
   * @param {SharedArrayBuffer|null} buffer Optionally provide an existing buffer.
   */
  constructor(size, buffer = null) {
    // Allocate extra 8 bytes for control (read and write pointers)
    // One slot is kept empty to distinguish full from empty.
    this.attachBuffer(buffer || new SharedArrayBuffer(size + 8));
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  attachBuffer(buffer) {
    this.buffer = buffer;
    // Use an Int32Array for the control region (2 integers: read and write pointers)
    this.control = new Int32Array(this.buffer, 0, 2);
    // Data region starts at byte offset 8.
    this.data = new Uint8Array(this.buffer, 8, this.buffer.byteLength - 8);
  }

  // Return the underlying SharedArrayBuffer.
  getBuffer() {
    return this.buffer;
  }

  write(data) {
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

  read(amt) {
    const result = [];
    for (let i = 0; i < amt; i++) {
      while (true) {
        const rd = Atomics.load(this.control, 0);
        const wr = Atomics.load(this.control, 1);
        // Buffer is empty if the read pointer equals the write pointer
        if (rd === wr) {
          // Buffer empty; wait on the write pointer
          Atomics.wait(this.control, 1, wr);
          continue;
        }
        result.push(this.data[rd]);
        const newRd = (rd + 1) % this.data.length;
        Atomics.store(this.control, 0, newRd);
        // Notify the writer that space is available.
        Atomics.notify(this.control, 0, 1);
        break;
      }
    }
    return this.decoder.decode(new Uint8Array(result));
  }
}
