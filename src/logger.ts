import * as vscode from 'vscode';
import { CONFIG_SECTION, CONFIG_ENABLE_LOGGING } from './constants';
import { OutputChannelManager } from './outputChannelManager';

/**
 * Centralized logging utility that respects user configuration
 * Uses shared OutputChannel to prevent resource leaks
 */
export class Logger implements vscode.Disposable {
  private outputChannel: vscode.OutputChannel;
  private context: string;

  constructor(context: string) {
    this.context = context;
    this.outputChannel = OutputChannelManager.getInstance();
  }

  /**
   * Check if logging is enabled
   */
  private isLoggingEnabled(): boolean {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return config.get(CONFIG_ENABLE_LOGGING, false);
  }

  /**
   * Log an informational message
   */
  info(message: string): void {
    this.log('INFO', message);
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    this.log('WARN', message);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: unknown): void {
    const errorMessage = error instanceof Error ? `${message}: ${error.message}` : message;
    this.log('ERROR', errorMessage);

    if (error instanceof Error && error.stack) {
      this.log('ERROR', `Stack: ${error.stack}`);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string): void {
    if (this.isLoggingEnabled()) {
      this.log('DEBUG', message);
    }
  }

  /**
   * Internal log method
   */
  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] [${this.context}] ${message}`;

    // Always log to output channel for debugging
    if (this.isLoggingEnabled() || level === 'ERROR' || level === 'WARN') {
      this.outputChannel.appendLine(formattedMessage);
    }
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Dispose of resources
   * Note: Does not dispose the shared OutputChannel (managed by OutputChannelManager)
   */
  dispose(): void {
    // No-op - shared OutputChannel is disposed by OutputChannelManager during extension deactivation
  }
}
