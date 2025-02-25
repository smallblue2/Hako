export default class Pipe {
  // Creates a pipe with buffer size of 'size'
  // OR uses passed buffer
  constructor(size, buffer = null) {
    this.attachBuffer(buffer || new SharedArrayBuffer(size + 8))

    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  attachBuffer(buffer) {
    this.buffer = buffer;
    this.data = new Uint8Array(this.buffer, 8, this.buffer.byteLength - 8);
    this.control = new Int32Array(this.buffer, 0, 2);
  }

  // Not sure if will need
  getBuffer() {
    return this.buffer;
  }

  write(data) {
    const encodedData = this.encoder.encode(data);

    for (let i = 0; i < encodedData.length; i++) {
      // Check if the buffer is full (writer + 1 === reader)
      while((Atomics.load(this.control, 1) + 1) % this.data.length === Atomics.load(this.control, 0)) {
        // Wait on this.control[1] until this.control[1] changes
        // 
        // This will be woken up by a reader calling notify(this.control, 1)
        // which waits any workers waiting on that index
        Atomics.wait(this.control, 1, Atomics.load(this.control, 1))
      }

      // Get unique write index
      const writeIndex = Atomics.add(this.control, 1, 1) % this.data.length;

      // Safely write data
      this.data[writeIndex] = encodedData[i];

      // Wake up any readers blocked due to buffer being empty
      Atomics.notify(this.control, 0)
    }
  }

  read(amt) {
    let result = [];

    for (let i = 0; i < amt; i++) {
      // Check if the buffer is empty (reader === writer)
      while(Atomics.load(this.control, 0) === Atomics.load(this.control, 1)) {
        // Buffer empty, wait for data
        Atomics.wait(this.control, 0, Atomics.load(this.control, 0));
      }

      // Get unique readIndex
      const readIndex = Atomics.add(this.control, 0, 1) % this.data.length;

      result.push(this.data[readIndex]);

      // Notify writers space is available
      Atomics.notify(this.control, 1);
    }

    return this.decoder.decode(new Uint8Array(result));
  }
}
