# NLCI Documentation

**Neural-LSH Code Intelligence** - Lightning-fast code clone detection powered by AI and Locality-Sensitive Hashing.

## What is NLCI?

NLCI is a high-performance code clone detection tool that combines the power of neural code embeddings with the efficiency of Locality-Sensitive Hashing (LSH). It helps you identify duplicate and similar code across your codebase with sub-linear query time.

## Key Features

- 🚀 **Lightning Fast**: O(1) average query time using LSH
- 🧠 **AI-Powered**: CodeBERT embeddings capture semantic similarity
- 🎯 **Accurate**: Detects 4 types of clones (Type-1 to Type-4)
- 📦 **Easy Integration**: CLI, VS Code extension, and programmatic API
- 🔍 **Comprehensive**: Analyzes functions, classes, methods, and more

## Quick Start

```bash
# Install CLI
npm install -g @nlci/cli

# Scan your project
nlci scan ./src

# Query similar code
nlci query path/to/file.ts:10
```

## Components

### Packages

- **@nlci/core**: Core LSH engine and code analysis
- **@nlci/shared**: Shared utilities and types
- **@nlci/cli**: Command-line interface
- **nlci-vscode**: VS Code extension

### Features

- **CodeLens**: Inline clone annotations in your editor
- **Diagnostics**: Clone warnings in the Problems panel
- **Tree View**: Visual clone explorer
- **Reports**: Interactive HTML reports
- **Statistics**: Codebase analysis metrics

## Documentation

- [Getting Started](./tutorials/first-scan.md)
- [CI/CD Integration](./tutorials/ci-integration.md)
- [API Reference](./api/README.md)
- [Configuration Guide](./guides/configuration.md)
- [Performance Tuning](./guides/performance-tuning.md)

## Architecture

NLCI uses a multi-probe LSH index with 20 hash tables and 12-bit hash functions. Code is embedded into 384-dimensional space using CodeBERT, then indexed for fast similarity search.

**Performance Targets**:

- Query time: < 50ms
- Index build: < 60s for 10,000 functions
- Memory: ~100MB for medium codebases

## Clone Types Detected

| Type   | Description         | Example                                      |
| ------ | ------------------- | -------------------------------------------- |
| Type-1 | Exact copies        | Copy-paste with whitespace changes           |
| Type-2 | Renamed identifiers | Same logic, different variable names         |
| Type-3 | Modified statements | Similar logic with minor changes             |
| Type-4 | Semantic clones     | Same functionality, different implementation |

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.
