# Configuration Reference

Complete reference for all NLCI configuration options across `.nlcirc.json`, environment variables, and CLI flags.

## Configuration Hierarchy

Configuration precedence (highest to lowest):

1. **CLI flags** (e.g., `--threshold 0.90`)
2. **Environment variables** (e.g., `NLCI_THRESHOLD=0.90`)
3. **Workspace `.nlcirc.json`** (current directory)
4. **Global `.nlcirc.json`** (`~/.nlcirc.json`)
5. **Package defaults**

## Complete Schema

### .nlcirc.json

```json
{
  // File Patterns
  "include": ["src/**/*.ts", "src/**/*.js"],
  "exclude": ["**/*.test.ts", "**/node_modules/**", "**/dist/**"],

  // Clone Detection
  "threshold": 0.85,
  "minLines": 6,
  "cloneTypes": ["Type-1", "Type-2", "Type-3"],

  // LSH Parameters
  "lsh": {
    "numTables": 20,
    "numHashes": 12,
    "dimensions": 384
  },

  // Language Settings
  "languages": {
    "typescript": {
      "extensions": [".ts", ".tsx"],
      "parser": "typescript",
      "minLines": 6
    },
    "javascript": {
      "extensions": [".js", ".jsx", ".mjs"],
      "parser": "babel",
      "minLines": 6
    },
    "python": {
      "extensions": [".py"],
      "parser": "python",
      "minLines": 8
    }
  },

  // Embedder Configuration
  "embedder": {
    "type": "codebert",
    "modelPath": null,
    "tokenizerPath": null,
    "dimensions": 384,
    "batchSize": 32,
    "cache": {
      "enabled": true,
      "maxSize": 10000,
      "ttl": 3600
    }
  },

  // Performance
  "performance": {
    "maxConcurrency": 4,
    "chunkSize": 100,
    "indexStrategy": "memory",
    "cacheEnabled": true
  },

  // Output
  "output": {
    "format": "json",
    "path": "./clones.json",
    "verbose": false,
    "colors": true
  },

  // CI/CD
  "ci": {
    "enabled": false,
    "maxCloneGroups": 10,
    "maxDuplicationRate": 0.1,
    "failOnType1": true,
    "failOnType2": false,
    "failOnType3": false,
    "reportFormat": "json",
    "commentOnPR": true
  },

  // Ignores
  "ignorePatterns": ["// nlci-ignore", "/* nlci-ignore */", "# nlci-ignore"],

  // Workspace
  "workspaceRoot": "./",
  "respectGitignore": true
}
```

## Option Details

### File Patterns

#### include

**Type:** `string[]`  
**Default:** `["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"]`  
**Description:** Glob patterns for files to scan

```json
{
  "include": ["src/**/*.ts", "packages/**/*.js", "lib/**/*.tsx"]
}
```

**Glob Syntax:**

- `*` - Matches any characters except `/`
- `**` - Matches any characters including `/`
- `?` - Matches single character
- `[abc]` - Matches any character in set
- `{a,b}` - Matches either pattern

#### exclude

**Type:** `string[]`  
**Default:** `["**/node_modules/**", "**/dist/**", "**/*.d.ts", "**/*.min.js"]`  
**Description:** Patterns to exclude from scanning

```json
{
  "exclude": ["**/*.test.ts", "**/__tests__/**", "**/coverage/**", "**/build/**", "vendor/**"]
}
```

**Common Exclusions:**

- Test files: `**/*.{test,spec}.{ts,js}`
- Generated files: `**/*.generated.{ts,js}`
- Build outputs: `**/dist/**`, `**/build/**`
- Dependencies: `**/node_modules/**`, `**/vendor/**`
- Type definitions: `**/*.d.ts`
- Minified: `**/*.min.js`

### Clone Detection

#### threshold

**Type:** `number`  
**Default:** `0.85`  
**Range:** `0.0` - `1.0`  
**Description:** Similarity threshold for clone detection

```json
{
  "threshold": 0.9 // Stricter (fewer clones)
}
```

**Threshold Guide:**
| Value | Clone Types | Use Case |
|-------|-------------|----------|
| 0.95-1.0 | Type-1 only | Exact clones |
| 0.85-0.95 | Type-1, Type-2 | Renamed clones |
| 0.70-0.85 | Type-1, Type-2, Type-3 | Modified clones |
| 0.50-0.70 | All types | Semantic clones |

#### minLines

**Type:** `number`  
**Default:** `6`  
**Range:** `3` - `100`  
**Description:** Minimum lines for a code block to be considered

```json
{
  "minLines": 10 // Ignore small blocks
}
```

**Language Recommendations:**

- JavaScript/TypeScript: 6-8 lines
- Python: 8-10 lines
- Java/C#: 8-12 lines

#### cloneTypes

**Type:** `string[]`  
**Default:** `["Type-1", "Type-2", "Type-3", "Type-4"]`  
**Options:** `"Type-1" | "Type-2" | "Type-3" | "Type-4"`  
**Description:** Which clone types to detect

```json
{
  "cloneTypes": ["Type-1", "Type-2"] // Only exact and renamed
}
```

**Clone Types:**

- **Type-1**: Exact copies (ignoring whitespace/comments)
- **Type-2**: Renamed variables/functions
- **Type-3**: Modified statements (additions/deletions)
- **Type-4**: Semantic clones (different syntax, same behavior)

### LSH Parameters

#### lsh.numTables (L)

**Type:** `number`  
**Default:** `20`  
**Range:** `10` - `50`  
**Description:** Number of hash tables (affects recall)

```json
{
  "lsh": {
    "numTables": 30 // Higher recall, more memory
  }
}
```

**Trade-offs:**

- **Higher L** (30-50):
  - ✅ Better recall (finds more clones)
  - ❌ More memory usage
  - ❌ Slower indexing
- **Lower L** (10-15):
  - ✅ Faster, less memory
  - ❌ May miss some clones

**Recommendations:**

- Small codebases (`<`5K files): L=10-15
- Medium codebases (5K-20K): L=20 (default)
- Large codebases (`>`20K): L=30-40

#### lsh.numHashes (K)

**Type:** `number`  
**Default:** `12`  
**Range:** `8` - `20`  
**Description:** Hash size in bits (affects precision)

```json
{
  "lsh": {
    "numHashes": 16 // Fewer collisions
  }
}
```

**Trade-offs:**

- **Higher K** (16-20):
  - ✅ Fewer false positives
  - ❌ May miss similar items
- **Lower K** (8-10):
  - ✅ Finds more candidates
  - ❌ More false positives

**Recommendations:**

- Strict matching: K=16-20
- Balanced (default): K=12
- Lenient matching: K=8-10

#### lsh.dimensions

**Type:** `number`  
**Default:** `384` (CodeBERT)  
**Options:** `384, 768, 1536`  
**Description:** Embedding vector dimensions

```json
{
  "lsh": {
    "dimensions": 768 // Match your embedder
  }
}
```

**Must Match Embedder:**

- CodeBERT (default): 384
- Custom BERT models: 768
- OpenAI embeddings: 1536

### Language Settings

#### languages.`<lang>`.extensions

**Type:** `string[]`  
**Required:** Yes  
**Description:** File extensions for language

```json
{
  "languages": {
    "rust": {
      "extensions": [".rs"],
      "parser": "tree-sitter",
      "minLines": 8
    }
  }
}
```

#### languages.<lang>.parser

**Type:** `string`  
**Options:** `"typescript" | "babel" | "python" | "java" | "tree-sitter"`  
**Description:** Parser to use for language

#### languages.<lang>.minLines

**Type:** `number`  
**Description:** Language-specific minimum lines (overrides global)

### Embedder Configuration

#### embedder.type

**Type:** `string`  
**Default:** `"codebert"`  
**Options:** `"codebert" | "onnx" | "custom"`  
**Description:** Embedder implementation to use

```json
{
  "embedder": {
    "type": "onnx",
    "modelPath": "./models/custom.onnx"
  }
}
```

#### embedder.modelPath

**Type:** `string | null`  
**Default:** `null` (uses built-in CodeBERT)  
**Description:** Path to custom ONNX model

```json
{
  "embedder": {
    "type": "onnx",
    "modelPath": "./models/custom-embedder.onnx",
    "tokenizerPath": "./models/tokenizer.json"
  }
}
```

#### embedder.batchSize

**Type:** `number`  
**Default:** `32`  
**Range:** `1` - `128`  
**Description:** Number of code blocks to embed at once

```json
{
  "embedder": {
    "batchSize": 16 // Reduce for low memory
  }
}
```

**Memory Trade-off:**

- Larger batch: Faster, more memory
- Smaller batch: Slower, less memory

#### embedder.cache

**Type:** `object`  
**Description:** Embedding cache configuration

```json
{
  "embedder": {
    "cache": {
      "enabled": true,
      "maxSize": 20000, // Cache up to 20K embeddings
      "ttl": 7200 // 2 hours
    }
  }
}
```

### Performance

#### performance.maxConcurrency

**Type:** `number`  
**Default:** `4` (CPU cores)  
**Range:** `1` - `16`  
**Description:** Maximum parallel file processing

```json
{
  "performance": {
    "maxConcurrency": 8 // More parallelism
  }
}
```

**Recommendations:**

- CPU-bound: Number of CPU cores
- I/O-bound: 2× CPU cores
- Memory-limited: Reduce to 2-4

#### performance.chunkSize

**Type:** `number`  
**Default:** `100`  
**Description:** Files per processing chunk

```json
{
  "performance": {
    "chunkSize": 50 // Smaller chunks for large files
  }
}
```

#### performance.indexStrategy

**Type:** `string`  
**Default:** `"memory"`  
**Options:** `"memory" | "disk" | "hybrid"`  
**Description:** Index storage strategy

```json
{
  "performance": {
    "indexStrategy": "hybrid" // Balance speed and memory
  }
}
```

**Strategies:**

- **memory**: Fastest, high RAM usage
- **disk**: Slower, minimal RAM
- **hybrid**: Balance (recommended for large codebases)

### Output

#### output.format

**Type:** `string`  
**Default:** `"json"`  
**Options:** `"json" | "html" | "markdown" | "text"`  
**Description:** Report output format

```json
{
  "output": {
    "format": "html",
    "path": "./clone-report.html"
  }
}
```

#### output.path

**Type:** `string`  
**Default:** `"./clones.json"`  
**Description:** Output file path

#### output.verbose

**Type:** `boolean`  
**Default:** `false`  
**Description:** Enable verbose logging

#### output.colors

**Type:** `boolean`  
**Default:** `true`  
**Description:** Enable colored terminal output

### CI/CD

#### ci.enabled

**Type:** `boolean`  
**Default:** `false`  
**Description:** Enable CI/CD mode

```json
{
  "ci": {
    "enabled": true,
    "maxCloneGroups": 10,
    "failOnType1": true
  }
}
```

#### ci.maxCloneGroups

**Type:** `number`  
**Default:** `10`  
**Description:** Maximum allowed clone groups (fail if exceeded)

#### ci.maxDuplicationRate

**Type:** `number`  
**Default:** `0.10` (10%)  
**Range:** `0.0` - `1.0`  
**Description:** Maximum duplication rate (fail if exceeded)

```json
{
  "ci": {
    "maxDuplicationRate": 0.15 // Allow up to 15% duplication
  }
}
```

#### ci.failOnType1/Type2/Type3

**Type:** `boolean`  
**Description:** Whether to fail CI on specific clone types

```json
{
  "ci": {
    "failOnType1": true, // Block exact clones
    "failOnType2": false, // Warn on renamed
    "failOnType3": false // Info on modified
  }
}
```

#### ci.commentOnPR

**Type:** `boolean`  
**Default:** `false`  
**Description:** Post results as PR comment (GitHub Actions)

### Workspace

#### workspaceRoot

**Type:** `string`  
**Default:** `"./"` (current directory)  
**Description:** Root directory for scanning

#### respectGitignore

**Type:** `boolean`  
**Default:** `true`  
**Description:** Honor `.gitignore` patterns

```json
{
  "respectGitignore": false // Scan all files
}
```

## Environment Variables

All configuration can be set via environment variables:

### Prefix Convention

`NLCI_<SECTION>_<OPTION>` in SCREAMING_SNAKE_CASE

### Examples

```bash
# Clone Detection
export NLCI_THRESHOLD=0.90
export NLCI_MIN_LINES=8

# LSH
export NLCI_LSH_NUM_TABLES=25
export NLCI_LSH_NUM_HASHES=14
export NLCI_LSH_DIMENSIONS=768

# Embedder
export NLCI_EMBEDDER_TYPE=onnx
export NLCI_EMBEDDER_MODEL_PATH=./models/custom.onnx
export NLCI_EMBEDDER_BATCH_SIZE=16

# Performance
export NLCI_PERFORMANCE_MAX_CONCURRENCY=8
export NLCI_PERFORMANCE_CHUNK_SIZE=50

# Output
export NLCI_OUTPUT_FORMAT=html
export NLCI_OUTPUT_PATH=./report.html
export NLCI_OUTPUT_VERBOSE=true

# CI/CD
export NLCI_CI_ENABLED=true
export NLCI_CI_MAX_CLONE_GROUPS=10
export NLCI_CI_MAX_DUPLICATION_RATE=0.10
export NLCI_CI_FAIL_ON_TYPE1=true
```

### Special Variables

```bash
# Disable colors (CI environments)
export NO_COLOR=1

# Force colors
export FORCE_COLOR=1

# Debug mode
export DEBUG=nlci:*

# Log level
export LOG_LEVEL=debug  # debug|info|warn|error
```

## CLI Flags

Override any configuration with command-line flags:

```bash
# File patterns
nlci scan --include "src/**/*.ts" --exclude "**/*.test.ts"

# Clone detection
nlci scan --threshold 0.90 --min-lines 8

# LSH parameters
nlci scan --lsh-tables 25 --lsh-hashes 14

# Output
nlci scan --format html --output ./report.html --verbose

# CI mode
nlci scan --ci --max-clones 10 --fail-on-type1
```

### Full Flag Reference

```bash
nlci scan [options] [path]

File Patterns:
  --include <glob...>         Patterns to include
  --exclude <glob...>         Patterns to exclude

Clone Detection:
  --threshold <number>        Similarity threshold (0.0-1.0)
  --min-lines <number>        Minimum lines per block
  --types <type...>           Clone types to detect

LSH Parameters:
  --lsh-tables <number>       Number of hash tables (L)
  --lsh-hashes <number>       Number of hashes (K)
  --lsh-dimensions <number>   Embedding dimensions

Embedder:
  --embedder-type <type>      codebert|onnx|custom
  --model-path <path>         Custom model path
  --batch-size <number>       Batch size

Performance:
  --concurrency <number>      Max parallel workers
  --chunk-size <number>       Files per chunk
  --index-strategy <type>     memory|disk|hybrid

Output:
  --format <format>           json|html|markdown|text
  --output <path>             Output file path
  --verbose                   Verbose logging
  --no-colors                 Disable colors

CI/CD:
  --ci                        Enable CI mode
  --max-clones <number>       Max clone groups
  --max-duplication <number>  Max duplication rate
  --fail-on-type1             Fail on Type-1 clones
  --fail-on-type2             Fail on Type-2 clones
  --fail-on-type3             Fail on Type-3 clones

Help:
  --help                      Show help
  --version                   Show version
```

## Common Scenarios

### Scenario 1: Strict Clone Detection for PR

```json
{
  "threshold": 0.95,
  "cloneTypes": ["Type-1"],
  "ci": {
    "enabled": true,
    "maxCloneGroups": 0,
    "failOnType1": true
  }
}
```

Or via CLI:

```bash
nlci scan --threshold 0.95 --types Type-1 --ci --max-clones 0
```

### Scenario 2: Large Codebase Optimization

```json
{
  "lsh": {
    "numTables": 30,
    "numHashes": 14
  },
  "performance": {
    "maxConcurrency": 8,
    "chunkSize": 50,
    "indexStrategy": "hybrid"
  },
  "embedder": {
    "batchSize": 64,
    "cache": {
      "enabled": true,
      "maxSize": 50000
    }
  }
}
```

### Scenario 3: Multi-Language Monorepo

```json
{
  "include": ["packages/*/src/**/*.{ts,js}", "apps/*/src/**/*.{ts,js}", "libs/*/src/**/*.{ts,js}"],
  "exclude": ["**/node_modules/**", "**/*.test.{ts,js}", "**/dist/**", "**/.turbo/**"],
  "languages": {
    "typescript": {
      "extensions": [".ts", ".tsx"],
      "parser": "typescript",
      "minLines": 6
    },
    "javascript": {
      "extensions": [".js", ".jsx", ".mjs"],
      "parser": "babel",
      "minLines": 6
    }
  }
}
```

### Scenario 4: Custom Domain Model

```json
{
  "embedder": {
    "type": "onnx",
    "modelPath": "./models/finance-code-embedder.onnx",
    "tokenizerPath": "./models/tokenizer.json",
    "dimensions": 768,
    "batchSize": 32
  },
  "lsh": {
    "numTables": 25,
    "numHashes": 14,
    "dimensions": 768
  },
  "threshold": 0.8
}
```

### Scenario 5: Memory-Constrained Environment

```json
{
  "performance": {
    "maxConcurrency": 2,
    "chunkSize": 25,
    "indexStrategy": "disk"
  },
  "embedder": {
    "batchSize": 8,
    "cache": {
      "enabled": true,
      "maxSize": 5000
    }
  },
  "lsh": {
    "numTables": 15,
    "numHashes": 12
  }
}
```

## Configuration Validation

NLCI validates configuration on startup:

```typescript
// Invalid configuration example
{
  "threshold": 1.5,  // ❌ Out of range
  "lsh": {
    "dimensions": 384,
    "numTables": -5   // ❌ Negative
  }
}

// Error output
❌ Configuration Error:
  - threshold: Must be between 0.0 and 1.0 (got 1.5)
  - lsh.numTables: Must be positive (got -5)
```

## Next Steps

- [Performance Tuning Guide](./performance-tuning.md)
- [CI/CD Integration](../tutorials/ci-integration.md)
- [Custom Embedder Tutorial](../tutorials/custom-embedder.md)
