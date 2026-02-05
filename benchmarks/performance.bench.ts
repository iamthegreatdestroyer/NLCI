/**
 * Performance benchmark suite for NLCI
 * Tests performance across different dataset sizes and configurations
 */

import { NlciEngine } from '@nlci/core';
import { LshIndex } from '@nlci/core/lsh';
import { bench, describe } from 'vitest';
import { generateRandomEmbedding } from '../tests/fixtures';

describe('LSH Index Performance', () => {
  describe('Index construction', () => {
    bench('Build index with 1,000 blocks', async () => {
      const engine = new NlciEngine({
        lsh: { numTables: 20, numBits: 12, embeddingDim: 384 },
        similarity: { threshold: 0.85, minLines: 5 },
      });

      for (let i = 0; i < 1000; i++) {
        const block = {
          id: `block-${i}`,
          file: `file${i % 100}.ts`,
          startLine: i * 10,
          endLine: i * 10 + 10,
          content: `function test${i}() { return ${i}; }`,
          hash: `hash-${i}`,
          embedding: generateRandomEmbedding(),
        };
        await engine.indexBlock(block);
      }
    });

    bench('Build index with 10,000 blocks', async () => {
      const engine = new NlciEngine({
        lsh: { numTables: 20, numBits: 12, embeddingDim: 384 },
        similarity: { threshold: 0.85, minLines: 5 },
      });

      for (let i = 0; i < 10000; i++) {
        const block = {
          id: `block-${i}`,
          file: `file${i % 1000}.ts`,
          startLine: i * 10,
          endLine: i * 10 + 10,
          content: `function test${i}() { return ${i}; }`,
          hash: `hash-${i}`,
          embedding: generateRandomEmbedding(),
        };
        await engine.indexBlock(block);
      }
    });
  });

  describe('Query performance', () => {
    const sizes = [100, 1000, 10000];

    for (const size of sizes) {
      bench(`Query in index with ${size} blocks`, async () => {
        const engine = new NlciEngine({
          lsh: { numTables: 20, numBits: 12, embeddingDim: 384 },
          similarity: { threshold: 0.85, minLines: 5 },
        });

        // Build index
        for (let i = 0; i < size; i++) {
          await engine.indexBlock({
            id: `block-${i}`,
            file: `file${i}.ts`,
            startLine: 1,
            endLine: 10,
            content: `function test${i}() {}`,
            hash: `hash-${i}`,
            embedding: generateRandomEmbedding(),
          });
        }

        // Query
        const queryBlock = {
          file: 'query.ts',
          startLine: 1,
          endLine: 10,
          content: 'function query() {}',
          embedding: generateRandomEmbedding(),
        };

        await engine.querySimilar(queryBlock);
      });
    }
  });

  describe('LSH hash generation', () => {
    const lsh = new LshIndex({
      numTables: 20,
      numBits: 12,
      embeddingDim: 384,
    });

    bench('Generate 1,000 LSH hashes', () => {
      for (let i = 0; i < 1000; i++) {
        const embedding = generateRandomEmbedding();
        lsh.hash(embedding);
      }
    });

    bench('Generate 10,000 LSH hashes', () => {
      for (let i = 0; i < 10000; i++) {
        const embedding = generateRandomEmbedding();
        lsh.hash(embedding);
      }
    });
  });
});

describe('Configuration comparison', () => {
  const configurations = [
    { name: 'Fast', numTables: 10, numBits: 8 },
    { name: 'Balanced', numTables: 20, numBits: 12 },
    { name: 'Accurate', numTables: 30, numBits: 16 },
  ];

  for (const config of configurations) {
    bench(`${config.name} config - Index 1,000 blocks`, async () => {
      const engine = new NlciEngine({
        lsh: {
          numTables: config.numTables,
          numBits: config.numBits,
          embeddingDim: 384,
        },
        similarity: { threshold: 0.85, minLines: 5 },
      });

      for (let i = 0; i < 1000; i++) {
        await engine.indexBlock({
          id: `block-${i}`,
          file: `file${i}.ts`,
          startLine: 1,
          endLine: 10,
          content: `function test${i}() {}`,
          hash: `hash-${i}`,
          embedding: generateRandomEmbedding(),
        });
      }
    });

    bench(`${config.name} config - Query performance`, async () => {
      const engine = new NlciEngine({
        lsh: {
          numTables: config.numTables,
          numBits: config.numBits,
          embeddingDim: 384,
        },
        similarity: { threshold: 0.85, minLines: 5 },
      });

      // Index first
      for (let i = 0; i < 1000; i++) {
        await engine.indexBlock({
          id: `block-${i}`,
          file: `file${i}.ts`,
          startLine: 1,
          endLine: 10,
          content: `function test${i}() {}`,
          hash: `hash-${i}`,
          embedding: generateRandomEmbedding(),
        });
      }

      // Query
      const queryBlock = {
        file: 'query.ts',
        startLine: 1,
        endLine: 10,
        content: 'function query() {}',
        embedding: generateRandomEmbedding(),
      };

      await engine.querySimilar(queryBlock);
    });
  }
});

describe('Memory usage', () => {
  bench('Memory - 1,000 blocks', async () => {
    const engine = new NlciEngine();

    for (let i = 0; i < 1000; i++) {
      await engine.indexBlock({
        id: `block-${i}`,
        file: `file${i}.ts`,
        startLine: 1,
        endLine: 10,
        content: `function test${i}() {}`,
        hash: `hash-${i}`,
        embedding: generateRandomEmbedding(),
      });
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });
});
