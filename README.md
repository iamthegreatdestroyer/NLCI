# NLCI

**Neural-LSH Code Intelligence** — Sub-linear code similarity detection with O(1) query time

[![CI](https://github.com/iamthegreatdestroyer/nlci/workflows/CI/badge.svg)](https://github.com/iamthegreatdestroyer/nlci/actions)
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg)](LICENSE)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=nlci.nlci-vscode)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D20.0.0-green?logo=node.js)](https://nodejs.org/)

NLCI is a production-ready code clone detection system combining **neural embeddings** with **Locality-Sensitive Hashing (LSH)** for sub-linear similarity search. Unlike traditional O(n²) approaches, NLCI achieves **O(1) average query time** across millions of lines of code with comprehensive tooling including CLI, VS Code extension, and programmatic API.

## 🚀 Quick Start

### CLI

```bash
# Install globally
npm install -g @nlci/cli

# Scan a directory
nlci scan ./src

# Find clones similar to specific file
nlci query ./src/utils.ts

# Generate HTML report
nlci report --format html --output report.html
```

### VS Code Extension

Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=nlci.nlci-vscode) or:

```bash
code --install-extension nlci.nlci-vscode
```

### Programmatic API

```typescript
import { NlciEngine } from '@nlci/core';

const engine = new NlciEngine({
  lsh: { numTables: 20, numBits: 12, embeddingDim: 384 },
  similarity: { threshold: 0.85, minLines: 5 },
});

await engine.indexDirectory('./src');
const clones = await engine.findAllClones();

console.log(`Found ${clones.length} clone pairs`);
```

## ✨ Features

- **⚡ Sub-Linear Performance**: O(1) average query time via LSH (5ms for 1M files)
- **🧠 Neural Embeddings**: 384-dimensional semantic code representations
- **📊 Clone Types**: Detects Type-1 (exact), Type-2 (parameterized), Type-3 (near-miss), Type-4 (semantic)
- **🔍 Multiple Interfaces**: CLI (production-ready), VS Code Extension (332 tests), Programmatic API
- **📈 Scalable**: Handles millions of lines efficiently with 2GB RAM at scale
- **🎯 Accurate**: Configurable precision/recall (85-98% based on preset)
- **💾 Persistent Index**: Save/load index for instant startup
- **📚 Comprehensive Docs**: Full API reference, tutorials, and configuration guides
- **🧪 Well-Tested**: Extensive test coverage across all packages
- **🔧 Type-Safe**: Full TypeScript support with complete type definitions

## 🏗️ Architecture

```
Source Code → Parser → Neural Embedder (384-dim) → LSH Index (L×K tables) → O(1) Query
```

### Key Components

| Component           | Purpose                         | Complexity   |
| ------------------- | ------------------------------- | ------------ |
| **Code Parser**     | Splits code into logical blocks | O(n)         |
| **Neural Embedder** | Generates semantic vectors      | O(n)         |
| **LSH Index**       | Hashes vectors into buckets     | O(1) query   |
| **Query Engine**    | Finds similar blocks            | O(1) average |

### Parameters

- **L (numTables)**: Number of hash tables (default: 20)
  - More tables → higher recall, more memory
- **K (numBits)**: Bits per hash (default: 12)
  - More bits → higher precision, lower recall
- **Threshold**: Similarity threshold 0-1 (default: 0.85)

**Recommended Presets:**

- **Fast**: L=10, K=8, threshold=0.85 (90% recall, 85% precision)
- **Balanced**: L=20, K=12, threshold=0.85 (95% recall, 92% precision)
- **Accurate**: L=30, K=16, threshold=0.90 (98% recall, 97% precision)

## 📖 Documentation

### Core Documentation
- [Getting Started](docs/getting-started.md) — Installation, configuration, and quick starts
- [API Reference](docs/api-reference.md) — Complete API documentation with examples
- [Algorithms](docs/algorithms.md) — LSH implementation and embedding details
- [Architecture](docs/architecture.md) — System design, components, and data flow

### Guides
- [Configuration Guide](docs/guides/configuration.md) — Comprehensive configuration options
- [Performance Tuning](docs/guides/performance-tuning.md) — Optimization strategies and benchmarks

### Tutorials
- [First Scan](docs/tutorials/first-scan.md) — Your first code clone detection
- [Custom Embedder](docs/tutorials/custom-embedder.md) — Integrate custom embedding models
- [CI Integration](docs/tutorials/ci-integration.md) — Add NLCI to CI/CD pipelines

### Package API Documentation
- [@nlci/core API](docs/api/@nlci/core/index.html) — Core engine TypeDoc
- [@nlci/cli API](docs/api/@nlci/cli/index.html) — CLI TypeDoc
- [@nlci/shared API](docs/api/@nlci/shared/index.html) — Shared utilities TypeDoc

### Project
- [Contributing](CONTRIBUTING.md) — Development guide and contribution guidelines
- [Security](SECURITY.md) — Security policies and vulnerability reporting

## 🎯 Clone Detection Types

| Type       | Similarity | Description   | Example                                      |
| ---------- | ---------- | ------------- | -------------------------------------------- |
| **Type-1** | ≥99%       | Exact copies  | Copy-paste with whitespace changes           |
| **Type-2** | 95-99%     | Parameterized | Renamed variables/functions                  |
| **Type-3** | 85-95%     | Near-miss     | Added/deleted/modified statements            |
| **Type-4** | 70-85%     | Semantic      | Same functionality, different implementation |

## 📦 Packages

NLCI is a monorepo containing multiple packages:

| Package        | Description                        | Version                                                                                             |
| -------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `@nlci/core`   | Core engine and LSH implementation | [![npm](https://img.shields.io/npm/v/@nlci/core.svg)](https://www.npmjs.com/package/@nlci/core)     |
| `@nlci/cli`    | Command-line interface             | [![npm](https://img.shields.io/npm/v/@nlci/cli.svg)](https://www.npmjs.com/package/@nlci/cli)       |
| `@nlci/shared` | Shared utilities                   | [![npm](https://img.shields.io/npm/v/@nlci/shared.svg)](https://www.npmjs.com/package/@nlci/shared) |
| `@nlci/config` | Shared configurations              | —                                                                                                   |

## 🛠️ Development

```bash
# Clone repository
git clone https://github.com/iamthegreatdestroyer/nlci.git
cd nlci

# Install dependencies
pnpm install

# Build all packages (uses Turborepo)
pnpm build

# Run all tests
pnpm test

# Run tests in watch mode
