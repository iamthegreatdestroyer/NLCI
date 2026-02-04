/**
 * @nlci/core - NLCI Engine
 *
 * The main engine class that orchestrates code clone detection.
 * Provides the high-level API for indexing codebases and finding clones.
 */

import { createTFIDFEmbedder } from '../embeddings/tfidf-embedder.js';
import { LSHIndex, type LSHIndexStats } from '../lsh/lsh-index.js';
import type {
  CloneCluster,
  CloneType,
  QueryOptions,
  QueryResult,
  ScanSummary,
} from '../types/clone-result.js';
import type { CodeBlock, SupportedLanguage } from '../types/code-block.js';
import type { NLCIConfig } from '../types/config.js';
import { mergeConfig } from '../types/config.js';
import {
  MockEmbeddingModel,
  SimpleCodeParser,
  getLanguageForFile,
  type CodeParser,
  type EmbeddingModel,
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
      ...(this.config.lsh.seed !== undefined && { seed: this.config.lsh.seed }),
      multiProbe: this.config.lsh.multiProbe,
    });

    // Initialize parser (use injected or default)
    this.parser = dependencies?.parser ?? new SimpleCodeParser();

    // Initialize embedding model (use injected or create based on config)
    this.embeddingModel = dependencies?.embeddingModel ?? this.createEmbeddingModel();

    // Initialize query engine
    this.queryEngine = new QueryEngine(this.index, this.embeddingModel);
  }

  /**
   * Creates an embedding model based on configuration.
   * @returns The configured embedding model
   */
  private createEmbeddingModel(): EmbeddingModel {
    const modelType = this.config.embedding.modelType;
    const dimension = this.config.lsh.dimension;

    switch (modelType) {
      case 'tfidf':
        // TF-IDF embedder with TypeScript as default language
        return createTFIDFEmbedder('typescript', dimension);

      case 'onnx':
        // ONNX model not yet implemented, fall back to mock
        console.warn(
          'ONNX embedding model not yet implemented, using mock embedder. ' +
            'Set embedding.modelType to "tfidf" for production use.'
        );
        return new MockEmbeddingModel(dimension);

      case 'mock':
      default:
        return new MockEmbeddingModel(dimension);
    }
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
    const typeDistribution: Record<CloneType, number> = {
      'type-1': 0,
      'type-2': 0,
      'type-3': 0,
      'type-4': 0,
    };

    for (const cluster of clusters) {
      const count = typeDistribution[cluster.cloneType];
      if (count !== undefined) {
        typeDistribution[cluster.cloneType] = count + cluster.blocks.length;
      }
    }

    // Collect unique files and languages
    const files = new Set(blocks.map((b) => b.filePath));
    const languages = [...new Set(blocks.map((b) => b.language))] as SupportedLanguage[];

    const summary: ScanSummary = {
      filesScanned: files.size,
      blocksIndexed: blocks.length,
      clonePairsFound: clusters.reduce((sum, c) => sum + c.blocks.length - 1, 0),
      clonesByType: typeDistribution,
      languages,
      scanTimeMs: this.scanSummary?.scanTimeMs ?? 0,
      indexBuildTimeMs: 0,
      avgQueryTimeMs: 0,
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
   * Exports the engine state for in-memory serialization.
   * Unlike save(), this returns the data directly without persistence.
   * Useful for testing and in-process data transfer.
   */
  exportState(): {
    version: string;
    indexState: ReturnType<LSHIndex['exportState']>;
    config: NLCIConfig;
  } {
    return {
      version: '1.0',
      indexState: this.index.exportState(),
      config: this.config,
    };
  }

  /**
   * Imports engine state from exported data.
   * Unlike load(), this accepts data directly without persistence.
   * Useful for testing and in-process data transfer.
   */
  importState(state: { indexState: Parameters<LSHIndex['importState']>[0] }): void {
    this.index.importState(state.indexState);
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
