/**
 * Tests for @nlci/cli path utilities
 */

import { describe, expect, it } from 'vitest';
import {
  getExtension,
  getRelativePath,
  matchesPatterns,
  normalizePath,
  resolveGlobs,
} from '../paths.js';

describe('paths', () => {
  describe('resolveGlobs', () => {
    it('should resolve relative patterns to base path', () => {
      const basePath = '/project';
      const patterns = ['src/**/*.ts', 'lib/**/*.js'];

      const result = resolveGlobs(basePath, patterns);

      expect(result).toHaveLength(2);
      // Normalize for cross-platform
      expect(normalizePath(result[0])).toBe('/project/src/**/*.ts');
      expect(normalizePath(result[1])).toBe('/project/lib/**/*.js');
    });

    it('should leave absolute patterns unchanged', () => {
      const basePath = '/project';
      const patterns = ['/absolute/path/*.ts'];

      const result = resolveGlobs(basePath, patterns);

      expect(result[0]).toBe('/absolute/path/*.ts');
    });

    it('should handle empty patterns array', () => {
      const result = resolveGlobs('/project', []);

      expect(result).toEqual([]);
    });

    it('should handle mixed relative and absolute patterns', () => {
      const basePath = '/project';
      const patterns = ['src/*.ts', '/usr/lib/*.ts'];

      const result = resolveGlobs(basePath, patterns);

      expect(result).toHaveLength(2);
      expect(normalizePath(result[0])).toContain('src/*.ts');
      expect(result[1]).toBe('/usr/lib/*.ts');
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path from base to target', () => {
      const basePath = '/project';
      const targetPath = '/project/src/file.ts';

      const result = getRelativePath(basePath, targetPath);

      expect(normalizePath(result)).toBe('src/file.ts');
    });

    it('should handle parent directory traversal', () => {
      const basePath = '/project/src';
      const targetPath = '/project/lib/util.ts';

      const result = getRelativePath(basePath, targetPath);

      expect(normalizePath(result)).toBe('../lib/util.ts');
    });

    it('should return empty string for same path', () => {
      const samePath = '/project/src';

      const result = getRelativePath(samePath, samePath);

      expect(result).toBe('');
    });
  });

  describe('normalizePath', () => {
    it('should convert backslashes to forward slashes', () => {
      const windowsPath = 'C:\\Users\\dev\\project\\src\\file.ts';

      const result = normalizePath(windowsPath);

      expect(result).toBe('C:/Users/dev/project/src/file.ts');
    });

    it('should leave forward slashes unchanged', () => {
      const unixPath = '/home/dev/project/src/file.ts';

      const result = normalizePath(unixPath);

      expect(result).toBe(unixPath);
    });

    it('should handle empty string', () => {
      expect(normalizePath('')).toBe('');
    });

    it('should handle mixed slashes', () => {
      const mixedPath = 'src\\lib/utils\\index.ts';

      const result = normalizePath(mixedPath);

      expect(result).toBe('src/lib/utils/index.ts');
    });
  });

  describe('getExtension', () => {
    it('should return extension without dot', () => {
      expect(getExtension('file.ts')).toBe('ts');
      expect(getExtension('file.test.ts')).toBe('ts');
      expect(getExtension('path/to/file.js')).toBe('js');
    });

    it('should return empty string for no extension', () => {
      expect(getExtension('Makefile')).toBe('');
      expect(getExtension('README')).toBe('');
    });

    it('should handle hidden files', () => {
      // Node.js path.extname treats .gitignore as having no extension
      expect(getExtension('.gitignore')).toBe('');
      // .eslintrc.json has .json extension
      expect(getExtension('.eslintrc.json')).toBe('json');
    });

    it('should handle paths with dots in directories', () => {
      expect(getExtension('src.old/file.ts')).toBe('ts');
    });
  });

  describe('matchesPatterns', () => {
    it('should match simple glob patterns', () => {
      const patterns = ['*.ts'];

      expect(matchesPatterns('file.ts', patterns)).toBe(true);
      expect(matchesPatterns('file.js', patterns)).toBe(false);
    });

    it('should match directory glob patterns', () => {
      const patterns = ['src/*.ts'];

      expect(matchesPatterns('src/file.ts', patterns)).toBe(true);
      expect(matchesPatterns('lib/file.ts', patterns)).toBe(false);
    });

    it('should match double-star patterns for nested paths', () => {
      const patterns = ['src/**/*.ts'];

      // Double star requires at least one directory level in between
      expect(matchesPatterns('src/deep/file.ts', patterns)).toBe(true);
      expect(matchesPatterns('src/deep/nested/file.ts', patterns)).toBe(true);
      expect(matchesPatterns('lib/file.ts', patterns)).toBe(false);
    });

    it('should return false for empty patterns', () => {
      expect(matchesPatterns('file.ts', [])).toBe(false);
    });

    it('should match any of multiple patterns', () => {
      const patterns = ['*.ts', '*.js', '*.tsx'];

      expect(matchesPatterns('file.ts', patterns)).toBe(true);
      expect(matchesPatterns('file.js', patterns)).toBe(true);
      expect(matchesPatterns('file.tsx', patterns)).toBe(true);
      expect(matchesPatterns('file.py', patterns)).toBe(false);
    });

    it('should normalize Windows paths before matching', () => {
      const patterns = ['src/*.ts'];

      expect(matchesPatterns('src\\file.ts', patterns)).toBe(true);
    });

    it('should match question mark wildcard', () => {
      const patterns = ['file?.ts'];

      expect(matchesPatterns('file1.ts', patterns)).toBe(true);
      expect(matchesPatterns('fileA.ts', patterns)).toBe(true);
      expect(matchesPatterns('file.ts', patterns)).toBe(false);
      expect(matchesPatterns('file12.ts', patterns)).toBe(false);
    });
  });
});
