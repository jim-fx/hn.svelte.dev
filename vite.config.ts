import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { sqlGlobPlugin } from './vite-plugin-sql-glob.ts';
import { nodeWorker } from "vite-node-worker";

export default defineConfig({
	plugins: [sveltekit(), sqlGlobPlugin(), nodeWorker()],
  worker: {
    plugins: () => [nodeWorker()]
  }
});
