import { parentPort, workerData } from 'worker_threads';
import Pipe from '../src/pipe.js';
let buffer = workerData
const pipe = new Pipe(0, buffer);
pipe.write('A'.repeat(50)); // Write 50 'A's
