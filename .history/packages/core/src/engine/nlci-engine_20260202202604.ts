/**
 * @nlci/core - NLCI Engine
 *
 * The main engine class that orchestrates code clone detection.
 * Provides the high-level API for indexing codebases and finding clones.
 */

import type { CodeBlock, SupportedLanguage } from '../types/code-block.js';
import type {
  CloneResult,
  QueryResult,
  CloneCluster,
  ScanSummary,
  QueryOptions,
} from '../types/clone-result.js';
import type { NLCIConfig } from '../types/config.js';
import { DEFAULT_CONFIG, mergeConfig } from '../types/config.js';
import { LSHIndex, type LSHIndexStats } from '../lsh/lsh-index.js';
import {
  SimpleCodeParser,
  MockEmbeddingModel,
  getLanguageForFile,
  type CodeParser,
  type EmbeddingModel,
  type ParseResult,
} from './indexer.js';
import { QueryEngine } from './query-engine.js';

/**
 * Options for scanning a codebase.
 */
export interface ScanOptions {
  /** File patterns to include */
  include?: string[];

  /** File patterns to exclude */
  exclude?: string[];

  /** Maximum file size to process (in bytes) */
  maxFileSize?: number;

  /** Minimum block size to index (in tokens) */
  minBlockSize?: number;

  /** Progress callback */
  onProgress?: (progress: ScanProgress) => void;
}

/**
 * Progress information during scanning.
 */
export interface ScanProgress {
  /** Total files to process */
  totalFiles: number;

  /** Files processed so far */
  processedFiles: number;

  /** Current file being processed */
  currentFile: string;

  /** Blocks indexed so far */
  blocksIndexed: number;

  /** Elapsed time in milliseconds */
  elapsed: number;
}

/**
 * Default scan options.
 */
export const DEFAULT_SCAN_OPTIONS: Required<ScanOptions> = {
  include: ['**/*.ts', '**/*.js', '**/*.py', '**/*.java', '**/*.go'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
  maxFileSize: 1024 * 1024, // 1MB
  minBlockSize: 10,
  onProgress: () => {},
};

/**
 * The main NLCI engine.
 */
export class NLCIEngine {
  private readonly config: NLCIConfig;
  private readonly index: LSHIndex;
  private readonly parser: CodeParser;
  private readonly embeddingModel: EmbeddingModel;
  private readonly queryEngine: QueryEngine;
  private scanSummary: ScanSummary | null = null;

  /**
   * Creates a new NLCI engine.
   *
   * @param config - Configuration options
   * @param dependencies - Optional dependency injection
   */
  constructor(
    config: Partial<NLCIConfig> = {},
    dependencies?: {
      parser?: CodeParser;
      embeddingModel?: EmbeddingModel;
    }
  ) {
    this.config = mergeConfig(config);

    // Initialize LSH index
    this.index = new LSHIndex({
      numTables: this.config.lsh.numTables,
      numBits: this.config.lsh.numBits,
      dimension: this.config.lsh.dimension,
      seed: this.config.lsh.seed,
      multiProbe: this.config.lsh.multiProbe,
    });

    // Initialize parser (use injected or default)
    this.parser = dependencies?.parser ?? new SimpleCodeParser();

    // Initialize embedding model (use injected or mock)
    this.embeddingModel =
      dependencies?.embeddingModel ?? new MockEmbeddingModel(this.config.lsh.dimension);

    // Initialize query engine
    this.queryEngine = new QueryEngine(this.index, this.embeddingModel);
  }

  /**
   * Indexes a code block.
   *
   * @param code - The code content
   * @param filePath - Path to the file
   * @param language - Programming language
   * @returns The indexed code block
   */
  async indexCode(
    code: string,
    filePath: string,
    language?: SupportedLanguage
  ): Promise<CodeBlock[]> {
    const lang = language ?? getLanguageForFile(filePath) ?? 'typescript';

    // Parse code into blocks
    const parseResult = this.parser.parse(code, filePath, lang);

    // Index each block
    const indexedBlocks: CodeBlock[] = [];

    for (const block of parseResult.blocks) {
      // Skip small blocks
      if ((block.tokenCount ?? 0) < this.config.parser.minBlockSize) {
        continue;
      }

      // Generate embedding
      const embedding = await this.embeddingModel.embed(block.content);

      // Add to index
      if (this.index.insert(block, embedding)) {
        indexedBlocks.push(block);
      }
    }

    return indexedBlocks;
  }

  /**
   * Indexes a single code block directly.
   */
  async indexBlock(block: CodeBlock): Promise<boolean> {
    const embedding = await this.embeddingModel.embed(block.content);
    return this.index.insert(block, embedding);
  }

  /**
   * Queries for similar code.
   *
   * @param code - The code to search for
   * @param options - Query options
   * @returns Query result with similar blocks
   */
  async query(code: string, options?: Partial<QueryOptions>): Promise<QueryResult> {
    return this.queryEngine.query(code, options);
  }

  /**
   * Finds code similar to an indexed block.
   *
   * @param blockId - ID of the block to find similar blocks for
   * @param options - Query options
   * @returns Query result with similar blocks
   */
  async findSimilar(blockId: string, options?: Partial<QueryOptions>): Promise<QueryResult> {
    return this.queryEngine.querySimilar(blockId, options);
  }

  /**
   * Finds all clone clusters in the index.
   *
   * @param options - Query options
   * @returns Array of clone clusters
   */
  async findAllClones(options?: Partial<QueryOptions>): Promise<CloneCluster[]> {
    return this.queryEngine.findAllClones(options);
  }

  /**
   * Generates a scan summary.
   *
   * @returns Summary of indexed code
   */
  async generateSummary(): Promise<ScanSummary> {
    const blocks = this.index.getAllBlocks();
    const clusters = await this.findAllClones({ minSimilarity: 0.85 });

    // Count clone types
    const typeDistribution: Record<string, number> = {
      'type-1': 0,
      'type-2': 0,
      'type-3': 0,
      'type-4': 0,
    };

    for (const cluster of clusters) {
      typeDistribution[cluster.cloneType] += cluster.blocks.length;
    }

    // Collect unique files
    const files = new Set(blocks.map((b) => b.filePath));

    // Calculate total lines
    const totalLines = blocks.reduce((sum, b) => sum + (b.endLine - b.startLine + 1), 0);

    // Calculate clone lines
    const cloneBlocks = new Set<string>();
    for (const cluster of clusters) {
      for (const block of cluster.blocks) {
        cloneBlocks.add(block.id);
      }
    }

    const cloneLines = blocks
      .filter((b) => cloneBlocks.has(b.id))
      .reduce((sum, b) => sum + (b.endLine - b.startLine + 1), 0);

    const summary: ScanSummary = {
      totalFiles: files.size,
      totalBlocks: blocks.length,
      totalLines,
      cloneLines,
      clonePercentage: totalLines > 0 ? (cloneLines / totalLines) * 100 : 0,
      cloneCount: clusters.length,
      typeDistribution,
      scanDuration: this.scanSummary?.scanDuration ?? 0,
      indexSize: this.index.size,
    };

    this.scanSummary = summary;
    return summary;
  }

  /**
   * Gets index statistics.
   */
  getStats(): LSHIndexStats {
    return this.index.getStats();
  }

  /**
   * Gets a block by ID.
   */
  getBlock(blockId: string): CodeBlock | undefined {
    return this.index.get(blockId);
  }

  /**
   * Gets all indexed blocks.
   */
  getAllBlocks(): readonly CodeBlock[] {
    return this.index.getAllBlocks();
  }

  /**
   * Removes a block from the index.
   */
  removeBlock(blockId: string): boolean {
    return this.index.remove(blockId);
  }

  /**
   * Checks if a block exists in the index.
   */
  hasBlock(blockId: string): boolean {
    return this.index.has(blockId);
  }

  /**
   * Clears the index.
   */
  clear(): void {
    this.index.clear();
    this.scanSummary = null;
  }

  /**
   * Persists the index to storage.
   */
  async save(): Promise<void> {
    await this.index.save();
  }

  /**
   * Loads the index from storage.
   */
  async load(): Promise<boolean> {
    return this.index.load();
  }

  /**
   * Returns the number of blocks in the index.
   */
  get size(): number {
    return this.index.size;
  }

  /**
   * Returns the configuration.
   */
  getConfig(): NLCIConfig {
    return this.config;
  }
}

export { NLCIEngine as default };
