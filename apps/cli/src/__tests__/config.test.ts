/**
 * Tests for @nlci/cli config module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../config.js';

describe('config', () => {
  describe('loadConfig', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return default config when no config file exists', async () => {
      const config = await loadConfig('/nonexistent/path');

      expect(config).toBeDefined();
      expect(config.lsh).toBeDefined();
      expect(config.embedding).toBeDefined();
      expect(config.parser).toBeDefined();
    });

    it('should have correct LSH defaults', async () => {
      const config = await loadConfig('/nonexistent/path');

      expect(config.lsh?.numTables).toBe(20);
      expect(config.lsh?.numBits).toBe(12);
      expect(config.lsh?.dimension).toBe(384);
    });

    it('should have correct embedding defaults', async () => {
      const config = await loadConfig('/nonexistent/path');

      expect(config.embedding?.dimension).toBe(384);
      expect(config.embedding?.modelPath).toBeDefined();
      expect(config.embedding?.maxSequenceLength).toBe(512);
    });

    it('should have parser includePatterns for common languages', async () => {
      const config = await loadConfig('/nonexistent/path');
      const patterns = config.parser?.includePatterns;

      expect(patterns).toBeDefined();
      expect(patterns).toContain('**/*.ts');
      expect(patterns).toContain('**/*.tsx');
      expect(patterns).toContain('**/*.js');
      expect(patterns).toContain('**/*.py');
    });

    it('should have excludePatterns for node_modules', async () => {
      const config = await loadConfig('/nonexistent/path');
      const exclude = config.parser?.excludePatterns;

      expect(exclude).toBeDefined();
      expect(exclude).toContain('**/node_modules/**');
    });

    it('should have multiProbe config in LSH', async () => {
      const config = await loadConfig('/nonexistent/path');

      expect(config.lsh?.multiProbe).toBeDefined();
      expect(config.lsh?.multiProbe?.enabled).toBe(true);
      expect(config.lsh?.multiProbe?.numProbes).toBe(3);
    });

    it('should return config from current directory when searching', async () => {
      // When searching from cwd, should return default if no config found
      const config = await loadConfig(process.cwd());

      expect(config).toBeDefined();
      expect(config.lsh).toBeDefined();
    });

    it('should throw error for invalid explicit config path', async () => {
      // When explicit config path is provided but doesn't exist, cosmiconfig throws
      await expect(loadConfig(process.cwd(), '/nonexistent/config.json')).rejects.toThrow();
    });
  });
});
