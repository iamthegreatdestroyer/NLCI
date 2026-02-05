/**
 * @nlci/core - Parser Module
 *
 * Provides code parsing capabilities for extracting code blocks.
 * Includes both simple regex-based parsing (fast) and tree-sitter
 * AST parsing (accurate).
 */

// Tree-sitter AST parser
export {
  TreeSitterParser,
  type TreeSitterParserOptions,
} from './tree-sitter/tree-sitter-parser.js';

export {
  GrammarLoadError,
  GrammarLoader,
  defaultGrammarLoader,
  type GrammarConfig,
} from './tree-sitter/grammar-loader.js';

export {
  NodeExtractor,
  type ExtractedNode,
  type ExtractionRule,
} from './tree-sitter/node-extractor.js';
