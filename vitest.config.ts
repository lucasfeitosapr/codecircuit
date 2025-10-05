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
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'src/archived/**',
        'src/**/*.test.ts',
        'src/test-setup.ts',
        'src/test-utils/**',
        'node_modules/**',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
});
