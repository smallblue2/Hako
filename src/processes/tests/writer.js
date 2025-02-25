import { workerData } from 'worker_threads';
import Pipe from '../src/pipe.js';

const { buffer, message } = workerData;
const pipe = new Pipe(0, buffer);
pipe.write(message);
