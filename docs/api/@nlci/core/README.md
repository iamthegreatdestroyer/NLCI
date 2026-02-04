[**Documentation v0.0.0**](../../README.md)

***

[Documentation](../../packages.md) / @nlci/core

# @nlci/core

> Neural-LSH Code Intelligence - Sub-linear code similarity detection engine

[![npm version](https://img.shields.io/npm/v/@nlci/core.svg)](https://www.npmjs.com/package/@nlci/core)
[![License](https://img.shields.io/npm/l/@nlci/core.svg)](https://github.com/your-org/nlci/blob/main/LICENSE)

## Features

- **O(1) Query Time**: Find similar code in constant time using Locality-Sensitive Hashing
- **O(n) Indexing**: Efficient codebase indexing with neural embeddings
- **Multi-Probe LSH**: Improved recall without sacrificing speed
- **Clone Detection**: Type-1 through Type-4 code clone identification
- **Language Agnostic**: Support for 20+ programming languages

## Installation

```bash
npm install @nlci/core
# or
pnpm add @nlci/core
# or
yarn add @nlci/core
```

For neural embedding support, also install the ONNX runtime:

```bash
npm install onnxruntime-node
```

## Quick Start

```typescript
import { NLCIEngine } from '@nlci/core';

// Create engine with default config
const engine = new NLCIEngine();

// Index some code
await engine.indexCode(
  `
function add(a: number, b: number): number {
  return a + b;
}
`,
  'math.ts'
);

await engine.indexCode(
  `
function sum(x: number, y: number): number {
  return x + y;
}
`,
  'utils.ts'
);

// Query for similar code
const results = await engine.query(`
function addition(n1: number, n2: number): number {
  return n1 + n2;
}
`);

console.log(results.clones); // Found similar functions!
```

## API Reference

### NLCIEngine

The main entry point for code similarity detection.

```typescript
const engine = new NLCIEngine(config?: Partial<NLCIConfig>);
```

#### Configuration

```typescript
interface NLCIConfig {
  lsh: {
    numTables: number; // Default: 20 (L parameter)
    numBits: number; // Default: 12 (K parameter)
    dimension: number; // Default: 384 (embedding dimension)
    multiProbe: boolean; // Default: true
  };
  embedding: {
    modelPath: string; // Path to ONNX model
    batchSize: number; // Default: 32
  };
  parser: {
    minBlockSize: number; // Default: 10 tokens
    maxBlockSize: number; // Default: 1000 tokens
  };
}
```

#### Methods

##### `indexCode(code, filePath, language?)`

Parses and indexes code into the LSH index.

```typescript
const blocks = await engine.indexCode(sourceCode, 'file.ts', 'typescript');
```

##### `query(code, options?)`

Finds similar code blocks.

```typescript
const results = await engine.query(code, {
  maxResults: 10,
  minSimilarity: 0.8,
  cloneTypes: ['type-2', 'type-3'],
});
```

##### `findSimilar(blockId, options?)`

Finds blocks similar to an already-indexed block.

```typescript
const results = await engine.findSimilar('block-id');
```

##### `findAllClones(options?)`

Finds all clone clusters in the index.

```typescript
const clusters = await engine.findAllClones();
```

##### `getStats()`

Returns index statistics.

```typescript
const stats = engine.getStats();
// { totalBlocks, totalQueries, avgQueryTime, tableDistribution, ... }
```

### Clone Types

| Type   | Description                                        | Similarity |
| ------ | -------------------------------------------------- | ---------- |
| Type-1 | Exact clones (whitespace/comment differences only) | ≥99%       |
| Type-2 | Parameterized clones (renamed identifiers)         | 95-99%     |
| Type-3 | Near-miss clones (statements added/removed)        | 85-95%     |
| Type-4 | Semantic clones (same logic, different syntax)     | 70-85%     |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        NLCIEngine                            │
├──────────────────┬──────────────────┬───────────────────────┤
│   Code Parser    │ Embedding Model  │    Query Engine       │
│   (Tree-sitter)  │   (ONNX/Mock)    │                       │
├──────────────────┴──────────────────┴───────────────────────┤
│                       LSH Index                              │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────────────┐ │
│  │ Table 0 │ Table 1 │ Table 2 │   ...   │ Table L-1       │ │
│  └─────────┴─────────┴─────────┴─────────┴─────────────────┘ │
│                    Random Hyperplanes                        │
└─────────────────────────────────────────────────────────────┘
```

### LSH Algorithm

The LSH index uses random hyperplane projection:

1. **Hash Generation**: Each table has K random hyperplanes
2. **Hash Computation**: `h(v) = sign(hyperplane · v)` produces K-bit hash
3. **Multi-Probe**: Query probes neighboring buckets (Hamming distance ≤ 2)
4. **Candidate Retrieval**: Union of candidates from all L tables

**Complexity**:

- Index: O(L) per block
- Query: O(L × 2^K × probe_count) ≈ O(1) with typical parameters

## Advanced Usage

### Custom Parser

```typescript
import { NLCIEngine, type CodeParser } from '@nlci/core';

class TreeSitterParser implements CodeParser {
  supportedLanguages = ['typescript', 'javascript'] as const;

  parse(source, filePath, language) {
    // Use tree-sitter for parsing
    return { blocks: [...], errors: [], duration: 0 };
  }
}

const engine = new NLCIEngine({}, {
  parser: new TreeSitterParser(),
});
```

### Custom Embedding Model

```typescript
import { NLCIEngine, type EmbeddingModel } from '@nlci/core';

class ONNXEmbedding implements EmbeddingModel {
  dimension = 384;

  async embed(code: string) {
    // Use ONNX runtime
    return new Float32Array(384);
  }

  async embedBatch(codes: string[]) {
    return Promise.all(codes.map((c) => this.embed(c)));
  }
}

const engine = new NLCIEngine(
  {},
  {
    embeddingModel: new ONNXEmbedding(),
  }
);
```

### Persistence

```typescript
// Save index to storage
await engine.save();

// Load index from storage
const loaded = await engine.load();
```

## Performance

Benchmarks on MacBook Pro M1:

| Operation        | Time   | Complexity |
| ---------------- | ------ | ---------- |
| Index 1 block    | ~5ms   | O(L)       |
| Query            | ~0.5ms | O(1)       |
| Index 10K blocks | ~50s   | O(n)       |
| Query 10K blocks | ~0.5ms | O(1)       |

Memory usage: ~100 bytes per indexed block (excluding embeddings)

## Contributing

See [CONTRIBUTING.md](../../_media/CONTRIBUTING.md) for guidelines.

## License

AGPL-3.0-or-later - See [LICENSE](../../_media/LICENSE)
