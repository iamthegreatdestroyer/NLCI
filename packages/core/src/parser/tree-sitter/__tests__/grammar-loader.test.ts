/**
 * Tests for GrammarLoader
 *
 * Note: Tests use mocked web-tree-sitter to avoid WASM loading issues
 * in standard Node.js test environments.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultGrammarLoader, GrammarLoader, GrammarLoadError } from '../grammar-loader.js';

// Mock web-tree-sitter with named exports (Parser and Language)
vi.mock('web-tree-sitter', () => {
  // Create mock parser instance
  const createMockParser = () => ({
    parse: vi.fn().mockReturnValue({
      rootNode: {
        type: 'program',
        text: '',
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 0, column: 0 },
        children: [],
        hasError: false,
      },
      delete: vi.fn(),
    }),
    setLanguage: vi.fn(),
    delete: vi.fn(),
  });

  // Parser class mock
  const Parser = vi.fn().mockImplementation(() => createMockParser());
  Parser.init = vi.fn().mockResolvedValue(undefined);

  // Language class mock with static load method
  const Language = {
    load: vi.fn().mockResolvedValue({ name: 'mock-language' }),
  };

  return {
    Parser,
    Language,
  };
});

describe('GrammarLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const loader = new GrammarLoader();
      await expect(loader.initialize()).resolves.not.toThrow();
      loader.clear();
    });

    it('should only initialize once', async () => {
      const loader = new GrammarLoader();
      await loader.initialize();
      await loader.initialize(); // Should not throw
      loader.clear();
    });
  });

  describe('language support', () => {
    let loader: GrammarLoader;

    beforeEach(() => {
      loader = new GrammarLoader();
    });

    afterEach(() => {
      loader.clear();
    });

    it('should support TypeScript', () => {
      expect(loader.isSupported('typescript')).toBe(true);
    });

    it('should support JavaScript', () => {
      expect(loader.isSupported('javascript')).toBe(true);
    });

    it('should support Python', () => {
      expect(loader.isSupported('python')).toBe(true);
    });

    it('should support Java', () => {
      expect(loader.isSupported('java')).toBe(true);
    });

    it('should support Go', () => {
      expect(loader.isSupported('go')).toBe(true);
    });

    it('should support Rust', () => {
      expect(loader.isSupported('rust')).toBe(true);
    });

    it('should support C', () => {
      expect(loader.isSupported('c')).toBe(true);
    });

    it('should support C++', () => {
      expect(loader.isSupported('cpp')).toBe(true);
    });

    it('should support C#', () => {
      expect(loader.isSupported('csharp')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(loader.isSupported('cobol' as any)).toBe(false);
    });

    it('should list all supported languages', () => {
      const languages = loader.supportedLanguages;
      expect(languages).toContain('typescript');
      expect(languages).toContain('javascript');
      expect(languages).toContain('python');
      expect(languages.length).toBeGreaterThan(5);
    });
  });

  describe('parser loading', () => {
    let loader: GrammarLoader;

    beforeEach(async () => {
      loader = new GrammarLoader();
      await loader.initialize();
    });

    afterEach(() => {
      loader.clear();
    });

    it('should load TypeScript parser', async () => {
      const parser = await loader.getParser('typescript');
      expect(parser).toBeDefined();
      expect(typeof parser.parse).toBe('function');
    });

    it('should load JavaScript parser', async () => {
      const parser = await loader.getParser('javascript');
      expect(parser).toBeDefined();
      expect(typeof parser.parse).toBe('function');
    });

    it('should load Python parser', async () => {
      const parser = await loader.getParser('python');
      expect(parser).toBeDefined();
      expect(typeof parser.parse).toBe('function');
    });

    it('should cache parsers', async () => {
      const parser1 = await loader.getParser('typescript');
      const parser2 = await loader.getParser('typescript');
      expect(parser1).toBe(parser2);
    });

    it('should throw for unsupported language', async () => {
      await expect(loader.getParser('cobol' as any)).rejects.toThrow(GrammarLoadError);
    });
  });

  describe('preloading', () => {
    it('should preload multiple languages', async () => {
      const loader = new GrammarLoader();
      await loader.initialize();

      await expect(loader.preload(['typescript', 'javascript', 'python'])).resolves.not.toThrow();

      // All should be cached now
      const tsParser = await loader.getParser('typescript');
      const jsParser = await loader.getParser('javascript');
      const pyParser = await loader.getParser('python');

      expect(tsParser).toBeDefined();
      expect(jsParser).toBeDefined();
      expect(pyParser).toBeDefined();

      loader.clear();
    });

    it('should handle preloading unsupported languages gracefully', async () => {
      const loader = new GrammarLoader();
      await loader.initialize();

      // Should not throw, just skip unsupported
      await expect(loader.preload(['typescript', 'cobol' as any])).resolves.not.toThrow();

      loader.clear();
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const loader = new GrammarLoader();
      await loader.initialize();

      await loader.getParser('typescript');
      loader.clear();

      // After clear, parser should be loaded again
      // This is hard to test directly, but at least verify clear doesn't throw
      expect(() => loader.clear()).not.toThrow();
    });
  });

  describe('defaultGrammarLoader', () => {
    it('should be a shared instance', () => {
      expect(defaultGrammarLoader).toBeInstanceOf(GrammarLoader);
    });

    it('should support TypeScript', () => {
      expect(defaultGrammarLoader.isSupported('typescript')).toBe(true);
    });
  });

  describe('file extension mapping', () => {
    let loader: GrammarLoader;

    beforeEach(() => {
      loader = new GrammarLoader();
    });

    it('should map .ts to typescript', () => {
      expect(loader.getLanguageForExtension('.ts')).toBe('typescript');
    });

    it('should map .tsx to typescript', () => {
      expect(loader.getLanguageForExtension('.tsx')).toBe('typescript');
    });

    it('should map .js to javascript', () => {
      expect(loader.getLanguageForExtension('.js')).toBe('javascript');
    });

    it('should map .jsx to javascript', () => {
      expect(loader.getLanguageForExtension('.jsx')).toBe('javascript');
    });

    it('should map .py to python', () => {
      expect(loader.getLanguageForExtension('.py')).toBe('python');
    });

    it('should map .java to java', () => {
      expect(loader.getLanguageForExtension('.java')).toBe('java');
    });

    it('should map .go to go', () => {
      expect(loader.getLanguageForExtension('.go')).toBe('go');
    });

    it('should map .rs to rust', () => {
      expect(loader.getLanguageForExtension('.rs')).toBe('rust');
    });

    it('should map .c to c', () => {
      expect(loader.getLanguageForExtension('.c')).toBe('c');
    });

    it('should map .cpp to cpp', () => {
      expect(loader.getLanguageForExtension('.cpp')).toBe('cpp');
    });

    it('should return undefined for unknown extension', () => {
      expect(loader.getLanguageForExtension('.xyz')).toBeUndefined();
    });
  });
});

describe('GrammarLoadError', () => {
  it('should be an instance of Error', () => {
    // GrammarLoadError constructor is (language, message, cause?)
    const error = new GrammarLoadError('typescript', 'test message');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(GrammarLoadError);
  });

  it('should have correct name', () => {
    const error = new GrammarLoadError('typescript', 'test message');
    expect(error.name).toBe('GrammarLoadError');
  });

  it('should have formatted message', () => {
    const error = new GrammarLoadError('typescript', 'test message');
    expect(error.message).toBe('Failed to load grammar for typescript: test message');
  });

  it('should have language property', () => {
    const error = new GrammarLoadError('typescript', 'test message');
    expect(error.language).toBe('typescript');
  });

  it('should support cause parameter', () => {
    const cause = new Error('Original error');
    const error = new GrammarLoadError('typescript', 'test message', cause);
    expect(error.cause).toBe(cause);
  });
});
