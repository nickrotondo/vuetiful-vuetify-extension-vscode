import * as vscode from 'vscode';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { CacheEntry, UtilityClass } from './types';
import { Logger } from './logger';

/**
 * Two-tier cache system (memory + workspace state)
 */
export class VuetifyCache {
  private memoryCache = new Map<string, CacheEntry>();

  constructor(
    private context: vscode.ExtensionContext,
    private logger: Logger
  ) {}

  /**
   * Get cached utilities for a workspace
   * Validates cache if cssFilePath is provided
   */
  async get(
    workspacePath: string,
    version: string,
    cssFilePath?: string
  ): Promise<UtilityClass[] | null> {
    // Try memory cache first
    const memEntry = this.memoryCache.get(workspacePath);
    if (memEntry && memEntry.version === version) {
      // Validate if CSS path provided
      if (cssFilePath) {
        const isValid = await this.isValid(workspacePath, version, cssFilePath);
        if (!isValid) {
          this.logger.debug(`Memory cache invalid for ${workspacePath}, hash mismatch`);
          await this.invalidate(workspacePath);
          return null;
        }
      }
      this.logger.debug(`Memory cache hit for ${workspacePath}`);
      return memEntry.utilities;
    }

    // Try workspace state (persisted disk cache)
    const cacheKey = this.getCacheKey(workspacePath, version);
    const diskEntry = this.context.workspaceState.get<CacheEntry>(cacheKey);

    if (diskEntry && diskEntry.version === version) {
      // Validate if CSS path provided
      if (cssFilePath) {
        const isValid = await this.isValid(workspacePath, version, cssFilePath);
        if (!isValid) {
          this.logger.debug(`Disk cache invalid for ${workspacePath}, hash mismatch`);
          await this.invalidate(workspacePath);
          return null;
        }
      }
      this.logger.debug(`Disk cache hit for ${workspacePath}`);

      // Restore to memory cache
      this.memoryCache.set(workspacePath, diskEntry);
      return diskEntry.utilities;
    }

    this.logger.debug(`Cache miss for ${workspacePath}`);
    return null;
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

    // Store in workspace state (persisted)
    const cacheKey = this.getCacheKey(workspacePath, version);
    await this.context.workspaceState.update(cacheKey, entry);

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

    const cacheKey = this.getCacheKey(workspacePath, version);
    const diskEntry = this.context.workspaceState.get<CacheEntry>(cacheKey);

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

    // Clean up workspace state entries
    const keys = this.context.workspaceState.keys();
    for (const key of keys) {
      if (key.startsWith(`vuetify-cache-${this.sanitizePath(workspacePath)}`)) {
        await this.context.workspaceState.update(key, undefined);
      }
    }

    this.logger.debug(`Invalidated cache for ${workspacePath}`);
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    const keys = this.context.workspaceState.keys();
    for (const key of keys) {
      if (key.startsWith('vuetify-cache-')) {
        await this.context.workspaceState.update(key, undefined);
      }
    }

    this.logger.info('Cleared all caches');
  }

  /**
   * Generate cache key
   */
  private getCacheKey(workspacePath: string, version: string): string {
    const sanitized = this.sanitizePath(workspacePath);
    return `vuetify-cache-${sanitized}-${version}`;
  }

  /**
   * Sanitize path for use in cache key
   */
  private sanitizePath(path: string): string {
    return path.replace(/[^a-zA-Z0-9]/g, '-');
  }

  /**
   * Calculate MD5 hash of file
   */
  private async calculateFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      this.logger.error(`Error calculating hash for ${filePath}`, error);
      return null;
    }
  }
}
