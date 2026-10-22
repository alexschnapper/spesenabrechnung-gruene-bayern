import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' damit die App auch unter https://<user>.github.io/<repo>/ läuft
export default defineConfig({
  base: './',
  plugins: [svelte()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
