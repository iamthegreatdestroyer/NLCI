/**
 * @nlci/shared - Utils Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chunk,
  debounce,
  deepClone,
  deepMerge,
  deferred,
  formatBytes,
  formatDuration,
  generateId,
  groupBy,
  hashString,
  hashStringHex,
  throttle,
} from '../utils.js';

describe('Utils', () => {
  describe('generateId()', () => {
    it('should generate a unique id', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should include prefix when provided', () => {
      const id = generateId('test');
      expect(id.startsWith('test-')).toBe(true);
    });

    it('should contain timestamp and random parts', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('hashString()', () => {
    it('should produce consistent hashes', () => {
      const hash1 = hashString('hello');
      const hash2 = hashString('hello');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashString('hello');
      const hash2 = hashString('world');
      expect(hash1).not.toBe(hash2);
    });

    it('should return a positive number', () => {
      const hash = hashString('test');
      expect(hash).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty string', () => {
      const hash = hashString('');
      expect(hash).toBe(0);
    });
  });

  describe('hashStringHex()', () => {
    it('should return hex string', () => {
      const hex = hashStringHex('test');
      expect(hex).toMatch(/^[0-9a-f]+$/);
    });

    it('should be 8 characters', () => {
      const hex = hashStringHex('test');
      expect(hex.length).toBe(8);
    });
  });

  describe('deepClone()', () => {
    it('should clone primitive values', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(null)).toBe(null);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, [3, 4]];
      const cloned = deepClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it('should clone objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should clone Dates', () => {
      const date = new Date('2024-01-01');
      const cloned = deepClone(date);
      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it('should clone Maps', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const cloned = deepClone(map);
      expect(cloned).toEqual(map);
      expect(cloned).not.toBe(map);
    });

    it('should clone Sets', () => {
      const set = new Set([1, 2, 3]);
      const cloned = deepClone(set);
      expect(cloned).toEqual(set);
      expect(cloned).not.toBe(set);
    });
  });

  describe('deepMerge()', () => {
    it('should merge objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should deep merge nested objects', () => {
      const target = { a: { b: 1, c: 2 } };
      const source = { a: { c: 3, d: 4 } };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: { b: 1, c: 3, d: 4 } });
    });

    it('should not mutate original objects', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      deepMerge(target, source);
      expect(target).toEqual({ a: 1 });
    });

    it('should handle multiple sources', () => {
      const result = deepMerge({ a: 1 }, { b: 2 }, { c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('debounce()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to the function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('throttle()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('chunk()', () => {
    it('should split array into chunks', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = chunk(arr, 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle empty array', () => {
      expect(chunk([], 2)).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    });
  });

  describe('groupBy()', () => {
    it('should group by key function', () => {
      const items = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 },
      ];
      const result = groupBy(items, (item) => item.type);
      expect(result).toEqual({
        a: [
          { type: 'a', value: 1 },
          { type: 'a', value: 3 },
        ],
        b: [{ type: 'b', value: 2 }],
      });
    });
  });

  describe('deferred()', () => {
    it('should create a deferred promise', async () => {
      const d = deferred<number>();

      expect(d.promise).toBeInstanceOf(Promise);

      setTimeout(() => d.resolve(42), 10);

      const result = await d.promise;
      expect(result).toBe(42);
    });

    it('should reject when reject is called', async () => {
      const d = deferred<number>();

      setTimeout(() => d.reject(new Error('test')), 10);

      await expect(d.promise).rejects.toThrow('test');
    });
  });

  describe('formatBytes()', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    });

    it('should respect decimal places', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });

  describe('formatDuration()', () => {
    it('should format milliseconds correctly', () => {
      expect(formatDuration(500)).toBe('500.0ms');
      expect(formatDuration(1500)).toBe('1.50s');
      expect(formatDuration(60000)).toBe('1.0min');
      expect(formatDuration(3600000)).toBe('1.0h');
    });
  });
});
