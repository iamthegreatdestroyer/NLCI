/**
 * Phase 4: Performance Validation Benchmarks
 *
 * Benchmarks for all hybrid optimization phases:
 * - Phase 1: Enhanced Hyperplane Projections
 * - Phase 2: LSH Index Optimizations
 * - Phase 3: Hash Table Enhancements
 */

import type { CodeBlock } from '@nlci/core';
import {
  computeDotProductOptimized,
  computeHash,
  computeHashBatch,
  computeProjectionQuality,
  createHashFunction,
  createHyperplane,
  createOrthogonalHashFunction,
  estimateCosineSimilarity,
  generateProbes,
  generateScoredProbes,
  hammingDistance,
  HashTable,
  LSHIndex,
  SeededRandom,
} from '@nlci/core/lsh';
import { bench, describe } from 'vitest';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a random embedding vector
 */
function generateRandomEmbedding(dim: number = 384): Float32Array {
  const embedding = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    embedding[i] = (Math.random() - 0.5) * 2;
  }
  return embedding;
}

/**
 * Create a mock CodeBlock for testing
 */
function createMockBlock(id: number | string): CodeBlock {
  const idStr = typeof id === 'number' ? `block-${id}` : id;
  return {
    id: idStr,
    filePath: `test/file-${idStr}.ts`,
    startLine: 1,
    endLine: 10,
    startColumn: 0,
    endColumn: 80,
    content: `function test${idStr}() { return ${idStr}; }`,
    normalizedContent: `function test() { return x; }`,
    language: 'typescript',
    blockType: 'function',
    name: `test${idStr}`,
    contentHash: `hash-${idStr}`,
    tokenCount: 10,
    indexedAt: new Date(),
    embedding: generateRandomEmbedding(),
  } as CodeBlock & { embedding: Float32Array };
}

/**
 * Pre-generate embeddings for benchmarks
 */
function preGenerateEmbeddings(count: number, dim: number = 384): Float32Array[] {
  const embeddings: Float32Array[] = [];
  for (let i = 0; i < count; i++) {
    embeddings.push(generateRandomEmbedding(dim));
  }
  return embeddings;
}

// ============================================================================
// PHASE 1: HYPERPLANE PROJECTION BENCHMARKS
// ============================================================================

describe('Phase 1: Hyperplane Projections', () => {
  const dim = 384;
  const numBits = 12;
  const rng = new SeededRandom(42);

  describe('Standard vs Orthogonal Hyperplane Creation', () => {
    bench('createHashFunction (standard) - 20 tables x 12 bits', () => {
      for (let t = 0; t < 20; t++) {
        createHashFunction(numBits, dim, 42 + t);
      }
    });

    bench('createOrthogonalHashFunction - 20 tables x 12 bits', () => {
      for (let t = 0; t < 20; t++) {
        createOrthogonalHashFunction(numBits, dim, 42 + t);
      }
    });
  });

  describe('Dot Product Optimization', () => {
    const hyperplane = createHyperplane(dim, rng);
    const embeddings = preGenerateEmbeddings(1000, dim);

    bench('computeDotProductOptimized - 1,000 vectors', () => {
      for (const embedding of embeddings) {
        computeDotProductOptimized(embedding, hyperplane.normal);
      }
    });

    bench('Native dot product - 1,000 vectors', () => {
      for (const embedding of embeddings) {
        let sum = 0;
        for (let i = 0; i < dim; i++) {
          sum += embedding[i] * hyperplane.normal[i];
        }
      }
    });
  });

  describe('Hash Computation', () => {
    const hashFn = createHashFunction(numBits, dim, 42);
    const embeddings = preGenerateEmbeddings(1000, dim);

    bench('computeHash (single) - 1,000 embeddings', () => {
      for (const embedding of embeddings) {
        computeHash(embedding, hashFn);
      }
    });

    bench('computeHashBatch - 1,000 embeddings batched', () => {
      computeHashBatch(embeddings, hashFn);
    });
  });

  describe('Projection Quality Analysis', () => {
    bench('computeProjectionQuality (standard)', () => {
      const hashFn = createHashFunction(numBits, dim, 42);
      computeProjectionQuality(hashFn);
    });

    bench('computeProjectionQuality (orthogonal)', () => {
      const hashFn = createOrthogonalHashFunction(numBits, dim, 42);
      computeProjectionQuality(hashFn);
    });
  });
});

// ============================================================================
// PHASE 2: LSH INDEX OPTIMIZATION BENCHMARKS
// ============================================================================

describe('Phase 2: LSH Index Optimizations', () => {
  const dim = 384;
  const numBits = 12;
  const numTables = 20;

  describe('Multi-Probe Generation', () => {
    const sampleHash = BigInt('0xABCDEF123456');
    const sampleEmbedding = generateRandomEmbedding(dim);
    const hashFn = createHashFunction(numBits, dim, 42);

    bench('generateProbes - 5 probes', () => {
      for (let i = 0; i < 1000; i++) {
        generateProbes(sampleHash, numBits, 5);
      }
    });

    bench('generateProbes - 10 probes', () => {
      for (let i = 0; i < 1000; i++) {
        generateProbes(sampleHash, numBits, 10);
      }
    });

    bench('generateScoredProbes - 5 probes with scores', () => {
      for (let i = 0; i < 1000; i++) {
        generateScoredProbes(sampleHash, sampleEmbedding, hashFn, 5);
      }
    });

    bench('generateScoredProbes - 10 probes with scores', () => {
      for (let i = 0; i < 1000; i++) {
        generateScoredProbes(sampleHash, sampleEmbedding, hashFn, 10);
      }
    });
  });

  describe('Index Construction', () => {
    bench('LSHIndex construction - standard', () => {
      new LSHIndex({
        numTables,
        numBits,
        dimension: dim,
        seed: 42,
        useOrthogonalHyperplanes: false,
      });
    });

    bench('LSHIndex construction - orthogonal hyperplanes', () => {
      new LSHIndex({
        numTables,
        numBits,
        dimension: dim,
        seed: 42,
        useOrthogonalHyperplanes: true,
      });
    });
  });

  describe('Index Insert Performance', () => {
    const blocksWithEmbeddings = Array.from({ length: 1000 }, (_, i) => {
      const block = createMockBlock(i);
      return { block, embedding: (block as unknown as { embedding: Float32Array }).embedding };
    });

    bench('Insert 1,000 blocks - standard config', () => {
      const index = new LSHIndex({
        numTables,
        numBits,
        dimension: dim,
        seed: 42,
      });

      for (const { block, embedding } of blocksWithEmbeddings) {
        index.insert(block, embedding);
      }
    });

    bench('Insert 1,000 blocks - orthogonal hyperplanes', () => {
      const index = new LSHIndex({
        numTables,
        numBits,
        dimension: dim,
        seed: 42,
        useOrthogonalHyperplanes: true,
      });

      for (const { block, embedding } of blocksWithEmbeddings) {
        index.insert(block, embedding);
      }
    });
  });

  describe('Query Performance', () => {
    // Pre-build index for query benchmarks
    const indexStandard = new LSHIndex({
      numTables,
      numBits,
      dimension: dim,
      seed: 42,
      multiProbe: { enabled: true, numProbes: 5 },
    });

    const indexScored = new LSHIndex({
      numTables,
      numBits,
      dimension: dim,
      seed: 42,
      multiProbe: { enabled: true, numProbes: 5 },
      useScoredProbes: true,
    });

    // Pre-populate
    for (let i = 0; i < 1000; i++) {
      const block = createMockBlock(i);
      const embedding = (block as unknown as { embedding: Float32Array }).embedding;
      indexStandard.insert(block, embedding);
      indexScored.insert(block, embedding);
    }

    const queryEmbeddings = preGenerateEmbeddings(100, dim);

    bench('Query - standard multi-probe', () => {
      for (const embedding of queryEmbeddings) {
        indexStandard.query(embedding);
      }
    });

    bench('Query - scored multi-probe', () => {
      for (const embedding of queryEmbeddings) {
        indexScored.query(embedding);
      }
    });

    bench('Query - no multi-probe', () => {
      const indexNoProbe = new LSHIndex({
        numTables,
        numBits,
        dimension: dim,
        seed: 42,
        multiProbe: { enabled: false, numProbes: 0 },
      });

      for (let i = 0; i < 1000; i++) {
        const block = createMockBlock(i);
        const embedding = (block as unknown as { embedding: Float32Array }).embedding;
        indexNoProbe.insert(block, embedding);
      }

      for (const embedding of queryEmbeddings) {
        indexNoProbe.query(embedding);
      }
    });
  });
});

// ============================================================================
// PHASE 3: HASH TABLE ENHANCEMENT BENCHMARKS
// ============================================================================

describe('Phase 3: Hash Table Enhancements', () => {
  describe('Basic Operations', () => {
    bench('Insert 10,000 blocks - default config', () => {
      const ht = new HashTable();
      for (let i = 0; i < 10000; i++) {
        ht.insert(BigInt(i), createMockBlock(i));
      }
    });

    bench('Insert 10,000 blocks - with overflow chaining', () => {
      const ht = new HashTable({
        maxBucketSize: 100,
        enableOverflowChaining: true,
        maxOverflowChainLength: 5,
      });
      // Force collisions by using modular hash
      for (let i = 0; i < 10000; i++) {
        ht.insert(BigInt(i % 100), createMockBlock(i));
      }
    });
  });

  describe('Retrieval Performance', () => {
    const ht = new HashTable();
    for (let i = 0; i < 10000; i++) {
      ht.insert(BigInt(i), createMockBlock(i));
    }

    bench('get() - 10,000 lookups', () => {
      for (let i = 0; i < 10000; i++) {
        ht.get(BigInt(i));
      }
    });

    bench('has() - 10,000 existence checks', () => {
      for (let i = 0; i < 10000; i++) {
        ht.has(BigInt(i), `block-${i}`);
      }
    });

    bench('getMultiple() - 100 batch lookups of 100 hashes each', () => {
      for (let batch = 0; batch < 100; batch++) {
        const hashes = Array.from({ length: 100 }, (_, i) => BigInt(batch * 100 + i));
        ht.getMultiple(hashes);
      }
    });
  });

  describe('LRU Eviction', () => {
    bench('Insert with LRU tracking - 10,000 blocks', () => {
      const ht = new HashTable({
        enableLRUEviction: true,
        lruEvictionThreshold: 5000,
        lruEvictionFraction: 0.2,
      });
      for (let i = 0; i < 10000; i++) {
        ht.insert(BigInt(i), createMockBlock(i));
      }
    });

    bench('Access pattern with LRU updates - 10,000 accesses', () => {
      const ht = new HashTable({
        enableLRUEviction: true,
        lruEvictionThreshold: 20000,
      });
      for (let i = 0; i < 5000; i++) {
        ht.insert(BigInt(i), createMockBlock(i));
      }

      for (let i = 0; i < 10000; i++) {
        ht.get(BigInt(i % 5000));
      }
    });
  });

  describe('Collision Analytics', () => {
    bench('Insert with analytics - 10,000 blocks', () => {
      const ht = new HashTable({
        enableAnalytics: true,
      });
      // Force some collisions
      for (let i = 0; i < 10000; i++) {
        ht.insert(BigInt(i % 500), createMockBlock(i));
      }
    });

    bench('getCollisionAnalytics() after 10,000 inserts', () => {
      const ht = new HashTable({
        enableAnalytics: true,
      });
      for (let i = 0; i < 10000; i++) {
        ht.insert(BigInt(i % 500), createMockBlock(i));
      }
      ht.getCollisionAnalytics();
    });

    bench('getHotSpots(10) after 10,000 inserts', () => {
      const ht = new HashTable({
        enableAnalytics: true,
      });
      for (let i = 0; i < 10000; i++) {
        ht.insert(BigInt(i % 500), createMockBlock(i));
      }
      ht.getHotSpots(10);
    });
  });

  describe('Serialization', () => {
    const ht = new HashTable();
    for (let i = 0; i < 5000; i++) {
      ht.insert(BigInt(i), createMockBlock(i));
    }

    bench('toJSON() - 5,000 blocks', () => {
      ht.toJSON();
    });

    bench('fromJSON() - 5,000 blocks', () => {
      const json = ht.toJSON();
      HashTable.fromJSON(json);
    });

    bench('exportState() - 5,000 blocks', () => {
      ht.exportState();
    });
  });
});

// ============================================================================
// COMPARATIVE BENCHMARKS
// ============================================================================

describe('Comparative: Before vs After Optimizations', () => {
  const dim = 384;
  const numBits = 12;
  const numTables = 20;

  describe('End-to-End Index+Query', () => {
    const embeddings = preGenerateEmbeddings(1000, dim);
    const queryEmbedding = generateRandomEmbedding(dim);

    bench('Baseline: Standard LSHIndex', () => {
      const index = new LSHIndex({
        numTables,
        numBits,
        dimension: dim,
        seed: 42,
        useOrthogonalHyperplanes: false,
        useScoredProbes: false,
        multiProbe: { enabled: false, numProbes: 0 },
      });

      for (let i = 0; i < 500; i++) {
        const block = createMockBlock(i);
        index.insert(block, embeddings[i]);
      }

      for (let q = 0; q < 50; q++) {
        index.query(queryEmbedding);
      }
    });

    bench('Optimized: All Phase 1-2 features', () => {
      const index = new LSHIndex({
        numTables,
        numBits,
        dimension: dim,
        seed: 42,
        useOrthogonalHyperplanes: true,
        useScoredProbes: true,
        multiProbe: { enabled: true, numProbes: 5 },
      });

      for (let i = 0; i < 500; i++) {
        const block = createMockBlock(i);
        index.insert(block, embeddings[i]);
      }

      for (let q = 0; q < 50; q++) {
        index.query(queryEmbedding);
      }
    });
  });

  describe('Hamming Distance Computation', () => {
    const hash1 = BigInt('0xABCDEF1234567890');
    const hash2 = BigInt('0xABCDEE1234567891');

    bench('hammingDistance - 100,000 computations', () => {
      for (let i = 0; i < 100000; i++) {
        hammingDistance(hash1, hash2, numBits);
      }
    });
  });

  describe('Similarity Estimation', () => {
    bench('estimateCosineSimilarity - 100,000 computations', () => {
      for (let i = 0; i < 100000; i++) {
        const dist = i % (numBits + 1);
        estimateCosineSimilarity(dist, numBits);
      }
    });
  });
});

// ============================================================================
// SCALABILITY BENCHMARKS
// ============================================================================

describe('Scalability Analysis', () => {
  const dim = 384;

  describe('Index Size Scaling', () => {
    const sizes = [100, 500, 1000, 2000, 5000];

    for (const size of sizes) {
      const embeddings = preGenerateEmbeddings(size, dim);

      bench(`Insert ${size} blocks`, () => {
        const index = new LSHIndex({
          numTables: 20,
          numBits: 12,
          dimension: dim,
          seed: 42,
        });

        for (let i = 0; i < size; i++) {
          index.insert(createMockBlock(i), embeddings[i]);
        }
      });
    }
  });

  describe('Query Latency vs Index Size', () => {
    const sizes = [100, 500, 1000, 2000, 5000];

    for (const size of sizes) {
      const index = new LSHIndex({
        numTables: 20,
        numBits: 12,
        dimension: dim,
        seed: 42,
        multiProbe: { enabled: true, numProbes: 5 },
      });

      const embeddings = preGenerateEmbeddings(size, dim);
      for (let i = 0; i < size; i++) {
        index.insert(createMockBlock(i), embeddings[i]);
      }

      const queryEmbedding = generateRandomEmbedding(dim);

      bench(`Query in index of ${size} blocks`, () => {
        index.query(queryEmbedding);
      });
    }
  });

  describe('Hash Table Size Scaling', () => {
    const sizes = [1000, 5000, 10000, 20000];

    for (const size of sizes) {
      bench(`HashTable with ${size} blocks`, () => {
        const ht = new HashTable();
        for (let i = 0; i < size; i++) {
          ht.insert(BigInt(i), createMockBlock(i));
        }
      });
    }
  });
});
