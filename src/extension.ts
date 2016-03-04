import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');
import {C_MODE, CPP_MODE, OBJECTIVE_C_MODE, JAVA_MODE} from './clangMode';
import { getBinPath } from './clangPath';
import parseXml = require('xml-parser');
import entities = require('entities');  

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
        return this.doFormatDocument(document, options, token);
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
        return null;
    }

    private doFormatDocument(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
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
                    
                    var replacements = parseXml(stdout.toString()).root.children;
                    
                    var edits = replacements.map((item) => {
                        var offset = parseInt(item.attributes['offset']);
                        var length = parseInt(item.attributes['length']);
                        
                        var start = document.positionAt(offset);
                        var end = document.positionAt(offset + length);
                        
                        var editRange = new vscode.Range(start, end); 
                        var text = entities.decodeXML(item.content);
                       
                        return new vscode.TextEdit(editRange, text);
                    });
                    
                    // TODO: Should use `-d` option to get a diff and then compute the
                    // specific edits instead of replace whole buffer
                    var lastLine = document.lineCount;
                    var lastLineLastCol = document.lineAt(lastLine - 1).range.end.character;
                    var range = new vscode.Range(0, 0, lastLine - 1, lastLineLastCol);
                    return resolve(edits);
                } catch (e) {
                    reject(e);
                }
            };
            
            var formatArgs = ['--output-replacements-xml'];
            
            var child = cp.execFile(formatCommandBinPath, formatArgs, {}, childCompleted);
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

    ctx.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(CPP_MODE, new ClangDocumentFormattingEditProvider()));
    ctx.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(C_MODE, new ClangDocumentFormattingEditProvider()));
    ctx.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(JAVA_MODE, new ClangDocumentFormattingEditProvider()));
    ctx.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(OBJECTIVE_C_MODE, new ClangDocumentFormattingEditProvider()));

}

function deactivate() {
}