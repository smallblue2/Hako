import { expect } from 'chai';
import { Worker } from 'worker_threads';
import Pipe from '../src/pipe.js';

describe('Pipe Tests', function() {
  this.timeout(10000);

  it('readAll should read until EOF', (done) => {
    const pipe = new Pipe(10);
    const message = "0123456";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader = new Worker('./tests/readAllReader.js', {
      workerData: { buffer: pipeBuffer }
    });

    reader.on('message', (msg) => {
      expect(msg).to.equal(message);
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  
  it('readExact should read until exactBytes consumed', (done) => {
    const pipe = new Pipe(3);
    const message = "0123456789";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerNoEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader = new Worker('./tests/readExactReader.js', {
      workerData: { buffer: pipeBuffer, exactBytes: 10 }
    });

    reader.on('message', (msg) => {
      expect(msg).to.equal(message);
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('readExact should read until EOF', (done) => {
    const pipe = new Pipe(3);
    const message = "0123456789";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader = new Worker('./tests/readExactReader.js', {
      workerData: { buffer: pipeBuffer, exactBytes: 20 }
    });

    reader.on('message', (msg) => {
      expect(msg).to.equal(message);
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('readAll should read until EOF with wrapping buffer multiple times', (done) => {
    const pipe = new Pipe(10);
    const message = "12345678901234567890123456789012345678901234567890";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader = new Worker('./tests/readAllReader.js', {
      workerData: { buffer: pipeBuffer }
    });

    reader.on('message', (msg) => {
      expect(msg).to.equal(message);
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('read should read a maximum of maxBytes', (done) => {
    const pipe = new Pipe(16);
    const message = "Hello, world!"
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerNoEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader = new Worker('./tests/readReader.js', {
      workerData: { buffer: pipeBuffer, maxBytes: 5 }
    });


    reader.on('message', (msg) => {
      expect(msg).to.equal("Hello");
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('read should stop reading at EOF', (done) => {
    const pipe = new Pipe(9);
    const message = "Hello";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader = new Worker('./tests/readReader.js', {
      workerData: { buffer: pipeBuffer, maxBytes: 9 }
    });

    reader.on('message', (msg) => {
      expect(msg).to.equal("Hello");
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('read should stop reading when buffer empty', (done) => {
    const pipe = new Pipe(9);
    const message = "Hello";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerNoEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader = new Worker('./tests/readReader.js', {
      workerData: { buffer: pipeBuffer, maxBytes: 9 }
    });

    reader.on('message', (msg) => {
      expect(msg).to.equal("Hello");
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('readLine should stop reading at a newline', (done) => {
    const pipe = new Pipe(9);
    const message = "Hello\n";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerNoEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader = new Worker('./tests/readLineReader.js', {
      workerData: { buffer: pipeBuffer }
    });

    reader.on('message', (msg) => {
      expect(msg).to.equal(message);
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('readLine should stop reading at a newline message larger than buffer', (done) => {
    const pipe = new Pipe(9);
    const message = "Hello this is a test!\n";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerNoEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader = new Worker('./tests/readLineReader.js', {
      workerData: { buffer: pipeBuffer }
    });

    reader.on('message', (msg) => {
      expect(msg).to.equal(message);
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('readLine should stop reading at EOF', (done) => {
    const pipe = new Pipe(9);
    const message = "Hello, I have no newline character";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader = new Worker('./tests/readLineReader.js', {
      workerData: { buffer: pipeBuffer }
    });

    reader.on('message', (msg) => {
      expect(msg).to.equal(message);
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('EOF shouldn\'t remove existing data in pipe', async () => {
    const pipe = new Pipe(9);
    const message = "123456789";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader0 = new Worker('./tests/readReader.js', {
      workerData: { buffer: pipeBuffer, maxBytes: 5 }
    });

    // Force order
    await new Promise((resolve) => setTimeout(resolve, 100));

    const reader1 = new Worker('./tests/readReader.js', {
      workerData: { buffer: pipeBuffer, maxBytes: 4 }
    });

    return new Promise((resolve, reject) => {
      reader0.on('message', (msg) => {
        expect(msg).to.equal("12345");
      });
      reader1.on('message', (msg) => {
        expect(msg).to.equal("6789");
        resolve();
      })
      reader0.on('error', reject);
      reader1.on('error', reject);
      writer.on('error', reject);
    });
  })

  it('read shouldn\'t consume EOF', async () => {
    const pipe = new Pipe(9);
    const message = "";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader0 = new Worker('./tests/readReader.js', {
      workerData: { buffer: pipeBuffer, maxBytes: 10 }
    });

    await new Promise((resolve) => setTimeout(resolve, 100))

    const reader1 = new Worker('./tests/readAllReader.js', {
      workerData: { buffer: pipeBuffer }
    });

    return new Promise((resolve, reject) => {
      reader0.on('message', (msg) => {
        expect(msg).to.equal("");
      });
      reader1.on('message', (msg) => {
        expect(msg).to.equal("");
        resolve()
      })
      reader0.on('error', reject);
      reader1.on('error', reject);
      writer.on('error', reject);
    });
  })

  it('readAll shouldn\'t consume EOF', async () => {
    const pipe = new Pipe(9);
    const message = "";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader0 = new Worker('./tests/readAllReader.js', {
      workerData: { buffer: pipeBuffer }
    });

    await new Promise((resolve) => setTimeout(resolve, 100))

    const reader1 = new Worker('./tests/readAllReader.js', {
      workerData: { buffer: pipeBuffer }
    });

    return new Promise((resolve, reject) => {
      reader0.on('message', (msg) => {
        expect(msg).to.equal("");
      });
      reader1.on('message', (msg) => {
        expect(msg).to.equal("");
        resolve()
      })
      reader0.on('error', reject);
      reader1.on('error', reject);
      writer.on('error', reject);
    });
  })

  it('readLine shouldn\'t consume EOF', async () => {
    const pipe = new Pipe(9);
    const message = "";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader0 = new Worker('./tests/readLineReader.js', {
      workerData: { buffer: pipeBuffer }
    });

    await new Promise((resolve) => setTimeout(resolve, 100))

    const reader1 = new Worker('./tests/readAllReader.js', {
      workerData: { buffer: pipeBuffer }
    });

    return new Promise((resolve, reject) => {
      reader0.on('message', (msg) => {
        expect(msg).to.equal("");
      });
      reader1.on('message', (msg) => {
        expect(msg).to.equal("");
        resolve()
      })
      reader0.on('error', reject);
      reader1.on('error', reject);
      writer.on('error', reject);
    });
  })

  it('readExact shouldn\'t consume EOF', async () => {
    const pipe = new Pipe(9);
    const message = "";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const reader0 = new Worker('./tests/readExactReader.js', {
      workerData: { buffer: pipeBuffer, exactBytes: 10 }
    });

    await new Promise((resolve) => setTimeout(resolve, 100))

    const reader1 = new Worker('./tests/readAllReader.js', {
      workerData: { buffer: pipeBuffer }
    });

    return new Promise((resolve, reject) => {
      reader0.on('message', (msg) => {
        expect(msg).to.equal("");
      });
      reader1.on('message', (msg) => {
        expect(msg).to.equal("");
        resolve()
      })
      reader0.on('error', reject);
      reader1.on('error', reject);
      writer.on('error', reject);
    });
  })

  it('should handle high throughput with multiple readers', async () => {
    const pipe = new Pipe(1024);  // Large buffer size
    const message = "x".repeat(100000);  // Large message
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writerEOF.js', {
      workerData: { buffer: pipeBuffer, message }
    });

    const readers = Array.from({ length: 5 }, () =>
      new Worker('./tests/readExactReader.js', { workerData: { buffer: pipeBuffer, exactBytes: 20000 } })
    );

    return new Promise((resolve, reject) => {
      let received = 0;

      readers.forEach(reader => {
        reader.on('message', (msg) => {
          received += msg.length;
          if (received === message.length) {
            readers.forEach(r => r.terminate());
            writer.terminate();
            resolve();
          }
        });

        reader.on('error', reject);
      });

      writer.on('error', reject);
    });
  });

  it('isClosed should reflect whether pipe is closed or not', () => {
    const pipe = new Pipe(2);
    pipe.close();
    expect(pipe.isClosed()).to.equal(true);
  });
});
