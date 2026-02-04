/**
 * NLCI VS Code Extension
 *
 * Neural-LSH Code Intelligence - Find similar code blocks in O(1) time
 *
 * @packageDocumentation
 */

import * as vscode from 'vscode';
import { NlciService } from './services/nlci-service';
import { CloneTreeProvider } from './providers/tree-provider';
import { CloneCodeLensProvider } from './providers/codelens-provider';
import { CloneDiagnosticsProvider } from './providers/diagnostics-provider';
import { registerCommands } from './commands';
import { StatusBarManager } from './ui/status-bar';
import { Logger } from './utils/logger';

let nlciService: NlciService | undefined;
let disposables: vscode.Disposable[] = [];

/**
 * Activates the NLCI extension
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = new Logger('NLCI');
  logger.info('Activating NLCI extension...');

  try {
    // Initialize the NLCI service
    nlciService = new NlciService(context);
    await nlciService.initialize();

    // Create providers
    const treeProvider = new CloneTreeProvider(nlciService);
    const codeLensProvider = new CloneCodeLensProvider(nlciService);
    const diagnosticsProvider = new CloneDiagnosticsProvider(nlciService);

    // Create status bar
    const statusBar = new StatusBarManager(nlciService);

    // Register tree view
    const treeView = vscode.window.createTreeView('nlciClones', {
      treeDataProvider: treeProvider,
      showCollapseAll: true,
    });

    // Register code lens provider
    const codeLensDisposable = vscode.languages.registerCodeLensProvider(
      { scheme: 'file' },
      codeLensProvider
    );

    // Register commands
    const commandDisposables = registerCommands(
      context,
      nlciService,
      treeProvider,
      diagnosticsProvider
    );

    // Subscribe to configuration changes
    const configDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('nlci')) {
        nlciService?.reloadConfiguration();
        codeLensProvider.refresh();
        diagnosticsProvider.refresh();
      }
    });

    // Subscribe to document changes
    const docChangeDisposable = vscode.workspace.onDidSaveTextDocument(async (doc) => {
      if (nlciService?.isEnabled()) {
        await nlciService.updateDocument(doc);
        void diagnosticsProvider.updateDiagnostics(doc);
        treeProvider.refresh();
      }
    });

    // Add all disposables
    disposables.push(
      treeView,
      codeLensDisposable,
      configDisposable,
      docChangeDisposable,
      statusBar,
      diagnosticsProvider,
      ...commandDisposables
    );

    context.subscriptions.push(...disposables);

    // Set context for conditional UI
    await vscode.commands.executeCommand('setContext', 'nlci.hasIndex', nlciService.hasIndex());

    // Auto-scan if enabled
    const config = vscode.workspace.getConfiguration('nlci');
    if (config.get<boolean>('autoScan', false)) {
      await vscode.commands.executeCommand('nlci.scan');
    }

    logger.info('NLCI extension activated successfully');
  } catch (error) {
    logger.error('Failed to activate NLCI extension', error);
    void vscode.window.showErrorMessage(`NLCI: Failed to activate extension: ${String(error)}`);
  }
}

/**
 * Deactivates the NLCI extension
 */
export function deactivate(): void {
  const logger = new Logger('NLCI');
  logger.info('Deactivating NLCI extension...');

  // Dispose all resources
  for (const disposable of disposables) {
    disposable.dispose();
  }
  disposables = [];

  // Cleanup service
  nlciService?.dispose();
  nlciService = undefined;

  logger.info('NLCI extension deactivated');
}
