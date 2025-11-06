/**
 * Represents a single Vuetify utility class with its CSS properties
 */
export interface UtilityClass {
  /** The class name (e.g., "ma-2", "d-flex") */
  name: string;

  /** The full CSS selector (e.g., ".ma-2", ".d-flex") */
  selector: string;

  /** CSS properties and their values */
  properties: Record<string, string>;

  /** Category for grouping (e.g., "spacing", "display", "flexbox") */
  category: string;

  /** Optional human-readable description */
  description?: string;
}

/**
 * Cache entry stored in workspace state
 */
export interface CacheEntry {
  /** Vuetify version */
  version: string;

  /** Timestamp when cached */
  timestamp: number;

  /** Extracted utility classes */
  utilities: UtilityClass[];

  /** MD5 hash of CSS file for validation */
  hash: string;
}

/**
 * Vuetify installation information
 */
export interface VuetifyInstallation {
  /** Path to Vuetify package directory */
  packagePath: string;

  /** Path to CSS file */
  cssPath: string;

  /** Vuetify version */
  version: string;

  /** Workspace folder path */
  workspacePath: string;
}

/**
 * Utility class categories
 */
export enum UtilityCategory {
  Spacing = 'spacing',
  Display = 'display',
  Flexbox = 'flexbox',
  Typography = 'typography',
  Background = 'background',
  Text = 'text',
  Elevation = 'elevation',
  Border = 'border',
  Sizing = 'sizing',
  Position = 'position',
  Gap = 'gap',
  Other = 'other'
}

/**
 * Extension configuration
 */
export interface ExtensionConfig {
  showWarnings: boolean;
  enableLogging: boolean;
}
