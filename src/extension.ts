import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');
import {C_MODE, CPP_MODE, OBJECTIVE_C_MODE, JAVA_MODE} from './clangMode';
import { getBinPath } from './clangPath';
import sax = require('sax');

export class ClangDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    private formatCommand = 'clang-format';

	/*
		constructor() {
			let formatTool = vscode.workspace.getConfiguration('cpp')['formatTool'];
			if (formatTool) {
				this.formatCommand = formatTool;
			}
		}
	*/

    public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
        return this.doFormatDocument(document, null, options, token);
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
        return this.doFormatDocument(document, range, options, token);
    }

    private getEdits(document: vscode.TextDocument, xml: string): Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, reject) => {
            var options = { trim: false, normalize: false, loose: true }
            var parser = sax.parser(true, options);

            var edits: vscode.TextEdit[] = [];
            var currentEdit: { length: number, offset: number, text: string };

            parser.onerror = (err) => {
                reject(err.message);
            };


            parser.onopentag = (tag) => {
                if (currentEdit) { reject("Malformed output"); }

                switch (tag.name) {
                    case "replacements":
                        return;

                    case "replacement":
                        currentEdit = {
                            length: parseInt(tag.attributes['length'].toString()),
                            offset: parseInt(tag.attributes['offset'].toString()),
                            text: ''
                        };
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

    private doFormatDocument(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
        return new Promise((resolve, reject) => {
            var filename = document.fileName;

            var formatCommandBinPath = getBinPath(this.formatCommand);

            var childCompleted = (err, stdout, stderr) => {
                try {
                    if (err && (<any>err).code == "ENOENT") {
                        vscode.window.showInformationMessage("The '" + formatCommandBinPath + "' command is not available.  Please check your clang.formatTool user setting and ensure it is installed.");
                        return resolve(null);
                    }
                    if (err) return reject("Cannot format due to syntax errors.");

                    var dummyProcessor = (value: string) => {
                        debugger;
                        return value;
                    };
                    return resolve(this.getEdits(document, stdout));

                } catch (e) {
                    reject(e);
                }
            };

            var formatArgs = ['-output-replacements-xml'];

            if (range) {
                var offset = document.offsetAt(range.start);
                var length = document.offsetAt(range.end) - offset;

                formatArgs.push(`-offset=${offset}`, `-length=${length}`)
            }

            var workingPath = vscode.workspace.rootPath;;
            if(!document.isUntitled) {
                workingPath = path.dirname(document.fileName);
            }

            var child = cp.execFile(formatCommandBinPath, formatArgs, { cwd: workingPath }, childCompleted);
            child.stdin.end(document.getText());

            token.onCancellationRequested(() => {
                child.kill();
                reject("Cancelation requested");
            });




        });
    }

}

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(ctx: vscode.ExtensionContext): void {

    var formatter = new ClangDocumentFormattingEditProvider();

    [C_MODE, CPP_MODE, JAVA_MODE, OBJECTIVE_C_MODE].forEach(mode => {
        ctx.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(mode, formatter));
        ctx.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(mode, formatter));
    })
}