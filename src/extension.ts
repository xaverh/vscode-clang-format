import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');
import {C_MODE, CPP_MODE, OBJECTIVE_C_MODE, JAVA_MODE} from './clangMode';
import { getBinPath } from './clangPath';

export class ClangDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
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
		return document.save().then(() => {
			return this.doFormatDocument(document, options, token);
		});
	}

	private doFormatDocument(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
		return new Promise((resolve, reject) => {
			var filename = document.fileName;

			var formatCommandBinPath = getBinPath(this.formatCommand);

			cp.execFile(formatCommandBinPath, [filename], {}, (err, stdout, stderr) => {
				try {
					if (err && (<any>err).code == "ENOENT") {
						vscode.window.showInformationMessage("The '" + formatCommandBinPath + "' command is not available.  Please check your clang.formatTool user setting and ensure it is installed.");
						return resolve(null);
					}
					if (err) return reject("Cannot format due to syntax errors.");
					var text = stdout.toString();
					// TODO: Should use `-d` option to get a diff and then compute the
					// specific edits instead of replace whole buffer
					var lastLine = document.lineCount;
					var lastLineLastCol = document.lineAt(lastLine - 1).range.end.character;
					var range = new vscode.Range(0, 0, lastLine - 1, lastLineLastCol);
					return resolve([new vscode.TextEdit(range, text)]);
				} catch (e) {
					reject(e);
				}
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