/**
 * @nlci/core - Tree-sitter AST Parser
 *
 * Provides AST-aware code parsing using tree-sitter WASM grammars.
 * Extracts functions, classes, methods, and other code blocks with
 * proper syntax understanding.
 */

export {
  GrammarLoadError,
  GrammarLoader,
  defaultGrammarLoader,
  type GrammarConfig,
} from './grammar-loader.js';
export { NodeExtractor, type ExtractedNode, type ExtractionRule } from './node-extractor.js';
export { TreeSitterParser, type TreeSitterParserOptions } from './tree-sitter-parser.js';
