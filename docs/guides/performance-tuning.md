# Performance Tuning Guide

This guide provides comprehensive strategies for optimizing NLCI's performance across different scales and hardware configurations. Learn how to tune LSH parameters, optimize memory usage, configure caching, and troubleshoot slow scans.

## Table of Contents

- [LSH Parameter Tuning](#lsh-parameter-tuning)
- [Memory Optimization](#memory-optimization)
- [Batch Processing](#batch-processing)
- [Caching Strategies](#caching-strategies)
- [Benchmarking Methodology](#benchmarking-methodology)
- [Performance Profiling](#performance-profiling)
- [Troubleshooting Slow Scans](#troubleshooting-slow-scans)
- [Hardware Recommendations](#hardware-recommendations)
- [Performance Measurement Examples](#performance-measurement-examples)

---

## LSH Parameter Tuning

LSH (Locality-Sensitive Hashing) parameters significantly impact both detection accuracy and performance. Understanding these trade-offs is crucial for optimal configuration.

### Core Parameters

#### `numTables` (L) - Number of Hash Tables

The number of hash tables directly affects recall (detection accuracy) and resource usage:

| L Value | Recall | Speed       | Memory      | Use Case                     |
| ------- | ------ | ----------- | ----------- | ---------------------------- |
| 10      | ~85%   | Very Fast   | Low         | Quick scans, small codebases |
| 15      | ~90%   | Fast        | Medium-Low  | Balanced performance         |
| 20      | ~95%   | Medium      | Medium      | Default (recommended)        |
| 25      | ~97%   | Medium-Slow | Medium-High | Higher accuracy needs        |
| 30      | ~98%   | Slow        | High        | Maximum accuracy             |
| 40      | ~99%   | Very Slow   | Very High   | Research/analysis only       |

**Trade-offs:**

- **More tables (↑L)**: Higher recall, slower queries, more memory
- **Fewer tables (↓L)**: Lower recall, faster queries, less memory

**Recommendations:**

```typescript
// Speed-optimized (CI/CD, quick feedback)
{
  "lsh": {
    "numTables": 15,
    "numHashes": 10
  }
}

// Accuracy-optimized (thorough analysis)
{
  "lsh": {
    "numTables": 35,
    "numHashes": 16
  }
}

// Balanced (default - recommended)
{
  "lsh": {
    "numTables": 20,
    "numHashes": 12
  }
}
```

#### `numHashes` (K) - Hash Functions per Table

Controls collision rate and selectivity:

| K Value | Selectivity | False Positives | Use Case                |
| ------- | ----------- | --------------- | ----------------------- |
| 8       | Low         | Higher          | Fast, tolerant matching |
| 10      | Medium-Low  | Medium          | Quick scans             |
| 12      | Medium      | Low             | Default (balanced)      |
| 16      | High        | Very Low        | Precise matching        |
| 20      | Very High   | Minimal         | Research only           |

**Trade-offs:**

- **More hashes (↑K)**: More selective, fewer false positives, slower
- **Fewer hashes (↓K)**: Less selective, more candidates, faster

**Optimal Combinations:**

| Scenario                         | L   | K   | Expected Performance       |
| -------------------------------- | --- | --- | -------------------------- |
| Small codebase (`<`5K functions) | 15  | 10  | `<`30ms query, 95% recall  |
| Medium codebase (5K-20K)         | 20  | 12  | `<`50ms query, 95% recall  |
| Large codebase (20K-50K)         | 25  | 14  | `<`100ms query, 96% recall |
| Very large (`>`50K)              | 30  | 16  | `<`200ms query, 97% recall |
| CI/CD (speed priority)           | 15  | 10  | `<`30ms query, 90% recall  |
| Analysis (accuracy priority)     | 35  | 16  | `<`300ms query, 98% recall |

#### `dimensions` - Embedding Vector Dimensions

Embedding dimension affects accuracy and memory:

| Dimensions | Model               | Memory/Embedding | Accuracy | Speed  |
| ---------- | ------------------- | ---------------- | -------- | ------ |
| 384        | CodeBERT (default)  | 1.5 KB           | Good     | Fast   |
| 768        | RoBERTa, BERT-large | 3 KB             | Better   | Medium |
| 1536       | OpenAI ada-002      | 6 KB             | Best     | Slower |

**Memory Impact:**

```
Total LSH index memory ≈ (L × K × N × dimensions × 4) / 8 bytes

Example with 10,000 functions:
- 384 dimensions: (20 × 12 × 10000 × 384 × 4) / 8 = 461 MB
- 768 dimensions: (20 × 12 × 10000 × 768 × 4) / 8 = 922 MB
- 1536 dimensions: (20 × 12 × 10000 × 1536 × 4) / 8 = 1.84 GB
```

**Recommendation:** Use 384 dimensions (CodeBERT) unless you need maximum accuracy and have sufficient memory.

---

## Memory Optimization

### Index Storage Strategy

Choose index strategy based on memory constraints:

```typescript
{
  "performance": {
    "indexStrategy": "memory" | "disk" | "hybrid"
  }
}
```

**Strategy Comparison:**

| Strategy   | Speed   | Memory                | Disk I/O | Use Case           |
| ---------- | ------- | --------------------- | -------- | ------------------ |
| **memory** | Fastest | 500MB (10K functions) | None     | Default, <32GB RAM |
| **disk**   | Slowest | 50MB                  | Heavy    | Memory-constrained |
| **hybrid** | Medium  | 200MB                 | Medium   | Balanced           |

**Performance Impact:**

- **Memory**: Query time <50ms, indexing <60s for 10K functions
- **Disk**: Query time <200ms, indexing <120s for 10K functions
- **Hybrid**: Query time <100ms, indexing <80s for 10K functions

**Configuration Examples:**

```typescript
// Memory-optimized (fastest, requires RAM)
{
  "performance": {
    "indexStrategy": "memory",
    "maxConcurrency": 8,
    "batchSize": 64
  }
}

// Disk-optimized (memory-constrained systems)
{
  "performance": {
    "indexStrategy": "disk",
    "maxConcurrency": 2,
    "batchSize": 8,
    "enableCache": true
  }
}

// Hybrid (balanced for large codebases)
{
  "performance": {
    "indexStrategy": "hybrid",
    "maxConcurrency": 4,
    "batchSize": 32
  }
}
```

### Memory Usage by Codebase Size

| Codebase Size | Functions | Memory Strategy | Expected RAM | Config        |
| ------------- | --------- | --------------- | ------------ | ------------- |
| Small         | <5,000    | memory          | 4-8 GB       | batchSize: 64 |
| Medium        | 5K-20K    | memory/hybrid   | 8-16 GB      | batchSize: 32 |
| Large         | 20K-50K   | hybrid          | 16-32 GB     | batchSize: 16 |
| Very Large    | >50K      | disk/hybrid     | 8-16 GB      | batchSize: 8  |

---

## Batch Processing

Batch size affects memory usage and parallelization efficiency:

```typescript
{
  "performance": {
    "batchSize": 8 | 16 | 32 | 64,
    "maxConcurrency": 2 | 4 | 8 | 16
  }
}
```

### Batch Size Recommendations

| RAM Available | Batch Size | Max Concurrency | Rationale                |
| ------------- | ---------- | --------------- | ------------------------ |
| 2-4 GB        | 8          | 2               | Minimal memory footprint |
| 4-8 GB        | 16         | 4               | Light memory usage       |
| 8-16 GB       | 32         | 4-8             | Balanced performance     |
| 16-32 GB      | 64         | 8               | High throughput          |
| 32+ GB        | 128        | 16              | Maximum performance      |

### CPU Core Utilization

Match concurrency to available CPU cores:

| CPU Cores  | Max Concurrency | Efficiency          |
| ---------- | --------------- | ------------------- |
| 2-4 cores  | 2-4             | Good                |
| 4-8 cores  | 4-8             | Optimal             |
| 8-16 cores | 8-12            | Excellent           |
| 16+ cores  | 12-16           | Diminishing returns |

**Configuration Example:**

```typescript
// 8-core CPU, 16GB RAM
{
  "performance": {
    "batchSize": 32,
    "maxConcurrency": 8,
    "indexStrategy": "memory"
  }
}
```

### Incremental Indexing

For large repositories, use incremental indexing to avoid full re-scans:

```typescript
{
  "performance": {
    "enableIncrementalIndexing": true,
    "indexCachePath": ".nlci-cache",
    "indexCacheTTL": 86400  // 24 hours
  }
}
```

**Benefits:**

- Only processes changed files (git diff integration)
- Persistent index storage between runs
- 10-100x faster for subsequent scans
- Ideal for CI/CD pipelines

---

## Caching Strategies

### Embedding Cache

Cache computed embeddings to avoid re-computation:

```typescript
{
  "embedder": {
    "enableCache": true,
    "cacheStrategy": "lru",
    "cacheMaxSize": 10000,
    "cacheTTL": 3600  // 1 hour
  }
}
```

**Cache Strategy Comparison:**

| Strategy          | Hit Rate | Memory | Eviction              |
| ----------------- | -------- | ------ | --------------------- |
| **lru** (default) | High     | Medium | Least recently used   |
| **lfu**           | Medium   | Medium | Least frequently used |
| **ttl**           | Medium   | Low    | Time-based expiration |

**Cache Size Recommendations:**

| Codebase Size | Cache Size | Memory Impact |
| ------------- | ---------- | ------------- |
| <5K functions | 5,000      | ~7.5 MB       |
| 5K-20K        | 10,000     | ~15 MB        |
| 20K-50K       | 50,000     | ~75 MB        |
| >50K          | 100,000    | ~150 MB       |

**Memory per cached embedding:** ~1.5 KB (384 dimensions)

### LSH Index Caching

Cache LSH index structure for faster subsequent scans:

```typescript
{
  "lsh": {
    "enableIndexCache": true,
    "indexCacheStrategy": "full" | "partial" | "none"
  }
}
```

**Cache Strategy Trade-offs:**

| Strategy    | Speed   | Memory | Use Case                           |
| ----------- | ------- | ------ | ---------------------------------- |
| **full**    | Fastest | High   | Production, frequent scans         |
| **partial** | Medium  | Medium | Development, occasional scans      |
| **none**    | Slowest | Low    | Memory-constrained, one-time scans |

---

## Benchmarking Methodology

### Query Time Measurement

Target: <50ms for single query, <5s for 100 queries

```typescript
import { CloneEngine } from '@nlci/core';

async function benchmarkQuery() {
  const engine = await CloneEngine.create({
    lsh: { numTables: 20, numHashes: 12 },
  });

  // Warm-up run
  await engine.findClones('function example() {}');

  // Benchmark
  const iterations = 100;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await engine.findClones('function example() {}');
  }

  const end = performance.now();
  const avgTime = (end - start) / iterations;

  console.log(`Average query time: ${avgTime.toFixed(2)}ms`);
  console.log(`Queries per second: ${(1000 / avgTime).toFixed(0)}`);
}
```

### Indexing Time Measurement

Target: <60s for 10,000 functions, <10 minutes for 100,000 functions

```typescript
async function benchmarkIndexing(files: string[]) {
  const start = performance.now();

  const engine = await CloneEngine.create({
    lsh: { numTables: 20, numHashes: 12 },
    performance: { batchSize: 32, maxConcurrency: 8 },
  });

  await engine.indexFiles(files);

  const end = performance.now();
  const totalTime = (end - start) / 1000;
  const functionsPerSecond = files.length / totalTime;

  console.log(`Total indexing time: ${totalTime.toFixed(2)}s`);
  console.log(`Functions per second: ${functionsPerSecond.toFixed(0)}`);
}
```

### Parameter Sweep Benchmark

Test multiple parameter combinations to find optimal configuration:

```typescript
async function parameterSweep() {
  const configurations = [
    { L: 10, K: 8 },
    { L: 15, K: 10 },
    { L: 20, K: 12 },
    { L: 25, K: 14 },
    { L: 30, K: 16 },
  ];

  const results = [];

  for (const config of configurations) {
    const engine = await CloneEngine.create({
      lsh: {
        numTables: config.L,
        numHashes: config.K,
      },
    });

    // Measure indexing time
    const indexStart = performance.now();
    await engine.indexFiles(testFiles);
    const indexTime = performance.now() - indexStart;

    // Measure query time
    const queryStart = performance.now();
    const clones = await engine.findClones(testCode);
    const queryTime = performance.now() - queryStart;

    // Measure memory
    const memUsage = process.memoryUsage();

    results.push({
      L: config.L,
      K: config.K,
      indexTime: (indexTime / 1000).toFixed(2),
      queryTime: queryTime.toFixed(2),
      memory: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
      clonesFound: clones.length,
    });
  }

  console.table(results);
}
```

**Example Results:**

| L   | K   | Index Time (s) | Query Time (ms) | Memory (MB) | Clones Found |
| --- | --- | -------------- | --------------- | ----------- | ------------ |
| 10  | 8   | 45.2           | 28.5            | 320         | 142          |
| 15  | 10  | 52.8           | 35.2            | 410         | 156          |
| 20  | 12  | 58.3           | 42.1            | 520         | 164          |
| 25  | 14  | 67.9           | 51.8            | 640         | 168          |
| 30  | 16  | 78.4           | 63.2            | 780         | 171          |

---

## Performance Profiling

### CPU Profiling

Identify hot paths and optimize bottlenecks:

```bash
# Node.js built-in profiler
node --prof src/index.js

# Process prof file
node --prof-process isolate-0x*.log > profile.txt

# Analyze flame graph
grep -A 10 "Statistical profiling result" profile.txt
```

**Common Bottlenecks:**

- **Embedding generation**: 40-60% of CPU time
- **LSH hashing**: 20-30% of CPU time
- **File parsing**: 10-20% of CPU time
- **Query processing**: 5-10% of CPU time

### Memory Profiling

Track memory usage and identify leaks:

```typescript
// Monitor memory during execution
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
    external: (usage.external / 1024 / 1024).toFixed(2) + ' MB',
  });
}, 5000);
```

**Tools:**

- **Chrome DevTools**: `node --inspect` + chrome://inspect
- **Clinic.js Doctor**: `clinic doctor -- node src/index.js`
- **Clinic.js Flame**: `clinic flame -- node src/index.js`
- **heapdump**: Capture heap snapshots for analysis

### I/O Profiling

Monitor file system operations:

```typescript
import { performance, PerformanceObserver } from 'perf_hooks';

const obs = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
  });
});

obs.observe({ entryTypes: ['measure'] });

// Measure file operations
performance.mark('read-start');
await fs.readFile('large-file.ts', 'utf-8');
performance.mark('read-end');
performance.measure('File Read', 'read-start', 'read-end');
```

---

## Troubleshooting Slow Scans

### Issue 1: Large Files Slowing Down Processing

**Symptoms:**

- Indexing takes >2 minutes for <5K functions
- Memory spikes during parsing

**Diagnosis:**

```bash
# Find large files
find . -type f -size +1M -name "*.ts" -o -name "*.js"
```

**Solutions:**

1. **Exclude large files:**

```json
{
  "files": {
    "excludePatterns": ["**/*-large.ts", "**/*.min.js", "**/bundle.js"]
  }
}
```

2. **Enable chunking:**

```json
{
  "parser": {
    "enableChunking": true,
    "chunkSize": 50000 // 50KB chunks
  }
}
```

### Issue 2: Inefficient Glob Patterns

**Symptoms:**

- Long file discovery phase
- Scanning unnecessary directories

**Bad Patterns:**

```json
{
  "files": {
    "includePatterns": [
      "**/*.*", // Too broad
      "**/*.{js,ts,tsx,jsx}" // Better, but still broad
    ]
  }
}
```

**Good Patterns:**

```json
{
  "files": {
    "includePatterns": ["src/**/*.ts", "lib/**/*.js"],
    "excludePatterns": ["**/node_modules/**", "**/dist/**", "**/*.test.ts"]
  }
}
```

### Issue 3: Database Backend Performance

**Symptoms:**

- Query time >100ms consistently
- High memory usage

**Solutions:**

1. **Switch to memory strategy:**

```json
{
  "performance": {
    "indexStrategy": "memory"
  }
}
```

2. **Rebuild index:**

```bash
# Clear cache and rebuild
rm -rf .nlci-cache
nlci scan --rebuild
```

### Issue 4: Concurrency Issues

**Symptoms:**

- CPU not fully utilized
- Indexing slower than expected

**Check CPU usage:**

```bash
# Windows
Get-Process node | Select-Object CPU,PM,NPM,WS

# Linux/Mac
top -p $(pgrep node)
```

**Adjust concurrency:**

```json
{
  "performance": {
    "maxConcurrency": 8 // Match CPU core count
  }
}
```

---

## Hardware Recommendations

### CPU Requirements

| Codebase Size | Minimum          | Recommended       | Optimal            |
| ------------- | ---------------- | ----------------- | ------------------ |
| <5K functions | 2 cores, 2.0 GHz | 4 cores, 2.5 GHz  | 8 cores, 3.0+ GHz  |
| 5K-20K        | 4 cores, 2.5 GHz | 4 cores, 3.0 GHz  | 8 cores, 3.5+ GHz  |
| 20K-50K       | 4 cores, 3.0 GHz | 8 cores, 3.0 GHz  | 16 cores, 3.5+ GHz |
| >50K          | 8 cores, 3.0 GHz | 16 cores, 3.5 GHz | 32 cores, 4.0+ GHz |

**CPU Recommendations:**

- **Development**: Intel Core i5/i7, AMD Ryzen 5/7
- **CI/CD**: Intel Xeon E5, AMD EPYC (multi-core)
- **Analysis**: Intel Xeon Scalable, AMD Threadripper

### RAM Requirements

| Codebase Size | Minimum          | Recommended | Optimal |
| ------------- | ---------------- | ----------- | ------- |
| <5K functions | 4 GB (with disk) | 8 GB        | 16 GB   |
| 5K-20K        | 8 GB             | 16 GB       | 32 GB   |
| 20K-50K       | 16 GB            | 32 GB       | 64 GB   |
| >50K          | 32 GB            | 64 GB       | 128 GB  |

**Memory Allocation:**

- **Node.js heap**: `--max-old-space-size=8192` (8GB)
- **System overhead**: 2-4 GB
- **Cache & buffers**: 10-20% of available RAM

### Storage Requirements

| Aspect             | SSD        | NVMe            | HDD             |
| ------------------ | ---------- | --------------- | --------------- |
| **Index Build**    | Fast (60s) | Very Fast (45s) | Slow (120s+)    |
| **Query Time**     | <50ms      | <30ms           | 100-200ms       |
| **Recommendation** | Minimum    | Optimal         | Not Recommended |

**Disk Space:**

- **Index storage**: 10-50 MB per 10K functions
- **Cache storage**: 50-200 MB (configurable)
- **Temporary files**: 100-500 MB

---

## Performance Measurement Examples

### Benchmark Script Template

```typescript
import { CloneEngine } from '@nlci/core';
import { performance } from 'perf_hooks';

async function runBenchmark() {
  const configs = [
    { name: 'Fast', L: 15, K: 10, batch: 64 },
    { name: 'Balanced', L: 20, K: 12, batch: 32 },
    { name: 'Accurate', L: 30, K: 16, batch: 16 },
  ];

  console.log('NLCI Performance Benchmark');
  console.log('='.repeat(60));

  for (const config of configs) {
    console.log(`\nTesting: ${config.name}`);
    console.log('-'.repeat(60));

    const engine = await CloneEngine.create({
      lsh: {
        numTables: config.L,
        numHashes: config.K,
      },
      performance: {
        batchSize: config.batch,
        maxConcurrency: 8,
      },
    });

    // Index phase
    const indexStart = performance.now();
    await engine.indexDirectory('src');
    const indexTime = performance.now() - indexStart;

    // Query phase
    const queries = 100;
    const queryStart = performance.now();
    for (let i = 0; i < queries; i++) {
      await engine.findClones('function test() { return 42; }');
    }
    const queryTime = (performance.now() - queryStart) / queries;

    // Memory
    const mem = process.memoryUsage();

    console.log(`Index Time: ${(indexTime / 1000).toFixed(2)}s`);
    console.log(`Avg Query Time: ${queryTime.toFixed(2)}ms`);
    console.log(`Memory: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  }
}

runBenchmark().catch(console.error);
```

### Expected Results Table

| Configuration   | Index Time | Query Time | Memory | Accuracy |
| --------------- | ---------- | ---------- | ------ | -------- |
| Fast (L=15)     | 48s        | 32ms       | 380 MB | ~90%     |
| Balanced (L=20) | 58s        | 42ms       | 520 MB | ~95%     |
| Accurate (L=30) | 82s        | 68ms       | 780 MB | ~98%     |

---

## Summary

**Quick Optimization Checklist:**

- ✅ **Start with defaults** (L=20, K=12, batch=32)
- ✅ **Profile first** before optimizing
- ✅ **Match concurrency to CPU cores**
- ✅ **Use memory strategy** if RAM available
- ✅ **Enable caching** for repeated scans
- ✅ **Tune for your workload** (speed vs accuracy)
- ✅ **Monitor memory usage** during indexing
- ✅ **Benchmark parameter changes** before deploying

**Performance Targets:**

- **Small codebases (<5K)**: <1 minute full scan
- **Medium codebases (5K-20K)**: <3 minutes full scan
- **Large codebases (>20K)**: <10 minutes full scan
- **Query time**: <50ms average
- **Memory usage**: <1GB for 10K functions

For further assistance, see the [Configuration Guide](./configuration.md) or open an issue on [GitHub](https://github.com/iamthegreatdestroyer/NLCI/issues).
