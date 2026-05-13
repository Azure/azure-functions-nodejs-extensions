// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as azureFunctions from '@azure/functions';
import { onNewEmail, onNewCalendarEvent } from '../src/connectors/office365Triggers';
import { onNewFile, onUpdatedFile } from '../src/connectors/sharepointTriggers';
import { onNewChannelMessage } from '../src/connectors/teamsTriggers';
import { onQueryResult } from '../src/connectors/kustoTriggers';

describe('connector-specific triggers', () => {
    let appStub: sinon.SinonStub;

    beforeEach(() => {
        appStub = sinon.stub(azureFunctions.app, 'connectorTrigger');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('office365', () => {
        it('onNewEmail should register with connector "office365" and operation "OnNewEmail"', () => {
            onNewEmail('testEmail', {
                connection: 'Office365Connection',
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            const registeredOptions = appStub.firstCall.args[1];
            assert.strictEqual(registeredOptions.connector, 'office365');
            assert.strictEqual(registeredOptions.triggerOperation, 'OnNewEmail');
            assert.strictEqual(registeredOptions.connection, 'Office365Connection');
        });

        it('onNewCalendarEvent should register with connector "office365" and operation "CalendarGetOnNewItems"', () => {
            onNewCalendarEvent('testCalendar', {
                connection: 'Office365Connection',
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            const registeredOptions = appStub.firstCall.args[1];
            assert.strictEqual(registeredOptions.connector, 'office365');
            assert.strictEqual(registeredOptions.triggerOperation, 'CalendarGetOnNewItems');
        });
    });

    describe('sharepoint', () => {
        it('onNewFile should register with connector "sharepointonline" and operation "OnNewFile"', () => {
            onNewFile('testNewFile', {
                connection: 'SharePointConnection',
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            const registeredOptions = appStub.firstCall.args[1];
            assert.strictEqual(registeredOptions.connector, 'sharepointonline');
            assert.strictEqual(registeredOptions.triggerOperation, 'OnNewFile');
            assert.strictEqual(registeredOptions.connection, 'SharePointConnection');
        });

        it('onUpdatedFile should register with connector "sharepointonline" and operation "OnUpdatedFile"', () => {
            onUpdatedFile('testUpdatedFile', {
                connection: 'SharePointConnection',
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            const registeredOptions = appStub.firstCall.args[1];
            assert.strictEqual(registeredOptions.connector, 'sharepointonline');
            assert.strictEqual(registeredOptions.triggerOperation, 'OnUpdatedFile');
        });
    });

    describe('teams', () => {
        it('onNewChannelMessage should register with connector "teams" and operation "OnNewChannelMessage"', () => {
            onNewChannelMessage('testMessage', {
                connection: 'TeamsConnection',
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            const registeredOptions = appStub.firstCall.args[1];
            assert.strictEqual(registeredOptions.connector, 'teams');
            assert.strictEqual(registeredOptions.triggerOperation, 'OnNewChannelMessage');
            assert.strictEqual(registeredOptions.connection, 'TeamsConnection');
        });
    });

    describe('kusto', () => {
        it('onQueryResult should register with connector "kusto" and operation "OnQueryResult"', () => {
            onQueryResult('testQuery', {
                connection: 'KustoConnection',
                handler: async () => undefined,
            });

            assert.strictEqual(appStub.calledOnce, true);
            const registeredOptions = appStub.firstCall.args[1];
            assert.strictEqual(registeredOptions.connector, 'kusto');
            assert.strictEqual(registeredOptions.triggerOperation, 'OnQueryResult');
            assert.strictEqual(registeredOptions.connection, 'KustoConnection');
        });
    });

    describe('extra bindings passthrough', () => {
        it('should pass extraInputs and extraOutputs through to app.connectorTrigger', () => {
            const mockInput = { name: 'input1', type: 'connectorContent' } as unknown as azureFunctions.FunctionInput;
            const mockOutput = { name: 'output1', type: 'connectorContent' } as unknown as azureFunctions.FunctionOutput;

            onNewEmail('testWithBindings', {
                connection: 'Office365Connection',
                extraInputs: [mockInput],
                extraOutputs: [mockOutput],
                handler: async () => undefined,
            });

            const registeredOptions = appStub.firstCall.args[1];
            assert.deepStrictEqual(registeredOptions.extraInputs, [mockInput]);
            assert.deepStrictEqual(registeredOptions.extraOutputs, [mockOutput]);
        });

        it('should pass return output binding through', () => {
            const mockReturn = { name: 'returnOutput', type: 'http' } as unknown as azureFunctions.FunctionOutput;

            onNewFile('testWithReturn', {
                connection: 'SharePointConnection',
                return: mockReturn,
                handler: async () => undefined,
            });

            const registeredOptions = appStub.firstCall.args[1];
            assert.strictEqual(registeredOptions.return, mockReturn);
        });
    });
});
