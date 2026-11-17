import { defineConfig } from 'vitest/config';

// Opt-in performance benchmarks. Timings depend on the machine, so they're
// excluded from the default run (see D-007 in the local debt map).
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/performance-stress.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
