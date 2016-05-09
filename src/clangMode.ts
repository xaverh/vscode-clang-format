'use strict';

import vscode = require('vscode');

const LANGUAGES: string[] = ['cpp', 'c', 'objective-c', 'java'];
export const MODES: vscode.DocumentFilter[] = LANGUAGES.map(language => ({ language, scheme: 'file' }));
