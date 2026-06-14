/**
 * @nlci/core - ScanMemory Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanMemory } from '../scan-memory.js';

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('ScanMemory', () => {
  let memory: ScanMemory;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { readFile } = await import('fs/promises');
    (readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    );
    memory = new ScanMemory('.nlci');
    await memory.load();
  });

  describe('initial state', () => {
    it('starts empty when no persisted file exists', () => {
      expect(memory.size).toBe(0);
      expect(memory.getHistory()).toHaveLength(0);
    });
  });

  describe('isChanged()', () => {
    it('returns true for unknown files', () => {
      expect(memory.isChanged('src/foo.ts', 'abc123')).toBe(true);
    });

    it('returns false after recording the same hash', () => {
      memory.record('src/foo.ts', 'abc123', 5);
      expect(memory.isChanged('src/foo.ts', 'abc123')).toBe(false);
    });

    it('returns true when hash differs from recorded', () => {
      memory.record('src/foo.ts', 'abc123', 5);
      expect(memory.isChanged('src/foo.ts', 'def456')).toBe(true);
    });
  });

  describe('record()', () => {
    it('stores filePath, contentHash and blockCount', () => {
      memory.record('src/foo.ts', 'abc123', 5);
      const entry = memory.getEntry('src/foo.ts');
      expect(entry).toBeDefined();
      expect(entry!.filePath).toBe('src/foo.ts');
      expect(entry!.contentHash).toBe('abc123');
      expect(entry!.blockCount).toBe(5);
    });

    it('overwrites existing entry', () => {
      memory.record('src/foo.ts', 'abc123', 5);
      memory.record('src/foo.ts', 'newHash', 8);
      expect(memory.getEntry('src/foo.ts')!.contentHash).toBe('newHash');
      expect(memory.size).toBe(1);
    });

    it('increments size per unique file', () => {
      memory.record('src/a.ts', 'h1', 3);
      memory.record('src/b.ts', 'h2', 7);
      expect(memory.size).toBe(2);
    });
  });

  describe('forget()', () => {
    it('removes an entry', () => {
      memory.record('src/foo.ts', 'abc123', 5);
      memory.forget('src/foo.ts');
      expect(memory.getEntry('src/foo.ts')).toBeUndefined();
    });

    it('makes isChanged return true again', () => {
      memory.record('src/foo.ts', 'abc123', 5);
      memory.forget('src/foo.ts');
      expect(memory.isChanged('src/foo.ts', 'abc123')).toBe(true);
    });

    it('is a no-op for unknown files', () => {
      expect(() => memory.forget('nonexistent.ts')).not.toThrow();
    });
  });

  describe('getHistory()', () => {
    it('returns all recorded entries', () => {
      memory.record('src/a.ts', 'h1', 1);
      memory.record('src/b.ts', 'h2', 2);
      const history = memory.getHistory();
      expect(history).toHaveLength(2);
      expect(history.map((e) => e.filePath)).toContain('src/a.ts');
      expect(history.map((e) => e.filePath)).toContain('src/b.ts');
    });
  });

  describe('clear()', () => {
    it('removes all entries', () => {
      memory.record('src/a.ts', 'h1', 1);
      memory.record('src/b.ts', 'h2', 2);
      memory.clear();
      expect(memory.size).toBe(0);
    });
  });

  describe('save()', () => {
    it('writes entries as JSON to disk', async () => {
      const { writeFile } = await import('fs/promises');
      memory.record('src/foo.ts', 'abc123', 5);
      await memory.save();
      expect(writeFile).toHaveBeenCalledOnce();
      const [, content] = (writeFile as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        string,
        string,
      ];
      const saved = JSON.parse(content) as Array<{ filePath: string }>;
      expect(saved).toHaveLength(1);
      expect(saved[0]!.filePath).toBe('src/foo.ts');
    });
  });

  describe('load() with persisted data', () => {
    it('restores entries from disk', async () => {
      const stored = [
        {
          filePath: 'src/cached.ts',
          contentHash: 'xyz789',
          scannedAt: '2026-06-14T00:00:00.000Z',
          blockCount: 12,
        },
      ];
      const { readFile } = await import('fs/promises');
      (readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify(stored));

      const fresh = new ScanMemory('.nlci');
      await fresh.load();

      expect(fresh.size).toBe(1);
      expect(fresh.isChanged('src/cached.ts', 'xyz789')).toBe(false);
      expect(fresh.isChanged('src/cached.ts', 'different')).toBe(true);
    });
  });
});
