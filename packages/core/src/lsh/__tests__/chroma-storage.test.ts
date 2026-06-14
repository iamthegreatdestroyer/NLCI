/**
 * @nlci/core - ChromaStorage Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChromaStorage } from '../chroma-storage.js';

const mockUpsert = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockGetOrCreate = vi.fn();

vi.mock('chromadb', () => ({
  ChromaClient: vi.fn(() => ({
    getOrCreateCollection: mockGetOrCreate,
  })),
}));

describe('ChromaStorage', () => {
  let storage: ChromaStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrCreate.mockResolvedValue({
      upsert: mockUpsert,
      get: mockGet,
      delete: mockDelete,
    });
    mockUpsert.mockResolvedValue(undefined);
    mockGet.mockResolvedValue({ ids: [], documents: [] });
    mockDelete.mockResolvedValue(undefined);

    storage = new ChromaStorage({ url: 'http://localhost:8000', collectionName: 'test' });
  });

  describe('save()', () => {
    it('upserts document to collection', async () => {
      await storage.save('bucket-store', '{"version":1}');
      expect(mockUpsert).toHaveBeenCalledWith({
        ids: ['bucket-store'],
        documents: ['{"version":1}'],
      });
    });

    it('calls getOrCreateCollection once and reuses it', async () => {
      await storage.save('key1', 'val1');
      await storage.save('key2', 'val2');
      expect(mockGetOrCreate).toHaveBeenCalledOnce();
    });
  });

  describe('load()', () => {
    it('returns document string for existing key', async () => {
      mockGet.mockResolvedValueOnce({ ids: ['key1'], documents: ['{"data":true}'] });
      const result = await storage.load('key1');
      expect(result).toBe('{"data":true}');
    });

    it('returns null for missing key', async () => {
      mockGet.mockResolvedValueOnce({ ids: [], documents: [null] });
      const result = await storage.load('missing');
      expect(result).toBeNull();
    });

    it('returns null when document is null', async () => {
      mockGet.mockResolvedValueOnce({ ids: ['key1'], documents: [null] });
      const result = await storage.load('key1');
      expect(result).toBeNull();
    });
  });

  describe('delete()', () => {
    it('deletes document from collection', async () => {
      await storage.delete('key1');
      expect(mockDelete).toHaveBeenCalledWith({ ids: ['key1'] });
    });
  });

  describe('list()', () => {
    it('returns all document IDs', async () => {
      mockGet.mockResolvedValueOnce({ ids: ['a', 'b', 'c'], documents: [] });
      const result = await storage.list();
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('returns empty array when collection is empty', async () => {
      mockGet.mockResolvedValueOnce({ ids: [], documents: [] });
      const result = await storage.list();
      expect(result).toEqual([]);
    });
  });

  describe('exists()', () => {
    it('returns true when key exists', async () => {
      mockGet.mockResolvedValueOnce({ ids: ['key1'], documents: ['data'] });
      expect(await storage.exists('key1')).toBe(true);
    });

    it('returns false when key does not exist', async () => {
      mockGet.mockResolvedValueOnce({ ids: [], documents: [] });
      expect(await storage.exists('missing')).toBe(false);
    });
  });
});
