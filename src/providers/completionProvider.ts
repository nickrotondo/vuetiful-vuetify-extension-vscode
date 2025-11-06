import * as vscode from 'vscode';
import { VuetifyExtractor } from '../extractor';
import { UtilityClass } from '../types';

/**
 * Provides completion items for Vuetify utility classes
 */
export class VuetifyCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private extractor: VuetifyExtractor) {}

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList | undefined> {
    // Check if request was cancelled before starting
    if (token.isCancellationRequested) {
      return undefined;
    }

    // Ensure utilities are extracted
    await this.extractor.ensureExtracted();

    // Check cancellation after async operation
    if (token.isCancellationRequested) {
      return undefined;
    }

    // Check if we're in a class attribute
    const inClassAttr = this.isInClassAttribute(document, position);
    if (!inClassAttr) {
      return undefined;
    }

    // Get utilities for this document
    const utilities = this.extractor.getUtilities(document);
    if (utilities.length === 0) {
      return undefined;
    }

    // Extract the current word from the line prefix
    const line = document.lineAt(position).text;
    const prefix = line.substring(0, position.character);
    const wordMatch = prefix.match(/([\w-]+)$/);
    const currentWord = wordMatch ? wordMatch[1] : '';

    // Filter and convert to completion items
    const completionItems = utilities
      .filter(utility => {
        // Filter by prefix if provided
        if (currentWord && !utility.name.startsWith(currentWord)) {
          return false;
        }
        return true;
      })
      .map(utility => this.createCompletionItem(utility));

    return completionItems;
  }

  /**
   * Check if cursor is in a class attribute
   */
  private isInClassAttribute(document: vscode.TextDocument, position: vscode.Position): boolean {
    const line = document.lineAt(position).text;
    const prefix = line.substring(0, position.character);

    // Check for class=" or class=' that hasn't been closed
    const classAttrMatch = /\bclass=["']([^"']*)$/.exec(prefix);
    if (classAttrMatch) {
      return true;
    }

    // Check for className=" or className=' (JSX/TSX)
    const classNameMatch = /\bclassName=["']([^"']*)$/.exec(prefix);
    if (classNameMatch) {
      return true;
    }

    // Check for className={` (template literal in JSX)
    const classNameTemplateMatch = /\bclassName=\{`([^`]*)$/.exec(prefix);
    if (classNameTemplateMatch) {
      return true;
    }

    // Check for class={" (object syntax in JSX)
    const classObjectMatch = /\bclass(?:Name)?=\{"([^"]*)$/.exec(prefix);
    if (classObjectMatch) {
      return true;
    }

    return false;
  }

  /**
   * Create completion item from utility class
   */
  private createCompletionItem(utility: UtilityClass): vscode.CompletionItem {
    const item = new vscode.CompletionItem(utility.name, vscode.CompletionItemKind.Class);

    // Set detail (shown after the label)
    item.detail = this.getShortDescription(utility);

    // Set documentation (shown in detail panel)
    item.documentation = this.createDocumentation(utility);

    // Set insert text
    item.insertText = utility.name;

    // Set sort text (for ordering)
    item.sortText = this.getSortText(utility);

    return item;
  }

  /**
   * Get short description for detail
   */
  private getShortDescription(utility: UtilityClass): string {
    if (utility.description) {
      return utility.description;
    }

    // Fallback to first property
    const firstProp = Object.entries(utility.properties)[0];
    if (firstProp) {
      return `${firstProp[0]}: ${firstProp[1]}`;
    }

    return 'Vuetify utility class';
  }

  /**
   * Create markdown documentation
   */
  private createDocumentation(utility: UtilityClass): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;

    // Title
    markdown.appendMarkdown(`**${utility.name}**\n\n`);

    // Description
    if (utility.description) {
      markdown.appendMarkdown(`${utility.description}\n\n`);
    }

    // Category
    markdown.appendMarkdown(`*Category: ${utility.category}*\n\n`);

    // CSS properties
    if (Object.keys(utility.properties).length > 0) {
      markdown.appendMarkdown('**CSS Properties:**\n\n');
      markdown.appendCodeblock(
        Object.entries(utility.properties)
          .map(([prop, value]) => `${prop}: ${value};`)
          .join('\n'),
        'css'
      );
    }

    return markdown;
  }

  /**
   * Get sort text for ordering
   */
  private getSortText(utility: UtilityClass): string {
    // Prioritize by category
    const categoryPriority: Record<string, number> = {
      spacing: 1,
      display: 2,
      flexbox: 3,
      typography: 4,
      background: 5,
      text: 6,
      elevation: 7,
      border: 8,
      sizing: 9,
      position: 10,
      gap: 11,
      other: 99
    };

    const priority = categoryPriority[utility.category] || 99;
    return `${priority.toString().padStart(2, '0')}-${utility.name}`;
  }
}
