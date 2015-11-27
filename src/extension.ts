import * as vscode from 'vscode';
import cp = require('child_process');
import path = require('path');
import { CLANG_MODE } from './clangMode';
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
						vscode.window.showInformationMessage("The '" + formatCommandBinPath + "' command is not available.  Please check your go.formatTool user setting and ensure it is installed.");
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
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
/*
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Your extension "clang-format" is now active!'); 

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	var disposable = vscode.commands.registerCommand('extension.sayHello', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World!');
	});

	context.subscriptions.push(disposable);
}
*/

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(ctx: vscode.ExtensionContext): void {

	ctx.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(CLANG_MODE, new ClangDocumentFormattingEditProvider()));

}

function deactivate() {
}