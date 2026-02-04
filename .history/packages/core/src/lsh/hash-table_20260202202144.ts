/**
 * @nlci/core - Hash Table Implementation
 *
 * A hash table for storing code blocks indexed by their LSH hash.
 * Each bucket contains code blocks that hash to the same value.
 */

import type { CodeBlock } from '../types/code-block.js';

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
}

/**
 * Hash table for LSH indexing.
 * Maps hash values to buckets of code blocks.
 */
export class HashTable {
  private buckets: Map<string, Bucket>;
  private readonly maxBucketSize: number;
  private totalBlocks: number;

  /**
   * Creates a new hash table.
   *
   * @param maxBucketSize - Maximum number of blocks per bucket
   */
  constructor(maxBucketSize: number = 1000) {
    this.buckets = new Map();
    this.maxBucketSize = maxBucketSize;
    this.totalBlocks = 0;
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
    let bucket = this.buckets.get(key);

    if (bucket) {
      // Check for duplicate
      if (bucket.blockIds.has(block.id)) {
        return false;
      }

      // Check bucket size limit
      if (bucket.blocks.length >= this.maxBucketSize) {
        return false;
      }

      // Add to existing bucket
      const newBlockIds = new Set(bucket.blockIds);
      newBlockIds.add(block.id);

      bucket = {
        hash,
        blocks: [...bucket.blocks, block],
        blockIds: newBlockIds,
      };
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
    return true;
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
    const bucket = this.buckets.get(hash.toString());
    return bucket?.blocks ?? [];
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

    if (!bucket || !bucket.blockIds.has(blockId)) {
      return false;
    }

    const newBlocks = bucket.blocks.filter((b) => b.id !== blockId);
    const newBlockIds = new Set(bucket.blockIds);
    newBlockIds.delete(blockId);

    if (newBlocks.length === 0) {
      this.buckets.delete(key);
    } else {
      this.buckets.set(key, {
        hash,
        blocks: newBlocks,
        blockIds: newBlockIds,
      });
    }

    this.totalBlocks--;
    return true;
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
    return bucket?.blockIds.has(blockId) ?? false;
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

  /**
   * Returns statistics about the hash table.
   */
  getStats(): HashTableStats {
    const bucketSizes: number[] = [];
    let minSize = Infinity;
    let maxSize = 0;

    for (const bucket of this.buckets.values()) {
      const size = bucket.blocks.length;
      bucketSizes.push(size);
      minSize = Math.min(minSize, size);
      maxSize = Math.max(maxSize, size);
    }

    const avgSize =
      bucketSizes.length > 0 ? bucketSizes.reduce((a, b) => a + b, 0) / bucketSizes.length : 0;

    return {
      numBuckets: this.buckets.size,
      totalBlocks: this.totalBlocks,
      minBucketSize: minSize === Infinity ? 0 : minSize,
      maxBucketSize: maxSize,
      avgBucketSize: avgSize,
    };
  }

  /**
   * Clears all data from the table.
   */
  clear(): void {
    this.buckets.clear();
    this.totalBlocks = 0;
  }

  /**
   * Serializes the hash table to a JSON-compatible format.
   */
  toJSON(): SerializedHashTable {
    const buckets: Array<{ hash: string; blocks: CodeBlock[] }> = [];

    for (const [hashStr, bucket] of this.buckets) {
      buckets.push({
        hash: hashStr,
        blocks: [...bucket.blocks],
      });
    }

    return {
      buckets,
      maxBucketSize: this.maxBucketSize,
    };
  }

  /**
   * Creates a hash table from serialized data.
   */
  static fromJSON(data: SerializedHashTable): HashTable {
    const table = new HashTable(data.maxBucketSize);

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
}

/**
 * Serialized hash table format.
 */
export interface SerializedHashTable {
  buckets: Array<{ hash: string; blocks: CodeBlock[] }>;
  maxBucketSize: number;
}
