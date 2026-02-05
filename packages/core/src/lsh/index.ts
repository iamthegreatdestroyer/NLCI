/**
 * @nlci/core - LSH Module
 *
 * Exports all LSH (Locality-Sensitive Hashing) components.
 */

// Main LSH index
export {
  DEFAULT_LSH_INDEX_CONFIG,
  LSHIndex,
  type LSHIndexConfig,
  type LSHIndexStats,
  type LSHQueryResult,
} from './lsh-index.js';

// Hyperplane hash functions
export {
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
  type Hyperplane,
  type HyperplaneHashFunction,
  type ProjectionQuality,
  type ScoredProbe,
} from './hyperplane.js';

// Hash table implementation
export {
  HashTable,
  type Bucket,
  type HashTableStats,
  type SerializedHashTable,
} from './hash-table.js';

// Bucket store
export {
  BucketStore,
  MemoryStorage,
  type BucketStorage,
  type BucketStoreStats,
} from './bucket-store.js';
