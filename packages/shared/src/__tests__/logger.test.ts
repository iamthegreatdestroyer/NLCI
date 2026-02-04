/**
 * @nlci/shared - Logger Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger, createLogger, logger } from '../logger.js';

describe('Logger', () => {
  describe('Logger class', () => {
    let mockOutput: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockOutput = vi.fn();
    });

    it('should create a logger with default config', () => {
      const testLogger = new Logger({ output: mockOutput });
      testLogger.info('test message');
      expect(mockOutput).toHaveBeenCalled();
    });

    it('should respect log levels', () => {
      const testLogger = new Logger({ level: 'error', output: mockOutput });
      testLogger.debug('debug');
      testLogger.info('info');
      testLogger.warn('warn');
      expect(mockOutput).not.toHaveBeenCalled();
      testLogger.error('error');
      expect(mockOutput).toHaveBeenCalledTimes(1);
    });

    it('should include prefix in messages', () => {
      const testLogger = new Logger({ prefix: 'test-prefix', output: mockOutput });
      testLogger.info('hello');
      expect(mockOutput).toHaveBeenCalledWith(expect.stringContaining('test-prefix'));
    });

    it('should change level via setLevel()', () => {
      const testLogger = new Logger({ level: 'error', output: mockOutput });
      testLogger.info('should not appear');
      expect(mockOutput).not.toHaveBeenCalled();

      testLogger.setLevel('info');
      testLogger.info('should appear');
      expect(mockOutput).toHaveBeenCalledTimes(1);
    });

    it('should create child logger with new prefix', () => {
      const parentLogger = new Logger({ prefix: 'parent', output: mockOutput });
      const childLogger = parentLogger.child('child');

      childLogger.info('message');
      expect(mockOutput).toHaveBeenCalledWith(expect.stringContaining('child'));
    });

    it('should log at all levels', () => {
      const testLogger = new Logger({ level: 'debug', output: mockOutput });

      testLogger.debug('debug');
      testLogger.info('info');
      testLogger.warn('warn');
      testLogger.error('error');

      expect(mockOutput).toHaveBeenCalledTimes(4);
    });

    it('should handle silent level', () => {
      const testLogger = new Logger({ level: 'silent', output: mockOutput });
      testLogger.debug('debug');
      testLogger.info('info');
      testLogger.warn('warn');
      testLogger.error('error');
      expect(mockOutput).not.toHaveBeenCalled();
    });
  });

  describe('createLogger()', () => {
    it('should create a logger with custom config', () => {
      const mockOutput = vi.fn();
      const testLogger = createLogger({ prefix: 'custom', output: mockOutput });
      expect(testLogger).toBeInstanceOf(Logger);
      testLogger.info('test');
      expect(mockOutput).toHaveBeenCalledWith(expect.stringContaining('custom'));
    });
  });

  describe('default logger', () => {
    it('should export a default logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });
  });
});
