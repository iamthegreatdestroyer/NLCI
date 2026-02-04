# NLCI Architecture

Comprehensive system architecture and design documentation.

## Table of Contents

- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Package Structure](#package-structure)
- [Extension Points](#extension-points)

---

## System Overview

NLCI is a monorepo project built with Turborepo, containing multiple applications and shared packages.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         NLCI System                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │     CLI      │  │   VS Code    │  │  Web Demo    │         │
│  │ Application  │  │  Extension   │  │  (Future)    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                   ┌────────▼────────┐                           │
│                   │   @nlci/core    │                           │
│                   │  NLCI Engine    │                           │
│                   └────────┬────────┘                           │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                │
│         │                  │                  │                 │
│  ┌──────▼───────┐   ┌─────▼─────┐   ┌───────▼────────┐       │
│  │ Code Parser  │   │    LSH    │   │   Embedding    │       │
│  │   & Chunker  │   │   Index   │   │     Model      │       │
│  └──────────────┘   └───────────┘   └────────────────┘       │
│                                                                  │
│                   ┌──────────────┐                              │
│                   │ @nlci/shared │                              │
│                   │   Utilities  │                              │
│                   └──────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### @nlci/core

Core engine implementing LSH-based similarity search.

#### Components

```
@nlci/core/
├── types/                 # TypeScript type definitions
│   ├── code-block.ts     # CodeBlock interface
│   ├── clone-result.ts   # CloneResult interface
│   └── config.ts         # Configuration types
│
├── lsh/                   # LSH implementation
│   ├── hyperplane.ts     # Random hyperplane projections
│   ├── hash-table.ts     # Hash table management
│   ├── bucket-store.ts   # Bucket storage
│   └── lsh-index.ts      # Main LSH index
│
├── engine/                # High-level engine
│   ├── indexer.ts        # File indexing logic
│   ├── query-engine.ts   # Query execution
│   └── nlci-engine.ts    # Main API surface
│
└── parser/                # Code parsing (future)
    └── code-block-parser.ts
```

#### Data Flow

```
Input File
    ↓
[1] CodeBlockParser.parseFile()
    → Splits file into logical code blocks
    ↓
[2] EmbeddingModel.embed()
    → Generates 384-dim vectors
    ↓
[3] LshIndex.insert()
    → Hashes and stores in L tables
    ↓
[4] BucketStore.insert()
    → Stores in hash buckets

Query
    ↓
[1] NlciEngine.query()
    ↓
[2] LshIndex.query()
    → Retrieves candidate IDs from buckets
    ↓
[3] QueryEngine.computeSimilarities()
    → Computes exact similarities
    ↓
[4] Filter & Sort
    → Returns top-k results
```

### @nlci/cli

Command-line interface application.

#### Components

```
@nlci/cli/
├── cli.ts                 # CLI entry point
├── version.ts             # Version command
├── commands/              # Command implementations
│   ├── scan.ts           # Scan command
│   ├── query.ts          # Query command
│   ├── report.ts         # Report generation
│   ├── stats.ts          # Statistics display
│   ├── init.ts           # Config initialization
│   └── serve.ts          # Web server
├── config.ts              # Config loading
└── utils/                 # Utilities
    ├── paths.ts          # Path resolution
    └── output.ts         # Console output
```

#### Command Flow

```
User Input
    ↓
[1] Commander.js parses arguments
    ↓
[2] Load config from .nlcirc.json
    ↓
[3] Initialize NlciEngine
    ↓
[4] Execute command handler
    ↓
[5] Format and display results
```

### @nlci/vscode-extension

VS Code extension for in-editor clone detection.

#### Components

```
vscode-extension/
├── src/
│   ├── extension.ts           # Extension entry
│   ├── services/
│   │   └── nlci-service.ts   # NlciEngine wrapper
│   ├── providers/
│   │   ├── tree-provider.ts  # Clone tree view
│   │   ├── codelens-provider.ts
│   │   └── diagnostics-provider.ts
│   ├── commands/
│   │   └── index.ts          # Command handlers
│   └── ui/
│       ├── status-bar.ts     # Status bar item
│       └── report-panel.ts   # Webview panel
└── resources/
    └── icon.svg               # Extension icon
```

#### Extension Lifecycle

```
[1] activate()
    → Create NlciService instance
    → Register providers (tree, codelens, diagnostics)
    → Register commands
    → Set up event listeners
    ↓
[2] User Actions
    → Scan workspace
    → Find similar code
    → View clones
    ↓
[3] Background Processing
    → Document change → Update index
    → Config change → Reload settings
    ↓
[4] deactivate()
    → Save index
    → Dispose resources
```

---

## Data Flow

### Indexing Flow

```
Directory/File Input
    ↓
┌────────────────────┐
│  File Discovery    │  Glob patterns, filters
└────────┬───────────┘
         ↓
┌────────────────────┐
│  File Reading      │  Read file contents
└────────┬───────────┘
         ↓
┌────────────────────┐
│  Code Parsing      │  Split into blocks
└────────┬───────────┘
         ↓
┌────────────────────┐
│  Embedding         │  Generate 384-dim vectors
└────────┬───────────┘
         ↓
┌────────────────────┐
│  LSH Hashing       │  Compute L × K hashes
└────────┬───────────┘
         ↓
┌────────────────────┐
│  Bucket Storage    │  Store in hash buckets
└────────┬───────────┘
         ↓
┌────────────────────┐
│  Index Metadata    │  Update statistics
└────────────────────┘
```

### Query Flow

```
Query Input (file + optional lines)
    ↓
┌────────────────────┐
│  Extract Code      │  Get code block content
└────────┬───────────┘
         ↓
┌────────────────────┐
│  Generate Embedding│  384-dim vector
└────────┬───────────┘
         ↓
┌────────────────────┐
│  LSH Query         │  Hash and lookup buckets
└────────┬───────────┘
         ↓
┌────────────────────┐
│  Candidate Retrieval│ Collect from L tables
└────────┬───────────┘
         ↓
┌────────────────────┐
│  Similarity Compute│ Exact cosine similarity
└────────┬───────────┘
         ↓
┌────────────────────┐
│  Filter & Rank     │ Apply threshold, sort
└────────┬───────────┘
         ↓
┌────────────────────┐
│  Return Results    │ CloneResult[]
└────────────────────┘
```

---

## Package Structure

### Monorepo Layout

```
NLCI/
├── apps/                   # Applications
│   ├── cli/               # @nlci/cli
│   ├── vscode-extension/  # VS Code extension
│   └── web-demo/          # Future web app
│
├── packages/               # Shared packages
│   ├── core/              # @nlci/core
│   ├── lsh-native/        # Native LSH (future)
│   ├── shared/            # @nlci/shared
│   └── config/            # @nlci/config
│
├── docs/                   # Documentation
├── examples/               # Example projects
├── benchmarks/             # Performance tests
└── models/                 # Embedding models
```

### Package Dependencies

```
┌─────────────────┐
│   apps/cli      │──────┐
└─────────────────┘      │
                         │
┌─────────────────┐      │
│ apps/vscode-ext │──────┼───────┐
└─────────────────┘      │       │
                         ↓       ↓
                   ┌──────────────────┐
                   │  packages/core   │
                   └────────┬─────────┘
                            │
                            ↓
                   ┌──────────────────┐
                   │ packages/shared  │
                   └──────────────────┘
```

---

## Extension Points

### Custom Embedding Models

```typescript
interface EmbeddingModel {
  embed(code: string): Promise<Float32Array>;
  dimension: number;
}

class CustomModel implements EmbeddingModel {
  dimension = 768;

  async embed(code: string): Promise<Float32Array> {
    // Custom embedding logic
  }
}

// Use with engine
const engine = new NlciEngine({
  embeddingModel: new CustomModel(),
  // ... other config
});
```

### Custom Code Parsers

```typescript
interface CodeParser {
  parse(content: string): CodeBlock[];
}

class CustomParser implements CodeParser {
  parse(content: string): CodeBlock[] {
    // Custom parsing logic
  }
}
```

### Custom Similarity Metrics

```typescript
interface SimilarityMetric {
  compute(a: Float32Array, b: Float32Array): number;
}

class EuclideanMetric implements SimilarityMetric {
  compute(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return 1 / (1 + Math.sqrt(sum));
  }
}
```

---

## Deployment Patterns

### Standalone CLI

```bash
npm install -g @nlci/cli
nlci scan ./src
```

### VS Code Extension

```bash
code --install-extension nlci.nlci-vscode
```

### Embedded in CI/CD

```yaml
# .github/workflows/clone-detection.yml
- name: Detect Clones
  run: |
    npx @nlci/cli scan ./src
    npx @nlci/cli report --format json --output clones.json
```

### Programmatic API

```typescript
import { NlciEngine } from '@nlci/core';

const engine = new NlciEngine(config);
await engine.indexDirectory('./src');
const clones = await engine.findAllClones();
```

---

## Scalability Considerations

### Horizontal Scaling

```
┌──────────────┐
│  Coordinator │
└──────┬───────┘
       │
   ┌───┴───┬───────┬───────┐
   │       │       │       │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│ W1  │ │ W2  │ │ W3  │ │ W4  │  Workers
└─────┘ └─────┘ └─────┘ └─────┘

Each worker indexes a subset of files
```

### Distributed Index

```
Index Sharding:
- Shard 1: Files A-F
- Shard 2: Files G-M
- Shard 3: Files N-S
- Shard 4: Files T-Z

Query fans out to all shards, results merged
```

---

## Next Steps

- [API Reference](api-reference.md)
- [Algorithms](algorithms.md)
- [Contributing](../CONTRIBUTING.md)
