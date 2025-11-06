import * as vscode from 'vscode';
import { VuetifyFinder } from './finder';
import { CSSParser } from './parser';
import { VuetifyCache } from './cache';
import { UtilityClass, VuetifyInstallation } from './types';
import { Logger } from './logger';

/**
 * Main extractor orchestrating utility class extraction
 */
export class VuetifyExtractor implements vscode.Disposable {
  private finder: VuetifyFinder;
  private parser: CSSParser;
  private cache: VuetifyCache;
  private logger: Logger;
  private installations = new Map<string, VuetifyInstallation>();
  private utilities = new Map<string, UtilityClass[]>();
  private extractionPromise: Promise<void> | null = null;
  private isExtracted = false;
  private abortController: AbortController | null = null;
  private allUtilitiesCache: UtilityClass[] | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.logger = new Logger('Extractor');
    this.finder = new VuetifyFinder(this.logger);
    this.parser = new CSSParser(this.logger);
    this.cache = new VuetifyCache(context, this.logger);
  }

  /**
   * Extract utilities for all workspaces
   * Cancels any ongoing extraction before starting
   */
  async extractAll(forceRefresh = false): Promise<void> {
    // Cancel any ongoing extraction
    if (this.abortController) {
      this.abortController.abort();
      this.logger.debug('Cancelled ongoing extraction');
    }

    // Create new abort controller for this extraction
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      this.logger.info('Starting utility extraction...');

      const installations = await this.finder.findAll();

      // Check if cancelled after async operation
      if (signal.aborted) {
        this.logger.debug('Extraction cancelled after finding installations');
        return;
      }

      if (installations.size === 0) {
        this.handleNoVuetifyFound();
        this.isExtracted = true;
        return;
      }

      this.logger.info(`Found ${installations.size} Vuetify installation(s)`);

      for (const [workspacePath, installation] of installations) {
        // Check if cancelled before each workspace
        if (signal.aborted) {
          this.logger.debug('Extraction cancelled during workspace processing');
          return;
        }

        try {
          await this.extractForWorkspace(installation, forceRefresh);
        } catch (error) {
          this.handleExtractionError(workspacePath, error);
        }
      }

      this.isExtracted = true;
      this.logger.info('Extraction completed');
    } catch (error) {
      if (signal.aborted) {
        this.logger.debug('Extraction cancelled');
        return;
      }
      this.handleCriticalError(error);
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Extract utilities for a specific workspace
   */
  private async extractForWorkspace(
    installation: VuetifyInstallation,
    forceRefresh: boolean
  ): Promise<void> {
    const { workspacePath, cssPath, version } = installation;

    this.logger.debug(`Processing workspace: ${workspacePath}`);
    this.logger.debug(`Vuetify version: ${version}`);
    this.logger.debug(`CSS file: ${cssPath}`);

    // Check cache unless force refresh
    if (!forceRefresh) {
      const cached = await this.cache.get(workspacePath, version, cssPath);
      if (cached) {
        this.logger.debug(`Using cached utilities (${cached.length} classes)`);
        this.utilities.set(workspacePath, cached);
        this.installations.set(workspacePath, installation);
        return;
      }
    }

    // Extract utilities
    this.logger.info('Parsing CSS file...');
    const utilities = await this.parser.parseCSS(cssPath);

    // Cache results
    await this.cache.set(workspacePath, version, utilities, cssPath);

    // Store in memory
    this.utilities.set(workspacePath, utilities);
    this.installations.set(workspacePath, installation);

    // Invalidate cache since utilities changed
    this.allUtilitiesCache = null;

    this.logger.info(`Successfully extracted ${utilities.length} utility classes`);
  }

  /**
   * Get utilities for a specific document
   */
  getUtilities(document: vscode.TextDocument): UtilityClass[] {
    const workspace = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspace) {
      return [];
    }

    return this.utilities.get(workspace.uri.fsPath) || [];
  }

  /**
   * Get all utilities across all workspaces
   * Results are memoized for performance
   */
  getAllUtilities(): UtilityClass[] {
    // Return cached result if available
    if (this.allUtilitiesCache !== null) {
      return this.allUtilitiesCache;
    }

    // Compute and cache result
    const all: UtilityClass[] = [];
    for (const utilities of this.utilities.values()) {
      all.push(...utilities);
    }
    this.allUtilitiesCache = all;
    return all;
  }

  /**
   * Ensure utilities are extracted (lazy extraction with request coalescing)
   */
  async ensureExtracted(): Promise<void> {
    // If already extracted, return immediately
    if (this.isExtracted) {
      return;
    }

    // If extraction is already in progress, return the existing promise
    if (this.extractionPromise) {
      this.logger.debug('Coalescing extraction request with ongoing extraction');
      return this.extractionPromise;
    }

    // Start new extraction and cache the promise
    this.extractionPromise = this.extractAll()
      .finally(() => {
        // Clear the promise when done
        this.extractionPromise = null;
      });

    return this.extractionPromise;
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.utilities.clear();
    this.installations.clear();
    this.isExtracted = false;
    this.extractionPromise = null;
    this.allUtilitiesCache = null;
    await this.cache.clear();
    this.logger.info('Cleared all data');
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Cancel any ongoing extraction
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.utilities.clear();
    this.installations.clear();
  }

  /**
   * Handle no Vuetify found
   */
  private handleNoVuetifyFound(): void {
    this.logger.info('Vuetify not found in any workspace');

    const config = vscode.workspace.getConfiguration('vuetifulVuetify');
    if (config.get('showWarnings', true)) {
      void vscode.window.showInformationMessage(
        'Vuetify not detected. Install Vuetify to enable utility class autocomplete.',
        'Learn More',
        "Don't Show Again"
      ).then(selection => {
        if (selection === 'Learn More') {
          void vscode.env.openExternal(vscode.Uri.parse('https://vuetifyjs.com/'));
        } else if (selection === "Don't Show Again") {
          void config.update('showWarnings', false, vscode.ConfigurationTarget.Workspace);
        }
      });
    }
  }

  /**
   * Handle extraction error for specific workspace
   */
  private handleExtractionError(workspacePath: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Error extracting utilities for ${workspacePath}`, error);

    const isFileNotFound = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    const isSyntaxError = error instanceof SyntaxError;

    if (isFileNotFound) {
      void vscode.window.showErrorMessage(
        'Vuetify CSS file not found. The package may be corrupted.',
        'Reinstall Vuetify'
      ).then(async selection => {
        if (selection === 'Reinstall Vuetify') {
          // Use Task API instead of terminal to prevent command injection
          const task = new vscode.Task(
            { type: 'shell' },
            vscode.TaskScope.Workspace,
            'Reinstall Vuetify',
            'npm',
            new vscode.ShellExecution('npm', ['install', '--force', 'vuetify'])
          );
          await vscode.tasks.executeTask(task);
        }
      });
    } else if (isSyntaxError) {
      void vscode.window.showErrorMessage(
        'Failed to parse Vuetify CSS. The file may be corrupted.',
        'View Logs'
      ).then(selection => {
        if (selection === 'View Logs') {
          this.logger.show();
        }
      });
    } else {
      void vscode.window.showErrorMessage(
        `Vuetify extraction failed: ${errorMessage}`,
        'View Logs'
      ).then(selection => {
        if (selection === 'View Logs') {
          this.logger.show();
        }
      });
    }
  }

  /**
   * Handle critical error
   */
  private handleCriticalError(error: unknown): void {
    this.logger.error('Critical error during extraction', error);

    void vscode.window.showErrorMessage(
      'Vuetiful Vuetify extension encountered a critical error.',
      'View Logs',
      'Report Issue'
    ).then(selection => {
      if (selection === 'View Logs') {
        this.logger.show();
      } else if (selection === 'Report Issue') {
        void vscode.env.openExternal(
          vscode.Uri.parse('https://github.com/your-username/vuetiful-vuetify-extension/issues/new')
        );
      }
    });
  }
}
