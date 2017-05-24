'use strict';

import vscode = require('vscode');

export const ALIAS = {
  'proto3': 'proto'
};

let languages: string[] = [];
for (let l of ['cpp', 'c', 'objective-c', 'objective-cpp', 'java', 'javascript', 'typescript', 'proto', 'proto3', 'apex']) {
  let confKey = `language.${ALIAS[l] || l}.enable`;
  if (vscode.workspace.getConfiguration('clang-format').get(confKey)) {
    languages.push(l);
  }
}

export const MODES: vscode.DocumentFilter[] = languages.map((language) => ({language, scheme: 'file'}));