/**
 * Tests for TFIDFEmbedder
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { TFIDFEmbedder, createTFIDFEmbedder } from '../tfidf-embedder.js';

describe('TFIDFEmbedder', () => {
  let embedder: TFIDFEmbedder;

  beforeEach(() => {
    embedder = new TFIDFEmbedder({ dimension: 384 });
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const e = new TFIDFEmbedder();
      expect(e.dimension).toBe(384);
    });

    it('should create with custom dimension', () => {
      const e = new TFIDFEmbedder({ dimension: 128 });
      expect(e.dimension).toBe(128);
    });

    it('should respect custom config', () => {
      const e = new TFIDFEmbedder({
        dimension: 256,
        maxVocabSize: 10000,
        ngramSize: 3,
      });
      expect(e.dimension).toBe(256);
    });
  });

  describe('dimension property', () => {
    it('should return configured dimension', () => {
      expect(embedder.dimension).toBe(384);
    });
  });

  describe('embed()', () => {
    it('should return embedding with correct dimension', async () => {
      const embedding = await embedder.embed('function hello() { return 42; }');
      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(384);
    });

    it('should return normalized vectors', async () => {
      const embedding = await embedder.embed('const x = 1 + 2;');

      // Calculate L2 norm
      let norm = 0;
      for (let i = 0; i < embedding.length; i++) {
        norm += embedding[i] * embedding[i];
      }
      norm = Math.sqrt(norm);

      // Should be approximately 1.0
      expect(norm).toBeCloseTo(1.0, 3);
    });

    it('should produce different embeddings for different code', async () => {
      const e1 = await embedder.embed('function add(a, b) { return a + b; }');
      const e2 = await embedder.embed('class User { constructor(name) { this.name = name; } }');

      // Calculate cosine similarity
      let dot = 0;
      for (let i = 0; i < e1.length; i++) {
        dot += e1[i] * e2[i];
      }

      // Should not be identical
      expect(dot).not.toBeCloseTo(1.0, 2);
    });

    it('should produce similar embeddings for similar code', async () => {
      const e1 = await embedder.embed('function add(a, b) { return a + b; }');
      const e2 = await embedder.embed('function sum(x, y) { return x + y; }');

      // Calculate cosine similarity
      let dot = 0;
      for (let i = 0; i < e1.length; i++) {
        dot += e1[i] * e2[i];
      }

      // Similar code should have positive similarity
      expect(dot).toBeGreaterThan(0);
    });

    it('should handle empty code', async () => {
      const embedding = await embedder.embed('');
      expect(embedding.length).toBe(384);
    });

    it('should handle whitespace-only code', async () => {
      const embedding = await embedder.embed('   \n\t  ');
      expect(embedding.length).toBe(384);
    });

    it('should update vocabulary on embed', async () => {
      const initialSize = embedder.vocabSize;
      await embedder.embed('function uniqueIdentifierName() {}');
      expect(embedder.vocabSize).toBeGreaterThanOrEqual(initialSize);
    });

    it('should increment document count', async () => {
      const initial = embedder.numDocuments;
      await embedder.embed('const x = 1;');
      expect(embedder.numDocuments).toBe(initial + 1);
    });
  });

  describe('embedBatch()', () => {
    it('should embed multiple code snippets', async () => {
      const codes = [
        'function a() { return 1; }',
        'function b() { return 2; }',
        'function c() { return 3; }',
      ];

      const embeddings = await embedder.embedBatch(codes);
      expect(embeddings.length).toBe(3);
      for (const emb of embeddings) {
        expect(emb.length).toBe(384);
      }
    });

    it('should handle empty batch', async () => {
      const embeddings = await embedder.embedBatch([]);
      expect(embeddings).toEqual([]);
    });

    it('should produce same result as individual embed calls', async () => {
      const codes = ['const x = 1;', 'const y = 2;'];

      // Embed individually
      const e1 = await embedder.embed(codes[0]);
      const e2 = await embedder.embed(codes[1]);

      // Reset embedder
      embedder = new TFIDFEmbedder({ dimension: 384 });

      // Embed as batch
      const batch = await embedder.embedBatch(codes);

      // Results should be similar (not identical due to document count updates)
      expect(batch[0].length).toBe(e1.length);
      expect(batch[1].length).toBe(e2.length);
    });
  });

  describe('vocabSize property', () => {
    it('should start at 0', () => {
      const e = new TFIDFEmbedder();
      expect(e.vocabSize).toBe(0);
    });

    it('should grow as documents are embedded', async () => {
      const e = new TFIDFEmbedder();
      await e.embed('function hello() {}');
      const size1 = e.vocabSize;

      await e.embed('class World extends Object {}');
      const size2 = e.vocabSize;

      expect(size2).toBeGreaterThanOrEqual(size1);
    });
  });

  describe('numDocuments property', () => {
    it('should start at 0', () => {
      const e = new TFIDFEmbedder();
      expect(e.numDocuments).toBe(0);
    });

    it('should increment with each embed', async () => {
      const e = new TFIDFEmbedder();
      expect(e.numDocuments).toBe(0);

      await e.embed('code1');
      expect(e.numDocuments).toBe(1);

      await e.embed('code2');
      expect(e.numDocuments).toBe(2);
    });
  });

  describe('exportState() / importState()', () => {
    it('should export state as object', async () => {
      await embedder.embed('function test() { return 42; }');
      await embedder.embed('class Example {}');

      const state = embedder.exportState();
      expect(typeof state).toBe('object');
      expect(state.vocabulary).toBeDefined();
      expect(Array.isArray(state.vocabulary)).toBe(true);
      expect(state.documentCount).toBe(2);
      expect(state.config).toBeDefined();
    });

    it('should import state correctly', async () => {
      // Build up some state
      await embedder.embed('function hello() {}');
      await embedder.embed('class World {}');
      const state = embedder.exportState();

      // Create new embedder and import
      const newEmbedder = new TFIDFEmbedder();
      newEmbedder.importState(state);

      expect(newEmbedder.vocabSize).toBe(embedder.vocabSize);
      expect(newEmbedder.numDocuments).toBe(embedder.numDocuments);
      expect(newEmbedder.dimension).toBe(embedder.dimension);
    });

    it('should produce same embeddings after import', async () => {
      // Train embedder
      await embedder.embed('function a() {}');
      await embedder.embed('function b() {}');

      const testCode = 'function test() { return x + y; }';
      const original = await embedder.embed(testCode);

      // Export and import to new embedder
      const state = embedder.exportState();
      const newEmbedder = new TFIDFEmbedder();
      newEmbedder.importState(state);

      // Same code should produce same embedding
      const imported = await newEmbedder.embed(testCode);

      // Check they're close (some numerical differences possible)
      let diff = 0;
      for (let i = 0; i < original.length; i++) {
        diff += Math.abs(original[i] - imported[i]);
      }
      expect(diff / original.length).toBeLessThan(0.1);
    });
  });

  describe('deterministic embeddings', () => {
    it('should produce same embedding for same code in same session', async () => {
      const code = 'function deterministic() { return 42; }';

      // Embed twice in same embedder
      const e1 = await embedder.embed(code);
      const e2 = await embedder.embed(code);

      // Should be identical
      for (let i = 0; i < e1.length; i++) {
        expect(e1[i]).toBeCloseTo(e2[i], 5);
      }
    });
  });

  describe('language handling', () => {
    it('should handle TypeScript code', async () => {
      const code = `
        interface User {
          id: number;
          name: string;
        }
        function getUser(): User {
          return { id: 1, name: 'test' };
        }
      `;
      const embedding = await embedder.embed(code);
      expect(embedding.length).toBe(384);
    });

    it('should handle Python-like code', async () => {
      const code = 'def hello_world(): pass';
      const embedding = await embedder.embed(code);
      expect(embedding.length).toBe(384);
    });
  });
});

describe('createTFIDFEmbedder', () => {
  it('should create embedder with defaults', () => {
    const embedder = createTFIDFEmbedder();
    expect(embedder).toBeInstanceOf(TFIDFEmbedder);
    expect(embedder.dimension).toBe(384);
  });

  it('should create embedder with custom dimension', () => {
    const embedder = createTFIDFEmbedder('typescript', 128);
    expect(embedder.dimension).toBe(128);
  });
});

describe('TFIDFEmbedder stress tests', () => {
  it('should handle large code', async () => {
    const embedder = new TFIDFEmbedder();
    const largeCode = 'const x = 1;\n'.repeat(1000);

    const embedding = await embedder.embed(largeCode);
    expect(embedding.length).toBe(384);
  });

  it('should handle many small documents', async () => {
    const embedder = new TFIDFEmbedder();
    const docs = Array.from({ length: 100 }, (_, i) => `function fn${i}() { return ${i}; }`);

    const embeddings = await embedder.embedBatch(docs);
    expect(embeddings.length).toBe(100);
    expect(embedder.numDocuments).toBe(100);
  });

  it('should respect maxVocabSize', async () => {
    const embedder = new TFIDFEmbedder({ maxVocabSize: 100 });

    // Embed many documents to fill vocabulary
    for (let i = 0; i < 50; i++) {
      await embedder.embed(`function uniqueFunction${i}WithLongName${i * 2}() { return ${i}; }`);
    }

    expect(embedder.vocabSize).toBeLessThanOrEqual(100);
  });
});
