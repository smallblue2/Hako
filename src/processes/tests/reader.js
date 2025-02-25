import { parentPort, workerData } from 'worker_threads';
import Pipe from '../src/pipe.js';
let buffer = workerData.buffer;
let numOfWriters = workerData.numOfWriters;
const pipe = new Pipe(0, buffer);
const res = pipe.read(numOfWriters * 50)
parentPort.postMessage(res);
