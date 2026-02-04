/**
 * CodeLens Provider
 *
 * Provides code lens annotations for detected clones
 */

import type { CloneResult } from '@nlci/core';
import * as path from 'path';
import * as vscode from 'vscode';
import type { NlciService } from '../services/nlci-service';

/**
 * CodeLens provider for clone annotations
 */
export class CloneCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  private cache: Map<string, CloneResult[]> = new Map();

  constructor(private readonly service: NlciService) {}

  /**
   * Refresh code lenses
   */
  refresh(): void {
    this.cache.clear();
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Provide code lenses for a document
   */
  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    console.log('[CodeLens] provideCodeLenses called for:', document.uri.fsPath);

    // Check if code lens is enabled
    const config = vscode.workspace.getConfiguration('nlci');
    if (!config.get<boolean>('showCodeLens', true)) {
      console.log('[CodeLens] CodeLens disabled in config');
      return [];
    }

    if (!this.service.hasIndex()) {
      console.log('[CodeLens] No index available');
      return [];
    }

    const filePath = document.uri.fsPath;

    try {
      // Get clones for this file (with caching)
      let clones = this.cache.get(filePath);
      if (!clones) {
        console.log('[CodeLens] Fetching clones for file...');
        clones = await this.service.getClonesForFile(filePath);
        console.log('[CodeLens] Found', clones.length, 'clone pairs');
        this.cache.set(filePath, clones);
      } else {
        console.log('[CodeLens] Using cached clones:', clones.length, 'pairs');
      }

      if (token.isCancellationRequested) {
        return [];
      }

      // Create code lenses for each clone source location
      const lenses: vscode.CodeLens[] = [];
      const processedLines = new Set<number>();

      for (const clone of clones) {
        // Only show lens at source locations in this file
        if (clone.source.filePath !== filePath) {
          continue;
        }

        const line = clone.source.startLine - 1;

        // Skip if we already have a lens at this line
        if (processedLines.has(line)) {
          continue;
        }
        processedLines.add(line);

        // Count clones at this location
        const clonesAtLine = clones.filter(
          (c) => c.source.filePath === filePath && c.source.startLine === clone.source.startLine
        );

        const range = new vscode.Range(line, 0, line, 0);
        const targetFile = path.basename(clone.target.filePath);

        let title: string;
        if (clonesAtLine.length === 1) {
          title = `$(references) 1 clone: ${targetFile}:${clone.target.startLine} (${(clone.similarity * 100).toFixed(0)}%)`;
        } else {
          title = `$(references) ${clonesAtLine.length} clones detected`;
        }

        const lens = new vscode.CodeLens(range, {
          title,
          command: 'nlci.navigateToClone',
          tooltip: 'Click to navigate to clone location',
          arguments: [clone.target.filePath, clone.target.startLine],
        });

        lenses.push(lens);
      }

      console.log('[CodeLens] Created', lenses.length, 'CodeLens objects');
      console.log('[CodeLens] Sample lens:', JSON.stringify(lenses[0], null, 2));

      return lenses;
    } catch (error) {
      console.error('NLCI CodeLens error:', error);
      return [];
    }
  }
}
