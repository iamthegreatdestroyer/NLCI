/**
 * @nlci/core - Tree-sitter Parser
 *
 * AST-aware code parser using tree-sitter WASM grammars.
 * Provides accurate block extraction with proper syntax understanding.
 */

import type { CodeParser, ParseError, ParseResult } from '../../engine/indexer.js';
import type { SupportedLanguage } from '../../types/code-block.js';
import { createCodeBlock } from '../../types/code-block.js';
import type { GrammarLoader } from './grammar-loader.js';
import { defaultGrammarLoader, GrammarLoadError } from './grammar-loader.js';
import { NodeExtractor } from './node-extractor.js';

/**
 * Options for the tree-sitter parser.
 */
export interface TreeSitterParserOptions {
  /** Grammar loader to use (default: shared instance) */
  grammarLoader?: GrammarLoader;

  /** Minimum block length to include (default: 20) */
  minBlockLength?: number;

  /** Whether to extract nested blocks (default: false) */
  extractNested?: boolean;

  /** Custom extraction rules per language */
  customRules?: Map<SupportedLanguage, import('./node-extractor.js').ExtractionRule[]>;

  /** Timeout for parsing in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * File extension to language mapping.
 */
const EXTENSION_TO_LANGUAGE: ReadonlyMap<string, SupportedLanguage> = new Map([
  ['.ts', 'typescript'],
  ['.tsx', 'typescript'],
  ['.mts', 'typescript'],
  ['.cts', 'typescript'],
  ['.js', 'javascript'],
  ['.jsx', 'javascript'],
  ['.mjs', 'javascript'],
  ['.cjs', 'javascript'],
  ['.py', 'python'],
  ['.pyw', 'python'],
  ['.pyi', 'python'],
  ['.java', 'java'],
  ['.go', 'go'],
  ['.rs', 'rust'],
  ['.c', 'c'],
  ['.h', 'c'],
  ['.cpp', 'cpp'],
  ['.hpp', 'cpp'],
  ['.cc', 'cpp'],
  ['.hh', 'cpp'],
  ['.cxx', 'cpp'],
  ['.hxx', 'cpp'],
  ['.cs', 'csharp'],
  ['.rb', 'ruby'],
  ['.rake', 'ruby'],
  ['.php', 'php'],
  ['.swift', 'swift'],
  ['.kt', 'kotlin'],
  ['.kts', 'kotlin'],
  ['.scala', 'scala'],
  ['.sc', 'scala'],
]);

/**
 * Gets the language for a file path.
 *
 * @param filePath - Path to the file
 * @returns Language identifier or undefined
 */
function getLanguageForFile(filePath: string): SupportedLanguage | undefined {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return EXTENSION_TO_LANGUAGE.get(ext);
}

/**
 * AST-aware code parser using tree-sitter.
 *
 * Uses WASM-based tree-sitter grammars to parse source code into
 * an Abstract Syntax Tree, then extracts meaningful code blocks
 * like functions, classes, methods, etc.
 *
 * Benefits over regex-based parsing:
 * - Accurate block boundaries (respects syntax)
 * - Handles nested structures correctly
 * - Language-aware extraction rules
 * - Better handling of edge cases (comments, strings, etc.)
 *
 * @example
 * ```typescript
 * const parser = new TreeSitterParser();
 *
 * // Parse TypeScript code
 * const result = await parser.parseAsync(sourceCode, 'path/to/file.ts');
 *
 * console.log(result.blocks); // Extracted functions, classes, etc.
 * ```
 */
export class TreeSitterParser implements CodeParser {
  private readonly loader: GrammarLoader;
  private readonly options: Required<
    Omit<TreeSitterParserOptions, 'grammarLoader' | 'customRules'>
  >;
  private readonly customRules?: Map<
    SupportedLanguage,
    import('./node-extractor.js').ExtractionRule[]
  >;
  private readonly extractorCache = new Map<SupportedLanguage, NodeExtractor>();
  private initialized = false;

  readonly supportedLanguages: readonly SupportedLanguage[] = [
    'typescript',
    'javascript',
    'python',
    'java',
    'go',
    'rust',
    'c',
    'cpp',
    'csharp',
    'ruby',
    'php',
    'swift',
    'kotlin',
    'scala',
  ];

  /**
   * Creates a new tree-sitter parser.
   *
   * @param options - Parser options
   */
  constructor(options: TreeSitterParserOptions = {}) {
    this.loader = options.grammarLoader ?? defaultGrammarLoader;
    this.customRules = options.customRules;
    this.options = {
      minBlockLength: options.minBlockLength ?? 20,
      extractNested: options.extractNested ?? false,
      timeout: options.timeout ?? 5000,
    };
  }

  /**
   * Initializes the parser (loads tree-sitter WASM runtime).
   * Called automatically on first parse.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loader.initialize();
    this.initialized = true;
  }

  /**
   * Parses source code synchronously.
   *
   * Note: This is a wrapper that runs the async parser.
   * For better performance, use parseAsync directly.
   *
   * @param source - Source code to parse
   * @param filePath - Path to the file
   * @param language - Optional language override
   * @returns Parse result with blocks and errors
   */
  parse(source: string, filePath: string, language?: SupportedLanguage): ParseResult {
    // For synchronous API compatibility, we return a pending result
    // The actual parsing happens asynchronously
    const lang = language ?? getLanguageForFile(filePath) ?? 'unknown';

    // If language is not supported, return empty result
    if (!this.supportedLanguages.includes(lang as SupportedLanguage)) {
      return {
        blocks: [],
        errors: [{ message: `Language '${lang}' not supported by tree-sitter parser` }],
        duration: 0,
      };
    }

    // Return a placeholder - async parsing should be preferred
    return {
      blocks: [],
      errors: [{ message: 'Use parseAsync for tree-sitter parsing' }],
      duration: 0,
    };
  }

  /**
   * Parses source code asynchronously using tree-sitter.
   *
   * @param source - Source code to parse
   * @param filePath - Path to the file
   * @param language - Optional language override
   * @returns Parse result with blocks and errors
   */
  async parseAsync(
    source: string,
    filePath: string,
    language?: SupportedLanguage
  ): Promise<ParseResult> {
    const start = performance.now();
    const errors: ParseError[] = [];

    // Determine language
    const lang = language ?? getLanguageForFile(filePath);
    if (!lang || lang === 'unknown') {
      return {
        blocks: [],
        errors: [{ message: `Cannot determine language for ${filePath}` }],
        duration: performance.now() - start,
      };
    }

    // Check if language is supported
    if (!this.loader.isSupported(lang)) {
      return {
        blocks: [],
        errors: [{ message: `Language '${lang}' not supported` }],
        duration: performance.now() - start,
      };
    }

    try {
      // Initialize if needed
      await this.initialize();

      // Get parser for language
      const parser = await this.loader.getParser(lang);

      // Parse source code
      const tree = parser.parse(source);

      // Handle parse failure
      if (!tree) {
        errors.push({ message: 'Failed to parse source code' });
        return { blocks: [], errors, duration: performance.now() - start };
      }

      // Check for parse errors (hasError is a getter, not a method)
      if (tree.rootNode.hasError) {
        errors.push({ message: 'Source contains syntax errors' });
      }

      // Get or create extractor for language
      const extractor = this.getExtractor(lang);

      // Extract code blocks
      const extractedNodes = extractor.extract(tree.rootNode, source);

      // Convert to CodeBlock format
      const blocks = extractedNodes
        .filter((node) => node.content.trim().length >= this.options.minBlockLength)
        .map((node) =>
          createCodeBlock({
            content: node.content,
            filePath,
            language: lang,
            blockType: node.type,
            name: node.name,
            startLine: node.startLine,
            endLine: node.endLine,
            startColumn: node.startColumn,
            endColumn: node.endColumn,
          })
        );

      // Clean up tree
      tree.delete();

      return {
        blocks,
        errors,
        duration: performance.now() - start,
      };
    } catch (error) {
      if (error instanceof GrammarLoadError) {
        errors.push({
          message: error.message,
        });
      } else {
        errors.push({
          message: error instanceof Error ? error.message : 'Unknown parsing error',
        });
      }

      return {
        blocks: [],
        errors,
        duration: performance.now() - start,
      };
    }
  }

  /**
   * Gets or creates a node extractor for a language.
   */
  private getExtractor(language: SupportedLanguage): NodeExtractor {
    let extractor = this.extractorCache.get(language);
    if (!extractor) {
      const customRules = this.customRules?.get(language);
      extractor = new NodeExtractor(language, customRules);
      this.extractorCache.set(language, extractor);
    }
    return extractor;
  }

  /**
   * Preloads grammars for specified languages.
   *
   * @param languages - Languages to preload
   */
  async preloadLanguages(languages: SupportedLanguage[]): Promise<void> {
    await this.loader.preload(languages);
  }

  /**
   * Clears cached parsers and extractors.
   */
  clearCache(): void {
    this.loader.clear();
    this.extractorCache.clear();
  }
}
