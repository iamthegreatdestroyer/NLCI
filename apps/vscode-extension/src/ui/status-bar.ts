/**
 * Status Bar Manager
 *
 * Manages the NLCI status bar item
 */

import * as vscode from 'vscode';
import type { NlciService } from '../services/nlci-service';

/**
 * Status bar manager for NLCI
 */
export class StatusBarManager implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly service: NlciService) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

    this.statusBarItem.command = 'nlci.showStats';
    this.update();
    this.statusBarItem.show();

    // Update on configuration change
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('nlci')) {
          this.update();
        }
      })
    );
  }

  /**
   * Update the status bar item
   */
  update(): void {
    if (!this.service.isEnabled()) {
      this.statusBarItem.text = '$(eye-closed) NLCI';
      this.statusBarItem.tooltip = 'NLCI is disabled';
      this.statusBarItem.backgroundColor = undefined;
      return;
    }

    if (!this.service.hasIndex()) {
      this.statusBarItem.text = '$(warning) NLCI';
      this.statusBarItem.tooltip = 'NLCI: No index. Click to scan workspace.';
      this.statusBarItem.command = 'nlci.scan';
      return;
    }

    const stats = this.service.getStats();
    if (stats) {
      this.statusBarItem.text = `$(search) NLCI: ${stats.totalBlocks} blocks`;
      this.statusBarItem.tooltip = `NLCI Index\n${stats.totalBlocks} code blocks\n${stats.totalBuckets} buckets\nClick for stats`;
      this.statusBarItem.command = 'nlci.showStats';
    } else {
      this.statusBarItem.text = '$(check) NLCI';
      this.statusBarItem.tooltip = 'NLCI: Ready';
    }
  }

  /**
   * Show scanning indicator
   */
  showScanning(): void {
    this.statusBarItem.text = '$(sync~spin) NLCI: Scanning...';
    this.statusBarItem.tooltip = 'NLCI: Scanning workspace...';
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.statusBarItem.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
