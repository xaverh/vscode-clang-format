'use strict';

import vscode = require('vscode');

let languages: string[] = [];
for (var l of ['cpp', 'c', 'objective-c', 'objective-cpp', 'java', 'javascript', 'typescript', 'proto']) {
  if (vscode.workspace.getConfiguration('clang-format').get('language.' + l + '.enable')) {
    languages.push(l);
  }
}

export const MODES: vscode.DocumentFilter[] = languages.map(language => ({language, scheme : 'file'}));