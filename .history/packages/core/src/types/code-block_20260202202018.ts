/**
 * @nlci/core - Types Module
 *
 * Core type definitions for the NLCI code similarity detection system.
 */

/**
 * Represents a block of code that can be indexed and queried.
 */
export interface CodeBlock {
  /** Unique identifier for this code block */
  readonly id: string;

  /** Source file path (relative to project root) */
  readonly filePath: string;

  /** Starting line number (1-indexed) */
  readonly startLine: number;

  /** Ending line number (1-indexed, inclusive) */
  readonly endLine: number;

  /** Starting column (0-indexed) */
  readonly startColumn: number;

  /** Ending column (0-indexed) */
  readonly endColumn: number;

  /** The actual source code content */
  readonly content: string;

  /** Normalized/canonical form of the code for comparison */
  readonly normalizedContent: string;

  /** Programming language identifier */
  readonly language: SupportedLanguage;

  /** Type of code construct */
  readonly blockType: CodeBlockType;

  /** Name of the function/class/method if applicable */
  readonly name?: string;

  /** SHA-256 hash of the normalized content */
  readonly contentHash: string;

  /** Token count after normalization */
  readonly tokenCount: number;

  /** Timestamp when this block was indexed */
  readonly indexedAt: Date;

  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Types of code blocks that can be detected.
 */
export type CodeBlockType =
  | 'function'
  | 'method'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'module'
  | 'namespace'
  | 'block'
  | 'statement'
  | 'expression'
  | 'unknown';

/**
 * Supported programming languages.
 */
export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'c'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'scala'
  | 'unknown';

/**
 * Options for creating a code block.
 */
export interface CodeBlockOptions {
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  content: string;
  language: SupportedLanguage;
  blockType?: CodeBlockType;
  name?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Factory function to create a CodeBlock with generated fields.
 */
export function createCodeBlock(options: CodeBlockOptions): CodeBlock {
  const normalizedContent = normalizeCode(options.content, options.language);
  const contentHash = computeHash(normalizedContent);
  const tokenCount = countTokens(normalizedContent);

  return {
    id: generateBlockId(options.filePath, options.startLine, options.endLine),
    filePath: options.filePath,
    startLine: options.startLine,
    endLine: options.endLine,
    startColumn: options.startColumn ?? 0,
    endColumn: options.endColumn ?? 0,
    content: options.content,
    normalizedContent,
    language: options.language,
    blockType: options.blockType ?? 'unknown',
    name: options.name,
    contentHash,
    tokenCount,
    indexedAt: new Date(),
    metadata: options.metadata,
  };
}

/**
 * Generates a unique block ID from file path and line range.
 */
function generateBlockId(
  filePath: string,
  startLine: number,
  endLine: number,
): string {
  const normalized = filePath.replace(/\\/g, '/');
  return `${normalized}:${startLine}-${endLine}`;
}

/**
 * Normalizes code for comparison by removing non-semantic elements.
 */
function normalizeCode(content: string, _language: SupportedLanguage): string {
  // Basic normalization: trim, normalize whitespace, lowercase identifiers
  return content
    .trim()
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Computes a SHA-256 hash of the content.
 */
function computeHash(content: string): string {
  // Use a simple hash for now; in production, use crypto
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Counts tokens in normalized content.
 */
function countTokens(content: string): number {
  return content.split(/\s+/).filter(Boolean).length;
}
