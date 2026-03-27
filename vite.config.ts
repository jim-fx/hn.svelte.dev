import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { sqlGlobPlugin } from './vite-plugin-sql-glob.ts';
import workerPlugin from "vite-plugin-node-worker";

export default defineConfig({
	plugins: [sveltekit(), sqlGlobPlugin(), workerPlugin()],
  worker: {
    plugins: () => [workerPlugin()],
  },
});
