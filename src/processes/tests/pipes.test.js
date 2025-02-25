import { expect } from 'chai';
import { Worker, isMainThread, parentPort } from 'worker_threads';
import Pipe from "../src/pipe.js";

describe('Pipe', function() {
  this.timeout(5000);

  it('Should correctly write and read data', () => {
    const pipe = new Pipe(10);
    pipe.write("Hello");
    const output = pipe.read(5);
    expect(output).to.equal("Hello");
  })

  it('Should handle multiple writers', (done) => {
    let numOfWriters = 10;
    const pipe = new Pipe(55 * numOfWriters);

    let writerPromises = []

    // Write a bunch
    for (let i = 0; i < numOfWriters; i++) {
      writerPromises.push(new Promise((resolve, reject) => {
        const writer = new Worker('./tests/writer.js',
          { workerData: pipe.getBuffer() }
        );

        writer.on('exit', () => {
          resolve();
        });

        writer.on('error', reject);

      }));
    }

    let expected = 'A'.repeat(50 * numOfWriters);

    Promise.all(writerPromises).then(() => {
      console.log("All writers finished, starting reader.")
      // Read
      const reader = new Worker('./tests/reader.js',
        { workerData: { buffer: pipe.getBuffer(), numOfWriters: numOfWriters} }
      );

      reader.on('message', (msg) => {
        let readOutput = msg;
        expect(readOutput).to.equal(expected);
        done();
      });

      reader.on('error', done);
    }).catch(done);
  });
});
