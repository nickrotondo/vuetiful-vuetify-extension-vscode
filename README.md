# Vuetiful Vuetify

IntelliSense for Vuetify 3 utility classes - powerful autocomplete and hover documentation for Vue + Vuetify projects.

## Features

- **Smart Autocomplete**: Get instant suggestions for Vuetify utility classes in `class` attributes
- **Hover Documentation**: View computed CSS values and descriptions by hovering over class names
- **Runtime Extraction**: Automatically extracts utility classes from your installed Vuetify package
- **Persistent Cache**: Fast startup with intelligent caching between sessions
- **Auto-Refresh**: Automatically updates when Vuetify version changes
- **Multi-Workspace Support**: Works seamlessly with monorepos and multi-root workspaces

## Supported File Types

- Vue Single File Components (`.vue`)
- HTML (`.html`)
- JavaScript (`.js`, `.jsx`)
- TypeScript (`.ts`, `.tsx`)

## Usage

1. Install Vuetify 3 in your project:

   ```bash
   npm install vuetify
   ```

2. Install this extension from the VSCode marketplace

3. Start typing Vuetify utility classes in your templates:

   ```vue
   <template>
     <div class="ma-">
       <!-- Autocomplete will suggest: ma-0, ma-1, ma-2, ... -->
     </div>
   </template>
   ```

4. Hover over any utility class to see its computed CSS values

## Commands

- **Vuetify: Refresh Utility Classes** - Manually refresh the extracted utilities (useful after updating Vuetify)

## Settings

- `vuetifulVuetify.showWarnings` - Show warning messages when Vuetify is not detected (default: `true`)
- `vuetifulVuetify.enableLogging` - Enable detailed logging to output channel (default: `false`)

## Requirements

- Vuetify 3.x must be installed in your workspace
- Node.js project with `node_modules` directory

## How It Works

This extension works by:

1. Finding Vuetify in your workspace's `node_modules`
2. Parsing the compiled CSS file to extract all utility classes
3. Caching the results for fast subsequent startups
4. Providing intelligent completions and hover information

## Supported Utility Categories

- **Spacing**: `ma-*`, `pa-*`, `mt-*`, `ml-*`, etc.
- **Display**: `d-flex`, `d-block`, `d-none`, etc.
- **Flexbox**: `flex-row`, `justify-center`, `align-items-start`, etc.
- **Typography**: `text-h1`, `text-center`, `font-weight-bold`, etc.
- **Colors**: `bg-primary`, `text-error`, etc.
- **Elevation**: `elevation-0` through `elevation-24`
- **Borders**: `rounded-*`, `border-*`
- **Sizing**: `w-100`, `h-auto`, `min-w-*`, etc.
- **Position**: `position-relative`, `position-absolute`, etc.
- **Gap**: `ga-*`, `gr-*`, `gc-*`

## Troubleshooting

### Extension not working?

1. Make sure Vuetify 3 is installed in your project
2. Try running the "Vuetify: Refresh Utility Classes" command
3. Check the output channel ("Vuetiful Vuetify") for errors
4. Enable logging with `vuetifulVuetify.enableLogging: true`

### Performance issues?

The extension caches extracted utilities. If you experience slow performance:

1. Check if you have very large CSS files
2. Try restarting VSCode to clear and rebuild the cache

## Contributing

Issues and pull requests welcome!

## License

MIT
