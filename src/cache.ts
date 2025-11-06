import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { CacheEntry, UtilityClass } from './types';
import { Logger } from './logger';

/**
 * Two-tier cache system (memory + file storage)
 */
export class VuetifyCache {
  private memoryCache = new Map<string, CacheEntry>();
  private migrated = false;

  constructor(
    private context: vscode.ExtensionContext,
    private logger: Logger
  ) {}

  /**
   * Migrate old workspace state entries to file storage
   * This is a one-time operation to clean up legacy cache data
   */
  async migrateFromWorkspaceState(): Promise<void> {
    if (this.migrated) {
      return;
    }

    try {
      const keys = this.context.workspaceState.keys();
      let removedCount = 0;

      for (const key of keys) {
        if (key.startsWith('vuetify-cache-')) {
          await this.context.workspaceState.update(key, undefined);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        this.logger.info(`Migrated cache: removed ${removedCount} old workspace state entries`);
      }

      this.migrated = true;
    } catch (error) {
      this.logger.error('Error during cache migration', error);
    }
  }

  /**
   * Get cached utilities for a workspace
   * Validates cache if cssFilePath is provided
   */
  async get(
    workspacePath: string,
    version: string,
    cssFilePath?: string
  ): Promise<UtilityClass[] | undefined> {
    // Try memory cache first
    const memEntry = this.memoryCache.get(workspacePath);
    if (memEntry && memEntry.version === version) {
      // Validate if CSS path provided
      if (cssFilePath) {
        const isValid = await this.isValid(workspacePath, version, cssFilePath);
        if (!isValid) {
          this.logger.debug(`Memory cache invalid for ${workspacePath}, hash mismatch`);
          await this.invalidate(workspacePath);
          return undefined;
        }
      }
      this.logger.debug(`Memory cache hit for ${workspacePath}`);
      return memEntry.utilities;
    }

    // Try disk cache (persisted file storage)
    const diskEntry = await this.readFromDisk(workspacePath, version);

    if (diskEntry && diskEntry.version === version) {
      // Validate if CSS path provided
      if (cssFilePath) {
        const isValid = await this.isValid(workspacePath, version, cssFilePath);
        if (!isValid) {
          this.logger.debug(`Disk cache invalid for ${workspacePath}, hash mismatch`);
          await this.invalidate(workspacePath);
          return undefined;
        }
      }
      this.logger.debug(`Disk cache hit for ${workspacePath}`);

      // Restore to memory cache
      this.memoryCache.set(workspacePath, diskEntry);
      return diskEntry.utilities;
    }

    this.logger.debug(`Cache miss for ${workspacePath}`);
    return undefined;
  }

  /**
   * Store utilities in cache
   */
  async set(
    workspacePath: string,
    version: string,
    utilities: UtilityClass[],
    cssFilePath: string
  ): Promise<void> {
    const hash = await this.calculateFileHash(cssFilePath);
    const entry: CacheEntry = {
      version,
      timestamp: Date.now(),
      utilities,
      hash
    };

    // Store in memory
    this.memoryCache.set(workspacePath, entry);

    // Store to disk
    await this.writeToDisk(workspacePath, version, entry);

    this.logger.debug(`Cached ${utilities.length} utilities for ${workspacePath} (v${version})`);
  }

  /**
   * Validate cache by checking CSS file hash
   */
  async isValid(
    workspacePath: string,
    version: string,
    cssFilePath: string
  ): Promise<boolean> {
    const cached = await this.get(workspacePath, version);
    if (!cached) {
      return false;
    }

    const diskEntry = await this.readFromDisk(workspacePath, version);

    if (!diskEntry) {
      return false;
    }

    const currentHash = await this.calculateFileHash(cssFilePath);
    if (!currentHash) {
      return false;
    }

    return currentHash === diskEntry.hash;
  }

  /**
   * Invalidate cache for a workspace
   */
  async invalidate(workspacePath: string): Promise<void> {
    // Remove from memory
    this.memoryCache.delete(workspacePath);

    // Delete cache files from disk
    await this.deleteFromDisk(workspacePath);

    this.logger.debug(`Invalidated cache for ${workspacePath}`);
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    // Delete all cache files
    await this.clearDiskCache();

    this.logger.info('Cleared all caches');
  }

  /**
   * Generate cache filename
   * Uses SHA-256 hash of workspace path for cross-platform compatibility
   */
  private getCacheKey(workspacePath: string, version: string): string {
    const pathHash = crypto.createHash('sha256').update(workspacePath).digest('hex').substring(0, 16);
    return `vuetify-cache-${pathHash}-${version}.json`;
  }

  /**
   * Get cache file path
   */
  private getCacheFilePath(workspacePath: string, version: string): vscode.Uri | undefined {
    if (!this.context.storageUri) {
      this.logger.error('Storage URI not available');
      return undefined;
    }
    const filename = this.getCacheKey(workspacePath, version);
    return vscode.Uri.joinPath(this.context.storageUri, filename);
  }

  /**
   * Read cache entry from disk
   */
  private async readFromDisk(workspacePath: string, version: string): Promise<CacheEntry | undefined> {
    const fileUri = this.getCacheFilePath(workspacePath, version);
    if (!fileUri) {
      return undefined;
    }

    try {
      const content = await vscode.workspace.fs.readFile(fileUri);
      const json = new TextDecoder().decode(content);
      return JSON.parse(json) as CacheEntry;
    } catch (error) {
      // File doesn't exist or is invalid
      return undefined;
    }
  }

  /**
   * Write cache entry to disk
   */
  private async writeToDisk(workspacePath: string, version: string, entry: CacheEntry): Promise<void> {
    const fileUri = this.getCacheFilePath(workspacePath, version);
    if (!fileUri) {
      this.logger.error('Cannot write cache: storage URI not available');
      return;
    }

    try {
      // Ensure storage directory exists
      await vscode.workspace.fs.createDirectory(this.context.storageUri!);

      const json = JSON.stringify(entry);
      const content = new TextEncoder().encode(json);
      await vscode.workspace.fs.writeFile(fileUri, content);
    } catch (error) {
      this.logger.error(`Error writing cache to disk for ${workspacePath}`, error);
    }
  }

  /**
   * Delete cache files for a specific workspace
   */
  private async deleteFromDisk(workspacePath: string): Promise<void> {
    if (!this.context.storageUri) {
      return;
    }

    try {
      const pathHash = crypto.createHash('sha256').update(workspacePath).digest('hex').substring(0, 16);
      const files = await vscode.workspace.fs.readDirectory(this.context.storageUri);

      for (const [filename] of files) {
        if (filename.startsWith(`vuetify-cache-${pathHash}`)) {
          const fileUri = vscode.Uri.joinPath(this.context.storageUri, filename);
          await vscode.workspace.fs.delete(fileUri);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
  }

  /**
   * Clear all cache files from disk
   */
  private async clearDiskCache(): Promise<void> {
    if (!this.context.storageUri) {
      return;
    }

    try {
      const files = await vscode.workspace.fs.readDirectory(this.context.storageUri);

      for (const [filename] of files) {
        if (filename.startsWith('vuetify-cache-')) {
          const fileUri = vscode.Uri.joinPath(this.context.storageUri, filename);
          await vscode.workspace.fs.delete(fileUri);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
  }

  /**
   * Calculate SHA-256 hash of file
   * Uses SHA-256 instead of MD5 for better security
   * Uses VSCode workspace.fs API for compatibility with remote workspaces
   */
  private async calculateFileHash(filePath: string): Promise<string | undefined> {
    if (!filePath || typeof filePath !== 'string') {
      this.logger.error(`calculateFileHash called with invalid filePath: ${filePath}`);
      return undefined;
    }

    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      this.logger.error(`Error calculating hash for ${filePath}`, error);
      return undefined;
    }
  }
}
