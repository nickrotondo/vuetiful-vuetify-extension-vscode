import * as vscode from 'vscode';
import * as csstree from 'css-tree';
import { UtilityClass, UtilityCategory } from './types';
import { UTILITY_PREFIXES, MAX_CSS_FILE_SIZE_BYTES } from './constants';
import { Logger } from './logger';

/**
 * Parses Vuetify CSS files to extract utility classes
 */
export class CSSParser {
  private readonly utilityPrefixes = UTILITY_PREFIXES;

  constructor(private logger: Logger) {}

  /**
   * Parse CSS file and extract utility classes
   * Uses VSCode workspace.fs API for compatibility with remote workspaces
   */
  async parseCSS(cssFilePath: string): Promise<UtilityClass[]> {
    if (!cssFilePath || typeof cssFilePath !== 'string') {
      throw new Error(`parseCSS called with invalid cssFilePath: ${cssFilePath}`);
    }

    const startTime = Date.now();
    this.logger.debug(`Reading CSS file: ${cssFilePath}`);

    // Check file size before reading
    const uri = vscode.Uri.file(cssFilePath);
    const stats = await vscode.workspace.fs.stat(uri);
    if (stats.size > MAX_CSS_FILE_SIZE_BYTES) {
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      const maxSizeMB = (MAX_CSS_FILE_SIZE_BYTES / 1024 / 1024).toFixed(2);
      throw new Error(
        `CSS file too large (${sizeMB}MB). Maximum size is ${maxSizeMB}MB. ` +
        `This file may not be a standard Vuetify CSS file.`
      );
    }

    // Read file
    const contentBytes = await vscode.workspace.fs.readFile(uri);
    const cssContent = new TextDecoder('utf-8').decode(contentBytes);
    const sizeInMB = (cssContent.length / 1024 / 1024).toFixed(2);
    this.logger.debug(`Read ${sizeInMB}MB in ${Date.now() - startTime}ms`);

    // Parse CSS
    const parseStart = Date.now();
    const ast = csstree.parse(cssContent, {
      parseAtrulePrelude: false,
      parseValue: false
    });
    this.logger.debug(`Parsed CSS in ${Date.now() - parseStart}ms`);

    // Extract utilities
    const extractStart = Date.now();
    const utilities = this.extractUtilities(ast);
    this.logger.info(`Extracted ${utilities.length} utilities in ${Date.now() - extractStart}ms`);
    this.logger.debug(`Total parsing time: ${Date.now() - startTime}ms`);

    return utilities;
  }

  /**
   * Extract utility classes from CSS AST
   */
  private extractUtilities(ast: csstree.CssNode): UtilityClass[] {
    const utilities: UtilityClass[] = [];
    const seen = new Set<string>();

    csstree.walk(ast, (node) => {
      if (node.type === 'Rule') {
        const rule = node as csstree.Rule;
        this.extractUtilitiesFromRule(rule, utilities, seen);
      }
    });

    return utilities;
  }

  /**
   * Extract utilities from a single CSS rule
   */
  private extractUtilitiesFromRule(
    rule: csstree.Rule,
    utilities: UtilityClass[],
    seen: Set<string>
  ): void {
    const selector = csstree.generate(rule.prelude);

    if (!this.isUtilitySelector(selector)) {
      return;
    }

    // Extract properties
    const properties: Record<string, string> = {};
    csstree.walk(rule.block, (node) => {
      if (node.type === 'Declaration') {
        const decl = node as csstree.Declaration;
        properties[decl.property] = csstree.generate(decl.value);
      }
    });

    // Extract class names
    const classNames = this.extractClassNames(selector);

    for (const className of classNames) {
      // Skip duplicates
      if (seen.has(className)) {
        continue;
      }
      seen.add(className);

      const category = this.categorizeUtility(className);
      const description = this.generateDescription(className, properties);

      utilities.push({
        name: className,
        selector,
        properties,
        category,
        description
      });
    }
  }

  /**
   * Check if selector is a utility class
   */
  private isUtilitySelector(selector: string): boolean {
    // Skip complex selectors (component styles)
    if (selector.includes(' ') || selector.includes('>') || selector.includes('+')) {
      return false;
    }

    // Skip attribute and pseudo-element selectors
    if (selector.includes('[') || selector.includes('::')) {
      return false;
    }

    // Must start with a class
    if (!selector.startsWith('.')) {
      return false;
    }

    // Get base class name (before any pseudo-class)
    const baseClassName = selector.split(':')[0].substring(1);

    // Check if it matches utility patterns
    return this.utilityPrefixes.some(prefix => baseClassName.startsWith(prefix));
  }

  /**
   * Extract class names from selector
   */
  private extractClassNames(selector: string): string[] {
    const classRegex = /\.([a-zA-Z0-9_-]+)/g;
    const matches: string[] = [];
    let match;

    while ((match = classRegex.exec(selector)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }

  /**
   * Categorize utility class
   */
  private categorizeUtility(className: string): string {
    if (className.match(/^[mp][atblrsxye]-/)) {
      return UtilityCategory.Spacing;
    }
    if (className.startsWith('d-')) {
      return UtilityCategory.Display;
    }
    if (className.match(/^(flex-|align-|justify-|order-)/)) {
      return UtilityCategory.Flexbox;
    }
    if (className.match(/^(text-|font-)/)) {
      return UtilityCategory.Typography;
    }
    if (className.startsWith('bg-')) {
      return UtilityCategory.Background;
    }
    if (className.startsWith('elevation-')) {
      return UtilityCategory.Elevation;
    }
    if (className.match(/^(rounded|border-)/)) {
      return UtilityCategory.Border;
    }
    if (className.match(/^(w-|h-|min-|max-)/)) {
      return UtilityCategory.Sizing;
    }
    if (className.match(/^(position-|top-|right-|bottom-|left-)/)) {
      return UtilityCategory.Position;
    }
    if (className.match(/^g[arc]-/)) {
      return UtilityCategory.Gap;
    }

    return UtilityCategory.Other;
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(className: string, properties: Record<string, string>): string {
    const category = this.categorizeUtility(className);

    switch (category) {
      case UtilityCategory.Spacing: {
        const propValue = Object.values(properties)[0] || '';
        const direction = this.getSpacingDirection(className);
        const type = className.startsWith('m') ? 'margin' : 'padding';
        return `Apply ${type} ${propValue} ${direction}`;
      }

      case UtilityCategory.Display: {
        const display = properties.display || '';
        return `Set display: ${display}`;
      }

      case UtilityCategory.Flexbox: {
        if (className.startsWith('flex-')) {
          return `Flex property: ${Object.entries(properties).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
        }
        if (className.startsWith('justify-')) {
          return `Justify content: ${properties['justify-content'] || ''}`;
        }
        if (className.startsWith('align-')) {
          return `Align items: ${properties['align-items'] || properties['align-content'] || ''}`;
        }
        return `Flexbox utility`;
      }

      case UtilityCategory.Typography: {
        if (className.startsWith('text-')) {
          return `Text utility: ${Object.entries(properties).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
        }
        return `Typography utility`;
      }

      case UtilityCategory.Elevation: {
        return `Material elevation shadow`;
      }

      default: {
        const firstProp = Object.entries(properties)[0];
        if (firstProp) {
          return `${firstProp[0]}: ${firstProp[1]}`;
        }
        return `Vuetify utility class`;
      }
    }
  }

  /**
   * Get spacing direction description
   */
  private getSpacingDirection(className: string): string {
    if (className.match(/m[ap]a-/)) return 'on all sides';
    if (className.match(/m[ap]t-/)) return 'on top';
    if (className.match(/m[ap]r-/)) return 'on right';
    if (className.match(/m[ap]b-/)) return 'on bottom';
    if (className.match(/m[ap]l-/)) return 'on left';
    if (className.match(/m[ap]s-/)) return 'on start (inline-start)';
    if (className.match(/m[ap]e-/)) return 'on end (inline-end)';
    if (className.match(/m[ap]x-/)) return 'horizontally';
    if (className.match(/m[ap]y-/)) return 'vertically';
    return '';
  }
}
