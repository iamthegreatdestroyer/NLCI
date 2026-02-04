# NLCI API Reference

Complete API documentation for NLCI packages.

## Table of Contents

- [@nlci/core](#nlcicore)
  - [NlciEngine](#nlciengine)
  - [LshIndex](#lshindex)
  - [CodeBlockParser](#codeblockparser)
- [@nlci/shared](#nlcishared)
  - [Result](#result)
  - [Logger](#logger)
- [@nlci/cli](#nlcicli)

---

## @nlci/core

Core NLCI engine and LSH implementation.

### NlciEngine

Main entry point for indexing and querying code.

#### Constructor

```typescript
new NlciEngine(config: NlciConfig)
```

**Parameters:**

```typescript
interface NlciConfig {
  lsh: {
    numTables: number; // Number of hash tables (L)
    numBits: number; // Bits per hash (K)
    embeddingDim: number; // Embedding dimension
  };
  similarity: {
    threshold: number; // Similarity threshold [0, 1]
    minLines?: number; // Min lines per block
    maxLines?: number; // Max lines per block
  };
}
```

**Example:**

```typescript
const engine = new NlciEngine({
  lsh: {
    numTables: 20,
    numBits: 12,
    embeddingDim: 384,
  },
  similarity: {
    threshold: 0.85,
    minLines: 5,
    maxLines: 500,
  },
});
```

#### Methods

##### indexDirectory()

Index all files in a directory.

```typescript
async indexDirectory(
  dirPath: string,
  options?: IndexOptions
): Promise<Result<IndexResult>>
```

**Parameters:**

```typescript
interface IndexOptions {
  extensions?: string[]; // File extensions to include
  exclude?: string[]; // Glob patterns to exclude
  filter?: (path: string) => boolean; // Custom filter
  onProgress?: (current: number, total: number) => void;
}

interface IndexResult {
  filesProcessed: number;
  blocksIndexed: number;
  duration: number;
}
```

**Example:**

```typescript
const result = await engine.indexDirectory('./src', {
  extensions: ['.ts', '.js', '.py'],
  exclude: ['**/*.test.ts', '**/node_modules/**'],
  onProgress: (current, total) => {
    console.log(`Progress: ${current}/${total}`);
  },
});

if (result.ok) {
  console.log(`Indexed ${result.value.blocksIndexed} blocks`);
}
```

##### indexFile()

Index a single file.

```typescript
async indexFile(filePath: string): Promise<Result<number>>
```

**Returns:** Number of code blocks indexed.

**Example:**

```typescript
const result = await engine.indexFile('./src/utils.ts');
if (result.ok) {
  console.log(`Indexed ${result.value} blocks`);
}
```

##### query()

Find similar code blocks.

```typescript
async query(params: QueryParams): Promise<CloneResult[]>
```

**Parameters:**

```typescript
interface QueryParams {
  filePath: string;
  startLine?: number; // Optional line range
  endLine?: number;
  threshold?: number; // Override config threshold
}

interface CloneResult {
  source: CodeBlock;
  target: CodeBlock;
  similarity: number;
  cloneType: CloneType;
}

interface CodeBlock {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  hash: string;
  embedding?: Float32Array;
}

type CloneType = 'type-1' | 'type-2' | 'type-3' | 'type-4';
```

**Example:**

```typescript
const results = await engine.query({
  filePath: './src/utils.ts',
  startLine: 10,
  endLine: 50,
  threshold: 0.9,
});

for (const result of results) {
  console.log(`${result.cloneType}: ${result.similarity}`);
  console.log(`  ${result.target.filePath}:${result.target.startLine}`);
}
```

##### findAllClones()

Find all clone pairs in the index.

```typescript
async findAllClones(): Promise<CloneResult[]>
```

**Example:**

```typescript
const allClones = await engine.findAllClones();
console.log(`Found ${allClones.length} clone pairs`);
```

##### getStatistics()

Get index statistics.

```typescript
getStatistics(): Statistics
```

**Returns:**

```typescript
interface Statistics {
  totalFiles: number;
  totalBlocks: number;
  averageBucketSize: number;
  indexSize: number;
  clonesByType: Record<CloneType, number>;
}
```

**Example:**

```typescript
const stats = engine.getStatistics();
console.log(`Indexed ${stats.totalBlocks} blocks from ${stats.totalFiles} files`);
```

##### saveIndex() / loadIndex()

Persist and restore the index.

```typescript
async saveIndex(path: string): Promise<Result<void>>
async loadIndex(path: string): Promise<Result<void>>
```

**Example:**

```typescript
// Save
await engine.saveIndex('.nlci/index.json');

// Load
await engine.loadIndex('.nlci/index.json');
```

##### clearIndex()

Clear all indexed data.

```typescript
clearIndex(): void
```

---

### LshIndex

Low-level LSH index for managing hash tables.

#### Constructor

```typescript
new LshIndex(config: LshConfig)
```

**Parameters:**

```typescript
interface LshConfig {
  numTables: number;
  numBits: number;
  embeddingDim: number;
}
```

#### Methods

##### insert()

Insert a vector into the index.

```typescript
insert(id: string, vector: Float32Array): void
```

##### query()

Query for similar vectors.

```typescript
query(vector: Float32Array, limit?: number): string[]
```

**Returns:** Array of candidate IDs sorted by Hamming distance.

##### remove()

Remove a vector from the index.

```typescript
remove(id: string): boolean
```

---

### CodeBlockParser

Parser for extracting code blocks from files.

#### Methods

##### parseFile()

Parse a file into code blocks.

```typescript
static async parseFile(
  filePath: string,
  options?: ParseOptions
): Promise<Result<CodeBlock[]>>
```

**Parameters:**

```typescript
interface ParseOptions {
  minLines?: number;
  maxLines?: number;
  language?: string;
}
```

**Example:**

```typescript
const result = await CodeBlockParser.parseFile('./src/utils.ts', {
  minLines: 5,
  maxLines: 100,
});

if (result.ok) {
  console.log(`Found ${result.value.length} code blocks`);
}
```

---

## @nlci/shared

Shared utilities for all packages.

### Result

Type-safe error handling.

#### Type Definition

```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
```

#### Static Methods

```typescript
class Result {
  static ok<T>(value: T): Result<T>;
  static err<E>(error: E): Result<never, E>;

  static wrap<T>(fn: () => T): Result<T>;
  static wrapAsync<T>(fn: () => Promise<T>): Promise<Result<T>>;
}
```

**Example:**

```typescript
import { Result } from '@nlci/shared';

function divide(a: number, b: number): Result<number> {
  if (b === 0) {
    return Result.err(new Error('Division by zero'));
  }
  return Result.ok(a / b);
}

const result = divide(10, 2);
if (result.ok) {
  console.log(`Result: ${result.value}`);
} else {
  console.error(`Error: ${result.error.message}`);
}
```

### Logger

Structured logging utility.

#### Constructor

```typescript
new Logger(prefix: string)
```

#### Methods

```typescript
class Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;

  static setLevel(level: LogLevel): void;
}

enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}
```

**Example:**

```typescript
import { Logger, LogLevel } from '@nlci/shared';

Logger.setLevel(LogLevel.Info);

const logger = new Logger('MyApp');
logger.debug('This will not appear');
logger.info('Starting scan...');
logger.warn('Potential issue detected');
logger.error('Failed to parse file');
```

---

## @nlci/cli

CLI application (see `nlci --help` for full reference).

### Commands

#### scan

Scan a directory for code blocks.

```bash
nlci scan <directory> [options]
```

**Options:**

- `--config <path>` - Config file path
- `--exclude <patterns...>` - Exclude patterns

#### query

Find similar code blocks.

```bash
nlci query <file> [options]
```

**Options:**

- `--lines <range>` - Line range (e.g., 10-50)
- `--threshold <number>` - Similarity threshold

#### report

Generate clone detection report.

```bash
nlci report [options]
```

**Options:**

- `--format <type>` - Format (html, json, markdown)
- `--output <path>` - Output file path

#### stats

Show index statistics.

```bash
nlci stats
```

#### init

Initialize configuration file.

```bash
nlci init [options]
```

**Options:**

- `--preset <name>` - Preset (fast, balanced, accurate)

#### serve

Start web-based report server.

```bash
nlci serve [options]
```

**Options:**

- `--port <number>` - Server port
- `--open` - Open browser automatically

---

## Type Definitions

### CloneType

```typescript
type CloneType = 'type-1' | 'type-2' | 'type-3' | 'type-4';
```

| Type   | Similarity | Description   |
| ------ | ---------- | ------------- |
| type-1 | ≥99%       | Exact copies  |
| type-2 | 95-99%     | Parameterized |
| type-3 | 85-95%     | Near-miss     |
| type-4 | 70-85%     | Semantic      |

---

## Error Handling

All async methods return `Result<T>` for type-safe error handling:

```typescript
const result = await engine.indexDirectory('./src');

if (result.ok) {
  // Success
  console.log(result.value);
} else {
  // Error
  console.error(result.error);
}
```

---

## Performance Characteristics

| Operation       | Complexity     | Typical Time      |
| --------------- | -------------- | ----------------- |
| indexFile()     | O(n)           | 50-200ms per file |
| query()         | O(1)           | 1-5ms             |
| findAllClones() | O(n²) bucketed | Varies            |
| saveIndex()     | O(n)           | 100-500ms         |

---

## Next Steps

- [Getting Started](getting-started.md)
- [Algorithms](algorithms.md)
- [Examples](../examples/)
