/**
 * Clone Tree Provider
 *
 * Tree view provider for displaying code clones
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { CloneResult } from '@nlci/core';
import { NlciService } from '../services/nlci-service';

/**
 * Tree item representing a clone group or clone instance
 */
export class CloneTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly clone?: CloneResult,
    public readonly filePath?: string,
    public readonly isGroup?: boolean
  ) {
    super(label, collapsibleState);

    if (clone && !isGroup) {
      this.description = `${(clone.similarity * 100).toFixed(1)}%`;
      this.tooltip = `${clone.target.filePath}:${clone.target.startLine}-${clone.target.endLine}`;
      this.contextValue = 'clone';

      // Set icon based on clone type
      this.iconPath = this.getIconForCloneType(clone.cloneType);

      // Set command to navigate to the clone
      this.command = {
        command: 'nlci.navigateToClone',
        title: 'Go to Clone',
        arguments: [clone.target.filePath, clone.target.startLine],
      };
    } else if (isGroup) {
      this.iconPath = new vscode.ThemeIcon('symbol-class');
      this.contextValue = 'cloneGroup';
    } else {
      this.iconPath = new vscode.ThemeIcon('file-code');
      this.contextValue = 'file';
    }
  }

  private getIconForCloneType(cloneType: string): vscode.ThemeIcon {
    switch (cloneType) {
      case 'type-1':
        return new vscode.ThemeIcon('copy', new vscode.ThemeColor('charts.red'));
      case 'type-2':
        return new vscode.ThemeIcon('copy', new vscode.ThemeColor('charts.orange'));
      case 'type-3':
        return new vscode.ThemeIcon('copy', new vscode.ThemeColor('charts.yellow'));
      case 'type-4':
        return new vscode.ThemeIcon('copy', new vscode.ThemeColor('charts.green'));
      default:
        return new vscode.ThemeIcon('copy');
    }
  }
}

/**
 * Tree data provider for code clones
 */
export class CloneTreeProvider implements vscode.TreeDataProvider<CloneTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<CloneTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private clonesByFile: Map<string, CloneResult[]> = new Map();

  constructor(private readonly service: NlciService) {}

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this.clonesByFile.clear();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item for display
   */
  getTreeItem(element: CloneTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of a tree item
   */
  async getChildren(element?: CloneTreeItem): Promise<CloneTreeItem[]> {
    if (!this.service.hasIndex()) {
      return [
        new CloneTreeItem(
          'No index. Run "NLCI: Scan Workspace"',
          vscode.TreeItemCollapsibleState.None
        ),
      ];
    }

    if (!element) {
      // Root level: show files with clones
      return this.getFileItems();
    }

    if (element.filePath && !element.clone) {
      // File level: show clones in this file
      return this.getCloneItems(element.filePath);
    }

    return [];
  }

  /**
   * Get file-level tree items
   */
  private async getFileItems(): Promise<CloneTreeItem[]> {
    try {
      const allClones = await this.service.getAllClones();

      // Group clones by source file
      this.clonesByFile.clear();
      for (const clone of allClones) {
        const filePath = clone.source.filePath;
        if (!this.clonesByFile.has(filePath)) {
          this.clonesByFile.set(filePath, []);
        }
        this.clonesByFile.get(filePath)!.push(clone);
      }

      // Create tree items for each file
      const items: CloneTreeItem[] = [];
      for (const [filePath, clones] of this.clonesByFile) {
        const fileName = path.basename(filePath);
        const item = new CloneTreeItem(
          `${fileName} (${clones.length})`,
          vscode.TreeItemCollapsibleState.Collapsed,
          undefined,
          filePath
        );
        item.description = path.dirname(filePath);
        item.resourceUri = vscode.Uri.file(filePath);
        items.push(item);
      }

      if (items.length === 0) {
        return [new CloneTreeItem('No clones detected', vscode.TreeItemCollapsibleState.None)];
      }

      // Sort by number of clones (descending)
      return items.sort((a, b) => {
        const aCount = this.clonesByFile.get(a.filePath!)?.length || 0;
        const bCount = this.clonesByFile.get(b.filePath!)?.length || 0;
        return bCount - aCount;
      });
    } catch (error) {
      return [new CloneTreeItem(`Error: ${error}`, vscode.TreeItemCollapsibleState.None)];
    }
  }

  /**
   * Get clone-level tree items for a file
   */
  private getCloneItems(filePath: string): CloneTreeItem[] {
    const clones = this.clonesByFile.get(filePath) || [];

    return clones.map((clone) => {
      const targetFile = path.basename(clone.target.filePath);
      return new CloneTreeItem(
        `Line ${clone.source.startLine} → ${targetFile}:${clone.target.startLine}`,
        vscode.TreeItemCollapsibleState.None,
        clone,
        undefined,
        false
      );
    });
  }
}
