import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');
import {MODES} from './clangMode';
import { getBinPath } from './clangPath';
import sax = require('sax');

export class ClangDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    private defaultConfigure = {
        executable: 'clang-format',
        style: 'file',
        fallbackStyle: 'none'
    };
    
    public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
        return this.doFormatDocument(document, null, options, token);
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
        return this.doFormatDocument(document, range, options, token);
    }

    private getEdits(document: vscode.TextDocument, xml: string, codeContent: string): Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, reject) => {
            var options = { trim: false, normalize: false, loose: true }
            var parser = sax.parser(true, options);

            var edits: vscode.TextEdit[] = [];
            var currentEdit: { length: number, offset: number, text: string };

            var codeBuffer = new Buffer(codeContent);
            // encoding position cache
            var codeByteOffsetCache = {
                byte: 0,
                offset: 0
            };
            var byteToOffset = function(editInfo: { length: number, offset: number }) {
                var offset = editInfo.offset;
                var length = editInfo.length;
                
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
                    reject("Malformed output"); 
                }

                switch (tag.name) {
                    case "replacements":
                        return;

                    case "replacement":
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
            }

            parser.onclosetag = (tagName) => {
                if (!currentEdit) { return; }

                var start = document.positionAt(currentEdit.offset);
                var end = document.positionAt(currentEdit.offset + currentEdit.length);

                var editRange = new vscode.Range(start, end);

                edits.push(new vscode.TextEdit(editRange, currentEdit.text));
                currentEdit = null;
            }

            parser.onend = () => {
                resolve(edits);
            }

            parser.write(xml);
            parser.end();

        });
    }

    /// Get execute name in clang-format.executable, if not found, use default value
    /// If configure has changed, it will get the new value
    private getExecutableName() {
        let execPath = vscode.workspace.getConfiguration('clang-format').get<string>('executable');
        if (execPath) {
            return execPath;
        }
        
        return this.defaultConfigure.executable;
    }
    
    private getStyle(document: vscode.TextDocument) {
        let ret = vscode.workspace.getConfiguration('clang-format').get<string>(`language.${document.languageId}.style`);
        if (ret.trim()) {
            return ret.trim();
        }

        ret = vscode.workspace.getConfiguration('clang-format').get<string>('style');
        if (ret && ret.trim()) {
            return ret.trim();
        } else {
            return this.defaultConfigure.style;
        }
    }  
    
    private getFallbackStyle(document: vscode.TextDocument) {
        let strConf = vscode.workspace.getConfiguration('clang-format').get<string>(`language.${document.languageId}.fallbackStyle`);
        if (strConf.trim()) {
            return strConf;
        }

        strConf = vscode.workspace.getConfiguration('clang-format').get<string>('fallbackStyle');
        if (strConf.trim()) {
            return strConf;
        }
        
        return this.defaultConfigure.style;
    }
    
    private doFormatDocument(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, reject) => {
            var filename = document.fileName;

            var formatCommandBinPath = getBinPath(this.getExecutableName());
            var codeContent = document.getText();

            var childCompleted = (err, stdout, stderr) => {
                try {
                    if (err && (<any>err).code == "ENOENT") {
                        vscode.window.showInformationMessage("The '" + formatCommandBinPath + "' command is not available.  Please check your clang.formatTool user setting and ensure it is installed.");
                        return resolve(null);
                    }
                    if (err) {
                        return reject("Cannot format due to syntax errors.");
                    }

                    var dummyProcessor = (value: string) => {
                        debugger;
                        return value;
                    };
                    return resolve(this.getEdits(document, stdout, codeContent));

                } catch (e) {
                    reject(e);
                }
            };

            var formatArgs = [
                '-output-replacements-xml',
                `-style=${this.getStyle(document)}`,
                `-fallback-style=${this.getFallbackStyle(document)}`,
                `-assume-filename=${document.fileName}`,
            ];

            if (range) {
                var offset = document.offsetAt(range.start);
                var length = document.offsetAt(range.end) - offset;

                // fix charater length to byte length
                length = Buffer.byteLength(codeContent.substr(offset, length), 'utf8');
                // fix charater offset to byte offset
                offset = Buffer.byteLength(codeContent.substr(0, offset), 'utf8');
                
                formatArgs.push(`-offset=${offset}`, `-length=${length}`)
            }

            var workingPath = vscode.workspace.rootPath;;
            if(!document.isUntitled) {
                workingPath = path.dirname(document.fileName);
            }

            var child = cp.execFile(formatCommandBinPath, formatArgs, { cwd: workingPath }, childCompleted);
            child.stdin.end(codeContent);

            if(token) {
                token.onCancellationRequested(() => {
                    child.kill();
                    reject("Cancelation requested");
                });
            }
        });
    }

    public formatDocument(document: vscode.TextDocument): Thenable<vscode.TextEdit[]>{
        return this.doFormatDocument(document, null, null, null);
    }

}

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(ctx: vscode.ExtensionContext): void {

    var formatter = new ClangDocumentFormattingEditProvider();
    var availableLanguages = {};

    MODES.forEach(mode => {
        ctx.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(mode, formatter));
        ctx.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(mode, formatter));
        availableLanguages[mode.language] = true;
    });

    // TODO: This is really ugly.  I'm not sure we can do better until
    // Code supports a pre-save event where we can do the formatting before
    // the file is written to disk.	
    // @see https://github.com/Microsoft/vscode-go/blob/master/src/goMain.ts
    let ignoreNextSave = new WeakSet<vscode.TextDocument>();

    vscode.workspace.onDidSaveTextDocument(document => {
        try {
            let formatOnSave = vscode.workspace.getConfiguration('clang-format').get<boolean>('formatOnSave');
            if (!formatOnSave) {
                return;
            }

            if (!availableLanguages[document.languageId] || ignoreNextSave.has(document)) {
                return;
            }

            let textEditor = vscode.window.activeTextEditor;
            formatter.formatDocument(document).then(edits => {
                return textEditor.edit(editBuilder => {
                    edits.forEach(edit => editBuilder.replace(edit.range, edit.newText))
                });
            }).then(applied => {
                ignoreNextSave.add(document);
                return document.save();
            }).then(
                () => {
                    ignoreNextSave.delete(document);
                }, () => {
                    // Catch any errors and ignore so that we still trigger 
                    // the file save.
                }
            );
        } catch(e) {
            console.error('formate when save file failed.' + e.toString());
        }
    });
}