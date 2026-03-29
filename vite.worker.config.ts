import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		lib: {
			entry: 'src/lib/hn/queue_backend.ts',
			formats: ['es'],
			fileName: () => 'queue_backend.js'
		},
		outDir: 'build/server/chunks',
		emptyOutDir: false,
		rollupOptions: {
			external: [/^node:/]
		}
	}
});
