/**
 * @nlci/core - Tree-sitter Grammar Loader
 *
 * Manages loading and caching of tree-sitter WASM grammars.
 * Supports lazy loading to minimize startup time.
 */

import { Language, Parser } from 'web-tree-sitter';
import type { SupportedLanguage } from '../../types/code-block.js';

/**
 * Configuration for a language grammar.
 */
export interface GrammarConfig {
  /** Language identifier */
  language: SupportedLanguage;

  /** URL or path to the WASM grammar file */
  wasmPath: string;

  /** File extensions this grammar handles */
  extensions: readonly string[];

  /** Whether this grammar is loaded */
  loaded: boolean;
}

/**
 * Grammar loading error.
 */
export class GrammarLoadError extends Error {
  constructor(
    public readonly language: SupportedLanguage,
    message: string,
    public readonly cause?: Error
  ) {
    super(`Failed to load grammar for ${language}: ${message}`);
    this.name = 'GrammarLoadError';
  }
}

/**
 * Manages tree-sitter grammar loading and caching.
 *
 * Grammars are loaded lazily on first use and cached for subsequent parses.
 * Supports both bundled WASM files and remote URLs.
 *
 * @example
 * ```typescript
 * const loader = new GrammarLoader();
 * await loader.initialize();
 *
 * const parser = await loader.getParser('typescript');
 * const tree = parser.parse(sourceCode);
 * ```
 */
export class GrammarLoader {
  private initialized = false;
  private parsers = new Map<SupportedLanguage, Parser>();
  private loadingPromises = new Map<SupportedLanguage, Promise<Parser>>();

  /** Base URL for downloading grammar WASM files */
  private readonly baseUrl: string;

  /** Grammar configurations by language */
  private readonly grammars: Map<SupportedLanguage, GrammarConfig>;

  /**
   * Creates a new grammar loader.
   *
   * @param options - Configuration options
   * @param options.baseUrl - Base URL for grammar WASM files (default: jsdelivr CDN)
   */
  constructor(options: { baseUrl?: string } = {}) {
    // Default to jsdelivr CDN for tree-sitter WASM grammars
    this.baseUrl = options.baseUrl ?? 'https://cdn.jsdelivr.net/npm/tree-sitter-wasms@latest/out/';

    this.grammars = new Map([
      [
        'typescript',
        {
          language: 'typescript',
          wasmPath: 'tree-sitter-typescript.wasm',
          extensions: ['.ts', '.tsx', '.mts', '.cts'],
          loaded: false,
        },
      ],
      [
        'javascript',
        {
          language: 'javascript',
          wasmPath: 'tree-sitter-javascript.wasm',
          extensions: ['.js', '.jsx', '.mjs', '.cjs'],
          loaded: false,
        },
      ],
      [
        'python',
        {
          language: 'python',
          wasmPath: 'tree-sitter-python.wasm',
          extensions: ['.py', '.pyw', '.pyi'],
          loaded: false,
        },
      ],
      [
        'java',
        {
          language: 'java',
          wasmPath: 'tree-sitter-java.wasm',
          extensions: ['.java'],
          loaded: false,
        },
      ],
      [
        'go',
        {
          language: 'go',
          wasmPath: 'tree-sitter-go.wasm',
          extensions: ['.go'],
          loaded: false,
        },
      ],
      [
        'rust',
        {
          language: 'rust',
          wasmPath: 'tree-sitter-rust.wasm',
          extensions: ['.rs'],
          loaded: false,
        },
      ],
      [
        'c',
        {
          language: 'c',
          wasmPath: 'tree-sitter-c.wasm',
          extensions: ['.c', '.h'],
          loaded: false,
        },
      ],
      [
        'cpp',
        {
          language: 'cpp',
          wasmPath: 'tree-sitter-cpp.wasm',
          extensions: ['.cpp', '.hpp', '.cc', '.hh', '.cxx', '.hxx'],
          loaded: false,
        },
      ],
      [
        'csharp',
        {
          language: 'csharp',
          wasmPath: 'tree-sitter-c_sharp.wasm',
          extensions: ['.cs'],
          loaded: false,
        },
      ],
      [
        'ruby',
        {
          language: 'ruby',
          wasmPath: 'tree-sitter-ruby.wasm',
          extensions: ['.rb', '.rake', '.gemspec'],
          loaded: false,
        },
      ],
      [
        'php',
        {
          language: 'php',
          wasmPath: 'tree-sitter-php.wasm',
          extensions: ['.php'],
          loaded: false,
        },
      ],
      [
        'swift',
        {
          language: 'swift',
          wasmPath: 'tree-sitter-swift.wasm',
          extensions: ['.swift'],
          loaded: false,
        },
      ],
      [
        'kotlin',
        {
          language: 'kotlin',
          wasmPath: 'tree-sitter-kotlin.wasm',
          extensions: ['.kt', '.kts'],
          loaded: false,
        },
      ],
      [
        'scala',
        {
          language: 'scala',
          wasmPath: 'tree-sitter-scala.wasm',
          extensions: ['.scala', '.sc'],
          loaded: false,
        },
      ],
    ]);
  }

  /**
   * Initializes the tree-sitter WASM runtime.
   * Must be called before using any parsers.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Parser.init();
    this.initialized = true;
  }

  /**
   * Gets the supported languages.
   */
  get supportedLanguages(): SupportedLanguage[] {
    return Array.from(this.grammars.keys());
  }

  /**
   * Checks if a language is supported.
   */
  isSupported(language: SupportedLanguage): boolean {
    return this.grammars.has(language);
  }

  /**
   * Gets the language for a file extension.
   *
   * @param extension - File extension (with or without dot)
   * @returns Language identifier or undefined
   */
  getLanguageForExtension(extension: string): SupportedLanguage | undefined {
    const ext = extension.startsWith('.') ? extension : `.${extension}`;

    for (const config of this.grammars.values()) {
      if (config.extensions.includes(ext)) {
        return config.language;
      }
    }

    return undefined;
  }

  /**
   * Gets a parser for the specified language.
   * Loads the grammar WASM file if not already loaded.
   *
   * @param language - Target language
   * @returns Configured parser
   * @throws {GrammarLoadError} If grammar cannot be loaded
   */
  async getParser(language: SupportedLanguage): Promise<Parser> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Return cached parser
    const cached = this.parsers.get(language);
    if (cached) {
      return cached;
    }

    // Check if already loading
    const loading = this.loadingPromises.get(language);
    if (loading) {
      return loading;
    }

    // Start loading
    const loadPromise = this.loadParser(language);
    this.loadingPromises.set(language, loadPromise);

    try {
      const parser = await loadPromise;
      this.parsers.set(language, parser);
      return parser;
    } finally {
      this.loadingPromises.delete(language);
    }
  }

  /**
   * Preloads grammars for specified languages.
   * Useful for reducing latency on first parse.
   *
   * @param languages - Languages to preload
   */
  async preload(languages: SupportedLanguage[]): Promise<void> {
    await Promise.all(languages.map((lang) => this.getParser(lang).catch(() => null)));
  }

  /**
   * Clears all cached parsers to free memory.
   */
  clear(): void {
    for (const parser of this.parsers.values()) {
      parser.delete();
    }
    this.parsers.clear();
  }

  /**
   * Loads a parser for the specified language.
   */
  private async loadParser(language: SupportedLanguage): Promise<Parser> {
    const config = this.grammars.get(language);
    if (!config) {
      throw new GrammarLoadError(language, 'Language not supported');
    }

    const wasmUrl = this.baseUrl + config.wasmPath;

    try {
      const parser = new Parser();
      const lang = await Language.load(wasmUrl);
      parser.setLanguage(lang);
      config.loaded = true;
      return parser;
    } catch (error) {
      throw new GrammarLoadError(
        language,
        `Failed to load from ${wasmUrl}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}

/** Default grammar loader instance */
export const defaultGrammarLoader = new GrammarLoader();
