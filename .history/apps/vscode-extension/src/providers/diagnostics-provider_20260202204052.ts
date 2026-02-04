/**
 * Diagnostics Provider
 *
 * Provides diagnostics (warnings/errors) for detected clones
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { CloneResult } from '@nlci/core';
import { NlciService } from '../services/nlci-service';

/**
 * Diagnostics provider for clone detection
 */
export class CloneDiagnosticsProvider implements vscode.Disposable {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly service: NlciService) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('nlci');

    // Subscribe to document events
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
        this.updateDiagnostics(doc);
      }),
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.diagnosticCollection.delete(doc.uri);
      })
    );
  }

  /**
   * Refresh diagnostics for all open documents
   */
  refresh(): void {
    for (const doc of vscode.workspace.textDocuments) {
      this.updateDiagnostics(doc);
    }
  }

  /**
   * Clear all diagnostics
   */
  clear(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Update diagnostics for a document
   */
  async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
    // Check if diagnostics are enabled
    const config = vscode.workspace.getConfiguration('nlci');
    if (!config.get<boolean>('showDiagnostics', true)) {
      this.diagnosticCollection.delete(document.uri);
      return;
    }

    if (!this.service.hasIndex()) {
      return;
    }

    const filePath = document.uri.fsPath;

    try {
      const clones = await this.service.getClonesForFile(filePath);

      // Filter to only source locations in this file
      const sourceClones = clones.filter((c) => c.source.filePath === filePath);

      const diagnostics = this.createDiagnostics(document, sourceClones);
      this.diagnosticCollection.set(document.uri, diagnostics);
    } catch (error) {
      console.error('NLCI Diagnostics error:', error);
    }
  }

  /**
   * Create diagnostics from clone results
   */
  private createDiagnostics(
    document: vscode.TextDocument,
    clones: CloneResult[]
  ): vscode.Diagnostic[] {
    const config = vscode.workspace.getConfiguration('nlci');
    const severityStr = config.get<string>('diagnosticSeverity', 'information');
    const severity = this.getSeverity(severityStr);

    const diagnostics: vscode.Diagnostic[] = [];
    const processedRanges = new Set<string>();

    for (const clone of clones) {
      const startLine = clone.source.startLine - 1;
      const endLine = clone.source.endLine - 1;
      const rangeKey = `${startLine}-${endLine}`;

      // Skip if we already have a diagnostic for this range
      if (processedRanges.has(rangeKey)) {
        continue;
      }
      processedRanges.add(rangeKey);

      // Count all clones at this location
      const clonesAtLocation = clones.filter(
        (c) =>
          c.source.startLine === clone.source.startLine && c.source.endLine === clone.source.endLine
      );

      const range = new vscode.Range(
        startLine,
        0,
        endLine,
        document.lineAt(Math.min(endLine, document.lineCount - 1)).text.length
      );

      const targetFile = path.basename(clone.target.filePath);
      let message: string;

      if (clonesAtLocation.length === 1) {
        message = `Code clone detected: similar to ${targetFile}:${clone.target.startLine} (${this.getCloneTypeName(clone.cloneType)}, ${(clone.similarity * 100).toFixed(0)}% similar)`;
      } else {
        message = `${clonesAtLocation.length} code clones detected at this location`;
      }

      const diagnostic = new vscode.Diagnostic(range, message, severity);
      diagnostic.source = 'NLCI';
      diagnostic.code = {
        value: clone.cloneType,
        target: vscode.Uri.parse(
          `command:nlci.navigateToClone?${encodeURIComponent(JSON.stringify([clone.target.filePath, clone.target.startLine]))}`
        ),
      };

      // Add related information
      diagnostic.relatedInformation = clonesAtLocation.map(
        (c) =>
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(
              vscode.Uri.file(c.target.filePath),
              new vscode.Position(c.target.startLine - 1, 0)
            ),
            `Clone target: ${path.basename(c.target.filePath)}:${c.target.startLine} (${(c.similarity * 100).toFixed(0)}%)`
          )
      );

      diagnostics.push(diagnostic);
    }

    return diagnostics;
  }

  /**
   * Get severity from string
   */
  private getSeverity(str: string): vscode.DiagnosticSeverity {
    switch (str.toLowerCase()) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'hint':
        return vscode.DiagnosticSeverity.Hint;
      default:
        return vscode.DiagnosticSeverity.Information;
    }
  }

  /**
   * Get human-readable clone type name
   */
  private getCloneTypeName(cloneType: string): string {
    switch (cloneType) {
      case 'type-1':
        return 'Exact Clone';
      case 'type-2':
        return 'Parameterized Clone';
      case 'type-3':
        return 'Near-miss Clone';
      case 'type-4':
        return 'Semantic Clone';
      default:
        return 'Clone';
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.diagnosticCollection.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
