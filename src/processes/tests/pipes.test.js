import { expect } from 'chai';
import { Worker } from 'worker_threads';
import Pipe from '../src/pipe.js';

describe('Pipe Tests', function() {
  this.timeout(10000);

  it('Should correctly write and read a simple message', (done) => {
    const message = "Hello, World!";
    const pipe = new Pipe(64);
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writer.js', {
      workerData: { buffer: pipeBuffer, message }
    });
    const reader = new Worker('./tests/reader.js', {
      workerData: { buffer: pipeBuffer, length: message.length }
    });

    reader.on('message', (msg) => {
      expect(msg).to.equal(message);
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('Should handle wrap-around correctly', (done) => {
    const pipe = new Pipe(10);
    const message = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writer.js', {
      workerData: { buffer: pipeBuffer, message }
    });
    const reader = new Worker('./tests/reader.js', {
      workerData: { buffer: pipeBuffer, length: message.length }
    });

    reader.on('message', (msg) => {
      expect(msg).to.equal(message);
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('Should block on read when empty and then resume', (done) => {
    const message = "BLOCKING READ TEST";
    const pipe = new Pipe(32);
    const pipeBuffer = pipe.getBuffer();

    // Start the reader first so it blocks waiting for data
    const reader = new Worker('./tests/reader.js', {
      workerData: { buffer: pipeBuffer, length: message.length }
    });
    reader.on('message', (msg) => {
      expect(msg).to.equal(message);
      done();
    });
    reader.on('error', done);

    // Delay the writer so the reader must block
    setTimeout(() => {
      const writer = new Worker('./tests/writer.js', {
        workerData: { buffer: pipeBuffer, message }
      });
      writer.on('error', done);
    }, 200);
  });

  it('Should block on write when full and then resume', (done) => {
    const pipe = new Pipe(5);
    const message = "BLOCKING WRITE TEST";
    const pipeBuffer = pipe.getBuffer();

    // Start the writer - it will block if the pipe is full
    const writer = new Worker('./tests/writer.js', {
      workerData: { buffer: pipeBuffer, message }
    });
    writer.on('error', done);

    // Delay the reader to force the writer to block
    setTimeout(() => {
      const reader = new Worker('./tests/reader.js', {
        workerData: { buffer: pipeBuffer, length: message.length }
      });
      reader.on('message', (msg) => {
        expect(msg).to.equal(message);
        done();
      });
      reader.on('error', done);
    }, 300);
  });

  it('Should handle continuous streaming without data loss', (done) => {
    const baseMessage = "STREAM" + Date.now();
    const repeatCount = 1000;
    const fullMessage = baseMessage.repeat(repeatCount);
    const pipe = new Pipe(128);
    const pipeBuffer = pipe.getBuffer();

    const writer = new Worker('./tests/writer.js', {
      workerData: { buffer: pipeBuffer, message: fullMessage }
    });
    const reader = new Worker('./tests/reader.js', {
      workerData: { buffer: pipeBuffer, length: fullMessage.length }
    });
    reader.on('message', (msg) => {
      expect(msg).to.equal(fullMessage);
      done();
    });
    reader.on('error', done);
    writer.on('error', done);
  });

  it('Should exit readAll immediately if no data available', (done) => {
    const pipe = new Pipe(64);
    let data = pipe.readAll();

    expect(data).to.equal("");
    done();
  });

  it('Should return all written data via readAll', (done) => {
    const pipe = new Pipe(1024);
    let msg = "please help me I am trapped inside of this pipe";
    pipe.write(msg);

    let retrieved = pipe.readAll();

    expect(retrieved).to.equal(msg);
    done();
  })

  it('Should return only one line via readLine()', (done) => {
  const pipe = new Pipe(1024);
  let msg = "please help me I am trapped inside of this pipe\nThis should be a secret";
  pipe.write(msg);

  let retrieved = pipe.readLine();

  expect(retrieved).to.equal("please help me I am trapped inside of this pipe\n");
  done();
})

});
