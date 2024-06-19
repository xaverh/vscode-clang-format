'use strict';

import * as vscode from 'vscode';

export const ALIAS = {
  'proto3': 'proto'
};

let languages: string[] = [];
for (let l of ['cpp', 'c', 'csharp', 'objective-c', 'objective-cpp', 'java', 'javascript', 'json', 'typescript', 'proto', 'proto3', 'textproto', 'apex', 'glsl', 'hlsl', 'cuda', 'cuda-cpp', 'metal']) {
  let confKey = `language.${ALIAS[l] || l}.enable`;
  if (vscode.workspace.getConfiguration('clang-format').get(confKey)) {
    languages.push(l);
  }
}

export const MODES: vscode.DocumentFilter[] = languages.map((language) => ({language, scheme: 'file'}));
