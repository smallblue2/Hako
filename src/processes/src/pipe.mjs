export default class Pipe {
  #EOF = 0xFF; // EOF is 255 as we're bound to 8 bits - hopefully OK with ascii/utf8
  #closed = false;

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

  #writeEOF() {
    if (this.#closed) return -1;
    while (true) {
      const wr = Atomics.load(this.control, 1);
      const rd = Atomics.load(this.control, 0);
      if (((wr + 1) % this.data.length) === rd) {
        Atomics.wait(this.control, 0, rd);
        continue;
      }
      this.data[wr] = this.#EOF;
      const newWr = (wr + 1) % this.data.length;
      Atomics.store(this.control, 1, newWr);
      Atomics.notify(this.control, 1, 1);
      break;
    }
    return 0;
  }

  close() {
    this.#writeEOF();
    this.#closed = true;
  }

  isClosed() {
    return this.#closed;
  }

  /**
   * Writes data to buffer.
   * Returns -1 if closed, 0 otherwise
   */
  write(data) {
    if (this.#closed) return -1;

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
    return 0;
  }

  /**
  * Blocks until it has read `exactBytes` of data
  */
  readExact(exactBytes) {
    const result = [];

    // Read up to maxBytes
    for (let i = 0; i < exactBytes;) {
      const rd = Atomics.load(this.control, 0);
      const wr = Atomics.load(this.control, 1);
      // 
      // If buffer is full, wait
      if (rd === wr) {
        Atomics.wait(this.control, 1, wr);
        continue;
      }

      // If buffer is empty or EOF stop
      if (this.data[rd] === this.#EOF) break;

      // Otherwise read one byte
      result.push(this.data[rd]);
      i++;

      // Advance read pointer
      let newRd = (rd + 1) % this.data.length;
      Atomics.store(this.control, 0, newRd);
      Atomics.notify(this.control, 0, 1);
    }
    return this.decoder.decode(new Uint8Array(result));
  }

  /**
  * Blocks until at least 1 byte is available, and then
  * tries to read up to `max_bytes` or EOF
  */
  read(maxBytes) {
    const result = [];

    // Block until we have at least 1 byte or EOF
    while (true) {
      const rd = Atomics.load(this.control, 0);
      const wr = Atomics.load(this.control, 1);

      if (rd !== wr) {
        // There's atleast 1 byte
        break;
      }

      // Wait until there's something to read
      Atomics.wait(this.control, 1, wr);
    }

    // Read up to maxBytes
    for (let i = 0; i < maxBytes; i++) {
      const rd = Atomics.load(this.control, 0);
      const wr = Atomics.load(this.control, 1);

      // If buffer is empty or EOF stop
      if (this.data[rd] === this.#EOF || rd === wr) break;

      // Otherwise read one byte
      result.push(this.data[rd]);

      // Advance read pointer
      let newRd = (rd + 1) % this.data.length;
      Atomics.store(this.control, 0, newRd);
      Atomics.notify(this.control, 0, 1);
    }
    return this.decoder.decode(new Uint8Array(result));
  }

  /**
  * Reads until EOF
  */
  readAll() {
    const result = []
    while (true) {
      const rd = Atomics.load(this.control, 0);
      const wr = Atomics.load(this.control, 1);

      // If buffer is full, wait
      if (rd === wr) {
        Atomics.wait(this.control, 1, wr);
        continue;
      }

      // Only break on EOF
      if (this.data[rd] == this.#EOF) return this.decoder.decode(new Uint8Array(result));
      result.push(this.data[rd]);
      const newRd = (rd + 1) % this.data.length;
      Atomics.store(this.control, 0, newRd);
      Atomics.notify(this.control, 0, 1);
    }
  }

  /**
  * Reads until '\n' or EOF
  */
  readLine() {
    const result = []
    while (true) {
      const rd = Atomics.load(this.control, 0);
      const wr = Atomics.load(this.control, 1);

      // Buffer is empty if the read pointer equals the write pointer
      if (rd === wr) {
        // Buffer empty; wait on the write pointer
        Atomics.wait(this.control, 1, wr);
        continue;
      }

      const byte = this.data[rd];

      // Return on EOF without consuming 
      if (byte == this.#EOF) return this.decoder.decode(new Uint8Array(result));

      // Consume
      result.push(this.data[rd]);
      const newRd = (rd + 1) % this.data.length;
      Atomics.store(this.control, 0, newRd);
      Atomics.notify(this.control, 0, 1);

      // If byte was '\n' (10 in ASCII), break
      if (byte === 10) {
        break;
      }
    }
    return this.decoder.decode(new Uint8Array(result));
  }
}
