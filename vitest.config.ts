import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Allow test runs to pass when no test files are found
    passWithNoTests: true,

    // Global test settings
    globals: true,

    // Test file patterns
    include: ['**/*.{test,spec}.{ts,tsx,js,jsx}'],

    // Exclude node_modules and build artifacts
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.turbo/**'],

    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/test/**', '**/*.test.ts', '**/*.spec.ts'],
    },

    // Enable environment
    environment: 'node',

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Reporter
    reporter: ['verbose'],
  },
});
