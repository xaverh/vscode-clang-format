'use strict';

import vscode = require('vscode');

export const CPP_MODE: vscode.DocumentFilter = { language: 'cpp', scheme: 'file' }
export const C_MODE: vscode.DocumentFilter = { language: 'c', scheme: 'file' }
export const OBJECTIVE_C_MODE: vscode.DocumentFilter = { language: 'objective-c', scheme: 'file' }
export const JAVA_MODE: vscode.DocumentFilter = { language: 'java', scheme: 'file' }