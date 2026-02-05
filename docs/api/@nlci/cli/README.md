[**Documentation v0.0.0**](../../README.md)

---

[Documentation](../../packages.md) / @nlci/cli

# @nlci/cli

Command-line interface for NLCI - Neural-LSH Code Intelligence.

## Installation

```bash
npm install -g @nlci/cli
# or
pnpm add -g @nlci/cli
```

## Quick Start

```bash
# Initialize NLCI in your project
nlci init

# Scan your codebase to build the index
nlci scan ./src

# Query for similar code
nlci query --file ./src/my-function.ts

# Generate a clone detection report
nlci report
```

## Commands

### `nlci init`

Initialize NLCI configuration in the current directory.

```bash
nlci init [options]

Options:
  -f, --force       Overwrite existing configuration
  --typescript      Use TypeScript configuration file
  --json            Use JSON configuration file
```

### `nlci scan`

Scan a directory and build the code similarity index.

```bash
nlci scan [path] [options]

Arguments:
  path                    Path to scan (defaults to current directory)

Options:
  -o, --output <path>     Output path for index file (default: ".nlci-index")
  -c, --config <path>     Path to configuration file
  -i, --include <patterns...>   Glob patterns to include
  -e, --exclude <patterns...>   Glob patterns to exclude
  --min-tokens <n>        Minimum tokens per code block (default: 10)
  --max-tokens <n>        Maximum tokens per code block (default: 10000)
  -l, --languages <langs...>    Languages to include
  -v, --verbose           Show detailed output
  -f, --force             Force rebuild of existing index
```

### `nlci query`

Query for similar code blocks.

```bash
nlci query [options]

Options:
  -x, --index <path>      Path to index file (default: ".nlci-index")
  -f, --file <path>       Query using code from a file
  -c, --code <code>       Query using inline code snippet
  -t, --threshold <value> Minimum similarity threshold (default: 0.85)
  -n, --limit <n>         Maximum number of results (default: 10)
  --type <type>           Filter by clone type (1, 2, 3, 4)
  --format <format>       Output format: table, json, compact (default: table)
  -v, --verbose           Show detailed output
```

### `nlci report`

Generate a code clone report.

```bash
nlci report [options]

Options:
  -x, --index <path>      Path to index file (default: ".nlci-index")
  -o, --output <path>     Output file path
  -f, --format <format>   Report format: console, json, html, markdown
  -t, --threshold <value> Minimum similarity threshold (default: 0.85)
```

### `nlci serve`

Start a local API server for code similarity queries.

```bash
nlci serve [options]

Options:
  -x, --index <path>      Path to index file (default: ".nlci-index")
  -p, --port <port>       Port to listen on (default: 3000)
  -h, --host <host>       Host to bind to (default: localhost)
```

**API Endpoints:**

- `GET /health` - Health check
- `GET /stats` - Index statistics
- `POST /query` - Query for similar code
- `POST /clones` - Get all detected clones

### `nlci stats`

Display index statistics.

```bash
nlci stats [options]

Options:
  -x, --index <path>      Path to index file (default: ".nlci-index")
  --json                  Output as JSON
```

## Configuration

NLCI looks for configuration in these locations (in order):

1. `nlci.config.js` / `nlci.config.ts`
2. `nlci.config.json`
3. `.nlcirc` / `.nlcirc.json`
4. `package.json` (`nlci` field)

### Example Configuration

```javascript
// nlci.config.js
module.exports = {
  lsh: {
    numTables: 20, // Number of hash tables (L)
    numBits: 12, // Bits per hash (K)
    dimension: 384, // Embedding dimension
  },
  embedding: {
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    batchSize: 32,
    maxLength: 512,
  },
  parser: {
    minBlockSize: 10,
    maxBlockSize: 10000,
    includePatterns: ['**/*.ts', '**/*.js'],
    excludePatterns: ['**/node_modules/**'],
  },
};
```

## Clone Types

| Type   | Similarity | Description                                        |
| ------ | ---------- | -------------------------------------------------- |
| Type-1 | ≥99%       | Exact clones (whitespace/comment differences only) |
| Type-2 | 95-99%     | Parameterized clones (identifier renaming)         |
| Type-3 | 85-95%     | Near-miss clones (statement modifications)         |
| Type-4 | 70-85%     | Semantic clones (different syntax, same logic)     |

## Performance

- **Indexing:** O(n) - Linear time to scan codebase
- **Query:** O(1) - Constant time lookups using LSH
- **Memory:** Efficient bucket-based storage

## License

AGPL-3.0-or-later

## Variables

- [initCommand](variables/initCommand.md)
- [queryCommand](variables/queryCommand.md)
- [reportCommand](variables/reportCommand.md)
- [scanCommand](variables/scanCommand.md)
- [serveCommand](variables/serveCommand.md)
- [statsCommand](variables/statsCommand.md)

## Functions

- [debug](functions/debug.md)
- [error](functions/error.md)
- [getDefaultConfig](functions/getDefaultConfig.md)
- [getExtension](functions/getExtension.md)
- [getRelativePath](functions/getRelativePath.md)
- [heading](functions/heading.md)
- [hr](functions/hr.md)
- [info](functions/info.md)
- [json](functions/json.md)
- [kv](functions/kv.md)
- [list](functions/list.md)
- [loadConfig](functions/loadConfig.md)
- [matchesPatterns](functions/matchesPatterns.md)
- [normalizePath](functions/normalizePath.md)
- [progressBar](functions/progressBar.md)
- [resolveGlobs](functions/resolveGlobs.md)
- [simpleTable](functions/simpleTable.md)
- [success](functions/success.md)
- [warn](functions/warn.md)
