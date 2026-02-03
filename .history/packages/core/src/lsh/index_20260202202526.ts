/**
 * @nlci/core - LSH Module
 *
 * Exports all LSH (Locality-Sensitive Hashing) components.
 */

// Main LSH index
export {
  LSHIndex,
  type LSHIndexConfig,
  type LSHQueryResult,
  type LSHIndexStats,
  DEFAULT_LSH_INDEX_CONFIG,
} from './lsh-index.js';

// Hyperplane hash functions
export {
  type Hyperplane,
  type HyperplaneHashFunction,
  SeededRandom,
  createHyperplane,
  createHashFunction,
  computeHash,
  hammingDistance,
  estimateCosineSimilarity,
  generateProbes,
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
  type BucketStorage,
  type BucketStoreStats,
  MemoryStorage,
} from './bucket-store.js';
