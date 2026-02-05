/**
 * @nlci/core - Hash Table Implementation
 *
 * A hash table for storing code blocks indexed by their LSH hash.
 * Each bucket contains code blocks that hash to the same value.
 *
 * Phase 3 Enhancements:
 * - Overflow bucket chaining for graceful degradation
 * - Collision analytics for identifying hot spots
 * - LRU eviction policy for memory management
 */

import type { CodeBlock } from '../types/code-block.js';

/**
 * Access record for LRU tracking.
 */
interface AccessRecord {
  /** Block ID */
  blockId: string;
  /** Last access timestamp */
  lastAccess: number;
  /** Number of accesses */
  accessCount: number;
}

/**
 * A bucket in the hash table containing code blocks with the same hash.
 */
export interface Bucket {
  /** The hash value for this bucket */
  readonly hash: bigint;

  /** Code blocks in this bucket */
  readonly blocks: readonly CodeBlock[];

  /** Block IDs for fast lookup */
  readonly blockIds: ReadonlySet<string>;

  /** Overflow chain (if any) */
  readonly overflowChain?: OverflowBucket;
}

/**
 * Overflow bucket for chaining when primary bucket is full.
 */
export interface OverflowBucket {
  /** Code blocks in this overflow bucket */
  readonly blocks: readonly CodeBlock[];

  /** Block IDs for fast lookup */
  readonly blockIds: ReadonlySet<string>;

  /** Next overflow bucket in chain */
  readonly next?: OverflowBucket;
}

/**
 * Collision analytics data for a bucket.
 */
export interface BucketAnalytics {
  /** The hash value */
  hash: string;
  /** Number of blocks in primary bucket */
  primaryCount: number;
  /** Number of blocks in overflow chain */
  overflowCount: number;
  /** Total insertions attempted */
  insertionAttempts: number;
  /** Number of collision events */
  collisions: number;
  /** Access frequency (hot spot indicator) */
  accessFrequency: number;
}

/**
 * Hash table configuration options.
 */
export interface HashTableConfig {
  /** Maximum number of blocks per bucket (default: 1000) */
  maxBucketSize?: number;
  /** Enable overflow chaining (default: true) */
  enableOverflowChaining?: boolean;
  /** Maximum overflow chain length (default: 3) */
  maxOverflowChainLength?: number;
  /** Enable LRU eviction (default: false) */
  enableLRUEviction?: boolean;
  /** LRU eviction threshold - evict when this many blocks (default: 10000) */
  lruEvictionThreshold?: number;
  /** Fraction of blocks to evict when threshold reached (default: 0.1) */
  lruEvictionFraction?: number;
  /** Enable collision analytics (default: false) */
  enableAnalytics?: boolean;
}

const DEFAULT_CONFIG: Required<HashTableConfig> = {
  maxBucketSize: 1000,
  enableOverflowChaining: true,
  maxOverflowChainLength: 3,
  enableLRUEviction: false,
  lruEvictionThreshold: 10000,
  lruEvictionFraction: 0.1,
  enableAnalytics: false,
};

/**
 * Hash table for LSH indexing.
 * Maps hash values to buckets of code blocks.
 */
export class HashTable {
  private buckets: Map<string, Bucket>;
  private readonly config: Required<HashTableConfig>;
  private totalBlocks: number;

  // LRU tracking
  private accessRecords: Map<string, AccessRecord>;
  private accessOrder: string[]; // Block IDs in LRU order

  // Collision analytics
  private bucketAnalytics: Map<string, BucketAnalytics>;

  /**
   * Creates a new hash table.
   *
   * @param configOrMaxBucketSize - Configuration object or max bucket size (for backwards compatibility)
   */
  constructor(configOrMaxBucketSize: HashTableConfig | number = {}) {
    // Backwards compatibility: accept number as maxBucketSize
    const config =
      typeof configOrMaxBucketSize === 'number'
        ? { maxBucketSize: configOrMaxBucketSize }
        : configOrMaxBucketSize;

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.buckets = new Map();
    this.totalBlocks = 0;
    this.accessRecords = new Map();
    this.accessOrder = [];
    this.bucketAnalytics = new Map();
  }

  /**
   * Gets the max bucket size (for backwards compatibility).
   */
  get maxBucketSize(): number {
    return this.config.maxBucketSize;
  }

  /**
   * Inserts a code block into the table.
   *
   * @param hash - The LSH hash of the block
   * @param block - The code block to insert
   * @returns true if inserted, false if bucket is full or duplicate
   */
  insert(hash: bigint, block: CodeBlock): boolean {
    const key = hash.toString();

    // Track analytics if enabled
    if (this.config.enableAnalytics) {
      this.trackInsertionAttempt(key);
    }

    // Check LRU eviction threshold
    if (this.config.enableLRUEviction && this.totalBlocks >= this.config.lruEvictionThreshold) {
      this.evictLRU();
    }

    let bucket = this.buckets.get(key);

    if (bucket) {
      // Check for duplicate in primary bucket
      if (bucket.blockIds.has(block.id)) {
        return false;
      }

      // Check for duplicate in overflow chain
      if (bucket.overflowChain && this.hasInOverflowChain(bucket.overflowChain, block.id)) {
        return false;
      }

      // Track collision if analytics enabled
      if (this.config.enableAnalytics) {
        this.trackCollision(key);
      }

      // Check if primary bucket has space
      if (bucket.blocks.length < this.config.maxBucketSize) {
        // Add to primary bucket
        const newBlockIds = new Set(bucket.blockIds);
        newBlockIds.add(block.id);

        bucket = {
          hash,
          blocks: [...bucket.blocks, block],
          blockIds: newBlockIds,
          overflowChain: bucket.overflowChain,
        };
      } else if (this.config.enableOverflowChaining) {
        // Try to add to overflow chain
        const newOverflowChain = this.insertIntoOverflowChain(bucket.overflowChain, block, 0);
        if (newOverflowChain === null) {
          return false; // Chain is full
        }
        bucket = {
          hash,
          blocks: bucket.blocks,
          blockIds: bucket.blockIds,
          overflowChain: newOverflowChain,
        };
      } else {
        return false; // Bucket full, no overflow chaining
      }
    } else {
      // Create new bucket
      bucket = {
        hash,
        blocks: [block],
        blockIds: new Set([block.id]),
      };
    }

    this.buckets.set(key, bucket);
    this.totalBlocks++;

    // Track access for LRU
    if (this.config.enableLRUEviction) {
      this.recordAccess(block.id);
    }

    return true;
  }

  /**
   * Helper: Check if block exists in overflow chain.
   */
  private hasInOverflowChain(chain: OverflowBucket, blockId: string): boolean {
    if (chain.blockIds.has(blockId)) return true;
    if (chain.next) return this.hasInOverflowChain(chain.next, blockId);
    return false;
  }

  /**
   * Helper: Insert block into overflow chain.
   * Returns new chain or null if full.
   */
  private insertIntoOverflowChain(
    chain: OverflowBucket | undefined,
    block: CodeBlock,
    depth: number
  ): OverflowBucket | null {
    if (depth >= this.config.maxOverflowChainLength) {
      return null; // Chain too long
    }

    if (!chain) {
      // Create new overflow bucket
      return {
        blocks: [block],
        blockIds: new Set([block.id]),
      };
    }

    // Try to add to this bucket
    if (chain.blocks.length < this.config.maxBucketSize) {
      const newBlockIds = new Set(chain.blockIds);
      newBlockIds.add(block.id);
      return {
        blocks: [...chain.blocks, block],
        blockIds: newBlockIds,
        next: chain.next,
      };
    }

    // Try next in chain
    const newNext = this.insertIntoOverflowChain(chain.next, block, depth + 1);
    if (newNext === null) return null;

    return {
      blocks: chain.blocks,
      blockIds: chain.blockIds,
      next: newNext,
    };
  }

  /**
   * Retrieves all code blocks with the given hash.
   *
   * Time complexity: O(1) average case
   *
   * @param hash - The LSH hash to look up
   * @returns Array of code blocks, empty if not found
   */
  get(hash: bigint): readonly CodeBlock[] {
    const key = hash.toString();
    const bucket = this.buckets.get(key);
    if (!bucket) return [];

    // Track access for analytics
    if (this.config.enableAnalytics) {
      this.trackBucketAccess(key);
    }

    // Collect blocks from primary and overflow chain
    const results: CodeBlock[] = [...bucket.blocks];
    let overflow = bucket.overflowChain;
    while (overflow) {
      results.push(...overflow.blocks);
      overflow = overflow.next;
    }

    // Update LRU for accessed blocks
    if (this.config.enableLRUEviction) {
      for (const block of results) {
        this.recordAccess(block.id);
      }
    }

    return results;
  }

  /**
   * Retrieves code blocks from multiple hashes (for multi-probe).
   *
   * @param hashes - Array of hashes to look up
   * @returns Array of unique code blocks
   */
  getMultiple(hashes: readonly bigint[]): readonly CodeBlock[] {
    const seen = new Set<string>();
    const results: CodeBlock[] = [];

    for (const hash of hashes) {
      const blocks = this.get(hash);
      for (const block of blocks) {
        if (!seen.has(block.id)) {
          seen.add(block.id);
          results.push(block);
        }
      }
    }

    return results;
  }

  /**
   * Removes a code block from the table.
   *
   * @param hash - The LSH hash of the block
   * @param blockId - The ID of the block to remove
   * @returns true if removed, false if not found
   */
  remove(hash: bigint, blockId: string): boolean {
    const key = hash.toString();
    const bucket = this.buckets.get(key);

    if (!bucket) return false;

    // Try to remove from primary bucket
    if (bucket.blockIds.has(blockId)) {
      const newBlocks = bucket.blocks.filter((b) => b.id !== blockId);
      const newBlockIds = new Set(bucket.blockIds);
      newBlockIds.delete(blockId);

      if (newBlocks.length === 0 && !bucket.overflowChain) {
        this.buckets.delete(key);
      } else {
        this.buckets.set(key, {
          hash: bucket.hash,
          blocks: newBlocks,
          blockIds: newBlockIds,
          overflowChain: bucket.overflowChain,
        });
      }

      this.totalBlocks--;
      this.removeFromLRU(blockId);
      return true;
    }

    // Try to remove from overflow chain
    if (bucket.overflowChain) {
      const result = this.removeFromOverflowChain(bucket.overflowChain, blockId);
      if (result.removed) {
        this.buckets.set(key, {
          hash: bucket.hash,
          blocks: bucket.blocks,
          blockIds: bucket.blockIds,
          overflowChain: result.chain,
        });
        this.totalBlocks--;
        this.removeFromLRU(blockId);
        return true;
      }
    }

    return false;
  }

  /**
   * Helper: Remove block from overflow chain.
   */
  private removeFromOverflowChain(
    chain: OverflowBucket,
    blockId: string
  ): { removed: boolean; chain: OverflowBucket | undefined } {
    if (chain.blockIds.has(blockId)) {
      const newBlocks = chain.blocks.filter((b) => b.id !== blockId);
      const newBlockIds = new Set(chain.blockIds);
      newBlockIds.delete(blockId);

      if (newBlocks.length === 0) {
        return { removed: true, chain: chain.next };
      }

      return {
        removed: true,
        chain: {
          blocks: newBlocks,
          blockIds: newBlockIds,
          next: chain.next,
        },
      };
    }

    if (chain.next) {
      const result = this.removeFromOverflowChain(chain.next, blockId);
      if (result.removed) {
        return {
          removed: true,
          chain: {
            blocks: chain.blocks,
            blockIds: chain.blockIds,
            next: result.chain,
          },
        };
      }
    }

    return { removed: false, chain };
  }

  /**
   * Checks if a block exists in the bucket for the given hash.
   *
   * @param hash - The LSH hash
   * @param blockId - The block ID to check
   * @returns true if the block exists
   */
  has(hash: bigint, blockId: string): boolean {
    const bucket = this.buckets.get(hash.toString());
    if (!bucket) return false;

    if (bucket.blockIds.has(blockId)) return true;
    if (bucket.overflowChain) return this.hasInOverflowChain(bucket.overflowChain, blockId);
    return false;
  }

  /**
   * Returns the number of unique buckets.
   */
  get numBuckets(): number {
    return this.buckets.size;
  }

  /**
   * Returns the total number of blocks stored.
   */
  get size(): number {
    return this.totalBlocks;
  }

  // =========================================================================
  // LRU Eviction Methods
  // =========================================================================

  /**
   * Records an access for LRU tracking.
   */
  private recordAccess(blockId: string): void {
    const now = Date.now();
    const existing = this.accessRecords.get(blockId);

    if (existing) {
      existing.lastAccess = now;
      existing.accessCount++;

      // Move to end of access order
      const idx = this.accessOrder.indexOf(blockId);
      if (idx !== -1) {
        this.accessOrder.splice(idx, 1);
      }
      this.accessOrder.push(blockId);
    } else {
      this.accessRecords.set(blockId, {
        blockId,
        lastAccess: now,
        accessCount: 1,
      });
      this.accessOrder.push(blockId);
    }
  }

  /**
   * Removes a block from LRU tracking.
   */
  private removeFromLRU(blockId: string): void {
    this.accessRecords.delete(blockId);
    const idx = this.accessOrder.indexOf(blockId);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
  }

  /**
   * Evicts least recently used blocks.
   */
  private evictLRU(): void {
    const numToEvict = Math.floor(this.totalBlocks * this.config.lruEvictionFraction);
    const blocksToEvict = this.accessOrder.slice(0, numToEvict);

    for (const blockId of blocksToEvict) {
      // Find and remove block from all buckets
      for (const [_key, bucket] of this.buckets) {
        if (this.has(bucket.hash, blockId)) {
          this.remove(bucket.hash, blockId);
          break;
        }
      }
    }
  }

  /**
   * Gets the LRU access records (for debugging/analytics).
   */
  getAccessRecords(): Map<string, AccessRecord> {
    return new Map(this.accessRecords);
  }

  // =========================================================================
  // Collision Analytics Methods
  // =========================================================================

  /**
   * Tracks an insertion attempt for analytics.
   */
  private trackInsertionAttempt(hashKey: string): void {
    let analytics = this.bucketAnalytics.get(hashKey);
    if (!analytics) {
      analytics = {
        hash: hashKey,
        primaryCount: 0,
        overflowCount: 0,
        insertionAttempts: 0,
        collisions: 0,
        accessFrequency: 0,
      };
      this.bucketAnalytics.set(hashKey, analytics);
    }
    analytics.insertionAttempts++;
  }

  /**
   * Tracks a collision event for analytics.
   */
  private trackCollision(hashKey: string): void {
    const analytics = this.bucketAnalytics.get(hashKey);
    if (analytics) {
      analytics.collisions++;
    }
  }

  /**
   * Tracks bucket access for analytics.
   */
  private trackBucketAccess(hashKey: string): void {
    const analytics = this.bucketAnalytics.get(hashKey);
    if (analytics) {
      analytics.accessFrequency++;
    }
  }

  /**
   * Gets collision analytics for all buckets.
   */
  getCollisionAnalytics(): BucketAnalytics[] {
    // Update counts from actual buckets
    for (const [key, bucket] of this.buckets) {
      let analytics = this.bucketAnalytics.get(key);
      if (!analytics) {
        analytics = {
          hash: key,
          primaryCount: 0,
          overflowCount: 0,
          insertionAttempts: 0,
          collisions: 0,
          accessFrequency: 0,
        };
        this.bucketAnalytics.set(key, analytics);
      }

      analytics.primaryCount = bucket.blocks.length;
      analytics.overflowCount = this.countOverflowBlocks(bucket.overflowChain);
    }

    return Array.from(this.bucketAnalytics.values());
  }

  /**
   * Gets hot spots (buckets with high collision/access rates).
   */
  getHotSpots(limit: number = 10): BucketAnalytics[] {
    const analytics = this.getCollisionAnalytics();
    return analytics
      .sort((a, b) => {
        const scoreA = a.collisions + a.accessFrequency;
        const scoreB = b.collisions + b.accessFrequency;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Helper: Count blocks in overflow chain.
   */
  private countOverflowBlocks(chain: OverflowBucket | undefined): number {
    if (!chain) return 0;
    return chain.blocks.length + this.countOverflowBlocks(chain.next);
  }

  // =========================================================================
  // Statistics & Serialization
  // =========================================================================

  /**
   * Returns statistics about the hash table.
   */
  getStats(): HashTableStats {
    const bucketSizes: number[] = [];
    let minSize = Infinity;
    let maxSize = 0;
    let totalOverflowBlocks = 0;

    for (const bucket of this.buckets.values()) {
      const primarySize = bucket.blocks.length;
      const overflowSize = this.countOverflowBlocks(bucket.overflowChain);
      const totalSize = primarySize + overflowSize;

      bucketSizes.push(totalSize);
      minSize = Math.min(minSize, totalSize);
      maxSize = Math.max(maxSize, totalSize);
      totalOverflowBlocks += overflowSize;
    }

    const avgSize =
      bucketSizes.length > 0 ? bucketSizes.reduce((a, b) => a + b, 0) / bucketSizes.length : 0;

    return {
      numBuckets: this.buckets.size,
      totalBlocks: this.totalBlocks,
      minBucketSize: minSize === Infinity ? 0 : minSize,
      maxBucketSize: maxSize,
      avgBucketSize: avgSize,
      totalOverflowBlocks,
      overflowChainsUsed: Array.from(this.buckets.values()).filter((b) => b.overflowChain).length,
    };
  }

  /**
   * Clears all data from the table.
   */
  clear(): void {
    this.buckets.clear();
    this.totalBlocks = 0;
    this.accessRecords.clear();
    this.accessOrder = [];
    this.bucketAnalytics.clear();
  }

  /**
   * Exports the hash table state for in-memory transfer.
   */
  exportState(): { buckets: Array<{ hash: bigint; blocks: CodeBlock[] }> } {
    const buckets: Array<{ hash: bigint; blocks: CodeBlock[] }> = [];

    for (const bucket of this.buckets.values()) {
      const allBlocks = [...bucket.blocks];
      let overflow = bucket.overflowChain;
      while (overflow) {
        allBlocks.push(...overflow.blocks);
        overflow = overflow.next;
      }

      buckets.push({
        hash: bucket.hash,
        blocks: allBlocks,
      });
    }

    return { buckets };
  }

  /**
   * Imports hash table state from exported data.
   */
  importState(state: { buckets: Array<{ hash: bigint; blocks: CodeBlock[] }> }): void {
    this.clear();

    for (const { hash, blocks } of state.buckets) {
      for (const block of blocks) {
        this.insert(hash, block);
      }
    }
  }

  /**
   * Serializes the hash table to a JSON-compatible format.
   */
  toJSON(): SerializedHashTable {
    const buckets: Array<{ hash: string; blocks: CodeBlock[] }> = [];

    for (const [hashStr, bucket] of this.buckets) {
      const allBlocks = [...bucket.blocks];
      let overflow = bucket.overflowChain;
      while (overflow) {
        allBlocks.push(...overflow.blocks);
        overflow = overflow.next;
      }

      buckets.push({
        hash: hashStr,
        blocks: allBlocks,
      });
    }

    return {
      buckets,
      maxBucketSize: this.config.maxBucketSize,
    };
  }

  /**
   * Creates a hash table from serialized data.
   */
  static fromJSON(data: SerializedHashTable): HashTable {
    const table = new HashTable({ maxBucketSize: data.maxBucketSize });

    for (const { hash, blocks } of data.buckets) {
      const hashBigInt = BigInt(hash);
      for (const block of blocks) {
        table.insert(hashBigInt, block);
      }
    }

    return table;
  }
}

/**
 * Statistics about a hash table.
 */
export interface HashTableStats {
  numBuckets: number;
  totalBlocks: number;
  minBucketSize: number;
  maxBucketSize: number;
  avgBucketSize: number;
  /** Number of blocks in overflow chains */
  totalOverflowBlocks?: number;
  /** Number of buckets with overflow chains */
  overflowChainsUsed?: number;
}

/**
 * Serialized hash table format.
 */
export interface SerializedHashTable {
  buckets: Array<{ hash: string; blocks: CodeBlock[] }>;
  maxBucketSize: number;
}
