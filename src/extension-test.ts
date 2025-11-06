import * as vscode from 'vscode';

console.log('[TEST] Extension module loading...');
console.log('[TEST] About to import types...');

import { UtilityClass } from './types';

console.log('[TEST] Types imported successfully');
console.log('[TEST] About to import parser...');

import { CSSParser } from './parser';

console.log('[TEST] Parser imported successfully');
console.log('[TEST] About to import finder...');

import { VuetifyFinder } from './finder';

console.log('[TEST] Finder imported successfully');
console.log('[TEST] About to import cache...');

import { VuetifyCache } from './cache';

console.log('[TEST] Cache imported successfully');
console.log('[TEST] About to import extractor...');

import { VuetifyExtractor } from './extractor';

console.log('[TEST] Extractor imported successfully');
console.log('[TEST] About to import watcher...');

import { VuetifyWatcher } from './watcher';

console.log('[TEST] Watcher imported successfully');
console.log('[TEST] About to import completion provider...');

import { VuetifyCompletionProvider } from './providers/completionProvider';

console.log('[TEST] Completion provider imported successfully');
console.log('[TEST] About to import hover provider...');

import { VuetifyHoverProvider } from './providers/hoverProvider';

console.log('[TEST] Hover provider imported successfully');

export async function activate(context: vscode.ExtensionContext) {
  console.log('[TEST] Extension activating...');
  vscode.window.showInformationMessage('Vuetiful Vuetify TEST activated!');
  console.log('[TEST] Extension activated successfully');
}

export function deactivate() {
  console.log('[TEST] Extension deactivated');
}
