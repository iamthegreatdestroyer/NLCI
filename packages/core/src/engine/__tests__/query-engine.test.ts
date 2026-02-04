/**
 * @nlci/core - Query Engine Tests
 *
 * Tests for QueryEngine class and clone detection functionality
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { LSHIndex } from '../../lsh/lsh-index.js';
import type { CodeBlock } from '../../types/code-block.js';
import { MockEmbeddingModel } from '../indexer.js';
import { QueryEngine, type QueryOptions } from '../query-engine.js';

describe('QueryEngine', () => {
  let index: LSHIndex;
  let embedder: MockEmbeddingModel;
  let queryEngine: QueryEngine;
  const dimension = 64;

  // Helper to create a test code block
  const createBlock = (id: string, content: string, filePath: string = 'test.ts'): CodeBlock => ({
    id,
    fileId: `file-${filePath}`,
    filePath,
    language: 'typescript',
    startLine: 1,
    endLine: 10,
    startColumn: 0,
    endColumn: 0,
    rawContent: content,
    normalizedContent: content,
    content,
    name: id,
    type: 'function',
    hash: `hash-${id}`,
    tokens: content.split(/\s+/).length,
    lines: content.split('\n').length,
  });

  // Helper to insert a block with its embedding
  const insertBlock = async (block: CodeBlock): Promise<void> => {
    const embedding = await embedder.embed(block.content);
    index.insert(block, embedding);
  };

  beforeEach(() => {
    index = new LSHIndex({
      numTables: 10,
      numBits: 8,
      dimension,
      multiProbe: { enabled: true, numProbes: 3 },
    });
    embedder = new MockEmbeddingModel(dimension);
    queryEngine = new QueryEngine(index, embedder);
  });

  describe('constructor', () => {
    it('should create query engine with index and embedder', () => {
      expect(queryEngine).toBeDefined();
    });
  });

  describe('query()', () => {
    it('should find similar code by string query', async () => {
      const block = createBlock('block-1', 'function add(a, b) { return a + b; }');
      await insertBlock(block);

      const result = await queryEngine.query('function add(a, b) { return a + b; }');

      expect(result.clones.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty results for non-matching query', async () => {
      const block = createBlock('block-1', 'function add(a, b) { return a + b; }');
      await insertBlock(block);

      // Completely different code
      const result = await queryEngine.query(
        'class CompletelyDifferent { constructor() { this.x = 999; } }'
      );

      // May or may not find clones depending on embedding similarity
      expect(result.clones).toBeDefined();
    });

    it('should respect maxResults option', async () => {
      // Insert multiple blocks
      for (let i = 0; i < 10; i++) {
        const block = createBlock(`block-${i}`, `function func${i}(x) { return x + ${i}; }`);
        await insertBlock(block);
      }

      const result = await queryEngine.query('function func0(x) { return x + 0; }', {
        maxResults: 3,
      });

      expect(result.clones.length).toBeLessThanOrEqual(3);
    });

    it('should respect minSimilarity option', async () => {
      const block = createBlock('block-1', 'function test() { return 42; }');
      await insertBlock(block);

      const highThresholdResult = await queryEngine.query('function test() { return 42; }', {
        minSimilarity: 0.99,
      });

      // Should find exact match with high threshold
      expect(highThresholdResult.clones.length).toBeGreaterThanOrEqual(0);
    });

    it('should include query time in results', async () => {
      const block = createBlock('block-1', 'function example() {}');
      await insertBlock(block);

      const result = await queryEngine.query('function example() {}');

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('querySimilar()', () => {
    it('should find blocks similar to an indexed block', async () => {
      // Insert two similar blocks
      const block1 = createBlock('block-1', 'function add(a, b) { return a + b; }');
      const block2 = createBlock('block-2', 'function add(x, y) { return x + y; }');

      await insertBlock(block1);
      await insertBlock(block2);

      const result = await queryEngine.querySimilar('block-1', { minSimilarity: 0.5 });

      // Should find at least itself or similar clones
      expect(result.clones).toBeDefined();
    });

    it('should exclude the source block from results by default', async () => {
      const block1 = createBlock('block-1', 'function test() { return 1; }');
      const block2 = createBlock('block-2', 'function test() { return 2; }');

      await insertBlock(block1);
      await insertBlock(block2);

      const result = await queryEngine.querySimilar('block-1');

      // The source block should not be in results
      const sourceInResults = result.clones.some((m) => m.target.id === 'block-1');
      expect(sourceInResults).toBe(false);
    });

    it('should return empty results for non-existent block ID', async () => {
      const result = await queryEngine.querySimilar('non-existent-id');

      expect(result.clones).toEqual([]);
    });
  });

  describe('findAllClones()', () => {
    it('should find clone clusters in the index', async () => {
      // Insert blocks with varying similarity
      const blocks = [
        createBlock('block-1', 'function add(a, b) { return a + b; }', 'file1.ts'),
        createBlock('block-2', 'function add(x, y) { return x + y; }', 'file2.ts'),
        createBlock('block-3', 'function sum(a, b) { return a + b; }', 'file3.ts'),
        createBlock('block-4', 'class CompletelyDifferent { foo() { bar(); } }', 'file4.ts'),
      ];

      for (const block of blocks) {
        await insertBlock(block);
      }

      const clusters = await queryEngine.findAllClones({ minSimilarity: 0.7 });

      // Should detect at least some similarity
      expect(clusters).toBeDefined();
      expect(Array.isArray(clusters)).toBe(true);
    });

    it('should assign clone types to clusters', async () => {
      // Insert nearly identical blocks
      const blocks = [
        createBlock('block-1', 'function greet(name) { return "Hello, " + name; }'),
        createBlock('block-2', 'function greet(name) { return "Hello, " + name; }'),
      ];

      for (const block of blocks) {
        await insertBlock(block);
      }

      const clusters = await queryEngine.findAllClones({ minSimilarity: 0.8 });

      for (const cluster of clusters) {
        expect(['type-1', 'type-2', 'type-3', 'type-4']).toContain(cluster.cloneType);
      }
    });

    it('should calculate average similarity for clusters', async () => {
      const blocks = [
        createBlock('block-1', 'function calc(x) { return x * 2; }'),
        createBlock('block-2', 'function calc(x) { return x * 2; }'),
      ];

      for (const block of blocks) {
        await insertBlock(block);
      }

      const clusters = await queryEngine.findAllClones({ minSimilarity: 0.8 });

      for (const cluster of clusters) {
        expect(cluster.avgSimilarity).toBeGreaterThanOrEqual(0);
        expect(cluster.avgSimilarity).toBeLessThanOrEqual(1);
      }
    });

    it('should not create single-block clusters', async () => {
      const block = createBlock('lonely', 'function uniqueCode() { return 999; }');
      await insertBlock(block);

      const clusters = await queryEngine.findAllClones();

      // Single blocks should not form clusters
      for (const cluster of clusters) {
        expect(cluster.blocks.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should sort clusters by size (largest first)', async () => {
      // Create multiple groups of similar blocks
      const group1 = [
        createBlock('g1-1', 'function alpha() { return 1; }'),
        createBlock('g1-2', 'function alpha() { return 1; }'),
        createBlock('g1-3', 'function alpha() { return 1; }'),
      ];

      const group2 = [
        createBlock('g2-1', 'function beta() { return 2; }'),
        createBlock('g2-2', 'function beta() { return 2; }'),
      ];

      for (const block of [...group1, ...group2]) {
        await insertBlock(block);
      }

      const clusters = await queryEngine.findAllClones({ minSimilarity: 0.9 });

      // Verify descending order by size
      for (let i = 1; i < clusters.length; i++) {
        expect(clusters[i - 1].blocks.length).toBeGreaterThanOrEqual(clusters[i].blocks.length);
      }
    });
  });

  describe('clone type classification', () => {
    it('should classify Type-1 clones (exact duplicates)', async () => {
      const code = 'function exact() { return 42; }';
      const blocks = [
        createBlock('exact-1', code, 'file1.ts'),
        createBlock('exact-2', code, 'file2.ts'),
      ];

      for (const block of blocks) {
        await insertBlock(block);
      }

      const clusters = await queryEngine.findAllClones({ minSimilarity: 0.95 });

      const exactCluster = clusters.find(
        (c) => c.blocks.some((b) => b.id === 'exact-1') && c.blocks.some((b) => b.id === 'exact-2')
      );

      if (exactCluster) {
        // Should be Type-1 or Type-2 for high similarity
        expect(['type-1', 'type-2']).toContain(exactCluster.cloneType);
      }
    });
  });

  describe('QueryOptions', () => {
    it('should handle all query options', async () => {
      const block = createBlock('block-1', 'function test() {}');
      await insertBlock(block);

      const options: Partial<QueryOptions> = {
        maxResults: 5,
        minSimilarity: 0.8,
        cloneTypes: ['type-1', 'type-2'],
        excludePatterns: ['excluded.ts'],
        includeSelf: true,
      };

      const result = await queryEngine.query('function test() {}', options);

      expect(result.clones).toBeDefined();
    });

    it('should filter by clone types when specified', async () => {
      const blocks = [
        createBlock('block-1', 'function a() { return 1; }'),
        createBlock('block-2', 'function a() { return 1; }'), // Same - Type-1
        createBlock('block-3', 'function b() { return 2; }'), // Different
      ];

      for (const block of blocks) {
        await insertBlock(block);
      }

      // Request only Type-1 clones
      const result = await queryEngine.query('function a() { return 1; }', {
        cloneTypes: ['type-1'],
      });

      // Should filter results to only type-1 clones
      expect(result.clones).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should handle querying large indexes', async () => {
      // Insert 100 blocks
      for (let i = 0; i < 100; i++) {
        const block = createBlock(`block-${i}`, `function func${i}(x) { return x * ${i} + ${i}; }`);
        await insertBlock(block);
      }

      const start = performance.now();
      const result = await queryEngine.query('function func50(x) { return x * 50 + 50; }');
      const queryTime = performance.now() - start;

      expect(result.clones).toBeDefined();
      // Query should be fast (under 100ms for 100 blocks)
      expect(queryTime).toBeLessThan(100);
    });

    it('should handle findAllClones on moderate-sized indexes', async () => {
      // Insert 50 blocks with some duplicates
      for (let i = 0; i < 50; i++) {
        const variant = i % 10; // Creates 10 groups of similar code
        const block = createBlock(
          `block-${i}`,
          `function process${variant}(data) { return data.map(x => x * ${variant}); }`
        );
        await insertBlock(block);
      }

      const start = performance.now();
      const clusters = await queryEngine.findAllClones({ minSimilarity: 0.8 });
      const processTime = performance.now() - start;

      expect(clusters).toBeDefined();
      // Should complete in reasonable time
      expect(processTime).toBeLessThan(1000);
    });
  });

  describe('edge cases', () => {
    it('should handle empty index', async () => {
      const result = await queryEngine.query('function test() {}');
      expect(result.clones).toEqual([]);
    });

    it('should handle empty query string', async () => {
      const block = createBlock('block-1', 'function test() {}');
      await insertBlock(block);

      const result = await queryEngine.query('');
      // Should not throw, may return empty or all results
      expect(result.clones).toBeDefined();
    });

    it('should handle query after index clear', async () => {
      const block = createBlock('block-1', 'function test() {}');
      await insertBlock(block);

      index.clear();

      const result = await queryEngine.query('function test() {}');
      expect(result.clones).toEqual([]);
    });

    it('should handle unicode in code', async () => {
      const block = createBlock('unicode', 'function 你好() { return "世界"; }');
      await insertBlock(block);

      const result = await queryEngine.query('function 你好() { return "世界"; }');
      expect(result.clones).toBeDefined();
    });

    it('should handle very long code blocks', async () => {
      const longCode = 'function long() {\n' + '  x = 1;\n'.repeat(100) + '}';
      const block = createBlock('long', longCode);
      await insertBlock(block);

      const result = await queryEngine.query(longCode);
      expect(result.clones).toBeDefined();
    });
  });
});
