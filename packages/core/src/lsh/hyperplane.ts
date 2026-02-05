/**
 * @nlci/core - Hyperplane Hash Functions
 *
 * Implements random hyperplane projection for Locality-Sensitive Hashing.
 * Each hyperplane partitions the embedding space into two half-spaces,
 * producing a single bit of the hash.
 *
 * Mathematical foundation:
 * - For unit vectors u, v: P(h(u) = h(v)) = 1 - θ(u,v)/π
 * - Where θ(u,v) is the angle between u and v
 * - This means similar vectors have similar hashes with high probability
 */

/**
 * Represents a random hyperplane in d-dimensional space.
 * The hyperplane is defined by its normal vector.
 */
export interface Hyperplane {
  /** Normal vector defining the hyperplane */
  readonly normal: Float32Array;

  /** Dimension of the hyperplane */
  readonly dimension: number;
}

/**
 * A collection of hyperplanes forming a hash function.
 * K hyperplanes produce a K-bit hash.
 */
export interface HyperplaneHashFunction {
  /** The hyperplanes used for hashing */
  readonly hyperplanes: readonly Hyperplane[];

  /** Number of bits (number of hyperplanes) */
  readonly numBits: number;

  /** Dimension of the embedding space */
  readonly dimension: number;
}

/**
 * Seeded random number generator for reproducible hyperplanes.
 * Uses the xorshift128+ algorithm.
 */
export class SeededRandom {
  private state0: number;
  private state1: number;

  constructor(seed: number) {
    // Initialize state from seed using SplitMix64
    this.state0 = this.splitmix64(seed);
    this.state1 = this.splitmix64(this.state0);
  }

  private splitmix64(x: number): number {
    // Using 32-bit compatible constants for SplitMix-style mixing
    x = (x + 0x9e3779b9) | 0;
    x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return x ^ (x >>> 16);
  }

  /**
   * Returns a random float in [0, 1).
   */
  next(): number {
    const s1 = this.state0;
    let s0 = this.state1;
    const result = s0 + s1;

    s0 ^= s1;
    this.state0 = ((s0 << 23) | (s0 >>> 9)) ^ s0 ^ (s0 << 17);
    this.state1 = (s0 << 45) | (s0 >>> 19);

    // Convert to float in [0, 1)
    return (result >>> 0) / 0x100000000;
  }

  /**
   * Returns a random float from standard normal distribution.
   * Uses the Box-Muller transform.
   */
  nextGaussian(): number {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

/**
 * Creates a random hyperplane in d-dimensional space.
 * The normal vector is sampled from a standard Gaussian distribution.
 *
 * @param dimension - Dimension of the embedding space
 * @param rng - Random number generator
 * @returns A random hyperplane
 */
export function createHyperplane(dimension: number, rng: SeededRandom): Hyperplane {
  const normal = new Float32Array(dimension);

  // Sample from standard Gaussian distribution
  for (let i = 0; i < dimension; i++) {
    normal[i] = rng.nextGaussian();
  }

  // Normalize to unit vector for numerical stability
  const norm = Math.sqrt(normal.reduce((sum, x) => sum + x * x, 0));
  if (norm > 0) {
    for (let i = 0; i < dimension; i++) {
      normal[i] /= norm;
    }
  }

  return { normal, dimension };
}

/**
 * Creates a hash function with K hyperplanes.
 *
 * @param numBits - Number of hyperplanes (K)
 * @param dimension - Dimension of the embedding space
 * @param seed - Random seed for reproducibility
 * @returns A hash function with K hyperplanes
 */
export function createHashFunction(
  numBits: number,
  dimension: number,
  seed: number
): HyperplaneHashFunction {
  const rng = new SeededRandom(seed);
  const hyperplanes: Hyperplane[] = [];

  for (let i = 0; i < numBits; i++) {
    hyperplanes.push(createHyperplane(dimension, rng));
  }

  return {
    hyperplanes,
    numBits,
    dimension,
  };
}

/**
 * Computes the hash of an embedding vector using hyperplane projection.
 *
 * For each hyperplane, the hash bit is:
 * - 1 if the dot product with the normal is >= 0
 * - 0 otherwise
 *
 * Time complexity: O(K * d) where K is numBits and d is dimension
 *
 * @param embedding - The embedding vector to hash
 * @param hashFunction - The hash function to use
 * @returns A K-bit hash as a BigInt
 */
export function computeHash(
  embedding: Float32Array | number[],
  hashFunction: HyperplaneHashFunction
): bigint {
  if (embedding.length !== hashFunction.dimension) {
    throw new Error(
      `Embedding dimension ${embedding.length} does not match hash function dimension ${hashFunction.dimension}`
    );
  }

  let hash = 0n;

  for (let i = 0; i < hashFunction.numBits; i++) {
    const hyperplane = hashFunction.hyperplanes[i];
    const dotProduct = computeDotProduct(embedding, hyperplane.normal);

    // Set bit i if dot product is >= 0
    if (dotProduct >= 0) {
      hash |= 1n << BigInt(i);
    }
  }

  return hash;
}

/**
 * Computes the dot product of two vectors.
 * Uses loop unrolling for better performance.
 */
function computeDotProduct(a: Float32Array | number[], b: Float32Array): number {
  const n = a.length;
  let sum = 0;

  // Process 4 elements at a time for better cache utilization
  const chunks = Math.floor(n / 4) * 4;
  for (let i = 0; i < chunks; i += 4) {
    sum += a[i] * b[i] + a[i + 1] * b[i + 1] + a[i + 2] * b[i + 2] + a[i + 3] * b[i + 3];
  }

  // Handle remaining elements
  for (let i = chunks; i < n; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

/**
 * Computes the Hamming distance between two hashes.
 *
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @param numBits - Number of bits in the hash
 * @returns Number of differing bits
 */
export function hammingDistance(hash1: bigint, hash2: bigint, _numBits: number): number {
  let xor = hash1 ^ hash2;
  let distance = 0;

  // Brian Kernighan's algorithm
  while (xor !== 0n) {
    xor &= xor - 1n;
    distance++;
  }

  return distance;
}

/**
 * Estimates the cosine similarity from Hamming distance.
 *
 * Based on the property: P(h(u) = h(v)) = 1 - θ/π
 * Where θ is the angle between u and v.
 *
 * @param hammingDist - Hamming distance between hashes
 * @param numBits - Number of bits in the hash
 * @returns Estimated cosine similarity in [-1, 1]
 */
export function estimateCosineSimilarity(hammingDist: number, numBits: number): number {
  // Probability that a bit is the same
  const pSame = 1 - hammingDist / numBits;

  // pSame = 1 - θ/π => θ = π * (1 - pSame)
  const angle = Math.PI * (1 - pSame);

  // cosine similarity = cos(θ)
  return Math.cos(angle);
}

/**
 * Generates nearby hashes for multi-probe LSH.
 *
 * Flips each bit to explore neighboring buckets.
 *
 * @param hash - Original hash
 * @param numBits - Number of bits in the hash
 * @param numProbes - Number of probes (flips up to this many bits)
 * @returns Array of probe hashes including original
 */
export function generateProbes(hash: bigint, numBits: number, numProbes: number): bigint[] {
  const probes: bigint[] = [hash];

  if (numProbes <= 0) return probes;

  // Single bit flips
  for (let i = 0; i < numBits && probes.length < numProbes + 1; i++) {
    probes.push(hash ^ (1n << BigInt(i)));
  }

  // Double bit flips (if we need more probes)
  if (numProbes > numBits) {
    for (let i = 0; i < numBits - 1 && probes.length < numProbes + 1; i++) {
      for (let j = i + 1; j < numBits && probes.length < numProbes + 1; j++) {
        probes.push(hash ^ (1n << BigInt(i)) ^ (1n << BigInt(j)));
      }
    }
  }

  return probes;
}

// ============================================================================
// PHASE 1: ENHANCED HYPERPLANE PROJECTIONS (Hybrid Optimization)
// ============================================================================

/**
 * Creates orthogonalized hyperplanes using Gram-Schmidt process.
 * Orthogonal hyperplanes reduce correlation between hash bits,
 * improving the quality of the LSH hash function.
 *
 * Mathematical foundation:
 * - Orthogonal projections ensure each bit captures independent information
 * - Reduces redundancy in the hash, improving recall
 * - For K hyperplanes in d-dimensional space (K << d), all can be orthogonal
 *
 * @param numBits - Number of hyperplanes (K)
 * @param dimension - Dimension of the embedding space
 * @param seed - Random seed for reproducibility
 * @returns A hash function with orthogonalized hyperplanes
 */
export function createOrthogonalHashFunction(
  numBits: number,
  dimension: number,
  seed: number
): HyperplaneHashFunction {
  const rng = new SeededRandom(seed);
  const hyperplanes: Hyperplane[] = [];

  // Generate orthogonalized hyperplanes using Gram-Schmidt
  for (let i = 0; i < numBits; i++) {
    // Start with random Gaussian vector
    const normal = new Float32Array(dimension);
    for (let j = 0; j < dimension; j++) {
      normal[j] = rng.nextGaussian();
    }

    // Orthogonalize against all previous hyperplanes
    for (let j = 0; j < hyperplanes.length; j++) {
      const prevNormal = hyperplanes[j].normal;
      const dot = computeDotProductOptimized(normal, prevNormal);

      // Subtract projection: v = v - (v·u)u
      for (let k = 0; k < dimension; k++) {
        normal[k] -= dot * prevNormal[k];
      }
    }

    // Normalize to unit vector
    const norm = Math.sqrt(computeDotProductOptimized(normal, normal));
    if (norm > 1e-10) {
      for (let j = 0; j < dimension; j++) {
        normal[j] /= norm;
      }
    } else {
      // Degenerate case: generate new random vector
      // This can happen when numBits > dimension
      for (let j = 0; j < dimension; j++) {
        normal[j] = rng.nextGaussian();
      }
      const newNorm = Math.sqrt(computeDotProductOptimized(normal, normal));
      for (let j = 0; j < dimension; j++) {
        normal[j] /= newNorm;
      }
    }

    hyperplanes.push({ normal, dimension });
  }

  return {
    hyperplanes,
    numBits,
    dimension,
  };
}

/**
 * Optimized dot product with SIMD-friendly loop unrolling.
 * Uses 8-element unrolling for better vectorization.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Dot product of a and b
 */
export function computeDotProductOptimized(a: Float32Array | number[], b: Float32Array): number {
  const n = a.length;
  let sum0 = 0,
    sum1 = 0,
    sum2 = 0,
    sum3 = 0;
  let sum4 = 0,
    sum5 = 0,
    sum6 = 0,
    sum7 = 0;

  // Process 8 elements at a time for better vectorization
  const chunks = Math.floor(n / 8) * 8;
  for (let i = 0; i < chunks; i += 8) {
    sum0 += a[i] * b[i];
    sum1 += a[i + 1] * b[i + 1];
    sum2 += a[i + 2] * b[i + 2];
    sum3 += a[i + 3] * b[i + 3];
    sum4 += a[i + 4] * b[i + 4];
    sum5 += a[i + 5] * b[i + 5];
    sum6 += a[i + 6] * b[i + 6];
    sum7 += a[i + 7] * b[i + 7];
  }

  // Combine partial sums (reduces floating point error)
  let sum = sum0 + sum4 + (sum1 + sum5) + (sum2 + sum6) + (sum3 + sum7);

  // Handle remaining elements
  for (let i = chunks; i < n; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

/**
 * Batch hash computation for multiple embeddings.
 * Optimized for processing large numbers of vectors efficiently.
 *
 * @param embeddings - Array of embedding vectors
 * @param hashFunction - The hash function to use
 * @returns Array of hashes corresponding to each embedding
 */
export function computeHashBatch(
  embeddings: readonly (Float32Array | number[])[],
  hashFunction: HyperplaneHashFunction
): bigint[] {
  const numEmbeddings = embeddings.length;
  const hashes: bigint[] = new Array<bigint>(numEmbeddings);

  // Pre-compute hyperplane array for cache efficiency
  const hyperplaneNormals = hashFunction.hyperplanes.map((h) => h.normal);
  const numBits = hashFunction.numBits;

  for (let e = 0; e < numEmbeddings; e++) {
    const embedding = embeddings[e];

    if (embedding.length !== hashFunction.dimension) {
      throw new Error(
        `Embedding ${e} dimension ${embedding.length} does not match hash function dimension ${hashFunction.dimension}`
      );
    }

    let hash = 0n;

    for (let i = 0; i < numBits; i++) {
      const dotProduct = computeDotProductOptimized(embedding, hyperplaneNormals[i]);

      if (dotProduct >= 0) {
        hash |= 1n << BigInt(i);
      }
    }

    hashes[e] = hash;
  }

  return hashes;
}

/**
 * Computes projection quality metrics for a hash function.
 * Used for diagnostics and optimization.
 *
 * @param hashFunction - The hash function to analyze
 * @returns Quality metrics including correlation and diversity
 */
export function computeProjectionQuality(hashFunction: HyperplaneHashFunction): ProjectionQuality {
  const { hyperplanes } = hashFunction;
  const n = hyperplanes.length;

  if (n < 2) {
    return {
      meanCorrelation: 0,
      maxCorrelation: 0,
      diversityScore: 1,
      isOrthogonal: true,
    };
  }

  // Compute pairwise correlations (dot products of unit vectors)
  let totalCorrelation = 0;
  let maxCorrelation = 0;
  let numPairs = 0;

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const correlation = Math.abs(
        computeDotProductOptimized(hyperplanes[i].normal, hyperplanes[j].normal)
      );
      totalCorrelation += correlation;
      maxCorrelation = Math.max(maxCorrelation, correlation);
      numPairs++;
    }
  }

  const meanCorrelation = totalCorrelation / numPairs;

  // Diversity score: 1 - mean correlation (1 = fully diverse, 0 = fully correlated)
  const diversityScore = 1 - meanCorrelation;

  // Consider orthogonal if max correlation < 0.1
  const isOrthogonal = maxCorrelation < 0.1;

  return {
    meanCorrelation,
    maxCorrelation,
    diversityScore,
    isOrthogonal,
  };
}

/**
 * Quality metrics for projection analysis.
 */
export interface ProjectionQuality {
  /** Mean absolute correlation between hyperplanes */
  meanCorrelation: number;

  /** Maximum absolute correlation between any two hyperplanes */
  maxCorrelation: number;

  /** Diversity score (1 - mean correlation) */
  diversityScore: number;

  /** True if all hyperplanes are approximately orthogonal */
  isOrthogonal: boolean;
}

/**
 * Advanced multi-probe with perturbation scoring.
 * Orders probes by expected probability of finding matches.
 *
 * @param hash - Original hash
 * @param embedding - Original embedding vector
 * @param hashFunction - The hash function used
 * @param numProbes - Number of probes to generate
 * @returns Array of probe hashes ordered by expected match probability
 */
export function generateScoredProbes(
  hash: bigint,
  embedding: Float32Array | number[],
  hashFunction: HyperplaneHashFunction,
  numProbes: number
): ScoredProbe[] {
  if (numProbes <= 0) {
    return [];
  }

  // Compute distance to each hyperplane (magnitude of dot product)
  const distances: { bit: number; distance: number }[] = [];
  for (let i = 0; i < hashFunction.numBits; i++) {
    const distance = Math.abs(
      computeDotProductOptimized(embedding, hashFunction.hyperplanes[i].normal)
    );
    distances.push({ bit: i, distance });
  }

  // Sort by distance (smallest first - most likely to flip)
  distances.sort((a, b) => a.distance - b.distance);

  const probes: ScoredProbe[] = [{ hash, score: 1.0, flippedBits: [] }];

  // Generate single-bit flips ordered by probability
  for (let i = 0; i < hashFunction.numBits && probes.length < numProbes; i++) {
    const { bit, distance } = distances[i];
    const flippedHash = hash ^ (1n << BigInt(bit));
    // Score based on distance to hyperplane (closer = more likely to be wrong)
    const score = Math.exp(-distance);
    probes.push({ hash: flippedHash, score, flippedBits: [bit] });
  }

  // Generate double-bit flips if needed
  if (probes.length < numProbes) {
    for (let i = 0; i < hashFunction.numBits - 1 && probes.length < numProbes; i++) {
      for (let j = i + 1; j < hashFunction.numBits && probes.length < numProbes; j++) {
        const { bit: bit1, distance: d1 } = distances[i];
        const { bit: bit2, distance: d2 } = distances[j];
        const flippedHash = hash ^ (1n << BigInt(bit1)) ^ (1n << BigInt(bit2));
        const score = Math.exp(-(d1 + d2));
        probes.push({ hash: flippedHash, score, flippedBits: [bit1, bit2] });
      }
    }
  }

  // Sort by score (highest first)
  probes.sort((a, b) => b.score - a.score);

  return probes.slice(0, numProbes);
}

/**
 * A probe with its expected match probability score.
 */
export interface ScoredProbe {
  /** The probe hash value */
  hash: bigint;

  /** Expected probability of finding a match (0-1) */
  score: number;

  /** Which bits were flipped from the original */
  flippedBits: number[];
}
