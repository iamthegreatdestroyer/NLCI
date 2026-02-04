/**
 * @nlci/core - Hyperplane Hash Functions Tests
 */

import { describe, expect, it } from 'vitest';
import {
  SeededRandom,
  computeHash,
  createHashFunction,
  createHyperplane,
  estimateCosineSimilarity,
  generateProbes,
  hammingDistance,
} from '../hyperplane.js';

describe('Hyperplane Module', () => {
  describe('SeededRandom', () => {
    it('should produce deterministic values with same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const values1 = Array.from({ length: 10 }, () => rng1.next());
      const values2 = Array.from({ length: 10 }, () => rng2.next());

      expect(values1).toEqual(values2);
    });

    it('should produce different values with different seeds', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(43);

      const value1 = rng1.next();
      const value2 = rng2.next();

      expect(value1).not.toBe(value2);
    });

    it('should produce values in [0, 1)', () => {
      const rng = new SeededRandom(123);
      for (let i = 0; i < 100; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should produce Gaussian-distributed values', () => {
      const rng = new SeededRandom(42);
      const values = Array.from({ length: 1000 }, () => rng.nextGaussian());

      // Check approximate mean and variance
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;

      // Should be approximately standard normal (mean ≈ 0, variance ≈ 1)
      expect(Math.abs(mean)).toBeLessThan(0.1);
      expect(Math.abs(variance - 1)).toBeLessThan(0.2);
    });
  });

  describe('createHyperplane()', () => {
    it('should create a hyperplane with correct dimension', () => {
      const rng = new SeededRandom(42);
      const hyperplane = createHyperplane(128, rng);

      expect(hyperplane.dimension).toBe(128);
      expect(hyperplane.normal.length).toBe(128);
    });

    it('should produce deterministic hyperplanes with same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);

      const hp1 = createHyperplane(64, rng1);
      const hp2 = createHyperplane(64, rng2);

      expect(Array.from(hp1.normal)).toEqual(Array.from(hp2.normal));
    });
  });

  describe('createHashFunction()', () => {
    it('should create hash function with correct number of bits', () => {
      // createHashFunction(numBits, dimension, seed)
      const hashFn = createHashFunction(16, 128, 42);

      expect(hashFn.numBits).toBe(16);
      expect(hashFn.dimension).toBe(128);
      expect(hashFn.hyperplanes.length).toBe(16);
    });

    it('should be deterministic with same seed', () => {
      const hf1 = createHashFunction(8, 64, 100);
      const hf2 = createHashFunction(8, 64, 100);

      for (let i = 0; i < hf1.hyperplanes.length; i++) {
        expect(Array.from(hf1.hyperplanes[i].normal)).toEqual(
          Array.from(hf2.hyperplanes[i].normal)
        );
      }
    });
  });

  describe('computeHash()', () => {
    it('should compute hash for embedding', () => {
      // createHashFunction(numBits, dimension, seed)
      const hashFn = createHashFunction(4, 4, 42);
      const embedding = new Float32Array([1, 0, 0, 0]);

      const hash = computeHash(embedding, hashFn);

      expect(typeof hash).toBe('bigint');
      expect(hash).toBeGreaterThanOrEqual(0n);
      expect(hash).toBeLessThan(2n ** 4n);
    });

    it('should produce same hash for same embedding', () => {
      const hashFn = createHashFunction(16, 64, 42);
      const embedding = new Float32Array(64).fill(0.5);

      const hash1 = computeHash(embedding, hashFn);
      const hash2 = computeHash(embedding, hashFn);

      expect(hash1).toBe(hash2);
    });

    it('should produce similar hashes for similar embeddings', () => {
      const hashFn = createHashFunction(16, 64, 42);

      const embedding1 = new Float32Array(64);
      const embedding2 = new Float32Array(64);
      for (let i = 0; i < 64; i++) {
        embedding1[i] = i / 64;
        embedding2[i] = i / 64 + 0.01; // Very similar
      }

      const hash1 = computeHash(embedding1, hashFn);
      const hash2 = computeHash(embedding2, hashFn);

      // Similar embeddings should have low Hamming distance
      const distance = hammingDistance(hash1, hash2, 16);
      expect(distance).toBeLessThan(8);
    });

    it('should throw error for dimension mismatch', () => {
      const hashFn = createHashFunction(8, 64, 42);
      const wrongSizeEmbedding = new Float32Array(32); // Wrong size

      expect(() => computeHash(wrongSizeEmbedding, hashFn)).toThrow();
    });
  });

  describe('hammingDistance()', () => {
    it('should return 0 for identical hashes', () => {
      expect(hammingDistance(0b1010n, 0b1010n, 4)).toBe(0);
    });

    it('should count differing bits correctly', () => {
      expect(hammingDistance(0b0000n, 0b1111n, 4)).toBe(4);
      expect(hammingDistance(0b1010n, 0b0101n, 4)).toBe(4);
      expect(hammingDistance(0b1100n, 0b1010n, 4)).toBe(2);
    });
  });

  describe('estimateCosineSimilarity()', () => {
    it('should return 1 for zero Hamming distance', () => {
      const similarity = estimateCosineSimilarity(0, 16);
      expect(similarity).toBe(1);
    });

    it('should return value between -1 and 1', () => {
      for (let i = 0; i <= 16; i++) {
        const similarity = estimateCosineSimilarity(i, 16);
        expect(similarity).toBeGreaterThanOrEqual(-1);
        expect(similarity).toBeLessThanOrEqual(1);
      }
    });

    it('should decrease as Hamming distance increases', () => {
      const numBits = 8;

      const sim0 = estimateCosineSimilarity(0, numBits); // 0 distance
      const sim2 = estimateCosineSimilarity(2, numBits); // 2 distance
      const sim4 = estimateCosineSimilarity(4, numBits); // 4 distance
      const sim8 = estimateCosineSimilarity(8, numBits); // 8 distance

      expect(sim0).toBeGreaterThan(sim2);
      expect(sim2).toBeGreaterThan(sim4);
      expect(sim4).toBeGreaterThan(sim8);
    });
  });

  describe('generateProbes()', () => {
    it('should include original hash', () => {
      const hash = 0b1010n;
      const probes = generateProbes(hash, 4, 0);

      expect(probes).toContain(hash);
      expect(probes.length).toBe(1);
    });

    it('should generate single bit flips', () => {
      const hash = 0b1111n;
      const probes = generateProbes(hash, 4, 4);

      // Original + 4 single-bit flips
      expect(probes.length).toBe(5);
      expect(probes).toContain(0b1111n); // original
      expect(probes).toContain(0b1110n); // flip bit 0
      expect(probes).toContain(0b1101n); // flip bit 1
      expect(probes).toContain(0b1011n); // flip bit 2
      expect(probes).toContain(0b0111n); // flip bit 3
    });

    it('should generate double bit flips when needed', () => {
      const hash = 0b1111n;
      const probes = generateProbes(hash, 4, 10);

      // Original + 4 single + some double flips
      expect(probes.length).toBeGreaterThan(5);
      // Check one double flip exists
      expect(probes).toContain(0b1100n); // flip bits 0 and 1
    });
  });
});
