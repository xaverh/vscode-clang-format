import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');
import fs = require('fs');
import {
  MODES,
  ALIAS
} from './clangMode';
import { getBinPath } from './clangPath';
import sax = require('sax');

export let outputChannel = vscode.window.createOutputChannel('Clang-Format');

function getPlatformString() {
  switch (process.platform) {
    case 'win32': return 'windows';
    case 'linux': return 'linux';
    case 'darwin': return 'osx';
  }

  return 'unknown';
}

function checkFileExists(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch (err) {
    return false;
  }
}

export class ClangDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
  private defaultConfigure = {
    executable: 'clang-format',
    style: 'file',
    fallbackStyle: 'none',
    assumeFilename: ''
  };

  public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
    return this.doFormatDocument(document, null, options, token);
  }

  public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
    return this.doFormatDocument(document, range, options, token);
  }

  private getEdits(document: vscode.TextDocument, xml: string, codeContent: string): Thenable<vscode.TextEdit[]> {
    return new Promise((resolve, reject) => {
      let options = {
        trim: false,
        normalize: false,
        loose: true
      };
      let parser = sax.parser(true, options);

      let edits: vscode.TextEdit[] = [];
      let currentEdit: { length: number, offset: number, text: string };

      let codeBuffer = new Buffer(codeContent);
      // encoding position cache
      let codeByteOffsetCache = {
        byte: 0,
        offset: 0
      };
      let byteToOffset = function (editInfo: { length: number, offset: number }) {
        let offset = editInfo.offset;
        let length = editInfo.length;

        if (offset >= codeByteOffsetCache.byte) {
          editInfo.offset = codeByteOffsetCache.offset + codeBuffer.slice(codeByteOffsetCache.byte, offset).toString('utf8').length;
          codeByteOffsetCache.byte = offset;
          codeByteOffsetCache.offset = editInfo.offset;
        } else {
          editInfo.offset = codeBuffer.slice(0, offset).toString('utf8').length;
          codeByteOffsetCache.byte = offset;
          codeByteOffsetCache.offset = editInfo.offset;
        }

        editInfo.length = codeBuffer.slice(offset, offset + length).toString('utf8').length;

        return editInfo;
      };

      parser.onerror = (err) => {
        reject(err.message);
      };

      parser.onopentag = (tag) => {
        if (currentEdit) {
          reject('Malformed output');
        }

        switch (tag.name) {
          case 'replacements':
            return;

          case 'replacement':
            currentEdit = {
              length: parseInt(tag.attributes['length'].toString()),
              offset: parseInt(tag.attributes['offset'].toString()),
              text: ''
            };
            byteToOffset(currentEdit);
            break;

          default:
            reject(`Unexpected tag ${tag.name}`);
        }

      };

      parser.ontext = (text) => {
        if (!currentEdit) { return; }

        currentEdit.text = text;
      };

      parser.onclosetag = (tagName) => {
        if (!currentEdit) { return; }

        let start = document.positionAt(currentEdit.offset);
        let end = document.positionAt(currentEdit.offset + currentEdit.length);

        let editRange = new vscode.Range(start, end);

        edits.push(new vscode.TextEdit(editRange, currentEdit.text));
        currentEdit = null;
      };

      parser.onend = () => {
        resolve(edits);
      };

      parser.write(xml);
      parser.end();

    });
  }

  /// Get execute name in clang-format.executable, if not found, use default value
  /// If configure has changed, it will get the new value
  private getExecutablePath() {
    const platform = getPlatformString();
    const config = vscode.workspace.getConfiguration('clang-format');

    const platformExecPath = config.get<string>('executable.' + platform);
    const defaultExecPath = config.get<string>('executable');
    let execPath = platformExecPath || defaultExecPath;

    if (!execPath) {
      return this.defaultConfigure.executable;
    }

    // replace placeholders, if present
    if (execPath.includes('${workspaceFolder})')) {
      execPath = execPath.replace('${workspaceFolder}', this.getWorkspaceFolder());
    }

    return execPath
      .replace(/\${workspaceRoot}/g, vscode.workspace.rootPath)
      .replace(/\${cwd}/g, process.cwd())
      .replace(/\${env\.([^}]+)}/g, (sub: string, envName: string) => {
        return process.env[envName];
      });
  }

  private getLanguage(document: vscode.TextDocument): string {
    return ALIAS[document.languageId] || document.languageId;
  }

  private getStyle(document: vscode.TextDocument) {
    const config = vscode.workspace.getConfiguration('clang-format');
    let ret = config.get<string>(`language.${this.getLanguage(document)}.style`);

    if (ret && ret.trim()) {
      ret = this.replaceStyleVariables(ret.trim(), document);
      if (ret && ret.trim()) {
        return ret.trim();
      }
    }

    ret = config.get<string>('style');
    if (ret && ret.trim()) {
      ret = this.replaceStyleVariables(ret.trim(), document);
      if (ret && ret.trim()) {
        return ret.trim();
      }
    }

    return this.replaceStyleVariables(this.defaultConfigure.style, document);
  }

  private getFallbackStyle(document: vscode.TextDocument) {
    const config = vscode.workspace.getConfiguration('clang-format');
    let strConf = config.get<string>(`language.${this.getLanguage(document)}.fallbackStyle`);

    if (strConf && strConf.trim()) {
      strConf = this.replaceStyleVariables(strConf.trim(), document);
      if (strConf && strConf.trim()) {
        return strConf.trim();
      }
    }

    strConf = config.get<string>('fallbackStyle');
    if (strConf && strConf.trim()) {
      strConf = this.replaceStyleVariables(strConf.trim(), document);
      if (strConf && strConf.trim()) {
        return strConf.trim();
      }
    }

    return this.replaceStyleVariables(this.defaultConfigure.style, document);
  }

  private replaceStyleVariables(str: string, document: vscode.TextDocument): string {
    if (str.includes('${workspaceFolder})')) {
      str = str.replace('${workspaceFolder}', this.getWorkspaceFolder());
    }

    return str.replace(/\${workspaceRoot}/g, vscode.workspace.rootPath)
      .replace(/\${cwd}/g, process.cwd())
      .replace(/\${env\.([^}]+)}/g, (sub: string, envName: string) => {
        return process.env[envName];
      });
  }

  private getAssumedFilename(document: vscode.TextDocument) {
    const config = vscode.workspace.getConfiguration('clang-format');
    const assumedFilename = config.get<string>('assumeFilename');
    const parsedPath = path.parse(document.fileName);
    const fileNoExtension = path.join(parsedPath.dir, parsedPath.name);

    if (assumedFilename === '' || assumedFilename === null) {
      return document.fileName;
    }

    return assumedFilename
      .replace(/\${file}/g, document.fileName)
      .replace(/\${fileNoExtension}/g, fileNoExtension)
      .replace(/\${fileBasename}/g, parsedPath.base)
      .replace(/\${fileBasenameNoExtension}/g, parsedPath.name)
      .replace(/\${fileExtname}/g, parsedPath.ext);
  }

  private getWorkspaceFolder(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Unable to get the location of clang-format executable - no active workspace selected");
      return undefined;
    }

    if (!vscode.workspace.workspaceFolders) {
      vscode.window.showErrorMessage("Unable to get the location of clang-format executable - no workspaces available");
      return undefined
    }

    const currentDocumentUri = editor.document.uri
    let workspacePath = vscode.workspace.getWorkspaceFolder(currentDocumentUri);
    if (!workspacePath) {
      const fallbackWorkspace = vscode.workspace.workspaceFolders[0];
      vscode.window.showWarningMessage(`Unable to deduce the location of clang-format executable for file outside the workspace - expanding \${workspaceFolder} to '${fallbackWorkspace.name}' path`);
      workspacePath = fallbackWorkspace;
    }
    return workspacePath.uri.path;
  }

  private doFormatDocument(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
    return new Promise((resolve, reject) => {
      const config = vscode.workspace.getConfiguration('clang-format');
      const style = this.getStyle(document);
      const fallbackStyle = this.getFallbackStyle(document);
      const assumedFilename = this.getAssumedFilename(document);
      const formatCommandBinPath = getBinPath(this.getExecutablePath());
      const codeContent = document.getText();
      const additionalArgs = config.get<string>('additionalArguments');

      if (style.substring(0, 5) == "file:" && checkFileExists(style.substring(5)) === false) {
        vscode.window.showErrorMessage('The \'' + style + '\' style file is not available.  Please check your clang-format.style user setting and ensure it is installed.');
        return resolve(null);
      }

      if (fallbackStyle.substring(0, 5) == "file:" &&
        checkFileExists(fallbackStyle.substring(5)) === false) {
        vscode.window.showErrorMessage('The \'' + fallbackStyle + '\' fallback style file is not available.  Please check your clang-format.fallbackStyle user setting and ensure it is installed.');
        return resolve(null);
      }

      let formatArgs = [
        '-output-replacements-xml',
        `-style=${style}`,
        `-fallback-style=${fallbackStyle}`,
        `-assume-filename=${assumedFilename}`
      ];

      if (additionalArgs != '') {
        formatArgs.push(additionalArgs);
      }

      if (range) {
        let offset = document.offsetAt(range.start);
        let length = document.offsetAt(range.end) - offset;

        // fix charater length to byte length
        length = Buffer.byteLength(codeContent.substr(offset, length), 'utf8');
        // fix charater offset to byte offset
        offset = Buffer.byteLength(codeContent.substr(0, offset), 'utf8');

        formatArgs.push(`-offset=${offset}`, `-length=${length}`);
      }

      let workingPath = vscode.workspace.rootPath;
      if (!document.isUntitled) {
        workingPath = path.dirname(document.fileName);
      }

      let stdout = '';
      let stderr = '';
      let child = cp.spawn(formatCommandBinPath, formatArgs, { cwd: workingPath });
      child.stdin.end(codeContent);
      child.stdout.on('data', chunk => stdout += chunk);
      child.stderr.on('data', chunk => stderr += chunk);
      child.on('error', err => {
        if (err && (<any>err).code === 'ENOENT') {
          vscode.window.showInformationMessage('The \'' + formatCommandBinPath + '\' command is not available.  Please check your clang-format.executable user setting and ensure it is installed.');
          return resolve(null);
        }
        return reject(err);
      });
      child.on('close', code => {
        try {
          if (stderr.length != 0) {
            outputChannel.show();
            outputChannel.clear();
            outputChannel.appendLine(stderr);
            return reject('Cannot format due to syntax errors.');
          }

          if (code != 0) {
            return reject();
          }

          return resolve(this.getEdits(document, stdout, codeContent));
        } catch (e) {
          reject(e);
        }
      });

      if (token) {
        token.onCancellationRequested(() => {
          child.kill();
          reject('Cancelation requested');
        });
      }
    });
  }

  public formatDocument(document: vscode.TextDocument): Thenable<vscode.TextEdit[]> {
    return this.doFormatDocument(document, null, null, null);
  }
}

export function activate(ctx: vscode.ExtensionContext): void {

  const formatter = new ClangDocumentFormattingEditProvider();
  let availableLanguages = {};

  MODES.forEach((mode) => {
    ctx.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(mode, formatter));
    ctx.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(mode, formatter));
    availableLanguages[mode.language] = true;
  });
}
