/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { callWithTelemetryAndErrorHandling, IActionContext } from "vscode-azureextensionui";
import { getAllCommandsFromTextDocument } from "../MongoScrapbook";

export class MongoCodeLensProvider implements vscode.CodeLensProvider {
	private _onDidChangeEmitter = new vscode.EventEmitter<void>();
	private _connectedDatabase: string;
	private _connectedDatabaseInitialized: boolean;

	public onDidChangeCodeLenses = this._onDidChangeEmitter.event;

	public setConnectedDatabase(database: string | undefined) {
		this._connectedDatabase = database;
		this._connectedDatabaseInitialized = true;
		this._onDidChangeEmitter.fire();
	}

	public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
		return callWithTelemetryAndErrorHandling("mongo.provideCodeLenses", (context: IActionContext) => {
			// Suppress except for errors - this can fire on every keystroke
			context.telemetry.suppressIfSuccessful = true;

			let isInitialized = this._connectedDatabaseInitialized;
			let isConnected = !!this._connectedDatabase;
			let database = isConnected && this._connectedDatabase;
			let lenses: vscode.CodeLens[] = [];

			// Allow displaying and changing connected database
			lenses.push(<vscode.CodeLens>{
				command: {
					title: !isInitialized ?
						'Initializing...' :
						isConnected ?
							`Connected to ${database}` :
							`Connect to a database`,
					command: isInitialized && 'cosmosDB.connectMongoDB'
				},
				range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0))
			});

			if (isConnected) {
				// Run all
				lenses.push(<vscode.CodeLens>{
					command: {
						title: "Execute All",
						command: 'cosmosDB.executeAllMongoCommands'
					},
					range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0))
				});

				let commands = getAllCommandsFromTextDocument(document);
				for (let cmd of commands) {
					// run individual
					lenses.push(<vscode.CodeLens>{
						command: {
							title: "Execute",
							command: 'cosmosDB.executeMongoCommand',
							arguments: [cmd.text]
						},
						range: cmd.range
					});
				}
			}

			return lenses;
		});
	}
}
