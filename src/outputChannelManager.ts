import * as vscode from 'vscode';
import { OUTPUT_CHANNEL_NAME } from './constants';

/**
 * Singleton manager for the shared OutputChannel
 * Prevents resource leaks by ensuring only one OutputChannel exists
 */
export class OutputChannelManager {
  private static instance: vscode.OutputChannel | undefined;

  /**
   * Get the singleton OutputChannel instance
   */
  static getInstance(): vscode.OutputChannel {
    if (!OutputChannelManager.instance) {
      OutputChannelManager.instance = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
    }
    return OutputChannelManager.instance;
  }

  /**
   * Dispose the singleton OutputChannel
   * Should only be called during extension deactivation
   */
  static dispose(): void {
    if (OutputChannelManager.instance) {
      OutputChannelManager.instance.dispose();
      OutputChannelManager.instance = undefined;
    }
  }
}
