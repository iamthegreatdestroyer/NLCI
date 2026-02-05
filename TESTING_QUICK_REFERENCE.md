# Testing Quick Reference

Fast reference guide for NLCI testing commands and patterns.

## Quick Start

```bash
# Install and setup
pnpm install
./scripts/setup.sh

# Run tests
pnpm test                    # All tests once
pnpm test:watch             # Watch mode
pnpm test:coverage          # With coverage
pnpm test:e2e               # E2E tests only
pnpm bench                  # Performance benchmarks
```

## Common Commands

### Running Tests

```bash
# Run all tests
pnpm test

# Watch specific file
pnpm test -- src/utils.test.ts

# Run with coverage
pnpm test:coverage

# Run specific test by name
pnpm test -- --grep "should calculate hash"

# Run with verbose output
pnpm test -- --reporter=verbose
```

### Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html    # macOS
xdg-open coverage/index.html # Linux
start coverage/index.html   # Windows

# Check coverage thresholds
pnpm test:coverage -- --coverage.enabled
```

### E2E Testing

```bash
# Run CLI E2E tests
pnpm test:e2e

# Run specific E2E test
pnpm test:e2e -- commands.test.ts

# With verbose output
pnpm test:e2e -- --reporter=verbose
```

### Performance Testing

```bash
# Run benchmarks
pnpm bench

# Save baseline
pnpm bench -- --save

# Compare with baseline
pnpm bench -- --compare

# Specific benchmark
pnpm bench -- performance.bench.ts
```

## Test File Structure

### Unit Test Template

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should do something', () => {
    // Test code
    expect(true).toBe(true);
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Workflow Name', () => {
  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should complete workflow', async () => {
    // Test code
    expect(result).toBeDefined();
  });
});
```

### E2E Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { execAsync } from '@nlci/test-utils';

describe('CLI Commands', () => {
  it('should execute command', async () => {
    const { stdout, stderr } = await execAsync('nlci --help');
    expect(stdout).toContain('Commands');
  });
});
```

## Coverage Goals

| Package      | Lines | Functions | Branches |
| ------------ | ----- | --------- | -------- |
| @nlci/core   | 90%+  | 90%+      | 85%+     |
| @nlci/cli    | 90%+  | 90%+      | 85%+     |
| @nlci/shared | 85%+  | 85%+      | 80%+     |
| Overall      | 80%+  | 80%+      | 75%+     |

## Debugging

### VSCode Debugging

1. Set breakpoint in code
2. Press F5 to start debugger
3. Debugger pauses at breakpoint
4. Use Debug Console to inspect

### Console Logging

```typescript
import { logger } from '@nlci/shared';

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
```

### Enable Debug Logging

```bash
DEBUG=nlci:* pnpm test
```

## Common Patterns

### Testing Async Code

```typescript
it('should handle async', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Errors

```typescript
it('should reject invalid input', () => {
  expect(() => {
    validateConfig(null);
  }).toThrow();
});
```

### Testing with Fixtures

```typescript
import { sampleCodeBlocks } from '@nlci/test-fixtures';

it('should process blocks', () => {
  const result = process(sampleCodeBlocks);
  expect(result).toBeDefined();
});
```

### Mocking

```typescript
import { vi } from 'vitest';

vi.mock('@nlci/api', () => ({
  fetch: vi.fn().mockResolvedValue({ data: 'test' }),
}));

it('should call mocked API', async () => {
  const result = await fetch();
  expect(result.data).toBe('test');
});
```

## Pre-Commit Workflow

```bash
# Make changes
git add .

# Pre-commit hooks run automatically:
# 1. Lint check
# 2. Type check
# 3. Unit tests

# If hooks fail, fix issues and try again
git add .
git commit -m "fix: message"
```

## Pre-Push Workflow

```bash
# Push to feature branch
git push origin feature-branch

# Quick checks run:
# 1. Lint
# 2. Type check

# Push to main/develop branch
git push origin main

# Full checks run:
# 1. Full test suite
# 2. Build verification
# 3. Coverage validation
```

## CI/CD Integration

Tests run automatically on:

- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Manual workflow dispatch

Check status at GitHub Actions tab.

## Troubleshooting

### Tests Won't Run

```bash
# Clear cache
pnpm test -- --clearCache

# Reinstall dependencies
pnpm install

# Check Node version
node --version  # Should be >= 20.0.0
```

### Coverage Not Generated

```bash
# Enable coverage explicitly
pnpm test:coverage

# Check coverage config
cat vitest.config.ts | grep coverage
```

### Performance Test Slow

```bash
# Skip benchmarks during development
pnpm test -- --exclude benchmarks/

# Run specific benchmark
pnpm bench -- performance.bench.ts
```

### Type Errors in Tests

```bash
# Run type check separately
pnpm typecheck

# Fix type issues
# Add types where missing
```

## Resources

- [Vitest Docs](https://vitest.dev/)
- [Testing Guide](./docs/guides/testing.md)
- [API Reference](./docs/api-reference.md)
- [Examples](./examples/)

## Help

```bash
# Show available npm scripts
pnpm

# Get vitest help
pnpm test -- --help

# Check linting issues
pnpm lint

# Fix formatting
pnpm format:fix
```

---

**Keep tests fast, keep code clean, keep quality high!** ✅
