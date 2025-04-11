import { workerData, parentPort } from 'worker_threads';
import Pipe from '../src/pipe.mjs';

const { buffer, maxBytes } = workerData;
const pipe = new Pipe(0, buffer);

const result = pipe.read(maxBytes);
parentPort.postMessage(result);
process.exit(0);
