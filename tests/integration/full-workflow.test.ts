/**
 * Integration test for full NLCI workflow
 * Tests the entire pipeline from scanning to reporting
 */

import { NlciEngine } from '@nlci/core';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Full NLCI Workflow Integration', () => {
  let tempDir: string;
  let engine: NlciEngine;

  beforeAll(async () => {
    // Create temporary directory
    tempDir = await mkdtemp(join(tmpdir(), 'nlci-integration-test-'));

    // Create test files with various clone types
    await writeFile(
      join(tempDir, 'original.ts'),
      `
function calculateSum(numbers: number[]): number {
  let total = 0;
  for (const num of numbers) {
    total += num;
  }
  return total;
}

export { calculateSum };
      `.trim()
    );

    // Type-1: Exact clone
    await writeFile(
      join(tempDir, 'exact-clone.ts'),
      `
function calculateSum(numbers: number[]): number {
  let total = 0;
  for (const num of numbers) {
    total += num;
  }
  return total;
}

export { calculateSum };
      `.trim()
    );

    // Type-2: Parameterized clone (renamed variables)
    await writeFile(
      join(tempDir, 'renamed.ts'),
      `
function sumArray(items: number[]): number {
  let result = 0;
  for (const item of items) {
    result += item;
  }
  return result;
}

export { sumArray };
      `.trim()
    );

    // Type-3: Near-miss clone (modified statements)
    await writeFile(
      join(tempDir, 'modified.ts'),
      `
function calculateSum(numbers: number[]): number {
  let total = 0;
  for (const num of numbers) {
    if (num > 0) {
      total += num;
    }
  }
  return total;
}

export { calculateSum };
      `.trim()
    );

    // Unique code (should not be detected as clone)
    await writeFile(
      join(tempDir, 'unique.ts'),
      `
function multiply(a: number, b: number): number {
  return a * b;
}

export { multiply };
      `.trim()
    );

    // Initialize engine
    engine = new NlciEngine({
      lsh: {
        numTables: 20,
        numBits: 12,
        embeddingDim: 384,
      },
      similarity: {
        threshold: 0.85,
        minLines: 3,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should index directory successfully', async () => {
    const results = await engine.indexDirectory(tempDir);

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBe(5); // 5 files created
  });

  it('should detect Type-1 clones (exact copies)', async () => {
    await engine.indexDirectory(tempDir);
    const clones = await engine.findAllClones();

    const exactClones = clones.filter(
      (clone) => clone.source.file.includes('original') && clone.target.file.includes('exact-clone')
    );

    expect(exactClones.length).toBeGreaterThan(0);
    expect(exactClones[0].similarity).toBeGreaterThan(0.99);
  });

  it('should detect Type-2 clones (renamed variables)', async () => {
    await engine.indexDirectory(tempDir);
    const clones = await engine.findAllClones();

    const renamedClones = clones.filter(
      (clone) => clone.source.file.includes('original') && clone.target.file.includes('renamed')
    );

    expect(renamedClones.length).toBeGreaterThan(0);
    expect(renamedClones[0].similarity).toBeGreaterThan(0.9);
    expect(renamedClones[0].similarity).toBeLessThan(0.99);
  });

  it('should detect Type-3 clones (near-miss)', async () => {
    await engine.indexDirectory(tempDir);
    const clones = await engine.findAllClones();

    const modifiedClones = clones.filter(
      (clone) => clone.source.file.includes('original') && clone.target.file.includes('modified')
    );

    expect(modifiedClones.length).toBeGreaterThan(0);
    expect(modifiedClones[0].similarity).toBeGreaterThan(0.8);
    expect(modifiedClones[0].similarity).toBeLessThan(0.95);
  });

  it('should not detect unique code as clones', async () => {
    await engine.indexDirectory(tempDir);
    const clones = await engine.findAllClones();

    const falsePositives = clones.filter(
      (clone) => clone.source.file.includes('unique') || clone.target.file.includes('unique')
    );

    expect(falsePositives.length).toBe(0);
  });

  it('should handle empty directories gracefully', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'nlci-empty-'));

    try {
      const results = await engine.indexDirectory(emptyDir);
      expect(results).toBeDefined();
      expect(results.length).toBe(0);
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });

  it('should persist and load index', async () => {
    await engine.indexDirectory(tempDir);
    const indexPath = join(tempDir, 'nlci-index.json');

    // Save index
    await engine.saveIndex(indexPath);

    // Create new engine and load index
    const newEngine = new NlciEngine();
    await newEngine.loadIndex(indexPath);

    const clones = await newEngine.findAllClones();
    expect(clones.length).toBeGreaterThan(0);
  });

  it('should query similar blocks efficiently', async () => {
    await engine.indexDirectory(tempDir);

    const queryBlock = {
      file: 'test-query.ts',
      startLine: 1,
      endLine: 10,
      content: `
function calculateSum(numbers: number[]): number {
  let total = 0;
  for (const num of numbers) {
    total += num;
  }
  return total;
}
      `.trim(),
    };

    const startTime = performance.now();
    const similar = await engine.querySimilar(queryBlock);
    const endTime = performance.now();

    expect(similar).toBeDefined();
    expect(similar.length).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(100); // Should be sub-100ms
  });

  it('should generate statistics correctly', async () => {
    await engine.indexDirectory(tempDir);
    const clones = await engine.findAllClones();

    const stats = {
      totalFiles: 5,
      totalBlocks: clones.reduce((sum, c) => sum + 2, 0) / 2,
      totalClones: clones.length,
      cloneTypes: {
        type1: clones.filter((c) => c.similarity > 0.99).length,
        type2: clones.filter((c) => c.similarity > 0.9 && c.similarity <= 0.99).length,
        type3: clones.filter((c) => c.similarity > 0.8 && c.similarity <= 0.9).length,
        type4: clones.filter((c) => c.similarity > 0.7 && c.similarity <= 0.8).length,
      },
    };

    expect(stats.totalFiles).toBe(5);
    expect(stats.totalClones).toBeGreaterThan(0);
    expect(stats.cloneTypes.type1).toBeGreaterThan(0);
  });
});
