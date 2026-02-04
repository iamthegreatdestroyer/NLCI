/**
 * Tests for @nlci/cli output utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debug, error, heading, hr, info, kv, list, success, warn } from '../output.js';

describe('output', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  describe('success', () => {
    it('should print success message with checkmark', () => {
      success('Operation completed');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0].join(' ');
      expect(output).toContain('Operation completed');
    });
  });

  describe('info', () => {
    it('should print info message', () => {
      info('Some information');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0].join(' ');
      expect(output).toContain('Some information');
    });
  });

  describe('warn', () => {
    it('should print warning message', () => {
      warn('Warning message');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0].join(' ');
      expect(output).toContain('Warning message');
    });
  });

  describe('error', () => {
    it('should print error message', () => {
      error('Error occurred');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0].join(' ');
      expect(output).toContain('Error occurred');
    });
  });

  describe('debug', () => {
    it('should print debug message when DEBUG is set', () => {
      vi.stubEnv('DEBUG', 'true');

      debug('Debug info');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0].join(' ');
      expect(output).toContain('Debug info');
    });

    it('should not print debug message when DEBUG is not set', () => {
      delete process.env.DEBUG;

      debug('Debug info');

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('hr', () => {
    it('should print horizontal rule with default character', () => {
      hr();

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toMatch(/[─]+/);
    });

    it('should print horizontal rule with custom character', () => {
      hr('=', 10);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('==========');
    });

    it('should respect custom length', () => {
      hr('-', 5);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('-----');
    });
  });

  describe('heading', () => {
    it('should print heading with blank line and horizontal rule', () => {
      heading('My Heading');

      // heading prints blank line, heading text, then hr
      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('kv', () => {
    it('should print key-value pair', () => {
      kv('Name', 'Test Value');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('Name');
      expect(output).toContain('Test Value');
    });

    it('should print key-value pair with number value', () => {
      kv('Count', 42);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('Count');
      expect(output).toContain('42');
    });

    it('should respect custom indent', () => {
      kv('Key', 'Value', 4);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0];
      expect(output.startsWith('    ')).toBe(true);
    });
  });

  describe('list', () => {
    it('should print list of items with bullets', () => {
      list(['Item 1', 'Item 2', 'Item 3']);

      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });

    it('should print empty list without errors', () => {
      list([]);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should use custom bullet character', () => {
      list(['Item'], '-');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('-');
    });

    it('should respect custom indent', () => {
      list(['Item'], '•', 4);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0];
      expect(output.startsWith('    ')).toBe(true);
    });
  });
});
