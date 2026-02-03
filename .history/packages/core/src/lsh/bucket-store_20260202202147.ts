/**
 * @nlci/core - Bucket Store
 *
 * Manages storage and retrieval of hash tables with optional persistence.
 */

import type { CodeBlock } from '../types/code-block.js';
import { HashTable, type HashTableStats } from './hash-table.js';

/**
 * Storage backend interface.
 */
export interface BucketStorage {
  /** Save data to storage */
  save(key: string, data: string): Promise<void>;

  /** Load data from storage */
  load(key: string): Promise<string | null>;

  /** Delete data from storage */
  delete(key: string): Promise<void>;

  /** List all keys */
  list(): Promise<string[]>;

  /** Check if key exists */
  exists(key: string): Promise<boolean>;
}

/**
 * In-memory storage backend.
 */
export class MemoryStorage implements BucketStorage {
  private data: Map<string, string> = new Map();

  async save(key: string, data: string): Promise<void> {
    this.data.set(key, data);
  }

  async load(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async list(): Promise<string[]> {
    return Array.from(this.data.keys());
  }

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  }
}

/**
 * Manages a collection of hash tables (one per LSH table).
 */
export class BucketStore {
  private tables: Map<number, HashTable>;
  private blockIndex: Map<string, Set<number>>; // blockId -> table indices
  private storage: BucketStorage;
  private readonly maxBucketSize: number;
  private isDirty: boolean;

  /**
   * Creates a new bucket store.
   *
   * @param numTables - Number of hash tables
   * @param maxBucketSize - Maximum blocks per bucket
   * @param storage - Optional storage backend
   */
  constructor(
    numTables: number,
    maxBucketSize: number = 1000,
    storage: BucketStorage = new MemoryStorage(),
  ) {
    this.tables = new Map();
    this.blockIndex = new Map();
    this.storage = storage;
    this.maxBucketSize = maxBucketSize;
    this.isDirty = false;

    // Initialize hash tables
    for (let i = 0; i < numTables; i++) {
      this.tables.set(i, new HashTable(maxBucketSize));
    }
  }

  /**
   * Inserts a code block into a specific table.
   *
   * @param tableIndex - Index of the hash table
   * @param hash - The LSH hash
   * @param block - The code block
   * @returns true if inserted
   */
  insert(tableIndex: number, hash: bigint, block: CodeBlock): boolean {
    const table = this.tables.get(tableIndex);
    if (!table) {
      throw new Error(`Table index ${tableIndex} out of range`);
    }

    const inserted = table.insert(hash, block);

    if (inserted) {
      // Update block index
      let tableSet = this.blockIndex.get(block.id);
      if (!tableSet) {
        tableSet = new Set();
        this.blockIndex.set(block.id, tableSet);
      }
      tableSet.add(tableIndex);
      this.isDirty = true;
    }

    return inserted;
  }

  /**
   * Queries a specific table for code blocks.
   *
   * @param tableIndex - Index of the hash table
   * @param hashes - Hashes to query (for multi-probe)
   * @returns Code blocks matching any hash
   */
  query(tableIndex: number, hashes: readonly bigint[]): readonly CodeBlock[] {
    const table = this.tables.get(tableIndex);
    if (!table) {
      throw new Error(`Table index ${tableIndex} out of range`);
    }

    return table.getMultiple(hashes);
  }

  /**
   * Queries all tables and returns unique code blocks.
   *
   * @param hashesPerTable - Map of table index to hashes
   * @returns Unique code blocks across all tables
   */
  queryAll(
    hashesPerTable: Map<number, readonly bigint[]>,
  ): Map<string, { block: CodeBlock; tableMatches: number }> {
    const results = new Map<
      string,
      { block: CodeBlock; tableMatches: number }
    >();

    for (const [tableIndex, hashes] of hashesPerTable) {
      const blocks = this.query(tableIndex, hashes);

      for (const block of blocks) {
        const existing = results.get(block.id);
        if (existing) {
          existing.tableMatches++;
        } else {
          results.set(block.id, { block, tableMatches: 1 });
        }
      }
    }

    return results;
  }

  /**
   * Removes a code block from all tables.
   *
   * @param blockId - The block ID to remove
   * @param hashes - Map of table index to hash for this block
   * @returns Number of tables the block was removed from
   */
  remove(blockId: string, hashes: Map<number, bigint>): number {
    let removed = 0;

    for (const [tableIndex, hash] of hashes) {
      const table = this.tables.get(tableIndex);
      if (table?.remove(hash, blockId)) {
        removed++;
      }
    }

    this.blockIndex.delete(blockId);

    if (removed > 0) {
      this.isDirty = true;
    }

    return removed;
  }

  /**
   * Checks if a block exists in any table.
   */
  hasBlock(blockId: string): boolean {
    return this.blockIndex.has(blockId);
  }

  /**
   * Gets the table indices where a block is stored.
   */
  getBlockTables(blockId: string): ReadonlySet<number> {
    return this.blockIndex.get(blockId) ?? new Set();
  }

  /**
   * Returns statistics for all tables.
   */
  getStats(): BucketStoreStats {
    const tableStats: HashTableStats[] = [];
    let totalBlocks = 0;
    let totalBuckets = 0;

    for (const table of this.tables.values()) {
      const stats = table.getStats();
      tableStats.push(stats);
      totalBlocks += stats.totalBlocks;
      totalBuckets += stats.numBuckets;
    }

    return {
      numTables: this.tables.size,
      totalBlocks: this.blockIndex.size, // Unique blocks
      totalBuckets,
      avgBlocksPerTable: totalBlocks / this.tables.size,
      tableStats,
    };
  }

  /**
   * Persists the bucket store to storage.
   */
  async save(): Promise<void> {
    if (!this.isDirty) return;

    const data = {
      version: 1,
      numTables: this.tables.size,
      maxBucketSize: this.maxBucketSize,
      tables: Array.from(this.tables.entries()).map(([index, table]) => ({
        index,
        data: table.toJSON(),
      })),
    };

    await this.storage.save('bucket-store', JSON.stringify(data));
    this.isDirty = false;
  }

  /**
   * Loads the bucket store from storage.
   */
  async load(): Promise<boolean> {
    const json = await this.storage.load('bucket-store');
    if (!json) return false;

    try {
      const data = JSON.parse(json);

      this.tables.clear();
      this.blockIndex.clear();

      for (const { index, data: tableData } of data.tables) {
        const table = HashTable.fromJSON(tableData);
        this.tables.set(index, table);

        // Rebuild block index
        for (const bucket of tableData.buckets) {
          for (const block of bucket.blocks) {
            let tableSet = this.blockIndex.get(block.id);
            if (!tableSet) {
              tableSet = new Set();
              this.blockIndex.set(block.id, tableSet);
            }
            tableSet.add(index);
          }
        }
      }

      this.isDirty = false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears all data.
   */
  clear(): void {
    for (const table of this.tables.values()) {
      table.clear();
    }
    this.blockIndex.clear();
    this.isDirty = true;
  }

  /**
   * Returns the number of unique blocks stored.
   */
  get size(): number {
    return this.blockIndex.size;
  }

  /**
   * Returns the number of tables.
   */
  get numTables(): number {
    return this.tables.size;
  }
}

/**
 * Statistics for the bucket store.
 */
export interface BucketStoreStats {
  numTables: number;
  totalBlocks: number;
  totalBuckets: number;
  avgBlocksPerTable: number;
  tableStats: HashTableStats[];
}
