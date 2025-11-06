# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VSCode extension that provides IntelliSense (autocomplete and hover documentation) for Vuetify 3 utility classes. The extension extracts utility classes from the Vuetify CSS file at runtime and provides them as completions in Vue, HTML, JavaScript, and TypeScript files.

## Build & Development Commands

```bash
# Build the extension for production
npm run build

# Build in watch mode (development)
npm run watch

# Lint TypeScript files
npm run lint

# Package the extension for distribution
npm run package
```

## Extension Architecture

The extension uses a **pipeline architecture** with clear separation of concerns:

1. **VuetifyExtractor** (`src/extractor.ts`) - Main orchestrator that coordinates the extraction process
2. **VuetifyFinder** (`src/finder.ts`) - Locates Vuetify installations in workspace folders (handles monorepos, pnpm, yarn workspaces)
3. **CSSParser** (`src/parser.ts`) - Parses Vuetify CSS files using `css-tree` to extract utility classes
4. **VuetifyCache** (`src/cache.ts`) - Two-tier caching system (memory + VSCode workspace state)
5. **VuetifyWatcher** (`src/watcher.ts`) - Watches for changes to `package.json` and Vuetify CSS files
6. **Providers** (`src/providers/`) - VSCode language providers for completions and hover

### Data Flow

```
Extension Activation
  → VuetifyExtractor.extractAll()
    → VuetifyFinder.findAll() [locates Vuetify in node_modules]
    → VuetifyCache.get() [checks cache]
    → CSSParser.parseCSS() [if cache miss]
    → VuetifyCache.set() [stores results]
  → Providers registered with VSCode
```

### Key Design Patterns

- **Request coalescing**: `VuetifyExtractor.ensureExtracted()` prevents duplicate extraction requests during startup
- **Two-tier caching**: Memory cache for performance, workspace state for persistence across sessions
- **Multi-workspace support**: Each workspace folder can have its own Vuetify version
- **Lazy extraction**: Background extraction with `setImmediate()` to avoid blocking activation

## Type System

The core data structures are defined in `src/types.ts`:

- `UtilityClass` - Represents a single utility class with name, selector, CSS properties, category, and description
- `VuetifyInstallation` - Information about a Vuetify installation (paths, version, workspace)
- `CacheEntry` - Cache entry with version, timestamp, utilities, and CSS file hash for validation
- `UtilityCategory` - Enum for categorizing utilities (Spacing, Display, Flexbox, Typography, etc.)

## Testing & Debugging

Enable detailed logging for debugging:

1. Set `vuetifulVuetify.enableLogging: true` in VSCode settings
2. View logs in Output panel (select "Vuetiful Vuetify")

The extension uses a custom `Logger` class (`src/logger.ts`) that respects the logging configuration and provides contextual logging (each module creates its own logger instance).

## Monorepo & Package Manager Support

The finder (`src/finder.ts`) searches multiple locations:

- Standard `node_modules/vuetify`
- Parent `../node_modules/vuetify`
- Monorepo subdirectories (packages/, apps/, src/, etc.)
- pnpm store (`.pnpm/vuetify@version/node_modules/vuetify`)
- Yarn/npm workspaces (from package.json `workspaces` field)

## CSS Parsing Strategy

The parser (`src/parser.ts`) filters CSS rules to identify utility classes:

- Excludes complex selectors (descendants, children, siblings)
- Excludes attribute and pseudo-element selectors
- Matches utility prefixes from `UTILITY_PREFIXES` constant
- Generates human-readable descriptions based on category
- Categorizes utilities using pattern matching on class names

## Build System

The project uses `esbuild` (configured in `esbuild.config.js`) for fast bundling:

- Single-file bundle output to `out/extension.js`
- External VSCode API (not bundled)
- Production builds are minified

## TypeScript Configuration

Strict TypeScript configuration with:

- `strict: true` - All strict checks enabled
- `noUnusedLocals` and `noUnusedParameters` - Prevents unused code
- `noImplicitReturns` - Ensures all code paths return values
- Target ES2020 with CommonJS modules
