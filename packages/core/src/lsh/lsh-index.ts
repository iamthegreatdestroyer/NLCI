/**
 * @nlci/core - LSH Index
 *
 * The main LSH (Locality-Sensitive Hashing) index class that provides
 * O(1) query time for finding similar code blocks.
 *
 * Architecture:
 * - L independent hash tables, each with K-bit hash functions
 * - Each table uses random hyperplane projections for hashing
 * - Multi-probe LSH explores nearby buckets for better recall
 *
 * Time Complexity:
 * - Insert: O(L * K * d) where d is embedding dimension
 * - Query: O(L * K * d + L * numProbes * avgBucketSize)
 * - With proper parameters, query is effectively O(1)
 */

import type { CodeBlock } from '../types/code-block.js';
import type { LSHConfig } from '../types/config.js';
import { BucketStore, MemoryStorage, type BucketStorage } from './bucket-store.js';
import {
  computeHash,
  createHashFunction,
  generateProbes,
  type HyperplaneHashFunction,
} from './hyperplane.js';

/**
 * Configuration for the LSH index.
 */
export interface LSHIndexConfig extends LSHConfig {
  /** Storage backend for persistence */
  storage?: BucketStorage;

  /** Maximum blocks per bucket */
  maxBucketSize?: number;
}

/**
 * Default LSH index configuration.
 */
export const DEFAULT_LSH_INDEX_CONFIG: Required<LSHIndexConfig> = {
  numTables: 20,
  numBits: 12,
  dimension: 384,
  seed: 42,
  multiProbe: {
    enabled: true,
    numProbes: 5,
  },
  storage: new MemoryStorage(),
  maxBucketSize: 1000,
};

/**
 * Result of a query operation.
 */
export interface LSHQueryResult {
  /** The matching code block */
  block: CodeBlock;

  /** Number of tables where this block matched */
  tableMatches: number;

  /** Estimated similarity based on hash collision rate */
  estimatedSimilarity: number;

  /** Actual cosine similarity if embeddings are compared */
  actualSimilarity?: number;
}

/**
 * Statistics about the LSH index.
 */
export interface LSHIndexStats {
  /** Number of hash tables */
  numTables: number;

  /** Bits per hash */
  numBits: number;

  /** Embedding dimension */
  dimension: number;

  /** Total unique blocks indexed */
  totalBlocks: number;

  /** Average blocks per bucket */
  avgBucketSize: number;

  /** Total number of buckets across all tables */
  totalBuckets: number;

  /** Load factor (blocks per bucket) */
  loadFactor: number;
}

/**
 * Entry in the block metadata index.
 */
interface BlockMetadata {
  /** The code block */
  block: CodeBlock;

  /** The embedding vector */
  embedding: Float32Array;

  /** Hashes for each table */
  hashes: Map<number, bigint>;
}

/**
 * Serialized format for block metadata (from JSON).
 */
interface SerializedBlockMetadata {
  id: string;
  block: CodeBlock;
  embedding: number[];
  hashes: [number, string][];
}

/**
 * LSH Index for sub-linear similarity search.
 *
 * Uses Locality-Sensitive Hashing with random hyperplane projections
 * to index high-dimensional embeddings for fast nearest neighbor queries.
 */
export class LSHIndex {
  private readonly config: Required<LSHIndexConfig>;
  private readonly hashFunctions: HyperplaneHashFunction[];
  private readonly bucketStore: BucketStore;
  private readonly blockMetadata: Map<string, BlockMetadata>;

  /**
   * Creates a new LSH index.
   *
   * @param config - Configuration options
   */
  constructor(config: Partial<LSHIndexConfig> = {}) {
    this.config = { ...DEFAULT_LSH_INDEX_CONFIG, ...config };
    this.blockMetadata = new Map();

    // Create hash functions for each table
    this.hashFunctions = [];
    for (let i = 0; i < this.config.numTables; i++) {
      const seed = this.config.seed + i * 1000;
      this.hashFunctions.push(createHashFunction(this.config.numBits, this.config.dimension, seed));
    }

    // Create bucket store
    this.bucketStore = new BucketStore(
      this.config.numTables,
      this.config.maxBucketSize,
      this.config.storage
    );
  }

  /**
   * Inserts a code block with its embedding into the index.
   *
   * Time complexity: O(L * K * d)
   *
   * @param block - The code block to insert
   * @param embedding - The embedding vector
   * @returns true if inserted successfully
   */
  insert(block: CodeBlock, embedding: Float32Array | number[]): boolean {
    if (embedding.length !== this.config.dimension) {
      throw new Error(
        `Embedding dimension ${embedding.length} does not match index dimension ${this.config.dimension}`
      );
    }

    // Convert to Float32Array if needed
    const embeddingArray =
      embedding instanceof Float32Array ? embedding : new Float32Array(embedding);

    // Compute hashes and insert into each table
    const hashes = new Map<number, bigint>();
    let insertedCount = 0;

    for (let i = 0; i < this.config.numTables; i++) {
      const hash = computeHash(embeddingArray, this.hashFunctions[i]);
      hashes.set(i, hash);

      if (this.bucketStore.insert(i, hash, block)) {
        insertedCount++;
      }
    }

    // Store metadata if we inserted into at least one table
    if (insertedCount > 0) {
      this.blockMetadata.set(block.id, {
        block,
        embedding: embeddingArray,
        hashes,
      });
      return true;
    }

    return false;
  }

  /**
   * Queries the index for similar code blocks.
   *
   * Time complexity: O(L * K * d + results)
   * With proper parameters, this is effectively O(1)
   *
   * @param embedding - The query embedding vector
   * @param options - Query options
   * @returns Array of similar code blocks sorted by estimated similarity
   */
  query(
    embedding: Float32Array | number[],
    options: {
      maxResults?: number;
      minSimilarity?: number;
      computeActualSimilarity?: boolean;
    } = {}
  ): LSHQueryResult[] {
    const { maxResults = 50, minSimilarity = 0.7, computeActualSimilarity = true } = options;

    if (embedding.length !== this.config.dimension) {
      throw new Error(
        `Embedding dimension ${embedding.length} does not match index dimension ${this.config.dimension}`
      );
    }

    const embeddingArray =
      embedding instanceof Float32Array ? embedding : new Float32Array(embedding);

    // Compute hashes and probes for each table
    const hashesPerTable = new Map<number, readonly bigint[]>();

    for (let i = 0; i < this.config.numTables; i++) {
      const hash = computeHash(embeddingArray, this.hashFunctions[i]);

      if (this.config.multiProbe.enabled) {
        const probes = generateProbes(hash, this.config.numBits, this.config.multiProbe.numProbes);
        hashesPerTable.set(i, probes);
      } else {
        hashesPerTable.set(i, [hash]);
      }
    }

    // Query all tables
    const candidates = this.bucketStore.queryAll(hashesPerTable);

    // Convert to results and compute similarities
    const results: LSHQueryResult[] = [];

    for (const { block, tableMatches } of candidates.values()) {
      // Estimate similarity from table match rate
      const estimatedSimilarity = tableMatches / this.config.numTables;

      // Skip if below threshold
      if (estimatedSimilarity < minSimilarity * 0.5) continue;

      let actualSimilarity: number | undefined;

      if (computeActualSimilarity) {
        const metadata = this.blockMetadata.get(block.id);
        if (metadata) {
          actualSimilarity = this.cosineSimilarity(embeddingArray, metadata.embedding);

          // Skip if actual similarity is below threshold
          if (actualSimilarity < minSimilarity) continue;
        }
      }

      results.push({
        block,
        tableMatches,
        estimatedSimilarity,
        actualSimilarity,
      });
    }

    // Sort by similarity (actual if available, otherwise estimated)
    results.sort((a, b) => {
      const simA = a.actualSimilarity ?? a.estimatedSimilarity;
      const simB = b.actualSimilarity ?? b.estimatedSimilarity;
      return simB - simA;
    });

    // Limit results
    return results.slice(0, maxResults);
  }

  /**
   * Removes a code block from the index.
   *
   * @param blockId - The ID of the block to remove
   * @returns true if the block was removed
   */
  remove(blockId: string): boolean {
    const metadata = this.blockMetadata.get(blockId);
    if (!metadata) return false;

    this.bucketStore.remove(blockId, metadata.hashes);
    this.blockMetadata.delete(blockId);

    return true;
  }

  /**
   * Checks if a block is in the index.
   */
  has(blockId: string): boolean {
    return this.blockMetadata.has(blockId);
  }

  /**
   * Gets a block by ID.
   */
  get(blockId: string): CodeBlock | undefined {
    return this.blockMetadata.get(blockId)?.block;
  }

  /**
   * Gets the embedding for a block.
   */
  getEmbedding(blockId: string): Float32Array | undefined {
    return this.blockMetadata.get(blockId)?.embedding;
  }

  /**
   * Returns all indexed blocks.
   */
  getAllBlocks(): readonly CodeBlock[] {
    return Array.from(this.blockMetadata.values()).map((m) => m.block);
  }

  /**
   * Computes cosine similarity between two vectors.
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Returns statistics about the index.
   */
  getStats(): LSHIndexStats {
    const storeStats = this.bucketStore.getStats();

    return {
      numTables: this.config.numTables,
      numBits: this.config.numBits,
      dimension: this.config.dimension,
      totalBlocks: this.blockMetadata.size,
      avgBucketSize:
        storeStats.avgBlocksPerTable / Math.max(storeStats.totalBuckets / storeStats.numTables, 1),
      totalBuckets: storeStats.totalBuckets,
      loadFactor: storeStats.avgBlocksPerTable,
    };
  }

  /**
   * Persists the index to storage.
   */
  async save(): Promise<void> {
    await this.bucketStore.save();

    // Save metadata separately
    const metadata = Array.from(this.blockMetadata.entries()).map(([id, data]) => ({
      id,
      block: data.block,
      embedding: Array.from(data.embedding),
      hashes: Array.from(data.hashes.entries()).map(([ti, h]) => [ti, h.toString()]),
    }));

    const storage = this.config.storage;
    await storage.save('lsh-metadata', JSON.stringify(metadata));
  }

  /**
   * Loads the index from storage.
   */
  async load(): Promise<boolean> {
    const loaded = await this.bucketStore.load();
    if (!loaded) return false;

    const storage = this.config.storage;
    const metadataJson = await storage.load('lsh-metadata');
    if (!metadataJson) return false;

    try {
      const metadata = JSON.parse(metadataJson) as SerializedBlockMetadata[];

      this.blockMetadata.clear();
      for (const item of metadata) {
        const hashes = new Map<number, bigint>();
        for (const [ti, h] of item.hashes) {
          hashes.set(ti, BigInt(h));
        }

        this.blockMetadata.set(item.id, {
          block: item.block,
          embedding: new Float32Array(item.embedding),
          hashes,
        });
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears the index.
   */
  clear(): void {
    this.bucketStore.clear();
    this.blockMetadata.clear();
  }

  /**
   * Exports the index state for serialization.
   * Unlike save(), this returns the data directly for in-memory transfer.
   */
  exportState(): {
    metadata: SerializedBlockMetadata[];
    buckets: ReturnType<BucketStore['exportState']>;
  } {
    const metadata = Array.from(this.blockMetadata.entries()).map(([id, data]) => ({
      id,
      block: data.block,
      embedding: Array.from(data.embedding),
      hashes: Array.from(data.hashes.entries()).map(
        ([ti, h]) => [ti, h.toString()] as [number, string]
      ),
    }));

    return {
      metadata,
      buckets: this.bucketStore.exportState(),
    };
  }

  /**
   * Imports index state from exported data.
   * Unlike load(), this accepts data directly for in-memory transfer.
   */
  importState(state: { metadata: SerializedBlockMetadata[]; buckets: unknown }): void {
    this.blockMetadata.clear();

    for (const item of state.metadata) {
      const hashes = new Map<number, bigint>();
      for (const [ti, h] of item.hashes) {
        hashes.set(ti, BigInt(h));
      }

      this.blockMetadata.set(item.id, {
        block: item.block,
        embedding: new Float32Array(item.embedding),
        hashes,
      });
    }

    this.bucketStore.importState(state.buckets as ReturnType<BucketStore['exportState']>);
  }

  /**
   * Returns the number of blocks in the index.
   */
  get size(): number {
    return this.blockMetadata.size;
  }
}

export { LSHIndex as default };
