/**
 * NLCI Service
 *
 * Core service that manages the NLCI engine and index
 */

import {
  NLCIEngine,
  type CloneCluster,
  type CloneResult,
  type LSHIndexStats,
  type NLCIConfig,
} from '@nlci/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

/**
 * Re-export LSHIndexStats for convenience
 */
export type { LSHIndexStats };

/**
 * Convert CloneCluster[] to CloneResult[] for backward compatibility.
 * Creates pairs from representative block (or first block) to all other blocks.
 */
function clustersToResults(clusters: CloneCluster[]): CloneResult[] {
  const results: CloneResult[] = [];

  for (const cluster of clusters) {
    if (cluster.blocks.length < 2) continue;

    // Use representative block or first block as source
    const source = cluster.representative ?? cluster.blocks[0];

    // Create pairs from source to all other blocks
    for (const target of cluster.blocks) {
      if (target === source) continue;

      results.push({
        source,
        target,
        similarity: cluster.avgSimilarity,
        cloneType: cluster.cloneType,
        metrics: {
          sharedTokens: 0,
          totalTokens: 0,
          editDistance: 0,
        },
      });
    }
  }

  return results;
}

/**
 * Service for managing NLCI operations in VS Code
 */
export class NlciService implements vscode.Disposable {
  private readonly logger = new Logger('NlciService');
  private engine: NLCIEngine | undefined;
  private indexPath: string | undefined;
  private config: Partial<NLCIConfig> | undefined;
  private _isInitialized = false;
  private _hasIndex = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing NLCI service...');

    // Load configuration
    this.config = this.loadConfiguration();

    // Check for existing index
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      this.indexPath = path.join(workspaceFolder.uri.fsPath, '.nlci-index');

      try {
        await fs.access(this.indexPath);
        await this.loadIndex();
        this._hasIndex = true;
      } catch {
        this.logger.debug('No existing index found');
        this._hasIndex = false;
      }
    }

    this._isInitialized = true;
    this.logger.info('NLCI service initialized');
  }

  /**
   * Check if the service is enabled
   */
  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('nlci');
    return config.get<boolean>('enabled', true);
  }

  /**
   * Check if an index exists
   */
  hasIndex(): boolean {
    return this._hasIndex;
  }

  /**
   * Get the current threshold
   */
  getThreshold(): number {
    const config = vscode.workspace.getConfiguration('nlci');
    return config.get<number>('threshold', 0.85);
  }

  /**
   * Load configuration from VS Code settings
   */
  private loadConfiguration(): Partial<NLCIConfig> {
    const config = vscode.workspace.getConfiguration('nlci');

    return {
      lsh: {
        numTables: config.get<number>('lsh.numTables', 20),
        numBits: config.get<number>('lsh.numBits', 12),
        dimension: 384,
        multiProbe: { enabled: true, numProbes: 5 },
        // Enable optimized hyperplane projections for better recall
        useOrthogonalHyperplanes: config.get<boolean>('lsh.useOrthogonalHyperplanes', true),
        // Enable scored probes for smarter multi-probe ordering
        useScoredProbes: config.get<boolean>('lsh.useScoredProbes', false),
      },
      parser: {
        minBlockSize: 3,
        maxBlockSize: 500,
        languages: [],
        extractFunctions: true,
        extractClasses: true,
        extractBlocks: false,
        includePatterns: [],
        excludePatterns: [],
      },
    };
  }

  /**
   * Reload configuration
   */
  reloadConfiguration(): void {
    this.config = this.loadConfiguration();
    this.logger.info('Configuration reloaded');
  }

  /**
   * Scan the workspace and build index
   */
  async scanWorkspace(
    progressCallback?: (message: string, increment: number) => void
  ): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }

    if (!this.config) {
      throw new Error('Service not initialized');
    }

    this.logger.info(`Scanning workspace: ${workspaceFolder.uri.fsPath}`);

    // Create new engine (no initialize() needed - constructor initializes)
    this.engine = new NLCIEngine(this.config);

    progressCallback?.('Discovering files...', 0);

    // Get exclude patterns
    const vsConfig = vscode.workspace.getConfiguration('nlci');
    const excludePatterns = vsConfig.get<string[]>('excludePatterns', [
      '**/node_modules/**',
      '**/dist/**',
    ]);

    // Find all source files
    const files = await vscode.workspace.findFiles(
      '**/*.{ts,tsx,js,jsx,py,java,go,rs,c,cpp,h,hpp,cs}',
      `{${excludePatterns.join(',')}}`
    );

    this.logger.info(`Found ${files.length} files to process`);
    progressCallback?.(`Found ${files.length} files`, 10);

    // Process each file using indexCode (not indexFile)
    let processed = 0;
    for (const file of files) {
      try {
        const content = await fs.readFile(file.fsPath, 'utf-8');
        await this.engine.indexCode(content, file.fsPath);
        processed++;

        const progress = 10 + (processed / files.length) * 80;
        progressCallback?.(`Processing: ${path.basename(file.fsPath)}`, progress);
      } catch (error) {
        this.logger.error(`Failed to process ${file.fsPath}`, error);
      }
    }

    progressCallback?.('Saving index...', 95);

    // Save index using save() - no path argument
    this.indexPath = path.join(workspaceFolder.uri.fsPath, '.nlci-index');
    await this.saveIndex();

    this._hasIndex = true;
    await vscode.commands.executeCommand('setContext', 'nlci.hasIndex', true);

    progressCallback?.('Complete!', 100);
    this.logger.info('Workspace scan complete');
  }

  /**
   * Find similar code blocks
   */
  async findSimilar(code: string, filePath?: string): Promise<CloneResult[]> {
    if (!this.engine) {
      throw new Error('Index not loaded. Please scan the workspace first.');
    }

    const threshold = this.getThreshold();
    const result = await this.engine.query(code, { minSimilarity: threshold });

    // Filter out results from the same file if requested
    if (filePath) {
      return result.clones.filter((r) => r.target.filePath !== filePath);
    }

    return [...result.clones];
  }

  /**
   * Get all clones in the workspace as result pairs
   */
  async getAllClones(): Promise<CloneResult[]> {
    if (!this.engine) {
      throw new Error('Index not loaded. Please scan the workspace first.');
    }

    const threshold = this.getThreshold();
    const clusters = await this.engine.findAllClones({ minSimilarity: threshold });
    return clustersToResults(clusters);
  }

  /**
   * Get clones for a specific file as result pairs
   */
  async getClonesForFile(filePath: string): Promise<CloneResult[]> {
    console.log('[Service] getClonesForFile called for:', filePath);

    if (!this.engine) {
      console.log('[Service] No engine available');
      return [];
    }

    const threshold = this.getThreshold();
    console.log('[Service] Using threshold:', threshold);

    const allClusters = await this.engine.findAllClones({ minSimilarity: threshold });
    console.log('[Service] Total clusters found:', allClusters.length);

    // Filter clusters that contain blocks from the specified file
    const relevantClusters = allClusters.filter((cluster) =>
      cluster.blocks.some((block) => block.filePath === filePath)
    );
    console.log('[Service] Relevant clusters for this file:', relevantClusters.length);

    if (relevantClusters.length > 0) {
      console.log('[Service] Sample cluster:', JSON.stringify(relevantClusters[0], null, 2));
    }

    return clustersToResults(relevantClusters);
  }

  /**
   * Update a document in the index (re-indexes the file)
   */
  async updateDocument(document: vscode.TextDocument): Promise<void> {
    if (!this.engine) {
      return;
    }

    const content = document.getText();
    // Re-index the file (note: this adds blocks, doesn't remove old ones)
    await this.engine.indexCode(content, document.uri.fsPath);
  }

  /**
   * Get index statistics
   */
  getStats(): LSHIndexStats | undefined {
    if (!this.engine) {
      return undefined;
    }

    return this.engine.getStats();
  }

  /**
   * Clear the index
   */
  async clearIndex(): Promise<void> {
    this.engine = undefined;
    this._hasIndex = false;

    if (this.indexPath) {
      try {
        await fs.rm(this.indexPath, { recursive: true, force: true });
      } catch {
        // Ignore errors
      }
    }

    await vscode.commands.executeCommand('setContext', 'nlci.hasIndex', false);
    this.logger.info('Index cleared');
  }

  /**
   * Save index to disk
   */
  private async saveIndex(): Promise<void> {
    if (!this.engine) {
      return;
    }

    // save() doesn't take a path - just saves to configured location
    await this.engine.save();
    this.logger.info('Index saved');
  }

  /**
   * Load index from disk
   */
  private async loadIndex(): Promise<void> {
    if (!this.config) {
      throw new Error('Service not initialized');
    }
    this.engine = new NLCIEngine(this.config);
    // load() doesn't take a path - just loads from configured location
    await this.engine.load();
    this.logger.info('Index loaded');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.engine = undefined;
    this._isInitialized = false;
    this._hasIndex = false;
  }
}
