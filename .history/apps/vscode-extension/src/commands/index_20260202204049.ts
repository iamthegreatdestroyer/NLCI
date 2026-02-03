/**
 * NLCI Commands
 *
 * Command implementations for the VS Code extension
 */

import * as vscode from 'vscode';
import { NlciService } from '../services/nlci-service';
import { CloneTreeProvider } from '../providers/tree-provider';
import { CloneDiagnosticsProvider } from '../providers/diagnostics-provider';
import { showCloneReport } from '../ui/report-panel';

/**
 * Register all NLCI commands
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  service: NlciService,
  treeProvider: CloneTreeProvider,
  diagnosticsProvider: CloneDiagnosticsProvider
): vscode.Disposable[] {
  return [
    // Scan workspace command
    vscode.commands.registerCommand('nlci.scan', async () => {
      await scanWorkspace(service, treeProvider, diagnosticsProvider);
    }),

    // Find similar code command
    vscode.commands.registerCommand('nlci.findSimilar', async () => {
      await findSimilarCode(service);
    }),

    // Show all clones command
    vscode.commands.registerCommand('nlci.showClones', async () => {
      await showAllClones(context, service);
    }),

    // Clear index command
    vscode.commands.registerCommand('nlci.clearIndex', async () => {
      await clearIndex(service, treeProvider, diagnosticsProvider);
    }),

    // Show statistics command
    vscode.commands.registerCommand('nlci.showStats', async () => {
      await showStatistics(service);
    }),

    // Open settings command
    vscode.commands.registerCommand('nlci.openSettings', () => {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:nlci.nlci-vscode'
      );
    }),

    // Navigate to clone command (internal)
    vscode.commands.registerCommand(
      'nlci.navigateToClone',
      async (filePath: string, line: number) => {
        const doc = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(doc);
        const position = new vscode.Position(line - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
      }
    ),
  ];
}

/**
 * Scan workspace and build index
 */
async function scanWorkspace(
  service: NlciService,
  treeProvider: CloneTreeProvider,
  diagnosticsProvider: CloneDiagnosticsProvider
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'NLCI: Scanning workspace',
      cancellable: false,
    },
    async (progress) => {
      try {
        await service.scanWorkspace((message, percent) => {
          progress.report({ message, increment: percent });
        });

        treeProvider.refresh();
        diagnosticsProvider.refresh();

        vscode.window.showInformationMessage('NLCI: Workspace scan complete!');
      } catch (error) {
        vscode.window.showErrorMessage(`NLCI: Scan failed: ${error}`);
      }
    }
  );
}

/**
 * Find similar code to the current selection
 */
async function findSimilarCode(service: NlciService): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('NLCI: No active editor');
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showWarningMessage('NLCI: Please select some code first');
    return;
  }

  const selectedText = editor.document.getText(selection);
  if (selectedText.trim().length < 10) {
    vscode.window.showWarningMessage(
      'NLCI: Please select a larger code block'
    );
    return;
  }

  try {
    const results = await service.findSimilar(
      selectedText,
      editor.document.uri.fsPath
    );

    if (results.length === 0) {
      vscode.window.showInformationMessage('NLCI: No similar code found');
      return;
    }

    // Show quick pick with results
    const items = results.map((result) => ({
      label: `$(file) ${result.target.filePath.split('/').pop()}`,
      description: `${(result.similarity * 100).toFixed(1)}% similar`,
      detail: `Line ${result.target.startLine}-${result.target.endLine}: ${result.target.content.substring(0, 100)}...`,
      result,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a similar code block to navigate to',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selected) {
      await vscode.commands.executeCommand(
        'nlci.navigateToClone',
        selected.result.target.filePath,
        selected.result.target.startLine
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(`NLCI: Find similar failed: ${error}`);
  }
}

/**
 * Show all clones in a webview panel
 */
async function showAllClones(
  context: vscode.ExtensionContext,
  service: NlciService
): Promise<void> {
  try {
    const clones = await service.getAllClones();

    if (clones.length === 0) {
      vscode.window.showInformationMessage('NLCI: No clones detected');
      return;
    }

    showCloneReport(context, clones);
  } catch (error) {
    vscode.window.showErrorMessage(`NLCI: Failed to get clones: ${error}`);
  }
}

/**
 * Clear the index
 */
async function clearIndex(
  service: NlciService,
  treeProvider: CloneTreeProvider,
  diagnosticsProvider: CloneDiagnosticsProvider
): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    'NLCI: Are you sure you want to clear the index?',
    { modal: true },
    'Yes',
    'No'
  );

  if (confirm === 'Yes') {
    await service.clearIndex();
    treeProvider.refresh();
    diagnosticsProvider.clear();
    vscode.window.showInformationMessage('NLCI: Index cleared');
  }
}

/**
 * Show index statistics
 */
async function showStatistics(service: NlciService): Promise<void> {
  const stats = service.getStats();

  if (!stats) {
    vscode.window.showWarningMessage(
      'NLCI: No index available. Please scan the workspace first.'
    );
    return;
  }

  const languages = Object.entries(stats.languages)
    .map(([lang, count]) => `${lang}: ${count}`)
    .join('\n');

  const message = `
NLCI Index Statistics

Total Files: ${stats.totalFiles}
Total Code Blocks: ${stats.totalBlocks}
Last Updated: ${stats.lastUpdated.toLocaleString()}

Languages:
${languages}
  `.trim();

  const doc = await vscode.workspace.openTextDocument({
    content: message,
    language: 'markdown',
  });

  await vscode.window.showTextDocument(doc, { preview: true });
}
