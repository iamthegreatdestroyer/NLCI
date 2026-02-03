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
    x = (x + 0x9e3779b97f4a7c15) | 0;
    x = Math.imul(x ^ (x >>> 30), 0xbf58476d1ce4e5b9);
    x = Math.imul(x ^ (x >>> 27), 0x94d049bb133111eb);
    return x ^ (x >>> 31);
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
export function createHyperplane(
  dimension: number,
  rng: SeededRandom,
): Hyperplane {
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
  seed: number,
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
  hashFunction: HyperplaneHashFunction,
): bigint {
  if (embedding.length !== hashFunction.dimension) {
    throw new Error(
      `Embedding dimension ${embedding.length} does not match hash function dimension ${hashFunction.dimension}`,
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
function computeDotProduct(
  a: Float32Array | number[],
  b: Float32Array,
): number {
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
export function hammingDistance(
  hash1: bigint,
  hash2: bigint,
  numBits: number,
): number {
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
export function estimateCosineSimilarity(
  hammingDist: number,
  numBits: number,
): number {
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
export function generateProbes(
  hash: bigint,
  numBits: number,
  numProbes: number,
): bigint[] {
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
