import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@nlci/core/lsh': resolve(__dirname, 'packages/core/dist/lsh/index.js'),
      '@nlci/core/engine': resolve(__dirname, 'packages/core/dist/engine/index.js'),
      '@nlci/core': resolve(__dirname, 'packages/core/dist/index.js'),
      '@nlci/shared': resolve(__dirname, 'packages/shared/dist/index.js'),
    },
  },
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
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/test/**',
        '**/tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.bench.ts',
        '**/fixtures/**',
        '**/.turbo/**',
      ],
      // Coverage thresholds for critical paths
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        // Per-file thresholds for core packages
        perFile: true,
      },
      // Enforce coverage on critical packages
      all: true,
      include: [
        'packages/core/src/**/*.ts',
        'packages/shared/src/**/*.ts',
        'apps/cli/src/**/*.ts',
        'apps/vscode-extension/src/**/*.ts',
      ],
    },

    // Enable environment
    environment: 'node',

    // Timeouts
    testTimeout: 30000, // Increased for E2E tests
    hookTimeout: 10000,

    // Reporter for tests (not benchmarks)
    reporter: ['verbose'],

    // Output file for test results
    outputFile: './tests/results/test-results.json',

    // Benchmark settings
    benchmark: {
      include: ['**/*.bench.ts'],
      exclude: ['**/node_modules/**', '**/dist/**'],
      outputFile: './benchmarks/results/benchmark-results.json',
    },
  },
});
