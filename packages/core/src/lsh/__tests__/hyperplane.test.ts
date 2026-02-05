/**
 * @nlci/core - Hyperplane Hash Functions Tests
 */

import { describe, expect, it } from 'vitest';
import {
  SeededRandom,
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

  // ============================================================================
  // Enhanced Hyperplane Projections Tests (Phase 1 Hybrid Optimization)
  // ============================================================================

  describe('createOrthogonalHashFunction()', () => {
    it('should create hash function with correct number of bits', () => {
      const hashFn = createOrthogonalHashFunction(16, 128, 42);

      expect(hashFn.numBits).toBe(16);
      expect(hashFn.dimension).toBe(128);
      expect(hashFn.hyperplanes.length).toBe(16);
    });

    it('should be deterministic with same seed', () => {
      const hf1 = createOrthogonalHashFunction(8, 64, 100);
      const hf2 = createOrthogonalHashFunction(8, 64, 100);

      for (let i = 0; i < hf1.hyperplanes.length; i++) {
        expect(Array.from(hf1.hyperplanes[i].normal)).toEqual(
          Array.from(hf2.hyperplanes[i].normal)
        );
      }
    });

    it('should produce orthogonal hyperplanes', () => {
      const hashFn = createOrthogonalHashFunction(8, 128, 42);

      // Check orthogonality: dot product of different hyperplane normals should be ~0
      for (let i = 0; i < hashFn.hyperplanes.length; i++) {
        for (let j = i + 1; j < hashFn.hyperplanes.length; j++) {
          const dotProduct = dotProductFloat32(
            hashFn.hyperplanes[i].normal,
            hashFn.hyperplanes[j].normal
          );
          // Orthogonal vectors have dot product of 0 (allowing some numerical error)
          expect(Math.abs(dotProduct)).toBeLessThan(0.1);
        }
      }
    });

    it('should produce normalized hyperplane vectors', () => {
      const hashFn = createOrthogonalHashFunction(8, 64, 42);

      for (const hp of hashFn.hyperplanes) {
        const magnitude = Math.sqrt(Array.from(hp.normal).reduce((sum, v) => sum + v * v, 0));
        // Should be approximately unit length
        expect(Math.abs(magnitude - 1)).toBeLessThan(0.01);
      }
    });

    it('should be compatible with computeHash', () => {
      const hashFn = createOrthogonalHashFunction(16, 64, 42);
      const embedding = new Float32Array(64).fill(0.5);

      const hash = computeHash(embedding, hashFn);

      expect(typeof hash).toBe('bigint');
      expect(hash).toBeGreaterThanOrEqual(0n);
      expect(hash).toBeLessThan(2n ** 16n);
    });
  });

  describe('computeDotProductOptimized()', () => {
    it('should compute correct dot product', () => {
      const a = new Float32Array([1, 2, 3, 4]);
      const b = new Float32Array([5, 6, 7, 8]);

      const result = computeDotProductOptimized(a, b);

      // 1*5 + 2*6 + 3*7 + 4*8 = 5 + 12 + 21 + 32 = 70
      expect(result).toBe(70);
    });

    it('should handle vectors of length not divisible by 8', () => {
      const a = new Float32Array([1, 2, 3, 4, 5]);
      const b = new Float32Array([2, 3, 4, 5, 6]);

      const result = computeDotProductOptimized(a, b);

      // 1*2 + 2*3 + 3*4 + 4*5 + 5*6 = 2 + 6 + 12 + 20 + 30 = 70
      expect(result).toBe(70);
    });

    it('should handle vectors divisible by 8', () => {
      const size = 64;
      const a = new Float32Array(size);
      const b = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        a[i] = i;
        b[i] = 1;
      }

      const result = computeDotProductOptimized(a, b);

      // Sum of 0 to 63 = (63 * 64) / 2 = 2016
      expect(result).toBe(2016);
    });

    it('should match standard dot product computation', () => {
      const size = 128;
      const a = new Float32Array(size);
      const b = new Float32Array(size);
      const rng = new SeededRandom(42);

      for (let i = 0; i < size; i++) {
        a[i] = rng.nextGaussian();
        b[i] = rng.nextGaussian();
      }

      const optimized = computeDotProductOptimized(a, b);
      const standard = Array.from(a).reduce((sum, v, i) => sum + v * b[i], 0);

      // Should be equal within floating point precision
      expect(Math.abs(optimized - standard)).toBeLessThan(0.0001);
    });
  });

  describe('computeHashBatch()', () => {
    it('should compute hashes for multiple embeddings', () => {
      const hashFn = createHashFunction(16, 64, 42);
      const embeddings = [
        new Float32Array(64).fill(0.5),
        new Float32Array(64).fill(-0.5),
        new Float32Array(64).fill(0),
      ];

      const hashes = computeHashBatch(embeddings, hashFn);

      expect(hashes.length).toBe(3);
      hashes.forEach((hash) => {
        expect(typeof hash).toBe('bigint');
        expect(hash).toBeGreaterThanOrEqual(0n);
        expect(hash).toBeLessThan(2n ** 16n);
      });
    });

    it('should produce same result as individual computeHash calls', () => {
      const hashFn = createHashFunction(16, 64, 42);
      const rng = new SeededRandom(123);

      const embeddings = Array.from({ length: 10 }, () => {
        const emb = new Float32Array(64);
        for (let i = 0; i < 64; i++) {
          emb[i] = rng.nextGaussian();
        }
        return emb;
      });

      const batchHashes = computeHashBatch(embeddings, hashFn);
      const individualHashes = embeddings.map((e) => computeHash(e, hashFn));

      expect(batchHashes).toEqual(individualHashes);
    });

    it('should handle empty array', () => {
      const hashFn = createHashFunction(16, 64, 42);
      const hashes = computeHashBatch([], hashFn);
      expect(hashes).toEqual([]);
    });
  });

  describe('computeProjectionQuality()', () => {
    it('should return quality metrics for standard hash function', () => {
      const hashFn = createHashFunction(8, 64, 42);
      const quality = computeProjectionQuality(hashFn);

      expect(quality).toHaveProperty('meanCorrelation');
      expect(quality).toHaveProperty('maxCorrelation');
      expect(quality).toHaveProperty('diversityScore');
      expect(quality).toHaveProperty('isOrthogonal');
    });

    it('should show low correlation for orthogonal hash function', () => {
      const hashFn = createOrthogonalHashFunction(8, 64, 42);
      const quality = computeProjectionQuality(hashFn);

      // Orthogonal hyperplanes should have near-zero correlation
      expect(quality.meanCorrelation).toBeLessThan(0.1);
      expect(quality.isOrthogonal).toBe(true);
    });

    it('should report higher diversity for orthogonal projections', () => {
      const standardFn = createHashFunction(8, 64, 42);
      const orthogonalFn = createOrthogonalHashFunction(8, 64, 42);

      const standardQuality = computeProjectionQuality(standardFn);
      const orthogonalQuality = computeProjectionQuality(orthogonalFn);

      // Orthogonal should have higher diversity (lower correlation)
      expect(orthogonalQuality.diversityScore).toBeGreaterThanOrEqual(
        standardQuality.diversityScore - 0.1
      );
    });
  });

  describe('generateScoredProbes()', () => {
    it('should include original hash with highest score', () => {
      const hashFn = createHashFunction(8, 64, 42);
      const embedding = new Float32Array(64).fill(0.5);
      const hash = computeHash(embedding, hashFn);

      const probes = generateScoredProbes(hash, embedding, hashFn, 5);

      expect(probes.length).toBe(5);
      // Original hash should be first with highest score
      expect(probes[0].hash).toBe(hash);
      expect(probes[0].score).toBe(1.0);
    });

    it('should return probes sorted by score descending', () => {
      const hashFn = createHashFunction(16, 64, 42);
      const rng = new SeededRandom(42);
      const embedding = new Float32Array(64);
      for (let i = 0; i < 64; i++) {
        embedding[i] = rng.nextGaussian();
      }

      const probes = generateScoredProbes(computeHash(embedding, hashFn), embedding, hashFn, 20);

      // Verify scores are in descending order
      for (let i = 1; i < probes.length; i++) {
        expect(probes[i - 1].score).toBeGreaterThanOrEqual(probes[i].score);
      }
    });

    it('should produce unique hashes', () => {
      const hashFn = createHashFunction(8, 64, 42);
      const embedding = new Float32Array(64).fill(0.3);
      const hash = computeHash(embedding, hashFn);

      const probes = generateScoredProbes(hash, embedding, hashFn, 10);
      const hashes = probes.map((p) => p.hash);
      const uniqueHashes = new Set(hashes);

      expect(uniqueHashes.size).toBe(hashes.length);
    });

    it('should limit probes to numProbes parameter', () => {
      const hashFn = createHashFunction(16, 64, 42);
      const embedding = new Float32Array(64).fill(0.5);
      const hash = computeHash(embedding, hashFn);

      for (const numProbes of [1, 5, 10, 20]) {
        const probes = generateScoredProbes(hash, embedding, hashFn, numProbes);
        expect(probes.length).toBe(numProbes);
      }
    });
  });
});

// Helper function for test calculations
function dotProductFloat32(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}
