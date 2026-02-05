# Testing Guide for NLCI

This guide provides comprehensive testing strategies, patterns, and best practices for the NLCI project.

## Testing Overview

NLCI uses a comprehensive testing strategy across three levels:

1. **Unit Tests** - Individual component testing
2. **Integration Tests** - Multi-component workflow testing
3. **E2E Tests** - Full system command-line testing
4. **Performance Benchmarks** - Regression detection and optimization

### Test Coverage Requirements

- **Critical paths** (LSH, embeddings, clone detection): 95%+
- **Core packages** (@nlci/core, @nlci/cli): 90%+
- **Supporting packages** (@nlci/shared): 85%+
- **Overall project**: 80%+

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test file.test.ts

# Run with coverage report
pnpm test:coverage

# View coverage report
open coverage/index.html
```

### E2E Tests

```bash
# Run CLI E2E tests
pnpm test:e2e

# Run specific E2E suite
pnpm test:e2e -- commands.test.ts

# Run with verbose output
pnpm test:e2e -- --reporter=verbose
```

### Performance Benchmarks

```bash
# Run all benchmarks
pnpm bench

# Run specific benchmark
pnpm bench -- performance.bench.ts

# Compare with baseline
pnpm bench -- --save
pnpm bench -- --compare
```

## Test Structure

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateHash } from '@nlci/core';

describe('Hash Calculation', () => {
  let input: string;

  beforeEach(() => {
    input = 'test content';
  });

  it('should calculate consistent hash', () => {
    const hash1 = calculateHash(input);
    const hash2 = calculateHash(input);

    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different input', () => {
    const hash1 = calculateHash(input);
    const hash2 = calculateHash(input + ' modified');

    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty input', () => {
    const hash = calculateHash('');

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NlciEngine } from '@nlci/core';

describe('Clone Detection Workflow', () => {
  let engine: NlciEngine;

  beforeAll(() => {
    engine = new NlciEngine();
  });

  it('should index and find clones in workflow', async () => {
    // Index files
    await engine.indexDirectory('./test-files');

    // Find clones
    const clones = await engine.findAllClones();

    // Verify results
    expect(clones.length).toBeGreaterThan(0);
    expect(clones[0]).toHaveProperty('similarity');
  });
});
```

### E2E Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';

describe('CLI Commands', () => {
  it('should scan directory and report clones', async () => {
    const { stdout, stderr } = await execAsync('nlci scan ./test-files');

    expect(stderr).toBe('');
    expect(stdout).toContain('Found');
  });
});
```

## Testing Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach`/`afterEach` for setup/cleanup
- Clean up temporary files and resources

```typescript
beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});
```

### 2. Descriptive Test Names

Write clear, specific test names that describe behavior:

```typescript
// ❌ Bad
it('works', () => {});

// ✅ Good
it('should detect exact clones with 99% similarity', () => {});
```

### 3. AAA Pattern (Arrange-Act-Assert)

```typescript
it('should calculate similarity correctly', () => {
  // ARRANGE
  const block1 = createMockCodeBlock({ content: 'function test() {}' });
  const block2 = createMockCodeBlock({ content: 'function test() {}' });

  // ACT
  const similarity = calculateSimilarity(block1, block2);

  // ASSERT
  expect(similarity).toBeGreaterThan(0.99);
});
```

### 4. Use Test Fixtures

Reuse common test data:

```typescript
import { sampleCodeBlocks, sampleCloneResults } from '@/tests/fixtures';

it('should process clone results', () => {
  const result = processClones(sampleCloneResults);
  expect(result.summary.total).toBe(2);
});
```

### 5. Mock External Dependencies

```typescript
import { vi } from 'vitest';

it('should handle API errors gracefully', async () => {
  vi.mock('@/api', () => ({
    fetchData: vi.fn().mockRejectedValue(new Error('API Error')),
  }));

  await expect(queryAPI()).rejects.toThrow('API Error');
});
```

### 6. Test Error Cases

```typescript
it('should reject invalid input', () => {
  expect(() => {
    validateConfig(null);
  }).toThrow('Config required');
});
```

### 7. Performance Testing

```typescript
it('should complete query in under 100ms', async () => {
  const startTime = performance.now();
  await engine.querySimilar(block);
  const duration = performance.now() - startTime;

  expect(duration).toBeLessThan(100);
});
```

## Coverage Analysis

### Viewing Coverage Reports

```bash
# Generate coverage
pnpm test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage Thresholds

Coverage thresholds are enforced per package:

| Package      | Lines | Functions | Branches | Statements |
| ------------ | ----- | --------- | -------- | ---------- |
| @nlci/core   | 90%   | 90%       | 85%      | 90%        |
| @nlci/cli    | 90%   | 90%       | 85%      | 90%        |
| @nlci/shared | 85%   | 85%       | 80%      | 85%        |
| overall      | 80%   | 80%       | 75%      | 80%        |

### Improving Coverage

1. **Identify gaps**: Run coverage and review HTML report
2. **Test untested branches**: Focus on conditional logic
3. **Add edge cases**: Test boundary conditions
4. **Mock complex dependencies**: Isolate code under test

## CI/CD Integration

### GitHub Actions

Tests run automatically on:

- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

### Coverage Upload

Coverage reports are uploaded to Codecov for tracking:

```bash
codecov --files=./packages/core/coverage/lcov.info
```

## Performance Benchmarking

### Running Benchmarks

```bash
# Run all benchmarks
pnpm bench

# Run specific benchmark file
pnpm bench performance.bench.ts

# Save results as baseline
pnpm bench -- --save

# Compare with baseline
pnpm bench -- --compare
```

### Benchmark Structure

```typescript
import { bench, describe } from 'vitest';

describe('Performance', () => {
  bench('operation completes in reasonable time', () => {
    // Performance-critical code here
    const result = expensiveOperation();
  });
});
```

### Analyzing Results

Benchmark results are saved to `benchmarks/results/benchmark-results.json`:

```json
{
  "name": "operation completes",
  "type": "function",
  "result": {
    "hz": 1000,
    "period": 0.001,
    "mean": 0.001,
    "samples": 100
  }
}
```

## Debugging Tests

### Enable Debug Logging

```bash
# Run tests with debug output
DEBUG=nlci:* pnpm test

# Run specific test with verbose logging
pnpm test -- --reporter=verbose test-file.test.ts
```

### VSCode Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test", "--inspect-brk"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

Then press F5 to start debugging.

### Step Debugging

1. Set breakpoints in VSCode
2. Run tests with `--inspect-brk`
3. Debugger pauses at breakpoints
4. Use VSCode debug console to inspect variables

## Common Test Patterns

### Testing Async Functions

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Promises

```typescript
it('should resolve promise', () => {
  return promise().then((result) => {
    expect(result).toBeDefined();
  });
});
```

### Testing Observables

```typescript
it('should emit values', (done) => {
  observable().subscribe({
    next: (value) => {
      expect(value).toBeDefined();
      done();
    },
  });
});
```

### Testing Callbacks

```typescript
it('should call callback with result', (done) => {
  callbackFunction((error, result) => {
    expect(error).toBeNull();
    expect(result).toBeDefined();
    done();
  });
});
```

## Troubleshooting

### Tests Timeout

```typescript
// Increase timeout for slow tests
it('slow operation', async () => {
  // test code
}, 30000); // 30 second timeout
```

### Flaky Tests

- Avoid time-dependent assertions
- Don't rely on external services
- Use fixed seeds for randomness
- Clean up resources properly

### Memory Leaks

```typescript
afterEach(() => {
  // Cleanup references
  engine.destroy();
  vi.clearAllMocks();
});
```

## Testing Checklist

Before committing code:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage meets thresholds
- [ ] No console errors/warnings
- [ ] Performance benchmarks pass
- [ ] E2E tests pass locally

Before merging to main:

- [ ] All CI checks pass
- [ ] Coverage increased (or maintained)
- [ ] Benchmarks show no regressions
- [ ] Code reviewed
- [ ] Tests reviewed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
