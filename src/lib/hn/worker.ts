import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorkerRequest, WorkerResponse } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const worker = new Worker(
  path.resolve(__dirname, './worker.ts'),
);

const request: WorkerRequest = {
  type: 'sum',
  payload: { a: 2, b: 3 }
};

export function fetch(){

}

export function fetchBackground(){

}

worker.postMessage(request);

worker.on('message', (msg: WorkerResponse) => {
  console.log('Result:', msg.result);
});
