# NLCI VS Code Extension

**Neural-LSH Code Intelligence** - Find similar code blocks in O(1) time.

## Features

### 🔍 Code Clone Detection

- Detect duplicate and similar code across your workspace
- Sub-linear O(1) query time using Locality-Sensitive Hashing
- Support for Type-1, Type-2, Type-3, and Type-4 clones

### 📊 Interactive Views

- **Tree View**: Browse all detected clones organized by file
- **Code Lens**: See clone indicators directly in your code
- **Diagnostics**: Get warnings for detected clones
- **Report Panel**: Interactive HTML report with filtering

### ⚡ Performance

- Index thousands of files in seconds
- Query similar code instantly
- Minimal memory footprint using probabilistic data structures

## Commands

| Command                   | Description                                  |
| ------------------------- | -------------------------------------------- |
| `NLCI: Scan Workspace`    | Build the index by scanning all source files |
| `NLCI: Find Similar Code` | Find code similar to the current selection   |
| `NLCI: Show All Clones`   | Open the clone report panel                  |
| `NLCI: Show Statistics`   | Display index statistics                     |
| `NLCI: Clear Index`       | Remove the index and start fresh             |
| `NLCI: Open Settings`     | Open NLCI settings                           |

## Settings

| Setting                   | Default                  | Description                                     |
| ------------------------- | ------------------------ | ----------------------------------------------- |
| `nlci.enabled`            | `true`                   | Enable NLCI code clone detection                |
| `nlci.autoScan`           | `false`                  | Automatically scan workspace on startup         |
| `nlci.threshold`          | `0.85`                   | Minimum similarity threshold (0-1)              |
| `nlci.showCodeLens`       | `true`                   | Show code lens above detected clones            |
| `nlci.showDiagnostics`    | `true`                   | Show diagnostics for detected clones            |
| `nlci.diagnosticSeverity` | `information`            | Severity level (error/warning/information/hint) |
| `nlci.excludePatterns`    | `["**/node_modules/**"]` | Glob patterns to exclude                        |
| `nlci.lsh.numTables`      | `20`                     | Number of LSH hash tables (L)                   |
| `nlci.lsh.numBits`        | `12`                     | Number of bits per hash (K)                     |

## Clone Types

| Type   | Similarity | Description                                    |
| ------ | ---------- | ---------------------------------------------- |
| Type-1 | ≥99%       | Exact copies (only whitespace/comments differ) |
| Type-2 | 95-99%     | Renamed identifiers, changed literals          |
| Type-3 | 85-95%     | Near-miss clones with small modifications      |
| Type-4 | 70-85%     | Semantic clones (same logic, different syntax) |

## Usage

### Quick Start

1. Open a workspace with source code
2. Run `NLCI: Scan Workspace` from the command palette
3. Select some code and run `NLCI: Find Similar Code`

### Context Menu

Right-click on selected code to access:

- **NLCI: Find Similar Code** - Find similar blocks

### Tree View

The "Code Clones" view in the Explorer sidebar shows:

- Files with detected clones
- Individual clone pairs with similarity percentages
- Click to navigate to clone locations

### Code Lens

When enabled, code lens annotations appear above code blocks:

- Shows number of detected clones
- Click to find similar code

## Requirements

- VS Code 1.85.0 or later
- Node.js 20.0.0 or later

## Performance Tuning

### LSH Parameters

- **numTables (L)**: More tables = higher recall, more memory
- **numBits (K)**: More bits = higher precision, lower recall

Recommended settings:

- Small projects: L=10, K=8
- Medium projects: L=20, K=12 (default)
- Large projects: L=30, K=16

### Threshold

Lower threshold = more clones detected but more false positives:

- `0.95` - Only near-exact clones
- `0.85` - Balanced (default)
- `0.70` - Include semantic clones

## Troubleshooting

### "No index available"

Run `NLCI: Scan Workspace` to build the index.

### Too many false positives

Increase the threshold in settings or adjust LSH parameters.

### Performance issues

- Add frequently-accessed directories to exclude patterns
- Reduce the number of LSH tables

## License

AGPL-3.0-or-later

Commercial licensing available - contact the authors.
