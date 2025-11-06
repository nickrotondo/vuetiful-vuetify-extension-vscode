/**
 * Constants used throughout the extension
 */

// File watching
export const FILE_WATCHER_DEBOUNCE_MS = 1000;

// File size limits
export const MAX_CSS_FILE_SIZE_MB = 50;
export const MAX_CSS_FILE_SIZE_BYTES = MAX_CSS_FILE_SIZE_MB * 1024 * 1024;

// Monorepo subdirectories to search for Vuetify
export const MONOREPO_SUBDIRECTORIES = [
  'frontend',
  'client',
  'web',
  'app',
  'ui',
  'packages',
  'apps',
] as const;

// Possible CSS file paths within Vuetify package
export const VUETIFY_CSS_PATHS = [
  'dist/vuetify.css',
  'dist/vuetify.min.css',
  'lib/styles/main.css',
] as const;

// File patterns for watchers
export const PACKAGE_JSON_PATTERN = '**/package.json';
export const VUETIFY_NODE_MODULES_PATTERNS = [
  '**/node_modules/vuetify/package.json',
  '**/node_modules/.pnpm/vuetify@*/node_modules/vuetify/package.json',
] as const;

// Utility class prefixes
export const UTILITY_PREFIXES = [
  'ma-',
  'mt-',
  'mr-',
  'mb-',
  'ml-',
  'ms-',
  'me-',
  'mx-',
  'my-',
  'pa-',
  'pt-',
  'pr-',
  'pb-',
  'pl-',
  'ps-',
  'pe-',
  'px-',
  'py-',
  'd-',
  'flex-',
  'align-',
  'justify-',
  'align-self-',
  'align-content-',
  'order-',
  'text-',
  'font-',
  'bg-',
  'elevation-',
  'rounded',
  'border-',
  'w-',
  'h-',
  'min-w-',
  'max-w-',
  'min-h-',
  'max-h-',
  'position-',
  'top-',
  'right-',
  'bottom-',
  'left-',
  'ga-',
  'gr-',
  'gc-',
  'overflow-',
  'float-',
  'opacity-',
] as const;

// Configuration keys
export const CONFIG_SECTION = 'vuetifulVuetify';
export const CONFIG_SHOW_WARNINGS = 'showWarnings';
export const CONFIG_ENABLE_LOGGING = 'enableLogging';

// Output channel name
export const OUTPUT_CHANNEL_NAME = 'Vuetiful Vuetify';

// Command IDs
export const COMMAND_REFRESH_UTILITIES = 'vuetifulVuetify.refreshUtilities';
