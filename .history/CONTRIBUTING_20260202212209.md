# Contributing to NLCI

Thank you for your interest in contributing to NLCI! This document provides guidelines and instructions for contributing.

## 🎯 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and constructive
- Focus on what is best for the community
- Show empathy towards others
- Accept constructive criticism gracefully

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- PNPM 8.15.0
- Git
- VS Code (recommended)

### Development Setup

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/NLCI.git
cd NLCI

# Add upstream remote
git remote add upstream https://github.com/iamthegreatdestroyer/NLCI.git

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Project Structure

```
NLCI/
├── apps/               # Applications (CLI, VS Code extension)
├── packages/           # Shared packages
├── docs/               # Documentation
├── examples/           # Example projects
├── benchmarks/         # Performance benchmarks
└── models/             # Neural embedding models
```

## 🔄 Development Workflow

### 1. Create a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Conventions

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `perf/` - Performance improvements
- `refactor/` - Code refactoring
- `test/` - Test additions/fixes

### 2. Make Changes

#### Code Style

- Follow TypeScript best practices
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

#### Type Safety

```typescript
// ✅ Good - Explicit types
function processCodeBlock(block: CodeBlock): CloneResult {
  // implementation
}

// ❌ Bad - No types
function processCodeBlock(block) {
  // implementation
}
```

#### Error Handling

```typescript
// ✅ Good - Return Result type
import { Result } from '@nlci/shared';

function parseFile(path: string): Result<ParsedFile> {
  try {
    // parsing logic
    return Result.ok(parsed);
  } catch (error) {
    return Result.err(error as Error);
  }
}

// ❌ Bad - Throw exceptions
function parseFile(path: string): ParsedFile {
  // might throw
}
```

### 3. Write Tests

All new features and bug fixes must include tests.

```typescript
import { describe, it, expect } from 'vitest';
import { LshIndex } from '../lsh-index';

describe('LshIndex', () => {
  it('should insert and query vectors', () => {
    const index = new LshIndex({ numTables: 10, numBits: 8 });
    const vector = new Float32Array([0.1, 0.2, 0.3]);

    index.insert('test-id', vector);
    const candidates = index.query(vector);

    expect(candidates).toContain('test-id');
  });
});
```

### 4. Run Quality Checks

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Formatting
pnpm format

# All tests
pnpm test

# Build
pnpm build
```

### 5. Commit Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat: add support for Python code blocks"
```

#### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Test additions or fixes
- `chore` - Build process or auxiliary tool changes

**Examples:**

```
feat(core): add semantic similarity threshold configuration

Add a configurable threshold for filtering semantic clones.
This allows users to tune precision vs recall.

Closes #123
```

```
fix(cli): resolve file path normalization on Windows

Normalize backslashes to forward slashes for consistent
path handling across platforms.

Fixes #456
```

### 6. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

## 📝 Pull Request Guidelines

### PR Title

Use the same format as commit messages:

```
feat(scope): short description
```

### PR Description

Include:

1. **What**: What does this PR do?
2. **Why**: Why is this change needed?
3. **How**: How does it work?
4. **Testing**: How was it tested?
5. **Screenshots**: If UI changes

**Template:**

```markdown
## Description

Brief description of changes

## Motivation

Why is this change necessary?

## Changes

- Change 1
- Change 2

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots

(if applicable)

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### PR Review Process

1. **Automated Checks**: CI must pass
2. **Code Review**: At least one approval required
3. **Maintainer Review**: Final approval from maintainers
4. **Merge**: Squash and merge to main

## 🧪 Testing Guidelines

### Unit Tests

- Test individual functions/classes
- Mock external dependencies
- Aim for >90% coverage

### Integration Tests

- Test component interactions
- Use real dependencies where feasible
- Test error scenarios

### E2E Tests (CLI/Extension)

- Test full user workflows
- Use temporary directories for file operations
- Clean up after tests

## 📚 Documentation

### Code Documentation

````typescript
/**
 * Query the LSH index for similar vectors
 *
 * @param vector - Query vector (must match embedding dimension)
 * @param limit - Maximum number of candidates to return
 * @returns Array of candidate IDs sorted by Hamming distance
 *
 * @example
 * ```typescript
 * const candidates = index.query(embedding, 10);
 * console.log(`Found ${candidates.length} candidates`);
 * ```
 */
query(vector: Float32Array, limit = 100): string[] {
  // implementation
}
````

### User Documentation

- Update `docs/` when adding features
- Include code examples
- Add troubleshooting tips

## 🐛 Bug Reports

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

Include:

- NLCI version
- Node.js version
- OS and version
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

## 💡 Feature Requests

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

Include:

- Clear use case
- Proposed solution
- Alternatives considered
- Additional context

## 🔍 Code Review Checklist

Reviewers should check:

- [ ] Code follows project style
- [ ] Changes are well-tested
- [ ] Documentation is updated
- [ ] No unnecessary complexity
- [ ] Performance considerations addressed
- [ ] Security implications considered
- [ ] Breaking changes documented

## 📦 Release Process

Releases are managed by maintainers:

1. Version bump via Changesets
2. Update CHANGELOG.md
3. Create GitHub release
4. Publish to npm
5. Update documentation

## 🎓 Learning Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Turborepo Docs](https://turbo.build/repo/docs)
- [Vitest Documentation](https://vitest.dev/)
- [LSH Tutorial](https://www.pinecone.io/learn/locality-sensitive-hashing/)

## 💬 Questions?

- Open a [GitHub Discussion](https://github.com/iamthegreatdestroyer/NLCI/discussions)
- Check existing [Issues](https://github.com/iamthegreatdestroyer/NLCI/issues)
- Review [Documentation](docs/)

## 🙏 Recognition

Contributors are recognized in:

- README.md
- Release notes
- GitHub contributors page

Thank you for contributing to NLCI! 🚀
