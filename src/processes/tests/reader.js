import { workerData, parentPort } from 'worker_threads';
import Pipe from '../src/pipe.js';

const { buffer, length } = workerData;
const pipe = new Pipe(0, buffer);
const result = pipe.read(length);
parentPort.postMessage(result);
