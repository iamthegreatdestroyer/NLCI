# Getting Started: Your First Code Scan

This tutorial will guide you through installing NLCI and running your first code clone detection scan.

## Prerequisites

- Node.js ≥ 20.0.0
- npm or pnpm package manager
- A TypeScript or JavaScript project to scan

## Installation

### Option 1: CLI Tool (Recommended for CI/CD)

```bash
# Install globally
npm install -g @nlci/cli

# Or use with npx (no installation)
npx @nlci/cli scan ./src
```

### Option 2: VS Code Extension (Recommended for Development)

1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for "NLCI Code Clone Detector"
4. Click Install

### Option 3: Programmatic API

```bash
# Install as project dependency
npm install @nlci/core @nlci/shared
```

## Quick Start: CLI

### Step 1: Initialize Configuration

```bash
# Navigate to your project
cd /path/to/your/project

# Create .nlcirc.json config (optional)
nlci init
```

This creates a configuration file:

```json
{
  "include": ["src/**/*.ts", "src/**/*.js"],
  "exclude": ["**/*.test.ts", "**/node_modules/**"],
  "threshold": 0.85,
  "lshConfig": {
    "numTables": 20,
    "numHashes": 12,
    "dimensions": 384
  }
}
```

### Step 2: Scan Your Codebase

```bash
# Scan with default settings
nlci scan ./src

# Scan with custom threshold (0-1, higher = stricter)
nlci scan ./src --threshold 0.90

# Scan and output to file
nlci scan ./src --output clones.json
```

**Expected Output**:

```
🔍 Scanning: ./src
📂 Found 127 files
🧮 Parsing code blocks...
   ├─ 342 functions
   ├─ 89 classes
   └─ 156 methods
🧠 Generating embeddings...
   └─ 587 blocks embedded
🗂️  Building LSH index...
   └─ 20 hash tables created
🔎 Detecting clones...
   └─ Found 23 clone groups (47 instances)

✅ Scan complete! Results saved to .nlci/index.json
```

### Step 3: Query Similar Code

```bash
# Find clones of a specific function
nlci query src/utils/helpers.ts:15

# Query with custom threshold
nlci query src/utils/helpers.ts:15 --threshold 0.90
```

**Example Output**:

```
🔍 Querying: src/utils/helpers.ts:15 (processArray function)

📊 Found 3 similar code blocks:

1. src/utils/duplicate.ts:8 (100.0% similar)
   Type: Type-1 (Exact Clone)
   Lines: 8-22 (14 lines)

2. src/lib/array-utils.ts:45 (94.2% similar)
   Type: Type-2 (Renamed Identifiers)
   Lines: 45-60 (15 lines)

3. src/services/data-processor.ts:120 (87.5% similar)
   Type: Type-3 (Modified Statements)
   Lines: 120-135 (15 lines)
```

### Step 4: Generate Reports

```bash
# Generate HTML report
nlci report --output report.html

# View statistics
nlci stats
```

**Statistics Output**:

```
📊 NLCI Statistics

Codebase:
  Files: 127
  Code Blocks: 587
  Total Lines: 12,450

Clones:
  Clone Groups: 23
  Clone Instances: 47
  Duplicate Lines: 1,230 (9.9%)

Clone Types:
  Type-1 (Exact): 8 groups (17 instances)
  Type-2 (Renamed): 11 groups (22 instances)
  Type-3 (Modified): 4 groups (8 instances)
  Type-4 (Semantic): 0 groups (0 instances)

Top Clones:
  1. src/utils/helpers.ts:15 → 4 clones
  2. src/services/auth.ts:78 → 3 clones
  3. src/lib/validation.ts:120 → 3 clones
```

## Quick Start: VS Code Extension

### Step 1: Open Your Project

1. Open VS Code
2. Open your project folder: `File → Open Folder`

### Step 2: Automatic Scanning

The extension automatically scans your workspace on activation:

- Look for CodeLens annotations above functions
- Check the Clone Explorer in the sidebar
- View diagnostics in the Problems panel (`Ctrl+Shift+M`)

### Step 3: Navigate Clones

**Using CodeLens**:

- Click `$(references) 2 clones` annotation above a function
- Jumps directly to clone location

**Using Clone Explorer**:

1. Open Activity Bar (left sidebar)
2. Click "Clone Explorer" icon
3. Expand clone groups
4. Click any clone to navigate

**Using Commands**:

1. Press `Ctrl+Shift+P`
2. Type "NLCI"
3. Select:
   - `NLCI: Find Similar Code` - Find clones of current selection
   - `NLCI: Show Clone Report` - Open interactive HTML report
   - `NLCI: Show Statistics` - View codebase statistics

### Step 4: Configure Settings

1. Press `Ctrl+,` to open Settings
2. Search for "NLCI"
3. Adjust:
   - `nlci.enableCodeLens` - Toggle inline annotations
   - `nlci.similarityThreshold` - Adjust sensitivity (0.85 default)
   - `nlci.autoScanOnSave` - Auto-rescan on file save

## Quick Start: Programmatic API

### Step 1: Install Packages

```bash
npm install @nlci/core @nlci/shared
```

### Step 2: Create Scanner

```typescript
import { LSHIndex, CodeParser, CodeEmbedder } from '@nlci/core';
import { logger } from '@nlci/shared';

// Initialize components
const embedder = new CodeEmbedder({
  modelType: 'onnx',
  modelPath: './models/code-embedder-small',
});

const lshIndex = new LSHIndex({
  numTables: 20,
  numHashes: 12,
  dimensions: 384,
});

const parser = new CodeParser({
  language: 'typescript',
  minLines: 5,
});

// Parse code files
const files = await parser.parseDirectory('./src');
logger.info(`Parsed ${files.length} files`);

// Generate embeddings
const blocks = files.flatMap((f) => f.blocks);
const embeddings = await embedder.embedBatch(blocks.map((b) => b.code));

// Build index
for (let i = 0; i < blocks.length; i++) {
  lshIndex.add(blocks[i].id, embeddings[i]);
}

// Query similar code
const queryEmbedding = embeddings[0]; // Example: first block
const similar = lshIndex.query(queryEmbedding, {
  threshold: 0.85,
  maxResults: 10,
});

console.log(`Found ${similar.length} similar blocks`);
```

### Step 3: Query and Analyze

```typescript
// Find clones of specific code
const targetBlock = blocks.find((b) => b.filePath.includes('helpers.ts'));

if (targetBlock) {
  const embedding = await embedder.embed(targetBlock.code);
  const clones = lshIndex.query(embedding, {
    threshold: 0.85,
    maxResults: 5,
  });

  for (const clone of clones) {
    const cloneBlock = blocks.find((b) => b.id === clone.id);
    console.log(`Clone: ${cloneBlock.filePath}:${cloneBlock.startLine}`);
    console.log(`Similarity: ${(clone.similarity * 100).toFixed(1)}%`);
  }
}
```

## Understanding the Output

### Similarity Threshold

The similarity threshold (0-1) determines how strict matching is:

- **0.95-1.00**: Near-identical code (Type-1)
- **0.90-0.95**: Renamed variables (Type-2)
- **0.85-0.90**: Minor modifications (Type-3)
- **0.70-0.85**: Semantic similarity (Type-4)

**Default: 0.85** (balanced detection)

### Clone Types

**Type-1: Exact Clones**

```typescript
// Original
function processArray(arr: number[]) {
  return arr.map((x) => x * 2);
}

// Clone (100% similar)
function processArray(arr: number[]) {
  return arr.map((x) => x * 2);
}
```

**Type-2: Renamed Identifiers**

```typescript
// Original
function processArray(arr: number[]) {
  return arr.map((x) => x * 2);
}

// Clone (95% similar)
function transformData(data: number[]) {
  return data.map((item) => item * 2);
}
```

**Type-3: Modified Statements**

```typescript
// Original
function processArray(arr: number[]) {
  return arr.map((x) => x * 2);
}

// Clone (87% similar)
function doubleValues(arr: number[]) {
  const result = [];
  for (const x of arr) {
    result.push(x * 2);
  }
  return result;
}
```

## Common Workflows

### 1. Pre-Commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash
nlci scan ./src --threshold 0.95 --output clones.json

if [ -s clones.json ]; then
  echo "⚠️  High-similarity clones detected!"
  echo "Review clones.json before committing"
  exit 1
fi
```

### 2. CI/CD Pipeline

See [CI/CD Integration Tutorial](./ci-integration.md)

### 3. Refactoring Workflow

1. Scan codebase: `nlci scan ./src`
2. Generate report: `nlci report`
3. Review clone groups in HTML report
4. Extract common code to utilities
5. Rescan to verify: `nlci scan ./src`

## Next Steps

- [CI/CD Integration](./ci-integration.md) - Automate clone detection
- [Custom Embedder](./custom-embedder.md) - Use your own models
- [Configuration Guide](../guides/configuration.md) - Advanced options
- [Performance Tuning](../guides/performance-tuning.md) - Optimize for large codebases

## Troubleshooting

### Issue: "No code blocks found"

**Cause**: Parser can't find TypeScript/JavaScript files
**Solution**: Check your glob patterns in `.nlcirc.json`

```json
{
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js"]
}
```

### Issue: "Too many false positives"

**Cause**: Threshold too low
**Solution**: Increase threshold to 0.90 or 0.95

```bash
nlci scan ./src --threshold 0.95
```

### Issue: "Scan is slow"

**Cause**: Large codebase with default settings
**Solution**: See [Performance Tuning Guide](../guides/performance-tuning.md)

## Support

- **Issues**: [GitHub Issues](https://github.com/iamthegreatdestroyer/NLCI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/iamthegreatdestroyer/NLCI/discussions)
- **Documentation**: [Full Documentation](../index.md)
