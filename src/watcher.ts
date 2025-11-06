import * as vscode from 'vscode';
import { VuetifyExtractor } from './extractor';
import { Logger } from './logger';
import {
  FILE_WATCHER_DEBOUNCE_MS,
  PACKAGE_JSON_PATTERN,
  VUETIFY_NODE_MODULES_PATTERNS,
  COMMAND_REFRESH_UTILITIES,
} from './constants';

/**
 * Watches for changes and triggers re-extraction
 */
export class VuetifyWatcher implements vscode.Disposable {
  private watchers: vscode.Disposable[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private logger: Logger;

  constructor(
    private context: vscode.ExtensionContext,
    private extractor: VuetifyExtractor
  ) {
    this.logger = new Logger('Watcher');
  }

  /**
   * Setup all watchers
   */
  setup(): void {
    this.watchPackageJson();
    this.watchNodeModules();
    this.setupManualRefresh();
  }

  /**
   * Watch package.json for version changes
   */
  private watchPackageJson(): void {
    const watcher = vscode.workspace.createFileSystemWatcher(
      PACKAGE_JSON_PATTERN,
      false, // don't ignore creates
      false, // don't ignore changes
      true   // ignore deletes
    );

    watcher.onDidChange(async (uri) => {
      this.logger.debug(`package.json changed: ${uri.fsPath}`);
      await this.handlePackageJsonChange(uri);
    });

    watcher.onDidCreate(async (uri) => {
      this.logger.debug(`package.json created: ${uri.fsPath}`);
      await this.handlePackageJsonChange(uri);
    });

    this.watchers.push(watcher);
  }

  /**
   * Handle package.json change
   */
  private async handlePackageJsonChange(uri: vscode.Uri): Promise<void> {
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const packageJson = JSON.parse(content.toString());

      // Check if Vuetify is in dependencies
      const hasVuetify =
        packageJson.dependencies?.vuetify ||
        packageJson.devDependencies?.vuetify;

      if (hasVuetify) {
        this.logger.info('Vuetify version may have changed, re-extracting...');
        this.debouncedExtract();
      }
    } catch (error) {
      this.logger.error('Error reading package.json', error);
    }
  }

  /**
   * Watch node_modules for Vuetify changes
   */
  private watchNodeModules(): void {
    // Watch for Vuetify package.json changes
    for (const pattern of VUETIFY_NODE_MODULES_PATTERNS) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidCreate(() => {
        this.logger.info('Vuetify installed, extracting utilities...');
        this.debouncedExtract();
      });

      watcher.onDidChange(() => {
        this.logger.info('Vuetify updated, re-extracting utilities...');
        this.debouncedExtract();
      });

      watcher.onDidDelete(() => {
        this.logger.info('Vuetify uninstalled, clearing cache...');
        void this.extractor.clear();
      });

      this.watchers.push(watcher);
    }
  }

  /**
   * Setup manual refresh command
   */
  private setupManualRefresh(): void {
    const command = vscode.commands.registerCommand(
      COMMAND_REFRESH_UTILITIES,
      async () => {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Refreshing Vuetify utilities...',
            cancellable: false
          },
          async () => {
            await this.extractor.extractAll(true);
            void vscode.window.showInformationMessage('Vuetify utilities refreshed!');
          }
        );
      }
    );

    this.watchers.push(command);
  }

  /**
   * Debounced extract to avoid too many rapid extractions
   */
  private debouncedExtract(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      void this.extractor.extractAll(true);
    }, FILE_WATCHER_DEBOUNCE_MS);
  }

  /**
   * Dispose all watchers
   */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.watchers.forEach(w => w.dispose());
    this.watchers = [];
  }
}
