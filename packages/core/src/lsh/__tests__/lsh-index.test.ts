/**
 * @nlci/core - LSH Index Tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { CodeBlock } from '../../types/code-block.js';
import { LSHIndex } from '../lsh-index.js';

describe('LSHIndex', () => {
  // Helper to create a test code block
  const createCodeBlock = (id: string, content: string = 'test code'): CodeBlock => ({
    id,
    fileId: 'test-file',
    filePath: 'test.ts',
    language: 'typescript',
    startLine: 1,
    endLine: 10,
    startColumn: 0,
    endColumn: 0,
    rawContent: content,
    normalizedContent: content,
    hash: 'abc123',
    tokens: 10,
    lines: 10,
  });

  // Helper to create random embedding
  const createRandomEmbedding = (dimension: number, seed: number = Date.now()): Float32Array => {
    const embedding = new Float32Array(dimension);
    let x = seed;
    for (let i = 0; i < dimension; i++) {
      x = ((x * 1103515245 + 12345) & 0x7fffffff) >>> 0;
      embedding[i] = (x / 0x7fffffff) * 2 - 1; // [-1, 1]
    }
    return embedding;
  };

  // Helper to create similar embedding
  const createSimilarEmbedding = (original: Float32Array, noise: number = 0.01): Float32Array => {
    const similar = new Float32Array(original.length);
    for (let i = 0; i < original.length; i++) {
      similar[i] = original[i] + (Math.random() - 0.5) * noise;
    }
    return similar;
  };

  describe('constructor', () => {
    it('should create index with default config', () => {
      const index = new LSHIndex();
      expect(index.size).toBe(0);
    });

    it('should create index with custom config', () => {
      const index = new LSHIndex({
        numTables: 10,
        numBits: 8,
        dimension: 128,
      });

      const stats = index.getStats();
      expect(stats.numTables).toBe(10);
      expect(stats.numBits).toBe(8);
      expect(stats.dimension).toBe(128);
    });
  });

  describe('insert()', () => {
    let index: LSHIndex;
    const dimension = 64;

    beforeEach(() => {
      index = new LSHIndex({
        numTables: 5,
        numBits: 8,
        dimension,
        multiProbe: { enabled: false, numProbes: 0 },
      });
    });

    it('should insert a code block', () => {
      const block = createCodeBlock('block-1');
      const embedding = createRandomEmbedding(dimension, 42);

      const result = index.insert(block, embedding);

      expect(result).toBe(true);
      expect(index.size).toBe(1);
      expect(index.has('block-1')).toBe(true);
    });

    it('should store embedding for retrieval', () => {
      const block = createCodeBlock('block-1');
      const embedding = createRandomEmbedding(dimension, 42);

      index.insert(block, embedding);

      const stored = index.getEmbedding('block-1');
      expect(stored).toBeDefined();
      expect(Array.from(stored!)).toEqual(Array.from(embedding));
    });

    it('should throw error for dimension mismatch', () => {
      const block = createCodeBlock('block-1');
      const wrongDimension = new Float32Array(32);

      expect(() => index.insert(block, wrongDimension)).toThrow();
    });

    it('should accept number[] as embedding', () => {
      const block = createCodeBlock('block-1');
      const embedding = Array.from(createRandomEmbedding(dimension, 42));

      const result = index.insert(block, embedding);

      expect(result).toBe(true);
      expect(index.has('block-1')).toBe(true);
    });
  });

  describe('query()', () => {
    let index: LSHIndex;
    const dimension = 64;

    beforeEach(() => {
      index = new LSHIndex({
        numTables: 20,
        numBits: 12,
        dimension,
        multiProbe: { enabled: true, numProbes: 5 },
      });
    });

    it('should find exact matches', () => {
      const block = createCodeBlock('block-1');
      const embedding = createRandomEmbedding(dimension, 42);

      index.insert(block, embedding);

      const results = index.query(embedding, {
        maxResults: 10,
        minSimilarity: 0.9,
      });

      expect(results.length).toBe(1);
      expect(results[0].block.id).toBe('block-1');
      expect(results[0].actualSimilarity).toBeCloseTo(1.0, 5);
    });

    it('should find similar embeddings', () => {
      const block = createCodeBlock('block-1');
      const embedding = createRandomEmbedding(dimension, 42);

      index.insert(block, embedding);

      // Create a very similar embedding
      const queryEmbedding = createSimilarEmbedding(embedding, 0.1);

      const results = index.query(queryEmbedding, {
        maxResults: 10,
        minSimilarity: 0.7,
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
      if (results.length > 0) {
        expect(results[0].block.id).toBe('block-1');
        expect(results[0].actualSimilarity).toBeGreaterThan(0.7);
      }
    });

    it('should return empty array for unrelated embeddings', () => {
      const block = createCodeBlock('block-1');
      const embedding1 = createRandomEmbedding(dimension, 42);
      const embedding2 = createRandomEmbedding(dimension, 999);

      index.insert(block, embedding1);

      const results = index.query(embedding2, {
        maxResults: 10,
        minSimilarity: 0.95,
      });

      // Very strict threshold should filter out unrelated
      expect(results.length).toBe(0);
    });

    it('should respect maxResults', () => {
      // Insert many blocks
      for (let i = 0; i < 10; i++) {
        const block = createCodeBlock(`block-${i}`);
        const embedding = createRandomEmbedding(dimension, 42 + i);
        index.insert(block, embedding);
      }

      const queryEmbedding = createRandomEmbedding(dimension, 42);
      const results = index.query(queryEmbedding, {
        maxResults: 3,
        minSimilarity: 0.0,
      });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should throw error for dimension mismatch', () => {
      const wrongDimension = new Float32Array(32);

      expect(() => index.query(wrongDimension)).toThrow();
    });
  });

  describe('remove()', () => {
    let index: LSHIndex;
    const dimension = 64;

    beforeEach(() => {
      index = new LSHIndex({
        numTables: 5,
        numBits: 8,
        dimension,
      });
    });

    it('should remove an existing block', () => {
      const block = createCodeBlock('block-1');
      const embedding = createRandomEmbedding(dimension, 42);

      index.insert(block, embedding);
      expect(index.has('block-1')).toBe(true);

      const removed = index.remove('block-1');

      expect(removed).toBe(true);
      expect(index.has('block-1')).toBe(false);
      expect(index.size).toBe(0);
    });

    it('should return false for non-existent block', () => {
      const removed = index.remove('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('has() and get()', () => {
    let index: LSHIndex;
    const dimension = 64;

    beforeEach(() => {
      index = new LSHIndex({ dimension });
    });

    it('should check if block exists', () => {
      const block = createCodeBlock('block-1');
      const embedding = createRandomEmbedding(dimension);

      expect(index.has('block-1')).toBe(false);

      index.insert(block, embedding);

      expect(index.has('block-1')).toBe(true);
    });

    it('should get block by id', () => {
      const block = createCodeBlock('block-1', 'test content');
      const embedding = createRandomEmbedding(dimension);

      index.insert(block, embedding);

      const retrieved = index.get('block-1');

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe('block-1');
      expect(retrieved!.rawContent).toBe('test content');
    });

    it('should return undefined for non-existent block', () => {
      expect(index.get('non-existent')).toBeUndefined();
    });
  });

  describe('getAllBlocks()', () => {
    it('should return all indexed blocks', () => {
      const index = new LSHIndex({ dimension: 64 });

      for (let i = 0; i < 5; i++) {
        const block = createCodeBlock(`block-${i}`);
        const embedding = createRandomEmbedding(64, i);
        index.insert(block, embedding);
      }

      const allBlocks = index.getAllBlocks();

      expect(allBlocks.length).toBe(5);
      expect(allBlocks.map((b) => b.id).sort()).toEqual([
        'block-0',
        'block-1',
        'block-2',
        'block-3',
        'block-4',
      ]);
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', () => {
      const index = new LSHIndex({
        numTables: 10,
        numBits: 8,
        dimension: 64,
      });

      for (let i = 0; i < 5; i++) {
        const block = createCodeBlock(`block-${i}`);
        const embedding = createRandomEmbedding(64, i);
        index.insert(block, embedding);
      }

      const stats = index.getStats();

      expect(stats.numTables).toBe(10);
      expect(stats.numBits).toBe(8);
      expect(stats.dimension).toBe(64);
      expect(stats.totalBlocks).toBe(5);
    });
  });

  describe('clear()', () => {
    it('should remove all blocks', () => {
      const index = new LSHIndex({ dimension: 64 });

      for (let i = 0; i < 5; i++) {
        const block = createCodeBlock(`block-${i}`);
        const embedding = createRandomEmbedding(64, i);
        index.insert(block, embedding);
      }

      expect(index.size).toBe(5);

      index.clear();

      expect(index.size).toBe(0);
      expect(index.has('block-0')).toBe(false);
    });
  });

  describe('size', () => {
    it('should track number of blocks', () => {
      const index = new LSHIndex({ dimension: 64 });

      expect(index.size).toBe(0);

      for (let i = 0; i < 3; i++) {
        const block = createCodeBlock(`block-${i}`);
        const embedding = createRandomEmbedding(64, i);
        index.insert(block, embedding);
        expect(index.size).toBe(i + 1);
      }

      index.remove('block-1');
      expect(index.size).toBe(2);
    });
  });
});
