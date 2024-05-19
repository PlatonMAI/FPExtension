"use strict";

import { exec } from 'child_process';
import * as readline from 'readline';
import * as path from 'path';

import * as vscode from "vscode";

// Определяем интерфейс для элементов, которые будут храниться в списке
interface ParsedLine {
    type: 'int' | 'float' | 'string' | 'bool';
    line: number;
    value: number | string | boolean;
}

// Функция для запуска App.exe и парсинга его вывода
function runApp(filename: string): Promise<ParsedLine[]> {
    return new Promise((resolve, reject) => {
        const appPath = path.join(__dirname, "net8.0", 'App.exe');
        const command = `${appPath} ${filename}`;
        const parsedLines: ParsedLine[] = [];

		console.log(command);

        const child = exec(command);

        if (child.stdout) {
            const rl = readline.createInterface({ input: child.stdout });

            rl.on('line', (line) => {
                const match = line.match(/^(int|float|string|bool): (\d+) (.+)$/);
                if (match) {
                    const [, type, lineStr, valueStr] = match;
                    const lineNumber = parseInt(lineStr, 10);
                    let value: number | string | boolean;

                    switch (type) {
                        case 'int':
                            value = parseInt(valueStr, 10);
                            break;
                        case 'float':
                            value = parseFloat(valueStr);
                            break;
                        case 'string':
                            value = valueStr;
                            break;
                        case 'bool':
                            value = valueStr.toLowerCase() === 'true';
                            break;
                        default:
                            return;
                    }

                    parsedLines.push({ type, line: lineNumber, value });
                }
            });

            rl.on('close', () => {
                resolve(parsedLines);
            });
        }

        if (child.stderr) {
            child.stderr.on('data', (data) => {
                console.error(`Error: ${data}`);
            });
        }

        child.on('error', (err) => {
            reject(err);
        });
    });
}

let decorations:Array<vscode.TextEditorDecorationType> = [];

const addDecorationWithText = (
	lineType: string,
	contentText: string,
	line: number,
	column: number,
	activeEditor: vscode.TextEditor
) => {
	let color:string;
	if (lineType === "int") {
		color = "blue";
	} else if (lineType === "float") {
		color = "green";
	} else if (lineType === "string") {
		color = "brown";
	} else {
		color = "violet";
	}

	const decorationType = vscode.window.createTextEditorDecorationType({
		after: {
			contentText,
			margin: "20px",
			color
		}
	});
	decorations.push(decorationType);

	const range = new vscode.Range(
		new vscode.Position(line, column),
		new vscode.Position(line, column)
	);

	activeEditor.setDecorations(decorationType, [{ range }]);
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "Aron" is now active!');

	let disposable = vscode.commands.registerCommand(
		"extension.Aron",
		async () => {
			const activeEditor = vscode!.window!.activeTextEditor;
			if (!activeEditor) {
				return;
			}

			const document = activeEditor!.document;
			const fileName = document.uri.path.slice(1);

			console.log(fileName);

			const parsedLines = await runApp(fileName);

			decorations.forEach(item => item.dispose());
			
			parsedLines.forEach(async (line: ParsedLine) => {
				const value = line.type + ": " + line.value;
				addDecorationWithText(
					line.type,
					`${value}`,
					line.line - 1,
					50,
					activeEditor
				);
			});

			// Display a message box to the user
			vscode.window.showInformationMessage("Done!");
		}
	);

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}