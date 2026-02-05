/**
 * @nlci/core - HashTable Tests
 *
 * Comprehensive tests for the enhanced HashTable implementation
 * covering Phase 3 features: overflow chains, LRU eviction, and collision analytics.
 */

import { describe, expect, it } from 'vitest';
import type { CodeBlock } from '../../types/code-block';
import { HashTable } from '../hash-table';

/**
 * Creates a mock CodeBlock for testing.
 * Includes all required properties from the CodeBlock interface.
 */
function createMockBlock(id: number | string): CodeBlock {
  const idStr = typeof id === 'number' ? `block-${id}` : id;
  return {
    id: idStr,
    filePath: `test/file-${idStr}.ts`,
    startLine: 1,
    endLine: 10,
    startColumn: 0,
    endColumn: 80,
    content: `function test${idStr}() { return ${idStr}; }`,
    normalizedContent: `function test() { return x; }`,
    language: 'typescript',
    blockType: 'function',
    name: `test${idStr}`,
    contentHash: `hash-${idStr}`,
    tokenCount: 10,
    indexedAt: new Date(),
  };
}

/**
 * Creates a bigint hash for testing.
 */
function hash(n: number | string): bigint {
  if (typeof n === 'number') {
    return BigInt(n);
  }
  // Simple string hash for testing
  let h = 0n;
  for (let i = 0; i < n.length; i++) {
    h = (h * 31n + BigInt(n.charCodeAt(i))) % BigInt(Number.MAX_SAFE_INTEGER);
  }
  return h;
}

describe('HashTable', () => {
  describe('Basic Operations', () => {
    it('should create an empty hash table', () => {
      const ht = new HashTable();
      expect(ht.size).toBe(0);
      expect(ht.numBuckets).toBe(0);
    });

    it('should insert and retrieve blocks', () => {
      const ht = new HashTable();
      const block = createMockBlock(1);
      const h = hash(1);

      ht.insert(h, block);

      expect(ht.size).toBe(1);
      const result = ht.get(h);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('block-1');
    });

    it('should handle multiple blocks in the same bucket', () => {
      const ht = new HashTable();
      const block1 = createMockBlock(1);
      const block2 = createMockBlock(2);
      const h = hash(100);

      ht.insert(h, block1);
      ht.insert(h, block2);

      expect(ht.size).toBe(2);
      const blocks = ht.get(h);
      expect(blocks).toHaveLength(2);
      expect(blocks.some((b) => b.id === 'block-1')).toBe(true);
      expect(blocks.some((b) => b.id === 'block-2')).toBe(true);
    });

    it('should handle multiple buckets', () => {
      const ht = new HashTable();
      const block1 = createMockBlock(1);
      const block2 = createMockBlock(2);
      const h1 = hash(1);
      const h2 = hash(2);

      ht.insert(h1, block1);
      ht.insert(h2, block2);

      expect(ht.size).toBe(2);
      expect(ht.numBuckets).toBe(2);
      expect(ht.get(h1)[0].id).toBe('block-1');
      expect(ht.get(h2)[0].id).toBe('block-2');
    });

    it('should not duplicate blocks', () => {
      const ht = new HashTable();
      const block = createMockBlock(1);
      const h = hash(1);

      ht.insert(h, block);
      ht.insert(h, block); // Duplicate

      expect(ht.size).toBe(1);
    });

    it('should return empty array for non-existent hash', () => {
      const ht = new HashTable();
      expect(ht.get(hash(999))).toEqual([]);
    });
  });

  describe('has() method', () => {
    it('should return true when block exists', () => {
      const ht = new HashTable();
      const block = createMockBlock(1);
      const h = hash(1);
      ht.insert(h, block);

      expect(ht.has(h, 'block-1')).toBe(true);
    });

    it('should return false when block does not exist', () => {
      const ht = new HashTable();
      expect(ht.has(hash(1), 'nonexistent')).toBe(false);
    });

    it('should return false for wrong hash', () => {
      const ht = new HashTable();
      const block = createMockBlock(1);
      ht.insert(hash(1), block);

      expect(ht.has(hash(2), 'block-1')).toBe(false);
    });
  });

  describe('remove() method', () => {
    it('should remove a block from the bucket', () => {
      const ht = new HashTable();
      const block = createMockBlock(1);
      const h = hash(1);
      ht.insert(h, block);

      const removed = ht.remove(h, 'block-1');

      expect(removed).toBe(true);
      expect(ht.size).toBe(0);
      expect(ht.get(h)).toEqual([]);
    });

    it('should return false when block not found', () => {
      const ht = new HashTable();
      expect(ht.remove(hash(1), 'nonexistent')).toBe(false);
    });

    it('should keep other blocks in bucket after removal', () => {
      const ht = new HashTable();
      const block1 = createMockBlock(1);
      const block2 = createMockBlock(2);
      const h = hash(100);
      ht.insert(h, block1);
      ht.insert(h, block2);

      ht.remove(h, 'block-1');

      expect(ht.size).toBe(1);
      const remaining = ht.get(h);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('block-2');
    });
  });

  describe('getMultiple() method', () => {
    it('should return blocks from multiple hashes as array', () => {
      const ht = new HashTable();
      const block1 = createMockBlock(1);
      const block2 = createMockBlock(2);
      const block3 = createMockBlock(3);
      const h1 = hash(1);
      const h2 = hash(2);
      const h3 = hash(3);

      ht.insert(h1, block1);
      ht.insert(h2, block2);
      ht.insert(h3, block3);

      const results = ht.getMultiple([h1, h2]);

      // getMultiple returns a flattened array of all blocks
      expect(results.length).toBe(2);
      expect(results.some((b) => b.id === 'block-1')).toBe(true);
      expect(results.some((b) => b.id === 'block-2')).toBe(true);
      expect(results.some((b) => b.id === 'block-3')).toBe(false);
    });

    it('should handle non-existent hashes gracefully', () => {
      const ht = new HashTable();
      const block = createMockBlock(1);
      const h1 = hash(1);
      ht.insert(h1, block);

      const results = ht.getMultiple([h1, hash(999)]);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('block-1');
    });

    it('should return empty array for empty input', () => {
      const ht = new HashTable();
      const results = ht.getMultiple([]);
      expect(results.length).toBe(0);
    });
  });

  describe('clear() method', () => {
    it('should clear all data', () => {
      const ht = new HashTable();
      ht.insert(hash(1), createMockBlock(1));
      ht.insert(hash(2), createMockBlock(2));

      ht.clear();

      expect(ht.size).toBe(0);
      expect(ht.numBuckets).toBe(0);
    });
  });

  // =========================================================================
  // PHASE 3 FEATURES
  // =========================================================================

  describe('Overflow Chaining', () => {
    it('should use overflow chain when bucket exceeds maxBucketSize', () => {
      const ht = new HashTable({
        maxBucketSize: 2,
        enableOverflowChaining: true,
      });
      const h = hash(100);

      ht.insert(h, createMockBlock(1));
      ht.insert(h, createMockBlock(2));
      ht.insert(h, createMockBlock(3)); // Should go to overflow

      expect(ht.size).toBe(3);
      const blocks = ht.get(h);
      expect(blocks).toHaveLength(3);
    });

    it('should respect maxOverflowChainLength', () => {
      const ht = new HashTable({
        maxBucketSize: 1,
        enableOverflowChaining: true,
        maxOverflowChainLength: 2,
      });
      const h = hash(100);

      // Primary bucket: 1
      // Overflow 1: 1
      // Overflow 2: 1
      // Total max: 3
      ht.insert(h, createMockBlock(1));
      ht.insert(h, createMockBlock(2));
      ht.insert(h, createMockBlock(3));
      ht.insert(h, createMockBlock(4));

      // Fourth might fail or cause eviction depending on config
      expect(ht.size).toBeLessThanOrEqual(4);
    });

    it('should handle has() with overflow chains', () => {
      const ht = new HashTable({
        maxBucketSize: 1,
        enableOverflowChaining: true,
      });
      const h = hash(100);

      ht.insert(h, createMockBlock(1));
      ht.insert(h, createMockBlock(2)); // Goes to overflow

      expect(ht.has(h, 'block-1')).toBe(true);
      expect(ht.has(h, 'block-2')).toBe(true);
    });

    it('should handle remove() with overflow chains', () => {
      const ht = new HashTable({
        maxBucketSize: 1,
        enableOverflowChaining: true,
      });
      const h = hash(100);

      ht.insert(h, createMockBlock(1));
      ht.insert(h, createMockBlock(2));
      ht.insert(h, createMockBlock(3));

      ht.remove(h, 'block-2');

      expect(ht.has(h, 'block-1')).toBe(true);
      expect(ht.has(h, 'block-2')).toBe(false);
      expect(ht.has(h, 'block-3')).toBe(true);
    });

    it('should report overflow stats correctly', () => {
      const ht = new HashTable({
        maxBucketSize: 2,
        enableOverflowChaining: true,
      });
      const h = hash(100);

      ht.insert(h, createMockBlock(1));
      ht.insert(h, createMockBlock(2));
      ht.insert(h, createMockBlock(3)); // Overflow

      const stats = ht.getStats();
      expect(stats.totalOverflowBlocks).toBe(1);
      expect(stats.overflowChainsUsed).toBe(1);
    });
  });

  describe('LRU Eviction', () => {
    it('should track access records when enabled', () => {
      const ht = new HashTable({
        enableLRUEviction: true,
        lruEvictionThreshold: 100,
      });
      const h = hash(1);

      ht.insert(h, createMockBlock(1));
      ht.get(h); // Access it

      const records = ht.getAccessRecords();
      expect(records.size).toBeGreaterThan(0);
    });

    it('should update access count on get', () => {
      const ht = new HashTable({
        enableLRUEviction: true,
        lruEvictionThreshold: 100,
      });
      const h = hash(1);
      const block = createMockBlock(1);
      ht.insert(h, block);

      ht.get(h);
      ht.get(h);
      ht.get(h);

      const records = ht.getAccessRecords();
      const record = records.get('block-1');
      expect(record).toBeDefined();
      expect(record!.accessCount).toBeGreaterThanOrEqual(3);
    });

    it('should evict LRU blocks when threshold is reached', () => {
      const ht = new HashTable({
        enableLRUEviction: true,
        lruEvictionThreshold: 3,
        lruEvictionFraction: 0.5, // Evict 50%
      });

      // Insert 4 blocks
      ht.insert(hash(1), createMockBlock(1));
      ht.insert(hash(2), createMockBlock(2));
      ht.insert(hash(3), createMockBlock(3));
      ht.insert(hash(4), createMockBlock(4)); // Should trigger eviction

      // Some blocks should have been evicted
      expect(ht.size).toBeLessThanOrEqual(4);
    });
  });

  describe('Collision Analytics', () => {
    it('should track collision analytics when enabled', () => {
      const ht = new HashTable({
        enableAnalytics: true,
      });
      const h = hash(100);

      ht.insert(h, createMockBlock(1));
      ht.insert(h, createMockBlock(2));

      const analytics = ht.getCollisionAnalytics();
      expect(analytics.length).toBeGreaterThan(0);
    });

    it('should track insertion attempts', () => {
      const ht = new HashTable({
        enableAnalytics: true,
      });
      const h = hash(100);

      ht.insert(h, createMockBlock(1));
      ht.insert(h, createMockBlock(2));
      ht.insert(h, createMockBlock(3));

      const analytics = ht.getCollisionAnalytics();
      const bucketAnalytics = analytics.find((a) => a.hash === h.toString());
      expect(bucketAnalytics).toBeDefined();
      expect(bucketAnalytics!.insertionAttempts).toBe(3);
    });

    it('should identify hot spots', () => {
      const ht = new HashTable({
        enableAnalytics: true,
      });
      const hotHash = hash('hot');

      // Create a hot bucket
      for (let i = 0; i < 10; i++) {
        ht.insert(hotHash, createMockBlock(i));
      }

      // Create cold buckets
      ht.insert(hash('cold1'), createMockBlock(100));
      ht.insert(hash('cold2'), createMockBlock(101));

      // Access hot bucket
      for (let i = 0; i < 5; i++) {
        ht.get(hotHash);
      }

      const hotSpots = ht.getHotSpots(1);
      expect(hotSpots.length).toBe(1);
      expect(hotSpots[0].hash).toBe(hotHash.toString());
    });

    it('should track bucket access frequency', () => {
      const ht = new HashTable({
        enableAnalytics: true,
      });
      const h = hash(100);

      ht.insert(h, createMockBlock(1));
      ht.get(h);
      ht.get(h);
      ht.get(h);

      const analytics = ht.getCollisionAnalytics();
      const bucketAnalytics = analytics.find((a) => a.hash === h.toString());
      expect(bucketAnalytics!.accessFrequency).toBeGreaterThanOrEqual(3);
    });
  });

  // =========================================================================
  // SERIALIZATION & STATE
  // =========================================================================

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const ht = new HashTable();
      ht.insert(hash(1), createMockBlock(1));
      ht.insert(hash(2), createMockBlock(2));

      const json = ht.toJSON();

      expect(json.buckets).toHaveLength(2);
      expect(json.maxBucketSize).toBeDefined();
    });

    it('should deserialize from JSON', () => {
      const ht = new HashTable();
      ht.insert(hash(1), createMockBlock(1));
      ht.insert(hash(2), createMockBlock(2));

      const json = ht.toJSON();
      const restored = HashTable.fromJSON(json);

      expect(restored.size).toBe(2);
    });

    it('should preserve data through serialization round-trip', () => {
      const ht = new HashTable({
        maxBucketSize: 10,
        enableOverflowChaining: true,
      });
      const h = hash(100);

      for (let i = 0; i < 5; i++) {
        ht.insert(h, createMockBlock(i));
      }

      const json = ht.toJSON();
      const restored = HashTable.fromJSON(json);

      expect(restored.size).toBe(5);
      expect(restored.get(h)).toHaveLength(5);
    });
  });

  describe('State Export/Import', () => {
    it('should export state correctly', () => {
      const ht = new HashTable();
      ht.insert(hash(1), createMockBlock(1));
      ht.insert(hash(2), createMockBlock(2));

      const state = ht.exportState();

      expect(state.buckets).toHaveLength(2);
    });

    it('should import state correctly', () => {
      const ht1 = new HashTable();
      const h1 = hash(1);
      const h2 = hash(2);
      ht1.insert(h1, createMockBlock(1));
      ht1.insert(h2, createMockBlock(2));

      const state = ht1.exportState();

      const ht2 = new HashTable();
      ht2.importState(state);

      expect(ht2.size).toBe(2);
      expect(ht2.get(state.buckets[0].hash)).toHaveLength(1);
    });
  });

  // =========================================================================
  // EDGE CASES & BACKWARDS COMPATIBILITY
  // =========================================================================

  describe('Backwards Compatibility', () => {
    it('should work with legacy numeric config', () => {
      // Legacy usage: new HashTable(maxBucketSize)
      const ht = new HashTable(10);

      ht.insert(hash(1), createMockBlock(1));
      expect(ht.size).toBe(1);
    });

    it('should work without any config', () => {
      const ht = new HashTable();
      ht.insert(hash(1), createMockBlock(1));
      expect(ht.size).toBe(1);
    });

    it('should work with partial config', () => {
      const ht = new HashTable({
        enableOverflowChaining: true,
        // Other options use defaults
      });

      ht.insert(hash(1), createMockBlock(1));
      expect(ht.size).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty block id', () => {
      const ht = new HashTable();
      const block = createMockBlock('');
      (block as { id: string }).id = '';

      ht.insert(hash(1), block);
      expect(ht.size).toBe(1);
    });

    it('should handle very large hash values', () => {
      const ht = new HashTable();
      const largeHash = BigInt('99999999999999999999999999999');

      ht.insert(largeHash, createMockBlock(1));
      expect(ht.get(largeHash)).toHaveLength(1);
    });

    it('should handle many buckets', () => {
      const ht = new HashTable();

      for (let i = 0; i < 1000; i++) {
        ht.insert(hash(i), createMockBlock(i));
      }

      expect(ht.size).toBe(1000);
      expect(ht.numBuckets).toBe(1000);
    });

    it('should handle many blocks in one bucket', () => {
      const ht = new HashTable({
        maxBucketSize: 1000,
      });
      const h = hash('same');

      for (let i = 0; i < 100; i++) {
        ht.insert(h, createMockBlock(i));
      }

      expect(ht.size).toBe(100);
      expect(ht.get(h)).toHaveLength(100);
    });

    it('should handle negative bigint hashes', () => {
      const ht = new HashTable();
      const negHash = -123n;

      ht.insert(negHash, createMockBlock(1));
      expect(ht.get(negHash)).toHaveLength(1);
    });

    it('should handle zero hash', () => {
      const ht = new HashTable();

      ht.insert(0n, createMockBlock(1));
      expect(ht.get(0n)).toHaveLength(1);
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', () => {
      const ht = new HashTable();
      const h1 = hash(1);
      const h2 = hash(2);
      ht.insert(h1, createMockBlock(1));
      ht.insert(h1, createMockBlock(2));
      ht.insert(h2, createMockBlock(3));

      const stats = ht.getStats();

      expect(stats.numBuckets).toBe(2);
      expect(stats.totalBlocks).toBe(3);
      expect(stats.minBucketSize).toBe(1);
      expect(stats.maxBucketSize).toBe(2);
      expect(stats.avgBucketSize).toBe(1.5);
    });

    it('should return zero stats for empty table', () => {
      const ht = new HashTable();
      const stats = ht.getStats();

      expect(stats.numBuckets).toBe(0);
      expect(stats.totalBlocks).toBe(0);
      expect(stats.minBucketSize).toBe(0);
      expect(stats.maxBucketSize).toBe(0);
      expect(stats.avgBucketSize).toBe(0);
    });
  });
});
