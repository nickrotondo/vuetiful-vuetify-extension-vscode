import * as vscode from 'vscode';
import { VuetifyExtractor } from '../extractor';
import { UtilityClass } from '../types';

/**
 * Provides hover information for Vuetify utility classes
 */
export class VuetifyHoverProvider implements vscode.HoverProvider {
  constructor(private extractor: VuetifyExtractor) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
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

    // Get the word at the cursor position
    const range = document.getWordRangeAtPosition(position, /[\w-]+/);
    if (!range) {
      return undefined;
    }

    const className = document.getText(range);

    // Find the utility class
    const utilities = this.extractor.getUtilities(document);
    const utility = utilities.find(u => u.name === className);

    if (!utility) {
      return undefined;
    }

    // Create hover content
    const markdown = this.createHoverContent(utility);

    return new vscode.Hover(markdown, range);
  }

  /**
   * Create hover content markdown
   */
  private createHoverContent(utility: UtilityClass): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;

    // Title with class name
    markdown.appendMarkdown(`### \`.${utility.name}\`\n\n`);

    // Description
    if (utility.description) {
      markdown.appendMarkdown(`${utility.description}\n\n`);
    }

    // Separator
    markdown.appendMarkdown('---\n\n');

    // CSS Properties
    if (Object.keys(utility.properties).length > 0) {
      markdown.appendMarkdown('**Computed CSS:**\n\n');
      markdown.appendCodeblock(
        Object.entries(utility.properties)
          .map(([prop, value]) => `${prop}: ${value};`)
          .join('\n'),
        'css'
      );
    }

    // Category info
    markdown.appendMarkdown(`\n*Category: ${utility.category}*\n`);

    // Link to Vuetify docs
    markdown.appendMarkdown('\n---\n\n');
    markdown.appendMarkdown('[Vuetify Documentation](https://vuetifyjs.com/)\n');

    return markdown;
  }
}
