# Changelog

All notable changes to the Vuetiful Vuetify extension will be documented in this file.

## [Unreleased]

### Added

- **ESLint configuration** (.eslintrc.json) with TypeScript-specific rules
- **Prettier configuration** (.prettierrc) for consistent code formatting
- **Centralized logging system** (Logger utility class) that respects user configuration
- **File size protection** - CSS files larger than 50MB are rejected to prevent crashes
- **Request coalescing** - Multiple concurrent completion requests now share a single extraction operation
- **Workspace folder change detection** - Extension automatically re-extracts when workspace folders are added/removed
- **Configuration change monitoring** - Extension responds to configuration updates
- **Cancellation token support** - Hover and completion providers now properly cancel operations when user continues typing
- **Constants file** (src/constants.ts) - All magic numbers and strings extracted to named constants

### Changed

- **File watchers now enabled** - Extension automatically detects Vuetify version changes
- **Improved error handling** - All error types are now properly typed (unknown instead of any)
- **Enhanced logging** - All console.log/error calls replaced with structured Logger calls
- **Better disposal patterns** - All resources properly cleaned up on deactivation
  - VuetifyExtractor implements Disposable
  - VuetifyWatcher implements Disposable
  - Proper cleanup in deactivate() function
- **Null-safe hash calculation** - Cache hash errors now return null instead of empty string
- **Silent catch blocks fixed** - All previously silent errors now logged at appropriate levels

### Fixed

- **Memory leaks** - Maps and resources now properly cleared on disposal
- **Broken logging configuration** - `enableLogging` setting now actually controls logging behavior
- **Error reporting URLs** - Updated to point to actual repository (placeholder for now)
- **Type safety** - Removed usage of `any` types in error handling

### Improved

- **Package.json metadata** - Added license, repository, bugs URL, and enhanced keywords
- **Error messages** - More descriptive error messages with proper context
- **Code organization** - Consistent constant usage across all files
- **Performance** - Request coalescing prevents redundant extraction operations

### Technical Debt Addressed

- Removed unused `extension-test.ts` file (was not a real test)
- Fixed all TODO comments
- Added proper TypeScript error types throughout
- Improved code maintainability with centralized constants

## [0.1.0] - Initial Release

- Initial release with Vuetify 3 utility class autocomplete and hover support
