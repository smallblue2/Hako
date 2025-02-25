export default class Pipe {
  // Creates a pipe with buffer size of 'size'
  // OR uses passed buffer
  constructor(size, buffer = null) {
    this.attachBuffer(buffer || new SharedArrayBuffer(size + 8));
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  attachBuffer(buffer) {
    this.buffer = buffer;
    // Reserve the first 8 bytes for control (2 Int32s)
    this.data = new Uint8Array(this.buffer, 8, this.buffer.byteLength - 8);
    // control[0] = read pointer, control[1] = write pointer
    this.control = new Int32Array(this.buffer, 0, 2);
  }

  // Returns the underlying SharedArrayBuffer
  getBuffer() {
    return this.buffer;
  }

  write(data) {
    const encodedData = this.encoder.encode(data);

    for (let i = 0; i < encodedData.length; i++) {
      while (true) {
        const currentWriter = Atomics.load(this.control, 1);
        const currentReader = Atomics.load(this.control, 0);

        // Buffer is full when the difference equals the capacity.
        if (currentWriter - currentReader === this.data.length) {
          // Buffer is full. Wait until a reader makes space.
          Atomics.wait(this.control, 1, currentWriter);
          continue;
        }

        // Try to atomically increment the writer pointer.
        const prev = Atomics.compareExchange(
          this.control,
          1,
          currentWriter,
          currentWriter + 1
        );

        if (prev === currentWriter) {
          // Successfully reserved a slot!
          const writeIndex = currentWriter % this.data.length;
          this.data[writeIndex] = encodedData[i];

          // Notify any waiting readers that data is available.
          Atomics.notify(this.control, 0);
          break;
        }
        // Someone got there before us, try again :(
      }
    }
  }

  read(amt) {
    let result = [];

    for (let i = 0; i < amt; i++) {
      while (true) {
        const currentReader = Atomics.load(this.control, 0);
        const currentWriter = Atomics.load(this.control, 1);

        // Buffer is empty when both pointers are equal
        if (currentWriter - currentReader === 0) {
          // Buffer empty, wait for data.
          Atomics.wait(this.control, 0, currentReader);
          continue;
        }

        // Try to atomically increment the reader pointer
        const prev = Atomics.compareExchange(
          this.control,
          0,
          currentReader,
          currentReader + 1
        );

        if (prev === currentReader) {
          // Successfully reserved a read slot
          const readIndex = currentReader % this.data.length;
          result.push(this.data[readIndex]);

          // Notify waiting writers that space is now available
          Atomics.notify(this.control, 1);
          break;
        }
      }
    }

    return this.decoder.decode(new Uint8Array(result));
  }
}
