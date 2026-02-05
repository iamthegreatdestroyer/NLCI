/**
 * @nlci/core - Indexer
 *
 * Handles parsing source files and extracting code blocks for indexing.
 * Integrates with embedding models to generate vector representations.
 */

import {
  type CodeBlock,
  type CodeBlockType,
  type SupportedLanguage,
  createCodeBlock,
} from '../types/code-block.js';

/**
 * Result of parsing a source file.
 */
export interface ParseResult {
  /** Extracted code blocks */
  blocks: CodeBlock[];

  /** Parsing errors, if any */
  errors: ParseError[];

  /** Parsing duration in milliseconds */
  duration: number;
}

/**
 * A parsing error.
 */
export interface ParseError {
  /** Error message */
  message: string;

  /** Line number where error occurred */
  line?: number;

  /** Column number where error occurred */
  column?: number;
}

/**
 * Interface for code parsers.
 */
export interface CodeParser {
  /** Parse source code into blocks (language inferred from filePath if not provided) */
  parse(source: string, filePath: string, language?: SupportedLanguage): ParseResult;

  /** Supported languages */
  readonly supportedLanguages: readonly SupportedLanguage[];
}

/**
 * Interface for embedding models.
 */
export interface EmbeddingModel {
  /** Generate embedding for code text */
  embed(code: string): Promise<Float32Array>;

  /** Generate embeddings for multiple code texts (batch) */
  embedBatch(codes: string[]): Promise<Float32Array[]>;

  /** Embedding dimension */
  readonly dimension: number;
}

/**
 * Simple regex-based code parser for basic block extraction.
 * For production, use Tree-sitter based parser.
 */
export class SimpleCodeParser implements CodeParser {
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
  ];

  /**
   * Parses source code into code blocks.
   * Uses regex patterns to identify functions, classes, etc.
   */
  parse(source: string, filePath: string, language?: SupportedLanguage): ParseResult {
    const start = performance.now();
    const blocks: CodeBlock[] = [];
    const errors: ParseError[] = [];

    // Infer language from file extension if not provided
    const lang = language ?? getLanguageForFile(filePath) ?? 'typescript';

    try {
      // Split by common block patterns
      const patterns = this.getPatternsForLanguage(lang);
      const lines = source.split('\n');

      // Track brace/bracket depth for block detection
      let currentBlock: {
        type: CodeBlockType;
        name: string;
        startLine: number;
        content: string[];
        depth: number;
        initialDepth: number;
      } | null = null;

      // For Python, track indentation-based blocks
      let pythonBaseIndent = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmedLine = line.trim();

        // Check for block start patterns (only when not in a block)
        if (!currentBlock) {
          for (const pattern of patterns) {
            const match = line.match(pattern.regex);
            if (match) {
              const initialDepth = this.countBraces(line, lang);

              // Handle single-line blocks (e.g., `function foo() { return 1; }`)
              if (
                lang !== 'python' &&
                initialDepth <= 0 &&
                line.includes('{') &&
                line.includes('}')
              ) {
                // This is a complete single-line block
                if (line.trim().length >= 20) {
                  blocks.push(
                    createCodeBlock({
                      content: line,
                      filePath,
                      language: lang,
                      type: pattern.type,
                      name: match[1] || `anonymous_${lineNum}`,
                      startLine: lineNum,
                      endLine: lineNum,
                    })
                  );
                }
                break; // Don't start tracking, block is complete
              }

              currentBlock = {
                type: pattern.type,
                name: match[1] || `anonymous_${lineNum}`,
                startLine: lineNum,
                content: [line],
                depth: initialDepth,
                initialDepth: initialDepth,
              };

              // For Python, track the base indentation
              if (lang === 'python') {
                pythonBaseIndent = line.search(/\S/);
                if (pythonBaseIndent < 0) pythonBaseIndent = 0;
              }
              break;
            }
          }
          continue; // Move to next line after starting a block
        }

        // We're inside a block, process line
        if (lang === 'python') {
          // Python: end block when we return to base indentation or less
          const currentIndent = line.search(/\S/);
          if (trimmedLine.length > 0 && currentIndent >= 0 && currentIndent <= pythonBaseIndent) {
            // End of Python block (don't include this line)
            const content = currentBlock.content.join('\n');
            if (content.trim().length >= 20) {
              blocks.push(
                createCodeBlock({
                  content,
                  filePath,
                  language: lang,
                  type: currentBlock.type,
                  name: currentBlock.name,
                  startLine: currentBlock.startLine,
                  endLine: lineNum - 1,
                })
              );
            }
            currentBlock = null;
            pythonBaseIndent = -1;
            // Re-check this line for a new block start
            i--;
            continue;
          }
          // Still in block, add line
          currentBlock.content.push(line);
        } else {
          // Brace-based languages
          currentBlock.content.push(line);
          currentBlock.depth += this.countBraces(line, lang);

          // Check if block is complete (depth returns to 0 or below)
          if (currentBlock.depth <= 0 && currentBlock.content.length > 1) {
            const content = currentBlock.content.join('\n');

            // Only index blocks with meaningful content
            if (content.trim().length >= 20) {
              blocks.push(
                createCodeBlock({
                  content,
                  filePath,
                  language: lang,
                  type: currentBlock.type,
                  name: currentBlock.name,
                  startLine: currentBlock.startLine,
                  endLine: lineNum,
                })
              );
            }

            currentBlock = null;
          }
        }
      }

      // Handle unclosed block at end of file
      if (currentBlock && currentBlock.content.length > 1) {
        const content = currentBlock.content.join('\n');
        if (content.trim().length >= 20) {
          blocks.push(
            createCodeBlock({
              content,
              filePath,
              language: lang,
              type: currentBlock.type,
              name: currentBlock.name,
              startLine: currentBlock.startLine,
              endLine: lines.length,
            })
          );
        }
      }
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return {
      blocks,
      errors,
      duration: performance.now() - start,
    };
  }

  private getPatternsForLanguage(
    language: SupportedLanguage
  ): Array<{ regex: RegExp; type: CodeBlockType }> {
    const common = [
      {
        regex: /^\s*(?:export\s+)?(?:export\s+default\s+)?(?:async\s+)?function\s+(\w+)/,
        type: 'function' as const,
      },
      { regex: /^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/, type: 'class' as const },
    ];

    switch (language) {
      case 'typescript':
      case 'javascript':
        return [
          ...common,
          {
            regex: /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/,
            type: 'function' as const,
          },
          {
            regex: /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/,
            type: 'function' as const,
          },
          { regex: /^\s*(\w+)\s*[=:]\s*(?:async\s+)?\([^)]*\)\s*=>/, type: 'function' as const },
          {
            regex: /^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\(/,
            type: 'method' as const,
          },
          { regex: /^\s*interface\s+(\w+)/, type: 'interface' as const },
          { regex: /^\s*type\s+(\w+)/, type: 'type' as const },
        ];

      case 'python':
        return [
          { regex: /^\s*def\s+(\w+)/, type: 'function' as const },
          { regex: /^\s*async\s+def\s+(\w+)/, type: 'function' as const },
          { regex: /^\s*class\s+(\w+)/, type: 'class' as const },
        ];

      case 'java':
      case 'csharp':
        return [
          ...common,
          {
            regex: /^\s*(?:public|private|protected)\s+(?:static\s+)?(?:\w+\s+)?(\w+)\s*\(/,
            type: 'method' as const,
          },
          { regex: /^\s*interface\s+(\w+)/, type: 'interface' as const },
        ];

      case 'go':
        return [
          { regex: /^\s*func\s+(?:\([^)]+\)\s+)?(\w+)/, type: 'function' as const },
          { regex: /^\s*type\s+(\w+)\s+struct/, type: 'struct' as const },
          { regex: /^\s*type\s+(\w+)\s+interface/, type: 'interface' as const },
        ];

      case 'rust':
        return [
          { regex: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/, type: 'function' as const },
          { regex: /^\s*(?:pub\s+)?struct\s+(\w+)/, type: 'struct' as const },
          { regex: /^\s*(?:pub\s+)?trait\s+(\w+)/, type: 'trait' as const },
          { regex: /^\s*impl(?:<[^>]+>)?\s+(\w+)/, type: 'impl' as const },
        ];

      case 'c':
      case 'cpp':
        return [
          ...common,
          { regex: /^\s*(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/, type: 'function' as const },
          { regex: /^\s*struct\s+(\w+)/, type: 'struct' as const },
        ];

      default:
        return common;
    }
  }

  private countBraces(line: string, language: SupportedLanguage): number {
    // Python uses indentation, not braces
    if (language === 'python') {
      return 0; // Would need proper indentation tracking
    }

    let count = 0;
    for (const char of line) {
      if (char === '{') count++;
      else if (char === '}') count--;
    }
    return count;
  }
}

/**
 * Mock embedding model for testing.
 * Generates deterministic embeddings based on code content.
 */
export class MockEmbeddingModel implements EmbeddingModel {
  readonly dimension: number;

  constructor(dimension: number = 384) {
    this.dimension = dimension;
  }

  async embed(code: string): Promise<Float32Array> {
    // Generate deterministic embedding from code hash
    const embedding = new Float32Array(this.dimension);
    let hash = 0;

    for (let i = 0; i < code.length; i++) {
      hash = ((hash << 5) - hash + code.charCodeAt(i)) | 0;
    }

    // Fill embedding with pseudo-random values based on hash
    for (let i = 0; i < this.dimension; i++) {
      hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
      hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
      hash ^= hash >>> 16;
      embedding[i] = (hash & 0xffffff) / 0xffffff - 0.5;
    }

    // Normalize to unit vector
    const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        embedding[i] /= norm;
      }
    }

    return Promise.resolve(embedding);
  }

  async embedBatch(codes: string[]): Promise<Float32Array[]> {
    return Promise.all(codes.map((code) => this.embed(code)));
  }
}

/**
 * File extension to language mapping.
 */
export const EXTENSION_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.scala': 'scala',
  '.r': 'r',
  '.R': 'r',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.sql': 'sql',
  '.lua': 'lua',
  '.pl': 'perl',
  '.m': 'objectivec',
  '.mm': 'objectivec',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hs': 'haskell',
  '.clj': 'clojure',
  '.fs': 'fsharp',
};

/**
 * Gets the language for a file path.
 */
export function getLanguageForFile(filePath: string): SupportedLanguage | undefined {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  return EXTENSION_TO_LANGUAGE[ext];
}
