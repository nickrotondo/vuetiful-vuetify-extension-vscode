import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { VuetifyInstallation } from './types';
import { MONOREPO_SUBDIRECTORIES, VUETIFY_CSS_PATHS } from './constants';
import { Logger } from './logger';

/**
 * Finds Vuetify installations in workspace folders
 */
export class VuetifyFinder {
  constructor(private logger: Logger) {}
  /**
   * Find all Vuetify installations across workspace folders
   */
  async findAll(): Promise<Map<string, VuetifyInstallation>> {
    const installations = new Map<string, VuetifyInstallation>();

    if (!vscode.workspace.workspaceFolders) {
      return installations;
    }

    for (const folder of vscode.workspace.workspaceFolders) {
      if (!folder || !folder.uri || !folder.uri.fsPath) {
        continue;
      }

      try {
        const installation = await this.findInWorkspace(folder);
        if (installation) {
          installations.set(folder.uri.fsPath, installation);
        }
      } catch (error) {
        this.logger.error(`Error finding installation in ${folder.uri.fsPath}`, error);
      }
    }

    return installations;
  }

  /**
   * Find Vuetify installation in a specific workspace folder
   */
  async findInWorkspace(
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<VuetifyInstallation | null> {
    const workspacePath = workspaceFolder.uri.fsPath;

    // Search for Vuetify in various locations
    return await this.findInMonorepo(workspacePath);
  }

  /**
   * Find Vuetify in monorepo structures
   */
  private async findInMonorepo(workspaceRoot: string): Promise<VuetifyInstallation | null> {
    if (!workspaceRoot || typeof workspaceRoot !== 'string') {
      return null;
    }

    const searchPaths = [
      // Standard node_modules
      path.join(workspaceRoot, 'node_modules', 'vuetify'),
      // Parent node_modules (for nested packages)
      path.join(workspaceRoot, '..', 'node_modules', 'vuetify'),
      // Common monorepo subdirectories
      ...await this.findMonorepoSubdirectories(workspaceRoot),
      // pnpm store patterns
      ...await this.findPnpmPaths(workspaceRoot),
      // Yarn/npm workspace patterns
      ...await this.findWorkspacePaths(workspaceRoot)
    ];

    for (const searchPath of searchPaths) {
      if (!searchPath) continue;
      if (await this.pathExists(searchPath)) {
        return await this.createInstallation(searchPath, workspaceRoot);
      }
    }

    return null;
  }

  /**
   * Find Vuetify in common monorepo subdirectories
   */
  private async findMonorepoSubdirectories(root: string): Promise<string[]> {
    if (!root) return [];

    const paths: string[] = [];

    for (const subdir of MONOREPO_SUBDIRECTORIES) {
      const subdirPath = path.join(root, subdir);
      if (await this.pathExists(subdirPath)) {
        // Check if it has a node_modules/vuetify
        const vuetifyPath = path.join(subdirPath, 'node_modules', 'vuetify');
        if (await this.pathExists(vuetifyPath)) {
          paths.push(vuetifyPath);
        }

        // Also check if it's a packages/apps directory with nested projects
        if (subdir === 'packages' || subdir === 'apps') {
          try {
            const entries = await fs.promises.readdir(subdirPath);
            for (const entry of entries) {
              const nestedVuetifyPath = path.join(subdirPath, entry, 'node_modules', 'vuetify');
              if (await this.pathExists(nestedVuetifyPath)) {
                paths.push(nestedVuetifyPath);
              }
            }
          } catch (error) {
            this.logger.debug(`Could not read directory ${subdirPath}`, error);
          }
        }
      }
    }

    return paths;
  }

  /**
   * Find Vuetify in pnpm store
   */
  private async findPnpmPaths(root: string): Promise<string[]> {
    if (!root) return [];

    const pnpmStorePath = path.join(root, 'node_modules', '.pnpm');

    if (!await this.pathExists(pnpmStorePath)) {
      return [];
    }

    try {
      const entries = await fs.promises.readdir(pnpmStorePath);
      return entries
        .filter(entry => entry && entry.startsWith('vuetify@'))
        .map(entry => path.join(pnpmStorePath, entry, 'node_modules', 'vuetify'))
        .filter(p => p && typeof p === 'string');
    } catch (error) {
      this.logger.debug(`Error reading pnpm store at ${pnpmStorePath}`, error);
      return [];
    }
  }

  /**
   * Find Vuetify in workspace packages
   */
  private async findWorkspacePaths(root: string): Promise<string[]> {
    if (!root) return [];

    const packageJsonPath = path.join(root, 'package.json');

    if (!await this.pathExists(packageJsonPath)) {
      return [];
    }

    try {
      const packageJson = JSON.parse(
        await fs.promises.readFile(packageJsonPath, 'utf-8')
      );

      const workspaces = packageJson.workspaces || [];
      const workspacePaths: string[] = [];

      for (const workspace of workspaces) {
        if (!workspace || typeof workspace !== 'string') continue;
        const workspacePath = path.join(root, workspace, 'node_modules', 'vuetify');
        if (await this.pathExists(workspacePath)) {
          workspacePaths.push(workspacePath);
        }
      }

      return workspacePaths;
    } catch (error) {
      this.logger.debug(`Error finding workspace paths in ${root}`, error);
      return [];
    }
  }

  /**
   * Create VuetifyInstallation from package path
   */
  private async createInstallation(
    packagePath: string,
    workspacePath: string
  ): Promise<VuetifyInstallation | null> {
    if (!packagePath || !workspacePath) {
      return null;
    }

    try {
      // Read package.json for version
      const packageJsonPath = path.join(packagePath, 'package.json');
      const packageJson = JSON.parse(
        await fs.promises.readFile(packageJsonPath, 'utf-8')
      );

      // Find CSS file
      const cssPath = await this.findCssFile(packagePath);
      if (!cssPath) {
        return null;
      }

      return {
        packagePath,
        cssPath,
        version: packageJson.version,
        workspacePath
      };
    } catch (error) {
      this.logger.debug(`Error creating installation for ${packagePath}`, error);
      return null;
    }
  }

  /**
   * Find the Vuetify CSS file
   */
  private async findCssFile(packagePath: string): Promise<string | null> {
    if (!packagePath) {
      return null;
    }

    const possiblePaths = VUETIFY_CSS_PATHS.map(relativePath =>
      path.join(packagePath, relativePath)
    );

    for (const cssPath of possiblePaths) {
      if (await this.pathExists(cssPath)) {
        return cssPath;
      }
    }

    return null;
  }

  /**
   * Check if path exists
   */
  private async pathExists(p: string | undefined | null): Promise<boolean> {
    if (!p || typeof p !== 'string') {
      return false;
    }
    try {
      await fs.promises.access(p);
      return true;
    } catch {
      return false;
    }
  }
}
