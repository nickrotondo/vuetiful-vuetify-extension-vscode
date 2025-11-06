import * as vscode from 'vscode';
import { VuetifyExtractor } from './extractor';
import { VuetifyWatcher } from './watcher';
import { VuetifyCompletionProvider } from './providers/completionProvider';
import { VuetifyHoverProvider } from './providers/hoverProvider';
import { Logger } from './logger';

// Store references for cleanup
let extractor: VuetifyExtractor | undefined;
let watcher: VuetifyWatcher | undefined;
let logger: Logger | undefined;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext) {
  // Create logger
  logger = new Logger('Extension');
  context.subscriptions.push(logger);

  logger.info('Extension activating...');

  // Create extractor
  extractor = new VuetifyExtractor(context);
  context.subscriptions.push(extractor);

  // Register completion provider
  const completionProvider = new VuetifyCompletionProvider(extractor);
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      ['vue', 'html', 'javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
      completionProvider,
      ' ', '"', "'", '-'
    )
  );

  // Register hover provider
  const hoverProvider = new VuetifyHoverProvider(extractor);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      ['vue', 'html', 'javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
      hoverProvider
    )
  );

  // Setup file watchers
  watcher = new VuetifyWatcher(context, extractor);
  watcher.setup();
  context.subscriptions.push(watcher);

  // Listen for workspace folder changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async event => {
      logger?.info(`Workspace folders changed: +${event.added.length}, -${event.removed.length}`);

      // Re-extract utilities when workspace folders change
      if (event.added.length > 0 || event.removed.length > 0) {
        await extractor.extractAll(true);
      }
    })
  );

  // Extract utilities in background
  setImmediate(() => {
    extractor.extractAll().catch(err => {
      logger?.error('Extraction failed during activation', err);
    });
  });

  logger.info('Extension activated');
}

/**
 * Extension deactivation
 */
export function deactivate() {
  logger?.info('Extension deactivating...');

  // Clean up resources
  if (extractor) {
    extractor.dispose();
    extractor = undefined;
  }

  if (watcher) {
    watcher.dispose();
    watcher = undefined;
  }

  logger?.info('Extension deactivated');

  // Dispose logger last
  if (logger) {
    logger.dispose();
    logger = undefined;
  }
}
