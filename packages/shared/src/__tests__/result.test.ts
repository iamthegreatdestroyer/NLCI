/**
 * @nlci/shared - Result Type Tests
 */

import { describe, expect, it } from 'vitest';
import {
  err,
  flatMap,
  isErr,
  isOk,
  map,
  mapErr,
  ok,
  tryAsync,
  trySync,
  unwrap,
  unwrapOr,
} from '../result.js';

describe('Result Type', () => {
  describe('ok()', () => {
    it('should create an Ok result', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should work with complex types', () => {
      const result = ok({ name: 'test', values: [1, 2, 3] });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ name: 'test', values: [1, 2, 3] });
    });
  });

  describe('err()', () => {
    it('should create an Err result', () => {
      const result = err(new Error('test error'));
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('test error');
    });

    it('should work with string errors', () => {
      const result = err('something went wrong');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('something went wrong');
    });
  });

  describe('isOk() / isErr()', () => {
    it('should identify Ok results', () => {
      const result = ok('success');
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
    });

    it('should identify Err results', () => {
      const result = err('failure');
      expect(isOk(result)).toBe(false);
      expect(isErr(result)).toBe(true);
    });
  });

  describe('unwrap()', () => {
    it('should return value for Ok', () => {
      const result = ok('value');
      expect(unwrap(result)).toBe('value');
    });

    it('should throw for Err', () => {
      const result = err(new Error('test'));
      expect(() => unwrap(result)).toThrow('test');
    });
  });

  describe('unwrapOr()', () => {
    it('should return value for Ok', () => {
      const result = ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('should return default for Err', () => {
      const result = err('error');
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });

  describe('map()', () => {
    it('should transform Ok value', () => {
      const result = ok(5);
      const mapped = map(result, (x) => x * 2);
      expect(isOk(mapped) && mapped.value).toBe(10);
    });

    it('should pass through Err', () => {
      const result = err('error');
      const mapped = map(result, (x: number) => x * 2);
      expect(isErr(mapped) && mapped.error).toBe('error');
    });
  });

  describe('mapErr()', () => {
    it('should transform Err error', () => {
      const result = err('error');
      const mapped = mapErr(result, (e) => `wrapped: ${e}`);
      expect(isErr(mapped) && mapped.error).toBe('wrapped: error');
    });

    it('should pass through Ok', () => {
      const result = ok(42);
      const mapped = mapErr(result, (e) => `wrapped: ${e}`);
      expect(isOk(mapped) && mapped.value).toBe(42);
    });
  });

  describe('flatMap()', () => {
    it('should chain Ok results', () => {
      const result = ok(5);
      const chained = flatMap(result, (x) => ok(x * 2));
      expect(isOk(chained) && chained.value).toBe(10);
    });

    it('should short-circuit on Err', () => {
      const result = err('first error');
      const chained = flatMap(result, () => ok(42));
      expect(isErr(chained) && chained.error).toBe('first error');
    });

    it('should propagate Err from function', () => {
      const result = ok(5);
      const chained = flatMap(result, () => err('function error'));
      expect(isErr(chained) && chained.error).toBe('function error');
    });
  });

  describe('trySync()', () => {
    it('should wrap successful sync function', () => {
      const result = trySync(() => 42);
      expect(isOk(result)).toBe(true);
      expect(isOk(result) && result.value).toBe(42);
    });

    it('should catch sync errors', () => {
      const result = trySync(() => {
        throw new Error('sync error');
      });
      expect(isErr(result)).toBe(true);
      expect(isErr(result) && result.error).toBeInstanceOf(Error);
    });
  });

  describe('tryAsync()', () => {
    it('should wrap successful async function', async () => {
      const result = await tryAsync(async () => 42);
      expect(isOk(result)).toBe(true);
      expect(isOk(result) && result.value).toBe(42);
    });

    it('should catch async errors', async () => {
      const result = await tryAsync(async () => {
        throw new Error('async error');
      });
      expect(isErr(result)).toBe(true);
      expect(isErr(result) && result.error).toBeInstanceOf(Error);
    });
  });
});
