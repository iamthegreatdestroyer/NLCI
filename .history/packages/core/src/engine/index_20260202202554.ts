/**
 * @nlci/core - Engine Module
 *
 * Exports the main NLCI engine and related components.
 */

// Main engine
export {
  NLCIEngine,
  type ScanOptions,
  type ScanProgress,
  DEFAULT_SCAN_OPTIONS,
} from './nlci-engine.js';

// Indexer components
export {
  SimpleCodeParser,
  MockEmbeddingModel,
  getLanguageForFile,
  EXTENSION_TO_LANGUAGE,
  type CodeParser,
  type EmbeddingModel,
  type ParseResult,
  type ParseError,
} from './indexer.js';

// Query engine
export { QueryEngine } from './query-engine.js';
