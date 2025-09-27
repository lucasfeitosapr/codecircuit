import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: [
      'src/archived/**/*.test.ts', // Exclude archived test files
      'src/rendering/layers/ImplementationLayer.test.ts', // Empty test file
      'src/rendering/layered-renderer-integration.test.ts', // Empty test file
    ],
  },
});
