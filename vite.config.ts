import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { sqlGlobPlugin } from './vite-plugin-sql-glob.ts';

export default defineConfig({
	plugins: [sveltekit(), sqlGlobPlugin()]
});
