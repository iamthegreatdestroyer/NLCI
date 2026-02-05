/**
 * @nlci/core - Configuration Types
 *
 * Configuration options for the NLCI engine.
 */

import type { SupportedLanguage } from './code-block.js';

/**
 * Deep partial type utility.
 * Makes all properties optional recursively, enabling ergonomic partial configs.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[P]>
    : T[P];
};

/**
 * Main NLCI configuration.
 */
export interface NLCIConfig {
  /** LSH index configuration */
  lsh: LSHConfig;

  /** Embedding model configuration */
  embedding: EmbeddingConfig;

  /** Parser configuration */
  parser: ParserConfig;

  /** Storage configuration */
  storage: StorageConfig;

  /** Performance tuning */
  performance: PerformanceConfig;

  /** Logging configuration */
  logging: LoggingConfig;
}

/**
 * LSH (Locality-Sensitive Hashing) configuration.
 *
 * The LSH index uses L tables with K-bit hash functions.
 * Query time is O(L) with high probability of finding similar items.
 */
export interface LSHConfig {
  /**
   * Number of hash tables (L).
   * More tables = higher recall, more memory.
   * Recommended: 10-50 for balanced performance.
   * @default 20
   */
  numTables?: number;

  /**
   * Number of hash bits per table (K).
   * More bits = higher precision, lower recall.
   * Recommended: 8-16 for code similarity.
   * @default 12
   */
  numBits?: number;

  /**
   * Embedding dimension for hash functions.
   * Must match the embedding model output dimension.
   * @default 384
   */
  dimension?: number;

  /**
   * Random seed for reproducible hash functions.
   * Set to undefined for random initialization.
   * @default undefined
   */
  seed?: number;

  /**
   * Maximum bucket size before splitting.
   * Prevents hot spots in high-density regions.
   * @default 1000
   */
  maxBucketSize?: number;

  /**
   * Multi-probe LSH configuration for better recall.
   * Probes nearby buckets at query time.
   * @default { enabled: true, numProbes: 3 }
   */
  multiProbe?: MultiProbeConfig;
}

/**
 * Multi-probe LSH configuration.
 */
export interface MultiProbeConfig {
  /** Whether multi-probe is enabled */
  enabled?: boolean;
  /** Number of probes for multi-probe LSH */
  numProbes?: number;
}

/**
 * Embedding model type.
 * - 'tfidf': TF-IDF based embeddings (fast, no external dependencies)
 * - 'onnx': ONNX neural model (requires model file)
 * - 'mock': Mock embeddings for testing
 */
export type EmbeddingModelType = 'tfidf' | 'onnx' | 'mock';

/**
 * Embedding model configuration.
 */
export interface EmbeddingConfig {
  /**
   * Type of embedding model to use.
   * - 'tfidf': Fast TF-IDF based embeddings (recommended for getting started)
   * - 'onnx': Neural ONNX model (requires model file)
   * - 'mock': Mock embeddings for testing
   * @default 'tfidf'
   */
  modelType?: EmbeddingModelType;

  /**
   * Path to the ONNX model file.
   * Only used when modelType is 'onnx'.
   * @default './models/code-embedder-small/model.onnx'
   */
  modelPath?: string;

  /**
   * Output embedding dimension.
   * Must match LSH dimension.
   * @default 384
   */
  dimension?: number;

  /**
   * Maximum sequence length for the model.
   * Longer sequences are truncated.
   * @default 512
   */
  maxSequenceLength?: number;

  /**
   * Batch size for embedding generation.
   * Larger batches are more efficient but use more memory.
   * @default 32
   */
  batchSize?: number;

  /**
   * Whether to use GPU acceleration if available.
   * @default true
   */
  useGPU?: boolean;

  /**
   * Whether to normalize embeddings to unit length.
   * Required for cosine similarity.
   * @default true
   */
  normalize?: boolean;
}

/**
 * Parser configuration.
 */
export interface ParserConfig {
  /**
   * Enabled languages for parsing.
   * Empty array means all supported languages.
   */
  languages?: SupportedLanguage[];

  /**
   * Minimum code block size (tokens) to index.
   * Smaller blocks are ignored.
   * @default 10
   */
  minBlockSize?: number;

  /**
   * Maximum code block size (tokens) to index.
   * Larger blocks are split or ignored.
   * @default 500
   */
  maxBlockSize?: number;

  /**
   * Whether to extract functions/methods.
   * @default true
   */
  extractFunctions?: boolean;

  /**
   * Whether to extract classes.
   * @default true
   */
  extractClasses?: boolean;

  /**
   * Whether to extract arbitrary code blocks.
   * @default false
   */
  extractBlocks?: boolean;

  /**
   * File patterns to include (glob).
   * Empty array means include all matching files.
   */
  includePatterns?: string[];

  /**
   * File patterns to exclude (glob).
   */
  excludePatterns?: string[];
}

/**
 * Storage configuration.
 */
export interface StorageConfig {
  /**
   * Storage backend type.
   * @default 'file'
   */
  type: 'memory' | 'file' | 'sqlite' | 'leveldb';

  /**
   * Path to the storage directory.
   * @default '.nlci'
   */
  path: string;

  /**
   * Whether to compress stored data.
   * @default true
   */
  compress: boolean;

  /**
   * Maximum cache size in MB.
   * @default 256
   */
  maxCacheSizeMB: number;
}

/**
 * Performance tuning configuration.
 */
export interface PerformanceConfig {
  /**
   * Number of worker threads for parallel processing.
   * 0 means use all available cores.
   * @default 0
   */
  numWorkers: number;

  /**
   * Whether to use streaming for large files.
   * @default true
   */
  streaming: boolean;

  /**
   * Chunk size for streaming in KB.
   * @default 64
   */
  chunkSizeKB: number;

  /**
   * Maximum concurrent file operations.
   * @default 10
   */
  maxConcurrentFiles: number;
}

/**
 * Logging configuration.
 */
export interface LoggingConfig {
  /**
   * Log level.
   * @default 'info'
   */
  level: 'debug' | 'info' | 'warn' | 'error' | 'silent';

  /**
   * Whether to include timestamps.
   * @default true
   */
  timestamps: boolean;

  /**
   * Whether to log to file.
   * @default false
   */
  logToFile: boolean;

  /**
   * Log file path.
   * @default '.nlci/nlci.log'
   */
  logFilePath: string;
}

/**
 * Default NLCI configuration.
 */
export const DEFAULT_CONFIG: NLCIConfig = {
  lsh: {
    numTables: 20,
    numBits: 12,
    dimension: 384,
    seed: undefined,
    maxBucketSize: 1000,
    multiProbe: {
      enabled: true,
      numProbes: 3,
    },
  },
  embedding: {
    modelType: 'tfidf',
    modelPath: './models/code-embedder-small/model.onnx',
    dimension: 384,
    maxSequenceLength: 512,
    batchSize: 32,
    useGPU: true,
    normalize: true,
  },
  parser: {
    languages: [],
    minBlockSize: 10,
    maxBlockSize: 500,
    extractFunctions: true,
    extractClasses: true,
    extractBlocks: false,
    includePatterns: [],
    excludePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/vendor/**',
    ],
  },
  storage: {
    type: 'file',
    path: '.nlci',
    compress: true,
    maxCacheSizeMB: 256,
  },
  performance: {
    numWorkers: 0,
    streaming: true,
    chunkSizeKB: 64,
    maxConcurrentFiles: 10,
  },
  logging: {
    level: 'info',
    timestamps: true,
    logToFile: false,
    logFilePath: '.nlci/nlci.log',
  },
};

/**
 * Deep merges user config with defaults.
 */
export function mergeConfig(userConfig?: DeepPartial<NLCIConfig>): NLCIConfig {
  if (!userConfig) return DEFAULT_CONFIG;

  return {
    lsh: { ...DEFAULT_CONFIG.lsh, ...userConfig.lsh },
    embedding: { ...DEFAULT_CONFIG.embedding, ...userConfig.embedding },
    parser: { ...DEFAULT_CONFIG.parser, ...userConfig.parser },
    storage: { ...DEFAULT_CONFIG.storage, ...userConfig.storage },
    performance: { ...DEFAULT_CONFIG.performance, ...userConfig.performance },
    logging: { ...DEFAULT_CONFIG.logging, ...userConfig.logging },
  };
}
