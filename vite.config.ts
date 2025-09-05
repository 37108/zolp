import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	define: {
		global: 'globalThis',
	},
	resolve: {
		alias: {
			path: 'path-browserify',
			fs: 'browserify-fs',
			util: 'util',
		},
	},
	optimizeDeps: {
		include: ['path-browserify', 'util'],
	},
});
