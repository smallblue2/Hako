import { workerData, parentPort } from 'worker_threads';
import Pipe from '../src/pipe.mjs';

const { buffer, exactBytes } = workerData;
const pipe = new Pipe(0, buffer);

const result = pipe.readExact(exactBytes);
parentPort.postMessage(result);
process.exit(0);
