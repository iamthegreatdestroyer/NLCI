/**
 * NLCI Service
 *
 * Core service that manages the NLCI engine and index
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  NlciEngine,
  type NlciConfig,
  type CodeBlock,
  type CloneResult,
} from '@nlci/core';
import { Logger } from '../utils/logger';

/**
 * Index statistics
 */
export interface IndexStats {
  totalBlocks: number;
  totalFiles: number;
  languages: Record<string, number>;
  lastUpdated: Date;
}

/**
 * Service for managing NLCI operations in VS Code
 */
export class NlciService implements vscode.Disposable {
  private readonly logger = new Logger('NlciService');
  private engine: NlciEngine | undefined;
  private indexPath: string | undefined;
  private config: NlciConfig | undefined;
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
  private loadConfiguration(): NlciConfig {
    const config = vscode.workspace.getConfiguration('nlci');

    return {
      lsh: {
        numTables: config.get<number>('lsh.numTables', 20),
        numBits: config.get<number>('lsh.numBits', 12),
        dimensions: 384,
      },
      threshold: config.get<number>('threshold', 0.85),
      minBlockSize: 3,
      maxBlockSize: 500,
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

    this.logger.info(`Scanning workspace: ${workspaceFolder.uri.fsPath}`);

    // Create new engine
    this.engine = new NlciEngine(this.config!);
    await this.engine.initialize();

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

    // Process each file
    let processed = 0;
    for (const file of files) {
      try {
        const content = await fs.readFile(file.fsPath, 'utf-8');
        await this.engine.indexFile(file.fsPath, content);
        processed++;

        const progress = 10 + (processed / files.length) * 80;
        progressCallback?.(`Processing: ${path.basename(file.fsPath)}`, progress);
      } catch (error) {
        this.logger.error(`Failed to process ${file.fsPath}`, error);
      }
    }

    progressCallback?.('Saving index...', 95);

    // Save index
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
  async findSimilar(
    code: string,
    filePath?: string
  ): Promise<CloneResult[]> {
    if (!this.engine) {
      throw new Error('Index not loaded. Please scan the workspace first.');
    }

    const threshold = this.getThreshold();
    const results = await this.engine.query(code, threshold);

    // Filter out results from the same file if requested
    if (filePath) {
      return results.filter((r) => r.target.filePath !== filePath);
    }

    return results;
  }

  /**
   * Get all clones in the workspace
   */
  async getAllClones(): Promise<CloneResult[]> {
    if (!this.engine) {
      throw new Error('Index not loaded. Please scan the workspace first.');
    }

    const threshold = this.getThreshold();
    return this.engine.findAllClones(threshold);
  }

  /**
   * Get clones for a specific file
   */
  async getClonesForFile(filePath: string): Promise<CloneResult[]> {
    if (!this.engine) {
      return [];
    }

    const threshold = this.getThreshold();
    return this.engine.getClonesForFile(filePath, threshold);
  }

  /**
   * Update a document in the index
   */
  async updateDocument(document: vscode.TextDocument): Promise<void> {
    if (!this.engine) {
      return;
    }

    const content = document.getText();
    await this.engine.updateFile(document.uri.fsPath, content);
  }

  /**
   * Get index statistics
   */
  getStats(): IndexStats | undefined {
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
    if (!this.engine || !this.indexPath) {
      return;
    }

    await this.engine.saveIndex(this.indexPath);
    this.logger.info(`Index saved to ${this.indexPath}`);
  }

  /**
   * Load index from disk
   */
  private async loadIndex(): Promise<void> {
    if (!this.indexPath) {
      return;
    }

    this.engine = new NlciEngine(this.config!);
    await this.engine.loadIndex(this.indexPath);
    this.logger.info(`Index loaded from ${this.indexPath}`);
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
