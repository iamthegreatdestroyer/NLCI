# Basic NLCI Usage Example

This example demonstrates basic usage of the NLCI API and CLI.

## Project Structure

```
basic-usage/
├── src/
│   ├── utils.ts          # Sample utilities
│   ├── helpers.ts        # Helper functions
│   └── duplicate.ts      # Intentional duplicate
├── example.ts            # API usage example
├── package.json
└── README.md            # This file
```

## Setup

```bash
# Install dependencies
npm install

# Install NLCI CLI
npm install -g @nlci/cli
```

## CLI Usage

### Scan Directory

```bash
# Scan the src/ directory
nlci scan src/

# Expected output:
# Scanning directory: src/
# Found 15 code blocks in 3 files
# Index saved to .nlci/index.json
```

### Find Clones

```bash
# Find all clones
nlci query src/duplicate.ts

# Expected output:
# Finding clones for: src/duplicate.ts
#
# Clone found (Type-1: 99.2%):
#   src/utils.ts:10-25
#   15 lines
```

### Generate Report

```bash
# Generate HTML report
nlci report --format html --output clones-report.html

# Open in browser
open clones-report.html
```

### View Statistics

```bash
nlci stats

# Expected output:
# Index Statistics
# ================
# Files indexed: 3
# Code blocks: 15
# Clone pairs: 2
#
# Clone Types:
#   Type-1 (exact): 1
#   Type-2 (parameterized): 1
#   Type-3 (near-miss): 0
#   Type-4 (semantic): 0
```

## Programmatic API Usage

See [`example.ts`](./example.ts) for complete API usage examples:

```typescript
import { NlciEngine } from '@nlci/core';

// Initialize engine
const engine = new NlciEngine({
  lsh: {
    numTables: 20,
    numBits: 12,
    embeddingDim: 384,
  },
  similarity: {
    threshold: 0.85,
    minLines: 5,
  },
});

// Index directory
await engine.indexDirectory('./src');

// Find clones
const clones = await engine.findAllClones();
console.log(`Found ${clones.length} clone pairs`);

// Query specific file
const results = await engine.query({
  filePath: './src/duplicate.ts',
});

for (const result of results) {
  console.log(`${result.cloneType}: ${result.similarity}`);
  console.log(`  ${result.target.filePath}:${result.target.startLine}`);
}
```

Run the example:

```bash
npm start
```

## Expected Results

When you run this example, you should see:

1. **Index Creation**: ~0.5 seconds to index 3 files
2. **Clone Detection**: 2 clone pairs found
   - 1 Type-1 clone (exact duplicate)
   - 1 Type-2 clone (renamed variables)
3. **Query Time**: < 5ms per query

## Configuration

Create `.nlcirc.json` to customize settings:

```json
{
  "lsh": {
    "numTables": 20,
    "numBits": 12,
    "embeddingDim": 384
  },
  "similarity": {
    "threshold": 0.85,
    "minLines": 5,
    "maxLines": 500
  },
  "exclude": ["**/node_modules/**", "**/*.test.ts", "**/*.spec.ts"]
}
```

## Common Patterns

### Filtering Results

```typescript
const highSimilarity = clones.filter((c) => c.similarity >= 0.95);
const type1Only = clones.filter((c) => c.cloneType === 'type-1');
```

### Progress Tracking

```typescript
await engine.indexDirectory('./src', {
  onProgress: (current, total) => {
    console.log(`Progress: ${current}/${total} (${Math.round((current / total) * 100)}%)`);
  },
});
```

### Custom Filters

```typescript
await engine.indexDirectory('./src', {
  filter: (path) => {
    return !path.includes('test') && !path.includes('spec');
  },
});
```

## Troubleshooting

### No clones found

- Check similarity threshold (lower = more results)
- Verify minLines setting (smaller blocks may be filtered)
- Ensure files are being indexed correctly

### Memory issues

- Reduce `numTables` (e.g., from 20 to 10)
- Process directories in batches
- Save/load index to avoid re-indexing

### Slow performance

- Increase `numBits` for faster queries (may reduce recall)
- Use SSD for better I/O performance
- Enable parallel processing (future feature)

## Next Steps

- [CI Integration Example](../ci-integration/)
- [Custom Embedder Example](../custom-embedder/)
- [API Reference](../../docs/api-reference.md)
- [Configuration Guide](../../docs/getting-started.md#configuration)
