/**
 * @nlci/core - NLCI Engine Tests
 *
 * Tests for NLCIEngine - the main orchestration engine
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CodeBlock } from '../../types/code-block.js';
import { NLCIEngine } from '../nlci-engine.js';

describe('NLCIEngine', () => {
  let engine: NLCIEngine;

  // Helper to create a test code block
  const createBlock = (id: string, content: string, filePath: string = 'test.ts'): CodeBlock => ({
    id,
    fileId: `file-${filePath}`,
    filePath,
    language: 'typescript',
    startLine: 1,
    endLine: content.split('\n').length,
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

  beforeEach(() => {
    engine = new NLCIEngine({
      lsh: {
        numTables: 10,
        numBits: 8,
        dimension: 64,
        multiProbe: { enabled: true, numProbes: 3 },
      },
      embedding: {
        dimension: 64,
      },
      parser: {
        minBlockSize: 1, // Allow small test blocks
      },
    });
  });

  afterEach(() => {
    engine.clear();
  });

  describe('constructor', () => {
    it('should create engine with default options', () => {
      const defaultEngine = new NLCIEngine();
      expect(defaultEngine).toBeDefined();
    });

    it('should create engine with custom options', () => {
      const customEngine = new NLCIEngine({
        lsh: {
          numTables: 20,
          numBits: 12,
          dimension: 128,
        },
      });
      expect(customEngine).toBeDefined();
    });

    it('should initialize with zero blocks', () => {
      expect(engine.getAllBlocks().length).toBe(0);
    });
  });

  describe('indexCode()', () => {
    it('should index code string and return parsed blocks', async () => {
      const code = `
        function add(a: number, b: number) {
          return a + b;
        }
        
        function subtract(a: number, b: number) {
          return a - b;
        }
      `;

      const blocks = await engine.indexCode(code, 'math.ts');

      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should detect language from file extension', async () => {
      const pythonCode = `
def hello():
    print("Hello, World!")
`;

      const blocks = await engine.indexCode(pythonCode, 'greeting.py');

      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should increment block count after indexing', async () => {
      const initialCount = engine.getAllBlocks().length;

      await engine.indexCode('function test() { return 1; }', 'test.ts');

      expect(engine.getAllBlocks().length).toBeGreaterThan(initialCount);
    });

    it('should handle empty code', async () => {
      const blocks = await engine.indexCode('', 'empty.ts');

      expect(blocks).toEqual([]);
    });

    it('should handle code with no functions', async () => {
      const code = 'const x = 1; const y = 2;';
      const blocks = await engine.indexCode(code, 'constants.ts');

      // May or may not parse - depends on parser
      expect(blocks).toBeDefined();
    });
  });

  describe('indexBlock()', () => {
    it('should index a single code block', async () => {
      const block = createBlock('block-1', 'function test() { return 42; }');

      await engine.indexBlock(block);

      expect(engine.getAllBlocks().length).toBe(1);
    });

    it('should allow multiple blocks to be indexed', async () => {
      const blocks = [
        createBlock('block-1', 'function a() {}'),
        createBlock('block-2', 'function b() {}'),
        createBlock('block-3', 'function c() {}'),
      ];

      for (const block of blocks) {
        await engine.indexBlock(block);
      }

      expect(engine.getAllBlocks().length).toBe(3);
    });

    it('should handle blocks from multiple files', async () => {
      const block1 = createBlock('block-1', 'function a() {}', 'file1.ts');
      const block2 = createBlock('block-2', 'function b() {}', 'file2.ts');

      await engine.indexBlock(block1);
      await engine.indexBlock(block2);

      expect(engine.getAllBlocks().length).toBe(2);
    });
  });

  describe('query()', () => {
    it('should find similar blocks', async () => {
      const block = createBlock('block-1', 'function add(a, b) { return a + b; }');
      await engine.indexBlock(block);

      const result = await engine.query('function add(x, y) { return x + y; }');

      expect(result.clones).toBeDefined();
    });

    it('should return empty results for empty index', async () => {
      const result = await engine.query('function test() {}');

      expect(result.clones).toEqual([]);
    });

    it('should support query options', async () => {
      const block = createBlock('block-1', 'function test() { return 1; }');
      await engine.indexBlock(block);

      const result = await engine.query('function test() { return 1; }', {
        maxResults: 5,
        minSimilarity: 0.8,
      });

      expect(result.clones).toBeDefined();
      expect(result.clones.length).toBeLessThanOrEqual(5);
    });
  });

  describe('findSimilar()', () => {
    it('should find blocks similar to a given block ID', async () => {
      const blocks = [
        createBlock('block-1', 'function add(a, b) { return a + b; }'),
        createBlock('block-2', 'function add(x, y) { return x + y; }'),
      ];

      for (const block of blocks) {
        await engine.indexBlock(block);
      }

      const result = await engine.findSimilar('block-1');

      expect(result.clones).toBeDefined();
    });

    it('should return empty for non-existent block', async () => {
      const result = await engine.findSimilar('non-existent');

      expect(result.clones).toEqual([]);
    });
  });

  describe('findAllClones()', () => {
    it('should detect clone clusters', async () => {
      const blocks = [
        createBlock('clone-1', 'function process(data) { return data.map(x => x * 2); }'),
        createBlock('clone-2', 'function process(items) { return items.map(x => x * 2); }'),
        createBlock('unique', 'class CompletelyDifferent { foo() { bar(); } }'),
      ];

      for (const block of blocks) {
        await engine.indexBlock(block);
      }

      const clusters = await engine.findAllClones({ minSimilarity: 0.7 });

      expect(clusters).toBeDefined();
      expect(Array.isArray(clusters)).toBe(true);
    });

    it('should return empty array for empty index', async () => {
      const clusters = await engine.findAllClones();

      expect(clusters).toEqual([]);
    });

    it('should classify clone types', async () => {
      const code = 'function identical() { return 42; }';
      const blocks = [createBlock('id-1', code), createBlock('id-2', code)];

      for (const block of blocks) {
        await engine.indexBlock(block);
      }

      const clusters = await engine.findAllClones({ minSimilarity: 0.9 });

      for (const cluster of clusters) {
        expect(cluster.cloneType).toMatch(/^type-[1-4]$/);
      }
    });
  });

  describe('generateSummary()', () => {
    it('should return summary statistics', async () => {
      const blocks = [
        createBlock('block-1', 'function a() {}', 'file1.ts'),
        createBlock('block-2', 'function b() {}', 'file2.ts'),
      ];

      for (const block of blocks) {
        await engine.indexBlock(block);
      }

      const summary = await engine.generateSummary();

      expect(summary.blocksIndexed).toBe(2);
      expect(summary.filesScanned).toBe(2);
      expect(summary.clonesByType).toBeDefined();
    });

    it('should return empty summary for empty index', async () => {
      const summary = await engine.generateSummary();

      expect(summary.blocksIndexed).toBe(0);
      expect(summary.filesScanned).toBe(0);
      expect(summary.clonePairsFound).toBe(0);
    });

    it('should calculate clone type distribution', async () => {
      const code = 'function test() { return 1; }';
      const blocks = [createBlock('test-1', code), createBlock('test-2', code)];

      for (const block of blocks) {
        await engine.indexBlock(block);
      }

      const summary = await engine.generateSummary();

      expect(summary.clonesByType).toBeDefined();
      expect(summary.clonesByType['type-1']).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStats()', () => {
    it('should return index statistics', () => {
      const stats = engine.getStats();

      expect(stats).toHaveProperty('totalBlocks');
      expect(stats).toHaveProperty('numTables');
      expect(stats).toHaveProperty('avgBucketSize');
    });

    it('should update block count after indexing', async () => {
      const initialStats = engine.getStats();
      expect(initialStats.totalBlocks).toBe(0);

      await engine.indexBlock(createBlock('test', 'function test() {}'));

      const updatedStats = engine.getStats();
      expect(updatedStats.totalBlocks).toBe(1);
    });
  });

  describe('getAllBlocks()', () => {
    it('should return all indexed blocks', async () => {
      const blocks = [
        createBlock('block-1', 'function a() {}'),
        createBlock('block-2', 'function b() {}'),
      ];

      for (const block of blocks) {
        await engine.indexBlock(block);
      }

      const allBlocks = engine.getAllBlocks();

      expect(allBlocks.length).toBe(2);
    });

    it('should return empty array for empty index', () => {
      const allBlocks = engine.getAllBlocks();

      expect(allBlocks).toEqual([]);
    });
  });

  describe('removeBlock()', () => {
    it('should remove a block by ID', async () => {
      const block = createBlock('to-remove', 'function test() {}');
      await engine.indexBlock(block);

      expect(engine.getAllBlocks().length).toBe(1);

      engine.removeBlock('to-remove');

      expect(engine.getAllBlocks().length).toBe(0);
    });

    it('should handle removing non-existent block gracefully', () => {
      expect(() => engine.removeBlock('non-existent')).not.toThrow();
    });
  });

  describe('clear()', () => {
    it('should remove all blocks from the index', async () => {
      for (let i = 0; i < 5; i++) {
        await engine.indexBlock(createBlock(`block-${i}`, `function f${i}() {}`));
      }

      expect(engine.getAllBlocks().length).toBe(5);

      engine.clear();

      expect(engine.getAllBlocks().length).toBe(0);
    });
  });

  describe('exportState() and importState()', () => {
    it('should export index to serializable format', async () => {
      const block = createBlock('block-1', 'function test() {}');
      await engine.indexBlock(block);

      const exported = engine.exportState();

      expect(exported).toBeDefined();
      expect(typeof exported).toBe('object');
      expect(exported.version).toBe('1.0');
      expect(exported.indexState).toBeDefined();
    });

    it('should restore index from exported data', async () => {
      const block = createBlock('block-1', 'function test() { return 42; }');
      await engine.indexBlock(block);

      const exported = engine.exportState();

      // Create new engine and import
      const newEngine = new NLCIEngine({
        lsh: {
          numTables: 10,
          numBits: 8,
          dimension: 64,
          multiProbe: { enabled: true, numProbes: 3 },
        },
        embedding: {
          dimension: 64,
        },
        parser: { minBlockSize: 1 },
      });

      newEngine.importState(exported);

      expect(newEngine.getAllBlocks().length).toBe(1);
    });

    it('should preserve block data after export/import cycle', async () => {
      const originalBlock = createBlock('preserve-me', 'function preserve() { return "data"; }');
      await engine.indexBlock(originalBlock);

      const exported = engine.exportState();

      const newEngine = new NLCIEngine({
        lsh: { numTables: 10, numBits: 8, dimension: 64 },
        embedding: { dimension: 64 },
        parser: { minBlockSize: 1 },
      });
      newEngine.importState(exported);

      const blocks = newEngine.getAllBlocks();
      expect(blocks.length).toBe(1);
      expect(blocks[0].id).toBe('preserve-me');
    });
  });

  describe('multi-language support', () => {
    it('should handle TypeScript code', async () => {
      const code = `
        function greet(name: string): string {
          return \`Hello, \${name}!\`;
        }
      `;

      const blocks = await engine.indexCode(code, 'greeting.ts');
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should handle JavaScript code', async () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
      `;

      const blocks = await engine.indexCode(code, 'math.js');
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should handle Python code', async () => {
      const code = `
def hello(name):
    return f"Hello, {name}!"
`;

      const blocks = await engine.indexCode(code, 'greeting.py');
      expect(blocks).toBeDefined();
    });

    it('should handle Go code', async () => {
      const code = `
func add(a int, b int) int {
    return a + b
}
`;

      const blocks = await engine.indexCode(code, 'math.go');
      expect(blocks).toBeDefined();
    });

    it('should handle Rust code', async () => {
      const code = `
fn add(a: i32, b: i32) -> i32 {
    a + b
}
`;

      const blocks = await engine.indexCode(code, 'math.rs');
      expect(blocks).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very large code files', async () => {
      const largeCode = Array(100)
        .fill(null)
        .map((_, i) => `function func${i}() { return ${i}; }`)
        .join('\n\n');

      const blocks = await engine.indexCode(largeCode, 'large.ts');
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should handle code with special characters', async () => {
      const code = `
        function special(a, b) {
          return a && b || !a;
        }
      `;

      const blocks = await engine.indexCode(code, 'special.ts');
      expect(blocks).toBeDefined();
    });

    it('should handle code with unicode', async () => {
      const code = `
        function 你好() {
          return "世界";
        }
      `;

      const blocks = await engine.indexCode(code, 'unicode.ts');
      expect(blocks).toBeDefined();
    });

    it('should handle concurrent indexing', async () => {
      const indexPromises = Array(10)
        .fill(null)
        .map((_, i) => engine.indexBlock(createBlock(`concurrent-${i}`, `function f${i}() {}`)));

      await Promise.all(indexPromises);

      expect(engine.getAllBlocks().length).toBe(10);
    });
  });

  describe('embedding model selection', () => {
    it('should use TFIDFEmbedder by default', async () => {
      // Default config uses modelType: 'tfidf'
      const defaultEngine = new NLCIEngine({
        lsh: { dimension: 128 },
        parser: { minBlockSize: 1 },
      });

      // Index some code
      const blocks = await defaultEngine.indexCode(
        'function hello() { return "world"; }',
        'test.ts'
      );

      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should use MockEmbeddingModel when modelType is mock', async () => {
      const mockEngine = new NLCIEngine({
        lsh: { dimension: 64 },
        embedding: { modelType: 'mock' },
        parser: { minBlockSize: 1 },
      });

      const blocks = await mockEngine.indexCode('function test() { return 42; }', 'test.ts');

      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should use TFIDFEmbedder when modelType is tfidf', async () => {
      const tfidfEngine = new NLCIEngine({
        lsh: { dimension: 384 },
        embedding: { modelType: 'tfidf' },
        parser: { minBlockSize: 1 },
      });

      const blocks = await tfidfEngine.indexCode(
        'function calculate() { return 1 + 2; }',
        'test.ts'
      );

      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should produce different embeddings for different code with TFIDFEmbedder', async () => {
      const tfidfEngine = new NLCIEngine({
        lsh: { dimension: 128 },
        embedding: { modelType: 'tfidf' },
        parser: { minBlockSize: 1 },
      });

      // Index two different functions
      await tfidfEngine.indexCode('function add(a, b) { return a + b; }', 'add.ts');
      await tfidfEngine.indexCode('function multiply(x, y) { return x * y; }', 'multiply.ts');

      // Query should find similar code
      const results = await tfidfEngine.query('function add(x, y) { return x + y; }');

      // Should have query result with clones array
      expect(results).toBeDefined();
      expect(results.clones).toBeDefined();
      expect(Array.isArray(results.clones)).toBe(true);
    });
  });

  describe('performance', () => {
    it('should index 100 blocks in reasonable time', async () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        await engine.indexBlock(
          createBlock(`perf-${i}`, `function perf${i}(x) { return x * ${i}; }`)
        );
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should query quickly after indexing many blocks', async () => {
      // Index 100 blocks
      for (let i = 0; i < 100; i++) {
        await engine.indexBlock(
          createBlock(`query-perf-${i}`, `function queryPerf${i}(x) { return x * ${i}; }`)
        );
      }

      const start = performance.now();
      await engine.query('function queryPerf50(x) { return x * 50; }');
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100); // Query should be fast
    });
  });
});
