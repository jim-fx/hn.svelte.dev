import { parentPort } from 'node:worker_threads';
import type { WorkerRequest, WorkerResponse } from './types';

if (!parentPort) {
  throw new Error('Worker must be run as a worker thread');
}

parentPort.on('message', (msg: WorkerRequest) => {
  if (msg.type === 'sum') {
    const result: WorkerResponse = {
      result: msg.payload.a + msg.payload.b
    };

    parentPort!.postMessage(result);
  }
});
